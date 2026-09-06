import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const newPassword = process.argv[2] || process.env.NEW_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || "admin1234";
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@becomebetter.ro" },
    update: {
      fullName: "Become Better Admin",
      role: UserRole.ADMIN,
      passwordHash
    },
    create: {
      email: "admin@becomebetter.ro",
      fullName: "Become Better Admin",
      role: UserRole.ADMIN,
      passwordHash
    }
  });

  console.log(`Admin ready: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
