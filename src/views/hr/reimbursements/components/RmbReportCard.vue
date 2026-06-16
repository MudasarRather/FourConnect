<template>
  <Motion
    as="article"
    ref="cardRef"
    class="rmb-report-card rmb-receipt"
    :style="{ '--acc': report.accent, '--deep': report.deep, '--soft': report.soft }"
    :initial="{ opacity: 0, y: 24, filter: 'blur(8px)' }"
    :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
    :whileHover="{ y: -6 }"
    :transition="{ duration: 0.55, delay: Math.min(index, 10) * 0.06, ease: [0.16, 1, 0.3, 1] }"
  >
    <span class="rmb-spotlight" aria-hidden="true" />
    <span class="rc-sheen" aria-hidden="true" />
    <span class="rc-spine" aria-hidden="true" />

    <!-- ── animated motif banner (unique per report) ── -->
    <div class="rc-visual" :data-motif="report.motif" aria-hidden="true">
      <span class="rc-grid-fx" />

      <!-- ledger tape -->
      <template v-if="report.motif === 'ledger'">
        <span v-for="n in 6" :key="n" class="m-line" :style="{ width: (40 + (n * 13) % 50) + '%', animationDelay: (n * 0.22) + 's' }" />
      </template>

      <!-- vault rings -->
      <div v-else-if="report.motif === 'vault'" class="m-vault">
        <span class="m-ring r1" /><span class="m-ring r2" /><span class="m-coin">₹</span>
      </div>

      <!-- spectrum equalizer -->
      <div v-else-if="report.motif === 'spectrum'" class="m-eq">
        <span v-for="n in 9" :key="n" class="m-eqbar" :style="{ animationDelay: (n * 0.11) + 's', background: spectrumColor(n) }" />
      </div>

      <!-- podium -->
      <div v-else-if="report.motif === 'podium'" class="m-podium">
        <span class="m-pod p2" /><span class="m-pod p1" /><span class="m-pod p3" />
      </div>

      <!-- pipeline -->
      <div v-else-if="report.motif === 'pipeline'" class="m-pipe">
        <span class="m-track" /><span v-for="n in 4" :key="n" class="m-node" /><span class="m-travel" />
      </div>

      <!-- stopwatch -->
      <div v-else-if="report.motif === 'stopwatch'" class="m-watch">
        <span class="m-dial" /><span class="m-hand" /><span class="m-pip" />
      </div>

      <!-- payslip stub -->
      <div v-else-if="report.motif === 'payslip'" class="m-stub">
        <i v-for="n in 3" :key="n" class="m-srow" :style="{ animationDelay: (n * 0.25) + 's' }" />
        <span class="m-perf" />
      </div>

      <!-- clawback -->
      <div v-else-if="report.motif === 'clawback'" class="m-claw">
        <span class="m-hazard" />
        <svg viewBox="0 0 48 48" class="m-undo"><path d="M34 14 H16 a10 10 0 1 0 0 20" fill="none"
          stroke="currentColor" stroke-width="4" stroke-linecap="round" /><path d="M34 6 L44 14 L34 22 Z" fill="currentColor" /></svg>
      </div>

      <span class="rc-badge"><component :is="report.icon" :size="17" :stroke-width="2" /></span>
    </div>

    <!-- ── body ── -->
    <div class="rc-body">
      <span class="rc-eyebrow rmb-mono">{{ report.tagline || 'Report' }}</span>
      <h4>{{ report.name }}</h4>
      <p>{{ report.description }}</p>
    </div>

    <!-- ── export rail ── -->
    <div class="rc-formats">
      <button v-for="f in FORMATS" :key="f.key" class="rc-fmt" :class="{ busy: busy === f.key, done: done === f.key }"
              :disabled="!!busy" @click="$emit('download', f.key)">
        <span class="rc-fmt-ic">
          <Loader2 v-if="busy === f.key" :size="14" class="spin" />
          <Check v-else-if="done === f.key" :size="14" />
          <component v-else :is="f.icon" :size="14" />
        </span>
        {{ f.label }}
      </button>
    </div>
  </Motion>
</template>

<script setup>
import { ref } from 'vue'
import { Motion } from 'motion-v'
import { FileText, FileSpreadsheet, FileType, Loader2, Check } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

defineProps({
  report: { type: Object, required: true },   // { key, name, description, tagline, accent, deep, soft, motif, icon }
  index: { type: Number, default: 0 },
  busy: { type: String, default: '' },         // '' | 'csv' | 'excel' | 'pdf'
  done: { type: String, default: '' },
})
defineEmits(['download'])

const cardRef = ref(null)
usePointerSpotlight(cardRef)

const FORMATS = [
  { key: 'csv', label: 'CSV', icon: FileText },
  { key: 'excel', label: 'Excel', icon: FileSpreadsheet },
  { key: 'pdf', label: 'PDF', icon: FileType },
]

const SPECTRUM = ['#7c3aed', '#0d9488', '#ea580c', '#2563eb', '#db2777', '#16a34a', '#d97706', '#0891b2', '#9333ea']
const spectrumColor = (n) => SPECTRUM[(n - 1) % SPECTRUM.length]
</script>

<style scoped>
.rmb-report-card {
  position: relative; padding: 0 0 14px; overflow: hidden; display: flex; flex-direction: column;
  background: linear-gradient(168deg, var(--rmb-paper-elevated), var(--rmb-paper));
  box-shadow: 0 12px 32px -22px rgba(0, 0, 0, 0.6);
  transition: box-shadow 0.4s var(--rmb-spring), border-color 0.3s; will-change: transform;
}
.rmb-report-card:hover {
  box-shadow: 0 28px 56px -26px color-mix(in srgb, var(--acc) 50%, rgba(0,0,0,0.5));
  border-color: color-mix(in srgb, var(--acc) 42%, var(--rmb-border-soft));
}
.rc-spine { position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; z-index: 4; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 28%, transparent));
  box-shadow: 0 0 13px -1px var(--acc); }
.rc-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0; z-index: 5; border-radius: inherit;
  background: linear-gradient(115deg, transparent 44%, color-mix(in srgb, var(--rmb-amber-bright) 16%, transparent) 50%, transparent 56%);
  background-size: 240% 100%; }
.rmb-report-card:hover .rc-sheen { opacity: 1; animation: rmb-amount-shimmer 1.15s var(--rmb-ease) 1; }

/* ── motif banner ── */
.rc-visual { position: relative; height: 92px; overflow: hidden; display: grid; place-items: center;
  background:
    radial-gradient(120% 120% at 18% 0%, color-mix(in srgb, var(--acc) 24%, transparent), transparent 60%),
    linear-gradient(135deg, color-mix(in srgb, var(--acc) 16%, var(--rmb-paper-elevated)), var(--rmb-paper));
  color: var(--acc); border-bottom: 1px solid color-mix(in srgb, var(--acc) 22%, var(--rmb-border-soft)); }
.rc-grid-fx { position: absolute; inset: 0; opacity: 0.5; pointer-events: none;
  background-image: linear-gradient(color-mix(in srgb, var(--acc) 10%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--acc) 10%, transparent) 1px, transparent 1px);
  background-size: 18px 18px; -webkit-mask: radial-gradient(100% 100% at 50% 0%, #000, transparent 75%); mask: radial-gradient(100% 100% at 50% 0%, #000, transparent 75%); }
.rc-badge { position: absolute; right: 12px; bottom: 12px; z-index: 3; width: 34px; height: 34px; border-radius: 11px;
  display: grid; place-items: center; color: var(--acc); background: color-mix(in srgb, var(--acc) 16%, var(--rmb-paper-elevated));
  border: 1px solid color-mix(in srgb, var(--acc) 35%, transparent); box-shadow: 0 6px 16px -8px var(--acc);
  transition: transform 0.4s var(--rmb-spring); }
.rmb-report-card:hover .rc-badge { transform: scale(1.12) rotate(-6deg); }

/* ledger */
.m-line { position: relative; display: block; height: 5px; border-radius: 3px; margin: 3px 0;
  background: linear-gradient(90deg, color-mix(in srgb, var(--acc) 65%, transparent), transparent);
  animation: ledger-feed 2.6s ease-in-out infinite; }
.rc-visual[data-motif="ledger"] { justify-items: start; padding-left: 18px; }
@keyframes ledger-feed { 0%,100% { opacity: 0.35; transform: translateX(0); } 50% { opacity: 1; transform: translateX(6px); } }

/* vault */
.m-vault { position: relative; width: 70px; height: 70px; display: grid; place-items: center; }
.m-ring { position: absolute; border-radius: 50%; border: 2px solid color-mix(in srgb, var(--acc) 55%, transparent); }
.m-ring.r1 { inset: 0; border-style: dashed; animation: rmb-orbit 9s linear infinite; }
.m-ring.r2 { inset: 14px; animation: rmb-orbit 6s linear infinite reverse; opacity: 0.6; }
.m-coin { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; color: #fff;
  background: linear-gradient(150deg, var(--acc), color-mix(in srgb, var(--acc) 60%, #000)); animation: coin-pulse 2.4s ease-in-out infinite; }
@keyframes coin-pulse { 0%,100% { transform: scale(1); box-shadow: 0 0 0 0 color-mix(in srgb, var(--acc) 45%, transparent); }
  50% { transform: scale(1.08); box-shadow: 0 0 0 8px transparent; } }

/* spectrum */
.m-eq { display: flex; align-items: flex-end; gap: 4px; height: 46px; }
.m-eqbar { width: 5px; height: 100%; border-radius: 3px; transform-origin: bottom; opacity: 0.85;
  animation: eq-bounce 1.3s ease-in-out infinite; }
@keyframes eq-bounce { 0%,100% { transform: scaleY(0.28); } 50% { transform: scaleY(1); } }

/* podium */
.m-podium { display: flex; align-items: flex-end; gap: 6px; height: 50px; }
.m-pod { width: 18px; border-radius: 4px 4px 0 0; transform-origin: bottom;
  background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 45%, transparent)); animation: pod-rise 2.6s var(--rmb-spring) infinite; }
.m-pod.p1 { height: 46px; animation-delay: 0.1s; }
.m-pod.p2 { height: 32px; animation-delay: 0.25s; opacity: 0.8; }
.m-pod.p3 { height: 24px; animation-delay: 0.4s; opacity: 0.65; }
@keyframes pod-rise { 0%,100% { transform: scaleY(0.7); } 50% { transform: scaleY(1); } }

/* pipeline */
.m-pipe { position: relative; width: 150px; height: 20px; display: flex; align-items: center; justify-content: space-between; }
.m-track { position: absolute; left: 4px; right: 4px; top: 50%; height: 2px; background: color-mix(in srgb, var(--acc) 35%, transparent); }
.m-node { position: relative; width: 12px; height: 12px; border-radius: 50%; background: var(--rmb-paper-elevated);
  border: 2px solid var(--acc); z-index: 1; }
.m-travel { position: absolute; left: 0; top: 50%; width: 8px; height: 8px; border-radius: 50%; margin-top: -4px; background: var(--acc);
  box-shadow: 0 0 10px 1px var(--acc); animation: travel 2.4s ease-in-out infinite; }
@keyframes travel { 0% { left: 2px; } 100% { left: calc(100% - 8px); } }

/* stopwatch */
.m-watch { position: relative; width: 58px; height: 58px; }
.m-dial { position: absolute; inset: 0; border-radius: 50%; border: 3px solid color-mix(in srgb, var(--acc) 30%, transparent);
  border-top-color: var(--acc); animation: rmb-orbit 3s linear infinite; }
.m-hand { position: absolute; left: 50%; top: 50%; width: 2px; height: 22px; background: var(--acc); transform-origin: bottom center;
  transform: translate(-50%, -100%); animation: rmb-orbit 1.6s linear infinite; }
.m-pip { position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%; background: var(--acc); }

/* payslip */
.m-stub { position: relative; width: 96px; padding: 10px 12px 14px; border-radius: 6px;
  background: var(--rmb-paper-elevated); border: 1px solid color-mix(in srgb, var(--acc) 28%, transparent); }
.m-srow { display: block; height: 4px; border-radius: 2px; margin: 5px 0; background: color-mix(in srgb, var(--acc) 50%, transparent);
  animation: srow-fill 2.4s ease-in-out infinite; }
.m-srow:nth-child(1) { width: 80%; } .m-srow:nth-child(2) { width: 60%; } .m-srow:nth-child(3) { width: 90%; }
@keyframes srow-fill { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
.m-perf { position: absolute; left: 0; right: 0; bottom: -1px; height: 6px;
  background-image: radial-gradient(circle at 5px 6px, transparent 3px, var(--acc) 3.5px);
  background-size: 10px 6px; opacity: 0.4; }

/* clawback */
.m-claw { position: relative; width: 64px; height: 50px; display: grid; place-items: center; }
.m-hazard { position: absolute; inset: 0; opacity: 0.18;
  background: repeating-linear-gradient(45deg, var(--acc) 0 6px, transparent 6px 12px); animation: hazard-slide 3s linear infinite; }
.m-undo { width: 40px; height: 40px; color: var(--acc); animation: undo-spin 4s ease-in-out infinite; }
@keyframes hazard-slide { from { background-position: 0 0; } to { background-position: 24px 0; } }
@keyframes undo-spin { 0%,70% { transform: rotate(0); } 85% { transform: rotate(-22deg); } 100% { transform: rotate(0); } }

/* ── body ── */
.rc-body { padding: 13px 16px 4px; flex: 1; }
.rc-eyebrow { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--acc); opacity: 0.9; }
.rc-body h4 { margin: 4px 0 5px; font-size: 15px; font-weight: 800; color: var(--rmb-text); letter-spacing: -0.2px; }
.rc-body p { margin: 0; font-size: 11.5px; color: var(--rmb-text-muted); line-height: 1.45; min-height: 32px; }

/* ── export rail ── */
.rc-formats { display: flex; gap: 7px; padding: 8px 16px 0; }
.rc-fmt { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 8px 0;
  border-radius: 9px; font-size: 11px; font-weight: 700; cursor: pointer; color: var(--rmb-text-secondary);
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); transition: all 0.22s var(--rmb-spring); }
.rc-fmt-ic { display: grid; place-items: center; }
.rc-fmt:hover:not(:disabled) { color: var(--acc); border-color: color-mix(in srgb, var(--acc) 45%, transparent);
  background: color-mix(in srgb, var(--acc) 10%, var(--rmb-surface)); transform: translateY(-2px); }
.rc-fmt:disabled { cursor: not-allowed; opacity: 0.6; }
.rc-fmt.busy { color: var(--acc); border-color: color-mix(in srgb, var(--acc) 50%, transparent); opacity: 1; }
.rc-fmt.done { color: var(--rmb-st-approved); border-color: color-mix(in srgb, var(--rmb-st-approved) 45%, transparent);
  background: var(--rmb-st-approved-soft); }
.spin { animation: rc-spin 0.8s linear infinite; }
@keyframes rc-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .m-line, .m-ring, .m-coin, .m-eqbar, .m-pod, .m-travel, .m-dial, .m-hand, .m-srow, .m-hazard, .m-undo,
  .rmb-report-card:hover .rc-sheen { animation: none !important; }
}
</style>
