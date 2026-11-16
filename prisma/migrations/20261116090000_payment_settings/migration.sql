-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL_TRANSFER', 'MIDTRANS', 'XENDIT');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateTable
CREATE TABLE "PaymentSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL_TRANSFER',
    "mode" "PaymentMode" NOT NULL DEFAULT 'SANDBOX',
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountHolder" TEXT,
    "secretsEnc" TEXT,
    "secretHints" JSONB,
    "lastTestAt" TIMESTAMP(3),
    "lastTestOk" BOOLEAN,
    "lastTestMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "PaymentSetting_pkey" PRIMARY KEY ("id")
);

