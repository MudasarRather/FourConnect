<template>
  <div
    ref="cardEl" class="sd-cry" :class="{ ready, compact }" :style="{ '--gem': gemColor, '--mx': mx, '--my': my, '--sp': spot }"
    @pointermove="onMove" @pointerleave="onLeave"
  >
    <span class="cry-grain" aria-hidden="true" />
    <span class="cry-glare" aria-hidden="true" />

    <!-- credential head -->
    <div class="cry-head">
      <span class="cry-kind"><component :is="typeIcon" :size="13" /> {{ typeLabel }}</span>
      <span class="cry-stamp" :class="state">{{ stampText }}</span>
    </div>

    <!-- the forming crystal -->
    <div class="cry-stage">
      <svg class="cry-gem" viewBox="0 0 120 150" role="img" :aria-label="`Ticket forming — ${pct}% complete`">
        <defs>
          <linearGradient id="cryShine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(255,255,255,0.0)" />
            <stop offset="50%" stop-color="rgba(255,255,255,0.55)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0.0)" />
          </linearGradient>
          <clipPath id="cryClip"><path d="M30,28 L90,28 L112,60 L60,134 L8,60 Z" /></clipPath>
        </defs>

        <!-- charge ring -->
        <circle class="cry-ring-bg" cx="60" cy="74" r="60" />
        <circle
          class="cry-ring" cx="60" cy="74" r="60"
          :stroke-dasharray="ringC" :stroke-dashoffset="ringOffset"
          transform="rotate(-90 60 74)"
        />

        <!-- facets — ignite progressively as the ticket forms -->
        <g class="cry-facets">
          <polygon v-for="f in facets" :key="f.id" :points="f.pts"
            class="facet" :class="[f.cls, { lit: lit > f.stage }]" />
        </g>
        <path class="cry-edge" d="M30,28 L90,28 L112,60 L60,134 L8,60 Z" />
        <line class="cry-girdle" x1="8" y1="60" x2="112" y2="60" />

        <!-- specular sweep, clipped to the gem -->
        <g clip-path="url(#cryClip)">
          <rect class="cry-sweep" x="-60" y="0" width="50" height="150" fill="url(#cryShine)" />
        </g>

        <!-- seal burst on ready -->
        <circle v-if="ready" class="cry-seal" cx="60" cy="74" r="20" />
      </svg>

      <div class="cry-core-readout">
        <SdCountUp :value="pct" :duration="600" suffix="%" />
        <i>formed</i>
      </div>
    </div>

    <!-- subject + classification -->
    <p class="cry-subject" :class="{ ph: !subject }">{{ subject || 'Your subject crystallises here…' }}</p>
    <div class="cry-pills">
      <span class="cry-pri" :style="{ '--pc': gemColor }"><i />{{ priLabel }} · {{ pCode }}</span>
      <span v-if="categoryName" class="cry-cat">{{ categoryName }}</span>
    </div>

    <!-- formation ledger (hidden in compact/hero mode — the stepper shows progress) -->
    <ul v-if="!compact" class="cry-ledger">
      <li v-for="s in steps" :key="s.key" :class="{ done: s.done }">
        <span class="led-node"><Check v-if="s.done" :size="10" /><span v-else class="led-dot" /></span>
        <span class="led-lbl">{{ s.label }}</span>
      </li>
    </ul>

    <!-- foot -->
    <div class="cry-foot">
      <span class="cry-no sd-mono">{{ draftLabel }}</span>
      <span class="cry-who">{{ requesterName }}</span>
    </div>
    <span class="cry-shine" aria-hidden="true" />
  </div>
</template>

<script setup>
/*
  SdIntakeCrystal — the signature "forming ticket credential".
  A faceted gem whose facets ignite as the requester completes the intake, a
  charge-ring that fills to completion %, a formation ledger that checks off,
  and a READY seal + sheen when the ticket can be submitted. 3D pointer-tilt +
  spotlight glare. Pure SVG/CSS — themeable, light + dark, reduced-motion aware.
  Distinct from every Support Desk sibling (basin / reactor / orbit / table).
*/
import { ref, computed } from 'vue'
import { Check, AlertTriangle, Inbox, Bug, Sparkles, MessageCircleWarning, GitPullRequest, Wrench, GraduationCap, Hammer } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'
import { priorityColor, priorityLabel, priorityP } from '@/composables/useSupportDesk'

const props = defineProps({
  subject: { type: String, default: '' },
  ticketType: { type: String, default: 'incident' },
  priority: { type: String, default: 'medium' },
  categoryName: { type: String, default: '' },
  completion: { type: Number, default: 0 },   // 0..1
  ready: { type: Boolean, default: false },
  steps: { type: Array, default: () => [] },  // [{ key, label, done }]
  requesterName: { type: String, default: 'You' },
  draftLabel: { type: String, default: 'TKT-••••••' },
  compact: { type: Boolean, default: false },   // hero mode — smaller gem, no ledger
})

const TYPE_ICONS = {
  incident: AlertTriangle, service_request: Inbox, bug: Bug, feature_request: Sparkles,
  complaint: MessageCircleWarning, change: GitPullRequest, problem: Wrench,
  training: GraduationCap, implementation: Hammer,
}
const TYPE_LABELS = {
  incident: 'Incident', service_request: 'Service Request', bug: 'Bug', feature_request: 'Feature',
  complaint: 'Complaint', change: 'Change', problem: 'Problem', training: 'Training', implementation: 'Implementation',
}
const typeIcon = computed(() => TYPE_ICONS[props.ticketType] || Inbox)
const typeLabel = computed(() => TYPE_LABELS[props.ticketType] || 'Ticket')
const gemColor = computed(() => priorityColor(props.priority))
const priLabel = computed(() => priorityLabel(props.priority))
const pCode = computed(() => priorityP(props.priority) || '—')

const pct = computed(() => Math.round(Math.min(1, Math.max(0, props.completion)) * 100))
const state = computed(() => (props.ready ? 'ready' : pct.value > 0 ? 'forming' : 'draft'))
const stampText = computed(() => (props.ready ? 'READY' : pct.value > 0 ? 'FORMING' : 'DRAFT'))

// charge ring geometry
const ringC = 2 * Math.PI * 60
const ringOffset = computed(() => ringC * (1 - Math.min(1, Math.max(0, props.completion))))

// 7 facets of a brilliant-cut silhouette; each lights at its stage
const facets = [
  { id: 't', cls: 'f-table', stage: 0, pts: '30,28 90,28 80,60 40,60' },
  { id: 'cl', cls: 'f-crown', stage: 1, pts: '30,28 40,60 8,60' },
  { id: 'cr', cls: 'f-crown', stage: 2, pts: '90,28 112,60 80,60' },
  { id: 'pm', cls: 'f-pav-main', stage: 3, pts: '40,60 80,60 60,134' },
  { id: 'pl', cls: 'f-pav', stage: 4, pts: '8,60 40,60 60,134' },
  { id: 'pr', cls: 'f-pav', stage: 5, pts: '80,60 112,60 60,134' },
]
const lit = computed(() => Math.round(Math.min(1, Math.max(0, props.completion)) * (facets.length + 1)))

// pointer tilt + spotlight
const cardEl = ref(null)
const mx = ref(0.5); const my = ref(0.5); const spot = ref(0)
const onMove = (e) => {
  const el = cardEl.value; if (!el) return
  const r = el.getBoundingClientRect()
  mx.value = (e.clientX - r.left) / r.width
  my.value = (e.clientY - r.top) / r.height
  spot.value = 1
}
const onLeave = () => { mx.value = 0.5; my.value = 0.5; spot.value = 0 }
</script>

<style scoped>
.sd-cry {
  position: relative; overflow: hidden;
  padding: 15px 16px 14px; border-radius: 20px;
  background: linear-gradient(165deg, var(--sd-surface-elevated), var(--sd-panel));
  border: 1px solid var(--sd-border-strong);
  box-shadow: var(--sd-card-shadow);
  transform: perspective(1100px) rotateX(calc((var(--my) - 0.5) * -7deg)) rotateY(calc((var(--mx) - 0.5) * 9deg));
  transition: transform 0.3s var(--sd-spring), border-color 0.5s, box-shadow 0.5s;
  transform-style: preserve-3d;
}
.sd-cry.ready { border-color: color-mix(in srgb, var(--gem) 45%, var(--sd-border-strong)); box-shadow: var(--sd-card-shadow), 0 0 34px color-mix(in srgb, var(--gem) 30%, transparent); }
.cry-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px); background-size: 3px 3px; }
.cry-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--sp, 0); transition: opacity 0.3s; background: radial-gradient(420px circle at calc(var(--mx) * 100%) calc(var(--my) * 100%), color-mix(in srgb, var(--gem) 22%, transparent), transparent 60%); }

.cry-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; position: relative; z-index: 2; }
.cry-kind { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: var(--gem); }
.cry-stamp { font-family: var(--sd-mono); font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; padding: 3px 8px; border-radius: 6px; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px dashed var(--sd-border-strong); }
.cry-stamp.forming { color: var(--sd-amber); border-color: var(--sd-amber-border); border-style: solid; background: var(--sd-amber-soft); }
.cry-stamp.ready { color: var(--sd-success); border-color: color-mix(in srgb, var(--sd-success) 34%, transparent); border-style: solid; background: var(--sd-success-soft); }

.cry-stage { position: relative; display: grid; place-items: center; margin: 2px 0 8px; }
.cry-gem { width: 110px; height: 138px; overflow: visible; }
.cry-ring-bg { fill: none; stroke: var(--sd-border-strong); stroke-width: 2.5; opacity: 0.5; }
.cry-ring { fill: none; stroke: var(--gem); stroke-width: 3; stroke-linecap: round; filter: drop-shadow(0 0 5px color-mix(in srgb, var(--gem) 60%, transparent)); transition: stroke-dashoffset 0.7s var(--sd-spring), stroke 0.4s; }

.facet { stroke: color-mix(in srgb, var(--gem) 40%, transparent); stroke-width: 0.5; opacity: 0.14; transition: opacity 0.5s var(--sd-spring), fill 0.4s; }
.facet.f-table { fill: color-mix(in srgb, var(--gem) 70%, #ffffff 12%); }
.facet.f-crown { fill: color-mix(in srgb, var(--gem) 55%, transparent); }
.facet.f-pav-main { fill: color-mix(in srgb, var(--gem) 80%, #000 14%); }
.facet.f-pav { fill: color-mix(in srgb, var(--gem) 62%, #000 8%); }
.facet.lit { opacity: 0.95; }
.cry-edge { fill: none; stroke: color-mix(in srgb, var(--gem) 75%, #ffffff 8%); stroke-width: 1.4; stroke-linejoin: round; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--gem) 45%, transparent)); }
.cry-girdle { stroke: color-mix(in srgb, var(--gem) 60%, transparent); stroke-width: 0.8; opacity: 0.6; }
.cry-sweep { animation: cry-sweep 4.5s var(--sd-ease) infinite; }
.sd-cry.ready .cry-sweep { animation-duration: 2.6s; }
.cry-seal { fill: none; stroke: var(--sd-success); stroke-width: 2; opacity: 0; animation: cry-seal 0.9s var(--sd-ease) 1; }

.cry-core-readout { position: absolute; display: flex; flex-direction: column; align-items: center; line-height: 1; pointer-events: none; }
.cry-core-readout :deep(.sd-cup) { font-size: 19px; font-weight: 800; color: var(--sd-text); }
.cry-core-readout i { font-style: normal; font-size: 8.5px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--sd-text-dim); margin-top: 2px; }

.cry-subject { position: relative; z-index: 2; font-size: 13.5px; font-weight: 700; color: var(--sd-text); margin: 0 0 8px; line-height: 1.3; min-height: 2.2em; }
.cry-subject.ph { color: var(--sd-text-dim); font-weight: 500; font-style: italic; }
.cry-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; position: relative; z-index: 2; }
.cry-pri { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: var(--pc); padding: 3px 9px; border-radius: 999px; background: color-mix(in srgb, var(--pc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--pc) 30%, transparent); }
.cry-pri i { width: 6px; height: 6px; border-radius: 50%; background: var(--pc); box-shadow: 0 0 7px var(--pc); }
.cry-cat { font-size: 10.5px; font-weight: 600; color: var(--sd-text-secondary); padding: 3px 9px; border-radius: 999px; background: var(--sd-surface); border: 1px solid var(--sd-border); }

.cry-ledger { list-style: none; margin: 0 0 11px; padding: 10px 0 0; display: grid; gap: 6px; border-top: 1px dashed var(--sd-border-strong); position: relative; z-index: 2; }
.cry-ledger li { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--sd-text-muted); transition: color 0.3s; }
.cry-ledger li.done { color: var(--sd-text-secondary); }
.led-node { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid var(--sd-border-strong); color: var(--sd-success); flex-shrink: 0; transition: all 0.3s var(--sd-spring); }
.cry-ledger li.done .led-node { border-color: color-mix(in srgb, var(--sd-success) 50%, transparent); background: var(--sd-success-soft); }
.led-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--sd-text-dim); }

.cry-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; position: relative; z-index: 2; }
.cry-no { font-size: 10.5px; color: var(--sd-text-dim); letter-spacing: 0.08em; }
.cry-who { font-size: 10.5px; font-weight: 600; color: var(--sd-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 55%; }
.cry-barcode { display: flex; gap: 2px; margin-top: 9px; opacity: 0.45; position: relative; z-index: 2; }
.cry-barcode span { flex: 1; height: 9px; background: var(--sd-text-dim); border-radius: 1px; }
.cry-barcode span:nth-child(3n) { height: 13px; opacity: 0.7; }
.cry-barcode span:nth-child(4n) { opacity: 0.4; }
.cry-shine { position: absolute; top: 0; left: 0; width: 38%; height: 100%; pointer-events: none; background: linear-gradient(105deg, transparent, rgba(255,255,255,0.07), transparent); transform: translateX(-130%) skewX(-18deg); animation: sd-sheen-pass 6.5s ease-in-out infinite; }
.sd-cry.ready .cry-shine { animation-duration: 3.6s; }

@keyframes cry-sweep { 0% { transform: translateX(0); } 100% { transform: translateX(180px); } }
@keyframes cry-seal { 0% { opacity: 0.9; r: 20; } 100% { opacity: 0; r: 52; } }

/* ── compact (hero) mode — smaller gem, no ledger, snug ── */
.sd-cry.compact { padding: 14px 16px 13px; height: 100%; display: flex; flex-direction: column; }
.sd-cry.compact .cry-stage { margin: 4px 0 8px; }
.sd-cry.compact .cry-gem { width: 96px; height: 120px; }
.sd-cry.compact .cry-core-readout :deep(.sd-cup) { font-size: 16px; }
.sd-cry.compact .cry-subject { min-height: 0; -webkit-line-clamp: 2; line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 8px; }
.sd-cry.compact .cry-pills { margin-bottom: 0; }
.sd-cry.compact .cry-foot { margin-top: auto; padding-top: 10px; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sd-cry { transform: none; transition: border-color 0.4s, box-shadow 0.4s; }
  html:not([data-cinematic="on"]) .cry-sweep,
  html:not([data-cinematic="on"]) .cry-shine,
  html:not([data-cinematic="on"]) .cry-seal { animation: none; }
}
</style>
