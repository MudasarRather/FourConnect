<template>
  <div class="filtered-list" :class="`tone-${tone}`">
    <!-- Premium header panel -->
    <header class="hdr-panel">
      <div class="hdr-aurora" aria-hidden="true" />
      <div class="hdr-top">
        <div class="hdr-text">
          <span class="eyebrow">
            <span class="dot" />
            <component v-if="accentIcon" :is="accentIcon" :size="11" class="eyebrow-ic" />
            {{ eyebrow || 'Employees' }}
          </span>
          <h3>{{ title }}</h3>
          <p v-if="subtitle">{{ subtitle }}</p>
        </div>
        <div class="hdr-stats">
          <div class="stat">
            <span class="stat-label">Total</span>
            <span class="stat-value">{{ total }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Page</span>
            <span class="stat-value">{{ page }}/{{ totalPages }}</span>
          </div>
        </div>
      </div>

      <!-- Filter toolbar -->
      <div class="hdr-toolbar">
        <div class="tool-cell tool-search">
          <Search :size="13" class="tool-ic" />
          <input
            class="tool-input"
            :value="searchValue"
            placeholder="Search name, email, or employee ID…"
            @input="$emit('update:search', $event.target.value)"
          />
        </div>
        <select
          v-if="departments && departments.length"
          class="tool-select"
          :value="departmentId || ''"
          @change="$emit('update:department', $event.target.value || null)"
        >
          <option value="">All departments</option>
          <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
        <button
          v-if="hasFilters"
          class="ghost-mini danger"
          @click="$emit('clear-filters')"
        >
          <X :size="12" /> Clear
        </button>
      </div>
    </header>

    <div v-if="loading && !employees.length" class="loading-grid">
      <Skeleton v-for="i in 4" :key="i" width="100%" height="56px" radius="12px" />
    </div>

    <ul v-else-if="employees.length" class="emp-list">
      <li
        v-for="(e, i) in employees"
        :key="e.id"
        class="emp-row"
        :style="{ '--i': i }"
      >
        <button class="row-main" type="button" @click="$emit('open-profile', e.id)">
          <EmployeeAvatar :name="e.full_name" :avatar-url="e.avatar_url" :seed="e.employee_id" size="sm" />
          <div class="row-text">
            <div class="row-name">{{ e.full_name || '—' }} <span class="row-id">{{ e.employee_id }}</span></div>
            <div class="row-meta">
              {{ e.designation_name || '—' }} · {{ e.department_name || '—' }}
            </div>
          </div>
          <LifecycleBadge :state="e.lifecycle_state" size="sm" />
        </button>
        <div v-if="inlineAction" class="row-actions">
          <button
            class="action-btn"
            :class="`tone-${inlineAction.tone}`"
            @click.stop="$emit('inline-action', { employee: e, action: inlineAction.key })"
          >
            <component :is="inlineAction.icon" :size="13" />
            {{ inlineAction.label }}
          </button>
        </div>
      </li>
    </ul>

    <div v-else class="empty">
      <component :is="emptyIcon" :size="32" />
      <p>{{ emptyText }}</p>
    </div>

    <div v-if="employees.length && totalPages > 1" class="pagination-bar">
      <span class="page-info">Page {{ page }} of {{ totalPages }}</span>
      <div class="page-chips">
        <button class="page-chip" :disabled="page <= 1" @click="$emit('set-page', page - 1)">
          <ChevronLeft :size="14" />
        </button>
        <button class="page-chip" :disabled="page >= totalPages" @click="$emit('set-page', page + 1)">
          <ChevronRight :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, Users, Search, X } from 'lucide-vue-next'
import EmployeeAvatar from '../../../../components/hr/EmployeeAvatar.vue'
import LifecycleBadge from '../../../../components/hr/LifecycleBadge.vue'
import Skeleton from '../../../../components/hr/Skeleton.vue'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  employees: { type: Array, required: true },
  total: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  page: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  inlineAction: { type: Object, default: null },
  emptyText: { type: String, default: 'No employees here.' },
  emptyIcon: { type: Object, default: () => Users },

  // Filter state — parent owns it
  searchValue: { type: String, default: '' },
  departmentId: { type: String, default: null },
  departments: { type: Array, default: () => [] },

  // Visual differentiation
  tone: { type: String, default: 'gold' },
  eyebrow: { type: String, default: '' },
  accentIcon: { type: Object, default: null },
})
defineEmits([
  'open-profile', 'inline-action', 'set-page',
  'update:search', 'update:department', 'clear-filters',
])

const hasFilters = computed(() => !!(props.searchValue || props.departmentId))
</script>

<style scoped>
.filtered-list {
  display: flex; flex-direction: column; gap: 14px;
  min-width: 0;
  max-width: 100%;
}

/* Premium header panel */
.hdr-panel {
  position: relative;
  display: flex; flex-direction: column; gap: 14px;
  padding: 18px 22px;
  background: linear-gradient(180deg, rgba(28, 28, 32, 0.6), rgba(18, 18, 22, 0.5));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  overflow: hidden;
  isolation: isolate;
}
.hdr-aurora {
  position: absolute; inset: 0;
  pointer-events: none;
  animation: hr-aurora 18s ease-in-out infinite;
  z-index: -1;
}
.hdr-top { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.hdr-text { flex: 1; min-width: 0; }
.eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: 4px;
}
.eyebrow .dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  box-shadow: 0 0 0 0 currentColor;
  animation: hr-pulse-dot-gold 2.4s ease-in-out infinite;
}
.eyebrow-ic { opacity: 0.85; }
.hdr-text h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--hr-text);
  letter-spacing: -0.02em;
  background: linear-gradient(180deg, #ffffff, #c5c5c8);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hdr-text p { margin: 4px 0 0; color: var(--hr-text-muted); font-size: 12.5px; }

.hdr-stats { display: inline-flex; gap: 10px; flex-shrink: 0; }
.stat {
  display: flex; flex-direction: column; gap: 2px;
  padding: 6px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  min-width: 76px;
}
.stat-label { font-size: 9.5px; font-weight: 700; color: var(--hr-text-muted); text-transform: uppercase; letter-spacing: 0.7px; }
.stat-value { font-size: 16px; font-weight: 700; font-family: var(--hr-mono); letter-spacing: -0.01em; }

/* Toolbar */
.hdr-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 2fr) minmax(160px, 1fr) auto;
  gap: 8px;
  align-items: center;
}
@media (max-width: 800px) { .hdr-toolbar { grid-template-columns: 1fr; } }

.tool-cell {
  position: relative;
  display: flex; align-items: center;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  padding: 0 12px;
  height: 36px;
  min-width: 0;
}
.tool-cell:focus-within { border-color: currentColor; }
.tool-ic { color: var(--hr-text-muted); margin-right: 8px; flex-shrink: 0; }
.tool-input {
  flex: 1; min-width: 0;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--hr-text);
  font-size: 12.5px;
  font-family: inherit;
}
.tool-input::placeholder { color: var(--hr-input-placeholder); }
.tool-select {
  height: 36px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  color: var(--hr-text);
  font-size: 12.5px;
  font-family: inherit;
  padding: 0 10px;
}

.ghost-mini {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--hr-border-strong);
  border-radius: 999px;
  color: var(--hr-text-secondary);
  font-size: 11px;
  font-weight: 700;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 200ms var(--hr-spring);
}
.ghost-mini.danger { color: var(--hr-suspended); border-color: rgba(248, 113, 113, 0.32); }
.ghost-mini.danger:hover { background: rgba(248, 113, 113, 0.10); }

.emp-list {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 8px;
}
.emp-row {
  display: flex; align-items: stretch; gap: 0;
  background: linear-gradient(180deg, rgba(28, 28, 32, 0.55), rgba(18, 18, 22, 0.45));
  border: 1px solid var(--hr-border);
  border-radius: 14px;
  overflow: hidden;
  transition: all 220ms var(--hr-spring);
  animation: hr-fade-up 0.32s var(--hr-spring) backwards;
  animation-delay: calc(var(--i, 0) * 28ms);
}
.emp-row:hover {
  border-color: var(--hr-accent-gold-border);
  transform: translateX(3px);
}

.row-main {
  display: flex; align-items: center; gap: 12px;
  flex: 1;
  background: transparent;
  border: none;
  padding: 10px 14px;
  cursor: pointer;
  text-align: left;
  color: var(--hr-text);
  min-width: 0;
}
.row-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.row-name { font-size: 13px; font-weight: 600; color: var(--hr-text); }
.row-id { font-family: ui-monospace, monospace; color: var(--hr-text-dim); font-size: 11px; margin-left: 6px; font-weight: 500; }
.row-meta { font-size: 11px; color: var(--hr-text-muted); }

.row-actions {
  display: flex; align-items: center;
  padding-right: 8px;
  border-left: 1px solid var(--hr-border);
}
.action-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  background: var(--hr-accent-gold-soft);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 999px;
  color: var(--hr-accent-gold);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s var(--hr-spring);
}
.action-btn:hover { background: rgba(251, 191, 36, 0.18); transform: translateY(-1px); }
.action-btn.tone-green { background: rgba(52, 211, 153, 0.1); border-color: rgba(52, 211, 153, 0.3); color: var(--hr-active); }
.action-btn.tone-green:hover { background: rgba(52, 211, 153, 0.2); }

.loading-grid { display: flex; flex-direction: column; gap: 8px; }

.empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 80px 20px; gap: 12px;
  color: var(--hr-text-muted);
}

.pagination-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 4px;
}
.page-info { font-size: 11px; color: var(--hr-text-muted); font-family: var(--hr-mono); }
.page-chips { display: flex; gap: 4px; }
.page-chip {
  width: 28px; height: 28px;
  border-radius: 8px;
  border: 1px solid var(--hr-border-strong);
  background: transparent;
  color: var(--hr-text-secondary);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
.page-chip:hover:not(:disabled) { background: rgba(255,255,255,0.04); border-color: var(--hr-accent-gold-border); color: var(--hr-accent-gold); }
.page-chip:disabled { opacity: 0.4; cursor: not-allowed; }

/* ───── Per-tone palette ───── */
.filtered-list.tone-gold .eyebrow,
.filtered-list.tone-gold .stat-value { color: var(--hr-accent-gold); }
.filtered-list.tone-gold .hdr-aurora {
  background:
    radial-gradient(50% 80% at 0% 0%, rgba(251, 191, 36, 0.10), transparent 60%),
    radial-gradient(40% 60% at 100% 100%, rgba(251, 146, 60, 0.06), transparent 60%);
}
.filtered-list.tone-amber .eyebrow,
.filtered-list.tone-amber .stat-value { color: var(--hr-probation); }
.filtered-list.tone-amber .hdr-aurora {
  background:
    radial-gradient(50% 80% at 0% 0%, rgba(251, 191, 36, 0.14), transparent 60%),
    radial-gradient(40% 60% at 100% 100%, rgba(245, 158, 11, 0.07), transparent 60%);
}
.filtered-list.tone-red .eyebrow,
.filtered-list.tone-red .stat-value { color: var(--hr-suspended); }
.filtered-list.tone-red .hdr-aurora {
  background:
    radial-gradient(50% 80% at 0% 0%, rgba(248, 113, 113, 0.10), transparent 60%),
    radial-gradient(40% 60% at 100% 100%, rgba(220, 38, 38, 0.05), transparent 60%);
}
.filtered-list.tone-gray .eyebrow,
.filtered-list.tone-gray .stat-value { color: var(--hr-inactive); }
.filtered-list.tone-gray .hdr-aurora {
  background:
    radial-gradient(50% 80% at 0% 0%, rgba(156, 163, 175, 0.10), transparent 60%),
    radial-gradient(40% 60% at 100% 100%, rgba(107, 114, 128, 0.05), transparent 60%);
}
.filtered-list.tone-violet .eyebrow,
.filtered-list.tone-violet .stat-value { color: var(--hr-exited); }
.filtered-list.tone-violet .hdr-aurora {
  background:
    radial-gradient(50% 80% at 0% 0%, rgba(192, 132, 252, 0.10), transparent 60%),
    radial-gradient(40% 60% at 100% 100%, rgba(168, 85, 247, 0.05), transparent 60%);
}

/* ─── LIGHT THEME OVERRIDES — warm cream + amber/golden palette ─────────── */
[data-theme="light"] .hdr-panel {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.82), rgba(255, 246, 226, 0.72));
  border-color: rgba(217, 119, 6, 0.22);
  box-shadow: 0 12px 32px -16px rgba(40, 25, 10, 0.16);
}
/* Title gradient — white→gray is invisible on cream */
[data-theme="light"] .hdr-text h3 {
  background: linear-gradient(120deg, #1a1410 0%, #92400e 70%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .hdr-text p { color: #6b5840; }
[data-theme="light"] .stat {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.12);
}
[data-theme="light"] .stat-label { color: #92400e; }

/* Toolbar */
[data-theme="light"] .tool-cell {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.14);
}
[data-theme="light"] .tool-cell:focus-within {
  background: rgba(255, 246, 226, 0.95);
  border-color: rgba(217, 119, 6, 0.55);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.10);
}
[data-theme="light"] .tool-ic { color: rgba(217, 119, 6, 0.65); }
[data-theme="light"] .tool-input { color: #1a1410; }
[data-theme="light"] .tool-input::placeholder { color: rgba(26, 20, 16, 0.42); }
[data-theme="light"] .tool-select {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.14);
  color: #1a1410;
}
[data-theme="light"] .ghost-mini {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.14);
  color: #6b5840;
}
[data-theme="light"] .ghost-mini:hover {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.36);
  color: #b45309;
}

/* Employee rows */
[data-theme="light"] .emp-row {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.78), rgba(255, 246, 226, 0.68));
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .emp-row:hover { border-color: rgba(217, 119, 6, 0.40); }
[data-theme="light"] .row-main { color: #1a1410; }
[data-theme="light"] .row-name { color: #1a1410; }
[data-theme="light"] .row-id { color: #92400e; }
[data-theme="light"] .row-meta { color: #6b5840; }
[data-theme="light"] .row-actions { border-left-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .action-btn {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.36);
  color: #b45309;
}
[data-theme="light"] .action-btn:hover { background: rgba(217, 119, 6, 0.22); }
[data-theme="light"] .action-btn.tone-green {
  background: rgba(5, 150, 105, 0.12);
  color: #047857;
  border-color: rgba(5, 150, 105, 0.32);
}
[data-theme="light"] .action-btn.tone-green:hover { background: rgba(5, 150, 105, 0.18); }

[data-theme="light"] .empty { color: #6b5840; }

/* Pagination */
[data-theme="light"] .page-info { color: #6b5840; }
[data-theme="light"] .page-chip {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.14);
  color: #6b5840;
}
[data-theme="light"] .page-chip:hover:not(:disabled) {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.36);
  color: #b45309;
}
</style>
