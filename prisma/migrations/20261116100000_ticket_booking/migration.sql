-- CreateEnum
CREATE TYPE "TicketKind" AS ENUM ('FLIGHT', 'TRAIN', 'STAY');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('AWAITING_PAYMENT', 'PAID', 'ISSUED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "TicketBooking" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "TicketKind" NOT NULL,
    "userId" TEXT NOT NULL,
    "search" JSONB NOT NULL,
    "offer" JSONB NOT NULL,
    "travelDate" DATE NOT NULL,
    "pax" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "travellerNames" TEXT[],
    "status" "TicketStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "holdExpiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paidRecordedBy" TEXT,
    "issuedRef" TEXT,
    "issuedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "refundAmount" INTEGER,
    "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NONE',
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketBooking_code_key" ON "TicketBooking"("code");

-- CreateIndex
CREATE INDEX "TicketBooking_userId_idx" ON "TicketBooking"("userId");

-- CreateIndex
CREATE INDEX "TicketBooking_status_holdExpiresAt_idx" ON "TicketBooking"("status", "holdExpiresAt");

-- AddForeignKey
ALTER TABLE "TicketBooking" ADD CONSTRAINT "TicketBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

