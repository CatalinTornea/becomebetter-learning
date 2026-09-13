import { prisma } from "./prisma.js";

export type PublicAppSettings = {
  showAdminScenarios: boolean;
  showCoursesPage: boolean;
};

const defaults: PublicAppSettings = {
  showAdminScenarios: true,
  showCoursesPage: true,
};

export async function getPublicAppSettings(): Promise<PublicAppSettings> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: ["showAdminScenarios", "showCoursesPage"] } },
  });
  const settings = { ...defaults };

  for (const row of rows) {
    if (row.key === "showAdminScenarios") {
      settings.showAdminScenarios = row.value === "true";
    }
    if (row.key === "showCoursesPage") {
      settings.showCoursesPage = row.value === "true";
    }
  }

  return settings;
}

export async function updatePublicAppSettings(settings: Partial<PublicAppSettings>) {
  if (typeof settings.showAdminScenarios === "boolean") {
    await prisma.appSetting.upsert({
      where: { key: "showAdminScenarios" },
      update: { value: String(settings.showAdminScenarios) },
      create: { key: "showAdminScenarios", value: String(settings.showAdminScenarios) },
    });
  }

  if (typeof settings.showCoursesPage === "boolean") {
    await prisma.appSetting.upsert({
      where: { key: "showCoursesPage" },
      update: { value: String(settings.showCoursesPage) },
      create: { key: "showCoursesPage", value: String(settings.showCoursesPage) },
    });
  }

  return getPublicAppSettings();
}
