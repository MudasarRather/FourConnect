<template>
  <div class="sgr" ref="rootRef" :class="{ 'is-in': visible }">
    <header class="sgr-head">
      <div class="sgr-titles">
        <span class="sgr-eyebrow trn-mono"><Activity :size="12" /> Gap landscape</span>
        <h3>Where coverage runs thin</h3>
      </div>
      <span v-if="rows.length" class="sgr-pill" :class="{ clear: !criticalCount }">
        {{ criticalCount ? `${criticalCount} skills below bar` : 'all on track' }}
      </span>
    </header>

    <!-- celebratory clear-state -->
    <div v-if="!rows.length" class="sgr-clear">
      <span class="sgr-clear-ring"><ShieldCheck :size="22" /></span>
      <p class="sgr-clear-t">Every assessed competency meets its role requirement.</p>
      <span class="sgr-clear-s">No open gaps across the matrix — keep the cadence going.</span>
    </div>

    <ul v-else class="sgr-list">
      <Motion v-for="(r, i) in rows" :key="r.key" as="li" class="sgr-row" :style="{ '--c': r.color }"
        :initial="reduced ? false : { opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.5, delay: 0.05 + i * 0.07, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ x: 3 }">
        <span class="sgr-rank trn-mono">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="sgr-cat" :style="{ background: r.catColor }" :title="r.category" />
        <div class="sgr-body">
          <div class="sgr-top">
            <span class="sgr-name">{{ r.skill }}</span>
            <span class="sgr-gap trn-mono">−{{ r.gap.toFixed(1) }}</span>
          </div>
          <div class="sgr-track">
            <span class="sgr-fill" :style="{ width: visible ? r.pct + '%' : '0%', transitionDelay: (0.1 + i * 0.07) + 's' }">
              <span class="sgr-comet" />
            </span>
          </div>
          <div class="sgr-meta">
            <span class="sgr-cur">avg {{ r.current.toFixed(1) }}<i>/</i>{{ r.required.toFixed(1) }} req</span>
            <span class="sgr-people">
              <Users :size="11" /> {{ r.withGap }}<i> of </i>{{ r.totalPeople }} below bar
            </span>
          </div>
        </div>
      </Motion>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Activity, Users, ShieldCheck } from 'lucide-vue-next'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  items: { type: Array, default: () => [] }, // SkillGapRow[]
  limit: { type: Number, default: 7 },
})

const reduced = prefersReduced()
const rootRef = ref(null)
const { visible } = useInView(rootRef, { threshold: 0.2 })

const CAT_VARS = {
  TECHNICAL: '--trn-amber-strong', FUNCTIONAL: '--trn-amber', BEHAVIORAL: '--trn-ember',
  DOMAIN: '--trn-orbit-far', LANGUAGE: '--trn-star', CERTIFICATION: '--trn-st-completed-hex',
  OTHER: '--trn-star-dim',
}
const catColor = (cat) => `var(${CAT_VARS[cat] || '--trn-star-dim'})`
const gapColor = (g) => g >= 2 ? 'var(--trn-st-failed)' : g >= 1 ? 'var(--trn-ember)' : 'var(--trn-amber)'

const rows = computed(() => {
  const src = (props.items || [])
    .map(s => ({ ...s, _gap: Number(s.avg_gap) || 0 }))
    .filter(s => s._gap > 0)
    .sort((a, b) => b._gap - a._gap)
    .slice(0, props.limit)
  if (!src.length) return []
  const max = Math.max(0.1, ...src.map(s => s._gap))
  return src.map((s, i) => ({
    key: s.skill_id ?? s.skill_name ?? i,
    skill: s.skill_name || '—',
    category: (s.skill_category || 'OTHER').replace(/_/g, ' '),
    catColor: catColor(s.skill_category),
    gap: s._gap,
    current: Number(s.avg_current) || 0,
    required: Number(s.avg_required) || 0,
    withGap: Number(s.employees_with_gap) || 0,
    totalPeople: Number(s.employees_total) || 0,
    pct: Math.max(7, (s._gap / max) * 100),
    color: gapColor(s._gap),
  }))
})
const criticalCount = computed(() => rows.value.length)
</script>

<style scoped>
.sgr { display: flex; flex-direction: column; gap: 16px; height: 100%; padding: 18px 20px; }
.sgr-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.sgr-titles { display: flex; flex-direction: column; gap: 4px; }
.sgr-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--trn-ember); }
.sgr-titles h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--trn-text); }
.sgr-pill { flex-shrink: 0; font-family: var(--trn-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
  padding: 4px 10px; border-radius: 999px; text-transform: uppercase;
  color: var(--trn-st-failed); background: var(--trn-st-failed-soft); border: 1px solid color-mix(in srgb, var(--trn-st-failed) 28%, transparent); }
.sgr-pill.clear { color: var(--trn-st-completed); background: var(--trn-st-completed-soft);
  border-color: color-mix(in srgb, var(--trn-st-completed) 28%, transparent); }

/* clear state */
.sgr-clear { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; text-align: center; padding: 20px; }
.sgr-clear-ring { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%;
  color: var(--trn-st-completed); background: var(--trn-st-completed-soft);
  border: 1px solid color-mix(in srgb, var(--trn-st-completed) 32%, transparent); animation: sgr-pulse 2.6s ease-in-out infinite; }
.sgr-clear-t { margin: 0; font-size: 13.5px; font-weight: 600; color: var(--trn-text); }
.sgr-clear-s { font-size: 12px; color: var(--trn-text-muted); }

/* rows */
.sgr-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.sgr-row { display: flex; align-items: center; gap: 11px; }
.sgr-rank { font-size: 11px; font-weight: 700; color: var(--trn-text-dim); width: 18px; flex-shrink: 0; }
.sgr-cat { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 6px currentColor; }
.sgr-body { flex: 1; min-width: 0; }
.sgr-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
.sgr-name { font-size: 12.5px; font-weight: 600; color: var(--trn-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sgr-gap { font-size: 12px; font-weight: 800; color: var(--c); flex-shrink: 0; }
.sgr-track { position: relative; height: 8px; border-radius: 999px; overflow: hidden;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.sgr-fill { position: relative; display: block; height: 100%; width: 0; border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 45%, transparent), var(--c));
  box-shadow: 0 0 12px -2px var(--c); transition: width 1.1s var(--trn-spring); }
.sgr-comet { position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 6px; height: 6px; border-radius: 50%;
  background: #fff; box-shadow: 0 0 8px 1px var(--c); }
[data-theme="light"] .sgr-comet { background: var(--c); }
.sgr-meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 5px; }
.sgr-cur { font-size: 10.5px; color: var(--trn-text-muted); }
.sgr-cur i { font-style: normal; color: var(--trn-text-dim); margin: 0 2px; }
.sgr-people { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--trn-text-dim); }
.sgr-people i { font-style: normal; }
.sgr-people :deep(svg) { color: var(--trn-text-dim); }

@keyframes sgr-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--trn-st-completed) 40%, transparent); } 50% { box-shadow: 0 0 0 8px transparent; } }
@media (prefers-reduced-motion: reduce) {
  .sgr-fill { transition: none; }
  .sgr-clear-ring { animation: none; }
}
</style>
