import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import PDVView from '../views/PDVView.vue'
import ECommerceMobile from '@/views/ECommerceMobile.vue'
import ProdutosView from '../views/ProdutosView.vue'
import ClientesView from '../views/ClientesView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView
    },
    {
      path: '/pdv',
      name: 'pdv',
      component: PDVView
    },
    {
      path: '/ecommerce',
      name: 'ecommerce',
      component: ECommerceMobile
    },
    {
      path: '/produtos',
      name: 'produtos',
      component: ProdutosView
    },
    {
      path: '/clientes',
      name: 'clientes',
      component: ClientesView
    }
  ]
})

export default router
