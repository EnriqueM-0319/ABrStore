<script setup lang="ts">
import type { Product } from '~/types/product'

const props = defineProps<{
  product?: Product | null
}>()

const emit = defineEmits<{
  saved: [product: Product]
  deactivated: [product: Product]
}>()

const open = defineModel<boolean>('open', { default: false })
const form = reactive({ sku: '', name: '', description: '', costPrice: '', profitMargin: '30', price: '', unit: 'PIECE' as Product['unit'], stock: '', stockAdjustment: '', active: true })
const autoPrice = ref(true)
const saving = ref(false)
const actionError = ref('')
const notice = ref('')
const toast = useToast()
const unitOptions = [{ label: 'Por pieza', value: 'PIECE' }, { label: 'Por kilogramo', value: 'KILOGRAM' }]
const isEditing = computed(() => Boolean(props.product?.id))
const title = computed(() => isEditing.value ? 'Editar producto' : 'Agregar producto')
const description = computed(() => isEditing.value ? 'Actualiza los datos del producto seleccionado.' : 'Registra un producto nuevo en el inventario.')
const currentStock = computed(() => Number(props.product?.stock ?? 0))
const stockAdjustment = computed(() => {
  const adjustment = Number(form.stockAdjustment)
  return Number.isFinite(adjustment) ? adjustment : 0
})
const projectedStock = computed(() => {
  const nextStock = currentStock.value + stockAdjustment.value
  return form.unit === 'PIECE' ? nextStock : Math.round(nextStock * 1000) / 1000
})
const stockUnitLabel = computed(() => form.unit === 'KILOGRAM' ? 'kg' : 'pzas')
const stockAdjustmentIsInvalid = computed(() => isEditing.value && form.unit === 'PIECE' && !Number.isInteger(stockAdjustment.value))
const projectedStockIsInvalid = computed(() => isEditing.value && (projectedStock.value < 0 || stockAdjustmentIsInvalid.value))

function resetForm() {
  Object.assign(form, {
    sku: props.product?.sku ?? '',
    name: props.product?.name ?? '',
    description: props.product?.description ?? '',
    costPrice: String(props.product?.costPrice ?? ''),
    profitMargin: String(props.product?.profitMargin ?? 30),
    price: String(props.product?.price ?? ''),
    unit: props.product?.unit ?? 'PIECE',
    stock: String(props.product?.stock ?? ''),
    stockAdjustment: '',
    active: props.product?.active ?? true
  })
  autoPrice.value = !isEditing.value
  actionError.value = ''
  notice.value = ''
}

watch(() => props.product, resetForm, { immediate: true })
watch(open, (isOpen) => {
  if (isOpen) resetForm()
})

watch([() => form.costPrice, () => form.profitMargin, autoPrice], () => {
  if (!autoPrice.value) return
  const cost = Number(form.costPrice)
  const margin = Number(form.profitMargin)
  form.price = calculatePublicPriceFromMargin(cost, margin)
})

watch([() => form.stockAdjustment, () => form.unit, () => props.product], () => {
  if (!isEditing.value) return
  form.stock = String(projectedStock.value)
})

function setManualPrice(value: string | number) {
  form.price = String(value)
  autoPrice.value = false
  const cost = Number(form.costPrice)
  const publicPrice = Number(form.price)
  const margin = calculateMarginFromPublicPrice(cost, publicPrice)
  if (margin) form.profitMargin = margin
}

async function saveProduct() {
  if (projectedStockIsInvalid.value) {
    actionError.value = stockAdjustmentIsInvalid.value ? 'La nueva cantidad por pieza debe ser un número entero.' : 'La existencia final no puede quedar debajo de cero.'
    toast.add({ title: 'Revisa existencias', description: actionError.value, color: 'warning', icon: 'i-lucide-circle-alert' })
    return
  }

  saving.value = true
  actionError.value = ''
  notice.value = ''

  try {
    if (isEditing.value) form.stock = String(projectedStock.value)
    const product = isEditing.value && props.product
      ? await $fetch<Product>(`/api/products/${props.product.id}`, { method: 'PATCH', body: form })
      : await $fetch<Product>('/api/products', { method: 'POST', body: form })

    emit('saved', product)
    notice.value = isEditing.value ? 'Producto actualizado correctamente.' : 'Producto registrado correctamente.'
    toast.add({ title: isEditing.value ? 'Producto actualizado' : 'Producto registrado', description: `${product.name} quedó guardado.`, color: 'success', icon: 'i-lucide-circle-check' })
    open.value = false
  } catch (error: unknown) {
    actionError.value = getErrorMessage(error, isEditing.value ? 'No pudimos actualizar el producto.' : 'No pudimos registrar el producto.')
    toast.add({ title: 'No se pudo guardar', description: actionError.value, color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    saving.value = false
  }
}

async function toggleActiveProduct() {
  if (!props.product) return
  if (projectedStockIsInvalid.value) {
    actionError.value = stockAdjustmentIsInvalid.value ? 'La nueva cantidad por pieza debe ser un número entero.' : 'La existencia final no puede quedar debajo de cero.'
    toast.add({ title: 'Revisa existencias', description: actionError.value, color: 'warning', icon: 'i-lucide-circle-alert' })
    return
  }

  saving.value = true
  actionError.value = ''

  try {
    form.stock = String(projectedStock.value)
    const updatedProduct = props.product.active
      ? await $fetch<Product>(`/api/products/${props.product.id}`, { method: 'PATCH', body: { ...form, active: false } })
      : await $fetch<Product>(`/api/products/${props.product.id}`, { method: 'PATCH', body: { ...form, active: true } })

    emit('deactivated', updatedProduct)
    toast.add({ title: updatedProduct.active ? 'Producto activado' : 'Producto desactivado', description: updatedProduct.active ? 'Ya está disponible para ventas.' : 'Ya no aparecerá en ventas.', color: 'success', icon: updatedProduct.active ? 'i-lucide-archive-restore' : 'i-lucide-archive' })
    open.value = false
  } catch (error: unknown) {
    actionError.value = getErrorMessage(error, 'No pudimos cambiar el estado del producto.')
    toast.add({ title: 'No se pudo cambiar el estado', description: actionError.value, color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="description">
    <template #body>
      <form class="space-y-3" @submit.prevent="saveProduct">
        <FormField v-model="form.sku" name="product-sku" label="Código SKU" placeholder="Ej. ABR-001" autocomplete="off" />
        <FormField v-model="form.name" name="product-name" label="Nombre del producto" placeholder="Ej. Arroz 1kg" autocomplete="off" />
        <UFormField label="Descripción" name="product-description">
          <UTextarea v-model="form.description" placeholder="Detalles breves del producto" :rows="2" class="w-full" :maxlength="300" />
        </UFormField>
        <div class="grid grid-cols-2 gap-3">
          <FormField v-model="form.costPrice" name="product-cost" label="Costo unitario" type="number" placeholder="0.00" autocomplete="off" />
          <FormField v-model="form.profitMargin" name="product-margin" label="Ganancia (%)" type="number" placeholder="30" autocomplete="off" />
        </div>
        <div class="rounded-xl border border-[#e2e7e3] bg-[#f8faf8] p-3">
          <div class="mb-2 flex items-center justify-between gap-3">
            <p class="text-sm font-semibold">Calcular precio automáticamente</p>
            <USwitch v-model="autoPrice" aria-label="Calcular precio al público automáticamente" />
          </div>
          <UFormField label="Precio al público" name="product-price" required>
            <UInput :model-value="form.price" type="number" inputmode="decimal" placeholder="0.00" size="lg" class="w-full" @update:model-value="setManualPrice" />
          </UFormField>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Unidad de venta" name="product-unit" required>
            <USelect v-model="form.unit" :items="unitOptions" value-key="value" label-key="label" size="lg" class="w-full" />
          </UFormField>
          <FormField
            v-if="!isEditing"
            v-model="form.stock"
            name="product-stock"
            label="Existencias"
            type="number"
            placeholder="0"
            autocomplete="off"
            min="0"
            :step="form.unit === 'PIECE' ? '1' : '0.001'"
          />
          <UFormField v-else label="Existencia actual" name="product-current-stock">
            <UInput
              :model-value="`${currentStock} ${stockUnitLabel}`"
              readonly
              size="lg"
              color="neutral"
              variant="outline"
              class="w-full"
              aria-label="Existencia actual bloqueada"
              :ui="{ base: 'rounded-xl bg-[#f3f6f4] font-semibold text-[#536057]' }"
            />
          </UFormField>
        </div>
        <div v-if="isEditing" class="rounded-xl border border-[#dce6df] bg-[#f8faf8] p-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <UFormField label="Nueva cantidad" name="product-stock-adjustment">
              <UInput
                v-model="form.stockAdjustment"
                type="number"
                inputmode="decimal"
                :step="form.unit === 'PIECE' ? '1' : '0.001'"
                placeholder="Ej. 3 o -2"
                size="lg"
                class="w-full"
                aria-label="Cantidad a sumar o restar al inventario"
                :ui="{ base: 'rounded-xl bg-white text-[#17221d] placeholder:text-[#8b958f]' }"
              />
            </UFormField>
            <UFormField label="Existencia final" name="product-projected-stock">
              <div
                class="flex min-h-12 items-center justify-between rounded-xl border px-3 text-sm"
                :class="projectedStockIsInvalid ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'"
                aria-live="polite"
              >
                <span class="font-semibold">{{ projectedStock }} {{ stockUnitLabel }}</span>
                <UBadge
                  :label="stockAdjustment >= 0 ? `+${stockAdjustment}` : String(stockAdjustment)"
                  :color="projectedStockIsInvalid ? 'error' : stockAdjustment >= 0 ? 'success' : 'warning'"
                  variant="soft"
                />
              </div>
            </UFormField>
          </div>
        </div>
        <ActionFeedback v-if="actionError" :message="actionError" type="error" @dismiss="actionError = ''" />
        <ActionFeedback v-if="notice" :message="notice" @dismiss="notice = ''" />
      </form>
    </template>

    <template #footer>
      <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
        <UButton
          v-if="isEditing"
          :label="product?.active ? 'Desactivar producto' : 'Activar producto'"
          :icon="product?.active ? 'i-lucide-archive' : 'i-lucide-archive-restore'"
          :color="product?.active ? 'error' : 'primary'"
          variant="soft"
          :loading="saving"
          @click="toggleActiveProduct"
        />
        <span v-else />
        <div class="flex justify-end gap-2">
          <UButton :label="isEditing ? 'Guardar cambios' : 'Guardar producto'" icon="i-lucide-save" :loading="saving" @click="saveProduct" />
        </div>
      </div>
    </template>
  </UModal>
</template>
