import Database from 'better-sqlite3';
import { fork, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

interface WorkerMessage {
  type: 'ready' | 'result' | 'error';
  saved?: { id: string; createdAt: string; duplicate: boolean };
  message?: string;
}

const temporaryDirectories: string[] = [];
const workerPath = fileURLToPath(
  new URL('./fixtures/save-lead-race-worker.mjs', import.meta.url),
);

function waitForMessage(child: ChildProcess, type: WorkerMessage['type']): Promise<WorkerMessage> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Worker did not send ${type}`)), 15_000);
    const stderr: Buffer[] = [];
    child.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk));

    const onMessage = (message: WorkerMessage) => {
      if (message.type === 'error') {
        clearTimeout(timeout);
        reject(new Error(message.message));
      } else if (message.type === type) {
        clearTimeout(timeout);
        child.off('message', onMessage);
        resolve(message);
      }
    };
    child.on('message', onMessage);
    child.once('exit', (code) => {
      if (code !== 0) {
        clearTimeout(timeout);
        reject(
          new Error(`Worker exited with ${code}: ${Buffer.concat(stderr).toString('utf8')}`),
        );
      }
    });
  });
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe('cross-process lead idempotency', () => {
  it('returns one lead ID when two processes save the same token concurrently', async () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), 'nina-lead-race-test-'));
    temporaryDirectories.push(temporaryDirectory);
    const databasePath = join(temporaryDirectory, 'leads.db');
    const input = {
      name: 'Анна',
      preferredContact: '@anna',
      situation: 'Ребенку сложно начинать задания самостоятельно.',
      consent: true,
      consentVersion: '1.0',
      website: '',
      requestToken: '552d8606-c5f7-4077-83af-cc60e96e8f0b',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
      utmContent: '',
      utmTerm: '',
    };
    const commonEnvironment = {
      ...process.env,
      LEADS_DB_PATH: databasePath,
      RATE_LIMIT_SECRET: '4491d02527184ef8996dd424ae3ff544',
      RACE_LEAD_INPUT: JSON.stringify(input),
      SITE_URL: 'http://127.0.0.1:4321',
    };
    const workers = ['a', 'b'].map((worker) =>
      fork(workerPath, {
        env: {
          ...commonEnvironment,
          RACE_VITE_CACHE_DIR: join(temporaryDirectory, `vite-${worker}`),
        },
        silent: true,
      }),
    );

    try {
      await Promise.all(workers.map((worker) => waitForMessage(worker, 'ready')));
      const results = workers.map((worker) => waitForMessage(worker, 'result'));
      workers.forEach((worker) => worker.send({ type: 'start' }));
      const messages = await Promise.all(results);
      const saved = messages.map((message) => message.saved);

      expect(saved[0]?.id).toBe(saved[1]?.id);
      expect(saved.map((result) => result?.duplicate).sort()).toEqual([false, true]);

      const database = new Database(databasePath, { readonly: true });
      try {
        expect(database.prepare('SELECT id, request_token FROM leads').all()).toEqual([
          { id: saved[0]?.id, request_token: input.requestToken },
        ]);
      } finally {
        database.close();
      }
    } finally {
      workers.forEach((worker) => {
        if (!worker.killed && worker.connected) worker.kill();
      });
    }
  });
});
