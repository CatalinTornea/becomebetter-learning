import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const course = await prisma.course.create({
    data: {
      title: 'Sample Course with Attachment',
      description: 'This is a sample course created for testing attachments.',
      theory: 'Short theory',
      showAdminScenarios: true,
      evaluationCriteria: [{ title: 'Test', items: ['Item 1'] }],
      attachments: {
        create: [
          {
            filename: 'sample.pdf',
            originalName: 'sample.pdf',
            mime: 'application/pdf',
            size: 1234,
            url: 'https://file-examples-com.github.io/uploads/2017/10/file-sample_150kB.pdf'
          }
        ]
      }
    }
  });
  console.log('Created course:', course.id);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
