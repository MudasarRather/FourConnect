<template>
  <div class="dpr-page">
    <!-- HEADER -->
    <header class="dpr-header">
      <div class="nav-left">
        <div class="tabs-dock">
          <button class="n-tab" :class="{ active: activeTab === 'dashboard' }" @click="activeTab = 'dashboard'">
            <LayoutGrid :size="14" class="tab-icon"/> Dashboard
          </button>
          <div class="tab-sep"></div>
          <button class="n-tab" :class="{ active: activeTab === 'draft' }" @click="activeTab = 'draft'">
            <FileText :size="14" class="tab-icon"/> Draft Documents
          </button>
          <button v-if="isAdmin" class="n-tab" :class="{ active: activeTab === 'pending' }" @click="activeTab = 'pending'">
            <Clock :size="14" class="tab-icon"/> Pending Approvals
          </button>
          <button class="n-tab" :class="{ active: activeTab === 'rejected' }" @click="activeTab = 'rejected'">
            <XCircle :size="14" class="tab-icon"/> Rejected
          </button>
          <button class="n-tab" :class="{ active: activeTab === 'approved' }" @click="activeTab = 'approved'">
            <CheckCircle :size="14" class="tab-icon"/> Approved Documents
          </button>
        </div>
      </div>
      <div class="nav-right">
        <!-- Removed btn-new as requested -->
      </div>
    </header>

    <!-- ═══════════ DASHBOARD TAB (CoinVex Layout) ═══════════ -->
    <main class="dash-main slide-up" v-if="activeTab === 'dashboard'" :key="'dash'">

      <!-- Title Row -->
      <div class="cv-title-row">
        <div class="cv-title-left">
          <h1 class="cv-h1">Dashboard</h1>
          <p class="cv-date">{{ todayFormatted }}</p>
        </div>
      </div>

      <!-- 3-Column CoinVex Grid -->
      <div class="cv-grid">

        <!-- ══ LEFT COLUMN ══ -->
        <div class="cv-col-left">

          <!-- Portfolio Card -->
          <div class="cv-card cv-portfolio ani-1">
            <h3 class="cv-card-title">Your Handovers</h3>
            
            <!-- Health Metrics instead of toggles -->
            <div class="cv-health-metrics">
              <div class="cv-health-item">
                <div class="cv-hi-icon"><CheckCircle :size="14" color="#a3e635"/></div>
                <span>Systems Sync</span>
              </div>
              <div class="cv-health-item">
                <div class="cv-hi-icon"><Activity :size="14" color="#38bdf8"/></div>
                <span>Monitoring Active</span>
              </div>
            </div>

            <!-- Action Circles -->
            <div class="cv-actions">
              <router-link :to="isAdmin ? '/admin/documents/handover/new' : '/user/documents/handover/new'" class="cv-action-circle">
                <div class="cv-ac-icon"><Plus :size="18" /></div>
                <span>New DPR</span>
              </router-link>
              <div class="cv-action-circle" @click="activeTab='draft'">
                <div class="cv-ac-icon"><Activity :size="18" /></div>
                <span>In Progress</span>
              </div>
              <div class="cv-action-circle" @click="activeTab='approved'">
                <div class="cv-ac-icon"><Layers :size="18" /></div>
                <span>Completed</span>
              </div>
            </div>

            <!-- Balance Bar -->
            <div class="cv-balance-section">
              <div class="cv-bal-header">
                <span class="cv-bal-title">Completion Rate</span>
                <PieChart :size="14" class="cv-bal-icon" />
              </div>
              <div class="cv-bal-row">
                <div class="cv-bal-item"><span class="cv-bal-label">Drafts:</span> <strong><AnimatedNumber :value="stats.drafts" /></strong></div>
                <div class="cv-bal-item"><span class="cv-bal-label">Approved:</span> <strong><AnimatedNumber :value="stats.approved" /></strong></div>
              </div>
              <div class="cv-progress-track"><div class="cv-progress-fill" :style="{ width: `${stats.total > 0 ? (stats.approved / stats.total) * 100 : 0}%` }"></div></div>
            </div>
          </div>

          <!-- Status Cards (Green + Purple) -->
          <div class="cv-card cv-status-card green ani-2" @click="activeTab='draft'">
            <div class="cv-sc-top">
              <div class="cv-sc-icon"><FileText :size="18" /></div>
              <span class="cv-sc-type">Draft Handover</span>
              <button class="cv-dots">⋮</button>
            </div>
            <div class="cv-sc-val">₹<AnimatedNumber :value="totalDraftValue" /></div>
            <div class="cv-sc-bottom">
              <span class="cv-sc-change"><TrendingUp :size="12" /> {{ stats.drafts }} items</span>
              <span class="cv-sc-tag">*{{ stats.drafts }}</span>
            </div>
          </div>

          <div class="cv-card cv-status-card purple ani-3" @click="activeTab='approved'">
            <div class="cv-sc-top">
              <div class="cv-sc-icon"><CheckCircle :size="18" /></div>
              <span class="cv-sc-type">Approved Handover</span>
              <button class="cv-dots">⋮</button>
            </div>
            <div class="cv-sc-val">₹<AnimatedNumber :value="totalApprovedValue" /></div>
            <div class="cv-sc-bottom">
              <span class="cv-sc-change"><TrendingUp :size="12" /> {{ stats.approved }} items</span>
              <span class="cv-sc-tag">*{{ stats.approved }}</span>
            </div>
          </div>
        </div>

        <!-- ══ CENTER COLUMN ══ -->
        <div class="cv-col-center">

          <!-- Cashflow / Progress Card -> Transitioned Value -->
          <div class="cv-card cv-cashflow ani-2 enhanced-cashflow" :class="latestDprStatusClass">
            <div :class="'cv-bg-glow-' + latestDprStatusClass"></div>
            <div class="cv-cf-header">
              <div>
                <h3 class="cv-card-title">Transitioned Value</h3>
                <p class="cv-cf-sub">Total Infrastructure Assets</p>
                <div class="cv-cf-amount">₹{{ formatCurrency(totalProjectValue) }}</div>
              </div>
            </div>
            <!-- SVG Area Chart -->
            <div class="cv-area-chart-wrap">
              <svg class="cv-area-chart" viewBox="0 0 400 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaG1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#4ade80" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="#4ade80" stop-opacity="0"/>
                  </linearGradient>
                  <linearGradient id="areaG2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/>
                  </linearGradient>
                  <linearGradient id="areaG3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.2"/>
                    <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path :d="areaPath1" fill="url(#areaG1)" class="area-anim"/>
                <path :d="areaLine1" stroke="#4ade80" stroke-width="2" fill="none" class="line-anim"/>
                <path :d="areaPath2" fill="url(#areaG2)" class="area-anim d2"/>
                <path :d="areaLine2" stroke="#a78bfa" stroke-width="1.5" fill="none" class="line-anim d2"/>
                <path :d="areaPath3" fill="url(#areaG3)" class="area-anim d3"/>
                <path :d="areaLine3" stroke="#fbbf24" stroke-width="1.5" fill="none" class="line-anim d3"/>
                <!-- Y-axis labels -->
                <text x="2" y="18" class="cv-chart-label">₹{{ formatCompact(totalProjectValue) }}</text>
                <text x="2" y="110" class="cv-chart-label">₹0</text>
              </svg>
              <!-- Legend -->
              <div class="cv-chart-legend">
                <span class="cv-leg"><span class="cv-leg-dot" style="background:#4ade80"></span>Approved</span>
                <span class="cv-leg"><span class="cv-leg-dot" style="background:#a78bfa"></span>Drafts</span>
                <span class="cv-leg"><span class="cv-leg-dot" style="background:#fbbf24"></span>Pending</span>
              </div>
            </div>
          </div>

          <!-- Analytics Bar Grid -->
          <div class="cv-card cv-analytics ani-4" style="flex: 1; display: flex; flex-direction: column;">
            <div class="cv-cf-header">
              <div>
                <h3 class="cv-card-title">Handover Velocity</h3>
                <p class="cv-cf-sub">{{ analyticsDateRange }}</p>
              </div>
              <div class="velocity-stats" style="text-align: right;">
                <div style="font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em;">Weekly Avg</div>
                <div style="font-size: 16px; font-weight: 700; color: #fff; font-family: 'SF Mono', monospace;">{{ Math.round((stats.drafts + stats.approved) / 7 * 10) / 10 }} <span style="font-size: 11px; color: rgba(255,255,255,0.3);">/day</span></div>
              </div>
            </div>
            
            <div style="display: flex; gap: 8px; margin-bottom: 16px; font-size: 11px;">
              <div style="flex: 1; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 10px;">
                <div style="color: rgba(255,255,255,0.4); margin-bottom: 4px;">Pending Docs</div>
                <div style="font-size: 14px; font-weight: 600; color: #fbbf24;">{{ stats.pending }}</div>
              </div>
              <div style="flex: 1; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 10px;">
                <div style="color: rgba(255,255,255,0.4); margin-bottom: 4px;">Approved Docs</div>
                <div style="font-size: 14px; font-weight: 600; color: #4ade80;">{{ stats.approved }}</div>
              </div>
            </div>

            <div class="cv-bar-grid" style="flex: 1; align-items: flex-end;">
              <div class="cv-bar-col" v-for="(day, i) in weeklyActivity" :key="i">
                <div class="cv-bar-stack">
                  <div class="cv-bar-block b1" :style="{ height: `${day.h1}px`, animationDelay: `${0.8 + i * 0.07}s` }"><span class="cv-bv" v-if="day.h1 > 16">{{ day.v1 }}</span></div>
                  <div class="cv-bar-block b2" :style="{ height: `${day.h2}px`, animationDelay: `${0.9 + i * 0.07}s` }"><span class="cv-bv" v-if="day.h2 > 16">{{ day.v2 }}</span></div>
                </div>
                <span class="cv-bar-day" :class="{ active: day.highlight }">{{ day.dayName }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ══ RIGHT COLUMN ══ -->
        <div class="cv-col-right">

          <!-- Promo CTA Card -->
          <div class="cv-card cv-promo ani-2">
            <div class="cv-promo-mesh"></div>
            <h3 class="cv-promo-title">Create & Deliver</h3>
            <p class="cv-promo-sub">Start a new project handover document and deliver excellence.</p>
            <router-link :to="isAdmin ? '/admin/documents/handover/new' : '/user/documents/handover/new'" class="cv-start-btn">
              START <ArrowRight :size="14" />
            </router-link>
          </div>

          <!-- Quick Creators -->
          <div class="cv-card cv-quick ani-3" style="position: relative; overflow: hidden;">
            <div class="cv-q-bg-glow"></div>
            <div class="cv-q-header">
              <span>Recent Creators</span>
              <button class="cv-plus-btn pulse-glow" @click="router.push(isAdmin ? '/admin/documents/handover/new' : '/user/documents/handover/new')"><Plus :size="14" /></button>
            </div>
            <div class="cv-avatars">
              <div class="cv-av float-anim" v-for="(creator, i) in recentCreators" :key="i" :title="creator.name" :style="{ animationDelay: `${1.0 + i * 0.15}s` }">{{ creator.initials }}</div>
            </div>
            <!-- Recent Items -->
            <div class="cv-recent-items">
              <div class="cv-ri modern-ri" v-for="(item, i) in recentAll.slice(0, 3)" :key="i" @click="openItem(item)" :style="{ animationDelay: `${1.2 + i * 0.1}s` }">
                <div class="cv-ri-avatar"><FileText :size="14" /></div>
                <div class="cv-ri-info">
                  <span class="cv-ri-name">{{ item.project_name || 'Untitled' }}</span>
                  <span class="cv-ri-sub">{{ item.status }}</span>
                </div>
                <div class="cv-ri-action-glow"><ArrowRight :size="13" /></div>
              </div>
            </div>
          </div>

          <!-- Transfer / Latest Handover -> Latest Draft Handover -->
          <div class="cv-card cv-transfer ani-5" v-if="latestDraft">
            <div class="cv-tf-top">
              <span class="cv-tf-ref">{{ latestDraft.project_code || 'DPR' }}</span>
              <span class="cv-tf-type">· Latest Draft</span>
              <button class="cv-pill-btn" @click="selectedDraftId = latestDraft.id">Details</button>
            </div>
            <div class="cv-tf-amount-row enhanced-tf-row">
              <div class="tf-stat-box">
                <span class="cv-tf-label">Asset Value</span>
                <div class="cv-tf-amount">₹{{ formatCurrency(latestDraft.total_project_value || 0) }}</div>
              </div>
              <div class="tf-stat-box from-box">
                <span class="cv-tf-label">Project Target</span>
                <span class="cv-tf-tag-main">{{ latestDraft.project_name || 'Untitled' }}</span>
              </div>
            </div>
            <router-link :to="(isAdmin ? '/admin' : '/user') + '/documents/handover/new?edit=' + latestDraft.id" class="cv-transfer-btn glow-btn">
              Complete Handover Draft <ArrowRight :size="16" /> 
            </router-link>
          </div>
        </div>

      </div>
    </main>

    <!-- ═══════════ DRAFT TAB ═══════════ -->
    <main class="dash-main slide-up-fade" v-if="activeTab === 'draft'" :key="'draft'">
      <div class="table-container-modern">
        <div class="header-actions-modern">
          <div class="title-group">
            <h3>Draft Handovers</h3>
            <p>Continue working on your pending documents</p>
          </div>
          <div class="table-controls" style="display: flex; gap: 12px; align-items: center;">
            <div class="search-box">
              <FileText :size="14" />
              <input v-model="draftSearch" placeholder="Search drafts..." />
            </div>
          </div>
        </div>
        
        <div class="pm-table-modern glass-card" style="padding:0; overflow:hidden;">
          <div class="pm-row-modern header" style="grid-template-columns: 50px 2fr 1.5fr 1fr 120px;">
            <div class="col sn">S.N</div>
            <div class="col title">Project Name</div>
            <div class="col client">Client / Target</div>
            <div class="col date">Creation Date</div>
            <div class="col status">Status</div>
          </div>
          <div v-if="filteredDrafts.length === 0" class="empty-state" style="padding:60px 0; text-align:center;">
            <FileText :size="48" style="color: rgba(255,255,255,0.1); margin: 0 auto;" />
            <h4 style="margin-top:16px;">No Drafts Found</h4>
            <p>You don't have any pending handover drafts.</p>
          </div>
          <div v-for="(d, i) in filteredDrafts" :key="d.id" class="pm-row-modern item" :style="{ animationDelay: i * 40 + 'ms', gridTemplateColumns: '50px 2fr 1.5fr 1fr 120px' }" @click="selectedDraftId = d.id">
            <div class="col sn">{{ i + 1 }}.</div>
            <div class="col category">
              <span class="v-name" style="max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">{{ d.project_name || 'Untitled Handover' }}</span>
              <div style="display:flex; gap:6px; margin-top:4px; align-items:center;">
                <span class="v-ref" style="text-transform: capitalize; color:rgba(255,255,255,0.4); font-size:11px;">{{ d.project_code || 'No Code' }}</span>
                <span class="pill" v-if="d.version" :style="{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', padding:'2px 6px', fontSize:'9px', borderRadius:'4px', letterSpacing:'0.02em', textTransform:'uppercase' }">v{{ d.version }}</span>
              </div>
            </div>
            <div class="col client">
              <span class="v-name" style="color:rgba(255,255,255,0.85); font-weight:500;">{{ d.client_organization || '—' }}</span>
            </div>
            <div class="col date" style="color:rgba(255,255,255,0.5); font-size:12px;">{{ formatDate(d.created_at) }}</div>
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

    <!-- ═══════════ PENDING TAB (ADMIN) ═══════════ -->
    <main class="dash-main slide-up-fade" v-if="activeTab === 'pending' && isAdmin" :key="'pending'">
      <div class="table-container-modern">
        <div class="header-actions-modern">
          <div class="title-group">
            <h3>Pending Approvals</h3>
            <p>Review and approve submitted Handovers</p>
          </div>
          <div class="table-controls" style="display: flex; gap: 12px; align-items: center;">
            <div class="search-box">
              <FileText :size="14" />
              <input v-model="pendingSearch" placeholder="Search pending..." />
            </div>
          </div>
        </div>

        <div class="pm-table-modern glass-card" style="padding:0; overflow:hidden;">
          <div class="pm-row-modern header" style="grid-template-columns: 50px 2fr 1.5fr 1fr 120px;">
            <div class="col sn">S.N</div>
            <div class="col title">Project Name</div>
            <div class="col client">Client / Target</div>
            <div class="col date">Submission Date</div>
            <div class="col status">Status</div>
          </div>
          <div v-if="filteredPending.length === 0" class="empty-state" style="padding:60px 0; text-align:center;">
            <CheckCircle :size="48" style="color: rgba(255,255,255,0.1); margin: 0 auto;" />
            <h4 style="margin-top:16px;">All Caught Up</h4>
            <p>There are no handover documents pending your approval.</p>
          </div>
          <div v-for="(d, i) in filteredPending" :key="d.id" class="pm-row-modern item" :style="{ animationDelay: i * 40 + 'ms', gridTemplateColumns: '50px 2fr 1.5fr 1fr 120px' }" @click="selectedPendingId = d.id">
            <div class="col sn">{{ i + 1 }}.</div>
            <div class="col category">
              <span class="v-name" style="max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">{{ d.project_name || 'Untitled Handover' }}</span>
              <div style="display:flex; gap:6px; margin-top:4px; align-items:center;">
                <span class="v-ref" style="text-transform: capitalize; color:rgba(255,255,255,0.4); font-size:11px;">{{ d.project_code || 'No Code' }}</span>
              </div>
            </div>
            <div class="col client">
              <span class="v-name" style="color:rgba(255,255,255,0.85); font-weight:500;">{{ d.client_organization || '—' }}</span>
            </div>
            <div class="col date" style="color:rgba(255,255,255,0.5); font-size:12px;">{{ formatDate(d.updated_at || d.created_at) }}</div>
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

    <!-- ═══════════ APPROVED TAB ═══════════ -->
    <main class="dash-main slide-up-fade" v-if="activeTab === 'approved'" :key="'approved'">
      <div class="table-container-modern">
        <div class="header-actions-modern">
          <div class="title-group">
            <h3>Approved Handovers</h3>
            <p>Your finalized and executable Handover documents</p>
          </div>
          <div class="table-controls" style="display: flex; gap: 12px; align-items: center;">
            <div class="search-box">
              <FileText :size="14" />
              <input v-model="approvedSearch" placeholder="Search approved..." />
            </div>
          </div>
        </div>

        <div class="pm-table-modern glass-card" style="padding:0; overflow:hidden;">
          <div class="pm-row-modern header" style="grid-template-columns: 50px 2fr 1.5fr 1fr 120px;">
            <div class="col sn">S.N</div>
            <div class="col title">Project Name</div>
            <div class="col client">Client / Target</div>
            <div class="col date">Approval Date</div>
            <div class="col status">Status</div>
          </div>
          <div v-if="filteredApproved.length === 0" class="empty-state" style="padding:60px 0; text-align:center;">
            <CheckCircle :size="48" style="color: rgba(74, 222, 128, 0.2); margin: 0 auto;" />
            <h4 style="margin-top:16px;">No Approved Handovers</h4>
            <p>Approved handovers will appear here.</p>
          </div>
          <div v-for="(d, i) in filteredApproved" :key="d.id" class="pm-row-modern item" :style="{ animationDelay: i * 40 + 'ms', gridTemplateColumns: '50px 2fr 1.5fr 1fr 120px' }" @click="selectedApprovedId = d.id">
            <div class="col sn">{{ i + 1 }}.</div>
            <div class="col category">
              <span class="v-name" style="max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">{{ d.project_name || 'Untitled Handover' }}</span>
              <div style="display:flex; gap:6px; margin-top:4px; align-items:center;">
                <span class="v-ref" style="text-transform: capitalize; color:rgba(255,255,255,0.4); font-size:11px;">{{ d.project_code || 'No Code' }}</span>
              </div>
            </div>
            <div class="col client">
              <span class="v-name" style="color:rgba(255,255,255,0.85); font-weight:500;">{{ d.client_organization || '—' }}</span>
            </div>
            <div class="col date" style="color:rgba(255,255,255,0.5); font-size:12px;">{{ formatDate(d.updated_at || d.created_at) }}</div>
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

    <!-- ═══════════ REJECTED TAB ═══════════ -->
    <main class="dash-main slide-up-fade" v-if="activeTab === 'rejected'" :key="'rejected'">
      <div class="table-container-modern">
        <div class="header-actions-modern">
          <div class="title-group">
            <h3>Rejected Handovers</h3>
            <p>Documents requiring revision based on admin feedback</p>
          </div>
          <div class="table-controls" style="display: flex; gap: 12px; align-items: center;">
            <div class="search-box">
              <FileText :size="14" />
              <input v-model="rejectedSearch" placeholder="Search rejected..." />
            </div>
          </div>
        </div>

        <div class="pm-table-modern glass-card" style="padding:0; overflow:hidden;">
          <div class="pm-row-modern header" style="grid-template-columns: 50px 2fr 1.5fr 1fr 120px;">
            <div class="col sn">S.N</div>
            <div class="col title">Project Name</div>
            <div class="col client">Client / Target</div>
            <div class="col date">Rejection Date</div>
            <div class="col status">Status</div>
          </div>
          <div v-if="filteredRejected.length === 0" class="empty-state" style="padding:60px 0; text-align:center;">
            <XCircle :size="48" style="color: rgba(239, 68, 68, 0.1); margin: 0 auto;" />
            <h4 style="margin-top:16px;">No Rejected Handovers</h4>
            <p>Documents rejected by admins will appear here.</p>
          </div>
          <div v-for="(d, i) in filteredRejected" :key="d.id" class="pm-row-modern item" :style="{ animationDelay: i * 40 + 'ms', gridTemplateColumns: '50px 2fr 1.5fr 1fr 120px' }" @click="selectedRejectedId = d.id">
            <div class="col sn">{{ i + 1 }}.</div>
            <div class="col category">
              <span class="v-name" style="max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">{{ d.project_name || 'Untitled Handover' }}</span>
              <div style="display:flex; gap:6px; margin-top:4px; align-items:center;">
                <span class="v-ref" style="text-transform: capitalize; color:rgba(255,255,255,0.4); font-size:11px;">{{ d.project_code || 'No Code' }}</span>
              </div>
            </div>
            <div class="col client">
              <span class="v-name" style="color:rgba(255,255,255,0.85); font-weight:500;">{{ d.client_organization || '—' }}</span>
            </div>
            <div class="col date" style="color:rgba(255,255,255,0.5); font-size:12px;">{{ formatDate(d.updated_at || d.created_at) }}</div>
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

    <!-- Drawers -->
    <HandoverDetailsDrawer :is-open="!!selectedDraftId" :dpr="draftDprs.find(d => d.id === selectedDraftId)" :is-admin-mode="isAdmin"
      @close="selectedDraftId = null" @edit="editDpr" @generate="generatePdf" @deleted="() => { selectedDraftId = null; fetchData(); }" />
    <HandoverDetailsDrawer :is-open="!!selectedPendingId" :dpr="pendingDprs.find(d => d.id === selectedPendingId)" :is-admin-mode="true"
      @close="selectedPendingId = null" @generate="generatePdf" @approve="approveDpr" @reject="rejectDpr" @edit="editDpr" />
    <HandoverDetailsDrawer :is-open="!!selectedRejectedId" :dpr="rejectedDprs.find(d => d.id === selectedRejectedId)" :is-admin-mode="isAdmin"
      @close="selectedRejectedId = null" @edit="editDpr" @generate="generatePdf" @deleted="() => { selectedRejectedId = null; fetchData(); }" />
    <HandoverDetailsDrawer :is-open="!!selectedApprovedId" :dpr="approvedDprs.find(d => d.id === selectedApprovedId)" :is-admin-mode="isAdmin"
      @close="selectedApprovedId = null" @edit="editDpr" @generate="generatePdf" @deleted="() => { selectedApprovedId = null; fetchData(); }" />

    <!-- Rejection Modal -->
    <RejectionModal 
      :is-open="isRejectionModalOpen" 
      :is-submitting="isRejecting"
      @close="isRejectionModalOpen = false"
      @confirm="handleRejectionConfirm"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import {
  LayoutGrid, FileText, CheckCircle, Plus, ArrowRight, TrendingUp, PieChart,
  Clock, Layers, Activity, Calendar, Pencil
} from 'lucide-vue-next'
import AnimatedNumber from '../../components/ui/AnimatedNumber.vue'
import HandoverDetailsDrawer from '../../components/documents/HandoverDetailsDrawer.vue'
import RejectionModal from '../../components/documents/RejectionModal.vue'
import { generateHandoverPdf } from '../../utils/handoverPdfGenerator'

const route = useRoute()
const router = useRouter()
const isAdmin = computed(() => route.path.startsWith('/admin'))
const activeTab = ref(route.query.tab || 'dashboard')
const userProfile = ref({})

const draftDprs = ref([])
const pendingDprs = ref([])
const approvedDprs = ref([])
const rejectedDprs = ref([])
const draftSearch = ref('')
const pendingSearch = ref('')
const approvedSearch = ref('')
const rejectedSearch = ref('')
const selectedDraftId = ref(null)
const selectedPendingId = ref(null)
const selectedApprovedId = ref(null)
const selectedRejectedId = ref(null)

const getToken = () => isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')

const filteredDrafts = computed(() => {
  let list = draftDprs.value
  if (draftSearch.value) { const q = draftSearch.value.toLowerCase(); list = list.filter(d => (d.project_name || '').toLowerCase().includes(q) || (d.client_organization || '').toLowerCase().includes(q) || (d.project_code || '').toLowerCase().includes(q)) }
  return list
})
const filteredPending = computed(() => {
  let list = pendingDprs.value
  if (pendingSearch.value) { const q = pendingSearch.value.toLowerCase(); list = list.filter(d => (d.project_name || '').toLowerCase().includes(q) || (d.client_organization || '').toLowerCase().includes(q)) }
  return list
})
const filteredApproved = computed(() => {
  let list = approvedDprs.value
  if (approvedSearch.value) { const q = approvedSearch.value.toLowerCase(); list = list.filter(d => (d.project_name || '').toLowerCase().includes(q) || (d.client_organization || '').toLowerCase().includes(q)) }
  return list
})
const filteredRejected = computed(() => {
  let list = rejectedDprs.value
  if (rejectedSearch.value) { const q = rejectedSearch.value.toLowerCase(); list = list.filter(d => (d.project_name || '').toLowerCase().includes(q) || (d.client_organization || '').toLowerCase().includes(q)) }
  return list
})

const formatDate = (d) => { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
const todayFormatted = computed(() => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))

const formatCurrency = (n) => { if (n == null || isNaN(n)) return '0.00'; return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
const formatCompact = (n) => { if (!n) return '0'; if (n >= 10000000) return (n / 10000000).toFixed(1) + 'Cr'; if (n >= 100000) return (n / 100000).toFixed(1) + 'L'; if (n >= 1000) return (n / 1000).toFixed(1) + 'K'; return String(Math.round(n)) }

// Stats
const allDprs = computed(() => [...draftDprs.value, ...pendingDprs.value, ...approvedDprs.value, ...rejectedDprs.value])
const stats = computed(() => ({ total: allDprs.value.length, drafts: draftDprs.value.length, approved: approvedDprs.value.length, pending: pendingDprs.value.length, rejected: rejectedDprs.value.length }))

// Financial totals
const totalDraftValue = computed(() => draftDprs.value.reduce((s, d) => s + (d.total_project_value || 0), 0))
const totalApprovedValue = computed(() => approvedDprs.value.reduce((s, d) => s + (d.total_project_value || 0), 0))
const totalProjectValue = computed(() => allDprs.value.reduce((s, d) => s + (d.total_project_value || 0), 0))

// Approval Rate
const approvalRate = computed(() => {
  const total = allDprs.value.length
  if (total === 0) return { rate: 100, fraction: 1.0, text: '100%' }
  const fraction = approvedDprs.value.length / total
  return { rate: Math.round(fraction * 100), fraction, text: `${Math.round(fraction * 100)}%` }
})

// Recent items
const recentDrafts = computed(() => draftDprs.value.slice(0, 4))
const recentAll = computed(() => [...allDprs.value].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 5))
const latestDpr = computed(() => recentAll.value[0] || null)
const latestDraft = computed(() => draftDprs.value.slice().sort((a,b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))[0] || null)

const latestDprStatusClass = computed(() => {
  if (!latestDpr.value) return 'emerald'
  const s = latestDpr.value.status
  if (s === 'Approved') return 'emerald'
  if (s === 'Draft' || s === 'Rejected') return 'purple'
  return 'amber'
})

// Recent Creators (unique by name)
const recentCreators = computed(() => {
  const seen = new Set()
  return allDprs.value.filter(d => {
    const name = d.created_by?.full_name
    if (!name || seen.has(name)) return false
    seen.add(name); return true
  }).slice(0, 5).map(d => ({
    name: d.created_by.full_name,
    initials: d.created_by.full_name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  }))
})

// Utility for local YYYY-MM-DD
const toLocalISO = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Area Chart SVG paths (based on real data per day)
const areaChartData = computed(() => {
  const today = new Date()
  let days = []
  for (let i = 6; i >= 0; i--) { 
    let d = new Date(today); d.setDate(d.getDate() - i)
    days.push(toLocalISO(d)) 
  }
  return days.map(dateStr => {
    let approved = 0, draft = 0, pending = 0
    allDprs.value.forEach(dpr => {
      if (!dpr.created_at) return
      if (toLocalISO(dpr.created_at) <= dateStr) {
        if (dpr.status === 'Approved') approved += (dpr.total_project_value || 0)
        else if (dpr.status === 'Draft') draft += (dpr.total_project_value || 0)
        else pending += (dpr.total_project_value || 0)
      }
    })
    return { approved, draft, pending }
  })
})

const makePath = (vals, maxVal, w, h) => {
  if (vals.length === 0) return { line: '', area: '' }
  const mx = maxVal || 1
  const points = vals.map((v, i) => ({ x: (i / (vals.length - 1)) * w, y: h - (v / mx) * (h - 10) }))
  const line = 'M' + points.map(p => `${p.x},${p.y}`).join(' L')
  const area = line + ` L${w},${h} L0,${h} Z`
  return { line, area }
}

const chartMax = computed(() => {
  let m = 1; areaChartData.value.forEach(d => { m = Math.max(m, d.approved, d.draft, d.pending) }); return m * 1.2
})
const areaPath1 = computed(() => makePath(areaChartData.value.map(d => d.approved), chartMax.value, 400, 120).area)
const areaLine1 = computed(() => makePath(areaChartData.value.map(d => d.approved), chartMax.value, 400, 120).line)
const areaPath2 = computed(() => makePath(areaChartData.value.map(d => d.draft), chartMax.value, 400, 120).area)
const areaLine2 = computed(() => makePath(areaChartData.value.map(d => d.draft), chartMax.value, 400, 120).line)
const areaPath3 = computed(() => makePath(areaChartData.value.map(d => d.pending), chartMax.value, 400, 120).area)
const areaLine3 = computed(() => makePath(areaChartData.value.map(d => d.pending), chartMax.value, 400, 120).line)

// Weekly Activity for analytics bars
const weeklyActivity = computed(() => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()
  let last7 = []
  for (let i = 6; i >= 0; i--) {
    let d = new Date(today); d.setDate(d.getDate() - i)
    last7.push({ dateStr: toLocalISO(d), dayName: dayNames[d.getDay()], drafts: 0, approved: 0 })
  }
  allDprs.value.forEach(dpr => {
    if (!dpr.created_at) return
    const dprDate = toLocalISO(dpr.created_at)
    const dayObj = last7.find(d => d.dateStr === dprDate)
    if (dayObj) { if (dpr.status === 'Approved') dayObj.approved++; else dayObj.drafts++ }
  })
  const maxC = Math.max(...last7.map(d => d.drafts + d.approved), 1)
  return last7.map((d, i) => ({
    dayName: d.dayName, highlight: i === 6,
    h1: Math.max(Math.round((d.drafts / maxC) * 60), d.drafts > 0 ? 20 : 0),
    h2: Math.max(Math.round((d.approved / maxC) * 60), d.approved > 0 ? 20 : 0),
    v1: d.drafts > 0 ? d.drafts.toString() : '', v2: d.approved > 0 ? d.approved.toString() : ''
  }))
})

const analyticsDateRange = computed(() => {
  const today = new Date(); const d = new Date(today); d.setDate(d.getDate() - 6)
  return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'long' })} - ${today.getDate()} ${today.toLocaleDateString('en-US', { month: 'long' })}`
})

const currentMonth = computed(() => new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
const nextMonth = computed(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toLocaleDateString('en-US', { month: 'long' }) })
const prevMonth = computed(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toLocaleDateString('en-US', { month: 'long' }) })

// Actions
const openItem = (item) => {
  if (item.status === 'Draft') selectedDraftId.value = item.id
  else if (item.status === 'Approved') selectedApprovedId.value = item.id
  else if (item.status === 'Rejected') selectedRejectedId.value = item.id
  else if (item.status === 'Internal Review') selectedPendingId.value = item.id
}
const editDpr = (dpr) => { router.push(`${isAdmin.value ? '/admin' : '/user'}/documents/handover/new?edit=${dpr.id}`) }
const approveDpr = async (dpr) => { await updateStatus(dpr.id, 'Approved'); selectedPendingId.value = null }

const isRejectionModalOpen = ref(false)
const isRejecting = ref(false)
const dprToReject = ref(null)

const rejectDpr = (dpr) => {
  dprToReject.value = dpr
  isRejectionModalOpen.value = true
}

const handleRejectionConfirm = async (reason) => {
  if (!dprToReject.value) return
  isRejecting.value = true
  try {
    await updateStatus(dprToReject.value.id, 'Rejected', reason)
    isRejectionModalOpen.value = false
    selectedPendingId.value = null
  } finally {
    isRejecting.value = false
    dprToReject.value = null
  }
}
const generatePdf = async (dpr) => {
  try {
    const token = isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
    const res = await axios.get(`http://localhost:8000/api/handover/${dpr.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    generateHandoverPdf(res.data)
  } catch (e) {
    console.error('Failed to fetch full Handover. Falling back to basic list data.', e)
    generateHandoverPdf(dpr)
  }
}
const updateStatus = async (id, status, reason = null) => {
  try {
    const dpr = allDprs.value.find(d => d.id === id)
    if (!dpr) return
    const payload = { ...dpr, status }
    if (reason) {
      payload.rejection_reason = reason
    }
    // Clean empty strings to null for UUID and date fields
    ;['start_date', 'completion_date', 'created_by_id', 'project_manager_id'].forEach(key => {
      if (payload[key] === '') payload[key] = null
    })
    
    await axios.put(`http://localhost:8000/api/handover/${id}`, payload, { headers: { Authorization: `Bearer ${getToken()}` } })
    await fetchData()
  } catch (e) {
    console.error('Status update failed:', e)
  }
}

const fetchData = async () => {
  const token = getToken(); if (!token) return
  await Promise.allSettled([
    axios.get('http://localhost:8000/api/handover/?status_filter=Draft', { headers: { Authorization: `Bearer ${token}` } }).then(r => draftDprs.value = r.data).catch(() => {}),
    axios.get('http://localhost:8000/api/handover/?status_filter=Approved', { headers: { Authorization: `Bearer ${token}` } }).then(r => approvedDprs.value = r.data).catch(() => {}),
    axios.get('http://localhost:8000/api/handover/?status_filter=Rejected', { headers: { Authorization: `Bearer ${token}` } }).then(r => rejectedDprs.value = r.data).catch(() => {}),
    axios.get('http://localhost:8000/api/handover/?status_filter=Internal Review', { headers: { Authorization: `Bearer ${token}` } }).then(r => pendingDprs.value = r.data).catch(() => {})
  ])
}

let poll = null
onMounted(async () => {
  const token = getToken()
  if (token) {
    try { const res = await axios.get('http://localhost:8000/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }); userProfile.value = res.data } catch (e) {}
    await fetchData()
    poll = setInterval(fetchData, 3000)
  }
})
onUnmounted(() => { if (poll) clearInterval(poll) })
</script>

<style scoped>
/* ═══════════════════════════════════════════
   DPR DASHBOARD — COINVEX REPLICA
   Premium dark, 3-column grid, advanced graphics
   ═══════════════════════════════════════════ */

.dpr-page {
  padding: 0 0 40px;
  min-height: 100%;
  background: transparent;
  color: #fff;
  font-family: 'Inter', -apple-system, sans-serif;
}

/* ─── HEADER & PRIMARY TABS ─── */
.dpr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.tabs-dock {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 30px;
  padding: 6px;
  align-items: center;
  backdrop-filter: blur(20px);
}
.n-tab {
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.5);
  font-size: 13px;
  font-weight: 500;
  padding: 6px 18px;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  gap: 8px;
}
.n-tab:hover { color: #fff; background: rgba(255,255,255,0.05); }
.n-tab.active {
  background: rgba(74, 222, 128, 0.1);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.2);
  box-shadow: 0 0 16px rgba(74, 222, 128, 0.1);
}
.tab-icon { opacity: 0.8; }
.tab-sep { width: 1px; height: 16px; background: rgba(255,255,255,0.1); margin: 0 4px; }

/* ─── ANIMATIONS ─── */
.slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes slideUp { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
/* Card Animations */
.cv-card {
  background: #121214;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.04);
  padding: 24px;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s;
}
.cv-card:hover { border-color: rgba(255,255,255,0.1); transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.4); }

.ani-1 { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.1s; }
.ani-2 { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.2s; }
.ani-3 { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.3s; }
.ani-4 { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.4s; }
.ani-5 { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.5s; }
@keyframes cardIn { 0% { opacity: 0; transform: translateY(16px) scale(0.98); } 100% { opacity: 1; transform: translateY(0) scale(1); } }

/* ─── TITLE ROW ─── */
.cv-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
}
.cv-h1 {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  margin: 0;
  letter-spacing: -0.5px;
}
.cv-date {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  margin: 4px 0 0;
}
.cv-chips {
  display: flex;
  gap: 12px;
}
.cv-chip {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 6px 14px;
  color: rgba(255,255,255,0.7);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.cv-chip:hover { border-color: rgba(255,255,255,0.3); color: #fff; }
.cv-chip.active {
  background: #a3e635;
  color: #000;
  border: none;
  font-weight: 600;
}

/* ─── COINVEX GRID ─── */
.cv-grid {
  display: grid;
  grid-template-columns: 300px 1fr 280px;
  gap: 20px;
}

/* Common Card */
.cv-card {
  background: rgba(18, 18, 20, 0.7);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 24px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.06);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease, border-color 0.4s ease;
}
.cv-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  border-color: rgba(255,255,255,0.12);
}
.cv-card-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 16px;
}

/* ─── LEFT COL: PORTFOLIO ─── */
.cv-col-left { display: flex; flex-direction: column; gap: 20px; }

.cv-portfolio { padding: 24px 20px; }
.cv-health-metrics {
  display: flex;
  gap: 12px;
  margin-bottom: 28px;
}
.cv-health-item {
  flex: 1;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.3s;
}
.cv-health-item:hover {
  background: rgba(255,255,255,0.06);
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.1);
}
.cv-hi-icon {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  display: flex; align-items: center; justify-content: center;
}

.cv-actions {
  display: flex;
  justify-content: space-around;
  margin-bottom: 32px;
}
.cv-action-circle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  text-decoration: none;
}
.cv-action-circle:hover .cv-ac-icon { transform: scale(1.05); background: rgba(255,255,255,0.15); }
.cv-ac-icon {
  width: 48px; height: 48px;
  border-radius: 50%;
  background: #1c1c1e;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: all 0.3s;
}
.cv-action-circle span { font-size: 11px; color: rgba(255,255,255,0.6); }

.cv-balance-section {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 20px;
}
.cv-bal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.cv-bal-title { font-size: 13px; color: rgba(255,255,255,0.8); }
.cv-bal-icon { color: rgba(255,255,255,0.4); }
.cv-bal-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.cv-bal-item { font-size: 11px; }
.cv-bal-label { color: rgba(255,255,255,0.4); }
.cv-bal-item strong { color: #fff; margin-left: 4px; }
.cv-progress-track {
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
  display: flex;
}
.cv-progress-fill {
  height: 100%;
  background: #a3e635;
  border-radius: 4px;
}

/* Gradient Status Cards */
.cv-status-card {
  padding: 20px;
  cursor: pointer;
  transition: transform 0.2s;
}
.cv-status-card:hover { transform: translateY(-4px); }
.cv-status-card.green {
  background: linear-gradient(145deg, #121214 40%, rgba(74, 222, 128, 0.15) 100%);
  border: 1px solid rgba(74, 222, 128, 0.2);
}
.cv-status-card.purple {
  background: linear-gradient(145deg, #121214 40%, rgba(167, 139, 250, 0.15) 100%);
  border: 1px solid rgba(167, 139, 250, 0.2);
}
.cv-sc-top {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
.cv-sc-icon {
  width: 32px; height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
}
.green .cv-sc-icon { background: rgba(74, 222, 128, 0.1); color: #4ade80; }
.purple .cv-sc-icon { background: rgba(167, 139, 250, 0.1); color: #a78bfa; }
.cv-sc-type { font-size: 13px; font-weight: 500; flex: 1; }
.cv-dots { background: transparent; border: none; color: rgba(255,255,255,0.5); font-size: 16px; cursor: pointer; }

.cv-sc-val { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
.cv-sc-bottom { display: flex; justify-content: space-between; align-items: center; }
.cv-sc-change {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;
  background: rgba(255,255,255,0.05);
}
.cv-sc-tag { font-size: 11px; color: rgba(255,255,255,0.4); }

/* ─── CENTER COL: GRAPHICS ─── */
.cv-col-center { display: flex; flex-direction: column; gap: 20px; }

.cv-cf-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}
.cv-cf-sub { font-size: 12px; color: rgba(255,255,255,0.4); margin: 0 0 8px; }
.cv-cf-amount { font-size: 32px; font-weight: 700; color: #fff; }
.cv-corner-btn {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.cv-corner-btn:hover { background: rgba(255,255,255,0.05); }

/* SVG Area Chart */
.cv-area-chart-wrap { position: relative; height: 180px; width: 100%; }
.cv-area-chart { width: 100%; height: 140px; }
.cv-chart-label {
  fill: rgba(255,255,255,0.5);
  font-size: 11px;
  font-family: 'Inter', -apple-system, sans-serif;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.cv-chart-legend {
  display: flex; justify-content: flex-end; gap: 16px; margin-top: 10px;
}
.cv-leg { display: flex; align-items: center; gap: 6px; font-size: 10px; color: rgba(255,255,255,0.5); }
.cv-leg-dot { width: 8px; height: 8px; border-radius: 2px; }

/* SVG Animation */
.area-anim { animation: areaReveal 1s ease-out forwards; clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); }
.line-anim { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: lineDraw 1.5s ease-out forwards; }
.d2 { animation-delay: 0.2s; } .d3 { animation-delay: 0.4s; }
@keyframes areaReveal { to { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); } }
@keyframes lineDraw { to { stroke-dashoffset: 0; } }

/* Analytics Bar Grid */
.cv-analytics { flex: 1; }
.cv-bar-grid {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 140px;
  padding: 0 10px;
  margin-top: 20px;
}
.cv-bar-col {
  display: flex; flex-direction: column; align-items: center; gap: 12px; height: 100%;
}
.cv-bar-stack {
  flex: 1; display: flex; flex-direction: column; justify-content: flex-end; gap: 4px; width: 40px;
}
.cv-bar-block {
  width: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: center;
  animation: barPop 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  transform-origin: bottom;
}
.cv-bar-block.b1 { background: #1e3a8a; } /* dark blue */
.cv-bar-block.b2 { background: #a3e635; } /* green */
.cv-bv { font-size: 9px; color: rgba(0,0,0,0.6); font-weight: 700; }
.b1 .cv-bv { color: rgba(255,255,255,0.6); }
@keyframes barPop { 0% { transform: scaleY(0); } 100% { transform: scaleY(1); } }
.cv-bar-day { font-size: 11px; color: rgba(255,255,255,0.3); }
.cv-bar-day.active { color: #fff; font-weight: 600; }

/* ─── RIGHT COL: SIDEBAR ─── */
.cv-col-right { display: flex; flex-direction: column; gap: 20px; }

/* Promo Card */
.cv-promo { padding: 32px 24px; text-align: center; position: relative; border: none; }
.cv-promo-mesh {
  position: absolute; inset: 0;
  background: radial-gradient(circle at 100% 0%, rgba(163, 230, 53, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 0% 100%, rgba(56, 189, 248, 0.15) 0%, transparent 50%);
  z-index: 0;
  pointer-events: none;
}
.cv-promo-title { font-size: 20px; font-weight: 700; margin: 0 0 12px; position: relative; z-index: 1; }
.cv-promo-sub { font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1.5; margin: 0 0 24px; position: relative; z-index: 1; }
.cv-start-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px; border-radius: 30px;
  background: #a3e635; color: #000; font-weight: 700; font-size: 13px;
  text-decoration: none; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative; z-index: 1;
}
.cv-start-btn:hover { background: #bef264; transform: translateY(-2px); box-shadow: 0 4px 15px rgba(163, 230, 53, 0.3); }

/* Quick Creators */
.cv-q-header { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 600; margin-bottom: 20px; }
.cv-plus-btn { background: transparent; border: none; color: rgba(255,255,255,0.5); cursor: pointer; }
.cv-avatars { display: flex; margin-bottom: 24px; }
.cv-av {
  width: 40px; height: 40px; border-radius: 50%;
  background: #27272a; border: 2px solid #121214;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #fff;
  margin-left: -10px; position: relative;
  animation: avIn 0.4s both;
}
.cv-av:first-child { margin-left: 0; background: #a3e635; color: #000; z-index: 5; }
.cv-av:nth-child(2) { background: #a78bfa; z-index: 4; }
.cv-av:nth-child(3) { background: #38bdf8; z-index: 3; }
.cv-av:nth-child(4) { background: #fbbf24; z-index: 2; }
.cv-av:nth-child(5) { background: #f472b6; z-index: 1; }
@keyframes avIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

.cv-recent-items { display: flex; flex-direction: column; gap: 16px; }
.cv-ri { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
.cv-ri-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(163, 230, 53, 0.1); color: #a3e635;
  display: flex; align-items: center; justify-content: center;
}
.cv-ri-info { flex: 1; margin: 0 12px; min-width: 0; }
.cv-ri-name { display: block; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cv-ri-sub { display: block; font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }
.cv-ri-action { color: rgba(255,255,255,0.3); transition: color 0.2s; }
.cv-ri:hover .cv-ri-action { color: #fff; }

/* Transfer */
.cv-transfer { padding: 24px; }
.cv-tf-top { display: flex; align-items: center; margin-bottom: 24px; }
.cv-tf-ref { font-size: 14px; font-weight: 600; }
.cv-tf-type { font-size: 12px; color: rgba(255,255,255,0.4); margin-left: 8px; flex: 1; }
.cv-pill-btn {
  background: rgba(56, 189, 248, 0.1); color: #38bdf8;
  border: none; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 600;
  cursor: pointer;
}
.cv-tf-amount-row {
  display: flex; flex-direction: column; gap: 16px;
  background: rgba(255,255,255,0.04); padding: 18px; border-radius: 20px; margin-bottom: 20px;
  border: 1px solid rgba(255,255,255,0.06);
}
.tf-stat-box { width: 100%; }
.cv-tf-label { display: block; font-size: 10px; color: rgba(255,255,255,0.4); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; }
.cv-tf-amount { font-size: 26px; font-weight: 800; color: #fff; letter-spacing: -0.8px; }
.from-box { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px; margin-top: 4px; }
.cv-tf-tag-main { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); display: block; line-height: 1.4; }
.cv-transfer-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px; border-radius: 16px;
  background: #a3e635; color: #000; font-size: 13px; font-weight: 700;
  text-decoration: none; transition: all 0.2s;
}
.cv-transfer-btn:hover { background: #bef264; }

/* ─── DRAFT & APPROVED TABLE TABS ─── */
/* ─── ANIMATIONS & SPECIAL EFFECTS ─── */
.slide-up-fade { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes slideUpFade { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }

.pulse-glow { animation: pulseGlow 2s infinite; }
@keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); } 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); } }

.float-anim { animation: floatAnim 4s ease-in-out infinite; }
@keyframes floatAnim { 0% { transform: translateY(0); } 50% { transform: translateY(-4px); } 100% { transform: translateY(0); } }

/* ── MODERN TABLE LAYOUT FROM SLA DASHBOARD ── */
.table-container-modern { display: flex; flex-direction: column; gap: 16px; animation: cardEnter 0.4s ease both; }
.header-actions-modern { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; }
.title-group h3 { font-size: 18px; font-weight: 600; color: white; margin: 0; letter-spacing: -0.02em; }
.title-group p { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 4px; }

.pm-table-modern { display: flex; flex-direction: column; width: 100%; border-radius: 12px;}
.pm-row-modern {
    display: grid; align-items: center; padding: 12px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;
}
.pm-row-modern.header {
    padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); background: transparent;
    font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.05em;
    padding-left: 12px; padding-right: 12px;
}
.pm-row-modern.item {
    font-size: 14px; border-radius: 0; cursor: pointer; animation: rowSlide 0.4s ease both;
    padding-left: 12px; padding-right: 12px; background: rgba(255,255,255,0.01);
}
.pm-row-modern.item:hover { background: rgba(255,255,255,0.05); }
.pm-row-modern.item:last-child { border-bottom: none; }

.status-badge {
    display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 4px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05);
    font-size: 9px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase;
}
.status-badge.compact { padding: 3px 8px; font-size: 10px; border-radius: 6px; }
.status-badge.draft { background: rgba(161, 161, 170, 0.1); border-color: rgba(161, 161, 170, 0.2); color: #a1a1aa; }
.status-badge.pending { background: rgba(249, 115, 22, 0.1); color: #f97316; border-color: rgba(249, 115, 22, 0.2); }
.status-badge.approved { background: rgba(74, 222, 128, 0.1); color: #4ade80; border-color: rgba(74, 222, 128, 0.2); }

.col.client { display: flex; flex-direction: column; }
.v-name { font-size: 14px; font-weight: 600; color: #f5f5f7; }
.v-ref { font-size: 11px; color: rgba(255,255,255,0.4); font-family: 'SF Mono', monospace; text-transform: capitalize; margin-top:2px; }

.pill { border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: capitalize; }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; color: rgba(255,255,255,0.4); }
.empty-rows h4 { margin-top: 16px; font-size: 15px; color: rgba(255,255,255,0.4); }
.empty-rows p { font-size: 12px; color: rgba(255,255,255,0.25); margin-top: 4px; }

@keyframes rowSlide {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

.search-box {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  padding: 6px 12px; border-radius: 8px;
}
.search-box input { background: transparent; border: none; outline: none; color: white; font-size: 12px; width: 160px; }
.search-box input::placeholder { color: rgba(255,255,255,0.3); }

/* Quick Creators Enhanced */
.cv-q-bg-glow {
  position: absolute; top: -50px; right: -50px; width: 150px; height: 150px;
  background: radial-gradient(circle, rgba(167, 139, 250, 0.15) 0%, transparent 70%);
  border-radius: 50%; pointer-events: none;
}
.modern-ri { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); border: none; border-radius: 8px; padding: 10px; margin-bottom: 4px; display: flex; align-items: center; gap: 12px; cursor: pointer; }
.modern-ri:hover { background: rgba(255,255,255,0.06); transform: translateX(4px); }
.cv-ri-avatar { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); }
.cv-ri-info { display: flex; flex-direction: column; flex: 1; }
.cv-ri-name { font-size: 13px; font-weight: 600; color: #fff; }
.cv-ri-sub { font-size: 11px; color: rgba(255,255,255,0.4); text-transform: capitalize; margin-top: 2px; }
.cv-ri-action-glow {
  opacity: 0; transform: translateX(-10px); color: #4ade80; transition: all 0.3s;
}
.modern-ri:hover .cv-ri-action-glow { opacity: 1; transform: translateX(0); }

/* Enhanced Cashflow */
.enhanced-cashflow { position: relative; overflow: hidden; border: 1px solid rgba(16, 185, 129, 0.2); transition: border-color 0.4s; }
.enhanced-cashflow.emerald { border-color: rgba(16, 185, 129, 0.3); }
.enhanced-cashflow.amber { border-color: rgba(251, 191, 36, 0.3); }
.enhanced-cashflow.purple { border-color: rgba(167, 139, 250, 0.3); }

.cv-bg-glow-emerald { position: absolute; inset: -50px; background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%); border-radius: 50%; pointer-events: none; z-index: 0; }
.cv-bg-glow-amber { position: absolute; inset: -50px; background: radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, transparent 70%); border-radius: 50%; pointer-events: none; z-index: 0; }
.cv-bg-glow-purple { position: absolute; inset: -50px; background: radial-gradient(circle, rgba(167, 139, 250, 0.2) 0%, transparent 70%); border-radius: 50%; pointer-events: none; z-index: 0; }

.enhanced-cashflow.emerald .cv-cf-amount { color: #10b981; font-size: 32px; font-weight: 800; letter-spacing: -1px; text-shadow: 0 0 20px rgba(16, 185, 129, 0.4); }
.enhanced-cashflow.amber .cv-cf-amount { color: #fbbf24; font-size: 32px; font-weight: 800; letter-spacing: -1px; text-shadow: 0 0 20px rgba(251, 191, 36, 0.4); }
.enhanced-cashflow.purple .cv-cf-amount { color: #a78bfa; font-size: 32px; font-weight: 800; letter-spacing: -1px; text-shadow: 0 0 20px rgba(167, 139, 250, 0.4); }

.enhanced-cashflow > div:not([class*="cv-bg-glow"]) { z-index: 1; position: relative; }

.glow-btn { box-shadow: 0 0 15px rgba(163, 230, 53, 0.3); }
.glow-btn:hover { box-shadow: 0 0 25px rgba(163, 230, 53, 0.5); transform: translateY(-2px); }
</style>
