import { Router } from "express";
import {
  getScenario,
  getModuleScenarios,
  submitScenarioResponse,
  getScenarioFeedback,
  createScenario,
  updateScenario,
  deleteScenario,
} from "../controllers/scenarioController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const scenarioRoutes = Router();

// Admin endpoints (must be before :id routes to avoid conflicts)
scenarioRoutes.post("/", requireAuth, requireAdmin, createScenario);

// Module scenarios
scenarioRoutes.get("/module/:moduleId", requireAuth, getModuleScenarios);

// Student endpoints
scenarioRoutes.post("/submit", requireAuth, submitScenarioResponse);
scenarioRoutes.get("/feedback/:responseId", requireAuth, getScenarioFeedback);
scenarioRoutes.get("/:scenarioId", requireAuth, getScenario);

// Admin update/delete
scenarioRoutes.patch("/:scenarioId", requireAuth, requireAdmin, updateScenario);
scenarioRoutes.delete("/:scenarioId", requireAuth, requireAdmin, deleteScenario);
