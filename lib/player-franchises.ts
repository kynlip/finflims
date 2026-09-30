export type FranchiseType = 'conan' | 'doraemon' | 'sieu-nhan' | null;

export interface FranchisePlayerTheme {
  id: 'conan' | 'doraemon' | 'sieu-nhan';
  name: string;
  badgeLabel: string;
  badgeIcon: string;
  skipLabel: string;
  defaultSkipSec: number;
  autoNextOnLabel: string;
  autoNextOffLabel: string;
  nextEpLabel: string;
  prevEpLabel: string;
  floatingNextLabel: string;
  badgeClass: string;
  nextButtonClass: string;
  nextIconClass: string;
  floatingContainerClass: string;
  floatingButtonClass: string;
}

export function detectFranchise(movie?: {
  slug?: string;
  name?: string;
  origin_name?: string;
  category?: Array<{ slug: string; name: string }>;
}): FranchiseType {
  if (!movie) return null;
  const s = (movie.slug || '').toLowerCase();
  const n = (movie.name || '').toLowerCase();
  const o = (movie.origin_name || '').toLowerCase();
  const text = `${s} ${n} ${o}`;

  // 1. Conan
  if (
    (text.includes('conan') || s.includes('conan')) &&
    !text.includes('future-boy-conan') &&
    !text.includes('conan-cau-be-tuong-lai')
  ) {
    return 'conan';
  }

  // 2. Doraemon
  if (text.includes('doraemon') || text.includes('doremon') || s.includes('doraemon')) {
    return 'doraemon';
  }

  // 3. Siêu Nhân / Tokusatsu
  const sieuNhanKeywords = [
    'sieu-nhan',
    'siêu nhân',
    'kamen-rider',
    'kamen rider',
    'super-sentai',
    'super sentai',
    'ultraman',
    'power-rangers',
    'power rangers',
    'gaoranger',
    'tokusatsu',
    'geats',
    'gotchard',
    'gavv',
    'king-ohger',
    'boonboomger',
    'donbrothers',
    'zero-one',
    'zi-o',
    'build',
    'decade',
    'gokaiger',
    'shinkenger',
    'dekaranger',
  ];
  if (sieuNhanKeywords.some((k) => text.includes(k))) {
    return 'sieu-nhan';
  }

  return null;
}

export const FRANCHISE_PLAYER_THEMES: Record<'conan' | 'doraemon' | 'sieu-nhan', FranchisePlayerTheme> = {
  conan: {
    id: 'conan',
    name: 'Thám Tử Conan',
    badgeLabel: 'Thám Tử Conan',
    badgeIcon: '🕵️',
    skipLabel: 'Bỏ qua Intro',
    defaultSkipSec: 85,
    autoNextOnLabel: 'Tự chuyển tập',
    autoNextOffLabel: 'Tự chuyển: Tắt',
    nextEpLabel: 'Tập tiếp theo',
    prevEpLabel: 'Tập trước',
    floatingNextLabel: 'Tập tiếp theo',
    badgeClass: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
    nextButtonClass: 'bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md shadow-rose-600/25',
    nextIconClass: 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10',
    floatingContainerClass: 'border-rose-500/30 bg-black/85 shadow-2xl ring-1 ring-rose-500/20',
    floatingButtonClass: 'bg-rose-600 hover:bg-rose-500 text-white font-bold',
  },
  doraemon: {
    id: 'doraemon',
    name: 'Bảo Bối Doraemon',
    badgeLabel: 'Bảo Bối Doraemon',
    badgeIcon: '🔔',
    skipLabel: 'Bỏ qua Intro',
    defaultSkipSec: 85,
    autoNextOnLabel: 'Tự chuyển tập',
    autoNextOffLabel: 'Tự chuyển: Tắt',
    nextEpLabel: 'Tập tiếp theo',
    prevEpLabel: 'Tập trước',
    floatingNextLabel: 'Tập tiếp theo',
    badgeClass: 'text-sky-300 border-sky-500/30 bg-sky-500/10',
    nextButtonClass: 'bg-sky-500 hover:bg-sky-400 text-white font-bold shadow-md shadow-sky-500/25',
    nextIconClass: 'text-sky-400 hover:text-sky-300 hover:bg-sky-500/10',
    floatingContainerClass: 'border-sky-500/30 bg-black/85 shadow-2xl ring-1 ring-sky-500/20',
    floatingButtonClass: 'bg-sky-500 hover:bg-sky-400 text-white font-bold',
  },
  'sieu-nhan': {
    id: 'sieu-nhan',
    name: 'Siêu Nhân & Tokusatsu',
    badgeLabel: 'Siêu Nhân Tokusatsu',
    badgeIcon: '⚡',
    skipLabel: 'Bỏ qua Intro',
    defaultSkipSec: 90,
    autoNextOnLabel: 'Tự chuyển tập',
    autoNextOffLabel: 'Tự chuyển: Tắt',
    nextEpLabel: 'Tập tiếp theo',
    prevEpLabel: 'Tập trước',
    floatingNextLabel: 'Tập tiếp theo',
    badgeClass: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
    nextButtonClass: 'bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-md shadow-amber-500/25',
    nextIconClass: 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10',
    floatingContainerClass: 'border-amber-500/30 bg-black/85 shadow-2xl ring-1 ring-amber-500/20',
    floatingButtonClass: 'bg-amber-500 hover:bg-amber-400 text-black font-bold',
  },
};
