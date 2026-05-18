<script setup>
import { LayoutDashboard, ShoppingCart, Package, Users, Store, X } from 'lucide-vue-next'

defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close'])
</script>

<template>
  <!-- Overlay para fechar no mobile ao clicar fora -->
  <div v-if="isOpen" 
    @click="emit('close')" 
    class="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm transition-opacity">
  </div>

  <aside :class="[
    'fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/60 flex flex-col h-screen transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0',
    isOpen ? 'translate-x-0' : '-translate-x-full'
  ]">
    <div class="p-8 flex justify-between items-center">
      <div class="flex items-center gap-3 text-indigo-600">
        <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
          <ShoppingCart class="w-5 h-5" />
        </div>
        <span class="font-black text-xl tracking-tight text-slate-800 uppercase text-nowrap">Tudo Passa</span>
      </div>
      <!-- Botão fechar apenas no mobile -->
      <button @click="emit('close')" class="lg:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
        <X class="w-6 h-6" />
      </button>
    </div>

    <nav class="flex-1 px-4 space-y-2">
      <a href="#" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl transition-all group">
        <LayoutDashboard class="w-5 h-5 group-hover:text-indigo-600" /> 
        <span class="font-medium">Dashboard</span>
      </a>
      
      <router-link to="/pdv" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl transition-all group" active-class="bg-indigo-50 !text-indigo-600 shadow-sm border border-indigo-100/50">
        <ShoppingCart class="w-5 h-5" /> 
        <span class="font-bold">PDV Vendas</span>
      </router-link>

      <a href="ecommerce" target="_blank" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl transition-all group">
        <Store class="w-5 h-5" /> 
        <span class="font-bold">E-Commerce</span>
      </a>      

      <router-link to="/produtos" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl transition-all group" active-class="bg-indigo-50 !text-indigo-600 shadow-sm border border-indigo-100/50">
        <Package class="w-5 h-5" /> 
        <span class="font-medium">Produtos</span>
      </router-link>

      <router-link to="/clientes" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl transition-all group" active-class="bg-indigo-50 !text-indigo-600 shadow-sm border border-indigo-100/50">
        <Users class="w-5 h-5" /> 
        <span class="font-medium">Clientes</span>
      </router-link>

    </nav>

    <div class="p-6 mt-auto border-t border-slate-100">
      <div class="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer">
        <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-white shadow-md flex items-center justify-center text-white font-bold">G</div>
        <div class="overflow-hidden">
          <p class="text-sm font-bold text-slate-800 truncate">Geraldo Patrício</p>
          <p class="text-[10px] text-slate-400 truncate uppercase font-bold tracking-tighter">Admin Master</p>
        </div>
      </div>
    </div>
  </aside>
</template>
