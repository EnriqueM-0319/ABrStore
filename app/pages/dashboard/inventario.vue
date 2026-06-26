<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
await navigateTo('/dashboard/productos', { replace: true })
</script>

<template>
  <div />
</template>
