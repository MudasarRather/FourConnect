<template>
  <div class="nsp">
    <div v-if="loading" class="nsp-load"><Loader2 :size="16" class="spin" /> Reading attendance &amp; leave…</div>
    <div v-else-if="err" class="nsp-err"><CircleAlert :size="14" /> {{ err }}</div>

    <template v-else-if="data">
      <!-- ── 0 · when notice actually began (date + time + working-hours check) ── -->
      <div v-if="start.started_at" class="nsp-start" :class="start.in_working_hours ? 'ok' : 'warn'">
        <Clock :size="13" />
        <span class="nst-t">Notice began <b>{{ startLabel }}</b></span>
        <span class="nst-hrs">{{ start.in_working_hours ? 'within working hours' : 'outside working hours' }}</span>
      </div>

      <!-- ── 1 · Serving status (attendance during notice) ── -->
      <section class="nsp-sec">
        <header class="nsp-h">
          <span class="nsp-h-l"><Activity :size="13" /> Serving status</span>
          <span class="nsp-verdict" :class="verdict.tone"><component :is="verdict.icon" :size="11" /> {{ verdict.label }}</span>
        </header>

        <div v-if="att" class="serve-bar" :title="`${servedTotal} day(s) accounted since notice began`">
          <span v-for="seg in segments" :key="seg.key" v-show="seg.v > 0" class="seg" :class="seg.key"
            :style="{ width: seg.pct + '%' }" :title="`${seg.label}: ${seg.v}`" />
        </div>

        <div v-if="att" class="serve-chips">
          <span class="sc"><UserCheck :size="12" /> <b>{{ fmtNum(att.present_days) }}</b> present</span>
          <span class="sc"><Umbrella :size="12" /> <b>{{ fmtNum(att.leave_days) }}</b> on leave</span>
          <span class="sc" :class="{ bad: att.absent_days }"><UserX :size="12" /> <b>{{ att.absent_days }}</b> absent</span>
          <span class="sc" :class="{ warn: att.lwp_days }"><CalendarX :size="12" /> <b>{{ att.lwp_days }}</b> LWP</span>
          <span v-if="att.no_record_days" class="sc warn"><CircleAlert :size="12" /> <b>{{ att.no_record_days }}</b> no record</span>
          <span v-if="att.lop_days > 0" class="sc bad"><TrendingDown :size="12" /> <b>{{ fmtNum(att.lop_days) }}</b> LOP days</span>
        </div>
        <p v-else class="nsp-note"><CircleAlert :size="12" /> Notice hasn't started yet — no serving window to track.</p>
      </section>

      <!-- ── 2 · Leave cover ── -->
      <section class="nsp-sec">
        <header class="nsp-h"><span class="nsp-h-l"><Wallet :size="13" /> Leave cover available</span>
          <span class="nsp-total ex-mono">{{ fmtNum(leave.total_paid) }}d</span></header>
        <div class="leave-chips" v-if="leaveTypes.length">
          <span v-for="lt in leaveTypes" :key="lt.k" class="lv"><i :class="'lv-'+lt.k.toLowerCase()" /> {{ lt.k }} <b>{{ fmtNum(lt.v) }}</b></span>
        </div>
        <p class="nsp-note" :class="{ bad: leave.total_paid <= 0 }">
          <component :is="leave.total_paid > 0 ? Umbrella : CircleAlert" :size="12" />
          {{ leave.total_paid > 0
            ? 'Approved leave during notice draws from this; anything beyond it is loss-of-pay (LOP).'
            : 'No paid-leave balance — every absent day in notice becomes loss-of-pay (LOP).' }}
        </p>
      </section>

      <!-- ── 3 · Projected final-settlement impact ── -->
      <section class="nsp-sec">
        <header class="nsp-h"><span class="nsp-h-l"><Scale :size="13" /> Projected settlement impact</span></header>
        <div class="impact">
          <div class="imp add">
            <span class="imp-l"><Coins :size="12" /> Leave encashment</span>
            <span class="imp-v">+{{ fmtINR(proj.leave_encashment) }}<i v-if="proj.leave_encashment_days"> · {{ fmtNum(proj.leave_encashment_days) }}d</i></span>
          </div>
          <div class="imp sub" v-if="proj.lop_amount_so_far > 0">
            <span class="imp-l"><TrendingDown :size="12" /> Lost pay so far<i> · {{ fmtNum(proj.lop_days_so_far) }}d</i></span>
            <span class="imp-v">−{{ fmtINR(proj.lop_amount_so_far) }}</span>
          </div>
          <div class="imp sub" v-if="proj.notice_recovery > 0">
            <span class="imp-l"><CalendarX :size="12" /> Notice shortfall recovery<i v-if="m.shortfall_days"> · {{ m.shortfall_days }}d</i></span>
            <span class="imp-v">−{{ fmtINR(proj.notice_recovery) }}</span>
          </div>
          <div v-if="!proj.lop_amount_so_far && !proj.notice_recovery" class="imp ok">
            <span class="imp-l"><UserCheck :size="12" /> Serving clean — no recoveries projected</span>
          </div>
        </div>
        <button class="nsp-go" type="button" @click="$emit('go', { tab: 'settlement' })">
          <Scale :size="13" /> Open final settlement <ArrowUpRight :size="12" />
        </button>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Activity, UserCheck, UserX, Umbrella, CalendarX, Wallet, Coins,
  TrendingDown, Scale, ArrowUpRight, CircleAlert, Loader2, Clock,
} from 'lucide-vue-next'
import { fetchNoticeServing, fmtINR, fmtDate, errText } from '@/composables/useExit'

const props = defineProps({ caseId: { type: String, required: true } })
defineEmits(['go'])

const loading = ref(false)
const err = ref('')
const data = ref(null)

const load = async () => {
  loading.value = true; err.value = ''
  try { data.value = await fetchNoticeServing(props.caseId) }
  catch (e) { err.value = errText(e, 'Could not load serving telemetry') }
  finally { loading.value = false }
}
onMounted(load)

const m = computed(() => data.value?.metrics || {})
const start = computed(() => data.value?.start || {})
const startLabel = computed(() => {
  const s = start.value
  if (!s.started_at) return ''
  return `${fmtDate(s.started_at)}${s.time_label ? ' · ' + s.time_label : ''}`
})
const att = computed(() => data.value?.attendance || null)
const leave = computed(() => data.value?.leave || { by_type: {}, total_paid: 0, encashable_earned: 0 })
const proj = computed(() => data.value?.projection || {})

const fmtNum = (n) => {
  const v = Number(n || 0)
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

const leaveTypes = computed(() => Object.entries(leave.value.by_type || {}).map(([k, v]) => ({ k, v })))

const servedTotal = computed(() => {
  const a = att.value
  if (!a) return 0
  return (a.present_days || 0) + (a.leave_days || 0) + (a.rest_days || 0) + (a.absent_days || 0) + (a.lwp_days || 0) + (a.no_record_days || 0)
})
const segments = computed(() => {
  const a = att.value
  const tot = servedTotal.value || 1
  if (!a) return []
  const defs = [
    { key: 'present', label: 'Present', v: a.present_days || 0 },
    { key: 'leave', label: 'On leave', v: a.leave_days || 0 },
    { key: 'rest', label: 'Holiday / week-off', v: a.rest_days || 0 },
    { key: 'lwp', label: 'LWP', v: a.lwp_days || 0 },
    { key: 'absent', label: 'Absent', v: a.absent_days || 0 },
    { key: 'norec', label: 'No record', v: a.no_record_days || 0 },
  ]
  return defs.map(d => ({ ...d, pct: (d.v / tot) * 100 }))
})

const verdict = computed(() => {
  if (m.value.not_started) return { tone: 'neutral', icon: CircleAlert, label: 'Not started' }
  const a = att.value
  if (!a) return { tone: 'neutral', icon: CircleAlert, label: 'No window' }
  const gaps = (a.absent_days || 0) + (a.lwp_days || 0) + (a.no_record_days || 0)
  if (gaps > 0) return { tone: 'warn', icon: UserX, label: 'Attendance gaps' }
  return { tone: 'ok', icon: UserCheck, label: 'Actively serving' }
})
</script>

<style scoped>
.nsp { display: flex; flex-direction: column; gap: 12px; padding: 13px 14px; border-radius: 14px;
  background: var(--ex-panel); border: 1px solid var(--ex-border); animation: nsp-in 0.4s var(--ex-spring); }
.nsp-load, .nsp-err { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--ex-text-muted); padding: 6px 2px; }
.nsp-err { color: var(--ex-blocked); }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

.nsp-start { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 11px; border-radius: 11px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); }
.nsp-start svg { color: var(--ex-violet); flex-shrink: 0; }
.nst-t { font-size: 12px; color: var(--ex-text-secondary); }
.nst-t b { color: var(--ex-text); font-weight: 800; }
.nst-hrs { margin-left: auto; font-size: 10px; font-weight: 800; padding: 2px 9px; border-radius: 999px; }
.nsp-start.ok .nst-hrs { color: var(--ex-cleared); background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.nsp-start.warn .nst-hrs { color: var(--ex-amber); background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.nsp-start.warn svg { color: var(--ex-amber); }

.nsp-sec { display: flex; flex-direction: column; gap: 8px; }
.nsp-sec + .nsp-sec { padding-top: 12px; border-top: 1px dashed var(--ex-border); }
.nsp-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.nsp-h-l { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ex-text-muted); }
.nsp-h-l svg { color: var(--ex-violet); }
.nsp-total { font-size: 12.5px; font-weight: 850; color: var(--ex-text); }
.nsp-verdict { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 999px; }
.nsp-verdict.ok { color: var(--ex-cleared); background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.nsp-verdict.warn { color: var(--ex-amber); background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.nsp-verdict.neutral { color: var(--ex-text-muted); background: var(--ex-steel-soft); border: 1px solid var(--ex-border); }

/* attendance stacked bar */
.serve-bar { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: var(--ex-steel-soft); border: 1px solid var(--ex-border); }
.serve-bar .seg { height: 100%; transition: width 0.7s var(--ex-spring); }
.seg.present { background: linear-gradient(180deg, #6ee7b7, #34d399); }
.seg.leave { background: linear-gradient(180deg, #c4b5fd, #a78bfa); }
.seg.rest { background: var(--ex-steel); }
.seg.lwp { background: linear-gradient(180deg, #fcd34d, #f59e0b); }
.seg.absent { background: linear-gradient(180deg, #f87171, #ef4444); }
.seg.norec { background: repeating-linear-gradient(45deg, var(--ex-steel-dim), var(--ex-steel-dim) 3px, transparent 3px, transparent 6px); }
.serve-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.sc { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--ex-text-secondary); padding: 3px 9px; border-radius: 999px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.sc svg { color: var(--ex-text-muted); }
.sc b { color: var(--ex-text); font-family: var(--ex-mono); }
.sc.warn { color: var(--ex-amber); } .sc.warn svg, .sc.warn b { color: var(--ex-amber); }
.sc.bad { color: var(--ex-blocked); } .sc.bad svg, .sc.bad b { color: var(--ex-blocked); }

/* leave cover */
.leave-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.lv { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: var(--ex-text-secondary); padding: 3px 9px; border-radius: 999px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.lv b { color: var(--ex-text); font-family: var(--ex-mono); }
.lv i { width: 8px; height: 8px; border-radius: 50%; }
.lv-earned { background: #34d399; } .lv-casual { background: #a78bfa; } .lv-sick { background: #fb923c; }

.nsp-note { display: flex; align-items: flex-start; gap: 6px; font-size: 11px; line-height: 1.45; color: var(--ex-text-muted); margin: 0; }
.nsp-note svg { color: var(--ex-violet); flex-shrink: 0; margin-top: 1px; }
.nsp-note.bad { color: var(--ex-blocked); } .nsp-note.bad svg { color: var(--ex-blocked); }

/* settlement impact */
.impact { display: flex; flex-direction: column; gap: 5px; }
.imp { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 11px; border-radius: 10px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.imp-l { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ex-text-secondary); }
.imp-l i { font-style: normal; color: var(--ex-text-dim); }
.imp-l svg { color: var(--ex-text-muted); }
.imp-v { font-size: 12.5px; font-weight: 800; font-family: var(--ex-mono); white-space: nowrap; }
.imp.add .imp-v { color: var(--ex-cleared); } .imp.add .imp-l svg { color: var(--ex-cleared); }
.imp.sub .imp-v { color: var(--ex-blocked); } .imp.sub .imp-l svg { color: var(--ex-blocked); }
.imp.ok { background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 26%, transparent); }
.imp.ok .imp-l, .imp.ok .imp-l svg { color: var(--ex-cleared); }

.nsp-go { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; font-size: 12px; font-weight: 750; cursor: pointer;
  padding: 7px 13px; border-radius: 10px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); color: var(--ex-text); transition: all 0.2s; }
.nsp-go:hover { border-color: var(--ex-violet-border); color: var(--ex-violet); }
.nsp-go svg:first-child { color: var(--ex-violet); }

@keyframes nsp-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .nsp { animation: none; } .serve-bar .seg { transition: none; } .spin { animation: none; } }
</style>
