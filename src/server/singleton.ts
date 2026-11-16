import "server-only";

/**
 * Get-or-create for one-row settings tables. Prisma's upsert can fail with a unique-key error when two
 * requests create the missing row at the same moment (pages load several settings in parallel); this
 * reads first and, if a parallel create won, reads again.
 */
export async function getOrCreate<T>(find: () => Promise<T | null>, create: () => Promise<T>): Promise<T> {
  const found = await find();
  if (found) return found;
  try {
    return await create();
  } catch (e) {
    if ((e as { code?: string }).code !== "P2002") throw e;
    const again = await find();
    if (!again) throw e;
    return again;
  }
}
