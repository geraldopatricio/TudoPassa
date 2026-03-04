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
  <footer class="h-10 bg-white border-t border-slate-200/60 px-6 flex items-center justify-between text-[11px] font-medium text-slate-400 shrink-0">
    <div class="flex items-center gap-2">
      <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
      <span>Sistema Ativo: <a href="https://www.gpsoft.net.br" target="_blank" class="hover:text-indigo-500 transition-colors">www.gpsoft.net.br</a></span>
    </div>
    <div class="flex items-center gap-4">
      <span class="uppercase tracking-widest">v 1.0.4</span>
      <span class="text-slate-500 font-bold bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
        {{ currentDateTime }}
      </span>
    </div>
  </footer>
</template>