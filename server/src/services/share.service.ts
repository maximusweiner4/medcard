import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';

/** Generate a share link token and QR code image for a patient */
export async function createShareLink(
  patientId: string,
  createdById: string,
  expiresAt?: Date
): Promise<{ token: string; shareUrl: string; qrCodeDataUrl: string }> {
  const token = uuidv4();
  const shareUrl = `${process.env.SERVER_URL || 'http://localhost:3000'}/share/${token}`;

  await prisma.shareLink.create({
    data: { patientId, token, createdById, expiresAt, isActive: true },
  });

  const qrCodeDataUrl = await QRCode.toDataURL(shareUrl, {
    width: 400,
    margin: 2,
    color: { dark: '#1e3a5f', light: '#ffffff' },
  });

  return { token, shareUrl, qrCodeDataUrl };
}

/** Validate a share token and increment access count. Returns patientId or null. */
export async function validateShareToken(token: string): Promise<string | null> {
  const link = await prisma.shareLink.findUnique({ where: { token } });
  if (!link || !link.isActive) return null;
  if (link.expiresAt && link.expiresAt < new Date()) return null;

  await prisma.shareLink.update({
    where: { token },
    data: { accessCount: { increment: 1 } },
  });

  return link.patientId;
}
