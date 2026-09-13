import { Router } from "express";
import { getSettings } from "../controllers/settingsController.js";
import { requireAuth } from "../middleware/auth.js";

export const settingsRoutes = Router();

settingsRoutes.get("/", requireAuth, getSettings);
