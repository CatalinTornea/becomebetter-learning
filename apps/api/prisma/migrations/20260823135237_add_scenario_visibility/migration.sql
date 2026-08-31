-- CreateEnum
CREATE TYPE "ScenarioVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "visibility" "ScenarioVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
