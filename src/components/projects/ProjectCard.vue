<template>
  <div class="project-card" @click="handleCardClick">
    <!-- Priority ribbon on the left edge -->
    <div class="priority-ribbon" :class="`prio-${priorityKey}`" :title="`Priority: ${project.priority || '—'}`"></div>

    <!-- Top row: category + status + actions -->
    <div class="card-top">
      <div class="cat-row">
        <span v-if="project.category" class="cat-chip">
          <Tag :size="10"/> {{ project.category }}
        </span>
        <span class="status-pill" :class="statusClass">{{ displayStatus }}</span>
      </div>
      <div class="card-actions" v-if="showActions">
        <button class="action-btn view" @click.stop="$emit('view', project, $event)" title="View Project">
          <Eye :size="13"/>
        </button>
        <button v-if="canEdit" class="action-btn" @click.stop="$emit('edit', project, $event)" title="Edit Project">
          <Edit2 :size="13"/>
        </button>
        <button v-if="canDelete" class="action-btn delete" @click.stop="$emit('remove', project)" title="Delete Project">
          <Trash2 :size="13" style="pointer-events: none;"/>
        </button>
      </div>
    </div>

    <!-- Title + sub -->
    <h3 class="project-title" :title="project.project_name">{{ project.project_name || 'Untitled Project' }}</h3>
    <p class="project-sub">
      <Building :size="11" class="icon-subtle"/>
      <span>{{ project.department || project.organization || 'Untagged' }}</span>
      <span v-if="project.state" class="dotdiv">·</span>
      <span v-if="project.state">{{ project.state }}</span>
    </p>

    <!-- Order Value big number -->
    <div class="amount-row">
      <span class="amt-cur">{{ project.currency || 'USD' }}</span>
      <span class="amt-num">{{ formatBudget(project.estimated_budget) }}</span>
      <span class="amt-tag">ORDER VALUE</span>
    </div>

    <!-- Footer: lifecycle + priority dot + date -->
    <div class="card-foot">
      <span class="life-pill">
        <span class="life-dot" :class="`life-${lifecycleKey}`"></span>
        {{ project.lifecycle_status || 'Order Received' }}
      </span>
      <span class="prio-dot-pill" :class="`prio-${priorityKey}`">
        <span class="prio-dot"></span>
        {{ project.priority || '—' }}
      </span>
      <span class="foot-date">{{ formatDate(project.created_at) }}</span>
      <ArrowUpRight :size="14" class="arrow-icon"/>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Edit2, Trash2, Eye, Tag, Building, ArrowUpRight } from 'lucide-vue-next'

const props = defineProps({
  project: { type: Object, required: true },
  isAdmin: { type: Boolean, default: false },
  currentUserId: { type: String, default: null }
})

const emit = defineEmits(['click', 'edit', 'remove', 'view'])

const handleCardClick = (event) => {
  if (props.isAdmin) emit('view', props.project, event)
  else emit('click', props.project)
}

// Status display + class
const displayStatus = computed(() => props.project.status || 'Draft')
const statusClass = computed(() => (props.project.status || 'draft').toLowerCase().replace(' ', '-'))

// Ownership / actions visibility (unchanged behaviour)
const isOwner = computed(() => {
  if (!props.currentUserId || !props.project.owner_id) return false
  return String(props.currentUserId) === String(props.project.owner_id)
})
const showActions = computed(() => props.isAdmin || (isOwner.value && displayStatus.value === 'Draft'))
const canEdit     = computed(() => props.isAdmin || (isOwner.value && displayStatus.value === 'Draft'))
const canDelete   = computed(() => props.isAdmin || (isOwner.value && displayStatus.value === 'Draft'))

// New govt-aware computeds
const priorityKey = computed(() => (props.project.priority || 'low').toLowerCase())
const lifecycleKey = computed(() => (props.project.lifecycle_status || 'order-received').toLowerCase().replace(/\s+/g, '-'))

// Helpers
const formatDate = (s) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'
const formatBudget = (n) => {
  const v = Number(n)
  if (!v) return '—'
  if (v >= 1e7) return (v / 1e7).toFixed(2) + ' Cr'
  if (v >= 1e5) return (v / 1e5).toFixed(2) + ' L'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K'
  return v.toLocaleString()
}
</script>

<style scoped>
/* CIVIC BLUEPRINT CARD */
.project-card {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; gap: 10px;
  padding: 18px 18px 14px 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.025) 0%, rgba(255, 255, 255, 0.005) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.project-card::after {
  content: ''; position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.04), transparent 60%);
  opacity: 0; transition: opacity 0.35s ease;
}
.project-card:hover {
  transform: translateY(-4px);
  border-color: rgba(245, 158, 11, 0.30);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.40), 0 0 0 1px rgba(245, 158, 11, 0.06) inset;
}
.project-card:hover::after { opacity: 1; }

/* Priority ribbon on left edge */
.priority-ribbon {
  position: absolute; left: 0; top: 16px; bottom: 16px;
  width: 3px; border-radius: 0 4px 4px 0;
  background: rgba(255, 255, 255, 0.10);
  transition: all 0.3s ease;
}
.priority-ribbon.prio-high   { background: linear-gradient(180deg, #ef4444, #f97316); box-shadow: 0 0 12px rgba(239, 68, 68, 0.6); }
.priority-ribbon.prio-medium { background: linear-gradient(180deg, #fbbf24, #f59e0b); }
.priority-ribbon.prio-low    { background: linear-gradient(180deg, #facc15, #f97316 70%); }
.project-card:hover .priority-ribbon { width: 5px; top: 8px; bottom: 8px; }

/* Top row */
.card-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.cat-row { display: flex; gap: 6px; align-items: center; min-width: 0; flex-wrap: wrap; }
.cat-chip {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.06em;
  padding: 3px 8px; border-radius: 999px;
  color: #fde68a;
  background: rgba(245, 158, 11, 0.10); border: 1px solid rgba(245, 158, 11, 0.22);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px;
}
.cat-chip svg { color: #f97316; }

.status-pill {
  font-size: 9px; font-weight: 700; padding: 3px 9px; border-radius: 6px;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.status-pill.draft    { background: rgba(113, 113, 122, 0.18); color: #d4d4d8; border: 1px solid rgba(113, 113, 122, 0.30); }
.status-pill.pending  { background: rgba(251, 191, 36, 0.12); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.30); }
.status-pill.approved { background: rgba(245, 158, 11, 0.14); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.32); }
.status-pill.rejected { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.30); }

.card-actions {
  display: flex; gap: 5px;
  opacity: 0; transform: translateX(4px);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.project-card:hover .card-actions, .card-actions:focus-within { opacity: 1; transform: translateX(0); }
.action-btn {
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.65);
  width: 24px; height: 24px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s ease;
}
.action-btn:hover         { background: rgba(255, 255, 255, 0.10); color: #fff; }
.action-btn.view:hover    { background: rgba(245, 158, 11, 0.22);  color: #fde68a; border-color: rgba(245, 158, 11, 0.30); }
.action-btn.delete:hover  { background: rgba(239, 68, 68, 0.18);   color: #fca5a5; border-color: rgba(239, 68, 68, 0.30); }

/* Title + sub */
.project-title {
  font-family: 'Outfit', sans-serif;
  font-size: 16px; font-weight: 600; color: #fff;
  line-height: 1.3; margin: 4px 0 0;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.project-sub {
  display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;
  font-size: 11px; color: rgba(255, 255, 255, 0.50); margin: 0;
}
.project-sub .dotdiv { opacity: 0.4; }
.icon-subtle { color: rgba(255, 255, 255, 0.35); flex-shrink: 0; }

/* Amount row */
.amount-row {
  display: flex; align-items: baseline; gap: 6px;
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px dashed rgba(255, 255, 255, 0.06);
}
.amt-cur { font-size: 10px; font-weight: 700; color: rgba(255, 255, 255, 0.40); letter-spacing: 0.06em; }
.amt-num {
  font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 700;
  background: linear-gradient(180deg, #fff, #fde68a);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  letter-spacing: -0.01em;
}
.amt-tag { margin-left: auto; font-size: 8px; font-weight: 700; letter-spacing: 0.18em; color: rgba(249, 115, 22, 0.55); }

/* Footer */
.card-foot {
  display: flex; align-items: center; gap: 8px;
  margin-top: 4px; flex-wrap: wrap;
}
.life-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 999px;
  font-size: 10px; color: rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.06);
}
.life-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255, 255, 255, 0.30); }
.life-dot.life-order-received { background: #fde68a; }
.life-dot.life-planning      { background: #f97316; }
.life-dot.life-tendering     { background: #fbbf24; }
.life-dot.life-in-progress   { background: #f97316; box-shadow: 0 0 8px rgba(249, 115, 22, 0.6); }
.life-dot.life-active        { background: #facc15; }
.life-dot.life-completed     { background: #fbbf24; box-shadow: 0 0 6px rgba(251, 191, 36, 0.55); }

.prio-dot-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 999px; font-size: 10px;
  background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.55);
}
.prio-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255, 255, 255, 0.40); }
.prio-dot-pill.prio-high   { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.30); color: #fda4a4; }
.prio-dot-pill.prio-high .prio-dot   { background: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.7); animation: prio-hi-pulse 2.4s ease-in-out infinite; }
.prio-dot-pill.prio-medium { background: rgba(251, 191, 36, 0.08); border-color: rgba(251, 191, 36, 0.30); color: #fde68a; }
.prio-dot-pill.prio-medium .prio-dot { background: #fbbf24; }
.prio-dot-pill.prio-low    { background: rgba(245, 158, 11, 0.10); border-color: rgba(245, 158, 11, 0.30); color: #fde68a; }
.prio-dot-pill.prio-low .prio-dot    { background: #facc15; }
@keyframes prio-hi-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(239, 68, 68, 0.7); transform: scale(1); }
  50%      { box-shadow: 0 0 14px rgba(239, 68, 68, 1); transform: scale(1.18); }
}

.foot-date { margin-left: auto; font-family: 'SF Mono', monospace; font-size: 10px; color: rgba(255, 255, 255, 0.40); }
.arrow-icon { color: rgba(255, 255, 255, 0.20); transition: all 0.25s ease; }
.project-card:hover .arrow-icon { color: #f97316; transform: translate(3px, -3px); }
</style>
