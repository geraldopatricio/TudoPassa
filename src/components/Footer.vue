<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const currentDateTime = ref('')

const updateTime = () => {
  const now = new Date()
  currentDateTime.value = now.toLocaleDateString('pt-BR') + ' - ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

let timer
onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <footer class="h-10 bg-white border-t border-slate-200/60 px-4 md:px-6 flex items-center justify-between text-[10px] md:text-[11px] font-medium text-slate-400 shrink-0">
    <div class="flex items-center gap-2">
      <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
      <span class="hidden xs:inline">Sistema Ativo:</span>
      <a href="https://www.gpsoft.net.br" target="_blank" class="hover:text-indigo-500 transition-colors truncate max-w-[100px] md:max-w-none">gpsoft.net.br</a>
    </div>
    <div class="flex items-center gap-2 md:gap-4">
      <span class="uppercase tracking-widest opacity-60">v1.0.4</span>
      <span class="text-slate-500 font-bold bg-slate-50 px-2 md:px-3 py-1 rounded-full border border-slate-100 whitespace-nowrap">
        {{ currentDateTime }}
      </span>
    </div>
  </footer>
</template>