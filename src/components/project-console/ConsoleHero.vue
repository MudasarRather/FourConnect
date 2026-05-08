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
  background: rgba(30, 30, 33, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 32px;
  backdrop-filter: blur(12px);
  margin-bottom: 24px;
  display: flex; flex-direction: column; gap: 24px;
  position: relative; overflow: hidden; /* For watermark */
}

.hero-header { border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 20px; }
.header-main { display: flex; justify-content: space-between; align-items: flex-start; }

.title-group { display: flex; flex-direction: column; gap: 10px; }

.code-wrap { 
  display: flex; align-items: center; gap: 6px; 
  background: rgba(59, 130, 246, 0.1); padding: 4px 10px; border-radius: 6px; align-self: flex-start;
}
.code-icon { color: #3b82f6; opacity: 0.8; }
.project-code { 
  font-size: 11px; font-weight: 700; color: #3b82f6; 
  letter-spacing: 0.05em;
}

.desc-wrap { display: flex; flex-direction: column; gap: 4px; }
.project-desc {
  font-size: 20px; color: rgba(255, 255, 255, 0.95); font-weight: 500; line-height: 1.4;
  max-width: 800px; margin: 0;
}

.status-group { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.status-lbl { justify-content: flex-end; }

.status-badge {
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
  padding: 6px 14px; border-radius: 20px;
  border: 1px solid transparent;
  display: flex; align-items: center; gap: 8px;
}
.success { color: #4ade80; background: rgba(74, 222, 128, 0.1); border-color: rgba(74, 222, 128, 0.2); }
.info { color: #3b82f6; background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2); }
.warning { color: #fbbf24; background: rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.2); }
.destructive { color: #ef4444; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); }

.completed-stamp { display: none; } /* Remove old style if references exist */




.hero-grid { display: grid; grid-template-columns: 1fr 1fr 300px; gap: 40px; }

/* Col 1: Info */
.info-col { display: flex; flex-direction: column; justify-content: space-between; gap: 24px; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.meta-item { display: flex; flex-direction: column; gap: 4px; }

.label-box { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.lbl-icon { color: rgba(255,255,255,0.4); }
.label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255, 255, 255, 0.4); }

.val { font-size: 13px; font-weight: 500; color: #f5f5f7; padding-left: 18px; }

.owner-section { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px; }
.owner-pill-hero { display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: 500; color: white; }
.avatar-mini { 
  width: 36px; height: 36px; background: #3b82f6; border-radius: 50%; 
  display: flex; align-items: center; justify-content: center; 
  font-size: 12px; font-weight: 700; flex-shrink: 0; 
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
.progress-col { display: flex; flex-direction: column; justify-content: center; }
.label-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
.value { font-size: 14px; font-weight: 700; color: white; }
.progress-track { height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 4px; overflow: hidden; margin-bottom: 12px; }
.progress-fill { height: 100%; border-radius: 4px; transition: width 1s ease; }
.progress-fill.success { background: #4ade80; }
.progress-fill.info { background: #3b82f6; }
.progress-fill.warning { background: #fbbf24; }
.progress-fill.destructive { background: #ef4444; }

.duration-meta { 
  font-size: 12px; display: flex; align-items: center; gap: 6px; 
  opacity: 0.6; margin-bottom: 24px; 
}
.dur-val { font-weight: 500; color: white; }

.mini-stats { display: flex; align-items: center; gap: 24px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; }
.ms-item { display: flex; flex-direction: column; gap: 4px; }
.ms-lbl { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; }
.ms-val { font-size: 12px; font-weight: 700; color: white; padding-left: 0; /* Removed padding */ }
.ms-val-group { display: flex; flex-direction: column; padding-left: 16px; }
.ms-sub-val { font-size: 10px; color: rgba(255,255,255,0.4); font-family: monospace; }
.ms-val.low { color: #4ade80; padding-left: 0; }
.ms-val.medium { color: #fbbf24; padding-left: 0; }
.ms-val.high { color: #ef4444; padding-left: 0; }
.ms-div { width: 1px; height: 24px; background: rgba(255,255,255,0.1); }

/* Col 3: Calendar */
.calendar-col { display: flex; justify-content: center; }
</style>
