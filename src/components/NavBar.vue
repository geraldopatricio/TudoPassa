<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Menu, ChevronDown, LogOut, Bell, ShoppingBag, X } from 'lucide-vue-next'

const props = defineProps({
  savedOrders: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['toggleSidebar', 'restoreOrder', 'removeOrder'])

const router = useRouter()
const isProfileOpen = ref(false)
const isNotificationsOpen = ref(false)

const handleRestore = (order) => {
  emit('restoreOrder', order)
  isNotificationsOpen.value = false
}
</script>

<template>
  <header class="h-16 px-8 bg-indigo-600 flex justify-between items-center text-white shadow-lg z-30">
    <div class="flex items-center gap-4">
      <button @click="emit('toggleSidebar')" class="lg:hidden p-2 hover:bg-white/10 rounded-lg">
        <Menu class="w-6 h-6" />
      </button>
      <h1 class="text-lg font-bold tracking-tight">PDV - Tudo Passa</h1>
    </div>

    <div class="flex items-center gap-6">
      <!-- Ícone de Notificação / Pedidos Salvos -->
      <div class="relative">
        <button @click="isNotificationsOpen = !isNotificationsOpen" 
          class="p-2 hover:bg-white/10 rounded-full transition-all relative group">
          <Bell class="w-5 h-5" :class="savedOrders.length > 0 ? 'animate-bounce' : 'opacity-80'" />
          <span v-if="savedOrders.length > 0" 
            class="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-[10px] flex items-center justify-center font-bold rounded-full border-2 border-indigo-600">
            {{ savedOrders.length }}
          </span>
        </button>

        <!-- Dropdown de Pedidos Salvos -->
        <div v-if="isNotificationsOpen" 
          class="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 py-4 text-slate-800 animate-in fade-in slide-in-from-top-5 duration-200">
          <div class="px-4 pb-3 border-b border-slate-50 flex justify-between items-center">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pedidos em Aberto</p>
            <button @click="isNotificationsOpen = false"><X class="w-4 h-4 text-slate-300" /></button>
          </div>
          
          <div class="max-h-64 overflow-y-auto">
            <div v-if="savedOrders.length === 0" class="p-8 text-center text-slate-400 italic text-sm">
              Nenhum pedido salvo
            </div>
            
            <button v-for="order in savedOrders" :key="order.id"
              @click="handleRestore(order)"
              class="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 text-left">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <ShoppingBag class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-slate-700 truncate">{{ order.customer }}</p>
                <div class="flex justify-between items-center mt-0.5">
                  <p class="text-[10px] text-slate-400 font-medium">{{ order.items.length }} itens</p>
                  <p class="text-xs font-black text-indigo-600">R$ {{ order.total.toFixed(2) }}</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Perfil do Usuário -->
      <div class="relative">
        <button @click="isProfileOpen = !isProfileOpen" 
          class="flex items-center gap-2 p-1 pr-3 hover:bg-white/10 rounded-full transition-all border border-transparent hover:border-white/20">
          <div class="w-8 h-8 rounded-full bg-indigo-400 border-2 border-white flex items-center justify-center font-bold text-xs">GP</div>
          <span class="text-sm font-bold hidden md:block">Geraldo Patrício</span>
          <ChevronDown class="w-4 h-4 opacity-70 transition-transform" :class="{'rotate-180': isProfileOpen}" />
        </button>

        <div v-if="isProfileOpen" 
          class="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 text-slate-800 animate-in fade-in zoom-in duration-150">
          <div class="px-4 py-2 border-b border-slate-50 mb-1">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acesso</p>
            <p class="text-sm font-bold">Administrador</p>
          </div>
          <button @click="router.push('/')" 
            class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors text-left">
            <LogOut class="w-4 h-4" /> Logoff / Sair
          </button>
        </div>
      </div>
    </div>
  </header>
</template>