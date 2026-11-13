// Demo data for local development and demos, ported from prototype/business and prototype/consumer.
//
// - Budgets come from the same estimate function the app uses, never typed in (decisions §1).
// - Approval chains come from planApprovalChain (decisions §2).
// - Dates shift relative to today, or to DEMO_ANCHOR=YYYY-MM-DD if set (decisions §3).
// - Each Open Trip has its own terms and cancellation tiers (decisions §4). The tiers below are
//   placeholders until real terms are supplied per trip.
//
// Re-running the seed resets the demo company's SPPDs and the demo Open Trips. Phone numbers are fictitious.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  type CarClass,
  type DepartureStatus,
  type FlightClass,
  type Grade,
  type Role,
  type SppdStatus,
  type TrainClass,
  type TravelNeed,
} from "../src/generated/prisma/client";
import { estimateBudget } from "../src/domain/estimate";
import { planApprovalChain, type OrgPerson } from "../src/domain/approval";
import { sppdNumber } from "../src/domain/sppdNumber";
import { addDays, parseDate, shiftFrom, todayInJakarta } from "../src/domain/dates";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const anchor = process.env.DEMO_ANCHOR ? parseDate(process.env.DEMO_ANCHOR) : todayInJakarta();
/** The business prototype is written as if today were 10 October 2026. */
const biz = shiftFrom(parseDate("2026-10-10"), anchor);

// ---------- reference data (prototype/business) ----------

const POLICIES: Record<Grade, { hotelNightCap: number; flightClass: FlightClass; trainClass: TrainClass; carClass: CarClass; dailyAllowance: number }> = {
  STAFF: { hotelNightCap: 900_000, flightClass: "ECONOMY", trainClass: "EXECUTIVE", carClass: "SMALL_CAR", dailyAllowance: 350_000 },
  SUPERVISOR: { hotelNightCap: 1_200_000, flightClass: "ECONOMY", trainClass: "EXECUTIVE", carClass: "MEDIUM_MPV", dailyAllowance: 450_000 },
  MANAGER: { hotelNightCap: 1_800_000, flightClass: "ECONOMY", trainClass: "EXECUTIVE", carClass: "SUV", dailyAllowance: 600_000 },
  DIRECTOR: { hotelNightCap: 3_500_000, flightClass: "BUSINESS", trainClass: "EXECUTIVE", carClass: "PREMIUM_SEDAN", dailyAllowance: 900_000 },
};

const CITIES: { code: string; name: string; flightFare: number | null; trainFare: number | null; hotels: [string, number][] }[] = [
  { code: "SUB", name: "Surabaya", flightFare: 1_250_000, trainFare: 280_000, hotels: [["Kota Business Hotel", 650_000], ["Harmoni Suites Surabaya", 880_000], ["Grand Tunjungan Hotel", 1_150_000], ["Riverside Premier Surabaya", 1_750_000]] },
  { code: "KNO", name: "Medan", flightFare: 1_650_000, trainFare: null, hotels: [["Medan City Inn", 620_000], ["Kesawan Business Hotel", 850_000], ["Grand Deli Hotel", 1_200_000], ["Medan Royal Tower", 1_900_000]] },
  { code: "UPG", name: "Makassar", flightFare: 1_550_000, trainFare: null, hotels: [["Losari Business Inn", 600_000], ["Pantai Losari Hotel", 890_000], ["Celebes Grand Hotel", 1_250_000], ["Makassar Harbour Suites", 1_650_000]] },
  { code: "DPS", name: "Denpasar", flightFare: 1_350_000, trainFare: null, hotels: [["Renon Business Hotel", 700_000], ["Sanur Garden Hotel", 900_000], ["Nusa Dua Bay Resort", 1_600_000], ["Jimbaran Cliff Resort", 3_200_000]] },
  { code: "BPN", name: "Balikpapan", flightFare: 1_700_000, trainFare: null, hotels: [["Balikpapan City Hotel", 750_000], ["Teluk Business Hotel", 890_000], ["Borneo Grand Hotel", 1_100_000], ["Klandasan Bay Suites", 1_950_000]] },
  { code: "BDO", name: "Bandung", flightFare: null, trainFare: 250_000, hotels: [["Braga Business Inn", 550_000], ["Dago Hills Hotel", 820_000], ["Priangan Grand Hotel", 950_000], ["Lembang Retreat Resort", 1_600_000]] },
  { code: "YIA", name: "Yogyakarta", flightFare: 950_000, trainFare: 320_000, hotels: [["Malioboro Business Inn", 580_000], ["Kraton Heritage Hotel", 860_000], ["Prambanan Grand Hotel", 1_150_000], ["Merapi View Resort", 1_700_000]] },
];

const DEPARTMENTS = ["Management", "Sales", "Operations", "Finance", "IT"] as const;

type Key = "E1" | "E2" | "E3" | "E4" | "E5" | "E6" | "E7" | "E8";
const PEOPLE: { key: Key; phone: string; name: string; title: string; grade: Grade; role: Role; dept: (typeof DEPARTMENTS)[number]; cc: string; manager: Key | null }[] = [
  { key: "E7", phone: "+6281100000004", name: "Andi Kurniawan", title: "Managing Director", grade: "DIRECTOR", role: "MANAGER", dept: "Management", cc: "BOD-HO", manager: null },
  { key: "E3", phone: "+6281100000002", name: "Budi Santoso", title: "Sales Manager", grade: "MANAGER", role: "MANAGER", dept: "Sales", cc: "SLS-JKT", manager: "E7" },
  { key: "E5", phone: "+6281100000007", name: "Hendra Wijaya", title: "Operations Manager", grade: "MANAGER", role: "MANAGER", dept: "Operations", cc: "OPS-SBY", manager: "E7" },
  { key: "E1", phone: "+6281100000001", name: "Rina Putri", title: "Sales Executive", grade: "STAFF", role: "EMPLOYEE", dept: "Sales", cc: "SLS-JKT", manager: "E3" },
  { key: "E2", phone: "+6281100000005", name: "Dimas Pratama", title: "Account Executive", grade: "STAFF", role: "EMPLOYEE", dept: "Sales", cc: "SLS-JKT", manager: "E3" },
  { key: "E4", phone: "+6281100000006", name: "Ayu Lestari", title: "Supply Chain Supervisor", grade: "SUPERVISOR", role: "EMPLOYEE", dept: "Operations", cc: "OPS-SBY", manager: "E5" },
  { key: "E6", phone: "+6281100000003", name: "Sari Wulandari", title: "Finance and Travel Admin", grade: "STAFF", role: "FINANCE_ADMIN", dept: "Finance", cc: "FIN-HO", manager: "E7" },
  { key: "E8", phone: "+6281100000008", name: "Fajar Nugroho", title: "IT Engineer", grade: "STAFF", role: "EMPLOYEE", dept: "IT", cc: "IT-HO", manager: "E5" },
];

/** SPPDs from the prototype. `approvedOn` is when every step was approved; null = still waiting. */
const SPPDS: { emp: Key; dest: string; from: string; to: string; purpose: string; needs: TravelNeed[]; status: SppdStatus; submittedOn: string; approvedOn: string | null;
  bookings?: [TravelNeed, string, number, boolean?][]; exception?: { category: TravelNeed; amount: number; reason: string; by: Key; on: string } }[] = [
  { emp: "E2", dest: "SUB", from: "2026-10-01", to: "2026-10-02", purpose: "Quarterly review with key distributor", needs: ["FLIGHT", "HOTEL", "CAR"], status: "COMPLETED", submittedOn: "2026-09-24", approvedOn: "2026-09-24",
    bookings: [["FLIGHT", "[Airline B] CGK-SUB return, Economy", 2_500_000], ["HOTEL", "Harmoni Suites Surabaya, 1 night", 880_000], ["CAR", "Small car with driver, 1 day", 400_000]] },
  { emp: "E7", dest: "DPS", from: "2026-10-03", to: "2026-10-05", purpose: "Regional partner summit", needs: ["FLIGHT", "HOTEL", "CAR"], status: "COMPLETED", submittedOn: "2026-09-22", approvedOn: "2026-09-23",
    bookings: [["FLIGHT", "[Airline A] CGK-DPS return, Business", 7_020_000], ["HOTEL", "Jimbaran Cliff Resort, 2 nights", 6_400_000], ["CAR", "Premium sedan with driver, 2 days", 2_800_000]] },
  { emp: "E4", dest: "BPN", from: "2026-10-06", to: "2026-10-08", purpose: "Warehouse audit, Balikpapan hub", needs: ["FLIGHT", "HOTEL", "CAR"], status: "COMPLETED", submittedOn: "2026-09-28", approvedOn: "2026-09-29",
    bookings: [["FLIGHT", "[Airline C] CGK-BPN return, Economy", 3_400_000], ["HOTEL", "Borneo Grand Hotel, 2 nights", 2_200_000], ["CAR", "Medium MPV with driver, 2 days", 1_200_000]] },
  { emp: "E8", dest: "BDO", from: "2026-10-07", to: "2026-10-08", purpose: "Server room migration at Bandung branch", needs: ["TRAIN", "HOTEL"], status: "COMPLETED", submittedOn: "2026-10-01", approvedOn: "2026-10-01",
    bookings: [["TRAIN", "Executive, Gambir-Bandung return", 500_000], ["HOTEL", "Priangan Grand Hotel, 1 night", 950_000, false]],
    exception: { category: "HOTEL", amount: 950_000, reason: "Hotel Rp 950.000 per night allowed: only hotel near the branch", by: "E7", on: "2026-10-02" } },
  { emp: "E3", dest: "UPG", from: "2026-10-13", to: "2026-10-15", purpose: "Key account visit, Makassar", needs: ["FLIGHT", "HOTEL"], status: "BOOKED", submittedOn: "2026-10-05", approvedOn: "2026-10-06",
    bookings: [["FLIGHT", "[Airline C] CGK-UPG return, Economy", 3_100_000], ["HOTEL", "Makassar Harbour Suites, 2 nights", 3_300_000]] },
  { emp: "E1", dest: "SUB", from: "2026-10-15", to: "2026-10-17", purpose: "Distributor onboarding and product training", needs: ["FLIGHT", "HOTEL", "CAR"], status: "APPROVED", submittedOn: "2026-10-08", approvedOn: "2026-10-08" },
  { emp: "E2", dest: "KNO", from: "2026-10-20", to: "2026-10-22", purpose: "New distributor visit, Medan", needs: ["FLIGHT", "HOTEL", "CAR"], status: "PENDING_APPROVAL", submittedOn: "2026-10-09", approvedOn: null },
];

// ---------- Open Trips (prototype/consumer; departures are days from today) ----------

const PLACEHOLDER_TERMS = (name: string) =>
  `Syarat dan ketentuan ${name} (contoh, belum final).\n` +
  "- Kursi terkunci setelah uang muka 30% diterima.\n" +
  "- Pelunasan paling lambat 14 hari sebelum keberangkatan.\n" +
  "- Biaya pembatalan mengikuti tabel di bawah; pembatalan lebih dekat dari tingkat terakhir dikenai 100%.\n" +
  "- Jadwal dapat berubah karena cuaca atau keputusan otoritas setempat.";
/** Placeholder schedule so the demo has something to show; each trip will get its own real tiers. */
const PLACEHOLDER_TIERS = [
  { minDaysBefore: 30, feePercent: 10, minFee: 0 },
  { minDaysBefore: 14, feePercent: 50, minFee: 0 },
  { minDaysBefore: 7, feePercent: 75, minFee: 0 },
];
const STATUS: Record<string, DepartureStatus> = { Guaranteed: "GUARANTEED", Open: "OPEN" };

const TRIPS = [
  { id: "lbj", name: "Labuan Bajo Sailing Trip", place: "Labuan Bajo, NTT", category: "island", durationLabel: "3D2N", pricePerPax: 2_450_000, meetingPoint: "Komodo Airport (LBJ), 09.00 WITA",
    deps: [[47, 6, "Guaranteed"], [54, 12, "Guaranteed"], [68, 14, "Open"]],
    itinerary: ["Kelor Island, Manjarite snorkeling, sunset at Kalong Island", "Padar Island sunrise, Pink Beach, Komodo National Park", "Taka Makassar, Manta Point, back to Labuan Bajo"],
    inclusions: "Phinisi boat cabin, 7 meals, park fees, snorkel gear, trip leader" },
  { id: "bromo", name: "Bromo and Ijen Crater", place: "East Java", category: "mountain", durationLabel: "3D2N", pricePerPax: 1_650_000, meetingPoint: "Malang station, 22.00 WIB",
    deps: [[24, 11, "Needs 4 more"], [38, 16, "Open"]],
    itinerary: ["Jeep to Penanjakan for sunrise, Bromo crater, Savana", "Drive to Banyuwangi, rest at homestay", "Midnight hike to Ijen blue fire, back to Surabaya"],
    inclusions: "Jeep, homestay, 5 meals, entrance tickets, gas mask, guide" },
  { id: "raja", name: "Raja Ampat Explorer", place: "West Papua", category: "diving", durationLabel: "5D4N", pricePerPax: 7_900_000, meetingPoint: "Sorong Airport (SOQ), 10.00 WIT",
    deps: [[68, 3, "Guaranteed"], [96, 10, "Open"]],
    itinerary: ["Ferry to Waisai, homestay check-in", "Piaynemo viewpoint, Telaga Bintang", "Arborek village, manta snorkeling", "Friwen wall, Pasir Timbul sandbar", "Back to Sorong"],
    inclusions: "Speedboat, homestay, 13 meals, marine park fee, trip leader" },
  { id: "karimun", name: "Karimunjawa Island Hopping", place: "Central Java", category: "island", durationLabel: "4D3N", pricePerPax: 1_950_000, meetingPoint: "Kartini Port, Jepara, 07.00 WIB",
    deps: [[91, 12, "Open"]],
    itinerary: ["Ferry from Jepara, sunset at Tanjung Gelam", "Menjangan Kecil, Cemara Besar snorkeling", "Shark pond, Bukit Joko Tuo", "Ferry back to Jepara"],
    inclusions: "Ferry, homestay, boat, 9 meals, snorkel gear" },
  { id: "dieng", name: "Dieng Plateau Sunrise", place: "Central Java", category: "mountain", durationLabel: "2D1N", pricePerPax: 950_000, meetingPoint: "Wonosobo, 13.00 WIB",
    deps: [[10, 5, "Guaranteed"], [31, 14, "Open"]],
    itinerary: ["Arjuna temples, Kawah Sikidang, Telaga Warna", "Sikunir sunrise, Batu Ratapan Angin, back to Wonosobo"],
    inclusions: "Homestay, 3 meals, entrance tickets, local guide" },
  { id: "tidung", name: "Pulau Tidung Weekend", place: "Thousand Islands, Jakarta", category: "weekend", durationLabel: "2D1N", pricePerPax: 750_000, meetingPoint: "Kali Adem Port, 06.30 WIB",
    deps: [[19, 20, "Guaranteed"], [26, 20, "Open"]],
    itinerary: ["Speedboat to Tidung, Love Bridge, snorkeling", "Sunrise, bike around the island, back to Jakarta"],
    inclusions: "Speedboat, homestay, 4 meals, bike, snorkel gear" },
] as const;

async function seedCompany() {
  const company = await db.company.upsert({
    where: { id: "demo-company" },
    update: { name: "PT Nusantara Trading Indonesia", code: "NTI" },
    create: { id: "demo-company", name: "PT Nusantara Trading Indonesia", code: "NTI" },
  });

  for (const [grade, p] of Object.entries(POLICIES) as [Grade, (typeof POLICIES)[Grade]][]) {
    await db.travelPolicy.upsert({ where: { companyId_grade: { companyId: company.id, grade } }, update: p, create: { companyId: company.id, grade, ...p } });
  }
  for (const c of CITIES) {
    const data = { name: c.name, flightFare: c.flightFare, trainFare: c.trainFare };
    await db.city.upsert({ where: { code: c.code }, update: data, create: { code: c.code, ...data } });
    for (const [name, nightlyRate] of c.hotels) {
      await db.hotel.upsert({ where: { cityCode_name: { cityCode: c.code, name } }, update: { nightlyRate }, create: { cityCode: c.code, name, nightlyRate } });
    }
  }
  const depts = new Map<string, string>();
  for (const name of DEPARTMENTS) {
    const d = await db.department.upsert({ where: { companyId_name: { companyId: company.id, name } }, update: {}, create: { companyId: company.id, name } });
    depts.set(name, d.id);
  }

  // Managers first (PEOPLE is ordered top-down), so managerId always points at an existing row.
  const ids = new Map<Key, string>();
  for (const p of PEOPLE) {
    const data = { name: p.name, title: p.title, grade: p.grade, role: p.role, costCentre: p.cc, companyId: company.id, departmentId: depts.get(p.dept)!, managerId: p.manager ? ids.get(p.manager)! : null };
    const u = await db.user.upsert({ where: { phone: p.phone }, update: data, create: { phone: p.phone, ...data } });
    ids.set(p.key, u.id);
  }
  const org = new Map<string, OrgPerson>(
    PEOPLE.map((p) => [ids.get(p.key)!, { id: ids.get(p.key)!, grade: p.grade, managerId: p.manager ? ids.get(p.manager)! : null, isFinanceAdmin: p.role === "FINANCE_ADMIN" }]),
  );

  // Reset and rebuild SPPDs (cascades to steps, bookings and exceptions).
  await db.sppd.deleteMany({ where: { companyId: company.id } });
  let seq = 40; // prototype numbers start at 041
  for (const s of SPPDS) {
    const person = PEOPLE.find((p) => p.key === s.emp)!;
    const city = CITIES.find((c) => c.code === s.dest)!;
    const start = biz(s.from), end = biz(s.to);
    const budget = estimateBudget(POLICIES[person.grade], city, start, end, s.needs).total;
    const chain = planApprovalChain(ids.get(s.emp)!, org, budget, company.financeReviewOver);
    const approvedOn = s.approvedOn ? biz(s.approvedOn) : null;
    const sppd = await db.sppd.create({
      data: {
        companyId: company.id, employeeId: ids.get(s.emp)!, destCode: s.dest, startDate: start, endDate: end,
        purpose: s.purpose, needs: s.needs, status: s.status, budget, submittedAt: biz(s.submittedOn),
        number: approvedOn ? sppdNumber(++seq, company.code, approvedOn) : null,
        steps: { create: chain.map((c) => ({ order: c.order, kind: c.kind, approverId: c.approverId, decision: approvedOn ? "APPROVED" : "PENDING", decidedAt: approvedOn })) },
      },
    });
    const ex = s.exception
      ? await db.policyException.create({ data: { sppdId: sppd.id, category: s.exception.category, amount: s.exception.amount, reason: s.exception.reason, decision: "APPROVED", decidedById: ids.get(s.exception.by)!, decidedAt: biz(s.exception.on) } })
      : null;
    for (const [category, description, amount, inPolicy = true] of s.bookings ?? []) {
      await db.tripBooking.create({ data: { sppdId: sppd.id, category, description, amount, inPolicy, policyExceptionId: !inPolicy && ex?.category === category ? ex.id : null } });
    }
  }
  await db.company.update({ where: { id: company.id }, data: { sppdSeq: seq } });
  return { company, sppds: SPPDS.length, people: PEOPLE.length };
}

async function seedOpenTrips() {
  const ids = TRIPS.map((t) => t.id);
  await db.openTripBooking.deleteMany({ where: { departure: { openTripId: { in: [...ids] } } } });
  for (const t of TRIPS) {
    const data = { name: t.name, place: t.place, category: t.category, durationLabel: t.durationLabel, pricePerPax: t.pricePerPax, meetingPoint: t.meetingPoint,
      itinerary: [...t.itinerary], inclusions: t.inclusions, terms: PLACEHOLDER_TERMS(t.name), active: true };
    await db.openTrip.upsert({ where: { id: t.id }, update: data, create: { id: t.id, ...data } });
    await db.cancellationTier.deleteMany({ where: { openTripId: t.id } });
    await db.cancellationTier.createMany({ data: PLACEHOLDER_TIERS.map((x) => ({ openTripId: t.id, ...x })) });
    await db.openTripDeparture.deleteMany({ where: { openTripId: t.id } });
    await db.openTripDeparture.createMany({
      data: t.deps.map(([days, seatsLeft, label]) => ({ openTripId: t.id, departDate: addDays(anchor, days), seatsLeft, status: STATUS[label] ?? "NEEDS_MORE" })),
    });
  }
  return TRIPS.length;
}

async function main() {
  const { company, sppds, people } = await seedCompany();
  const trips = await seedOpenTrips();
  console.log(`Seeded ${company.name}: ${people} people, ${sppds} SPPDs; ${trips} Open Trips. Dates anchored to ${anchor.toISOString().slice(0, 10)}.`);
}

main().finally(() => db.$disconnect());
