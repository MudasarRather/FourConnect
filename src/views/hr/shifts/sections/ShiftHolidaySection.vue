<template>
  <section class="holx">
    <!-- ════════════════════ FESTIVE DECK ════════════════════ -->
    <Motion as="header" class="deck" :initial="{ opacity: 0, y: -14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }">
      <span class="deck-aurora" aria-hidden="true" />
      <span class="bokeh" aria-hidden="true">
        <span v-for="b in bokehs" :key="b.i" class="orb"
          :style="{ left: b.x + '%', top: b.y + '%', '--sz': b.s + 'px', '--d': b.d + 's', '--dl': b.dl + 's', '--o': b.o }" />
      </span>
      <span class="garland" aria-hidden="true">
        <span v-for="g in 16" :key="'g' + g" class="bulb" :style="{ '--gd': (1.8 + (g % 5) * 0.3) + 's', '--gdl': (g * 0.12) + 's' }" />
      </span>
      <span class="deck-vignette" aria-hidden="true" />

      <div class="deck-grid">
        <!-- spotlight: countdown to the selected holiday -->
        <div class="spotlight">
          <transition name="spot-swap" mode="out-in">
            <div v-if="selectedHoliday" :key="selectedHoliday.id" class="spot-card" :data-tone="awayTone">
              <span class="spot-ring" aria-hidden="true" />
              <span class="spot-type">{{ typeLabel(selectedHoliday.holiday_type) }}<span v-if="selectedHoliday.is_active === false" class="spot-draft">draft</span></span>
              <div class="spot-count">
                <span class="spot-num"><ShiftCountUp :value="Math.abs(away)" :duration="800" /></span>
                <span class="spot-unit">{{ awayUnit }}</span>
              </div>
              <span class="spot-when">{{ awayLabel }}</span>
              <h3 class="spot-name">{{ selectedHoliday.name }}</h3>
              <span class="spot-date">{{ longDate(selectedHoliday.date) }}</span>
              <div class="spot-foot">
                <span class="spot-staff"><Users :size="12" /> <b><ShiftCountUp :value="assignments.length" :duration="700" /></b> on duty</span>
              </div>
            </div>
            <div v-else key="empty" class="spot-card spot-empty">
              <Palmtree :size="28" />
              <p>No holiday selected</p>
            </div>
          </transition>
        </div>

        <!-- readout + KPIs -->
        <div class="deck-readout">
          <span class="eyebrow"><span class="eyebrow-dot" /> Holiday Operations · Essential staffing</span>
          <h2 class="deck-title">Holiday Roster Deck</h2>
          <p class="deck-sub">Who holds the line on holidays — assign essential staff and their compensation rule (double-pay, overtime, allowance or comp-off), mapped along the year.</p>

          <div class="deck-actions">
            <button class="btn-ghost" :class="{ spin: loading }" title="Refresh" @click="reload"><RefreshCw :size="14" /> Refresh</button>
            <button v-if="selectedHoliday" class="btn-primary" @click="showModal = true"><Plus :size="14" /> Assign staff</button>
          </div>

          <div class="kpi-ribbon">
            <Motion v-for="(k, i) in kpis" :key="k.key" as="div" class="kpi" :data-tone="k.tone"
              :initial="{ opacity: 0, y: 18, scale: 0.95 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
              :transition="{ duration: 0.5, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }" :whileHover="{ y: -4 }">
              <span class="kpi-spark" aria-hidden="true" />
              <div class="kpi-ic"><component :is="k.icon" :size="15" /></div>
              <div class="kpi-body">
                <div class="kpi-val"><ShiftCountUp :value="k.value" /></div>
                <div class="kpi-lbl">{{ k.label }}</div>
              </div>
            </Motion>
          </div>

          <p class="deck-note"><Info :size="11" /> Working a holiday posts double-pay to the payslip — a premium over the day's salary, per holiday actually worked. Comp-off is a leave credit, not cash.</p>
        </div>
      </div>
    </Motion>

    <!-- ════════════════════ HOLIDAY FILMSTRIP ════════════════════ -->
    <div v-if="holidaysSorted.length" class="rail-wrap">
      <button class="rail-nav" :disabled="!canScrollL" title="Earlier" @click="scrollRail(-1)"><ChevronLeft :size="16" /></button>
      <div class="rail" ref="railEl" @scroll="updateScroll">
        <Motion v-for="(h, i) in holidaysSorted" :key="h.id" as="button" type="button" class="hcard"
          :class="{ active: String(h.id) === String(selectedId), past: h.date < todayStr }"
          :data-id="h.id"
          :initial="{ opacity: 0, y: 18, scale: 0.94 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.45, delay: Math.min(i * 0.04, 0.5), ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -5 }" :whileTap="{ scale: 0.97 }" @click="select(h)">
          <span class="hc-glow" aria-hidden="true" />
          <span class="hc-top">
            <span class="hc-type" :data-t="h.holiday_type">{{ typeLabel(h.holiday_type) }}</span>
            <span v-if="staffCount(h.id)" class="hc-badge"><Users :size="9" />{{ staffCount(h.id) }}</span>
          </span>
          <div class="hc-date">
            <span class="hc-day">{{ dayNum(h.date) }}</span>
            <span class="hc-mon">{{ monLabel(h.date) }}</span>
          </div>
          <span class="hc-dow">{{ dowLabel(h.date) }}</span>
          <span class="hc-name">{{ h.name }}</span>
          <span class="hc-away" :data-state="h.date < todayStr ? 'past' : (h.date === todayStr ? 'today' : 'soon')">
            {{ shortAway(h.date) }}
          </span>
        </Motion>
      </div>
      <button class="rail-nav" :disabled="!canScrollR" title="Later" @click="scrollRail(1)"><ChevronRight :size="16" /></button>
    </div>

    <!-- ════════════════════ SELECTED HOLIDAY DETAIL ════════════════════ -->
    <transition name="detail-swap" mode="out-in">
      <div v-if="selectedHoliday" :key="selectedHoliday.id" class="detail">
        <!-- comp-mix meter -->
        <Motion as="div" class="panel mix" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
          <header class="panel-head">
            <span class="ph-ic"><Sparkles :size="14" /></span>
            <h3>Compensation mix</h3>
            <span class="ph-meta">{{ assignments.length }} assigned</span>
          </header>
          <div v-if="assignments.length" class="mix-bar">
            <span v-for="c in compMix" :key="c.key" class="mix-seg" :style="{ width: (mounted ? c.frac * 100 : 0) + '%', background: c.color }" :title="`${c.label}: ${c.count}`" />
          </div>
          <div v-if="assignments.length" class="mix-legend">
            <span v-for="c in compMix" :key="c.key" class="ml-item">
              <span class="ml-dot" :style="{ background: c.color }" /><b>{{ c.count }}</b> {{ c.label }}
            </span>
          </div>
          <p v-else class="mix-empty">No one assigned yet — the mix appears once staff are added.</p>
        </Motion>

        <!-- crew roster -->
        <div v-if="assignments.length" class="crew">
          <Motion v-for="(a, i) in assignments" :key="a.id" as="article" class="ccard"
            :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.42, delay: Math.min(i * 0.045, 0.5), ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ y: -4 }">
            <span class="cc-sweep" aria-hidden="true" />
            <div class="cc-top">
              <span class="cc-av" :style="{ '--c': compVis(a.compensation).color }">{{ initials(a.employee_name) }}</span>
              <div class="cc-id">
                <b>{{ a.employee_name || 'Employee' }}</b>
                <small>{{ a.shift_name || a.shift_code || 'Any shift' }}</small>
              </div>
              <button class="cc-rm" :disabled="removing === a.id" title="Stand down" @click="askRemove(a)">
                <Loader2 v-if="removing === a.id" :size="13" class="spin" /><X v-else :size="13" />
              </button>
            </div>
            <div class="cc-foot">
              <span class="cc-comp" :data-tone="compVis(a.compensation).tone">
                <component :is="compVis(a.compensation).icon" :size="11" />{{ compMeta(a.compensation).label }}
              </span>
              <span class="cc-dial" :style="{ '--c': compVis(a.compensation).color, '--frac': Math.min(1, (Number(a.pay_multiplier) || 1) / 3) }">
                <span class="cc-dial-num">{{ Number(a.pay_multiplier || 1).toFixed(a.pay_multiplier % 1 ? 2 : 1) }}×</span>
              </span>
            </div>
          </Motion>
        </div>

        <ShiftEmptyState v-else :icon="Palmtree" title="No one assigned yet"
          :sub="`Assign essential staff to work ${selectedHoliday.name}.`">
          <template #actions><button class="btn-primary" @click="showModal = true"><Plus :size="14" /> Assign staff</button></template>
        </ShiftEmptyState>
      </div>

      <ShiftEmptyState v-else-if="!loading" key="none" :icon="CalendarDays" title="No holidays yet"
        sub="Add holidays in Attendance · Holiday calendar first, then assign who works them here." />
    </transition>

    <ShiftHolidayAssignModal :open="showModal" :holiday="selectedHoliday" @close="showModal = false" @saved="onSaved" />
    <ShiftHolidayRemoveModal :open="showRemove" :assignment="removeTarget" :holiday="selectedHoliday" :busy="!!removing"
      @cancel="closeRemove" @confirm="confirmRemove" />
  </section>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import {
  Palmtree, RefreshCw, Plus, CalendarDays, X, Users, Sparkles,
  ChevronLeft, ChevronRight, Coins, Timer, Gift, CalendarOff, Info, Sun, Loader2,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftHolidayAssignModal from '../modals/ShiftHolidayAssignModal.vue'
import ShiftHolidayRemoveModal from '../modals/ShiftHolidayRemoveModal.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import ShiftCountUp from '../components/ShiftCountUp.vue'
import { fetchHolidays, fetchHolidayShifts, deleteHolidayShift, HOLIDAY_COMP_TYPES, compMeta } from '@/composables/useShifts'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()
const holidays = ref([])
const allAssign = ref([])
const selectedId = ref('')
const loading = ref(false)
const showModal = ref(false)
const showRemove = ref(false)
const removeTarget = ref(null)
const removing = ref(null)
const mounted = ref(false)
const railEl = ref(null)
const canScrollL = ref(false)
const canScrollR = ref(false)

/* ── comp-type visuals ── */
const COMP_VIS = {
  DOUBLE_PAY: { color: 'var(--shift-amber)', icon: Coins, tone: 'gold' },
  OVERTIME: { color: 'var(--shift-ember)', icon: Timer, tone: 'ember' },
  HOLIDAY_ALLOWANCE: { color: 'var(--shift-ok)', icon: Gift, tone: 'ok' },
  COMP_OFF: { color: 'var(--shift-text-muted)', icon: CalendarOff, tone: 'neutral' },
}
const compVis = (k) => COMP_VIS[k] || { color: 'var(--shift-amber)', icon: Coins, tone: 'gold' }
const TYPE_LABEL = { NATIONAL: 'National', COMPANY: 'Company', REGIONAL: 'Regional', RESTRICTED: 'Restricted' }
const typeLabel = (t) => TYPE_LABEL[t] || t || 'Holiday'

/* ── decorative bokeh ── */
const bokehs = ref([])
const buildBokeh = () => {
  const out = []
  for (let i = 0; i < 11; i++) out.push({
    i, x: +(Math.random() * 100).toFixed(1), y: +(Math.random() * 100).toFixed(1),
    s: Math.round(Math.random() * 90 + 40), d: +(Math.random() * 8 + 10).toFixed(1),
    dl: +(Math.random() * 6).toFixed(1), o: +(Math.random() * 0.22 + 0.08).toFixed(2),
  })
  bokehs.value = out
}

/* ── date helpers ── */
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayStr = iso(new Date())
const dDate = (s) => new Date(s + 'T00:00:00')
const dayNum = (s) => Number(s.split('-')[2])
const monLabel = (s) => dDate(s).toLocaleDateString(undefined, { month: 'short' })
const dowLabel = (s) => dDate(s).toLocaleDateString(undefined, { weekday: 'short' })
const longDate = (s) => dDate(s).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
const awayDays = (s) => Math.round((dDate(s) - dDate(todayStr)) / 86400000)
const shortAway = (s) => { const a = awayDays(s); return a === 0 ? 'Today' : a > 0 ? `in ${a}d` : `${-a}d ago` }

/* ── data shaping ── */
const holidaysSorted = computed(() => [...holidays.value].sort((a, b) => (a.date < b.date ? -1 : 1)))
const assignByHoliday = computed(() => {
  const m = {}
  for (const a of allAssign.value) (m[String(a.holiday_id)] ??= []).push(a)
  return m
})
const staffCount = (hid) => (assignByHoliday.value[String(hid)] || []).length
const selectedHoliday = computed(() => holidays.value.find(h => String(h.id) === String(selectedId.value)) || null)
const assignments = computed(() => assignByHoliday.value[String(selectedId.value)] || [])
const nextHoliday = computed(() => holidaysSorted.value.find(h => h.date >= todayStr) || holidaysSorted.value[holidaysSorted.value.length - 1] || null)

/* selected-holiday countdown */
const away = computed(() => selectedHoliday.value ? awayDays(selectedHoliday.value.date) : 0)
const awayUnit = computed(() => Math.abs(away.value) === 1 ? 'day' : 'days')
const awayLabel = computed(() => away.value === 0 ? 'happening today' : away.value > 0 ? 'until this holiday' : 'since this holiday')
const awayTone = computed(() => away.value < 0 ? 'past' : away.value <= 7 ? 'soon' : 'gold')

/* comp mix for the selected holiday */
const compMix = computed(() => {
  const total = assignments.value.length || 1
  return HOLIDAY_COMP_TYPES
    .map(c => ({ key: c.key, label: c.label, color: compVis(c.key).color, count: assignments.value.filter(a => a.compensation === c.key).length }))
    .filter(c => c.count > 0)
    .map(c => ({ ...c, frac: c.count / total }))
})

const kpis = computed(() => [
  { key: 'ahead', label: 'Holidays ahead', value: holidaysSorted.value.filter(h => h.date >= todayStr).length, icon: CalendarDays, tone: 'gold' },
  { key: 'duty', label: 'On duty (this holiday)', value: assignments.value.length, icon: Users, tone: 'ember' },
  { key: 'dbl', label: 'Double-pay', value: assignments.value.filter(a => a.compensation === 'DOUBLE_PAY').length, icon: Coins, tone: 'gold' },
  { key: 'total', label: 'Staffed across all', value: allAssign.value.length, icon: Sun, tone: 'ok' },
])

/* ── rail scroll ── */
const updateScroll = () => {
  const el = railEl.value
  if (!el) return
  canScrollL.value = el.scrollLeft > 4
  canScrollR.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}
const scrollRail = (dir) => railEl.value?.scrollBy({ left: dir * 340, behavior: 'smooth' })
const scrollToSelected = () => {
  const el = railEl.value?.querySelector('.hcard.active')
  el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  updateScroll()
}

/* ── data ── */
const reload = async () => {
  loading.value = true
  try {
    const [hol, asg] = await Promise.all([fetchHolidays({ limit: 200 }), fetchHolidayShifts({ limit: 200 })])
    holidays.value = hol || []
    allAssign.value = asg.items || []
    if (!selectedId.value || !holidays.value.find(h => String(h.id) === String(selectedId.value))) {
      selectedId.value = nextHoliday.value?.id || ''
    }
    await nextTick(); updateScroll(); scrollToSelected()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load holidays') }
  finally { loading.value = false }
}
const refetchAssign = async () => {
  try { const d = await fetchHolidayShifts({ limit: 200 }); allAssign.value = d.items || [] } catch { /* */ }
}
const select = (h) => { selectedId.value = h.id; nextTick(scrollToSelected) }
const onSaved = async () => { await refetchAssign(); emit('refresh-stats') }
const askRemove = (a) => { removeTarget.value = a; showRemove.value = true }
const closeRemove = () => { if (!removing.value) { showRemove.value = false; removeTarget.value = null } }
const confirmRemove = async ({ reason, reason_category }) => {
  const a = removeTarget.value
  if (!a) return
  removing.value = a.id
  try {
    await deleteHolidayShift(a.id, { reason, reason_category })
    toast.success(`${a.employee_name || 'Employee'} stood down`)
    showRemove.value = false
    removeTarget.value = null
    await refetchAssign(); emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not remove')
  } finally {
    removing.value = null
  }
}

onMounted(async () => {
  buildBokeh()
  await reload()
  await nextTick(); mounted.value = true
})
</script>

<style scoped>
.holx { display: flex; flex-direction: column; gap: 18px; }

/* ════════════════════ FESTIVE DECK ════════════════════ */
.deck { position: relative; overflow: hidden; border-radius: 26px; padding: 26px 30px;
  background:
    radial-gradient(120% 130% at 80% -10%, rgba(251,146,60,0.12), transparent 55%),
    radial-gradient(110% 120% at 12% 0%, rgba(251,191,36,0.10), transparent 50%),
    linear-gradient(165deg, #0d0e12 0%, #0a0b0f 60%, #08090c 100%);
  border: 1px solid var(--shift-border); }
.deck-aurora { position: absolute; left: -25%; right: -25%; top: -20%; height: 80%; pointer-events: none; opacity: 0.6;
  background: conic-gradient(from 140deg at 50% 50%, transparent, rgba(251,191,36,0.16), rgba(251,146,60,0.12), transparent 65%);
  filter: blur(46px); background-size: 200% 200%; animation: aurora-flow 24s ease-in-out infinite;
  mask-image: linear-gradient(180deg, #000, transparent 88%); }
@keyframes aurora-flow { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }

.bokeh { position: absolute; inset: 0; pointer-events: none; }
.orb { position: absolute; width: var(--sz); height: var(--sz); border-radius: 50%; opacity: var(--o);
  background: radial-gradient(circle at 38% 35%, rgba(253,230,138,0.9), rgba(251,146,60,0.35) 55%, transparent 72%);
  filter: blur(3px); animation: orb-drift var(--d) ease-in-out var(--dl) infinite; }
@keyframes orb-drift {
  0%,100% { transform: translate3d(0,0,0) scale(1); }
  50% { transform: translate3d(14px,-20px,0) scale(1.12); }
}

/* garland of holiday string-lights along the top edge */
.garland { position: absolute; left: 0; right: 0; top: 0; height: 22px; pointer-events: none;
  display: flex; justify-content: space-around; align-items: flex-start; padding: 0 24px;
  mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); }
.bulb { width: 5px; height: 5px; border-radius: 50%; margin-top: 6px; background: var(--shift-amber-bright);
  box-shadow: 0 0 8px var(--shift-amber), 0 0 2px var(--shift-amber-bright); animation: bulb-twinkle var(--gd, 2s) ease-in-out var(--gdl, 0s) infinite; }
@keyframes bulb-twinkle { 0%,100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
.deck-vignette { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(130% 120% at 50% 50%, transparent 56%, rgba(0,0,0,0.42)); }

.deck-grid { position: relative; z-index: 2; display: grid; grid-template-columns: 260px 1fr; align-items: stretch; gap: 30px; }

/* ── spotlight countdown ── */
.spotlight { display: grid; }
.spot-card { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; padding: 22px;
  border-radius: 20px; background: rgba(255,255,255,0.035); border: 1px solid var(--shift-border-soft); }
.spot-card[data-tone="soon"] { border-color: color-mix(in srgb, var(--shift-ember) 36%, transparent); }
.spot-card[data-tone="past"] { opacity: 0.82; }
.spot-ring { position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, rgba(251,191,36,0.20), transparent 68%); filter: blur(10px); animation: halo-breathe 5s ease-in-out infinite; }
@keyframes halo-breathe { 0%,100% { opacity: 0.55; transform: scale(0.94); } 50% { opacity: 1; transform: scale(1.06); } }
.spot-type { position: relative; display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; font-family: var(--shift-mono);
  font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--shift-amber-strong);
  background: rgba(251,191,36,0.12); border: 1px solid color-mix(in srgb, var(--shift-amber) 26%, transparent); padding: 3px 9px; border-radius: 999px; }
.spot-draft { color: var(--shift-text-dim); font-size: 8.5px; padding-left: 5px; border-left: 1px solid var(--shift-border-soft); margin-left: 2px; }
.spot-count { position: relative; display: flex; align-items: baseline; gap: 8px; margin-top: 14px; }
.spot-num { font-family: var(--shift-mono); font-size: 52px; font-weight: 900; line-height: 0.9; letter-spacing: -0.04em;
  background: linear-gradient(135deg, var(--shift-amber-bright), var(--shift-ember-strong));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.spot-unit { font-size: 14px; font-weight: 700; color: var(--shift-text-2); }
.spot-when { font-size: 11px; color: var(--shift-text-muted); }
.spot-name { margin: 12px 0 2px; font-size: 19px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.02em; line-height: 1.15; }
.spot-date { font-size: 11.5px; color: var(--shift-text-muted); font-family: var(--shift-mono); }
.spot-foot { margin-top: 13px; padding-top: 12px; border-top: 1px dashed var(--shift-border-soft); }
.spot-staff { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--shift-text-2); }
.spot-staff svg { color: var(--shift-amber); } .spot-staff b { color: var(--shift-text); font-family: var(--shift-mono); }
.spot-empty { align-items: center; justify-content: center; text-align: center; color: var(--shift-text-dim); gap: 10px; }
.spot-empty svg { color: var(--shift-amber); opacity: 0.6; }
.spot-empty p { margin: 0; font-size: 12.5px; }

/* ── readout ── */
.deck-readout { position: relative; min-width: 0; display: flex; flex-direction: column; }
.eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--shift-amber-strong); }
.eyebrow-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--shift-ok); animation: shift-ring-pulse 2.2s ease-out infinite; }
.deck-title { margin: 9px 0 5px; font-size: 30px; font-weight: 900; letter-spacing: -0.03em; line-height: 1.05;
  background: linear-gradient(135deg, var(--shift-amber-bright), var(--shift-amber) 45%, var(--shift-ember-strong));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.deck-sub { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); max-width: 560px; }
.deck-actions { display: flex; gap: 10px; margin: 15px 0 14px; }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 999px; cursor: pointer;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 12.5px; transition: 0.2s; }
.btn-ghost:hover { color: var(--shift-amber); border-color: var(--shift-border); }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }
.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 999px; border: none; cursor: pointer;
  background: var(--shift-grad-cta); color: #1f1408; font-weight: 800; font-size: 12.5px; box-shadow: 0 10px 24px -12px rgba(245,158,11,0.8); }

.kpi-ribbon { display: grid; grid-template-columns: repeat(4, 1fr); gap: 11px; margin-top: auto; }
.kpi { position: relative; overflow: hidden; display: flex; align-items: center; gap: 11px; padding: 13px 14px; border-radius: 15px;
  background: rgba(255,255,255,0.03); border: 1px solid var(--shift-border-soft); transition: border-color 0.25s; }
.kpi:hover { border-color: var(--shift-border); }
.kpi-spark { position: absolute; right: -28%; top: -55%; width: 78%; height: 210%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--tone-c) 24%, transparent), transparent 65%); opacity: 0.55; }
.kpi[data-tone="gold"] { --tone-c: var(--shift-amber); } .kpi[data-tone="ember"] { --tone-c: var(--shift-ember); } .kpi[data-tone="ok"] { --tone-c: var(--shift-ok); }
.kpi-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0;
  background: color-mix(in srgb, var(--tone-c) 15%, transparent); color: var(--tone-c); border: 1px solid color-mix(in srgb, var(--tone-c) 28%, transparent); }
.kpi-val { font-family: var(--shift-mono); font-size: 20px; font-weight: 800; color: var(--shift-text); line-height: 1.1; }
.kpi-lbl { margin-top: 2px; font-size: 10px; font-family: var(--shift-mono); text-transform: uppercase; letter-spacing: 0.05em; color: var(--shift-text-muted); }
.deck-note { display: inline-flex; align-items: center; gap: 6px; margin: 13px 0 0; font-size: 11px; color: var(--shift-text-muted);
  background: rgba(255,255,255,0.03); border: 1px solid var(--shift-border-soft); padding: 6px 11px; border-radius: 999px; align-self: flex-start; }
.deck-note svg { color: var(--shift-amber-strong); flex-shrink: 0; }

/* ════════════════════ FILMSTRIP ════════════════════ */
.rail-wrap { display: flex; align-items: stretch; gap: 10px; }
.rail-nav { flex-shrink: 0; width: 38px; border-radius: 14px; display: grid; place-items: center; cursor: pointer;
  background: var(--shift-surface); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: 0.2s; }
.rail-nav:hover:not(:disabled) { color: var(--shift-amber); border-color: var(--shift-border); }
.rail-nav:disabled { opacity: 0.3; cursor: default; }
.rail { flex: 1; min-width: 0; display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x proximity; padding: 4px 2px 12px; scrollbar-width: thin; }
.rail::-webkit-scrollbar { height: 6px; } .rail::-webkit-scrollbar-thumb { background: var(--shift-border-soft); border-radius: 3px; }
.hcard { position: relative; overflow: hidden; flex: 0 0 152px; scroll-snap-align: center; display: flex; flex-direction: column; gap: 4px;
  padding: 14px; border-radius: 16px; cursor: pointer; text-align: left;
  background: var(--shift-surface); border: 1px solid var(--shift-border-soft); transition: border-color 0.25s, box-shadow 0.3s; }
.hcard.past { opacity: 0.62; }
.hcard.active { border-color: var(--shift-amber); box-shadow: 0 0 0 2px color-mix(in srgb, var(--shift-amber) 38%, transparent), 0 16px 36px -18px var(--shift-amber); }
.hc-glow { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: var(--shift-grad-hero); transition: opacity 0.3s; }
.hcard.active .hc-glow { opacity: 1; }
.hcard > *:not(.hc-glow) { position: relative; z-index: 1; }
.hc-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.hc-type { font-family: var(--shift-mono); font-size: 8px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--shift-text-muted);
  background: rgba(255,255,255,0.05); border-radius: 5px; padding: 2px 6px; }
.hc-type[data-t="NATIONAL"] { color: var(--shift-amber); } .hc-type[data-t="RESTRICTED"] { color: var(--shift-text-dim); }
.hc-badge { display: inline-flex; align-items: center; gap: 3px; font-family: var(--shift-mono); font-size: 9px; font-weight: 700;
  color: var(--shift-amber); background: rgba(251,191,36,0.14); border-radius: 999px; padding: 2px 7px 2px 5px; }
.hc-date { display: flex; align-items: baseline; gap: 5px; margin-top: 6px; }
.hc-day { font-family: var(--shift-mono); font-size: 30px; font-weight: 900; color: var(--shift-text); line-height: 0.9; letter-spacing: -0.03em; }
.hcard.active .hc-day { color: var(--shift-amber); }
.hc-mon { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--shift-text-muted); }
.hc-dow { font-size: 10px; font-family: var(--shift-mono); text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-dim); }
.hc-name { font-size: 12.5px; font-weight: 600; color: var(--shift-text-2); line-height: 1.25; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; min-height: 31px; }
.hc-away { margin-top: auto; font-size: 9.5px; font-family: var(--shift-mono); text-transform: uppercase; letter-spacing: 0.05em; color: var(--shift-text-dim); }
.hc-away[data-state="today"] { color: var(--shift-ember-strong); } .hc-away[data-state="soon"] { color: var(--shift-amber-strong); }

/* ════════════════════ DETAIL ════════════════════ */
.detail { display: flex; flex-direction: column; gap: 16px; }
.panel { background: var(--shift-surface); border: 1px solid var(--shift-border-soft); border-radius: 20px; padding: 18px 20px;
  backdrop-filter: var(--shift-glass-blur); -webkit-backdrop-filter: var(--shift-glass-blur); }
.panel-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.ph-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: rgba(251,191,36,0.13); color: var(--shift-amber); }
.panel-head h3 { margin: 0; font-size: 14.5px; font-weight: 700; color: var(--shift-text); flex: 1; }
.ph-meta { font-family: var(--shift-mono); font-size: 10.5px; color: var(--shift-text-muted); }

.mix-bar { display: flex; height: 16px; border-radius: 999px; overflow: hidden; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.mix-seg { height: 100%; transition: width 0.9s var(--shift-ease); }
.mix-seg + .mix-seg { box-shadow: -1px 0 0 rgba(0,0,0,0.2); }
.mix-legend { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; }
.ml-item { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--shift-text-muted); }
.ml-item b { color: var(--shift-text); font-family: var(--shift-mono); }
.ml-dot { width: 9px; height: 9px; border-radius: 50%; }
.mix-empty { margin: 0; font-size: 12.5px; color: var(--shift-text-dim); }

.crew { display: grid; grid-template-columns: repeat(auto-fill, minmax(248px, 1fr)); gap: 12px; }
.ccard { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 15px;
  border-radius: 16px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); transition: border-color 0.25s;
  backdrop-filter: var(--shift-glass-blur); -webkit-backdrop-filter: var(--shift-glass-blur); }
.ccard:hover { border-color: var(--shift-border); }
.cc-sweep { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: linear-gradient(120deg, transparent 40%, rgba(251,191,36,0.10) 50%, transparent 60%); transition: opacity 0.3s; }
.ccard:hover .cc-sweep { opacity: 1; }
.cc-top { display: flex; align-items: center; gap: 11px; }
.cc-av { width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center;
  font-family: var(--shift-mono); font-size: 12px; font-weight: 800; color: #1f1408;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 88%, white), var(--c)); box-shadow: 0 0 12px -3px var(--c); }
.cc-id { min-width: 0; flex: 1; }
.cc-id b { display: block; font-size: 13px; color: var(--shift-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc-id small { font-size: 10.5px; color: var(--shift-text-muted); font-family: var(--shift-mono); }
.cc-rm { width: 26px; height: 26px; flex-shrink: 0; border-radius: 8px; display: grid; place-items: center; cursor: pointer;
  background: transparent; border: 1px solid var(--shift-border-soft); color: var(--shift-text-dim); transition: 0.18s; }
.cc-rm:hover { color: var(--shift-alert); border-color: var(--shift-alert-soft); background: var(--shift-alert-soft); }
.cc-rm:disabled { opacity: 0.6; cursor: default; }
.cc-rm .spin { animation: shift-spin 0.8s linear infinite; }
.cc-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.cc-comp { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 999px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); }
.cc-comp[data-tone="gold"] { color: var(--shift-amber); } .cc-comp[data-tone="ember"] { color: var(--shift-ember-strong); }
.cc-comp[data-tone="ok"] { color: var(--shift-ok); }
.cc-dial { position: relative; width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center;
  background: conic-gradient(var(--c) calc(var(--frac) * 360deg), var(--shift-border-soft) 0); }
.cc-dial::before { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: var(--shift-surface); }
.cc-dial-num { position: relative; font-family: var(--shift-mono); font-size: 11.5px; font-weight: 800; color: var(--shift-text); }

/* ════════════════════ TRANSITIONS ════════════════════ */
.spot-swap-enter-active, .spot-swap-leave-active { transition: opacity 0.32s var(--shift-ease), transform 0.32s var(--shift-ease); }
.spot-swap-enter-from { opacity: 0; transform: translateY(12px) scale(0.97); }
.spot-swap-leave-to { opacity: 0; transform: translateY(-10px) scale(0.98); }
.detail-swap-enter-active { transition: opacity 0.34s var(--shift-ease), transform 0.34s var(--shift-ease); }
.detail-swap-leave-active { transition: opacity 0.18s ease; }
.detail-swap-enter-from { opacity: 0; transform: translateY(14px); }
.detail-swap-leave-to { opacity: 0; }

/* ════════════════════ RESPONSIVE ════════════════════ */
@media (max-width: 980px) {
  .deck-grid { grid-template-columns: 1fr; gap: 18px; }
  .kpi-ribbon { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 560px) { .kpi-ribbon { grid-template-columns: 1fr 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .deck-aurora, .orb, .bulb, .spot-ring { animation: none !important; }
  .mix-seg { transition: none; }
}

/* ════════════════════ LIGHT THEME — warm cream ════════════════════ */
[data-theme="light"] .deck {
  background:
    radial-gradient(120% 130% at 80% -10%, rgba(234,88,12,0.12), transparent 55%),
    radial-gradient(110% 120% at 12% 0%, rgba(217,119,6,0.12), transparent 50%),
    linear-gradient(165deg, #fff7ea 0%, #fdeed8 60%, #f7e6cf 100%);
}
[data-theme="light"] .deck-vignette { background: radial-gradient(130% 120% at 50% 50%, transparent 60%, rgba(120,80,30,0.10)); }
[data-theme="light"] .orb { background: radial-gradient(circle at 38% 35%, rgba(251,191,36,0.7), rgba(234,88,12,0.3) 55%, transparent 72%); }
[data-theme="light"] .spot-card,
[data-theme="light"] .kpi,
[data-theme="light"] .deck-note { background: rgba(255,255,255,0.5); }
[data-theme="light"] .hc-type,
[data-theme="light"] .cc-comp { background: rgba(40,32,20,0.05); }
[data-theme="light"] .mix-seg + .mix-seg { box-shadow: -1px 0 0 rgba(255,255,255,0.4); }
</style>
