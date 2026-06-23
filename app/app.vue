<script setup lang="ts">
useHead({
  titleTemplate: (title) => title ? `${title} · ABR Store` : 'ABR Store',
  meta: [{ name: 'description', content: 'Tu cuenta de ABR Store' }],
  htmlAttrs: { lang: 'es' }
})
</script>

<template>
  <UApp :toaster="{ position: 'top-right' }">
    <NuxtPage />
  </UApp>
</template>
