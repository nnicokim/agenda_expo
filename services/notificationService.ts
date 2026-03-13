import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configurar como se muestran las notificaciones
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleNotification(
  title: string,
  date: string,
  time: string,
): Promise<string | null> {
  const triggerDate = buildDateTime(date, time);

  // No programar si la fecha es vieja
  if (triggerDate.getTime() <= Date.now()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏰ Recordatorio",
      body: title,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return id;
}

export async function cancelNotification(
  notificationId: string | null | undefined,
): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Si ya se disparó o no existe, ignorar
  }
}

export async function rescheduleNotification(
  oldNotificationId: string | null | undefined,
  title: string,
  date: string,
  time: string,
): Promise<string | null> {
  await cancelNotification(oldNotificationId);
  return scheduleNotification(title, date, time);
}

function buildDateTime(date: string, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date(`${date}T12:00:00`);
  d.setHours(hours, minutes, 0, 0);
  return d;
}
