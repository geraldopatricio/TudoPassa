<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-vue-next'
const props = defineProps({ open: Boolean, images: { type: Array, default: () => [] }, title: { type: String, default: 'Fotos do produto' } })
const emit = defineEmits(['close'])
const index = ref(0)
const dialog = ref(null)
const current = computed(() => props.images[index.value])
let previousFocus, previousOverflow, touchX = 0
const move = delta => { if (props.images.length) index.value = (index.value + delta + props.images.length) % props.images.length }
const keydown = event => {
  if (event.key === 'Escape') emit('close')
  if (event.key === 'ArrowLeft') move(-1)
  if (event.key === 'ArrowRight') move(1)
  if (event.key === 'Tab') {
    const buttons = Array.from(dialog.value?.querySelectorAll('button') || [])
    const first = buttons[0], last = buttons[buttons.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
}
const restore = () => {
  window.removeEventListener('keydown', keydown)
  if (previousOverflow !== undefined) document.body.style.overflow = previousOverflow
  previousFocus?.focus()
  previousOverflow = undefined
}
watch(() => props.open, async open => {
  if (open) {
    index.value = 0
    previousFocus = document.activeElement
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', keydown)
    await nextTick()
    dialog.value?.querySelector('button')?.focus()
  } else restore()
})
onUnmounted(restore)
</script>

<template>
  <Teleport to="body">
    <Transition name="gallery">
      <div v-if="open" ref="dialog" role="dialog" aria-modal="true" :aria-label="title" class="gallery-overlay" @click.self="emit('close')">
        <section class="gallery-panel">
          <header class="gallery-header">
            <div><h2>{{ title }}</h2><p aria-live="polite">{{ images.length ? index + 1 : 0 }} / {{ images.length }} fotos</p></div>
            <button aria-label="Fechar galeria" @click="emit('close')"><X /></button>
          </header>
          <div class="gallery-stage" @touchstart.passive="touchX = $event.changedTouches[0].clientX" @touchend.passive="Math.abs($event.changedTouches[0].clientX - touchX) > 50 && move($event.changedTouches[0].clientX < touchX ? 1 : -1)">
            <img v-if="current" :key="current" :src="current" :alt="`${title} — foto ${index + 1}`" />
            <div v-else class="gallery-empty"><ImageIcon :size="48" /><p>Produto sem fotos</p></div>
            <template v-if="images.length > 1">
              <button class="gallery-prev" aria-label="Foto anterior" @click="move(-1)"><ChevronLeft /></button>
              <button class="gallery-next" aria-label="Próxima foto" @click="move(1)"><ChevronRight /></button>
            </template>
          </div>
          <nav v-if="images.length > 1" aria-label="Selecionar foto" class="gallery-thumbnails">
            <button v-for="(src, i) in images" :key="src" :aria-label="`Ver foto ${i + 1}`" :aria-current="index === i ? 'true' : undefined" :class="{ active: index === i }" @click="index = i"><img :src="src" :alt="`Miniatura ${i + 1}`" /></button>
          </nav>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.gallery-overlay{position:fixed;inset:0;z-index:1000;background:rgba(2,6,23,.92);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:20px;color:white}
.gallery-panel{width:min(100%,1000px);max-height:95dvh;display:flex;flex-direction:column;border:1px solid #ffffff20;border-radius:24px;background:#0f172a;overflow:hidden;box-shadow:0 25px 80px #0008}
.gallery-header{display:flex;align-items:center;justify-content:space-between;padding:18px 24px;gap:16px}.gallery-header h2{font-size:16px;font-weight:700;overflow-wrap:anywhere}.gallery-header p{font-size:12px;color:#94a3b8;margin-top:4px}
.gallery-panel button{cursor:pointer;border-radius:50%;padding:10px;background:#ffffff15;color:white;display:flex;align-items:center;justify-content:center}.gallery-panel button:hover{background:#ffffff30}.gallery-panel button:focus-visible{outline:3px solid #818cf8;outline-offset:3px}
.gallery-stage{position:relative;min-height:180px;height:65dvh;background:#020617;display:flex;align-items:center;justify-content:center;overflow:hidden}.gallery-stage>img{width:100%;height:100%;object-fit:contain;padding:12px 56px}.gallery-prev,.gallery-next{position:absolute;top:50%;transform:translateY(-50%)}.gallery-prev{left:12px}.gallery-next{right:12px}
.gallery-thumbnails{display:flex;justify-content:center;gap:10px;padding:16px;overflow-x:auto;flex-shrink:0}.gallery-thumbnails button{padding:0;border-radius:12px;border:2px solid transparent;overflow:hidden;width:64px;height:64px;flex-shrink:0;opacity:.6}.gallery-thumbnails button.active{border-color:#818cf8;opacity:1}.gallery-thumbnails img{width:100%;height:100%;object-fit:cover}.gallery-empty{text-align:center;color:#94a3b8;display:grid;justify-items:center;gap:12px}
.gallery-enter-active,.gallery-leave-active{transition:opacity .2s}.gallery-enter-from,.gallery-leave-to{opacity:0}
@media(max-width:600px){.gallery-overlay{padding:8px}.gallery-stage{height:60dvh}.gallery-header{padding:16px}.gallery-thumbnails{gap:6px}.gallery-thumbnails button{width:46px;height:46px}}
@media(prefers-reduced-motion:reduce){.gallery-enter-active,.gallery-leave-active{transition:none}}
</style>
