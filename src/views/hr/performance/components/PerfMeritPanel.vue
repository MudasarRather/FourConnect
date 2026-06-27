<template>
  <!-- ═══════════════ MERIT & PAY · the Reviews→Merit-policy→Payroll bridge ═══════════════
       Surfaces the merit→hike pipeline that the old drawer never exposed: the score
       resolves a band from the active Merit Policy → HR recommends a hike inside the
       band window → approve applies an effective-dated salary revision to payroll.
       Cross-links to the rubric (Appraisal Templates) + the band table (Merit Policy)
       so the whole chain is reachable. -->
  <div class="mp">
    <!-- locked: review not yet completed -->
    <div v-if="!unlocked" class="mp-locked">
      <span class="mp-locked-ic"><Lock :size="22" /></span>
      <b>Merit unlocks on completion</b>
      <p>Score the review and mark it <em>Completed</em> — the final score then resolves a merit band and the increment can be recommended.</p>
      <div class="mp-chain">
        <span v-for="(s, i) in CHAIN" :key="s" class="mp-chain-node" :class="{ done: i < chainStep, on: i === chainStep }">
          <i>{{ i + 1 }}</i>{{ s }}
        </span>
      </div>
    </div>

    <template v-else>
      <!-- band readout -->
      <div v-if="loading" class="mp-load"><Loader2 :size="18" class="perf-spin" /> Resolving merit band…</div>
      <div v-else-if="bandObj" class="mp-band" :style="{ '--bc': bandColor }">
        <div class="mp-band-top">
          <span class="mp-band-tag">Resolved band</span>
          <button class="mp-band-policy" type="button" @click="goSettings('merit-policy')" :title="`Merit policy: ${merit.policy_name || 'default'}`">
            <Coins :size="11" /> {{ merit.policy_name || 'Merit policy' }} <ArrowUpRight :size="11" />
          </button>
        </div>
        <div class="mp-band-body">
          <span class="mp-band-name">{{ bandLabel }}</span>
          <span class="mp-band-score">score <b>{{ fmtScore(merit.score) }}</b>/{{ merit.rating_max }} · {{ srcLabel }}</span>
        </div>
        <!-- the band's hike window -->
        <div class="mp-window">
          <span class="mp-window-lab">Hike window</span>
          <div class="mp-window-rail">
            <span class="mp-window-fill" :style="{ left: railLeft + '%', width: railWidth + '%' }" />
            <span v-if="markerPct != null" class="mp-window-mark" :style="{ left: markerLeft + '%' }" :title="markerPct + '%'" />
          </div>
          <span class="mp-window-vals"><b>{{ loPct }}%</b> – <b>{{ hiPct }}%</b></span>
        </div>
      </div>
      <div v-else class="mp-nopolicy">
        <TriangleAlert :size="15" />
        <span>No merit policy resolves for this score. Configure bands in <button type="button" @click="goSettings('merit-policy')">Settings → Merit Policy</button>.</span>
      </div>

      <!-- hike status timeline pill -->
      <div class="mp-status" :style="{ '--hc': hikeMeta.color }">
        <span class="mp-status-dot"><component :is="hikeMeta.icon" :size="13" /></span>
        <div class="mp-status-txt">
          <b>{{ hikeMeta.label }}</b>
          <span v-if="r.hike_status === 'RECOMMENDED'">{{ r.recommended_hike_pct }}% recommended{{ r.recommended_at ? ' · ' + fmtDate(r.recommended_at) : '' }}</span>
          <span v-else-if="r.hike_status === 'APPLIED'">+{{ r.approved_hike_pct }}% applied{{ r.approved_at ? ' · ' + fmtDate(r.approved_at) : '' }}</span>
          <span v-else-if="r.hike_status === 'REJECTED'">Increment declined for this cycle</span>
          <span v-else>No increment recorded yet</span>
        </div>
      </div>

      <!-- applied revision summary -->
      <div v-if="r.hike_status === 'APPLIED'" class="mp-applied">
        <div class="mp-ctc">
          <div class="mp-ctc-cell"><span>Previous CTC</span><b>{{ inr(r.prev_annual_ctc) }}</b></div>
          <span class="mp-ctc-arrow"><ArrowRight :size="15" /></span>
          <div class="mp-ctc-cell up"><span>Revised CTC</span><b>{{ inr(r.new_annual_ctc) }}</b></div>
        </div>
        <p class="mp-applied-note"><CheckCircle2 :size="12" /> An effective-dated salary revision was committed to payroll. Editing pay further is done in the employee's compensation record.</p>
      </div>

      <!-- ── recommend (status COMPLETED, no live hike) ── -->
      <form v-if="canRecommend" class="mp-act" @submit.prevent="doRecommend">
        <label class="mp-act-lab"><TrendingUp :size="12" /> Recommend an increment</label>
        <div class="mp-pct">
          <button type="button" class="mp-pct-btn" @click="bump(-0.5)" :disabled="busy">–</button>
          <div class="mp-pct-val"><input v-model.number="hikePct" type="number" :min="loPct" :max="hiPct" step="0.5" /><i>%</i></div>
          <button type="button" class="mp-pct-btn" @click="bump(0.5)" :disabled="busy">+</button>
          <div class="mp-pct-quick">
            <button type="button" @click="hikePct = loPct">min</button>
            <button type="button" @click="hikePct = midPct">mid</button>
            <button type="button" @click="hikePct = hiPct">max</button>
          </div>
        </div>
        <p v-if="outOfBand" class="mp-warn"><TriangleAlert :size="11" /> Outside the band window ({{ loPct }}–{{ hiPct }}%). The policy will reject it.</p>
        <textarea v-model="note" class="mp-note" rows="2" placeholder="Justification (optional) — shared with approver…" />
        <button class="perf-btn perf-btn-primary mp-submit" type="submit" :disabled="busy || outOfBand">
          <Loader2 v-if="busy === 'rec'" :size="14" class="perf-spin" /><TrendingUp v-else :size="14" /> Recommend {{ hikePct }}%
        </button>
      </form>

      <!-- ── approve / reject (RECOMMENDED) ── -->
      <div v-else-if="canApprove" class="mp-act">
        <label class="mp-act-lab"><BadgeCheck :size="12" /> Approve & apply</label>
        <div class="mp-pct">
          <button type="button" class="mp-pct-btn" @click="bump(-0.5)" :disabled="busy">–</button>
          <div class="mp-pct-val"><input v-model.number="hikePct" type="number" :min="loPct" :max="hiPct" step="0.5" /><i>%</i></div>
          <button type="button" class="mp-pct-btn" @click="bump(0.5)" :disabled="busy">+</button>
          <button type="button" class="mp-pct-rec" :class="{ on: Number(hikePct) === Number(r.recommended_hike_pct) }" @click="hikePct = Number(r.recommended_hike_pct)">
            recommended {{ r.recommended_hike_pct }}%
          </button>
        </div>
        <div class="mp-eff">
          <label>Effective from</label>
          <HrDatePicker v-model="effFrom" placeholder="dd / mm / yyyy" />
        </div>

        <!-- downward override needs a justification (corporate control) -->
        <div v-if="belowRec" class="mp-override">
          <label class="mp-override-lab"><TriangleAlert :size="12" /> Below the manager's recommended {{ r.recommended_hike_pct }}% — justification required <i>*</i></label>
          <textarea v-model="note" class="mp-note" rows="2" placeholder="Why is the approved increment lower than recommended?…" />
        </div>

        <div class="mp-process">
          <span class="mp-process-ic"><Info :size="13" /></span>
          <p>Approving commits an effective-dated <b class="mp-process-pct">+{{ hikePct }}%</b> salary revision to payroll. Idempotent — it can’t double-apply.</p>
        </div>

        <div class="mp-act-row">
          <button class="perf-btn mp-reject" type="button" :disabled="busy" @click="rejecting = !rejecting"><CircleSlash :size="14" /> Reject</button>
          <button class="perf-btn perf-btn-primary" type="button" :disabled="busy || outOfBand || (belowRec && !note.trim())" @click="doApprove">
            <Loader2 v-if="busy === 'app'" :size="14" class="perf-spin" /><BadgeCheck v-else :size="14" /> Approve &amp; apply
          </button>
        </div>
        <Presence>
          <Motion v-if="rejecting" as="div" class="mp-reject-box" :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }" :transition="{ duration: 0.28 }">
            <textarea v-model="note" rows="2" placeholder="Reason for declining the increment…" />
            <button class="perf-btn mp-reject-confirm" type="button" :disabled="busy" @click="doReject">
              <Loader2 v-if="busy === 'rej'" :size="14" class="perf-spin" /><CircleSlash v-else :size="14" /> Confirm reject
            </button>
          </Motion>
        </Presence>
      </div>

      <!-- footer cross-links -->
      <div class="mp-links">
        <button type="button" @click="goSettings('appraisal-templates')"><FileText :size="12" /> Rubric</button>
        <button type="button" @click="$emit('go', 'merit')"><Coins :size="12" /> Merit & Increments</button>
        <button type="button" @click="$emit('go', 'calibration')"><Grid3x3 :size="12" /> Calibration</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Lock, Loader2, Coins, ArrowUpRight, ArrowRight, TriangleAlert, TrendingUp, BadgeCheck, CircleSlash, CheckCircle2, FileText, Grid3x3, Info } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { fetchReviewMerit, recommendHikeAdmin, approveHike, rejectHike, hikeStatusMeta, bandTone } from '@/composables/usePerformance'

const props = defineProps({ review: { type: Object, required: true } })
const emit = defineEmits(['mutated', 'go'])
const toast = useToast()
const router = useRouter()

const r = computed(() => props.review || {})
const unlocked = computed(() => ['COMPLETED', 'ACKNOWLEDGED'].includes(r.value.status))

const CHAIN = ['Score', 'Complete', 'Recommend', 'Approve → pay']
const chainStep = computed(() => {
  const s = r.value.status
  if (s === 'SELF_ASSESSMENT' || s === 'DRAFT') return 0
  if (s === 'MANAGER_ASSESSMENT') return 1
  return 2
})

const merit = ref(null)
const loading = ref(false)
async function loadMerit() {
  if (!unlocked.value || !r.value.id) { merit.value = null; return }
  loading.value = true
  try { merit.value = await fetchReviewMerit(r.value.id) }
  catch { merit.value = null }
  finally { loading.value = false }
}
watch(() => [r.value.id, r.value.status, r.value.hike_status], loadMerit, { immediate: true })

const hikeMeta = computed(() => hikeStatusMeta(r.value.hike_status || 'NONE'))
// the backend returns `band` as an OBJECT { key, label, frac_min, frac_max, hike_min_pct, hike_max_pct, auto_pip }
// (or, defensively, a plain string) — normalise it
const bandObj = computed(() => {
  const b = merit.value?.band
  if (!b) return null
  if (typeof b === 'object') return b
  return { key: String(b).toUpperCase().replace(/\s+/g, '_'), label: String(b) }
})
const bandColor = computed(() => bandObj.value ? (bandTone(bandObj.value.key) || 'var(--perf-gold)') : 'var(--perf-gold)')
const bandLabel = computed(() => bandObj.value?.label || bandObj.value?.key || '—')
const srcLabel = computed(() => merit.value?.source === 'calibration' ? 'calibrated' : 'manager score')

const loPct = computed(() => Number(merit.value?.hike_min_pct ?? bandObj.value?.hike_min_pct ?? 0))
const hiPct = computed(() => Number(merit.value?.hike_max_pct ?? bandObj.value?.hike_max_pct ?? 0))
const midPct = computed(() => Math.round(((loPct.value + hiPct.value) / 2) * 2) / 2)

// hike-window rail (0..max scale where max = the policy's top window, fall back to 20)
const WMAX = computed(() => Math.max(20, hiPct.value))
const railLeft = computed(() => Math.min(100, (loPct.value / WMAX.value) * 100))
const railWidth = computed(() => Math.min(100 - railLeft.value, ((hiPct.value - loPct.value) / WMAX.value) * 100))
const markerPct = computed(() => r.value.approved_hike_pct ?? r.value.recommended_hike_pct ?? null)
const markerLeft = computed(() => markerPct.value != null ? Math.min(100, (markerPct.value / WMAX.value) * 100) : 0)

const hikePct = ref(0)
const note = ref('')
const effFrom = ref('')
const busy = ref(false)
const rejecting = ref(false)

watch([unlocked, merit, () => r.value.hike_status], () => {
  if (r.value.hike_status === 'RECOMMENDED' && r.value.recommended_hike_pct != null) hikePct.value = Number(r.value.recommended_hike_pct)
  else hikePct.value = midPct.value || loPct.value
  note.value = ''; rejecting.value = false
}, { immediate: true })

const outOfBand = computed(() => bandObj.value ? (hikePct.value < loPct.value || hikePct.value > hiPct.value) : false)
const canRecommend = computed(() => r.value.status === 'COMPLETED' && ['NONE', 'REJECTED'].includes(r.value.hike_status || 'NONE') && !!bandObj.value)
const canApprove = computed(() => r.value.hike_status === 'RECOMMENDED')
// a downward override of the manager's recommendation requires a written justification
const belowRec = computed(() => canApprove.value && r.value.recommended_hike_pct != null && Number(hikePct.value) < Number(r.value.recommended_hike_pct))

function bump(d) { hikePct.value = Math.round((Number(hikePct.value || 0) + d) * 2) / 2 }

async function doRecommend() {
  if (outOfBand.value) return
  busy.value = 'rec'
  try {
    const updated = await recommendHikeAdmin(r.value.id, { hike_pct: Number(hikePct.value), note: note.value || null })
    emit('mutated', updated); toast.success(`Recommended ${hikePct.value}% increment`)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not recommend') }
  finally { busy.value = false }
}
async function doApprove() {
  if (outOfBand.value) return
  if (belowRec.value && !note.value.trim()) { toast.error('Add a justification — the approved hike is below the recommendation'); return }
  busy.value = 'app'
  try {
    const updated = await approveHike(r.value.id, { approved_hike_pct: Number(hikePct.value), effective_from: effFrom.value || null, note: note.value || null })
    emit('mutated', updated.review || updated); toast.success('Increment approved & applied to payroll')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Approval failed') }
  finally { busy.value = false }
}
async function doReject() {
  busy.value = 'rej'
  try {
    const updated = await rejectHike(r.value.id, { to: 'REJECTED', note: note.value || null })
    emit('mutated', updated); toast.success('Increment rejected'); rejecting.value = false
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not reject') }
  finally { busy.value = false }
}

function goSettings(tab) { router.push(`/admin/hr/settings/${tab}`) }
const fmtScore = (v) => v == null ? '—' : (Math.round(Number(v) * 100) / 100)
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) } catch { return '' } }
const inr = (v) => v == null ? '—' : '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })
</script>

<style scoped>
.mp { display: flex; flex-direction: column; gap: 13px; }

/* locked */
.mp-locked { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 26px 18px; border-radius: 16px;
  background: var(--perf-panel); border: 1px dashed var(--perf-border-strong); }
.mp-locked-ic { display: grid; place-items: center; width: 50px; height: 50px; border-radius: 15px; color: var(--perf-text-dim); background: var(--perf-track); }
.mp-locked b { font-size: 14px; font-weight: 800; color: var(--perf-text); }
.mp-locked p { margin: 0; font-size: 12px; line-height: 1.5; color: var(--perf-text-muted); max-width: 42ch; }
.mp-locked em { font-style: normal; color: var(--perf-gold); font-weight: 700; }
.mp-chain { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.mp-chain-node { display: inline-flex; align-items: center; gap: 5px; padding: 5px 9px; border-radius: 999px; font-size: 10px; font-weight: 700;
  color: var(--perf-text-dim); background: var(--perf-surface); border: 1px solid var(--perf-border); }
.mp-chain-node i { display: grid; place-items: center; width: 15px; height: 15px; border-radius: 50%; font-style: normal; font-size: 8.5px; background: var(--perf-track); }
.mp-chain-node.done { color: var(--perf-ok); border-color: color-mix(in srgb, var(--perf-ok) 32%, transparent); }
.mp-chain-node.done i { background: var(--perf-ok); color: #06281c; }
.mp-chain-node.on { color: var(--perf-gold); border-color: var(--perf-border-warm); }
.mp-chain-node.on i { background: var(--perf-grad-hero); color: #1a1206; }

.mp-load { display: flex; align-items: center; gap: 9px; padding: 18px; font-size: 12.5px; color: var(--perf-text-muted); }

/* band */
.mp-band { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 16px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--bc) 11%, var(--perf-surface)), var(--perf-panel));
  border: 1px solid color-mix(in srgb, var(--bc) 26%, var(--perf-border)); }
.mp-band-top { display: flex; align-items: center; justify-content: space-between; }
.mp-band-tag { font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--perf-text-muted); }
.mp-band-policy { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 10.5px; font-weight: 750; cursor: pointer;
  padding: 4px 9px; border-radius: 999px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--perf-gold) 28%, transparent); transition: background 0.2s; }
.mp-band-policy:hover { background: color-mix(in srgb, var(--perf-gold) 22%, transparent); }
.mp-band-body { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.mp-band-name { font-size: 20px; font-weight: 900; color: var(--bc); letter-spacing: -0.01em; }
.mp-band-score { font-size: 11.5px; color: var(--perf-text-muted); }
.mp-band-score b { color: var(--perf-text); font-weight: 800; }
.mp-window { display: flex; align-items: center; gap: 10px; }
.mp-window-lab { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--perf-text-muted); white-space: nowrap; }
.mp-window-rail { position: relative; flex: 1; height: 7px; border-radius: 999px; background: var(--perf-track); overflow: visible; }
.mp-window-fill { position: absolute; top: 0; height: 100%; border-radius: 999px; background: var(--bc); box-shadow: 0 0 10px -1px var(--bc); }
.mp-window-mark { position: absolute; top: 50%; width: 3px; height: 15px; margin-top: -7.5px; margin-left: -1.5px; border-radius: 2px; background: var(--perf-text); box-shadow: 0 0 6px var(--perf-text); }
.mp-window-vals { font-size: 11px; color: var(--perf-text-secondary); white-space: nowrap; }
.mp-window-vals b { font-weight: 800; }

.mp-nopolicy { display: flex; align-items: center; gap: 9px; padding: 12px 14px; border-radius: 13px; font-size: 12px; line-height: 1.45; color: var(--perf-orange);
  background: color-mix(in srgb, var(--perf-orange) 11%, transparent); border: 1px solid color-mix(in srgb, var(--perf-orange) 26%, transparent); }
.mp-nopolicy button { font: inherit; font-weight: 800; color: var(--perf-gold); background: none; border: none; cursor: pointer; text-decoration: underline; }

/* status pill */
.mp-status { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 13px;
  background: color-mix(in srgb, var(--hc) 9%, var(--perf-surface)); border: 1px solid color-mix(in srgb, var(--hc) 26%, var(--perf-border)); }
.mp-status-dot { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; color: var(--hc); background: color-mix(in srgb, var(--hc) 15%, transparent); }
.mp-status-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.mp-status-txt b { font-size: 13px; font-weight: 800; color: var(--perf-text); }
.mp-status-txt span { font-size: 11px; color: var(--perf-text-muted); }

/* applied */
.mp-applied { display: flex; flex-direction: column; gap: 9px; }
.mp-ctc { display: flex; align-items: center; gap: 10px; padding: 13px; border-radius: 14px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.mp-ctc-cell { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.mp-ctc-cell span { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--perf-text-muted); }
.mp-ctc-cell b { font-size: 16px; font-weight: 900; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.mp-ctc-cell.up b { color: var(--perf-ok); }
.mp-ctc-arrow { color: var(--perf-ok); flex-shrink: 0; }
.mp-applied-note { display: flex; align-items: flex-start; gap: 6px; margin: 0; font-size: 11px; line-height: 1.45; color: var(--perf-text-muted); }
.mp-applied-note :deep(svg) { color: var(--perf-ok); flex-shrink: 0; margin-top: 1px; }

/* actions */
.mp-act { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 16px; background: var(--perf-surface); border: 1px solid var(--perf-border); }
.mp-act-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 800; color: var(--perf-text-secondary); }
.mp-act-lab :deep(svg) { color: var(--perf-gold); }
.mp-pct { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mp-pct-btn { width: 34px; height: 34px; border-radius: 10px; cursor: pointer; font: inherit; font-size: 17px; font-weight: 800; color: var(--perf-text-secondary);
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: all 0.15s; }
.mp-pct-btn:hover:not(:disabled) { color: var(--perf-text); border-color: var(--perf-border-warm); }
.mp-pct-val { display: inline-flex; align-items: center; justify-content: center; gap: 1px; padding: 0 10px; height: 40px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s; }
.mp-pct-val:focus-within { border-color: var(--perf-border-warm); }
.mp-pct-val input { width: 44px; border: none; background: none; outline: none; font: inherit; font-size: 19px; font-weight: 900; color: var(--perf-text); text-align: center; font-variant-numeric: tabular-nums; }
.mp-pct-val input::-webkit-outer-spin-button, .mp-pct-val input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.mp-pct-val input { -moz-appearance: textfield; }
.mp-pct-val i { font-style: normal; font-size: 14px; font-weight: 800; color: var(--perf-text-muted); }
.mp-pct-quick { display: inline-flex; gap: 4px; margin-left: auto; }
.mp-pct-quick button { font: inherit; font-size: 10px; font-weight: 700; padding: 5px 9px; border-radius: 8px; cursor: pointer;
  color: var(--perf-text-muted); background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: all 0.15s; }
.mp-pct-quick button:hover { color: var(--perf-gold); border-color: var(--perf-border-warm); }
.mp-pct-rec { font: inherit; font-size: 10.5px; font-weight: 700; margin-left: auto; padding: 6px 11px; border-radius: 999px; cursor: pointer; white-space: nowrap;
  color: var(--perf-text-muted); background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: all 0.16s; }
.mp-pct-rec:hover { color: var(--perf-gold); border-color: var(--perf-border-warm); }
.mp-pct-rec.on { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border-color: color-mix(in srgb, var(--perf-gold) 30%, transparent); }
.mp-warn { display: flex; align-items: center; gap: 5px; margin: 0; font-size: 10.5px; color: var(--perf-conflict); }
.mp-note { width: 100%; resize: vertical; min-height: 40px; padding: 9px 11px; border-radius: 11px; font: inherit; font-size: 12px;
  color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.mp-note:focus { outline: none; border-color: var(--perf-border-warm); }
.mp-submit { width: 100%; }
.mp-eff { display: flex; flex-direction: column; gap: 5px; }
.mp-eff label { font-size: 10.5px; font-weight: 700; color: var(--perf-text-muted); }
.mp-override { display: flex; flex-direction: column; gap: 6px; padding: 11px; border-radius: 12px;
  background: color-mix(in srgb, var(--perf-conflict) 8%, transparent); border: 1px solid color-mix(in srgb, var(--perf-conflict) 26%, transparent); }
.mp-override-lab { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 750; color: var(--perf-conflict); }
.mp-override-lab i { font-style: normal; }
.mp-process { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 12px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.mp-process-ic { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 13%, transparent); }
.mp-process p { flex: 1; min-width: 0; margin: 0; font-size: 11px; line-height: 1.5; color: var(--perf-text-muted); }
.mp-process-pct { display: inline-block; font-weight: 850; color: var(--perf-ok); background: var(--perf-ok-soft); padding: 0 5px; border-radius: 5px; }
.mp-act-row { display: flex; gap: 9px; }
.mp-act-row .perf-btn-primary { flex: 1; }
.mp-reject { color: var(--perf-text-muted); }
.mp-reject:hover { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }
.mp-reject-box { overflow: hidden; display: flex; flex-direction: column; gap: 8px; }
.mp-reject-box textarea { width: 100%; resize: vertical; min-height: 40px; padding: 9px 11px; border-radius: 11px; font: inherit; font-size: 12px;
  color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.mp-reject-confirm { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }

.mp-links { display: flex; flex-wrap: wrap; gap: 7px; padding-top: 4px; }
.mp-links button { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer;
  padding: 6px 11px; border-radius: 999px; color: var(--perf-text-secondary); background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.18s; }
.mp-links button:hover { color: var(--perf-gold); border-color: var(--perf-border-warm); transform: translateY(-1px); }
.mp-links button :deep(svg) { color: var(--perf-text-dim); }
.mp-links button:hover :deep(svg) { color: var(--perf-gold); }

@media (prefers-reduced-motion: reduce) { .mp-links button:hover { transform: none; } }
</style>
