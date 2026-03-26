// URL base da API (ajuste se necessário)
const API_URL = "http://localhost:3000/api";

// Elementos do DOM
const formCadastro = document.getElementById("formCadastro");
const listaCorretores = document.getElementById("listaCorretores");
const statusFila = document.getElementById("statusFila");
const toast = document.getElementById("toast");

// Inicializar ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
  carregarCorretores();
  carregarFila();
});

// Função para mostrar notificações
function mostrarToast(mensagem, tipo = "success") {
  toast.textContent = mensagem;
  toast.className = `toast ${tipo} show`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Máscara de telefone
document.getElementById("telefone").addEventListener("input", function (e) {
  let valor = e.target.value.replace(/\D/g, "");

  if (valor.length <= 11) {
    if (valor.length <= 10) {
      valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
      valor = valor.replace(/(\d)(\d{4})$/, "$1-$2");
    } else {
      valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
      valor = valor.replace(/(\d)(\d{4})$/, "$1-$2");
    }
  }

  e.target.value = valor;
});

// Cadastrar novo corretor
formCadastro.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nome").value;
  const telefone = document.getElementById("telefone").value;

  try {
    const response = await fetch(`${API_URL}/corretores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nome, telefone }),
    });

    const data = await response.json();

    if (response.ok) {
      mostrarToast("✅ Corretor cadastrado com sucesso!", "success");
      formCadastro.reset();
      carregarCorretores();
      carregarFila();
    } else {
      mostrarToast("❌ " + (data.erro || "Erro ao cadastrar"), "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    mostrarToast("❌ Erro ao conectar com o servidor", "error");
  }
});

// Carregar lista de corretores
async function carregarCorretores() {
  try {
    const response = await fetch(`${API_URL}/corretores`);
    const corretores = await response.json();

    if (corretores.length === 0) {
      listaCorretores.innerHTML = `
                <p class="loading">Nenhum corretor cadastrado ainda.</p>
            `;
      return;
    }

    listaCorretores.innerHTML = corretores
      .map(
        (corretor) => `
            <div class="corretor-item ${!corretor.ativo ? "inativo" : ""}">
                <div class="corretor-info">
                    <div class="corretor-nome">${corretor.nome}</div>
                    <div class="corretor-telefone">📱 ${corretor.telefone}</div>
                    <div class="corretor-ultimo">
                        🕒 Último atendimento: ${
                          corretor.ultimo_imovel
                            ? new Date(corretor.ultimo_imovel).toLocaleString(
                                "pt-BR",
                              )
                            : "Nunca atendeu"
                        }
                    </div>
                    <span class="corretor-status ${corretor.ativo ? "status-ativo" : "status-inativo"}">
                        ${corretor.ativo ? "✓ Ativo" : "✗ Inativo"}
                    </span>
                </div>
                <div class="corretor-actions">
                    ${
                      corretor.ativo
                        ? `<button onclick="desativarCorretor(${corretor.id})" class="btn btn-warning">
                            ⏸ Desativar
                           </button>`
                        : `<button onclick="ativarCorretor(${corretor.id})" class="btn btn-secondary">
                            ▶ Ativar
                           </button>`
                    }
                    <button onclick="excluirCorretor(${corretor.id})" class="btn btn-danger">
                        🗑 Excluir
                    </button>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Erro:", error);
    listaCorretores.innerHTML = `
            <p class="loading">Erro ao carregar corretores.</p>
        `;
  }
}

// Carregar status da fila
async function carregarFila() {
  try {
    const response = await fetch(`${API_URL}/fila/status`);
    const data = await response.json();

    if (data.total_corretores === 0) {
      statusFila.innerHTML = `
                <p>📌 Nenhum corretor ativo na fila.</p>
            `;
      return;
    }

    const proximoCorretor = data.fila[0];

    statusFila.innerHTML = `
            <p><strong>Total de corretores ativos:</strong> ${data.total_corretores}</p>
            <p><strong>Próximo na fila:</strong> ${proximoCorretor.nome} - ${proximoCorretor.telefone}</p>
            <p><strong>Último atendimento:</strong> ${proximoCorretor.ultimo_atendimento}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid var(--border-color);">
            <h3 style="margin-bottom: 15px;">📋 Ordem da Fila:</h3>
            <ol style="padding-left: 20px;">
                ${data.fila
                  .map(
                    (corretor, index) => `
                    <li style="margin-bottom: 8px;">
                        <strong>${corretor.nome}</strong> - ${corretor.telefone}
                        <br>
                        <small style="color: var(--text-light);">
                            Último atendimento: ${corretor.ultimo_atendimento}
                        </small>
                    </li>
                `,
                  )
                  .join("")}
            </ol>
        `;
  } catch (error) {
    console.error("Erro:", error);
    statusFila.innerHTML = `
            <p>Erro ao carregar status da fila.</p>
        `;
  }
}

// Desativar corretor
async function desativarCorretor(id) {
  if (!confirm("Deseja realmente desativar este corretor?")) return;

  try {
    const response = await fetch(`${API_URL}/corretores/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      mostrarToast("✅ Corretor desativado com sucesso!", "success");
      carregarCorretores();
      carregarFila();
    } else {
      mostrarToast("❌ Erro ao desativar corretor", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    mostrarToast("❌ Erro ao conectar com o servidor", "error");
  }
}

// Ativar corretor
async function ativarCorretor(id) {
  try {
    // Primeiro buscar os dados do corretor
    const getResponse = await fetch(`${API_URL}/corretores`);
    const corretores = await getResponse.json();
    const corretor = corretores.find((c) => c.id === id);

    if (!corretor) {
      mostrarToast("❌ Corretor não encontrado", "error");
      return;
    }

    // Atualizar o status
    const response = await fetch(`${API_URL}/corretores/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome: corretor.nome,
        telefone: corretor.telefone,
        ativo: true,
      }),
    });

    if (response.ok) {
      mostrarToast("✅ Corretor ativado com sucesso!", "success");
      carregarCorretores();
      carregarFila();
    } else {
      mostrarToast("❌ Erro ao ativar corretor", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    mostrarToast("❌ Erro ao conectar com o servidor", "error");
  }
}

// Excluir corretor (desativa permanentemente)
async function excluirCorretor(id) {
  if (
    !confirm(
      "Deseja realmente excluir este corretor? Esta ação não pode ser desfeita.",
    )
  )
    return;

  try {
    const response = await fetch(`${API_URL}/corretores/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      mostrarToast("✅ Corretor excluído com sucesso!", "success");
      carregarCorretores();
      carregarFila();
    } else {
      mostrarToast("❌ Erro ao excluir corretor", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    mostrarToast("❌ Erro ao conectar com o servidor", "error");
  }
}
