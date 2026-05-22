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

// NOVO: Controle de quantidades individuais por tamanho
const quantitiesPerSize = ref({})

// Paginação e Busca de Produtos
const currentPage = ref(1)
const itemsPerPage = ref(4)
const searchQuery = ref('')

// Checkout e Clientes
const customer = ref({ nome: '', cpf: '', email: '', whatsapp: '', endereco: '' })
const allCustomers = ref([]) 
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
  } catch (e) { 
    console.error("ERRO REAL:", e);
  } finally { setTimeout(() => { loading.value = false }, 800) }
}

const fetchAllCustomers = async () => {
  try {
    const res = await fetch(`${API_URL}/clientes`)
    allCustomers.value = await res.json()
  } catch (e) { 
    console.error("ERRO REAL:", e)
  }
}

// --- LÓGICA DE FILTRO ---
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

// --- LÓGICA DE CLIENTES ---
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
    codigo: String(customer.value.cpf || '').replace(/\D/g, ''), 
    nome: customer.value.nome,
    cpf_cnpj: String(customer.value.cpf || ''),
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

// --- PAGAMENTO ---
const handlePayment = async () => {
  console.log("Tentando conectar em:", `${API_URL}/produtos/checkout/pix`); 
  if (!customer.value.nome || !customer.value.email || shippingValue.value === 0) {
    alert("Preencha seus dados e aguarde o cálculo do frete!")
    return
  }

  try {
    await saveCustomerToDB()
    const res = await fetch(`${API_URL}/produtos/checkout/pix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: customer.value.nome,
        email: customer.value.email,
        cpf: String(customer.value.cpf || '').replace(/\D/g, ''), 
        valor: subtotalCart.value + shippingValue.value
      })
    })
    const data = await res.json()
    
    if (data.success) {
      pixData.value = data
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
    console.error("ERRO REAL:", e); 
    alert("Erro de conexão com o servidor.")
  }
}

// --- CÁLCULOS E CARRINHO ---
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
  selectedProduct.value = p; 
  selectedSize.value = null; 
  selectedQty.value = 1;
  isGridMode.value = false;
  
  // Inicializa quantidades individuais com 0
  quantitiesPerSize.value = {};
  if (p.variantes?.[0]?.grade) {
    Object.keys(p.variantes[0].grade).forEach(tam => {
      quantitiesPerSize.value[tam] = 0;
    });
  }
  
  currentStep.value = 'details'; 
  window.scrollTo(0, 0);
}

const handleAddToCart = () => {
  const v = selectedProduct.value.variantes[0]
  let itemsToAdd = []

  if (isGridMode.value) {
    // LÓGICA DE GRADE: Pega o selectedQty global e aplica a todos os tamanhos com estoque
    Object.keys(v.grade).forEach(tam => {
      if (v.grade[tam] > 0) {
        itemsToAdd.push({
          cartId: Date.now() + Math.random(), 
          referencia: selectedProduct.value.referencia,
          descricao: selectedProduct.value.descricao, 
          imagem: selectedProduct.value.imagem,
          chosenSize: tam, 
          chosenQty: selectedQty.value, 
          unitPrice: v.valor_unitario, 
          totalPrice: v.valor_unitario * selectedQty.value
        })
      }
    })
  } else {
    // LÓGICA INDIVIDUAL: Adiciona apenas tamanhos com quantidade > 0
    Object.entries(quantitiesPerSize.value).forEach(([tam, qty]) => {
      if (qty > 0) {
        itemsToAdd.push({
          cartId: Date.now() + Math.random(), 
          referencia: selectedProduct.value.referencia,
          descricao: selectedProduct.value.descricao, 
          imagem: selectedProduct.value.imagem,
          chosenSize: tam, 
          chosenQty: qty, 
          unitPrice: v.valor_unitario, 
          totalPrice: v.valor_unitario * qty
        })
      }
    })
  }

  if (itemsToAdd.length === 0) {
    alert("Selecione a quantidade de pelo menos um tamanho!");
    return;
  }

  cart.value.push(...itemsToAdd);
  localStorage.setItem('gp_cart', JSON.stringify(cart.value))
  currentStep.value = 'cart-summary'
}

const removeFromCart = (id) => { 
  cart.value = cart.value.filter(i => i.cartId !== id); 
  localStorage.setItem('gp_cart', JSON.stringify(cart.value)) 
}

const initMap = () => {
  if (!window.mapboxgl) return
  mapboxgl.accessToken = MAPBOX_TOKEN
  setTimeout(() => {
    const map = new mapboxgl.Map({ container: 'map', style: 'mapbox://styles/mapbox/streets-v12', center: [-38.5267, -3.7319], zoom: 14 })
    new mapboxgl.Marker({ color: '#4f46e5' }).setLngLat([-38.5267, -3.7319]).addTo(map)
    map.on('load', () => map.resize())
  }, 500)
}

const finishAndTrack = () => { 
  currentStep.value = 'tracking'; 
  cart.value = []; 
  localStorage.removeItem('gp_cart'); 
  nextTick(() => initMap()) 
}

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

      <div v-if="loading" class="flex flex-col items-center py-24 gap-4">
        <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-400 font-bold text-[10px] tracking-widest uppercase">Sincronizando...</p>
      </div>

      <div v-else>
        <div v-if="paginatedProducts.length > 0" class="grid grid-cols-2 gap-4">
          <div v-for="p in paginatedProducts" :key="p.referencia" @click="openDetails(p)" 
               class="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 relative group active:scale-95 transition-all">
            <div class="relative overflow-hidden h-48">
              <img :src="`${API_URL}/uploads/${p.imagem}`" class="w-full h-full object-cover">
            </div>
            <div class="p-5">
              <span class="text-[8px] font-black text-indigo-500 uppercase block mb-1">{{ p.categoria }}</span>
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
        
        <!-- Paginação -->
        <div v-if="totalPages > 1" class="flex justify-center items-center gap-6 mt-12 mb-8">
          <button @click="currentPage--" :disabled="currentPage === 1" class="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm disabled:opacity-20"><ChevronLeft class="w-6 h-6"/></button>
          <span class="text-sm font-black text-indigo-600">{{ currentPage }} / {{ totalPages }}</span>
          <button @click="currentPage++" :disabled="currentPage >= totalPages" class="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm disabled:opacity-20"><ChevronRight class="w-6 h-6"/></button>
        </div>
      </div>
    </main>

    <!-- STEP 2: DETALHES DO PRODUTO (NOVO SELETOR) -->
    <div v-if="currentStep === 'details' && selectedProduct" class="animate-in slide-in-from-bottom-24 duration-500">
      <div class="relative h-[55vh]">
        <img :src="`${API_URL}/uploads/${selectedProduct.imagem}`" @click="isZoomed = true" class="w-full h-full object-cover">
        <button @click="currentStep = 'home'" class="absolute top-6 left-6 p-4 bg-white/90 backdrop-blur rounded-2xl shadow-xl">
          <ArrowLeft class="w-6 h-6" />
        </button>
      </div>

      <div class="p-10 bg-white rounded-t-[4rem] -mt-20 relative z-10 shadow-2xl">
        <div class="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mb-10"></div>
        
        <h2 class="text-2xl font-black text-slate-900 leading-tight uppercase mb-2">{{ selectedProduct.descricao }}</h2>
        <p class="text-4xl font-black text-indigo-600 italic mb-10">R$ {{ selectedProduct.variantes?.[0]?.valor_unitario?.toFixed(2) }}</p>

        <!-- TOGGLE MODO GRADE -->
        <div v-if="hasMultipleSizes" class="flex items-center justify-between bg-indigo-50 p-6 rounded-[2.5rem] mb-10 border border-indigo-100 shadow-sm">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                    <Layers class="w-6 h-6" />
                </div>
                <div>
                    <h4 class="font-black text-xs text-indigo-900 uppercase">Comprar em Grade</h4>
                    <p class="text-[9px] text-indigo-500 font-bold uppercase">Mesma QTD para todos os tamanhos</p>
                </div>
            </div>
            <button @click="isGridMode = !isGridMode" 
                    :class="isGridMode ? 'bg-indigo-600' : 'bg-slate-200'"
                    class="w-14 h-7 rounded-full relative transition-all border-4 border-white">
                <div :class="isGridMode ? 'translate-x-7' : 'translate-x-0'" class="absolute top-0 w-5 h-5 bg-white rounded-full transition-transform"></div>
            </button>
        </div>

        <!-- SELETOR: MODO GRADE (LAYOUT ORIGINAL) -->
        <div v-if="isGridMode">
            <h4 class="font-black text-[11px] uppercase tracking-widest text-slate-400 mb-5">Quantidade para cada item da grade</h4>
            <div class="flex items-center gap-8 mb-12 bg-slate-50 w-max p-3 rounded-[2rem] border border-slate-100">
                <button @click="selectedQty = Math.max(1, selectedQty - 1)" class="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm"><Minus class="w-5 h-5"/></button>
                <span class="font-black text-2xl w-10 text-center text-slate-800">{{ selectedQty }}</span>
                <button @click="selectedQty++" class="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm"><Plus class="w-5 h-5"/></button>
            </div>
        </div>

        <!-- SELETOR: MODO INDIVIDUAL (LISTA POR TAMANHO) -->
        <div v-else class="space-y-4 mb-10">
            <h4 class="font-black text-[11px] uppercase tracking-widest text-slate-400 mb-2">Selecione as quantidades</h4>
            <div v-for="(estoque, tam) in selectedProduct.variantes?.[0]?.grade" :key="tam" 
                 class="flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-slate-100"
                 :class="estoque === 0 ? 'opacity-40 grayscale' : ''">
                
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm text-lg">
                    {{ tam }}
                  </div>
                  <div>
                    <span class="text-[9px] font-black text-slate-400 uppercase block">Estoque</span>
                    <span class="text-xs font-bold text-slate-600">{{ estoque }} disponíveis</span>
                  </div>
                </div>

                <div class="flex items-center gap-4 bg-white p-1.5 rounded-2xl shadow-sm">
                    <button @click="quantitiesPerSize[tam] = Math.max(0, quantitiesPerSize[tam] - 1)" 
                            class="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500">
                      <Minus class="w-5 h-5" />
                    </button>
                    <span class="font-black text-lg w-6 text-center" :class="quantitiesPerSize[tam] > 0 ? 'text-indigo-600' : 'text-slate-300'">
                      {{ quantitiesPerSize[tam] }}
                    </span>
                    <button @click="quantitiesPerSize[tam] < estoque ? quantitiesPerSize[tam]++ : null"
                            class="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600">
                      <Plus class="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>

        <button @click="handleAddToCart" class="w-full bg-slate-900 py-7 rounded-[2.5rem] text-white font-black text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4">
          <ShoppingBag class="w-6 h-6" /> 
          {{ isGridMode ? 'ADICIONAR GRADE COMPLETA' : 'ADICIONAR AO CARRINHO' }}
        </button>
      </div>
    </div>

    <!-- STEP 3: CARRINHO -->
    <div v-if="currentStep === 'cart-summary'" class="p-8 animate-in fade-in">
        <div class="flex justify-between items-end mb-10">
            <div>
              <h2 class="text-4xl font-black italic tracking-tighter text-slate-900 leading-none">Minha</h2>
              <h2 class="text-4xl font-black italic tracking-tighter text-indigo-600 leading-none">Cesta.</h2>
            </div>
            <button @click="currentStep = 'home'" class="text-indigo-600 font-black text-[10px] uppercase underline">Continuar Comprando</button>
        </div>

        <div v-if="cart.length === 0" class="text-center py-32">
          <ShoppingBag class="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p class="text-slate-400 font-bold uppercase">Sua cesta está vazia</p>
        </div>

        <div v-else class="space-y-6">
            <div v-for="item in cart" :key="item.cartId" class="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 flex gap-5 items-center">
                <img :src="`${API_URL}/uploads/${item.imagem}`" class="w-20 h-20 rounded-[1.5rem] object-cover">
                <div class="flex-1">
                    <h4 class="font-black text-xs text-slate-800 line-clamp-1 uppercase">{{ item.descricao }}</h4>
                    <p class="text-[10px] font-black text-indigo-600 mt-1">TAM: {{ item.chosenSize }} | QTD: {{ item.chosenQty }}</p>
                    <p class="text-lg font-black text-slate-900">R$ {{ item.totalPrice.toFixed(2) }}</p>
                </div>
                <button @click="removeFromCart(item.cartId)" class="p-3 bg-red-50 text-red-500 rounded-xl">
                  <Trash2 class="w-5 h-5"/>
                </button>
            </div>
            
            <div class="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl mt-10">
                <div class="flex justify-between items-center mb-6 opacity-80 font-bold uppercase text-xs">
                    <span>Subtotal</span>
                    <span>R$ {{ subtotalCart.toFixed(2) }}</span>
                </div>
                <button @click="currentStep = 'checkout'" class="w-full bg-white text-indigo-600 py-5 rounded-[1.5rem] font-black uppercase text-sm">
                  IR PARA O PAGAMENTO
                </button>
            </div>
        </div>
    </div>

    <!-- STEP 4: CHECKOUT -->
    <div v-if="currentStep === 'checkout'" class="p-8 animate-in slide-in-from-right">
        <h2 class="text-4xl font-black mb-6 italic tracking-tighter text-indigo-600">Checkout.</h2>
        
        <div class="relative mb-6">
            <label class="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">Já é cliente?</label>
            <input v-model="customerSearchQuery" @focus="showCustomerSuggestions = true" placeholder="Buscar por nome ou e-mail..." class="w-full p-4 bg-indigo-50 rounded-2xl border-none outline-none font-bold text-xs">
            <div v-if="showCustomerSuggestions && filteredCustomers.length > 0" class="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                <div v-for="c in filteredCustomers" :key="c.codigo" @click="selectCustomer(c)" class="p-4 hover:bg-indigo-50 border-b border-slate-50 cursor-pointer">
                    <p class="font-black text-xs text-slate-800">{{ c.nome }}</p>
                    <p class="text-[10px] text-slate-400">{{ c.email }}</p>
                </div>
            </div>
        </div>

        <div class="space-y-4 mb-8">
            <input v-model="customer.email" @blur="checkExistingCustomer" type="email" placeholder="E-mail" class="w-full p-5 bg-white rounded-2xl shadow-sm outline-none font-bold text-sm">
            <input v-model="customer.nome" placeholder="Nome Completo" class="w-full p-5 bg-white rounded-2xl shadow-sm outline-none font-bold text-sm">
            <div class="grid grid-cols-2 gap-4">
              <input v-model="customer.cpf" placeholder="CPF" class="w-full p-5 bg-white rounded-2xl shadow-sm outline-none font-bold text-sm">
              <input v-model="customer.whatsapp" placeholder="WhatsApp" class="w-full p-5 bg-white rounded-2xl shadow-sm outline-none font-bold text-sm">
            </div>
            <input v-model="customer.endereco" @blur="calculateShipping" placeholder="Endereço de Entrega Completo" class="w-full p-5 bg-white rounded-2xl shadow-sm outline-none font-bold text-sm">
        </div>

        <div class="bg-white p-6 rounded-[2rem] border border-slate-100 mb-8 shadow-sm flex justify-between items-center">
            <div class="flex items-center gap-3">
                <Truck class="w-6 h-6 text-indigo-600" />
                <span class="text-xs font-bold text-slate-600">Frete SuperFrete</span>
            </div>
            <div v-if="calculatingShipping" class="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span v-else class="text-xl font-black text-indigo-600">R$ {{ shippingValue.toFixed(2) }}</span>
        </div>

        <div class="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl mb-12">
            <div class="flex justify-between items-center mb-6">
                <span class="font-bold opacity-70 uppercase text-xs">Total</span>
                <span class="text-3xl font-black italic">R$ {{ totalFinal.toFixed(2) }}</span>
            </div>
            
            <div v-if="pixData" class="bg-white p-6 rounded-3xl text-center mb-6 animate-in zoom-in">
                <img :src="`data:image/png;base64,${pixData.qrCode}`" class="w-48 mx-auto mb-4 rounded-xl shadow-md">
                <button @click="finishAndTrack" class="w-full bg-emerald-500 text-white py-4 rounded-xl font-black uppercase text-xs">CONFIRMAR PAGAMENTO</button>
            </div>

            <button v-else @click="handlePayment" :disabled="calculatingShipping || shippingValue === 0" class="w-full bg-white text-indigo-600 py-5 rounded-[1.5rem] font-black uppercase text-sm disabled:opacity-50">
                GERAR PIX
            </button>
        </div>
    </div>

    <!-- STEP 5: TRACKING (MAPBOX) -->
    <div v-if="currentStep === 'tracking'" class="p-8 animate-in slide-in-from-bottom-20">
        <div class="flex items-center gap-4 mb-8">
            <div class="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle2 class="w-8 h-8" />
            </div>
            <h2 class="font-black text-2xl text-slate-900">Pedido Confirmado!</h2>
        </div>

        <div class="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8 space-y-8 relative">
            <div class="absolute left-10 top-12 bottom-12 w-0.5 bg-slate-100"></div>
            <div class="relative flex items-center gap-6">
                <div class="z-10 w-5 h-5 rounded-full bg-emerald-500 border-4 border-white shadow-md"></div>
                <h4 class="font-black text-slate-900 uppercase text-[10px]">Pagamento Aprovado</h4>
            </div>
            <div class="relative flex items-center gap-6">
                <div class="z-10 w-5 h-5 rounded-full bg-indigo-600 border-4 border-white shadow-md animate-pulse"></div>
                <h4 class="font-black text-slate-900 uppercase text-[10px]">Preparando Envio</h4>
            </div>
        </div>

        <!-- MAPA -->
        <div class="bg-slate-900 h-80 rounded-[3rem] overflow-hidden relative shadow-xl border-4 border-white">
            <div id="map" class="w-full h-full"></div>
            <a :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.endereco)}`" target="_blank"
               class="absolute bottom-4 right-4 bg-white p-4 rounded-full shadow-lg text-indigo-600">
                <MapPin class="w-6 h-6" />
            </a>
        </div>
        
        <button @click="currentStep = 'home'" class="w-full mt-10 py-6 text-slate-400 font-black text-[10px] uppercase border-2 border-slate-200 rounded-[2rem]">Voltar para a vitrine</button>
    </div>

    <!-- BOTTOM NAV -->
    <nav v-if="currentStep === 'home'" class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100 p-6 flex justify-around items-center z-[90]">
        <Search class="w-6 h-6 text-indigo-600" />
        <Heart class="w-6 h-6 text-slate-300" />
        <div class="bg-indigo-600 w-14 h-14 rounded-2xl -mt-12 border-4 border-slate-50 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
            <Plus class="w-7 h-7" />
        </div>
        <Truck class="w-6 h-6 text-slate-300" @click="currentStep = 'cart-summary'" />
        <MapPin class="w-6 h-6 text-slate-300" />
    </nav>

  </div>
</template>

<style scoped>
.animate-in { animation-duration: 0.6s; animation-fill-mode: both; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideInFromBottom { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes slideInFromRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes zoomIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
.fade-in { animation-name: fadeIn; }
.slide-in-from-bottom-24 { animation-name: slideInFromBottom; }
.slide-in-from-right { animation-name: slideInFromRight; }
.zoom-in { animation-name: zoomIn; }
::-webkit-scrollbar { display: none; }
#map { border-radius: 3rem; }
</style>
