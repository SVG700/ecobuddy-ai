'use client';

import { useEffect } from 'react';

export const PWARegistration: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('EcoBuddy AI ServiceWorker registration successful with scope:', registration.scope);
        } catch (error) {
          console.error('EcoBuddy AI ServiceWorker registration failed:', error);
        }
      };

      // Register immediately or after load
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  return null;
};

export default PWARegistration;
