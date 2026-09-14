-- CreateTable
CREATE TABLE "PdcaEvaluation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectName" TEXT,
    "rowSignature" TEXT NOT NULL,
    "rowData" JSONB NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "generalFeedback" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdcaEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdcaColumnScore" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "column" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,

    CONSTRAINT "PdcaColumnScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PdcaEvaluation_userId_rowSignature_key" ON "PdcaEvaluation"("userId", "rowSignature");

-- CreateIndex
CREATE UNIQUE INDEX "PdcaColumnScore_evaluationId_column_key" ON "PdcaColumnScore"("evaluationId", "column");

-- AddForeignKey
ALTER TABLE "PdcaEvaluation" ADD CONSTRAINT "PdcaEvaluation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdcaColumnScore" ADD CONSTRAINT "PdcaColumnScore_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "PdcaEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
