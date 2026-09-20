export default function manifest() {
  return {
    name: 'SVIT ERP',
    short_name: 'SVIT ERP',
    description: 'Mobile-first student ERP for SVIT.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#eef3f7',
    theme_color: '#0f766e',
    icons: [
      {
        src: '/svit-logo-v3.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/svit-logo-v3.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/svit-logo-v3.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
