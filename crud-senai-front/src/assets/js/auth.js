import { apiRequest, setToken } from "./api.js";
import { $, showAlert, hideAlert, validateEmail } from "./utils.js";

export function initLoginPage() {
  const form = $("#loginForm");
  const emailEl = $("#email");
  const passEl = $("#password");
  const alertEl = $("#alert");
  const forgotBtn = $("#forgotBtn");

  hideAlert(alertEl);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(alertEl);

    const email = emailEl.value.trim().toLowerCase();
    const password = passEl.value;

    if (!validateEmail(email)) {
      return showAlert(alertEl, "warn", "Informe um e-mail válido.");
    }

    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false
      });

      // Salva token e (opcional) o usuário
      setToken(data.token);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));

      showAlert(alertEl, "ok", "Login realizado! Redirecionando…");
      setTimeout(() => (window.location.href = "./users.html"), 700);
    } catch (err) {
      // Mostra no console para debug
      console.log("DEBUG ERRO LOGIN:", err.message, err.status, err.data);

      if (err.status === 401) {
        return showAlert(alertEl, "err", "E-mail ou senha incorretos.");
      }

      if (err.status === 423) {
        return showAlert(alertEl, "err", "Usuário bloqueado temporariamente. Aguarde alguns minutos e tente novamente.");
      }

      // Se for erro 400 (validação), mostre a mensagem do servidor
      if (err.status === 400) {
        return showAlert(alertEl, "err", err.message || "Dados inválidos.");
      }

      showAlert(alertEl, "err", err.message || "Falha ao autenticar.");
    }

  });

  forgotBtn.addEventListener("click", async () => {
    hideAlert(alertEl);

    const email = emailEl.value.trim().toLowerCase();

    if (!validateEmail(email)) {
      return showAlert(alertEl, "warn", "Para redefinir, informe um e-mail válido no campo e-mail.");
    }

    // Nesta etapa, o recurso ainda será simulado.
    // A integração real (token de redefinição + envio) será feita em etapa posterior.
    showAlert(alertEl, "ok", "Se este e-mail existir, enviaremos um link/código de redefinição (simulação).");
  });
}
