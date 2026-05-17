<template>
  <div class="directory-section">
    <!-- Filter strip (light) -->
    <div class="filter-strip">
      <FilterPill
        label="Department"
        :options="reference.departments.map(d => ({ value: d.id, label: d.name }))"
        :model-value="filters.department_id"
        @change="v => $emit('set-filters', { department_id: v })"
      />
      <FilterPill
        label="Lifecycle"
        :options="LIFECYCLE_OPTIONS"
        :model-value="filters.lifecycle_state"
        @change="v => $emit('set-filters', { lifecycle_state: v })"
      />
      <div class="grow" />
      <span class="muted">{{ total }} {{ total === 1 ? 'employee' : 'employees' }}</span>
    </div>

    <!-- Loading skeleton grid -->
    <div v-if="loading && !employees.length" class="card-grid">
      <div v-for="i in 8" :key="i" class="card-skel">
        <Skeleton width="64px" height="64px" radius="50%" />
        <Skeleton width="60%" height="14px" />
        <Skeleton width="40%" height="11px" />
        <Skeleton width="100%" height="6px" radius="999px" />
      </div>
    </div>

    <!-- Cards -->
    <div v-else-if="employees.length" class="card-grid">
      <button
        v-for="(e, idx) in employees"
        :key="e.id"
        type="button"
        class="emp-card hr-animate"
        :style="{ '--i': idx }"
        @click="$emit('open-profile', e.id)"
      >
        <EmployeeAvatar
          :name="e.full_name"
          :avatar-url="e.avatar_url"
          :seed="e.employee_id"
          size="lg"
          aurora
        />
        <div class="card-name">{{ e.full_name || 'Unnamed' }}</div>
        <div class="card-designation">{{ e.designation_name || '—' }}</div>
        <div class="card-dept-row">
          <span class="dept-chip">{{ e.department_name || 'No dept' }}</span>
          <LifecycleBadge :state="e.lifecycle_state" size="sm" />
        </div>
        <div class="engagement">
          <div class="eng-label">
            <span>Engagement</span>
            <span class="eng-tag">phase 5</span>
          </div>
          <div class="eng-bar">
            <span class="eng-fill" :style="{ width: `${pseudoEngagement(e)}%` }" />
          </div>
        </div>
        <div class="card-id">{{ e.employee_id }}</div>
      </button>
    </div>

    <div v-else class="empty">
      <UsersIcon :size="36" />
      <p>No employees to show.</p>
    </div>

    <!-- Pagination -->
    <div v-if="employees.length" class="pagination-bar">
      <span class="page-info">Page {{ filters.page }} of {{ totalPages }}</span>
      <div class="page-chips">
        <button class="page-chip" :disabled="filters.page <= 1" @click="$emit('set-page', filters.page - 1)">
          <ChevronLeft :size="14" />
        </button>
        <button class="page-chip" :disabled="filters.page >= totalPages" @click="$emit('set-page', filters.page + 1)">
          <ChevronRight :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import FilterPill from '../../../../components/hr/FilterPill.vue'
import EmployeeAvatar from '../../../../components/hr/EmployeeAvatar.vue'
import LifecycleBadge from '../../../../components/hr/LifecycleBadge.vue'
import Skeleton from '../../../../components/hr/Skeleton.vue'
import { ChevronLeft, ChevronRight, Users as UsersIcon } from 'lucide-vue-next'

defineProps({
  employees: { type: Array, required: true },
  total: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  filters: { type: Object, required: true },
  totalPages: { type: Number, default: 1 },
  reference: { type: Object, required: true },
})
defineEmits(['open-profile', 'set-filters', 'set-page'])

const LIFECYCLE_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_PROBATION', label: 'On Probation' },
  { value: 'ON_NOTICE', label: 'On Notice' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'EXITED', label: 'Exited' },
]

// Pseudo-deterministic 30–95 engagement bar — real data lands with Phase 5
function pseudoEngagement(e) {
  const s = String(e.employee_id || e.id || 'x')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xfff
  return 30 + (h % 65)
}
</script>

<style scoped>
.directory-section { display: flex; flex-direction: column; gap: 16px; }

.filter-strip {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px;
  background: var(--hr-surface);
  border: 1px solid var(--hr-border);
  border-radius: 14px;
}
.grow { flex: 1; }
.muted { color: var(--hr-text-muted); font-size: 12px; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.emp-card {
  background: var(--hr-surface-elevated);
  border: 1px solid var(--hr-border);
  border-radius: 16px;
  padding: 20px 16px 14px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  transition: transform 0.25s var(--hr-spring), border-color 0.25s, box-shadow 0.25s var(--hr-spring);
  position: relative;
  animation: hr-fade-up 0.3s var(--hr-spring) backwards;
  animation-delay: calc(var(--i, 0) * 30ms);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
}
.emp-card:hover {
  transform: translateY(-4px);
  border-color: var(--hr-accent-gold-border);
  box-shadow: 0 18px 40px -22px rgba(0, 0, 0, 0.7), var(--hr-accent-gold-glow);
}
.card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--hr-text);
  margin-top: 6px;
}
.card-designation {
  font-size: 11.5px;
  color: var(--hr-text-muted);
}
.card-dept-row {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 2px;
}
.dept-chip {
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--hr-border-strong);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 10.5px;
  color: var(--hr-text-secondary);
}

.engagement {
  width: 100%;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.eng-label {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--hr-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  font-weight: 700;
}
.eng-tag {
  color: var(--hr-accent-gold);
}
.eng-bar {
  width: 100%;
  height: 4px;
  border-radius: 999px;
  background: rgba(255,255,255,0.05);
  overflow: hidden;
}
.eng-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--hr-accent-gold), var(--hr-active));
}
.card-id {
  font-family: ui-monospace, monospace;
  font-size: 10px;
  color: var(--hr-text-dim);
  margin-top: 4px;
}

.card-skel {
  background: var(--hr-surface);
  border: 1px solid var(--hr-border);
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-height: 220px;
}

.empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 80px 20px; gap: 12px;
  color: var(--hr-text-muted);
}

.pagination-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 4px;
}
.page-info { font-size: 11px; color: var(--hr-text-muted); }
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
.page-chip:hover:not(:disabled) { background: rgba(255,255,255,0.04); }
.page-chip:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
