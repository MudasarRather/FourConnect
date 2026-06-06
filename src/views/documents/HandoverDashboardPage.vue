<template>
  <div class="dpr-page">
    <!-- HEADER -->
    <header class="dpr-header">
      <div class="nav-left">
        <div class="tabs-dock">
          <button class="n-tab" :class="{ active: activeTab === 'dashboard' }" @click="setTab('dashboard')">
            <LayoutGrid :size="14" class="tab-icon"/> Dashboard
          </button>
          <div class="tab-sep"></div>
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
        <!-- Removed btn-new as requested -->
      </div>
    </header>

    <!-- ═══════════ DASHBOARD TAB — "Handover Command" ═══════════ -->
    <main class="hd-dash" v-if="activeTab === 'dashboard'" :key="'dash'">

      <!-- HERO -->
      <section class="hd-hero" v-motion v-bind="mo(0)">
        <div class="hd-hero-text">
          <div class="hd-eyebrow"><span class="hd-live-dot"></span>{{ todayFormatted }}</div>
          <h1 class="hd-title">Handover Command</h1>
          <p class="hd-sub">Welcome back<template v-if="userProfile.full_name">, <strong>{{ userProfile.full_name }}</strong></template> — here's your delivery pipeline at a glance.</p>
        </div>
        <router-link :to="newLink" class="hd-hero-cta" v-motion v-bind="mo(1)">
          <span class="hd-cta-ico"><Plus :size="18" /></span>
          <span>New Handover</span>
          <ArrowRight :size="16" class="hd-cta-arrow" />
        </router-link>
      </section>

      <!-- KPI BAND -->
      <section class="hd-kpis">
        <div class="hd-kpi k-gold" v-motion v-bind="mo(1)">
          <div class="hd-kpi-head"><span class="hd-kpi-ico"><Layers :size="16" /></span><span class="hd-kpi-chip">Portfolio</span></div>
          <div class="hd-kpi-val">₹<AnimatedNumber :value="totalProjectValue" /></div>
          <div class="hd-kpi-lbl">Total Transitioned Value</div>
          <div class="hd-kpi-spark"><i v-for="(d, i) in weeklyActivity" :key="i" :style="{ height: `${6 + d.h1 + d.h2}px`, animationDelay: `${0.4 + i * 0.06}s` }"></i></div>
        </div>
        <div class="hd-kpi k-emerald clickable" @click="setTab('approved')" v-motion v-bind="mo(2)">
          <div class="hd-kpi-head"><span class="hd-kpi-ico"><CheckCircle :size="16" /></span><span class="hd-kpi-chip">{{ stats.approved }} docs</span></div>
          <div class="hd-kpi-val">₹<AnimatedNumber :value="totalApprovedValue" /></div>
          <div class="hd-kpi-lbl">Approved &amp; Delivered</div>
        </div>
        <div class="hd-kpi k-amber clickable" @click="setTab('draft')" v-motion v-bind="mo(3)">
          <div class="hd-kpi-head"><span class="hd-kpi-ico"><FileText :size="16" /></span><span class="hd-kpi-chip">{{ stats.drafts }} docs</span></div>
          <div class="hd-kpi-val">₹<AnimatedNumber :value="totalDraftValue" /></div>
          <div class="hd-kpi-lbl">Drafts In Progress</div>
        </div>
        <div class="hd-kpi k-rate" v-motion v-bind="mo(4)">
          <div class="hd-kpi-head"><span class="hd-kpi-ico"><PieChart :size="16" /></span><span class="hd-kpi-chip">{{ stats.pending }} pending</span></div>
          <div class="hd-kpi-val"><AnimatedNumber :value="approvalRate.rate" />%</div>
          <div class="hd-kpi-lbl">Approval Rate</div>
          <div class="hd-kpi-bar"><span :style="{ width: `${approvalRate.rate}%` }"></span></div>
        </div>
      </section>

      <!-- TELEMETRY SPLIT -->
      <section class="hd-split">
        <div class="hd-panel hd-telemetry" v-motion v-bind="mo(2)">
          <div class="hd-panel-head">
            <div><h3>Transition Telemetry</h3><p>Cumulative value by status · last 7 days</p></div>
            <div class="hd-tele-meta">
              <div class="hd-tele-amount">₹{{ formatCurrency(totalProjectValue) }}</div>
              <div class="hd-tele-chip"><TrendingUp :size="11" /> {{ approvalRate.rate }}% approved</div>
            </div>
          </div>

          <div class="hd-chart-stage">
            <div class="hd-yaxis">
              <span>₹{{ formatCompact(chartMax) }}</span>
              <span>₹{{ formatCompact(chartMax / 2) }}</span>
              <span>₹0</span>
            </div>
            <div class="hd-chart-wrap">
              <div class="hd-grid"><span></span><span></span><span></span><span></span></div>
              <svg class="hd-chart" viewBox="0 0 400 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="hdG1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#34d399" stop-opacity="0.45"/><stop offset="100%" stop-color="#34d399" stop-opacity="0"/></linearGradient>
                  <linearGradient id="hdG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fbbf24" stop-opacity="0.30"/><stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/></linearGradient>
                  <linearGradient id="hdG3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fb923c" stop-opacity="0.22"/><stop offset="100%" stop-color="#fb923c" stop-opacity="0"/></linearGradient>
                  <linearGradient id="hdLine1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#6ee7b7"/></linearGradient>
                </defs>
                <path :d="areaPath3" fill="url(#hdG3)" class="area-anim d3"/>
                <path :d="areaLine3" stroke="#fb923c" stroke-width="1.6" fill="none" vector-effect="non-scaling-stroke" class="line-anim d3"/>
                <path :d="areaPath2" fill="url(#hdG2)" class="area-anim d2"/>
                <path :d="areaLine2" stroke="#fbbf24" stroke-width="1.8" fill="none" vector-effect="non-scaling-stroke" class="line-anim d2"/>
                <path :d="areaPath1" fill="url(#hdG1)" class="area-anim"/>
                <path :d="areaLine1" stroke="url(#hdLine1)" stroke-width="2.6" fill="none" vector-effect="non-scaling-stroke" class="line-anim hd-line-glow"/>
              </svg>
              <div class="hd-scan"></div>
              <div class="hd-end-dot" :style="endDot1"><span class="hd-end-core"></span><span class="hd-end-ring"></span></div>
            </div>
          </div>

          <div class="hd-xaxis">
            <span v-for="(d, i) in weeklyActivity" :key="i" :class="{ on: d.highlight }">{{ d.dayName }}</span>
          </div>

          <div class="hd-legend">
            <span class="hd-leg-pill"><i style="background:#34d399"></i>Approved · {{ stats.approved }}</span>
            <span class="hd-leg-pill"><i style="background:#fbbf24"></i>Drafts · {{ stats.drafts }}</span>
            <span class="hd-leg-pill"><i style="background:#fb923c"></i>Pending · {{ stats.pending }}</span>
          </div>
        </div>

        <div class="hd-side">
          <div class="hd-panel hd-ring" v-motion v-bind="mo(3)">
            <div class="hd-panel-head sm"><h3>Approval Rate</h3></div>
            <div class="hd-ring-wrap">
              <svg viewBox="0 0 160 160" class="hd-ring-svg">
                <defs><linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#34d399"/></linearGradient></defs>
                <circle cx="80" cy="80" r="64" class="ring-bg"/>
                <circle cx="80" cy="80" r="64" class="ring-fg" :style="{ strokeDasharray: 402.1, strokeDashoffset: 402.1 * (1 - approvalRate.fraction) }"/>
              </svg>
              <div class="hd-ring-center"><span class="hd-ring-val">{{ approvalRate.rate }}%</span><span class="hd-ring-lbl">approved</span></div>
            </div>
          </div>
          <div class="hd-panel hd-velocity" v-motion v-bind="mo(4)">
            <div class="hd-panel-head sm"><h3>Velocity</h3><span class="hd-vel-avg">{{ Math.round((stats.drafts + stats.approved) / 7 * 10) / 10 }}<small>/day</small></span></div>
            <div class="hd-vbars">
              <div class="hd-vcol" v-for="(day, i) in weeklyActivity" :key="i">
                <div class="hd-vstack">
                  <span class="hd-vb b-amber" :style="{ height: `${day.h1}px`, animationDelay: `${0.6 + i * 0.06}s` }"></span>
                  <span class="hd-vb b-emerald" :style="{ height: `${day.h2}px`, animationDelay: `${0.7 + i * 0.06}s` }"></span>
                </div>
                <span class="hd-vday" :class="{ on: day.highlight }">{{ day.dayName[0] }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ACTIVITY ROW -->
      <section class="hd-bottom">
        <div class="hd-panel hd-recent" v-motion v-bind="mo(3)">
          <div class="hd-panel-head">
            <div><h3>Recent Handovers</h3><p>Latest activity across your pipeline</p></div>
            <button class="hd-ghost" @click="setTab('approved')">View all <ArrowRight :size="13" /></button>
          </div>
          <div class="hd-rlist">
            <div class="hd-row" v-for="(item, i) in recentAll" :key="item.id || i" @click="openItem(item)" v-motion v-bind="lift(i)">
              <div class="hd-row-ico"><FileText :size="15" /></div>
              <div class="hd-row-main">
                <span class="hd-row-name">{{ item.project_name || 'Untitled Handover' }}</span>
                <span class="hd-row-sub">{{ item.client_organization || '—' }} · {{ formatDate(item.created_at) }}</span>
              </div>
              <span class="hd-row-val">₹{{ formatCompact(item.total_project_value || 0) }}</span>
              <span class="hd-pill" :class="statusClass(item.status)">{{ item.status }}</span>
              <ArrowRight :size="15" class="hd-row-arrow" />
            </div>
            <div v-if="recentAll.length === 0" class="hd-empty">No handovers yet — start your first one.</div>
          </div>
        </div>

        <div class="hd-side2">
          <div class="hd-panel hd-promo" v-motion v-bind="mo(4)">
            <div class="hd-promo-glow"></div>
            <h3>Create &amp; Deliver</h3>
            <p>Spin up a fresh project handover and close it out with a signed, branded PDF.</p>
            <router-link :to="newLink" class="hd-promo-btn">Start now <ArrowRight :size="15" /></router-link>
          </div>
          <div class="hd-panel hd-resume" v-if="latestDraft" v-motion v-bind="mo(5)">
            <div class="hd-resume-top">
              <span class="hd-resume-ref">{{ latestDraft.project_code || 'DRAFT' }}</span>
              <button class="hd-ghost sm" @click="selectedDraftId = latestDraft.id">Details</button>
            </div>
            <div class="hd-resume-label">Latest draft</div>
            <div class="hd-resume-name">{{ latestDraft.project_name || 'Untitled' }}</div>
            <div class="hd-resume-val">₹{{ formatCurrency(latestDraft.total_project_value || 0) }}</div>
            <router-link :to="(isAdmin ? '/admin' : '/user') + '/documents/handover/new?edit=' + latestDraft.id" class="hd-resume-btn">Resume draft <ArrowRight :size="15" /></router-link>
          </div>
        </div>
      </section>
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
    <!-- Pending drawer instance is shared by:
         - admins browsing /admin/...?tab=pending (need Approve/Reject buttons)
         - normal users clicking their own submitted handover from the recent list
         is-admin-mode must mirror the actual role, NOT be hardcoded true. Otherwise
         a normal user can see (and click) Approve / Reject / admin Edit on their
         own Internal-Review handover. -->
    <HandoverDetailsDrawer :is-open="!!selectedPendingId" :dpr="pendingDprs.find(d => d.id === selectedPendingId)" :is-admin-mode="isAdmin"
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import {
  LayoutGrid, FileText, CheckCircle, Plus, ArrowRight, TrendingUp, PieChart,
  Clock, Layers, Activity, Calendar, Pencil
} from 'lucide-vue-next'
import AnimatedNumber from '../../components/ui/AnimatedNumber.vue'
import HandoverDetailsDrawer from '../../components/documents/HandoverDetailsDrawer.vue'
import RejectionModal from '../../components/documents/RejectionModal.vue'
import { API } from '@/utils/api'
import { useToast } from 'vue-toastification'

// Cinematic motion language (via the globally-registered @vueuse/motion v-motion
// directive — applied on existing elements so there's no closing-tag churn and no
// CSS-transform conflict, since .cv-card's transform transition was removed).
// `mo(i)` = staggered cinematic entrance + hover lift + tap press. `lift(i)` is a
// lighter variant for list rows.
const EASE = [0.16, 1, 0.3, 1]
const mo = (i = 0) => ({
  initial: { opacity: 0, y: 28, scale: 0.985 },
  enter: { opacity: 1, y: 0, scale: 1, transition: { delay: 60 + i * 85, duration: 620, ease: EASE } },
  hovered: { y: -6, scale: 1.012, transition: { duration: 320, ease: EASE } },
  tapped: { scale: 0.985, transition: { duration: 120 } },
})
const lift = (i = 0) => ({
  initial: { opacity: 0, x: -14 },
  enter: { opacity: 1, x: 0, transition: { delay: 80 + i * 55, duration: 480, ease: EASE } },
})

const toast = useToast()

const route = useRoute()
const router = useRouter()
const isAdmin = computed(() => route.path.startsWith('/admin'))
const activeTab = ref(route.query.tab || 'dashboard')

// Tab → URL sync. Click handlers call setTab(name) which (a) updates local state
// for instant visual feedback and (b) pushes ?tab=name into the URL so the tab is
// linkable / shareable / back-button-friendly. Polling refetches every 3s, so we
// also need a watcher for when the URL changes EXTERNALLY (notification bell
// pushes `/user/documents/handover?tab=rejected`, etc.) — without this watcher,
// clicking a notification while already on this page only changed the URL and
// left activeTab stuck on the previous value.
const setTab = (name) => {
  activeTab.value = name
  router.replace({ query: { ...route.query, tab: name } }).catch(() => {})
}
watch(() => route.query.tab, (newTab) => {
  const resolved = newTab || 'dashboard'
  if (resolved !== activeTab.value) activeTab.value = resolved
})
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
const newLink = computed(() => isAdmin.value ? '/admin/documents/handover/new' : '/user/documents/handover/new')
const statusClass = (s) => {
  if (s === 'Approved') return 'ok'
  if (s === 'Rejected') return 'bad'
  if (s === 'Internal Review') return 'warn'
  return 'neutral'
}
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

// ── Telemetry chart geometry ──
const CW = 400, CH = 120
const chartPoints = (vals, maxVal) => {
  const mx = maxVal || 1, n = vals.length
  return vals.map((v, i) => ({ x: n > 1 ? (i / (n - 1)) * CW : 0, y: +(CH - 4 - (v / mx) * (CH - 16)).toFixed(2) }))
}
// Catmull-Rom → cubic-bézier smoothing so the series read as elegant curves
// instead of jagged straight segments.
const smoothD = (pts) => {
  if (!pts.length) return ''
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}
const makePath = (vals, maxVal) => {
  const pts = chartPoints(vals, maxVal)
  if (!pts.length) return { line: '', area: '' }
  const line = smoothD(pts)
  return { line, area: `${line} L${CW},${CH} L0,${CH} Z` }
}

const chartMax = computed(() => {
  let m = 1; areaChartData.value.forEach(d => { m = Math.max(m, d.approved, d.draft, d.pending) }); return m * 1.25
})
const seriesApproved = computed(() => makePath(areaChartData.value.map(d => d.approved), chartMax.value))
const seriesDraft = computed(() => makePath(areaChartData.value.map(d => d.draft), chartMax.value))
const seriesPending = computed(() => makePath(areaChartData.value.map(d => d.pending), chartMax.value))
const areaPath1 = computed(() => seriesApproved.value.area)
const areaLine1 = computed(() => seriesApproved.value.line)
const areaPath2 = computed(() => seriesDraft.value.area)
const areaLine2 = computed(() => seriesDraft.value.line)
const areaPath3 = computed(() => seriesPending.value.area)
const areaLine3 = computed(() => seriesPending.value.line)
// Endpoint of the primary (approved) series, as % for a crisp (undistorted) marker.
const endDot1 = computed(() => {
  const pts = chartPoints(areaChartData.value.map(d => d.approved), chartMax.value)
  const p = pts.length ? pts[pts.length - 1] : { x: CW, y: CH }
  return { left: `${(p.x / CW) * 100}%`, top: `${(p.y / CH) * 100}%` }
})

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
// Download the server-rendered (WeasyPrint) handover PDF. The backend owns the
// design now — the client just streams the blob and triggers a save.
const generatingId = ref(null)
const generatePdf = async (dpr) => {
  if (!dpr?.id || generatingId.value) return
  generatingId.value = dpr.id
  try {
    const res = await axios.get(`${API}/handover/${dpr.id}/export`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      responseType: 'blob'
    })
    let filename = `Handover_${(dpr.project_name || 'Document').replace(/\s+/g, '_')}.pdf`
    const cd = res.headers['content-disposition']
    const match = cd && /filename="?([^"]+)"?/.exec(cd)
    if (match) filename = match[1]
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Failed to generate handover PDF', e)
    toast.error('Could not generate the PDF. Please try again.')
  } finally {
    generatingId.value = null
  }
}
const updateStatus = async (id, status, reason = null) => {
  // Send ONLY the changed fields. The backend's PUT handler treats any nested
  // array in the body as a full overwrite (DELETE + re-INSERT for every
  // stakeholder/module/asset/etc.). Spreading the whole DPR caused one
  // nested-child validation failure to silently roll back the entire
  // transaction — including the status change — leaving the doc stuck in
  // "Internal Review". Mirror the SLA dashboard's working pattern.
  try {
    const payload = { status }
    if (reason) payload.rejection_reason = reason
    await axios.put(`${API}/handover/${id}`, payload, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    await fetchData()
    if (status === 'Rejected') toast.success('Handover rejected — creator notified.')
    else if (status === 'Approved') toast.success('Handover approved.')
  } catch (e) {
    console.error('Status update failed:', e)
    const detail = e?.response?.data?.detail || e?.message || 'Unknown error'
    toast.error(`Failed to update handover status: ${detail}`)
  }
}

// The list endpoint returns a JSON array, but defend against any non-array body
// (an empty/garbled 200 under the single-connection backend, an error envelope,
// or a future paginated {items:[]} shape) so the financial-total computeds
// (.reduce / .find / .sort) can never throw and white-screen the dashboard.
const asArray = (d) => Array.isArray(d) ? d : (Array.isArray(d?.items) ? d.items : [])

// Single in-flight guard: under the backend's single-connection (StaticPool) model,
// overlapping polls queue up and stall the UI. Never start a fetch while one is
// running — this was a major cause of the page feeling slow under the old 3s poll.
let fetchInFlight = false
const fetchData = async () => {
  const token = getToken(); if (!token || fetchInFlight) return
  fetchInFlight = true
  try {
    await Promise.allSettled([
      axios.get(`${API}/handover/?status_filter=Draft`, { headers: { Authorization: `Bearer ${token}` } }).then(r => draftDprs.value = asArray(r.data)).catch(() => {}),
      axios.get(`${API}/handover/?status_filter=Approved`, { headers: { Authorization: `Bearer ${token}` } }).then(r => approvedDprs.value = asArray(r.data)).catch(() => {}),
      axios.get(`${API}/handover/?status_filter=Rejected`, { headers: { Authorization: `Bearer ${token}` } }).then(r => rejectedDprs.value = asArray(r.data)).catch(() => {}),
      axios.get(`${API}/handover/?status_filter=Internal Review`, { headers: { Authorization: `Bearer ${token}` } }).then(r => pendingDprs.value = asArray(r.data)).catch(() => {})
    ])
  } finally {
    fetchInFlight = false
  }
}

// Poll every 20s and ONLY while the tab is visible — the old 3s always-on poll
// hammered four endpoints + re-ran the whole chart computed-chain ~20×/min even in
// a background tab, which is what made the page feel heavy. Coming back to the tab
// refetches immediately so data is never stale on focus.
let poll = null
const POLL_MS = 20000
const tick = () => { if (document.visibilityState === 'visible') fetchData() }
const onVisible = () => { if (document.visibilityState === 'visible') fetchData() }
onMounted(async () => {
  const token = getToken()
  if (token) {
    try { const res = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }); userProfile.value = res.data } catch (e) {}
    await fetchData()
    poll = setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', onVisible)
  }
})
onUnmounted(() => {
  if (poll) clearInterval(poll)
  document.removeEventListener('visibilitychange', onVisible)
})
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
  position: relative;
  isolation: isolate;
}
/* Cinematic ambient aura — slow-drifting warm light pools behind everything.
   Pure CSS, GPU-friendly (transform/opacity only), respects reduced-motion. */
.dpr-page::before {
  content: '';
  position: fixed;
  inset: -20vmax;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(38vmax 38vmax at 18% 12%, rgba(245, 158, 11, 0.12), transparent 60%),
    radial-gradient(32vmax 32vmax at 86% 22%, rgba(251, 146, 60, 0.10), transparent 60%),
    radial-gradient(40vmax 40vmax at 70% 96%, rgba(74, 222, 128, 0.06), transparent 62%);
  filter: blur(8px);
  animation: auraDrift 26s ease-in-out infinite alternate;
}
@keyframes auraDrift {
  0%   { transform: translate3d(0, 0, 0) scale(1); }
  50%  { transform: translate3d(2.5%, -2%, 0) scale(1.06); }
  100% { transform: translate3d(-2%, 2.5%, 0) scale(1.02); }
}
[data-theme="light"] .dpr-page::before {
  background:
    radial-gradient(38vmax 38vmax at 18% 12%, rgba(245, 158, 11, 0.16), transparent 60%),
    radial-gradient(32vmax 32vmax at 86% 22%, rgba(251, 146, 60, 0.14), transparent 60%),
    radial-gradient(40vmax 40vmax at 70% 96%, rgba(217, 119, 6, 0.08), transparent 62%);
}
@media (prefers-reduced-motion: reduce) {
  .dpr-page::before { animation: none; }
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
  transition: box-shadow 0.3s, border-color 0.3s;
}
.cv-card:hover { border-color: rgba(255,255,255,0.1); box-shadow: 0 12px 24px rgba(0,0,0,0.4); }

.ani-1 { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.1s; }
.ani-2 { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.2s; }
.ani-3 { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.3s; }
.ani-4 { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.4s; }
.ani-5 { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.5s; }
@keyframes cardIn { 0% { opacity: 0; transform: translateY(16px) scale(0.98); } 100% { opacity: 1; transform: translateY(0) scale(1); } }

/* ════════════════════════════════════════════════════════════════════
   "HANDOVER COMMAND" — new dashboard layout (hd-*). Dark-first + light.
   Motion is owned by the v-motion directive; CSS here is layout + skin.
   ════════════════════════════════════════════════════════════════════ */
.hd-dash { display: flex; flex-direction: column; gap: 22px; padding-top: 4px; }

/* shared panel skin */
.hd-panel {
  background: rgba(20, 20, 23, 0.72);
  backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 22px; padding: 22px; position: relative; overflow: hidden;
  transition: box-shadow .4s ease, border-color .4s ease;
}
.hd-panel:hover { border-color: rgba(255, 255, 255, 0.12); box-shadow: 0 22px 48px rgba(0,0,0,0.45); }
.hd-panel-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
.hd-panel-head.sm { margin-bottom: 12px; }
.hd-panel-head h3 { font-size: 16px; font-weight: 700; color: #fff; margin: 0; letter-spacing: -0.01em; }
.hd-panel-head p { font-size: 12px; color: rgba(255,255,255,0.45); margin: 4px 0 0; }

/* HERO */
.hd-hero { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; flex-wrap: wrap; }
.hd-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase; color: #d8a23a; margin-bottom: 10px; }
.hd-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #34d399; box-shadow: 0 0 0 0 rgba(52,211,153,0.6); animation: hdPulse 2.2s infinite; }
@keyframes hdPulse { 0% { box-shadow: 0 0 0 0 rgba(52,211,153,0.55); } 70% { box-shadow: 0 0 0 8px rgba(52,211,153,0); } 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); } }
.hd-title { font-size: 40px; line-height: 1.05; font-weight: 800; letter-spacing: -0.03em; margin: 0;
  background: linear-gradient(120deg, #fff 30%, #f7c873 120%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.hd-sub { font-size: 14px; color: rgba(255,255,255,0.55); margin: 10px 0 0; max-width: 520px; }
.hd-sub strong { color: #fff; font-weight: 600; }
.hd-hero-cta { display: inline-flex; align-items: center; gap: 10px; padding: 13px 22px 13px 14px;
  border-radius: 16px; text-decoration: none; font-weight: 700; font-size: 14px; color: #1a1410;
  background: linear-gradient(135deg, #fcd34d, #f59e0b); box-shadow: 0 10px 26px rgba(245,158,11,0.32);
  transition: transform .35s cubic-bezier(.16,1,.3,1), box-shadow .35s; }
.hd-hero-cta:hover { transform: translateY(-3px); box-shadow: 0 16px 38px rgba(245,158,11,0.45); }
.hd-hero-cta .hd-cta-ico { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; background: rgba(0,0,0,0.14); }
.hd-hero-cta .hd-cta-arrow { transition: transform .3s; }
.hd-hero-cta:hover .hd-cta-arrow { transform: translateX(4px); }

/* KPI BAND */
.hd-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.hd-kpi { position: relative; overflow: hidden; border-radius: 20px; padding: 20px;
  background: rgba(20,20,23,0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.06); transition: transform .35s cubic-bezier(.16,1,.3,1), border-color .35s, box-shadow .35s; }
.hd-kpi::after { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; opacity: .9; }
.hd-kpi.k-gold::after { background: linear-gradient(90deg, #fcd34d, #f59e0b); }
.hd-kpi.k-emerald::after { background: linear-gradient(90deg, #6ee7b7, #34d399); }
.hd-kpi.k-amber::after { background: linear-gradient(90deg, #fdba74, #fb923c); }
.hd-kpi.k-rate::after { background: linear-gradient(90deg, #fbbf24, #34d399); }
.hd-kpi.clickable { cursor: pointer; }
.hd-kpi:hover { transform: translateY(-5px); border-color: rgba(255,255,255,0.14); box-shadow: 0 18px 40px rgba(0,0,0,0.4); }
.hd-kpi-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.hd-kpi-ico { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; color: #1a1410; }
.k-gold .hd-kpi-ico { background: linear-gradient(135deg, #fcd34d, #f59e0b); }
.k-emerald .hd-kpi-ico { background: linear-gradient(135deg, #6ee7b7, #34d399); }
.k-amber .hd-kpi-ico { background: linear-gradient(135deg, #fdba74, #fb923c); }
.k-rate .hd-kpi-ico { background: linear-gradient(135deg, #fbbf24, #34d399); }
.hd-kpi-chip { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  padding: 4px 9px; border-radius: 20px; background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.65); }
.hd-kpi-val { font-size: 27px; font-weight: 800; color: #fff; letter-spacing: -0.02em; font-family: 'SF Mono', 'Inter', monospace; line-height: 1; }
.hd-kpi-lbl { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 8px; }
.hd-kpi-spark { display: flex; align-items: flex-end; gap: 3px; height: 26px; margin-top: 12px; }
.hd-kpi-spark i { flex: 1; min-height: 4px; border-radius: 3px 3px 0 0; background: linear-gradient(180deg, rgba(245,158,11,0.9), rgba(245,158,11,0.25));
  transform-origin: bottom; animation: barPop .6s cubic-bezier(.16,1,.3,1) both; }
.hd-kpi-bar { height: 6px; border-radius: 6px; background: rgba(255,255,255,0.08); margin-top: 14px; overflow: hidden; }
.hd-kpi-bar span { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, #fbbf24, #34d399); transition: width 1.1s cubic-bezier(.16,1,.3,1) .3s; }

/* TELEMETRY SPLIT */
.hd-split { display: grid; grid-template-columns: 1.9fr 1fr; gap: 16px; align-items: stretch; }
.hd-side { display: flex; flex-direction: column; gap: 16px; }
.hd-tele-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.hd-tele-amount { font-size: 20px; font-weight: 800; color: #fff; font-family: 'SF Mono', monospace; letter-spacing: -0.02em; }
.hd-tele-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: #34d399;
  background: rgba(52, 211, 153, 0.13); padding: 4px 9px; border-radius: 20px; }

.hd-chart-stage { display: flex; gap: 12px; }
.hd-yaxis { display: flex; flex-direction: column; justify-content: space-between; height: 180px; padding: 1px 0;
  font-family: 'SF Mono', monospace; font-size: 9px; color: rgba(255,255,255,0.34); text-align: right; min-width: 34px; }
.hd-chart-wrap { position: relative; flex: 1; height: 180px; }
.hd-grid { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }
.hd-grid span { display: block; height: 1px; background: rgba(255, 255, 255, 0.06); }
.hd-telemetry .hd-chart { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.hd-line-glow { filter: drop-shadow(0 3px 9px rgba(52, 211, 153, 0.5)); }

/* sweeping highlight + pulsing data endpoint = "highly animated" */
.hd-scan { position: absolute; top: 0; bottom: 0; left: 0; width: 88px; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.07), transparent);
  animation: hdScan 4.8s ease-in-out infinite; }
@keyframes hdScan { 0% { transform: translateX(-110px); opacity: 0; } 18% { opacity: 1; } 82% { opacity: 1; } 100% { transform: translateX(640px); opacity: 0; } }
.hd-end-dot { position: absolute; transform: translate(-50%, -50%); width: 0; height: 0; z-index: 2; }
.hd-end-core, .hd-end-ring { position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); border-radius: 50%; }
.hd-end-core { width: 9px; height: 9px; background: #6ee7b7; box-shadow: 0 0 12px rgba(110, 231, 183, 0.95); }
.hd-end-ring { width: 9px; height: 9px; border: 2px solid rgba(110, 231, 183, 0.75); animation: hdPing 2.1s cubic-bezier(0, 0, 0.2, 1) infinite; }
@keyframes hdPing { 0% { width: 9px; height: 9px; opacity: 0.85; } 100% { width: 38px; height: 38px; opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .hd-scan, .hd-end-ring { animation: none; } }

.hd-xaxis { display: flex; justify-content: space-between; margin: 9px 0 0 46px; }
.hd-xaxis span { font-size: 10px; color: rgba(255, 255, 255, 0.34); font-weight: 600; }
.hd-xaxis span.on { color: #34d399; }

.hd-legend { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
.hd-leg-pill { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; color: rgba(255, 255, 255, 0.72); font-weight: 600;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.07); padding: 5px 11px; border-radius: 20px; }
.hd-leg-pill i { width: 9px; height: 9px; border-radius: 3px; }

/* RING */
.hd-ring { display: flex; flex-direction: column; }
.hd-ring-wrap { position: relative; width: 160px; height: 160px; margin: 6px auto 0; }
.hd-ring-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.hd-ring-svg .ring-bg { fill: none; stroke: rgba(255,255,255,0.07); stroke-width: 14; }
.hd-ring-svg .ring-fg { fill: none; stroke: url(#ringG); stroke-width: 14; stroke-linecap: round; transition: stroke-dashoffset 1.4s cubic-bezier(.65,0,.35,1) .4s; }
.hd-ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.hd-ring-val { font-size: 30px; font-weight: 800; color: #fff; letter-spacing: -0.02em; }
.hd-ring-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.4); margin-top: 2px; }

/* VELOCITY */
.hd-velocity { flex: 1; }
.hd-vel-avg { font-size: 16px; font-weight: 800; color: #fff; font-family: 'SF Mono', monospace; }
.hd-vel-avg small { font-size: 11px; color: rgba(255,255,255,0.35); font-weight: 500; }
.hd-vbars { display: flex; align-items: flex-end; justify-content: space-between; gap: 6px; height: 86px; }
.hd-vcol { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; }
.hd-vstack { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 3px; width: 100%; }
.hd-vb { width: 70%; max-width: 14px; min-height: 3px; border-radius: 4px; transform-origin: bottom; animation: barPop .6s cubic-bezier(.16,1,.3,1) both; }
.hd-vb.b-amber { background: linear-gradient(180deg, #fdba74, #fb923c); }
.hd-vb.b-emerald { background: linear-gradient(180deg, #6ee7b7, #34d399); }
.hd-vday { font-size: 10px; color: rgba(255,255,255,0.4); font-weight: 600; }
.hd-vday.on { color: #fbbf24; }

/* ACTIVITY ROW */
.hd-bottom { display: grid; grid-template-columns: 1.9fr 1fr; gap: 16px; align-items: start; }
.hd-side2 { display: flex; flex-direction: column; gap: 16px; }
.hd-ghost { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 600; padding: 7px 12px; border-radius: 10px; cursor: pointer; transition: all .25s; }
.hd-ghost:hover { background: rgba(255,255,255,0.1); color: #fff; }
.hd-ghost.sm { padding: 5px 10px; font-size: 11px; }
.hd-rlist { display: flex; flex-direction: column; gap: 6px; }
.hd-row { display: grid; grid-template-columns: 36px 1fr auto auto 18px; align-items: center; gap: 14px;
  padding: 11px 12px; border-radius: 14px; cursor: pointer; transition: background .25s, transform .25s; }
.hd-row:hover { background: rgba(255,255,255,0.04); transform: translateX(3px); }
.hd-row-ico { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; background: rgba(245,158,11,0.14); color: #f5b942; }
.hd-row-main { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.hd-row-name { font-size: 13.5px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hd-row-sub { font-size: 11.5px; color: rgba(255,255,255,0.42); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hd-row-val { font-size: 13px; font-weight: 700; color: #e8e0d2; font-family: 'SF Mono', monospace; }
.hd-row-arrow { color: rgba(255,255,255,0.3); transition: transform .25s, color .25s; }
.hd-row:hover .hd-row-arrow { color: #f5b942; transform: translateX(3px); }
.hd-pill { font-size: 10.5px; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
.hd-pill.ok { background: rgba(52,211,153,0.14); color: #34d399; }
.hd-pill.warn { background: rgba(251,191,36,0.14); color: #fbbf24; }
.hd-pill.bad { background: rgba(248,113,113,0.14); color: #f87171; }
.hd-pill.neutral { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }
.hd-empty { padding: 28px; text-align: center; color: rgba(255,255,255,0.4); font-size: 13px; }

/* PROMO + RESUME */
.hd-promo { background: linear-gradient(150deg, rgba(245,158,11,0.16), rgba(20,20,23,0.7) 65%); }
.hd-promo-glow { position: absolute; top: -30%; right: -20%; width: 200px; height: 200px; border-radius: 50%;
  background: radial-gradient(circle, rgba(245,158,11,0.4), transparent 70%); filter: blur(10px); }
.hd-promo h3 { font-size: 19px; font-weight: 800; color: #fff; margin: 0 0 8px; position: relative; }
.hd-promo p { font-size: 12.5px; color: rgba(255,255,255,0.6); margin: 0 0 18px; line-height: 1.55; position: relative; }
.hd-promo-btn, .hd-resume-btn { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; font-weight: 700; font-size: 13px;
  padding: 11px 18px; border-radius: 13px; transition: transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s; }
.hd-promo-btn { color: #1a1410; background: linear-gradient(135deg, #fcd34d, #f59e0b); box-shadow: 0 8px 22px rgba(245,158,11,0.3); position: relative; }
.hd-promo-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(245,158,11,0.42); }
.hd-resume-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.hd-resume-ref { font-size: 11px; font-family: 'SF Mono', monospace; font-weight: 700; color: #f5b942; letter-spacing: 0.04em; }
.hd-resume-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.4); }
.hd-resume-name { font-size: 15px; font-weight: 700; color: #fff; margin: 4px 0 10px; line-height: 1.3; }
.hd-resume-val { font-size: 22px; font-weight: 800; color: #fff; font-family: 'SF Mono', monospace; margin-bottom: 16px; letter-spacing: -0.02em; }
.hd-resume-btn { color: #fff; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); width: 100%; justify-content: center; }
.hd-resume-btn:hover { transform: translateY(-2px); background: rgba(245,158,11,0.16); border-color: rgba(245,158,11,0.4); }

@media (max-width: 1100px) {
  .hd-kpis { grid-template-columns: repeat(2, 1fr); }
  .hd-split, .hd-bottom { grid-template-columns: 1fr; }
}

/* ── LIGHT THEME for hd-* ── */
[data-theme="light"] .hd-panel,
[data-theme="light"] .hd-kpi { background: rgba(255, 250, 240, 0.72); border-color: rgba(217, 119, 6, 0.16); }
[data-theme="light"] .hd-panel:hover,
[data-theme="light"] .hd-kpi:hover { border-color: rgba(217, 119, 6, 0.4); box-shadow: 0 20px 44px rgba(180, 110, 30, 0.18); }
[data-theme="light"] .hd-panel-head h3,
[data-theme="light"] .hd-title { color: #1a1410; }
[data-theme="light"] .hd-title { background: linear-gradient(120deg, #1a1410 30%, #b45309 130%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
[data-theme="light"] .hd-panel-head p,
[data-theme="light"] .hd-sub { color: #6b5840; }
[data-theme="light"] .hd-sub strong { color: #1a1410; }
[data-theme="light"] .hd-eyebrow { color: #b45309; }
[data-theme="light"] .hd-kpi-chip { background: rgba(217,119,6,0.1); color: #92610a; }
[data-theme="light"] .hd-kpi-val,
[data-theme="light"] .hd-tele-amount,
[data-theme="light"] .hd-ring-val,
[data-theme="light"] .hd-vel-avg,
[data-theme="light"] .hd-row-name,
[data-theme="light"] .hd-resume-name,
[data-theme="light"] .hd-resume-val,
[data-theme="light"] .hd-promo h3 { color: #1a1410; }
[data-theme="light"] .hd-kpi-lbl,
[data-theme="light"] .hd-legend span,
[data-theme="light"] .hd-ring-lbl,
[data-theme="light"] .hd-row-sub,
[data-theme="light"] .hd-promo p { color: #6b5840; }
[data-theme="light"] .hd-row-val { color: #3d2f1c; }
[data-theme="light"] .hd-ring-svg .ring-bg { stroke: rgba(120,53,15,0.12); }
[data-theme="light"] .hd-kpi-bar { background: rgba(120,53,15,0.1); }
[data-theme="light"] .hd-row:hover { background: rgba(217,119,6,0.08); }
[data-theme="light"] .hd-ghost { background: rgba(217,119,6,0.08); border-color: rgba(217,119,6,0.22); color: #78350f; }
[data-theme="light"] .hd-ghost:hover { background: rgba(245,158,11,0.16); color: #92400e; }
[data-theme="light"] .hd-resume-btn { background: rgba(217,119,6,0.08); border-color: rgba(217,119,6,0.25); color: #78350f; }
[data-theme="light"] .hd-row-ico { background: rgba(217,119,6,0.12); color: #b45309; }
[data-theme="light"] .hd-vday.on { color: #b45309; }
[data-theme="light"] .hd-resume-ref { color: #b45309; }
/* Status pills — dark-theme variants used white text/near-transparent fills that
   vanished on cream. Re-skin for light so every status (esp. "Draft"/neutral) reads. */
[data-theme="light"] .hd-pill.ok { background: rgba(34, 134, 58, 0.13); color: #15803d; }
[data-theme="light"] .hd-pill.warn { background: rgba(217, 119, 6, 0.16); color: #b45309; }
[data-theme="light"] .hd-pill.bad { background: rgba(185, 28, 28, 0.13); color: #b91c1c; }
[data-theme="light"] .hd-pill.neutral { background: rgba(120, 53, 15, 0.12); color: #78350f; }
/* KPI accent chips also lean on theme color */
[data-theme="light"] .hd-row-arrow { color: rgba(120, 53, 15, 0.4); }
/* Faint grey labels that disappeared on cream */
[data-theme="light"] .hd-vday { color: #8a6d3b; }
[data-theme="light"] .hd-resume-label { color: #8a6d3b; }
[data-theme="light"] .hd-empty { color: #8a6d3b; }
/* Redesigned telemetry — light skin */
[data-theme="light"] .hd-grid span { background: rgba(120, 53, 15, 0.10); }
[data-theme="light"] .hd-yaxis,
[data-theme="light"] .hd-xaxis span { color: #8a6d3b; }
[data-theme="light"] .hd-xaxis span.on { color: #15803d; }
[data-theme="light"] .hd-tele-chip { background: rgba(34, 134, 58, 0.13); color: #15803d; }
[data-theme="light"] .hd-leg-pill { background: rgba(120, 53, 15, 0.05); border-color: rgba(217, 119, 6, 0.16); color: #6b5840; }
[data-theme="light"] .hd-scan { background: linear-gradient(90deg, transparent, rgba(180, 110, 30, 0.10), transparent); }

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
  transition: box-shadow 0.4s ease, border-color 0.4s ease;
}
.cv-card:hover {
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

/* Analytics Bar Grid — size to content, do NOT stretch to fill column */
.cv-analytics { display: flex; flex-direction: column; }
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

/* ═══════════════════════════════════════════
   LIGHT THEME OVERRIDES — preserve gold/amber/orange/emerald palette + transparency.
   Warm cream surface (#faf7f0) requires dark text and softer translucent backgrounds.
   Semantic accents (gold #f59e0b, emerald #10b981, lime #a3e635, purple #a78bfa,
   sky #38bdf8, red #ef4444) stay vivid — only neutrals invert.
   ═══════════════════════════════════════════ */

[data-theme="light"] .dpr-page { color: var(--text-primary); }

/* ─── Tabs Dock — ultra-modern frosted pill with glow active state ─── */
[data-theme="light"] .tabs-dock {
  background: rgba(255, 250, 240, 0.72);
  border: 1px solid rgba(26, 20, 16, 0.08);
  box-shadow: 0 4px 18px rgba(120, 80, 20, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
[data-theme="light"] .n-tab {
  color: #6b5840;
}
[data-theme="light"] .n-tab:hover {
  color: var(--text-primary);
  background: rgba(245, 158, 11, 0.08);
}
[data-theme="light"] .n-tab.active {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(251, 191, 36, 0.18) 100%);
  color: #b45309;
  border: 1px solid rgba(245, 158, 11, 0.45);
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.55);
  font-weight: 600;
}
[data-theme="light"] .n-tab.active .tab-icon { color: #d97706; opacity: 1; }
[data-theme="light"] .tab-sep { background: rgba(26, 20, 16, 0.12); }

/* ─── Title Row ─── */
[data-theme="light"] .cv-h1 { color: var(--text-primary); }
[data-theme="light"] .cv-date { color: #6b5840; }
[data-theme="light"] .cv-chip {
  border-color: rgba(26, 20, 16, 0.15);
  color: #6b5840;
}
[data-theme="light"] .cv-chip:hover {
  border-color: rgba(245, 158, 11, 0.4);
  color: var(--text-primary);
}
[data-theme="light"] .cv-chip.active {
  background: #f59e0b;
  color: #1a1410;
}

/* ─── Common Cards — frosted glass on cream, visible warm border + lift ─── */
[data-theme="light"] .cv-card {
  background: rgba(255, 250, 240, 0.88);
  border: 1px solid rgba(180, 110, 30, 0.32);
  box-shadow: 0 12px 32px rgba(120, 80, 20, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
[data-theme="light"] .cv-card:hover {
  border-color: rgba(217, 119, 6, 0.55);
  box-shadow: 0 20px 44px rgba(180, 110, 30, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

/* ─── Catch-all sweep: ANY remaining inline `color:#fff`, `color:rgba(255,255,255,X)`
       on the dashboard becomes a dark warm tone. Targets [style] attribute values. ─── */
[data-theme="light"] .dpr-page [style*="color: #fff"],
[data-theme="light"] .dpr-page [style*="color:#fff"],
[data-theme="light"] .dpr-page [style*="color: rgb(255, 255, 255)"],
[data-theme="light"] .dpr-page [style*="color:rgb(255,255,255)"] {
  color: var(--text-primary) !important;
}
[data-theme="light"] .dpr-page [style*="color: rgba(255,255,255,0.6"],
[data-theme="light"] .dpr-page [style*="color: rgba(255,255,255,0.7"],
[data-theme="light"] .dpr-page [style*="color: rgba(255,255,255,0.8"],
[data-theme="light"] .dpr-page [style*="color: rgba(255, 255, 255, 0.6"],
[data-theme="light"] .dpr-page [style*="color: rgba(255, 255, 255, 0.7"],
[data-theme="light"] .dpr-page [style*="color: rgba(255, 255, 255, 0.8"] {
  color: var(--text-primary) !important;
}
[data-theme="light"] .dpr-page [style*="color: rgba(255,255,255,0.3"],
[data-theme="light"] .dpr-page [style*="color: rgba(255,255,255,0.4"],
[data-theme="light"] .dpr-page [style*="color: rgba(255,255,255,0.5"],
[data-theme="light"] .dpr-page [style*="color: rgba(255, 255, 255, 0.3"],
[data-theme="light"] .dpr-page [style*="color: rgba(255, 255, 255, 0.4"],
[data-theme="light"] .dpr-page [style*="color: rgba(255, 255, 255, 0.5"] {
  color: #6b5840 !important;
}
[data-theme="light"] .dpr-page [style*="color: rgba(255,255,255,0.1"],
[data-theme="light"] .dpr-page [style*="color: rgba(255,255,255,0.2"],
[data-theme="light"] .dpr-page [style*="color: rgba(255, 255, 255, 0.1"],
[data-theme="light"] .dpr-page [style*="color: rgba(255, 255, 255, 0.2"] {
  color: rgba(107, 88, 64, 0.5) !important;
}
/* Catch white-rgba backgrounds + borders on inline-styled boxes */
[data-theme="light"] .dpr-page [style*="background: rgba(255,255,255,0.0"],
[data-theme="light"] .dpr-page [style*="background:rgba(255,255,255,0.0"],
[data-theme="light"] .dpr-page [style*="background: rgba(255, 255, 255, 0.0"] {
  background: rgba(255, 250, 240, 0.55) !important;
}
[data-theme="light"] .dpr-page [style*="border: 1px solid rgba(255,255,255"],
[data-theme="light"] .dpr-page [style*="border: 1px solid rgba(255, 255, 255"] {
  border-color: rgba(180, 110, 30, 0.18) !important;
}
[data-theme="light"] .cv-card-title { color: var(--text-primary); }

/* ─── Portfolio Card (Your Handovers) ─── */
[data-theme="light"] .cv-health-item {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(26, 20, 16, 0.08);
  color: var(--text-primary);
}
[data-theme="light"] .cv-health-item:hover {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.25);
}
[data-theme="light"] .cv-hi-icon { background: rgba(245, 158, 11, 0.1); }

[data-theme="light"] .cv-ac-icon {
  background: rgba(255, 250, 240, 0.85);
  color: var(--text-primary);
  border: 1px solid rgba(26, 20, 16, 0.08);
  box-shadow: 0 2px 8px rgba(120, 80, 20, 0.06);
}
[data-theme="light"] .cv-action-circle:hover .cv-ac-icon {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.3);
}
[data-theme="light"] .cv-action-circle span { color: #6b5840; }

[data-theme="light"] .cv-balance-section { border-top-color: rgba(26, 20, 16, 0.1); }
[data-theme="light"] .cv-bal-title { color: var(--text-primary); }
[data-theme="light"] .cv-bal-icon { color: #6b5840; }
[data-theme="light"] .cv-bal-label { color: #6b5840; }
[data-theme="light"] .cv-bal-item strong { color: var(--text-primary); }
[data-theme="light"] .cv-progress-track { background: rgba(26, 20, 16, 0.08); }
/* keep .cv-progress-fill lime green */

/* ─── Status Cards (Green Draft + Purple Approved) ─── */
[data-theme="light"] .cv-status-card.green {
  background: linear-gradient(145deg, rgba(255, 250, 240, 0.95) 40%, rgba(74, 222, 128, 0.22) 100%);
  border-color: rgba(16, 185, 129, 0.32);
}
[data-theme="light"] .cv-status-card.purple {
  background: linear-gradient(145deg, rgba(255, 250, 240, 0.95) 40%, rgba(167, 139, 250, 0.22) 100%);
  border-color: rgba(139, 92, 246, 0.32);
}
[data-theme="light"] .cv-sc-type { color: var(--text-primary); }
[data-theme="light"] .cv-dots { color: #6b5840; }
[data-theme="light"] .cv-sc-val { color: var(--text-primary); }
[data-theme="light"] .cv-sc-change {
  background: rgba(26, 20, 16, 0.06);
  color: #6b5840;
}
[data-theme="light"] .cv-sc-tag { color: #6b5840; }

/* ─── Cashflow (Transitioned Value) ─── */
[data-theme="light"] .cv-cf-sub { color: #6b5840; }
[data-theme="light"] .cv-cf-amount { color: var(--text-primary); }
[data-theme="light"] .cv-corner-btn {
  border-color: rgba(26, 20, 16, 0.12);
  color: var(--text-primary);
}
[data-theme="light"] .cv-corner-btn:hover { background: rgba(245, 158, 11, 0.08); }

/* Chart labels + legend */
[data-theme="light"] .cv-chart-label { fill: #6b5840; }
[data-theme="light"] .cv-leg { color: #6b5840; }

/* Enhanced cashflow border + amount tint */
[data-theme="light"] .enhanced-cashflow.emerald { border-color: rgba(16, 185, 129, 0.45); }
[data-theme="light"] .enhanced-cashflow.amber { border-color: rgba(245, 158, 11, 0.45); }
[data-theme="light"] .enhanced-cashflow.purple { border-color: rgba(139, 92, 246, 0.45); }
[data-theme="light"] .enhanced-cashflow.emerald .cv-cf-amount { color: #047857; text-shadow: 0 0 14px rgba(16, 185, 129, 0.22); }
[data-theme="light"] .enhanced-cashflow.amber .cv-cf-amount { color: #b45309; text-shadow: 0 0 14px rgba(245, 158, 11, 0.22); }
[data-theme="light"] .enhanced-cashflow.purple .cv-cf-amount { color: #6d28d9; text-shadow: 0 0 14px rgba(139, 92, 246, 0.22); }

/* ─── Analytics (Handover Velocity) ─── */
[data-theme="light"] .cv-analytics .velocity-stats > div:first-child { color: #6b5840 !important; }
[data-theme="light"] .cv-analytics .velocity-stats > div:last-child { color: var(--text-primary) !important; }
[data-theme="light"] .cv-analytics .velocity-stats > div:last-child > span { color: #6b5840 !important; }

/* Stat tiles inside analytics (Pending / Approved Docs) — they use inline styles */
[data-theme="light"] .cv-analytics > div[style*="display: flex"] > div[style*="background: rgba(255,255,255,0.03)"] {
  background: rgba(255, 250, 240, 0.6) !important;
  border-color: rgba(26, 20, 16, 0.08) !important;
}
[data-theme="light"] .cv-analytics > div[style*="display: flex"] > div > div[style*="color: rgba(255,255,255,0.4)"] {
  color: #6b5840 !important;
}

[data-theme="light"] .cv-bar-block.b1 { background: #fbbf24; } /* amber instead of dark blue on cream */
[data-theme="light"] .cv-bar-block.b2 { background: #10b981; } /* keep emerald */
[data-theme="light"] .b1 .cv-bv { color: rgba(26, 20, 16, 0.75); }
[data-theme="light"] .cv-bar-day { color: rgba(26, 20, 16, 0.45); }
[data-theme="light"] .cv-bar-day.active { color: var(--text-primary); }

/* ─── Promo Card (Create & Deliver) ─── */
[data-theme="light"] .cv-promo {
  background: linear-gradient(145deg, rgba(255, 250, 240, 0.95) 0%, rgba(254, 240, 200, 0.9) 100%);
  border: 1px solid rgba(245, 158, 11, 0.2);
}
[data-theme="light"] .cv-promo-mesh {
  background: radial-gradient(circle at 100% 0%, rgba(245, 158, 11, 0.18) 0%, transparent 50%),
              radial-gradient(circle at 0% 100%, rgba(56, 189, 248, 0.15) 0%, transparent 50%);
}
[data-theme="light"] .cv-promo-title { color: var(--text-primary); }
[data-theme="light"] .cv-promo-sub { color: #6b5840; }
[data-theme="light"] .cv-start-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.35);
}
[data-theme="light"] .cv-start-btn:hover {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  box-shadow: 0 10px 22px rgba(245, 158, 11, 0.5);
}

/* ─── Quick / Recent Creators ─── */
[data-theme="light"] .cv-q-header { color: var(--text-primary); }
[data-theme="light"] .cv-plus-btn { color: #6b5840; }
[data-theme="light"] .cv-plus-btn:hover { color: #b45309; }
[data-theme="light"] .cv-av { border-color: rgba(255, 250, 240, 0.95); }
[data-theme="light"] .cv-q-bg-glow {
  background: radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, transparent 70%);
}

[data-theme="light"] .modern-ri:hover { background: rgba(245, 158, 11, 0.08); }
[data-theme="light"] .cv-ri-avatar {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}
[data-theme="light"] .cv-ri-name { color: var(--text-primary); }
[data-theme="light"] .cv-ri-sub { color: #6b5840; }
[data-theme="light"] .cv-ri-action-glow { color: #047857; }

/* ─── Transfer / Latest Draft Card ─── */
[data-theme="light"] .cv-tf-ref { color: var(--text-primary); }
[data-theme="light"] .cv-tf-type { color: #6b5840; }
[data-theme="light"] .cv-pill-btn {
  background: rgba(56, 189, 248, 0.15);
  color: #0369a1;
}
[data-theme="light"] .cv-tf-amount-row {
  background: rgba(245, 158, 11, 0.05);
  border-color: rgba(245, 158, 11, 0.18);
}
[data-theme="light"] .cv-tf-label { color: #6b5840; }
[data-theme="light"] .cv-tf-amount { color: var(--text-primary); }
[data-theme="light"] .from-box { border-top-color: rgba(26, 20, 16, 0.1); }
[data-theme="light"] .cv-tf-tag-main { color: var(--text-primary); }
[data-theme="light"] .cv-transfer-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
}
[data-theme="light"] .cv-transfer-btn:hover {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
}
[data-theme="light"] .glow-btn { box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3); }
[data-theme="light"] .glow-btn:hover { box-shadow: 0 8px 22px rgba(16, 185, 129, 0.45); }

/* ─── Table Tabs (Draft / Pending / Approved / Rejected) ─── */
[data-theme="light"] .title-group h3 { color: var(--text-primary); }
[data-theme="light"] .title-group p { color: #6b5840; }

[data-theme="light"] .pm-table-modern {
  background: rgba(255, 250, 240, 0.72) !important;
  border: 1px solid rgba(26, 20, 16, 0.08);
  box-shadow: 0 6px 22px rgba(120, 80, 20, 0.06);
}
[data-theme="light"] .pm-row-modern {
  border-bottom-color: rgba(26, 20, 16, 0.08);
}
[data-theme="light"] .pm-row-modern.header {
  color: #6b5840;
  border-bottom-color: rgba(26, 20, 16, 0.15);
  background: transparent;
}
[data-theme="light"] .pm-row-modern.item {
  background: transparent;
  color: var(--text-primary);
}
[data-theme="light"] .pm-row-modern.item:hover {
  background: rgba(245, 158, 11, 0.07);
}
[data-theme="light"] .pm-row-modern .col { color: var(--text-primary); }
[data-theme="light"] .pm-row-modern .col.sn { color: #6b5840; }
[data-theme="light"] .pm-row-modern .col.date,
[data-theme="light"] .pm-row-modern .col[style*="color:rgba(255,255,255"] { color: #6b5840 !important; }

/* category column inline-styled spans (.v-ref + .pill) */
[data-theme="light"] .pm-row-modern .col .v-name { color: var(--text-primary); }
[data-theme="light"] .pm-row-modern .col .v-ref,
[data-theme="light"] .pm-row-modern .col .v-ref[style] { color: #6b5840 !important; }
[data-theme="light"] .pm-row-modern .col .pill,
[data-theme="light"] .pm-row-modern .col .pill[style] {
  background: rgba(26, 20, 16, 0.06) !important;
  color: #6b5840 !important;
}

/* client column inline-styled v-name (white-on-cream override) */
[data-theme="light"] .pm-row-modern .col.client .v-name,
[data-theme="light"] .pm-row-modern .col.client .v-name[style] { color: var(--text-primary) !important; }

/* Status badges — preserve semantic colors with cream-readable variants */
[data-theme="light"] .status-badge.draft {
  background: rgba(113, 113, 122, 0.14);
  border-color: rgba(113, 113, 122, 0.3);
  color: #52525b;
}
[data-theme="light"] .status-badge.pending,
[data-theme="light"] .status-badge.compact.pending[style] {
  background: rgba(249, 115, 22, 0.16) !important;
  border-color: rgba(249, 115, 22, 0.4) !important;
  color: #c2410c !important;
}
[data-theme="light"] .status-badge.approved,
[data-theme="light"] .status-badge.compact.approved[style] {
  background: rgba(16, 185, 129, 0.16) !important;
  border-color: rgba(16, 185, 129, 0.4) !important;
  color: #047857 !important;
}
[data-theme="light"] .status-badge.rejected,
[data-theme="light"] .status-badge.compact.rejected[style] {
  background: rgba(239, 68, 68, 0.16) !important;
  border-color: rgba(239, 68, 68, 0.4) !important;
  color: #b91c1c !important;
}

/* Empty-state */
[data-theme="light"] .empty-state h4,
[data-theme="light"] .empty-state h4[style] { color: var(--text-primary) !important; }
[data-theme="light"] .empty-state p { color: #6b5840; }
[data-theme="light"] .empty-state svg,
[data-theme="light"] .empty-state [style*="color: rgba(255,255,255"] { color: rgba(26, 20, 16, 0.22) !important; }

/* ─── Search Box — transparent pill, gold border, matches SLA dashboard
       (!important needed to beat src/styles/theme-light-rescue.css line 132 which
        forces a cream background onto .search-box input) ─── */
[data-theme="light"] .search-box {
  background: transparent !important;
  border: 1px solid rgba(217, 119, 6, 0.35) !important;
  box-shadow: none !important;
}
[data-theme="light"] .search-box:focus-within {
  border-color: #d97706 !important;
  background: transparent !important;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18) !important;
}
[data-theme="light"] .search-box svg { color: #b45309; }
[data-theme="light"] .search-box input {
  background: transparent !important;
  border: none !important;
  color: var(--text-primary) !important;
}
[data-theme="light"] .search-box input::placeholder { color: rgba(120, 53, 15, 0.5) !important; }
</style>
