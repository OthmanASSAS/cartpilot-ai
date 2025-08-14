-- CreateEnum
CREATE TYPE "public"."LeadSource" AS ENUM ('LANDING', 'LINKEDIN', 'MANUAL', 'OTHER');

-- CreateTable
CREATE TABLE "public"."Lead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "boutiqueName" TEXT NOT NULL,
    "shopUrl" TEXT,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "source" "public"."LeadSource" NOT NULL DEFAULT 'LANDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_email_key" ON "public"."Lead"("email");
