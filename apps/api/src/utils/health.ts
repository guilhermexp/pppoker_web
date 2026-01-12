import { checkHealth as checkDbHealth } from "@midpoker/db/utils/health";

export async function checkHealth(): Promise<void> {
  await checkDbHealth();
}
