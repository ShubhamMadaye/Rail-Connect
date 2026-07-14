import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function logEvent(
  userId: string | null | undefined,
  action: string,
  details: string,
  ip?: string | null
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        details,
        ip: ip || null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
