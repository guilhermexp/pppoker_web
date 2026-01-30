import { RedisCache } from "./redis-client";

export const POKER_WIDGET_TYPES = [
  // Overview stats (default primary widgets)
  "poker-total-sessions",
  "poker-total-players",
  "poker-active-agents",
  "poker-rake-total",
  "poker-rake-breakdown", // Combined PPST + PPSR
  "poker-total-rakeback",
  "poker-player-results",
  "poker-general-result",
  // Additional widgets
  "poker-game-types",
  "poker-players-by-region",
] as const;

// Legacy widget types for migration (these map to poker-rake-breakdown)
export const LEGACY_WIDGET_TYPES = [
  "poker-rake-ppst",
  "poker-rake-ppsr",
] as const;

export type PokerWidgetType = (typeof POKER_WIDGET_TYPES)[number];

export interface PokerWidgetPreferences {
  primaryWidgets: PokerWidgetType[];
  availableWidgets: PokerWidgetType[];
}

export const DEFAULT_POKER_WIDGET_ORDER: PokerWidgetType[] = [
  ...POKER_WIDGET_TYPES,
];

export const DEFAULT_POKER_WIDGET_PREFERENCES: PokerWidgetPreferences = {
  primaryWidgets: DEFAULT_POKER_WIDGET_ORDER.slice(0, 10), // Show all widgets by default
  availableWidgets: DEFAULT_POKER_WIDGET_ORDER.slice(10),
};

class PokerWidgetPreferencesCache extends RedisCache {
  constructor() {
    super("poker-widget-preferences");
  }

  private getPokerWidgetPreferencesKey(teamId: string, userId: string): string {
    return `${teamId}:${userId}`;
  }

  async getPokerWidgetPreferences(
    teamId: string,
    userId: string,
  ): Promise<PokerWidgetPreferences> {
    const key = this.getPokerWidgetPreferencesKey(teamId, userId);
    const preferences = await this.get<PokerWidgetPreferences>(key);

    if (!preferences) {
      return DEFAULT_POKER_WIDGET_PREFERENCES;
    }

    // Migrate legacy widgets (poker-rake-ppst, poker-rake-ppsr -> poker-rake-breakdown)
    const migrateLegacyWidgets = (widgets: string[]): PokerWidgetType[] => {
      const result: PokerWidgetType[] = [];
      let hasBreakdown = false;

      for (const widget of widgets) {
        if (LEGACY_WIDGET_TYPES.includes(widget as any)) {
          // Replace legacy with combined widget (only once)
          if (!hasBreakdown && !result.includes("poker-rake-breakdown")) {
            result.push("poker-rake-breakdown");
            hasBreakdown = true;
          }
        } else if (
          DEFAULT_POKER_WIDGET_ORDER.includes(widget as PokerWidgetType)
        ) {
          result.push(widget as PokerWidgetType);
        }
      }

      return result;
    };

    const migratedPrimaryWidgets = migrateLegacyWidgets(
      preferences.primaryWidgets as string[],
    );
    const migratedAvailableWidgets = migrateLegacyWidgets(
      preferences.availableWidgets as string[],
    );

    // Validate and add missing widgets
    const allWidgets = [...migratedPrimaryWidgets, ...migratedAvailableWidgets];
    const missingWidgets = DEFAULT_POKER_WIDGET_ORDER.filter(
      (widget) => !allWidgets.includes(widget),
    );

    const updatedAvailableWidgets = [
      ...migratedAvailableWidgets,
      ...missingWidgets,
    ];

    // Check if migration is needed
    const needsMigration =
      preferences.primaryWidgets.length !== migratedPrimaryWidgets.length ||
      preferences.availableWidgets.length !== updatedAvailableWidgets.length ||
      missingWidgets.length > 0;

    if (needsMigration) {
      const migratedPreferences: PokerWidgetPreferences = {
        primaryWidgets: migratedPrimaryWidgets,
        availableWidgets: updatedAvailableWidgets,
      };

      await this.set(key, migratedPreferences);
      return migratedPreferences;
    }

    return {
      primaryWidgets: migratedPrimaryWidgets,
      availableWidgets: updatedAvailableWidgets,
    };
  }

  async setPokerWidgetPreferences(
    teamId: string,
    userId: string,
    preferences: PokerWidgetPreferences,
  ): Promise<void> {
    const allWidgets = [
      ...preferences.primaryWidgets,
      ...preferences.availableWidgets,
    ];

    if (allWidgets.length !== DEFAULT_POKER_WIDGET_ORDER.length) {
      throw new Error(
        "Invalid poker widget preferences: incorrect number of widgets",
      );
    }

    const missingWidgets = DEFAULT_POKER_WIDGET_ORDER.filter(
      (widget) => !allWidgets.includes(widget),
    );
    const extraWidgets = allWidgets.filter(
      (widget) => !DEFAULT_POKER_WIDGET_ORDER.includes(widget),
    );

    if (missingWidgets.length > 0) {
      throw new Error(
        `Invalid poker widget preferences: missing widgets ${missingWidgets.join(", ")}`,
      );
    }

    if (extraWidgets.length > 0) {
      throw new Error(
        `Invalid poker widget preferences: unknown widgets ${extraWidgets.join(", ")}`,
      );
    }

    if (preferences.primaryWidgets.length > 12) {
      throw new Error(
        "Invalid poker widget preferences: primary widgets cannot exceed 12",
      );
    }

    const duplicates = allWidgets.filter(
      (widget, index) => allWidgets.indexOf(widget) !== index,
    );
    if (duplicates.length > 0) {
      throw new Error(
        `Invalid poker widget preferences: duplicate widgets ${duplicates.join(", ")}`,
      );
    }

    const key = this.getPokerWidgetPreferencesKey(teamId, userId);
    await this.set(key, preferences);
  }

  async updatePrimaryWidgets(
    teamId: string,
    userId: string,
    newPrimaryWidgets: PokerWidgetType[],
  ): Promise<PokerWidgetPreferences> {
    if (newPrimaryWidgets.length > 12) {
      throw new Error("Primary widgets cannot exceed 12");
    }

    const availableWidgets = DEFAULT_POKER_WIDGET_ORDER.filter(
      (widget) => !newPrimaryWidgets.includes(widget),
    );

    const newPreferences: PokerWidgetPreferences = {
      primaryWidgets: newPrimaryWidgets,
      availableWidgets,
    };

    await this.setPokerWidgetPreferences(teamId, userId, newPreferences);
    return newPreferences;
  }
}

export const pokerWidgetPreferencesCache = new PokerWidgetPreferencesCache();
