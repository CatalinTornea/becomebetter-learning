import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getPublicAppSettings, updatePublicAppSettings } from "../lib/appSettings.js";
import { prisma } from "../lib/prisma.js";

const createClientUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(["STUDENT", "COACH"]).optional().default("STUDENT"),
});

const appSettingsSchema = z.object({
  showAdminScenarios: z.boolean().optional(),
  showCoursesPage: z.boolean().optional(),
});

export async function getAllStudentScores(req: Request, res: Response) {
  try {
    const [responses, pdcaEvaluations] = await Promise.all([
      prisma.scenarioResponse.findMany({
      where: {
        isGraded: true,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        scenario: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        rubricScores: {
          include: {
            rubric: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      }),
      prisma.pdcaEvaluation.findMany({
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          columnScores: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
    ]);

    const formattedScenarios = responses.map((resp) => ({
      id: resp.id,
      type: "scenario",
      student: {
        id: resp.user.id,
        fullName: resp.user.fullName,
        email: resp.user.email,
      },
      scenario: {
        id: resp.scenario.id,
        title: resp.scenario.title,
        difficulty: (resp.scenario as any).difficulty,
      },
      course: {
        id: resp.scenario.course.id,
        title: resp.scenario.course.title,
      },
      overallScore: resp.overallScore,
      aiEvaluation: resp.aiEvaluation,
      response: resp.response,
      rubricScores: resp.rubricScores.map((rs) => ({
        rubricName: rs.rubric.name,
        score: rs.score,
        feedback: rs.feedback,
      })),
      gradedAt: resp.updatedAt,
    }));

    const formattedPdca = pdcaEvaluations.map((evaluation) => {
      const rowData = evaluation.rowData as {
        obstacle?: string;
        cause?: string;
        nextStep?: string;
        expected?: string;
        due?: string;
        result?: string;
        learned?: string;
      };

      return {
        id: evaluation.id,
        type: "pdca",
        student: {
          id: evaluation.user.id,
          fullName: evaluation.user.fullName,
          email: evaluation.user.email,
        },
        scenario: {
          id: "pdca-evaluations",
          title: `Evaluare PDCA${evaluation.projectName ? ` - ${evaluation.projectName}` : ""}`,
          difficulty: null,
        },
        course: {
          id: "practice-deliberata",
          title: "Practică deliberată",
        },
        overallScore: evaluation.overallScore,
        aiEvaluation: evaluation.generalFeedback,
        response: [
          rowData.obstacle ? `Obstacol: ${rowData.obstacle}` : "",
          rowData.cause ? `Cauză: ${rowData.cause}` : "",
          rowData.nextStep ? `Pasul următor: ${rowData.nextStep}` : "",
          rowData.expected ? `Așteptări: ${rowData.expected}` : "",
          rowData.due ? `Până când: ${rowData.due}` : "",
          rowData.result ? `Rezultat: ${rowData.result}` : "",
          rowData.learned ? `Ce am învățat: ${rowData.learned}` : "",
        ].filter(Boolean).join("\n"),
        rubricScores: evaluation.columnScores.map((score) => ({
          rubricName: score.column,
          score: score.score,
          feedback: score.feedback,
        })),
        gradedAt: evaluation.updatedAt,
      };
    });

    const formatted = [...formattedScenarios, ...formattedPdca].sort(
      (a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime()
    );

    return res.json(formatted);
  } catch (error) {
    console.error("Get student scores error:", error);
    return res.status(500).json({ message: "Failed to fetch student scores" });
  }
}

export async function getClientUsers(_req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ["STUDENT", "COACH"] } },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(users);
  } catch (error) {
    console.error("Get client users error:", error);
    return res.status(500).json({ message: "Nu am putut încărca utilizatorii." });
  }
}

export async function createClientUser(req: Request, res: Response) {
  try {
    const parsed = createClientUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0] || "Date invalide.";
      return res.status(400).json({ message: firstError });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Există deja un cont cu acest email." });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        fullName: parsed.data.fullName.trim(),
        passwordHash,
        role: parsed.data.role,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(201).json(user);
  } catch (error) {
    console.error("Create client user error:", error);
    return res.status(500).json({ message: "Nu am putut crea contul." });
  }
}

export async function getAppSettings(_req: Request, res: Response) {
  try {
    const settings = await getPublicAppSettings();
    return res.json(settings);
  } catch (error) {
    console.error("Get app settings error:", error);
    return res.status(500).json({ message: "Nu am putut încărca setările site-ului." });
  }
}

export async function updateAppSettings(req: Request, res: Response) {
  try {
    const parsed = appSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Setările trimise nu sunt valide." });
    }

    const settings = await updatePublicAppSettings(parsed.data);
    return res.json(settings);
  } catch (error) {
    console.error("Update app settings error:", error);
    return res.status(500).json({ message: "Nu am putut salva setările site-ului." });
  }
}
