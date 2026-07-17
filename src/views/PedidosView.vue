<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { 
  Search, Eye, Pencil, Trash2, Printer, X, Save, 
  ChevronLeft, ChevronRight, Loader2, Package, 
  CheckCircle2, Clock, Truck, Ban, Filter
} from 'lucide-vue-next'

const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || '{}')

// --- CONFIGURAÇÕES DE CONEXÃO ---
const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const API_URL = `${BASE_URL}/pedidos`;
const IMAGE_BASE = `${BASE_URL}/uploads/produtos`;

const pedidos = ref([])
const clientes = ref([])        
const profissionais = ref([])  
const searchQuery = ref('')
const loading = ref(true)
const isSidebarOpen = ref(false)
const filterStatus = ref('TODOS')

// --- ESTADO DO MODAL/DETALHES ---
const isModalOpen = ref(false)
const orderDetail = ref(null)
const loadingDetails = ref(false)

// --- PAGINAÇÃO ---
const currentPage = ref(1)
const itemsPerPage = ref(10)

const printRomaneio = () => {
  // Pequeno delay para garantir que o DOM está pronto, embora com o modal aberto já esteja
  window.print();
}

const fetchPedidos = async () => {
  try {
    loading.value = true
    const res = await fetch(API_URL)
    pedidos.value = await res.json()
  } catch (e) {
    console.error("Erro ao buscar pedidos:", e)
  } finally {
    loading.value = false
  }
}

// Abrir detalhes do pedido (Busca itens do backend)
const openDetails = async (pedido) => {
  isModalOpen.value = true
  loadingDetails.value = true
  try {
    const res = await fetch(`${API_URL}/${pedido.id}`)
    orderDetail.value = await res.json()
  } catch (e) {
    alert("Erro ao carregar itens do pedido")
  } finally {
    loadingDetails.value = false
  }
}

const updateStatus = async (id, newStatus) => {
  try {
    const res = await fetch(`${API_URL}/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    if (res.ok) {
      if (orderDetail.value) orderDetail.value.status = newStatus
      fetchPedidos()
    }
  } catch (e) {
    alert("Erro ao atualizar status")
  }
}

const deletePedido = async (id) => {
  if (confirm("Excluir este pedido permanentemente? Isso removerá os itens também.")) {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' })
    fetchPedidos()
    isModalOpen.value = false
  }
}

// --- NOVO: BUSCAR DADOS NECESSÁRIOS PARA O FILTRO ---
const fetchDadosIniciais = async () => {
  try {
    loading.value = true
    const [resPed, resCli, resProf] = await Promise.all([
      fetch(API_URL),
      fetch(CLIENTES_API),
      fetch(PROFISSIONAIS_API)
    ])
    pedidos.value = await resPed.json()
    clientes.value = await resCli.json()
    profissionais.value = await resProf.json()
  } catch (e) {
    console.error("Erro ao buscar dados:", e)
  } finally {
    loading.value = false
  }
}

// --- FILTRAGEM ---
const filteredPedidos = computed(() => {
  if (!Array.isArray(pedidos.value)) return []
  
  let listaFiltrada = [...pedidos.value]

  // REGRA PARA CLIENTE: Vê apenas pedidos vinculados ao seu CPF
  if (usuarioLogado.tipo === 'Cliente') {
    const meuPerfilCliente = clientes.value.find(c => 
      c.ref_usuarios?.includes(usuarioLogado.login)
    )
    if (meuPerfilCliente) {
      listaFiltrada = listaFiltrada.filter(p => p.cliente_cpf === meuPerfilCliente.cpf_cnpj)
    } else {
      listaFiltrada = [] // Não achou perfil de cliente para este usuário
    }
  }

  // REGRA PARA PROFISSIONAL (Vendedor, Revendedor, etc)
  else if (['Vendedor', 'Revendedor', 'Afiliado', 'Fornecedor', 'Transportadora'].includes(usuarioLogado.tipo)) {
    // 1. Achar o registro profissional desse cara
    const meuPerfilProf = profissionais.value.find(p => 
      p.ref_usuarios?.includes(usuarioLogado.login)
    )

    if (meuPerfilProf && meuPerfilProf.ref_clientes) {
      // 2. Pegar os códigos dos clientes vinculados a ele
      const codigosClientesAtendidos = meuPerfilProf.ref_clientes.map(String)
      
      // 3. Descobrir os CPFs desses clientes (ponte necessária)
      const cpfsPermitidos = clientes.value
        .filter(c => codigosClientesAtendidos.includes(c.codigo.toString()))
        .map(c => c.cpf_cnpj)

      // 4. Filtrar pedidos que pertençam a esses CPFs
      listaFiltrada = listaFiltrada.filter(p => cpfsPermitidos.includes(p.cliente_cpf))
    } else {
      listaFiltrada = []
    }
  }
  
  // REGRA PARA ADMIN/GERENTE: Não entra nos IFs acima e vê tudo.

  // Filtros de interface (Busca e Status) aplicado sobre a regra de segurança
  return listaFiltrada.filter(p => {
    const matchSearch = p.cliente_nome.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                        p.numero_pedido.toString().includes(searchQuery.value)
    const matchStatus = filterStatus.value === 'TODOS' || p.status === filterStatus.value
    return matchSearch && matchStatus
  })
})

const paginatedPedidos = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredPedidos.value.slice(start, start + itemsPerPage.value)
})

const totalPages = computed(() => Math.ceil(filteredPedidos.value.length / itemsPerPage.value))

const getStatusColor = (status) => {
  const colors = {
    'Pendente': 'bg-amber-100 text-amber-600',
    'Pago': 'bg-emerald-100 text-emerald-600',
    'Cancelado': 'bg-red-100 text-red-600',
    'Enviado': 'bg-blue-100 text-blue-600'
  }
  return colors[status] || 'bg-slate-100 text-slate-500'
}

onMounted(fetchPedidos)
onMounted(fetchDadosIniciais)
</script>

<template>
  <div id="admin-layout" class="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
    <Sidebar :isOpen="isSidebarOpen" @close="isSidebarOpen = false" />
    
    <div class="flex-1 flex flex-col min-w-0">
      <NavBar @toggleSidebar="isSidebarOpen = !isSidebarOpen" />
      
      <main class="flex-1 p-6 overflow-y-auto custom-scrollbar">
        <!-- Cabeçalho -->
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-black text-slate-800 uppercase tracking-tight italic">Gestão de Pedidos</h1>
          <div class="flex gap-3">
             <select v-model="filterStatus" class="bg-white border border-slate-200 rounded-2xl px-4 py-2 text-xs font-bold uppercase outline-none shadow-sm">
                <option value="TODOS">Todos Status</option>
                <option value="Pendente">Pendentes</option>
                <option value="Pago">Pagos</option>
                <option value="Enviado">Enviados</option>
                <option value="Cancelado">Cancelados</option>
             </select>
          </div>
        </div>

        <!-- Filtros e Busca -->
        <div class="relative mb-6">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input v-model="searchQuery" type="text" placeholder="Buscar por cliente ou número do pedido..." class="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none shadow-sm focus:ring-4 ring-indigo-500/10 transition-all">
        </div>

        <!-- Tabela de Pedidos -->
        <div class="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-widest font-black text-slate-500">
                  <th class="px-6 py-5">Pedido</th>
                  <th class="px-6 py-5">Cliente</th>
                  <th class="px-6 py-5">Data</th>
                  <th class="px-6 py-5">Total</th>
                  <th class="px-6 py-5">Status</th>
                  <th class="px-6 py-5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr v-if="loading">
                  <td colspan="6" class="py-20 text-center"><Loader2 class="w-8 h-8 animate-spin mx-auto text-indigo-500" /></td>
                </tr>
                <tr v-for="p in paginatedPedidos" :key="p.id" class="hover:bg-slate-50/50 transition-colors">
                  <td class="px-6 py-4 font-black text-slate-700">#{{ String(p.numero_pedido).padStart(4, '0') }}</td>
                  <td class="px-6 py-4">
                    <div class="flex flex-col">
                      <span class="font-bold text-sm text-slate-700 uppercase">{{ p.cliente_nome }}</span>
                      <span class="text-[10px] text-slate-400 font-bold">{{ p.cliente_email }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-xs font-bold text-slate-500">{{ new Date(p.data).toLocaleDateString() }}</td>
                  <td class="px-6 py-4 font-black text-indigo-600">R$ {{ p.total.toFixed(2) }}</td>
                  <td class="px-6 py-4">
                    <span :class="getStatusColor(p.status)" class="px-3 py-1 rounded-full text-[9px] font-black uppercase">
                      {{ p.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex justify-center gap-2">
                      <button @click="openDetails(p)" class="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Eye class="w-4 h-4"/></button>
                      <button v-if="usuarioLogado.tipo !== 'Cliente'" @click="deletePedido(p.id)" class="p-2 text-red-300 hover:bg-red-50 rounded-lg"><Trash2 class="w-4 h-4"/></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>

    <!-- MODAL DETALHES DO PEDIDO -->
    <div v-if="isModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div class="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in">
        
        <div class="p-8 flex justify-between items-center border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 class="text-xl font-black text-slate-800 uppercase italic">Pedido #{{ orderDetail?.numero_pedido }}</h2>
            <p class="text-[10px] font-bold text-slate-400 uppercase">Gerenciado via Tudo Passa Store</p>
          </div>
          <button @click="isModalOpen = false" class="p-2 hover:bg-white rounded-full shadow-sm"><X class="w-5 h-5 text-slate-400" /></button>
        </div>

        <div v-if="loadingDetails" class="p-20 text-center flex flex-col items-center gap-4">
          <Loader2 class="w-10 h-10 animate-spin text-indigo-500" />
          <p class="font-black text-xs text-slate-400 uppercase tracking-widest">Carregando itens...</p>
        </div>

        <div v-else-if="orderDetail" class="p-8 overflow-y-auto custom-scrollbar space-y-8">
          
          <!-- Infos do Cliente e Entrega -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-4">
              <h3 class="text-xs font-black text-indigo-600 uppercase tracking-widest border-b pb-2">Destinatário</h3>
              <p class="text-sm font-bold text-slate-700 uppercase">{{ orderDetail.cliente_nome }}</p>
              <div class="text-xs text-slate-500 space-y-1">
                <p>CPF: {{ orderDetail.cliente_cpf }}</p>
                <p>WhatsApp: {{ orderDetail.cliente_whatsapp }}</p>
                <p>Endereço: {{ orderDetail.endereco }}</p>
              </div>
            </div>
            <div class="space-y-4">
              <h3 class="text-xs font-black text-indigo-600 uppercase tracking-widest border-b pb-2">Logística</h3>
              <div class="flex items-center gap-3">
                <Truck class="w-5 h-5 text-slate-300" />
                <span class="text-sm font-bold text-slate-700 uppercase">{{ orderDetail.transportadora || 'Não informada' }}</span>
              </div>
              <div class="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                <p class="text-[10px] font-black text-amber-600 uppercase mb-1">Observações:</p>
                <p class="text-xs italic text-amber-800">{{ orderDetail.observacoes || 'Sem observações' }}</p>
              </div>
            </div>
          </div>

          <!-- Tabela de Itens -->
          <div>
            <h3 class="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">Itens do Pedido</h3>
            <div class="border border-slate-100 rounded-3xl overflow-hidden">
              <table class="w-full text-left">
                <thead class="bg-slate-50 text-[9px] font-black uppercase text-slate-400">
                  <tr>
                    <th class="px-4 py-3">Ref</th>
                    <th class="px-4 py-3">Produto</th>
                    <th class="px-4 py-3">Tamanho</th>
                    <th class="px-4 py-3 text-center">Qtd</th>
                    <th class="px-4 py-3">Unit</th>
                    <th class="px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  <tr v-for="item in orderDetail.itens" :key="item.id" class="text-xs">
                    <td class="px-4 py-3 font-mono text-slate-400">#{{ item.referencia }}</td>
                    <td class="px-4 py-3 font-bold text-slate-700 uppercase">{{ item.descricao }}</td>
                    <td class="px-4 py-3"><span class="px-2 py-1 bg-slate-100 rounded-md font-black text-[10px]">{{ item.tamanho }}</span></td>
                    <td class="px-4 py-3 text-center font-bold">{{ item.quantidade }}</td>
                    <td class="px-4 py-3 text-slate-400">R$ {{ item.valor_unitario.toFixed(2) }}</td>
                    <td class="px-4 py-3 font-black text-slate-700">R$ {{ item.valor_total.toFixed(2) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Resumo Financeiro e Status -->
          <div class="flex flex-col md:flex-row justify-between gap-8 pt-6 border-t">
            <div class="space-y-4" v-if="usuarioLogado.tipo !== 'Cliente'">
              <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alterar Status</h3>
              <div class="flex gap-2">
                <button @click="updateStatus(orderDetail.id, 'Pendente')" :class="orderDetail.status === 'Pendente' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all">Pendente</button>
                <button @click="updateStatus(orderDetail.id, 'Pago')" :class="orderDetail.status === 'Pago' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all">Pago</button>
                <button @click="updateStatus(orderDetail.id, 'Enviado')" :class="orderDetail.status === 'Enviado' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all">Enviado</button>
                <button @click="updateStatus(orderDetail.id, 'Cancelado')" :class="orderDetail.status === 'Cancelado' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all">Cancelar</button>
              </div>
            </div>
            
            <div class="bg-indigo-600 p-8 rounded-[2.5rem] text-white min-w-[300px] shadow-xl shadow-indigo-100">
               <div class="flex justify-between text-[10px] font-black opacity-60 uppercase mb-2"><span>Subtotal</span><span>R$ {{ orderDetail.subtotal.toFixed(2) }}</span></div>
               <div class="flex justify-between text-[10px] font-black opacity-60 uppercase mb-4"><span>Frete</span><span>R$ {{ orderDetail.frete.toFixed(2) }}</span></div>
               <div class="flex justify-between text-2xl font-black italic tracking-tighter"><span>TOTAL</span><span>R$ {{ orderDetail.total.toFixed(2) }}</span></div>
            </div>
          </div>
        </div>

        <div class="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
           <button 
              @click="printRomaneio" 
              :disabled="!orderDetail"
              class="flex-1 bg-white border border-slate-200 py-4 rounded-2xl font-bold text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-100 transition-all disabled:opacity-50"
            >
              <Printer class="w-5 h-5"/> Imprimir Romaneio
            </button>
           <button @click="isModalOpen = false" class="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg">Fechar Visualização</button>
        </div>
      </div>
    </div>
  </div>


    <!-- ÁREA DE IMPRESSÃO (Invisível na tela, visível no papel) -->
    <div id="romaneio-impressao" class="hidden-print-preview">
      <div class="p-10 text-black">
        <!-- Cabeçalho do Romaneio -->
        <div class="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
          <div>
            <h1 class="text-3xl font-black uppercase italic">Tudo Passa Store</h1>
            <p class="text-sm font-bold">ROMANEIO DE SEPARAÇÃO E ENVIO</p>
          </div>
          <div class="text-right">
            <h2 class="text-2xl font-black">PEDIDO #{{ String(orderDetail?.numero_pedido).padStart(4, '0') }}</h2>
            <p class="text-sm">{{ new Date(orderDetail?.data).toLocaleString() }}</p>
          </div>
        </div>

        <!-- Informações de Entrega -->
        <div class="grid grid-cols-2 gap-10 mb-10">
          <div class="border border-black p-4">
            <p class="text-[10px] font-black uppercase mb-1">Destinatário:</p>
            <p class="font-bold uppercase">{{ orderDetail?.cliente_nome }}</p>
            <p class="text-sm">CPF: {{ orderDetail?.cliente_cpf }}</p>
            <p class="text-sm">WhatsApp: {{ orderDetail?.cliente_whatsapp }}</p>
            <p class="text-sm mt-2">Endereço: {{ orderDetail?.endereco }}</p>
          </div>
          <div class="border border-black p-4">
            <p class="text-[10px] font-black uppercase mb-1">Logística / Transporte:</p>
            <p class="font-bold uppercase">{{ orderDetail?.transportadora || 'A RETIRAR / EXCURSÃO' }}</p>
            <p class="text-[10px] font-black uppercase mt-4 mb-1">Observações:</p>
            <p class="text-sm italic">{{ orderDetail?.observacoes || 'Sem observações adicionais' }}</p>
          </div>
        </div>

        <!-- Tabela de Produtos -->
        <table class="w-full border-collapse mb-10">
          <thead>
            <tr class="border-b-2 border-black">
              <th class="text-left py-2 text-xs uppercase">Ref</th>
              <th class="text-left py-2 text-xs uppercase">Descrição do Produto</th>
              <th class="text-center py-2 text-xs uppercase">Tam</th>
              <th class="text-center py-2 text-xs uppercase">Qtd</th>
              <th class="text-right py-2 text-xs uppercase">Conferido</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in orderDetail?.itens" :key="item.id" class="border-b border-gray-300">
              <td class="py-3 text-sm font-mono">#{{ item.referencia }}</td>
              <td class="py-3 text-sm font-bold uppercase">{{ item.descricao }}</td>
              <td class="py-3 text-center font-black">{{ item.tamanho }}</td>
              <td class="py-3 text-center text-lg font-black">{{ item.quantidade }}</td>
              <td class="py-3 text-right">
                <div class="inline-block w-6 h-6 border border-black"></div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Rodapé de Assinatura -->
        <div class="mt-20 grid grid-cols-2 gap-20">
          <div class="border-t border-black pt-2 text-center">
            <p class="text-[10px] font-black uppercase">Responsável pela Separação</p>
          </div>
          <div class="border-t border-black pt-2 text-center">
            <p class="text-[10px] font-black uppercase">Conferência Final / Embalagem</p>
          </div>
        </div>
        
        <div class="mt-10 text-center">
            <p class="text-[9px] text-gray-500 uppercase tracking-widest">Documento gerado pelo sistema de gestão Tudo Passa Store</p>
        </div>
      </div>
    </div>


</template>

<style scoped>
/* --- ESTILOS DA TELA (BROWSER) --- */
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.animate-in { animation: zoomIn 0.3s ease-out; }
@keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

/* Esconde o romaneio da tela do computador */
.hidden-print-preview {
  display: none;
}
</style>

<style>
/* ESTE BLOCO AFETA A PÁGINA TODA NA HORA DE IMPRIMIR */
@media print {
  /* 1. Esconde os containers de interface e o Modal */
  /* Targetamos o layout, o sidebar (aside), o navbar (nav) e qualquer fundo fixo (modal) */
  #admin-layout, 
  aside, 
  nav, 
  .fixed.inset-0, 
  header,
  button {
    display: none !important;
    visibility: hidden !important;
  }

  /* 2. Garante que o corpo da página não tenha fundo cinza ou padding */
  body, html {
    background: white !important;
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
  }

  /* 3. Posiciona o Romaneio no topo absoluto da folha */
  #romaneio-impressao {
    display: block !important;
    visibility: visible !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
  }

  /* 4. Força todos os textos e bordas a aparecerem (Preto no Branco) */
  #romaneio-impressao * {
    visibility: visible !important;
    color: black !important;
    border-color: black !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* 5. Configuração da Página */
  @page {
    size: portrait;
    margin: 1cm;
  }
}
</style>