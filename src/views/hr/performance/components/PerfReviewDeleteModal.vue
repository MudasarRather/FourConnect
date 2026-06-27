<template>
  <teleport to="body">
    <Presence>
      <Motion v-if="open" key="ov" as="div" class="dx-ov perf-scope" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.24 }" @click.self="!busy && $emit('close')">
        <Motion as="div" class="dx" :class="'sev-' + severity" :initial="reduced ? false : { opacity: 0, y: 24, scale: 0.95 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }" :exit="{ opacity: 0, y: 14, scale: 0.97 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="dx-edge" aria-hidden="true" />
          <span class="dx-aura" aria-hidden="true" />

          <header class="dx-head">
            <span class="dx-ic"><ShieldAlert :size="19" /></span>
            <div class="dx-titles">
              <b>Delete this review?</b>
              <span>{{ severity === 'high' ? 'High-impact — read the consequences below' : 'This removes it from the arena' }}</span>
            </div>
            <button class="dx-x" type="button" :disabled="busy" @click="$emit('close')"><X :size="16" /></button>
          </header>

          <div class="dx-body">
            <!-- the review being voided — a chit that morphs to VOID -->
            <div class="dx-chit" :class="{ struck }">
              <span class="dx-chit-grain" aria-hidden="true" />
              <span class="dx-stamp" :class="{ on: struck }">VOID</span>
              <div class="dx-chit-top">
                <span class="dx-chit-av">{{ initials }}</span>
                <div class="dx-chit-id">
                  <b>{{ r.employee_name || '—' }}</b>
                  <span>{{ r.designation_name || r.employee_code || '' }}</span>
                </div>
                <PerfStatusStamp :status="r.status" size="sm" />
              </div>
              <div class="dx-chit-meta">
                <span><CalendarRange :size="11" />{{ r.period_label || r.cycle }}</span>
                <span><FileText :size="11" />{{ r.template_code || r.template_name || 'rubric' }}</span>
                <span v-if="r.overall_score != null"><Gauge :size="11" />{{ Number(r.overall_score).toFixed(1) }}/{{ r.rating_max || 5 }}</span>
              </div>
            </div>

            <!-- consequences -->
            <div class="dx-consq">
              <span class="dx-consq-h"><Info :size="12" /> What happens</span>
              <ul>
                <li v-for="(c, i) in consequences" :key="i" :class="c.tone">
                  <component :is="c.icon" :size="13" />
                  <span v-html="c.text" />
                </li>
              </ul>
            </div>

            <!-- critical applied-hike warning -->
            <div v-if="hikeApplied" class="dx-critical">
              <Banknote :size="16" />
              <div>
                <b>An approved pay increment is already live</b>
                <p>The <b>+{{ r.approved_hike_pct }}%</b> hike created a salary revision (<b>{{ inr(r.prev_annual_ctc) }}</b> → <b>{{ inr(r.new_annual_ctc) }}</b>). Deleting the review does <u>not</u> reverse that pay change — you must adjust the employee's compensation record separately.</p>
              </div>
            </div>

            <!-- reason -->
            <div class="dx-reason">
              <label class="dx-reason-lab">Reason {{ requireReason ? '' : '(optional)' }}<i v-if="requireReason">*</i></label>
              <div class="dx-chips">
                <button v-for="p in REASONS" :key="p" type="button" class="dx-chip" :class="{ on: reason === p }" @click="reason = p">{{ p }}</button>
              </div>
              <textarea v-model="reason" class="dx-note" rows="2" placeholder="Add a note for the audit trail…" />
            </div>

            <!-- reversible alternative -->
            <div v-if="canCancelInstead" class="dx-alt">
              <RotateCcw :size="14" />
              <div class="dx-alt-txt"><b>Prefer to keep the record?</b><span>Cancel the review instead — it stays auditable and can be reopened later.</span></div>
              <button class="perf-btn dx-alt-btn" type="button" :disabled="busy" @click="$emit('cancel-review', reason)">
                <Loader2 v-if="busy === 'cancel'" :size="13" class="perf-spin" /><CircleSlash v-else :size="13" /> Cancel instead
              </button>
            </div>
          </div>

          <footer class="dx-foot">
            <button class="perf-btn perf-btn-ghost" type="button" :disabled="busy" @click="$emit('close')">Keep review</button>
            <button class="perf-btn dx-del" type="button" :disabled="busy || (requireReason && !reason.trim())" @click="confirm">
              <Loader2 v-if="busy === 'delete'" :size="14" class="perf-spin" /><Trash2 v-else :size="14" />
              {{ severity === 'high' ? 'Delete anyway' : 'Delete review' }}
            </button>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, ShieldAlert, Trash2, Info, CalendarRange, FileText, Gauge, Banknote, RotateCcw, CircleSlash, Loader2, EyeOff, BarChart3, UserCheck, AlertTriangle } from 'lucide-vue-next'
import PerfStatusStamp from './PerfStatusStamp.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  review: { type: Object, default: null },
  busy: { type: [Boolean, String], default: false },
})
const emit = defineEmits(['close', 'confirm', 'cancel-review'])
const reduced = prefersReduced()

const r = computed(() => props.review || {})
const reason = ref('')
const struck = ref(false)

const REASONS = ['Created in error', 'Duplicate', 'Wrong employee', 'Wrong rubric', 'Superseded']

const hikeApplied = computed(() => r.value.hike_status === 'APPLIED')
const finalised = computed(() => ['COMPLETED', 'ACKNOWLEDGED'].includes(r.value.status))
const hasScores = computed(() => r.value.overall_score != null || r.value.self_overall != null || r.value.manager_overall != null)
const severity = computed(() => (hikeApplied.value || finalised.value) ? 'high' : (hasScores.value ? 'mid' : 'low'))
const requireReason = computed(() => severity.value === 'high')
// only in-flight statuses can transition to CANCELLED (per the backend state machine)
const canCancelInstead = computed(() => ['DRAFT', 'SELF_ASSESSMENT', 'MANAGER_ASSESSMENT'].includes(r.value.status))

const initials = computed(() => (r.value.employee_name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?')
const inr = (v) => v == null ? '—' : '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const consequences = computed(() => {
  const out = [{ icon: EyeOff, tone: '', text: 'The review is <b>soft-deleted</b> — hidden from every list, the dashboard counts and the employee’s timeline.' }]
  if (finalised.value) out.push({ icon: UserCheck, tone: 'warn', text: 'This is a <b>finalised, manager-scored</b> review — the employee may have already seen or acknowledged it.' })
  if (hasScores.value) out.push({ icon: BarChart3, tone: '', text: 'Its scores &amp; comments drop out of reporting — <b>average score, distributions and calibration</b> recompute without it.' })
  if (hikeApplied.value) out.push({ icon: AlertTriangle, tone: 'crit', text: 'The <b>applied salary increment is not reversed</b> by this delete (see below).' })
  if (!finalised.value && !hasScores.value) out.push({ icon: Info, tone: '', text: 'No scores were recorded yet, so reporting is unaffected.' })
  return out
})

watch(() => props.open, (v) => { if (v) { reason.value = ''; struck.value = false } })

function confirm() {
  if (requireReason.value && !reason.value.trim()) return
  if (!reduced) { struck.value = true; setTimeout(() => emit('confirm', reason.value), 240) }
  else emit('confirm', reason.value)
}
</script>

<style scoped>
.dx-ov { position: fixed; inset: 0; z-index: 1340; display: flex; align-items: center; justify-content: center; padding: 24px;
  background: rgba(5, 5, 6, 0.68); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.dx { position: relative; width: 100%; max-width: 540px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; border-radius: 22px;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); box-shadow: 0 48px 110px -44px rgba(0,0,0,0.9); }
.dx-edge { position: absolute; left: 0; right: 0; top: 0; height: 3px; z-index: 2; background: linear-gradient(90deg, var(--perf-conflict), var(--perf-orange)); }
.dx.sev-high .dx-edge { background: var(--perf-conflict); }
.dx-aura { position: absolute; top: -30%; right: -10%; width: 55%; height: 70%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-conflict) 18%, transparent), transparent 70%); filter: blur(44px); }

.dx-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; padding: 17px 18px 14px; border-bottom: 1px solid var(--perf-border); }
.dx-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; color: var(--perf-conflict);
  background: var(--perf-conflict-soft); border: 1px solid color-mix(in srgb, var(--perf-conflict) 30%, transparent); }
.dx-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.dx-titles b { font-size: 16px; font-weight: 850; color: var(--perf-text); }
.dx-titles span { font-size: 12px; color: var(--perf-text-muted); }
.dx-x { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.dx-x:hover:not(:disabled) { color: var(--perf-text); transform: rotate(90deg); }

.dx-body { position: relative; z-index: 1; flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; }

/* chit */
.dx-chit { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 9px; padding: 13px; border-radius: 15px;
  background: var(--perf-panel); border: 1px solid var(--perf-border); transition: opacity 0.4s, filter 0.4s, transform 0.4s; }
.dx-chit.struck { opacity: 0.5; filter: grayscale(0.6); transform: scale(0.985); }
.dx-chit-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.3;
  background-image: linear-gradient(color-mix(in srgb, var(--perf-conflict) 6%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--perf-conflict) 6%, transparent) 1px, transparent 1px);
  background-size: 14px 14px; mask-image: radial-gradient(100% 100% at 50% 0%, #000, transparent 80%); }
.dx-stamp { position: absolute; top: 50%; left: 50%; z-index: 3; font-size: 38px; font-weight: 900; letter-spacing: 0.16em; color: var(--perf-conflict);
  border: 4px solid var(--perf-conflict); border-radius: 10px; padding: 2px 14px; opacity: 0; transform: translate(-50%, -50%) rotate(-14deg) scale(1.4); transition: opacity 0.3s, transform 0.3s var(--perf-spring); }
.dx-stamp.on { opacity: 0.92; transform: translate(-50%, -50%) rotate(-14deg) scale(1); }
.dx-chit-top { position: relative; display: flex; align-items: center; gap: 10px; }
.dx-chit-av { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; font-size: 12px; font-weight: 800; color: #1a1206; background: var(--perf-grad-hero); }
.dx-chit-id { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.dx-chit-id b { font-size: 13.5px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dx-chit-id span { font-size: 11px; color: var(--perf-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dx-chit-meta { position: relative; display: flex; flex-wrap: wrap; gap: 6px; }
.dx-chit-meta span { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--perf-text-secondary); }
.dx-chit-meta :deep(svg) { color: var(--perf-text-dim); }

/* consequences */
.dx-consq { display: flex; flex-direction: column; gap: 8px; }
.dx-consq-h { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-text-muted); }
.dx-consq-h :deep(svg) { color: var(--perf-gold); }
.dx-consq ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.dx-consq li { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; line-height: 1.45; color: var(--perf-text-secondary); }
.dx-consq li :deep(svg) { color: var(--perf-text-dim); flex-shrink: 0; margin-top: 1px; }
.dx-consq li :deep(b) { color: var(--perf-text); font-weight: 750; }
.dx-consq li.warn { color: var(--perf-text); } .dx-consq li.warn :deep(svg) { color: var(--perf-orange); }
.dx-consq li.crit :deep(svg) { color: var(--perf-conflict); }

/* critical hike warning */
.dx-critical { display: flex; gap: 11px; padding: 13px; border-radius: 14px;
  background: color-mix(in srgb, var(--perf-conflict) 11%, transparent); border: 1px solid color-mix(in srgb, var(--perf-conflict) 32%, transparent); }
.dx-critical > :deep(svg) { color: var(--perf-conflict); flex-shrink: 0; margin-top: 1px; }
.dx-critical b { font-size: 12.5px; font-weight: 800; color: var(--perf-conflict); }
.dx-critical p { margin: 4px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--perf-text-secondary); }
.dx-critical p b { color: var(--perf-text); }

/* reason */
.dx-reason { display: flex; flex-direction: column; gap: 8px; }
.dx-reason-lab { font-size: 11.5px; font-weight: 700; color: var(--perf-text-secondary); }
.dx-reason-lab i { color: var(--perf-conflict); font-style: normal; }
.dx-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dx-chip { font: inherit; font-size: 11px; font-weight: 650; padding: 5px 11px; border-radius: 999px; cursor: pointer;
  color: var(--perf-text-muted); background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.16s; }
.dx-chip:hover { color: var(--perf-text); border-color: var(--perf-border-strong); }
.dx-chip.on { color: var(--perf-conflict); background: var(--perf-conflict-soft); border-color: color-mix(in srgb, var(--perf-conflict) 34%, transparent); }
.dx-note { width: 100%; resize: vertical; min-height: 42px; padding: 9px 11px; border-radius: 11px; font: inherit; font-size: 12.5px;
  color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.dx-note:focus { outline: none; border-color: var(--perf-border-warm); }

/* reversible alt */
.dx-alt { display: flex; align-items: center; gap: 10px; padding: 11px 13px; border-radius: 14px;
  background: color-mix(in srgb, var(--perf-gold) 8%, var(--perf-surface)); border: 1px solid var(--perf-border-warm); }
.dx-alt > :deep(svg) { color: var(--perf-gold); flex-shrink: 0; }
.dx-alt-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.dx-alt-txt b { font-size: 12px; font-weight: 800; color: var(--perf-text); }
.dx-alt-txt span { font-size: 11px; color: var(--perf-text-muted); }
.dx-alt-btn { flex-shrink: 0; color: var(--perf-gold); border-color: var(--perf-border-warm); }
.dx-alt-btn:hover { background: color-mix(in srgb, var(--perf-gold) 14%, transparent); }

.dx-foot { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 13px 18px; border-top: 1px solid var(--perf-border); }
.dx-del { color: #fff; background: var(--perf-conflict); border: none; }
.dx-del:hover:not(:disabled) { background: color-mix(in srgb, var(--perf-conflict) 86%, #000); color: #fff; }
[data-theme="light"] .dx-del { color: #fff; }

@media (prefers-reduced-motion: reduce) { .dx-x:hover { transform: none; } .dx-stamp { transition: opacity 0.2s; } }
</style>
