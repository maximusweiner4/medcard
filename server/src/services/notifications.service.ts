import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { prisma } from '../lib/prisma';

const expo = new Expo();

export async function sendRefillReminder(pushToken: string, drugName: string, daysUntil: number) {
  if (!Expo.isExpoPushToken(pushToken)) return;
  const messages: ExpoPushMessage[] = [{
    to: pushToken,
    title: 'Refill Reminder',
    body: daysUntil === 0
      ? `${drugName} needs a refill today.`
      : `${drugName} needs a refill in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`,
    sound: 'default',
  }];
  try {
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch {
    // Non-critical — never let notification failure crash anything
  }
}

/** Check all medications with nextRefillDate within 3 days and send push reminders */
export async function checkAndSendRefillReminders() {
  const now = new Date();
  const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const meds = await prisma.medication.findMany({
    where: {
      isActive: true,
      nextRefillDate: { gte: now, lte: threeDaysOut },
    },
    include: {
      patient: {
        include: {
          primaryCaregiver: { select: { pushToken: true } },
          caregivers: { include: { caregiver: { select: { pushToken: true } } } },
        },
      },
    },
  });

  for (const med of meds) {
    const daysUntil = Math.ceil(
      (new Date(med.nextRefillDate!).getTime() - now.getTime()) / 86400000
    );

    // Collect all caregivers with push tokens
    const tokens = new Set<string>();
    if (med.patient.primaryCaregiver.pushToken) tokens.add(med.patient.primaryCaregiver.pushToken);
    for (const rel of med.patient.caregivers) {
      if (rel.caregiver.pushToken) tokens.add(rel.caregiver.pushToken);
    }

    for (const token of tokens) {
      await sendRefillReminder(token, med.drugName, daysUntil);
    }
  }

  return meds.length;
}
