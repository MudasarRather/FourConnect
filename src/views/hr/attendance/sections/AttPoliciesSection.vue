<template>
  <section class="att-pol" data-anim="att-pol">
    <!-- ═══════════════════ HERO BANNER ═══════════════════ -->
    <Motion as="header" class="pol-banner"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <!-- Blueprint grid + ruler marks -->
      <span class="pol-banner-grid" aria-hidden="true" />
      <span class="pol-banner-ruler-top" aria-hidden="true" />
      <span class="pol-banner-ruler-left" aria-hidden="true" />
      <span class="pol-banner-glow" />

      <!-- Stacked rule-sheets + animated stamp -->
      <div class="pol-stack-cluster" aria-hidden="true">
        <div class="pol-sheet pol-sheet-back">
          <span class="pol-sheet-line w1" />
          <span class="pol-sheet-line w2" />
          <span class="pol-sheet-line w3" />
        </div>
        <div class="pol-sheet pol-sheet-mid">
          <span class="pol-sheet-line w1" />
          <span class="pol-sheet-line w2" />
          <span class="pol-sheet-line w3" />
          <span class="pol-sheet-line w4" />
        </div>
        <div class="pol-sheet pol-sheet-front">
          <span class="pol-sheet-header" />
          <span class="pol-sheet-line w1" />
          <span class="pol-sheet-line w2" />
          <span class="pol-sheet-line w3" />
          <span class="pol-sheet-line w4" />
          <span class="pol-sheet-line w5" />
        </div>
        <div class="pol-stamp-wrap">
          <span class="pol-stamp-ring r1" />
          <span class="pol-stamp-ring r2" />
          <span class="pol-stamp-ring r3" />
          <div class="pol-stamp">
            <Stamp :size="22" />
            <span class="pol-stamp-text-top">APPROVED</span>
            <span class="pol-stamp-text-bot">RULE-SET</span>
          </div>
        </div>
      </div>

      <div class="pol-banner-text">
        <span class="pol-eyebrow">
          <span class="pol-eyebrow-dot" />
          {{ filterType ? filterType.replace('_', ' ') + ' rules · Engine-driven' : 'Governance bookshelf · Office · WFH · Shift · OT · Grace' }}
        </span>
        <h2 class="pol-banner-title">
          <span>{{ filterType === 'LATE_RULE' ? 'Late Coming' : 'Attendance' }}</span>
          <span class="pol-banner-divider">·</span>
          <span>{{ filterType === 'LATE_RULE' ? 'Rules' : 'Policies' }}</span>
        </h2>
        <p class="pol-banner-sub">
          {{ filterType === 'LATE_RULE'
              ? 'Late thresholds, half-day cutoffs, and deduction logic that drive every rollup.'
              : 'Free-form JSON rules per policy type — keep them small, composable, and named.' }}
          Active rules feed <strong>every rollup calculation</strong> in real time.
        </p>
      </div>
    </Motion>

    <!-- ═══════════════════ KPI STRIP ═══════════════════ -->
    <div class="pol-kpis">
      <Motion v-for="(t, i) in kpiTiles" :key="t.key" as="article"
        :class="['pol-kpi', `tone-${t.tone}`]"
        :initial="{ opacity: 0, y: 14 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.42, delay: 0.06 * i + 0.1, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3 }"
      >
        <span class="kpi-tape" aria-hidden="true" />
        <span class="kpi-corner-fold" aria-hidden="true" />

        <div class="kpi-head">
          <span class="kpi-eyebrow">
            <component :is="t.icon" :size="11" />
            <span>{{ t.label }}</span>
          </span>
        </div>
        <Motion as="span" class="kpi-num"
          :initial="{ opacity: 0, y: 8 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.18 + 0.06 * i }"
        >{{ t.value }}</Motion>
        <span class="kpi-foot">{{ t.foot }}</span>

        <!-- Capsule meter -->
        <div class="kpi-meter" v-if="t.pct != null">
          <Motion class="kpi-meter-fill"
            :initial="{ scaleX: 0 }"
            :animate="{ scaleX: Math.max(0.03, t.pct / 100) }"
            :transition="{ duration: 0.85, delay: 0.3 + 0.05 * i, ease: [0.22, 1, 0.36, 1] }"
          />
        </div>
      </Motion>
    </div>

    <!-- ═══════════════════ TYPE FILTER STRIP ═══════════════════ -->
    <Motion v-if="!filterType" as="div" class="pol-types"
      :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="pol-types-sweep" aria-hidden="true" />
      <Motion v-for="(t, i) in TYPES" :key="t"
        as="button" type="button"
        class="type-pill" :class="{ active: typeFilter === t }"
        :initial="{ opacity: 0, y: 6, scale: 0.92 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.34, delay: 0.04 * i, ease: [0.34, 1.56, 0.64, 1] }"
        :whileHover="{ y: -2, scale: 1.04 }"
        :whileTap="{ scale: 0.96 }"
        @click="typeFilter = (typeFilter === t ? '' : t); reload()"
      >
        <span class="type-pill-glow" aria-hidden="true" />
        <span class="type-pill-icon"><component :is="iconFor(t)" :size="12" /></span>
        <span class="type-pill-label">{{ t.replace('_', ' ') }}</span>
        <span class="type-count">{{ countByType(t) }}</span>
        <span v-if="typeFilter === t" class="type-pill-active-ring" aria-hidden="true" />
      </Motion>
    </Motion>

    <!-- ═══════════════════ TOOLBAR — refresh + new policy ═══════════════════ -->
    <Motion as="div" class="pol-toolbar"
      :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.32 }"
    >
      <span class="pol-toolbar-meta">
        <FileText :size="11" />
        Showing <strong>{{ rows.length }}</strong> {{ rows.length === 1 ? 'policy' : 'policies' }}
        <span v-if="typeFilter || filterType" class="pol-toolbar-filter-chip">
          <component :is="iconFor(typeFilter || filterType)" :size="10" />
          {{ (typeFilter || filterType).replace('_', ' ') }}
        </span>
      </span>
      <div class="pol-toolbar-right">
        <Motion as="button" class="pol-btn pol-btn-ghost"
          :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.96 }"
          @click="reload"
        >
          <RefreshCw :size="13" />Refresh
        </Motion>
        <Motion as="button" class="pol-btn pol-btn-primary"
          :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.96 }"
          @click="openCreate"
        >
          <Plus :size="13" />New policy
        </Motion>
      </div>
    </Motion>

    <!-- ═══════════════════ POLICY GRID — rule-sheet cards ═══════════════════ -->
    <div class="pol-grid" v-if="rows.length">
      <Motion v-for="(p, i) in rows" :key="p.id" as="article"
        :class="['pol-card', `is-${p.is_active ? 'active' : 'off'}`]"
        :initial="{ opacity: 0, y: 18, scale: 0.94 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.5, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3 }"
      >
        <!-- Paper texture + corner fold -->
        <span class="pol-card-paper" aria-hidden="true" />
        <span class="pol-card-fold" aria-hidden="true" />

        <!-- HEADER: delete (left) · doc ID + type (center) · wax seal (right) -->
        <header class="pol-card-head">
          <button class="pol-card-delete" title="Delete policy" @click.stop="openDelete(p)">
            <Trash2 :size="12" />
          </button>
          <div class="pol-card-id-row">
            <span class="pol-card-id">POL · {{ shortId(p.id, i) }}</span>
            <span class="pol-card-type" :data-type="p.policy_type">
              <component :is="iconFor(p.policy_type)" :size="11" />
              {{ p.policy_type.replace('_', ' ') }}
            </span>
          </div>
          <div :class="['pol-seal', `is-${p.is_active ? 'active' : 'off'}`]" :title="p.is_active ? 'Active rule' : 'Off / archived'">
            <span class="pol-seal-ring" />
            <span class="pol-seal-core">
              <component :is="p.is_active ? ShieldCheck : ShieldOff" :size="14" />
            </span>
            <span class="pol-seal-label">{{ p.is_active ? 'ACTIVE' : 'OFF' }}</span>
          </div>
        </header>

        <!-- NAME + DESC -->
        <h3 class="pol-card-name">{{ p.name }}</h3>
        <p v-if="p.description" class="pol-card-desc">{{ p.description }}</p>

        <!-- RULES CODE BLOCK -->
        <div class="pol-rules" v-if="Object.keys(p.rules || {}).length">
          <div class="pol-rules-head">
            <span class="pol-rules-dot dot-r" />
            <span class="pol-rules-dot dot-y" />
            <span class="pol-rules-dot dot-g" />
            <span class="pol-rules-title">
              <Braces :size="10" />rules.json
            </span>
            <span class="pol-rules-lines">{{ jsonLineCount(p.rules) }} lines</span>
          </div>
          <div class="pol-rules-body">
            <div class="pol-rules-gutter">
              <span v-for="n in jsonLineCount(p.rules)" :key="n">{{ n }}</span>
            </div>
            <pre class="pol-rules-code" v-html="highlightJson(p.rules)"></pre>
          </div>
        </div>

        <!-- EFFECTIVE TIMELINE -->
        <footer class="pol-card-foot">
          <div class="pol-timeline" v-if="p.effective_from || p.effective_until">
            <span class="pol-timeline-stamp">
              <Calendar :size="10" />
              <span class="pol-timeline-label">FROM</span>
              <span class="pol-timeline-date">{{ p.effective_from ? formatDate(p.effective_from) : '—' }}</span>
            </span>
            <span class="pol-timeline-track">
              <span class="pol-timeline-fill" />
            </span>
            <span class="pol-timeline-stamp">
              <span class="pol-timeline-label">UNTIL</span>
              <span class="pol-timeline-date">{{ p.effective_until ? formatDate(p.effective_until) : 'Open' }}</span>
            </span>
          </div>
          <span v-else class="pol-timeline-empty">
            <InfinityIcon :size="10" />Permanent · no expiry
          </span>
        </footer>
      </Motion>
    </div>

    <!-- ═══════════════════ EMPTY STATE ═══════════════════ -->
    <Motion v-else as="div" class="pol-empty"
      :initial="{ opacity: 0, scale: 0.95 }" :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.45 }"
    >
      <span class="pol-empty-aurora" />
      <div class="pol-empty-illustration">
        <span class="pol-empty-grid-bg" aria-hidden="true" />
        <Motion class="pol-empty-book"
          :initial="{ rotate: -3 }" :animate="{ rotate: 3 }"
          :transition="{ duration: 4, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }"
        >
          <component :is="filterType === 'LATE_RULE' ? Clock4 : BookOpenCheck" :size="42" />
        </Motion>
        <span class="pol-empty-ring r1" />
        <span class="pol-empty-ring r2" />
        <span class="pol-empty-ring r3" />
      </div>
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptySub }}</p>
      <Motion as="button" class="pol-btn pol-btn-primary"
        :whileHover="{ y: -1, scale: 1.03 }" :whileTap="{ scale: 0.96 }"
        @click="openCreate"
      >
        <Plus :size="13" />Draft first policy
      </Motion>
      <div class="pol-empty-meta">
        <span class="pol-empty-meta-dot" />Live · drives every rollup
      </div>
    </Motion>

    <!-- ═══════════════════ MODALS ═══════════════════ -->
    <AttDeleteModal
      :open="!!deleteTarget"
      title="Delete policy?"
      subtitle="Active rules referencing this policy will fall back to the global default."
      :target-label="deleteTarget?.name || ''"
      :target-meta="deleteTarget ? (deleteTarget.description || (deleteTarget.policy_type || '').replace('_', ' ')) : ''"
      :target-tag="deleteTarget?.policy_type?.replace('_', ' ') || ''"
      :target-icon="BookOpenCheck"
      :submitting="deleting"
      confirm-label="Delete policy"
      warning="Policies drive rollup calculations. Deleting one may shift on-time stats for past days."
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />

    <OnbModal
      :open="showCreate"
      :title="`New ${form.policy_type.replace('_', ' ').toLowerCase()} policy`"
      subtitle="Rule body is free-form JSON — keep it small, composable, and named."
      :icon="BookOpenCheck"
      :width="600"
      @close="showCreate = false"
    >
      <div class="form-stack">
        <div class="form-grid-2">
          <OnbField v-model="form.name" label="Name" placeholder="e.g. Engineering late rule" required />
          <OnbField v-model="form.policy_type" type="select" label="Policy type" required
            :options="TYPES.map(t => ({ value: t, label: t.replace('_', ' ') }))"
            @update:modelValue="applyTemplate" />
        </div>
        <OnbField v-model="form.description" label="Description" placeholder="Short summary used in the index" />
        <OnbField
          v-model="form.rulesJson"
          type="textarea"
          label="Rules (JSON)"
          placeholder='{ "grace_minutes": 10 }'
          :rows="7"
          required
          full
          hint="Templates are applied on policy-type change. Edit freely afterwards."
        />
      </div>
      <template #footer>
        <button class="pol-btn pol-btn-ghost" @click="showCreate = false">Cancel</button>
        <button class="pol-btn pol-btn-primary" :disabled="!valid" @click="doCreate">
          <Plus :size="13" />Create policy
        </button>
      </template>
    </OnbModal>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, Plus, Calendar, BookOpenCheck, Briefcase, Home, Clock4, TimerReset,
  PartyPopper, Hourglass, Trash2, ShieldCheck, ShieldOff, Stamp, Braces,
  FileText, Layers, Infinity as InfinityIcon,
} from 'lucide-vue-next'
import { fetchPolicies, createPolicy, deletePolicy } from '../composables/useAttendance'
import AttDeleteModal from '../components/AttDeleteModal.vue'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import OnbField from '../../onboarding/components/OnbField.vue'
import { useToast } from 'vue-toastification'

const props = defineProps({
  filterType: { type: String, default: '' },
})
defineEmits(['refresh-stats'])
const toast = useToast()

const TYPES = ['OFFICE', 'WFH', 'SHIFT', 'OVERTIME', 'GRACE', 'HOLIDAY', 'LATE_RULE']
const typeFilter = ref(props.filterType || '')
const allRows = ref([])
const rows = computed(() => typeFilter.value ? allRows.value.filter(r => r.policy_type === typeFilter.value) : allRows.value)

const showCreate = ref(false)
const form = reactive({
  name: '', policy_type: props.filterType || 'GRACE',
  description: '', rulesJson: '{\n  "grace_minutes": 10\n}',
})
const valid = computed(() => !!(form.name && form.policy_type))

const TEMPLATES = {
  GRACE:      '{\n  "grace_minutes": 10\n}',
  LATE_RULE:  '{\n  "late_threshold_min": 15,\n  "half_day_after_min": 30,\n  "deduct_after_count": 3\n}',
  OVERTIME:   '{\n  "min_hours": 1,\n  "max_per_day": 4,\n  "weekend_multiplier": 1.5\n}',
  WFH:        '{\n  "max_per_month": 8,\n  "requires_pre_approval": true\n}',
  HOLIDAY:    '{\n  "carry_forward": false\n}',
  SHIFT:      '{\n  "rotate_every_days": 7\n}',
  OFFICE:     '{\n  "weekly_office_days": 3\n}',
}
const applyTemplate = () => { form.rulesJson = TEMPLATES[form.policy_type] || '{}' }

watch(() => props.filterType, (v) => {
  typeFilter.value = v || ''
  form.policy_type = v || 'GRACE'
  applyTemplate()
})

// ── KPIs ──────────────────────────────────────────────────────────────
const totalCount   = computed(() => allRows.value.length)
const activeCount  = computed(() => allRows.value.filter(r => r.is_active).length)
const offCount     = computed(() => allRows.value.filter(r => !r.is_active).length)
const typesCovered = computed(() => new Set(allRows.value.map(r => r.policy_type)).size)

const safePct = (n, base) => !base ? 0 : Math.round((n / base) * 100)

const kpiTiles = computed(() => [
  {
    key: 'total', label: 'TOTAL POLICIES', icon: Layers, tone: 'gold',
    value: totalCount.value,
    foot: totalCount.value === 1 ? '1 rule on file' : `${totalCount.value} rules on file`,
    pct: 100,
  },
  {
    key: 'active', label: 'ACTIVE RULES', icon: ShieldCheck, tone: 'teal',
    value: activeCount.value,
    foot: activeCount.value === 1 ? 'driving rollups' : 'driving every rollup',
    pct: safePct(activeCount.value, totalCount.value),
  },
  {
    key: 'off', label: 'OFF / ARCHIVED', icon: ShieldOff, tone: 'slate',
    value: offCount.value,
    foot: offCount.value === 0 ? 'all engaged' : 'not engaged',
    pct: safePct(offCount.value, totalCount.value),
  },
  {
    key: 'types', label: 'TYPES COVERED', icon: BookOpenCheck, tone: 'orange',
    value: typesCovered.value,
    foot: `${typesCovered.value} of ${TYPES.length} categories`,
    pct: safePct(typesCovered.value, TYPES.length),
  },
])

const emptyTitle = computed(() => {
  if (props.filterType === 'LATE_RULE') return 'No late-coming rules defined yet'
  if (typeFilter.value) return `No ${typeFilter.value.replace('_', ' ').toLowerCase()} policies defined yet`
  return 'No policies defined yet'
})
const emptySub = computed(() => {
  if (props.filterType === 'LATE_RULE') return 'Late thresholds, half-day cutoffs and deduction logic live here. Create your first rule so the rollup has something to apply.'
  return 'Free-form JSON rules per policy type — keep them small, composable, and named. Active rules drive every rollup calculation.'
})

const reload = async () => {
  try {
    const data = await fetchPolicies({ limit: 100, ...(typeFilter.value ? { policy_type: typeFilter.value } : {}) })
    allRows.value = data.items || []
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load policies') }
}
onMounted(() => { applyTemplate(); reload() })

const openCreate = () => {
  Object.assign(form, {
    name: '',
    policy_type: props.filterType || typeFilter.value || 'GRACE',
    description: '',
  })
  applyTemplate()
  showCreate.value = true
}

const doCreate = async () => {
  let rules = {}
  try { rules = JSON.parse(form.rulesJson || '{}') }
  catch { toast.error('Invalid JSON in rules'); return }
  try {
    await createPolicy({
      name: form.name,
      policy_type: form.policy_type,
      description: form.description || null,
      rules,
      applicable_department_ids: [],
      applicable_shift_ids: [],
    })
    toast.success('Policy created')
    showCreate.value = false
    reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not create policy') }
}

const deleteTarget = ref(null)
const deleting = ref(false)
const openDelete = (p) => { deleteTarget.value = p }
const confirmDelete = async (reason) => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deletePolicy(deleteTarget.value.id, reason)
    toast.success(`Policy "${deleteTarget.value.name}" deleted`)
    deleteTarget.value = null
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not delete policy')
  } finally {
    deleting.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────
const countByType = (t) => allRows.value.filter(r => r.policy_type === t).length
const iconFor = (t) => ({
  OFFICE: Briefcase, WFH: Home, SHIFT: Clock4, OVERTIME: TimerReset,
  GRACE: Hourglass, HOLIDAY: PartyPopper, LATE_RULE: Clock4,
}[t] || BookOpenCheck)
const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

const shortId = (id, i) => {
  if (!id) return String(i + 1).padStart(3, '0')
  const s = String(id).replace(/-/g, '').toUpperCase()
  return s.slice(-4) || String(i + 1).padStart(3, '0')
}

const jsonLineCount = (rules) => {
  try { return JSON.stringify(rules || {}, null, 2).split('\n').length } catch { return 1 }
}

// Lightweight inline JSON syntax highlighter. Wraps keys, strings, numbers,
// booleans, and nulls in tone-specific spans without pulling in a full
// highlighting library. Falls back to raw text on parse errors.
const escapeHtml = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

const highlightJson = (rules) => {
  let raw
  try { raw = JSON.stringify(rules || {}, null, 2) } catch { return '' }
  raw = escapeHtml(raw)
  return raw.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'pol-tok-num'
      if (/^"/.test(match)) cls = /:$/.test(match) ? 'pol-tok-key' : 'pol-tok-str'
      else if (/true|false/.test(match)) cls = 'pol-tok-bool'
      else if (/null/.test(match)) cls = 'pol-tok-null'
      return `<span class="${cls}">${match}</span>`
    }
  )
}
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-pol { display: flex; flex-direction: column; gap: 16px; padding-top: 18px; }

/* ═══════════════════════════════════════════════════════════════════════
   HERO BANNER — blueprint grid + stacked rule-sheets + animated stamp
   ═══════════════════════════════════════════════════════════════════════ */
.pol-banner {
  position: relative; overflow: hidden;
  padding: 26px 28px;
  border-radius: 22px;
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(251, 191, 36, 0.18), transparent 65%),
    radial-gradient(120% 110% at 0% 110%, rgba(234, 88, 12, 0.12), transparent 70%),
    var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.45);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 22px 60px -32px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  display: block;
  isolation: isolate;
}
[data-theme="light"] .pol-banner {
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(217, 119, 6, 0.16), transparent 65%),
    radial-gradient(120% 110% at 0% 110%, rgba(194, 65, 12, 0.12), transparent 70%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.42);
  box-shadow:
    0 22px 50px -28px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

/* Blueprint grid */
.pol-banner-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(251, 191, 36, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251, 191, 36, 0.06) 1px, transparent 1px);
  background-size: 24px 24px;
  background-position: 0 0;
  z-index: 0; pointer-events: none;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.55));
}
[data-theme="light"] .pol-banner-grid {
  background-image:
    linear-gradient(rgba(180, 83, 9, 0.10) 1px, transparent 1px),
    linear-gradient(90deg, rgba(180, 83, 9, 0.10) 1px, transparent 1px);
}
/* Ruler ticks */
.pol-banner-ruler-top {
  position: absolute; top: 0; left: 24px; right: 24px; height: 12px;
  background-image: linear-gradient(90deg, rgba(251, 191, 36, 0.55) 1px, transparent 1px);
  background-size: 24px 100%;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.7), transparent);
  z-index: 0; pointer-events: none;
}
.pol-banner-ruler-left {
  position: absolute; left: 0; top: 24px; bottom: 24px; width: 12px;
  background-image: linear-gradient(0deg, rgba(251, 191, 36, 0.55) 1px, transparent 1px);
  background-size: 100% 24px;
  mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.7), transparent);
  z-index: 0; pointer-events: none;
}
[data-theme="light"] .pol-banner-ruler-top { background-image: linear-gradient(90deg, rgba(180, 83, 9, 0.55) 1px, transparent 1px); }
[data-theme="light"] .pol-banner-ruler-left { background-image: linear-gradient(0deg, rgba(180, 83, 9, 0.55) 1px, transparent 1px); }

.pol-banner-glow {
  position: absolute; inset: -50% -10% auto auto;
  width: 60%; height: 240%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.22), transparent 60%);
  filter: blur(60px);
  z-index: 0; pointer-events: none;
  animation: att-aurora 14s ease-in-out infinite;
}

/* Stacked rule-sheets + stamp on the right */
.pol-stack-cluster {
  position: absolute;
  top: 50%; right: 36px;
  transform: translateY(-50%);
  width: 220px; height: 170px;
  z-index: 1; pointer-events: none;
}
.pol-sheet {
  position: absolute;
  width: 110px; height: 140px;
  border-radius: 8px;
  background: linear-gradient(165deg, rgba(254, 243, 199, 0.96) 0%, rgba(254, 230, 138, 0.86) 100%);
  border: 1px solid rgba(180, 83, 9, 0.42);
  box-shadow: 0 12px 28px -10px rgba(120, 53, 15, 0.55);
  padding: 14px 12px 10px;
  display: flex; flex-direction: column; gap: 6px;
}
[data-theme="light"] .pol-sheet {
  background: linear-gradient(165deg, #fff 0%, rgba(254, 243, 199, 0.85) 100%);
  border-color: rgba(180, 83, 9, 0.55);
  box-shadow: 0 12px 28px -10px rgba(120, 53, 15, 0.30);
}
.pol-sheet-back {
  top: 14px; left: 10px;
  transform: rotate(-9deg);
  opacity: 0.70;
  animation: pol-sheet-bob-a 7s ease-in-out infinite;
}
.pol-sheet-mid {
  top: 8px; left: 46px;
  transform: rotate(3deg);
  opacity: 0.85;
  animation: pol-sheet-bob-b 6s ease-in-out infinite;
}
.pol-sheet-front {
  top: 2px; left: 88px;
  transform: rotate(-2deg);
  z-index: 2;
  animation: pol-sheet-bob-c 5s ease-in-out infinite;
}
@keyframes pol-sheet-bob-a {
  0%, 100% { transform: rotate(-9deg) translateY(0); }
  50%      { transform: rotate(-11deg) translateY(-3px); }
}
@keyframes pol-sheet-bob-b {
  0%, 100% { transform: rotate(3deg) translateY(0); }
  50%      { transform: rotate(5deg) translateY(-4px); }
}
@keyframes pol-sheet-bob-c {
  0%, 100% { transform: rotate(-2deg) translateY(0); }
  50%      { transform: rotate(-4deg) translateY(-3px); }
}
.pol-sheet-header {
  display: block; width: 60%; height: 8px;
  border-radius: 3px;
  background: linear-gradient(90deg, #d97706, #fbbf24);
  margin-bottom: 3px;
}
.pol-sheet-line {
  display: block; height: 5px; border-radius: 3px;
  background: rgba(120, 53, 15, 0.32);
}
.pol-sheet-line.w1 { width: 85%; }
.pol-sheet-line.w2 { width: 70%; }
.pol-sheet-line.w3 { width: 90%; }
.pol-sheet-line.w4 { width: 55%; }
.pol-sheet-line.w5 { width: 80%; }

/* Stamp with concentric rings */
.pol-stamp-wrap {
  position: absolute;
  right: -8px; bottom: -6px;
  width: 88px; height: 88px;
  z-index: 3;
  display: flex; align-items: center; justify-content: center;
}
.pol-stamp-ring {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 1.5px solid rgba(220, 38, 38, 0.65);
  transform: scale(1);
  opacity: 0;
  animation: pol-stamp-ring 3.2s ease-out infinite;
}
.pol-stamp-ring.r1 { animation-delay: 0s; }
.pol-stamp-ring.r2 { animation-delay: 1.1s; }
.pol-stamp-ring.r3 { animation-delay: 2.2s; }
@keyframes pol-stamp-ring {
  0%   { transform: scale(0.65); opacity: 0.85; }
  100% { transform: scale(1.45); opacity: 0; }
}
.pol-stamp {
  position: relative;
  width: 64px; height: 64px;
  border-radius: 50%;
  border: 2.5px solid #b91c1c;
  background:
    radial-gradient(closest-side, rgba(254, 226, 226, 0.20), transparent 70%),
    rgba(127, 29, 29, 0.05);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: #b91c1c;
  font-family: var(--hr-mono);
  text-shadow: 0 1px 0 rgba(127, 29, 29, 0.35);
  filter: drop-shadow(0 4px 10px rgba(185, 28, 28, 0.40));
  animation: pol-stamp-press 4.8s ease-in-out infinite;
  transform-origin: center;
}
[data-theme="light"] .pol-stamp {
  background: radial-gradient(closest-side, rgba(254, 226, 226, 0.55), rgba(254, 226, 226, 0.10) 70%);
  filter: drop-shadow(0 4px 10px rgba(185, 28, 28, 0.30));
}
@keyframes pol-stamp-press {
  0%, 80%, 100% { transform: rotate(-8deg) scale(1); }
  85%           { transform: rotate(-8deg) scale(0.90); }
  90%           { transform: rotate(-8deg) scale(1.08); }
  95%           { transform: rotate(-8deg) scale(0.97); }
}
.pol-stamp-text-top, .pol-stamp-text-bot {
  font-size: 6.5px; font-weight: 900; letter-spacing: 1.4px;
  position: absolute;
}
.pol-stamp-text-top { top: 6px; }
.pol-stamp-text-bot { bottom: 6px; }
.pol-stamp svg { z-index: 1; }

.pol-banner-text { position: relative; z-index: 2; min-width: 0; padding-right: 240px; }
.pol-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; letter-spacing: 1.7px; text-transform: uppercase;
  font-weight: 800;
  color: #fcd34d;
}
[data-theme="light"] .pol-eyebrow { color: #b45309; }
.pol-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.7);
  animation: att-live-pulse 2.5s ease-in-out infinite;
}
[data-theme="light"] .pol-eyebrow-dot { background: #d97706; box-shadow: 0 0 6px rgba(217, 119, 6, 0.55); }

.pol-banner-title {
  margin: 6px 0 4px;
  font-size: 28px; font-weight: 900; letter-spacing: -0.5px;
  display: flex; align-items: baseline; gap: 12px;
  background: linear-gradient(110deg, #fde68a 0%, #fbbf24 30%, #fb923c 60%, #fde68a 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: pol-title-shimmer 8s ease-in-out infinite;
}
[data-theme="light"] .pol-banner-title {
  background: linear-gradient(110deg, #b45309 0%, #d97706 30%, #c2410c 60%, #b45309 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
}
@keyframes pol-title-shimmer {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.pol-banner-divider { -webkit-text-fill-color: var(--hr-text-dim); color: var(--hr-text-dim); font-weight: 400; }
.pol-banner-sub {
  margin: 0;
  font-size: 12.5px; line-height: 1.5;
  color: var(--hr-text-muted);
  max-width: 560px;
}
.pol-banner-sub strong { color: #fcd34d; font-weight: 700; }
[data-theme="light"] .pol-banner-sub strong { color: #b45309; }

/* ═══════════════════════════════════════════════════════════════════════
   KPI STRIP — index-card style w/ corner fold + masking tape
   ═══════════════════════════════════════════════════════════════════════ */
.pol-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}
.pol-kpi {
  position: relative;
  padding: 16px 18px 14px;
  border-radius: 16px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 8px 22px -14px rgba(0, 0, 0, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  isolation: isolate;
  overflow: hidden;
  transition: border-color .3s, box-shadow .3s, transform .25s;
}
[data-theme="light"] .pol-kpi {
  border-color: rgba(180, 83, 9, 0.40);
  background: rgba(255, 250, 240, 0.92);
  box-shadow:
    0 8px 22px -14px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
}
.pol-kpi:hover {
  border-color: rgba(251, 191, 36, 0.75);
  box-shadow: 0 18px 36px -18px rgba(234, 88, 12, 0.42);
}
[data-theme="light"] .pol-kpi:hover {
  border-color: rgba(180, 83, 9, 0.65);
  box-shadow: 0 18px 36px -18px rgba(180, 83, 9, 0.30);
}

/* "Masking tape" strip across the top — looks like a sticky note pinned to the card */
.kpi-tape {
  position: absolute; top: -8px; left: 24px;
  width: 60px; height: 18px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.45), rgba(234, 88, 12, 0.35));
  border-radius: 2px;
  transform: rotate(-3deg);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
  z-index: 2;
}
[data-theme="light"] .kpi-tape {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.65), rgba(234, 88, 12, 0.45));
  box-shadow: 0 2px 4px rgba(120, 53, 15, 0.20);
}
.pol-kpi:hover .kpi-tape { transform: rotate(-1deg) translateY(-2px); transition: transform .4s var(--att-spring); }

/* Folded corner (top-right) */
.kpi-corner-fold {
  position: absolute; top: 0; right: 0;
  width: 26px; height: 26px;
  background: linear-gradient(225deg, rgba(251, 146, 60, 0.40) 0%, rgba(251, 146, 60, 0.40) 50%, transparent 50%);
  border-bottom-left-radius: 6px;
  box-shadow: -2px 2px 4px rgba(0, 0, 0, 0.20);
}
[data-theme="light"] .kpi-corner-fold {
  background: linear-gradient(225deg, rgba(254, 230, 138, 0.95) 0%, rgba(251, 191, 36, 0.75) 50%, transparent 50%);
  box-shadow: -2px 2px 4px rgba(120, 53, 15, 0.20);
}

.kpi-head { display: flex; align-items: center; padding-top: 8px; }
.kpi-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; letter-spacing: 1.4px; text-transform: uppercase;
  font-weight: 800;
  color: var(--hr-text-muted);
}
[data-theme="light"] .kpi-eyebrow { color: #6b5840; }
.kpi-num {
  display: block;
  margin: 8px 0 3px;
  font-size: 30px; font-weight: 900;
  letter-spacing: -0.5px;
  color: var(--accent, var(--hr-text));
  font-variant-numeric: tabular-nums;
  line-height: 1.05;
  text-shadow: 0 2px 18px var(--accent-glow, rgba(251, 191, 36, 0.20));
}
[data-theme="light"] .kpi-num { color: var(--accent-light, var(--hr-text)); text-shadow: none; }
.kpi-foot { display: block; font-size: 10px; color: var(--hr-text-muted); font-weight: 600; letter-spacing: 0.3px; }

.kpi-meter {
  margin-top: 10px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(251, 191, 36, 0.16);
  overflow: hidden;
}
[data-theme="light"] .kpi-meter { background: rgba(255, 250, 240, 0.75); border-color: rgba(180, 83, 9, 0.18); }
.kpi-meter-fill {
  display: block; height: 100%;
  background: linear-gradient(90deg, var(--accent, #fbbf24), var(--accent-light, #d97706));
  border-radius: 999px;
  transform-origin: left center;
  box-shadow: 0 0 8px var(--accent-glow, rgba(251, 191, 36, 0.45));
}

.tone-gold   { --accent: #fbbf24; --accent-light: #d97706; --accent-glow: rgba(251, 191, 36, 0.32); }
.tone-teal   { --accent: #10b981; --accent-light: #047857; --accent-glow: rgba(16, 185, 129, 0.30); }
.tone-slate  { --accent: #94a3b8; --accent-light: #475569; --accent-glow: rgba(148, 163, 184, 0.26); }
.tone-orange { --accent: #fb923c; --accent-light: #c2410c; --accent-glow: rgba(234, 88, 12, 0.30); }

/* ═══════════════════════════════════════════════════════════════════════
   TYPE FILTER STRIP — preserved from the existing design
   ═══════════════════════════════════════════════════════════════════════ */
.pol-types {
  position: relative;
  display: flex; flex-wrap: wrap; gap: 8px;
  padding: 10px 12px;
  border-radius: 16px;
  background:
    radial-gradient(80% 60% at 0% 0%, rgba(251, 191, 36, 0.10), transparent 60%),
    radial-gradient(80% 60% at 100% 100%, rgba(251, 146, 60, 0.08), transparent 60%),
    linear-gradient(180deg, rgba(28, 22, 18, 0.65), rgba(20, 16, 14, 0.85));
  border: 1px solid rgba(251, 191, 36, 0.42);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 18px 36px -22px rgba(0, 0, 0, 0.55);
  overflow: hidden;
  isolation: isolate;
}
[data-theme="light"] .pol-types {
  background:
    radial-gradient(80% 60% at 0% 0%, rgba(217, 119, 6, 0.12), transparent 60%),
    radial-gradient(80% 60% at 100% 100%, rgba(194, 65, 12, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 246, 226, 0.90));
  border-color: rgba(180, 83, 9, 0.42);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.65),
    0 12px 26px -18px rgba(120, 53, 15, 0.20);
}
.pol-types-sweep {
  position: absolute; inset: 0;
  pointer-events: none; z-index: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(251, 191, 36, 0.14) 50%, transparent 70%);
  background-size: 250% 100%;
  background-position: -50% 0;
  animation: pol-types-sweep 6s ease-in-out infinite;
  mix-blend-mode: screen;
}
@keyframes pol-types-sweep {
  0%, 100% { background-position: -60% 0; opacity: 0.4; }
  50%      { background-position: 160% 0; opacity: 0.9; }
}
[data-theme="light"] .pol-types-sweep {
  background: linear-gradient(115deg, transparent 30%, rgba(217, 119, 6, 0.18) 50%, transparent 70%);
  background-size: 250% 100%;
  mix-blend-mode: multiply;
}

.type-pill {
  position: relative; isolation: isolate;
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 14px;
  border-radius: 999px;
  background: rgba(20, 16, 14, 0.55);
  border: 1px solid rgba(251, 191, 36, 0.32);
  color: var(--hr-text-secondary);
  font: inherit; font-size: 11px; font-weight: 800;
  letter-spacing: 0.5px; text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: border-color .25s var(--att-spring), background .25s, color .22s, box-shadow .28s;
  z-index: 1;
}
.type-pill-glow {
  position: absolute; inset: 0;
  border-radius: 999px;
  background: radial-gradient(60% 80% at 50% 100%, rgba(251, 146, 60, 0), transparent 70%);
  pointer-events: none;
  transition: background .35s var(--att-spring);
  z-index: -1;
}
.type-pill:hover {
  color: #fde68a;
  border-color: rgba(251, 146, 60, 0.65);
  background: rgba(28, 22, 18, 0.85);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.10), 0 12px 24px -10px rgba(251, 146, 60, 0.45);
}
.type-pill:hover .type-pill-glow {
  background: radial-gradient(60% 90% at 50% 110%, rgba(251, 146, 60, 0.32), transparent 70%);
}
.type-pill.active {
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 35%, #f59e0b 70%, #fb923c 100%);
  color: #1f1408;
  border-color: rgba(217, 119, 6, 0.65);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.50), 0 12px 26px -10px rgba(234, 88, 12, 0.50);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.30);
}
.type-pill.active .type-pill-icon { color: #1f1408; }
.type-pill-active-ring {
  position: absolute; inset: -4px;
  border-radius: 999px;
  border: 1px solid rgba(251, 146, 60, 0.65);
  opacity: 0;
  pointer-events: none;
  animation: type-pill-ring 2.4s ease-out infinite;
}
@keyframes type-pill-ring {
  0%   { opacity: 0.85; transform: scale(1); }
  100% { opacity: 0;    transform: scale(1.20); }
}
.type-pill-icon {
  width: 16px; height: 16px;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fcd34d;
  transition: color .22s, transform .25s var(--att-spring);
}
.type-pill:hover .type-pill-icon { transform: rotate(-6deg) scale(1.1); color: #fde68a; }
.type-pill-label { font-family: var(--hr-mono); }
.type-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; padding: 0 6px; height: 16px;
  border-radius: 999px;
  font-size: 9.5px; font-weight: 800;
  background: rgba(255, 255, 255, 0.08);
  color: var(--hr-text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.type-pill.active .type-count {
  background: rgba(31, 20, 8, 0.20);
  color: #1f1408;
  border-color: rgba(31, 20, 8, 0.30);
}
[data-theme="light"] .type-pill {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.32);
  color: #6b5840;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}
[data-theme="light"] .type-pill:hover {
  color: #1f1408;
  border-color: rgba(194, 65, 12, 0.65);
  background: rgba(255, 250, 240, 0.98);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.80), 0 12px 24px -10px rgba(180, 83, 9, 0.30);
}
[data-theme="light"] .type-pill:hover .type-pill-glow {
  background: radial-gradient(60% 90% at 50% 110%, rgba(217, 119, 6, 0.30), transparent 70%);
}
[data-theme="light"] .type-pill.active {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #ea580c 75%, #c2410c 100%);
  color: #fff;
  border-color: rgba(180, 83, 9, 0.65);
  text-shadow: 0 1px 0 rgba(120, 53, 15, 0.45);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.40), 0 12px 26px -10px rgba(180, 83, 9, 0.50);
}
[data-theme="light"] .type-pill.active .type-pill-icon { color: #fff; }
[data-theme="light"] .type-pill-active-ring { border-color: rgba(194, 65, 12, 0.65); }
[data-theme="light"] .type-pill-icon { color: #b45309; }
[data-theme="light"] .type-count {
  background: rgba(180, 83, 9, 0.10);
  border-color: rgba(180, 83, 9, 0.18);
  color: #6b5840;
}
[data-theme="light"] .type-pill.active .type-count {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.35);
}
@media (prefers-reduced-motion: reduce) {
  .pol-types-sweep,
  .type-pill-active-ring { animation: none !important; }
}

/* ═══════════════════════════════════════════════════════════════════════
   TOOLBAR — refresh + new policy
   ═══════════════════════════════════════════════════════════════════════ */
.pol-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 6px 16px -14px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
[data-theme="light"] .pol-toolbar {
  border-color: rgba(180, 83, 9, 0.40);
  background: rgba(255, 250, 240, 0.85);
  box-shadow:
    0 6px 16px -14px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.pol-toolbar-meta {
  display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 11px; font-weight: 700; letter-spacing: 0.3px;
  color: var(--hr-text-muted); text-transform: uppercase;
}
.pol-toolbar-meta strong { color: #fcd34d; font-weight: 800; }
.pol-toolbar-meta svg { color: #fcd34d; }
[data-theme="light"] .pol-toolbar-meta strong { color: #b45309; }
[data-theme="light"] .pol-toolbar-meta svg { color: #b45309; }
.pol-toolbar-filter-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.45);
  color: #fcd34d;
  font-size: 9.5px;
}
[data-theme="light"] .pol-toolbar-filter-chip {
  background: rgba(251, 191, 36, 0.20);
  border-color: rgba(180, 83, 9, 0.45);
  color: #b45309;
}
.pol-toolbar-right { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.pol-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px;
  border-radius: 10px;
  font: inherit; font-size: 11.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s, box-shadow .25s, transform .2s;
}
.pol-btn-primary {
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #f59e0b 100%);
  background-size: 200% 200%;
  color: #1f1408;
  border-color: rgba(217, 119, 6, 0.55);
  box-shadow: 0 8px 20px -10px rgba(217, 119, 6, 0.60);
}
.pol-btn-primary:hover:not(:disabled) {
  background-position: 100% 50%;
  box-shadow: 0 14px 30px -10px rgba(217, 119, 6, 0.75);
}
.pol-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
[data-theme="light"] .pol-btn-primary {
  background: linear-gradient(135deg, #fbbf24, #d97706 50%, #c2410c);
  background-size: 200% 200%;
  color: #fff;
  border-color: rgba(180, 83, 9, 0.65);
}
.pol-btn-ghost {
  background: rgba(255, 255, 255, 0.04);
  color: var(--hr-text-secondary);
  border-color: rgba(251, 191, 36, 0.32);
}
.pol-btn-ghost:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.10);
  border-color: rgba(251, 191, 36, 0.55);
  color: var(--hr-text);
}
[data-theme="light"] .pol-btn-ghost {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(180, 83, 9, 0.32);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .pol-btn-ghost:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(180, 83, 9, 0.55);
  color: var(--hr-text);
}

/* ═══════════════════════════════════════════════════════════════════════
   POLICY GRID — rule-sheet cards
   ═══════════════════════════════════════════════════════════════════════ */
.pol-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}
.pol-card {
  position: relative;
  padding: 16px 20px 16px 22px;
  border-radius: 18px;
  background:
    linear-gradient(165deg, rgba(28, 22, 18, 0.85), rgba(20, 16, 14, 0.95));
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 12px 32px -18px rgba(0, 0, 0, 0.50),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  isolation: isolate;
  overflow: hidden;
  transition: border-color .3s, box-shadow .3s, transform .25s;
  display: flex; flex-direction: column; gap: 8px;
}
[data-theme="light"] .pol-card {
  background:
    linear-gradient(165deg, rgba(255, 250, 240, 0.96), rgba(254, 243, 199, 0.55));
  border-color: rgba(180, 83, 9, 0.42);
  box-shadow:
    0 12px 32px -18px rgba(40, 25, 10, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
}
.pol-card:hover {
  border-color: rgba(251, 191, 36, 0.75);
  box-shadow: 0 22px 44px -22px rgba(234, 88, 12, 0.45);
}
[data-theme="light"] .pol-card:hover {
  border-color: rgba(180, 83, 9, 0.65);
  box-shadow: 0 22px 44px -22px rgba(180, 83, 9, 0.30);
}
.pol-card.is-active { border-left: 4px solid #10b981; }
.pol-card.is-off    { border-left: 4px solid #64748b; }

/* Paper-texture overlay (horizontal lines) */
.pol-card-paper {
  position: absolute; inset: 0;
  background-image: repeating-linear-gradient(
    180deg,
    transparent 0px,
    transparent 23px,
    rgba(251, 191, 36, 0.05) 24px
  );
  pointer-events: none;
  z-index: 0;
  opacity: 0.7;
}
[data-theme="light"] .pol-card-paper {
  background-image: repeating-linear-gradient(
    180deg,
    transparent 0px,
    transparent 23px,
    rgba(180, 83, 9, 0.10) 24px
  );
}
.pol-card > *:not(.pol-card-paper):not(.pol-card-fold) { position: relative; z-index: 1; }

/* Corner fold (top-right) */
.pol-card-fold {
  position: absolute; top: 0; right: 0;
  width: 30px; height: 30px;
  background: linear-gradient(225deg, rgba(251, 146, 60, 0.45) 0%, rgba(251, 146, 60, 0.45) 50%, transparent 50%);
  border-bottom-left-radius: 8px;
  box-shadow: -2px 2px 4px rgba(0, 0, 0, 0.20);
  z-index: 2;
  transition: transform .35s var(--att-spring);
}
.pol-card:hover .pol-card-fold {
  transform: scale(1.18);
}
[data-theme="light"] .pol-card-fold {
  background: linear-gradient(225deg, rgba(254, 230, 138, 0.95) 0%, rgba(251, 191, 36, 0.70) 50%, transparent 50%);
  box-shadow: -2px 2px 4px rgba(120, 53, 15, 0.18);
}

/* Delete — flex child inside the head (NOT absolute). Flex layout is the
   single source of truth for the head row so the three pieces — delete on
   the left, id/type in the middle, wax seal on the right — never collide. */
.pol-card-delete {
  flex: 0 0 auto;
  width: 28px; height: 28px;
  border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(220, 38, 38, 0.40);
  color: rgba(252, 165, 165, 0.78);
  cursor: pointer;
  opacity: 0.85;
  transition: opacity .22s, transform .22s, background .2s, color .2s, border-color .2s, box-shadow .22s;
}
.pol-card:hover .pol-card-delete { opacity: 1; }
.pol-card-delete:hover,
.pol-card-delete:focus-visible {
  background: rgba(220, 38, 38, 0.22);
  color: #fca5a5;
  border-color: rgba(220, 38, 38, 0.70);
  transform: scale(1.06);
  box-shadow: 0 8px 18px -8px rgba(220, 38, 38, 0.55);
  outline: none;
}
[data-theme="light"] .pol-card-delete {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(220, 38, 38, 0.40);
  color: rgba(127, 29, 29, 0.80);
}
[data-theme="light"] .pol-card-delete:hover,
[data-theme="light"] .pol-card-delete:focus-visible {
  background: rgba(220, 38, 38, 0.16);
  color: #7f1d1d;
  border-color: rgba(220, 38, 38, 0.65);
  box-shadow: 0 8px 18px -8px rgba(185, 28, 28, 0.40);
}

/* Wax seal — flex child on the right side of the head row. position:relative
   so the decorative ring (which uses left:50%) anchors to the seal itself. */
.pol-seal {
  position: relative;
  flex: 0 0 auto;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  pointer-events: none;
}
.pol-seal-ring {
  position: absolute;
  top: -3px; left: 50%;
  transform: translateX(-50%);
  width: 34px; height: 34px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  opacity: 0.40;
}
.pol-seal-core {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff;
  position: relative;
}
.pol-seal.is-active {
  color: #10b981;
}
.pol-seal.is-active .pol-seal-core {
  background: radial-gradient(circle at 35% 35%, #34d399, #047857 80%);
  box-shadow:
    0 0 12px rgba(16, 185, 129, 0.60),
    inset 0 -2px 4px rgba(2, 44, 34, 0.4),
    inset 0 2px 4px rgba(255, 255, 255, 0.35);
  animation: pol-seal-glow 3s ease-in-out infinite;
}
.pol-seal.is-off {
  color: #94a3b8;
}
.pol-seal.is-off .pol-seal-core {
  background: radial-gradient(circle at 35% 35%, #cbd5e1, #475569 80%);
  box-shadow:
    0 0 6px rgba(100, 116, 139, 0.45),
    inset 0 -2px 4px rgba(15, 23, 42, 0.4),
    inset 0 2px 4px rgba(255, 255, 255, 0.25);
  opacity: 0.85;
}
@keyframes pol-seal-glow {
  0%, 100% { box-shadow:
    0 0 12px rgba(16, 185, 129, 0.60),
    inset 0 -2px 4px rgba(2, 44, 34, 0.4),
    inset 0 2px 4px rgba(255, 255, 255, 0.35); }
  50%      { box-shadow:
    0 0 18px rgba(16, 185, 129, 0.85),
    inset 0 -2px 4px rgba(2, 44, 34, 0.4),
    inset 0 2px 4px rgba(255, 255, 255, 0.45); }
}
.pol-seal-label {
  font-family: var(--hr-mono);
  font-size: 7.5px; font-weight: 900; letter-spacing: 1.2px;
  color: currentColor;
}
[data-theme="light"] .pol-seal.is-active { color: #047857; }
[data-theme="light"] .pol-seal.is-off { color: #475569; }

/* Header — three flex sections: [delete][id+type][seal]. padding-right
   leaves room for the decorative corner fold pinned to the very top-right. */
.pol-card-head {
  display: flex; align-items: center; gap: 12px;
  padding-right: 36px;
  min-height: 44px;
}
.pol-card-id-row {
  flex: 1 1 auto;
  min-width: 0;
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.pol-card-id {
  font-family: var(--hr-mono);
  font-size: 9px; font-weight: 800; letter-spacing: 1.4px;
  color: var(--hr-text-muted);
  padding: 2px 8px;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px dashed rgba(251, 191, 36, 0.32);
}
[data-theme="light"] .pol-card-id {
  color: #6b5840;
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(180, 83, 9, 0.32);
}
.pol-card-type {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--hr-mono);
  font-size: 10px; font-weight: 800; letter-spacing: 1.2px;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 6px;
  background: rgba(251, 191, 36, 0.14);
  color: #fcd34d;
  border: 1px solid rgba(251, 191, 36, 0.45);
}
[data-theme="light"] .pol-card-type {
  background: rgba(251, 191, 36, 0.22);
  color: #b45309;
  border-color: rgba(180, 83, 9, 0.45);
}

.pol-card-name {
  margin: 6px 0 0;
  font-size: 16px; font-weight: 800; color: var(--hr-text);
  letter-spacing: -0.15px;
}
.pol-card-desc {
  margin: 0;
  font-size: 11.5px; color: var(--hr-text-muted);
  line-height: 1.55;
}

/* Rules code block */
.pol-rules {
  margin-top: 6px;
  border-radius: 10px;
  background:
    radial-gradient(closest-side, rgba(14, 10, 8, 0.85), rgba(8, 6, 4, 0.95));
  border: 1px solid rgba(251, 191, 36, 0.32);
  overflow: hidden;
  font-family: var(--hr-mono);
}
[data-theme="light"] .pol-rules {
  background:
    radial-gradient(closest-side, rgba(255, 250, 240, 0.95), rgba(254, 243, 199, 0.65));
  border-color: rgba(180, 83, 9, 0.32);
}
.pol-rules-head {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px;
  background: rgba(251, 191, 36, 0.06);
  border-bottom: 1px solid rgba(251, 191, 36, 0.20);
}
[data-theme="light"] .pol-rules-head {
  background: rgba(251, 191, 36, 0.16);
  border-bottom-color: rgba(180, 83, 9, 0.22);
}
.pol-rules-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: inset 0 -1px 2px rgba(0, 0, 0, 0.30);
}
.pol-rules-dot.dot-r { background: #ef4444; }
.pol-rules-dot.dot-y { background: #fbbf24; }
.pol-rules-dot.dot-g { background: #10b981; }
.pol-rules-title {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.5px;
  color: var(--hr-text-muted);
  margin-left: 6px;
}
.pol-rules-title svg { color: #fcd34d; }
[data-theme="light"] .pol-rules-title { color: #6b5840; }
[data-theme="light"] .pol-rules-title svg { color: #b45309; }
.pol-rules-lines {
  margin-left: auto;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.4px;
  color: var(--hr-text-muted);
  text-transform: uppercase;
}
[data-theme="light"] .pol-rules-lines { color: #6b5840; }

.pol-rules-body {
  display: grid;
  grid-template-columns: 28px 1fr;
  max-height: 160px;
  overflow: auto;
}
.pol-rules-gutter {
  display: flex; flex-direction: column;
  padding: 8px 6px 8px 8px;
  background: rgba(0, 0, 0, 0.20);
  border-right: 1px solid rgba(251, 191, 36, 0.16);
  font-size: 10.5px; font-weight: 700;
  color: rgba(252, 211, 77, 0.50);
  text-align: right;
  line-height: 17px;
  user-select: none;
}
[data-theme="light"] .pol-rules-gutter {
  background: rgba(180, 83, 9, 0.08);
  border-right-color: rgba(180, 83, 9, 0.20);
  color: rgba(180, 83, 9, 0.55);
}
.pol-rules-code {
  margin: 0;
  padding: 8px 10px;
  font-size: 11px; line-height: 17px;
  color: var(--hr-text);
  white-space: pre;
  overflow-x: auto;
}
[data-theme="light"] .pol-rules-code { color: #1f1408; }
/* Token colours */
.pol-rules-code :deep(.pol-tok-key)  { color: #fbbf24; font-weight: 700; }
.pol-rules-code :deep(.pol-tok-str)  { color: #5eead4; }
.pol-rules-code :deep(.pol-tok-num)  { color: #fb923c; font-weight: 700; }
.pol-rules-code :deep(.pol-tok-bool) { color: #10b981; font-weight: 700; }
.pol-rules-code :deep(.pol-tok-null) { color: #94a3b8; font-style: italic; }
[data-theme="light"] .pol-rules-code :deep(.pol-tok-key)  { color: #b45309; }
[data-theme="light"] .pol-rules-code :deep(.pol-tok-str)  { color: #115e59; }
[data-theme="light"] .pol-rules-code :deep(.pol-tok-num)  { color: #9a3412; }
[data-theme="light"] .pol-rules-code :deep(.pol-tok-bool) { color: #047857; }
[data-theme="light"] .pol-rules-code :deep(.pol-tok-null) { color: #475569; }

/* Footer / timeline */
.pol-card-foot {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px dashed rgba(251, 191, 36, 0.24);
}
[data-theme="light"] .pol-card-foot { border-top-color: rgba(180, 83, 9, 0.30); }
.pol-timeline {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
}
.pol-timeline-stamp {
  display: inline-flex; flex-direction: column; gap: 1px;
  font-size: 9.5px;
}
.pol-timeline-stamp svg { color: #fcd34d; }
[data-theme="light"] .pol-timeline-stamp svg { color: #b45309; }
.pol-timeline-label {
  font-weight: 800; letter-spacing: 1.2px;
  color: var(--hr-text-muted); text-transform: uppercase;
  display: inline-flex; align-items: center; gap: 3px;
}
.pol-timeline-date {
  font-family: var(--hr-mono); font-size: 10.5px;
  color: var(--hr-text); font-weight: 700;
}
.pol-timeline-track {
  position: relative;
  height: 3px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.28);
  overflow: hidden;
}
[data-theme="light"] .pol-timeline-track {
  background: rgba(251, 191, 36, 0.18);
  border-color: rgba(180, 83, 9, 0.28);
}
.pol-timeline-fill {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, #fbbf24, #fb923c, #fbbf24);
  background-size: 200% 100%;
  animation: pol-timeline-flow 3.5s linear infinite;
  border-radius: 999px;
}
@keyframes pol-timeline-flow {
  0%   { background-position: 0% 0; }
  100% { background-position: 200% 0; }
}
.pol-timeline-empty {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--hr-mono);
  font-size: 10px; font-weight: 800; letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--hr-text-muted);
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.30);
}
.pol-timeline-empty svg { color: #fcd34d; }
[data-theme="light"] .pol-timeline-empty {
  background: rgba(251, 191, 36, 0.18);
  border-color: rgba(180, 83, 9, 0.30);
  color: #6b5840;
}
[data-theme="light"] .pol-timeline-empty svg { color: #b45309; }

/* ═══════════════════════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════════════════════ */
.pol-empty {
  position: relative;
  padding: 56px 28px 44px;
  border-radius: 22px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  text-align: center;
  overflow: hidden;
  isolation: isolate;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
[data-theme="light"] .pol-empty {
  border-color: rgba(180, 83, 9, 0.42);
  background: rgba(255, 250, 240, 0.88);
  box-shadow: 0 22px 50px -28px rgba(40, 25, 10, 0.18);
}
.pol-empty-aurora {
  position: absolute; inset: -40%;
  background:
    radial-gradient(50% 30% at 50% 30%, rgba(251, 191, 36, 0.20), transparent 60%),
    radial-gradient(40% 25% at 30% 70%, rgba(20, 184, 166, 0.10), transparent 60%),
    radial-gradient(40% 25% at 70% 70%, rgba(251, 146, 60, 0.16), transparent 60%);
  filter: blur(40px);
  pointer-events: none;
  animation: att-warm-aurora 20s ease-in-out infinite;
  z-index: 0;
}
.pol-empty > *:not(.pol-empty-aurora) { position: relative; z-index: 1; }

.pol-empty-illustration {
  position: relative;
  width: 140px; height: 140px;
  display: flex; align-items: center; justify-content: center;
}
.pol-empty-grid-bg {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(251, 191, 36, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251, 191, 36, 0.16) 1px, transparent 1px);
  background-size: 14px 14px;
  mask-image: radial-gradient(70% 70% at 50% 50%, #000 30%, transparent 80%);
  border-radius: 50%;
  pointer-events: none;
}
[data-theme="light"] .pol-empty-grid-bg {
  background-image:
    linear-gradient(rgba(180, 83, 9, 0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(180, 83, 9, 0.18) 1px, transparent 1px);
}
.pol-empty-book {
  color: #fbbf24;
  filter: drop-shadow(0 0 14px rgba(251, 191, 36, 0.55));
  z-index: 2;
}
[data-theme="light"] .pol-empty-book { color: #b45309; filter: drop-shadow(0 0 14px rgba(217, 119, 6, 0.45)); }
.pol-empty-ring {
  position: absolute; top: 50%; left: 50%;
  border-radius: 50%;
  border: 1.4px solid rgba(251, 191, 36, 0.45);
  transform: translate(-50%, -50%) scale(1);
  opacity: 0;
  animation: att-pulse-emanate 4s ease-out infinite;
  pointer-events: none;
}
.pol-empty-ring.r1 { width: 120px; height: 120px; animation-delay: 0s; }
.pol-empty-ring.r2 { width: 120px; height: 120px; animation-delay: 1.3s; }
.pol-empty-ring.r3 { width: 120px; height: 120px; animation-delay: 2.6s; }
[data-theme="light"] .pol-empty-ring { border-color: rgba(180, 83, 9, 0.45); }

.pol-empty h3 { margin: 6px 0 0; font-size: 17px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.2px; }
.pol-empty p  { margin: 0 0 4px; font-size: 12px; color: var(--hr-text-muted); max-width: 480px; line-height: 1.55; }
.pol-empty-meta {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 6px;
  padding: 5px 12px; border-radius: 999px;
  background: rgba(20, 184, 166, 0.14);
  border: 1px solid rgba(13, 148, 136, 0.45);
  font-size: 10px; font-weight: 800; letter-spacing: 1.2px;
  color: #5eead4; text-transform: uppercase;
}
[data-theme="light"] .pol-empty-meta {
  background: rgba(13, 148, 136, 0.16);
  border-color: rgba(15, 118, 110, 0.55);
  color: #115e59;
}
.pol-empty-meta-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #5eead4;
  box-shadow: 0 0 6px #5eead4;
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
[data-theme="light"] .pol-empty-meta-dot { background: #0f766e; box-shadow: 0 0 6px #0f766e; }

/* Form helpers (modal uses OnbField) */
.form-stack { display: flex; flex-direction: column; gap: 14px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

/* Responsive */
@media (max-width: 1100px) {
  .pol-banner-text { padding-right: 0; }
  .pol-stack-cluster { position: relative; top: auto; right: auto; transform: none; margin: 18px auto 0; }
}
@media (max-width: 760px) {
  .pol-stack-cluster { display: none; }
  .pol-grid { grid-template-columns: 1fr; }
  .form-grid-2 { grid-template-columns: 1fr; }
  .pol-card-head { padding-right: 36px; }
}
</style>
