import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import PDVView from '../views/PDVView.vue'
import ECommerceMobile from '@/views/ECommerceMobile.vue'
import ProdutosView from '../views/ProdutosView.vue'
import ClientesView from '../views/ClientesView.vue'
import ProfissionaisView from '../views/ProfissionaisView.vue'
import UsuariosView from '../views/UsuariosView.vue'
import TabelaPrecos from '../views/TabelaPrecos.vue'
import PedidosView from '../views/PedidosView.vue'
import FinanceiroView from '../views/FinanceiroView.vue'
import TransportadoraView from '../views/TransportadoraView.vue'
import TrackingView from '../views/TrackingView.vue'
import LogisticaAdminView from '../views/LogisticaAdminView.vue'

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
      path: '/pedidos',
      name: 'pedidos',
      component: PedidosView
    },
    {
      path: '/financeiro',
      name: 'financeiro',
      component: FinanceiroView
    },
    {
      path: '/logistica-fretes',
      name: 'logistica-fretes',
      component: TransportadoraView
    },
    {
      path: '/clientes',
      name: 'clientes',
      component: ClientesView
    },
    {
      path: '/profissionais',
      name: 'profissionais',
      component: ProfissionaisView
    },
    {
      path: '/tabela-precos',
      name: 'TabelaPrecos',
      component: TabelaPrecos
    },
    {
      path: '/tracking/:id', // Rota dinâmica para o cliente
      name: 'tracking',
      component: TrackingView
    },
    {
      path: '/logistica-monitoramento', // Rota da Torre de Controle (Admin)
      name: 'logistica-monitoramento',
      component: LogisticaAdminView
    },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: UsuariosView
    }
  ]
})

export default router
