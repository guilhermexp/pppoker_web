import { logger } from "@midpoker/logger";
import type { Database } from "../client";
import { createActivity } from "../queries/activities";
import type { activityTypeEnum } from "../schema";

type ActivityType = (typeof activityTypeEnum.enumValues)[number];

interface LogActivityOptions {
  db: Database;
  teamId: string;
  userId: string;
  type: ActivityType;
  metadata: Record<string, any>;
  priority?: number;
  source?: "user" | "system";
}

export function logActivity(options: LogActivityOptions) {
  try {
    createActivity(options.db, {
      teamId: options.teamId,
      userId: options.userId,
      type: options.type,
      source: options.source ?? "user",
      status: "read",
      priority: options.priority ?? 7,
      metadata: options.metadata,
    }).catch((error) => {
      logger.warn(
        { error, teamId: options.teamId, type: options.type },
        "Activity logging failed",
      );
    });
  } catch {
    // Even if the call itself throws, ignore it
  }
}
