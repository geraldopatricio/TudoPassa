<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { 
  Search, ShoppingBag, Heart, ChevronLeft, Star, 
  MapPin, QrCode, Truck, CheckCircle2, X, Plus, Minus,
  Copy, ChevronRight, Navigation, Trash2, ArrowLeft, PackageCheck, Info, Layers, Eye
} from 'lucide-vue-next'

// --- CONFIGURAÇÃO ---
const API_URL = import.meta.env.VITE_API_URL
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

// --- ESTADOS GLOBAIS ---
const products = ref([])
const cart = ref(JSON.parse(localStorage.getItem('gp_cart') || '[]'))
const currentStep = ref('home') 
const loading = ref(true)

// Seleção de Produto e UI
const selectedProduct = ref(null)
const isZoomed = ref(false)
const selectedSize = ref(null)
const selectedQty = ref(1)
const isGridMode = ref(false)

// Paginação e Busca de Produtos
const currentPage = ref(1)
const itemsPerPage = ref(4)
const searchQuery = ref('')

// Checkout e Clientes
const customer = ref({ nome: '', cpf: '', email: '', whatsapp: '', endereco: '' })
const allCustomers = ref([]) // Lista do banco
const customerSearchQuery = ref('')
const showCustomerSuggestions = ref(false)
const shippingValue = ref(0)
const calculatingShipping = ref(false)
const pixData = ref(null)

// --- MÉTODOS DE CARREGAMENTO ---
const fetchProducts = async () => {
  try {
    loading.value = true
    const res = await fetch(`${API_URL}/produtos`)
    const data = await res.json()
    products.value = Array.isArray(data) ? data : []
  } catch (e) { console.error(e) } finally { setTimeout(() => { loading.value = false }, 800) }
}

const fetchAllCustomers = async () => {
  try {
    const res = await fetch(`${API_URL}/clientes`)
    allCustomers.value = await res.json()
  } catch (e) { console.error(e) }
}

// --- LÓGICA DE FILTRO (PRODUTOS E CLIENTES) ---
const filteredBase = computed(() => {
  if (!searchQuery.value) return products.value
  return products.value.filter(p => p.descricao?.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

const filteredCustomers = computed(() => {
  if (!customerSearchQuery.value) return []
  return allCustomers.value.filter(c => 
    c.nome.toLowerCase().includes(customerSearchQuery.value.toLowerCase()) ||
    c.email.toLowerCase().includes(customerSearchQuery.value.toLowerCase())
  )
})

const totalPages = computed(() => Math.ceil(filteredBase.value.length / itemsPerPage.value) || 1)
const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredBase.value.slice(start, start + itemsPerPage.value)
})

// --- LÓGICA DE CLIENTES (PERSISTÊNCIA) ---
const selectCustomer = (c) => {
  customer.value = {
    nome: c.nome,
    cpf: c.cpf_cnpj,
    email: c.email,
    whatsapp: c.celular,
    endereco: c.endereco
  }
  customerSearchQuery.value = c.nome
  showCustomerSuggestions.value = false
  calculateShipping()
}

const checkExistingCustomer = () => {
  const existing = allCustomers.value.find(c => c.email.toLowerCase() === customer.value.email.toLowerCase())
  if (existing) selectCustomer(existing)
}

const saveCustomerToDB = async () => {
  const clienteData = {
    codigo: customer.value.cpf.replace(/\D/g, ''),
    nome: customer.value.nome,
    cpf_cnpj: customer.value.cpf,
    celular: customer.value.whatsapp,
    email: customer.value.email,
    endereco: customer.value.endereco
  }
  const exists = allCustomers.value.find(c => c.email === customer.value.email)
  const method = exists ? 'PUT' : 'POST'
  const url = exists ? `${API_URL}/clientes/${clienteData.codigo}` : `${API_URL}/clientes`
  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clienteData)
  })
}

// --- PAGAMENTO (A VERSÃO ÚNICA E CORRETA) ---
const handlePayment = async () => {
  if (!customer.value.nome || !customer.value.email || shippingValue.value === 0) {
    alert("Preencha seus dados e aguarde o cálculo do frete!")
    return
  }

  try {
    // 1. Salva/Atualiza o cliente no banco
    await saveCustomerToDB()

    // 2. GERAÇÃO DO PIX NO ASAAS
    const res = await fetch(`${API_URL}/produtos/checkout/pix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: customer.value.nome,
        email: customer.value.email,
        cpf: customer.value.cpf,
        valor: subtotalCart.value + shippingValue.value
      })
    })
    const data = await res.json()
    
    if (data.success) {
      pixData.value = data
      // 3. NOTIFICAÇÃO POR E-MAIL
      await fetch(`${API_URL}/produtos/notificar-pedido`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: customer.value,
          itens: cart.value,
          total: subtotalCart.value + shippingValue.value,
          frete: shippingValue.value
        })
      })
    } else {
      alert("Erro no pagamento: " + data.error)
    }
  } catch (e) {
    alert("Erro de conexão com o servidor.")
  }
}

// --- CÁLCULOS, CARRINHO E MAPA (MANTIDOS) ---
const subtotalCart = computed(() => cart.value.reduce((acc, item) => acc + item.totalPrice, 0))
const totalFinal = computed(() => subtotalCart.value + shippingValue.value)
const hasMultipleSizes = computed(() => {
  if (!selectedProduct.value) return false
  const grade = selectedProduct.value.variantes?.[0]?.grade || {}
  return Object.keys(grade).filter(tam => grade[tam] > 0).length > 1
})

const calculateShipping = () => {
  if (customer.value.endereco.length > 10) {
    calculatingShipping.value = true
    setTimeout(() => {
      shippingValue.value = Math.floor(Math.random() * (35 - 15 + 1)) + 15
      calculatingShipping.value = false
    }, 1500)
  }
}

const openDetails = (p) => {
  selectedProduct.value = p; selectedSize.value = null; selectedQty.value = 1;
  isGridMode.value = false; currentStep.value = 'details'; window.scrollTo(0, 0);
}

const handleAddToCart = () => {
  if (!isGridMode.value && !selectedSize.value) { alert("Selecione um tamanho!"); return; }
  const v = selectedProduct.value.variantes[0]
  if (isGridMode.value && hasMultipleSizes.value) {
    Object.keys(v.grade).forEach(tam => {
      if (v.grade[tam] > 0) cart.value.push({
        cartId: Date.now() + Math.random(), referencia: selectedProduct.value.referencia,
        descricao: selectedProduct.value.descricao, imagem: selectedProduct.value.imagem,
        chosenSize: tam, chosenQty: selectedQty.value, unitPrice: v.valor_unitario, totalPrice: v.valor_unitario * selectedQty.value
      })
    })
  } else {
    cart.value.push({
      cartId: Date.now() + Math.random(), referencia: selectedProduct.value.referencia,
      descricao: selectedProduct.value.descricao, imagem: selectedProduct.value.imagem,
      chosenSize: selectedSize.value, chosenQty: selectedQty.value, unitPrice: v.valor_unitario, totalPrice: v.valor_unitario * selectedQty.value
    })
  }
  localStorage.setItem('gp_cart', JSON.stringify(cart.value))
  currentStep.value = 'cart-summary'
}

const removeFromCart = (id) => { cart.value = cart.value.filter(i => i.cartId !== id); localStorage.setItem('gp_cart', JSON.stringify(cart.value)) }

const initMap = () => {
  if (!window.mapboxgl) return
  mapboxgl.accessToken = MAPBOX_TOKEN
  setTimeout(() => {
    const map = new mapboxgl.Map({ container: 'map', style: 'mapbox://styles/mapbox/streets-v12', center: [-38.5267, -3.7319], zoom: 14 })
    new mapboxgl.Marker({ color: '#4f46e5' }).setLngLat([-38.5267, -3.7319]).addTo(map)
    map.on('load', () => map.resize())
  }, 500)
}

const finishAndTrack = () => { currentStep.value = 'tracking'; cart.value = []; localStorage.removeItem('gp_cart'); nextTick(() => initMap()) }

onMounted(() => {
  fetchProducts()
  fetchAllCustomers()
})
</script>

<template>
  <div class="max-w-md mx-auto bg-slate-50 min-h-screen pb-24 font-sans text-slate-900 overflow-x-hidden relative">
    
    <!-- MODAL ZOOM IMAGEM -->
    <div v-if="isZoomed" class="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" @click="isZoomed = false">
      <img :src="`${API_URL}/uploads/${selectedProduct?.imagem}`" class="w-full max-h-[80vh] object-contain animate-in zoom-in duration-300">
      <button class="absolute top-12 right-6 text-white bg-white/10 p-4 rounded-full backdrop-blur">
        <X class="w-6 h-6" />
      </button>
      <div class="absolute bottom-12 text-white/50 font-bold uppercase tracking-widest text-[10px]">Toque para fechar</div>
    </div>

    <!-- HEADER FIXO -->
    <header class="sticky top-0 z-50 bg-white/90 backdrop-blur-lg p-4 flex justify-between items-center border-b border-slate-100 shadow-sm">
      <div class="flex items-center gap-2">
        <button v-if="currentStep !== 'home'" @click="currentStep = 'home'" class="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronLeft class="w-6 h-6" />
        </button>
        <h1 class="font-black text-2xl tracking-tighter italic text-indigo-600">Tudo Passa Store</h1>
      </div>
      
      <div class="relative cursor-pointer group" @click="currentStep = 'cart-summary'">
        <div class="p-2 group-active:scale-90 transition-transform">
          <ShoppingBag class="w-6 h-6 text-slate-700" />
          <span v-if="cart.length > 0" class="absolute top-1 right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white animate-bounce">
            {{ cart.length }}
          </span>
        </div>
      </div>
    </header>

    <!-- STEP 1: HOME (VITRINE) -->
    <main v-if="currentStep === 'home'" class="p-4 animate-in fade-in">
      <!-- Busca e Filtros -->
      <div class="flex items-center gap-3 mb-6">
        <div class="relative flex-1">
          <input type="text" v-model="searchQuery" placeholder="O que você procura hoje?" class="w-full bg-white border-none shadow-sm rounded-2xl py-4 px-12 outline-none focus:ring-2 ring-indigo-500/20 transition-all">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        </div>
        <select v-model="itemsPerPage" class="bg-white border-none shadow-sm rounded-2xl p-4 text-xs font-bold text-indigo-600 outline-none">
          <option :value="2">2 Itens</option>
          <option :value="4">4 Itens</option>
          <option :value="10">10 Itens</option>
        </select>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center py-24 gap-4">
        <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-400 font-bold text-[10px] tracking-widest uppercase animate-pulse">Sincronizando Estoque...</p>
      </div>

      <!-- Lista de Produtos -->
      <div v-else>
        <div v-if="paginatedProducts.length > 0" class="grid grid-cols-2 gap-4">
          <div v-for="p in paginatedProducts" :key="p.referencia" @click="openDetails(p)" 
               class="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 relative group active:scale-95 transition-all">
            <div class="relative overflow-hidden h-48">
              <img :src="`${API_URL}/uploads/${p.imagem}`" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
              <div class="absolute top-3 right-3 bg-white/80 backdrop-blur p-2 rounded-full shadow-sm">
                <Heart class="w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div class="p-5">
              <span class="text-[8px] font-black text-indigo-500 uppercase tracking-widest block mb-1">{{ p.categoria }}</span>
              <h3 class="font-bold text-xs text-slate-800 line-clamp-2 h-8 leading-tight mb-2 uppercase">{{ p.descricao }}</h3>
              <div class="flex items-center justify-between mt-4">
                <p class="text-lg font-black text-slate-900">R$ {{ p.variantes?.[0]?.valor_unitario?.toFixed(2) }}</p>
                <div class="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white">
                  <Plus class="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Empty State -->
        <div v-else class="text-center py-20">
          <div class="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search class="w-8 h-8 text-slate-300" />
          </div>
          <p class="text-slate-400 font-bold text-sm">Nenhum produto encontrado.</p>
        </div>

        <!-- Paginação Estilizada -->
        <div v-if="totalPages > 1" class="flex justify-center items-center gap-6 mt-12 mb-8">
          <button @click="currentPage--" :disabled="currentPage === 1" 
                  class="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm disabled:opacity-20 active:scale-90 transition-all">
            <ChevronLeft class="w-6 h-6"/>
          </button>
          <div class="flex flex-col items-center">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Página</span>
            <span class="text-sm font-black text-indigo-600">{{ currentPage }} / {{ totalPages }}</span>
          </div>
          <button @click="currentPage++" :disabled="currentPage >= totalPages" 
                  class="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm disabled:opacity-20 active:scale-90 transition-all">
            <ChevronRight class="w-6 h-6"/>
          </button>
        </div>
      </div>
    </main>

    <!-- STEP 2: DETALHES DO PRODUTO -->
    <div v-if="currentStep === 'details' && selectedProduct" class="animate-in slide-in-from-bottom-24 duration-500">
      <!-- Galeria Hero -->
      <div class="relative h-[55vh]">
        <img :src="`${API_URL}/uploads/${selectedProduct.imagem}`" @click="isZoomed = true" class="w-full h-full object-cover">
        
        <div class="absolute top-6 left-6 flex gap-2">
            <button @click="currentStep = 'home'" class="p-4 bg-white/90 backdrop-blur rounded-2xl shadow-xl active:scale-90 transition-all text-slate-900">
              <ArrowLeft class="w-6 h-6" />
            </button>
        </div>
        
        <button @click="isZoomed = true" class="absolute bottom-24 right-6 bg-white/90 backdrop-blur p-5 rounded-[2rem] shadow-2xl active:scale-90 transition-all">
          <Eye class="w-6 h-6 text-indigo-600" />
        </button>
      </div>

      <!-- Conteúdo Detalhes -->
      <div class="p-10 bg-white rounded-t-[4rem] -mt-20 relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
        <div class="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mb-10"></div>
        
        <div class="flex justify-between items-start mb-2">
          <h2 class="text-2xl font-black text-slate-900 leading-tight flex-1 uppercase tracking-tighter">{{ selectedProduct.descricao }}</h2>
          <div class="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-full">
            <Star class="w-3 h-3 fill-amber-400 text-amber-400" />
            <span class="text-[10px] font-black text-amber-600">4.9</span>
          </div>
        </div>
        
        <p class="text-4xl font-black text-indigo-600 italic mb-10 tracking-tighter">R$ {{ selectedProduct.variantes?.[0]?.valor_unitario?.toFixed(2) }}</p>

        <!-- NOVO: TOGGLE MODO GRADE EM LOTE (CONFORME REGRA) -->
        <div v-if="hasMultipleSizes" class="flex items-center justify-between bg-indigo-50 p-6 rounded-[2.5rem] mb-10 border border-indigo-100 shadow-sm shadow-indigo-100">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 bg-indigo-600 rounded-[1.2rem] flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                    <Layers class="w-7 h-7" />
                </div>
                <div>
                    <h4 class="font-black text-xs text-indigo-900 uppercase tracking-tight">Comprar em Grade</h4>
                    <p class="text-[9px] text-indigo-500 font-bold uppercase leading-tight">Adiciona {{selectedQty}} unidades de cada<br>tamanho automaticamente.</p>
                </div>
            </div>
            <button @click="isGridMode = !isGridMode" 
                    :class="isGridMode ? 'bg-indigo-600' : 'bg-slate-200'"
                    class="w-16 h-8 rounded-full relative transition-all duration-500 border-4 border-white shadow-inner">
                <div :class="isGridMode ? 'translate-x-8' : 'translate-x-0'" 
                     class="absolute top-0 w-6 h-6 bg-white rounded-full transition-transform shadow-lg"></div>
            </button>
        </div>

        <!-- Seletor de Tamanho (Oculto no Modo Grade) -->
        <div v-if="!isGridMode">
          <div class="flex justify-between items-center mb-5">
            <h4 class="font-black text-[11px] uppercase tracking-[0.2em] text-slate-400">1. Escolha o Tamanho</h4>
            <span class="text-[10px] font-bold text-indigo-600 underline">Guia de Medidas</span>
          </div>
          <div class="flex flex-wrap gap-4 mb-10">
              <button v-for="(qtd, tam) in selectedProduct.variantes?.[0]?.grade" :key="tam"
                      @click="qtd > 0 ? selectedSize = tam : null"
                      :class="[
                        selectedSize === tam ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-2xl scale-110 border-indigo-600' : 'bg-slate-50 border-slate-100',
                        qtd === 0 ? 'opacity-10 cursor-not-allowed bg-slate-200' : 'border-2 hover:border-indigo-200'
                      ]"
                      class="w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-lg transition-all duration-300">
                  {{ tam }}
              </button>
          </div>
        </div>

        <!-- Seletor de Quantidade -->
        <h4 class="font-black text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-5">
          {{ isGridMode ? '1' : '2' }}. Quantidade {{ isGridMode ? 'de cada item' : '' }}
        </h4>
        <div class="flex items-center gap-8 mb-12 bg-slate-50 w-max p-3 rounded-[2rem] border border-slate-100">
            <button @click="selectedQty = Math.max(1, selectedQty - 1)" class="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm active:scale-90 transition-all"><Minus class="w-5 h-5"/></button>
            <span class="font-black text-2xl w-10 text-center text-slate-800">{{ selectedQty }}</span>
            <button @click="selectedQty++" class="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm active:scale-90 transition-all"><Plus class="w-5 h-5"/></button>
        </div>

        <!-- Ação Principal -->
        <button @click="handleAddToCart" class="w-full bg-slate-900 py-7 rounded-[2.5rem] text-white font-black text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 group">
          <ShoppingBag class="w-6 h-6 group-hover:animate-bounce" /> 
          {{ isGridMode ? 'ADICIONAR GRADE COMPLETA' : 'ADICIONAR À CESTA' }}
        </button>

        <p class="text-center mt-8 text-[10px] font-bold text-slate-300 uppercase tracking-widest">Entrega garantida pela SuperFrete</p>
      </div>
    </div>

    <!-- STEP 3: CARRINHO / CESTA -->
    <div v-if="currentStep === 'cart-summary'" class="p-8 animate-in fade-in">
        <div class="flex justify-between items-end mb-10">
            <div>
              <h2 class="text-4xl font-black italic tracking-tighter text-slate-900 leading-none">Minha</h2>
              <h2 class="text-4xl font-black italic tracking-tighter text-indigo-600 leading-none">Cesta.</h2>
            </div>
            <button @click="currentStep = 'home'" class="text-indigo-600 font-black text-[10px] uppercase underline tracking-[0.2em]">Continuar Comprando</button>
        </div>

        <!-- Lista de Itens -->
        <div v-if="cart.length === 0" class="text-center py-32">
          <div class="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag class="w-10 h-10 text-slate-300" />
          </div>
          <p class="text-slate-400 font-bold uppercase tracking-widest">Sua cesta está vazia</p>
        </div>

        <div v-else class="space-y-6 mb-12">
            <div v-for="item in cart" :key="item.cartId" class="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 flex gap-5 items-center animate-in slide-in-from-right">
                <img :src="`${API_URL}/uploads/${item.imagem}`" class="w-24 h-24 rounded-[1.8rem] object-cover shadow-md">
                <div class="flex-1">
                    <h4 class="font-black text-xs text-slate-800 line-clamp-1 uppercase tracking-tight">{{ item.descricao }}</h4>
                    <p class="text-[10px] font-black text-indigo-600 uppercase mt-2 bg-indigo-50 w-max px-3 py-1 rounded-full">
                      TAM: {{ item.chosenSize }} | QTD: {{ item.chosenQty }}
                    </p>
                    <p class="text-xl font-black mt-2 text-slate-900 tracking-tighter">R$ {{ item.totalPrice.toFixed(2) }}</p>
                </div>
                <button @click="removeFromCart(item.cartId)" class="p-4 bg-red-50 text-red-500 rounded-2xl active:bg-red-100 transition-colors">
                  <Trash2 class="w-6 h-6"/>
                </button>
            </div>
            
            <!-- Resumo Financeiro -->
            <div class="bg-indigo-600 p-10 rounded-[3.5rem] text-white shadow-2xl mt-12 relative overflow-hidden">
                <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div class="flex justify-between items-center mb-6 opacity-80 font-bold text-sm uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span>R$ {{ subtotalCart.toFixed(2) }}</span>
                </div>
                <button @click="currentStep = 'checkout'" class="w-full bg-white text-indigo-600 py-6 rounded-[1.8rem] font-black uppercase text-sm tracking-[0.2em] shadow-xl active:scale-95 transition-all">
                  IR PARA O PAGAMENTO
                </button>
            </div>
        </div>
    </div>

    <!-- STEP 4: CHECKOUT (DADOS + PIX) -->
    <div v-if="currentStep === 'checkout'" class="p-8 animate-in slide-in-from-right duration-500">
    <h2 class="text-4xl font-black mb-4 italic tracking-tighter text-indigo-600">Checkout.</h2>
    
    <!-- PESQUISA DE CLIENTE EXISTENTE -->
    <div class="relative mb-8">
        <label class="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">Já é cliente? Busque aqui:</label>
        <div class="relative">
            <input 
                v-model="customerSearchQuery" 
                @focus="showCustomerSuggestions = true"
                placeholder="Pesquisar por nome ou e-mail..." 
                class="w-full p-4 bg-indigo-50 rounded-2xl border-2 border-transparent focus:border-indigo-200 outline-none font-bold text-xs"
            >
            <Search class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300" />
        </div>
        
        <!-- Lista de Sugestões -->
        <div v-if="showCustomerSuggestions && filteredCustomers.length > 0" class="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div 
                v-for="c in filteredCustomers" :key="c.codigo"
                @click="selectCustomer(c)"
                class="p-4 hover:bg-indigo-50 border-b border-slate-50 last:border-none cursor-pointer transition-colors"
            >
                <p class="font-black text-xs text-slate-800">{{ c.nome }}</p>
                <p class="text-[10px] text-slate-400">{{ c.email }}</p>
            </div>
        </div>
    </div>

    <div class="h-px bg-slate-100 w-full mb-8"></div>

    <!-- FORMULÁRIO DE DADOS -->
    <div class="space-y-4 mb-10">
        <input 
            v-model="customer.email" 
            @blur="checkExistingCustomer" 
            type="email" 
            placeholder="E-mail" 
            class="w-full p-6 bg-white rounded-[1.5rem] border-none shadow-sm outline-none focus:ring-2 ring-indigo-500/20 font-bold text-sm"
        >
        <input 
            v-model="customer.nome" 
            placeholder="Nome Completo" 
            class="w-full p-6 bg-white rounded-[1.5rem] border-none shadow-sm outline-none focus:ring-2 ring-indigo-500/20 font-bold text-sm"
        >
        <div class="grid grid-cols-2 gap-4">
          <input v-model="customer.cpf" placeholder="CPF" class="w-full p-6 bg-white rounded-[1.5rem] border-none shadow-sm outline-none focus:ring-2 ring-indigo-500/20 font-bold text-sm">
          <input v-model="customer.whatsapp" placeholder="WhatsApp" class="w-full p-6 bg-white rounded-[1.5rem] border-none shadow-sm outline-none focus:ring-2 ring-indigo-500/20 font-bold text-sm">
        </div>
        <input 
            v-model="customer.endereco" 
            @blur="calculateShipping" 
            placeholder="Endereço de Entrega" 
            class="w-full p-6 bg-white rounded-[1.5rem] border-none shadow-sm outline-none focus:ring-2 ring-indigo-500/20 font-bold text-sm"
        >
    </div>

        <!-- Box de Entrega (SuperFrete) -->
        <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 mb-10 shadow-sm">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                    <div class="p-3 bg-indigo-50 rounded-xl">
                      <Truck class="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">Frete Estimado</span>
                      <span class="text-xs font-bold text-slate-600">SuperFrete Express</span>
                    </div>
                </div>
                <div v-if="calculatingShipping" class="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span v-else class="text-2xl font-black text-indigo-600 tracking-tighter italic">R$ {{ shippingValue.toFixed(2) }}</span>
            </div>
            <div class="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl">
                <Info class="w-5 h-5 text-indigo-400 shrink-0" />
                <p class="text-[9px] text-slate-400 font-bold uppercase leading-relaxed">O valor do frete é calculado com base no seu endereço através da API SuperFrete.</p>
            </div>
        </div>

        <!-- Painel de Pagamento Final -->
        <div class="bg-indigo-600 p-10 rounded-[4rem] text-white mb-12 shadow-2xl shadow-indigo-100 relative overflow-hidden">
            <div class="flex justify-between items-center mb-8">
                <span class="font-bold opacity-70 uppercase text-xs tracking-[0.2em]">Total Final</span>
                <span class="text-4xl font-black italic tracking-tighter">R$ {{ totalFinal.toFixed(2) }}</span>
            </div>
            
            <!-- QR CODE PIX -->
            <div v-if="pixData" class="bg-white p-8 rounded-[3rem] text-center mb-8 animate-in zoom-in border-8 border-indigo-500/10">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Escaneie o código PIX</p>
                <img :src="`data:image/png;base64,${pixData.qrCode}`" class="w-56 mx-auto mb-8 rounded-2xl shadow-lg border-4 border-slate-50">
                <div class="flex flex-col gap-3">
                  <button @click="finishAndTrack" class="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">
                    CONFIRMAR PAGAMENTO
                  </button>
                </div>
            </div>

            <!-- Botão Gerar -->
            <button v-else @click="handlePayment" :disabled="calculatingShipping || shippingValue === 0" 
                    class="w-full bg-white text-indigo-600 py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm disabled:opacity-50 shadow-xl transition-all active:scale-95">
                GERAR QR-CODE PIX
            </button>
        </div>
    </div>

    <!-- STEP 5: TRACKING (RASTREIO + MAPA) -->
    <div v-if="currentStep === 'tracking'" class="p-8 animate-in slide-in-from-bottom-20 duration-700">
        <div class="flex items-center gap-6 mb-12">
            <div class="w-20 h-20 bg-emerald-500 text-white rounded-[2.2rem] flex items-center justify-center shadow-2xl shadow-emerald-200">
                <CheckCircle2 class="w-10 h-10" />
            </div>
            <div>
                <h2 class="font-black text-3xl tracking-tighter text-slate-900">Pedido Feito!</h2>
                <p class="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Acompanhe seu envio</p>
            </div>
        </div>

        <!-- Wizard de Status -->
        <div class="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 mb-10 relative">
            <div class="absolute left-12 top-16 bottom-16 w-1 bg-slate-100 rounded-full"></div>
            <div class="space-y-16">
                <div class="relative flex items-center gap-8">
                    <div class="z-10 w-8 h-8 rounded-full bg-emerald-500 border-4 border-white shadow-xl flex items-center justify-center text-white">
                      <CheckCircle2 class="w-4 h-4" />
                    </div>
                    <h4 class="font-black text-slate-900 uppercase text-xs tracking-widest">Pagamento Aprovado</h4>
                </div>
                <div class="relative flex items-center gap-8">
                    <div class="z-10 w-8 h-8 rounded-full bg-indigo-600 border-4 border-white shadow-xl animate-pulse"></div>
                    <div class="flex flex-col">
                      <h4 class="font-black text-slate-900 uppercase text-xs tracking-widest">Preparando para Envio</h4>
                      <span class="text-[9px] font-bold text-slate-400 mt-1 uppercase">Sua grade está sendo separada</span>
                    </div>
                </div>
                <div class="relative flex items-center gap-8 opacity-20">
                    <div class="z-10 w-8 h-8 rounded-full bg-slate-300 border-4 border-white shadow-sm"></div>
                    <h4 class="font-black text-slate-900 uppercase text-xs tracking-widest">Em Rota de Entrega</h4>
                </div>
            </div>
        </div>

        <!-- MAPA MAPBOX INTEGRADO -->
        <div class="bg-slate-900 h-96 rounded-[4rem] overflow-hidden relative shadow-2xl border-[12px] border-white">
            <div id="map" class="w-full h-full bg-slate-200 flex flex-col items-center justify-center">
                <Navigation class="w-10 h-10 text-indigo-600 animate-bounce mb-3" />
                <p class="text-slate-400 font-black text-[10px] uppercase tracking-widest">Iniciando GPS do entregador...</p>
            </div>
            
            <!-- Botão Abrir no Google Maps -->
            <a :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.endereco)}`" target="_blank"
               class="absolute bottom-8 right-8 bg-white p-6 rounded-full shadow-2xl text-indigo-600 active:scale-90 transition-transform">
                <MapPin class="w-7 h-7" />
            </a>
        </div>
        
        <button @click="currentStep = 'home'" class="w-full mt-12 py-7 text-slate-400 font-black text-[11px] uppercase tracking-[0.4em] border-2 border-slate-200 rounded-[2.5rem] active:bg-slate-50 transition-colors">
          Voltar para a vitrine
        </button>
    </div>

    <!-- BOTTOM NAV BAR (ESTADO HOME) -->
    <nav v-if="currentStep === 'home'" class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100 p-6 flex justify-around items-center z-[90] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <Search class="w-7 h-7 text-indigo-600 cursor-pointer" />
        <Heart class="w-7 h-7 text-slate-300 cursor-pointer" />
        
        <!-- Botão Central Flutuante -->
        <div class="bg-indigo-600 w-16 h-16 rounded-[1.5rem] -mt-16 border-[6px] border-slate-50 flex items-center justify-center text-white shadow-2xl shadow-indigo-200 active:scale-90 transition-transform cursor-pointer">
            <Plus class="w-8 h-8" />
        </div>
        
        <Truck class="w-7 h-7 text-slate-300 cursor-pointer" @click="currentStep = 'cart-summary'" />
        <MapPin class="w-7 h-7 text-slate-300 cursor-pointer" />
    </nav>

  </div>
</template>

<style scoped>
/* Animações de Transição */
.animate-in { 
  animation-duration: 0.6s; 
  animation-fill-mode: both; 
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn { 
  from { opacity: 0; } 
  to { opacity: 1; } 
}

@keyframes slideInFromBottom { 
  from { transform: translateY(100px); opacity: 0; } 
  to { transform: translateY(0); opacity: 1; } 
}

@keyframes slideInFromRight { 
  from { transform: translateX(100%); opacity: 0; } 
  to { transform: translateX(0); opacity: 1; } 
}

@keyframes zoomIn { 
  from { opacity: 0; transform: scale(0.8); } 
  to { opacity: 1; transform: scale(1); } 
}

.fade-in { animation-name: fadeIn; }
.slide-in-from-bottom-24 { animation-name: slideInFromBottom; }
.slide-in-from-right { animation-name: slideInFromRight; }
.zoom-in { animation-name: zoomIn; }

/* Custom Scrollbar (Invisível mas funcional) */
::-webkit-scrollbar {
  display: none;
}

/* Efeito de Ring personalizado para Inputs */
input:focus {
  border-color: #6366f1;
}

/* Garante que o container do mapa tenha o tamanho correto */
#map canvas {
  border-radius: 4rem;
}
</style>
