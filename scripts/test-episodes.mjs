// Kiểm tra logic phân loại & chuẩn hóa tập phim trong lib/utils.ts.
// Cách chạy: npm run test:episodes
import assert from 'node:assert/strict';
import {
  isNumericEpisode,
  formatNumericDisplayName,
  normalizeEpisodeKey,
  getEpNumber,
  cleanEpisodeTitle,
} from '../lib/utils.ts';

let passed = 0;
function check(label, actual, expected) {
  assert.deepEqual(actual, expected, `${label}: nhận "${actual}", mong đợi "${expected}"`);
  passed += 1;
}

// --- Tập số & dải tập phải nằm trong lưới tập chính -------------------------
for (const name of [
  '1',
  'Tập 1',
  '211:214',
  '286: 290',
  '176-181',
  '211~214',
  '211..214',
  '211 đến 214', // dấu tiếng Việt: \b không dùng được ở đây
  '211 to 214',
  '920(865)',
  '348-349(342)',
  '22.5',
]) {
  check(`numeric: ${name}`, isNumericEpisode({ name }), true);
}

// --- Tập có chữ phải rơi xuống mục Đặc Biệt / Ngoại Truyện ------------------
for (const name of ['CHỨNG CỨ ĐỎ', 'Movie 26', 'OVA 1', 'Tập Đặc Biệt', 'Full', 'Conan bị mất tích']) {
  check(`named: ${name}`, isNumericEpisode({ name }), false);
}

// --- Tên hiển thị: gom khoảng trắng, bỏ số 0 thừa ---------------------------
check('display 286: 290', formatNumericDisplayName('286: 290'), '286:290');
check('display 176 - 181', formatNumericDisplayName('176 - 181'), '176-181');
check('display Tập 007', formatNumericDisplayName('Tập 007'), '7');
check('display Tập 146-151 (Lồng tiếng)', formatNumericDisplayName('Tập 146-151 (Lồng tiếng)'), '146-151');
check('display Tập 146 - Tập 151', formatNumericDisplayName('Tập 146 - Tập 151'), '146-151');
check('numeric Tập 146-151 (Lồng tiếng)', isNumericEpisode({ name: 'Tập 146-151 (Lồng tiếng)' }), true);

// --- Khoá so sánh: mọi biến thể của cùng một tập phải cho cùng một khoá -----
const key = normalizeEpisodeKey('tap-211-214');
check('key 211:214', normalizeEpisodeKey('211:214'), key);
check('key Tập 211 - 214', normalizeEpisodeKey('Tập 211 - 214'), key);
check('key tap-0211-214', normalizeEpisodeKey('tap-0211-214'), key);
check('key khác tập khác', normalizeEpisodeKey('tap-212') === key, false);
check('epNumber tap-286-290', getEpNumber('tap-286-290'), '286-290');

// --- Admin: tách tên tập ----------------------------------------------------
check('parse 211:214', cleanEpisodeTitle('211:214').slug, 'tap-211-214');
check('parse 286: 290', cleanEpisodeTitle('286: 290').name, 'Tập 286-290');
// Tập lẻ thập phân là MỘT tập, không được hiểu thành dải tập 22-5.
check('parse 22.5 name', cleanEpisodeTitle('22.5').name, 'Tập 22.5');
check('parse 22.5 slug', cleanEpisodeTitle('22.5').slug, 'tap-22-5');
check('parse Tập 306.5', cleanEpisodeTitle('Tập 306.5').name, 'Tập 306.5');
check('parse 176-181.mp4', cleanEpisodeTitle('176-181.mp4').slug, 'tap-176-181');
// Tập có tiêu đề chữ vẫn giữ nguyên tiêu đề.
check('parse 36: Án mạng', cleanEpisodeTitle('36: Án mạng trong thư viện').name, 'Tập 36: Án mạng trong thư viện');

console.log(`OK — ${passed} assertion đều đạt.`);
