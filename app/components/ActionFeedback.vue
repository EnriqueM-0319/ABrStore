<script setup lang="ts">
withDefaults(defineProps<{ message: string; type?: 'success' | 'error' | 'warning' }>(), { type: 'success' })
defineEmits<{ dismiss: [] }>()
</script>

<template>
 <UAlert
 :color="type" variant="soft"
 :icon="type === 'success' ? 'i-lucide-circle-check' : type === 'error' ? 'i-lucide-circle-alert' : 'i-lucide-triangle-alert'"
 :description="message" :role="type === 'error' ? 'alert' : 'status'"
 :close="{ color: type, variant: 'link', 'aria-label': 'Cerrar notificación' }"
 @update:open="!$event && $emit('dismiss')"
 />
</template>
