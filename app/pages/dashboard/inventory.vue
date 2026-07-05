<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
await navigateTo('/dashboard/products', { replace: true })
</script>

<template>
 <div />
</template>
