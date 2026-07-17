<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { 
  LayoutDashboard, ShoppingCart, Package, Users, 
  Store, X, User, ChevronDown, ShieldCheck, Tag,
  ClipboardList, DollarSign, Truck 
} from 'lucide-vue-next'

// CORREÇÃO: Apenas um defineProps centralizado
const props = defineProps({
  isOpen: Boolean,
  isCollapsed: Boolean
})

const emit = defineEmits(['close'])
const route = useRoute()

// Estados para controlar quais submenus estão abertos
const openMenus = ref({
  pedidos: false,
  estoque: false,
  financeiro: false,
  logistica: false,
  pessoas: false,
  admin: false
})

// Função para alternar menus
const toggleMenu = (menu) => {
  // Se o menu estiver recolhido, não faz sentido abrir submenu (opcional)
  if (props.isCollapsed) return 
  openMenus.value[menu] = !openMenus.value[menu]
}

// Lógica para manter o menu aberto conforme a rota
onMounted(() => {
  if (['/pedidos'].includes(route.path)) openMenus.value.pedidos = true
  if (['/produtos', '/tabela-precos'].includes(route.path)) openMenus.value.estoque = true
  if (['/financeiro'].includes(route.path)) openMenus.value.financeiro = true
  if (['/logistica-fretes'].includes(route.path)) openMenus.value.logistica = true
  if (['/clientes', '/profissionais'].includes(route.path)) openMenus.value.pessoas = true
  if (['/usuarios'].includes(route.path)) openMenus.value.admin = true
})

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

const isGroupActive = (paths) => paths.includes(route.path)
</script>

<template>
  <!-- Overlay Mobile -->
  <div v-if="isOpen" @click="emit('close')" class="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"></div>

  <aside :class="[
    'fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 flex flex-col',
    isCollapsed ? 'lg:w-20' : 'lg:w-72',
    isOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
  ]">
    <!-- LOGO AREA -->
    <div class="h-20 flex items-center px-6 overflow-hidden">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-indigo-600 rounded-xl flex shrink-0 items-center justify-center text-white shadow-lg shadow-indigo-200">
          <ShoppingCart class="w-5 h-5" />
        </div>
        <span v-if="!isCollapsed" class="font-black text-xl text-slate-800 uppercase truncate italic">
          Tudo Passa
        </span>
      </div>
      <!-- Botão fechar mobile -->
      <button v-if="isOpen" @click="emit('close')" class="lg:hidden ml-auto p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
        <X class="w-6 h-6" />
      </button>
    </div>

    <!-- NAVEGAÇÃO -->
    <nav class="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
      
      <!-- DASHBOARD -->
      <router-link to="/dashboard" class="flex items-center gap-3 px-3 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-all group" active-class="bg-indigo-50 !text-indigo-600 shadow-sm border border-indigo-100/50">
        <LayoutDashboard class="w-6 h-6 shrink-0" /> 
        <span v-if="!isCollapsed" class="font-medium truncate uppercase text-xs tracking-tighter">Dashboard</span>
      </router-link>
      
      <!-- PDV -->
      <router-link to="/pdv" class="flex items-center gap-3 px-3 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-all group" active-class="bg-indigo-50 !text-indigo-600 shadow-sm border border-indigo-100/50">
        <ShoppingCart class="w-6 h-6 shrink-0" /> 
        <span v-if="!isCollapsed" class="font-bold truncate uppercase text-xs tracking-tighter">PDV Vendas</span>
      </router-link>

      <!-- E-COMMERCE -->
      <a href="ecommerce" target="_blank" class="flex items-center gap-3 px-3 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-all group">
        <Store class="w-6 h-6 shrink-0" /> 
        <span v-if="!isCollapsed" class="font-bold truncate uppercase text-xs tracking-tighter">E-Commerce</span>
      </a>      

      <!-- GRUPOS COM SUBMENU -->

      <!-- PEDIDOS -->
      <div class="py-1">
        <button @click="toggleMenu('pedidos')" 
          :class="['w-full flex items-center px-3 py-3 rounded-xl transition-all group', 
          /* ALTERADO AQUI: de /pedidos-entradas para /pedidos */
          isGroupActive(['/pedidos']) ? 'text-indigo-600 bg-indigo-50/30 font-bold' : 'text-slate-500 hover:bg-slate-50',
          isCollapsed ? 'justify-center' : 'justify-between']">
          <div class="flex items-center gap-3">
            <ClipboardList class="w-6 h-6 shrink-0" />
            <span v-if="!isCollapsed" class="font-medium truncate uppercase text-xs tracking-tighter">Pedidos</span>
          </div>
          <ChevronDown v-if="!isCollapsed" class="w-4 h-4 transition-transform" :class="{ 'rotate-180': openMenus.pedidos }" />
        </button>
        
        <div v-show="openMenus.pedidos && !isCollapsed" class="mt-1 ml-4 border-l-2 border-slate-100 pl-4 space-y-1">
          <!-- ALTERADO AQUI: to="/pedidos" -->
          <router-link to="/pedidos" class="block px-4 py-2 text-xs text-slate-500 hover:text-indigo-600 rounded-xl uppercase font-bold" active-class="!text-indigo-600 font-black">
            Entradas
          </router-link>
        </div>
      </div>

      <!-- ESTOQUE -->
      <div class="py-1">
        <button @click="toggleMenu('estoque')" 
          :class="['w-full flex items-center px-3 py-3 rounded-xl transition-all group', 
          isGroupActive(['/produtos', '/tabela-precos']) ? 'text-indigo-600 bg-indigo-50/30 font-bold' : 'text-slate-500 hover:bg-slate-50',
          isCollapsed ? 'justify-center' : 'justify-between']">
          <div class="flex items-center gap-3">
            <Package class="w-6 h-6 shrink-0" />
            <span v-if="!isCollapsed" class="font-medium truncate uppercase text-xs tracking-tighter">Estoque</span>
          </div>
          <ChevronDown v-if="!isCollapsed" class="w-4 h-4 transition-transform" :class="{ 'rotate-180': openMenus.estoque }" />
        </button>
        <div v-show="openMenus.estoque && !isCollapsed" class="mt-1 ml-4 border-l-2 border-slate-100 pl-4 space-y-1">
          <router-link to="/produtos" class="block px-4 py-2 text-xs text-slate-500 hover:text-indigo-600 rounded-xl uppercase font-bold" active-class="!text-indigo-600 font-black">Produtos</router-link>
          <router-link to="/tabela-precos" class="block px-4 py-2 text-xs text-slate-500 hover:text-indigo-600 rounded-xl uppercase font-bold" active-class="!text-indigo-600 font-black">Tabela de Preços</router-link>
        </div>
      </div>

      <!-- FINANCEIRO -->
      <div class="py-1">
        <button @click="toggleMenu('financeiro')" 
          :class="['w-full flex items-center px-3 py-3 rounded-xl transition-all group', 
          /* ALTERADO: isGroupActive(['/financeiro']) */
          isGroupActive(['/financeiro']) ? 'text-indigo-600 bg-indigo-50/30 font-bold' : 'text-slate-500 hover:bg-slate-50',
          isCollapsed ? 'justify-center' : 'justify-between']">
          <div class="flex items-center gap-3">
            <DollarSign class="w-6 h-6 shrink-0" />
            <span v-if="!isCollapsed" class="font-medium truncate uppercase text-xs tracking-tighter">Financeiro</span>
          </div>
          <ChevronDown v-if="!isCollapsed" class="w-4 h-4 transition-transform" :class="{ 'rotate-180': openMenus.financeiro }" />
        </button>

        <div v-show="openMenus.financeiro && !isCollapsed" class="mt-1 ml-4 border-l-2 border-slate-100 pl-4 space-y-1">
          <!-- ALTERADO: to="/financeiro" -->
          <router-link to="/financeiro" class="block px-4 py-2 text-xs text-slate-500 hover:text-indigo-600 rounded-xl uppercase font-bold" active-class="!text-indigo-600 font-black">
            Entradas
          </router-link>
        </div>
      </div>

      <!-- LOGISTICA -->
      <div class="py-1">
        <button @click="toggleMenu('logistica')" 
          :class="['w-full flex items-center px-3 py-3 rounded-xl transition-all group', 
          /* Verifica se o grupo está ativo */
          isGroupActive(['/logistica-fretes']) ? 'text-indigo-600 bg-indigo-50/30 font-bold' : 'text-slate-500 hover:bg-slate-50',
          isCollapsed ? 'justify-center' : 'justify-between']">
          <div class="flex items-center gap-3">
            <Truck class="w-6 h-6 shrink-0" />
            <span v-if="!isCollapsed" class="font-medium truncate uppercase text-xs tracking-tighter">Logística</span>
          </div>
          <ChevronDown v-if="!isCollapsed" class="w-4 h-4 transition-transform" :class="{ 'rotate-180': openMenus.logistica }" />
        </button>

        <div v-show="openMenus.logistica && !isCollapsed" class="mt-1 ml-4 border-l-2 border-slate-100 pl-4 space-y-1">
          <!-- O LINK PARA A TransportadoraView.vue -->
          <router-link to="/logistica-fretes" 
            class="block px-4 py-2 text-xs text-slate-500 hover:text-indigo-600 rounded-xl uppercase font-bold" 
            active-class="!text-indigo-600 font-black">
            Fretes
          </router-link>
          <router-link to="/logistica-monitoramento" class="block px-4 py-2 text-xs text-slate-500 hover:text-indigo-600 rounded-xl uppercase font-bold" active-class="!text-indigo-600 font-black">
            Torre de Controle
          </router-link>
        </div>
      </div>

      <!-- PESSOAS -->
      <div class="py-1">
        <button @click="toggleMenu('pessoas')" 
          :class="['w-full flex items-center px-3 py-3 rounded-xl transition-all group', 
          isGroupActive(['/clientes', '/profissionais']) ? 'text-indigo-600 bg-indigo-50/30 font-bold' : 'text-slate-500 hover:bg-slate-50',
          isCollapsed ? 'justify-center' : 'justify-between']">
          <div class="flex items-center gap-3">
            <Users class="w-6 h-6 shrink-0" />
            <span v-if="!isCollapsed" class="font-medium truncate uppercase text-xs tracking-tighter">Pessoas</span>
          </div>
          <ChevronDown v-if="!isCollapsed" class="w-4 h-4 transition-transform" :class="{ 'rotate-180': openMenus.pessoas }" />
        </button>
        <div v-show="openMenus.pessoas && !isCollapsed" class="mt-1 ml-4 border-l-2 border-slate-100 pl-4 space-y-1">
          <router-link to="/clientes" class="block px-4 py-2 text-xs text-slate-500 hover:text-indigo-600 rounded-xl uppercase font-bold" active-class="!text-indigo-600 font-black">Clientes</router-link>
          <router-link to="/profissionais" class="block px-4 py-2 text-xs text-slate-500 hover:text-indigo-600 rounded-xl uppercase font-bold" active-class="!text-indigo-600 font-black">Profissionais</router-link>
        </div>
      </div>

      <!-- ADMIN -->
      <div class="py-1">
        <button @click="toggleMenu('admin')" 
          :class="['w-full flex items-center px-3 py-3 rounded-xl transition-all group', 
          isGroupActive(['/usuarios']) ? 'text-indigo-600 bg-indigo-50/30 font-bold' : 'text-slate-500 hover:bg-slate-50',
          isCollapsed ? 'justify-center' : 'justify-between']">
          <div class="flex items-center gap-3">
            <ShieldCheck class="w-6 h-6 shrink-0" />
            <span v-if="!isCollapsed" class="font-medium truncate uppercase text-xs tracking-tighter">Admin</span>
          </div>
          <ChevronDown v-if="!isCollapsed" class="w-4 h-4 transition-transform" :class="{ 'rotate-180': openMenus.admin }" />
        </button>
        <div v-show="openMenus.admin && !isCollapsed" class="mt-1 ml-4 border-l-2 border-slate-100 pl-4 space-y-1">
          <router-link to="/usuarios" class="block px-4 py-2 text-xs text-slate-500 hover:text-indigo-600 rounded-xl uppercase font-bold" active-class="!text-indigo-600 font-black">Usuários</router-link>
        </div>
      </div>
    </nav>

    <!-- ÁREA DO USUÁRIO -->
    <div class="p-4 border-t border-slate-100 bg-white">
      <div :class="['flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer overflow-hidden', isCollapsed ? 'justify-center' : '']">
        <div class="w-10 h-10 rounded-full bg-indigo-600 shrink-0 border-2 border-white shadow-md flex items-center justify-center text-white font-bold overflow-hidden">
          <img v-if="usuarioLogado.foto" :src="`${BASE_URL}/uploads/usuarios/${usuarioLogado.foto}`" class="w-full h-full object-cover" />
          <span v-else>{{ usuarioLogado.login.charAt(0).toUpperCase() }}</span>
        </div>
        <div v-if="!isCollapsed" class="overflow-hidden">
          <p class="text-xs font-bold text-slate-800 truncate">{{ usuarioLogado.login }}</p>
          <p class="text-[9px] text-slate-400 truncate uppercase font-bold tracking-tighter">{{ usuarioLogado.tipo || 'Usuário' }}</p>
        </div>
      </div>
    </div>
  </aside>
</template>