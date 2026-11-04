import "dotenv/config";
import {
  PrismaClient,
  CountryCode,
  SourceStatus,
} from "@prisma/client";

const prisma = new PrismaClient();
const referenceNote =
  "Supports the existence, name, and Kenya–Uganda country pairing of the Busia OSBP only; it does not establish product-specific customs rules.";

const references = [
  {
    id: "busia_kra_entry_exit",
    name: "KRA: Gazetted Points of Entry and Exit into the Kenya Border Points",
    url: "https://www.kra.go.ke/individual/1891-gazetted-points-of-entry-and-exit-into-the-kenya-border-points",
    notes:
      "The KRA page lists Busia OSBPs among Kenya's land borders. " + referenceNote,
  },
  {
    id: "busia_ura_osbp",
    name: "URA: One Stop Border Post",
    url: "https://ura.go.ug/en/import-export/one-stop-border-post/",
    notes:
      "The URA page lists Busia (Uganda–Kenya) among Uganda's OSBPs. " + referenceNote,
  },
  {
    id: "busia_eac_osbp_launch",
    name: "EAC: Busia One Stop Border Post launch",
    url: "https://www.eac.int/press-releases?option=com_content&view=article&id=1002:congratulatory-note-to-hon-dr-stergomena-lawrence-tax-&catid=48:eac-latest&Itemid=69",
    notes:
      "The EAC release describes the Busia OSBP as located on the Kenya/Uganda border. " + referenceNote,
  },
] as const;

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Reference seed data must never be run in production.");
  }
  if (process.env.ALLOW_REFERENCE_SEED !== "true") {
    throw new Error("Set ALLOW_REFERENCE_SEED=true to seed official border references.");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const databaseHost = new URL(databaseUrl).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(databaseHost)) {
    throw new Error("Reference seed data may only be loaded into a local database.");
  }

  await prisma.$transaction(async (transaction) => {
    const existingBorder = await transaction.border.findUnique({
      where: { id: "busia" },
    });
    if (
      existingBorder &&
      (existingBorder.name !== "Busia" ||
        existingBorder.countryFrom !== CountryCode.KE ||
        existingBorder.countryTo !== CountryCode.UG ||
        !existingBorder.active)
    ) {
      throw new Error("Existing busia border record differs; refusing to overwrite it.");
    }

    if (!existingBorder) {
      await transaction.border.create({
        data: {
          id: "busia",
          name: "Busia",
          countryFrom: CountryCode.KE,
          countryTo: CountryCode.UG,
          active: true,
          deskContact: null,
          note: referenceNote,
        },
      });
    }

    for (const [displayOrder, reference] of references.entries()) {
      const existingSource = await transaction.source.findUnique({
        where: { id: reference.id },
      });
      if (
        existingSource &&
        (existingSource.name !== reference.name ||
          existingSource.url !== reference.url ||
          existingSource.status !== SourceStatus.UNVERIFIED ||
          existingSource.notes !== reference.notes)
      ) {
        throw new Error(
          `Existing source ${reference.id} differs; refusing to overwrite it.`,
        );
      }

      if (!existingSource) {
        await transaction.source.create({
          data: {
            id: reference.id,
            name: reference.name,
            url: reference.url,
            status: SourceStatus.UNVERIFIED,
            notes: reference.notes,
          },
        });
      }

      const existingLink = await transaction.borderSource.findUnique({
        where: {
          borderId_sourceId: { borderId: "busia", sourceId: reference.id },
        },
      });
      if (existingLink && existingLink.note !== referenceNote) {
        throw new Error(
          `Existing Busia source link ${reference.id} differs; refusing to overwrite it.`,
        );
      }

      if (!existingLink) {
        await transaction.borderSource.create({
          data: {
            borderId: "busia",
            sourceId: reference.id,
            note: referenceNote,
            displayOrder,
          },
        });
      }
    }
  });

  console.log("Busia border reference and three official source links are ready.");
}

main()
  .catch((error: unknown) => {
    const errorType = error instanceof Error ? error.name : "UnknownError";
    console.error(`Busia reference seed failed (${errorType}). No environment values were logged.`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
