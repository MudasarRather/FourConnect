<template>
  <!-- ════════════════════════════════════════════════════════════════════
       The certificate that mints itself. A pointer-tilted, spotlit document
       that builds line-by-line (ink-write), draws a guilloché security
       border, presses a wax seal, sweeps gold foil across the mast, and
       assembles a verification matrix. Watermark morphs DRAFT → ISSUED →
       VOID with the lifecycle. The sheet is paper-cream in both themes;
       only the frame + glow respond to the theme. RM-guarded.
       ════════════════════════════════════════════════════════════════════ -->
  <div ref="frame" class="cert-frame" :class="[`st-${statusKey}`, { rl: isRelieving }]">
    <div class="cert" :key="rekey">
      <div class="cert-sheet">
        <!-- guilloché security border -->
        <svg class="cert-guilloche" viewBox="0 0 400 520" preserveAspectRatio="none" aria-hidden="true">
          <path :d="border" class="cg-line" />
          <path :d="borderInner" class="cg-line faint" />
        </svg>
        <span class="cert-corner tl" aria-hidden="true" />
        <span class="cert-corner tr" aria-hidden="true" />
        <span class="cert-corner bl" aria-hidden="true" />
        <span class="cert-corner br" aria-hidden="true" />

        <!-- masthead — experience: split wordmark | relieving: centred laurel crest -->
        <Motion v-if="!isRelieving" as="div" class="cert-mast"
          :initial="anim({ opacity: 0, y: -8 })" :animate="{ opacity: 1, y: 0 }" :transition="t(0)">
          <div class="cm-id">
            <span class="cm-brand">{{ org }}</span>
            <span class="cm-sub">Human Resources · Office of the Registrar</span>
          </div>
          <div class="cm-ref">
            <span>Ref · {{ c?.employee_code || c?.case_number || '—' }}</span>
            <span>{{ today }}</span>
          </div>
          <span class="cm-foil" aria-hidden="true" />
        </Motion>
        <Motion v-else as="div" class="cert-relmast"
          :initial="anim({ opacity: 0, y: -8 })" :animate="{ opacity: 1, y: 0 }" :transition="t(0)">
          <span class="crm-crest" :class="{ pressed }" aria-hidden="true">
            <span class="crm-laurel l" /><span class="crm-laurel r" />
            <span class="crm-ring" /><BadgeCheck :size="20" class="crm-ic" />
          </span>
          <span class="crm-brand">{{ org }}</span>
          <span class="crm-sub">Human Resources · Office of the Registrar</span>
          <span class="crm-ref">Ref · {{ c?.employee_code || c?.case_number || '—' }} · {{ today }}</span>
        </Motion>

        <Motion as="h3" class="cert-h"
          :initial="anim({ opacity: 0, y: 10, scale: 0.96 })" :animate="{ opacity: 1, y: 0, scale: 1 }" :transition="t(1)">
          {{ heading }}
          <span class="cert-h-rule" aria-hidden="true" />
        </Motion>

        <svg v-if="isRelieving" class="cert-band" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true">
          <path :d="band1" /><path :d="band2" /><path :d="band3" class="amber" />
        </svg>

        <div class="cert-body">
          <Motion v-for="(line, i) in lines" :key="i" as="p" class="cert-line"
            :initial="anim({ opacity: 0, x: -10 })" :animate="{ opacity: 1, x: 0 }" :transition="t(2 + i)"
            v-html="line" />
        </div>

        <Motion v-if="isRelieving" as="div" class="cert-attest"
          :initial="anim({ opacity: 0, y: 8 })" :animate="{ opacity: 1, y: 0 }" :transition="t(2 + lines.length)">
          <span class="ca-h">Clearance Attestation</span>
          <span class="ca-row"><i class="ca-tick"><Check :size="9" /></i> No-dues clearance completed across all departments</span>
          <span class="ca-row"><i class="ca-tick"><Check :size="9" /></i> Full &amp; Final settlement processed &amp; closed</span>
          <span class="ca-row"><i class="ca-tick"><Check :size="9" /></i> Company assets returned / accounted for</span>
        </Motion>
        <Motion v-else as="div" class="cert-facts"
          :initial="anim({ opacity: 0, y: 8 })" :animate="{ opacity: 1, y: 0 }" :transition="t(2 + lines.length)">
          <div v-for="f in facts" :key="f.k" class="cf"><span class="cf-k">{{ f.k }}</span><span class="cf-v">{{ f.v }}</span></div>
        </Motion>

        <!-- foot: signature + verification -->
        <Motion as="div" class="cert-foot"
          :initial="anim({ opacity: 0, y: 10 })" :animate="{ opacity: 1, y: 0 }" :transition="t(3 + lines.length)">
          <div class="cert-sign">
            <span class="cs-line"><PenLine :size="13" /></span>
            <span class="cs-name">Authorised Signatory</span>
            <span class="cs-role">{{ org }} · Human Resources</span>
          </div>
          <div class="cert-verify">
            <div class="qr" :class="{ live: hasCode }">
              <span v-for="(on, i) in qrCells" :key="i" class="qr-cell" :class="{ on }" :style="{ '--qd': (i % 13) * 0.012 + 's' }" />
              <span class="qr-find tl" /><span class="qr-find tr" /><span class="qr-find bl" />
            </div>
            <span class="qr-cap">{{ hasCode ? 'Scan to verify' : 'Verification pending' }}</span>
            <span v-if="hasCode" class="qr-code">{{ code }}</span>
          </div>
        </Motion>

        <!-- seal — experience: wax disc | relieving: angled rubber stamp -->
        <div v-if="isRelieving" class="cert-stamp" :class="{ pressed }" aria-hidden="true">
          <span class="cst-a">RELIEVED</span>
          <span class="cst-b">NO DUES · CLEARED</span>
        </div>
        <div v-else class="cert-seal" :class="{ pressed }">
          <span class="wax" aria-hidden="true" />
          <component :is="sealIcon" :size="22" class="wax-ico" />
        </div>

        <span class="cert-ribbon" aria-hidden="true" />

        <!-- status holographic chip -->
        <Transition name="cert-chip">
          <span v-if="status === 'ISSUED'" class="cert-chip"><ShieldCheck :size="12" /> Issued &amp; Verifiable</span>
        </Transition>

        <!-- watermark -->
        <span v-if="watermark" class="cert-wm" :class="`wm-${watermark.toLowerCase()}`">{{ watermark }}</span>
      </div>
    </div>
    <span class="cert-glare" aria-hidden="true" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { PenLine, ShieldCheck, BadgeCheck, Stamp, FileX, Check } from 'lucide-vue-next'
import { fmtDate } from '@/composables/useExit'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  c: { type: Object, default: null },
  letterType: { type: String, default: 'experience-letter' },
  status: { type: String, default: 'NOT_GENERATED' },
  code: { type: String, default: '' },
})

const frame = ref(null)
usePointerSpotlight(frame)
const reduced = prefersReduced()

const isRelieving = computed(() => props.letterType === 'relieving-letter')
const statusKey = computed(() => (props.status || 'NOT_GENERATED').toLowerCase())
const org = 'Fourreck'
const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const rekey = computed(() => `${props.c?.id || 'none'}-${props.status}-${props.letterType}`)

const pressed = computed(() => props.status !== 'NOT_GENERATED')
const hasCode = computed(() => !!props.code && props.status !== 'REVOKED')
const watermark = computed(() =>
  props.status === 'REVOKED' ? 'VOID' : props.status === 'ISSUED' ? '' : props.status === 'GENERATED' ? 'DRAFT' : 'PREVIEW')

const heading = computed(() => (isRelieving.value ? 'RELIEVING LETTER' : 'EXPERIENCE & SERVICE CERTIFICATE'))
const sealIcon = computed(() => props.status === 'REVOKED' ? FileX : isRelieving.value ? BadgeCheck : Stamp)

const nm = computed(() => `<b>${props.c?.employee_name || '—'}</b>`)
const desig = computed(() => props.c?.designation_name || '—')
const dept = computed(() => props.c?.department_name || '—')
// Service start = the joining-date snapshot (NEVER the resignation/notice date).
const joinD = computed(() => props.c?.joining_date_snapshot || props.c?.joining_date || null)
const lwd = computed(() => props.c?.last_working_date || props.c?.exit_date)

const tenure = computed(() => {
  const a = joinD.value, b = lwd.value
  if (!a || !b) return '—'
  const days = Math.round((new Date(b) - new Date(a)) / 86400000)
  if (days < 0) return '—'
  const y = Math.floor(days / 365), m = Math.floor((days % 365) / 30)
  const p = []
  if (y) p.push(`${y} year${y !== 1 ? 's' : ''}`)
  if (m) p.push(`${m} month${m !== 1 ? 's' : ''}`)
  return p.join(', ') || 'less than a month'
})

const lines = computed(() => {
  if (isRelieving.value) return [
    `This is to certify that ${nm.value} (${props.c?.employee_code || '—'}), who served as <b>${desig.value}</b> in the ${dept.value} department, has been relieved from the services of ${org} with effect from <b>${fmtDate(lwd.value)}</b>.`,
    `All company dues and no-dues clearances have been completed and the full &amp; final settlement has been processed. We confirm the employee is relieved of all duties and responsibilities as of the last working day.`,
    `We wish them success in all future endeavours.`,
  ]
  return [
    `This is to certify that ${nm.value} (${props.c?.employee_code || '—'}) was employed with ${org} as <b>${desig.value}</b> in the ${dept.value} department.`,
    `The period of service was from <b>${fmtDate(joinD.value)}</b> to <b>${fmtDate(lwd.value)}</b>, a total tenure of <b>${tenure.value}</b>.`,
    `During the tenure, the employee's conduct and performance were found to be satisfactory. This certificate is issued on request.`,
  ]
})
const facts = computed(() => [
  { k: 'Designation', v: desig.value },
  { k: 'Department', v: dept.value },
  { k: isRelieving.value ? 'Relieved' : 'Tenure', v: isRelieving.value ? fmtDate(lwd.value) : tenure.value },
])

// motion helpers — disabled under reduced motion
const anim = (o) => (reduced ? false : o)
const t = (i) => ({ duration: 0.5, delay: reduced ? 0 : 0.12 + i * 0.09, ease: [0.16, 1, 0.3, 1] })

// guilloché border path (sine-rippled rounded rectangle traced around the sheet)
const ripple = (inset, amp, freq) => {
  const w = 400, h = 520, pts = []
  const peri = []
  const step = 6
  // top, right, bottom, left edges sampled
  for (let x = inset; x <= w - inset; x += step) peri.push([x, inset, 0])
  for (let y = inset; y <= h - inset; y += step) peri.push([w - inset, y, 1])
  for (let x = w - inset; x >= inset; x -= step) peri.push([x, h - inset, 0])
  for (let y = h - inset; y >= inset; y -= step) peri.push([inset, y, 1])
  let d = ''
  peri.forEach(([x, y, vertical], i) => {
    const wob = amp * Math.sin((i / step) * freq)
    const px = vertical ? x + (x < w / 2 ? -wob : wob) : x
    const py = vertical ? y : y + (y < h / 2 ? -wob : wob)
    pts.push(px.toFixed(1) + ' ' + py.toFixed(1))
  })
  d = 'M' + pts.join('L') + 'Z'
  return d
}
const border = ripple(12, 3, 0.9)
const borderInner = ripple(20, 2, 1.5)

// guilloché wave band under the relieving title
const wavePath = (phase, amp) => {
  let d = ''
  for (let i = 0; i <= 300; i += 4) {
    const y = 12 + amp * Math.sin((i / 300) * Math.PI * 9 + phase)
    d += (i ? 'L' : 'M') + i + ' ' + y.toFixed(1)
  }
  return d
}
const band1 = wavePath(0, 8)
const band2 = wavePath(Math.PI, 8)
const band3 = wavePath(Math.PI / 2, 4)

// deterministic verification matrix
const qrCells = computed(() => {
  const seed = (props.code || props.c?.case_number || 'PREVIEW') + (props.status || '')
  const N = 13, out = []
  let h = 2166136261
  for (let i = 0; i < N * N; i++) {
    const s = seed + ':' + i
    h = 2166136261
    for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619) }
    out.push((h >>> 0) % 100 < 46)
  }
  return out
})
</script>

<style scoped>
.cert-frame { position: relative; perspective: 1300px; display: flex; justify-content: center; }
.cert { position: relative; width: 100%; max-width: 430px; transition: transform 0.3s var(--ex-ease); transform-style: preserve-3d; }
.cert-frame:hover .cert { transform: rotateX(calc((var(--my,.5) - .5) * -5deg)) rotateY(calc((var(--mx,.5) - .5) * 7deg)); }

.cert-sheet { position: relative; overflow: hidden; aspect-ratio: 400 / 520; padding: 30px 30px 22px;
  background: linear-gradient(168deg, #fdfaf3 0%, #f7f1e6 100%); color: #2c2418; border-radius: 8px;
  box-shadow: 0 26px 64px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(180,130,40,0.12);
  font-size: clamp(9px, 2.4vw, 11px); line-height: 1.62; }
.st-issued .cert-sheet { box-shadow: 0 26px 70px rgba(0,0,0,0.5), 0 0 30px rgba(52,211,153,0.18), inset 0 0 0 1px rgba(52,211,153,0.2); }
.st-revoked .cert-sheet { filter: saturate(0.7); }

.cert-guilloche { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.cg-line { fill: none; stroke: rgba(180,120,20,0.34); stroke-width: 0.7; }
.cg-line.faint { stroke: rgba(180,120,20,0.16); }
.cert-corner { position: absolute; width: 22px; height: 22px; pointer-events: none; }
.cert-corner::before, .cert-corner::after { content: ''; position: absolute; background: linear-gradient(90deg, #d97706, #ea580c); }
.cert-corner::before { width: 100%; height: 2px; } .cert-corner::after { width: 2px; height: 100%; }
.cert-corner.tl { top: 9px; left: 9px; } .cert-corner.tr { top: 9px; right: 9px; }
.cert-corner.tr::after { right: 0; } .cert-corner.bl { bottom: 9px; left: 9px; } .cert-corner.bl::before { bottom: 0; }
.cert-corner.br { bottom: 9px; right: 9px; } .cert-corner.br::before { bottom: 0; } .cert-corner.br::after { right: 0; }

.cert-mast { position: relative; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;
  border-bottom: 2px solid #ea580c; padding-bottom: 9px; }
.cm-brand { display: block; font-size: 1.9em; font-weight: 850; letter-spacing: -0.5px; line-height: 1;
  background: linear-gradient(120deg, #d97706, #ea580c 70%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.cm-sub { font-size: 0.62em; letter-spacing: 0.18em; text-transform: uppercase; color: #8a7456; }
.cm-ref { display: flex; flex-direction: column; gap: 2px; text-align: right; font-size: 0.66em; color: #8a7456; font-variant-numeric: tabular-nums; }
.cm-foil { position: absolute; inset: 0 0 9px; pointer-events: none; mix-blend-mode: screen;
  background: linear-gradient(108deg, transparent 40%, rgba(255,230,160,0.9) 50%, transparent 60%); transform: translateX(-140%); }
.cert:hover .cm-foil, .st-issued .cm-foil { animation: cert-foil 3.4s ease-in-out infinite; }

.cert-h { position: relative; text-align: center; font-size: 1.32em; letter-spacing: 0.16em; font-weight: 800; color: #9a3412; margin: 1.7em 0 1.2em; }
.cert-h-rule { display: block; width: 54px; height: 2px; margin: 7px auto 0; background: linear-gradient(90deg, transparent, #ea580c, transparent); }

.cert-body { display: flex; flex-direction: column; gap: 0.7em; }
.cert-line { margin: 0; }
.cert-line :deep(b) { color: #1f1810; font-weight: 750; }

.cert-facts { display: flex; gap: 8px; margin: 1.1em 0 0.4em; flex-wrap: wrap; }
.cf { flex: 1; min-width: 84px; display: flex; flex-direction: column; gap: 1px; padding: 6px 8px; border-radius: 7px;
  background: rgba(234,88,12,0.06); border: 1px solid rgba(234,88,12,0.14); }
.cf-k { font-size: 0.64em; letter-spacing: 0.1em; text-transform: uppercase; color: #a07a4a; font-weight: 700; }
.cf-v { font-size: 0.86em; font-weight: 750; color: #2c2418; }

.cert-foot { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-top: 1.5em; }
.cert-sign { display: flex; flex-direction: column; gap: 1px; }
.cs-line { display: inline-flex; color: #b06a2a; padding-bottom: 4px; border-bottom: 1.4px solid #c98a4a; width: 78px; margin-bottom: 4px; }
.cs-name { font-size: 0.84em; font-weight: 800; color: #2c2418; }
.cs-role { font-size: 0.66em; color: #8a7456; }

.cert-verify { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.qr { position: relative; display: grid; grid-template-columns: repeat(13, 1fr); gap: 1px; width: 60px; height: 60px; padding: 3px; border-radius: 4px;
  background: #fff; border: 1px solid rgba(0,0,0,0.12); }
.qr-cell { background: transparent; border-radius: 0.5px; }
.qr-cell.on { background: #2a2014; }
.qr.live .qr-cell.on { animation: qr-pop 0.4s var(--ex-spring) backwards; animation-delay: var(--qd); }
.qr-find { position: absolute; width: 13px; height: 13px; border: 2.5px solid #2a2014; border-radius: 1px; }
.qr-find.tl { top: 4px; left: 4px; } .qr-find.tr { top: 4px; right: 4px; } .qr-find.bl { bottom: 4px; left: 4px; }
.qr-cap { font-size: 0.6em; letter-spacing: 0.06em; color: #8a7456; }
.qr-code { font-size: 0.6em; font-family: var(--ex-mono); letter-spacing: 0.08em; color: #b06a2a; font-weight: 700; }

.cert-seal { position: absolute; right: 26px; bottom: 64px; width: 56px; height: 56px; display: grid; place-items: center;
  transform: scale(0.4) rotate(-18deg); opacity: 0; transition: transform 0.7s var(--ex-spring), opacity 0.5s; }
.cert-seal.pressed { transform: scale(1) rotate(-9deg); opacity: 1; }
.wax { position: absolute; inset: 0; border-radius: 50%;
  background: radial-gradient(circle at 38% 34%, #f59e0b, #c2410c 70%); box-shadow: inset 0 -3px 6px rgba(120,40,0,0.5), 0 3px 10px rgba(120,40,0,0.4);
  clip-path: polygon(50% 0,63% 9%,79% 6%,84% 22%,98% 32%,91% 48%,98% 66%,82% 73%,76% 92%,58% 88%,42% 99%,30% 84%,12% 84%,11% 66%,1% 50%,12% 33%,8% 15%,26% 14%,36% 1%); }
.st-issued .wax { background: radial-gradient(circle at 38% 34%, #34d399, #047857 72%); }
.st-revoked .wax { background: radial-gradient(circle at 38% 34%, #f87171, #991b1b 72%); }
.wax-ico { position: relative; color: #fff5e6; z-index: 1; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.4)); }

.cert-ribbon { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: linear-gradient(90deg, #fcd34d, #fb923c 55%, #ea580c); }
.st-issued .cert-ribbon { background: linear-gradient(90deg, #6ee7b7, #34d399 55%, #059669); }

.cert-chip { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 999px; font-size: 0.66em; font-weight: 800; letter-spacing: 0.04em; color: #065f46;
  background: rgba(52,211,153,0.16); border: 1px solid rgba(5,150,105,0.4); box-shadow: 0 0 16px rgba(52,211,153,0.3); }
.cert-chip-enter-active { transition: all 0.6s var(--ex-spring) 0.4s; }
.cert-chip-enter-from { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(0.9); }

.cert-wm { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-24deg); pointer-events: none;
  font-size: 3.6em; font-weight: 900; letter-spacing: 0.12em; }
.wm-draft { color: rgba(234,88,12,0.09); } .wm-preview { color: rgba(120,100,70,0.08); }
.wm-void { color: rgba(220,38,38,0.13); border: 4px solid rgba(220,38,38,0.13); padding: 4px 18px; border-radius: 8px; }

.cert-glare { position: absolute; inset: 0; border-radius: 8px; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(420px circle at calc(var(--mx,0.5) * 100%) calc(var(--my,0.5) * 100%), rgba(255,255,255,0.18), transparent 45%); mix-blend-mode: overlay; }

@keyframes cert-foil { 0% { transform: translateX(-140%); } 45%, 100% { transform: translateX(180%); } }
@keyframes qr-pop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }

/* ── Relieving variant — emerald "release" palette + laurel/stamp motif ──── */
.rl .cert-sheet { background: linear-gradient(168deg, #fbfcf8 0%, #eef5ee 100%);
  box-shadow: 0 26px 64px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(5,150,105,0.14); }
.rl.st-issued .cert-sheet { box-shadow: 0 26px 70px rgba(0,0,0,0.5), 0 0 30px rgba(16,185,129,0.22), inset 0 0 0 1px rgba(5,150,105,0.26); }
.rl .cg-line { stroke: rgba(5,150,105,0.30); } .rl .cg-line.faint { stroke: rgba(5,150,105,0.14); }
.rl .cert-corner::before, .rl .cert-corner::after { background: linear-gradient(90deg, #047857, #10b981); }
.rl .cert-h { color: #065f46; }
.rl .cert-h-rule { display: none; }
.rl .cert-ribbon { background: linear-gradient(90deg, #34d399, #059669 55%, #b45309); }
.rl .cert-line :deep(b) { color: #15200f; }
.rl .cs-line { color: #2f8a63; border-bottom-color: #6e9e84; }
.rl .qr { border-color: rgba(5,150,105,0.3); } .rl .qr-cell.on { background: #134e36; } .rl .qr-find { border-color: #134e36; }
.rl .qr-code { color: #047857; }

.cert-relmast { text-align: center; position: relative; }
.crm-crest { position: relative; display: inline-grid; place-items: center; width: 13%; min-width: 52px; aspect-ratio: 1; margin-bottom: 0.4em;
  transform: scale(0.6); opacity: 0.4; transition: transform 0.7s var(--ex-spring), opacity 0.6s; }
.crm-crest.pressed { transform: scale(1); opacity: 1; }
.crm-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.6px solid #059669; box-shadow: inset 0 0 0 3px rgba(5,150,105,0.18); }
.crm-ic { color: #047857; z-index: 1; }
.crm-laurel { position: absolute; top: 8%; bottom: 8%; width: 36%; border: 1.6px solid #10b981; border-radius: 50%; opacity: 0.7; }
.crm-laurel.l { left: 1%; border-right-color: transparent; border-top-color: transparent; }
.crm-laurel.r { right: 1%; border-left-color: transparent; border-top-color: transparent; }
.crm-brand { display: block; font-size: 1.9em; font-weight: 850; letter-spacing: -0.5px; line-height: 1; color: #064e3b; }
.crm-sub { display: block; font-size: 0.62em; letter-spacing: 0.2em; text-transform: uppercase; color: #6b7b5e; margin-top: 0.55em; }
.crm-ref { display: block; font-size: 0.66em; letter-spacing: 0.04em; color: #6b7b5e; margin-top: 0.6em; font-variant-numeric: tabular-nums; }

.cert-band { display: block; width: 62%; height: 16px; margin: 0 auto 1em; }
.cert-band path { fill: none; stroke: #059669; stroke-width: 0.8; }
.cert-band path.amber { stroke: #b45309; opacity: 0.7; }

.cert-attest { margin: 1.1em 0 0.4em; padding: 0.75em 0.9em; border-radius: 8px; background: rgba(5,150,105,0.06); border: 1px solid rgba(5,150,105,0.22); display: flex; flex-direction: column; gap: 0.5em; }
.ca-h { font-size: 0.62em; letter-spacing: 0.16em; text-transform: uppercase; color: #047857; font-weight: 800; }
.ca-row { display: flex; align-items: flex-start; gap: 0.55em; font-size: 0.86em; line-height: 1.4; color: #21271f; font-weight: 600; }
.ca-tick { display: grid; place-items: center; width: 1.5em; height: 1.5em; border-radius: 50%; background: #059669; color: #fff; flex-shrink: 0; margin-top: 1px; }

.cert-stamp { position: absolute; left: 50%; bottom: 58px; transform: translateX(-50%) rotate(-12deg) scale(0.4); transform-origin: center;
  display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 5px 11px; border: 2px solid #047857; border-radius: 5px; color: #047857;
  opacity: 0; transition: transform 0.7s var(--ex-spring), opacity 0.5s; }
.cert-stamp.pressed { transform: translateX(-50%) rotate(-9deg) scale(1); opacity: 0.85; }
.cst-a { font-size: 1.05em; font-weight: 850; letter-spacing: 0.14em; line-height: 1; }
.cst-b { font-size: 0.52em; letter-spacing: 0.18em; }

@media (prefers-reduced-motion: reduce) {
  .cert-frame:hover .cert { transform: none; }
  .cm-foil, .qr.live .qr-cell.on { animation: none; }
  .cert-seal, .crm-crest, .cert-stamp { transition: opacity 0.3s; }
}
</style>
