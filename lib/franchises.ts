export const FRANCHISES = {
  conan: {
    name: 'Conan',
    displayName: 'Vũ trụ Thám tử Conan',
    subtitle: 'Thám tử lừng danh Conan',
    eyebrow: 'Conan files',
    sectionDescription:
      'Các vụ án, tập dài và movie Conan được người xem theo dõi nhiều nhất.',
    pageDescription:
      'Tổng hợp các phần phim Thám tử lừng danh Conan, movie và tập đặc biệt có Vietsub.',
    searchTerms: ['conan'],
    excludeSearchTerms: ['future-boy-conan', 'conan-cau-be-tuong-lai'],
    heroTitle: 'Những vụ án chưa khép lại',
    heroDescription:
      'Mở hồ sơ và theo dõi những movie phá án nổi bật nhất trong kho Conan hiện có.',
    characters: [
      { slug: 'conan', label: 'Conan', searchTerms: ['conan'] },
      { slug: 'haibara', label: 'Haibara', searchTerms: ['haibara'] },
      {
        slug: 'kaito-kid',
        label: 'Kaito Kid',
        searchTerms: ['kaito kid', 'kaito-kid'],
      },
      { slug: 'akai', label: 'Akai', searchTerms: ['akai'] },
    ],
    theme: {
      panel: 'border-[#d9926b]/25 bg-[#18171c]',
      glow: 'bg-[#d2644c]/20',
      line: 'bg-[#f0bd83]',
      accent: 'text-[#f0bd83]',
      title: 'text-[#fff1d8]',
      badge: 'bg-[#d9926b]/10 text-[#ffc996]',
      button:
        'border-[#f0bd83]/35 bg-[#f0bd83]/10 text-[#ffe5bc] hover:bg-[#f0bd83] hover:text-[#211a18]',
      activeChip: 'border-[#ef6a65] bg-[#ef6a65] text-[#fff5e8] shadow-[#ef6a65]/25',
      chip: 'border-[#f0bd83]/20 bg-white/[0.035] text-[#f4d9bd] hover:border-[#ef6a65]/70 hover:bg-[#ef6a65]/10',
      heroGlow: 'bg-[#b83d50]/30',
    },
  },
  doraemon: {
    name: 'Doraemon',
    displayName: 'Thế giới bảo bối Doraemon',
    subtitle: 'Doraemon và những chuyến phiêu lưu',
    eyebrow: 'Doraemon pocket',
    sectionDescription:
      'Những tập Doraemon quen thuộc, movie dài và chuyến phiêu lưu cho cả nhà.',
    pageDescription:
      'Tổng hợp Doraemon series, movie và các tập đặc biệt được cập nhật trên Phim Hay Hơn Rổ.',
    searchTerms: ['doraemon'],
    excludeSearchTerms: [],
    heroTitle: 'Mở cửa đến những chuyến phiêu lưu',
    heroDescription:
      'Từ những movie dài giàu cảm xúc đến các tập Doraemon được xem lại nhiều nhất.',
    characters: [
      { slug: 'doraemon', label: 'Doraemon', searchTerms: ['doraemon'] },
      { slug: 'nobita', label: 'Nobita', searchTerms: ['nobita'] },
      { slug: 'shizuka', label: 'Shizuka', searchTerms: ['shizuka'] },
      { slug: 'suneo', label: 'Suneo', searchTerms: ['suneo'] },
      { slug: 'jaian', label: 'Jaian', searchTerms: ['jaian'] },
      { slug: 'dorami', label: 'Dorami', searchTerms: ['dorami'] },
    ],
    theme: {
      panel: 'border-[#43bdd7]/25 bg-[#0e1c2a]',
      glow: 'bg-[#1d9fca]/20',
      line: 'bg-[#78dce9]',
      accent: 'text-[#78dce9]',
      title: 'text-[#e4fbff]',
      badge: 'bg-[#43bdd7]/10 text-[#8de7f0]',
      button:
        'border-[#78dce9]/35 bg-[#78dce9]/10 text-[#b9f3f7] hover:bg-[#78dce9] hover:text-[#08202a]',
      activeChip: 'border-[#1fc7e2] bg-[#1fc7e2] text-[#062331] shadow-[#1fc7e2]/25',
      chip: 'border-[#78dce9]/20 bg-white/[0.035] text-[#c4f6fb] hover:border-[#1fc7e2]/70 hover:bg-[#1fc7e2]/10',
      heroGlow: 'bg-[#0c9fc7]/30',
    },
  },
  'sieu-nhan': {
    name: 'Siêu Nhân',
    displayName: 'Vũ trụ Siêu Nhân & Tokusatsu',
    subtitle: 'Kamen Rider, Super Sentai & Ultraman',
    eyebrow: 'Tokusatsu hero universe',
    sectionDescription:
      'Tuyển tập các series Siêu nhân Kamen Rider, Super Sentai (Gao), Ultraman và Power Rangers đỉnh cao.',
    pageDescription:
      'Tổng hợp trọn bộ các phần phim Siêu Nhân, Kamen Rider, Super Sentai, Ultraman và Movie đặc biệt có Vietsub & Thuyết minh.',
    searchTerms: [
      'sieu nhan',
      'siêu nhân',
      'kamen rider',
      'super sentai',
      'ultraman',
      'power rangers',
      'gaoranger',
      'tokusatsu',
      'kamen-rider',
      'super-sentai',
      'power-rangers',
      'geats',
      'gotchard',
      'gavv',
      'king-ohger',
      'boonboomger',
      'donbrothers',
      'zero-one',
      'zi-o',
      'build',
      'ex-aid',
      'decade',
      'den-o',
      'ryuki',
      'gokaiger',
      'shinkenger',
      'hurricaneger',
      'dekaranger',
      'magiranger',
      'boukenger',
      'gingaman',
    ],
    excludeSearchTerms: [],
    heroTitle: 'Huyền thoại Siêu Nhân & Chiến Binh',
    heroDescription:
      'Khám phá vũ trụ Tokusatsu với những màn biến hình mãn nhãn và các trận chiến bảo vệ thế giới.',
    characters: [
      {
        slug: 'kamen-rider',
        label: 'Kamen Rider',
        searchTerms: ['kamen rider', 'kamen-rider', 'geats', 'gotchard', 'gavv', 'zero-one', 'zi-o', 'build', 'decade'],
      },
      {
        slug: 'super-sentai',
        label: 'Super Sentai',
        searchTerms: ['super sentai', 'super-sentai', 'gaoranger', 'sentai', 'king-ohger', 'boonboomger', 'donbrothers', 'gokaiger', 'shinkenger'],
      },
      {
        slug: 'ultraman',
        label: 'Ultraman',
        searchTerms: ['ultraman', 'ultra-man', 'siêu nhân điện quang'],
      },
      {
        slug: 'power-rangers',
        label: 'Power Rangers',
        searchTerms: ['power rangers', 'power-rangers'],
      },
    ],
    theme: {
      panel: 'border-[#ff4d4f]/25 bg-[#171013]',
      glow: 'bg-[#ff4d4f]/20',
      line: 'bg-[#ffa940]',
      accent: 'text-[#ffa940]',
      title: 'text-[#fff1f0]',
      badge: 'bg-[#ff4d4f]/10 text-[#ff7875]',
      button:
        'border-[#ffa940]/35 bg-[#ffa940]/10 text-[#ffe7ba] hover:bg-[#ffa940] hover:text-[#1f1008]',
      activeChip: 'border-[#ff4d4f] bg-[#ff4d4f] text-[#ffffff] shadow-[#ff4d4f]/25',
      chip: 'border-[#ffa940]/20 bg-white/[0.035] text-[#ffd591] hover:border-[#ff4d4f]/70 hover:bg-[#ff4d4f]/10',
      heroGlow: 'bg-[#d4380d]/30',
    },
  },
} as const;

export type FranchiseSlug = keyof typeof FRANCHISES;

export type FranchiseFormat = 'all' | 'movie' | 'series';

export interface FranchiseMovieCharacter {
  readonly slug: string;
  readonly label: string;
  readonly searchTerms: readonly string[];
}

export function isFranchiseSlug(value: string): value is FranchiseSlug {
  return value in FRANCHISES;
}
