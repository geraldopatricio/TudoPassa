<script setup>
import { ref, onMounted, computed } from 'vue'
import { 
  DollarSign, ArrowUpCircle, Search, Filter, 
  Calendar, Trash2, CheckCircle2, Loader2 
} from 'lucide-vue-next'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const financeiro = ref([])
const loading = ref(true)
const searchQuery = ref('')

const fetchFinanceiro = async () => {
  try {
    loading.value = true
    const res = await fetch(`${BASE_URL}/financeiro`)
    financeiro.value = await res.json()
  } finally {
    loading.value = false
  }
}

const totalRecebido = computed(() => {
  return financeiro.value
    .filter(f => f.situacao === 'Recebido')
    .reduce((acc, curr) => acc + curr.valor_liquido, 0)
})

const filteredFinanceiro = computed(() => {
  return financeiro.value.filter(f => 
    f.cliente_nome.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    f.numero_pedido.toString().includes(searchQuery.value)
  ).sort((a, b) => new Date(b.data_emissao) - new Date(a.data_emissao))
})

onMounted(fetchFinanceiro)
</script>

<template>
  <div class="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
    <Sidebar />
    <div class="flex-1 flex flex-col min-w-0">
      <NavBar />
      <main class="flex-1 p-6 overflow-y-auto custom-scrollbar">
        
        <!-- Dashboard Rápido -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-100">
            <div class="flex justify-between items-start mb-4">
              <div class="p-3 bg-white/20 rounded-2xl"><DollarSign /></div>
              <span class="text-[10px] font-black uppercase tracking-widest opacity-60">Total em Caixa</span>
            </div>
            <p class="text-3xl font-black italic">R$ {{ totalRecebido.toFixed(2) }}</p>
          </div>
          
          <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
             <div class="flex justify-between items-start mb-4">
              <div class="p-3 bg-emerald-50 text-emerald-500 rounded-2xl"><ArrowUpCircle /></div>
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendas do Mês</span>
            </div>
            <p class="text-3xl font-black italic text-slate-800">{{ financeiro.length }}</p>
          </div>
        </div>

        <!-- Cabeçalho e Busca -->
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-black text-slate-800 uppercase italic">Contas a Receber</h1>
          <div class="relative w-64">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input v-model="searchQuery" placeholder="Buscar lançamento..." class="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs outline-none focus:ring-2 ring-indigo-500/20 transition-all">
          </div>
        </div>

        <!-- Tabela -->
        <div class="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                <th class="px-6 py-4">Data</th>
                <th class="px-6 py-4">Pedido</th>
                <th class="px-6 py-4">Cliente</th>
                <th class="px-6 py-4">Valor</th>
                <th class="px-6 py-4">Situação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="f in filteredFinanceiro" :key="f.id" class="hover:bg-slate-50/50 transition-all">
                <td class="px-6 py-4 text-xs font-bold text-slate-500">{{ new Date(f.data_emissao).toLocaleDateString() }}</td>
                <td class="px-6 py-4 font-mono text-[10px] text-indigo-400">#{{ String(f.numero_pedido).padStart(4, '0') }}</td>
                <td class="px-6 py-4">
                  <p class="text-xs font-black text-slate-700 uppercase">{{ f.cliente_nome }}</p>
                  <p class="text-[9px] text-slate-400 font-bold">{{ f.forma_pagamento }}</p>
                </td>
                <td class="px-6 py-4 font-black text-emerald-600">R$ {{ f.valor_liquido.toFixed(2) }}</td>
                <td class="px-6 py-4">
                  <span class="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[9px] font-black uppercase">{{ f.situacao }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  </div>
</template>