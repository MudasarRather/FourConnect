<template>
  <!-- ═══════════════════════ CHECK-IN · the progress-logging console ═══════════════════════
       Log measured progress on a key result / goal. A live conic gauge animates was→new with
       the delta arc; a metric-aware slider + quick-set chips drive the value; a momentum
       segment captures confidence (On track / At risk / Off track); reason presets pre-fill
       the note. A check-in TIMELINE surfaces history from check_ins_json. Process banner
       explains the roll-up. Shared by self-service + admin — payload shape unchanged. -->
  <teleport to="body">
    <Presence>
      <Motion v-if="open && goal" key="ov" as="div" class="ci-ov perf-scope" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.2 }" @click.self="$emit('close')">
        <Motion as="div" class="ci" :initial="{ opacity: 0, y: 20, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 12, scale: 0.98 }" :transition="{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }">
          <span class="ci-mesh" aria-hidden="true" />

          <header class="ci-head">
            <span class="ci-ic"><TrendingUp :size="17" /></span>
            <div class="ci-titles"><b>Check in</b><span>{{ goal.title }}</span></div>
            <button class="ci-x" type="button" @click="$emit('close')"><X :size="16" /></button>
          </header>

          <div class="ci-body">
            <!-- process info -->
            <p class="ci-process"><Info :size="12" /> Your update is journalled and {{ goal.parent_id ? 'rolls up into its objective' : 'updates this goal' }} automatically.</p>

            <!-- hero gauge -->
            <div class="ci-hero">
              <div class="ci-ring" :class="{ done: previewPct >= 100 }" :style="{ '--perf-p': previewDeg + 'deg', '--c': tone }">
                <span class="ci-ring-sweep" aria-hidden="true" />
                <span class="ci-ring-in">
                  <Trophy v-if="previewPct >= 100" :size="18" class="ci-ring-trophy" />
                  <template v-else><b>{{ previewPct }}</b><i>%</i></template>
                </span>
              </div>
              <div class="ci-hero-txt">
                <span class="ci-was">was {{ wasPct }}%</span>
                <span class="ci-delta" :class="delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'">
                  <component :is="delta >= 0 ? TrendingUp : TrendingDown" :size="15" />{{ delta >= 0 ? '+' : '' }}{{ delta }}%
                </span>
                <span v-if="!binary" class="ci-remain">{{ remainLabel }}</span>
              </div>
            </div>

            <!-- binary -->
            <template v-if="binary">
              <div class="ci-binary">
                <Motion as="button" type="button" class="ci-bin" :class="{ on: !done }" @click="done = false"
                  :whileTap="{ scale: 0.96 }"><Circle :size="15" /> Not done</Motion>
                <Motion as="button" type="button" class="ci-bin ok" :class="{ on: done }" @click="done = true"
                  :whileTap="{ scale: 0.96 }"><CheckCircle2 :size="15" /> Done</Motion>
              </div>
            </template>

            <!-- numeric -->
            <template v-else>
              <div class="ci-quick">
                <Motion v-for="q in QUICK" :key="q.f" as="button" type="button" class="ci-chip" :class="{ on: Math.round(previewPct) === q.pct }"
                  @click="setQuick(q.f)" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }">{{ q.label }}</Motion>
              </div>

              <div class="ci-slider-wrap">
                <span class="ci-slider-bubble" :style="{ left: previewPct + '%' }">{{ fmtVal(current) }}{{ unit }}</span>
                <input type="range" min="0" max="100" step="1" :value="previewPct" class="ci-slider"
                  :style="{ '--p': previewPct + '%', '--c': tone }" @input="onSlider" />
                <div class="ci-slider-ends"><span>{{ fmtVal(start) }}{{ unit }}</span><span>{{ fmtVal(target) }}{{ unit }} target</span></div>
              </div>

              <div class="ci-field">
                <label class="ci-lab">Current value <span class="ci-target">exact</span></label>
                <div class="ci-num"><input v-model.number="current" type="number" :placeholder="`Current ${unit}`" /><i v-if="unit">{{ unit }}</i></div>
              </div>

              <!-- momentum / confidence -->
              <div v-if="previewPct < 100" class="ci-field">
                <label class="ci-lab">How's it tracking?</label>
                <div class="ci-momentum" :style="{ '--mi': momentumIdx }">
                  <span class="ci-momentum-thumb" :style="{ '--mc': MOMENTUM[momentumIdx].color }" />
                  <button v-for="(m, i) in MOMENTUM" :key="m.value" type="button" class="ci-mom" :class="{ on: momentum === m.value }"
                    :style="{ '--mc': m.color }" @click="momentum = m.value"><component :is="m.icon" :size="13" />{{ m.label }}</button>
                </div>
              </div>
            </template>

            <!-- reason presets + note -->
            <div class="ci-field">
              <label class="ci-lab">Note <em>(optional)</em></label>
              <div class="ci-reasons">
                <Motion v-for="r in REASONS" :key="r.t" as="button" type="button" class="ci-reason" :class="{ on: note === r.t }"
                  @click="pickReason(r)" :whileTap="{ scale: 0.95 }">{{ r.t }}</Motion>
              </div>
              <textarea v-model="note" class="ci-input" rows="2" placeholder="What changed since the last check-in?" />
            </div>

            <!-- history timeline -->
            <div v-if="history.length" class="ci-history">
              <span class="ci-history-h"><History :size="12" /> Recent check-ins</span>
              <div v-for="(h, i) in history" :key="i" class="ci-hist" :style="{ '--hi': i }">
                <span class="ci-hist-dot" :style="{ background: goalTone(h.progress) }" />
                <span class="ci-hist-pct">{{ Math.round(h.progress || 0) }}%</span>
                <span class="ci-hist-note">{{ h.note || '—' }}</span>
                <span class="ci-hist-meta">{{ relTime(h.at) }}<template v-if="h.by"> · {{ h.by }}</template></span>
              </div>
            </div>
          </div>

          <footer class="ci-foot">
            <button class="perf-btn perf-btn-ghost" type="button" @click="$emit('close')">Cancel</button>
            <button class="perf-btn perf-btn-primary" type="button" :disabled="saving" @click="submit">
              <Loader2 v-if="saving" :size="14" class="perf-spin" /><Check v-else :size="14" />
              Log progress<template v-if="delta"> · {{ delta > 0 ? '+' : '' }}{{ delta }}%</template>
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
import { X, TrendingUp, TrendingDown, AlertTriangle, Check, CheckCircle2, Circle, Loader2, Info, History, Trophy } from 'lucide-vue-next'
import { GOAL_METRICS, goalTone } from '@/composables/usePerformance'

const props = defineProps({ open: Boolean, goal: { type: Object, default: null }, saving: Boolean })
const emit = defineEmits(['close', 'save'])

const MOMENTUM = [
  { value: 'ON_TRACK', label: 'On track', icon: TrendingUp, color: 'var(--perf-ok)' },
  { value: 'AT_RISK', label: 'At risk', icon: AlertTriangle, color: 'var(--perf-amber)' },
  { value: 'OFF_TRACK', label: 'Off track', icon: TrendingDown, color: 'var(--perf-conflict)' },
]
const REASONS = [
  { t: 'On schedule', m: 'ON_TRACK' }, { t: 'Ahead of plan', m: 'ON_TRACK' },
  { t: 'Slowed down', m: 'AT_RISK' }, { t: 'Blocked', m: 'OFF_TRACK' }, { t: 'Need help', m: 'AT_RISK' },
]

const current = ref(0)
const note = ref('')
const done = ref(false)
const momentum = ref('ON_TRACK')

const binary = computed(() => ['MILESTONE', 'BOOLEAN'].includes(props.goal?.metric_type))
const unit = computed(() => {
  const mt = props.goal?.metric_type
  if (mt === 'CURRENCY') return '₹'
  if (mt === 'PERCENT') return '%'
  return props.goal?.unit || (GOAL_METRICS.find(m => m.value === mt) || {}).unit || ''
})
const start = computed(() => Number(props.goal?.start_value || 0))
const target = computed(() => props.goal?.target_value != null ? Number(props.goal.target_value) : null)
const hasTarget = computed(() => target.value != null && target.value !== start.value)
const wasPct = computed(() => Math.round(Number(props.goal?.progress || 0)))

const QUICK = computed(() => [0.25, 0.5, 0.75, 1].map(f => ({ f, pct: Math.round(f * 100), label: f === 1 ? 'Target' : `${Math.round(f * 100)}%` })))

watch(() => props.open, (v) => {
  if (v && props.goal) {
    current.value = Number(props.goal.current_value || 0)
    done.value = Number(props.goal.current_value || 0) >= 1
    note.value = ''
    momentum.value = ['ON_TRACK', 'AT_RISK', 'OFF_TRACK'].includes(props.goal.status) ? props.goal.status : 'ON_TRACK'
  }
})

const previewPct = computed(() => {
  if (binary.value) return done.value ? 100 : 0
  if (hasTarget.value) return Math.round(Math.max(0, Math.min(100, (Number(current.value || 0) - start.value) / (target.value - start.value) * 100)))
  return Math.round(Math.max(0, Math.min(100, Number(current.value || 0))))
})
const previewDeg = computed(() => Math.round(previewPct.value / 100 * 360))
const delta = computed(() => previewPct.value - wasPct.value)
const tone = computed(() => goalTone(previewPct.value))
const momentumIdx = computed(() => Math.max(0, MOMENTUM.findIndex(m => m.value === momentum.value)))
const remainLabel = computed(() => {
  if (hasTarget.value) { const r = target.value - Number(current.value || 0); return r > 0 ? `${fmtVal(r)}${unit.value} to target` : 'target reached' }
  const r = 100 - previewPct.value; return r > 0 ? `${r}% to go` : 'complete'
})
const history = computed(() => [...(props.goal?.check_ins_json || [])].slice(-3).reverse())

function onSlider(e) {
  const p = Number(e.target.value)
  if (hasTarget.value) {
    const span = target.value - start.value
    const raw = start.value + (p / 100) * span
    current.value = Math.abs(span) >= 10 ? Math.round(raw) : Math.round(raw * 100) / 100
  } else current.value = p
}
function setQuick(f) {
  if (hasTarget.value) { const raw = start.value + f * (target.value - start.value); current.value = Math.abs(target.value - start.value) >= 10 ? Math.round(raw) : Math.round(raw * 100) / 100 }
  else current.value = Math.round(f * 100)
}
function pickReason(r) {
  if (note.value === r.t) { note.value = ''; return }
  note.value = r.t
  if (!binary.value && previewPct.value < 100) momentum.value = r.m
}

const fmtVal = (v) => v == null ? '—' : Number(v).toLocaleString('en-IN')
function relTime(iso) {
  try {
    const d = new Date(iso), now = new Date(), s = Math.floor((now - d) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  } catch { return '' }
}

function submit() {
  const payload = { note: note.value || null }
  if (binary.value) { payload.current_value = done.value ? 1 : 0; payload.progress = done.value ? 100 : 0 }
  else {
    payload.current_value = Number(current.value || 0)
    if (previewPct.value < 100) payload.status = momentum.value
  }
  emit('save', payload)
}
</script>

<style scoped>
.ci-ov { position: fixed; inset: 0; z-index: 1320; display: flex; align-items: center; justify-content: center; padding: 24px;
  background: rgba(5, 5, 6, 0.62); backdrop-filter: blur(11px); -webkit-backdrop-filter: blur(11px); }
.ci { position: relative; overflow: hidden; width: 100%; max-width: 460px; max-height: 92vh; display: flex; flex-direction: column; border-radius: 22px;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); box-shadow: 0 44px 100px -42px rgba(0,0,0,0.85); }
.ci-mesh { position: absolute; inset: 0; pointer-events: none; opacity: 0.7; z-index: 0;
  background: radial-gradient(70% 50% at 20% -8%, color-mix(in srgb, var(--perf-ok) 11%, transparent), transparent 60%),
    radial-gradient(60% 50% at 100% 0%, color-mix(in srgb, var(--perf-gold) 9%, transparent), transparent 60%); }

.ci-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 11px; padding: 16px 16px 13px; border-bottom: 1px solid var(--perf-border); }
.ci-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--perf-ok); background: var(--perf-ok-soft); border: 1px solid color-mix(in srgb, var(--perf-ok) 30%, transparent); }
.ci-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ci-titles b { font-size: 15px; font-weight: 850; color: var(--perf-text); }
.ci-titles span { font-size: 11.5px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ci-x { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.ci-x:hover { color: var(--perf-text); transform: rotate(90deg); }

.ci-body { position: relative; z-index: 1; padding: 15px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 13px; }
.ci-process { display: flex; align-items: flex-start; gap: 7px; margin: 0; padding: 9px 11px; border-radius: 11px; font-size: 11px; line-height: 1.45; color: var(--perf-text-muted);
  background: var(--perf-panel); border: 1px solid var(--perf-border); }
.ci-process :deep(svg) { color: var(--perf-gold); flex-shrink: 0; margin-top: 1px; }

/* hero gauge */
.ci-hero { display: flex; align-items: center; gap: 16px; }
.ci-ring { position: relative; width: 78px; height: 78px; border-radius: 50%; flex-shrink: 0; background: conic-gradient(var(--c) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 0.7s var(--perf-spring); }
.ci-ring-sweep { position: absolute; inset: -2px; border-radius: 50%; background: conic-gradient(from 0deg, transparent, color-mix(in srgb, var(--c) 55%, transparent), transparent 35%); opacity: 0.5; animation: ci-spin 3.4s linear infinite; }
@keyframes ci-spin { to { transform: rotate(360deg); } }
.ci-ring-in { position: absolute; inset: 6px; border-radius: 50%; background: var(--perf-surface-elevated); display: flex; align-items: center; justify-content: center; }
.ci-ring-in b { font-size: 22px; font-weight: 900; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.ci-ring-in i { font-size: 9px; font-style: normal; color: var(--perf-text-muted); margin-top: 5px; }
.ci-ring.done .ci-ring-in { background: radial-gradient(circle at 38% 32%, var(--perf-gold-bright), var(--perf-ember) 82%); }
.ci-ring-trophy { color: #4a2c08; }
.ci-hero-txt { display: flex; flex-direction: column; gap: 4px; }
.ci-was { font-size: 11px; color: var(--perf-text-muted); }
.ci-delta { display: inline-flex; align-items: center; gap: 5px; font-size: 22px; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; }
.ci-delta.up { color: var(--perf-ok); } .ci-delta.down { color: var(--perf-conflict); } .ci-delta.flat { color: var(--perf-text-dim); }
.ci-remain { font-size: 10.5px; font-weight: 700; color: var(--perf-text-secondary); }

/* binary */
.ci-binary { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.ci-bin { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 12px; border-radius: 12px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 700;
  color: var(--perf-text-muted); background: var(--perf-panel); border: 1px solid var(--perf-border); transition: color 0.18s, background 0.18s, border-color 0.18s; }
.ci-bin.on { color: var(--perf-text); border-color: var(--perf-border-warm); background: color-mix(in srgb, var(--perf-gold) 8%, var(--perf-panel)); }
.ci-bin.ok.on { color: var(--perf-ok); background: var(--perf-ok-soft); border-color: color-mix(in srgb, var(--perf-ok) 40%, transparent); }

/* quick chips */
.ci-quick { display: flex; gap: 7px; }
.ci-chip { flex: 1; padding: 8px; border-radius: 10px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 750; color: var(--perf-text-muted);
  background: var(--perf-panel); border: 1px solid var(--perf-border); transition: color 0.16s, border-color 0.16s, background 0.16s; }
.ci-chip:hover { color: var(--perf-text); border-color: var(--perf-border-strong); }
.ci-chip.on { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border-color: color-mix(in srgb, var(--perf-gold) 32%, transparent); }

/* slider */
.ci-slider-wrap { position: relative; padding-top: 22px; }
.ci-slider-bubble { position: absolute; top: 0; transform: translateX(-50%); padding: 2px 8px; border-radius: 7px; font-size: 10.5px; font-weight: 800; white-space: nowrap;
  color: #1a1206; background: var(--perf-grad-hero); box-shadow: 0 4px 10px -4px color-mix(in srgb, var(--perf-orange) 70%, transparent); transition: left 0.12s linear; }
.ci-slider-bubble::after { content: ''; position: absolute; bottom: -3px; left: 50%; transform: translateX(-50%) rotate(45deg); width: 6px; height: 6px; background: var(--perf-ember); }
.ci-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 8px; border-radius: 999px; cursor: pointer; outline: none;
  background: linear-gradient(90deg, var(--c) var(--p, 0%), var(--perf-track) var(--p, 0%)); transition: background 0.12s linear; }
.ci-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; cursor: pointer;
  background: #fff; border: 3px solid var(--c); box-shadow: 0 2px 8px -1px rgba(0,0,0,0.4), 0 0 0 0 color-mix(in srgb, var(--c) 40%, transparent); transition: box-shadow 0.2s; }
.ci-slider::-webkit-slider-thumb:hover { box-shadow: 0 2px 8px -1px rgba(0,0,0,0.4), 0 0 0 6px color-mix(in srgb, var(--c) 22%, transparent); }
.ci-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; cursor: pointer; background: #fff; border: 3px solid var(--c); box-shadow: 0 2px 8px -1px rgba(0,0,0,0.4); }
.ci-slider-ends { display: flex; justify-content: space-between; margin-top: 6px; font-size: 9.5px; font-weight: 700; color: var(--perf-text-dim); font-variant-numeric: tabular-nums; }

.ci-field { display: flex; flex-direction: column; gap: 6px; }
.ci-lab { font-size: 11.5px; font-weight: 700; color: var(--perf-text-secondary); display: flex; align-items: center; justify-content: space-between; }
.ci-lab em { font-style: normal; font-weight: 500; color: var(--perf-text-dim); }
.ci-target { font-weight: 600; color: var(--perf-text-muted); text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; }
.ci-num { display: flex; align-items: center; gap: 5px; height: 42px; padding: 0 12px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s; }
.ci-num:focus-within { border-color: var(--perf-border-warm); }
.ci-num input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 14px; font-weight: 700; color: var(--perf-text); -moz-appearance: textfield; }
.ci-num input::-webkit-outer-spin-button, .ci-num input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.ci-num i { font-style: normal; font-size: 12px; font-weight: 800; color: var(--perf-text-muted); }
.ci-input { width: 100%; min-height: 42px; padding: 9px 12px; border-radius: 11px; font: inherit; font-size: 13px; resize: vertical;
  color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.ci-input:focus { outline: none; border-color: var(--perf-border-warm); }

/* momentum segmented */
.ci-momentum { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; padding: 3px; border-radius: 12px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.ci-momentum-thumb { position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc((100% - 6px) / 3); border-radius: 9px; background: color-mix(in srgb, var(--mc) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--mc) 40%, transparent); transform: translateX(calc(var(--mi) * 100%)); transition: transform 0.3s var(--perf-spring), background 0.3s, border-color 0.3s; }
.ci-mom { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 8px 4px; border-radius: 9px; cursor: pointer; font: inherit;
  font-size: 11px; font-weight: 700; color: var(--perf-text-muted); background: none; border: none; transition: color 0.2s; }
.ci-mom.on { color: var(--mc); }

/* reasons */
.ci-reasons { display: flex; flex-wrap: wrap; gap: 6px; }
.ci-reason { padding: 5px 11px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 650; color: var(--perf-text-muted);
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: color 0.16s, border-color 0.16s, background 0.16s; }
.ci-reason:hover { color: var(--perf-text); border-color: var(--perf-border-strong); }
.ci-reason.on { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border-color: color-mix(in srgb, var(--perf-gold) 30%, transparent); }

/* history */
.ci-history { display: flex; flex-direction: column; gap: 7px; padding: 11px; border-radius: 13px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.ci-history-h { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--perf-text-secondary); }
.ci-history-h :deep(svg) { color: var(--perf-gold); }
.ci-hist { display: flex; align-items: center; gap: 8px; font-size: 11px; animation: ci-deal 0.4s var(--perf-spring) both; animation-delay: calc(var(--hi) * 0.06s + 0.05s); }
.ci-hist-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.ci-hist-pct { font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; min-width: 32px; }
.ci-hist-note { flex: 1; min-width: 0; color: var(--perf-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ci-hist-meta { font-size: 9.5px; color: var(--perf-text-dim); white-space: nowrap; flex-shrink: 0; }
@keyframes ci-deal { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }

.ci-foot { position: relative; z-index: 1; display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 13px 16px; border-top: 1px solid var(--perf-border); }

@media (prefers-reduced-motion: reduce) {
  .ci-x:hover { transform: none; } .ci-ring { transition: none; } .ci-ring-sweep { animation: none; }
  .ci-slider-bubble, .ci-slider, .ci-momentum-thumb { transition: none; } .ci-hist { animation: none; }
}
</style>
