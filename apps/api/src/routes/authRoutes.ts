import { Router } from "express";
import { login, refresh, signUp } from "../controllers/authController.js";

export const authRoutes = Router();

authRoutes.post("/signup", signUp);
authRoutes.post("/login", login);
authRoutes.post("/refresh", refresh);
