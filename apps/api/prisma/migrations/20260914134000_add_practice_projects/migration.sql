-- CreateTable
CREATE TABLE "PracticeProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeProject_userId_updatedAt_idx" ON "PracticeProject"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "PracticeProject" ADD CONSTRAINT "PracticeProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
