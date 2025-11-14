import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/kiosk/', // GitHub Pages에서 사용할 base path (리포지토리 이름)
})

