<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="dm-overlay" as="div"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @mousedown.self="!loading && $emit('close')">
        <Motion class="dm-panel" as="div" role="alertdialog" aria-modal="true"
          :initial="{ opacity: 0, y: 24, scale: 0.95, filter: 'blur(10px)' }"
          :animate="{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }"
          :exit="{ opacity: 0, y: 14, scale: 0.97, filter: 'blur(6px)' }"
          :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }" @mousedown.stop>

          <!-- header -->
          <header class="dm-head">
            <span class="dm-aura" aria-hidden="true" />
            <Motion as="span" class="dm-warn"
              :initial="{ scale: 0.5, rotate: -12, opacity: 0 }" :animate="{ scale: 1, rotate: 0, opacity: 1 }"
              :transition="{ type: 'spring', stiffness: 380, damping: 14, delay: 0.05 }">
              <span class="dm-warn-ring" aria-hidden="true" />
              <AlertTriangle :size="22" />
            </Motion>
            <div class="dm-titles">
              <h3>{{ title }}</h3>
              <p>This action is permanent and can't be undone.</p>
            </div>
            <button class="dm-x" :disabled="loading" @click="$emit('close')" aria-label="Close"><X :size="18" /></button>
          </header>

          <div class="dm-body">
            <!-- the target -->
            <Motion as="div" class="dm-item"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
              <span class="dm-item-ic"><component :is="icon" :size="18" /></span>
              <div class="dm-item-meta">
                <span class="dm-item-name">{{ itemName || 'this item' }}</span>
                <span v-if="itemMeta" class="dm-item-sub">{{ itemMeta }}</span>
              </div>
              <span class="dm-strike" aria-hidden="true" />
            </Motion>

            <!-- consequences -->
            <ul v-if="consequences.length" class="dm-cons">
              <Motion v-for="(c, i) in consequences" :key="i" as="li"
                :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.36, delay: 0.18 + i * 0.06, ease: [0.16, 1, 0.3, 1] }">
                <Dot :size="14" /> {{ c }}
              </Motion>
            </ul>

            <!-- reason workflow -->
            <Motion v-if="reasons.length" as="div" class="dm-reasons"
              :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.26, ease: [0.16, 1, 0.3, 1] }">
              <span class="dm-lab">Reason for deleting <i v-if="requireReason">*</i></span>
              <div class="dm-chips">
                <Motion v-for="(r, i) in reasons" :key="r" as="button" type="button" class="dm-chip" :class="{ on: selectedReason === r }"
                  :initial="{ opacity: 0, scale: 0.9 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.3, delay: 0.3 + i * 0.04, ease: [0.16, 1, 0.3, 1] }"
                  :whileTap="{ scale: 0.94 }" @click="selectedReason = r">
                  <span class="dm-chip-tick"><Check :size="11" /></span>{{ r }}
                </Motion>
              </div>
              <Presence>
                <Motion v-if="isOther" as="textarea" class="dm-note" rows="2" v-model="note" placeholder="Add a short note…"
                  :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
                  :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }" />
              </Presence>
            </Motion>
          </div>

          <footer class="dm-foot">
            <button class="trn-btn trn-btn-ghost" :disabled="loading" @click="$emit('close')">Cancel</button>
            <button class="dm-del" :disabled="!canConfirm || loading" @click="confirm">
              <Loader v-if="loading" :size="15" class="spin" />
              <Trash2 v-else :size="15" />
              {{ loading ? 'Deleting…' : confirmLabel }}
            </button>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { AlertTriangle, X, Trash2, Check, Loader, Dot } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Delete item' },
  itemName: { type: String, default: '' },
  itemMeta: { type: String, default: '' },
  icon: { type: [Object, Function], default: () => Trash2 },
  reasons: { type: Array, default: () => [] },
  requireReason: { type: Boolean, default: false },
  consequences: { type: Array, default: () => [] },
  confirmLabel: { type: String, default: 'Delete' },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm'])

const selectedReason = ref('')
const note = ref('')
const isOther = computed(() => /other/i.test(selectedReason.value))
const canConfirm = computed(() => !props.requireReason || !!selectedReason.value)

watch(() => props.open, (o) => {
  if (o) { selectedReason.value = ''; note.value = ''; document.body.style.overflow = 'hidden' }
  else { document.body.style.overflow = '' }
}, { immediate: true })
onBeforeUnmount(() => { document.body.style.overflow = '' })

const onKey = (e) => { if (e.key === 'Escape' && props.open && !props.loading) emit('close') }
if (typeof window !== 'undefined') window.addEventListener('keydown', onKey)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const confirm = () => {
  if (!canConfirm.value || props.loading) return
  const reason = isOther.value && note.value.trim() ? note.value.trim() : selectedReason.value
  emit('confirm', { reason })
}
</script>

<style scoped>
.dm-overlay { position: fixed; inset: 0; z-index: 1450; display: grid; place-items: center; padding: 24px;
  background: rgba(6, 5, 4, 0.64); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
[data-theme="light"] .dm-overlay { background: rgba(60, 40, 15, 0.32); }

.dm-panel { width: 100%; max-width: 460px; max-height: 92vh; overflow: hidden; display: flex; flex-direction: column;
  background: var(--trn-glass-deep); backdrop-filter: var(--trn-glass-blur); -webkit-backdrop-filter: var(--trn-glass-blur);
  border: 1px solid color-mix(in srgb, var(--trn-st-failed) 26%, var(--trn-border-strong)); border-radius: 22px; box-shadow: var(--trn-glass-shadow); }

/* header */
.dm-head { position: relative; overflow: hidden; display: flex; align-items: center; gap: 13px; padding: 20px 20px 16px; border-bottom: 1px solid var(--trn-border-soft); }
.dm-aura { position: absolute; top: -70px; left: -20px; width: 240px; height: 170px; pointer-events: none; border-radius: 50%;
  background: radial-gradient(circle, rgba(248,113,113,0.22), transparent 70%); animation: dm-aura 5.5s ease-in-out infinite; }
.dm-warn { position: relative; display: inline-grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
  color: var(--trn-st-failed); background: color-mix(in srgb, var(--trn-st-failed) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--trn-st-failed) 34%, transparent); animation: dm-shake 0.6s ease 0.45s 1; }
.dm-warn-ring { position: absolute; inset: -3px; border-radius: 16px; border: 1.5px solid color-mix(in srgb, var(--trn-st-failed) 40%, transparent); animation: dm-ring 2.2s ease-out infinite; }
.dm-titles { flex: 1; min-width: 0; }
.dm-titles h3 { margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -0.01em; color: var(--trn-text); }
.dm-titles p { margin: 2px 0 0; font-size: 12px; color: var(--trn-text-muted); }
.dm-x { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-muted); cursor: pointer; transition: all 0.2s; }
.dm-x:hover:not(:disabled) { color: var(--trn-text); background: var(--trn-surface-elevated); transform: rotate(90deg); }
.dm-x:disabled { opacity: 0.5; cursor: not-allowed; }

/* body */
.dm-body { padding: 18px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }

.dm-item { position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; padding: 13px 15px; border-radius: 14px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.dm-item-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
  color: var(--trn-st-failed); background: color-mix(in srgb, var(--trn-st-failed) 12%, transparent); border: 1px solid color-mix(in srgb, var(--trn-st-failed) 26%, transparent); }
.dm-item-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.dm-item-name { font-size: 14px; font-weight: 700; color: var(--trn-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dm-item-sub { font-size: 11.5px; color: var(--trn-text-muted); }
.dm-strike { position: absolute; left: 12px; right: 12px; top: 50%; height: 2px; border-radius: 2px; transform: scaleX(0); transform-origin: left center;
  background: linear-gradient(90deg, transparent, var(--trn-st-failed), transparent); animation: dm-strike 0.6s var(--trn-spring) 0.55s forwards; }

.dm-cons { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.dm-cons li { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--trn-text-secondary); }
.dm-cons li :deep(svg) { color: var(--trn-st-failed); flex-shrink: 0; }

.dm-reasons { display: flex; flex-direction: column; gap: 9px; }
.dm-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trn-text-dim); }
.dm-lab i { color: var(--trn-st-failed); font-style: normal; margin-left: 2px; }
.dm-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.dm-chip { display: inline-flex; align-items: center; gap: 0; padding: 7px 12px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600;
  color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: color 0.22s, background 0.22s, border-color 0.22s; }
.dm-chip:hover { color: var(--trn-text); border-color: var(--trn-border-strong); }
.dm-chip.on { color: var(--trn-st-failed); background: color-mix(in srgb, var(--trn-st-failed) 13%, transparent); border-color: color-mix(in srgb, var(--trn-st-failed) 36%, transparent); }
.dm-chip-tick { display: inline-grid; place-items: center; width: 0; height: 14px; overflow: hidden; opacity: 0; transition: width 0.25s var(--trn-spring), opacity 0.2s, margin 0.25s; }
.dm-chip.on .dm-chip-tick { width: 14px; opacity: 1; margin-right: 5px; }
.dm-note { width: 100%; font: inherit; font-size: 13px; color: var(--trn-text); background: var(--trn-surface); border: 1px solid var(--trn-border-soft);
  border-radius: 11px; padding: 9px 12px; resize: vertical; box-sizing: border-box; overflow: hidden; }
.dm-note:focus { outline: none; border-color: color-mix(in srgb, var(--trn-st-failed) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-st-failed) 12%, transparent); }

/* footer */
.dm-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 15px 20px; border-top: 1px solid var(--trn-border-soft); }
.dm-del { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 7px; font: inherit; font-size: 13.5px; font-weight: 650;
  padding: 10px 18px; border-radius: 12px; border: 1px solid transparent; cursor: pointer; color: #fff;
  background: linear-gradient(135deg, #f87171, #dc2626); box-shadow: 0 10px 26px -12px rgba(220,38,38,0.7); transition: box-shadow 0.3s, transform 0.2s, opacity 0.2s; }
.dm-del:hover:not(:disabled) { box-shadow: 0 16px 34px -12px rgba(220,38,38,0.85); transform: translateY(-1px); }
.dm-del::after { content: ''; position: absolute; top: 0; bottom: 0; left: -60%; width: 45%; transform: skewX(-18deg); opacity: 0;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,0.4), transparent); }
.dm-del:hover:not(:disabled)::after { animation: dm-sheen 0.9s ease; }
.dm-del:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: trn-orbit-spin 0.9s linear infinite; }

@keyframes dm-aura { 0%, 100% { opacity: 0.55; transform: translate(0,0) scale(1); } 50% { opacity: 1; transform: translate(16px, 6px) scale(1.16); } }
@keyframes dm-ring { 0% { transform: scale(0.92); opacity: 0.7; } 70%, 100% { transform: scale(1.25); opacity: 0; } }
@keyframes dm-shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-3px) rotate(-3deg); } 40% { transform: translateX(3px) rotate(3deg); } 60% { transform: translateX(-2px); } 80% { transform: translateX(2px); } }
@keyframes dm-strike { to { transform: scaleX(1); } }
@keyframes dm-sheen { 0% { left: -60%; opacity: 0; } 12% { opacity: 1; } 100% { left: 120%; opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .dm-aura, .dm-warn, .dm-warn-ring, .dm-strike { animation: none !important; }
  .dm-strike { transform: scaleX(1); }
  .dm-x:hover { transform: none; }
}
</style>
