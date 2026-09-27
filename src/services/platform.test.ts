import { expect, it } from 'vitest';
import { getRepository } from './platform';
it('opens a fresh web preview after the old repository is closed', async () => {
  const first = await getRepository(); await first.close(); const second = await getRepository();
  expect(second).not.toBe(first); expect(await second.list()).toEqual([]); await second.close();
});
it('does not discard a newer web repository when an old caller closes twice', async () => {
  const first = await getRepository(); await first.close(); const second = await getRepository();
  await first.close(); expect(await getRepository()).toBe(second); await second.close();
});
