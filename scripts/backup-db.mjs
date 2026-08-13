import Database from 'better-sqlite3';
import { constants } from 'node:fs';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve, sep } from 'node:path';

async function main() {
  const source = process.env.LEADS_DB_PATH?.trim();
  const backupDir = process.env.LEADS_BACKUP_DIR?.trim() || './var/backups';

  if (!source) throw new Error('LEADS_DB_PATH is required');

  const resolvedBackupDir = resolve(backupDir);
  const publicDir = resolve('public');
  if (
    resolvedBackupDir === publicDir ||
    resolvedBackupDir.startsWith(`${publicDir}${sep}`)
  ) {
    throw new Error('LEADS_BACKUP_DIR must be outside public');
  }

  await mkdir(resolvedBackupDir, { recursive: true });

  const timestamp = new Date().toISOString().replaceAll(':', '-').replace('.', '-');
  const target = join(resolvedBackupDir, `leads-${timestamp}-${randomUUID()}.db`);
  const temporaryDir = await mkdtemp(join(resolvedBackupDir, '.backup-'));
  const temporaryTarget = join(temporaryDir, 'leads.db');
  if ([target, temporaryTarget].some((path) => resolve(source) === resolve(path))) {
    await rm(temporaryDir, { recursive: true, force: true });
    throw new Error('Backup targets must differ from LEADS_DB_PATH');
  }

  let db;
  try {
    db = new Database(source, { readonly: true, fileMustExist: true });
    await db.backup(temporaryTarget);
    db.close();
    db = undefined;
    await copyFile(temporaryTarget, target, constants.COPYFILE_EXCL);
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
