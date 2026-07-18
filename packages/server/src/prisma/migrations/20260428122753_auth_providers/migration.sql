/*
  Warnings:

  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AuthProviderType" AS ENUM ('EMAIL', 'PHONE', 'TELEGRAM');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "password",
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TelegramVerification" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "telegramId" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthProvider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AuthProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramVerification_code_key" ON "TelegramVerification"("code");

-- CreateIndex
CREATE INDEX "TelegramVerification_code_idx" ON "TelegramVerification"("code");

-- CreateIndex
CREATE INDEX "TelegramVerification_expiresAt_idx" ON "TelegramVerification"("expiresAt");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "AuthProvider" ADD CONSTRAINT "AuthProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
