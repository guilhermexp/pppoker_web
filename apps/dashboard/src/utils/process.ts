export async function processPromisesBatch<T, R>(
  items: T[],
  limit: number,
  fn: (batch: T[]) => Promise<R[]>,
): Promise<R[]> {
  const batches: T[][] = [];
  let result: R[] = [];

  for (let i = 0; i < items?.length; i += limit) {
    batches.push(items.slice(i, i + limit));
  }

  for (const batch of batches) {
    const processedBatch = await fn(batch);
    result = result.concat(processedBatch);
  }

  return result;
}
