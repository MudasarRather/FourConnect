<template>
  <!-- ════════════════════════════════════════════════════════════════════
       The Relieving Letter document. A pointer-tilted, spotlit sheet that
       BUILDS ITSELF line-by-line, with a gate-arch letterhead, an emerald
       "release" ribbon down the left margin, a horizontal three-seal
       clearance attestation strip, a pressing "RELIEVED" stamp, an assembling
       verification matrix and a holographic RELEASED chip. The sheet grows to
       fit its content — AUTO height, never clipped (this is the fix for the
       cut-off text). Paper stays cream in both themes; only the frame + glow
       respond to the theme. Distinct from the Experience certificate's
       guilloché/laurel masthead. RM-guarded.
       ════════════════════════════════════════════════════════════════════ -->
  <div ref="frame" class="rcert-frame" :class="`st-${statusKey}`">
    <div class="rcert" :key="rekey">
      <div class="rcert-sheet">
        <!-- left release ribbon -->
        <span class="rc-ribbon" aria-hidden="true" />
        <span class="rc-corner tl" aria-hidden="true" />
        <span class="rc-corner tr" aria-hidden="true" />
        <span class="rc-corner br" aria-hidden="true" />

        <!-- letterhead: gate-arch emblem + brand -->
        <Motion as="div" class="rc-head" :initial="anim({ opacity: 0, y: -8 })" :animate="{ opacity: 1, y: 0 }" :transition="t(0)">
          <span class="rc-crest" :class="{ pressed }" aria-hidden="true">
            <svg viewBox="0 0 48 48">
              <path class="rc-arch" d="M7 45 V21 A17 17 0 0 1 41 21 V45" />
              <path class="rc-arch faint" d="M13 45 V22 A11 11 0 0 1 35 22 V45" />
            </svg>
            <Footprints :size="17" class="rc-crest-ic" />
            <span class="rc-foil" aria-hidden="true" />
          </span>
          <span class="rc-brand">{{ org }}</span>
          <span class="rc-sub">Human Resources · Office of the Registrar</span>
          <span class="rc-ref">Ref · {{ c?.employee_code || c?.case_number || '—' }} · {{ today }}</span>
          <span class="rc-rule" aria-hidden="true" />
        </Motion>

        <Motion as="h3" class="rc-title" :initial="anim({ opacity: 0, y: 10, scale: 0.96 })" :animate="{ opacity: 1, y: 0, scale: 1 }" :transition="t(1)">
          RELIEVING LETTER
          <span class="rc-tag">Honourable release · No dues outstanding</span>
        </Motion>

        <div class="rc-body">
          <Motion v-for="(line, i) in lines" :key="i" as="p" class="rc-line"
            :initial="anim({ opacity: 0, x: -10 })" :animate="{ opacity: 1, x: 0 }" :transition="t(2 + i)" v-html="line" />
        </div>

        <!-- horizontal three-seal clearance attestation strip -->
        <Motion as="div" class="rc-attest" :initial="anim({ opacity: 0, y: 8 })" :animate="{ opacity: 1, y: 0 }" :transition="t(2 + lines.length)">
          <div v-for="a in attestations" :key="a.k" class="rc-seal">
            <span class="rc-seal-disc"><component :is="a.icon" :size="13" /></span>
            <span class="rc-seal-l">{{ a.l }}</span>
          </div>
        </Motion>

        <!-- foot: signatory + verification -->
        <Motion as="div" class="rc-foot" :initial="anim({ opacity: 0, y: 10 })" :animate="{ opacity: 1, y: 0 }" :transition="t(3 + lines.length)">
          <div class="rc-sign">
            <span class="rc-sign-line"><PenLine :size="13" /></span>
            <span class="rc-sign-name">Authorised Signatory</span>
            <span class="rc-sign-role">{{ org }} · Human Resources</span>
          </div>
          <div class="rc-verify">
            <div class="rc-qr" :class="{ live: hasCode }">
              <span v-for="(on, i) in qrCells" :key="i" class="rc-qr-cell" :class="{ on }" :style="{ '--qd': (i % 13) * 0.012 + 's' }" />
              <span class="rc-qr-find tl" /><span class="rc-qr-find tr" /><span class="rc-qr-find bl" />
            </div>
            <span class="rc-qr-cap">{{ hasCode ? 'Scan to verify' : 'Verification pending' }}</span>
            <span v-if="hasCode" class="rc-qr-code">{{ code }}</span>
          </div>
        </Motion>

        <!-- angled "RELIEVED" stamp -->
        <div class="rc-stamp" :class="{ pressed }" aria-hidden="true">
          <component :is="stampIcon" :size="15" class="rc-stamp-ic" />
          <span class="rc-stamp-a">RELIEVED</span>
          <span class="rc-stamp-b">NO DUES · CLEARED</span>
        </div>

        <span class="rc-base" aria-hidden="true" />

        <Transition name="rc-chip">
          <span v-if="status === 'ISSUED'" class="rc-released"><ShieldCheck :size="12" /> Released &amp; Verifiable</span>
        </Transition>

        <span v-if="watermark" class="rc-wm" :class="`wm-${watermark.toLowerCase()}`">{{ watermark }}</span>
      </div>
    </div>
    <span class="rcert-glare" aria-hidden="true" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { PenLine, ShieldCheck, BadgeCheck, Footprints, FileX, ClipboardCheck, Scale, PackageCheck } from 'lucide-vue-next'
import { fmtDate } from '@/composables/useExit'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  c: { type: Object, default: null },
  status: { type: String, default: 'NOT_GENERATED' },
  code: { type: String, default: '' },
})

const frame = ref(null)
usePointerSpotlight(frame)
const reduced = prefersReduced()

const statusKey = computed(() => (props.status || 'NOT_GENERATED').toLowerCase())
const org = 'Fourreck'
const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const rekey = computed(() => `${props.c?.id || 'none'}-${props.status}`)

const pressed = computed(() => props.status !== 'NOT_GENERATED')
const hasCode = computed(() => !!props.code && props.status !== 'REVOKED')
const watermark = computed(() =>
  props.status === 'REVOKED' ? 'VOID' : props.status === 'ISSUED' ? '' : props.status === 'GENERATED' ? 'DRAFT' : 'PREVIEW')
const stampIcon = computed(() => props.status === 'REVOKED' ? FileX : props.status === 'ISSUED' ? BadgeCheck : Footprints)

const nm = computed(() => `<b>${props.c?.employee_name || '—'}</b>`)
const desig = computed(() => props.c?.designation_name || '—')
const dept = computed(() => props.c?.department_name || '—')
const lwd = computed(() => props.c?.last_working_date || props.c?.exit_date)

const lines = computed(() => [
  `This is to certify that ${nm.value} (${props.c?.employee_code || '—'}), who served as <b>${desig.value}</b> in the ${dept.value} department, has been relieved from the services of ${org} with effect from the close of business on <b>${fmtDate(lwd.value)}</b>.`,
  `All company dues and no-dues clearances have been completed across every department and the full &amp; final settlement has been processed and closed. The employee is hereby relieved of all duties, responsibilities and access as of the last working day.`,
  `We thank them for their service and wish them success in all future endeavours.`,
])

const attestations = [
  { k: 'clr', icon: ClipboardCheck, l: 'No-dues clearance complete' },
  { k: 'ff', icon: Scale, l: 'Full & Final settled & closed' },
  { k: 'ast', icon: PackageCheck, l: 'Company assets accounted for' },
]

const anim = (o) => (reduced ? false : o)
const t = (i) => ({ duration: 0.5, delay: reduced ? 0 : 0.12 + i * 0.09, ease: [0.16, 1, 0.3, 1] })

// deterministic verification matrix
const qrCells = computed(() => {
  const seed = (props.code || props.c?.case_number || 'PREVIEW') + (props.status || '')
  const N = 13, out = []
  let h
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
.rcert-frame { position: relative; perspective: 1300px; display: flex; justify-content: center; }
.rcert { position: relative; width: 100%; max-width: 460px; transition: transform 0.3s var(--ex-ease); transform-style: preserve-3d; }
.rcert-frame:hover .rcert { transform: rotateX(calc((var(--my,.5) - .5) * -5deg)) rotateY(calc((var(--mx,.5) - .5) * 7deg)); }

/* AUTO height — grows to fit; never clips text. min-height keeps the paper feel. */
.rcert-sheet { position: relative; overflow: hidden; min-height: 540px; padding: 26px 30px 30px 38px;
  background: linear-gradient(168deg, #fbfdf8 0%, #eef5ee 100%); color: #1f2a20; border-radius: 9px;
  box-shadow: 0 26px 64px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(5,150,105,0.14);
  font-size: 11px; line-height: 1.62; }
.st-issued .rcert-sheet { box-shadow: 0 26px 70px rgba(0,0,0,0.5), 0 0 32px rgba(16,185,129,0.22), inset 0 0 0 1px rgba(5,150,105,0.3); }
.st-revoked .rcert-sheet { filter: saturate(0.72); }

.rc-ribbon { position: absolute; left: 0; top: 0; bottom: 0; width: 7px; background: linear-gradient(180deg, #34d399, #059669 55%, #b45309); }
.rc-corner { position: absolute; width: 22px; height: 22px; pointer-events: none; }
.rc-corner::before, .rc-corner::after { content: ''; position: absolute; background: linear-gradient(90deg, #047857, #10b981); }
.rc-corner::before { width: 100%; height: 2px; } .rc-corner::after { width: 2px; height: 100%; }
.rc-corner.tl { top: 9px; left: 13px; } .rc-corner.tr { top: 9px; right: 9px; } .rc-corner.tr::after { right: 0; }
.rc-corner.br { bottom: 9px; right: 9px; } .rc-corner.br::before { bottom: 0; } .rc-corner.br::after { right: 0; }

/* letterhead */
.rc-head { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; }
.rc-crest { position: relative; width: 52px; height: 52px; display: grid; place-items: center; margin-bottom: 0.5em; overflow: hidden;
  transform: scale(0.6); opacity: 0.4; transition: transform 0.7s var(--ex-spring), opacity 0.6s; }
.rc-crest.pressed { transform: scale(1); opacity: 1; }
.rc-crest svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.rc-arch { fill: none; stroke: #059669; stroke-width: 1.6; }
.rc-arch.faint { stroke: rgba(5,150,105,0.45); stroke-width: 1; }
.rc-crest-ic { position: relative; z-index: 1; color: #047857; }
.rc-foil { position: absolute; inset: 0; pointer-events: none; mix-blend-mode: screen;
  background: linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.6) 50%, transparent 62%); transform: translateX(-130%); }
.rcert:hover .rc-foil, .st-issued .rc-foil { animation: rc-foil 3.6s ease-in-out infinite; }
.rc-brand { font-size: 1.95em; font-weight: 850; letter-spacing: -0.5px; line-height: 1; color: #064e3b; }
.rc-sub { font-size: 0.62em; letter-spacing: 0.2em; text-transform: uppercase; color: #5f7a64; margin-top: 0.5em; }
.rc-ref { font-size: 0.66em; letter-spacing: 0.04em; color: #5f7a64; margin-top: 0.5em; font-variant-numeric: tabular-nums; }
.rc-rule { width: 100%; height: 2px; margin-top: 0.9em; background: linear-gradient(90deg, transparent, #059669 20%, #b45309 80%, transparent); }

.rc-title { position: relative; text-align: center; font-size: 1.5em; letter-spacing: 0.18em; font-weight: 850; color: #065f46; margin: 1.3em 0 1.1em;
  display: flex; flex-direction: column; align-items: center; gap: 0.45em; }
.rc-tag { font-size: 0.42em; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700; color: #2f8a63; padding: 3px 11px; border-radius: 999px;
  background: rgba(5,150,105,0.08); border: 1px solid rgba(5,150,105,0.24); }

.rc-body { display: flex; flex-direction: column; gap: 0.75em; }
.rc-line { margin: 0; }
.rc-line :deep(b) { color: #14210f; font-weight: 750; }

/* horizontal three-seal attestation strip */
.rc-attest { display: flex; gap: 8px; margin: 1.3em 0 0.4em; }
.rc-seal { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; text-align: center; padding: 9px 6px; border-radius: 9px;
  background: rgba(5,150,105,0.06); border: 1px solid rgba(5,150,105,0.2); }
.rc-seal-disc { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; color: #fff; background: radial-gradient(circle at 38% 32%, #34d399, #047857 72%);
  box-shadow: 0 2px 6px rgba(5,90,60,0.4); }
.rc-seal-l { font-size: 0.66em; font-weight: 700; color: #2a3a2c; line-height: 1.3; }

.rc-foot { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-top: 1.6em; }
.rc-sign { display: flex; flex-direction: column; gap: 1px; }
.rc-sign-line { display: inline-flex; color: #2f8a63; padding-bottom: 4px; border-bottom: 1.4px solid #6e9e84; width: 82px; margin-bottom: 4px; }
.rc-sign-name { font-size: 0.84em; font-weight: 800; color: #1f2a20; }
.rc-sign-role { font-size: 0.66em; color: #5f7a64; }

.rc-verify { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.rc-qr { position: relative; display: grid; grid-template-columns: repeat(13, 1fr); gap: 1px; width: 62px; height: 62px; padding: 3px; border-radius: 5px;
  background: #fff; border: 1px solid rgba(5,150,105,0.3); }
.rc-qr-cell { background: transparent; border-radius: 0.5px; }
.rc-qr-cell.on { background: #134e36; }
.rc-qr.live .rc-qr-cell.on { animation: rc-qr-pop 0.4s var(--ex-spring) backwards; animation-delay: var(--qd); }
.rc-qr-find { position: absolute; width: 14px; height: 14px; border: 2.5px solid #134e36; border-radius: 1px; }
.rc-qr-find.tl { top: 4px; left: 4px; } .rc-qr-find.tr { top: 4px; right: 4px; } .rc-qr-find.bl { bottom: 4px; left: 4px; }
.rc-qr-cap { font-size: 0.6em; letter-spacing: 0.06em; color: #5f7a64; }
.rc-qr-code { font-size: 0.6em; font-family: var(--ex-mono); letter-spacing: 0.08em; color: #047857; font-weight: 700; }

/* angled stamp */
.rc-stamp { position: absolute; right: 30px; bottom: 78px; display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 6px 12px;
  border: 2px solid #047857; border-radius: 6px; color: #047857; transform: rotate(-13deg) scale(0.4); transform-origin: center;
  opacity: 0; transition: transform 0.7s var(--ex-spring), opacity 0.5s; }
.rc-stamp.pressed { transform: rotate(-9deg) scale(1); opacity: 0.88; }
.st-revoked .rc-stamp { border-color: #b91c1c; color: #b91c1c; }
.rc-stamp-ic { margin-bottom: 1px; }
.rc-stamp-a { font-size: 1.05em; font-weight: 850; letter-spacing: 0.14em; line-height: 1; }
.rc-stamp-b { font-size: 0.5em; letter-spacing: 0.16em; }

.rc-base { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: linear-gradient(90deg, #34d399, #059669 55%, #b45309); }
.st-issued .rc-base { background: linear-gradient(90deg, #6ee7b7, #34d399 55%, #059669); }

.rc-released { position: absolute; top: 14px; right: 14px; display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px;
  font-size: 0.64em; font-weight: 800; letter-spacing: 0.03em; color: #065f46; background: rgba(52,211,153,0.16); border: 1px solid rgba(5,150,105,0.4); box-shadow: 0 0 16px rgba(52,211,153,0.3); }
.rc-chip-enter-active { transition: all 0.6s var(--ex-spring) 0.4s; }
.rc-chip-enter-from { opacity: 0; transform: translateY(-6px) scale(0.9); }

.rc-wm { position: absolute; top: 52%; left: 54%; transform: translate(-50%, -50%) rotate(-24deg); pointer-events: none;
  font-size: 3.4em; font-weight: 900; letter-spacing: 0.12em; }
.wm-draft { color: rgba(5,150,105,0.1); } .wm-preview { color: rgba(70,100,80,0.08); }
.wm-void { color: rgba(220,38,38,0.13); border: 4px solid rgba(220,38,38,0.13); padding: 4px 18px; border-radius: 8px; }

.rcert-glare { position: absolute; inset: 0; border-radius: 9px; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(420px circle at calc(var(--mx,0.5) * 100%) calc(var(--my,0.5) * 100%), rgba(255,255,255,0.18), transparent 45%); mix-blend-mode: overlay; }

@keyframes rc-foil { 0% { transform: translateX(-130%); } 45%, 100% { transform: translateX(180%); } }
@keyframes rc-qr-pop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }

@media (max-width: 560px) { .rcert-sheet { font-size: 10px; } }
@media (prefers-reduced-motion: reduce) {
  .rcert-frame:hover .rcert { transform: none; }
  .rc-foil, .rc-qr.live .rc-qr-cell.on { animation: none; }
  .rc-crest, .rc-stamp { transition: opacity 0.3s; }
}
</style>
