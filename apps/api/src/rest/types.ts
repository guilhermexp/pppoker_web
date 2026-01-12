import type { Session } from "@api/utils/auth";
import type { Database } from "@midpoker/db/client";

export type Context = {
  Variables: {
    db: Database;
    session: Session;
    teamId: string;
    userId?: string;
  };
};
