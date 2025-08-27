import React from 'react';
import { observer } from 'mobx-react-lite';

// This component is temporarily disabled to comply with Google AdSense policies
// Fake ads that look like real ads can cause policy violations
// Re-enable only when implementing actual Google AdSense ad units

interface AdWithUpgradeProps {
  size: 'banner' | 'square' | 'rectangle' | 'sidebar' | 'wide';
  className?: string;
  showUpgradePrompt?: boolean;
}

export const AdWithUpgrade: React.FC<AdWithUpgradeProps> = observer(() => {
  // Return null to completely hide ad placeholders
  // This prevents Google AdSense policy violations for "fake ads"
  return null;
});

// Enhanced ad components that include upgrade prompts - all disabled
export const BannerAdWithUpgrade: React.FC<{ className?: string; showUpgradePrompt?: boolean }> = () => null;

export const WideAdWithUpgrade: React.FC<{ className?: string; showUpgradePrompt?: boolean }> = () => null;

export const SidebarAdWithUpgrade: React.FC<{
  className?: string;
  showUpgradePrompt?: boolean;
}> = () => null;

export const SquareAdWithUpgrade: React.FC<{ className?: string; showUpgradePrompt?: boolean }> = () => null;

export const RectangleAdWithUpgrade: React.FC<{
  className?: string;
  showUpgradePrompt?: boolean;
}> = () => null;
