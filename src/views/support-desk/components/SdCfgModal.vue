<template>
  <!-- SdCfgModal — the Queue-Config "INSTRUMENT CASE": a cinematic two-pane modal.
       Left rail = LIVE PREVIEW (slot #preview) that forms as the admin types, plus the
       signing-actor chip and the audit note (every save lands in the Ledger). Right =
       the form (default slot) with a cascading field entrance. The case opens with a
       spring + blur-dissolve; a top light-beam charges as validity is reached and the
       DRAFT stamp flips to READY with a seal pop. -->
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="cfg-overlay" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.24 }" @mousedown.self="$emit('close')">
        <span class="cfg-aura" aria-hidden="true" />
        <Motion class="cfg-case" role="dialog" aria-modal="true" :class="[tone, { ready }]"
          :initial="{ opacity: 0, y: 30, scale: 0.955, filter: 'blur(10px)' }"
          :animate="{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }"
          :exit="{ opacity: 0, y: 18, scale: 0.97, filter: 'blur(8px)' }"
          :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }"
          :style="{ '--case-w': width }">
          <span class="cfg-beam" aria-hidden="true" />
          <span class="cfg-grain" aria-hidden="true" />

          <!-- ── left rail: live preview (the conduit motif fills the rest) ── -->
          <aside v-if="$slots.preview" class="cfg-rail">
            <span class="cfg-rail-conduit" aria-hidden="true" />
            <span class="cfg-rail-eyebrow sd-mono"><ScanEye :size="11" /> LIVE PREVIEW</span>
            <div class="cfg-rail-preview"><slot name="preview" /></div>
            <span class="cfg-stamp sd-mono" :class="{ ready }">
              <span class="cfg-stamp-ring" aria-hidden="true" />
              {{ ready ? 'READY' : 'DRAFT' }}
            </span>
          </aside>

          <!-- ── main: header + form + footer (provenance lives in the footer) ── -->
          <div class="cfg-main">
            <header class="cfg-head">
              <div class="cfg-titles">
                <p v-if="eyebrow" class="cfg-eyebrow sd-mono">{{ eyebrow }}</p>
                <h2 class="cfg-title">{{ title }}</h2>
              </div>
              <Motion as="button" type="button" class="cfg-x" aria-label="Close" :while-hover="{ rotate: 90, scale: 1.08 }"
                :while-tap="{ scale: 0.9 }" @click="$emit('close')"><X :size="17" /></Motion>
            </header>
            <div class="cfg-body"><slot /></div>
            <footer v-if="$slots.footer" class="cfg-foot">
              <div v-if="actorName" class="cfg-prov" :title="`Every save is audited to the config ledger under this identity${versioned ? ' — full version history kept' : ''}`">
                <span class="cfg-actor-ava">{{ initials }}</span>
                <span class="cfg-prov-b"><b><ShieldCheck :size="10" /> {{ actorName }}</b><i><ScrollText :size="9" /> signs to the ledger</i></span>
              </div>
              <slot name="footer" />
            </footer>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, ScanEye, ShieldCheck, ScrollText } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  eyebrow: { type: String, default: '' },
  title: { type: String, default: '' },
  width: { type: String, default: '860px' },
  ready: { type: Boolean, default: false },
  tone: { type: String, default: '' },            // '' | 'danger'
  actorName: { type: String, default: '' },
  actorEmail: { type: String, default: '' },
  versioned: { type: Boolean, default: false },   // entity keeps revision history
})
const emit = defineEmits(['close'])

const initials = computed(() => (props.actorName || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase())

const onKey = (e) => { if (e.key === 'Escape' && props.open) emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); if (typeof document !== 'undefined') document.body.style.overflow = '' })
watch(() => props.open, (v) => { if (typeof document !== 'undefined') document.body.style.overflow = v ? 'hidden' : '' })
</script>

<style scoped>
.cfg-overlay { position: fixed; inset: 0; z-index: 2000; display: grid; place-items: center; padding: 22px;
  background: rgba(4, 5, 6, 0.66); backdrop-filter: blur(12px) saturate(140%); -webkit-backdrop-filter: blur(12px) saturate(140%); }
[data-theme="light"] .cfg-overlay { background: rgba(40, 25, 10, 0.36); }
.cfg-aura { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(44% 38% at 50% 8%, color-mix(in srgb, var(--sd-ember) 14%, transparent), transparent 70%);
  animation: cfg-aura 9s ease-in-out infinite; }
@keyframes cfg-aura { 0%, 100% { opacity: 0.6; transform: translateX(-2%); } 50% { opacity: 1; transform: translateX(2%); } }

/* FLEX, not grid — a grid's auto tracks size against infinite height and blow past
   max-height (body never scrolls, footer clipped). Flex + min-height:0 children is
   the proven SdModalShell scroll pattern. */
.cfg-case { position: relative; display: flex; align-items: stretch;
  width: min(var(--case-w, 860px), 96vw); max-height: 88vh; border-radius: 22px; overflow: hidden;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); box-shadow: 0 40px 90px -30px rgba(0, 0, 0, 0.6); }
.cfg-beam { position: absolute; inset: 0 0 auto; height: 2px; z-index: 3;
  background: linear-gradient(90deg, transparent, var(--sd-amber) 30%, var(--sd-ember) 70%, transparent);
  background-size: 220% 100%; opacity: 0.55; animation: sd-rail-flow 4s linear infinite; transition: opacity 0.4s; }
.cfg-case.ready .cfg-beam { opacity: 1; background: linear-gradient(90deg, transparent, var(--sd-success) 30%, #6ee7b7 70%, transparent); background-size: 220% 100%; }
.cfg-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.35; z-index: 0;
  background-image: radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 3px 3px; }

/* ── left rail ── */
.cfg-rail { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 12px; padding: 18px 16px;
  border-right: 1px solid var(--sd-border); min-height: 0; width: 252px; flex-shrink: 0;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--sd-amber) 5%, transparent), transparent 55%),
    repeating-linear-gradient(0deg, transparent 0 27px, color-mix(in srgb, var(--sd-border) 55%, transparent) 27px 28px),
    var(--sd-surface); }
/* the conduit — a charged line that intentionally OWNS the space under the preview */
.cfg-rail-conduit { position: absolute; left: 26px; top: 46px; bottom: 20px; width: 2px; border-radius: 2px; z-index: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--sd-amber) 45%, transparent), transparent 85%); }
.cfg-rail-conduit::after { content: ""; position: absolute; left: -2px; top: 0; width: 6px; height: 26px; border-radius: 999px;
  background: linear-gradient(180deg, #ffd166, transparent); filter: drop-shadow(0 0 5px #ffb900);
  animation: cfg-conduit 4.2s cubic-bezier(0.5, 0, 0.5, 1) infinite; }
@keyframes cfg-conduit { 0% { top: -2%; opacity: 0; } 10% { opacity: 1; } 80% { opacity: 1; } 100% { top: 92%; opacity: 0; } }
.cfg-rail-eyebrow { position: relative; display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-text-dim); }
.cfg-rail-preview { position: relative; min-height: 0; overflow-y: auto; scrollbar-width: thin; }
.cfg-stamp { position: relative; }

.cfg-stamp { position: relative; align-self: flex-start; display: inline-flex; align-items: center; gap: 7px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.2em; padding: 6px 13px; border-radius: 8px;
  color: var(--sd-text-dim); border: 1.5px dashed var(--sd-border-strong); transition: all 0.35s var(--sd-spring); }
.cfg-stamp.ready { color: var(--sd-success); border-style: solid; border-color: color-mix(in srgb, var(--sd-success) 55%, transparent);
  background: var(--sd-success-soft); animation: cfg-seal 0.5s var(--sd-spring); }
.cfg-stamp-ring { position: absolute; inset: -3px; border-radius: 10px; border: 1.5px solid transparent; opacity: 0; }
.cfg-stamp.ready .cfg-stamp-ring { border-color: color-mix(in srgb, var(--sd-success) 55%, transparent); animation: cfg-seal-ring 0.8s var(--sd-spring); }
@keyframes cfg-seal { 0% { transform: scale(0.8) rotate(-4deg); } 60% { transform: scale(1.1) rotate(1deg); } 100% { transform: scale(1) rotate(0); } }
@keyframes cfg-seal-ring { 0% { opacity: 0.9; transform: scale(1); } 100% { opacity: 0; transform: scale(1.5); } }

/* footer provenance — who signs the change (compact, no dead space) */
.cfg-prov { display: inline-flex; align-items: center; gap: 8px; padding: 5px 10px 5px 6px; border-radius: 10px;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); margin-right: 4px; }
.cfg-actor-ava { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; font-size: 9.5px; font-weight: 800;
  color: #1a1206; background: var(--sd-grad-hero); flex-shrink: 0; }
[data-theme="light"] .cfg-actor-ava { color: #fff8ec; }
.cfg-prov-b { display: flex; flex-direction: column; min-width: 0; }
.cfg-prov-b b { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 750; color: var(--sd-text); white-space: nowrap; }
.cfg-prov-b b svg { color: var(--sd-success); }
.cfg-prov-b i { display: inline-flex; align-items: center; gap: 4px; font-style: normal; font-size: 8.5px; color: var(--sd-text-dim); white-space: nowrap; }
.cfg-prov-b i svg { color: var(--sd-amber); }

/* ── main pane ── */
.cfg-main { position: relative; z-index: 1; display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; }
.cfg-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 17px 20px 13px;
  border-bottom: 1px solid var(--sd-border); }
.cfg-eyebrow { font-size: 9.5px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-amber); margin: 0 0 3px; }
.cfg-case.danger .cfg-eyebrow { color: var(--sd-danger); }
.cfg-title { font-size: 18px; font-weight: 800; letter-spacing: -0.01em; color: var(--sd-text); margin: 0; }
.cfg-x { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; border: 1px solid var(--sd-border);
  color: var(--sd-text-muted); background: var(--sd-surface-glass); flex-shrink: 0; }
.cfg-x:hover { color: var(--sd-text); border-color: var(--sd-amber-border); }

.cfg-body { flex: 1; min-height: 0; overflow-y: auto; padding: 18px 20px;
  display: flex; flex-direction: column; gap: 15px;   /* the fields breathe — no cramming */
  scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--sd-amber) 55%, transparent) transparent; }
.cfg-body::-webkit-scrollbar { width: 8px; }
.cfg-body::-webkit-scrollbar-thumb { border-radius: 999px; background: color-mix(in srgb, var(--sd-ember) 50%, transparent); }
/* cascading field entrance — replays each open (v-if remount) */
.cfg-body > :deep(*) { animation: cfg-field 0.5s var(--sd-spring) both; }
.cfg-body > :deep(*:nth-child(1)) { animation-delay: 0.05s; } .cfg-body > :deep(*:nth-child(2)) { animation-delay: 0.1s; }
.cfg-body > :deep(*:nth-child(3)) { animation-delay: 0.15s; } .cfg-body > :deep(*:nth-child(4)) { animation-delay: 0.2s; }
.cfg-body > :deep(*:nth-child(5)) { animation-delay: 0.25s; } .cfg-body > :deep(*:nth-child(6)) { animation-delay: 0.3s; }
.cfg-body > :deep(*:nth-child(7)) { animation-delay: 0.35s; } .cfg-body > :deep(*:nth-child(n+8)) { animation-delay: 0.4s; }
@keyframes cfg-field { from { opacity: 0; transform: translateY(12px) scale(0.995); } to { opacity: 1; transform: none; } }

.cfg-foot { display: flex; align-items: center; gap: 9px; padding: 13px 20px; border-top: 1px solid var(--sd-border);
  background: var(--sd-surface); animation: cfg-foot-in 0.5s 0.15s var(--sd-spring) both; }
@keyframes cfg-foot-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

@media (max-width: 760px) { .cfg-rail { display: none; } .cfg-prov { display: none; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .cfg-beam,
  html:not([data-cinematic="on"]) .cfg-aura,
  html:not([data-cinematic="on"]) .cfg-rail-conduit::after,
  html:not([data-cinematic="on"]) .cfg-body > :deep(*),
  html:not([data-cinematic="on"]) .cfg-foot,
  html:not([data-cinematic="on"]) .cfg-stamp.ready,
  html:not([data-cinematic="on"]) .cfg-stamp.ready .cfg-stamp-ring { animation: none; }
}
</style>
