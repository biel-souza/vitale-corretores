const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { pool, initDatabase } = require("./database");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

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
    const result = await pool.query(
      "SELECT * FROM corretores WHERE ativo = true ORDER BY nome",
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar corretores:", error);
    res.status(500).json({ erro: "Erro ao listar corretores" });
  }
});

// 3. Obter próximo corretor da fila e atribuir no Chatwoot (para N8N)
// Retorna o corretor que está há mais tempo sem atender um imóvel
// e faz o assignment na conversa do Chatwoot
app.post("/api/fila/proximo", async (req, res) => {
  try {
    const { conversation_id, account_id, cliente_nome } = req.body;

    // Validar parâmetros obrigatórios
    if (!conversation_id || !account_id || !cliente_nome) {
      return res.status(400).json({
        erro: "conversation_id, account_id e cliente_nome são obrigatórios",
      });
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

    // Chamar API do Chatwoot para fazer o assignment
    const chatwootUrl = `${process.env.CHATWOOT_API_URL}/accounts/${account_id}/conversations/${conversation_id}/assignments`;

    console.log(chatwootUrl);

    try {
      await axios.post(
        chatwootUrl,
        {
          assignee_id: 1,
        },
        {
          headers: {
            api_access_token: process.env.CHATWOOT_API_TOKEN,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (chatwootError) {
      console.error(
        "Erro ao chamar API do Chatwoot:",
        chatwootError.response?.data || chatwootError.message,
      );

      return res.status(500).json({
        erro: "Erro ao atribuir conversa no Chatwoot",
        detalhes: chatwootError.response?.data || chatwootError.message,
      });
    }

    // Atualizar ultimo_imovel para agora
    await pool.query(
      "UPDATE corretores SET ultimo_imovel = CURRENT_TIMESTAMP WHERE id = $1",
      [corretor.id],
    );

    // Construir URL da conversa no Chatwoot
    const chatwootConversationUrl = `${process.env.CHATWOOT_BASE_URL}/app/accounts/${account_id}/conversations/${conversation_id}`;

    // Enviar mensagem WhatsApp para o corretor via template (API Oficial)
    try {
      const whatsappUrl = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

      // Formatar telefone brasileiro (remover caracteres especiais)
      const telefoneFormatado = corretor.telefone.replace(/\D/g, "");
      const telefoneCompleto = telefoneFormatado.startsWith("55")
        ? telefoneFormatado
        : `55${telefoneFormatado}`;

      await axios.post(
        whatsappUrl,
        {
          messaging_product: "whatsapp",
          to: telefoneCompleto,
          type: "template",
          template: {
            name: process.env.WHATSAPP_TEMPLATE_NAME,
            language: {
              code: "pt_BR",
            },
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: cliente_nome,
                  },
                  {
                    type: "text",
                    text: chatwootConversationUrl,
                  },
                ],
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );

      console.log(
        `WhatsApp enviado para ${corretor.nome} (${corretor.telefone})`,
      );
    } catch (whatsappError) {
      console.error(
        "Erro ao enviar WhatsApp:",
        whatsappError.response?.data || whatsappError.message,
      );
      // Não retornar erro aqui, apenas logar, pois o assignment já foi feito
    }

    res.json({
      id: corretor.id,
      nome: corretor.nome,
      telefone: corretor.telefone,
      conversation_id: conversation_id,
      account_id: account_id,
      conversation_url: chatwootConversationUrl,
      mensagem:
        "Próximo corretor da fila atribuído com sucesso e notificado via WhatsApp",
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
          ELSE to_char(ultimo_imovel, 'DD/MM/YYYY HH24:MI')
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
