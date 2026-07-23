import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base는 배포 위치가 정해지면 빌드 시 VITE_BASE_PATH로 넘긴다(예: 서브패스 배포 시 '/planner/').
// 기본값 '/'는 루트 도메인 배포 기준.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: '조성현 합격 플래너',
        short_name: '합격 플래너',
        description: '조성현을 위한 5급 기술고시 합격 플래너',
        start_url: '.',
        display: 'standalone',
        background_color: '#E8E2D4',
        theme_color: '#14161F',
        lang: 'ko',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
      },
    }),
  ],
  base: process.env.VITE_BASE_PATH || '/',
})
