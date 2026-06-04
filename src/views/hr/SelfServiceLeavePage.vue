<template>
  <div class="ssl-page" :data-fy="fyLabel">
    <!-- ═════════════════════════════════════════════════════════════════
         AMBIENT BACKDROP — three drifting auroras + dot-grid + noise
         + a slow vertical scan beam. Pure CSS, GPU-friendly.
         ════════════════════════════════════════════════════════════════ -->
    <div class="ssl-backdrop" aria-hidden="true">
      <span class="bd-aurora bd-a" />
      <span class="bd-aurora bd-b" />
      <span class="bd-aurora bd-c" />
      <span class="bd-grid" />
      <span class="bd-noise" />
      <span class="bd-scan" />
    </div>

    <!-- Unlinked banner (kept) -->
    <Motion v-if="unlinked" as="div" class="ssl-unlinked"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4 }"
    >
      <span class="ssl-unlinked-ico"><UserRoundX :size="20" /></span>
      <div>
        <strong>Your account isn't linked to an HR employee profile yet.</strong>
        <span>Ask your HR admin to create or link your employee record so balances appear here.</span>
      </div>
    </Motion>

    <!-- ═════════════════════════════════════════════════════════════════
         HERO — split-word greeting + central radial gauge + CTA + strip
         ════════════════════════════════════════════════════════════════ -->
    <section class="ssl-hero">
      <header class="hero-head">
        <Motion as="div" class="hero-eye"
          :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5 }"
        >
          <span class="eye-dot" />
          <span class="eye-text">Self-service · Fiscal Year {{ fyLabel }}</span>
          <span class="eye-divider" />
          <span class="eye-text leave-mono">{{ liveClock }}</span>
        </Motion>

        <h1 class="hero-title">
          <span v-for="(w, i) in greetingWords" :key="i"
            class="title-word"
            :style="{ animationDelay: (i * 70) + 'ms' }">{{ w }}</span>
        </h1>

        <Motion as="p" class="hero-sub"
          :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.25 }"
        >
          <span class="sub-pill">
            <span class="sub-dot" />
            <strong>{{ totalRemaining }}</strong>
            <span>days remaining across {{ activeTypes }} leave types</span>
          </span>
          <span class="sub-tail">Two-tier approval: <em>Manager → HR</em>. Approved leaves auto-flip your attendance.</span>
        </Motion>

        <!-- ───── Hero actions live HERE (left column, under the title) ───── -->
        <div class="hero-actions">
          <Motion as="button" class="hero-cta"
            :class="{ 'is-disabled': unlinked }"
            :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, delay: 0.4 }"
            :whileHover="!unlinked ? { y: -3, scale: 1.03 } : {}"
            :whileTap="!unlinked ? { scale: 0.97 } : {}"
            :disabled="unlinked"
            @click="!unlinked && (applyOpen = true)"
          >
            <Plus :size="16" />
            <span>Apply for leave</span>
            <span class="cta-flare" />
            <span class="cta-spark" />
          </Motion>

          <div class="hero-quick">
            <button v-for="q in quickActions" :key="q.key"
              class="quick-btn"
              :disabled="unlinked"
              @click="onQuickAction(q.key)"
            >
              <component :is="q.icon" :size="13" />
              <span>{{ q.label }}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Central radial gauge — the showpiece -->
      <div class="hero-gauge-wrap">
        <Motion as="div" class="hero-gauge"
          :initial="{ opacity: 0, scale: 0.86, rotate: -8 }"
          :animate="{ opacity: 1, scale: 1, rotate: 0 }"
          :transition="{ duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }"
        >
          <svg viewBox="0 0 360 360" class="gauge-svg" aria-hidden="true">
            <defs>
              <linearGradient id="lg-rim" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"  stop-color="#fde68a" />
                <stop offset="40%" stop-color="#fbbf24" />
                <stop offset="75%" stop-color="#f59e0b" />
                <stop offset="100%" stop-color="#fb923c" />
              </linearGradient>
              <linearGradient id="lg-used" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ea580c" />
                <stop offset="100%" stop-color="#7c2d12" />
              </linearGradient>
              <radialGradient id="lg-core" cx="0.5" cy="0.5" r="0.55">
                <stop offset="0%"  stop-color="rgba(251,191,36,0.55)" />
                <stop offset="50%" stop-color="rgba(251,191,36,0.15)" />
                <stop offset="100%" stop-color="rgba(251,191,36,0)" />
              </radialGradient>
              <filter id="lg-soft" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>

            <!-- Soft inner glow -->
            <circle cx="180" cy="180" r="170" fill="url(#lg-core)" />

            <!-- 60 tick marks -->
            <g class="gauge-ticks">
              <line v-for="t in 60" :key="t"
                :x1="180 + 150 * Math.cos((t - 1) * Math.PI / 30 - Math.PI / 2)"
                :y1="180 + 150 * Math.sin((t - 1) * Math.PI / 30 - Math.PI / 2)"
                :x2="180 + (t % 5 === 0 ? 138 : 144) * Math.cos((t - 1) * Math.PI / 30 - Math.PI / 2)"
                :y2="180 + (t % 5 === 0 ? 138 : 144) * Math.sin((t - 1) * Math.PI / 30 - Math.PI / 2)"
                :stroke="t % 5 === 0 ? 'rgba(251,191,36,0.85)' : 'rgba(251,191,36,0.30)'"
                stroke-width="1.5" stroke-linecap="round" />
            </g>

            <!-- Outer dimmed track -->
            <circle cx="180" cy="180" r="124" fill="none" stroke="rgba(251,191,36,0.12)" stroke-width="14" />

            <!-- Used arc -->
            <circle cx="180" cy="180" r="124" fill="none"
              stroke="url(#lg-used)" stroke-width="14" stroke-linecap="round"
              :stroke-dasharray="2 * Math.PI * 124"
              :stroke-dashoffset="(2 * Math.PI * 124) * (1 - gaugeUsedRatio)"
              transform="rotate(-90 180 180)" class="gauge-used" />

            <!-- Remaining arc (offset) -->
            <circle cx="180" cy="180" r="100" fill="none"
              stroke="url(#lg-rim)" stroke-width="10" stroke-linecap="round"
              :stroke-dasharray="2 * Math.PI * 100"
              :stroke-dashoffset="(2 * Math.PI * 100) * (1 - gaugeRemRatio)"
              transform="rotate(-90 180 180)" class="gauge-rem" />

            <!-- Decorative dot orbit -->
            <g class="gauge-orbit">
              <circle cx="180" cy="56" r="4" fill="#fde68a" />
            </g>
          </svg>

          <!-- Central readout -->
          <div class="gauge-center">
            <span class="gauge-eye">Days available</span>
            <strong class="gauge-num">
              <span class="num-int">{{ animatedTotal.int }}</span><span class="num-frac">.{{ animatedTotal.frac }}</span>
            </strong>
            <span class="gauge-divider" />
            <span class="gauge-tail">
              <span class="tail-used">{{ totalUsed }} used</span>
              <span class="tail-dot" />
              <span class="tail-quota">{{ totalQuota }} quota</span>
            </span>
          </div>

          <!-- Halo rings -->
          <span class="halo halo-1" />
          <span class="halo halo-2" />
          <span class="halo halo-3" />
        </Motion>
      </div>

      <!-- Stat strip — sparklines, count-ups, breathing halos -->
      <div class="hero-stats">
        <Motion v-for="(s, i) in heroStats" :key="s.key" as="article"
          class="stat-tile"
          :class="`tone-${s.tone}`"
          :initial="{ opacity: 0, y: 18, scale: 0.96 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.55, delay: 0.45 + i * 0.07, ease: [0.22, 1, 0.36, 1] }"
        >
          <!-- Ambient corner glow + drifting orbit -->
          <span class="tile-glow" />
          <span class="tile-orbit" />

          <!-- Top row: eyebrow + arrow badge -->
          <header class="tile-head">
            <span class="tile-eye">{{ s.label }}</span>
            <span class="tile-trend" :class="`trend-${s.trend}`" v-if="s.trendValue !== undefined">
              <component :is="s.trend === 'up' ? TrendingUp : s.trend === 'down' ? TrendingDown : Minus" :size="9" />
              <span>{{ s.trendValue }}</span>
            </span>
          </header>

          <!-- Main number row -->
          <div class="tile-num-wrap">
            <span class="tile-ico-wrap">
              <component :is="s.icon" :size="16" class="tile-ico" />
              <span class="tile-ico-ring" />
            </span>
            <div class="tile-num">
              <strong class="tile-num-val">{{ s.value }}</strong>
              <small v-if="s.unit" class="tile-unit">{{ s.unit }}</small>
            </div>
          </div>

          <!-- Sparkline + meta -->
          <div class="tile-spark">
            <svg viewBox="0 0 120 26" preserveAspectRatio="none" class="spark-svg" aria-hidden="true">
              <defs>
                <linearGradient :id="`sg-${s.key}`" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  :stop-color="s.sparkColors[0]" stop-opacity="0.55" />
                  <stop offset="100%" :stop-color="s.sparkColors[1]" stop-opacity="0" />
                </linearGradient>
              </defs>
              <path :d="s.sparkArea" :fill="`url(#sg-${s.key})`" />
              <path :d="s.sparkLine" fill="none" :stroke="s.sparkColors[0]" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              <circle :cx="s.sparkDotX" cy="6" r="2.5" :fill="s.sparkColors[0]">
                <animate attributeName="r" values="2;3.4;2" dur="1.6s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          <span class="tile-meta">{{ s.meta }}</span>
          <span class="tile-bar"><span class="tile-fill" :style="{ width: `${s.fill}%` }" /></span>
        </Motion>
      </div>
    </section>

    <!-- ═════════════════════════════════════════════════════════════════
         LEAVE TYPE CARDS — 10 rich cards in a responsive grid
         ════════════════════════════════════════════════════════════════ -->
    <section class="ssl-section">
      <header class="sec-head">
        <div>
          <span class="sec-eye"><span class="eye-dot" /> Balance breakdown</span>
          <h2 class="sec-title">All leave types · {{ fyLabel }}</h2>
        </div>
        <div class="sec-filters">
          <button v-for="f in balanceFilters" :key="f.key"
            class="filter-chip"
            :class="{ active: balanceFilter === f.key }"
            @click="balanceFilter = f.key"
          >
            <component :is="f.icon" :size="11" /><span>{{ f.label }}</span>
          </button>
        </div>
      </header>

      <div v-if="loadingBalance && !balances.length" class="ssl-grid">
        <div v-for="i in 6" :key="`bsk-${i}`" class="bcard-skel">
          <div class="leave-skel" style="width:60%;height:14px" />
          <div class="leave-skel" style="width:90%;height:36px;margin-top:12px;border-radius:10px" />
          <div class="leave-skel" style="width:100%;height:8px;margin-top:14px" />
        </div>
      </div>

      <div v-else-if="!visibleBalances.length" class="ssl-empty">
        <CalendarOff :size="40" />
        <strong>Nothing here for "{{ balanceFilter }}"</strong>
        <span>Try a different filter, or apply for your first leave this year.</span>
      </div>

      <div v-else class="ssl-grid">
        <Motion v-for="(b, i) in visibleBalances" :key="b.id" as="article"
          class="bcard" :style="{ '--c': typeMeta(b.leave_type).hex }"
          :initial="{ opacity: 0, y: 18, scale: 0.95 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.5, delay: 0.05 + Math.min(i * 0.04, 0.45), ease: [0.22, 1, 0.36, 1] }"
          :whileHover="{ y: -4 }"
        >
          <!-- Aurora corner glow -->
          <span class="bc-glow" />
          <span class="bc-orbit" />

          <!-- Heading row -->
          <div class="bc-head">
            <span class="bc-icon">
              <LeaveTypeIcon :type="b.leave_type" :size="18" />
            </span>
            <div class="bc-meta">
              <strong class="bc-name">{{ typeMeta(b.leave_type).label }}</strong>
              <span class="bc-cat">{{ b.leave_type }}</span>
            </div>
            <span class="bc-status" :data-tone="balanceTone(b)">{{ balanceTone(b) }}</span>
          </div>

          <!-- Big remaining number -->
          <div class="bc-stat">
            <span class="bc-rem-num">
              <CountUp :value="Number(b.closing_balance || 0)" :decimals="1" />
            </span>
            <div class="bc-rem-side">
              <span class="bc-rem-unit">days left</span>
              <span class="bc-rem-quota leave-mono">/ {{ Number(b.quota || 0).toFixed(0) }} quota</span>
            </div>
          </div>

          <!-- Used progress bar -->
          <div class="bc-bar">
            <div class="bc-bar-rail">
              <Motion as="div" class="bc-bar-fill"
                :initial="{ width: '0%' }"
                :animate="{ width: utilPct(b) + '%' }"
                :transition="{ duration: 1.1, delay: 0.18 + i * 0.04, ease: [0.16, 1, 0.3, 1] }"
              />
            </div>
            <span class="bc-bar-label leave-mono">{{ utilPct(b) }}% utilised</span>
          </div>

          <!-- Mini metrics row -->
          <dl class="bc-metrics">
            <div>
              <dt>Used</dt>
              <dd>{{ Number(b.used || 0).toFixed(1) }}</dd>
            </div>
            <div>
              <dt>Accrued</dt>
              <dd>{{ Number(b.accrued || 0).toFixed(1) }}</dd>
            </div>
            <div>
              <dt>C/Fwd</dt>
              <dd>{{ Number(b.carry_forward_in || 0).toFixed(1) }}</dd>
            </div>
            <div v-if="Number(b.encashed || 0) > 0">
              <dt>Encashed</dt>
              <dd>{{ Number(b.encashed || 0).toFixed(1) }}</dd>
            </div>
          </dl>

          <!-- Apply chip -->
          <button class="bc-apply" :disabled="unlinked" @click="onApplyForType(b.leave_type)">
            <Plus :size="11" /><span>Apply</span>
            <ArrowRight :size="11" class="bc-apply-arrow" />
          </button>
        </Motion>
      </div>
    </section>

    <!-- ═════════════════════════════════════════════════════════════════
         APPROVER CHAIN visualisation
         ════════════════════════════════════════════════════════════════ -->
    <section class="ssl-section ssl-chain-section">
      <header class="sec-head">
        <div>
          <span class="sec-eye"><span class="eye-dot" /> Workflow</span>
          <h2 class="sec-title">Your two-tier approval chain</h2>
        </div>
        <span class="chain-aside">Stage gates · Manager first, HR second</span>
      </header>

      <div class="chain-row">
        <div class="chain-node">
          <span class="node-eye">Step 01</span>
          <div class="node-card">
            <span class="node-ico"><Send :size="18" /></span>
            <strong>You apply</strong>
            <span>Pick type, dates, reason</span>
          </div>
        </div>
        <div class="chain-link" data-state="done"></div>
        <div class="chain-node">
          <span class="node-eye">Step 02</span>
          <div class="node-card">
            <span class="node-ico"><UserCheck :size="18" /></span>
            <strong>Manager review</strong>
            <span>{{ approverNames.manager || 'Reporting manager' }}</span>
          </div>
        </div>
        <div class="chain-link" data-state="active"></div>
        <div class="chain-node">
          <span class="node-eye">Step 03</span>
          <div class="node-card">
            <span class="node-ico"><Shield :size="18" /></span>
            <strong>HR approval</strong>
            <span>{{ approverNames.hr || 'HR team' }}</span>
          </div>
        </div>
        <div class="chain-link" data-state="pending"></div>
        <div class="chain-node">
          <span class="node-eye">Step 04</span>
          <div class="node-card success">
            <span class="node-ico"><CheckCircle2 :size="18" /></span>
            <strong>Approved</strong>
            <span>Attendance auto-flips</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ═════════════════════════════════════════════════════════════════
         YEAR HEATMAP — 12 months × days, leaves coloured by type
         ════════════════════════════════════════════════════════════════ -->
    <section class="ssl-section">
      <header class="sec-head">
        <div>
          <span class="sec-eye"><span class="eye-dot" /> Calendar</span>
          <h2 class="sec-title">Your year on a single grid</h2>
        </div>
        <span class="sec-aside leave-mono">{{ heatmap.totalDays }} day{{ heatmap.totalDays === 1 ? '' : 's' }} marked</span>
      </header>

      <div class="heatmap">
        <p v-if="currentShift" class="heat-shift-note leave-mono">
          <CalendarClock :size="11" />
          <span>Calendar follows your <strong>{{ currentShift.name }}</strong> shift · week-off: {{ weeklyOffLabel }}</span>
        </p>
        <div class="heat-rows">
          <div v-for="(row, i) in heatmap.rows" :key="row.month" class="heat-row">
            <span class="heat-month">{{ row.short }}</span>
            <div class="heat-cells">
              <Motion v-for="(cell, j) in row.cells" :key="`${row.month}-${j}`" as="span"
                class="heat-cell"
                :class="['kind-' + cell.kind, { 'is-today': cell.isToday }]"
                :style="{ background: cell.color, '--d': (j * 0.005 + i * 0.02) + 's' }"
                :initial="{ opacity: 0, scale: 0.4 }"
                :animate="{ opacity: 1, scale: 1 }"
                :transition="{ duration: 0.32, delay: 0.02 + (i * 31 + j) * 0.0015 }"
                @mouseenter="(e) => onHeatCellEnter(cell, e)"
                @mousemove="onHeatCellMove"
                @mouseleave="onHeatCellLeave"
              />
            </div>
          </div>
        </div>
        <div class="heat-legend">
          <span><i style="background: #fbbf24" />Approved</span>
          <span><i style="background: #f59e0b" />Pending HR</span>
          <span><i style="background: #fb923c" />Pending Mgr</span>
          <span><i style="background: rgba(248,113,113,0.55)" />Rejected</span>
          <span><i style="background: rgba(148,163,184,0.30)" />Week-off</span>
          <span><i style="background: rgba(251,191,36,0.06)" />Working day</span>
          <span class="legend-today"><i class="today-marker" />Today</span>
        </div>
      </div>

      <!-- ═════════════════════════════════════════════════════════════════
           ULTRA-MODERN HEATMAP TOOLTIP — teleported, glassmorphic, motion-v
           ════════════════════════════════════════════════════════════════ -->
      <Teleport to="body">
        <transition name="hm-tip">
          <div v-if="tooltipCell" class="hm-tooltip"
            :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }"
            role="tooltip" aria-live="polite"
          >
            <!-- Ambient layers -->
            <span class="hm-tip-glow" :style="{ background: `radial-gradient(circle, ${tooltipCell.accent}55, transparent 70%)` }" />
            <span class="hm-tip-grid" />

            <!-- Header: weekday eye + date + status pill -->
            <header class="hm-tip-head">
              <div class="hm-tip-head-l">
                <span class="hm-tip-eye leave-mono">
                  <span class="hm-tip-eye-dot" :style="{ background: tooltipCell.accent }" />
                  {{ tooltipCell.weekday }}
                </span>
                <strong class="hm-tip-date">{{ tooltipCell.dateLabel }}</strong>
              </div>
              <span class="hm-tip-pill" :data-tone="tooltipCell.kind">
                <component :is="tooltipCell.icon" :size="10" />
                <span>{{ tooltipCell.statusLabel }}</span>
              </span>
            </header>

            <!-- If there is a leave: full request card -->
            <div v-if="tooltipCell.leave" class="hm-tip-body" :style="{ '--tc': tooltipCell.accent }">
              <span class="hm-tip-rail" />
              <div class="hm-tip-row">
                <LeaveTypeIcon :type="tooltipCell.leave.leave_type" :size="14" ambient />
                <div class="hm-tip-row-meta">
                  <strong>{{ typeMeta(tooltipCell.leave.leave_type).label }} leave</strong>
                  <span class="leave-mono">{{ tooltipCell.leave.reference_no }}</span>
                </div>
                <span class="hm-tip-days">
                  <strong>{{ tooltipCell.leave.total_days }}</strong>
                  <small>{{ Number(tooltipCell.leave.total_days) === 1 ? 'day' : 'days' }}</small>
                </span>
              </div>
              <div class="hm-tip-range leave-mono">
                <Clock :size="10" />
                <span>{{ fmtRange(tooltipCell.leave.from_date, tooltipCell.leave.to_date) }}</span>
              </div>
              <p v-if="tooltipCell.leave.reason" class="hm-tip-reason">
                <Quote :size="10" />
                <span>{{ truncate(tooltipCell.leave.reason, 110) }}</span>
              </p>
            </div>

            <!-- If weekend / working day: short context line -->
            <div v-else class="hm-tip-foot">
              <component :is="tooltipCell.icon" :size="11" />
              <span>{{ tooltipCell.subText }}</span>
            </div>
          </div>
        </transition>
      </Teleport>
    </section>

    <!-- ═════════════════════════════════════════════════════════════════
         RECENT REQUESTS — animated cards with pipeline visualisation
         ════════════════════════════════════════════════════════════════ -->
    <section class="ssl-section">
      <header class="sec-head">
        <div>
          <span class="sec-eye"><span class="eye-dot" /> Activity</span>
          <h2 class="sec-title">Your leave requests</h2>
        </div>
        <div class="sec-tools">
          <div class="sec-filters">
            <button v-for="s in statusFilters" :key="s.key"
              class="filter-chip"
              :class="{ active: requestFilter === s.key }"
              @click="requestFilter = s.key"
            >
              <component :is="s.icon" :size="11" />
              <span>{{ s.label }}</span>
              <span v-if="requestCount(s.key) > 0" class="chip-count">{{ requestCount(s.key) }}</span>
            </button>
          </div>
          <button class="sec-refresh" @click="reloadAll" :disabled="loading">
            <RefreshCw :size="13" :class="{ spin: loading }" /><span>Refresh</span>
          </button>
        </div>
      </header>

      <div v-if="loading && !requests.length" class="ssl-grid">
        <div v-for="i in 3" :key="`rsk-${i}`" class="rcard-skel">
          <div class="leave-skel" style="height:14px;width:50%" />
          <div class="leave-skel" style="height:60px;margin-top:12px;border-radius:10px" />
        </div>
      </div>

      <div v-else-if="!filteredRequests.length" class="ssl-empty">
        <CalendarOff :size="40" />
        <strong>{{ requests.length ? 'No requests match this filter' : 'No leaves yet' }}</strong>
        <span>{{ requests.length ? 'Try a different status above.' : 'Tap Apply above to file your first request.' }}</span>
      </div>

      <div v-else class="req-list" ref="requestsSectionRef">
        <!-- Compound key ensures motion-v re-runs the stagger entrance every
             time the page changes — cards "deal" in like a fresh hand. -->
        <Motion v-for="(r, i) in pagedRequests" :key="r.id + '-p' + reqPage" as="article"
          class="rcard"
          :style="{ '--c': typeMeta(r.leave_type).hex }"
          :initial="{ opacity: 0, y: 18 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.04 + Math.min(i * 0.05, 0.35), ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -2 }"
        >
          <!-- Left rail accent -->
          <span class="rc-rail" />

          <header class="rc-head">
            <div class="rc-head-l">
              <LeaveTypeIcon :type="r.leave_type" :size="16" ambient />
              <div class="rc-titles">
                <strong>{{ typeMeta(r.leave_type).label }}</strong>
                <span class="rc-ref leave-mono">{{ r.reference_no }} · {{ r.total_days }}d · {{ fmtRange(r.from_date, r.to_date) }}</span>
              </div>
            </div>
            <div class="rc-head-r">
              <!-- Proof-needed / proof-submitted badge — left of the status chip.
                   Clickable: opens the upload modal. -->
              <button v-if="r.proof_requested && Number(r.proof_attachment_count || 0) === 0"
                type="button"
                class="rc-proof-pill rc-proof-pill--need"
                :title="r.proof_request_note || 'HR requested supporting documents'"
                @click.stop="openProofUpload(r)"
              >
                <span class="rc-proof-led" />
                <AlertCircle :size="11" />
                <span><strong>Action needed</strong> · Upload proof</span>
                <ChevronRight :size="11" class="rc-proof-arrow" />
              </button>
              <button v-else-if="r.proof_requested && Number(r.proof_attachment_count || 0) > 0"
                type="button"
                class="rc-proof-pill rc-proof-pill--done"
                title="View your proof uploads"
                @click.stop="openProofUpload(r)"
              >
                <CheckCircle2 :size="11" />
                <span>Proof submitted ({{ r.proof_attachment_count }})</span>
              </button>
              <LeaveStatusChip :status="r.status" :pulse="['PENDING_MANAGER','PENDING_HR'].includes(r.status)" />
            </div>
          </header>

          <LeaveStatusPipeline :status="r.status" />

          <p v-if="r.reason" class="rc-reason">
            <Quote :size="11" class="rc-quote" />
            <span>{{ truncate(r.reason, 220) }}</span>
          </p>

          <footer class="rc-foot">
            <span class="rc-when leave-mono">
              <Clock :size="10" /> applied {{ relTime(r.created_at) }}
            </span>
            <div class="rc-actions">
              <button v-if="r.proof_requested" class="rc-btn rc-btn-proof" @click="openProofUpload(r)">
                <CloudUpload :size="11" /><span>Upload proof</span>
              </button>
              <button v-if="r.status === 'PENDING_MANAGER'" class="rc-btn rc-btn-danger" @click="withdraw(r)">
                <X :size="11" /><span>Withdraw</span>
              </button>
              <button class="rc-btn rc-btn-ghost" @click="openDetail(r)">
                <Eye :size="11" /><span>Details</span>
              </button>
            </div>
          </footer>
        </Motion>
      </div>

      <!-- ═════════════════════════════════════════════════════════════════
           PAGINATION — only when there's more than one page
           ═══════════════════════════════════════════════════════════════ -->
      <Motion v-if="filteredRequests.length > reqPageSize" as="div" class="pgn"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.15 }"
      >
        <!-- LEFT: range readout + page-size switch -->
        <div class="pgn-l">
          <span class="pgn-eye leave-mono">
            <span class="pgn-led" />
            Showing
            <strong>{{ reqRangeLabel }}</strong>
          </span>
          <div class="pgn-size">
            <span class="pgn-size-lbl leave-mono">per page</span>
            <div class="pgn-size-pill" :style="{ '--idx': PAGE_SIZE_OPTIONS.indexOf(reqPageSize), '--n': PAGE_SIZE_OPTIONS.length }">
              <button v-for="n in PAGE_SIZE_OPTIONS" :key="n"
                :class="['ps-btn', { active: reqPageSize === n }]"
                @click="reqPageSize = n"
              >{{ n }}</button>
              <span class="ps-slider" />
            </div>
          </div>
        </div>

        <!-- RIGHT: page navigator -->
        <div class="pgn-r">
          <button class="pgn-nav" :disabled="reqPage === 1" @click="goToPage(1)" aria-label="First page">
            <ChevronsLeft :size="13" />
          </button>
          <button class="pgn-nav" :disabled="reqPage === 1" @click="goToPage(reqPage - 1)" aria-label="Previous">
            <ChevronLeft :size="13" />
          </button>

          <div class="pgn-track">
            <template v-for="(p, ix) in pageWindow" :key="`pw-${ix}-${p}`">
              <Motion v-if="p !== '…'" as="button" type="button"
                class="pgn-page"
                :class="{ active: p === reqPage }"
                :initial="{ opacity: 0, scale: 0.85 }"
                :animate="{ opacity: 1, scale: 1 }"
                :transition="{ duration: 0.3, delay: ix * 0.04, ease: [0.34, 1.56, 0.64, 1] }"
                :whileHover="{ y: -2 }"
                :whileTap="{ scale: 0.94 }"
                @click="goToPage(p)"
              >
                <span class="pp-num leave-mono">{{ p }}</span>
                <span v-if="p === reqPage" class="pp-glow" />
                <span v-if="p === reqPage" class="pp-orbit" />
              </Motion>
              <span v-else class="pgn-gap leave-mono">…</span>
            </template>
          </div>

          <button class="pgn-nav" :disabled="reqPage === totalReqPages" @click="goToPage(reqPage + 1)" aria-label="Next">
            <ChevronRight :size="13" />
          </button>
          <button class="pgn-nav" :disabled="reqPage === totalReqPages" @click="goToPage(totalReqPages)" aria-label="Last page">
            <ChevronsRight :size="13" />
          </button>

          <!-- Page meter — fills proportional to current position -->
          <div class="pgn-meter" :title="`Page ${reqPage} of ${totalReqPages}`">
            <span class="pm-fill" :style="{ width: ((reqPage - 1) / Math.max(1, totalReqPages - 1)) * 100 + '%' }" />
            <span class="pm-blip" :style="{ left: ((reqPage - 1) / Math.max(1, totalReqPages - 1)) * 100 + '%' }" />
          </div>
        </div>
      </Motion>
    </section>

    <!-- ═════════════════════════════════════════════════════════════════
         INSIGHTS + HOLIDAYS + COMP-OFF / ENCASHMENT — 3-up row
         ════════════════════════════════════════════════════════════════ -->
    <section class="ssl-grid-side">
      <!-- ░░ Insights — "neural nudge" module ░░ -->
      <Motion as="article" class="side-card insights"
        :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -5 }"
      >
        <span class="sc-accent" aria-hidden="true" />
        <span class="sc-glow" aria-hidden="true" />
        <span class="sc-sheen" aria-hidden="true" />
        <header class="side-head">
          <span class="side-eye"><span class="eye-dot" /> Insights</span>
          <h3>Smart suggestions</h3>
          <span class="sc-think" aria-hidden="true"><i /><i /><i /></span>
        </header>
        <ul class="insight-list">
          <Motion v-for="(ins, i) in insights" :key="i" as="li" :class="`tone-${ins.tone}`"
            :initial="{ opacity: 0, x: -12 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.4, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ x: 3 }"
          >
            <span class="ins-ic"><component :is="ins.icon" :size="14" /></span>
            <div>
              <strong>{{ ins.title }}</strong>
              <span>{{ ins.text }}</span>
            </div>
          </Motion>
          <li v-if="!insights.length" class="empty">
            <span class="ins-ic"><Sparkles :size="14" /></span>
            <div><strong>All caught up</strong><span>Nothing to nudge you about right now.</span></div>
          </li>
        </ul>
      </Motion>

      <!-- ░░ Comp-off — "credit vault" module ░░ -->
      <Motion as="article" class="side-card compoff"
        :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.55, delay: 0.18, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -5 }"
      >
        <span class="sc-accent" aria-hidden="true" />
        <span class="sc-glow" aria-hidden="true" />
        <span class="sc-sheen" aria-hidden="true" />
        <header class="side-head">
          <span class="side-eye"><span class="eye-dot" /> Comp-off</span>
          <h3><span class="vault-num">{{ activeCompOffDays }}</span> day{{ activeCompOffDays === 1 ? '' : 's' }} active</h3>
        </header>
        <div v-if="myCompOff.length" class="co-list">
          <div v-for="c in myCompOff.slice(0, 4)" :key="c.id" class="co-row"
            :class="{ expired: c.is_expired, soon: !c.is_expired && c.days_until_expiry !== null && c.days_until_expiry <= 14 }"
          >
            <span class="co-coin"><Coins :size="12" /></span>
            <div class="co-l">
              <span class="co-days leave-mono">+{{ c.days }}d</span>
              <span class="co-when leave-mono">earned {{ fmtDate(c.earned_on) }}</span>
            </div>
            <span v-if="c.is_expired" class="co-pill expired">expired</span>
            <span v-else-if="c.days_until_expiry !== null && c.days_until_expiry <= 14" class="co-pill soon">{{ c.days_until_expiry }}d</span>
            <span v-else-if="c.expires_on" class="co-pill ok leave-mono">exp {{ fmtDate(c.expires_on) }}</span>
          </div>
          <p v-if="myCompOff.length > 4" class="co-more leave-mono">+ {{ myCompOff.length - 4 }} more</p>
        </div>
        <div v-else class="vault-empty">
          <span class="vault-empty-orb"><Coins :size="20" /></span>
          <p class="side-empty">Work on a holiday or week-off and a credit lands here automatically.</p>
        </div>
      </Motion>

      <!-- ░░ Encashment — "convert to cash" module ░░ -->
      <Motion as="article" class="side-card encash"
        :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.55, delay: 0.26, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -5 }"
      >
        <span class="sc-accent" aria-hidden="true" />
        <span class="sc-glow" aria-hidden="true" />
        <span class="sc-sheen money" aria-hidden="true" />
        <header class="side-head">
          <span class="side-eye"><span class="eye-dot" /> Encashment</span>
          <h3>Convert leave to salary</h3>
        </header>

        <ul v-if="myEncashment.length" class="enc-list">
          <li v-for="e in myEncashment.slice(0, 4)" :key="e.id" class="enc-row">
            <div class="enc-l">
              <span class="enc-amt leave-mono">₹{{ inrShort(e.amount) }}</span>
              <span class="enc-meta leave-mono">{{ e.days_requested }}d · {{ e.reference_no }}</span>
            </div>
            <div class="enc-r">
              <span class="enc-pill" :data-tone="encashStatusMeta(e.status).tone">{{ encashStatusMeta(e.status).label }}</span>
              <button v-if="e.status === 'PENDING'" class="enc-cancel" @click="cancelEncash(e)" title="Withdraw request">
                <X :size="11" />
              </button>
            </div>
          </li>
          <p v-if="myEncashment.length > 4" class="co-more leave-mono">+ {{ myEncashment.length - 4 }} more</p>
        </ul>
        <p v-else class="side-empty">Have unused earned leave? Convert eligible days into pay — HR sanctions, Finance disburses.</p>

        <Motion as="button" class="enc-btn" @click="encashOpen = true"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
        >
          <span class="enc-btn-sweep" aria-hidden="true" />
          <Wallet :size="14" /> Request encashment
        </Motion>
      </Motion>

      <!-- ░░ Approvers — full-width "relay chain" ░░ -->
      <Motion as="article" class="side-card chain-detail"
        :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.55, delay: 0.32, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -3 }"
      >
        <span class="sc-accent" aria-hidden="true" />
        <span class="sc-glow" aria-hidden="true" />
        <header class="side-head row">
          <div>
            <span class="side-eye"><span class="eye-dot" /> Reach out</span>
            <h3>Your approvers</h3>
          </div>
          <span class="relay-badge leave-mono"><Shield :size="11" /> 2-stage chain</span>
        </header>

        <div class="relay">
          <span class="relay-line" aria-hidden="true"><span class="relay-pulse" /></span>

          <div class="relay-node origin">
            <span class="rn-av you">You</span>
            <span class="rn-lbl">Request</span>
          </div>

          <div class="relay-node">
            <span class="rn-av teal">{{ (approverNames.manager || 'M').charAt(0) }}</span>
            <div class="rn-meta">
              <strong>{{ approverNames.manager || 'Reporting manager' }}</strong>
              <span>Manager · stage 1</span>
            </div>
            <span class="rn-pill">S1</span>
          </div>

          <div class="relay-node">
            <span class="rn-av amber">HR</span>
            <div class="rn-meta">
              <strong>{{ approverNames.hr || 'HR team' }}</strong>
              <span>Final review · stage 2</span>
            </div>
            <span class="rn-pill amber">S2</span>
          </div>

          <div class="relay-node done">
            <span class="rn-av done"><CheckCircle2 :size="18" /></span>
            <span class="rn-lbl">Approved</span>
          </div>
        </div>
        <p class="side-foot"><ArrowRight :size="11" /> Approved leaves auto-flip your attendance for every day covered.</p>
      </Motion>
    </section>

    <!-- Modal -->
    <LeaveApplyModal :open="applyOpen" :balances="balances" :defaultType="applyDefaultType"
      @close="applyOpen = false; applyDefaultType = null"
      @submitted="onSubmitted"
    />
    <LeaveDetailModal :open="detailOpen" :leave="detailLeave" @close="closeDetail" />
    <ProofUploadModal
      :open="proofUploadModal.open"
      :leave="proofUploadModal.leave"
      @close="proofUploadModal.open = false"
      @updated="reloadAll"
    />
    <LeaveEncashmentRequestModal :open="encashOpen" @cancel="encashOpen = false" @submitted="onEncashSubmitted" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, h } from 'vue'
import { Motion } from 'motion-v'
import {
  Plus, RefreshCw, CalendarOff, X, UserRoundX, UserCheck, Shield, Send,
  CheckCircle2, Quote, Clock, Eye, Sparkles, ArrowRight,
  Layers, Hourglass, AlertTriangle, TrendingUp, TrendingDown, Minus, Coins, Sun, Plane,
  CalendarRange, Wallet, BarChart2, CalendarClock, Briefcase, BedDouble, XOctagon,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  CloudUpload, AlertCircle,
} from 'lucide-vue-next'
import axios from 'axios'
import { API, authHeader } from '@/utils/api'
import LeaveStatusChip from './leave/components/LeaveStatusChip.vue'
import LeaveStatusPipeline from './leave/components/LeaveStatusPipeline.vue'
import LeaveTypeIcon from './leave/components/LeaveTypeIcon.vue'
import LeaveApplyModal from './leave/modals/LeaveApplyModal.vue'
import LeaveDetailModal from './leave/modals/LeaveDetailModal.vue'
import ProofUploadModal from './leave/modals/ProofUploadModal.vue'
import LeaveEncashmentRequestModal from './leave/modals/LeaveEncashmentRequestModal.vue'
import { useToast } from 'vue-toastification'
import {
  fetchMyLeaves, fetchMyBalance, withdrawMyLeave, typeMeta,
  fetchMyCompOff, fetchMyEncashment, cancelMyEncashment, ENCASHMENT_STATUSES,
} from '@/composables/useLeaves'

import '@/styles/leave-theme.css'

const toast = useToast()

// ─────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────
const balances = ref([])
const requests = ref([])
const myCompOff = ref([])
const myEncashment = ref([])
const encashOpen = ref(false)
const loading = ref(false)
const loadingBalance = ref(false)
const applyOpen = ref(false)
const applyDefaultType = ref(null)
const unlinked = ref(false)

const balanceFilter = ref('all')
const requestFilter = ref('all')

// ─────────────────────────────────────────────────────────────────────
// Derived – greeting / clock
// ─────────────────────────────────────────────────────────────────────
const liveClock = ref('')
let clockTimer = null
const updateClock = () => {
  liveClock.value = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}
onMounted(() => { updateClock(); clockTimer = setInterval(updateClock, 30000) })
onBeforeUnmount(() => { if (clockTimer) clearInterval(clockTimer) })

const firstName = computed(() => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    return (u?.full_name || u?.email || '').split(' ')[0] || 'there'
  } catch { return 'there' }
})

const greetingPart = computed(() => {
  const h = new Date().getHours()
  if (h < 5)  return 'Late night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})

const greetingWords = computed(() =>
  `${greetingPart.value}, ${firstName.value} — here's your time`.split(/\s+/)
)

const fyLabel = computed(() => {
  const d = new Date()
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
  return `${y}-${String(y + 1).slice(-2)}`
})

// ─────────────────────────────────────────────────────────────────────
// Balance derivatives
// ─────────────────────────────────────────────────────────────────────
const totalRemaining = computed(() =>
  balances.value.reduce((a, b) => a + Number(b.closing_balance || 0), 0).toFixed(1)
)
const totalUsed = computed(() =>
  balances.value.reduce((a, b) => a + Number(b.used || 0), 0).toFixed(1)
)
const totalQuota = computed(() =>
  balances.value.reduce((a, b) => a + Number(b.quota || 0), 0).toFixed(0)
)
const activeTypes = computed(() => balances.value.filter(b => Number(b.quota || 0) > 0).length)
const gaugeUsedRatio = computed(() => {
  const q = Number(totalQuota.value) || 1
  return Math.min(1, Number(totalUsed.value) / q)
})
const gaugeRemRatio = computed(() => 1 - gaugeUsedRatio.value)

// Animated total countup (cheap, deterministic)
const animatedTotal = computed(() => {
  const v = Number(totalRemaining.value) || 0
  const int = Math.floor(v)
  const frac = String(Math.round((v - int) * 10))
  return { int, frac }
})

// Lightweight inline CountUp component
const CountUp = {
  props: { value: { type: Number, required: true }, decimals: { type: Number, default: 0 } },
  setup(props) {
    const v = ref(0)
    let raf = null
    const animate = () => {
      const start = performance.now()
      const dur = 900
      const from = v.value
      const to = props.value
      const tick = (t) => {
        const p = Math.min(1, (t - start) / dur)
        const eased = 1 - Math.pow(1 - p, 3)
        v.value = from + (to - from) * eased
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    onMounted(animate)
    onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })
    return () => h('span', v.value.toFixed(props.decimals))
  },
}

const balanceFilters = [
  { key: 'all',       label: 'All',         icon: Layers },
  { key: 'positive',  label: 'Has balance', icon: TrendingUp },
  { key: 'used',      label: 'Used in FY',  icon: BarChart2 },
  { key: 'zero',      label: 'Empty',       icon: AlertTriangle },
]

const visibleBalances = computed(() => {
  switch (balanceFilter.value) {
    case 'positive': return balances.value.filter(b => Number(b.closing_balance || 0) > 0)
    case 'used':     return balances.value.filter(b => Number(b.used || 0) > 0)
    case 'zero':     return balances.value.filter(b => Number(b.closing_balance || 0) === 0 && Number(b.quota || 0) === 0)
    default:         return balances.value
  }
})

const utilPct = (b) => {
  const q = Number(b.quota || 0)
  if (q <= 0) return 0
  return Math.min(100, Math.round((Number(b.used || 0) / q) * 100))
}

const balanceTone = (b) => {
  const rem = Number(b.closing_balance || 0)
  const q = Number(b.quota || 0)
  if (q <= 0) return 'no-quota'
  if (rem === 0) return 'depleted'
  if (rem / q < 0.3) return 'low'
  if (rem / q > 0.7) return 'healthy'
  return 'normal'
}

// ─────────────────────────────────────────────────────────────────────
// Hero stat strip
// ─────────────────────────────────────────────────────────────────────
const usedThisMonth = computed(() => {
  const now = new Date()
  const m = now.getMonth(), y = now.getFullYear()
  return requests.value
    .filter(r => r.status === 'APPROVED' && r.from_date)
    .filter(r => {
      const d = new Date(r.from_date)
      return d.getMonth() === m && d.getFullYear() === y
    })
    .reduce((a, r) => a + Number(r.total_days || 0), 0)
    .toFixed(1)
})
const pendingReview = computed(() =>
  requests.value.filter(r => ['PENDING_MANAGER', 'PENDING_HR'].includes(r.status)).length
)
const upcomingApproved = computed(() => {
  const today = new Date(); today.setHours(0,0,0,0)
  return requests.value.filter(r => r.status === 'APPROVED' && r.from_date && new Date(r.from_date) >= today).length
})

// Per-month-of-FY usage histogram (12 buckets, April through March)
const monthlyUsage = computed(() => {
  const fyStart = Number(fyLabel.value.split('-')[0])
  const buckets = Array(12).fill(0)
  for (const r of requests.value) {
    if (r.status !== 'APPROVED' || !r.from_date) continue
    const d = new Date(r.from_date)
    const mIdx = (d.getMonth() - 3 + 12) % 12  // April = 0
    const yOk = (d.getMonth() >= 3 && d.getFullYear() === fyStart) ||
                (d.getMonth() <  3 && d.getFullYear() === fyStart + 1)
    if (yOk) buckets[mIdx] += Number(r.total_days || 0)
  }
  return buckets
})

// Build SVG path strings for an array of values. Output: { line, area, dotX }
const buildSpark = (values, { w = 120, h = 22, pad = 2 } = {}) => {
  const arr = values.length ? values : [0]
  const max = Math.max(1, ...arr)
  const stepX = (w - pad * 2) / Math.max(1, arr.length - 1)
  const pts = arr.map((v, i) => {
    const x = pad + i * stepX
    const y = pad + (h - pad * 2) * (1 - v / max)
    return [x, y]
  })
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ')
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(2)} ${h - pad} L ${pts[0][0].toFixed(2)} ${h - pad} Z`
  const dotX = pts[pts.length - 1][0]
  return { line, area, dotX }
}

// Synthesise a smooth wave for purely "informational" stats with no time series
const wave = (peak, length = 12, ampl = 0.6, phase = 0) =>
  Array.from({ length }, (_, i) =>
    peak * Math.max(0.08, 0.5 + ampl * Math.sin((i / (length - 1)) * Math.PI * 1.4 + phase))
  )

const heroStats = computed(() => {
  const usedSpark = buildSpark(monthlyUsage.value)
  const monthSpark = buildSpark(wave(Math.max(1, Number(usedThisMonth.value)), 12, 0.55, 0.4))
  const pendingSpark = buildSpark(wave(Math.max(1, pendingReview.value), 12, 0.45, 1.2))
  const upcomingSpark = buildSpark(wave(Math.max(1, upcomingApproved.value), 12, 0.50, 2.1))

  return [
    {
      key: 'used',
      label: 'Used in FY',
      icon: BarChart2,
      value: totalUsed.value,
      unit: 'd',
      meta: `${gaugeUsedRatio.value === 0 ? '0' : (gaugeUsedRatio.value * 100).toFixed(0)}% of quota`,
      fill: Math.min(100, gaugeUsedRatio.value * 100),
      tone: 'orange',
      trend: 'up',
      trendValue: `${(gaugeUsedRatio.value * 100).toFixed(0)}%`,
      sparkColors: ['#fb923c', '#ea580c'],
      sparkLine: usedSpark.line,
      sparkArea: usedSpark.area,
      sparkDotX: usedSpark.dotX,
    },
    {
      key: 'month',
      label: 'This month',
      icon: CalendarRange,
      value: usedThisMonth.value,
      unit: 'd',
      meta: 'consumed so far',
      fill: Math.min(100, (Number(usedThisMonth.value) / 5) * 100),
      tone: 'gold',
      trend: Number(usedThisMonth.value) > 0 ? 'up' : 'flat',
      trendValue: `${usedThisMonth.value}d`,
      sparkColors: ['#fbbf24', '#f59e0b'],
      sparkLine: monthSpark.line,
      sparkArea: monthSpark.area,
      sparkDotX: monthSpark.dotX,
    },
    {
      key: 'pending',
      label: 'Pending review',
      icon: Hourglass,
      value: String(pendingReview.value),
      unit: '',
      meta: pendingReview.value ? 'waiting on Mgr / HR' : 'inbox zero',
      fill: pendingReview.value ? 100 : 0,
      tone: 'amber',
      trend: pendingReview.value ? 'up' : 'flat',
      trendValue: pendingReview.value ? `${pendingReview.value}` : '0',
      sparkColors: ['#fde047', '#ca8a04'],
      sparkLine: pendingSpark.line,
      sparkArea: pendingSpark.area,
      sparkDotX: pendingSpark.dotX,
    },
    {
      key: 'upcoming',
      label: 'Upcoming approved',
      icon: Plane,
      value: String(upcomingApproved.value),
      unit: '',
      meta: upcomingApproved.value ? 'planned breaks' : 'none scheduled',
      fill: Math.min(100, upcomingApproved.value * 25),
      tone: 'success',
      trend: upcomingApproved.value ? 'up' : 'flat',
      trendValue: upcomingApproved.value ? `+${upcomingApproved.value}` : '0',
      sparkColors: ['#5eead4', '#0d9488'],
      sparkLine: upcomingSpark.line,
      sparkArea: upcomingSpark.area,
      sparkDotX: upcomingSpark.dotX,
    },
  ]
})

// ─────────────────────────────────────────────────────────────────────
// Quick actions
// ─────────────────────────────────────────────────────────────────────
const quickActions = [
  { key: 'CASUAL', label: 'Casual',  icon: Sun },
  { key: 'SICK',   label: 'Sick',    icon: AlertTriangle },
  { key: 'EARNED', label: 'Earned',  icon: Plane },
]
const onQuickAction = (type) => {
  applyDefaultType.value = type
  applyOpen.value = true
}
const onApplyForType = (type) => {
  applyDefaultType.value = type
  applyOpen.value = true
}

// ─────────────────────────────────────────────────────────────────────
// Approver chain
// ─────────────────────────────────────────────────────────────────────
const approverNames = computed(() => {
  // First request that has a manager_name is our best clue; else default.
  const mgr = requests.value.find(r => r.manager_name)?.manager_name
  const hr  = requests.value.find(r => r.hr_name)?.hr_name
  return { manager: mgr, hr }
})

// ─────────────────────────────────────────────────────────────────────
// Shift — drives heatmap week-off colouring (Python weekday: 0=Mon..6=Sun)
// ─────────────────────────────────────────────────────────────────────
const currentShift = ref(null)

const loadCurrentShift = async () => {
  try {
    const res = await axios.get(`${API}/hr/shifts/me/current`, { headers: authHeader() })
    currentShift.value = res.data || null
  } catch {
    currentShift.value = null
  }
}

// Set of Python-style weekday indices (0=Mon..6=Sun) considered off-days.
// Falls back to Saturday + Sunday only if the user has no shift assigned —
// matches the backend Shift model default. The earlier hardcoded "Sun + Sat"
// (JS getDay() === 0 || 6) was treating SATURDAY as off even for shifts that
// only mark Sunday off, which is exactly the bug the user reported.
const weeklyOffSet = computed(() => {
  const arr = currentShift.value?.weekly_off_days
  if (Array.isArray(arr) && arr.length) return new Set(arr.map(Number))
  return new Set([5, 6])
})

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const weeklyOffLabel = computed(() => {
  const set = weeklyOffSet.value
  const names = DAY_NAMES.filter((_, i) => set.has(i))
  return names.length ? names.join(' + ') : 'none'
})

// Convert JS Date.getDay() (0=Sun..6=Sat) → Python weekday (0=Mon..6=Sun)
const pyWeekday = (jsDate) => (jsDate.getDay() + 6) % 7

const STATUS_META = {
  approved:     { label: 'Approved',       accent: '#fbbf24', icon: CheckCircle2 },
  'pending-hr': { label: 'Pending HR',     accent: '#f59e0b', icon: Hourglass },
  'pending-mgr':{ label: 'Pending Manager',accent: '#fb923c', icon: UserCheck },
  rejected:     { label: 'Rejected',       accent: '#f87171', icon: XOctagon },
  weekend:      { label: 'Week-off',       accent: '#94a3b8', icon: BedDouble },
  work:         { label: 'Working day',    accent: '#fbbf24', icon: Briefcase },
  today:        { label: 'Today',          accent: '#fde047', icon: Sparkles },
  none:         { label: '',               accent: 'transparent', icon: Sparkles },
}

// ─────────────────────────────────────────────────────────────────────
// Heatmap — current FY (Apr to Mar) grid, shift-aware week-off
// ─────────────────────────────────────────────────────────────────────
// Local-calendar ISO (YYYY-MM-DD). `new Date(y,m,d).toISOString()` is UTC and
// in IST (UTC+5:30) rolls a cell back a day, so a 01-Jun leave matches the
// 02-Jun cell. Build the key from local parts so cell ↔ leave dates line up.
const toLocalISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const heatmap = computed(() => {
  const startY = Number(fyLabel.value.split('-')[0])
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayIso = toLocalISO(today)
  const months = []
  // April–December of startY, then Jan–March of startY+1
  for (let m = 3; m < 15; m++) {
    const realY = m < 12 ? startY : startY + 1
    const realM = m % 12
    const daysInMonth = new Date(realY, realM + 1, 0).getDate()
    const cells = []
    for (let d = 1; d <= 31; d++) {
      if (d > daysInMonth) {
        cells.push({ kind: 'none', color: 'transparent', dateIso: '', dateLabel: '', weekday: '', subText: '' })
        continue
      }
      const dt = new Date(realY, realM, d)
      const isoDay = toLocalISO(dt)
      const isToday = isoDay === todayIso
      // Match against requests — first hit wins
      let match = null
      for (const r of requests.value) {
        if (!r.from_date || !r.to_date) continue
        if (isoDay >= r.from_date && isoDay <= r.to_date) { match = r; break }
      }
      const dateLabel = dt.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
      const weekdayFull = DAY_NAMES_FULL[pyWeekday(dt)]

      if (match) {
        let kind
        if (match.status === 'APPROVED')             kind = 'approved'
        else if (match.status === 'PENDING_HR')      kind = 'pending-hr'
        else if (match.status === 'PENDING_MANAGER') kind = 'pending-mgr'
        else if (['REJECTED', 'MANAGER_REJECTED'].includes(match.status)) kind = 'rejected'
        else                                          kind = 'work'
        const meta = STATUS_META[kind]
        cells.push({
          kind,
          color: kind === 'rejected' ? 'rgba(248,113,113,0.55)' : meta.accent,
          dateIso: isoDay, dateLabel, weekday: weekdayFull,
          isToday,
          leave: match,
          accent: meta.accent,
          statusLabel: meta.label,
          icon: meta.icon,
          subText: `${typeMeta(match.leave_type).label} · ${meta.label}`,
        })
      } else if (weeklyOffSet.value.has(pyWeekday(dt))) {
        const meta = STATUS_META.weekend
        cells.push({
          kind: 'weekend',
          color: 'rgba(148,163,184,0.30)',
          dateIso: isoDay, dateLabel, weekday: weekdayFull, isToday,
          accent: meta.accent,
          statusLabel: meta.label,
          icon: meta.icon,
          subText: `${weekdayFull} · scheduled week-off per your shift`,
        })
      } else {
        const meta = STATUS_META.work
        cells.push({
          kind: 'work',
          color: 'rgba(251,191,36,0.06)',
          dateIso: isoDay, dateLabel, weekday: weekdayFull, isToday,
          accent: meta.accent,
          statusLabel: isToday ? 'Today' : meta.label,
          icon: isToday ? STATUS_META.today.icon : meta.icon,
          subText: isToday ? 'A regular working day for your shift' : 'Working day per your shift',
        })
      }
    }
    const dt = new Date(realY, realM, 1)
    months.push({
      month: dt.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      short: dt.toLocaleString('en-IN', { month: 'short' }) + (realM === 0 ? ` '${String(realY).slice(-2)}` : ''),
      cells,
    })
  }
  const totalDays = months.reduce(
    (a, mo) => a + mo.cells.filter(c => ['approved', 'pending-hr', 'pending-mgr', 'rejected'].includes(c.kind)).length,
    0,
  )
  return { rows: months, totalDays }
})

// ─────────────────────────────────────────────────────────────────────
// Heatmap tooltip — teleported, position-tracked
// ─────────────────────────────────────────────────────────────────────
const tooltipCell = ref(null)
const tooltipPos = ref({ x: 0, y: 0 })

const positionTooltip = (clientX, clientY) => {
  // Offset slightly so the tooltip never sits under the cursor.
  const PADDING = 14
  const TIP_W = 320
  const TIP_H = 200
  let x = clientX + PADDING
  let y = clientY + PADDING
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (x + TIP_W > vw - 8) x = clientX - TIP_W - PADDING
  if (y + TIP_H > vh - 8) y = clientY - TIP_H - PADDING
  if (x < 8) x = 8
  if (y < 8) y = 8
  tooltipPos.value = { x, y }
}

const onHeatCellEnter = (cell, e) => {
  if (cell.kind === 'none') return
  tooltipCell.value = cell
  positionTooltip(e.clientX, e.clientY)
}
const onHeatCellMove = (e) => {
  if (!tooltipCell.value) return
  positionTooltip(e.clientX, e.clientY)
}
const onHeatCellLeave = () => { tooltipCell.value = null }

// ─────────────────────────────────────────────────────────────────────
// Recent requests
// ─────────────────────────────────────────────────────────────────────
const statusFilters = [
  { key: 'all',     label: 'All',      icon: Layers },
  { key: 'pending', label: 'Pending',  icon: Hourglass },
  { key: 'approved',label: 'Approved', icon: CheckCircle2 },
  { key: 'declined',label: 'Declined', icon: X },
]
const requestCount = (key) => {
  if (key === 'all') return requests.value.length
  if (key === 'pending') return requests.value.filter(r => ['PENDING_MANAGER','PENDING_HR','DRAFT'].includes(r.status)).length
  if (key === 'approved') return requests.value.filter(r => r.status === 'APPROVED').length
  if (key === 'declined') return requests.value.filter(r => ['REJECTED','MANAGER_REJECTED','CANCELLED','WITHDRAWN'].includes(r.status)).length
  return 0
}
const filteredRequests = computed(() => {
  if (requestFilter.value === 'all') return requests.value
  const map = {
    pending:  ['PENDING_MANAGER','PENDING_HR','DRAFT'],
    approved: ['APPROVED'],
    declined: ['REJECTED','MANAGER_REJECTED','CANCELLED','WITHDRAWN'],
  }
  const allowed = map[requestFilter.value] || []
  return requests.value.filter(r => allowed.includes(r.status))
})

// ─────────────────────────────────────────────────────────────────────
// Pagination over filteredRequests — keeps the page from ballooning when
// the user has dozens of leave requests in flight.
// ─────────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]
const reqPage = ref(1)
const reqPageSize = ref(5)
// Reset to page 1 whenever the filter or page-size changes, otherwise the
// user can get stuck on an "empty" page after switching tabs.
watch([requestFilter, reqPageSize], () => { reqPage.value = 1 })
// If the live data shrinks (request withdrawn, refresh) and the current
// page no longer exists, snap back to the last valid page.
watch(() => filteredRequests.value.length, (len) => {
  const totalPages = Math.max(1, Math.ceil(len / reqPageSize.value))
  if (reqPage.value > totalPages) reqPage.value = totalPages
})
const totalReqPages = computed(() =>
  Math.max(1, Math.ceil(filteredRequests.value.length / reqPageSize.value))
)
const pagedRequests = computed(() => {
  const start = (reqPage.value - 1) * reqPageSize.value
  return filteredRequests.value.slice(start, start + reqPageSize.value)
})
// Smart truncated page list: first, last, current ±1, with "…" gaps.
// Always renders an array of either page numbers or the string '…'.
const pageWindow = computed(() => {
  const t = totalReqPages.value
  const c = reqPage.value
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1)
  const set = new Set([1, t, c - 1, c, c + 1])
  if (c <= 4)      [2, 3, 4, 5].forEach(n => set.add(n))
  if (c >= t - 3)  [t - 4, t - 3, t - 2, t - 1].forEach(n => set.add(n))
  const sorted = Array.from(set).filter(n => n >= 1 && n <= t).sort((a, b) => a - b)
  const out = []
  for (let i = 0; i < sorted.length; i++) {
    out.push(sorted[i])
    if (i < sorted.length - 1 && sorted[i + 1] - sorted[i] > 1) out.push('…')
  }
  return out
})
const reqRangeLabel = computed(() => {
  const total = filteredRequests.value.length
  if (!total) return '0 requests'
  const start = (reqPage.value - 1) * reqPageSize.value + 1
  const end = Math.min(total, start + reqPageSize.value - 1)
  return `${start}–${end} of ${total}`
})
const requestsSectionRef = ref(null)
const goToPage = (n) => {
  const next = Math.max(1, Math.min(totalReqPages.value, Number(n) || 1))
  if (next === reqPage.value) return
  reqPage.value = next
  // Smoothly scroll the section into view if the user has scrolled the
  // list down; keeps the viewport anchored so they don't lose their place.
  if (requestsSectionRef.value?.scrollIntoView) {
    requestsSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// ─────────────────────────────────────────────────────────────────────
// Insights
// ─────────────────────────────────────────────────────────────────────
const insights = computed(() => {
  const out = []
  const earnedRow = balances.value.find(b => b.leave_type === 'EARNED')
  const sickRow   = balances.value.find(b => b.leave_type === 'SICK')

  if (earnedRow && Number(earnedRow.closing_balance) >= 8) {
    out.push({
      tone: 'gold',
      icon: Plane,
      title: `${earnedRow.closing_balance} earned leaves available`,
      text: 'Consider planning a break — you have more than a week banked.',
    })
  }
  if (pendingReview.value > 0) {
    out.push({
      tone: 'amber',
      icon: Hourglass,
      title: `${pendingReview.value} request${pendingReview.value === 1 ? '' : 's'} pending`,
      text: 'Your application is moving through the approval chain.',
    })
  }
  if (sickRow && Number(sickRow.closing_balance) === 0 && Number(sickRow.quota || 0) > 0) {
    out.push({
      tone: 'ember',
      icon: AlertTriangle,
      title: 'Sick leave balance is depleted',
      text: 'Any additional sick days will count as LWP unless reviewed.',
    })
  }
  if (myCompOff.value.some(c => !c.is_expired && c.days_until_expiry !== null && c.days_until_expiry <= 14)) {
    out.push({
      tone: 'ember',
      icon: Clock,
      title: 'Comp-off expiring soon',
      text: 'Use it within two weeks or it will lapse.',
    })
  }
  if (upcomingApproved.value > 0) {
    out.push({
      tone: 'success',
      icon: Sparkles,
      title: `${upcomingApproved.value} upcoming break${upcomingApproved.value === 1 ? '' : 's'}`,
      text: 'Approved leaves will flip your attendance automatically.',
    })
  }
  return out.slice(0, 4)
})

// ─────────────────────────────────────────────────────────────────────
// Comp-off derivatives
// ─────────────────────────────────────────────────────────────────────
const activeCompOffDays = computed(() =>
  myCompOff.value
    .filter(c => !c.is_expired)
    .reduce((a, c) => a + Number(c.days || 0), 0)
)

// ─────────────────────────────────────────────────────────────────────
// Data fetch
// ─────────────────────────────────────────────────────────────────────
const isUnlinkedError = (e) =>
  e?.response?.status === 404 &&
  /No employee profile linked/i.test(e?.response?.data?.detail || '')

const loadBalance = async () => {
  loadingBalance.value = true
  try {
    const data = await fetchMyBalance()
    balances.value = data.items || []
    if (data.unlinked) unlinked.value = true
  } catch (e) {
    if (isUnlinkedError(e)) { unlinked.value = true; balances.value = [] }
    else toast.error(e?.response?.data?.detail || 'Failed to load balance')
  } finally { loadingBalance.value = false }
}
const loadRequests = async () => {
  loading.value = true
  try {
    const data = await fetchMyLeaves({ limit: 50 })
    requests.value = data.items || []
    if (data.unlinked) unlinked.value = true
  } catch (e) {
    if (isUnlinkedError(e)) { unlinked.value = true; requests.value = [] }
    else toast.error(e?.response?.data?.detail || 'Failed to load requests')
  } finally { loading.value = false }
}
const loadCompOff = async () => {
  try { myCompOff.value = (await fetchMyCompOff()).items || [] }
  catch { myCompOff.value = [] }
}
const loadEncashment = async () => {
  try { myEncashment.value = (await fetchMyEncashment()).items || [] }
  catch { myEncashment.value = [] }
}
const reloadAll = async () => {
  unlinked.value = false
  await Promise.all([loadBalance(), loadRequests(), loadCompOff(), loadEncashment(), loadCurrentShift()])
}
onMounted(reloadAll)

const onSubmitted = () => { applyOpen.value = false; applyDefaultType.value = null; reloadAll() }

// ── Encashment (self-service) ──
const onEncashSubmitted = () => { encashOpen.value = false; loadEncashment() }
const encashStatusMeta = (s) => ENCASHMENT_STATUSES.find(x => x.key === s) || { label: s, tone: 'cancelled' }
const inrShort = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const cancelEncash = async (e) => {
  if (!confirm(`Withdraw encashment ${e.reference_no}?`)) return
  try {
    await cancelMyEncashment(e.id)
    toast.success('Encashment request withdrawn')
    loadEncashment()
  } catch (err) { toast.error(err?.response?.data?.detail || 'Could not withdraw') }
}

const withdraw = async (r) => {
  if (!confirm(`Withdraw ${r.reference_no}?`)) return
  try {
    await withdrawMyLeave(r.id, 'Withdrawn from self-service')
    toast.success('Request withdrawn')
    reloadAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Withdraw failed') }
}

const detailOpen = ref(false)
const detailLeave = ref(null)
const openDetail = (r) => {
  detailLeave.value = r
  detailOpen.value = true
}
const closeDetail = () => {
  detailOpen.value = false
  // Hold onto the row briefly so the leave-out animation has data to render
  setTimeout(() => { detailLeave.value = null }, 350)
}

// ─── Proof upload modal ───────────────────────────────────────────────
// HR can request supporting documents on a leave; this modal handles the
// upload flow. `leave` is held briefly after close so the exit animation
// has data to render against.
const proofUploadModal = ref({ open: false, leave: null })
const openProofUpload = (r) => {
  proofUploadModal.value = { open: true, leave: r }
}

// ─────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'
const fmtRange = (a, b) => a === b ? fmtDate(a) : `${fmtDate(a)} → ${fmtDate(b)}`
const relTime = (v) => {
  if (!v) return ''
  const m = (Date.now() - new Date(v).getTime()) / 60000
  if (m < 60) return `${Math.floor(m)}m ago`
  if (m < 1440) return `${Math.floor(m/60)}h ago`
  return `${Math.floor(m/1440)}d ago`
}
const truncate = (s, n) => (s || '').length > n ? (s || '').slice(0, n - 1) + '…' : (s || '')
</script>

<style scoped>
@import '@/styles/leave-theme.css';

/* ════════════════════════════════════════════════════════════════════════════
   PAGE WRAPPER + AMBIENT BACKDROP
   ════════════════════════════════════════════════════════════════════════════ */
.ssl-page {
  position: relative;
  display: flex; flex-direction: column; gap: 26px;
  padding: 28px 32px 80px;
  max-width: 1480px;
  margin: 0 auto;
  color: var(--leave-text, var(--hr-text));
  isolation: isolate;
}

.ssl-backdrop {
  position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none;
}
.ssl-backdrop .bd-aurora {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.55;
  will-change: transform;
}
.ssl-backdrop .bd-a {
  width: 520px; height: 520px; top: -200px; left: 30%;
  background: radial-gradient(circle, rgba(251,191,36,0.45), transparent 65%);
  animation: ssl-aurora-a 22s ease-in-out infinite;
}
.ssl-backdrop .bd-b {
  width: 460px; height: 460px; bottom: -180px; right: -120px;
  background: radial-gradient(circle, rgba(234,88,12,0.40), transparent 65%);
  animation: ssl-aurora-b 26s ease-in-out infinite;
}
.ssl-backdrop .bd-c {
  width: 360px; height: 360px; top: 40%; left: -120px;
  background: radial-gradient(circle, rgba(20,184,166,0.18), transparent 65%);
  animation: ssl-aurora-c 28s ease-in-out infinite;
}
@keyframes ssl-aurora-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px,40px) scale(1.08); } }
@keyframes ssl-aurora-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-30px) scale(1.10); } }
@keyframes ssl-aurora-c { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(20px,20px) scale(0.95); } }

.ssl-backdrop .bd-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(251, 191, 36, 0.05) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 70%);
}
[data-theme="light"] .ssl-backdrop .bd-grid {
  background-image: radial-gradient(rgba(120, 53, 15, 0.07) 1px, transparent 1px);
}
.ssl-backdrop .bd-noise {
  position: absolute; inset: 0;
  background: repeating-conic-gradient(rgba(255, 255, 255, 0.01) 0deg 12deg, transparent 12deg 24deg);
  opacity: 0.3;
}
.ssl-backdrop .bd-scan {
  position: absolute; left: 0; right: 0; height: 140px;
  background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.10), transparent);
  filter: blur(20px);
  animation: ssl-scan 9s linear infinite;
  pointer-events: none;
}
@keyframes ssl-scan {
  0%   { transform: translateY(-30%); opacity: 0; }
  10%  { opacity: 0.8; }
  90%  { opacity: 0.8; }
  100% { transform: translateY(120vh); opacity: 0; }
}

/* Unlinked banner */
.ssl-unlinked {
  display: flex; gap: 14px; align-items: flex-start;
  padding: 14px 18px;
  border-radius: 16px;
  background: radial-gradient(120% 80% at 0% 0%, rgba(245, 158, 11, 0.18), transparent 55%), linear-gradient(180deg, rgba(40, 28, 14, 0.72), rgba(28, 20, 10, 0.78));
  border: 1px solid rgba(245, 158, 11, 0.32);
  box-shadow: inset 4px 0 0 -1px rgba(245, 158, 11, 0.75);
}
[data-theme="light"] .ssl-unlinked {
  background: radial-gradient(120% 80% at 0% 0%, rgba(245, 158, 11, 0.22), transparent 55%), rgba(255, 248, 232, 0.95);
  border-color: rgba(180, 83, 9, 0.30);
}
.ssl-unlinked-ico {
  display: grid; place-items: center;
  width: 38px; height: 38px; border-radius: 11px;
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.25), rgba(251, 191, 36, 0.15));
  border: 1px solid rgba(251, 191, 36, 0.35);
  color: #fbbf24;
  flex-shrink: 0;
}
.ssl-unlinked strong { font-size: 13.5px; color: var(--hr-text); display: block; margin-bottom: 3px; }
.ssl-unlinked span { font-size: 11.5px; color: var(--hr-text-muted); }

/* ════════════════════════════════════════════════════════════════════════════
   HERO
   ════════════════════════════════════════════════════════════════════════════ */
.ssl-hero {
  position: relative;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  grid-template-areas:
    "head gauge"
    "stats stats";
  gap: 28px 32px;
  padding: 38px 40px 32px;
  border-radius: 28px;
  background:
    radial-gradient(80% 60% at 0% 0%, rgba(251, 191, 36, 0.22), transparent 65%),
    radial-gradient(70% 60% at 100% 100%, rgba(234, 88, 12, 0.20), transparent 65%),
    radial-gradient(50% 50% at 50% 50%, rgba(20, 184, 166, 0.06), transparent 70%),
    linear-gradient(180deg, rgba(20, 14, 8, 0.78), rgba(28, 18, 10, 0.82));
  border: 1px solid rgba(251, 191, 36, 0.26);
  box-shadow: 0 40px 100px -40px rgba(120, 53, 15, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  overflow: hidden;
  isolation: isolate;
}
[data-theme="light"] .ssl-hero {
  background:
    radial-gradient(80% 60% at 0% 0%, rgba(251, 191, 36, 0.22), transparent 65%),
    radial-gradient(70% 60% at 100% 100%, rgba(234, 88, 12, 0.18), transparent 65%),
    radial-gradient(50% 50% at 50% 50%, rgba(20, 184, 166, 0.10), transparent 70%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 244, 218, 0.96));
  border-color: rgba(180, 83, 9, 0.26);
  box-shadow: 0 32px 64px -36px rgba(120, 53, 15, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
@media (max-width: 1100px) {
  .ssl-hero { grid-template-columns: 1fr; grid-template-areas: "head" "gauge" "stats"; }
}

.hero-head { grid-area: head; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.hero-eye {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase;
  color: #fde68a;
  align-self: flex-start;
  padding: 6px 12px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.26);
  border-radius: 999px;
  backdrop-filter: blur(8px);
}
[data-theme="light"] .hero-eye {
  color: #b45309;
  background: rgba(251, 191, 36, 0.18);
  border-color: rgba(180, 83, 9, 0.26);
}
.eye-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #fbbf24; box-shadow: 0 0 8px rgba(251, 191, 36, 0.85);
  animation: ssl-eye-pulse 1.8s ease-in-out infinite;
}
@keyframes ssl-eye-pulse {
  0%,100% { opacity: 0.7; transform: scale(1); }
  50%     { opacity: 1; transform: scale(1.5); }
}
.eye-divider { width: 1px; height: 10px; background: currentColor; opacity: 0.4; }

.hero-title {
  margin: 0;
  font-size: clamp(28px, 4.4vw, 46px);
  font-weight: 900; letter-spacing: -0.025em; line-height: 1.06;
  display: inline-flex; flex-wrap: wrap; gap: 10px 14px;
}
.title-word {
  background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 40%, #f59e0b 70%, #fb923c 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  opacity: 0; transform: translateY(20px);
  animation: ssl-title-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
[data-theme="light"] .title-word {
  background: linear-gradient(135deg, #92400e 0%, #d97706 50%, #c2410c 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
@keyframes ssl-title-in {
  to { opacity: 1; transform: translateY(0); }
}

.hero-sub { margin: 4px 0 0; display: flex; flex-direction: column; gap: 8px; max-width: 540px; }
.sub-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.16), rgba(234, 88, 12, 0.08));
  border: 1px solid rgba(251, 191, 36, 0.32);
  font-size: 13px; color: var(--hr-text);
  align-self: flex-start;
}
[data-theme="light"] .sub-pill {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(255, 250, 240, 0.7));
  border-color: rgba(180, 83, 9, 0.30);
  color: #3a1f0b;
}
.sub-pill strong {
  font-size: 16px; font-weight: 900; letter-spacing: -0.005em;
  background: linear-gradient(135deg, #fbbf24, #fb923c);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.sub-dot { width: 7px; height: 7px; border-radius: 50%; background: #fb923c; box-shadow: 0 0 6px rgba(251, 146, 60, 0.7); }
.sub-tail { font-size: 12.5px; color: var(--hr-text-muted); }
.sub-tail em { color: #fbbf24; font-style: normal; font-weight: 700; }
[data-theme="light"] .sub-tail em { color: #b45309; }

/* Gauge ====================================================================== */
.hero-gauge-wrap {
  grid-area: gauge;
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 18px;
  min-height: 360px;
}
.hero-gauge {
  position: relative;
  width: 320px; height: 320px;
  display: grid; place-items: center;
}
.gauge-svg {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
}
.gauge-ticks { animation: ssl-tick-spin 90s linear infinite; transform-origin: 180px 180px; }
@keyframes ssl-tick-spin { to { transform: rotate(360deg); } }
.gauge-used  { transition: stroke-dashoffset 1.2s var(--leave-ease, cubic-bezier(0.16,1,0.3,1)); filter: drop-shadow(0 0 12px rgba(234, 88, 12, 0.45)); }
.gauge-rem   { transition: stroke-dashoffset 1.4s var(--leave-ease, cubic-bezier(0.16,1,0.3,1)); filter: drop-shadow(0 0 14px rgba(251, 191, 36, 0.55)); }
.gauge-orbit {
  transform-origin: 180px 180px;
  animation: ssl-gauge-orbit 14s linear infinite;
}
@keyframes ssl-gauge-orbit { to { transform: rotate(360deg); } }

.gauge-center {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  text-align: center;
}
.gauge-eye {
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--hr-text-muted);
}
.gauge-num {
  font-size: 56px; font-weight: 900; letter-spacing: -0.035em; line-height: 1;
  background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 50%, #fb923c 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-flex; align-items: baseline; gap: 0;
  font-variant-numeric: tabular-nums;
}
[data-theme="light"] .gauge-num {
  background: linear-gradient(135deg, #b45309, #c2410c);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.num-frac { font-size: 24px; opacity: 0.65; }
.gauge-divider {
  width: 50px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.6), transparent);
}
.gauge-tail {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
  color: var(--hr-text-muted);
}
.tail-used { color: #fb923c; }
[data-theme="light"] .tail-used { color: #c2410c; }
.tail-dot { width: 4px; height: 4px; border-radius: 50%; background: currentColor; opacity: 0.4; }
.tail-quota { color: var(--hr-text-secondary, var(--hr-text-muted)); }

.halo {
  position: absolute; border-radius: 50%;
  border: 1px solid rgba(251, 191, 36, 0.16);
  pointer-events: none;
}
.halo-1 { inset: -8px;  animation: ssl-halo 4s ease-out infinite; }
.halo-2 { inset: -20px; animation: ssl-halo 4s ease-out infinite 1.3s; }
.halo-3 { inset: -34px; animation: ssl-halo 4s ease-out infinite 2.6s; }
@keyframes ssl-halo {
  0%   { transform: scale(0.95); opacity: 0.7; }
  100% { transform: scale(1.18); opacity: 0; }
}

/* Hero actions — LEFT-aligned inside .hero-head, under the sub-pill */
.hero-actions {
  display: flex; align-items: center; flex-wrap: wrap;
  gap: 12px 14px;
  margin-top: 18px;
}
.hero-cta {
  position: relative;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 14px 24px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 35%, #f59e0b 70%, #fb923c 100%);
  background-size: 200% 200%;
  border: 1px solid rgba(251, 191, 36, 0.55);
  color: #1f1408;
  font: inherit;
  font-size: 13.5px; font-weight: 800; letter-spacing: 0.04em;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  box-shadow:
    0 18px 38px -10px rgba(251, 146, 60, 0.55),
    0 0 0 1px rgba(251, 191, 36, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.30);
  transition: background-position .35s, box-shadow .25s;
}
.hero-cta:hover:not(:disabled) {
  background-position: 100% 0;
  box-shadow:
    0 22px 46px -10px rgba(251, 146, 60, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
}
.hero-cta.is-disabled, .hero-cta:disabled { opacity: 0.5; cursor: not-allowed; }
.cta-flare {
  position: absolute; inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.45) 50%, transparent 70%);
  transform: translateX(-130%);
  animation: ssl-cta-flare 3s linear infinite;
  pointer-events: none;
}
@keyframes ssl-cta-flare { 0% { transform: translateX(-130%); } 60% { transform: translateX(130%); } 100% { transform: translateX(130%); } }
.cta-spark {
  position: absolute; top: -6px; right: -6px;
  width: 14px; height: 14px;
  background: radial-gradient(circle, #fff, rgba(255, 255, 255, 0));
  border-radius: 50%;
  filter: blur(2px);
  animation: ssl-spark 2.4s ease-in-out infinite;
}
@keyframes ssl-spark {
  0%, 100% { opacity: 0; transform: scale(0.5); }
  50%      { opacity: 1; transform: scale(1.4); }
}

.hero-quick {
  display: flex; gap: 6px; flex-wrap: wrap; align-items: center;
}
.hero-quick::before {
  content: 'or';
  font-size: 10px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--hr-text-muted);
  padding-right: 4px;
  opacity: 0.65;
}
.quick-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 11px;
  border-radius: 999px;
  background: rgba(40, 30, 22, 0.55);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-text-secondary, var(--hr-text-muted));
  font: inherit;
  font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
  cursor: pointer;
  transition: border-color .22s, color .22s, background .22s, transform .22s;
}
.quick-btn:hover:not(:disabled) {
  color: #fef3c7;
  border-color: rgba(251, 146, 60, 0.55);
  background: rgba(245, 158, 11, 0.18);
  transform: translateY(-1px);
}
.quick-btn:disabled { opacity: 0.45; cursor: not-allowed; }
[data-theme="light"] .quick-btn {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.22);
  color: #6b5840;
}
[data-theme="light"] .quick-btn:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.18);
  border-color: rgba(180, 83, 9, 0.40);
  color: #3a1f0b;
}

/* Stat strip */
.hero-stats {
  grid-area: stats;
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px;
}
@media (max-width: 900px) { .hero-stats { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 540px) { .hero-stats { grid-template-columns: 1fr; } }

.stat-tile {
  --tile-c1: #fbbf24;
  --tile-c2: #fb923c;
  position: relative;
  padding: 16px 18px 22px;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(28, 18, 10, 0.62), rgba(20, 14, 8, 0.82));
  border: 1px solid rgba(251, 191, 36, 0.20);
  overflow: hidden;
  isolation: isolate;
  display: flex; flex-direction: column; gap: 10px;
  cursor: default;
  transition: transform .35s var(--leave-ease, cubic-bezier(0.16,1,0.3,1)), border-color .25s, box-shadow .25s;
}
[data-theme="light"] .stat-tile {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 218, 0.94));
  border-color: rgba(180, 83, 9, 0.20);
}
.stat-tile:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--tile-c1) 55%, transparent);
  box-shadow: 0 26px 56px -26px color-mix(in srgb, var(--tile-c1) 60%, transparent);
}
.stat-tile.tone-orange  { --tile-c1: #fb923c; --tile-c2: #ea580c; }
.stat-tile.tone-gold    { --tile-c1: #fbbf24; --tile-c2: #f59e0b; }
.stat-tile.tone-amber   { --tile-c1: #fde047; --tile-c2: #ca8a04; }
.stat-tile.tone-success { --tile-c1: #5eead4; --tile-c2: #0d9488; }

/* Drifting corner glow */
.tile-glow {
  position: absolute; right: -80px; top: -80px;
  width: 220px; height: 220px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--tile-c1) 45%, transparent), transparent 70%);
  filter: blur(40px); opacity: 0.55;
  z-index: 0; pointer-events: none;
  transition: opacity .35s var(--leave-ease), transform .6s var(--leave-ease);
}
.stat-tile:hover .tile-glow { opacity: 0.85; transform: translate(-12px, 18px); }
/* Decorative orbital ring behind contents */
.tile-orbit {
  position: absolute; right: -120px; top: -120px;
  width: 320px; height: 320px; border-radius: 50%;
  border: 1px dashed color-mix(in srgb, var(--tile-c1) 26%, transparent);
  animation: tile-orbit-spin 70s linear infinite;
  z-index: 0; pointer-events: none;
}
@keyframes tile-orbit-spin { to { transform: rotate(360deg); } }

.tile-head {
  position: relative; z-index: 2;
  display: flex; justify-content: space-between; align-items: center;
  gap: 8px;
}
.tile-eye {
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--hr-text-muted);
}
.tile-trend {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 6px; border-radius: 999px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.06em;
  border: 1px solid;
  font-variant-numeric: tabular-nums;
}
.tile-trend.trend-up   { color: var(--tile-c1); background: color-mix(in srgb, var(--tile-c1) 16%, transparent); border-color: color-mix(in srgb, var(--tile-c1) 42%, transparent); }
.tile-trend.trend-down { color: #fda4af; background: rgba(244, 63, 94, 0.16); border-color: rgba(244, 63, 94, 0.42); }
.tile-trend.trend-flat { color: var(--hr-text-muted); background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.08); }
[data-theme="light"] .tile-trend.trend-flat { background: rgba(180, 83, 9, 0.10); border-color: rgba(180, 83, 9, 0.22); }

.tile-num-wrap {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 12px;
}
.tile-ico-wrap {
  position: relative;
  display: grid; place-items: center;
  width: 38px; height: 38px;
  border-radius: 12px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--tile-c1) 28%, transparent), color-mix(in srgb, var(--tile-c2) 10%, transparent));
  border: 1px solid color-mix(in srgb, var(--tile-c1) 38%, transparent);
  color: var(--tile-c1);
  flex-shrink: 0;
  isolation: isolate;
}
.tile-ico-ring {
  position: absolute; inset: -6px; border-radius: 16px;
  border: 1.4px solid color-mix(in srgb, var(--tile-c1) 50%, transparent);
  animation: tile-ring 3.4s ease-out infinite;
  pointer-events: none;
}
@keyframes tile-ring {
  0%   { transform: scale(0.85); opacity: 0.9; }
  100% { transform: scale(1.35); opacity: 0; }
}
.tile-ico { color: var(--tile-c1); }

.tile-num {
  display: flex; align-items: baseline; gap: 4px;
  line-height: 1;
}
.tile-num-val {
  font-size: 30px; font-weight: 900; letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, var(--tile-c1), var(--tile-c2));
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .tile-num-val {
  background: linear-gradient(135deg, var(--tile-c2), color-mix(in srgb, var(--tile-c2) 60%, #7c2d12));
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.tile-unit { font-size: 13px; font-weight: 700; color: var(--hr-text-muted); }

.tile-spark {
  position: relative; z-index: 2;
  width: 100%; height: 22px;
}
.spark-svg { width: 100%; height: 100%; display: block; overflow: visible; }
.spark-svg path { stroke-dasharray: 200; stroke-dashoffset: 200; animation: spark-draw 1.6s ease-out 0.3s forwards; }
.spark-svg path[fill]:not([fill="none"]) { stroke: none; opacity: 0; animation: spark-fade 0.9s ease-out 0.5s forwards; }
@keyframes spark-draw {
  to { stroke-dashoffset: 0; }
}
@keyframes spark-fade {
  to { opacity: 1; }
}

.tile-meta {
  position: relative; z-index: 2;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em;
  color: var(--hr-text-muted);
}

.tile-bar {
  position: absolute; left: 18px; right: 18px; bottom: 12px;
  height: 3px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 999px;
  overflow: hidden;
  z-index: 2;
}
[data-theme="light"] .tile-bar { background: rgba(180, 83, 9, 0.10); }
.tile-fill {
  display: block; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, var(--tile-c1), var(--tile-c2));
  transition: width 1.2s var(--leave-ease);
  position: relative; overflow: hidden;
}
.tile-fill::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
  animation: tile-fill-shine 2.4s linear infinite;
}
@keyframes tile-fill-shine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTIONS — shared
   ════════════════════════════════════════════════════════════════════════════ */
.ssl-section { display: flex; flex-direction: column; gap: 14px; }
.sec-head {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 18px;
  flex-wrap: wrap;
}
.sec-head .sec-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: #fbbf24;
}
[data-theme="light"] .sec-head .sec-eye { color: #b45309; }
.sec-head h2 {
  margin: 4px 0 0;
  font-size: 22px; font-weight: 800; letter-spacing: -0.02em;
  color: var(--hr-text);
}
.sec-aside { font-size: 11px; letter-spacing: 0.08em; color: var(--hr-text-muted); }
.sec-tools { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

.sec-filters {
  display: flex; gap: 5px;
  padding: 4px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(251, 191, 36, 0.14);
}
[data-theme="light"] .sec-filters {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.14);
}
.filter-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 11px;
  border-radius: 9px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--hr-text-muted);
  font: inherit; font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
  cursor: pointer;
  transition: background .22s, color .22s, border-color .22s;
}
.filter-chip:hover { background: rgba(255, 255, 255, 0.04); color: var(--hr-text); }
.filter-chip.active {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(217, 119, 6, 0.10));
  border-color: rgba(251, 191, 36, 0.55);
  color: #fbbf24;
}
[data-theme="light"] .filter-chip.active {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.30), rgba(255, 248, 232, 0.6));
  color: #b45309;
  border-color: rgba(180, 83, 9, 0.36);
}
.chip-count {
  display: inline-grid; place-items: center;
  min-width: 17px; height: 17px; padding: 0 5px;
  border-radius: 999px;
  font-size: 9px; font-weight: 800;
  background: rgba(0, 0, 0, 0.45);
  color: #fef3c7;
  margin-left: 2px;
}
[data-theme="light"] .chip-count { background: rgba(180, 83, 9, 0.22); color: #7c2d12; }

.sec-refresh {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 10px;
  background: rgba(40, 30, 22, 0.55);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-text);
  font: inherit; font-size: 11.5px; font-weight: 700;
  cursor: pointer;
  transition: border-color .22s, background .22s, color .22s;
}
.sec-refresh:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.18);
  border-color: rgba(251, 146, 60, 0.55);
}
[data-theme="light"] .sec-refresh {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.22);
  color: #3a1f0b;
}
.spin { animation: ssl-spin 1s linear infinite; }
@keyframes ssl-spin { to { transform: rotate(360deg); } }

/* ════════════════════════════════════════════════════════════════════════════
   BALANCE GRID (LEAVE TYPE CARDS)
   ════════════════════════════════════════════════════════════════════════════ */
.ssl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.bcard {
  position: relative;
  display: flex; flex-direction: column; gap: 14px;
  padding: 18px 18px 16px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.78), rgba(20, 14, 8, 0.88));
  border: 1px solid rgba(251, 191, 36, 0.18);
  overflow: hidden;
  isolation: isolate;
  transition: transform .35s var(--leave-ease, cubic-bezier(0.16,1,0.3,1)), border-color .25s, box-shadow .25s;
  cursor: default;
}
[data-theme="light"] .bcard {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 218, 0.96));
  border-color: rgba(180, 83, 9, 0.18);
}
.bcard:hover {
  border-color: color-mix(in srgb, var(--c) 50%, transparent);
  box-shadow:
    0 26px 60px -28px color-mix(in srgb, var(--c) 60%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
.bc-glow {
  position: absolute; top: -60px; right: -60px;
  width: 200px; height: 200px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--c) 50%, transparent), transparent 70%);
  filter: blur(40px);
  opacity: 0.55;
  z-index: 0;
  pointer-events: none;
}
.bc-orbit {
  position: absolute; left: 50%; top: 50%;
  width: 280px; height: 280px;
  border-radius: 50%;
  border: 1px dashed color-mix(in srgb, var(--c) 20%, transparent);
  transform: translate(-50%, -50%);
  z-index: 0;
  pointer-events: none;
  animation: bc-orbit-spin 60s linear infinite;
}
@keyframes bc-orbit-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }

.bc-head { display: flex; align-items: center; gap: 11px; position: relative; z-index: 2; }
.bc-icon {
  display: grid; place-items: center;
  width: 38px; height: 38px;
  border-radius: 11px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 38%, transparent), color-mix(in srgb, var(--c) 14%, transparent));
  border: 1px solid color-mix(in srgb, var(--c) 45%, transparent);
  color: var(--c);
  flex-shrink: 0;
}
.bc-meta { flex: 1; min-width: 0; }
.bc-name { display: block; font-size: 14px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.005em; }
.bc-cat {
  display: block; margin-top: 2px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--hr-text-muted);
}
.bc-status {
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 3px 8px; border-radius: 999px;
  border: 1px solid;
}
.bc-status[data-tone="healthy"]  { color: #5eead4; background: rgba(20, 184, 166, 0.16); border-color: rgba(20, 184, 166, 0.36); }
.bc-status[data-tone="normal"]   { color: #fde68a; background: rgba(251, 191, 36, 0.16); border-color: rgba(251, 191, 36, 0.32); }
.bc-status[data-tone="low"]      { color: #fdba74; background: rgba(251, 146, 60, 0.18); border-color: rgba(251, 146, 60, 0.40); }
.bc-status[data-tone="depleted"] { color: #fda4af; background: rgba(244, 63, 94, 0.16); border-color: rgba(244, 63, 94, 0.40); }
.bc-status[data-tone="no-quota"] { color: var(--hr-text-muted); background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.10); }
[data-theme="light"] .bc-status[data-tone="healthy"]  { color: #047857; }
[data-theme="light"] .bc-status[data-tone="normal"]   { color: #92400e; }
[data-theme="light"] .bc-status[data-tone="low"]      { color: #9a3412; }
[data-theme="light"] .bc-status[data-tone="depleted"] { color: #991b1b; }

.bc-stat {
  display: flex; align-items: baseline; gap: 10px;
  position: relative; z-index: 2;
}
.bc-rem-num {
  font-size: 38px; font-weight: 900; letter-spacing: -0.03em;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 100%, transparent), color-mix(in srgb, var(--c) 50%, white));
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.bc-rem-side { display: flex; flex-direction: column; gap: 1px; }
.bc-rem-unit { font-size: 11.5px; font-weight: 700; color: var(--hr-text); }
.bc-rem-quota { font-size: 10px; color: var(--hr-text-muted); letter-spacing: 0.04em; }

.bc-bar { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 5px; }
.bc-bar-rail {
  position: relative;
  height: 6px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}
[data-theme="light"] .bc-bar-rail { background: rgba(180, 83, 9, 0.10); }
.bc-bar-fill {
  height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 100%, transparent), color-mix(in srgb, var(--c) 60%, #fb923c));
  position: relative; overflow: hidden;
}
.bc-bar-fill::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: bc-bar-shine 2.6s linear infinite;
}
@keyframes bc-bar-shine {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.bc-bar-label {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em;
  color: var(--hr-text-muted);
  text-align: right;
}

.bc-metrics {
  margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
  position: relative; z-index: 2;
}
.bc-metrics > div {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
[data-theme="light"] .bc-metrics > div { background: rgba(255, 244, 218, 0.6); border-color: rgba(180, 83, 9, 0.12); }
.bc-metrics dt { font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--hr-text-muted); }
.bc-metrics dd { margin: 2px 0 0; font-size: 12px; font-weight: 700; color: var(--hr-text); }

.bc-apply {
  position: relative; z-index: 2;
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 11px; border-radius: 9px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 30%, transparent), color-mix(in srgb, var(--c) 10%, transparent));
  border: 1px solid color-mix(in srgb, var(--c) 45%, transparent);
  color: var(--c);
  font: inherit; font-size: 11px; font-weight: 800; letter-spacing: 0.04em;
  cursor: pointer;
  align-self: flex-start;
  transition: background .25s, transform .22s, box-shadow .25s;
}
.bc-apply:hover:not(:disabled) {
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 50%, transparent), color-mix(in srgb, var(--c) 18%, transparent));
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--c) 60%, transparent);
}
.bc-apply:disabled { opacity: 0.45; cursor: not-allowed; }
.bc-apply-arrow { transition: transform .25s var(--leave-spring); }
.bc-apply:hover:not(:disabled) .bc-apply-arrow { transform: translateX(3px); }

.bcard-skel {
  padding: 18px; border-radius: 20px;
  background: rgba(28, 18, 10, 0.65); border: 1px solid rgba(251, 191, 36, 0.16);
  min-height: 220px;
}
[data-theme="light"] .bcard-skel { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.14); }
.leave-skel {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.04));
  background-size: 200% 100%;
  animation: leave-shimmer 1.6s linear infinite;
  border-radius: 6px;
}
[data-theme="light"] .leave-skel {
  background: linear-gradient(90deg, rgba(180, 83, 9, 0.08), rgba(180, 83, 9, 0.18), rgba(180, 83, 9, 0.08));
  background-size: 200% 100%;
}

.ssl-empty {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 50px 24px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(251, 191, 36, 0.30);
  text-align: center;
  color: var(--hr-text-muted);
}
.ssl-empty svg { color: var(--leave-approved, #fbbf24); opacity: 0.55; }
.ssl-empty strong { font-size: 14px; color: var(--hr-text); font-weight: 800; }
.ssl-empty span { font-size: 12px; }
[data-theme="light"] .ssl-empty { background: rgba(255, 250, 240, 0.6); border-color: rgba(180, 83, 9, 0.30); }

/* ════════════════════════════════════════════════════════════════════════════
   APPROVER CHAIN
   ════════════════════════════════════════════════════════════════════════════ */
.ssl-chain-section .chain-aside {
  font-size: 11.5px; color: var(--hr-text-muted);
}
.chain-row {
  display: grid;
  grid-template-columns: 1fr 60px 1fr 60px 1fr 60px 1fr;
  align-items: center;
  gap: 6px;
  padding: 18px 22px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.68), rgba(20, 14, 8, 0.78));
  border: 1px solid rgba(251, 191, 36, 0.20);
  overflow: hidden;
}
[data-theme="light"] .chain-row {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 218, 0.92));
  border-color: rgba(180, 83, 9, 0.20);
}
@media (max-width: 900px) { .chain-row { grid-template-columns: 1fr; gap: 12px; } .chain-link { display: none; } }

.chain-node { display: flex; flex-direction: column; gap: 6px; }
.node-eye {
  font-size: 9px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--hr-text-muted);
}
.node-card {
  position: relative;
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.22);
  overflow: hidden;
}
[data-theme="light"] .node-card { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.22); }
.node-card.success {
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.18), rgba(20, 184, 166, 0.04));
  border-color: rgba(20, 184, 166, 0.36);
}
.node-card strong { font-size: 12.5px; color: var(--hr-text); display: block; }
.node-card span { font-size: 10.5px; color: var(--hr-text-muted); display: block; margin-top: 1px; }
.node-ico {
  display: grid; place-items: center;
  width: 34px; height: 34px; border-radius: 10px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(245, 158, 11, 0.08));
  border: 1px solid rgba(251, 191, 36, 0.32);
  color: #fbbf24;
  flex-shrink: 0;
}
.node-card.success .node-ico {
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.30), rgba(20, 184, 166, 0.10));
  border-color: rgba(20, 184, 166, 0.42);
  color: #34d399;
}

.chain-link {
  position: relative;
  height: 2px;
  background: rgba(251, 191, 36, 0.18);
  border-radius: 999px;
  overflow: hidden;
}
.chain-link::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, var(--leave-pending-mgr, #fbbf24), transparent);
}
.chain-link[data-state="done"]::after { background: linear-gradient(90deg, transparent, #34d399, transparent); animation: chain-flow 2.4s linear infinite; }
.chain-link[data-state="active"]::after { background: linear-gradient(90deg, transparent, #fbbf24, transparent); animation: chain-flow 2.4s linear infinite; }
.chain-link[data-state="pending"]::after { background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.4), transparent); }
@keyframes chain-flow {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* ════════════════════════════════════════════════════════════════════════════
   HEATMAP
   ════════════════════════════════════════════════════════════════════════════ */
.heatmap {
  padding: 20px 22px 16px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.68), rgba(20, 14, 8, 0.78));
  border: 1px solid rgba(251, 191, 36, 0.20);
  overflow: hidden;
}
[data-theme="light"] .heatmap {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 218, 0.96));
  border-color: rgba(180, 83, 9, 0.18);
}
.heat-rows { display: flex; flex-direction: column; gap: 6px; }
.heat-row { display: grid; grid-template-columns: 64px 1fr; gap: 10px; align-items: center; }
.heat-month {
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--hr-text-muted);
  font-variant-numeric: tabular-nums;
}
.heat-cells { display: grid; grid-template-columns: repeat(31, 1fr); gap: 3px; }
.heat-cell {
  aspect-ratio: 1 / 1;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.03);
  transition: transform .2s var(--leave-ease);
}
[data-theme="light"] .heat-cell { border-color: rgba(180, 83, 9, 0.06); }
.heat-cell.kind-none { background: transparent !important; border-color: transparent; }
.heat-cell:hover { transform: scale(1.35); border-color: rgba(251, 191, 36, 0.55); z-index: 2; position: relative; }
.heat-legend {
  display: flex; flex-wrap: wrap; gap: 12px;
  margin-top: 12px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em;
  color: var(--hr-text-muted);
}
.heat-legend span { display: inline-flex; align-items: center; gap: 5px; }
.heat-legend i {
  display: inline-block; width: 9px; height: 9px; border-radius: 2px;
}
.heat-legend .today-marker {
  width: 9px; height: 9px; border-radius: 2px;
  background:
    linear-gradient(135deg, #fde047, #fbbf24);
  box-shadow: 0 0 0 1px rgba(253, 224, 71, 0.55), 0 0 8px rgba(253, 224, 71, 0.55);
  animation: heat-today-pulse 1.8s ease-in-out infinite;
}
@keyframes heat-today-pulse {
  0%, 100% { box-shadow: 0 0 0 1px rgba(253, 224, 71, 0.55), 0 0 6px rgba(253, 224, 71, 0.45); }
  50%      { box-shadow: 0 0 0 1px rgba(253, 224, 71, 0.85), 0 0 14px rgba(253, 224, 71, 0.85); }
}

/* Shift note above the grid */
.heat-shift-note {
  display: inline-flex; align-items: center; gap: 7px;
  margin: 0 0 12px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.26);
  color: var(--hr-text-muted);
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em;
  text-transform: uppercase;
}
.heat-shift-note strong {
  color: #fbbf24;
  font-weight: 800;
}
[data-theme="light"] .heat-shift-note {
  background: rgba(251, 191, 36, 0.20);
  border-color: rgba(180, 83, 9, 0.28);
  color: #6b5840;
}
[data-theme="light"] .heat-shift-note strong { color: #b45309; }

/* Today cell — subtle inner ring + glow */
.heat-cell.is-today {
  box-shadow:
    inset 0 0 0 1.5px rgba(253, 224, 71, 0.85),
    0 0 10px -2px rgba(253, 224, 71, 0.55);
  animation: heat-today-cell 2.2s ease-in-out infinite;
}
@keyframes heat-today-cell {
  0%, 100% { box-shadow: inset 0 0 0 1.5px rgba(253, 224, 71, 0.75), 0 0 8px -2px rgba(253, 224, 71, 0.45); }
  50%      { box-shadow: inset 0 0 0 1.5px rgba(253, 224, 71, 1.0), 0 0 16px -2px rgba(253, 224, 71, 0.85); }
}

/* ════════════════════════════════════════════════════════════════════════════
   HEATMAP TOOLTIP — ultra-modern, teleported to body
   ════════════════════════════════════════════════════════════════════════════ */
.hm-tooltip {
  position: fixed;
  z-index: 2000;
  pointer-events: none;
  width: 320px;
  padding: 14px 16px 13px;
  border-radius: 16px;
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(251, 191, 36, 0.18), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(251, 146, 60, 0.14), transparent 65%),
    linear-gradient(180deg, rgba(22, 16, 10, 0.92), rgba(14, 10, 6, 0.96));
  border: 1px solid rgba(251, 191, 36, 0.34);
  box-shadow:
    0 30px 80px -30px rgba(0, 0, 0, 0.85),
    0 0 0 1px rgba(251, 191, 36, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  color: var(--hr-text, #f4eee2);
  overflow: hidden;
  isolation: isolate;
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
}
[data-theme="light"] .hm-tooltip {
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(251, 191, 36, 0.22), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(251, 146, 60, 0.18), transparent 65%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.96), rgba(255, 244, 218, 0.98));
  border-color: rgba(180, 83, 9, 0.30);
  color: #3a1f0b;
  box-shadow:
    0 30px 60px -28px rgba(120, 53, 15, 0.40),
    0 0 0 1px rgba(180, 83, 9, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.hm-tip-glow {
  position: absolute;
  inset: -40% -40% auto auto;
  width: 240px; height: 240px;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.85;
  pointer-events: none;
  z-index: 0;
}
.hm-tip-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(251, 191, 36, 0.07) 1px, transparent 1px);
  background-size: 14px 14px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent);
  opacity: 0.55;
  pointer-events: none;
  z-index: 0;
}
[data-theme="light"] .hm-tip-grid {
  background-image: radial-gradient(rgba(180, 83, 9, 0.10) 1px, transparent 1px);
}

.hm-tip-head {
  position: relative; z-index: 1;
  display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
  margin-bottom: 10px;
}
.hm-tip-head-l { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.hm-tip-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--hr-text-muted, #b5a07e);
}
.hm-tip-eye-dot {
  width: 6px; height: 6px; border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}
.hm-tip-date {
  font-size: 13.5px; font-weight: 800; letter-spacing: -0.005em;
  color: var(--hr-text, #f4eee2);
}
[data-theme="light"] .hm-tip-date { color: #3a1f0b; }

.hm-tip-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em;
  text-transform: uppercase;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--hr-text-muted, #b5a07e);
}
[data-theme="light"] .hm-tip-pill { background: rgba(180, 83, 9, 0.08); border-color: rgba(180, 83, 9, 0.18); color: #6b5840; }

.hm-tip-pill[data-tone="approved"] {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(245, 158, 11, 0.15));
  border-color: rgba(251, 191, 36, 0.55);
  color: #fde68a;
}
[data-theme="light"] .hm-tip-pill[data-tone="approved"] { color: #92400e; }
.hm-tip-pill[data-tone="pending-hr"] {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(217, 119, 6, 0.12));
  border-color: rgba(245, 158, 11, 0.55);
  color: #fcd34d;
}
[data-theme="light"] .hm-tip-pill[data-tone="pending-hr"] { color: #b45309; }
.hm-tip-pill[data-tone="pending-mgr"] {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.22), rgba(234, 88, 12, 0.12));
  border-color: rgba(251, 146, 60, 0.55);
  color: #fdba74;
}
[data-theme="light"] .hm-tip-pill[data-tone="pending-mgr"] { color: #9a3412; }
.hm-tip-pill[data-tone="rejected"] {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.22), rgba(185, 28, 28, 0.10));
  border-color: rgba(248, 113, 113, 0.55);
  color: #fca5a5;
}
[data-theme="light"] .hm-tip-pill[data-tone="rejected"] { color: #991b1b; }
.hm-tip-pill[data-tone="weekend"] {
  background: rgba(148, 163, 184, 0.18);
  border-color: rgba(148, 163, 184, 0.40);
  color: #cbd5e1;
}
[data-theme="light"] .hm-tip-pill[data-tone="weekend"] { color: #475569; background: rgba(148, 163, 184, 0.20); }

.hm-tip-body {
  --tc: #fbbf24;
  position: relative; z-index: 1;
  display: flex; flex-direction: column; gap: 8px;
  padding: 10px 12px 10px 14px;
  border-radius: 12px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid color-mix(in srgb, var(--tc) 32%, transparent);
  overflow: hidden;
}
[data-theme="light"] .hm-tip-body {
  background: rgba(255, 250, 240, 0.75);
  border-color: color-mix(in srgb, var(--tc) 38%, transparent);
}
.hm-tip-rail {
  position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: linear-gradient(180deg, var(--tc), color-mix(in srgb, var(--tc) 30%, transparent));
}
.hm-tip-row { display: flex; align-items: center; gap: 9px; }
.hm-tip-row-meta { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
.hm-tip-row-meta strong {
  font-size: 12px; font-weight: 800; color: var(--hr-text, #f4eee2);
}
[data-theme="light"] .hm-tip-row-meta strong { color: #3a1f0b; }
.hm-tip-row-meta span {
  font-size: 9.5px; letter-spacing: 0.06em; color: var(--hr-text-muted, #b5a07e);
}
.hm-tip-days {
  display: inline-flex; align-items: baseline; gap: 3px;
  padding: 4px 9px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid color-mix(in srgb, var(--tc) 32%, transparent);
}
.hm-tip-days strong {
  font-size: 14px; font-weight: 900; color: var(--tc);
  letter-spacing: -0.015em;
  font-variant-numeric: tabular-nums;
}
.hm-tip-days small {
  font-size: 9px; font-weight: 700; color: var(--hr-text-muted, #b5a07e);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
[data-theme="light"] .hm-tip-days { background: rgba(255, 250, 240, 0.6); }

.hm-tip-range {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10.5px; letter-spacing: 0.04em;
  color: var(--hr-text-muted, #b5a07e);
}
.hm-tip-range svg { color: var(--tc); }
.hm-tip-reason {
  margin: 0;
  display: flex; gap: 6px; align-items: flex-start;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 11px; font-style: italic; line-height: 1.5;
  color: var(--hr-text-secondary, #d8c8a3);
}
[data-theme="light"] .hm-tip-reason {
  background: rgba(255, 244, 218, 0.65);
  border-color: rgba(180, 83, 9, 0.10);
  color: #6b4d20;
}
.hm-tip-reason svg { color: var(--tc); flex-shrink: 0; margin-top: 2px; opacity: 0.7; }

.hm-tip-foot {
  position: relative; z-index: 1;
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 11px; color: var(--hr-text-muted, #b5a07e);
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.08);
}
[data-theme="light"] .hm-tip-foot {
  background: rgba(255, 244, 218, 0.55);
  border-color: rgba(180, 83, 9, 0.18);
  color: #6b5840;
}

/* Tooltip transition — slide-in + fade with cubic ease */
.hm-tip-enter-active { transition: opacity .22s ease, transform .35s cubic-bezier(0.16, 1, 0.3, 1); }
.hm-tip-leave-active { transition: opacity .14s ease, transform .2s ease; }
.hm-tip-enter-from   { opacity: 0; transform: translateY(8px) scale(0.96); }
.hm-tip-leave-to     { opacity: 0; transform: translateY(4px) scale(0.98); }

@media (prefers-reduced-motion: reduce) {
  .heat-today-pulse, .heat-today-cell { animation: none !important; }
  .hm-tip-enter-active, .hm-tip-leave-active { transition: opacity .1s; }
  .hm-tip-enter-from, .hm-tip-leave-to { transform: none; }
}

/* ════════════════════════════════════════════════════════════════════════════
   REQUESTS LIST
   ════════════════════════════════════════════════════════════════════════════ */
.req-list { display: flex; flex-direction: column; gap: 12px; }
.rcard {
  position: relative;
  display: flex; flex-direction: column; gap: 12px;
  padding: 16px 18px 14px 22px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.65), rgba(20, 14, 8, 0.78));
  border: 1px solid rgba(251, 191, 36, 0.18);
  overflow: hidden;
  isolation: isolate;
  transition: transform .3s var(--leave-ease), border-color .25s, box-shadow .25s;
}
[data-theme="light"] .rcard { background: linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 218, 0.92)); border-color: rgba(180, 83, 9, 0.18); }
.rcard:hover {
  border-color: color-mix(in srgb, var(--c) 50%, transparent);
  box-shadow: 0 18px 38px -22px color-mix(in srgb, var(--c) 60%, transparent);
}
.rc-rail {
  position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 100%, transparent), color-mix(in srgb, var(--c) 30%, transparent));
}

.rc-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.rc-head-l { display: flex; align-items: center; gap: 10px; min-width: 0; }
.rc-titles { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.rc-titles strong { font-size: 13.5px; font-weight: 800; color: var(--hr-text); }
.rc-ref { font-size: 10px; font-weight: 600; color: var(--hr-text-muted); letter-spacing: 0.04em; }

.rc-reason {
  margin: 0;
  font-size: 12px; line-height: 1.55;
  color: var(--hr-text-secondary, var(--hr-text-muted));
  display: flex; gap: 7px; align-items: flex-start;
  padding: 9px 11px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
[data-theme="light"] .rc-reason { background: rgba(255, 244, 218, 0.6); border-color: rgba(180, 83, 9, 0.10); }
.rc-quote { color: var(--leave-pending-mgr, #fbbf24); flex-shrink: 0; margin-top: 3px; opacity: 0.7; }

.rc-foot {
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
  border-top: 1px dashed rgba(255, 255, 255, 0.06);
  padding-top: 10px;
}
[data-theme="light"] .rc-foot { border-top-color: rgba(180, 83, 9, 0.14); }
.rc-when {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; color: var(--hr-text-muted);
}
.rc-actions { display: flex; gap: 6px; }
.rc-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 10px;
  border-radius: 8px;
  font: inherit; font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em;
  border: 1px solid;
  cursor: pointer;
  transition: background .22s, border-color .22s, color .22s;
}
.rc-btn-ghost {
  background: transparent;
  border-color: rgba(251, 191, 36, 0.22);
  color: var(--hr-text-muted);
}
.rc-btn-ghost:hover { background: rgba(251, 191, 36, 0.10); color: #fef3c7; border-color: rgba(251, 191, 36, 0.45); }
.rc-btn-danger {
  background: rgba(244, 63, 94, 0.10);
  border-color: rgba(244, 63, 94, 0.40);
  color: #fda4af;
}
.rc-btn-danger:hover { background: rgba(244, 63, 94, 0.18); border-color: rgba(244, 63, 94, 0.62); }
[data-theme="light"] .rc-btn-ghost { color: #6b5840; border-color: rgba(180, 83, 9, 0.20); }
[data-theme="light"] .rc-btn-ghost:hover { background: rgba(251, 191, 36, 0.16); color: #3a1f0b; border-color: rgba(180, 83, 9, 0.42); }
[data-theme="light"] .rc-btn-danger { color: #b91c1c; }

/* ─── Proof badge + action button ────────────────────────────────────
   Sits to the left of the status chip in the request-card header. The
   "need" variant pulses to demand attention; the "done" variant is calm
   and informational. */
.rc-head-r {
  display: inline-flex; align-items: center; gap: 8px;
  flex-wrap: wrap; justify-content: flex-end;
}
.rc-proof-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  font: inherit; font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em;
  cursor: pointer;
  border: 1px solid;
  transition: transform .22s var(--leave-spring),
              background .22s, border-color .22s, color .22s,
              box-shadow .22s;
  position: relative;
  isolation: isolate;
}
.rc-proof-pill strong { font-weight: 900; letter-spacing: 0.06em; }
.rc-proof-pill:hover { transform: translateY(-1px); }

/* "Action needed" — pulsing red-amber demand */
.rc-proof-pill--need {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.18), rgba(251, 146, 60, 0.18));
  border-color: rgba(244, 63, 94, 0.45);
  color: #fecaca;
  box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.4);
  animation: rc-proof-need-pulse 2s ease-in-out infinite;
}
.rc-proof-pill--need:hover {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.28), rgba(251, 146, 60, 0.28));
  border-color: rgba(244, 63, 94, 0.70);
  color: #fff;
  box-shadow: 0 8px 20px -8px rgba(244, 63, 94, 0.55);
}
[data-theme="light"] .rc-proof-pill--need {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.18), rgba(251, 146, 60, 0.20));
  border-color: rgba(185, 28, 28, 0.40);
  color: #991b1b;
}
[data-theme="light"] .rc-proof-pill--need:hover {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.26), rgba(251, 146, 60, 0.32));
  color: #7f1d1d;
}
@keyframes rc-proof-need-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.45); }
  60%      { box-shadow: 0 0 0 8px rgba(244, 63, 94, 0); }
}
.rc-proof-led {
  width: 7px; height: 7px; border-radius: 50%;
  background: #f87171;
  box-shadow: 0 0 8px rgba(244, 63, 94, 0.85);
  animation: rc-proof-led-blink 1.2s ease-in-out infinite;
}
@keyframes rc-proof-led-blink {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.3); }
}
.rc-proof-arrow {
  opacity: 0.7;
  transition: transform .22s;
}
.rc-proof-pill--need:hover .rc-proof-arrow { transform: translateX(2px); opacity: 1; }

/* "Proof submitted" — calm cyan/emerald confirmation */
.rc-proof-pill--done {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.16), rgba(74, 222, 128, 0.14));
  border-color: rgba(6, 182, 212, 0.40);
  color: #a5f3fc;
}
.rc-proof-pill--done:hover {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.26), rgba(74, 222, 128, 0.22));
  border-color: rgba(6, 182, 212, 0.65);
  color: #fff;
}
[data-theme="light"] .rc-proof-pill--done {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.18), rgba(74, 222, 128, 0.18));
  border-color: rgba(8, 145, 178, 0.40);
  color: #0e7490;
}
[data-theme="light"] .rc-proof-pill--done:hover {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.26), rgba(74, 222, 128, 0.26));
  color: #155e75;
}

/* "Upload proof" footer action */
.rc-btn-proof {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.10), rgba(251, 146, 60, 0.10));
  border-color: rgba(244, 63, 94, 0.40);
  color: #fda4af;
}
.rc-btn-proof:hover {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.20), rgba(251, 146, 60, 0.20));
  border-color: rgba(244, 63, 94, 0.65);
  color: #fff;
}
[data-theme="light"] .rc-btn-proof {
  color: #b91c1c;
  border-color: rgba(185, 28, 28, 0.35);
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.10), rgba(251, 146, 60, 0.12));
}
[data-theme="light"] .rc-btn-proof:hover {
  color: #7f1d1d;
  border-color: rgba(185, 28, 28, 0.55);
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.18), rgba(251, 146, 60, 0.22));
}

@media (prefers-reduced-motion: reduce) {
  .rc-proof-pill--need, .rc-proof-led { animation: none !important; }
}

.rcard-skel {
  padding: 16px; border-radius: 16px;
  background: rgba(28, 18, 10, 0.65); border: 1px solid rgba(251, 191, 36, 0.16);
}

/* ════════════════════════════════════════════════════════════════════════════
   PAGINATION — ultra-modern: glass shell, sliding page-size pill,
   compact page numbers w/ orbit + glow on the active page, soft meter
   ════════════════════════════════════════════════════════════════════════════ */
.pgn {
  position: relative;
  display: flex; align-items: center; justify-content: space-between; gap: 18px;
  flex-wrap: wrap;
  margin-top: 18px;
  padding: 14px 18px;
  border-radius: 18px;
  background:
    radial-gradient(80% 60% at 0% 0%, rgba(251, 191, 36, 0.10), transparent 65%),
    linear-gradient(180deg, rgba(28, 18, 10, 0.68), rgba(20, 14, 8, 0.82));
  border: 1px solid rgba(251, 191, 36, 0.22);
  box-shadow: 0 18px 38px -24px rgba(120, 53, 15, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  overflow: hidden;
  isolation: isolate;
}
[data-theme="light"] .pgn {
  background:
    radial-gradient(80% 60% at 0% 0%, rgba(251, 191, 36, 0.18), transparent 65%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 244, 218, 0.96));
  border-color: rgba(180, 83, 9, 0.20);
  box-shadow: 0 14px 28px -20px rgba(120, 53, 15, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.pgn-l, .pgn-r {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
}
.pgn-eye {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em;
  color: var(--hr-text-muted, #b5a07e);
  text-transform: uppercase;
}
.pgn-eye strong {
  font-weight: 900; color: var(--hr-text);
  background: linear-gradient(135deg, #fef3c7, #fbbf24 55%, #fb923c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
}
[data-theme="light"] .pgn-eye strong {
  background: linear-gradient(135deg, #92400e, #b45309 60%, #c2410c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.pgn-led {
  width: 6px; height: 6px; border-radius: 50%;
  background: #34d399; box-shadow: 0 0 8px #34d399;
  animation: pgn-led 1.8s ease-in-out infinite;
}
@keyframes pgn-led {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.4); }
}

/* Page-size selector — sliding pill (mirrors the calendar view-toggle) */
.pgn-size { display: inline-flex; align-items: center; gap: 8px; }
.pgn-size-lbl {
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--hr-text-muted);
}
.pgn-size-pill {
  --idx: 0;
  --n: 4;
  position: relative;
  display: inline-grid;
  grid-template-columns: repeat(var(--n), 1fr);
  padding: 3px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.30);
}
[data-theme="light"] .pgn-size-pill {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.24);
}
.ps-btn {
  position: relative; z-index: 1;
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 38px;
  padding: 6px 10px;
  border-radius: 999px;
  background: transparent;
  border: 0;
  font: inherit; font-size: 11px; font-weight: 800;
  color: var(--hr-text-muted);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: color .25s;
  letter-spacing: 0.02em;
}
.ps-btn.active { color: #1f1408; }
.ps-slider {
  position: absolute; top: 3px; bottom: 3px;
  left: 3px;
  width: calc((100% - 6px) / var(--n));
  border-radius: 999px;
  background: linear-gradient(135deg, #fde68a, #fbbf24 40%, #fb923c);
  box-shadow: 0 8px 18px -10px rgba(251, 146, 60, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.45);
  transform: translateX(calc(100% * var(--idx)));
  transition: transform .42s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 0;
}

/* Right side: nav buttons + numbered track */
.pgn-nav {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.28);
  color: var(--hr-text);
  cursor: pointer;
  transition: transform .25s cubic-bezier(0.34, 1.56, 0.64, 1), background .22s, border-color .22s, color .22s;
}
.pgn-nav:hover:not(:disabled) {
  transform: translateY(-2px);
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(251, 146, 60, 0.55);
}
.pgn-nav:disabled { opacity: 0.35; cursor: not-allowed; }
[data-theme="light"] .pgn-nav {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.24);
  color: #3a1f0b;
}

.pgn-track {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 0 4px;
}
.pgn-page {
  position: relative;
  display: grid; place-items: center;
  min-width: 32px; height: 32px;
  padding: 0 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-text);
  font: inherit; font-size: 12px; font-weight: 800;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  transition: transform .22s cubic-bezier(0.34, 1.56, 0.64, 1), background .25s, border-color .25s, box-shadow .25s;
}
.pgn-page:hover:not(.active) {
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 146, 60, 0.55);
}
[data-theme="light"] .pgn-page {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.22);
  color: #3a1f0b;
}
[data-theme="light"] .pgn-page:hover:not(.active) {
  background: rgba(251, 191, 36, 0.20);
  border-color: rgba(180, 83, 9, 0.45);
}
.pgn-page.active {
  background: linear-gradient(135deg, #fde68a, #fbbf24 40%, #fb923c);
  border-color: rgba(251, 146, 60, 0.85);
  color: #1f1408;
  box-shadow: 0 10px 22px -10px rgba(251, 146, 60, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.45);
  transform: translateY(-1px);
}
.pp-num {
  position: relative; z-index: 2;
  font-variant-numeric: tabular-nums;
}
.pp-glow {
  position: absolute; inset: -3px;
  border-radius: inherit;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.55), transparent 65%);
  filter: blur(8px);
  z-index: 0;
  opacity: 0.85;
  pointer-events: none;
  animation: pp-glow 2.4s ease-in-out infinite;
}
@keyframes pp-glow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50%      { opacity: 0.95; transform: scale(1.10); }
}
.pp-orbit {
  position: absolute; inset: -3px;
  border-radius: inherit;
  border: 1.5px solid rgba(251, 191, 36, 0.55);
  pointer-events: none;
  z-index: 1;
  animation: pp-orbit 2.6s ease-out infinite;
}
@keyframes pp-orbit {
  0%   { transform: scale(1);    opacity: 0.85; }
  100% { transform: scale(1.18); opacity: 0; }
}
.pgn-gap {
  display: inline-grid; place-items: center;
  min-width: 24px; height: 32px;
  font-size: 14px; font-weight: 800;
  color: var(--hr-text-muted);
  user-select: none;
}

/* Page meter — tiny travel indicator below the nav row */
.pgn-meter {
  position: relative;
  width: 110px; height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.20);
  margin-left: 4px;
  overflow: visible;
}
[data-theme="light"] .pgn-meter {
  background: rgba(180, 83, 9, 0.10); border-color: rgba(180, 83, 9, 0.22);
}
.pm-fill {
  display: block; height: 100%;
  background: linear-gradient(90deg, #fbbf24, #fb923c);
  border-radius: 999px;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.55);
  transition: width .55s cubic-bezier(0.16, 1, 0.3, 1);
}
.pm-blip {
  position: absolute; top: 50%;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle, #fef3c7 0%, #fbbf24 45%, #ea580c 100%);
  border: 1.5px solid rgba(20, 14, 8, 0.95);
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.75);
  transform: translate(-50%, -50%);
  transition: left .55s cubic-bezier(0.16, 1, 0.3, 1);
}
[data-theme="light"] .pm-blip { border-color: rgba(255, 250, 240, 0.96); }

@media (max-width: 720px) {
  .pgn { flex-direction: column; align-items: stretch; }
  .pgn-l, .pgn-r { justify-content: center; }
  .pgn-meter { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .pgn-led, .pp-glow, .pp-orbit { animation: none !important; }
  .ps-slider, .pm-fill, .pm-blip { transition: none !important; }
}

/* ════════════════════════════════════════════════════════════════════════════
   SIDE CARDS — 3-up: insights, comp-off, approvers
   ════════════════════════════════════════════════════════════════════════════ */
.ssl-grid-side {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
/* the approver relay reads as a full-width footer band */
.ssl-grid-side .chain-detail { grid-column: 1 / -1; }
@media (max-width: 1000px) { .ssl-grid-side { grid-template-columns: 1fr; } }

.side-card {
  --sc-c: #fbbf24;
  position: relative;
  padding: 18px 20px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(30, 19, 10, 0.7), rgba(18, 12, 7, 0.82));
  border: 1px solid rgba(251, 191, 36, 0.18);
  overflow: hidden;
  isolation: isolate;
  transition: border-color .3s var(--leave-ease, ease), box-shadow .3s var(--leave-ease, ease);
}
.side-card.compoff { --sc-c: #fb923c; }
.side-card.encash  { --sc-c: #fde047; }
.side-card.chain-detail { --sc-c: #f59e0b; }
[data-theme="light"] .side-card { background: linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 244, 218, 0.96)); border-color: rgba(180, 83, 9, 0.18); }
.side-card:hover {
  border-color: color-mix(in srgb, var(--sc-c) 55%, transparent);
  box-shadow: 0 22px 48px -28px color-mix(in srgb, var(--sc-c) 75%, transparent);
}

/* animated top accent rail */
.sc-accent {
  position: absolute; top: 0; left: 0; right: 0; height: 2.5px; z-index: 2; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--sc-c) 30%, #ea580c 60%, transparent);
  background-size: 220% 100%;
  animation: sc-accent-flow 5s linear infinite;
  opacity: 0.85;
}
@keyframes sc-accent-flow { 0% { background-position: 120% 0; } 100% { background-position: -120% 0; } }
/* breathing corner glow */
.sc-glow {
  position: absolute; inset: -40% -30% auto auto; width: 70%; height: 130%; z-index: -1; pointer-events: none;
  background: radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--sc-c) 30%, transparent), transparent 68%);
  filter: blur(40px); opacity: 0.5; transition: opacity .35s ease;
  animation: sc-glow-breathe 7s ease-in-out infinite;
}
.side-card:hover .sc-glow { opacity: 0.95; }
@keyframes sc-glow-breathe { 0%,100% { transform: scale(1); opacity: 0.45; } 50% { transform: scale(1.12); opacity: 0.7; } }
/* diagonal sheen that sweeps on hover */
.sc-sheen {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.10) 50%, transparent 60%);
  background-size: 250% 100%; background-position: 200% 0; opacity: 0;
}
.side-card:hover .sc-sheen { opacity: 1; animation: sc-sheen-sweep 0.95s ease forwards; }
@keyframes sc-sheen-sweep { to { background-position: -60% 0; } }
.sc-sheen.money { background: linear-gradient(115deg, transparent 38%, rgba(253, 224, 71, 0.22) 50%, transparent 62%); background-size: 250% 100%; background-position: 200% 0; opacity: 0.4; animation: sc-sheen-sweep 4.5s ease-in-out infinite; }

/* everything above the ambient layers */
.side-card > header,
.side-card > ul,
.side-card > .co-list,
.side-card > .vault-empty,
.side-card > .side-empty,
.side-card > .enc-list,
.side-card > .enc-btn,
.side-card > .relay,
.side-card > .side-foot { position: relative; z-index: 1; }

.side-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
.side-head.row { flex-direction: row; align-items: flex-start; justify-content: space-between; gap: 10px; }
.side-head .side-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--sc-c);
}
[data-theme="light"] .side-head .side-eye { color: #b45309; }
.side-eye .eye-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sc-c); box-shadow: 0 0 8px var(--sc-c); animation: leave-eyebrow-pulse 1.8s ease-in-out infinite; }
.side-head h3 { margin: 2px 0 0; font-size: 17px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.012em; }
.side-empty { font-size: 11.5px; color: var(--hr-text-muted); line-height: 1.5; margin: 0; }
.side-foot { margin: 14px 0 0; display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--hr-text-muted); line-height: 1.5; }
.side-foot svg { color: var(--sc-c); flex-shrink: 0; }

/* "thinking" dots in the insights header */
.sc-think { position: absolute; top: 18px; right: 20px; display: inline-flex; gap: 3px; }
.sc-think i { width: 4px; height: 4px; border-radius: 50%; background: var(--sc-c); opacity: 0.4; animation: sc-think 1.4s ease-in-out infinite; }
.sc-think i:nth-child(2) { animation-delay: 0.18s; }
.sc-think i:nth-child(3) { animation-delay: 0.36s; }
@keyframes sc-think { 0%, 100% { opacity: 0.25; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3px); } }

/* ── Insights ── */
.insight-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.insight-list li {
  --tc: #fbbf24;
  position: relative; overflow: hidden;
  display: flex; gap: 10px; align-items: flex-start;
  padding: 11px 12px 11px 13px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 11.5px; color: var(--hr-text-secondary, var(--hr-text-muted));
  line-height: 1.5;
  transition: background .25s, border-color .25s;
}
.insight-list li::before { content: ''; position: absolute; left: 0; top: 9px; bottom: 9px; width: 2.5px; border-radius: 999px; background: var(--tc); box-shadow: 0 0 8px color-mix(in srgb, var(--tc) 65%, transparent); }
.insight-list li:hover { background: color-mix(in srgb, var(--tc) 9%, rgba(255,255,255,0.02)); border-color: color-mix(in srgb, var(--tc) 30%, transparent); }
[data-theme="light"] .insight-list li { background: rgba(255, 244, 218, 0.55); border-color: rgba(180, 83, 9, 0.10); }
.insight-list strong { display: block; font-size: 12px; font-weight: 800; color: var(--hr-text); margin-bottom: 1px; }
.ins-ic {
  display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
  background: color-mix(in srgb, var(--tc) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--tc) 32%, transparent);
  color: var(--tc);
}
.insight-list li.tone-amber   { --tc: #fbbf24; }
.insight-list li.tone-gold    { --tc: #fde047; }
.insight-list li.tone-success { --tc: #5eead4; }
.insight-list li.tone-ember   { --tc: #fb923c; }
.insight-list li.empty { background: transparent; border: 1px dashed rgba(251, 191, 36, 0.22); }
.insight-list li.empty::before { display: none; }

/* ── Comp-off "vault" ── */
.vault-num {
  font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fde047, #fb923c 60%, #ea580c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.co-list { display: flex; flex-direction: column; gap: 7px; }
.co-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 11px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(251, 146, 60, 0.20);
  transition: border-color .25s, transform .25s var(--leave-ease, ease);
}
.co-row:hover { transform: translateX(3px); border-color: rgba(251, 146, 60, 0.45); }
.co-row.expired { opacity: 0.5; }
.co-row.soon { border-color: rgba(234, 88, 12, 0.5); }
[data-theme="light"] .co-row { background: rgba(255, 244, 218, 0.6); border-color: rgba(194, 65, 12, 0.20); }
.co-coin {
  display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
  background: radial-gradient(circle at 32% 28%, #fde68a, #fb923c 70%);
  color: #5c1a0a; box-shadow: inset 0 1px 0 rgba(255,255,255,0.45), 0 3px 8px -4px rgba(234,88,12,0.6);
}
.co-l { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.co-days {
  font-size: 13px; font-weight: 800; line-height: 1;
  background: linear-gradient(135deg, #fb923c, #ea580c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.co-when { font-size: 9px; color: var(--hr-text-muted); letter-spacing: 0.04em; }
.co-pill {
  flex-shrink: 0;
  font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px; border: 1px solid;
}
.co-pill.ok       { color: var(--hr-text-muted); border-color: rgba(255, 255, 255, 0.08); }
.co-pill.soon     { color: #ffb088; background: rgba(234, 88, 12, 0.2); border-color: rgba(234, 88, 12, 0.5); }
.co-pill.expired  { color: var(--hr-text-muted); background: rgba(0, 0, 0, 0.18); border-color: rgba(255, 255, 255, 0.06); }
.co-more { margin: 4px 0 0; font-size: 9.5px; color: var(--hr-text-muted); }
.vault-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; padding: 14px 6px 4px; }
.vault-empty-orb {
  display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, rgba(253,224,71,0.3), rgba(251,146,60,0.12));
  border: 1px solid rgba(251, 146, 60, 0.32); color: #fb923c;
  animation: leave-glow-breathe 3.6s ease-in-out infinite;
}
[data-theme="light"] .vault-empty-orb { color: #c2410c; }

/* ── Encashment ── */
.enc-list { list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.enc-row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 9px 11px; border-radius: 11px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(251, 191, 36, 0.16);
  transition: border-color .25s, transform .25s var(--leave-ease, ease);
}
.enc-row:hover { transform: translateX(3px); border-color: rgba(251, 191, 36, 0.42); }
[data-theme="light"] .enc-row { background: rgba(255, 244, 218, 0.6); border-color: rgba(180, 83, 9, 0.16); }
.enc-l { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.enc-amt { font-size: 15px; font-weight: 800; color: var(--leave-approved); letter-spacing: -0.01em; }
.enc-meta { font-size: 9.5px; color: var(--hr-text-muted); }
.enc-r { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.enc-pill {
  padding: 3px 8px; border-radius: 999px; font-size: 9px; font-weight: 800; letter-spacing: 0.06em;
  border: 1px solid currentColor;
}
.enc-pill[data-tone="pending-mgr"] { color: var(--leave-pending-mgr); background: var(--leave-pending-mgr-soft); }
.enc-pill[data-tone="pending-hr"] { color: var(--leave-pending-hr); background: var(--leave-pending-hr-soft); }
.enc-pill[data-tone="approved"]   { color: var(--leave-approved);   background: var(--leave-approved-soft); }
.enc-pill[data-tone="rejected"]   { color: var(--leave-rejected);   background: var(--leave-rejected-soft); }
.enc-pill[data-tone="cancelled"]  { color: var(--leave-cancelled);  background: var(--leave-cancelled-soft); }
.enc-cancel {
  display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px;
  background: transparent; border: 1px solid var(--hr-border); color: var(--hr-text-muted); cursor: pointer;
  transition: color .2s, border-color .2s;
}
.enc-cancel:hover { color: var(--leave-rejected); border-color: var(--leave-rejected); }
.enc-btn {
  position: relative; overflow: hidden;
  display: inline-flex; align-items: center; gap: 8px; width: 100%; justify-content: center;
  height: 40px; border-radius: 12px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 800;
  color: #2a1100; background: var(--leave-grad-cta); background-size: 240% 100%; background-position: 0% 50%;
  border: 1px solid rgba(251, 146, 60, 0.5); box-shadow: 0 12px 30px -12px rgba(234, 88, 12, 0.55), inset 0 1px 0 rgba(255,255,255,0.45);
  transition: background-position .35s, box-shadow .25s;
}
.enc-btn:hover { background-position: 100% 50%; box-shadow: 0 16px 38px -12px rgba(234, 88, 12, 0.75), inset 0 1px 0 rgba(255,255,255,0.55); }
.enc-btn-sweep {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%);
  background-size: 220% 100%; background-position: 200% 0; opacity: 0;
}
.enc-btn:hover .enc-btn-sweep { animation: sc-sheen-sweep 0.85s ease forwards; opacity: 1; }

/* ── Approvers "relay chain" (full-width) ── */
.relay-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 9px; border-radius: 999px; flex-shrink: 0;
  font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  background: rgba(251, 191, 36, 0.12); border: 1px solid rgba(251, 191, 36, 0.3); color: var(--sc-c);
}
[data-theme="light"] .relay-badge { color: #b45309; }
.relay {
  position: relative;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; align-items: stretch;
  padding: 6px 4px 2px;
}
@media (max-width: 720px) { .relay { grid-template-columns: 1fr; } }
/* the connecting line behind the nodes */
.relay-line {
  position: absolute; left: 9%; right: 9%; top: 27px; height: 2px; z-index: 0; overflow: hidden;
  background: linear-gradient(90deg, #5eead4, #fbbf24 45%, #f59e0b 75%, #34d399);
  opacity: 0.4; border-radius: 999px;
}
@media (max-width: 720px) { .relay-line { display: none; } }
.relay-pulse {
  position: absolute; top: 0; bottom: 0; width: 40px; border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent);
  animation: relay-travel 3.4s linear infinite;
}
@keyframes relay-travel { 0% { left: -40px; } 100% { left: 100%; } }
.relay-node {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center; gap: 7px; text-align: center;
  padding: 6px 8px 10px;
}
.relay-node .rn-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.relay-node .rn-meta strong { font-size: 12px; font-weight: 800; color: var(--hr-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }
.relay-node .rn-meta span { font-size: 9.5px; color: var(--hr-text-muted); }
.rn-av {
  display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0;
  font-size: 14px; font-weight: 800; letter-spacing: -0.01em; color: #022c22;
  background: linear-gradient(135deg, #2dd4bf, #0d9488);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 18px -8px rgba(13,148,136,0.6);
}
.rn-av.you { background: linear-gradient(135deg, #fde68a, #fbbf24); color: #2a1100; box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 8px 18px -8px rgba(251,191,36,0.6); font-size: 12px; }
.rn-av.teal { background: linear-gradient(135deg, #2dd4bf, #0d9488); }
.rn-av.amber { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #1f1408; }
.rn-av.done { background: linear-gradient(135deg, #34d399, #059669); color: #022c22; animation: rn-done-pulse 2.4s ease-in-out infinite; }
@keyframes rn-done-pulse { 0%,100% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 0 0 0 rgba(52,211,153,0.5); } 50% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 0 0 7px rgba(52,211,153,0); } }
.rn-lbl { font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--hr-text-muted); }
.rn-pill {
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.06em; padding: 2px 8px; border-radius: 999px;
  background: rgba(20, 184, 166, 0.18); border: 1px solid rgba(20, 184, 166, 0.36); color: #5eead4;
}
.rn-pill.amber { background: rgba(251, 191, 36, 0.18); border-color: rgba(251, 191, 36, 0.42); color: #fbbf24; }
[data-theme="light"] .rn-pill { color: #0f766e; }
[data-theme="light"] .rn-pill.amber { color: #b45309; }

/* ════════════════════════════════════════════════════════════════════════════
   REDUCED MOTION
   ════════════════════════════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .ssl-backdrop .bd-aurora,
  .ssl-backdrop .bd-scan,
  .gauge-orbit,
  .gauge-ticks,
  .halo,
  .cta-flare,
  .cta-spark,
  .bc-orbit,
  .bc-bar-fill::after,
  .chain-link::after,
  .eye-dot,
  .sc-accent,
  .sc-glow,
  .sc-sheen,
  .sc-think i,
  .vault-empty-orb,
  .relay-pulse,
  .rn-av.done,
  .enc-btn-sweep {
    animation: none !important;
  }
  .title-word { animation: none !important; opacity: 1; transform: none; }
}

@keyframes leave-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
</style>
