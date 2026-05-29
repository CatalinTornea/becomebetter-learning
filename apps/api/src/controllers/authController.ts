import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret";

const signUpSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(3),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type AuthRole = "STUDENT" | "COACH" | "ADMIN";

function issueTokens(user: { id: string; email: string; fullName: string; role: AuthRole }) {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, fullName: user.fullName, role: user.role },
    JWT_SECRET,
    { expiresIn: "30m" }
  );
  const refreshToken = jwt.sign({ sub: user.id }, JWT_REFRESH_SECRET, {
    expiresIn: "7d"
  });
  return { accessToken, refreshToken };
}

export async function signUp(req: Request, res: Response) {
  const payload = signUpSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json(payload.error.flatten());
  }

  const existing = await prisma.user.findUnique({ where: { email: payload.data.email } });
  if (existing) {
    return res.status(409).json({ message: "Email already used" });
  }

  const passwordHash = await bcrypt.hash(payload.data.password, 10);
  const created = await prisma.user.create({
    data: {
      email: payload.data.email,
      fullName: payload.data.fullName,
      passwordHash
    }
  });

  return res.status(201).json({
    user: { id: created.id, email: created.email, fullName: created.fullName, role: created.role },
    ...issueTokens({ id: created.id, email: created.email, fullName: created.fullName, role: created.role })
  });
}

export async function login(req: Request, res: Response) {
  const payload = loginSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json(payload.error.flatten());
  }

  const user = await prisma.user.findUnique({ where: { email: payload.data.email } });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(payload.data.password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  return res.json({
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    ...issueTokens({ id: user.id, email: user.email, fullName: user.fullName, role: user.role })
  });
}

export async function refresh(req: Request, res: Response) {
  const token = req.body?.refreshToken as string | undefined;
  if (!token) {
    return res.status(400).json({ message: "Missing refresh token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, fullName: user.fullName, role: user.role },
      JWT_SECRET,
      { expiresIn: "30m" }
    );
    return res.json({ accessToken });
  } catch (_error) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
}
