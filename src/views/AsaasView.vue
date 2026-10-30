<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RefreshCw, Plus, X, Loader2 } from 'lucide-vue-next'
const API = (import.meta.env.VITE_API_URL || '/api') + '/asaas'
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const operationId = () => globalThis.crypto?.randomUUID?.() || ('op_' + Date.now().toString(36) + '_' + Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)), n => n.toString(36)).join(''))
const tab = ref('grid'), page = ref(1), rows = ref([]), total = ref(0), more = ref(false)
const summary = ref(null), loading = ref(false), summaryLoading = ref(false), error = ref(''), notice = ref('')
const filters = ref({ status: '', billingType: '', name: '', start: '', end: '' })
const customer = ref(null), subscription = ref('')
const tabs = { grid: 'Clientes e cobranças', payments: 'Cobranças', customers: 'Clientes', subscriptions: 'Recorrências', invoices: 'Notas fiscais', transactions: 'Extrato' }
const statuses = { PENDING: 'Pendente', RECEIVED: 'Recebido', CONFIRMED: 'Confirmado · a liberar', OVERDUE: 'Vencido', REFUNDED: 'Estornado', RECEIVED_IN_CASH: 'Recebido em dinheiro', REFUND_REQUESTED: 'Estorno solicitado', REFUND_IN_PROGRESS: 'Estorno em andamento', CHARGEBACK_REQUESTED: 'Chargeback solicitado', CHARGEBACK_DISPUTE: 'Chargeback em disputa', AWAITING_RISK_ANALYSIS: 'Em análise', ACTIVE: 'Ativa', INACTIVE: 'Inativa', EXPIRED: 'Expirada', SCHEDULED: 'Agendada', AUTHORIZED: 'Autorizada', PROCESSING_CANCELLATION: 'Cancelamento em processamento', CANCELED: 'Cancelada', CANCELLATION_DENIED: 'Cancelamento recusado', ERROR: 'Erro' }
const billing = { PIX: 'Pix', BOLETO: 'Boleto', CREDIT_CARD: 'Cartão de crédito', UNDEFINED: 'Cliente escolhe' }
const cycles = { WEEKLY: 'Semanal', BIWEEKLY: 'Quinzenal', MONTHLY: 'Mensal', BIMONTHLY: 'Bimestral', QUARTERLY: 'Trimestral', SEMIANNUALLY: 'Semestral', YEARLY: 'Anual' }
const money = v => v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const date = v => v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—'
const status = v => statuses[v] || v || '—'
const safeUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : null } catch { return null } }
async function api(path, options = {}) {
  const token = JSON.parse(localStorage.getItem('usuario') || '{}').accessToken
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 120000)
  try {
    const res = await fetch(API + path, { ...options, signal: controller.signal, headers: { Authorization: `Bearer ${token || ''}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || `Falha (${res.status})`)
    return data
  } catch (e) { if (e.name === 'AbortError') throw new Error('Tempo excedido. Atualize a lista e confira a operação antes de repetir.'); throw e }
  finally { clearTimeout(timer) }
}
const gridFilters = ref({ customerStart: '', customerEnd: '', purchased: '', search: '', account: '', invoiceStatus: '' })
const columnFilters = ref({}), gridSort = ref({ key: 'customerCreated', direction: 'desc' }), gridWarnings = ref([]), gridUpdatedAt = ref(null), autoRefresh = ref(true)
const gridColumns = [
  ['customer', 'Cliente / atividade'], ['customerCreated', 'Cadastro do cliente'], ['chargeCreated', 'Data da cobrança'], ['source', 'Origem'], ['charge', 'Cobrança'], ['payment', 'Pagamento'], ['activity', 'Atividade da fatura'], ['account', 'Conta'], ['invoice', 'Nota fiscal']
]
function gridQuery(q, force) {
  for (const [key, value] of Object.entries(gridFilters.value)) if (value) q.set(key, value)
  for (const [key, value] of Object.entries(columnFilters.value)) if (value) q.set('column.' + key, value)
  q.set('sortBy', gridSort.value.key); q.set('sortDirection', gridSort.value.direction)
  if (filters.value.start) q.set('dueStart', filters.value.start)
  if (filters.value.end) q.set('dueEnd', filters.value.end)
  if (force) q.set('refresh', 'true')
}
function sortGrid(key) { gridSort.value = { key, direction: gridSort.value.key === key && gridSort.value.direction === 'asc' ? 'desc' : 'asc' }; page.value = 1; loadRows() }
function applyGrid() { page.value = 1; loadRows() }
function gridToday() { gridFilters.value.customerStart = today; gridFilters.value.customerEnd = today; applyGrid() }
function clearGrid() { gridFilters.value = { customerStart: '', customerEnd: '', purchased: '', search: '', account: '', invoiceStatus: '' }; columnFilters.value = {}; filters.value = { status: '', billingType: '', name: '', start: '', end: '' }; customer.value = null; subscription.value = ''; applyGrid() }
const activeInvoice = row => row.invoices.find(i => i.status !== 'CANCELED')
function invoiceForRow(row) { if (row.paymentData) open('invoice', row.paymentData); else { customer.value = row.customerData; open('invoice') } }
let filterTimer
function scheduleGrid() { clearTimeout(filterTimer); filterTimer = setTimeout(applyGrid, 450) }
let generation = 0
async function loadRows(force = false) {
  const current = ++generation
  loading.value = true; error.value = ''
  const q = new URLSearchParams({ page: String(page.value) })
  if (tab.value === 'grid') gridQuery(q, force)
  if (tab.value === 'customers') { if (filters.value.name) q.set('name', filters.value.name) }
  else if (tab.value !== 'transactions') {
    if (customer.value) q.set('customer', customer.value.id)
    if (filters.value.status) q.set('status', filters.value.status)
    if (filters.value.billingType && tab.value !== 'invoices') q.set('billingType', filters.value.billingType)
    if (['grid', 'payments'].includes(tab.value) && subscription.value) q.set('subscription', subscription.value)
  }
  const keys = tab.value === 'transactions' ? ['startDate', 'finishDate'] : tab.value === 'invoices' ? ['effectiveDate[ge]', 'effectiveDate[le]'] : ['dueDate[ge]', 'dueDate[le]']
  if (['transactions', 'invoices', 'payments'].includes(tab.value)) {
    if (filters.value.start) q.set(keys[0], filters.value.start)
    if (filters.value.end) q.set(keys[1], filters.value.end)
  }
  try { const d = await api(`/${tab.value}?${q}`); if (current === generation) { rows.value = d.data || []; total.value = d.totalCount || 0; more.value = d.hasMore === true; if (tab.value === 'grid') { gridWarnings.value = d.warnings || []; gridUpdatedAt.value = d.updatedAt } } }
  catch (e) { if (current === generation) { error.value = e.message; rows.value = [] } }
  finally { if (current === generation) loading.value = false }
}
async function loadSummary() { summaryLoading.value = true; try { summary.value = await api('/overview') } catch (e) { error.value = e.message } finally { summaryLoading.value = false } }
const refresh = () => Promise.all([loadRows(true), loadSummary()])
function changeTab(key, preset = {}) { tab.value = key; page.value = 1; subscription.value = preset.subscription || ''; filters.value = { status: '', billingType: '', name: '', start: '', end: '', ...preset }; loadRows() }
function charges(c) { customer.value = c; changeTab('grid') }
function shortcut(state, start = '', end = '') { customer.value = null; changeTab('payments', { status: state, start, end }) }
const cards = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { name: 'Saldo disponível', value: s.balance?.balance, hint: 'Saldo atual' },
    { name: 'A vencer hoje', value: s.today?.value, hint: 'Pendentes por vencimento', click: () => shortcut('PENDING', s.dates.today, s.dates.today) },
    { name: 'Próximos 7 dias', value: s.week?.value, hint: 'Inclui hoje', click: () => shortcut('PENDING', s.dates.today, s.dates.weekEnd) },
    { name: 'Até o fim do mês', value: s.month?.value, hint: 'A partir de hoje', click: () => shortcut('PENDING', s.dates.today, s.dates.monthEnd) },
    { name: 'Em atraso', value: s.overdue?.value, hint: `${s.overdue?.quantity ?? '—'} cobranças vencidas`, click: () => shortcut('OVERDUE') },
    { name: 'Total pendente', value: s.pending?.value, hint: 'Todos os vencimentos', click: () => shortcut('PENDING') },
    { name: 'Confirmado a liberar', value: s.confirmed?.netValue, hint: 'Valor líquido confirmado', click: () => shortcut('CONFIRMED') },
    { name: 'Cobranças recebidas no mês', value: s.cashFlow?.paymentsReceived, hint: 'Recebimentos no extrato' },
    { name: 'Entradas no mês', value: s.cashFlow?.inflow, hint: 'Todos os créditos' },
    { name: 'Saídas no mês', value: s.cashFlow?.outflow, hint: 'Todos os débitos' },
    { name: 'Movimento líquido no mês', value: s.cashFlow?.net, hint: 'Créditos menos débitos' },
    { name: 'Recebido acumulado', value: s.received?.value, hint: 'Status Recebido' }
  ]
})
const flowMax = computed(() => Math.max(1, ...(summary.value?.dailyCashFlow || []).flatMap(p => [p.inflow, p.outflow])))
const modal = ref(null), form = ref({}), busy = ref(false), modalError = ref(''), requestId = ref('')
const search = ref(''), customers = ref([]), serviceSearch = ref(''), services = ref([])
function open(kind, row = null, edit = false) {
  modal.value = { kind, row, edit }; modalError.value = ''; requestId.value = operationId(); customers.value = []; services.value = []
  search.value = row?.customerData?.name || customer.value?.name || ''
  if (kind === 'charge') form.value = { customer: row?.id || customer.value?.id || '', billingType: 'PIX', value: '', dueDate: today, description: '', recurring: tab.value === 'subscriptions', cycle: 'MONTHLY' }
  if (kind === 'customer') form.value = row ? { ...row } : { name: '', cpfCnpj: '', email: '', mobilePhone: '', postalCode: '', address: '', addressNumber: '', province: '' }
  if (kind === 'paymentEdit') form.value = { value: row.value, dueDate: row.dueDate, description: row.description || '' }
  if (kind === 'subscriptionEdit') form.value = { customer: row.customer, billingType: row.billingType, value: row.value, dueDate: row.nextDueDate, cycle: row.cycle, description: row.description || '' }
  if (kind === 'invoice') form.value = { customer: row?.customer || customer.value?.id || '', payment: row?.id || '', value: row?.value || '', effectiveDate: today, serviceDescription: row?.description || '', municipalServiceId: '', municipalServiceCode: '', municipalServiceName: '', deductions: 0, retainIss: false, iss: '', cofins: '', csll: '', inss: '', ir: '', pis: '', observations: '' }
  if (kind === 'invoice' && edit) {
    form.value = { ...form.value, ...row, payment: row.payment || '', customer: row.customer || '', ...row.taxes }
  }
}
async function findCustomers() { try { customers.value = (await api('/customers?' + new URLSearchParams({ name: search.value }))).data } catch (e) { modalError.value = e.message } }
async function findServices() { try { services.value = (await api('/services?' + new URLSearchParams({ description: serviceSearch.value }))).data; if (!services.value.length) modalError.value = 'Nenhum serviço encontrado. Informe o código e o nome conforme seu cadastro fiscal.' } catch (e) { modalError.value = e.message } }
async function save() {
  if (busy.value) return
  busy.value = true; modalError.value = ''
  const { kind, row } = modal.value
  let endpoint, method = 'POST', body = { ...form.value }
  if (kind === 'customer') { endpoint = '/customers' + (row ? '/' + row.id : ''); if (row) method = 'PUT' }
  if (kind === 'charge') { endpoint = body.recurring ? '/subscriptions' : '/payments'; if (body.recurring) { body.nextDueDate = body.dueDate; delete body.dueDate } else delete body.cycle; delete body.recurring }
  if (kind === 'paymentEdit') { endpoint = '/payments/' + row.id; method = 'PUT' }
  if (kind === 'subscriptionEdit') { endpoint = '/subscriptions/' + row.id; method = 'PUT'; body.nextDueDate = body.dueDate; delete body.dueDate }
  if (kind === 'invoice') {
    endpoint = '/invoices' + (modal.value.edit ? '/' + row.id : ''); if (modal.value.edit) method = 'PUT'; body.taxes = { ...(modal.value.edit ? row.taxes : {}), retainIss: body.retainIss }; delete body.retainIss
    for (const key of ['iss', 'cofins', 'csll', 'inss', 'ir', 'pis']) {
      if (body[key] === '' || body[key] == null) { busy.value = false; modalError.value = 'Informe todas as alíquotas, inclusive zero quando aplicável.'; return }
      body.taxes[key] = Number(body[key]); delete body[key]
    }
    if (body.payment) delete body.customer
    if (body.municipalServiceId) delete body.municipalServiceCode; else delete body.municipalServiceId
  }
  try {
    const result = await api(endpoint, { method, body: JSON.stringify(body), headers: { 'X-Request-Id': requestId.value } })
    notice.value = kind === 'invoice' ? `Nota ${result.id} ${modal.value.edit ? 'atualizada' : 'agendada'}. Acompanhe a autorização.` : `Operação concluída: ${result.id || 'sucesso'}.`
    modal.value = null; await refresh()
  } catch (e) { modalError.value = e.message }
  finally { busy.value = false }
}
const detail = ref(null)
async function action(kind, row) {
  const options = {
    payment: ['Excluir esta cobrança no Asaas?', 'DELETE', '/payments/' + row.id],
    subscription: ['Cancelar a recorrência? Confira também as cobranças já geradas.', 'DELETE', '/subscriptions/' + row.id],
    authorize: ['Solicitar emissão desta NFS-e agora?', 'POST', '/invoices/' + row.id + '/authorize'],
    cancel: ['Solicitar cancelamento desta NFS-e?', 'POST', '/invoices/' + row.id + '/cancel']
  }
  const [question, method, endpoint] = options[kind]
  if (busy.value || !window.confirm(question)) return
  busy.value = true; error.value = ''
  try { await api(endpoint, { method, headers: { 'X-Request-Id': operationId() } }); notice.value = 'Solicitação enviada. Confira o status atualizado.'; await refresh() }
  catch (e) { error.value = e.message } finally { busy.value = false }
}
async function pix(row) { busy.value = true; try { detail.value = { title: 'Pix · ' + row.id, pix: await api('/payments/' + row.id + '/pix') } } catch (e) { error.value = e.message } finally { busy.value = false } }
const title = computed(() => ({ charge: 'Gerar cobrança', customer: modal.value?.row ? 'Editar cliente' : 'Cadastrar cliente Asaas', paymentEdit: 'Editar cobrança', subscriptionEdit: 'Editar recorrência', invoice: modal.value?.edit ? 'Editar nota fiscal de serviço' : 'Agendar nota fiscal de serviço' })[modal.value?.kind])
const statusOptions = computed(() => tab.value === 'invoices' ? ['SCHEDULED', 'AUTHORIZED', 'CANCELED', 'ERROR', 'PROCESSING_CANCELLATION', 'CANCELLATION_DENIED'] : tab.value === 'subscriptions' ? ['ACTIVE', 'INACTIVE', 'EXPIRED'] : ['PENDING', 'OVERDUE', 'RECEIVED', 'CONFIRMED', 'REFUNDED', 'RECEIVED_IN_CASH', 'AWAITING_RISK_ANALYSIS', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE'])
const columns = computed(() => ({
  customers: [['name','Cliente'],['cpfCnpj','CPF/CNPJ'],['email','E-mail'],['mobilePhone','Celular'],['dateCreated','Cadastro']],
  payments: [['customerName','Cliente'],['customerCreated','Cadastro do cliente'],['description','Descrição'],['value','Valor'],['netValue','Líquido'],['status','Status'],['billingType','Tipo'],['dateCreated','Cadastro'],['dueDate','Vencimento'],['paymentDate','Pagamento'],['estimatedCreditDate','Crédito previsto'],['recurring','Recorrente']],
  subscriptions: [['customerName','Cliente'],['description','Descrição'],['value','Valor'],['status','Status'],['billingType','Tipo'],['cycle','Periodicidade'],['dateCreated','Cadastro'],['nextDueDate','Próximo vencimento']],
  invoices: [['customerName','Cliente'],['number','Número'],['serviceDescription','Serviço'],['value','Valor'],['status','Status'],['effectiveDate','Emissão prevista'],['statusDescription','Retorno fiscal']],
  transactions: [['date','Data'],['description','Descrição'],['type','Tipo'],['value','Valor'],['balance','Saldo após']]
})[tab.value])
function cell(row, key) {
  if (key === 'customerName') return row.customerData?.name || row.customer || '—'
  if (key === 'customerCreated') return date(row.customerData?.dateCreated)
  if (key === 'recurring') return row.subscription ? 'Sim' : 'Não'
  if (['value', 'netValue', 'balance'].includes(key)) return money(row[key])
  if (key === 'status') return status(row[key])
  if (key === 'billingType') return billing[row[key]] || row[key]
  if (key === 'cycle') return cycles[row[key]] || row[key]
  if (/Date$/.test(key) || ['dateCreated', 'date'].includes(key)) return date(row[key])
  return row[key] || '—'
}
const links = row => [['invoiceUrl','Fatura'],['bankSlipUrl','Boleto'],['transactionReceiptUrl','Comprovante'],['pdfUrl','PDF'],['xmlUrl','XML']].filter(([key]) => safeUrl(row[key]))
let refreshTimer
onMounted(() => {
  refresh()
  refreshTimer = setInterval(() => { if (autoRefresh.value && tab.value === 'grid' && !loading.value && !busy.value && !modal.value && !detail.value && document.visibilityState === 'visible') loadRows(true) }, 60000)
})
onUnmounted(() => { clearInterval(refreshTimer); clearTimeout(filterTimer) })
</script>

<template>
  <main class="p-4 md:p-8 max-w-[1800px] mx-auto text-slate-800">
    <header class="flex flex-wrap justify-between items-center gap-4 mb-6"><div><p class="text-xs font-bold uppercase tracking-widest text-indigo-500">Financeiro / Asaas</p><h1 class="text-3xl font-bold mt-2">Visão financeira da conta</h1><p class="text-sm text-slate-500 mt-2">Recebimentos, clientes, cobranças e serviços fiscais.</p></div><button class="primary" :disabled="loading || summaryLoading" @click="refresh"><RefreshCw class="w-4 h-4" :class="{ 'animate-spin': summaryLoading }" /> Atualizar conta</button></header>
    <p v-if="error" role="alert" class="alert error mb-4">{{ error }}</p><p v-if="notice" role="status" class="alert success mb-4">{{ notice }} <button @click="notice = ''" aria-label="Fechar aviso" class="float-right">×</button></p>
    <p v-if="summaryLoading && !summary" class="alert mb-4">Consultando saldo e indicadores...</p>
    <details class="mb-5"><summary class="cursor-pointer text-sm font-semibold text-indigo-700 mb-4">Resumo financeiro e fluxo de caixa da conta</summary>
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4"><component :is="card.click ? 'button' : 'section'" v-for="card in cards" :key="card.name" class="bg-white border border-slate-200 rounded-2xl p-4 text-left" :class="card.click ? 'hover:border-indigo-400' : ''" @click="card.click?.()"><p class="text-xs text-slate-500">{{ card.name }}</p><strong class="block text-xl md:text-2xl my-2">{{ money(card.value) }}</strong><span class="text-xs text-slate-400">{{ card.hint }}</span></component></div>
    <p class="text-xs text-slate-500 leading-6 mb-5">Previsões por vencimento consideram cobranças pendentes já emitidas; atraso aparece separadamente. A data de crédito pode ser posterior ao vencimento. Recorrências futuras ainda não geradas não compõem a previsão. Movimentações do mês incluem taxas, transferências e estornos. <span v-if="summary">Atualizado: {{ new Date(summary.updatedAt).toLocaleString('pt-BR') }}.</span></p>
    <div v-if="summary?.warnings?.length" role="status" class="alert mb-5">Algumas consultas estão indisponíveis. Valores ausentes aparecem como —.<p v-for="w in summary.warnings" :key="w.section">{{ w.section }}: {{ w.message }}</p></div>
    <section v-if="summary?.dailyCashFlow" class="bg-white border border-slate-200 rounded-2xl p-5 mb-5">
      <h2 class="font-bold">Fluxo de caixa do mês</h2><p class="text-xs text-slate-500 mt-1">Entradas e saídas registradas no extrato, por dia.</p>
      <svg viewBox="0 0 900 180" class="w-full max-h-60 mt-4" role="img" aria-label="Entradas e saídas diárias no mês"><line x1="30" x2="880" y1="150" y2="150" stroke="#cbd5e1" /><g v-for="(p, i) in summary.dailyCashFlow" :key="p.date"><rect :x="30 + i * 850 / summary.dailyCashFlow.length" :y="150 - p.inflow / flowMax * 125" :width="Math.max(2, 850 / summary.dailyCashFlow.length / 2 - 2)" :height="p.inflow / flowMax * 125" fill="#059669"><title>{{ date(p.date) }}: entradas {{ money(p.inflow) }}</title></rect><rect :x="30 + (i + .5) * 850 / summary.dailyCashFlow.length" :y="150 - p.outflow / flowMax * 125" :width="Math.max(2, 850 / summary.dailyCashFlow.length / 2 - 2)" :height="p.outflow / flowMax * 125" fill="#e11d48"><title>{{ date(p.date) }}: saídas {{ money(p.outflow) }}</title></rect><text v-if="i % 5 === 0 || i === summary.dailyCashFlow.length - 1" :x="30 + (i + .5) * 850 / summary.dailyCashFlow.length" y="172" text-anchor="middle" font-size="10" fill="#64748b">{{ p.date.slice(8) }}</text></g></svg>
      <p class="text-xs"><span class="text-emerald-700 mr-5">● Entradas</span><span class="text-rose-600">● Saídas</span></p>
    </section>
    </details>
    <section class="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <nav class="flex overflow-x-auto gap-1 border-b p-3" aria-label="Seções Asaas"><button v-for="(label, key) in tabs" :key="key" @click="changeTab(key)" class="px-4 py-3 rounded-xl text-sm whitespace-nowrap" :class="tab === key ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500'">{{ label }}</button></nav>
      <form v-if="tab === 'grid'" @submit.prevent="applyGrid" class="registry-filters">
        <div class="period-controls">
          <label>Cadastro de<input type="date" v-model="gridFilters.customerStart" /></label>
          <label>Cadastro até<input type="date" v-model="gridFilters.customerEnd" :min="gridFilters.customerStart" /></label>
          <button class="primary" :disabled="loading">Consultar período</button><button type="button" class="secondary" @click="gridToday">Hoje</button>
          <fieldset class="purchase-filter"><legend>Possui cobrança?</legend><label><input type="radio" v-model="gridFilters.purchased" value="" @change="applyGrid" /> Todos</label><label><input type="radio" v-model="gridFilters.purchased" value="yes" @change="applyGrid" /> Sim</label><label><input type="radio" v-model="gridFilters.purchased" value="no" @change="applyGrid" /> Não</label></fieldset>
          <div class="ml-auto flex gap-2"><button type="button" class="secondary" @click="open('customer')">Novo cliente</button><button type="button" class="primary" @click="open('charge')"><Plus class="w-4 h-4" /> Gerar cobrança</button></div>
        </div>
        <p class="registry-help">O período filtra a data de cadastro do cliente, independentemente da data da cobrança. “Possui cobrança” inclui cobranças abertas. {{ autoRefresh ? 'Atualização automática a cada 60 segundos.' : 'Atualização automática desativada.' }}</p>
        <div class="registry-search">
          <label class="search-field">Buscar cliente ou cobrança<input v-model="gridFilters.search" @input="scheduleGrid" placeholder="Nome, CPF/CNPJ, e-mail, descrição ou referência" /></label>
          <label>Pagamento<select v-model="filters.status" @change="applyGrid"><option value="">Todos</option><option v-for="s in ['PENDING', 'OVERDUE', 'CONFIRMED', 'RECEIVED', 'REFUNDED', 'RECEIVED_IN_CASH', 'AWAITING_RISK_ANALYSIS', 'CHARGEBACK_REQUESTED']" :key="s" :value="s">{{ status(s) }}</option></select></label>
          <label>Conta<select v-model="gridFilters.account" @change="applyGrid"><option value="">Todas</option><option value="active">Cadastro ativo</option><option value="deleted">Cadastro excluído</option><option value="unknown">Cadastro indisponível</option></select></label>
          <label>Nota fiscal<select v-model="gridFilters.invoiceStatus" @change="applyGrid"><option value="">Todas</option><option value="none">Sem nota vinculada</option><option value="AUTHORIZED">Autorizada</option><option value="SCHEDULED">Agendada</option><option value="ERROR">Erro</option><option value="CANCELED">Cancelada</option></select></label>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500"><button type="button" class="text-indigo-600" @click="clearGrid">Limpar filtros</button><label class="check"><input type="checkbox" v-model="autoRefresh" /> Atualizar automaticamente</label><span v-if="gridUpdatedAt">Atualizado: {{ new Date(gridUpdatedAt).toLocaleTimeString('pt-BR') }}</span></div>
        <p v-for="warning in gridWarnings" :key="warning" role="status" class="alert">{{ warning }}</p>
      </form>
      <form v-if="tab !== 'grid'" @submit.prevent="page = 1; loadRows()" class="flex flex-wrap gap-3 items-end p-5 border-b">
        <label v-if="tab === 'customers'">Nome do cliente<input v-model="filters.name" placeholder="Buscar no Asaas" /></label>
        <label v-if="['payments', 'invoices', 'subscriptions'].includes(tab)">Status<select v-model="filters.status"><option value="">Todos</option><option v-for="s in statusOptions" :key="s" :value="s">{{ status(s) }}</option></select></label>
        <label v-if="['payments', 'subscriptions'].includes(tab)">Tipo de cobrança<select v-model="filters.billingType"><option value="">Todos</option><option v-for="(name, key) in billing" :key="key" :value="key">{{ name }}</option></select></label>
        <template v-if="['payments', 'invoices', 'transactions'].includes(tab)"><label>{{ tab === 'payments' ? 'Vencimento de' : tab === 'invoices' ? 'Emissão de' : 'Movimento de' }}<input type="date" v-model="filters.start" /></label><label>Até<input type="date" v-model="filters.end" :min="filters.start" /></label></template>
        <button class="secondary" :disabled="loading">Filtrar</button>
        <button v-if="tab === 'customers'" type="button" class="primary ml-auto" @click="open('customer')"><Plus class="w-4 h-4" /> Novo cliente</button>
        <button v-if="['payments', 'subscriptions'].includes(tab)" type="button" class="primary ml-auto" @click="open('charge')"><Plus class="w-4 h-4" /> {{ tab === 'subscriptions' ? 'Nova recorrência' : 'Gerar cobrança' }}</button>
        <button v-if="tab === 'invoices'" type="button" class="primary ml-auto" @click="open('invoice')"><Plus class="w-4 h-4" /> Gerar NFS-e</button>
      </form>
      <div v-if="customer && tab !== 'transactions'" class="px-5 py-3 bg-indigo-50 text-indigo-800 text-sm">Cliente: {{ customer.name }} <span v-if="subscription">· Assinatura {{ subscription }}</span><button class="ml-4 underline" @click="customer = null; subscription = ''; page = 1; loadRows()">Limpar recorte</button></div>
      <div v-if="loading" role="status" class="p-16 text-center text-slate-500"><Loader2 class="animate-spin w-6 h-6 mx-auto mb-3" />Consultando Asaas...</div>
      <div v-else-if="tab === 'grid'" class="registry-scroll">
        <table class="registry-table"><thead><tr><th v-for="[key, label] in gridColumns" :key="key"><button class="column-sort" @click="sortGrid(key)">{{ label }} <span aria-hidden="true">{{ gridSort.key === key ? (gridSort.direction === 'asc' ? '↑' : '↓') : '↕' }}</span></button><input v-model="columnFilters[key]" @input="scheduleGrid" @keydown.enter.prevent="applyGrid" :aria-label="'Filtrar ' + label" placeholder="Filtrar..." /></th><th>Ações</th></tr></thead>
          <tbody><tr v-for="r in rows" :key="r.id">
            <td class="registry-client"><button class="client-name" @click="detail = { title: r.customerData.name, data: r.customerData }">{{ r.customerData.name }}</button><small>{{ r.customerData.cpfCnpj || 'Documento não informado' }}</small><small>{{ r.customerData.email }}</small><span class="activity-line">Cliente cadastrado no Asaas</span><span class="activity-line">{{ r.paymentData ? 'Cobrança criada' : 'Sem cobrança cadastrada' }}</span></td>
            <td>{{ date(r.customerCreated) }}</td><td>{{ date(r.chargeCreated) }}</td>
            <td><span class="tag neutral">{{ r.source }}</span><small v-if="r.paymentData?.externalReference">{{ r.paymentData.externalReference }}</small></td>
            <td class="registry-charge"><template v-if="r.paymentData"><strong>{{ money(r.paymentData.value) }}</strong><small>{{ r.paymentData.description || r.paymentData.id }}</small><small>Vencimento: {{ date(r.paymentData.dueDate) }}</small><small>Líquido: {{ money(r.paymentData.netValue) }}</small><span v-if="r.recurring" class="tag neutral">Recorrente</span><small v-if="r.paymentData.installmentNumber">Parcela {{ r.paymentData.installmentNumber }}</small></template><span v-else class="muted">Sem cobrança</span></td>
            <td><template v-if="r.paymentData"><span class="tag" :class="['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(r.paymentData.status) ? 'positive' : r.paymentData.status === 'OVERDUE' ? 'negative' : 'pending'">{{ status(r.paymentData.status) }}</span><small>{{ billing[r.paymentData.billingType] || r.paymentData.billingType }}</small><small v-if="r.paymentData.paymentDate">Pago: {{ date(r.paymentData.paymentDate) }}</small><small v-if="r.paymentData.creditDate || r.paymentData.estimatedCreditDate">Crédito: {{ date(r.paymentData.creditDate || r.paymentData.estimatedCreditDate) }}</small></template><span v-else class="muted">Sem cobrança</span></td>
            <td><span class="tag neutral">{{ r.paymentData?.lastInvoiceViewedDate ? 'Fatura visualizada' : 'Sem registro de visualização' }}</span><small v-if="r.paymentData?.lastInvoiceViewedDate">{{ date(r.paymentData.lastInvoiceViewedDate) }}</small></td>
            <td><span class="tag" :class="r.customerData.deleted || r.customerData.unavailable ? 'neutral' : 'positive'">{{ r.account }}</span><small>{{ r.customerData.id }}</small></td>
            <td class="registry-invoices"><span v-if="!r.invoicesAvailable" class="tag neutral">Consulta indisponível</span><template v-else-if="r.invoices.length"><button v-for="i in r.invoices" :key="i.id" class="invoice-summary" @click="detail = { title: 'Nota fiscal ' + (i.number || i.id), data: i }"><span class="tag" :class="i.status === 'AUTHORIZED' ? 'positive' : i.status === 'ERROR' ? 'negative' : 'pending'">{{ status(i.status) }}</span><small>{{ i.number ? 'Nº ' + i.number : i.id }}</small></button></template><span v-else class="muted">{{ r.paymentData ? 'Pendente de emissão' : 'Sem nota vinculada' }}</span></td>
            <td class="registry-actions"><a v-if="safeUrl(r.paymentData?.invoiceUrl)" :href="safeUrl(r.paymentData.invoiceUrl)" target="_blank" rel="noopener noreferrer">↗ Cobrança</a><button v-if="r.invoicesAvailable && !activeInvoice(r)" class="invoice-button" @click="invoiceForRow(r)">Emitir NF</button><a v-for="i in r.invoices.filter(i => safeUrl(i.pdfUrl))" :key="i.id" :href="safeUrl(i.pdfUrl)" target="_blank" rel="noopener noreferrer">↗ Nota {{ i.number || 'PDF' }}</a>
              <details class="row-actions"><summary>Mais ações</summary><div><button @click="detail = { title: 'Cliente e cobrança', data: r }">Detalhes</button><button @click="open('charge', r.customerData)">Nova cobrança</button><button @click="open('customer', r.customerData)">Editar cliente</button><template v-if="r.paymentData"><button v-if="r.paymentData.billingType === 'PIX'" :disabled="busy" @click="pix(r.paymentData)">Pix</button><button v-if="['PENDING', 'OVERDUE'].includes(r.paymentData.status)" @click="open('paymentEdit', r.paymentData)">Editar cobrança</button><button v-if="['PENDING', 'OVERDUE'].includes(r.paymentData.status)" class="danger" :disabled="busy" @click="action('payment', r.paymentData)">Excluir cobrança</button></template><template v-for="i in r.invoices" :key="i.id"><button v-if="['SCHEDULED', 'ERROR'].includes(i.status)" @click="open('invoice', { ...i, customer: i.customer || r.customerData.id }, true)">Editar nota</button><button v-if="['SCHEDULED', 'ERROR'].includes(i.status)" :disabled="busy" @click="action('authorize', i)">Solicitar emissão</button></template></div></details>
            </td>
          </tr></tbody>
        </table><p v-if="!rows.length" class="text-center py-14 text-slate-400">Nenhum cliente ou cobrança encontrado neste recorte.</p>
      </div>
      <div v-else-if="tab !== 'grid'" class="overflow-x-auto"><table><thead><tr><th v-for="[key, label] in columns" :key="key">{{ label }}</th><th>Ações</th></tr></thead><tbody><tr v-for="r in rows" :key="r.id"><td v-for="[key] in columns" :key="key" :class="key === 'status' && r.status === 'OVERDUE' ? 'text-rose-600 font-bold' : ''">{{ cell(r, key) }}</td><td><div class="actions">
        <button @click="detail = { title: tabs[tab] + ' · ' + r.id, data: r }">Detalhes</button><a v-for="[key, label] in links(r)" :key="key" :href="safeUrl(r[key])" target="_blank" rel="noopener noreferrer">{{ label }} ↗</a>
        <template v-if="tab === 'customers'"><button @click="charges(r)">Cobranças e status</button><button @click="open('charge', r)">Gerar cobrança</button><button @click="customer = r; changeTab('invoices')">Notas fiscais</button><button @click="customer = r; open('invoice')">Gerar NFS-e</button><button @click="open('customer', r)">Editar</button></template>
        <template v-if="tab === 'payments'"><button v-if="r.billingType === 'PIX'" :disabled="busy" @click="pix(r)">Pix</button><button v-if="['PENDING', 'OVERDUE'].includes(r.status)" @click="open('paymentEdit', r)">Editar</button><button @click="open('invoice', r)">Gerar NFS-e</button><button v-if="['PENDING', 'OVERDUE'].includes(r.status)" :disabled="busy" @click="action('payment', r)" class="danger">Excluir</button></template>
        <template v-if="tab === 'subscriptions'"><button @click="customer = r.customerData || { id: r.customer, name: r.customer }; changeTab('payments', { subscription: r.id })">Cobranças</button><button @click="open('subscriptionEdit', r)">Editar</button><button v-if="r.status === 'ACTIVE'" :disabled="busy" @click="action('subscription', r)" class="danger">Cancelar</button></template>
        <template v-if="tab === 'invoices'"><button v-if="['SCHEDULED', 'ERROR'].includes(r.status)" @click="open('invoice', r, true)">Editar nota</button><button v-if="['SCHEDULED', 'ERROR'].includes(r.status)" :disabled="busy" @click="action('authorize', r)">Solicitar emissão</button><button v-if="['SCHEDULED', 'AUTHORIZED'].includes(r.status)" :disabled="busy" @click="action('cancel', r)" class="danger">Cancelar</button></template>
      </div></td></tr></tbody></table><p v-if="!rows.length" class="text-center py-14 text-slate-400">Nenhum registro encontrado neste recorte.</p></div>
      <footer class="p-5 border-t flex justify-between gap-3 items-center text-sm"><span>{{ total }} registros · 10 por página</span><div class="flex items-center gap-4"><button :disabled="page <= 1 || loading" @click="page--; loadRows()">Anterior</button><span>{{ page }} / {{ Math.max(1, Math.ceil(total / 10)) }}</span><button :disabled="!more || loading" @click="page++; loadRows()">Próxima</button></div></footer>
    </section>
    <p class="text-xs text-slate-500 mt-4">NFS-e exige configuração fiscal da conta, serviço municipal e impostos corretos. Agendamento não significa autorização. Use Atualizar conta para consultar o status no Asaas.</p>
    <div v-if="modal" class="modal-backdrop" @click.self="!busy && (modal = null)"><section role="dialog" aria-modal="true" aria-labelledby="asaas-form-title" class="modal"><header class="flex justify-between items-center mb-5"><h2 id="asaas-form-title" class="text-xl font-bold">{{ title }}</h2><button :disabled="busy" @click="modal = null" aria-label="Fechar"><X class="w-5 h-5" /></button></header><p v-if="modalError" role="alert" class="alert error mb-4">{{ modalError }}</p>
      <form @submit.prevent="save" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <template v-if="modal.kind === 'customer'"><label>Nome<input v-model="form.name" required /></label><label>CPF/CNPJ<input v-model="form.cpfCnpj" required /></label><label>E-mail<input v-model="form.email" type="email" /></label><label>Celular<input v-model="form.mobilePhone" /></label><label>CEP<input v-model="form.postalCode" /></label><label>Endereço<input v-model="form.address" /></label><label>Número<input v-model="form.addressNumber" /></label><label>Bairro<input v-model="form.province" /></label></template>
        <template v-else>
          <div v-if="['charge', 'invoice'].includes(modal.kind) && !form.payment" class="sm:col-span-2"><label>Cliente Asaas<div class="flex gap-2"><input v-model="search" placeholder="Buscar por nome" /><button type="button" class="secondary" @click="findCustomers">Buscar</button></div></label><p class="text-xs mt-1 text-slate-500">{{ form.customer ? 'Cliente selecionado: ' + form.customer : 'Busque e selecione o cliente ou cadastre-o na aba Clientes.' }}</p><div v-if="customers.length" class="border rounded-lg mt-2 max-h-40 overflow-y-auto"><button v-for="c in customers" :key="c.id" type="button" class="block w-full p-3 text-left text-sm hover:bg-indigo-50" @click="form.customer = c.id; search = c.name; customers = []">{{ c.name }} · {{ c.cpfCnpj }}</button></div></div>
          <label>Valor (R$)<input v-model="form.value" type="number" min="0.01" step="0.01" required /></label>
          <label>{{ modal.kind === 'invoice' ? 'Data da emissão' : 'Vencimento' }}<input v-if="modal.kind === 'invoice'" v-model="form.effectiveDate" type="date" required /><input v-else v-model="form.dueDate" type="date" required /></label>
          <template v-if="modal.kind !== 'invoice'"><label v-if="modal.kind !== 'paymentEdit'">Tipo de cobrança<select v-model="form.billingType"><option v-for="(name, key) in billing" :key="key" :value="key">{{ name }}</option></select></label><label class="sm:col-span-2">Descrição<textarea v-model="form.description" maxlength="500" /></label><label v-if="modal.kind === 'charge'" class="check"><input v-model="form.recurring" type="checkbox" /> Cobrança recorrente</label><label v-if="form.recurring || modal.kind === 'subscriptionEdit'">Periodicidade<select v-model="form.cycle"><option v-for="(name, key) in cycles" :key="key" :value="key">{{ name }}</option></select></label><p v-if="form.billingType === 'CREDIT_CARD'" class="sm:col-span-2 text-xs text-slate-500">O cliente informará o cartão no link de pagamento do Asaas.</p></template>
          <template v-else>
            <p v-if="form.payment" class="sm:col-span-2 text-sm text-indigo-700">Vinculada à cobrança {{ form.payment }}</p>
            <label class="sm:col-span-2">Descrição do serviço<textarea v-model="form.serviceDescription" required /></label>
            <div class="sm:col-span-2"><label>Buscar serviço municipal<div class="flex gap-2"><input v-model="serviceSearch" placeholder="Nome do serviço" /><button type="button" class="secondary" @click="findServices">Consultar</button></div></label><button v-for="s in services" :key="s.id" type="button" class="block p-2 text-left text-sm text-indigo-700" @click="form.municipalServiceId = s.id; form.municipalServiceCode = ''; form.municipalServiceName = s.description || s.name; services = []">{{ s.description || s.name }}</button><p v-if="form.municipalServiceId" class="text-xs mt-2">Serviço selecionado: {{ form.municipalServiceId }} <button type="button" class="underline" @click="form.municipalServiceId = ''">Usar código manual</button></p></div>
            <label v-if="!form.municipalServiceId">Código municipal / Portal Nacional<input v-model="form.municipalServiceCode" required /></label><label>Nome do serviço municipal<input v-model="form.municipalServiceName" required /></label><label>Deduções (R$)<input v-model="form.deductions" type="number" min="0" step="0.01" required /></label><label class="check"><input v-model="form.retainIss" type="checkbox" /> Reter ISS</label>
            <label v-for="tax in ['iss', 'cofins', 'csll', 'inss', 'ir', 'pis']" :key="tax">{{ tax.toUpperCase() }} (%)<input v-model="form[tax]" type="number" min="0" max="100" step="0.0001" required /></label><label class="sm:col-span-2">Observações<textarea v-model="form.observations" /></label>
          </template>
        </template>
        <footer class="sm:col-span-2 flex justify-end gap-3 border-t pt-4 mt-2"><button type="button" class="secondary" :disabled="busy" @click="modal = null">Fechar</button><button class="primary" :disabled="busy || (['charge', 'invoice'].includes(modal.kind) && !form.customer && !form.payment)"><Loader2 v-if="busy" class="w-4 h-4 animate-spin" />{{ busy ? 'Enviando...' : modal.kind === 'invoice' ? (modal.edit ? 'Salvar alterações da NFS-e' : 'Agendar NFS-e no Asaas') : 'Salvar no Asaas' }}</button></footer>
      </form>
    </section></div>
    <div v-if="detail" class="modal-backdrop" @click.self="detail = null"><section role="dialog" aria-modal="true" aria-label="Detalhes Asaas" class="modal"><header class="flex justify-between mb-5"><h2 class="text-xl font-bold">{{ detail.title }}</h2><button @click="detail = null" aria-label="Fechar"><X /></button></header><template v-if="detail.pix"><img :src="'data:image/png;base64,' + detail.pix.qrCode" alt="QR Code Pix" class="w-60 mx-auto" /><label>Pix copia e cola<textarea readonly :value="detail.pix.copyPaste" rows="4" class="mt-3" /></label></template><dl v-else class="divide-y"><div v-for="(value, key) in detail.data" :key="key" class="py-3"><dt class="text-xs font-bold text-slate-500">{{ key }}</dt><dd class="text-sm whitespace-pre-wrap break-words mt-1">{{ value == null ? '—' : typeof value === 'object' ? JSON.stringify(value, null, 2) : value }}</dd></div></dl></section></div>
  </main>
</template>
<style scoped>
.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;padding:.65rem 1rem;border-radius:.7rem;font-size:.8rem;font-weight:600}.primary{background:#4f46e5;color:white}.secondary{background:#f1f5f9;color:#475569}button:disabled{opacity:.45;cursor:not-allowed}label{display:block;font-size:.75rem;color:#64748b}input:not([type=checkbox]),select,textarea{display:block;width:100%;min-width:0;margin-top:.35rem;border:1px solid #cbd5e1;border-radius:.6rem;padding:.65rem;background:white;color:#0f172a;font-size:.85rem}label.check{display:flex;align-items:center;gap:.5rem;color:#334155}table{width:100%;text-align:left;font-size:.8rem}th{padding:1rem;white-space:nowrap;background:#f8fafc;font-size:.68rem;text-transform:uppercase;color:#64748b}td{padding:1rem;border-top:1px solid #f1f5f9;vertical-align:top}.actions{display:flex;flex-wrap:wrap;gap:.5rem;min-width:160px;color:#4f46e5;font-weight:600}.danger{color:#e11d48}.alert{background:#fffbeb;color:#92400e;border-radius:.8rem;padding:1rem;font-size:.85rem}.error{background:#fff1f2;color:#9f1239}.success{background:#ecfdf5;color:#065f46}.modal-backdrop{position:fixed;inset:0;z-index:150;background:#0f172a99;display:flex;align-items:center;justify-content:center;padding:1rem}.modal{background:white;border-radius:1.5rem;padding:1.5rem;width:100%;max-width:720px;max-height:92vh;overflow-y:auto}button:focus-visible,a:focus-visible{outline:2px solid #6366f1;outline-offset:3px}

.registry-filters{padding:1.1rem;background:#f8fafc;border-bottom:1px solid #e0e7ff}.period-controls{display:flex;flex-wrap:wrap;align-items:end;gap:.65rem}.period-controls>label{max-width:155px}.purchase-filter{display:flex;gap:.6rem;border:1px solid #dbe3f4;border-radius:.5rem;padding:.6rem;font-size:.7rem}.purchase-filter legend{padding:0 .2rem;color:#334155}.purchase-filter label{display:flex;align-items:center;gap:.25rem}.registry-help{font-size:.67rem;line-height:1.65;color:#7c8aab;margin:1rem 0 .8rem}.registry-search{display:grid;grid-template-columns:minmax(240px,1fr) 180px 155px 170px;gap:.7rem;margin-bottom:.85rem}.registry-search input,.registry-search select{font-size:.75rem;border-color:#dbe3f4}.registry-scroll{overflow:auto;max-height:76vh}.registry-table{min-width:1510px;font-size:.73rem;table-layout:fixed}.registry-table th{position:sticky;top:0;z-index:1;background:#f7f9ff;color:#7583a7;padding:.85rem .8rem;text-transform:none;font-weight:500;white-space:normal;border-bottom:1px solid #e0e7ff}.registry-table th:nth-child(1){width:195px}.registry-table th:nth-child(2),.registry-table th:nth-child(3){width:125px}.registry-table th:nth-child(4){width:100px}.registry-table th:nth-child(5){width:180px}.registry-table th:nth-child(6){width:145px}.registry-table th:nth-child(7){width:160px}.registry-table th:nth-child(8){width:150px}.registry-table th:nth-child(9){width:155px}.registry-table th:nth-child(10){width:130px}.column-sort{display:flex;align-items:center;justify-content:space-between;gap:.4rem;width:100%;text-align:left;font-size:.67rem;min-height:28px}.registry-table th input{font-size:.65rem;font-weight:400;border-color:#dbe3f4;border-radius:4px;padding:.4rem;background:white}.registry-table td{padding:1.1rem .8rem;line-height:1.6;border-color:#edf1fa;color:#23385d;overflow-wrap:anywhere}.registry-table tbody tr:hover{background:#fafbff}.client-name{color:#12366b;text-align:left;font-weight:650;text-transform:uppercase;line-height:1.5}.registry-table small{display:block;color:#8591ae;font-size:.63rem;line-height:1.7;margin-top:.25rem}.activity-line{display:block;font-size:.62rem;color:#7885cc;margin-top:.4rem}.registry-charge strong{font-size:.8rem;color:#133b75}.tag{display:inline-block;border-radius:4px;padding:.12rem .4rem;font-size:.62rem;line-height:1.6;max-width:100%}.positive{background:#e3f7ee;color:#008574}.negative{background:#fff0f0;color:#c03952}.pending{background:#fff6de;color:#9c6b13}.neutral{background:#edf1f7;color:#61708d}.muted{font-size:.7rem;color:#72809e}.invoice-summary{display:block;text-align:left;margin-bottom:.5rem}.registry-actions>a{display:block;color:#5c6bef;font-size:.68rem;margin-bottom:.7rem}.invoice-button{padding:.45rem .65rem;border:1px solid #dbe3f4;border-radius:6px;color:#6e7d9f;font-size:.67rem;background:white;margin-bottom:.65rem}.row-actions summary{font-size:.66rem;color:#64748b;cursor:pointer}.row-actions>div{display:flex;flex-direction:column;align-items:start;gap:.6rem;padding:.6rem 0;font-size:.68rem;color:#5364dd}.registry-filters input[type=radio],.registry-filters input[type=checkbox]{accent-color:#5267f7}@media(max-width:1000px){.registry-search{grid-template-columns:repeat(3,minmax(0,1fr))}.registry-search .search-field{grid-column:1/-1}}@media(max-width:600px){.registry-search{grid-template-columns:1fr}.registry-search .search-field{grid-column:auto}.period-controls .ml-auto{margin-left:0}}
</style>
