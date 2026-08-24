import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://andiescott-hub.github.io/pokemonmaker/ — keep base in
// sync with the repo name if it ever changes.
export default defineConfig({
  base: '/pokemonmaker/',
  plugins: [react()],
  server: {
    host: true,
  },
})
