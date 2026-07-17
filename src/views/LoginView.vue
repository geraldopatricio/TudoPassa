<script setup>
import { ref, onMounted, reactive } from 'vue'
import { Eye, EyeOff, Lock, UserPlus, X, Camera, Send, Loader2, Mail, KeyRound, CheckCircle2 } from 'lucide-vue-next'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const API_URL = '/api' 

// Estados de Interface
const isAppReady = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const modalRegistro = ref(false)
const modalEsqueci = ref(false)
const modalMudarSenha = ref(false)

// Refs para Input de Arquivo
const fileInput = ref(null)

// Dados dos Formulários
const loginData = reactive({ login: '', senha: '' })
const recoveryEmail = ref('')

const newUser = reactive({
  login: '',
  senha: '',
  confirmarSenha: '',
  cpf: '',
  email: '',
  whatsapp: '',
  tipo: '', 
  foto: null
})

const changePass = reactive({
  login: '',
  senhaAntiga: '',
  novaSenha: '',
  confirmarNovaSenha: ''
})

const fotoPreview = ref(null)

onMounted(() => {
  setTimeout(() => isAppReady.value = true, 4500)
})

// --- FUNÇÕES DE APOIO ---

const triggerFileInput = () => {
  fileInput.value.click()
}

const handleFileUpload = (e) => {
  const file = e.target.files[0]
  if (file) {
    newUser.foto = file
    fotoPreview.value = URL.createObjectURL(file)
  }
}

// --- AÇÕES BACKEND ---

const realizarLogin = async () => {
  if (!loginData.login || !loginData.senha) return
  loading.value = true
  try {
    const res = await axios.post(`${API_URL}/usuarios/login`, loginData)
    localStorage.setItem('usuario', JSON.stringify(res.data))
    router.push('/pdv')
  } catch (err) {
    alert(err.response?.data?.message || 'Credenciais inválidas')
  } finally {
    loading.value = false
  }
}

const cadastrarUsuario = async () => {
  if (newUser.senha !== newUser.confirmarSenha) {
    return alert("As senhas de cadastro não conferem!")
  }
  
  loading.value = true
  const formData = new FormData()
  formData.append('login', newUser.login)
  formData.append('senha', newUser.senha)
  formData.append('cpf', newUser.cpf)
  formData.append('email', newUser.email)
  formData.append('whatsapp', newUser.whatsapp)
  formData.append('tipo', newUser.tipo)
  if (newUser.foto) formData.append('foto', newUser.foto)

  try {
    await axios.post(`${API_URL}/usuarios`, formData)
    alert('Usuário cadastrado com sucesso!')
    modalRegistro.value = false
  } catch (err) {
    alert(err.response?.data?.message || 'Erro ao cadastrar')
  } finally {
    loading.value = false
  }
}

const executarMudancaSenha = async () => {
  if (changePass.novaSenha !== changePass.confirmarNovaSenha) {
    return alert("A nova senha e a confirmação são diferentes!")
  }

  loading.value = true
  try {
    await axios.post(`${API_URL}/usuarios/alterar-senha`, {
      login: changePass.login,
      senhaAntiga: changePass.senhaAntiga,
      novaSenha: changePass.novaSenha
    })
    alert('Senha alterada com sucesso! Use a nova senha para entrar.')
    modalMudarSenha.value = false
  } catch (err) {
    alert(err.response?.data?.message || 'Erro ao alterar senha')
  } finally {
    loading.value = false
  }
}

const recuperarSenha = async () => {
  if (!recoveryEmail.value) return alert('Informe seu e-mail')
  loading.value = true
  try {
    await axios.post(`${API_URL}/usuarios/recuperar-senha`, { email: recoveryEmail.value })
    alert('Senha enviada para o seu e-mail!')
    modalEsqueci.value = false
  } catch (err) {
    alert('E-mail não localizado no sistema.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/50 overflow-x-hidden font-sans">
    
    <!-- SPLASH SCREEN -->
    <Transition name="fade-splash">
      <div v-if="!isAppReady" class="fixed inset-0 z-[100] flex items-center justify-center bg-white">
        <img src="/assets/img/logoDegrade.png" alt="Logo" class="h-[400px] w-auto object-contain logo-animation" />
      </div>
    </Transition>

    <!-- PÁGINA DE LOGIN -->
    <Transition name="fade-login">
      <div v-if="isAppReady" class="min-h-screen flex items-center justify-center p-6">
        <div class="w-full max-w-[400px]">
          
          <div class="text-center mb-10">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 mb-6">
              <Lock class="text-white w-8 h-8" />
            </div>
            <h1 class="text-3xl font-extrabold text-slate-800 tracking-tight italic">TUDO PASSA</h1>
            <p class="text-slate-500 mt-2 font-medium">Painel de Acesso</p>
          </div>

          <div class="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-100">
            <form @submit.prevent="realizarLogin" class="space-y-6">
              
              <div class="relative">
                <input v-model="loginData.login" type="text" id="user" placeholder=" " required
                  class="peer w-full px-4 py-4 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-transparent" />
                <label for="user" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-all peer-focus:-top-0 peer-focus:left-3 peer-focus:text-xs peer-focus:text-indigo-600 peer-focus:bg-white peer-focus:px-2 peer-[:not(:placeholder-shown)]:-top-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2">
                  Usuário ou Login
                </label>
              </div>

              <div class="relative">
                <input v-model="loginData.senha" :type="showPassword ? 'text' : 'password'" id="pass" placeholder=" " required
                  class="peer w-full px-4 py-4 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-transparent" />
                <label for="pass" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-all peer-focus:-top-0 peer-focus:left-3 peer-focus:text-xs peer-focus:text-indigo-600 peer-focus:bg-white peer-focus:px-2 peer-[:not(:placeholder-shown)]:-top-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2">
                  Senha
                </label>
                <button type="button" @click="showPassword = !showPassword" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">
                  <Eye v-if="!showPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </div>

              <div class="flex justify-end">
                <button type="button" @click="modalEsqueci = true" class="text-xs font-semibold text-indigo-600 hover:underline">Esqueceu a senha?</button>
              </div>

              <button type="submit" :disabled="loading" 
                class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70">
                <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
                {{ loading ? 'Carregando...' : 'Entrar no Sistema' }}
              </button>
            </form>

            <div class="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3 text-center">
              <p class="text-sm text-slate-500">Novo por aqui? <button @click="modalRegistro = true" class="text-indigo-600 font-bold hover:underline">Criar conta</button></p>
              <button @click="modalMudarSenha = true" class="text-xs text-slate-400 hover:text-indigo-600 italic transition-colors">Mudar senha de acesso</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- MODAL DE CADASTRO -->
    <div v-if="modalRegistro" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div class="bg-indigo-600 p-6 flex justify-between items-center text-white font-bold uppercase tracking-wider text-sm">
          <div class="flex items-center gap-2"><UserPlus class="w-5 h-5" /> Novo Cadastro</div>
          <button @click="modalRegistro = false" class="hover:rotate-90 transition-transform"><X /></button>
        </div>

        <form @submit.prevent="cadastrarUsuario" class="p-8 space-y-4 max-h-[80vh] overflow-y-auto">
          <!-- Upload Foto Corrigido -->
          <div class="flex flex-col items-center mb-4">
            <div @click="triggerFileInput" class="relative w-24 h-24 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer overflow-hidden group hover:border-indigo-400 transition-colors">
              <img v-if="fotoPreview" :src="fotoPreview" class="w-full h-full object-cover" />
              <Camera v-else class="text-slate-300 w-8 h-8" />
              <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera class="text-white w-6 h-6" />
              </div>
              <input type="file" ref="fileInput" @change="handleFileUpload" class="hidden" accept="image/*" />
            </div>
            <span class="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest text-center">Clique na imagem para <br/> fazer o upload</span>
          </div>

          <div class="space-y-3">
            <input v-model="newUser.login" type="text" placeholder="Escolha um Login" required class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all" />
            
            <div class="grid grid-cols-2 gap-3">
              <input v-model="newUser.senha" type="password" placeholder="Senha" required class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all" />
              <input v-model="newUser.confirmarSenha" type="password" placeholder="Confirmar" required class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all" />
            </div>

            <input v-model="newUser.cpf" type="text" placeholder="CPF" class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all" />
            <input v-model="newUser.email" type="email" placeholder="E-mail" required class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all" />
            <input v-model="newUser.whatsapp" type="text" placeholder="WhatsApp" class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all" />
          </div>

          <div class="relative">
            <select v-model="newUser.tipo" required 
              class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all appearance-none text-slate-600">
              <option value="" disabled selected>Selecione o Tipo de Perfil</option>
              <option value="Cliente">Cliente</option>
              <option value="Fornecedor">Fornecedor</option>
              <option value="Vendedor">Vendedor</option>
              <option value="Transportadora">Transportadora</option>
              <option value="Afiliado">Afiliado</option>
              <option value="Revendedor">Revendedor</option>
            </select>
            <!-- Ícone de setinha para o select -->
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
              <svg class="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>

          <button type="submit" :disabled="loading" class="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-xl text-white font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
            <CheckCircle2 v-if="!loading" class="w-5 h-5" />
            <Loader2 v-else class="w-5 h-5 animate-spin" />
            Salvar meu Registro
          </button>
        </form>
      </div>
    </div>

    <!-- MODAL MUDAR SENHA -->
    <div v-if="modalMudarSenha" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in duration-300">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound class="w-8 h-8" />
          </div>
          <h3 class="text-xl font-bold text-slate-800">Alterar Senha</h3>
          <p class="text-slate-500 text-sm mt-1">Sua senha será atualizada instantaneamente.</p>
        </div>

        <div class="space-y-4">
          <input v-model="changePass.login" type="text" placeholder="Seu Login" class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all" />
          <input v-model="changePass.senhaAntiga" type="password" placeholder="Senha Atual" class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all" />
          <hr class="border-slate-100" />
          <input v-model="changePass.novaSenha" type="password" placeholder="Nova Senha" class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all" />
          <input v-model="changePass.confirmarNovaSenha" type="password" placeholder="Confirmar Nova Senha" class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all" />
          
          <div class="flex gap-2 pt-2">
            <button @click="modalMudarSenha = false" class="flex-1 py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors">Cancelar</button>
            <button @click="executarMudancaSenha" :disabled="loading" class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
              <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
              {{ loading ? '...' : 'Alterar' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL ESQUECI A SENHA -->
    <div v-if="modalEsqueci" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in duration-300">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail class="w-8 h-8" />
          </div>
          <h3 class="text-xl font-bold text-slate-800">Recuperar Acesso</h3>
          <p class="text-slate-500 text-sm mt-2">Enviaremos seus dados para o e-mail cadastrado.</p>
        </div>

        <input v-model="recoveryEmail" type="email" placeholder="Digite seu e-mail" class="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-amber-500 transition-all mb-4" />
        
        <button @click="recuperarSenha" :disabled="loading" class="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
          Enviar agora
        </button>
        <button @click="modalEsqueci = false" class="w-full mt-3 py-2 text-slate-400 text-sm hover:text-slate-600">Voltar ao login</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Animações nativas para a Logo */
.logo-animation {
  animation: logoSequence 4.5s forwards ease-in-out;
}

@keyframes logoSequence {
  0% { opacity: 0; transform: scale(0.95); filter: blur(10px); }
  30%, 75% { opacity: 1; transform: scale(1); filter: blur(0); }
  100% { opacity: 0; transform: scale(1.05); filter: blur(5px); }
}

/* Transições Vue */
.fade-splash-leave-active { transition: opacity 0.8s ease; }
.fade-splash-leave-to { opacity: 0; }

.fade-login-enter-active { transition: all 1s ease-out 0.5s; }
.fade-login-enter-from { opacity: 0; transform: translateY(20px); }
</style>