<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { Printer, RefreshCw, Loader2 } from 'lucide-vue-next'
const BASE_URL = import.meta.env.VITE_API_URL || '/api'
const entries = ref([]), loading = ref(true), error = ref('')
const dayKey = value => {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return value
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
const entryDate = item => item.situacao === 'Recebido' ? item.data_pagamento || item.data_emissao : item.data_emissao
const mode = ref('month'), reference = ref(dayKey(new Date()))
const start = ref(reference.value), end = ref(reference.value), search = ref(''), status = ref(''), printedAt = ref('')
const modes = [{ id: 'day', label: 'Diário' }, { id: 'week', label: 'Semanal' }, { id: 'month', label: 'Mensal' }, { id: 'custom', label: 'Por período' }]
const range = computed(() => {
  if (mode.value === 'custom') return { start: start.value, end: end.value }
  const date = new Date(`${reference.value}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return { start: '', end: '' }
  const iso = d => d.toISOString().slice(0, 10)
  if (mode.value === 'week') {
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
    const first = iso(date); date.setUTCDate(date.getUTCDate() + 6)
    return { start: first, end: iso(date) }
  }
  if (mode.value === 'month') return { start: iso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))), end: iso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))) }
  return { start: reference.value, end: reference.value }
})
const invalid = computed(() => !range.value.start || !range.value.end || range.value.start > range.value.end)
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0
const money = value => number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dateLabel = value => value ? value.split('-').reverse().join('/') : '—'
const sum = items => items.reduce((total, item) => total + Math.round(number(item.valor_liquido) * 100), 0) / 100
const rows = computed(() => invalid.value ? [] : entries.value.filter(item => {
  const date = dayKey(entryDate(item)), query = search.value.trim().toLocaleLowerCase('pt-BR')
  return date && date >= range.value.start && date <= range.value.end && (!status.value || item.situacao === status.value) &&
    [item.cliente_nome, item.cliente_cpf, item.numero_pedido, item.id, item.forma_pagamento, item.conta_financeira, item.observacoes].some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(query))
}).sort((a, b) => dayKey(entryDate(b)).localeCompare(dayKey(entryDate(a))) || new Date(entryDate(b)) - new Date(entryDate(a)) || String(b.id).localeCompare(String(a.id))))
const received = computed(() => rows.value.filter(item => item.situacao === 'Recebido'))
const pending = computed(() => rows.value.filter(item => !['Recebido', 'Cancelado'].includes(item.situacao)))
const groups = computed(() => {
  const result = new Map()
  for (const item of rows.value) { const key = dayKey(entryDate(item)); if (!result.has(key)) result.set(key, []); result.get(key).push(item) }
  return [...result].map(([date, items]) => ({ date, items, total: sum(items.filter(item => item.situacao === 'Recebido')) }))
})
const payments = computed(() => {
  const result = new Map()
  for (const item of received.value) { const key = item.forma_pagamento || 'Não informada'; if (!result.has(key)) result.set(key, []); result.get(key).push(item) }
  return [...result].map(([label, items]) => ({ label, count: items.length, total: sum(items) })).sort((a, b) => b.total - a.total)
})
const undated = computed(() => entries.value.filter(item => !dayKey(entryDate(item))).length)
const fetchEntries = async () => {
  loading.value = true; error.value = ''
  try {
    const response = await fetch(`${BASE_URL}/financeiro`)
    if (!response.ok) throw new Error('Não foi possível carregar as entradas financeiras.')
    const data = await response.json()
    if (!Array.isArray(data)) throw new Error('Resposta financeira inválida.')
    entries.value = data
  } catch (e) { error.value = e.message } finally { loading.value = false }
}
const printReport = async () => {
  printedAt.value = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  await nextTick(); window.print()
}
onMounted(fetchEntries)
</script>

<template>
  <main class="finance-page p-4 md:p-8 max-w-[1500px] mx-auto text-slate-800">
    <div class="screen-only flex flex-wrap items-center justify-between gap-4 mb-7">
      <div><p class="text-xs font-bold tracking-widest uppercase text-indigo-600">Financeiro / Entradas</p><h1 class="text-3xl font-bold mt-2">Extrato de entradas</h1><p class="text-sm text-slate-500 mt-2">Seus lançamentos, do mais recente para o mais antigo.</p></div>
      <div class="flex gap-2"><button @click="fetchEntries" :disabled="loading" class="action secondary"><RefreshCw class="w-4 h-4" /> Atualizar</button><button @click="printReport" :disabled="loading || !!error || invalid || !rows.length" class="action primary"><Printer class="w-4 h-4" /> Imprimir relatório</button></div>
    </div>
    <section class="screen-only bg-white border border-slate-200 rounded-2xl p-5 mb-6" aria-label="Filtros do extrato">
      <div class="flex flex-wrap gap-2 mb-5"><button v-for="option in modes" :key="option.id" @click="mode = option.id" :aria-pressed="mode === option.id" class="px-4 py-2 rounded-lg text-sm font-semibold" :class="mode === option.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'">{{ option.label }}</button></div>
      <div class="flex flex-wrap gap-4 items-end">
        <label v-if="mode !== 'custom'" class="filter-label">Data de referência<input v-model="reference" type="date"></label>
        <template v-else><label class="filter-label">Data inicial<input v-model="start" type="date"></label><label class="filter-label">Data final<input v-model="end" type="date"></label></template>
        <label class="filter-label">Situação<select v-model="status"><option value="">Todas</option><option>Recebido</option><option>Em aberto</option><option>Cancelado</option></select></label>
        <label class="filter-label flex-1 min-w-52">Buscar no extrato<input v-model="search" type="search" placeholder="Cliente, pedido, documento ou pagamento"></label>
      </div>
      <p class="text-xs text-slate-500 mt-4">Recebidos: data do pagamento ou, se ausente, emissão. Demais lançamentos: data de emissão. Semana de segunda a domingo. Horário de Brasília.</p>
      <p v-if="invalid" role="alert" class="text-sm text-red-600 mt-3">Informe um período válido, com a data inicial anterior ou igual à final.</p>
    </section>
    <div v-if="loading" role="status" class="screen-only p-16 flex justify-center gap-3 text-slate-500"><Loader2 class="animate-spin w-5 h-5" /> Carregando entradas...</div>
    <div v-else-if="error" role="alert" class="screen-only p-6 bg-red-50 text-red-700 rounded-xl">{{ error }} <button @click="fetchEntries" class="underline ml-2">Tentar novamente</button></div>
    <article v-else id="financial-report">
      <div class="report-heading border-b border-slate-200 pb-5 mb-5">
        <p class="print-only font-bold text-lg">TUDO PASSA · FINANCEIRO</p>
        <div class="flex flex-wrap justify-between gap-3 items-end"><div><h2 class="text-xl font-bold">Relatório de entradas</h2><p class="text-sm text-slate-500 mt-1">{{ dateLabel(range.start) }} a {{ dateLabel(range.end) }} · {{ modes.find(item => item.id === mode)?.label }}</p></div><p class="text-xs text-slate-500">{{ rows.length }} lançamento(s) · Valores em reais (BRL)</p></div>
        <p class="text-xs text-slate-500 mt-2">Situação: {{ status || 'Todas' }} · Busca: {{ search || 'Sem filtro' }}</p>
        <p class="print-only text-xs mt-2">Emitido em {{ printedAt }} · Horário de Brasília · Mais recentes primeiro</p>
      </div>
      <div class="summary-grid grid sm:grid-cols-3 gap-4 mb-6">
        <div class="summary-card bg-slate-900 text-white"><p class="text-xs uppercase tracking-wider">Total recebido</p><p class="text-3xl font-bold mt-3 tabular-nums">{{ money(sum(received)) }}</p><p class="text-xs mt-2 opacity-70">{{ received.length }} recebimento(s) no filtro</p></div>
        <div class="summary-card bg-white border border-slate-200"><p class="text-xs uppercase tracking-wider text-slate-500">A receber</p><p class="text-3xl font-bold mt-3 tabular-nums">{{ money(sum(pending)) }}</p><p class="text-xs mt-2 text-slate-500">{{ pending.length }} lançamento(s) não recebido(s)</p></div>
        <div class="summary-card bg-white border border-slate-200"><p class="text-xs uppercase tracking-wider text-slate-500">Média por recebimento</p><p class="text-3xl font-bold mt-3 tabular-nums">{{ money(received.length ? sum(received) / received.length : 0) }}</p><p class="text-xs mt-2 text-slate-500">Considera apenas valores recebidos</p></div>
      </div>
      <p v-if="undated" class="text-xs text-amber-700 mb-4">{{ undated }} lançamento(s) sem data válida não foram incluídos no período.</p>
      <div v-if="!rows.length" class="border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-500">Nenhum lançamento encontrado para os filtros selecionados.</div>
      <div v-else class="statement-wrap bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table class="statement-table w-full text-left">
          <thead><tr><th>Data / Pedido</th><th>Descrição / Cliente</th><th>Pagamento / Conta</th><th>Situação</th><th class="amount">Original</th><th class="amount">Líquido</th></tr></thead>
          <tbody v-for="group in groups" :key="group.date">
            <tr class="day-heading"><td colspan="6"><div class="flex justify-between gap-4"><strong>{{ dateLabel(group.date) }} <span class="font-normal">· {{ group.items.length }} lançamento(s)</span></strong><strong>Recebido no dia: {{ money(group.total) }}</strong></div></td></tr>
            <tr v-for="item in group.items" :key="item.id" class="entry-row">
              <td><strong>{{ dateLabel(dayKey(entryDate(item))) }}</strong><span>{{ item.numero_pedido != null ? `Pedido #${item.numero_pedido}` : 'Lançamento manual' }}</span><small>{{ item.id }}</small></td>
              <td><strong>{{ item.cliente_nome || 'Cliente não informado' }}</strong><span>{{ item.tipo_movimento || 'Entrada financeira' }}</span><small v-if="item.cliente_cpf">CPF/CNPJ: {{ item.cliente_cpf }}</small><small v-if="item.observacoes" class="entry-note">{{ item.observacoes }}</small><small>Emissão: {{ dateLabel(dayKey(item.data_emissao)) }} · Vencimento: {{ dateLabel(dayKey(item.data_vencimento)) }}</small></td>
              <td><strong>{{ item.forma_pagamento || 'Não informado' }}</strong><span>{{ item.conta_financeira || 'Conta não informada' }}</span><small>Parcela {{ item.parcela || '—' }}</small></td>
              <td><span class="status-pill" :class="item.situacao === 'Recebido' ? 'received' : item.situacao === 'Cancelado' ? 'cancelled' : 'pending'">{{ item.situacao || 'Em aberto' }}</span></td>
              <td class="amount">{{ money(item.valor_original ?? item.valor_liquido) }}</td><td class="amount font-bold" :class="item.situacao === 'Recebido' ? 'text-emerald-700' : 'text-slate-600'">{{ money(item.valor_liquido) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <section v-if="payments.length" class="payment-summary mt-6 bg-white border border-slate-200 rounded-2xl p-5">
        <h3 class="font-bold mb-4">Recebimentos por forma de pagamento</h3>
        <div v-for="payment in payments" :key="payment.label" class="flex justify-between gap-4 py-2 border-b border-slate-100 text-sm"><span>{{ payment.label }} <small class="text-slate-500">· {{ payment.count }} registro(s)</small></span><strong class="tabular-nums">{{ money(payment.total) }}</strong></div>
        <div class="flex justify-between pt-4 font-bold"><span>Total recebido no período filtrado</span><span>{{ money(sum(received)) }}</span></div>
      </section>
      <p class="text-xs text-slate-500 mt-5 report-footnote">Relatório de entradas da plataforma. Os totais refletem os filtros acima e não representam saldo bancário. Lançamentos cancelados não compõem os totais recebidos ou a receber.</p>
    </article>
  </main>
</template>

<style scoped>
.action { display:flex; align-items:center; gap:8px; padding:12px 16px; border-radius:12px; font-size:13px; font-weight:600; }
.action:disabled { opacity:.45; cursor:not-allowed; }.primary { background:#4f46e5; color:white; }.secondary { background:white; border:1px solid #e2e8f0; }
.filter-label { display:flex; flex-direction:column; gap:8px; font-size:12px; font-weight:600; color:#475569; }
.filter-label input,.filter-label select { min-height:42px; border:1px solid #cbd5e1; border-radius:8px; padding:8px 12px; background:white; color:#0f172a; font:inherit; }
.summary-card { padding:24px; border-radius:16px; }.statement-table { font-size:12px; min-width:850px; }
.statement-table th { padding:16px; color:#64748b; text-transform:uppercase; font-size:10px; letter-spacing:.06em; border-bottom:1px solid #e2e8f0; }
.statement-table td { padding:16px; vertical-align:top; }.entry-row td { border-bottom:1px solid #f1f5f9; }.entry-row:hover { background:#fafbff; }
.entry-row td>span:not(.status-pill),.entry-row small { display:block; margin-top:4px; color:#64748b; }.entry-row small { font-size:10px; overflow-wrap:anywhere; }.entry-note { max-width:360px; }
.day-heading { background:#f1f5f9; color:#334155; font-size:12px; }.day-heading td { padding:12px 16px; }.amount { text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; }
.status-pill { display:inline-block; padding:4px 8px; border-radius:6px; font-size:10px; white-space:nowrap; }.received { background:#ecfdf5; color:#047857; }.pending { background:#fffbeb; color:#92400e; }.cancelled { background:#f1f5f9; color:#64748b; }.print-only { display:none; }
@media print {
  @page { size:A4 landscape; margin:12mm; }
  :global(body:has(#financial-report)) { background:white!important; }
  :global(body:has(#financial-report) #app > div) { display:block!important; }
  :global(body:has(#financial-report) #app > div > aside), :global(body:has(#financial-report) nav), :global(body:has(#financial-report) header) { display:none!important; }
  :global(body:has(#financial-report) #app > div > div) { margin:0!important; display:block!important; }
  .screen-only { display:none!important; }.print-only { display:block; }.finance-page { padding:0; max-width:none; }
  .summary-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }.summary-card { padding:12px; background:white!important; color:black!important; border:1px solid #aaa; border-radius:0; }
  .summary-card p { color:black!important; }.summary-card .text-3xl { font-size:20px; }.statement-wrap { overflow:visible; border-radius:0; }.statement-table { min-width:0; width:100%; font-size:10px; }
  .statement-table th,.statement-table td { padding:8px; }.statement-table thead { display:table-header-group; }.entry-row { break-inside:avoid; }.day-heading { break-after:avoid; }
  .statement-table td,.statement-table th { color:black!important; }.status-pill { background:none; border:1px solid #aaa; color:black; }.payment-summary { break-inside:avoid; border-radius:0; }.report-heading { break-after:avoid; }.report-footnote { font-size:9px; }
}
</style>
