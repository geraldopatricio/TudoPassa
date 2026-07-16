<script setup>
import { ref, onMounted, computed } from 'vue'
import { 
  Search, Plus, Pencil, Trash2, Download, 
  Upload, X, Save, Image as ImageIcon, Link as LinkIcon,
  BadgeCheck // Adicionado ícone faltante
} from 'lucide-vue-next'
import * as XLSX from 'xlsx'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/profissionais`;
const CLIENTES_API = `${BASE_URL}/clientes`;
const PRODUTOS_API = `${BASE_URL}/produtos`;
const USUARIOS_API = `${BASE_URL}/usuarios`;
const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || '{}')


const profissionais = ref([])
const listaClientes = ref([])
const listaProdutos = ref([])
const listaUsuarios = ref([]) // Declarado ref faltante
const searchQuery = ref('')
const isModalOpen = ref(false)
const isSidebarOpen = ref(false)
const editingProfissional = ref(null)
const logomarcaPreview = ref(null)
const logomarcaFile = ref(null)

const tiposOpcoes = ['Cliente', 'Transportadora', 'Vendedor', 'Revendedor', 'Afiliado', 'Fornecedor']

const form = ref({
  codigo: '', nome: '', cpf_cnpj: '', celular: '', email: '',
  endereco: '', numero: '', bairro: '', cidade: '', uf: '', cep: '',
  tipo: 'Vendedor', 
  ref_clientes: [], 
  ref_produtos: [],
  ref_usuarios: []
})

const fetchProfissionais = async () => {
  try {
    const res = await fetch(API_URL)
    profissionais.value = await res.json()
  } catch (e) { console.error("Erro ao carregar profissionais", e) }
}

const fetchLookups = async () => {
  try {
    // CORRIGIDO: Desestruturação de 3 itens para 3 fetches
    const [resCli, resProd, resUser] = await Promise.all([
      fetch(CLIENTES_API),
      fetch(PRODUTOS_API),
      fetch(USUARIOS_API)
    ])
    listaClientes.value = await resCli.json()
    listaProdutos.value = await resProd.json()
    listaUsuarios.value = await resUser.json() 
  } catch (e) { console.error("Erro ao carregar lookups", e) }
}

const filteredProfissionais = computed(() => {
  if (!Array.isArray(profissionais.value)) return []
  
  let lista = [...profissionais.value]

  // Se NÃO for um administrador (ajuste o termo 'Admin' conforme seu sistema)
  // O usuário só vê os perfis profissionais onde o login dele está vinculado
  if (usuarioLogado.tipo !== 'Admin' && usuarioLogado.tipo !== 'Gerente') {
    lista = lista.filter(p => 
      p.ref_usuarios?.includes(usuarioLogado.login)
    )
  }

  // Aplica a busca textual por cima da trava de segurança
  return lista.filter(p => 
    p.nome?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    p.cpf_cnpj?.includes(searchQuery.value) ||
    p.tipo?.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// Função para checar se o usuário pode CRIAR ou EXCLUIR profissionais
const podeGerenciarTotal = computed(() => {
  return ['Admin', 'Gerente'].includes(usuarioLogado.tipo)
})

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    logomarcaFile.value = file
    logomarcaPreview.value = URL.createObjectURL(file)
  }
}

const openModal = (profissional = null) => {
  logomarcaFile.value = null
  if (profissional) {
    editingProfissional.value = profissional
    form.value = { 
        ...profissional,
        ref_clientes: Array.isArray(profissional.ref_clientes) ? [...profissional.ref_clientes] : [],
        ref_produtos: Array.isArray(profissional.ref_produtos) ? [...profissional.ref_produtos] : [],
        ref_usuarios: Array.isArray(profissional.ref_usuarios) ? [...profissional.ref_usuarios] : [] 
    }
    logomarcaPreview.value = profissional.logomarca ? `${BASE_URL}/uploads/profissionais/${profissional.logomarca}` : null
  } else {
    editingProfissional.value = null
    logomarcaPreview.value = null
    form.value = { 
      codigo: '', nome: '', cpf_cnpj: '', celular: '', email: '', 
      endereco: '', numero: '', bairro: '', cidade: '', uf: '', cep: '',
      tipo: 'Vendedor', ref_clientes: [], ref_produtos: [], ref_usuarios: []
    }
  }
  isModalOpen.value = true
}

const saveProfissional = async () => {
  const method = editingProfissional.value ? 'PUT' : 'POST'
  const url = editingProfissional.value ? `${API_URL}/${editingProfissional.value.codigo}` : API_URL

  const formData = new FormData()
  
  Object.keys(form.value).forEach(key => {
    if (!['ref_clientes', 'ref_produtos', 'ref_usuarios', 'logomarca'].includes(key)) {
        formData.append(key, form.value[key] || '')
    }
  })

  formData.append('ref_clientes', JSON.stringify(form.value.ref_clientes))
  formData.append('ref_produtos', JSON.stringify(form.value.ref_produtos))
  formData.append('ref_usuarios', JSON.stringify(form.value.ref_usuarios)) 

  if (logomarcaFile.value) {
    formData.append('logomarca', logomarcaFile.value)
  }

  try {
    const res = await fetch(url, { method, body: formData })
    if (res.ok) {
      await fetchProfissionais()
      isModalOpen.value = false
    } else {
      const err = await res.json()
      alert(err.message)
    }
  } catch (e) { alert("Erro ao conectar com o servidor") }
}

const deleteProfissional = async (codigo) => {
  if (confirm("Deseja excluir este profissional?")) {
    await fetch(`${API_URL}/${codigo}`, { method: 'DELETE' })
    fetchProfissionais()
  }
}

onMounted(() => {
    fetchProfissionais()
    fetchLookups()
})
</script>

<template>
  <div class="flex h-screen bg-slate-50 overflow-hidden">
    <Sidebar :isOpen="isSidebarOpen" @close="isSidebarOpen = false" />
    
    <div class="flex-1 flex flex-col min-w-0">
      <NavBar @toggleSidebar="isSidebarOpen = !isSidebarOpen" />
      
      <main class="flex-1 p-6 overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestão de Profissionais</h1>
          <button v-if="podeGerenciarTotal" @click="openModal()" class="px-4 py-2 bg-indigo-600 text-white rounded-xl flex items-center gap-2 font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200">
            <Plus class="w-4 h-4" /> Novo Profissional
          </button>
        </div>

        <div class="relative mb-6">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input v-model="searchQuery" type="text" placeholder="Buscar por nome, CPF ou tipo..." class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm">
        </div>

        <div class="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-widest font-black text-slate-500">
                <th class="px-6 py-4">Logo</th>
                <th class="px-6 py-4">Código</th>
                <th class="px-6 py-4">Nome / Tipo</th>
                <th class="px-6 py-4">CPF/CNPJ</th>
                <th class="px-6 py-4">Cidade/UF</th>
                <th class="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="p in filteredProfissionais" :key="p.codigo" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                    <img v-if="p.logomarca" :src="`${BASE_URL}/uploads/profissionais/${p.logomarca}`" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon class="w-5 h-5" /></div>
                  </div>
                </td>
                <td class="px-6 py-4 font-mono text-xs text-slate-400">#{{ p.codigo }}</td>
                <td class="px-6 py-4 font-bold text-slate-700">{{ p.nome }}<br><span class="text-[9px] uppercase text-indigo-500">{{ p.tipo }}</span></td>
                <td class="px-6 py-4 text-slate-500">{{ p.cpf_cnpj }}</td>
                <td class="px-6 py-4 text-slate-500 text-sm">{{ p.cidade }} / {{ p.uf }}</td>
                <td class="px-6 py-4 text-center">
                  <div class="flex justify-center gap-2">
                    <button @click="openModal(p)" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil class="w-4 h-4" />
                    </button>
                    <button 
                      v-if="podeGerenciarTotal" 
                      @click="deleteProfissional(p.codigo)" 
                      class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
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
      <div class="bg-white w-full max-w-6xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
        <div class="p-6 flex justify-between items-center border-b border-slate-100">
          <h2 class="text-xl font-black text-slate-800 uppercase italic">Dados do Profissional</h2>
          <button @click="isModalOpen = false" class="p-2 hover:bg-slate-100 rounded-full"><X class="w-5 h-5 text-slate-400" /></button>
        </div>
        
        <div class="p-8 overflow-y-auto">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="space-y-4">
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Logomarca</label>
                <div @click="$refs.fileInput.click()" class="w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-300 transition-all relative group">
                  <img v-if="logomarcaPreview" :src="logomarcaPreview" class="w-full h-full object-cover" />
                  <div v-else class="text-center p-4"><Upload class="w-8 h-8 text-slate-300 mx-auto mb-2" /><p class="text-[10px] text-slate-400 font-bold uppercase">Logo</p></div>
                  <input type="file" ref="fileInput" class="hidden" @change="handleFileUpload" accept="image/*" />
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo</label>
                <select v-model="form.tipo" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold">
                  <option v-for="t in tiposOpcoes" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
            </div>

            <div class="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Código</label><input v-model="form.codigo" :disabled="editingProfissional" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none"></div>
              <div class="md:col-span-2 space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Nome</label><input v-model="form.nome" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none"></div>
              <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">CPF/CNPJ</label><input v-model="form.cpf_cnpj" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none"></div>
              <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Celular</label><input v-model="form.celular" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none"></div>
              <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">CEP</label><input v-model="form.cep" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none"></div>
              <div class="md:col-span-2 space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Email</label><input v-model="form.email" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none"></div>
              <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Número</label><input v-model="form.numero" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none"></div>
              <div class="md:col-span-2 space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Rua</label><input v-model="form.endereco" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none"></div>
              <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Bairro</label><input v-model="form.bairro" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none"></div>
              <div class="md:col-span-2 space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Cidade</label><input v-model="form.cidade" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none"></div>
              <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">UF</label><input v-model="form.uf" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none"></div>
            </div>
          </div>

          <!-- SEÇÃO DE VÍNCULOS -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-100">
            <!-- Clientes -->
            <div class="space-y-2">
                <label class="text-[10px] font-black uppercase text-indigo-500 flex items-center gap-2"><LinkIcon class="w-3 h-3"/> Clientes</label>
                <div class="h-44 overflow-y-auto bg-slate-50 rounded-3xl p-4 border border-slate-200 space-y-1">
                    <label v-for="cli in listaClientes" :key="cli.codigo" class="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-xl transition-all">
                        <input type="checkbox" :value="cli.codigo" v-model="form.ref_clientes" class="w-4 h-4 rounded text-indigo-600">
                        <span class="text-xs font-bold text-slate-700">{{ cli.nome }}</span>
                    </label>
                </div>
            </div>

            <!-- Produtos -->
            <div class="space-y-2">
                <label class="text-[10px] font-black uppercase text-indigo-500 flex items-center gap-2"><LinkIcon class="w-3 h-3"/> Produtos</label>
                <div class="h-44 overflow-y-auto bg-slate-50 rounded-3xl p-4 border border-slate-200 space-y-1">
                    <label v-for="prod in listaProdutos" :key="prod.referencia || prod.codigo" class="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-xl transition-all">
                        <input type="checkbox" :value="prod.referencia || prod.codigo" v-model="form.ref_produtos" class="w-4 h-4 rounded text-indigo-600">
                        <span class="text-xs font-bold text-slate-700">{{ prod.descricao || prod.nome }}</span>
                    </label>
                </div>
            </div>

            <!-- Usuários -->
            <div class="space-y-2" v-if="podeGerenciarTotal">
                <label class="text-[10px] font-black uppercase text-indigo-500 flex items-center gap-2"><BadgeCheck class="w-3 h-3"/> Usuários</label>
                <div class="h-44 overflow-y-auto bg-slate-50 rounded-3xl p-4 border border-slate-200 space-y-1">
                    <label v-for="user in listaUsuarios" :key="user.login" class="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-xl transition-all">
                        <input type="checkbox" :value="user.login" v-model="form.ref_usuarios" class="w-4 h-4 rounded text-indigo-600">
                        <div class="flex flex-col">
                          <span class="text-xs font-bold text-slate-700">{{ user.login }}</span>
                          <span class="text-[8px] uppercase text-slate-400">{{ user.tipo }}</span>
                        </div>
                    </label>
                </div>
            </div>
          </div>
        </div>

        <div class="p-8 bg-slate-50 flex gap-3 border-t border-slate-100">
          <button @click="isModalOpen = false" class="flex-1 py-4 font-bold text-slate-500 hover:bg-white rounded-2xl transition-all uppercase text-xs">Cancelar</button>
          <button @click="saveProfissional" class="flex-[2] py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700">
            <Save class="w-5 h-5" /> Salvar Profissional
          </button>
        </div>
      </div>
    </div>
  </div>
</template>