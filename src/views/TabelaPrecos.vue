<script setup>
import { ref, onMounted, computed } from 'vue'
import { Search, Plus, Pencil, Trash2, X, Save, Calendar, Tag, CheckCircle2 } from 'lucide-vue-next'

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const API_URL = `${BASE_URL}/tabela-precos`;

const tabelas = ref([])
const searchQuery = ref('')
const isModalOpen = ref(false)
const isSidebarOpen = ref(false)
const editingTabela = ref(null)

const form = ref({
  id: '', 
  nome_promocional: '', 
  tabela_vigente: 'Tabela de Preço 01', 
  data_inicial: '', 
  data_final: '', 
  status: 'Ativo'
})

const opcoesTabelas = ['Tabela de Preço 01', 'Tabela de Preço 02', 'Tabela de Preço 03']

const fetchTabelas = async () => {
  try {
    const res = await fetch(API_URL)
    tabelas.value = await res.json()
  } catch (e) { console.error(e) }
}

const filteredTabelas = computed(() => {
  if (!Array.isArray(tabelas.value)) return []
  return tabelas.value.filter(t => 
    t.nome_promocional?.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const openModal = (tabela = null) => {
  if (tabela) {
    editingTabela.value = tabela
    form.value = { ...tabela }
  } else {
    editingTabela.value = null
    form.value = { 
      id: '', 
      nome_promocional: '', 
      tabela_vigente: 'Tabela de Preço 01', 
      data_inicial: '', 
      data_final: '', 
      status: 'Ativo' 
    }
  }
  isModalOpen.value = true
}

const saveTabela = async () => {
  const method = editingTabela.value ? 'PUT' : 'POST'
  const url = editingTabela.value ? `${API_URL}/${editingTabela.value.id}` : API_URL

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    if (res.ok) {
      await fetchTabelas()
      isModalOpen.value = false
    }
  } catch (e) { alert("Erro ao salvar") }
}

const deleteTabela = async (id) => {
  if (confirm("Excluir esta tabela?")) {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' })
    fetchTabelas()
  }
}

onMounted(fetchTabelas)
</script>

<template>
  <div class="flex h-screen bg-slate-50 overflow-hidden">
    <Sidebar :isOpen="isSidebarOpen" @close="isSidebarOpen = false" />
    <div class="flex-1 flex flex-col min-w-0">
      <NavBar @toggleSidebar="isSidebarOpen = !isSidebarOpen" />
      
      <main class="flex-1 p-6 overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Tabelas de Preços</h1>
          <button @click="openModal()" class="px-4 py-2 bg-indigo-600 text-white rounded-xl flex items-center gap-2 font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200">
            <Plus class="w-4 h-4" /> Nova Tabela
          </button>
        </div>

        <div class="relative mb-6">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input v-model="searchQuery" type="text" placeholder="Buscar por nome promocional..." class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm">
        </div>

        <div class="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-widest font-black text-slate-500">
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4">Nome Promocional</th>
                <th class="px-6 py-4">Vigência</th> <!-- CORRIGIDO: Removido variável 't' do cabeçalho -->
                <th class="px-6 py-4">Período</th>
                <th class="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="t in filteredTabelas" :key="t.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <span :class="t.status === 'Ativo' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'" class="px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    {{ t.status }}
                  </span>
                </td>
                <td class="px-6 py-4 font-bold text-slate-700">{{ t.nome_promocional }}</td>
                <td class="px-6 py-4">
                  <!-- CORRIGIDO: Mostra o nome da tabela selecionada -->
                  <div class="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase">
                    <Tag class="w-4 h-4" />
                    {{ t.tabela_vigente }}
                  </div>
                </td>
                <td class="px-6 py-4 text-slate-500 text-xs font-mono">
                  {{ t.data_inicial }} <span class="text-slate-300 mx-1">até</span> {{ t.data_final }}
                </td>
                <td class="px-6 py-4 text-center">
                  <div class="flex justify-center gap-2">
                    <button @click="openModal(t)" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil class="w-4 h-4" /></button>
                    <button @click="deleteTabela(t.id)" class="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 class="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>

    <!-- MODAL -->
    <div v-if="isModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div class="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
        <div class="p-6 flex justify-between items-center border-b border-slate-100">
          <h2 class="text-xl font-black text-slate-800 uppercase italic">Configurar Tabela</h2>
          <button @click="isModalOpen = false" class="p-2 hover:bg-slate-100 rounded-full"><X class="w-5 h-5 text-slate-400" /></button>
        </div>
        
        <div class="p-8 space-y-6">
          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Nome da Tabela/Promoção</label>
            <input v-model="form.nome_promocional" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold">
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Data Inicial</label>
              <input type="date" v-model="form.data_inicial" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Data Final</label>
              <input type="date" v-model="form.data_final" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none">
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Vigência (Qual tabela aplicar?)</label>
            <select v-model="form.tabela_vigente" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-700">
                <option v-for="opt in opcoesTabelas" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Status</label>
            <select v-model="form.status" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>
        </div>

        <div class="p-8 bg-slate-50 flex gap-3 border-t border-slate-100">
          <button @click="isModalOpen = false" class="flex-1 py-4 font-bold text-slate-500 hover:bg-white rounded-2xl transition-all uppercase text-xs">Cancelar</button>
          <button @click="saveTabela" class="flex-[2] py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700">
            <Save class="w-5 h-5" /> Salvar Tabela
          </button>
        </div>
      </div>
    </div>
  </div>
</template>