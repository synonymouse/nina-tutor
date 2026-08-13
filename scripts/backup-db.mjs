import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { link, mkdir, mkdtemp, open, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

function isWithin(root, path) {
  return path === root || path.startsWith(`${root}${sep}`);
}

async function main() {
  const source = process.env.LEADS_DB_PATH?.trim();
  const backupDir = process.env.LEADS_BACKUP_DIR?.trim() || './var/backups';

  if (!source) throw new Error('LEADS_DB_PATH is required');

  const resolvedSource = resolve(source);
  const resolvedBackupDir = resolve(backupDir);
  const publicRoots = [resolve('public'), resolve('dist/client')];
  if (publicRoots.some((root) => isWithin(root, resolvedBackupDir))) {
    throw new Error('LEADS_BACKUP_DIR must be outside public web roots');
  }
  if (isWithin(resolvedBackupDir, resolvedSource)) {
    throw new Error('LEADS_DB_PATH must be outside LEADS_BACKUP_DIR');
  }

  await mkdir(resolvedBackupDir, { recursive: true });

  const timestamp = new Date().toISOString().replaceAll(':', '-').replace('.', '-');
  const target = join(resolvedBackupDir, `leads-${timestamp}-${randomUUID()}.db`);
  const temporaryDir = await mkdtemp(join(resolvedBackupDir, '.backup-'));
  const temporaryTarget = join(temporaryDir, 'leads.db');

  let db;
  try {
    if ([target, temporaryTarget].some((path) => resolvedSource === resolve(path))) {
      throw new Error('Backup targets must differ from LEADS_DB_PATH');
    }

    db = new Database(source, { readonly: true, fileMustExist: true });
    await db.backup(temporaryTarget);
    db.close();
    db = undefined;

    const temporaryFile = await open(temporaryTarget, 'r');
    try {
      await temporaryFile.sync();
    } finally {
      await temporaryFile.close();
    }

    // Both paths are in backupDir, so link publishes one complete inode atomically.
    await link(temporaryTarget, target);
  } finally {
    db?.close();
    await rm(temporaryDir, { recursive: true, force: true });
  }

  console.log(target);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
