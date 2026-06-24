<template>
  <!-- Passage-token chip — roster master for the Liberation Gate. A gate-arch
       glyph whose portcullis RAISES with release-readiness (clearance + F&F),
       employee + letter-state pill, plus a dual readiness meter. 3D-tilt,
       status spine. Deliberately NOT the wax-seal medallion of the Experience
       atelier chip — an arch you pass through, not a stamp. -->
  <button ref="el" type="button" class="rtc" :class="[`st-${ls}`, { on: active, ready: isReady }]"
    :style="{ '--i': index }" @click="$emit('select', c.id)">
    <span class="rtc-glare" aria-hidden="true" />

    <!-- gate-arch glyph -->
    <span class="rtc-gate" :class="{ lit: c.letterStatus === 'ISSUED' }">
      <svg viewBox="0 0 40 44" aria-hidden="true">
        <path class="rtc-arch" d="M5 43 V18 A15 15 0 0 1 35 18 V43" />
        <rect class="rtc-port" x="9" y="14" width="22" height="29" rx="2" :style="{ '--raise': portRaise }" />
      </svg>
      <component :is="meta.icon || DoorClosed" :size="13" class="rtc-ic" />
    </span>

    <span class="rtc-body">
      <span class="rtc-name">{{ c.employee_name || c.employee_code || '—' }}</span>
      <span class="rtc-meta ex-mono">{{ c.case_number }} · {{ c.department_name || '—' }}</span>
      <span class="rtc-foot">
        <span class="rtc-pill">{{ meta.label }}</span>
        <span v-if="isReady" class="rtc-rdy"><Gem :size="9" /> ready</span>
        <span v-else-if="c.blocked" class="rtc-blk"><Lock :size="9" /> held</span>
      </span>
    </span>

    <!-- dual readiness meter -->
    <span class="rtc-gauge" :title="`Clearance ${c.clearancePct || 0}% · F&F ${c.settlementDone ? 'settled' : 'pending'}`">
      <span class="rtc-bar"><i :style="{ width: (c.clearancePct || 0) + '%' }" /></span>
      <span class="rtc-bar"><i class="ff" :style="{ width: c.settlementDone ? '100%' : '0%' }" /></span>
    </span>
  </button>
</template>

<script setup>
import { computed, ref } from 'vue'
import { DoorClosed, DoorOpen, PenLine, Footprints, FileX, Gem, Lock } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  c: { type: Object, required: true },
  active: { type: Boolean, default: false },
  index: { type: Number, default: 0 },
})
defineEmits(['select'])

const el = ref(null)
usePointerSpotlight(el)

const ls = computed(() => (props.c.letterStatus || 'NOT_GENERATED').toLowerCase())
const isReady = computed(() => props.c.eligible && (props.c.letterStatus === 'NOT_GENERATED' || props.c.letterStatus === 'REVOKED'))
// portcullis raise: how far the gate door has lifted (0 closed → 1 fully open)
const portRaise = computed(() => {
  const clr = Math.min(1, (props.c.clearancePct || 0) / 100)
  const ff = props.c.settlementDone ? 1 : 0
  if (props.c.letterStatus === 'ISSUED') return 1
  return Math.min(0.92, clr * 0.6 + ff * 0.32)
})
const META = {
  NOT_GENERATED: { label: 'Sealed', icon: DoorClosed },
  GENERATED: { label: 'Drafted', icon: PenLine },
  ISSUED: { label: 'Released', icon: Footprints },
  REVOKED: { label: 'Revoked', icon: FileX },
}
const meta = computed(() => META[props.c.letterStatus] || META.NOT_GENERATED)
</script>

<style scoped>
.rtc { position: relative; overflow: hidden; display: flex; align-items: center; gap: 11px; flex-shrink: 0; width: 262px; padding: 11px 13px; border-radius: 15px; cursor: pointer; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); font-family: inherit;
  transition: transform 0.22s var(--ex-spring), border-color 0.22s, box-shadow 0.22s;
  animation: ex-deal 0.5s var(--ex-spring) backwards; animation-delay: calc(var(--i) * 0.045s); --mc: var(--ex-steel); }
.rtc::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--mc); opacity: 0; transition: opacity 0.22s; }
.rtc:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--mc) 50%, transparent); box-shadow: var(--ex-shadow); }
.rtc.on { border-color: color-mix(in srgb, var(--mc) 60%, transparent); background: color-mix(in srgb, var(--mc) 9%, transparent); }
.rtc.on::before, .rtc.st-issued::before, .rtc.st-revoked::before { opacity: 1; }
.st-not_generated { --mc: var(--ex-steel); } .st-generated { --mc: var(--ex-amber); }
.st-issued { --mc: var(--ex-cleared); } .st-revoked { --mc: var(--ex-blocked); }

.rtc-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.25s;
  background: radial-gradient(180px circle at calc(var(--mx,0.5) * 100%) calc(var(--my,0.5) * 100%), color-mix(in srgb, var(--mc) 22%, transparent), transparent 60%); }

/* gate-arch glyph */
.rtc-gate { position: relative; flex-shrink: 0; width: 40px; height: 44px; display: grid; place-items: center; }
.rtc-gate svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.rtc-arch { fill: none; stroke: color-mix(in srgb, var(--mc) 55%, transparent); stroke-width: 1.6; }
.rtc-port { fill: color-mix(in srgb, var(--mc) 30%, transparent); transform-origin: 20px 43px; transform: scaleY(calc(1 - var(--raise, 0))); transition: transform 0.7s var(--ex-spring); }
.rtc-gate.lit .rtc-arch { stroke: var(--ex-cleared); filter: drop-shadow(0 0 5px color-mix(in srgb, var(--ex-cleared) 60%, transparent)); }
.rtc-ic { position: relative; z-index: 1; color: var(--mc); }
.rtc-gate.lit .rtc-ic { color: var(--ex-cleared); }
.rtc.ready .rtc-gate::after { content: ''; position: absolute; inset: -4px; border-radius: 14px 14px 4px 4px; border: 1px solid color-mix(in srgb, var(--ex-ember) 50%, transparent); animation: rtc-rdy 2.4s ease-out infinite; }

.rtc-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rtc-name { font-size: 13px; font-weight: 750; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rtc-meta { font-size: 10px; color: var(--ex-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rtc-foot { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
.rtc-pill { font-size: 9.5px; font-weight: 800; letter-spacing: 0.02em; padding: 2px 7px; border-radius: 999px; color: var(--mc);
  background: color-mix(in srgb, var(--mc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--mc) 30%, transparent); }
.rtc-rdy { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 800; color: var(--ex-ember); }
.rtc-blk { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 750; color: var(--ex-text-dim); }

/* dual readiness meter */
.rtc-gauge { display: flex; flex-direction: column; gap: 3px; width: 30px; flex-shrink: 0; }
.rtc-bar { height: 4px; border-radius: 3px; overflow: hidden; background: color-mix(in srgb, var(--ex-steel) 22%, transparent); }
.rtc-bar i { display: block; height: 100%; border-radius: 3px; background: var(--ex-amber); transition: width 0.7s var(--ex-spring); }
.rtc-bar i.ff { background: var(--ex-cleared); }

@keyframes rtc-rdy { 0% { transform: scale(0.94); opacity: 0.7; } 80%, 100% { transform: scale(1.16); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .rtc { animation: none; } .rtc.ready .rtc-gate::after { animation: none; } .rtc-port, .rtc-bar i { transition: none; } }
</style>
