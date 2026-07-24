<template>
  <!-- SdRcaAgentHero — "THE TEARDOWN" (concept A7), ported WHOLE from the artifact:
       the selected (or worst-owed) incident explodes into five z-spaced glass plates
       on the --sd-rca-stage void — hairline leader lines to part-number callouts,
       the failing plate (rca_category) glowing defect-red under a slow inspection
       ring, pointer parallax on the stack, five-whys typeset along the callouts,
       and a reassembly pass when the selected unit is VALIDATED. Around the
       instrument: monumental headline, live coverage split + debt aging, and the
       intake tray of the next owed units. Stage is dark in BOTH themes. -->
  <section class="rah" aria-label="Root cause bench — the Teardown">
    <!-- ═══ head band · TEARDOWN topbar (A7 1:1): headline left, bench-live LED +
         live clock + agent chip right — coverage/aging live in the body readout ═══ -->
    <div class="rah-band">
      <div class="rah-lead">
        <span class="rah-eyebrow sd-mono"><Layers :size="11" /> FOURCONNECT SUPPORT DESK · ROOT CAUSE ANALYSIS · AGENT</span>
        <h1 class="rah-h1">THE <em>TEARDOWN</em></h1>
        <p class="rah-sub">Explode the incident. Isolate the failing part. Ship the service bulletin.</p>
      </div>

      <div class="rah-topmeta">
        <span class="rah-led sd-mono"><i aria-hidden="true" />BENCH LIVE</span>
        <div class="rah-clockbox">
          <span class="rc-date sd-mono">{{ dateLine }}</span>
          <span class="rc-clock sd-mono">{{ clockLine }}</span>
        </div>
        <div class="rah-agent">
          <span class="ra-ava sd-mono">{{ meInitials }}</span>
          <span class="ra-col">
            <span class="ra-name">{{ meName }}</span>
            <small class="sd-mono">{{ meRole }}</small>
          </span>
        </div>
      </div>
    </div>

    <!-- ═══ THE TEARDOWN stage · exploded view ═══ -->
    <div ref="stageRef" class="rah-stage" @pointermove="onMove" @pointerleave="onLeave">
      <span class="stage-grid" aria-hidden="true" />

      <div class="stage-head">
        <span class="unit sd-mono">
          <template v-if="featured">UNIT <b>{{ featured.ticket_number }}</b> · <span class="u-sev">SEV{{ featured.sev }}</span> · EXPLODED VIEW</template>
          <template v-else>BENCH IDLE · NO UNIT ON THE STAND</template>
        </span>
        <button class="replay sd-mono" :disabled="idle" @click="replay">⟲ REPLAY REASSEMBLY</button>
        <Transition name="rah-pop">
          <span v-if="assembled && featuredStatus === 'validated'" class="sealed sd-mono">✓ REASSEMBLED · UNIT VALIDATED</span>
        </Transition>
        <Transition name="rah-pop">
          <span v-if="glint" class="arrive sd-mono">+{{ glintN }} NEW ON THE BENCH</span>
        </Transition>
      </div>

      <div class="rig" aria-hidden="true">
        <div ref="rotRef" class="stack-rot">
          <div class="stack-float">
            <span class="seam" :class="{ flash: seamFlash }" />
            <div v-for="(p, i) in PLATES" :key="p.pn" class="plate"
              :class="{ on: platesOn, fail: i === failIdx && !idle }"
              :style="{ transform: `translateZ(${assembled ? 0 : (i - 2) * SPACING}px)`, transitionDelay: `${i * 0.09}s` }">
              <span class="pn sd-mono">{{ p.pn }} / REV {{ p.rev }}</span>
              <span class="pname">{{ p.name }}</span>
              <span class="ptag sd-mono">{{ plateTag(i) }}</span>
              <span class="serial sd-mono">SN {{ featured?.ticket_number || 'FC-0000' }}-{{ 'ABCDE'[i] }}</span>
              <svg v-if="i === 0" width="280" height="132" viewBox="0 0 300 150">
                <path class="schem" d="M14 110 L70 110 L100 52 L170 52 L200 98 L286 98" />
                <path class="flow" d="M14 110 L70 110 L100 52 L170 52 L200 98 L286 98" />
                <circle class="node" cx="14" cy="110" r="4" /><circle class="node" cx="100" cy="52" r="4" />
                <circle class="node" cx="170" cy="52" r="4" /><circle class="node" cx="286" cy="98" r="4" />
                <path class="schem-dim" d="M14 128 L286 128" stroke-dasharray="2 6" />
              </svg>
              <svg v-else-if="i === 1" width="280" height="132" viewBox="0 0 300 150">
                <rect class="schem" x="20" y="30" width="72" height="40" rx="8" />
                <rect class="schem" x="114" y="30" width="72" height="40" rx="8" />
                <rect class="schem" x="208" y="30" width="72" height="40" rx="8" />
                <rect class="schem-dim" x="66" y="92" width="168" height="34" rx="8" />
                <path class="schem-dim" d="M56 70 L104 92 M150 70 L150 92 M244 70 L196 92" />
                <path class="flow half" d="M20 50 L280 50" />
              </svg>
              <svg v-else-if="i === 2" width="280" height="132" viewBox="0 0 300 150">
                <path class="schem" d="M60 45 L84 31 L108 45 L108 73 L84 87 L60 73 Z" />
                <path class="schem" d="M138 65 L162 51 L186 65 L186 93 L162 107 L138 93 Z" />
                <path class="schem" d="M216 40 L240 26 L264 40 L264 68 L240 82 L216 68 Z" />
                <path class="schem-dim" d="M108 59 L138 79 M186 79 L216 54" />
                <path class="flow half" d="M84 87 L84 120 L240 120 L240 82" />
              </svg>
              <svg v-else-if="i === 3" width="280" height="132" viewBox="0 0 300 150">
                <rect class="schem-dim" x="24" y="28" width="252" height="18" rx="9" />
                <rect class="schem-dim" x="24" y="56" width="252" height="18" rx="9" />
                <rect class="schem hotline" x="24" y="84" width="252" height="18" rx="9" />
                <rect class="schem-dim" x="24" y="112" width="252" height="18" rx="9" />
                <circle class="node" cx="258" cy="37" r="5" /><circle class="node" cx="42" cy="65" r="5" />
                <circle class="node hotnode" cx="258" cy="93" r="5" /><circle class="node" cx="42" cy="121" r="5" />
              </svg>
              <svg v-else width="280" height="132" viewBox="0 0 300 150">
                <circle class="schem" cx="70" cy="52" r="14" />
                <path class="schem" d="M46 104 Q70 78 94 104" />
                <circle class="schem-dim" cx="230" cy="52" r="14" />
                <path class="schem-dim" d="M206 104 Q230 78 254 104" />
                <path class="flow half" d="M96 66 L204 66" />
                <path class="schem-dim" d="M204 60 L212 66 L204 72" />
              </svg>
              <span :ref="(el) => { anchorEls[i] = el }" class="anchor" />
              <span class="fail-ring">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle class="ring-a" cx="60" cy="60" r="52" stroke-dasharray="10 7" />
                  <circle class="ring-b" cx="60" cy="60" r="38" />
                </svg>
              </span>
              <span class="fail-badge sd-mono">FAILING PART · {{ catLabel }}</span>
            </div>
          </div>
        </div>
      </div>

      <svg ref="leaderRef" class="leader-svg" aria-hidden="true">
        <template v-for="(p, i) in PLATES" :key="`ld-${p.pn}`">
          <path :ref="(el) => { leaderPathEls[i] = el }" class="leader" :class="{ hot: i === failIdx && !idle }" />
          <circle :ref="(el) => { leaderDotEls[i] = el }" r="3" class="leader-dot" :class="{ hot: i === failIdx && !idle }" />
        </template>
      </svg>

      <div class="co-field">
        <div v-for="(p, i) in PLATES" :key="`co-${p.pn}`" :ref="(el) => { calloutEls[i] = el }"
          class="callout" :class="[CO_POS[i], { hot: i === failIdx && !idle, ghost: !whys[i] }]">
          <div class="c-pn sd-mono">{{ p.pn }} · {{ p.name }}</div>
          <div class="c-why sd-mono">WHY ×{{ i + 1 }}<template v-if="i === 4"> · ROOT</template></div>
          <p>{{ whys[i] || (idle ? 'No unit on the bench — the intake tray feeds this instrument.' : 'Unsymbolicated — descend this why on the workbench.') }}</p>
        </div>
      </div>

      <div class="stage-foot sd-mono">
        <span><b>POINTER</b> TILTS THE STACK</span>
        <span><b>RED PLATE</b> FAILING PART · SLOW ROTATION</span>
        <span><b>VALIDATED</b> PLAYS THE REASSEMBLY PASS</span>
      </div>
    </div>

    <!-- ═══ intake tray · next owed units ═══ -->
    <div class="rah-tray">
      <span class="tray-lab sd-mono">INTAKE TRAY · NEXT UNITS AWAITING TEARDOWN</span>
      <div class="tray-track">
        <button v-for="t in tray" :key="String(t.ticket_id)" class="tunit" :class="{ fresh: freshIds.has(String(t.ticket_id)) }"
          :title="t.subject" @click="emit('focus', t.ticket_id)">
          <svg class="tu-glyph" width="52" height="34" viewBox="0 0 72 46" aria-hidden="true">
            <rect class="g-dim" x="16" y="2" width="40" height="7" rx="3" transform="skewX(-18)" />
            <rect class="g-am" x="16" y="13" width="40" height="7" rx="3" transform="skewX(-18)" />
            <rect class="g-hot" x="16" y="24" width="40" height="7" rx="3" transform="skewX(-18)" />
            <rect class="g-dim" x="16" y="35" width="40" height="7" rx="3" transform="skewX(-18)" />
          </svg>
          <span class="tu-col">
            <span class="tu-id sd-mono">{{ t.ticket_number }}</span>
            <span class="tu-sub">{{ t.subject }}</span>
          </span>
          <span class="tu-right">
            <span class="tu-sev sd-mono" :class="`s${t.sev}`">SEV{{ t.sev }}</span>
            <span class="tu-age sd-mono">{{ ageOf(t) }}</span>
          </span>
          <span class="tu-open" role="button" aria-label="Open incident" @click.stop="emit('open', t.ticket_id)">
            <ArrowUpRight :size="11" /></span>
        </button>
        <div v-if="!tray.length" class="tray-empty sd-mono">TRAY CLEAR — NO UNITS AWAITING TEARDOWN</div>
      </div>
    </div>
  </section>
</template>

<script setup>
/*
  Contract (frozen): props { board, stats, analytics, aging, arrivals, now, reduced,
  activeLens, selected } · emits ['lens','open','focus','arrivals-seen'].
  All lens-count reads route through RCA_LENSES.stat (never inline stats.x).
*/
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, onBeforeUpdate } from 'vue'
import { Layers, ArrowUpRight } from 'lucide-vue-next'
import { rcaStatusOf, fetchMe } from '@/composables/useSupportDesk'

const props = defineProps({
  board: { type: Array, default: () => [] },
  stats: { type: Object, default: null },
  analytics: { type: Object, default: null },
  aging: { type: Object, default: null },
  arrivals: { type: Object, default: () => ({ count: 0, ids: [] }) },
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
  activeLens: { type: String, default: 'owed' },
  selected: { type: Object, default: null },
})
const emit = defineEmits(['lens', 'open', 'focus', 'arrivals-seen'])

/* ── plate taxonomy: PT numbers mirror the exploded view AND the callouts ── */
const SPACING = 74
const PLATES = [
  { pn: 'PT-01', rev: 'C', name: 'Request Path' },
  { pn: 'PT-02', rev: 'F', name: 'Service Plane' },
  { pn: 'PT-03', rev: 'B', name: 'Dependency' },
  { pn: 'PT-04', rev: 'A', name: 'Configuration' },
  { pn: 'PT-05', rev: 'D', name: 'Human Factor' },
]
const CO_POS = ['co-l1', 'co-r1', 'co-l2', 'co-r2', 'co-r3']
const CAT_TO_PLATE = { network: 0, software: 1, hardware: 2, vendor: 2, configuration: 3, user_error: 4 }
const LIVE = new Set(['filed', 'validated'])

/* ── featured unit: selected, else worst owed (highest sev then oldest) ── */
const owedRows = computed(() => (props.board || []).filter((r) => !LIVE.has(rcaStatusOf(r))))
const featured = computed(() => {
  if (props.selected) return props.selected
  const worst = [...owedRows.value].sort((a, b) =>
    (a.sev ?? 4) - (b.sev ?? 4) || (b.owed_age_hours ?? 0) - (a.owed_age_hours ?? 0))[0]
  return worst || (props.board || [])[0] || null
})
const idle = computed(() => !featured.value)
const featuredStatus = computed(() => (featured.value ? rcaStatusOf(featured.value) : 'owed'))
const failIdx = computed(() => {
  const c = featured.value?.rca_category
  return c != null && CAT_TO_PLATE[c] != null ? CAT_TO_PLATE[c] : 4
})
const catLabel = computed(() => (featured.value?.rca_category || 'undetermined').replace(/_/g, ' ').toUpperCase())
const whys = computed(() => {
  const list = Array.isArray(featured.value?.rca_five_whys) ? featured.value.rca_five_whys : []
  return PLATES.map((_, i) => (list[i] || '').trim() || null)
})
const plateTag = (i) => {
  const r = featured.value
  if (i === 0) return 'INGRESS → EDGE → SVC'
  if (i === 1) return `${(r?.team_name || 'SERVICE DESK').toUpperCase()} · WORKER POOL`
  if (i === 2) return 'VENDOR · DNS · STORAGE'
  if (i === 3) return r?.breach_reason ? r.breach_reason.slice(0, 34).toUpperCase() : 'FLAGS · ENVELOPES · LIMITS'
  return 'REVIEW GATE · HANDOFF · ON-CALL'
}

/* ── topbar identity + clock (A7: BENCH LIVE · clock · agent chip) ── */
const me = ref(null)
const meName = computed(() => me.value?.full_name || me.value?.email || 'Agent')
const meInitials = computed(() => meName.value.split(/\s+/).map((w) => w[0]).filter(Boolean)
  .slice(0, 2).join('').toUpperCase() || 'AG')
const meRole = computed(() => (me.value?.is_superuser
  ? 'DESK ADMIN · FULL DESK' : 'SUPPORT AGENT · TEAM-SEALED BENCH'))
const dateLine = computed(() => {
  const d = new Date(props.now)
  const wd = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()]
  return `${wd} · ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
const clockLine = computed(() => {
  const d = new Date(props.now)
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':')
})

/* ── intake tray: the next 5 owed units after the featured one ── */
const tray = computed(() => owedRows.value
  .filter((r) => String(r.ticket_id) !== String(featured.value?.ticket_id))
  .slice(0, 5))
const ageOf = (t) => {
  const stamp = t.resolved_at || t.closed_at
  const h = stamp ? Math.max(0, (props.now - Date.parse(stamp)) / 36e5) : (t.owed_age_hours ?? 0)
  if (h < 48) return `T+${Math.round(h)}h`
  return `T+${Math.floor(h / 24)}d ${String(Math.round(h % 24)).padStart(2, '0')}h`
}

/* ── arrivals: glint sweep, then hand the counter back to the desk ── */
const glint = ref(false)
const glintN = ref(0)
const freshIds = ref(new Set())
let glintT = null
watch(() => props.arrivals?.count, (n) => {
  if (!n) return
  glintN.value = n
  freshIds.value = new Set((props.arrivals?.ids || []).map(String))
  glint.value = true
  clearTimeout(glintT)
  glintT = setTimeout(() => { glint.value = false; freshIds.value = new Set(); emit('arrivals-seen') }, 2400)
})

/* ── explode / reassemble choreography ── */
const platesOn = ref(false)
const assembled = ref(true)
const seamFlash = ref(false)
let swapT = null
let seamT = null
const pulseSeam = () => {
  seamFlash.value = false
  seamT = setTimeout(() => { seamFlash.value = true; seamT = setTimeout(() => { seamFlash.value = false }, 1150) }, 40)
}
const choreograph = () => {
  clearTimeout(swapT)
  const validated = featuredStatus.value === 'validated'
  if (props.reduced) { assembled.value = validated; nextTick(() => drawLeaders()); return }
  assembled.value = true
  if (validated) { pulseSeam(); return }          // reassembly pass — plates stay seated
  swapT = setTimeout(() => { assembled.value = false }, 700)
}
watch(() => `${featured.value?.ticket_id ?? 'none'}:${featuredStatus.value}`, () => choreograph())

/* ── ⟲ replay reassembly (A7 hero verb): seat the plates, flash the seam,
   then re-explode unless the unit is validated (validated stays seated) ── */
const replay = () => {
  if (idle.value) return
  clearTimeout(swapT)
  assembled.value = true
  pulseSeam()
  if (!props.reduced && featuredStatus.value !== 'validated') {
    swapT = setTimeout(() => { assembled.value = false }, 1400)
  }
}

/* ── pointer parallax + leader-line loop (rAF lerp, gated by `reduced`) ── */
const stageRef = ref(null)
const rotRef = ref(null)
const leaderRef = ref(null)
const anchorEls = []
const calloutEls = []
const leaderPathEls = []
const leaderDotEls = []
onBeforeUpdate(() => { anchorEls.length = 0; calloutEls.length = 0; leaderPathEls.length = 0; leaderDotEls.length = 0 })

const BASE_RX = 56
const BASE_RZ = -32
const tgt = { x: 0, y: 0 }
const cur = { x: 0, y: 0 }
let raf = null
const onMove = (e) => {
  if (props.reduced) return
  const r = stageRef.value?.getBoundingClientRect()
  if (!r) return
  tgt.x = ((e.clientY - r.top) / r.height - 0.5) * 10
  tgt.y = ((e.clientX - r.left) / r.width - 0.5) * 12
}
const onLeave = () => { tgt.x = 0; tgt.y = 0 }
const drawLeaders = () => {
  const stage = stageRef.value
  const svg = leaderRef.value
  if (!stage || !svg || !svg.clientWidth) return
  const hr = stage.getBoundingClientRect()
  for (let i = 0; i < 5; i++) {
    const a = anchorEls[i]; const c = calloutEls[i]; const p = leaderPathEls[i]; const d = leaderDotEls[i]
    if (!a || !c || !p || !d) continue
    const ar = a.getBoundingClientRect(); const cr = c.getBoundingClientRect()
    const ax = ar.left + ar.width / 2 - hr.left
    const ay = ar.top + ar.height / 2 - hr.top
    const onL = CO_POS[i].startsWith('co-l')
    const cx = (onL ? cr.right : cr.left) - hr.left
    const cy = cr.top + cr.height / 2 - hr.top
    const midX = onL ? Math.max(cx + 26, ax - 60) : Math.min(cx - 26, ax + 60)
    p.setAttribute('d', `M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${midX.toFixed(1)} ${cy.toFixed(1)} L ${cx.toFixed(1)} ${cy.toFixed(1)}`)
    d.setAttribute('cx', ax.toFixed(1)); d.setAttribute('cy', ay.toFixed(1))
  }
}
const loop = () => {
  cur.x += (tgt.x - cur.x) * 0.06
  cur.y += (tgt.y - cur.y) * 0.06
  if (rotRef.value) rotRef.value.style.transform = `rotateX(${BASE_RX + cur.x}deg) rotateZ(${BASE_RZ + cur.y}deg)`
  drawLeaders()
  raf = requestAnimationFrame(loop)
}
const startMotion = () => {
  if (rotRef.value) rotRef.value.style.transform = `rotateX(${BASE_RX}deg) rotateZ(${BASE_RZ}deg)`
  cancelAnimationFrame(raf)
  if (!props.reduced) raf = requestAnimationFrame(loop)
  else nextTick(() => setTimeout(drawLeaders, 60))
}
watch(() => props.reduced, () => startMotion())

let entranceT = null
const onResize = () => drawLeaders()
onMounted(() => {
  fetchMe().then((u) => { me.value = u }).catch(() => {})
  startMotion()
  window.addEventListener('resize', onResize)
  platesOn.value = true
  if (props.reduced) { assembled.value = featuredStatus.value === 'validated' }
  else entranceT = setTimeout(() => { if (featuredStatus.value !== 'validated') assembled.value = false }, 380)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearTimeout(swapT); clearTimeout(seamT); clearTimeout(glintT); clearTimeout(entranceT)
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.rah { display: flex; flex-direction: column; gap: 0; border-radius: 20px; overflow: hidden;
  border: 1px solid var(--sd-rca-brd);
  background: linear-gradient(180deg, color-mix(in srgb, var(--sd-rca-stage) 92%, var(--sd-rca-core)) 0%, var(--sd-rca-stage) 30%); }

/* ══ head band — editorial headline + readouts (over the stage, stage-ink family) ══ */
.rah-band { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px;
  flex-wrap: wrap; padding: 22px 26px 8px; }
.rah-lead { min-width: 260px; flex: 1; }
.rah-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.3em; color: var(--sd-rca-stage-dim); }
.rah-h1 { margin: 10px 0 4px; font-size: clamp(24px, 3.4vw, 42px); font-weight: 200;
  letter-spacing: 0.08em; line-height: 1.05; color: var(--sd-rca-stage-ink); }
.rah-h1 b { font-weight: 800; color: var(--sd-rca-core); }
.rah-h1 em { font-style: normal; font-weight: 700; background: var(--sd-rca-grad);
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.rah-sub { margin: 0; font-size: 12px; color: var(--sd-rca-stage-dim); letter-spacing: 0.02em; }

/* ── topmeta (A7): BENCH LIVE led · clockbox · agent chip ── */
.rah-topmeta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  justify-content: flex-end; padding-top: 6px; }
.rah-led { display: inline-flex; align-items: center; gap: 7px; font-size: 9px; font-weight: 700;
  letter-spacing: 0.24em; color: var(--sd-rca-live); }
.rah-led i { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-rca-live);
  box-shadow: 0 0 10px var(--sd-rca-live); animation: rah-blink 1.8s infinite; }
@keyframes rah-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
.rah-clockbox { display: grid; gap: 3px; justify-items: end; }
.rc-date { font-size: 9px; letter-spacing: 0.22em; color: var(--sd-rca-stage-dim);
  text-transform: uppercase; }
.rc-clock { font-size: 19px; font-weight: 600; color: var(--sd-rca-stage-ink);
  font-variant-numeric: tabular-nums; letter-spacing: 0.05em; line-height: 1; }
.rah-agent { display: flex; align-items: center; gap: 10px; padding: 8px 14px 8px 9px;
  border-radius: 999px; border: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 16%, transparent);
  background: color-mix(in srgb, var(--sd-rca-stage) 55%, transparent); backdrop-filter: blur(8px); }
.ra-ava { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
  font-size: 9.5px; font-weight: 800; color: var(--sd-rca-stage);
  background: var(--sd-rca-grad); flex: 0 0 auto; }
.ra-col { display: grid; gap: 1px; min-width: 0; }
.ra-name { font-size: 12px; font-weight: 600; color: var(--sd-rca-stage-ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
.rah-agent small { font-size: 8px; letter-spacing: 0.1em; color: var(--sd-rca-stage-dim); }

/* ══ the stage — exploded view void (dark BOTH themes by token decree) ══ */
.rah-stage { position: relative; height: clamp(440px, 52vh, 640px); overflow: hidden; }
.stage-grid { position: absolute; inset: 0; opacity: 0.4; pointer-events: none;
  background:
    linear-gradient(var(--sd-rca-stage-line) 1px, transparent 1px) 0 0 / 100% 64px,
    linear-gradient(90deg, var(--sd-rca-stage-line) 1px, transparent 1px) 0 0 / 64px 100%;
  mask-image: radial-gradient(70% 70% at 50% 50%, #000 30%, transparent 100%);
  -webkit-mask-image: radial-gradient(70% 70% at 50% 50%, #000 30%, transparent 100%); }
.stage-head { position: absolute; top: 14px; left: 26px; right: 26px; z-index: 9;
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.unit { font-size: 11px; letter-spacing: 0.14em; color: var(--sd-rca-stage-dim);
  border: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 16%, transparent); border-radius: 8px;
  padding: 7px 13px; background: color-mix(in srgb, var(--sd-rca-stage) 60%, transparent);
  backdrop-filter: blur(8px); }
.unit b { color: var(--sd-rca-core); }
.unit .u-sev { color: var(--sd-rca-defect); font-weight: 800; }
.replay { font-size: 8.5px; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer;
  color: var(--sd-rca-stage-dim); border: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 16%, transparent);
  border-radius: 999px; padding: 8px 15px; background: transparent;
  transition: color 0.2s, border-color 0.2s, transform 0.2s; }
.replay:hover:not(:disabled) { color: var(--sd-rca-live);
  border-color: color-mix(in srgb, var(--sd-rca-live) 50%, transparent); transform: translateY(-1px); }
.replay:disabled { opacity: 0.4; cursor: default; }
.sealed { font-size: 9.5px; letter-spacing: 0.18em; color: var(--sd-rca-live); font-weight: 800;
  border: 1px solid color-mix(in srgb, var(--sd-rca-live) 45%, transparent); border-radius: 999px;
  padding: 6px 13px; background: var(--sd-rca-live-soft); }
.arrive { margin-left: auto; font-size: 9.5px; letter-spacing: 0.18em; color: var(--sd-rca-hi);
  font-weight: 800; border: 1px solid var(--sd-rca-brd); border-radius: 999px; padding: 6px 13px;
  background: var(--sd-rca-soft); overflow: hidden; position: relative; }
.arrive::after { content: ""; position: absolute; inset: 0;
  background: linear-gradient(110deg, transparent 25%, var(--sd-rca-hi-soft) 50%, transparent 75%);
  animation: rah-glint 1.1s ease-out 2; }
@keyframes rah-glint { from { transform: translateX(-110%); } to { transform: translateX(110%); } }
.rah-pop-enter-active, .rah-pop-leave-active { transition: opacity 0.35s, transform 0.35s var(--sd-spring); }
.rah-pop-enter-from, .rah-pop-leave-to { opacity: 0; transform: translateY(-6px); }

.rig { position: absolute; inset: 0; perspective: 1500px; z-index: 2; }
.stack-rot { position: absolute; left: 50%; top: 55%; width: 0; height: 0;
  transform-style: preserve-3d; will-change: transform; }
.stack-float { position: absolute; left: 0; top: 0; transform-style: preserve-3d;
  animation: rah-floaty 8s ease-in-out infinite; }
@keyframes rah-floaty { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
.plate { position: absolute; left: -170px; top: -105px; width: 340px; height: 210px; border-radius: 20px;
  transform-style: preserve-3d; opacity: 0;
  background: linear-gradient(150deg, color-mix(in srgb, var(--sd-rca-stage-ink) 8%, transparent),
    color-mix(in srgb, var(--sd-rca-stage-ink) 2%, transparent));
  border: 1px solid color-mix(in srgb, var(--sd-rca-stage-dim) 42%, transparent);
  box-shadow: 0 30px 80px color-mix(in srgb, var(--sd-rca-stage) 60%, transparent),
    inset 0 0 40px color-mix(in srgb, var(--sd-rca-stage-ink) 3%, transparent);
  backdrop-filter: blur(4px);
  transition: transform 1.1s var(--sd-spring), box-shadow 0.5s, border-color 0.5s, opacity 0.8s; }
.plate.on { opacity: 1; }
.plate .pn { position: absolute; left: 16px; top: 12px; font-size: 9px; letter-spacing: 0.24em;
  color: var(--sd-rca-stage-dim); }
.plate .pname { position: absolute; right: 16px; top: 12px; font-size: 9px; letter-spacing: 0.26em;
  text-transform: uppercase; color: var(--sd-rca-stage-dim); font-weight: 700; }
.plate .ptag { position: absolute; left: 16px; bottom: 26px; font-size: 7.5px; letter-spacing: 0.2em;
  color: color-mix(in srgb, var(--sd-rca-stage-dim) 80%, transparent); }
.plate .serial { position: absolute; left: 16px; bottom: 10px; font-size: 8px; letter-spacing: 0.18em;
  color: color-mix(in srgb, var(--sd-rca-stage-dim) 60%, transparent); }
.plate > svg { position: absolute; left: 50%; top: 52%; transform: translate(-50%, -50%); }
.schem { stroke: var(--sd-rca-core); fill: none; stroke-width: 1.4; opacity: 0.8; }
.schem.hotline { stroke: var(--sd-rca-defect); opacity: 0.95; }
.schem-dim { stroke: color-mix(in srgb, var(--sd-rca-core) 35%, transparent); fill: none; stroke-width: 1; }
.node { fill: var(--sd-rca-core); }
.node.hotnode { fill: var(--sd-rca-defect); }
.flow { stroke: var(--sd-rca-hi); fill: none; stroke-width: 1.6; stroke-dasharray: 5 60;
  stroke-linecap: round; animation: rah-flow 3.2s linear infinite; opacity: 0.9; }
.flow.half { opacity: 0.55; }
@keyframes rah-flow { to { stroke-dashoffset: -65; } }
.plate.fail { border-color: color-mix(in srgb, var(--sd-rca-defect) 65%, transparent);
  animation: rah-fail-glow 2.8s ease-in-out infinite; }
@keyframes rah-fail-glow {
  0%, 100% { box-shadow: 0 30px 90px color-mix(in srgb, var(--sd-rca-stage) 62%, transparent),
    0 0 34px color-mix(in srgb, var(--sd-rca-defect) 24%, transparent),
    inset 0 0 40px color-mix(in srgb, var(--sd-rca-defect) 9%, transparent); }
  50% { box-shadow: 0 30px 90px color-mix(in srgb, var(--sd-rca-stage) 62%, transparent),
    0 0 62px color-mix(in srgb, var(--sd-rca-defect) 44%, transparent),
    inset 0 0 56px color-mix(in srgb, var(--sd-rca-defect) 17%, transparent); } }
.plate.fail .pn, .plate.fail .pname { color: var(--sd-rca-defect); }
.anchor { position: absolute; width: 4px; height: 4px; left: 50%; top: 50%; pointer-events: none; }
.fail-ring { position: absolute; left: 50%; top: 52%; width: 120px; height: 120px;
  margin: -60px 0 0 -60px; display: none; animation: rah-spin 14s linear infinite; }
.plate.fail .fail-ring { display: block; }
@keyframes rah-spin { to { transform: rotate(360deg); } }
.ring-a { fill: none; stroke: color-mix(in srgb, var(--sd-rca-defect) 80%, transparent); stroke-width: 1.6; }
.ring-b { fill: none; stroke: color-mix(in srgb, var(--sd-rca-defect) 45%, transparent); stroke-width: 1; }
.fail-badge { position: absolute; right: 16px; bottom: 10px; display: none; font-size: 8px;
  letter-spacing: 0.2em; color: var(--sd-rca-defect); font-weight: 800;
  border: 1px solid color-mix(in srgb, var(--sd-rca-defect) 60%, transparent); border-radius: 5px;
  padding: 3px 8px; background: var(--sd-rca-defect-soft); }
.plate.fail .fail-badge { display: block; }
.seam { position: absolute; left: -180px; top: -8px; width: 360px; height: 16px; border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--sd-rca-live) 55%, transparent), transparent);
  opacity: 0; pointer-events: none; filter: blur(2px); }
.seam.flash { animation: rah-seam 1.1s ease-out; }
@keyframes rah-seam { 0% { opacity: 0; } 25% { opacity: 1; } 100% { opacity: 0; } }

.leader-svg { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 5; pointer-events: none; }
.leader { stroke: color-mix(in srgb, var(--sd-rca-stage-dim) 60%, transparent); stroke-width: 1; fill: none; }
.leader.hot { stroke: color-mix(in srgb, var(--sd-rca-defect) 80%, transparent); }
.leader-dot { fill: var(--sd-rca-stage-dim); }
.leader-dot.hot { fill: var(--sd-rca-defect); }

.co-field { position: absolute; inset: 0; z-index: 8; pointer-events: none; }
.callout { position: absolute; width: 236px; pointer-events: auto;
  border: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 16%, transparent); border-radius: 14px;
  background: color-mix(in srgb, var(--sd-rca-stage) 82%, transparent); backdrop-filter: blur(10px);
  padding: 11px 14px; transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s; }
.callout:hover { transform: translateY(-3px); border-color: var(--sd-rca-brd);
  box-shadow: 0 14px 36px color-mix(in srgb, var(--sd-rca-stage) 55%, transparent); }
.callout .c-pn { font-size: 8.5px; letter-spacing: 0.22em; color: var(--sd-rca-stage-dim); }
.callout .c-why { font-size: 8.5px; letter-spacing: 0.26em; color: var(--sd-rca-core);
  font-weight: 800; margin-top: 3px; }
.callout p { font-size: 11px; line-height: 1.5; color: var(--sd-rca-stage-ink); margin: 5px 0 0; }
.callout.ghost p { color: var(--sd-rca-stage-dim); font-style: italic; }
.callout.hot { border-color: color-mix(in srgb, var(--sd-rca-defect) 60%, transparent);
  background: color-mix(in srgb, var(--sd-rca-defect) 8%, var(--sd-rca-stage)); }
.callout.hot .c-why, .callout.hot .c-pn { color: var(--sd-rca-defect); }
.callout.hot p { color: color-mix(in srgb, var(--sd-rca-defect) 26%, var(--sd-rca-stage-ink)); font-weight: 600; }
.co-l1 { left: 26px; top: 17%; } .co-l2 { left: 26px; top: 56%; }
.co-r1 { right: 26px; top: 12%; } .co-r2 { right: 26px; top: 40%; } .co-r3 { right: 26px; top: 68%; }

.stage-foot { position: absolute; left: 26px; bottom: 12px; z-index: 9; display: flex; gap: 20px;
  flex-wrap: wrap; font-size: 8px; letter-spacing: 0.2em;
  color: color-mix(in srgb, var(--sd-rca-stage-dim) 70%, transparent); }
.stage-foot b { color: var(--sd-rca-stage-dim); font-weight: 700; }

/* ══ intake tray ══ */
.rah-tray { display: flex; flex-direction: column; gap: 9px; padding: 12px 26px 18px;
  border-top: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 8%, transparent); }
.tray-lab { font-size: 8px; letter-spacing: 0.26em; color: var(--sd-rca-stage-dim); }
.tray-track { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(196px, 1fr);
  gap: 10px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
.tunit { position: relative; display: flex; align-items: center; gap: 9px; padding: 9px 26px 9px 10px;
  border-radius: 12px; cursor: pointer; text-align: left; overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 12%, transparent);
  background: color-mix(in srgb, var(--sd-rca-stage-ink) 3%, transparent);
  transition: transform 0.22s var(--sd-spring), border-color 0.22s; }
.tunit:hover { transform: translateY(-2px); border-color: var(--sd-rca-brd); }
.tunit.fresh::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(110deg, transparent 25%, var(--sd-rca-hi-soft) 50%, transparent 75%);
  animation: rah-glint 1.2s ease-out 2; }
.tu-glyph { flex: 0 0 auto; }
.tu-glyph .g-dim { fill: none; stroke: color-mix(in srgb, var(--sd-rca-stage-dim) 55%, transparent); }
.tu-glyph .g-am { fill: none; stroke: color-mix(in srgb, var(--sd-rca-core) 65%, transparent); }
.tu-glyph .g-hot { fill: none; stroke: color-mix(in srgb, var(--sd-rca-defect) 85%, transparent); }
.tu-col { min-width: 0; display: grid; gap: 2px; flex: 1; }
.tu-id { font-size: 10px; font-weight: 800; color: var(--sd-rca-core); }
.tu-sub { font-size: 10.5px; color: var(--sd-rca-stage-ink); white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; }
.tu-right { display: grid; gap: 3px; justify-items: end; flex: 0 0 auto; }
.tu-sev { font-size: 8px; font-weight: 800; letter-spacing: 0.1em; padding: 2px 6px; border-radius: 5px;
  border: 1px solid; line-height: 1; }
.tu-sev.s1 { color: var(--sd-rca-defect); border-color: color-mix(in srgb, var(--sd-rca-defect) 55%, transparent);
  background: var(--sd-rca-defect-soft); }
.tu-sev.s2 { color: var(--sd-rca-warn); border-color: color-mix(in srgb, var(--sd-rca-warn) 50%, transparent);
  background: var(--sd-rca-warn-soft); }
.tu-sev.s3, .tu-sev.s4 { color: var(--sd-rca-stage-dim);
  border-color: color-mix(in srgb, var(--sd-rca-stage-dim) 45%, transparent); }
.tu-age { font-size: 9.5px; color: var(--sd-rca-stage-dim); font-variant-numeric: tabular-nums; }
.tu-open { position: absolute; right: 7px; top: 50%; transform: translateY(-50%); display: grid;
  place-items: center; width: 18px; height: 18px; border-radius: 6px; color: var(--sd-rca-stage-dim);
  transition: color 0.2s, background-color 0.2s; }
.tu-open:hover { color: var(--sd-rca-core); background: var(--sd-rca-soft); }
.tray-empty { padding: 14px 4px; font-size: 9.5px; letter-spacing: 0.16em; color: var(--sd-rca-stage-dim); }

@media (max-width: 1080px) {
  .rah-stage { height: auto; padding-bottom: 12px; }
  .rig { position: relative; height: 380px; }
  .leader-svg { display: none; }
  .co-field { position: relative; inset: auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 10px; padding: 0 26px; }
  .callout { position: relative; width: auto; left: auto; right: auto; top: auto; }
  .stage-head { position: relative; top: 0; left: 0; right: 0; padding: 14px 26px 0; }
  .stage-foot { position: relative; left: 0; bottom: 0; padding: 12px 26px 0; }
}

/* ═════ LIGHT THEME OVERRIDES ═════
   The stage is dark in BOTH themes; theme-light-rescue.css's
   `[class*="page"] h1 { color: var(--text-primary) }` catch-all (0,3,1) would
   ink the headline invisible on the black stage — re-pin it. */
[data-theme="light"] .rah-h1 { color: var(--sd-rca-stage-ink) !important; }

/* reduced-motion — every loop dies unless Cinematic mode overrides */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .stack-float,
  html:not([data-cinematic="on"]) .plate,
  html:not([data-cinematic="on"]) .plate.fail,
  html:not([data-cinematic="on"]) .fail-ring,
  html:not([data-cinematic="on"]) .flow,
  html:not([data-cinematic="on"]) .seam.flash,
  html:not([data-cinematic="on"]) .arrive::after,
  html:not([data-cinematic="on"]) .rah-led i,
  html:not([data-cinematic="on"]) .tunit.fresh::after { animation: none !important; }
  html:not([data-cinematic="on"]) .plate { transition: none !important; opacity: 1; }
}
</style>
