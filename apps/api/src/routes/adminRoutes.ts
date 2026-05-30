import { Router } from "express";
import { getAllStudentScores } from "../controllers/adminController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const adminRoutes = Router();

// Admin only endpoint to view all student AI scores
adminRoutes.get("/student-scores", requireAuth, requireAdmin, getAllStudentScores);
