<template>
  <div class="drive-os-container">
    <div class="drive-os-layout">
      
      <!-- LEFT SIDEBAR -->
      <aside class="drive-sidebar" ref="sidebarRef" @mousemove="handleSidebarMove" @mouseleave="handleSidebarLeave" :style="sidebarStyle">
        <div class="sidebar-inner">
          <div class="sidebar-header">
            <div class="brand-icon">
              <div class="hex-glow"></div>
              <ShieldCheck :size="24" stroke-width="1.5" />
            </div>
            <div class="brand-text">
              <h2>Compliance Drive</h2>
              <span>Enterprise Vault</span>
            </div>
          </div>

          <!-- PRIMARY ACTION -->
          <div class="sidebar-action mt-6 mb-4">
             <button class="btn-upload-primary hover-lift" @click="showUploadModal = true">
                <div class="btn-upload-bg"></div>
                <UploadCloud :size="18" stroke-width="2"/>
                <span>Upload Document</span>
             </button>
          </div>

          <nav class="drive-nav">
            <div class="nav-section">
              <span class="nav-label">Menu</span>
              <button class="nav-item" :class="{ active: currentTab === 'all' }" @click="currentTab = 'all'">
                <LayoutGrid :size="18" stroke-width="1.5" /> All Files
              </button>
              <button class="nav-item" :class="{ active: currentTab === 'shared' }" @click="currentTab = 'shared'">
                <Users :size="18" stroke-width="1.5" /> Shared
              </button>
              <button class="nav-item" :class="{ active: currentTab === 'recent' }" @click="currentTab = 'recent'">
                <Clock :size="18" stroke-width="1.5" /> Recent
              </button>
              <button class="nav-item" :class="{ active: currentTab === 'trash' }" @click="currentTab = 'trash'">
                <Trash2 :size="18" stroke-width="1.5" /> Trash
              </button>
              <button class="nav-item text-amber-500" v-if="isAdminRoute" :class="{ active: currentTab === 'approval' }" @click="currentTab = 'approval'">
                <ShieldCheck :size="18" stroke-width="1.5" /> Approvals
              </button>
            </div>

            <div class="nav-section mt-4">
              <span class="nav-label">Favorites</span>
              <div class="fav-list" v-if="favoriteDocs.length">
                <button class="nav-item mini" v-for="doc in favoriteDocs.slice(0, 4)" :key="doc.id" @click="openDocDetails(doc)">
                  <Star :size="14" fill="currentColor" class="text-amber-500 shrink-0" />
                  <span class="fav-text">{{ doc.title }}</span>
                </button>
              </div>
              <div v-else class="empty-text">No favorites yet</div>
            </div>
          </nav>

          <!-- MODERN EMBEDDED STORAGE WIDGET -->
          <div class="storage-widget-modern hover-lift">
            <div class="sw-top">
              <HardDrive :size="16" class="text-amber-500"/>
              <span class="sw-title">Storage</span>
              <span class="sw-percent ml-auto text-xs font-mono text-white/50">{{ usagePercentage.toFixed(1) }}%</span>
            </div>
            
            <div class="sw-bar-wrap">
              <div class="sw-segment bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" style="width: 45%; animation-delay: 0.1s;"></div>
              <div class="sw-segment bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]" style="width: 25%; animation-delay: 0.3s;"></div>
              <div class="sw-segment bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]" style="width: 15%; animation-delay: 0.5s;"></div>
              <div class="sw-segment bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" style="width: 15%; animation-delay: 0.7s;"></div>
            </div>
            
            <div class="sw-info mb-4">
              <span class="sw-used">{{ formatBytes(stats?.total_size || 0) }} used</span>
              <span class="sw-total">of 5 GB</span>
            </div>
            
            <!-- Embedded Legend -->
            <div class="sw-legend">
               <div class="swl-item"><span class="swl-dot bg-blue-500"></span> Docs</div>
               <div class="swl-item"><span class="swl-dot bg-purple-500"></span> Images</div>
               <div class="swl-item"><span class="swl-dot bg-red-500"></span> PDFs</div>
               <div class="swl-item"><span class="swl-dot bg-green-500"></span> Sheets</div>
            </div>
          </div>
        </div>
      </aside>

      <!-- MIDDLE CONTENT: Files -->
      <main class="drive-content-area">
        <header class="top-bar">
          <div class="search-omni">
            <Search :size="18" class="search-icon"/>
            <input type="text" v-model="searchQuery" placeholder="Search compliance docs, projects, tags..." @input="debouncedFetch" />
            <div class="search-kbd">⌘K</div>
          </div>
        </header>

        <div class="scrollable-viewport custom-scroll">
          <!-- Recent Grid -->
          <section class="viewport-section fade-up" v-if="currentTab === 'all' || currentTab === 'recent'" style="animation-delay: 0.1s;">
            <div class="section-header">
              <h3>Recent Files</h3>
              <button class="link-btn" v-if="currentTab === 'all'" @click="currentTab = 'recent'">See All <ArrowRight :size="14"/></button>
            </div>
            
            <div class="recent-grid">
              <div class="recent-card hover-lift" v-for="(doc, i) in recentDocs" :key="doc.id" :style="{ animationDelay: `${i * 0.05}s` }" @click="openDocDetails(doc)">
                <div class="rc-preview" :class="doc.file_type">
                  <!-- Show actual image if it's an image file -->
                  <img v-if="doc.file_type === 'image' && doc.file_url" :src="`${API_BASE}${doc.file_url}`" class="rc-image-cover" />
                  
                  <!-- Fallback to icon -->
                  <template v-else>
                     <div class="rc-bg-glow"></div>
                     <component :is="getFileIcon(doc.file_type)" :size="48" stroke-width="1.5" class="rc-icon-main float-anim" />
                  </template>
                  
                  <div class="rc-pill-badge">{{ formatBytes(doc.file_size) }}</div>
                  <button class="rc-fav-btn" @click.stop="toggleFavorite(doc)">
                    <Star :size="16" :fill="doc.is_favorite ? '#f59e0b' : 'none'" :class="{ 'text-amber-500': doc.is_favorite }"/>
                  </button>
                </div>
                <div class="rc-info">
                  <h4 class="multi-line-truncate" :title="doc.title">{{ doc.title }}</h4>
                  <p>{{ formatDate(doc.created_at) }} &bull; {{ doc.category || 'General' }}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- All Files List -->
          <section class="viewport-section fade-up" style="animation-delay: 0.2s; flex: 1;">
            <div class="section-header">
              <h3>{{ tabTitle }}</h3>
              <div class="list-filters">
                <CustomSelect 
                  v-model="selectedCategory" 
                  :options="[{value:'', label:'All Categories'}, ...categories.map(c => ({value: c.name, label: c.name}))]" 
                  labelKey="label" valueKey="value"
                  @update:modelValue="fetchDocuments"
                  class="filter-dropdown z-elevated"
                />
                <CustomSelect 
                  v-model="selectedType" 
                  :options="[{value:'', label:'All Types'}, {value:'pdf', label:'PDF'}, {value:'document', label:'Doc'}, {value:'spreadsheet', label:'Sheet'}, {value:'image', label:'Image'}]" 
                  labelKey="label" valueKey="value"
                  @update:modelValue="fetchDocuments"
                  class="filter-dropdown z-elevated"
                />
              </div>
            </div>

            <div class="files-data-table">
              <div class="table-header">
                <div class="th-col w-name">Name</div>
                <div class="th-col w-owner">Shared By</div>
                <div class="th-col w-size">Size</div>
                <div class="th-col w-date">Date Added</div>
                <div class="th-col w-action"></div>
              </div>
              
              <div v-if="isLoading" class="table-state"><Loader2 class="spin" :size="24"/></div>
              <div v-else-if="!documents.length" class="table-state empty">
                 <FolderOpen :size="48" stroke-width="1" class="mb-4 opacity-20 float-anim"/>
                 <p>No files found in {{ tabTitle.toLowerCase() }}.</p>
              </div>
              
              <div class="table-body" v-else>
                <div class="table-row hover-lift-row" v-for="(doc, i) in documents" :key="doc.id" :style="{ animationDelay: `${0.1 + (i * 0.03)}s` }" @click="openDocDetails(doc)">
                  <div class="td-col w-name">
                    <div class="file-icon-sm" :class="doc.file_type">
                      <component :is="getFileIcon(doc.file_type)" :size="16" stroke-width="2"/>
                    </div>
                    <div class="file-name-block">
                      <span class="fn-title truncate-block" :title="doc.title">{{ doc.title }}</span>
                      <span class="fn-sub text-red-400 flex items-center gap-1" v-if="doc.is_confidential"><ShieldAlert :size="10"/> Confidential</span>
                    </div>
                  </div>
                  <div class="td-col w-owner">
                    <div class="avatar-stack">
                      <div class="avatar-micro" :title="doc.uploader_name">{{ getInitials(doc.uploader_name) }}</div>
                      <span class="owner-name ml-2 truncate-block max-w-[100px]">{{ doc.uploader_name?.split(' ')[0] || 'System' }}</span>
                    </div>
                  </div>
                  <div class="td-col w-size text-white/50 font-mono text-[13px] truncate-block">{{ formatBytes(doc.file_size) }}</div>
                  <div class="td-col w-date text-white/50 text-[14px] truncate-block">{{ formatDate(doc.created_at) }}</div>
                  <div class="td-col w-action">
                    <button class="action-ico hover-amber" @click.stop="toggleFavorite(doc)">
                      <Star :size="16" :fill="doc.is_favorite ? 'currentColor' : 'none'" :class="{ 'text-amber-500': doc.is_favorite }"/>
                    </button>
                    <button class="action-ico hover-blue" @click.stop="downloadFile(doc)">
                      <Download :size="16" />
                    </button>
                    <button class="action-ico hover-red" @click.stop="promptDeleteDocument(doc)" v-if="currentTab !== 'trash'">
                      <Trash2 :size="16" />
                    </button>
                    <button class="action-ico hover-green" @click.stop="restoreDocument(doc)" v-if="currentTab === 'trash'" title="Restore">
                      <RefreshCcw :size="16" />
                    </button>
                    <button class="action-ico hover-red" @click.stop="promptPermanentDelete(doc)" v-if="currentTab === 'trash'" title="Delete Permanently">
                      <X :size="16" stroke-width="3" />
                    </button>
                    <button class="action-ico hover-green" @click.stop="approveDocument(doc)" v-if="currentTab === 'approval' && isAdminRoute" title="Approve">
                      <CheckCircle2 :size="16" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </section>
        </div>
      </main>

    </div>

    <!-- DOCUMENT DETAILS DRAWER -->
    <transition name="fade">
      <div class="app-drawer-overlay" v-if="selectedDoc" @click="selectedDoc = null"></div>
    </transition>
    
    <div class="app-drawer transparent-drawer" :class="{ 'is-open': !!selectedDoc }">
      <div class="drawer-inner" v-if="selectedDoc">
        <header class="drawer-header relative z-10">
          <div class="dh-title">
            <span class="doc-id">DOC-{{ selectedDoc.id.split('-')[0].toUpperCase() }}</span>
          </div>
          <div class="dh-actions flex items-center gap-3">
            <button class="drawer-action-btn delete hover-red" @click="promptDeleteDocument(selectedDoc)">
              <Trash2 :size="14"/> Delete
            </button>
            <button class="drawer-close spin-hover" @click="selectedDoc = null">
               <X :size="20"/>
            </button>
          </div>
        </header>

        <div class="drawer-scroll-body custom-scroll">
          
          <div class="drawer-hero-minimal">
             <div class="dhm-icon pop-in">
                <component :is="getFileIcon(selectedDoc.file_type)" :size="24" class="text-amber-500" />
             </div>
             <div class="dhm-info">
                <h2 class="wrap-title slide-in-text">{{ selectedDoc.title }}</h2>
                <div class="dhm-meta">{{ selectedDoc.category || 'Other' }} &bull; {{ formatBytes(selectedDoc.file_size) }}</div>
             </div>
          </div>
          
          <div class="status-ribbon mb-8 relative z-10">
             <div class="sr-item">
                <ShieldAlert :size="14" class="text-red-500" v-if="selectedDoc.is_confidential"/>
                <Lock :size="14" v-else-if="selectedDoc.access_level === 'Private'" class="al-private"/>
                <Users :size="14" v-else-if="selectedDoc.access_level === 'User'" class="al-user"/>
                <Globe :size="14" v-else class="al-org"/>
                <span :class="ribbonClass(selectedDoc)">{{ ribbonLabel(selectedDoc) }}</span>
             </div>
             <div class="sr-date">Uploaded on {{ formatDate(selectedDoc.created_at) }}</div>
          </div>

          <!-- Document Preview (Fallback if not image) -->
          <div v-if="selectedDoc.file_type === 'image' && selectedDoc.file_url" class="doc-image-preview scale-up mt-6 mb-8">
             <img :src="`${API_BASE}${selectedDoc.file_url}`" />
          </div>
          <div v-else class="doc-generic-preview scale-up mt-6 mb-8">
             <div class="generic-bg-glow" :class="selectedDoc.file_type"></div>
             <component :is="getFileIcon(selectedDoc.file_type)" :size="64" class="generic-icon float-anim" />
             <div class="generic-name">{{ selectedDoc.title }}</div>
             <div class="generic-type">{{ selectedDoc.file_type.toUpperCase() }} FILE</div>
          </div>

          <!-- Tabs for Drawer -->
          <div class="drawer-tabs modern-tabs mt-4">
            <button class="d-tab" :class="{active: drawerTab === 'info'}" @click="drawerTab = 'info'">Details</button>
            <button class="d-tab" :class="{active: drawerTab === 'activity'}" @click="drawerTab = 'activity'">Audit Trail</button>
          </div>

          <!-- TAB: DETAILS -->
          <transition name="tab-fade" mode="out-in">
            <div class="drawer-tab-content mt-6 pb-20" v-if="drawerTab === 'info'">
              <div class="info-block fade-up" style="animation-delay: 0.1s">
                 <h4><Info :size="13" class="info-block-icon"/> Document Info</h4>
                 <div class="separator-line"></div>
                 <div class="ib-row">
                   <span class="ib-label"><Lock :size="11"/> Access Level</span>
                   <span class="al-pill" :class="`al-${selectedDoc.access_level?.toLowerCase()}`">{{ selectedDoc.access_level }}</span>
                 </div>
                 <div class="ib-row">
                   <span class="ib-label"><FileType2 :size="11"/> File Type</span>
                   <span class="ib-val">{{ selectedDoc.file_type.toUpperCase() }}</span>
                 </div>
                 <div class="ib-row">
                   <span class="ib-label"><Hash :size="11"/> MIME</span>
                   <span class="ib-val opacity-50">{{ selectedDoc.mime_type }}</span>
                 </div>
                 <div class="ib-row" v-if="selectedDoc.category">
                   <span class="ib-label"><Layers :size="11"/> Category</span>
                   <span class="ib-val">{{ selectedDoc.category }}</span>
                 </div>
                 <div class="ib-row" v-if="selectedDoc.description">
                   <span class="ib-label"><Info :size="11"/> Description</span>
                   <span class="ib-val wrap-title">{{ selectedDoc.description }}</span>
                 </div>
              </div>

              <!-- SHARED WITH -->
              <div class="info-block fade-up" style="animation-delay: 0.2s">
                 <h4><Users :size="13" class="info-block-icon"/> Shared With</h4>
                 <div class="separator-line"></div>
                 <div class="shared-with-stack">
                   <template v-if="drawerSharedUsers.length">
                     <div
                       class="shared-user-pill pop-in"
                       v-for="(u, i) in drawerSharedUsers"
                       :key="u.id"
                       :title="u.email"
                       :style="{ animationDelay: `${0.2 + i * 0.05}s` }"
                     >
                       <div class="shared-pill-avatar">{{ getInitials(u.full_name || u.email) }}</div>
                       <div class="shared-pill-info">
                         <span class="shared-pill-name">{{ u.full_name || 'Unnamed' }}</span>
                         <span class="shared-pill-email">{{ u.email }}</span>
                       </div>
                     </div>
                   </template>
                   <div v-else class="empty-row">
                     <Users :size="14" class="empty-row-icon"/>
                     <span>Not shared with anyone yet.</span>
                   </div>
                 </div>
              </div>

              <div class="info-block fade-up" style="animation-delay: 0.3s">
                 <h4><Tag :size="13" class="info-block-icon"/> Tags</h4>
                 <div class="separator-line"></div>
                 <div class="tags-flex">
                   <template v-if="selectedDoc.tags?.length">
                     <span class="drawer-tag pop-in" v-for="(tag, i) in selectedDoc.tags" :key="tag" :style="{animationDelay: `${0.3 + i * 0.05}s`}">#{{ tag }}</span>
                   </template>
                   <div v-else class="empty-row">
                     <Hash :size="14" class="empty-row-icon"/>
                     <span>No tags attached.</span>
                   </div>
                 </div>
              </div>

              <div class="info-block fade-up" style="animation-delay: 0.4s">
                 <h4><User :size="13" class="info-block-icon"/> Ownership</h4>
                 <div class="separator-line"></div>
                 <div class="ownership-card hover-lift">
                    <div class="owner-bg-glow"></div>
                    <div class="ownership-avatar">{{ getInitials(selectedDoc.uploader_name) }}</div>
                    <div class="ownership-info">
                       <span class="ownership-name">{{ selectedDoc.uploader_name || 'System' }}</span>
                       <span class="ownership-role">
                         <ShieldCheck :size="11"/> Owner &middot; Uploader
                       </span>
                    </div>
                 </div>
              </div>
            </div>

            <!-- TAB: AUDIT TRAIL -->
            <div class="drawer-tab-content mt-6 pb-20" v-else-if="drawerTab === 'activity'">
               <div class="audit-trail-container">
                  <div v-if="!docActivities.length" class="empty-text py-6 text-center">No audit logs found.</div>
                  
                  <div class="at-event fade-up-stagger" v-for="(act, i) in docActivities" :key="act.id" :style="{ animationDelay: `${i * 0.1}s` }">
                    <div class="at-line"></div>
                    <div class="at-node pulse-node"></div>
                    <div class="at-content hover-lift">
                      <div class="at-header">
                        <span class="at-user">{{ act.user_name?.split(' ')[0] }}</span>
                        <span class="at-time">{{ formatTimeAgo(act.created_at) }}</span>
                      </div>
                      <div class="at-action-pill" :class="act.action.toLowerCase()">{{ capitalize(act.action) }}</div>
                      <div class="at-detail" v-if="act.details">{{ act.details }}</div>
                    </div>
                  </div>
               </div>
            </div>
          </transition>
        </div>

        <!-- Footer Actions -->
        <footer class="drawer-footer">
           <button class="df-btn outline hover-amber pop-in" style="animation-delay: 0.2s" @click="toggleFavorite(selectedDoc)">
             <Star :size="16" :fill="selectedDoc.is_favorite ? 'currentColor' : 'none'" :class="{'text-amber-500': selectedDoc.is_favorite}"/> 
           </button>
           <!-- Share is allowed even while Pending Approval; the backend defers notifications until admin approves. -->
           <button class="df-btn outline hover-blue pop-in" style="animation-delay: 0.3s" @click="shareDocument(selectedDoc)">
             <Share2 :size="16"/> Share
           </button>
           <button class="df-btn primary hover-lift pop-in" style="animation-delay: 0.4s" @click="downloadFile(selectedDoc)">
             <Download :size="16"/> 
             <span>Download</span>
           </button>
           <button class="df-btn primary hover-lift pop-in" style="background: #22c55e; color: white;" v-if="isAdminRoute && selectedDoc.status === 'Pending Approval'" @click="approveDocument(selectedDoc)">
             <CheckCircle2 :size="16"/> 
             <span>Approve</span>
           </button>
        </footer>
      </div>
    </div>

    <!-- CUSTOM DELETE CONFIRMATION MODAL -->
    <transition name="modal-spring">
      <div class="custom-modal-backdrop" v-if="docToDelete" @click.self="docToDelete = null">
        <div class="custom-modal-panel delete-modal">
          <div class="dm-icon pulse-red">
            <Trash2 :size="24"/>
          </div>
          <h3>{{ isPermanentDelete ? 'Permanently Delete?' : 'Delete Document?' }}</h3>
          <p>
            <template v-if="isPermanentDelete">
              Are you sure you want to <strong>permanently destroy</strong> <strong class="text-white">{{ docToDelete.title }}</strong>? This action is irreversible and the file will be wiped from the server.
            </template>
            <template v-else>
              Are you sure you want to move <strong class="text-white">{{ docToDelete.title }}</strong> to the trash? You can restore it later.
            </template>
          </p>
          <div class="dm-actions">
            <button class="cmp-btn ghost hover-lift" @click="docToDelete = null">Cancel</button>
            <button class="cmp-btn delete-btn hover-lift" @click="executeDeleteDocument">Yes, Delete</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- SHARE MODAL -->
    <transition name="modal-spring">
      <div class="custom-modal-backdrop share-backdrop" v-if="docToShare" @click.self="closeShareModal">
        <div class="custom-modal-panel share-modal-v2">

          <!-- Aura: subtle radial gradient bloom behind the panel -->
          <div class="share-aura-glow" aria-hidden="true"></div>

          <!-- HEADER -->
          <header class="share-header inner-stagger-1">
            <div class="share-icon-ring pop-in">
              <Share2 :size="20" stroke-width="2"/>
              <Sparkles :size="10" class="share-icon-spark"/>
            </div>
            <div class="share-title-block">
              <div class="share-eyebrow">
                <Send :size="10"/> <span>SHARE ACCESS</span>
              </div>
              <h3 class="share-title">Share Document</h3>
              <p class="share-subtitle truncate-block">{{ docToShare.title }}</p>
            </div>
            <button class="share-close spin-hover" @click="closeShareModal">
              <X :size="16"/>
            </button>
          </header>

          <div class="share-divider"></div>

          <!-- BODY -->
          <div class="share-body custom-scroll inner-stagger-2">

            <!-- Status hint pill -->
            <div class="share-status-pill" :class="docToShare.status === 'Pending Approval' ? 'is-pending' : 'is-active'">
              <template v-if="docToShare.status === 'Pending Approval'">
                <ShieldAlert :size="13"/>
                <span>Pending admin approval — recipients are notified after it's approved.</span>
              </template>
              <template v-else>
                <CheckCircle2 :size="13"/>
                <span>Recipients receive a notification immediately.</span>
              </template>
            </div>

            <!-- Already-shared row (avatars) -->
            <div class="share-section-block" v-if="alreadySharedUsers.length">
              <div class="share-section-label">
                <Users :size="12"/> <span>Already shared with</span>
                <span class="share-count-pill">{{ alreadySharedUsers.length }}</span>
              </div>
              <div class="share-existing-stack">
                <div
                  class="share-existing-chip pop-in"
                  v-for="(u, i) in alreadySharedUsers"
                  :key="u.id"
                  :style="{ animationDelay: `${i * 0.05}s` }"
                  :title="u.email"
                >
                  <div class="usg-avatar share-chip-avatar">{{ getInitials(u.full_name || u.email) }}</div>
                  <span>{{ (u.full_name || u.email).split(' ')[0] }}</span>
                </div>
              </div>
            </div>

            <!-- Search -->
            <div class="share-section-block">
              <div class="share-section-label">
                <UserPlus :size="12"/> <span>Add people</span>
              </div>
              <div class="share-search-wrap-v2">
                <Search :size="14" class="share-search-icon-v2"/>
                <input
                  type="text"
                  v-model="shareSearchQuery"
                  placeholder="Search by name or email…"
                  class="share-search-input-v2"
                />
                <button
                  v-if="shareSearchQuery"
                  class="share-search-clear"
                  @click="shareSearchQuery = ''"
                  aria-label="Clear search"
                >
                  <X :size="13"/>
                </button>
              </div>
            </div>

            <!-- User grid -->
            <div class="share-user-grid-v2 custom-scroll">
              <div
                class="share-user-card"
                v-for="(user, i) in shareableUsers"
                :key="user.id"
                @click="toggleShareUser(user.id)"
                :style="{ animationDelay: `${0.05 + i * 0.04}s` }"
                :class="{
                  active: shareSelectedUsers.includes(user.id),
                  'is-existing': isAlreadyShared(user.id)
                }"
              >
                <div class="suc-avatar">
                  <span>{{ getInitials(user.full_name || user.email) }}</span>
                </div>
                <div class="suc-info">
                  <div class="suc-name-row">
                    <User :size="11"/>
                    <span class="suc-name">{{ user.full_name || 'Unnamed User' }}</span>
                  </div>
                  <div class="suc-email-row">
                    <Mail :size="10"/>
                    <span class="suc-email">{{ user.email }}</span>
                  </div>
                </div>
                <span v-if="isAlreadyShared(user.id)" class="suc-badge existing">
                  <CheckCircle2 :size="10"/> Shared
                </span>
                <span v-else-if="shareSelectedUsers.includes(user.id)" class="suc-badge picked">
                  <CheckCircle2 :size="12"/>
                </span>
                <span v-else class="suc-badge idle"><Plus :size="12"/></span>
              </div>

              <div v-if="!shareableUsers.length" class="share-empty">
                <Users :size="32" stroke-width="1" class="opacity-30 mb-2"/>
                <span>No users match "{{ shareSearchQuery }}"</span>
              </div>
            </div>

            <div v-if="shareError" class="share-error-box slide-in-text">
              <ShieldAlert :size="14" class="shrink-0 mt-0.5"/>
              <span>{{ shareError }}</span>
            </div>
          </div>

          <!-- FOOTER -->
          <footer class="share-footer">
            <div class="share-selection-summary" v-if="shareSelectedUsers.length">
              <span class="share-sel-dot"></span>
              <strong>{{ shareSelectedUsers.length }}</strong>
              <span class="text-white/50">{{ shareSelectedUsers.length === 1 ? 'user' : 'users' }} selected</span>
            </div>
            <span v-else class="text-xs text-white/35 self-center mr-auto">Pick someone to share with…</span>

            <button type="button" class="share-btn-ghost" @click="closeShareModal">Cancel</button>
            <button
              type="button"
              class="share-btn-primary"
              :disabled="!shareSelectedUsers.length || isSharing"
              @click="executeShare"
            >
              <Loader2 v-if="isSharing" class="spin" :size="14"/>
              <Share2 v-else :size="14"/>
              <span>{{ isSharing ? 'Sharing…' : (shareSelectedUsers.length ? `Share with ${shareSelectedUsers.length}` : 'Share') }}</span>
            </button>
          </footer>
        </div>
      </div>
    </transition>

    <!-- UPLOAD MODAL -->
    <transition name="modal-spring">
      <div class="custom-modal-backdrop" v-if="showUploadModal" @click.self="showUploadModal = false">
        <div class="custom-modal-panel compact-modal">
          <div class="cmp-header relative z-10 inner-stagger-1">
            <div class="icon-ring pop-in">
              <UploadCloud :size="20"/>
            </div>
            <div class="cmp-title-box">
              <h3>Secure Upload</h3>
              <p>Add documents to the enterprise vault</p>
            </div>
            <button class="cmp-close spin-hover flex items-center justify-center" @click="showUploadModal = false">
               <X :size="18"/>
            </button>
          </div>

          <div class="cmp-body custom-scroll relative z-10 inner-stagger-2">
            <form @submit.prevent="handleUpload">
              <!-- Dropzone -->
              <div class="upload-dropzone mt-2" 
                   @dragover.prevent="dragover = true" 
                   @dragleave.prevent="dragover = false" 
                   @drop.prevent="handleDrop"
                   :class="{ 'is-dragover': dragover, 'has-file': uploadFile }">
                <!-- Hidden file input -->
                <input type="file" ref="fileInput" @change="handleFileSelect" style="display: none;" />
                
                <div v-if="!uploadFile" class="dz-empty" @click="$refs.fileInput.click()">
                  <div class="dz-icon-circle hover-lift"><Plus :size="20"/></div>
                  <span class="dz-text">Click or drag file here</span>
                  <span class="dz-sub">PDF, DOCX, XLSX, Images (Max 2GB)</span>
                </div>
                
                <div v-else class="dz-filled">
                   <component :is="getFileIcon('other')" :size="28" class="text-amber-500 shrink-0" />
                   <div class="f-info min-w-0">
                     <span class="f-name truncate block w-full">{{ uploadFile.name }}</span>
                     <span class="f-size">{{ formatBytes(uploadFile.size) }}</span>
                   </div>
                   <button type="button" class="f-remove shrink-0" @click.stop="uploadFile = null">
                     <Trash2 :size="14" stroke-width="2.5"/>
                   </button>
                </div>
              </div>

              <!-- Metadata Grid -->
              <div class="form-grid mt-6">
                <div class="fg-item full-width">
                  <label>Document Title <span class="text-red-500">*</span></label>
                  <input type="text" v-model="uploadForm.title" class="custom-input" placeholder="e.g. Q3 Financial Report" required />
                </div>
                
                <div class="fg-item">
                  <label>Category <span class="text-red-500">*</span></label>
                  <CustomSelect
                    v-model="uploadForm.category"
                    :options="[{value:'Finance', label:'Finance'}, {value:'Legal', label:'Legal'}, {value:'Compliance', label:'Compliance'}, {value:'HR', label:'HR'}, {value:'Project', label:'Project'}, {value:'Other', label:'Other'}]"
                    labelKey="label" valueKey="value"
                  />
                </div>

                <div class="fg-item">
                  <label>Access Level <span class="text-red-500">*</span></label>
                  <CustomSelect
                    v-model="uploadForm.access_level"
                    :options="[{value:'Private', label:'Private'}, {value:'User', label:'User'}, {value:'Organization', label:'Organization'}]"
                    labelKey="label" valueKey="value"
                  />
                </div>

                <div class="fg-item full-width" v-if="uploadForm.access_level === 'User'">
                  <label>Select Users to Share With <span class="text-red-500">*</span></label>
                  <div class="user-select-grid custom-scroll mt-2">
                    <div class="usg-item slide-in-text" v-for="(user, i) in usersList" :key="user.id" 
                         @click="toggleSharedUser(user.id)"
                         :style="{ animationDelay: `${i * 0.05}s` }"
                         :class="{ active: uploadForm.shared_with.includes(user.id) }">
                        <div class="usg-avatar">{{ getInitials(user.full_name || user.email) }}</div>
                        <div class="usg-info">
                            <span class="usg-name">{{ user.full_name || 'Unnamed User' }}</span>
                            <span class="usg-email">{{ user.email }}</span>
                        </div>
                        <CheckCircle2 :size="16" class="usg-check text-amber-500 pop-in" v-if="uploadForm.shared_with.includes(user.id)"/>
                    </div>
                  </div>
                  <span class="text-xs text-white/40 mt-2 block" v-if="uploadForm.shared_with.length > 0">
                     {{ uploadForm.shared_with.length }} user(s) selected
                  </span>
                </div>
                
                <div class="fg-item full-width">
                  <label>Tags</label>
                  <input type="text" v-model="uploadForm.tags" class="custom-input" placeholder="Comma separated (e.g. audit, 2024)" />
                </div>
              </div>

              <!-- Security Toggle -->
              <div class="security-toggle mt-6 mb-2 hover-lift">
                <div class="st-info">
                  <ShieldAlert :size="16" class="text-red-500"/>
                  <div class="flex flex-col">
                    <span class="st-title">Highly Confidential</span>
                    <span class="st-desc">Requires admin approval.</span>
                  </div>
                </div>
                <label class="switch">
                  <input type="checkbox" v-model="uploadForm.is_confidential">
                  <span class="slider round"></span>
                </label>
              </div>

              <div v-if="uploadError" class="mt-4 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm border border-red-500/20 slide-in-text">
                {{ uploadError }}
              </div>

              <div class="cmp-footer mt-4">
                <button type="button" class="cmp-btn ghost hover-lift" @click="showUploadModal = false">Cancel</button>
                <button type="submit" class="cmp-btn primary hover-lift" :disabled="!uploadFile || isUploading">
                  <Loader2 v-if="isUploading" class="spin mr-2" :size="14"/>
                  <span>{{ isUploading ? 'Uploading...' : 'Upload to Vault' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { 
  LayoutGrid, Clock, Star, Trash2, UploadCloud, FileText, HardDrive, Share2,
  Search, Grid, List, ShieldAlert, Download, X, File, Image as ImageIcon,
  Film, Music, Archive, RefreshCcw, Loader2, FolderOpen, ChevronLeft, ChevronRight,
  ShieldCheck, Users, MoreHorizontal, Calendar, Bell, ArrowRight, ChevronDown, ArrowDown, Plus, CheckCircle2,
  Lock, Globe, User, Mail, FileType2, Tag, Hash, Info, Layers, Sparkles, Send, UserPlus
} from 'lucide-vue-next'
import CustomSelect from '../../components/ui/CustomSelect.vue'
import axios from 'axios'
import { debounce } from 'lodash'
import { useToast } from '../../composables/useToast'
import { useRoute } from 'vue-router'
import { API, API_BASE } from '@/utils/api'

// STATE
const route = useRoute()
const isAdminRoute = computed(() => route.path.includes('/admin/'))

const { error: toastError, success: toastSuccess } = useToast()
const currentTab = ref('all')
const documents = ref([])
const favoriteDocs = ref([])
const recentDocs = ref([])
const stats = ref(null)
const categories = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedType = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const docToDelete = ref(null)
const isPermanentDelete = ref(false)
const usersList = ref([])

const tabTitle = computed(() => {
  if (currentTab.value === 'all') return 'All Files'
  if (currentTab.value === 'shared') return 'Shared With Me'
  if (currentTab.value === 'recent') return 'Recent Files'
  if (currentTab.value === 'trash') return 'Trash Bin'
  if (currentTab.value === 'approval') return 'Pending Approvals'
  return 'Files'
})

// 3D Sidebar Hover Effect
const sidebarRef = ref(null)
const mousePos = ref({ x: 0, y: 0 })
const isHoveringSidebar = ref(false)

const handleSidebarMove = (e) => {
  if (!sidebarRef.value) return
  const rect = sidebarRef.value.getBoundingClientRect()
  mousePos.value = {
    x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
    y: ((e.clientY - rect.top) / rect.height) * 2 - 1
  }
  isHoveringSidebar.value = true
}
const handleSidebarLeave = () => {
  isHoveringSidebar.value = false
}
const sidebarStyle = computed(() => {
  if (isHoveringSidebar.value) {
    const rx = -mousePos.value.y * 3
    const ry = mousePos.value.x * 3
    return {
      transform: `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`,
      transition: 'transform 0.1s ease-out'
    }
  }
  return {
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
    transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
  }
})

// METER LOGIC
const usagePercentage = computed(() => {
  if (!stats.value?.total_size) return 0
  const maxBytes = 5 * 1024 * 1024 * 1024 // 5GB
  return Math.min((stats.value.total_size / maxBytes) * 100, 100)
})

// UPLOAD MODAL
const showUploadModal = ref(false)
const dragover = ref(false)
const fileInput = ref(null)
const uploadFile = ref(null)
const isUploading = ref(false)
const uploadError = ref('')
const uploadForm = ref({
  title: '', category: '', description: '', tags: '',
  access_level: 'Private', is_confidential: false, shared_with: []
})

// DRAWER
const selectedDoc = ref(null)
const drawerTab = ref('info')
const docActivities = ref([])

// SHARE MODAL
const docToShare = ref(null)
const shareSelectedUsers = ref([])
const shareSearchQuery = ref('')
const shareError = ref('')
const isSharing = ref(false)

// API 
// Route-aware: admin portal must use admin_token, user portal must use user_token.
// Falling back to either-or caused admin pages to read user_token (since user logins
// often happen first), so the admin appeared to see only that user's files.
const getToken = () => isAdminRoute.value
  ? (localStorage.getItem('admin_token') || localStorage.getItem('user_token'))
  : (localStorage.getItem('user_token') || localStorage.getItem('admin_token'))

const fetchStats = async () => {
  try {
    const res = await axios.get(`${API}/drive/stats`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    stats.value = res.data
    categories.value = res.data.categories || []
    
    // Fetch favorites for sidebar
    const favRes = await axios.get(`${API}/drive/documents?favorites_only=true&page_size=5`, {
       headers: { Authorization: `Bearer ${getToken()}` }
    })
    favoriteDocs.value = favRes.data.documents || []

    // Fetch recent for grid
    const recRes = await axios.get(`${API}/drive/recent?limit=4`, {
       headers: { Authorization: `Bearer ${getToken()}` }
    })
    recentDocs.value = recRes.data

  } catch (error) {
    console.error("Failed to fetch drive stats:", error)
  }
}

const fetchUsers = async () => {
  try {
    const res = await axios.get(`${API}/team/users`, {
       headers: { Authorization: `Bearer ${getToken()}` }
    })
    usersList.value = res.data
  } catch (error) {
    console.error("Failed to fetch users:", error)
  }
}

const fetchDocuments = async () => {
  isLoading.value = true
  try {
    let endpoint = `${API}/drive/documents`
    let params = { page: currentPage.value, page_size: 15 }
    
    if (currentTab.value === 'trash') {
      endpoint = `${API}/drive/trash`
      params = {}
    } else {
      if (searchQuery.value) params.search = searchQuery.value
      if (selectedCategory.value) params.category = selectedCategory.value
      if (selectedType.value) params.file_type = selectedType.value
      if (currentTab.value === 'shared') params.shared_with_me = true
      if (currentTab.value === 'approval') params.status = 'Pending Approval'
    }

    const res = await axios.get(endpoint, {
      params, headers: { Authorization: `Bearer ${getToken()}` }
    })
    
    if (currentTab.value === 'trash') {
       documents.value = res.data
       totalPages.value = 1
    } else {
       documents.value = res.data.documents || []
       totalPages.value = res.data.total_pages || 1
    }
  } catch (error) {
    console.error("Failed to fetch documents:", error)
  } finally {
    isLoading.value = false
  }
}

const fetchActivityForDoc = async (docId) => {
   try {
      const actRes = await axios.get(`${API}/drive/activity?document_id=${docId}&limit=15`, {
         headers: { Authorization: `Bearer ${getToken()}` }
      })
      docActivities.value = actRes.data
   } catch(e) { console.error(e) }
}

const debouncedFetch = debounce(() => { currentPage.value = 1; fetchDocuments() }, 300)
watch(currentTab, () => { currentPage.value = 1; fetchDocuments() })

// ACTIONS
const toggleFavorite = async (doc) => {
  doc.is_favorite = !doc.is_favorite
  try {
    await axios.post(`${API}/drive/documents/${doc.id}/favorite`, {}, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    fetchStats()
  } catch (e) {
    doc.is_favorite = !doc.is_favorite
  }
}

const promptDeleteDocument = (doc) => {
  docToDelete.value = doc
  isPermanentDelete.value = false
}

const promptPermanentDelete = (doc) => {
  docToDelete.value = doc
  isPermanentDelete.value = true
}

const executeDeleteDocument = async () => {
  if (!docToDelete.value) return
  const docId = docToDelete.value.id
  try {
    if (isPermanentDelete.value) {
       await axios.delete(`${API}/drive/documents/${docId}/permanent`, {
         headers: { Authorization: `Bearer ${getToken()}` }
       })
       toastSuccess("Document permanently destroyed")
    } else {
       await axios.delete(`${API}/drive/documents/${docId}`, {
         headers: { Authorization: `Bearer ${getToken()}` }
       })
       toastSuccess("Document moved to trash")
    }
    
    if (selectedDoc.value && selectedDoc.value.id === docId) {
      selectedDoc.value = null
    }
    fetchDocuments()
    fetchStats()
  } catch (e) {
    toastError(e.response?.data?.detail || "Delete failed")
    console.error(e)
  } finally {
    docToDelete.value = null
    isPermanentDelete.value = false
  }
}

const approveDocument = async (doc) => {
  try {
    await axios.put(`${API}/drive/documents/${doc.id}`, { status: 'Active' }, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    toastSuccess("Document approved successfully!")
    if (selectedDoc.value && selectedDoc.value.id === doc.id) {
       selectedDoc.value.status = 'Active'
    }
    fetchDocuments()
  } catch (e) {
    toastError(e.response?.data?.detail || "Failed to approve document")
  }
}

const restoreDocument = async (doc) => {
  try {
    await axios.post(`${API}/drive/documents/${doc.id}/restore`, {}, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    fetchDocuments()
    fetchStats()
  } catch (e) {}
}

const downloadFile = async (doc) => {
  try {
    await axios.post(`${API}/drive/documents/${doc.id}/download`, {}, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    window.open(`${API_BASE}${doc.file_url}`, '_blank')
    fetchStats()
  } catch (e) {}
}

// Open the share modal. Only the uploader or an admin can share — but we still show
// the modal for any user; the backend rejects with 403 if they're not authorized.
const shareDocument = (doc) => {
  if (!doc) return
  docToShare.value = doc
  shareSelectedUsers.value = []
  shareSearchQuery.value = ''
  shareError.value = ''
}

const closeShareModal = () => {
  docToShare.value = null
  shareSelectedUsers.value = []
  shareSearchQuery.value = ''
  shareError.value = ''
}

// Already-shared user ids (string compare; backend stores them as strings).
const isAlreadyShared = (userId) =>
  Array.isArray(docToShare.value?.shared_with) &&
  docToShare.value.shared_with.includes(userId)

// Toggle a user in the selection. Already-shared users are not toggleable.
const toggleShareUser = (userId) => {
  if (isAlreadyShared(userId)) return
  const idx = shareSelectedUsers.value.indexOf(userId)
  if (idx === -1) shareSelectedUsers.value.push(userId)
  else shareSelectedUsers.value.splice(idx, 1)
}

// Filtered, owner-excluded list driving the modal grid.
const shareableUsers = computed(() => {
  if (!docToShare.value) return []
  const ownerId = docToShare.value.uploaded_by
  const q = shareSearchQuery.value.trim().toLowerCase()
  return usersList.value
    .filter(u => u.id !== ownerId)
    .filter(u => !q ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q))
})

// Hydrated list of users this doc has already been shared with (for header chips & drawer).
const alreadySharedUsers = computed(() => {
  const ids = docToShare.value?.shared_with || []
  if (!Array.isArray(ids) || !ids.length) return []
  return usersList.value.filter(u => ids.includes(u.id))
})

// Same hydration but for the selected drawer doc.
const drawerSharedUsers = computed(() => {
  const ids = selectedDoc.value?.shared_with || []
  if (!Array.isArray(ids) || !ids.length) return []
  return usersList.value.filter(u => ids.includes(u.id))
})

const executeShare = async () => {
  if (!docToShare.value || !shareSelectedUsers.value.length) return
  isSharing.value = true
  shareError.value = ''
  try {
    const res = await axios.post(
      `${API}/drive/documents/${docToShare.value.id}/share`,
      { user_ids: shareSelectedUsers.value },
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
    // Update the local doc & drawer cache so the "Already shared" labels reflect immediately.
    if (docToShare.value) docToShare.value.shared_with = res.data.shared_with || []
    if (selectedDoc.value && selectedDoc.value.id === docToShare.value.id) {
      selectedDoc.value.shared_with = res.data.shared_with || []
    }
    toastSuccess(`Shared with ${res.data.added_count} user(s).`)
    closeShareModal()
    fetchDocuments()
  } catch (e) {
    shareError.value = e.response?.data?.detail || 'Share failed.'
  } finally {
    isSharing.value = false
  }
}

const openDocDetails = (doc) => { 
   selectedDoc.value = doc 
   drawerTab.value = 'info'
   fetchActivityForDoc(doc.id)
}
const changePage = (p) => { if (p >= 1 && p <= totalPages.value) { currentPage.value = p; fetchDocuments() } }

// UPLOAD LOGIC
const handleDrop = (e) => { dragover.value = false; if (e.dataTransfer.files.length) setUploadFile(e.dataTransfer.files[0]) }
const handleFileSelect = (e) => { if (e.target.files.length) setUploadFile(e.target.files[0]) }
const setUploadFile = (f) => {
  if (f.size > 2 * 1024 * 1024 * 1024) {
     toastError("File exceeds 2GB limit.")
     return uploadError.value = "File exceeds 2GB limit."
  }
  uploadError.value = ""; uploadFile.value = f
  if (!uploadForm.value.title) uploadForm.value.title = f.name.replace(/\.[^/.]+$/, "")
}

const toggleSharedUser = (userId) => {
  const idx = uploadForm.value.shared_with.indexOf(userId)
  if (idx === -1) uploadForm.value.shared_with.push(userId)
  else uploadForm.value.shared_with.splice(idx, 1)
}

const handleUpload = async () => {
  if (!uploadFile.value) return

  // Mandatory metadata gates (mirrors backend validation in drive.py /upload)
  if (!uploadForm.value.title?.trim())       return uploadError.value = 'Title is required.'
  if (!uploadForm.value.category)            return uploadError.value = 'Category is required.'
  if (!uploadForm.value.access_level)        return uploadError.value = 'Access level is required.'
  if (uploadForm.value.access_level === 'User' && uploadForm.value.shared_with.length === 0) {
    return uploadError.value = 'Select at least one user to share with.'
  }
  uploadError.value = ''
  isUploading.value = true

  const formData = new FormData()
  formData.append('file', uploadFile.value)
  formData.append('title', uploadForm.value.title)
  formData.append('category', uploadForm.value.category)
  formData.append('tags', uploadForm.value.tags)
  formData.append('access_level', uploadForm.value.access_level)
  formData.append('is_confidential', uploadForm.value.is_confidential)
  if (uploadForm.value.access_level === 'User' && uploadForm.value.shared_with.length > 0) {
      formData.append('shared_with', uploadForm.value.shared_with.join(','))
  }

  try {
    await axios.post(`${API}/drive/upload`, formData, {
      headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'multipart/form-data' }
    })
    showUploadModal.value = false
    uploadFile.value = null
    uploadForm.value = { title: '', category: '', description: '', tags: '', access_level: 'Private', is_confidential: false, shared_with: [] }
    fetchStats()
    fetchDocuments()
  } catch (error) {
    uploadError.value = error.response?.data?.detail || "Upload failed."
  } finally {
    isUploading.value = false
  }
}

// UTILS
const formatBytes = (bytes) => {
  if (!+bytes) return '0 B'
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const formatTimeAgo = (dateStr) => {
  if (!dateStr) return ''
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000)
  let interval = seconds / 86400; if (interval > 1) return Math.floor(interval) + "d"
  interval = seconds / 3600; if (interval > 1) return Math.floor(interval) + "h"
  interval = seconds / 60; if (interval > 1) return Math.floor(interval) + "m"
  return "Just now"
}
const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'
const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

// Access-level-aware ribbon (shown above the file preview in the detail drawer)
const ribbonLabel = (d) => {
  if (d.status === 'Pending Approval') return 'Pending Admin Approval'
  if (d.is_confidential)               return 'Confidential'
  return d.access_level === 'Private' ? 'Private — Owner & Admin only'
       : d.access_level === 'User'    ? 'Shared with selected users'
       :                                'Visible to organization'
}
const ribbonClass = (d) =>
  d.is_confidential                ? 'text-red-500'
  : d.access_level === 'Private'   ? 'al-private'
  : d.access_level === 'User'      ? 'al-user'
  :                                  'al-org'
const getFileIcon = (type) => {
  switch (type) {
    case 'pdf': return FileText; case 'document': return FileText; case 'spreadsheet': return LayoutGrid;
    case 'image': return ImageIcon; case 'video': return Film; case 'audio': return Music;
    case 'archive': return Archive; default: return File;
  }
}
const getColorForType = (type) => {
  switch (type) {
    case 'pdf': return '#ef4444'; case 'document': return '#3b82f6'; case 'spreadsheet': return '#22c55e';
    case 'image': return '#a855f7'; default: return '#f59e0b';
  }
}

onMounted(() => { fetchStats(); fetchDocuments(); fetchUsers() })
</script>

<style scoped>
/* ELEGANT, UN-CLUSTERED, PREMIUM DARK THEME */
.drive-os-container {
  min-height: calc(100vh - 52px); width: 100%;
  background: transparent;
  color: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: visible;
}

.drive-os-layout {
  display: flex; min-height: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

/* Base Interactions & Animations */
.hover-lift { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.hover-lift:hover { transform: translateY(-4px); box-shadow: 0 15px 30px rgba(0,0,0,0.4); }
.hover-lift:active { transform: translateY(0); }

.spin-hover { transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s; }
.spin-hover:hover { transform: rotate(90deg) scale(1.1); }

.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

.z-elevated { z-index: 50; }

/* Ultra High Animations */
@keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes popIn { 0% { opacity: 0; transform: scale(0.85); filter: blur(4px); } 60% { transform: scale(1.02); filter: blur(0); } 100% { opacity: 1; transform: scale(1); filter: blur(0); } }
@keyframes slideInText { from { opacity: 0; transform: translateX(-20px); filter: blur(4px); } to { opacity: 1; transform: translateX(0); filter: blur(0); } }
@keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); } 70% { box-shadow: 0 0 0 15px rgba(245, 158, 11, 0); } 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); } }
@keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); } 70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
@keyframes floating { 0% { transform: translateY(0px); } 50% { transform: translateY(-8px); } 100% { transform: translateY(0px); } }
@keyframes expandWidth { from { width: 0; } to { } }

/* Ultra-modern Fluid Spring Modal Animation (High Level) */
@keyframes fluidSpring {
  0% { opacity: 0; transform: translateY(40px) scale(0.9); filter: blur(16px); }
  60% { opacity: 1; transform: translateY(-5px) scale(1.02); filter: blur(0); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
@keyframes fluidSpringHide {
  0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
  100% { opacity: 0; transform: translateY(20px) scale(0.95); filter: blur(8px); }
}

/* Staggered Interior Content */
@keyframes innerContentReveal {
  0% { opacity: 0; transform: translateY(15px); }
  100% { opacity: 1; transform: translateY(0); }
}

.inner-stagger-1 { animation: innerContentReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
.inner-stagger-2 { animation: innerContentReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both; }

.fade-up { animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
.fade-up-stagger { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
.pop-in { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
.slide-in-text { animation: slideInText 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
.pulse-node { animation: pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.pulse-red { animation: pulseRed 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.float-anim { animation: floating 4s ease-in-out infinite; }

.tab-fade-enter-active, .tab-fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.tab-fade-enter-from, .tab-fade-leave-to { opacity: 0; transform: translateY(10px); }

/* Fade Backdrop properly */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Advanced Modal Spring Transition */
.modal-spring-enter-active { transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-spring-leave-active { transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-spring-enter-from, .modal-spring-leave-to { opacity: 0; }

.modal-spring-enter-active .custom-modal-panel { animation: fluidSpring 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
.modal-spring-leave-active .custom-modal-panel { animation: fluidSpringHide 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }

/* --- LEFT SIDEBAR --- */
.drive-sidebar { width: 280px; flex-shrink: 0; padding: 40px 16px 32px 32px; }
.sidebar-inner { height: 100%; border-radius: 24px; padding: 0; display: flex; flex-direction: column; gap: 24px; position: relative; }

.sidebar-header { display: flex; align-items: center; gap: 14px; }
.brand-icon { width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,88,12,0.05)); color: #fbbf24; display: flex; align-items: center; justify-content: center; position: relative; border: 1px solid rgba(245,158,11,0.2); }
.hex-glow { position: absolute; inset: -4px; background: #fbbf24; opacity: 0.15; filter: blur(12px); border-radius: 50%; }
.brand-text h2 { font-size: 18px; font-weight: 700; margin: 0; color: #fff; letter-spacing: -0.02em; }
.brand-text span { font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }

.btn-upload-primary { position: relative; width: 100%; padding: 14px; border-radius: 16px; border: none; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 600; color: #000; cursor: pointer; background: #f59e0b; overflow: hidden; box-shadow: 0 10px 20px rgba(245, 158, 11, 0.15); }
.btn-upload-bg { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0)); opacity: 0; transition: opacity 0.3s; }
.btn-upload-primary:hover .btn-upload-bg { opacity: 1; }

.drive-nav { display: flex; flex-direction: column; gap: 24px; }
.nav-section { display: flex; flex-direction: column; gap: 6px; }
.nav-label { font-size: 11px; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; padding: 0 16px; margin-bottom: 4px; }
.nav-item { display: flex; align-items: center; gap: 14px; width: 100%; padding: 12px 16px; background: transparent; border: none; border-radius: 12px; color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); text-align: left; }
.nav-item:hover { color: #fff; background: rgba(255,255,255,0.03); transform: translateX(4px); }
.nav-item.active { background: rgba(245,158,11,0.08); color: #fbbf24; font-weight: 600; border: 1px solid rgba(245,158,11,0.1); }
.nav-item.mini { padding: 10px 16px; font-size: 13px; min-width: 0; }
.fav-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; width: 100%; }
.empty-text { font-size: 13px; color: rgba(255,255,255,0.3); padding: 0 16px; }

/* Modern Embedded Storage Widget */
.storage-widget-modern { margin-top: auto; padding: 24px; border-radius: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); }
.sw-top { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.sw-title { font-size: 13px; font-weight: 600; color: #fff; }
.sw-bar-wrap { height: 6px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; margin-bottom: 12px; display: flex; gap: 2px; }
.sw-segment { height: 100%; border-radius: 4px; animation: expandWidth 1.5s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
.sw-info { display: flex; justify-content: space-between; font-size: 12px; }
.sw-used { color: #fff; font-weight: 600; font-family: 'SF Mono', monospace; }
.sw-total { color: rgba(255,255,255,0.4); font-family: 'SF Mono', monospace; }
.sw-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px dashed rgba(255,255,255,0.05); }
.swl-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 500; }
.swl-dot { width: 6px; height: 6px; border-radius: 50%; box-shadow: 0 0 6px currentColor; }

/* --- MIDDLE CONTENT --- */
.drive-content-area { flex: 1; display: flex; flex-direction: column; min-width: 0; padding: 40px 32px 0 32px; }
.top-bar { display: flex; justify-content: flex-start; align-items: center; margin-bottom: 40px; }
.search-omni { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 0 20px; border-radius: 32px; width: 480px; height: 48px; transition: all 0.3s; }
.search-omni:focus-within { background: rgba(255,255,255,0.05); border-color: rgba(245,158,11,0.3); box-shadow: 0 0 0 4px rgba(245,158,11,0.1); }
.search-omni input { background: transparent; border: none; outline: none; color: #fff; font-size: 15px; flex: 1; }
.search-omni input::placeholder { color: rgba(255,255,255,0.3); }
.search-kbd { font-size: 11px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 6px; color: rgba(255,255,255,0.5); font-family: 'SF Mono', monospace; font-weight: 600;}

.scrollable-viewport { flex: 1; display: flex; flex-direction: column; gap: 48px; padding-right: 16px; padding-bottom: 40px; }

.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.section-header h3 { font-size: 20px; font-weight: 600; color: #fff; margin: 0; letter-spacing: -0.02em; }
.link-btn { background: transparent; border: none; color: #f59e0b; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: opacity 0.2s; }
.link-btn:hover { opacity: 0.8; }

/* Recent Grid */
.recent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; }
.recent-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 20px; padding: 12px; cursor: pointer; position: relative; }
.recent-card:hover { border-color: rgba(245,158,11,0.2); }
.rc-preview { height: 140px; border-radius: 12px; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,0.02); }
.rc-image-cover { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; transition: opacity 0.3s; }
.recent-card:hover .rc-image-cover { opacity: 1; transform: scale(1.05); transition: transform 0.5s ease; }
.rc-bg-glow { position: absolute; width: 100px; height: 100px; background: inherit; filter: blur(40px); opacity: 0.3; }
.rc-preview.pdf { background: rgba(239,68,68,0.05); color: #ef4444; }
.rc-preview.document { background: rgba(59,130,246,0.05); color: #3b82f6; }
.rc-preview.spreadsheet { background: rgba(34,197,94,0.05); color: #22c55e; }
.rc-icon-main { position: relative; z-index: 1; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4)); opacity: 0.9; transition: transform 0.3s; }
.recent-card:hover .rc-icon-main { transform: scale(1.1); }
.rc-pill-badge { position: absolute; bottom: 12px; left: 12px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; color: #fff; border: 1px solid rgba(255,255,255,0.1); font-family: 'SF Mono', monospace;}
.rc-fav-btn { position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(8px); color: rgba(255,255,255,0.3); cursor: pointer; padding: 6px; border-radius: 10px; transition: all 0.2s; }
.recent-card:hover .rc-fav-btn { color: rgba(255,255,255,0.8); }
.rc-info { padding: 16px 8px 8px; }
.multi-line-truncate { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; font-size: 14px; font-weight: 600; color: #e2e8f0; letter-spacing: -0.01em; margin: 0 0 6px; line-height: 1.4; }
.rc-info p { margin: 0; font-size: 12px; color: rgba(255,255,255,0.4); font-weight: 500; }

/* All Files Table */
.list-filters { display: flex; gap: 16px; }
.filter-dropdown { width: 160px; } 

.files-data-table { display: flex; flex-direction: column; gap: 8px; }
.table-header { display: flex; padding: 0 24px 12px; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.05em; }
.th-col, .td-col { display: flex; align-items: center; min-width: 0; } 
.w-name { flex: 3; }
.w-owner { flex: 1.5; }
.w-size { flex: 1; }
.w-date { flex: 1.5; }
.w-action { flex: 1; justify-content: flex-end; gap: 8px; }

.table-row { display: flex; padding: 14px 24px; border-radius: 16px; border: 1px solid transparent; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); background: rgba(255,255,255,0.02); align-items: center; margin-bottom: 8px; }
.hover-lift-row:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.05); transform: scale(1.005) translateY(-2px); box-shadow: 0 15px 35px rgba(0,0,0,0.3); }
.file-icon-sm { width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center; margin-right: 16px; border: 1px solid rgba(255,255,255,0.03); }
.file-icon-sm.pdf { color: #ef4444; background: rgba(239,68,68,0.05); }
.file-icon-sm.document { color: #3b82f6; background: rgba(59,130,246,0.05); }
.file-icon-sm.spreadsheet { color: #22c55e; background: rgba(34,197,94,0.05); }
.file-icon-sm.image { color: #a855f7; background: rgba(168,85,247,0.05); }

.file-name-block { display: flex; flex-direction: column; min-width: 0; flex: 1; gap: 2px; padding-right: 16px; }
.truncate-block { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; width: 100%; }

.fn-title { font-size: 14px; font-weight: 500; color: #fff; letter-spacing: -0.01em; }
.fn-sub { font-size: 11px; font-weight: 600; }

.avatar-stack { display: flex; align-items: center; min-width: 0; width: 100%; padding-right: 16px; }
.avatar-micro { width: 26px; height: 26px; border-radius: 50%; flex-shrink:0; background: linear-gradient(135deg, #f59e0b, #ec4899); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; }
.owner-name { font-size: 13px; color: rgba(255,255,255,0.6); font-weight: 500; }

.action-ico { background: transparent; border: none; padding: 6px; border-radius: 8px; color: rgba(255,255,255,0.3); cursor: pointer; transition: all 0.2s; opacity: 0; }
.table-row:hover .action-ico { opacity: 1; }
.action-ico:hover { background: rgba(255,255,255,0.05); color: #fff; transform: translateY(-2px) scale(1.1); }
.action-ico.hover-amber:hover { color: #fbbf24; background: rgba(245,158,11,0.1); }
.action-ico.hover-red:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
.action-ico.hover-blue:hover { color: #3b82f6; background: rgba(59,130,246,0.1); }

.table-state { padding: 80px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 14px; color: rgba(255,255,255,0.4); }
.pagination-footer { display: flex; justify-content: center; align-items: center; gap: 24px; padding: 32px 0; }

/* --- TRANSPARENT DRAWER (Matches Expenses) --- */
.app-drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 1000; }
.transparent-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 440px; background: #0a0a0a; border-left: 1px solid #27272a; z-index: 1010; transform: translateX(100%); transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: -20px 0 60px rgba(0,0,0,0.8); display: flex; flex-direction: column; }
.transparent-drawer.is-open { transform: translateX(0); }
.drawer-inner { display: flex; flex-direction: column; height: 100%; }
.drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 24px 32px; border-bottom: 1px solid #27272a; background: #0a0a0a; }
.dh-title .doc-id { font-family: 'SF Mono', monospace; font-size: 12px; color: #a1a1aa; font-weight: 600; background: #18181b; padding: 4px 10px; border-radius: 6px; border: 1px solid #27272a; }
.dh-actions { display: flex; align-items: center; gap: 16px; }
.drawer-action-btn { background: transparent; border: 1px solid #27272a; color: #a1a1aa; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
.drawer-action-btn.hover-red:hover { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.2); }
.drawer-close { background: transparent; border: none; color: #a1a1aa; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 50;}
.drawer-close:hover { color: #fff; background: #27272a; }
.drawer-scroll-body { flex: 1; padding: 32px; overflow-y: auto; overflow-x: hidden; }

.drawer-hero-minimal { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.dhm-icon { width: 56px; height: 56px; border-radius: 16px; flex-shrink: 0; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); display: flex; align-items: center; justify-content: center; }
.dhm-info { min-width: 0; }
.dhm-info h2 { font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 4px; letter-spacing: -0.01em; line-height: 1.3; }
.dhm-meta { font-size: 13px; color: #a1a1aa; font-weight: 500; }
.wrap-title { white-space: normal; word-break: break-word; } 

.status-ribbon { display: flex; justify-content: space-between; align-items: center; background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 12px 16px; margin-bottom: 24px;}
.sr-item { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
.sr-date { font-size: 12px; color: #71717a; font-family: 'SF Mono', monospace; }

.doc-image-preview { width: 100%; border-radius: 16px; overflow: hidden; border: 1px solid #27272a; margin-bottom: 24px;}
.doc-image-preview img { width: 100%; height: auto; display: block; }
.doc-generic-preview { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; margin-bottom: 24px; position: relative; overflow: hidden; text-align: center; }
.generic-bg-glow { position: absolute; width: 120px; height: 120px; border-radius: 50%; filter: blur(40px); opacity: 0.15; z-index: 0; }
.generic-bg-glow.pdf { background: #ef4444; }
.generic-bg-glow.document { background: #3b82f6; }
.generic-bg-glow.spreadsheet { background: #22c55e; }
.generic-icon { color: rgba(255,255,255,0.8); z-index: 1; margin-bottom: 16px; }
.generic-name { font-size: 16px; font-weight: 600; color: #fff; z-index: 1; word-break: break-word; max-width: 100%; line-height: 1.4; }
.generic-type { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4); z-index: 1; margin-top: 8px; letter-spacing: 0.1em; }

.modern-tabs { display: flex; gap: 24px; border-bottom: 1px solid #27272a; margin-bottom: 24px; }
.d-tab { background: transparent; border: none; padding: 0 0 12px 0; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; cursor: pointer; position: relative; transition: color 0.2s; }
.d-tab.active { color: #f4f4f5; }
.d-tab.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: #f59e0b; box-shadow: 0 -2px 8px rgba(245,158,11,0.4); }

.info-block h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; font-weight: 600; margin: 0 0 12px; }
.separator-line { height: 1px; width: 100%; background: linear-gradient(90deg, rgba(255,255,255,0.1), transparent); margin-bottom: 12px; }
.ib-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 10px 0; border-bottom: 1px dashed rgba(255,255,255,0.05); }
.ib-row:last-child { border-bottom: none; }
.ib-label { font-size: 13px; color: #a1a1aa; flex-shrink: 0; }
.ib-val { font-size: 14px; font-weight: 500; color: #f4f4f5; text-align: right; }

/* Elegant Modern Audit Trail */
.audit-trail-container { position: relative; padding: 10px 0; }
.at-event { position: relative; padding-left: 32px; margin-bottom: 32px; }
.at-event:last-child { margin-bottom: 0; }
.at-line { position: absolute; left: 6px; top: 16px; bottom: -32px; width: 2px; background: linear-gradient(to bottom, #27272a, rgba(39,39,42,0.1)); border-radius: 2px; }
.at-event:last-child .at-line { display: none; }
.at-node { position: absolute; left: 0; top: 4px; width: 14px; height: 14px; border-radius: 50%; background: #f59e0b; border: 3px solid #0a0a0a; z-index: 2; }
.at-content { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 14px 16px; border-radius: 14px; display: flex; flex-direction: column; gap: 8px; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.at-content:hover { background: rgba(255,255,255,0.04); border-color: rgba(245,158,11,0.2); transform: translateX(4px); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
.at-header { display: flex; justify-content: space-between; align-items: center; }
.at-user { font-size: 13px; font-weight: 600; color: #f4f4f5; display: flex; align-items: center; gap: 6px; }
.at-user::before { content: ''; width: 20px; height: 20px; border-radius: 50%; background: #27272a; display: inline-block; }
.at-time { font-size: 11px; color: #71717a; font-family: 'SF Mono', monospace; font-weight: 500; }
.at-action-pill { align-self: flex-start; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 10px; border-radius: 8px; background: rgba(245,158,11,0.1); color: #fbbf24; border: 1px solid rgba(245,158,11,0.2); }
.at-action-pill.downloaded { background: rgba(59,130,246,0.1); color: #3b82f6; border-color: rgba(59,130,246,0.2); }
.at-action-pill.deleted { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.2); }
.at-detail { font-size: 13px; color: #a1a1aa; line-height: 1.5; margin-top: 4px; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.05); }

.drawer-footer { display: flex; gap: 12px; padding: 24px 32px; border-top: 1px solid #27272a; background: #0a0a0a; z-index: 10; position: relative;}
.df-btn { position: relative; overflow: hidden; flex: 1; padding: 12px; border-radius: 12px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; }
.df-btn.primary { background: #f5f5f7; color: #000; }
.df-btn.outline { background: #18181b; border: 1px solid #27272a; color: #f4f4f5; flex: 0 0 auto; padding: 12px 18px; }
.df-btn.outline:hover { background: #27272a; }

/* Access-level color tokens (brand: --accent-danger / --accent-noir / --accent-emerald) */
.al-private { color: #ff453a; }
.al-user    { color: #0a84ff; }
.al-org     { color: #00d95f; }
.al-pill {
  display: inline-flex; align-items: center;
  padding: 2px 10px; border-radius: 999px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
  border: 1px solid currentColor;
}
.al-pill.al-private      { color: #ff453a; background: rgba(255, 69, 58, 0.10); }
.al-pill.al-user         { color: #0a84ff; background: rgba(10, 132, 255, 0.10); }
.al-pill.al-organization { color: #00d95f; background: rgba(0, 217, 95, 0.10); }

/* --- MODAL COMPACT (Transparent Glassmorphic Design) --- */
/* z-index 2000 keeps confirmation/upload/share modals above the drawer (z-index 1010) — without this, clicking
   "Delete" inside the drawer rendered the confirmation behind the drawer panel and looked like nothing happened. */
.custom-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.compact-modal { max-width: 460px; width: 100%; max-height: 85vh; border-radius: 20px; display: flex; flex-direction: column; background: rgba(30, 30, 30, 0.65) !important; backdrop-filter: blur(50px) saturate(200%); -webkit-backdrop-filter: blur(50px) saturate(200%); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }

.cmp-header { display: flex; align-items: center; gap: 16px; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.icon-ring { width: 40px; height: 40px; border-radius: 10px; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); color: #fbbf24; display: flex; align-items: center; justify-content: center; }
.cmp-title-box h3 { margin: 0 0 2px; font-size: 16px; font-weight: 700; color: #fff; }
.cmp-title-box p { margin: 0; font-size: 12px; color: rgba(255,255,255,0.5); }
.cmp-close { margin-left: auto; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; z-index: 50;}
.cmp-close:hover { background: rgba(255,255,255,0.1); color: #fff; transform: rotate(90deg); }

.cmp-body { padding: 24px; flex: 1; overflow-y: auto; }
.upload-dropzone { border: 2px dashed rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; text-align: center; cursor: pointer; background: rgba(255,255,255,0.02); transition: all 0.3s; }
.upload-dropzone.is-dragover { border-color: #fbbf24; background: rgba(245,158,11,0.05); transform: scale(1.02); }
.dz-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.dz-icon-circle { width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.4); }
.dz-text { font-size: 14px; font-weight: 600; color: #e2e8f0; }
.dz-sub { font-size: 11px; color: rgba(255,255,255,0.4); }
.dz-filled { display: flex; align-items: center; gap: 16px; text-align: left; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
.f-info { flex: 1; display: flex; flex-direction: column; min-width: 0; gap: 4px; }
.f-name { font-size: 14px; font-weight: 600; color: #fff; display: block; width: 100%; }
.f-size { font-size: 12px; color: rgba(255,255,255,0.5); font-family: 'SF Mono', monospace; }
.f-remove { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
.f-remove:hover { background: #ef4444; color: #fff; transform: scale(1.1); box-shadow: 0 4px 12px rgba(239,68,68,0.4); }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
.fg-item { display: flex; flex-direction: column; gap: 6px; }
.fg-item.full-width { grid-column: 1 / -1; }
.fg-item label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.6); }
.custom-input { width: 100%; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 14px; color: #fff; font-size: 13px; outline: none; transition: border 0.2s; }
.custom-input:focus { border-color: #fbbf24; }

.security-toggle { display: flex; justify-content: space-between; align-items: center; background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.1); padding: 16px; border-radius: 12px; margin-top: 24px; position: relative; z-index: 10; }
.st-info { display: flex; align-items: center; gap: 12px; }
.st-title { display: block; font-size: 13px; font-weight: 600; color: #e2e8f0; margin-bottom: 2px; }
.st-desc { display: block; font-size: 11px; color: rgba(255,255,255,0.5); }
.switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background-color: rgba(255,255,255,0.1); transition: .4s; }
.slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; }
.switch input:checked + .slider { background-color: #ef4444; }
.switch input:checked + .slider:before { transform: translateX(18px); }
.slider.round { border-radius: 24px; }
.slider.round:before { border-radius: 50%; }

/* Custom User Select Grid - Premium Design */
.user-select-grid { 
  display: grid; 
  grid-template-columns: 1fr 1fr; 
  gap: 10px; 
  max-height: 200px; 
  overflow-y: auto; 
  padding: 4px;
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05);
}

.usg-item { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  padding: 10px; 
  background: rgba(255,255,255,0.03); 
  border: 1px solid rgba(255,255,255,0.05); 
  border-radius: 10px; 
  cursor: pointer; 
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); 
  position: relative;
  overflow: hidden;
}

.usg-item:hover { 
  background: rgba(255,255,255,0.06); 
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.1);
}

.usg-item.active { 
  background: rgba(245,158,11,0.15); 
  border-color: rgba(245,158,11,0.4); 
  box-shadow: 0 4px 15px rgba(245,158,11,0.1);
}

.usg-avatar { 
  width: 32px; 
  height: 32px; 
  border-radius: 8px; 
  background: #27272a; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 11px; 
  font-weight: 700; 
  color: #a1a1aa; 
  transition: all 0.3s;
}

.usg-item.active .usg-avatar { 
  background: #f59e0b; 
  color: #000; 
}

.usg-info { 
  display: flex; 
  flex-direction: column; 
  flex: 1; 
  min-width: 0; 
}

.usg-name { 
  font-size: 13px; 
  font-weight: 600; 
  color: #fff; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
}

.usg-email { 
  font-size: 11px; 
  color: rgba(255,255,255,0.4); 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
}

.usg-check { 
  color: #f59e0b;
}

.cmp-footer { display: flex; justify-content: flex-end; gap: 12px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 8px; }
.cmp-btn { position: relative; overflow: hidden; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; }
.cmp-btn.ghost { background: transparent; color: rgba(255,255,255,0.5); }
.cmp-btn.ghost:hover { background: rgba(255,255,255,0.05); color: #fff; }
.cmp-btn.primary { background: #fff; color: #000; }
.cmp-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Custom Delete Modal */
.delete-modal { width: 400px; text-align: center; padding: 40px 32px 32px; background: rgba(18, 18, 18, 0.8) !important; }
.dm-icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
.delete-modal h3 { font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 12px; }
.delete-modal p { font-size: 14px; color: rgba(255,255,255,0.5); margin: 0 0 32px; line-height: 1.5; }
.dm-actions { display: flex; gap: 12px; }
.dm-actions .cmp-btn { flex: 1; padding: 14px; }
.delete-btn { background: #ef4444; color: #fff; border: none; }
.delete-btn:hover { background: #dc2626; }

/* ============================================================
   SHARE MODAL — Premium glassmorphic, amber/orange palette
   Tokens used:
     --amber-500: #f59e0b   --amber-400: #fbbf24
     --orange-500: #f97316  --gold: #ffb900
   ============================================================ */
.share-backdrop { background: rgba(0, 0, 0, 0.55); backdrop-filter: blur(20px) saturate(160%); -webkit-backdrop-filter: blur(20px) saturate(160%); }
.share-modal-v2 {
  position: relative;
  width: 100%; max-width: 540px; max-height: 88vh;
  border-radius: 24px; overflow: hidden;
  display: flex; flex-direction: column;
  /* Neutral dark glass — orange/amber stays on inner accents only */
  background: linear-gradient(180deg, rgba(20, 20, 22, 0.62) 0%, rgba(12, 12, 14, 0.72) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset;
  backdrop-filter: blur(48px) saturate(180%);
  -webkit-backdrop-filter: blur(48px) saturate(180%);
  animation: share-modal-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes share-modal-pop {
  0% { opacity: 0; transform: translateY(14px) scale(0.97); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.share-aura-glow {
  /* Subtle accent on the corners only — keeps the panel neutral while hinting at brand */
  position: absolute; inset: -1px; pointer-events: none; z-index: 0; border-radius: inherit;
  background:
    radial-gradient(40% 50% at 0% 0%, rgba(245, 158, 11, 0.06), transparent 70%),
    radial-gradient(40% 50% at 100% 100%, rgba(249, 115, 22, 0.04), transparent 70%);
}

/* HEADER */
.share-header {
  position: relative; z-index: 1;
  display: flex; align-items: flex-start; gap: 14px;
  padding: 22px 24px 16px;
}
.share-icon-ring {
  position: relative; flex-shrink: 0;
  width: 46px; height: 46px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(249, 115, 22, 0.16));
  border: 1px solid rgba(245, 158, 11, 0.32);
  color: #fbbf24;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 24px rgba(245, 158, 11, 0.20), 0 0 0 4px rgba(245, 158, 11, 0.04);
}
.share-icon-spark {
  position: absolute; top: -4px; right: -4px; color: #ffb900;
  filter: drop-shadow(0 0 6px rgba(255, 185, 0, 0.7));
  animation: share-spark 2.2s ease-in-out infinite;
}
@keyframes share-spark {
  0%, 100% { opacity: 0.4; transform: scale(0.85) rotate(0deg); }
  50%      { opacity: 1;   transform: scale(1.1)  rotate(15deg); }
}
.share-title-block { flex: 1; min-width: 0; }
.share-eyebrow {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9px; letter-spacing: 0.18em; font-weight: 700;
  color: #fbbf24; text-transform: uppercase;
  padding: 3px 8px; border-radius: 999px;
  background: rgba(245, 158, 11, 0.10); border: 1px solid rgba(245, 158, 11, 0.20);
  margin-bottom: 6px;
}
.share-title { font-size: 18px; font-weight: 700; color: #fff; margin: 0 0 2px; letter-spacing: -0.01em; }
.share-subtitle { font-size: 12px; color: rgba(255,255,255,0.45); max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.share-close {
  width: 30px; height: 30px; border-radius: 50%;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.55); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s ease;
}
.share-close:hover { background: rgba(255,255,255,0.10); color: #fff; transform: rotate(90deg); }
.share-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.10), transparent);
  margin: 0 24px;
}

/* BODY */
.share-body { position: relative; z-index: 1; padding: 18px 24px 4px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; }
.share-status-pill {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 12px;
  font-size: 12px; line-height: 1.45;
  animation: share-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.share-status-pill.is-active { background: rgba(0, 217, 95, 0.06); border: 1px solid rgba(0, 217, 95, 0.18); color: #c5e1c2; }
.share-status-pill.is-active svg { color: #00d95f; flex-shrink: 0; }
.share-status-pill.is-pending { background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.22); color: #fde9c4; }
.share-status-pill.is-pending svg { color: #f59e0b; flex-shrink: 0; }
@keyframes share-fade-up {
  0% { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}

.share-section-block { display: flex; flex-direction: column; gap: 8px; animation: share-fade-up 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
.share-section-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: rgba(245, 158, 11, 0.85);
}
.share-section-label svg { color: #f59e0b; }
.share-count-pill {
  margin-left: 4px;
  font-size: 10px; font-weight: 700;
  padding: 1px 7px; border-radius: 999px;
  background: rgba(245, 158, 11, 0.18); color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.30);
  letter-spacing: 0;
}

.share-existing-stack { display: flex; flex-wrap: wrap; gap: 6px; }
.share-existing-chip {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 10px 5px 5px; border-radius: 999px;
  background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.22);
  font-size: 11px; font-weight: 600; color: #fde9c4;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.share-existing-chip:hover { background: rgba(245, 158, 11, 0.14); transform: translateY(-1px); border-color: rgba(245, 158, 11, 0.35); }
.share-chip-avatar { width: 22px; height: 22px; font-size: 9px; background: rgba(245, 158, 11, 0.30); color: #1a1208; border: 1px solid rgba(245, 158, 11, 0.40); }

/* SEARCH */
.share-search-wrap-v2 { position: relative; }
.share-search-icon-v2 { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: rgba(245, 158, 11, 0.55); pointer-events: none; }
.share-search-input-v2 {
  width: 100%;
  background: rgba(0, 0, 0, 0.30);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 12px 38px 12px 38px; color: #fff; font-size: 13px;
  transition: all 0.25s ease;
}
.share-search-input-v2::placeholder { color: rgba(255,255,255,0.28); }
.share-search-input-v2:focus {
  outline: none; border-color: rgba(245, 158, 11, 0.45);
  background: rgba(245, 158, 11, 0.04);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.08);
}
.share-search-clear {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s ease;
}
.share-search-clear:hover { background: rgba(245, 158, 11, 0.20); color: #fff; }

/* USER GRID */
.share-user-grid-v2 {
  display: flex; flex-direction: column; gap: 8px;
  max-height: 260px; overflow-y: auto; padding-right: 4px;
}
.share-user-card {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  animation: share-fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  position: relative; overflow: hidden;
}
.share-user-card::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0), rgba(245, 158, 11, 0));
  transition: background 0.3s ease;
}
.share-user-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(245, 158, 11, 0.25);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0,0,0,0.25);
}
.share-user-card:hover::before { background: linear-gradient(135deg, rgba(245, 158, 11, 0.04), rgba(249, 115, 22, 0.02)); }
.share-user-card.active {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(249, 115, 22, 0.08));
  border-color: rgba(245, 158, 11, 0.50);
  box-shadow: 0 8px 22px rgba(245, 158, 11, 0.12), 0 0 0 1px rgba(245, 158, 11, 0.25) inset;
}
.share-user-card.is-existing { opacity: 0.55; cursor: not-allowed; }
.share-user-card.is-existing:hover { transform: none; border-color: rgba(0, 217, 95, 0.18); background: rgba(0, 217, 95, 0.03); }

.suc-avatar {
  flex-shrink: 0; width: 38px; height: 38px; border-radius: 11px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #d4d4d8;
  transition: all 0.3s ease;
}
.share-user-card.active .suc-avatar {
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: #1a1208; border-color: rgba(255, 255, 255, 0.20);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.30);
}
.suc-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.suc-name-row, .suc-email-row { display: flex; align-items: center; gap: 6px; }
.suc-name-row svg { color: rgba(245, 158, 11, 0.6); flex-shrink: 0; }
.suc-email-row svg { color: rgba(255,255,255,0.30); flex-shrink: 0; }
.suc-name { font-size: 13px; font-weight: 600; color: #fff; line-height: 1.2; }
.suc-email { font-size: 11px; color: rgba(255,255,255,0.42); line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.suc-badge {
  flex-shrink: 0; min-width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  padding: 0 8px; border-radius: 8px; font-size: 10px; font-weight: 700;
  transition: all 0.2s ease;
}
.suc-badge.idle { background: transparent; border: 1px dashed rgba(255,255,255,0.12); color: rgba(255,255,255,0.35); }
.share-user-card:hover .suc-badge.idle { border-color: rgba(245, 158, 11, 0.35); color: rgba(245, 158, 11, 0.75); }
.suc-badge.picked { background: linear-gradient(135deg, #f59e0b, #f97316); color: #1a1208; border: none; box-shadow: 0 3px 10px rgba(245, 158, 11, 0.30); animation: suc-bounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.suc-badge.existing { background: rgba(0, 217, 95, 0.12); color: #00d95f; border: 1px solid rgba(0, 217, 95, 0.30); }
@keyframes suc-bounce { 0% { transform: scale(0.6); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

.share-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 36px 0; color: rgba(255,255,255,0.30); font-size: 12px;
}

.share-error-box {
  display: flex; gap: 10px; padding: 12px 14px; border-radius: 12px;
  background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.24);
  color: #fda4a4; font-size: 12px; line-height: 1.45;
}
.share-error-box svg { color: #ef4444; }

/* FOOTER */
.share-footer {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 10px;
  padding: 16px 24px 22px; border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.20);
}
.share-selection-summary {
  display: inline-flex; align-items: center; gap: 6px; margin-right: auto;
  font-size: 12px; color: rgba(255,255,255,0.85);
  padding: 6px 12px; border-radius: 999px;
  background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.20);
}
.share-sel-dot { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 8px rgba(245, 158, 11, 0.8); animation: share-pulse 1.4s ease-in-out infinite; }
@keyframes share-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.7); } }
.share-selection-summary strong { color: #fbbf24; font-weight: 700; }

.share-btn-ghost {
  padding: 10px 18px; border-radius: 12px; font-size: 13px; font-weight: 600;
  background: transparent; border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.65);
  cursor: pointer; transition: all 0.2s ease;
}
.share-btn-ghost:hover { background: rgba(255,255,255,0.04); color: #fff; border-color: rgba(255,255,255,0.18); }
.share-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 700;
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  color: #1a1208; border: none; cursor: pointer;
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.30), 0 0 0 1px rgba(255,255,255,0.10) inset;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.share-btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 28px rgba(245, 158, 11, 0.42), 0 0 0 1px rgba(255,255,255,0.18) inset;
}
.share-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }

/* ============================================================
   DRAWER REFINEMENTS — transparency, icons, shared-with stack
   ============================================================ */
.transparent-drawer {
  /* Truly transparent glass — backdrop-filter does the heavy lifting */
  background: linear-gradient(180deg, rgba(14, 14, 16, 0.45) 0%, rgba(8, 8, 10, 0.55) 100%) !important;
  border-left: 1px solid rgba(255, 255, 255, 0.06) !important;
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  box-shadow: -24px 0 60px rgba(0,0,0,0.6), inset 1px 0 0 rgba(255,255,255,0.04) !important;
}
.drawer-header {
  background: rgba(10, 10, 10, 0.30) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(20px);
}
.drawer-footer {
  background: rgba(10, 10, 10, 0.30) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(20px);
}

/* Inline icon next to info-block headings */
.info-block h4 { display: flex; align-items: center; gap: 8px; color: #fbbf24; }
.info-block-icon { color: #f59e0b; flex-shrink: 0; }

/* Real spacing between sibling info-blocks (Tailwind .mt-8 was a no-op — no Tailwind in this project) */
.info-block + .info-block { margin-top: 28px; }

/* ib-label gets a subtle icon prefix */
.ib-label { display: inline-flex; align-items: center; gap: 6px; }
.ib-label svg { color: rgba(245, 158, 11, 0.55); flex-shrink: 0; }

/* Empty-state row (used by Tags & Shared With when no items) */
.empty-row {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.08);
  font-size: 12px; color: rgba(255, 255, 255, 0.40);
  margin-top: 12px;
}
.empty-row .empty-row-icon { color: rgba(245, 158, 11, 0.40); flex-shrink: 0; }

/* Shared-with stack inside drawer */
.shared-with-stack { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.shared-user-pill {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 12px;
  background: rgba(245, 158, 11, 0.05);
  border: 1px solid rgba(245, 158, 11, 0.15);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.shared-user-pill:hover {
  background: rgba(245, 158, 11, 0.10);
  border-color: rgba(245, 158, 11, 0.32);
  transform: translateX(3px);
}
.shared-pill-avatar {
  flex-shrink: 0;
  width: 34px; height: 34px; border-radius: 10px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: #1a1208;
  border: 1px solid rgba(245, 158, 11, 0.40);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
}
.shared-pill-info {
  display: flex; flex-direction: column;
  min-width: 0; flex: 1;
  gap: 1px;
}
.shared-pill-name {
  font-size: 13px; font-weight: 600; color: #fff;
  line-height: 1.2;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.shared-pill-email {
  font-size: 11px; color: rgba(255, 255, 255, 0.40);
  line-height: 1.2;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* Ownership block — premium, real CSS (replaces broken Tailwind classes) */
.ownership-card {
  position: relative; overflow: hidden;
  display: flex; align-items: center; gap: 14px;
  margin-top: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(245, 158, 11, 0.16);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.ownership-card:hover {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.10), rgba(255, 255, 255, 0.04));
  border-color: rgba(245, 158, 11, 0.30);
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(0,0,0,0.30);
}
.ownership-avatar {
  flex-shrink: 0; position: relative; z-index: 2;
  width: 44px; height: 44px; border-radius: 12px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: #1a1208;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700;
  box-shadow: 0 6px 18px rgba(245, 158, 11, 0.25);
}
.ownership-info {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; gap: 4px;
  min-width: 0; flex: 1;
}
.ownership-name {
  font-size: 14px; font-weight: 600; color: #fff;
  line-height: 1.2;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ownership-role {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600; color: #fbbf24;
  letter-spacing: 0.02em;
}
.ownership-role svg { color: #f59e0b; }
</style>
