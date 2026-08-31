import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getAccessTokenFromRequest } from "../lib/authCookies.js";
import { JWT_SECRET } from "../lib/env.js";

type JwtPayload = {
  sub: string;
  email: string;
  fullName: string;
  role: "STUDENT" | "COACH" | "ADMIN";
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role
    };
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requireCoach(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "COACH") {
    return res.status(403).json({ message: "Coach role required" });
  }
  return next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin role required" });
  }
  return next();
}
