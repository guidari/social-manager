import { randomBytes } from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

const COMBINING_DIACRITICS = /[\u0300-\u036f]/g;

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "workspace";
}

export async function generateUniqueWorkspaceSlug(
  client: Prisma.TransactionClient | PrismaClient,
  seed: string,
): Promise<string> {
  const base = slugify(seed);

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomBytes(3).toString("hex")}`;
    const existing = await client.workspace.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
  }

  return `${base}-${randomBytes(4).toString("hex")}`;
}
