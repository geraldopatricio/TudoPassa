import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import PDVView from '../views/PDVView.vue'
import ECommerceMobile from '@/views/ECommerceMobile.vue'

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
    }
  ]
})

export default router
