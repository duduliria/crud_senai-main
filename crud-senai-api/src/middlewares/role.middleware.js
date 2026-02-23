export function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.profile !== "ADMIN") {
    return res.status(403).json({ message: "Acesso negado." });
  }
  next();
}