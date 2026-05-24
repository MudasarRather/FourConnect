<template>
  <div class="hero-card glass-panel">
    <div class="hero-header">
      <div class="header-main">
        <div class="title-group">
          <!-- Project Code -->
          <div class="code-wrap">
            <Hash :size="12" class="code-icon" />
            <span class="project-code">{{ project.code }}</span>
          </div>

          <!-- Description -->
          <div class="desc-wrap">
            <div class="label-box">
               <FileText :size="12" class="lbl-icon" />
               <span class="label">Description</span>
            </div>
            <h2 class="project-desc">{{ project.description || 'No description provided.' }}</h2>
          </div>
        </div>

        <!-- Status Group with Label -->
        <div class="status-group">
           <div class="label-box status-lbl">
              <HeartPulse :size="12" class="lbl-icon" />
              <span class="label">Project Health</span>
           </div>
           <div class="status-badge" :class="healthStatus.class">
             <Activity :size="12" stroke-width="3" />
             <span>{{ healthStatus.label }}</span>
           </div>
        </div>
      </div>
    </div>
    


    <div class="hero-grid">
      <!-- Col 1: Details & Meta -->
      <div class="hero-col info-col">
        <div class="meta-grid">
           <div class="meta-item">
             <div class="label-box">
                <CalendarRange :size="12" class="lbl-icon" />
                <span class="label">Timeline</span>
             </div>
             <span class="val">{{ formatDate(project.start_date) }} - {{ formatDate(project.end_date) }}</span>
           </div>
           <div class="meta-item">
             <div class="label-box">
                <Tag :size="12" class="lbl-icon" />
                <span class="label">Type</span>
             </div>
             <span class="val">{{ project.project_type }}</span>
           </div>
           <div class="meta-item">
             <div class="label-box">
                <CreditCard :size="12" class="lbl-icon" />
                <span class="label">Cost Center</span>
             </div>
             <span class="val">{{ project.cost_center || '-' }}</span>
           </div>
           <div class="meta-item">
             <div class="label-box">
                <Building2 :size="12" class="lbl-icon" />
                <span class="label">Organization</span>
             </div>
             <span class="val">{{ project.organization || 'Fourconnect' }}</span>
           </div>
        </div>
        
        <div class="owner-section">
           <div class="label-box">
              <UserCircle :size="12" class="lbl-icon" />
              <span class="label">Project Owner</span>
           </div>
           
           <div class="owner-pill-hero">
              <div class="avatar-mini">{{ getInitials(project.created_by_name) }}</div>
              
              <div class="owner-detail-col">
                 <span class="owner-name">{{ project.created_by_name || 'System Admin' }}</span>
                 
                 <div class="owner-meta-row-single">
                    <div v-if="project.created_by_employee_code" class="meta-bit">
                       <BadgeCheck :size="10" />
                       <span>{{ project.created_by_employee_code }}</span>
                    </div>
                    <div class="meta-div" v-if="project.created_by_employee_code && project.created_by_phone"></div>
                    
                    <div v-if="project.created_by_phone" class="meta-bit">
                       <Phone :size="10" />
                       <span>{{ project.created_by_phone }}</span>
                    </div>
                    <div class="meta-div" v-if="project.created_by_phone && project.created_by_address"></div>

                    <div v-if="project.created_by_address" class="meta-bit">
                       <MapPin :size="10" />
                       <span class="addr-trunc">{{ project.created_by_address }}</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <!-- Col 2: Progress & Analytics -->
      <div class="hero-col progress-col">
          <div class="label-row">
            <div class="label-box">
               <Activity :size="12" class="lbl-icon" />
               <span class="label">Overall Completion</span>
            </div>
            <span class="value">{{ Math.min(progress, 100) }}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :class="healthStatus.class" :style="{ width: Math.min(progress, 100) + '%' }"></div>
          </div>
          <div class="duration-meta">
             <Clock :size="12" class="op-icon" />
             <span class="dur-label">Project Duration:</span>
             <span class="dur-val">{{ calculateDuration(project.start_date, project.end_date) }}</span>
          </div>
          
          <div class="mini-stats">
             <div class="ms-item">
                <div class="label-box">
                   <PieChart :size="10" class="lbl-icon" />
                   <span class="ms-lbl">Budget Used</span>
                </div>
                <div class="ms-val-group">
                   <span class="ms-val">{{ budgetUsedPercentage }}%</span>
                   <span class="ms-sub-val">({{ formatCurrency(project.budget_utilized) }} / {{ formatCurrency(project.budget_amount) }})</span>
                </div>
             </div>
             <div class="ms-div"></div>
             <div class="ms-item">
                <div class="label-box">
                   <AlertTriangle :size="10" class="lbl-icon" />
                   <span class="ms-lbl">Risk Level</span>
                </div>
                <span class="ms-val" :class="riskLevel.class">{{ riskLevel.label }}</span>
             </div>
          </div>
      </div>

      <!-- Col 3: Calendar Integration -->
      <div class="hero-col calendar-col">
         <CardCalendar 
            :startDate="project.start_date" 
            :endDate="project.end_date"
         />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CardCalendar from './CardCalendar.vue'
import { 
  CalendarRange, Tag, CreditCard, Building2, UserCircle, 
  BadgeCheck, Phone, MapPin, Activity, Clock, PieChart, AlertTriangle,
  Hash, FileText, HeartPulse, Check
} from 'lucide-vue-next'

const props = defineProps({
  project: { type: Object, required: true },
  progress: { type: Number, default: 0 },
  milestones: { type: Array, default: () => [] }
})

const healthStatus = computed(() => {
  // Current logic for dates
  const endDate = props.project.end_date ? new Date(props.project.end_date) : null
  const today = new Date()
  let daysRemaining = Infinity
  
  if (endDate) {
    const diffTime = endDate - today
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // 0. Completed always wins
  if (props.progress >= 100) return { label: 'Completed', class: 'success' }

  // 1. Overdue: Date passed and not completed
  if (daysRemaining < 0) {
      return { label: 'Timeline Exceeded', class: 'destructive' }
  }

  // 2. Critical/Bad: < 50% Progress AND Near Deadline (e.g. within 14 days)
  if (props.progress < 50 && daysRemaining <= 14 && daysRemaining > -Infinity) {
      return { label: 'Bad', class: 'destructive' }
  }

  // 2. At Risk: Very Near Deadline (e.g. within 7 days) regardless of progress (unless already Bad)
  // The user specified "below or above 50% and due date is very near" -> At Risk
  if (daysRemaining <= 7 && daysRemaining > -Infinity) {
      return { label: 'At Risk', class: 'warning' }
  }

  // 4. Defaults based on progress if timeline is fine
  if (props.progress > 80) return { label: 'Good', class: 'success' } // Changed "On Track" to "Good" to match prompt vibe
  if (props.progress > 40) return { label: 'Good', class: 'success' } // Default "Good" per prompt
  
  return { label: 'Good', class: 'success' }
})

const riskLevel = computed(() => {
   const s = healthStatus.value.label
   if (s === 'Bad' || s === 'Timeline Exceeded') return { label: 'High', class: 'high' }
   if (s === 'At Risk') return { label: 'Medium', class: 'medium' }
   return { label: 'Low', class: 'low' }
})

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'
const getInitials = (name) => name ? name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : 'U'

const calculateDuration = (start, end) => {
  if (!start || !end) return 'TBD'
  const diffTime = Math.abs(new Date(end) - new Date(start));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;
  if (months > 0) return `${months} mo ${days} days`
  return `${diffDays} days`
}

// Exchange Rates (Matched with Cards for Consistency)
const EXCHANGE_RATES = {
  'USD': 1, 'EUR': 0.92, 'GBP': 0.79, 'INR': 83.5, 
  'AUD': 1.52, 'CAD': 1.35, 'JPY': 150.0
}
const convertAmount = (amt, from, to) => {
  if (!amt) return 0
  if (from === to) return amt
  const fromRate = EXCHANGE_RATES[from] || 1
  const toRate = EXCHANGE_RATES[to] || 1
  return (amt / fromRate) * toRate
}

const budgetUsedPercentage = computed(() => {
   if (!props.project.budget_amount || props.project.budget_amount === 0) return 0
   
   // Use backend value directly for consistency across all views
   const used = props.project.budget_utilized || 0

   const pct = (used / props.project.budget_amount) * 100
   
   // If > 0 but < 1, show 1 decimal
   if (pct > 0 && pct < 1) return pct.toFixed(1)
   
   return Math.min(Math.round(pct), 100)
})

const formatCurrency = (val) => {
   return new Intl.NumberFormat('en-US', { 
       style: 'currency', 
       currency: props.project.currency || 'USD',
       notation: 'compact',
       maximumFractionDigits: 1
   }).format(val || 0)
}
</script>

<style scoped>
.glass-panel {
  background: rgba(30, 30, 33, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 32px;
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  margin-bottom: 24px;
  display: flex; flex-direction: column; gap: 24px;
  position: relative; overflow: hidden;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.30),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  animation: hero-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Floating ambient orbs — pure decorative */
.glass-panel::before,
.glass-panel::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  filter: blur(40px);
}
.glass-panel::before {
  width: 320px; height: 320px;
  top: -120px; right: -80px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.18), transparent 70%);
  animation: orb-float-a 14s ease-in-out infinite;
}
.glass-panel::after {
  width: 260px; height: 260px;
  bottom: -100px; left: -60px;
  background: radial-gradient(circle, rgba(249, 115, 22, 0.14), transparent 70%);
  animation: orb-float-b 18s ease-in-out infinite;
}

/* Ensure all children render above the orbs */
.glass-panel > * { position: relative; z-index: 1; }

@keyframes hero-enter {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes orb-float-a {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-20px, 30px) scale(1.08); }
}
@keyframes orb-float-b {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, -20px) scale(1.10); }
}

.hero-header { border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 20px; }
.header-main { display: flex; justify-content: space-between; align-items: flex-start; }

.title-group { display: flex; flex-direction: column; gap: 10px; }

.code-wrap {
  display: inline-flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(249, 115, 22, 0.06));
  border: 1px solid rgba(245, 158, 11, 0.30);
  padding: 5px 12px; border-radius: 999px; align-self: flex-start;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.08);
}
.code-wrap:hover {
  transform: translateY(-1px);
  border-color: rgba(245, 158, 11, 0.55);
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.18);
}
.code-icon { color: #fbbf24; opacity: 0.95; }
.project-code {
  font-size: 11px; font-weight: 700; color: #fbbf24;
  letter-spacing: 0.08em;
}

.desc-wrap { display: flex; flex-direction: column; gap: 4px; }
.project-desc {
  font-size: 20px; color: rgba(255, 255, 255, 0.95); font-weight: 500; line-height: 1.4;
  max-width: 800px; margin: 0;
}

.status-group { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.status-lbl { justify-content: flex-end; }

.status-badge {
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  padding: 7px 16px; border-radius: 20px;
  border: 1px solid transparent;
  display: inline-flex; align-items: center; gap: 8px;
  position: relative;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.status-badge:hover { transform: translateY(-1px); }
.status-badge::after {
  content: "";
  position: absolute; left: 10px; top: 50%;
  width: 6px; height: 6px; border-radius: 50%;
  transform: translateY(-50%);
  animation: pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  display: none;
}
.success { color: #fbbf24; background: linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(245, 158, 11, 0.06)); border-color: rgba(245, 158, 11, 0.36); box-shadow: 0 4px 14px rgba(245, 158, 11, 0.16); }
.info { color: #fdba74; background: linear-gradient(135deg, rgba(249, 115, 22, 0.16), rgba(249, 115, 22, 0.06)); border-color: rgba(249, 115, 22, 0.36); box-shadow: 0 4px 14px rgba(249, 115, 22, 0.16); }
.warning { color: #fbbf24; background: linear-gradient(135deg, rgba(251, 191, 36, 0.16), rgba(251, 191, 36, 0.06)); border-color: rgba(251, 191, 36, 0.36); box-shadow: 0 4px 14px rgba(251, 191, 36, 0.16); }
.destructive { color: #f87171; background: linear-gradient(135deg, rgba(220, 38, 38, 0.16), rgba(220, 38, 38, 0.06)); border-color: rgba(220, 38, 38, 0.36); box-shadow: 0 4px 14px rgba(220, 38, 38, 0.16); }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: translateY(-50%) scale(1); }
  50% { opacity: 0.4; transform: translateY(-50%) scale(1.4); }
}

.completed-stamp { display: none; } /* Remove old style if references exist */




.hero-grid { display: grid; grid-template-columns: 1fr 1fr 300px; gap: 32px; }

/* Col 1: Info */
.info-col { display: flex; flex-direction: column; justify-content: space-between; gap: 20px; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.meta-item {
  display: flex; flex-direction: column; gap: 6px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  position: relative;
  transition: transform 0.25s ease, background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  cursor: default;
  animation: meta-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.meta-item:nth-child(1) { animation-delay: 0.05s; }
.meta-item:nth-child(2) { animation-delay: 0.10s; }
.meta-item:nth-child(3) { animation-delay: 0.15s; }
.meta-item:nth-child(4) { animation-delay: 0.20s; }
.meta-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(245, 158, 11, 0.30);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.20);
}
.meta-item::before {
  content: "";
  position: absolute;
  left: 0; top: 14px; bottom: 14px;
  width: 2px; border-radius: 2px;
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.7), rgba(249, 115, 22, 0.2));
  opacity: 0; transition: opacity 0.25s ease;
}
.meta-item:hover::before { opacity: 1; }

@keyframes meta-enter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.label-box { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.lbl-icon { color: rgba(245, 158, 11, 0.75); transition: color 0.25s ease; }
.meta-item:hover .lbl-icon { color: #fbbf24; }
.label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255, 255, 255, 0.55); font-weight: 600; }

.val { font-size: 13px; font-weight: 600; color: #f5f5f7; padding-left: 18px; }

.owner-section {
  display: flex; flex-direction: column; gap: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 18px;
}
.owner-pill-hero {
  display: flex; align-items: center; gap: 12px;
  font-size: 13px; font-weight: 500; color: white;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: transform 0.25s ease, background 0.25s ease, border-color 0.25s ease;
}
.owner-pill-hero:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(245, 158, 11, 0.28);
  transform: translateY(-1px);
}
.avatar-mini {
  width: 38px; height: 38px; border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.15),
    0 6px 16px rgba(245, 158, 11, 0.30);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; flex-shrink: 0;
  color: white;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.owner-pill-hero:hover .avatar-mini {
  transform: scale(1.06) rotate(-3deg);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.25),
    0 10px 22px rgba(245, 158, 11, 0.45);
}
.owner-detail-col { display: flex; flex-direction: column; gap: 4px; flex: 1; justify-content: center; }
.owner-name { font-weight: 600; line-height: 1.2; font-size: 14px; }

.owner-meta-row-single { 
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  font-size: 11px; color: rgba(255,255,255,0.5); 
}
.meta-bit { display: flex; align-items: center; gap: 4px; white-space: nowrap; }
.meta-div { width: 1px; height: 10px; background: rgba(255,255,255,0.15); }
.addr-trunc { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Col 2: Progress */
.progress-col { display: flex; flex-direction: column; justify-content: center; gap: 4px; }
.label-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
.value {
  font-size: 24px; font-weight: 800; color: white;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fff 30%, #fbbf24 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.progress-track {
  height: 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 99px; overflow: hidden;
  margin-bottom: 14px;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.20);
}
.progress-fill {
  height: 100%; border-radius: 99px;
  transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative; overflow: hidden;
}
.progress-fill::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  animation: shimmer 2.4s linear infinite;
}
.progress-fill.success { background: linear-gradient(90deg, #f59e0b, #f97316); box-shadow: 0 0 12px rgba(245, 158, 11, 0.50); }
.progress-fill.info    { background: linear-gradient(90deg, #fbbf24, #f59e0b); box-shadow: 0 0 12px rgba(251, 191, 36, 0.50); }
.progress-fill.warning { background: linear-gradient(90deg, #fbbf24, #d97706); box-shadow: 0 0 12px rgba(251, 191, 36, 0.50); }
.progress-fill.destructive { background: linear-gradient(90deg, #ef4444, #d97706); box-shadow: 0 0 12px rgba(239, 68, 68, 0.50); }
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.duration-meta {
  font-size: 12px; display: flex; align-items: center; gap: 6px;
  color: rgba(255, 255, 255, 0.65); margin-bottom: 18px;
}
.dur-val { font-weight: 700; color: #fbbf24; }

.mini-stats {
  display: flex; align-items: stretch; gap: 18px;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
.mini-stats:hover {
  border-color: rgba(245, 158, 11, 0.22);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
}
.ms-item { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.ms-lbl { font-size: 10px; color: rgba(245, 158, 11, 0.75); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
.ms-val { font-size: 14px; font-weight: 700; color: white; padding-left: 0; }
.ms-val-group { display: flex; flex-direction: column; padding-left: 16px; gap: 2px; }
.ms-sub-val { font-size: 10px; color: rgba(255, 255, 255, 0.5); font-family: 'SF Mono', monospace; }
.ms-val.low { color: #fbbf24; padding-left: 0; }
.ms-val.medium { color: #f59e0b; padding-left: 0; }
.ms-val.high { color: #ef4444; padding-left: 0; }
.ms-div { width: 1px; align-self: stretch; background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.15), transparent); }

/* Col 3: Calendar */
.calendar-col {
  display: flex; justify-content: center;
  animation: meta-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
}

/* ═════════ LIGHT THEME OVERRIDES — Project Console hero ═════════════════ */
[data-theme="light"] .console-hero,
[data-theme="light"] .hero-wrapper {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(40, 25, 10, 0.10);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
}
[data-theme="light"] .hero-eyebrow,
[data-theme="light"] .console-eyebrow { color: #b45309; }
[data-theme="light"] .project-name,
[data-theme="light"] .hero-title,
[data-theme="light"] .console-title { color: var(--text-primary); }
[data-theme="light"] .switch-trigger { color: var(--text-secondary); }
[data-theme="light"] .switch-trigger:hover { color: var(--text-primary); }
[data-theme="light"] .view-full-btn {
  background: linear-gradient(135deg, #d97706, #c2410c);
  color: #fff;
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .code-chip,
[data-theme="light"] .project-code-chip {
  background: rgba(217, 119, 6, 0.12);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .desc-label,
[data-theme="light"] .timeline-label,
[data-theme="light"] .cc-label,
[data-theme="light"] .type-label,
[data-theme="light"] .org-label,
[data-theme="light"] .ms-label { color: #6b5840; font-weight: 700; }
[data-theme="light"] .desc-text,
[data-theme="light"] .timeline-val,
[data-theme="light"] .cc-val,
[data-theme="light"] .type-val,
[data-theme="light"] .org-val,
[data-theme="light"] .ms-val { color: var(--text-primary); }
[data-theme="light"] .ms-sub-val { color: var(--text-tertiary); }
[data-theme="light"] .ms-div { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .progress-track { background: rgba(40, 25, 10, 0.08); }
[data-theme="light"] .completion-label,
[data-theme="light"] .duration-label,
[data-theme="light"] .budget-label,
[data-theme="light"] .risk-label { color: #6b5840; font-weight: 700; }
[data-theme="light"] .completion-val,
[data-theme="light"] .duration-val,
[data-theme="light"] .budget-val { color: var(--text-primary); }
[data-theme="light"] .health-card {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .health-eyebrow { color: #6b5840; }
[data-theme="light"] .owner-card {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .owner-label { color: #6b5840; }
[data-theme="light"] .owner-name { color: var(--text-primary); }
[data-theme="light"] .owner-meta { color: var(--text-tertiary); }
[data-theme="light"] .calendar-wrap {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .cal-month { color: var(--text-primary); }
[data-theme="light"] .cal-day-head { color: var(--text-tertiary); }
[data-theme="light"] .cal-day { color: var(--text-secondary); }
[data-theme="light"] .cal-day.today {
  background: linear-gradient(135deg, #d97706, #c2410c);
  color: #fff;
}
[data-theme="light"] .live-updates-pill,
[data-theme="light"] .live-updates {
  background: rgba(40, 25, 10, 0.06);
  color: var(--text-secondary);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .active-milestones-title { color: var(--text-primary); }
[data-theme="light"] .active-milestones-sub { color: var(--text-secondary); }

/* ═════════════════ LIGHT THEME OVERRIDES — ConsoleHero (actual classes) ═════════════════ */
[data-theme="light"] .hero-card.glass-panel,
[data-theme="light"] .glass-panel {
  background: rgba(255, 250, 240, 0.85);
  border: 1px solid rgba(40, 25, 10, 0.10);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  box-shadow: 0 4px 24px rgba(40, 25, 10, 0.05);
}
[data-theme="light"] .hero-header {
  border-bottom: 1px solid rgba(40, 25, 10, 0.08);
}

/* Code chip */
[data-theme="light"] .code-wrap {
  background: rgba(217, 119, 6, 0.12);
  border: 1px solid rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .code-icon {
  color: #92400e;
  opacity: 1;
}
[data-theme="light"] .project-code {
  color: #92400e;
}

/* Description */
[data-theme="light"] .project-desc {
  color: var(--text-primary);
}

/* Status / Health badge */
[data-theme="light"] .status-badge.success {
  color: #92400e;
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .status-badge.info {
  color: #b45309;
  background: rgba(234, 88, 12, 0.10);
  border-color: rgba(234, 88, 12, 0.28);
}
[data-theme="light"] .status-badge.warning {
  color: #b45309;
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .status-badge.destructive {
  color: #b91c1c;
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.30);
}

/* Label boxes / labels */
[data-theme="light"] .lbl-icon {
  color: #b45309;
}
[data-theme="light"] .label {
  color: #6b5840;
  font-weight: 700;
}

/* Meta values */
[data-theme="light"] .val {
  color: var(--text-primary);
}

/* Owner section */
[data-theme="light"] .owner-section {
  border-top: 1px solid rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .owner-pill-hero {
  color: var(--text-primary);
}
[data-theme="light"] .avatar-mini {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.30);
  color: #fff;
}
[data-theme="light"] .owner-name {
  color: var(--text-primary);
}
[data-theme="light"] .owner-meta-row-single {
  color: #6b5840;
}
[data-theme="light"] .meta-div {
  background: rgba(40, 25, 10, 0.15);
}

/* Progress column */
[data-theme="light"] .value {
  color: var(--text-primary);
}
[data-theme="light"] .progress-track {
  background: rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .progress-fill.success {
  background: linear-gradient(90deg, #d97706, #c2410c);
}
[data-theme="light"] .progress-fill.info {
  background: linear-gradient(90deg, #ea580c, #d97706);
}
[data-theme="light"] .progress-fill.warning {
  background: #d97706;
}
[data-theme="light"] .progress-fill.destructive {
  background: #b45309;
}
[data-theme="light"] .duration-meta {
  color: #6b5840;
  opacity: 1;
}
[data-theme="light"] .op-icon {
  color: #b45309;
}
[data-theme="light"] .dur-label {
  color: #6b5840;
  font-weight: 600;
}
[data-theme="light"] .dur-val {
  color: var(--text-primary);
  font-weight: 700;
}

/* Mini stats panel */
[data-theme="light"] .mini-stats {
  background: rgba(40, 25, 10, 0.04);
  border: 1px solid rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .ms-lbl {
  color: #6b5840;
  font-weight: 700;
}
[data-theme="light"] .ms-val {
  color: var(--text-primary);
}
[data-theme="light"] .ms-sub-val {
  color: #6b5840;
}
[data-theme="light"] .ms-val.low {
  color: #d97706;
}
[data-theme="light"] .ms-val.medium {
  color: #b45309;
}
[data-theme="light"] .ms-val.high {
  color: #b91c1c;
}
[data-theme="light"] .ms-div {
  background: linear-gradient(180deg, transparent, rgba(40, 25, 10, 0.15), transparent);
}

/* ═════════ Modern animated redesign — light-theme adjustments ═════════ */
[data-theme="light"] .glass-panel::before {
  background: radial-gradient(circle, rgba(217, 119, 6, 0.22), transparent 70%);
}
[data-theme="light"] .glass-panel::after {
  background: radial-gradient(circle, rgba(234, 88, 12, 0.16), transparent 70%);
}

/* Code chip — slight gradient on cream */
[data-theme="light"] .code-wrap {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.16), rgba(217, 119, 6, 0.06));
  border-color: rgba(217, 119, 6, 0.40);
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.10);
}
[data-theme="light"] .code-wrap:hover {
  border-color: rgba(217, 119, 6, 0.65);
  box-shadow: 0 8px 20px rgba(217, 119, 6, 0.22);
}

/* Status badge — light variants with gradients */
[data-theme="light"] .status-badge.success {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.18), rgba(217, 119, 6, 0.06));
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .status-badge.info {
  background: linear-gradient(135deg, rgba(234, 88, 12, 0.16), rgba(234, 88, 12, 0.06));
  box-shadow: 0 4px 14px rgba(234, 88, 12, 0.16);
}
[data-theme="light"] .status-badge.warning {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.18), rgba(217, 119, 6, 0.06));
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .status-badge.destructive {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.14), rgba(220, 38, 38, 0.04));
  border-color: rgba(220, 38, 38, 0.36);
  color: #b91c1c;
  box-shadow: 0 4px 14px rgba(220, 38, 38, 0.16);
}

/* Meta cards — cream surface with amber hover */
[data-theme="light"] .meta-item {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .meta-item:hover {
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.40);
  box-shadow: 0 10px 24px rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .meta-item::before {
  background: linear-gradient(180deg, #d97706, rgba(217, 119, 6, 0.25));
}
[data-theme="light"] .meta-item .lbl-icon { color: #b45309; }
[data-theme="light"] .meta-item:hover .lbl-icon { color: #92400e; }
[data-theme="light"] .label { color: #6b5840; }
[data-theme="light"] .val { color: var(--text-primary); }

/* Owner pill — cream card */
[data-theme="light"] .owner-section { border-top-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .owner-pill-hero {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(217, 119, 6, 0.18);
  color: var(--text-primary);
}
[data-theme="light"] .owner-pill-hero:hover {
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .avatar-mini {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.40),
    0 6px 16px rgba(217, 119, 6, 0.35);
}
[data-theme="light"] .owner-pill-hero:hover .avatar-mini {
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.55),
    0 10px 22px rgba(217, 119, 6, 0.50);
}

/* Progress percentage — gradient amber text on cream */
[data-theme="light"] .value {
  background: linear-gradient(135deg, #92400e 0%, #d97706 60%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}

/* Progress fill — gold gradient with glow */
[data-theme="light"] .progress-track {
  background: rgba(40, 25, 10, 0.10);
  box-shadow: inset 0 1px 2px rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .progress-fill.success {
  background: linear-gradient(90deg, #d97706, #c2410c);
  box-shadow: 0 0 14px rgba(217, 119, 6, 0.55);
}
[data-theme="light"] .progress-fill.info {
  background: linear-gradient(90deg, #ea580c, #d97706);
  box-shadow: 0 0 14px rgba(234, 88, 12, 0.50);
}
[data-theme="light"] .progress-fill.warning {
  background: linear-gradient(90deg, #d97706, #b45309);
  box-shadow: 0 0 14px rgba(217, 119, 6, 0.50);
}
[data-theme="light"] .progress-fill.destructive {
  background: linear-gradient(90deg, #dc2626, #d97706);
  box-shadow: 0 0 14px rgba(220, 38, 38, 0.50);
}
[data-theme="light"] .progress-fill::after {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
}

/* Duration meta */
[data-theme="light"] .duration-meta { color: #6b5840; }
[data-theme="light"] .dur-val { color: #b45309; }

/* Mini stats card */
[data-theme="light"] .mini-stats {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.08), rgba(217, 119, 6, 0.02));
  border-color: rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .mini-stats:hover {
  border-color: rgba(217, 119, 6, 0.40);
  box-shadow: 0 10px 30px rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .ms-lbl { color: #b45309; }
[data-theme="light"] .ms-val { color: var(--text-primary); }
[data-theme="light"] .ms-sub-val { color: #92400e; }
[data-theme="light"] .ms-val.low { color: #d97706; }
[data-theme="light"] .ms-val.medium { color: #b45309; }
[data-theme="light"] .ms-val.high { color: #b91c1c; }
</style>
