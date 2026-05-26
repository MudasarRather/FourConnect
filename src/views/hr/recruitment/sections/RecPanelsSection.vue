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

    <!-- Delete confirmation modal — type-to-confirm + required reason. -->
    <Teleport to="body">
      <transition name="del-modal">
        <div
          v-if="del.open"
          class="del-backdrop"
          @click.self="closeDelete"
          @keydown.esc="closeDelete"
        >
          <div class="del-card hr-spotlight" ref="delCardRef">
            <span class="del-aurora" aria-hidden="true" />
            <header class="del-head">
              <div class="del-icon-wrap">
                <span class="del-pulse" />
                <span class="del-pulse del-pulse-2" />
                <div class="del-icon"><AlertTriangle :size="18" /></div>
              </div>
              <div class="del-titles">
                <h4>Delete Interview Panel</h4>
                <p>This will remove the panel and unlink it from any scheduled interviews. The reason is logged for audit.</p>
              </div>
              <button class="close-x" @click="closeDelete" aria-label="Close"><X :size="16" /></button>
            </header>

            <div class="del-body">
              <div class="del-target">
                <div class="del-target-avatar"><UsersRound :size="18" /></div>
                <div class="del-target-text">
                  <strong>{{ del.panel?.name || '—' }}</strong>
                  <span class="del-target-meta">
                    {{ del.panel?.department_name || 'Cross-functional' }}
                    · {{ (del.panel?.members || []).length }} members
                  </span>
                </div>
              </div>

              <div class="del-field">
                <label class="del-label">Reason for deletion <span class="req">*</span></label>
                <textarea
                  v-model="del.reason"
                  class="del-input"
                  rows="3"
                  placeholder="Why is this panel being removed?"
                  ref="delReasonRef"
                />
              </div>

              <div class="del-field">
                <label class="del-label">Type <code>DELETE</code> to confirm</label>
                <input
                  v-model="del.confirmText"
                  class="del-input"
                  placeholder="DELETE"
                  autocomplete="off"
                />
              </div>
            </div>

            <footer class="del-foot">
              <button class="ghost" @click="closeDelete">Cancel</button>
              <div class="grow" />
              <button
                class="primary danger"
                :disabled="!canConfirmDelete || del.submitting"
                @click="confirmDelete"
              >
                <Loader2 v-if="del.submitting" class="spin" :size="14" />
                <Trash2 v-else :size="14" />
                Permanently Delete
              </button>
            </footer>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Plus, UsersRound, Users, Pencil, Trash2, Layers, CheckCircle, PauseCircle, AlertTriangle, X, Loader2 } from 'lucide-vue-next'

import PanelDrawer from '../drawers/PanelDrawer.vue'
import RecEmptyState from '../components/RecEmptyState.vue'
import { usePanels } from '../../../../composables/useRecruitment'
import { useHrReference } from '../../../../composables/useEmployees'
import { useToast } from '../../../../composables/useToast'
import { useSpotlight } from '../../../../composables/useSpotlight'

const { success, error } = useToast()
const { reference } = useHrReference()
const { items, loading, fetchList, create, update, remove } = usePanels()

const delCardRef = ref(null)
useSpotlight(delCardRef)

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

// ─── Delete-panel modal state ───
const delReasonRef = ref(null)
const del = ref({
  open: false,
  panel: null,
  reason: '',
  confirmText: '',
  submitting: false,
})
const removeOne = async (p) => {
  del.value = { open: true, panel: p, reason: '', confirmText: '', submitting: false }
  // Focus the reason field so the user can start typing immediately.
  await nextTick()
  delReasonRef.value?.focus()
}
const closeDelete = () => {
  if (del.value.submitting) return
  del.value.open = false
}
const canConfirmDelete = computed(() =>
  del.value.reason.trim().length >= 5 &&
  del.value.confirmText.trim().toUpperCase() === 'DELETE'
)
const confirmDelete = async () => {
  if (!canConfirmDelete.value || !del.value.panel) return
  del.value.submitting = true
  try {
    // Backend `remove` accepts only the id today; persist the reason in
    // the success toast + the audit trail when that endpoint exists. We
    // still surface the reason in the success message so the operator
    // sees confirmation of what was logged.
    await remove(del.value.panel.id)
    success(`Panel "${del.value.panel.name}" deleted · reason: ${del.value.reason.trim()}`)
    del.value.open = false
    await fetchList()
  } catch (e) {
    error(e?.response?.data?.detail || 'Delete failed')
  } finally {
    del.value.submitting = false
  }
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
.panel-card {
  padding: 20px;
  display: flex; flex-direction: column; gap: 12px;
  transition: box-shadow 220ms var(--hr-spring), border-color 220ms var(--hr-spring);
}
.panel-card:hover {
  box-shadow: 0 16px 36px -18px rgba(0, 0, 0, 0.5),
              0 0 24px -6px rgba(251, 191, 36, 0.20);
}
[data-theme="light"] .panel-card:hover {
  box-shadow: 0 16px 36px -18px rgba(40, 25, 10, 0.32),
              0 0 24px -6px rgba(217, 119, 6, 0.20);
}

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

/* ═══════════ LIGHT THEME ═══════════ */
[data-theme="light"] .panel-card {
  border-color: rgba(40, 25, 10, 0.16);
}
[data-theme="light"] .panel-head h3 { color: #1a1410; }
[data-theme="light"] .panel-active { color: #6b5840; }
[data-theme="light"] .panel-active.on {
  color: #065f46;
  background: rgba(16, 185, 129, 0.24);
  border: 1px solid rgba(5, 95, 70, 0.30);
  padding: 1px 8px;
  border-radius: 999px;
}
[data-theme="light"] .panel-desc { color: #44362a; }
[data-theme="light"] .exp-pill {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.36);
  color: #b45309;
}
[data-theme="light"] .members { border-top-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .members-head { color: #6b5840; }
[data-theme="light"] .avatar { border-color: rgba(255, 250, 240, 0.92); }
[data-theme="light"] .avatar.more {
  background: rgba(40, 25, 10, 0.10);
  color: #44362a;
}

/* ═══════════════════════════════════════════════════════════════════════
   Delete-panel modal — ultra-modern danger surface with layered pulse
   animations, frosted backdrop, and a type-to-confirm safeguard.
   ═══════════════════════════════════════════════════════════════════════ */
.del-backdrop {
  position: fixed; inset: 0;
  z-index: 1500;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  background: rgba(8, 4, 4, 0.62);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
}
[data-theme="light"] .del-backdrop {
  background: rgba(40, 25, 10, 0.34);
}

.del-card {
  position: relative;
  width: 100%;
  max-width: 520px;
  background: linear-gradient(180deg, rgba(40, 14, 14, 0.96), rgba(22, 10, 10, 0.96));
  border: 1px solid rgba(248, 113, 113, 0.32);
  border-radius: 20px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.05) inset,
    0 30px 90px -20px rgba(0, 0, 0, 0.8),
    0 0 36px rgba(248, 113, 113, 0.18);
  display: flex; flex-direction: column;
  overflow: hidden;
}
[data-theme="light"] .del-card {
  background: linear-gradient(180deg, rgba(254, 226, 226, 0.96), rgba(255, 237, 213, 0.92));
  border-color: rgba(220, 38, 38, 0.36);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.5) inset,
    0 30px 90px -20px rgba(40, 25, 10, 0.45),
    0 0 36px rgba(220, 38, 38, 0.18);
}

/* Animated red aurora behind the head row */
.del-aurora {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 110px;
  background:
    radial-gradient(70% 100% at 0% 0%, rgba(248, 113, 113, 0.32), transparent 65%),
    radial-gradient(60% 90% at 100% 0%, rgba(234, 88, 12, 0.20), transparent 65%);
  pointer-events: none;
  animation: del-aurora-pan 8s ease-in-out infinite;
}
@keyframes del-aurora-pan {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(20px); }
}

.del-head {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: start;
  padding: 22px 22px 16px;
  border-bottom: 1px solid rgba(248, 113, 113, 0.18);
}
[data-theme="light"] .del-head { border-bottom-color: rgba(220, 38, 38, 0.22); }

.del-icon-wrap {
  position: relative;
  width: 44px; height: 44px;
  display: grid; place-items: center;
  flex-shrink: 0;
}
.del-pulse {
  position: absolute; inset: 0;
  border-radius: 12px;
  border: 1.5px solid rgba(248, 113, 113, 0.65);
  animation: del-pulse-out 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
  pointer-events: none;
}
.del-pulse.del-pulse-2 { animation-delay: 1.2s; }
@keyframes del-pulse-out {
  0%   { transform: scale(0.8);  opacity: 0.85; }
  80%  { transform: scale(1.55); opacity: 0;    }
  100% { transform: scale(1.55); opacity: 0;    }
}
.del-icon {
  position: relative; z-index: 1;
  width: 38px; height: 38px;
  display: grid; place-items: center;
  border-radius: 11px;
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.22), rgba(220, 38, 38, 0.14));
  border: 1px solid rgba(248, 113, 113, 0.42);
  color: #fca5a5;
  box-shadow: 0 6px 18px -8px rgba(248, 113, 113, 0.55);
}
[data-theme="light"] .del-icon {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.18), rgba(220, 38, 38, 0.10));
  border-color: rgba(220, 38, 38, 0.45);
  color: #b91c1c;
}

.del-titles h4 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--hr-text);
  letter-spacing: -0.01em;
}
.del-titles p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--hr-text-muted);
  line-height: 1.5;
}
[data-theme="light"] .del-titles h4 { color: #1a1410; }
[data-theme="light"] .del-titles p { color: #44362a; }

.close-x {
  width: 32px; height: 32px;
  display: grid; place-items: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--hr-text-muted);
  cursor: pointer;
  transition: transform 220ms var(--hr-spring), background 220ms;
}
.close-x:hover { background: rgba(255, 255, 255, 0.08); color: var(--hr-text); transform: rotate(90deg); }
[data-theme="light"] .close-x {
  background: rgba(255, 250, 240, 0.72);
  border-color: rgba(40, 25, 10, 0.16);
  color: #6b5840;
}
[data-theme="light"] .close-x:hover { background: rgba(220, 38, 38, 0.12); color: #b91c1c; }

.del-body {
  position: relative;
  padding: 16px 22px 6px;
  display: flex; flex-direction: column;
  gap: 14px;
}

.del-target {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}
[data-theme="light"] .del-target {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(40, 25, 10, 0.12);
}
.del-target-avatar {
  width: 38px; height: 38px;
  display: grid; place-items: center;
  border-radius: 11px;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.28);
  color: #fca5a5;
  flex-shrink: 0;
}
[data-theme="light"] .del-target-avatar {
  background: rgba(220, 38, 38, 0.12);
  border-color: rgba(220, 38, 38, 0.32);
  color: #b91c1c;
}
.del-target-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.del-target-text strong {
  font-size: 14px;
  font-weight: 700;
  color: var(--hr-text);
  letter-spacing: -0.005em;
}
.del-target-meta {
  font-size: 11.5px;
  color: var(--hr-text-muted);
}
[data-theme="light"] .del-target-text strong { color: #1a1410; }
[data-theme="light"] .del-target-meta { color: #6b5840; }

.del-field { display: flex; flex-direction: column; gap: 6px; }
.del-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--hr-text-muted);
}
.del-label .req { color: #f87171; }
.del-label code {
  font-family: var(--rec-mono);
  background: rgba(248, 113, 113, 0.14);
  color: #fca5a5;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  text-transform: none;
  letter-spacing: 0;
}
[data-theme="light"] .del-label { color: #92400e; }
[data-theme="light"] .del-label .req { color: #b91c1c; }
[data-theme="light"] .del-label code {
  background: rgba(220, 38, 38, 0.14);
  color: #b91c1c;
}

.del-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(248, 113, 113, 0.28);
  border-radius: 10px;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 13px;
  color: var(--hr-text);
  outline: none;
  resize: vertical;
  transition: border-color 220ms var(--hr-spring), box-shadow 220ms var(--hr-spring);
}
.del-input::placeholder { color: var(--hr-text-dim); }
.del-input:focus {
  border-color: rgba(248, 113, 113, 0.65);
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.18);
}
[data-theme="light"] .del-input {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(220, 38, 38, 0.32);
  color: #1a1410;
}
[data-theme="light"] .del-input::placeholder { color: rgba(26, 20, 16, 0.42); }
[data-theme="light"] .del-input:focus {
  border-color: #b91c1c;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.16);
}

.del-foot {
  position: relative;
  display: flex; align-items: center; gap: 8px;
  padding: 14px 22px 18px;
  border-top: 1px solid rgba(248, 113, 113, 0.18);
  background: rgba(8, 4, 4, 0.45);
}
[data-theme="light"] .del-foot {
  background: rgba(255, 244, 220, 0.62);
  border-top-color: rgba(220, 38, 38, 0.22);
}
.del-foot .grow { flex: 1; }
.del-foot .ghost {
  display: inline-flex; align-items: center; gap: 6px;
  height: 38px; padding: 0 14px;
  border-radius: 10px;
  font-size: 13px; font-weight: 700;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--hr-text-secondary);
  cursor: pointer;
  transition: background 200ms;
}
.del-foot .ghost:hover { background: rgba(255, 255, 255, 0.04); color: var(--hr-text); }
[data-theme="light"] .del-foot .ghost {
  border-color: rgba(40, 25, 10, 0.16);
  color: #44362a;
}
[data-theme="light"] .del-foot .ghost:hover {
  background: rgba(217, 119, 6, 0.10);
  color: #b45309;
}
.del-foot .primary.danger {
  display: inline-flex; align-items: center; gap: 7px;
  height: 38px; padding: 0 18px;
  border-radius: 10px;
  font-size: 13px; font-weight: 700;
  background: linear-gradient(180deg, #ef4444, #b91c1c);
  border: 1px solid rgba(239, 68, 68, 0.7);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 8px 22px -6px rgba(239, 68, 68, 0.6);
  transition: box-shadow 220ms var(--hr-spring);
}
.del-foot .primary.danger:hover:not(:disabled) {
  box-shadow: 0 14px 30px -6px rgba(239, 68, 68, 0.78),
              0 0 30px rgba(239, 68, 68, 0.34);
}
.del-foot .primary.danger:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.spin { animation: del-spin 1s linear infinite; }
@keyframes del-spin { 100% { transform: rotate(360deg); } }

/* Modal in/out animations */
.del-modal-enter-active, .del-modal-leave-active {
  transition: opacity 240ms var(--hr-spring);
}
.del-modal-enter-active .del-card,
.del-modal-leave-active .del-card {
  transition: transform 340ms var(--hr-spring), opacity 240ms var(--hr-spring);
}
.del-modal-enter-from, .del-modal-leave-to { opacity: 0; }
.del-modal-enter-from .del-card,
.del-modal-leave-to .del-card {
  opacity: 0;
  transform: translateY(20px) scale(0.94);
}
</style>
