// Importa a biblioteca jsonwebtoken, essencial para validar JWT (JSON Web Tokens)
// Esses tokens são gerados durante o login (auth.service.js) e usados para autenticar requisições posteriores
import jwt from "jsonwebtoken";

// Exporta uma função middleware que valida o token JWT nas requisições
// Este middleware é aplicado em rotas protegidas (como GET /users/:id) para garantir que apenas usuários autenticados podem acessar
// Recebe requisição, resposta e a função next (para continuar o pipeline de middlewares)
export function requireAuth(req, res, next) {
  // Inicia bloco try-catch para capturar erros de token inválido/expirado
  try {
    // Obtém o header "Authorization" da requisição HTTP
    // O cliente envia: "Authorization: Bearer <token>" após fazer login com sucesso
    const auth = req.headers.authorization;

    // Verifica se o header Authorization existe e se começa com "Bearer " (padrão OAuth 2.0)
    // Se não existir, retorna erro 401 (Não Autorizado) indicando ausência de token
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token ausente." });
    }

    // Extrai apenas o token, removendo o prefixo "Bearer " da string do header
    // substring remove os primeiros 7 caracteres ("Bearer "), e trim() remove espaços em branco
    // Exemplo: "Bearer eyJhbGc..." vira "eyJhbGc..."
    const token = auth.substring("Bearer ".length).trim();

    // Valida o token usando a chave secreta armazenada em variáveis de ambiente (process.env.JWT_SECRET)
    // Se o token for válido, jwt.verify retorna o payload decodificado (dados do usuário)
    // Se for inválido ou expirado, lança uma exceção que é capturada pelo catch
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Armazena os dados do token no objeto req.auth para que as próximas funções/middlewares tenham acesso
    // Isso permite que as rotas saibam qual usuário está fazendo a requisição sem precisar decodificar novamente
    req.auth = {
      // userId armazenado no campo "sub" (subject) do token gerado em auth.service.js
      userId: payload.sub,
      // profile (ADMIN, USER, etc) armazenado ao se gerar o JWT após login bem-sucedido
      profile: payload.profile
    };

    // Chama next() para passar o controle para o próximo middleware/rota da aplicação
    // Se não chamar next(), a requisição fica pendurada e nunca é respondida
    next();
  } catch (err) {
    // Se ocorrer erro (token inválido, expirado, assinatura incorreta, etc), cai neste bloco
    // Retorna 401 (Não Autorizado) com mensagem indicando que o token é inválido ou expirou
    // Não revelamos detalhes técnicos do erro por questão de segurança
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
}
