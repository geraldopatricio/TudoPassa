<script setup>
import { ref, onMounted, computed } from 'vue'
import { 
  Search, Plus, Pencil, Trash2, Download, Upload, X, Save, 
  User, CreditCard, Ban, CheckCircle, Link as LinkIcon, 
  Image as ImageIcon, BadgeCheck, MapPin, Phone, Mail 
} from 'lucide-vue-next'
import * as XLSX from 'xlsx'

// 1. Configurações de API
const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const API_URL = `${BASE_URL}/clientes`;
const PROFISSIONAIS_API = `${BASE_URL}/profissionais`;
const USUARIOS_API = `${BASE_URL}/usuarios`;

// 2. Recuperar dados do usuário logado
const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || '{}')

// 3. Estados Reativos (Refs) - DECLARADOS APENAS UMA VEZ
const clientes = ref([])
const profissionais = ref([])
const listaUsuarios = ref([])
const searchQuery = ref('')
const isModalOpen = ref(false)
const isSidebarOpen = ref(false)
const editingCliente = ref(null)
const fotoPreview = ref(null)
const fotoFile = ref(null)

const opcoesPagamento = ['Dinheiro', 'Pix', 'Cartão Crédito', 'Cartão Débito', 'Boleto', 'Crediário Loja']
const opcoesCartoes = ['Visa Tudo Passa', 'Master Gold', 'Card Fidelidade', 'Black VIP']

const form = ref({
  codigo: '', nome: '', cpf_cnpj: '', celular: '', email: '',
  endereco: '', numero: '', bairro: '', cidade: '', uf: '', cep: '',
  formas_pagamento: [], 
  cartoes_loja: [],
  ref_usuarios: [],
  credito_limite: 0, 
  credito_atual: 0, 
  bloqueado: false, 
  motivo_bloqueio: ''
})

// --- LÓGICA DE FILTRAGEM RESTRITA (SEGURANÇA + BUSCA) ---
const filteredClientes = computed(() => {
  if (!Array.isArray(clientes.value)) return []
  
  let listaFiltrada = [...clientes.value]

  // REGRA 1: Se for CLIENTE, vê apenas a si mesmo
  if (usuarioLogado.tipo === 'Cliente') {
    listaFiltrada = listaFiltrada.filter(c => 
      c.ref_usuarios?.includes(usuarioLogado.login)
    )
  } 
  // REGRA 2: Se for Vendedor, Revendedor, etc., vê apenas os clientes vinculados a ele
  else if (['Vendedor', 'Revendedor', 'Afiliado', 'Fornecedor', 'Transportadora'].includes(usuarioLogado.tipo)) {
    const perfilProfissional = profissionais.value.find(p => 
      p.ref_usuarios?.includes(usuarioLogado.login)
    )
    
    if (perfilProfissional && perfilProfissional.ref_clientes) {
      const idsClientesPermitidos = perfilProfissional.ref_clientes.map(String)
      listaFiltrada = listaFiltrada.filter(c => 
        idsClientesPermitidos.includes(c.codigo.toString())
      )
    } else {
      listaFiltrada = []
    }
  }

  // Aplica o filtro de busca textual sobre o resultado da regra de segurança
  return listaFiltrada.filter(c => 
    c.nome?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    c.cpf_cnpj?.toString().includes(searchQuery.value)
  )
})

// Função para checar permissão de escrita
const podeGerenciar = computed(() => {
  return usuarioLogado.tipo !== 'Cliente'
})

// --- FUNÇÕES DE APOIO ---

const fetchData = async () => {
  try {
    const [resCli, resProf, resUser] = await Promise.all([
      fetch(API_URL),
      fetch(PROFISSIONAIS_API),
      fetch(USUARIOS_API)
    ])
    clientes.value = await resCli.json()
    profissionais.value = await resProf.json()
    listaUsuarios.value = await resUser.json()
  } catch (e) {
    console.error("Erro ao carregar dados", e)
  }
}

const profissionaisVinculados = computed(() => {
  if (!editingCliente.value) return []
  const clienteId = editingCliente.value.codigo.toString()
  return profissionais.value.filter(p => p.ref_clientes?.map(String).includes(clienteId))
})

const handleFileUpload = (e) => {
  const file = e.target.files[0]
  if (file) {
    fotoFile.value = file
    fotoPreview.value = URL.createObjectURL(file)
  }
}

const toggleSelection = (lista, item) => {
  const idx = form.value[lista].indexOf(item)
  if (idx > -1) form.value[lista].splice(idx, 1)
  else form.value[lista].push(item)
}

const openModal = (cliente = null) => {
  fotoFile.value = null
  if (cliente) {
    editingCliente.value = cliente
    form.value = { 
      ...cliente,
      formas_pagamento: Array.isArray(cliente.formas_pagamento) ? [...cliente.formas_pagamento] : [],
      cartoes_loja: Array.isArray(cliente.cartoes_loja) ? [...cliente.cartoes_loja] : [],
      ref_usuarios: Array.isArray(cliente.ref_usuarios) ? [...cliente.ref_usuarios] : [],
      bloqueado: cliente.bloqueado === true || cliente.bloqueado === 'true'
    }
    fotoPreview.value = cliente.foto ? `${BASE_URL}/uploads/clientes/${cliente.foto}` : null
  } else {
    editingCliente.value = null
    fotoPreview.value = null
    form.value = { 
      codigo: '', nome: '', cpf_cnpj: '', celular: '', email: '', 
      endereco: '', numero: '', bairro: '', cidade: '', uf: '', cep: '',
      formas_pagamento: [], cartoes_loja: [], ref_usuarios: [],
      credito_limite: 0, credito_atual: 0, bloqueado: false, motivo_bloqueio: ''
    }
  }
  isModalOpen.value = true
}

const saveCliente = async () => {
  const method = editingCliente.value ? 'PUT' : 'POST'
  const url = editingCliente.value ? `${API_URL}/${editingCliente.value.codigo}` : API_URL
  
  const formData = new FormData()
  Object.keys(form.value).forEach(key => {
    if (['formas_pagamento', 'cartoes_loja', 'ref_usuarios'].includes(key)) {
      formData.append(key, JSON.stringify(form.value[key]))
    } else {
      formData.append(key, form.value[key])
    }
  })
  if (fotoFile.value) formData.append('foto', fotoFile.value)

  try {
    const res = await fetch(url, { method, body: formData })
    if (res.ok) {
      fetchData()
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
    fetchData()
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="flex h-screen bg-slate-50 overflow-hidden">
    <Sidebar :isOpen="isSidebarOpen" @close="isSidebarOpen = false" />
    
    <div class="flex-1 flex flex-col min-w-0">
      <NavBar @toggleSidebar="isSidebarOpen = !isSidebarOpen" />
      
      <main class="flex-1 p-6 overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-black text-slate-800 uppercase italic leading-none">Gestão de Clientes</h1>
          <button v-if="podeGerenciar" @click="openModal()" class="px-6 py-3 bg-indigo-600 text-white rounded-2xl flex items-center gap-2 font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
            <Plus class="w-5 h-5" /> Novo Cliente
          </button>
        </div>

        <div class="relative mb-6">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input v-model="searchQuery" type="text" placeholder="Buscar por nome ou CPF..." class="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm">
        </div>

        <div class="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-widest font-black text-slate-400">
                <th class="px-6 py-5">Cliente</th>
                <th class="px-6 py-5">Status / Crédito</th>
                <th class="px-6 py-5">Localização</th>
                <th class="px-6 py-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="c in filteredClientes" :key="c.codigo" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 flex-shrink-0 shadow-sm">
                      <img v-if="c.foto" :src="`${BASE_URL}/uploads/clientes/${c.foto}`" class="w-full h-full object-cover" />
                      <div v-else class="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300"><User /></div>
                    </div>
                    <div>
                      <div class="font-bold text-slate-700 leading-tight">{{ c.nome }}</div>
                      <div class="text-[10px] text-slate-400 font-mono">#{{ c.codigo }} | {{ c.cpf_cnpj }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div v-if="c.bloqueado" class="text-red-500 text-[10px] font-black uppercase flex items-center gap-1 mb-1"><Ban class="w-3 h-3"/> Bloqueado</div>
                  <div v-else class="text-emerald-500 text-[10px] font-black uppercase flex items-center gap-1 mb-1"><CheckCircle class="w-3 h-3"/> Ativo</div>
                  <div class="text-xs font-bold text-slate-600">Limite: R$ {{ c.credito_limite?.toLocaleString() }}</div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-xs text-slate-600 font-bold">{{ c.cidade }} - {{ c.uf }}</div>
                  <div class="text-[10px] text-slate-400 uppercase tracking-tight">{{ c.bairro }}</div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex justify-center gap-2">
                    <button @click="openModal(c)" class="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all">
                      <Pencil v-if="podeGerenciar" class="w-4 h-4" />
                      <Search v-else class="w-4 h-4" /> 
                    </button>
                    <button 
                      v-if="podeGerenciar" 
                      @click="deleteCliente(c.codigo)" 
                      class="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
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

    <!-- MODAL FORMULÁRIO COMPLETO -->
    <div v-if="isModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div class="bg-white w-full max-w-6xl max-h-[95vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
        
        <div class="p-8 flex justify-between items-center border-b border-slate-100 bg-slate-50/30">
          <div>
            <h2 class="text-2xl font-black text-slate-800 uppercase italic leading-none">Ficha Cadastral</h2>
            <p class="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">Controle financeiro, endereço e acessos</p>
          </div>
          <button @click="isModalOpen = false" class="p-3 hover:bg-white border border-slate-200 rounded-2xl text-slate-400 shadow-sm transition-all"><X /></button>
        </div>

        <div class="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-8">
          
          <!-- LADO ESQUERDO: FOTO E STATUS -->
          <div class="md:col-span-3 space-y-6">
            <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-slate-400 ml-2">Foto do Cliente</label>
                <div @click="$refs.fileInput.click()" class="w-full aspect-square rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-400 transition-all group relative">
                    <img v-if="fotoPreview" :src="fotoPreview" class="w-full h-full object-cover" />
                    <div v-else class="text-slate-300 flex flex-col items-center"><ImageIcon class="w-10 h-10 mb-2"/><span class="text-[10px] font-bold uppercase">Upload Foto</span></div>
                    <input type="file" ref="fileInput" class="hidden" @change="handleFileUpload" accept="image/*" />
                </div>
            </div>

            <div class="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-4">
                <div class="flex items-center justify-between">
                    <label class="text-[10px] font-black uppercase text-slate-400">Bloquear Cliente</label>
                    <input type="checkbox" v-model="form.bloqueado" class="w-6 h-6 rounded-lg text-red-600 focus:ring-red-500">
                </div>
                <div v-if="form.bloqueado" class="space-y-2 animate-in slide-in-from-top-2">
                    <label class="text-[9px] font-black uppercase text-red-400">Motivo do Bloqueio</label>
                    <textarea v-model="form.motivo_bloqueio" class="w-full p-3 bg-white border border-red-100 rounded-xl text-xs outline-none" rows="2"></textarea>
                </div>
            </div>
          </div>

          <!-- LADO DIREITO: CAMPOS -->
          <div class="md:col-span-9 space-y-6">
            
            <!-- Grid de Dados Básicos -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Código</label><input v-model="form.codigo" :disabled="editingCliente" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500"></div>
                <div class="md:col-span-2 space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Nome Completo</label><input v-model="form.nome" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none"></div>
                <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">CPF/CNPJ</label><input v-model="form.cpf_cnpj" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none"></div>
                <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Celular</label><input v-model="form.celular" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none"></div>
                <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Email</label><input v-model="form.email" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none"></div>
            </div>

            <!-- BLOCO DE ENDEREÇO (RESTAURADO) -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-200">
                <div class="col-span-4 text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 mb-1"><MapPin class="w-4 h-4"/> Endereço de Entrega</div>
                <div class="space-y-1"><label class="text-[9px] font-bold uppercase text-slate-400">CEP</label><input v-model="form.cep" class="w-full p-3 bg-white border border-slate-100 rounded-xl outline-none"></div>
                <div class="md:col-span-2 space-y-1"><label class="text-[9px] font-bold uppercase text-slate-400">Logradouro / Rua</label><input v-model="form.endereco" class="w-full p-3 bg-white border border-slate-100 rounded-xl outline-none"></div>
                <div class="space-y-1"><label class="text-[9px] font-bold uppercase text-slate-400">Nº</label><input v-model="form.numero" class="w-full p-3 bg-white border border-slate-100 rounded-xl outline-none"></div>
                <div class="space-y-1"><label class="text-[9px] font-bold uppercase text-slate-400">Bairro</label><input v-model="form.bairro" class="w-full p-3 bg-white border border-slate-100 rounded-xl outline-none"></div>
                <div class="md:col-span-2 space-y-1"><label class="text-[9px] font-bold uppercase text-slate-400">Cidade</label><input v-model="form.cidade" class="w-full p-3 bg-white border border-slate-100 rounded-xl outline-none"></div>
                <div class="space-y-1"><label class="text-[9px] font-bold uppercase text-slate-400">UF</label><input v-model="form.uf" class="w-full p-3 bg-white border border-slate-100 rounded-xl outline-none" maxlength="2"></div>
            </div>

            <!-- FINANCEIRO E VÍNCULOS -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Crédito da Loja -->
                <div class="p-6 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100 grid grid-cols-2 gap-4">
                    <div class="col-span-2 text-[10px] font-black uppercase text-indigo-400 flex items-center gap-2 mb-1"><CreditCard class="w-4 h-4"/> Crédito Loja</div>
                    <div class="space-y-1"><label class="text-[9px] font-bold uppercase">Limite</label><input type="number" v-model="form.credito_limite" class="w-full p-3 bg-white border border-indigo-100 rounded-xl outline-none"></div>
                    <div class="space-y-1"><label class="text-[9px] font-bold uppercase">Saldo</label><input type="number" v-model="form.credito_atual" class="w-full p-3 bg-white border border-indigo-100 rounded-xl outline-none"></div>
                </div>

                <!-- Profissionais (Automático) -->
                <div class="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-200">
                    <div class="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 mb-3"><BadgeCheck class="w-4 h-4"/> Profissionais Vinculados</div>
                    <div v-if="profissionaisVinculados.length" class="space-y-2 max-h-24 overflow-y-auto pr-2">
                        <div v-for="p in profissionaisVinculados" :key="p.codigo" class="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                            <span class="text-xs font-bold text-slate-700">{{ p.nome }}</span>
                            <span class="text-[8px] px-2 py-1 bg-indigo-50 text-indigo-600 font-black rounded uppercase">{{ p.tipo }}</span>
                        </div>
                    </div>
                    <div v-else class="text-[10px] text-slate-400 italic py-4 text-center">Nenhum profissional vinculado</div>
                </div>
            </div>

            <!-- VÍNCULO DE USUÁRIOS (NOVO CAMPO) -->
            <div class="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-200">
                <label class="text-[10px] font-black uppercase text-indigo-500 flex items-center gap-2 mb-4"><LinkIcon class="w-4 h-4"/> Usuários do Sistema com Acesso a este Cliente</label>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-32 overflow-y-auto pr-2">
                    <label v-for="user in listaUsuarios" :key="user.login" class="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border border-transparent hover:bg-white hover:border-slate-100" :class="form.ref_usuarios.includes(user.login) ? 'bg-white border-indigo-200 shadow-sm' : ''">
                        <input type="checkbox" :value="user.login" v-model="form.ref_usuarios" class="w-4 h-4 rounded text-indigo-600">
                        <div class="flex flex-col">
                          <span class="text-xs font-bold text-slate-700">{{ user.login }}</span>
                          <span class="text-[8px] uppercase text-slate-400 font-black">{{ user.tipo }}</span>
                        </div>
                    </label>
                </div>
            </div>

            <!-- PAGAMENTOS E CARTÕES -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div class="space-y-3">
                    <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Pagamentos Permitidos</label>
                    <div class="flex flex-wrap gap-2">
                        <button v-for="op in opcoesPagamento" :key="op" @click="toggleSelection('formas_pagamento', op)"
                            :class="form.formas_pagamento.includes(op) ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border-slate-200'"
                            class="px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all">
                            {{ op }}
                        </button>
                    </div>
                </div>
                <div class="space-y-3">
                    <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Cartões Disponíveis</label>
                    <div class="flex flex-wrap gap-2">
                        <button v-for="card in opcoesCartoes" :key="card" @click="toggleSelection('cartoes_loja', card)"
                            :class="form.cartoes_loja.includes(card) ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-400 border-slate-200'"
                            class="px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all">
                            {{ card }}
                        </button>
                    </div>
                </div>
            </div>

          </div>
        </div>

        <div class="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button @click="isModalOpen = false" class="flex-1 py-5 font-black text-slate-400 hover:bg-white rounded-[2rem] transition-all uppercase tracking-widest text-[10px]">Cancelar</button>
          <button v-if="podeGerenciar" @click="saveCliente" class="flex-[3] py-5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-[2rem] shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all">
            <Save class="w-6 h-6" /> Salvar Cadastro Completo
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
</style>