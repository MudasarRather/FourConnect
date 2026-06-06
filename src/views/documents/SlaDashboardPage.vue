<template>
  <div class="nano-page">
    <!-- HEADER (Integrated with the Nano background) -->
    <header class="nano-header">
      <div class="nav-left">
        <div class="nano-tabs-dock">
          <button class="n-tab" :class="{ active: activeTab === 'dashboard' }" @click="setTab('dashboard')">
            <LayoutGrid :size="14" class="tab-icon"/> Dashboard
          </button>
          <div class="tab-separator"></div>
          <button class="n-tab" :class="{ active: activeTab === 'draft' }" @click="setTab('draft')">
            <FileText :size="14" class="tab-icon"/> Draft Documents
          </button>
          <button v-if="isAdmin" class="n-tab" :class="{ active: activeTab === 'pending' }" @click="setTab('pending')">
            <Clock :size="14" class="tab-icon"/> Pending Approvals
          </button>
          <button class="n-tab" :class="{ active: activeTab === 'rejected' }" @click="setTab('rejected')">
            <XCircle :size="14" class="tab-icon"/> Rejected
          </button>
          <button class="n-tab" :class="{ active: activeTab === 'approved' }" @click="setTab('approved')">
            <CheckCircle :size="14" class="tab-icon"/> Approved Documents
          </button>
        </div>
      </div>
      
      <div class="nav-right">
        <!-- New SLA Button -->
        <router-link :to="isAdmin ? '/admin/documents/sla/new' : '/user/documents/sla/new'" class="n-btn n-btn-primary new-sla-btn">
          <span>New SLA</span>
          <Plus :size="16" />
        </router-link>
      </div>
    </header>

    <!-- DASHBOARD TAB (NANO BANANA EXACT LAYOUT) -->
    <main class="nano-dashboard slide-up-fade" v-if="activeTab === 'dashboard'">
      
      <!-- Top Welcome Row -->
      <div class="dash-welcome">
        <div class="dash-welcome-titles">
          <h1>SLA Command Center</h1>
          <p class="welcome-subtext">Managed by <span class="highlight-text">{{ userProfile?.full_name || 'Admin' }}</span></p>
        </div>
        
        <div class="dash-top-stats">
          <div class="dts-item">
            <div class="dts-val"><AnimatedNumber :value="stats.drafts" /></div>
            <div class="dts-label"><FileText :size="14" /> Drafts</div>
          </div>
          <div class="dts-item">
            <div class="dts-val"><AnimatedNumber :value="stats.approved" /></div>
            <div class="dts-label"><CheckCircle :size="14" /> Approved</div>
          </div>
          <div class="dts-item">
            <div class="dts-val highlight"><AnimatedNumber :value="stats.active" /></div>
            <div class="dts-label"><Activity :size="14" /> Active SLAs</div>
          </div>
        </div>
      </div>

      <!-- ROW 1 WIDGETS (Crextio Inspired Layout) -->
      <div class="dash-widgets-grid">
        
        <!-- Left Hero Profile Card -->
        <div class="n-card hero-profile-card">
          <div class="hpc-image-wrapper">
            <!-- Simulated user image or sleek abstract background -->
            <div class="hpc-bg-image"></div>
            <div class="hpc-overlay-gradient"></div>
            
            <div class="hpc-bottom-info">
              <h2>{{ userProfile?.full_name || 'Admin Coordinator' }}</h2>
              <p>SLA Administrator</p>
            </div>
          </div>
          
          <div class="hpc-action-area">
            <p>Generate a new highly customized Service Level Agreement from scratch.</p>
            <router-link :to="isAdmin ? '/admin/documents/sla/new' : '/user/documents/sla/new'" class="n-btn n-btn-outline glow-hover">
              Start Wizard <ArrowRight :size="14" />
            </router-link>
          </div>
        </div>

        <!-- Center 1: Progress/Activity Bar Chart -->
        <div class="n-card chart-card delay-1">
          <div class="card-header-flex">
            <div>
              <h3>Generation Activity</h3>
              <p class="sub-text">Number of SLAs created</p>
            </div>
            <button class="icon-btn-sm"><TrendingUp :size="14"/></button>
          </div>
          
          <div class="v-bar-chart">
            <div class="vbc-bar-group" v-for="(day, i) in weeklyActivity" :key="i">
              <div class="vbc-bar-bg">
                <div class="vbc-fill" :style="{ height: `${day.val}%`, background: day.highlight ? '#fde047' : '#f59e0b' }"></div>
              </div>
              <span class="vbc-label" :class="{ 'highlight-label': day.highlight }">{{ day.label }}</span>
            </div>
          </div>
        </div>

        <!-- Center 2: Circular Tracker -->
        <div class="n-card radial-card delay-2">
           <div class="card-header-flex">
            <div>
              <h3>Approval Rate</h3>
            </div>
            <button class="icon-btn-sm"><PieChart :size="14"/></button>
          </div>
          
          <div class="radial-ring-wrapper">
            <svg class="progress-ring" width="140" height="140">
              <circle class="pr-bg" stroke="rgba(255, 255, 255, 0.05)" stroke-width="8" fill="transparent" r="62" cx="70" cy="70" />
              <circle class="pr-fill" stroke="#fb923c" stroke-width="8" fill="transparent" r="62" cx="70" cy="70" stroke-linecap="round" :style="{ strokeDasharray: `${2 * Math.PI * 62}`, strokeDashoffset: `${2 * Math.PI * 62 * (1 - approvalStat.fraction)}` }" style="transition: stroke-dashoffset 1.5s cubic-bezier(0.65, 0, 0.35, 1) 0.5s;" />
            </svg>
            <div class="pr-center-text">
              <span class="pr-val">{{ approvalStat.text }}</span>
              <span class="pr-lbl">Success</span>
            </div>
          </div>
        </div>

        <!-- Right: Recent Tasks / Drafts -->
        <div class="n-card list-card delay-3">
          <div class="card-header-flex">
            <div>
              <h3>Recent Drafts</h3>
              <p class="sub-text">{{ draftSlahs.length }} pending review</p>
            </div>
          </div>

          <div class="recent-list">
            <div class="rl-item" v-for="(draft, i) in recentDrafts" :key="i">
              <div class="rl-icon" :style="{ background: draft.color + '20', color: draft.color }">
                <component :is="draft.icon" :size="16" />
              </div>
              <div class="rl-info">
                <h4>{{ draft.title }}</h4>
                <span>{{ draft.client }} &bull; {{ draft.date }}</span>
              </div>
              <div class="rl-status">
                 <CheckCircle v-if="draft.status === 'Approved'" :size="14" color="#4ade80" />
                 <Clock v-else :size="14" color="#fbbf24" />
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ROW 2: Minimal Calendar / Timeline -->
      <div class="dash-timeline-row delay-4">
        <div class="n-card timeline-card">
          <div class="tl-header">
            <h3>SLA Timeline</h3>
            <div class="tl-months">
              <span class="tl-month">{{ prevMonth }}</span>
              <span class="tl-month active">{{ currentMonthYear }}</span>
              <span class="tl-month">{{ nextMonth }}</span>
            </div>
          </div>

          <div class="tl-grid">
            <!-- Days header -->
            <div class="tlg-days">
               <div class="tlg-day-col" v-for="d in currentWeekDays" :key="d">
                 {{ d }}
               </div>
            </div>
            
            <!-- Timeline Body (Simulated) -->
            <div class="tlg-rows">
              <div class="tlg-time-row" v-for="time in ['8:00 am', '9:00 am', '10:00 am', '11:00 am']" :key="time">
                 <div class="tlg-time-label">{{ time }}</div>
                 <div class="tlg-cells">
                   <div class="tlg-cell" v-for="i in 5" :key="i"></div>
                 </div>
              </div>
              
              <!-- Floating Pills -->
              <div v-for="(ev, i) in timelineEvents" :key="i" class="tl-event-pill" :style="{ left: ev.left, top: ev.top, width: ev.width, background: ev.theme === 'dark' ? 'rgba(30, 30, 32, 0.9)' : 'rgba(255, 255, 255, 0.9)', border: ev.theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,1)', color: ev.theme === 'dark' ? '#fff' : '#000' }">
                <div class="tle-title" :style="{ color: ev.theme === 'dark' ? '#fff' : '#000' }">{{ ev.title }}</div>
                <div class="tle-sub" :style="{ color: ev.theme === 'dark' ? 'rgba(255,255,255,0.6)' : '#666' }">{{ ev.sub }}</div>
                <div class="tle-av-group">
                  <div class="tle-av" :class="{ dark: ev.theme === 'light' }">{{ ev.initials }}</div>
                </div>
              </div>
              <div v-if="timelineEvents.length === 0" style="position: absolute; width: 100%; top: 40px; text-align: center; color: rgba(255,255,255,0.3); font-size: 12px; pointer-events: none;">
                  No recent SLA events to display on timeline.
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- DRAFT TAB -->
    <main class="nano-dashboard slide-up-fade" v-if="activeTab === 'draft'">
      <div class="table-container-modern">
        <div class="header-actions-modern">
          <div class="title-group">
            <h3>Draft SLAs</h3>
            <p>Continue working on your pending agreements</p>
          </div>
          <div class="table-controls" style="display: flex; gap: 12px; align-items: center;">
            <div class="search-box">
              <FileText :size="14" />
              <input v-model="draftSearchText" placeholder="Search drafts..." />
            </div>
          </div>
        </div>

        <div class="pm-table-modern glass-card" style="padding:0; overflow:hidden;">
            <div class="pm-row-modern header" style="grid-template-columns: 50px 1.9fr 1.4fr 110px 110px 1fr 130px;">
                <div class="col sn">S.N</div>
                <div class="col title">Agreement Title</div>
                <div class="col client">Client / Target</div>
                <div class="col value-col">Value</div>
                <div class="col validity-col">Validity</div>
                <div class="col date">Last Saved</div>
                <div class="col status">Status</div>
            </div>

            <div v-if="filteredDrafts.length === 0" class="empty-state" style="padding:60px 0; text-align:center;">
                <FileText :size="48" style="color: rgba(255,255,255,0.1); margin: 0 auto;" />
                <h4 style="margin-top:16px;">No Drafts Found</h4>
                <p>You don't have any pending SLA drafts.</p>
            </div>

            <div
                v-for="(draft, i) in filteredDrafts"
                :key="draft.id"
                class="pm-row-modern item"
                :style="{ animationDelay: i * 40 + 'ms', gridTemplateColumns: '50px 1.9fr 1.4fr 110px 110px 1fr 130px' }"
                @click="selectedDraftId = draft.id"
            >
                <div class="col sn">{{ i + 1 }}.</div>
                <div class="col category">
                    <span class="v-name" style="max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">{{ draft.title || 'Untitled Agreement' }}</span>
                    <div style="display:flex; gap:6px; margin-top:4px; align-items:center;">
                        <span class="v-ref" style="text-transform: capitalize; color:rgba(255,255,255,0.4); font-size:11px;">{{ draft.contract_reference || 'No Ref' }}</span>
                        <span class="pill" v-if="draft.agreement_type" :style="{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', padding:'2px 6px', fontSize:'9px', borderRadius:'4px', letterSpacing:'0.02em', textTransform:'uppercase' }">{{ draft.agreement_type }}</span>
                    </div>
                </div>
                <div class="col client">
                    <span class="v-name" style="color:rgba(255,255,255,0.85); font-weight:500;">{{ draft.client_organization_name || '—' }}</span>
                    <span class="v-ref">{{ draft.client_contact_person || draft.client_email || '—' }}</span>
                </div>
                <div class="col value">
                    <span class="currency-tag">{{ draft.currency || 'INR' }}</span>
                    <span>{{ formatValue(draft.agreement_value) }}</span>
                </div>
                <div class="col meta">
                    <span class="meta-primary">{{ draft.end_date ? formatDate(draft.end_date) : '—' }}</span>
                    <span class="meta-secondary">{{ draft.billing_frequency || 'Monthly' }}</span>
                </div>
                <div class="col date" style="font-size:12px;">
                    <span class="meta-primary" style="display:block;">{{ formatDate(draft.updated_at || draft.created_at) }}</span>
                    <span class="meta-secondary">{{ formatRelative(draft.updated_at || draft.created_at) }}</span>
                </div>
                <div class="col status">
                     <div class="status-badge compact draft">
                        <Clock :size="10" />
                        <span>Draft</span>
                     </div>
                </div>
            </div>
        </div>
      </div>
    </main>

    <!-- PENDING TAB (ADMIN ONLY) -->
    <main class="nano-dashboard slide-up-fade" v-if="activeTab === 'pending' && isAdmin">
      <div class="table-container-modern">
        <div class="header-actions-modern">
          <div class="title-group">
            <h3>Pending Approvals</h3>
            <p>Review and approve submitted SLAs</p>
          </div>
          <div class="table-controls" style="display: flex; gap: 12px; align-items: center;">
            <div class="search-box">
              <FileText :size="14" />
              <input v-model="pendingSearchText" placeholder="Search pending SLAs..." />
            </div>
          </div>
        </div>

        <div class="pm-table-modern glass-card" style="padding:0; overflow:hidden;">
            <div class="pm-row-modern header" style="grid-template-columns: 50px 2fr 1.5fr 1fr 120px;">
                <div class="col sn">S.N</div>
                <div class="col title">Agreement Title</div>
                <div class="col client">Client / Target</div>
                <div class="col date">Submission Date</div>
                <div class="col status">Status</div>
            </div>

            <div v-if="filteredPending.length === 0" class="empty-state" style="padding:60px 0; text-align:center;">
                <CheckCircle :size="48" style="color: rgba(255,255,255,0.1); margin: 0 auto;" />
                <h4 style="margin-top:16px;">All Caught Up</h4>
                <p>There are no SLA agreements pending your approval.</p>
            </div>

            <div 
                v-for="(pendingSla, i) in filteredPending" 
                :key="pendingSla.id" 
                class="pm-row-modern item"
                :style="{ animationDelay: i * 40 + 'ms', gridTemplateColumns: '50px 2fr 1.5fr 1fr 120px' }"
                @click="selectedPendingId = pendingSla.id"
            >
                <div class="col sn">{{ i + 1 }}.</div>
                <div class="col category">
                    <span class="v-name" style="max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">{{ pendingSla.title || 'Untitled Agreement' }}</span>
                    <div style="display:flex; gap:6px; margin-top:4px; align-items:center;">
                        <span class="v-ref" style="text-transform: capitalize; color:rgba(255,255,255,0.4); font-size:11px;">{{ pendingSla.contract_reference || 'No Ref' }}</span>
                        <span class="pill" v-if="pendingSla.agreement_type" :style="{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', padding:'2px 6px', fontSize:'9px', borderRadius:'4px', letterSpacing:'0.02em', textTransform:'uppercase' }">{{ pendingSla.agreement_type }}</span>
                    </div>
                </div>
                <div class="col client">
                    <span class="v-name" style="color:rgba(255,255,255,0.85); font-weight:500;">{{ pendingSla.client_organization_name || '—' }}</span>
                </div>
                <div class="col date" style="color:rgba(255,255,255,0.5); font-size:12px;">
                    {{ formatDate(pendingSla.updated_at || pendingSla.created_at) }}
                </div>
                <div class="col status">
                     <div class="status-badge compact pending" style="background: rgba(249, 115, 22, 0.15); color: #f97316; border-color: rgba(249, 115, 22, 0.3);">
                        <Clock :size="10" />
                        <span>Pending</span>
                     </div>
                </div>
            </div>
        </div>
      </div>
    </main>
    
    <!-- APPROVED TAB -->
    <main class="nano-dashboard slide-up-fade" v-if="activeTab === 'approved'">
      <div class="table-container-modern">
        <div class="header-actions-modern">
          <div class="title-group">
            <h3>Approved SLAs</h3>
            <p>Your finalized and executable SLA agreements</p>
          </div>
          <div class="table-controls" style="display: flex; gap: 12px; align-items: center;">
            <div class="search-box">
              <FileText :size="14" />
              <input v-model="approvedSearchText" placeholder="Search approved SLAs..." />
            </div>
          </div>
        </div>

        <div class="pm-table-modern glass-card" style="padding:0; overflow:hidden;">
            <div class="pm-row-modern header" style="grid-template-columns: 50px 1.9fr 1.4fr 110px 110px 1fr 130px;">
                <div class="col sn">S.N</div>
                <div class="col title">Agreement Title</div>
                <div class="col client">Client / Target</div>
                <div class="col value-col">Value</div>
                <div class="col validity-col">Validity</div>
                <div class="col date">Approval Date</div>
                <div class="col status">Status</div>
            </div>

            <div v-if="filteredApproved.length === 0" class="empty-state" style="padding:60px 0; text-align:center;">
                <CheckCircle :size="48" style="color: rgba(74, 222, 128, 0.2); margin: 0 auto;" />
                <h4 style="margin-top:16px;">No Approved SLAs</h4>
                <p>Your finalized and executable SLA agreements will appear here.</p>
            </div>

            <div
                v-for="(approvedSla, i) in filteredApproved"
                :key="approvedSla.id"
                class="pm-row-modern item"
                :style="{ animationDelay: i * 40 + 'ms', gridTemplateColumns: '50px 1.9fr 1.4fr 110px 110px 1fr 130px' }"
                @click="selectedApprovedId = approvedSla.id"
            >
                <div class="col sn">{{ i + 1 }}.</div>
                <div class="col category">
                    <span class="v-name" style="max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">{{ approvedSla.title || 'Untitled Agreement' }}</span>
                    <div style="display:flex; gap:6px; margin-top:4px; align-items:center;">
                        <span class="v-ref" style="text-transform: capitalize; color:rgba(255,255,255,0.4); font-size:11px;">{{ approvedSla.contract_reference || 'No Ref' }}</span>
                        <span class="pill" v-if="approvedSla.agreement_type" :style="{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', padding:'2px 6px', fontSize:'9px', borderRadius:'4px', letterSpacing:'0.02em', textTransform:'uppercase' }">{{ approvedSla.agreement_type }}</span>
                    </div>
                </div>
                <div class="col client">
                    <span class="v-name" style="color:rgba(255,255,255,0.85); font-weight:500;">{{ approvedSla.client_organization_name || '—' }}</span>
                    <span class="v-ref">{{ approvedSla.client_contact_person || approvedSla.client_email || '—' }}</span>
                </div>
                <div class="col value">
                    <span class="currency-tag">{{ approvedSla.currency || 'INR' }}</span>
                    <span>{{ formatValue(approvedSla.agreement_value) }}</span>
                </div>
                <div class="col meta">
                    <span class="meta-primary">{{ approvedSla.end_date ? formatDate(approvedSla.end_date) : '—' }}</span>
                    <span class="meta-secondary"
                        :style="validityDays(approvedSla) !== null && validityDays(approvedSla) < 30
                          ? { color: '#f87171' }
                          : {}">
                      {{ validityDays(approvedSla) !== null ? (validityDays(approvedSla) > 0 ? validityDays(approvedSla) + 'd left' : 'expired') : (approvedSla.billing_frequency || 'Monthly') }}
                    </span>
                </div>
                <div class="col date" style="font-size:12px;">
                    <span class="meta-primary" style="display:block;">{{ formatDate(approvedSla.updated_at || approvedSla.created_at) }}</span>
                    <span class="meta-secondary">{{ formatRelative(approvedSla.updated_at || approvedSla.created_at) }}</span>
                </div>
                <div class="col status">
                     <div class="status-badge compact approved" style="background: rgba(74, 222, 128, 0.15); color: #4ade80; border-color: rgba(74, 222, 128, 0.3);">
                        <CheckCircle :size="10" />
                        <span>Approved</span>
                     </div>
                </div>
            </div>
        </div>
      </div>
    </main>

    <!-- REJECTED TAB -->
    <main class="nano-dashboard slide-up-fade" v-if="activeTab === 'rejected'">
      <div class="table-container-modern">
        <div class="header-actions-modern">
          <div class="title-group">
            <h3>Rejected SLAs</h3>
            <p>Documents requiring revision based on admin feedback</p>
          </div>
          <div class="table-controls" style="display: flex; gap: 12px; align-items: center;">
            <div class="search-box">
              <FileText :size="14" />
              <input v-model="rejectedSearchText" placeholder="Search rejected SLAs..." />
            </div>
          </div>
        </div>

        <div class="pm-table-modern glass-card" style="padding:0; overflow:hidden;">
            <div class="pm-row-modern header" style="grid-template-columns: 50px 1.9fr 1.4fr 110px 1.6fr 1fr 130px;">
                <div class="col sn">S.N</div>
                <div class="col title">Agreement Title</div>
                <div class="col client">Client / Target</div>
                <div class="col value-col">Value</div>
                <div class="col reason-col">Admin Feedback</div>
                <div class="col date">Rejection Date</div>
                <div class="col status">Status</div>
            </div>

            <div v-if="filteredRejected.length === 0" class="empty-state" style="padding:60px 0; text-align:center;">
                <XCircle :size="48" style="color: rgba(239, 68, 68, 0.15); margin: 0 auto;" />
                <h4 style="margin-top:16px;">No Rejected SLAs</h4>
                <p>Documents rejected by admins will appear here.</p>
            </div>

            <div
                v-for="(rejSla, i) in filteredRejected"
                :key="rejSla.id"
                class="pm-row-modern item"
                :style="{ animationDelay: i * 40 + 'ms', gridTemplateColumns: '50px 1.9fr 1.4fr 110px 1.6fr 1fr 130px' }"
                @click="selectedRejectedId = rejSla.id"
            >
                <div class="col sn">{{ i + 1 }}.</div>
                <div class="col category">
                    <span class="v-name" style="max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">{{ rejSla.title || 'Untitled Agreement' }}</span>
                    <div style="display:flex; gap:6px; margin-top:4px; align-items:center;">
                        <span class="v-ref" style="text-transform: capitalize; color:rgba(255,255,255,0.4); font-size:11px;">{{ rejSla.contract_reference || 'No Ref' }}</span>
                        <span class="pill" v-if="rejSla.agreement_type" :style="{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', padding:'2px 6px', fontSize:'9px', borderRadius:'4px', letterSpacing:'0.02em', textTransform:'uppercase' }">{{ rejSla.agreement_type }}</span>
                    </div>
                </div>
                <div class="col client">
                    <span class="v-name" style="color:rgba(255,255,255,0.85); font-weight:500;">{{ rejSla.client_organization_name || '—' }}</span>
                    <span class="v-ref">{{ rejSla.client_contact_person || rejSla.client_email || '—' }}</span>
                </div>
                <div class="col value">
                    <span class="currency-tag">{{ rejSla.currency || 'INR' }}</span>
                    <span>{{ formatValue(rejSla.agreement_value) }}</span>
                </div>
                <div class="col reason-cell">
                    <div class="reason-pill" :title="rejSla.rejection_reason || 'No feedback provided'">
                        <AlertCircle :size="11" />
                        <span>{{ rejSla.rejection_reason || 'No feedback provided' }}</span>
                    </div>
                </div>
                <div class="col date" style="font-size:12px;">
                    <span class="meta-primary" style="display:block;">{{ formatDate(rejSla.updated_at || rejSla.created_at) }}</span>
                    <span class="meta-secondary">{{ formatRelative(rejSla.updated_at || rejSla.created_at) }}</span>
                </div>
                <div class="col status">
                     <div class="status-badge compact rejected" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
                        <XCircle :size="10" />
                        <span>Rejected</span>
                     </div>
                </div>
            </div>
        </div>
      </div>
    </main>

    <!-- Drawer for Drafts -->
    <SlaDetailsDrawer 
      :is-open="!!selectedDraftId"
      :sla="draftSlahs.find(d => d.id === selectedDraftId)"
      :is-admin-mode="isAdmin"
      @close="selectedDraftId = null"
      @edit="openEditModal"
      @generate="generatePdf"
      @deleted="() => { selectedDraftId = null; fetchData(); }"
    />

    <!-- Drawer for Pending (Admins) -->
    <SlaDetailsDrawer 
      :is-open="!!selectedPendingId"
      :sla="pendingSlahs.find(d => d.id === selectedPendingId)"
      :is-admin-mode="true"
      @close="selectedPendingId = null"
      @approve="approveSla"
      @reject="rejectSla"
      @generate="generatePdf"
      @edit="openEditModal"
    />

    <!-- Drawer for Approved -->
    <SlaDetailsDrawer 
      :is-open="!!selectedApprovedId"
      :sla="approvedSlahs.find(d => d.id === selectedApprovedId)"
      :is-admin-mode="isAdmin"
      @close="selectedApprovedId = null"
      @edit="openEditModal"
      @generate="generatePdf"
      @deleted="() => { selectedApprovedId = null; fetchData(); }"
    />

    <!-- Drawer for Rejected -->
    <SlaDetailsDrawer 
      :is-open="!!selectedRejectedId"
      :sla="rejectedSlahs.find(d => d.id === selectedRejectedId)"
      :is-admin-mode="isAdmin"
      @close="selectedRejectedId = null"
      @edit="openEditModal"
      @generate="generatePdf"
      @deleted="() => { selectedRejectedId = null; fetchData(); }"
    />

    <!-- Rejection Modal -->
    <RejectionModal 
      :is-open="isRejectionModalOpen" 
      :is-submitting="isRejecting"
      @close="isRejectionModalOpen = false"
      @confirm="handleRejectionConfirm"
    />

    <!-- Edit Modal -->
    <EditSlaModal 
      v-model="showEditModal"
      :sla="editingSla"
      :is-admin="isAdmin"
      @submitted="fetchData"
    />

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LayoutGrid, FileText, CheckCircle, Plus, ArrowRight, TrendingUp, PieChart, Clock, Star, Activity, XCircle, AlertCircle } from 'lucide-vue-next'
import AnimatedNumber from '../../components/ui/AnimatedNumber.vue'
import SlaDetailsDrawer from '../../components/documents/SlaDetailsDrawer.vue'
import EditSlaModal from '../../components/documents/EditSlaModal.vue'
import RejectionModal from '../../components/documents/RejectionModal.vue'
import axios from 'axios'
import { API } from '@/utils/api'
const route = useRoute()
const router = useRouter()
const isAdmin = computed(() => route.path.startsWith('/admin'))

const activeTab = ref(route.query.tab || (isAdmin.value ? 'pending' : 'dashboard')) // default from query or role

// Tab → URL sync. setTab() updates local state AND pushes ?tab=name into the URL
// so tabs are linkable / shareable. The watcher reacts to EXTERNAL URL changes
// (notification bell pushing /user/documents/sla?tab=rejected) — without it, the
// notification redirect only changes the URL and leaves activeTab on its previous
// value.
const setTab = (name) => {
  activeTab.value = name
  router.replace({ query: { ...route.query, tab: name } }).catch(() => {})
}
watch(() => route.query.tab, (newTab) => {
  const resolved = newTab || (isAdmin.value ? 'pending' : 'dashboard')
  if (resolved !== activeTab.value) activeTab.value = resolved
})
const userProfile = ref({})

const draftSlahs = ref([])
const draftSearchText = ref('')
const selectedDraftId = ref(null)

const filteredDrafts = computed(() => {
  let list = draftSlahs.value
  if (draftSearchText.value) {
    const q = draftSearchText.value.toLowerCase()
    list = list.filter(d => (d.title || '').toLowerCase().includes(q) || (d.client_organization_name || '').toLowerCase().includes(q) || (d.contract_reference || '').toLowerCase().includes(q))
  }
  return list
})

const pendingSlahs = ref([])
const pendingSearchText = ref('')
const selectedPendingId = ref(null)

const filteredPending = computed(() => {
  let list = pendingSlahs.value
  if (pendingSearchText.value) {
    const q = pendingSearchText.value.toLowerCase()
    list = list.filter(d => (d.title || '').toLowerCase().includes(q) || (d.client_organization_name || '').toLowerCase().includes(q) || (d.contract_reference || '').toLowerCase().includes(q))
  }
  return list
})

const approvedSlahs = ref([])
const approvedSearchText = ref('')
const selectedApprovedId = ref(null)

const filteredApproved = computed(() => {
  let list = approvedSlahs.value
  if (approvedSearchText.value) {
    const q = approvedSearchText.value.toLowerCase()
    list = list.filter(d => (d.title || '').toLowerCase().includes(q) || (d.client_organization_name || '').toLowerCase().includes(q) || (d.contract_reference || '').toLowerCase().includes(q))
  }
  return list
})

const rejectedSlahs = ref([])
const rejectedSearchText = ref('')
const selectedRejectedId = ref(null)

const filteredRejected = computed(() => {
  let list = rejectedSlahs.value
  if (rejectedSearchText.value) {
    const q = rejectedSearchText.value.toLowerCase()
    list = list.filter(d => (d.title || '').toLowerCase().includes(q) || (d.client_organization_name || '').toLowerCase().includes(q) || (d.contract_reference || '').toLowerCase().includes(q))
  }
  return list
})

const formatDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatRelative = (d) => {
  if (!d) return '—'
  const ms = Date.now() - new Date(d).getTime()
  const mins = Math.round(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.round(months / 12)}y ago`
}

const formatValue = (v) => {
  const n = Number(v || 0)
  if (n === 0) return '—'
  if (n >= 10000000) return (n / 10000000).toFixed(2).replace(/\.00$/, '') + ' Cr'
  if (n >= 100000) return (n / 100000).toFixed(2).replace(/\.00$/, '') + ' L'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  return n.toLocaleString('en-IN')
}

const validityDays = (sla) => {
  if (!sla.end_date) return null
  const ms = new Date(sla.end_date).getTime() - Date.now()
  return Math.round(ms / 86400000)
}

// Real Stats computed from fetched data
const stats = computed(() => {
  return {
    drafts: draftSlahs.value.length,
    approved: approvedSlahs.value.length,
    active: approvedSlahs.value.length // for now use approved as active
  }
})

// Function to calculate all SLAs across tabs
const allSlahs = computed(() => {
  return [...draftSlahs.value, ...pendingSlahs.value, ...approvedSlahs.value, ...rejectedSlahs.value]
})

// Real Weekly Activity Chart Data
const weeklyActivity = computed(() => {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const today = new Date()
  
  // Initialize last 7 days array
  let last7Days = []
  for (let i = 6; i >= 0; i--) {
    let d = new Date(today)
    d.setDate(d.getDate() - i)
    last7Days.push({
      dateStr: d.toISOString().split('T')[0],
      label: days[d.getDay()],
      count: 0
    })
  }
  
  // Count SLAs per day
  allSlahs.value.forEach(sla => {
    if (!sla.created_at) return
    const slaDate = sla.created_at.split('T')[0]
    const dayObj = last7Days.find(d => d.dateStr === slaDate)
    if (dayObj) dayObj.count++
  })
  
  // Calculate relative max for bar height scaling
  const maxCount = Math.max(...last7Days.map(d => d.count), 1) // default 1 to avoid /0
  
  return last7Days.map((d, index) => ({
    label: d.label,
    val: Math.round((d.count / maxCount) * 100), // Height %
    realVal: d.count,
    highlight: index === 6 // highlight today
  }))
})

// Real Approval Rate Data
const approvalStat = computed(() => {
  const total = allSlahs.value.length
  if (total === 0) return { rate: 100, fraction: 1.0, text: '100%' }
  
  const approved = approvedSlahs.value.length
  const fraction = approved / total
  const rate = Math.round(fraction * 100)
  return { rate, fraction, text: `${rate}%` }
})

// Real Timeline Events Data (Latest 2 SLAs)
const timelineEvents = computed(() => {
  // Sort by newest first
  const sorted = [...allSlahs.value].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  return sorted.slice(0, 2).map((sla, i) => {
    return {
      title: sla.title || 'Untitled SLA',
      sub: sla.client_organization_name || 'No Client',
      // Provide dynamic visual positioning
      top: i === 0 ? '10px' : '90px',
      left: i === 0 ? 'calc(20% + 70px)' : 'calc(60% + 70px)',
      width: i === 0 ? '35%' : '25%',
      theme: i === 0 ? 'dark' : 'light',
      initials: sla.created_by?.full_name ? sla.created_by.full_name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : 'AD'
    }
  })
})

// Current display month
const currentMonthYear = computed(() => {
   const d = new Date()
   return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})
const nextMonth = computed(() => {
   const d = new Date(); d.setMonth(d.getMonth()+1); return d.toLocaleDateString('en-US', { month: 'long' })
})
const prevMonth = computed(() => {
   const d = new Date(); d.setMonth(d.getMonth()-1); return d.toLocaleDateString('en-US', { month: 'long' })
})

// Current week 5 days
const currentWeekDays = computed(() => {
  const days = []
  const today = new Date()
  // Generate 5 days starting from yesterday to make it look active
  for(let i=-2; i<=2; i++){
     let d = new Date(today)
     d.setDate(d.getDate() + i)
     days.push(d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }))
  }
  return days
})


// Real Recent Drafts computed from draftSlahs
const recentDrafts = computed(() => {
  return draftSlahs.value.slice(0, 4).map(d => ({
    title: d.title || 'Untitled Agreement',
    client: d.client_organization_name || 'No Client',
    date: formatDate(d.created_at),
    status: d.status,
    icon: 'FileText',
    color: d.status === 'Approved' ? '#fde047' : '#fb923c'
  }))
})

const showEditModal = ref(false)
const editingSla = ref(null)

const openEditModal = (sla) => {
  editingSla.value = sla
  selectedDraftId.value = null // Close drawer
  showEditModal.value = true
}

// Download the server-rendered (WeasyPrint) SLA PDF. The backend owns the design
// now — the client just streams the blob and triggers a save.
const generatingId = ref(null)
const generatePdf = async (sla) => {
  if (!sla?.id || generatingId.value) return
  generatingId.value = sla.id
  const token = isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
  try {
    const res = await axios.get(`${API}/sla/${sla.id}/export`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    })

    // Prefer the filename the backend sets in Content-Disposition.
    let filename = `SLA_${(sla.client_organization_name || 'Agreement').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    const cd = res.headers['content-disposition']
    const match = cd && /filename="?([^"]+)"?/.exec(cd)
    if (match) filename = match[1]

    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Failed to generate SLA PDF', e)
  } finally {
    generatingId.value = null
  }
}

const fetchData = async () => {
  const token = isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
  if (token) {
    await Promise.allSettled([
      fetchDrafts(token),
      fetchApproved(token),
      fetchRejected(token),
      isAdmin.value ? fetchPending(token) : Promise.resolve()
    ])
  }
}

const fetchPending = async (token) => {
  try {
    const res = await axios.get(`${API}/sla/?status=Pending`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    pendingSlahs.value = res.data
  } catch(e) {
    console.error("Failed to fetch pending SLAs", e)
  }
}

const isRejectionModalOpen = ref(false)
const isRejecting = ref(false)
const slaToReject = ref(null)

const rejectSla = (sla) => {
  slaToReject.value = sla
  isRejectionModalOpen.value = true
}

const handleRejectionConfirm = async (reason) => {
  if (!slaToReject.value) return
  isRejecting.value = true
  try {
    await updateSlaStatus(slaToReject.value.id, 'Rejected', reason)
    isRejectionModalOpen.value = false
    selectedPendingId.value = null
  } finally {
    isRejecting.value = false
    slaToReject.value = null
  }
}

// Approve a pending SLA. The drawer's Approve button emits `approve` with the SLA;
// this was previously bound to an UNDEFINED handler, so the click did nothing.
// Mirrors the reject flow: flip status → Approved, refresh lists, close the drawer
// (the item then appears under the Approved tab).
const approveSla = async (sla) => {
  const target = sla || pendingSlahs.value.find(d => d.id === selectedPendingId.value)
  if (!target) return
  await updateSlaStatus(target.id, 'Approved')
  selectedPendingId.value = null
}

const updateSlaStatus = async (id, status, reason = null) => {
  const token = localStorage.getItem('admin_token')
  try {
    const payload = { status }
    if (reason) payload.rejection_reason = reason
    await axios.put(`${API}/sla/${id}`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    })
    await fetchData()
  } catch (e) {
    console.error("Failed to update status", e)
  }
}

const fetchDrafts = async (token) => {
  try {
    const res = await axios.get(`${API}/sla/?status=Draft`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    draftSlahs.value = res.data
  } catch(e) {
    console.error("Failed to fetch drafts", e)
  }
}

const fetchApproved = async (token) => {
  try {
    const res = await axios.get(`${API}/sla/?status=Approved`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    approvedSlahs.value = res.data
  } catch(e) {
    console.error("Failed to fetch approved SLAs", e)
  }
}

const fetchRejected = async (token) => {
  try {
    const res = await axios.get(`${API}/sla/?status=Rejected`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    rejectedSlahs.value = res.data
  } catch(e) {
    console.error("Failed to fetch rejected SLAs", e)
  }
}

let pollInterval = null

onMounted(async () => {
  // Fetch real user profile (independent — won't block drafts)
  const token = isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
  if (token) {
    try {
      const res = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      userProfile.value = res.data
    } catch (err) {
      console.error('Profile fetch failed (non-blocking):', err)
    }

    // Always fetch initial data
    await fetchData()
    
    // Setup real-time background polling every 5 seconds
    pollInterval = setInterval(async () => {
      await fetchData()
    }, 5000)
  }
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})

</script>

<style scoped>
/* ==========================================================================
   BASE & NANO DESIGN LANGUAGE (Adopted from TasksPage)
   ========================================================================== */
.nano-page {
  padding: 32px 40px;
  min-height: 100%;
  color: #fff;
  font-family: 'Inter', -apple-system, sans-serif;
  overflow-y: auto;
  overflow-x: hidden;
  max-width: 100%;
  box-sizing: border-box;
}

/* Contain all top-level sections so wide tables can't push the page wider */
.nano-dashboard,
.table-container-modern,
.pm-table-modern {
  max-width: 100%;
  min-width: 0;
}
.pm-table-modern { overflow: hidden; }
.pm-row-modern .col { min-width: 0; }
.pm-row-modern .col .v-name,
.pm-row-modern .col .v-ref,
.pm-row-modern .col .meta-primary,
.pm-row-modern .col .meta-secondary {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: block;
}

/* Header & Tabs */
.nano-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.nano-tabs-dock {
  display: inline-flex;
  background: rgba(28, 28, 30, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 24px;
  padding: 4px;
  align-items: center;
}

.n-tab {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  font-weight: 500;
  padding: 8px 20px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.n-tab:hover {
  color: #fff;
}

.n-tab.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.tab-icon {
  opacity: 0.7;
}

.n-tab.active .tab-icon {
  opacity: 1;
}

.tab-separator {
  width: 1px;
  height: 16px;
  background: rgba(255,255,255,0.1);
  margin: 0 4px;
}

/* Animations */
.slide-up-fade {
  animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slideUpFade {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Buttons */
.n-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  padding: 10px 24px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  text-decoration: none;
}

.n-btn-primary {
  background: #fde047;
  color: #141416;
  border: none;
}

.n-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(253, 224, 71, 0.25);
}

.n-btn-outline {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.n-btn-outline:hover.glow-hover {
  background: rgba(251, 146, 60, 0.1);
  border-color: #fb923c;
  transform: translateY(-2px);
}

.icon-btn-sm {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn-sm:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* ==========================================================================
   DASHBOARD LAYOUT (CREXTIO INSPIRED)
   ========================================================================== */
.nano-dashboard {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Welcome Row */
.dash-welcome {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.dash-welcome-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dash-welcome h1 {
  font-size: 32px;
  font-weight: 500;
  letter-spacing: -0.02em;
  margin: 0;
  color: #fff;
}

.welcome-subtext {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.dash-welcome .highlight-text {
  font-weight: 600;
  color: #fb923c;
}

.dash-top-stats {
  display: flex;
  gap: 40px;
}

.dts-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dts-val {
  font-size: 42px;
  font-weight: 300;
  line-height: 1;
  color: #fff;
}

.dts-val.highlight {
  color: #fca5a5;
}

.dts-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

/* WIDGETS GRID */
.dash-widgets-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 1.2fr;
  grid-template-rows: 280px;
  gap: 24px;
}

.n-card {
  background: rgba(28, 28, 30, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s;
}

.n-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.delay-1 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards; opacity: 0; }
.delay-2 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; opacity: 0; }
.delay-3 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; opacity: 0; }
.delay-4 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards; opacity: 0; transform: translateY(20px); }

.card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.n-card h3 {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 6px 0;
  color: #fff;
}

.n-card p.sub-text {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  margin: 0;
}

/* 1. Hero Profile Card */
.hero-profile-card {
  padding: 0;
  display: flex;
  flex-direction: column;
}

.hpc-image-wrapper {
  position: relative;
  height: 180px;
  background: #2a2a2c;
  overflow: hidden;
}

/* Simulated Image with gradient */
.hpc-bg-image {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  opacity: 0.3;
}

.hpc-overlay-gradient {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(to bottom, transparent, rgba(20,20,22,0.95));
}

.hpc-floating-pill {
  position: absolute;
  top: 16px; left: 16px;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
  padding: 6px 12px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
}

.yellow-icon {
  color: #fbbf24;
}

.hpc-bottom-info {
  position: absolute;
  bottom: 16px;
  left: 20px;
}

.hpc-bottom-info h2 {
  font-size: 20px;
  margin: 0 0 4px 0;
  color: #fff;
  font-weight: 500;
}

.hpc-bottom-info p {
  font-size: 12px;
  color: rgba(255,255,255,0.6);
  margin: 0;
}

.hpc-action-area {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: rgba(28, 28, 30, 0.8);
  flex: 1;
}

.hpc-action-area p {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  margin: 0;
  line-height: 1.5;
}

/* 2. Chart Card */
.chart-card {
  display: flex;
  flex-direction: column;
}

.v-bar-chart {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  height: 150px;
  flex: 1;
  padding-top: 10px;
}

.vbc-bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  height: 100%;
}

.vbc-bar-bg {
  width: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  flex: 1;
  position: relative;
  overflow: hidden;
}

.vbc-fill {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  border-radius: 4px;
  transition: height 1s cubic-bezier(0.16, 1, 0.3, 1) 0.5s;
}

.vbc-label {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  font-weight: 500;
}

.highlight-label {
  color: #fde047;
}

/* 3. Radial Card */
.radial-card {
  display: flex;
  flex-direction: column;
}

.radial-ring-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-ring {
  transform: rotate(-90deg);
}

.pr-center-text {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.pr-val {
  font-size: 28px;
  font-weight: 300;
  color: #fff;
  line-height: 1;
  margin-bottom: 4px;
}

.pr-lbl {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* 4. List Card */
.list-card {
  display: flex;
  flex-direction: column;
  padding: 24px 16px; /* slightly less horizontal padding */
}

.list-card .card-header-flex {
  padding: 0 8px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.rl-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 12px;
  transition: background 0.2s;
}

.rl-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.rl-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rl-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.rl-info h4 {
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rl-info span {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
}

.rl-status {
  padding-left: 8px;
}

/* ROW 2: TIMELINE */
.dash-timeline-row {
  width: 100%;
}

.timeline-card {
  padding: 0;
  min-height: 250px;
  display: flex;
  flex-direction: column;
}

.tl-header {
  padding: 24px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.tl-header h3 {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  color: #fff;
}

.tl-months {
  display: flex;
  gap: 24px;
}

.tl-month {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: color 0.2s;
}

.tl-month:hover {
  color: #fff;
}

.tl-month.active {
  color: #fff;
  font-weight: 600;
}

.tl-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  padding-bottom: 24px;
}

.tlg-days {
  display: flex;
  padding-left: 80px; /* offset for time labels */
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.tlg-day-col {
  flex: 1;
  padding: 16px 0;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
}

.tlg-rows {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  padding-top: 16px;
}

.tlg-time-row {
  display: flex;
  height: 40px;
  padding-left: 20px;
}

.tlg-time-label {
  width: 60px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  text-align: right;
  padding-right: 16px;
  transform: translateY(-6px);
}

.tlg-cells {
  flex: 1;
  display: flex;
}

.tlg-cell {
  flex: 1;
  border-left: 1px dashed rgba(255, 255, 255, 0.05);
  border-top: 1px dashed rgba(255, 255, 255, 0.03);
}

.tlg-cell:last-child {
  border-right: 1px dashed rgba(255, 255, 255, 0.05);
}

/* Event pills over timeline */
.tl-event-pill {
  position: absolute;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.tl-event-pill:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(0,0,0,0.3);
}

.tle-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.tle-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.tle-av-group {
  display: flex;
  margin-top: 8px;
}

.tle-av {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fb923c;
  color: #fff;
  font-size: 8px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #1e1e20;
  margin-left: -6px;
}

.tle-av:first-child {
  margin-left: 0;
}

.tle-av.dark {
  background: #1c1c1e;
  border-color: #fff;
}

/* ── Modern Table Layout ── */
.table-container-modern { display: flex; flex-direction: column; gap: 16px; animation: cardEnter 0.4s ease both; }
.header-actions-modern { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; }
.title-group h3 { font-size: 18px; font-weight: 600; color: white; margin: 0; letter-spacing: -0.02em; }
.title-group p { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 4px; }

.pm-table-modern { display: flex; flex-direction: column; width: 100%; border-radius: 12px;}
.pm-row-modern {
    display: grid; 
    align-items: center; 
    padding: 12px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    transition: background 0.2s;
}
.pm-row-modern.header {
    padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); background: transparent;
    font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.05em;
    padding-left: 12px; padding-right: 12px;
}
.pm-row-modern.item {
    font-size: 14px; border-radius: 0;
    cursor: pointer; animation: rowSlide 0.4s ease both;
    padding-left: 12px; padding-right: 12px;
    background: rgba(255,255,255,0.01);
}
.pm-row-modern.item:hover { background: rgba(255,255,255,0.05); }
.pm-row-modern.item:last-child { border-bottom: none; }

/* Grid Columns */
.status-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 6px; border-radius: 4px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05);
    font-size: 9px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase;
}
.status-badge.compact { padding: 3px 8px; font-size: 10px; border-radius: 6px; }
.status-badge.draft { background: rgba(161, 161, 170, 0.1); border-color: rgba(161, 161, 170, 0.2); color: #a1a1aa; }

.col.client { display: flex; flex-direction: column; }
.v-name { font-size: 14px; font-weight: 600; color: #f5f5f7; }
.v-ref { font-size: 11px; color: rgba(255,255,255,0.4); font-family: 'SF Mono', monospace; text-transform: capitalize; margin-top:2px; }

.pill { border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; color: rgba(255,255,255,0.4); }

@keyframes rowSlide {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

.search-box {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  padding: 6px 12px; border-radius: 8px;
}
.search-box input {
  background: transparent; border: none; outline: none; color: white;
  font-size: 12px; width: 160px;
}
.search-box input::placeholder { color: rgba(255,255,255,0.3); }

/* Fix glass-card fallback */
.glass-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.08);
}

/* ════════════════════════════════════════════════════════════════════════
   LIGHT THEME OVERRIDES — preserve gold/amber/orange palette + transparency
   Targets all .nano-page descendants under [data-theme="light"].
   ════════════════════════════════════════════════════════════════════════ */

[data-theme="light"] .nano-page {
  color: #1a1410;
}

/* ── Ultra-modern nav-left tabs dock (light) ─────────────────────────── */
[data-theme="light"] .nano-tabs-dock {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.55), rgba(254, 243, 199, 0.45));
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(217, 119, 6, 0.18);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.7) inset,
    0 8px 24px -8px rgba(180, 83, 9, 0.18),
    0 2px 6px rgba(120, 53, 15, 0.08);
  position: relative;
  overflow: hidden;
}

[data-theme="light"] .nano-tabs-dock::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg,
      transparent 30%,
      rgba(253, 224, 71, 0.22) 50%,
      transparent 70%);
  background-size: 250% 100%;
  animation: tabsDockShimmer 6s ease-in-out infinite;
  pointer-events: none;
  border-radius: inherit;
}

@keyframes tabsDockShimmer {
  0%, 100% { background-position: 250% 0; }
  50% { background-position: -50% 0; }
}

[data-theme="light"] .n-tab {
  color: rgba(120, 53, 15, 0.62);
  position: relative;
  z-index: 1;
}

[data-theme="light"] .n-tab:hover {
  color: #92400e;
}

[data-theme="light"] .n-tab.active {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fffaf0;
  box-shadow:
    0 4px 14px rgba(217, 119, 6, 0.38),
    0 1px 0 rgba(255, 255, 255, 0.45) inset;
}

[data-theme="light"] .n-tab.active .tab-icon {
  filter: drop-shadow(0 1px 2px rgba(120, 53, 15, 0.3));
}

[data-theme="light"] .tab-separator {
  background: linear-gradient(180deg, transparent, rgba(180, 83, 9, 0.28), transparent);
}

/* ── Welcome / heading row ───────────────────────────────────────────── */
[data-theme="light"] .dash-welcome h1 {
  color: #1a1410;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
}

[data-theme="light"] .welcome-subtext {
  color: #6b5840;
}

[data-theme="light"] .dash-welcome .highlight-text {
  color: #b45309;
}

/* ── Top stats (Drafts / Approved / Active SLAs) ─────────────────────── */
[data-theme="light"] .dts-val {
  color: #1a1410;
}

[data-theme="light"] .dts-val.highlight {
  color: #b45309;
}

[data-theme="light"] .dts-label {
  color: #92400e;
}

/* ── Generic n-card (frosted cream) ──────────────────────────────────── */
[data-theme="light"] .n-card {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.78), rgba(254, 243, 199, 0.55));
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  border: 1px solid rgba(217, 119, 6, 0.15);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.6) inset,
    0 12px 28px -10px rgba(180, 83, 9, 0.18);
}

[data-theme="light"] .n-card:hover {
  border: 1px solid rgba(217, 119, 6, 0.28);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.7) inset,
    0 20px 40px -8px rgba(180, 83, 9, 0.22);
}

[data-theme="light"] .n-card h3 {
  color: #1a1410;
}

[data-theme="light"] .n-card p.sub-text {
  color: #8a6d4a;
}

[data-theme="light"] .icon-btn-sm {
  background: rgba(217, 119, 6, 0.08);
  border: 1px solid rgba(217, 119, 6, 0.18);
  color: #b45309;
}

[data-theme="light"] .icon-btn-sm:hover {
  background: rgba(217, 119, 6, 0.16);
  color: #92400e;
}

/* ── Hero profile card ───────────────────────────────────────────────── */
[data-theme="light"] .hero-profile-card {
  background: transparent;
}

[data-theme="light"] .hpc-image-wrapper {
  background: linear-gradient(135deg, #fbbf24, #d97706);
}

[data-theme="light"] .hpc-bg-image {
  background: linear-gradient(135deg, #f59e0b, #b45309);
  opacity: 0.85;
}

[data-theme="light"] .hpc-overlay-gradient {
  background: linear-gradient(to bottom, transparent 30%, rgba(60, 30, 10, 0.78));
}

[data-theme="light"] .hpc-bottom-info h2,
[data-theme="light"] .hpc-bottom-info p {
  color: #fffaf0;
  text-shadow: 0 1px 4px rgba(60, 30, 10, 0.45);
}

[data-theme="light"] .hpc-action-area {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.7), rgba(254, 243, 199, 0.6));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

[data-theme="light"] .hpc-action-area p {
  color: #6b5840;
}

[data-theme="light"] .n-btn-outline {
  background: rgba(217, 119, 6, 0.08);
  color: #92400e;
  border: 1px solid rgba(217, 119, 6, 0.25);
}

[data-theme="light"] .n-btn-outline:hover.glow-hover {
  background: rgba(245, 158, 11, 0.18);
  border-color: #d97706;
  color: #78350f;
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.25);
}

[data-theme="light"] .n-btn-primary {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #1a1410;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);
}

[data-theme="light"] .n-btn-primary:hover {
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.45);
}

/* ── Chart card (Generation Activity) ────────────────────────────────── */
[data-theme="light"] .vbc-bar-bg {
  background: rgba(217, 119, 6, 0.12);
}

[data-theme="light"] .vbc-label {
  color: #8a6d4a;
}

[data-theme="light"] .highlight-label {
  color: #b45309;
  font-weight: 700;
}

/* ── Radial card (Approval Rate) ─────────────────────────────────────── */
[data-theme="light"] .progress-ring .pr-bg {
  stroke: rgba(217, 119, 6, 0.12);
}

[data-theme="light"] .pr-val {
  color: #1a1410;
}

[data-theme="light"] .pr-lbl {
  color: #92400e;
}

/* ── List card (Recent Drafts) ───────────────────────────────────────── */
[data-theme="light"] .rl-item:hover {
  background: rgba(245, 158, 11, 0.08);
}

[data-theme="light"] .rl-info h4 {
  color: #1a1410;
}

[data-theme="light"] .rl-info span {
  color: #8a6d4a;
}

/* ── Timeline (SLA Timeline) ─────────────────────────────────────────── */
[data-theme="light"] .timeline-card {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.78), rgba(254, 243, 199, 0.55));
}

[data-theme="light"] .tl-header {
  border-bottom: 1px solid rgba(217, 119, 6, 0.15);
}

[data-theme="light"] .tl-header h3 {
  color: #1a1410;
}

[data-theme="light"] .tl-month {
  color: #8a6d4a;
}

[data-theme="light"] .tl-month:hover {
  color: #92400e;
}

[data-theme="light"] .tl-month.active {
  color: #b45309;
}

[data-theme="light"] .tlg-days {
  border-bottom: 1px solid rgba(217, 119, 6, 0.15);
}

[data-theme="light"] .tlg-day-col {
  color: #8a6d4a;
}

[data-theme="light"] .tlg-time-label {
  color: rgba(120, 53, 15, 0.55);
}

[data-theme="light"] .tlg-cell {
  border-left: 1px dashed rgba(180, 83, 9, 0.12);
  border-top: 1px dashed rgba(180, 83, 9, 0.08);
}

[data-theme="light"] .tlg-cell:last-child {
  border-right: 1px dashed rgba(180, 83, 9, 0.12);
}

/* Event pills — inline styles set background/border/color from JS.
   Override them so both "dark" and "light" theme variants stay legible. */
[data-theme="light"] .tl-event-pill {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.92), rgba(254, 243, 199, 0.85)) !important;
  border: 1px solid rgba(217, 119, 6, 0.28) !important;
  color: #1a1410 !important;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.6) inset,
    0 10px 24px -6px rgba(180, 83, 9, 0.22);
}

[data-theme="light"] .tl-event-pill .tle-title {
  color: #1a1410 !important;
}

[data-theme="light"] .tl-event-pill .tle-sub {
  color: #6b5840 !important;
}

[data-theme="light"] .tle-av {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fffaf0;
  border-color: #fffaf0;
  box-shadow: 0 2px 6px rgba(217, 119, 6, 0.35);
}

[data-theme="light"] .tle-av.dark {
  background: #1a1410;
  color: #fbbf24;
  border-color: #fbbf24;
}

/* ── Tables (Draft / Pending / Approved / Rejected lists) ────────────── */
[data-theme="light"] .title-group h3 {
  color: #1a1410;
}

[data-theme="light"] .title-group p {
  color: #6b5840;
}

[data-theme="light"] .pm-table-modern.glass-card {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.78), rgba(254, 243, 199, 0.55));
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  border: 1px solid rgba(217, 119, 6, 0.15);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.6) inset,
    0 12px 28px -10px rgba(180, 83, 9, 0.15);
}

[data-theme="light"] .pm-row-modern {
  border-bottom: 1px solid rgba(217, 119, 6, 0.10);
}

[data-theme="light"] .pm-row-modern.header {
  color: #92400e;
  border-bottom: 1px solid rgba(217, 119, 6, 0.22);
}

[data-theme="light"] .pm-row-modern.item {
  background: rgba(255, 250, 240, 0.35);
  color: #1a1410;
}

[data-theme="light"] .pm-row-modern.item:hover {
  background: rgba(245, 158, 11, 0.10);
}

[data-theme="light"] .v-name {
  color: #1a1410 !important;
}

[data-theme="light"] .v-ref,
[data-theme="light"] .col.client .v-name {
  color: #6b5840 !important;
}

[data-theme="light"] .col.date {
  color: #8a6d4a !important;
}

[data-theme="light"] .col.category .v-ref,
[data-theme="light"] .pm-row-modern .pill {
  background: rgba(217, 119, 6, 0.10) !important;
  color: #92400e !important;
}

[data-theme="light"] .status-badge.draft {
  background: rgba(120, 53, 15, 0.10);
  border-color: rgba(120, 53, 15, 0.22);
  color: #78350f;
}

[data-theme="light"] .empty-state {
  color: #8a6d4a;
}

[data-theme="light"] .empty-state h4 {
  color: #1a1410;
}

[data-theme="light"] .empty-state p {
  color: #6b5840;
}

/* ── Search box — fully transparent on cream, only gold outline + text ── */
[data-theme="light"] .search-box {
  background: transparent;
  border: 1px solid rgba(217, 119, 6, 0.35);
  box-shadow: none;
}

[data-theme="light"] .search-box svg {
  color: #b45309;
}

[data-theme="light"] .search-box input {
  background: transparent;
  color: #1a1410;
}

[data-theme="light"] .search-box input::placeholder {
  color: rgba(120, 53, 15, 0.5);
}

[data-theme="light"] .search-box:focus-within {
  border-color: #d97706;
  background: transparent;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18);
}

/* ── Approved status badge — readable emerald on cream ── */
[data-theme="light"] .status-badge.approved,
[data-theme="light"] .pm-row-modern .status-badge.compact.approved {
  background: rgba(34, 134, 58, 0.16) !important;
  color: #15803d !important;
  border-color: rgba(34, 134, 58, 0.38) !important;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.4) inset;
}

[data-theme="light"] .status-badge.pending,
[data-theme="light"] .pm-row-modern .status-badge.compact.pending {
  background: rgba(217, 119, 6, 0.16) !important;
  color: #b45309 !important;
  border-color: rgba(217, 119, 6, 0.40) !important;
}

[data-theme="light"] .status-badge.rejected,
[data-theme="light"] .pm-row-modern .status-badge.compact.rejected {
  background: rgba(185, 28, 28, 0.14) !important;
  color: #b91c1c !important;
  border-color: rgba(185, 28, 28, 0.36) !important;
}

/* ── Value cell + meta cell (added columns) ── */
.col.value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-family: 'SF Mono', monospace;
  font-weight: 600;
  font-size: 13px;
  color: #fbbf24;
}
.col.value .currency-tag {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
  letter-spacing: 0.05em;
}
.col.meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.col.meta .meta-primary {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}
.col.meta .meta-secondary {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

[data-theme="light"] .col.value { color: #b45309; }
[data-theme="light"] .col.value .currency-tag { color: #8a6d4a; }
[data-theme="light"] .col.meta .meta-primary { color: #1a1410; }
[data-theme="light"] .col.meta .meta-secondary { color: #92400e; }

/* ── Reason / feedback pill on rejected rows ── */
.col.reason-cell {
  min-width: 0;
  display: flex;
  align-items: center;
}
.reason-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.10);
  border: 1px solid rgba(239, 68, 68, 0.22);
  color: rgba(255, 255, 255, 0.85);
  font-size: 11px;
  line-height: 1.2;
  max-width: 100%;
  min-width: 0;
}
.reason-pill svg {
  flex-shrink: 0;
  color: #f87171;
}
.reason-pill span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  max-width: 100%;
}

[data-theme="light"] .reason-pill {
  background: rgba(185, 28, 28, 0.10);
  border: 1px solid rgba(185, 28, 28, 0.28);
  color: #7f1d1d;
}
[data-theme="light"] .reason-pill svg {
  color: #b91c1c;
}

/* Column header alignment for new columns */
.pm-row-modern.header .col.value-col,
.pm-row-modern.header .col.validity-col,
.pm-row-modern.header .col.reason-col {
  text-align: left;
}
</style>
