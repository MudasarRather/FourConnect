<template>
  <div class="rec-section rec-fade-up">
    <div class="rec-toolbar-surface is-row">
      <div class="toolbar-left">
        <div v-for="f in statusFilters" :key="f.key"
          :class="['rec-filter-pill', activeFilter === f.key && 'is-active']"
          @click="setStatus(f.key)">
          <component :is="f.icon" :size="13" />
          <span>{{ f.label }}</span>
          <span v-if="f.count !== null" class="rec-pill-count">{{ f.count }}</span>
        </div>
      </div>
      <div class="toolbar-right">
        <button class="rec-btn-primary" @click="openCreate">
          <Plus :size="15" /> New Panel
        </button>
      </div>
    </div>

    <div v-if="loading" class="panel-grid">
      <div v-for="i in 3" :key="i" class="rec-skel" style="height: 220px; border-radius: 16px" />
    </div>
    <RecEmptyState
      v-else-if="!filteredItems.length"
      :icon="UsersRound"
      :title="activeFilter === 'all' ? 'No panels yet' : `No ${activeFilter} panels`"
      :body="activeFilter === 'all'
              ? 'Create reusable interview panels to streamline scheduling.'
              : 'Try a different filter or create a new panel.'"
      cta-label="Create Panel"
      :cta-icon="Plus"
      @cta="openCreate"
    />
    <div v-else class="panel-grid">
      <article
        v-for="(p, i) in filteredItems"
        :key="p.id"
        v-tilt
        class="panel-card rec-card rec-card-glow"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :visible="{ opacity: 1, y: 0, transition: { duration: 320, delay: i * 60 } }"
      >
        <div class="panel-head">
          <div>
            <h3>{{ p.name }}</h3>
            <div class="dim">{{ p.department_name || 'Cross-functional' }}</div>
          </div>
          <span :class="['panel-active', p.is_active && 'on']">
            <span class="dot" /> {{ p.is_active ? 'Active' : 'Inactive' }}
          </span>
        </div>
        <p v-if="p.description" class="panel-desc">{{ p.description }}</p>
        <div v-if="(p.expertise || []).length" class="expertise">
          <span v-for="e in p.expertise" :key="e" class="exp-pill">{{ e }}</span>
        </div>
        <div class="members">
          <div class="members-head">
            <Users :size="13" /> {{ (p.members || []).length }} members
          </div>
          <div class="member-stack">
            <span v-for="(m, idx) in (p.members || []).slice(0, 4)" :key="idx" class="avatar"
                  :style="{ background: avatarColor(m.name) }" :title="m.name">
              {{ initials(m.name) }}
            </span>
            <span v-if="(p.members || []).length > 4" class="avatar more">
              +{{ p.members.length - 4 }}
            </span>
          </div>
        </div>
        <div class="panel-actions">
          <button class="rec-btn-ghost" @click="openEdit(p)">
            <Pencil :size="13" /> Edit
          </button>
          <button class="rec-btn-danger" @click="removeOne(p)">
            <Trash2 :size="13" /> Delete
          </button>
        </div>
      </article>
    </div>

    <PanelDrawer
      :open="drawer.open"
      :reference="reference"
      :initial="drawer.data"
      @close="drawer.open = false"
      @submit="onSubmit"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, UsersRound, Users, Pencil, Trash2, Layers, CheckCircle, PauseCircle } from 'lucide-vue-next'

import PanelDrawer from '../drawers/PanelDrawer.vue'
import RecEmptyState from '../components/RecEmptyState.vue'
import { usePanels } from '../../../../composables/useRecruitment'
import { useHrReference } from '../../../../composables/useEmployees'
import { useToast } from '../../../../composables/useToast'

const { success, error } = useToast()
const { reference } = useHrReference()
const { items, loading, fetchList, create, update, remove } = usePanels()

const activeFilter = ref('all')
const setStatus = (key) => { activeFilter.value = key }

const statusFilters = computed(() => {
  const all = items.value || []
  const active = all.filter(p => p.is_active)
  const inactive = all.filter(p => !p.is_active)
  return [
    { key: 'all',      label: 'All',      icon: Layers,       count: all.length },
    { key: 'active',   label: 'Active',   icon: CheckCircle,  count: active.length },
    { key: 'inactive', label: 'Inactive', icon: PauseCircle,  count: inactive.length },
  ]
})

const filteredItems = computed(() => {
  const list = items.value || []
  if (activeFilter.value === 'active') return list.filter(p => p.is_active)
  if (activeFilter.value === 'inactive') return list.filter(p => !p.is_active)
  return list
})

const drawer = ref({ open: false, id: null, data: null })

const openCreate = () => { drawer.value = { open: true, id: null, data: null } }
const openEdit = (p) => { drawer.value = { open: true, id: p.id, data: p } }

const onSubmit = async (payload) => {
  try {
    if (drawer.value.id) { await update(drawer.value.id, payload); success('Panel updated') }
    else { await create(payload); success('Panel created') }
    drawer.value.open = false
    await fetchList()
  } catch (e) {
    error(e?.response?.data?.detail || 'Save failed')
  }
}

const removeOne = async (p) => {
  if (!confirm(`Delete panel "${p.name}"?`)) return
  try { await remove(p.id); success('Panel deleted'); await fetchList() }
  catch (e) { error(e?.response?.data?.detail || 'Delete failed') }
}

const initials = (name) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
const avatarColor = (name) => {
  const colors = ['#fbbf24', '#f59e0b', '#fb923c', '#ea580c', '#f97316', '#fde68a']
  let h = 0
  for (const ch of (name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return colors[h % colors.length]
}

onMounted(fetchList)
</script>

<style scoped>
.rec-section { display: flex; flex-direction: column; gap: 14px; }

.toolbar-title {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--hr-text);
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}
.panel-card { padding: 20px; display: flex; flex-direction: column; gap: 12px; transition: transform 220ms var(--hr-spring); }
.panel-card:hover { transform: translateY(-3px); }

.panel-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 10px;
}
.panel-head h3 { margin: 0; font-size: 16px; font-weight: 700; color: var(--hr-text); letter-spacing: -0.01em; }
.dim { font-size: 12px; color: var(--hr-text-muted); margin-top: 2px; }

.panel-active {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.05em; text-transform: uppercase;
  color: #9ca3af;
  border: 1px solid currentColor;
}
.panel-active .dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.panel-active.on { color: #34d399; }

.panel-desc { margin: 0; font-size: 12px; color: var(--hr-text-secondary); line-height: 1.5; }

.expertise { display: flex; flex-wrap: wrap; gap: 6px; }
.exp-pill {
  padding: 2px 8px;
  background: var(--hr-accent-gold-soft);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 999px;
  font-size: 10px; font-weight: 600;
  color: var(--hr-accent-gold);
}

.members {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.04);
}
.members-head {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--hr-text-muted);
}
.member-stack { display: inline-flex; }
.avatar {
  width: 28px; height: 28px; border-radius: 50%;
  display: grid; place-items: center;
  font-size: 11px; font-weight: 700;
  color: #1a1a1c;
  border: 2px solid var(--hr-surface);
  margin-left: -8px;
}
.avatar.more {
  background: rgba(255,255,255,0.08);
  color: var(--hr-text-secondary);
  font-size: 10px;
}

.panel-actions { display: flex; gap: 6px; }
.panel-actions button { font-size: 12px; padding: 6px 12px; }
</style>
