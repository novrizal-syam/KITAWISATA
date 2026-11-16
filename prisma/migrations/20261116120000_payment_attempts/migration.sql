-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('PENDING', 'PAID', 'PAID_UNAPPLIED', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "redirectUrl" TEXT,
    "openTripInstalmentId" TEXT,
    "ticketBookingId" TEXT,
    "userId" TEXT NOT NULL,
    "lastEvent" JSONB,
    "note" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_orderId_key" ON "PaymentAttempt"("orderId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_status_idx" ON "PaymentAttempt"("status");

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_openTripInstalmentId_fkey" FOREIGN KEY ("openTripInstalmentId") REFERENCES "OpenTripInstalment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_ticketBookingId_fkey" FOREIGN KEY ("ticketBookingId") REFERENCES "TicketBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

