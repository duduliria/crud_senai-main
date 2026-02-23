import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/role.middleware.js";
import { createUserSchema, updateUserSchema, updateStatusSchema } from "../validators/user.validators.js";
import { listUsers, getUserById, createUser, updateUser, updateUserStatus } from "../services/users.service.js";

const router = Router();

router.use(requireAuth);
// router.use(requireAdmin);

router.get("/", async (req, res) => {
  res.json(await listUsers());
});

router.get("/:id", async (req, res) => {
  const user = await getUserById(Number(req.params.id));
  if (!user) return res.status(404).json({ message: "Usuário não encontrado." });
  res.json(user);
});

// Apenas usuários com perfil ADMIN podem criar novos usuários
router.post("/", requireAdmin,async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Dados inválidos." });

  const result = await createUser(parsed.data);
  if (!result.ok) return res.status(result.statusCode).json({ message: result.message });

  res.status(201).json(result.data);
});

// Apenas usuários com perfil ADMIN podem editar usuários
router.put("/:id", requireAdmin,async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Dados inválidos." });

  const result = await updateUser(Number(req.params.id), parsed.data);
  if (!result.ok) return res.status(result.statusCode).json({ message: result.message });

  res.json(result.data);
});

// eu sou maravilhoso


// Apenas usuários com perfil ADMIN podem alterar status de usuários
router.patch("/:id/status", requireAdmin, async (req, res) => {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Dados inválidos." });

  const result = await updateUserStatus(Number(req.params.id), parsed.data.status);
  if (!result.ok) return res.status(result.statusCode).json({ message: result.message });

  res.json(result.data);
});

export default router;