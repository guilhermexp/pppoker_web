import { deleteTeamSchema } from "@jobs/schema";
import { logger, schemaTask } from "@trigger.dev/sdk";

export const deleteTeam = schemaTask({
  id: "delete-team",
  schema: deleteTeamSchema,
  maxDuration: 60,
  queue: {
    concurrencyLimit: 10,
  },
  run: async ({ teamId }) => {
    logger.info("Deleting team", { teamId });
    // Team deletion is handled by database cascades
  },
});
