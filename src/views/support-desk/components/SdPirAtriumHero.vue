<template>
  <header ref="heroEl" class="pah" @pointermove="onMove" @pointerleave="onLeave">
    <div class="pah-copy">
      <div class="pah-eyebrow sd-mono">COMMAND FUNNEL · RECORD OF REVIEW</div>
      <h1 class="pah-h1">Sign. Seal. <span class="g">Distribute.</span></h1>
      <p class="pah-sub">The governance desk for post-incident review. Every terminal SEV closes twice —
        once in production, once on the record. Panels below sit at true depth: what needs your signature floats closest.</p>
    </div>

    <!-- stats ribbon -->
    <div ref="ribbonEl" class="pah-ribbon pp" data-depth="0.35">
      <div class="rs"><div class="lb sd-mono">AWAITING SIGN-OFF</div>
        <div class="v"><SdCountUp :value="stats?.in_review ?? 0" /></div>
        <div class="d">{{ oldestWait }}</div></div>
      <div class="rs"><div class="lb sd-mono">PUBLISHED · 30D</div>
        <div class="v"><SdCountUp :value="stats?.published_30d ?? 0" /></div>
        <div class="d">records on the canon</div></div>
      <div class="rs"><div class="lb sd-mono">COVERAGE · 90D</div>
        <div class="v"><SdCountUp :value="coverage" /><em>%</em></div>
        <div class="d">of terminal SEV1/2 reviewed</div></div>
      <div class="rs"><div class="lb sd-mono">MEDIAN REVIEW</div>
        <div class="v"><SdCountUp :value="medianH" /><em>h</em></div>
        <div class="d">submit → seal · 30d</div></div>
      <div class="rs"><div class="lb sd-mono">FOLLOW-THROUGH</div>
        <div class="v"><SdCountUp :value="followPct" /><em>%</em></div>
        <div class="d">actions closed on register</div></div>
      <div class="rs" :class="{ alert: (stats?.owed ?? 0) > 0 }"><div class="lb sd-mono">OWED ORG-WIDE</div>
        <div class="v"><SdCountUp :value="stats?.owed ?? 0" /></div>
        <div class="d" :class="{ dn: (stats?.owed ?? 0) > 0 }">{{ oldestOwed }}</div></div>
    </div>

    <!-- bento stage -->
    <div ref="stageEl" class="pah-stage">
      <div class="pah-bento">
        <!-- DOCKET (closest) -->
        <div class="pp pp-1" data-depth="1" :class="{ attend: attendOn }">
          <div class="pah-glass full"><div class="pin" style="--fd:10s">
            <div class="ph"><span class="t sd-mono">REVIEW DOCKET</span>
              <span class="pill sd-mono">{{ stats?.in_review ?? 0 }} IN REVIEW</span></div>
            <div class="mini-list">
              <button v-for="p in docket.slice(0, 5)" :key="p.pir_id" class="mrow" @click="$emit('open-dossier', p)">
                <span class="sev sd-mono" :class="'s' + p.sev">SEV{{ p.sev }}</span>
                <span class="mtx"><span class="mid sd-mono">{{ p.report_number }} · {{ p.ticket_number }}</span>
                  <span class="mtitle">{{ p.title || p.subject }}</span></span>
                <span class="ava sd-mono">{{ initials(p.created_by_name) }}</span>
                <span class="mage sd-mono">{{ ageShort(p.submitted_at) }}</span>
              </button>
              <div v-if="!docket.length" class="mini-empty">Nothing awaiting a second signature.</div>
            </div>
            <div class="pfoot"><span>submissions float forward on arrival</span>
              <button class="plink sd-mono" @click="$emit('go', 'docket')">OPEN FULL DOCKET ↓</button></div>
          </div></div>
        </div>
        <!-- COVERAGE -->
        <div class="pp pp-2" data-depth="0.55">
          <div class="pah-glass full"><div class="pin" style="--fd:12s;--fdel:.8s">
            <div class="ph"><span class="t sd-mono">COVERAGE</span><span class="pill sd-mono">90D</span></div>
            <div class="gwrap">
              <svg width="150" height="150" viewBox="0 0 150 150">
                <defs><linearGradient id="pah-cg1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#f5c56b" /><stop offset="0.6" stop-color="#e8b04b" /><stop offset="1" stop-color="#b45309" /></linearGradient></defs>
                <circle class="arcTrack" cx="75" cy="75" r="58" stroke-width="7" />
                <circle class="arcVal" cx="75" cy="75" r="58" stroke="url(#pah-cg1)" stroke-width="7"
                  stroke-dasharray="364.4" :style="{ strokeDashoffset: covDash }" transform="rotate(-90 75 75)" />
              </svg>
              <div class="gnum"><div class="n"><SdCountUp :value="coverage" /><em>%</em></div><div class="l sd-mono">REVIEWED</div></div>
            </div>
            <div class="pfoot"><span>terminal SEV1/2 closures carrying a review, 90-day window</span></div>
          </div></div>
        </div>
        <!-- LATENCY -->
        <div class="pp pp-3" data-depth="0.8">
          <div class="pah-glass full"><div class="pin" style="--fd:9s;--fdel:1.6s">
            <div class="ph"><span class="t sd-mono">SIGN-OFF LATENCY</span><span class="pill sd-mono">TARGET 48H</span></div>
            <div class="gwrap">
              <svg width="160" height="150" viewBox="0 0 160 150">
                <defs><linearGradient id="pah-lg1" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stop-color="#34d399" /><stop offset="0.55" stop-color="#e8b04b" /><stop offset="1" stop-color="#ef4444" /></linearGradient></defs>
                <circle class="arcTrack" cx="80" cy="78" r="60" stroke-width="7" stroke-dasharray="251.3 125.7" transform="rotate(150 80 78)" />
                <circle class="arcVal" cx="80" cy="78" r="60" stroke="url(#pah-lg1)" stroke-width="7"
                  stroke-dasharray="377" :style="{ strokeDashoffset: latDash }" transform="rotate(150 80 78)" />
                <line class="gtick" x1="80" y1="10" x2="80" y2="20" transform="rotate(130 80 78)" stroke-width="2" />
                <g class="latDot" :style="{ transform: `rotate(${latDeg}deg)` }">
                  <circle cx="140" cy="78" r="5" fill="#f5c56b" /><circle cx="140" cy="78" r="9" fill="none" stroke="#e8b04b" stroke-width="1" opacity="0.45" />
                </g>
              </svg>
              <div class="gnum"><div class="n"><SdCountUp :value="medianH" /><em>h</em></div><div class="l sd-mono">MEDIAN</div></div>
            </div>
            <div class="pfoot"><span>submit → seal, trailing 30d · target tick at 48h</span></div>
          </div></div>
        </div>
        <!-- OWED -->
        <div class="pp pp-4" data-depth="0.9">
          <div class="pah-glass full"><div class="pin" style="--fd:11s;--fdel:.4s">
            <div class="ph"><span class="t sd-mono">OWED</span>
              <span class="pill red sd-mono">{{ stats?.owed ?? 0 }}</span></div>
            <div class="odots">
              <div v-for="o in owed.slice(0, 6)" :key="o.ticket_id" class="orow">
                <span class="odot" :class="ageDot(o.age_days)" /><span class="oid sd-mono">{{ o.ticket_number }}</span>
                <span class="osvc">{{ o.team_name || '—' }}</span><span class="od sd-mono">{{ o.age_days ?? 0 }}d</span>
              </div>
              <div v-if="!owed.length" class="mini-empty ok">No review debt. Clean floor.</div>
            </div>
            <div class="pfoot"><button class="plink sd-mono" @click="$emit('go', 'owed')">ENFORCE ↓</button></div>
          </div></div>
        </div>
        <!-- DISTRIBUTION FABRIC -->
        <div class="pp pp-5" data-depth="0.5">
          <div class="pah-glass full"><div class="pin" style="--fd:13s;--fdel:2.2s">
            <div class="ph"><span class="t sd-mono">DISTRIBUTION FABRIC</span><span class="pill sd-mono">PUBLISH FAN-OUT</span></div>
            <div ref="flowEl" class="flow">
              <div class="fnode"><div class="fl sd-mono">SEALED</div><div class="fv sd-mono">RECORD</div></div>
              <div class="flane" style="top:22%" /><div class="flane" style="top:50%" /><div class="flane" style="top:78%" />
              <div class="frec" :class="{ blip: blip === 0 }" style="top:calc(22% - 21px)"><span class="rl sd-mono">WATCHERS</span></div>
              <div class="frec" :class="{ blip: blip === 1 }" style="top:calc(50% - 21px)"><span class="rl sd-mono">ROSTER</span></div>
              <div class="frec" :class="{ blip: blip === 2 }" style="top:calc(78% - 21px)"><span class="rl sd-mono">TEAM LEADS</span></div>
              <span v-for="d in dots" :key="d.k" class="fdot" :style="d.style" />
            </div>
            <div class="pfoot">
              <span v-if="lastFan">last fan-out · <b class="fan">{{ lastFan.recipients }} recipients</b> · {{ lastFan.report }}</span>
              <span v-else>publishing notifies watchers ∪ response roster ∪ team leads</span>
              <span class="sd-mono tiny">ADMIN-ONLY VERB</span></div>
          </div></div>
        </div>
        <!-- ACTIONS -->
        <div class="pp pp-6" data-depth="0.7">
          <div class="pah-glass full"><div class="pin" style="--fd:10.5s;--fdel:1.1s">
            <div class="ph"><span class="t sd-mono">ACTION GOVERNANCE</span>
              <span class="pill sd-mono" :class="{ red: (counts?.overdue ?? 0) > 0 }">{{ counts?.overdue ?? 0 }} OVERDUE</span></div>
            <div class="ovbig">{{ counts?.overdue ?? 0 }}<small class="sd-mono">OVERDUE ACTIONS</small></div>
            <div class="sbar">
              <i class="sdone" :style="{ width: seg.done + '%' }" /><i class="sprog" :style="{ width: seg.prog + '%' }" />
              <i class="sopen" :style="{ width: seg.open + '%' }" /><i class="sovd" :style="{ width: seg.ovd + '%' }" />
            </div>
            <div class="slegend sd-mono">
              <span><i class="lg-done" />DONE {{ counts?.done ?? 0 }}</span><span><i class="lg-prog" />IN PROG {{ counts?.in_progress ?? 0 }}</span>
              <span><i class="lg-open" />OPEN {{ openOnly }}</span><span><i class="lg-ovd" />OVERDUE {{ counts?.overdue ?? 0 }}</span>
            </div>
            <div class="pfoot"><span>register-wide, approved + published reviews</span>
              <button class="plink sd-mono" @click="$emit('go', 'actions')">GOVERN ↓</button></div>
          </div></div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
/* SdPirAtriumHero — THE PARALLAX ATRIUM's hero (artifact C7, 1:1). A stats ribbon +
   six glass instrument panels floating at true z-depth, counter-shifting in parallax
   with the pointer; the docket panel plays an ATTEND float when a fresh submission
   arrives. All panels read the sealed board's lockstep stats — no invented numbers. */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  stats: { type: Object, default: null },      // board lockstep stats
  docket: { type: Array, default: () => [] },  // in_review rows
  owed: { type: Array, default: () => [] },    // owed rows
  counts: { type: Object, default: null },     // action counts {open,in_progress,done,overdue}
  lastFan: { type: Object, default: null },    // {recipients, report} — publish receipt
  arrivals: { type: Number, default: 0 },      // bump → attend float
})
defineEmits(['open-dossier', 'go'])

const heroEl = ref(null)
const stageEl = ref(null)
const flowEl = ref(null)
const attendOn = ref(false)
const blip = ref(-1)

const RM = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  && document.documentElement.getAttribute('data-cinematic') !== 'on'

const coverage = computed(() => Math.round(props.stats?.coverage_pct ?? 0))
const covDash = computed(() => (364.4 * (1 - coverage.value / 100)).toFixed(1))
const medianH = computed(() => Math.round(props.stats?.median_review_hours_30d ?? 0))
const latDash = computed(() => (377 - Math.min(1, medianH.value / 72) * 251.3).toFixed(1))
const latDeg = computed(() => Math.min(1, medianH.value / 72) * 240)
const followPct = computed(() => {
  const c = props.counts
  const total = (c?.open ?? 0) + (c?.done ?? 0)
  return total ? Math.round((c.done / total) * 100) : 0
})
const openOnly = computed(() => Math.max(0, (props.counts?.open ?? 0) - (props.counts?.in_progress ?? 0)))
const seg = computed(() => {
  const c = props.counts || {}
  const done = c.done ?? 0, prog = c.in_progress ?? 0, ovd = c.overdue ?? 0
  const open = Math.max(0, (c.open ?? 0) - prog - ovd)
  const total = Math.max(1, done + prog + open + ovd)
  return { done: (done / total) * 100, prog: (prog / total) * 100, open: (open / total) * 100, ovd: (ovd / total) * 100 }
})
const oldestWait = computed(() => {
  const oldest = props.docket.reduce((m, p) => (p.submitted_at && (!m || p.submitted_at < m) ? p.submitted_at : m), null)
  return oldest ? `oldest waiting ${ageShort(oldest)}` : 'queue is clear'
})
const oldestOwed = computed(() => {
  const d = Math.max(0, ...props.owed.map(o => o.age_days ?? 0))
  return props.owed.length ? `oldest ${d}d unreviewed` : 'no debt'
})
const initials = (n) => (n || '—').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const ageShort = (iso) => {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const d = Math.floor(ms / 86400000); const h = Math.floor((ms % 86400000) / 3600000)
  return d > 0 ? `${d}d ${h}h` : `${h}h`
}
const ageDot = (d) => (d >= 14 ? 'a4' : d >= 7 ? 'a3' : d >= 4 ? 'a2' : 'a1')

/* attend float on fresh submissions */
watch(() => props.arrivals, (n, o) => {
  if (n > (o ?? 0) && !RM) {
    attendOn.value = true
    setTimeout(() => { attendOn.value = false }, 3200)
  }
})

/* parallax engine */
let tx = 0, ty = 0, cx = 0, cy = 0, raf = null
const onMove = (e) => {
  if (RM || !heroEl.value) return
  const r = heroEl.value.getBoundingClientRect()
  tx = ((e.clientX - r.left) / r.width) * 2 - 1
  ty = ((e.clientY - r.top) / r.height) * 2 - 1
}
const onLeave = () => { tx = 0; ty = 0 }
const loop = () => {
  cx += (tx - cx) * 0.055; cy += (ty - cy) * 0.055
  if (heroEl.value) {
    heroEl.value.querySelectorAll('.pp').forEach((p) => {
      const d = +(p.dataset.depth || 0.5)
      if (!p.classList.contains('attend')) {
        p.style.transform = `translate3d(${(-cx * d * 26).toFixed(2)}px, ${(-cy * d * 16).toFixed(2)}px, 0)`
      }
    })
  }
  if (stageEl.value) {
    stageEl.value.style.transform = `rotateX(${(cy * -1.5).toFixed(2)}deg) rotateY(${(cx * 2.1).toFixed(2)}deg)`
  }
  raf = requestAnimationFrame(loop)
}

/* distribution fabric dots + blips */
const dots = ref([])
let blipTimer = null
onMounted(() => {
  if (!RM) {
    raf = requestAnimationFrame(loop)
    const lanes = [22, 50, 78]
    const out = []
    for (let l = 0; l < 3; l++) {
      for (let i = 0; i < 3; i++) {
        out.push({ k: `${l}-${i}`, style: { top: lanes[l] + '%', animationDelay: (l * 0.55 + i * 1.05) + 's' } })
      }
    }
    dots.value = out
    blipTimer = setInterval(() => {
      blip.value = Math.floor(Math.random() * 3)
      setTimeout(() => { blip.value = -1 }, 750)
    }, 5200)
  }
})
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf); clearInterval(blipTimer) })
</script>

<style scoped>
.pah { position: relative; perspective: 1700px; padding: 6px 0 10px; }
.pah-copy { margin-bottom: 30px; }
.pah-eyebrow { font-size: 11px; letter-spacing: 0.34em; color: var(--pat-amber-ink); display: flex; align-items: center; gap: 14px; }
.pah-eyebrow::after { content: ''; height: 1px; width: 120px; background: linear-gradient(90deg, var(--pat-line), transparent); }
/* !important re-pins vs theme-light-rescue's `[class*="page"] h1–h4` catch-all */
.pah-h1 { font-size: clamp(42px, 5vw, 68px); font-weight: 200; letter-spacing: -0.035em; line-height: 1.02;
  margin: 16px 0 12px; color: var(--sd-text) !important; }
.pah-h1 .g { background: linear-gradient(105deg, #f5c56b, var(--sd-pir-core) 45%, var(--sd-pir-deep));
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.pah-sub { font-size: 15px; color: var(--sd-text-secondary); max-width: 640px; font-weight: 300; line-height: 1.6; margin: 0; }

/* stats ribbon */
.pah-ribbon { display: grid; grid-template-columns: repeat(6, 1fr); border: 1px solid var(--pat-line); border-radius: 18px;
  background: var(--pat-panel); backdrop-filter: blur(20px) saturate(1.2); -webkit-backdrop-filter: blur(20px) saturate(1.2);
  box-shadow: var(--pat-shadow-soft), inset 0 1px 0 rgba(255, 244, 224, 0.07); overflow: hidden; position: relative;
  margin-bottom: 24px; will-change: transform; }
.pah-ribbon::after { content: ''; position: absolute; top: 0; left: -40%; width: 34%; height: 1px;
  background: linear-gradient(90deg, transparent, #f5c56b, transparent); animation: pah-sheen 7s linear infinite; opacity: 0.7; }
@keyframes pah-sheen { to { left: 110%; } }
.rs { padding: 18px 20px 15px; position: relative; transition: background 0.35s; }
.rs + .rs { border-left: 1px solid var(--pat-hair); }
.rs:hover { background: rgba(232, 176, 75, 0.05); }
.rs .lb { font-size: 9.5px; letter-spacing: 0.2em; color: var(--pat-ink3); margin-bottom: 9px; white-space: nowrap; }
.rs .v { font-size: 32px; font-weight: 200; letter-spacing: -0.02em; line-height: 1; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.rs .v em { font-style: normal; font-size: 15px; color: var(--pat-ink3); font-weight: 300; margin-left: 2px; }
.rs .d { font-size: 10px; margin-top: 8px; color: var(--pat-ink3); }
.rs .d.dn { color: var(--sd-pir-red); }
.rs.alert .v { color: var(--sd-pir-red); }
.rs::before { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px;
  background: linear-gradient(90deg, var(--sd-pir-core), transparent); transform: scaleX(0); transform-origin: left;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.rs:hover::before { transform: scaleX(1); }
@media (max-width: 1200px) { .pah-ribbon { grid-template-columns: repeat(3, 1fr); } .rs:nth-child(4) { border-left: none; } }

/* bento stage */
.pah-stage { transform-style: preserve-3d; will-change: transform; }
.pah-bento { display: grid; grid-template-columns: repeat(12, 1fr); gap: 18px; transform-style: preserve-3d; }
.pp { transform-style: preserve-3d; will-change: transform; position: relative; }
.pp-1 { grid-column: span 4; grid-row: span 2; }
.pp-2 { grid-column: span 3; } .pp-3 { grid-column: span 3; } .pp-4 { grid-column: span 2; }
.pp-5 { grid-column: span 5; } .pp-6 { grid-column: span 3; }
@media (max-width: 1080px) { .pp-1, .pp-2, .pp-3, .pp-4, .pp-5, .pp-6 { grid-column: span 12; grid-row: auto; } }
.pah-glass { position: relative; background: var(--pat-panel); border: 1px solid var(--pat-line); border-radius: 20px;
  backdrop-filter: blur(20px) saturate(1.25); -webkit-backdrop-filter: blur(20px) saturate(1.25);
  box-shadow: var(--pat-shadow-soft), inset 0 1px 0 rgba(255, 244, 224, 0.08); overflow: hidden; }
.pah-glass.full { height: 100%; }
.pin { position: relative; height: 100%; padding: 20px 22px; display: flex; flex-direction: column; z-index: 1;
  animation: pah-bob var(--fd, 9s) ease-in-out var(--fdel, 0s) infinite alternate; }
@keyframes pah-bob { from { transform: translateY(0); } to { transform: translateY(-6px); } }
.pp.attend .pah-glass { border-color: rgba(232, 176, 75, 0.55);
  box-shadow: var(--pat-shadow), 0 0 60px rgba(232, 176, 75, 0.22), inset 0 1px 0 rgba(255, 244, 224, 0.12); }
.pp.attend { transform: translateZ(70px) scale(1.03) !important; transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
.ph { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.ph .t { font-size: 10px; letter-spacing: 0.24em; color: var(--pat-ink3); }
.pill { font-size: 10px; padding: 3px 9px; border-radius: 99px; border: 1px solid var(--pat-line); color: var(--pat-amber-ink);
  font-variant-numeric: tabular-nums; }
.pill.red { color: var(--sd-pir-red); border-color: rgba(239, 68, 68, 0.4); }
.pfoot { margin-top: auto; padding-top: 12px; font-size: 10.5px; color: var(--pat-ink3); display: flex;
  justify-content: space-between; align-items: center; gap: 10px; }
.pfoot .fan { color: var(--pat-amber-ink); font-weight: 500; font-variant-numeric: tabular-nums; }
.pfoot .tiny { font-size: 9px; }
.plink { background: none; border: none; font-size: 10.5px; letter-spacing: 0.12em; color: var(--pat-amber-ink);
  padding: 4px 0; border-bottom: 1px solid transparent; transition: border-color 0.3s; cursor: pointer; }
.plink:hover { border-color: var(--sd-pir-core); }

/* mini docket */
.mini-list { flex: 1; }
.mrow { display: flex; align-items: center; gap: 11px; padding: 11px 10px; border-radius: 12px; cursor: pointer;
  width: 100%; text-align: left; background: none; font-family: inherit; color: inherit;
  border: 1px solid transparent; transition: background 0.3s, border-color 0.3s, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
.mrow:hover { background: var(--pat-panel2); border-color: var(--pat-line-soft); transform: translateX(5px); }
.mrow + .mrow { margin-top: 4px; }
.sev { font-size: 9px; letter-spacing: 0.1em; padding: 3px 7px; border-radius: 6px; flex-shrink: 0; }
.sev.s1 { color: var(--sd-pir-red); background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); }
.sev.s2 { color: var(--pat-amber-ink); background: rgba(232, 176, 75, 0.1); border: 1px solid var(--pat-line); }
.mtx { flex: 1; min-width: 0; }
.mid { font-size: 10px; color: var(--pat-amber-ink); letter-spacing: 0.08em; }
.mtitle { display: block; font-size: 12.5px; color: var(--sd-text); white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; font-weight: 300; margin-top: 2px; }
.ava { width: 26px; height: 26px; border-radius: 50%; display: inline-grid; place-items: center; flex-shrink: 0;
  font-size: 9.5px; color: #f5c56b; background: linear-gradient(140deg, rgba(232, 176, 75, 0.22), rgba(180, 83, 9, 0.16));
  border: 1px solid var(--pat-line); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
[data-theme="light"] .ava { color: var(--sd-pir-deep); }
.mrow:hover .ava { transform: scale(1.12); }
.mage { font-size: 10px; color: var(--pat-ink3); flex-shrink: 0; }
.mini-empty { padding: 18px 10px; font-size: 12px; color: var(--pat-ink3); }
.mini-empty.ok { color: var(--sd-pir-em); }

/* gauges */
.gwrap { display: flex; align-items: center; justify-content: center; flex: 1; position: relative; }
.gnum { position: absolute; text-align: center; }
.gnum .n { font-size: 33px; font-weight: 200; letter-spacing: -0.02em; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.gnum .n em { font-style: normal; font-size: 15px; color: var(--pat-ink3); }
.gnum .l { font-size: 9px; letter-spacing: 0.18em; color: var(--pat-ink3); margin-top: 3px; }
.arcTrack { stroke: var(--pat-line-soft); fill: none; }
.arcVal { fill: none; stroke-linecap: round; transition: stroke-dashoffset 1.7s cubic-bezier(0.16, 1, 0.3, 1); }
.gtick { stroke: var(--pat-ink3); opacity: 0.6; }
.latDot { transform-origin: 80px 78px; transition: transform 1.7s cubic-bezier(0.16, 1, 0.3, 1); }

/* owed dots */
.odots { flex: 1; }
.orow { display: flex; align-items: center; gap: 10px; padding: 8px 4px; font-size: 11px; }
.orow + .orow { border-top: 1px solid var(--pat-hair); }
.odot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.odot.a1 { background: rgba(232, 176, 75, 0.55); }
.odot.a2 { background: var(--sd-pir-core); }
.odot.a3 { background: #d97706; box-shadow: 0 0 8px rgba(217, 119, 6, 0.5); }
.odot.a4 { background: var(--sd-pir-red); box-shadow: 0 0 10px rgba(239, 68, 68, 0.6); animation: pah-opulse 1.8s ease-in-out infinite; }
@keyframes pah-opulse { 50% { box-shadow: 0 0 18px rgba(239, 68, 68, 0.9); } }
.orow .oid { color: var(--pat-amber-ink); font-size: 10px; }
.orow .osvc { color: var(--pat-ink3); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.orow .od { color: var(--pat-ink2); font-variant-numeric: tabular-nums; }

/* distribution flow */
.flow { position: relative; flex: 1; min-height: 118px; }
.fnode { position: absolute; left: 0; top: 50%; transform: translateY(-50%); text-align: center;
  padding: 10px 13px; border: 1px solid var(--pat-line); border-radius: 12px; background: var(--pat-panel2); }
.fnode .fl { font-size: 8.5px; letter-spacing: 0.2em; color: var(--pat-ink3); }
.fnode .fv { font-size: 13px; color: var(--pat-amber-ink); margin-top: 3px; }
.frec { position: absolute; right: 0; display: flex; align-items: center; gap: 9px; padding: 10px 13px;
  border: 1px solid var(--pat-line-soft); border-radius: 10px; background: var(--pat-panel);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s; }
.frec:hover { transform: translateX(-3px); border-color: var(--pat-line); }
.frec .rl { font-size: 9px; letter-spacing: 0.16em; color: var(--pat-ink3); }
.frec.blip { animation: pah-blip 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes pah-blip { 30% { border-color: var(--sd-pir-core); box-shadow: 0 0 22px rgba(232, 176, 75, 0.3); } }
.flane { position: absolute; left: 96px; right: 118px; height: 1px;
  background: repeating-linear-gradient(90deg, var(--pat-line-soft) 0 5px, transparent 5px 11px); }
.fdot { position: absolute; left: 96px; width: 5px; height: 5px; border-radius: 50%; background: var(--sd-pir-core);
  margin-top: -2px; box-shadow: 0 0 8px rgba(232, 176, 75, 0.8); opacity: 0; animation: pah-fgo 3.1s linear infinite; }
@keyframes pah-fgo { 0% { transform: translateX(0); opacity: 0; } 12% { opacity: 1; } 82% { opacity: 1; }
  100% { transform: translateX(min(52vw, 300px)); opacity: 0; } }

/* actions mini */
.ovbig { font-size: 44px; font-weight: 200; letter-spacing: -0.03em; color: var(--sd-pir-red); line-height: 1;
  font-variant-numeric: tabular-nums; }
.ovbig small { font-size: 11px; letter-spacing: 0.2em; color: var(--pat-ink3); font-weight: 400; margin-left: 8px; }
.sbar { display: flex; height: 7px; border-radius: 99px; overflow: hidden; margin: 16px 0 9px; background: var(--pat-panel2); }
.sbar i { display: block; height: 100%; transform-origin: left; animation: pah-grow 1.2s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes pah-grow { from { transform: scaleX(0); } }
.sbar .sdone { background: var(--sd-pir-em); } .sbar .sprog { background: var(--sd-pir-core); }
.sbar .sopen { background: rgba(232, 176, 75, 0.25); } .sbar .sovd { background: var(--sd-pir-red); }
.slegend { display: flex; gap: 13px; font-size: 9.5px; color: var(--pat-ink3); flex-wrap: wrap; }
.slegend i { display: inline-block; width: 7px; height: 7px; border-radius: 2px; margin-right: 5px; }
.slegend .lg-done { background: var(--sd-pir-em); } .slegend .lg-prog { background: var(--sd-pir-core); }
.slegend .lg-open { background: rgba(232, 176, 75, 0.3); } .slegend .lg-ovd { background: var(--sd-pir-red); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .pin,
  html:not([data-cinematic="on"]) .pah-ribbon::after,
  html:not([data-cinematic="on"]) .fdot,
  html:not([data-cinematic="on"]) .odot.a4,
  html:not([data-cinematic="on"]) .sbar i { animation: none; }
}
</style>
