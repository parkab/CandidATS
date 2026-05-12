import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let prismaInstance: PrismaClient | null = null;

/**
 * Get or create Prisma client instance lazily.
 * This defers DATABASE_URL validation until the client is actually used,
 * allowing builds to succeed even when DATABASE_URL is not available at build time.
 */
function getPrismaClient(): PrismaClient {
  if (prismaInstance) {
    return prismaInstance;
  }

  // Check for cached instance in globalThis (for dev mode with hot reload)
  if (globalForPrisma.prisma) {
    prismaInstance = globalForPrisma.prisma;
    return prismaInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  prismaInstance = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl,
    }),
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance;
  }

  return prismaInstance;
}

/**
 * Proxy-based lazy initialization of Prisma client.
 * Ensures DATABASE_URL is only checked when the client is first accessed.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get: (_target, prop) => {
    const client = getPrismaClient();
    return Reflect.get(client, prop);
  },
});
