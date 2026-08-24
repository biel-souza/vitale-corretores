const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { pool, initDatabase } = require("./database");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting: armazena último acesso por conversation_id
const conversationRateLimit = new Map();
const RATE_LIMIT_MINUTES = 1;

// Limpar conversation_ids antigos do rate limiter (a cada 10 minutos)
setInterval(
  () => {
    const now = Date.now();
    const expirationTime = 10 * 60 * 1000; // 10 minutos em ms

    for (const [conversationId, timestamp] of conversationRateLimit.entries()) {
      if (now - timestamp > expirationTime) {
        conversationRateLimit.delete(conversationId);
      }
    }
  },
  10 * 60 * 1000,
);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Inicializar banco de dados
initDatabase();

// ==================== ROTAS ====================

// 1. Cadastrar novo corretor
app.post("/api/corretores", async (req, res) => {
  try {
    const { nome, telefone } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({
        erro: "Nome e telefone são obrigatórios",
      });
    }

    const result = await pool.query(
      "INSERT INTO corretores (nome, telefone) VALUES ($1, $2) RETURNING *",
      [nome, telefone],
    );

    res.status(201).json({
      mensagem: "Corretor cadastrado com sucesso!",
      corretor: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao cadastrar corretor:", error);
    res.status(500).json({ erro: "Erro ao cadastrar corretor" });
  }
});

// 2. Listar todos os corretores
app.get("/api/corretores", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM corretores ORDER BY nome");
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar corretores:", error);
    res.status(500).json({ erro: "Erro ao listar corretores" });
  }
});

// 3. Obter próximo corretor da fila e notificá-lo (para N8N)
// Retorna o corretor que está há mais tempo sem atender um imóvel,
// adiciona a tag na conversa do Chatwoot e avisa o corretor via WhatsApp
app.post("/api/fila/proximo", async (req, res) => {
  try {
    const { conversation_id, account_id, cliente_nome } = req.body;

    // Validar parâmetros obrigatórios
    if (!conversation_id || !account_id || !cliente_nome) {
      return res.status(400).json({
        erro: "conversation_id, account_id e cliente_nome são obrigatórios",
      });
    }

    // Verificar rate limiting por conversation_id
    const now = Date.now();
    const lastAccess = conversationRateLimit.get(conversation_id);

    if (lastAccess) {
      const minutesSinceLastAccess = (now - lastAccess) / (1000 * 60);

      if (minutesSinceLastAccess < RATE_LIMIT_MINUTES) {
        const secondsRemaining = Math.ceil(
          RATE_LIMIT_MINUTES * 60 - minutesSinceLastAccess * 60,
        );
        console.log(
          `Rate limit: conversa ${conversation_id} já processada há ${Math.floor(minutesSinceLastAccess * 60)}s. Aguardar ${secondsRemaining}s.`,
        );
        return res.json({
          conversation_id: conversation_id,
          account_id: account_id,
          mensagem:
            "Conversa já foi processada recentemente. Nenhuma ação adicional necessária.",
          rate_limited: true,
        });
      }
    }

    // Buscar corretor ativo com ultimo_imovel mais antigo (ou NULL)
    const result = await pool.query(`
      SELECT * FROM corretores 
      WHERE ativo = true 
      ORDER BY 
        CASE WHEN ultimo_imovel IS NULL THEN 0 ELSE 1 END,
        ultimo_imovel ASC NULLS FIRST
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        erro: "Nenhum corretor disponível na fila",
      });
    }

    const corretor = result.rows[0];

    // Registrar acesso no rate limiter
    conversationRateLimit.set(conversation_id, now);

    // Adicionar tag "negociação" à conversa
    const chatwootLabelsUrl = `${process.env.CHATWOOT_API_URL}/accounts/${account_id}/conversations/${conversation_id}/labels`;

    try {
      await axios.post(
        chatwootLabelsUrl,
        {
          labels: ["negociação"],
        },
        {
          headers: {
            api_access_token: process.env.CHATWOOT_API_TOKEN,
            "Content-Type": "application/json",
          },
        },
      );
      console.log(`Tag "negociação" adicionada à conversa ${conversation_id}`);
    } catch (labelError) {
      console.error(
        "Erro ao adicionar tag no Chatwoot:",
        labelError.response?.data || labelError.message,
      );
      // Não retornar erro aqui, apenas logar, pois o corretor já foi definido
    }

    // Atualizar ultimo_imovel para agora
    await pool.query(
      "UPDATE corretores SET ultimo_imovel = CURRENT_TIMESTAMP WHERE id = $1",
      [corretor.id],
    );

    // Construir URL da conversa no Chatwoot
    const chatwootConversationUrl = `${process.env.CHATWOOT_BASE_URL}/app/accounts/${account_id}/conversations/${conversation_id}`;

    // Enviar mensagem WhatsApp para o corretor via template, através do Chatwoot
    // (usa a inbox WhatsApp já conectada no Chatwoot em vez de chamar a Meta direto)
    try {
      const chatwootHeaders = {
        api_access_token: process.env.CHATWOOT_API_TOKEN,
        "Content-Type": "application/json",
      };

      // Formatar telefone brasileiro em E.164 (Chatwoot exige o "+")
      const telefoneFormatado = corretor.telefone.replace(/\D/g, "");
      const telefoneCompleto = telefoneFormatado.startsWith("55")
        ? telefoneFormatado
        : `55${telefoneFormatado}`;
      const telefoneE164 = `+${telefoneCompleto}`;

      // Buscar contato do corretor no Chatwoot pelo telefone
      const searchResponse = await axios.get(
        `${process.env.CHATWOOT_API_URL}/accounts/${account_id}/contacts/search`,
        {
          headers: chatwootHeaders,
          params: { q: telefoneCompleto },
        },
      );

      let contatoCorretor = searchResponse.data.payload.find(
        (c) => c.phone_number === telefoneE164,
      );

      // Criar o contato (e a contact_inbox na inbox WhatsApp) se ainda não existir
      if (!contatoCorretor) {
        const createContactResponse = await axios.post(
          `${process.env.CHATWOOT_API_URL}/accounts/${account_id}/contacts`,
          {
            name: corretor.nome,
            phone_number: telefoneE164,
            inbox_id: process.env.CHATWOOT_WHATSAPP_INBOX_ID,
          },
          { headers: chatwootHeaders },
        );
        contatoCorretor = createContactResponse.data.payload.contact;
      }

      // Criar a conversa e disparar o template aprovado no WhatsApp
      await axios.post(
        `${process.env.CHATWOOT_API_URL}/accounts/${account_id}/conversations`,
        {
          contact_id: contatoCorretor.id,
          inbox_id: process.env.CHATWOOT_WHATSAPP_INBOX_ID,
          message: {
            content_type: "text",
            template_params: {
              name: process.env.WHATSAPP_TEMPLATE_NAME,
              category: "UTILITY",
              language: "pt_BR",
              processed_params: {
                body: {
                  1: cliente_nome,
                  2: chatwootConversationUrl,
                },
              },
            },
          },
        },
        { headers: chatwootHeaders },
      );

      console.log(
        `WhatsApp enviado via Chatwoot para ${corretor.nome} (${corretor.telefone})`,
      );
    } catch (whatsappError) {
      console.error(
        "Erro ao enviar WhatsApp via Chatwoot:",
        whatsappError.response?.data || whatsappError.message,
      );
      // Não retornar erro aqui, apenas logar, pois o corretor já foi definido
    }

    res.json({
      id: corretor.id,
      nome: corretor.nome,
      telefone: corretor.telefone,
      conversation_id: conversation_id,
      account_id: account_id,
      conversation_url: chatwootConversationUrl,
      mensagem:
        "Próximo corretor da fila definido e notificado via WhatsApp",
    });
  } catch (error) {
    console.error("Erro ao buscar próximo corretor:", error);
    res.status(500).json({ erro: "Erro ao buscar próximo corretor" });
  }
});

// 4. Ver status da fila
app.get("/api/fila/status", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        nome,
        telefone,
        ultimo_imovel,
        CASE 
          WHEN ultimo_imovel IS NULL THEN 'Nunca atendeu'
          ELSE to_char(ultimo_imovel AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
        END as ultimo_atendimento
      FROM corretores 
      WHERE ativo = true 
      ORDER BY 
        CASE WHEN ultimo_imovel IS NULL THEN 0 ELSE 1 END,
        ultimo_imovel ASC NULLS FIRST
    `);

    res.json({
      total_corretores: result.rows.length,
      fila: result.rows,
    });
  } catch (error) {
    console.error("Erro ao buscar status da fila:", error);
    res.status(500).json({ erro: "Erro ao buscar status da fila" });
  }
});

// 5. Atualizar corretor
app.put("/api/corretores/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, ativo } = req.body;

    const result = await pool.query(
      "UPDATE corretores SET nome = $1, telefone = $2, ativo = $3 WHERE id = $4 RETURNING *",
      [nome, telefone, ativo, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Corretor não encontrado" });
    }

    res.json({
      mensagem: "Corretor atualizado com sucesso!",
      corretor: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar corretor:", error);
    res.status(500).json({ erro: "Erro ao atualizar corretor" });
  }
});

// 6. Desativar corretor
app.delete("/api/corretores/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "UPDATE corretores SET ativo = false WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Corretor não encontrado" });
    }

    res.json({
      mensagem: "Corretor desativado com sucesso!",
      corretor: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao desativar corretor:", error);
    res.status(500).json({ erro: "Erro ao desativar corretor" });
  }
});

// Rota raiz
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
});
