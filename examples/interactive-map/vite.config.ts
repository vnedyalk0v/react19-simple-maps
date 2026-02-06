import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001, // Different port from basic-map example
    open: true,
    headers: {
      // Content Security Policy — DEVELOPMENT ONLY
      // 'unsafe-inline' and 'unsafe-eval' are required by Vite HMR; remove for production.
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for Vite HMR
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss: https://unpkg.com https://*.unpkg.com", // ws/wss for HMR
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
      // Additional security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '0',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  build: {
    // Security-focused build options
    rollupOptions: {
      output: {
        // Prevent code injection through dynamic imports
        manualChunks: undefined,
      },
    },
  },
});
