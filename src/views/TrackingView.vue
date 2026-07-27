<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Truck, Package, Phone, ChevronLeft, MapPin, Clock, Search, User, ShoppingBag } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

// Configurações
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const BASE_URL = import.meta.env.VITE_API_URL || '/api'
const pedidoId = route.params.id

const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

const entrega = ref(null)
const order = ref(null)
const profissional = ref(null)
const loading = ref(true)
const refreshing = ref(false)
const trackingError = ref('')
const initialLoad = ref(true)
const etaMinutes = ref(null)
const journeySteps = ['Pagamento aprovado', 'Preparando envio', 'Saiu para entrega', 'Pedido entregue']
const currentJourneyStepIndex = computed(() => {
  const status = entrega.value?.status?.toLowerCase() || ''
  if (status.includes('entregue')) return 3
  if (status.includes('rota')) return 2
  if (status.includes('aceito') || status.includes('coleta')) return 1
  return 0
})
let map = null
let driverMarker = null
let updateInterval = null
let animationFrame = null
let routeCoords = []
let routeDurationMs = 20 * 60 * 1000 // 20 minutos
let animationStartTime = null

const geocodeAddress = async (address) => {
  if (!MAPBOX_TOKEN || !address) return null
  try {
    const q = encodeURIComponent(address)
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${MAPBOX_TOKEN}&limit=1`)
    const data = await res.json()
    if (data?.features?.length) return data.features[0].center
  } catch (e) {
    console.error('Geocode failed', e)
  }
  return null
}

const fetchOrder = async () => {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/pedidos/${pedidoId}`)
    if (!res.ok) {
      throw new Error(`Pedido indisponível: ${res.status} ${res.statusText}`)
    }
    order.value = await res.json()
  } catch (e) {
    console.error('Erro ao buscar pedido:', e)
    trackingError.value = e.message || 'Erro ao buscar pedido.'
    order.value = null
  }
}

const fetchProfessional = async () => {
  const excursaoCodigo = order.value?.excursao_codigo || order.value?.transportadora_codigo
  const excursaoNome = order.value?.excursao || order.value?.transportadora
  if (!excursaoCodigo && !excursaoNome) return
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/profissionais`)
    if (!res.ok) {
      throw new Error(`Profissionais indisponíveis: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    profissional.value = data.find(p => p.tipo?.toLowerCase() === 'transportadora' && (
      String(p.codigo) === String(excursaoCodigo) ||
      p.nome?.trim().toLowerCase() === excursaoNome?.trim().toLowerCase()
    ))
    if (!profissional.value) {
      trackingError.value = trackingError.value || 'Transportadora não encontrada para este pedido.'
    }
  } catch (e) {
    console.error('Erro ao buscar profissional:', e)
    trackingError.value = trackingError.value || e.message || 'Erro ao buscar profissional.'
  }
}

const fetchTracking = async () => {
  if (initialLoad.value) {
    loading.value = true
  } else {
    refreshing.value = true
  }
  trackingError.value = ''
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/logistica/rastreio/${pedidoId}`)
    if (res.status === 404) {
      entrega.value = null
      return
    }
    if (!res.ok) {
      throw new Error('Rastreamento indisponível no servidor.')
    }
    entrega.value = await res.json()
  } catch (e) {
    console.error('Erro ao rastrear:', e)
    trackingError.value = e.message || 'Erro ao buscar rastreamento.'
    entrega.value = null
  } finally {
    initialLoad.value = false
    loading.value = false
    refreshing.value = false
  }
}

const buildFullAddress = (prof) => {
  if (!prof) return ''
  return [prof.endereco, prof.numero, prof.bairro, prof.cidade, prof.uf, prof.cep]
    .filter(Boolean)
    .join(', ')
}

const getDirectionsRoute = async (origin, destination) => {
  if (!MAPBOX_TOKEN || !origin || !destination) return null
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
    const res = await fetch(url)
    const json = await res.json()
    return json.routes?.[0] || null
  } catch (e) {
    console.error('Erro ao buscar rota:', e)
    return null
  }
}

const addRouteToMap = (routeGeo) => {
  if (!map || !routeGeo) return
  if (map.getLayer('route-line')) map.removeLayer('route-line')
  if (map.getSource('route-source')) map.removeSource('route-source')

  map.addSource('route-source', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: routeGeo.geometry
    }
  })

  map.addLayer({
    id: 'route-line',
    type: 'line',
    source: 'route-source',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#2563eb',
      'line-width': 5,
      'line-opacity': 0.85
    }
  })
}

const createDriverMarker = (origin) => {
  if (!map || !origin) return
  if (driverMarker) driverMarker.remove()

  const el = document.createElement('div')
  el.className = 'driver-marker'
  el.innerHTML = `<img src="/assets/img/motoboy.png" alt="Motoboy" style="width: 30px; height: 30px; object-fit: contain; display: block;" />`

  driverMarker = new mapboxgl.Marker({ element: el, anchor: 'center' })
    .setLngLat(origin)
    .addTo(map)
}

const calculateBearing = (from, to) => {
  const toRad = Math.PI / 180
  const toDeg = 180 / Math.PI
  const [lng1, lat1] = from
  const [lng2, lat2] = to
  const φ1 = lat1 * toRad
  const φ2 = lat2 * toRad
  const λ1 = lng1 * toRad
  const λ2 = lng2 * toRad
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1)
  return ((Math.atan2(y, x) * toDeg) + 360) % 360
}

const updateDriverPosition = (progress) => {
  if (!driverMarker || !routeCoords.length) return
  const index = Math.min(routeCoords.length - 1, Math.floor(progress * (routeCoords.length - 1)))
  const [lng, lat] = routeCoords[index]
  driverMarker.setLngLat([lng, lat])

  if (index > 0) {
    const bearing = calculateBearing(routeCoords[index - 1], [lng, lat])
    const el = driverMarker.getElement()
    if (el) el.style.transform = `translate(-50%, -50%) rotate(${bearing}deg)`
  }
}

const animateDriver = () => {
  if (!routeCoords.length) return
  animationStartTime = performance.now()

  const step = (timestamp) => {
    const elapsed = timestamp - animationStartTime
    const progress = Math.min(1, elapsed / routeDurationMs)
    updateDriverPosition(progress)
    if (progress < 1) {
      animationFrame = requestAnimationFrame(step)
    }
  }

  animationFrame = requestAnimationFrame(step)
}

const initMap = async () => {
  if (!window.mapboxgl) {
    trackingError.value = 'Mapbox não encontrado. Verifique se a biblioteca está carregada.'
    return false
  }
  if (!MAPBOX_TOKEN) {
    trackingError.value = 'Token Mapbox não configurado. Atualize o .env com VITE_MAPBOX_TOKEN.'
    return false
  }

  mapboxgl.accessToken = MAPBOX_TOKEN
  map = new mapboxgl.Map({
    container: 'map-cliente',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [-38.5267, -3.7319],
    zoom: 12,
    pitch: 45
  })
  await new Promise((resolve, reject) => {
    map.once('load', () => {
      map.resize()
      resolve()
    })
    map.once('error', reject)
  })
  return true
}

onMounted(async () => {
  try {
    await fetchOrder()
    await fetchProfessional()
    await fetchTracking()

    if (!entrega.value) {
      trackingError.value = trackingError.value || 'Aguardando disponibilização do rastreamento.'
    }

    if (!order.value) {
      trackingError.value = 'Pedido não encontrado.'
    }

    if (order.value && !profissional.value) {
      trackingError.value = trackingError.value || 'Transportadora não encontrada para este pedido.'
    }

    if (order.value && entrega.value && profissional.value) {
      // O mapa só existe no DOM depois que o carregamento termina.
      loading.value = false
      initialLoad.value = false
      await nextTick()
      const mapReady = await initMap()
      if (!mapReady) return

      const originAddress = buildFullAddress(profissional.value)
      const origin = originAddress ? await geocodeAddress(originAddress) : null
      const destination = await geocodeAddress(order.value.endereco)

      if (!origin) {
        trackingError.value = trackingError.value || 'Não foi possível geocodificar o endereço da transportadora.'
      } else if (!destination) {
        trackingError.value = trackingError.value || 'Não foi possível geocodificar o endereço do cliente.'
      } else {
        const route = await getDirectionsRoute(origin, destination)
        if (route) {
          routeCoords = route.geometry.coordinates
          etaMinutes.value = Math.max(1, Math.ceil(route.duration / 60))
          routeDurationMs = route.duration * 1000
          addRouteToMap(route)
          createDriverMarker(origin)
          animateDriver()
          const bounds = route.geometry.coordinates.reduce((b, coord) => b.extend(coord), new mapboxgl.LngLatBounds(origin, origin))
          map.fitBounds(bounds, { padding: 60 })
        } else {
          trackingError.value = trackingError.value || 'Não foi possível traçar a rota do motoboy.'
        }
      }
    } else if (order.value && entrega.value && !profissional.value) {
      trackingError.value = trackingError.value || 'Transportadora selecionada não pôde ser localizada.'
    }

    updateInterval = setInterval(fetchTracking, 7000)
  } catch (error) {
    console.error('Erro no carregamento inicial do tracking:', error)
    trackingError.value = trackingError.value || 'Erro ao inicializar o rastreamento.'
  } finally {
    loading.value = false
    initialLoad.value = false
    refreshing.value = false
  }
})

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  clearInterval(updateInterval)
})
</script>

<template>
    <div class="max-w-md mx-auto bg-slate-50 min-h-screen font-sans pb-28">
        <!-- Header -->
        <header class="p-6 flex items-center gap-4 bg-white border-b border-slate-100">
            <button @click="router.back()" class="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <ChevronLeft class="w-6 h-6 text-slate-400" />
            </button>
            <h1 class="font-black text-lg text-slate-800 uppercase italic">Rastreio do Pedido</h1>
        </header>

        <main v-if="!loading && entrega" class="flex flex-col">
            <!-- Área do Mapa -->
            <div class="order-2 h-[45vh] relative w-full">
                <div id="map-cliente" class="w-full h-full"></div>
                
                <!-- Card de Tempo Estimado (Flutuante) -->
                <div v-if="etaMinutes" class="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur p-4 rounded-3xl shadow-2xl border border-white flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center">
                            <Clock class="w-5 h-5" />
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase">Chega em</p>
                            <p class="font-black text-slate-800">{{ etaMinutes }} min</p>
                        </div>
                    </div>
                    <MapPin class="w-5 h-5 text-indigo-600 animate-bounce" />
                </div>
            </div>

            <!-- Detalhes e Status -->
            <div class="order-1 p-8 bg-white relative z-20 shadow-sm">
                <div class="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8"></div>

                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600">
                            <Truck v-if="entrega.status === 'Em Rota'" class="w-7 h-7 animate-pulse" />
                            <Package v-else class="w-7 h-7" />
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Atual</p>
                            <h3 class="font-black text-xl text-indigo-600 uppercase italic">{{ entrega.status }}</h3>
                        </div>
                    </div>
                    <div class="text-right">
                         <p class="text-[10px] font-black text-slate-400 uppercase">Pedido</p>
                         <p class="font-black text-slate-800">#{{ String(entrega.numero_pedido).padStart(4, '0') }}</p>
                    </div>
                </div>

                <!-- Jornada da entrega: etapas futuras ficam visivelmente opacas. -->
                <div class="flex justify-between items-start mb-10 px-1">
                    <div v-for="(step, idx) in journeySteps" :key="step" class="flex flex-col items-center flex-1 min-w-0">
                        <div class="flex items-center w-full">
                            <div :class="[
                                'w-4 h-4 shrink-0 rounded-full border-4 border-white shadow-sm transition-all duration-500',
                                idx <= currentJourneyStepIndex ? 'bg-indigo-600 scale-125' : 'bg-slate-200 opacity-40'
                            ]"></div>
                            <div v-if="idx < journeySteps.length - 1" :class="[
                                'h-1 flex-1 transition-all duration-500',
                                idx < currentJourneyStepIndex ? 'bg-indigo-600' : 'bg-slate-100'
                            ]"></div>
                        </div>
                        <p :class="[
                            'mt-3 pr-2 text-center text-[8px] leading-tight font-black uppercase transition-opacity',
                            idx <= currentJourneyStepIndex ? 'text-indigo-600 opacity-100' : 'text-slate-400 opacity-35'
                        ]">{{ step }}</p>
                    </div>
                </div>

                <!-- Info do Profissional -->
                <div v-if="profissional" class="p-6 bg-slate-50 rounded-3xl border border-slate-100 mb-6 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-indigo-600 shadow-sm">
                            {{ profissional.nome?.charAt(0) || 'T' }}
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase">Transportadora</p>
                            <p class="font-bold text-slate-800">{{ profissional.nome }}</p>
                            <p class="text-[10px] text-slate-400">{{ profissional.endereco }}, {{ profissional.numero }}</p>
                        </div>
                    </div>
                    <button class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm border border-slate-100">
                        <Phone class="w-5 h-5" />
                    </button>
                </div>

                <p class="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">Obrigado por comprar na Tudo Passa Store</p>
            </div>
        </main>

        <div v-else-if="trackingError" class="flex flex-col items-center justify-center py-40 gap-4 text-center px-6">
            <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <Truck class="w-8 h-8" />
            </div>
            <p class="text-sm font-black text-slate-700 uppercase tracking-widest">Erro no rastreamento</p>
            <p class="text-[10px] text-slate-400">{{ trackingError }}</p>
            <button @click="fetchTracking" class="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px]">Recarregar rastreamento</button>
        </div>

        <div v-else-if="!loading" class="flex flex-col items-center justify-center py-40 gap-4 text-center px-6">
            <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <Truck class="w-8 h-8" />
            </div>
            <p class="text-sm font-black text-slate-700 uppercase tracking-widest">Pedido ainda não está disponível para rastreamento</p>
            <p class="text-[10px] text-slate-400">O pedido pode estar aguardando pagamento ou confirmação no sistema. Tente novamente em alguns instantes.</p>
            <button @click="fetchTracking" class="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px]">Recarregar rastreamento</button>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-40 gap-4">
            <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando satélite...</p>
        </div>

        <nav class="fixed inset-x-0 bottom-0 z-[90] border-t border-slate-100 bg-white/95 backdrop-blur-2xl shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
            <div class="max-w-md mx-auto px-6 py-3 flex items-center justify-between">
                <button @click="router.push('/ecommerce')" class="flex flex-col items-center gap-1 text-slate-400">
                    <Search class="w-5 h-5" />
                    <span class="text-[9px] font-black uppercase">Consultar</span>
                </button>
                <button @click="router.push('/')" class="flex flex-col items-center gap-1 text-slate-400">
                    <User class="w-5 h-5" />
                    <span class="text-[9px] font-black uppercase">Logar</span>
                </button>
                <button @click="router.push('/ecommerce')" class="flex flex-col items-center gap-1 text-slate-400">
                    <ShoppingBag class="w-5 h-5" />
                    <span class="text-[9px] font-black uppercase">Pedidos</span>
                </button>
                <button class="flex flex-col items-center gap-1 text-indigo-600" aria-current="page">
                    <MapPin class="w-5 h-5" />
                    <span class="text-[9px] font-black uppercase">Rastreio</span>
                </button>
            </div>
        </nav>
    </div>
</template>

<style scoped>
.driver-marker { cursor: pointer; z-index: 100; }
</style>
