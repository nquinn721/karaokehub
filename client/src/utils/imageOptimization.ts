import { useEffect, useState } from 'react';

/**
 * Image optimization utilities for better loading performance
 */

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  blur?: boolean;
}

/**
 * Optimizes image URL for better loading performance
 */
export const optimizeImageUrl = (originalUrl: string, options: ImageOptions = {}): string => {
  if (!originalUrl) return originalUrl;

  const {
    width,
    height,
    quality = 50, // Reduced from 60 to 50 for even faster loading
    format = 'webp',
    blur = false
  } = options;

  // For external URLs (like album art from music services), we can't directly optimize
  // but we can prefer smaller sizes if available
  if (originalUrl.includes('coverartarchive.org') || originalUrl.includes('musicbrainz.org')) {
    // These services often have size parameters in the URL
    const url = new URL(originalUrl);
    
    // Try to set smaller size if width/height specified
    if (width && width <= 100) {
      url.searchParams.set('size', '100');
    } else if (width && width <= 300) {
      url.searchParams.set('size', '300');
    }
    
    return url.toString();
  }

  // For local images, apply query parameters for optimization
  if (originalUrl.startsWith('/') || originalUrl.includes(window.location.origin)) {
    const url = new URL(originalUrl, window.location.origin);
    
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    if (quality < 100) url.searchParams.set('q', quality.toString());
    if (format !== 'jpeg') url.searchParams.set('f', format);
    if (blur) url.searchParams.set('blur', '5');
    
    return url.toString();
  }

  return originalUrl;
};

/**
 * Gets the appropriate image size based on component usage
 */
export const getOptimizedAlbumArt = (
  albumArt: { small?: string; medium?: string; large?: string } | undefined,
  size: 'thumbnail' | 'card' | 'detail' = 'thumbnail'
): string => {
  if (!albumArt) return '';

  // For thumbnails (list items), prefer small/low quality
  if (size === 'thumbnail' && albumArt.small) {
    return optimizeImageUrl(albumArt.small, { 
      width: 48, 
      height: 48, 
      quality: 40 // Very low quality for fast loading
    });
  }

  // For cards, use medium with reduced quality
  if (size === 'card') {
    const baseUrl = albumArt.medium || albumArt.small || albumArt.large;
    return optimizeImageUrl(baseUrl || '', { 
      width: 200, 
      height: 200, 
      quality: 50 // Reduced quality
    });
  }

  // For detail views, use medium quality (not full quality)
  const baseUrl = albumArt.large || albumArt.medium || albumArt.small;
  return optimizeImageUrl(baseUrl || '', { 
    width: 400, 
    height: 400, 
    quality: 65 // Still good quality but not maximum
  });
};

/**
 * Preloads images with low quality first, then high quality
 */
export const preloadImageWithProgressiveQuality = (
  src: string,
  onLowQualityLoad?: () => void,
  onHighQualityLoad?: () => void
): void => {
  // First load a very low quality version
  const lowQualityImg = new Image();
  lowQualityImg.onload = () => {
    onLowQualityLoad?.();
    
    // Then load the normal quality version
    const highQualityImg = new Image();
    highQualityImg.onload = () => onHighQualityLoad?.();
    highQualityImg.src = src;
  };
  
  lowQualityImg.src = optimizeImageUrl(src, { quality: 20, blur: true });
};

/**
 * Creates a placeholder image URL with specified dimensions and quality
 */
export const createPlaceholderImage = (
  width: number,
  height: number,
  text?: string
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f0f0f0');
  gradient.addColorStop(1, '#e0e0e0');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add text if provided
  if (text) {
    ctx.fillStyle = '#999';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
  }
  
  return canvas.toDataURL('image/jpeg', 0.5); // Low quality placeholder
};

/**
 * React hook for progressive image loading
 */
export const useProgressiveImage = (src: string) => {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!src) {
      setCurrentSrc('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Start with placeholder
    const placeholder = createPlaceholderImage(100, 100, '♪');
    setCurrentSrc(placeholder);

    // Load low quality first
    preloadImageWithProgressiveQuality(
      src,
      () => {
        // Low quality loaded
        setCurrentSrc(optimizeImageUrl(src, { quality: 30 }));
      },
      () => {
        // High quality loaded
        setCurrentSrc(src);
        setIsLoading(false);
      }
    );
  }, [src]);

  return { src: currentSrc, isLoading };
};
