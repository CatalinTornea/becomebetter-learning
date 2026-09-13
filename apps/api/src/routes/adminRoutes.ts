import { Router } from "express";
import { createClientUser, getAllStudentScores, getAppSettings, getClientUsers, updateAppSettings } from "../controllers/adminController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const adminRoutes = Router();

// Admin only endpoint to view all student AI scores
adminRoutes.get("/student-scores", requireAuth, requireAdmin, getAllStudentScores);
adminRoutes.get("/users", requireAuth, requireAdmin, getClientUsers);
adminRoutes.post("/users", requireAuth, requireAdmin, createClientUser);
adminRoutes.get("/settings", requireAuth, requireAdmin, getAppSettings);
adminRoutes.patch("/settings", requireAuth, requireAdmin, updateAppSettings);
