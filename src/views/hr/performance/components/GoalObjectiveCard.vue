<template>
  <div class="goc-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="goc" :class="{ standalone: isStandalone, active }">
      <span class="goc-glare" aria-hidden="true" />
      <span class="goc-spine" :style="{ background: meta.color }" />

      <header class="goc-head">
        <div class="goc-titles">
          <div class="goc-tag-row">
            <span class="goc-type" :class="isStandalone ? 'goal' : 'obj'">
              <component :is="isStandalone ? Flag : Target" :size="11" />{{ isStandalone ? 'Goal' : 'Objective' }}
            </span>
            <span v-if="objective.category" class="goc-cat">{{ objective.category }}</span>
          </div>
          <h3 class="goc-title">{{ objective.title }}</h3>
          <p v-if="objective.description" class="goc-desc">{{ objective.description }}</p>
        </div>
        <button class="goc-ring" type="button" :style="{ '--perf-p': ringDeg + 'deg', '--c': tone }"
          :title="`${pct}% — click to advance status`" @click="$emit('edit-status', objective)">
          <span class="goc-ring-in"><b>{{ pct }}</b><i>%</i></span>
          <Trophy v-if="pct >= 100" :size="13" class="goc-ring-trophy" />
        </button>
      </header>

      <div class="goc-statusrow">
        <span class="goc-stamp" :style="{ '--c': meta.color }"><component :is="meta.icon" :size="11" />{{ meta.label }}</span>
        <span v-if="objective.due_date" class="goc-due" :class="{ over: overdue }"><CalendarClock :size="11" />{{ fmtDate(objective.due_date) }}</span>
      </div>

      <!-- key results -->
      <div v-if="!isStandalone" class="goc-krs">
        <div v-if="!krs.length" class="goc-kr-empty">No key results yet — add measurable outcomes.</div>
        <div v-for="(kr, i) in krs" :key="kr.id" class="goc-kr" :style="{ '--c': krTone(kr) }">
          <span class="goc-kr-idx">{{ i + 1 }}</span>
          <div class="goc-kr-body">
            <div class="goc-kr-top">
              <span class="goc-kr-title">{{ kr.title }}</span>
              <span class="goc-kr-metric">{{ metricLabel(kr) }}</span>
            </div>
            <div class="goc-kr-track"><i :style="{ width: (mounted ? krPct(kr) : 0) + '%', background: krTone(kr) }" /></div>
          </div>
          <span class="goc-kr-pct">{{ krPct(kr) }}%</span>
          <button class="goc-kr-checkin" type="button" title="Check in" @click="$emit('check-in', kr)"><TrendingUp :size="13" /></button>
        </div>
      </div>

      <!-- standalone goal: its own progress + checkin -->
      <div v-else class="goc-standalone-track">
        <div class="goc-kr-track"><i :style="{ width: (mounted ? pct : 0) + '%', background: tone }" /></div>
        <span class="goc-kr-metric">{{ metricLabel(objective) }}</span>
      </div>

      <footer class="goc-foot">
        <span class="goc-cycle">{{ cycleLabel }}</span>
        <span class="goc-grow" />
        <button v-if="isStandalone" class="goc-act" type="button" @click="$emit('check-in', objective)"><TrendingUp :size="13" /> Check in</button>
        <button v-else class="goc-act" type="button" @click="$emit('add-kr', objective)"><Plus :size="13" /> Key result</button>
        <button class="goc-act danger" type="button" title="Delete" @click="$emit('delete', objective)"><Trash2 :size="13" /></button>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Target, Flag, Plus, Trash2, TrendingUp, CalendarClock, Trophy } from 'lucide-vue-next'
import { goalStatusMeta, goalTone, GOAL_METRICS } from '@/composables/usePerformance'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  objective: { type: Object, required: true },
  index: { type: Number, default: 0 },
  active: { type: Boolean, default: false },
})
defineEmits(['check-in', 'add-kr', 'delete', 'edit-status'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)
const mounted = ref(false)
onMounted(() => { requestAnimationFrame(() => { mounted.value = true }) })

const isStandalone = computed(() => props.objective.goal_type !== 'OBJECTIVE')
const krs = computed(() => props.objective.key_results || [])
const meta = computed(() => goalStatusMeta(props.objective.status))
const pct = computed(() => Math.round(Number(props.objective.progress || 0)))
const tone = computed(() => goalTone(props.objective.progress))
const ringDeg = computed(() => Math.round(Math.min(100, pct.value) / 100 * 360))

const krPct = (kr) => Math.round(Number(kr.progress || 0))
const krTone = (kr) => goalTone(kr.progress)

const overdue = computed(() => {
  if (!props.objective.due_date || ['ACHIEVED', 'CANCELLED'].includes(props.objective.status)) return false
  return new Date(props.objective.due_date) < new Date()
})

const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) } catch { return d } }
const cycleLabel = computed(() => props.objective.period_label || props.objective.cycle || '')

const metricLabel = (g) => {
  const mt = g.metric_type || 'PERCENT'
  if (mt === 'MILESTONE' || mt === 'BOOLEAN') return Number(g.current_value) >= 1 ? 'Done' : 'Not done'
  const unit = (GOAL_METRICS.find(m => m.value === mt) || {}).unit || ''
  const cur = g.current_value != null ? Number(g.current_value).toLocaleString('en-IN') : '0'
  const tgt = g.target_value != null ? Number(g.target_value).toLocaleString('en-IN') : '—'
  return mt === 'CURRENCY' ? `₹${cur} / ₹${tgt}` : `${cur} / ${tgt}${unit}`
}
</script>

<style scoped>
.goc-shell { animation: perf-deal 0.5s var(--perf-spring) both; animation-delay: calc(min(var(--i, 0) * 0.05, 0.4) * 1s); }
.goc { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 11px; padding: 15px 16px 14px 18px; border-radius: 17px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow);
  transition: transform 0.3s var(--perf-spring), border-color 0.25s, box-shadow 0.3s; }
.goc:hover { transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -4deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 6deg)) translateY(-3px);
  border-color: var(--perf-border-warm); box-shadow: var(--perf-card-shadow-hover); }
.goc.active { border-color: color-mix(in srgb, var(--perf-gold) 55%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--perf-gold) 40%, transparent), var(--perf-card-shadow-hover); }
.goc-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(440px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--perf-gold) 15%, transparent), transparent 42%); }
.goc-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }

.goc-head { position: relative; display: flex; align-items: flex-start; gap: 12px; }
.goc-titles { flex: 1; min-width: 0; }
.goc-tag-row { display: flex; align-items: center; gap: 7px; }
.goc-type { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; }
.goc-type.obj { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 14%, transparent); }
.goc-type.goal { color: var(--perf-amber); background: color-mix(in srgb, var(--perf-amber) 14%, transparent); }
.goc-cat { font-size: 10px; font-weight: 700; color: var(--perf-text-muted); padding: 3px 8px; border-radius: 999px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.goc-title { margin: 7px 0 0; font-size: 15px; font-weight: 800; line-height: 1.25; color: var(--perf-text); }
.goc-desc { margin: 5px 0 0; font-size: 12px; color: var(--perf-text-muted); line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.goc-ring { position: relative; width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0; cursor: pointer; border: none; padding: 0;
  background: conic-gradient(var(--c) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 0.9s var(--perf-spring), transform 0.2s; }
.goc-ring:hover { transform: scale(1.06); }
.goc-ring-in { position: absolute; inset: 5px; border-radius: 50%; background: var(--perf-surface); display: flex; align-items: center; justify-content: center; }
.goc-ring-in b { font-size: 15px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.goc-ring-in i { font-size: 8px; font-style: normal; color: var(--perf-text-muted); margin-top: 4px; }
.goc-ring-trophy { position: absolute; top: -3px; right: -3px; color: var(--perf-gold-bright); filter: drop-shadow(0 0 4px var(--perf-gold)); }

.goc-statusrow { display: flex; align-items: center; gap: 8px; }
.goc-stamp { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; font-size: 10px; font-weight: 800;
  color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.goc-due { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 650; color: var(--perf-text-muted); }
.goc-due.over { color: var(--perf-conflict); }

.goc-krs { display: flex; flex-direction: column; gap: 7px; }
.goc-kr-empty { font-size: 11.5px; color: var(--perf-text-dim); font-style: italic; padding: 4px 0; }
.goc-kr { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 11px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.goc-kr-idx { width: 18px; height: 18px; flex-shrink: 0; border-radius: 6px; display: grid; place-items: center; font-size: 9.5px; font-weight: 800; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
.goc-kr-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.goc-kr-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.goc-kr-title { font-size: 12px; font-weight: 650; color: var(--perf-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.goc-kr-metric { font-size: 10px; font-weight: 700; color: var(--perf-text-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.goc-kr-track { height: 6px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.goc-kr-track i { display: block; height: 100%; border-radius: 999px; transition: width 1s var(--perf-spring); }
.goc-kr-pct { font-size: 11px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; min-width: 30px; text-align: right; }
.goc-kr-checkin { width: 28px; height: 28px; flex-shrink: 0; border-radius: 8px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted);
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: all 0.18s; }
.goc-kr-checkin:hover { color: var(--perf-ok); border-color: color-mix(in srgb, var(--perf-ok) 40%, transparent); transform: translateY(-1px); }

.goc-standalone-track { display: flex; flex-direction: column; gap: 5px; }

.goc-foot { display: flex; align-items: center; gap: 8px; padding-top: 10px; border-top: 1px solid var(--perf-border); }
.goc-cycle { font-size: 11px; font-weight: 650; color: var(--perf-text-muted); }
.goc-grow { flex: 1; }
.goc-act { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 650;
  color: var(--perf-text-secondary); background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: all 0.18s; }
.goc-act:hover { color: var(--perf-text); border-color: var(--perf-border-warm); transform: translateY(-1px); }
.goc-act.danger { padding: 6px 9px; }
.goc-act.danger:hover { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .goc-shell { animation: none; }
  .goc:hover, .goc-act:hover, .goc-kr-checkin:hover { transform: none; }
  .goc-ring, .goc-kr-track i { transition: none; }
}
</style>
