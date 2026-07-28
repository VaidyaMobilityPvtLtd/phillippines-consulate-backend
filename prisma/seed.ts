import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const newsItems = [
  {
    slug: "office-hours-reminder",
    title: "Consular office hours reminder",
    date: new Date("2026-01-15"),
    category: "Notice" as const,
    summary:
      "The Consulate General in Kathmandu receives clients Monday to Friday, 9:00 AM – 3:00 PM, with lunch break from 1:00 – 2:00 PM.",
    body: [
      "Please plan your visit within regular office hours. The Consulate is closed on Philippine and Nepali public holidays.",
      "For visa, passport, and civil registration inquiries, you may also email philcongen@voith.com.np or call +977-1-4008801 to 05.",
    ],
    published: true,
  },
  {
    slug: "passport-application-guidance",
    title: "Passport applications — personal appearance required",
    date: new Date("2025-11-20"),
    category: "Advisory" as const,
    summary:
      "All first-time, renewal, and lost-passport applicants must appear in person with complete documentary requirements.",
    body: [
      "Bring original documents and photocopies. Incomplete applications may delay processing.",
      "Passport fees are payable via deposit to Standard Chartered Bank Nepal Limited (A/C 01-0209171-01).",
      "See Passport Services for full requirement checklists.",
    ],
    published: true,
  },
  {
    slug: "visa-entry-reminder",
    title: "Visa and entry requirements for the Philippines",
    date: new Date("2025-09-08"),
    category: "Advisory" as const,
    summary:
      "Travelers should confirm visa-free eligibility, passport validity (at least six months), and supporting documents before departure.",
    body: [
      "Nationals of visa-free countries may generally stay up to 21 days for tourism or business, subject to immigration rules.",
      "Longer stays or other purposes require a visa from the Consulate before travel.",
      "Review Visa & Migration for categories, fees, and country lists.",
    ],
    published: true,
  },
  {
    slug: "civil-registration-abroad",
    title: "Report of birth, marriage, and death abroad",
    date: new Date("2025-06-12"),
    category: "Announcement" as const,
    summary:
      "Filipino nationals may report births, marriages, and deaths that occurred abroad through the Consulate's registration services.",
    body: [
      "Timely reporting helps ensure civil registry records with the Philippine Statistics Authority.",
      "Contact the Consulate for forms and supporting document checklists.",
    ],
    published: true,
  },
];

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to seed");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name },
  });

  for (const item of newsItems) {
    await prisma.news.upsert({
      where: { slug: item.slug },
      update: item,
      create: item,
    });
  }

  console.log("Seed complete: admin + news");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
