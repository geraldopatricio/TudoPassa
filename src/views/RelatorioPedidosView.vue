<script setup>
import { ref, onMounted } from 'vue'
import * as XLSX from 'xlsx'

const base = `${import.meta.env.VITE_API_URL || '/api'}/relatorios/pedidos`
const token = JSON.parse(localStorage.getItem('usuario') || '{}').accessToken
const headers = { Authorization: `Bearer ${token}` }
const filters = ref({ pedido: '', cliente: '', inicio: '', fim: '' })
const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const sending = ref(false)
const exporting = ref(false)
const email = ref('')
const message = ref('')
const error = ref('')

const params = () => new URLSearchParams(Object.entries(filters.value).filter(([, value]) => value !== ''))
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } })
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) throw new Error('A API de relatórios não respondeu em JSON. Verifique se o backend atualizado está em execução e se VITE_API_URL aponta para ele.')
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Falha ao consultar relatório.')
  return data
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    const query = params()
    query.set('page', page.value)
    query.set('pageSize', pageSize.value)
    const result = await request(`${base}?${query}`)
    rows.value = result.rows
    total.value = result.total
  } catch (e) { error.value = e.message; rows.value = []; total.value = 0 }
  finally { loading.value = false }
}
function applyFilters() { page.value = 1; load() }
function clearFilters() { filters.value = { pedido: '', cliente: '', inicio: '', fim: '' }; applyFilters() }
async function exportExcel() {
  exporting.value = true
  error.value = ''
  try {
    const { rows: all } = await request(`${base}/exportar?${params()}`)
    const sheet = XLSX.utils.json_to_sheet(all.map(p => ({
      Pedido: p.numero_pedido, Data: p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '',
      'Código do cliente': p.cliente_codigo, Cliente: p.cliente_nome, CPF: p.cliente_cpf,
      Status: p.status, Subtotal: p.subtotal, Frete: p.frete, Total: p.total
    })))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Pedidos')
    XLSX.writeFile(workbook, 'relatorio-pedidos.xlsx')
  } catch (e) { error.value = e.message }
  finally { exporting.value = false }
}
async function sendEmail() {
  sending.value = true
  error.value = ''
  message.value = ''
  try {
    const result = await request(`${base}/email?${params()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.value })
    })
    message.value = result.message
  } catch (e) { error.value = e.message }
  finally { sending.value = false }
}
onMounted(load)
</script>

<template>
  <div class="bg-slate-50 text-slate-800 min-h-screen">
      <main class="p-4 md:p-6">
        <div class="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div><h1 class="text-2xl font-black uppercase">Relatório de pedidos</h1><p class="text-sm text-slate-500">Pedidos por revendedores, vendedores, afiliados e clientes</p></div>
          <button @click="exportExcel" :disabled="exporting" class="px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50">{{ exporting ? 'Exportando...' : 'Exportar Excel' }}</button>
        </div>
        <p v-if="error" role="alert" class="mb-4 p-3 bg-red-50 text-red-700 rounded-xl">{{ error }}</p>
        <p v-if="message" role="status" class="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl">{{ message }}</p>
        <div class="flex flex-col xl:flex-row gap-5">
          <aside class="xl:w-64 shrink-0 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 self-start">
            <h2 class="font-black uppercase text-sm">Filtros</h2>
            <label class="block text-xs font-bold">Código do pedido<input v-model="filters.pedido" @keyup.enter="applyFilters" class="mt-1 w-full p-2 border rounded-lg" /></label>
            <label class="block text-xs font-bold">Data inicial<input v-model="filters.inicio" type="date" class="mt-1 w-full p-2 border rounded-lg" /></label>
            <label class="block text-xs font-bold">Data final<input v-model="filters.fim" type="date" class="mt-1 w-full p-2 border rounded-lg" /></label>
            <label class="block text-xs font-bold">Código do cliente<input v-model="filters.cliente" @keyup.enter="applyFilters" class="mt-1 w-full p-2 border rounded-lg" /></label>
            <button @click="applyFilters" class="w-full p-2 bg-indigo-600 text-white font-bold rounded-lg">Aplicar filtros</button>
            <button @click="clearFilters" class="w-full p-2 border rounded-lg">Limpar</button>
            <form @submit.prevent="sendEmail" class="border-t pt-4 space-y-2">
              <label class="block text-xs font-bold">Enviar resultado por e-mail<input v-model="email" type="email" required placeholder="destinatario@exemplo.com" class="mt-1 w-full p-2 border rounded-lg" /></label>
              <button :disabled="sending" class="w-full p-2 bg-slate-800 text-white font-bold rounded-lg disabled:opacity-50">{{ sending ? 'Enviando...' : 'Enviar relatório' }}</button>
            </form>
          </aside>
          <div class="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div class="overflow-x-auto"><table class="w-full text-sm text-left"><thead class="bg-slate-100 uppercase text-xs"><tr><th v-for="label in ['Pedido', 'Data', 'Código cliente', 'Cliente', 'CPF', 'Status', 'Total']" :key="label" class="p-4 whitespace-nowrap">{{ label }}</th></tr></thead>
              <tbody><tr v-for="p in rows" :key="p.numero_pedido" class="border-t"><td class="p-4 font-bold">#{{ p.numero_pedido }}</td><td class="p-4 whitespace-nowrap">{{ p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '—' }}</td><td class="p-4">{{ p.cliente_codigo }}</td><td class="p-4">{{ p.cliente_nome }}</td><td class="p-4">{{ p.cliente_cpf }}</td><td class="p-4">{{ p.status }}</td><td class="p-4 whitespace-nowrap">{{ Number(p.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}</td></tr>
                <tr v-if="!loading && !rows.length"><td colspan="7" class="p-12 text-center text-slate-500">Nenhum pedido encontrado.</td></tr>
                <tr v-if="loading"><td colspan="7" class="p-12 text-center">Carregando...</td></tr>
              </tbody></table></div>
            <div class="flex flex-wrap justify-between items-center gap-3 p-4 border-t text-sm"><span>{{ total }} pedido(s)</span><div class="flex items-center gap-3"><button @click="page--; load()" :disabled="page <= 1 || loading" class="p-2 border rounded-lg disabled:opacity-40">Anterior</button><span>Página {{ page }} de {{ Math.max(1, Math.ceil(total / pageSize)) }}</span><button @click="page++; load()" :disabled="page >= Math.ceil(total / pageSize) || loading" class="p-2 border rounded-lg disabled:opacity-40">Próxima</button></div><select v-model.number="pageSize" @change="applyFilters" class="p-2 border rounded-lg"><option :value="10">10 por página</option><option :value="25">25 por página</option><option :value="50">50 por página</option></select></div>
          </div>
        </div>
      </main>
  </div>
</template>
