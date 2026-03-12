<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { 
  Search, ShoppingBag, Heart, ChevronLeft, Star, 
  MapPin, QrCode, Truck, CheckCircle2, X, Plus, Minus,
  Copy, ChevronRight, Navigation, Trash2, ArrowLeft, PackageCheck, Info, Layers, Eye
} from 'lucide-vue-next'

// --- CONFIGURAÇÃO ---
const API_URL = import.meta.env.VITE_API_URL
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

// --- ESTADOS ---
const products = ref([])
const cart = ref(JSON.parse(localStorage.getItem('gp_cart') || '[]'))
const currentStep = ref('home') 
const loading = ref(true)

const selectedProduct = ref(null)
const isZoomed = ref(false)
const selectedSize = ref(null)
const selectedQty = ref(1)
const isGridMode = ref(false) // MODO GRADE

const currentPage = ref(1)
const itemsPerPage = ref(4)
const searchQuery = ref('')

const customer = ref({ nome: '', cpf: '', email: '', whatsapp: '', endereco: '' })
const shippingValue = ref(0)
const calculatingShipping = ref(false)
const pixData = ref(null)

// --- MÉTODOS ---
const fetchProducts = async () => {
  try {
    loading.value = true
    const res = await fetch(`${API_URL}/produtos`)
    const data = await res.json()
    products.value = Array.isArray(data) ? data : []
  } catch (e) { console.error("Erro fetch:", e) } 
  finally { setTimeout(() => loading.value = false, 800) }
}

const filteredBase = computed(() => {
  if (!searchQuery.value) return products.value
  return products.value.filter(p => p.descricao?.toLowerCase().includes(searchQuery.value.toLowerCase()))
})
const totalPages = computed(() => Math.ceil(filteredBase.value.length / itemsPerPage.value) || 1)
const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredBase.value.slice(start, start + itemsPerPage.value)
})

const subtotalCart = computed(() => cart.value.reduce((acc, item) => acc + item.totalPrice, 0))
const totalFinal = computed(() => subtotalCart.value + shippingValue.value)

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
  selectedProduct.value = p
  selectedSize.value = null
  selectedQty.value = 1
  isGridMode.value = false
  currentStep.value = 'details'
  window.scrollTo(0, 0)
}

const handleAddToCart = () => {
  if (!selectedSize.value) { alert("Por favor, selecione um tamanho!"); return; }

  const item = {
    cartId: Date.now() + Math.random(),
    referencia: selectedProduct.value.referencia,
    descricao: selectedProduct.value.descricao,
    imagem: selectedProduct.value.imagem,
    chosenSize: selectedSize.value,
    chosenQty: selectedQty.value,
    unitPrice: selectedProduct.value.variantes[0].valor_unitario,
    totalPrice: selectedProduct.value.variantes[0].valor_unitario * selectedQty.value
  }

  cart.value.push(item)
  localStorage.setItem('gp_cart', JSON.stringify(cart.value))

  if (isGridMode.value) {
    selectedSize.value = null
    selectedQty.value = 1
    // Pequeno feedback visual pode ser adicionado aqui
  } else {
    currentStep.value = 'cart-summary'
  }
}

const removeFromCart = (cartId) => {
  cart.value = cart.value.filter(i => i.cartId !== cartId)
  localStorage.setItem('gp_cart', JSON.stringify(cart.value))
}

const handlePayment = async () => {
  if (!customer.value.nome || !customer.value.email || shippingValue.value === 0) {
    alert("Preencha todos os campos e aguarde o cálculo do frete!")
    return
  }

  try {
    const res = await fetch(`${API_URL}/produtos/checkout/pix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: customer.value.nome,
        email: customer.value.email,
        cpf: customer.value.cpf,
        valor: totalFinal.value
      })
    })
    const data = await res.json()
    if (data.success) {
      pixData.value = data
      // Dispara e-mail de notificação
      fetch(`${API_URL}/produtos/notificar-pedido`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: customer.value,
          itens: cart.value,
          total: totalFinal.value,
          frete: shippingValue.value
        })
      })
    }
  } catch (e) { alert("Erro de conexão.") }
}

const initMap = () => {
  if (!window.mapboxgl) return
  mapboxgl.accessToken = MAPBOX_TOKEN
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-38.5267, -3.7319],
    zoom: 14
  })
  new mapboxgl.Marker({ color: '#4f46e5' }).setLngLat([-38.5267, -3.7319]).addTo(map)
}

const finishAndTrack = () => {
  currentStep.value = 'tracking'
  const finalCart = [...cart.value]
  cart.value = []
  localStorage.removeItem('gp_cart')
  nextTick(() => initMap())
}

onMounted(fetchProducts)
</script>

<template>
  <div class="max-w-md mx-auto bg-slate-50 min-h-screen pb-24 font-sans text-slate-900 overflow-x-hidden relative">
    
    <!-- MODAL ZOOM -->
    <div v-if="isZoomed" class="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4" @click="isZoomed = false">
      <img :src="`${API_URL}/uploads/${selectedProduct.imagem}`" class="w-full max-h-screen object-contain animate-in zoom-in">
      <button class="absolute top-10 right-10 text-white bg-white/10 p-4 rounded-full"><X/></button>
    </div>

    <!-- HEADER -->
    <header class="sticky top-0 z-50 bg-white/90 backdrop-blur-lg p-4 flex justify-between items-center border-b border-slate-100 shadow-sm">
      <div class="flex items-center gap-2">
        <button v-if="currentStep !== 'home'" @click="currentStep = 'home'" class="p-2 hover:bg-slate-100 rounded-full">
          <ChevronLeft class="w-6 h-6" />
        </button>
        <h1 class="font-black text-2xl tracking-tighter italic text-indigo-600">Tudo Passa Store</h1>
      </div>
      <div class="relative cursor-pointer" @click="currentStep = 'cart-summary'">
        <ShoppingBag class="w-6 h-6 text-slate-700" />
        <span v-if="cart.length > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white">
          {{ cart.length }}
        </span>
      </div>
    </header>

    <!-- STEP 1: HOME -->
    <main v-if="currentStep === 'home'" class="p-4 animate-in fade-in">
      <div class="flex items-center gap-3 mb-6">
        <div class="relative flex-1">
          <input type="text" v-model="searchQuery" placeholder="Buscar produto..." class="w-full bg-white border-none shadow-sm rounded-2xl py-4 px-12 outline-none">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        </div>
        <select v-model="itemsPerPage" class="bg-white border-none shadow-sm rounded-2xl p-4 text-xs font-bold text-indigo-600">
          <option :value="2">2 Itens</option>
          <option :value="4">4 Itens</option>
        </select>
      </div>

      <div v-if="loading" class="flex flex-col items-center py-20 gap-4">
        <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-400 font-bold text-[10px] tracking-widest uppercase">Atualizando Estoque...</p>
      </div>

      <div v-else>
        <div class="grid grid-cols-2 gap-4">
          <div v-for="p in paginatedProducts" :key="p.referencia" @click="openDetails(p)" 
               class="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 relative group active:scale-95 transition-all">
            <img :src="`${API_URL}/uploads/${p.imagem}`" class="w-full h-48 object-cover group-hover:scale-105 transition-transform">
            <div class="p-4">
              <span class="text-[8px] font-black text-indigo-500 uppercase tracking-widest block mb-1">{{ p.categoria }}</span>
              <h3 class="font-bold text-xs text-slate-800 line-clamp-2 h-8 leading-tight mb-2">{{ p.descricao }}</h3>
              <p class="text-lg font-black text-slate-900">R$ {{ p.variantes?.[0]?.valor_unitario?.toFixed(2) }}</p>
            </div>
          </div>
        </div>

        <div class="flex justify-center items-center gap-6 mt-10">
          <button @click="currentPage--" :disabled="currentPage === 1" class="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm disabled:opacity-20"><ChevronLeft/></button>
          <span class="text-sm font-black text-indigo-600">{{ currentPage }} / {{ totalPages }}</span>
          <button @click="currentPage++" :disabled="currentPage >= totalPages" class="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm disabled:opacity-20"><ChevronRight/></button>
        </div>
      </div>
    </main>

    <!-- STEP 2: DETALHES -->
    <div v-if="currentStep === 'details' && selectedProduct" class="animate-in slide-in-from-bottom-20">
      <div class="relative h-[55vh]">
        <img :src="`${API_URL}/uploads/${selectedProduct.imagem}`" @click="isZoomed = true" class="w-full h-full object-cover">
        <div class="absolute top-4 left-4 flex gap-2">
            <button @click="currentStep = 'home'" class="p-3 bg-white/80 backdrop-blur rounded-full shadow-lg"><ArrowLeft/></button>
        </div>
        <button @click="isZoomed = true" class="absolute bottom-20 right-6 bg-white/90 backdrop-blur p-4 rounded-full shadow-xl"><Eye class="w-5 h-5"/></button>
      </div>

      <div class="p-8 bg-white rounded-t-[3.5rem] -mt-16 relative z-10 shadow-2xl">
        <div class="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
        <h2 class="text-2xl font-black text-slate-900 mb-2 leading-tight">{{ selectedProduct.descricao }}</h2>
        <p class="text-3xl font-black text-indigo-600 italic mb-8">R$ {{ selectedProduct.variantes?.[0]?.valor_unitario?.toFixed(2) }}</p>

        <!-- TOGGLE MODO GRADE -->
        <div class="flex items-center justify-between bg-indigo-50 p-5 rounded-3xl mb-8 border border-indigo-100">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <Layers class="w-6 h-6" />
                </div>
                <div>
                    <h4 class="font-black text-xs text-indigo-900 uppercase tracking-tight">Comprar em Grade</h4>
                    <p class="text-[9px] text-indigo-500 font-bold uppercase">Múltiplos tamanhos</p>
                </div>
            </div>
            <button @click="isGridMode = !isGridMode" 
                    :class="isGridMode ? 'bg-indigo-600' : 'bg-slate-300'"
                    class="w-14 h-7 rounded-full relative transition-all duration-500">
                <div :class="isGridMode ? 'translate-x-7' : 'translate-x-1'" 
                     class="absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-md"></div>
            </button>
        </div>

        <h4 class="font-black text-[10px] uppercase tracking-widest mb-4">1. Selecione o Tamanho</h4>
        <div class="flex flex-wrap gap-3 mb-8">
            <button v-for="(qtd, tam) in selectedProduct.variantes?.[0]?.grade" :key="tam"
                    @click="qtd > 0 ? selectedSize = tam : null"
                    :class="[
                      selectedSize === tam ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-xl scale-110' : 'bg-slate-50',
                      qtd === 0 ? 'opacity-10 cursor-not-allowed' : 'border-2 border-transparent hover:border-indigo-200'
                    ]"
                    class="w-14 h-14 rounded-2xl flex items-center justify-center font-black transition-all">
                {{ tam }}
            </button>
        </div>

        <h4 class="font-black text-[10px] uppercase tracking-widest mb-4">2. Quantidade</h4>
        <div class="flex items-center gap-6 mb-10 bg-slate-50 w-max p-2 rounded-2xl border border-slate-100">
            <button @click="selectedQty = Math.max(1, selectedQty - 1)" class="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm"><Minus class="w-4 h-4"/></button>
            <span class="font-black text-xl w-8 text-center">{{ selectedQty }}</span>
            <button @click="selectedQty++" class="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm"><Plus class="w-4 h-4"/></button>
        </div>

        <button @click="handleAddToCart" class="w-full bg-slate-900 py-6 rounded-[2rem] text-white font-black text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
          <ShoppingBag class="w-6 h-6" /> {{ isGridMode ? 'ADICIONAR À GRADE' : 'ADICIONAR À CESTA' }}
        </button>
      </div>
    </div>

    <!-- STEP 3: CESTA -->
    <div v-if="currentStep === 'cart-summary'" class="p-6 animate-in fade-in">
        <div class="flex justify-between items-end mb-8">
            <h2 class="text-3xl font-black italic tracking-tighter">Sua Cesta</h2>
            <button @click="currentStep = 'home'" class="text-indigo-600 font-bold text-xs uppercase underline tracking-widest">Continuar Comprando</button>
        </div>

        <div v-if="cart.length === 0" class="text-center py-20 text-slate-300 font-bold">Cesta vazia</div>
        <div v-else class="space-y-4 mb-8">
            <div v-for="item in cart" :key="item.cartId" class="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex gap-4 items-center">
                <img :src="`${API_URL}/uploads/${item.imagem}`" class="w-20 h-20 rounded-2xl object-cover">
                <div class="flex-1">
                    <h4 class="font-bold text-xs text-slate-800 line-clamp-1">{{ item.descricao }}</h4>
                    <p class="text-[10px] font-black text-indigo-600 uppercase mt-1">TAM: {{ item.chosenSize }} | QTD: {{ item.chosenQty }}</p>
                    <p class="text-lg font-black mt-1">R$ {{ item.totalPrice.toFixed(2) }}</p>
                </div>
                <button @click="removeFromCart(item.cartId)" class="p-3 bg-red-50 text-red-500 rounded-2xl"><Trash2 class="w-5 h-5"/></button>
            </div>
            
            <div class="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl mt-10">
                <div class="flex justify-between items-center mb-4 opacity-80 font-bold text-sm">
                    <span>Subtotal</span><span>R$ {{ subtotalCart.toFixed(2) }}</span>
                </div>
                <button @click="currentStep = 'checkout'" class="w-full bg-white text-indigo-600 py-5 rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg">IR PARA PAGAMENTO</button>
            </div>
        </div>
    </div>

    <!-- STEP 4: CHECKOUT -->
    <div v-if="currentStep === 'checkout'" class="p-6 animate-in slide-in-from-right">
        <h2 class="text-3xl font-black mb-6 italic tracking-tighter text-indigo-600">Checkout</h2>
        
        <div class="space-y-4 mb-8">
            <input v-model="customer.nome" placeholder="Nome Completo" class="w-full p-5 bg-white rounded-2xl border-none shadow-sm outline-none">
            <input v-model="customer.email" placeholder="E-mail (Para receber confirmação)" class="w-full p-5 bg-white rounded-2xl border-none shadow-sm outline-none">
            <input v-model="customer.cpf" placeholder="CPF" class="w-full p-5 bg-white rounded-2xl border-none shadow-sm outline-none">
            <input v-model="customer.endereco" @blur="calculateShipping" placeholder="Endereço Completo de Entrega" class="w-full p-5 bg-white rounded-2xl border-none shadow-sm outline-none">
        </div>

        <div class="bg-white p-6 rounded-[2.5rem] border border-slate-100 mb-8">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                    <Truck class="w-4 h-4 text-indigo-600" />
                    <span class="text-xs font-black uppercase tracking-widest text-slate-400">Entrega</span>
                </div>
                <div v-if="calculatingShipping" class="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span v-else class="font-black text-indigo-600">R$ {{ shippingValue.toFixed(2) }}</span>
            </div>
        </div>

        <div class="bg-indigo-600 p-8 rounded-[3rem] text-white mb-8 shadow-xl">
            <div class="flex justify-between items-center mb-6">
                <span class="font-bold opacity-70 uppercase text-xs">Total Final:</span>
                <span class="text-3xl font-black italic tracking-tighter">R$ {{ totalFinal.toFixed(2) }}</span>
            </div>
            
            <div v-if="pixData" class="bg-white p-6 rounded-3xl text-center mb-6 animate-in zoom-in">
                <img :src="`data:image/png;base64,${pixData.qrCode}`" class="w-44 mx-auto mb-4">
                <button @click="finishAndTrack" class="w-full bg-emerald-500 text-white py-4 rounded-xl font-black uppercase text-xs">JÁ PAGUEI / RASTREAR</button>
            </div>

            <button v-else @click="handlePayment" :disabled="calculatingShipping || shippingValue === 0" class="w-full bg-white text-indigo-600 py-5 rounded-2xl font-black uppercase tracking-widest text-sm disabled:opacity-50">
                GERAR PIX AGORA
            </button>
        </div>
    </div>

    <!-- STEP 5: TRACKING -->
    <div v-if="currentStep === 'tracking'" class="p-6 animate-in slide-in-from-bottom-20 duration-500">
        <div class="flex items-center gap-5 mb-10">
            <div class="w-16 h-16 bg-emerald-500 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-200">
                <CheckCircle2 class="w-8 h-8" />
            </div>
            <div>
                <h2 class="font-black text-2xl tracking-tighter">Pedido Realizado!</h2>
                <p class="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Enviamos os detalhes por e-mail</p>
            </div>
        </div>

        <!-- WIZARD -->
        <div class="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8 relative">
            <div class="absolute left-10 top-12 bottom-12 w-0.5 bg-slate-100"></div>
            <div class="space-y-12">
                <div class="relative flex items-center gap-6">
                    <div class="z-10 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white shadow-md"></div>
                    <h4 class="font-black text-slate-900 leading-none">Pagamento Aprovado</h4>
                </div>
                <div class="relative flex items-center gap-6">
                    <div class="z-10 w-6 h-6 rounded-full bg-indigo-600 border-4 border-white shadow-md animate-pulse"></div>
                    <h4 class="font-black text-slate-900 leading-none">Preparando para Envio</h4>
                </div>
                <div class="relative flex items-center gap-6 opacity-20">
                    <div class="z-10 w-6 h-6 rounded-full bg-slate-300 border-4 border-white shadow-md"></div>
                    <h4 class="font-black text-slate-900 leading-none">Em Rota de Entrega</h4>
                </div>
            </div>
        </div>

        <!-- MAPA -->
        <div class="bg-slate-900 h-80 rounded-[3rem] overflow-hidden relative shadow-2xl border-8 border-white">
            <div id="map" class="w-full h-full bg-slate-200 flex flex-col items-center justify-center">
                <Navigation class="w-8 h-8 text-indigo-600 animate-bounce mb-2" />
                <p class="text-slate-400 font-black text-[9px] uppercase">Carregando mapa de rastreio...</p>
            </div>
            <a :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.endereco)}`" target="_blank"
               class="absolute bottom-6 right-6 bg-white p-5 rounded-full shadow-2xl text-indigo-600">
                <MapPin class="w-6 h-6" />
            </a>
        </div>
        
        <button @click="currentStep = 'home'" class="w-full mt-10 py-6 text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] border-2 border-slate-200 rounded-[2rem]">Voltar para a loja</button>
    </div>

    <!-- BOTTOM NAV -->
    <nav v-if="currentStep === 'home'" class="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-5 flex justify-around items-center z-[90]">
        <Search class="w-7 h-7 text-indigo-600" />
        <Heart class="w-7 h-7 text-slate-300" />
        <div class="bg-indigo-600 w-16 h-16 rounded-full -mt-14 border-[6px] border-slate-50 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
            <Plus class="w-8 h-8" />
        </div>
        <Truck class="w-7 h-7 text-slate-300" />
        <MapPin class="w-7 h-7 text-slate-300" />
    </nav>

  </div>
</template>

<style scoped>
.animate-in { animation-duration: 0.4s; animation-fill-mode: both; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideInFromBottom { from { transform: translateY(40%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes zoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
.fade-in { animation-name: fadeIn; }
.slide-in-from-bottom-20 { animation-name: slideInFromBottom; }
.zoom-in { animation-name: zoomIn; }
</style>
