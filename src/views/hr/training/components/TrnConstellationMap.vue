<template>
  <div class="cm" v-if="employees.length && skills.length">
    <!-- legend -->
    <div class="cm-legend">
      <span class="cm-legend-label">Proficiency</span>
      <span class="cm-ramp">
        <i class="cm-swatch" :style="{ background: 'var(--trn-heat-0)' }" title="No data" />
        <i class="cm-swatch" :style="{ background: 'var(--trn-heat-1)' }" title="Emerging" />
        <i class="cm-swatch" :style="{ background: 'var(--trn-heat-2)' }" title="Developing" />
        <i class="cm-swatch" :style="{ background: 'var(--trn-heat-3)' }" title="Proficient" />
        <i class="cm-swatch mastery" :style="{ background: 'var(--trn-heat-4)' }" title="Meets / exceeds" />
      </span>
      <span class="cm-legend-meta">
        <i class="cm-dot-gap" /> gap to role requirement
      </span>
    </div>

    <!-- grid -->
    <div class="cm-frame">
      <div class="cm-scroll">
        <table class="cm-grid" :class="{ 'cm-lit': hover.ri >= 0 || hover.ci >= 0 }" :style="{ '--cols': skills.length }">
          <thead>
            <tr>
              <th class="cm-corner">
                <span class="cm-corner-x trn-mono">{{ skills.length }} skills</span>
                <span class="cm-corner-y trn-mono">{{ employees.length }} people</span>
              </th>
              <th v-for="(sk, ci) in skills" :key="sk.skill_id || sk.skill_name" class="cm-colhead"
                :class="{ lit: hover.ci === ci }"
                :title="`${sk.skill_name}${sk.skill_category ? ' · ' + sk.skill_category : ''}`">
                <span class="cm-colhead-inner">{{ sk.skill_name }}</span>
                <i v-if="sk.skill_category" class="cm-cat-dot" :style="{ background: catColor(sk.skill_category) }" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(emp, ri) in employees" :key="emp.employee_id || emp.employee_name"
              :class="{ lit: hover.ri === ri }">
              <th class="cm-rowhead" :class="{ lit: hover.ri === ri }" :title="empSubtitle(emp)">
                <span class="cm-rowhead-name">{{ emp.employee_name }}</span>
                <span v-if="emp.department_name" class="cm-rowhead-meta">{{ emp.department_name }}</span>
              </th>
              <td v-for="(sk, ci) in skills" :key="(sk.skill_id || sk.skill_name) + '|' + (emp.employee_id || ri)"
                class="cm-cell-wrap" :class="{ cross: hover.ri === ri || hover.ci === ci }">
                <Motion as="button" type="button" class="cm-cell"
                  :class="{ empty: !cell(ri, ci), gap: cellHasGap(ri, ci), [bandClass(ri, ci)]: true }"
                  :style="cellStyle(ri, ci)"
                  :initial="reduced ? false : { opacity: 0, scale: 0.3 }"
                  :animate="{ opacity: 1, scale: 1 }"
                  :transition="{ duration: 0.45, delay: cellDelay(ri, ci), ease: [0.16, 1, 0.3, 1] }"
                  :whileHover="{ scale: 1.22, zIndex: 4 }"
                  :whileTap="{ scale: 0.92 }"
                  @mouseenter="onEnter($event, ri, ci)"
                  @mouseleave="onLeave"
                  @focus="onEnter($event, ri, ci)"
                  @blur="onLeave"
                  @click="emitCell(ri, ci)">
                  <span v-if="cell(ri, ci)" class="cm-cell-val">{{ cell(ri, ci).current_level || 0 }}</span>
                  <span v-else class="cm-cell-plus" aria-hidden="true">+</span>
                  <span v-if="cellHasGap(ri, ci)" class="cm-cell-ring" aria-hidden="true" />
                </Motion>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <span v-if="!reduced" class="cm-scan" aria-hidden="true" />
    </div>

    <p class="cm-caption trn-mono">Click any star to assess · scroll sideways to explore the full sky</p>

    <!-- fixed-position tooltip -->
    <Teleport to="body">
      <Transition name="cm-tip-fade">
        <div v-if="tip.show" class="cm-tip" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">
          <div class="cm-tip-head">
            <strong>{{ tip.employee }}</strong>
            <span class="cm-tip-skill">{{ tip.skill }}</span>
          </div>
          <div class="cm-tip-rows">
            <span><i class="cm-tip-dot cur" /> Current <b>{{ tip.current }}</b></span>
            <span><i class="cm-tip-dot req" /> Required <b>{{ tip.required }}</b></span>
            <span v-if="tip.gap > 0" class="cm-tip-gap"><i class="cm-tip-dot gap" /> Gap <b>{{ tip.gap }}</b></span>
            <span v-else class="cm-tip-met"><i class="cm-tip-dot met" /> Meets requirement</span>
          </div>
          <span class="cm-tip-hint">Click to assess</span>
        </div>
      </Transition>
    </Teleport>
  </div>

  <div v-else class="cm-blank trn-mono">No constellation data.</div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { Motion } from 'motion-v'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  rows: { type: Array, default: () => [] },
})
const emit = defineEmits(['cell'])
const reduced = prefersReduced()

// ── Build the matrix: unique employees (rows) × unique skills (columns) ──────
const employees = computed(() => {
  const seen = new Map()
  for (const r of props.rows || []) {
    const key = r.employee_id ?? r.employee_name
    if (key == null) continue
    if (!seen.has(key)) {
      seen.set(key, {
        employee_id: r.employee_id,
        employee_name: r.employee_name || r.employee_code || '—',
        employee_code: r.employee_code || '',
        department_name: r.department_name || '',
        designation_name: r.designation_name || '',
      })
    }
  }
  return Array.from(seen.values()).sort((a, b) =>
    (a.employee_name || '').localeCompare(b.employee_name || ''))
})

const skills = computed(() => {
  const seen = new Map()
  for (const r of props.rows || []) {
    const key = r.skill_id ?? r.skill_name
    if (key == null) continue
    if (!seen.has(key)) {
      seen.set(key, {
        skill_id: r.skill_id,
        skill_name: r.skill_name || '—',
        skill_category: r.skill_category || '',
      })
    }
  }
  return Array.from(seen.values()).sort((a, b) =>
    (a.skill_name || '').localeCompare(b.skill_name || ''))
})

// Lookup: "<employeeKey>|<skillKey>" → entry
const lookup = computed(() => {
  const map = new Map()
  for (const r of props.rows || []) {
    const ek = r.employee_id ?? r.employee_name
    const sk = r.skill_id ?? r.skill_name
    if (ek == null || sk == null) continue
    map.set(`${ek}|${sk}`, r)
  }
  return map
})

const entryAt = (ri, ci) => {
  const emp = employees.value[ri]
  const sk = skills.value[ci]
  if (!emp || !sk) return null
  const ek = emp.employee_id ?? emp.employee_name
  const skk = sk.skill_id ?? sk.skill_name
  return lookup.value.get(`${ek}|${skk}`) || null
}
const cell = (ri, ci) => entryAt(ri, ci)

// ── Heat ramp by coverage = current / max(required, current, 1) ─────────────
const coverage = (e) => {
  if (!e) return null
  const cur = Number(e.current_level) || 0
  const req = Number(e.required_level) || 0
  const denom = Math.max(req, cur, 1)
  return cur / denom
}
const band = (ri, ci) => {
  const cov = coverage(entryAt(ri, ci))
  if (cov == null || cov <= 0) return 0
  if (cov >= 1) return 4
  if (cov >= 0.75) return 3
  if (cov >= 0.5) return 2
  return 1
}
const bandClass = (ri, ci) => `b${band(ri, ci)}`
const heatVar = (ri, ci) => `var(--trn-heat-${band(ri, ci)})`
const cellStyle = (ri, ci) => ({ background: heatVar(ri, ci) })

const cellHasGap = (ri, ci) => {
  const e = entryAt(ri, ci)
  if (!e) return false
  const gap = e.gap != null
    ? Number(e.gap)
    : Math.max((Number(e.required_level) || 0) - (Number(e.current_level) || 0), 0)
  return gap > 0
}

// diagonal stagger; cap delay so big grids don't crawl
const cellDelay = (ri, ci) => reduced ? 0 : Math.min((ri + ci) * 0.018, 0.7)

// ── Category accent (warm ramp, neutral for OTHER) ──────────────────────────
const CAT_VARS = {
  TECHNICAL: '--trn-amber-strong', FUNCTIONAL: '--trn-amber', BEHAVIORAL: '--trn-ember',
  DOMAIN: '--trn-orbit-far', LANGUAGE: '--trn-star', CERTIFICATION: '--trn-st-completed-hex',
  OTHER: '--trn-star-dim',
}
const catColor = (cat) => `var(${CAT_VARS[cat] || '--trn-star-dim'})`

const empSubtitle = (e) => {
  const bits = [e.employee_code, e.designation_name, e.department_name].filter(Boolean)
  return bits.join(' · ') || e.employee_name
}

// ── hover cross-hair + fixed tooltip ─────────────────────────────────────────
const hover = reactive({ ri: -1, ci: -1 })
const tip = reactive({ show: false, x: 0, y: 0, employee: '', skill: '', current: 0, required: 0, gap: 0 })

const onEnter = (evt, ri, ci) => {
  hover.ri = ri; hover.ci = ci
  const e = entryAt(ri, ci)
  const emp = employees.value[ri]
  const sk = skills.value[ci]
  const r = evt.currentTarget.getBoundingClientRect()
  const cur = e ? (Number(e.current_level) || 0) : 0
  const req = e ? (Number(e.required_level) || 0) : 0
  const gap = e
    ? (e.gap != null ? Number(e.gap) : Math.max(req - cur, 0))
    : 0
  tip.employee = emp?.employee_name || '—'
  tip.skill = sk?.skill_name || '—'
  tip.current = cur
  tip.required = req || '—'
  tip.gap = gap
  tip.x = Math.min(r.left + r.width / 2, window.innerWidth - 140)
  tip.y = r.top - 8
  tip.show = true
}
const onLeave = () => { tip.show = false; hover.ri = -1; hover.ci = -1 }

const emitCell = (ri, ci) => {
  const e = entryAt(ri, ci)
  const emp = employees.value[ri]
  const sk = skills.value[ci]
  emit('cell', e || {
    employee_id: emp?.employee_id,
    employee_name: emp?.employee_name,
    employee_code: emp?.employee_code,
    department_name: emp?.department_name,
    designation_name: emp?.designation_name,
    skill_id: sk?.skill_id,
    skill_name: sk?.skill_name,
    skill_category: sk?.skill_category,
    current_level: null,
    required_level: null,
    gap: 0,
  })
}
</script>

<style scoped>
.cm { display: flex; flex-direction: column; gap: 12px; }

/* legend */
.cm-legend { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; font-size: 11px; color: var(--trn-text-muted); }
.cm-legend-label { font-family: var(--trn-mono); letter-spacing: 0.06em; text-transform: uppercase; font-size: 10px; color: var(--trn-text-dim); }
.cm-ramp { display: inline-flex; gap: 4px; align-items: center; }
.cm-swatch { width: 16px; height: 16px; border-radius: 5px; border: 1px solid var(--trn-border-soft); }
.cm-swatch.mastery { box-shadow: 0 0 8px color-mix(in srgb, var(--trn-st-completed) 40%, transparent); }
.cm-legend-meta { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; }
.cm-dot-gap { width: 10px; height: 10px; border-radius: 50%; background: transparent;
  border: 1.5px solid var(--trn-st-failed); box-shadow: 0 0 0 2px color-mix(in srgb, var(--trn-st-failed) 20%, transparent); }

/* frame + scan sweep */
.cm-frame { position: relative; border: 1px solid var(--trn-border-soft); border-radius: 16px;
  background: var(--trn-surface); overflow: hidden; }
.cm-scroll { overflow-x: auto; overflow-y: hidden; padding: 6px; }
.cm-scan { position: absolute; top: 0; bottom: 0; left: 0; width: 32%; pointer-events: none; z-index: 6;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--trn-amber) 16%, transparent) 55%, transparent);
  transform: translateX(-110%); animation: cm-sweep 1.5s var(--trn-ease) 0.15s 1 forwards; mix-blend-mode: screen; }
[data-theme="light"] .cm-scan { mix-blend-mode: multiply; }

.cm-grid { border-collapse: separate; border-spacing: 4px; transition: opacity 0.2s; }

/* corner */
.cm-corner { position: sticky; left: 0; z-index: 5; width: 168px; min-width: 168px; vertical-align: bottom;
  background: var(--trn-surface-elevated); border-radius: 11px; padding: 8px 10px; }
.cm-corner-x, .cm-corner-y { display: block; font-size: 9.5px; color: var(--trn-text-dim); line-height: 1.5; }
.cm-corner-x { color: var(--trn-amber-strong); }

/* column heads (rotated/truncated) */
.cm-colhead { vertical-align: bottom; height: 116px; width: 40px; min-width: 40px; padding: 0 0 8px; position: relative; transition: color 0.2s; }
.cm-colhead-inner { display: inline-block; transform: rotate(-58deg); transform-origin: left bottom; white-space: nowrap;
  max-width: 110px; overflow: hidden; text-overflow: ellipsis; font-size: 11px; font-weight: 600; color: var(--trn-text-secondary);
  position: absolute; bottom: 16px; left: 50%; transition: color 0.2s, transform 0.2s; }
.cm-colhead.lit .cm-colhead-inner { color: var(--trn-amber-strong); transform: rotate(-58deg) scale(1.06); }
.cm-cat-dot { position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; border-radius: 50%; transition: box-shadow 0.2s; }
.cm-colhead.lit .cm-cat-dot { box-shadow: 0 0 8px currentColor; }

/* row heads (sticky first col) */
.cm-rowhead { position: sticky; left: 0; z-index: 4; width: 168px; min-width: 168px; text-align: left;
  background: var(--trn-surface-elevated); border-radius: 11px; padding: 7px 11px; box-shadow: 6px 0 12px -8px rgba(0,0,0,0.4);
  transition: background 0.2s; }
.cm-rowhead.lit { background: color-mix(in srgb, var(--trn-amber) 14%, var(--trn-surface-elevated)); }
.cm-rowhead-name { display: block; font-size: 12.5px; font-weight: 600; color: var(--trn-text); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; max-width: 146px; transition: color 0.2s; }
.cm-rowhead.lit .cm-rowhead-name { color: var(--trn-amber-strong); }
.cm-rowhead-meta { display: block; font-size: 10px; color: var(--trn-text-dim); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; max-width: 146px; }

/* cells */
.cm-cell-wrap { width: 40px; min-width: 40px; height: 40px; padding: 0; transition: opacity 0.22s, filter 0.22s; }
/* cross-hair lighting: dim the field (on the plain td, so it survives motion-v's inline opacity on the cell) */
.cm-grid.cm-lit .cm-cell-wrap { opacity: 0.3; filter: saturate(0.7); }
.cm-grid.cm-lit .cm-cell-wrap.cross { opacity: 1; filter: none; }
.cm-cell { position: relative; width: 36px; height: 36px; border-radius: 9px; border: 1px solid var(--trn-border-soft);
  display: grid; place-items: center; cursor: pointer; padding: 0; font: inherit; overflow: visible;
  transition: box-shadow 0.22s var(--trn-ease), border-color 0.22s, opacity 0.22s, filter 0.22s; }
.cm-cell::before { content: ''; position: absolute; inset: 0; border-radius: inherit; opacity: 0;
  background: radial-gradient(circle at 32% 28%, rgba(255,255,255,0.5), transparent 60%); transition: opacity 0.22s; pointer-events: none; }
.cm-cell:hover::before { opacity: 0.55; }
[data-theme="light"] .cm-cell::before { background: radial-gradient(circle at 32% 28%, rgba(255,255,255,0.7), transparent 60%); }

/* mastery / proficient stars carry their own glow */
.cm-cell.b4 { box-shadow: 0 0 10px -2px color-mix(in srgb, var(--trn-st-completed) 55%, transparent); border-color: color-mix(in srgb, var(--trn-st-completed) 30%, transparent); }
.cm-cell.b3 { box-shadow: 0 0 8px -3px color-mix(in srgb, var(--trn-amber) 50%, transparent); }

.cm-cell:hover { border-color: color-mix(in srgb, var(--trn-amber) 50%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--trn-amber) 26%, transparent), 0 8px 20px -6px color-mix(in srgb, var(--trn-amber) 50%, transparent); }
.cm-cell:focus-visible { outline: none; border-color: var(--trn-amber);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 22%, transparent); }
.cm-cell.empty { border-style: dashed; }
.cm-cell-val { font-family: var(--trn-mono); font-size: 12px; font-weight: 700; color: var(--trn-text);
  text-shadow: 0 1px 2px rgba(0,0,0,0.3); position: relative; z-index: 1; }
[data-theme="light"] .cm-cell-val { text-shadow: none; }
.cm-cell-plus { font-family: var(--trn-mono); font-size: 15px; font-weight: 400; line-height: 1; color: var(--trn-text-dim);
  opacity: 0; transition: opacity 0.2s; }
.cm-cell.empty:hover .cm-cell-plus { opacity: 1; color: var(--trn-amber-strong); }
.cm-cell-ring { position: absolute; inset: -2px; border-radius: 11px; pointer-events: none;
  border: 1.5px solid var(--trn-st-failed); box-shadow: 0 0 0 2px color-mix(in srgb, var(--trn-st-failed) 18%, transparent);
  animation: cm-gap-pulse 2.4s ease-in-out infinite; }

.cm-caption { font-size: 10px; letter-spacing: 0.04em; color: var(--trn-text-dim); text-align: center; margin: 0; }
.cm-blank { padding: 28px; text-align: center; font-size: 12px; color: var(--trn-text-dim); }

/* tooltip (teleported, fixed) */
.cm-tip { position: fixed; z-index: 1600; transform: translate(-50%, -100%); pointer-events: none;
  min-width: 160px; max-width: 240px; padding: 10px 12px; border-radius: 12px;
  background: var(--trn-glass-deep); backdrop-filter: var(--trn-glass-blur); -webkit-backdrop-filter: var(--trn-glass-blur);
  border: 1px solid var(--trn-border-strong); box-shadow: var(--trn-glass-shadow); color: var(--trn-text); }
.cm-tip-head { display: flex; flex-direction: column; gap: 1px; margin-bottom: 7px; }
.cm-tip-head strong { font-size: 12.5px; font-weight: 700; }
.cm-tip-skill { font-size: 11px; color: var(--trn-amber-strong); }
.cm-tip-rows { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: var(--trn-text-secondary); }
.cm-tip-rows b { color: var(--trn-text); font-family: var(--trn-mono); }
.cm-tip-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; }
.cm-tip-dot.cur { background: var(--trn-amber); }
.cm-tip-dot.req { background: var(--trn-star-dim); }
.cm-tip-dot.gap { background: var(--trn-st-failed); }
.cm-tip-dot.met { background: var(--trn-st-completed); }
.cm-tip-gap { color: var(--trn-st-failed); }
.cm-tip-met { color: var(--trn-st-completed); }
.cm-tip-hint { display: block; margin-top: 7px; font-size: 9.5px; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--trn-text-dim); font-family: var(--trn-mono); }

.cm-tip-fade-enter-active, .cm-tip-fade-leave-active { transition: opacity 0.16s ease, transform 0.16s ease; }
.cm-tip-fade-enter-from, .cm-tip-fade-leave-to { opacity: 0; transform: translate(-50%, -94%); }

@keyframes cm-sweep { 0% { transform: translateX(-110%); opacity: 0; } 12% { opacity: 1; } 100% { transform: translateX(360%); opacity: 0; } }
@keyframes cm-gap-pulse {
  0%, 100% { box-shadow: 0 0 0 2px color-mix(in srgb, var(--trn-st-failed) 14%, transparent); }
  50% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-st-failed) 30%, transparent); }
}

@media (prefers-reduced-motion: reduce) {
  .cm-cell { transition: none; }
  .cm-cell-ring, .cm-scan { animation: none; }
}
</style>
