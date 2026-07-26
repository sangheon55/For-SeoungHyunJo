import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import kaguyaHandler from './api/kaguya.js'

function localKaguyaApi() {
  return {
    name: 'local-kaguya-api',
    configureServer(server) {
      server.middlewares.use('/api/kaguya', async (req, res) => {
        let raw = ''
        for await (const chunk of req) raw += chunk
        try {
          req.body = raw ? JSON.parse(raw) : {}
        } catch {
          req.body = {}
        }
        res.status = (code) => {
          res.statusCode = code
          return res
        }
        res.json = (body) => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(body))
          return res
        }
        await kaguyaHandler(req, res)
      })
    },
  }
}

// base는 배포 위치가 정해지면 빌드 시 VITE_BASE_PATH로 넘긴다(예: 서브패스 배포 시 '/planner/').
// 기본값 '/'는 루트 도메인 배포 기준.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  process.env.OPENAI_API_KEY = env.OPENAI_API_KEY
  process.env.KAGUYA_ACCESS_TOKEN = env.KAGUYA_ACCESS_TOKEN

  return {
  plugins: [
    react(),
    localKaguyaApi(),
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
        // 원본 캐릭터 PNG는 장당 4~5MB다. 설치 시 전부 내려받지 않고,
        // 실제 표시된 표정만 런타임 캐시에 보관한다.
        globIgnores: ['assets/kaguya/**', 'assets/characters/**'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(?:kaguya|characters)\/.*\.(?:png|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kaguya-character-images',
              expiration: {
                maxEntries: 24,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  base: process.env.VITE_BASE_PATH || '/',
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'react-vendor'
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase-vendor'
          if (id.includes('/dexie/')) return 'storage-vendor'
        },
      },
    },
  },
  }
})
