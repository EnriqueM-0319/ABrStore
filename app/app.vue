<script setup lang="ts">
useHead({
 titleTemplate: (title) => title ? `${title} · Abarrotes Alex` : 'Abarrotes Alex',
 meta: [{ name: 'description', content: 'Sistema de inventario y punto de venta de Abarrotes Alex' }],
 htmlAttrs: { lang: 'es' }
})
</script>

<template>
 <UApp :toaster="{ position: 'top-right' }">
 <NuxtPage />
 </UApp>
</template>
