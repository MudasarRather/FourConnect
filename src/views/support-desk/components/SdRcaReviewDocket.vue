<template>
  <!-- ═══ REVIEW DOCKET — the settlement blotter. Terminal-book lines, click expands
       to the FULL RECORD (contract per position); verdict verbs live inside the
       expansion via SdRcaReviewVerbs. SETTLE flashes emerald, BOUNCE shakes red. ═══ -->
  <section class="dkt sd-card">
    <header class="dkt-bar">
      <span class="dkt-name sd-mono">REVIEW DOCKET — FULL CONTRACT PER POSITION</span>
      <span class="dkt-note sd-mono">EVERY VERDICT PRINTS TO THE TAPE</span>
    </header>

    <div class="dk-head sd-mono">
      <span />
      <span>POS</span><span>SEV</span><span>INSTRUMENT</span><span class="h-desk">DESK</span>
      <span class="h-by">FILED BY</span><span class="h-at">FILED AT</span><span>T-CLOCK</span><span>STATE</span>
    </div>

    <!-- skeleton book lines -->
    <div v-if="loading && !rows.length" class="dk-skel" aria-hidden="true">
      <div v-for="n in 6" :key="n" class="skel-line" :style="{ '--i': n }">
        <span class="sk sk-a" /><span class="sk sk-b" /><span class="sk sk-c" /><span class="sk sk-d" />
      </div>
    </div>

    <!-- empty blotter -->
    <p v-else-if="!rows.length" class="dk-empty sd-mono">
      <CircleCheck :size="14" aria-hidden="true" /> THE BLOTTER IS CLEAR — NO POSITIONS IN THIS STATE.
    </p>

    <TransitionGroup v-else name="dk-deal" tag="div" class="dk-body">
      <div v-for="(r, i) in rows" :key="r.ticket_id" class="dk-row"
        :class="{ open: expandedId === String(r.ticket_id), 'flash-ok': flashOk.has(String(r.ticket_id)), 'flash-bad': flashBad.has(String(r.ticket_id)) }"
        :style="{ '--i': Math.min(i, 9) }">
        <button class="dk-line" type="button" @click="toggle(r)">
          <span class="dk-caret" aria-hidden="true">▶</span>
          <span class="dk-num sd-mono">{{ r.ticket_number }}</span>
          <span><SdIncSevBadge :sev="r.sev" /></span>
          <span class="dk-sub">{{ r.subject }}</span>
          <span class="dk-desk h-desk">{{ r.team_name || 'UNROUTED' }}</span>
          <span class="dk-by h-by">{{ r.rca_filed_by_name || '—' }}</span>
          <span class="dk-at sd-mono h-at">{{ fmtAt(r.rca_filed_at) }}</span>
          <span class="dk-ttc sd-mono" :class="{ aged: agedPast48(r) }">{{ fmtElapsed(r) }}</span>
          <span class="dk-state">
            <SdRcaStatusStamp :row="r" :status="r.rca_status" sm :inherited="!!r.inherited" />
          </span>
        </button>

        <!-- 0fr → 1fr expansion: the FULL RECORD -->
        <div class="dk-fold" :class="{ open: expandedId === String(r.ticket_id) }">
          <div class="dk-fold-clip">
            <div class="dk-detail">
              <div class="dd-left">
                <div class="fld">
                  <p class="fld-k sd-mono">SUMMARY&gt;</p>
                  <p class="fld-v">{{ r.rca_summary_preview || '— nothing on file —' }}</p>
                </div>
                <div v-if="(r.rca_five_whys || []).length" class="fld">
                  <p class="fld-k sd-mono">FIVE-WHYS&gt; {{ r.rca_five_whys.length }} LINKS</p>
                  <div v-for="(w, wi) in r.rca_five_whys" :key="wi" class="why-line"
                    :class="{ root: wi === r.rca_five_whys.length - 1 }">
                    <code class="sd-mono">{{ wi === r.rca_five_whys.length - 1 ? 'ROOT' : `WHY${wi + 1}` }}</code>
                    <span>{{ w }}</span>
                  </div>
                </div>
              </div>
              <div class="dd-right">
                <div class="fld">
                  <p class="fld-k sd-mono">CONTRIBUTING FACTORS&gt;</p>
                  <div class="fac-chips">
                    <span v-for="(f, fi) in (r.rca_factors || [])" :key="fi">{{ f }}</span>
                    <span v-if="!(r.rca_factors || []).length" class="none">none cited</span>
                  </div>
                </div>
                <div class="fld ca-pair">
                  <div class="ca-cell">
                    <p class="fld-k sd-mono">CORRECTIVE&gt;</p>
                    <p class="ca-v" :class="{ miss: !r.rca_corrective }">{{ r.rca_corrective || 'missing' }}</p>
                  </div>
                  <div class="ca-cell">
                    <p class="fld-k sd-mono">PREVENTIVE&gt;</p>
                    <p class="ca-v" :class="{ miss: !r.rca_preventive }">{{ r.rca_preventive || 'missing' }}</p>
                  </div>
                </div>
                <div class="fld meta-chips">
                  <span v-if="r.rca_category" class="mchip sd-mono">CAUSE · {{ String(r.rca_category).replace(/_/g, ' ').toUpperCase() }}</span>
                  <span v-if="r.breach_reason" class="mchip warn sd-mono">BREACH · {{ String(r.breach_reason).replace(/_/g, ' ').toUpperCase() }}</span>
                  <span v-if="r.is_major_incident" class="mchip bad sd-mono">MAJOR INCIDENT</span>
                </div>
                <div v-if="r.rca_status === 'returned' && r.rca_review_note" class="fld bounce-note">
                  <b class="sd-mono">BOUNCED · {{ r.rca_reviewed_by_name || 'REVIEWER' }} · {{ fmtAt(r.rca_reviewed_at) }}</b>
                  <p>{{ r.rca_review_note }}</p>
                </div>
                <p v-else-if="r.rca_status === 'validated'" class="settled-line sd-mono">
                  ✓ SETTLED BY {{ (r.rca_reviewed_by_name || '—').toUpperCase() }} · {{ fmtAt(r.rca_reviewed_at) }}
                </p>
                <SdRcaReviewVerbs :row="r" :busy="busyId === r.ticket_id" :caps-ready="capsReady"
                  :can-review="canReview(r)" :me-id="meId" :can-self-validate="canSelfValidate"
                  @validate="$emit('validate', r)" @return="$emit('return', r)" @open="$emit('open', r.ticket_id)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </section>
</template>

<script setup>
/*
  SdRcaReviewDocket — the Clearinghouse settlement blotter (default lens 'pending').
  Dumb by design: rows in, verdict intents out ('validate' | 'return' | 'open' with the
  full row / ticket_id). The section owns the API; SdRcaReviewVerbs owns eligibility
  (renders nothing until capsReady && canReview && status === 'filed'; four-eyes
  disables validate on the reviewer's own filing).
*/
import { ref, watch } from 'vue'
import { CircleCheck } from 'lucide-vue-next'
import SdIncSevBadge from './SdIncSevBadge.vue'
import SdRcaStatusStamp from './SdRcaStatusStamp.vue'
import SdRcaReviewVerbs from './SdRcaReviewVerbs.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  busyId: { type: [String, Number], default: null },
  capsReady: { type: Boolean, default: false },
  canReview: { type: Function, default: () => false },
  meId: { type: [String, Number], default: null },
  // superuser → may validate own filing (backend four-eyes exemption)
  canSelfValidate: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})
defineEmits(['validate', 'return', 'open'])

const WARN_MS = 48 * 3600 * 1000

/* ── expansion ── */
const expandedId = ref(null)
const toggle = (r) => {
  const id = String(r.ticket_id)
  expandedId.value = expandedId.value === id ? null : id
}

/* ── clocks ── */
const pad2 = (n) => String(n).padStart(2, '0')
const fmtAt = (iso) => {
  const d = new Date(iso || '')
  if (Number.isNaN(d.getTime())) return '—'
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
const elapsedMs = (r) => {
  const filed = new Date(r.rca_filed_at || '').getTime()
  return Number.isNaN(filed) ? null : Math.max(0, props.now - filed)
}
const agedPast48 = (r) => {
  const e = elapsedMs(r)
  return e != null && e > WARN_MS
}
const fmtElapsed = (r) => {
  const e = elapsedMs(r)
  if (e == null) return '—'
  const totalMin = Math.floor(e / 60000)
  const d = Math.floor(totalMin / 1440); const h = Math.floor((totalMin % 1440) / 60); const m = totalMin % 60
  return d > 0 ? `T+${d}d ${pad2(h)}h` : `T+${pad2(h)}:${pad2(m)}`
}

/* ── SETTLE flash / BOUNCE shake — watch each row's rca_status flip ── */
const flashOk = ref(new Set())
const flashBad = ref(new Set())
const prevStatus = new Map()
let seeded = false
const timers = []
const flash = (set, id) => {
  set.value = new Set([...set.value, id])
  timers.push(setTimeout(() => {
    const next = new Set(set.value); next.delete(id); set.value = next
  }, 950))
}
watch(() => props.rows.map((r) => `${r.ticket_id}:${r.rca_status}`).join('|'), () => {
  for (const r of props.rows) {
    const id = String(r.ticket_id)
    const was = prevStatus.get(id)
    if (seeded && was && was !== r.rca_status) {
      if (r.rca_status === 'validated') flash(flashOk, id)
      else if (r.rca_status === 'returned') flash(flashBad, id)
    }
    prevStatus.set(id, r.rca_status)
  }
  seeded = true
}, { immediate: true })
</script>

<style scoped>
.dkt { border-radius: 18px; overflow: hidden; padding: 0;
  background: var(--sd-surface); border: 1px solid var(--sd-border); }
.dkt-bar { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap;
  gap: 8px; padding: 13px 16px 11px; border-bottom: 1px solid var(--sd-rcg-brd); }
.dkt-name { font-size: 10.5px; letter-spacing: 0.26em; font-weight: 700; color: var(--sd-rcg-core); }
.dkt-note { font-size: 8.5px; letter-spacing: 0.12em; color: var(--sd-text-muted); }

/* book grid */
.dk-head, .dk-line { display: grid;
  grid-template-columns: 22px 92px 58px minmax(160px, 1.5fr) minmax(90px, 0.9fr) 110px 92px 78px 112px;
  gap: 10px; align-items: center; padding: 0 14px; }
.dk-head { height: 30px; font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--sd-text-muted); border-bottom: 1px solid var(--sd-border);
  background: var(--sd-rcg-soft); }
.dk-body { display: flex; flex-direction: column; }
.dk-row { border-bottom: 1px solid var(--sd-border); }
.dk-line { width: 100%; min-height: 44px; text-align: left; cursor: pointer; font-size: 11px;
  background: transparent; border: none; transition: background 0.15s ease; }
.dk-row:hover .dk-line { background: var(--sd-rcg-soft); }
.dk-row.open .dk-line { background: color-mix(in srgb, var(--sd-rcg-core) 10%, transparent); }
.dk-caret { color: var(--sd-rcg-core); font-size: 9px; display: inline-block; transition: transform 0.3s var(--sd-spring); }
.dk-row.open .dk-caret { transform: rotate(90deg); }
.dk-num { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; color: var(--sd-rcg-core);
  font-variant-numeric: tabular-nums; }
.dk-sub { min-width: 0; font-size: 12.5px; font-weight: 700; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dk-desk, .dk-by { font-size: 10.5px; color: var(--sd-text-muted); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.dk-at { font-size: 10px; color: var(--sd-text-secondary); font-variant-numeric: tabular-nums; }
.dk-ttc { font-size: 10.5px; color: var(--sd-text-secondary); font-variant-numeric: tabular-nums; }
.dk-ttc.aged { color: var(--sd-rcg-bounce); font-weight: 800; }
.dk-state { display: flex; justify-content: flex-start; }

/* verdict flashes */
.dk-row.flash-ok .dk-line { animation: dk-flash-ok 0.9s ease; }
@keyframes dk-flash-ok { 0% { background: var(--sd-rcg-settle-soft); box-shadow: inset 3px 0 0 var(--sd-rcg-settle); } 100% { background: transparent; } }
.dk-row.flash-bad .dk-line { animation: dk-flash-bad 0.9s ease; }
@keyframes dk-flash-bad {
  0% { background: var(--sd-rcg-bounce-soft); transform: translateX(0); }
  20% { transform: translateX(-5px); } 40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); } 80% { transform: translateX(2px); }
  100% { background: transparent; transform: translateX(0); } }

/* 0fr → 1fr fold */
.dk-fold { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.45s var(--sd-spring); }
.dk-fold.open { grid-template-rows: 1fr; }
.dk-fold-clip { overflow: hidden; }
.dk-detail { display: grid; grid-template-columns: 1.25fr 1fr; gap: 22px; padding: 16px 20px 20px;
  background: color-mix(in srgb, var(--sd-rcg-deep) 7%, transparent);
  border-top: 1px dashed var(--sd-rcg-brd); }
.fld { margin-bottom: 13px; }
.fld-k { margin: 0 0 6px; font-size: 8.5px; letter-spacing: 0.26em; color: var(--sd-rcg-core); font-weight: 700; }
.fld-v { margin: 0; font-size: 12px; line-height: 1.65; color: var(--sd-text); }
.why-line { display: flex; gap: 10px; padding: 4px 0; font-size: 11.5px; color: var(--sd-text); }
.why-line code { color: var(--sd-rcg-core); font-size: 9px; letter-spacing: 0.1em; padding-top: 2px; min-width: 40px; }
.why-line.root code { color: var(--sd-rcg-bounce); font-weight: 800; }
.fac-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.fac-chips span { font-size: 10.5px; color: var(--sd-text); border: 1px solid var(--sd-border-strong, var(--sd-border));
  border-radius: 4px; padding: 4px 9px; }
.fac-chips .none { color: var(--sd-rcg-bounce); border-style: dashed; }
.ca-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.ca-cell { border: 1px solid var(--sd-border); border-radius: 6px; padding: 9px 11px;
  background: var(--sd-surface-elevated); }
.ca-v { margin: 0; font-size: 11px; line-height: 1.55; color: var(--sd-text); }
.ca-v.miss { color: var(--sd-rcg-bounce); font-style: italic; }
.meta-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.mchip { font-size: 8.5px; font-weight: 700; letter-spacing: 0.12em; padding: 4px 9px; border-radius: 4px;
  color: var(--sd-rcg-core); background: var(--sd-rcg-soft);
  border: 1px solid color-mix(in srgb, var(--sd-rcg-core) 35%, transparent); }
.mchip.warn { color: var(--sd-rcg-warn); background: var(--sd-rcg-warn-soft);
  border-color: color-mix(in srgb, var(--sd-rcg-warn) 35%, transparent); }
.mchip.bad { color: var(--sd-rcg-bounce); background: var(--sd-rcg-bounce-soft);
  border-color: color-mix(in srgb, var(--sd-rcg-bounce) 35%, transparent); }
.bounce-note { border: 1px dashed color-mix(in srgb, var(--sd-rcg-bounce) 50%, transparent);
  border-radius: 6px; background: var(--sd-rcg-bounce-soft); padding: 9px 12px; }
.bounce-note b { display: block; font-size: 8.5px; letter-spacing: 0.14em; color: var(--sd-rcg-bounce); margin-bottom: 4px; }
.bounce-note p { margin: 0; font-size: 11px; line-height: 1.6; color: var(--sd-text); }
.settled-line { margin: 0 0 12px; font-size: 9px; letter-spacing: 0.14em; color: var(--sd-rcg-settle); }

/* deal-in */
.dk-deal-enter-active { transition: all 0.45s var(--sd-spring); transition-delay: calc(var(--i) * 0.04s); }
.dk-deal-enter-from { opacity: 0; transform: translateX(-20px); }
.dk-deal-leave-active { transition: all 0.2s ease; opacity: 0; }
.dk-deal-move { transition: transform 0.4s var(--sd-spring); }

/* skeleton book lines */
.dk-skel { padding: 6px 14px 12px; }
.skel-line { display: grid; grid-template-columns: 92px 1fr 110px 112px; gap: 12px; align-items: center;
  height: 42px; border-bottom: 1px solid var(--sd-border); }
.sk { display: block; height: 10px; border-radius: 4px;
  background: linear-gradient(90deg, var(--sd-rcg-soft) 25%, color-mix(in srgb, var(--sd-rcg-core) 22%, transparent) 50%, var(--sd-rcg-soft) 75%);
  background-size: 200% 100%; animation: dk-shimmer 1.4s linear infinite; animation-delay: calc(var(--i) * 0.08s); }
@keyframes dk-shimmer { to { background-position: -200% 0; } }
.dk-empty { display: flex; align-items: center; gap: 8px; margin: 0; padding: 26px 16px;
  justify-content: center; font-size: 9.5px; letter-spacing: 0.2em; color: var(--sd-rcg-settle); }

@media (max-width: 980px) {
  .dk-head { display: none; }
  .dk-line { grid-template-columns: 22px 92px 1fr 78px 112px; min-height: auto; padding: 10px 14px; }
  .dk-line > :nth-child(3), .h-desk, .h-by, .h-at { display: none; }
  .dk-detail { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .dk-fold { transition: none; }
  html:not([data-cinematic="on"]) .dk-deal-enter-active,
  html:not([data-cinematic="on"]) .dk-deal-move { transition: none; }
  html:not([data-cinematic="on"]) .sk,
  html:not([data-cinematic="on"]) .dk-row.flash-ok .dk-line,
  html:not([data-cinematic="on"]) .dk-row.flash-bad .dk-line { animation: none !important; }
}
</style>
