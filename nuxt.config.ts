// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  app: {
    head: {
      title: 'ABR Store',
      meta: [
        { name: 'theme-color', content: '#1f4937' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'ABR Store' },
        { name: 'mobile-web-app-capable', content: 'yes' }
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icons/icon.svg' },
        { rel: 'apple-touch-icon', href: '/icons/icon.svg' }
      ]
    }
  },

  runtimeConfig: {
    sessionSecret: process.env.NUXT_SESSION_SECRET || 'cambia-esta-clave-en-produccion',
    graphqlEndpoint: process.env.NUXT_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql'
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],
  css: ['~/assets/css/main.css'],
  ui: {
    fonts: false
  }
})
