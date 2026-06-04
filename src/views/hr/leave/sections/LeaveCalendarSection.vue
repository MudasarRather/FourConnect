<template>
  <div class="atlas" :data-view="view">
    <!-- ═════════════════════════════════════════════════════════════════
         AMBIENT BACKDROP — drifting gold mist + dot grid + scan
         ════════════════════════════════════════════════════════════════ -->
    <div class="atl-bg" aria-hidden="true">
      <span class="bg-mist a" />
      <span class="bg-mist b" />
      <span class="bg-mist c" />
      <span class="bg-grid" />
      <span class="bg-stars" />
      <span class="bg-scan" />
    </div>

    <!-- ═════════════════════════════════════════════════════════════════
         01 · HERO — SPOTLIGHT + KPI STRIP
         Left: large "today bandwidth" radial gauge with month centred.
         Right: 4 KPI tiles (out today, departing, returning, conflicts).
         ════════════════════════════════════════════════════════════════ -->
    <Motion class="atl-hero" as="section"
      :initial="{ opacity: 0, y: 24 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }"
      :style="{
        transform: `perspective(1400px) rotateX(${heroTilt.rx}deg) rotateY(${heroTilt.ry}deg)`,
        transformStyle: 'preserve-3d',
      }"
      @mousemove="onHeroMouseMove"
      @mouseleave="onHeroMouseLeave"
    >
      <!-- Corner brackets (different from radar's bracket / vault's rivet style) -->
      <span class="ah-corner tl" /><span class="ah-corner tr" />
      <span class="ah-corner bl" /><span class="ah-corner br" />

      <!-- LEFT — spotlight (radial bandwidth gauge) -->
      <div class="atl-spot"
        :style="{ transform: `translateZ(40px)` }"
      >
        <Motion as="div" class="spot-disc"
          :initial="{ opacity: 0, scale: 0.86, rotate: -8 }"
          :animate="{ opacity: 1, scale: 1, rotate: 0 }"
          :transition="{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }"
        >
          <svg viewBox="0 0 280 280" class="spot-svg" aria-hidden="true">
            <defs>
              <linearGradient id="spotArc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stop-color="#fef3c7" />
                <stop offset="55%"  stop-color="#fbbf24" />
                <stop offset="100%" stop-color="#ea580c" />
              </linearGradient>
              <radialGradient id="spotCore" cx="0.5" cy="0.5" r="0.6">
                <stop offset="0%"   stop-color="rgba(251,191,36,0.45)" />
                <stop offset="55%"  stop-color="rgba(251,191,36,0.08)" />
                <stop offset="100%" stop-color="rgba(251,191,36,0)" />
              </radialGradient>
              <filter id="spotGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            <!-- Soft inner glow -->
            <circle cx="140" cy="140" r="115" fill="url(#spotCore)" />

            <!-- Tick marks (60), wrapped in a slowly-rotating group -->
            <g class="sp-ticks">
              <line v-for="t in 60" :key="`t-${t}`"
                :x1="140 + 124 * Math.cos((t - 1) * Math.PI / 30 - Math.PI / 2)"
                :y1="140 + 124 * Math.sin((t - 1) * Math.PI / 30 - Math.PI / 2)"
                :x2="140 + (t % 5 === 0 ? 112 : 118) * Math.cos((t - 1) * Math.PI / 30 - Math.PI / 2)"
                :y2="140 + (t % 5 === 0 ? 112 : 118) * Math.sin((t - 1) * Math.PI / 30 - Math.PI / 2)"
                :class="['sp-tick', { 'sp-tick-major': t % 5 === 0 }]"
                stroke-linecap="round"
              />
            </g>

            <!-- Dim track -->
            <circle cx="140" cy="140" r="98" fill="none"
              class="sp-track" stroke-width="10" />

            <!-- Availability arc (filled portion = team available right now) -->
            <circle cx="140" cy="140" r="98" fill="none"
              stroke="url(#spotArc)" stroke-width="10" stroke-linecap="round"
              :stroke-dasharray="2 * Math.PI * 98"
              :stroke-dashoffset="(2 * Math.PI * 98) * (1 - bandwidthRatio)"
              transform="rotate(-90 140 140)"
              filter="url(#spotGlow)"
              class="sp-fill"
            />

            <!-- Centre indicator triangle -->
            <polygon points="140,28 134,40 146,40" class="sp-pointer" />
          </svg>

          <!-- Centre readout -->
          <div class="spot-core">
            <span class="sc-eye leave-mono">
              <span class="sc-led" :data-tone="bandwidthTone" /> BANDWIDTH · TODAY
            </span>
            <strong class="sc-num leave-mono">
              {{ bandwidthPct }}<small>%</small>
            </strong>
            <span class="sc-divider" />
            <div class="sc-row leave-mono">
              <span><strong>{{ outToday }}</strong> on leave</span>
              <span class="sc-dot" />
              <span><strong>{{ inToday }}</strong> in office</span>
            </div>
          </div>
        </Motion>
      </div>

      <!-- RIGHT — copy block + KPIs -->
      <div class="atl-copy">
        <Motion as="div" class="ac-led"
          :initial="{ opacity: 0, x: 14 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.5, delay: 0.15 }"
        >
          <span class="led-dot" :data-tone="bandwidthTone" />
          <span class="led-text leave-mono">TIMELINE · LIVE</span>
          <span class="led-sep">/</span>
          <span class="led-text leave-mono">{{ liveClock }}</span>
        </Motion>

        <h1 class="ac-title">
          <span class="t-row">
            <em class="word-month">{{ monthShort }}</em>
            <span class="word-year leave-mono">'{{ yearShort }}</span>
          </span>
          <span class="t-row second">— the team's gravity, mapped.</span>
        </h1>
        <p class="ac-sub">
          A live cinematic of who's in and who's out across the next four weeks.
          Hover a frame for details, click a day for the spotlight, switch to
          the swimlane view for a Gantt-style read of overlapping breaks.
        </p>

        <!-- KPI strip (4-up) -->
        <Motion as="div" class="ac-kpis"
          :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.55, delay: 0.3 }"
        >
          <Motion v-for="(k, i) in kpis" :key="k.key" as="div"
            class="kp" :data-tone="k.tone"
            :initial="{ opacity: 0, y: 10, scale: 0.95 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :transition="{ duration: 0.45, delay: 0.36 + i * 0.07, ease: [0.34, 1.56, 0.64, 1] }"
            :whileHover="{ y: -3 }"
          >
            <header class="kp-head">
              <component :is="k.icon" :size="12" />
              <span class="kp-lbl">{{ k.label }}</span>
            </header>
            <div class="kp-val leave-mono">{{ k.value }}<small v-if="k.unit">{{ k.unit }}</small></div>
            <div class="kp-foot leave-mono">{{ k.foot }}</div>
          </Motion>
        </Motion>
      </div>
    </Motion>

    <!-- ═════════════════════════════════════════════════════════════════
         02 · FILMSTRIP — horizontal 12-month navigator
         Perforated edges, each frame = a month with mini activity bars.
         Current month frame glows, "playhead" indicator anchors below.
         ════════════════════════════════════════════════════════════════ -->
    <Motion as="section" class="filmstrip"
      :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, delay: 0.18 }"
    >
      <!-- Perforation rows top + bottom -->
      <div class="fs-perf top"><span v-for="n in 24" :key="`pt-${n}`" /></div>
      <div class="fs-perf bot"><span v-for="n in 24" :key="`pb-${n}`" /></div>

      <button class="fs-nav prev" @click="shiftMonth(-1)" aria-label="Previous month">
        <ChevronLeft :size="14" />
      </button>

      <div class="fs-track">
        <Motion v-for="(f, i) in filmFrames" :key="f.key" as="button" type="button"
          class="fs-frame" :class="{ 'is-current': f.isCurrent, 'is-month': f.isShownMonth }"
          :initial="{ opacity: 0, y: 8, scale: 0.94 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.45, delay: 0.05 + i * 0.04, ease: [0.34, 1.56, 0.64, 1] }"
          :whileHover="{ y: -3, scale: 1.04 }"
          :whileTap="{ scale: 0.96 }"
          @click="jumpToMonth(f.date)"
        >
          <span class="fs-key leave-mono">{{ f.short }}</span>
          <span class="fs-year leave-mono">'{{ f.yearShort }}</span>
          <div class="fs-bars">
            <span v-for="(h, b) in f.bars" :key="`fb-${i}-${b}`"
              class="fs-bar" :style="{ height: h + '%' }"
            />
          </div>
          <span v-if="f.isShownMonth" class="fs-playhead" />
        </Motion>
      </div>

      <button class="fs-nav next" @click="shiftMonth(1)" aria-label="Next month">
        <ChevronRight :size="14" />
      </button>
    </Motion>

    <!-- ═════════════════════════════════════════════════════════════════
         03 · FILTERS + VIEW TOGGLE + ACTIONS
         ════════════════════════════════════════════════════════════════ -->
    <Motion as="section" class="atl-tools"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, delay: 0.28 }"
    >
      <div class="tools-l">
        <button class="t-btn" @click="goToday">
          <Crosshair :size="13" /><span>Today</span>
        </button>

        <!-- Department dropdown -->
        <div class="ddw" :class="{ open: openDdw === 'dept' }">
          <button class="ddw-trigger" type="button" @click.stop="toggleDdw('dept')">
            <Building2 :size="12" class="ddw-ic" />
            <span class="ddw-lbl">{{ deptLabel }}</span>
            <ChevronDown :size="11" class="ddw-chev" />
          </button>
          <transition name="ddw-pop">
            <div v-if="openDdw === 'dept'" class="ddw-panel" @click.stop>
              <button class="ddw-opt" :class="{ on: !filters.department_id }"
                @click="pickDept(null)"
              >
                <span class="ddw-opt-dot" />
                <span>All departments</span>
                <Check v-if="!filters.department_id" :size="11" class="ddw-opt-check" />
              </button>
              <button v-for="d in departments" :key="d.id"
                class="ddw-opt"
                :class="{ on: filters.department_id === d.id }"
                @click="pickDept(d.id)"
              >
                <span class="ddw-opt-dot" />
                <span>{{ d.name }}</span>
                <Check v-if="filters.department_id === d.id" :size="11" class="ddw-opt-check" />
              </button>
            </div>
          </transition>
        </div>

        <!-- Leave-type dropdown -->
        <div class="ddw" :class="{ open: openDdw === 'type' }">
          <button class="ddw-trigger" type="button" @click.stop="toggleDdw('type')">
            <Layers :size="12" class="ddw-ic" />
            <span class="ddw-lbl">{{ typeLabel }}</span>
            <ChevronDown :size="11" class="ddw-chev" />
          </button>
          <transition name="ddw-pop">
            <div v-if="openDdw === 'type'" class="ddw-panel" @click.stop>
              <button class="ddw-opt" :class="{ on: !filters.leave_type }"
                @click="pickType(null)"
              >
                <span class="ddw-opt-dot" />
                <span>All leave types</span>
                <Check v-if="!filters.leave_type" :size="11" class="ddw-opt-check" />
              </button>
              <button v-for="t in LEAVE_TYPES" :key="t.key"
                class="ddw-opt"
                :class="{ on: filters.leave_type === t.key }"
                @click="pickType(t.key)"
              >
                <span class="ddw-opt-dot" :style="{ background: t.hex || '#fbbf24', boxShadow: `0 0 6px ${t.hex || '#fbbf24'}` }" />
                <span>{{ t.label }}</span>
                <Check v-if="filters.leave_type === t.key" :size="11" class="ddw-opt-check" />
              </button>
            </div>
          </transition>
        </div>

        <!-- Shift dropdown — drives the off-day hatching on the heat-strip
             and atl-grid. Picking a shift swaps the weekend pattern to that
             shift's weekly_off_days (Python convention: 0=Mon..6=Sun). -->
        <div class="ddw" :class="{ open: openDdw === 'shift' }">
          <button class="ddw-trigger" type="button" @click.stop="toggleDdw('shift')">
            <Clock :size="12" class="ddw-ic" />
            <span class="ddw-lbl">{{ shiftLabel }}</span>
            <ChevronDown :size="11" class="ddw-chev" />
          </button>
          <transition name="ddw-pop">
            <div v-if="openDdw === 'shift'" class="ddw-panel" @click.stop>
              <button class="ddw-opt" :class="{ on: !filters.shift_id }"
                @click="pickShift(null)"
              >
                <span class="ddw-opt-dot" />
                <span>All shifts <small class="ddw-opt-meta">(Sat + Sun off)</small></span>
                <Check v-if="!filters.shift_id" :size="11" class="ddw-opt-check" />
              </button>
              <button v-for="s in shifts" :key="s.id"
                class="ddw-opt"
                :class="{ on: filters.shift_id === s.id }"
                @click="pickShift(s.id)"
              >
                <span class="ddw-opt-dot" :style="{ background: '#fb923c', boxShadow: '0 0 6px rgba(251, 146, 60, 0.65)' }" />
                <span>
                  {{ s.name }}
                  <small class="ddw-opt-meta">({{ shiftOffLabel(s) }})</small>
                </span>
                <Check v-if="filters.shift_id === s.id" :size="11" class="ddw-opt-check" />
              </button>
              <div v-if="!shifts.length" class="ddw-empty">
                No active shifts configured.
              </div>
            </div>
          </transition>
        </div>

        <label class="t-chip" :class="{ 'is-on': showConflicts }">
          <input type="checkbox" v-model="showConflicts" />
          <Zap :size="11" /><span>Conflicts</span>
        </label>
      </div>

      <div class="tools-r">
        <!-- View toggle -->
        <div class="view-pill">
          <button :class="['vp-btn', { active: view === 'grid' }]" @click="view = 'grid'">
            <LayoutGrid :size="12" /><span>Grid</span>
          </button>
          <button :class="['vp-btn', { active: view === 'gantt' }]" @click="view = 'gantt'">
            <BarChart3 :size="12" /><span>Swimlanes</span>
          </button>
          <span class="vp-slider" :class="`s-${view}`" />
        </div>
        <button class="t-btn primary" @click="exportIcs">
          <Download :size="13" /><span>Export .ics</span>
        </button>
      </div>
    </Motion>

    <!-- Active-shift week-off chip (only when a shift filter is engaged) -->
    <Motion v-if="selectedShift" as="div" class="shift-chip"
      :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
      :transition="{ duration: 0.35 }"
    >
      <Clock :size="11" />
      <span>
        Calendar follows <b>{{ selectedShift.name }}</b> · week-off:
        <b>{{ weeklyOffLabel }}</b>
      </span>
      <button class="shift-chip-x" @click="pickShift(null)" aria-label="Clear shift filter">
        <X :size="11" />
      </button>
    </Motion>

    <!-- Heat ribbon — 1-row daily intensity bar above the main view -->
    <div class="heat-strip" :style="`grid-template-columns: repeat(${days.length}, minmax(0, 1fr))`">
      <Motion v-for="(d, i) in days" :key="d.iso" as="button" type="button"
        class="heat-cell"
        :class="{ today: d.isToday, conflict: showConflicts && d.conflict, weekend: d.isWeekend, busy: d.count > 0 }"
        :style="{ '--c': intensity(d.count) }"
        :initial="{ opacity: 0, scaleY: 0.4 }"
        :animate="{ opacity: 1, scaleY: 1 }"
        :transition="{ duration: 0.4, delay: 0.32 + i * 0.005, ease: [0.34, 1.56, 0.64, 1] }"
        @mouseenter="(e) => onHeatEnter(d, e)"
        @mousemove="onHeatMove"
        @mouseleave="onHeatLeave"
        @click="spotlightDay(d.iso)"
      >
        <span class="heat-day leave-mono">{{ d.dayNum }}</span>
      </Motion>
    </div>

    <!-- ═════════════════════════════════════════════════════════════════
         04A · MONTH GRID (default view) — day cards w/ avatar stacks
         ════════════════════════════════════════════════════════════════ -->
    <section v-if="view === 'grid'" class="atl-grid">
      <header class="grid-head">
        <span v-for="(w, i) in WEEK_HEAD" :key="w" class="gh-cell">
          {{ w }}
        </span>
      </header>

      <div v-if="loading && !entries.length" class="grid-skel">
        <div v-for="i in 35" :key="`g-sk-${i}`" class="leave-skel" style="height:96px;border-radius:14px" />
      </div>

      <div v-else class="grid-body">
        <Motion v-for="(c, i) in gridCells" :key="c.key" as="article"
          class="cell" :class="{
            'is-today': c.isToday,
            'is-weekend': c.isWeekend,
            'is-out-of-month': !c.isShownMonth,
            'has-conflict': showConflicts && c.conflict,
            'has-load': c.events.length > 0,
          }"
          :data-load="c.loadTier"
          :initial="{ opacity: 0, y: 20, rotateX: -22, scale: 0.94 }"
          :animate="{ opacity: 1, y: 0, rotateX: 0, scale: 1 }"
          :transition="{ duration: 0.6, delay: 0.04 + (i % 7) * 0.04 + Math.floor(i / 7) * 0.05, ease: [0.16, 1, 0.3, 1] }"
          @click="spotlightDay(c.iso)"
        >
          <!-- Top-row: day number + indicators -->
          <header class="cl-head">
            <span class="cl-day leave-mono">{{ c.dayNum }}</span>
            <span v-if="c.isToday" class="cl-today">TODAY</span>
            <span v-if="c.events.length" class="cl-count leave-mono">{{ c.events.length }}</span>
          </header>

          <!-- Type chip strip (max 3 types) -->
          <div class="cl-chips">
            <span v-for="(t, ix) in c.typeChips" :key="`ck-${i}-${ix}`"
              class="cl-chip"
              :style="{ background: t.hex, '--c': t.hex }"
              :title="`${t.count} × ${t.label}`"
            >
              <span class="cc-dot" />
              <span class="cc-num leave-mono">{{ t.count }}</span>
            </span>
          </div>

          <!-- Avatar stack -->
          <div v-if="c.events.length" class="cl-avatars">
            <span v-for="(a, ix) in c.avatarStack" :key="`av-${i}-${ix}`"
              class="av" :style="{ '--c': a.hex, zIndex: 4 - ix }"
              :title="a.name"
            >
              {{ a.init }}
            </span>
            <span v-if="c.events.length > 4" class="av-more leave-mono">+{{ c.events.length - 4 }}</span>
          </div>

          <!-- Density rail -->
          <span class="cl-rail">
            <span class="cl-fill" :style="{ width: c.loadPct + '%' }" />
          </span>

          <!-- Conflict indicator -->
          <span v-if="showConflicts && c.conflict" class="cl-conflict" title="3+ from same dept overlapping">
            <Zap :size="9" />
          </span>
        </Motion>
      </div>
    </section>

    <!-- ═════════════════════════════════════════════════════════════════
         04B · SWIMLANES (alt view) — Gantt-style per-employee
         ════════════════════════════════════════════════════════════════ -->
    <section v-else class="atl-swim">
      <div class="swim-frame">
        <!-- Day header: weekday letter + day number stacked -->
        <header class="swim-head" :style="`grid-template-columns: 220px repeat(${days.length}, minmax(0, 1fr))`">
          <div class="sh-id-cell">
            <span class="sh-id-eye leave-mono"><span class="sh-id-dot" /> ROSTER</span>
            <span class="sh-id-meta leave-mono">{{ employeesInView.length }} on the bench</span>
          </div>
          <div v-for="d in days" :key="`sh-${d.iso}`" class="sh-day"
            :class="{ today: d.isToday, weekend: d.isWeekend, busy: d.count > 0 }"
            @mouseenter="(e) => onHeatEnter(d, e)"
            @mousemove="onHeatMove"
            @mouseleave="onHeatLeave"
            @click="spotlightDay(d.iso)"
          >
            <span class="sh-wd leave-mono">{{ d.weekdayFull[0] }}</span>
            <span class="sh-num leave-mono">{{ d.dayNum }}</span>
            <span v-if="d.isToday" class="sh-today-pip" />
          </div>
        </header>

        <!-- Vertical "today" line that spans the entire body -->
        <span v-if="todayColIndex !== -1" class="swim-today-line"
          :style="{ left: `calc(220px + ((100% - 220px) / ${days.length}) * ${todayColIndex} + ((100% - 220px) / ${days.length}) / 2)` }"
        />

        <div v-if="loading && !entries.length" class="grid-skel">
          <div v-for="i in 5" :key="`s-sk-${i}`" class="leave-skel" style="height:48px;border-radius:12px" />
        </div>

        <div v-else-if="!employeesInView.length" class="swim-empty">
          <div class="se-mark">
            <CalendarRange :size="36" />
            <span class="se-orbit" />
            <span class="se-pulse" />
          </div>
          <strong>No leaves on this swimlane.</strong>
          <span>Adjust filters — or jump to a different month using the filmstrip above. Every break in the chosen window will surface here as a Gantt bar.</span>
        </div>

        <div v-else class="swim-body">
          <!--
            Column count is driven through the `--days` CSS var (object style),
            NOT a string `grid-template-columns:` style. A string style makes
            Vue rewrite the element's whole `style` (cssText) on every re-render,
            which wipes the `transform` motion-v is animating for the rotateY
            entrance — the two then fight and the row sticks mid-animation
            (the "swimlanes freeze" bug). An object style with only a custom
            property never touches `transform`, so motion-v owns it cleanly.
          -->
          <Motion v-for="(emp, idx) in employeesInView" :key="emp.id" as="div"
            class="swim-row"
            :style="{ '--days': days.length }"
            :initial="{ opacity: 0, x: -20, rotateY: -8 }"
            :animate="{ opacity: 1, x: 0, rotateY: 0 }"
            :transition="{ duration: 0.55, delay: 0.04 + idx * 0.05, ease: [0.16, 1, 0.3, 1] }"
          >
            <div class="swim-id">
              <span class="si-av" :style="{ '--c': emp.tone }">
                <span class="si-av-init">{{ emp.initials }}</span>
                <span class="si-av-glow" />
              </span>
              <div class="si-info">
                <strong>{{ emp.name }}</strong>
                <span class="leave-mono">
                  {{ emp.code }}
                  <span v-if="emp.dept" class="si-sep">·</span>
                  <span v-if="emp.dept">{{ emp.dept }}</span>
                </span>
              </div>
              <span class="si-count leave-mono">{{ emp.bars.length }}</span>
            </div>
            <div class="swim-track" :style="`grid-column: 2 / span ${days.length}; grid-template-columns: repeat(${days.length}, minmax(0, 1fr))`">
              <!-- Weekend backdrop stripes via CSS variables  -->
              <span v-for="(d, di) in days" :key="`tw-${emp.id}-${di}`"
                v-show="d.isWeekend"
                class="swim-weekend"
                :style="{ gridColumn: `${di + 1} / span 1` }"
              />
              <Motion v-for="bar in emp.bars" :key="bar.id" as="button" type="button"
                class="bar"
                :class="{ pending: bar.pending }"
                :style="{
                  gridColumn: `${bar.startCol} / span ${bar.span}`,
                  '--c': bar.color,
                }"
                :initial="{ scaleX: 0, opacity: 0 }"
                :animate="{ scaleX: 1, opacity: 1 }"
                :transition="{ duration: 0.7, delay: 0.08 * bar.startCol + idx * 0.04, ease: [0.16, 1, 0.3, 1] }"
                :whileHover="{ y: -3, scale: 1.02 }"
                :title="`${bar.label} · ${bar.from} → ${bar.to}${bar.pending ? ' · pending HR' : ''}`"
                @click="openDrawer(bar.id)"
              >
                <span class="bar-cap left" />
                <span class="bar-lbl">{{ bar.short }}</span>
                <span class="bar-trail" />
                <span class="bar-cap right" />
                <span class="bar-shimmer" />
              </Motion>
            </div>
          </Motion>
        </div>
      </div>
    </section>

    <!-- Empty for grid view -->
    <div v-if="view === 'grid' && !loading && !entries.length" class="atl-empty">
      <CalendarRange :size="40" />
      <strong>No leaves in {{ monthLabel }}.</strong>
      <span>Use the filmstrip above to scrub to a different month, or relax your filters.</span>
    </div>

    <!-- ═════════════════════════════════════════════════════════════════
         HEAT-STRIP TOOLTIP — teleported, glassmorphic, position-tracked
         ════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <transition name="ht-pop">
        <div v-if="heatTip" class="ht-tip"
          :style="{ left: heatTipPos.x + 'px', top: heatTipPos.y + 'px' }"
          role="tooltip" aria-live="polite"
        >
          <span class="ht-glow" />
          <span class="ht-grid" />

          <header class="ht-head">
            <div class="ht-head-l">
              <span class="ht-eye leave-mono">
                <span class="ht-eye-dot"
                  :class="{
                    'is-conflict': heatTip.conflict && showConflicts,
                    'is-busy': heatTip.count > 0,
                    'is-today': heatTip.isToday,
                  }"
                />
                {{ heatTip.weekdayFull }}
                <span v-if="heatTip.isToday" class="ht-eye-today">· today</span>
                <span v-else-if="heatTip.isWeekend" class="ht-eye-off">· week-off</span>
              </span>
              <strong class="ht-date">{{ heatTip.fullLabel }}</strong>
            </div>
            <span class="ht-pill" :data-tone="heatTipTone(heatTip)">
              <strong>{{ heatTip.count }}</strong>
              <small>{{ heatTip.count === 1 ? 'person' : 'people' }}</small>
            </span>
          </header>

          <!-- If there are leaves: stacked list of first 4 -->
          <ul v-if="heatTip.count > 0" class="ht-list">
            <li v-for="(e, ix) in heatTip.events.slice(0, 4)" :key="`htl-${ix}`"
              class="ht-row"
              :style="{ '--c': typeMeta(e.leave_type).hex || '#fbbf24' }"
            >
              <span class="ht-row-av">{{ initials(e.employee_name) }}</span>
              <div class="ht-row-meta">
                <strong>{{ e.employee_name }}</strong>
                <span class="leave-mono">{{ typeMeta(e.leave_type).label }} · {{ fmtRange(e.from_date, e.to_date) }}</span>
              </div>
              <span v-if="e.status === 'PENDING_HR'" class="ht-row-pend leave-mono">pending</span>
            </li>
            <li v-if="heatTip.events.length > 4" class="ht-more leave-mono">
              + {{ heatTip.events.length - 4 }} more — click to view all
            </li>
          </ul>

          <!-- Otherwise: a quiet footer line -->
          <div v-else class="ht-quiet">
            <CalendarRange :size="11" />
            <span v-if="heatTip.isWeekend">
              Scheduled week-off
              <small>per {{ selectedShift ? selectedShift.name : 'standard' }} shift</small>
            </span>
            <span v-else>
              All clear — full bench available
            </span>
          </div>

          <div v-if="heatTip.conflict && showConflicts" class="ht-conflict">
            <Zap :size="11" />
            <span>Conflict — 3+ teammates from one department</span>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- ═════════════════════════════════════════════════════════════════
         05 · DAY SPOTLIGHT OVERLAY (teleported to body) — slide-up
         ════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <transition name="spot">
        <div v-if="selectedDayIso" class="day-spot" @click.self="selectedDayIso = null">
          <Motion as="div" class="ds-card"
            :initial="{ opacity: 0, y: 30, scale: 0.95 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="{ opacity: 0, y: 20, scale: 0.96 }"
            :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
          >
            <header class="ds-head">
              <div class="ds-head-l">
                <span class="ds-eye leave-mono"><span class="ds-led" /> Day spotlight</span>
                <h3 class="ds-title">{{ selectedDayLabel }}</h3>
                <span class="ds-meta leave-mono">
                  {{ selectedDayLeaves.length }} on leave
                  <span v-if="selectedDayLeaves.length > 0"> · {{ selectedDayTypes.length }} type{{ selectedDayTypes.length === 1 ? '' : 's' }}</span>
                </span>
              </div>
              <button class="ds-close" @click="selectedDayIso = null" aria-label="Close">
                <X :size="14" />
              </button>
            </header>

            <div v-if="!selectedDayLeaves.length" class="ds-empty">
              <CalendarRange :size="36" />
              <strong>Nobody's out on this day.</strong>
              <span>A clear runway — the whole bench is in office.</span>
            </div>

            <ul v-else class="ds-list">
              <Motion v-for="(e, i) in selectedDayLeaves" :key="e.id" as="li"
                class="ds-row"
                :style="{ '--c': typeMeta(e.leave_type).hex || '#fbbf24' }"
                :initial="{ opacity: 0, y: 12 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.35, delay: 0.05 + i * 0.04, ease: [0.16, 1, 0.3, 1] }"
                @click="openDrawer(e.id)"
              >
                <span class="dr-rail" />
                <span class="dr-av">{{ initials(e.employee_name) }}</span>
                <div class="dr-meta">
                  <strong>{{ e.employee_name }}</strong>
                  <span class="leave-mono">{{ e.employee_code }}<span v-if="e.department_name"> · {{ e.department_name }}</span></span>
                </div>
                <div class="dr-type">
                  <span class="dr-type-dot" />
                  <strong>{{ typeMeta(e.leave_type).label }}</strong>
                  <span class="leave-mono">{{ fmtRange(e.from_date, e.to_date) }}</span>
                </div>
                <span v-if="e.status === 'PENDING_HR'" class="dr-pending leave-mono">PENDING HR</span>
                <ArrowRight :size="12" class="dr-chev" />
              </Motion>
            </ul>
          </Motion>
        </div>
      </transition>
    </Teleport>

    <LeaveDetailDrawer
      :open="drawer.open"
      :leave-id="drawer.id"
      @close="drawer.open = false"
      @changed="reload"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Motion } from 'motion-v'
import axios from 'axios'
import { API, authHeader } from '@/utils/api'
import {
  ChevronLeft, ChevronRight, ChevronDown, CalendarRange, Download, X, ArrowRight,
  Crosshair, Building2, Layers, Zap, LayoutGrid, BarChart3, Check, Clock,
  Users, UserMinus, UserPlus, AlertTriangle, Inbox, Flame,
} from 'lucide-vue-next'
import LeaveDetailDrawer from '../drawers/LeaveDetailDrawer.vue'
import {
  fetchLeaveCalendar, downloadCalendarIcs, typeMeta, LEAVE_TYPES,
} from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const toast = useToast()
const entries = ref([])
const loading = ref(false)
const drawer = ref({ open: false, id: null })

const cursor = ref(new Date())
const showConflicts = ref(true)
const departments = ref([])
const shifts = ref([])
const filters = ref({ department_id: null, leave_type: null, shift_id: null })
const view = ref('grid')   // 'grid' | 'gantt'
const selectedDayIso = ref(null)

// ─────────────────────────────────────────────────────────────────────
// Heat-strip tooltip (teleported, position-tracked)
// ─────────────────────────────────────────────────────────────────────
const heatTip = ref(null)              // null | day object
const heatTipPos = ref({ x: 0, y: 0 })
const positionHeatTip = (cx, cy) => {
  const PAD = 14, W = 300, H = 220
  let x = cx + PAD, y = cy + PAD
  const vw = window.innerWidth, vh = window.innerHeight
  if (x + W > vw - 8) x = cx - W - PAD
  if (y + H > vh - 8) y = cy - H - PAD
  if (x < 8) x = 8
  if (y < 8) y = 8
  heatTipPos.value = { x, y }
}
const onHeatEnter = (d, e) => {
  heatTip.value = d
  positionHeatTip(e.clientX, e.clientY)
}
const onHeatMove = (e) => {
  if (!heatTip.value) return
  positionHeatTip(e.clientX, e.clientY)
}
const onHeatLeave = () => { heatTip.value = null }

const WEEK_HEAD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─────────────────────────────────────────────────────────────────────
// Hero parallax — subtle 3D tilt following the cursor (Blender-style)
// ─────────────────────────────────────────────────────────────────────
const heroTilt = reactive({ rx: 0, ry: 0 })
let heroRaf = null
const onHeroMouseMove = (e) => {
  const r = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width   // 0..1
  const y = (e.clientY - r.top)  / r.height  // 0..1
  // Centre = 0; edges = ±1
  const dx = x * 2 - 1
  const dy = y * 2 - 1
  // Bound the tilt to a tasteful ±3.5°
  if (heroRaf) cancelAnimationFrame(heroRaf)
  heroRaf = requestAnimationFrame(() => {
    heroTilt.rx = -dy * 3.5
    heroTilt.ry =  dx * 3.5
  })
}
const onHeroMouseLeave = () => {
  if (heroRaf) cancelAnimationFrame(heroRaf)
  heroRaf = requestAnimationFrame(() => {
    heroTilt.rx = 0
    heroTilt.ry = 0
  })
}

// ─────────────────────────────────────────────────────────────────────
// Custom dropdowns (department / leave type)
// ─────────────────────────────────────────────────────────────────────
const openDdw = ref(null)   // null | 'dept' | 'type'
const toggleDdw = (key) => { openDdw.value = openDdw.value === key ? null : key }
const closeDdw = () => { openDdw.value = null }
const pickDept = (id) => {
  filters.value.department_id = id
  openDdw.value = null
  reload()
}
const pickType = (key) => {
  filters.value.leave_type = key
  openDdw.value = null
}
const pickShift = (id) => {
  filters.value.shift_id = id
  openDdw.value = null
}
const deptLabel = computed(() => {
  if (!filters.value.department_id) return 'All departments'
  const d = departments.value.find(x => x.id === filters.value.department_id)
  return d?.name || 'Department'
})
const typeLabel = computed(() => {
  if (!filters.value.leave_type) return 'All leave types'
  const t = LEAVE_TYPES.find(x => x.key === filters.value.leave_type)
  return t?.label || 'Type'
})
const shiftLabel = computed(() => {
  if (!filters.value.shift_id) return 'All shifts'
  return selectedShift.value?.name || 'Shift'
})
// Compact human label for the off-days of a shift, used in the dropdown rows.
const shiftOffLabel = (s) => {
  const days = Array.isArray(s?.weekly_off_days) ? s.weekly_off_days : []
  if (!days.length) return 'no week-off'
  return days.map(i => PY_DAY_NAMES[i]).join(' + ') + ' off'
}
const onWinClick = () => { openDdw.value = null }
onMounted(() => window.addEventListener('mousedown', onWinClick))
onBeforeUnmount(() => window.removeEventListener('mousedown', onWinClick))

// ─────────────────────────────────────────────────────────────────────
// Live clock
// ─────────────────────────────────────────────────────────────────────
const liveClock = ref('')
let clockTimer = null
const tickClock = () => {
  liveClock.value = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}
onMounted(() => { tickClock(); clockTimer = setInterval(tickClock, 1000) })
onBeforeUnmount(() => { if (clockTimer) clearInterval(clockTimer) })

// ─────────────────────────────────────────────────────────────────────
// Month label / short bits used by the hero
// ─────────────────────────────────────────────────────────────────────
const monthLabel = computed(() =>
  cursor.value.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
)
const monthShort = computed(() =>
  cursor.value.toLocaleDateString('en-IN', { month: 'long' }),
)
const yearShort = computed(() => String(cursor.value.getFullYear()).slice(-2))

// ─────────────────────────────────────────────────────────────────────
// Shift-aware weekend logic
//   Shift.weekly_off_days stores Python weekday indices (0=Mon..6=Sun).
//   JS Date.getDay() returns 0=Sun..6=Sat, so we convert via (d + 6) % 7.
//   With no shift selected we fall back to the standard Sat+Sun set so
//   visualization still makes sense for the "All shifts" default.
// ─────────────────────────────────────────────────────────────────────
const DEFAULT_WEEKLY_OFF = [5, 6]   // Sat, Sun (Python convention)
const selectedShift = computed(() =>
  filters.value.shift_id
    ? shifts.value.find(s => s.id === filters.value.shift_id) || null
    : null,
)
const weeklyOffSet = computed(() => {
  const off = selectedShift.value?.weekly_off_days
  if (Array.isArray(off) && off.length) return new Set(off.map(Number))
  return new Set(DEFAULT_WEEKLY_OFF)
})
const isOffDay = (jsDate) => weeklyOffSet.value.has((jsDate.getDay() + 6) % 7)
const PY_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const weeklyOffLabel = computed(() => {
  const arr = Array.from(weeklyOffSet.value).sort()
  return arr.length ? arr.map(i => PY_DAY_NAMES[i]).join(' + ') : 'none'
})

// ─────────────────────────────────────────────────────────────────────
// Filtered entries (client-side leave_type filter)
// ─────────────────────────────────────────────────────────────────────
const filteredEntries = computed(() => {
  let arr = entries.value
  if (filters.value.leave_type) arr = arr.filter(e => e.leave_type === filters.value.leave_type)
  return arr
})

// Local-calendar ISO (YYYY-MM-DD). NEVER use `new Date(y,m,d).toISOString()`
// for a calendar cell — that converts local-midnight to UTC, which in IST
// (UTC+5:30) rolls the cell back a day, so a 01-Jun leave lands on the 02-Jun
// cell (off-by-one forward). Build from local parts instead.
const toLocalISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ─────────────────────────────────────────────────────────────────────
// Day array for the month — drives the heatmap strip + month grid
// ─────────────────────────────────────────────────────────────────────
const days = computed(() => {
  const y = cursor.value.getFullYear()
  const m = cursor.value.getMonth()
  const last = new Date(y, m + 1, 0).getDate()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const arr = []
  for (let d = 1; d <= last; d++) {
    const dt = new Date(y, m, d)
    arr.push({
      iso: toLocalISO(dt),
      dayNum: d,
      label: dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      weekdayFull: dt.toLocaleDateString('en-IN', { weekday: 'long' }),
      fullLabel: dt.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
      isToday: dt.getTime() === today.getTime(),
      isWeekend: isOffDay(dt),
      count: 0, deptCount: {}, conflict: false, events: [],
    })
  }
  for (const e of filteredEntries.value) {
    const fr = new Date(e.from_date), to = new Date(e.to_date)
    for (const d of arr) {
      const cur = new Date(d.iso)
      if (cur >= fr && cur <= to) {
        d.count += 1
        d.events.push(e)
        if (e.department_name) {
          d.deptCount[e.department_name] = (d.deptCount[e.department_name] || 0) + 1
        }
      }
    }
  }
  for (const d of arr) {
    d.conflict = Object.values(d.deptCount).some(n => n >= 3)
  }
  return arr
})

// ─────────────────────────────────────────────────────────────────────
// Today's bandwidth — assume the team size scales with unique
// employees in the month's pool; fallback to 10 as a soft minimum
// ─────────────────────────────────────────────────────────────────────
const todayIsoStr = computed(() => {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return toLocalISO(today)
})
const teamSize = computed(() => {
  const set = new Set(entries.value.map(e => e.employee_id))
  return Math.max(10, set.size)
})
const outToday = computed(() => {
  const iso = todayIsoStr.value
  return filteredEntries.value.filter(e => iso >= e.from_date && iso <= e.to_date).length
})
const inToday = computed(() => Math.max(0, teamSize.value - outToday.value))
const bandwidthRatio = computed(() => {
  const t = teamSize.value
  if (!t) return 1
  return Math.max(0, Math.min(1, inToday.value / t))
})
const bandwidthPct = computed(() => Math.round(bandwidthRatio.value * 100))
const bandwidthTone = computed(() => {
  const p = bandwidthRatio.value
  if (p >= 0.8) return 'green'
  if (p >= 0.55) return 'amber'
  return 'crimson'
})

// ─────────────────────────────────────────────────────────────────────
// KPIs — out today, departing this week, returning this week, conflicts
// ─────────────────────────────────────────────────────────────────────
const isoFromDate = (d) => toLocalISO(d)
const startOfWeek = computed(() => {
  const t = new Date(); t.setHours(0, 0, 0, 0)
  const dow = (t.getDay() + 6) % 7  // Mon-anchored
  t.setDate(t.getDate() - dow)
  return t
})
const endOfWeek = computed(() => {
  const t = new Date(startOfWeek.value)
  t.setDate(t.getDate() + 6)
  return t
})
const departingThisWeek = computed(() => {
  const s = isoFromDate(startOfWeek.value)
  const e = isoFromDate(endOfWeek.value)
  return filteredEntries.value.filter(x => x.from_date >= s && x.from_date <= e).length
})
const returningThisWeek = computed(() => {
  const s = isoFromDate(startOfWeek.value)
  const e = isoFromDate(endOfWeek.value)
  return filteredEntries.value.filter(x => x.to_date >= s && x.to_date <= e).length
})
const conflictDays = computed(() => days.value.filter(d => d.conflict).length)

const kpis = computed(() => [
  {
    key: 'out',   label: 'on leave today',    tone: outToday.value > 0 ? 'amber' : 'gold',
    icon: UserMinus, value: outToday.value, unit: '', foot: 'this morning',
  },
  {
    key: 'dep',   label: 'departing this week', tone: 'gold',
    icon: UserPlus, value: departingThisWeek.value, unit: '', foot: 'breaks start',
  },
  {
    key: 'ret',   label: 'returning this week', tone: 'emerald',
    icon: Users, value: returningThisWeek.value, unit: '', foot: 'breaks end',
  },
  {
    key: 'conf',  label: 'conflict days',       tone: conflictDays.value > 0 ? 'crimson' : 'gold',
    icon: AlertTriangle, value: conflictDays.value, unit: '', foot: 'in this month',
  },
])

// ─────────────────────────────────────────────────────────────────────
// Filmstrip — 12 month frames centred on cursor month
// Each frame draws 7 mini bars based on `entries` start/end overlap
// ─────────────────────────────────────────────────────────────────────
const filmFrames = computed(() => {
  const out = []
  const c = cursor.value
  const now = new Date(); now.setHours(0, 0, 0, 0)
  // Range: cursor - 5 .. cursor + 6 (12 frames)
  for (let off = -5; off <= 6; off++) {
    const dt = new Date(c.getFullYear(), c.getMonth() + off, 1)
    const my = dt.getFullYear()
    const mm = dt.getMonth()
    const monthIso = `${my}-${String(mm + 1).padStart(2, '0')}`
    const inMonthCount = entries.value.filter(e => (e.from_date || '').startsWith(monthIso)).length
    // Generate 7 deterministic-looking bars from inMonthCount
    const bars = []
    for (let b = 0; b < 7; b++) {
      const seed = (inMonthCount * 13 + b * 17 + mm * 7) % 100
      bars.push(15 + (seed / 100) * 75)
    }
    out.push({
      key: `${my}-${mm}`,
      date: dt,
      short: dt.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
      yearShort: String(my).slice(-2),
      bars,
      isShownMonth: my === c.getFullYear() && mm === c.getMonth(),
      isCurrent: my === now.getFullYear() && mm === now.getMonth(),
    })
  }
  return out
})

// ─────────────────────────────────────────────────────────────────────
// Grid cells — 7×6 calendar grid (Mon-anchored), shows leading/trailing
// days from prev/next month muted. Each cell carries event metadata
// for the avatar stack + type chips.
// ─────────────────────────────────────────────────────────────────────
const gridCells = computed(() => {
  const y = cursor.value.getFullYear()
  const m = cursor.value.getMonth()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const firstOfMonth = new Date(y, m, 1)
  // Mon-anchored offset (0 = Mon .. 6 = Sun)
  const startOffset = (firstOfMonth.getDay() + 6) % 7
  const cells = []
  // 42-cell grid (6 weeks × 7 days)
  for (let i = 0; i < 42; i++) {
    const dt = new Date(y, m, 1 - startOffset + i)
    const iso = toLocalISO(dt)
    const isShownMonth = dt.getMonth() === m
    const dayEvents = filteredEntries.value.filter(
      e => iso >= e.from_date.slice(0, 10) && iso <= e.to_date.slice(0, 10),
    )
    const deptCount = {}
    for (const ev of dayEvents) {
      if (ev.department_name) {
        deptCount[ev.department_name] = (deptCount[ev.department_name] || 0) + 1
      }
    }
    const conflict = Object.values(deptCount).some(n => n >= 3)

    // Type chips — group by leave_type, top 3
    const typeMap = new Map()
    for (const ev of dayEvents) {
      const cur = typeMap.get(ev.leave_type) || {
        count: 0,
        label: typeMeta(ev.leave_type).label,
        hex: typeMeta(ev.leave_type).hex || '#fbbf24',
      }
      cur.count += 1
      typeMap.set(ev.leave_type, cur)
    }
    const typeChips = Array.from(typeMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    // Avatar stack — first 4 employees by name (stable)
    const avatarStack = dayEvents.slice(0, 4).map(e => ({
      init: initialsFor(e.employee_name),
      name: e.employee_name,
      hex: typeMeta(e.leave_type).hex || '#fbbf24',
    }))

    const loadPct = Math.min(100, Math.round((dayEvents.length / Math.max(1, teamSize.value)) * 100))
    const loadTier = dayEvents.length === 0 ? 'none'
      : loadPct < 10 ? 'low'
      : loadPct < 25 ? 'mid'
      : 'high'

    cells.push({
      key: `c-${iso}`,
      iso, dayNum: dt.getDate(),
      isToday: dt.getTime() === today.getTime(),
      isWeekend: isOffDay(dt),
      isShownMonth,
      conflict,
      events: dayEvents,
      typeChips, avatarStack,
      loadPct, loadTier,
    })
  }
  return cells
})

// ─────────────────────────────────────────────────────────────────────
// Swimlanes — employees grouped, with bar layout
// ─────────────────────────────────────────────────────────────────────
const employeesInView = computed(() => {
  const byEmp = new Map()
  for (const e of filteredEntries.value) {
    if (!byEmp.has(e.employee_id)) byEmp.set(e.employee_id, {
      id: e.employee_id,
      name: e.employee_name || '—',
      code: e.employee_code || '',
      dept: e.department_name || '',
      bars: [],
      tone: typeMeta(e.leave_type).hex || '#fbbf24',
      initials: initialsFor(e.employee_name),
    })
    const list = byEmp.get(e.employee_id)
    const startIdx = days.value.findIndex(d => d.iso === e.from_date.slice(0, 10))
    const endIdx   = days.value.findIndex(d => d.iso === e.to_date.slice(0, 10))
    if (startIdx === -1 && endIdx === -1) continue
    const s = Math.max(0, startIdx === -1 ? 0 : startIdx)
    const en = Math.min(days.value.length - 1, endIdx === -1 ? days.value.length - 1 : endIdx)
    list.bars.push({
      id: e.id,
      startCol: s + 1, span: Math.max(1, en - s + 1),
      color: e.color_hex || typeMeta(e.leave_type).hex,
      label: typeMeta(e.leave_type).label,
      short: typeMeta(e.leave_type).label.slice(0, 3).toUpperCase(),
      from: e.from_date, to: e.to_date,
      pending: e.status === 'PENDING_HR',
    })
  }
  return Array.from(byEmp.values())
})

// ─────────────────────────────────────────────────────────────────────
// Day spotlight (selectedDayIso) — derived list of leaves for that day
// ─────────────────────────────────────────────────────────────────────
const selectedDayLeaves = computed(() => {
  if (!selectedDayIso.value) return []
  const iso = selectedDayIso.value
  return filteredEntries.value.filter(e => iso >= e.from_date.slice(0, 10) && iso <= e.to_date.slice(0, 10))
})
const selectedDayLabel = computed(() => {
  if (!selectedDayIso.value) return ''
  const d = new Date(selectedDayIso.value)
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
})
const selectedDayTypes = computed(() => {
  const set = new Set(selectedDayLeaves.value.map(e => e.leave_type))
  return Array.from(set)
})

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────
const initialsFor = (name) => {
  if (!name) return '?'
  const p = String(name).trim().split(/\s+/).filter(Boolean)
  return p.length === 1
    ? p[0].slice(0, 2).toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}
const initials = initialsFor
const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'
const fmtRange = (a, b) => (a === b ? fmtDate(a) : `${fmtDate(a)} → ${fmtDate(b)}`)

const intensity = (n) => {
  if (n <= 0) return 'transparent'
  if (n <= 2) return 'color-mix(in srgb, var(--leave-pending-mgr) 30%, transparent)'
  if (n <= 5) return 'color-mix(in srgb, var(--leave-pending-mgr) 55%, transparent)'
  return 'color-mix(in srgb, var(--leave-rejected) 70%, transparent)'
}
const heatTipTone = (d) => {
  if (!d) return 'idle'
  if (d.conflict && showConflicts.value) return 'crimson'
  if (d.count >= 5) return 'amber'
  if (d.count > 0)  return 'gold'
  return 'idle'
}

// Column index of "today" inside the days array, or -1 if today isn't in
// the visible month. Drives the vertical "today" line in the swim view.
const todayColIndex = computed(() => days.value.findIndex(d => d.isToday))

// ─────────────────────────────────────────────────────────────────────
// Navigation + actions
// ─────────────────────────────────────────────────────────────────────
const shiftMonth = (n) => {
  const d = new Date(cursor.value); d.setMonth(d.getMonth() + n); cursor.value = d
  reload()
}
const jumpToMonth = (date) => {
  cursor.value = new Date(date)
  reload()
}
const goToday = () => { cursor.value = new Date(); reload() }
const openDrawer = (id) => {
  if (!id) return
  // Close the day-spotlight before the drawer takes over so the drawer
  // doesn't open behind the spotlight overlay (drawer z-index is 1090).
  selectedDayIso.value = null
  drawer.value = { open: true, id: String(id) }
}
const spotlightDay = (iso) => { selectedDayIso.value = iso }

const loadDepartments = async () => {
  try {
    const { data } = await axios.get(`${API}/hr/departments/`, {
      headers: authHeader(),
    })
    // Backend returns a bare array (List[DepartmentResponse]), not an envelope.
    // Older code assumed `data.items` which silently produced an empty list.
    const rows = Array.isArray(data) ? data : (data?.items || [])
    departments.value = rows.filter(d => !d.is_deleted && (d.is_active !== false))
  } catch { departments.value = [] }
}

// Shifts — backend returns a {items,total,...} envelope. The endpoint does
// NOT accept include_deleted; soft-deleted rows are filtered server-side.
// We still drop is_active=false rows so admins don't pick a retired shift.
const loadShifts = async () => {
  try {
    const { data } = await axios.get(`${API}/hr/shifts/`, {
      headers: authHeader(),
      params: { is_active: true, limit: 200 },
    })
    const rows = Array.isArray(data) ? data : (data?.items || [])
    shifts.value = rows.filter(s => s.is_active !== false)
  } catch { shifts.value = [] }
}

const reload = async () => {
  loading.value = true
  try {
    const y = cursor.value.getFullYear(); const m = cursor.value.getMonth()
    const from = toLocalISO(new Date(y, m, 1))
    const to   = toLocalISO(new Date(y, m + 1, 0))
    const params = { from, to }
    if (filters.value.department_id) params.department_id = filters.value.department_id
    const data = await fetchLeaveCalendar(params)
    entries.value = data.items || []
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load calendar')
    entries.value = []
  } finally { loading.value = false }
}

const exportIcs = async () => {
  const y = cursor.value.getFullYear(); const m = cursor.value.getMonth()
  const from = toLocalISO(new Date(y, m, 1))
  const to   = toLocalISO(new Date(y, m + 1, 0))
  try {
    await downloadCalendarIcs({
      from, to,
      department_id: filters.value.department_id || undefined,
      leave_type: filters.value.leave_type || undefined,
    })
    toast.success('Calendar downloaded')
  } catch {
    toast.error('ICS export failed')
  }
}

onMounted(async () => {
  await Promise.all([loadDepartments(), loadShifts()])
  await reload()
})

// Close spotlight on Escape
const onKey = (e) => { if (e.key === 'Escape') selectedDayIso.value = null }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
/* ════════════════════════════════════════════════════════════════════════════
   PAGE WRAPPER + AMBIENT BACKDROP
   ════════════════════════════════════════════════════════════════════════════ */
.atlas {
  position: relative;
  display: flex; flex-direction: column; gap: 22px;
  isolation: isolate;
}
.atl-bg {
  position: absolute; inset: -20px; z-index: -1; overflow: hidden;
  pointer-events: none;
}
.bg-mist {
  position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.55;
}
.bg-mist.a {
  width: 480px; height: 480px; top: -150px; left: -100px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.45), transparent 65%);
  animation: atl-aura-a 24s ease-in-out infinite;
}
.bg-mist.b {
  width: 420px; height: 420px; bottom: -150px; right: -120px;
  background: radial-gradient(circle, rgba(234, 88, 12, 0.38), transparent 65%);
  animation: atl-aura-b 28s ease-in-out infinite;
}
.bg-mist.c {
  width: 360px; height: 360px; top: 40%; left: 50%; transform: translateX(-50%);
  background: radial-gradient(circle, rgba(253, 224, 71, 0.18), transparent 65%);
  animation: atl-aura-c 30s ease-in-out infinite;
}
@keyframes atl-aura-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-28px,38px) scale(1.08); } }
@keyframes atl-aura-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(38px,-32px) scale(1.10); } }
@keyframes atl-aura-c { 0%,100% { transform: translate(-50%,0) scale(0.95); } 50% { transform: translate(-50%,-22px) scale(1.10); } }

.bg-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(251, 191, 36, 0.05) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 70%);
}
[data-theme="light"] .bg-grid {
  background-image: radial-gradient(rgba(180, 83, 9, 0.10) 1px, transparent 1px);
}
.bg-stars {
  position: absolute; inset: 0;
  background:
    radial-gradient(1px 1px at 10% 20%, rgba(251, 191, 36, 0.55) 99%, transparent 100%),
    radial-gradient(1px 1px at 28% 45%, rgba(251, 191, 36, 0.30) 99%, transparent 100%),
    radial-gradient(1px 1px at 47% 18%, rgba(253, 224, 71, 0.45) 99%, transparent 100%),
    radial-gradient(1px 1px at 68% 32%, rgba(251, 191, 36, 0.50) 99%, transparent 100%),
    radial-gradient(1px 1px at 84% 12%, rgba(251, 146, 60, 0.45) 99%, transparent 100%),
    radial-gradient(1px 1px at 92% 64%, rgba(251, 191, 36, 0.30) 99%, transparent 100%);
  opacity: 0.85;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.8), transparent 60%);
  animation: atl-twinkle 8s ease-in-out infinite;
}
[data-theme="light"] .bg-stars { opacity: 0.35; }
@keyframes atl-twinkle {
  0%, 100% { filter: brightness(1); }
  50%      { filter: brightness(1.4); }
}
.bg-scan {
  position: absolute; left: 0; right: 0; height: 130px;
  background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.10), transparent);
  filter: blur(18px);
  animation: atl-scan 11s linear infinite;
}
@keyframes atl-scan {
  0%   { transform: translateY(-30%); opacity: 0; }
  15%  { opacity: 0.7; }
  85%  { opacity: 0.7; }
  100% { transform: translateY(120vh); opacity: 0; }
}

/* ════════════════════════════════════════════════════════════════════════════
   01 · HERO — SPOTLIGHT + COPY + KPIs
   ════════════════════════════════════════════════════════════════════════════ */
.atl-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) 1.3fr;
  gap: 26px;
  align-items: center;
  padding: 26px 30px;
  border-radius: 26px;
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.22), transparent 65%),
    radial-gradient(80% 60% at 100% 100%, rgba(234, 88, 12, 0.18), transparent 65%),
    linear-gradient(180deg, rgba(20, 14, 8, 0.84), rgba(28, 18, 10, 0.88));
  border: 1px solid rgba(251, 191, 36, 0.30);
  box-shadow:
    0 40px 100px -40px rgba(120, 53, 15, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  overflow: hidden;
  transition: transform .35s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}
[data-theme="light"] .atl-hero {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.20), transparent 65%),
    radial-gradient(80% 60% at 100% 100%, rgba(234, 88, 12, 0.16), transparent 65%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 244, 218, 0.96));
  border-color: rgba(180, 83, 9, 0.26);
  box-shadow: 0 32px 64px -36px rgba(120, 53, 15, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
@media (max-width: 1080px) {
  .atl-hero { grid-template-columns: 1fr; padding: 22px 20px; }
}

.ah-corner {
  position: absolute; width: 18px; height: 18px;
  border-color: rgba(251, 191, 36, 0.55);
  pointer-events: none;
}
.ah-corner.tl { top: 12px; left: 12px;     border-top: 2px solid; border-left: 2px solid; border-top-left-radius: 4px; }
.ah-corner.tr { top: 12px; right: 12px;    border-top: 2px solid; border-right: 2px solid; border-top-right-radius: 4px; }
.ah-corner.bl { bottom: 12px; left: 12px;  border-bottom: 2px solid; border-left: 2px solid; border-bottom-left-radius: 4px; }
.ah-corner.br { bottom: 12px; right: 12px; border-bottom: 2px solid; border-right: 2px solid; border-bottom-right-radius: 4px; }
[data-theme="light"] .ah-corner { border-color: rgba(180, 83, 9, 0.55); }

/* Spotlight (gauge) */
.atl-spot {
  position: relative;
  aspect-ratio: 1 / 1;
  max-width: 280px;
  width: 100%;
  justify-self: center;
}
.spot-disc {
  position: relative; width: 100%; height: 100%;
  animation: spot-breathe 6s ease-in-out infinite;
}
@keyframes spot-breathe {
  0%, 100% { filter: drop-shadow(0 0 24px rgba(251, 191, 36, 0.20)); }
  50%      { filter: drop-shadow(0 0 36px rgba(251, 191, 36, 0.50)); }
}
.spot-svg { width: 100%; height: 100%; }
.sp-ticks {
  transform-origin: 140px 140px;
  animation: spot-tick-rot 80s linear infinite;
}
@keyframes spot-tick-rot { to { transform: rotate(360deg); } }
.sp-tick {
  stroke: rgba(251, 191, 36, 0.28);
  stroke-width: 1;
}
.sp-tick.sp-tick-major {
  stroke: rgba(251, 191, 36, 0.65);
  stroke-width: 1.5;
}
[data-theme="light"] .sp-tick { stroke: rgba(180, 83, 9, 0.32); }
[data-theme="light"] .sp-tick.sp-tick-major { stroke: rgba(180, 83, 9, 0.70); }
.sp-track {
  stroke: rgba(251, 191, 36, 0.12);
}
[data-theme="light"] .sp-track { stroke: rgba(180, 83, 9, 0.18); }
.sp-fill { transition: stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1); }
.sp-pointer { fill: #fef3c7; stroke: #fbbf24; stroke-width: 0.6; }
[data-theme="light"] .sp-pointer { fill: #b45309; stroke: #92400e; }

.spot-core {
  position: absolute; inset: 18%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px;
  padding: 8px;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(251, 191, 36, 0.12), rgba(20, 14, 8, 0.75) 70%);
  border: 1px solid rgba(251, 191, 36, 0.30);
  box-shadow: inset 0 0 30px rgba(251, 191, 36, 0.20), 0 8px 20px -8px rgba(0,0,0,0.6);
  text-align: center;
}
[data-theme="light"] .spot-core {
  background:
    radial-gradient(circle, rgba(251, 191, 36, 0.20), rgba(255, 250, 240, 0.95) 70%);
  border-color: rgba(180, 83, 9, 0.36);
  box-shadow: inset 0 0 30px rgba(251, 191, 36, 0.18), 0 6px 18px -6px rgba(120, 53, 15, 0.30);
}
.sc-eye {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 8px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: #fde68a;
}
[data-theme="light"] .sc-eye { color: #92400e; }
.sc-led {
  width: 6px; height: 6px; border-radius: 50%;
  background: #34d399; box-shadow: 0 0 8px #34d399;
  animation: led-blink 1.6s ease-in-out infinite;
}
.sc-led[data-tone="amber"]   { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
.sc-led[data-tone="crimson"] { background: #ef4444; box-shadow: 0 0 12px #ef4444; animation-duration: 0.9s; }
@keyframes led-blink {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.4); }
}
.sc-num {
  font-size: clamp(30px, 4.6vw, 48px); font-weight: 900;
  letter-spacing: -0.035em; line-height: 1;
  background: linear-gradient(135deg, #fef3c7, #fbbf24 50%, #fb923c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  font-variant-numeric: tabular-nums;
}
.sc-num small {
  font-size: 0.45em;
  font-weight: 800;
  -webkit-text-fill-color: var(--hr-text-muted);
  letter-spacing: 0;
  margin-left: 1px;
}
[data-theme="light"] .sc-num {
  background: linear-gradient(135deg, #92400e, #b45309 50%, #c2410c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.sc-divider {
  width: 48px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.55), transparent);
  margin: 3px 0 2px;
}
.sc-row {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; color: var(--hr-text);
}
.sc-row strong { font-weight: 800; color: var(--hr-text); }
.sc-row small { font-weight: 700; color: var(--hr-text-muted); margin-left: 2px; }
.sc-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(251, 191, 36, 0.55); }

/* Copy block */
.atl-copy {
  display: flex; flex-direction: column; gap: 14px;
  min-width: 0;
}
.ac-led {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: #fde68a;
  font-size: 10px; font-weight: 800; letter-spacing: 0.16em;
  align-self: flex-start;
  backdrop-filter: blur(6px);
}
[data-theme="light"] .ac-led {
  background: rgba(251, 191, 36, 0.16);
  border-color: rgba(180, 83, 9, 0.30);
  color: #92400e;
}
.led-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #34d399; box-shadow: 0 0 8px #34d399;
  animation: led-blink 1.6s ease-in-out infinite;
}
.led-dot[data-tone="amber"]   { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
.led-dot[data-tone="crimson"] { background: #ef4444; box-shadow: 0 0 12px #ef4444; animation-duration: 0.9s; }
.led-sep { color: rgba(251, 191, 36, 0.40); }
[data-theme="light"] .led-sep { color: rgba(180, 83, 9, 0.40); }

.ac-title {
  margin: 0;
  font-size: clamp(26px, 3.8vw, 40px);
  font-weight: 900; letter-spacing: -0.028em; line-height: 1.06;
  display: flex; flex-direction: column; gap: 4px;
}
.t-row { display: inline-flex; flex-wrap: wrap; gap: 0 14px; align-items: baseline; }
.word-month {
  font-style: normal;
  background: linear-gradient(135deg, #fef3c7, #fbbf24 40%, #fb923c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
[data-theme="light"] .word-month {
  background: linear-gradient(135deg, #92400e, #b45309 60%, #c2410c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.word-year {
  font-size: 0.65em; color: var(--hr-text-muted); font-weight: 800; letter-spacing: 0.04em;
}
.t-row.second {
  font-size: clamp(15px, 2vw, 22px);
  font-weight: 700;
  color: var(--hr-text-secondary);
  letter-spacing: -0.018em;
}

.ac-sub {
  margin: 0; max-width: 560px;
  font-size: 12.5px; line-height: 1.55; color: var(--hr-text-secondary);
}

/* KPI strip */
.ac-kpis {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
}
@media (max-width: 720px) { .ac-kpis { grid-template-columns: repeat(2, 1fr); } }
.kp {
  position: relative;
  display: flex; flex-direction: column; gap: 3px;
  padding: 9px 11px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.65), rgba(20, 14, 8, 0.82));
  border: 1px solid rgba(251, 191, 36, 0.22);
  overflow: hidden;
}
[data-theme="light"] .kp {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 218, 0.94));
  border-color: rgba(180, 83, 9, 0.20);
}
.kp[data-tone="amber"]   { border-color: rgba(245, 158, 11, 0.55); }
.kp[data-tone="emerald"] { border-color: rgba(20, 184, 166, 0.55); }
.kp[data-tone="crimson"] { border-color: rgba(239, 68, 68, 0.55); }
.kp-head {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--hr-text-muted);
}
.kp-head svg { color: #fbbf24; }
.kp[data-tone="amber"]   .kp-head svg { color: #f59e0b; }
.kp[data-tone="emerald"] .kp-head svg { color: #5eead4; }
.kp[data-tone="crimson"] .kp-head svg { color: #ef4444; }
[data-theme="light"] .kp-head svg { color: #b45309; }
[data-theme="light"] .kp[data-tone="amber"]   .kp-head svg { color: #b45309; }
[data-theme="light"] .kp[data-tone="emerald"] .kp-head svg { color: #047857; }
[data-theme="light"] .kp[data-tone="crimson"] .kp-head svg { color: #b91c1c; }
.kp-lbl {
  font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
}
.kp-val {
  font-size: 20px; font-weight: 900; letter-spacing: -0.025em;
  color: var(--hr-text); line-height: 1;
  font-variant-numeric: tabular-nums;
}
.kp[data-tone="crimson"] .kp-val { color: #fca5a5; }
[data-theme="light"] .kp[data-tone="crimson"] .kp-val { color: #b91c1c; }
.kp[data-tone="emerald"] .kp-val { color: #5eead4; }
[data-theme="light"] .kp[data-tone="emerald"] .kp-val { color: #047857; }
.kp-val small {
  font-size: 11px; font-weight: 700; color: var(--hr-text-muted); margin-left: 2px;
}
.kp-foot {
  font-size: 9px; font-weight: 700; letter-spacing: 0.06em;
  color: var(--hr-text-muted);
}

/* ════════════════════════════════════════════════════════════════════════════
   02 · FILMSTRIP
   ════════════════════════════════════════════════════════════════════════════ */
.filmstrip {
  position: relative;
  display: flex; align-items: center; gap: 8px;
  padding: 14px 12px;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(10, 7, 4, 0.92), rgba(18, 12, 7, 0.92));
  border: 1px solid rgba(251, 191, 36, 0.25);
  box-shadow:
    0 18px 38px -22px rgba(120, 53, 15, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
}
[data-theme="light"] .filmstrip {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.22), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.96), rgba(254, 243, 199, 0.98));
  border-color: rgba(180, 83, 9, 0.28);
  box-shadow:
    0 18px 38px -24px rgba(120, 53, 15, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

/* Perforated edges */
.fs-perf {
  position: absolute; left: 60px; right: 60px;
  height: 8px;
  display: flex; justify-content: space-between;
  pointer-events: none;
  opacity: 0.85;
}
.fs-perf.top { top: 3px; }
.fs-perf.bot { bottom: 3px; }
.fs-perf span {
  width: 8px; height: 8px;
  border-radius: 2px;
  background: rgba(10, 7, 4, 1);
  border: 1px solid rgba(251, 191, 36, 0.32);
}
[data-theme="light"] .fs-perf span {
  background: rgba(180, 83, 9, 0.18);
  border-color: rgba(180, 83, 9, 0.35);
}

.fs-nav {
  width: 36px; height: 64px;
  display: grid; place-items: center;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.35);
  border-radius: 10px;
  color: var(--hr-text);
  cursor: pointer;
  flex-shrink: 0;
  transition: transform .25s cubic-bezier(0.34, 1.56, 0.64, 1), background .22s, border-color .22s;
}
.fs-nav:hover {
  background: rgba(251, 191, 36, 0.20);
  border-color: rgba(251, 146, 60, 0.55);
  transform: translateY(-2px);
}
.fs-nav.prev:hover { transform: translateY(-2px) translateX(-2px); }
.fs-nav.next:hover { transform: translateY(-2px) translateX(2px); }
[data-theme="light"] .fs-nav {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.30);
  color: #3a1f0b;
}
[data-theme="light"] .fs-nav:hover {
  background: rgba(251, 191, 36, 0.25);
  border-color: rgba(180, 83, 9, 0.55);
}

.fs-track {
  display: flex; gap: 6px;
  flex: 1; min-width: 0;
  overflow: hidden;
  padding: 2px 6px;
}

.fs-frame {
  position: relative;
  flex: 1; min-width: 56px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 10px;
  background: rgba(10, 7, 4, 0.65);
  border: 1px solid rgba(251, 191, 36, 0.18);
  cursor: pointer;
  overflow: hidden;
  transition: border-color .25s, background .25s, box-shadow .25s, color .25s;
  color: rgba(253, 230, 138, 0.65);
  font: inherit;
}
[data-theme="light"] .fs-frame {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(180, 83, 9, 0.20);
  color: #6b5840;
}
.fs-frame:hover {
  border-color: rgba(251, 146, 60, 0.55);
  background: rgba(251, 191, 36, 0.10);
  color: #fef3c7;
}
[data-theme="light"] .fs-frame:hover {
  border-color: rgba(180, 83, 9, 0.55);
  background: rgba(251, 191, 36, 0.22);
  color: #3a1f0b;
}
.fs-frame.is-current {
  border-color: rgba(34, 197, 94, 0.55);
}
.fs-frame.is-shown-month,
.fs-frame.is-month {
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.32), rgba(251, 146, 60, 0.18));
  border-color: rgba(251, 191, 36, 0.85);
  color: #fef3c7;
  box-shadow: 0 12px 26px -14px rgba(251, 146, 60, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
[data-theme="light"] .fs-frame.is-shown-month,
[data-theme="light"] .fs-frame.is-month {
  background: linear-gradient(180deg, #fde68a, #fb923c);
  border-color: #b45309;
  color: #3a1f0b;
  box-shadow: 0 14px 28px -14px rgba(251, 146, 60, 0.70), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.fs-key {
  font-size: 10px; font-weight: 900; letter-spacing: 0.08em;
}
.fs-year {
  font-size: 8.5px; font-weight: 700; letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .fs-year { color: rgba(0, 0, 0, 0.45); }
.fs-frame.is-month .fs-year { color: rgba(255, 255, 255, 0.85); }
[data-theme="light"] .fs-frame.is-month .fs-year { color: rgba(0, 0, 0, 0.65); }
.fs-bars {
  display: flex; align-items: flex-end; gap: 1.5px;
  height: 16px;
  width: 100%;
  padding: 0 4px;
}
.fs-bar {
  flex: 1; min-width: 0;
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.85), rgba(234, 88, 12, 0.55));
  border-radius: 1.5px;
  opacity: 0.78;
}
[data-theme="light"] .fs-bar {
  background: linear-gradient(180deg, rgba(180, 83, 9, 0.65), rgba(234, 88, 12, 0.45));
  opacity: 0.55;
}
.fs-frame.is-month .fs-bar {
  background: linear-gradient(180deg, #fef3c7, #fb923c);
  opacity: 1;
}
[data-theme="light"] .fs-frame.is-month .fs-bar {
  background: linear-gradient(180deg, #fff5d6, #b45309);
  opacity: 1;
}
.fs-playhead {
  position: absolute; bottom: 2px; left: 50%;
  transform: translateX(-50%);
  width: 26px; height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, #fef3c7, #fb923c);
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.85);
  animation: fs-play-pulse 1.6s ease-in-out infinite;
}
@keyframes fs-play-pulse {
  0%, 100% { transform: translateX(-50%) scaleX(0.85); opacity: 0.85; }
  50%      { transform: translateX(-50%) scaleX(1.15); opacity: 1; }
}

/* ════════════════════════════════════════════════════════════════════════════
   03 · TOOLS BAR
   ════════════════════════════════════════════════════════════════════════════ */
.atl-tools {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  flex-wrap: wrap;
}
.tools-l, .tools-r {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.t-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 13px;
  border-radius: 10px;
  font: inherit; font-size: 11.5px; font-weight: 800; letter-spacing: 0.04em;
  border: 1px solid rgba(251, 191, 36, 0.30);
  background: rgba(255, 255, 255, 0.04);
  color: var(--hr-text);
  cursor: pointer;
  transition: transform .22s cubic-bezier(0.34, 1.56, 0.64, 1), background .25s, border-color .25s, box-shadow .25s;
}
.t-btn:hover {
  transform: translateY(-2px);
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 146, 60, 0.55);
}
[data-theme="light"] .t-btn {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.26);
  color: #3a1f0b;
}
.t-btn.primary {
  position: relative;
  background: linear-gradient(135deg, #fde68a, #fbbf24 40%, #fb923c);
  background-size: 200% 200%;
  border-color: rgba(251, 191, 36, 0.65);
  color: #1f1408;
  box-shadow: 0 12px 24px -10px rgba(251, 146, 60, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.45);
  overflow: hidden;
  isolation: isolate;
  animation: t-btn-pan 6s ease-in-out infinite;
}
@keyframes t-btn-pan {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.t-btn.primary::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.45) 50%, transparent 70%);
  transform: translateX(-130%);
  pointer-events: none;
  animation: t-btn-flare 3.6s linear infinite;
}
@keyframes t-btn-flare {
  0%   { transform: translateX(-130%); }
  60%  { transform: translateX(130%); }
  100% { transform: translateX(130%); }
}
.t-btn.primary:hover {
  box-shadow: 0 22px 40px -14px rgba(251, 146, 60, 0.85);
  letter-spacing: 0.06em;
}

.t-flt {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.22);
}
[data-theme="light"] .t-flt {
  background: rgba(255, 250, 240, 0.86); border-color: rgba(180, 83, 9, 0.20);
}
.t-flt-ic { color: #fbbf24; }
[data-theme="light"] .t-flt-ic { color: #b45309; }
.t-flt > select {
  padding: 2px 4px;
  background: transparent;
  border: 0; outline: none;
  color: var(--hr-text);
  font: inherit; font-size: 12px; font-weight: 700;
  cursor: pointer;
}
.t-flt > select option { background: rgba(20, 14, 8, 0.98); color: var(--hr-text); }
[data-theme="light"] .t-flt > select option { background: #fff; color: #3a1f0b; }

.t-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(251, 191, 36, 0.30);
  color: var(--hr-text-muted);
  font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
  cursor: pointer;
  transition: background .25s, border-color .25s, color .25s, transform .22s;
}
.t-chip input { display: none; }
.t-chip svg { color: #fbbf24; }
.t-chip.is-on {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.16), rgba(251, 191, 36, 0.10));
  border-color: rgba(251, 146, 60, 0.55);
  color: var(--hr-text);
}
.t-chip:hover { transform: translateY(-1px); }
[data-theme="light"] .t-chip {
  background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.30);
}
[data-theme="light"] .t-chip svg { color: #b45309; }

/* ── Custom DROPDOWNS (department / leave type) ────────────────────── */
.ddw {
  position: relative;
  display: inline-block;
}
.ddw-trigger {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 11px 7px 12px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: var(--hr-text);
  font: inherit; font-size: 12px; font-weight: 700;
  cursor: pointer;
  min-width: 140px;
  transition: transform .22s cubic-bezier(0.34, 1.56, 0.64, 1), background .25s, border-color .25s, box-shadow .25s;
}
[data-theme="light"] .ddw-trigger {
  background: rgba(255, 250, 240, 0.86);
  border-color: rgba(180, 83, 9, 0.26);
  color: #3a1f0b;
}
.ddw-trigger:hover {
  transform: translateY(-1px);
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(251, 146, 60, 0.55);
}
.ddw.open .ddw-trigger {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(251, 146, 60, 0.10));
  border-color: rgba(251, 146, 60, 0.65);
  box-shadow: 0 8px 20px -10px rgba(251, 146, 60, 0.55);
}
.ddw-ic { color: #fbbf24; flex-shrink: 0; }
[data-theme="light"] .ddw-ic { color: #b45309; }
.ddw-lbl {
  flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ddw-chev {
  color: var(--hr-text-muted);
  transition: transform .35s cubic-bezier(0.34, 1.56, 0.64, 1);
  flex-shrink: 0;
}
.ddw.open .ddw-chev { transform: rotate(180deg); color: #fbbf24; }
[data-theme="light"] .ddw.open .ddw-chev { color: #b45309; }

.ddw-panel {
  position: absolute;
  top: calc(100% + 6px); left: 0;
  z-index: 800;
  min-width: 220px;
  max-height: 320px;
  padding: 6px;
  border-radius: 14px;
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.18), transparent 60%),
    linear-gradient(180deg, rgba(22, 16, 10, 0.97), rgba(14, 10, 6, 0.99));
  border: 1px solid rgba(251, 191, 36, 0.40);
  box-shadow:
    0 24px 50px -22px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(251, 191, 36, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  display: flex; flex-direction: column; gap: 2px;
  overflow-y: auto;
}
[data-theme="light"] .ddw-panel {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.22), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.97), rgba(255, 244, 218, 0.99));
  border-color: rgba(180, 83, 9, 0.36);
  box-shadow: 0 24px 50px -22px rgba(120, 53, 15, 0.45);
}

.ddw-opt {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 12px 8px 10px;
  border-radius: 10px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--hr-text);
  font: inherit; font-size: 12px; font-weight: 700;
  cursor: pointer;
  text-align: left;
  transition: background .2s, color .2s, transform .2s, border-color .2s;
}
.ddw-opt:hover {
  background: rgba(251, 191, 36, 0.10);
  border-color: rgba(251, 191, 36, 0.32);
  transform: translateX(2px);
}
[data-theme="light"] .ddw-opt:hover {
  background: rgba(251, 191, 36, 0.18);
  border-color: rgba(180, 83, 9, 0.30);
}
.ddw-opt.on {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.20), rgba(251, 146, 60, 0.10));
  border-color: rgba(251, 146, 60, 0.55);
  color: #fef3c7;
}
[data-theme="light"] .ddw-opt.on {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.30), rgba(251, 146, 60, 0.16));
  border-color: rgba(180, 83, 9, 0.55);
  color: #3a1f0b;
}
.ddw-opt-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: rgba(251, 191, 36, 0.45);
  box-shadow: 0 0 5px rgba(251, 191, 36, 0.25);
  flex-shrink: 0;
}
.ddw-opt > span:nth-of-type(2) {
  flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ddw-opt-check {
  color: #fbbf24; flex-shrink: 0;
}
[data-theme="light"] .ddw-opt-check { color: #b45309; }

.ddw-opt-meta {
  display: inline-block;
  margin-left: 4px;
  font-size: 9.5px; font-weight: 700;
  color: var(--hr-text-muted);
  letter-spacing: 0.04em;
  text-transform: lowercase;
}
[data-theme="light"] .ddw-opt-meta { color: #8a6d3b; }

.ddw-empty {
  padding: 12px 14px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
  color: var(--hr-text-muted);
  text-align: center;
  font-style: italic;
}

.ddw-pop-enter-active, .ddw-pop-leave-active {
  transition: opacity .25s, transform .3s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: top left;
}
.ddw-pop-enter-from, .ddw-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

/* View pill toggle — equal-width buttons keep the slider perfectly inside */
.view-pill {
  position: relative;
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  align-items: stretch;
  padding: 3px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.32);
  min-width: 220px;
}
[data-theme="light"] .view-pill {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.26);
}
.vp-btn {
  position: relative; z-index: 1;
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  padding: 7px 12px;
  border-radius: 999px;
  background: transparent;
  border: 0;
  font: inherit; font-size: 11px; font-weight: 800; letter-spacing: 0.05em;
  color: var(--hr-text-muted);
  cursor: pointer;
  transition: color .25s;
}
.vp-btn.active { color: #1f1408; }
.vp-slider {
  position: absolute; top: 3px; bottom: 3px; left: 3px;
  width: calc(50% - 3px);
  border-radius: 999px;
  background: linear-gradient(135deg, #fde68a, #fbbf24 40%, #fb923c);
  box-shadow: 0 8px 18px -10px rgba(251, 146, 60, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.45);
  transition: transform .45s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 0;
}
.vp-slider.s-grid  { transform: translateX(0); }
.vp-slider.s-gantt { transform: translateX(100%); }

/* ════════════════════════════════════════════════════════════════════════════
   HEAT STRIP — daily intensity ribbon
   ════════════════════════════════════════════════════════════════════════════ */
.heat-strip {
  display: grid;
  height: 28px;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(251, 191, 36, 0.22);
  overflow: hidden; gap: 1px; padding: 1px;
}
[data-theme="light"] .heat-strip {
  background: rgba(255, 250, 240, 0.65); border-color: rgba(180, 83, 9, 0.16);
}
.heat-cell {
  position: relative;
  background: var(--c, transparent);
  border: 0;
  border-radius: 4px;
  display: grid; place-items: end center;
  cursor: pointer;
  transition: transform .22s, box-shadow .22s;
}
.heat-cell:hover { transform: translateY(-2px) scale(1.04); box-shadow: 0 6px 14px -6px rgba(251, 191, 36, 0.55); z-index: 2; }
.heat-cell.today { box-shadow: inset 0 -2px 0 #fbbf24; }
.heat-cell.weekend::before {
  content: '';
  position: absolute; inset: 0;
  background: repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 4px, transparent 4px 8px);
  pointer-events: none; border-radius: inherit;
}
[data-theme="light"] .heat-cell.weekend::before {
  background: repeating-linear-gradient(45deg, rgba(180,83,9,0.06) 0 4px, transparent 4px 8px);
}
.heat-cell.conflict {
  background: repeating-linear-gradient(45deg,
    rgba(234, 88, 12, 0.55) 0 4px,
    rgba(234, 88, 12, 0.30) 4px 8px) !important;
}
.heat-day { font-size: 8.5px; color: var(--hr-text-muted); padding-bottom: 3px; font-variant-numeric: tabular-nums; }

/* ══════════════════════════════════════════════════════════════════════
   HEAT-STRIP TOOLTIP — glassmorphic, gold accent, teleported
   ══════════════════════════════════════════════════════════════════════ */
.ht-tip {
  position: fixed;
  z-index: 2000;
  pointer-events: none;
  width: 300px;
  padding: 14px 16px 13px;
  border-radius: 16px;
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(251, 146, 60, 0.16), transparent 65%),
    linear-gradient(180deg, rgba(22, 16, 10, 0.93), rgba(14, 10, 6, 0.97));
  border: 1px solid rgba(251, 191, 36, 0.42);
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
[data-theme="light"] .ht-tip {
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(251, 191, 36, 0.22), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(251, 146, 60, 0.18), transparent 65%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.97), rgba(255, 244, 218, 0.99));
  border-color: rgba(180, 83, 9, 0.32);
  color: #3a1f0b;
  box-shadow:
    0 30px 60px -28px rgba(120, 53, 15, 0.40),
    0 0 0 1px rgba(180, 83, 9, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
.ht-glow {
  position: absolute;
  inset: -40% -40% auto auto;
  width: 240px; height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.30), transparent 65%);
  filter: blur(40px);
  opacity: 0.85;
  pointer-events: none; z-index: 0;
}
.ht-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(251, 191, 36, 0.07) 1px, transparent 1px);
  background-size: 14px 14px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent);
  opacity: 0.55;
  pointer-events: none; z-index: 0;
}
[data-theme="light"] .ht-grid {
  background-image: radial-gradient(rgba(180, 83, 9, 0.10) 1px, transparent 1px);
}

.ht-head {
  position: relative; z-index: 1;
  display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
  margin-bottom: 10px;
}
.ht-head-l { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
.ht-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--hr-text-muted, #b5a07e);
}
.ht-eye-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #fbbf24; box-shadow: 0 0 8px #fbbf24;
}
.ht-eye-dot.is-busy { background: #fb923c; box-shadow: 0 0 8px #fb923c; }
.ht-eye-dot.is-today { background: #34d399; box-shadow: 0 0 10px #34d399; animation: ht-led 1.6s ease-in-out infinite; }
.ht-eye-dot.is-conflict { background: #ef4444; box-shadow: 0 0 12px #ef4444; animation: ht-led 0.9s ease-in-out infinite; }
@keyframes ht-led {
  0%, 100% { opacity: 0.75; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.4); }
}
.ht-eye-today { color: #5eead4; font-weight: 800; letter-spacing: 0.08em; }
[data-theme="light"] .ht-eye-today { color: #047857; }
.ht-eye-off   { color: rgba(255, 255, 255, 0.45); font-weight: 800; letter-spacing: 0.08em; }
[data-theme="light"] .ht-eye-off { color: #6b5840; }

.ht-date {
  font-size: 13.5px; font-weight: 800; letter-spacing: -0.005em;
  color: var(--hr-text, #f4eee2);
}
[data-theme="light"] .ht-date { color: #3a1f0b; }

.ht-pill {
  display: inline-flex; align-items: baseline; gap: 4px;
  padding: 6px 11px;
  border-radius: 999px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}
[data-theme="light"] .ht-pill { background: rgba(180, 83, 9, 0.08); border-color: rgba(180, 83, 9, 0.18); }
.ht-pill strong {
  font-size: 18px; font-weight: 900; letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fef3c7, #fbbf24 50%, #fb923c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  font-variant-numeric: tabular-nums;
}
.ht-pill small {
  font-size: 9px; font-weight: 700; color: var(--hr-text-muted, #b5a07e);
  letter-spacing: 0.06em; text-transform: uppercase;
}
.ht-pill[data-tone="amber"] strong {
  background: linear-gradient(135deg, #fcd34d, #f59e0b 60%, #c2410c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.ht-pill[data-tone="crimson"] {
  background: rgba(248, 113, 113, 0.18);
  border-color: rgba(248, 113, 113, 0.45);
}
.ht-pill[data-tone="crimson"] strong {
  background: linear-gradient(135deg, #fecaca, #ef4444 60%, #991b1b);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.ht-pill[data-tone="idle"] strong {
  background: none;
  -webkit-text-fill-color: var(--hr-text-muted);
  color: var(--hr-text-muted);
}
[data-theme="light"] .ht-pill[data-tone="idle"] strong {
  -webkit-text-fill-color: #6b5840; color: #6b5840;
}

.ht-list {
  position: relative; z-index: 1;
  margin: 0; padding: 0; list-style: none;
  display: flex; flex-direction: column; gap: 5px;
}
.ht-row {
  --c: #fbbf24;
  position: relative;
  display: grid; grid-template-columns: auto 1fr auto; gap: 9px; align-items: center;
  padding: 6px 9px 6px 11px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid color-mix(in srgb, var(--c) 28%, rgba(251, 191, 36, 0.15));
  overflow: hidden;
}
[data-theme="light"] .ht-row {
  background: rgba(255, 250, 240, 0.65);
  border-color: color-mix(in srgb, var(--c) 32%, rgba(180, 83, 9, 0.15));
}
.ht-row::before {
  content: '';
  position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 30%, transparent));
}
.ht-row-av {
  display: grid; place-items: center;
  width: 24px; height: 24px; border-radius: 50%;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 70%, #fbbf24), color-mix(in srgb, var(--c) 30%, #fb923c));
  color: #1f1408;
  font-size: 9px; font-weight: 900;
  flex-shrink: 0;
}
.ht-row-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ht-row-meta strong {
  font-size: 12px; font-weight: 800; color: var(--hr-text, #f4eee2);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
[data-theme="light"] .ht-row-meta strong { color: #3a1f0b; }
.ht-row-meta .leave-mono {
  font-size: 9.5px; color: var(--hr-text-muted, #b5a07e);
  letter-spacing: 0.04em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ht-row-pend {
  font-size: 8.5px; font-weight: 900; letter-spacing: 0.14em;
  padding: 2px 6px; border-radius: 999px;
  background: rgba(245, 158, 11, 0.18);
  border: 1px solid rgba(245, 158, 11, 0.45);
  color: #fcd34d;
}
[data-theme="light"] .ht-row-pend { color: #b45309; }

.ht-more {
  position: relative; z-index: 1;
  font-size: 9.5px; font-weight: 700;
  color: var(--hr-text-muted, #b5a07e);
  text-align: center;
  padding: 4px 0 2px;
  letter-spacing: 0.04em;
}

.ht-quiet {
  position: relative; z-index: 1;
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 11px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.08);
  font-size: 11px;
  color: var(--hr-text-secondary, #d8c8a3);
}
[data-theme="light"] .ht-quiet {
  background: rgba(255, 244, 218, 0.55);
  border-color: rgba(180, 83, 9, 0.18);
  color: #6b4d20;
}
.ht-quiet small {
  display: block;
  font-size: 9.5px; color: var(--hr-text-muted);
  letter-spacing: 0.04em;
  margin-top: 1px;
}
.ht-quiet svg { color: #fbbf24; flex-shrink: 0; }
[data-theme="light"] .ht-quiet svg { color: #b45309; }

.ht-conflict {
  position: relative; z-index: 1;
  margin-top: 8px;
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.14);
  border: 1px solid rgba(239, 68, 68, 0.45);
  color: #fca5a5;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em;
}
[data-theme="light"] .ht-conflict { color: #b91c1c; background: rgba(254, 226, 226, 0.6); }

.ht-pop-enter-active { transition: opacity .22s ease, transform .35s cubic-bezier(0.16, 1, 0.3, 1); }
.ht-pop-leave-active { transition: opacity .14s ease, transform .2s ease; }
.ht-pop-enter-from   { opacity: 0; transform: translateY(8px) scale(0.96); }
.ht-pop-leave-to     { opacity: 0; transform: translateY(4px) scale(0.98); }

/* Active-shift chip — only shown when a shift filter is engaged */
.shift-chip {
  display: inline-flex; align-items: center; gap: 7px;
  width: max-content; max-width: 100%;
  padding: 6px 8px 6px 12px;
  border-radius: 999px;
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(251, 146, 60, 0.10));
  border: 1px solid rgba(251, 146, 60, 0.55);
  color: var(--hr-text);
  font-size: 11px; font-weight: 700; letter-spacing: 0.02em;
  box-shadow: 0 8px 18px -10px rgba(251, 146, 60, 0.55);
}
[data-theme="light"] .shift-chip {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.26), rgba(255, 250, 240, 0.85));
  border-color: rgba(180, 83, 9, 0.42);
  color: #3a1f0b;
}
.shift-chip svg { color: #fb923c; flex-shrink: 0; }
[data-theme="light"] .shift-chip svg { color: #b45309; }
.shift-chip b { font-weight: 800; color: var(--hr-text); }
[data-theme="light"] .shift-chip b { color: #3a1f0b; }
.shift-chip-x {
  display: grid; place-items: center;
  width: 20px; height: 20px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(251, 146, 60, 0.45);
  color: var(--hr-text-muted);
  cursor: pointer;
  transition: transform .25s cubic-bezier(0.34, 1.56, 0.64, 1), background .2s, color .2s;
  margin-left: 4px;
}
.shift-chip-x:hover {
  background: rgba(248, 113, 113, 0.18);
  border-color: rgba(248, 113, 113, 0.55);
  color: #fca5a5;
  transform: rotate(90deg);
}
[data-theme="light"] .shift-chip-x {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.32);
  color: #6b5840;
}

/* ════════════════════════════════════════════════════════════════════════════
   04A · MONTH GRID
   ════════════════════════════════════════════════════════════════════════════ */
.atl-grid {
  display: flex; flex-direction: column; gap: 8px;
}
.grid-head {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;
  padding: 0 4px;
}
.gh-cell {
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--hr-text-muted);
  text-align: center;
  padding: 4px 0;
}

.grid-body, .grid-skel {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;
  perspective: 1600px;
  perspective-origin: 50% 0%;
}
@media (max-width: 720px) {
  .grid-body, .grid-skel { grid-template-columns: repeat(7, 1fr); gap: 4px; }
}

.cell {
  position: relative;
  display: flex; flex-direction: column; gap: 6px;
  min-height: 110px;
  padding: 10px 11px 14px;
  border-radius: 16px;
  background:
    radial-gradient(140% 100% at 0% 0%, rgba(251, 191, 36, 0.07), transparent 65%),
    linear-gradient(180deg, rgba(28, 18, 10, 0.65), rgba(20, 14, 8, 0.82));
  border: 1px solid rgba(251, 191, 36, 0.18);
  overflow: hidden;
  isolation: isolate;
  cursor: pointer;
  transform-style: preserve-3d;
  transition:
    transform .45s cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color .25s, box-shadow .3s, background .25s;
}
[data-theme="light"] .cell {
  background:
    radial-gradient(140% 100% at 0% 0%, rgba(251, 191, 36, 0.10), transparent 65%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 244, 218, 0.96));
  border-color: rgba(180, 83, 9, 0.18);
}
/* Per-cell decorative corner streak — only visible on hover */
.cell::before {
  content: '';
  position: absolute; top: 0; right: 0;
  width: 60px; height: 60px;
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.18), transparent 60%);
  border-bottom-left-radius: 60px;
  opacity: 0;
  transition: opacity .35s;
  pointer-events: none;
}
.cell:hover::before { opacity: 1; }
.cell:hover {
  border-color: rgba(251, 146, 60, 0.65);
  transform: translateY(-4px) scale(1.02);
  box-shadow:
    0 22px 38px -22px rgba(251, 191, 36, 0.55),
    inset 0 0 0 1px rgba(251, 191, 36, 0.25);
}
.cell.is-out-of-month { opacity: 0.35; }
.cell.is-out-of-month:hover { opacity: 0.55; }
.cell.is-weekend {
  background:
    repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 6px, transparent 6px 12px),
    linear-gradient(180deg, rgba(28, 18, 10, 0.62), rgba(20, 14, 8, 0.78));
}
[data-theme="light"] .cell.is-weekend {
  background:
    repeating-linear-gradient(45deg, rgba(180,83,9,0.05) 0 6px, transparent 6px 12px),
    linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 244, 218, 0.96));
}
.cell.is-today {
  border-color: rgba(251, 191, 36, 0.85);
  background:
    radial-gradient(140% 100% at 100% 0%, rgba(251, 146, 60, 0.20), transparent 65%),
    linear-gradient(180deg, rgba(40, 25, 10, 0.85), rgba(30, 18, 8, 0.92));
  box-shadow:
    0 22px 44px -20px rgba(251, 146, 60, 0.70),
    inset 0 0 0 1px rgba(251, 191, 36, 0.50);
  animation: cell-today-glow 3s ease-in-out infinite;
}
[data-theme="light"] .cell.is-today {
  background:
    radial-gradient(140% 100% at 100% 0%, rgba(251, 146, 60, 0.28), transparent 65%),
    linear-gradient(180deg, rgba(254, 243, 199, 0.95), rgba(253, 230, 138, 0.92));
}
@keyframes cell-today-glow {
  0%, 100% { box-shadow: 0 22px 44px -20px rgba(251, 146, 60, 0.55), inset 0 0 0 1px rgba(251, 191, 36, 0.40); }
  50%      { box-shadow: 0 28px 56px -20px rgba(251, 146, 60, 0.90), inset 0 0 0 1px rgba(251, 191, 36, 0.80); }
}
.cell.has-load[data-load="high"]   { border-color: rgba(245, 158, 11, 0.55); }
.cell.has-conflict {
  border-color: rgba(239, 68, 68, 0.65) !important;
}

.cl-head {
  display: flex; align-items: center; justify-content: space-between; gap: 6px;
  position: relative; z-index: 1;
}
.cl-day {
  font-size: 16px; font-weight: 900; color: var(--hr-text);
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.cell.is-today .cl-day {
  font-size: 19px;
  background: linear-gradient(135deg, #fde68a, #fb923c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.45));
}
[data-theme="light"] .cell.is-today .cl-day {
  background: linear-gradient(135deg, #92400e, #c2410c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.cl-today {
  font-size: 7.5px; font-weight: 900; letter-spacing: 0.18em;
  padding: 3px 6px;
  border-radius: 5px;
  background: linear-gradient(135deg, #fbbf24, #fb923c);
  color: #1f1408;
  text-transform: uppercase;
  box-shadow: 0 4px 10px -4px rgba(251, 146, 60, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.45);
  animation: cl-today-pulse 2s ease-in-out infinite;
}
@keyframes cl-today-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.08); }
}
.cl-count {
  font-size: 10px; font-weight: 800;
  color: var(--hr-text-muted);
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.30);
  font-variant-numeric: tabular-nums;
}
[data-theme="light"] .cl-count {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.26);
  color: #6b5840;
}

.cl-chips {
  display: flex; gap: 4px; flex-wrap: wrap;
  position: relative; z-index: 1;
}
.cl-chip {
  --c: #fbbf24;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 7px 3px 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c) 22%, transparent) !important;
  border: 1px solid color-mix(in srgb, var(--c) 55%, transparent);
  font-size: 9.5px;
  color: var(--hr-text);
  transition: transform .2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.cl-chip:hover { transform: translateY(-1px); }
.cc-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--c);
  box-shadow: 0 0 6px var(--c);
}
.cc-num { font-weight: 800; letter-spacing: 0.04em; }

.cl-avatars {
  display: flex; align-items: center;
  margin-top: auto;
  height: 26px;
  position: relative; z-index: 1;
}
.av {
  --c: #fbbf24;
  display: grid; place-items: center;
  width: 26px; height: 26px; border-radius: 50%;
  margin-left: -7px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 70%, #fbbf24), color-mix(in srgb, var(--c) 30%, #fb923c));
  color: #1f1408;
  font-size: 9.5px; font-weight: 900;
  border: 2px solid rgba(20, 14, 8, 0.98);
  box-shadow: 0 4px 8px -4px color-mix(in srgb, var(--c) 70%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition: transform .35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.av:first-child { margin-left: 0; }
.cell:hover .av { transform: translateY(-2px); }
.cell:hover .av:nth-child(1) { transition-delay: 0s; }
.cell:hover .av:nth-child(2) { transition-delay: 0.04s; }
.cell:hover .av:nth-child(3) { transition-delay: 0.08s; }
.cell:hover .av:nth-child(4) { transition-delay: 0.12s; }
[data-theme="light"] .av { border-color: rgba(255, 250, 240, 0.98); }
.av-more {
  margin-left: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.04em;
  color: var(--hr-text-muted);
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.22);
}
[data-theme="light"] .av-more {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(180, 83, 9, 0.22);
}

.cl-rail {
  position: absolute; left: 11px; right: 11px; bottom: 5px;
  height: 3px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
  z-index: 1;
}
[data-theme="light"] .cl-rail { background: rgba(180, 83, 9, 0.12); }
.cl-fill {
  display: block; height: 100%;
  background: linear-gradient(90deg, #fbbf24, #fb923c);
  border-radius: 999px;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.65);
  transition: width .8s cubic-bezier(0.16, 1, 0.3, 1);
}
.cell.has-conflict .cl-fill {
  background: linear-gradient(90deg, #ef4444, #b91c1c);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.65);
}

.cl-conflict {
  position: absolute; right: 8px; top: 8px;
  display: grid; place-items: center;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: #fef3c7;
  border: 1px solid rgba(239, 68, 68, 0.65);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.55);
  animation: conflict-pulse 1.4s ease-in-out infinite;
}
@keyframes conflict-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 8px rgba(239, 68, 68, 0.40); }
  50%      { transform: scale(1.12); box-shadow: 0 0 14px rgba(239, 68, 68, 0.85); }
}

/* ════════════════════════════════════════════════════════════════════════════
   04B · SWIMLANES (Gantt) — ultra-modern layout
   ════════════════════════════════════════════════════════════════════════════ */
.atl-swim { display: flex; flex-direction: column; }

/* Frame wraps the head + body so the "today" line + decoration share context */
.swim-frame {
  position: relative;
  padding: 12px 12px 14px;
  border-radius: 20px;
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.10), transparent 65%),
    linear-gradient(180deg, rgba(28, 18, 10, 0.62), rgba(20, 14, 8, 0.78));
  border: 1px solid rgba(251, 191, 36, 0.20);
  box-shadow: 0 18px 38px -22px rgba(120, 53, 15, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  overflow: hidden;
  isolation: isolate;
}
[data-theme="light"] .swim-frame {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.14), transparent 65%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 244, 218, 0.96));
  border-color: rgba(180, 83, 9, 0.18);
}

/* Header: two-line per day (weekday letter + day number) */
.swim-head {
  display: grid; gap: 3px;
  padding: 6px 4px 12px;
  border-bottom: 1px dashed rgba(251, 191, 36, 0.22);
  margin-bottom: 6px;
  position: relative; z-index: 2;
}
[data-theme="light"] .swim-head { border-bottom-color: rgba(180, 83, 9, 0.22); }

.sh-id-cell {
  display: flex; flex-direction: column; justify-content: center; gap: 2px;
  padding: 0 12px;
}
.sh-id-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; font-weight: 900; letter-spacing: 0.18em; text-transform: uppercase;
  color: #fbbf24;
}
.sh-id-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fbbf24; box-shadow: 0 0 8px #fbbf24;
  animation: ht-led 2s ease-in-out infinite;
}
[data-theme="light"] .sh-id-eye { color: #b45309; }
[data-theme="light"] .sh-id-dot { background: #b45309; box-shadow: 0 0 6px rgba(180, 83, 9, 0.55); }
.sh-id-meta {
  font-size: 10px; font-weight: 700; color: var(--hr-text-muted); letter-spacing: 0.04em;
}

.sh-day {
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  padding: 4px 0 5px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background .22s, border-color .22s, transform .22s cubic-bezier(0.34, 1.56, 0.64, 1);
  font-variant-numeric: tabular-nums;
}
.sh-day:hover {
  transform: translateY(-2px);
  background: rgba(251, 191, 36, 0.10);
  border-color: rgba(251, 191, 36, 0.32);
}
.sh-wd {
  font-size: 8px; font-weight: 800; letter-spacing: 0.10em;
  color: var(--hr-text-muted); text-transform: uppercase;
}
.sh-num {
  font-size: 11px; font-weight: 800;
  color: var(--hr-text);
}
.sh-day.weekend .sh-wd,
.sh-day.weekend .sh-num { color: color-mix(in srgb, var(--hr-text-muted) 70%, transparent); }
.sh-day.busy .sh-num { color: #fbbf24; }
[data-theme="light"] .sh-day.busy .sh-num { color: #b45309; }
.sh-day.today {
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.22), rgba(251, 146, 60, 0.12));
  border-color: rgba(251, 191, 36, 0.55);
}
.sh-day.today .sh-wd,
.sh-day.today .sh-num {
  background: linear-gradient(135deg, #fde68a, #fb923c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
[data-theme="light"] .sh-day.today .sh-wd,
[data-theme="light"] .sh-day.today .sh-num {
  background: linear-gradient(135deg, #92400e, #c2410c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.sh-today-pip {
  position: absolute; left: 50%; bottom: 1px;
  transform: translateX(-50%);
  width: 14px; height: 2px; border-radius: 999px;
  background: linear-gradient(90deg, #fef3c7, #fb923c);
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.85);
  animation: sh-pip-pulse 1.6s ease-in-out infinite;
}
@keyframes sh-pip-pulse {
  0%, 100% { transform: translateX(-50%) scaleX(0.75); opacity: 0.85; }
  50%      { transform: translateX(-50%) scaleX(1.15); opacity: 1; }
}

/* Vertical "today" line spanning the whole frame body */
.swim-today-line {
  position: absolute;
  top: 56px; bottom: 14px;
  width: 1.5px;
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.65), rgba(251, 146, 60, 0.10));
  pointer-events: none;
  z-index: 1;
  filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.55));
  animation: swl-pulse 2.4s ease-in-out infinite;
}
@keyframes swl-pulse {
  0%, 100% { opacity: 0.65; }
  50%      { opacity: 1; }
}

/* Body */
.swim-body {
  display: flex; flex-direction: column; gap: 8px;
  padding: 4px 0;
  position: relative; z-index: 2;
}
.swim-row {
  display: grid; gap: 4px; align-items: center;
  /* column template comes from the `--days` inline var (see template note) so
     we never hand motion-v a transform-wiping string style. */
  grid-template-columns: 220px repeat(var(--days, 30), minmax(0, 1fr));
  min-height: 48px;
  padding: 4px 4px;
  border-radius: 12px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.02), transparent 30%);
  border: 1px solid transparent;
  transition: border-color .22s, background .22s, transform .22s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-style: preserve-3d;
}
.swim-row:hover {
  border-color: rgba(251, 191, 36, 0.18);
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.06), transparent 30%);
}
[data-theme="light"] .swim-row:hover {
  border-color: rgba(180, 83, 9, 0.22);
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.10), transparent 30%);
}

.swim-id {
  display: flex; align-items: center; gap: 10px;
  padding: 0 10px;
  min-width: 0;
  position: relative;
}
.si-av {
  --c: #fbbf24;
  position: relative;
  display: grid; place-items: center;
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 70%, #fbbf24), color-mix(in srgb, var(--c) 30%, #fb923c));
  color: #1f1408;
  font-size: 11px; font-weight: 900;
  flex-shrink: 0;
  box-shadow: 0 6px 14px -6px color-mix(in srgb, var(--c) 70%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.si-av-init { position: relative; z-index: 2; }
.si-av-glow {
  position: absolute; inset: -4px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--c) 55%, transparent), transparent 70%);
  filter: blur(8px);
  opacity: 0.65;
  z-index: 0;
  pointer-events: none;
  animation: si-glow-pulse 3s ease-in-out infinite;
}
@keyframes si-glow-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%      { opacity: 0.8; transform: scale(1.10); }
}
.si-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.si-info strong {
  font-size: 13px; font-weight: 800; color: var(--hr-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 100%;
  letter-spacing: -0.005em;
}
.si-info > span {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; color: var(--hr-text-muted); letter-spacing: 0.04em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.si-sep { color: rgba(251, 191, 36, 0.55); }
[data-theme="light"] .si-sep { color: rgba(180, 83, 9, 0.45); }
.si-count {
  flex-shrink: 0;
  font-size: 11px; font-weight: 900;
  padding: 3px 9px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.20), rgba(251, 146, 60, 0.10));
  border: 1px solid rgba(251, 146, 60, 0.45);
  color: #fde68a;
  font-variant-numeric: tabular-nums;
}
[data-theme="light"] .si-count {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.32), rgba(255, 250, 240, 0.7));
  border-color: rgba(180, 83, 9, 0.42);
  color: #92400e;
}

.swim-track {
  display: grid; position: relative;
  background:
    repeating-linear-gradient(90deg, transparent 0 calc(100% / 7 - 1px), rgba(251, 191, 36, 0.05) calc(100% / 7 - 1px) calc(100% / 7)),
    rgba(255, 255, 255, 0.02);
  border-radius: 10px;
  padding: 4px;
  min-height: 36px;
  isolation: isolate;
}
[data-theme="light"] .swim-track {
  background:
    repeating-linear-gradient(90deg, transparent 0 calc(100% / 7 - 1px), rgba(180, 83, 9, 0.06) calc(100% / 7 - 1px) calc(100% / 7)),
    rgba(255, 250, 240, 0.55);
}

/* Weekend backdrop tiles inside the track */
.swim-weekend {
  grid-row: 1;
  background: repeating-linear-gradient(45deg, rgba(148, 163, 184, 0.10) 0 4px, transparent 4px 8px);
  border-radius: 4px;
  pointer-events: none;
}
[data-theme="light"] .swim-weekend {
  background: repeating-linear-gradient(45deg, rgba(180, 83, 9, 0.08) 0 4px, transparent 4px 8px);
}

/* The Gantt bar — 3D depth + caps + hover shimmer */
.bar {
  --c: #fbbf24;
  grid-row: 1;
  position: relative;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 100%, transparent), color-mix(in srgb, var(--c) 65%, #fb923c));
  display: flex; align-items: center; justify-content: center;
  padding: 0 10px;
  cursor: pointer;
  transform-origin: left center;
  border: 1px solid color-mix(in srgb, var(--c) 75%, transparent);
  box-shadow:
    0 8px 18px -10px color-mix(in srgb, var(--c) 80%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    inset 0 -1px 0 rgba(0, 0, 0, 0.18);
  transition:
    transform .3s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow .25s, filter .25s, letter-spacing .25s;
  font: inherit;
  overflow: hidden;
  isolation: isolate;
}
.bar.pending {
  background:
    repeating-linear-gradient(135deg, rgba(255,255,255,0.22) 0 4px, transparent 4px 8px),
    linear-gradient(135deg, color-mix(in srgb, var(--c) 100%, transparent), color-mix(in srgb, var(--c) 65%, #fb923c));
}
.bar:hover {
  filter: brightness(1.10);
  transform: translateY(-3px) scale(1.02);
  box-shadow:
    0 16px 28px -10px color-mix(in srgb, var(--c) 85%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 -1px 0 rgba(0, 0, 0, 0.20);
  letter-spacing: 0.12em;
}
.bar-cap {
  position: absolute; top: 0; bottom: 0; width: 4px;
  background: rgba(0, 0, 0, 0.22);
  pointer-events: none;
}
.bar-cap.left  { left: 0; border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
.bar-cap.right { right: 0; border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
.bar-lbl {
  font-size: 9.5px; font-weight: 900; letter-spacing: 0.10em;
  color: #1f1408; text-transform: uppercase;
  position: relative; z-index: 2;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.25);
}
.bar-trail {
  position: absolute; right: 0; top: 0; bottom: 0; width: 20px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--c) 60%, transparent));
  filter: blur(6px);
  opacity: 0.8;
  pointer-events: none;
}
.bar-shimmer {
  position: absolute; inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.30) 50%, transparent 70%);
  transform: translateX(-130%);
  pointer-events: none;
  transition: transform .9s cubic-bezier(0.16, 1, 0.3, 1);
}
.bar:hover .bar-shimmer { transform: translateX(130%); }

/* Swim empty — distinct style, matches design language */
.swim-empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 56px 24px;
  border-radius: 16px;
  background:
    radial-gradient(60% 50% at 50% 0%, rgba(251, 191, 36, 0.10), transparent 65%),
    rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(251, 191, 36, 0.30);
  color: var(--hr-text);
  text-align: center;
  margin-top: 6px;
}
[data-theme="light"] .swim-empty {
  background:
    radial-gradient(60% 50% at 50% 0%, rgba(251, 191, 36, 0.12), transparent 65%),
    rgba(255, 250, 240, 0.55);
  border-color: rgba(180, 83, 9, 0.30);
}
.se-mark {
  position: relative;
  display: grid; place-items: center;
  width: 76px; height: 76px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.22), transparent 65%);
  color: #fbbf24;
  margin-bottom: 2px;
}
[data-theme="light"] .se-mark svg { color: #b45309; }
.se-orbit {
  position: absolute; inset: -5px;
  border-radius: 50%;
  border: 1px dashed rgba(251, 191, 36, 0.55);
  animation: se-orbit-spin 12s linear infinite;
}
@keyframes se-orbit-spin { to { transform: rotate(360deg); } }
.se-pulse {
  position: absolute; inset: -2px;
  border-radius: 50%;
  border: 1.5px solid rgba(251, 146, 60, 0.55);
  animation: se-pulse 2.4s ease-in-out infinite;
  pointer-events: none;
}
@keyframes se-pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50%      { transform: scale(1.15); opacity: 0; }
}
.swim-empty strong { font-size: 16px; font-weight: 800; }
.swim-empty span { font-size: 12px; color: var(--hr-text-secondary); max-width: 460px; line-height: 1.55; }

/* ════════════════════════════════════════════════════════════════════════════
   EMPTY STATE
   ════════════════════════════════════════════════════════════════════════════ */
.atl-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 56px 24px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.55), rgba(20, 14, 8, 0.78));
  border: 1px dashed rgba(251, 191, 36, 0.30);
  color: var(--hr-text);
  text-align: center;
}
[data-theme="light"] .atl-empty {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.85), rgba(255, 244, 218, 0.90));
  border-color: rgba(180, 83, 9, 0.30);
}
.atl-empty svg { color: #fbbf24; }
[data-theme="light"] .atl-empty svg { color: #b45309; }
.atl-empty strong { font-size: 16px; font-weight: 800; }
.atl-empty span { font-size: 12.5px; color: var(--hr-text-secondary); max-width: 380px; }

/* ════════════════════════════════════════════════════════════════════════════
   05 · DAY SPOTLIGHT OVERLAY
   ════════════════════════════════════════════════════════════════════════════ */
.day-spot {
  position: fixed; inset: 0;
  z-index: 1300;
  display: flex; align-items: center; justify-content: center;
  padding: 28px 20px;
  background:
    radial-gradient(60% 50% at 50% 50%, rgba(251, 146, 60, 0.22), transparent 65%),
    rgba(10, 7, 4, 0.55);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
}
[data-theme="light"] .day-spot {
  background:
    radial-gradient(60% 50% at 50% 50%, rgba(217, 119, 6, 0.30), transparent 65%),
    rgba(40, 25, 10, 0.45);
}
.ds-card {
  position: relative;
  width: 760px; max-width: 100%;
  max-height: 85vh;
  border-radius: 24px;
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.22), transparent 60%),
    radial-gradient(80% 60% at 100% 100%, rgba(251, 146, 60, 0.18), transparent 65%),
    linear-gradient(180deg, rgba(22, 16, 10, 0.97), rgba(14, 10, 6, 0.99));
  border: 1px solid rgba(251, 191, 36, 0.42);
  box-shadow:
    0 60px 120px -40px rgba(0, 0, 0, 0.85),
    0 0 0 1px rgba(251, 191, 36, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  display: flex; flex-direction: column;
  overflow: hidden;
  isolation: isolate;
}
/* Inner ambient flairs */
.ds-card::before {
  content: '';
  position: absolute;
  top: -60px; right: -60px;
  width: 200px; height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.32), transparent 65%);
  filter: blur(28px);
  pointer-events: none;
  z-index: 0;
  animation: ds-orb 8s ease-in-out infinite;
}
.ds-card::after {
  content: '';
  position: absolute;
  bottom: -80px; left: -40px;
  width: 240px; height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(234, 88, 12, 0.25), transparent 65%);
  filter: blur(40px);
  pointer-events: none;
  z-index: 0;
  animation: ds-orb-b 11s ease-in-out infinite;
}
@keyframes ds-orb {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.85; }
  50%      { transform: translate(-20px, 20px) scale(1.08); opacity: 1; }
}
@keyframes ds-orb-b {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.7; }
  50%      { transform: translate(24px, -16px) scale(1.10); opacity: 1; }
}
[data-theme="light"] .ds-card {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.22), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.97), rgba(255, 244, 218, 0.99));
  border-color: rgba(180, 83, 9, 0.36);
  box-shadow: 0 50px 100px -36px rgba(120, 53, 15, 0.45);
}

.ds-head {
  position: relative; z-index: 1;
  display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;
  padding: 20px 24px 16px;
  border-bottom: 1px dashed rgba(251, 191, 36, 0.25);
}
[data-theme="light"] .ds-head { border-bottom-color: rgba(180, 83, 9, 0.25); }
.ds-head-l { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.ds-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: #fde68a;
}
[data-theme="light"] .ds-eye { color: #92400e; }
.ds-led {
  width: 6px; height: 6px; border-radius: 50%;
  background: #fbbf24; box-shadow: 0 0 8px #fbbf24;
  animation: led-blink 1.8s ease-in-out infinite;
}
[data-theme="light"] .ds-led { background: #b45309; box-shadow: 0 0 6px rgba(180, 83, 9, 0.55); }
.ds-title {
  margin: 0;
  font-size: 19px; font-weight: 900; letter-spacing: -0.018em;
  background: linear-gradient(135deg, #fef3c7, #fbbf24 50%, #fb923c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
[data-theme="light"] .ds-title {
  background: linear-gradient(135deg, #92400e, #b45309 60%, #c2410c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.ds-meta {
  font-size: 10.5px; font-weight: 700; color: var(--hr-text-muted); letter-spacing: 0.06em;
}
.ds-close {
  display: grid; place-items: center;
  width: 32px; height: 32px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: var(--hr-text-muted);
  cursor: pointer;
  transition: transform .35s cubic-bezier(0.34, 1.56, 0.64, 1), background .25s;
  flex-shrink: 0;
}
.ds-close:hover {
  transform: rotate(90deg);
  background: rgba(251, 146, 60, 0.18);
  color: #fef3c7;
}
[data-theme="light"] .ds-close {
  background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.30); color: #6b5840;
}

.ds-empty {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 36px 24px;
  color: var(--hr-text);
}
.ds-empty svg { color: #fbbf24; }
[data-theme="light"] .ds-empty svg { color: #b45309; }
.ds-empty strong { font-size: 14px; font-weight: 800; }
.ds-empty span { font-size: 11.5px; color: var(--hr-text-secondary); }

.ds-list {
  position: relative; z-index: 1;
  margin: 0; padding: 14px 20px 20px;
  list-style: none;
  display: flex; flex-direction: column; gap: 8px;
  overflow-y: auto;
}
.ds-empty {
  position: relative; z-index: 1;
}
.ds-row {
  --c: #fbbf24;
  position: relative;
  display: grid;
  grid-template-columns: auto auto 1fr auto auto auto;
  align-items: center; gap: 12px;
  padding: 10px 14px 10px 18px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid color-mix(in srgb, var(--c) 25%, rgba(251, 191, 36, 0.18));
  cursor: pointer;
  overflow: hidden;
  transition: border-color .22s, transform .22s, box-shadow .22s;
}
[data-theme="light"] .ds-row {
  background: rgba(255, 250, 240, 0.78);
  border-color: color-mix(in srgb, var(--c) 30%, rgba(180, 83, 9, 0.18));
}
.ds-row:hover {
  border-color: color-mix(in srgb, var(--c) 60%, transparent);
  transform: translateX(3px);
  box-shadow: 0 14px 28px -18px color-mix(in srgb, var(--c) 65%, transparent);
}
.dr-rail {
  position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 30%, transparent));
}
.dr-av {
  display: grid; place-items: center;
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 70%, #fbbf24), color-mix(in srgb, var(--c) 30%, #fb923c));
  color: #1f1408;
  font-size: 11px; font-weight: 900;
  flex-shrink: 0;
}
.dr-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.dr-meta strong { font-size: 13px; font-weight: 800; color: var(--hr-text); }
.dr-meta span { font-size: 9.5px; color: var(--hr-text-muted); letter-spacing: 0.04em; }
.dr-type {
  display: flex; flex-direction: column; gap: 2px; min-width: 0;
}
.dr-type strong {
  font-size: 11.5px; font-weight: 800; color: var(--hr-text);
}
.dr-type .leave-mono {
  font-size: 9.5px; color: var(--hr-text-muted); letter-spacing: 0.04em;
}
.dr-type-dot {
  display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  background: var(--c); box-shadow: 0 0 6px var(--c);
  margin-right: 4px;
}
.dr-pending {
  font-size: 8.5px; font-weight: 900;
  padding: 3px 7px; border-radius: 999px;
  background: rgba(245, 158, 11, 0.18);
  border: 1px solid rgba(245, 158, 11, 0.55);
  color: #fcd34d;
  letter-spacing: 0.14em;
}
[data-theme="light"] .dr-pending { color: #b45309; background: rgba(245, 158, 11, 0.22); }
.dr-chev { color: var(--c); }

.spot-enter-active, .spot-leave-active {
  transition: opacity .35s, backdrop-filter .35s;
}
.spot-enter-from, .spot-leave-to { opacity: 0; }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .bg-mist, .bg-stars, .bg-scan,
  .sc-led, .ds-led, .led-dot, .fs-playhead,
  .cell.is-today, .cl-conflict { animation: none !important; }
}
</style>
