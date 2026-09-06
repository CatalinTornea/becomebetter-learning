import { Router } from "express";
import { forgotPassword, login, logout, me, refresh, resetPassword, signUp, testEmail } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/rateLimit.js";

export const authRoutes = Router();

authRoutes.post("/signup", authRateLimit, signUp);
authRoutes.post("/login", authRateLimit, login);
authRoutes.post("/refresh", authRateLimit, refresh);
authRoutes.post("/logout", logout);
authRoutes.post("/forgot-password", authRateLimit, forgotPassword);
authRoutes.post("/reset-password", authRateLimit, resetPassword);
authRoutes.get("/test-email", testEmail);
authRoutes.get("/me", requireAuth, me);
