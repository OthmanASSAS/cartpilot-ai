import { PrismaClient } from "@prisma/client";

// Évite de recréer un client Prisma à chaud en dev
declare global {
  var prismaGlobal: PrismaClient | undefined;
}

const prisma: PrismaClient = globalThis.prismaGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
