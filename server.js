const express = require("express");
const cors = require("cors");
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

// 3. Obter próximo corretor da fila (para N8N)
// Retorna o corretor que está há mais tempo sem atender um imóvel
app.get("/api/fila/proximo", async (req, res) => {
  try {
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

    // Atualizar ultimo_imovel para agora
    await pool.query(
      "UPDATE corretores SET ultimo_imovel = CURRENT_TIMESTAMP WHERE id = $1",
      [corretor.id],
    );

    res.json({
      id: corretor.id,
      nome: corretor.nome,
      telefone: corretor.telefone,
      mensagem: "Próximo corretor da fila",
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
