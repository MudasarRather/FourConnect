<template>
  <div class="glass-card">
    <div class="card-header">
      <div class="header-left">
        <div class="icon-box"><FolderOpen :size="16" /></div>
        <h3>Files</h3>
        <span class="counter">{{ allFiles.length }}</span>
      </div>
    </div>

    <div class="files-content-scroll">
       <a 
          v-for="(f, i) in allFiles" 
          :key="i" 
          class="file-item"
          :href="getFileUrl(f.path)"
          target="_blank"
       >
          <div class="f-icon">
            <FileText v-if="f.type === 'order'" :size="16" />
            <Flag v-else :size="16" class="milestone-icon" />
          </div>
          <div class="f-info">
             <div class="f-top">
                <span class="f-name">{{ f.name }}</span>
                <span class="f-size">{{ f.size }}</span>
             </div>
             <div class="f-bottom">
                <span class="f-meta">{{ f.desc }}</span>
                <span class="dot">•</span>
                <span class="f-date">{{ formatDate(f.date) }}</span>
                <span class="dot">•</span>
                <span class="f-uploader">{{ f.uploader }}</span>
             </div>
          </div>
          <Download :size="14" class="dl-icon" />
       </a>

       <div v-if="allFiles.length === 0" class="empty-state">
          <span class="empty-text">No files available</span>
       </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { FolderOpen, FileText, Download, Flag } from 'lucide-vue-next'

const props = defineProps({
  project: Object,
  milestones: Array
})

// Compute aggregated files list
const allFiles = computed(() => {
  const list = []
  
  // 1. Project Order
  if (props.project && props.project.project_order_path) {
    list.push({
      name: 'Project Order.pdf',
      desc: 'Project Initiation Document',
      path: props.project.project_order_path,
      type: 'order',
      date: props.project.created_at,
      size: props.project.file_size || 'Unknown',
      uploader: props.project.uploaded_by || 'System'
    })
  }

  // 2. Milestone Files
  if (props.milestones) {
    props.milestones.forEach(m => {
      if (m.file_path) {
        list.push({
          name: `${m.name}.pdf`, // Or extract filename
          desc: `Milestone: ${m.name}`,
          path: m.file_path,
          type: 'milestone',
          date: m.created_at,
          size: m.file_size || 'Unknown',
          uploader: m.uploaded_by || 'System'
        })
      }
    })
  }
  
  return list
})

const getFileUrl = (path) => {
  if (!path) return '#'
  // Normalize path separators
  const safePath = path.replace(/\\/g, '/')
  return `http://localhost:8000/${safePath}`
}

const formatDate = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<style scoped>
.glass-card {
  background: rgba(30, 30, 33, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(12px);
  display: flex; flex-direction: column;
  height: 100%; /* Fill grid cell */
  overflow: hidden; /* For scroll */
}

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0; }
.header-left { display: flex; align-items: center; gap: 10px; }
.icon-box { 
  width: 28px; height: 28px; background: rgba(255, 255, 255, 0.05); 
  border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #a1a1aa;
}
h3 { font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.9); margin: 0; }
.counter { font-size: 11px; font-weight: 700; background: rgba(255, 255, 255, 0.1); padding: 2px 6px; border-radius: 8px; color: #d4d4d8; }

/* Custom Scroll Container */
.files-content-scroll {
  display: flex; flex-direction: column; gap: 8px;
  overflow-y: auto;
  flex: 1; /* Take remaining height */
  padding-right: 4px; /* Space for scrollbar */
}

/* Scrollbar Styling */
.files-content-scroll::-webkit-scrollbar { width: 4px; }
.files-content-scroll::-webkit-scrollbar-track { background: transparent; }
.files-content-scroll::-webkit-scrollbar-thumb { 
  background: rgba(255, 255, 255, 0.1); border-radius: 10px; 
}
.files-content-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

.file-item { 
  display: flex; align-items: center; gap: 12px; padding: 10px; 
  border-radius: 10px; transition: all 0.2s;
  text-decoration: none; border: 1px solid transparent;
}
.file-item:hover { 
  background: rgba(255, 255, 255, 0.04); 
  border-color: rgba(255,255,255,0.05);
}

.f-icon { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: rgba(245, 158, 11, 0.10); border: 1px solid rgba(245, 158, 11, 0.22); border-radius: 8px; color: #fbbf24; flex-shrink: 0; }
.milestone-icon { color: #fdba74; } /* Warm orange for milestones */
.file-item:hover .f-icon { background: rgba(245, 158, 11, 0.18); }

.f-info { display: flex; flex-direction: column; flex: 1; overflow: hidden; gap: 2px; }
.f-top { display: flex; justify-content: space-between; align-items: center; }
.f-bottom { display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,0.4); overflow: hidden; white-space: nowrap; }

.f-name { font-size: 13px; color: #e4e4e7; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-size { font-size: 10px; color: rgba(255,255,255,0.3); font-family: monospace; background: rgba(255,255,255,0.05); padding: 1px 4px; border-radius: 4px; }
.f-meta { overflow: hidden; text-overflow: ellipsis; }
.dot { font-size: 8px; opacity: 0.3; }

.dl-icon { opacity: 0; transform: translateX(-5px); transition: all 0.2s; color: rgba(255,255,255,0.6); }
.file-item:hover .dl-icon { opacity: 1; transform: translateX(0); }

.empty-state {
  flex: 1; display: flex; align-items: center; justify-content: center;
  opacity: 0.3; font-size: 12px; font-style: italic; min-height: 100px;
}

/* ═════════════════ LIGHT THEME OVERRIDES — CardFiles ═════════════════ */
[data-theme="light"] .glass-card {
  background: rgba(255, 250, 240, 0.85);
  border: 1px solid rgba(40, 25, 10, 0.10);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  box-shadow: 0 4px 20px rgba(40, 25, 10, 0.04);
}
[data-theme="light"] .card-header {
  border-bottom: 1px solid rgba(40, 25, 10, 0.08);
  padding-bottom: 16px;
}
[data-theme="light"] .icon-box {
  background: rgba(217, 119, 6, 0.12);
  color: #92400e;
}
[data-theme="light"] h3 {
  color: var(--text-primary);
}
[data-theme="light"] .counter {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
  font-weight: 700;
}
[data-theme="light"] .files-content-scroll::-webkit-scrollbar-thumb {
  background: rgba(40, 25, 10, 0.18);
}
[data-theme="light"] .files-content-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(40, 25, 10, 0.30);
}
[data-theme="light"] .file-item {
  border-bottom: 1px solid rgba(40, 25, 10, 0.06);
  border-radius: 10px;
}
[data-theme="light"] .file-item:hover {
  background: rgba(40, 25, 10, 0.06);
  border-color: rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .f-icon {
  background: rgba(217, 119, 6, 0.12);
  border: 1px solid rgba(217, 119, 6, 0.28);
  color: #92400e;
}
[data-theme="light"] .milestone-icon {
  color: #b45309;
}
[data-theme="light"] .file-item:hover .f-icon {
  background: rgba(217, 119, 6, 0.20);
}
[data-theme="light"] .f-name {
  color: var(--text-primary);
  font-weight: 600;
}
[data-theme="light"] .f-size {
  background: rgba(217, 119, 6, 0.10);
  color: #92400e;
  font-weight: 600;
}
[data-theme="light"] .f-bottom {
  color: #6b5840;
}
[data-theme="light"] .dot {
  color: #92400e;
  opacity: 0.6;
}
[data-theme="light"] .dl-icon {
  color: #92400e;
}
[data-theme="light"] .empty-state {
  color: #92400e;
  opacity: 1;
}
[data-theme="light"] .empty-text {
  color: #92400e;
}
</style>
