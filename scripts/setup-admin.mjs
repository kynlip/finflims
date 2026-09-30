import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
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
const usersCol = db.collection('users');

const targetEmail = 'admin@rapphim.online';
const targetUsername = 'admin';
const plainPassword = 'admin123';

const hashed = await bcrypt.hash(plainPassword, 10);

const result = await usersCol.updateOne(
  { email: targetEmail },
  {
    $set: {
      username: targetUsername,
      password: hashed,
      role: 'admin',
      isActive: true,
      authProvider: 'credentials',
      updatedAt: new Date(),
    },
  },
  { upsert: true }
);

if (result.upsertedId) {
  console.log('CREATED admin user:', targetEmail);
} else if (result.modifiedCount > 0) {
  console.log('UPDATED admin user:', targetEmail);
} else {
  console.log('NO CHANGE admin user:', targetEmail);
}

console.log('Login info:');
console.log('  URL:      http://localhost:3002/nhanconan/login');
console.log('  Username: admin');
console.log('  Password: admin123');

await client.close();
