import { PrismaClient, CommonListStatus, SourceStatus, RuleStatus, CountryCode, Currency, Verdict } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Mock fixture data must never be seeded into production. Use the reviewed administrative content workflow."
    );
  }
  if (process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Set ALLOW_DEMO_SEED=true to seed clearly labeled local demo data.");
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const databaseHost = new URL(databaseUrl).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(databaseHost)) {
    throw new Error("Demo seeds may only be loaded into a local database.");
  }

  console.log("Seeding local development / test database...");

  // Demo reference data is intentionally unverified and non-authoritative.
  await prisma.border.upsert({
    where: { id: "busia" },
    update: { deskContact: null },
    create: {
      id: "busia",
      name: "Busia (One-Stop Border Post)",
      countryFrom: CountryCode.KE,
      countryTo: CountryCode.UG,
      note: "Primary crossing for this prototype.",
      active: true,
      deskContact: null,
    },
  });

  await prisma.border.upsert({
    where: { id: "malaba" },
    update: { deskContact: null },
    create: {
      id: "malaba",
      name: "Malaba (One-Stop Border Post)",
      countryFrom: CountryCode.KE,
      countryTo: CountryCode.UG,
      note: "Second crossing; not fully covered in v0.1.",
      active: true,
      deskContact: null,
    },
  });

  // 3. Illustrative Products (Demo only)
  await prisma.product.upsert({
    where: { id: "beans" },
    update: { onCommonList: CommonListStatus.UNKNOWN },
    create: {
      id: "beans",
      officialName: "Dry beans",
      onCommonList: CommonListStatus.UNKNOWN,
      description: "Edible dried kidney beans, Phaseolus vulgaris.",
      localNames: {
        create: [
          { name: "maharagwe" },
          { name: "ebijanjaalo" },
        ],
      },
    },
  });

  await prisma.product.upsert({
    where: { id: "maize" },
    update: { onCommonList: CommonListStatus.UNKNOWN },
    create: {
      id: "maize",
      officialName: "Maize (corn) grain",
      onCommonList: CommonListStatus.UNKNOWN,
      description: "Dried maize grain for human consumption.",
      localNames: {
        create: [
          { name: "mahindi" },
          { name: "kasooli" },
        ],
      },
    },
  });

  await prisma.product.upsert({
    where: { id: "electronics" },
    update: { onCommonList: CommonListStatus.UNKNOWN },
    create: {
      id: "electronics",
      officialName: "Mobile phones and electronic accessories",
      onCommonList: CommonListStatus.UNKNOWN,
      description: "Consumer electronics; standard EAC tariff treatment applies.",
      localNames: {
        create: [
          { name: "simu" },
          { name: "masimu" },
        ],
      },
    },
  });

  // 4. Illustrative Sources
  await prisma.source.upsert({
    where: { id: "kra_msme_pack" },
    update: { status: SourceStatus.UNVERIFIED, publishedAt: null, lastVerifiedAt: null },
    create: {
      id: "kra_msme_pack",
      name: "KRA MSME Information Pack — Simplified Trade Regime (2023)",
      url: "https://kratv.kra.go.ke/wp-content/uploads/2023/10/MSME-information-Pack_CBC-2792023.pdf",
      publishedAt: null,
      lastVerifiedAt: null,
      status: SourceStatus.UNVERIFIED,
      verifiedBy: null,
      notes: "Demo reference only; verify the original before use.",
    },
  });

  await prisma.source.upsert({
    where: { id: "eac_str_guide" },
    update: { status: SourceStatus.UNVERIFIED, publishedAt: null, lastVerifiedAt: null },
    create: {
      id: "eac_str_guide",
      name: "EAC Simplified Trade Regime Implementation Manual",
      url: "https://erra.trademarkafrica.com/?p=66140",
      publishedAt: null,
      lastVerifiedAt: null,
      status: SourceStatus.UNVERIFIED,
      verifiedBy: null,
      notes: "Demo reference only; verify the original before use.",
    },
  });

  // 5. Illustrative Requirements
  await prisma.requirement.upsert({
    where: { id: "req_c17" },
    update: {},
    create: {
      id: "req_c17",
      title: "Simplified Customs Document (Form C17)",
      plainExplanation: "Single-page cross-border customs declaration for consignments under USD 2,000.",
      officialFee: "Free at the Trade Information Desk",
      whereToObtain: "Trade Information Desk at the crossing",
      sources: {
        create: [
          { sourceId: "kra_msme_pack", displayOrder: 1 },
          { sourceId: "eac_str_guide", displayOrder: 2 },
        ],
      },
    },
  });

  await prisma.requirement.upsert({
    where: { id: "req_nat_id" },
    update: {},
    create: {
      id: "req_nat_id",
      title: "Valid National ID or Passport",
      plainExplanation: "Official identification issued by your home country.",
      officialFee: "No border fee",
      whereToObtain: "Carry with you",
      sources: {
        create: [
          { sourceId: "kra_msme_pack", displayOrder: 1 },
        ],
      },
    },
  });

  // 6. Illustrative Rules
  await prisma.rule.upsert({
    where: { id_version: { id: "rule_str_ke_ug_general", version: 1 } },
    update: { status: RuleStatus.DRAFT, verifiedAt: null, verifiedBy: null },
    create: {
      id: "rule_str_ke_ug_general",
      version: 1,
      countryFrom: CountryCode.KE,
      countryTo: CountryCode.UG,
      commonList: CommonListStatus.YES,
      valueUsdAbove: 0,
      valueUsdUpTo: 2000,
      verdict: Verdict.LIKELY_STR_ELIGIBLE,
      sourceId: "kra_msme_pack",
      effectiveFrom: "2023-01-01",
      status: RuleStatus.DRAFT,
      priority: 100,
      verifiedAt: null,
      verifiedBy: null,
      requirements: {
        create: [
          { requirementId: "req_nat_id", displayOrder: 1 },
          { requirementId: "req_c17", displayOrder: 2 },
        ],
      },
    },
  });

  // 7. Exchange Rate Snapshot
  await prisma.exchangeRate.upsert({
    where: { id: "rate_kes_snapshot_demo" },
    update: {},
    create: {
      id: "rate_kes_snapshot_demo",
      currency: Currency.KES,
      ratePerUsd: 130.0,
      setAt: "2026-10-15",
      setBy: "local-demo-seed",
      illustrative: true,
    },
  });

  await prisma.exchangeRate.upsert({
    where: { id: "rate_ugx_snapshot_demo" },
    update: {},
    create: {
      id: "rate_ugx_snapshot_demo",
      currency: Currency.UGX,
      ratePerUsd: 3700.0,
      setAt: "2026-10-15",
      setBy: "local-demo-seed",
      illustrative: true,
    },
  });

  console.log("Local development database seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
