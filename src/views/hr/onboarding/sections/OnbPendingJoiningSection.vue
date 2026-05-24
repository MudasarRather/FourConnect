<template>
  <section class="onb-pj">
    <Motion as="header" class="onb-section-banner pj-banner"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="onb-section-banner-glow" />
      <div class="onb-section-banner-text">
        <span class="onb-eyebrow"><span class="onb-eyebrow-dot" /> Accepted offers · awaiting init</span>
        <h2 class="onb-banner-title">
          <span class="id-title-word">Pending</span>
          <span class="banner-divider">·</span>
          <span class="id-title-word" style="animation-delay: 80ms">Joining</span>
        </h2>
        <p class="onb-banner-sub">
          Accepted offers awaiting onboarding initialization. Convert one into an Employee via <strong>HR → Employees → Add Employee</strong> — onboarding is auto-bootstrapped on save.
        </p>
      </div>
      <div class="onb-banner-aside">
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ offers.length }}</span>
          <span class="onb-banner-stat-label">In tray</span>
        </div>
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ offers.filter(o => o.has_employee).length }}</span>
          <span class="onb-banner-stat-label">Started</span>
        </div>
        <button class="onb-btn-ghost pj-refresh" @click="load" :disabled="loading">
          <RefreshCw :size="13" :class="{ 'is-spin': loading }" /> Refresh
        </button>
      </div>
    </Motion>

    <div v-if="loading" class="pj-grid">
      <div v-for="i in 4" :key="i" class="pj-skel">
        <div class="onb-skel skel-line w-80"></div>
        <div class="onb-skel skel-line w-50"></div>
        <div class="onb-skel skel-block"></div>
      </div>
    </div>

    <div v-else-if="!offers.length" class="onb-empty-card">
      <div class="onb-empty-mark">
        <Hourglass :size="22" />
      </div>
      <h3 class="pj-empty-title">Tray is empty</h3>
      <p>New joiners show up here once Recruitment closes an offer with status&nbsp;ACCEPTED.</p>
    </div>

    <div v-else class="pj-grid">
      <Motion
        v-for="(o, i) in offers"
        :key="o.offer_id"
        as="article"
        class="pj-card"
        :class="{ 'is-started': o.has_employee }"
        :initial="{ opacity: 0, y: 14 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3, transition: { duration: 0.2 } }"
      >
        <!-- LEFT RAIL -->
        <div class="pj-rail">
          <div class="pj-avatar">{{ initial(o.candidate_name) }}</div>
          <div class="pj-rail-line"></div>
          <div class="pj-rail-spark" v-if="o.joining_date">
            <span class="pj-rail-day">{{ formatDay(o.joining_date) }}</span>
            <span class="pj-rail-month">{{ formatMonth(o.joining_date) }}</span>
          </div>
        </div>

        <!-- MAIN -->
        <div class="pj-body">
          <header class="pj-card-head">
            <div class="pj-name">{{ o.candidate_name }}</div>
            <span class="pj-pill" :data-state="o.has_employee ? 'started' : 'pending'">
              <span class="pj-pill-dot"></span>
              {{ o.has_employee ? 'Onboarding Started' : 'Awaiting Init' }}
            </span>
          </header>

          <div class="pj-tags">
            <span class="pj-tag onb-mono">{{ o.offer_code }}</span>
            <span v-if="o.designation" class="pj-tag">{{ o.designation }}</span>
            <span v-if="o.department" class="pj-tag tag-soft">{{ o.department }}</span>
            <span v-if="o.location"   class="pj-tag tag-soft">{{ o.location }}</span>
          </div>

          <ul class="pj-meta">
            <li>
              <Calendar :size="12" />
              <span class="pj-meta-label">Joining</span>
              <span class="pj-meta-value">{{ formatDate(o.joining_date) || 'TBD' }}</span>
            </li>
            <li>
              <CircleDollarSign :size="12" />
              <span class="pj-meta-label">CTC</span>
              <span class="pj-meta-value onb-mono">{{ formatMoney(o.offered_salary) }}</span>
            </li>
            <li>
              <Mail :size="12" />
              <span class="pj-meta-label">Email</span>
              <span class="pj-meta-value">{{ o.candidate_email || '—' }}</span>
            </li>
            <li>
              <Phone :size="12" />
              <span class="pj-meta-label">Mobile</span>
              <span class="pj-meta-value onb-mono">{{ o.candidate_mobile || '—' }}</span>
            </li>
          </ul>

          <footer class="pj-foot">
            <span class="pj-accepted">
              <CheckCircle2 :size="11" />
              Accepted {{ relativeAccepted(o.accepted_at) }}
            </span>
            <button class="pj-cta" :class="{ 'is-disabled': o.has_employee }" :disabled="o.has_employee">
              <span>{{ o.has_employee ? 'Already onboarded' : 'Convert to Employee' }}</span>
              <ArrowRight :size="13" />
            </button>
          </footer>
        </div>

        <!-- glow accent -->
        <span class="pj-glow"></span>
      </Motion>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, Hourglass, Calendar, CircleDollarSign, Mail, Phone,
  CheckCircle2, ArrowRight,
} from 'lucide-vue-next'
import { fetchPendingJoining } from '../composables/useOnboarding'
import { useToast } from 'vue-toastification'

defineEmits(['refresh-stats'])

const toast = useToast()
const offers = ref([])
const loading = ref(false)

const load = async () => {
  loading.value = true
  try { offers.value = await fetchPendingJoining() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not load pending joiners') }
  finally { loading.value = false }
}
onMounted(load)

const initial = (name) => (name?.[0] || '?').toUpperCase()
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
const formatDay = (d) => d ? String(new Date(d).getDate()).padStart(2, '0') : ''
const formatMonth = (d) => d ? new Date(d).toLocaleString('en-IN', { month: 'short' }).toUpperCase() : ''
const formatMoney = (n) => n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`

const relativeAccepted = (iso) => {
  if (!iso) return 'recently'
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const day = Math.floor(diff / 86400000)
  if (day === 0) return 'today'
  if (day === 1) return 'yesterday'
  if (day < 7) return `${day}d ago`
  if (day < 30) return `${Math.floor(day / 7)}w ago`
  return `${Math.floor(day / 30)}mo ago`
}
</script>

<style scoped>
@import '../../../../styles/onboarding-theme.css';

.onb-pj { display: flex; flex-direction: column; gap: 16px; }

.pj-banner .banner-divider {
  display: inline-block;
  margin: 0 6px;
  color: var(--hr-text-dim);
  font-weight: 400;
  -webkit-text-fill-color: var(--hr-text-dim);
}
.pj-banner strong { color: var(--hr-accent-gold); font-weight: 700; }
.pj-refresh { align-self: flex-end; }

.pj-empty-title { margin: 0; font-size: 16px; font-weight: 800; color: var(--hr-text); }

.pj-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 16px;
}
.pj-skel {
  background: var(--onb-glass); border: var(--onb-glass-stroke);
  border-radius: 20px; padding: 18px;
  display: flex; flex-direction: column; gap: 8px;
  height: 220px;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
}
.skel-line { height: 14px; border-radius: 5px; }
.skel-block { flex: 1; border-radius: 8px; margin-top: 6px; }
.w-80 { width: 80%; } .w-50 { width: 50%; }
.is-spin { animation: hr-rotate-conic 1s linear infinite; }

.pj-card {
  position: relative;
  display: grid;
  grid-template-columns: 78px 1fr;
  gap: 16px;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke);
  border-radius: 20px;
  padding: 18px;
  overflow: hidden;
  isolation: isolate;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
  transition: border-color .25s var(--hr-spring), box-shadow .3s var(--hr-spring), transform .3s var(--hr-spring);
}
.pj-card::before {
  content: ''; position: absolute; inset: 0;
  background:
    linear-gradient(160deg, rgba(255,255,255,0.06), transparent 35%),
    radial-gradient(70% 60% at 100% 0%, rgba(251, 146, 60, 0.08), transparent 70%);
  pointer-events: none; z-index: -1;
}
.pj-card:hover {
  transform: translateY(-3px);
  border-color: var(--hr-accent-gold-border);
  box-shadow: 0 30px 60px -28px rgba(251, 146, 60, 0.45);
}
.pj-card.is-started { border-color: rgba(52, 211, 153, 0.32); }
.pj-card.is-started:hover { box-shadow: 0 30px 60px -28px rgba(52, 211, 153, 0.4); }

.pj-glow {
  position: absolute; top: 0; left: 0; width: 4px; height: 100%;
  background: var(--hr-gradient-hero);
  opacity: 0.0;
  transition: opacity .25s var(--hr-spring);
}
.pj-card:hover .pj-glow { opacity: 0.95; }
.pj-card.is-started .pj-glow { background: linear-gradient(180deg, #34d399, #2dd4bf); }

.pj-rail {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding-top: 4px;
}
.pj-avatar {
  width: 50px; height: 50px; border-radius: 16px;
  background: var(--hr-gradient-hero); color: #1f1408;
  font-size: 19px; font-weight: 800; letter-spacing: 0.2px;
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 12px 26px -10px rgba(251, 146, 60, 0.55);
}
.pj-rail-line {
  width: 1px; flex: 1;
  background: linear-gradient(180deg, var(--hr-border-warm), transparent);
}
.pj-rail-spark {
  display: flex; flex-direction: column; align-items: center; gap: 0;
  padding: 6px 8px; border-radius: 10px;
  background: rgba(251, 191, 36, 0.08); border: 1px solid var(--hr-border-warm);
}
.pj-rail-day { font-size: 16px; font-weight: 800; color: var(--hr-text); line-height: 1; }
.pj-rail-month { font-size: 9px; font-weight: 700; letter-spacing: 1px; color: var(--hr-accent-gold); margin-top: 2px; }

.pj-body { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.pj-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.pj-name { font-size: 15px; font-weight: 700; color: var(--hr-text); }
.pj-pill {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
  padding: 3px 9px; border-radius: 999px;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); border: 1px solid var(--hr-border-warm);
}
.pj-pill-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--hr-accent-gold); animation: hr-pulse-dot-gold 2s ease-in-out infinite; }
.pj-pill[data-state="started"] {
  background: rgba(52, 211, 153, 0.16);
  border-color: rgba(52, 211, 153, 0.32);
  color: #34d399;
}
.pj-pill[data-state="started"] .pj-pill-dot { background: #34d399; }

.pj-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.pj-tag {
  font-size: 10.5px; font-weight: 600;
  padding: 3px 8px; border-radius: 6px;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid var(--hr-border-warm);
  color: var(--hr-accent-gold);
}
.pj-tag.tag-soft {
  background: rgba(255, 255, 255, 0.04);
  border-color: var(--hr-border);
  color: var(--hr-text-secondary);
}
.onb-mono { font-family: var(--hr-mono); }

.pj-meta { list-style: none; padding: 8px 0 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-top: 1px solid var(--hr-border); }
.pj-meta li {
  display: flex; align-items: center; gap: 6px;
  font-size: 11.5px;
}
.pj-meta li > svg { color: var(--hr-text-muted); flex-shrink: 0; }
.pj-meta-label { color: var(--hr-text-muted); }
.pj-meta-value { color: var(--hr-text); margin-left: auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%; }

.pj-foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 4px; padding-top: 8px;
  border-top: 1px solid var(--hr-border);
}
.pj-accepted {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10.5px; color: var(--hr-text-muted);
}
.pj-accepted > svg { color: #34d399; }
.pj-cta {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 13px; border-radius: 10px;
  background: var(--hr-gradient-hero); color: #1f1408;
  border: 0; font: inherit; font-size: 11.5px; font-weight: 700; letter-spacing: 0.2px;
  cursor: pointer;
  transition: transform .2s var(--hr-spring), box-shadow .25s var(--hr-spring);
}
.pj-cta:hover { transform: translateY(-1px); box-shadow: 0 14px 26px -12px rgba(251, 146, 60, 0.55); }
.pj-cta.is-disabled, .pj-cta[disabled] {
  background: rgba(255, 255, 255, 0.06); color: var(--hr-text-muted); cursor: not-allowed;
}
.pj-cta.is-disabled:hover { transform: none; box-shadow: none; }
</style>
