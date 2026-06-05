const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const globalForPrisma = globalThis;

// Configure DATABASE_URL in .env before running migrations or making database queries.
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
