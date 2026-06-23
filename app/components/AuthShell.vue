<script setup lang="ts">
defineProps<{ eyebrow: string; title: string; description: string }>()
</script>

<template>
  <a href="#auth-form" class="skip-link">Saltar al formulario</a>
  <main class="min-h-screen bg-[#f5f5ef] lg:grid lg:grid-cols-[1.05fr_.95fr]">
    <section class="relative hidden min-h-screen overflow-hidden bg-[#183b2d] p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div class="absolute -right-28 -top-28 size-96 rounded-full border border-white/10" />
      <div class="absolute -right-12 -top-12 size-64 rounded-full border border-white/10" />
      <div class="absolute bottom-28 left-12 size-3 rounded-full bg-[#d7e8a4]" />
      <div class="relative flex items-center gap-3">
        <span class="grid size-11 place-items-center rounded-xl bg-white text-sm font-black text-[#183b2d]">ABR</span>
        <span class="text-xl font-bold tracking-tight">ABR Control</span>
      </div>
      <div class="relative max-w-xl">
        <p class="mb-5 text-sm font-semibold uppercase tracking-[.22em] text-[#d7e8a4]">Control operativo. Gestión clara.</p>
        <h2 class="text-5xl font-semibold leading-[1.08] tracking-[-.045em]">Ventas, inventario y caja en un solo sistema.</h2>
        <p class="mt-6 max-w-md text-lg leading-8 text-white/65">Accede al panel para operar el punto de venta, consultar existencias y mantener el control diario del negocio.</p>
      </div>
      <p class="relative text-sm text-white/45">© {{ new Date().getFullYear() }} ABR Control</p>
    </section>

    <section class="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16 xl:px-24">
      <div class="lg:hidden"><BrandMark /></div>
      <div class="flex flex-1 items-center justify-center py-10">
        <div id="auth-form" class="auth-card w-full max-w-md" tabindex="-1">
          <p class="text-xs font-bold uppercase tracking-[.2em] text-[#557565]">{{ eyebrow }}</p>
          <h1 class="mt-3 text-4xl font-semibold tracking-[-.045em] text-[#17221d]">{{ title }}</h1>
          <p class="mt-3 leading-7 text-[#657069]">{{ description }}</p>
          <div class="mt-8"><slot /></div>
        </div>
      </div>
    </section>
  </main>
</template>
