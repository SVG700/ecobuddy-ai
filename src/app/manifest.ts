import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EcoBuddy AI Carbon Footprint Tracker',
    short_name: 'EcoBuddy AI',
    description: 'Track, understand, and reduce your carbon footprint through AI-powered insights.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#09090b', // zinc-950
    theme_color: '#10b981',      // emerald-500
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  };
}
