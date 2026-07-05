<script setup lang="ts">
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

function toggleTheme() {
 colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
 <UTooltip :text="isDark ? 'Modo claro' : 'Modo oscuro'">
 <UButton
 :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
 color="neutral"
 variant="ghost"
 :aria-label="isDark ? 'Activar modo claro' : 'Activar modo oscuro'"
 @click="toggleTheme"
 />
 </UTooltip>
</template>
