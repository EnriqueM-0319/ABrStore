<script setup lang="ts">
defineProps<{ label: string; name: string; type?: string; placeholder?: string; autocomplete?: string; modelValue: string; min?: string; step?: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
 <UFormField :label="label" :name="name" required class="w-full" :ui="{ label: 'text-sm font-semibold text-slate-800 dark:text-slate-200' }">
 <UInput
 :id="name" :name="name" :type="type || 'text'" :model-value="modelValue" :placeholder="placeholder"
 :autocomplete="autocomplete" required size="xl" color="neutral" variant="outline" class="w-full"
 :min="min" :step="step"
 :ui="{ base: 'rounded-xl bg-white text-slate-950 placeholder:text-slate-400 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500' }"
 @update:model-value="$emit('update:modelValue', String($event))"
 />
 </UFormField>
</template>
