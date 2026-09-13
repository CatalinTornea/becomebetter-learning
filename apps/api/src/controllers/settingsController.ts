import type { Request, Response } from "express";
import { getPublicAppSettings } from "../lib/appSettings.js";

export async function getSettings(_req: Request, res: Response) {
  try {
    const settings = await getPublicAppSettings();
    return res.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({ message: "Nu am putut încărca setările site-ului." });
  }
}
