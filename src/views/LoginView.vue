<script setup>
import { ref, onMounted } from 'vue'
import { Eye, EyeOff, Lock } from 'lucide-vue-next'

const showPassword = ref(false)
const email = ref('')
const password = ref('')

// Estado para controlar o Splash Screen
const isAppReady = ref(false)

onMounted(() => {
  // 1.5s (fade in) + 2s (espera) + 1s (fade out) = aprox 4.5 segundos de processo
  setTimeout(() => {
    isAppReady.value = true
  }, 4500)
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/50">
    
    <!-- Tela de Splash (Logo) -->
    <Transition name="fade-splash">
      <div v-if="!isAppReady" class="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <img 
          src="/assets/img/logoDegrade.png" 
          alt="Logo" 
          class="h-[400px] w-auto object-contain logo-animation"
        />
      </div>
    </Transition>

    <!-- Conteúdo do Login -->
    <Transition name="fade-login">
      <div v-if="isAppReady" class="min-h-screen flex items-center justify-center p-6">
        <div class="w-full max-w-[400px]">
          <!-- Logo/Header -->
          <div class="text-center mb-10">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 mb-6">
              <Lock class="text-white w-8 h-8" />
            </div>

            <div class="flex items-center justify-center gap-3">
              <h1 class="text-3xl font-extrabold text-slate-800 tracking-tight">
                TUDO PASSA
              </h1>
            </div>

            <p class="text-slate-500 mt-2 font-medium">Bem-vindo ao seu painel de vendas</p>
          </div>

          <div class="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-100">
            <form @submit.prevent="$router.push('/pdv')" class="space-y-6">
              
              <!-- Campo Usuário -->
              <div class="relative">
                <input type="text" id="user" v-model="email" placeholder=" "
                  class="peer w-full px-4 py-4 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-transparent" />
                <label for="user" 
                  class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-all 
                  peer-focus:-top-0 peer-focus:left-3 peer-focus:text-xs peer-focus:text-indigo-600 peer-focus:bg-white peer-focus:px-2
                  peer-[:not(:placeholder-shown)]:-top-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2">
                  Usuário ou E-mail
                </label>
              </div>

              <!-- Campo Senha -->
              <div class="relative">
                <input :type="showPassword ? 'text' : 'password'" id="pass" v-model="password" placeholder=" "
                  class="peer w-full px-4 py-4 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-transparent" />
                <label for="pass" 
                  class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-all 
                  peer-focus:-top-0 peer-focus:left-3 peer-focus:text-xs peer-focus:text-indigo-600 peer-focus:bg-white peer-focus:px-2
                  peer-[:not(:placeholder-shown)]:-top-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2">
                  Senha
                </label>
                <button type="button" @click="showPassword = !showPassword" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors">
                  <Eye v-if="!showPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </div>

              <div class="flex justify-end">
                <a href="#" class="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">Esqueceu a senha?</a>
              </div>

              <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]">
                Entrar no Sistema
              </button>
            </form>

            <div class="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3 text-center">
              <p class="text-sm text-slate-500">Novo por aqui? <a href="#" class="text-indigo-600 font-bold hover:underline">Criar conta</a></p>
              <a href="#" class="text-xs text-slate-400 hover:text-slate-600 italic">Trocar senha de acesso</a>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Animação complexa da Logo (Fade in -> Espera -> Fade out) */
.logo-animation {
  animation: logoSequence 4.5s forwards ease-in-out;
}

@keyframes logoSequence {
  0% {
    opacity: 0;
    transform: scale(0.95);
    filter: blur(10px);
  }
  30% { /* Aparece em 1.35s */
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
  75% { /* Mantém visível por mais 2 segundos */
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
  100% { /* Some no final */
    opacity: 0;
    transform: scale(1.05);
    filter: blur(5px);
  }
}

/* Transição de saída da tela de Splash */
.fade-splash-leave-active {
  transition: opacity 0.8s ease;
}
.fade-splash-leave-to {
  opacity: 0;
}

/* Transição de entrada do formulário de Login */
.fade-login-enter-active {
  transition: all 1s delay 0.5s ease-out;
}
.fade-login-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
</style>