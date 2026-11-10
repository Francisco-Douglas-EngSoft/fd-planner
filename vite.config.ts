import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    // Performance optimizations
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: mode === 'development',
    // Strip console.log/debug in production
    ...(mode === 'production' && {
      esbuild: {
        drop: ['console', 'debugger'],
      },
    }),
    rollupOptions: {
      output: {
        // Code splitting for better caching
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-tooltip'],
          'vendor-utils': ['date-fns', 'zod', 'clsx', 'tailwind-merge'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts': ['recharts'],
        },
        // Asset file naming for better caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 500,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // O service worker é registrado APENAS por src/pwa/registerServiceWorker.ts
      // (protegido contra iframes e ambiente dev). Nunca injetar automaticamente.
      injectRegister: null,
      // Não emite nem registra service worker em modo dev.
      devOptions: { enabled: false },
      filename: "sw.js",
      includeAssets: [
        "favicon.ico",
        "favicon.png",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png",
        "icon-512-maskable.png",
        "og-image.png",
      ],
      manifest: {
        name: "FD-Planner",
        short_name: "FD-Planner",
        description: "Sistema moderno de gerenciamento de cursos e estudos. Organize seus planejamentos, acompanhe seu progresso e maximize sua produtividade.",
        theme_color: "#101113",
        background_color: "#101113",
        display: "standalone",
        display_override: ["standalone"],
        orientation: "any",
        start_url: "/dashboard",
        scope: "/",
        lang: "pt-BR",
        dir: "ltr",
        categories: ["education", "productivity"],
        prefer_related_applications: false,
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        screenshots: [
          {
            src: "/og-image.png",
            sizes: "1920x1080",
            type: "image/png",
            form_factor: "wide",
            label: "FD-Planner Dashboard"
          },
          {
            src: "/og-image.png",
            sizes: "540x720",
            type: "image/png",
            form_factor: "narrow",
            label: "FD-Planner Mobile"
          }
        ],
        shortcuts: [
          {
            name: "Timer de Foco",
            short_name: "Foco",
            url: "/?shortcut=foco",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }]
          },
          {
            name: "Meus Cursos",
            short_name: "Cursos",
            url: "/?shortcut=cursos",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }]
          },
          {
            name: "AntiVício",
            short_name: "AntiVício",
            url: "/?shortcut=antivicio",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }]
          }
        ],
        related_applications: [],
        handle_links: "preferred"
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,jpeg,jpg}"],
        // Só trata o toque nos avisos dos lembretes (não guarda dados).
        importScripts: ["/sw-avisos.js"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Navegação (HTML) sempre tenta a rede primeiro; sem internet usa a última
        // página guardada ou o index.html pré-carregado. Nunca intercepta /~oauth.
        navigateFallback: null,
        // Precache critical assets
        additionalManifestEntries: [
          { url: '/favicon.png', revision: null },
          { url: '/icon-192.png', revision: null },
          { url: '/icon-512.png', revision: null },
        ],
        // Dados do Supabase NÃO passam pelo service worker: o app guarda as
        // respostas por usuário e controla a fila de envio (src/lib/offline).
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
            handler: "NetworkFirst",
            options: {
              cacheName: "app-pages",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 30 },
              // Sem rede e sem cópia da página: abre o index.html pré-carregado.
              precacheFallback: { fallbackURL: "/index.html" },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "prosemirror-model",
      "prosemirror-transform",
      "prosemirror-state",
      "prosemirror-view",
      "prosemirror-commands",
      "prosemirror-keymap",
      "prosemirror-schema-list",
      "prosemirror-history",
      "prosemirror-inputrules",
      "prosemirror-dropcursor",
      "prosemirror-gapcursor",
    ],
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
  },
}));
