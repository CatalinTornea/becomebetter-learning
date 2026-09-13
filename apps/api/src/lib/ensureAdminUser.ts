import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";

export async function ensureAdminUser() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@becomebetter.ro";
    const newPassword = process.env.NEW_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || "Alina2026!";
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash,
        role: "ADMIN"
      },
      create: {
        email: adminEmail,
        fullName: "Become Better Admin",
        role: "ADMIN",
        passwordHash
      }
    });
    console.log(`[Init] Admin user (${adminEmail}) synced with password.`);
  } catch (err) {
    console.error("[Init] Error syncing admin user:", err);
  }
}
