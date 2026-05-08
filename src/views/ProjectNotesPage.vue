<template>
  <div class="notes-page-container">
    
    <!-- HEADER SECTION (matches Financials design) -->
    <header class="glass-header">
       <div class="header-content">
          <div class="project-identity">
             <div class="project-icon-box" v-if="selectedProject">
                {{ selectedProject.name.charAt(0) }}
             </div>
             <div class="identity-text">
                <label>Project Notes</label>
                <div class="project-selector" v-click-outside="() => switcherOpen = false">
                   <h1 @click="switcherOpen = !switcherOpen">
                     {{ selectedProject?.name || 'Select Project' }}
                     <ChevronDown :size="18" class="chevron" :class="{ open: switcherOpen }" />
                   </h1>
                   
                   <transition name="scale-fade">
                      <div v-if="switcherOpen" class="project-dropdown">
                         <div class="search-wrap">
                            <Search :size="14" />
                            <input v-model="projectSearch" placeholder="Filter projects..." autofocus />
                         </div>
                         <div class="dropdown-scroll">
                            <button 
                              v-for="p in filteredProjects" :key="p.id" 
                              class="dropdown-item"
                              :class="{ active: selectedProject?.id === p.id }"
                              @click="selectProject(p)"
                            >
                               <span class="p-icon">{{ p.name.charAt(0) }}</span>
                               <span class="p-name">{{ p.name }}</span>
                               <Check v-if="selectedProject?.id === p.id" :size="14" class="p-check" />
                            </button>
                         </div>
                      </div>
                   </transition>
                </div>
             </div>
          </div>

          <!-- Header Actions -->
          <div class="header-actions">
             <div class="mini-metric" v-if="notesCount > 0">
                <StickyNote :size="14" />
                <span class="value">{{ notesCount }}</span>
                <span class="label">Notes</span>
             </div>
             <button class="action-btn add-note-btn" @click="createNewNote()">
                <Plus :size="16" />
                Add Note
             </button>
          </div>
       </div>

       <!-- TYPE TABS -->
       <div class="tabs-dock">
          <button 
            v-for="tab in typeTabs" 
            :key="tab.id"
            class="dock-item"
            :class="{ active: currentType === tab.id }"
            @click="currentType = tab.id"
          >
            <component :is="tab.icon" :size="16" />
            <span>{{ tab.label }}</span>
            <span class="tab-count" v-if="tab.count > 0">{{ tab.count }}</span>
            <div class="active-glow" v-if="currentType === tab.id"></div>
          </button>
       </div>
    </header>

    <!-- TOOLBAR -->
    <div class="notes-toolbar" v-if="selectedProject">
       <div class="toolbar-left">
          <div class="search-input">
             <Search :size="14" />
             <input v-model="searchQuery" placeholder="Search notes..." @input="debouncedFetch" />
          </div>
       </div>
       <div class="toolbar-right">
          <!-- Custom Sort Dropdown -->
          <div class="custom-select" v-click-outside="() => sortOpen = false">
             <button class="select-trigger" @click="sortOpen = !sortOpen">
                {{ sortLabels[sortMode] }}
                <ChevronDown :size="14" class="sel-chevron" :class="{ open: sortOpen }" />
             </button>
             <div class="select-options" v-if="sortOpen">
                <div class="option" :class="{ active: sortMode === 'newest' }" @click="setSort('newest')">Newest First</div>
                <div class="option" :class="{ active: sortMode === 'oldest' }" @click="setSort('oldest')">Oldest First</div>
                <div class="option" :class="{ active: sortMode === 'pinned' }" @click="setSort('pinned')">Pinned First</div>
             </div>
          </div>
          <button class="filter-chip" :class="{ active: filterLocked }" @click="filterLocked = !filterLocked; fetchNotes()">
             <Lock :size="12" /> Locked
          </button>
          <button class="filter-chip" :class="{ active: filterPinned }" @click="filterPinned = !filterPinned; fetchNotes()">
             <Pin :size="12" /> Pinned
          </button>
       </div>
    </div>

    <!-- NOTES GRID -->
    <main class="main-canvas" v-if="selectedProject && !isPending">
       <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading notes...</p>
       </div>
       <div v-else-if="notes.length === 0" class="empty-notes">
          <div class="empty-icon">
             <StickyNote :size="40" />
          </div>
          <h3>No notes yet</h3>
          <p>Create a note to get started via the button above</p>
       </div>
       <div v-else class="notes-grid">
          <NoteCard 
            v-for="note in notes" 
            :key="note.id"
            :note="note"
            :token="token"
            :is-admin="isAdmin"
            :is-editing="editingNoteId === note.id"
            @edit-start="editingNoteId = note.id"
            @edit-end="editingNoteId = null"
            @update="handleNoteUpdate"
            @delete="handleNoteDelete(note)"
            @lock="handleNoteLock(note)"
           />
       </div>

       <!-- Pagination -->
       <div class="pagination" v-if="totalPages > 1">
          <button :disabled="page <= 1" @click="page--; fetchNotes()">
             <ChevronLeft :size="16" />
          </button>
          <span class="page-info">Page {{ page }} of {{ totalPages }}</span>
          <button :disabled="page >= totalPages" @click="page++; fetchNotes()">
             <ChevronRight :size="16" />
          </button>
       </div>
    </main>

    <!-- ACCESS RESTRICTED STATE -->
    <div v-else-if="selectedProject && isPending" class="empty-container">
       <div class="empty-box flex-layout">
         <div class="icon-glow">
            <ShieldAlert :size="40" class="text-yellow-500" />
         </div>
         <h2 class="mt-4 text-xl font-semibold">Access Restricted</h2>
         <p class="text-base opacity-70 mb-4 max-w-md mx-auto">
            You must accept the team invitation to view this project's notes.
         </p>
         <button class="action-btn primary" @click="$router.push(`/user/projects/assignteam`)">
             Respond to Invitation
         </button>
       </div>
    </div>

    <ConfirmDialog 
       :is-open="showConfirm"
       :title="confirmTitle"
       :message="confirmMessage"
       :confirm-text="confirmButtonText"
       @confirm="handleConfirm"
       @cancel="showConfirm = false"
     />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { 
  ChevronDown, ChevronLeft, ChevronRight, Search, Check, Plus,
  StickyNote, FileText, DollarSign, Lock, Eye, BarChart3,
  Archive, Pin, Shield, ShieldAlert
} from 'lucide-vue-next'
import NoteCard from '../components/notes/NoteCard.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import NotificationBell from '../components/ui/NotificationBell.vue'
import { useToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const isAdmin = computed(() => route.path.startsWith('/admin'))
const token = computed(() => {
  const adminT = localStorage.getItem('admin_token')
  const userT = localStorage.getItem('user_token')
  return isAdmin.value ? (adminT || userT) : (userT || adminT)
})

const isPending = computed(() => {
    return selectedProject.value && selectedProject.value.current_user_membership_status === 'pending'
})

// State
const projects = ref([])
const selectedProject = ref(null)
const switcherOpen = ref(false)
const projectSearch = ref('')
const currentType = ref('all')
const searchQuery = ref('')
const sortMode = ref('newest')
const filterLocked = ref(false)
const filterPinned = ref(false)
const notes = ref([])
const notesCount = ref(0)
const totalPages = ref(1)
const page = ref(1)
const loading = ref(false)
const currentUserId = ref(null)
const showConfirm = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmButtonText = ref('Confirm')
const confirmAction = ref(null)
const noteToDelete = ref(null)
const editingNoteId = ref(null)
const sortOpen = ref(false)
const sortLabels = { newest: 'Newest First', oldest: 'Oldest First', pinned: 'Pinned First' }

const { success, error, info } = useToast()

const typeTabs = computed(() => {
  const counts = { all: notesCount.value }
  notes.value.forEach(n => {
    counts[n.note_type] = (counts[n.note_type] || 0) + 1
  })
  return [
    { id: 'all', label: 'All', icon: StickyNote, count: 0 },
    { id: 'general', label: 'General', icon: FileText, count: 0 },
    { id: 'financial', label: 'Financial', icon: DollarSign, count: 0 },
    { id: 'private', label: 'Private', icon: Lock, count: 0 },
    { id: 'audit', label: 'Audit', icon: Shield, count: 0 },
    { id: 'other', label: 'Other', icon: Archive, count: 0 },
  ]
})

const filteredProjects = computed(() => {
  if (!projectSearch.value) return projects.value
  return projects.value.filter(p => p.name.toLowerCase().includes(projectSearch.value.toLowerCase()))
})

// Fetch projects
const fetchProjects = async () => {
   try {
      const response = await axios.get('http://localhost:8000/api/projects/', {
         headers: { Authorization: `Bearer ${token.value}` }
      })
      projects.value = response.data.items || response.data || []
      
      if (route.query.projectId) {
         const p = projects.value.find(p => p.id === route.query.projectId)
         if (p) selectProject(p)
      } else if (projects.value.length > 0) {
         selectProject(projects.value[0])
      }
   } catch (e) {
      console.error("Failed to fetch projects", e)
   }
}

// Fetch current user
const fetchCurrentUser = async () => {
   try {
      const res = await axios.get('http://localhost:8000/api/auth/me', {
         headers: { Authorization: `Bearer ${token.value}` }
      })
      currentUserId.value = res.data.id
   } catch (e) {}
}

const selectProject = async (project) => {
   selectedProject.value = project
   switcherOpen.value = false
   router.replace({ query: { ...route.query, projectId: project.id } })
   
   // Fetch full details to get membership status
   try {
     const res = await axios.get(`http://localhost:8000/api/projects/${project.id}`, {
         headers: { Authorization: `Bearer ${token.value}` }
     })
     selectedProject.value = res.data
   } catch (e) {
     console.warn("Failed to fetch full project details", e)
   }

   page.value = 1
   await fetchNotes()
   startPolling()
}

// Fetch notes
const fetchNotes = async (silent = false) => {
   if (!selectedProject.value) return
   if (!silent) loading.value = true
   try {
      const params = {
         token: token.value,
         sort: sortMode.value,
         page: page.value,
         page_size: 20,
      }
      if (currentType.value !== 'all') params.note_type = currentType.value
      if (searchQuery.value) params.search = searchQuery.value
      if (filterLocked.value) params.is_locked = true
      if (filterPinned.value) params.is_pinned = true

      const res = await axios.get(
        `http://localhost:8000/api/project-notes/${selectedProject.value.id}/notes`,
        { params }
      )
      if (!silent) {
         notes.value = res.data.items || []
         notesCount.value = res.data.total || 0
      } else {
         // Smart Merge: Don't overwrite the note being edited
         const newItems = res.data.items || []
         notes.value = newItems.map(newNote => {
             // If this note is currently being edited, keep our local version (with user's unsaved changes/focus)
             if (newNote.id === editingNoteId.value) {
                 const current = notes.value.find(n => n.id === newNote.id)
                 return current || newNote
             }
             return newNote
         })
         notesCount.value = res.data.total || 0
      }
      totalPages.value = Math.ceil(notesCount.value / 20) || 1
   } catch (e) {
      console.error("Failed to fetch notes", e)
      if (!silent) notes.value = []
   } finally {
      loading.value = false
   }
}

// Polling
let pollInterval = null

const startPolling = () => {
  stopPolling()
  pollInterval = setInterval(() => {
    if (selectedProject.value && !document.hidden) {
       fetchNotes(true)
    }
  }, 2000)
}

const stopPolling = () => {
  if (pollInterval) clearInterval(pollInterval)
}

// const fetchMentions = async () => {
//    if (!selectedProject.value) return
//    try {
//       const res = await axios.get(
//         `http://localhost:8000/api/project-notes/${selectedProject.value.id}/notes/mentions`,
//         { params: { token: token.value } }
//       )
//       mentionsList.value = res.data || []
//    } catch (e) {}
// }

// Watch type tab change
watch(currentType, (newType) => {
   if (newType === 'audit' && !isAdmin.value) {
      info('Audit notes are system generated. Admins can create notes here.')
   }
   page.value = 1
   fetchNotes()
})

// Debounced search
let searchTimeout = null
const debouncedFetch = () => {
   clearTimeout(searchTimeout)
   searchTimeout = setTimeout(() => {
      page.value = 1
      fetchNotes()
   }, 300)
}

// Actions
const setSort = (mode) => {
   sortMode.value = mode
   sortOpen.value = false
   fetchNotes()
}

const createNewNote = async () => {
   if (!selectedProject.value) return
   
   // Block audit note creation for non-admins
   if (currentType.value === 'audit' && !isAdmin.value) {
       info('Audit notes are system generated and admin can create notes in audit tab')
       return
   }

   try {
      // Use currentType if it's a specific type (not 'all'), otherwise default to 'general'
      const typeToCreate = (currentType.value && currentType.value !== 'all') ? currentType.value : 'general'
      
      const payload = { title: 'New Note', content: '', note_type: typeToCreate }
      const res = await axios.post(
         `http://localhost:8000/api/project-notes/${selectedProject.value.id}/notes`,
         payload,
         { params: { token: token.value } }
      )
      // Prepend new note and maybe trigger edit mode automatically?
      // NoteCard handles edit mode locally. We might need a way to tell it to open.
      // For now, simpler: just add it, user clicks it to edit.
      // OR: refetch to be sure.
      notes.value.unshift(res.data)
      notesCount.value++
   } catch (e) {
      alert('Failed to create note')
   }
}

const handleNoteUpdate = (updatedNote) => {
   const text = updatedNote.title.toLowerCase() + (updatedNote.content || '').toLowerCase()
   if (searchQuery.value && !text.includes(searchQuery.value.toLowerCase())) {
       // Filtered out
       notes.value = notes.value.filter(n => n.id !== updatedNote.id)
       return
   }
   
   const idx = notes.value.findIndex(n => n.id === updatedNote.id)
   if (idx !== -1) {
      notes.value[idx] = updatedNote
   } else {
      // Logic for new note if we were reloading list
      notes.value.unshift(updatedNote)
   }
}

const handleNoteDelete = (note) => {
   noteToDelete.value = note
   confirmTitle.value = 'Delete Note'
   confirmMessage.value = `Are you sure you want to delete '${note.title}'?`
   confirmButtonText.value = 'Delete'
   confirmAction.value = executeDelete
   showConfirm.value = true
}

const handleConfirm = () => {
   if (confirmAction.value) confirmAction.value()
   showConfirm.value = false
}

const executeDelete = async () => {
   if (!noteToDelete.value) return
   try {
      await axios.delete(
        `http://localhost:8000/api/project-notes/${selectedProject.value.id}/notes/${noteToDelete.value.id}`,
        { params: { token: token.value } }
      )
      notes.value = notes.value.filter(n => n.id !== noteToDelete.value.id)
      notesCount.value--
      noteToDelete.value = null
      success('Note deleted successfully')
   } catch (e) {
      error(e.response?.data?.detail || 'Failed to delete')
   }
}

const handleNoteLock = (note) => {
   if (note.is_locked) {
      // Unlock immediately (or add dialog if needed, but not requested)
      executeLock(note)
   } else {
      // Lock with warning
      confirmTitle.value = 'Lock Note'
      confirmMessage.value = 'This action is irreversible. You will not be able to edit this note again.'
      confirmButtonText.value = 'Lock Note'
      confirmAction.value = () => executeLock(note)
      showConfirm.value = true
   }
}

const executeLock = async (note) => {
   try {
      await axios.patch(
         `http://localhost:8000/api/project-notes/${selectedProject.value.id}/notes/${note.id}/lock`,
         null,
         { params: { token: token.value } }
      )
      handleNoteUpdate({ ...note, is_locked: !note.is_locked })
      success(!note.is_locked ? 'Note locked' : 'Note unlocked')
   } catch (e) {
      if (e.response?.status === 403) {
         error("You cannot lock someone else's note")
      } else {
         error('Failed to update lock status')
      }
   }
}

const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = function(event) {
      if (!(el === event.target || el.contains(event.target))) binding.value(event, el);
    };
    document.body.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el) { document.body.removeEventListener('click', el.clickOutsideEvent); }
};

onMounted(() => {
   fetchProjects()
   fetchCurrentUser()
   // If page is already loaded with project, start polling
   if (selectedProject.value) startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
/* PAGE CONTAINER */
.notes-page-container {
  min-height: 100vh;
  color: #f5f5f7;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow-x: hidden;
}

/* HEADER (matches financials) */
.glass-header {
  position: sticky; top: 0; z-index: 50;
  background: rgba(9, 9, 11, 0.7); backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0 40px;
}

.header-content {
  height: 80px; display: flex; align-items: center; justify-content: space-between;
}

.project-identity { display: flex; align-items: center; gap: 16px; }
.project-icon-box {
  width: 40px; height: 40px; background: linear-gradient(135deg, #f59e0b, #ef4444);
  border-radius: 12px; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 18px; color: white; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.identity-text { display: flex; flex-direction: column; gap: 2px; }
.identity-text label {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255, 255, 255, 0.4); font-weight: 600;
}
.project-selector { position: relative; }
.project-selector h1 {
  font-size: 20px; font-weight: 700; margin: 0; cursor: pointer; display: flex; align-items: center; gap: 8px;
  transition: opacity 0.2s;
}
.project-selector h1:hover { opacity: 0.8; }
.chevron { opacity: 0.4; transition: transform 0.2s; }
.chevron.open { transform: rotate(180deg); opacity: 1; }

/* PROJECT DROPDOWN */
.project-dropdown {
  position: absolute; top: 100%; left: -10px; margin-top: 12px; width: 300px;
  background: #18181b; border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px; padding: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); z-index: 100;
}
.search-wrap {
  display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05);
  padding: 8px 12px; border-radius: 8px; margin-bottom: 8px;
}
.search-wrap input { background: transparent; border: none; outline: none; color: white; width: 100%; font-size: 13px; }
.dropdown-scroll { max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.dropdown-item {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  background: transparent; border: none; color: #a1a1aa; cursor: pointer;
  border-radius: 8px; transition: all 0.2s; text-align: left;
}
.dropdown-item:hover { background: rgba(255,255,255,0.05); color: white; }
.dropdown-item.active { background: #27272a; color: white; }
.p-icon { 
  width: 24px; height: 24px; background: rgba(255,255,255,0.1); border-radius: 6px; 
  display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; 
}
.p-name { flex: 1; font-size: 13px; font-weight: 500; }
.p-check { color: #f59e0b; }

/* HEADER ACTIONS */
.header-actions { display: flex; align-items: center; gap: 20px; }
.mini-metric { display: flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(255,255,255,0.5); }
.mini-metric .value { font-family: 'SF Mono', monospace; font-weight: 700; color: #f59e0b; font-size: 16px; }

.action-btn {
  background: white; color: black; border: none; padding: 8px 16px; border-radius: 20px;
  font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; cursor: pointer;
  transition: all 0.15s;
}
.action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,255,255,0.2); }
.add-note-btn { 
  background: #f59e0b; color: #000;
  box-shadow: none;
}
.add-note-btn:hover { background: #d97706; transform: none; box-shadow: none; }

/* TABS DOCK */
.tabs-dock {
  display: flex; gap: 24px; padding-bottom: 0px; margin-top: 4px; border-bottom: 1px solid transparent;
}
.dock-item {
  background: transparent; border: none; padding: 12px 4px; color: rgba(255,255,255,0.5);
  font-size: 13px; font-weight: 500; cursor: pointer; position: relative;
  display: flex; align-items: center; gap: 8px; transition: color 0.2s;
}
.dock-item:hover { color: rgba(255,255,255,0.8); }
.dock-item.active { color: white; font-weight: 600; }
.tab-count {
  font-size: 10px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 8px;
  font-weight: 600; min-width: 18px; text-align: center;
}
.active-glow {
  position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px;
  background: #f59e0b; box-shadow: 0 -2px 8px rgba(245, 158, 11, 0.5);
  border-radius: 2px 2px 0 0;
}

/* TOOLBAR */
.notes-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 40px; border-bottom: 1px solid rgba(255,255,255,0.05);
}
.toolbar-left { display: flex; gap: 12px; flex: 1; }
.search-input {
  display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05);
  padding: 8px 14px; border-radius: 10px; width: 100%; max-width: 320px;
  border: 1px solid rgba(255,255,255,0.08);
  transition: border-color 0.2s;
}
.search-input:focus-within { border-color: rgba(245,158,11,0.4); }
.search-input input { background: transparent; border: none; outline: none; color: white; font-size: 13px; width: 100%; }

.toolbar-right { display: flex; align-items: center; gap: 10px; }

/* Custom Select */
.custom-select { position: relative; width: 140px; }
.select-trigger {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  color: #d4d4d8; padding: 6px 12px; border-radius: 8px; font-size: 12px;
  cursor: pointer; transition: all 0.2s;
}
.select-trigger:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }
.sel-chevron { opacity: 0.5; transition: transform 0.2s; }
.sel-chevron.open { transform: rotate(180deg); }

.select-options {
  position: absolute; top: 100%; right: 0; margin-top: 4px; width: 100%;
  background: #18181b; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; overflow: hidden; z-index: 50;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
.option {
  padding: 8px 12px; font-size: 12px; color: #a1a1aa; cursor: pointer;
  transition: background 0.2s;
}
.option:hover { background: rgba(255,255,255,0.05); color: white; }
.option.active { background: rgba(245,158,11,0.15); color: #f59e0b; }
.filter-chip {
  background: rgba(255,255,255,0.05); color: #a1a1aa; border: 1px solid rgba(255,255,255,0.08);
  padding: 6px 12px; border-radius: 16px; font-size: 11px; cursor: pointer;
  display: flex; align-items: center; gap: 5px; transition: all 0.2s; font-weight: 500;
}
.filter-chip:hover { border-color: rgba(255,255,255,0.2); color: white; }
.filter-chip.active { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.4); color: #f59e0b; }

/* MAIN CANVAS */
.main-canvas { padding: 32px 40px; max-width: 1600px; margin: 0 auto; }

/* NOTES GRID */
.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
  align-items: start;
}

/* LOADING */
.loading-state { text-align: center; padding: 80px 0; color: rgba(255,255,255,0.5); }
.spinner {
  width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #f59e0b;
  border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* EMPTY STATE */
.empty-notes { text-align: center; padding: 80px 0; }
.empty-icon {
  width: 80px; height: 80px; background: rgba(255,255,255,0.05); border-radius: 24px;
  display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;
  color: rgba(255,255,255,0.3);
}
.empty-notes h3 { font-size: 18px; margin: 0 0 8px; font-weight: 600; }
.empty-notes p { font-size: 14px; color: rgba(255,255,255,0.4); margin: 0 0 24px; }

/* PAGINATION */
.pagination {
  display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 32px; padding-bottom: 32px;
}
.pagination button {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white;
  width: 36px; height: 36px; border-radius: 10px; cursor: pointer; display: flex;
  align-items: center; justify-content: center; transition: all 0.2s;
}
.pagination button:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
.pagination button:disabled { opacity: 0.3; cursor: not-allowed; }
.page-info { font-size: 13px; color: rgba(255,255,255,0.5); font-weight: 500; }

/* ANIMATIONS */
.scale-fade-enter-active, .scale-fade-leave-active { transition: all 0.2s ease; }
.scale-fade-enter-from, .scale-fade-leave-to { opacity: 0; transform: scale(0.95); }

/* RESTRICTED ACCESS STYLES */
.empty-container { 
  height: 60vh; 
  display: flex; align-items: center; justify-content: center; 
  animation: fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.empty-box { 
  text-align: center; color: rgba(255, 255, 255, 0.5); 
  display: flex; flex-direction: column; align-items: center; gap: 24px;
}

.empty-box.flex-layout {
    background: rgba(255, 255, 255, 0.03); 
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 32px;
    padding: 60px 40px;
    max-width: 480px;
    width: 90%;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2); 
    position: relative;
    overflow: hidden;
}

.icon-glow {
    position: relative; z-index: 1;
    width: 80px; height: 80px;
    background: rgba(255, 255, 255, 0.05); 
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 8px;
}

.text-yellow-500 { color: #eab308; }
.mt-4 { margin-top: 0; position: relative; z-index: 1; }
.mb-4 { margin-bottom: 0px; position: relative; z-index: 1; }

.text-xl { 
  font-size: 24px; letter-spacing: -0.02em; 
  color: #f5f5f7; 
}
.font-semibold { font-weight: 700; }

.text-base { 
  font-size: 15px; line-height: 1.6; max-width: 320px;
}
.opacity-70 { color: rgba(255,255,255,0.6); }
.mx-auto { margin-left: auto; margin-right: auto; }

.action-btn.primary {
    position: relative; z-index: 1;
    margin-top: 8px;
    background: #eab308; color: black;
    padding: 14px 32px; font-size: 14px;
    border-radius: 12px;
    border: none;
    font-weight: 600;
    transition: all 0.2s;
}
.action-btn.primary:hover {
    background: #facc15;
    transform: translateY(-1px);
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
