<template>
  <Teleport to="body">
    <transition name="rd-modal" appear>
      <div v-if="open" class="rd-scrim" @click.self="onCancel">
        <div class="rd-motes" aria-hidden="true">
          <span v-for="n in 12" :key="n" class="rd-mote" :style="moteStyle(n)" />
        </div>

        <Motion as="div" class="rd-modal" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 28, scale: 0.92, rotateX: -7 }"
          :animate="{ opacity: 1, y: 0, scale: 1, rotateX: 0 }"
          :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">

          <div class="rd-aurora" aria-hidden="true"><span class="orb a1" /><span class="orb a2" /></div>
          <div class="rd-grid" aria-hidden="true" />
          <div class="rd-scan" aria-hidden="true" />

          <div class="rd-body" v-if="roster">
            <header class="rd-hero">
              <button class="rd-close" @click="onCancel" aria-label="Close"><X :size="15" /></button>
              <Motion as="div" class="rd-hero-row"
                :initial="{ y: -10, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.5, delay: 0.08, ease: [0.16,1,0.3,1] }">
                <div class="rd-hero-icon">
                  <CalendarX2 :size="22" />
                  <span class="ic-ring" /><span class="ic-pulse" /><span class="ic-glow" />
                </div>
                <div class="rd-hero-text">
                  <span class="rd-eyebrow"><span class="eye-dot" /> DELETE ROSTER · {{ statusLabel }}</span>
                  <h2>Delete this weekly roster?</h2>
                  <p>{{ isPublished ? 'This roster is published. Removing it archives the plan — the day-assignments it already wrote stay in attendance.' : 'This draft and all of its grid cells will be discarded. It has not been published, so nothing in attendance is affected.' }}</p>
                </div>
              </Motion>
            </header>

            <!-- ROSTER PREVIEW -->
            <Motion as="div" class="rd-preview"
              :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.45, delay: 0.16 }">
              <div class="pv-icon"><CalendarRange :size="18" /></div>
              <div class="pv-info">
                <div class="pv-row">
                  <span class="pv-name">{{ roster.name || ('Week of ' + roster.week_start) }}</span>
                  <span class="pv-status" :data-pub="isPublished">{{ statusLabel }}</span>
                </div>
                <div class="pv-meta">
                  <span class="mono">{{ rangeLabel }}</span>
                  <span class="pv-dot">·</span>
                  <span>{{ roster.department_name || 'All depts' }}</span>
                  <span class="pv-dot">·</span>
                  <span><b>{{ roster.entry_count ?? (roster.entries || []).length }}</b> cells</span>
                </div>
              </div>
            </Motion>

            <!-- PUBLISHED CALLOUT -->
            <transition name="rd-fade">
              <Motion v-if="isPublished" as="div" class="rd-callout"
                :initial="{ y: 10, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.4, delay: 0.22 }">
                <ShieldAlert :size="15" />
                <span>Published assignments are <b>not reverted</b> — employees keep the shifts already written for this week. To change them, edit those assignments in the Assignment tab.</span>
              </Motion>
            </transition>

            <!-- REASON -->
            <Motion as="section" class="rd-section"
              :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.45, delay: 0.28 }">
              <div class="rd-shead"><ScrollText :size="11" /> <span>Reason</span> <span class="opt">optional</span></div>
              <div class="rd-chips">
                <button v-for="r in REASONS" :key="r" type="button" class="rchip" :class="{ on: notes === r }" @click="notes = notes === r ? '' : r">{{ r }}</button>
              </div>
              <textarea v-model.trim="notes" class="rd-textarea" :maxlength="500" rows="2" placeholder="Note for the roster log…" />
            </Motion>

            <!-- CONSEQUENCES -->
            <Motion as="section" class="rd-section"
              :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.45, delay: 0.36 }">
              <div class="rd-shead"><Info :size="11" /> <span>What happens</span></div>
              <ul class="conseq">
                <li><span class="cq" /><span>The roster is <b>removed</b> from the planner &amp; lists.</span></li>
                <template v-if="isPublished">
                  <li><span class="cq ok" /><span>Day-assignments already written for this week <b>stay intact</b>.</span></li>
                  <li><span class="cq" /><span>You won't be able to re-publish or edit this exact plan.</span></li>
                </template>
                <template v-else>
                  <li><span class="cq" /><span>All <b>{{ roster.entry_count ?? (roster.entries || []).length }} grid cells</b> in this draft are discarded.</span></li>
                  <li><span class="cq ok" /><span>Nothing in <b>attendance</b> changes — it was never published.</span></li>
                </template>
              </ul>
            </Motion>
          </div>

          <footer class="rd-foot">
            <button type="button" class="rd-btn ghost" :disabled="busy" @click="onCancel">Cancel</button>
            <div class="foot-gap" />
            <Motion as="button" type="button" class="rd-btn danger armed"
              :disabled="busy" :whileHover="!busy ? { y: -2 } : {}" :whileTap="!busy ? { scale: 0.96 } : {}" @click="onConfirm">
              <Loader2 v-if="busy" :size="14" class="spin" /><Trash2 v-else :size="14" />
              <span>{{ busy ? 'Deleting…' : (isPublished ? 'Archive roster' : 'Delete draft') }}</span>
              <span v-if="!busy" class="flare" aria-hidden="true" />
            </Motion>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { X, CalendarX2, CalendarRange, ShieldAlert, ScrollText, Info, Trash2, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  roster: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['cancel', 'confirm'])

const REASONS = ['Duplicate', 'Wrong week', 'Superseded plan', 'Re-planning', 'Created in error']
const notes = ref('')

const isPublished = computed(() => String(props.roster?.status || '').toUpperCase() === 'PUBLISHED')
const statusLabel = computed(() => isPublished.value ? 'Published' : 'Draft')

const fmt = (isoStr) => {
  if (!isoStr) return '—'
  const d = new Date(isoStr + 'T00:00:00')
  if (isNaN(d)) return isoStr
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
const rangeLabel = computed(() => {
  const r = props.roster
  if (!r) return '—'
  const end = r.week_end || r.week_start
  return `${fmt(r.week_start)} – ${fmt(end)}`
})

watch(() => props.open, (v) => { if (v) notes.value = '' })

const onCancel = () => { if (!props.busy) emit('cancel') }
const onConfirm = () => { if (!props.busy) emit('confirm', { reason: notes.value.trim() }) }

const moteStyle = (n) => {
  const x = (n * 53) % 100, y = (n * 71) % 100
  const dur = 6 + ((n * 3) % 7), delay = (n % 5) * 0.45, size = 2 + (n % 3)
  return { left: `${x}%`, top: `${y}%`, width: `${size}px`, height: `${size}px`, animationDuration: `${dur}s`, animationDelay: `${delay}s` }
}
</script>

<style scoped>
.rd-scrim {
  position: fixed; inset: 0; z-index: 1215; display: flex; align-items: center; justify-content: center; padding: 24px;
  background: radial-gradient(60% 60% at 50% 38%, rgba(239, 68, 68, 0.2), transparent 65%), radial-gradient(90% 90% at 50% 50%, rgba(8, 6, 6, 0.6), rgba(3, 3, 4, 0.78));
  backdrop-filter: blur(15px) saturate(150%); -webkit-backdrop-filter: blur(15px) saturate(150%); perspective: 1400px; overflow-y: auto;
}
.rd-motes { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.rd-mote { position: absolute; border-radius: 50%; background: radial-gradient(circle, rgba(248, 113, 113, 0.8), rgba(248, 113, 113, 0)); box-shadow: 0 0 10px rgba(248, 113, 113, 0.5); opacity: 0.55; animation: rd-float linear infinite; }
@keyframes rd-float { 0% { transform: translate3d(0, 18vh, 0) scale(0.6); opacity: 0; } 15% { opacity: 0.55; } 85% { opacity: 0.55; } 100% { transform: translate3d(30px, -116vh, 0) scale(1.2); opacity: 0; } }

.rd-modal {
  position: relative; width: 560px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px);
  display: flex; flex-direction: column; border-radius: 24px; overflow: hidden; isolation: isolate;
  background: linear-gradient(180deg, #fca5a5 0%, #f87171 22%, #ef4444 52%, #b91c1c 100%) left top / 5px 100% no-repeat,
    radial-gradient(70% 110% at 0% 50%, rgba(239, 68, 68, 0.16), transparent 55%), radial-gradient(90% 60% at 100% 100%, rgba(127, 29, 29, 0.16), transparent 60%),
    linear-gradient(180deg, rgba(20, 16, 16, 0.96), rgba(14, 12, 12, 0.96));
  border: 1px solid rgba(248,113,113,0.26); border-left: none;
  box-shadow: 0 60px 120px -40px rgba(0,0,0,0.92), inset 12px 0 30px -14px rgba(239, 68, 68, 0.45), inset 5px 0 0 -4px rgba(248, 113, 113, 0.85);
}
.rd-aurora { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.rd-aurora .orb { position: absolute; border-radius: 50%; filter: blur(68px); opacity: 0.5; }
.rd-aurora .a1 { width: 300px; height: 300px; top: -120px; right: -100px; background: radial-gradient(circle, rgba(248, 113, 113, 0.5), transparent 70%); animation: rd-orb-a 18s ease-in-out infinite; }
.rd-aurora .a2 { width: 240px; height: 240px; bottom: -90px; left: -70px; background: radial-gradient(circle, rgba(220, 38, 38, 0.4), transparent 70%); animation: rd-orb-b 22s ease-in-out infinite; }
@keyframes rd-orb-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-26px,34px) scale(1.08); } }
@keyframes rd-orb-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-22px) scale(1.1); } }
.rd-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0; background-image: radial-gradient(rgba(248, 113, 113, 0.08) 1px, transparent 1px); background-size: 22px 22px; opacity: 0.55; mask-image: linear-gradient(180deg, rgba(0,0,0,0.4), transparent 80%); }
.rd-scan { position: absolute; inset: 0; pointer-events: none; z-index: 1; overflow: hidden; }
.rd-scan::after { content: ''; position: absolute; left: 0; right: 0; height: 80px; background: linear-gradient(180deg, transparent, rgba(248, 113, 113, 0.16), transparent); filter: blur(6px); transform: translateY(-100%); animation: rd-sweep 1.6s 0.2s cubic-bezier(0.16,1,0.3,1) forwards; }
@keyframes rd-sweep { to { transform: translateY(100vh); opacity: 0; } }

.rd-body { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 15px; padding: 26px 26px 18px 36px; overflow-y: auto; position: relative; z-index: 2; scrollbar-width: thin; scrollbar-color: rgba(248,113,113,0.3) transparent; }
.rd-body::-webkit-scrollbar { width: 5px; } .rd-body::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(248,113,113,0.3), rgba(220,38,38,0.45)); border-radius: 3px; }

.rd-hero { position: relative; padding-right: 32px; }
.rd-close { position: absolute; top: -4px; right: -4px; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; background: rgba(255,255,255,0.05); border: 1px solid rgba(248,113,113,0.24); color: #fca5a5; transition: transform .35s var(--shift-spring), background .25s; }
.rd-close:hover { transform: rotate(90deg); background: rgba(239,68,68,0.18); }
.rd-hero-row { display: flex; align-items: flex-start; gap: 14px; }
.rd-hero-icon { position: relative; display: grid; place-items: center; width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0; background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(127, 29, 29, 0.22)); border: 1px solid rgba(248,113,113,0.4); color: #fecaca; box-shadow: 0 10px 28px -10px rgba(239, 68, 68, 0.6); }
.ic-ring { position: absolute; inset: -5px; border-radius: 19px; pointer-events: none; background: conic-gradient(from 0deg, transparent, rgba(248,113,113,0.6), transparent 25%, transparent 50%, rgba(220,38,38,0.6), transparent 75%); -webkit-mask: radial-gradient(transparent 56%, #000 58%); mask: radial-gradient(transparent 56%, #000 58%); animation: rd-ring 6s linear infinite; opacity: 0.85; }
@keyframes rd-ring { to { transform: rotate(360deg); } }
.ic-pulse { position: absolute; inset: 0; border-radius: 16px; pointer-events: none; animation: rd-pulse 2.2s ease-out infinite; }
@keyframes rd-pulse { 0% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.55); } 70% { box-shadow: 0 0 0 14px rgba(248, 113, 113, 0); } 100% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0); } }
.ic-glow { position: absolute; inset: -16px; border-radius: 28px; pointer-events: none; z-index: -1; background: radial-gradient(circle, rgba(239, 68, 68, 0.3), transparent 65%); animation: rd-glow 3.6s ease-in-out infinite; }
@keyframes rd-glow { 0%,100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
.rd-hero-text { display: flex; flex-direction: column; gap: 5px; min-width: 0; flex: 1; }
.rd-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: #fca5a5; width: max-content; }
.eye-dot { width: 5px; height: 5px; border-radius: 50%; background: #f87171; box-shadow: 0 0 8px rgba(248,113,113,0.8); animation: rd-eye 1.6s ease-in-out infinite; }
@keyframes rd-eye { 0%,100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.4); } }
.rd-hero-text h2 { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.018em; line-height: 1.15; background: linear-gradient(135deg, #fff, #fee2e2 60%, #fca5a5); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.rd-hero-text p { margin: 2px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--shift-text-muted); }

.rd-preview { position: relative; display: flex; align-items: center; gap: 13px; padding: 13px 14px; border-radius: 14px; background: rgba(40, 22, 22, 0.5); border: 1px solid rgba(248,113,113,0.18); }
.pv-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(127, 29, 29, 0.2)); border: 1px solid rgba(248,113,113,0.3); color: #fecaca; }
.pv-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.pv-row { display: flex; align-items: center; gap: 9px; }
.pv-name { font-size: 13.5px; font-weight: 700; color: #fef3c7; }
.pv-status { margin-left: auto; font-size: 9px; font-family: var(--shift-mono); font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 8px; border-radius: 999px; color: var(--shift-amber); background: rgba(251,191,36,0.14); border: 1px solid rgba(251,191,36,0.3); }
.pv-status[data-pub="true"] { color: var(--shift-ok); background: var(--shift-ok-soft); border-color: color-mix(in srgb, var(--shift-ok) 30%, transparent); }
.pv-meta { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--shift-text-muted); }
.pv-meta .mono { font-family: var(--shift-mono); color: var(--shift-text-2); }
.pv-meta b { color: #fecaca; font-family: var(--shift-mono); }
.pv-dot { opacity: 0.4; }

.rd-callout { display: flex; align-items: flex-start; gap: 9px; padding: 11px 13px; border-radius: 12px; font-size: 12px; line-height: 1.45; color: var(--shift-text-2); background: var(--shift-warn-soft); border: 1px solid color-mix(in srgb, var(--shift-ember) 32%, transparent); }
.rd-callout svg { color: var(--shift-ember-strong); flex-shrink: 0; margin-top: 1px; }
.rd-callout b { color: var(--shift-text); }

.rd-section { display: flex; flex-direction: column; gap: 9px; }
.rd-shead { display: flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--shift-text-muted); }
.rd-shead > svg { color: #f87171; }
.opt { margin-left: auto; font-size: 10px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--shift-text-dim); }
.rd-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.rchip { padding: 5px 10px; border-radius: 999px; cursor: pointer; font-size: 11px; font-weight: 600; background: rgba(40,22,22,0.5); border: 1px solid rgba(248,113,113,0.14); color: var(--shift-text-muted); transition: 0.18s; }
.rchip:hover { border-color: rgba(248,113,113,0.32); color: var(--shift-text-2); }
.rchip.on { background: rgba(239,68,68,0.16); border-color: rgba(248,113,113,0.5); color: #fecaca; }
.rd-textarea { width: 100%; resize: vertical; min-height: 50px; padding: 10px 12px; border-radius: 11px; background: rgba(20, 12, 12, 0.55); border: 1px solid rgba(248,113,113,0.22); color: var(--shift-text); font: inherit; font-size: 12.5px; line-height: 1.5; outline: none; transition: border-color .2s, box-shadow .2s; }
.rd-textarea:focus { border-color: rgba(248,113,113,0.55); box-shadow: 0 0 0 4px rgba(239,68,68,0.1); }
.rd-textarea::placeholder { color: var(--shift-text-dim); }

.conseq { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.conseq li { display: flex; gap: 9px; align-items: flex-start; font-size: 12px; line-height: 1.5; color: var(--shift-text-2); padding: 9px 11px; border-radius: 10px; background: rgba(40,22,22,0.4); border: 1px solid rgba(248,113,113,0.1); }
.conseq li b { color: #fef3c7; font-weight: 700; }
.cq { width: 6px; height: 6px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; background: #f87171; box-shadow: 0 0 8px rgba(248,113,113,0.5); }
.cq.ok { background: var(--shift-ok); box-shadow: 0 0 8px rgba(52, 211, 153, 0.5); }

.rd-foot { position: relative; z-index: 2; display: flex; align-items: center; gap: 10px; padding: 13px 22px 14px 36px; border-top: 1px solid rgba(248,113,113,0.14); background: rgba(14,12,12,0.5); }
.foot-gap { flex: 1; }
.rd-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 40px; padding: 0 18px; border-radius: 12px; cursor: pointer; font-size: 12.5px; font-weight: 700; overflow: hidden; transition: background .25s, border-color .25s, color .25s, box-shadow .25s, transform .2s; }
.rd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.rd-btn.ghost { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: var(--shift-text-2); }
.rd-btn.ghost:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: var(--shift-text); }
.rd-btn.danger { background: linear-gradient(135deg, #f87171, #dc2626 65%, #991b1b); border: none; color: #fff; box-shadow: 0 12px 30px -10px rgba(239, 68, 68, 0.7); animation: rd-armed 2s ease-in-out infinite; }
@keyframes rd-armed { 0%,100% { box-shadow: 0 12px 30px -10px rgba(239, 68, 68, 0.6); } 50% { box-shadow: 0 14px 36px -8px rgba(239, 68, 68, 0.85); } }
.flare { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%); transform: translateX(-120%); animation: rd-flare 2.5s linear infinite; pointer-events: none; }
@keyframes rd-flare { 0% { transform: translateX(-120%); } 55%,100% { transform: translateX(160%); } }
.spin :deep(svg), .spin { animation: shift-spin 0.9s linear infinite; }
.mono { font-family: var(--shift-mono); }

.rd-modal-enter-active { transition: opacity .4s var(--shift-ease); }
.rd-modal-leave-active { transition: opacity .28s ease; }
.rd-modal-enter-from, .rd-modal-leave-to { opacity: 0; }
.rd-modal-leave-active .rd-modal { transition: transform .28s var(--shift-ease), opacity .28s; }
.rd-modal-leave-to .rd-modal { transform: translateY(12px) scale(0.97); opacity: 0; }
.rd-fade-enter-active { transition: opacity .35s var(--shift-ease); } .rd-fade-enter-from { opacity: 0; }

@media (max-width: 560px) { .rd-body { padding-left: 28px; } }
@media (prefers-reduced-motion: reduce) { .rd-mote, .rd-aurora .orb, .rd-scan::after, .ic-ring, .ic-pulse, .ic-glow, .flare, .rd-btn.danger { animation: none; } }

/* light */
[data-theme="light"] .rd-scrim { background: radial-gradient(60% 60% at 50% 38%, rgba(220, 38, 38, 0.16), transparent 65%), radial-gradient(90% 90% at 50% 50%, rgba(40, 20, 20, 0.22), rgba(30, 14, 14, 0.32)); }
[data-theme="light"] .rd-modal {
  background: linear-gradient(180deg, #f87171 0%, #ef4444 30%, #dc2626 60%, #991b1b 100%) left top / 5px 100% no-repeat,
    radial-gradient(70% 110% at 0% 50%, rgba(239, 68, 68, 0.12), transparent 55%), rgba(255, 250, 245, 0.97);
  border-color: rgba(220,38,38,0.28); border-left: none;
  box-shadow: 0 60px 120px -40px rgba(127, 29, 29, 0.36), inset 12px 0 26px -14px rgba(220, 38, 38, 0.3), inset 5px 0 0 -4px rgba(220, 38, 38, 0.6);
}
[data-theme="light"] .rd-aurora .orb { opacity: 0.3; }
[data-theme="light"] .rd-grid { opacity: 0.35; }
[data-theme="light"] .rd-hero-text h2 { background: linear-gradient(135deg, #1a0e0e, #7f1d1d 60%, #b91c1c); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
[data-theme="light"] .rd-eyebrow { color: #b91c1c; }
[data-theme="light"] .rd-preview { background: rgba(255,244,244,0.85); border-color: rgba(220,38,38,0.2); }
[data-theme="light"] .pv-name { color: #1a0e0e; }
[data-theme="light"] .pv-meta b { color: #991b1b; }
[data-theme="light"] .conseq li { background: rgba(255,244,244,0.7); border-color: rgba(220,38,38,0.12); }
[data-theme="light"] .conseq li b { color: #1a0e0e; }
[data-theme="light"] .rchip { background: rgba(255,244,244,0.7); border-color: rgba(220,38,38,0.14); }
[data-theme="light"] .rchip.on { background: rgba(239,68,68,0.16); border-color: rgba(220,38,38,0.5); color: #991b1b; }
[data-theme="light"] .rd-textarea { background: rgba(255,250,245,0.92); border-color: rgba(220,38,38,0.22); color: #1a1410; }
[data-theme="light"] .rd-foot { background: rgba(255,244,238,0.62); border-top-color: rgba(220,38,38,0.14); }
[data-theme="light"] .rd-btn.ghost { background: rgba(40,20,12,0.04); color: var(--shift-text-2); }
[data-theme="light"] .rd-close { background: rgba(40,20,12,0.05); color: #991b1b; }
</style>
