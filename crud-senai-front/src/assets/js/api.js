// Define a URL base da API (servidor Node.js rodando em localhost:3000)
// esta URL é usada em todas as requisições feitas pelos arquivos auth.js e users.js
// Em produção, esta URL seria um domínio real (ex: https://api.exemplo.com)
const API_BASE_URL = "http://localhost:3000";

// Função auxiliar que recupera o token JWT armazenado no localStorage
// O token foi salvo quando o usuário fez login com sucesso (em auth.js)
// Este token é necessário para autenticar requisições em rotas protegidas do backend
// Retorna null se nenhum token existe (usuário não autenticado)
function getToken() {
  return localStorage.getItem("token");
}

// Função exportada que salva ou remove o token JWT no/do localStorage
// É chamada em auth.js (auth.service.js) após receber um token do backend
// Se token é null/undefined, remove o token (logout)
// Se token tem valor, armazena para uso em futuras requisições
export function setToken(token) {
  // Verifica se o token é null, undefined ou vazio
  if (!token) {
    // Remove o token do localStorage para fazer logout
    // Isso força o usuário a fazer login novamente
    localStorage.removeItem("token");
    return;
  }
  // Armazena o token JWT no localStorage para persistência entre abas/reloads
  // Formato do token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx.xxx
  localStorage.setItem("token", token);
}

/**
 * Função central que faz requisições HTTP para o backend
 * Encapsula a lógica de headers, autenticação e tratamento de erros
 * Usado por auth.js (para login) e users.js (para CRUD de usuários)
 * 
 * @param {string} path - Caminho da API, ex: "/api/auth/login" ou "/api/users/1"
 * @param {object} options - Opções adicionais da requisição
 *   - method (padrão: "GET"): tipo de requisição (GET, POST, PUT, DELETE)
 *   - body (padrão: undefined): dados a enviar no corpo (JSON)
 *   - auth (padrão: true): se deve incluir token Authorization no header
 */
export async function apiRequest(path, { method = "GET", body, auth = true } = {}) {
  // Cria um objeto de headers com tipo de conteúdo JSON
  // Todos os dados trocados com o backend são em formato JSON
  const headers = { "Content-Type": "application/json" };

  // Verifica se autenticação é necessária nesta requisição (auth = true)
  // Algumas rotas do backend não precisam de token (ex: POST /api/auth/login)
  if (auth) {
    // Recupera o token JWT armazenado no localStorage
    const token = getToken();
    // Se existe um token, adiciona ao header Authorization com formato "Bearer <token>"
    // Este é o padrão OAuth 2.0 esperado pelo middleware requireAuth do backend
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // Faz a requisição HTTP real usando fetch (API nativa do navegador)
  // Espera (await) pela resposta do servidor
  const res = await fetch(`${API_BASE_URL}${path}`, {
    // Define o método HTTP (GET, POST, PUT, DELETE, etc)
    method,
    // Inclui os headers já montados (Content-Type e Authorization se necessário)
    headers,
    // Converte o objeto body em string JSON, ou undefined se não houver dados
    // JSON.stringify serializa objetos JavaScript para string JSON
    body: body ? JSON.stringify(body) : undefined
  });

  // Tenta converter a resposta em JSON, ou retorna um objeto vazio se falhar
  // O .catch(() => ({})) captura erros de parse (ex: resposta vazia ou HTML)
  // Isso previne que a aplicação quebre se o backend retornar HTML ao invés de JSON
  const data = await res.json().catch(() => ({}));

  // Verifica se a requisição foi bem-sucedida (status 200-299)
  // res.ok é false para status 4xx ou 5xx (erros)
  if (!res.ok) {
    // Extrai a mensagem de erro da resposta JSON, ou usa uma mensagem genérica
    // Exemplo: "Credenciais inválidas." do backend, ou "Erro HTTP 401" como fallback
    const msg = data?.message || `Erro HTTP ${res.status}`;
    // Cria um novo objeto Error com a mensagem
    // Isso permite que o chamador (auth.js ou users.js) capture e trate o erro
    const err = new Error(msg);
    // Adiciona propriedades customizadas ao erro para mais contexto
    // status: código HTTP (401, 403, 404, 500, etc)
    err.status = res.status;
    // data: resposta completa do backend (pode conter detalhes adicionais)
    err.data = data;
    // Lança o erro para que o try-catch em auth.js/users.js o capture
    throw err;
  }

  // Se chegou aqui, a requisição foi bem-sucedida (status OK)
  // Retorna os dados JSON recebidos do backend
  // Chamador receberá { token: "...", ok: true, message: "..." } ou similar
  return data;
}
