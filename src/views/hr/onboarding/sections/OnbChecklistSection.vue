<template>
  <section class="onb-checklist">
    <Motion as="header" class="onb-section-banner chk-banner"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="onb-section-banner-glow" />
      <div class="onb-section-banner-text">
        <span class="onb-eyebrow"><span class="onb-eyebrow-dot" /> Department orchestration</span>
        <h2 class="onb-banner-title">
          <span class="id-title-word">Joining</span>
          <span class="banner-divider">·</span>
          <span class="id-title-word" style="animation-delay: 80ms">Checklist</span>
        </h2>
        <p class="onb-banner-sub">Six departments, ten standard items. Tick boxes as work lands — your journey ring updates in real-time.</p>
      </div>
      <div class="onb-banner-aside">
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ overallPct }}%</span>
          <span class="onb-banner-stat-label">Overall</span>
        </div>
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ overallDone }}</span>
          <span class="onb-banner-stat-label">Done</span>
        </div>
      </div>
    </Motion>

    <OnbProcessPicker v-model="processId" @change="reload" />

    <div v-if="!processId" class="onb-empty-card">
      <div class="onb-empty-mark"><ListChecks :size="22" /></div>
      <p>Pick a joiner above to load their checklist.</p>
    </div>

    <div v-else class="chk-overview">
      <!-- summary strip -->
      <Motion as="div" class="chk-strip"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }"
      >
        <div class="strip-block">
          <span class="strip-label">Overall</span>
          <div class="strip-row">
            <div class="strip-bar"><div class="strip-fill" :style="{ width: overallPct + '%' }"></div></div>
            <span class="strip-num">{{ overallPct }}%</span>
          </div>
          <span class="strip-detail">{{ overallDone }} / {{ items.length }} tasks complete</span>
        </div>
        <div class="strip-cats">
          <Motion v-for="(c, i) in groupedCategories" :key="c.key" as="div" class="strip-cat" :style="{ '--accent': catColor(c.key) }"
            :initial="{ opacity: 0, scale: 0.96 }"
            :animate="{ opacity: 1, scale: 1 }"
            :transition="{ duration: 0.35, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }"
          >
            <span class="cat-icon"><component :is="catIcon(c.key)" :size="12" /></span>
            <span class="cat-name">{{ c.key }}</span>
            <span class="cat-pct">{{ c.percent }}%</span>
          </Motion>
        </div>
      </Motion>

      <!-- category timeline rails -->
      <div class="chk-rails">
        <Motion v-for="(cat, idx) in groupedCategories" :key="cat.key" as="article" class="chk-rail" :style="{ '--accent': catColor(cat.key) }"
          :initial="{ opacity: 0, y: 14 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.06 * idx, ease: [0.22, 1, 0.36, 1] }"
        >
          <aside class="rail-side">
            <span class="side-icon"><component :is="catIcon(cat.key)" :size="14" /></span>
            <span class="side-name">{{ cat.key }}</span>
            <span class="side-pct">{{ cat.percent }}%</span>
            <div class="side-ring"
                 :style="`background: conic-gradient(var(--accent) ${cat.percent}%, rgba(255,255,255,0.06) ${cat.percent}%)`">
              <span class="side-ring-inner">{{ cat.completed }}/{{ cat.items.length }}</span>
            </div>
          </aside>

          <ol class="rail-list">
            <Motion v-for="(item, i) in cat.items" :key="item.id" as="li"
              class="rail-item"
              :class="{ 'is-done': item.status === 'COMPLETED', 'is-blocked': item.status === 'BLOCKED' }"
              :initial="{ opacity: 0, x: -8 }"
              :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.35, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
            >
              <button class="rail-check" :class="{ 'is-done': item.status === 'COMPLETED' }" @click="toggle(item)" :aria-label="`Toggle ${item.task_name}`">
                <svg v-if="item.status === 'COMPLETED'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
              <div class="rail-item-main">
                <div class="rail-item-title">{{ item.task_name }}</div>
                <div class="rail-item-meta">
                  <span v-if="item.assigned_to_name"><User :size="9" /> {{ item.assigned_to_name }}</span>
                  <span v-else><User :size="9" /> Unassigned</span>
                  <span v-if="item.due_date"><Calendar :size="9" /> {{ formatDate(item.due_date) }}</span>
                  <span v-if="item.is_mandatory" class="rail-must">REQUIRED</span>
                </div>
              </div>
              <span class="rail-status" :data-status="item.status">{{ item.status }}</span>
            </Motion>
            <li v-if="!cat.items.length" class="rail-empty">No items in this category.</li>
          </ol>
        </Motion>
      </div>
    </div>

    <Confetti :fire="confettiFire" />
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { ListChecks, Briefcase, Cpu, Building2, IndianRupee, Shield, GitBranch, User, Calendar } from 'lucide-vue-next'
import OnbProcessPicker from '../components/OnbProcessPicker.vue'
import { fetchChecklist, patchChecklistItem } from '../composables/useOnbChecklist'
import { useToast } from 'vue-toastification'
import Confetti from '../../../../components/hr/Confetti.vue'

defineEmits(['refresh-stats'])

const toast = useToast()
const processId = ref('')
const items = ref([])
const confettiFire = ref(0)

const reload = async () => {
  if (!processId.value) return
  try { items.value = await fetchChecklist(processId.value) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not load checklist') }
}

const CATS = ['HR', 'IT', 'ADMIN', 'FINANCE', 'SECURITY', 'DEPARTMENT']
const catColor = (k) => ({
  HR: '#fbbf24', IT: '#fb923c', ADMIN: '#f59e0b',
  FINANCE: '#34d399', SECURITY: '#f87171', DEPARTMENT: '#c084fc',
})[k] || '#fbbf24'
const catIcon = (k) => ({
  HR: Briefcase, IT: Cpu, ADMIN: Building2, FINANCE: IndianRupee, SECURITY: Shield, DEPARTMENT: GitBranch,
})[k] || Briefcase

const groupedCategories = computed(() =>
  CATS.map(c => {
    const list = items.value.filter(i => i.category === c)
    const done = list.filter(i => i.status === 'COMPLETED' || i.status === 'WAIVED').length
    return {
      key: c, items: list, completed: done,
      percent: list.length ? Math.round((done / list.length) * 100) : 0,
    }
  })
)
const overallDone = computed(() => items.value.filter(i => i.status === 'COMPLETED' || i.status === 'WAIVED').length)
const overallPct = computed(() => items.value.length ? Math.round((overallDone.value / items.value.length) * 100) : 0)

const toggle = async (item) => {
  const wasCompleted = item.status === 'COMPLETED'
  const next = wasCompleted ? 'PENDING' : 'COMPLETED'
  try {
    const updated = await patchChecklistItem(item.id, { status: next })
    const idx = items.value.findIndex(i => i.id === item.id)
    if (idx >= 0) items.value[idx] = updated
    if (!wasCompleted) confettiFire.value = Date.now()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Update failed')
  }
}
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''
</script>

<style scoped>
@import '../../../../styles/onboarding-theme.css';

.onb-checklist { display: flex; flex-direction: column; gap: 16px; }

.chk-banner .banner-divider {
  display: inline-block;
  margin: 0 6px;
  color: var(--hr-text-dim);
  font-weight: 400;
  -webkit-text-fill-color: var(--hr-text-dim);
}

.chk-overview { display: flex; flex-direction: column; gap: 20px; }

/* Summary strip — glass panel */
.chk-strip {
  position: relative;
  display: grid; grid-template-columns: 1.2fr 2fr; gap: 22px;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke);
  border-radius: 22px;
  padding: 22px 24px;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
  overflow: hidden;
  isolation: isolate;
}
.chk-strip::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(70% 100% at 0% 0%, rgba(251, 146, 60, 0.10), transparent 60%);
  pointer-events: none; z-index: -1;
}
.strip-block { display: flex; flex-direction: column; gap: 10px; }
.strip-label { font-size: 10px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--hr-text-muted); }
.strip-row { display: flex; align-items: center; gap: 14px; }
.strip-bar { flex: 1; height: 10px; background: rgba(255, 255, 255, 0.06); border-radius: 999px; overflow: hidden; box-shadow: inset 0 1px 0 rgba(0,0,0,0.25); }
.strip-fill { height: 100%; background: var(--hr-gradient-hero); border-radius: inherit; transition: width 1.2s var(--hr-ease-quint); box-shadow: 0 0 16px rgba(251, 146, 60, 0.55); }
.strip-num {
  font-size: 32px; font-weight: 800; letter-spacing: -0.025em;
  background: linear-gradient(180deg, #fde68a, #fb923c);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  font-variant-numeric: tabular-nums; line-height: 1;
}
.strip-detail { font-size: 11.5px; color: var(--hr-text-muted); }

.strip-cats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; align-self: center; }
.strip-cat {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 10px;
  background: rgba(14, 11, 9, 0.42); border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  transition: border-color .25s var(--hr-spring), transform .25s var(--hr-spring), background .25s var(--hr-spring);
  cursor: pointer;
}
.strip-cat::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(80% 80% at 50% 0%, color-mix(in srgb, var(--accent) 25%, transparent), transparent 70%);
  opacity: 0; transition: opacity .3s var(--hr-spring); pointer-events: none;
}
.strip-cat:hover { border-color: color-mix(in srgb, var(--accent) 45%, transparent); transform: translateY(-3px); background: rgba(20, 16, 12, 0.55); }
.strip-cat:hover::before { opacity: 1; }
.cat-icon {
  width: 30px; height: 30px; border-radius: 9px;
  background: color-mix(in srgb, var(--accent) 22%, transparent); color: var(--accent);
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--accent) 65%, transparent);
}
.strip-cat:hover .cat-icon { animation: onb-icon-pop 0.5s var(--hr-spring); }
.cat-name { font-size: 9.5px; font-weight: 700; letter-spacing: 0.8px; color: var(--hr-text-muted); }
.cat-pct {
  font-size: 18px; font-weight: 800; color: var(--accent);
  font-variant-numeric: tabular-nums; line-height: 1;
}

/* Rails — generous spacing */
.chk-rails { display: flex; flex-direction: column; gap: 16px; }
.chk-rail {
  position: relative;
  display: grid; grid-template-columns: 220px 1fr; gap: 0;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke); border-radius: 22px;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
  overflow: hidden;
  isolation: isolate;
  transition: border-color .3s var(--hr-spring), box-shadow .3s var(--hr-spring);
}
.chk-rail::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: linear-gradient(180deg, transparent, var(--accent), transparent);
  opacity: 0.7;
}
.chk-rail:hover {
  border-color: color-mix(in srgb, var(--accent) 35%, var(--onb-glass-border));
  box-shadow: 0 30px 70px -32px color-mix(in srgb, var(--accent) 40%, transparent);
}
.rail-side {
  position: relative;
  padding: 22px 24px;
  background:
    radial-gradient(80% 80% at 0% 0%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%),
    color-mix(in srgb, var(--accent) 4%, transparent);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex; flex-direction: column; gap: 10px;
  align-items: flex-start;
}
.side-icon {
  width: 32px; height: 32px; border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 26%, transparent); color: var(--accent);
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 24px -10px color-mix(in srgb, var(--accent) 70%, transparent);
}
.side-name { font-size: 12.5px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; color: var(--hr-text); }
.side-pct {
  font-size: 30px; font-weight: 800; letter-spacing: -0.025em; color: var(--accent);
  font-variant-numeric: tabular-nums; line-height: 1;
  filter: drop-shadow(0 0 12px color-mix(in srgb, var(--accent) 50%, transparent));
}
.side-ring {
  position: absolute; right: 18px; bottom: 18px;
  width: 66px; height: 66px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  transition: background 1.2s var(--hr-ease-quint);
  filter: drop-shadow(0 0 16px color-mix(in srgb, var(--accent) 35%, transparent));
}
.side-ring-inner {
  width: 52px; height: 52px; border-radius: 50%;
  background: rgba(14, 14, 16, 0.95);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800; color: var(--hr-text); font-variant-numeric: tabular-nums;
}

.rail-list { list-style: none; margin: 0; padding: 8px 6px; }
.rail-item {
  position: relative;
  display: flex; align-items: center; gap: 16px;
  padding: 14px 22px;
  border-radius: 14px;
  margin: 2px 8px;
  transition: background .25s var(--hr-spring), transform .25s var(--hr-spring);
}
.rail-item::after {
  content: ''; position: absolute; left: 16px; right: 16px; bottom: -1px;
  height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
}
.rail-item:last-child::after { display: none; }
.rail-item:hover { background: rgba(255, 255, 255, 0.04); transform: translateX(4px); }
.rail-item.is-done .rail-item-title {
  color: var(--hr-text-muted);
  text-decoration: line-through;
  text-decoration-color: color-mix(in srgb, var(--accent) 65%, transparent);
  text-decoration-thickness: 2px;
}
.rail-item.is-blocked { background: rgba(248, 113, 113, 0.07); }
.rail-check {
  position: relative;
  width: 28px; height: 28px; border-radius: 9px;
  background: transparent; border: 2px solid rgba(255, 255, 255, 0.16);
  display: inline-flex; align-items: center; justify-content: center;
  color: #1f1408; cursor: pointer;
  transition: background .25s var(--hr-spring), border-color .25s var(--hr-spring), transform .15s var(--hr-spring);
}
.rail-check::before {
  content: ''; position: absolute; inset: -4px; border-radius: 12px;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--accent) 30%, transparent), transparent 70%);
  opacity: 0; transition: opacity .3s var(--hr-spring);
}
.rail-check:hover { border-color: var(--accent); transform: scale(1.08); }
.rail-check:hover::before { opacity: 1; }
.rail-check.is-done {
  background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #fb923c));
  border-color: transparent;
  animation: onb-ripple 1s 1 ease-out;
  box-shadow: 0 6px 20px -6px color-mix(in srgb, var(--accent) 70%, transparent);
}
.rail-item-main { flex: 1; min-width: 0; }
.rail-item-title { font-size: 13.5px; font-weight: 600; color: var(--hr-text); transition: color .25s var(--hr-spring); }
.rail-item-meta {
  display: flex; gap: 14px; flex-wrap: wrap;
  font-size: 11px; color: var(--hr-text-muted); margin-top: 5px;
}
.rail-item-meta > span { display: inline-flex; align-items: center; gap: 5px; }
.rail-must {
  font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 5px;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold);
  border: 1px solid rgba(251, 191, 36, 0.22);
  letter-spacing: 0.5px;
}
.rail-status {
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.5px;
  padding: 4px 10px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.05); color: var(--hr-text-muted);
  border: 1px solid rgba(255,255,255,0.05);
}
.rail-status[data-status="COMPLETED"] { background: rgba(52, 211, 153, 0.18); color: #34d399; border-color: rgba(52, 211, 153, 0.32); }
.rail-status[data-status="BLOCKED"]   { background: rgba(248, 113, 113, 0.18); color: #f87171; border-color: rgba(248, 113, 113, 0.32); }
.rail-status[data-status="IN_PROGRESS"] { background: rgba(251, 146, 60, 0.18); color: #fb923c; border-color: rgba(251, 146, 60, 0.32); }
.rail-empty {
  padding: 22px; text-align: center; font-size: 11.5px; color: var(--hr-text-dim);
}

@media (max-width: 1100px) {
  .chk-strip { grid-template-columns: 1fr; }
  .strip-cats { grid-template-columns: repeat(3, 1fr); }
  .chk-rail { grid-template-columns: 1fr; }
  .rail-side { border-right: 0; border-bottom: 1px solid rgba(255,255,255,0.05); flex-direction: row; align-items: center; justify-content: space-between; }
  .side-ring { position: static; }
}
</style>
