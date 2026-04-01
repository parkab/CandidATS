import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL ?? '',
    }),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaClient;
}

export const prisma = prismaClient;
