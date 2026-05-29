<template>
  <Teleport to="body">
    <transition name="edoc-modal">
      <div v-if="open" class="edoc-modal-overlay" @click.self="$emit('close')">
        <div class="edoc-modal" :style="{ maxWidth: width + 'px' }">
          <!-- Atmospheric layers — aurora drift + slow particle grain + scan beam -->
          <div class="modal-aurora" aria-hidden="true" />
          <div class="modal-grid" aria-hidden="true" />
          <div class="modal-scan" aria-hidden="true" />
          <span class="modal-corner tl" aria-hidden="true" />
          <span class="modal-corner tr" aria-hidden="true" />
          <span class="modal-corner bl" aria-hidden="true" />
          <span class="modal-corner br" aria-hidden="true" />

          <header class="modal-head">
            <div class="title-row">
              <div v-if="icon" class="title-icon">
                <span class="ic-glow" aria-hidden="true" />
                <component :is="icon" :size="18" />
              </div>
              <div class="title-text">
                <h3 v-if="title">
                  <span class="title-inner">{{ title }}</span>
                  <span class="title-sheen" aria-hidden="true" />
                </h3>
                <p v-if="subtitle">{{ subtitle }}</p>
              </div>
            </div>
            <button class="close-btn" @click="$emit('close')" aria-label="Close"><X :size="16" /></button>
          </header>
          <div class="modal-body"><slot /></div>
          <footer v-if="$slots.footer" class="modal-footer"><slot name="footer" /></footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { watch, onBeforeUnmount } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
  width: { type: Number, default: 580 },
})
const emit = defineEmits(['close'])

const onKey = (e) => { if (e.key === 'Escape') emit('close') }
watch(() => props.open, (v) => {
  if (v) { document.body.style.overflow = 'hidden'; window.addEventListener('keydown', onKey) }
  else { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
})
onBeforeUnmount(() => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) })
</script>

<style scoped>
.edoc-modal-overlay {
  position: fixed; inset: 0; z-index: 1100;
  display: flex; align-items: center; justify-content: center; padding: 28px;
  background:
    radial-gradient(80% 60% at 50% 0%, rgba(251,146,60,0.18), transparent 65%),
    radial-gradient(60% 50% at 50% 100%, rgba(251,191,36,0.10), transparent 65%),
    rgba(6, 6, 8, 0.52);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  overflow-y: auto;
}
.edoc-modal {
  position: relative; width: 100%;
  background:
    radial-gradient(120% 80% at 100% 0%, rgba(251,146,60,0.10), transparent 55%),
    radial-gradient(110% 80% at 0% 100%, rgba(251,191,36,0.08), transparent 55%),
    linear-gradient(180deg, rgba(22,18,22,0.78), rgba(16,15,18,0.74));
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 20px;
  backdrop-filter: blur(40px) saturate(170%);
  -webkit-backdrop-filter: blur(40px) saturate(170%);
  box-shadow:
    0 36px 90px -20px rgba(0,0,0,0.7),
    0 0 0 1px rgba(251,191,36,0.10),
    0 0 90px rgba(251,146,60,0.20),
    inset 0 1px 0 rgba(255,255,255,0.05);
  overflow: hidden;
  max-height: calc(100vh - 56px);
  display: flex; flex-direction: column;
  isolation: isolate;
}
/* Animated top accent — gold band that flows like liquid metal */
.edoc-modal::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg,
    rgba(251,191,36,0.35) 0%,
    #fbbf24 25%,
    #fb923c 50%,
    #fbbf24 75%,
    rgba(251,191,36,0.35) 100%);
  background-size: 220% 100%;
  z-index: 4;
  animation: edoc-modal-rail 5.5s linear infinite;
}
.edoc-modal::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1.2px;
  background: linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent);
  z-index: 4; opacity: 0.7;
}
@keyframes edoc-modal-rail { to { background-position: -220% 0; } }

/* Aurora drift — layered radial washes */
.modal-aurora {
  position: absolute; inset: -10%; z-index: 1; pointer-events: none;
  background:
    radial-gradient(40% 40% at 18% 8%, rgba(251,191,36,0.20), transparent 70%),
    radial-gradient(38% 38% at 86% 18%, rgba(251,146,60,0.18), transparent 70%),
    radial-gradient(45% 40% at 50% 100%, rgba(234,88,12,0.14), transparent 70%);
  filter: blur(8px);
  animation: edoc-aurora-pan 18s ease-in-out infinite;
  mix-blend-mode: screen;
  opacity: 0.85;
}
@keyframes edoc-aurora-pan {
  0%,100% { transform: translate(0,0) scale(1); }
  50%     { transform: translate(2%,-1%) scale(1.06); }
}
/* Subtle CRT-style grid overlay for the modern brutalist edge */
.modal-grid {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: radial-gradient(120% 80% at 50% 50%, #000 30%, transparent 90%);
  -webkit-mask-image: radial-gradient(120% 80% at 50% 50%, #000 30%, transparent 90%);
  opacity: 0.5;
}
/* Slow vertical scan beam */
.modal-scan {
  position: absolute; left: 0; right: 0; top: 0; height: 60%;
  z-index: 1; pointer-events: none;
  background: linear-gradient(180deg, transparent 0%, rgba(251,191,36,0.10) 50%, transparent 100%);
  animation: edoc-modal-scan 8s var(--edoc-ease, cubic-bezier(0.16, 1, 0.3, 1)) infinite;
  mix-blend-mode: overlay;
  opacity: 0.7;
}
@keyframes edoc-modal-scan {
  0%   { transform: translateY(-110%); opacity: 0; }
  20%  { opacity: 0.7; }
  80%  { opacity: 0.6; }
  100% { transform: translateY(220%); opacity: 0; }
}

/* Editorial corner marks — small L-shaped accents */
.modal-corner {
  position: absolute; width: 14px; height: 14px; z-index: 4; pointer-events: none;
  border: 1.4px solid rgba(251,191,36,0.55);
  filter: drop-shadow(0 0 6px rgba(251,146,60,0.4));
}
.modal-corner.tl { top: 10px; left: 10px; border-right: 0; border-bottom: 0; }
.modal-corner.tr { top: 10px; right: 10px; border-left: 0; border-bottom: 0; }
.modal-corner.bl { bottom: 10px; left: 10px; border-right: 0; border-top: 0; }
.modal-corner.br { bottom: 10px; right: 10px; border-left: 0; border-top: 0; }

.modal-head, .modal-body, .modal-footer { position: relative; z-index: 2; }
.modal-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;
  padding: 20px 24px 18px;
  border-bottom: 1px dashed rgba(251,191,36,0.16);
}
.title-row { display: flex; align-items: center; gap: 14px; }
.title-icon {
  position: relative;
  display: grid; place-items: center; width: 40px; height: 40px;
  background: linear-gradient(135deg, rgba(251,191,36,0.18), rgba(251,146,60,0.14));
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 12px;
  color: var(--hr-accent-gold);
  box-shadow: 0 6px 18px -6px rgba(251,146,60,0.55), inset 0 1px 0 rgba(255,255,255,0.06);
  animation: edoc-icon-float 4.2s ease-in-out infinite;
}
.title-icon .ic-glow {
  position: absolute; inset: -2px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(251,191,36,0.45), rgba(251,146,60,0.45));
  filter: blur(8px);
  z-index: -1;
  animation: edoc-icon-pulse 3s ease-in-out infinite;
}
@keyframes edoc-icon-float {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-1.5px); }
}
@keyframes edoc-icon-pulse {
  0%,100% { opacity: 0.35; }
  50%     { opacity: 0.7; }
}
.title-text { min-width: 0; flex: 1; }
.modal-head h3 {
  position: relative;
  margin: 0;
  font-size: 17.5px; font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--hr-text);
  overflow: hidden;
}
.title-inner { position: relative; z-index: 1; }
/* Subtle sheen sweep across the title */
.title-sheen {
  position: absolute; top: 0; bottom: 0; left: -30%; width: 30%;
  background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%);
  animation: edoc-title-sheen 6s ease-in-out infinite;
  pointer-events: none;
  z-index: 2;
}
@keyframes edoc-title-sheen {
  0%, 65% { transform: translateX(0); opacity: 0; }
  72%     { opacity: 1; }
  100%    { transform: translateX(700%); opacity: 0; }
}
.modal-head p { margin: 4px 0 0; font-size: 12px; color: var(--hr-text-muted); letter-spacing: 0.01em; }
.close-btn {
  display: grid; place-items: center; width: 34px; height: 34px; flex-shrink: 0;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--hr-border-strong);
  border-radius: 11px;
  color: var(--hr-text-secondary);
  cursor: pointer;
  transition: all 240ms var(--edoc-spring, cubic-bezier(0.16, 1, 0.3, 1));
}
.close-btn:hover {
  background: rgba(239,68,68,0.14);
  border-color: rgba(239,68,68,0.42);
  color: #fca5a5;
  transform: rotate(90deg) scale(1.06);
  box-shadow: 0 4px 14px -6px rgba(239,68,68,0.6);
}

.modal-body {
  padding: 22px 24px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: rgba(251,191,36,0.5) transparent;
}
.modal-body::-webkit-scrollbar { width: 8px; }
.modal-body::-webkit-scrollbar-track { background: transparent; }
.modal-body::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(251,191,36,0.5), rgba(251,146,60,0.5));
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
.modal-body::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(251,191,36,0.85), rgba(251,146,60,0.85));
  background-clip: padding-box;
}

.modal-footer {
  display: flex; gap: 8px; align-items: center;
  padding: 14px 24px;
  border-top: 1px solid rgba(255,255,255,0.06);
  background: linear-gradient(180deg, rgba(16,15,18,0.4), rgba(16,15,18,0.6));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* Refined enter / leave choreography */
.edoc-modal-enter-active, .edoc-modal-leave-active {
  transition: opacity 0.36s var(--edoc-ease, cubic-bezier(0.16, 1, 0.3, 1)), backdrop-filter 0.36s ease;
}
.edoc-modal-enter-from, .edoc-modal-leave-to { opacity: 0; }
.edoc-modal-enter-active .edoc-modal {
  transition:
    transform 0.5s var(--edoc-ease, cubic-bezier(0.16, 1, 0.3, 1)),
    opacity 0.5s var(--edoc-ease, cubic-bezier(0.16, 1, 0.3, 1)),
    filter 0.5s var(--edoc-ease, cubic-bezier(0.16, 1, 0.3, 1));
}
.edoc-modal-leave-active .edoc-modal {
  transition:
    transform 0.3s var(--edoc-spring, cubic-bezier(0.16, 1, 0.3, 1)),
    opacity 0.3s var(--edoc-spring, cubic-bezier(0.16, 1, 0.3, 1)),
    filter 0.3s var(--edoc-spring, cubic-bezier(0.16, 1, 0.3, 1));
}
.edoc-modal-enter-from .edoc-modal {
  transform: translateY(32px) scale(0.94) rotateX(8deg);
  opacity: 0;
  filter: blur(12px);
}
.edoc-modal-leave-to .edoc-modal {
  transform: translateY(14px) scale(0.985);
  opacity: 0;
  filter: blur(6px);
}

/* Reduced-motion mode */
@media (prefers-reduced-motion: reduce) {
  .edoc-modal::before, .modal-aurora, .modal-scan,
  .title-icon, .title-icon .ic-glow, .title-sheen { animation: none !important; }
  .edoc-modal-enter-from .edoc-modal,
  .edoc-modal-leave-to .edoc-modal { filter: none; transform: translateY(8px); }
}

/* ─── Light theme ─────────────────────────────────────────────────────── */
[data-theme="light"] .edoc-modal-overlay {
  background:
    radial-gradient(80% 60% at 50% 0%, rgba(234,88,12,0.16), transparent 65%),
    radial-gradient(60% 50% at 50% 100%, rgba(251,191,36,0.10), transparent 65%),
    rgba(40, 25, 10, 0.30);
}
[data-theme="light"] .edoc-modal {
  background:
    radial-gradient(120% 80% at 100% 0%, rgba(234,88,12,0.10), transparent 55%),
    radial-gradient(110% 80% at 0% 100%, rgba(251,191,36,0.10), transparent 55%),
    linear-gradient(180deg, rgba(255,250,240,0.92), rgba(255,246,232,0.86));
  border-color: rgba(40,25,10,0.12);
  box-shadow:
    0 36px 90px -20px rgba(40,25,10,0.4),
    0 0 0 1px rgba(217,119,6,0.18),
    0 0 90px rgba(217,119,6,0.18),
    inset 0 1px 0 rgba(255,255,255,0.7);
}
[data-theme="light"] .modal-grid {
  background-image:
    linear-gradient(rgba(120,53,15,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(120,53,15,0.06) 1px, transparent 1px);
}
[data-theme="light"] .modal-corner { border-color: rgba(180,83,9,0.55); filter: drop-shadow(0 0 4px rgba(217,119,6,0.32)); }
[data-theme="light"] .modal-head { border-bottom-color: rgba(180,83,9,0.22); }
[data-theme="light"] .modal-head h3 { color: #1a1410; }
[data-theme="light"] .modal-head p { color: #6b5840; }
[data-theme="light"] .title-icon { background: linear-gradient(135deg, rgba(217,119,6,0.18), rgba(234,88,12,0.14)); border-color: rgba(217,119,6,0.42); color: #b45309; box-shadow: 0 6px 18px -6px rgba(217,119,6,0.5), inset 0 1px 0 rgba(255,255,255,0.5); }
[data-theme="light"] .close-btn { background: rgba(255,250,240,0.72); border-color: rgba(40,25,10,0.16); color: #6b5840; }
[data-theme="light"] .close-btn:hover { background: rgba(220,38,38,0.14); border-color: rgba(220,38,38,0.42); color: #b91c1c; }
[data-theme="light"] .modal-body { scrollbar-color: rgba(217,119,6,0.45) transparent; }
[data-theme="light"] .modal-body::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(217,119,6,0.5), rgba(234,88,12,0.5)); background-clip: padding-box; }
[data-theme="light"] .modal-body::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, rgba(217,119,6,0.85), rgba(234,88,12,0.85)); background-clip: padding-box; }
[data-theme="light"] .modal-footer { background: linear-gradient(180deg, rgba(255,244,220,0.5), rgba(255,244,220,0.7)); border-top-color: rgba(40,25,10,0.1); }
</style>
