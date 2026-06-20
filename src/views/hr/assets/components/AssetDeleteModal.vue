<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="adm-overlay" as="div"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @mousedown.self="!loading && $emit('close')">
        <Motion class="adm-panel" as="div" role="alertdialog" aria-modal="true"
          :initial="{ opacity: 0, y: 24, scale: 0.95, filter: 'blur(10px)' }"
          :animate="{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }"
          :exit="{ opacity: 0, y: 14, scale: 0.97, filter: 'blur(6px)' }"
          :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }" @mousedown.stop>
          <header class="adm-head">
            <span class="adm-aura" aria-hidden="true" />
            <Motion as="span" class="adm-warn"
              :initial="{ scale: 0.5, rotate: -12, opacity: 0 }" :animate="{ scale: 1, rotate: 0, opacity: 1 }"
              :transition="{ type: 'spring', stiffness: 380, damping: 14, delay: 0.05 }">
              <span class="adm-warn-ring" aria-hidden="true" />
              <AlertTriangle :size="22" />
            </Motion>
            <div class="adm-titles">
              <h3>{{ title }}</h3>
              <p>This action is permanent and can't be undone.</p>
            </div>
            <button class="adm-x" :disabled="loading" @click="$emit('close')" aria-label="Close"><X :size="18" /></button>
          </header>

          <div class="adm-body">
            <Motion as="div" class="adm-item"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
              <span class="adm-item-ic"><component :is="icon" :size="18" /></span>
              <div class="adm-item-meta">
                <span class="adm-item-name">{{ itemName || 'this item' }}</span>
                <span v-if="itemMeta" class="adm-item-sub">{{ itemMeta }}</span>
              </div>
              <span class="adm-strike" aria-hidden="true" />
            </Motion>

            <ul v-if="consequences.length" class="adm-cons">
              <Motion v-for="(c, i) in consequences" :key="i" as="li"
                :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.36, delay: 0.18 + i * 0.06, ease: [0.16, 1, 0.3, 1] }">
                <Dot :size="14" /> {{ c }}
              </Motion>
            </ul>

            <Motion v-if="reasons.length" as="div" class="adm-reasons"
              :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.26, ease: [0.16, 1, 0.3, 1] }">
              <span class="adm-lab">Reason <i v-if="requireReason">*</i></span>
              <div class="adm-chips">
                <Motion v-for="(r, i) in reasons" :key="r" as="button" type="button" class="adm-chip" :class="{ on: selectedReason === r }"
                  :initial="{ opacity: 0, scale: 0.9 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.3, delay: 0.3 + i * 0.04, ease: [0.16, 1, 0.3, 1] }"
                  :whileTap="{ scale: 0.94 }" @click="selectedReason = r">
                  <span class="adm-chip-tick"><Check :size="11" /></span>{{ r }}
                </Motion>
              </div>
              <Presence>
                <Motion v-if="isOther" as="textarea" class="adm-note" rows="2" v-model="note" placeholder="Add a short note…"
                  :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
                  :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }" />
              </Presence>
            </Motion>
          </div>

          <footer class="adm-foot">
            <button class="as-btn as-btn-ghost" :disabled="loading" @click="$emit('close')">Cancel</button>
            <button class="adm-del" :disabled="!canConfirm || loading" @click="confirm">
              <Loader v-if="loading" :size="15" class="spin" />
              <Trash2 v-else :size="15" />
              {{ loading ? 'Working…' : confirmLabel }}
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
.adm-overlay { position: fixed; inset: 0; z-index: 1450; display: grid; place-items: center; padding: 24px;
  background: rgba(6, 5, 4, 0.64); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
[data-theme="light"] .adm-overlay { background: rgba(60, 40, 15, 0.32); }
.adm-panel { width: 100%; max-width: 460px; max-height: 92vh; overflow: hidden; display: flex; flex-direction: column;
  background: var(--as-glass-deep); backdrop-filter: var(--as-glass-blur); -webkit-backdrop-filter: var(--as-glass-blur);
  border: 1px solid color-mix(in srgb, var(--as-cond-poor) 26%, var(--as-border-strong)); border-radius: 22px; box-shadow: var(--as-glass-shadow); }
.adm-head { position: relative; overflow: hidden; display: flex; align-items: center; gap: 13px; padding: 20px 20px 16px; border-bottom: 1px solid var(--as-border-soft); }
.adm-aura { position: absolute; top: -70px; left: -20px; width: 240px; height: 170px; pointer-events: none; border-radius: 50%;
  background: radial-gradient(circle, rgba(248,113,113,0.22), transparent 70%); animation: adm-aura 5.5s ease-in-out infinite; }
.adm-warn { position: relative; display: inline-grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
  color: var(--as-cond-poor); background: color-mix(in srgb, var(--as-cond-poor) 16%, transparent); border: 1px solid color-mix(in srgb, var(--as-cond-poor) 34%, transparent); }
.adm-warn-ring { position: absolute; inset: -3px; border-radius: 16px; border: 1.5px solid color-mix(in srgb, var(--as-cond-poor) 40%, transparent); animation: adm-ring 2.2s ease-out infinite; }
.adm-titles { flex: 1; min-width: 0; }
.adm-titles h3 { margin: 0; font-size: 17px; font-weight: 800; color: var(--as-text); }
.adm-titles p { margin: 2px 0 0; font-size: 12px; color: var(--as-text-muted); }
.adm-x { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9px;
  border: 1px solid var(--as-border-soft); background: var(--as-surface); color: var(--as-text-muted); cursor: pointer; transition: all 0.2s; }
.adm-x:hover:not(:disabled) { color: var(--as-text); background: var(--as-surface-elevated); transform: rotate(90deg); }
.adm-x:disabled { opacity: 0.5; cursor: not-allowed; }
.adm-body { padding: 18px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.adm-item { position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; padding: 13px 15px; border-radius: 14px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.adm-item-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
  color: var(--as-cond-poor); background: color-mix(in srgb, var(--as-cond-poor) 12%, transparent); border: 1px solid color-mix(in srgb, var(--as-cond-poor) 26%, transparent); }
.adm-item-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.adm-item-name { font-size: 14px; font-weight: 700; color: var(--as-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.adm-item-sub { font-size: 11.5px; color: var(--as-text-muted); }
.adm-strike { position: absolute; left: 12px; right: 12px; top: 50%; height: 2px; border-radius: 2px; transform: scaleX(0); transform-origin: left center;
  background: linear-gradient(90deg, transparent, var(--as-cond-poor), transparent); animation: adm-strike 0.6s var(--as-spring) 0.55s forwards; }
.adm-cons { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.adm-cons li { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--as-text-secondary); }
.adm-cons li :deep(svg) { color: var(--as-cond-poor); flex-shrink: 0; }
.adm-reasons { display: flex; flex-direction: column; gap: 9px; }
.adm-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); }
.adm-lab i { color: var(--as-cond-poor); font-style: normal; margin-left: 2px; }
.adm-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.adm-chip { display: inline-flex; align-items: center; gap: 0; padding: 7px 12px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600;
  color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: color 0.22s, background 0.22s, border-color 0.22s; }
.adm-chip:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.adm-chip.on { color: var(--as-cond-poor); background: color-mix(in srgb, var(--as-cond-poor) 13%, transparent); border-color: color-mix(in srgb, var(--as-cond-poor) 36%, transparent); }
.adm-chip-tick { display: inline-grid; place-items: center; width: 0; height: 14px; overflow: hidden; opacity: 0; transition: width 0.25s var(--as-spring), opacity 0.2s, margin 0.25s; }
.adm-chip.on .adm-chip-tick { width: 14px; opacity: 1; margin-right: 5px; }
.adm-note { width: 100%; font: inherit; font-size: 13px; color: var(--as-text); background: var(--as-surface); border: 1px solid var(--as-border-soft);
  border-radius: 11px; padding: 9px 12px; resize: vertical; box-sizing: border-box; overflow: hidden; }
.adm-note:focus { outline: none; border-color: color-mix(in srgb, var(--as-cond-poor) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-cond-poor) 12%, transparent); }
.adm-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 15px 20px; border-top: 1px solid var(--as-border-soft); }
.adm-del { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 7px; font: inherit; font-size: 13.5px; font-weight: 650;
  padding: 10px 18px; border-radius: 12px; border: 1px solid transparent; cursor: pointer; color: #fff;
  background: linear-gradient(135deg, #f87171, #dc2626); box-shadow: 0 10px 26px -12px rgba(220,38,38,0.7); transition: box-shadow 0.3s, transform 0.2s, opacity 0.2s; }
.adm-del:hover:not(:disabled) { box-shadow: 0 16px 34px -12px rgba(220,38,38,0.85); transform: translateY(-1px); }
.adm-del:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: as-spin 0.9s linear infinite; }
@keyframes adm-aura { 0%, 100% { opacity: 0.55; transform: translate(0,0) scale(1); } 50% { opacity: 1; transform: translate(16px, 6px) scale(1.16); } }
@keyframes adm-ring { 0% { transform: scale(0.92); opacity: 0.7; } 70%, 100% { transform: scale(1.25); opacity: 0; } }
@keyframes adm-strike { to { transform: scaleX(1); } }
@media (prefers-reduced-motion: reduce) { .adm-aura, .adm-warn-ring, .adm-strike { animation: none !important; } .adm-strike { transform: scaleX(1); } .adm-x:hover { transform: none; } }
</style>
