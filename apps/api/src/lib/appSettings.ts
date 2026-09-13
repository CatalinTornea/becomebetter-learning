import { prisma } from "./prisma.js";

export type PublicAppSettings = {
  showCoursesPage: boolean;
};

const defaults: PublicAppSettings = {
  showCoursesPage: true,
};

export async function getPublicAppSettings(): Promise<PublicAppSettings> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: ["showCoursesPage"] } },
  });
  const settings = { ...defaults };

  for (const row of rows) {
    if (row.key === "showCoursesPage") {
      settings.showCoursesPage = row.value === "true";
    }
  }

  return settings;
}

export async function updatePublicAppSettings(settings: Partial<PublicAppSettings>) {
  if (typeof settings.showCoursesPage === "boolean") {
    await prisma.appSetting.upsert({
      where: { key: "showCoursesPage" },
      update: { value: String(settings.showCoursesPage) },
      create: { key: "showCoursesPage", value: String(settings.showCoursesPage) },
    });
  }

  return getPublicAppSettings();
}
