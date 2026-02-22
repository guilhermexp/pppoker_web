import {
  type NotificationChannel,
  type NotificationType,
  getAllNotificationTypes,
  getUserSettingsNotificationTypes,
} from "@midpoker/db/queries";

export type { NotificationType, NotificationChannel };
export { getAllNotificationTypes, getUserSettingsNotificationTypes };

// Get a specific notification type by its type string
export function getNotificationTypeByType(
  typeString: string,
): NotificationType | undefined {
  return getAllNotificationTypes().find((type) => type.type === typeString);
}

// Check if a notification type should appear in settings
export function shouldShowInSettings(typeString: string): boolean {
  const notificationType = getNotificationTypeByType(typeString);
  return notificationType?.showInSettings ?? false;
}

// Get notification types grouped by category
export interface NotificationCategory {
  category: string;
  order: number;
  types: NotificationType[];
}

export function getNotificationTypesByCategory(): NotificationCategory[] {
  const settingsTypes = getUserSettingsNotificationTypes();
  const categoryMap = new Map<string, NotificationCategory>();

  for (const notificationType of settingsTypes) {
    const category = notificationType.category || "other";
    const order = notificationType.order || 999;

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        order,
        types: [],
      });
    }

    categoryMap.get(category)!.types.push(notificationType);
  }

  // Sort categories by order, then by name
  return Array.from(categoryMap.values()).sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.category.localeCompare(b.category);
  });
}
