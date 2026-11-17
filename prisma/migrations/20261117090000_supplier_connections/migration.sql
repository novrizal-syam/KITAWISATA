-- AlterTable
ALTER TABLE "PlatformSetting" ADD COLUMN     "flightSupplierId" TEXT,
ADD COLUMN     "staySupplierId" TEXT,
ADD COLUMN     "trainSupplierId" TEXT;

-- AlterTable
ALTER TABLE "TicketBooking" ADD COLUMN     "supplierId" TEXT NOT NULL DEFAULT 'sample';

-- CreateTable
CREATE TABLE "SupplierConnection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "kinds" "TicketKind"[],
    "apiKeyEnc" TEXT,
    "apiKeyHint" TEXT,
    "canIssue" BOOLEAN NOT NULL DEFAULT false,
    "lastTestAt" TIMESTAMP(3),
    "lastTestOk" BOOLEAN,
    "lastTestMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SupplierConnection_pkey" PRIMARY KEY ("id")
);

