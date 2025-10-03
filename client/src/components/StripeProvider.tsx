import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { apiStore } from '../stores';

// Cache for stripe instances to avoid recreating them
const stripeInstanceCache = new Map<string, Promise<Stripe | null>>();

interface StripeProviderProps {
  children: React.ReactNode;
  clientSecret?: string;
}

const StripeProvider: React.FC<StripeProviderProps> = observer(({ children, clientSecret }) => {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    const initializeStripe = async () => {
      // Wait for config to be loaded
      if (!apiStore.configLoaded) {
        await apiStore.fetchClientConfig();
      }

      const publishableKey = apiStore.stripePublishableKey;
      
      if (!publishableKey) {
        console.warn('Stripe publishable key not available from server config');
        return;
      }

      // Check cache first
      if (stripeInstanceCache.has(publishableKey)) {
        setStripePromise(stripeInstanceCache.get(publishableKey)!);
        return;
      }

      // Create new instance and cache it
      const newStripePromise = loadStripe(publishableKey);
      stripeInstanceCache.set(publishableKey, newStripePromise);
      setStripePromise(newStripePromise);
    };

    initializeStripe().catch(console.error);
  }, [apiStore.configLoaded, apiStore.stripePublishableKey]);

  // Don't render until we have a stripe instance
  if (!stripePromise) {
    return <div>Loading payment system...</div>;
  }
  const options = {
    clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: {
        colorPrimary: '#1976d2',
        colorBackground: '#1a1a2e',
        colorText: '#ffffff',
        colorDanger: '#df1b41',
        fontFamily: 'Roboto, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={clientSecret ? options : undefined}>
      {children}
    </Elements>
  );
});

export default StripeProvider;
