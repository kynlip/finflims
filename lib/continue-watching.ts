export interface ContinueWatchingItem {
  slug: string;
  name: string;
  poster_url?: string;
  thumb_url?: string;
  episode: string;
  episodeName?: string;
  server: string;
  serverName?: string;
  currentTime: number;
  duration: number;
  progressPercent: number;
  updatedAt: number;
}

const STORAGE_KEY = 'hoathinh_continue_watching';
const MAX_ITEMS = 20;

export function getContinueWatchingList(): ContinueWatchingItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: ContinueWatchingItem[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (err) {
    console.error('Error reading continue watching list:', err);
    return [];
  }
}

export function saveWatchProgress(item: {
  slug: string;
  name: string;
  poster_url?: string;
  thumb_url?: string;
  episode: string;
  episodeName?: string;
  server: string;
  serverName?: string;
  currentTime: number;
  duration: number;
}) {
  if (typeof window === 'undefined' || !item.slug) return;

  try {
    const duration = item.duration || 0;
    const currentTime = item.currentTime || 0;
    const progressPercent = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

    // Skip if watched less than 5 seconds or already completed (over 96%)
    if (currentTime < 5 && progressPercent < 2) return;

    const list = getContinueWatchingList();
    const filtered = list.filter((x) => x.slug !== item.slug);

    const newItem: ContinueWatchingItem = {
      slug: item.slug,
      name: item.name || item.slug,
      poster_url: item.poster_url || '',
      thumb_url: item.thumb_url || item.poster_url || '',
      episode: item.episode || 'tap-1',
      episodeName: item.episodeName || item.episode || 'Tập 1',
      server: item.server || 'server-1',
      serverName: item.serverName || '',
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration),
      progressPercent: progressPercent,
      updatedAt: Date.now(),
    };

    const updatedList = [newItem, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));

    // Dispatch event so other components update in real-time
    window.dispatchEvent(new CustomEvent('continue_watching_updated', { detail: updatedList }));
  } catch (err) {
    console.error('Error saving watch progress:', err);
  }
}

export function removeContinueWatchingItem(slug: string): ContinueWatchingItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const list = getContinueWatchingList();
    const updated = list.filter((x) => x.slug !== slug);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('continue_watching_updated', { detail: updated }));
    return updated;
  } catch (err) {
    console.error('Error removing continue watching item:', err);
    return [];
  }
}

export function clearContinueWatching() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('continue_watching_updated', { detail: [] }));
  } catch (err) {
    console.error('Error clearing continue watching:', err);
  }
}
