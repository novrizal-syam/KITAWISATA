-- CreateEnum
CREATE TYPE "PaymentPlan" AS ENUM ('SPLIT', 'FULL');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NONE', 'PENDING', 'REFUNDED');

-- AlterEnum
ALTER TYPE "OpenTripBookingStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "OpenTrip" ADD COLUMN     "image" TEXT NOT NULL DEFAULT 'beach';

-- AlterTable
ALTER TABLE "OpenTripBooking" ADD COLUMN     "cancellationFee" INTEGER,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "contactName" TEXT NOT NULL,
ADD COLUMN     "contactPhone" TEXT NOT NULL,
ADD COLUMN     "holdExpiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "plan" "PaymentPlan" NOT NULL,
ADD COLUMN     "pricePerPax" INTEGER NOT NULL,
ADD COLUMN     "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "travellerNames" TEXT[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PlatformSetting" ADD COLUMN     "seatHoldMinutes" INTEGER NOT NULL DEFAULT 1440;

-- CreateTable
CREATE TABLE "OpenTripInstalment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "percent" INTEGER NOT NULL,
    "dueOn" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paidRecordedBy" TEXT,

    CONSTRAINT "OpenTripInstalment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OpenTripInstalment_bookingId_seq_key" ON "OpenTripInstalment"("bookingId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "OpenTripBooking_code_key" ON "OpenTripBooking"("code");

-- CreateIndex
CREATE INDEX "OpenTripBooking_userId_idx" ON "OpenTripBooking"("userId");

-- CreateIndex
CREATE INDEX "OpenTripBooking_status_holdExpiresAt_idx" ON "OpenTripBooking"("status", "holdExpiresAt");

-- AddForeignKey
ALTER TABLE "OpenTripInstalment" ADD CONSTRAINT "OpenTripInstalment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "OpenTripBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

