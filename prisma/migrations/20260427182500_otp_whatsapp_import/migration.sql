-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "normalizedPhoneNumber" TEXT;
ALTER TABLE "Participant" ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Participant" ADD COLUMN "googleId" TEXT;
ALTER TABLE "Participant" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Participant" ALTER COLUMN "email" DROP NOT NULL;
UPDATE "Participant"
SET "normalizedPhoneNumber" = CASE
    WHEN regexp_replace("phone", '\D', '', 'g') LIKE '0%' THEN '62' || substring(regexp_replace("phone", '\D', '', 'g') from 2)
    WHEN regexp_replace("phone", '\D', '', 'g') LIKE '8%' THEN '62' || regexp_replace("phone", '\D', '', 'g')
    ELSE regexp_replace("phone", '\D', '', 'g')
  END,
  "phoneVerified" = true;
ALTER TABLE "Participant" ALTER COLUMN "normalizedPhoneNumber" SET NOT NULL;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Option" ADD COLUMN "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Package" ADD COLUMN "code" TEXT;
UPDATE "Package" SET "code" = 'PKG-' || upper(substring("id" from 1 for 8)) WHERE "code" IS NULL;
ALTER TABLE "Package" ALTER COLUMN "code" SET NOT NULL;

-- AlterTable
ALTER TABLE "ExamSession" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "ExamSession" ADD COLUMN "currentQuestionId" TEXT;
ALTER TABLE "ExamSession" ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "ExamSession" SET "expiresAt" = "startedAt" + ("durationMinutes" * interval '1 minute') WHERE "expiresAt" IS NULL;

-- AlterTable
ALTER TABLE "Answer" ADD COLUMN "isMarkedDoubt" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTER', 'LOGIN', 'VERIFY_PHONE', 'LINK_PHONE');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "AttemptActivityEventType" AS ENUM ('TAB_BLUR', 'TAB_FOCUS', 'WINDOW_CLOSE', 'VISIBILITY_HIDDEN', 'VISIBILITY_VISIBLE', 'HEARTBEAT', 'ANSWER_SAVED', 'SUBMIT');

-- CreateEnum
CREATE TYPE "ImportSessionStatus" AS ENUM ('PREVIEW', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "participantId" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "normalizedPhoneNumber" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppSetting" (
    "id" TEXT NOT NULL,
    "senderId" TEXT,
    "apiKeyEncrypted" TEXT,
    "urlEndpoint" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "loginOtpTemplate" TEXT NOT NULL DEFAULT 'Kode OTP login CAT Anda adalah {{code}}. Berlaku selama {{minutes}} menit. Jangan berikan kode ini kepada siapa pun.',
    "registrationOtpTemplate" TEXT NOT NULL DEFAULT 'Kode OTP registrasi CAT Anda adalah {{code}}. Berlaku selama {{minutes}} menit. Jangan berikan kode ini kepada siapa pun.',
    "verifyPhoneOtpTemplate" TEXT NOT NULL DEFAULT 'Kode verifikasi nomor WhatsApp Anda adalah {{code}}. Berlaku selama {{minutes}} menit. Jangan berikan kode ini kepada siapa pun.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessageLog" (
    "id" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "normalizedPhoneNumber" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptActivityLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" "AttemptActivityEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportSession" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "examCode" TEXT,
    "status" "ImportSessionStatus" NOT NULL DEFAULT 'PREVIEW',
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successfulRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "previewData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedQuestion" (
    "id" TEXT NOT NULL,
    "importSessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportedQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Participant_normalizedPhoneNumber_key" ON "Participant"("normalizedPhoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_googleId_key" ON "Participant"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Package_code_key" ON "Package"("code");

-- CreateIndex
CREATE INDEX "OtpCode_normalizedPhoneNumber_purpose_createdAt_idx" ON "OtpCode"("normalizedPhoneNumber", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "OtpCode_participantId_idx" ON "OtpCode"("participantId");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_normalizedPhoneNumber_createdAt_idx" ON "WhatsAppMessageLog"("normalizedPhoneNumber", "createdAt");

-- CreateIndex
CREATE INDEX "ExamSession_status_idx" ON "ExamSession"("status");

-- CreateIndex
CREATE INDEX "AttemptActivityLog_sessionId_createdAt_idx" ON "AttemptActivityLog"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportSession_adminId_createdAt_idx" ON "ImportSession"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportedQuestion_importSessionId_idx" ON "ImportedQuestion"("importSessionId");

-- CreateIndex
CREATE INDEX "ImportedQuestion_questionId_idx" ON "ImportedQuestion"("questionId");

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptActivityLog" ADD CONSTRAINT "AttemptActivityLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportSession" ADD CONSTRAINT "ImportSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedQuestion" ADD CONSTRAINT "ImportedQuestion_importSessionId_fkey" FOREIGN KEY ("importSessionId") REFERENCES "ImportSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedQuestion" ADD CONSTRAINT "ImportedQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
