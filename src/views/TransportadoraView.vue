<script setup>
import { ref, onMounted } from 'vue'
import { Bell, Navigation, PackageCheck, CheckCircle, Truck } from 'lucide-vue-next'

const entregasDisponiveis = ref([])
const minhaEntregaAtiva = ref(null)
const profissionalLogadoId = "COD_TRANS_01" // Pegar do LocalStorage

// 1. ABRIR NAVEGAÇÃO (Waze ou Google Maps)
const abrirNavegacao = () => {
  if (!minhaEntregaAtiva.value) return;
  const endereco = minhaEntregaAtiva.value.cliente.endereco;
  // Deep link para o Waze (tenta abrir o app)
  const url = `https://waze.com/ul?q=${encodeURIComponent(endereco)}&navigate=yes`;
  window.open(url, '_blank');
};

// 2. ATUALIZAR STATUS (Função Genérica)
const mudarStatusEntrega = async (novoStatus) => {
  try {
    const id = minhaEntregaAtiva.value.id;
    const res = await fetch(`http://localhost:3000/logistica/status/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus })
    });

    if (res.ok) {
      const dadosAtualizados = await res.json();
      
      if (novoStatus === 'Entregue') {
        // Se finalizou, limpa a tela e volta a buscar novos pedidos
        minhaEntregaAtiva.value = null;
        alert("Entrega finalizada com sucesso! Bom trabalho.");
        fetchEntregas(); 
      } else {
        // Atualiza os dados locais para refletir a mudança (ex: Em Rota)
        minhaEntregaAtiva.value = dadosAtualizados;
      }
    }
  } catch (e) {
    alert("Erro ao atualizar status: " + e.message);
  }
};

const fetchEntregas = async () => {
    const res = await fetch('http://localhost:3000/logistica/disponiveis')
    const data = await res.json()
    if (data.length > entregasDisponiveis.value.length) {
        new Audio('/sounds/alert.mp3').play().catch(() => {});
    }
    entregasDisponiveis.value = data.filter(e => !e.profissional_id)
}

const aceitarServico = async (id) => {
    const res = await fetch(`http://localhost:3000/logistica/aceitar/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profissionalId: profissionalLogadoId })
    })
    if(res.ok) {
        minhaEntregaAtiva.value = await res.json()
        iniciarRastreioGPS()
    }
}

// Simula o GPS enviando coordenadas para o servidor
const iniciarRastreioGPS = () => {
    setInterval(() => {
        // No mundo real: navigator.geolocation.getCurrentPosition
        const pos = { lat: -3.73 + Math.random()*0.01, lng: -38.52 + Math.random()*0.01 }
        fetch('http://localhost:3000/logistica/rastreio/posicao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profissionalId: profissionalLogadoId, ...pos })
        })
    }, 10000) // Envia a cada 10 segundos
}

onMounted(() => {
    fetchEntregas();
    // Opcional: Atualizar a cada 30 segundos para ver novos pedidos
    setInterval(fetchEntregas, 30000); 
})

</script>

<template>
  <div class="p-6 bg-slate-900 min-h-screen text-white">
    <h1 class="text-2xl font-black mb-8 italic">Painel Transportador</h1>

    <!-- Alerta de Nova Entrega -->
    <div v-if="entregasDisponiveis.length > 0 && !minhaEntregaAtiva" class="space-y-4">
        <div v-for="e in entregasDisponiveis" :key="e.id" class="bg-indigo-600 p-6 rounded-[2rem] animate-pulse">
            <div class="flex justify-between items-start">
                <Bell class="w-8 h-8" />
                <span class="bg-white text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black">NOVO PEDIDO</span>
            </div>
            <p class="mt-4 font-black uppercase">Entrega para: {{ e.cliente.nome }}</p>
            <p class="text-xs opacity-70">{{ e.cliente.endereco }}</p>
            <button @click="aceitarServico(e.id)" class="w-full mt-6 bg-white text-indigo-600 py-4 rounded-2xl font-black uppercase">Aceitar agora (5 min)</button>
        </div>
    </div>

    <!-- Rota Ativa (Substitua esta parte no seu template) -->
    <div v-if="minhaEntregaAtiva" class="bg-slate-800 p-8 rounded-[3rem] border border-slate-700 animate-in zoom-in">
        <div class="flex justify-between items-start mb-6">
            <div>
                <h2 class="text-emerald-400 font-black uppercase text-[10px] tracking-widest mb-1">Entrega em andamento</h2>
                <p class="text-2xl font-black">Pedido #{{ minhaEntregaAtiva.numero_pedido }}</p>
            </div>
            <div class="px-4 py-1 bg-slate-700 rounded-full text-[9px] font-black uppercase">
                Status: {{ minhaEntregaAtiva.status }}
            </div>
        </div>

        <!-- Info do Cliente -->
        <div class="mb-8 p-4 bg-slate-900/50 rounded-2xl border border-slate-700">
            <p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Destino:</p>
            <p class="font-bold text-sm">{{ minhaEntregaAtiva.cliente.nome }}</p>
            <p class="text-xs text-slate-400">{{ minhaEntregaAtiva.cliente.endereco }}</p>
        </div>
        
        <div class="mt-8 space-y-4">
            <!-- BOTÃO 1: WAZE -->
            <button @click="abrirNavegacao" 
                    class="w-full bg-emerald-500 hover:bg-emerald-600 py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95">
                <Navigation class="w-5 h-5" /> ABRIR NO WAZE
            </button>

            <!-- BOTÃO 2: COLETAR (Fica desabilitado se já coletou) -->
            <button v-if="minhaEntregaAtiva.status !== 'Em Rota'"
                    @click="mudarStatusEntrega('Em Rota')" 
                    class="w-full bg-slate-700 hover:bg-slate-600 py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95">
                <PackageCheck class="w-5 h-5" /> JÁ COLETEI O PACOTE
            </button>

            <div v-else class="w-full bg-emerald-500/10 border border-emerald-500/30 py-4 rounded-2xl text-emerald-500 text-center font-black text-xs uppercase">
                Pacote em mãos. Dirija-se ao destino.
            </div>

            <!-- BOTÃO 3: CONFIRMAR ENTREGA -->
            <button @click="mudarStatusEntrega('Entregue')" 
                    class="w-full bg-white text-slate-900 hover:bg-slate-100 py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-white/5">
                <CheckCircle class="w-5 h-5" /> CONFIRMAR ENTREGA
            </button>
        </div>
    </div>


  </div>
</template>