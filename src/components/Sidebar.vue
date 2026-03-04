<script setup>
import { LayoutDashboard, ShoppingCart, Package, Users } from 'lucide-vue-next'
</script>

<template>
  <aside class="w-72 bg-white border-r border-slate-200/60 flex flex-col h-screen">
    <div class="p-8">
      <div class="flex items-center gap-3 text-indigo-600">
        <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
          <ShoppingCart class="w-5 h-5" />
        </div>
        <span class="font-black text-xl tracking-tight text-slate-800 uppercase text-nowrap">Tudo Passa</span>
      </div>
    </div>

    <nav class="flex-1 px-4 space-y-2">
      <a href="#" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl transition-all group">
        <LayoutDashboard class="w-5 h-5 group-hover:text-indigo-600" /> 
        <span class="font-medium">Dashboard</span>
      </a>
      <a href="#" class="flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm border border-indigo-100/50">
        <ShoppingCart class="w-5 h-5" /> 
        <span class="font-bold">PDV Vendas</span>
      </a>
      <a href="#" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl transition-all group">
        <Package class="w-5 h-5 group-hover:text-indigo-600" /> 
        <span class="font-medium">Produtos</span>
      </a>
      <a href="#" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl transition-all group">
        <Users class="w-5 h-5 group-hover:text-indigo-600" /> 
        <span class="font-medium">Clientes</span>
      </a>
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