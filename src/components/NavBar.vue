<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Menu, ChevronDown, LogOut, Bell, ShoppingBag, X, User } from 'lucide-vue-next'

const props = defineProps({
  savedOrders: { type: Array, default: () => [] }
})

const emit = defineEmits(['toggleSidebar', 'restoreOrder'])

const router = useRouter()
const isProfileOpen = ref(false)
const isNotificationsOpen = ref(false)

// Configurações do Usuário
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const usuarioLogado = ref({
  login: 'Usuário',
  tipo: 'Nível',
  foto: null
})

onMounted(() => {
  const userData = localStorage.getItem('usuario')
  if (userData) {
    usuarioLogado.value = JSON.parse(userData)
  }
})

const handleRestore = (order) => {
  emit('restoreOrder', order)
  isNotificationsOpen.value = false
}

const handleLogout = () => {
  localStorage.removeItem('usuario') // Limpa os dados da sessão
  router.push('/') // Redireciona para o login
}
</script>

<template>
  <header class="h-16 px-4 md:px-8 bg-indigo-600 flex justify-between items-center text-white shadow-lg z-30 shrink-0 transition-all duration-300">
    <div class="flex items-center gap-2 md:gap-4">
      <button @click="emit('toggleSidebar')" class="p-2 hover:bg-white/10 rounded-lg transition-colors">
        <Menu class="w-6 h-6" />
      </button>
      <h1 class="text-sm md:text-lg font-bold tracking-tight truncate italic">
        PDV - Tudo Passa
      </h1>
    </div>

    <div class="flex items-center gap-2 md:gap-6">
      <!-- Pedidos Salvos -->
      <div class="relative">
        <button @click="isNotificationsOpen = !isNotificationsOpen" 
          class="p-2 hover:bg-white/10 rounded-full transition-all relative">
          <Bell class="w-5 h-5" :class="savedOrders.length > 0 ? 'animate-bounce' : 'opacity-80'" />
          <span v-if="savedOrders.length > 0" 
            class="absolute top-1 right-1 w-4 h-4 bg-red-500 text-[10px] flex items-center justify-center font-bold rounded-full border-2 border-indigo-600">
            {{ savedOrders.length }}
          </span>
        </button>

        <!-- Dropdown de Notificações (Pedidos Salvos) -->
        <div v-if="isNotificationsOpen" 
          class="absolute right-[-50px] md:right-0 mt-3 w-[280px] md:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 py-4 text-slate-800 animate-in fade-in slide-in-from-top-5 duration-200">
          <div class="px-4 pb-3 border-b border-slate-50 flex justify-between items-center">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pedidos Salvos</p>
            <button @click="isNotificationsOpen = false"><X class="w-4 h-4 text-slate-300" /></button>
          </div>
          <div class="max-h-64 overflow-y-auto">
            <div v-if="savedOrders.length === 0" class="p-8 text-center text-slate-400 italic text-sm">Nenhum pedido</div>
            <button v-for="order in savedOrders" :key="order.id" @click="handleRestore(order)"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 text-left">
              <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <ShoppingBag class="w-4 h-4" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-slate-700 truncate">{{ order.customer }}</p>
                <p class="text-[10px] font-black text-indigo-600">R$ {{ order.total.toFixed(2) }}</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Perfil do Usuário Dinâmico -->
      <div class="relative">
        <button @click="isProfileOpen = !isProfileOpen" 
          class="flex items-center gap-2 p-1 pr-3 hover:bg-white/10 rounded-full transition-all border border-transparent hover:border-white/20">
          
          <!-- Foto ou Inicial -->
          <div class="w-8 h-8 rounded-full bg-indigo-400 border-2 border-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
            <img v-if="usuarioLogado.foto" 
              :src="`${BASE_URL}/uploads/usuarios/${usuarioLogado.foto}`" 
              class="w-full h-full object-cover" 
            />
            <span v-else>{{ usuarioLogado.login.charAt(0).toUpperCase() }}</span>
          </div>

          <span class="text-sm font-bold hidden md:block max-w-[120px] truncate">
            {{ usuarioLogado.login }}
          </span>
          <ChevronDown class="w-4 h-4 opacity-70 transition-transform" :class="{'rotate-180': isProfileOpen}" />
        </button>

        <!-- Menu Dropdown do Perfil -->
        <div v-if="isProfileOpen" 
          class="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 text-slate-800 animate-in fade-in zoom-in duration-150">
          <div class="px-4 py-2 border-b border-slate-50 mb-1">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nível de Acesso</p>
            <p class="text-sm font-bold text-indigo-600 truncate">{{ usuarioLogado.tipo || 'Usuário' }}</p>
          </div>
          
          <button @click="handleLogout" 
            class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors text-left">
            <LogOut class="w-4 h-4" /> Logoff / Sair
          </button>
        </div>
      </div>
    </div>
  </header>
</template>