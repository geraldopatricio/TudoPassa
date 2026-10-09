<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
const props = defineProps({ pedidoId: String, financeiroId: String })
const emit = defineEmits(['paid'])
const api = import.meta.env.VITE_API_URL || '/api'
const endpoint = () => props.pedidoId ? `${api}/pedidos/${props.pedidoId}` : `${api}/financeiro/${props.financeiroId}`
const data = ref(null), busy = ref(false), error = ref(''), message = ref('Aguardando pagamento'), copied = ref(false)
let timer, disposed = false
const readResponse = async response => {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`A API Pix não respondeu em JSON (HTTP ${response.status}). Reinicie o backend atualizado e confira VITE_API_URL e BACKEND_URL.`)
  }
  return response.json()
}
const check = async () => {
  try {
    const response = await fetch(`${endpoint()}/${props.pedidoId ? 'status' : 'pix/status'}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Pago' }) })
    const result = await readResponse(response)
    if (disposed) return
    if (response.ok && result.status === 'Pago') {
      message.value = 'Pagamento recebido'
      if (result.email_confirmacao?.status === 'erro') error.value = `Pagamento confirmado, mas o e-mail não foi enviado: ${result.email_confirmacao.mensagem}`
      emit('paid'); return
    }
    message.value = result.message || 'Aguardando pagamento'
  } catch { message.value = 'Consulta indisponível. Tentaremos novamente.' }
  if (!disposed) timer = setTimeout(check, 10000)
}
const load = async (regenerate = false) => {
  if (busy.value) return
  if (regenerate && !confirm('Cancelar a cobrança pendente e gerar outro Pix com o valor total deste pedido?')) return
  clearTimeout(timer); busy.value = true; error.value = ''
  if (regenerate) data.value = null
  try {
    const request = allowPaid => fetch(`${endpoint()}/pix`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ regenerate, allowPaid }) })
    let response = await request(false)
    let result = await readResponse(response)
    if (result.requiresConfirmation) {
      if (!confirm(result.message)) return
      response = await request(true)
      result = await readResponse(response)
    }
    if (!response.ok) throw new Error(result.message || 'Não foi possível gerar Pix')
    data.value = result; message.value = result.paid ? 'Pagamento recebido' : 'Aguardando pagamento'; copied.value = false
    if (!disposed && !result.paid) timer = setTimeout(check, 5000)
  } catch (e) { error.value = e.message } finally { busy.value = false }
}
const copy = async () => {
  try { await navigator.clipboard.writeText(data.value.copyPaste); copied.value = true }
  catch { error.value = 'Selecione o código abaixo e copie manualmente.' }
}
onMounted(() => load())
onUnmounted(() => { disposed = true; clearTimeout(timer) })
</script>
<template>
  <section class="w-full text-center font-sans">
    <h3 class="font-bold text-lg text-slate-800">Pagamento Pix · Asaas</h3>
    <p v-if="busy" role="status" class="p-4 text-slate-500">Gerando Pix...</p>
    <p v-if="error" role="alert" class="my-3 text-sm text-red-600">{{ error }}</p>
    <div v-if="data">
      <p class="text-xl font-bold my-3">{{ Number(data.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}</p>
      <img :src="`data:image/png;base64,${data.qrCode}`" alt="QR Code Pix do pedido" class="w-48 h-48 mx-auto" />
      <p class="text-sm text-slate-500 my-3">Escaneie ou copie o código no aplicativo do banco.</p>
      <div class="border border-dashed border-emerald-500 rounded-lg p-3 text-xs font-mono break-all text-left select-all text-slate-700">{{ data.copyPaste }}</div>
      <button @click="copy" class="my-3 bg-emerald-600 text-white rounded-lg px-4 py-2">{{ copied ? 'Código copiado' : 'Copiar código Pix' }}</button>
      <p role="status" class="text-sm text-slate-600">{{ message }}</p>
      <button v-if="message !== 'Pagamento recebido'" @click="load(true)" :disabled="busy" class="mt-3 text-sm underline text-indigo-600 disabled:opacity-50">Gerar outro Pix</button>
    </div>
    <button v-if="!data && !busy" @click="load()" class="mt-3 text-indigo-600 underline">Consultar / gerar Pix</button>
  </section>
</template>
