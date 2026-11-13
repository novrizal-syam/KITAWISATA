// Demo organisation for the business portal. Phone numbers are fictitious.
// Travel data (SPPDs, budgets, bookings) is added in Phase 2 once the demo-date strategy is decided.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const company = await db.company.upsert({
    where: { id: "demo-company" },
    update: {},
    create: { id: "demo-company", name: "PT Demo Nusantara" },
  });
  const dept = await db.department.upsert({
    where: { companyId_name: { companyId: company.id, name: "Sales" } },
    update: {},
    create: { companyId: company.id, name: "Sales" },
  });
  const base = { companyId: company.id, departmentId: dept.id };
  const sari = await db.user.upsert({
    where: { phone: "+6281100000003" }, update: {},
    create: { ...base, phone: "+6281100000003", name: "Sari", role: "FINANCE_ADMIN" },
  });
  const budi = await db.user.upsert({
    where: { phone: "+6281100000002" }, update: {},
    create: { ...base, phone: "+6281100000002", name: "Budi", role: "MANAGER" },
  });
  await db.user.upsert({
    where: { phone: "+6281100000001" }, update: {},
    create: { ...base, phone: "+6281100000001", name: "Rina", role: "EMPLOYEE", managerId: budi.id },
  });
  console.log(`Seeded ${company.name}: Rina (EMPLOYEE -> Budi), Budi (MANAGER), Sari (FINANCE_ADMIN, id ${sari.id})`);
}

main().finally(() => db.$disconnect());
