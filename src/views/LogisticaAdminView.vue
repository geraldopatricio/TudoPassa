<script setup>
import { ref, onMounted, computed } from 'vue'
import { Truck, MapPin, Search, Filter, ArrowUpRight, Activity } from 'lucide-vue-next'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'
const entregas = ref([])
const loading = ref(true)
const searchQuery = ref('')

const fetchMonitoramento = async () => {
  try {
    const res = await fetch(`${BASE_URL}/logistica/admin/monitoramento`)
    entregas.value = await res.json()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const getStatusClasses = (status) => {
  const map = {
    'Aguardando Profissional': 'bg-amber-100 text-amber-600 border border-amber-200',
    'Aceito - Em Coleta': 'bg-blue-100 text-blue-600 border border-blue-200',
    'Em Rota': 'bg-indigo-100 text-indigo-600 border border-indigo-200 animate-pulse',
    'Entregue': 'bg-emerald-100 text-emerald-600 border border-emerald-200'
  }
  return map[status] || 'bg-slate-100 text-slate-500'
}

const filteredEntregas = computed(() => {
    return entregas.value.filter(e => 
        e.cliente.nome.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        e.numero_pedido.toString().includes(searchQuery.value)
    ).sort((a,b) => new Date(b.data_criacao) - new Date(a.data_criacao))
})

onMounted(() => {
    fetchMonitoramento()
    setInterval(fetchMonitoramento, 15000) // Refresh a cada 15s
})
</script>

<template>
  <div class="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
    <Sidebar />
    
    <div class="flex-1 flex flex-col min-w-0">
      <NavBar />
      
      <main class="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <!-- Header -->
        <div class="flex justify-between items-end mb-10">
          <div>
            <h1 class="text-3xl font-black text-slate-800 uppercase italic tracking-tighter leading-none">Torre de</h1>
            <h1 class="text-3xl font-black text-indigo-600 uppercase italic tracking-tighter leading-none">Controle.</h1>
          </div>
          
          <div class="flex gap-4">
             <div class="relative w-64">
                <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input v-model="searchQuery" placeholder="Buscar entrega..." class="w-full bg-white border border-slate-200 py-3 pl-10 pr-4 rounded-2xl text-xs outline-none focus:ring-4 ring-indigo-500/10">
             </div>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <div class="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p class="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <Activity class="w-3 h-3" /> Em espera
                </p>
                <h2 class="text-3xl font-black italic">{{ entregas.filter(e => !e.profissional_id).length }}</h2>
            </div>
            <div class="bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100">
                <p class="text-[10px] font-black uppercase mb-4 opacity-60 flex items-center gap-2">
                    <Truck class="w-3 h-3" /> Em trânsito
                </p>
                <h2 class="text-3xl font-black italic">{{ entregas.filter(e => e.status === 'Em Rota').length }}</h2>
            </div>
             <div class="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p class="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <MapPin class="w-3 h-3" /> Coleta pendente
                </p>
                <h2 class="text-3xl font-black italic">{{ entregas.filter(e => e.status === 'Aceito - Em Coleta').length }}</h2>
            </div>
        </div>

        <!-- Tabela Monitoramento -->
        <div class="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/50 border-b border-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                            <th class="p-8">ID / Pedido</th>
                            <th class="p-8">Destinatário</th>
                            <th class="p-8">Logística</th>
                            <th class="p-8">Status</th>
                            <th class="p-8 text-right">Posição GPS</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        <tr v-for="e in filteredEntregas" :key="e.id" class="hover:bg-slate-50/50 transition-all group">
                            <td class="p-8">
                                <span class="block font-black text-slate-800 italic">#{{ e.numero_pedido }}</span>
                                <span class="text-[9px] font-mono text-slate-300">{{ e.id }}</span>
                            </td>
                            <td class="p-8">
                                <p class="font-bold text-sm text-slate-700 uppercase">{{ e.cliente.nome }}</p>
                                <p class="text-[10px] text-slate-400 truncate max-w-[200px]">{{ e.cliente.endereco }}</p>
                            </td>
                            <td class="p-8">
                                <div v-if="e.profissional_id" class="flex items-center gap-3">
                                    <div class="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-black text-[10px]">
                                        {{ e.profissional_id.charAt(0) }}
                                    </div>
                                    <span class="text-xs font-bold text-slate-600 uppercase">{{ e.profissional_id }}</span>
                                </div>
                                <span v-else class="text-[10px] font-black text-amber-500 uppercase italic">Buscando...</span>
                            </td>
                            <td class="p-8">
                                <span :class="getStatusClasses(e.status)" class="px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-tighter">
                                    {{ e.status }}
                                </span>
                            </td>
                            <td class="p-8 text-right">
                                <div v-if="e.posicao_atual?.lat" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                    <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span class="font-mono text-[9px] font-bold text-slate-400">
                                        {{ e.posicao_atual.lat.toFixed(4) }}, {{ e.posicao_atual.lng.toFixed(4) }}
                                    </span>
                                    <ArrowUpRight class="w-3 h-3 text-slate-300" />
                                </div>
                                <span v-else class="text-[9px] font-bold text-slate-200 uppercase tracking-widest">Sem sinal</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
</style>