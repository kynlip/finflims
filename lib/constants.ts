export const ANIMATION_CATEGORIES = [
  {
    slug: 'am-nhac',
    name: 'Âm Nhạc',
  },
  {
    slug: 'bi-an',
    name: 'Bí Ẩn',
  },
  {
    slug: 'chien-tranh',
    name: 'Chiến Tranh',
  },
  {
    slug: 'chinh-kich',
    name: 'Chính Kịch',
  },
  {
    slug: 'co-trang',
    name: 'Cổ Trang',
  },
  {
    slug: 'gia-dinh',
    name: 'Gia Đình',
  },
  {
    slug: 'gia-tuong',
    name: 'Giả Tượng',
  },
  {
    slug: 'hai-huoc',
    name: 'Hài Hước',
  },
  {
    slug: 'hanh-dong',
    name: 'Hành Động',
  },
  {
    slug: 'hinh-su',
    name: 'Hình Sự',
  },
  {
    slug: 'hoat-hinh',
    name: 'Hoạt Hình',
  },
  {
    slug: 'hoc-duong',
    name: 'Học Đường',
  },
  {
    slug: 'khoa-hoc',
    name: 'Khoa Học',
  },
  {
    slug: 'kinh-di',
    name: 'Kinh Dị',
  },
  {
    slug: 'kinh-dien',
    name: 'Kinh Điển',
  },
  {
    slug: 'lich-su',
    name: 'Lịch Sử',
  },
  {
    slug: 'mien-tay',
    name: 'Miền Tây',
  },
  {
    slug: 'phieu-luu',
    name: 'Phiêu Lưu',
  },
  {
    slug: 'tai-lieu',
    name: 'Tài Liệu',
  },
  {
    slug: 'tam-ly',
    name: 'Tâm Lý',
  },
  {
    slug: 'than-thoai',
    name: 'Thần Thoại',
  },
  {
    slug: 'the-thao',
    name: 'Thể Thao',
  },
  {
    slug: 'tinh-cam',
    name: 'Tình Cảm',
  },
  {
    slug: 'tre-em',
    name: 'Trẻ Em',
  },
  {
    slug: 'vien-tuong',
    name: 'Viễn Tưởng',
  },
  {
    slug: 'vo-thuat',
    name: 'Võ Thuật',
  },
];

export const ANIMATION_COUNTRIES = [
  {
    slug: 'anh',
    name: 'Anh',
  },
  {
    slug: 'an-do',
    name: 'Ấn Độ',
  },
  {
    slug: 'au-my',
    name: 'Âu Mỹ',
  },
  {
    slug: 'ba-lan',
    name: 'Ba Lan',
  },
  {
    slug: 'bi',
    name: 'Bỉ',
  },
  {
    slug: 'brazil',
    name: 'Brazil',
  },
  {
    slug: 'canada',
    name: 'Canada',
  },
  {
    slug: 'dai-loan',
    name: 'Đài Loan',
  },
  {
    slug: 'dan-mach',
    name: 'Đan Mạch',
  },
  {
    slug: 'duc',
    name: 'Đức',
  },
  {
    slug: 'han-quoc',
    name: 'Hàn Quốc',
  },
  {
    slug: 'hong-kong',
    name: 'Hồng Kông',
  },
  {
    slug: 'ireland',
    name: 'Ireland',
  },
  {
    slug: 'malaysia',
    name: 'Malaysia',
  },
  {
    slug: 'mexico',
    name: 'Mexico',
  },
  {
    slug: 'na-uy',
    name: 'Na Uy',
  },
  {
    slug: 'nam-phi',
    name: 'Nam Phi',
  },
  {
    slug: 'nga',
    name: 'Nga',
  },
  {
    slug: 'nhat-ban',
    name: 'Nhật Bản',
  },
  {
    slug: 'phap',
    name: 'Pháp',
  },
  {
    slug: 'phan-lan',
    name: 'Phần Lan',
  },
  {
    slug: 'quoc-gia-khac',
    name: 'Quốc Gia Khác',
  },
  {
    slug: 'tay-ban-nha',
    name: 'Tây Ban Nha',
  },
  {
    slug: 'thai-lan',
    name: 'Thái Lan',
  },
  {
    slug: 'thuy-si',
    name: 'Thụy Sĩ',
  },
  {
    slug: 'trung-quoc',
    name: 'Trung Quốc',
  },
  {
    slug: 'uc',
    name: 'Úc',
  },
  {
    slug: 'viet-nam',
    name: 'Việt Nam',
  },
  {
    slug: 'y',
    name: 'Ý',
  },
];

export const ANIMATION_YEARS = Array.from({ length: 27 }, (_, i) => ({
  year: 2026 - i,
}));

export const ANIMATION_LANGUAGES = [
  { slug: 'vietsub', name: 'Vietsub' },
  { slug: 'thuyet-minh', name: 'Thuyết Minh' },
  { slug: 'long-tieng', name: 'Lồng Tiếng' },
];

export const CATEGORY_NAMES: Record<string, string> = Object.fromEntries(
  ANIMATION_CATEGORIES.map((c) => [c.slug, c.name])
);

export const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  ANIMATION_COUNTRIES.map((c) => [c.slug, c.name])
);
