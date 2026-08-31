import { Router } from "express";
import { login, logout, me, refresh, signUp } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/rateLimit.js";

export const authRoutes = Router();

authRoutes.post("/signup", authRateLimit, signUp);
authRoutes.post("/login", authRateLimit, login);
authRoutes.post("/refresh", authRateLimit, refresh);
authRoutes.post("/logout", logout);
authRoutes.get("/me", requireAuth, me);
