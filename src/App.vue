<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import NavBar from './components/NavBar.vue'

const route = useRoute()
const router = useRouter()
const isCollapsed = ref(false)
const isMobileOpen = ref(false)
const savedOrders = ref([])
const refreshSavedOrders = () => {
  try { savedOrders.value = JSON.parse(localStorage.getItem('gpsoft_pedidos_salvos') || '[]') }
  catch { savedOrders.value = [] }
}
const handleStorage = event => {
  if (!event || event.key === 'gpsoft_pedidos_salvos') refreshSavedOrders()
}
const restoreSavedOrder = async order => {
  if (route.path !== '/pdv') {
    await router.push('/pdv')
    await nextTick()
  }
  window.dispatchEvent(new CustomEvent('restore-saved-order', { detail: order }))
}
onMounted(() => {
  refreshSavedOrders()
  window.addEventListener('saved-orders-updated', refreshSavedOrders)
  window.addEventListener('storage', handleStorage)
})
onUnmounted(() => {
  window.removeEventListener('saved-orders-updated', refreshSavedOrders)
  window.removeEventListener('storage', handleStorage)
})

// Não mostra menu na tela de Login
const showLayout = computed(() => {
  const publicRoutes = ['/', '/login', '/ecommerce']
  return !publicRoutes.includes(route.path) && !route.path.startsWith('/tracking')
})

const handleToggleSidebar = () => {
  if (window.innerWidth < 1024) {
    isMobileOpen.value = !isMobileOpen.value
  } else {
    isCollapsed.value = !isCollapsed.value
  }
}
</script>

<template>
  <div class="flex min-h-screen bg-slate-50">
    
    <Sidebar 
      v-if="showLayout"
      :isOpen="isMobileOpen" 
      :isCollapsed="isCollapsed"
      @close="isMobileOpen = false" 
    />

    <div 
      class="flex-1 flex flex-col min-w-0 transition-all duration-300"
      :class="[showLayout ? (isCollapsed ? 'lg:ml-20' : 'lg:ml-72') : '']"
    >
      <!-- IMPORTANTE: O evento @toggleSidebar deve chamar a função handleToggleSidebar -->
      <NavBar 
        v-if="showLayout"
        :savedOrders="savedOrders"
        @restoreOrder="restoreSavedOrder"
        @toggleSidebar="handleToggleSidebar" 
      />

      <main class="flex-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>
