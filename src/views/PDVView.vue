<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import NavBar from '../components/NavBar.vue'
import Footer from '../components/Footer.vue'
import { 
  Search, Trash2, Plus, Minus, ChevronDown, UserPlus, CreditCard, X, Save,
  Mouse, Keyboard, Monitor, Printer, Smartphone, HardDrive, Cpu, Laptop,
  LayoutGrid, List as ListIcon, Percent, DollarSign, CheckCircle, FileText, AlertCircle, Loader2
} from 'lucide-vue-next'

// --- CONFIGURAÇÃO DA API ---
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000' // Altere para sua URL se necessário


const isSidebarOpen = ref(false)
const viewType = ref('grid') 
const searchQuery = ref('') 
const loading = ref(true)

// --- ESTADO DO CHECKOUT ---
const activeTab = ref('payment') 
const discountValue = ref(0)
const discountType = ref('fixed') 
const feeValue = ref(0)
const feeType = ref('fixed') 
const paymentMethod = ref('PIX')
const selectedCustomer = ref('João Silva')

// --- ESTADOS DOS MODAIS ---
const isSplitModalOpen = ref(false)
const isFinalizeChoiceOpen = ref(false)
const isReceiptModalOpen = ref(false)
const receiptType = ref('non-fiscal') 
const paymentLines = ref([])

// --- NOVOS ESTADOS PARA CLIENTES ---
const allCustomers = ref([])
const isCustomerModalOpen = ref(false)
const newCustomer = ref({
  codigo: '', nome: '', cpf_cnpj: '', celular: '', email: '',
  endereco: '', numero: '', bairro: '', cidade: '', uf: '', cep: ''
})

// Buscar clientes do banco
const fetchAllCustomers = async () => {
  try {
    const res = await fetch(`${API_URL}/clientes`)
    allCustomers.value = await res.json()
    
    // Se não houver cliente selecionado, define o primeiro como padrão ou mantém vazio
    if (allCustomers.value.length > 0 && selectedCustomer.value === 'João Silva') {
      selectedCustomer.value = allCustomers.value[0].nome
    }
  } catch (e) {
    console.error("Erro ao carregar clientes:", e)
  }
}

// Salvar novo cliente e selecionar automaticamente
const saveQuickCustomer = async () => {
  try {
    // Gerar um código simples baseado no timestamp se estiver vazio
    if (!newCustomer.value.codigo) newCustomer.value.codigo = Date.now().toString()

    const res = await fetch(`${API_URL}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCustomer.value)
    })

    if (res.ok) {
      const saved = await res.json()
      await fetchAllCustomers() // Atualiza a lista
      selectedCustomer.value = saved.nome // Seleciona o novo
      isCustomerModalOpen.value = false // Fecha modal
      // Limpa o formulário
      newCustomer.value = { codigo: '', nome: '', cpf_cnpj: '', celular: '', email: '', endereco: '', numero: '', bairro: '', cidade: '', uf: '', cep: '' }
    } else {
      const err = await res.json()
      alert(err.message || "Erro ao cadastrar cliente")
    }
  } catch (e) {
    alert("Erro de conexão com o servidor")
  }
}

// Chamar a busca no onMounted
onMounted(() => {
  fetchProducts()
  fetchAllCustomers() // Adicionado aqui
  window.addEventListener('keydown', handleShortcuts)
})

// --- PERSISTÊNCIA (LOCALSTORAGE) ---
const savedOrders = ref(JSON.parse(localStorage.getItem('gpsoft_pedidos_salvos') || '[]'))

const updateStorage = () => {
  localStorage.setItem('gpsoft_pedidos_salvos', JSON.stringify(savedOrders.value))
}

const paymentMethods = [
  'Cartão Crédito', 'Cartão Débito', 'PIX', 'Dinheiro', 'Boleto', 'Crédito Loja'
]

const company = {
  name: 'TUDO PASSA Delivery',
  cnpj: '00.999.888/0001-00',
  site: 'www.tudopassa.com.br',
  whatsapp: '(85) 991994652',
  email: 'contato@tudopassa.com.br'
}

// --- LISTA DE PRODUTOS (AGORA DINÂMICA) ---
const products = ref([])
const cart = ref([])

const fetchProducts = async () => {
  try {
    loading.value = true
    const res = await fetch(`${API_URL}/produtos`)
    const data = await res.json()
    
    // Mapeamos os campos da API para os campos que o template já usa
    if (Array.isArray(data)) {
      products.value = data.map(p => ({
        id: p.id || p.referencia,
        name: p.descricao, // substitui name por descricao
        price: p.variantes?.[0]?.valor_unitario || 0, // busca valor da primeira variante
        code: p.referencia, // substitui code por referencia
        image: p.imagem ? `${API_URL}/uploads/${p.imagem}` : '/assets/img/placeholder.png',
        discount: 0
      }))
    }
  } catch (e) {
    console.error("Erro ao buscar produtos da API:", e)
  } finally {
    loading.value = false
  }
}

// --- CÁLCULOS REATIVOS ---
const filteredProducts = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return products.value
  return products.value.filter(p => 
    p.name.toLowerCase().includes(query) || 
    p.code.toLowerCase().includes(query)
  )
})

const subtotal = computed(() => cart.value.reduce((acc, item) => acc + (item.price * item.qty), 0))

const calculatedDiscount = computed(() => {
  if (discountType.value === 'percent') return subtotal.value * (discountValue.value / 100)
  return discountValue.value
})

const calculatedFee = computed(() => {
  if (feeType.value === 'percent') return subtotal.value * (feeValue.value / 100)
  return feeValue.value
})

const totalFinal = computed(() => subtotal.value - calculatedDiscount.value + calculatedFee.value)

const totalPaidInModal = computed(() => paymentLines.value.reduce((acc, line) => acc + (line.value || 0), 0))
const totalRemaining = computed(() => Math.max(0, totalFinal.value - totalPaidInModal.value))
const changeAmount = computed(() => Math.max(0, totalPaidInModal.value - totalFinal.value))
const hasPendingOrders = computed(() => savedOrders.value.length > 0)

// --- FUNÇÕES DO CARRINHO ---
const addToCart = (product) => {
  const finalPrice = product.price - (product.discount || 0)
  const existingItem = cart.value.find(item => item.id === product.id)
  if (existingItem) {
    existingItem.qty++
  } else {
    cart.value.push({ ...product, price: finalPrice, originalPrice: product.price, qty: 1 })
  }
}

const updateQty = (id, amount) => {
  const item = cart.value.find(i => i.id === id)
  if (item) {
    item.qty = Math.max(0, item.qty + amount)
    if (item.qty === 0) removeItem(id)
  }
}

const removeItem = (id) => cart.value = cart.value.filter(i => i.id !== id)

// --- LÓGICA DE FINALIZAÇÃO ---
const openSplitModal = () => {
  paymentLines.value = [{ method: paymentMethod.value, value: totalFinal.value, installments: 1 }]
  isSplitModalOpen.value = true
}

const openFinalizeChoice = () => {
  isSplitModalOpen.value = false
  isFinalizeChoiceOpen.value = true
}

const resetSale = () => {
  cart.value = []
  discountValue.value = 0
  feeValue.value = 0
  isFinalizeChoiceOpen.value = false
  isReceiptModalOpen.value = false
}

const saveForLater = () => {
  if (cart.value.length === 0) return
  savedOrders.value.push({
    id: Date.now(),
    customer: selectedCustomer.value,
    items: [...cart.value],
    total: totalFinal.value,
    date: new Date().toISOString()
  })
  updateStorage()
  resetSale()
}

const restoreOrder = (order) => {
  if (cart.value.length > 0) {
    alert("O carrinho precisa estar vazio para recuperar um pedido!")
    return
  }
  cart.value = [...order.items]
  selectedCustomer.value = order.customer
  savedOrders.value = savedOrders.value.filter(o => o.id !== order.id)
  updateStorage()
}

const printReceipt = (type) => {
  if (cart.value.length === 0) return
  receiptType.value = type
  isReceiptModalOpen.value = true
}

// --- TECLAS DE ATALHO ---
const handleShortcuts = (event) => {
  if (['F1', 'F2', 'F3', 'F4'].includes(event.key)) {
    event.preventDefault()
    if (cart.value.length === 0) return
    if (event.key === 'F1') resetSale()
    if (event.key === 'F2') printReceipt('non-fiscal')
    if (event.key === 'F3') printReceipt('fiscal')
    if (event.key === 'F4') saveForLater()
  }
}

onMounted(() => {
  fetchProducts()
  window.addEventListener('keydown', handleShortcuts)
})

onUnmounted(() => window.removeEventListener('keydown', handleShortcuts))
</script>

<template>
  <div class="flex h-screen bg-slate-50 overflow-hidden font-sans">
    <Sidebar :isOpen="isSidebarOpen" @close="isSidebarOpen = false" />

    <div class="flex-1 flex flex-col min-w-0 relative">
      <NavBar 
        @toggleSidebar="isSidebarOpen = !isSidebarOpen" 
        :savedOrders="savedOrders"
        @restoreOrder="restoreOrder"
      />

      <!-- Banner de Pedidos Salvos -->
      <div v-if="hasPendingOrders" class="bg-indigo-600 text-white text-[10px] py-1.5 flex items-center justify-center gap-2 animate-pulse font-black uppercase tracking-widest">
        <AlertCircle class="w-3.5 h-3.5" /> Clique no sino para recuperar pedidos salvos
      </div>

      <main class="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 md:p-6 gap-6">
        
        <!-- COLUNA ESQUERDA: PRODUTOS -->
        <section class="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          
          <div class="flex items-center gap-4 mb-6">
            <div class="relative flex-1 group">
              <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-500" />
              <input type="text" v-model="searchQuery" placeholder="Buscar por referência ou descrição..." 
                class="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all">
            </div>
            
            <div class="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
              <button @click="viewType = 'grid'" 
                :class="viewType === 'grid' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'"
                class="p-2.5 rounded-xl transition-all"><LayoutGrid class="w-5 h-5" /></button>
              <button @click="viewType = 'list'" 
                :class="viewType === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'"
                class="p-2.5 rounded-xl transition-all"><ListIcon class="w-5 h-5" /></button>
            </div>
          </div>

          <!-- ESTADO DE CARREGAMENTO -->
          <div v-if="loading" class="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 class="w-10 h-10 animate-spin text-indigo-500" />
            <p class="font-bold text-xs uppercase tracking-widest">Carregando estoque...</p>
          </div>

          <!-- VISÃO GRID -->
          <div v-else-if="viewType === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
            <div v-for="p in filteredProducts" :key="p.id" @click="addToCart(p)"
              class="group bg-white p-4 rounded-[2rem] border border-slate-200 hover:border-indigo-200 hover:shadow-lg transition-all cursor-pointer flex flex-col">
              <div class="aspect-square bg-slate-50 rounded-2xl mb-3 flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 overflow-hidden">
                <img 
                  :src="p.image" 
                  :alt="p.name" 
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                />
              </div>
              <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{{ p.code }}</p>
              <h3 class="font-bold text-slate-700 text-sm line-clamp-1">{{ p.name }}</h3>
              <div class="flex justify-between items-center mt-auto pt-3 border-t border-slate-50">
                <p class="text-base font-black text-indigo-600">R$ {{ p.price.toFixed(2) }}</p>
                <div class="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                  <Plus class="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          <!-- VISÃO LISTA -->
          <div v-else class="space-y-2 animate-in slide-in-from-left-4 duration-300">
            <div class="bg-slate-200/50 p-3 rounded-xl grid grid-cols-12 gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest px-6">
              <div class="col-span-5">Produto</div>
              <div class="col-span-2 text-center">Preço Base</div>
              <div class="col-span-2 text-center">Desconto (R$)</div>
              <div class="col-span-2 text-center text-indigo-600">Preço Final</div>
              <div class="col-span-1"></div>
            </div>
            
            <div v-for="p in filteredProducts" :key="p.id" 
              class="bg-white p-3 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all grid grid-cols-12 gap-4 items-center px-6 group">
              <div class="col-span-5 flex items-center gap-4">
                <div class="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 overflow-hidden">
                  <img 
                    :src="p.image" 
                    :alt="p.name" 
                    class="w-full h-full object-cover" 
                  />
                </div>
                <div>
                  <h4 class="text-sm font-bold text-slate-700">{{ p.name }}</h4>
                  <span class="text-[10px] font-medium text-slate-400 tracking-tighter">{{ p.code }}</span>
                </div>
              </div>
              <div class="col-span-2 text-center font-bold text-slate-400 italic">R$ {{ p.price.toFixed(2) }}</div>
              <div class="col-span-2 flex justify-center">
                <div class="relative w-24">
                  <input type="number" v-model="p.discount" 
                    class="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-red-500 outline-none">
                  <DollarSign class="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-red-300" />
                </div>
              </div>
              <div class="col-span-2 text-center font-black text-indigo-600">
                R$ {{ (p.price - (p.discount || 0)).toFixed(2) }}
              </div>
              <div class="col-span-1 flex justify-end">
                <button @click="addToCart(p)" class="w-9 h-9 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-xl flex items-center justify-center border border-slate-100">
                  <Plus class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- COLUNA DIREITA: CHECKOUT (Mantida igual) -->
        <section class="w-full lg:w-[420px] flex flex-col gap-4">
          <!-- SEÇÃO CLIENTE NO PDV -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div class="flex justify-between items-center mb-2 px-1">
              <span class="text-sm font-semibold text-slate-600">Cliente:</span>
              <button @click="isCustomerModalOpen = true" class="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                <Plus class="w-3 h-3" /> Cadastrar Novo
              </button>
            </div>
            
            <div class="relative">
              <select v-model="selectedCustomer" class="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-sm font-medium text-slate-700 outline-none focus:ring-2 ring-indigo-500/10 transition-all">
                <option v-for="c in allCustomers" :key="c.codigo" :value="c.nome">
                  {{ c.nome }} ({{ c.cpf_cnpj }})
                </option>
              </select>
              <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <UserPlus class="w-4 h-4"/>
              </div>
              <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
            </div>
          </div>

          <div class="flex-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <h3 class="font-bold text-slate-800 text-base mb-4 italic">Sacola <span class="text-indigo-500">({{ cart.length }})</span></h3>
            <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-slate-300 italic text-sm">Sacola vazia</div>
              <div v-for="item in cart" :key="item.id" class="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex flex-col animate-in zoom-in">
                <div class="flex justify-between items-start mb-2">
                  <div><h4 class="text-xs font-bold text-slate-800">{{ item.name }}</h4><p class="text-[9px] text-slate-400">R$ {{ item.price.toFixed(2) }}</p></div>
                  <button @click="removeItem(item.id)" class="text-red-300 hover:text-red-500"><Trash2 class="w-3.5 h-3.5" /></button>
                </div>
                <div class="flex justify-between items-center mt-1">
                  <div class="flex items-center bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                    <button @click="updateQty(item.id, -1)" class="w-6 h-6 flex items-center justify-center border rounded text-slate-400"><Minus class="w-2.5 h-2.5"/></button>
                    <span class="w-10 text-center text-xs font-black text-slate-700">{{ item.qty }}</span>
                    <button @click="updateQty(item.id, 1)" class="w-6 h-6 flex items-center justify-center border rounded text-slate-400"><Plus class="w-2.5 h-2.5"/></button>
                  </div>
                  <span class="text-sm font-bold text-blue-600">R$ {{ (item.price * item.qty).toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex bg-slate-50 p-1 rounded-xl border border-slate-100 h-12">
              <button @click="activeTab = 'discount'" :class="activeTab === 'discount' ? 'bg-white text-slate-800 shadow-sm border-2 border-slate-800' : 'text-slate-400'" class="flex-1 text-xs font-bold rounded-lg uppercase transition-all">Desconto</button>
              <button @click="activeTab = 'fees'" :class="activeTab === 'fees' ? 'bg-white text-slate-800 shadow-sm border-2 border-slate-800' : 'text-slate-400'" class="flex-1 text-xs font-bold rounded-lg uppercase transition-all">Taxas</button>
              <button @click="activeTab = 'payment'" :class="activeTab === 'payment' ? 'bg-white text-slate-800 shadow-sm border-2 border-slate-800' : 'text-slate-400'" class="flex-1 text-xs font-bold rounded-lg uppercase transition-all">Pgto</button>
            </div>

            <div class="min-h-[50px]">
              <div v-if="activeTab === 'discount'" class="flex gap-2 animate-in fade-in">
                <input type="number" v-model="discountValue" class="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-red-500 outline-none">
                <div class="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                   <button @click="discountType = 'fixed'" :class="discountType === 'fixed' ? 'bg-white shadow-sm' : ''" class="px-3 rounded-lg"><DollarSign class="w-3.5 h-3.5"/></button>
                   <button @click="discountType = 'percent'" :class="discountType === 'percent' ? 'bg-white shadow-sm' : ''" class="px-3 rounded-lg"><Percent class="w-3.5 h-3.5"/></button>
                </div>
              </div>
              <div v-else-if="activeTab === 'fees'" class="flex gap-2 animate-in fade-in">
                <input type="number" v-model="feeValue" class="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-indigo-600 outline-none">
                <div class="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                   <button @click="feeType = 'fixed'" :class="feeType === 'fixed' ? 'bg-white shadow-sm' : ''" class="px-3 rounded-lg"><DollarSign class="w-3.5 h-3.5"/></button>
                   <button @click="feeType = 'percent'" :class="feeType === 'percent' ? 'bg-white shadow-sm' : ''" class="px-3 rounded-lg"><Percent class="w-3.5 h-3.5"/></button>
                </div>
              </div>
              <div v-else class="relative animate-in fade-in">
                <select v-model="paymentMethod" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold appearance-none outline-none">
                  <option v-for="m in paymentMethods" :key="m">{{ m }}</option>
                </select>
                <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <button @click="openSplitModal" class="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <CreditCard class="w-4 h-4 opacity-70" /> Dividir Pagamento
            </button>

            <div class="space-y-1.5 pt-2 border-t border-slate-100 border-dashed">
              <div class="flex justify-between text-sm"><span class="text-slate-700">Subtotal:</span><span class="font-medium text-slate-800 font-mono">R$ {{ subtotal.toFixed(2) }}</span></div>
              <div class="flex justify-between text-sm text-red-500 font-medium">
                <span>Desconto ({{ discountType === 'percent' ? discountValue + '%' : 'R$' }}):</span>
                <span class="font-mono">-R$ {{ calculatedDiscount.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between text-sm text-slate-700 font-medium">
                <span>Taxa Serviço ({{ feeType === 'percent' ? feeValue + '%' : 'R$' }}):</span>
                <span class="font-mono">+R$ {{ calculatedFee.toFixed(2) }}</span>
              </div>
            </div>

            <div class="flex justify-between items-center py-2 border-t border-slate-100 border-dashed">
              <span class="text-xl font-black text-blue-600">TOTAL:</span>
              <span class="text-3xl font-black text-blue-600 italic tracking-tighter">R$ {{ totalFinal.toFixed(2) }}</span>
            </div>

            <div class="flex gap-3">
              <button @click="resetSale" class="flex-1 py-3.5 flex items-center justify-center gap-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-red-50 transition-all">
                <X class="w-4 h-4" /> Cancelar
              </button>
              <button @click="openFinalizeChoice" :disabled="cart.length === 0" class="flex-[1.2] py-3.5 flex items-center justify-center gap-2 bg-[#1b8542] hover:bg-[#156e36] text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all disabled:opacity-50">
                <Save class="w-5 h-5" /> Finalizar
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>

    <!-- MODAL 1: DIVIDIR PAGAMENTO -->
    <div v-if="isSplitModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div class="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div class="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 class="text-xl font-bold text-slate-800 tracking-tight">Dividir Pagamento</h2>
          <button @click="isSplitModalOpen = false" class="p-2 hover:bg-slate-100 rounded-full transition-colors"><X class="w-5 h-5 text-slate-400" /></button>
        </div>
        <div class="grid grid-cols-3 gap-4 p-6 bg-slate-50/50">
          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Total</p><p class="text-xl font-black text-blue-600">R$ {{ totalFinal.toFixed(2) }}</p></div>
          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Pago</p><p class="text-xl font-black text-emerald-500">R$ {{ totalPaidInModal.toFixed(2) }}</p></div>
          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">{{ changeAmount > 0 ? 'Troco' : 'Restante' }}</p>
            <p :class="changeAmount > 0 ? 'text-emerald-600' : 'text-red-500'" class="text-xl font-black italic">R$ {{ (changeAmount > 0 ? changeAmount : totalRemaining).toFixed(2) }}</p>
          </div>
        </div>
        <div class="p-6 max-h-[40vh] overflow-y-auto custom-scrollbar space-y-4">
          <div v-for="(line, idx) in paymentLines" :key="idx" class="flex flex-wrap md:flex-nowrap items-end gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div class="flex-1 min-w-[150px]"><label class="text-[10px] font-bold text-slate-500 uppercase ml-1">Forma</label>
              <select v-model="line.method" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold outline-none"><option v-for="m in paymentMethods" :key="m" :value="m">{{ m }}</option></select>
            </div>
            <div class="w-32"><label class="text-[10px] font-bold text-slate-500 uppercase ml-1">Valor (R$)</label><input type="number" v-model="line.value" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none"></div>
            <div v-if="line.method === 'Cartão Crédito'" class="w-24"><label class="text-[10px] font-bold text-slate-500 uppercase ml-1">Parcelas</label><input type="number" v-model="line.installments" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none"></div>
            <button @click="paymentLines.splice(idx,1)" class="mb-1 p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 class="w-5 h-5" /></button>
          </div>
          <button @click="paymentLines.push({method: 'PIX', value: totalRemaining, installments: 1})" class="w-full py-3 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-500 font-bold text-sm"><Plus class="w-4 h-4" /> Adicionar Forma</button>
        </div>
        <div class="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button @click="isSplitModalOpen = false" class="flex-1 py-3 font-bold text-slate-600 bg-white border rounded-xl hover:bg-slate-100">Cancelar</button>
          <button @click="openFinalizeChoice" :disabled="totalRemaining > 0" :class="totalRemaining > 0 ? 'bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg'" class="flex-[2] py-3 font-bold text-white rounded-xl transition-all">Confirmar Pagamento</button>
        </div>
      </div>
    </div>

    <!-- MODAL 2: COMO DESEJA FINALIZAR? -->
    <div v-if="isFinalizeChoiceOpen" class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div class="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div class="flex justify-between items-center p-6 pb-2">
          <h2 class="text-lg font-bold text-slate-800">Como deseja finalizar?</h2>
          <button @click="isFinalizeChoiceOpen = false" class="p-1 hover:bg-slate-100 rounded-lg"><X class="w-5 h-5 text-slate-400" /></button>
        </div>
        <div class="p-6 space-y-3">
          <button @click="resetSale" class="w-full py-4 bg-[#1b8542] hover:bg-[#156e36] text-white rounded-2xl flex items-center justify-center gap-3 font-bold transition-all shadow-md active:scale-95">
            <CheckCircle class="w-5 h-5" /> Finalizar Pedido <span class="text-[10px] opacity-60 ml-1 font-mono">[F1]</span>
          </button>
          <button @click="printReceipt('non-fiscal')" class="w-full py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all active:scale-95">
            <Printer class="w-5 h-5" /> Cupom Não Fiscal <span class="text-[10px] opacity-40 ml-1 font-mono">[F2]</span>
          </button>
          <button @click="printReceipt('fiscal')" class="w-full py-4 bg-slate-50/50 border border-slate-100 hover:bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all active:scale-95">
            <FileText class="w-5 h-5" /> Cupom Fiscal <span class="text-[10px] opacity-40 ml-1 font-mono">[F3]</span>
          </button>
          <button @click="saveForLater" class="w-full py-4 bg-white border-2 border-blue-400 hover:bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all active:scale-95">
            <Save class="w-5 h-5" /> Salvar para Depois <span class="text-[10px] opacity-60 ml-1 font-mono">[F4]</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 3: IMPRESSÃO DE CUPOM -->
    <div v-if="isReceiptModalOpen" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto">
      <div class="bg-white w-[350px] rounded-xl shadow-2xl p-6 flex flex-col items-center font-mono text-[10px] text-slate-800 animate-in slide-in-from-bottom-10">
        <div class="text-center mb-4 border-b border-dashed border-slate-300 pb-2 w-full">
          <h1 class="text-sm font-black uppercase tracking-tighter">{{ company.name }}</h1>
          <p>CNPJ: {{ company.cnpj }}</p>
          <p>{{ company.site }}</p>
          <p>WhatsApp: {{ company.whatsapp }}</p>
        </div>
        <div class="w-full mb-4 space-y-0.5">
          <p class="font-bold">CLIENTE: <span class="font-normal uppercase">{{ selectedCustomer }}</span></p>
          <p class="font-bold">DATA: <span class="font-normal">{{ new Date().toLocaleString() }}</span></p>
          <p class="font-bold">DOC: <span class="font-normal">{{ receiptType === 'fiscal' ? 'CUPOM FISCAL' : 'CUPOM NÃO FISCAL' }}</span></p>
        </div>
        <div class="w-full border-y border-dashed border-slate-300 py-2 mb-2 space-y-1">
          <div class="flex justify-between font-bold"><span>ITEM</span><span>QTD</span><span>TOTAL</span></div>
          <div v-for="item in cart" :key="item.id" class="flex justify-between">
            <span class="truncate max-w-[150px]">{{ item.name }}</span>
            <span>{{ item.qty }}</span>
            <span>{{ (item.price * item.qty).toFixed(2) }}</span>
          </div>
        </div>
        <div class="w-full space-y-1 border-b border-dashed border-slate-300 pb-2 mb-2">
          <div class="flex justify-between"><span>SUBTOTAL</span><span>R$ {{ subtotal.toFixed(2) }}</span></div>
          <div class="flex justify-between text-red-500 font-bold"><span>DESCONTO</span><span>-R$ {{ calculatedDiscount.toFixed(2) }}</span></div>
          <div class="flex justify-between"><span>TAXAS</span><span>+R$ {{ calculatedFee.toFixed(2) }}</span></div>
          <div class="flex justify-between text-base font-black pt-1 border-t mt-1"><span>TOTAL</span><span>R$ {{ totalFinal.toFixed(2) }}</span></div>
        </div>
        <div class="w-full mb-6">
          <p class="font-bold">PAGAMENTO: <span class="font-normal">{{ paymentMethod }}</span></p>
          <p v-if="changeAmount > 0" class="flex justify-between text-emerald-600 font-bold"><span>TROCO</span><span>R$ {{ changeAmount.toFixed(2) }}</span></p>
        </div>
        <!-- Bloco QR Code -->
        <div v-if="receiptType === 'fiscal'" class="flex flex-col items-center gap-2 mb-6 w-full">
          <div class="w-24 h-24 bg-white border p-1 flex items-center justify-center">
             <svg viewBox="0 0 100 100" class="w-full h-full fill-slate-800"><path d="M0 0h40v40H0V0zm10 10v20h20V10H10zM60 0h40v40H60V0zm10 10v20h20V10H70zM0 60h40v40H0V60zm10 10v20h20V70H10zM60 60h10v10H60V60zm30 0h10v10H90V60zm-20 10h10v10H70V70zm20 0h10v10H90V70zm-20 10h10v10H70V80zm10 10h10v10H80V90zm10-10h10v10H90V80z"/></svg>
          </div>
          <p class="text-[8px] text-center text-slate-400">Consulte via QR Code em {{ company.site }}</p>
        </div>
        <button @click="resetSale" class="w-full py-3 bg-slate-800 text-white rounded-lg font-bold print:hidden">Fechar e Novo Atendimento</button>
      </div>
    </div>

    <!-- MODAL CADASTRO RÁPIDO DE CLIENTE -->
    <div v-if="isCustomerModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div class="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div class="p-6 flex justify-between items-center border-b border-slate-100">
          <h2 class="text-lg font-black text-slate-800 uppercase italic">Novo Cliente</h2>
          <button @click="isCustomerModalOpen = false" class="p-2 hover:bg-slate-100 rounded-full"><X class="w-5 h-5 text-slate-400" /></button>
        </div>
        
        <div class="p-6 grid grid-cols-2 gap-4">
          <div class="col-span-2 space-y-1">
            <label class="text-[9px] font-black uppercase text-slate-400 ml-1">Nome Completo</label>
            <input v-model="newCustomer.nome" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm">
          </div>
          <div class="space-y-1">
            <label class="text-[9px] font-black uppercase text-slate-400 ml-1">CPF/CNPJ</label>
            <input v-model="newCustomer.cpf_cnpj" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm">
          </div>
          <div class="space-y-1">
            <label class="text-[9px] font-black uppercase text-slate-400 ml-1">WhatsApp</label>
            <input v-model="newCustomer.celular" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm">
          </div>
          <div class="col-span-2 space-y-1">
            <label class="text-[9px] font-black uppercase text-slate-400 ml-1">Endereço de Entrega</label>
            <input v-model="newCustomer.endereco" placeholder="Rua, Número, Bairro..." class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm">
          </div>
        </div>

        <div class="p-6 bg-slate-50 flex gap-3">
          <button @click="isCustomerModalOpen = false" class="flex-1 py-3 font-bold text-slate-500 hover:bg-white rounded-xl transition-all text-xs">Cancelar</button>
          <button @click="saveQuickCustomer" class="flex-[2] py-3 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs">
            <CheckCircle class="w-4 h-4" /> Finalizar Cadastro
          </button>
        </div>
      </div>
    </div>


  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
@media print { .print\:hidden { display: none; } }
</style>
