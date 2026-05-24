<template>
  <div class="doc-container-modern">
    <!-- Header / Navigation -->
    <div class="doc-header">
       <div class="tabs-row">
          <button 
            v-for="tab in tabs" 
            :key="tab"
            class="tab-btn" 
            :class="{ active: selectedTab === tab }"
            @click="selectedTab = tab"
          >
            {{ tab }}
            <div class="active-line" v-if="selectedTab === tab"></div>
          </button>
       </div>

       <div class="header-actions">
          <button class="action-btn-ghost">
             <LayoutGrid :size="14" /> Edit view
          </button>
          <button class="action-btn-primary" @click="$emit('upload')">
             Add Document
          </button>
       </div>
    </div>

    <!-- Toolbar / Search -->
    <div class="doc-toolbar">
       <div class="search-input">
          <Search :size="14" />
          <input v-model="searchQuery" placeholder="Search Document" />
       </div>
       <div class="tool-actions">
          <!-- Filter Menu -->
          <div class="menu-wrapper">
              <button class="tool-btn" @click="showFilterMenu = !showFilterMenu" :class="{ active: filterType !== 'all' }">
                  <ListFilter :size="14" /> {{ filterType === 'all' ? 'Filters' : filterLabels[filterType] }}
              </button>
              <div class="dropdown-menu" v-if="showFilterMenu" @mouseleave="showFilterMenu = false">
                  <div class="menu-item" @click="setFilter('all')" :class="{ active: filterType === 'all' }">All Files</div>
                  <div class="menu-item" @click="setFilter('pdf')" :class="{ active: filterType === 'pdf' }">PDF Documents</div>
                  <div class="menu-item" @click="setFilter('image')" :class="{ active: filterType === 'image' }">Images</div>
                  <div class="menu-item" @click="setFilter('spreadsheet')" :class="{ active: filterType === 'spreadsheet' }">Spreadsheets</div>
              </div>
          </div>

          <!-- Sort Menu -->
          <div class="menu-wrapper">
              <button class="tool-btn" @click="showSortMenu = !showSortMenu">
                  <ArrowUpDown :size="14" /> {{ sortLabels[sortField + '-' + sortDirection] || 'Sort' }}
              </button>
              <div class="dropdown-menu right" v-if="showSortMenu" @mouseleave="showSortMenu = false">
                  <div class="menu-item" @click="setSort('date', 'desc')" :class="{ active: isSort('date', 'desc') }">Newest First</div>
                  <div class="menu-item" @click="setSort('date', 'asc')" :class="{ active: isSort('date', 'asc') }">Oldest First</div>
                  <div class="menu-item" @click="setSort('name', 'asc')" :class="{ active: isSort('name', 'asc') }">Name (A-Z)</div>
                  <div class="menu-item" @click="setSort('size', 'desc')" :class="{ active: isSort('size', 'desc') }">Size (Largest)</div>
              </div>
          </div>
       </div>
    </div>

    <!-- Table Grid -->
    <div class="pm-table-modern">
       <!-- Header -->
       <div class="pm-row-modern header">
          <div class="col name" @click="toggleSort('name')" style="cursor: pointer">Name</div>
          <div class="col author">Author(s)</div>
          <div class="col doc-id">Document ID</div>
          <div class="col access">Access</div>
          <div class="col created" @click="toggleSort('date')" style="cursor: pointer">Created on</div>
          <div class="col size" @click="toggleSort('size')" style="cursor: pointer">File size</div>
          <div class="col action">Action</div>
       </div>

       <!-- Rows -->
       <div 
          v-for="doc in paginatedDocs" 
          :key="doc.id" 
          class="pm-row-modern item"
          @click="openDoc(doc.file_url)"
       >
          <!-- Name -->
          <div class="col name">
             <div class="file-icon" :class="getFileTypeClass(doc.file_name)">
                <FileText :size="16" v-if="!isImage(doc.file_name)" />
                <ImageIcon :size="16" v-else />
             </div>
             <span>{{ doc.file_name }}</span>
          </div>

          <!-- Author -->
          <div class="col author">
             <div class="avatar-group">
                <div class="avatar-sm" :style="{ background: getAvatarColor(doc.uploaded_by_name) }">
                   {{ getInitials(doc.uploaded_by_name) }}
                </div>
                <span class="author-name">{{ doc.uploaded_by_name || 'Unknown' }}</span>
             </div>
          </div>

          <!-- Doc ID -->
          <div class="col doc-id">
             <span class="mono-text">{{ doc.document_id || 'N/A' }}</span>
          </div>

          <!-- Access (Mocked) -->
          <div class="col access">
             <div class="access-pill">
                <Users :size="12" />
                <span>Team</span>
             </div>
          </div>

          <!-- Created -->
          <div class="col created">
             {{ formatDate(doc.uploaded_at) }}
          </div>

          <!-- Size -->
          <div class="col size">
             {{ formatSize(doc.file_size_bytes) }}
          </div>

          <!-- Action -->
          <div class="col action">
             <button class="view-btn" @click.stop="openDoc(doc.file_url)">
                View
             </button>
          </div>
       </div>

       <!-- Empty State -->
       <div v-if="filteredDocs.length === 0" class="empty-state">
          <FileText :size="48" class="empty-icon" />
          <p>No documents found</p>
       </div>
    </div>
    
    <!-- Pagination -->
    <PaginationControls 
       v-if="filteredDocs.length > 0"
       :page="currentPage"
       :limit="itemsPerPage"
       :total="filteredDocs.length"
       :total-pages="totalPages"
       @update:page="currentPage = $event"
       @update:limit="itemsPerPage = $event"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { FileText, Image as ImageIcon, Search, ListFilter, ArrowUpDown, LayoutGrid, Users, MoreHorizontal } from 'lucide-vue-next'
import PaginationControls from '../../ui/PaginationControls.vue'

const props = defineProps({ documents: Array })
defineEmits(['upload'])

const tabs = ['All Docs', 'Orders', 'Invoices', 'Payment Receipts', 'Milestones', 'Expenses']
const selectedTab = ref('All Docs')
const searchQuery = ref('')

// Filter State
const showFilterMenu = ref(false)
const filterType = ref('all')
const filterLabels = {
    'all': 'All Files',
    'pdf': 'PDFs',
    'image': 'Images',
    'spreadsheet': 'Sheets'
}

// Sort State
const showSortMenu = ref(false)
const sortField = ref('date')
const sortDirection = ref('desc')
const sortLabels = {
    'date-desc': 'Newest',
    'date-asc': 'Oldest',
    'name-asc': 'Name (A-Z)',
    'size-desc': 'Largest'
}

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

const setFilter = (type) => {
    filterType.value = type
    showFilterMenu.value = false
}

const setSort = (field, dir) => {
    sortField.value = field
    sortDirection.value = dir
    showSortMenu.value = false
}

const isSort = (field, dir) => sortField.value === field && sortDirection.value === dir

const toggleSort = (field) => {
    if (sortField.value === field) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
        sortField.value = field
        sortDirection.value = 'asc' // Default to asc for new field (except date maybe?)
        if (field === 'date' || field === 'size') sortDirection.value = 'desc'
    }
}

const filteredDocs = computed(() => {
   // Critical: Deduplicate by ID immediately to prevent "duplicate copies" bug
   const rawDocs = props.documents || []
   const uniqueDocsMap = new Map()
   rawDocs.forEach(d => {
       if (d.id) uniqueDocsMap.set(d.id, d)
   })
   let docs = Array.from(uniqueDocsMap.values())
   
   // 1. Tab Filter
   if (selectedTab.value !== 'All Docs') {
      const map = {
         'Orders': ['Contract', 'PO'],
         'Invoices': ['Invoice'],
         'Payment Receipts': ['Receipt'],
         'Milestones': ['Milestone'],
         'Expenses': ['Other']
      }
      const targetCats = map[selectedTab.value] || []
      docs = docs.filter(d => targetCats.includes(d.category))
   }

   // 2. Search Filter
   if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      docs = docs.filter(d => d.file_name.toLowerCase().includes(q))
   }

   // 3. Type Filter
   if (filterType.value !== 'all') {
       docs = docs.filter(d => {
           const name = d.file_name.toLowerCase()
           if (filterType.value === 'pdf') return name.endsWith('.pdf')
           if (filterType.value === 'image') return /\.(jpg|jpeg|png|gif|webp)$/.test(name)
           if (filterType.value === 'spreadsheet') return /\.(xls|xlsx|csv)$/.test(name)
           return true
       })
   }

   // 4. Sorting
   const sorted = [...docs].sort((a, b) => {
       let valA, valB
       
       if (sortField.value === 'date') {
           valA = new Date(a.uploaded_at || 0).getTime()
           valB = new Date(b.uploaded_at || 0).getTime()
       } else if (sortField.value === 'size') {
           valA = a.file_size_bytes || 0
           valB = b.file_size_bytes || 0
       } else {
           valA = (a.file_name || '').toLowerCase()
           valB = (b.file_name || '').toLowerCase()
       }

       if (valA < valB) return sortDirection.value === 'asc' ? -1 : 1
       if (valA > valB) return sortDirection.value === 'asc' ? 1 : -1
       return 0
   })

   return sorted
})

// Pagination Logic
const totalPages = computed(() => {
    const limit = Number(itemsPerPage.value) || 10
    return Math.ceil(filteredDocs.value.length / limit)
})

const paginatedDocs = computed(() => {
    const limit = Number(itemsPerPage.value) || 10
    const start = (currentPage.value - 1) * limit
    const end = start + limit
    return filteredDocs.value.slice(start, end)
})

// Reset pagination on filter or limit change
watch([selectedTab, searchQuery, itemsPerPage, filterType, sortField, sortDirection], () => {
    currentPage.value = 1
})

// Safety check
watch(filteredDocs, () => {
    if (currentPage.value > totalPages.value && totalPages.value > 0) {
        currentPage.value = 1
    }
})

const getFileTypeClass = (name) => {
   if (!name) return 'generic'
   if (name.endsWith('.pdf')) return 'pdf'
   if (name.endsWith('.xls') || name.endsWith('.xlsx')) return 'xls'
   if (name.endsWith('.doc') || name.endsWith('.docx')) return 'doc'
   return 'generic'
}

const isImage = (name) => name?.match(/\.(jpeg|jpg|gif|png)$/) != null

const getInitials = (name) => {
   if (!name) return '??'
   const parts = name.split(' ')
   if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
   return name.substring(0, 2).toUpperCase()
}
const getAvatarColor = (name) => {
   const colors = ['#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981']
   if (!name) return colors[0]
   return colors[name.charCodeAt(0) % colors.length]
}

const formatDate = (d) => {
   if (!d) return '—'
   return new Date(d).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

const formatSize = (bytes) => {
   if (!bytes) return '0 MB'
   return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const openDoc = (url) => {
   if (url) window.open(url, '_blank')
}
</script>

<style scoped>
.doc-container-modern {
   display: flex; flex-direction: column; gap: 24px;
   font-family: 'Inter', sans-serif;
}

/* Header */
.doc-header {
   display: flex; justify-content: space-between; align-items: flex-end;
   border-bottom: 1px solid rgba(255,255,255,0.05);
   padding-bottom: 0;
}

.tabs-row { display: flex; gap: 32px; }
.tab-btn {
   background: none; border: none; padding: 12px 0;
   color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 500;
   cursor: pointer; position: relative; transition: color 0.2s;
}
.tab-btn:hover { color: rgba(255,255,255,0.8); }
.tab-btn.active { color: white; font-weight: 600; }

.active-line {
   position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px;
   background: #10b981; /* Green accent from reference */
   box-shadow: 0 -2px 8px rgba(16, 185, 129, 0.4);
   border-radius: 2px 2px 0 0;
}

.header-actions { display: flex; gap: 12px; margin-bottom: 8px; }

.action-btn-ghost {
   background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
   color: rgba(255,255,255,0.8); padding: 8px 16px; border-radius: 8px;
   font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px;
   transition: all 0.2s;
}
.action-btn-ghost:hover { background: rgba(255,255,255,0.1); color: white; }

.action-btn-primary {
   background: #10b981; border: none; color: black;
   padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
   cursor: pointer; transition: all 0.2s;
}
.action-btn-primary:hover { background: #34d399; transform: translateY(-1px); }

/* Toolbar */
.doc-toolbar { display: flex; justify-content: space-between; align-items: center; }

.search-input {
   display: flex; align-items: center; gap: 10px;
   background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
   padding: 10px 14px; border-radius: 8px; width: 320px;
   color: rgba(255,255,255,0.4);
}
.search-input:focus-within { border-color: rgba(255,255,255,0.1); color: white; }
.search-input input {
   background: transparent; border: none; outline: none; color: white; width: 100%; font-size: 13px;
}

.tool-actions { display: flex; gap: 8px; }
.tool-btn {
   background: transparent; border: 1px solid rgba(255,255,255,0.05);
   color: rgba(255,255,255,0.6); padding: 8px 12px; border-radius: 8px;
   font-size: 12px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px;
   position: relative;
}
.tool-btn:hover { background: rgba(255,255,255,0.05); color: white; }
.tool-btn.active { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }

.menu-wrapper { position: relative; }
.dropdown-menu {
    position: absolute; top: 100%; left: 0; 
    margin-top: 8px; background: #18181b; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; padding: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    z-index: 100; min-width: 140px;
}
.dropdown-menu.right { left: auto; right: 0; }
.menu-item {
    padding: 8px 12px; font-size: 12px; color: #a1a1aa;
    cursor: pointer; border-radius: 4px;
}
.menu-item:hover { background: rgba(255,255,255,0.05); color: white; }
.menu-item.active { background: rgba(16, 185, 129, 0.1); color: #10b981; font-weight: 500; }

/* Table Structure */
.pm-table-modern { display: flex; flex-direction: column; width: 100%; }

.pm-row-modern {
   display: grid;
   grid-template-columns: 2.5fr 1.5fr 1.2fr 1fr 1.2fr 1fr 80px;
   align-items: center;
   padding: 16px 12px;
   border-bottom: 1px solid rgba(255,255,255,0.05);
   transition: background 0.2s;
}

.pm-row-modern.header {
   padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);
   font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.05em;
   /* Add sort arrows hint via css if needed, for now pure text */
}

.pm-row-modern.item { cursor: pointer; border-radius: 0; }
.pm-row-modern.item:hover { background: rgba(255,255,255,0.03); }
.pm-row-modern.item:last-child { border-bottom: none; }

/* Columns */
.col.name { display: flex; align-items: center; gap: 12px; font-weight: 500; font-size: 14px; color: #f5f5f7; }
.file-icon {
   width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
   background: rgba(255,255,255,0.05); color: #a1a1aa;
}
.file-icon.pdf { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.file-icon.xls { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.file-icon.doc { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

.col.author { display: flex; align-items: center; }
.avatar-group { display: flex; align-items: center; gap: 8px; }
.avatar-sm {
   width: 24px; height: 24px; border-radius: 50%; font-size: 10px; font-weight: 700; color: white;
   display: flex; align-items: center; justify-content: center;
}
.author-name { font-size: 13px; color: rgba(255,255,255,0.8); }

.col.doc-id .mono-text { font-family: 'SF Mono', monospace; font-size: 12px; color: rgba(255,255,255,0.5); }

.col.access .access-pill {
   display: inline-flex; align-items: center; gap: 6px;
   background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1));
   padding: 4px 10px; border-radius: 100px;
   font-size: 11px; color: #e879f9;
}

.col.created { font-size: 13px; color: rgba(255,255,255,0.6); }
.col.size { font-size: 13px; color: rgba(255,255,255,0.4); font-family: 'SF Mono', monospace; }

.col.action { display: flex; justify-content: flex-end; }
.view-btn {
   background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6);
   padding: 4px 12px; cursor: pointer; border-radius: 100px; font-size: 11px; font-weight: 600;
   transition: all 0.2s;
}
.view-btn:hover { background: white; color: black; border-color: white; }

.empty-state {
   display: flex; flex-direction: column; align-items: center; justify-content: center;
   padding: 80px 0; color: rgba(255,255,255,0.3);
}
.empty-icon { opacity: 0.2; margin-bottom: 16px; }

/* ═════════════════════════════════════════════════════════
   LIGHT THEME OVERRIDES
   ═════════════════════════════════════════════════════════ */
[data-theme="light"] .doc-header {
  border-bottom: 1px solid rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .tab-btn {
  color: #6b5840;
}
[data-theme="light"] .tab-btn:hover {
  color: #1a1410;
}
[data-theme="light"] .tab-btn.active {
  color: #b45309;
  font-weight: 700;
}
[data-theme="light"] .active-line {
  background: linear-gradient(90deg, #d97706, #b45309);
  box-shadow: 0 -2px 8px rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .action-btn-ghost {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(217, 119, 6, 0.30);
  color: #92400e;
}
[data-theme="light"] .action-btn-ghost:hover {
  background: rgba(217, 119, 6, 0.12);
  color: #1a1410;
}
[data-theme="light"] .action-btn-primary {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .action-btn-primary:hover {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #1a1410;
}
[data-theme="light"] .search-input {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(217, 119, 6, 0.22);
  color: #92400e;
}
[data-theme="light"] .search-input:focus-within {
  border-color: #d97706;
  color: #1a1410;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.14);
}
[data-theme="light"] .search-input input {
  color: #1a1410;
}
[data-theme="light"] .search-input input::placeholder { color: #92400e; }
[data-theme="light"] .tool-btn {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(217, 119, 6, 0.22);
  color: #92400e;
}
[data-theme="light"] .tool-btn:hover {
  background: rgba(217, 119, 6, 0.12);
  color: #1a1410;
}
[data-theme="light"] .tool-btn.active {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .dropdown-menu {
  background: rgba(255, 250, 240, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(40, 25, 10, 0.10);
  box-shadow: 0 8px 24px rgba(40, 25, 10, 0.12);
}
[data-theme="light"] .menu-item {
  color: #1a1410;
}
[data-theme="light"] .menu-item:hover {
  background: rgba(217, 119, 6, 0.10);
  color: #b45309;
}
[data-theme="light"] .menu-item.active {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
  font-weight: 600;
}
[data-theme="light"] .pm-row-modern {
  border-bottom: 1px solid rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .pm-row-modern.header {
  border-bottom: 1px solid rgba(40, 25, 10, 0.16);
  color: #b45309;
  font-weight: 700;
}
[data-theme="light"] .pm-row-modern.item:hover {
  background: rgba(217, 119, 6, 0.06);
}
[data-theme="light"] .col.name {
  color: #1a1410;
}
[data-theme="light"] .file-icon {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
}
[data-theme="light"] .file-icon.pdf {
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
}
[data-theme="light"] .file-icon.xls {
  background: rgba(5, 150, 105, 0.12);
  color: #047857;
}
[data-theme="light"] .file-icon.doc {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
}
[data-theme="light"] .author-name {
  color: #1a1410;
}
[data-theme="light"] .col.doc-id .mono-text {
  color: #6b5840;
}
[data-theme="light"] .col.access .access-pill {
  background: rgba(5, 150, 105, 0.12);
  color: #047857;
}
[data-theme="light"] .col.created {
  color: #6b5840;
}
[data-theme="light"] .col.size {
  color: #92400e;
}
[data-theme="light"] .view-btn {
  background: rgba(217, 119, 6, 0.10);
  border: 1px solid rgba(217, 119, 6, 0.30);
  color: #b45309;
  font-weight: 600;
}
[data-theme="light"] .view-btn:hover {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  border-color: #d97706;
}
[data-theme="light"] .empty-state {
  color: #92400e;
}
[data-theme="light"] .empty-icon {
  color: #b45309;
  opacity: 0.4;
}
</style>
