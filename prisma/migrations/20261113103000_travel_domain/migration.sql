-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('STAFF', 'SUPERVISOR', 'MANAGER', 'DIRECTOR');

-- CreateEnum
CREATE TYPE "FlightClass" AS ENUM ('ECONOMY', 'BUSINESS');

-- CreateEnum
CREATE TYPE "TrainClass" AS ENUM ('ECONOMY', 'BUSINESS', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "CarClass" AS ENUM ('SMALL_CAR', 'MEDIUM_MPV', 'SUV', 'PREMIUM_SEDAN');

-- CreateEnum
CREATE TYPE "TravelNeed" AS ENUM ('FLIGHT', 'TRAIN', 'HOTEL', 'CAR');

-- CreateEnum
CREATE TYPE "SppdStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'BOOKED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalKind" AS ENUM ('SUPERIOR', 'FINANCE');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DepartureStatus" AS ENUM ('OPEN', 'NEEDS_MORE', 'GUARANTEED', 'CLOSED');

-- CreateEnum
CREATE TYPE "OpenTripBookingStatus" AS ENUM ('HELD', 'CONFIRMED', 'PAID', 'CANCELLED');

-- AlterTable
-- Existing companies get a temporary unique code from their id; set the real code afterwards.
ALTER TABLE "Company" ADD COLUMN     "code" TEXT,
ADD COLUMN     "financeReviewOver" INTEGER NOT NULL DEFAULT 10000000,
ADD COLUMN     "sppdSeq" INTEGER NOT NULL DEFAULT 0;
UPDATE "Company" SET "code" = 'C-' || "id" WHERE "code" IS NULL;
ALTER TABLE "Company" ALTER COLUMN "code" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "costCentre" TEXT,
ADD COLUMN     "grade" "Grade",
ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "TravelPolicy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "grade" "Grade" NOT NULL,
    "hotelNightCap" INTEGER NOT NULL,
    "flightClass" "FlightClass" NOT NULL,
    "trainClass" "TrainClass" NOT NULL,
    "carClass" "CarClass" NOT NULL,
    "dailyAllowance" INTEGER NOT NULL,

    CONSTRAINT "TravelPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flightFare" INTEGER,
    "trainFare" INTEGER,

    CONSTRAINT "City_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
    "cityCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nightlyRate" INTEGER NOT NULL,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sppd" (
    "id" TEXT NOT NULL,
    "number" TEXT,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "destCode" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "purpose" TEXT NOT NULL,
    "needs" "TravelNeed"[],
    "status" "SppdStatus" NOT NULL DEFAULT 'DRAFT',
    "budget" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sppd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL,
    "sppdId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" "ApprovalKind" NOT NULL,
    "approverId" TEXT NOT NULL,
    "decision" "Decision" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyException" (
    "id" TEXT NOT NULL,
    "sppdId" TEXT NOT NULL,
    "category" "TravelNeed" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "decision" "Decision" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripBooking" (
    "id" TEXT NOT NULL,
    "sppdId" TEXT NOT NULL,
    "category" "TravelNeed" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "inPolicy" BOOLEAN NOT NULL,
    "policyExceptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenTrip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "durationLabel" TEXT NOT NULL,
    "pricePerPax" INTEGER NOT NULL,
    "meetingPoint" TEXT NOT NULL,
    "itinerary" TEXT[],
    "inclusions" TEXT NOT NULL,
    "terms" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OpenTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CancellationTier" (
    "id" TEXT NOT NULL,
    "openTripId" TEXT NOT NULL,
    "minDaysBefore" INTEGER NOT NULL,
    "feePercent" INTEGER NOT NULL,
    "minFee" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CancellationTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenTripDeparture" (
    "id" TEXT NOT NULL,
    "openTripId" TEXT NOT NULL,
    "departDate" DATE NOT NULL,
    "seatsLeft" INTEGER NOT NULL,
    "status" "DepartureStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "OpenTripDeparture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenTripBooking" (
    "id" TEXT NOT NULL,
    "departureId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pax" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "termsSnapshot" JSONB NOT NULL,
    "status" "OpenTripBookingStatus" NOT NULL DEFAULT 'HELD',
    "cancelledAt" TIMESTAMP(3),
    "refundAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpenTripBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TravelPolicy_companyId_grade_key" ON "TravelPolicy"("companyId", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "Hotel_cityCode_name_key" ON "Hotel"("cityCode", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Sppd_number_key" ON "Sppd"("number");

-- CreateIndex
CREATE INDEX "Sppd_companyId_status_idx" ON "Sppd"("companyId", "status");

-- CreateIndex
CREATE INDEX "Sppd_employeeId_idx" ON "Sppd"("employeeId");

-- CreateIndex
CREATE INDEX "ApprovalStep_approverId_decision_idx" ON "ApprovalStep"("approverId", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalStep_sppdId_order_key" ON "ApprovalStep"("sppdId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CancellationTier_openTripId_minDaysBefore_key" ON "CancellationTier"("openTripId", "minDaysBefore");

-- CreateIndex
CREATE UNIQUE INDEX "OpenTripDeparture_openTripId_departDate_key" ON "OpenTripDeparture"("openTripId", "departDate");

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

-- AddForeignKey
ALTER TABLE "TravelPolicy" ADD CONSTRAINT "TravelPolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hotel" ADD CONSTRAINT "Hotel_cityCode_fkey" FOREIGN KEY ("cityCode") REFERENCES "City"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sppd" ADD CONSTRAINT "Sppd_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sppd" ADD CONSTRAINT "Sppd_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sppd" ADD CONSTRAINT "Sppd_destCode_fkey" FOREIGN KEY ("destCode") REFERENCES "City"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_sppdId_fkey" FOREIGN KEY ("sppdId") REFERENCES "Sppd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyException" ADD CONSTRAINT "PolicyException_sppdId_fkey" FOREIGN KEY ("sppdId") REFERENCES "Sppd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyException" ADD CONSTRAINT "PolicyException_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripBooking" ADD CONSTRAINT "TripBooking_sppdId_fkey" FOREIGN KEY ("sppdId") REFERENCES "Sppd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripBooking" ADD CONSTRAINT "TripBooking_policyExceptionId_fkey" FOREIGN KEY ("policyExceptionId") REFERENCES "PolicyException"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationTier" ADD CONSTRAINT "CancellationTier_openTripId_fkey" FOREIGN KEY ("openTripId") REFERENCES "OpenTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenTripDeparture" ADD CONSTRAINT "OpenTripDeparture_openTripId_fkey" FOREIGN KEY ("openTripId") REFERENCES "OpenTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenTripBooking" ADD CONSTRAINT "OpenTripBooking_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "OpenTripDeparture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenTripBooking" ADD CONSTRAINT "OpenTripBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

