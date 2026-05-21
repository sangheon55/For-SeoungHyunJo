import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' 로 두어야 Electron의 file:// 로딩에서도 경로가 맞는다.
export default defineConfig({
  plugins: [react()],
  base: './',
})
