// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  runtimeConfig: {
    sessionSecret: process.env.NUXT_SESSION_SECRET || 'cambia-esta-clave-en-produccion'
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxt/ui'
  ],
  css: ['~/assets/css/main.css'],
  ui: {
    fonts: false
  }
})
