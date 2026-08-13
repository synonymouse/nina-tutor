import Database from 'better-sqlite3';
import { mkdir } from 'node:fs/promises';
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

  const timestamp = new Date().toISOString().replaceAll(':', '-').replace('.', '-');
  const target = join(resolvedBackupDir, `leads-${timestamp}.db`);
  if (resolve(source) === resolve(target)) {
    throw new Error('Backup target must differ from LEADS_DB_PATH');
  }

  await mkdir(resolvedBackupDir, { recursive: true });

  let db;
  try {
    db = new Database(source, { readonly: true, fileMustExist: true });
    await db.backup(target);
  } finally {
    db?.close();
  }

  console.log(target);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
