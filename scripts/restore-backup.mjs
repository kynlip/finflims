import { MongoClient } from 'mongodb';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

for (const file of ['.env.local', '.env.production']) {
  try {
    for (const line of readFileSync(join(rootDir, file), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}

const rawUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'captainmedia';

let uri = rawUri;
if (process.env.MONGODB_URI) {
  try {
    const tmp = new MongoClient(rawUri);
    await tmp.connect();
    await tmp.db('admin').command({ ping: 1 });
    await tmp.close();
  } catch {
    uri = 'mongodb://localhost:27017';
  }
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);

const backupDir = join(rootDir, '..', 'database');

const COLLECTION_MAP = {
  'kkphim.json': 'kkphim',
  'users.json': 'users',
  'lichsu.json': 'lichsu',
  'reviews.json': 'reviews',
  'yeuthich.json': 'yeuthich',
  'settings.json': 'settings',
  'site_settings.json': 'settings',
  'recharge_orders.json': 'recharge_orders',
  'sepay_transactions.json': 'sepay_transactions',
  'logs.json': 'logs',
  'init_check.json': 'init_check',
};

for (const [fileName, collName] of Object.entries(COLLECTION_MAP)) {
  const filePath = join(backupDir, fileName);
  if (!existsSync(filePath)) {
    console.log(`SKIP   ${fileName} (not found)`);
    continue;
  }

  console.log(`IMPORT ${fileName} -> ${collName}`);
  try {
    const raw = readFileSync(filePath, 'utf8');
    const docs = JSON.parse(raw);

    if (!Array.isArray(docs)) {
      console.log(`SKIP   ${fileName} (not an array)`);
      continue;
    }

    const cleaned = docs
      .filter((doc) => doc && typeof doc === 'object')
      .map((doc) => {
        const { __v, ...rest } = doc;
        return rest;
      });

    if (cleaned.length === 0) {
      console.log(`SKIP   ${fileName} (empty)`);
      continue;
    }

    const result = await db.collection(collName).deleteMany({});
    console.log(`XOA   ${collName} (${result.deletedCount} docs)`);

    const insertResult = await db.collection(collName).insertMany(cleaned, { ordered: false });
    console.log(`OK     inserted ${insertResult.insertedCount} docs (${collName})`);
  } catch (err) {
    console.error(`FAIL   ${fileName} -> ${collName}: ${err.message}`);
  }
}

await client.close();
console.log('\nDone.');
