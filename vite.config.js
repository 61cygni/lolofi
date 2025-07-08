// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        galaxy: 'galaxy.html',
        starriver: 'starriver.html',
        wormhole: 'wormhole.html',
        surf: 'surf.html'
      }
    }
  }
});