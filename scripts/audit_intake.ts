import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import glob from 'fast-glob';

const INTAKE_ROOT = 'intake';
const REPORT_FILE = 'intake/intake_audit_report.json';

interface FileEntry {
  path: string;
  size: number;
}

interface AuditReport {
  totalFiles: number;
  totalSize: number;
  uniqueFiles: number;
  uniqueSize: number;
  duplicateCount: number;
  wastedSize: number;
  duplicates: Record<string, FileEntry[]>; // hash -> files
}

async function calculateHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function audit() {
  console.log(`🔍 Starting audit of ${INTAKE_ROOT}...`);
  
  const files = await glob('**/*', {
    cwd: INTAKE_ROOT,
    absolute: true,
    stats: true,
    ignore: ['**/node_modules/**', '**/.DS_Store', '**/processed_pkb_final/**'] // Ignore processed/system files
  });

  console.log(`Found ${files.length} files. Hashing...`);

  const hashMap = new Map<string, FileEntry[]>();
  let processed = 0;
  let totalBytes = 0;

  for (const file of files) {
    try {
      const hash = await calculateHash(file.path);
      const relativePath = path.relative(process.cwd(), file.path);
      const size = (file as any).stats.size; // fast-glob returns stats if requested
      
      totalBytes += size;

      if (!hashMap.has(hash)) {
        hashMap.set(hash, []);
      }
      hashMap.get(hash)?.push({ path: relativePath, size });

      processed++;
      if (processed % 100 === 0) {
        process.stdout.write(`\rProgress: ${processed}/${files.length}`);
      }
    } catch (error) {
      console.error(`\nError processing ${file.path}:`, error);
    }
  }

  console.log('\nProcessing complete. Generating report...');

  const duplicates: Record<string, FileEntry[]> = {};
  let uniqueBytes = 0;
  let wastedBytes = 0;

  for (const [hash, entries] of hashMap.entries()) {
    uniqueBytes += entries[0].size;
    if (entries.length > 1) {
      duplicates[hash] = entries;
      // Wasted is size * (count - 1)
      wastedBytes += entries[0].size * (entries.length - 1);
    }
  }

  const report: AuditReport = {
    totalFiles: files.length,
    totalSize: totalBytes,
    uniqueFiles: hashMap.size,
    uniqueSize: uniqueBytes,
    duplicateCount: Object.keys(duplicates).length,
    wastedSize: wastedBytes,
    duplicates
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`✅ Report written to ${REPORT_FILE}`);
  console.log(`   Total Files: ${report.totalFiles}`);
  console.log(`   Duplicates Sets: ${report.duplicateCount}`);
  console.log(`   Potential Space Savings: ${(report.wastedSize / 1024 / 1024).toFixed(2)} MB`);
}

audit().catch(console.error);
