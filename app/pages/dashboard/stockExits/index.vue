<script setup lang="ts">
import type { Product, StockExit, StockExitReason } from '~/types'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Registrar salida' })

const search = ref('')
const debouncedSearch = ref('')
const selectedProduct = ref<Product | null>(null)
const form = reactive({ quantity: '', reason: 'EXPIRED' as StockExitReason, note: '' })
const saving = ref(false)
const formError = ref('')
const lastExit = ref<StockExit | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | undefined
const toast = useToast()
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const reasonOptions = [{ label: 'Caducidad', value: 'EXPIRED' }, { label: 'Producto dañado', value: 'DAMAGED' }]

watch(search, (value) => {
 clearTimeout(searchTimer)
 searchTimer = setTimeout(() => {
 debouncedSearch.value = value.trim()
 }, 250)
})
onBeforeUnmount(() => clearTimeout(searchTimer))

const { data: products, status: productStatus, error: productError, refresh: refreshProducts } = useFetch<Product[]>('/api/products', {
 query: { search: debouncedSearch },
 default: () => [],
 lazy: true,
 server: false,
 watch: [debouncedSearch]
})

const isSearchingProducts = computed(() => productStatus.value === 'pending' && Boolean(debouncedSearch.value))

function selectProduct(product: Product) {
 selectedProduct.value = product
 form.quantity = product.unit === 'KILOGRAM' ? '0.001' : '1'
 formError.value = ''
}

async function registerExit() {
 if (!selectedProduct.value) return
 saving.value = true
 formError.value = ''
 try {
 const stockExit = await $fetch<StockExit>('/api/stockExits', {
 method: 'POST',
 body: {
 productId: selectedProduct.value.id,
 quantity: Number(form.quantity),
 reason: form.reason,
 note: form.note
 }
 })
 lastExit.value = stockExit
 toast.add({ title: 'Salida registrada', description: `${stockExit.name} fue descontado del inventario.`, color: 'success', icon: 'i-lucide-package-minus' })
 selectedProduct.value = null
 Object.assign(form, { quantity: '', reason: 'EXPIRED', note: '' })
 await refreshProducts()
 } catch (error: unknown) {
 formError.value = getErrorMessage(error, 'No pudimos registrar la salida.')
 toast.add({ title: 'No se pudo registrar', description: formError.value, color: 'error', icon: 'i-lucide-circle-alert' })
 } finally {
 saving.value = false
 }
}
</script>

<template>
 <DashboardShell eyebrow="Inventario" title="Registrar salida">
 <div class="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
 <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', header: 'p-5 sm:px-6', body: 'p-5 sm:px-6' }">
 <template #header>
 <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
 <div>
 <h2 class="font-bold">Salida por caducidad o daño</h2>
 <p class="mt-1 text-sm text-[#64748b] dark:text-slate-300">Selecciona un producto, registra la cantidad y deja una nota si hace falta.</p>
 </div>
 <UButton to="/dashboard/stockExits/history" label="Ver historial" icon="i-lucide-list" variant="soft" />
 </div>
 </template>

 <div class="space-y-5">
 <UFormField label="Buscar producto" name="product-search">
 <UInput v-model="search" icon="i-lucide-search" placeholder="Nombre o SKU" autocomplete="off" class="w-full" :ui="{ base: 'bg-white text-slate-950 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400' }" />
 </UFormField>

 <div v-if="isSearchingProducts" class="flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" role="status" aria-live="polite">
 <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
 <span>Buscando productos…</span>
 </div>
 <UAlert v-else-if="productError" color="error" variant="soft" title="No pudimos buscar productos">
 <template #actions><UButton label="Reintentar" color="error" variant="soft" size="sm" @click="refreshProducts()" /></template>
 </UAlert>

 <div v-if="products.length" class="overflow-hidden rounded-2xl border border-[#d8e7f1] bg-white dark:border-slate-600 dark:bg-slate-800">
 <ul class="divide-y divide-[#d8e7f1] dark:divide-slate-600" aria-label="Productos encontrados">
 <li v-for="product in products" :key="product.id">
 <button class="flex w-full items-center gap-3 p-4 text-left transition hover:bg-[#f1f6fa] dark:hover:bg-slate-700" :class="selectedProduct?.id === product.id ? 'bg-[#e8f1f7] dark:bg-slate-700' : ''" @click="selectProduct(product)">
 <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1f6fa] text-[#456a88] dark:bg-slate-700 dark:text-[#c8d6df]"><UIcon name="i-lucide-package" class="size-5" /></span>
 <span class="min-w-0 flex-1"><span class="block truncate text-sm font-semibold text-slate-950 dark:text-slate-100">{{ product.name }}</span><span class="mt-1 block text-xs text-[#64748b] dark:text-slate-300">{{ product.sku }} · {{ product.stock }} {{ product.unit === 'KILOGRAM' ? 'kg' : 'pzas' }}</span></span>
 <span class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ currency.format(product.price) }}</span>
 </button>
 </li>
 </ul>
 </div>

 <form v-if="selectedProduct" class="space-y-4 rounded-2xl border border-[#d8e7f1] bg-[#f7fafc] p-4 dark:border-slate-600 dark:bg-slate-800" @submit.prevent="registerExit">
 <div>
 <p class="font-semibold">{{ selectedProduct.name }}</p>
 <p class="mt-1 text-xs text-[#64748b] dark:text-slate-300">Disponible: {{ selectedProduct.stock }} {{ selectedProduct.unit === 'KILOGRAM' ? 'kg' : 'pzas' }}</p>
 </div>
 <div class="grid gap-3 sm:grid-cols-2">
 <UFormField label="Motivo" name="reason" required><USelect v-model="form.reason" :items="reasonOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
 <UFormField :label="selectedProduct.unit === 'KILOGRAM' ? 'Cantidad en kg' : 'Cantidad'" name="quantity" required>
 <UInput v-model="form.quantity" type="number" inputmode="decimal" min="0" :max="selectedProduct.stock" :step="selectedProduct.unit === 'KILOGRAM' ? '0.001' : '1'" class="w-full" />
 </UFormField>
 </div>
 <UFormField label="Nota" name="note"><UTextarea v-model="form.note" :rows="3" placeholder="Ej. Lote caducado, empaque roto, producto golpeado…" class="w-full" /></UFormField>
 <ActionFeedback v-if="formError" :message="formError" type="error" @dismiss="formError = ''" />
 <UButton type="submit" block label="Registrar salida" icon="i-lucide-package-minus" :loading="saving" />
 </form>

 <ActionFeedback v-if="lastExit" :message="`Última salida: ${lastExit.name} (${lastExit.quantity} ${lastExit.unit === 'KILOGRAM' ? 'kg' : 'pzas'}).`" @dismiss="lastExit = null" />
 </div>
 </UCard>
 </div>
 </DashboardShell>
</template>
