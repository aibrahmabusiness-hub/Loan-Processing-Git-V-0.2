import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages requires the repo name as the base path
  // 'Loan-Processing-Git V 0.1' becomes 'Loan-Processing-Git-V-0.1' in the URL
  base: '/Loan-Processing-Git-V-0.1/', 
})