import React from 'react';

// This component is temporarily disabled to comply with Google AdSense policies
// Ad placeholders that look like real ads can cause policy violations
// Re-enable only when implementing actual Google AdSense ad units

interface AdPlaceholderProps {
  size: 'banner' | 'square' | 'rectangle' | 'sidebar' | 'wide';
  className?: string;
}

export const AdPlaceholder: React.FC<AdPlaceholderProps> = () => {
  // Return null to completely hide ad placeholders in production
  // This prevents Google AdSense policy violations for "fake ads"
  return null;
};

// Specific ad components for common placements - all disabled
export const BannerAd: React.FC<{ className?: string }> = () => null;

export const SidebarAd: React.FC<{ className?: string }> = () => null;

export const SquareAd: React.FC<{ className?: string }> = () => null;

export const RectangleAd: React.FC<{ className?: string }> = () => null;

export const WideAd: React.FC<{ className?: string }> = () => null;
