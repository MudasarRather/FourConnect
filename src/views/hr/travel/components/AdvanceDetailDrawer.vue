<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open && a" as="div" class="ad-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="aside" class="ad" role="dialog" aria-label="Advance detail"
          :initial="{ x: 60, opacity: 0 }" :animate="{ x: 0, opacity: 1 }" :exit="{ x: 60, opacity: 0 }"
          :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="ad-aura" aria-hidden="true" />

          <!-- header -->
          <header class="ad-head">
            <span class="ad-spine" :style="{ background: meta.hex }" />
            <div class="ad-htext">
              <span class="ad-num trv-mono">{{ a.advance_number }}</span>
              <span class="ad-pill" :style="{ '--c': meta.hex }"><component :is="meta.icon" :size="11" /> {{ meta.label }}</span>
            </div>
            <span v-if="loadingDetail" class="ad-load"><Loader2 :size="14" class="spin" /></span>
            <button class="ad-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="ad-body" ref="bodyEl">
            <!-- ░░ exposure hero ░░ -->
            <Motion class="ad-hero" v-bind="sT(0)">
              <span class="ah-grid" aria-hidden="true" />
              <div class="ah-main">
                <div class="ah-who">
                  <span class="ah-avatar" :style="{ '--c': meta.hex }">{{ initials }}</span>
                  <div class="ah-id">
                    <span class="ah-name">{{ a.employee_name || '—' }}</span>
                    <button class="ah-ref trv-mono" @click="$emit('go', { tab: 'requests', filter: { q: a.travel_reference_number } })">
                      {{ a.travel_reference_number }} <ArrowUpRight :size="11" />
                    </button>
                  </div>
                </div>
                <div class="ah-amt">
                  <span class="ah-big trv-mono"><TrvCountUp :value="effective" :format="fmtINR" /></span>
                  <span class="ah-lab">{{ a.status === 'REQUESTED' ? 'Requested' : trimmed ? 'Approved · trimmed' : a.status === 'APPROVED' ? 'Approved · awaiting release' : 'Approved & in flight' }}</span>
                </div>
              </div>
              <!-- headroom ring -->
              <div class="ah-ring">
                <svg viewBox="0 0 86 86">
                  <circle class="rg-track" cx="43" cy="43" :r="R" />
                  <circle class="rg-fill" cx="43" cy="43" :r="R" :class="{ over: ceilingPct >= 99.5 }"
                    :style="{ stroke: hasCeiling ? meta.hex : 'var(--trv-border-strong)',
                              strokeDasharray: RC, strokeDashoffset: drawn ? ringOffset : RC }" />
                </svg>
                <div class="rg-mid">
                  <b class="trv-mono">{{ hasCeiling ? Math.round(ceilingPct) + '%' : '∞' }}</b>
                  <span>{{ hasCeiling ? 'of cap' : 'uncapped' }}</span>
                </div>
              </div>
            </Motion>

            <!-- ░░ the trip ░░ -->
            <Motion v-if="trip" class="ad-card" v-bind="sT(1)">
              <div class="ad-cthead">
                <span class="ad-ct"><Plane :size="13" /> The trip</span>
                <TrvStatusPill v-if="trip.status" :status="trip.status" />
              </div>
              <button class="tp-route" @click="$emit('go', { tab: 'requests', filter: { q: a.travel_reference_number } })" title="Open travel request">
                <div class="tp-end"><span class="tp-code trv-mono">{{ code(trip.from_location) }}</span><span class="tp-place">{{ trip.from_location || '—' }}</span></div>
                <div class="tp-path"><span class="tp-line" /><Plane :size="13" /><span class="tp-line" /></div>
                <div class="tp-end right"><span class="tp-code trv-mono">{{ code(trip.to_location) }}</span><span class="tp-place">{{ trip.to_location || '—' }}</span></div>
              </button>
              <div class="tp-facts">
                <div><span>Depart</span><b class="trv-mono">{{ fmtDate(trip.departure_date) }}</b></div>
                <div><span>Return</span><b class="trv-mono">{{ fmtDate(trip.return_date) }}</b></div>
                <div><span>Days</span><b class="trv-mono">{{ trip.num_days ?? '—' }}</b></div>
                <div><span>City tier</span><b :style="{ color: cityMeta(trip.city_category).hex }">{{ cityMeta(trip.city_category).label }}</b></div>
                <div><span>Type</span><b>{{ tripTypeMeta(trip.trip_type).label }}</b></div>
                <div><span>Priority</span><b :style="{ color: priorityMeta(trip.priority).hex }">{{ priorityMeta(trip.priority).label }}</b></div>
              </div>
              <div class="tp-est">
                <span><Coins :size="12" /> Trip estimate</span>
                <b class="trv-mono">{{ fmtINR(trip.est_total_cost) }}</b>
              </div>
              <div v-if="fundingChips.length" class="tp-chips">
                <span v-for="(c, i) in fundingChips" :key="i" class="tp-chip"><component :is="c.icon" :size="10" /> {{ c.text }}</span>
              </div>
            </Motion>

            <!-- ░░ capital flow ░░ -->
            <Motion class="ad-card" v-bind="sT(2)">
              <span class="ad-ct"><HandCoins :size="13" /> Capital flow</span>
              <div class="br" :class="{ lit: drawn }">
                <div class="br-row">
                  <span class="br-tag">Requested</span>
                  <div class="br-track"><span class="br-bar req" :style="{ width: bw(a.advance_amount) }" /></div>
                  <b class="trv-mono">{{ fmtINR(a.advance_amount) }}</b>
                </div>
                <div v-if="a.approved_at || a.approved_amount != null" class="br-row">
                  <span class="br-tag">Approved</span>
                  <div class="br-track"><span class="br-bar app" :style="{ width: bw(effective) }" /></div>
                  <b class="trv-mono">{{ fmtINR(effective) }}</b>
                </div>
                <div v-if="a.released_at" class="br-row">
                  <span class="br-tag">Released</span>
                  <div class="br-track"><span class="br-bar rel" :style="{ width: bw(effective) }" /></div>
                  <b class="trv-mono">{{ fmtINR(effective) }}</b>
                </div>
                <div v-if="a.recovered_amount" class="br-row rec">
                  <span class="br-tag">Recovered</span>
                  <div class="br-track"><span class="br-bar recb" :style="{ width: bw(a.recovered_amount) }" /></div>
                  <b class="trv-mono">{{ fmtINR(a.recovered_amount) }}</b>
                </div>
                <div v-if="hasCeiling" class="br-row cap">
                  <span class="br-tag">Ceiling</span>
                  <div class="br-track ghost"><span class="br-bar capb" :style="{ width: bw(a.advance_ceiling) }" /></div>
                  <b class="trv-mono">{{ fmtINR(a.advance_ceiling) }}</b>
                </div>
              </div>
              <div v-if="hasCeiling" class="ad-note cap"><Gauge :size="12" /> Capped at the {{ a.ceiling_source || 'policy' }} — <b>{{ fmtINR(headroom) }}</b> headroom remaining.</div>
              <div v-if="trimmed" class="ad-note warn"><Scissors :size="12" /> Approver trimmed <b>{{ fmtINR(a.advance_amount - effective) }}</b> from the request.</div>
              <div v-if="a.status === 'RELEASED'" class="ad-note info"><Wallet :size="12" />
                {{ isDirectDisbursal ? `Disbursed via ${disburseMethodLabel.toLowerCase()}` : 'Posted to payroll' }} — recovered against the traveller's final expense settlement.</div>
            </Motion>

            <!-- ░░ the tour's money ░░ -->
            <Motion class="ad-card" v-bind="sT(3)">
              <span class="ad-ct"><Layers :size="13" /> The tour's money</span>
              <div class="mm">
                <div class="mm-tile current" :style="{ '--c': meta.hex }">
                  <span class="mm-top"><Coins :size="13" /> Advance <i class="mm-here">this</i></span>
                  <b class="mm-amt trv-mono">{{ fmtINR(effective) }}</b>
                  <span class="mm-sub" :style="{ color: meta.hex }">{{ meta.label }}</span>
                </div>

                <button class="mm-tile" :class="{ on: !!da }" :style="{ '--c': da ? daMeta(da.status).hex : 'var(--trv-text-dim)' }" @click="$emit('go', 'da')">
                  <span class="mm-top"><Calculator :size="13" /> Daily allowance <ArrowUpRight :size="11" class="mm-go" /></span>
                  <b class="mm-amt trv-mono">{{ da ? fmtINR(da.approved_da ?? da.eligible_da) : '—' }}</b>
                  <span class="mm-sub">{{ da ? `${daMeta(da.status).label} · ${da.travel_days}d @ ${fmtINR(da.daily_rate)}` : 'Not computed' }}</span>
                </button>

                <button class="mm-tile" :class="{ on: !!settlement }" :style="{ '--c': settlement ? settlementMeta(settlement.status).hex : 'var(--trv-text-dim)' }" @click="$emit('go', 'settlement')">
                  <span class="mm-top"><Scale :size="13" /> Settlement <ArrowUpRight :size="11" class="mm-go" /></span>
                  <b class="mm-amt trv-mono">{{ settlement ? fmtINR(settlementNet.amt) : '—' }}</b>
                  <span class="mm-sub">{{ settlement ? `${settlementMeta(settlement.status).label} · ${settlementNet.label}` : 'Not settled' }}</span>
                </button>

                <button class="mm-tile" :class="{ on: a.booking_count > 0 }" :style="{ '--c': a.booking_count ? '#fbbf24' : 'var(--trv-text-dim)' }" @click="$emit('go', 'booking')">
                  <span class="mm-top"><Ticket :size="13" /> Bookings <ArrowUpRight :size="11" class="mm-go" /></span>
                  <b class="mm-amt trv-mono">{{ fmtINR(a.booking_total) }}</b>
                  <span class="mm-sub">{{ a.booking_count ? `${a.booking_count} booking${a.booking_count > 1 ? 's' : ''} on tour` : 'No bookings yet' }}</span>
                </button>
              </div>
            </Motion>

            <!-- ░░ lifecycle ░░ -->
            <Motion class="ad-card" v-bind="sT(4)">
              <span class="ad-ct"><History :size="13" /> Lifecycle</span>
              <ol class="ad-tl">
                <li v-for="(step, i) in timeline" :key="i" :class="{ done: step.at, future: !step.at && !step.bad, bad: step.bad }">
                  <span class="tl-dot" :style="step.at ? { background: step.hex, borderColor: step.hex } : {}" />
                  <div class="tl-c">
                    <span class="tl-lab">{{ step.label }}</span>
                    <span class="tl-when trv-mono">{{ step.at ? fmtDateTime(step.at) : (step.bad ? '—' : 'pending') }}</span>
                    <span v-if="step.extra" class="tl-extra">{{ step.extra }}</span>
                  </div>
                </li>
              </ol>
              <div v-if="a.reject_reason" class="ad-note danger"><Ban :size="12" /> <b>Rejected:</b> {{ a.reject_reason }}</div>
            </Motion>

            <!-- ░░ notes ░░ -->
            <Motion v-if="a.purpose || a.notes" class="ad-card" v-bind="sT(5)">
              <span class="ad-ct"><FileText :size="13" /> Purpose &amp; notes</span>
              <p v-if="a.purpose" class="ad-purpose">{{ a.purpose }}</p>
              <p v-if="a.notes" class="ad-note-text"><MessageSquare :size="12" /> {{ a.notes }}</p>
            </Motion>
          </div>

          <!-- footer -->
          <footer class="ad-foot">
            <div class="ad-links">
              <button class="lk" @click="$emit('go', { tab: 'requests', filter: { q: a.travel_reference_number } })" title="Linked travel request"><Plane :size="13" /></button>
              <button class="lk" @click="$emit('go', 'settlement')" title="Settlement"><Scale :size="13" /></button>
              <button class="lk" @click="$emit('go', 'da')" title="Daily allowance"><Calculator :size="13" /></button>
              <button class="lk" @click="$emit('go', 'booking')" title="Bookings"><Ticket :size="13" /></button>
            </div>
            <div class="ad-actions">
              <button v-if="a.status === 'REQUESTED'" class="btn primary" @click="$emit('approve', a)"><Check :size="14" /> Approve</button>
              <button v-if="a.status === 'APPROVED'" class="btn primary" @click="$emit('release', a)"><Wallet :size="14" /> Release</button>
              <button v-if="['REQUESTED','APPROVED'].includes(a.status)" class="btn ghost danger" @click="$emit('reject', a)"><X :size="14" /> Reject</button>
            </div>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, ArrowUpRight, FileText, HandCoins, History, Wallet, Ban, Scissors,
  Plane, Scale, Calculator, Ticket, Check, Coins, Layers, Gauge, Loader2,
  MessageSquare, Briefcase, Wallet2, Landmark, Building2,
} from 'lucide-vue-next'
import TrvCountUp from './TrvCountUp.vue'
import TrvStatusPill from './TrvStatusPill.vue'
import {
  fmtINR, fmtDate, airportCode, advanceMeta, advanceEffective,
  cityMeta, tripTypeMeta, priorityMeta, settlementMeta, settlementMethodMeta, DA_STATUS, fetchAdvanceDetail,
} from '@/composables/useTravel'

const props = defineProps({ open: Boolean, advance: { type: Object, default: null } })
defineEmits(['close', 'approve', 'release', 'reject', 'go'])

// hydrate the list-row instantly, then merge the full detail payload
const detail = ref(null)
const loadingDetail = ref(false)
const a = computed(() => detail.value || props.advance || null)

const meta = computed(() => advanceMeta(a.value?.status))
const effective = computed(() => advanceEffective(a.value || {}))
const trimmed = computed(() => a.value?.approved_amount != null && Number(a.value.approved_amount) < Number(a.value.advance_amount))
const isDirectDisbursal = computed(() => !!a.value?.disbursement_method && a.value.disbursement_method !== 'PAYROLL')
const disburseMethodLabel = computed(() => settlementMethodMeta(a.value?.disbursement_method).label)
// The rail is only a real choice once the advance is approved/released — a REQUESTED
// advance just carries the default PAYROLL, so the pending step stays method-neutral.
const methodDecided = computed(() => !!a.value?.disbursement_method
  && (!!a.value?.released_at || ['APPROVED', 'RELEASED', 'SETTLED', 'RECOVERED'].includes(a.value?.status)))
const releaseLabel = computed(() => !methodDecided.value
  ? 'Released / disbursed'
  : (isDirectDisbursal.value ? `Disbursed · ${disburseMethodLabel.value}` : 'Released to payroll'))
const code = (l) => airportCode(l)
const daMeta = (k) => DA_STATUS.find(s => s.key === k) || { key: k, label: k, hex: '#9ca3af' }

const initials = computed(() => {
  const n = (a.value?.employee_name || '').trim()
  if (!n) return '—'
  const p = n.split(/\s+/)
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || n[0].toUpperCase()
})

const trip = computed(() => a.value?.trip || null)
const da = computed(() => a.value?.da || null)
const settlement = computed(() => a.value?.settlement || null)

const fundingChips = computed(() => {
  const t = trip.value; if (!t) return []
  const out = []
  if (a.value?.department_name) out.push({ icon: Building2, text: a.value.department_name })
  if (t.project_id) out.push({ icon: Briefcase, text: 'Project-funded' })
  if (t.cost_center) out.push({ icon: Wallet2, text: t.cost_center })
  if (t.budget_head) out.push({ icon: Landmark, text: t.budget_head })
  if (t.funding_source) out.push({ icon: Coins, text: t.funding_source })
  return out
})

// net settlement direction for the money tile
const settlementNet = computed(() => {
  const s = settlement.value
  if (!s) return { amt: 0, label: '—' }
  const pay = Number(s.payable_amount) || 0
  const rec = Number(s.recoverable_amount) || 0
  if (pay > 0) return { amt: pay, label: 'payable to traveller' }
  if (rec > 0) return { amt: rec, label: 'recoverable' }
  return { amt: 0, label: 'squared off' }
})

// ── ceiling / headroom ──
const hasCeiling = computed(() => a.value?.advance_ceiling != null && Number(a.value.advance_ceiling) > 0)
const ceilingPct = computed(() => {
  if (!hasCeiling.value) return 0
  return Math.max(0, Math.min(100, (effective.value / Number(a.value.advance_ceiling)) * 100))
})
const headroom = computed(() => hasCeiling.value ? Math.max(0, Number(a.value.advance_ceiling) - effective.value) : 0)

// ring geometry
const R = 38
const RC = +(2 * Math.PI * R).toFixed(2)
const ringOffset = computed(() => {
  const pct = hasCeiling.value ? ceilingPct.value : 0
  return +(RC * (1 - pct / 100)).toFixed(2)
})

// ── capital-flow bars (scaled to the largest figure on screen) ──
const scaleMax = computed(() => Math.max(
  Number(a.value?.advance_amount) || 0, effective.value,
  Number(a.value?.recovered_amount) || 0, Number(a.value?.advance_ceiling) || 0, 1))
const bw = (v) => drawn.value ? Math.round((Math.abs(Number(v) || 0) / scaleMax.value) * 100) + '%' : '0%'

const fmtDateTime = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return String(d) } }

const timeline = computed(() => {
  const x = a.value || {}
  const rows = [
    { label: 'Requested', at: x.created_at, hex: '#fbbf24', extra: x.requested_by_name ? `by ${x.requested_by_name}` : null },
    { label: trimmed.value ? 'Approved (trimmed)' : 'Approved', at: x.approved_at, hex: '#34d399', extra: x.approved_by_name ? `by ${x.approved_by_name}` : null },
    { label: releaseLabel.value, at: x.released_at, hex: '#fb923c',
      extra: [x.released_by_name ? `by ${x.released_by_name}` : null, x.payroll_ref || x.disbursement_reference || null].filter(Boolean).join(' · ') || null },
  ]
  if (x.status === 'REJECTED') rows.push({ label: 'Rejected', at: null, bad: true, hex: '#ef4444' })
  else if (x.status === 'CANCELLED') rows.push({ label: 'Cancelled', at: null, bad: true, hex: '#6b7280' })
  else rows.push({ label: x.status === 'RECOVERED' ? 'Closed · recovered' : 'Closed · settled', at: x.settled_at, hex: '#60d394',
    extra: x.recovered_amount ? `recovered ${fmtINR(x.recovered_amount)}` : null })
  return rows
})

// draw-on + fetch detail
const drawn = ref(false)
const bodyEl = ref(null)
const pinTop = () => nextTick(() => { if (bodyEl.value) bodyEl.value.scrollTop = 0 })
watch(() => props.open, async (o) => {
  if (!o) { drawn.value = false; detail.value = null; return }
  detail.value = props.advance ? { ...props.advance } : null
  drawn.value = false
  requestAnimationFrame(() => requestAnimationFrame(() => { drawn.value = true }))
  pinTop()
  const id = props.advance?.id
  if (!id) return
  loadingDetail.value = true
  try { detail.value = { ...props.advance, ...(await fetchAdvanceDetail(id)) } }
  catch { /* keep the list-row data — drawer still renders */ }
  finally { loadingDetail.value = false; pinTop() }   // re-pin: async cards inserting above can shift scroll
})

const sT = (n) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: 0.06 + n * 0.06, ease: [0.16, 1, 0.3, 1] } })
</script>

<style scoped>
.ad-overlay { position: fixed; inset: 0; z-index: 1440; display: flex; justify-content: flex-end; background: rgba(6,5,4,0.6); backdrop-filter: blur(8px); }
.ad { position: relative; width: min(540px, 100vw); height: 100%; display: flex; flex-direction: column; overflow: hidden;
  background: var(--trv-surface-elevated); border-left: 1px solid var(--trv-border-strong); box-shadow: -30px 0 80px rgba(0,0,0,0.5); }
.ad-aura { position: absolute; inset: -30% 0 60% 0; pointer-events: none; background: radial-gradient(60% 50% at 70% 0%, rgba(251,146,60,0.13), transparent 70%); animation: trv-aura-drift 12s ease-in-out infinite; }

.ad-head { position: relative; display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--trv-border); background: var(--trv-surface-glass); backdrop-filter: blur(12px); z-index: 2; }
.ad-spine { width: 4px; height: 26px; border-radius: 3px; }
.ad-htext { display: flex; align-items: center; gap: 10px; flex: 1; }
.ad-num { font-size: 14px; font-weight: 800; color: var(--trv-amber-bright); }
.ad-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.ad-load { color: var(--trv-text-dim); display: inline-flex; }
.ad-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; transition: color 0.2s; }
.ad-x:hover { color: var(--trv-text); }
.spin { animation: ad-spin 0.8s linear infinite; }
@keyframes ad-spin { to { transform: rotate(360deg); } }

.ad-body { position: relative; flex: 1; overflow-y: auto; overflow-anchor: none; padding: 16px 18px 22px; display: flex; flex-direction: column; gap: 13px; z-index: 1; }
/* Cards must never shrink: the hero uses overflow:hidden (→ flex min-height 0), so without this
   the flex column compresses ONLY the hero when content overflows, clipping its top. */
.ad-body > * { flex-shrink: 0; }
.ad-card { padding: 14px; border-radius: 15px; background: var(--trv-surface); border: 1px solid var(--trv-border); }
.ad-cthead { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.ad-cthead .ad-ct { margin-bottom: 0; }
.ad-ct { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-muted); margin-bottom: 12px; }

/* hero */
.ad-hero { position: relative; display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 17px; overflow: hidden;
  background: linear-gradient(150deg, var(--trv-surface-elevated), var(--trv-panel)); border: 1px solid var(--trv-border-strong); }
.ah-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--trv-border) 1px, transparent 1px), linear-gradient(90deg, var(--trv-border) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(80% 80% at 80% 10%, #000, transparent 75%); }
.ah-main { position: relative; flex: 1; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.ah-who { display: flex; align-items: center; gap: 10px; }
.ah-avatar { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; font-size: 13px; font-weight: 800; letter-spacing: 0.02em;
  color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); border: 1px solid color-mix(in srgb, var(--c) 34%, transparent); }
.ah-id { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ah-name { font-size: 14.5px; font-weight: 800; color: var(--trv-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ah-ref { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: var(--trv-amber-bright); background: none; border: none; padding: 0; cursor: pointer; }
.ah-ref:hover { text-decoration: underline; }
.ah-amt { display: flex; flex-direction: column; gap: 1px; }
.ah-big { font-size: 33px; font-weight: 860; color: var(--trv-text); letter-spacing: -0.015em; line-height: 1; }
.ah-lab { font-size: 11.5px; color: var(--trv-text-muted); }
.ah-ring { position: relative; width: 92px; height: 92px; flex-shrink: 0; }
.ah-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.rg-track { fill: none; stroke: var(--trv-panel); stroke-width: 7; }
.rg-fill { fill: none; stroke-width: 7; stroke-linecap: round; transition: stroke-dashoffset 1.05s var(--trv-spring); filter: drop-shadow(0 0 5px color-mix(in srgb, var(--trv-amber) 40%, transparent)); }
.rg-fill.over { animation: rg-pulse 2s ease-in-out infinite; }
@keyframes rg-pulse { 50% { filter: drop-shadow(0 0 9px var(--trv-st-rejected)); } }
.rg-mid { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
.rg-mid b { font-size: 18px; font-weight: 850; color: var(--trv-text); }
.rg-mid span { font-size: 8.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-dim); }

/* trip */
.tp-route { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; width: 100%; margin-bottom: 13px; padding: 11px 13px; border-radius: 12px;
  background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-amber); cursor: pointer; transition: border-color 0.2s, transform 0.2s; }
.tp-route:hover { border-color: var(--trv-amber-border); transform: translateY(-1px); }
.tp-end { display: flex; flex-direction: column; gap: 2px; min-width: 0; text-align: left; }
.tp-end.right { text-align: right; align-items: flex-end; }
.tp-code { font-size: 19px; font-weight: 850; color: var(--trv-text); line-height: 1; }
.tp-place { font-size: 9.5px; color: var(--trv-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 92px; }
.tp-path { display: flex; align-items: center; gap: 3px; }
.tp-line { width: 16px; height: 1.5px; background: repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px); opacity: 0.5; }
.tp-facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 11px 8px; }
.tp-facts > div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tp-facts span { font-size: 8.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-text-dim); }
.tp-facts b { font-size: 12.5px; font-weight: 700; color: var(--trv-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tp-est { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 11px; border-top: 1px dashed var(--trv-border-strong); }
.tp-est span { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--trv-text-muted); }
.tp-est svg { color: var(--trv-amber); }
.tp-est b { font-size: 14px; color: var(--trv-text); }
.tp-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 11px; }
.tp-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 600; color: var(--trv-text-secondary); background: var(--trv-panel); border: 1px solid var(--trv-border); }
.tp-chip svg { color: var(--trv-amber); }

/* bridge */
.br { display: flex; flex-direction: column; gap: 9px; }
.br-row { display: grid; grid-template-columns: 78px 1fr auto; align-items: center; gap: 10px; }
.br-tag { font-size: 11px; color: var(--trv-text-dim); }
.br-track { height: 11px; border-radius: 6px; background: var(--trv-panel); border: 1px solid var(--trv-border); overflow: hidden; }
.br-track.ghost { background: repeating-linear-gradient(90deg, var(--trv-panel) 0 6px, transparent 6px 12px); }
.br-bar { display: block; height: 100%; width: 0; border-radius: 6px; transition: width 0.85s var(--trv-spring); }
.br-bar.req { background: linear-gradient(90deg, #fcd34d, #fbbf24); }
.br-bar.app { background: linear-gradient(90deg, #34d399, #60d394); }
.br-bar.rel { background: linear-gradient(90deg, #fb923c, #ea580c); }
.br-bar.recb { background: linear-gradient(90deg, #c084fc, #a855f7); }
.br-bar.capb { background: linear-gradient(90deg, var(--trv-border-strong), var(--trv-text-dim)); opacity: 0.7; }
.br-row b { font-size: 11.5px; color: var(--trv-text); min-width: 64px; text-align: right; }
.br-row.cap b { color: var(--trv-text-muted); }

.ad-purpose { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--trv-text-secondary); }
.ad-note-text { display: flex; align-items: flex-start; gap: 7px; margin: 10px 0 0; padding: 9px 11px; border-radius: 9px; font-size: 12px; line-height: 1.5; color: var(--trv-text-secondary); background: var(--trv-panel); }
.ad-note-text svg { color: var(--trv-amber); flex-shrink: 0; margin-top: 2px; }
.ad-note { display: flex; align-items: center; gap: 7px; margin-top: 11px; padding: 9px 11px; border-radius: 9px; font-size: 11.5px; line-height: 1.45; }
.ad-note b { color: var(--trv-text); }
.ad-note.warn { color: var(--trv-st-returned); background: var(--trv-st-returned-soft); }
.ad-note.info { color: var(--trv-ember); background: rgba(251,146,60,0.1); }
.ad-note.cap { color: var(--trv-text-muted); background: var(--trv-panel); }
.ad-note.cap b { color: var(--trv-amber-bright); }
.ad-note.danger { color: var(--trv-st-rejected); background: var(--trv-st-rejected-soft); }

/* money map */
.mm { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.mm-tile { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 13px; text-align: left;
  background: var(--trv-panel); border: 1px solid var(--trv-border); cursor: pointer; overflow: hidden; transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; }
.mm-tile::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c); opacity: 0.55; }
button.mm-tile:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--c) 45%, transparent); box-shadow: 0 8px 20px rgba(0,0,0,0.22); }
button.mm-tile:not(.on) { opacity: 0.62; cursor: pointer; }
button.mm-tile:not(.on):hover { opacity: 0.85; }
.mm-tile.current { background: linear-gradient(150deg, color-mix(in srgb, var(--c) 12%, var(--trv-panel)), var(--trv-panel)); border-color: color-mix(in srgb, var(--c) 34%, transparent); }
.mm-top { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 650; color: var(--trv-text-secondary); }
.mm-top svg:first-child { color: var(--c); }
.mm-go { margin-left: auto; color: var(--trv-text-dim); transition: transform 0.2s, color 0.2s; }
button.mm-tile:hover .mm-go { color: var(--c); transform: translate(2px, -2px); }
.mm-here { font-style: normal; font-size: 8.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-left: auto; padding: 2px 6px; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
.mm-amt { font-size: 17px; font-weight: 820; color: var(--trv-text); letter-spacing: -0.01em; }
.mm-sub { font-size: 10px; color: var(--trv-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* timeline */
.ad-tl { list-style: none; margin: 0; padding: 0 0 0 4px; }
.ad-tl li { position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 0 0 14px 14px; border-left: 1.5px solid var(--trv-border); }
.ad-tl li:last-child { border-left-color: transparent; padding-bottom: 0; }
.tl-dot { position: absolute; left: -7px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--trv-panel); border: 2px solid var(--trv-border-strong); transition: background 0.4s, border-color 0.4s; }
.ad-tl li.future { opacity: 0.45; }
.ad-tl li.bad .tl-dot { background: var(--trv-st-rejected); border-color: var(--trv-st-rejected); }
.tl-c { display: flex; flex-direction: column; gap: 1px; }
.tl-lab { font-size: 12.5px; font-weight: 650; color: var(--trv-text); }
.tl-when { font-size: 10.5px; color: var(--trv-text-dim); }
.tl-extra { font-size: 10.5px; color: var(--trv-amber); margin-top: 1px; }

/* footer */
.ad-foot { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 13px 18px; border-top: 1px solid var(--trv-border); background: var(--trv-surface-glass); backdrop-filter: blur(12px); flex-wrap: wrap; z-index: 2; }
.ad-links { display: flex; gap: 6px; }
.lk { display: inline-flex; padding: 8px; border-radius: 9px; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); cursor: pointer; transition: color 0.2s, border-color 0.2s; }
.lk:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.ad-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer; border: 1px solid transparent; background: none; }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn.ghost { border: 1px solid var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.ghost.danger:hover { border-color: color-mix(in srgb, var(--trv-st-rejected) 40%, transparent); color: var(--trv-st-rejected); }

[data-theme="light"] .ad-overlay { background: rgba(60,40,15,0.3); }
[data-theme="light"] .ad-hero { background: linear-gradient(150deg, var(--trv-surface), var(--trv-panel)); }
@media (prefers-reduced-motion: reduce) { .ad-aura, .rg-fill.over { animation: none; } .br-bar, .rg-fill, .mm-tile { transition: none; } .spin { animation: none; } }
</style>
