/**
 * Performance optimizations specifically for music-related data and images
 */

import { MusicSearchResult } from '../stores/MusicStore';

/**
 * Optimizes music search results for faster rendering
 */
export const optimizeMusicResults = (
  results: MusicSearchResult[],
  maxResults: number = 50,
): MusicSearchResult[] => {
  // Limit results to prevent performance issues
  const limitedResults = results.slice(0, maxResults);

  return limitedResults.map((song) => ({
    ...song,
    // Only keep small artwork for list views to save memory
    albumArt: song.albumArt
      ? {
          small: song.albumArt.small,
          // Only keep medium/large for first 20 items
          ...(limitedResults.indexOf(song) < 20 && {
            medium: song.albumArt.medium,
            large: song.albumArt.large,
          }),
        }
      : undefined,
  }));
};

/**
 * Preloads images for the first few music results
 */
export const preloadMusicImages = (results: MusicSearchResult[], count: number = 5): void => {
  results.slice(0, count).forEach((song) => {
    if (song.albumArt?.small) {
      const img = new Image();
      img.src = song.albumArt.small;
      // Preload but don't wait for completion
    }
  });
};

/**
 * Creates an intersection observer for lazy loading music images
 */
export const createMusicImageObserver = (
  callback: (entry: IntersectionObserverEntry) => void,
): IntersectionObserver => {
  return new IntersectionObserver(
    (entries) => {
      entries.forEach(callback);
    },
    {
      root: null,
      rootMargin: '50px', // Load images 50px before they become visible
      threshold: 0.1,
    },
  );
};

/**
 * Debounced function for search input
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Optimizes category data for better loading
 */
export const optimizeCategories = (categories: any[]) => {
  return categories.map((category) => ({
    ...category,
    // Compress category images
    image: category.image ? `${category.image}?w=200&h=200&q=50` : category.image,
  }));
};
