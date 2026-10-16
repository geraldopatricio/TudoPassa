<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Number, default: 1 },
  total: { type: Number, required: true },
  pageSize: { type: Number, required: true }
})
const emit = defineEmits(['update:modelValue'])
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const pages = computed(() => {
  const selected = new Set([1, pageCount.value])
  for (let page = props.modelValue - 1; page <= props.modelValue + 1; page++) {
    if (page > 0 && page <= pageCount.value) selected.add(page)
  }
  const result = []
  for (const page of [...selected].sort((a, b) => a - b)) {
    const previous = result.at(-1)
    if (previous && page - previous > 1) result.push(`gap-${page}`)
    result.push(page)
  }
  return result
})
const start = computed(() => props.total ? (props.modelValue - 1) * props.pageSize + 1 : 0)
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 border-t border-slate-100 bg-slate-50/50">
    <p class="text-xs text-slate-500 tabular-nums">
      <span class="font-semibold text-slate-700">{{ start }}–{{ Math.min(modelValue * pageSize, total) }}</span>
      de {{ total.toLocaleString('pt-BR') }} produtos
    </p>
    <nav aria-label="Paginação de produtos" class="flex max-w-full items-center gap-1">
      <button type="button" aria-label="Página anterior" :disabled="modelValue <= 1"
        @click="emit('update:modelValue', modelValue - 1)"
        class="flex h-9 w-8 sm:w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500">
        <ChevronLeft class="h-4 w-4" />
      </button>
      <template v-for="page in pages" :key="page">
        <span v-if="typeof page === 'string'" aria-hidden="true" class="px-1 text-slate-400">…</span>
        <button v-else type="button" :aria-label="`Página ${page}`" :aria-current="modelValue === page ? 'page' : undefined"
          @click="emit('update:modelValue', page)"
          :class="modelValue === page ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'"
          class="h-9 min-w-8 sm:min-w-9 shrink-0 rounded-lg border px-1 text-xs font-semibold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500">
          {{ page }}
        </button>
      </template>
      <button type="button" aria-label="Próxima página" :disabled="modelValue >= pageCount"
        @click="emit('update:modelValue', modelValue + 1)"
        class="flex h-9 w-8 sm:w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500">
        <ChevronRight class="h-4 w-4" />
      </button>
    </nav>
  </div>
</template>
