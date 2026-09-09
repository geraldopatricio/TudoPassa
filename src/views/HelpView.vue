<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BookOpen, Folder, FolderOpen, FileText, Search, ExternalLink, ChevronRight, ChevronDown } from 'lucide-vue-next'
import { helpTopics } from '../data/helpManual'
const route = useRoute(), router = useRouter()
const search = ref('')
const categories = [...new Set(helpTopics.map(item => item.group))]
const expanded = ref(new Set(categories))
const article = computed(() => helpTopics.find(item => item.id === route.query.assunto) || helpTopics[0])
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const matches = computed(() => helpTopics.filter(item => normalize([item.title, item.group, item.objective, ...item.steps, ...item.notes].join(' ')).includes(normalize(search.value.trim()))))
const groups = computed(() => categories.map(name => ({ name, items: matches.value.filter(item => item.group === name) })).filter(group => group.items.length))
const index = computed(() => helpTopics.indexOf(article.value))
const related = computed(() => article.value.related.map(id => helpTopics.find(item => item.id === id)).filter(Boolean))
const isOpen = name => !!search.value.trim() || expanded.value.has(name)
const toggle = name => { const next = new Set(expanded.value); next.has(name) ? next.delete(name) : next.add(name); expanded.value = next }
const open = id => router.push({ path: '/ajuda/help', query: { assunto: id } })
watch(article, item => { expanded.value = new Set([...expanded.value, item.group]) })
</script>

<template>
  <div class="p-4 md:p-7 max-w-[1500px] mx-auto text-slate-800">
    <div class="mb-5 flex items-center gap-3"><div class="bg-indigo-600 text-white p-3 rounded-xl"><BookOpen class="w-6 h-6" /></div><div><p class="text-xs uppercase tracking-widest text-indigo-600 font-bold">Ajuda / Help</p><h1 class="text-2xl font-bold">Manual do Tudo Passa</h1><p class="text-sm text-slate-500">Objetivos, procedimentos e orientações por módulo.</p></div></div>
    <div class="help-window border border-slate-300 rounded-xl overflow-hidden shadow-sm bg-white">
      <div class="bg-slate-100 border-b border-slate-300 px-4 py-3 flex flex-wrap justify-between gap-2 text-xs"><span class="font-bold">Central de ajuda · Conteúdo e índice</span><span>{{ helpTopics.length }} assuntos · Manual da versão atual</span></div>
      <div class="grid lg:grid-cols-[300px_minmax(0,1fr)]">
        <nav aria-label="Índice do manual" class="bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 p-4 lg:max-h-[75vh] lg:overflow-y-auto">
          <label class="block text-xs font-bold mb-2" for="help-search">Pesquisar no manual</label>
          <div class="relative"><Search class="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input id="help-search" v-model="search" type="search" placeholder="Ex.: preço, PIX, relatório…" class="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"></div>
          <div class="flex gap-3 text-xs mt-3 mb-4"><button @click="search = ''; expanded = new Set(categories)" class="text-indigo-700 hover:underline">Expandir tudo</button><button @click="search = ''; expanded = new Set()" class="text-indigo-700 hover:underline">Recolher tudo</button></div>
          <p v-if="search" role="status" class="text-xs text-slate-500 mb-3">{{ matches.length }} assunto(s) encontrado(s)</p>
          <ul class="space-y-1">
            <li v-for="(group, groupIndex) in groups" :key="group.name">
              <button @click="toggle(group.name)" :aria-expanded="isOpen(group.name)" :aria-controls="`help-group-${groupIndex}`" class="flex items-center gap-2 w-full text-left py-2 text-sm font-semibold rounded hover:bg-slate-200">
                <ChevronDown v-if="isOpen(group.name)" class="w-3 h-3" /><ChevronRight v-else class="w-3 h-3" /><FolderOpen v-if="isOpen(group.name)" class="w-4 h-4 text-amber-600" /><Folder v-else class="w-4 h-4 text-amber-600" />{{ group.name }}
              </button>
              <ul v-show="isOpen(group.name)" :id="`help-group-${groupIndex}`" class="ml-5 pl-3 border-l border-dashed border-slate-300">
                <li v-for="item in group.items" :key="item.id"><RouterLink :to="{ path: '/ajuda/help', query: { assunto: item.id } }" :aria-current="article.id === item.id ? 'page' : undefined" class="flex gap-2 py-2 px-2 rounded text-xs leading-5" :class="article.id === item.id ? 'bg-indigo-100 text-indigo-800 font-bold' : 'text-slate-600 hover:bg-slate-200'"><FileText class="w-4 h-4 shrink-0 mt-0.5" />{{ item.title }}</RouterLink></li>
              </ul>
            </li>
          </ul>
          <p v-if="!matches.length" class="text-sm text-slate-500 py-4">Nenhum assunto encontrado. Tente outro termo ou limpe a busca.</p>
        </nav>
        <article :key="article.id" class="p-5 md:p-9 min-w-0" aria-label="Conteúdo do assunto">
          <p class="text-xs text-slate-500 mb-3">Help / {{ article.group }}</p>
          <h2 class="text-2xl md:text-3xl font-bold leading-tight">{{ article.title }}</h2>
          <RouterLink v-if="article.path" :to="article.path" class="inline-flex items-center gap-2 mt-4 text-sm text-indigo-700 font-semibold hover:underline">Abrir página <ExternalLink class="w-4 h-4" /></RouterLink>
          <section class="mt-7 bg-indigo-50 border-l-4 border-indigo-500 p-5 rounded-r-lg"><h3 class="font-bold text-indigo-900 mb-2">Objetivo</h3><p class="text-sm leading-7">{{ article.objective }}</p></section>
          <section class="mt-8"><h3 class="text-lg font-bold mb-5">Passo a passo</h3><ol class="space-y-4 list-decimal pl-6 marker:text-indigo-600 marker:font-bold"><li v-for="(step, i) in article.steps" :key="i" class="pl-2 text-sm leading-7">{{ step }}</li></ol></section>
          <section class="mt-8 border border-amber-200 bg-amber-50 rounded-xl p-5"><h3 class="font-bold text-amber-900 mb-3">Observações de uso</h3><ul class="list-disc pl-5 space-y-3"><li v-for="note in article.notes" :key="note" class="text-sm leading-6 text-amber-950">{{ note }}</li></ul></section>
          <section v-if="related.length" class="mt-8"><h3 class="font-bold mb-3">Continue no manual</h3><div class="flex flex-wrap gap-2"><RouterLink v-for="item in related" :key="item.id" :to="{ path: '/ajuda/help', query: { assunto: item.id } }" class="border border-slate-200 px-3 py-2 rounded-lg text-sm text-indigo-700 hover:bg-indigo-50">{{ item.title }}</RouterLink></div></section>
          <div class="border-t border-slate-200 mt-8 pt-5 flex justify-between gap-4 text-sm"><button :disabled="index === 0" @click="open(helpTopics[index - 1].id)" class="text-indigo-700 disabled:text-slate-300">← Anterior</button><span class="text-slate-400">{{ index + 1 }} de {{ helpTopics.length }}</span><button :disabled="index === helpTopics.length - 1" @click="open(helpTopics[index + 1].id)" class="text-indigo-700 disabled:text-slate-300">Próximo →</button></div>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
button:focus-visible,a:focus-visible,input:focus-visible { outline:2px solid #4f46e5; outline-offset:3px; }
</style>
