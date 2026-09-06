import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import crypto from "crypto";
import {
  clearAuthCookies,
  getRefreshTokenFromRequest,
  setAccessTokenCookie,
  setAuthCookies
} from "../lib/authCookies.js";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { sendPasswordResetEmail } from "../lib/mailer.js";

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

function publicUser(user: { id: string; email: string; fullName: string; role: AuthRole }) {
  return { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
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

  const user = publicUser(created);
  setAuthCookies(res, issueTokens(user));

  return res.status(201).json({ user });
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

  const publicUserData = publicUser(user);
  setAuthCookies(res, issueTokens(publicUserData));

  return res.json({ user: publicUserData });
}

export async function refresh(req: Request, res: Response) {
  const token = getRefreshTokenFromRequest(req);
  if (!token) {
    return res.status(400).json({ message: "Missing refresh token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const publicUserData = publicUser(user);
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, fullName: user.fullName, role: user.role },
      JWT_SECRET,
      { expiresIn: "30m" }
    );
    setAccessTokenCookie(res, accessToken);
    return res.json({ user: publicUserData });
  } catch (_error) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
}

export async function logout(_req: Request, res: Response) {
  clearAuthCookies(res);
  return res.json({ message: "Logged out" });
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.json({ user: req.user });
}

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6)
});

export async function forgotPassword(req: Request, res: Response) {
  const payload = forgotPasswordSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Adresă de email invalidă." });
  }

  const { email } = payload.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.log(`[ForgotPassword] No user found in DB for email: ${email}`);
    return res.json({ message: "Dacă adresa de email există în sistem, ai primit un link de resetare." });
  }

  console.log(`[ForgotPassword] User found (${user.email}). Generating reset token...`);

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 3600000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: token,
      resetTokenExpires: expires
    }
  });

  const webUrl = process.env.APP_WEB_URL || process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:3000";
  const resetUrl = `${webUrl}/auth/reset-password?token=${token}`;

  await sendPasswordResetEmail(user.email, resetUrl);

  return res.json({ message: "Dacă adresa de email există în sistem, ai primit un link de resetare." });
}

export async function resetPassword(req: Request, res: Response) {
  const payload = resetPasswordSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Date invalide. Parola trebuie să aibă minim 6 caractere." });
  }

  const { token, password } = payload.data;
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpires: { gt: new Date() }
    }
  });

  if (!user) {
    return res.status(400).json({ message: "Link-ul de resetare este invalid sau a expirat." });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpires: null
    }
  });

  return res.json({ message: "Parola a fost schimbată cu succes! Te poți conecta acum." });
}
