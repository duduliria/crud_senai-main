import bcrypt from "bcrypt";
import { pool } from "../db.js";

export async function listUsers() {
  const [rows] = await pool.execute(
    `SELECT id, name, email, profile, status, created_at, updated_at
     FROM users ORDER BY id DESC`
  );
  return rows;
}

export async function getUserById(id) {
  const [rows] = await pool.execute(
    `SELECT id, name, email, profile, status
     FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function createUser({ name, email, password, profile }) {
  const [exists] = await pool.execute(
    `SELECT id FROM users WHERE email = ? LIMIT 1`,
    [email]
  );

  if (exists.length) {
    return { ok: false, statusCode: 409, message: "E-mail já cadastrado." };
  }

  const password_hash = await bcrypt.hash(password, 10);

  const [result] = await pool.execute(
    `INSERT INTO users (name, email, password_hash, profile, status)
     VALUES (?, ?, ?, ?, 'ACTIVE')`,
    [name, email, password_hash, profile]
  );

  return { ok: true, statusCode: 201, data: await getUserById(result.insertId) };
}

export async function updateUser(id, payload) {
  const current = await getUserById(id);
  if (!current) return { ok: false, statusCode: 404, message: "Usuário não encontrado." };

  const fields = [];
  const values = [];

  for (const key of ["name", "email", "profile", "status"]) {
    if (payload[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(payload[key]);
    }
  }

  if (!fields.length) return { ok: true, statusCode: 200, data: current };

  values.push(id);

  await pool.execute(
    `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  return { ok: true, statusCode: 200, data: await getUserById(id) };
}

export async function updateUserStatus(id, status) {
  return updateUser(id, { status });
}