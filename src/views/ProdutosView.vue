<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { 
  Search, Plus, Pencil, Trash2, Download, Upload, X, Save, 
  Image as ImageIcon, PlusCircle, ChevronLeft, ChevronRight, Loader2
} from 'lucide-vue-next'
import * as XLSX from 'xlsx'

// --- CONFIGURAÇÕES DE CONEXÃO ---
// const API_URL = '/api/produtos'
// const IMAGE_BASE = '/api/uploads' 
const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const API_URL = `${BASE_URL}/produtos`;
const IMAGE_BASE = `${BASE_URL}/uploads/produtos`;

const produtos = ref([])
const searchQuery = ref('')
const loading = ref(true)
const isSidebarOpen = ref(false)

// --- ESTADO DO MODAL/FORMULÁRIO ---
const isModalOpen = ref(false)
const editingProduto = ref(null)
const fileInput = ref(null)
const imagePreview = ref(null)
const form = ref({
  referencia: '',
  categoria: 'CAMISA',
  descricao: '',
  unidade: 'UN',
  variantes: []
})


const importExcel = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

      for (const row of json) {
        const ref = String(row.Referencia || row.referencia);
        
        // 1. Prepara o objeto da variante com os novos preços
        const novaVariante = {
          cor_codigo_nome: String(row.Cor || row.cor || 'PADRÃO'),
          valor_unitario: Number(row.Preco_Base || row.preco || 0),
          valor_unitario_tb1: Number(row.Preco_TB1 || row.preco_tb1 || 0),
          valor_unitario_tb2: Number(row.Preco_TB2 || row.preco_tb2 || 0),
          valor_unitario_tb3: Number(row.Preco_TB3 || row.preco_tb3 || 0),
          grade: {
            PP: Number(row.PP || 0),
            P: Number(row.P || 0),
            M: Number(row.M || 0),
            G: Number(row.G || 0),
            GG: Number(row.GG || 0),
            U: Number(row.U || 0)
          }
        };

        // Calcula os totais (quantidade e valores totais por tabela)
        calcularTotaisVariante(novaVariante);

        const produtoDados = {
          referencia: ref,
          categoria: (row.Categoria || row.categoria || 'CAMISA').toUpperCase(),
          descricao: row.Descricao || row.descricao || '',
          unidade: (row.Unidade || row.unidade || 'UN').toUpperCase(),
          variantes: [novaVariante]
        };

        // 2. Lógica de Upsert (Verifica se existe localmente)
        const existe = produtos.value.find(p => p.referencia === ref);
        
        const url = existe ? `${API_URL}/${ref}` : API_URL;
        const method = existe ? 'PUT' : 'POST';

        // 3. Envia para o servidor
        // Nota: Enviamos como JSON comum, pois importação em massa geralmente não envia fotos novas
        await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(produtoDados)
        });
      }

      alert("Processamento de Excel concluído!");
      fetchProdutos();
    } catch (error) {
      console.error("Erro na importação:", error);
      alert("Falha ao importar Excel. Verifique os nomes das colunas.");
    }
  };
  reader.readAsArrayBuffer(file);
};

// --- LÓGICA DE PAGINAÇÃO ---
const currentPage = ref(1)
const itemsPerPage = ref(8)

const fetchProdutos = async () => {
  try {
    loading.value = true
    const res = await fetch(API_URL)
    produtos.value = await res.json()
  } catch (e) {
    console.error("Erro ao buscar produtos:", e)
  } finally {
    loading.value = false
  }
}

// 1. Filtragem por busca
const filteredProdutos = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  return produtos.value.filter(p => 
    p.descricao.toLowerCase().includes(query) || 
    p.referencia.includes(query)
  )
})

// 2. Paginação do resultado filtrado
const paginatedProdutos = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredProdutos.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(filteredProdutos.value.length / itemsPerPage.value))

// Resetar para página 1 ao pesquisar
watch(searchQuery, () => { currentPage.value = 1 })

// --- FUNÇÕES DE CRUD ---
const openModal = (produto = null) => {
  if (produto) {
    editingProduto.value = produto
    form.value = JSON.parse(JSON.stringify(produto))
    imagePreview.value = `${IMAGE_BASE}/${produto.imagem}`
  } else {
    editingProduto.value = null
    form.value = { referencia: '', categoria: 'CAMISA', descricao: '', unidade: 'UN', variantes: [] }
    imagePreview.value = null
  }
  isModalOpen.value = true
}

const handleImageChange = (e) => {
  const file = e.target.files[0]
  if (file) imagePreview.value = URL.createObjectURL(file)
}

const addVariante = () => {
  form.value.variantes.push({
    cor_codigo_nome: '',
    grade: { PP: 0, P: 0, M: 0, G: 0, GG: 0, U: 0 },
    quantidade_total: 0,
    valor_unitario: 0,
    valor_total: 0,
    // Novos campos
    valor_unitario_tb1: 0,
    valor_total_tb1: 0,
    valor_unitario_tb2: 0,
    valor_total_tb2: 0,
    valor_unitario_tb3: 0,
    valor_total_tb3: 0
  })
}

const calcularTotaisVariante = (v) => {
  // 1. Soma a grade para ter o total de peças
  v.quantidade_total = Object.values(v.grade).reduce((acc, curr) => acc + Number(curr), 0);
  
  // 2. Calcula os totais multiplicando o preço de cada tabela pela quantidade
  v.valor_total = (Number(v.valor_unitario) || 0) * v.quantidade_total;
  v.valor_total_tb1 = (Number(v.valor_unitario_tb1) || 0) * v.quantidade_total;
  v.valor_total_tb2 = (Number(v.valor_unitario_tb2) || 0) * v.quantidade_total;
  v.valor_total_tb3 = (Number(v.valor_unitario_tb3) || 0) * v.quantidade_total;
}

const saveProduto = async () => {
  const formData = new FormData()
  formData.append('referencia', form.value.referencia)
  formData.append('categoria', form.value.categoria)
  formData.append('descricao', form.value.descricao)
  formData.append('unidade', form.value.unidade)
  formData.append('variantes', JSON.stringify(form.value.variantes))
  
  if (fileInput.value?.files[0]) {
    formData.append('imagem', fileInput.value.files[0])
  }

  const method = editingProduto.value ? 'PUT' : 'POST'
  const url = editingProduto.value ? `${API_URL}/${editingProduto.value.referencia}` : API_URL

  try {
    const res = await fetch(url, { method, body: formData })
    if (res.ok) {
      await fetchProdutos()
      isModalOpen.value = false
    } else {
      const err = await res.json()
      alert(err.message)
    }
  } catch (e) { alert("Erro ao conectar com o servidor") }
}

const deleteProduto = async (ref) => {
  if (confirm("Excluir este produto permanentemente?")) {
    await fetch(`${API_URL}/${ref}`, { method: 'DELETE' })
    fetchProdutos()
  }
}

const exportToExcel = () => {
  const data = produtos.value.map(p => {
    // Pegamos a primeira variante para exportar os dados principais
    // Se o produto tiver múltiplas variantes, você pode adaptar para exportar várias linhas
    const v = p.variantes[0] || {};
    return {
      Referencia: p.referencia,
      Descricao: p.descricao,
      Categoria: p.categoria,
      Unidade: p.unidade,
      Cor: v.cor_codigo_nome || '',
      Preco_Base: v.valor_unitario || 0,
      Preco_TB1: v.valor_unitario_tb1 || 0,
      Preco_TB2: v.valor_unitario_tb2 || 0,
      Preco_TB3: v.valor_unitario_tb3 || 0,
      PP: v.grade?.PP || 0,
      P: v.grade?.P || 0,
      M: v.grade?.M || 0,
      G: v.grade?.G || 0,
      GG: v.grade?.GG || 0,
      U: v.grade?.U || 0
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produtos");
  XLSX.writeFile(wb, "estoque_detalhado.xlsx");
};

onMounted(fetchProdutos)
</script>

<template>
  <div class="flex h-screen bg-slate-50 overflow-hidden font-sans">
    <Sidebar :isOpen="isSidebarOpen" @close="isSidebarOpen = false" />
    
    <div class="flex-1 flex flex-col min-w-0">
      <NavBar @toggleSidebar="isSidebarOpen = !isSidebarOpen" />
      
      <main class="flex-1 p-6 overflow-y-auto custom-scrollbar">
        <!-- Cabeçalho -->
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-black text-slate-800 uppercase tracking-tight italic">Gestão de Produtos</h1>
          <div class="flex gap-3">
            <button @click="exportToExcel" class="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 flex items-center gap-2 font-bold text-sm hover:bg-slate-50 transition-all shadow-sm">
              <Download class="w-4 h-4" /> Exportar
            </button>

             <label class="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 flex items-center gap-2 font-bold text-sm cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                <Upload class="w-4 h-4" /> Importar Excel
                <input type="file" class="hidden" @change="importExcel" accept=".xlsx, .xls" />
            </label>
            
            <button @click="openModal()" class="px-4 py-2.5 bg-indigo-600 text-white rounded-2xl flex items-center gap-2 font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
              <Plus class="w-5 h-5" /> Novo Produto
            </button>
          </div>
        </div>

        <!-- Filtro de Busca -->
        <div class="relative mb-6">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input v-model="searchQuery" type="text" placeholder="Buscar por referência ou descrição..." class="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm">
        </div>

        <!-- DataGrid / Tabela -->
        <div class="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-widest font-black text-slate-500">
                  <th class="px-6 py-5">Produto</th>
                  <th class="px-6 py-5">Referência</th>
                  <th class="px-6 py-5">Categoria</th>
                  <th class="px-6 py-5">Preço Base</th>
                  <th class="px-6 py-5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr v-if="loading">
                  <td colspan="5" class="py-20 text-center text-slate-400 font-bold uppercase text-xs">
                    <Loader2 class="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                    Carregando estoque...
                  </td>
                </tr>
                <tr v-else-if="paginatedProdutos.length === 0">
                  <td colspan="5" class="py-20 text-center text-slate-400 font-bold uppercase text-xs italic">Nenhum produto encontrado</td>
                </tr>
                <tr v-for="p in paginatedProdutos" :key="p.referencia" class="hover:bg-slate-50/50 transition-colors group">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                        <!-- Imagem dinâmica com Fallback -->
                        <img 
                          :src="p.imagem ? `${IMAGE_BASE}/${p.imagem}` : '/assets/img/placeholder.png'" 
                          @error="(e) => e.target.src = '/assets/img/placeholder.png'"
                          class="w-full h-full object-cover"
                        >
                      </div>
                      <span class="font-bold text-slate-700 text-sm">{{ p.descricao }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 font-mono text-xs text-slate-400 font-bold">#{{ p.referencia }}</td>
                  <td class="px-6 py-4"><span class="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase">{{ p.categoria }}</span></td>
                  <td class="px-6 py-4 font-black text-indigo-600">R$ {{ p.variantes[0]?.valor_unitario.toFixed(2) || '0.00' }}</td>
                  <td class="px-6 py-4">
                    <div class="flex justify-center gap-2">
                      <button @click="openModal(p)" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Pencil class="w-4 h-4" /></button>
                      <button @click="deleteProduto(p.referencia)" class="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 class="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Paginação -->
          <div class="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Mostrando {{ paginatedProdutos.length }} de {{ filteredProdutos.length }} produtos
            </span>
            <div class="flex items-center gap-2">
              <button @click="currentPage--" :disabled="currentPage === 1" class="p-2 rounded-xl bg-white border border-slate-200 disabled:opacity-30 hover:bg-slate-50 shadow-sm"><ChevronLeft class="w-5 h-5"/></button>
              
              <div class="flex gap-1">
                <button v-for="page in totalPages" :key="page" @click="currentPage = page"
                  :class="currentPage === page ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-white text-slate-600 hover:bg-slate-50'"
                  class="w-10 h-10 rounded-xl border border-slate-200 font-bold text-sm transition-all shadow-sm">
                  {{ page }}
                </button>
              </div>

              <button @click="currentPage++" :disabled="currentPage === totalPages" class="p-2 rounded-xl bg-white border border-slate-200 disabled:opacity-30 hover:bg-slate-50 shadow-sm"><ChevronRight class="w-5 h-5"/></button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- MODAL DE CADASTRO/EDIÇÃO (Mantido e revisado) -->
    <div v-if="isModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div class="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div class="p-8 flex justify-between items-center border-b border-slate-100">
          <h2 class="text-xl font-black text-slate-800 uppercase italic">Detalhes do Produto</h2>
          <button @click="isModalOpen = false" class="p-2 hover:bg-slate-100 rounded-full"><X class="w-5 h-5 text-slate-400" /></button>
        </div>

        <div class="p-8 overflow-y-auto custom-scrollbar">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Imagem no Modal -->
            <div class="space-y-4">
              <div class="aspect-square bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
                <img v-if="imagePreview" :src="imagePreview" class="w-full h-full object-cover">
                <ImageIcon v-else class="w-12 h-12 text-slate-200" />
                <label class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-all">
                  <Upload class="w-6 h-6 mr-2" /> {{ editingProduto ? 'Trocar Foto' : 'Subir Foto' }}
                  <input type="file" ref="fileInput" class="hidden" @change="handleImageChange" accept="image/*">
                </label>
              </div>
            </div>

            <div class="md:col-span-2 grid grid-cols-2 gap-4">
              <div class="col-span-2 space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Descrição</label><input v-model="form.descricao" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500"></div>
              <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Referência</label><input v-model="form.referencia" :disabled="editingProduto" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500"></div>
              <div class="space-y-1"><label class="text-[10px] font-black uppercase text-slate-400 ml-1">Categoria</label>
                <select v-model="form.categoria" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none">
                  <option>CAMISA</option><option>SHORT</option><option>ACESSORIOS</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Variantes -->
          <div class="mt-10">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-sm font-black text-slate-400 uppercase tracking-widest">Estoque por Cor/Grade</h3>
              <button @click="addVariante" class="text-indigo-600 flex items-center gap-1 text-xs font-bold hover:underline"><PlusCircle class="w-4 h-4" /> Add Variante</button>
            </div>
            <div class="space-y-4">
              <div v-for="(v, idx) in form.variantes" :key="idx" class="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative shadow-sm mb-4">
                <button @click="form.variantes.splice(idx,1)" class="absolute top-4 right-4 text-red-300 hover:text-red-500"><Trash2 class="w-4 h-4" /></button>
                
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div class="md:col-span-2">
                    <label class="text-[9px] font-bold text-slate-400 uppercase">Cor / Referência Cor</label>
                    <input v-model="v.cor_codigo_nome" placeholder="Ex: PRETO" class="w-full p-2 bg-white border border-slate-200 rounded-xl text-sm font-bold uppercase">
                  </div>
                  <div>
                    <label class="text-[9px] font-bold text-slate-400 uppercase">Preço Base (Unit)</label>
                    <input type="number" v-model="v.valor_unitario" @input="calcularTotaisVariante(v)" class="w-full p-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-indigo-600">
                  </div>
                  <div>
                    <label class="text-[9px] font-bold text-slate-400 uppercase">Total Qtd</label>
                    <div class="w-full p-2 bg-slate-200/50 rounded-xl text-sm font-black text-slate-500 text-center">{{ v.quantidade_total }}</div>
                  </div>
                </div>

                <!-- Nova Linha para as 3 Tabelas de Preço -->
                <div class="grid grid-cols-3 gap-3 mb-4 p-3 bg-white/50 rounded-2xl border border-dashed border-slate-200">
                  <div>
                    <label class="text-[9px] font-bold text-emerald-600 uppercase">Preço TB 1</label>
                    <input type="number" v-model="v.valor_unitario_tb1" @input="calcularTotaisVariante(v)" class="w-full p-2 bg-white border border-emerald-100 rounded-xl text-sm font-bold">
                  </div>
                  <div>
                    <label class="text-[9px] font-bold text-blue-600 uppercase">Preço TB 2</label>
                    <input type="number" v-model="v.valor_unitario_tb2" @input="calcularTotaisVariante(v)" class="w-full p-2 bg-white border border-blue-100 rounded-xl text-sm font-bold">
                  </div>
                  <div>
                    <label class="text-[9px] font-bold text-purple-600 uppercase">Preço TB 3</label>
                    <input type="number" v-model="v.valor_unitario_tb3" @input="calcularTotaisVariante(v)" class="w-full p-2 bg-white border border-purple-100 rounded-xl text-sm font-bold">
                  </div>
                </div>

                <div class="grid grid-cols-6 gap-2">
                  <div v-for="size in ['PP','P','M','G','GG','U']" :key="size" class="text-center">
                    <label class="text-[9px] font-bold text-slate-400">{{ size }}</label>
                    <input type="number" v-model="v.grade[size]" @input="calcularTotaisVariante(v)" class="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-center font-bold">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button @click="isModalOpen = false" class="flex-1 py-4 font-bold text-slate-500 hover:bg-white rounded-2xl transition-all">Sair</button>
          <button @click="saveProduto" class="flex-[2] py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg flex items-center justify-center gap-2">
            <Save class="w-5 h-5" /> Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
</style>
