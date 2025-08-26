import { faCrown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, ButtonProps } from '@mui/material';
import React, { useState } from 'react';
import { SubscriptionUpgradeModal } from './SubscriptionUpgradeModal';

interface UpgradeButtonProps extends Omit<ButtonProps, 'onClick'> {
  currentPlan?: 'free' | 'ad_free' | 'premium';
  modalTitle?: string;
  modalDescription?: string;
}

export const UpgradeButton: React.FC<UpgradeButtonProps> = ({
  currentPlan = 'free',
  modalTitle,
  modalDescription,
  children,
  ...buttonProps
}) => {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Don't show upgrade button if already on highest plan
  if (currentPlan === 'premium') {
    return null;
  }

  const getButtonText = () => {
    if (children) return children;

    switch (currentPlan) {
      case 'free':
        return 'Upgrade to Premium';
      case 'ad_free':
        return 'Upgrade to Premium';
      default:
        return 'Upgrade';
    }
  };

  const getDefaultModalTitle = () => {
    if (modalTitle) return modalTitle;

    switch (currentPlan) {
      case 'free':
        return 'Unlock Premium Features';
      case 'ad_free':
        return 'Upgrade to Premium';
      default:
        return 'Upgrade Your Experience';
    }
  };

  const getDefaultModalDescription = () => {
    if (modalDescription) return modalDescription;

    switch (currentPlan) {
      case 'free':
        return 'Get unlimited favorites, song previews, ad-free experience, and priority support.';
      case 'ad_free':
        return 'Unlock unlimited favorites and song previews with Premium.';
      default:
        return 'Choose the perfect plan to enhance your karaoke experience.';
    }
  };

  return (
    <>
      <Button
        {...buttonProps}
        onClick={() => setUpgradeModalOpen(true)}
        startIcon={<FontAwesomeIcon icon={faCrown} />}
      >
        {getButtonText()}
      </Button>

      <SubscriptionUpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        currentPlan={currentPlan}
        title={getDefaultModalTitle()}
        description={getDefaultModalDescription()}
      />
    </>
  );
};
