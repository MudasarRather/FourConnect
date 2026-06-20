<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="td-overlay" as="div" :data-mode="mode"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @mousedown.self="!loading && $emit('close')">
        <Motion class="td-panel" as="div" role="alertdialog" aria-modal="true" :data-mode="mode"
          :initial="{ opacity: 0, y: 26, scale: 0.95, filter: 'blur(10px)' }"
          :animate="{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }"
          :exit="{ opacity: 0, y: 14, scale: 0.97, filter: 'blur(6px)' }"
          :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }" @mousedown.stop>
          <span class="td-edge" aria-hidden="true" />

          <header class="td-head">
            <span class="td-aura" aria-hidden="true" />
            <Motion as="span" class="td-icon"
              :initial="{ scale: 0.5, rotate: mode === 'reject' ? -14 : 14, opacity: 0 }"
              :animate="{ scale: 1, rotate: 0, opacity: 1 }"
              :transition="{ type: 'spring', stiffness: 360, damping: 14, delay: 0.06 }">
              <span class="td-icon-ring" aria-hidden="true" />
              <component :is="cfg.icon" :size="22" />
            </Motion>
            <div class="td-titles">
              <h3>{{ cfg.title }}</h3>
              <p>{{ cfg.subtitle }}</p>
            </div>
            <button class="td-x" :disabled="loading" @click="$emit('close')" aria-label="Close"><X :size="18" /></button>
          </header>

          <div class="td-body">
            <!-- route recap -->
            <Motion as="div" class="td-route"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.42, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
              <span class="td-route-grid" aria-hidden="true" />
              <div class="td-node">
                <span class="td-node-ic" :data-kind="fromNode.kind">
                  <span v-if="fromNode.kind === 'employee'" class="td-av">{{ initials(fromNode.label) }}</span>
                  <component v-else :is="nodeIcon(fromNode.kind)" :size="15" />
                </span>
                <span class="td-node-lab">{{ fromNode.label }}</span>
              </div>
              <div class="td-beam">
                <span class="td-beam-line" aria-hidden="true" />
                <span class="td-cargo"><Package :size="10" /><span class="as-mono">{{ transfer.asset_code }}</span></span>
              </div>
              <div class="td-node to">
                <span class="td-node-ic" :data-kind="toNode.kind">
                  <span v-if="toNode.kind === 'employee'" class="td-av">{{ initials(toNode.label) }}</span>
                  <component v-else :is="nodeIcon(toNode.kind)" :size="15" />
                </span>
                <span class="td-node-lab">{{ toNode.label }}</span>
              </div>
            </Motion>

            <!-- reasons -->
            <Motion as="div" class="td-reasons"
              :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.18 }">
              <span class="td-lab">{{ cfg.reasonLabel }} <i>*</i></span>
              <div class="td-chips">
                <Motion v-for="(r, i) in cfg.reasons" :key="r" as="button" type="button" class="td-chip" :class="{ on: selected === r }"
                  :initial="{ opacity: 0, scale: 0.9 }" :animate="{ opacity: 1, scale: 1 }"
                  :transition="{ duration: 0.3, delay: 0.22 + i * 0.04, ease: [0.16, 1, 0.3, 1] }"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.94 }" @click="selected = r">
                  <span class="td-chip-tick"><Check :size="11" /></span>{{ r }}
                </Motion>
              </div>
              <Presence>
                <Motion v-if="isOther" as="textarea" class="td-note" rows="2" v-model="note"
                  :placeholder="cfg.notePlaceholder"
                  :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
                  :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }" />
              </Presence>
              <Presence>
                <Motion v-if="selected && !isOther" as="input" class="td-note td-note-inline" type="text" v-model="note"
                  placeholder="Add an optional detail…"
                  :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -6 }"
                  :transition="{ duration: 0.26 }" />
              </Presence>
            </Motion>

            <!-- consequences -->
            <ul class="td-cons">
              <Motion v-for="(c, i) in cfg.consequences" :key="c" as="li"
                :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.34, delay: 0.3 + i * 0.06 }">
                <component :is="c.ok ? CheckCircle2 : Dot" :size="14" :class="c.ok ? 'ok' : ''" /> {{ c.text }}
              </Motion>
            </ul>
          </div>

          <footer class="td-foot">
            <button class="as-btn as-btn-ghost" :disabled="loading" @click="$emit('close')">Keep transfer</button>
            <Motion as="button" type="button" class="td-confirm" :disabled="!canConfirm || loading"
              :whileHover="(!canConfirm || loading) ? {} : { y: -2 }" :whileTap="{ scale: 0.97 }" @click="confirm">
              <Loader v-if="loading" :size="15" class="spin" /><component v-else :is="cfg.icon" :size="15" />
              {{ loading ? 'Working…' : cfg.confirm }}
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, Check, Loader, Dot, CheckCircle2, Package, Gavel, Undo2,
  UserRound, Warehouse, MapPin, Building2,
} from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'reject' }, // 'reject' | 'cancel'
  transfer: { type: Object, default: () => ({}) },
  fromNode: { type: Object, default: () => ({ label: '—', kind: 'store' }) },
  toNode: { type: Object, default: () => ({ label: '—', kind: 'store' }) },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm'])

const CONFIG = {
  reject: {
    icon: Gavel, title: 'Reject transfer', subtitle: 'Decline this custody request — the asset stays put.',
    reasonLabel: 'Reason for rejection', confirm: 'Reject transfer', notePlaceholder: 'Explain why this is being rejected…',
    reasons: ['Not eligible / wrong asset', 'Recipient not approved', 'Asset needed elsewhere', 'Insufficient justification', 'Duplicate request', 'Other'],
    consequences: [
      { text: 'Marked REJECTED — request is closed', ok: false },
      { text: 'Asset custody stays exactly as it is', ok: true },
      { text: 'Logged to asset history & audit trail', ok: true },
      { text: 'A fresh transfer can be raised later', ok: true },
    ],
  },
  cancel: {
    icon: Undo2, title: 'Cancel transfer', subtitle: 'Withdraw this request before it completes.',
    reasonLabel: 'Reason for cancelling', confirm: 'Cancel transfer', notePlaceholder: 'Add a short note…',
    reasons: ['No longer needed', 'Created by mistake', 'Wrong details — will re-raise', 'Recipient unavailable', 'Superseded by another transfer', 'Other'],
    consequences: [
      { text: 'Marked CANCELLED — request is withdrawn', ok: false },
      { text: 'Asset custody stays exactly as it is', ok: true },
      { text: 'Logged to asset history & audit trail', ok: true },
      { text: 'You can raise a new request anytime', ok: true },
    ],
  },
}
const cfg = computed(() => CONFIG[props.mode] || CONFIG.reject)

const selected = ref('')
const note = ref('')
const isOther = computed(() => /other/i.test(selected.value))
const canConfirm = computed(() => !!selected.value && (!isOther.value || !!note.value.trim()))

const NODE_ICONS = { store: Warehouse, location: MapPin, department: Building2, employee: UserRound }
const nodeIcon = (k) => NODE_ICONS[k] || Warehouse
const initials = (n) => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

watch(() => props.open, (o) => {
  if (o) { selected.value = ''; note.value = ''; document.body.style.overflow = 'hidden' }
  else { document.body.style.overflow = '' }
}, { immediate: true })
onBeforeUnmount(() => { document.body.style.overflow = '' })

const onKey = (e) => { if (e.key === 'Escape' && props.open && !props.loading) emit('close') }
if (typeof window !== 'undefined') window.addEventListener('keydown', onKey)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function confirm() {
  if (!canConfirm.value || props.loading) return
  const extra = note.value.trim()
  const notes = isOther.value ? extra : (extra ? `${selected.value} — ${extra}` : selected.value)
  emit('confirm', { notes })
}
</script>

<style scoped>
.td-overlay { position: fixed; inset: 0; z-index: 1460; display: grid; place-items: center; padding: 24px;
  background: rgba(6, 5, 4, 0.64); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
[data-theme="light"] .td-overlay { background: rgba(60, 40, 15, 0.32); }

/* tone tokens per mode */
.td-panel { --tone: var(--as-cond-poor); --tone-soft: color-mix(in srgb, var(--as-cond-poor) 14%, transparent); }
.td-panel[data-mode="cancel"] { --tone: var(--as-ember); --tone-soft: color-mix(in srgb, var(--as-ember) 14%, transparent); }

.td-panel { position: relative; overflow: hidden; width: 100%; max-width: 480px; max-height: 92vh; display: flex; flex-direction: column;
  background: var(--as-glass-deep); backdrop-filter: var(--as-glass-blur); -webkit-backdrop-filter: var(--as-glass-blur);
  border: 1px solid color-mix(in srgb, var(--tone) 26%, var(--as-border-strong)); border-radius: 22px; box-shadow: var(--as-glass-shadow); }
.td-edge { position: absolute; top: 0; left: 0; right: 0; height: 2px; z-index: 3; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--tone), transparent); background-size: 220% 100%; animation: as-sheen 4.5s ease-in-out infinite; }

.td-head { position: relative; overflow: hidden; display: flex; align-items: center; gap: 13px; padding: 20px 20px 16px; border-bottom: 1px solid var(--as-border-soft); }
.td-aura { position: absolute; top: -70px; left: -20px; width: 250px; height: 175px; pointer-events: none; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--tone) 22%, transparent), transparent 70%); animation: td-aura 5.5s ease-in-out infinite; }
.td-icon { position: relative; display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0;
  color: var(--tone); background: var(--tone-soft); border: 1px solid color-mix(in srgb, var(--tone) 34%, transparent); }
.td-icon-ring { position: absolute; inset: -3px; border-radius: 17px; border: 1.5px solid color-mix(in srgb, var(--tone) 42%, transparent); animation: td-ring 2.2s ease-out infinite; }
.td-titles { flex: 1; min-width: 0; }
.td-titles h3 { margin: 0; font-size: 17px; font-weight: 800; color: var(--as-text); }
.td-titles p { margin: 2px 0 0; font-size: 12px; color: var(--as-text-muted); }
.td-x { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
  border: 1px solid var(--as-border-soft); background: var(--as-surface); color: var(--as-text-muted); cursor: pointer; transition: all 0.2s; }
.td-x:hover:not(:disabled) { color: var(--as-text); background: var(--as-surface-elevated); transform: rotate(90deg); }
.td-x:disabled { opacity: 0.5; cursor: not-allowed; }

.td-body { padding: 18px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }

/* route recap */
.td-route { position: relative; overflow: hidden; display: grid; grid-template-columns: 1fr 1.5fr 1fr; align-items: center; gap: 8px;
  padding: 14px 12px; border-radius: 14px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.td-route-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(var(--as-blueprint) 1px, transparent 1px), linear-gradient(90deg, var(--as-blueprint) 1px, transparent 1px);
  background-size: 20px 20px; mask-image: radial-gradient(120% 100% at 50% 0%, #000, transparent 75%); -webkit-mask-image: radial-gradient(120% 100% at 50% 0%, #000, transparent 75%); }
.td-node { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; text-align: center; }
.td-node-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; color: var(--as-text-secondary); background: var(--as-surface-elevated); border: 1px solid var(--as-border-soft); }
.td-node-ic[data-kind="store"] { color: var(--as-steel); }
.td-node-ic[data-kind="location"] { color: var(--as-ember); }
.td-node-ic[data-kind="department"] { color: var(--as-amber); }
.td-av { font-size: 11.5px; font-weight: 800; }
.td-node-lab { font-size: 11px; font-weight: 600; color: var(--as-text); max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.td-beam { position: relative; height: 38px; display: flex; align-items: center; }
.td-beam-line { position: absolute; left: 0; right: 0; top: 50%; height: 2.5px; transform: translateY(-50%); border-radius: 3px;
  background: repeating-linear-gradient(90deg, var(--tone) 0 6px, transparent 6px 12px); opacity: 0.45;
  -webkit-mask: linear-gradient(90deg, #000 40%, transparent 44%, transparent 56%, #000 60%); mask: linear-gradient(90deg, #000 40%, transparent 44%, transparent 56%, #000 60%); }
.td-cargo { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 8px; font-size: 10px; font-weight: 700; color: var(--as-text); white-space: nowrap;
  background: var(--as-surface-elevated); border: 1px solid var(--as-border-strong); box-shadow: 0 4px 10px -6px rgba(0,0,0,0.5); }
.td-cargo :deep(svg) { color: var(--tone); }
.td-node.to .td-node-ic { opacity: 0.55; }

.td-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--as-text-dim); }
.td-lab i { color: var(--tone); font-style: normal; margin-left: 2px; }
.td-reasons { display: flex; flex-direction: column; gap: 10px; }
.td-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.td-chip { display: inline-flex; align-items: center; padding: 7px 12px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600;
  color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: color 0.22s, background 0.22s, border-color 0.22s; }
.td-chip:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.td-chip.on { color: var(--tone); background: var(--tone-soft); border-color: color-mix(in srgb, var(--tone) 36%, transparent); }
.td-chip-tick { display: inline-grid; place-items: center; width: 0; height: 14px; overflow: hidden; opacity: 0; transition: width 0.25s var(--as-spring), opacity 0.2s, margin 0.25s; }
.td-chip.on .td-chip-tick { width: 14px; opacity: 1; margin-right: 5px; }
.td-note { width: 100%; box-sizing: border-box; font: inherit; font-size: 13px; color: var(--as-text); background: var(--as-surface); border: 1px solid var(--as-border-soft);
  border-radius: 11px; padding: 9px 12px; resize: vertical; overflow: hidden; }
.td-note-inline { resize: none; }
.td-note:focus { outline: none; border-color: color-mix(in srgb, var(--tone) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--tone) 12%, transparent); }

.td-cons { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.td-cons li { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--as-text-secondary); }
.td-cons li :deep(svg) { color: var(--tone); flex-shrink: 0; }
.td-cons li :deep(svg.ok) { color: var(--as-st-available); }

.td-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 15px 20px; border-top: 1px solid var(--as-border-soft); }
.td-confirm { display: inline-flex; align-items: center; gap: 7px; font: inherit; font-size: 13.5px; font-weight: 650; padding: 10px 18px; border-radius: 12px;
  border: 1px solid transparent; cursor: pointer; color: #fff; background: linear-gradient(135deg, color-mix(in srgb, var(--tone) 78%, white 8%), var(--tone));
  box-shadow: 0 10px 26px -12px color-mix(in srgb, var(--tone) 80%, transparent); transition: box-shadow 0.3s, opacity 0.2s; }
.td-confirm:hover:not(:disabled) { box-shadow: 0 16px 34px -12px color-mix(in srgb, var(--tone) 90%, transparent); }
.td-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: as-spin 0.9s linear infinite; }

@keyframes td-aura { 0%, 100% { opacity: 0.55; transform: translate(0,0) scale(1); } 50% { opacity: 1; transform: translate(16px, 6px) scale(1.16); } }
@keyframes td-ring { 0% { transform: scale(0.92); opacity: 0.7; } 70%, 100% { transform: scale(1.28); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .td-aura, .td-icon-ring, .td-edge { animation: none !important; } .td-x:hover { transform: none; } }
</style>
