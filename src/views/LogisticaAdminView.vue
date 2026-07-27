<script setup>
import { ref, onMounted, computed } from 'vue'
import { Truck, MapPin, Search, ArrowUpRight, Activity, Pencil, X, Camera, Signature, ImagePlus, Save, ShieldAlert, FileCheck2 } from 'lucide-vue-next'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'
const entregas = ref([])
const loading = ref(true)
const saving = ref(false)
const searchQuery = ref('')
const selectedEntrega = ref(null)
const fotos = ref([])
const assinatura = ref(null)
const usuarioLogado = ref(JSON.parse(localStorage.getItem('usuario') || 'null'))
const form = ref({ status: '', tipo_evidencia: 'entrega', observacao: '' })
const statusOptions = ['Aguardando Profissional', 'Aceito - Em Coleta', 'Em Rota', 'Entregue', 'Não Entregue']
const hasAdminRole = computed(() => usuarioLogado.value?.tipo === 'Admin')
const isAdmin = computed(() => hasAdminRole.value && Boolean(usuarioLogado.value?.accessToken))
const statusCards = computed(() => statusOptions.map(status => ({
  status,
  total: entregas.value.filter(entrega => entrega.status === status).length
})))

const fetchMonitoramento = async () => {
  try {
    const res = await fetch(`${BASE_URL}/logistica/admin/monitoramento`)
    if (!res.ok) throw new Error('Não foi possível carregar o monitoramento.')
    entregas.value = await res.json()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const getStatusClasses = (status) => ({
  'Aguardando Profissional': 'bg-amber-100 text-amber-600 border border-amber-200',
  'Aceito - Em Coleta': 'bg-blue-100 text-blue-600 border border-blue-200',
  'Em Rota': 'bg-indigo-100 text-indigo-600 border border-indigo-200 animate-pulse',
  'Entregue': 'bg-emerald-100 text-emerald-600 border border-emerald-200',
  'Não Entregue': 'bg-rose-100 text-rose-600 border border-rose-200'
}[status] || 'bg-slate-100 text-slate-500')

const filteredEntregas = computed(() => entregas.value.filter(e =>
  e.cliente.nome.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
  e.numero_pedido.toString().includes(searchQuery.value)
).sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao)))

const openEditor = (entrega) => {
  if (!isAdmin.value) return
  selectedEntrega.value = entrega
  form.value = { status: entrega.status, tipo_evidencia: 'entrega', observacao: '' }
  fotos.value = []
  assinatura.value = null
}

const closeEditor = () => { selectedEntrega.value = null }
const selectFotos = (event) => { fotos.value = Array.from(event.target.files || []).slice(0, 5) }
const selectAssinatura = (event) => { assinatura.value = event.target.files?.[0] || null }

const saveDelivery = async () => {
  if (!selectedEntrega.value || !isAdmin.value) return
  saving.value = true
  try {
    const data = new FormData()
    data.append('status', form.value.status)
    data.append('tipo_evidencia', form.value.tipo_evidencia)
    data.append('observacao', form.value.observacao)
    fotos.value.forEach(file => data.append('fotos', file))
    if (assinatura.value) data.append('assinatura', assinatura.value)

    const res = await fetch(`${BASE_URL}/logistica/admin/entregas/${selectedEntrega.value.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${usuarioLogado.value?.accessToken || ''}` },
      body: data
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.message || 'Não foi possível salvar a entrega.')
    const index = entregas.value.findIndex(e => e.id === result.id)
    if (index >= 0) entregas.value[index] = result
    closeEditor()
  } catch (error) {
    alert(error.message)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchMonitoramento()
  setInterval(fetchMonitoramento, 15000)
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900">
    <main class="p-5 md:p-8">
      <div class="flex flex-col gap-5 md:flex-row md:justify-between md:items-end mb-8">
        <div>
          <h1 class="text-3xl font-black text-slate-800 uppercase italic tracking-tighter leading-none">Torre de</h1>
          <h1 class="text-3xl font-black text-indigo-600 uppercase italic tracking-tighter leading-none">Controle.</h1>
          <p v-if="hasAdminRole && !isAdmin" class="mt-3 inline-flex items-center gap-2 text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-3 py-2 rounded-xl"><ShieldAlert class="w-4 h-4" /> Sessão Admin expirada: saia e entre novamente</p>
          <p v-else-if="!hasAdminRole" class="mt-3 inline-flex items-center gap-2 text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-3 py-2 rounded-xl"><ShieldAlert class="w-4 h-4" /> Visualização: apenas Admin pode editar</p>
        </div>
        <div class="relative w-full md:w-64">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input v-model="searchQuery" placeholder="Buscar entrega..." class="w-full bg-white border border-slate-200 py-3 pl-10 pr-4 rounded-2xl text-xs outline-none focus:ring-4 ring-indigo-500/10">
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <div v-for="card in statusCards" :key="card.status" class="p-5 rounded-3xl border shadow-sm transition-all" :class="getStatusClasses(card.status)">
          <p class="text-[10px] font-black uppercase mb-3 flex items-center gap-2 opacity-80"><Activity class="w-3 h-3" /> {{ card.status }}</p>
          <h2 class="text-3xl font-black italic">{{ card.total }}</h2>
        </div>
      </div>

      <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[850px]">
            <thead><tr class="bg-slate-50/50 border-b border-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest"><th class="p-5">Pedido</th><th class="p-5">Destinatário</th><th class="p-5">Logística</th><th class="p-5">Status</th><th class="p-5">Evidências</th><th class="p-5 text-right">Ações</th></tr></thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="e in filteredEntregas" :key="e.id" class="hover:bg-slate-50/50">
                <td class="p-5"><span class="block font-black text-slate-800 italic">#{{ e.numero_pedido }}</span><span class="text-[9px] font-mono text-slate-300">{{ e.id }}</span></td>
                <td class="p-5"><p class="font-bold text-sm text-slate-700 uppercase">{{ e.cliente.nome }}</p><p class="text-[10px] text-slate-400 max-w-[210px] truncate">{{ e.cliente.endereco }}</p></td>
                <td class="p-5"><span v-if="e.profissional_id" class="text-xs font-bold text-slate-600 uppercase">{{ e.profissional_id }}</span><span v-else class="text-[10px] font-black text-amber-500 uppercase italic">Buscando...</span></td>
                <td class="p-5"><span :class="getStatusClasses(e.status)" class="px-3 py-2 rounded-2xl text-[9px] font-black uppercase whitespace-nowrap">{{ e.status }}</span></td>
                <td class="p-5"><span v-if="e.evidencias?.length" class="inline-flex items-center gap-2 text-[10px] font-black text-emerald-600"><FileCheck2 class="w-4 h-4" /> {{ e.evidencias.length }} anexo(s)</span><span v-else class="text-[10px] font-bold text-slate-300">Sem evidência</span></td>
                <td class="p-5 text-right"><button :disabled="!isAdmin" @click="openEditor(e)" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase" :class="isAdmin ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-300 cursor-not-allowed'"><Pencil class="w-3 h-3" /> Editar</button></td>
              </tr>
              <tr v-if="!loading && !filteredEntregas.length"><td colspan="6" class="p-10 text-center text-sm text-slate-400">Nenhuma entrega encontrada.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <div v-if="selectedEntrega" class="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6">
      <div class="absolute inset-0 bg-slate-900/60" @click="closeEditor"></div>
      <section class="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-[2rem] md:rounded-[2rem] p-6 md:p-8 shadow-2xl">
        <div class="flex justify-between gap-4 mb-6"><div><p class="text-[10px] font-black text-indigo-600 uppercase">Pedido #{{ selectedEntrega.numero_pedido }}</p><h2 class="text-2xl font-black text-slate-800">Atualizar rastreio</h2></div><button @click="closeEditor" class="p-2 text-slate-400"><X /></button></div>
        <div class="grid md:grid-cols-2 gap-4">
          <label class="text-[10px] font-black uppercase text-slate-400">Status<select v-model="form.status" class="mt-2 w-full bg-slate-50 p-4 rounded-xl text-sm font-bold outline-none"><option v-for="status in statusOptions" :key="status">{{ status }}</option></select></label>
          <label class="text-[10px] font-black uppercase text-slate-400">Tipo de evidência<select v-model="form.tipo_evidencia" class="mt-2 w-full bg-slate-50 p-4 rounded-xl text-sm font-bold outline-none"><option value="entrega">Entrega realizada</option><option value="nao_entrega">Não entrega / ocorrência</option></select></label>
        </div>
        <label class="block mt-4 text-[10px] font-black uppercase text-slate-400">Observação<textarea v-model="form.observacao" class="mt-2 w-full min-h-24 bg-slate-50 p-4 rounded-xl text-sm outline-none" placeholder="Descreva a entrega ou a ocorrência..."></textarea></label>
        <div class="grid md:grid-cols-2 gap-4 mt-4">
          <label class="cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center hover:border-indigo-300"><Camera class="w-6 h-6 mx-auto text-indigo-500 mb-2" /><span class="text-[10px] font-black uppercase text-slate-500">Fotos (até 5)</span><input type="file" accept="image/*" multiple class="hidden" @change="selectFotos"><p v-if="fotos.length" class="mt-2 text-[10px] text-indigo-600">{{ fotos.length }} foto(s) selecionada(s)</p></label>
          <label class="cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center hover:border-indigo-300"><Signature class="w-6 h-6 mx-auto text-indigo-500 mb-2" /><span class="text-[10px] font-black uppercase text-slate-500">Assinatura do cliente</span><input type="file" accept="image/*" class="hidden" @change="selectAssinatura"><p v-if="assinatura" class="mt-2 text-[10px] text-indigo-600 truncate">{{ assinatura.name }}</p></label>
        </div>
        <div v-if="selectedEntrega.evidencias?.length" class="mt-6 border-t pt-5"><p class="text-[10px] font-black uppercase text-slate-400 mb-3">Evidências anteriores</p><div v-for="ev in selectedEntrega.evidencias" :key="ev.id" class="mb-3 text-xs bg-slate-50 p-3 rounded-xl"><b>{{ ev.tipo }}</b> — {{ ev.observacao || 'Sem observação' }}<div class="flex gap-2 mt-2 flex-wrap"><img v-for="foto in ev.fotos" :key="foto" :src="`${BASE_URL}/uploads/logistica/${foto}`" class="w-14 h-14 object-cover rounded-lg"><img v-if="ev.assinatura" :src="`${BASE_URL}/uploads/logistica/${ev.assinatura}`" class="w-20 h-14 object-contain bg-white rounded-lg" title="Assinatura"></div></div></div>
        <button @click="saveDelivery" :disabled="saving" class="mt-6 w-full py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase text-xs disabled:opacity-60 flex justify-center items-center gap-2"><Save class="w-4 h-4" /> {{ saving ? 'Salvando...' : 'Salvar atualização' }}</button>
      </section>
    </div>
  </div>
</template>
