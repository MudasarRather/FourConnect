<template>
  <section class="nocturne" :class="{ 'is-live': liveStatus === 'live' }">
    <!-- ════════════════════ NIGHT SKY DECK ════════════════════ -->
    <Motion v-if="nightShifts.length" as="header" class="deck" :initial="{ opacity: 0, y: -14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }">
      <!-- cinematic sky layers (parallax depth) -->
      <span class="sky sky-far" aria-hidden="true" />
      <span class="sky sky-mid" aria-hidden="true" />
      <span class="sky-aurora" aria-hidden="true" />
      <span class="starfield" aria-hidden="true">
        <span v-for="st in stars" :key="st.i" class="star"
          :style="{ left: st.x + '%', top: st.y + '%', '--s': st.s + 'px', '--d': st.d + 's', '--o': st.o }" />
      </span>
      <span class="shooting-star" aria-hidden="true" />
      <span class="deck-vignette" aria-hidden="true" />

      <div class="deck-grid">
        <!-- ─── Nocturne dial ─── -->
        <div class="dial-wrap">
          <div class="dial-stage" :style="{ width: DIAL + 'px', height: DIAL + 'px' }">
            <span class="dial-halo" aria-hidden="true" />
            <svg class="dial-svg" :viewBox="`0 0 ${DIAL} ${DIAL}`" :width="DIAL" :height="DIAL">
              <defs>
                <radialGradient id="moonGrad" cx="38%" cy="34%" r="72%">
                  <stop offset="0%" stop-color="#fde68a" />
                  <stop offset="55%" stop-color="#fbbf24" />
                  <stop offset="100%" stop-color="#ea580c" />
                </radialGradient>
                <filter id="moonBlur"><feGaussianBlur stdDeviation="0.6" /></filter>
              </defs>

              <!-- base ring + hour ticks -->
              <circle class="ring-base" :cx="CX" :cy="CY" :r="RING_R" />
              <g class="ticks">
                <line v-for="t in 24" :key="'t' + t"
                  :x1="tickPt(t - 1, RING_R - (((t - 1) % 6 === 0) ? 9 : 5)).x" :y1="tickPt(t - 1, RING_R - (((t - 1) % 6 === 0) ? 9 : 5)).y"
                  :x2="tickPt(t - 1, RING_R).x" :y2="tickPt(t - 1, RING_R).y"
                  :class="{ major: (t - 1) % 6 === 0 }" />
              </g>

              <!-- night-shift window arcs (drawn on mount) -->
              <path v-for="(a, i) in dialArcs" :key="'arc' + i" class="arc" pathLength="100"
                :d="a.d" :style="{ animationDelay: (0.25 + i * 0.16) + 's' }" />

              <!-- now sweep -->
              <g class="sweep" :style="{ transform: `rotate(${nowAngle}deg)`, transformOrigin: `${CX}px ${CY}px` }">
                <line class="sweep-line" :x1="CX" :y1="CY" :x2="CX" :y2="CY - RING_R + 6" />
                <circle class="sweep-tip" :cx="CX" :cy="CY - RING_R + 6" r="3.5" />
              </g>

              <!-- crescent moon core -->
              <g class="moon" :style="{ transformOrigin: `${CX}px ${CY}px` }">
                <circle :cx="CX" :cy="CY" :r="MOON_R" fill="url(#moonGrad)" filter="url(#moonBlur)" />
                <circle class="moon-shade" :cx="CX + MOON_R * 0.42" :cy="CY - MOON_R * 0.16" :r="MOON_R * 0.92" />
                <circle class="moon-crater" :cx="CX - MOON_R * 0.28" :cy="CY + MOON_R * 0.22" :r="MOON_R * 0.13" />
                <circle class="moon-crater" :cx="CX - MOON_R * 0.05" :cy="CY - MOON_R * 0.34" :r="MOON_R * 0.08" />
              </g>
            </svg>

            <!-- center readout over moon -->
            <div class="dial-core">
              <span class="core-num"><ShiftCountUp :value="onDuty" :duration="900" /></span>
              <span class="core-lbl">on duty</span>
            </div>

            <!-- crew constellation nodes positioned along their shift arcs -->
            <Motion v-for="(n, i) in crewNodes" :key="n.key" as="span" class="crew-node"
              :style="{ left: (n.x - 15) + 'px', top: (n.y - 15) + 'px', '--twk': (2.6 + (i % 5) * 0.4) + 's' }"
              :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }"
              :transition="{ duration: 0.5, delay: 0.5 + i * 0.06, ease: [0.34, 1.56, 0.64, 1] }"
              :whileHover="{ scale: 1.22 }"
              :title="`${n.employee_name || 'Employee'} · ${n.shift_code || ''}`">
              <span class="cn-orb">{{ initials(n.employee_name) }}</span>
              <span v-if="n.transport_required" class="cn-dot cn-bus"><Bus :size="7" /></span>
            </Motion>
          </div>
        </div>

        <!-- ─── readout + KPIs ─── -->
        <div class="deck-readout">
          <span class="eyebrow">
            <span class="eyebrow-dot" :data-live="liveStatus === 'live'" />
            Nocturne · {{ liveStatus === 'live' ? 'NIGHT OPS LIVE' : 'STANDBY' }}
          </span>
          <h2 class="deck-title">Night Operations Deck</h2>
          <p class="deck-sub">Allowances, OT differential, transport &amp; meal eligibility for every after-hours shift — and tonight's crew, mapped to the clock.</p>

          <div class="deck-clockrow">
            <span class="live-clock"><Clock :size="13" /> {{ clock }}</span>
            <button class="btn-ghost" :class="{ spin: loading }" title="Refresh" @click="reload"><RefreshCw :size="14" /> Refresh</button>
          </div>

          <div class="kpi-ribbon">
            <Motion v-for="(k, i) in kpis" :key="k.key" as="div" class="kpi" :data-tone="k.tone"
              :initial="{ opacity: 0, y: 18, scale: 0.95 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
              :transition="{ duration: 0.55, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }"
              :whileHover="{ y: -4 }">
              <span class="kpi-spark" aria-hidden="true" />
              <div class="kpi-ic"><component :is="k.icon" :size="15" /></div>
              <div class="kpi-body">
                <div class="kpi-val">
                  <ShiftCountUp :value="k.value" :prefix="k.prefix || ''" :suffix="k.suffix || ''" :decimals="k.decimals || 0" />
                </div>
                <div class="kpi-lbl">{{ k.label }}</div>
              </div>
            </Motion>
          </div>

          <p v-if="allowanceTotal > 0" class="deck-note">
            <Info :size="11" /> ₹{{ allowanceTotal.toLocaleString('en-IN') }} in night allowance for tonight's crew — auto-posted to payslips per night worked, counted from attendance.
          </p>
        </div>
      </div>
    </Motion>

    <!-- ════════════════════ CREW MANIFEST ════════════════════ -->
    <Motion v-if="nightShifts.length" as="div" class="panel" :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }">
      <header class="panel-head">
        <span class="ph-ic"><Users :size="14" /></span>
        <h3>Crew on the night roster</h3>
        <span class="ph-meta">{{ roster.length }} tonight</span>
      </header>

      <div v-if="roster.length" class="manifest">
        <Motion v-for="(r, i) in roster" :key="'m' + i" as="article" class="mcard"
          :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.42, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -4 }">
          <span class="mc-sweep" aria-hidden="true" />
          <div class="mc-top">
            <span class="mc-av" :style="{ '--c': shiftColor(r.shift_id) }">{{ initials(r.employee_name) }}</span>
            <div class="mc-id">
              <b>{{ r.employee_name || 'Employee' }}</b>
              <small>{{ r.shift_name || r.shift_code }} · {{ shiftWindow(r.shift_id) }}</small>
            </div>
          </div>
          <div class="mc-perks">
            <span class="perk" :class="{ active: r.allowance_amount > 0 }"><IndianRupee :size="11" />{{ r.allowance_amount > 0 ? r.allowance_amount : '—' }}</span>
            <span class="perk" :class="{ active: r.transport_required }"><Bus :size="11" />{{ r.transport_required ? 'Cab' : 'Self' }}</span>
            <span class="perk" :class="{ active: r.meal_eligible }"><Utensils :size="11" />{{ r.meal_eligible ? 'Meal' : '—' }}</span>
          </div>
        </Motion>
      </div>

      <div v-else class="quiet">
        <Moon :size="26" />
        <p>A quiet night — no one is on a night shift right now.</p>
      </div>
    </Motion>

    <!-- ════════════════════ POLICY INSTRUMENT MODULES ════════════════════ -->
    <div v-if="nightShifts.length" class="modules">
      <Motion v-for="(s, i) in nightShifts" :key="s.id" as="article" class="module"
        :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, delay: 0.1 + 0.07 * i, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -3 }">
        <span class="mod-grid-bg" aria-hidden="true" />
        <header class="mod-head">
          <div class="mod-title">
            <span class="mod-code">{{ s.code }}</span>
            <h3>{{ s.name }}</h3>
          </div>
          <span class="mod-time shift-mono">{{ shortTime(s.start_time) }}–{{ shortTime(s.end_time) }}</span>
        </header>

        <!-- on-duty + tonight cost strip -->
        <div class="mod-live">
          <span class="ml-chip"><Users :size="11" /> {{ onDutyFor(s.id) }} on duty</span>
          <span class="ml-chip ml-cost"><IndianRupee :size="11" />{{ (onDutyFor(s.id) * (draft[s.id]?.allowance_amount || 0)).toLocaleString('en-IN') }} tonight</span>
        </div>

        <div class="mod-fields">
          <div class="field">
            <span class="field-lbl">Allowance / night</span>
            <div class="stepper">
              <button type="button" class="step" @click="bump(s.id, 'allowance_amount', -50)"><Minus :size="13" /></button>
              <span class="step-val shift-mono">₹{{ draft[s.id]?.allowance_amount || 0 }}</span>
              <button type="button" class="step" @click="bump(s.id, 'allowance_amount', 50)"><Plus :size="13" /></button>
            </div>
          </div>
          <div class="field">
            <span class="field-lbl">OT differential</span>
            <div class="stepper">
              <button type="button" class="step" @click="bump(s.id, 'overtime_rate', -0.25, 1)"><Minus :size="13" /></button>
              <span class="step-val shift-mono">{{ (draft[s.id]?.overtime_rate || 1).toFixed(2) }}×</span>
              <button type="button" class="step" @click="bump(s.id, 'overtime_rate', 0.25, 1)"><Plus :size="13" /></button>
            </div>
          </div>
        </div>

        <div class="mod-toggles">
          <button v-for="t in TOGGLES" :key="t.key" type="button" class="toggle" :class="{ on: draft[s.id]?.[t.key] }"
            @click="draft[s.id][t.key] = !draft[s.id][t.key]">
            <span class="tg-ic"><component :is="t.icon" :size="13" /></span>
            <span class="tg-lbl">{{ t.label }}</span>
            <span class="tg-switch">
              <Motion as="span" class="tg-knob"
                :animate="{ x: draft[s.id]?.[t.key] ? 15 : 0 }"
                :transition="{ duration: 0.34, ease: [0.34, 1.56, 0.64, 1] }" />
            </span>
          </button>
        </div>

        <Motion as="button" class="mod-save" :disabled="savingId === s.id"
          :whileHover="{ scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="save(s)">
          <Loader2 v-if="savingId === s.id" :size="14" class="spin" />
          <Check v-else-if="savedId === s.id" :size="14" />
          <Save v-else :size="14" />
          {{ savedId === s.id ? 'Saved' : 'Save policy' }}
        </Motion>
      </Motion>
    </div>

    <ShiftEmptyState v-else-if="!loading" :icon="Moon" title="No night shifts defined"
      sub="Night shifts are shift templates with type = NIGHT. Create one in Shift Management to configure its night-ops policy here." />
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  Moon, RefreshCw, Bus, Utensils, ShieldCheck, Save, Loader2, Check,
  Users, IndianRupee, Clock, Plus, Minus, Info,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import ShiftCountUp from '../components/ShiftCountUp.vue'
import { fetchShifts, fetchNightPolicies, upsertNightPolicy, fetchNightRoster, shortTime, shiftTypeMeta } from '@/composables/useShifts'

const toast = useToast()
const nightShifts = ref([])
const roster = ref([])
const loading = ref(false)
const savingId = ref(null)
const savedId = ref(null)
const draft = reactive({})

/* ─── dial geometry ─── */
const DIAL = 280
const CX = DIAL / 2
const CY = DIAL / 2
const RING_R = 116
const ORBIT_R = 116
const MOON_R = 30

const TOGGLES = [
  { key: 'transport_required', label: 'Transport', icon: Bus },
  { key: 'meal_eligible', label: 'Meal', icon: Utensils },
  { key: 'safety_compliance', label: 'Safety', icon: ShieldCheck },
]

const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'

/* ─── decorative starfield (stable per mount) ─── */
const stars = ref([])
const buildStars = () => {
  const out = []
  for (let i = 0; i < 46; i++) {
    out.push({
      i,
      x: +(Math.random() * 100).toFixed(2),
      y: +(Math.random() * 100).toFixed(2),
      s: +(Math.random() * 2 + 1).toFixed(2),
      d: +(Math.random() * 4 + 2).toFixed(2),
      o: +(Math.random() * 0.5 + 0.3).toFixed(2),
    })
  }
  stars.value = out
}

/* ─── live clock + now sweep ─── */
const clock = ref('--:--:--')
const now = ref(new Date())
let timer = null
const tickClock = () => { now.value = new Date(); clock.value = now.value.toLocaleTimeString(undefined, { hour12: false }) }
const nowAngle = computed(() => {
  const d = now.value
  const mins = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
  return (mins / 1440) * 360
})

/* ─── geometry helpers (0deg = top, clockwise) ─── */
const polar = (cx, cy, r, deg) => {
  const a = (deg - 90) * Math.PI / 180
  return { x: +(cx + r * Math.cos(a)).toFixed(2), y: +(cy + r * Math.sin(a)).toFixed(2) }
}
const tickPt = (hour, r) => polar(CX, CY, r, (hour / 24) * 360)
const timeAngle = (t) => {
  if (!t) return 0
  const [h, m] = String(t).split(':').map(Number)
  return (((h || 0) * 60 + (m || 0)) / 1440) * 360
}
const arcPath = (a0, a1, r) => {
  let span = a1 - a0
  if (span <= 0) span += 360
  const p0 = polar(CX, CY, r, a0)
  const p1 = polar(CX, CY, r, a0 + span)
  const large = span > 180 ? 1 : 0
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`
}
const angleInArc = (ang, a0, a1) => {
  let span = a1 - a0
  if (span <= 0) span += 360
  let d = ang - a0
  if (d < 0) d += 360
  return d <= span
}

/* ─── lookups ─── */
const shiftById = computed(() => Object.fromEntries(nightShifts.value.map(s => [s.id, s])))
const shiftColor = () => shiftTypeMeta('NIGHT').color
const shiftWindow = (id) => {
  const s = shiftById.value[id]
  return s ? `${shortTime(s.start_time)}–${shortTime(s.end_time)}` : '—'
}

/* ─── dial arcs (one per night shift window) ─── */
const dialArcs = computed(() => nightShifts.value.map(s => ({
  d: arcPath(timeAngle(s.start_time), timeAngle(s.end_time), RING_R),
})))

/* ─── crew nodes: each member placed along their shift's lit arc ─── */
const crewNodes = computed(() => {
  const byShift = {}
  for (const r of roster.value) (byShift[r.shift_id] ??= []).push(r)
  const out = []
  for (const [sid, members] of Object.entries(byShift)) {
    const s = shiftById.value[sid]
    const a0 = timeAngle(s?.start_time ?? '21:00')
    let a1 = timeAngle(s?.end_time ?? '06:00')
    let span = a1 - a0
    if (span <= 0) span += 360
    members.forEach((m, i) => {
      const ang = (a0 + span * ((i + 1) / (members.length + 1))) % 360
      const p = polar(CX, CY, ORBIT_R, ang)
      out.push({ ...m, key: `${sid}-${i}`, x: p.x, y: p.y })
    })
  }
  return out
})

const liveStatus = computed(() =>
  dialArcs.value.length && nightShifts.value.some(s => angleInArc(nowAngle.value, timeAngle(s.start_time), timeAngle(s.end_time)))
    ? 'live' : 'standby')

/* ─── KPIs ─── */
const onDuty = computed(() => roster.value.length)
const allowanceTotal = computed(() => roster.value.reduce((a, r) => a + (Number(r.allowance_amount) || 0), 0))
const transportCount = computed(() => roster.value.filter(r => r.transport_required).length)
const mealCount = computed(() => roster.value.filter(r => r.meal_eligible).length)
const onDutyFor = (id) => roster.value.filter(r => String(r.shift_id) === String(id)).length

const kpis = computed(() => [
  { key: 'crew', label: 'On duty tonight', value: onDuty.value, icon: Users, tone: 'gold' },
  { key: 'allw', label: 'Allowance liability', value: allowanceTotal.value, prefix: '₹', icon: IndianRupee, tone: 'ember' },
  { key: 'trans', label: 'Transport pickups', value: transportCount.value, icon: Bus, tone: 'gold' },
  { key: 'meal', label: 'Meals provided', value: mealCount.value, icon: Utensils, tone: 'ok' },
])

/* ─── data ─── */
const reload = async () => {
  loading.value = true
  try {
    const [sh, pols, rost] = await Promise.all([
      fetchShifts({ limit: 100, shift_type: 'NIGHT' }),
      fetchNightPolicies(),
      fetchNightRoster(),
    ])
    nightShifts.value = sh.items || []
    roster.value = rost.staff || []
    const pmap = {}
    for (const p of (Array.isArray(pols) ? pols : [])) pmap[p.shift_id] = p
    for (const k of Object.keys(draft)) delete draft[k]
    for (const s of nightShifts.value) {
      const p = pmap[s.id]
      draft[s.id] = {
        allowance_amount: p ? Number(p.allowance_amount) : 0,
        overtime_rate: p ? Number(p.overtime_rate) : 1.5,
        transport_required: p ? p.transport_required : false,
        meal_eligible: p ? p.meal_eligible : false,
        safety_compliance: p ? p.safety_compliance : true,
      }
    }
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load night console') }
  finally { loading.value = false }
}

const bump = (id, field, delta, min = 0) => {
  const cur = Number(draft[id]?.[field]) || 0
  draft[id][field] = Math.max(min, +(cur + delta).toFixed(2))
}

const save = async (s) => {
  savingId.value = s.id
  try {
    await upsertNightPolicy({ shift_id: s.id, ...draft[s.id] })
    savedId.value = s.id
    toast.success(`${s.name} policy saved`)
    setTimeout(() => { if (savedId.value === s.id) savedId.value = null }, 1800)
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not save policy') }
  finally { savingId.value = null }
}

onMounted(() => {
  buildStars()
  tickClock(); timer = setInterval(tickClock, 1000)
  reload()
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.nocturne { display: flex; flex-direction: column; gap: 18px; }

/* ════════════════════ NIGHT SKY DECK ════════════════════ */
.deck { position: relative; overflow: hidden; border-radius: 26px; padding: 26px 30px;
  background:
    radial-gradient(120% 130% at 18% -10%, rgba(251,191,36,0.10), transparent 55%),
    linear-gradient(165deg, #0c0d11 0%, #0a0b0f 55%, #08090c 100%);
  border: 1px solid var(--shift-border); }

/* parallax sky layers */
.sky { position: absolute; inset: -20%; pointer-events: none; }
.sky-far { background: radial-gradient(closest-side at 80% 20%, rgba(245,158,11,0.10), transparent 70%),
  radial-gradient(closest-side at 12% 80%, rgba(234,88,12,0.08), transparent 70%); animation: sky-drift-a 34s ease-in-out infinite; }
.sky-mid { background: radial-gradient(closest-side at 60% 60%, rgba(251,191,36,0.07), transparent 60%); animation: sky-drift-b 26s ease-in-out infinite; }
@keyframes sky-drift-a { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(3%, 2%, 0) scale(1.05); } }
@keyframes sky-drift-b { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(-4%, -2%, 0) scale(1.08); } }

/* aurora ribbon */
.sky-aurora { position: absolute; left: -30%; right: -30%; top: -10%; height: 70%; pointer-events: none; opacity: 0.5;
  background: conic-gradient(from 120deg at 50% 50%, transparent, rgba(251,191,36,0.18), rgba(234,88,12,0.12), transparent 60%);
  filter: blur(38px); background-size: 200% 200%; animation: aurora-flow 22s ease-in-out infinite;
  mask-image: linear-gradient(180deg, #000, transparent 85%); }
@keyframes aurora-flow { 0%,100% { background-position: 0% 50%; transform: skewY(-3deg); } 50% { background-position: 100% 50%; transform: skewY(3deg); } }

/* starfield */
.starfield { position: absolute; inset: 0; pointer-events: none; }
.star { position: absolute; width: var(--s); height: var(--s); border-radius: 50%;
  background: var(--shift-amber-bright); box-shadow: 0 0 6px var(--shift-amber);
  opacity: var(--o); animation: twinkle var(--d) ease-in-out infinite; }
@keyframes twinkle { 0%, 100% { opacity: calc(var(--o) * 0.35); transform: scale(0.7); } 50% { opacity: var(--o); transform: scale(1.15); } }

/* shooting star */
.shooting-star { position: absolute; top: 14%; left: 8%; width: 80px; height: 1.5px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--shift-amber-bright)); opacity: 0; border-radius: 2px;
  animation: shoot 11s ease-in 3s infinite; }
@keyframes shoot {
  0% { transform: translate(0,0) rotate(18deg); opacity: 0; }
  2% { opacity: 0.9; }
  9% { transform: translate(340px, 120px) rotate(18deg); opacity: 0; }
  100% { opacity: 0; }
}
.deck-vignette { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(130% 120% at 50% 50%, transparent 55%, rgba(0,0,0,0.4)); }

.deck-grid { position: relative; z-index: 2; display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 34px; }

/* ─── nocturne dial ─── */
.dial-wrap { display: grid; place-items: center; }
.dial-stage { position: relative; }
.dial-halo { position: absolute; inset: 14%; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, rgba(251,191,36,0.18), transparent 68%); filter: blur(14px);
  animation: halo-breathe 5.5s ease-in-out infinite; }
@keyframes halo-breathe { 0%,100% { opacity: 0.55; transform: scale(0.96); } 50% { opacity: 0.95; transform: scale(1.04); } }

.dial-svg { position: relative; z-index: 1; overflow: visible; }
.ring-base { fill: none; stroke: var(--shift-border-soft); stroke-width: 1.4; }
.ticks line { stroke: var(--shift-grid-line); stroke-width: 1; }
.ticks line.major { stroke: var(--shift-text-dim); stroke-width: 1.4; }
.arc { fill: none; stroke: url(#moonGrad); stroke-width: 5; stroke-linecap: round;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--shift-amber) 55%, transparent));
  stroke-dasharray: 100; stroke-dashoffset: 100; pathLength: 100;
  animation: shift-draw 1.3s var(--shift-ease) forwards; }

.sweep { transition: transform 1s linear; transform-box: view-box; }
.sweep-line { stroke: var(--shift-amber-bright); stroke-width: 1.4; opacity: 0.8; }
.sweep-tip { fill: var(--shift-amber-bright); filter: drop-shadow(0 0 5px var(--shift-amber)); }

.moon { animation: moon-float 7s ease-in-out infinite; transform-box: view-box; }
@keyframes moon-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
.moon-shade { fill: #0a0b0f; }
.moon-crater { fill: rgba(234,88,12,0.28); }

.dial-core { position: absolute; inset: 0; z-index: 3; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
.core-num { font-family: var(--shift-mono); font-size: 30px; font-weight: 900; color: #1f1408; line-height: 1;
  text-shadow: 0 1px 0 rgba(253,230,138,0.5); }
.core-lbl { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.14em; color: #2a1c0a; font-weight: 800; margin-top: 1px; }

.crew-node { position: absolute; z-index: 4; cursor: default;
  animation: node-twinkle var(--twk, 3s) ease-in-out infinite; }
.crew-node:hover { z-index: 6; }
@keyframes node-twinkle { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.18); } }
.cn-orb { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%;
  font-family: var(--shift-mono); font-size: 10px; font-weight: 800; color: #1f1408;
  background: var(--shift-grad-cta); border: 1.5px solid rgba(253,230,138,0.6);
  box-shadow: 0 0 12px -2px var(--shift-amber), 0 4px 10px -4px rgba(0,0,0,0.6); }
.cn-dot { position: absolute; bottom: -2px; right: -2px; width: 14px; height: 14px; border-radius: 50%;
  display: grid; place-items: center; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-amber); }

/* ─── readout ─── */
.deck-readout { position: relative; min-width: 0; }
.eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: var(--shift-mono); font-size: 10px;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--shift-amber-strong); }
.eyebrow-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--shift-text-dim); transition: background 0.3s; }
.eyebrow-dot[data-live="true"] { background: var(--shift-ok); animation: shift-ring-pulse 2.2s ease-out infinite; }
.deck-title { margin: 9px 0 5px; font-size: 30px; font-weight: 900; letter-spacing: -0.03em; line-height: 1.05;
  background: linear-gradient(135deg, var(--shift-amber-bright), var(--shift-amber) 45%, var(--shift-ember-strong));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.deck-sub { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); max-width: 540px; }

.deck-clockrow { display: flex; align-items: center; gap: 12px; margin: 15px 0 14px; }
.live-clock { display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px;
  background: rgba(0,0,0,0.3); border: 1px solid var(--shift-border-soft); font-family: var(--shift-mono);
  font-size: 14px; font-weight: 700; color: var(--shift-text); letter-spacing: 0.05em; font-variant-numeric: tabular-nums; }
.live-clock svg { color: var(--shift-amber); }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 999px; cursor: pointer;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 12.5px; transition: 0.2s; }
.btn-ghost:hover { color: var(--shift-amber); border-color: var(--shift-border); }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

.kpi-ribbon { display: grid; grid-template-columns: repeat(4, 1fr); gap: 11px; }
.kpi { position: relative; overflow: hidden; display: flex; align-items: center; gap: 11px; padding: 13px 14px; border-radius: 15px;
  background: rgba(255,255,255,0.03); border: 1px solid var(--shift-border-soft); transition: border-color 0.25s; }
.kpi:hover { border-color: var(--shift-border); }
.kpi-spark { position: absolute; right: -28%; top: -55%; width: 78%; height: 210%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--tone-c) 24%, transparent), transparent 65%); opacity: 0.55; }
.kpi[data-tone="gold"] { --tone-c: var(--shift-amber); } .kpi[data-tone="ember"] { --tone-c: var(--shift-ember); } .kpi[data-tone="ok"] { --tone-c: var(--shift-ok); }
.kpi-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0;
  background: color-mix(in srgb, var(--tone-c) 15%, transparent); color: var(--tone-c); border: 1px solid color-mix(in srgb, var(--tone-c) 28%, transparent); }
.kpi-val { font-family: var(--shift-mono); font-size: 20px; font-weight: 800; color: var(--shift-text); line-height: 1.1; }
.kpi-lbl { margin-top: 2px; font-size: 10px; font-family: var(--shift-mono); text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-muted); }

.deck-note { display: inline-flex; align-items: center; gap: 6px; margin: 13px 0 0; font-size: 11px; color: var(--shift-text-muted);
  background: var(--shift-warn-soft); border: 1px solid color-mix(in srgb, var(--shift-ember) 26%, transparent);
  padding: 6px 11px; border-radius: 999px; }
.deck-note svg { color: var(--shift-ember-strong); flex-shrink: 0; }

/* ════════════════════ CREW MANIFEST ════════════════════ */
.panel { background: var(--shift-surface); border: 1px solid var(--shift-border-soft); border-radius: 20px; padding: 18px 20px;
  backdrop-filter: var(--shift-glass-blur); -webkit-backdrop-filter: var(--shift-glass-blur); }
.panel-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.ph-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: rgba(251,191,36,0.13); color: var(--shift-amber); }
.panel-head h3 { margin: 0; font-size: 14.5px; font-weight: 700; color: var(--shift-text); flex: 1; }
.ph-meta { font-family: var(--shift-mono); font-size: 10.5px; color: var(--shift-text-muted); }

.manifest { display: grid; grid-template-columns: repeat(auto-fill, minmax(228px, 1fr)); gap: 11px; }
.mcard { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 11px; padding: 14px;
  border-radius: 15px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); transition: border-color 0.25s; }
.mcard:hover { border-color: var(--shift-border); }
.mc-sweep { position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: linear-gradient(120deg, transparent 40%, rgba(251,191,36,0.10) 50%, transparent 60%); transition: opacity 0.3s; }
.mcard:hover .mc-sweep { opacity: 1; }
.mc-top { display: flex; align-items: center; gap: 10px; }
.mc-av { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center;
  font-family: var(--shift-mono); font-size: 11px; font-weight: 800; color: #1f1408;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 90%, white), var(--c)); box-shadow: 0 0 12px -3px var(--c); }
.mc-id { min-width: 0; }
.mc-id b { display: block; font-size: 13px; color: var(--shift-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mc-id small { font-size: 10.5px; color: var(--shift-text-muted); font-family: var(--shift-mono); }
.mc-perks { display: flex; gap: 6px; flex-wrap: wrap; }
.perk { display: inline-flex; align-items: center; gap: 4px; font-family: var(--shift-mono); font-size: 10px; padding: 3px 8px; border-radius: 7px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--shift-border-soft); color: var(--shift-text-dim); }
.perk.active { background: rgba(251,191,36,0.12); border-color: color-mix(in srgb, var(--shift-amber) 30%, transparent); color: var(--shift-amber); }

.quiet { display: grid; place-items: center; gap: 10px; padding: 38px 12px; text-align: center; color: var(--shift-text-dim); }
.quiet svg { color: var(--shift-amber); opacity: 0.6; animation: halo-breathe 4s ease-in-out infinite; }
.quiet p { margin: 0; font-size: 13px; }

/* ════════════════════ POLICY MODULES ════════════════════ */
.modules { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.module { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 13px; padding: 18px;
  border-radius: 18px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft);
  backdrop-filter: var(--shift-glass-blur); -webkit-backdrop-filter: var(--shift-glass-blur); transition: border-color 0.25s; }
.module:hover { border-color: var(--shift-border); }
.mod-grid-bg { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--shift-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--shift-grid-line) 1px, transparent 1px);
  background-size: 26px 26px; mask-image: radial-gradient(120% 90% at 100% 0%, #000, transparent 70%); }
.module > *:not(.mod-grid-bg) { position: relative; z-index: 1; }
.mod-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.mod-code { font-family: var(--shift-mono); font-size: 10px; color: var(--shift-amber); letter-spacing: 0.05em; }
.mod-head h3 { margin: 2px 0 0; font-size: 14.5px; font-weight: 700; color: var(--shift-text); }
.mod-time { font-size: 11px; color: var(--shift-text-muted); white-space: nowrap; }

.mod-live { display: flex; gap: 7px; flex-wrap: wrap; }
.ml-chip { display: inline-flex; align-items: center; gap: 5px; font-family: var(--shift-mono); font-size: 10.5px; padding: 4px 9px; border-radius: 8px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); }
.ml-cost { color: var(--shift-ember); border-color: color-mix(in srgb, var(--shift-ember) 24%, transparent); }

.mod-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-lbl { font-size: 10.5px; color: var(--shift-text-muted); font-family: var(--shift-mono); text-transform: uppercase; letter-spacing: 0.04em; }
.stepper { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 5px;
  background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 11px; }
.step { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; cursor: pointer; flex-shrink: 0;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: 0.16s; }
.step:hover { color: var(--shift-amber); border-color: var(--shift-border); transform: translateY(-1px); }
.step:active { transform: scale(0.92); }
.step-val { font-size: 13px; font-weight: 700; color: var(--shift-text); flex: 1; text-align: center; }

.mod-toggles { display: flex; flex-direction: column; gap: 7px; }
.toggle { display: flex; align-items: center; gap: 9px; padding: 8px 11px; border-radius: 11px; cursor: pointer; width: 100%;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-muted); transition: 0.2s; }
.toggle.on { color: var(--shift-text); border-color: color-mix(in srgb, var(--shift-amber) 32%, transparent); background: rgba(251,191,36,0.07); }
.tg-ic { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; flex-shrink: 0;
  background: rgba(255,255,255,0.04); color: inherit; transition: 0.2s; }
.toggle.on .tg-ic { background: rgba(251,191,36,0.16); color: var(--shift-amber); }
.tg-lbl { flex: 1; text-align: left; font-size: 12.5px; font-weight: 600; }
.tg-switch { position: relative; width: 36px; height: 21px; border-radius: 999px; flex-shrink: 0;
  background: var(--shift-border-soft); border: 1px solid var(--shift-border-soft); transition: background 0.25s; }
.toggle.on .tg-switch { background: var(--shift-grad-cta); }
.tg-knob { position: absolute; top: 2px; left: 2px; width: 15px; height: 15px; border-radius: 50%; background: #fff;
  box-shadow: 0 2px 5px -1px rgba(0,0,0,0.5); will-change: transform; }

.mod-save { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 11px; border-radius: 12px; cursor: pointer;
  border: none; background: var(--shift-grad-cta); color: #1f1408; font-weight: 800; font-size: 13px; margin-top: auto;
  box-shadow: 0 10px 24px -12px rgba(245,158,11,0.8); }
.mod-save:disabled { opacity: 0.65; cursor: default; }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }

/* ════════════════════ RESPONSIVE ════════════════════ */
@media (max-width: 980px) {
  .deck-grid { grid-template-columns: 1fr; justify-items: center; text-align: center; }
  .deck-readout { text-align: center; }
  .eyebrow, .deck-clockrow { justify-content: center; }
  .deck-sub { margin-inline: auto; }
  .kpi { text-align: left; }
}
@media (max-width: 620px) {
  .kpi-ribbon { grid-template-columns: 1fr 1fr; }
  .mod-fields { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .sky-far, .sky-mid, .sky-aurora, .star, .shooting-star, .dial-halo, .moon, .crew-node, .quiet svg { animation: none !important; }
  .arc { stroke-dashoffset: 0; animation: none; }
  .sweep { transition: none; }
}

/* ════════════════════ LIGHT THEME — pre-dawn cream ════════════════════ */
[data-theme="light"] .deck {
  background:
    radial-gradient(120% 130% at 18% -10%, rgba(217,119,6,0.12), transparent 55%),
    linear-gradient(165deg, #fff7ea 0%, #fdeed8 55%, #f7e6cf 100%);
}
[data-theme="light"] .deck-vignette { background: radial-gradient(130% 120% at 50% 50%, transparent 60%, rgba(120,80,30,0.10)); }
[data-theme="light"] .star { background: var(--shift-ember-strong); box-shadow: 0 0 5px var(--shift-amber-strong); }
[data-theme="light"] .moon-shade { fill: #fdeed8; }
[data-theme="light"] .ring-base { stroke: rgba(40,32,20,0.12); }
[data-theme="light"] .live-clock { background: rgba(255,255,255,0.6); }
[data-theme="light"] .kpi { background: rgba(255,255,255,0.5); }
[data-theme="light"] .perk { background: rgba(40,32,20,0.04); }
[data-theme="light"] .ml-chip, [data-theme="light"] .step { background: rgba(255,250,240,0.8); }
[data-theme="light"] .tg-knob { background: #fff; }
[data-theme="light"] .core-num { color: #2a1c0a; text-shadow: none; }
[data-theme="light"] .core-lbl { color: #4a3618; }
</style>
