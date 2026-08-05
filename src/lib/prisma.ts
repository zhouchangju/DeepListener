import { PrismaClient } from "@prisma/client";
import { resolveLayout, databaseUrl } from "@/lib/runtime-paths";

// W2 T111: ensure DATABASE_URL points at the runtime-resolved database BEFORE
// the Prisma client is constructed. When DEEPLISTENER_DATA_DIR is set
// (Desktop), this overrides any value with an absolute file URL under the data
// root. When it is not set (Server legacy), an explicit DATABASE_URL remains
// authoritative; an omitted value falls back to the documented local SQLite
// database so a missing optional .env file does not crash learner-facing pages.
const layout = resolveLayout();
if (layout.mode === "desktop" || !process.env.DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = databaseUrl(layout);
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
