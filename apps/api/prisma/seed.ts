import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.rubricScore.deleteMany();
  await prisma.scenarioResponse.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.progress.deleteMany();
  await prisma.module.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminPassword = await bcrypt.hash("admin1234", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@becomebetter.ro",
      fullName: "Become Better Admin",
      role: UserRole.ADMIN,
      passwordHash: adminPassword,
    },
  });

  // Create student user
  const studentPassword = await bcrypt.hash("student1234", 10);
  const student = await prisma.user.create({
    data: {
      email: "student@becomebetter.ro",
      fullName: "John Student",
      role: UserRole.STUDENT,
      passwordHash: studentPassword,
    },
  });

  // Create course
  const course = await prisma.course.create({
    data: {
      title: "Operational Excellence",
      description: "Master problem-solving and operational excellence in manufacturing",
      level: "BEGINNER",
    },
  });

  // Create module
  const module = await prisma.module.create({
    data: {
      title: "Problem-Solving Fundamentals",
      content: "Learn how to approach complex operational problems systematically",
      videoUrl: "https://example.com/video1",
      orderIndex: 1,
      courseId: course.id,
    },
  });

  // Create scenario with rubrics
  const scenario = await prisma.scenario.create({
    data: {
      title: "Rebut la linia de asamblare",
      problemStatement: `Ești Quality Engineer pe linia principală de asamblare. La ora 14:00 te-a sunat Mihai, operatorul de la stația 5 (12 ani vechime, om de încredere — te-a sunat personal). În jurul orei 10:00 a observat bavură pe muchia exterioară a piesei P-237. A continuat 30 de minute crezând că-i un caz izolat, apoi a măsurat totul — toate 50 piesele cu acelasi defect. A oprit stația 5 imediat, a separat totul și ți-a raportat după pauza de prânz.

CONTEXT FACTS:
- 50 pcs defective (bavură pe piesa P-237)
- Stația 5 throughput: ~50 pcs/30min normalmente
- Operator is reliable and proactive
- Quality standard: Zero defects for client X
- Client communication: Must be within 2 hours of discovery
- Production schedule: Already delayed by 3 days

Ce faci?`,
      coachingMaterials: `📚 COACHING MATERIALS

STANDARD PROCEDURES:
1. Root Cause Analysis (RCA) - 5 Whys methodology
2. Containment: Segregate defective parts immediately
3. Customer notification: Within 2 hours per contract
4. Corrective action: Must prevent recurrence
5. Quality verification: 100% inspection protocol

OPERATIONAL CONTEXT:
- Client SLA: <4 hour response to quality issues
- Production loss: 50 pcs × 3 hours = 150 pcs delayed
- Customer impact: ~€3,500 cost per hour of delay
- Operator performance: Mihai is exemplary (0 defects in 12 years)

RESOURCES AVAILABLE:
- Tool change documentation
- Maintenance team (on-site)
- Quality lab (30 min turnaround)
- Client quality manager (direct line)`,
      difficulty: "INTERMEDIATE",
      moduleId: module.id,
      rubrics: {
        create: [
          {
            name: "IMPACT Assessment",
            description:
              "Demonstrează o înțelegere clară a impactului asupra clienților, producției și operațiunilor. Include evaluare cuantificată a costurilor/riscurilor și Timeline-ului critic.",
          },
          {
            name: "Root Cause Identification",
            description:
              "Identifică cauzele potențiale ale bavurii folosind 5 Why methodology. Diferențiaza intre cauza imediera și cauza rădacină. Propune teste pentru validare.",
          },
          {
            name: "Corrective Action",
            description:
              "Propuneți măsuri concrete care să prevină recidiva. Include: tool change, process adjustment, inspection protocol, și sistem de monitoring.",
          },
          {
            name: "Communication Plan",
            description:
              "Structurați notificarea clienților cu transparență. Include: what happened, business impact, containment measures, timeline pentru rezolvare, și follow-up plan.",
          },
        ],
      },
    },
  });

  // Create a quiz for the module
  const quiz = await prisma.quiz.create({
    data: {
      question: "What is the first priority when discovering a quality issue?",
      options: [
        "Immediately notify the customer",
        "Investigate root cause",
        "Contain the problem (segregate defective parts)",
        "Stop all production",
      ],
      correctIndex: 2,
      moduleId: module.id,
    },
  });

  console.log("✅ Seed data created successfully!\n");
  console.log("ADMIN ACCOUNT:");
  console.log(`   Email: ${admin.email}`);
  console.log(`   Password: admin1234\n`);
  console.log("👤 STUDENT ACCOUNT:");
  console.log(`   Email: ${student.email}`);
  console.log(`   Password: student1234\n`);
  console.log("📚 COURSE: " + course.title);
  console.log("📖 MODULE: " + module.title);
  console.log("🎯 SCENARIO: " + scenario.title);
  console.log("❓ QUIZ: " + quiz.question);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
