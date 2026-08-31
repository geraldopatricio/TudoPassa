<script setup>
import { computed, onMounted, ref } from 'vue'
import { Check, Database, Plug, Save, TestTube2, Loader2, ChevronDown, ChevronUp } from 'lucide-vue-next'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'
const providers = [
  { id: 'local', name: 'Padrão do sistema', group: 'Sistema', description: 'Usa os arquivos JSON locais atuais.' },
  { id: 'totvs', name: 'TOTVS Protheus / Logix', group: 'ERP', description: 'Clientes SA1, fornecedores SA2 e produtos SB1.' },
  { id: 'bling', name: 'Bling', group: 'ERP', description: 'Contatos, produtos, variações e estoque pela API v3.' },
  { id: 'omie', name: 'Omie', group: 'ERP', description: 'Clientes, fornecedores, produtos e famílias.' },
  { id: 'senior', name: 'Senior Sistemas', group: 'ERP', description: 'Integração com Senior X, ERP Senior ou Mega.' },
  { id: 'sap', name: 'SAP S/4HANA / Business One', group: 'ERP', description: 'Business Partners, Items e estruturas de produto.' },
  { id: 'rdstation', name: 'RD Station CRM', group: 'CRM', description: 'Contatos, organizações e catálogo de produtos.' },
  { id: 'ploomes', name: 'Ploomes', group: 'CRM', description: 'Contacts e Products via REST/OData.' },
  { id: 'salesforce', name: 'Salesforce / Sales Cloud', group: 'CRM', description: 'Accounts, Contacts, Product2 e Pricebook.' },
  { id: 'hubspot', name: 'HubSpot CRM', group: 'CRM', description: 'Contacts, Companies e Products pela API v3.' },
  { id: 'pipedrive', name: 'Pipedrive', group: 'CRM', description: 'Persons, Organizations e Products.' },
  { id: 'alpha', name: 'Alpha Sistemas', group: 'ERP', description: 'Clientes, representantes e produtos Alpha.' }
]
const emptyResource = () => ({ get: '', getOne: '', post: '', put: '', responsePath: '' })
const config = ref({ provider: 'local', enabled: false, cnpjEnrichment: true, credentials: {}, resources: { produtos: emptyResource(), clientes: emptyResource(), profissionais: { ...emptyResource(), tipo: 'representante' } } })
const saving = ref(false), testing = ref(false), message = ref(''), advanced = ref(false)
const selected = computed(() => providers.find(p => p.id === config.value.provider) || providers[0])

const choose = (id) => { config.value.provider = id; config.value.enabled = id !== 'local'; message.value = '' }
const load = async () => {
  const response = await fetch(`${BASE_URL}/integracoes`)
  if (!response.ok) throw new Error('Não foi possível carregar a configuração')
  config.value = await response.json()
}
const save = async () => {
  saving.value = true; message.value = ''
  try {
    const response = await fetch(`${BASE_URL}/integracoes`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config.value) })
    const data = await response.json(); if (!response.ok && !data.totals) throw new Error(data.message)
    config.value = data; message.value = 'Configuração salva com sucesso.'
  } catch (error) { message.value = error.message } finally { saving.value = false }
}
const test = async () => {
  testing.value = true; message.value = ''
  try {
    const response = await fetch(`${BASE_URL}/integracoes/testar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config.value) })
    const data = await response.json(); if (!response.ok) throw new Error(data.message)
    const total = (resource, label) => data.totals?.[resource]?.success
      ? `${data.totals[resource].total} ${label}`
      : `${label}: falhou`
    message.value = `Conexão realizada: ${total('clientes', 'clientes')}, ${total('produtos', 'produtos')} e ${total('profissionais', 'profissionais')}.`
  } catch (error) { message.value = `Falha no teste: ${error.message}` } finally { testing.value = false }
}
onMounted(() => load().catch(error => message.value = error.message))
</script>

<template>
  <div class="p-4 md:p-8 max-w-7xl mx-auto">
    <div class="mb-8">
      <p class="text-xs font-black uppercase tracking-widest text-indigo-600">Configurações</p>
      <h1 class="text-3xl font-black text-slate-900 mt-1">Integrações</h1>
      <p class="text-slate-500 mt-2">Escolha a origem dos produtos, clientes e fornecedores. As telas atuais continuam usando as mesmas rotas.</p>
    </div>

    <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <button v-for="provider in providers" :key="provider.id" @click="choose(provider.id)"
        class="relative text-left bg-white rounded-2xl border-2 p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
        :class="config.provider === provider.id ? 'border-indigo-600 shadow-indigo-100 shadow-lg' : 'border-slate-100'">
        <span class="inline-flex text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded-full" :class="provider.group === 'CRM' ? 'bg-sky-50 text-sky-600' : 'bg-indigo-50 text-indigo-600'">{{ provider.group }}</span>
        <Check v-if="config.provider === provider.id" class="absolute right-4 top-4 w-5 h-5 text-indigo-600" />
        <div class="flex gap-3 mt-4"><div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><Database v-if="provider.id === 'local'" class="w-5 h-5"/><Plug v-else class="w-5 h-5"/></div>
          <div><h2 class="font-black text-slate-800">{{ provider.name }}</h2><p class="text-xs text-slate-500 mt-1 leading-relaxed">{{ provider.description }}</p></div>
        </div>
      </button>
    </div>

    <section v-if="config.provider !== 'local'" class="mt-8 bg-white border border-slate-200 rounded-3xl p-5 md:p-7">
      <div class="flex items-center justify-between gap-4 mb-6"><div><h2 class="text-xl font-black text-slate-800">Conectar {{ selected.name }}</h2><p class="text-sm text-slate-500">Credenciais do .env têm prioridade; os valores preenchidos aqui são alternativas.</p></div>
        <label class="flex items-center gap-2 text-sm font-bold"><input v-model="config.cnpjEnrichment" type="checkbox" class="accent-indigo-600"> Completar CNPJ via BrasilAPI</label>
      </div>
      <div class="grid md:grid-cols-2 gap-4">
        <label class="text-xs font-bold text-slate-600">URL base<input v-model="config.credentials.baseUrl" placeholder="https://api.empresa.com" class="mt-2 w-full border border-slate-200 rounded-xl p-3 font-normal"></label>
        <label class="text-xs font-bold text-slate-600">Token / Bearer<input v-model="config.credentials.token" type="password" placeholder="Token de acesso" class="mt-2 w-full border border-slate-200 rounded-xl p-3 font-normal"></label>
        <label class="text-xs font-bold text-slate-600">API Key<input v-model="config.credentials.apiKey" type="password" :placeholder="config.provider === 'alpha' ? 'Usando X-Api-Key do .env' : 'Chave da API ou variável no .env'" class="mt-2 w-full border border-slate-200 rounded-xl p-3 font-normal"></label>
        <label class="text-xs font-bold text-slate-600">Client ID<input v-model="config.credentials.clientId" class="mt-2 w-full border border-slate-200 rounded-xl p-3 font-normal"></label>
        <label class="text-xs font-bold text-slate-600">Client Secret<input v-model="config.credentials.clientSecret" type="password" class="mt-2 w-full border border-slate-200 rounded-xl p-3 font-normal"></label>
        <label class="text-xs font-bold text-slate-600">Tipo dos profissionais<select v-model="config.resources.profissionais.tipo" class="mt-2 w-full border border-slate-200 rounded-xl p-3 font-normal"><option v-for="tipo in ['representante','revendedor','fornecedor','afiliado','vendedor','transportadora']" :key="tipo">{{ tipo }}</option></select></label>
      </div>
      <button @click="advanced = !advanced" class="mt-6 flex gap-2 items-center text-sm font-black text-indigo-600">Endpoints avançados <ChevronUp v-if="advanced" class="w-4"/><ChevronDown v-else class="w-4"/></button>
      <div v-if="advanced" class="mt-4 space-y-5">
        <div v-for="resource in ['produtos','clientes','profissionais']" :key="resource" class="bg-slate-50 rounded-2xl p-4">
          <h3 class="uppercase text-xs font-black tracking-wider text-slate-700 mb-3">{{ resource }}</h3>
          <div class="grid md:grid-cols-2 gap-3">
            <input v-model="config.resources[resource].get" placeholder="Endpoint GET (lista)" class="border border-slate-200 rounded-xl p-3 text-sm">
            <input v-model="config.resources[resource].getOne" placeholder="Endpoint GET por ID — use {id}" class="border border-slate-200 rounded-xl p-3 text-sm">
            <input v-model="config.resources[resource].post" placeholder="Endpoint POST (vazio = grava local)" class="border border-slate-200 rounded-xl p-3 text-sm">
            <input v-model="config.resources[resource].put" placeholder="Endpoint PUT — use {id} (vazio = local)" class="border border-slate-200 rounded-xl p-3 text-sm">
            <input v-model="config.resources[resource].responsePath" placeholder="Caminho da lista, ex.: itens ou data.items" class="border border-slate-200 rounded-xl p-3 text-sm md:col-span-2">
          </div>
        </div>
      </div>
    </section>

    <div class="sticky bottom-4 mt-6 bg-slate-900 text-white rounded-2xl p-4 flex flex-wrap gap-3 items-center shadow-xl">
      <p class="flex-1 text-sm"><strong>Ativo:</strong> {{ selected.name }} <span v-if="message" class="ml-3 text-indigo-200">{{ message }}</span></p>
      <button v-if="config.provider !== 'local'" @click="test" :disabled="testing" class="px-4 py-2 rounded-xl bg-white/10 font-bold text-sm flex gap-2"><Loader2 v-if="testing" class="w-4 animate-spin"/><TestTube2 v-else class="w-4"/> Testar</button>
      <button @click="save" :disabled="saving" class="px-5 py-2 rounded-xl bg-indigo-600 font-bold text-sm flex gap-2"><Loader2 v-if="saving" class="w-4 animate-spin"/><Save v-else class="w-4"/> Salvar</button>
    </div>
  </div>
</template>
