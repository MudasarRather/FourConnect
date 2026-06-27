<template>
  <!-- ═══════════════════ THE STRIKE · recommend / approve / decline ═══════════════════
       The full merit pipeline in one cinematic console — without leaving the Arena.
       Resolves the review's band from the active Merit Policy (authoritative, via the
       backend), clamps the hike to the band window, and lets HR RECOMMEND (queue it),
       APPROVE & APPLY (effective-dated salary revision → payroll, idempotent) or DECLINE.
       Closes the loopholes: in-page recommend (was profile-only), %/effective-date
       controls + downward-override justification on approve, reasoned decline, an
       over-budget warning, and a direct-approve path for ACKNOWLEDGED reviews that
       can't be recommended. -->
  <Teleport to="body">
    <Transition name="msm">
      <div v-if="open" class="msm-overlay perf-scope" @click.self="close">
        <div class="msm" role="dialog" aria-modal="true">
          <span class="msm-mesh" aria-hidden="true" />

          <!-- header -->
          <header class="msm-head">
            <div class="msm-head-id">
              <span class="msm-head-ic"><component :is="modeMeta.icon" :size="16" /></span>
              <div>
                <span class="msm-eyebrow">{{ modeMeta.eyebrow }}</span>
                <h3>{{ modeMeta.title }}</h3>
              </div>
            </div>
            <button class="msm-x" type="button" @click="close"><X :size="17" /></button>
          </header>

          <div class="msm-body">
            <!-- ── aside · the Mint Pass ── -->
            <aside class="msm-pass">
              <span class="msm-pass-grain" aria-hidden="true" />
              <div class="msm-pass-stamp" :class="stampClass">{{ stampLabel }}</div>
              <div class="msm-coin" :class="{ struck: mode !== 'recommend' }" :style="{ '--bc': bandColor }">
                <span class="msm-coin-ring" />
                <span class="msm-coin-face">{{ initials }}</span>
              </div>
              <b class="msm-pass-name">{{ r.employee_name || '—' }}</b>
              <span class="msm-pass-role">{{ r.designation_name || '—' }}</span>
              <div class="msm-pass-band" v-if="bandLabel !== '—'" :style="{ '--bc': bandColor }">
                <i />{{ bandLabel }}
              </div>
              <div class="msm-pass-fig">
                <span class="msm-pass-pct" :class="{ over: outOfBand }">{{ mode === 'decline' ? '—' : fmtPct(hikePct) }}</span>
                <span class="msm-pass-fig-sub">{{ mode === 'decline' ? 'declined' : (mode === 'approve' ? 'to apply' : 'to recommend') }}</span>
              </div>
              <div class="msm-pass-meta">
                <span><PencilRuler :size="11" /> score {{ fmtScore(merit?.score) }}/{{ merit?.rating_max || r.rating_max || 5 }}</span>
                <span><Coins :size="11" /> {{ merit?.policy_name || policyName }}</span>
              </div>
            </aside>

            <!-- ── main · the controls ── -->
            <div class="msm-main">
              <div v-if="loading" class="msm-load"><Loader2 :size="18" class="perf-spin" /> Resolving merit band…</div>

              <template v-else>
                <!-- band + window -->
                <div v-if="band" class="msm-band" :style="{ '--bc': bandColor }">
                  <div class="msm-band-top">
                    <span class="msm-band-name">{{ bandLabel }}</span>
                    <button class="msm-band-link" type="button" @click="goSettings('merit-policy')"><Coins :size="11" /> bands <ArrowUpRight :size="11" /></button>
                  </div>
                  <div class="msm-window">
                    <div class="msm-window-rail">
                      <span class="msm-window-fill" :style="{ left: railLeft + '%', width: railWidth + '%' }" />
                      <span v-if="mode !== 'decline'" class="msm-window-mark" :class="{ over: outOfBand }" :style="{ left: markerLeft + '%' }" />
                    </div>
                    <span class="msm-window-vals">window <b>{{ loPct }}%</b>–<b>{{ hiPct }}%</b></span>
                  </div>
                </div>
                <div v-else class="msm-nopolicy">
                  <TriangleAlert :size="15" />
                  <span>No merit band resolves for this score. Configure bands in <button type="button" @click="goSettings('merit-policy')">Merit Policy</button>.</span>
                </div>

                <!-- decline reason -->
                <div v-if="mode === 'decline'" class="msm-field">
                  <label class="msm-lab"><CircleSlash :size="12" /> Reason for declining <i>*</i></label>
                  <textarea v-model="note" class="msm-note" rows="3" placeholder="Why is this increment declined for the cycle? (budget, calibration outcome…)" />
                </div>

                <!-- recommend / approve controls -->
                <template v-else>
                  <div class="msm-field">
                    <label class="msm-lab"><TrendingUp :size="12" /> Increment</label>
                    <div class="msm-pct">
                      <button type="button" class="msm-pct-btn" @click="bump(-0.5)" :disabled="busy">–</button>
                      <div class="msm-pct-val" :class="{ over: outOfBand }"><input v-model.number="hikePct" type="number" :step="0.5" /><i>%</i></div>
                      <button type="button" class="msm-pct-btn" @click="bump(0.5)" :disabled="busy">+</button>
                      <div class="msm-pct-quick">
                        <button type="button" @click="hikePct = loPct">min</button>
                        <button type="button" @click="hikePct = midPct">mid</button>
                        <button type="button" @click="hikePct = hiPct">max</button>
                      </div>
                    </div>
                    <button v-if="mode === 'approve' && r.recommended_hike_pct != null" type="button" class="msm-rec-chip"
                      :class="{ on: Number(hikePct) === Number(r.recommended_hike_pct) }" @click="hikePct = Number(r.recommended_hike_pct)">
                      ↺ recommended {{ fmtPct(r.recommended_hike_pct) }}
                    </button>
                    <p v-if="outOfBand" class="msm-warn"><TriangleAlert :size="11" /> Outside the band window — the policy will reject it.</p>
                  </div>

                  <!-- effective date (approve) -->
                  <div v-if="mode === 'approve'" class="msm-field">
                    <label class="msm-lab"><CalendarClock :size="12" /> Effective from</label>
                    <HrDatePicker v-model="effFrom" placeholder="dd / mm / yyyy" />
                  </div>

                  <!-- downward override (approve, below recommendation) -->
                  <div v-if="belowRec" class="msm-override">
                    <label class="msm-lab danger"><TriangleAlert :size="12" /> Below the recommended {{ fmtPct(r.recommended_hike_pct) }} — justification required <i>*</i></label>
                    <textarea v-model="note" class="msm-note" rows="2" placeholder="Why is the approved increment lower than recommended?" />
                  </div>
                  <!-- justification note (recommend / approve at-or-above) -->
                  <div v-else class="msm-field">
                    <label class="msm-lab"><ScrollText :size="12" /> Note <i class="opt">(optional)</i></label>
                    <textarea v-model="note" class="msm-note" rows="2" :placeholder="mode === 'approve' ? 'HR note — appended to the record…' : 'Justification — shared with the approver…'" />
                  </div>

                  <!-- over-budget warning (approve) -->
                  <div v-if="mode === 'approve' && budgetOver" class="msm-budget-warn">
                    <Flame :size="14" />
                    <span>This cycle's merit pool is <b>over budget</b> by {{ inrShort(Math.abs(budget?.remaining)) }}. Approving still applies — confirm this is an approved exception.</span>
                  </div>

                  <!-- process note (approve) -->
                  <div v-if="mode === 'approve'" class="msm-process">
                    <span class="msm-process-ic"><Info :size="13" /></span>
                    <p>Approving commits an effective-dated <b>+{{ fmtPct(hikePct) }}</b> salary revision to payroll. Idempotent — it can't double-apply.</p>
                  </div>
                </template>
              </template>
            </div>
          </div>

          <!-- footer -->
          <footer class="msm-foot">
            <div class="msm-links">
              <button type="button" @click="goSettings('appraisal-templates')"><FileText :size="12" /> Rubric</button>
            </div>
            <div class="msm-foot-acts">
              <template v-if="mode === 'decline'">
                <button class="perf-btn perf-btn-steel" type="button" :disabled="busy" @click="mode = 'approve'">Back</button>
                <button class="perf-btn msm-decline-go" type="button" :disabled="busy || !note.trim()" @click="doDecline">
                  <Loader2 v-if="busy" :size="14" class="perf-spin" /><CircleSlash v-else :size="14" /> Confirm decline
                </button>
              </template>
              <template v-else-if="mode === 'approve'">
                <button v-if="canDecline" class="perf-btn msm-decline" type="button" :disabled="busy" @click="mode = 'decline'"><CircleSlash :size="14" /> Decline</button>
                <button class="perf-btn perf-btn-primary" type="button" :disabled="busy || !band || outOfBand || (belowRec && !note.trim())" @click="doApprove">
                  <Loader2 v-if="busy" :size="14" class="perf-spin" /><BadgeCheck v-else :size="14" /> Approve &amp; apply
                </button>
              </template>
              <template v-else>
                <button v-if="canApproveDirect" class="perf-btn perf-btn-steel" type="button" :disabled="busy" @click="mode = 'approve'"><BadgeCheck :size="14" /> Approve directly</button>
                <button class="perf-btn perf-btn-primary" type="button" :disabled="busy || !band || outOfBand" @click="doRecommend">
                  <Loader2 v-if="busy" :size="14" class="perf-spin" /><TrendingUp v-else :size="14" /> Recommend {{ fmtPct(hikePct) }}
                </button>
              </template>
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  X, Loader2, TrendingUp, BadgeCheck, CircleSlash, TriangleAlert, Info, ArrowUpRight,
  Coins, FileText, PencilRuler, ScrollText, CalendarClock, Flame,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { fetchReviewMerit, recommendHikeAdmin, approveHike, rejectHike, bandTone } from '@/composables/usePerformance'

const props = defineProps({
  open: { type: Boolean, default: false },
  review: { type: Object, default: null },
  budget: { type: Object, default: null },
  intent: { type: String, default: null },   // null | 'decline' — opens straight into a mode
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()
const router = useRouter()

const r = computed(() => props.review || {})
const merit = ref(null)
const loading = ref(false)
const busy = ref(false)
const mode = ref('recommend')   // 'recommend' | 'approve' | 'decline'
const hikePct = ref(0)
const note = ref('')
const effFrom = ref('')

const policyName = computed(() => props.budget?.policy_name || 'Merit policy')
const initials = computed(() => (r.value.employee_name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?')

// band geometry
const band = computed(() => {
  const x = merit.value?.band
  if (!x) return null
  return typeof x === 'object' ? x : { key: String(x).toUpperCase().replace(/\s+/g, '_'), label: String(x) }
})
const bandColor = computed(() => band.value ? (bandTone(band.value.key) || 'var(--perf-gold)') : 'var(--perf-gold)')
const bandLabel = computed(() => band.value?.label || band.value?.key || '—')
const loPct = computed(() => Number(merit.value?.hike_min_pct ?? band.value?.hike_min_pct ?? 0))
const hiPct = computed(() => Number(merit.value?.hike_max_pct ?? band.value?.hike_max_pct ?? 0))
const midPct = computed(() => Math.round(((loPct.value + hiPct.value) / 2) * 2) / 2)
const WMAX = computed(() => Math.max(20, hiPct.value))
const railLeft = computed(() => Math.min(100, (loPct.value / WMAX.value) * 100))
const railWidth = computed(() => Math.min(100 - railLeft.value, ((hiPct.value - loPct.value) / WMAX.value) * 100))
const markerLeft = computed(() => Math.min(100, Math.max(0, (Number(hikePct.value || 0) / WMAX.value) * 100)))

const outOfBand = computed(() => band.value ? (Number(hikePct.value) < loPct.value || Number(hikePct.value) > hiPct.value) : false)
const isAck = computed(() => r.value.status === 'ACKNOWLEDGED')
const hike = computed(() => r.value.hike_status || 'NONE')
const canApprove = computed(() => hike.value === 'RECOMMENDED')
const canDecline = computed(() => hike.value === 'RECOMMENDED')
// COMPLETED reviews can be approved directly with an explicit %; recommend requires COMPLETED.
const canApproveDirect = computed(() => ['COMPLETED', 'ACKNOWLEDGED'].includes(r.value.status) && ['NONE', 'REJECTED'].includes(hike.value))
const belowRec = computed(() => mode.value === 'approve' && r.value.recommended_hike_pct != null && Number(hikePct.value) < Number(r.value.recommended_hike_pct))
const budgetOver = computed(() => !!props.budget?.over_budget)

const modeMeta = computed(() => {
  if (mode.value === 'decline') return { eyebrow: 'Merit pipeline', title: 'Decline increment', icon: CircleSlash }
  if (mode.value === 'approve') return { eyebrow: 'Strike the coin', title: 'Approve & apply increment', icon: BadgeCheck }
  return { eyebrow: 'Merit pipeline', title: 'Recommend an increment', icon: TrendingUp }
})
const stampLabel = computed(() => mode.value === 'decline' ? 'DECLINED' : (mode.value === 'approve' ? 'TO MINT' : 'TO RECOMMEND'))
const stampClass = computed(() => mode.value === 'decline' ? 'reject' : (mode.value === 'approve' ? 'mint' : 'rec'))

async function load() {
  merit.value = null
  if (!r.value.id) return
  loading.value = true
  try { merit.value = await fetchReviewMerit(r.value.id) }
  catch { merit.value = null }
  finally { loading.value = false }
}

function initMode() {
  if (props.intent === 'decline' && canDecline.value) { mode.value = 'decline'; return }
  if (canApprove.value) mode.value = 'approve'
  else if (r.value.status === 'COMPLETED') mode.value = 'recommend'
  else mode.value = 'approve'   // ACK + no hike → direct approve only
}
function resetForm() {
  note.value = ''
  effFrom.value = r.value.hike_effective_from || ''
  if (hike.value === 'RECOMMENDED' && r.value.recommended_hike_pct != null) hikePct.value = Number(r.value.recommended_hike_pct)
  else hikePct.value = midPct.value || loPct.value
}

watch(() => props.open, async (o) => {
  if (!o) return
  initMode()
  await load()
  resetForm()
}, { immediate: true })
// re-seed the % once the band resolves (midPct depends on the fetched window)
watch(loPct, () => { if (props.open && hike.value !== 'RECOMMENDED') hikePct.value = midPct.value || loPct.value })

function bump(d) { hikePct.value = Math.round((Number(hikePct.value || 0) + d) * 2) / 2 }
function close() { if (!busy.value) emit('close') }
function goSettings(t) { router.push(`/admin/hr/settings/${t}`) }

async function doRecommend() {
  if (outOfBand.value) return
  busy.value = true
  try {
    const updated = await recommendHikeAdmin(r.value.id, { hike_pct: Number(hikePct.value), note: note.value || null })
    toast.success(`Recommended ${fmtPct(hikePct.value)} for ${r.value.employee_name}`)
    emit('done', updated)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not recommend') }
  finally { busy.value = false }
}
async function doApprove() {
  if (outOfBand.value) return
  if (belowRec.value && !note.value.trim()) { toast.error('Add a justification — the approved hike is below the recommendation'); return }
  busy.value = true
  try {
    const updated = await approveHike(r.value.id, { approved_hike_pct: Number(hikePct.value), effective_from: effFrom.value || null, note: note.value || null })
    toast.success(`Increment minted for ${r.value.employee_name} · applied to payroll`)
    emit('done', updated.review || updated)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Approval failed') }
  finally { busy.value = false }
}
async function doDecline() {
  if (!note.value.trim()) return
  busy.value = true
  try {
    const updated = await rejectHike(r.value.id, { to: 'REJECTED', note: note.value || null })
    toast.success('Increment declined for this cycle')
    emit('done', updated)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not decline') }
  finally { busy.value = false }
}

const fmtPct = (v) => v == null ? '—' : (Number.isInteger(Number(v)) ? `${v}%` : `${Number(v).toFixed(1)}%`)
const fmtScore = (v) => v == null ? '—' : (Math.round(Number(v) * 100) / 100)
const inrShort = (v) => {
  if (v == null) return '—'
  const n = Number(v)
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(1) + 'Cr'
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + 'L'
  return '₹' + Math.round(n).toLocaleString('en-IN')
}
</script>

<style scoped>
.msm-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 22px;
  background: color-mix(in srgb, #000 56%, transparent); backdrop-filter: blur(7px); -webkit-backdrop-filter: blur(7px); }
.msm { position: relative; overflow: hidden; width: min(720px, 100%); max-height: 92vh; display: flex; flex-direction: column; border-radius: 22px;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); box-shadow: 0 50px 110px -40px rgba(0,0,0,0.8); }
.msm-mesh { position: absolute; inset: 0; pointer-events: none; opacity: 0.7; z-index: 0;
  background: radial-gradient(80% 60% at 18% -10%, color-mix(in srgb, var(--perf-gold) 13%, transparent), transparent 60%),
    radial-gradient(70% 60% at 100% 0%, color-mix(in srgb, var(--perf-orange) 10%, transparent), transparent 60%); }

.msm-head { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 17px 19px; border-bottom: 1px solid var(--perf-border); }
.msm-head-id { display: flex; align-items: center; gap: 11px; min-width: 0; }
.msm-head-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0; color: #1a1206; background: var(--perf-grad-hero); }
.msm-eyebrow { font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--perf-gold); }
.msm-head h3 { margin: 2px 0 0; font-size: 16.5px; font-weight: 850; color: var(--perf-text); letter-spacing: -0.01em; }
.msm-x { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; cursor: pointer; color: var(--perf-text-muted);
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.18s; flex-shrink: 0; }
.msm-x:hover { color: var(--perf-text); border-color: var(--perf-border-warm); }

.msm-body { position: relative; z-index: 1; display: grid; grid-template-columns: 238px 1fr; gap: 0; overflow: hidden; }

/* aside · mint pass */
.msm-pass { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 22px 18px; border-right: 1px solid var(--perf-border);
  background: linear-gradient(165deg, color-mix(in srgb, var(--perf-gold) 9%, var(--perf-panel)), var(--perf-panel)); }
.msm-pass-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--perf-gold) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--perf-gold) 7%, transparent) 1px, transparent 1px);
  background-size: 26px 26px; mask-image: radial-gradient(120% 100% at 50% 0%, #000, transparent 75%); -webkit-mask-image: radial-gradient(120% 100% at 50% 0%, #000, transparent 75%); }
.msm-pass-stamp { position: absolute; top: 14px; right: -28px; transform: rotate(38deg); z-index: 2; padding: 3px 34px; font-size: 9px; font-weight: 900; letter-spacing: 0.12em; color: #1a1206; }
.msm-pass-stamp.rec { background: var(--perf-amber); } .msm-pass-stamp.mint { background: var(--perf-grad-hero); } .msm-pass-stamp.reject { background: var(--perf-conflict); color: #fff; }
.msm-coin { position: relative; z-index: 1; width: 76px; height: 76px; border-radius: 50%; display: grid; place-items: center; margin-top: 6px; }
.msm-coin-ring { position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from -90deg, var(--bc), color-mix(in srgb, var(--bc) 40%, transparent), var(--bc)); animation: msm-spin 9s linear infinite; }
.msm-coin-ring::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: var(--perf-panel); }
.msm-coin-face { position: relative; z-index: 1; display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; font-size: 21px; font-weight: 900; color: var(--bc);
  background: color-mix(in srgb, var(--bc) 12%, transparent); }
.msm-coin.struck .msm-coin-face { color: #4a2c08; background: radial-gradient(circle at 38% 32%, var(--perf-gold-bright), var(--perf-ember) 82%); }
@keyframes msm-spin { to { transform: rotate(360deg); } }
.msm-pass-name { font-size: 14px; font-weight: 850; color: var(--perf-text); text-align: center; margin-top: 4px; }
.msm-pass-role { font-size: 10.5px; color: var(--perf-text-muted); text-align: center; }
.msm-pass-band { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 800; color: var(--bc);
  background: color-mix(in srgb, var(--bc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--bc) 28%, transparent); }
.msm-pass-band i { width: 6px; height: 6px; border-radius: 50%; background: var(--bc); }
.msm-pass-fig { display: flex; flex-direction: column; align-items: center; margin-top: 4px; }
.msm-pass-pct { font-size: 30px; font-weight: 900; letter-spacing: -0.02em; color: var(--perf-gold); font-variant-numeric: tabular-nums; line-height: 1; }
.msm-pass-pct.over { color: var(--perf-conflict); }
.msm-pass-fig-sub { font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--perf-text-muted); }
.msm-pass-meta { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; width: 100%; }
.msm-pass-meta span { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; color: var(--perf-text-muted); justify-content: center; }
.msm-pass-meta :deep(svg) { color: var(--perf-gold); flex-shrink: 0; }

/* main */
.msm-main { padding: 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 13px; }
.msm-load { display: flex; align-items: center; gap: 9px; padding: 24px; font-size: 12.5px; color: var(--perf-text-muted); }
.msm-main > * { animation: msm-deal 0.4s var(--perf-spring) both; }
.msm-main > *:nth-child(2) { animation-delay: 0.04s; } .msm-main > *:nth-child(3) { animation-delay: 0.09s; } .msm-main > *:nth-child(4) { animation-delay: 0.14s; } .msm-main > *:nth-child(5) { animation-delay: 0.19s; }
@keyframes msm-deal { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

.msm-band { display: flex; flex-direction: column; gap: 9px; padding: 13px; border-radius: 14px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--bc) 10%, var(--perf-surface)), var(--perf-panel)); border: 1px solid color-mix(in srgb, var(--bc) 24%, var(--perf-border)); }
.msm-band-top { display: flex; align-items: center; justify-content: space-between; }
.msm-band-name { font-size: 16px; font-weight: 900; color: var(--bc); }
.msm-band-link { display: inline-flex; align-items: center; gap: 4px; font: inherit; font-size: 10px; font-weight: 750; cursor: pointer; padding: 3px 8px; border-radius: 999px;
  color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 11%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.msm-window { display: flex; align-items: center; gap: 10px; }
.msm-window-rail { position: relative; flex: 1; height: 7px; border-radius: 999px; background: var(--perf-track); }
.msm-window-fill { position: absolute; top: 0; height: 100%; border-radius: 999px; background: var(--bc); box-shadow: 0 0 10px -1px var(--bc); }
.msm-window-mark { position: absolute; top: 50%; width: 3px; height: 16px; margin: -8px 0 0 -1.5px; border-radius: 2px; background: var(--perf-text); box-shadow: 0 0 6px var(--perf-text); transition: left 0.3s var(--perf-spring); }
.msm-window-mark.over { background: var(--perf-conflict); box-shadow: 0 0 6px var(--perf-conflict); }
.msm-window-vals { font-size: 10.5px; color: var(--perf-text-secondary); white-space: nowrap; }
.msm-window-vals b { font-weight: 850; }

.msm-nopolicy { display: flex; align-items: center; gap: 9px; padding: 12px 14px; border-radius: 13px; font-size: 12px; line-height: 1.45; color: var(--perf-orange);
  background: color-mix(in srgb, var(--perf-orange) 10%, transparent); border: 1px solid color-mix(in srgb, var(--perf-orange) 26%, transparent); }
.msm-nopolicy button { font: inherit; font-weight: 800; color: var(--perf-gold); background: none; border: none; cursor: pointer; text-decoration: underline; }

.msm-field { display: flex; flex-direction: column; gap: 8px; }
.msm-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 800; color: var(--perf-text-secondary); }
.msm-lab :deep(svg) { color: var(--perf-gold); }
.msm-lab i { font-style: normal; } .msm-lab i.opt { color: var(--perf-text-dim); font-weight: 600; }
.msm-lab.danger { color: var(--perf-conflict); } .msm-lab.danger :deep(svg) { color: var(--perf-conflict); }

.msm-pct { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.msm-pct-btn { width: 36px; height: 40px; border-radius: 10px; cursor: pointer; font: inherit; font-size: 18px; font-weight: 800; color: var(--perf-text-secondary);
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.15s; }
.msm-pct-btn:hover:not(:disabled) { color: var(--perf-text); border-color: var(--perf-border-warm); }
.msm-pct-val { display: inline-flex; align-items: center; gap: 1px; padding: 0 12px; height: 44px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s; }
.msm-pct-val.over { border-color: color-mix(in srgb, var(--perf-conflict) 50%, transparent); }
.msm-pct-val:focus-within { border-color: var(--perf-border-warm); }
.msm-pct-val input { width: 52px; border: none; background: none; outline: none; font: inherit; font-size: 21px; font-weight: 900; color: var(--perf-text); text-align: center; font-variant-numeric: tabular-nums; }
.msm-pct-val input::-webkit-outer-spin-button, .msm-pct-val input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.msm-pct-val input { -moz-appearance: textfield; }
.msm-pct-val i { font-style: normal; font-size: 15px; font-weight: 800; color: var(--perf-text-muted); }
.msm-pct-quick { display: inline-flex; gap: 4px; margin-left: auto; }
.msm-pct-quick button { font: inherit; font-size: 10px; font-weight: 700; padding: 6px 10px; border-radius: 8px; cursor: pointer; color: var(--perf-text-muted);
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.15s; }
.msm-pct-quick button:hover { color: var(--perf-gold); border-color: var(--perf-border-warm); }
.msm-rec-chip { align-self: flex-start; font: inherit; font-size: 10.5px; font-weight: 700; padding: 5px 11px; border-radius: 999px; cursor: pointer; color: var(--perf-text-muted);
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.16s; }
.msm-rec-chip:hover { color: var(--perf-gold); border-color: var(--perf-border-warm); }
.msm-rec-chip.on { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border-color: color-mix(in srgb, var(--perf-gold) 30%, transparent); }
.msm-warn { display: flex; align-items: center; gap: 5px; margin: 0; font-size: 10.5px; color: var(--perf-conflict); }

.msm-note { width: 100%; resize: vertical; min-height: 44px; padding: 10px 12px; border-radius: 11px; font: inherit; font-size: 12.5px;
  color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.msm-note:focus { outline: none; border-color: var(--perf-border-warm); }
.msm-override { display: flex; flex-direction: column; gap: 7px; padding: 12px; border-radius: 13px;
  background: color-mix(in srgb, var(--perf-conflict) 8%, transparent); border: 1px solid color-mix(in srgb, var(--perf-conflict) 26%, transparent); }

.msm-budget-warn { display: flex; align-items: flex-start; gap: 9px; padding: 11px 13px; border-radius: 13px; font-size: 11.5px; line-height: 1.5; color: var(--perf-conflict);
  background: color-mix(in srgb, var(--perf-conflict) 9%, transparent); border: 1px solid color-mix(in srgb, var(--perf-conflict) 28%, transparent); }
.msm-budget-warn :deep(svg) { flex-shrink: 0; margin-top: 1px; }
.msm-budget-warn b { font-weight: 850; }
.msm-process { display: flex; align-items: flex-start; gap: 9px; padding: 11px 13px; border-radius: 13px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.msm-process-ic { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; flex-shrink: 0; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 13%, transparent); }
.msm-process p { flex: 1; margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--perf-text-muted); }
.msm-process b { color: var(--perf-ok); font-weight: 850; }

.msm-foot { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border-top: 1px solid var(--perf-border); background: var(--perf-panel); }
.msm-links button { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; padding: 7px 11px; border-radius: 999px;
  color: var(--perf-text-secondary); background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.18s; }
.msm-links button:hover { color: var(--perf-gold); border-color: var(--perf-border-warm); }
.msm-links button :deep(svg) { color: var(--perf-text-dim); }
.msm-foot-acts { display: flex; align-items: center; gap: 9px; }
.msm-decline { color: var(--perf-text-muted); } .msm-decline:hover { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }
.msm-decline-go { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 32%, transparent); }
.msm-decline-go:hover:not(:disabled) { background: color-mix(in srgb, var(--perf-conflict) 12%, transparent); }

/* enter/leave */
.msm-enter-active, .msm-leave-active { transition: opacity 0.26s var(--perf-ease); }
.msm-enter-active .msm, .msm-leave-active .msm { transition: opacity 0.3s var(--perf-ease), transform 0.34s var(--perf-spring); }
.msm-enter-from, .msm-leave-to { opacity: 0; }
.msm-enter-from .msm, .msm-leave-to .msm { opacity: 0; transform: translateY(20px) scale(0.97); }

@media (max-width: 640px) {
  .msm-body { grid-template-columns: 1fr; }
  .msm-pass { flex-direction: row; flex-wrap: wrap; justify-content: center; border-right: none; border-bottom: 1px solid var(--perf-border); padding: 16px; gap: 10px; }
  .msm-pass-meta { flex-direction: row; justify-content: center; gap: 14px; }
}
@media (prefers-reduced-motion: reduce) {
  .msm-coin-ring { animation: none; }
  .msm-main > * { animation: none; }
  .msm-enter-active .msm, .msm-leave-active .msm { transition: opacity 0.2s; }
  .msm-enter-from .msm, .msm-leave-to .msm { transform: none; }
}
</style>
