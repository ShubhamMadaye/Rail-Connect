import fs from 'fs';
import path from 'path';

export async function runBackup() {
  try {
    const dbPath = path.resolve(__dirname, '../../prisma/railway.db');
    const backupsDir = path.resolve(__dirname, '../../prisma/backups');

    if (!fs.existsSync(dbPath)) {
      console.warn('SQLite database file does not exist at:', dbPath);
      return;
    }

    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `railway_backup_${timestamp}.db`;
    const backupFilePath = path.join(backupsDir, backupFileName);

    // Copy SQLite database file
    fs.copyFileSync(dbPath, backupFilePath);
    console.log(`[BACKUP] Successfully created database backup: ${backupFileName}`);

    // Clean up older backups (keep last 7 backups)
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('railway_backup_') && f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: path.join(backupsDir, f),
        stat: fs.statSync(path.join(backupsDir, f))
      }))
      .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime()); // Newest first

    if (files.length > 7) {
      const toDelete = files.slice(7);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        console.log(`[BACKUP] Pruned old backup: ${file.name}`);
      }
    }
  } catch (err) {
    console.error('[BACKUP] Database backup failed:', err);
  }
}
