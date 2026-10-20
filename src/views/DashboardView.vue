<script setup>
import { computed, onMounted, ref } from 'vue'
import { RefreshCw, ArrowUpRight, ShoppingBag, Users, Package, TrendingUp, Loader2, Truck } from 'lucide-vue-next'
const API = import.meta.env.VITE_API_URL || '/api'
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const start = ref(today.slice(0, 8) + '01'), end = ref(today), preset = ref('month')
const data = ref(null), loading = ref(false), error = ref(''), catalogErrors = ref([])
const catalogs = ref({ produtos: null, clientes: null, profissionais: null })
const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const count = value => value == null ? '—' : Number(value).toLocaleString('pt-BR')
const percent = value => `${Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
const dateLabel = value => value?.split('-').reverse().join('/')
const colors = ['#6366f1', '#f59e0b', '#f43f5e', '#94a3b8']
const fetchJson = async url => {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 30000)
  try { const response = await fetch(url, { signal: controller.signal }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return await response.json() } finally { clearTimeout(timeout) }
}
const load = async () => {
  const days = (Date.parse(end.value) - Date.parse(start.value)) / 86400000 + 1
  if (!start.value || !end.value || !Number.isFinite(days) || days < 1 || days > 366) { error.value = 'Selecione um período válido de até 366 dias.'; return }
  loading.value = true; error.value = ''; data.value = null; catalogErrors.value = []
  const results = await Promise.allSettled([fetchJson(`${API}/dashboard?start=${start.value}&end=${end.value}`), ...['produtos', 'clientes', 'profissionais'].map(resource => fetchJson(`${API}/${resource}`))])
  if (results[0].status === 'fulfilled') data.value = results[0].value
  else error.value = 'Não foi possível carregar os indicadores. Confira a conexão e tente atualizar.'
  ;['produtos', 'clientes', 'profissionais'].forEach((resource, i) => {
    const result = results[i + 1]
    catalogs.value[resource] = result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : null
    if (!catalogs.value[resource]) catalogErrors.value.push(resource)
  })
  loading.value = false
}
const choose = value => {
  preset.value = value; end.value = today
  if (value === 'month') start.value = today.slice(0, 8) + '01'
  else { const date = new Date(`${today}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - (value === '7' ? 6 : 29)); start.value = date.toISOString().slice(0, 10) }
  load()
}
const change = computed(() => data.value?.previous.revenue ? (data.value.revenue / data.value.previous.revenue - 1) * 100 : null)
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const professionalCount = types => catalogs.value.profissionais ? catalogs.value.profissionais.filter(p => types.includes(normalize(p.tipo))).length : null
const inventory = computed(() => [
  { label: 'Produtos', total: catalogs.value.produtos?.length, icon: Package, path: '/produtos' },
  { label: 'Clientes', total: catalogs.value.clientes?.length, icon: Users, path: '/clientes' },
  { label: 'Fornecedores', total: professionalCount(['fornecedor']), icon: Package, path: '/profissionais' },
  { label: 'Transportadoras', total: professionalCount(['transportadora']), icon: Truck, path: '/profissionais' },
  { label: 'Revendedores', total: professionalCount(['revendedor']), icon: Users, path: '/profissionais' },
  { label: 'Vendedores / representantes', total: professionalCount(['vendedor', 'representante']), icon: Users, path: '/profissionais' },
  { label: 'Afiliados', total: professionalCount(['afiliado']), icon: Users, path: '/profissionais' },
  { label: 'Participantes (total)', total: catalogs.value.profissionais?.length, icon: Users, path: '/profissionais' }
])
const series = computed(() => {
  const source = data.value?.series || []
  if (source.length <= 31) return source
  const result = new Map()
  for (const point of source) { const key = point.date.slice(0, 7); if (!result.has(key)) result.set(key, { date: key, revenue: 0, orders: 0 }); const p = result.get(key); p.revenue += point.revenue; p.orders += point.orders }
  return [...result.values()]
})
const maxRevenue = computed(() => Math.max(1, ...series.value.map(p => p.revenue)))
const maxOrders = computed(() => Math.max(1, ...series.value.map(p => p.orders)))
const pointX = index => 50 + index * 620 / Math.max(1, series.value.length - 1)
const line = computed(() => series.value.map((p, i) => `${pointX(i)},${220 - p.revenue / maxRevenue.value * 170}`).join(' '))
const area = computed(() => series.value.length ? `${pointX(0)},220 ${line.value} ${pointX(series.value.length - 1)},220` : '')
const ticks = computed(() => [...new Set([0, Math.floor((series.value.length - 1) / 2), series.value.length - 1])].filter(i => i >= 0))
const seriesLabel = value => value.length === 7 ? value.split('-').reverse().join('/') : value.slice(5).split('-').reverse().join('/')
const doughnut = computed(() => {
  let offset = 0
  return (data.value?.statuses || []).map((item, i) => { const share = data.value.orders ? item.count / data.value.orders * 100 : 0; const segment = { ...item, share, offset, color: colors[i] }; offset += share; return segment })
})
const familyFilter = ref('*'), cohortStatus = ref('all'), familyPage = ref(1), cohortPage = ref(1)
const efficiency = computed(() => data.value?.familyEfficiency)
const familyRows = computed(() => (efficiency.value?.families || []).filter(f => familyFilter.value === '*' || f.key === familyFilter.value))
const cohortRows = computed(() => (efficiency.value?.cohorts || []).filter(c => (familyFilter.value === '*' || c.familyKey === familyFilter.value) && (cohortStatus.value === 'all' || c.completed === (cohortStatus.value === 'completed'))))
const familyPages = computed(() => Math.max(1, Math.ceil(familyRows.value.length / 10)))
const cohortPages = computed(() => Math.max(1, Math.ceil(cohortRows.value.length / 10)))
const efficiencyLabel = value => value == null ? '—' : percent(value)
const instantLabel = value => value ? new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—'
const resetPages = () => { familyPage.value = 1; cohortPage.value = 1 }
onMounted(load)
</script>

<template>
  <main class="dash p-4 md:p-8 max-w-[1600px] mx-auto text-slate-800">
    <header class="flex flex-wrap justify-between gap-5 items-start mb-7"><div><p class="eyebrow">Visão gerencial</p><h1 class="text-3xl font-bold mt-2 tracking-tight">Seu negócio em números<span class="text-indigo-500">.</span></h1><p class="text-sm text-slate-500 mt-2">Vendas, relacionamento e desempenho do catálogo.</p></div><RouterLink to="/pedidos" class="flex items-center gap-2 text-sm font-semibold text-indigo-600 py-2">Consultar pedidos <ArrowUpRight class="w-4 h-4" /></RouterLink></header>
    <form @submit.prevent="resetPages(); load()" class="panel flex flex-wrap gap-3 items-end mb-6">
      <div class="flex gap-1 bg-slate-100 p-1 rounded-xl"><button v-for="option in [{ id: '7', label: '7 dias' }, { id: '30', label: '30 dias' }, { id: 'month', label: 'Este mês' }]" :key="option.id" type="button" :disabled="loading" @click="resetPages(); choose(option.id)" :aria-pressed="preset === option.id" class="px-3 py-2 rounded-lg text-xs font-semibold" :class="preset === option.id ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'">{{ option.label }}</button></div>
      <label class="text-xs text-slate-500">De<input v-model="start" @change="preset = 'custom'" :disabled="loading" type="date" required class="date-input"></label><label class="text-xs text-slate-500">Até<input v-model="end" @change="preset = 'custom'" :disabled="loading" type="date" required class="date-input"></label>
      <button :disabled="loading" class="bg-indigo-600 text-white rounded-xl px-4 py-3 text-xs font-semibold flex gap-2 items-center disabled:opacity-50"><RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" /> Atualizar análise</button>
      <span v-if="data" class="text-xs text-slate-400 ml-auto">Atualizado às {{ new Date(data.updatedAt).toLocaleTimeString('pt-BR') }}</span>
    </form>
    <div v-if="error" role="alert" class="p-4 bg-red-50 text-red-700 rounded-xl mb-5">{{ error }}</div>
    <div v-if="loading" role="status" class="panel flex justify-center gap-3 py-20"><Loader2 class="animate-spin text-indigo-500" /> Preparando indicadores e cadastros...</div>
    <template v-else-if="data">
      <p class="text-xs text-slate-500 mb-4">Análise: {{ dateLabel(data.start) }} a {{ dateLabel(data.end) }} · Comparação: {{ dateLabel(data.previous.start) }} a {{ dateLabel(data.previous.end) }}</p>
      <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        <section class="metric featured"><div class="flex justify-between"><span>Vendas realizadas</span><TrendingUp class="w-5 h-5 opacity-70" /></div><strong>{{ money(data.revenue) }}</strong><small v-if="change !== null">{{ change >= 0 ? '+' : '' }}{{ percent(change) }} sobre o período anterior</small><small v-else>Sem base de vendas no período anterior</small></section>
        <section class="metric"><div class="flex justify-between"><span>Pedidos no período</span><ShoppingBag class="w-5 h-5 text-indigo-500" /></div><strong>{{ count(data.orders) }}</strong><small>{{ count(data.paid) }} pagos · {{ percent(data.orders ? data.paid / data.orders * 100 : 0) }} dos pedidos</small></section>
        <section class="metric"><div class="flex justify-between"><span>Ticket médio</span><TrendingUp class="w-5 h-5 text-emerald-500" /></div><strong>{{ money(data.ticket) }}</strong><small>Total das vendas ÷ pedidos pagos</small></section>
        <section class="metric"><div class="flex justify-between"><span>Unidades vendidas</span><Package class="w-5 h-5 text-amber-500" /></div><strong>{{ count(data.units) }}</strong><small>{{ count(data.buyers) }} compradores no período</small></section>
      </div>
      <div class="flex justify-between items-center mb-3"><h2 class="text-sm font-bold">Base de relacionamento e catálogo</h2><span class="text-xs text-slate-400">Cadastros atuais · independente do período</span></div>
      <p v-if="catalogErrors.length" role="status" class="text-sm text-amber-700 mb-3">Consulta indisponível: {{ catalogErrors.join(', ') }}. Indicadores sem dados aparecem como —.</p>
      <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-7"><RouterLink v-for="item in inventory" :key="item.label" :to="item.path" class="inventory-card"><component :is="item.icon" class="w-4 h-4 text-indigo-500 mb-3" /><strong class="text-xl">{{ count(item.total) }}</strong><span class="text-xs text-slate-500 mt-1 block">{{ item.label }}</span></RouterLink></div>
      <div v-if="!data.orders" class="bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-xl p-4 mb-6 text-sm">Nenhum pedido registrado neste período. Selecione outro intervalo para analisar o histórico.</div>
      <div class="grid xl:grid-cols-3 gap-5 mb-5">
        <section class="panel xl:col-span-2"><h2>Evolução das vendas</h2><p class="subtitle">Receita dos pedidos pagos · {{ data.series.length > 31 ? 'agrupamento mensal' : 'agrupamento diário' }}</p>
          <svg viewBox="0 0 720 260" class="w-full" role="img" aria-label="Gráfico de área da receita de pedidos pagos"><defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6366f1" stop-opacity=".25" /><stop offset="100%" stop-color="#6366f1" stop-opacity=".01" /></linearGradient></defs><g v-for="n in [0, 1, 2, 3]" :key="n"><line x1="50" x2="680" :y1="220 - n * 170 / 3" :y2="220 - n * 170 / 3" stroke="#e2e8f0" stroke-dasharray="4 4" /><text x="3" :y="224 - n * 170 / 3" class="axis">{{ (maxRevenue * n / 3).toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }) }}</text></g><polygon :points="area" fill="url(#revenue-fill)" /><polyline :points="line" fill="none" stroke="#6366f1" stroke-width="3" /><circle v-for="(p, i) in series" :key="p.date" :cx="pointX(i)" :cy="220 - p.revenue / maxRevenue * 170" r="4" fill="#6366f1"><title>{{ p.date }}: {{ money(p.revenue) }}</title></circle><text v-for="i in ticks" :key="i" :x="pointX(i)" y="247" text-anchor="middle" class="axis">{{ seriesLabel(series[i].date) }}</text></svg>
        </section>
        <section class="panel"><h2>Situação dos pedidos</h2><p class="subtitle">Distribuição por quantidade</p><div class="relative w-44 h-44 mx-auto my-4"><svg viewBox="0 0 120 120" class="w-full" role="img" aria-label="Distribuição dos pedidos por situação"><circle cx="60" cy="60" r="45" stroke="#f1f5f9" stroke-width="12" fill="none" /><circle v-for="segment in doughnut" :key="segment.name" cx="60" cy="60" r="45" pathLength="100" fill="none" :stroke="segment.color" stroke-width="12" :stroke-dasharray="`${segment.share} ${100 - segment.share}`" :stroke-dashoffset="-segment.offset" transform="rotate(-90 60 60)"><title>{{ segment.name }}: {{ segment.count }}</title></circle></svg><div class="absolute inset-0 flex flex-col justify-center items-center pointer-events-none"><strong class="text-3xl">{{ count(data.orders) }}</strong><span class="text-xs text-slate-400">pedidos</span></div></div><div v-for="segment in doughnut" :key="segment.name" class="flex justify-between text-xs py-2"><span><i class="dot" :style="{ background: segment.color }" />{{ segment.name }}</span><strong>{{ segment.count }} <span class="font-normal text-slate-400">· {{ percent(segment.share) }}</span></strong></div></section>
      </div>
      <div class="grid lg:grid-cols-2 gap-5 mb-5">
        <section class="panel"><h2>Produtos mais vendidos</h2><p class="subtitle">Top 5 por unidades · apenas pedidos pagos</p><p v-if="!data.topProducts.length" class="empty">Sem itens vendidos no período.</p><div v-for="(p, i) in data.topProducts" :key="p.key" class="my-5"><div class="flex justify-between gap-4 text-sm mb-2"><span class="truncate"><b class="text-indigo-400 mr-2">{{ i + 1 }}.</b>{{ p.name }}</span><strong class="whitespace-nowrap">{{ count(p.quantity) }} un.</strong></div><div class="bar-track"><div :style="{ width: `${data.topProducts[0].quantity > 0 ? p.quantity / data.topProducts[0].quantity * 100 : 0}%` }" class="bg-indigo-500 h-full rounded-full" /></div><p class="text-xs text-slate-400 mt-1">Ref. {{ p.key }} · {{ money(p.revenue) }}</p></div></section>
        <section class="panel"><h2>Clientes que mais compram</h2><p class="subtitle">Top 5 por valor de pedidos pagos</p><p v-if="!data.topCustomers.length" class="empty">Sem compradores no período.</p><div v-for="(customer, i) in data.topCustomers" :key="i" class="flex items-center gap-3 py-4 border-b border-slate-100 last:border-0"><span class="rounded-xl bg-emerald-50 text-emerald-700 w-9 h-9 flex items-center justify-center font-bold text-sm">{{ i + 1 }}</span><div class="flex-1 min-w-0"><p class="text-sm font-semibold truncate">{{ customer.name }}</p><p class="text-xs text-slate-400">{{ customer.orders }} pedido(s)</p></div><strong class="text-sm">{{ money(customer.revenue) }}</strong></div></section>
        <section class="panel"><h2>Volume de pedidos</h2><p class="subtitle">Todos os status · {{ data.series.length > 31 ? 'por mês' : 'por dia' }}</p><svg viewBox="0 0 720 240" class="w-full" role="img" aria-label="Gráfico de colunas de quantidade de pedidos"><line x1="45" x2="685" y1="205" y2="205" stroke="#e2e8f0" /><g v-for="(p, i) in series" :key="p.date"><rect :x="45 + i * 630 / series.length" :y="205 - p.orders / maxOrders * 165" :width="Math.max(2, 630 / series.length - 5)" :height="p.orders / maxOrders * 165" rx="3" fill="#14b8a6"><title>{{ p.date }}: {{ p.orders }} pedidos</title></rect></g><text x="5" y="45" class="axis">{{ maxOrders }}</text><text v-for="i in ticks" :key="i" :x="45 + (i + .5) * 630 / series.length" y="229" text-anchor="middle" class="axis">{{ seriesLabel(series[i].date) }}</text></svg></section>
        <section class="panel"><h2>Formas de pagamento</h2><p class="subtitle">Valores registrados nos pedidos pagos</p><p v-if="!data.payments.length" class="empty">Sem pagamentos no período.</p><div v-for="(payment, i) in data.payments" :key="payment.name" class="mt-5"><div class="flex justify-between text-sm mb-2"><span>{{ payment.name }}</span><strong>{{ money(payment.value) }}</strong></div><div class="bar-track"><div class="h-full rounded-full" :style="{ width: `${data.revenue > 0 ? payment.value / data.revenue * 100 : 0}%`, background: colors[i % colors.length] }" /></div></div></section>
      </div>
      <section class="panel mb-6" aria-labelledby="family-heading">
        <div class="flex flex-wrap justify-between items-start gap-4 mb-4">
          <div><p class="eyebrow">Desempenho das referências publicadas</p><h2 id="family-heading" class="mt-2">Eficiência por família</h2><p class="subtitle">Unidades vendidas ÷ unidades de entrada × 100 · pedidos pagos registrados no sistema</p></div>
          <label v-if="efficiency?.available" class="text-xs text-slate-500">Família<select v-model="familyFilter" @change="resetPages" class="block border rounded-lg p-2 mt-2"><option value="*">Todas as famílias</option><option v-for="f in efficiency.families" :key="f.key" :value="f.key">{{ f.name }}</option></select></label>
        </div>
        <p v-if="!efficiency?.available" role="alert" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{{ efficiency?.message || 'Análise por família indisponível.' }}</p>
        <template v-else>
          <div class="rounded-xl bg-indigo-50 p-4 text-xs leading-6 text-indigo-900 mb-5">
            <p><b>Global:</b> saldo inicial e entradas observadas desde {{ instantLabel(efficiency.startedAt) }}, comparados às vendas até {{ instantLabel(efficiency.asOf) }}.</p>
            <p><b>Coortes:</b> entradas iniciadas de {{ dateLabel(start) }} a {{ dateLabel(end) }}, acompanhadas por sete dias corridos. Coortes em andamento ainda têm resultado parcial.</p>
          </div>
          <p class="text-xs text-amber-800 bg-amber-50 rounded-xl p-4 leading-6 mb-5">A integração atual consulta saldos e não importa movimentações de estoque. Aumentos de saldo são registrados nas consultas automáticas enquanto o servidor está ativo; entradas e saídas entre consultas podem não aparecer. O saldo inicial não abre coorte, pois sua data real de entrada é desconhecida. Republicar uma referência não reinicia o ciclo. Produtos sem família ficam identificados abaixo.</p>
          <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr><th>Família</th><th>Base global (un.)</th><th>Vendidas global</th><th>Eficiência global</th><th>Entradas coortes</th><th>Vendidas em 7 dias</th><th>Eficiência coortes</th><th>Diferença</th></tr></thead><tbody>
            <tr v-for="f in familyRows.slice((familyPage - 1) * 10, familyPage * 10)" :key="f.key"><td class="font-semibold">{{ f.name }}<small class="block text-slate-400 font-normal">{{ count(f.baseline) }} un. de saldo inicial</small><small v-if="f.cohortEntered" class="block text-slate-400 font-normal">{{ f.active }} em andamento · {{ f.completed }} encerrada(s)</small></td><td>{{ count(f.entered) }}</td><td>{{ count(f.sold) }}</td><td class="font-semibold text-indigo-600">{{ efficiencyLabel(f.efficiency) }}</td><td>{{ count(f.cohortEntered) }}</td><td>{{ count(f.cohortSold) }}</td><td class="font-semibold">{{ efficiencyLabel(f.cohortEfficiency) }}<small v-if="f.active" class="block text-amber-700 font-normal">Parcial</small></td><td :class="f.difference > 0 ? 'text-emerald-700' : f.difference < 0 ? 'text-rose-700' : ''">{{ f.difference == null ? '—' : `${f.difference > 0 ? '+' : ''}${Number(f.difference).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.` }}</td></tr>
            <tr v-if="!familyRows.length"><td colspan="8" class="empty">Nenhuma entrada de produto publicado no e-commerce foi registrada para esta família.</td></tr>
          </tbody></table></div>
          <div v-if="familyPages > 1" class="flex justify-end gap-4 text-xs mt-4 items-center"><button :disabled="familyPage <= 1" @click="familyPage--" class="disabled:opacity-30">Anterior</button><span>{{ familyPage }} / {{ familyPages }}</span><button :disabled="familyPage >= familyPages" @click="familyPage++" class="disabled:opacity-30">Próxima</button></div>
          <div class="flex flex-wrap justify-between items-center gap-3 mt-8 mb-3"><div><h3 class="font-semibold text-sm">Coortes de sete dias</h3><p class="subtitle">Cada publicação ou reposição observada abre uma entrada; a comparação acima agrupa as entradas da mesma família.</p></div><label class="text-xs text-slate-500">Situação<select v-model="cohortStatus" @change="cohortPage = 1" class="border rounded-lg p-2 ml-2"><option value="all">Todas</option><option value="active">Em andamento</option><option value="completed">Encerradas</option></select></label></div>
          <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr><th>Família / referência</th><th>Entrada</th><th>Fim dos 7 dias</th><th>Unidades de entrada</th><th>Vendidas em 7 dias</th><th>Eficiência</th><th>Situação</th></tr></thead><tbody>
            <tr v-for="c in cohortRows.slice((cohortPage - 1) * 10, cohortPage * 10)" :key="c.id"><td class="font-semibold">{{ c.family }}<small class="block text-slate-400 font-normal">Ref. {{ c.reference }} · {{ c.source === 'publication' ? 'Publicação' : 'Aumento de saldo' }}</small></td><td>{{ instantLabel(c.at) }}</td><td>{{ instantLabel(c.endsAt) }}</td><td>{{ count(c.entered) }}</td><td>{{ count(c.sold) }}</td><td class="font-semibold text-indigo-600">{{ efficiencyLabel(c.efficiency) }}</td><td><span class="rounded-lg px-2 py-1 text-xs" :class="c.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'">{{ c.completed ? 'Encerrada' : 'Em andamento' }}</span></td></tr>
            <tr v-if="!cohortRows.length"><td colspan="7" class="empty">Nenhuma coorte neste filtro. Novas referências publicadas com estoque e reposições observadas iniciarão ciclos de sete dias.</td></tr>
          </tbody></table></div>
          <div v-if="cohortPages > 1" class="flex justify-end gap-4 text-xs mt-4 items-center"><button :disabled="cohortPage <= 1" @click="cohortPage--" class="disabled:opacity-30">Anterior</button><span>{{ cohortPage }} / {{ cohortPages }}</span><button :disabled="cohortPage >= cohortPages" @click="cohortPage++" class="disabled:opacity-30">Próxima</button></div>
          <p v-if="efficiency.unmatchedUnits" role="status" class="mt-4 text-xs text-amber-800">{{ count(efficiency.unmatchedUnits) }} unidade(s) vendida(s) sem entrada correspondente no histórico não foram usadas nas taxas. Confira as entradas de estoque.</p>
          <p v-if="efficiency.legacyPaidOrders" class="mt-3 text-xs text-slate-500">{{ count(efficiency.legacyPaidOrders) }} pedido(s) legado(s) sem data de pagamento não entram na eficiência por família.</p>
        </template>
      </section>
      <details class="text-xs text-slate-500 bg-slate-100 rounded-xl p-4 leading-6"><summary class="cursor-pointer font-semibold">Como interpretar os indicadores</summary><p class="mt-2">Período pela data de criação do pedido, no horário de Brasília. Vendas realizadas consideram apenas status Pago; Enviado legado entra em Outros. O total de vendas inclui frete. Rankings de produtos usam o valor dos itens, sem ratear frete ou desconto do pedido. A eficiência por família usa a data de confirmação do pagamento e pedidos pagos registrados no sistema desde o início do acompanhamento. Vendas são atribuídas às entradas mais antigas da referência (FIFO), sem duplicar unidades entre coortes. Vendas após sete dias continuam na visão global, mas não entram no resultado semanal. O histórico mantém a família da entrada; famílias inicialmente vazias são preenchidas quando o ERP informar o cadastro. Cadastros refletem as listas retornadas pela origem ativa e não são filtrados por período.</p><p>Atendimentos do PDV que ainda não foram persistidos como pedidos não entram nesta análise. Vendas registradas somente no ERP não entram nas taxas por família. O painel não representa saldo bancário ou lucro. {{ data.excludedDates ? `${data.excludedDates} pedido(s) sem data válida foram excluídos.` : '' }}</p></details>
    </template>
  </main>
</template>

<style scoped>
.panel { background:white; border:1px solid #e2e8f0; border-radius:18px; padding:22px; }.panel h2 { font-weight:700; font-size:16px; }.subtitle { color:#94a3b8; font-size:12px; margin-top:5px; margin-bottom:12px; }.eyebrow { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.18em; color:#6366f1; }
.date-input { display:block; border:1px solid #e2e8f0; border-radius:10px; padding:9px; margin-top:4px; color:#334155; background:white; }.metric { padding:24px; border:1px solid #e2e8f0; border-radius:18px; background:white; }.metric span { font-size:12px; font-weight:600; }.metric strong { display:block; font-size:28px; margin:18px 0 8px; letter-spacing:-.04em; font-variant-numeric:tabular-nums; }.metric small { font-size:11px; color:#64748b; }.featured { background:linear-gradient(125deg,#312e81,#6366f1); color:white; border:0; }.featured small { color:#c7d2fe; }.inventory-card { border:1px solid #e2e8f0; border-radius:14px; padding:16px; background:white; }.inventory-card:hover { border-color:#a5b4fc; }.axis { font-size:11px; fill:#94a3b8; }.dot { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:8px; }.bar-track { height:8px; background:#f1f5f9; border-radius:20px; overflow:hidden; }.empty { padding:35px 10px; color:#94a3b8; text-align:center; font-size:13px; }.class-tag { display:inline-block; padding:3px 9px; border-radius:6px; margin-right:8px; font-size:11px; }.class-A { background:#eef2ff; color:#4f46e5; }.class-B { background:#ecfdf5; color:#047857; }.class-C { background:#fff7ed; color:#c2410c; }th { text-align:left; color:#94a3b8; font-size:10px; text-transform:uppercase; padding:12px; background:#f8fafc; }td { padding:14px 12px; border-bottom:1px solid #f1f5f9; font-variant-numeric:tabular-nums; }button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible { outline:2px solid #6366f1; outline-offset:3px; }
</style>
