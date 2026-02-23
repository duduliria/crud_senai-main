/**
 * Seletor DOM simplificado
 * Atalho para document.querySelector()
 * 
 * @param {string} selector - Seletor CSS (ex: "#id", ".class", "tag")
 * @returns {Element|null} Elemento encontrado ou null
 */
export function $(selector) {
  return document.querySelector(selector);
}

/**
 * Define o conteúdo de texto de um elemento de forma segura
 * Protege contra ataques XSS usando textContent ao invés de innerHTML
 * 
 * XSS (Cross-Site Scripting): Ataque que injeta código malicioso
 * Usando textContent prevenimos que <script> ou HTML seja executado
 * 
 * @param {Element} el - Elemento DOM a modificar
 * @param {*} text - Texto a inserir (será convertido para string)
 */
export function setText(el, text) {
  // Protege contra XSS: nunca injeta HTML, só texto puro
  el.textContent = String(text ?? "");
}

/**
 * Exibe um alert/notificação com tipo (sucesso, erro, aviso)
 * 
 * Tipos de alerta:
 * - "ok": Mensagem de sucesso (verde)
 * - "err": Mensagem de erro (vermelho)
 * - "warn": Mensagem de aviso (amarelo)
 * 
 * @param {Element} targetEl - Elemento que conterá o alerta
 * @param {string} type - Tipo de alerta ("ok", "err", "warn")
 * @param {string} message - Mensagem a exibir
 */
export function showAlert(targetEl, type, message) {
  targetEl.className = `alert ${type}`;  // Define a classe com o tipo
  setText(targetEl, message);  // Adiciona a mensagem de forma segura
  targetEl.hidden = false;  // Mostra o elemento
}

/**
 * Esconde um alert/notificação
 * 
 * @param {Element} targetEl - Elemento a esconder
 */
export function hideAlert(targetEl) {
  targetEl.hidden = true;  // Esconde o elemento
  targetEl.className = "alert";  // Remove classe de tipo
  targetEl.textContent = "";  // Limpa o conteúdo
}

/**
 * Valida se uma string é um email válido
 * Usa regex (expressão regular) para verificar o formato
 * 
 * Padrão: qualquer_coisa@qualquer_coisa.extensão
 * 
 * @param {string} email - Email a validar
 * @returns {boolean} true se email é válido, false caso contrário
 */
export function validateEmail(email) {
  // Regex explicado:
  // ^          - Início da string
  // [^\s@]+    - Um ou mais caracteres que NÃO são espaço ou @
  // @          - Símbolo de arroba (obrigatório)
  // [^\s@]+    - Um ou mais caracteres que NÃO são espaço ou @
  // \.         - Ponto (obrigatório)
  // [^\s@]+    - Um ou mais caracteres que NÃO são espaço ou @
  // $          - Fim da string
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}
