// Demo organisation for the business portal. Phone numbers are fictitious.
// Travel data (SPPDs, budgets, bookings) is added in Phase 2 once the demo-date strategy is decided.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  // Names, titles and reporting lines follow prototype/business/index.html.
  const company = await db.company.upsert({
    where: { id: "demo-company" },
    update: { name: "PT Nusantara Trading Indonesia" },
    create: { id: "demo-company", name: "PT Nusantara Trading Indonesia" },
  });
  const dept = async (name: string) =>
    db.department.upsert({
      where: { companyId_name: { companyId: company.id, name } },
      update: {},
      create: { companyId: company.id, name },
    });
  const [mgmt, sales, finance] = [await dept("Management"), await dept("Sales"), await dept("Finance")];
  const person = (phone: string, name: string, role: Role, departmentId: string, managerId: string | null) =>
    db.user.upsert({
      where: { phone },
      update: { name, role, departmentId, managerId, companyId: company.id },
      create: { phone, name, role, departmentId, managerId, companyId: company.id },
    });
  // Top of every approval chain (Managing Director).
  const andi = await person("+6281100000004", "Andi Kurniawan", "MANAGER", mgmt.id, null);
  const budi = await person("+6281100000002", "Budi Santoso", "MANAGER", sales.id, andi.id);
  await person("+6281100000001", "Rina Putri", "EMPLOYEE", sales.id, budi.id);
  await person("+6281100000003", "Sari Wulandari", "FINANCE_ADMIN", finance.id, andi.id);
  console.log(`Seeded ${company.name}: Rina -> Budi -> Andi (Director), Sari (Finance)`);
}

main().finally(() => db.$disconnect());
