<script setup>
import { ref, onMounted, computed } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import NavBar from '../components/NavBar.vue'
import { Search, Plus, Pencil, Trash2, Download, Upload, X, Save } from 'lucide-vue-next'
import * as XLSX from 'xlsx'

const API_URL = 'http://localhost:3000/clientes'
const clientes = ref([])
const searchQuery = ref('')
const isModalOpen = ref(false)
const isSidebarOpen = ref(false)
const editingCliente = ref(null)

// Campos do formulário
const form = ref({
  codigo: '', nome: '', cpf_cnpj: '', celular: '', email: '',
  endereco: '', numero: '', bairro: '', cidade: '', uf: '', cep: ''
})

const fetchClientes = async () => {
  const res = await fetch(API_URL)
  clientes.value = await res.json()
}

const filteredClientes = computed(() => {
  return clientes.value.filter(c => 
    c.nome.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    c.cpf_cnpj.includes(searchQuery.value)
  )
})

const openModal = (cliente = null) => {
  if (cliente) {
    editingCliente.value = cliente
    form.value = { ...cliente }
  } else {
    editingCliente.value = null
    form.value = { codigo: '', nome: '', cpf_cnpj: '', celular: '', email: '', endereco: '', numero: '', bairro: '', cidade: '', uf: '', cep: '' }
  }
  isModalOpen.value = true
}

const saveCliente = async () => {
  const method = editingCliente.value ? 'PUT' : 'POST'
  const url = editingCliente.value ? `${API_URL}/${editingCliente.value.codigo}` : API_URL

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    if (res.ok) {
      fetchClientes()
      isModalOpen.value = false
    } else {
      const err = await res.json()
      alert(err.message)
    }
  } catch (e) { alert("Erro ao salvar") }
}

const deleteCliente = async (codigo) => {
  if (confirm("Deseja excluir este cliente?")) {
    await fetch(`${API_URL}/${codigo}`, { method: 'DELETE' })
    fetchClientes()
  }
}

// EXCEL EXPORT
const exportToExcel = () => {
  const ws = XLSX.utils.json_to_sheet(clientes.value)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Clientes")
  XLSX.writeFile(wb, "clientes_export.xlsx")
}

// EXCEL IMPORT
const importExcel = (event) => {
  const file = event.target.files[0]
  const reader = new FileReader()
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result)
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json(sheet)
    
    // Envia cada cliente para o backend
    json.forEach(async (item) => {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      })
    })
    setTimeout(fetchClientes, 1000)
  }
  reader.readAsArrayBuffer(file)
}

onMounted(fetchClientes)
</script>

<template>
  <div class="flex h-screen bg-slate-50 overflow-hidden">
    <Sidebar :isOpen="isSidebarOpen" @close="isSidebarOpen = false" />
    
    <div class="flex-1 flex flex-col min-w-0">
      <NavBar @toggleSidebar="isSidebarOpen = !isSidebarOpen" />
      
      <main class="flex-1 p-6 overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestão de Clientes</h1>
          <div class="flex gap-3">
            <button @click="exportToExcel" class="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 flex items-center gap-2 font-bold text-sm hover:bg-slate-50">
              <Download class="w-4 h-4" /> Exportar
            </button>
            <label class="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 flex items-center gap-2 font-bold text-sm cursor-pointer hover:bg-slate-50">
              <Upload class="w-4 h-4" /> Importar
              <input type="file" class="hidden" @change="importExcel" accept=".xlsx, .xls" />
            </label>
            <button @click="openModal()" class="px-4 py-2 bg-indigo-600 text-white rounded-xl flex items-center gap-2 font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200">
              <Plus class="w-4 h-4" /> Novo Cliente
            </button>
          </div>
        </div>

        <!-- Filtro -->
        <div class="relative mb-6">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input v-model="searchQuery" type="text" placeholder="Buscar por nome ou CPF..." class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm">
        </div>

        <!-- DataGrid -->
        <div class="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-widest font-black text-slate-500">
                <th class="px-6 py-4">Código</th>
                <th class="px-6 py-4">Nome</th>
                <th class="px-6 py-4">CPF/CNPJ</th>
                <th class="px-6 py-4">Cidade/UF</th>
                <th class="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="c in filteredClientes" :key="c.codigo" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-mono text-xs text-slate-400">#{{ c.codigo }}</td>
                <td class="px-6 py-4 font-bold text-slate-700">{{ c.nome }}</td>
                <td class="px-6 py-4 text-slate-500">{{ c.cpf_cnpj }}</td>
                <td class="px-6 py-4 text-slate-500">{{ c.cidade }} - {{ c.uf }}</td>
                <td class="px-6 py-4">
                  <div class="flex justify-center gap-2">
                    <button @click="openModal(c)" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Pencil class="w-4 h-4" /></button>
                    <button @click="deleteCliente(c.codigo)" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 class="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>

    <!-- MODAL FORMULÁRIO -->
    <div v-if="isModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div class="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div class="p-8 flex justify-between items-center border-b border-slate-100">
          <h2 class="text-xl font-black text-slate-800 uppercase italic">Dados do Cliente</h2>
          <button @click="isModalOpen = false" class="p-2 hover:bg-slate-100 rounded-full"><X class="w-5 h-5 text-slate-400" /></button>
        </div>
        <div class="p-8 grid grid-cols-2 gap-4">
          <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Código</label><input v-model="form.codigo" :disabled="editingCliente" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500"></div>
          <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Nome Completo</label><input v-model="form.nome" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500"></div>
          <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">CPF/CNPJ</label><input v-model="form.cpf_cnpj" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500"></div>
          <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Celular</label><input v-model="form.celular" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500"></div>
          <div class="col-span-2 space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Email</label><input v-model="form.email" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500"></div>
          <div class="col-span-2 grid grid-cols-4 gap-4">
            <div class="col-span-3 space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Endereço</label><input v-model="form.endereco" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500"></div>
            <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Nº</label><input v-model="form.numero" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500"></div>
          </div>
          <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Cidade</label><input v-model="form.cidade" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500"></div>
          <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">UF</label><input v-model="form.uf" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500"></div>
        </div>
        <div class="p-8 bg-slate-50 flex gap-3">
          <button @click="isModalOpen = false" class="flex-1 py-4 font-bold text-slate-500 hover:bg-white rounded-2xl transition-all">Cancelar</button>
          <button @click="saveCliente" class="flex-[2] py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
            <Save class="w-5 h-5" /> Salvar Cadastro
          </button>
        </div>
      </div>
    </div>
  </div>
</template>