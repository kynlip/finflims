// Tạo index cho các hot query. Idempotent: chạy lại không lỗi (createIndex bỏ qua nếu đã có).
// Cách chạy: mở SSH tunnel (npm run db) hoặc trỏ MONGODB_URI tới prod, rồi `npm run db:indexes`.
import { MongoClient } from 'mongodb';
import { readFileSync } from 'node:fs';

// Đọc env thủ công từ .env.local / .env.production (không thêm dependency)
for (const file of ['.env.local', '.env.production']) {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27018';
const dbName = process.env.MONGODB_DB_NAME || 'captainmedia';
const movieColl = process.env.MONGODB_COLLECTION || 'kkphim';

// ponytail: mỗi index map 1:1 vào query thật trong lib/data.ts + user-actions.ts
const INDEXES = {
  [movieColl]: [
    ['slug'],                       // getMovieBySlug, view counter, hero pinned
    ['aliases'],                    // $or slug/aliases lookup
    ['category.slug', 'modified.time:desc'],
    ['country.slug', 'modified.time:desc'],
    ['year', 'modified.time:desc'],
    ['modified.time:desc'],         // latest lists
    ['view:desc'],                  // hot/popular/top-view
    ['tmdb.vote_average:desc'],     // top IMDb
    ['type', 'modified.time:desc'],
    ['status', 'modified.time:desc'],
  ],
  users: [
    ['email'],
    ['username'],
  ],
  yeuthich: [
    ['userEmail', 'movieSlug'],     // toggle/isFavorite
    ['userEmail', 'addedAt:desc'],  // danh sách yêu thích
  ],
  lichsu: [
    ['userEmail', 'movieSlug'],     // upsert mỗi lượt xem
    ['userEmail', 'watchedAt:desc'],
  ],
  reviews: [
    ['movieSlug', 'createdAt:desc'],
    ['userEmail', 'createdAt:desc'], // anti-spam cooldown
  ],
  settings: [
    ['type'],                        // ads config + site settings findOne mỗi request
  ],
};

function parseSpec(spec) {
  const specObj = {};
  for (const part of spec) {
    const [field, dir] = part.split(':');
    specObj[field] = dir === 'desc' ? -1 : 1;
  }
  return specObj;
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);

for (const [coll, specs] of Object.entries(INDEXES)) {
  for (const spec of specs) {
    const name = `${coll}: {${spec.join(', ')}}`;
    try {
      await db.collection(coll).createIndex(parseSpec(spec));
      console.log(`OK    ${name}`);
    } catch (err) {
      console.error(`FAIL  ${name} — ${err.message}`);
    }
  }
}

console.log('\nXong. Kiểm tra: db.' + movieColl + '.getIndexes()');
await client.close();
