<template>
  <div class="dc-shell" :style="{ '--i': index }">
    <div ref="inner" class="dc">
      <span class="dc-glare" aria-hidden="true" />

      <!-- altitude rank rail -->
      <div class="dc-rail" :title="tierLabel">
        <span v-for="seg in railSegments" :key="seg.i" class="dc-rung" :class="{ on: seg.on }" :style="{ '--d': seg.i }" />
        <span class="dc-rail-cap">{{ rankCap }}</span>
      </div>

      <div class="dc-main">
        <header class="dc-head">
          <span class="dc-ic"><BadgeCheck :size="16" /></span>
          <div class="dc-id">
            <b class="dc-name" :title="desig.name">{{ desig.name || '—' }}</b>
            <span class="dc-code set-mono"><Hash :size="9" />{{ desig.code }}</span>
          </div>
          <span class="dc-tier">{{ tierLabel }}</span>
        </header>

        <!-- attributes -->
        <div class="dc-attrs">
          <span class="dc-attr" :data-set="!!gradeName">
            <Layers :size="11" /> {{ gradeName ? gradeName : 'No grade' }}
          </span>
          <span class="dc-attr" :data-set="!!departmentName">
            <Building2 :size="11" /> {{ departmentName ? departmentName : 'Any dept' }}
          </span>
        </div>

        <!-- reporting line -->
        <button v-if="parentName" type="button" class="dc-reports" @click.stop="$emit('focus-parent', desig)">
          <CornerLeftUp :size="12" /> Reports to <b>{{ parentName }}</b>
        </button>
        <span v-else class="dc-reports top"><Crown :size="12" /> Top of chain</span>

        <!-- live usage metrics -->
        <div class="dc-metrics">
          <button type="button" class="dc-metric" :class="{ live: headcount > 0 }" :title="headcount + ' employee(s) hold this title'" @click.stop="$emit('view-people', desig)">
            <Users :size="13" />
            <b>{{ headcount }}</b>
            <span>hold</span>
          </button>
          <span class="dc-metric" :class="{ live: directReports > 0 }" :title="directReports + ' title(s) report up to this one'">
            <GitFork :size="13" />
            <b>{{ directReports }}</b>
            <span>report</span>
          </span>
          <span class="dc-metric" :class="{ live: requisitions > 0 }" :title="requisitions + ' open requisition(s) for this title'">
            <UserPlus :size="13" />
            <b>{{ requisitions }}</b>
            <span>hiring</span>
          </span>
        </div>

        <footer class="dc-foot">
          <button type="button" class="dc-act" title="Edit" @click.stop="$emit('edit', desig)"><FilePen :size="14" /></button>
          <button type="button" class="dc-act danger" title="Delete" @click.stop="$emit('delete', desig)"><Trash2 :size="14" /></button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { BadgeCheck, Hash, Layers, Building2, CornerLeftUp, Crown, Users, GitFork, UserPlus, FilePen, Trash2 } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  desig: { type: Object, required: true },
  index: { type: Number, default: 0 },
  gradeName: { type: String, default: '' },
  departmentName: { type: String, default: '' },
  parentName: { type: String, default: '' },
  headcount: { type: Number, default: 0 },
  directReports: { type: Number, default: 0 },
  requisitions: { type: Number, default: 0 },
  tier: { type: Number, default: 0 },          // 0 = top of chain
  maxTier: { type: Number, default: 0 },
  tierLabel: { type: String, default: 'Title' },
})
defineEmits(['edit', 'delete', 'focus-parent', 'view-people'])

const inner = ref(null)
usePointerSpotlight(inner)

// Altitude rail: 4 rungs, lit from the bottom up to the title's height
// (top of chain = all lit, deepest = one lit).
const RUNGS = 4
const railSegments = computed(() => {
  const span = Math.max(1, props.maxTier)
  const heightFrac = 1 - (Math.min(props.tier, span) / span) // 1 at top, →0 deeper
  const litCount = Math.max(1, Math.round(heightFrac * RUNGS))
  return Array.from({ length: RUNGS }, (_, k) => ({ i: k, on: (RUNGS - k) <= litCount }))
})
const rankCap = computed(() => {
  if (props.desig.level != null && props.desig.level !== '') return 'L' + props.desig.level
  return props.tier === 0 ? '▲' : '·'
})
</script>

<style scoped>
.dc-shell { animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.045s); }
.dc { position: relative; overflow: hidden; display: flex; gap: 0;
  border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  transition: transform 0.3s var(--set-spring), border-color 0.3s, box-shadow 0.3s; }
.dc:hover { border-color: color-mix(in srgb, var(--set-gold) 38%, transparent); box-shadow: var(--set-card-shadow-hover);
  transform: perspective(1100px) rotateX(calc((var(--my,0.5) - 0.5) * -4deg)) rotateY(calc((var(--mx,0.5) - 0.5) * 6deg)) translateY(-2px); }
.dc-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s; z-index: 3;
  background: radial-gradient(340px circle at calc(var(--mx,0.5)*100%) calc(var(--my,0.5)*100%), color-mix(in srgb, var(--set-gold) 16%, transparent), transparent 60%); }

/* altitude rail */
.dc-rail { position: relative; flex-shrink: 0; width: 38px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 5px;
  padding: 14px 0 10px; background: linear-gradient(180deg, color-mix(in srgb, var(--set-gold) 10%, transparent), transparent 70%);
  border-right: 1px solid var(--set-border); }
.dc-rung { width: 12px; height: 12px; border-radius: 3px; background: var(--set-unset-soft); border: 1px solid var(--set-border);
  transition: all 0.3s var(--set-spring) calc(var(--d) * 0.06s); }
.dc-rung.on { background: var(--set-gold); border-color: var(--set-gold); box-shadow: 0 0 10px -1px var(--set-gold); }
.dc:hover .dc-rung.on { background: var(--set-gold-bright); }
.dc-rail-cap { margin-top: 4px; font-size: 10px; font-weight: 850; color: var(--set-gold); font-family: var(--set-mono); }

.dc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px; padding: 14px 15px 12px; }

.dc-head { display: flex; align-items: center; gap: 10px; }
.dc-ic { display: grid; place-items: center; width: 33px; height: 33px; border-radius: 10px; flex-shrink: 0; color: var(--set-gold);
  background: color-mix(in srgb, var(--set-gold) 13%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 26%, transparent); }
.dc-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.dc-name { font-size: 14.5px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dc-code { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; color: var(--set-text-muted); }
.dc-code :deep(svg) { opacity: 0.6; }
.dc-tier { flex-shrink: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px;
  color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 30%, transparent);
  max-width: 12ch; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.dc-attrs { display: flex; flex-wrap: wrap; gap: 6px; }
.dc-attr { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--set-text-dim);
  padding: 4px 9px; border-radius: 8px; background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.dc-attr[data-set="true"] { color: var(--set-text-secondary); }
.dc-attr[data-set="true"] :deep(svg) { color: var(--set-gold); }

.dc-reports { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; max-width: 100%; cursor: pointer; font: inherit;
  font-size: 11.5px; color: var(--set-text-muted); padding: 5px 10px; border-radius: 9px;
  background: color-mix(in srgb, var(--set-gold) 7%, transparent); border: 1px solid var(--set-border); transition: all 0.2s; }
.dc-reports b { color: var(--set-text); font-weight: 750; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dc-reports :deep(svg) { color: var(--set-gold); flex-shrink: 0; }
button.dc-reports:hover { border-color: color-mix(in srgb, var(--set-gold) 38%, transparent); transform: translateY(-1px); }
.dc-reports.top { cursor: default; color: var(--set-text-secondary); }
.dc-reports.top :deep(svg) { color: var(--set-gold-bright); }

.dc-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-top: 1px; }
.dc-metric { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 8px 4px; border-radius: 11px; font: inherit;
  background: var(--set-panel); border: 1px solid var(--set-border); cursor: default; transition: all 0.2s; }
.dc-metric :deep(svg) { color: var(--set-text-dim); margin-bottom: 1px; }
.dc-metric b { font-size: 15px; font-weight: 850; color: var(--set-text); line-height: 1; }
.dc-metric span { font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-dim); }
.dc-metric.live :deep(svg) { color: var(--set-gold); }
.dc-metric.live b { color: var(--set-gold-bright); }
button.dc-metric { cursor: pointer; }
button.dc-metric:hover { border-color: color-mix(in srgb, var(--set-gold) 38%, transparent); transform: translateY(-1px); }

.dc-foot { display: flex; align-items: center; justify-content: flex-end; gap: 7px; margin-top: 1px; }
.dc-act { width: 32px; height: 30px; border-radius: 9px; display: grid; place-items: center; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.dc-act:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.dc-act.danger:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 40%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .dc-shell { animation: none; }
  .dc:hover { transform: translateY(-2px); }
  .dc-rung { transition: none; }
}
</style>
