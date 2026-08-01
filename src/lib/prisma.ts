import { PrismaClient } from "@prisma/client";
import { resolveLayout, databaseUrl } from "@/lib/runtime-paths";

// W2 T111: ensure DATABASE_URL points at the runtime-resolved database BEFORE
// the Prisma client is constructed. When DEEPLISTENER_DATA_DIR is set
// (Desktop), this overrides any value with an absolute file URL under the data
// root. When it is not set (Server legacy), the existing DATABASE_URL from
// .env is preserved unchanged so Server behavior is byte-identical.
const layout = resolveLayout();
if (layout.mode === "desktop") {
  process.env.DATABASE_URL = databaseUrl(layout);
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
