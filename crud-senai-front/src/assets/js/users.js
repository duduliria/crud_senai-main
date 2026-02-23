// users.js
// Responsável pela lógica da tela users.html
// Nesta etapa, a lista e o CRUD passam a ser 100% integrados ao back-end (Node + MySQL).

import { apiRequest, setToken } from "./api.js";
import { $, setText, showAlert, hideAlert, validateEmail } from "./utils.js";

/**
 * Lista em memória para:
 * - renderizar a tabela
 * - filtrar no campo de busca sem consultar o servidor toda hora
 */
let usersCache = [];

// Função para obter o usuário logado a partir do localStorage (se necessário para exibir nome, perfil, etc)
function getLoggedUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

/**
 * Converte o status do backend (ACTIVE/INACTIVE) para um texto amigável na tela.
 */
function formatStatus(status) {
  return status === "ACTIVE" ? "ATIVO" : "INATIVO";
}

/**
 * Constrói um badge de status de forma segura (sem innerHTML com dados do usuário).
 */
function buildStatusBadge(status) {
  const span = document.createElement("span");
  span.className = `badge ${status === "ACTIVE" ? "active" : "inactive"}`;
  span.textContent = formatStatus(status);
  return span;
}

/**
 * Renderiza a tabela de usuários com proteção contra XSS.
 * Atenção: não usamos innerHTML para inserir nome/email vindos do banco.
 */
function render(users) {
  const tbody = $("#usersTbody");
  tbody.innerHTML = "";

  users.forEach((u) => {
    const tr = document.createElement("tr");

    // Coluna: Nome
    const tdName = document.createElement("td");
    setText(tdName, u.name);

    // Coluna: Email
    const tdEmail = document.createElement("td");
    setText(tdEmail, u.email);

    // Coluna: Status
    const tdStatus = document.createElement("td");
    tdStatus.appendChild(buildStatusBadge(u.status));

    // Coluna: Ações
    const tdActions = document.createElement("td");

    // ✅ NOVO: identifica usuário logado e perfil
    const loggedUser = getLoggedUser();

    // ✅ NOVO: só exibe botões se for ADMIN
    if (loggedUser && loggedUser.profile === "ADMIN") {

      const btnEdit = document.createElement("button");
      btnEdit.className = "btn-ghost";
      btnEdit.type = "button";
      btnEdit.textContent = "Editar";
      btnEdit.addEventListener("click", () => fillForm(u));

      const btnToggle = document.createElement("button");
      btnToggle.className = "btn-danger";
      btnToggle.type = "button";
      btnToggle.textContent = u.status === "ACTIVE" ? "Inativar" : "Ativar";
      btnToggle.addEventListener("click", () => toggleStatus(u.id, u.status, $("#alertUsers")));

      tdActions.appendChild(btnEdit);
      tdActions.appendChild(btnToggle);
    }

    tr.appendChild(tdName);
    tr.appendChild(tdEmail);
    tr.appendChild(tdStatus);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

/**
 * Preenche o formulário para edição.
 * Observação didática:
 * - Senha não é exibida.
 * - Se quiser alterar senha, isso deve ser feito com endpoint específico (etapa posterior).
 */
function fillForm(user) {
  $("#userId").value = user.id;
  $("#name").value = user.name;
  $("#email").value = user.email;
  $("#profile").value = user.profile;
  $("#active").value = user.status === "ACTIVE" ? "1" : "0";

  // Campo senha sempre vazio.
  $("#password").value = "";
  $("#password").placeholder = "Preencha somente para novo usuário (alteração de senha será outra etapa)";
}

/**
 * Limpa o formulário para cadastro de novo usuário.
 */
function clearForm() {
  $("#userId").value = "";
  $("#name").value = "";
  $("#email").value = "";
  $("#profile").value = "USER";
  $("#active").value = "1";
  $("#password").value = "";
  $("#password").placeholder = "Senha (será criptografada no backend)";
}

/**
 * Busca usuários reais no backend e atualiza:
 * - cache local
 * - tabela renderizada
 */
async function loadUsersFromApi(alertEl) {
  try {
    const list = await apiRequest("/api/users"); // GET protegido por token
    usersCache = Array.isArray(list) ? list : [];
    render(usersCache);
  } catch (err) {
    // 401/403: token inválido ou acesso negado → volta para login
    if (err.status === 401 || err.status === 403) {
      setToken(null);
      window.location.href = "./login.html";
      return;
    }

    if (err.status === 403) {
      return showAlert(alertEl, "err", "Acesso negado para listar usuários.");
      return;
    }

    showAlert(alertEl, "err", err.message || "Falha ao carregar usuários.");
  }
}

/**
 * Alterna status do usuário (soft delete).
 * - ACTIVE → INACTIVE
 * - INACTIVE → ACTIVE
 */
async function toggleStatus(id, currentStatus, alertEl) {
  const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  await apiRequest(`/api/users/${id}/status`, {
    method: "PATCH",
    body: { status: newStatus }
  });

  await loadUsersFromApi(alertEl);
}

/**
 * Inicializa a tela users.html.
 * - valida sessão
 * - carrega listagem real
 * - configura eventos do formulário e busca
 */
export function initUsersPage() {
  const form = $("#userForm");
  const loggedUser = getLoggedUser();

  if (!loggedUser || loggedUser.profile !== "ADMIN") {
    form.style.display = "none";
  }
  const alertEl = $("#alertUsers");
  const logoutBtn = $("#logoutBtn");
  const searchEl = $("#search");

  hideAlert(alertEl);

  // 1) Carregamento inicial do backend (lista real)
  loadUsersFromApi(alertEl);

  // 2) Handler do formulário (criar/editar)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(alertEl);

    const id = $("#userId").value.trim();
    const name = $("#name").value.trim();
    const email = $("#email").value.trim().toLowerCase();
    const profile = $("#profile").value;
    const status = $("#active").value === "1" ? "ACTIVE" : "INACTIVE";
    const password = $("#password").value;

    // Validações mínimas no front
    if (name.length < 3) {
      return showAlert(alertEl, "warn", "Nome deve ter pelo menos 3 caracteres.");
    }
    if (!validateEmail(email)) {
      return showAlert(alertEl, "warn", "E-mail inválido.");
    }

    try {
      // ============================
      // CREATE (novo usuário)
      // ============================
      if (!id) {
        // Para criar usuário, senha é obrigatória
        if (!password || password.length < 6) {
          return showAlert(alertEl, "warn", "Para cadastrar, informe uma senha com pelo menos 6 caracteres.");
        }

        await apiRequest("/api/users", {
          method: "POST",
          body: { name, email, password, profile }
        });

        showAlert(alertEl, "ok", "Usuário cadastrado com sucesso.");
        clearForm();
        await loadUsersFromApi(alertEl);
        return;
      }

      // ============================
      // UPDATE (editar usuário)
      // ============================
      // Nesta etapa, não alteramos senha aqui.
      // Atualizamos apenas nome, email, profile e status.
      await apiRequest(`/api/users/${id}`, {
        method: "PUT",
        body: { name, email, profile, status }
      });

      showAlert(alertEl, "ok", "Usuário atualizado com sucesso.");
      clearForm();
      await loadUsersFromApi(alertEl);

    } catch (err) {
      // Debug recomendado durante desenvolvimento
      console.log("DEBUG ERRO USERS:", err.message, err.status, err.data);

      if (err.status === 400) {
        return showAlert(alertEl, "err", err.message || "Dados inválidos.");
      }

      if (err.status === 409) {
        return showAlert(alertEl, "err", "Já existe usuário com este e-mail.");
      }

      if (err.status === 401 || err.status === 403) {
        setToken(null);
        window.location.href = "./login.html";
        return;
      }

      showAlert(alertEl, "err", err.message || "Falha ao salvar usuário.");
    }
  });

  // 3) Botão Limpar
  $("#btnClear").addEventListener("click", (e) => {
    e.preventDefault();
    clearForm();
    hideAlert(alertEl);
  });

  // 4) Campo de busca (filtra no front sem chamar backend)
  searchEl.addEventListener("input", () => {
    const term = searchEl.value.trim().toLowerCase();

    const filtered = usersCache.filter((u) =>
      u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
    );

    render(filtered);
  });

  // 5) Logout: remove token e retorna ao login
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token")
    setToken(null);
    localStorage.removeItem("user");
    window.location.href = "./login.html";
  });

  // Observação importante:
  // O toggleStatus dispara requisição PATCH, mas a tela precisa recarregar
  // para refletir a mudança. Por isso, vamos delegar o recarregamento após PATCH
  // no próprio click handler a seguir.
  document.addEventListener("click", async (ev) => {
    const el = ev.target;
    if (!(el instanceof HTMLElement)) return;

    // Este listener existe apenas para garantir atualização após o PATCH,
    // mantendo o código de toggleStatus enxuto.
    // (Estrutura simples para turma técnica.)

    // Nada a fazer aqui se não for botão de inativar/ativar criado no render.
  });
}