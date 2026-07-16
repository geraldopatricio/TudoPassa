<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Truck, Package, Phone, ChevronLeft, MapPin, Clock } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

// Configurações
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const pedidoId = route.params.id

const entrega = ref(null)
const loading = ref(true)
let map = null
let driverMarker = null
let updateInterval = null

const fetchTracking = async () => {
    try {
        const res = await fetch(`${BASE_URL}/logistica/rastreio/${pedidoId}`)
        const data = await res.json()
        entrega.value = data

        if (data.posicao_atual?.lat && map) {
            updateDriverMarker(data.posicao_atual.lng, data.posicao_atual.lat)
        }
    } catch (e) {
        console.error("Erro ao rastrear:", e)
    } finally {
        loading.value = false
    }
}

const initMap = () => {
    if (!window.mapboxgl) return
    mapboxgl.accessToken = MAPBOX_TOKEN
    
    map = new mapboxgl.Map({
        container: 'map-cliente',
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-38.5267, -3.7319], // Default center
        zoom: 15,
        pitch: 45
    })

    // Marcador da Casa do Cliente (Fixo)
    // No mundo real, usaríamos as coordenadas geocodificadas do endereço do cliente
    new mapboxgl.Marker({ color: '#4f46e5' })
        .setLngLat([-38.5267, -3.7319]) 
        .addTo(map)
}

const updateDriverMarker = (lng, lat) => {
    if (!driverMarker) {
        const el = document.createElement('div')
        el.className = 'driver-marker'
        el.innerHTML = `<div class="bg-indigo-600 p-2 rounded-full shadow-xl border-2 border-white text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 17h4V5H10v12zM3 17h4V10H3v7zm14-7v7h4V10h-4z"/></svg>
        </div>`
        
        driverMarker = new mapboxgl.Marker(el)
            .setLngLat([lng, lat])
            .addTo(map)
    } else {
        driverMarker.setLngLat([lng, lat])
    }
    map.flyTo({ center: [lng, lat], speed: 0.5 })
}

onMounted(() => {
    initMap()
    fetchTracking()
    // Atualiza a posição a cada 7 segundos
    updateInterval = setInterval(fetchTracking, 7000)
})

onUnmounted(() => clearInterval(updateInterval))
</script>

<template>
    <div class="max-w-md mx-auto bg-slate-50 min-h-screen font-sans pb-10">
        <!-- Header -->
        <header class="p-6 flex items-center gap-4 bg-white border-b border-slate-100">
            <button @click="router.back()" class="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <ChevronLeft class="w-6 h-6 text-slate-400" />
            </button>
            <h1 class="font-black text-lg text-slate-800 uppercase italic">Rastreio do Pedido</h1>
        </header>

        <main v-if="!loading && entrega">
            <!-- Área do Mapa -->
            <div class="h-[45vh] relative w-full">
                <div id="map-cliente" class="w-full h-full"></div>
                
                <!-- Card de Tempo Estimado (Flutuante) -->
                <div v-if="entrega.status === 'Em Rota'" class="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur p-4 rounded-3xl shadow-2xl border border-white flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center">
                            <Clock class="w-5 h-5" />
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase">Chega em</p>
                            <p class="font-black text-slate-800">12 - 18 min</p>
                        </div>
                    </div>
                    <MapPin class="w-5 h-5 text-indigo-600 animate-bounce" />
                </div>
            </div>

            <!-- Detalhes e Status -->
            <div class="p-8 bg-white rounded-t-[3.5rem] -mt-12 relative z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
                <div class="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8"></div>

                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center text-indigo-600">
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

                <!-- Stepper de Status -->
                <div class="flex justify-between items-center mb-10 px-4">
                    <div v-for="(step, idx) in 4" :key="idx" class="flex items-center flex-1 last:flex-none">
                        <div :class="[
                            'w-4 h-4 rounded-full border-4 border-white shadow-sm transition-all duration-500',
                            idx <= entrega.logs.length - 1 ? 'bg-indigo-600 scale-125' : 'bg-slate-200'
                        ]"></div>
                        <div v-if="idx < 3" :class="[
                            'h-1 flex-1 transition-all duration-500',
                            idx < entrega.logs.length - 1 ? 'bg-indigo-600' : 'bg-slate-100'
                        ]"></div>
                    </div>
                </div>

                <!-- Info do Profissional -->
                <div v-if="entrega.profissional_id" class="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 mb-6 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-indigo-600 shadow-sm">
                            {{ entrega.profissional_id.charAt(0) }}
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase">Entregador Responsável</p>
                            <p class="font-bold text-slate-800">Cód: {{ entrega.profissional_id }}</p>
                        </div>
                    </div>
                    <button class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm border border-slate-100">
                        <Phone class="w-5 h-5" />
                    </button>
                </div>

                <p class="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">Obrigado por comprar na Tudo Passa Store</p>
            </div>
        </main>

        <!-- Loading State -->
        <div v-else class="flex flex-col items-center justify-center py-40 gap-4">
            <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando satélite...</p>
        </div>
    </div>
</template>

<style scoped>
.driver-marker { cursor: pointer; z-index: 100; }
</style>