<template>
  <div class="ssa-page" :class="[`ssa-state-${state.toLowerCase()}`]">
    <!-- ───────────────────── ambient backdrop ───────────────────── -->
    <div class="ssa-backdrop" aria-hidden="true">
      <div class="bd-aurora bd-aurora-a" />
      <div class="bd-aurora bd-aurora-b" />
      <div class="bd-aurora bd-aurora-c" />
      <div class="bd-grid" />
      <div class="bd-noise" />
    </div>

    <!-- ───────────────────── HERO ───────────────────── -->
    <section class="ssa-hero">
      <Motion as="header" class="hero-head"
        :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }"
      >
        <div class="hero-eyebrow">
          <span class="live-dot" />
          <span>Self-service · Live attendance</span>
          <span class="hero-eyebrow-dot" />
          <span class="hero-clock onb-mono">{{ liveTime }}</span>
        </div>
        <h1 class="hero-greeting">
          <span v-for="(word, idx) in greetingWords" :key="idx"
            class="greeting-word"
            :style="{ animationDelay: (idx * 80) + 'ms' }">{{ word }}</span>
        </h1>
        <p class="hero-sub">
          <span class="hero-sub-pill" :data-tone="contextPill.tone">
            <component :is="contextPill.icon" :size="11" />{{ contextPill.label }}
          </span>
          <span class="hero-sub-text">{{ contextPill.detail }}</span>
        </p>
      </Motion>

      <!-- CENTRAL CLOCK CORE -->
      <Motion as="div" class="clock-core"
        :initial="{ opacity: 0, scale: 0.92 }" :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }"
      >
        <svg viewBox="0 0 360 360" class="core-svg" aria-hidden="true">
          <defs>
            <linearGradient id="coreGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#14b8a6" />
              <stop offset="55%" stop-color="#facc15" />
              <stop offset="100%" stop-color="#fb923c" />
            </linearGradient>
            <linearGradient id="ringDim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgba(20,184,166,0.30)" />
              <stop offset="100%" stop-color="rgba(20,184,166,0.05)" />
            </linearGradient>
            <radialGradient id="coreGlow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stop-color="rgba(20,184,166,0.6)" />
              <stop offset="40%" stop-color="rgba(20,184,166,0.15)" />
              <stop offset="100%" stop-color="rgba(20,184,166,0)" />
            </radialGradient>
            <filter id="coreSoft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>
          <circle cx="180" cy="180" r="170" fill="url(#coreGlow)" />
          <circle class="core-ring-dots" cx="180" cy="180" r="156" fill="none"
            stroke="rgba(94,234,212,0.30)" stroke-width="1.5" stroke-dasharray="2 8" />
          <circle cx="180" cy="180" r="138" fill="none" stroke="url(#ringDim)" stroke-width="2" />
          <circle cx="180" cy="180" r="138" fill="none"
            stroke="url(#coreGrad)" stroke-width="6" stroke-linecap="round"
            :stroke-dasharray="2 * Math.PI * 138"
            :stroke-dashoffset="(2 * Math.PI * 138) * (1 - shiftProgress)"
            transform="rotate(-90 180 180)" class="core-progress" />
          <g class="core-ticks">
            <line v-for="n in 24" :key="n"
              :x1="180 + 118 * Math.cos((n - 1) * (Math.PI / 12) - Math.PI / 2)"
              :y1="180 + 118 * Math.sin((n - 1) * (Math.PI / 12) - Math.PI / 2)"
              :x2="180 + (n % 6 === 0 ? 108 : 113) * Math.cos((n - 1) * (Math.PI / 12) - Math.PI / 2)"
              :y2="180 + (n % 6 === 0 ? 108 : 113) * Math.sin((n - 1) * (Math.PI / 12) - Math.PI / 2)"
              :stroke="n % 6 === 0 ? 'rgba(94,234,212,0.85)' : 'rgba(94,234,212,0.30)'" stroke-width="1.5" />
          </g>
          <line
            :x1="180" :y1="180"
            :x2="180 + 92 * Math.cos(nowHandAngle - Math.PI / 2)"
            :y2="180 + 92 * Math.sin(nowHandAngle - Math.PI / 2)"
            stroke="url(#coreGrad)" stroke-width="2.5" stroke-linecap="round"
            class="core-hand" filter="url(#coreSoft)"
          />
          <line
            :x1="180" :y1="180"
            :x2="180 + 92 * Math.cos(nowHandAngle - Math.PI / 2)"
            :y2="180 + 92 * Math.sin(nowHandAngle - Math.PI / 2)"
            stroke="#fff" stroke-width="1.2" stroke-linecap="round"
            class="core-hand"
          />
          <circle cx="180" cy="180" r="6" fill="url(#coreGrad)" />
        </svg>

        <div class="core-center">
          <div class="core-eyebrow">{{ coreEyebrow }}</div>
          <div class="core-time">{{ formatDuration(elapsedSeconds) }}</div>
          <div class="core-sub">{{ coreSub }}</div>
        </div>

        <span v-for="i in 8" :key="i" :class="['orbiter', `orb-${i}`]" :style="orbStyle(i)" />
      </Motion>

      <!-- KEY STATS -->
      <div class="hero-stats">
        <Motion v-for="(st, i) in heroStats" :key="st.label" as="article" class="hero-stat"
          :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.18 + 0.06 * i, ease: [0.22, 1, 0.36, 1] }"
          :data-tone="st.tone"
        >
          <span class="stat-glow" />
          <div class="stat-icon"><component :is="st.icon" :size="16" /></div>
          <div class="stat-body">
            <div class="stat-value">{{ st.value }}</div>
            <div class="stat-label">{{ st.label }}</div>
          </div>
          <div v-if="st.foot" class="stat-foot">{{ st.foot }}</div>
        </Motion>
      </div>
    </section>

    <!-- ───────────────────── ACTION DECK ───────────────────── -->
    <Motion as="section" class="action-deck"
      :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }"
    >
      <div class="deck-primary">
        <transition name="action-fade" mode="out-in">
          <!-- EARLY CLOCK-IN LOCK — shift hasn't started yet -->
          <div v-if="state === 'NOT_STARTED' && todayData?.is_too_early_to_punch" key="too-early" class="punch-btn early-shell">
            <div class="early-banner">
              <span class="punch-icon-wrap calm"><Hourglass :size="22" /></span>
              <div class="punch-body">
                <span class="punch-label">Shift hasn't started yet</span>
                <span class="punch-sub">
                  Clock-in opens at <b class="onb-mono">{{ todayData?.clock_in_opens_at }}</b>
                  · {{ formatCountdown(todayData?.minutes_until_clock_in_opens) }} to go
                  · shift {{ shortTime(todayData?.shift?.start_time) }} → {{ shortTime(todayData?.shift?.end_time) }}
                </span>
              </div>
            </div>
            <div class="early-meta">
              <span class="early-pill"><Clock :size="11" />{{ todayData?.minutes_until_shift_start }} min until shift start</span>
            </div>
          </div>

          <!-- CLOCK IN -->
          <Motion v-else-if="state === 'NOT_STARTED' && !todayData?.requires_late_approval" key="clock-in" as="button"
            type="button" class="punch-btn punch-in"
            :whileHover="reduced ? {} : { y: -3, scale: 1.02 }"
            :whileTap="reduced ? {} : { scale: 0.95 }"
            :disabled="loading || isBlocked"
            @click="doClockIn"
          >
            <span class="punch-aura" />
            <span class="punch-icon-wrap"><Fingerprint :size="28" /></span>
            <span class="punch-body">
              <span class="punch-label">{{ loading ? 'Clocking in…' : 'Clock in' }}</span>
              <span class="punch-sub">Verifying your location · server checks geo-fence on submit</span>
            </span>
            <span class="punch-cta"><ArrowRight :size="14" /></span>
          </Motion>

          <!-- LATE APPROVAL -->
          <div v-else-if="state === 'NOT_STARTED' && todayData?.requires_late_approval" key="late-approval" class="punch-btn late-shell">
            <div class="late-banner">
              <span class="punch-icon-wrap warn"><Siren :size="22" /></span>
              <div class="punch-body">
                <span class="punch-label">You're {{ todayData?.late_minutes_now }} minutes late</span>
                <span class="punch-sub">Self-punch is locked beyond {{ lateLockMinutes }} min past start. Request approval and your punch lands once admin says yes.</span>
              </div>
            </div>
            <div class="late-actions">
              <div v-if="todayData?.pending_late_request_id" class="late-pending">
                <Hourglass :size="13" /> Request pending — admin notified.
              </div>
              <Motion v-else as="button" type="button" class="punch-cta-btn"
                :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.96 }"
                @click="showLateRequest = true"
              >
                <ShieldCheck :size="14" /> Request late-punch approval
              </Motion>
            </div>
          </div>

          <!-- CLOCK OUT + TAKE BREAK -->
          <div v-else-if="state === 'CLOCKED_IN'" key="clocked-in" class="punch-pair">
            <Motion as="button" type="button" class="punch-btn punch-break"
              :whileHover="reduced ? {} : { y: -2, scale: 1.02 }"
              :whileTap="reduced ? {} : { scale: 0.95 }"
              :disabled="loading || !canStartBreakUI"
              @click="doStartBreak"
            >
              <span class="punch-icon-wrap"><Coffee :size="22" /></span>
              <span class="punch-body">
                <span class="punch-label">Take a break</span>
                <span class="punch-sub">{{ breakHint }}</span>
              </span>
            </Motion>
            <Motion as="button" type="button"
              :class="['punch-btn', clockOutLocked ? 'punch-out-locked' : 'punch-out']"
              :whileHover="reduced ? {} : { y: -2, scale: 1.02 }"
              :whileTap="reduced ? {} : { scale: 0.95 }"
              :disabled="loading"
              @click="doClockOut"
            >
              <span class="punch-icon-wrap" :class="{ warn: clockOutLocked }">
                <ShieldCheck v-if="clockOutLocked" :size="22" />
                <LogOut v-else :size="22" />
              </span>
              <span class="punch-body">
                <span class="punch-label">{{ clockOutButtonLabel }}</span>
                <span class="punch-sub">{{ clockOutHint }}</span>
              </span>
              <span v-if="clockOutLocked" class="punch-cta"><ArrowRight :size="14" /></span>
            </Motion>
          </div>

          <!-- END BREAK + ULTRA-MODERN COUNTDOWN TIMER -->
          <div v-else-if="state === 'ON_BREAK'" key="on-break" class="break-active-stack">
            <Motion as="div" class="break-timer-card"
              :initial="{ opacity: 0, scale: 0.95 }" :animate="{ opacity: 1, scale: 1 }"
              :transition="{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }"
            >
              <div class="bt-atmos" aria-hidden="true">
                <div class="bt-aurora-a" />
                <div class="bt-aurora-b" />
                <div class="bt-grid" />
              </div>

              <!-- Circular progress ring -->
              <div class="bt-ring-wrap">
                <svg viewBox="0 0 140 140" class="bt-ring" aria-hidden="true">
                  <defs>
                    <linearGradient id="btRingGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stop-color="#fde047" />
                      <stop offset="50%" stop-color="#facc15" />
                      <stop offset="100%" stop-color="#fb923c" />
                    </linearGradient>
                    <filter id="btSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" />
                    </filter>
                  </defs>
                  <circle class="bt-ring-bg" cx="70" cy="70" r="60" />
                  <circle class="bt-ring-glow" cx="70" cy="70" r="60"
                    :stroke-dasharray="`${2 * Math.PI * 60}`"
                    :stroke-dashoffset="(2 * Math.PI * 60) * (1 - breakTimer.progress)"
                    transform="rotate(-90 70 70)" filter="url(#btSoftGlow)" />
                  <circle class="bt-ring-fill" cx="70" cy="70" r="60"
                    :stroke-dasharray="`${2 * Math.PI * 60}`"
                    :stroke-dashoffset="(2 * Math.PI * 60) * (1 - breakTimer.progress)"
                    transform="rotate(-90 70 70)" />
                  <g class="bt-tick-marks">
                    <line v-for="n in 60" :key="n"
                      :x1="70 + 65 * Math.cos((n / 60) * 2 * Math.PI - Math.PI / 2)"
                      :y1="70 + 65 * Math.sin((n / 60) * 2 * Math.PI - Math.PI / 2)"
                      :x2="70 + (n % 5 === 0 ? 70 : 68) * Math.cos((n / 60) * 2 * Math.PI - Math.PI / 2)"
                      :y2="70 + (n % 5 === 0 ? 70 : 68) * Math.sin((n / 60) * 2 * Math.PI - Math.PI / 2)"
                      :stroke="n % 5 === 0 ? 'rgba(252, 211, 77, 0.6)' : 'rgba(252, 211, 77, 0.2)'"
                      stroke-width="1" />
                  </g>
                </svg>
                <div class="bt-center">
                  <div class="bt-eyebrow">{{ breakTimer.overCap ? 'over by' : 'remaining' }}</div>
                  <div class="bt-time onb-mono">{{ breakTimer.display }}</div>
                  <div class="bt-sub">{{ breakTimer.subLabel }}</div>
                </div>
                <span class="bt-orbit bt-orbit-1" />
                <span class="bt-orbit bt-orbit-2" />
                <span class="bt-orbit bt-orbit-3" />
              </div>

              <div class="bt-info">
                <span class="bt-status-eyebrow">
                  <Coffee :size="11" /> On a break · started {{ formatTime(todayData?.last_break_started_at) || 'just now' }}
                </span>
                <div class="bt-progress-row">
                  <div class="bt-bar">
                    <div class="bt-bar-used" :style="{ width: Math.min(100, breakTimer.usedPct) + '%' }">
                      <span class="bt-bar-shine" />
                    </div>
                    <div v-if="breakTimer.overCap" class="bt-bar-over" />
                  </div>
                  <span class="bt-bar-label onb-mono">
                    <b>{{ breakTimer.usedMin }}</b><span class="bt-bar-sep">/</span>{{ breakTimer.capMin }}<span class="bt-bar-unit">min</span>
                  </span>
                </div>
                <p class="bt-hint">{{ breakWindowHint }}</p>
              </div>

              <Motion as="button" type="button" class="bt-end-btn"
                :whileHover="reduced ? {} : { y: -2, scale: 1.03 }"
                :whileTap="reduced ? {} : { scale: 0.96 }"
                :disabled="loading"
                @click="doEndBreak"
              >
                <span class="bt-end-aura" />
                <span class="bt-end-icon"><CheckCircle2 :size="20" /></span>
                <span class="bt-end-label">End break</span>
                <span class="bt-end-arrow"><ArrowRight :size="14" /></span>
              </Motion>
            </Motion>
          </div>

          <!-- DONE -->
          <div v-else key="done" class="punch-btn punch-done">
            <span class="punch-icon-wrap success"><Check :size="22" /></span>
            <div class="punch-body">
              <span class="punch-label">Day complete</span>
              <span class="punch-sub">You've put in {{ formatDuration(elapsedSeconds) }} today. See you tomorrow.</span>
            </div>
          </div>
        </transition>

        <p v-if="isBlocked" class="block-note"><Info :size="11" /> {{ blockReason }}</p>

        <!-- Pulse panel — fills the previously-empty space on the action deck with
             at-a-glance productivity stats. -->
        <Motion as="article" class="pulse-panel"
          :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.55, delay: 0.32, ease: [0.22, 1, 0.36, 1] }"
        >
          <header class="pulse-head">
            <span class="rail-eyebrow"><Zap :size="11" />Your pulse</span>
            <span class="head-meta">live · last 14 days</span>
          </header>
          <div class="pulse-grid">
            <Motion class="pulse-tile streak"
              :initial="{ opacity: 0, scale: 0.85 }" :animate="{ opacity: 1, scale: 1 }"
              :transition="{ duration: 0.4, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] }"
              :whileHover="reduced ? {} : { y: -2, scale: 1.04 }"
            >
              <span class="tile-aura" />
              <span class="tile-icon"><Flame :size="16" /></span>
              <span class="tile-value onb-mono">{{ pulseData.streak }}</span>
              <span class="tile-label">Day streak</span>
              <span class="tile-foot">{{ pulseData.streak >= 5 ? 'on fire 🔥' : 'keep going' }}</span>
            </Motion>
            <Motion class="pulse-tile avg"
              :initial="{ opacity: 0, scale: 0.85 }" :animate="{ opacity: 1, scale: 1 }"
              :transition="{ duration: 0.4, delay: 0.46, ease: [0.34, 1.56, 0.64, 1] }"
              :whileHover="reduced ? {} : { y: -2, scale: 1.04 }"
            >
              <span class="tile-aura" />
              <span class="tile-icon"><TrendingUp :size="16" /></span>
              <span class="tile-value onb-mono">{{ pulseData.avgHours }}h</span>
              <span class="tile-label">Avg / day</span>
              <span class="tile-foot">target {{ pulseData.targetHours }}h</span>
            </Motion>
            <Motion class="pulse-tile target"
              :initial="{ opacity: 0, scale: 0.85 }" :animate="{ opacity: 1, scale: 1 }"
              :transition="{ duration: 0.4, delay: 0.52, ease: [0.34, 1.56, 0.64, 1] }"
              :whileHover="reduced ? {} : { y: -2, scale: 1.04 }"
            >
              <span class="tile-aura" />
              <span class="tile-icon"><Target :size="16" /></span>
              <span class="tile-value onb-mono">{{ pulseData.onTimePct }}%</span>
              <span class="tile-label">On-time</span>
              <span class="tile-foot">{{ pulseData.lateBy }}m avg late</span>
            </Motion>
            <Motion class="pulse-tile rank"
              :initial="{ opacity: 0, scale: 0.85 }" :animate="{ opacity: 1, scale: 1 }"
              :transition="{ duration: 0.4, delay: 0.58, ease: [0.34, 1.56, 0.64, 1] }"
              :whileHover="reduced ? {} : { y: -2, scale: 1.04 }"
            >
              <span class="tile-aura" />
              <span class="tile-icon"><Flame :size="16" /></span>
              <span class="tile-value onb-mono">
                {{ overtimeMinutes > 0 ? '+' + (overtimeMinutes >= 60 ? (overtimeMinutes / 60).toFixed(1) + 'h' : overtimeMinutes + 'm') : '0m' }}
              </span>
              <span class="tile-label">Overtime</span>
              <span class="tile-foot">{{ overtimeMinutes > 0 ? 'past shift end — auto-tracked' : 'live · resets daily' }}</span>
            </Motion>
          </div>
        </Motion>

        <!-- My Requests — submitted correction + WFH tickets with live status. -->
        <Motion as="article" class="myreq-panel"
          :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.55, delay: 0.4, ease: [0.22, 1, 0.36, 1] }"
        >
          <header class="myreq-head">
            <span class="rail-eyebrow"><Activity :size="11" />My requests</span>
            <span class="head-meta">{{ totalRequests }} item{{ totalRequests === 1 ? '' : 's' }} · live</span>
            <button class="myreq-refresh" @click="loadMyRequests" :disabled="myRequests.loading"><RefreshCw :size="11" :class="{ spin: myRequests.loading }" /></button>
          </header>
          <div v-if="myRequests.loading && !totalRequests" class="myreq-empty">
            <Hourglass :size="14" /><span>Fetching your requests…</span>
          </div>
          <div v-else-if="!totalRequests" class="myreq-empty">
            <Check :size="14" /><span>No pending requests — all good.</span>
          </div>
          <ul v-else class="myreq-list">
            <Motion v-for="(r, i) in mergedRequests" :key="r.id || i" as="li"
              :class="['myreq-item', `tone-${requestStatusTone(r.status)}`]"
              :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.34, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
              :whileHover="reduced ? {} : { x: 2 }"
            >
              <span class="myreq-icon">
                <component :is="myreqIcon(r)" :size="13" />
              </span>
              <div class="myreq-body">
                <div class="myreq-row">
                  <span class="myreq-title">{{ myreqTitle(r) }}</span>
                  <span v-if="r.type === 'HALF_DAY' && r.is_admin_override" class="myreq-badge" title="Admin manually tagged this day">
                    <ShieldCheck :size="9" />Admin tag
                  </span>
                  <span class="myreq-status" :data-tone="requestStatusTone(r.status)">
                    <span class="myreq-status-dot" />{{ requestStatusLabel(r.status) }}
                  </span>
                </div>
                <div class="myreq-meta">
                  <span><CalendarDays :size="9" />{{ fmtRequestDate(r.dateLabel) }}</span>
                  <span v-if="r.type === 'HALF_DAY'" class="myreq-half-tag">
                    <SunMedium :size="9" />{{ r.which_half === 'FIRST' ? '1st half off' : '2nd half off' }}
                  </span>
                  <span v-if="r.reason" class="myreq-reason" :title="r.reason">{{ r.reason }}</span>
                </div>
                <div v-if="r.status === 'REJECTED' && r.rejection_reason" class="myreq-rejection">
                  <Siren :size="10" /><span>{{ r.rejection_reason }}</span>
                </div>
              </div>
            </Motion>
          </ul>
          <footer v-if="totalRequests > MYREQ_PAGE_SIZE" class="myreq-pager">
            <button class="pager-btn" :disabled="myreqPage === 1" @click="myreqPage--" aria-label="Previous page">
              <ChevronLeft :size="13" />
            </button>
            <span class="pager-meta">
              <span class="pager-range onb-mono">{{ myreqPageStart }}–{{ myreqPageEnd }}</span>
              <span class="pager-of">of</span>
              <span class="pager-total onb-mono">{{ totalRequests }}</span>
            </span>
            <div class="pager-dots" aria-hidden="true">
              <button v-for="p in myreqTotalPages" :key="p"
                :class="['pager-dot', { active: p === myreqPage }]"
                @click="myreqPage = p"
                :aria-label="`Go to page ${p}`"
              />
            </div>
            <button class="pager-btn" :disabled="myreqPage === myreqTotalPages" @click="myreqPage++" aria-label="Next page">
              <ChevronRight :size="13" />
            </button>
          </footer>
        </Motion>
      </div>

      <!-- RIGHT: contextual rail -->
      <div class="deck-rail">
        <Motion as="article" class="rail-card location-card"
          :initial="{ opacity: 0, x: 12 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.5, delay: 0.25 }"
          :data-verified="geo.verified" :data-loading="geo.loading" :data-blocked="geo.blocked"
        >
          <header class="rail-head">
            <span class="rail-eyebrow"><Navigation :size="11" />Live location</span>
            <span class="rail-pill" :data-tone="geo.tone || (geo.verified ? 'good' : (geo.loading ? 'neutral' : 'warn'))">
              <span class="rail-pill-dot" />
              {{ geo.verified ? 'verified' : (geo.loading ? 'locating' : 'outside zone') }}
            </span>
          </header>
          <div class="loc-radar">
            <svg viewBox="0 0 100 100" class="radar-svg" aria-hidden="true">
              <defs>
                <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="rgba(94,234,212,0)" />
                  <stop offset="100%" stop-color="rgba(94,234,212,0.85)" />
                </linearGradient>
                <linearGradient id="sweepWarn" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="rgba(251,146,60,0)" />
                  <stop offset="100%" stop-color="rgba(251,146,60,0.95)" />
                </linearGradient>
              </defs>
              <circle class="r-ring r-ring-3" cx="50" cy="50" r="46" />
              <circle class="r-ring r-ring-2" cx="50" cy="50" r="32" />
              <circle class="r-ring r-ring-1" cx="50" cy="50" r="18" />
              <circle class="r-sweep" cx="50" cy="50" r="46" pathLength="100"
                :stroke="geo.blocked ? 'url(#sweepWarn)' : 'url(#sweepGrad)'" />
              <circle class="r-dot" cx="50" cy="50" r="3.5" />
              <circle class="r-dot-pulse" cx="50" cy="50" r="3.5" />
            </svg>
          </div>
          <div class="loc-body">
            <div class="loc-title">
              <span class="loc-name">{{ geo.label }}</span>
              <span v-if="addr?.country" class="loc-country">{{ addr.country }}</span>
            </div>
            <div class="loc-meta">{{ geo.detail }}</div>
            <div v-if="geo.fence || geo.hint" class="loc-fence" :class="{ blocked: geo.blocked }">
              <component :is="geo.blocked ? Siren : ShieldCheck" :size="11" />
              <span>{{ geo.hint || (geo.fence?.name) }}</span>
            </div>
            <div v-if="hasRealCoords(coords)" class="loc-coords onb-mono">
              <Globe2 :size="10" />
              <span>{{ coords.latitude.toFixed(5) }} · {{ coords.longitude.toFixed(5) }}</span>
              <span class="loc-acc">±{{ Math.round(coords.accuracy || 0) }}m</span>
            </div>
            <div class="loc-actions">
              <button type="button" class="link-btn" @click="forceGeoRefresh"><RefreshCw :size="11" />Refresh GPS</button>
              <span v-if="fences.length" class="loc-fences-count"><Building2 :size="10" />{{ fences.length }} authorised zone{{ fences.length === 1 ? '' : 's' }}</span>
            </div>
          </div>
        </Motion>

        <Motion as="article" class="rail-card break-card"
          :initial="{ opacity: 0, x: 12 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.5, delay: 0.32 }"
          v-if="todayData?.shift"
        >
          <header class="rail-head">
            <span class="rail-eyebrow"><Coffee :size="11" />Break window</span>
            <span class="rail-pill" :data-tone="breakPill.tone"><span class="rail-pill-dot" />{{ breakPill.label }}</span>
          </header>
          <div class="bw-bar">
            <div class="bw-used" :style="{ width: breakUsedPct + '%' }" />
            <div class="bw-cap-text">
              <span class="onb-mono">{{ todayData.break_used_minutes || 0 }}</span>
              <span class="bw-sep">/</span>
              <span class="onb-mono">{{ todayData.shift.break_minutes }}</span>
              <span class="bw-unit">min</span>
            </div>
          </div>
          <div class="bw-windows" v-if="(todayData.shift.break_windows || []).length">
            <div v-for="(w, i) in todayData.shift.break_windows" :key="i" class="bw-pill"
              :data-active="todayData?.current_break_window?.label === w.label"
            >
              <span class="bw-pill-label">{{ w.label }}</span>
              <span class="bw-pill-time">{{ w.start_time }} – {{ w.end_time }}</span>
              <span class="bw-pill-max">{{ w.max_minutes }}m</span>
            </div>
          </div>
          <div v-else class="bw-no-windows">No fixed break windows · take a break anytime within the daily cap.</div>
        </Motion>

        <Motion as="article" class="rail-card shift-card-mini"
          :initial="{ opacity: 0, x: 12 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.5, delay: 0.38 }"
          v-if="todayData?.shift"
        >
          <header class="rail-head">
            <span class="rail-eyebrow"><Clock :size="11" />Today's shift</span>
            <span class="rail-pill"><span class="rail-pill-dot" />{{ todayData.shift.shift_type }}</span>
          </header>
          <div class="sft-name">{{ todayData.shift.name }}</div>
          <div class="sft-times onb-mono">
            <span class="sft-time-block">
              <span class="sft-time-label">START</span>
              <span class="sft-time-value">{{ shortTime(todayData.shift.start_time) || '—' }}</span>
            </span>
            <span class="sft-arrow"><ArrowRight :size="14" /></span>
            <span class="sft-time-block">
              <span class="sft-time-label">END</span>
              <span class="sft-time-value">{{ shortTime(todayData.shift.end_time) || '—' }}</span>
            </span>
          </div>

          <!-- Live overtime read-out — only shows when working past shift end. -->
          <div v-if="overtimeMinutes > 0" class="sft-overtime">
            <span class="ovt-pulse" />
            <Flame :size="12" />
            <span class="ovt-label">Overtime</span>
            <span class="ovt-value onb-mono">+{{ overtimeMinutes }}m</span>
          </div>

          <div class="sft-meta">
            <span class="sft-meta-chip" :title="`Punches within ${todayData.shift.grace_minutes} minutes of the start time are still marked on-time. Beyond grace your day is flagged as LATE.`">
              <Hourglass :size="10" />{{ todayData.shift.grace_minutes }}m grace
              <Info :size="9" class="meta-info" />
            </span>
            <span class="sft-meta-chip" :title="todayData.shift.late_punch_requires_approval ? `Beyond ${lateLockMinutes} minutes late, self-punch locks. You must request approval and an admin must approve before the punch lands.` : 'No approval required for any clock-in time today.'">
              <ShieldCheck :size="10" />{{ todayData.shift.late_punch_requires_approval ? 'Approval after ' + lateLockMinutes + 'm' : 'Open clock-in' }}
              <Info :size="9" class="meta-info" />
            </span>
          </div>
        </Motion>
      </div>
    </Motion>

    <!-- ───────────────────── DAY JOURNEY (REDESIGNED) ───────────────────── -->
    <Motion as="section" class="journey-v2"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, delay: 0.20, ease: [0.22, 1, 0.36, 1] }"
    >
      <header class="journey-head">
        <div class="journey-head-left">
          <span class="journey-eyebrow"><Activity :size="11" />Live timeline</span>
          <h2 class="journey-title">Today's journey</h2>
        </div>
        <div class="journey-head-right">
          <div class="journey-summary">
            <div class="js-bubble teal">
              <Fingerprint :size="11" />
              <span class="js-val onb-mono">{{ formatTime(todayData?.attendance?.check_in_time) || '—:—' }}</span>
              <span class="js-lbl">first punch</span>
            </div>
            <div class="js-bubble warm">
              <Activity :size="11" />
              <span class="js-val onb-mono">{{ formatDuration(elapsedSeconds) }}</span>
              <span class="js-lbl">total today</span>
            </div>
            <div v-if="overtimeMinutes > 0" class="js-bubble fire">
              <Flame :size="11" />
              <span class="js-val onb-mono">+{{ overtimeMinutes }}m</span>
              <span class="js-lbl">overtime</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Horizontal progress arc — connects all events with live progress -->
      <div class="journey-arc">
        <div class="jarc-track">
          <div class="jarc-fill" :style="{ width: (timelineProgress * 100) + '%' }">
            <span class="jarc-glow" />
          </div>
          <div class="jarc-pulse" :style="{ left: (timelineProgress * 100) + '%' }">
            <span class="jarc-pulse-dot" />
            <span class="jarc-pulse-ring" />
          </div>
        </div>
        <div class="jarc-labels">
          <span>{{ shortTime(todayData?.shift?.start_time) || 'start' }}</span>
          <span class="jarc-mid">{{ Math.round(timelineProgress * 100) }}% of shift</span>
          <span>{{ shortTime(todayData?.shift?.end_time) || 'end' }}</span>
        </div>
      </div>

      <!-- Event cards — richer data, hover-lift, status pill -->
      <div class="journey-events">
        <Motion v-for="(ev, i) in timelineEvents" :key="ev.key" as="article"
          :class="['jev-card', `tone-${ev.tone}`, { 'is-now': ev.now }]"
          :initial="{ opacity: 0, y: 14, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.4, delay: 0.06 * i, ease: [0.34, 1.56, 0.64, 1] }"
          :whileHover="reduced ? {} : { y: -3 }"
        >
          <div class="jev-rail" aria-hidden="true">
            <span class="jev-rail-line" />
            <span class="jev-rail-dot"><component :is="ev.icon" :size="13" /></span>
            <span v-if="ev.now" class="jev-now-pulse" />
          </div>
          <div class="jev-body">
            <div class="jev-row">
              <span class="jev-time onb-mono">{{ ev.time }}</span>
              <span class="jev-pill" :data-tone="ev.tone">{{ ev.statusLabel || ev.tone }}</span>
            </div>
            <div class="jev-label">{{ ev.label }}</div>
            <div v-if="ev.detail" class="jev-detail">{{ ev.detail }}</div>
          </div>
        </Motion>
      </div>
    </Motion>

    <!-- ───────────────────── INSIGHTS v2 — ULTRA-MODERN ───────────────────── -->
    <Motion as="section" class="insights-v2"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, delay: 0.22 }"
    >
      <div class="ins-atmos" aria-hidden="true">
        <div class="ins-aurora-a" />
        <div class="ins-aurora-b" />
        <div class="ins-grid" />
      </div>

      <header class="ins-head">
        <div class="ins-head-left">
          <span class="ins-eyebrow"><Sparkles :size="11" />Performance pulse</span>
          <h2 class="ins-title">Week at a glance</h2>
          <p class="ins-sub">Rolling 14-day window · hover the chips to drill in</p>
        </div>
        <div class="ins-head-right">
          <span class="ins-meta">{{ history.length }} day{{ history.length === 1 ? '' : 's' }} tracked</span>
        </div>
      </header>

      <div class="ins-deck">
        <!-- LEFT — Big attendance ring chart -->
        <Motion as="article" class="ins-ring-card"
          :initial="{ opacity: 0, scale: 0.92 }" :animate="{ opacity: 1, scale: 1 }"
          :transition="{ duration: 0.55, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }"
        >
          <div class="irc-bg" />
          <div class="irc-ring-wrap">
            <svg viewBox="0 0 160 160" class="irc-ring" aria-hidden="true">
              <defs>
                <linearGradient id="ircGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#5eead4" />
                  <stop offset="50%" stop-color="#facc15" />
                  <stop offset="100%" stop-color="#fb923c" />
                </linearGradient>
                <filter id="ircGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" />
                </filter>
              </defs>
              <circle class="irc-bg-ring" cx="80" cy="80" r="68" />
              <circle class="irc-glow-ring" cx="80" cy="80" r="68"
                :stroke-dasharray="`${2 * Math.PI * 68}`"
                :stroke-dashoffset="(2 * Math.PI * 68) * (1 - summary.attendancePct / 100)"
                transform="rotate(-90 80 80)" filter="url(#ircGlow)" />
              <circle class="irc-fill-ring" cx="80" cy="80" r="68"
                :stroke-dasharray="`${2 * Math.PI * 68}`"
                :stroke-dashoffset="(2 * Math.PI * 68) * (1 - summary.attendancePct / 100)"
                transform="rotate(-90 80 80)" />
              <!-- Tick dots -->
              <g class="irc-ticks">
                <circle v-for="n in 24" :key="n"
                  :cx="80 + 76 * Math.cos((n - 1) * (Math.PI / 12) - Math.PI / 2)"
                  :cy="80 + 76 * Math.sin((n - 1) * (Math.PI / 12) - Math.PI / 2)"
                  :r="n % 6 === 0 ? 1.6 : 0.9"
                  fill="rgba(94, 234, 212, 0.45)" />
              </g>
            </svg>
            <div class="irc-center">
              <div class="irc-eyebrow">attendance</div>
              <div class="irc-value onb-mono">{{ summary.attendancePct }}<span class="irc-pct">%</span></div>
              <div class="irc-sub">{{ summary.presentDays }} of {{ summary.presentDays + summary.absentDays }} days</div>
            </div>
            <!-- Orbiting accent particles -->
            <span class="irc-orbit irc-orbit-1" />
            <span class="irc-orbit irc-orbit-2" />
            <span class="irc-orbit irc-orbit-3" />
          </div>
        </Motion>

        <!-- MIDDLE — Stat chip stack -->
        <div class="ins-chip-stack">
          <Motion v-for="(c, i) in insightChips" :key="c.key" as="article"
            :class="['ins-chip', `tone-${c.tone}`]"
            :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.4, delay: 0.36 + 0.05 * i, ease: [0.22, 1, 0.36, 1] }"
            :whileHover="reduced ? {} : { x: 4, scale: 1.02 }"
          >
            <span class="chip-glow" />
            <span class="chip-icon"><component :is="c.icon" :size="14" /></span>
            <div class="chip-text">
              <span class="chip-label">{{ c.label }}</span>
              <span class="chip-value onb-mono">{{ c.value }}</span>
            </div>
            <span class="chip-bar"><span class="chip-bar-fill" :style="{ width: c.pct + '%' }" /></span>
          </Motion>
        </div>

        <!-- RIGHT — Mini sparkline of last-14-days hours -->
        <Motion as="article" class="ins-spark-card"
          :initial="{ opacity: 0, scale: 0.92 }" :animate="{ opacity: 1, scale: 1 }"
          :transition="{ duration: 0.55, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] }"
        >
          <header class="isp-head">
            <span class="isp-eyebrow"><TrendingUp :size="11" />Hours trend</span>
            <span class="isp-avg onb-mono">{{ pulseData.avgHours }}h<span class="isp-avg-lbl">avg</span></span>
          </header>
          <svg :viewBox="`0 0 ${Math.max(80, history.length * 14)} 60`" preserveAspectRatio="none" class="isp-svg">
            <defs>
              <linearGradient id="ispFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="rgba(94, 234, 212, 0.55)" />
                <stop offset="100%" stop-color="rgba(94, 234, 212, 0)" />
              </linearGradient>
              <linearGradient id="ispLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#5eead4" />
                <stop offset="50%" stop-color="#facc15" />
                <stop offset="100%" stop-color="#fb923c" />
              </linearGradient>
            </defs>
            <!-- Area fill -->
            <path :d="sparkArea" fill="url(#ispFill)" class="isp-area" />
            <!-- Line -->
            <path :d="sparkPath" fill="none" stroke="url(#ispLine)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="isp-line" />
            <!-- Dots -->
            <circle v-for="(pt, i) in sparkPoints" :key="i" :cx="pt.x" :cy="pt.y" r="2.5"
              :class="['isp-dot', { last: i === sparkPoints.length - 1 }]" />
          </svg>
          <div class="isp-foot">
            <span>{{ sparkPoints[0] ? formatHistoryDate(history[history.length - 1]?.date) : '' }}</span>
            <span class="isp-foot-mid">trend · last {{ history.length }} days</span>
            <span>today</span>
          </div>
        </Motion>
      </div>

      <!-- HISTORY TAPE — animated tiles for each tracked day -->
      <div class="ins-tape">
        <Motion v-for="(d, i) in history" :key="d.date" as="button" type="button"
          :class="['itape-card', `status-${d.status}`]"
          :data-status="d.status"
          :initial="{ opacity: 0, y: 16, rotateX: 14 }" :animate="{ opacity: 1, y: 0, rotateX: 0 }"
          :transition="{ duration: 0.4, delay: 0.5 + 0.022 * i, ease: [0.22, 1, 0.36, 1] }"
          :whileHover="reduced ? {} : { y: -6, scale: 1.05 }"
        >
          <span class="itape-aura" />
          <span class="itape-weekday">{{ weekday(d.date) }}</span>
          <span class="itape-day onb-mono">{{ dayNum(d.date) }}</span>
          <AttStatusPill :status="d.status" size="sm" />
          <span class="itape-hours onb-mono">{{ (d.working_hours || 0).toFixed(1) }}h</span>
          <span class="itape-bar"><span class="itape-bar-fill" :style="{ height: Math.min(100, (Number(d.working_hours || 0) / 10) * 100) + '%' }" /></span>
        </Motion>
      </div>
    </Motion>

    <!-- ───────────────────── QUICK ACTIONS ───────────────────── -->
    <Motion as="section" class="quick-row"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.25 }"
    >
      <Motion as="button" type="button" class="qa-btn"
        :whileHover="reduced ? {} : { y: -3, scale: 1.02 }"
        :whileTap="reduced ? {} : { scale: 0.97 }"
        @click="showCorrection = true"
      >
        <span class="qa-icon"><Pencil :size="16" /></span>
        <div class="qa-body">
          <span class="qa-label">Request correction</span>
          <span class="qa-sub">Missing punch · biometric failure</span>
        </div>
      </Motion>
      <Motion as="button" type="button" class="qa-btn"
        :whileHover="reduced ? {} : { y: -3, scale: 1.02 }"
        :whileTap="reduced ? {} : { scale: 0.97 }"
        @click="openWfhRequest('WFH')"
      >
        <span class="qa-icon"><Home :size="16" /></span>
        <div class="qa-body">
          <span class="qa-label">Request WFH</span>
          <span class="qa-sub">Approved WFH waives geo</span>
        </div>
      </Motion>
      <Motion as="button" type="button" class="qa-btn"
        :whileHover="reduced ? {} : { y: -3, scale: 1.02 }"
        :whileTap="reduced ? {} : { scale: 0.97 }"
        @click="openWfhRequest('REMOTE')"
      >
        <span class="qa-icon"><Globe2 :size="16" /></span>
        <div class="qa-body">
          <span class="qa-label">Request remote day</span>
          <span class="qa-sub">Field / client-site · GPS-stamped</span>
        </div>
      </Motion>
      <Motion as="button" type="button" class="qa-btn"
        :whileHover="reduced ? {} : { y: -3, scale: 1.02 }"
        :whileTap="reduced ? {} : { scale: 0.97 }"
        @click="openHalfDayRequest()"
      >
        <span class="qa-icon qa-icon-hd"><SunMedium :size="16" /></span>
        <div class="qa-body">
          <span class="qa-label">Request half-day</span>
          <span class="qa-sub">First or second half · admin approval</span>
        </div>
      </Motion>
      <Motion as="button" type="button" class="qa-btn"
        :whileHover="reduced ? {} : { y: -3, scale: 1.02 }"
        :whileTap="reduced ? {} : { scale: 0.97 }"
        @click="openOtRequest()"
      >
        <span class="qa-icon qa-icon-ot"><TimerReset :size="16" /></span>
        <div class="qa-body">
          <span class="qa-label">Request OT</span>
          <span class="qa-sub">Pre-approval · auto-detected too</span>
        </div>
      </Motion>
      <Motion as="button" type="button" class="qa-btn"
        :whileHover="reduced ? {} : { y: -3, scale: 1.02 }"
        :whileTap="reduced ? {} : { scale: 0.97 }"
        @click="openReport()"
      >
        <span class="qa-icon"><FileText :size="16" /></span>
        <div class="qa-body">
          <span class="qa-label">Attendance report</span>
          <span class="qa-sub">Daily punches · breaks · overtime · late</span>
        </div>
      </Motion>
      <Motion as="button" type="button" class="qa-btn"
        :whileHover="reduced ? {} : { y: -3, scale: 1.02 }"
        :whileTap="reduced ? {} : { scale: 0.97 }"
        @click="loadMonth(); showMonth = !showMonth"
      >
        <span class="qa-icon"><CalendarDays :size="16" /></span>
        <div class="qa-body">
          <span class="qa-label">Month view</span>
          <span class="qa-sub">{{ showMonth ? 'Hide' : 'Show' }} the full month grid</span>
        </div>
      </Motion>
    </Motion>

    <!-- ───────────────────── MONTH ───────────────────── -->
    <transition name="ssa-fade">
      <section v-if="showMonth" class="month">
        <header class="section-head">
          <h2><CalendarDays :size="14" />{{ monthLabel }}</h2>
          <div class="month-legend">
            <span class="legend-chip" data-status="PRESENT"><span class="legend-dot" />Present</span>
            <span class="legend-chip" data-status="LATE"><span class="legend-dot" />Late</span>
            <span class="legend-chip" data-status="ABSENT"><span class="legend-dot" />Absent</span>
            <span class="legend-chip" data-status="WFH"><span class="legend-dot" />WFH</span>
            <span class="legend-chip" data-status="HOLIDAY"><span class="legend-dot" />Holiday</span>
            <span class="legend-chip" data-status="WEEK_OFF"><span class="legend-dot" />Week-off</span>
          </div>
        </header>
        <div class="month-grid">
          <span v-for="d in ['S','M','T','W','T','F','S']" :key="d" class="m-weekday">{{ d }}</span>
          <span v-for="(b, i) in monthBlanks" :key="`b-${i}`" class="m-cell is-blank" />
          <Motion v-for="(c, i) in monthDots" :key="c.date" as="div"
            :class="['m-cell', { today: c.today, future: c.future }]"
            :data-status="c.status"
            :initial="{ opacity: 0, scale: 0.5, y: 8 }"
            :animate="{ opacity: 1, scale: 1, y: 0 }"
            :transition="{ duration: 0.34, delay: 0.014 * i, ease: [0.34, 1.56, 0.64, 1] }"
            :whileHover="reduced ? {} : { y: -3, scale: 1.06 }"
            @mouseenter="(e) => showCellTip(e, c)"
            @mouseleave="hideCellTip"
            @focusin="(e) => showCellTip(e, c)"
            @focusout="hideCellTip"
            tabindex="0"
          >
            <span class="m-num">{{ dayNum(c.date) }}</span>
            <span class="m-status-bar" />
            <span v-if="c.today" class="m-today-ring" />
            <span v-if="c.is_holiday" class="m-badge">★</span>
          </Motion>
        </div>

        <!-- Floating tooltip for month cells -->
        <transition name="tip-fade">
          <div v-if="tip.show" class="m-tooltip" :style="{ top: tip.y + 'px', left: tip.x + 'px' }">
            <div class="tip-head">
              <span class="tip-date">{{ tip.date }}</span>
              <AttStatusPill :status="tip.status" size="sm" />
            </div>
            <div class="tip-rows">
              <div class="tip-row"><Clock :size="10" /><span>Hours worked</span><b class="onb-mono">{{ (tip.workingHours || 0).toFixed(1) }}h</b></div>
              <div v-if="tip.lateMinutes" class="tip-row warn"><Timer :size="10" /><span>Late by</span><b class="onb-mono">{{ tip.lateMinutes }}m</b></div>
              <div v-if="tip.isHoliday" class="tip-row gold"><Sparkles :size="10" /><span>Holiday</span><b>{{ tip.holidayName || 'Public holiday' }}</b></div>
              <div v-if="tip.isWeekOff" class="tip-row neutral"><Coffee :size="10" /><span>Week-off</span><b>Take it easy</b></div>
            </div>
          </div>
        </transition>
      </section>
    </transition>

    <!-- ───────────────────── MODALS ───────────────────── -->
    <!-- ── Correction modal — uses the SAME OnbModal shell as Add Asset ── -->
    <OnbModal
      :open="showCorrection"
      title="Request a correction"
      subtitle="Forgot to punch? Biometric down? Send the desired in/out times — admin reviews and rolls it up."
      :icon="Pencil"
      :width="620"
      @close="showCorrection = false"
    >
      <div class="form-stack">
        <OnbField v-model="correctionForm.attendance_date" type="date" label="Date" required />
        <div class="form-grid-2">
          <OnbField v-model="correctionForm.in_time" type="time" label="Clock-in time" placeholder="HH:MM" />
          <OnbField v-model="correctionForm.out_time" type="time" label="Clock-out time" placeholder="HH:MM" />
        </div>
        <OnbField
          v-model="correctionForm.reason"
          type="textarea"
          label="Reason"
          required
          placeholder="What happened? e.g. biometric down, network outage at branch office"
          :rows="3"
          full
          hint="Tell admin exactly what went wrong — the more context, the faster approval."
        />
      </div>
      <template #footer>
        <button class="onb-btn-ghost" @click="showCorrection = false">Cancel</button>
        <button class="onb-btn-primary" :disabled="!correctionValid || submitting" @click="submitCorrection">
          <Pencil :size="13" /> Submit request
        </button>
      </template>
    </OnbModal>

    <!-- ── WFH / Remote modal — uses the SAME OnbModal shell as Add Asset ── -->
    <OnbModal
      :open="showWfh"
      :title="wfhForm.request_type === 'REMOTE' ? 'Request remote day' : 'Request WFH'"
      :subtitle="wfhForm.request_type === 'REMOTE'
        ? 'Field / client-site work. The day is GPS-stamped; admin approval still applies.'
        : 'Approved WFH waives the geo-fence check for every date you select.'"
      :icon="wfhForm.request_type === 'REMOTE' ? Globe2 : Home"
      :width="620"
      @close="showWfh = false"
    >
      <div class="form-stack">
        <div class="form-grid-2">
          <OnbField v-model="wfhForm.wfh_date" type="date" label="From" required />
          <OnbField v-model="wfhForm.wfh_date_until" type="date" label="Until (optional)" />
        </div>
        <OnbField v-model="wfhForm.request_type" type="select" label="Type" required :options="wfhTypeOptions" />
        <OnbField
          v-model="wfhForm.reason"
          type="textarea"
          label="Reason"
          required
          placeholder="Why do you need to work off-site?"
          :rows="3"
          full
          hint="Admin sees this when reviewing — be specific."
        />
      </div>
      <template #footer>
        <button class="onb-btn-ghost" @click="showWfh = false">Cancel</button>
        <button class="onb-btn-primary" :disabled="!wfhValid || submitting" @click="submitWfh">
          <Home :size="13" /> Submit request
        </button>
      </template>
    </OnbModal>

    <!-- ── Half-day request modal ── -->
    <OnbModal
      :open="showHalfDay"
      title="Request a half-day"
      subtitle="Pick first or second half. Approval marks the date as HALF_DAY automatically — your half-day quota still applies."
      :icon="SunMedium"
      :width="600"
      @close="showHalfDay = false"
    >
      <div class="form-stack">
        <OnbField v-model="hdForm.half_day_date" type="date" label="Date" required hint="Today or any future date." />

        <Motion v-if="hdDateConflict.type"
          class="hd-conflict-banner"
          :data-type="hdDateConflict.type"
          :initial="{ opacity: 0, y: -6, scale: 0.98 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }"
        >
          <span class="hd-conflict-icon">
            <component :is="hdDateConflict.type === 'holiday' ? PartyPopper : Moon" :size="14" />
          </span>
          <div class="hd-conflict-text">
            <strong>{{ hdDateConflict.type === 'holiday' ? 'Already a holiday' : 'Already an off day' }}</strong>
            <span>{{ hdDateConflict.label }} Pick a working day to apply for a half-day.</span>
          </div>
        </Motion>

        <div class="hd-self-field">
          <span class="hd-self-label">Which half is off? <em>*</em></span>
          <div class="hd-self-half-grid">
            <Motion as="button" type="button" v-for="h in HD_HALVES" :key="h.value"
              :class="['hd-self-half-card', { active: hdForm.which_half === h.value }]"
              :whileHover="reduced ? {} : { y: -1 }"
              :whileTap="reduced ? {} : { scale: 0.97 }"
              @click="hdForm.which_half = h.value"
            >
              <div class="hd-self-half-visual">
                <span class="hd-self-am" :class="{ off: h.value === 'FIRST' }">AM</span>
                <span class="hd-self-pm" :class="{ off: h.value === 'SECOND' }">PM</span>
              </div>
              <span class="hd-self-half-title">{{ h.label }}</span>
              <span class="hd-self-half-sub">{{ h.desc }}</span>
              <Check v-if="hdForm.which_half === h.value" :size="11" class="hd-self-half-check" />
            </Motion>
          </div>
        </div>

        <div class="hd-self-field">
          <span class="hd-self-label">Reason type <em>*</em></span>
          <div class="hd-self-reason-grid">
            <button type="button" v-for="rt in HD_REASON_TYPES" :key="rt.value"
              :class="['hd-self-rt-chip', `tone-${rt.tone}`, { active: hdForm.reason_type === rt.value }]"
              @click="hdForm.reason_type = rt.value">
              <component :is="rt.icon" :size="11" />{{ rt.label }}
            </button>
          </div>
        </div>

        <OnbField
          v-model="hdForm.reason"
          type="textarea"
          label="Notes for your manager"
          required
          placeholder="e.g. Doctor's appointment at 2 PM — second half off."
          :rows="3"
          full
          hint="Admin sees this when reviewing — be specific."
        />
      </div>
      <template #footer>
        <button class="onb-btn-ghost" @click="showHalfDay = false">Cancel</button>
        <button class="onb-btn-primary" :disabled="!hdValid || submitting" @click="submitHalfDay">
          <SunMedium :size="13" /> Submit request
        </button>
      </template>
    </OnbModal>

    <!-- ── Overtime request modal ── -->
    <OnbModal
      :open="showOt"
      title="Request overtime"
      subtitle="Pre-submit OT for manager approval. Auto-detected OT (from clocking out past shift end) also lands in this list."
      :icon="TimerReset"
      :width="640"
      @close="showOt = false"
    >
      <div class="form-stack">
        <div class="form-grid-2">
          <OnbField v-model="otForm.date" type="date" label="Date" required hint="Up to 14 days back or 30 days ahead." />
          <OnbField
            v-model.number="otForm.ot_hours"
            type="number"
            label="Estimated hours"
            required
            placeholder="2.5"
            hint="Max 12h. Decimals OK (1.5 = 1h 30m)."
          />
        </div>
        <OnbField
          v-model="otForm.ot_type"
          type="select"
          label="OT type"
          required
          :options="otTypeOptions"
        />
        <OnbField
          v-model="otForm.reason"
          type="textarea"
          label="Reason / work plan"
          required
          placeholder="What needs to be done that requires OT? Include the project / ticket / deliverable."
          :rows="4"
          full
          hint="Manager sees this when reviewing — specifics speed up approval."
        />
        <!-- Corporate-norms hint -->
        <div class="ot-policy-hint">
          <Info :size="13" />
          <div>
            <strong>How OT works</strong>
            <ul>
              <li>Pre-submit before working — your manager approves and you log it.</li>
              <li>Auto-detected — if you clock out more than <em>grace minutes</em> past shift end, the system queues an OT request for you (breaks excluded).</li>
              <li>Approved OT feeds the next payroll run. Rejected OT stays on file for audit.</li>
            </ul>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="onb-btn-ghost" @click="showOt = false">Cancel</button>
        <button class="onb-btn-primary" :disabled="!otValid || submitting" @click="submitOt">
          <TimerReset :size="13" /> Submit OT request
        </button>
      </template>
    </OnbModal>

    <!-- ── Late-punch approval modal — uses the SAME OnbModal shell as Add Asset ── -->
    <OnbModal
      :open="showLateRequest"
      title="Request late clock-in"
      :subtitle="`You are ${todayData?.late_minutes_now ?? 0} minutes late · self-punch locks beyond ${lateLockMinutes} min. Tell admin what happened — the punch lands once approved.`"
      :icon="Siren"
      :width="540"
      @close="showLateRequest = false"
    >
      <div class="form-stack">
        <OnbField
          v-model="lateReason"
          type="textarea"
          label="Reason"
          required
          placeholder="e.g. traffic jam at Sarjapur · 30 min"
          :rows="3"
          full
          hint="Be specific — admin uses this to decide whether to approve."
        />
      </div>
      <template #footer>
        <button class="onb-btn-ghost" @click="showLateRequest = false">Cancel</button>
        <button class="onb-btn-primary" :disabled="!lateReasonValid || submitting" @click="submitLateRequest">
          <ShieldCheck :size="13" /> Submit for approval
        </button>
      </template>
    </OnbModal>

    <!-- ── Early-exit approval modal — clock-out is locked until admin approves ── -->
    <OnbModal
      :open="showEarlyExitRequest"
      title="Request early exit"
      :subtitle="`Shift ends at ${shortTime(todayData?.shift?.end_time) || '—'}. ${todayData?.minutes_until_shift_end ?? 0} min left. Tell admin why you need to clock out early — the OUT punch lands once it's approved.`"
      :icon="LogOut"
      :width="540"
      @close="showEarlyExitRequest = false"
    >
      <div class="form-stack">
        <OnbField
          v-model="earlyExitReason"
          type="textarea"
          label="Reason"
          required
          placeholder="e.g. dentist appointment at 4 PM · personal emergency"
          :rows="3"
          full
          hint="Be specific — admin uses this to decide whether to approve."
        />
      </div>
      <template #footer>
        <button class="onb-btn-ghost" @click="showEarlyExitRequest = false">Cancel</button>
        <button class="onb-btn-primary" :disabled="!earlyExitReasonValid || submitting" @click="submitEarlyExitRequest">
          <ShieldCheck :size="13" /> Submit for approval
        </button>
      </template>
    </OnbModal>

    <!-- ── Attendance Report drawer — per-day punch/break/overtime breakdown ── -->
    <OnbModal
      :open="showReport"
      title="Attendance report"
      subtitle="Daily punches, breaks, overtime and late minutes. Pick a day from the strip to drill in."
      :icon="FileText"
      :width="780"
      @close="showReport = false"
    >
      <!-- Date strip — ultra-modern 14-cell grid, no horizontal scroll.
           ──────────────────────────────────────────────────────────────
           All 14 days fit in equal columns; chips animate in with a
           gentle wave; active chip uses a soft "spotlight" glow + a
           rising gradient bar at the bottom (no rotation). Hover lifts
           the chip with a halo. Today wears a teal pulse. -->
      <div class="rep-strip">
        <div class="rep-strip-atmos" aria-hidden="true">
          <div class="rs-aurora rs-aurora-a" />
          <div class="rs-aurora rs-aurora-b" />
          <div class="rs-grid" />
        </div>
        <header class="rep-strip-head">
          <span class="rsh-eyebrow"><CalendarDays :size="11" />Last 14 days · pick a day</span>
          <span class="rsh-current">{{ formatReportDate(reportSelectedDate) || '—' }}</span>
        </header>
        <div class="rep-strip-track" ref="reportStripRef">
          <Motion v-for="(d, i) in reportStripDays" :key="d.iso" as="button" type="button"
            :class="['rep-strip-day', { active: d.iso === reportSelectedDate, today: d.today, 'has-hours': d.hours > 0 }]"
            :data-status="d.status"
            :initial="{ opacity: 0, y: 16, scale: 0.84 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :transition="{ duration: 0.46, delay: 0.028 * i, ease: [0.34, 1.56, 0.64, 1] }"
            :whileHover="reduced ? {} : { y: -3 }"
            :whileTap="reduced ? {} : { scale: 0.93 }"
            @click="selectReportDay(d.iso)"
            :title="`${d.dow} ${d.day} ${d.mon} · ${d.hours ? d.hours.toFixed(1) + 'h' : 'no work'} · ${d.status}`"
          >
            <!-- ambient spotlight halo behind active chip -->
            <span class="rsd-spotlight" aria-hidden="true" />
            <!-- today pulse marker -->
            <span v-if="d.today" class="rsd-today-pulse" aria-hidden="true" />
            <span class="rsd-dow">{{ d.dow.slice(0, 2) }}</span>
            <span class="rsd-day onb-mono">{{ d.day }}</span>
            <!-- bottom status indicator: gradient bar that grows on active -->
            <span class="rsd-indicator" aria-hidden="true">
              <span class="rsd-indicator-fill" />
            </span>
            <!-- side hours bar: subtle, only visible if has hours -->
            <span v-if="d.hours > 0" class="rsd-side-bar" aria-hidden="true">
              <span class="rsd-side-bar-fill" :style="{ height: d.barPct + '%' }" />
            </span>
          </Motion>
        </div>
      </div>

      <div v-if="reportLoading" class="rep-loading">
        <Hourglass :size="14" :class="{ spin: true }" /> Loading day…
      </div>
      <div v-else-if="!reportDay" class="rep-empty">
        <Info :size="14" /> Pick a day to see the breakdown.
      </div>
      <div v-else class="rep-body">
        <!-- Header card: status, date, totals -->
        <div class="rep-summary">
          <div class="rep-summary-left">
            <div class="rep-summary-date">{{ formatReportDate(reportDay.date) }}</div>
            <AttStatusPill :status="reportDay.status" size="md" />
            <div v-if="reportDay.is_auto_closed" class="rep-auto-pill">
              <AlertTriangle :size="11" /> Auto-closed — you forgot to clock out. <button class="rep-link" type="button" @click="prefillCorrectionFromReport">Submit a correction</button>
            </div>
          </div>
          <div class="rep-summary-grid">
            <div class="rep-stat">
              <span class="rep-stat-label">Worked</span>
              <span class="rep-stat-value onb-mono">{{ (reportDay.working_hours || 0).toFixed(2) }}<span class="rep-stat-unit">h</span></span>
            </div>
            <div class="rep-stat">
              <span class="rep-stat-label">Break</span>
              <span class="rep-stat-value onb-mono">{{ (reportDay.break_hours || 0).toFixed(2) }}<span class="rep-stat-unit">h</span></span>
              <span class="rep-stat-foot">{{ reportDay.break_count || 0 }}x</span>
            </div>
            <div class="rep-stat" :data-tone="reportDay.late_minutes > 0 ? 'warn' : 'neutral'">
              <span class="rep-stat-label">Late</span>
              <span class="rep-stat-value onb-mono">{{ reportDay.late_minutes || 0 }}<span class="rep-stat-unit">m</span></span>
            </div>
            <div class="rep-stat" :data-tone="reportDay.overtime_hours > 0 ? 'good' : 'neutral'">
              <span class="rep-stat-label">Overtime</span>
              <span class="rep-stat-value onb-mono">+{{ (reportDay.overtime_hours || 0).toFixed(2) }}<span class="rep-stat-unit">h</span></span>
            </div>
          </div>
        </div>

        <!-- Clock in / out heading bar -->
        <div class="rep-cio">
          <div class="rep-cio-block">
            <span class="rep-cio-eyebrow"><LogIn :size="11" />First clock-in</span>
            <span class="rep-cio-value onb-mono">{{ formatTime(reportDay.check_in_time) || '—:—' }}</span>
            <span class="rep-cio-sub">{{ reportDay.shift ? `shift starts ${shortTime(reportDay.shift.start_time)}` : 'no shift' }}</span>
          </div>
          <div class="rep-cio-arrow"><ArrowRight :size="16" /></div>
          <div class="rep-cio-block">
            <span class="rep-cio-eyebrow"><LogOut :size="11" />Last clock-out</span>
            <span class="rep-cio-value onb-mono">{{ formatTime(reportDay.check_out_time) || '—:—' }}</span>
            <span class="rep-cio-sub">{{ reportDay.shift ? `shift ends ${shortTime(reportDay.shift.end_time)}` : '' }}</span>
          </div>
        </div>

        <!-- Breaks -->
        <div class="rep-section">
          <header class="rep-section-head">
            <span class="rep-section-title"><Coffee :size="12" />Breaks taken</span>
            <span class="rep-section-meta">{{ reportDay.breaks?.length || 0 }} break{{ reportDay.breaks?.length === 1 ? '' : 's' }} · {{ (reportDay.break_hours || 0).toFixed(2) }}h total</span>
          </header>
          <div v-if="!reportDay.breaks?.length" class="rep-section-empty">No breaks recorded.</div>
          <ul v-else class="rep-break-list">
            <li v-for="(b, i) in reportDay.breaks" :key="i" :class="['rep-break-row', { 'is-open': b.is_open }]">
              <span class="rep-break-idx onb-mono">#{{ i + 1 }}</span>
              <div class="rep-break-window onb-mono">
                <span>{{ formatTime(b.start) }}</span>
                <span class="rep-break-arrow">→</span>
                <span>{{ b.end ? formatTime(b.end) : 'open' }}</span>
              </div>
              <span class="rep-break-dur onb-mono">{{ b.minutes ? b.minutes.toFixed(0) + 'm' : (b.is_open ? 'open' : '—') }}</span>
            </li>
          </ul>
        </div>

        <!-- Punch tape -->
        <div class="rep-section">
          <header class="rep-section-head">
            <span class="rep-section-title"><Activity :size="12" />Punch tape</span>
            <span class="rep-section-meta">{{ reportDay.punches?.length || 0 }} event{{ reportDay.punches?.length === 1 ? '' : 's' }}</span>
          </header>
          <div v-if="!reportDay.punches?.length" class="rep-section-empty">No punches recorded.</div>
          <ul v-else class="rep-tape">
            <li v-for="p in reportDay.punches" :key="p.id" :class="['rep-tape-row', `kind-${p.punch_type}`, { 'is-auto': p.is_auto }]">
              <span class="rep-tape-time onb-mono">{{ formatTime(p.punch_time) }}</span>
              <span class="rep-tape-pill">{{ punchLabel(p.punch_type) }}</span>
              <span v-if="p.is_auto" class="rep-tape-auto">auto</span>
              <span v-if="!p.geo_verified && !p.is_auto" class="rep-tape-flag">geo off</span>
              <span class="rep-tape-source">{{ p.source }}</span>
            </li>
          </ul>
        </div>

        <div v-if="reportDay.remarks" class="rep-remarks">
          <Info :size="12" /><span>{{ reportDay.remarks }}</span>
        </div>
      </div>

      <template #footer>
        <button class="onb-btn-ghost" @click="showReport = false">Close</button>
        <button v-if="reportDay" class="onb-btn-primary" @click="prefillCorrectionFromReport">
          <Pencil :size="13" /> Request correction
        </button>
      </template>
    </OnbModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Motion } from 'motion-v'
import { usePreferredReducedMotion, useGeolocation } from '@vueuse/core'
import { useToast } from 'vue-toastification'
import {
  Fingerprint, Coffee, LogOut, Clock, Sparkles, Home, ArrowRight,
  MapPin, CheckCircle2, Pencil, CalendarDays, X, Activity, Hourglass,
  Moon, Sunrise, ShieldCheck, Siren, Check, RefreshCw, Info, Timer,
  Building2, Navigation, Flame, TrendingUp, Award, Target, Zap, Globe2,
  FileText, LogIn, AlertTriangle, ChevronLeft, ChevronRight,
  SunMedium, Heart, HeartPulse, Briefcase, Users, XCircle,
  PartyPopper, TimerReset,
} from 'lucide-vue-next'
import AttStatusPill from './attendance/components/AttStatusPill.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import HrTextarea from '@/components/hr/forms/HrTextarea.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import HrFieldLabel from '@/components/hr/forms/HrFieldLabel.vue'
// Cross-feature reuse: the onboarding "Add Asset" modal uses these for its
// inputs + shell (matches the design the user specifically asked for here).
import OnbField from '@/views/hr/onboarding/components/OnbField.vue'
import OnbModal from '@/views/hr/onboarding/components/OnbModal.vue'
// The .onb-btn-primary / .onb-btn-ghost / .onb-cal-* rules live in this stylesheet.
// We import it unscoped (via JS) so the rules apply to the modal buttons + the
// HrDatePicker calendar popover that teleports outside `.ssa-page`'s data-v scope.
import '@/styles/onboarding-theme.css'
import {
  fetchTodayMine, clockIn, clockOut, startBreak, endBreak,
  fetchMyHistory, fetchMyMonth, createMyCorrection, createMyWfh,
  requestLatePunch, requestEarlyExit, fetchActiveGeoFences, haversineMeters, reverseGeocode,
  fetchMyHolidays, fetchMyCorrections, fetchMyWfh, fetchMyDayDetail,
  createMyHalfDay, fetchMyHalfDay, cancelMyHalfDay,
  createMyOvertime, fetchMyOvertime, cancelMyOvertime,
} from '@/composables/useSelfAttendance'

const toast = useToast()
const prefersReduced = usePreferredReducedMotion()
const reduced = computed(() => prefersReduced.value === 'reduce')

// ─────── live clock ───────
const liveTime = ref('--:--:--')
let tickId = null
const tick = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  liveTime.value = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ─────── greeting ───────
const userFirst = (() => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    if (u?.full_name) return u.full_name.split(' ')[0]
  } catch {}
  return 'there'
})()
const greetingWords = computed(() => {
  const h = new Date().getHours()
  const g = h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,'
  return [g, userFirst + '.']
})

// ─────── state ───────
const todayData = ref(null)
const history = ref([])
const monthDots = ref([])
const loading = ref(false)
const submitting = ref(false)
const elapsedSeconds = ref(0)
const breakElapsedSeconds = ref(0)
let elapsedTimer = null

const state = computed(() => {
  if (!todayData.value) return 'NOT_STARTED'
  const t = todayData.value
  if (t.next_action === 'done') return 'CLOCKED_OUT'
  if (t.open_punch === 'BREAK_START') return 'ON_BREAK'
  if (t.open_punch === 'IN') return 'CLOCKED_IN'
  return 'NOT_STARTED'
})

const isBlocked = computed(() => {
  if (todayData.value?.is_holiday || todayData.value?.is_week_off) return true
  // WFH-approved users skip the geo-fence check entirely.
  if (todayData.value?.wfh_approved) return false
  // GPS denied or outside an active fence → block clock-in.
  if (geo.value?.blocked) return true
  return false
})
const blockReason = computed(() => {
  if (todayData.value?.is_holiday) return `Today is a holiday (${todayData.value.holiday_name || ''}) — clock-in disabled.`
  if (todayData.value?.is_week_off) return `Today is your week-off — clock-in disabled.`
  if (todayData.value?.wfh_approved) return ''
  if (geo.value?.blocked) {
    if (geoError.value) return 'Location access denied — enable GPS in your browser and reload to punch in.'
    return geo.value.hint || 'You are outside an authorised punching zone. Move closer to a registered work location.'
  }
  return ''
})

const lateLockMinutes = computed(() => {
  const s = todayData.value?.shift
  if (!s) return 0
  return (s.grace_minutes || 0) + (s.late_self_punch_threshold_minutes || 0)
})

// Ultra-modern break countdown — recomputes every second while on break.
const breakTimer = computed(() => {
  const cap = Number(todayData.value?.shift?.break_minutes || 0)
  // Live used seconds — backend rollup + the locally ticking counter while on break.
  const usedSeconds = Math.max(0, breakElapsedSeconds.value)
  const usedMin = Math.floor(usedSeconds / 60)
  const usedSec = usedSeconds % 60
  if (!cap) {
    // No daily cap — just show elapsed time.
    return {
      overCap: false,
      progress: 0,
      usedPct: 0,
      usedMin, capMin: '—',
      display: `${String(usedMin).padStart(2, '0')}:${String(usedSec).padStart(2, '0')}`,
      subLabel: 'no daily cap · take your time',
    }
  }
  const capSec = cap * 60
  const remainSec = Math.max(0, capSec - usedSeconds)
  const overSec = Math.max(0, usedSeconds - capSec)
  const overCap = usedSeconds >= capSec
  const display = overCap
    ? `${String(Math.floor(overSec / 60)).padStart(2, '0')}:${String(overSec % 60).padStart(2, '0')}`
    : `${String(Math.floor(remainSec / 60)).padStart(2, '0')}:${String(remainSec % 60).padStart(2, '0')}`
  const usedPct = (usedSeconds / capSec) * 100
  // Progress for the ring grows as the user consumes break minutes.
  const progress = Math.min(1, usedSeconds / capSec)
  let subLabel
  if (overCap) subLabel = '⚠ past cap — wrap up & rejoin'
  else if (progress >= 0.85) subLabel = 'almost done · grab the last sip'
  else if (progress >= 0.5) subLabel = 'midway · enjoy the recharge'
  else subLabel = 'just started · breathe & reset'
  return { overCap, progress, usedPct, usedMin, capMin: cap, display, subLabel }
})

// Live overtime tracker — minutes past the planned shift end.
// Counts only when the user is still clocked in (or has clocked out past end).
const overtimeMinutes = computed(() => {
  const s = todayData.value?.shift
  const a = todayData.value?.attendance
  if (!s?.end_time) return 0
  const today = new Date()
  const [eh, em] = s.end_time.split(':').map(Number)
  const end = new Date(today); end.setHours(eh, em || 0, 0, 0)
  if (s.start_time) {
    const [sh, sm] = s.start_time.split(':').map(Number)
    const start = new Date(today); start.setHours(sh, sm || 0, 0, 0)
    if (end <= start) end.setDate(end.getDate() + 1)
  }
  let pastEndMs = 0
  if (a?.check_out_time) {
    const co = new Date(a.check_out_time)
    pastEndMs = co.getTime() - end.getTime()
  } else if (state.value === 'CLOCKED_IN' || state.value === 'ON_BREAK') {
    pastEndMs = Date.now() - end.getTime()
  }
  return Math.max(0, Math.floor(pastEndMs / 60000))
})

const shiftProgress = computed(() => {
  const s = todayData.value?.shift
  if (!s) return 0
  const today = new Date()
  const [sh, sm] = (s.start_time || '09:00:00').split(':').map(Number)
  const [eh, em] = (s.end_time || '18:00:00').split(':').map(Number)
  const start = new Date(today); start.setHours(sh, sm, 0, 0)
  const end   = new Date(today); end.setHours(eh, em, 0, 0)
  if (end <= start) end.setDate(end.getDate() + 1)
  const now = Date.now()
  if (now <= start.getTime()) return 0
  if (now >= end.getTime()) return 1
  return (now - start.getTime()) / (end.getTime() - start.getTime())
})

const nowHandAngle = computed(() => {
  const d = new Date()
  const hr = d.getHours() + d.getMinutes() / 60
  return (hr / 24) * 2 * Math.PI
})

const coreEyebrow = computed(() => {
  if (state.value === 'CLOCKED_IN') return 'Working time'
  if (state.value === 'ON_BREAK')   return 'On break'
  if (state.value === 'CLOCKED_OUT') return 'Total today'
  if (todayData.value?.requires_late_approval) return 'Approval queued'
  return 'Ready'
})
const coreSub = computed(() => {
  if (state.value === 'CLOCKED_IN') return 'live counter · ticks each second'
  if (state.value === 'ON_BREAK') return `break · ${formatDuration(breakElapsedSeconds.value)}`
  if (state.value === 'CLOCKED_OUT') return 'see you tomorrow'
  if (todayData.value?.requires_late_approval) return 'waiting on admin'
  return 'tap clock-in to begin your day'
})

// ─────── context pill ───────
const contextPill = computed(() => {
  if (todayData.value?.is_holiday) return { tone: 'warn', icon: Sparkles, label: 'Holiday', detail: todayData.value.holiday_name || 'Enjoy your day off' }
  if (todayData.value?.is_week_off) return { tone: 'neutral', icon: Coffee, label: 'Week-off', detail: 'No clock-in expected today' }
  if (todayData.value?.wfh_approved) return { tone: 'good', icon: Home, label: 'WFH approved', detail: 'Location check waived for today' }
  if (todayData.value?.requires_late_approval) return { tone: 'warn', icon: Siren, label: 'Late lock', detail: `${todayData.value.late_minutes_now}m past shift start · approval needed` }
  if (state.value === 'CLOCKED_IN') return { tone: 'good', icon: Activity, label: 'On the clock', detail: `since ${formatTime(todayData.value?.attendance?.check_in_time)}` }
  if (state.value === 'ON_BREAK') return { tone: 'warn', icon: Coffee, label: 'On break', detail: `running for ${formatDuration(breakElapsedSeconds.value)}` }
  if (state.value === 'CLOCKED_OUT') return { tone: 'good', icon: Check, label: 'Day complete', detail: `total ${formatDuration(elapsedSeconds.value)}` }
  if (todayData.value?.shift) return { tone: 'neutral', icon: Sunrise, label: 'Awaiting punch', detail: `Shift ${shortTime(todayData.value.shift.start_time)} → ${shortTime(todayData.value.shift.end_time)}` }
  return { tone: 'neutral', icon: Clock, label: 'Standby', detail: 'No shift assigned to you yet' }
})

// ─────── hero stats ───────
const heroStats = computed(() => {
  const s = todayData.value?.shift
  const a = todayData.value?.attendance
  const breakUsed = todayData.value?.break_used_minutes ?? 0
  const breakCap = s?.break_minutes ?? 0
  const breakRem = todayData.value?.break_remaining_minutes ?? 0
  return [
    {
      label: 'Today',
      value: formatDuration(elapsedSeconds.value),
      foot: a?.working_hours ? `+${(a.working_hours).toFixed(1)}h logged` : 'live counter',
      tone: 'teal',
      icon: Activity,
    },
    {
      label: 'Late by',
      value: todayData.value?.is_late ? `${todayData.value.late_minutes_now}m` : '—',
      foot: todayData.value?.is_late ? `past ${shortTime(s?.start_time)}` : `grace ${s?.grace_minutes ?? 0}m`,
      tone: todayData.value?.is_late ? 'warn' : 'neutral',
      icon: Timer,
    },
    {
      label: 'Break used',
      value: `${breakUsed}/${breakCap || '—'}m`,
      foot: breakCap ? `${breakRem}m remaining` : 'no cap',
      tone: 'orange',
      icon: Coffee,
    },
    {
      label: 'Geo',
      value: geo.value.verified ? 'OK' : (geo.value.loading ? '…' : 'OFF'),
      foot: geo.value.short,
      tone: geo.value.verified ? 'teal' : (geo.value.loading ? 'neutral' : 'warn'),
      icon: MapPin,
    },
  ]
})

// ─────── geo ───────
const { coords, error: geoError, resume } = useGeolocation({
  enableHighAccuracy: true,
  immediate: true,
})

// Admin-configured active geo-fences (work locations) — fetched once on mount.
const fences = ref([])
const fencesLoaded = ref(false)
const loadFences = async () => {
  try {
    const data = await fetchActiveGeoFences()
    fences.value = data.items || []
  } catch { fences.value = [] }
  finally { fencesLoaded.value = true }
}

// Government / company holidays for the current year — also keyed by ISO date
// for fast month-grid lookup.
const holidays = ref([])
const holidayMap = computed(() => {
  const m = new Map()
  for (const h of holidays.value) {
    const iso = h.date ? String(h.date).slice(0, 10) : null
    if (iso) m.set(iso, h)
  }
  return m
})
const loadHolidays = async () => {
  try {
    const data = await fetchMyHolidays()
    holidays.value = data.items || []
  } catch { holidays.value = [] }
}

// Submitted requests (correction + WFH + Half-Day) for the "My Requests" panel.
const myRequests = ref({ corrections: [], wfh: [], halfDay: [], loading: true })
// Declared here (not next to the OT modal handlers further down) because
// `allMergedRequests` references it, and Vue's `watch(myreqTotalPages, ...)`
// registration force-evaluates the computed chain during setup — accessing
// `myOtList` from a later declaration would hit a TDZ ReferenceError and
// blank the page. Keep this ref BEFORE loadMyRequests.
const myOtList = ref([])

const loadMyRequests = async () => {
  myRequests.value.loading = true
  try {
    const [c, w, h, o] = await Promise.all([
      fetchMyCorrections().catch(() => ({ items: [] })),
      fetchMyWfh().catch(() => ({ items: [] })),
      fetchMyHalfDay().catch(() => ({ items: [] })),
      fetchMyOvertime({ limit: 50 }).catch(() => ({ items: [] })),
    ])
    myRequests.value.corrections = c.items || []
    myRequests.value.wfh = w.items || []
    myRequests.value.halfDay = h.items || []
    myOtList.value = o.items || []
  } catch {
    myRequests.value.corrections = []
    myRequests.value.wfh = []
    myRequests.value.halfDay = []
    myOtList.value = []
  } finally { myRequests.value.loading = false }
}
const requestStatusTone = (s) => {
  const v = String(s || '').toUpperCase()
  if (['APPROVED', 'ACCEPTED'].includes(v)) return 'good'
  if (['REJECTED', 'DENIED', 'CANCELLED'].includes(v)) return 'bad'
  return 'pending'
}
const requestStatusLabel = (s) => String(s || 'PENDING').toUpperCase()
const myreqIcon = (r) => {
  if (r.type === 'WFH') return Home
  if (r.type === 'HALF_DAY') return SunMedium
  if (r.type === 'OT') return TimerReset
  return Pencil
}
const myreqTitle = (r) => {
  if (r.type === 'WFH') return r.request_type === 'REMOTE' ? 'Remote work' : 'Work from home'
  if (r.type === 'HALF_DAY') return 'Half-day request'
  if (r.type === 'OT') return `Overtime · ${(r.ot_hours || 0).toFixed(2)}h`
  return 'Time correction'
}
const fmtRequestDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

// Merge correction + WFH requests into a single chronological feed.
// Newest-first merged list of every kind of request the user has open. We
// paginate it on-screen so the panel never grows past 3 rows — keeps the
// page layout stable when a heavy user has 20+ pending items.
const allMergedRequests = computed(() => {
  const list = []
  for (const c of myRequests.value.corrections || []) {
    list.push({
      id: c.id,
      type: 'CORRECTION',
      status: c.status,
      reason: c.reason,
      rejection_reason: c.rejection_reason || c.admin_remarks || '',
      dateLabel: c.attendance_date || c.created_at,
      sortKey: c.created_at || c.attendance_date || '',
    })
  }
  for (const w of myRequests.value.wfh || []) {
    list.push({
      id: w.id,
      type: 'WFH',
      request_type: w.request_type,
      status: w.status,
      reason: w.reason,
      rejection_reason: w.rejection_reason || w.admin_remarks || '',
      dateLabel: w.wfh_date || w.created_at,
      sortKey: w.created_at || w.wfh_date || '',
    })
  }
  for (const h of myRequests.value.halfDay || []) {
    list.push({
      id: h.id,
      type: 'HALF_DAY',
      which_half: h.which_half,
      reason_type: h.reason_type,
      status: h.status,
      reason: h.reason,
      rejection_reason: h.decision_notes || '',
      dateLabel: h.half_day_date || h.created_at,
      sortKey: h.created_at || h.half_day_date || '',
      is_admin_override: h.is_admin_override,
    })
  }
  for (const o of myOtList.value || []) {
    list.push({
      id: o.id,
      type: 'OT',
      status: o.status,
      ot_hours: Number(o.ot_hours || 0),
      ot_type: o.ot_type,
      reason: o.reason,
      rejection_reason: o.decision_notes || '',
      dateLabel: o.date || o.created_at,
      sortKey: o.created_at || o.date || '',
    })
  }
  return list.sort((a, b) => String(b.sortKey).localeCompare(String(a.sortKey)))
})

const MYREQ_PAGE_SIZE = 3
const myreqPage = ref(1)
const myreqTotalPages = computed(() => Math.max(1, Math.ceil(allMergedRequests.value.length / MYREQ_PAGE_SIZE)))
// Clamp the page if the underlying list shrinks (e.g. after a request is
// approved/rejected and removed from the working list).
watch(myreqTotalPages, (tp) => { if (myreqPage.value > tp) myreqPage.value = tp })

const mergedRequests = computed(() => {
  const start = (myreqPage.value - 1) * MYREQ_PAGE_SIZE
  return allMergedRequests.value.slice(start, start + MYREQ_PAGE_SIZE)
})
const totalRequests = computed(() => allMergedRequests.value.length)
const myreqPageStart = computed(() => totalRequests.value === 0 ? 0 : (myreqPage.value - 1) * MYREQ_PAGE_SIZE + 1)
const myreqPageEnd = computed(() => Math.min(myreqPage.value * MYREQ_PAGE_SIZE, totalRequests.value))

// Reverse-geocoded address for the current GPS coords.
const addr = ref(null)
let _addrTimer = null
const updateAddr = (lat, lng) => {
  clearTimeout(_addrTimer)
  _addrTimer = setTimeout(async () => {
    addr.value = await reverseGeocode(lat, lng)
  }, 600)
}
// `useGeolocation` initialises coords with { latitude: Infinity, longitude: Infinity }
// before the browser fixes the user's position. Treat non-finite values as "not
// yet acquired" so we don't show "Infinity, Infinity" in the UI.
const hasRealCoords = (c) => !!c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)
watch(coords, (c) => {
  if (hasRealCoords(c)) updateAddr(c.latitude, c.longitude)
}, { deep: true, immediate: true })

// Compute whether the current GPS coords lie inside any active fence.
const fenceCheck = computed(() => {
  const lat = coords.value?.latitude
  const lng = coords.value?.longitude
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ready: false, inside: false, closest: null, distance: Infinity }
  }
  if (!fencesLoaded.value) return { ready: false, inside: false, closest: null, distance: Infinity }
  if (!fences.value.length) {
    // No fences configured by admin → don't block.
    return { ready: true, inside: true, closest: null, distance: 0, noFences: true }
  }
  let closest = null
  let best = Infinity
  let inside = false
  for (const f of fences.value) {
    const d = haversineMeters(lat, lng, Number(f.center_lat), Number(f.center_lng))
    if (d < best) { best = d; closest = f }
    if (d <= Number(f.radius_meters || 0)) inside = true
  }
  return { ready: true, inside, closest, distance: best, noFences: false }
})

const geo = computed(() => {
  if (geoError.value) {
    return { verified: false, loading: false, blocked: true,
      label: 'Location permission denied',
      detail: 'Enable GPS and reload — punches require live coordinates.',
      short: 'denied', tone: 'warn' }
  }
  if (!hasRealCoords(coords.value)) {
    return { verified: false, loading: true, blocked: false,
      label: 'Acquiring GPS…',
      detail: 'Hold steady while we lock on to satellites.',
      short: '...', tone: 'neutral' }
  }
  const fc = fenceCheck.value
  const accuracy = Math.round(coords.value.accuracy || 0)
  const placeName = addr.value?.name || addr.value?.city || `${coords.value.latitude.toFixed(4)}, ${coords.value.longitude.toFixed(4)}`
  const fullAddress = addr.value?.full || `Lat ${coords.value.latitude.toFixed(4)} · Lng ${coords.value.longitude.toFixed(4)}`

  if (!fc.ready) {
    return { verified: false, loading: true, blocked: false,
      label: placeName, detail: fullAddress, short: `${accuracy}m`,
      tone: 'neutral', fence: null }
  }
  if (fc.noFences) {
    return { verified: true, loading: false, blocked: false,
      label: placeName, detail: fullAddress, short: `${accuracy}m`,
      tone: 'good', fence: null, hint: 'No geo-fence policy — open punching.' }
  }
  if (fc.inside) {
    return { verified: true, loading: false, blocked: false,
      label: placeName, detail: fullAddress, short: `${accuracy}m`,
      tone: 'good', fence: fc.closest,
      hint: `Inside «${fc.closest?.name}» · ${Math.round(fc.distance)}m from centre` }
  }
  // Outside all fences — block punching.
  return { verified: false, loading: false, blocked: true,
    label: placeName, detail: fullAddress, short: `${accuracy}m`,
    tone: 'warn', fence: fc.closest,
    hint: `Outside authorised zone · nearest «${fc.closest?.name}» is ${Math.round(fc.distance)}m away` }
})
const forceGeoRefresh = () => { try { resume?.() } catch {}; if (coords.value?.latitude) updateAddr(coords.value.latitude, coords.value.longitude) }

// ─────── break hints ───────
const canStartBreakUI = computed(() => !!todayData.value?.can_break_start)
const breakHint = computed(() => {
  const cur = todayData.value?.current_break_window
  const next = todayData.value?.next_break_window
  if (cur) return `${cur.label} window open · ${cur.minutes_until_end ?? '?'}m left`
  if (next) return `next: ${next.label} at ${next.start_time}`
  return 'no fixed window · within daily cap'
})
const breakWindowHint = computed(() => {
  const cur = todayData.value?.current_break_window
  if (cur) return `${cur.label} · ends ${cur.end_time} (max ${cur.max_minutes}m)`
  return 'rejoin work and your hours keep ticking'
})
const clockOutLocked = computed(() => {
  const t = todayData.value
  if (!t) return false
  return !!t.requires_early_exit_approval && !t.has_approved_early_exit
})
const clockOutButtonLabel = computed(() => {
  const t = todayData.value
  if (!t) return 'Clock out'
  if (clockOutLocked.value) {
    if (t.pending_early_exit_request_id && t.pending_early_exit_request_status === 'PENDING') {
      return 'Early-exit pending'
    }
    return 'Request early exit'
  }
  return 'Clock out'
})
const clockOutHint = computed(() => {
  const t = todayData.value
  if (clockOutLocked.value) {
    if (t?.pending_early_exit_request_id && t.pending_early_exit_request_status === 'PENDING') {
      return 'Admin notified · waiting on approval'
    }
    const mins = t?.minutes_until_shift_end ?? 0
    return `${mins} min until shift ends — clock-out needs admin approval`
  }
  const a = t?.attendance
  if (a?.check_in_time) return `started ${formatTime(a.check_in_time)}`
  return 'wrap up the day'
})
// Format minutes as "Hh MMm" or "MMm" — used by the early-clock-in countdown.
const formatCountdown = (mins) => {
  const m = Math.max(0, Number(mins || 0))
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}
const breakPill = computed(() => {
  const cur = todayData.value?.current_break_window
  const next = todayData.value?.next_break_window
  const used = todayData.value?.break_used_minutes ?? 0
  const cap = todayData.value?.shift?.break_minutes ?? 0
  if (cap && used >= cap) return { tone: 'warn', label: 'cap reached' }
  if (cur) return { tone: 'good', label: cur.label }
  if (next) return { tone: 'neutral', label: 'upcoming' }
  return { tone: 'neutral', label: 'open' }
})
const breakUsedPct = computed(() => {
  const cap = todayData.value?.shift?.break_minutes ?? 0
  const used = todayData.value?.break_used_minutes ?? 0
  if (!cap) return 0
  return Math.min(100, (used / cap) * 100)
})

// ─────── pulse panel ───────
// Quick at-a-glance stats derived from the 14-day history. Computed so the
// values stay in sync as `history` lands from the API.
const pulseData = computed(() => {
  const items = history.value || []
  // Day streak = consecutive recent days where the user was present
  // (treat WEEK_OFF / HOLIDAY as transparent — they preserve streak).
  let streak = 0
  for (const d of items) {
    if (['PRESENT', 'LATE', 'WFH', 'REMOTE', 'HALF_DAY', 'ON_DUTY'].includes(d.status)) streak++
    else if (['WEEK_OFF', 'HOLIDAY'].includes(d.status)) continue
    else break
  }
  // Working-day metrics — strip today from history (the backend often returns
  // today as PRESENT with late_minutes=0 because the LATE flag flips only at
  // admin lock), then ALWAYS re-inject today using the live todayData fields.
  // This guarantees `is_late === true` on the dashboard immediately becomes a
  // less-than-100% on-time pulse instead of waiting on next-day rollup.
  const todayStr = new Date().toISOString().slice(0, 10)
  const histWork = items
    .filter(d => !['WEEK_OFF', 'HOLIDAY'].includes(d.status))
    .filter(d => String(d.date).slice(0, 10) !== todayStr)

  const todayLateNow = Number(
    todayData.value?.late_minutes_now ??
    todayData.value?.late_minutes ??
    todayData.value?.attendance?.late_minutes ?? 0
  )
  const todayIsLate = !!todayData.value?.is_late || todayLateNow > 0
  const todayHasPunch = !!todayData.value?.attendance?.check_in_time
  const todayIsWorkDay = !todayData.value?.is_holiday && !todayData.value?.is_week_off

  const work = [...histWork]
  if (todayIsWorkDay && (todayHasPunch || todayIsLate)) {
    work.push({
      date: todayStr,
      status: todayIsLate ? 'LATE' : 'PRESENT',
      late_minutes: todayLateNow,
      working_hours: Number(todayData.value?.attendance?.working_hours || (elapsedSeconds.value / 3600) || 0),
    })
  }

  const hours = work.map(d => Number(d.working_hours || 0))
  const totalH = hours.reduce((a, b) => a + b, 0)
  const avgHours = hours.length ? (totalH / hours.length).toFixed(1) : '0.0'
  const isLate = (d) => d.status === 'LATE' || Number(d.late_minutes || 0) > 0
  const lateCount = work.filter(isLate).length
  const onTimePct = work.length ? Math.round(((work.length - lateCount) / work.length) * 100) : 100
  const lateBy = lateCount ? Math.round(work.filter(isLate).reduce((a, b) => a + Number(b.late_minutes || 0), 0) / lateCount) : 0
  const targetHours = todayData.value?.shift
    ? Math.round(((parseTimeToMin(todayData.value.shift.end_time) - parseTimeToMin(todayData.value.shift.start_time) - (todayData.value.shift.break_minutes || 0)) / 60) * 10) / 10
    : 8
  // Best day
  let best = null
  for (const d of work) {
    if (!best || Number(d.working_hours || 0) > Number(best.working_hours || 0)) best = d
  }
  return {
    streak,
    avgHours,
    targetHours,
    onTimePct,
    lateBy,
    bestDay: best ? Number(best.working_hours || 0).toFixed(1) : '0.0',
    bestDate: best ? new Date(best.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—',
  }
})
const parseTimeToMin = (t) => {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

// ─────── insights v2 derivatives ───────
const insightChips = computed(() => {
  const total = Math.max(1, summary.value.presentDays + summary.value.absentDays)
  return [
    { key: 'present', label: 'Present', value: summary.value.presentDays, pct: (summary.value.presentDays / total) * 100, tone: 'teal', icon: CheckCircle2 },
    { key: 'late',    label: 'Late',    value: summary.value.lateDays,    pct: (summary.value.lateDays / total) * 100,    tone: 'amber', icon: Timer },
    { key: 'absent',  label: 'Absent',  value: summary.value.absentDays,  pct: (summary.value.absentDays / total) * 100,  tone: 'rose',  icon: X },
    { key: 'wfh',     label: 'WFH',     value: summary.value.wfhDays,     pct: (summary.value.wfhDays / total) * 100,     tone: 'sky',   icon: Home },
  ]
})

// Sparkline path — last N days of working hours.
// `history` arrives newest-first; we reverse so the line reads left→right by date.
const sparkPoints = computed(() => {
  const items = [...(history.value || [])].reverse()
  if (!items.length) return []
  const w = Math.max(80, items.length * 14)
  const h = 60
  const maxH = Math.max(8, ...items.map(d => Number(d.working_hours || 0)), 8)
  return items.map((d, i) => ({
    x: items.length === 1 ? w / 2 : (i / (items.length - 1)) * w,
    y: h - 6 - (Math.min(Number(d.working_hours || 0), maxH) / maxH) * (h - 12),
    hours: Number(d.working_hours || 0),
    date: d.date,
    status: d.status,
  }))
})
const sparkPath = computed(() => {
  const pts = sparkPoints.value
  if (!pts.length) return ''
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
})
const sparkArea = computed(() => {
  const pts = sparkPoints.value
  if (!pts.length) return ''
  const w = Math.max(80, pts.length * 14)
  const h = 60
  return `M 0 ${h} L ${pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} L ${w} ${h} Z`
})
const formatHistoryDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

// ─────── summary ───────
const summary = computed(() => {
  if (!history.value.length) return { attendancePct: 0, presentDays: 0, lateDays: 0, absentDays: 0, wfhDays: 0 }
  let present = 0, late = 0, absent = 0, wfh = 0, workdays = 0
  for (const d of history.value) {
    if (['WEEK_OFF', 'HOLIDAY'].includes(d.status)) continue
    workdays++
    if (d.status === 'PRESENT' || d.status === 'HALF_DAY' || d.status === 'ON_DUTY') present++
    if (d.status === 'LATE') { late++; present++ }
    if (d.status === 'ABSENT') absent++
    if (d.status === 'WFH' || d.status === 'REMOTE') { wfh++; present++ }
  }
  const pct = workdays ? Math.round((present / workdays) * 100) : 0
  return { attendancePct: pct, presentDays: present, lateDays: late, absentDays: absent, wfhDays: wfh }
})

// ─────── timeline ───────
const timelineEvents = computed(() => {
  const events = []
  const s = todayData.value?.shift
  const a = todayData.value?.attendance
  if (s) events.push({ key: 'plan-start', time: shortTime(s.start_time), label: 'Shift start (planned)', icon: Sunrise, tone: 'plan', statusLabel: 'PLANNED' })
  if (a?.check_in_time) {
    const isLate = !!todayData.value?.is_late
    events.push({ key: 'check-in', time: formatTime(a.check_in_time), label: 'Clocked in', icon: Fingerprint,
      tone: isLate ? 'late' : 'done',
      statusLabel: isLate ? 'LATE' : 'ON TIME',
      detail: isLate ? `Past start by ${todayData.value.late_minutes_now}m · still recorded` : 'Within grace window — clean punch' })
  }
  if (state.value === 'ON_BREAK') {
    events.push({ key: 'break-now', time: 'now', label: 'On break', icon: Coffee, tone: 'active', now: true,
      statusLabel: 'LIVE',
      detail: todayData.value?.current_break_window ? `${todayData.value.current_break_window.label} window · ${breakTimer.value.usedMin}m used` : `${breakTimer.value.usedMin}m used · ${breakTimer.value.capMin}m daily cap` })
  }
  if (a?.check_out_time) {
    events.push({ key: 'check-out', time: formatTime(a.check_out_time), label: 'Clocked out', icon: LogOut, tone: 'done',
      statusLabel: overtimeMinutes.value > 0 ? `+${overtimeMinutes.value}m OT` : 'COMPLETE',
      detail: a?.working_hours ? `${(a.working_hours).toFixed(1)}h logged${overtimeMinutes.value > 0 ? ` (incl. overtime)` : ''}` : '' })
  } else if (state.value === 'CLOCKED_IN' || state.value === 'ON_BREAK') {
    // Active live row when day is in progress
    events.push({ key: 'now', time: liveTime.value.slice(0, 5), label: state.value === 'ON_BREAK' ? 'Break ongoing' : 'On the clock', icon: Activity, tone: 'active', now: true,
      statusLabel: 'NOW',
      detail: overtimeMinutes.value > 0 ? `Working past shift end · +${overtimeMinutes.value}m overtime` : `${formatDuration(elapsedSeconds.value)} elapsed` })
  }
  if (s) events.push({ key: 'plan-end', time: shortTime(s.end_time), label: 'Shift end (planned)', icon: Moon, tone: 'plan', statusLabel: 'PLANNED' })
  return events
})
const timelineProgress = computed(() => {
  if (state.value === 'CLOCKED_OUT') return 1
  if (state.value === 'CLOCKED_IN' || state.value === 'ON_BREAK') return Math.max(0.3, shiftProgress.value)
  return 0.05
})

// ─────── orbiters ───────
const seeds = Array.from({ length: 8 }, () => Math.random())
const orbStyle = (i) => {
  const s = seeds[i - 1]
  const angle = (i / 8) * 360 + s * 20
  const radius = 165 + s * 20
  return {
    transform: `rotate(${angle}deg) translateX(${radius}px) rotate(-${angle}deg)`,
    animationDelay: `${(s * 3).toFixed(2)}s`,
    animationDuration: `${(6 + (s * 6)).toFixed(2)}s`,
  }
}

// ─────── month ───────
const showMonth = ref(false)
const monthBlanks = ref(0)
const monthLabel = ref('')
const loadMonth = async () => {
  const now = new Date()
  monthLabel.value = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  try {
    const data = await fetchMyMonth(now.getFullYear(), now.getMonth() + 1)
    const map = new Map((data.cells || []).map(c => [c.date, c]))
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const dayCount = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    monthBlanks.value = start.getDay()
    const todayStr = new Date().toISOString().slice(0, 10)
    monthDots.value = []
    for (let d = 1; d <= dayCount; d++) {
      const iso = new Date(now.getFullYear(), now.getMonth(), d).toISOString().slice(0, 10)
      const c = map.get(iso) || {}
      const future = iso > todayStr
      // Merge admin-configured holiday calendar so even months the backend
      // didn't populate still show ★ markers on official days.
      const hol = holidayMap.value.get(iso) || null
      const isHol = !!c.is_holiday || !!hol
      const rawStatus = future ? 'FUTURE' : (c.status || (isHol ? 'HOLIDAY' : 'WEEK_OFF'))
      monthDots.value.push({
        date: iso,
        status: rawStatus,
        working_hours: c.working_hours || 0,
        late_minutes: c.late_minutes || 0,
        is_holiday: isHol,
        holiday_name: c.holiday_name || hol?.name || '',
        holiday_type: hol?.holiday_type || '',
        is_week_off: !!c.is_week_off,
        today: iso === todayStr,
        future,
      })
    }
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not load month')
  }
}

// ─────── month tooltip ───────
const tip = reactive({
  show: false, x: 0, y: 0,
  date: '', status: '', workingHours: 0, lateMinutes: 0,
  isHoliday: false, holidayName: '', isWeekOff: false,
})
const showCellTip = (e, c) => {
  const r = (e.currentTarget || e.target).getBoundingClientRect()
  tip.show = true
  // Place above the cell, centred.
  tip.x = r.left + r.width / 2
  tip.y = r.top - 8
  tip.date = new Date(c.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
  tip.status = c.status
  tip.workingHours = c.working_hours || 0
  tip.lateMinutes = c.late_minutes || 0
  tip.isHoliday = !!c.is_holiday
  tip.holidayName = c.holiday_name || ''
  tip.isWeekOff = !!c.is_week_off
}
const hideCellTip = () => { tip.show = false }

// ─────── modals ───────
const showCorrection = ref(false)
const correctionForm = reactive({
  attendance_date: new Date().toISOString().slice(0, 10),
  in_time: '', out_time: '', reason: '',
})
const correctionValid = computed(() => !!(correctionForm.attendance_date && correctionForm.reason.trim().length >= 4))

const showWfh = ref(false)
const wfhForm = reactive({
  request_type: 'WFH',
  wfh_date: new Date().toISOString().slice(0, 10),
  wfh_date_until: '', reason: '',
})
const wfhTypeOptions = [
  { label: 'Work from home', value: 'WFH' },
  { label: 'Remote / on-site', value: 'REMOTE' },
]
const wfhValid = computed(() => !!(wfhForm.wfh_date && wfhForm.reason.trim().length >= 4))

// Pre-select the request type when opening from a dedicated quick-action
// (WFH vs REMOTE) so the user lands on the right context without having to
// flip the Type dropdown manually.
const openWfhRequest = (type = 'WFH') => {
  wfhForm.request_type = type
  wfhForm.wfh_date = new Date().toISOString().slice(0, 10)
  wfhForm.wfh_date_until = ''
  wfhForm.reason = ''
  showWfh.value = true
}

// ─────── half-day request ───────
const showHalfDay = ref(false)
const hdForm = reactive({
  half_day_date: new Date().toISOString().slice(0, 10),
  which_half: 'SECOND',
  reason_type: 'PERSONAL',
  reason: '',
})
// Block weekly off + holiday selections client-side so users see the
// conflict before submitting (backend still enforces; this is UX polish).
//
// Sources:
//   * holidayMap   — already loaded for the month calendar
//   * monthDots    — has the resolved status per day, including WEEK_OFF
//     for shift-driven weekly offs
//
// Returns: { type: 'holiday' | 'week_off' | null, label: '<friendly text>' }
const hdDateConflict = computed(() => {
  const iso = hdForm.half_day_date
  if (!iso) return { type: null, label: '' }

  const h = holidayMap.value.get(iso)
  if (h) {
    return { type: 'holiday', label: `${h.name || 'Company holiday'} — no half-day needed.` }
  }
  // Match against monthDots only when the selected date is in the loaded
  // month window (otherwise we can't be authoritative — let the backend
  // enforce). monthDots entries store ISO yyyy-mm-dd in `.date`.
  const dot = (monthDots.value || []).find(d => d.date === iso)
  if (dot && dot.status === 'WEEK_OFF') {
    try {
      const w = new Date(iso).toLocaleDateString('en-IN', { weekday: 'long' })
      return { type: 'week_off', label: `${w} is your weekly off — no half-day needed.` }
    } catch {
      return { type: 'week_off', label: 'This date is your weekly off — no half-day needed.' }
    }
  }
  return { type: null, label: '' }
})

const hdValid = computed(() =>
  !!(hdForm.half_day_date
     && hdForm.reason.trim().length >= 4
     && !hdDateConflict.value.type)
)
const HD_HALVES = [
  { value: 'FIRST',  label: '1st half off', desc: 'Join after lunch.' },
  { value: 'SECOND', label: '2nd half off', desc: 'Leave at lunch.' },
]
const HD_REASON_TYPES = [
  { value: 'PERSONAL', label: 'Personal', icon: Heart,      tone: 'rose' },
  { value: 'MEDICAL',  label: 'Medical',  icon: HeartPulse, tone: 'red' },
  { value: 'FAMILY',   label: 'Family',   icon: Users,      tone: 'amber' },
  { value: 'OFFICIAL', label: 'Official', icon: Briefcase,  tone: 'teal' },
  { value: 'OTHER',    label: 'Other',    icon: Sparkles,   tone: 'gray' },
]
const openHalfDayRequest = () => {
  hdForm.half_day_date = new Date().toISOString().slice(0, 10)
  hdForm.which_half = 'SECOND'
  hdForm.reason_type = 'PERSONAL'
  hdForm.reason = ''
  showHalfDay.value = true
}
const submitHalfDay = async () => {
  if (!hdValid.value || submitting.value) return
  submitting.value = true
  try {
    await createMyHalfDay({
      half_day_date: hdForm.half_day_date,
      which_half: hdForm.which_half,
      reason_type: hdForm.reason_type,
      reason: hdForm.reason.trim(),
    })
    toast.success('Half-day request submitted — awaiting approval')
    showHalfDay.value = false
    hdForm.reason = ''
    loadMyRequests()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not submit half-day request')
  } finally { submitting.value = false }
}

// ── Overtime request (self-service) ────────────────────────────────────
const showOt = ref(false)
const otForm = reactive({
  date: '',
  ot_hours: 1,
  ot_type: 'WEEKDAY',
  reason: '',
})
const otTypeOptions = [
  { value: 'WEEKDAY',   label: 'Weekday' },
  { value: 'WEEKEND',   label: 'Weekend' },
  { value: 'HOLIDAY',   label: 'Holiday' },
  { value: 'EMERGENCY', label: 'Emergency' },
]
const otValid = computed(() =>
  !!otForm.date &&
  Number(otForm.ot_hours) > 0 && Number(otForm.ot_hours) <= 12 &&
  otForm.reason.trim().length >= 4
)
const openOtRequest = () => {
  // Default to today, mid-shift planning typical
  otForm.date = new Date().toISOString().slice(0, 10)
  otForm.ot_hours = 1
  otForm.ot_type = 'WEEKDAY'
  otForm.reason = ''
  showOt.value = true
}
const submitOt = async () => {
  if (!otValid.value || submitting.value) return
  submitting.value = true
  try {
    await createMyOvertime({
      date: otForm.date,
      ot_hours: Number(otForm.ot_hours),
      ot_type: otForm.ot_type,
      reason: otForm.reason.trim(),
    })
    toast.success('OT request submitted — awaiting manager approval')
    showOt.value = false
    otForm.reason = ''
    loadMyOt()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not submit OT request')
  } finally { submitting.value = false }
}

// `myOtList` is declared earlier (above loadMyRequests) so the merged-requests
// computed can read it without TDZ. This loader just refreshes it.
const loadMyOt = async () => {
  try {
    const data = await fetchMyOvertime({ limit: 50 })
    myOtList.value = data.items || []
  } catch (e) {
    myOtList.value = []
  }
}
const cancelOt = async (id) => {
  try {
    await cancelMyOvertime(id)
    toast.success('OT request cancelled')
    loadMyOt()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not cancel OT request')
  }
}

const showLateRequest = ref(false)
const lateReason = ref('')
const lateReasonValid = computed(() => lateReason.value.trim().length >= 4)

const showEarlyExitRequest = ref(false)
const earlyExitReason = ref('')
const earlyExitReasonValid = computed(() => earlyExitReason.value.trim().length >= 4)

const submitCorrection = async () => {
  if (!correctionValid.value) return
  submitting.value = true
  try {
    const base = correctionForm.attendance_date
    await createMyCorrection({
      attendance_date: base,
      requested_check_in: correctionForm.in_time ? `${base}T${correctionForm.in_time}:00` : null,
      requested_check_out: correctionForm.out_time ? `${base}T${correctionForm.out_time}:00` : null,
      reason: correctionForm.reason.trim(),
    })
    toast.success('Correction submitted — admin notified')
    showCorrection.value = false
    correctionForm.reason = ''; correctionForm.in_time = ''; correctionForm.out_time = ''
    loadMyRequests()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not submit correction')
  } finally { submitting.value = false }
}

const submitWfh = async () => {
  if (!wfhValid.value) return
  submitting.value = true
  try {
    await createMyWfh({
      request_type: wfhForm.request_type,
      wfh_date: wfhForm.wfh_date,
      wfh_date_until: wfhForm.wfh_date_until || null,
      reason: wfhForm.reason.trim(),
    })
    toast.success('WFH request submitted — awaiting approval')
    showWfh.value = false; wfhForm.reason = ''
    loadMyRequests()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not submit WFH request')
  } finally { submitting.value = false }
}

const submitLateRequest = async () => {
  if (!lateReasonValid.value) return
  submitting.value = true
  try {
    await requestLatePunch({ reason: lateReason.value.trim() })
    toast.success('Late-punch request submitted — admin will approve shortly')
    showLateRequest.value = false; lateReason.value = ''
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not submit late-punch request')
  } finally { submitting.value = false }
}

const submitEarlyExitRequest = async () => {
  if (!earlyExitReasonValid.value) return
  submitting.value = true
  try {
    await requestEarlyExit({ reason: earlyExitReason.value.trim() })
    toast.success('Early-exit request submitted — admin must approve before you can clock out')
    showEarlyExitRequest.value = false; earlyExitReason.value = ''
    await reload()
    loadMyRequests()
  } catch (e) {
    const detail = e?.response?.data?.detail
    toast.error(typeof detail === 'string' ? detail : (detail?.message || 'Could not submit early-exit request'))
  } finally { submitting.value = false }
}

// ─────── attendance report (per-day drill-in) ───────
// Opens a drawer that shows the full punch tape, break segments, late minutes
// and overtime for any of the last 14 working days. Powered by the
// /me/day-detail endpoint — every value is server-authoritative so the
// numbers always match the rolled-up rows the admin sees.
const showReport = ref(false)
const reportSelectedDate = ref('')
const reportDay = ref(null)
const reportLoading = ref(false)
const reportStripRef = ref(null)

// Always format dates using the LOCAL (IST) calendar — `toISOString()` would
// convert to UTC and silently shift the day by one for any time window where
// UTC and IST disagree (00:00–05:30 IST). That bug made the report default to
// yesterday's date when opened just after midnight IST.
const toLocalISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Strip = last 14 days, newest on the right. Cross-references `history` so
// each chip can be coloured by its computed status (PRESENT / LATE / etc)
// AND show a tiny hours-worked mini bar.
const reportStripDays = computed(() => {
  const out = []
  const today = new Date()
  const todayIso = toLocalISO(today)
  const histMap = new Map((history.value || []).map(d => [String(d.date).slice(0, 10), d]))
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    const iso = toLocalISO(d)
    const histRow = histMap.get(iso)
    const hours = Number(histRow?.working_hours || 0)
    let status = histRow?.status
    if (!status) status = (iso === todayIso) ? 'TODAY' : 'ABSENT'
    // If it's today and we have live data, override the absent fallback so
    // the chip reflects the in-progress shift instead of "ABSENT".
    if (iso === todayIso && todayData.value) {
      if (todayData.value.is_holiday) status = 'HOLIDAY'
      else if (todayData.value.is_week_off) status = 'WEEK_OFF'
      else if (todayData.value.attendance?.status) status = todayData.value.attendance.status
      else if (state.value === 'CLOCKED_IN' || state.value === 'ON_BREAK') status = 'PRESENT'
    }
    out.push({
      iso,
      dow: d.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase(),
      day: String(d.getDate()).padStart(2, '0'),
      mon: d.toLocaleDateString('en-IN', { month: 'short' }),
      today: iso === todayIso,
      future: false,
      status,
      hours,
      barPct: Math.min(100, (hours / 10) * 100),
    })
  }
  return out
})

const selectReportDay = async (iso) => {
  reportSelectedDate.value = iso
  reportLoading.value = true
  try {
    reportDay.value = await fetchMyDayDetail(iso)
  } catch (e) {
    if (e?.response?.status === 404) {
      reportDay.value = null
    } else {
      toast.error(e?.response?.data?.detail || 'Could not load day detail')
    }
  } finally {
    reportLoading.value = false
  }
}
const openReport = async () => {
  showReport.value = true
  // Default landing day — prefer the most recent day with a check-in. Looks
  // at history (already covers the past 14 days) and falls back to today if
  // nothing matches. This means at 00:35 IST May 29, the user lands on
  // May 28 (the day they actually worked) instead of an empty May 29.
  const todayIso = toLocalISO(new Date())
  const todayHasPunch = !!todayData.value?.attendance?.check_in_time
  let target = todayIso
  if (!todayHasPunch) {
    const lastWorked = (history.value || []).find(d => d.check_in_time)
    if (lastWorked) target = String(lastWorked.date).slice(0, 10)
    else {
      const y = new Date(); y.setDate(y.getDate() - 1)
      target = toLocalISO(y)
    }
  }
  await selectReportDay(target)
}

const punchLabel = (t) => {
  if (t === 'IN') return 'Clock-in'
  if (t === 'OUT') return 'Clock-out'
  if (t === 'BREAK_START') return 'Break start'
  if (t === 'BREAK_END') return 'Break end'
  return String(t || '')
}
const formatReportDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}
const prefillCorrectionFromReport = () => {
  if (!reportDay.value) return
  correctionForm.attendance_date = String(reportDay.value.date).slice(0, 10)
  // Pre-fill the user's likely intent: a missing clock-out.
  if (reportDay.value.check_in_time && reportDay.value.is_auto_closed) {
    const inDt = new Date(reportDay.value.check_in_time)
    correctionForm.in_time = `${String(inDt.getHours()).padStart(2,'0')}:${String(inDt.getMinutes()).padStart(2,'0')}`
    correctionForm.out_time = ''
    correctionForm.reason = 'Forgot to clock out — please update the OUT time to my actual end-of-day.'
  }
  showReport.value = false
  showCorrection.value = true
}

// ─────── punch actions ───────
const punchPayload = () => ({
  source: 'WEB',
  geo_lat: coords.value?.latitude ?? null,
  geo_lng: coords.value?.longitude ?? null,
  device_info: navigator.userAgent.slice(0, 100),
})

const handlePolicyError = (e) => {
  const detail = e?.response?.data?.detail
  if (detail && typeof detail === 'object') {
    if (detail.code === 'LATE_PUNCH_REQUIRES_APPROVAL') {
      toast.warning(detail.message)
      showLateRequest.value = true
      return true
    }
    if (detail.code === 'EARLY_PUNCH_NOT_ALLOWED') {
      // Frontend should already prevent the click — surface a clear toast
      // in case the user got through (e.g. clicked before /me/today refreshed).
      toast.warning(detail.message)
      return true
    }
    if (detail.code === 'EARLY_EXIT_REQUIRES_APPROVAL') {
      toast.warning(detail.message)
      showEarlyExitRequest.value = true
      return true
    }
    if (detail.code === 'OUTSIDE_BREAK_WINDOW' || detail.code === 'BREAK_LIMIT_REACHED') {
      toast.warning(detail.message)
      return true
    }
  }
  return false
}

const doClockIn = async () => {
  // Frontend-guard the early-clock-in case so users get an immediate response
  // instead of a 423 round-trip. Backend still enforces the same rule.
  if (todayData.value?.is_too_early_to_punch) {
    const at = todayData.value?.clock_in_opens_at
    toast.warning(`Shift hasn't started — clock-in opens at ${at || 'shift start'}.`)
    return
  }
  loading.value = true
  try {
    await clockIn(punchPayload())
    toast.success('Clocked in — have a great day!')
    await reload()
  } catch (e) {
    if (!handlePolicyError(e)) toast.error(e?.response?.data?.detail || 'Could not clock in')
    await reload()
  } finally { loading.value = false }
}
const doClockOut = async () => {
  // If clock-out is policy-locked (shift not over yet) re-route to the
  // early-exit request flow rather than ping the API and get rejected.
  if (todayData.value?.requires_early_exit_approval && !todayData.value?.has_approved_early_exit) {
    if (todayData.value?.pending_early_exit_request_id && todayData.value?.pending_early_exit_request_status === 'PENDING') {
      toast.info('Your early-exit request is still pending admin approval.')
      return
    }
    showEarlyExitRequest.value = true
    return
  }
  loading.value = true
  try {
    await clockOut(punchPayload())
    toast.success('Clocked out — see you tomorrow')
    await reload()
  } catch (e) {
    if (!handlePolicyError(e)) toast.error(e?.response?.data?.detail || 'Could not clock out')
  } finally { loading.value = false }
}
const doStartBreak = async () => {
  loading.value = true
  try { await startBreak(punchPayload()); toast.success('Break started'); await reload() }
  catch (e) { if (!handlePolicyError(e)) toast.error(e?.response?.data?.detail || 'Could not start break') }
  finally { loading.value = false }
}
const doEndBreak = async () => {
  loading.value = true
  try { await endBreak(punchPayload()); toast.success('Welcome back — break ended'); await reload() }
  catch (e) { if (!handlePolicyError(e)) toast.error(e?.response?.data?.detail || 'Could not end break') }
  finally { loading.value = false }
}

// ─────── reload ───────
const reload = async () => {
  try {
    const [t, h] = await Promise.all([fetchTodayMine(), fetchMyHistory(14)])
    todayData.value = t
    history.value = h.items || []
    elapsedSeconds.value = t.elapsed_seconds || 0
  } catch (e) {
    if (e?.response?.status !== 404) {
      toast.error(e?.response?.data?.detail || 'Could not load today')
    }
  }
}

watch(
  () => todayData.value?.break_used_minutes,
  (used) => { breakElapsedSeconds.value = (used || 0) * 60 },
  { immediate: true }
)

// Browser-level horizontal scroll lock — `overflow-x: clip` on `.ssa-page`
// alone isn't enough on every browser when a fixed/absolute child paints past
// the viewport edge. We force the rule on documentElement + body while this
// page is mounted, and put them back when we leave.
let _prevHtmlOverflowX = ''
let _prevBodyOverflowX = ''

onMounted(async () => {
  _prevHtmlOverflowX = document.documentElement.style.overflowX
  _prevBodyOverflowX = document.body.style.overflowX
  document.documentElement.style.overflowX = 'hidden'
  document.body.style.overflowX = 'hidden'

  tick(); tickId = setInterval(tick, 1000)
  loadFences()      // fire-and-forget; doesn't gate the rest of the render
  loadHolidays()    // holiday calendar for the month grid + journey
  loadMyRequests()  // correction + WFH status for the "My Requests" panel
  await reload()
  elapsedTimer = setInterval(() => {
    if (state.value === 'CLOCKED_IN') elapsedSeconds.value += 1
    if (state.value === 'ON_BREAK') breakElapsedSeconds.value += 1
  }, 1000)
})
onBeforeUnmount(() => {
  if (tickId) clearInterval(tickId)
  if (elapsedTimer) clearInterval(elapsedTimer)
  document.documentElement.style.overflowX = _prevHtmlOverflowX
  document.body.style.overflowX = _prevBodyOverflowX
})

// ─────── helpers ───────
const shortTime = (t) => (t || '').slice(0, 5)
const formatTime = (iso) => {
  if (!iso) return '—:—'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
const formatDuration = (s) => {
  const sec = Math.max(0, Math.floor(s || 0))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m`
}
const weekday = (iso) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short' })
const dayNum = (iso) => String(new Date(iso).getDate()).padStart(2, '0')
</script>

<style scoped>
@import '../../styles/attendance-theme.css';
/* onboarding-theme.css is loaded via the script import above (unscoped) so
   the rules apply to the teleported HrDatePicker popover and OnbModal slot
   children, not just to elements inside `.ssa-page`'s data-v scope. */

.ssa-page {
  position: relative;
  max-width: 1240px;
  margin: 0 auto;
  padding: 18px 22px 56px;
  display: flex; flex-direction: column; gap: 24px;
  color: var(--hr-text);
}

/* ───────────────── BACKDROP ───────────────── */
.ssa-backdrop { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.bd-aurora {
  position: absolute; border-radius: 50%; filter: blur(110px); opacity: 0.55;
  animation: att-aurora 22s ease-in-out infinite;
}
.bd-aurora-a { top: -15%; left: -10%; width: 620px; height: 620px;
  background: radial-gradient(circle, rgba(20, 184, 166, 0.65), transparent 65%); }
.bd-aurora-b { bottom: -25%; right: -10%; width: 720px; height: 720px;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.45), transparent 65%);
  animation-delay: 6s; }
.bd-aurora-c { top: 30%; left: 45%; width: 480px; height: 480px;
  background: radial-gradient(circle, rgba(250, 204, 21, 0.32), transparent 65%);
  animation-delay: 12s; }
.bd-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 52px 52px;
  -webkit-mask: radial-gradient(ellipse 80% 80% at 50% 30%, #000 30%, transparent 90%);
          mask: radial-gradient(ellipse 80% 80% at 50% 30%, #000 30%, transparent 90%);
  opacity: 0.6;
}
.bd-noise {
  position: absolute; inset: 0; opacity: 0.30;
  background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1.4px);
  background-size: 6px 6px;
}

/* ───────────────── HERO ───────────────── */
.ssa-hero {
  position: relative;
  border-radius: 32px;
  padding: 32px 36px 36px;
  background:
    radial-gradient(ellipse 120% 80% at 50% 0%, rgba(20, 184, 166, 0.18), transparent 60%),
    var(--att-glass-deep);
  border: var(--att-glass-stroke);
  backdrop-filter: var(--att-glass-blur);
  box-shadow: var(--att-glass-shadow-hi);
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  grid-template-areas: "head core" "stats core";
  gap: 22px 36px;
  overflow: hidden;
  z-index: 1;
}
@media (max-width: 940px) {
  .ssa-hero {
    grid-template-columns: 1fr;
    grid-template-areas: "head" "core" "stats";
    padding: 26px 24px 30px;
  }
}

.hero-head { grid-area: head; display: flex; flex-direction: column; gap: 12px; }
.hero-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 10.5px; font-weight: 800; letter-spacing: 1.8px;
  text-transform: uppercase; color: rgba(255, 255, 255, 0.78);
  flex-wrap: wrap;
}
.live-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--att-teal-100);
  box-shadow: 0 0 8px var(--att-teal-100);
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
.hero-eyebrow-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(255, 255, 255, 0.35); }
.hero-clock { color: var(--att-teal-100); letter-spacing: 1px; font-weight: 700; }

.hero-greeting {
  margin: 0;
  font-size: 56px; font-weight: 800;
  letter-spacing: -0.035em; line-height: 1.05;
  color: #fff;
  display: inline-flex; align-items: baseline; gap: 14px; flex-wrap: wrap;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.35), 0 0 28px rgba(20, 184, 166, 0.18);
}
.greeting-word {
  display: inline-block;
  position: relative;
  color: #fff;
  /* Ensures the gradient-clipped last word is visible while loading the gradient */
  animation: ssaWord 0.7s var(--att-spring) backwards;
}
@keyframes ssaWord {
  from { opacity: 0; transform: translateY(16px); filter: blur(6px); }
  to   { opacity: 1; transform: translateY(0); filter: blur(0); }
}
/* Last word gets the warm gradient with a safe text-fill fallback so it
   never disappears against the hero background. */
.greeting-word:last-child {
  background: linear-gradient(110deg, #fef3c7 0%, #fde68a 30%, #fbbf24 60%, #fb923c 100%);
  background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  color: #fbbf24; /* fallback */
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.35));
  animation:
    ssaWord 0.7s var(--att-spring) backwards,
    ssaGreetingShimmer 6s ease-in-out 0.8s infinite;
}
@keyframes ssaGreetingShimmer {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
@media (max-width: 580px) { .hero-greeting { font-size: 42px; } }

.hero-sub {
  margin: 0;
  display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
  font-size: 13px; color: rgba(255, 255, 255, 0.82);
}
.hero-sub-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  font-weight: 800; font-size: 11.5px;
  letter-spacing: 0.4px;
  color: #fff;
}
.hero-sub-pill[data-tone="good"] { background: var(--att-teal-soft); border-color: var(--att-teal-border-soft); color: var(--att-teal-100); }
.hero-sub-pill[data-tone="warn"] { background: rgba(251, 146, 60, 0.22); border-color: rgba(251, 146, 60, 0.42); color: var(--att-orange-100); }
.hero-sub-text { font-size: 12.5px; color: rgba(255, 255, 255, 0.72); }

/* CLOCK CORE */
.clock-core {
  grid-area: core;
  position: relative;
  width: 100%; aspect-ratio: 1;
  max-width: 360px;
  margin-left: auto;
  display: flex; align-items: center; justify-content: center;
}
@media (max-width: 940px) { .clock-core { margin: 8px auto; max-width: 320px; } }
.core-svg { width: 100%; height: 100%; filter: drop-shadow(0 30px 80px rgba(20, 184, 166, 0.35)); }
.core-ring-dots { transform-origin: 180px 180px; animation: att-ring-rotate 80s linear infinite; }
.core-progress { transition: stroke-dashoffset 0.9s var(--att-ease-quint); }
.core-ticks { opacity: 0.55; }
.core-hand { transition: all 0.4s var(--att-ease-quint); transform-origin: 180px 180px; }

.core-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  pointer-events: none;
}
.core-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase; color: var(--att-teal-100); }
.core-time {
  font-family: var(--hr-mono);
  font-size: 38px; font-weight: 800; letter-spacing: -0.02em;
  background: linear-gradient(110deg, var(--att-teal-100), var(--att-yellow-100));
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  font-variant-numeric: tabular-nums;
}
.core-sub { font-size: 11px; letter-spacing: 0.3px; color: rgba(255, 255, 255, 0.65); text-align: center; max-width: 220px; }

.orbiter {
  position: absolute; top: 50%; left: 50%;
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--att-teal-100);
  box-shadow: 0 0 8px var(--att-teal-100);
  animation: ssaOrbiter 8s ease-in-out infinite;
  margin: -3px 0 0 -3px;
}
.orbiter.orb-1 { background: var(--att-yellow-100); box-shadow: 0 0 10px var(--att-yellow-100); }
.orbiter.orb-3 { background: var(--att-orange-100); box-shadow: 0 0 10px var(--att-orange-100); }
.orbiter.orb-5 { background: #f0abfc; box-shadow: 0 0 10px #f0abfc; }
@keyframes ssaOrbiter {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* HERO STATS */
.hero-stats { grid-area: stats; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.hero-stat {
  position: relative;
  display: grid;
  grid-template-columns: 36px 1fr;
  grid-template-rows: auto auto;
  grid-template-areas: "icon body" "foot foot";
  gap: 4px 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
  transition: transform .3s var(--att-spring), border-color .3s;
}
.hero-stat:hover { border-color: rgba(255, 255, 255, 0.25); }
.stat-glow {
  position: absolute; top: -50%; right: -10%;
  width: 120%; height: 200%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(20, 184, 166, 0.25), transparent 70%);
  filter: blur(40px); pointer-events: none;
}
.hero-stat[data-tone="warn"] .stat-glow { background: radial-gradient(50% 50% at 50% 50%, rgba(251, 146, 60, 0.30), transparent 70%); }
.hero-stat[data-tone="orange"] .stat-glow { background: radial-gradient(50% 50% at 50% 50%, rgba(250, 204, 21, 0.22), transparent 70%); }
.stat-icon {
  grid-area: icon;
  width: 36px; height: 36px; border-radius: 11px;
  background: var(--att-teal-soft); color: var(--att-teal-100);
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--att-teal-border-soft);
}
.hero-stat[data-tone="warn"] .stat-icon { background: rgba(251, 146, 60, 0.18); color: var(--att-orange-200); border-color: rgba(251, 146, 60, 0.38); }
.hero-stat[data-tone="orange"] .stat-icon { background: rgba(250, 204, 21, 0.16); color: var(--att-yellow-200); border-color: rgba(250, 204, 21, 0.36); }
.stat-body { grid-area: body; display: flex; flex-direction: column; gap: 2px; }
.stat-value {
  font-family: var(--hr-mono);
  font-size: 22px; font-weight: 800; letter-spacing: -0.01em;
  color: #fff;
}
.stat-label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase; color: rgba(255, 255, 255, 0.6); }
.stat-foot { grid-area: foot; font-size: 10px; font-family: var(--hr-mono); color: rgba(255, 255, 255, 0.5); margin-top: 4px; }

/* ───────────────── ACTION DECK ───────────────── */
.action-deck {
  position: relative;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 22px;
  z-index: 1;
}
@media (max-width: 960px) { .action-deck { grid-template-columns: 1fr; } }

.deck-primary { display: flex; flex-direction: column; gap: 12px; }

.punch-btn {
  position: relative; overflow: hidden;
  display: grid;
  grid-template-columns: 56px 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  border: 0; border-radius: 22px;
  text-align: left;
  font: inherit;
  color: #fff;
  cursor: pointer;
  transition: filter .25s, border-color .25s;
  background: var(--att-glass-hi);
  border: var(--att-glass-stroke);
  backdrop-filter: var(--att-glass-blur);
  box-shadow: var(--att-glass-shadow);
}
.punch-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.punch-btn.punch-in {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 60%, #0f766e 100%);
  box-shadow: 0 28px 60px -22px rgba(20, 184, 166, 0.6),
              inset 0 1px 0 rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(94, 234, 212, 0.42);
  color: #fff;
}
.punch-btn.punch-in:hover:not(:disabled) { filter: brightness(1.06); }
/* Clock-out — strong dark teal with a luminous border so it stays visible
   against the warm light-mode hero gradient. */
.punch-btn.punch-out {
  background: linear-gradient(135deg, #0f766e 0%, #134e4a 50%, #115e59 100%);
  box-shadow: 0 18px 40px -16px rgba(15, 118, 110, 0.7),
              inset 0 1px 0 rgba(255, 255, 255, 0.12);
  color: #fff;
  border: 1px solid rgba(94, 234, 212, 0.45);
}
.punch-btn.punch-out .punch-icon-wrap { background: rgba(94, 234, 212, 0.22); border-color: rgba(94, 234, 212, 0.45); color: #5eead4; }
.punch-btn.punch-out .punch-label { color: #fff; }
.punch-btn.punch-out .punch-sub { color: rgba(255,255,255,0.85); }
/* Take-a-break — deep amber so it remains legible on the dark glass too. */
.punch-btn.punch-break {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 55%, #c2410c 100%);
  color: #fff;
  box-shadow: 0 18px 40px -16px rgba(234, 88, 12, 0.7),
              inset 0 1px 0 rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(253, 186, 116, 0.55);
}
.punch-btn.punch-break .punch-icon-wrap { background: rgba(255, 255, 255, 0.22); border-color: rgba(255, 255, 255, 0.36); color: #fff; }
.punch-btn.punch-break .punch-label { color: #fff; text-shadow: 0 1px 6px rgba(0,0,0,0.18); }
.punch-btn.punch-break .punch-sub { color: rgba(255,255,255,0.88); }
.punch-btn.punch-end-break {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 55%, #d97706 100%);
  color: #1a1100;
  box-shadow: 0 22px 50px -20px rgba(234, 179, 8, 0.65),
              inset 0 1px 0 rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(254, 240, 138, 0.6);
}
.punch-btn.punch-done {
  background: var(--att-glass-deep);
  color: var(--hr-text);
  cursor: default;
}
.punch-btn.late-shell {
  display: flex; flex-direction: column; gap: 14px; align-items: stretch;
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.18), rgba(248, 113, 113, 0.10));
  border-color: rgba(251, 146, 60, 0.35);
  cursor: default; padding: 18px 22px;
}
.late-banner { display: grid; grid-template-columns: 56px 1fr; gap: 16px; align-items: center; }
.late-actions { display: flex; justify-content: flex-end; }
.punch-cta-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-radius: 12px;
  background: linear-gradient(135deg, var(--att-orange-100), var(--att-orange-300));
  border: 0; color: #1a0e04;
  font: inherit; font-weight: 800; font-size: 12.5px;
  cursor: pointer;
  box-shadow: 0 12px 28px -12px rgba(234, 88, 12, 0.6);
}
.late-pending {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; color: var(--att-orange-200);
  padding: 8px 14px; border-radius: 10px;
  background: rgba(251, 146, 60, 0.10);
  border: 1px solid rgba(251, 146, 60, 0.28);
}

/* Early-clock-in lock — shift hasn't started yet. Calm teal/slate tone to
   distinguish it from the orange late-approval banner. */
.punch-btn.early-shell {
  display: flex; flex-direction: column; gap: 14px; align-items: stretch;
  background: linear-gradient(135deg, rgba(94, 234, 212, 0.14), rgba(129, 140, 248, 0.08));
  border-color: rgba(94, 234, 212, 0.30);
  cursor: default; padding: 18px 22px;
}
.early-banner { display: grid; grid-template-columns: 56px 1fr; gap: 16px; align-items: center; }
.punch-icon-wrap.calm {
  background: linear-gradient(135deg, rgba(94, 234, 212, 0.30), rgba(94, 234, 212, 0.10));
  color: #5eead4;
  border-color: rgba(94, 234, 212, 0.4);
}
.early-meta { display: flex; justify-content: flex-end; }
.early-pill {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.3px;
  color: #5eead4;
  padding: 6px 12px; border-radius: 10px;
  background: rgba(94, 234, 212, 0.10);
  border: 1px solid rgba(94, 234, 212, 0.30);
}

/* Clock-out button locked by early-exit policy — clearly different visual
   so the user notices it before clicking. */
.punch-btn.punch-out-locked {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.16), rgba(248, 113, 113, 0.10));
  border-color: rgba(251, 146, 60, 0.36);
  color: var(--hr-text);
}
.punch-btn.punch-out-locked .punch-icon-wrap.warn {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.32), rgba(251, 146, 60, 0.12));
  color: #fb923c;
  border-color: rgba(251, 146, 60, 0.5);
}
.punch-btn.punch-out-locked:hover {
  border-color: rgba(251, 146, 60, 0.55);
  box-shadow: 0 16px 32px -16px rgba(251, 146, 60, 0.42);
}

/* Light-theme overrides for the new shells */
[data-theme="light"] .punch-btn.early-shell {
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.10), rgba(129, 140, 248, 0.06));
  border-color: rgba(13, 148, 136, 0.30);
}
[data-theme="light"] .punch-icon-wrap.calm {
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.22), rgba(13, 148, 136, 0.08));
  color: #0f766e;
  border-color: rgba(13, 148, 136, 0.35);
}
[data-theme="light"] .early-pill {
  color: #0f766e;
  background: rgba(13, 148, 136, 0.08);
  border-color: rgba(13, 148, 136, 0.30);
}
[data-theme="light"] .punch-btn.punch-out-locked {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.10), rgba(248, 113, 113, 0.06));
  border-color: rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .punch-btn.punch-out-locked .punch-icon-wrap.warn {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.20), rgba(217, 119, 6, 0.08));
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.4);
}

.punch-aura {
  position: absolute; inset: -30%;
  background: radial-gradient(circle at 30% 30%, rgba(94, 234, 212, 0.55), transparent 60%);
  pointer-events: none;
  animation: ssaAura 4s ease-in-out infinite;
}
.punch-aura.warm { background: radial-gradient(circle at 70% 70%, rgba(253, 224, 71, 0.55), transparent 60%); }
@keyframes ssaAura {
  0%, 100% { opacity: 0; transform: scale(0.9); }
  50% { opacity: 0.7; transform: scale(1.08); }
}

.punch-icon-wrap {
  position: relative; z-index: 1;
  width: 56px; height: 56px; border-radius: 16px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(6px);
}
.punch-icon-wrap.warn { background: rgba(251, 146, 60, 0.22); border-color: rgba(251, 146, 60, 0.45); color: var(--att-orange-100); }
.punch-icon-wrap.success { background: var(--att-teal-soft); border-color: var(--att-teal-border-soft); color: var(--att-teal-100); }
.punch-body { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.punch-label { font-size: 18px; font-weight: 800; letter-spacing: -0.01em; }
.punch-sub { font-size: 12px; opacity: 0.78; line-height: 1.4; }
.punch-cta {
  position: relative; z-index: 1;
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.30);
  display: inline-flex; align-items: center; justify-content: center;
  transition: transform 0.25s var(--att-spring);
}
.punch-btn:hover:not(:disabled) .punch-cta { transform: translateX(4px); }

.punch-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 720px) { .punch-pair { grid-template-columns: 1fr; } }
.punch-pair .punch-btn { padding: 16px 18px; }
.punch-pair .punch-icon-wrap { width: 44px; height: 44px; border-radius: 12px; }
.punch-pair .punch-label { font-size: 15px; }

.block-note {
  margin: 4px 0 0;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--hr-text-muted); line-height: 1.5;
}

.late-blurb {
  margin: 0 0 4px;
  padding: 12px 14px;
  background: rgba(251, 146, 60, 0.08);
  border-left: 2px solid var(--att-orange-200);
  border-radius: 0 10px 10px 0;
  font-size: 12.5px; color: var(--hr-text-secondary);
  line-height: 1.55;
}
.late-blurb b { color: var(--att-orange-200); }

/* DECK RAIL */
.deck-rail { display: flex; flex-direction: column; gap: 12px; }
.rail-card {
  position: relative;
  padding: 16px 18px;
  border-radius: 18px;
  background: var(--att-glass);
  border: var(--att-glass-stroke);
  backdrop-filter: var(--att-glass-blur);
  box-shadow: var(--att-glass-shadow);
  display: flex; flex-direction: column; gap: 10px;
}
.rail-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.rail-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase;
  color: var(--att-teal-100);
}
.rail-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 9px; border-radius: 999px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--hr-text-secondary);
}
.rail-pill-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--hr-text-muted); }
.rail-pill[data-tone="good"] { background: var(--att-teal-soft); color: var(--att-teal-100); border-color: var(--att-teal-border-soft); }
.rail-pill[data-tone="good"] .rail-pill-dot { background: var(--att-teal-100); box-shadow: 0 0 4px var(--att-teal-100); }
.rail-pill[data-tone="warn"] { background: rgba(251, 146, 60, 0.16); color: var(--att-orange-200); border-color: rgba(251, 146, 60, 0.34); }
.rail-pill[data-tone="warn"] .rail-pill-dot { background: var(--att-orange-200); }

/* LOCATION */
.location-card { display: grid; grid-template-columns: 88px 1fr; grid-template-areas: "head head" "radar body"; gap: 10px 16px; }
.location-card .rail-head { grid-area: head; }
.loc-radar { grid-area: radar; width: 88px; height: 88px; position: relative; }
.radar-svg { width: 100%; height: 100%; }
.r-ring { fill: none; stroke: rgba(20, 184, 166, 0.22); stroke-width: 0.5; transform-origin: 50px 50px; }
.r-ring-1 { stroke: rgba(20, 184, 166, 0.50); fill: rgba(20, 184, 166, 0.08); }
.r-ring-2 { stroke: rgba(20, 184, 166, 0.36); fill: rgba(20, 184, 166, 0.04); }
.r-ring-3 { fill: rgba(20, 184, 166, 0.02); }
.r-sweep {
  fill: none; stroke-width: 3;
  stroke-dasharray: 18 82;
  transform-origin: 50px 50px;
  animation: att-ring-rotate 4.5s linear infinite;
  opacity: 0.85;
}
.location-card[data-loading="true"] .r-sweep { animation-duration: 1.5s; }
.location-card[data-verified="false"] .r-sweep { stroke: rgba(251, 146, 60, 0.65); }
.r-dot { fill: var(--att-teal-100); }
.r-dot-pulse {
  fill: var(--att-teal-100); opacity: 0.5;
  transform-origin: 50px 50px;
  animation: ssaRadarPulse 2.6s ease-out infinite;
}
@keyframes ssaRadarPulse {
  0% { transform: scale(1); opacity: 0.55; }
  100% { transform: scale(8); opacity: 0; }
}
.loc-body { grid-area: body; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.loc-title { font-size: 13px; font-weight: 700; color: var(--hr-text); }
.loc-meta { font-size: 10.5px; color: var(--hr-text-muted); }
.loc-actions { margin-top: 4px; }
.link-btn {
  display: inline-flex; align-items: center; gap: 4px;
  background: none; border: 0;
  font: inherit; font-size: 10.5px; font-weight: 700; letter-spacing: 0.4px;
  color: var(--att-teal-100); cursor: pointer;
}
.link-btn:hover { text-decoration: underline; }

/* BREAK CARD */
.break-card { display: flex; flex-direction: column; gap: 10px; }
.bw-bar {
  position: relative;
  height: 30px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.bw-used {
  position: absolute; left: 0; top: 0; bottom: 0;
  background: linear-gradient(90deg, var(--att-orange-200), var(--att-yellow-200));
  border-right: 2px solid #fff;
  transition: width 0.6s var(--att-ease-quint);
}
.bw-cap-text {
  position: relative; z-index: 1;
  display: inline-flex; align-items: baseline; gap: 4px;
  font-size: 13px; font-weight: 800;
  color: #fff; text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}
.bw-sep { opacity: 0.5; }
.bw-unit { font-size: 9.5px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase; opacity: 0.7; }
.bw-windows { display: flex; flex-wrap: wrap; gap: 6px; }
.bw-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.10);
  font-size: 10.5px; color: var(--hr-text-secondary);
  transition: all .25s var(--att-spring);
}
.bw-pill[data-active="true"] {
  background: var(--att-teal-soft);
  border-color: var(--att-teal-border-soft);
  color: var(--att-teal-100);
  box-shadow: 0 4px 16px -6px rgba(20, 184, 166, 0.5);
}
.bw-pill-label { font-weight: 800; }
.bw-pill-time { font-family: var(--hr-mono); opacity: 0.85; }
.bw-pill-max { font-family: var(--hr-mono); opacity: 0.55; font-size: 10px; }
.bw-no-windows { font-size: 11px; color: var(--hr-text-muted); line-height: 1.5; }

/* SHIFT MINI */
.sft-name { font-size: 14px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.01em; }
.sft-times {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 16px; font-weight: 700; color: var(--att-teal-100);
  letter-spacing: 0.5px;
}
.sft-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: var(--hr-text-secondary); }
.sft-meta span { display: inline-flex; align-items: center; gap: 4px; }
.sft-meta svg { color: var(--att-teal-100); }

/* ───────────────── JOURNEY ───────────────── */
.journey {
  position: relative;
  padding: 22px 26px;
  border-radius: 22px;
  background: var(--att-glass);
  border: var(--att-glass-stroke);
  backdrop-filter: var(--att-glass-blur);
  box-shadow: var(--att-glass-shadow);
  z-index: 1;
}
.section-head {
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
  margin-bottom: 16px;
}
.section-head h2 {
  margin: 0; display: inline-flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 800; color: var(--hr-text);
  letter-spacing: -0.01em;
}
.section-head h2 svg { color: var(--att-teal-100); }
.head-meta { font-size: 10.5px; letter-spacing: 0.5px; text-transform: uppercase; color: var(--hr-text-muted); }

.journey-rail { position: relative; padding-left: 36px; display: flex; flex-direction: column; gap: 16px; }
.journey-line { position: absolute; top: 8px; bottom: 8px; left: 18px; width: 4px; }
.journey-event { position: relative; display: flex; gap: 14px; align-items: center; }
.ev-dot {
  position: absolute; left: -36px;
  width: 32px; height: 32px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--att-glass);
  border: 1px solid var(--att-teal-border-soft);
  color: var(--att-teal-100);
  z-index: 2;
}
.journey-event.done .ev-dot { background: var(--att-teal-soft); color: var(--att-teal-100); border-color: var(--att-teal-200); }
.journey-event.active .ev-dot {
  background: var(--att-yellow-soft); color: var(--att-yellow-200);
  border-color: var(--att-yellow-border-soft);
  box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.15);
  animation: ssaActive 2.4s ease-in-out infinite;
}
@keyframes ssaActive {
  0%, 100% { box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.15); }
  50% { box-shadow: 0 0 0 8px rgba(250, 204, 21, 0.08); }
}
.journey-event.plan .ev-dot { opacity: 0.55; }
.ev-body { display: flex; flex-direction: column; gap: 2px; }
.ev-time { font-size: 11px; letter-spacing: 0.6px; text-transform: uppercase; color: var(--att-teal-100); font-weight: 800; }
.ev-label { font-size: 13.5px; color: var(--hr-text); font-weight: 700; }
.ev-detail { font-size: 11px; color: var(--hr-text-muted); }

/* ───────────────── INSIGHTS ───────────────── */
.insights {
  padding: 22px 26px;
  border-radius: 22px;
  background: var(--att-glass);
  border: var(--att-glass-stroke);
  backdrop-filter: var(--att-glass-blur);
  box-shadow: var(--att-glass-shadow);
  z-index: 1;
}
.insights-grid { display: grid; grid-template-columns: 240px 1fr; gap: 22px; align-items: center; }
@media (max-width: 760px) { .insights-grid { grid-template-columns: 1fr; } }
.insight-stats {
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(20, 184, 166, 0.04);
  border: 1px solid var(--att-teal-border-soft);
  display: flex; flex-direction: column; gap: 6px;
}
.ins-row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.ins-row.sub { font-size: 11px; }
.ins-label { font-size: 11px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--hr-text-muted); }
.ins-label-sm { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--hr-text-secondary); }
.ins-label-sm svg { color: var(--att-teal-100); }
.ins-value { font-size: 22px; font-weight: 800; color: var(--att-teal-100); }
.ins-bar { height: 4px; border-radius: 2px; background: rgba(20, 184, 166, 0.12); overflow: hidden; margin-bottom: 4px; }
.ins-bar-fill {
  display: block; height: 100%;
  background: linear-gradient(90deg, var(--att-teal-200), var(--att-yellow-200));
  border-radius: 2px;
  transition: width 0.8s var(--att-ease-quint);
}

.history-tape { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
@media (max-width: 760px) { .history-tape { grid-template-columns: repeat(4, 1fr); } }
.hist-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 8px;
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  cursor: pointer;
  transition: border-color .2s, background .2s;
}
.hist-card:hover { border-color: rgba(20, 184, 166, 0.45); background: rgba(20, 184, 166, 0.06); }
.hist-weekday { font-size: 9px; font-weight: 800; letter-spacing: 1.0px; text-transform: uppercase; color: var(--hr-text-muted); }
.hist-day { font-family: var(--hr-mono); font-size: 18px; font-weight: 800; color: var(--hr-text); }
.hist-hours { font-size: 10px; color: var(--hr-text-muted); }
.hist-card[data-status="LATE"] { border-color: rgba(251, 146, 60, 0.45); }
.hist-card[data-status="ABSENT"] { border-color: rgba(248, 113, 113, 0.45); opacity: 0.7; }
.hist-card[data-status="WFH"] { border-color: rgba(125, 211, 252, 0.45); }

/* ───────────────── QUICK ACTIONS ───────────────── */
.quick-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; z-index: 1; }
@media (max-width: 720px) { .quick-row { grid-template-columns: 1fr; } }
.qa-btn {
  display: grid;
  grid-template-columns: 40px 1fr;
  align-items: center; gap: 12px;
  padding: 14px 16px;
  background: var(--att-glass);
  border: var(--att-glass-stroke);
  border-radius: 16px;
  backdrop-filter: var(--att-glass-blur);
  cursor: pointer;
  font: inherit;
  text-align: left;
  color: var(--hr-text);
  transition: border-color .2s;
}
.qa-btn:hover { border-color: var(--att-teal-200); }
.qa-icon {
  width: 40px; height: 40px; border-radius: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--att-teal-soft); color: var(--att-teal-100);
  border: 1px solid var(--att-teal-border-soft);
}
.qa-body { display: flex; flex-direction: column; gap: 2px; }
.qa-label { font-size: 13px; font-weight: 800; color: var(--hr-text); }
.qa-sub { font-size: 11px; color: var(--hr-text-muted); }

/* ───────────────── MONTH ───────────────── */
.month {
  padding: 22px 26px;
  border-radius: 22px;
  background: var(--att-glass);
  border: var(--att-glass-stroke);
  backdrop-filter: var(--att-glass-blur);
  box-shadow: var(--att-glass-shadow);
  z-index: 1;
}
.month-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.m-weekday {
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase;
  color: var(--hr-text-muted); text-align: center; padding: 4px 0;
}
.m-cell {
  position: relative;
  aspect-ratio: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  font-size: 12px; color: var(--hr-text);
}
.m-cell.is-blank { background: transparent; border-color: transparent; }
.m-cell.today { border-color: var(--att-teal-100); box-shadow: 0 0 0 2px var(--att-teal-soft); }
.m-cell[data-status="PRESENT"] { background: var(--att-teal-soft); border-color: var(--att-teal-border-soft); }
.m-cell[data-status="LATE"]    { background: rgba(251, 146, 60, 0.16); border-color: rgba(251, 146, 60, 0.32); }
.m-cell[data-status="ABSENT"]  { background: rgba(248, 113, 113, 0.14); border-color: rgba(248, 113, 113, 0.32); opacity: 0.85; }
.m-cell[data-status="WFH"]     { background: rgba(125, 211, 252, 0.16); border-color: rgba(125, 211, 252, 0.32); }
.m-num { font-family: var(--hr-mono); font-size: 12px; font-weight: 700; color: var(--hr-text); }
.m-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: 0.6; }

/* ───────────────── MODALS ───────────────── */
.ssa-modal-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.ssa-modal {
  width: 100%; max-width: 540px;
  background: rgba(8, 14, 18, 0.96);
  border: 1px solid rgba(20, 184, 166, 0.32);
  border-radius: 20px;
  box-shadow: 0 40px 80px -30px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}
.ssa-modal-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 22px; border-bottom: 1px solid rgba(20, 184, 166, 0.14); }
.modal-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase;
  color: var(--att-teal-100);
}
.modal-eyebrow.warn { color: var(--att-orange-200); }
.ssa-modal-head h3 { margin: 4px 0 0; font-size: 17px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.01em; }
.icon-btn {
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(255, 255, 255, 0.05); border: 0;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--hr-text-muted); cursor: pointer;
  transition: background .2s var(--att-spring), color .2s;
}
.icon-btn:hover { background: rgba(255, 255, 255, 0.10); color: var(--hr-text); }
.ssa-modal-body { padding: 18px 22px; display: flex; flex-direction: column; gap: 12px; }
.ssa-field { display: flex; flex-direction: column; gap: 5px; }
.ssa-field > span { font-size: 10px; font-weight: 800; letter-spacing: 1.0px; text-transform: uppercase; color: var(--hr-text-muted); }
.ssa-field input, .ssa-field select, .ssa-field textarea {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(20, 184, 166, 0.22);
  color: var(--hr-text);
  border-radius: 10px; padding: 10px 12px;
  font: inherit; font-size: 13px;
  color-scheme: dark;
}
.ssa-field textarea { resize: vertical; min-height: 64px; }
.ssa-field input:focus, .ssa-field select:focus, .ssa-field textarea:focus {
  outline: none; border-color: var(--att-teal-200);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15);
}
.ssa-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.ssa-modal-foot { display: flex; gap: 8px; justify-content: flex-end; padding: 14px 22px; border-top: 1px solid rgba(20, 184, 166, 0.14); }

/* transitions */
.ssa-fade-enter-active, .ssa-fade-leave-active { transition: opacity .22s ease; }
.ssa-fade-enter-from, .ssa-fade-leave-to { opacity: 0; }
.action-fade-enter-active, .action-fade-leave-active { transition: opacity .25s ease, transform .25s var(--att-spring); }
.action-fade-enter-from { opacity: 0; transform: translateY(8px); }
.action-fade-leave-to { opacity: 0; transform: translateY(-8px); position: absolute; }

/* ════════════════════ LIGHT THEME ════════════════════ */
[data-theme="light"] .ssa-hero {
  background:
    radial-gradient(ellipse 120% 80% at 50% 0%, rgba(13, 148, 136, 0.20), transparent 60%),
    linear-gradient(160deg, #5eead4 0%, #fbbf24 60%, #f97316 100%);
  border-color: rgba(13, 148, 136, 0.30);
}
[data-theme="light"] .hero-greeting { color: #fff; text-shadow: 0 2px 12px rgba(40, 25, 10, 0.30); }
[data-theme="light"] .hero-clock { color: rgba(255,255,255,0.95); }
[data-theme="light"] .core-time {
  background: linear-gradient(110deg, #fff, #fde68a);
  -webkit-background-clip: text; background-clip: text;
}
[data-theme="light"] .core-sub { color: rgba(255, 255, 255, 0.80); }
[data-theme="light"] .core-eyebrow { color: rgba(255, 255, 255, 0.85); }
[data-theme="light"] .hero-stat {
  background: rgba(255, 250, 240, 0.18);
  border-color: rgba(255, 255, 255, 0.40);
  backdrop-filter: blur(8px);
}
[data-theme="light"] .hero-stat .stat-value { color: #fff; }
[data-theme="light"] .hero-stat .stat-label { color: rgba(255, 255, 255, 0.85); }
[data-theme="light"] .hero-stat .stat-foot { color: rgba(255, 255, 255, 0.70); }
[data-theme="light"] .hero-stat .stat-icon { background: rgba(255, 255, 255, 0.25); color: #fff; border-color: rgba(255, 255, 255, 0.40); }

[data-theme="light"] .rail-card,
[data-theme="light"] .journey,
[data-theme="light"] .insights,
[data-theme="light"] .month,
[data-theme="light"] .punch-btn.punch-done,
[data-theme="light"] .qa-btn {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(13, 148, 136, 0.24);
  color: var(--hr-text);
}
[data-theme="light"] .punch-btn.late-shell {
  background: linear-gradient(135deg, rgba(234, 88, 12, 0.10), rgba(239, 68, 68, 0.06));
  border-color: rgba(234, 88, 12, 0.34);
  color: var(--hr-text);
}
[data-theme="light"] .punch-btn.late-shell .punch-label { color: var(--att-orange-700); }
[data-theme="light"] .punch-btn.late-shell .punch-sub { color: var(--hr-text-secondary); }
[data-theme="light"] .late-blurb { background: rgba(234, 88, 12, 0.08); color: var(--hr-text-secondary); }
[data-theme="light"] .late-blurb b { color: var(--att-orange-700); }
[data-theme="light"] .rail-eyebrow { color: var(--att-teal-500); }
[data-theme="light"] .rail-pill { background: rgba(13, 148, 136, 0.06); border-color: rgba(13, 148, 136, 0.18); color: var(--hr-text-secondary); }
[data-theme="light"] .rail-pill[data-tone="good"] { background: rgba(13, 148, 136, 0.16); color: var(--att-teal-500); border-color: rgba(13, 148, 136, 0.32); }
[data-theme="light"] .rail-pill[data-tone="warn"] { background: rgba(234, 88, 12, 0.16); color: var(--att-orange-500); border-color: rgba(234, 88, 12, 0.32); }
[data-theme="light"] .loc-title { color: var(--hr-text); }
[data-theme="light"] .loc-meta { color: var(--hr-text-secondary); }
[data-theme="light"] .link-btn { color: var(--att-teal-500); }
[data-theme="light"] .bw-bar { background: rgba(13, 148, 136, 0.08); }
[data-theme="light"] .bw-cap-text { color: var(--hr-text); text-shadow: 0 1px 2px rgba(255,255,255,0.6); }
[data-theme="light"] .bw-pill { background: rgba(13, 148, 136, 0.06); border-color: rgba(13, 148, 136, 0.18); color: var(--hr-text-secondary); }
[data-theme="light"] .bw-pill[data-active="true"] { background: rgba(13, 148, 136, 0.16); color: var(--att-teal-500); border-color: rgba(13, 148, 136, 0.34); }
[data-theme="light"] .sft-name { color: var(--hr-text); }
[data-theme="light"] .sft-times { color: var(--att-teal-500); }
[data-theme="light"] .sft-meta { color: var(--hr-text-secondary); }
[data-theme="light"] .sft-meta svg { color: var(--att-teal-500); }
[data-theme="light"] .section-head h2 { color: var(--hr-text); }
[data-theme="light"] .section-head h2 svg { color: var(--att-teal-500); }
[data-theme="light"] .head-meta { color: var(--hr-text-muted); }
[data-theme="light"] .ev-dot { background: rgba(255, 250, 240, 0.85); }
[data-theme="light"] .ev-time { color: var(--att-teal-500); }
[data-theme="light"] .ev-label { color: var(--hr-text); }
[data-theme="light"] .ev-detail { color: var(--hr-text-muted); }
[data-theme="light"] .insight-stats { background: rgba(13, 148, 136, 0.04); border-color: rgba(13, 148, 136, 0.20); }
[data-theme="light"] .ins-value { color: var(--att-teal-500); }
[data-theme="light"] .ins-label, [data-theme="light"] .ins-label-sm { color: var(--hr-text-secondary); }
[data-theme="light"] .ins-label-sm svg { color: var(--att-teal-500); }
[data-theme="light"] .hist-card { background: rgba(255, 250, 240, 0.65); border-color: rgba(13, 148, 136, 0.18); }
[data-theme="light"] .hist-card:hover { background: rgba(13, 148, 136, 0.10); border-color: rgba(13, 148, 136, 0.36); }
[data-theme="light"] .hist-weekday { color: var(--hr-text-muted); }
[data-theme="light"] .hist-day { color: var(--hr-text); }
[data-theme="light"] .hist-hours { color: var(--hr-text-secondary); }
[data-theme="light"] .qa-icon { background: rgba(13, 148, 136, 0.10); color: var(--att-teal-500); border-color: rgba(13, 148, 136, 0.26); }
[data-theme="light"] .qa-label { color: var(--hr-text); }
[data-theme="light"] .qa-sub { color: var(--hr-text-muted); }
[data-theme="light"] .m-cell { background: rgba(255, 250, 240, 0.65); border-color: rgba(13, 148, 136, 0.16); color: var(--hr-text); }
[data-theme="light"] .m-cell[data-status="PRESENT"] { background: rgba(13, 148, 136, 0.16); border-color: rgba(13, 148, 136, 0.34); }
[data-theme="light"] .m-cell[data-status="LATE"]    { background: rgba(234, 88, 12, 0.16); border-color: rgba(234, 88, 12, 0.34); }
[data-theme="light"] .m-cell[data-status="ABSENT"]  { background: rgba(239, 68, 68, 0.14); border-color: rgba(239, 68, 68, 0.32); }
[data-theme="light"] .m-cell[data-status="WFH"]     { background: rgba(56, 189, 248, 0.16); border-color: rgba(56, 189, 248, 0.34); }
[data-theme="light"] .m-num { color: var(--hr-text); }
[data-theme="light"] .ssa-modal { background: rgba(255, 250, 240, 0.98); border-color: rgba(13, 148, 136, 0.32); color: var(--hr-text); }
[data-theme="light"] .ssa-modal-head h3 { color: var(--hr-text); }
[data-theme="light"] .ssa-modal-head { border-bottom-color: rgba(13, 148, 136, 0.16); }
[data-theme="light"] .ssa-modal-foot { border-top-color: rgba(13, 148, 136, 0.16); }
[data-theme="light"] .ssa-field > span { color: var(--hr-text-secondary); }
[data-theme="light"] .ssa-field input,
[data-theme="light"] .ssa-field select,
[data-theme="light"] .ssa-field textarea {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(13, 148, 136, 0.28);
  color: var(--hr-text);
  color-scheme: light;
}
[data-theme="light"] .icon-btn { background: rgba(13, 148, 136, 0.08); color: var(--hr-text-secondary); }
[data-theme="light"] .icon-btn:hover { background: rgba(13, 148, 136, 0.16); color: var(--hr-text); }
[data-theme="light"] .modal-eyebrow { color: var(--att-teal-500); }
[data-theme="light"] .modal-eyebrow.warn { color: var(--att-orange-500); }
[data-theme="light"] .bw-no-windows { color: var(--hr-text-muted); }
[data-theme="light"] .punch-btn.punch-done .punch-label { color: var(--hr-text); }
[data-theme="light"] .punch-btn.punch-done .punch-sub { color: var(--hr-text-secondary); }

/* ═══════════════════════════════════════════════════════════════════════
   ULTRA-MODERN PASS — visibility fixes + redesigned cards
   Appended last so these win the cascade on conflicting properties.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Stronger card borders on both themes ─────────────────────────────── */
.rail-card,
.journey,
.insights,
.month,
.qa-btn,
.pulse-panel {
  border: 1px solid rgba(94, 234, 212, 0.22);
  box-shadow:
    0 20px 50px -28px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 0 0 1px rgba(20, 184, 166, 0.06);
}
[data-theme="light"] .rail-card,
[data-theme="light"] .journey,
[data-theme="light"] .insights,
[data-theme="light"] .month,
[data-theme="light"] .qa-btn,
[data-theme="light"] .pulse-panel {
  border: 1px solid rgba(13, 148, 136, 0.32);
  box-shadow:
    0 20px 50px -28px rgba(40, 25, 10, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 0 0 1px rgba(13, 148, 136, 0.10);
}

/* ── Punch-out button — extra contrast on light theme ─────────────────── */
[data-theme="light"] .punch-btn.punch-out {
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 55%, #134e4a 100%);
  border-color: rgba(13, 148, 136, 0.65);
  color: #fff;
  box-shadow: 0 18px 38px -16px rgba(15, 118, 110, 0.55);
}
[data-theme="light"] .punch-btn.punch-out .punch-icon-wrap {
  background: rgba(255, 255, 255, 0.28); border-color: rgba(255, 255, 255, 0.55); color: #fff;
}
[data-theme="light"] .punch-btn.punch-out .punch-label,
[data-theme="light"] .punch-btn.punch-out .punch-sub { color: #fff; }

[data-theme="light"] .punch-btn.punch-break {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 55%, #c2410c 100%);
  border-color: rgba(194, 65, 12, 0.55);
}
[data-theme="light"] .punch-btn.punch-break .punch-label,
[data-theme="light"] .punch-btn.punch-break .punch-sub { color: #fff; }

/* ── Action deck reshape — left column gets a pulse panel beneath the
       primary punch button so the empty space is filled. ─────────────── */
.action-deck { grid-template-columns: 1.4fr 1fr; }

.pulse-panel {
  position: relative;
  padding: 16px 18px;
  border-radius: 18px;
  background:
    radial-gradient(120% 60% at 100% 0%, rgba(251, 146, 60, 0.10), transparent 65%),
    var(--att-glass);
  backdrop-filter: var(--att-glass-blur);
  overflow: hidden;
}
.pulse-panel::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, #14b8a6, #facc15, #fb923c, transparent);
  background-size: 200% 100%;
  animation: pulseRail 4.5s linear infinite;
}
@keyframes pulseRail { to { background-position: -200% 0; } }
.pulse-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.pulse-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
@media (max-width: 720px) { .pulse-grid { grid-template-columns: repeat(2, 1fr); } }
.pulse-tile {
  position: relative;
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
  padding: 12px 13px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(94, 234, 212, 0.22);
  overflow: hidden;
  cursor: default;
  transition: border-color 0.25s, transform 0.3s var(--att-spring);
}
.pulse-tile:hover { border-color: rgba(94, 234, 212, 0.55); }
.tile-aura {
  position: absolute; inset: -40% -20% auto auto;
  width: 80%; height: 140%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(20, 184, 166, 0.22), transparent 70%);
  filter: blur(20px); pointer-events: none;
}
.pulse-tile.streak .tile-aura { background: radial-gradient(50% 50% at 50% 50%, rgba(251, 146, 60, 0.28), transparent 70%); }
.pulse-tile.avg .tile-aura    { background: radial-gradient(50% 50% at 50% 50%, rgba(94, 234, 212, 0.28), transparent 70%); }
.pulse-tile.target .tile-aura { background: radial-gradient(50% 50% at 50% 50%, rgba(250, 204, 21, 0.28), transparent 70%); }
.pulse-tile.rank .tile-aura   { background: radial-gradient(50% 50% at 50% 50%, rgba(244, 114, 182, 0.24), transparent 70%); }
.tile-icon {
  display: inline-grid; place-items: center;
  width: 28px; height: 28px; border-radius: 9px;
  background: rgba(20, 184, 166, 0.16); color: var(--att-teal-100);
  border: 1px solid rgba(20, 184, 166, 0.32);
  margin-bottom: 2px;
}
.pulse-tile.streak .tile-icon { background: rgba(251, 146, 60, 0.16); color: var(--att-orange-100); border-color: rgba(251, 146, 60, 0.32); }
.pulse-tile.target .tile-icon { background: rgba(250, 204, 21, 0.16); color: var(--att-yellow-200); border-color: rgba(250, 204, 21, 0.32); }
.pulse-tile.rank .tile-icon   { background: rgba(244, 114, 182, 0.16); color: #f9a8d4; border-color: rgba(244, 114, 182, 0.32); }
.tile-value {
  font-size: 20px; font-weight: 800; letter-spacing: -0.02em;
  color: #fff; font-variant-numeric: tabular-nums;
}
.tile-label { font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.62); }
.tile-foot  { font-size: 9.5px; color: rgba(255,255,255,0.48); margin-top: 2px; }
[data-theme="light"] .pulse-panel {
  background:
    radial-gradient(120% 60% at 100% 0%, rgba(194, 65, 12, 0.12), transparent 65%),
    rgba(255, 250, 240, 0.85);
}
[data-theme="light"] .pulse-tile { background: rgba(255, 250, 240, 0.7); border-color: rgba(13, 148, 136, 0.28); }
[data-theme="light"] .pulse-tile:hover { border-color: rgba(13, 148, 136, 0.55); }
[data-theme="light"] .tile-icon { background: rgba(13, 148, 136, 0.14); color: var(--att-teal-500); border-color: rgba(13, 148, 136, 0.32); }
[data-theme="light"] .pulse-tile.streak .tile-icon { background: rgba(194, 65, 12, 0.14); color: var(--att-orange-500); border-color: rgba(194, 65, 12, 0.32); }
[data-theme="light"] .pulse-tile.target .tile-icon { background: rgba(202, 138, 4, 0.14); color: var(--att-yellow-500); border-color: rgba(202, 138, 4, 0.32); }
[data-theme="light"] .pulse-tile.rank .tile-icon   { background: rgba(190, 24, 93, 0.12); color: #9d174d; border-color: rgba(190, 24, 93, 0.32); }
[data-theme="light"] .tile-value { color: var(--hr-text); }
[data-theme="light"] .tile-label { color: var(--hr-text-secondary); }
[data-theme="light"] .tile-foot  { color: var(--hr-text-muted); }

/* ── Location card redesign ──────────────────────────────────────────── */
.location-card {
  grid-template-columns: 96px 1fr;
  grid-template-areas: "head head" "radar body";
  gap: 12px 18px;
}
.location-card[data-blocked="true"] {
  border-color: rgba(251, 146, 60, 0.55) !important;
  box-shadow: 0 0 0 1px rgba(251, 146, 60, 0.32), 0 24px 50px -28px rgba(234, 88, 12, 0.42) !important;
}
[data-theme="light"] .location-card[data-blocked="true"] {
  border-color: rgba(194, 65, 12, 0.55) !important;
  box-shadow: 0 0 0 1px rgba(194, 65, 12, 0.32), 0 24px 50px -28px rgba(194, 65, 12, 0.32) !important;
}
.loc-title {
  display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
  font-size: 14px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.01em;
}
.loc-name { font-size: 14px; }
.loc-country { font-size: 10px; font-weight: 700; letter-spacing: 0.4px; color: var(--hr-text-muted); }
.loc-meta { font-size: 11px; color: var(--hr-text-muted); line-height: 1.45; }
.loc-fence {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 4px;
  padding: 5px 10px;
  border-radius: 10px;
  background: var(--att-teal-soft);
  border: 1px solid var(--att-teal-border-soft);
  color: var(--att-teal-100);
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.2px;
}
.loc-fence.blocked {
  background: rgba(251, 146, 60, 0.16);
  border-color: rgba(251, 146, 60, 0.42);
  color: var(--att-orange-100);
  animation: ssaWarnPulse 2.6s ease-in-out infinite;
}
@keyframes ssaWarnPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 146, 60, 0); }
  50%      { box-shadow: 0 0 0 4px rgba(251, 146, 60, 0.18); }
}
.loc-coords {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9.5px; letter-spacing: 0.4px; color: rgba(255,255,255,0.55);
}
.loc-coords svg { opacity: 0.7; }
.loc-acc { color: var(--att-yellow-200); margin-left: 4px; }
.loc-actions { display: inline-flex; align-items: center; gap: 12px; margin-top: 6px; flex-wrap: wrap; }
.loc-fences-count {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; font-weight: 700; color: var(--hr-text-muted); letter-spacing: 0.2px;
}
[data-theme="light"] .loc-coords { color: var(--hr-text-secondary); }
[data-theme="light"] .loc-acc { color: var(--att-yellow-500); }
[data-theme="light"] .loc-fence { background: rgba(13, 148, 136, 0.14); border-color: rgba(13, 148, 136, 0.34); color: var(--att-teal-500); }
[data-theme="light"] .loc-fence.blocked { background: rgba(194, 65, 12, 0.14); border-color: rgba(194, 65, 12, 0.42); color: var(--att-orange-500); }
[data-theme="light"] .loc-fences-count { color: var(--hr-text-secondary); }

/* ── Break card — clearer bar on both themes ─────────────────────────── */
.bw-bar {
  height: 36px;
  background: linear-gradient(90deg, rgba(20, 184, 166, 0.08), rgba(20, 184, 166, 0.14));
  border: 1px solid rgba(20, 184, 166, 0.26);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}
.bw-used {
  background: linear-gradient(90deg, #fb923c 0%, #f59e0b 60%, #facc15 100%);
  border-right: 2px solid rgba(255, 255, 255, 0.65);
  box-shadow: 0 0 16px rgba(251, 146, 60, 0.5);
  position: relative;
}
.bw-used::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent);
  background-size: 60% 100%; background-repeat: no-repeat;
  animation: bwShimmer 2.4s ease-in-out infinite;
}
@keyframes bwShimmer { 0% { background-position: -100% 0; } 100% { background-position: 200% 0; } }
.bw-cap-text {
  font-size: 14px;
  color: #fff; text-shadow: 0 1px 6px rgba(0, 0, 0, 0.55);
}
[data-theme="light"] .bw-bar {
  background: linear-gradient(90deg, rgba(13, 148, 136, 0.08), rgba(13, 148, 136, 0.14));
  border-color: rgba(13, 148, 136, 0.32);
}
[data-theme="light"] .bw-cap-text { color: #1a1410; text-shadow: 0 1px 3px rgba(255,255,255,0.65); }

/* ── Shift card mini — modernised ───────────────────────────────────── */
.shift-card-mini {
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(94, 234, 212, 0.10), transparent 65%),
    var(--att-glass);
  overflow: hidden;
  position: relative;
}
.shift-card-mini::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
  background: var(--att-gradient-flow);
  background-size: 200% 100%;
  animation: pulseRail 6s linear infinite;
  opacity: 0.55;
}
/* Solid colour first so it never disappears; the shimmer is layered behind
   via a pseudo-element so the gradient text-clip can't black-out the value. */
.sft-times {
  font-size: 20px; font-weight: 800;
  color: var(--att-teal-100);
  text-shadow: 0 1px 8px rgba(20, 184, 166, 0.35);
  letter-spacing: 0.2px;
  -webkit-text-fill-color: var(--att-teal-100);
  background: none;
  animation: none;
}
.sft-times span { color: inherit; }
[data-theme="light"] .sft-times {
  color: var(--att-teal-500);
  -webkit-text-fill-color: var(--att-teal-500);
  text-shadow: 0 1px 8px rgba(13, 148, 136, 0.18);
}

/* ── Journey — modernised cards on the rail ──────────────────────────── */
.journey-event {
  position: relative;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(94, 234, 212, 0.16);
  transition: all 0.3s var(--att-spring);
}
.journey-event:hover { transform: translateX(4px); border-color: rgba(94, 234, 212, 0.45); background: rgba(20, 184, 166, 0.06); }
.journey-event.done { border-color: rgba(94, 234, 212, 0.32); background: rgba(20, 184, 166, 0.04); }
.journey-event.active {
  border-color: rgba(250, 204, 21, 0.55);
  background: rgba(250, 204, 21, 0.10);
  box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.08), 0 12px 30px -16px rgba(250, 204, 21, 0.4);
}
[data-theme="light"] .journey-event { background: rgba(255, 250, 240, 0.55); border-color: rgba(13, 148, 136, 0.22); }
[data-theme="light"] .journey-event:hover { background: rgba(13, 148, 136, 0.08); border-color: rgba(13, 148, 136, 0.42); }
[data-theme="light"] .journey-event.done { background: rgba(13, 148, 136, 0.10); border-color: rgba(13, 148, 136, 0.36); }
[data-theme="light"] .journey-event.active {
  background: rgba(202, 138, 4, 0.12);
  border-color: rgba(202, 138, 4, 0.42);
  box-shadow: 0 0 0 4px rgba(202, 138, 4, 0.06), 0 12px 30px -16px rgba(202, 138, 4, 0.3);
}
.ev-dot {
  width: 36px; height: 36px;
  box-shadow: 0 6px 14px -6px rgba(0, 0, 0, 0.4);
}

/* ── Insights — modernised ──────────────────────────────────────────── */
.insight-stats {
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(94, 234, 212, 0.10), transparent 65%),
    rgba(20, 184, 166, 0.06);
  border: 1px solid rgba(94, 234, 212, 0.32);
  padding: 18px;
}
.ins-value {
  font-size: 28px;
  background: linear-gradient(110deg, var(--att-teal-100), var(--att-yellow-200));
  background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  color: var(--att-teal-100);
  animation: ssaGreetingShimmer 6s ease-in-out infinite;
}
[data-theme="light"] .ins-value {
  background: linear-gradient(110deg, var(--att-teal-500), var(--att-yellow-500));
  background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text;
  color: var(--att-teal-500);
}
.ins-bar { height: 6px; background: rgba(94, 234, 212, 0.10); border-radius: 4px; }
.ins-bar-fill {
  background: linear-gradient(90deg, #14b8a6, #facc15, #fb923c);
  background-size: 200% 100%;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(20, 184, 166, 0.5);
  animation: pulseRail 4s linear infinite;
}

.hist-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(94, 234, 212, 0.16);
  transition: transform 0.32s var(--att-spring), border-color 0.25s, background 0.25s;
}
.hist-card:hover { transform: translateY(-3px) scale(1.04); border-color: rgba(94, 234, 212, 0.55); background: rgba(20, 184, 166, 0.08); box-shadow: 0 12px 24px -10px rgba(20, 184, 166, 0.3); }

/* ── Month grid — ultra-modern with tooltip ──────────────────────────── */
.month-legend { display: inline-flex; gap: 8px; flex-wrap: wrap; }
.legend-chip {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.4px;
  padding: 4px 8px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: var(--hr-text-muted);
  text-transform: uppercase;
}
.legend-chip .legend-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
.legend-chip[data-status="PRESENT"]  { color: var(--att-teal-100); border-color: var(--att-teal-border-soft); background: var(--att-teal-soft); }
.legend-chip[data-status="LATE"]     { color: var(--att-yellow-200); border-color: rgba(250, 204, 21, 0.4); background: rgba(250, 204, 21, 0.14); }
.legend-chip[data-status="ABSENT"]   { color: #fca5a5; border-color: rgba(248, 113, 113, 0.4); background: rgba(248, 113, 113, 0.14); }
.legend-chip[data-status="WFH"]      { color: #7dd3fc; border-color: rgba(125, 211, 252, 0.4); background: rgba(125, 211, 252, 0.14); }
.legend-chip[data-status="HOLIDAY"]  { color: #fde68a; border-color: rgba(253, 224, 71, 0.4); background: rgba(253, 224, 71, 0.14); }
.legend-chip[data-status="WEEK_OFF"] { color: #cbd5e1; border-color: rgba(148, 163, 184, 0.32); background: rgba(148, 163, 184, 0.12); }
[data-theme="light"] .legend-chip[data-status="PRESENT"]  { color: var(--att-teal-500); }
[data-theme="light"] .legend-chip[data-status="LATE"]     { color: var(--att-yellow-500); }
[data-theme="light"] .legend-chip[data-status="ABSENT"]   { color: #b91c1c; }
[data-theme="light"] .legend-chip[data-status="WFH"]      { color: #0369a1; }
[data-theme="light"] .legend-chip[data-status="HOLIDAY"]  { color: #ea580c; }
[data-theme="light"] .legend-chip[data-status="WEEK_OFF"] { color: #475569; }

.month-grid { gap: 8px; }
.m-cell {
  position: relative;
  cursor: pointer;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(94, 234, 212, 0.14);
  transition: transform 0.3s var(--att-spring), border-color 0.2s, box-shadow 0.25s;
}
.m-cell.future { opacity: 0.42; cursor: default; }
.m-cell.today {
  border-color: var(--att-teal-100) !important;
  background: rgba(20, 184, 166, 0.10);
}
.m-today-ring {
  position: absolute; inset: -1px;
  border-radius: 11px;
  border: 2px solid var(--att-teal-100);
  pointer-events: none;
  animation: ssaTodayPulse 2.4s ease-in-out infinite;
}
@keyframes ssaTodayPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(94, 234, 212, 0.45); }
  50%      { box-shadow: 0 0 0 6px rgba(94, 234, 212, 0); }
}
.m-status-bar {
  position: absolute; left: 6px; right: 6px; bottom: 4px;
  height: 3px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.10);
}
.m-cell[data-status="PRESENT"] .m-status-bar  { background: linear-gradient(90deg, #14b8a6, #5eead4); box-shadow: 0 0 6px rgba(20, 184, 166, 0.45); }
.m-cell[data-status="LATE"] .m-status-bar     { background: linear-gradient(90deg, #facc15, #fb923c); box-shadow: 0 0 6px rgba(250, 204, 21, 0.45); }
.m-cell[data-status="ABSENT"] .m-status-bar   { background: linear-gradient(90deg, #f87171, #ef4444); box-shadow: 0 0 6px rgba(248, 113, 113, 0.45); }
.m-cell[data-status="WFH"] .m-status-bar      { background: linear-gradient(90deg, #38bdf8, #7dd3fc); box-shadow: 0 0 6px rgba(125, 211, 252, 0.45); }
.m-cell[data-status="HOLIDAY"] .m-status-bar  { background: linear-gradient(90deg, #fde047, #fb923c); }
.m-cell[data-status="HALF_DAY"] .m-status-bar { background: linear-gradient(90deg, #fb923c, #f97316); }
.m-cell[data-status="FUTURE"] .m-status-bar   { background: rgba(255,255,255,0.06); }
.m-badge {
  position: absolute; top: 3px; right: 4px;
  font-size: 9px; color: var(--att-yellow-200);
  text-shadow: 0 0 6px rgba(250, 204, 21, 0.5);
}

/* Month cell tooltip */
.m-tooltip {
  position: fixed; z-index: 200;
  transform: translate(-50%, -100%);
  min-width: 200px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(8, 14, 18, 0.95);
  border: 1px solid rgba(94, 234, 212, 0.32);
  backdrop-filter: blur(14px);
  box-shadow: 0 20px 40px -16px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(94, 234, 212, 0.10);
  pointer-events: none;
}
.m-tooltip::after {
  content: ''; position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%) rotate(45deg);
  width: 10px; height: 10px;
  background: rgba(8, 14, 18, 0.95);
  border-right: 1px solid rgba(94, 234, 212, 0.32);
  border-bottom: 1px solid rgba(94, 234, 212, 0.32);
}
.tip-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.tip-date { font-size: 12px; font-weight: 800; color: #fff; letter-spacing: -0.01em; }
.tip-rows { display: flex; flex-direction: column; gap: 4px; }
.tip-row {
  display: grid; grid-template-columns: auto 1fr auto; gap: 6px; align-items: center;
  font-size: 11px; color: rgba(255, 255, 255, 0.72);
}
.tip-row svg { color: var(--att-teal-100); }
.tip-row b { font-size: 11px; color: #fff; font-weight: 800; }
.tip-row.warn svg, .tip-row.warn b { color: var(--att-orange-100); }
.tip-row.gold svg, .tip-row.gold b { color: var(--att-yellow-200); }
.tip-row.neutral svg, .tip-row.neutral b { color: var(--hr-text-secondary); }
.tip-fade-enter-active, .tip-fade-leave-active { transition: opacity 0.18s ease, transform 0.2s var(--att-spring); }
.tip-fade-enter-from { opacity: 0; transform: translate(-50%, -90%); }
.tip-fade-leave-to   { opacity: 0; transform: translate(-50%, -100%); }
[data-theme="light"] .m-tooltip {
  background: rgba(255, 250, 240, 0.98);
  border-color: rgba(13, 148, 136, 0.36);
  box-shadow: 0 20px 40px -16px rgba(40, 25, 10, 0.32);
}
[data-theme="light"] .m-tooltip::after { background: rgba(255, 250, 240, 0.98); border-color: rgba(13, 148, 136, 0.36); }
[data-theme="light"] .tip-date { color: #1a1410; }
[data-theme="light"] .tip-row { color: var(--hr-text-secondary); }
[data-theme="light"] .tip-row b { color: var(--hr-text); }
[data-theme="light"] .tip-row svg { color: var(--att-teal-500); }
[data-theme="light"] .tip-row.warn svg, [data-theme="light"] .tip-row.warn b { color: var(--att-orange-500); }
[data-theme="light"] .tip-row.gold svg, [data-theme="light"] .tip-row.gold b { color: var(--att-yellow-500); }

/* ── SSA modal — redesigned with aurora + corners ─────────────────────── */
.ssa-modal-overlay {
  background:
    radial-gradient(80% 60% at 50% 0%, rgba(20, 184, 166, 0.18), transparent 65%),
    radial-gradient(60% 50% at 50% 100%, rgba(251, 146, 60, 0.14), transparent 65%),
    rgba(4, 8, 10, 0.65);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
}
.ssa-modal {
  position: relative;
  max-width: 580px;
  background:
    radial-gradient(120% 60% at 100% 0%, rgba(20, 184, 166, 0.10), transparent 60%),
    radial-gradient(110% 60% at 0% 100%, rgba(251, 146, 60, 0.08), transparent 60%),
    linear-gradient(180deg, rgba(14, 22, 26, 0.88), rgba(8, 14, 18, 0.92));
  border: 1px solid rgba(94, 234, 212, 0.28);
  box-shadow:
    0 36px 90px -24px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(94, 234, 212, 0.10),
    0 0 90px rgba(20, 184, 166, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  overflow: hidden;
  isolation: isolate;
}
.ssa-modal-aurora {
  position: absolute; inset: -20%; z-index: 0; pointer-events: none;
  background:
    radial-gradient(45% 35% at 15% 12%, rgba(20, 184, 166, 0.22), transparent 70%),
    radial-gradient(45% 35% at 85% 88%, rgba(251, 146, 60, 0.16), transparent 70%);
  filter: blur(10px);
  animation: ssaAuroraDrift 16s ease-in-out infinite;
  mix-blend-mode: screen;
  opacity: 0.85;
}
.ssa-modal-aurora.warn {
  background:
    radial-gradient(45% 35% at 15% 12%, rgba(251, 146, 60, 0.24), transparent 70%),
    radial-gradient(45% 35% at 85% 88%, rgba(248, 113, 113, 0.18), transparent 70%);
}
@keyframes ssaAuroraDrift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(3%, -2%) scale(1.06); }
}
.ssa-modal-rail {
  position: absolute; top: 0; left: 0; right: 0; height: 2px; z-index: 4;
  background: linear-gradient(90deg, transparent, #14b8a6 30%, #facc15 50%, #fb923c 70%, transparent);
  background-size: 200% 100%;
  animation: pulseRail 5.5s linear infinite;
}
.ssa-modal-rail.warn {
  background: linear-gradient(90deg, transparent, #fb923c 30%, #f87171 50%, #fb923c 70%, transparent);
  background-size: 200% 100%;
}
.ssa-modal-corner {
  position: absolute; width: 14px; height: 14px; z-index: 4; pointer-events: none;
  border: 1.5px solid rgba(94, 234, 212, 0.55);
  filter: drop-shadow(0 0 6px rgba(20, 184, 166, 0.3));
}
.ssa-modal-corner.warn { border-color: rgba(251, 146, 60, 0.6); filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.35)); }
.ssa-modal-corner.tl { top: 10px; left: 10px; border-right: 0; border-bottom: 0; }
.ssa-modal-corner.tr { top: 10px; right: 10px; border-left: 0; border-bottom: 0; }
.ssa-modal-corner.bl { bottom: 10px; left: 10px; border-right: 0; border-top: 0; }
.ssa-modal-corner.br { bottom: 10px; right: 10px; border-left: 0; border-top: 0; }
.ssa-modal-head, .ssa-modal-body, .ssa-modal-foot { position: relative; z-index: 2; }
.ssa-modal-head { padding: 22px 26px 16px; align-items: flex-start; }
.modal-head-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
.ssa-modal-head h3 {
  position: relative;
  margin: 4px 0 0;
  font-size: 21px;
  overflow: hidden;
}
.title-text { position: relative; z-index: 1; }
.title-sheen {
  position: absolute; top: 0; bottom: 0; left: -30%; width: 30%;
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.22) 50%, transparent 70%);
  animation: titleSheen 5s ease-in-out infinite;
  pointer-events: none;
  z-index: 2;
}
@keyframes titleSheen {
  0%, 60% { transform: translateX(0); opacity: 0; }
  68%     { opacity: 1; }
  100%    { transform: translateX(700%); opacity: 0; }
}
.modal-blurb { margin: 6px 0 0; font-size: 12px; color: var(--hr-text-muted); line-height: 1.55; }
.ssa-modal-body { padding: 18px 26px 22px; gap: 14px; }
.ssa-field { display: flex; flex-direction: column; gap: 6px; }
.ssa-field-label {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;
  color: var(--att-teal-100);
}
.ssa-field-label svg { color: var(--att-teal-100); }
.ssa-modal-foot {
  padding: 16px 26px 20px;
  border-top: 1px dashed rgba(94, 234, 212, 0.20);
  background: linear-gradient(180deg, rgba(8, 14, 18, 0.45), rgba(8, 14, 18, 0.75));
}
.modal-cta {
  background: linear-gradient(135deg, #14b8a6, #0d9488 60%, #0f766e);
  border: 1px solid rgba(94, 234, 212, 0.5);
  color: #fff;
  font-weight: 800;
  box-shadow: 0 12px 28px -10px rgba(20, 184, 166, 0.55);
}
.modal-cta:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
.ssa-modal-enter-active, .ssa-modal-leave-active { transition: opacity 0.3s ease, backdrop-filter 0.3s; }
.ssa-modal-enter-from, .ssa-modal-leave-to { opacity: 0; }

[data-theme="light"] .ssa-modal-overlay {
  background:
    radial-gradient(80% 60% at 50% 0%, rgba(13, 148, 136, 0.20), transparent 65%),
    radial-gradient(60% 50% at 50% 100%, rgba(234, 88, 12, 0.14), transparent 65%),
    rgba(40, 25, 10, 0.35);
}
[data-theme="light"] .ssa-modal {
  background:
    radial-gradient(120% 60% at 100% 0%, rgba(13, 148, 136, 0.12), transparent 60%),
    radial-gradient(110% 60% at 0% 100%, rgba(234, 88, 12, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.96), rgba(255, 246, 232, 0.92));
  border-color: rgba(13, 148, 136, 0.35);
  box-shadow:
    0 36px 90px -24px rgba(40, 25, 10, 0.40),
    0 0 0 1px rgba(13, 148, 136, 0.18),
    0 0 90px rgba(13, 148, 136, 0.16);
}
[data-theme="light"] .ssa-modal-corner { border-color: rgba(13, 148, 136, 0.6); }
[data-theme="light"] .ssa-modal-corner.warn { border-color: rgba(194, 65, 12, 0.6); }
[data-theme="light"] .ssa-modal-head h3 { color: #1a1410; }
[data-theme="light"] .modal-blurb { color: var(--hr-text-secondary); }
[data-theme="light"] .ssa-field-label, [data-theme="light"] .ssa-field-label svg { color: var(--att-teal-500); }
[data-theme="light"] .ssa-modal-foot { background: linear-gradient(180deg, rgba(255, 244, 220, 0.4), rgba(255, 244, 220, 0.75)); border-top-color: rgba(13, 148, 136, 0.24); }

/* ── Quick-action buttons modernised ─────────────────────────────────── */
.qa-btn {
  position: relative; overflow: hidden;
  transition: transform 0.32s var(--att-spring), border-color 0.25s, box-shadow 0.25s;
}
.qa-btn::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(94, 234, 212, 0.08), transparent 60%);
  pointer-events: none; opacity: 0; transition: opacity 0.25s;
}
.qa-btn:hover::after { opacity: 1; }
.qa-btn:hover { border-color: rgba(94, 234, 212, 0.55); box-shadow: 0 14px 28px -14px rgba(20, 184, 166, 0.35); }
[data-theme="light"] .qa-btn:hover { border-color: rgba(13, 148, 136, 0.55); box-shadow: 0 14px 28px -14px rgba(13, 148, 136, 0.22); }

/* ═════════════════════════════════════════════════════════════════════════
   ROUND 2 — visibility + workflow polish + new components
   ═════════════════════════════════════════════════════════════════════════ */

/* ── Kill horizontal scroll on the page ──────────────────────────────── */
.ssa-page { overflow-x: hidden; }
.ssa-page > * { min-width: 0; max-width: 100%; }

/* ── Shift card mini — labelled START/END blocks ─────────────────────── */
.shift-card-mini { gap: 12px; }
.sft-times {
  display: flex !important;
  align-items: stretch;
  gap: 10px;
}
.sft-time-block {
  flex: 1; display: flex; flex-direction: column; gap: 2px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(20, 184, 166, 0.10);
  border: 1px solid rgba(94, 234, 212, 0.32);
  min-width: 0;
}
.sft-time-label {
  font-family: var(--hr-mono);
  font-size: 9px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;
  color: var(--att-teal-100);
  -webkit-text-fill-color: var(--att-teal-100);
}
.sft-time-value {
  font-family: var(--hr-mono);
  font-size: 22px; font-weight: 800;
  color: #fff; letter-spacing: 0.4px;
  -webkit-text-fill-color: #fff;
  font-variant-numeric: tabular-nums;
}
.sft-arrow {
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  width: 28px;
  color: var(--att-yellow-200);
  -webkit-text-fill-color: var(--att-yellow-200);
}
.sft-arrow svg { animation: ssaArrowSlide 2.4s ease-in-out infinite; }
@keyframes ssaArrowSlide {
  0%, 100% { transform: translateX(0); opacity: 0.6; }
  50%      { transform: translateX(3px); opacity: 1; }
}
[data-theme="light"] .sft-time-block { background: rgba(13, 148, 136, 0.10); border-color: rgba(13, 148, 136, 0.34); }
[data-theme="light"] .sft-time-label { color: var(--att-teal-500); -webkit-text-fill-color: var(--att-teal-500); }
[data-theme="light"] .sft-time-value { color: #1a1410; -webkit-text-fill-color: #1a1410; }
[data-theme="light"] .sft-arrow { color: var(--att-yellow-500); -webkit-text-fill-color: var(--att-yellow-500); }

.sft-overtime {
  position: relative;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.18), rgba(248, 113, 113, 0.14));
  border: 1px solid rgba(251, 146, 60, 0.42);
  color: var(--att-orange-100);
  font-size: 11px; font-weight: 700; letter-spacing: 0.3px;
  align-self: flex-start;
}
.sft-overtime .ovt-pulse {
  width: 6px; height: 6px; border-radius: 50%;
  background: #fb923c;
  box-shadow: 0 0 8px #fb923c;
  animation: att-live-pulse 1.6s ease-in-out infinite;
}
.ovt-value { font-family: var(--hr-mono); font-size: 12px; font-weight: 800; }
[data-theme="light"] .sft-overtime { background: linear-gradient(135deg, rgba(234, 88, 12, 0.16), rgba(239, 68, 68, 0.10)); border-color: rgba(194, 65, 12, 0.42); color: var(--att-orange-500); }

.sft-meta-chip {
  position: relative;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.10);
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.2px;
  color: var(--hr-text-secondary);
  cursor: help;
  transition: border-color .2s, background .2s;
}
.sft-meta-chip:hover { border-color: rgba(94, 234, 212, 0.42); background: rgba(20, 184, 166, 0.08); color: var(--att-teal-100); }
.sft-meta-chip .meta-info { opacity: 0.55; }
.sft-meta-chip:hover .meta-info { opacity: 1; }
[data-theme="light"] .sft-meta-chip { background: rgba(13, 148, 136, 0.06); border-color: rgba(13, 148, 136, 0.20); color: var(--hr-text-secondary); }
[data-theme="light"] .sft-meta-chip:hover { background: rgba(13, 148, 136, 0.14); border-color: rgba(13, 148, 136, 0.42); color: var(--att-teal-500); }

/* ── Break bar — yellow fill that grows with consumption ─────────────── */
.bw-used {
  background: linear-gradient(90deg, #facc15 0%, #fde047 60%, #fef08a 100%) !important;
  border-right: 2px solid rgba(255, 255, 255, 0.7) !important;
  box-shadow: 0 0 16px rgba(234, 179, 8, 0.55) !important;
}
[data-theme="light"] .bw-used {
  background: linear-gradient(90deg, #ca8a04 0%, #eab308 60%, #facc15 100%) !important;
  border-right-color: rgba(255, 255, 255, 0.75) !important;
  box-shadow: 0 0 16px rgba(202, 138, 4, 0.42) !important;
}

/* ── My Requests panel — surfaces approval / rejection status ────────── */
.myreq-panel {
  position: relative;
  padding: 16px 18px;
  border-radius: 18px;
  background:
    radial-gradient(120% 60% at 0% 0%, rgba(20, 184, 166, 0.10), transparent 65%),
    var(--att-glass);
  border: 1px solid rgba(94, 234, 212, 0.22);
  backdrop-filter: var(--att-glass-blur);
  box-shadow: 0 20px 50px -28px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}
.myreq-panel::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, #5eead4, #facc15, #fb923c, transparent);
  background-size: 200% 100%;
  animation: pulseRail 5s linear infinite;
}
.myreq-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.myreq-head .head-meta { margin-left: auto; }
.myreq-refresh {
  display: inline-grid; place-items: center; width: 24px; height: 24px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(94, 234, 212, 0.22);
  color: var(--att-teal-100);
  cursor: pointer;
  transition: all 0.2s var(--att-spring);
}
.myreq-refresh:hover:not(:disabled) { background: rgba(20, 184, 166, 0.12); transform: rotate(120deg); }
.myreq-refresh:disabled { opacity: 0.6; cursor: not-allowed; }
.myreq-refresh .spin { animation: spinIt 1s linear infinite; }
@keyframes spinIt { to { transform: rotate(360deg); } }

.myreq-empty {
  display: flex; align-items: center; gap: 8px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(94, 234, 212, 0.22);
  border-radius: 12px;
  font-size: 11.5px; color: var(--hr-text-muted);
}
.myreq-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.myreq-item {
  display: grid; grid-template-columns: 32px 1fr; gap: 12px; align-items: flex-start;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(94, 234, 212, 0.16);
  transition: border-color .25s, background .25s;
}
.myreq-item.tone-good    { border-color: rgba(94, 234, 212, 0.42); background: rgba(20, 184, 166, 0.08); }
.myreq-item.tone-bad     { border-color: rgba(248, 113, 113, 0.45); background: rgba(248, 113, 113, 0.06); }
.myreq-item.tone-pending { border-color: rgba(250, 204, 21, 0.42); background: rgba(250, 204, 21, 0.06); }
.myreq-icon {
  display: inline-grid; place-items: center;
  width: 32px; height: 32px; border-radius: 10px;
  background: rgba(94, 234, 212, 0.14); color: var(--att-teal-100);
  border: 1px solid rgba(94, 234, 212, 0.32);
}
.myreq-item.tone-bad .myreq-icon { background: rgba(248, 113, 113, 0.14); color: #fca5a5; border-color: rgba(248, 113, 113, 0.32); }
.myreq-item.tone-pending .myreq-icon { background: rgba(250, 204, 21, 0.14); color: var(--att-yellow-200); border-color: rgba(250, 204, 21, 0.32); }
.myreq-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.myreq-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.myreq-title { font-size: 12.5px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.005em; }
.myreq-status {
  margin-left: auto;
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.8px;
  background: rgba(250, 204, 21, 0.14); color: var(--att-yellow-200); border: 1px solid rgba(250, 204, 21, 0.32);
}
.myreq-status[data-tone="good"] { background: var(--att-teal-soft); color: var(--att-teal-100); border-color: var(--att-teal-border-soft); }
.myreq-status[data-tone="bad"]  { background: rgba(248, 113, 113, 0.14); color: #fca5a5; border-color: rgba(248, 113, 113, 0.32); }
.myreq-status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
.myreq-meta { display: flex; gap: 10px; font-size: 10.5px; color: var(--hr-text-muted); flex-wrap: wrap; }
.myreq-meta span { display: inline-flex; align-items: center; gap: 4px; }
.myreq-reason { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block !important; flex: 1; min-width: 0; }
.myreq-rejection {
  display: flex; align-items: center; gap: 6px;
  margin-top: 4px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(248, 113, 113, 0.10);
  border: 1px solid rgba(248, 113, 113, 0.32);
  font-size: 10.5px; color: #fca5a5; line-height: 1.4;
}

[data-theme="light"] .myreq-panel { background: radial-gradient(120% 60% at 0% 0%, rgba(13, 148, 136, 0.12), transparent 65%), rgba(255, 250, 240, 0.85); border-color: rgba(13, 148, 136, 0.32); }
[data-theme="light"] .myreq-refresh { background: rgba(13, 148, 136, 0.08); border-color: rgba(13, 148, 136, 0.32); color: var(--att-teal-500); }
[data-theme="light"] .myreq-refresh:hover:not(:disabled) { background: rgba(13, 148, 136, 0.16); }
/* ── My-requests pager — caps the panel at 3 rows so heavy users don't blow
   out the page layout ─────────────────────────────────────────────────── */
.myreq-pager {
  display: flex; align-items: center; gap: 10px;
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(8, 14, 18, 0.55);
  border: 1px solid rgba(20, 184, 166, 0.18);
}
.pager-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border-radius: 8px;
  background: rgba(20, 184, 166, 0.12);
  border: 1px solid rgba(20, 184, 166, 0.30);
  color: var(--att-teal-100);
  cursor: pointer;
  transition: background .18s, border-color .18s, transform .18s var(--att-spring);
}
.pager-btn:hover:not(:disabled) {
  background: rgba(20, 184, 166, 0.22);
  border-color: rgba(20, 184, 166, 0.55);
  transform: translateY(-1px);
}
.pager-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pager-meta {
  display: inline-flex; align-items: baseline; gap: 4px;
  font-size: 10.5px;
  color: var(--hr-text-muted);
  flex: 1;
}
.pager-range { color: var(--hr-text); font-weight: 800; font-size: 12px; }
.pager-of { font-size: 10px; letter-spacing: 0.4px; text-transform: uppercase; }
.pager-total { color: var(--att-teal-100); font-weight: 800; font-size: 12px; }
.pager-dots {
  display: inline-flex; align-items: center; gap: 5px;
}
.pager-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.30);
  border: 0;
  padding: 0;
  cursor: pointer;
  transition: background .2s var(--att-spring), transform .2s var(--att-spring), width .2s;
}
.pager-dot:hover { background: rgba(94, 234, 212, 0.55); transform: scale(1.2); }
.pager-dot.active {
  width: 22px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--att-teal-200), var(--att-teal-300));
  box-shadow: 0 0 8px rgba(20, 184, 166, 0.55);
}

[data-theme="light"] .myreq-pager {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(13, 148, 136, 0.30);
}
[data-theme="light"] .pager-btn {
  background: rgba(13, 148, 136, 0.10);
  border-color: rgba(13, 148, 136, 0.34);
  color: var(--att-teal-500);
}
[data-theme="light"] .pager-btn:hover:not(:disabled) {
  background: rgba(13, 148, 136, 0.18);
  border-color: rgba(13, 148, 136, 0.55);
}
[data-theme="light"] .pager-range { color: var(--hr-text); }
[data-theme="light"] .pager-total { color: var(--att-teal-500); }
[data-theme="light"] .pager-dot { background: rgba(180, 83, 9, 0.22); }
[data-theme="light"] .pager-dot.active {
  background: linear-gradient(90deg, var(--att-teal-400), var(--att-teal-500));
  box-shadow: 0 0 8px rgba(13, 148, 136, 0.45);
}

[data-theme="light"] .myreq-empty { border-color: rgba(13, 148, 136, 0.30); color: var(--hr-text-secondary); background: rgba(13, 148, 136, 0.05); }
[data-theme="light"] .myreq-item { background: rgba(255, 250, 240, 0.65); border-color: rgba(13, 148, 136, 0.22); }
[data-theme="light"] .myreq-item.tone-good    { border-color: rgba(13, 148, 136, 0.45); background: rgba(13, 148, 136, 0.10); }
[data-theme="light"] .myreq-item.tone-bad     { border-color: rgba(220, 38, 38, 0.45); background: rgba(220, 38, 38, 0.06); }
[data-theme="light"] .myreq-item.tone-pending { border-color: rgba(202, 138, 4, 0.45); background: rgba(202, 138, 4, 0.06); }
[data-theme="light"] .myreq-icon { background: rgba(13, 148, 136, 0.14); color: var(--att-teal-500); border-color: rgba(13, 148, 136, 0.32); }
[data-theme="light"] .myreq-item.tone-bad .myreq-icon { background: rgba(220, 38, 38, 0.14); color: #b91c1c; border-color: rgba(220, 38, 38, 0.32); }
[data-theme="light"] .myreq-item.tone-pending .myreq-icon { background: rgba(202, 138, 4, 0.14); color: var(--att-yellow-500); border-color: rgba(202, 138, 4, 0.32); }
[data-theme="light"] .myreq-title { color: var(--hr-text); }
[data-theme="light"] .myreq-status[data-tone="good"] { background: rgba(13, 148, 136, 0.14); color: var(--att-teal-500); border-color: rgba(13, 148, 136, 0.32); }
[data-theme="light"] .myreq-status[data-tone="bad"]  { background: rgba(220, 38, 38, 0.12); color: #b91c1c; border-color: rgba(220, 38, 38, 0.32); }
[data-theme="light"] .myreq-status[data-tone="pending"] { background: rgba(202, 138, 4, 0.12); color: var(--att-yellow-500); border-color: rgba(202, 138, 4, 0.32); }
[data-theme="light"] .myreq-meta { color: var(--hr-text-muted); }
[data-theme="light"] .myreq-rejection { background: rgba(220, 38, 38, 0.08); border-color: rgba(220, 38, 38, 0.32); color: #b91c1c; }

/* ── Modal — even more advanced: orbiting halo, layered glass, magnetic
       hover on close, motion sequence on the title ──────────────────── */
.ssa-modal {
  max-width: 620px;
  border-radius: 24px;
  padding: 0;
}
.ssa-modal::before {
  content: ''; position: absolute; inset: -1px;
  border-radius: 24px;
  padding: 1px;
  background: conic-gradient(from 0deg, transparent 0%, rgba(94, 234, 212, 0.55) 18%, transparent 36%, transparent 50%, rgba(251, 146, 60, 0.55) 68%, transparent 86%, transparent 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  animation: ssaModalSpin 14s linear infinite;
  pointer-events: none;
  z-index: 0;
}
@keyframes ssaModalSpin { to { transform: rotate(360deg); } }
.ssa-modal-head h3 { font-size: 23px; letter-spacing: -0.02em; }
.modal-eyebrow {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(20, 184, 166, 0.10);
  border: 1px solid rgba(94, 234, 212, 0.32);
  color: var(--att-teal-100);
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.4px;
}
.modal-eyebrow.warn { background: rgba(251, 146, 60, 0.10); border-color: rgba(251, 146, 60, 0.32); color: var(--att-orange-100); }
[data-theme="light"] .modal-eyebrow { background: rgba(13, 148, 136, 0.10); border-color: rgba(13, 148, 136, 0.34); color: var(--att-teal-500); }
[data-theme="light"] .modal-eyebrow.warn { background: rgba(194, 65, 12, 0.10); border-color: rgba(194, 65, 12, 0.34); color: var(--att-orange-500); }

.icon-btn {
  position: relative;
  width: 36px; height: 36px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: var(--hr-text-muted);
  cursor: pointer;
  transition: all 0.3s var(--att-spring);
}
.icon-btn:hover { background: rgba(248, 113, 113, 0.16); border-color: rgba(248, 113, 113, 0.42); color: #fca5a5; transform: rotate(90deg) scale(1.06); box-shadow: 0 6px 18px -8px rgba(248, 113, 113, 0.5); }
[data-theme="light"] .icon-btn { background: rgba(40, 25, 10, 0.05); border-color: rgba(40, 25, 10, 0.10); color: var(--hr-text-secondary); }
[data-theme="light"] .icon-btn:hover { background: rgba(220, 38, 38, 0.10); border-color: rgba(220, 38, 38, 0.32); color: #b91c1c; }

/* Modal field labels — keep them gold/teal so they pop on glass */
.ssa-field-label {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(94, 234, 212, 0.08);
  border: 1px solid rgba(94, 234, 212, 0.22);
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.2px;
  color: var(--att-teal-100);
  width: fit-content;
}
.ssa-field-label svg { color: var(--att-teal-100); }
[data-theme="light"] .ssa-field-label { background: rgba(13, 148, 136, 0.10); border-color: rgba(13, 148, 136, 0.32); color: var(--att-teal-500); }
[data-theme="light"] .ssa-field-label svg { color: var(--att-teal-500); }

/* CTA — animated gradient with shine */
.modal-cta {
  position: relative; overflow: hidden;
  padding: 12px 22px;
  border-radius: 12px;
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%);
  background-size: 200% 200%;
  animation: modalCtaFlow 6s linear infinite;
  border: 1px solid rgba(94, 234, 212, 0.55);
  color: #fff;
  font-weight: 800;
  letter-spacing: 0.3px;
  box-shadow: 0 14px 30px -10px rgba(20, 184, 166, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.15);
}
@keyframes modalCtaFlow { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
.modal-cta::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.22) 50%, transparent 70%);
  background-size: 200% 100%; background-position: -100% 0;
  animation: modalCtaSheen 3.6s ease-in-out infinite;
  pointer-events: none;
}
@keyframes modalCtaSheen {
  0%, 60% { background-position: -100% 0; }
  100%    { background-position: 200% 0; }
}
.modal-cta:disabled { opacity: 0.5; cursor: not-allowed; animation: none; box-shadow: none; }
.modal-cta:disabled::before { display: none; }
[data-theme="light"] .modal-cta { background: linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #134e4a 100%); }

/* Tweaks for the modal aurora to look richer */
.ssa-modal-aurora {
  background:
    radial-gradient(45% 35% at 12% 10%, rgba(20, 184, 166, 0.28), transparent 70%),
    radial-gradient(45% 35% at 88% 90%, rgba(251, 146, 60, 0.20), transparent 70%),
    radial-gradient(40% 32% at 50% 50%, rgba(250, 204, 21, 0.10), transparent 70%);
}

/* ═════════════════════════════════════════════════════════════════════════
   ROUND 3 — horizontal scroll kill, break countdown, modal at Edoc level
   ═════════════════════════════════════════════════════════════════════════ */

/* ── Brutal horizontal scroll kill ──────────────────────────────────── */
.ssa-page { overflow-x: clip; }
.ssa-page > section,
.ssa-page > .action-deck,
.ssa-page > .journey,
.ssa-page > .insights,
.ssa-page > .month,
.ssa-page > .quick-row { min-width: 0; max-width: 100%; }
.action-deck, .deck-primary, .deck-rail,
.pulse-panel, .myreq-panel, .rail-card,
.ssa-hero, .journey, .insights, .month { min-width: 0; }
.pulse-grid, .form-grid, .ssa-field-row { min-width: 0; }
.pulse-tile, .myreq-item, .ssa-field { min-width: 0; }
.hero-stats, .punch-pair { min-width: 0; }
.hero-stat, .punch-btn { min-width: 0; }
.history-tape, .quick-row { min-width: 0; }
.hist-card, .qa-btn { min-width: 0; }
.month-legend { flex-wrap: wrap; max-width: 100%; }
.bd-aurora-a, .bd-aurora-b, .bd-aurora-c { will-change: transform; }
.ssa-backdrop { contain: layout paint; }

/* ── Yellow break-window bar — guaranteed visible ───────────────────── */
.break-card .bw-bar {
  height: 40px !important;
  background: linear-gradient(90deg, rgba(202, 138, 4, 0.06), rgba(202, 138, 4, 0.14)) !important;
  border: 1.5px solid rgba(250, 204, 21, 0.42) !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  position: relative !important;
}
.break-card .bw-used {
  background: linear-gradient(90deg, #fde047 0%, #facc15 35%, #f59e0b 75%, #fb923c 100%) !important;
  background-size: 200% 100% !important;
  animation: bwFlow 4s ease-in-out infinite !important;
  border-right: 3px solid #fff !important;
  box-shadow:
    0 0 18px rgba(250, 204, 21, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.45),
    inset 0 -2px 6px rgba(180, 83, 9, 0.30) !important;
  min-width: 4px !important;
}
@keyframes bwFlow { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
[data-theme="light"] .break-card .bw-bar {
  background: linear-gradient(90deg, rgba(202, 138, 4, 0.08), rgba(202, 138, 4, 0.20)) !important;
  border-color: rgba(180, 83, 9, 0.42) !important;
}
[data-theme="light"] .break-card .bw-used {
  background: linear-gradient(90deg, #facc15 0%, #f59e0b 40%, #d97706 80%, #b45309 100%) !important;
  background-size: 200% 100% !important;
  box-shadow:
    0 0 16px rgba(202, 138, 4, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 -2px 6px rgba(120, 53, 15, 0.32) !important;
}
.break-card .bw-cap-text {
  font-size: 14px !important;
  font-weight: 800;
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.55), 0 0 12px rgba(0, 0, 0, 0.3) !important;
}
[data-theme="light"] .break-card .bw-cap-text {
  color: #1a1410 !important;
  -webkit-text-fill-color: #1a1410 !important;
  text-shadow: 0 1px 4px rgba(255, 255, 255, 0.8) !important;
}

/* ── Break Active Stack — replaces the simple END BREAK button ──────── */
.break-active-stack { width: 100%; }
.break-timer-card {
  position: relative;
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 22px;
  padding: 22px 24px;
  border-radius: 22px;
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(250, 204, 21, 0.18), transparent 60%),
    radial-gradient(110% 80% at 100% 100%, rgba(251, 146, 60, 0.16), transparent 60%),
    linear-gradient(180deg, rgba(22, 18, 14, 0.78), rgba(16, 14, 10, 0.86));
  border: 1px solid rgba(250, 204, 21, 0.40);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  box-shadow:
    0 28px 60px -22px rgba(202, 138, 4, 0.45),
    0 0 0 1px rgba(250, 204, 21, 0.18) inset,
    0 0 60px rgba(251, 146, 60, 0.20);
  overflow: hidden;
  isolation: isolate;
}
.break-timer-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; z-index: 4;
  background: linear-gradient(90deg, transparent, #fde047, #facc15, #fb923c, transparent);
  background-size: 200% 100%;
  animation: pulseRail 4.5s linear infinite;
}
@media (max-width: 720px) { .break-timer-card { grid-template-columns: 1fr; gap: 16px; justify-items: center; text-align: center; } }
[data-theme="light"] .break-timer-card {
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(202, 138, 4, 0.20), transparent 60%),
    radial-gradient(110% 80% at 100% 100%, rgba(234, 88, 12, 0.18), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 220, 0.88));
  border-color: rgba(180, 83, 9, 0.40);
  box-shadow:
    0 28px 60px -22px rgba(180, 83, 9, 0.32),
    0 0 0 1px rgba(202, 138, 4, 0.22) inset,
    0 0 60px rgba(234, 88, 12, 0.16);
}

.bt-atmos { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.bt-aurora-a, .bt-aurora-b {
  position: absolute; border-radius: 50%;
  filter: blur(60px); opacity: 0.55;
  animation: btAuroraDrift 14s ease-in-out infinite;
}
.bt-aurora-a {
  top: -30%; left: -20%; width: 380px; height: 380px;
  background: radial-gradient(circle, rgba(252, 211, 77, 0.55), transparent 65%);
}
.bt-aurora-b {
  bottom: -30%; right: -10%; width: 360px; height: 360px;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.45), transparent 65%);
  animation-delay: 4s;
}
@keyframes btAuroraDrift {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50%      { transform: translate3d(5%, -3%, 0) scale(1.08); }
}
.bt-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(252, 211, 77, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(252, 211, 77, 0.06) 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: radial-gradient(80% 80% at 50% 50%, #000 30%, transparent 90%);
  -webkit-mask-image: radial-gradient(80% 80% at 50% 50%, #000 30%, transparent 90%);
}

.bt-ring-wrap {
  position: relative;
  width: 180px; height: 180px;
  display: grid; place-items: center;
  z-index: 2;
}
.bt-ring { width: 100%; height: 100%; filter: drop-shadow(0 8px 30px rgba(250, 204, 21, 0.35)); }
.bt-ring-bg { fill: none; stroke: rgba(252, 211, 77, 0.12); stroke-width: 5; }
.bt-ring-fill {
  fill: none; stroke: url(#btRingGrad); stroke-width: 7; stroke-linecap: round;
  transition: stroke-dashoffset 0.9s cubic-bezier(0.83, 0, 0.17, 1);
}
.bt-ring-glow { fill: none; stroke: url(#btRingGrad); stroke-width: 11; stroke-linecap: round; opacity: 0.5;
  transition: stroke-dashoffset 0.9s cubic-bezier(0.83, 0, 0.17, 1); }
.bt-tick-marks { opacity: 0.55; }

.bt-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  pointer-events: none;
}
.bt-eyebrow {
  font-family: var(--hr-mono);
  font-size: 9px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase;
  color: #fde047;
  -webkit-text-fill-color: #fde047;
}
.bt-time {
  font-family: var(--hr-mono);
  font-size: 32px; font-weight: 800; letter-spacing: -0.02em;
  color: #fff;
  -webkit-text-fill-color: #fff;
  text-shadow: 0 0 14px rgba(252, 211, 77, 0.55);
  font-variant-numeric: tabular-nums;
}
.bt-sub { font-size: 10px; color: rgba(255, 255, 255, 0.7); max-width: 130px; text-align: center; line-height: 1.4; }
[data-theme="light"] .bt-eyebrow { color: #b45309; -webkit-text-fill-color: #b45309; }
[data-theme="light"] .bt-time { color: #1a1410; -webkit-text-fill-color: #1a1410; text-shadow: 0 0 12px rgba(202, 138, 4, 0.35); }
[data-theme="light"] .bt-sub { color: #6b5840; }
[data-theme="light"] .bt-ring-bg { stroke: rgba(180, 83, 9, 0.14); }

/* Orbiting dust */
.bt-orbit {
  position: absolute; top: 50%; left: 50%;
  width: 5px; height: 5px; border-radius: 50%;
  background: #fde047;
  box-shadow: 0 0 10px #fde047;
  margin: -2.5px 0 0 -2.5px;
}
.bt-orbit-1 { animation: btOrbit 6s linear infinite; }
.bt-orbit-2 { animation: btOrbit 8s linear infinite reverse; background: #fb923c; box-shadow: 0 0 10px #fb923c; }
.bt-orbit-3 { animation: btOrbit 10s linear infinite; background: #fff; box-shadow: 0 0 8px #fff; }
@keyframes btOrbit {
  0%   { transform: rotate(0deg) translateX(96px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(96px) rotate(-360deg); }
}

.bt-info {
  z-index: 2;
  display: flex; flex-direction: column; gap: 10px;
  justify-content: center;
  min-width: 0;
}
.bt-status-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  background: rgba(252, 211, 77, 0.14);
  border: 1px solid rgba(252, 211, 77, 0.42);
  color: #fde047;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.4px;
  width: fit-content;
}
[data-theme="light"] .bt-status-eyebrow { background: rgba(202, 138, 4, 0.14); border-color: rgba(180, 83, 9, 0.42); color: #b45309; }

.bt-progress-row { display: flex; align-items: center; gap: 12px; }
.bt-bar {
  position: relative; flex: 1;
  height: 12px; border-radius: 6px;
  background: rgba(252, 211, 77, 0.08);
  border: 1px solid rgba(252, 211, 77, 0.28);
  overflow: hidden;
}
.bt-bar-used {
  position: relative;
  height: 100%;
  background: linear-gradient(90deg, #fde047, #facc15 50%, #fb923c);
  background-size: 200% 100%;
  animation: bwFlow 3s ease-in-out infinite;
  box-shadow: 0 0 14px rgba(250, 204, 21, 0.6);
  transition: width 0.6s cubic-bezier(0.83, 0, 0.17, 1);
}
.bt-bar-shine {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  background-size: 50% 100%; background-repeat: no-repeat;
  animation: bwShimmer 2s ease-in-out infinite;
}
.bt-bar-over {
  position: absolute; inset: 0;
  background: repeating-linear-gradient(45deg, rgba(220, 38, 38, 0.55) 0 6px, transparent 6px 12px);
  animation: btOverPulse 1.2s ease-in-out infinite;
}
@keyframes btOverPulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
.bt-bar-label {
  font-size: 12px; color: rgba(255, 255, 255, 0.85); white-space: nowrap;
}
.bt-bar-label b { font-weight: 800; color: #fff; font-size: 14px; }
.bt-bar-sep { opacity: 0.5; margin: 0 2px; }
.bt-bar-unit { font-size: 9.5px; letter-spacing: 0.6px; text-transform: uppercase; opacity: 0.6; margin-left: 4px; }
[data-theme="light"] .bt-bar { background: rgba(202, 138, 4, 0.10); border-color: rgba(180, 83, 9, 0.32); }
[data-theme="light"] .bt-bar-label { color: #44362a; }
[data-theme="light"] .bt-bar-label b { color: #1a1410; }

.bt-hint { margin: 0; font-size: 11.5px; color: rgba(255, 255, 255, 0.65); line-height: 1.5; }
[data-theme="light"] .bt-hint { color: #6b5840; }

.bt-end-btn {
  position: relative; overflow: hidden;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 18px;
  border: 1px solid rgba(252, 211, 77, 0.55);
  border-radius: 12px;
  background: linear-gradient(135deg, #fde047 0%, #facc15 50%, #fb923c 100%);
  color: #1a1100;
  font: inherit; font-weight: 800; font-size: 12.5px; letter-spacing: 0.3px;
  cursor: pointer;
  align-self: flex-start;
  box-shadow: 0 14px 30px -10px rgba(250, 204, 21, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  z-index: 2;
}
.bt-end-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.bt-end-aura {
  position: absolute; inset: -30%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.6), transparent 60%);
  animation: ssaAura 4s ease-in-out infinite;
  pointer-events: none;
}
.bt-end-icon { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; background: rgba(26, 17, 0, 0.18); }
.bt-end-arrow { display: inline-grid; place-items: center; transition: transform 0.25s var(--att-spring); }
.bt-end-btn:hover:not(:disabled) .bt-end-arrow { transform: translateX(4px); }

/* ── SSA modal — EdocModal-grade polish ─────────────────────────────── */
.ssa-modal {
  padding: 0 0 4px;
}
.ssa-modal-head { padding: 24px 28px 16px; }
.ssa-modal-body { padding: 8px 28px 22px; gap: 14px; }
.ssa-modal-foot { padding: 16px 28px 22px; }

.ssa-stagger { display: flex; flex-direction: column; gap: 14px; }
.ssa-stagger > * { animation: ssaRiseIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
.ssa-stagger > *:nth-child(1) { animation-delay: 0.06s; }
.ssa-stagger > *:nth-child(2) { animation-delay: 0.13s; }
.ssa-stagger > *:nth-child(3) { animation-delay: 0.20s; }
.ssa-stagger > *:nth-child(4) { animation-delay: 0.27s; }
.ssa-stagger > *:nth-child(5) { animation-delay: 0.34s; }
@keyframes ssaRiseIn {
  from { opacity: 0; transform: translateY(10px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0); filter: blur(0); }
}
@media (prefers-reduced-motion: reduce) { .ssa-stagger > * { animation: none; } }

.ssa-modal-foot .onb-btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(94, 234, 212, 0.22);
  color: var(--hr-text);
  font: inherit; font-weight: 700; font-size: 13px;
  cursor: pointer;
  transition: all 0.25s var(--att-spring);
}
.ssa-modal-foot .onb-btn-ghost:hover {
  background: rgba(20, 184, 166, 0.10);
  border-color: rgba(94, 234, 212, 0.42);
  transform: translateY(-1px);
}
[data-theme="light"] .ssa-modal-foot .onb-btn-ghost {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(13, 148, 136, 0.32);
  color: var(--hr-text);
}
[data-theme="light"] .ssa-modal-foot .onb-btn-ghost:hover {
  background: rgba(13, 148, 136, 0.10);
  border-color: rgba(13, 148, 136, 0.50);
}

.ssa-modal-foot .onb-btn-primary,
.ssa-modal-foot .modal-cta {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 11px 22px;
  border-radius: 12px;
  font: inherit; font-weight: 800; font-size: 13px; letter-spacing: 0.3px;
  cursor: pointer;
}

/* ═════════════════════════════════════════════════════════════════════════
   ROUND 4 — final pass
   - Kill spinning conic-gradient border that bleeds through the chip header
   - Make modal-eyebrow self-contained so it can't overlap close button / borders
   - Force-paint yellow break-bar fill (rewrite, drop reliance on absolute child)
   - Force-paint the field borders inside the modal
   - Match Add-Document modal aesthetic: clean atmosphere, no L-corner clutter,
     subtle dashed top divider, solid borders on inputs
   - Journey v2 styles
   ═════════════════════════════════════════════════════════════════════════ */

/* ── Kill the spinning conic border that read as a "triangle" ──────── */
.ssa-modal::before { display: none !important; }
.ssa-modal-corner { display: none !important; }
.ssa-modal-rail { display: none !important; }

/* ── Modal — Add-Document grade ────────────────────────────────────── */
.ssa-modal {
  max-width: 620px;
  border-radius: 22px;
  background:
    radial-gradient(120% 60% at 100% 0%, rgba(20, 184, 166, 0.10), transparent 60%),
    radial-gradient(110% 60% at 0% 100%, rgba(251, 146, 60, 0.06), transparent 60%),
    linear-gradient(180deg, rgba(22, 18, 22, 0.92), rgba(16, 15, 18, 0.94));
  border: 1px solid rgba(94, 234, 212, 0.22);
  box-shadow:
    0 36px 90px -22px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(94, 234, 212, 0.08),
    0 0 60px rgba(20, 184, 166, 0.12);
  overflow: hidden;
  isolation: isolate;
}
.ssa-modal-aurora {
  position: absolute; inset: -15%; z-index: 0; pointer-events: none;
  background:
    radial-gradient(40% 30% at 12% 8%, rgba(20, 184, 166, 0.18), transparent 70%),
    radial-gradient(40% 30% at 88% 92%, rgba(251, 146, 60, 0.12), transparent 70%);
  filter: blur(8px);
  animation: ssaAuroraDrift 18s ease-in-out infinite;
  opacity: 0.75;
}
.ssa-modal-aurora.warn {
  background:
    radial-gradient(40% 30% at 12% 8%, rgba(251, 146, 60, 0.20), transparent 70%),
    radial-gradient(40% 30% at 88% 92%, rgba(248, 113, 113, 0.14), transparent 70%);
}

.ssa-modal-head {
  position: relative;
  padding: 22px 26px 18px !important;
  border-bottom: 1px dashed rgba(94, 234, 212, 0.18) !important;
}
.ssa-modal-head h3 {
  font-size: 22px !important;
  margin: 4px 0 0 !important;
  overflow: hidden;
}
.modal-blurb {
  margin: 8px 0 0 !important;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.62);
  line-height: 1.5;
}
.modal-head-text { padding-right: 8px; }

/* Eyebrow — self-contained chip; no border bleed possible because the conic
   ::before is gone now. */
.modal-eyebrow {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 4px 11px !important;
  border-radius: 999px !important;
  background: rgba(20, 184, 166, 0.10) !important;
  border: 1px solid rgba(94, 234, 212, 0.34) !important;
  color: var(--att-teal-100) !important;
  font-size: 9.5px !important; font-weight: 800 !important; letter-spacing: 1.4px !important;
  width: fit-content;
  position: relative;
  z-index: 3;
}
.modal-eyebrow.warn {
  background: rgba(251, 146, 60, 0.10) !important;
  border-color: rgba(251, 146, 60, 0.34) !important;
  color: var(--att-orange-100) !important;
}
[data-theme="light"] .modal-eyebrow {
  background: rgba(13, 148, 136, 0.10) !important;
  border-color: rgba(13, 148, 136, 0.34) !important;
  color: var(--att-teal-500) !important;
}
[data-theme="light"] .modal-eyebrow.warn {
  background: rgba(194, 65, 12, 0.10) !important;
  border-color: rgba(194, 65, 12, 0.34) !important;
  color: var(--att-orange-500) !important;
}

[data-theme="light"] .ssa-modal {
  background:
    radial-gradient(120% 60% at 100% 0%, rgba(13, 148, 136, 0.10), transparent 60%),
    radial-gradient(110% 60% at 0% 100%, rgba(234, 88, 12, 0.08), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.96), rgba(255, 246, 232, 0.94));
  border-color: rgba(13, 148, 136, 0.28);
  box-shadow:
    0 36px 90px -22px rgba(40, 25, 10, 0.30),
    0 0 0 1px rgba(13, 148, 136, 0.16),
    0 0 60px rgba(13, 148, 136, 0.10);
}
[data-theme="light"] .ssa-modal-head { border-bottom-color: rgba(180, 83, 9, 0.22) !important; }
[data-theme="light"] .modal-blurb { color: var(--hr-text-secondary); }

/* Force solid borders on form inputs INSIDE the modal — the HrInput / HrDatePicker
   shells use --hr-input-border which on cream + 0.92 alpha modal background can
   read as no-border. Bump the border colour locally. */
.ssa-modal :deep(.hr-input-shell),
.ssa-modal :deep(.hr-ta-shell),
.ssa-modal :deep(.hr-dp-trigger),
.ssa-modal :deep(.hr-select-trigger) {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(94, 234, 212, 0.32);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
.ssa-modal :deep(.hr-input-shell:hover),
.ssa-modal :deep(.hr-ta-shell:hover),
.ssa-modal :deep(.hr-dp-trigger:hover),
.ssa-modal :deep(.hr-select-trigger:hover) {
  border-color: rgba(94, 234, 212, 0.55);
}
.ssa-modal :deep(.hr-input-shell.focused),
.ssa-modal :deep(.hr-ta-shell.focused),
.ssa-modal :deep(.hr-dp.open .hr-dp-trigger),
.ssa-modal :deep(.hr-select.open .hr-select-trigger) {
  border-color: var(--att-teal-200);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.12);
}
[data-theme="light"] .ssa-modal :deep(.hr-input-shell),
[data-theme="light"] .ssa-modal :deep(.hr-ta-shell),
[data-theme="light"] .ssa-modal :deep(.hr-dp-trigger),
[data-theme="light"] .ssa-modal :deep(.hr-select-trigger) {
  background: rgba(255, 255, 255, 0.65);
  border-color: rgba(13, 148, 136, 0.32);
}
[data-theme="light"] .ssa-modal :deep(.hr-input-shell:hover),
[data-theme="light"] .ssa-modal :deep(.hr-ta-shell:hover),
[data-theme="light"] .ssa-modal :deep(.hr-dp-trigger:hover),
[data-theme="light"] .ssa-modal :deep(.hr-select-trigger:hover) {
  border-color: rgba(13, 148, 136, 0.55);
}

/* Close button — simpler, matches edoc */
.icon-btn {
  width: 36px !important; height: 36px !important;
  border-radius: 10px !important;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.10) !important;
  color: rgba(255, 255, 255, 0.7) !important;
}
.icon-btn:hover {
  background: rgba(255, 255, 255, 0.10) !important;
  border-color: rgba(255, 255, 255, 0.20) !important;
  color: #fff !important;
  transform: none !important;
  box-shadow: none !important;
}
[data-theme="light"] .icon-btn {
  background: rgba(40, 25, 10, 0.05) !important;
  border-color: rgba(40, 25, 10, 0.14) !important;
  color: rgba(40, 25, 10, 0.60) !important;
}
[data-theme="light"] .icon-btn:hover {
  background: rgba(40, 25, 10, 0.10) !important;
  border-color: rgba(40, 25, 10, 0.22) !important;
  color: #1a1410 !important;
}

/* ── Yellow break bar — rewrite the FILL element so it's guaranteed
       to render as a yellow block inside the track ──────────────────── */
.break-card .bw-bar {
  position: relative !important;
  display: block !important;
  height: 36px !important;
  border-radius: 10px !important;
  background: rgba(120, 53, 15, 0.10) !important;
  border: 1.5px solid rgba(202, 138, 4, 0.45) !important;
  overflow: hidden !important;
}
.break-card .bw-used {
  position: absolute !important;
  left: 0 !important; top: 0 !important; bottom: 0 !important;
  height: 100% !important;
  background:
    linear-gradient(90deg, #fde047 0%, #facc15 35%, #f59e0b 75%, #fb923c 100%) !important;
  background-size: 200% 100% !important;
  animation: bwFlow 4s ease-in-out infinite !important;
  border-right: 3px solid rgba(255, 255, 255, 0.75) !important;
  box-shadow:
    0 0 18px rgba(250, 204, 21, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.45),
    inset 0 -3px 8px rgba(180, 83, 9, 0.32) !important;
  min-width: 6px !important;
  display: block !important;
  z-index: 1 !important;
}
.break-card .bw-cap-text {
  position: absolute !important;
  inset: 0 !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  z-index: 2 !important;
  pointer-events: none;
  font-size: 13.5px !important;
  font-weight: 800 !important;
  color: #1a1410 !important;
  -webkit-text-fill-color: #1a1410 !important;
  text-shadow: 0 1px 4px rgba(255, 255, 255, 0.7), 0 0 8px rgba(255, 255, 255, 0.5) !important;
}
[data-theme="light"] .break-card .bw-cap-text {
  color: #1a1410 !important;
  -webkit-text-fill-color: #1a1410 !important;
  text-shadow: 0 1px 4px rgba(255, 255, 255, 0.85) !important;
}

/* ── Journey v2 — modern, dense, animated ─────────────────────────── */
.journey-v2 {
  position: relative;
  padding: 24px 28px;
  border-radius: 22px;
  background:
    radial-gradient(120% 60% at 0% 0%, rgba(20, 184, 166, 0.10), transparent 60%),
    radial-gradient(110% 60% at 100% 100%, rgba(251, 146, 60, 0.08), transparent 60%),
    var(--att-glass);
  border: 1px solid rgba(94, 234, 212, 0.24);
  backdrop-filter: var(--att-glass-blur);
  box-shadow: var(--att-glass-shadow);
  overflow: hidden;
  z-index: 1;
}
.journey-v2::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, #14b8a6, #facc15, #fb923c, transparent);
  background-size: 200% 100%;
  animation: pulseRail 5s linear infinite;
}
[data-theme="light"] .journey-v2 {
  background:
    radial-gradient(120% 60% at 0% 0%, rgba(13, 148, 136, 0.10), transparent 60%),
    radial-gradient(110% 60% at 100% 100%, rgba(234, 88, 12, 0.08), transparent 60%),
    rgba(255, 250, 240, 0.85);
  border-color: rgba(13, 148, 136, 0.30);
  box-shadow: 0 22px 50px -28px rgba(40, 25, 10, 0.22);
}

.journey-head {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 16px; flex-wrap: wrap;
  margin-bottom: 16px;
}
.journey-head-left { display: flex; flex-direction: column; gap: 6px; }
.journey-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase;
  color: var(--att-teal-100);
}
.journey-title {
  margin: 0;
  font-size: 22px; font-weight: 800; letter-spacing: -0.02em;
  background: linear-gradient(110deg, #5eead4 0%, #fde047 50%, #fb923c 100%);
  background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ssaGreetingShimmer 8s ease-in-out infinite;
}
[data-theme="light"] .journey-eyebrow { color: var(--att-teal-500); }
[data-theme="light"] .journey-title {
  background: linear-gradient(110deg, var(--att-teal-500) 0%, var(--att-yellow-500) 50%, var(--att-orange-500) 100%);
  background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}

.journey-summary { display: inline-flex; gap: 8px; flex-wrap: wrap; }
.js-bubble {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(94, 234, 212, 0.22);
  font-size: 11px;
}
.js-bubble.teal { background: rgba(20, 184, 166, 0.10); border-color: rgba(94, 234, 212, 0.32); }
.js-bubble.warm { background: rgba(250, 204, 21, 0.10); border-color: rgba(252, 211, 77, 0.32); }
.js-bubble.fire { background: rgba(251, 146, 60, 0.12); border-color: rgba(251, 146, 60, 0.40); animation: ssaWarnPulse 2.4s ease-in-out infinite; }
.js-val { font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }
.js-lbl { font-size: 9.5px; letter-spacing: 0.6px; text-transform: uppercase; color: rgba(255, 255, 255, 0.6); }
.js-bubble.teal svg { color: var(--att-teal-100); }
.js-bubble.warm svg { color: var(--att-yellow-200); }
.js-bubble.fire svg { color: var(--att-orange-100); }
[data-theme="light"] .js-bubble.teal { background: rgba(13, 148, 136, 0.12); border-color: rgba(13, 148, 136, 0.32); }
[data-theme="light"] .js-bubble.warm { background: rgba(202, 138, 4, 0.12); border-color: rgba(202, 138, 4, 0.32); }
[data-theme="light"] .js-bubble.fire { background: rgba(194, 65, 12, 0.12); border-color: rgba(194, 65, 12, 0.40); }
[data-theme="light"] .js-val { color: var(--hr-text); }
[data-theme="light"] .js-lbl { color: var(--hr-text-muted); }
[data-theme="light"] .js-bubble.teal svg { color: var(--att-teal-500); }
[data-theme="light"] .js-bubble.warm svg { color: var(--att-yellow-500); }
[data-theme="light"] .js-bubble.fire svg { color: var(--att-orange-500); }

/* Live progress arc */
.journey-arc {
  margin-bottom: 22px;
  padding: 16px 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(94, 234, 212, 0.18);
}
.jarc-track {
  position: relative;
  height: 10px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.06);
  overflow: visible;
}
.jarc-fill {
  position: relative;
  height: 100%;
  border-radius: 5px;
  background: linear-gradient(90deg, #14b8a6 0%, #facc15 50%, #fb923c 100%);
  background-size: 200% 100%;
  animation: bwFlow 5s ease-in-out infinite;
  box-shadow: 0 0 16px rgba(20, 184, 166, 0.55);
  transition: width 0.8s cubic-bezier(0.83, 0, 0.17, 1);
}
.jarc-glow {
  position: absolute; right: -8px; top: 50%; transform: translateY(-50%);
  width: 18px; height: 18px; border-radius: 50%;
  background: radial-gradient(circle, rgba(252, 211, 77, 0.9), transparent 70%);
  filter: blur(4px);
}
.jarc-pulse {
  position: absolute; top: 50%; transform: translate(-50%, -50%);
  width: 16px; height: 16px;
  transition: left 0.8s cubic-bezier(0.83, 0, 0.17, 1);
}
.jarc-pulse-dot {
  position: absolute; inset: 4px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fde047, #fb923c);
  box-shadow: 0 0 14px rgba(252, 211, 77, 0.85);
}
.jarc-pulse-ring {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(252, 211, 77, 0.55);
  animation: jarcRing 2s ease-out infinite;
}
@keyframes jarcRing {
  0%   { transform: scale(0.6); opacity: 0.9; }
  100% { transform: scale(2.4); opacity: 0; }
}
.jarc-labels {
  display: flex; justify-content: space-between;
  margin-top: 12px;
  font-family: var(--hr-mono);
  font-size: 10.5px; font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 0.5px;
}
.jarc-mid { color: var(--att-yellow-200) !important; font-weight: 800; }
[data-theme="light"] .journey-arc { background: rgba(255, 250, 240, 0.65); border-color: rgba(13, 148, 136, 0.24); }
[data-theme="light"] .jarc-track { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .jarc-labels { color: var(--hr-text-muted); }
[data-theme="light"] .jarc-mid { color: var(--att-yellow-500) !important; }

/* Event cards — stacked vertical timeline */
.journey-events {
  display: flex; flex-direction: column; gap: 12px;
}
.jev-card {
  position: relative;
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(94, 234, 212, 0.18);
  transition: border-color 0.25s, background 0.25s, transform 0.3s var(--att-spring);
  overflow: visible;
}
.jev-card.tone-done { background: rgba(20, 184, 166, 0.06); border-color: rgba(94, 234, 212, 0.32); }
.jev-card.tone-active {
  background: linear-gradient(135deg, rgba(250, 204, 21, 0.10), rgba(251, 146, 60, 0.08));
  border-color: rgba(250, 204, 21, 0.45);
  box-shadow: 0 8px 24px -10px rgba(250, 204, 21, 0.35), 0 0 0 4px rgba(250, 204, 21, 0.06);
}
.jev-card.tone-late {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.10), rgba(248, 113, 113, 0.06));
  border-color: rgba(251, 146, 60, 0.42);
}
.jev-card.tone-plan { opacity: 0.7; border-style: dashed; }
[data-theme="light"] .jev-card { background: rgba(255, 250, 240, 0.65); border-color: rgba(13, 148, 136, 0.22); }
[data-theme="light"] .jev-card.tone-done { background: rgba(13, 148, 136, 0.10); border-color: rgba(13, 148, 136, 0.36); }
[data-theme="light"] .jev-card.tone-active { background: linear-gradient(135deg, rgba(202, 138, 4, 0.12), rgba(234, 88, 12, 0.08)); border-color: rgba(202, 138, 4, 0.45); }
[data-theme="light"] .jev-card.tone-late { background: linear-gradient(135deg, rgba(194, 65, 12, 0.12), rgba(220, 38, 38, 0.06)); border-color: rgba(194, 65, 12, 0.42); }

.jev-rail {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  width: 56px;
}
.jev-rail-line {
  position: absolute; left: 50%; top: -16px; bottom: -16px;
  width: 2px;
  background: linear-gradient(180deg, transparent, rgba(94, 234, 212, 0.45), transparent);
  transform: translateX(-50%);
  z-index: 0;
}
.jev-card:first-child .jev-rail-line { top: 50%; }
.jev-card:last-child  .jev-rail-line { bottom: 50%; }
.jev-rail-dot {
  position: relative; z-index: 2;
  display: inline-grid; place-items: center;
  width: 40px; height: 40px;
  border-radius: 12px;
  background: rgba(20, 184, 166, 0.14);
  border: 1px solid rgba(94, 234, 212, 0.42);
  color: var(--att-teal-100);
  box-shadow: 0 6px 14px -6px rgba(0, 0, 0, 0.45);
}
.jev-card.tone-done .jev-rail-dot { background: var(--att-teal-soft); border-color: var(--att-teal-200); color: var(--att-teal-100); }
.jev-card.tone-active .jev-rail-dot {
  background: linear-gradient(135deg, #facc15, #fb923c);
  border-color: rgba(252, 211, 77, 0.6);
  color: #1a1100;
  box-shadow: 0 6px 18px -6px rgba(252, 211, 77, 0.6);
}
.jev-card.tone-late .jev-rail-dot { background: rgba(251, 146, 60, 0.18); border-color: rgba(251, 146, 60, 0.5); color: var(--att-orange-100); }
.jev-card.tone-plan .jev-rail-dot { background: rgba(255, 255, 255, 0.04); border-style: dashed; color: rgba(255, 255, 255, 0.6); }
.jev-now-pulse {
  position: absolute; inset: 4px;
  border-radius: 14px;
  border: 2px solid rgba(252, 211, 77, 0.55);
  animation: jevNowPulse 2s ease-out infinite;
  pointer-events: none;
}
@keyframes jevNowPulse {
  0% { transform: scale(0.92); opacity: 0.9; }
  100% { transform: scale(1.5); opacity: 0; }
}
[data-theme="light"] .jev-rail-line { background: linear-gradient(180deg, transparent, rgba(13, 148, 136, 0.45), transparent); }
[data-theme="light"] .jev-rail-dot { background: rgba(13, 148, 136, 0.12); border-color: rgba(13, 148, 136, 0.42); color: var(--att-teal-500); }
[data-theme="light"] .jev-card.tone-done .jev-rail-dot { background: rgba(13, 148, 136, 0.18); border-color: rgba(13, 148, 136, 0.5); }
[data-theme="light"] .jev-card.tone-late .jev-rail-dot { background: rgba(194, 65, 12, 0.16); border-color: rgba(194, 65, 12, 0.5); color: var(--att-orange-500); }
[data-theme="light"] .jev-card.tone-plan .jev-rail-dot { background: rgba(40, 25, 10, 0.05); color: var(--hr-text-secondary); }

.jev-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.jev-row { display: flex; align-items: center; gap: 10px; justify-content: space-between; flex-wrap: wrap; }
.jev-time {
  font-size: 13px; font-weight: 800;
  color: var(--att-teal-100); letter-spacing: 0.6px;
  -webkit-text-fill-color: var(--att-teal-100);
}
.jev-pill {
  display: inline-flex; align-items: center;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.9px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: rgba(255, 255, 255, 0.75);
}
.jev-pill[data-tone="done"]   { background: var(--att-teal-soft); color: var(--att-teal-100); border-color: var(--att-teal-border-soft); }
.jev-pill[data-tone="active"] { background: rgba(250, 204, 21, 0.16); color: var(--att-yellow-200); border-color: rgba(250, 204, 21, 0.42); animation: ssaWarnPulse 2s ease-in-out infinite; }
.jev-pill[data-tone="late"]   { background: rgba(251, 146, 60, 0.16); color: var(--att-orange-100); border-color: rgba(251, 146, 60, 0.42); }
.jev-pill[data-tone="plan"]   { background: rgba(255, 255, 255, 0.04); color: rgba(255, 255, 255, 0.55); }
.jev-label { font-size: 14px; font-weight: 800; color: #fff; letter-spacing: -0.01em; }
.jev-detail { font-size: 12px; color: rgba(255, 255, 255, 0.65); line-height: 1.5; }
[data-theme="light"] .jev-time { color: var(--att-teal-500); -webkit-text-fill-color: var(--att-teal-500); }
[data-theme="light"] .jev-pill { background: rgba(13, 148, 136, 0.08); color: var(--hr-text-secondary); border-color: rgba(13, 148, 136, 0.22); }
[data-theme="light"] .jev-pill[data-tone="done"]   { background: rgba(13, 148, 136, 0.14); color: var(--att-teal-500); border-color: rgba(13, 148, 136, 0.40); }
[data-theme="light"] .jev-pill[data-tone="active"] { background: rgba(202, 138, 4, 0.14); color: var(--att-yellow-500); border-color: rgba(202, 138, 4, 0.42); }
[data-theme="light"] .jev-pill[data-tone="late"]   { background: rgba(194, 65, 12, 0.14); color: var(--att-orange-500); border-color: rgba(194, 65, 12, 0.42); }
[data-theme="light"] .jev-label { color: var(--hr-text); }
[data-theme="light"] .jev-detail { color: var(--hr-text-secondary); }

/* ═════════════════════════════════════════════════════════════════════════
   ROUND 5 — Ultra-modern Insights v2 + new SSA modal shell
   ═════════════════════════════════════════════════════════════════════════ */

/* ── Hide legacy insights so v2 takes over ─────────────────────────── */
.insights { display: none !important; }

/* ── Insights v2 ────────────────────────────────────────────────────── */
.insights-v2 {
  position: relative;
  padding: 26px 28px;
  border-radius: 24px;
  background:
    radial-gradient(120% 60% at 0% 0%, rgba(20, 184, 166, 0.10), transparent 60%),
    radial-gradient(110% 60% at 100% 100%, rgba(251, 146, 60, 0.08), transparent 60%),
    var(--att-glass);
  border: 1px solid rgba(94, 234, 212, 0.24);
  backdrop-filter: var(--att-glass-blur);
  box-shadow: var(--att-glass-shadow);
  overflow: hidden;
  z-index: 1;
}
.insights-v2::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, #14b8a6, #facc15, #fb923c, transparent);
  background-size: 200% 100%;
  animation: pulseRail 5s linear infinite;
}
[data-theme="light"] .insights-v2 {
  background:
    radial-gradient(120% 60% at 0% 0%, rgba(13, 148, 136, 0.10), transparent 60%),
    radial-gradient(110% 60% at 100% 100%, rgba(234, 88, 12, 0.08), transparent 60%),
    rgba(255, 250, 240, 0.85);
  border-color: rgba(13, 148, 136, 0.30);
  box-shadow: 0 22px 50px -28px rgba(40, 25, 10, 0.22);
}
.ins-atmos { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.ins-aurora-a, .ins-aurora-b {
  position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.45;
}
.ins-aurora-a {
  top: -20%; left: -10%; width: 360px; height: 360px;
  background: radial-gradient(circle, rgba(94, 234, 212, 0.55), transparent 65%);
  animation: btAuroraDrift 18s ease-in-out infinite;
}
.ins-aurora-b {
  bottom: -25%; right: -10%; width: 320px; height: 320px;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.45), transparent 65%);
  animation: btAuroraDrift 22s ease-in-out infinite reverse;
}
.ins-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(94, 234, 212, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(94, 234, 212, 0.04) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(80% 80% at 50% 50%, #000 30%, transparent 90%);
  -webkit-mask-image: radial-gradient(80% 80% at 50% 50%, #000 30%, transparent 90%);
}
[data-theme="light"] .ins-grid {
  background-image:
    linear-gradient(rgba(13, 148, 136, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(13, 148, 136, 0.06) 1px, transparent 1px);
}

.ins-head {
  position: relative; z-index: 2;
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 16px; flex-wrap: wrap;
  margin-bottom: 22px;
}
.ins-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase;
  color: var(--att-teal-100);
}
.ins-title {
  margin: 6px 0 0;
  font-size: 24px; font-weight: 800; letter-spacing: -0.02em;
  background: linear-gradient(110deg, #5eead4 0%, #fde047 50%, #fb923c 100%);
  background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ssaGreetingShimmer 9s ease-in-out infinite;
}
.ins-sub { margin: 6px 0 0; font-size: 12px; color: rgba(255, 255, 255, 0.55); }
.ins-meta {
  display: inline-flex; align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(20, 184, 166, 0.10);
  border: 1px solid rgba(94, 234, 212, 0.32);
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.6px;
  color: var(--att-teal-100);
  text-transform: uppercase;
}
[data-theme="light"] .ins-eyebrow { color: var(--att-teal-500); }
[data-theme="light"] .ins-title {
  background: linear-gradient(110deg, var(--att-teal-500) 0%, var(--att-yellow-500) 50%, var(--att-orange-500) 100%);
  background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .ins-sub { color: var(--hr-text-secondary); }
[data-theme="light"] .ins-meta { background: rgba(13, 148, 136, 0.12); border-color: rgba(13, 148, 136, 0.40); color: var(--att-teal-500); }

.ins-deck {
  position: relative; z-index: 2;
  display: grid;
  grid-template-columns: 220px 1fr 280px;
  gap: 20px;
  align-items: stretch;
  margin-bottom: 22px;
}
@media (max-width: 980px) { .ins-deck { grid-template-columns: 1fr; } }

/* Ring chart card */
.ins-ring-card {
  position: relative;
  padding: 18px;
  border-radius: 18px;
  background: rgba(20, 184, 166, 0.06);
  border: 1px solid rgba(94, 234, 212, 0.32);
  overflow: hidden;
  isolation: isolate;
}
.irc-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(50% 50% at 50% 30%, rgba(94, 234, 212, 0.18), transparent 70%),
    radial-gradient(50% 50% at 50% 100%, rgba(252, 211, 77, 0.10), transparent 70%);
  filter: blur(10px); opacity: 0.7;
  pointer-events: none;
}
.irc-ring-wrap {
  position: relative;
  display: grid; place-items: center;
  aspect-ratio: 1;
  max-width: 200px;
  margin: 0 auto;
}
.irc-ring { width: 100%; height: 100%; filter: drop-shadow(0 8px 24px rgba(94, 234, 212, 0.35)); }
.irc-bg-ring { fill: none; stroke: rgba(94, 234, 212, 0.10); stroke-width: 6; }
.irc-fill-ring { fill: none; stroke: url(#ircGrad); stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset 1.2s cubic-bezier(0.83, 0, 0.17, 1); }
.irc-glow-ring { fill: none; stroke: url(#ircGrad); stroke-width: 14; stroke-linecap: round; opacity: 0.55; transition: stroke-dashoffset 1.2s cubic-bezier(0.83, 0, 0.17, 1); }
.irc-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  pointer-events: none;
}
.irc-eyebrow {
  font-family: var(--hr-mono);
  font-size: 9px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase;
  color: var(--att-teal-100);
  -webkit-text-fill-color: var(--att-teal-100);
}
.irc-value {
  font-size: 38px; font-weight: 800; letter-spacing: -0.02em;
  color: #fff;
  -webkit-text-fill-color: #fff;
  text-shadow: 0 0 16px rgba(94, 234, 212, 0.45);
  font-variant-numeric: tabular-nums;
  display: inline-flex; align-items: baseline; gap: 2px;
}
.irc-pct { font-size: 18px; opacity: 0.7; }
.irc-sub { font-size: 10.5px; color: rgba(255, 255, 255, 0.65); }
[data-theme="light"] .ins-ring-card { background: rgba(13, 148, 136, 0.06); border-color: rgba(13, 148, 136, 0.32); }
[data-theme="light"] .irc-bg-ring { stroke: rgba(13, 148, 136, 0.12); }
[data-theme="light"] .irc-eyebrow { color: var(--att-teal-500); -webkit-text-fill-color: var(--att-teal-500); }
[data-theme="light"] .irc-value { color: #1a1410; -webkit-text-fill-color: #1a1410; text-shadow: 0 0 12px rgba(13, 148, 136, 0.32); }
[data-theme="light"] .irc-sub { color: var(--hr-text-secondary); }

.irc-orbit {
  position: absolute; top: 50%; left: 50%;
  width: 4px; height: 4px; border-radius: 50%;
  background: #5eead4;
  box-shadow: 0 0 8px #5eead4;
  margin: -2px 0 0 -2px;
}
.irc-orbit-1 { animation: btOrbit 7s linear infinite; }
.irc-orbit-2 { animation: btOrbit 9s linear infinite reverse; background: #facc15; box-shadow: 0 0 8px #facc15; }
.irc-orbit-3 { animation: btOrbit 11s linear infinite; background: #fb923c; box-shadow: 0 0 8px #fb923c; }
.irc-orbit-1, .irc-orbit-2, .irc-orbit-3 {
  --r: 90px;
}
@keyframes btOrbit {
  0%   { transform: rotate(0deg) translateX(var(--r, 90px)) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(var(--r, 90px)) rotate(-360deg); }
}

/* Chip stack */
.ins-chip-stack { display: flex; flex-direction: column; gap: 10px; }
.ins-chip {
  position: relative; overflow: hidden;
  display: grid; grid-template-columns: 36px 1fr auto; gap: 12px; align-items: center;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(94, 234, 212, 0.18);
  transition: border-color 0.25s, background 0.25s;
}
.ins-chip:hover { background: rgba(255, 255, 255, 0.06); }
.ins-chip.tone-teal  { border-color: rgba(94, 234, 212, 0.38); }
.ins-chip.tone-amber { border-color: rgba(252, 211, 77, 0.38); }
.ins-chip.tone-rose  { border-color: rgba(248, 113, 113, 0.38); }
.ins-chip.tone-sky   { border-color: rgba(125, 211, 252, 0.38); }
.chip-glow {
  position: absolute; top: -40%; right: -10%;
  width: 60%; height: 200%;
  filter: blur(36px);
  pointer-events: none;
}
.ins-chip.tone-teal .chip-glow  { background: radial-gradient(50% 50% at 50% 50%, rgba(94, 234, 212, 0.45), transparent 70%); }
.ins-chip.tone-amber .chip-glow { background: radial-gradient(50% 50% at 50% 50%, rgba(252, 211, 77, 0.45), transparent 70%); }
.ins-chip.tone-rose .chip-glow  { background: radial-gradient(50% 50% at 50% 50%, rgba(248, 113, 113, 0.45), transparent 70%); }
.ins-chip.tone-sky .chip-glow   { background: radial-gradient(50% 50% at 50% 50%, rgba(125, 211, 252, 0.45), transparent 70%); }
.chip-icon {
  display: inline-grid; place-items: center;
  width: 36px; height: 36px; border-radius: 11px;
}
.ins-chip.tone-teal .chip-icon  { background: rgba(94, 234, 212, 0.14); border: 1px solid rgba(94, 234, 212, 0.4); color: var(--att-teal-100); }
.ins-chip.tone-amber .chip-icon { background: rgba(252, 211, 77, 0.14); border: 1px solid rgba(252, 211, 77, 0.4); color: var(--att-yellow-200); }
.ins-chip.tone-rose .chip-icon  { background: rgba(248, 113, 113, 0.14); border: 1px solid rgba(248, 113, 113, 0.4); color: #fca5a5; }
.ins-chip.tone-sky .chip-icon   { background: rgba(125, 211, 252, 0.14); border: 1px solid rgba(125, 211, 252, 0.4); color: #7dd3fc; }
.chip-text { display: flex; flex-direction: column; gap: 2px; }
.chip-label { font-size: 10.5px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; color: rgba(255, 255, 255, 0.6); }
.chip-value { font-size: 22px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; line-height: 1; }
.chip-bar {
  position: relative;
  width: 60px; height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.chip-bar-fill {
  display: block; height: 100%;
  background: linear-gradient(90deg, currentColor, transparent);
  border-radius: 999px;
  transition: width 0.8s cubic-bezier(0.83, 0, 0.17, 1);
}
.ins-chip.tone-teal .chip-bar-fill  { background: linear-gradient(90deg, #5eead4, #2dd4bf); box-shadow: 0 0 10px rgba(94, 234, 212, 0.55); }
.ins-chip.tone-amber .chip-bar-fill { background: linear-gradient(90deg, #fde047, #facc15); box-shadow: 0 0 10px rgba(252, 211, 77, 0.55); }
.ins-chip.tone-rose .chip-bar-fill  { background: linear-gradient(90deg, #fca5a5, #f87171); box-shadow: 0 0 10px rgba(248, 113, 113, 0.55); }
.ins-chip.tone-sky .chip-bar-fill   { background: linear-gradient(90deg, #7dd3fc, #38bdf8); box-shadow: 0 0 10px rgba(125, 211, 252, 0.55); }
[data-theme="light"] .ins-chip { background: rgba(255, 250, 240, 0.65); border-color: rgba(13, 148, 136, 0.22); }
[data-theme="light"] .ins-chip:hover { background: rgba(255, 250, 240, 0.85); }
[data-theme="light"] .ins-chip.tone-teal  { border-color: rgba(13, 148, 136, 0.42); }
[data-theme="light"] .ins-chip.tone-amber { border-color: rgba(202, 138, 4, 0.42); }
[data-theme="light"] .ins-chip.tone-rose  { border-color: rgba(220, 38, 38, 0.42); }
[data-theme="light"] .ins-chip.tone-sky   { border-color: rgba(2, 132, 199, 0.42); }
[data-theme="light"] .ins-chip.tone-teal .chip-icon  { color: var(--att-teal-500); }
[data-theme="light"] .ins-chip.tone-amber .chip-icon { color: var(--att-yellow-500); }
[data-theme="light"] .ins-chip.tone-rose .chip-icon  { color: #b91c1c; }
[data-theme="light"] .ins-chip.tone-sky .chip-icon   { color: #0369a1; }
[data-theme="light"] .chip-label { color: var(--hr-text-secondary); }
[data-theme="light"] .chip-value { color: var(--hr-text); }
[data-theme="light"] .chip-bar { background: rgba(40, 25, 10, 0.08); }

/* Sparkline card */
.ins-spark-card {
  display: flex; flex-direction: column; gap: 10px;
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(20, 184, 166, 0.04);
  border: 1px solid rgba(94, 234, 212, 0.28);
}
.isp-head { display: flex; justify-content: space-between; align-items: center; }
.isp-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase;
  color: var(--att-teal-100);
}
.isp-avg { font-size: 22px; font-weight: 800; color: #fff; display: inline-flex; align-items: baseline; gap: 6px; font-variant-numeric: tabular-nums; }
.isp-avg-lbl { font-size: 9px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: rgba(255, 255, 255, 0.55); }
.isp-svg { width: 100%; height: 80px; }
.isp-line { stroke-dasharray: 600; stroke-dashoffset: 600; animation: ispDraw 1.8s 0.5s cubic-bezier(0.83, 0, 0.17, 1) forwards; }
@keyframes ispDraw { to { stroke-dashoffset: 0; } }
.isp-area { opacity: 0; animation: ispFade 0.8s 1.6s ease forwards; }
@keyframes ispFade { to { opacity: 0.8; } }
.isp-dot { fill: #5eead4; opacity: 0; animation: ispDotPop 0.4s ease forwards; }
.isp-dot.last { fill: #facc15; r: 3.5; filter: drop-shadow(0 0 4px #facc15); animation: ispDotPop 0.5s ease forwards, ispLastPulse 2s ease-in-out 2s infinite; }
@keyframes ispDotPop { from { opacity: 0; transform: scale(0); } to { opacity: 0.9; transform: scale(1); } }
@keyframes ispLastPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.4); } }
.isp-foot { display: flex; justify-content: space-between; font-size: 9.5px; color: rgba(255, 255, 255, 0.45); font-family: var(--hr-mono); letter-spacing: 0.4px; }
.isp-foot-mid { color: var(--att-yellow-200) !important; text-transform: uppercase; font-weight: 800; }
[data-theme="light"] .ins-spark-card { background: rgba(13, 148, 136, 0.06); border-color: rgba(13, 148, 136, 0.32); }
[data-theme="light"] .isp-eyebrow { color: var(--att-teal-500); }
[data-theme="light"] .isp-avg { color: var(--hr-text); }
[data-theme="light"] .isp-avg-lbl { color: var(--hr-text-muted); }
[data-theme="light"] .isp-foot { color: var(--hr-text-muted); }
[data-theme="light"] .isp-foot-mid { color: var(--att-yellow-500) !important; }

/* Tape — animated bars at the bottom */
.ins-tape {
  position: relative; z-index: 2;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(64px, 1fr)); gap: 8px;
}
.itape-card {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 12px 8px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(94, 234, 212, 0.16);
  cursor: pointer;
  transition: border-color 0.25s, background 0.25s, box-shadow 0.3s;
}
.itape-card:hover { border-color: rgba(94, 234, 212, 0.55); background: rgba(20, 184, 166, 0.08); box-shadow: 0 12px 28px -14px rgba(20, 184, 166, 0.4); }
.itape-aura {
  position: absolute; top: -50%; left: -10%;
  width: 120%; height: 200%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(94, 234, 212, 0.20), transparent 70%);
  filter: blur(20px); pointer-events: none;
}
.itape-card.status-LATE .itape-aura   { background: radial-gradient(50% 50% at 50% 50%, rgba(252, 211, 77, 0.28), transparent 70%); }
.itape-card.status-ABSENT .itape-aura { background: radial-gradient(50% 50% at 50% 50%, rgba(248, 113, 113, 0.28), transparent 70%); }
.itape-card.status-WFH .itape-aura    { background: radial-gradient(50% 50% at 50% 50%, rgba(125, 211, 252, 0.28), transparent 70%); }
.itape-weekday { font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: rgba(255, 255, 255, 0.55); }
.itape-day { font-size: 18px; font-weight: 800; color: #fff; line-height: 1; }
.itape-hours { font-size: 10px; color: rgba(255, 255, 255, 0.6); }
.itape-bar {
  width: 4px; height: 30px;
  margin-top: 2px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  position: relative; overflow: hidden;
  align-self: center;
}
.itape-bar-fill {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: linear-gradient(180deg, transparent, #5eead4);
  border-radius: 999px;
  transition: height 0.8s cubic-bezier(0.83, 0, 0.17, 1);
}
.itape-card.status-LATE .itape-bar-fill   { background: linear-gradient(180deg, transparent, #facc15); }
.itape-card.status-ABSENT .itape-bar-fill { background: linear-gradient(180deg, transparent, #f87171); }
.itape-card.status-WFH .itape-bar-fill    { background: linear-gradient(180deg, transparent, #7dd3fc); }
[data-theme="light"] .itape-card { background: rgba(255, 250, 240, 0.65); border-color: rgba(13, 148, 136, 0.22); }
[data-theme="light"] .itape-card:hover { background: rgba(13, 148, 136, 0.10); border-color: rgba(13, 148, 136, 0.45); }
[data-theme="light"] .itape-weekday { color: var(--hr-text-muted); }
[data-theme="light"] .itape-day { color: var(--hr-text); }
[data-theme="light"] .itape-hours { color: var(--hr-text-secondary); }
[data-theme="light"] .itape-bar { background: rgba(40, 25, 10, 0.08); }

/* ═════════════════════════════════════════════════════════════════════════
   SSA Modal v3 — ULTRA-MODERN (replaces .ssa-modal-*)
   ═════════════════════════════════════════════════════════════════════════ */
.ssa-modal-overlay { display: none !important; }   /* old shell off */

.smodal-shell {
  position: fixed; inset: 0; z-index: 100;
  display: grid; place-items: center;
  padding: 24px;
  perspective: 1400px;
}
.smodal-veil {
  position: absolute; inset: 0;
  background:
    radial-gradient(70% 50% at 50% 0%, rgba(20, 184, 166, 0.22), transparent 65%),
    radial-gradient(60% 50% at 50% 100%, rgba(251, 146, 60, 0.16), transparent 65%),
    rgba(2, 6, 10, 0.66);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
}
[data-theme="light"] .smodal-veil {
  background:
    radial-gradient(70% 50% at 50% 0%, rgba(13, 148, 136, 0.20), transparent 65%),
    radial-gradient(60% 50% at 50% 100%, rgba(234, 88, 12, 0.16), transparent 65%),
    rgba(40, 25, 10, 0.36);
}

.smodal {
  position: relative;
  width: 100%; max-width: 600px;
  border-radius: 24px;
  background:
    radial-gradient(120% 60% at 100% 0%, rgba(20, 184, 166, 0.10), transparent 60%),
    radial-gradient(110% 60% at 0% 100%, rgba(251, 146, 60, 0.08), transparent 60%),
    linear-gradient(180deg, rgba(22, 18, 22, 0.92), rgba(16, 15, 18, 0.96));
  border: 1px solid rgba(94, 234, 212, 0.32);
  box-shadow:
    0 50px 120px -30px rgba(0, 0, 0, 0.75),
    0 0 0 1px rgba(94, 234, 212, 0.12),
    0 0 80px rgba(20, 184, 166, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  overflow: hidden;
  isolation: isolate;
  display: flex; flex-direction: column;
  max-height: calc(100vh - 48px);
}
.smodal.warn {
  border-color: rgba(251, 146, 60, 0.42);
  box-shadow:
    0 50px 120px -30px rgba(0, 0, 0, 0.75),
    0 0 0 1px rgba(251, 146, 60, 0.18),
    0 0 80px rgba(251, 146, 60, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
[data-theme="light"] .smodal {
  background:
    radial-gradient(120% 60% at 100% 0%, rgba(13, 148, 136, 0.12), transparent 60%),
    radial-gradient(110% 60% at 0% 100%, rgba(234, 88, 12, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.96), rgba(255, 246, 232, 0.94));
  border-color: rgba(13, 148, 136, 0.40);
  box-shadow:
    0 50px 120px -30px rgba(40, 25, 10, 0.40),
    0 0 0 1px rgba(13, 148, 136, 0.22),
    0 0 80px rgba(13, 148, 136, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
}
[data-theme="light"] .smodal.warn {
  border-color: rgba(194, 65, 12, 0.45);
  box-shadow:
    0 50px 120px -30px rgba(40, 25, 10, 0.40),
    0 0 0 1px rgba(194, 65, 12, 0.22),
    0 0 80px rgba(194, 65, 12, 0.14);
}

/* Atmospheric layers */
.smodal-atmos { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.sm-aura {
  position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.5;
  animation: btAuroraDrift 18s ease-in-out infinite;
}
.sm-aura-a {
  top: -30%; left: -10%; width: 320px; height: 320px;
  background: radial-gradient(circle, rgba(94, 234, 212, 0.55), transparent 65%);
}
.sm-aura-b {
  bottom: -30%; right: -10%; width: 280px; height: 280px;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.45), transparent 65%);
  animation-delay: 6s;
}
.sm-aura.warn {
  background: radial-gradient(circle, rgba(251, 146, 60, 0.55), transparent 65%);
}
.sm-aura-b.warn {
  background: radial-gradient(circle, rgba(248, 113, 113, 0.45), transparent 65%);
}
.sm-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(94, 234, 212, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(94, 234, 212, 0.05) 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: radial-gradient(80% 80% at 50% 50%, #000 30%, transparent 90%);
  -webkit-mask-image: radial-gradient(80% 80% at 50% 50%, #000 30%, transparent 90%);
}
[data-theme="light"] .sm-grid {
  background-image:
    linear-gradient(rgba(13, 148, 136, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(13, 148, 136, 0.06) 1px, transparent 1px);
}

/* Top rail */
.smodal::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; z-index: 4;
  background: linear-gradient(90deg, transparent, #14b8a6 30%, #facc15 50%, #fb923c 70%, transparent);
  background-size: 200% 100%;
  animation: pulseRail 5s linear infinite;
}
.smodal.warn::before {
  background: linear-gradient(90deg, transparent, #fb923c 30%, #f87171 50%, #fb923c 70%, transparent);
  background-size: 200% 100%;
}

/* Header */
.smodal-head {
  position: relative; z-index: 2;
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: 16px;
  align-items: flex-start;
  padding: 22px 24px 18px;
  border-bottom: 1px dashed rgba(94, 234, 212, 0.20);
}
[data-theme="light"] .smodal-head { border-bottom-color: rgba(180, 83, 9, 0.22); }

.sm-head-icon {
  position: relative;
  display: grid; place-items: center;
  width: 56px; height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(94, 234, 212, 0.20), rgba(20, 184, 166, 0.12));
  border: 1px solid rgba(94, 234, 212, 0.45);
  color: var(--att-teal-100);
  box-shadow:
    0 10px 24px -8px rgba(20, 184, 166, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  animation: smIconFloat 3.6s ease-in-out infinite;
}
.sm-head-icon[data-tone="warn"] {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.20), rgba(234, 88, 12, 0.12));
  border-color: rgba(251, 146, 60, 0.45);
  color: var(--att-orange-100);
  box-shadow: 0 10px 24px -8px rgba(234, 88, 12, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.sm-icon-glow {
  position: absolute; inset: -3px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(94, 234, 212, 0.55), rgba(20, 184, 166, 0.30));
  filter: blur(10px);
  z-index: -1;
  animation: smIconPulse 2.8s ease-in-out infinite;
}
.sm-icon-glow.warn { background: linear-gradient(135deg, rgba(251, 146, 60, 0.55), rgba(248, 113, 113, 0.30)); }
@keyframes smIconFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes smIconPulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.7; } }
[data-theme="light"] .sm-head-icon { background: linear-gradient(135deg, rgba(13, 148, 136, 0.18), rgba(13, 148, 136, 0.10)); border-color: rgba(13, 148, 136, 0.50); color: var(--att-teal-500); }
[data-theme="light"] .sm-head-icon[data-tone="warn"] { background: linear-gradient(135deg, rgba(194, 65, 12, 0.18), rgba(194, 65, 12, 0.10)); border-color: rgba(194, 65, 12, 0.50); color: var(--att-orange-500); }
[data-theme="light"] .sm-icon-glow { background: linear-gradient(135deg, rgba(13, 148, 136, 0.40), rgba(13, 148, 136, 0.20)); }
[data-theme="light"] .sm-icon-glow.warn { background: linear-gradient(135deg, rgba(194, 65, 12, 0.40), rgba(248, 113, 113, 0.20)); }

.sm-head-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.sm-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase;
  color: var(--att-teal-100);
  width: fit-content;
}
.sm-eyebrow.warn { color: var(--att-orange-100); }
.sm-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--att-teal-100);
  box-shadow: 0 0 8px var(--att-teal-100);
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
.sm-eyebrow-dot.warn { background: var(--att-orange-100); box-shadow: 0 0 8px var(--att-orange-100); }
[data-theme="light"] .sm-eyebrow { color: var(--att-teal-500); }
[data-theme="light"] .sm-eyebrow.warn { color: var(--att-orange-500); }
[data-theme="light"] .sm-eyebrow-dot { background: var(--att-teal-500); box-shadow: 0 0 8px var(--att-teal-500); }
[data-theme="light"] .sm-eyebrow-dot.warn { background: var(--att-orange-500); box-shadow: 0 0 8px var(--att-orange-500); }

.sm-title {
  margin: 2px 0 0;
  font-size: 22px; font-weight: 800; letter-spacing: -0.02em;
  color: #fff;
  background: linear-gradient(110deg, #fff 0%, #ccfbf1 50%, #fde68a 100%);
  background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ssaGreetingShimmer 8s ease-in-out infinite;
}
.smodal.warn .sm-title {
  background: linear-gradient(110deg, #fff 0%, #fed7aa 50%, #fdba74 100%);
  background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .sm-title {
  background: linear-gradient(110deg, #1a1410 0%, #0f766e 50%, #b45309 100%);
  background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .smodal.warn .sm-title {
  background: linear-gradient(110deg, #1a1410 0%, #c2410c 50%, #b91c1c 100%);
  background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.sm-blurb { margin: 6px 0 0; font-size: 12.5px; color: rgba(255, 255, 255, 0.65); line-height: 1.55; }
.sm-blurb b { color: #fff; font-weight: 800; }
[data-theme="light"] .sm-blurb { color: var(--hr-text-secondary); }
[data-theme="light"] .sm-blurb b { color: var(--hr-text); }

.sm-close {
  display: grid; place-items: center;
  width: 36px; height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.28s var(--att-spring);
}
.sm-close:hover {
  background: rgba(248, 113, 113, 0.18);
  border-color: rgba(248, 113, 113, 0.48);
  color: #fca5a5;
  transform: rotate(90deg);
}
[data-theme="light"] .sm-close { background: rgba(40, 25, 10, 0.06); border-color: rgba(40, 25, 10, 0.14); color: rgba(40, 25, 10, 0.62); }
[data-theme="light"] .sm-close:hover { background: rgba(220, 38, 38, 0.12); border-color: rgba(220, 38, 38, 0.36); color: #b91c1c; }

/* Body + form */
.smodal-body {
  position: relative; z-index: 2;
  padding: 20px 24px 4px;
  overflow-y: auto;
  flex: 1;
}
.sm-form { display: flex; flex-direction: column; gap: 16px; }
.sm-form > * { animation: smRiseIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
.sm-form > *:nth-child(1) { animation-delay: 0.10s; }
.sm-form > *:nth-child(2) { animation-delay: 0.18s; }
.sm-form > *:nth-child(3) { animation-delay: 0.26s; }
.sm-form > *:nth-child(4) { animation-delay: 0.34s; }
@keyframes smRiseIn {
  from { opacity: 0; transform: translateY(12px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0); filter: blur(0); }
}
@media (prefers-reduced-motion: reduce) { .sm-form > * { animation: none; } }

.sm-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.sm-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; min-width: 0; }
@media (max-width: 520px) { .sm-field-row { grid-template-columns: 1fr; } }

/* Force visible borders on the embedded HR inputs inside the modal —
   the modal's deep glass background drowns out --hr-input-border, so
   we boost it here. */
.smodal :deep(.hr-input-shell),
.smodal :deep(.hr-ta-shell),
.smodal :deep(.hr-dp-trigger),
.smodal :deep(.hr-select-trigger) {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1.5px solid rgba(94, 234, 212, 0.32) !important;
  border-radius: 12px !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
  transition: border-color 0.25s var(--att-spring), box-shadow 0.25s var(--att-spring), background 0.25s !important;
}
.smodal :deep(.hr-input-shell:hover),
.smodal :deep(.hr-ta-shell:hover),
.smodal :deep(.hr-dp-trigger:hover:not(:disabled)),
.smodal :deep(.hr-select-trigger:hover:not(:disabled)) {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(94, 234, 212, 0.55) !important;
}
.smodal :deep(.hr-input-shell.focused),
.smodal :deep(.hr-ta-shell.focused),
.smodal :deep(.hr-dp.open .hr-dp-trigger),
.smodal :deep(.hr-select.open .hr-select-trigger) {
  background: rgba(20, 184, 166, 0.08) !important;
  border-color: var(--att-teal-200) !important;
  box-shadow:
    0 0 0 3px rgba(20, 184, 166, 0.14),
    0 0 20px -4px rgba(94, 234, 212, 0.45) !important;
}
.smodal.warn :deep(.hr-input-shell.focused),
.smodal.warn :deep(.hr-ta-shell.focused) {
  background: rgba(251, 146, 60, 0.08) !important;
  border-color: var(--att-orange-200) !important;
  box-shadow:
    0 0 0 3px rgba(251, 146, 60, 0.14),
    0 0 20px -4px rgba(251, 146, 60, 0.45) !important;
}
[data-theme="light"] .smodal :deep(.hr-input-shell),
[data-theme="light"] .smodal :deep(.hr-ta-shell),
[data-theme="light"] .smodal :deep(.hr-dp-trigger),
[data-theme="light"] .smodal :deep(.hr-select-trigger) {
  background: rgba(255, 255, 255, 0.75) !important;
  border-color: rgba(13, 148, 136, 0.42) !important;
}
[data-theme="light"] .smodal :deep(.hr-input-shell:hover),
[data-theme="light"] .smodal :deep(.hr-ta-shell:hover),
[data-theme="light"] .smodal :deep(.hr-dp-trigger:hover:not(:disabled)),
[data-theme="light"] .smodal :deep(.hr-select-trigger:hover:not(:disabled)) {
  background: rgba(255, 255, 255, 0.95) !important;
  border-color: rgba(13, 148, 136, 0.65) !important;
}
[data-theme="light"] .smodal :deep(.hr-input-shell.focused),
[data-theme="light"] .smodal :deep(.hr-ta-shell.focused),
[data-theme="light"] .smodal :deep(.hr-dp.open .hr-dp-trigger),
[data-theme="light"] .smodal :deep(.hr-select.open .hr-select-trigger) {
  background: rgba(13, 148, 136, 0.06) !important;
  border-color: var(--att-teal-400) !important;
  box-shadow:
    0 0 0 3px rgba(13, 148, 136, 0.16),
    0 0 20px -4px rgba(13, 148, 136, 0.32) !important;
}

/* Footer + CTA */
.smodal-foot {
  position: relative; z-index: 2;
  display: flex; gap: 10px; justify-content: flex-end;
  padding: 16px 24px 20px;
  border-top: 1px dashed rgba(94, 234, 212, 0.20);
  background: linear-gradient(180deg, rgba(8, 14, 18, 0.45), rgba(8, 14, 18, 0.75));
  backdrop-filter: blur(8px);
}
[data-theme="light"] .smodal-foot {
  border-top-color: rgba(180, 83, 9, 0.22);
  background: linear-gradient(180deg, rgba(255, 244, 220, 0.45), rgba(255, 244, 220, 0.85));
}

.sm-btn {
  position: relative; overflow: hidden;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 20px;
  border-radius: 12px;
  border: 1px solid transparent;
  font: inherit; font-weight: 800; font-size: 13px; letter-spacing: 0.3px;
  cursor: pointer;
  transition: all 0.28s var(--att-spring);
}
.sm-btn.ghost {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(94, 234, 212, 0.28);
  color: var(--hr-text);
}
.sm-btn.ghost:hover {
  background: rgba(20, 184, 166, 0.10);
  border-color: rgba(94, 234, 212, 0.50);
  transform: translateY(-1px);
}
.sm-btn.primary {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 55%, #0f766e 100%);
  background-size: 200% 200%;
  animation: modalCtaFlow 6s linear infinite;
  border-color: rgba(94, 234, 212, 0.6);
  color: #fff;
  box-shadow:
    0 16px 34px -10px rgba(20, 184, 166, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
.sm-btn.primary.warn {
  background: linear-gradient(135deg, #fb923c 0%, #ea580c 55%, #c2410c 100%);
  background-size: 200% 200%;
  border-color: rgba(251, 146, 60, 0.6);
  box-shadow:
    0 16px 34px -10px rgba(234, 88, 12, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
.sm-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; animation: none; box-shadow: none; }
.sm-btn-sheen {
  position: absolute; inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.28) 50%, transparent 70%);
  background-size: 200% 100%; background-position: -100% 0;
  animation: modalCtaSheen 3.6s ease-in-out infinite;
  pointer-events: none;
}
.sm-btn.primary:disabled .sm-btn-sheen { display: none; }
[data-theme="light"] .sm-btn.ghost { background: rgba(40, 25, 10, 0.05); border-color: rgba(13, 148, 136, 0.32); color: var(--hr-text); }
[data-theme="light"] .sm-btn.ghost:hover { background: rgba(13, 148, 136, 0.10); border-color: rgba(13, 148, 136, 0.55); }

/* Modal enter/leave */
.smodal-enter-active, .smodal-leave-active { transition: opacity 0.36s ease; }
.smodal-enter-from, .smodal-leave-to { opacity: 0; }

/* ═════════════════════════════════════════════════════════════════════════
   ROUND 6 — Inputs adopt the exact Add-Asset modal styling
   (delegated to OnbField — same component used by the onboarding asset modal).
   This block only owns the GRID layout. All field chrome, focus rings,
   underline animation and label typography come straight from OnbField.
   ═════════════════════════════════════════════════════════════════════════ */

/* Two-column grid that wraps OnbFields, matches Add-Asset modal's `.form-grid-2` */
.sm-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  min-width: 0;
}
@media (max-width: 520px) { .sm-grid-2 { grid-template-columns: 1fr; } }

/* The OnbField root has its own grid-column rules for is-full — leave them
   alone so multi-line textareas span both columns when needed. */
.sm-form > :deep(.onb-field) { min-width: 0; }
.sm-form > :deep(.onb-field.is-full) { grid-column: 1 / -1; }

/* The native time input inside an OnbField — tighten the colour scheme so the
   browser picker matches the modal theme. */
.smodal :deep(.onb-field-control[data-type="time"] input) {
  font-family: var(--hr-mono);
  font-size: 13px;
  color-scheme: dark;
  letter-spacing: 0.5px;
}
[data-theme="light"] .smodal :deep(.onb-field-control[data-type="time"] input) {
  color-scheme: light;
}

/* Kill the round 4/5 deep overrides on HrInput/HrTextarea/HrDatePicker/HrSelect
   shells INSIDE the modal — OnbField wraps these with its own .onb-field-control
   chrome and the inner shells need to look transparent so the OnbField border /
   focus ring is the visible edge. */
.smodal :deep(.onb-field-control .hr-input-shell),
.smodal :deep(.onb-field-control .hr-ta-shell),
.smodal :deep(.onb-field .hr-dp-trigger),
.smodal :deep(.onb-field .hr-select-trigger) {
  background: transparent !important;
  border: 0 !important;
  border-radius: 12px !important;
  box-shadow: none !important;
}
.smodal :deep(.onb-field.is-focused .hr-dp-trigger),
.smodal :deep(.onb-field.is-focused .hr-select-trigger) {
  box-shadow: none !important;
}
/* HrDatePicker/HrSelect aren't wrapped in .onb-field-control — they sit
   directly inside .onb-field. Give the OnbField itself the focus chrome when
   the embedded picker is open. */
.smodal :deep(.onb-field:has(.hr-dp.open)),
.smodal :deep(.onb-field:has(.hr-select.open)) { /* visual hint that the popover is owned by this field */ }

/* Make HrDatePicker / HrSelect triggers inherit the OnbField surface so the
   border becomes the visible edge of the input. */
.smodal :deep(.hr-dp-trigger),
.smodal :deep(.hr-select-trigger) {
  width: 100%;
  height: auto;
  min-height: 44px;
  padding: 11px 14px;
  background: var(--hr-input-bg) !important;
  border: 1px solid var(--hr-input-border) !important;
  border-radius: 12px !important;
}
.smodal :deep(.hr-dp-trigger:hover:not(:disabled)),
.smodal :deep(.hr-select-trigger:hover:not(:disabled)) {
  border-color: var(--hr-accent-gold-border) !important;
}
.smodal :deep(.hr-dp.open .hr-dp-trigger),
.smodal :deep(.hr-select.open .hr-select-trigger),
.smodal :deep(.hr-dp.focused .hr-dp-trigger),
.smodal :deep(.hr-select.focused .hr-select-trigger) {
  border-color: var(--hr-accent-gold-border) !important;
  background: var(--hr-input-bg-focus) !important;
  box-shadow:
    0 0 0 4px rgba(251, 191, 36, 0.06),
    0 0 24px -8px rgba(251, 191, 36, 0.35) !important;
}
[data-theme="light"] .smodal :deep(.hr-dp.open .hr-dp-trigger),
[data-theme="light"] .smodal :deep(.hr-select.open .hr-select-trigger),
[data-theme="light"] .smodal :deep(.hr-dp.focused .hr-dp-trigger),
[data-theme="light"] .smodal :deep(.hr-select.focused .hr-select-trigger) {
  box-shadow:
    0 0 0 4px rgba(217, 119, 6, 0.14),
    0 0 24px -8px rgba(217, 119, 6, 0.35) !important;
}

/* ═════════════════════════════════════════════════════════════════════════
   ROUND 7 — kill every custom scrollbar that might paint inside the page.
   The browser's natural page-level vertical scrollbar lives on html / body
   (outside `.ssa-page`) so it remains untouched. Anything *inside* the page
   that overflows scrolls silently — no styled track, no styled thumb.
   ═════════════════════════════════════════════════════════════════════════ */
.ssa-page,
.ssa-page :deep(*) {
  scrollbar-width: none !important;
  scrollbar-color: auto !important;
}
.ssa-page::-webkit-scrollbar,
.ssa-page :deep(*::-webkit-scrollbar) {
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
  display: none !important;
}
.ssa-page::-webkit-scrollbar-track,
.ssa-page::-webkit-scrollbar-thumb,
.ssa-page::-webkit-scrollbar-thumb:hover,
.ssa-page :deep(*::-webkit-scrollbar-track),
.ssa-page :deep(*::-webkit-scrollbar-thumb),
.ssa-page :deep(*::-webkit-scrollbar-thumb:hover) {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

/* ═════════════════════════════════════════════════════════════════════════
   ROUND 8 — match Add-Asset modal exactly
   The SSA correction / WFH / late-punch modals now use the OnbModal shell
   and OnbField inputs (the same components rendered inside
   `OnbAssetSection.vue` for "Add asset"). Below: the two layout helpers that
   live inside that section's scoped CSS (form-stack, form-grid-2) duplicated
   here so OnbField children lay out identically.
   ═════════════════════════════════════════════════════════════════════════ */
.form-stack { display: flex; flex-direction: column; gap: 14px; }
.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  min-width: 0;
}
.form-grid-2 > :deep(.onb-field) { min-width: 0; }
@media (max-width: 520px) { .form-grid-2 { grid-template-columns: 1fr; } }

/* ═════════════════════════════════════════════════════════════════════════
   ATTENDANCE REPORT — per-day breakdown drawer
   Reachable from the "Attendance report" quick action. Lives inside the
   OnbModal shell (teleported to body) so these rules are NOT scoped to the
   data-v hash — they must be plain class selectors. The OnbModal slot
   children render at body root with no parent stacking context.
   ═════════════════════════════════════════════════════════════════════════ */
/* ═════════════════════════════════════════════════════════════════════════
   REPORT STRIP — 14-day picker, fixed grid (no horizontal scroll)
   ═════════════════════════════════════════════════════════════════════════
   Layout: equal-width CSS grid of 14 chips so everything fits the modal
   width on any screen ≥ 540px (falls back to 2-row 7×2 grid below that).
   Active state animation: NO rotation. Instead, the active chip gets a
   soft radial spotlight halo + a gradient indicator bar that scales-in
   from the bottom + a smooth elevation lift. Calm, deliberate, modern.
*/
.rep-strip {
  position: relative;
  margin-bottom: 18px;
  padding: 14px 14px 16px;
  border-radius: 20px;
  background:
    radial-gradient(ellipse 100% 70% at 50% 0%, rgba(251, 191, 36, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.rep-strip-atmos { position: absolute; inset: 0; pointer-events: none; overflow: hidden; border-radius: inherit; }
.rs-aurora {
  position: absolute; width: 320px; height: 320px; border-radius: 50%;
  filter: blur(70px); opacity: 0.4;
  animation: rs-aurora-drift 18s ease-in-out infinite alternate;
}
.rs-aurora-a {
  top: -70%; left: -8%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.55), transparent 65%);
}
.rs-aurora-b {
  top: -50%; right: -8%;
  background: radial-gradient(circle, rgba(94, 234, 212, 0.45), transparent 65%);
  animation-delay: 5s;
}
.rs-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 28px 28px;
  -webkit-mask: radial-gradient(ellipse 90% 70% at 50% 50%, #000 30%, transparent 80%);
          mask: radial-gradient(ellipse 90% 70% at 50% 50%, #000 30%, transparent 80%);
  opacity: 0.45;
}
@keyframes rs-aurora-drift {
  from { transform: translate(0, 0); }
  to   { transform: translate(36px, 18px); }
}

/* Header line above the chip row */
.rep-strip-head {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 4px;
}
.rsh-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}
.rsh-eyebrow svg { color: rgba(251, 191, 36, 0.85); }
.rsh-current {
  font-size: 11px; font-weight: 700;
  color: #fde68a;
  letter-spacing: 0.2px;
}

/* The 14-cell grid — equal columns, no scroll */
.rep-strip-track {
  position: relative; z-index: 1;
  display: grid;
  grid-template-columns: repeat(14, 1fr);
  gap: 5px;
  align-items: stretch;
}

/* ── Chip — compact, idle/hover/active states ─────────────────────────── */
.rep-strip-day {
  position: relative;
  display: flex; flex-direction: column; align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 10px 0 12px;
  border-radius: 13px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.015));
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.82);
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  transition:
    border-color 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.32s ease,
    box-shadow 0.32s ease;
  min-width: 0;
}
.rep-strip-day:hover {
  border-color: rgba(251, 191, 36, 0.4);
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.10), rgba(255, 255, 255, 0.03));
  color: #fff;
  box-shadow: 0 10px 24px -12px rgba(251, 191, 36, 0.45);
}
.rep-strip-day.active {
  border-color: rgba(251, 191, 36, 0.7);
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.18), rgba(251, 146, 60, 0.06));
  color: #fff;
  box-shadow:
    0 0 0 1px rgba(251, 191, 36, 0.45),
    0 14px 30px -14px rgba(251, 191, 36, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

/* Spotlight — large soft radial glow behind the active chip's day number */
.rsd-spotlight {
  position: absolute;
  inset: -20% -10%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.42), transparent 60%);
  filter: blur(14px);
  opacity: 0;
  pointer-events: none;
  transform: scale(0.6);
  transition: opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1),
              transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 0;
}
.rep-strip-day.active .rsd-spotlight {
  opacity: 1;
  transform: scale(1);
  animation: rsd-spot-breathe 3.4s ease-in-out infinite;
}
@keyframes rsd-spot-breathe {
  0%, 100% { opacity: 0.85; }
  50%      { opacity: 1; }
}

/* Today: tiny teal pulse in the top-right corner */
.rsd-today-pulse {
  position: absolute; top: 5px; right: 5px;
  width: 5px; height: 5px; border-radius: 50%;
  background: #5eead4;
  box-shadow: 0 0 0 0 rgba(94, 234, 212, 0.6);
  animation: rsd-today-pulse 2.2s ease-out infinite;
  z-index: 2;
}
@keyframes rsd-today-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(94, 234, 212, 0.7); }
  70%  { box-shadow: 0 0 0 7px rgba(94, 234, 212, 0); }
  100% { box-shadow: 0 0 0 0 rgba(94, 234, 212, 0); }
}

/* Day-of-week label */
.rsd-dow {
  position: relative; z-index: 1;
  font-size: 9px; font-weight: 700; letter-spacing: 1.4px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  transition: color 0.24s ease;
}
.rep-strip-day.active .rsd-dow { color: rgba(255, 255, 255, 0.95); }
.rep-strip-day:hover .rsd-dow { color: rgba(255, 255, 255, 0.85); }

/* Big day number — the focal point */
.rsd-day {
  position: relative; z-index: 1;
  font-size: 18px; font-weight: 800; line-height: 1;
  color: #fff;
  letter-spacing: -0.02em;
  margin-top: 2px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.32);
  transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.rep-strip-day.active .rsd-day {
  background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 60%, #fb923c 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  transform: scale(1.18);
  filter: drop-shadow(0 2px 6px rgba(251, 191, 36, 0.45));
}

/* Bottom indicator bar — colour-coded by status, grows from 0 → 100% width
   when chip becomes active. Calm scale-x animation, no rotation. */
.rsd-indicator {
  position: absolute; left: 16%; right: 16%; bottom: 4px;
  height: 2.5px; border-radius: 2px;
  background: rgba(255, 255, 255, 0.08);
  z-index: 1;
  overflow: hidden;
}
.rsd-indicator-fill {
  display: block; height: 100%;
  width: 100%;
  background: linear-gradient(90deg, #5eead4, #facc15, #fb923c);
  transform-origin: center;
  transform: scaleX(0);
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.rep-strip-day.active .rsd-indicator-fill { transform: scaleX(1); }
.rep-strip-day[data-status="PRESENT"] .rsd-indicator-fill { background: linear-gradient(90deg, #2dd4bf, #5eead4, #facc15); }
.rep-strip-day[data-status="LATE"] .rsd-indicator-fill    { background: linear-gradient(90deg, #fde68a, #fbbf24, #fb923c); }
.rep-strip-day[data-status="ABSENT"] .rsd-indicator-fill  { background: linear-gradient(90deg, rgba(239, 68, 68, 0.6), #ef4444); }
.rep-strip-day[data-status="WFH"] .rsd-indicator-fill,
.rep-strip-day[data-status="REMOTE"] .rsd-indicator-fill  { background: linear-gradient(90deg, #818cf8, #a5b4fc); }
.rep-strip-day[data-status="HALF_DAY"] .rsd-indicator-fill{ background: linear-gradient(90deg, #fb923c, #fdba74); }
.rep-strip-day[data-status="HOLIDAY"] .rsd-indicator-fill { background: linear-gradient(90deg, #facc15, #fde047); }
.rep-strip-day[data-status="WEEK_OFF"] .rsd-indicator-fill{ background: linear-gradient(90deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.5)); }
/* Non-active chips: show a tiny dot at the centre of the indicator instead
   of a stretched line, so the row reads as "status dots" until you click. */
.rep-strip-day:not(.active) .rsd-indicator-fill {
  transform: scaleX(0.18);
  border-radius: 50%;
}
.rep-strip-day:not(.active):hover .rsd-indicator-fill { transform: scaleX(0.45); }

/* Side bar — a tiny vertical sliver showing hours worked. Only shows when
   hours > 0; not present at all otherwise so absent days look clean. */
.rsd-side-bar {
  position: absolute; right: 4px; top: 8px; bottom: 14px;
  width: 2px; border-radius: 2px;
  background: rgba(255, 255, 255, 0.06);
  z-index: 1;
  overflow: hidden;
  display: flex; align-items: flex-end;
}
.rsd-side-bar-fill {
  width: 100%;
  border-radius: 2px;
  background: linear-gradient(180deg, #5eead4 0%, #facc15 50%, #fb923c 100%);
  box-shadow: 0 0 5px rgba(251, 191, 36, 0.5);
  transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.rep-strip-day[data-status="LATE"] .rsd-side-bar-fill {
  background: linear-gradient(180deg, #fde68a, #fbbf24, #fb923c);
}

/* Honour reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .rs-aurora { animation: none; }
  .rsd-today-pulse { animation: none; }
  .rep-strip-day.active .rsd-spotlight { animation: none; }
}

/* Mobile fallback — 2-row 7×2 grid below 540px */
@media (max-width: 540px) {
  .rep-strip-track {
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .rsd-day { font-size: 16px; }
}

.rep-loading, .rep-empty {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; padding: 40px 20px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
}
.rep-loading .spin { animation: rep-spin 1s linear infinite; }
@keyframes rep-spin { to { transform: rotate(360deg); } }

.rep-body { display: flex; flex-direction: column; gap: 14px; }

.rep-summary {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 18px;
  padding: 16px 18px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.06), rgba(94, 234, 212, 0.04));
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.rep-summary-left { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.rep-summary-date { font-size: 16px; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
.rep-auto-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-radius: 10px;
  background: rgba(251, 146, 60, 0.12);
  border: 1px solid rgba(251, 146, 60, 0.35);
  color: #fb923c; font-size: 11px; font-weight: 600;
}
.rep-link { background: none; border: 0; color: #fbbf24; cursor: pointer; text-decoration: underline; font-weight: 700; padding: 0; }
.rep-link:hover { color: #fde68a; }

.rep-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(70px, auto));
  gap: 14px;
}
.rep-stat {
  display: flex; flex-direction: column; align-items: flex-end;
  padding: 8px 12px; border-radius: 10px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.06);
  min-width: 70px;
}
.rep-stat[data-tone="warn"] { border-color: rgba(251, 146, 60, 0.35); background: rgba(251, 146, 60, 0.06); }
.rep-stat[data-tone="good"] { border-color: rgba(94, 234, 212, 0.35); background: rgba(94, 234, 212, 0.06); }
.rep-stat-label { font-size: 9px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(255, 255, 255, 0.55); }
.rep-stat-value { font-size: 18px; font-weight: 800; color: #fff; line-height: 1.1; margin-top: 4px; }
.rep-stat-unit { font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.55); margin-left: 2px; }
.rep-stat-foot { font-size: 9px; color: rgba(255, 255, 255, 0.4); margin-top: 2px; }

.rep-cio {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center; gap: 14px;
  padding: 14px 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.rep-cio-block { display: flex; flex-direction: column; gap: 4px; }
.rep-cio-eyebrow {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase;
  color: rgba(94, 234, 212, 0.85);
}
.rep-cio-value { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.02em; }
.rep-cio-sub { font-size: 10px; color: rgba(255, 255, 255, 0.45); }
.rep-cio-arrow {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(94, 234, 212, 0.18));
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fbbf24;
}

.rep-section {
  padding: 14px 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.rep-section-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
}
.rep-section-title {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase;
  color: rgba(255, 255, 255, 0.85);
}
.rep-section-meta { font-size: 10px; color: rgba(255, 255, 255, 0.45); font-weight: 500; }
.rep-section-empty {
  padding: 14px 8px;
  text-align: center;
  font-size: 12px; color: rgba(255, 255, 255, 0.4); font-style: italic;
}

.rep-break-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.rep-break-row {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  align-items: center; gap: 12px;
  padding: 8px 12px; border-radius: 10px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 12px;
}
.rep-break-row.is-open { border-color: rgba(251, 146, 60, 0.5); background: rgba(251, 146, 60, 0.05); }
.rep-break-idx { color: rgba(255, 255, 255, 0.4); font-size: 10px; }
.rep-break-window { display: inline-flex; align-items: center; gap: 8px; color: rgba(255, 255, 255, 0.85); }
.rep-break-arrow { color: rgba(255, 255, 255, 0.3); }
.rep-break-dur { color: #fbbf24; font-weight: 700; }

.rep-tape { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.rep-tape-row {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 12px; border-radius: 9px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 12px;
}
.rep-tape-row.kind-IN { border-left: 3px solid #5eead4; }
.rep-tape-row.kind-OUT { border-left: 3px solid #fb923c; }
.rep-tape-row.kind-BREAK_START { border-left: 3px solid #facc15; }
.rep-tape-row.kind-BREAK_END { border-left: 3px solid #fde68a; }
.rep-tape-row.is-auto { background: rgba(251, 146, 60, 0.08); }
.rep-tape-time { color: #fff; font-weight: 700; min-width: 56px; }
.rep-tape-pill {
  padding: 3px 8px; border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  font-size: 11px; font-weight: 600;
}
.rep-tape-row.kind-IN .rep-tape-pill { background: rgba(94, 234, 212, 0.14); color: #5eead4; }
.rep-tape-row.kind-OUT .rep-tape-pill { background: rgba(251, 146, 60, 0.14); color: #fb923c; }
.rep-tape-row.kind-BREAK_START .rep-tape-pill,
.rep-tape-row.kind-BREAK_END .rep-tape-pill { background: rgba(250, 204, 21, 0.14); color: #facc15; }
.rep-tape-auto {
  font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
  padding: 2px 6px; border-radius: 4px;
  background: rgba(251, 146, 60, 0.18);
  color: #fb923c;
}
.rep-tape-flag {
  font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
  padding: 2px 6px; border-radius: 4px;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}
.rep-tape-source {
  margin-left: auto;
  font-size: 9px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}

.rep-remarks {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 14px; border-radius: 10px;
  background: rgba(94, 234, 212, 0.06);
  border: 1px solid rgba(94, 234, 212, 0.2);
  color: rgba(94, 234, 212, 0.95); font-size: 12px; line-height: 1.45;
}

/* ── LIGHT THEME OVERRIDES for the report drawer ── */
[data-theme="light"] .rep-strip {
  background:
    radial-gradient(ellipse 100% 70% at 50% 0%, rgba(217, 119, 6, 0.14), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.75), rgba(255, 250, 240, 0.4));
  border-color: rgba(180, 83, 9, 0.18);
}
[data-theme="light"] .rs-aurora-a { background: radial-gradient(circle, rgba(217, 119, 6, 0.4), transparent 65%); }
[data-theme="light"] .rs-aurora-b { background: radial-gradient(circle, rgba(13, 148, 136, 0.32), transparent 65%); }
[data-theme="light"] .rs-grid {
  background-image:
    linear-gradient(rgba(180, 83, 9, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(180, 83, 9, 0.06) 1px, transparent 1px);
}
[data-theme="light"] .rsh-eyebrow { color: rgba(107, 88, 64, 0.78); }
[data-theme="light"] .rsh-eyebrow svg { color: #d97706; }
[data-theme="light"] .rsh-current { color: #92400e; }
[data-theme="light"] .rep-strip-day {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 250, 240, 0.7));
  border-color: rgba(180, 83, 9, 0.18);
  color: #6b5840;
}
[data-theme="light"] .rep-strip-day:hover {
  border-color: rgba(217, 119, 6, 0.55);
  background: linear-gradient(180deg, rgba(254, 243, 199, 0.95), rgba(255, 250, 240, 0.85));
  color: #2c1810;
  box-shadow: 0 10px 22px -10px rgba(217, 119, 6, 0.35);
}
[data-theme="light"] .rep-strip-day.active {
  border-color: rgba(217, 119, 6, 0.7);
  background: linear-gradient(180deg, rgba(253, 230, 138, 0.7), rgba(255, 250, 240, 0.75));
  box-shadow:
    0 0 0 1px rgba(217, 119, 6, 0.45),
    0 14px 30px -14px rgba(217, 119, 6, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
[data-theme="light"] .rsd-spotlight {
  background: radial-gradient(circle, rgba(217, 119, 6, 0.35), transparent 60%);
}
[data-theme="light"] .rsd-dow { color: rgba(107, 88, 64, 0.7); }
[data-theme="light"] .rep-strip-day.active .rsd-dow { color: #2c1810; }
[data-theme="light"] .rsd-day { color: #2c1810; text-shadow: 0 1px 2px rgba(180, 83, 9, 0.15); }
[data-theme="light"] .rep-strip-day.active .rsd-day {
  background: linear-gradient(135deg, #b45309 0%, #d97706 60%, #f59e0b 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 6px rgba(217, 119, 6, 0.35));
}
[data-theme="light"] .rsd-indicator { background: rgba(180, 83, 9, 0.10); }
[data-theme="light"] .rsd-side-bar { background: rgba(180, 83, 9, 0.10); }
[data-theme="light"] .rep-loading, [data-theme="light"] .rep-empty { color: rgba(107, 88, 64, 0.65); }
[data-theme="light"] .rep-summary { background: linear-gradient(135deg, rgba(217, 119, 6, 0.06), rgba(13, 148, 136, 0.04)); border-color: rgba(180, 83, 9, 0.18); }
[data-theme="light"] .rep-summary-date { color: #2c1810; }
[data-theme="light"] .rep-auto-pill { background: rgba(217, 119, 6, 0.1); border-color: rgba(217, 119, 6, 0.35); color: #92400e; }
[data-theme="light"] .rep-link { color: #d97706; }
[data-theme="light"] .rep-link:hover { color: #b45309; }
[data-theme="light"] .rep-stat { background: rgba(255, 250, 240, 0.7); border-color: rgba(180, 83, 9, 0.14); }
[data-theme="light"] .rep-stat[data-tone="warn"] { background: rgba(217, 119, 6, 0.08); border-color: rgba(217, 119, 6, 0.35); }
[data-theme="light"] .rep-stat[data-tone="good"] { background: rgba(13, 148, 136, 0.08); border-color: rgba(13, 148, 136, 0.3); }
[data-theme="light"] .rep-stat-label { color: rgba(107, 88, 64, 0.75); }
[data-theme="light"] .rep-stat-value { color: #2c1810; }
[data-theme="light"] .rep-stat-unit { color: rgba(107, 88, 64, 0.65); }
[data-theme="light"] .rep-stat-foot { color: rgba(107, 88, 64, 0.55); }
[data-theme="light"] .rep-cio { background: rgba(255, 250, 240, 0.65); border-color: rgba(180, 83, 9, 0.18); }
[data-theme="light"] .rep-cio-eyebrow { color: #0d9488; }
[data-theme="light"] .rep-cio-value { color: #2c1810; }
[data-theme="light"] .rep-cio-sub { color: rgba(107, 88, 64, 0.65); }
[data-theme="light"] .rep-cio-arrow { background: linear-gradient(135deg, rgba(217, 119, 6, 0.16), rgba(13, 148, 136, 0.14)); border-color: rgba(180, 83, 9, 0.22); color: #d97706; }
[data-theme="light"] .rep-section { background: rgba(255, 250, 240, 0.65); border-color: rgba(180, 83, 9, 0.18); }
[data-theme="light"] .rep-section-head { border-bottom-color: rgba(180, 83, 9, 0.12); }
[data-theme="light"] .rep-section-title { color: #2c1810; }
[data-theme="light"] .rep-section-meta { color: rgba(107, 88, 64, 0.65); }
[data-theme="light"] .rep-section-empty { color: rgba(107, 88, 64, 0.55); }
[data-theme="light"] .rep-break-row { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.12); }
[data-theme="light"] .rep-break-row.is-open { background: rgba(217, 119, 6, 0.08); border-color: rgba(217, 119, 6, 0.45); }
[data-theme="light"] .rep-break-idx { color: rgba(107, 88, 64, 0.55); }
[data-theme="light"] .rep-break-window { color: #2c1810; }
[data-theme="light"] .rep-break-arrow { color: rgba(107, 88, 64, 0.45); }
[data-theme="light"] .rep-break-dur { color: #d97706; }
[data-theme="light"] .rep-tape-row { background: rgba(255, 250, 240, 0.8); border-color: rgba(180, 83, 9, 0.1); }
[data-theme="light"] .rep-tape-row.is-auto { background: rgba(217, 119, 6, 0.08); }
[data-theme="light"] .rep-tape-time { color: #2c1810; }
[data-theme="light"] .rep-tape-pill { background: rgba(180, 83, 9, 0.08); color: #2c1810; }
[data-theme="light"] .rep-tape-row.kind-IN .rep-tape-pill { background: rgba(13, 148, 136, 0.14); color: #0f766e; }
[data-theme="light"] .rep-tape-row.kind-OUT .rep-tape-pill { background: rgba(217, 119, 6, 0.16); color: #92400e; }
[data-theme="light"] .rep-tape-row.kind-BREAK_START .rep-tape-pill,
[data-theme="light"] .rep-tape-row.kind-BREAK_END .rep-tape-pill { background: rgba(202, 138, 4, 0.15); color: #92400e; }
[data-theme="light"] .rep-tape-source { color: rgba(107, 88, 64, 0.5); }
[data-theme="light"] .rep-remarks { background: rgba(13, 148, 136, 0.06); border-color: rgba(13, 148, 136, 0.25); color: #0f766e; }

@media (max-width: 620px) {
  .rep-summary { grid-template-columns: 1fr; }
  .rep-summary-grid { grid-template-columns: repeat(2, 1fr); }
  .rep-cio { grid-template-columns: 1fr; }
  .rep-cio-arrow { transform: rotate(90deg); justify-self: center; }
}

/* The orphan .smodal styles from Rounds 4-6 are unused now (we no longer
   render `.smodal-shell` / `.smodal`). They're left dormant in the cascade
   because removing them risks breaking unrelated rules — they only paint
   when one of those classes is rendered, which they no longer are. */

/* ═══════════════════════ HALF-DAY MODAL + BADGE ═══════════════════════ */
.qa-icon-hd {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.20), rgba(234, 88, 12, 0.16)) !important;
  color: #fbbf24 !important;
  border-color: rgba(251, 191, 36, 0.40) !important;
}
[data-theme="light"] .qa-icon-hd {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.30), rgba(234, 88, 12, 0.20)) !important;
  color: #92400e !important;
  border-color: rgba(180, 83, 9, 0.40) !important;
}

/* ═══════════════════════ OT MODAL + BADGE ═══════════════════════ */
.qa-icon-ot {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.22), rgba(234, 88, 12, 0.18)) !important;
  color: #fb923c !important;
  border-color: rgba(251, 146, 60, 0.45) !important;
}
[data-theme="light"] .qa-icon-ot {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.30), rgba(234, 88, 12, 0.22)) !important;
  color: #9a3412 !important;
  border-color: rgba(194, 65, 12, 0.45) !important;
}

/* Policy hint inside the OT modal — explains the workflow in a glance */
.ot-policy-hint {
  display: flex; gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.08), rgba(20, 184, 166, 0.06));
  border: 1px dashed rgba(251, 146, 60, 0.32);
  font-size: 12px; line-height: 1.5;
  color: var(--hr-text-muted);
}
.ot-policy-hint > svg { color: #fb923c; flex-shrink: 0; margin-top: 2px; }
.ot-policy-hint strong { color: var(--hr-text); display: block; font-weight: 700; margin-bottom: 4px; font-size: 12px; }
.ot-policy-hint ul { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 3px; }
.ot-policy-hint em { color: #fb923c; font-style: normal; font-weight: 600; }
[data-theme="light"] .ot-policy-hint {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.10), rgba(13, 148, 136, 0.06));
  border-color: rgba(194, 65, 12, 0.32);
  color: #6b5840;
}
[data-theme="light"] .ot-policy-hint > svg { color: #c2410c; }
[data-theme="light"] .ot-policy-hint strong { color: #1a1410; }
[data-theme="light"] .ot-policy-hint em { color: #c2410c; }

.hd-self-field { display: flex; flex-direction: column; gap: 7px; }
.hd-self-label {
  font-size: 9.5px; letter-spacing: 1.2px; text-transform: uppercase;
  font-weight: 800;
  color: rgba(251, 191, 36, 0.85);
}
.hd-self-label em { color: #f87171; font-style: normal; font-weight: 600; }
[data-theme="light"] .hd-self-label { color: #b45309; }
[data-theme="light"] .hd-self-label em { color: #b91c1c; }

.hd-self-half-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.hd-self-half-card {
  position: relative;
  padding: 12px 14px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.22);
  text-align: left; cursor: pointer;
  transition: border-color .25s, background .25s, transform .18s;
}
.hd-self-half-card:hover { border-color: rgba(251, 191, 36, 0.50); }
.hd-self-half-card.active {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(234, 88, 12, 0.12));
  border-color: rgba(251, 191, 36, 0.58);
  box-shadow: 0 8px 20px -10px rgba(251, 146, 60, 0.45);
}
.hd-self-half-visual {
  display: flex; height: 20px;
  border-radius: 6px; overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(251, 191, 36, 0.20);
  margin-bottom: 7px;
}
.hd-self-am, .hd-self-pm {
  flex: 1; display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 800; letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.55);
  transition: background .25s, color .25s;
}
.hd-self-am.off, .hd-self-pm.off {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.50), rgba(234, 88, 12, 0.40));
  color: #1f1408;
}
.hd-self-half-title { display: block; font-size: 13px; font-weight: 800; color: #fff; }
.hd-self-half-sub { display: block; font-size: 10.5px; color: rgba(255,255,255,0.6); margin-top: 1px; }
[data-theme="light"] .hd-self-half-title { color: #1a1410; }
[data-theme="light"] .hd-self-half-sub { color: #6b5840; }
[data-theme="light"] .hd-self-half-card { background: rgba(255, 250, 240, 0.65); border-color: rgba(180, 83, 9, 0.22); }
[data-theme="light"] .hd-self-half-visual { background: rgba(255, 255, 255, 0.55); border-color: rgba(180, 83, 9, 0.20); }
[data-theme="light"] .hd-self-am, [data-theme="light"] .hd-self-pm { color: #6b5840; }

.hd-self-half-check {
  position: absolute; top: 8px; right: 8px;
  background: linear-gradient(135deg, #fbbf24, #ea580c);
  color: #fff;
  border-radius: 50%; padding: 2px;
}

.hd-self-reason-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.hd-self-rt-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px;
  border-radius: 999px;
  font: inherit; font-size: 11px; font-weight: 800; letter-spacing: 0.4px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid;
  cursor: pointer;
  transition: background .22s, border-color .22s, transform .18s;
}
.hd-self-rt-chip:hover { transform: translateY(-1px); }
.hd-self-rt-chip.tone-rose   { color: #f9a8d4; border-color: rgba(244, 114, 182, 0.30); }
.hd-self-rt-chip.tone-red    { color: #fca5a5; border-color: rgba(220, 38, 38, 0.30); }
.hd-self-rt-chip.tone-amber  { color: #fcd34d; border-color: rgba(251, 191, 36, 0.30); }
.hd-self-rt-chip.tone-teal   { color: #5eead4; border-color: rgba(20, 184, 166, 0.30); }
.hd-self-rt-chip.tone-gray   { color: #cbd5e1; border-color: rgba(148, 163, 184, 0.30); }
.hd-self-rt-chip.tone-rose.active   { background: rgba(244, 114, 182, 0.22);  color: #fbcfe8; }
.hd-self-rt-chip.tone-red.active    { background: rgba(220, 38, 38, 0.22);    color: #fecaca; }
.hd-self-rt-chip.tone-amber.active  { background: rgba(251, 191, 36, 0.22);   color: #fef08a; }
.hd-self-rt-chip.tone-teal.active   { background: rgba(20, 184, 166, 0.22);   color: #ccfbf1; }
.hd-self-rt-chip.tone-gray.active   { background: rgba(148, 163, 184, 0.22);  color: #e2e8f0; }
[data-theme="light"] .hd-self-rt-chip { background: rgba(255, 250, 240, 0.7); }
[data-theme="light"] .hd-self-rt-chip.tone-rose  { color: #be185d; }
[data-theme="light"] .hd-self-rt-chip.tone-red   { color: #7f1d1d; }
[data-theme="light"] .hd-self-rt-chip.tone-amber { color: #92400e; }
[data-theme="light"] .hd-self-rt-chip.tone-teal  { color: #115e59; }
[data-theme="light"] .hd-self-rt-chip.tone-gray  { color: #334155; }

/* Inline conflict banner shown when the user picks a holiday / weekly-off
   date in the half-day modal. Two tones (holiday=amber, week_off=slate)
   so the visual instantly says which kind of day this is. */
.hd-conflict-banner {
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 10px;
  align-items: center;
  padding: 10px 13px;
  border-radius: 12px;
  border: 1px solid;
  font-size: 11.5px; line-height: 1.45;
}
.hd-conflict-banner[data-type="holiday"] {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.16), rgba(234, 88, 12, 0.10));
  border-color: rgba(251, 146, 60, 0.40);
  color: #fde68a;
}
.hd-conflict-banner[data-type="week_off"] {
  background: linear-gradient(135deg, rgba(100, 116, 139, 0.20), rgba(71, 85, 105, 0.12));
  border-color: rgba(148, 163, 184, 0.40);
  color: #e2e8f0;
}
.hd-conflict-icon {
  width: 32px; height: 32px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid currentColor;
  background: rgba(0, 0, 0, 0.18);
}
.hd-conflict-banner[data-type="holiday"] .hd-conflict-icon {
  background: linear-gradient(135deg, #fbbf24, #ea580c);
  color: #1f1408;
  border-color: rgba(251, 146, 60, 0.55);
}
.hd-conflict-banner[data-type="week_off"] .hd-conflict-icon {
  background: linear-gradient(135deg, #64748b, #334155);
  color: #fff;
  border-color: rgba(148, 163, 184, 0.55);
}
.hd-conflict-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.hd-conflict-text strong { font-size: 11.5px; font-weight: 800; letter-spacing: 0.3px; }
.hd-conflict-text span { font-size: 11px; opacity: 0.85; }
[data-theme="light"] .hd-conflict-banner[data-type="holiday"] {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(234, 88, 12, 0.14));
  border-color: rgba(180, 83, 9, 0.42);
  color: #92400e;
}
[data-theme="light"] .hd-conflict-banner[data-type="week_off"] {
  background: linear-gradient(135deg, rgba(100, 116, 139, 0.18), rgba(71, 85, 105, 0.10));
  border-color: rgba(71, 85, 105, 0.40);
  color: #334155;
}

/* My Requests — half-day tag + admin override badge */
.myreq-half-tag {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 1px 6px;
  border-radius: 5px;
  background: rgba(251, 191, 36, 0.16);
  color: #fcd34d;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.3px;
}
[data-theme="light"] .myreq-half-tag { background: rgba(251, 191, 36, 0.24); color: #92400e; }
.myreq-badge {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 1px 6px;
  border-radius: 5px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.20), rgba(234, 88, 12, 0.16));
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.40);
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase;
  margin-left: 4px;
}
[data-theme="light"] .myreq-badge { color: #92400e; border-color: rgba(180, 83, 9, 0.40); }
</style>
