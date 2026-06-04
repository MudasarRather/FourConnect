<template>
  <div class="edoc-emp-filter" ref="rootRef">
    <!-- Glassy chip trigger -->
    <Motion
      as="button"
      type="button"
      class="filter-trigger"
      :class="{ 'is-open': open, 'is-active': !!selectedEmployee }"
      :whileHover="reducedMotion ? {} : { y: -1 }"
      :whileTap="reducedMotion ? {} : { scale: 0.97 }"
      :transition="{ duration: 0.24, ease: EASE }"
      @click="toggle"
      :aria-haspopup="'listbox'"
      :aria-expanded="open"
    >
      <!-- Selected state: avatar + name + dept + clear -->
      <template v-if="selectedEmployee">
        <span class="trig-avatar" aria-hidden="true">{{ initials(selectedEmployee.full_name) }}</span>
        <span class="trig-meta">
          <span class="trig-name">{{ selectedEmployee.full_name }}</span>
          <span class="trig-sub">{{ selectedEmployee.department_name || selectedEmployee.employee_code || '—' }}</span>
        </span>
        <span class="trig-x" role="button" aria-label="Clear filter" @click.stop="clearSelection">
          <X :size="13" />
        </span>
      </template>

      <!-- Empty state: icon + placeholder + chevron -->
      <template v-else>
        <span class="trig-icon" aria-hidden="true"><User :size="14" /></span>
        <span class="trig-placeholder">{{ placeholder }}</span>
        <span class="trig-caret" :class="{ rotated: open }" aria-hidden="true"><ChevronDown :size="14" /></span>
      </template>
    </Motion>

    <!-- Teleported dropdown panel — escapes overflow:hidden ancestors -->
    <Teleport to="body">
      <transition name="edoc-emp-pop">
        <div
          v-if="open"
          class="filter-panel"
          :style="panelStyle"
          role="listbox"
          @mousedown.stop
          @click.stop
        >
          <!-- Search input -->
          <div class="panel-search">
            <span class="ps-icon" aria-hidden="true"><Search :size="14" /></span>
            <input
              ref="searchRef"
              v-model="search"
              type="text"
              class="ps-input"
              placeholder="Search by name, code, department…"
              autocomplete="off"
              spellcheck="false"
            />
            <span v-if="search" class="ps-clear" @click="search = ''"><X :size="12" /></span>
          </div>

          <!-- Results scroll body -->
          <div class="panel-body" role="presentation">
            <!-- Loading skeleton -->
            <template v-if="loading">
              <div class="row-skel" v-for="n in 3" :key="`sk-${n}`">
                <span class="sk-av" />
                <span class="sk-lines">
                  <span class="sk-l1" />
                  <span class="sk-l2" />
                </span>
              </div>
            </template>

            <!-- Empty state -->
            <div v-else-if="!employees.length" class="empty-state">
              <span class="es-icon"><Inbox :size="22" /></span>
              <span class="es-text">No employees match</span>
              <span class="es-sub">Try a different search</span>
            </div>

            <!-- Result rows -->
            <ul v-else class="row-list">
              <Motion
                v-for="(emp, i) in employees"
                :key="emp.id"
                as="li"
                :class="['emp-row', { 'is-active': emp.id === modelValue }]"
                role="option"
                :aria-selected="emp.id === modelValue"
                :initial="reducedMotion ? false : { opacity: 0, x: -6 }"
                :animate="reducedMotion ? false : { opacity: 1, x: 0 }"
                :transition="{ delay: reducedMotion ? 0 : i * 0.05, duration: 0.24, ease: EASE }"
                :whileHover="reducedMotion ? {} : { x: 2 }"
                @click="select(emp)"
              >
                <span class="row-rail" aria-hidden="true" />
                <span class="row-av">{{ initials(emp.full_name) }}</span>
                <span class="row-meta">
                  <span class="row-name">{{ emp.full_name }}</span>
                  <span class="row-sub">
                    <span class="row-code">{{ emp.employee_code || '—' }}</span>
                    <span v-if="emp.department_name" class="row-dot">·</span>
                    <span v-if="emp.department_name" class="row-dept">{{ emp.department_name }}</span>
                  </span>
                </span>
                <span v-if="emp.id === modelValue" class="row-tick" aria-hidden="true"><Check :size="14" /></span>
              </Motion>
            </ul>
          </div>

          <!-- Clear filter footer (only if active) -->
          <button
            v-if="modelValue"
            type="button"
            class="panel-clear"
            @click="clearSelection"
          >
            <X :size="13" />
            <span>Clear filter</span>
          </button>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { User, Search, ChevronDown, Check, X, Inbox } from 'lucide-vue-next'
import { useEmployees } from '@/composables/useEmployees'

const EASE = [0.16, 1, 0.3, 1]

const props = defineProps({
  modelValue: { type: String, default: null }, // selected employee_id (UUID string) or null
  placeholder: { type: String, default: 'Filter by employee…' },
})
const emit = defineEmits(['update:modelValue'])

// ── State ────────────────────────────────────────────────────────────────
const open = ref(false)
const search = ref('')
const rootRef = ref(null)
const searchRef = ref(null)
const triggerRect = ref({ x: 0, y: 0, w: 0 })
const selectedEmployee = ref(null) // cached employee object so chip renders even after list refresh

// ── Employees composable (own instance — search state is private to this widget) ──
const { employees, loading, setFilters, fetchList } = useEmployees()

// ── Reduced-motion preference ────────────────────────────────────────────
const reducedMotion = ref(false)
let mqListener = null
onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.value = mq.matches
    mqListener = (e) => { reducedMotion.value = e.matches }
    mq.addEventListener?.('change', mqListener)
  }
})

// ── Panel positioning (teleported, fixed) ────────────────────────────────
const PANEL_WIDTH = 320

const recalcPanelPos = () => {
  if (!rootRef.value) return
  const r = rootRef.value.getBoundingClientRect()
  triggerRect.value = { x: r.left, y: r.bottom + 8, w: Math.max(r.width, PANEL_WIDTH) }
}

const panelStyle = computed(() => ({
  position: 'fixed',
  top: `${triggerRect.value.y}px`,
  left: `${triggerRect.value.x}px`,
  width: `${PANEL_WIDTH}px`,
  zIndex: 2000,
}))

// ── Open / close ─────────────────────────────────────────────────────────
const fetchEmployees = async () => {
  setFilters({ search: search.value || '', limit: 25, page: 1, lifecycle_state: null })
  await fetchList()
}

const openPanel = async () => {
  open.value = true
  search.value = ''
  await nextTick()
  recalcPanelPos()
  searchRef.value?.focus()
  fetchEmployees()
}

const closePanel = () => { open.value = false }

const toggle = () => { open.value ? closePanel() : openPanel() }

// ── Debounced search ─────────────────────────────────────────────────────
let searchTimer = null
watch(search, () => {
  if (!open.value) return
  clearTimeout(searchTimer)
  searchTimer = setTimeout(fetchEmployees, 300)
})

// ── Selection ────────────────────────────────────────────────────────────
const select = (emp) => {
  selectedEmployee.value = emp
  emit('update:modelValue', emp.id)
  closePanel()
}

const clearSelection = () => {
  selectedEmployee.value = null
  emit('update:modelValue', null)
  closePanel()
}

// If the parent sets modelValue externally and the list is loaded, try to
// hydrate the chip from whatever rows are currently in memory.
watch(() => props.modelValue, (id) => {
  if (!id) { selectedEmployee.value = null; return }
  if (selectedEmployee.value?.id === id) return
  const hit = employees.value.find((e) => e.id === id)
  if (hit) selectedEmployee.value = hit
})

// ── Outside / Esc / scroll / resize handlers ─────────────────────────────
const onDocMouseDown = (e) => {
  if (!open.value) return
  // Trigger root contains the chip itself; panel is teleported but stops
  // propagation via @mousedown.stop, so any event reaching document means
  // it's truly outside.
  if (rootRef.value && rootRef.value.contains(e.target)) return
  closePanel()
}
const onKey = (e) => { if (e.key === 'Escape' && open.value) closePanel() }
const onScrollOrResize = () => { if (open.value) recalcPanelPos() }

onMounted(() => {
  document.addEventListener('mousedown', onDocMouseDown)
  document.addEventListener('keydown', onKey)
  window.addEventListener('resize', onScrollOrResize)
  // capture:true so sticky-header scrolls also trigger reposition
  window.addEventListener('scroll', onScrollOrResize, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocMouseDown)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onScrollOrResize)
  window.removeEventListener('scroll', onScrollOrResize, true)
  if (mqListener && window.matchMedia) {
    window.matchMedia('(prefers-reduced-motion: reduce)').removeEventListener?.('change', mqListener)
  }
  clearTimeout(searchTimer)
})

// ── Helpers ──────────────────────────────────────────────────────────────
const initials = (name) => {
  if (!name) return '?'
  const parts = String(name).trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?'
}
</script>

<style scoped>
/* ════════════════════════════════════════════════════════════════════
   EDOC EMPLOYEE FILTER — glassy chip + teleported dropdown panel
   Palette matches the rest of the Employee Documents module:
   warm gold / amber / orange on a dark glass canvas.
   ════════════════════════════════════════════════════════════════════ */

.edoc-emp-filter {
  position: relative;
  display: inline-flex;
  font-family: inherit;
}

/* ── Trigger chip ───────────────────────────────────────────────────── */
.filter-trigger {
  display: inline-flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 12px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: #fcd34d;
  font-size: 12.5px; font-weight: 600;
  cursor: pointer; user-select: none;
  font-family: inherit;
  transition: background 220ms var(--hr-spring, ease), border-color 220ms var(--hr-spring, ease), color 220ms var(--hr-spring, ease), box-shadow 220ms var(--hr-spring, ease);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.04) inset,
    0 6px 18px -10px rgba(251, 146, 60, 0.30);
}
.filter-trigger:hover {
  background: rgba(251, 191, 36, 0.16);
  border-color: rgba(251, 191, 36, 0.50);
  color: #fde68a;
}
.filter-trigger.is-open,
.filter-trigger.is-active {
  background: linear-gradient(135deg, rgba(251,191,36,0.22), rgba(251,146,60,0.22));
  border-color: rgba(251, 191, 36, 0.65);
  color: #fff7d6;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.10) inset,
    0 8px 24px -10px rgba(251, 146, 60, 0.55);
}

.trig-icon {
  display: inline-grid; place-items: center;
  width: 18px; height: 18px;
  color: currentColor; opacity: 0.95;
}
.trig-placeholder {
  font-weight: 500; letter-spacing: 0.01em; opacity: 0.92;
}
.trig-caret { display: inline-flex; transition: transform 240ms var(--hr-spring, ease); opacity: 0.85; }
.trig-caret.rotated { transform: rotate(180deg); }

/* Selected state */
.trig-avatar {
  width: 22px; height: 22px; border-radius: 50%;
  display: inline-grid; place-items: center;
  font-family: var(--hr-mono, ui-monospace, monospace);
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.5px;
  color: #1a1410;
  background: linear-gradient(135deg, #fde68a, #fbbf24 40%, #fb923c);
  box-shadow: 0 0 0 1.5px rgba(26, 20, 16, 0.55), 0 2px 6px -2px rgba(251, 146, 60, 0.5);
}
.trig-meta { display: inline-flex; flex-direction: column; line-height: 1.05; }
.trig-name {
  font-size: 12.5px; font-weight: 700; letter-spacing: -0.01em;
  max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.trig-sub {
  font-family: var(--hr-mono, ui-monospace, monospace);
  font-size: 9.5px; font-weight: 500;
  opacity: 0.7; margin-top: 2px;
  max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.trig-x {
  display: inline-grid; place-items: center;
  width: 18px; height: 18px; margin-left: 2px;
  border-radius: 50%;
  background: rgba(26, 20, 16, 0.35);
  color: rgba(255, 247, 214, 0.92);
  cursor: pointer;
  transition: background 200ms var(--hr-spring, ease), transform 200ms var(--hr-spring, ease);
}
.trig-x:hover { background: rgba(239, 68, 68, 0.6); color: #fff; transform: rotate(90deg); }

/* ── Teleported dropdown panel ──────────────────────────────────────── */
.filter-panel {
  width: 320px;
  max-height: 380px;
  display: flex; flex-direction: column;
  border-radius: 16px;
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251,191,36,0.12), transparent 55%),
    radial-gradient(110% 60% at 100% 100%, rgba(251,146,60,0.08), transparent 60%),
    linear-gradient(180deg, rgba(24,22,26,0.92), rgba(14,13,16,0.92));
  border: 1px solid rgba(251, 191, 36, 0.28);
  backdrop-filter: blur(28px) saturate(165%);
  -webkit-backdrop-filter: blur(28px) saturate(165%);
  box-shadow:
    0 30px 60px -22px rgba(0, 0, 0, 0.75),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset,
    0 0 32px rgba(251, 146, 60, 0.10);
  overflow: hidden;
  isolation: isolate;
}
/* Subtle dot-grid mask — ambient texture */
.filter-panel::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 14px 14px;
  mask-image: radial-gradient(120% 90% at 50% 0%, #000 35%, transparent 95%);
  -webkit-mask-image: radial-gradient(120% 90% at 50% 0%, #000 35%, transparent 95%);
  opacity: 0.6;
  z-index: 0;
}

/* Search input */
.panel-search {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 8px;
  padding: 12px 12px 10px;
  border-bottom: 1px dashed rgba(251, 191, 36, 0.18);
}
.ps-icon {
  display: inline-grid; place-items: center;
  width: 22px; height: 22px;
  color: rgba(251, 191, 36, 0.85);
}
.ps-input {
  flex: 1;
  height: 30px; padding: 0 6px;
  border: none; outline: none; background: transparent;
  color: var(--hr-text, #f5f5f7);
  font-size: 13px; font-weight: 500; letter-spacing: 0.005em;
  font-family: inherit;
}
.ps-input::placeholder { color: var(--hr-text-dim, #6b6b70); font-weight: 400; }
.ps-clear {
  display: inline-grid; place-items: center;
  width: 20px; height: 20px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: var(--hr-text-muted, #8e8e93);
  cursor: pointer; transition: all 180ms ease;
}
.ps-clear:hover { background: rgba(239, 68, 68, 0.4); color: #fff; }

/* Body / scroll area */
.panel-body {
  position: relative; z-index: 1;
  flex: 1; min-height: 60px; max-height: 280px;
  overflow-y: auto;
  padding: 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(251, 191, 36, 0.35) transparent;
}
.panel-body::-webkit-scrollbar { width: 6px; }
.panel-body::-webkit-scrollbar-track { background: transparent; }
.panel-body::-webkit-scrollbar-thumb {
  background: rgba(251, 191, 36, 0.35);
  border-radius: 999px;
}

/* Row list */
.row-list {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 4px;
}

.emp-row {
  position: relative;
  display: grid; grid-template-columns: 28px 1fr auto;
  align-items: center; gap: 10px;
  min-height: 40px; padding: 5px 10px;
  border-radius: 10px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 200ms var(--hr-spring, ease), border-color 200ms var(--hr-spring, ease);
}
.emp-row:hover {
  background: rgba(251, 191, 36, 0.07);
  border-color: rgba(251, 191, 36, 0.18);
}
.emp-row.is-active {
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.16), rgba(251, 146, 60, 0.08));
  border-color: rgba(251, 191, 36, 0.42);
  animation: edoc-emp-pulse 2.6s ease-in-out infinite;
}
.row-rail {
  position: absolute; top: 6px; bottom: 6px; left: 0;
  width: 3px; border-radius: 999px;
  background: transparent;
  transition: background 220ms var(--hr-spring, ease);
}
.emp-row.is-active .row-rail {
  background: linear-gradient(180deg, #fbbf24, #fb923c);
  box-shadow: 0 0 10px rgba(251, 146, 60, 0.7);
}

.row-av {
  width: 28px; height: 28px; border-radius: 50%;
  display: inline-grid; place-items: center;
  font-family: var(--hr-mono, ui-monospace, monospace);
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.5px;
  color: #1a1410;
  background: linear-gradient(135deg, #fde68a, #fbbf24 40%, #fb923c);
  box-shadow: 0 0 0 1.5px rgba(26, 20, 16, 0.55), 0 2px 6px -2px rgba(251, 146, 60, 0.5);
}

.row-meta { display: flex; flex-direction: column; min-width: 0; }
.row-name {
  font-size: 12.5px; font-weight: 700;
  color: var(--hr-text, #f5f5f7);
  letter-spacing: -0.005em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.row-sub {
  display: flex; align-items: center; gap: 5px;
  margin-top: 2px;
  font-family: var(--hr-mono, ui-monospace, monospace);
  font-size: 9.5px; font-weight: 500;
  color: var(--hr-text-muted, #8e8e93);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.row-code { color: #fbbf24; }
.row-dot { opacity: 0.5; }
.row-dept { overflow: hidden; text-overflow: ellipsis; }
.row-tick {
  display: inline-grid; place-items: center;
  width: 22px; height: 22px; border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24, #fb923c);
  color: #1a1410;
}

/* Skeleton rows */
.row-skel {
  display: grid; grid-template-columns: 28px 1fr; align-items: center; gap: 10px;
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  margin-bottom: 4px;
}
.sk-av {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(90deg, rgba(251,191,36,0.10), rgba(251,146,60,0.16), rgba(251,191,36,0.10));
  background-size: 220% 100%;
  animation: edoc-emp-shimmer 1.4s linear infinite;
}
.sk-lines { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.sk-l1, .sk-l2 {
  height: 9px; border-radius: 5px;
  background: linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.10), rgba(255,255,255,0.05));
  background-size: 220% 100%;
  animation: edoc-emp-shimmer 1.4s linear infinite;
}
.sk-l1 { width: 65%; }
.sk-l2 { width: 40%; }

/* Empty state */
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 28px 12px;
  text-align: center;
}
.es-icon {
  display: inline-grid; place-items: center;
  width: 42px; height: 42px; border-radius: 12px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: #fbbf24;
  margin-bottom: 10px;
}
.es-text {
  font-size: 12.5px; font-weight: 700;
  color: var(--hr-text, #f5f5f7);
}
.es-sub {
  margin-top: 3px;
  font-family: var(--hr-mono, ui-monospace, monospace);
  font-size: 9.5px; font-weight: 500;
  color: var(--hr-text-muted, #8e8e93);
}

/* Clear filter footer */
.panel-clear {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; height: 36px;
  border: none;
  border-top: 1px dashed rgba(251, 191, 36, 0.18);
  background: linear-gradient(180deg, rgba(220, 38, 38, 0.04), rgba(220, 38, 38, 0.12));
  color: #fca5a5;
  font-size: 11.5px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  cursor: pointer;
  font-family: inherit;
  transition: background 220ms ease, color 220ms ease;
}
.panel-clear:hover {
  background: linear-gradient(180deg, rgba(220, 38, 38, 0.10), rgba(220, 38, 38, 0.24));
  color: #fee2e2;
}

/* ── Panel transition ───────────────────────────────────────────────── */
.edoc-emp-pop-enter-active { transition: opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 260ms cubic-bezier(0.16, 1, 0.3, 1); }
.edoc-emp-pop-leave-active { transition: opacity 160ms ease, transform 180ms ease; }
.edoc-emp-pop-enter-from { opacity: 0; transform: translateY(-6px) scale(0.985); }
.edoc-emp-pop-leave-to   { opacity: 0; transform: translateY(-4px) scale(0.99); }

/* ── Keyframes ──────────────────────────────────────────────────────── */
@keyframes edoc-emp-shimmer {
  0%   { background-position: 220% 0; }
  100% { background-position: -20% 0; }
}
@keyframes edoc-emp-pulse {
  0%, 100% { box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.42) inset, 0 0 0 rgba(251, 191, 36, 0.0); }
  50%      { box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.55) inset, 0 0 12px rgba(251, 146, 60, 0.28); }
}

/* ── Reduced motion ─────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .emp-row.is-active { animation: none !important; }
  .sk-av, .sk-l1, .sk-l2 { animation: none !important; }
  .edoc-emp-pop-enter-active, .edoc-emp-pop-leave-active { transition: opacity 120ms linear !important; }
  .edoc-emp-pop-enter-from, .edoc-emp-pop-leave-to { transform: none !important; }
  .filter-trigger, .trig-caret, .trig-x, .ps-clear, .emp-row, .row-rail { transition: none !important; }
}

/* ════════════════════════════════════════════════════════════════════
   LIGHT THEME — cream parchment with warm amber accents
   ════════════════════════════════════════════════════════════════════ */
[data-theme="light"] .filter-trigger {
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(180, 83, 9, 0.32);
  color: #b45309;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.70) inset,
    0 6px 18px -10px rgba(180, 83, 9, 0.30);
}
[data-theme="light"] .filter-trigger:hover {
  background: rgba(251, 191, 36, 0.22);
  border-color: rgba(180, 83, 9, 0.50);
  color: #92400e;
}
[data-theme="light"] .filter-trigger.is-open,
[data-theme="light"] .filter-trigger.is-active {
  background: linear-gradient(135deg, rgba(251,191,36,0.30), rgba(251,146,60,0.28));
  border-color: rgba(180, 83, 9, 0.55);
  color: #5b2c0d;
}
[data-theme="light"] .trig-sub { opacity: 0.85; }
[data-theme="light"] .trig-x { background: rgba(180, 83, 9, 0.18); color: #6b2e0e; }
[data-theme="light"] .trig-x:hover { background: rgba(220, 38, 38, 0.75); color: #fff; }

[data-theme="light"] .filter-panel {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(217,119,6,0.12), transparent 55%),
    radial-gradient(110% 60% at 100% 100%, rgba(234,88,12,0.08), transparent 60%),
    linear-gradient(180deg, rgba(255,250,240,0.96), rgba(255,246,232,0.94));
  border-color: rgba(180, 83, 9, 0.32);
  box-shadow:
    0 30px 60px -22px rgba(120, 53, 15, 0.32),
    0 0 0 1px rgba(255, 255, 255, 0.55) inset,
    0 0 28px rgba(251, 146, 60, 0.12);
}
[data-theme="light"] .filter-panel::before {
  background-image: radial-gradient(rgba(120, 53, 15, 0.07) 1px, transparent 1px);
}
[data-theme="light"] .panel-search { border-bottom-color: rgba(180, 83, 9, 0.24); }
[data-theme="light"] .ps-icon { color: #b45309; }
[data-theme="light"] .ps-input { color: #3a2810; }
[data-theme="light"] .ps-input::placeholder { color: #92796a; }
[data-theme="light"] .ps-clear { background: rgba(180, 83, 9, 0.12); color: #6b2e0e; }
[data-theme="light"] .ps-clear:hover { background: rgba(220, 38, 38, 0.65); color: #fff; }

[data-theme="light"] .panel-body::-webkit-scrollbar-thumb { background: rgba(180, 83, 9, 0.4); }
[data-theme="light"] .panel-body { scrollbar-color: rgba(180, 83, 9, 0.4) transparent; }

[data-theme="light"] .emp-row:hover {
  background: rgba(251, 191, 36, 0.18);
  border-color: rgba(180, 83, 9, 0.22);
}
[data-theme="light"] .emp-row.is-active {
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.30), rgba(251, 146, 60, 0.18));
  border-color: rgba(180, 83, 9, 0.45);
}
[data-theme="light"] .row-name { color: #3a2810; }
[data-theme="light"] .row-sub { color: #6b5840; }
[data-theme="light"] .row-code { color: #b45309; }

[data-theme="light"] .row-skel { background: rgba(180, 83, 9, 0.04); }
[data-theme="light"] .sk-av {
  background: linear-gradient(90deg, rgba(251,191,36,0.20), rgba(251,146,60,0.32), rgba(251,191,36,0.20));
  background-size: 220% 100%;
}
[data-theme="light"] .sk-l1, [data-theme="light"] .sk-l2 {
  background: linear-gradient(90deg, rgba(120,53,15,0.08), rgba(120,53,15,0.16), rgba(120,53,15,0.08));
  background-size: 220% 100%;
}

[data-theme="light"] .es-icon {
  background: rgba(251, 191, 36, 0.18);
  border-color: rgba(180, 83, 9, 0.30);
  color: #b45309;
}
[data-theme="light"] .es-text { color: #3a2810; }
[data-theme="light"] .es-sub { color: #6b5840; }

[data-theme="light"] .panel-clear {
  border-top-color: rgba(180, 83, 9, 0.24);
  background: linear-gradient(180deg, rgba(220, 38, 38, 0.06), rgba(220, 38, 38, 0.16));
  color: #b91c1c;
}
[data-theme="light"] .panel-clear:hover {
  background: linear-gradient(180deg, rgba(220, 38, 38, 0.14), rgba(220, 38, 38, 0.26));
  color: #7f1d1d;
}
</style>
