<template>
  <div class="glass-card full-h">
    <!-- Header -->
    <div class="card-header">
      <div class="header-left">
        <div class="icon-box"><Activity :size="16" /></div>
        <h3>Project Beat</h3>
      </div>
      <div class="header-right">
         <Loader2 v-if="loading" :size="14" class="animate-spin text-muted" />
         <div v-else-if="activities.length" class="live-dot" title="Live Updates"></div>
      </div>
    </div>

    <!-- Main Content Body -->
    <div class="activity-body">
      
      <!-- 1. Left Column: Timeline Feed -->
      <div class="feed-column">
         <div v-if="activities.length > 0" class="feed-list">
            <div 
               v-for="(act, idx) in activities" 
               :key="act.id" 
               class="feed-item"
               :class="{ active: selectedId === act.id }"
               @mouseenter="selectedId = act.id"
            >
               <!-- Timeline Line -->
               <div class="timeline-track">
                  <div class="dot-casing" :class="getTypeColor(act.type)">
                    <component :is="getMiniIcon(act.type)" :size="10" stroke-width="3" />
                  </div>
                  <div class="line" v-if="idx < activities.length - 1"></div>
               </div>

               <!-- Content -->
               <div class="item-content">
                  <div class="item-header">
                     <span class="user-name">{{ act.user_name }}</span>
                     <span class="time-ago">{{ formatTime(act.timestamp) }}</span>
                  </div>
                  <p class="description">{{ act.description }}</p>
               </div>
            </div>
         </div>

         <!-- Empty State -->
         <div v-else-if="!loading" class="empty-feed">
             <div class="empty-icon-circle">
               <Activity :size="24" class="icon-muted" />
             </div>
             <h4>Quiet on the Western Front</h4>
             <p>No recent activity recorded for this project.</p>
         </div>
      </div>

      <!-- 2. Right Column: Detail Inspector -->
      <div class="inspector-column">
         <transition name="fade" mode="out-in">
            <div v-if="selectedActivity" :key="selectedActivity.id" class="inspector-content">
               <!-- Inspector Header -->
               <div class="inspector-hero" :class="getTypeBgClass(selectedActivity.type)">
                  <component :is="getTypeIcon(selectedActivity.type)" :size="24" class="hero-icon" />
                  <div class="hero-meta">
                     <span class="hero-type">{{ formatType(selectedActivity.type) }}</span>
                     <span class="hero-time">{{ new Date(selectedActivity.timestamp.endsWith('Z') ? selectedActivity.timestamp : selectedActivity.timestamp + 'Z').toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) }}</span>
                  </div>
               </div>

               <!-- Inspector Details -->
               <div class="inspector-body">
                  <p class="full-desc">
                    <span class="u-bold">{{ selectedActivity.user_name }}</span> 
                    {{ selectedActivity.description }}
                  </p>

                  <div class="data-grid" v-if="selectedActivity.details">
                     <div v-for="(val, key) in selectedActivity.details" :key="key" class="data-row">
                        <span class="d-label">{{ formatKey(key) }}</span>
                        <div class="d-dash"></div>
                        <span class="d-value">{{ val || '—' }}</span>
                     </div>
                  </div>
               </div>
            </div>
            
            <!-- Nothing Selected State (Right Side) -->
            <div v-else class="inspector-placeholder">
               <div class="ph-content">
                  <div class="ph-lines">
                    <div class="ph-line"></div>
                    <div class="ph-line short"></div>
                  </div>
                  <span>Hover over an event to inspect details</span>
               </div>
            </div>
         </transition>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { Activity, Loader2, Check, Plus, User, Shield, FileText, Zap } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const props = defineProps({
  projectId: { type: String, default: null }
})

// Fallback to route params if prop not provided
const targetId = computed(() => props.projectId || route.params.id || route.query.id)

const isAdmin = computed(() => route.path.startsWith('/admin'))
const token = computed(() => isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token'))

const activities = ref([])
const loading = ref(false)
const selectedId = ref(null)

const selectedActivity = computed(() => activities.value.find(a => a.id === selectedId.value) || activities.value[0])

const fetchActivity = async () => {
   if (!targetId.value) return
   loading.value = true
   try {
      const res = await axios.get(`http://localhost:8000/api/projects/${targetId.value}/activity`, {
          headers: { Authorization: `Bearer ${token.value}` }
      })
      activities.value = res.data
      if (activities.value.length > 0 && !selectedId.value) {
          selectedId.value = activities.value[0].id
      }
   } catch (e) {
      console.error("Failed to fetch activity", e)
   } finally {
      loading.value = false
   }
}

watch(targetId, (newVal) => {
    if (newVal) fetchActivity()
})

onMounted(() => {
   fetchActivity()
   setInterval(fetchActivity, 15000) // Poll faster for "Live" feel
})

// Visual Helpers
const formatTime = (ts) => {
   if (!ts) return ''
   // Force UTC interpretation if missing 'Z' or offset
   const timeStr = ts.endsWith('Z') || ts.includes('+') ? ts : `${ts}Z`
   
   const d = new Date(timeStr)
   const now = new Date() // Local
   const diff = (now - d) / 1000 
   
   if (diff < 60) return 'Just now'
   if (diff < 3600) return `${Math.floor(diff/60)}m`
   if (diff < 86400) return `${Math.floor(diff/3600)}h`
   return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const getTypeColor = (t) => {
   if (t.includes('completed')) return 'success'
   if (t.includes('created') || t.includes('joined')) return 'info'
   if (t.includes('admin') || t.includes('deleted')) return 'alert'
   if (t.includes('update')) return 'warning' // New Color for updates
   return 'neutral'
}

const getTypeBgClass = (t) => {
    const c = getTypeColor(t)
    return `bg-gradient-${c}`
}

const getTypeIcon = (t) => {
   if (t.includes('completed')) return Check
   if (t.includes('created')) return FileText
   if (t.includes('member')) return User
   if (t.includes('admin')) return Shield
   if (t.includes('update')) return FileText // Or Edit icon if available
   return Zap
}

const getMiniIcon = (t) => {
    // Simplified icons for the timeline dots
   if (t.includes('completed')) return Check
   if (t.includes('created')) return Plus
   return Activity
}

const formatType = (t) => t.replace(/_/g, ' ').toUpperCase()
const formatKey = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

</script>

<style scoped>
/* ========== LAYOUT ========== */
.glass-card {
  background: rgba(30, 30, 33, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  overflow: hidden;
  display: flex; flex-direction: column;
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
.full-h { height: 100%; }

.card-header {
  padding: 20px 24px;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
}
.header-left { display: flex; align-items: center; gap: 12px; }
.header-left h3 { font-size: 15px; font-weight: 600; color: #fff; margin: 0; letter-spacing: -0.01em; }

.icon-box {
  width: 32px; height: 32px; background: rgba(255, 255, 255, 0.08);
  border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #d4d4d8;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
}

.live-dot {
    width: 8px; height: 8px; background: #22c55e; border-radius: 50%;
    box-shadow: 0 0 10px #22c55e;
    animation: pulse 2s infinite;
}
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

/* ========== BODY (Split View) ========== */
.activity-body {
  display: flex;
  flex: 1;
  overflow: hidden; /* Prevent body scroll */
}

/* LEFT: FEED */
.feed-column {
  flex: 5; /* 50% ish */
  border-right: 1px solid rgba(255,255,255,0.05);
  overflow-y: auto;
  position: relative;
  background: rgba(0,0,0,0.1);
}

.feed-list { padding: 8px 0; }

.feed-item {
  display: flex;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  position: relative;
}
.feed-item:hover { background: rgba(255, 255, 255, 0.04); }
.feed-item.active { background: rgba(255, 255, 255, 0.07); }
.feed-item.active::after {
    content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 3px; background: #3b82f6;
    box-shadow: -2px 0 10px rgba(59, 130, 246, 0.5);
}

.timeline-track {
  display: flex; flex-direction: column; align-items: center; width: 24px; margin-right: 16px;
}
.dot-casing {
  width: 20px; height: 20px; border-radius: 50%; 
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: rgba(0,0,0,0.6); margin-top: 2px;
  z-index: 2;
  border: 2px solid rgba(40,40,43,1); /* Fake cut-out effect */
}
/* Colors */
.dot-casing.success { background: #4ade80; color: #003300; box-shadow: 0 0 10px rgba(74, 222, 128, 0.2); }
.dot-casing.info { background: #60a5fa; color: #001e3c; box-shadow: 0 0 10px rgba(96, 165, 250, 0.2); }
.dot-casing.alert { background: #f43f5e; color: #3f0012; box-shadow: 0 0 10px rgba(244, 63, 94, 0.2); }
.dot-casing.neutral { background: #a1a1aa; color: #18181b; }

.line { width: 1px; flex: 1; background: rgba(255,255,255,0.1); margin: 4px 0; min-height: 24px; }

.item-content { flex: 1; min-width: 0; }
.item-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }

.user-name { font-size: 13px; font-weight: 600; color: #f5f5f7; }
.time-ago { font-size: 11px; color: rgba(255,255,255,0.3); font-variant-numeric: tabular-nums; }
.description { font-size: 12px; color: rgba(255,255,255,0.6); margin: 0; line-height: 1.4; 
   display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

/* EMPTY FEED */
.empty-feed {
    padding: 60px 40px; text-align: center;
}
.empty-icon-circle {
    width: 60px; height: 60px; background: rgba(255,255,255,0.03); border-radius: 50%;
    display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
    border: 1px solid rgba(255,255,255,0.05);
}
.empty-feed h4 { margin: 0 0 6px; font-size: 14px; font-weight: 600; color: #fff; }
.empty-feed p { margin: 0; font-size: 13px; color: rgba(255,255,255,0.4); }

/* RIGHT: INSPECTOR Column */
.inspector-column {
  flex: 4; /* 40% ish */
  background: rgba(30, 30, 33, 0.2);
  display: flex; flex-direction: column;
}

.inspector-content { flex: 1; display: flex; flex-direction: column; animation: fadeIn 0.2s ease-out; }

.inspector-hero {
    padding: 12px 16px; /* Ultra Compact */
    display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}
.bg-gradient-success { background: radial-gradient(circle at top, rgba(74, 222, 128, 0.15), transparent 70%); }
.bg-gradient-info { background: radial-gradient(circle at top, rgba(96, 165, 250, 0.15), transparent 70%); }
.bg-gradient-alert { background: radial-gradient(circle at top, rgba(244, 63, 94, 0.15), transparent 70%); }
.bg-gradient-warning { background: radial-gradient(circle at top, rgba(250, 204, 21, 0.15), transparent 70%); }
.bg-gradient-neutral { background: radial-gradient(circle at top, rgba(161, 161, 170, 0.1), transparent 70%); }

.hero-icon { color: white; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3)); transform: scale(0.9); }
.hero-meta { display: flex; flex-direction: column; gap: 0px; }
.hero-type { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.5); }
.hero-time { font-size: 11px; color: rgba(255,255,255,0.8); }

.inspector-body { padding: 12px 16px; flex: 1; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
.full-desc { 
  font-size: 13px; line-height: 1.45; color: #d4d4d8; margin-bottom: 16px;
  word-break: break-word; overflow-wrap: anywhere; /* Aggressive wrap */
}
.u-bold { color: white; font-weight: 600; }

.data-grid { display: flex; flex-direction: column; gap: 10px; }
.data-row { display: flex; align-items: baseline; font-size: 11px; }
.d-label { color: rgba(255,255,255,0.4); white-space: nowrap; }
.d-dash { flex: 1; border-bottom: 1px dashed rgba(255,255,255,0.1); margin: 0 8px; position: relative; top: -3px; }
.d-value { color: #fff; font-weight: 500; text-align: right; }

/* PLACEHOLDER */
.inspector-placeholder { 
    height: 100%; display: flex; align-items: center; justify-content: center; 
    color: rgba(255,255,255,0.2); 
}
.ph-content { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.ph-lines { display: flex; flex-direction: column; gap: 6px; align-items: center; margin-bottom: 8px; }
.ph-line { width: 40px; height: 2px; background: rgba(255,255,255,0.1); border-radius: 2px; }
.ph-line.short { width: 24px; }

/* SCROLLBARS */
/* Hide scrollbars but allow scrolling */
.feed-column, .inspector-body {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none;  /* IE 10+ */
}
.feed-column::-webkit-scrollbar,
.inspector-body::-webkit-scrollbar { 
  display: none; width: 0; background: transparent; 
}

@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
</style>
