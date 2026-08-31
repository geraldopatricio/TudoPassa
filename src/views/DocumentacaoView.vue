<script setup>
import { computed, onMounted, ref } from 'vue'
import { BookOpen, ChevronRight, Copy, Check, Search, Server, Loader2 } from 'lucide-vue-next'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'
const spec = ref(null), selectedKey = ref(''), search = ref(''), copied = ref(false), error = ref('')
const methodOrder = ['get', 'post', 'put', 'patch', 'delete']
const methodColor = { get: 'bg-emerald-100 text-emerald-700', post: 'bg-blue-100 text-blue-700', put: 'bg-amber-100 text-amber-700', patch: 'bg-violet-100 text-violet-700', delete: 'bg-red-100 text-red-700' }

const operations = computed(() => {
  if (!spec.value) return []
  const list = []
  for (const [path, methods] of Object.entries(spec.value.paths || {})) {
    for (const method of methodOrder) if (methods[method]) list.push({ key: `${method}:${path}`, path, method, ...methods[method] })
  }
  return list
})
const groups = computed(() => {
  const query = search.value.toLowerCase().trim()
  const result = {}
  operations.value.filter(op => !query || `${op.path} ${op.summary} ${op.tags?.join(' ')}`.toLowerCase().includes(query)).forEach(op => {
    const tag = op.tags?.[0] || 'Outros'; (result[tag] ||= []).push(op)
  })
  return result
})
const selected = computed(() => operations.value.find(op => op.key === selectedKey.value) || operations.value[0])
const requestExample = computed(() => selected.value?.requestBody?.content?.['application/json']?.example || null)
const responseExample = computed(() => {
  const responses = selected.value?.responses || {}
  const response = responses['200'] || responses['201'] || Object.values(responses)[0]
  return response?.content?.['application/json']?.example || (response?.content?.['application/json']?.schema?.type === 'array' ? [{ id: '123', descricao: 'Exemplo' }] : { success: true })
})
const curl = computed(() => {
  if (!selected.value) return ''
  let path = selected.value.path
  selected.value.parameters?.filter(p => p.in === 'path').forEach(p => { path = path.replace(`{${p.name}}`, p.example || '123') })
  const lines = [`curl --request ${selected.value.method.toUpperCase()} \\`, `  --url '${location.origin}${BASE_URL}${path}' \\`, `  --header 'Accept: application/json'`]
  if (requestExample.value) lines.push(`  --header 'Content-Type: application/json' \\`, `  --data '${JSON.stringify(requestExample.value, null, 2)}'`)
  return lines.join('\n')
})
const select = op => { selectedKey.value = op.key; window.scrollTo({ top: 0, behavior: 'smooth' }) }
const copyCurl = async () => { await navigator.clipboard.writeText(curl.value); copied.value = true; setTimeout(() => copied.value = false, 1500) }

onMounted(async () => {
  try {
    const response = await fetch(`${BASE_URL}/openapi.json`)
    if (!response.ok) throw new Error('A especificação OpenAPI não está disponível. Reinicie o backend.')
    spec.value = await response.json(); selectedKey.value = operations.value[0]?.key || ''
  } catch (e) { error.value = e.message }
})
</script>

<template>
  <div class="min-h-[calc(100vh-5rem)] bg-white">
    <div v-if="!spec && !error" class="h-96 flex items-center justify-center text-slate-500"><Loader2 class="w-6 h-6 animate-spin mr-3"/> Carregando documentação...</div>
    <div v-else-if="error" class="m-8 p-5 rounded-2xl bg-red-50 text-red-700 font-bold">{{ error }}</div>
    <div v-else class="grid xl:grid-cols-[290px_minmax(420px,1fr)_minmax(360px,0.85fr)] min-h-[calc(100vh-5rem)]">
      <aside class="border-r border-slate-200 bg-slate-50/70 p-5 xl:sticky xl:top-20 xl:h-[calc(100vh-5rem)] overflow-y-auto">
        <div class="flex gap-3 items-center mb-5"><div class="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center"><BookOpen class="w-5 h-5"/></div><div><h1 class="font-black text-slate-900">Tudo Passa API</h1><p class="text-[10px] uppercase tracking-widest text-slate-400">Documentação oficial</p></div></div>
        <div class="relative mb-5"><Search class="absolute left-3 top-3 w-4 h-4 text-slate-400"/><input v-model="search" placeholder="Buscar endpoint" class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"></div>
        <nav v-for="(items, group) in groups" :key="group" class="mb-5">
          <p class="px-2 mb-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{{ group }}</p>
          <button v-for="op in items" :key="op.key" @click="select(op)" class="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left mb-0.5 transition" :class="selected?.key === op.key ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:bg-white'">
            <span class="w-12 text-center rounded-md py-1 text-[9px] font-black uppercase" :class="methodColor[op.method]">{{ op.method }}</span><span class="text-xs font-semibold truncate">{{ op.summary }}</span><ChevronRight class="w-3 h-3 ml-auto shrink-0"/>
          </button>
        </nav>
      </aside>

      <main v-if="selected" class="p-6 lg:p-10 overflow-hidden">
        <div class="flex flex-wrap items-center gap-3 mb-5"><span class="rounded-lg px-3 py-1.5 text-xs font-black uppercase" :class="methodColor[selected.method]">{{ selected.method }}</span><code class="text-sm md:text-base font-bold text-slate-700 break-all">{{ selected.path }}</code></div>
        <p class="text-xs font-black uppercase tracking-widest text-indigo-600">{{ selected.tags?.[0] }}</p>
        <h2 class="text-3xl font-black text-slate-900 mt-2">{{ selected.summary }}</h2>
        <p class="mt-4 text-slate-600 leading-7">{{ selected.description }}</p>

        <section v-if="selected.parameters?.length" class="mt-9"><h3 class="font-black text-slate-900 mb-3">Parâmetros</h3><div class="border border-slate-200 rounded-2xl overflow-hidden"><div v-for="param in selected.parameters" :key="param.name" class="grid grid-cols-[130px_1fr] gap-4 p-4 border-b last:border-0 border-slate-100"><div><code class="text-indigo-600 font-bold">{{ param.name }}</code><p class="text-[10px] uppercase font-black text-slate-400 mt-1">{{ param.in }} · {{ param.schema?.type }}</p></div><p class="text-sm text-slate-600">{{ param.description }} <span v-if="param.required" class="text-red-500 font-bold">Obrigatório</span></p></div></div></section>
        <section v-if="requestExample" class="mt-9"><h3 class="font-black text-slate-900 mb-2">Corpo da requisição</h3><p class="text-sm text-slate-500 mb-3">Envie os dados como <code>application/json</code>. Rotas com imagem também aceitam <code>multipart/form-data</code>.</p><pre class="bg-slate-950 text-slate-200 rounded-2xl p-5 overflow-auto text-xs leading-6">{{ JSON.stringify(requestExample, null, 2) }}</pre></section>
        <section class="mt-9"><h3 class="font-black text-slate-900 mb-3">Respostas</h3><div class="flex flex-wrap gap-2"><span v-for="(response, status) in selected.responses" :key="status" class="px-3 py-2 bg-slate-100 rounded-lg text-xs"><strong :class="String(status).startsWith('2') ? 'text-emerald-600' : 'text-red-500'">{{ status }}</strong> · {{ response.description }}</span></div></section>
      </main>

      <aside v-if="selected" class="bg-slate-950 text-slate-200 p-6 lg:p-8 overflow-hidden xl:sticky xl:top-20 xl:h-[calc(100vh-5rem)] xl:overflow-y-auto">
        <div class="flex items-center gap-2 text-xs uppercase tracking-widest font-black text-slate-400 mb-3"><Server class="w-4 h-4"/> Exemplo de requisição</div>
        <div class="relative"><button @click="copyCurl" class="absolute right-3 top-3 p-2 rounded-lg bg-white/10 hover:bg-white/20"><Check v-if="copied" class="w-4 text-emerald-400"/><Copy v-else class="w-4"/></button><pre class="bg-black/30 rounded-2xl p-5 pr-12 overflow-auto text-xs leading-6 text-indigo-200 whitespace-pre-wrap">{{ curl }}</pre></div>
        <h3 class="mt-8 mb-3 text-xs uppercase tracking-widest font-black text-slate-400">Exemplo de resposta JSON</h3><pre class="bg-black/30 rounded-2xl p-5 overflow-auto text-xs leading-6 text-emerald-200">{{ JSON.stringify(responseExample, null, 2) }}</pre>
        <a :href="`${BASE_URL}/api-docs`" target="_blank" class="mt-6 inline-flex text-xs font-bold text-indigo-300 hover:text-white">Abrir Swagger UI completo →</a>
      </aside>
    </div>
  </div>
</template>
