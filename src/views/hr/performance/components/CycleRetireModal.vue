<template>
  <teleport to="body">
    <Presence>
      <Motion v-if="open" key="ov" as="div" class="cr-ov perf-scope" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.24 }" @click.self="!busy && $emit('close')">
        <Motion as="div" class="cr" :class="['mode-' + mode, { hi: severity === 'high' }]" :initial="reduced ? false : { opacity: 0, y: 24, scale: 0.95 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }" :exit="{ opacity: 0, y: 14, scale: 0.97 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="cr-edge" aria-hidden="true" />
          <span class="cr-aura" aria-hidden="true" />

          <header class="cr-head">
            <span class="cr-ic"><component :is="mode === 'delete' ? ShieldAlert : Archive" :size="19" /></span>
            <div class="cr-titles">
              <b>{{ mode === 'delete' ? 'Delete this cycle?' : 'Close this cycle?' }}</b>
              <span>{{ c.period_label || cycleMeta(c.cycle).label }} · {{ cycleMeta(c.cycle).label }}</span>
            </div>
            <button class="cr-x" type="button" :disabled="busy" @click="$emit('close')"><X :size="16" /></button>
          </header>

          <div class="cr-body">
            <!-- cycle chit -->
            <div class="cr-chit" :class="{ struck: struck && mode === 'delete' }">
              <span class="cr-chit-grain" aria-hidden="true" />
              <span v-if="mode === 'delete'" class="cr-stamp" :class="{ on: struck }">VOID</span>
              <div class="cr-ring" :style="{ '--perf-p': Math.round((c.progress || 0) / 100 * 360) + 'deg' }">
                <span>{{ Math.round(c.progress || 0) }}<i>%</i></span>
              </div>
              <div class="cr-chit-id">
                <b>{{ c.period_label || cycleMeta(c.cycle).label }}</b>
                <span>{{ c.template_name || cycleMeta(c.cycle).label }}</span>
                <div class="cr-chit-stats">
                  <span><b>{{ loaded ? reviews.length : (c.total || 0) }}</b> reviews</span>
                  <span><b class="ok">{{ counts.COMPLETED + counts.ACKNOWLEDGED }}</b> finalised</span>
                  <span v-if="appliedHikes"><b class="warn">{{ appliedHikes }}</b> hiked</span>
                </div>
              </div>
            </div>

            <!-- mode segmented -->
            <div class="cr-seg">
              <button type="button" class="cr-seg-btn" :class="{ on: mode === 'close' }" :disabled="busy" @click="mode = 'close'"><Archive :size="14" /> Close (cancel in-flight)</button>
              <button type="button" class="cr-seg-btn danger" :class="{ on: mode === 'delete' }" :disabled="busy" @click="mode = 'delete'"><Trash2 :size="14" /> Delete everything</button>
              <span class="cr-seg-thumb" :class="{ right: mode === 'delete' }" />
            </div>

            <div v-if="loading" class="cr-load"><Loader2 :size="16" class="perf-spin" /> Reading the cycle’s reviews…</div>

            <!-- impact -->
            <template v-else>
              <div class="cr-impact">
                <span class="cr-impact-h"><Info :size="12" /> {{ mode === 'delete' ? 'What gets removed' : 'What changes' }}</span>
                <ul>
                  <template v-if="mode === 'close'">
                    <li><Archive :size="13" /><span><b>{{ inFlight }}</b> in-flight review{{ inFlight === 1 ? '' : 's' }} (reflection / manager review) are <b>cancelled</b> — they stay auditable and can be reopened.</span></li>
                    <li class="keep"><ShieldCheck :size="13" /><span><b>{{ counts.COMPLETED + counts.ACKNOWLEDGED }}</b> finalised review{{ (counts.COMPLETED + counts.ACKNOWLEDGED) === 1 ? '' : 's' }} are <b>kept</b> — scores, sign-offs and any applied hikes are untouched.</span></li>
                    <li v-if="!inFlight" class="warn"><TriangleAlert :size="13" /><span>Nothing is in flight — this cycle has nothing left to close.</span></li>
                  </template>
                  <template v-else>
                    <li class="crit"><Trash2 :size="13" /><span>All <b>{{ reviews.length }}</b> review{{ reviews.length === 1 ? '' : 's' }} in this cycle are <b>soft-deleted</b> — removed from every list, dashboard count and the employees’ records.</span></li>
                    <li v-if="counts.COMPLETED + counts.ACKNOWLEDGED" class="warn"><UserCheck :size="13" /><span><b>{{ counts.COMPLETED + counts.ACKNOWLEDGED }}</b> finalised, manager-scored review{{ (counts.COMPLETED + counts.ACKNOWLEDGED) === 1 ? '' : 's' }} drop out of reporting (avg score, distributions, calibration).</span></li>
                    <li v-if="appliedHikes" class="crit"><AlertTriangle :size="13" /><span><b>{{ appliedHikes }}</b> applied salary increment{{ appliedHikes === 1 ? '' : 's' }} are <b>not reversed</b> (see below).</span></li>
                  </template>
                </ul>
              </div>

              <!-- applied-hike critical warning -->
              <div v-if="mode === 'delete' && appliedHikes" class="cr-critical">
                <Banknote :size="16" />
                <div>
                  <b>{{ appliedHikes }} live pay increment{{ appliedHikes === 1 ? '' : 's' }} won’t be undone</b>
                  <p>Deleting the cycle removes the reviews but does <u>not</u> reverse the salary revisions they committed to payroll. Adjust each employee’s compensation record separately.</p>
                </div>
              </div>

              <!-- reason -->
              <div class="cr-reason">
                <label class="cr-reason-lab">Reason {{ requireReason ? '' : '(optional)' }}<i v-if="requireReason">*</i></label>
                <div class="cr-chips">
                  <button v-for="p in REASONS" :key="p" type="button" class="cr-chip" :class="{ on: reason === p }" @click="reason = p">{{ p }}</button>
                </div>
                <textarea v-model="reason" class="cr-note" rows="2" placeholder="Add a note for the audit trail…" />
              </div>

              <!-- progress -->
              <div v-if="busy" class="cr-progress">
                <span class="cr-progress-bar"><i :style="{ width: progPct + '%' }" /></span>
                <span class="cr-progress-txt">{{ done }} / {{ affected.length }} processed…</span>
              </div>
            </template>
          </div>

          <footer class="cr-foot">
            <button class="perf-btn perf-btn-ghost" type="button" :disabled="busy" @click="$emit('close')">Keep cycle</button>
            <button v-if="mode === 'close'" class="perf-btn cr-go" type="button" :disabled="busy || loading || !inFlight || (requireReason && !reason.trim())" @click="run">
              <Loader2 v-if="busy" :size="14" class="perf-spin" /><Archive v-else :size="14" /> Cancel {{ inFlight }} in-flight
            </button>
            <button v-else class="perf-btn cr-del" type="button" :disabled="busy || loading || !reviews.length || (requireReason && !reason.trim())" @click="run">
              <Loader2 v-if="busy" :size="14" class="perf-spin" /><Trash2 v-else :size="14" /> Delete cycle ({{ reviews.length }})
            </button>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, ShieldAlert, Archive, Trash2, Info, ShieldCheck, TriangleAlert, AlertTriangle, UserCheck, Banknote, Loader2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { fetchReviews, deleteReview, transitionReview } from '@/composables/usePerformance'
import { cycleMeta } from '@/views/hr/settings/composables/appraisalVocab'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ open: { type: Boolean, default: false }, cycle: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()
const reduced = prefersReduced()

const c = computed(() => props.cycle || {})
const mode = ref('close')
const reason = ref('')
const struck = ref(false)
const loading = ref(false)
const loaded = ref(false)
const busy = ref(false)
const done = ref(0)
const reviews = ref([])

const REASONS = ['Created in error', 'Wrong rubric', 'Wrong cohort', 'Duplicate cycle', 'Superseded']
const IN_FLIGHT = ['DRAFT', 'SELF_ASSESSMENT', 'MANAGER_ASSESSMENT']

const counts = computed(() => {
  const m = { DRAFT: 0, SELF_ASSESSMENT: 0, MANAGER_ASSESSMENT: 0, COMPLETED: 0, ACKNOWLEDGED: 0, CANCELLED: 0 }
  for (const r of reviews.value) if (r.status in m) m[r.status]++
  return m
})
const inFlight = computed(() => IN_FLIGHT.reduce((a, k) => a + counts.value[k], 0))
const appliedHikes = computed(() => reviews.value.filter(r => r.hike_status === 'APPLIED').length)
const finalised = computed(() => counts.value.COMPLETED + counts.value.ACKNOWLEDGED)
const severity = computed(() => (mode.value === 'delete' && (finalised.value > 0 || appliedHikes.value > 0)) ? 'high' : 'low')
const requireReason = computed(() => severity.value === 'high')

const affected = computed(() => mode.value === 'delete' ? reviews.value : reviews.value.filter(r => IN_FLIGHT.includes(r.status)))
const progPct = computed(() => affected.value.length ? Math.round(done.value / affected.value.length * 100) : 0)

async function loadCycleReviews() {
  loading.value = true; loaded.value = false; reviews.value = []
  try {
    const out = []
    let page = 1, total = Infinity
    while (out.length < total && page <= 20) {
      const d = await fetchReviews({ cycle: c.value.cycle, page, limit: 100 })
      total = d.total || 0
      const items = (d.items || [])
      out.push(...items.filter(r => (r.period_label || null) === (c.value.period_label || null)))
      if (items.length < 100) break
      page++
    }
    reviews.value = out; loaded.value = true
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not read the cycle') }
  finally { loading.value = false }
}

watch(() => props.open, (v) => {
  if (v && c.value) { mode.value = 'close'; reason.value = ''; struck.value = false; done.value = 0; loadCycleReviews() }
})

async function run() {
  if (requireReason.value && !reason.value.trim()) return
  if (!affected.value.length) return
  if (mode.value === 'delete' && !reduced) struck.value = true
  busy.value = true; done.value = 0
  let ok = 0, fail = 0
  for (const r of affected.value) {
    try {
      if (mode.value === 'delete') await deleteReview(r.id)
      else await transitionReview(r.id, { to: 'CANCELLED', note: reason.value || null })
      ok++
    } catch { fail++ }
    done.value++
  }
  busy.value = false
  if (mode.value === 'delete') toast.success(`Cycle deleted · ${ok} review${ok === 1 ? '' : 's'} removed${fail ? ` · ${fail} failed` : ''}`)
  else toast.success(`Cycle closed · ${ok} cancelled${fail ? ` · ${fail} failed` : ''}`)
  emit('done')
}
</script>

<style scoped>
.cr-ov { position: fixed; inset: 0; z-index: 1340; display: flex; align-items: center; justify-content: center; padding: 24px;
  background: rgba(5, 5, 6, 0.68); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.cr { position: relative; width: 100%; max-width: 560px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; border-radius: 22px;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); box-shadow: 0 48px 110px -44px rgba(0,0,0,0.9); }
.cr-edge { position: absolute; left: 0; right: 0; top: 0; height: 3px; z-index: 2; background: var(--perf-grad-hero); transition: background 0.3s; }
.cr.mode-delete .cr-edge { background: var(--perf-conflict); }
.cr-aura { position: absolute; top: -30%; right: -10%; width: 55%; height: 70%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 16%, transparent), transparent 70%); filter: blur(44px); transition: background 0.3s; }
.cr.mode-delete .cr-aura { background: radial-gradient(circle, color-mix(in srgb, var(--perf-conflict) 18%, transparent), transparent 70%); }

.cr-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; padding: 17px 18px 14px; border-bottom: 1px solid var(--perf-border); }
.cr-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; color: var(--perf-gold);
  background: color-mix(in srgb, var(--perf-gold) 14%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 30%, transparent); transition: all 0.3s; }
.cr.mode-delete .cr-ic { color: var(--perf-conflict); background: var(--perf-conflict-soft); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }
.cr-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cr-titles b { font-size: 16px; font-weight: 850; color: var(--perf-text); }
.cr-titles span { font-size: 12px; color: var(--perf-text-muted); }
.cr-x { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.cr-x:hover:not(:disabled) { color: var(--perf-text); transform: rotate(90deg); }

.cr-body { position: relative; z-index: 1; flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; }

.cr-chit { position: relative; overflow: hidden; display: flex; align-items: center; gap: 13px; padding: 13px; border-radius: 15px; background: var(--perf-panel); border: 1px solid var(--perf-border); transition: opacity 0.4s, filter 0.4s; }
.cr-chit.struck { opacity: 0.5; filter: grayscale(0.6); }
.cr-chit-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.3; background-image: linear-gradient(color-mix(in srgb, var(--perf-gold) 6%, transparent) 1px, transparent 1px); background-size: 14px 14px; mask-image: radial-gradient(100% 100% at 0% 0%, #000, transparent 80%); }
.cr-stamp { position: absolute; top: 50%; right: 18px; z-index: 3; font-size: 30px; font-weight: 900; letter-spacing: 0.14em; color: var(--perf-conflict); border: 3px solid var(--perf-conflict); border-radius: 8px; padding: 1px 10px; opacity: 0; transform: translateY(-50%) rotate(-12deg) scale(1.4); transition: opacity 0.3s, transform 0.3s var(--perf-spring); }
.cr-stamp.on { opacity: 0.9; transform: translateY(-50%) rotate(-12deg) scale(1); }
.cr-ring { position: relative; width: 50px; height: 50px; border-radius: 50%; flex-shrink: 0; background: conic-gradient(var(--perf-gold) var(--perf-p, 0deg), var(--perf-track) 0); }
.cr-ring::after { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: var(--perf-panel); }
.cr-ring span { position: absolute; inset: 0; display: grid; place-items: center; font-size: 13px; font-weight: 850; color: var(--perf-text); }
.cr-ring span i { font-size: 8px; font-style: normal; color: var(--perf-text-muted); }
.cr-chit-id { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cr-chit-id b { font-size: 14px; font-weight: 800; color: var(--perf-text); }
.cr-chit-id > span { font-size: 11px; color: var(--perf-text-muted); }
.cr-chit-stats { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 3px; }
.cr-chit-stats span { font-size: 11px; color: var(--perf-text-muted); }
.cr-chit-stats b { font-weight: 850; color: var(--perf-text); }
.cr-chit-stats b.ok { color: var(--perf-ok); } .cr-chit-stats b.warn { color: var(--perf-conflict); }

.cr-seg { position: relative; display: grid; grid-template-columns: 1fr 1fr; padding: 4px; border-radius: 12px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.cr-seg-btn { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 6px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 700; color: var(--perf-text-muted); background: none; border: none; transition: color 0.25s; }
.cr-seg-btn.on { color: #1a1206; } .cr-seg-btn.danger.on { color: #fff; }
.cr-seg-btn:disabled { cursor: default; }
.cr-seg-thumb { position: absolute; z-index: 0; top: 4px; left: 4px; width: calc(50% - 4px); height: calc(100% - 8px); border-radius: 9px; background: var(--perf-grad-hero); transition: transform 0.32s var(--perf-spring), background 0.25s; }
.cr-seg-thumb.right { transform: translateX(100%); background: var(--perf-conflict); }

.cr-load { display: flex; align-items: center; gap: 9px; padding: 14px; font-size: 12.5px; color: var(--perf-text-muted); }

.cr-impact { display: flex; flex-direction: column; gap: 8px; }
.cr-impact-h { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-text-muted); }
.cr-impact-h :deep(svg) { color: var(--perf-gold); }
.cr-impact ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.cr-impact li { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; line-height: 1.45; color: var(--perf-text-secondary); }
.cr-impact li :deep(svg) { color: var(--perf-text-dim); flex-shrink: 0; margin-top: 1px; }
.cr-impact li b { color: var(--perf-text); font-weight: 750; }
.cr-impact li.keep :deep(svg) { color: var(--perf-ok); }
.cr-impact li.warn :deep(svg) { color: var(--perf-orange); }
.cr-impact li.crit :deep(svg) { color: var(--perf-conflict); }

.cr-critical { display: flex; gap: 11px; padding: 13px; border-radius: 14px; background: color-mix(in srgb, var(--perf-conflict) 11%, transparent); border: 1px solid color-mix(in srgb, var(--perf-conflict) 32%, transparent); }
.cr-critical > :deep(svg) { color: var(--perf-conflict); flex-shrink: 0; margin-top: 1px; }
.cr-critical b { font-size: 12.5px; font-weight: 800; color: var(--perf-conflict); }
.cr-critical p { margin: 4px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--perf-text-secondary); }

.cr-reason { display: flex; flex-direction: column; gap: 8px; }
.cr-reason-lab { font-size: 11.5px; font-weight: 700; color: var(--perf-text-secondary); }
.cr-reason-lab i { color: var(--perf-conflict); font-style: normal; }
.cr-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.cr-chip { font: inherit; font-size: 11px; font-weight: 650; padding: 5px 11px; border-radius: 999px; cursor: pointer; color: var(--perf-text-muted); background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.16s; }
.cr-chip:hover { color: var(--perf-text); border-color: var(--perf-border-strong); }
.cr-chip.on { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border-color: var(--perf-border-warm); }
.cr.mode-delete .cr-chip.on { color: var(--perf-conflict); background: var(--perf-conflict-soft); border-color: color-mix(in srgb, var(--perf-conflict) 34%, transparent); }
.cr-note { width: 100%; resize: vertical; min-height: 42px; padding: 9px 11px; border-radius: 11px; font: inherit; font-size: 12.5px; color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.cr-note:focus { outline: none; border-color: var(--perf-border-warm); }

.cr-progress { display: flex; flex-direction: column; gap: 5px; }
.cr-progress-bar { height: 7px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.cr-progress-bar i { display: block; height: 100%; border-radius: 999px; background: var(--perf-grad-hero); transition: width 0.3s; }
.cr-progress-txt { font-size: 11px; color: var(--perf-text-muted); }

.cr-foot { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 13px 18px; border-top: 1px solid var(--perf-border); }
.cr-go { color: var(--perf-gold); border-color: var(--perf-border-warm); }
.cr-go:hover:not(:disabled) { background: color-mix(in srgb, var(--perf-gold) 12%, transparent); }
.cr-del { color: #fff; background: var(--perf-conflict); border: none; }
.cr-del:hover:not(:disabled) { background: color-mix(in srgb, var(--perf-conflict) 86%, #000); color: #fff; }

@media (prefers-reduced-motion: reduce) { .cr-x:hover { transform: none; } .cr-stamp, .cr-seg-thumb { transition: none; } }
</style>
