<script setup lang="ts">
defineProps<{ label: string; name: string; type?: string; placeholder?: string; autocomplete?: string; modelValue: string; min?: string; step?: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
 <UFormField :label="label" :name="name" required class="w-full" :ui="{ label: 'text-sm font-semibold text-[#2b3731]' }">
 <UInput
 :id="name" :name="name" :type="type || 'text'" :model-value="modelValue" :placeholder="placeholder"
 :autocomplete="autocomplete" required size="xl" color="neutral" variant="outline" class="w-full"
 :min="min" :step="step"
 :ui="{ base: 'rounded-xl bg-white text-[#17221d] placeholder:text-[#8b958f]' }"
 @update:model-value="$emit('update:modelValue', String($event))"
 />
 </UFormField>
</template>
