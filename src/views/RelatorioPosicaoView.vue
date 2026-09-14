<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import * as XLSX from 'xlsx'

const route = useRoute()
const kind = computed(() => route.path.endsWith('/financeiro') ? 'financeiro' : 'estoque')
const base = computed(() => `${import.meta.env.VITE_API_URL || '/api'}/relatorios/${kind.value}`)
const token = JSON.parse(localStorage.getItem('usuario') || '{}').accessToken
const headers = { Authorization: `Bearer ${token}` }
const filters = ref({ codigo: '', descricao: '', inicio: '', fim: '' })
const rows = ref([]), total = ref(0), page = ref(1), pageSize = ref(10)
const summary = ref({ recebido: 0, aReceber: 0, cancelado: 0 })
const loading = ref(false), exporting = ref(false), sending = ref(false)
const email = ref(''), error = ref(''), message = ref('')
const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const columns = computed(() => kind.value === 'estoque'
  ? [{ key: 'codigo', label: 'Código' }, { key: 'descricao', label: 'Descrição' }, { key: 'categoria', label: 'Categoria' }, { key: 'preco', label: 'Preço' }, { key: 'quantidade', label: 'Disponível' }]
  : [{ key: 'data', label: 'Data' }, { key: 'numero_pedido', label: 'Pedido' }, { key: 'cliente_nome', label: 'Cliente' }, { key: 'tipo_movimento', label: 'Movimento' }, { key: 'situacao', label: 'Situação' }, { key: 'forma_pagamento', label: 'Pagamento' }, { key: 'valor_liquido', label: 'Valor líquido' }])
const query = () => new URLSearchParams(Object.entries(filters.value)
  .filter(([key, value]) => value && (kind.value === 'estoque' ? ['codigo', 'descricao'].includes(key) : ['inicio', 'fim'].includes(key))))
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } })
  if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('A API de relatórios não respondeu em JSON. Reinicie o backend atualizado e confira VITE_API_URL.')
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Falha ao consultar relatório.')
  return data
}
async function load() {
  loading.value = true; error.value = ''
  try {
    const search = query(); search.set('page', page.value); search.set('pageSize', pageSize.value)
    const data = await request(`${base.value}?${search}`)
    rows.value = data.rows; total.value = data.total; summary.value = data.summary || { recebido: 0, aReceber: 0, cancelado: 0 }
  } catch (e) { error.value = e.message; rows.value = []; total.value = 0 }
  finally { loading.value = false }
}
function applyFilters() { page.value = 1; load() }
function clearFilters() { filters.value = { codigo: '', descricao: '', inicio: '', fim: '' }; applyFilters() }
async function exportExcel() {
  exporting.value = true; error.value = ''
  try {
    const data = await request(`${base.value}/exportar?${query()}`)
    const sheet = XLSX.utils.json_to_sheet(data.rows.map(row => Object.fromEntries(columns.value.map(col => [col.label, row[col.key] ?? '']))))
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, kind.value === 'estoque' ? 'Estoque' : 'Financeiro')
    XLSX.writeFile(book, `relatorio-${kind.value}.xlsx`)
  } catch (e) { error.value = e.message }
  finally { exporting.value = false }
}
async function sendEmail() {
  sending.value = true; error.value = ''; message.value = ''
  try {
    const data = await request(`${base.value}/email?${query()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.value }) })
    message.value = data.message
  } catch (e) { error.value = e.message }
  finally { sending.value = false }
}
watch(kind, () => { filters.value = { codigo: '', descricao: '', inicio: '', fim: '' }; page.value = 1; load() }, { immediate: true })
</script>

<template>
  <div class="bg-slate-50 text-slate-800 min-h-screen p-4 md:p-6">
    <div class="flex flex-wrap justify-between items-center gap-4 mb-6">
      <div><h1 class="text-2xl font-black uppercase">{{ kind === 'estoque' ? 'Posição de estoque' : 'Posição financeira' }}</h1><p class="text-sm text-slate-500">{{ kind === 'estoque' ? 'Quantidade disponível por produto' : 'Lançamentos e valores por período' }}</p></div>
      <button @click="exportExcel" :disabled="exporting" class="px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50">{{ exporting ? 'Exportando...' : 'Exportar Excel' }}</button>
    </div>
    <p v-if="error" role="alert" class="mb-4 p-3 bg-red-50 text-red-700 rounded-xl">{{ error }}</p>
    <p v-if="message" role="status" class="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl">{{ message }}</p>
    <div v-if="kind === 'financeiro'" class="grid sm:grid-cols-3 gap-4 mb-5">
      <div v-for="item in [{ label: 'Recebido', value: summary.recebido }, { label: 'A receber', value: summary.aReceber }, { label: 'Cancelado', value: summary.cancelado }]" :key="item.label" class="bg-white border border-slate-200 rounded-2xl p-5"><p class="text-xs uppercase text-slate-500 font-bold">{{ item.label }}</p><p class="text-xl font-black mt-2">{{ money(item.value) }}</p></div>
    </div>
    <div class="flex flex-col xl:flex-row gap-5">
      <aside class="xl:w-64 shrink-0 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 self-start">
        <h2 class="font-black uppercase text-sm">Filtros</h2>
        <template v-if="kind === 'estoque'"><label class="block text-xs font-bold">Código do produto<input v-model="filters.codigo" @keyup.enter="applyFilters" class="mt-1 w-full p-2 border rounded-lg" /></label><label class="block text-xs font-bold">Descrição<input v-model="filters.descricao" @keyup.enter="applyFilters" class="mt-1 w-full p-2 border rounded-lg" /></label></template>
        <template v-else><label class="block text-xs font-bold">Data inicial<input v-model="filters.inicio" type="date" class="mt-1 w-full p-2 border rounded-lg" /></label><label class="block text-xs font-bold">Data final<input v-model="filters.fim" type="date" class="mt-1 w-full p-2 border rounded-lg" /></label></template>
        <button @click="applyFilters" class="w-full p-2 bg-indigo-600 text-white font-bold rounded-lg">Aplicar filtros</button><button @click="clearFilters" class="w-full p-2 border rounded-lg">Limpar</button>
        <form @submit.prevent="sendEmail" class="border-t pt-4 space-y-2"><label class="block text-xs font-bold">Enviar resultado por e-mail<input v-model="email" type="email" required placeholder="destinatario@exemplo.com" class="mt-1 w-full p-2 border rounded-lg" /></label><button :disabled="sending" class="w-full p-2 bg-slate-800 text-white font-bold rounded-lg disabled:opacity-50">{{ sending ? 'Enviando...' : 'Enviar relatório' }}</button></form>
      </aside>
      <div class="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto"><table class="w-full text-sm text-left"><thead class="bg-slate-100 uppercase text-xs"><tr><th v-for="col in columns" :key="col.key" class="p-4 whitespace-nowrap">{{ col.label }}</th></tr></thead><tbody><tr v-for="(row, index) in rows" :key="row.id || row.codigo || index" class="border-t"><td v-for="col in columns" :key="col.key" class="p-4 whitespace-nowrap" :class="{ 'font-bold': col.key === 'codigo' || col.key === 'valor_liquido' }">{{ ['preco', 'valor_liquido'].includes(col.key) ? money(row[col.key]) : row[col.key] ?? '—' }}</td></tr><tr v-if="loading"><td :colspan="columns.length" class="p-12 text-center">Carregando...</td></tr><tr v-else-if="!rows.length"><td :colspan="columns.length" class="p-12 text-center text-slate-500">Nenhum registro encontrado.</td></tr></tbody></table></div>
        <div class="flex flex-wrap justify-between items-center gap-3 p-4 border-t text-sm"><span>{{ total }} registro(s)</span><div class="flex items-center gap-3"><button @click="page--; load()" :disabled="page <= 1 || loading" class="p-2 border rounded-lg disabled:opacity-40">Anterior</button><span>Página {{ page }} de {{ Math.max(1, Math.ceil(total / pageSize)) }}</span><button @click="page++; load()" :disabled="page >= Math.ceil(total / pageSize) || loading" class="p-2 border rounded-lg disabled:opacity-40">Próxima</button></div><select v-model.number="pageSize" @change="applyFilters" class="p-2 border rounded-lg"><option :value="10">10 por página</option><option :value="25">25 por página</option><option :value="50">50 por página</option></select></div>
      </div>
    </div>
  </div>
</template>
