<script setup>
import { ref, onMounted, computed } from 'vue'
import { 
  Search, Plus, Pencil, Trash2, Download, 
  Upload, X, Save, User, Lock, Phone, Mail, BadgeCheck
} from 'lucide-vue-next'
import * as XLSX from 'xlsx'

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const API_URL = `${BASE_URL}/usuarios`;

const usuarios = ref([])
const searchQuery = ref('')
const isModalOpen = ref(false)
const isSidebarOpen = ref(false)
const editingUsuario = ref(null)
const fotoPreview = ref(null)
const fotoFile = ref(null)

// Opções de tipo baseadas no seu backend
const tiposUsuario = ['Cliente', 'Vendedor', 'Transportadora', 'Gerente', 'Admin']

// Campos do formulário
const form = ref({
  login: '',
  senha: '',
  cpf: '',
  email: '',
  whatsapp: '',
  tipo: 'Cliente'
})

const fetchUsuarios = async () => {
  try {
    const res = await fetch(API_URL)
    usuarios.value = await res.json()
  } catch (e) {
    console.error("Erro ao carregar usuários", e)
  }
}

const filteredUsuarios = computed(() => {
  return usuarios.value.filter(u => 
    u.login.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    u.cpf.includes(searchQuery.value)
  )
})

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    fotoFile.value = file
    fotoPreview.value = URL.createObjectURL(file)
  }
}

const openModal = (usuario = null) => {
  fotoFile.value = null
  if (usuario) {
    editingUsuario.value = usuario
    form.value = { ...usuario }
    fotoPreview.value = usuario.foto ? `${BASE_URL}/uploads/usuarios/${usuario.foto}` : null
  } else {
    editingUsuario.value = null
    fotoPreview.value = null
    form.value = { 
      login: '', senha: '', cpf: '', email: '', whatsapp: '', tipo: 'Cliente' 
    }
  }
  isModalOpen.value = true
}

const saveUsuario = async () => {
  const method = editingUsuario.value ? 'PUT' : 'POST'
  // Se estiver editando, a rota é /usuarios/:login
  const url = editingUsuario.value ? `${API_URL}/${editingUsuario.value.login}` : API_URL

  const formData = new FormData()
  formData.append('login', form.value.login)
  formData.append('senha', form.value.senha)
  formData.append('cpf', form.value.cpf)
  formData.append('email', form.value.email)
  formData.append('whatsapp', form.value.whatsapp)
  formData.append('tipo', form.value.tipo)

  if (fotoFile.value) {
    formData.append('foto', fotoFile.value)
  }

  try {
    const res = await fetch(url, {
      method,
      body: formData
    })
    
    if (res.ok) {
      fetchUsuarios()
      isModalOpen.value = false
    } else {
      const err = await res.json()
      alert(err.message || "Erro ao salvar")
    }
  } catch (e) { 
    alert("Erro na conexão com o servidor") 
  }
}

const deleteUsuario = async (login) => {
  if (confirm(`Deseja realmente excluir o usuário ${login}?`)) {
    try {
      await fetch(`${API_URL}/${login}`, { method: 'DELETE' })
      fetchUsuarios()
    } catch (e) {
      alert("Erro ao excluir")
    }
  }
}

const exportToExcel = () => {
  const ws = XLSX.utils.json_to_sheet(usuarios.value)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Usuarios")
  XLSX.writeFile(wb, "usuarios_sistema.xlsx")
}

onMounted(fetchUsuarios)
</script>

<template>
  <div class="flex h-screen bg-slate-50 overflow-hidden">
    <Sidebar :isOpen="isSidebarOpen" @close="isSidebarOpen = false" />
    
    <div class="flex-1 flex flex-col min-w-0">
      <NavBar @toggleSidebar="isSidebarOpen = !isSidebarOpen" />
      
      <main class="flex-1 p-6 overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Controle de Acessos</h1>
          <div class="flex gap-3">
            <button @click="exportToExcel" class="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 flex items-center gap-2 font-bold text-sm hover:bg-slate-50 transition-all">
              <Download class="w-4 h-4" /> Exportar
            </button>
            <button @click="openModal()" class="px-4 py-2 bg-indigo-600 text-white rounded-xl flex items-center gap-2 font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
              <Plus class="w-4 h-4" /> Novo Usuário
            </button>
          </div>
        </div>

        <!-- Barra de Busca -->
        <div class="relative mb-6">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input v-model="searchQuery" type="text" placeholder="Buscar por login, e-mail ou CPF..." class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm">
        </div>

        <!-- Tabela -->
        <div class="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-widest font-black text-slate-500">
                <th class="px-6 py-4">Usuário</th>
                <th class="px-6 py-4">Contato</th>
                <th class="px-6 py-4">Documento</th>
                <th class="px-6 py-4">Tipo</th>
                <th class="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="u in filteredUsuarios" :key="u.login" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                      <img 
                        v-if="u.foto" 
                        :src="`${BASE_URL}/uploads/usuarios/${u.foto}`" 
                        class="w-full h-full object-cover" 
                        />
                      <User v-else class="w-full h-full p-2 text-slate-300" />
                    </div>
                    <div>
                      <div class="font-bold text-slate-700 leading-none">{{ u.login }}</div>
                      <div class="text-[10px] text-slate-400 mt-1 uppercase font-medium">Criado em: {{ new Date(u.data_criacao).toLocaleDateString() }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm text-slate-600 font-medium">{{ u.email }}</div>
                  <div class="text-xs text-slate-400">{{ u.whatsapp }}</div>
                </td>
                <td class="px-6 py-4 font-mono text-xs text-slate-500">{{ u.cpf }}</td>
                <td class="px-6 py-4">
                  <span :class="{
                    'bg-emerald-50 text-emerald-600': u.tipo === 'Vendedor',
                    'bg-blue-50 text-blue-600': u.tipo === 'Cliente',
                    'bg-amber-50 text-amber-600': u.tipo === 'Transportadora',
                    'bg-slate-100 text-slate-600': u.tipo === 'Administrador'
                  }" class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    {{ u.tipo }}
                  </span>
                </td>
                <td class="px-6 py-4 text-center">
                  <div class="flex justify-center gap-2">
                    <button @click="openModal(u)" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Pencil class="w-4 h-4" /></button>
                    <button @click="deleteUsuario(u.login)" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 class="w-4 h-4" /></button>
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
      <div class="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
        <div class="p-6 flex justify-between items-center border-b border-slate-100">
          <h2 class="text-xl font-black text-slate-800 uppercase italic flex items-center gap-2">
            <BadgeCheck class="w-6 h-6 text-indigo-600" /> Perfil do Usuário
          </h2>
          <button @click="isModalOpen = false" class="p-2 hover:bg-slate-100 rounded-full transition-colors"><X class="w-5 h-5 text-slate-400" /></button>
        </div>

        <div class="p-8 overflow-y-auto grid grid-cols-2 gap-5">
          <!-- Foto de Perfil Centralizada -->
          <div class="col-span-2 flex flex-col items-center mb-4">
            <div @click="$refs.fileInput.click()" class="w-24 h-24 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-300 transition-all relative group">
              <img v-if="fotoPreview" :src="fotoPreview" class="w-full h-full object-cover" />
              <div v-else class="text-slate-300 flex flex-col items-center">
                <Upload class="w-6 h-6" />
                <span class="text-[8px] font-bold uppercase mt-1">Foto</span>
              </div>
              <div class="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Pencil class="w-5 h-5 text-indigo-700" />
              </div>
              <input type="file" ref="fileInput" class="hidden" @change="handleFileUpload" accept="image/*" />
            </div>
          </div>

          <!-- Campos -->
          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Login/Usuário</label>
            <div class="relative">
              <User class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input v-model="form.login" :disabled="editingUsuario" class="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 disabled:opacity-50">
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Senha de Acesso</label>
            <div class="relative">
              <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input v-model="form.senha" type="text" class="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500">
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase text-slate-400 ml-1">CPF</label>
            <input v-model="form.cpf" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500">
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase text-slate-400 ml-1">WhatsApp</label>
            <div class="relative">
              <Phone class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input v-model="form.whatsapp" class="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500">
            </div>
          </div>

          <div class="col-span-2 space-y-1">
            <label class="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail</label>
            <div class="relative">
              <Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input v-model="form.email" class="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500">
            </div>
          </div>

          <div class="col-span-2 space-y-1">
            <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de Acesso</label>
            <div class="flex gap-2">
              <button 
                v-for="tipo in tiposUsuario" 
                :key="tipo"
                @click="form.tipo = tipo"
                type="button"
                :class="form.tipo === tipo ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
                class="flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all"
              >
                {{ tipo }}
              </button>
            </div>
          </div>
        </div>

        <div class="p-8 bg-slate-50 flex gap-3 border-t border-slate-100">
          <button @click="isModalOpen = false" class="flex-1 py-4 font-bold text-slate-500 hover:bg-white rounded-2xl transition-all">Cancelar</button>
          <button @click="saveUsuario" class="flex-[2] py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all">
            <Save class="w-5 h-5" /> {{ editingUsuario ? 'Atualizar' : 'Salvar' }} Usuário
          </button>
        </div>
      </div>
    </div>
  </div>
</template>