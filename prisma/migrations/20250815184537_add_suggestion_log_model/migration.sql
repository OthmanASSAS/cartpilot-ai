-- CreateTable
CREATE TABLE "public"."SuggestionLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "cartToken" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuggestionLog_pkey" PRIMARY KEY ("id")
);
