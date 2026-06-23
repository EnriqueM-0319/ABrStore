<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
await navigateTo('/dashboard/ventas', { replace: true })
</script>
