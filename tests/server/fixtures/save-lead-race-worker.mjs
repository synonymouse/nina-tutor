import { createServer } from 'vite';

const vite = await createServer({
  appType: 'custom',
  cacheDir: process.env.RACE_VITE_CACHE_DIR,
  configFile: false,
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { saveLead } = await vite.ssrLoadModule('/src/server/leads.ts');
  const { closeDatabase } = await vite.ssrLoadModule('/src/server/database.ts');

  process.send?.({ type: 'ready' });
  process.once('message', async (message) => {
    if (!message || message.type !== 'start') return;

    try {
      const saved = saveLead(JSON.parse(process.env.RACE_LEAD_INPUT ?? '{}'));
      process.send?.({ type: 'result', saved });
    } catch (error) {
      process.send?.({
        type: 'error',
        message: error instanceof Error ? error.stack ?? error.message : String(error),
      });
    } finally {
      closeDatabase();
      await vite.close();
      process.disconnect();
    }
  });
} catch (error) {
  process.send?.({
    type: 'error',
    message: error instanceof Error ? error.stack ?? error.message : String(error),
  });
  await vite.close();
  process.disconnect();
}
