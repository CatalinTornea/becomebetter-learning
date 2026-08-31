/*
  Warnings:

  - You are about to drop the column `level` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `difficulty` on the `Scenario` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Course" DROP COLUMN "level",
ADD COLUMN     "theory" TEXT;

-- AlterTable
ALTER TABLE "Scenario" DROP COLUMN "difficulty";

-- DropEnum
DROP TYPE "CourseLevel";

-- DropEnum
DROP TYPE "DifficultyLevel";

-- CreateTable
CREATE TABLE "CourseAttachment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CourseAttachment" ADD CONSTRAINT "CourseAttachment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
