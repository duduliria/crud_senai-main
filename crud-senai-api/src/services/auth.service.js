// Importa bcrypt para comparar senhas de forma segura (hashing)
import bcrypt from "bcrypt";

// Importa jsonwebtoken para gerar tokens JWT (autenticação baseada em tokens)
import jwt from "jsonwebtoken";

// Importa o pool de conexão do banco de dados para executar queries
import { pool } from "../db.js";

// Define o número máximo de tentativas de login falhadas (padrão: 3) a partir de variáveis de ambiente
const MAX = Number(process.env.MAX_LOGIN_ATTEMPTS || 3);

// Define o tempo (em minutos) que um usuário fica bloqueado após exceder o máximo de tentativas (padrão: 5)
const LOCK_MINUTES = Number(process.env.LOCK_MINUTES || 5);

// Função auxiliar que retorna uma data futura adicionando X minutos ao tempo atual
// Usada para definir quando um usuário bloqueado poderá tentar novamente
function nowPlusMinutes(min) {
  // Cria uma nova data com o tempo atual + (minutos * 60 segundos * 1000 milissegundos)
  return new Date(Date.now() + min * 60 * 1000);
}

// Função assíncrona principal de login com mecanismo de bloqueio por tentativas falhadas
// Recebe um objeto desestruturado com email e password
export async function loginWithLock({ email, password }) {
  
  // Executa query preparada (com placeholders ?) para buscar o usuário no banco
  // A prepared statement protege contra SQL Injection
  const [rows] = await pool.execute(
    // SELECT retorna ID, nome, email, hash da senha, perfil, status, tentativas falhadas e data de desbloqueio
    `SELECT id, name, email, password_hash, profile, status,
            failed_attempts, locked_until
     FROM users
     WHERE email = ? LIMIT 1`,
    // Passa o email como parâmetro seguro (evita SQL Injection)
    [email]
  );

  // Define uma mensagem neutra de erro para não revelar se o email existe no banco
  // Isso é importante para segurança (não informar se um email está cadastrado)
  const invalidMsg = "Credenciais inválidas.";

  // Verifica se nenhum usuário foi encontrado com esse email
  if (rows.length === 0) {
    // Retorna erro genérico mesmo que o email não exista (segurança)
    return { ok: false, statusCode: 401, message: invalidMsg };
  }

  // Armazena os dados do usuário encontrado
  const user = rows[0];

  // Verifica se o status do usuário é diferente de "ACTIVE" (soft delete)
  // Usuários inativos não podem fazer login
  if (user.status !== "ACTIVE") {
    return { ok: false, statusCode: 403, message: "Usuário inativo." };
  }

  // Verifica se o usuário está bloqueado temporariamente
  // Se existe locked_until e a data ainda não passou
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    // Retorna status 423 (Locked) indicando bloqueio temporário
    return { ok: false, statusCode: 423, message: "Usuário bloqueado temporariamente." };
  }

  // Compara a senha fornecida com o hash armazenado no banco de forma segura
  // bcrypt.compare retorna true se as senhas coincidem, false caso contrário
  const passOk = await bcrypt.compare(password, user.password_hash);

  // Verifica se a senha está incorreta
  if (!passOk) {
    // Incrementa o contador de tentativas falhadas, com máximo de 255 para não exceder limite do banco
    const newFails = Math.min((user.failed_attempts || 0) + 1, 255);

    // Se o número de tentativas falhadas atingiu o máximo permitido
    if (newFails >= MAX) {
      // Calcula a data/hora em que o usuário será desbloqueado
      const lockedUntil = nowPlusMinutes(LOCK_MINUTES);

      // Atualiza o banco: registra as tentativas falhadas e a data de bloqueio
      await pool.execute(
        `UPDATE users
         SET failed_attempts = ?, locked_until = ?
         WHERE id = ?`,
        [newFails, lockedUntil, user.id]
      );

      // Retorna erro indicando que o usuário foi bloqueado por segurança
      return { ok: false, statusCode: 423, message: "3 tentativas incorretas. Usuário bloqueado." };
    }

    // Se ainda não atingiu o máximo, apenas incrementa o contador de tentativas falhadas
    await pool.execute(
      `UPDATE users SET failed_attempts = ? WHERE id = ?`,
      [newFails, user.id]
    );

    // Retorna erro genérico (mensagem neutra)
    return { ok: false, statusCode: 401, message: invalidMsg };
  }

  // Se a senha está correta, limpa o contador de tentativas falhadas e remove o bloqueio
  // Verifica se há tentativas falhadas ou se o usuário está bloqueado
  if ((user.failed_attempts || 0) > 0 || user.locked_until) {
    // Zera as tentativas falhadas e remove a data de bloqueio (seta como NULL)
    await pool.execute(
      `UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?`,
      [user.id]
    );
  }

  // Gera um token JWT (JSON Web Token) para autenticação futura
  // O token contém informações do usuário codificadas e assinadas
  const token = jwt.sign(
    // Payload (dados) do token: ID do usuário e seu perfil
    { sub: String(user.id), profile: user.profile },
    // Chave secreta para assinar o token (obtida de variável de ambiente)
    process.env.JWT_SECRET,
    // Opções: o token expira em 1 hora (ou valor configurado em variável de ambiente)
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );

  // Retorna resposta de sucesso
  return {
    // Indica que a operação foi bem-sucedida
    ok: true,
    // Status HTTP 200 (OK)
    statusCode: 200,
    // Dados retornados ao cliente
    data: {
      // Token JWT gerado para autenticação
      token,
      // Objeto com dados públicos do usuário (nunca retorna password_hash)
      user: { id: user.id, name: user.name, email: user.email, profile: user.profile }
    }
  };
}
