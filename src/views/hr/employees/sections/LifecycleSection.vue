<template>
  <div class="lifecycle-section">
    <!-- Premium header panel -->
    <header class="lc-head-panel">
      <div class="lc-aurora" aria-hidden="true" />
      <div class="lc-head-row">
        <div class="lc-head-text">
          <span class="lc-eyebrow"><span class="dot" /> Lifecycle Board</span>
          <h3>Employee Lifecycle</h3>
          <p>Drag-and-drop is coming soon. For now, use the action menu on any card to transition state.</p>
        </div>
        <div class="lc-legend">
          <span v-for="s in STATES" :key="s.state" class="legend-pill" :class="`tone-${s.tone}`">
            <LifecycleBadge :state="s.state" size="sm" />
            <span class="legend-count">{{ countOf(s.state) }}</span>
          </span>
        </div>
      </div>
    </header>

    <div v-if="loading && !columns.length" class="lc-loading">
      <Loader2 class="spin" :size="20" /> Loading…
    </div>

    <div v-else class="lc-board">
      <div
        v-for="(col, colIdx) in columns"
        :key="col.state"
        class="lc-col"
        :class="`tone-${col.tone}`"
        :style="{ '--col-i': colIdx }"
      >
        <header class="col-head">
          <LifecycleBadge :state="col.state" size="md" />
          <span class="col-count">{{ col.items.length }}</span>
        </header>
        <div class="col-body">
          <div v-if="!col.items.length" class="col-empty">No employees</div>
          <button
            v-for="(e, i) in col.items"
            :key="e.id"
            class="lc-card"
            type="button"
            :style="{ '--i': i }"
            @click="$emit('open-profile', e.id)"
          >
            <EmployeeAvatar :name="e.full_name" :avatar-url="e.avatar_url" :seed="e.employee_id" size="sm" />
            <div class="lc-card-text">
              <span class="lc-name">{{ e.full_name || '—' }}</span>
              <span class="lc-meta">{{ e.designation_name || '—' }} · {{ e.employee_id }}</span>
            </div>
            <span class="lc-action-trigger" @click.stop="openActions(e, $event)">
              <MoreVertical :size="14" />
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Action menu popover -->
    <transition name="popover-fade">
      <div
        v-if="actionFor"
        class="action-popover"
        :style="actionStyle"
        @click.stop
      >
        <button
          v-for="a in actionsFor(actionFor)"
          :key="a.key"
          class="action-item"
          :class="`tone-${a.tone}`"
          @click="triggerAction(a.key)"
        >
          <component :is="a.icon" :size="13" />
          <span>{{ a.label }}</span>
        </button>
        <button class="action-item neutral" @click="actionFor = null">Close</button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  CheckCircle, ArrowUp, ArrowRight, Pause, Play, Briefcase, LogOut, Archive,
  MoreVertical, Loader2, Undo2,
} from 'lucide-vue-next'

import EmployeeAvatar from '../../../../components/hr/EmployeeAvatar.vue'
import LifecycleBadge from '../../../../components/hr/LifecycleBadge.vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
  employees: { type: Array, required: true },
  reference: { type: Object, required: true },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['open-profile', 'lifecycle-action'])

const STATES = [
  { state: 'ACTIVE',       tone: 'active' },
  { state: 'ON_PROBATION', tone: 'probation' },
  { state: 'ON_NOTICE',    tone: 'notice' },
  { state: 'SUSPENDED',    tone: 'suspended' },
  { state: 'INACTIVE',     tone: 'inactive' },
  { state: 'EXITED',       tone: 'exited' },
  { state: 'ARCHIVED',     tone: 'archived' },
]

const columns = computed(() =>
  STATES.map(s => ({
    ...s,
    items: props.employees.filter(e => e.lifecycle_state === s.state),
  }))
)
const countOf = (state) => props.employees.filter(e => e.lifecycle_state === state).length

// ─── Action popover ───
const actionFor = ref(null)
const actionStyle = ref({})
const openActions = (e, event) => {
  actionFor.value = e
  // Position near click
  const rect = event.currentTarget.getBoundingClientRect()
  actionStyle.value = {
    top: `${rect.bottom + 6}px`,
    left: `${Math.min(window.innerWidth - 220, rect.left)}px`,
  }
}

function actionsFor(e) {
  const s = e.lifecycle_state
  const list = []
  if (s === 'ON_PROBATION') list.push({ key: 'confirm', label: 'Confirm', icon: CheckCircle, tone: 'green' })
  if (['ACTIVE', 'ON_PROBATION'].includes(s)) {
    list.push({ key: 'promote', label: 'Promote', icon: ArrowUp, tone: 'gold' })
    list.push({ key: 'transfer', label: 'Transfer', icon: ArrowRight, tone: 'neutral' })
    list.push({ key: 'give-notice', label: 'Give Notice', icon: Briefcase, tone: 'orange' })
    list.push({ key: 'suspend', label: 'Suspend', icon: Pause, tone: 'red' })
  }
  if (s === 'SUSPENDED') list.push({ key: 'reinstate', label: 'Reinstate', icon: Play, tone: 'green' })
  if (['ON_NOTICE', 'ACTIVE', 'SUSPENDED'].includes(s)) list.push({ key: 'exit', label: 'Exit', icon: LogOut, tone: 'red' })
  if (s === 'ARCHIVED') list.push({ key: 'unarchive', label: 'Restore', icon: Undo2, tone: 'green' })
  if (s !== 'ARCHIVED') list.push({ key: 'archive', label: 'Archive', icon: Archive, tone: 'neutral' })
  return list
}

// Just emit the action key + employee — the workspace's LifecycleActionModal
// handles field collection so every action goes through one form.
const triggerAction = (key) => {
  const employee = actionFor.value
  if (!employee) return
  emit('lifecycle-action', { action: key, employee })
  actionFor.value = null
}
</script>

<style scoped>
.lifecycle-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  max-width: 100%;
}

/* Premium header panel */
.lc-head-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 22px;
  background: linear-gradient(180deg, rgba(28, 28, 32, 0.6), rgba(18, 18, 22, 0.5));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  overflow: hidden;
}
.lc-aurora {
  position: absolute; inset: 0;
  background:
    radial-gradient(50% 80% at 0% 0%, rgba(251, 191, 36, 0.10), transparent 60%),
    radial-gradient(40% 60% at 100% 100%, rgba(192, 132, 252, 0.08), transparent 60%);
  pointer-events: none;
  animation: hr-aurora 18s ease-in-out infinite;
}
.lc-head-row {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}
.lc-head-text { flex: 1; min-width: 0; }
.lc-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--hr-accent-gold);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: 4px;
}
.lc-eyebrow .dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--hr-accent-gold);
  animation: hr-pulse-dot-gold 2.4s ease-in-out infinite;
}
.lc-head-text h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--hr-text);
  letter-spacing: -0.025em;
  background: linear-gradient(180deg, #ffffff 0%, #c5c5c8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.lc-head-text p { margin: 6px 0 0; color: var(--hr-text-muted); font-size: 13px; max-width: 540px; }

.lc-legend {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.legend-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px 5px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: border-color 200ms var(--hr-spring), transform 200ms var(--hr-spring);
}
.legend-pill:hover { transform: translateY(-1px); }
.legend-count {
  font-family: var(--hr-mono);
  font-size: 10.5px;
  font-weight: 700;
  color: var(--hr-text-secondary);
}

.lc-loading {
  display: flex; align-items: center; gap: 8px;
  padding: 60px; justify-content: center; color: var(--hr-text-muted);
}

/* ──────────── Column board ──────────── */
.lc-board {
  display: grid;
  /* Allow the board to shrink to its container; columns scale down to 220px */
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  align-items: start;
  min-width: 0;
}

.lc-col {
  position: relative;
  background: linear-gradient(180deg, rgba(20, 20, 22, 0.55), rgba(14, 14, 16, 0.35));
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  min-height: 220px;
  /* Cap height so columns full of employees scroll inside themselves rather
     than blowing up the page. */
  max-height: clamp(360px, 70vh, 720px);
  overflow: hidden;
  min-width: 0;
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  transition: border-color 240ms var(--hr-spring), transform 240ms var(--hr-spring);
  animation: hr-fade-up 360ms var(--hr-spring) backwards;
  animation-delay: calc(var(--col-i, 0) * 50ms);
}
.lc-col:hover { border-color: rgba(255, 255, 255, 0.10); }
/* Column top accent — coloured by tone */
.lc-col::before {
  content: '';
  position: absolute;
  top: 0; left: 12px; right: 12px;
  height: 2px;
  border-radius: 0 0 999px 999px;
  background: var(--hr-text-dim);
  opacity: 0.55;
}
.lc-col.tone-active::before { background: linear-gradient(90deg, transparent, var(--hr-active), transparent); }
.lc-col.tone-probation::before { background: linear-gradient(90deg, transparent, var(--hr-accent-gold), transparent); }
.lc-col.tone-notice::before { background: linear-gradient(90deg, transparent, var(--hr-orange), transparent); }
.lc-col.tone-suspended::before { background: linear-gradient(90deg, transparent, var(--hr-suspended), transparent); }
.lc-col.tone-inactive::before { background: linear-gradient(90deg, transparent, var(--hr-inactive), transparent); }
.lc-col.tone-exited::before { background: linear-gradient(90deg, transparent, var(--hr-exited), transparent); }
.lc-col.tone-archived::before { background: linear-gradient(90deg, transparent, var(--hr-text-dim), transparent); }

.col-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 14px 10px;
}
.col-count {
  font-family: var(--hr-mono);
  font-size: 10.5px;
  font-weight: 700;
  color: var(--hr-text-secondary);
  background: rgba(255, 255, 255, 0.04);
  padding: 3px 10px;
  border-radius: 999px;
  letter-spacing: 0.5px;
}
.col-body {
  padding: 6px 10px 12px;
  display: flex; flex-direction: column; gap: 6px;
  overflow-y: auto;
}
.col-body::-webkit-scrollbar { width: 4px; }
.col-body::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.06); border-radius: 999px; }
.col-empty {
  padding: 32px 10px;
  text-align: center;
  font-size: 11px;
  color: var(--hr-text-dim);
  font-family: var(--hr-mono);
  letter-spacing: 0.5px;
}

/* ──────────── Card ──────────── */
.lc-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  background:
    linear-gradient(135deg, rgba(28, 28, 30, 0.78) 0%, rgba(20, 20, 22, 0.7) 100%);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: transform 280ms var(--hr-spring),
              border-color 280ms var(--hr-spring),
              box-shadow 320ms var(--hr-spring);
  animation: lc-card-rise 0.42s var(--hr-spring) backwards;
  animation-delay: calc(var(--i, 0) * 32ms);
  overflow: hidden;
  isolation: isolate;
}
@keyframes lc-card-rise {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Subtle shine sweep on hover */
.lc-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.04) 50%, transparent 70%);
  transform: translateX(-120%);
  transition: transform 700ms var(--hr-spring);
  pointer-events: none;
  z-index: 0;
}
.lc-card:hover::before { transform: translateX(120%); }

/* Side accent line on hover/active */
.lc-card::after {
  content: '';
  position: absolute;
  left: 0;
  top: 14%;
  bottom: 14%;
  width: 2px;
  background: linear-gradient(180deg, var(--hr-accent-gold), var(--hr-orange));
  border-radius: 0 2px 2px 0;
  opacity: 0;
  transform: scaleY(0.5);
  transition: opacity 240ms var(--hr-spring), transform 280ms var(--hr-spring);
}
.lc-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 12px 24px -16px rgba(0, 0, 0, 0.6);
}
.lc-card:hover::after { opacity: 1; transform: scaleY(1); }

.lc-card > * { position: relative; z-index: 1; }

.lc-card-text { display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 1px; }
.lc-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--hr-text);
  letter-spacing: -0.005em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lc-meta {
  font-size: 10.5px;
  color: var(--hr-text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-family: var(--hr-mono);
  letter-spacing: 0.2px;
}
.lc-action-trigger {
  width: 24px; height: 24px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 7px;
  color: var(--hr-text-muted);
  cursor: pointer;
  transition: all 180ms var(--hr-spring);
}
.lc-card:hover .lc-action-trigger { color: var(--hr-text-secondary); }
.lc-action-trigger:hover {
  background: rgba(251, 191, 36, 0.10);
  color: var(--hr-accent-gold);
  transform: scale(1.1);
}

@media (prefers-reduced-motion: reduce) {
  .lc-card, .lc-card::before, .lc-card::after { animation: none !important; transition: none !important; transform: none !important; }
}

/* Action popover */
.action-popover {
  position: fixed;
  z-index: 1200;
  min-width: 180px;
  background: var(--hr-surface-elevated);
  border: 1px solid var(--hr-border-strong);
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 16px 50px -16px rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
}
.action-item {
  width: 100%;
  display: flex; align-items: center; gap: 8px;
  background: transparent;
  border: none;
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--hr-text-secondary);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}
.action-item:hover { background: rgba(255,255,255,0.06); color: var(--hr-text); }
.action-item.tone-green { color: var(--hr-active); }
.action-item.tone-gold { color: var(--hr-accent-gold); }
.action-item.tone-red { color: var(--hr-suspended); }
.action-item.tone-orange { color: var(--hr-notice); }
.action-item.neutral {
  border-top: 1px solid var(--hr-border);
  margin-top: 4px;
  color: var(--hr-text-muted);
}
.popover-fade-enter-active, .popover-fade-leave-active {
  transition: opacity 0.15s, transform 0.15s var(--hr-spring);
}
.popover-fade-enter-from, .popover-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
</style>
