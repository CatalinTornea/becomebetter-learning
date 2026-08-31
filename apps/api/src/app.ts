import "dotenv/config";
import "./lib/env.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { authRoutes } from "./routes/authRoutes.js";
import { courseRoutes } from "./routes/courseRoutes.js";
import { scenarioRoutes } from "./routes/scenarioRoutes.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { getFrontendOrigins } from "./lib/env.js";
import path from "path";

export const app = express();

const allowedOrigins = getFrontendOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    setHeaders(res, filePath) {
      const lower = String(filePath).toLowerCase();
      if (lower.endsWith('.pdf') || lower.endsWith('.ppt') || lower.endsWith('.pptx')) {
        // Force inline disposition so browser attempts to display instead of download
        res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
      }
    }
  })
);

app.get("/", (_req, res) =>
  res.json({
    message: "Become better API is running",
    endpoints: ["/health", "/auth", "/courses", "/scenarios", "/admin"]
  })
);
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/auth", authRoutes);
app.use("/courses", courseRoutes);
app.use("/scenarios", scenarioRoutes);
app.use("/admin", adminRoutes);

app.use(errorHandler);
