<template>
  <Teleport to="body">
    <transition name="dc-modal" appear>
      <div v-if="open" class="dc-scrim" @click.self="onCancel">
        <div class="dc-motes" aria-hidden="true">
          <span v-for="n in 12" :key="n" class="dc-mote" :style="moteStyle(n)" />
        </div>

        <Motion as="div" class="dc-modal" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 28, scale: 0.92, rotateX: -7 }"
          :animate="{ opacity: 1, y: 0, scale: 1, rotateX: 0 }"
          :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">

          <div class="dc-aurora" aria-hidden="true"><span class="orb a1" /><span class="orb a2" /></div>
          <div class="dc-grid" aria-hidden="true" />
          <div class="dc-scan" aria-hidden="true" />

          <div class="dc-body" v-if="shift">
            <!-- HERO -->
            <header class="dc-hero">
              <button class="dc-close" @click="onCancel" aria-label="Close"><X :size="15" /></button>
              <Motion as="div" class="dc-hero-row"
                :initial="{ y: -10, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
                :transition="{ duration: 0.5, delay: 0.08, ease: [0.16,1,0.3,1] }">
                <div class="dc-hero-icon">
                  <PowerOff :size="22" />
                  <span class="ic-ring" /><span class="ic-pulse" /><span class="ic-glow" />
                </div>
                <div class="dc-hero-text">
                  <span class="dc-eyebrow"><span class="eye-dot" /> DECOMMISSION · SHIFT LIFECYCLE</span>
                  <h2 class="dc-title">Decommission this shift?</h2>
                  <p class="dc-sub">A shift in use should never be silently removed. Choose how to retire <b>{{ shift.name }}</b> — archive it (reversible) or delete it once no one is rostered.</p>
                </div>
              </Motion>
            </header>

            <!-- SHIFT CHIP -->
            <Motion as="div" class="dc-chip"
              :initial="{ y: 12, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.4, delay: 0.14 }">
              <span class="dc-code" :style="{ '--c': accent }">{{ shift.code }}</span>
              <div class="dc-chip-tl"><ShiftMiniTimeline :start="startT" :end="endT" :color="accent" :show-labels="false" compact /></div>
              <span v-if="shift.is_active === false" class="dc-arch">Archived</span>
            </Motion>

            <!-- IMPACT BANNER -->
            <Motion as="div" class="dc-impact" :data-tone="impactTone"
              :initial="{ y: 12, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.4, delay: 0.2 }">
              <Loader2 v-if="loadingCount" :size="15" class="spin" />
              <component v-else :is="impactTone === 'ok' ? ShieldCheck : AlertTriangle" :size="15" />
              <div class="dc-impact-text">
                <template v-if="loadingCount">Checking active roster…</template>
                <template v-else-if="activeCount > 0">
                  <b>{{ activeCount }}</b> {{ activeCount === 1 ? 'employee is' : 'employees are' }} currently rostered on <span class="mono">{{ shift.code }}</span>.
                  <span class="dc-names" v-if="sampleNames.length"> {{ sampleNames.join(', ') }}<template v-if="activeCount > sampleNames.length"> +{{ activeCount - sampleNames.length }} more</template>.</span>
                </template>
                <template v-else>No active assignments — this shift is safe to delete.</template>
              </div>
              <button v-if="activeCount > 0" type="button" class="dc-reassign" @click="onReassign">Reassign <ArrowRight :size="12" /></button>
            </Motion>

            <!-- ACTION TRACKS -->
            <section class="dc-section">
              <div class="dc-shead"><Layers :size="11" /> <span>Choose an action</span></div>
              <div class="track-grid">
                <button v-if="shift.is_active !== false" type="button" class="track" :class="{ on: mode === 'deactivate' }" @click="mode = 'deactivate'">
                  <span class="tk-ic ok"><Archive :size="16" /></span>
                  <span class="tk-meta">
                    <b>Deactivate <span class="tk-tag">recommended</span></b>
                    <small>Stops new rostering. Keeps history &amp; existing assignments. Reversible anytime.</small>
                  </span>
                  <span class="tk-radio"><span class="tk-dot" /></span>
                </button>

                <button type="button" class="track danger" :class="{ on: mode === 'delete', locked: activeCount > 0 }"
                  :disabled="activeCount > 0" @click="activeCount === 0 && (mode = 'delete')">
                  <span class="tk-ic alert"><Trash2 :size="16" /></span>
                  <span class="tk-meta">
                    <b>Delete permanently</b>
                    <small v-if="activeCount > 0">Blocked — stand down or reassign the {{ activeCount }} rostered {{ activeCount === 1 ? 'employee' : 'crew' }} first.</small>
                    <small v-else>Soft-deletes the template. Audit-logged. Cannot be reassigned after.</small>
                  </span>
                  <span class="tk-radio"><span class="tk-dot" /></span>
                </button>
              </div>
            </section>

            <!-- REASON -->
            <section class="dc-section">
              <div class="dc-shead"><ScrollText :size="11" /> <span>Reason</span>
                <span v-if="mode === 'delete'" class="req">required</span><span v-else class="opt">optional</span></div>
              <div class="reason-chips">
                <button v-for="r in REASONS" :key="r" type="button" class="rchip" :class="{ on: notes === r }" @click="notes = notes === r ? '' : r">{{ r }}</button>
              </div>
              <textarea v-model.trim="notes" class="dc-textarea" :maxlength="500" rows="2"
                :placeholder="mode === 'delete' ? 'Why is this shift being deleted?' : 'Optional note for the lifecycle log…'" />
            </section>

            <!-- CONSEQUENCES -->
            <section class="dc-section">
              <div class="dc-shead"><Info :size="11" /> <span>What happens</span></div>
              <ul class="conseq">
                <template v-if="mode === 'deactivate'">
                  <li><span class="cq" /><span>Hidden from the <b>launch bay</b> — no new crew can be deployed to it.</span></li>
                  <li><span class="cq ok" /><span>Existing assignments &amp; attendance history <b>stay intact</b>.</span></li>
                  <li><span class="cq ok" /><span><b>Reversible</b> — reactivate it from the shift card whenever you need it.</span></li>
                </template>
                <template v-else>
                  <li><span class="cq" /><span>Removed from <b>Shift Management</b>, dashboards &amp; the launch bay.</span></li>
                  <li><span class="cq" /><span>Recorded in the <b>audit trail</b> with your reason &amp; timestamp.</span></li>
                  <li><span class="cq ok" /><span>Past attendance records that referenced it are <b>preserved</b>.</span></li>
                </template>
              </ul>
            </section>
          </div>

          <!-- FOOTER -->
          <footer class="dc-foot">
            <button type="button" class="dc-btn ghost" :disabled="busy" @click="onCancel">Cancel</button>
            <div class="foot-gap" />
            <Motion as="button" type="button" class="dc-btn"
              :class="{ deact: mode === 'deactivate', del: mode === 'delete', armed: canConfirm }"
              :disabled="!canConfirm || busy" :whileHover="canConfirm ? { y: -2 } : {}" :whileTap="canConfirm ? { scale: 0.96 } : {}"
              @click="onConfirm">
              <Loader2 v-if="busy" :size="14" class="spin" />
              <Archive v-else-if="mode === 'deactivate'" :size="14" /><Trash2 v-else :size="14" />
              <span>{{ busy ? 'Working…' : (mode === 'deactivate' ? 'Deactivate shift' : 'Delete shift') }}</span>
              <span v-if="canConfirm && !busy" class="flare" aria-hidden="true" />
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
import {
  X, PowerOff, Archive, Trash2, ScrollText, Info, Check, Loader2, ArrowRight,
  ShieldCheck, AlertTriangle, Layers,
} from 'lucide-vue-next'
import ShiftMiniTimeline from '../components/ShiftMiniTimeline.vue'
import { fetchShiftAssignments, shiftTypeMeta, todayIso } from '@/composables/useShifts'

const props = defineProps({
  open: { type: Boolean, default: false },
  shift: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['cancel', 'confirm', 'reassign'])

const REASONS = ['Replaced by new shift', 'Consolidated', 'Seasonal end', 'Restructure', 'No longer used']

const mode = ref('deactivate')
const notes = ref('')
const loadingCount = ref(false)
const activeCount = ref(0)
const sampleNames = ref([])

const accent = computed(() => shiftTypeMeta(props.shift?.shift_type).color)
const startT = computed(() => (props.shift?.start_time || '').slice(0, 5))
const endT = computed(() => (props.shift?.end_time || '').slice(0, 5))
const impactTone = computed(() => activeCount.value > 0 ? 'warn' : 'ok')

const canConfirm = computed(() => {
  if (props.busy) return false
  if (mode.value === 'delete') return activeCount.value === 0 && !!notes.value.trim()
  return true
})

// Count assignments that are active or upcoming (matches the backend delete guard:
// effective_until IS NULL OR effective_until >= today).
const loadCount = async () => {
  if (!props.shift) return
  loadingCount.value = true
  try {
    const data = await fetchShiftAssignments({ shift_id: props.shift.id })
    const rows = Array.isArray(data) ? data : (data?.items || [])
    const today = todayIso()
    const live = rows.filter(a => !a.effective_until || a.effective_until >= today)
    activeCount.value = live.length
    sampleNames.value = live.slice(0, 4).map(a => a.employee_name || 'Employee')
  } catch {
    activeCount.value = 0; sampleNames.value = []
  } finally { loadingCount.value = false }
}

watch(() => props.open, (v) => {
  if (!v) return
  notes.value = ''
  // already-archived shifts can only be deleted
  mode.value = props.shift?.is_active === false ? 'delete' : 'deactivate'
  activeCount.value = 0; sampleNames.value = []
  loadCount()
})

const onCancel = () => { if (!props.busy) emit('cancel') }
const onReassign = () => { if (!props.busy) emit('reassign', props.shift) }
const onConfirm = () => {
  if (!canConfirm.value) return
  emit('confirm', { mode: mode.value, reason: notes.value.trim() })
}

const moteStyle = (n) => {
  const x = (n * 53) % 100, y = (n * 71) % 100
  const dur = 6 + ((n * 3) % 7), delay = (n % 5) * 0.45, size = 2 + (n % 3)
  return { left: `${x}%`, top: `${y}%`, width: `${size}px`, height: `${size}px`, animationDuration: `${dur}s`, animationDelay: `${delay}s` }
}
</script>

<style scoped>
.dc-scrim {
  position: fixed; inset: 0; z-index: 1210; display: flex; align-items: center; justify-content: center; padding: 24px;
  background:
    radial-gradient(60% 60% at 50% 38%, rgba(234, 88, 12, 0.2), transparent 65%),
    radial-gradient(90% 90% at 50% 50%, rgba(8, 7, 6, 0.6), rgba(3, 3, 4, 0.78));
  backdrop-filter: blur(15px) saturate(150%); -webkit-backdrop-filter: blur(15px) saturate(150%);
  perspective: 1400px; overflow-y: auto;
}
.dc-motes { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.dc-mote { position: absolute; border-radius: 50%; background: radial-gradient(circle, rgba(251, 146, 60, 0.85), rgba(251, 146, 60, 0)); box-shadow: 0 0 10px rgba(251, 146, 60, 0.5); opacity: 0.55; animation: dc-float linear infinite; }
@keyframes dc-float { 0% { transform: translate3d(0, 18vh, 0) scale(0.6); opacity: 0; } 15% { opacity: 0.55; } 85% { opacity: 0.55; } 100% { transform: translate3d(30px, -116vh, 0) scale(1.2); opacity: 0; } }

.dc-modal {
  position: relative; width: 560px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px);
  display: flex; flex-direction: column; border-radius: 24px; overflow: hidden; isolation: isolate;
  background:
    linear-gradient(180deg, #fde68a 0%, #fbbf24 22%, #f59e0b 50%, #ea580c 100%) left top / 5px 100% no-repeat,
    radial-gradient(70% 110% at 0% 50%, rgba(251, 146, 60, 0.16), transparent 55%),
    radial-gradient(90% 60% at 100% 100%, rgba(234, 88, 12, 0.12), transparent 60%),
    linear-gradient(180deg, rgba(18, 18, 20, 0.96), rgba(13, 13, 15, 0.96));
  border: 1px solid var(--shift-border); border-left: none;
  box-shadow: 0 60px 120px -40px rgba(0,0,0,0.92), inset 12px 0 30px -14px rgba(251, 146, 60, 0.4), inset 5px 0 0 -4px rgba(251, 191, 36, 0.8);
}
.dc-aurora { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.dc-aurora .orb { position: absolute; border-radius: 50%; filter: blur(68px); opacity: 0.5; }
.dc-aurora .a1 { width: 300px; height: 300px; top: -120px; right: -100px; background: radial-gradient(circle, rgba(251, 146, 60, 0.5), transparent 70%); animation: dc-orb-a 18s ease-in-out infinite; }
.dc-aurora .a2 { width: 240px; height: 240px; bottom: -90px; left: -70px; background: radial-gradient(circle, rgba(245, 158, 11, 0.4), transparent 70%); animation: dc-orb-b 22s ease-in-out infinite; }
@keyframes dc-orb-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-26px,34px) scale(1.08); } }
@keyframes dc-orb-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-22px) scale(1.1); } }
.dc-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0; background-image: radial-gradient(rgba(251, 191, 36, 0.08) 1px, transparent 1px); background-size: 22px 22px; opacity: 0.55; mask-image: linear-gradient(180deg, rgba(0,0,0,0.4), transparent 80%); }
.dc-scan { position: absolute; inset: 0; pointer-events: none; z-index: 1; overflow: hidden; }
.dc-scan::after { content: ''; position: absolute; left: 0; right: 0; height: 80px; background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.16), transparent); filter: blur(6px); transform: translateY(-100%); animation: dc-sweep 1.6s 0.2s cubic-bezier(0.16,1,0.3,1) forwards; }
@keyframes dc-sweep { to { transform: translateY(100vh); opacity: 0; } }

.dc-body { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 15px; padding: 26px 26px 18px 36px; overflow-y: auto; position: relative; z-index: 2;
  scrollbar-width: thin; scrollbar-color: rgba(251,191,36,0.3) transparent; }
.dc-body::-webkit-scrollbar { width: 5px; }
.dc-body::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(251,191,36,0.3), rgba(234,88,12,0.45)); border-radius: 3px; }

/* hero */
.dc-hero { position: relative; padding-right: 32px; }
.dc-close { position: absolute; top: -4px; right: -4px; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer;
  background: rgba(255,255,255,0.05); border: 1px solid var(--shift-border); color: var(--shift-amber); transition: transform .35s var(--shift-spring), background .25s; }
.dc-close:hover { transform: rotate(90deg); background: rgba(251,146,60,0.18); }
.dc-hero-row { display: flex; align-items: flex-start; gap: 14px; }
.dc-hero-icon { position: relative; display: grid; place-items: center; width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.24), rgba(234, 88, 12, 0.2)); border: 1px solid var(--shift-border); color: var(--shift-amber); box-shadow: 0 10px 28px -10px rgba(251, 146, 60, 0.6); }
.ic-ring { position: absolute; inset: -5px; border-radius: 19px; pointer-events: none;
  background: conic-gradient(from 0deg, transparent, var(--shift-amber), transparent 25%, transparent 50%, var(--shift-ember), transparent 75%);
  -webkit-mask: radial-gradient(transparent 56%, #000 58%); mask: radial-gradient(transparent 56%, #000 58%); animation: dc-ring 6s linear infinite; opacity: 0.85; }
@keyframes dc-ring { to { transform: rotate(360deg); } }
.ic-pulse { position: absolute; inset: 0; border-radius: 16px; pointer-events: none; animation: dc-pulse 2.2s ease-out infinite; }
@keyframes dc-pulse { 0% { box-shadow: 0 0 0 0 rgba(251, 146, 60, 0.55); } 70% { box-shadow: 0 0 0 14px rgba(251, 146, 60, 0); } 100% { box-shadow: 0 0 0 0 rgba(251, 146, 60, 0); } }
.ic-glow { position: absolute; inset: -16px; border-radius: 28px; pointer-events: none; z-index: -1; background: radial-gradient(circle, rgba(251, 146, 60, 0.3), transparent 65%); animation: dc-glow 3.6s ease-in-out infinite; }
@keyframes dc-glow { 0%,100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
.dc-hero-text { display: flex; flex-direction: column; gap: 5px; min-width: 0; flex: 1; }
.dc-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: var(--shift-amber-strong); width: max-content; }
.eye-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--shift-ember); box-shadow: 0 0 8px var(--shift-ember); animation: dc-eye 1.6s ease-in-out infinite; }
@keyframes dc-eye { 0%,100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.4); } }
.dc-title { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.018em; line-height: 1.15; color: var(--shift-text); }
.dc-sub { margin: 2px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--shift-text-muted); }
.dc-sub b { color: var(--shift-text-2); }

/* shift chip */
.dc-chip { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 13px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.dc-code { font-family: var(--shift-mono); font-size: 12px; font-weight: 800; padding: 3px 9px; border-radius: 7px; flex-shrink: 0; color: var(--c, var(--shift-amber)); background: color-mix(in srgb, var(--c, var(--shift-amber)) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c, var(--shift-amber)) 32%, transparent); }
.dc-chip-tl { flex: 1; min-width: 0; }
.dc-arch { font-size: 9px; font-family: var(--shift-mono); text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 8px; border-radius: 999px; color: var(--shift-text-muted); background: rgba(148,163,184,0.12); border: 1px solid var(--shift-border-soft); flex-shrink: 0; }

/* impact */
.dc-impact { display: flex; align-items: center; gap: 10px; padding: 11px 13px; border-radius: 12px; font-size: 12px; line-height: 1.45; }
.dc-impact[data-tone="ok"] { background: var(--shift-ok-soft); border: 1px solid color-mix(in srgb, var(--shift-ok) 30%, transparent); color: var(--shift-ok); }
.dc-impact[data-tone="warn"] { background: var(--shift-warn-soft); border: 1px solid color-mix(in srgb, var(--shift-ember) 32%, transparent); color: var(--shift-ember-strong); }
.dc-impact > svg { flex-shrink: 0; }
.dc-impact-text { flex: 1; color: var(--shift-text-2); }
.dc-impact-text b { color: var(--shift-text); font-family: var(--shift-mono); }
.dc-impact-text .mono { font-family: var(--shift-mono); color: var(--shift-text); }
.dc-names { color: var(--shift-text-muted); }
.dc-reassign { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; padding: 6px 11px; border-radius: 9px; cursor: pointer; font-size: 11px; font-weight: 700;
  background: var(--shift-grad-cta); border: none; color: #1f1408; }

/* sections */
.dc-section { display: flex; flex-direction: column; gap: 9px; }
.dc-shead { display: flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--shift-text-muted); }
.dc-shead > svg { color: var(--shift-amber); }
.req { margin-left: auto; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; color: var(--shift-alert); padding: 2px 7px; border-radius: 999px; background: var(--shift-alert-soft); border: 1px solid color-mix(in srgb, var(--shift-alert) 30%, transparent); }
.opt { margin-left: auto; font-size: 10px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--shift-text-dim); }

.track-grid { display: flex; flex-direction: column; gap: 8px; }
.track { display: flex; align-items: center; gap: 12px; padding: 12px 13px; border-radius: 13px; cursor: pointer; text-align: left;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: border-color .2s, background .2s, box-shadow .2s; }
.track:hover:not(:disabled) { border-color: var(--shift-border); }
.track.on { border-color: var(--shift-amber); background: rgba(251,191,36,0.08); box-shadow: 0 8px 22px -14px rgba(251, 146, 60, 0.6); }
.track.danger.on { border-color: color-mix(in srgb, var(--shift-alert) 55%, transparent); background: var(--shift-alert-soft); box-shadow: 0 8px 22px -14px rgba(239, 68, 68, 0.5); }
.track:disabled, .track.locked { opacity: 0.55; cursor: not-allowed; }
.tk-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; }
.tk-ic.ok { background: var(--shift-ok-soft); color: var(--shift-ok); }
.tk-ic.alert { background: var(--shift-alert-soft); color: var(--shift-alert); }
.tk-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.tk-meta b { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700; color: var(--shift-text); }
.tk-tag { font-size: 8.5px; font-family: var(--shift-mono); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 6px; border-radius: 999px; color: var(--shift-ok); background: var(--shift-ok-soft); border: 1px solid color-mix(in srgb, var(--shift-ok) 30%, transparent); }
.tk-meta small { font-size: 11px; line-height: 1.4; color: var(--shift-text-muted); }
.tk-radio { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0; border: 1.5px solid var(--shift-border-soft); transition: 0.2s; }
.track.on .tk-radio { border-color: var(--shift-amber); }
.track.danger.on .tk-radio { border-color: var(--shift-alert); }
.tk-dot { width: 10px; height: 10px; border-radius: 50%; background: transparent; transition: 0.2s; }
.track.on .tk-dot { background: var(--shift-amber); }
.track.danger.on .tk-dot { background: var(--shift-alert); }

.reason-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.rchip { padding: 5px 10px; border-radius: 999px; cursor: pointer; font-size: 11px; font-weight: 600; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-muted); transition: 0.18s; }
.rchip:hover { border-color: var(--shift-border); color: var(--shift-text-2); }
.rchip.on { background: rgba(251,191,36,0.12); border-color: var(--shift-amber); color: var(--shift-amber); }
.dc-textarea { width: 100%; resize: vertical; min-height: 50px; padding: 10px 12px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text); font: inherit; font-size: 12.5px; line-height: 1.5; outline: none; transition: border-color .2s, box-shadow .2s; }
.dc-textarea:focus { border-color: var(--shift-amber); box-shadow: 0 0 0 3px rgba(251,191,36,0.1); }
.dc-textarea::placeholder { color: var(--shift-text-dim); }

.conseq { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.conseq li { display: flex; gap: 9px; align-items: flex-start; font-size: 12px; line-height: 1.5; color: var(--shift-text-2); padding: 9px 11px; border-radius: 10px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.conseq li b { color: var(--shift-text); font-weight: 700; }
.cq { width: 6px; height: 6px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; background: var(--shift-ember); box-shadow: 0 0 8px rgba(251, 146, 60, 0.5); }
.cq.ok { background: var(--shift-ok); box-shadow: 0 0 8px rgba(52, 211, 153, 0.5); }

/* footer */
.dc-foot { position: relative; z-index: 2; display: flex; align-items: center; gap: 10px; padding: 13px 22px 14px 36px; border-top: 1px solid var(--shift-border-soft); background: rgba(13,13,15,0.5); }
.foot-gap { flex: 1; }
.dc-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 40px; padding: 0 18px; border-radius: 12px; cursor: pointer; font-size: 12.5px; font-weight: 700; overflow: hidden; transition: background .25s, border-color .25s, color .25s, box-shadow .25s, transform .2s; }
.dc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.dc-btn.ghost { background: rgba(255,255,255,0.04); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); }
.dc-btn.ghost:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: var(--shift-text); }
.dc-btn.deact { background: var(--shift-surface-2); border: 1px solid var(--shift-border); color: var(--shift-amber); }
.dc-btn.deact.armed { background: var(--shift-grad-cta); border-color: transparent; color: #1f1408; box-shadow: 0 12px 30px -10px rgba(251, 146, 60, 0.7); }
.dc-btn.del { background: var(--shift-alert-soft); border: 1px solid color-mix(in srgb, var(--shift-alert) 36%, transparent); color: var(--shift-alert); }
.dc-btn.del.armed { background: linear-gradient(135deg, #ef4444, #b91c1c); border-color: transparent; color: #fff; box-shadow: 0 12px 30px -10px rgba(239, 68, 68, 0.7); }
.flare { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%); transform: translateX(-120%); animation: dc-flare 2.5s linear infinite; pointer-events: none; }
@keyframes dc-flare { 0% { transform: translateX(-120%); } 55%,100% { transform: translateX(160%); } }
.spin :deep(svg), .spin { animation: shift-spin 0.9s linear infinite; }
.mono { font-family: var(--shift-mono); }

/* transitions */
.dc-modal-enter-active { transition: opacity .4s var(--shift-ease); }
.dc-modal-leave-active { transition: opacity .28s ease; }
.dc-modal-enter-from, .dc-modal-leave-to { opacity: 0; }
.dc-modal-leave-active .dc-modal { transition: transform .28s var(--shift-ease), opacity .28s; }
.dc-modal-leave-to .dc-modal { transform: translateY(12px) scale(0.97); opacity: 0; }

@media (max-width: 560px) { .dc-body { padding-left: 28px; } }
@media (prefers-reduced-motion: reduce) {
  .dc-mote, .dc-aurora .orb, .dc-scan::after, .ic-ring, .ic-pulse, .ic-glow, .flare { animation: none; }
}

/* light */
[data-theme="light"] .dc-scrim {
  background:
    radial-gradient(60% 60% at 50% 38%, rgba(234, 88, 12, 0.16), transparent 65%),
    radial-gradient(90% 90% at 50% 50%, rgba(40, 30, 18, 0.22), rgba(30, 22, 14, 0.32));
}
[data-theme="light"] .dc-modal {
  background:
    linear-gradient(180deg, #fbbf24 0%, #f59e0b 45%, #ea580c 100%) left top / 5px 100% no-repeat,
    radial-gradient(70% 110% at 0% 50%, rgba(251, 146, 60, 0.12), transparent 55%),
    radial-gradient(90% 60% at 100% 100%, rgba(234, 88, 12, 0.08), transparent 60%),
    rgba(255, 251, 245, 0.97);
  border-color: var(--shift-border); border-left: none;
  box-shadow: 0 60px 120px -40px rgba(40, 25, 10, 0.34), inset 12px 0 26px -14px rgba(234, 88, 12, 0.28), inset 5px 0 0 -4px rgba(245, 158, 11, 0.7);
}
[data-theme="light"] .dc-aurora .orb { opacity: 0.3; }
[data-theme="light"] .dc-grid { opacity: 0.35; }
[data-theme="light"] .dc-close { background: rgba(40,25,10,0.05); }
[data-theme="light"] .dc-close:hover { background: rgba(234,88,12,0.14); }
[data-theme="light"] .dc-foot { background: rgba(252, 245, 232, 0.62); }
[data-theme="light"] .dc-btn.ghost { background: rgba(40,25,10,0.04); color: var(--shift-text-2); }
[data-theme="light"] .dc-btn.ghost:hover:not(:disabled) { background: rgba(40,25,10,0.09); color: var(--shift-text); }
[data-theme="light"] .dc-btn.del.armed { color: #fff; }
[data-theme="light"] .dc-textarea:focus { box-shadow: 0 0 0 3px rgba(217,119,6,0.12); }
</style>
