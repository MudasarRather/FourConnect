<template>
  <!-- Reusable travel-module delete workflow modal.
       Two-outcome (Deactivate ↔ Delete) with tone-morph, target placard,
       optional in-use lock, dynamic consequences and an audit-logged reason.
       Driven entirely by props so every travel master (categories, policies, …)
       gets the same enterprise delete process. -->
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="dm-ov" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @mousedown.self="!loading && $emit('close')">
        <Motion as="div" class="dm" role="alertdialog" aria-modal="true" :style="{ '--tone': tone, '--tone-soft': toneSoft }"
          :initial="{ opacity: 0, y: 22, scale: 0.95, filter: 'blur(10px)' }"
          :animate="{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }"
          :exit="{ opacity: 0, y: 14, scale: 0.97, filter: 'blur(6px)' }"
          :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }" @mousedown.stop>

          <header class="dm-head">
            <span class="dm-aura" aria-hidden="true" />
            <Motion as="span" class="dm-warn" :key="String(isDelete)"
              :initial="{ scale: 0.5, rotate: -12, opacity: 0 }" :animate="{ scale: 1, rotate: 0, opacity: 1 }"
              :transition="{ type: 'spring', stiffness: 360, damping: 14 }">
              <span class="dm-warn-ring" aria-hidden="true" />
              <component :is="isDelete ? Trash2 : EyeOff" :size="21" />
            </Motion>
            <div class="dm-titles">
              <h3>{{ isDelete ? `Delete ${entityLabel}` : `Deactivate ${entityLabel}` }}</h3>
              <p>{{ isDelete ? 'Permanent — this record and its config are gone for good.' : 'Reversible — it is hidden but kept on file.' }}</p>
            </div>
            <button class="dm-x" :disabled="loading" aria-label="Close" @click="$emit('close')"><X :size="17" /></button>
          </header>

          <div class="dm-body">
            <!-- target placard -->
            <div class="dm-item" :style="{ '--c': accent }">
              <span class="dm-item-ic"><component :is="icon" :size="18" /></span>
              <div class="dm-item-meta">
                <span class="dm-item-name">{{ name || `this ${entityLabel}` }}</span>
                <span v-if="meta" class="dm-item-sub trv-mono">{{ meta }}</span>
              </div>
              <div v-if="tags.length" class="dm-item-tags">
                <span v-for="(t, i) in tags" :key="i" class="dm-item-tag" :class="{ hot: t.hot }">
                  <component v-if="t.icon" :is="t.icon" :size="11" /> {{ t.text }}
                </span>
              </div>
              <span v-if="!isDelete" class="dm-strike" aria-hidden="true" />
            </div>

            <!-- in-use lock note -->
            <Motion v-if="locked" as="div" class="dm-lock"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.36, delay: 0.08 }">
              <Lock :size="14" />
              <span>{{ lockNote }}</span>
            </Motion>

            <!-- outcome selector -->
            <div v-else-if="canDeactivate" class="dm-modes">
              <span class="dm-lab">Choose what happens</span>
              <div class="dm-mode-grid">
                <button type="button" class="dm-mode" :class="{ on: mode === 'deactivate' }" style="--m:#fb923c" @click="mode = 'deactivate'">
                  <span class="dm-mode-tick"><Check :size="12" /></span>
                  <EyeOff :size="17" />
                  <b>Deactivate</b>
                  <small>{{ deactivateHint }}</small>
                </button>
                <button type="button" class="dm-mode" :class="{ on: mode === 'delete' }" style="--m:#ef4444" @click="mode = 'delete'">
                  <span class="dm-mode-tick"><Check :size="12" /></span>
                  <Trash2 :size="17" />
                  <b>Delete forever</b>
                  <small>{{ deleteHint }}</small>
                </button>
              </div>
            </div>

            <!-- consequences -->
            <ul class="dm-cons">
              <Motion v-for="(c, i) in consequences" :key="String(isDelete) + i" as="li"
                :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.34, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }">
                <component :is="c.icon || Dot" :size="13" /> {{ c.text || c }}
              </Motion>
            </ul>

            <!-- reason workflow -->
            <div class="dm-reasons">
              <span class="dm-lab">Reason <i>*</i> <em>recorded in the travel audit log</em></span>
              <div class="dm-chips">
                <button v-for="r in reasons" :key="r" type="button" class="dm-chip" :class="{ on: reason === r }" @click="reason = r">
                  <span class="dm-chip-tick"><Check :size="11" /></span>{{ r }}
                </button>
              </div>
              <Presence>
                <Motion v-if="isOther" as="textarea" class="dm-note" rows="2" v-model="note" placeholder="Describe the reason…"
                  :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
                  :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }" />
              </Presence>
            </div>
          </div>

          <footer class="dm-foot">
            <button class="btn ghost" :disabled="loading" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn act" :class="{ del: isDelete }" :disabled="!canConfirm || loading"
              :whileHover="canConfirm && !loading ? { y: -2 } : {}" :whileTap="canConfirm && !loading ? { scale: 0.97 } : {}" @click="confirm">
              <Loader v-if="loading" :size="15" class="spin" />
              <component v-else :is="isDelete ? Trash2 : EyeOff" :size="15" />
              {{ loading ? 'Working…' : (isDelete ? `Delete ${entityLabel}` : 'Deactivate') }}
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Trash2, EyeOff, X, Check, Lock, Loader, Dot } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  entityLabel: { type: String, default: 'record' },
  name: { type: String, default: '' },
  meta: { type: String, default: '' },
  icon: { type: [Object, Function], default: () => Trash2 },
  accent: { type: String, default: '#fbbf24' },
  tags: { type: Array, default: () => [] },               // [{ icon?, text, hot? }]
  locked: { type: Boolean, default: false },              // true → delete blocked, force deactivate
  lockNote: { type: String, default: '' },
  canDeactivate: { type: Boolean, default: true },        // false → delete-only entity
  defaultMode: { type: String, default: 'deactivate' },   // 'deactivate' | 'delete'
  reasons: { type: Array, default: () => ['No longer needed', 'Created by mistake', 'Superseded', 'Policy change', 'Other'] },
  deactivateConsequences: { type: Array, default: () => [] },
  deleteConsequences: { type: Array, default: () => [] },
  deactivateHint: { type: String, default: 'Hide it, keep all config. Reversible.' },
  deleteHint: { type: String, default: 'Erase it permanently. No recovery.' },
})
const emit = defineEmits(['close', 'confirm'])

const mode = ref('deactivate')
const reason = ref('')
const note = ref('')

const isDelete = computed(() => props.canDeactivate ? (mode.value === 'delete' && !props.locked) : true)
const isOther = computed(() => reason.value === 'Other')
const tone = computed(() => isDelete.value ? '#ef4444' : '#fb923c')
const toneSoft = computed(() => isDelete.value ? 'rgba(239,68,68,0.14)' : 'rgba(251,146,60,0.14)')
const consequences = computed(() => isDelete.value ? props.deleteConsequences : props.deactivateConsequences)
const canConfirm = computed(() => !!(isOther.value ? note.value.trim() : reason.value))

watch(() => props.open, (o) => {
  if (o) {
    mode.value = (!props.canDeactivate) ? 'delete' : (props.locked ? 'deactivate' : props.defaultMode)
    reason.value = ''; note.value = ''
  }
})

const confirm = () => {
  if (!canConfirm.value || props.loading) return
  const r = isOther.value && note.value.trim() ? note.value.trim() : reason.value
  emit('confirm', { mode: isDelete.value ? 'delete' : 'deactivate', reason: r })
}
</script>

<style scoped>
.dm-ov { position: fixed; inset: 0; z-index: 1450; display: grid; place-items: center; padding: 22px;
  background: rgba(6,5,4,0.66); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
[data-theme="light"] .dm-ov { background: rgba(60,40,15,0.34); }

.dm { width: 100%; max-width: 480px; max-height: 92vh; overflow: hidden; display: flex; flex-direction: column;
  background: var(--trv-surface-elevated); border: 1px solid color-mix(in srgb, var(--tone) 28%, var(--trv-border-strong));
  border-radius: 22px; box-shadow: var(--trv-shadow); transition: border-color 0.4s; }

.dm-head { position: relative; overflow: hidden; display: flex; align-items: center; gap: 13px; padding: 19px 20px 16px; border-bottom: 1px solid var(--trv-border); }
.dm-aura { position: absolute; top: -70px; left: -20px; width: 240px; height: 168px; pointer-events: none; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--tone) 26%, transparent), transparent 70%); animation: dm-aura 5.5s ease-in-out infinite; transition: background 0.4s; }
.dm-warn { position: relative; display: inline-grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
  color: var(--tone); background: var(--tone-soft); border: 1px solid color-mix(in srgb, var(--tone) 36%, transparent); transition: color 0.4s, background 0.4s, border-color 0.4s; }
.dm-warn-ring { position: absolute; inset: -3px; border-radius: 16px; border: 1.5px solid color-mix(in srgb, var(--tone) 40%, transparent); animation: dm-ring 2.2s ease-out infinite; }
.dm-titles { flex: 1; min-width: 0; }
.dm-titles h3 { margin: 0; font-size: 16.5px; font-weight: 820; color: var(--trv-text); text-transform: capitalize; }
.dm-titles p { margin: 2px 0 0; font-size: 11.5px; color: var(--trv-text-muted); }
.dm-x { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; border: 1px solid var(--trv-border); background: var(--trv-panel); color: var(--trv-text-muted); cursor: pointer; transition: all 0.2s; }
.dm-x:hover:not(:disabled) { color: var(--trv-text); transform: rotate(90deg); }
.dm-x:disabled { opacity: 0.5; cursor: not-allowed; }

.dm-body { padding: 17px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }

.dm-item { position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px;
  background: var(--trv-surface); border: 1px solid var(--trv-border); border-left: 3px solid var(--c); }
.dm-item-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.dm-item-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.dm-item-name { font-size: 14px; font-weight: 750; color: var(--trv-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dm-item-sub { font-size: 10.5px; color: var(--trv-text-dim); }
.dm-item-tags { display: flex; flex-wrap: wrap; gap: 5px; justify-content: flex-end; flex-shrink: 0; max-width: 46%; }
.dm-item-tag { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 10px; font-weight: 650; color: var(--trv-text-muted); padding: 4px 8px; border-radius: 999px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.dm-item-tag.hot { color: var(--trv-amber); border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }
.dm-strike { position: absolute; left: 12px; right: 12px; top: 50%; height: 2px; border-radius: 2px; transform: scaleX(0); transform-origin: left center;
  background: linear-gradient(90deg, transparent, var(--tone), transparent); animation: dm-strike 0.6s var(--trv-spring) 0.45s forwards; }

.dm-lock { display: flex; align-items: flex-start; gap: 9px; padding: 11px 13px; border-radius: 12px; font-size: 12px; line-height: 1.45; color: var(--trv-text-secondary);
  background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.dm-lock :deep(svg) { color: var(--trv-amber); flex-shrink: 0; margin-top: 1px; }

.dm-modes { display: flex; flex-direction: column; gap: 8px; }
.dm-mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.dm-mode { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; text-align: left; cursor: pointer;
  padding: 12px 13px; border-radius: 13px; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.22s var(--trv-spring); }
.dm-mode :deep(svg) { color: var(--m); }
.dm-mode b { font-size: 12.5px; font-weight: 750; color: var(--trv-text); }
.dm-mode small { font-size: 10px; line-height: 1.35; color: var(--trv-text-muted); }
.dm-mode:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--m) 38%, transparent); }
.dm-mode.on { background: color-mix(in srgb, var(--m) 11%, transparent); border-color: color-mix(in srgb, var(--m) 48%, transparent); box-shadow: 0 0 22px -8px var(--m); }
.dm-mode-tick { position: absolute; top: 9px; right: 9px; display: grid; place-items: center; width: 17px; height: 17px; border-radius: 50%; color: #fff; background: var(--m); opacity: 0; transform: scale(0.4); transition: opacity 0.2s, transform 0.25s var(--trv-spring); }
.dm-mode.on .dm-mode-tick { opacity: 1; transform: scale(1); }

.dm-cons { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.dm-cons li { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--trv-text-secondary); }
.dm-cons li :deep(svg) { color: var(--tone); flex-shrink: 0; }

.dm-reasons { display: flex; flex-direction: column; gap: 9px; }
.dm-lab { font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-dim); }
.dm-lab i { color: var(--tone); font-style: normal; }
.dm-lab em { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 500; color: var(--trv-text-dim); opacity: 0.8; }
.dm-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.dm-chip { display: inline-flex; align-items: center; font: inherit; font-size: 11.5px; font-weight: 600; padding: 7px 12px; border-radius: 999px; cursor: pointer;
  color: var(--trv-text-muted); background: var(--trv-panel); border: 1px solid var(--trv-border); transition: color 0.2s, background 0.2s, border-color 0.2s; }
.dm-chip:hover { color: var(--trv-text); border-color: var(--trv-border-strong); }
.dm-chip.on { color: var(--tone); background: var(--tone-soft); border-color: color-mix(in srgb, var(--tone) 40%, transparent); }
.dm-chip-tick { display: inline-grid; place-items: center; width: 0; height: 13px; overflow: hidden; opacity: 0; transition: width 0.25s var(--trv-spring), opacity 0.2s, margin 0.25s; }
.dm-chip.on .dm-chip-tick { width: 13px; opacity: 1; margin-right: 5px; }
.dm-note { width: 100%; font: inherit; font-size: 12.5px; color: var(--trv-text); background: rgba(0,0,0,0.28); border: 1px solid var(--trv-border);
  border-radius: 11px; padding: 9px 12px; resize: vertical; box-sizing: border-box; }
.dm-note:focus { outline: none; border-color: color-mix(in srgb, var(--tone) 50%, transparent); box-shadow: 0 0 0 3px var(--tone-soft); }
[data-theme="light"] .dm-note { background: rgba(255,250,240,0.72); }

.dm-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--trv-border); }
.btn { display: inline-flex; align-items: center; gap: 7px; font: inherit; font-size: 13px; font-weight: 700; padding: 10px 18px; border-radius: 12px; border: 1px solid transparent; cursor: pointer; text-transform: capitalize; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); text-transform: none; }
.btn.act { color: #1a1205; background: linear-gradient(135deg, #fcd34d, #fb923c); box-shadow: 0 10px 26px -12px rgba(251,146,60,0.7); }
.btn.act.del { color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); box-shadow: 0 10px 26px -12px rgba(220,38,38,0.7); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: dm-spin 0.85s linear infinite; }
@keyframes dm-spin { to { transform: rotate(360deg); } }

@keyframes dm-aura { 0%, 100% { opacity: 0.55; transform: translate(0,0) scale(1); } 50% { opacity: 1; transform: translate(14px, 6px) scale(1.16); } }
@keyframes dm-ring { 0% { transform: scale(0.92); opacity: 0.7; } 70%, 100% { transform: scale(1.25); opacity: 0; } }
@keyframes dm-strike { to { transform: scaleX(1); } }
@media (prefers-reduced-motion: reduce) {
  .dm-aura, .dm-warn-ring, .dm-strike { animation: none !important; }
  .dm-strike { transform: scaleX(1); }
  .dm-x:hover { transform: none; }
}
</style>
