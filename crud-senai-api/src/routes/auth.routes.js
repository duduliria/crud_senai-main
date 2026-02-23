// Importa a função Router do framework Express, utilizada para criar rotas modulares
import { Router } from "express";

// Importa o middleware express-rate-limit, que limita o número de requisições de um IP
import rateLimit from "express-rate-limit";

// Importa o schema de validação do formulário de login (usada com Zod para validar dados)
import { loginSchema } from "../validators/auth.validators.js";

// Importa a função de serviço que executa a lógica de login com proteção de tentativas (lock)
import { loginWithLock } from "../services/auth.service.js";

// Alteração no passo 29.2 Import da função de middleware que exige autenticação 
// (verificação de token JWT) para rotas protegidas
import { requireAuth } from "../middlewares/auth.middleware.js";

// Cria uma nova instância de router para definir as rotas de autenticação
const router = Router();

// Configura um middleware limitador de taxa (rate limiter) para proteger contra força bruta
const loginLimiter = rateLimit({
  // Define uma janela de tempo de 60 segundos (60 * 1000 milissegundos)
  windowMs: 60 * 1000,
  // Limita a 20 requisições máximas por IP dentro da janela de tempo
  limit: 20,
  // Inclui informações padrão de rate limit nos headers da resposta HTTP
  standardHeaders: true,
  // Desabilita headers antigos/legados do express-rate-limit
  legacyHeaders: false
});

// Define uma rota POST /login que recebe o middleware rate limiter como proteção
// A função é assíncrona (async) para permitir operações que esperam por promessas
router.post("/login", loginLimiter, async (req, res, next) => {
  // Inicia um bloco try-catch para capturar e tratar erros
  try {
    // Valida os dados do corpo da requisição usando o schema loginSchema do Zod
    // safeParse retorna um objeto com propriedades 'success' e 'data' ou 'error'
    const parsed = loginSchema.safeParse(req.body);
    
    // Verifica se a validação falhou (parsed.success é false)
    if (!parsed.success) {
      // Retorna um erro HTTP 400 (Requisição Inválida) com mensagem de erro
      return res.status(400).json({ message: "Dados inválidos." });
    }

    // Chama a função de serviço de login, passando os dados validados
    // Aguarda (await) a conclusão da operação assíncrona
    const result = await loginWithLock(parsed.data);

    // Verifica se o resultado da operação não foi bem-sucedido (ok é false)
    if (!result.ok) {
      // Retorna o código de status e mensagem de erro retornados pelo serviço
      return res.status(result.statusCode).json({ message: result.message });
    }

    // Se tudo correu bem, retorna status HTTP 200 (OK) com os dados da resposta
    return res.status(200).json(result.data);
    
  } catch (err) {
    // Se ocorrer um erro não tratado, passa para o middleware de tratamento de erros
    // O 'next(err)' chama o middleware de erro global definido na aplicação
    next(err);
  }
});

// >>> ALTERADO: rota protegida para validar token (novo) Passo 29.3.1 da apostila
router.get("/me", requireAuth, async (req, res) => {
  return res.json({
    ok: true,
    auth: req.auth
  });
});

// Exporta o router como padrão (default export) para ser usado em outros arquivos
// ✅ OBRIGATÓRIO para que as rotas sejam acessíveis fora deste módulo
export default router;
