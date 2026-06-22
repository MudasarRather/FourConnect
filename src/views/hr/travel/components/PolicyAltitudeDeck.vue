<template>
  <Motion as="section" class="deck trv-grain" ref="rootEl"
    :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <span class="deck-aura" aria-hidden="true" />
    <span class="deck-floor" aria-hidden="true" />

    <div class="deck-inner">
      <!-- ── governance readout ──────────────────────────────────────────── -->
      <div class="gov">
        <span class="gov-eyebrow"><ScrollText :size="12" /> Governance charter</span>
        <div class="gov-big"><TrvCountUp :value="activeCount" /><span class="gov-of">/ {{ policies.length }}</span></div>
        <span class="gov-cap">active {{ activeCount === 1 ? 'policy' : 'policies' }}</span>
        <p class="gov-sub">
          <b>{{ gradesCovered }}</b> grade band{{ gradesCovered === 1 ? '' : 's' }}<template v-if="hasAllGrades"> + a default</template> ·
          <b>{{ daCount }}</b> DA-eligible · chains avg <b>{{ avgChain }}</b> {{ avgChain === 1 ? 'stage' : 'stages' }}
        </p>
        <div class="gov-cabin" :style="{ '--c': topCabin.hex }">
          <PlaneTakeoff :size="13" /> Top cabin · <b>{{ topCabin.label }}</b>
        </div>
      </div>

      <!-- ── entitlement altitude ramp ───────────────────────────────────── -->
      <div class="alt">
        <div class="alt-scale" aria-hidden="true">
          <span class="alt-craft" :style="{ top: craftTop + '%' }"><Plane :size="14" /></span>
        </div>
        <div class="alt-lanes">
          <div v-for="(lane, li) in lanes" :key="lane.key" class="lane" :style="{ '--c': lane.hex }">
            <div class="lane-axis">
              <span class="lane-fl trv-mono">FL{{ (4 - li) * 10 || '00' }}</span>
              <span class="lane-name">{{ lane.label }}</span>
            </div>
            <div class="lane-track">
              <span class="lane-line" />
              <div v-if="lane.items.length" class="lane-chips">
                <Motion v-for="(p, pi) in lane.items" :key="p.id" as="button" class="chip" :style="{ '--c': lane.hex }"
                  :initial="{ opacity: 0, y: 18, scale: 0.9 }" :animate="drawn ? { opacity: 1, y: 0, scale: 1 } : {}"
                  :transition="{ duration: 0.5, delay: 0.1 + p._gi * 0.05, ease: [0.16, 1, 0.3, 1] }"
                  :whileHover="{ y: -3, scale: 1.04 }" :whileTap="{ scale: 0.97 }"
                  @click="$emit('open', p)" :title="`${p.policy_name} — open`">
                  <span class="chip-grade">{{ gradeShort(p) }}</span>
                  <span class="chip-meta trv-mono">{{ p.advance_limit ? '≤' + fmtCompactINR(p.advance_limit) : '∞' }}</span>
                  <span v-if="!p.is_active" class="chip-off" title="Inactive" />
                </Motion>
              </div>
              <span v-else class="lane-empty">—</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import { ScrollText, Plane, PlaneTakeoff } from 'lucide-vue-next'
import TrvCountUp from './TrvCountUp.vue'
import { fmtCompactINR, FLIGHT_CLASSES, flightClassMeta, DEFAULT_TRAVEL_CHAIN } from '@/composables/useTravel'
import { useInView, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ policies: { type: Array, default: () => [] }, grades: { type: Array, default: () => [] } })
defineEmits(['open'])

const rootEl = ref(null)
const drawn = ref(false)
const { visible } = useInView(rootEl, { threshold: 0.15 })
watch(visible, (v) => { if (v) requestAnimationFrame(() => requestAnimationFrame(() => { drawn.value = true })) })
onMounted(() => { if (prefersReduced()) drawn.value = true })

const activeCount = computed(() => props.policies.filter(p => p.is_active).length)
const daCount = computed(() => props.policies.filter(p => p.da_eligible).length)
const hasAllGrades = computed(() => props.policies.some(p => !p.grade_id))
const gradesCovered = computed(() => new Set(props.policies.filter(p => p.grade_id).map(p => p.grade_id)).size)
const avgChain = computed(() => {
  if (!props.policies.length) return DEFAULT_TRAVEL_CHAIN.length
  const sum = props.policies.reduce((a, p) => a + ((p.approval_chain && p.approval_chain.length) || DEFAULT_TRAVEL_CHAIN.length), 0)
  return Math.round(sum / props.policies.length)
})
const topCabin = computed(() => {
  let best = FLIGHT_CLASSES[0]
  for (const p of props.policies) { const m = flightClassMeta(p.flight_eligibility); if (m.rung > best.rung) best = m }
  return best
})
const craftTop = computed(() => Math.max(4, 96 - topCabin.value.rung * 23))

const gradeShort = (p) => {
  if (!p.grade_id) return 'ALL'
  const g = props.grades.find(x => x.id === p.grade_id)
  const name = g?.name || p.grade_name || 'G'
  return name.length > 8 ? name.slice(0, 7) + '…' : name
}

// lanes top→bottom = First → None; attach a global index for stagger
const lanes = computed(() => {
  let gi = 0
  const byRung = {}
  for (const p of props.policies) { const r = flightClassMeta(p.flight_eligibility).rung; (byRung[r] ||= []).push(p) }
  return [...FLIGHT_CLASSES].reverse().map(fc => ({
    ...fc,
    items: (byRung[fc.rung] || []).map(p => ({ ...p, _gi: gi++ })),
  }))
})
</script>

<style scoped>
.deck { position: relative; overflow: hidden; border-radius: 22px; margin-bottom: 16px; padding: 22px 24px;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border); box-shadow: var(--trv-shadow); }
.deck-aura { position: absolute; inset: -40% 20% 30% -10%; pointer-events: none;
  background: radial-gradient(58% 78% at 16% 4%, rgba(251,191,36,0.16), transparent 70%); animation: trv-aura-drift 11s ease-in-out infinite; }
.deck-floor { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(rgba(251,191,36,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.05) 1px, transparent 1px);
  background-size: 38px 38px; mask-image: radial-gradient(85% 85% at 70% 30%, #000, transparent 76%); }

.deck-inner { position: relative; display: grid; grid-template-columns: 210px 1fr; gap: 26px; align-items: stretch; }

/* readout */
.gov { display: flex; flex-direction: column; gap: 4px; }
.gov-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; color: var(--trv-amber); }
.gov-big { display: flex; align-items: baseline; gap: 6px; font-size: clamp(34px, 5vw, 48px); font-weight: 860; line-height: 1; letter-spacing: -0.01em;
  background: var(--trv-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; margin-top: 8px; }
.gov-of { font-size: 18px; font-weight: 700; -webkit-text-fill-color: var(--trv-text-dim); color: var(--trv-text-dim); }
.gov-cap { font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--trv-text-muted); }
.gov-sub { margin: 8px 0 0; font-size: 12px; line-height: 1.55; color: var(--trv-text-muted); }
.gov-sub b { color: var(--trv-text-secondary); }
.gov-cabin { display: inline-flex; align-items: center; gap: 6px; margin-top: auto; padding: 7px 11px; border-radius: 10px; font-size: 11.5px; font-weight: 650;
  color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); align-self: flex-start; }
.gov-cabin b { color: var(--trv-text); }

/* altitude ramp */
.alt { position: relative; display: flex; gap: 10px; }
.alt-scale { position: relative; width: 4px; border-radius: 999px; flex-shrink: 0;
  background: linear-gradient(180deg, var(--trv-ember-deep), var(--trv-amber) 60%, var(--trv-steel-soft)); }
.alt-craft { position: absolute; left: 50%; transform: translate(-50%, -50%); color: var(--trv-amber-bright);
  transition: top 1.2s var(--trv-spring); filter: drop-shadow(0 0 6px rgba(251,191,36,0.7)); animation: trv-plane-drift 4s ease-in-out infinite; }
.alt-lanes { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.lane { display: grid; grid-template-columns: 92px 1fr; gap: 12px; align-items: center; min-height: 46px; padding: 5px 0;
  border-bottom: 1px dashed var(--trv-border); }
.lane:last-child { border-bottom: none; }
.lane-axis { display: flex; flex-direction: column; gap: 1px; }
.lane-fl { font-size: 9px; font-weight: 700; color: var(--trv-text-dim); letter-spacing: 0.04em; }
.lane-name { font-size: 11.5px; font-weight: 700; color: var(--c); }
.lane-track { position: relative; display: flex; align-items: center; min-height: 34px; }
.lane-line { position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: linear-gradient(90deg, color-mix(in srgb, var(--c) 30%, transparent), transparent); }
.lane-chips { position: relative; display: flex; flex-wrap: wrap; gap: 7px; }
.chip { position: relative; display: inline-flex; align-items: center; gap: 7px; padding: 6px 11px; border-radius: 999px; cursor: pointer;
  background: color-mix(in srgb, var(--c) 13%, var(--trv-panel)); border: 1px solid color-mix(in srgb, var(--c) 38%, transparent);
  box-shadow: 0 4px 14px -6px color-mix(in srgb, var(--c) 60%, transparent); }
.chip-grade { font-size: 11.5px; font-weight: 750; color: var(--trv-text); }
.chip-meta { font-size: 10px; color: var(--c); font-weight: 700; }
.chip-off { width: 6px; height: 6px; border-radius: 50%; background: var(--trv-text-dim); box-shadow: 0 0 0 2px var(--trv-surface); }
.lane-empty { font-size: 12px; color: var(--trv-text-dim); }

@media (max-width: 760px) {
  .deck-inner { grid-template-columns: 1fr; gap: 18px; }
  .lane { grid-template-columns: 76px 1fr; }
}
@media (prefers-reduced-motion: reduce) { .deck-aura, .alt-craft { animation: none; } .alt-craft { transition: none; } }
</style>
