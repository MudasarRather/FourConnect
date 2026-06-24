<template>
  <div class="vault" :data-aging="agingTier">
    <!-- ═════════════════════════════════════════════════════════════════
         AMBIENT BACKDROP — drifting gold mist + dotted grid + scanline
         ════════════════════════════════════════════════════════════════ -->
    <div class="vlt-bg" aria-hidden="true">
      <span class="bg-aurora a-a" />
      <span class="bg-aurora a-b" />
      <span class="bg-aurora a-c" />
      <span class="bg-grid" />
      <span class="bg-rays" />
      <span class="bg-scan" />
    </div>

    <!-- ═════════════════════════════════════════════════════════════════
         01 · HERO — VAULT CHAMBER
         A circular vault dial (combination wheel) anchors the page. The
         counter at the centre breathes with the pending count; sat-badges
         orbit on a *square* layout (not circular like the my-approvals
         orbital arena) so it reads as a completely different metaphor.
         ════════════════════════════════════════════════════════════════ -->
    <Motion class="vlt-hero" as="section"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }"
    >
      <!-- Industrial corner rivets -->
      <span class="rivet tl" /><span class="rivet tr" />
      <span class="rivet bl" /><span class="rivet br" />

      <!-- LEFT — the vault dial -->
      <div class="vlt-dial-wrap">
        <Motion as="div" class="vlt-dial"
          :initial="{ opacity: 0, rotate: -90, scale: 0.78 }"
          :animate="{ opacity: 1, rotate: 0, scale: 1 }"
          :transition="{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }"
        >
          <svg viewBox="0 0 380 380" class="dial-svg" aria-hidden="true">
            <defs>
              <linearGradient id="dialRim" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"  stop-color="#fde68a" />
                <stop offset="35%" stop-color="#fbbf24" />
                <stop offset="75%" stop-color="#d97706" />
                <stop offset="100%" stop-color="#7c2d12" />
              </linearGradient>
              <linearGradient id="dialArc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stop-color="#fef3c7" />
                <stop offset="55%" stop-color="#fbbf24" />
                <stop offset="100%" stop-color="#ea580c" />
              </linearGradient>
              <radialGradient id="dialCore" cx="0.5" cy="0.5" r="0.6">
                <stop offset="0%"  stop-color="rgba(251,191,36,0.45)" />
                <stop offset="55%" stop-color="rgba(251,191,36,0.10)" />
                <stop offset="100%" stop-color="rgba(251,191,36,0)" />
              </radialGradient>
              <filter id="dialGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <pattern id="brass" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(35)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(217,119,6,0.18)" stroke-width="1" />
              </pattern>
            </defs>

            <!-- Outer brass rim (rotates slowly, infinite) -->
            <g class="rim-rot">
              <circle cx="190" cy="190" r="180" fill="url(#brass)" stroke="url(#dialRim)" stroke-width="3" />
              <!-- 100 minor + 10 major notches around the perimeter -->
              <g>
                <line v-for="t in 60" :key="`tk-${t}`"
                  :x1="190 + 170 * Math.cos((t - 1) * Math.PI / 30 - Math.PI / 2)"
                  :y1="190 + 170 * Math.sin((t - 1) * Math.PI / 30 - Math.PI / 2)"
                  :x2="190 + (t % 5 === 0 ? 152 : 160) * Math.cos((t - 1) * Math.PI / 30 - Math.PI / 2)"
                  :y2="190 + (t % 5 === 0 ? 152 : 160) * Math.sin((t - 1) * Math.PI / 30 - Math.PI / 2)"
                  :stroke="t % 5 === 0 ? '#fbbf24' : 'rgba(251,191,36,0.40)'"
                  :stroke-width="t % 5 === 0 ? 2 : 1"
                  stroke-linecap="round"
                />
              </g>
              <!-- 12 numbered stops, e.g. 0..55 every 5 -->
              <g class="rim-numbers">
                <text v-for="n in 12" :key="`num-${n}`"
                  :x="190 + 142 * Math.cos((n - 1) * Math.PI / 6 - Math.PI / 2)"
                  :y="190 + 142 * Math.sin((n - 1) * Math.PI / 6 - Math.PI / 2) + 3"
                  text-anchor="middle" fill="#fde68a" font-size="11" font-weight="800"
                >{{ (n - 1) * 5 }}</text>
              </g>
            </g>

            <!-- Soft inner glow -->
            <circle cx="190" cy="190" r="130" fill="url(#dialCore)" />

            <!-- Dim track for sweep arc -->
            <circle cx="190" cy="190" r="120" fill="none"
              stroke="rgba(251,191,36,0.12)" stroke-width="10" />

            <!-- Sweep arc — pending vs. capacity (10 slots) -->
            <circle cx="190" cy="190" r="120" fill="none"
              stroke="url(#dialArc)" stroke-width="10" stroke-linecap="round"
              :stroke-dasharray="2 * Math.PI * 120"
              :stroke-dashoffset="(2 * Math.PI * 120) * (1 - sweepRatio)"
              transform="rotate(-90 190 190)"
              filter="url(#dialGlow)"
              class="dial-sweep"
            />

            <!-- Aging crimson arc — runs counter-clockwise -->
            <circle cx="190" cy="190" r="100" fill="none"
              stroke="rgba(248,113,113,0.55)" stroke-width="4" stroke-linecap="round"
              :stroke-dasharray="2 * Math.PI * 100"
              :stroke-dashoffset="(2 * Math.PI * 100) * (1 - agingRatio)"
              transform="rotate(90 190 190) scale(1, -1) translate(0, -380)"
              class="dial-ag"
            />

            <!-- Spindle (3 thick spokes) -->
            <g class="dial-spokes">
              <line x1="190" y1="40" x2="190" y2="340" stroke="rgba(251,191,36,0.18)" stroke-width="1.4" />
              <line x1="40" y1="190" x2="340" y2="190" stroke="rgba(251,191,36,0.10)" stroke-width="1.2" />
              <line x1="80" y1="80" x2="300" y2="300" stroke="rgba(251,191,36,0.08)" stroke-width="1" />
            </g>

            <!-- Central indicator triangle (anchors at top of dial) -->
            <polygon points="190,18 184,32 196,32" fill="#fef3c7" stroke="#fbbf24" stroke-width="0.6" />
          </svg>

          <!-- Centre readout — counts + status -->
          <div class="dial-core">
            <span class="core-eye leave-mono">
              <span class="core-led" :data-tone="ledTone" /> SEAL · {{ ledLabel }}
            </span>
            <strong class="core-num leave-mono">{{ items.length }}</strong>
            <span class="core-sub leave-mono">PENDING&nbsp;SEAL</span>
            <span class="core-divider" />
            <div class="core-aux leave-mono">
              <span>{{ todaySealed }} <small>sealed</small></span>
              <span class="aux-dot" />
              <span>{{ agingCount }} <small>aging</small></span>
            </div>
          </div>

          <!-- 4 satellite badges, square layout (different to my-approvals' circle) -->
          <div class="dial-sats">
            <Motion v-for="(s, i) in satStats" :key="s.key" as="div"
              class="sat-tile" :data-pos="s.pos" :data-tone="s.tone"
              :initial="{ opacity: 0, scale: 0, y: 12 }"
              :animate="{ opacity: 1, scale: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.55 + i * 0.08, ease: [0.34, 1.56, 0.64, 1] }"
              :whileHover="{ scale: 1.06 }"
            >
              <component :is="s.icon" :size="12" />
              <span class="sat-val leave-mono">{{ s.value }}</span>
              <span class="sat-lbl">{{ s.label }}</span>
            </Motion>
          </div>
        </Motion>
      </div>

      <!-- RIGHT — copy block + LED status -->
      <div class="vlt-copy">
        <Motion as="div" class="copy-led"
          :initial="{ opacity: 0, x: 14 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.5, delay: 0.15 }"
        >
          <span class="led-dot" :data-tone="ledTone" />
          <span class="led-text leave-mono">VAULT&nbsp;·&nbsp;{{ ledLabel }}</span>
          <span class="led-sep">/</span>
          <span class="led-text leave-mono">{{ liveClock }}</span>
        </Motion>

        <h1 class="copy-title">
          <span class="title-row">The
            <em class="word-em">Final</em>
            <span class="word-stamp">Seal.</span>
          </span>
          <span class="title-row second">HR signoff lands here.</span>
        </h1>
        <p class="copy-sub">
          Manager-cleared requests funnel into this vault. Your seal debits the
          right balance, flips attendance to&nbsp;<b>LEAVE</b> for every covered
          date, and notifies the requestor in the same heartbeat.
        </p>

        <!-- Tactile control rail -->
        <Motion as="div" class="copy-rail"
          :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.32 }"
        >
          <button class="rail-btn primary" @click="reload" :disabled="loading">
            <RefreshCw :size="13" :class="{ spin: loading }" />
            <span>Sync vault</span>
          </button>
          <button class="rail-btn ghost" :disabled="!items.length"
            @click="focusFirst"
          >
            <Target :size="13" />
            <span>Jump to oldest</span>
          </button>
          <span class="rail-pill leave-mono">
            <Activity :size="11" /> avg seal · {{ avgSealLabel }}
          </span>
        </Motion>
      </div>
    </Motion>

    <!-- ═════════════════════════════════════════════════════════════════
         02 · AGING BANNER — sliding gauge + count
         ════════════════════════════════════════════════════════════════ -->
    <Motion v-if="agingCount > 0" as="div" class="aging-banner"
      :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
      :transition="{ duration: 0.45 }"
    >
      <span class="ab-led" />
      <AlertTriangle :size="14" class="ab-ic" />
      <span class="ab-text">
        <strong>{{ agingCount }}</strong>
        request{{ agingCount === 1 ? '' : 's' }} waiting more than&nbsp;<b>48&nbsp;h</b>
        — the longest is&nbsp;<b class="leave-mono">{{ oldestLabel }}</b> old.
      </span>
      <div class="ab-meter">
        <Motion as="span" class="ab-fill"
          :initial="{ scaleX: 0 }"
          :animate="{ scaleX: Math.min(1, agingCount / Math.max(1, items.length)) }"
          :transition="{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }"
        />
      </div>
    </Motion>

    <!-- ═════════════════════════════════════════════════════════════════
         03 · QUEUE — deposit-certificate cards w/ hourglass aging meter
         ════════════════════════════════════════════════════════════════ -->
    <header v-if="items.length" class="q-head">
      <span class="qh-eye leave-mono"><span class="qh-dot" /> Deposit ledger</span>
      <h2 class="qh-title">Awaiting embossed seal</h2>
      <p class="qh-sub">
        Each certificate carries the manager's signature, the requested days,
        and a live hourglass meter. Press <em>Approve</em> to drop the golden
        seal; <em>Reject</em> to scribe a red verdict.
      </p>
    </header>

    <div v-if="loading && !items.length" class="vlt-grid">
      <div v-for="i in 6" :key="`sk-${i}`" class="cert-skel">
        <div class="leave-skel" style="width:60%;height:14px" />
        <div class="leave-skel" style="width:90%;height:50px;margin-top:12px;border-radius:10px" />
        <div class="leave-skel" style="width:80%;height:30px;margin-top:10px;border-radius:8px" />
      </div>
    </div>

    <div v-else-if="!items.length" class="vlt-empty">
      <div class="empty-seal">
        <CheckCircle2 :size="46" />
        <span class="empty-ring" />
        <span class="empty-shine" />
      </div>
      <strong>Inbox zero. Vault is dormant.</strong>
      <span>Every request bears a fresh seal. Stand down — we'll wake you when the next one queues.</span>
    </div>

    <div v-else class="vlt-grid">
      <Motion v-for="(r, i) in pagedItems" :key="r.id + '-p' + pgPage" as="article"
        ref="cardRefs"
        class="cert"
        :data-age="ageBucket(r.created_at)"
        :data-state="rowStates[r.id] || 'idle'"
        :style="{ '--c': typeMeta(r.leave_type).hex || '#fbbf24' }"
        :initial="{ opacity: 0, y: 16, scale: 0.97, rotateX: -8 }"
        :animate="rowStates[r.id] === 'exit'
                    ? { opacity: 0, y: -30, scale: 0.92, filter: 'blur(6px)' }
                    : { opacity: 1, y: 0, scale: 1, rotateX: 0, filter: 'blur(0px)' }"
        :transition="{ duration: rowStates[r.id] === 'exit' ? 0.55 : 0.55,
                       delay: rowStates[r.id] === 'exit' ? 0 : Math.min(i * 0.05, 0.45),
                       ease: [0.16, 1, 0.3, 1] }"
        :whileHover="rowStates[r.id] === 'idle' || !rowStates[r.id] ? { y: -4 } : {}"
      >
        <!-- ── Paper / foil ambient ── -->
        <span class="cert-foil" />
        <span class="cert-watermark">{{ r.reference_no?.split('-').pop() || '00' }}</span>

        <!-- ── Vertical HOURGLASS aging meter (replaces simple stripe) ── -->
        <div class="cert-hg" :data-age="ageBucket(r.created_at)">
          <svg viewBox="0 0 24 80" class="hg-svg" aria-hidden="true">
            <defs>
              <linearGradient :id="`sand-${r.id.slice(0,8)}`" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#fde047" />
                <stop offset="100%" stop-color="#d97706" />
              </linearGradient>
            </defs>
            <!-- Glass body -->
            <path d="M 4 4 H 20 L 14 36 L 14 44 L 20 76 H 4 L 10 44 L 10 36 Z"
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(251,191,36,0.35)" stroke-width="1"
            />
            <!-- Upper sand (drains down) -->
            <path :d="hgUpperPath(r.created_at)" :fill="`url(#sand-${r.id.slice(0,8)})`" />
            <!-- Lower sand (fills up) -->
            <path :d="hgLowerPath(r.created_at)" :fill="`url(#sand-${r.id.slice(0,8)})`" />
            <!-- Trickle in the neck -->
            <line x1="12" y1="37" x2="12" y2="43" stroke="#fde047" stroke-width="0.9"
              stroke-linecap="round" class="hg-trickle" />
            <!-- Caps -->
            <rect x="2" y="2" width="20" height="3" rx="0.8" fill="#92400e" />
            <rect x="2" y="75" width="20" height="3" rx="0.8" fill="#92400e" />
          </svg>
          <span class="hg-pct leave-mono">{{ agePct(r.created_at) }}%</span>
        </div>

        <!-- ── Heading: employee + status ── -->
        <header class="cert-head" @click="openDrawer(r)">
          <div class="ch-avatar">
            <span class="av-initials">{{ initials(r.employee_name) }}</span>
            <span class="av-glyph" />
            <span class="av-ring" />
            <!-- Awaiting-proof corner badge — pulses softly when proof was
                 requested but the employee hasn't uploaded anything yet. -->
            <span v-if="r.proof_requested && (r.proof_attachment_count || 0) === 0"
              class="av-awaiting" title="Proof awaited from employee"
            >
              <Hourglass :size="9" />
            </span>
          </div>
          <div class="ch-info">
            <strong class="ch-name">{{ r.employee_name }}</strong>
            <span class="ch-meta leave-mono">
              <span class="ch-code">{{ r.employee_code }}</span>
              <span v-if="r.department_name" class="ch-sep">·</span>
              <span v-if="r.department_name" class="ch-dept">{{ r.department_name }}</span>
            </span>
          </div>
          <LeaveStatusChip :status="r.status" pulse />
        </header>

        <!-- ── Proof status row (between header and body) ── -->
        <div v-if="r.proof_requested || (r.proof_attachment_count || 0) > 0" class="proof-row" @click.stop>
          <!-- AWAITING — amber pulse -->
          <span v-if="r.proof_requested && (r.proof_attachment_count || 0) === 0"
            class="proof-chip proof-chip-await"
          >
            <span class="pc-led" />
            <Hourglass :size="11" />
            <span class="pc-text">PROOF AWAITED</span>
          </span>

          <!-- ATTACHED — clickable cyan -->
          <button v-if="(r.proof_attachment_count || 0) > 0" type="button"
            class="proof-chip proof-chip-attached"
            @click.stop="openProofGallery(r)"
          >
            <Paperclip :size="11" />
            <span class="pc-text">
              {{ r.proof_attachment_count }}
              proof{{ r.proof_attachment_count === 1 ? '' : 's' }} attached
            </span>
            <span class="pc-arrow">→</span>
          </button>
        </div>

        <!-- ── Body: type + range + days ── -->
        <div class="cert-body" @click="openDrawer(r)">
          <div class="cb-icon">
            <LeaveTypeIcon :type="r.leave_type" :size="18" ambient />
          </div>
          <div class="cb-meta">
            <span class="cb-type">{{ typeMeta(r.leave_type).label }} leave</span>
            <span class="cb-range leave-mono">
              <Calendar :size="11" /> {{ fmtRange(r.from_date, r.to_date) }}
              <span v-if="r.is_half_day" class="cb-half">half</span>
            </span>
          </div>
          <div class="cb-days">
            <strong>{{ r.total_days }}</strong>
            <small>{{ Number(r.total_days) === 1 ? 'day' : 'days' }}</small>
          </div>
        </div>

        <!-- ── Manager signature receipt ── -->
        <Motion v-if="r.manager_decision === 'APPROVED'" as="div" class="cert-sig"
          :initial="{ opacity: 0, y: -4 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.18 + Math.min(i * 0.04, 0.4) }"
        >
          <span class="sig-stamp"><Check :size="9" /></span>
          <span class="sig-text">Manager signed by</span>
          <strong class="sig-name">{{ r.manager_name || 'manager' }}</strong>
          <span class="sig-when leave-mono">{{ relTime(r.manager_decided_at) }}</span>
        </Motion>

        <!-- ── Reason scroll ── -->
        <p class="cert-reason" @click="openDrawer(r)" v-if="r.reason">
          <Quote :size="10" class="cr-quote" />
          <span>{{ truncate(r.reason, 130) }}</span>
        </p>

        <!-- ── Action row ── -->
        <footer class="cert-foot">
          <button class="stamp stamp-reject" :disabled="busyId === r.id"
            @click.stop="askReject(r)" :aria-label="`Reject ${r.reference_no}`"
          >
            <span class="stamp-glyph">
              <X :size="12" />
            </span>
            <span class="stamp-label">Reject</span>
            <span class="stamp-shadow" />
          </button>
          <!-- Past-dated, un-actioned leaves can't be approved — only closed (lapsed). -->
          <button v-if="isLeavePast(r)" class="stamp stamp-lapse" :disabled="busyId === r.id"
            @click.stop="askLapse(r)" :aria-label="`Close ${r.reference_no} as lapsed`"
          >
            <span class="stamp-glyph">
              <CalendarX :size="12" />
            </span>
            <span class="stamp-label">Close (lapsed)</span>
            <span class="stamp-shadow" />
          </button>
          <template v-else>
            <button class="stamp stamp-proof" :disabled="busyId === r.id"
              @click.stop="askProof(r)"
              :aria-label="`${r.proof_requested ? 'Re-request' : 'Request'} proof for ${r.reference_no}`"
            >
              <span class="stamp-glyph">
                <FileSearch :size="12" />
              </span>
              <span class="stamp-label">{{ r.proof_requested ? 'Re-request' : 'Request proof' }}</span>
              <span class="stamp-shadow" />
            </button>
            <button class="stamp stamp-approve" :disabled="busyId === r.id"
              @click.stop="approve(r)" :aria-label="`Approve ${r.reference_no}`"
            >
              <span class="stamp-glyph">
                <Check :size="12" />
              </span>
              <span class="stamp-label">Seal &amp; approve</span>
              <span class="stamp-shadow" />
              <span class="stamp-pulse" />
            </button>
          </template>
        </footer>

        <!-- ── SEAL CINEMATIC OVERLAY (only while sealing) ── -->
        <Teleport :to="`#cert-${r.id.slice(0,8)}`" :disabled="true">
          <!-- the seal lives inside the card so it inherits the layout -->
        </Teleport>
        <Motion v-if="rowStates[r.id] === 'sealing' || rowStates[r.id] === 'sealed' || rowStates[r.id] === 'exit'"
          as="div" class="seal-stage" aria-hidden="true"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
          :transition="{ duration: 0.2 }"
        >
          <!-- Backwash flash -->
          <span class="seal-wash" />
          <!-- The descending seal -->
          <Motion as="div" class="seal-coin"
            :initial="{ y: -120, scale: 1.2, rotate: -20, opacity: 0 }"
            :animate="rowStates[r.id] === 'sealing'
                      ? { y: 0, scale: 1, rotate: 0, opacity: 1 }
                      : { y: 0, scale: 1.05, rotate: 0, opacity: 1 }"
            :transition="{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }"
          >
            <svg viewBox="0 0 120 120" class="seal-svg" aria-hidden="true">
              <defs>
                <radialGradient :id="`coin-${r.id.slice(0,8)}`" cx="0.45" cy="0.4" r="0.7">
                  <stop offset="0%"   stop-color="#fef9c3" />
                  <stop offset="35%"  stop-color="#fde047" />
                  <stop offset="65%"  stop-color="#f59e0b" />
                  <stop offset="100%" stop-color="#7c2d12" />
                </radialGradient>
                <linearGradient :id="`rib-${r.id.slice(0,8)}`" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#fde047" />
                  <stop offset="100%" stop-color="#b45309" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="52" :fill="`url(#coin-${r.id.slice(0,8)})`" />
              <!-- Notched outer edge -->
              <g>
                <rect v-for="n in 24" :key="`nt-${n}`"
                  :x="59" y="6" width="2" height="6" rx="1"
                  :fill="`url(#rib-${r.id.slice(0,8)})`"
                  :transform="`rotate(${(n / 24) * 360} 60 60)`"
                />
              </g>
              <circle cx="60" cy="60" r="38" fill="none" stroke="#7c2d12" stroke-width="1.2" />
              <text x="60" y="56" text-anchor="middle" fill="#3a1f0b" font-size="9"
                font-weight="900" letter-spacing="2">APPROVED</text>
              <text x="60" y="70" text-anchor="middle" fill="#7c2d12" font-size="6"
                font-weight="800" letter-spacing="1.5">HR · SEAL</text>
              <text x="60" y="80" text-anchor="middle" fill="#7c2d12" font-size="5"
                font-weight="700">{{ r.reference_no }}</text>
            </svg>
          </Motion>

          <!-- Shockwave ring (only when 'sealed') -->
          <Motion v-if="rowStates[r.id] === 'sealed' || rowStates[r.id] === 'exit'"
            as="span" class="seal-shock"
            :initial="{ opacity: 0.8, scale: 0.2 }"
            :animate="{ opacity: 0, scale: 2.2 }"
            :transition="{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }"
          />
          <!-- Sparks -->
          <span v-for="n in 14" :key="`sp-${n}`" class="seal-spark"
            :style="sparkStyle(n)"
          />
        </Motion>
      </Motion>
    </div>

    <!-- ═════════════════════════════════════════════════════════════════
         Pagination
         ════════════════════════════════════════════════════════════════ -->
    <LeavePagination
      v-if="!loading && items.length"
      :page="pgPage"
      :page-size="pgSize"
      :total-items="items.length"
      :page-size-options="[10, 25, 50, 100]"
      @update:page="pgPage = $event"
      @update:pageSize="pgSize = $event"
    />

    <!-- ═════════════════════════════════════════════════════════════════
         Detail drawer + reject modal + ambient confetti
         ════════════════════════════════════════════════════════════════ -->
    <LeaveDetailDrawer
      :open="drawer.open"
      :leave-id="drawer.id"
      @close="drawer.open = false"
      @changed="reload"
    />

    <LeaveRejectModal
      :open="rejectModal.open"
      :leave="rejectModal.leave"
      stage="HR"
      @cancel="rejectModal.open = false"
      @confirm="confirmReject"
    />

    <LeaveLapseModal
      :open="lapseModal.open"
      :leave="lapseModal.leave"
      stage="HR"
      :busy="lapseBusy"
      @cancel="lapseModal.open = false"
      @confirm="confirmLapse"
    />

    <LeaveProofRequestModal
      :open="proofModal.open"
      :leave="proofModal.leave"
      @cancel="proofModal.open = false"
      @confirm="confirmProof"
    />

    <!-- ═══ Proof Gallery — fullscreen attachments grid ═══ -->
    <Teleport to="body">
      <transition name="pg">
        <div v-if="proofGallery.open" class="pg-scrim" @click.self="closeProofGallery">
          <span class="pg-orbit pg-orbit-1" aria-hidden="true" />
          <span class="pg-orbit pg-orbit-2" aria-hidden="true" />

          <Motion class="pg-card" as="div" role="dialog" aria-modal="true"
            :initial="{ opacity: 0, y: 30, scale: 0.94 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="{ opacity: 0, y: 20, scale: 0.95 }"
            :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
          >
            <header class="pg-head">
              <div class="pg-glyph"><Paperclip :size="22" /></div>
              <div class="pg-meta">
                <span class="pg-eye leave-mono">PROOF · ATTACHMENTS</span>
                <h3 class="pg-title">Submitted documents</h3>
                <p class="pg-sub" v-if="proofGallery.leave">
                  <span class="pg-emp">{{ proofGallery.leave.employee_name }}</span>
                  <span class="pg-sep">·</span>
                  <span class="pg-ref leave-mono">{{ proofGallery.leave.reference_no }}</span>
                  <span class="pg-sep">·</span>
                  <span>{{ (proofGallery.leave.proof_attachments || []).length }} file{{ (proofGallery.leave.proof_attachments || []).length === 1 ? '' : 's' }}</span>
                </p>
              </div>
              <button class="pg-close" @click="closeProofGallery" aria-label="Close">
                <X :size="16" />
              </button>
            </header>

            <div class="pg-body">
              <div v-if="!(proofGallery.leave?.proof_attachments?.length)" class="pg-empty">
                <Hourglass :size="38" />
                <strong>No proofs uploaded yet.</strong>
                <span>The employee will see your request on their dashboard and can upload from there.</span>
              </div>
              <div v-else class="pg-grid">
                <Motion v-for="(att, i) in proofGallery.leave.proof_attachments" :key="att.id" as="a"
                  class="pg-tile" :href="attachmentUrl(att)" target="_blank" rel="noopener noreferrer"
                  :initial="{ opacity: 0, y: 12, scale: 0.95 }"
                  :animate="{ opacity: 1, y: 0, scale: 1 }"
                  :transition="{ duration: 0.4, delay: 0.06 + i * 0.05, ease: [0.34, 1.56, 0.64, 1] }"
                  :whileHover="{ y: -4, scale: 1.02 }"
                  :whileTap="{ scale: 0.97 }"
                >
                  <div class="pgt-thumb">
                    <img v-if="isImageAttachment(att)" :src="attachmentUrl(att)" :alt="att.original_filename || 'proof'" loading="lazy" />
                    <template v-else>
                      <FileText :size="40" />
                      <span class="pgt-ext leave-mono">{{ attachmentExt(att) }}</span>
                    </template>
                  </div>
                  <div class="pgt-meta">
                    <span class="pgt-name">{{ att.original_filename || 'Untitled' }}</span>
                    <span class="pgt-info leave-mono">
                      <span>{{ attachmentExt(att) }}</span>
                      <span class="pgt-dot" />
                      <span>{{ formatBytes(att.file_size) }}</span>
                    </span>
                  </div>
                </Motion>
              </div>
            </div>
          </Motion>
        </div>
      </transition>
    </Teleport>

    <Teleport to="body">
      <div v-if="confetti.show" class="confetti-host" aria-hidden="true">
        <span v-for="n in 32" :key="`cb-${n}`" class="confetti-bit" :style="bitStyle(n)" />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, AlertTriangle, CheckCircle2, Check, X, Quote, Calendar, CalendarX,
  Target, Activity, Timer, Layers, Flame, Inbox,
  FileSearch, Paperclip, Hourglass, FileText,
} from 'lucide-vue-next'
import LeaveStatusChip from '../components/LeaveStatusChip.vue'
import LeaveTypeIcon from '../components/LeaveTypeIcon.vue'
import LeaveDetailDrawer from '../drawers/LeaveDetailDrawer.vue'
import LeaveRejectModal from '../modals/LeaveRejectModal.vue'
import LeaveLapseModal from '../modals/LeaveLapseModal.vue'
import LeaveProofRequestModal from '../modals/LeaveProofRequestModal.vue'
import LeavePagination from '../components/LeavePagination.vue'
import { useLeaves, decideAsHr, requestLeaveProof, lapseLeave, isLeavePast, typeMeta } from '@/composables/useLeaves'
import { API_BASE } from '@/utils/api'
import { useToast } from 'vue-toastification'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()

// ─────────────────────────────────────────────────────────────────────
// State / data
// ─────────────────────────────────────────────────────────────────────
const api = useLeaves()
const loading = computed(() => api.loading.value)
const items = computed(() => api.items.value)

// Client-side pagination over the loaded queue. fetchHrQueue pulls up to
// 200 rows in one shot so the pager can slice without re-fetching.
const pgPage = ref(1)
const pgSize = ref(10)
watch(pgSize, () => { pgPage.value = 1 })
watch(() => items.value.length, (len) => {
  const tp = Math.max(1, Math.ceil(len / pgSize.value))
  if (pgPage.value > tp) pgPage.value = tp
})
const pagedItems = computed(() => {
  const start = (pgPage.value - 1) * pgSize.value
  return items.value.slice(start, start + pgSize.value)
})
const drawer = ref({ open: false, id: null })
const rejectModal = ref({ open: false, leave: null })
const lapseModal = ref({ open: false, leave: null })
const lapseBusy = ref(false)
const proofModal = ref({ open: false, leave: null })
const proofGallery = ref({ open: false, leave: null })
const confetti = ref({ show: false })
const busyId = ref(null)
const cardRefs = ref([])

// Per-row animation state machine: idle → sealing → sealed → exit
const rowStates = reactive({})

// Live clock (HH:mm) for the LED row
const liveClock = ref('')
let clockTimer = null
const updateClock = () => {
  liveClock.value = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}
onMounted(() => { updateClock(); clockTimer = setInterval(updateClock, 30000) })
onBeforeUnmount(() => { if (clockTimer) clearInterval(clockTimer) })

// ─────────────────────────────────────────────────────────────────────
// Data load
// ─────────────────────────────────────────────────────────────────────
const reload = async () => {
  await api.fetchHrQueue(1, 200)
  emit('refresh-stats')
}
onMounted(reload)

// ─────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────
const initials = (name) => {
  if (!name) return '?'
  const p = String(name).trim().split(/\s+/).filter(Boolean)
  return p.length === 1
    ? p[0].slice(0, 2).toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}
const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'
const fmtRange = (a, b) => (a === b ? fmtDate(a) : `${fmtDate(a)} → ${fmtDate(b)}`)
const relTime = (v) => {
  if (!v) return ''
  const m = (Date.now() - new Date(v).getTime()) / 60000
  if (m < 60) return `${Math.floor(m)}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}
const truncate = (s, n) => ((s || '').length > n ? (s || '').slice(0, n - 1) + '…' : s || '')

// ─────────────────────────────────────────────────────────────────────
// Aging — single source of truth
// ─────────────────────────────────────────────────────────────────────
const AGING_CAP_HOURS = 72        // hourglass empties at 72h
const ageHours = (v) => (v ? (Date.now() - new Date(v).getTime()) / 3600000 : 0)
const ageBucket = (v) => {
  const h = ageHours(v)
  if (h > 48) return 'old'
  if (h > 24) return 'mid'
  return 'fresh'
}
const agePct = (v) => Math.min(100, Math.round((ageHours(v) / AGING_CAP_HOURS) * 100))
const agingCount = computed(() => items.value.filter(r => ageHours(r.created_at) > 48).length)
const oldestRow = computed(() => {
  if (!items.value.length) return null
  return [...items.value].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  )[0]
})
const oldestLabel = computed(() => (oldestRow.value ? relTime(oldestRow.value.created_at) : '—'))
const agingTier = computed(() => {
  if (!items.value.length) return 'empty'
  if (agingCount.value >= 3) return 'critical'
  if (agingCount.value > 0)  return 'warn'
  return 'fresh'
})

// LED tone — derives from aging tier
const ledTone = computed(() => {
  if (agingTier.value === 'critical') return 'crimson'
  if (agingTier.value === 'warn')     return 'amber'
  if (agingTier.value === 'empty')    return 'idle'
  return 'green'
})
const ledLabel = computed(() => ({
  critical: 'PRIORITY',
  warn: 'ATTENTION',
  empty: 'DORMANT',
  fresh: 'OPERATIONAL',
}[agingTier.value]))

// Hourglass paths — top tetrahedron shrinks, bottom grows
const hgUpperPath = (createdAt) => {
  const pct = agePct(createdAt) / 100
  // Top triangle peak at y=4, base at y=36 (height 32). As pct rises, surface drops.
  const surfaceY = 4 + 32 * pct
  if (surfaceY >= 36) return ''   // empty
  // Trapezoid: top edge at surfaceY (width derived linearly), bottom at base
  // At y=4 → width 16 (4..20), at y=36 → width 0 (10..14)
  const widthAtSurface = 16 - 16 * pct
  const xLeft = 12 - widthAtSurface / 2
  const xRight = 12 + widthAtSurface / 2
  return `M ${xLeft} ${surfaceY} L ${xRight} ${surfaceY} L 14 36 L 10 36 Z`
}
const hgLowerPath = (createdAt) => {
  const pct = agePct(createdAt) / 100
  if (pct <= 0) return ''
  // Bottom funnel from y=44..76 fills bottom-up. At full: full triangle (10..14 to 4..20).
  const fillH = 32 * pct
  const fillTopY = 76 - fillH
  // Slope from neck (width 4) at y=44 to base (width 16) at y=76
  // Width at given y: 4 + 12 * (y-44)/32
  const widthAtTop = 4 + 12 * Math.min(1, Math.max(0, (fillTopY - 44) / 32))
  const xLeft = 12 - widthAtTop / 2
  const xRight = 12 + widthAtTop / 2
  return `M ${xLeft} ${fillTopY} L ${xRight} ${fillTopY} L 20 76 L 4 76 Z`
}

// ─────────────────────────────────────────────────────────────────────
// Dial sweeps
// ─────────────────────────────────────────────────────────────────────
const DIAL_CAPACITY = 10
const sweepRatio = computed(() =>
  Math.min(1, items.value.length / DIAL_CAPACITY),
)
const agingRatio = computed(() =>
  items.value.length ? Math.min(1, agingCount.value / items.value.length) : 0,
)

// ─────────────────────────────────────────────────────────────────────
// Stats — today sealed, avg seal time, etc.
// ─────────────────────────────────────────────────────────────────────
const todaySealed = ref(0)         // sealed today — tracked client-side this session
const sealDurations = ref([])      // ms per seal in this session

const avgSealLabel = computed(() => {
  if (!sealDurations.value.length) return '< 5s'
  const avg = sealDurations.value.reduce((a, b) => a + b, 0) / sealDurations.value.length
  if (avg < 1000) return '< 1s'
  if (avg < 60000) return `${(avg / 1000).toFixed(1)}s`
  return `${Math.round(avg / 60000)}m`
})

const satStats = computed(() => [
  {
    key: 'queue', pos: 'tl', tone: 'gold',
    icon: Inbox, label: 'queued', value: items.value.length,
  },
  {
    key: 'aging', pos: 'tr', tone: agingCount.value ? 'crimson' : 'gold',
    icon: Flame, label: 'aging', value: agingCount.value,
  },
  {
    key: 'today', pos: 'bl', tone: 'emerald',
    icon: CheckCircle2, label: 'sealed today', value: todaySealed.value,
  },
  {
    key: 'types', pos: 'br', tone: 'gold',
    icon: Layers, label: 'types', value: new Set(items.value.map(r => r.leave_type)).size,
  },
])

// ─────────────────────────────────────────────────────────────────────
// Approve / Reject — with cinematic seal animation on approve
// ─────────────────────────────────────────────────────────────────────
const approve = async (r) => {
  if (rowStates[r.id]) return
  rowStates[r.id] = 'sealing'
  busyId.value = r.id
  const t0 = Date.now()
  try {
    // Let the seal descend (≈ 600ms) before firing the network call so the
    // user sees the stamp land at the same moment the row is resolved.
    await new Promise((res) => setTimeout(res, 480))
    await decideAsHr(r.id, { decision: 'APPROVED', notes: null })
    rowStates[r.id] = 'sealed'
    sealDurations.value.push(Date.now() - t0)
    todaySealed.value += 1
    toast.success(`Sealed · ${r.reference_no}`)
    confetti.value.show = true
    setTimeout(() => { confetti.value.show = false }, 2200)
    // Allow shockwave + sparks to play out, then exit the card
    setTimeout(() => { rowStates[r.id] = 'exit' }, 750)
    setTimeout(async () => {
      delete rowStates[r.id]
      await reload()
    }, 1300)
  } catch (e) {
    rowStates[r.id] = undefined
    toast.error(e?.response?.data?.detail || 'Approval failed')
  } finally {
    busyId.value = null
  }
}

// Close a past-dated, never-approved leave as LAPSED with a mandatory remark.
const askLapse = (r) => { lapseModal.value = { open: true, leave: r } }
const confirmLapse = async (reason) => {
  const r = lapseModal.value.leave
  if (!r) { lapseModal.value.open = false; return }
  lapseBusy.value = true
  try {
    await lapseLeave(r.id, reason)
    toast.success(`Closed as lapsed · ${r.reference_no}`)
    lapseModal.value.open = false
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not close the leave')
  } finally { lapseBusy.value = false }
}

const askReject = (r) => { rejectModal.value = { open: true, leave: r } }
const confirmReject = async (notes) => {
  const r = rejectModal.value.leave
  rejectModal.value.open = false
  if (!r) return
  busyId.value = r.id
  try {
    await decideAsHr(r.id, { decision: 'REJECTED', notes })
    toast.success(`Rejected · ${r.reference_no}`)
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Reject failed')
  } finally { busyId.value = null }
}

// ─────────────────────────────────────────────────────────────────────
// Proof request — HR asks the employee to upload supporting documents
// ─────────────────────────────────────────────────────────────────────
const askProof = (r) => { proofModal.value = { open: true, leave: r } }

const confirmProof = async ({ note }) => {
  const r = proofModal.value.leave
  if (!r) { proofModal.value.open = false; return }
  busyId.value = r.id
  try {
    await requestLeaveProof(r.id, note)
    toast.success(`Proof requested · ${r.reference_no}`)
    proofModal.value.open = false
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Proof request failed')
  } finally { busyId.value = null }
}

const openProofGallery = (r) => { proofGallery.value = { open: true, leave: r } }
const closeProofGallery = () => { proofGallery.value = { open: false, leave: null } }

// ─────────────────────────────────────────────────────────────────────
// Proof attachment helpers
// ─────────────────────────────────────────────────────────────────────
const apiBaseUrl = API_BASE
const isImageAttachment = (att) => {
  const mt = (att?.mime_type || '').toLowerCase()
  if (mt.startsWith('image/')) return true
  const name = (att?.original_filename || att?.file_url || '').toLowerCase()
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)
}
const attachmentExt = (att) => {
  const name = att?.original_filename || att?.file_url || ''
  const m = String(name).match(/\.([a-z0-9]{1,6})$/i)
  return (m ? m[1] : 'file').toUpperCase()
}
const attachmentUrl = (att) => `${apiBaseUrl}${att?.file_url || ''}`
const formatBytes = (n) => {
  if (!n && n !== 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

// ─────────────────────────────────────────────────────────────────────
// UX helpers
// ─────────────────────────────────────────────────────────────────────
const openDrawer = (r) => { drawer.value = { open: true, id: r.id } }
const focusFirst = async () => {
  if (!oldestRow.value) return
  await nextTick()
  const idx = items.value.findIndex(r => r.id === oldestRow.value.id)
  const el = cardRefs.value?.[idx]?.$el || cardRefs.value?.[idx]
  if (el?.scrollIntoView) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList?.add('cert-flash')
    setTimeout(() => el.classList?.remove('cert-flash'), 1400)
  }
}

const sparkStyle = (n) => {
  const angle = (n / 14) * Math.PI * 2
  const dist = 70 + (n % 5) * 8
  const dx = Math.cos(angle) * dist
  const dy = Math.sin(angle) * dist
  return {
    '--dx': `${dx}px`,
    '--dy': `${dy}px`,
    animationDelay: `${0.3 + (n % 6) * 0.04}s`,
    background: ['#fde047', '#fbbf24', '#fb923c', '#ea580c', '#facc15', '#fdba74'][n % 6],
  }
}
const bitStyle = (n) => ({
  left: `${(n * 3.13) % 100}%`,
  animationDelay: `${(n % 10) * 0.06}s`,
  background: ['#fde047', '#fbbf24', '#facc15', '#fb923c', '#f59e0b', '#fdba74'][n % 6],
})
</script>

<style scoped>
/* ════════════════════════════════════════════════════════════════════════════
   PAGE WRAPPER + AMBIENT BACKDROP
   ════════════════════════════════════════════════════════════════════════════ */
.vault {
  position: relative;
  display: flex; flex-direction: column; gap: 26px;
  isolation: isolate;
  --vault-rim: rgba(251, 191, 36, 0.32);
  --vault-rim-soft: rgba(251, 191, 36, 0.14);
}

.vlt-bg {
  position: absolute; inset: -20px; z-index: -1; overflow: hidden;
  pointer-events: none;
}
.bg-aurora {
  position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.55;
}
.a-a {
  width: 460px; height: 460px; top: -140px; left: -100px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.45), transparent 65%);
  animation: vault-aura-a 22s ease-in-out infinite;
}
.a-b {
  width: 420px; height: 420px; bottom: -160px; right: -120px;
  background: radial-gradient(circle, rgba(234, 88, 12, 0.40), transparent 65%);
  animation: vault-aura-b 26s ease-in-out infinite;
}
.a-c {
  width: 340px; height: 340px; top: 38%; left: 50%; transform: translateX(-50%);
  background: radial-gradient(circle, rgba(253, 224, 71, 0.18), transparent 65%);
  animation: vault-aura-c 28s ease-in-out infinite;
}
@keyframes vault-aura-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-26px,40px) scale(1.08); } }
@keyframes vault-aura-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(36px,-28px) scale(1.10); } }
@keyframes vault-aura-c { 0%,100% { transform: translate(-50%,0) scale(0.94); } 50% { transform: translate(-50%,-20px) scale(1.08); } }

.bg-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(251, 191, 36, 0.06) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.6), transparent 70%);
}
[data-theme="light"] .bg-grid {
  background-image: radial-gradient(rgba(180, 83, 9, 0.10) 1px, transparent 1px);
}
.bg-rays {
  position: absolute; left: 50%; top: -120px; transform: translateX(-50%);
  width: 1200px; height: 800px;
  background: conic-gradient(
    from 90deg,
    transparent 0deg 30deg,
    rgba(251, 191, 36, 0.04) 50deg 70deg,
    transparent 90deg 130deg,
    rgba(251, 146, 60, 0.04) 150deg 170deg,
    transparent 190deg 230deg,
    rgba(251, 191, 36, 0.04) 250deg 270deg,
    transparent 290deg 360deg
  );
  mask-image: radial-gradient(closest-side, black 30%, transparent 70%);
  animation: vault-rays 60s linear infinite;
  opacity: 0.7;
}
@keyframes vault-rays { to { transform: translateX(-50%) rotate(360deg); } }
.bg-scan {
  position: absolute; left: 0; right: 0; height: 130px;
  background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.10), transparent);
  filter: blur(18px);
  animation: vault-scan 11s linear infinite;
}
@keyframes vault-scan {
  0%   { transform: translateY(-30%); opacity: 0; }
  15%  { opacity: 0.7; }
  85%  { opacity: 0.7; }
  100% { transform: translateY(120vh); opacity: 0; }
}

/* ════════════════════════════════════════════════════════════════════════════
   01 · HERO — VAULT CHAMBER
   ════════════════════════════════════════════════════════════════════════════ */
.vlt-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(360px, 1fr) 1.05fr;
  gap: 36px;
  align-items: center;
  padding: 42px 44px;
  border-radius: 28px;
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.22), transparent 65%),
    radial-gradient(80% 60% at 100% 100%, rgba(234, 88, 12, 0.18), transparent 65%),
    linear-gradient(180deg, rgba(20, 14, 8, 0.82), rgba(28, 18, 10, 0.86));
  border: 1px solid var(--vault-rim);
  box-shadow:
    0 40px 100px -40px rgba(120, 53, 15, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
[data-theme="light"] .vlt-hero {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.20), transparent 65%),
    radial-gradient(80% 60% at 100% 100%, rgba(234, 88, 12, 0.14), transparent 65%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 244, 218, 0.96));
  border-color: rgba(180, 83, 9, 0.26);
  box-shadow: 0 32px 64px -36px rgba(120, 53, 15, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
@media (max-width: 1080px) {
  .vlt-hero { grid-template-columns: 1fr; padding: 32px 24px; }
}

/* Rivets (industrial corner accents) */
.rivet {
  position: absolute; width: 10px; height: 10px; border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fef3c7, #fbbf24 55%, #92400e);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.45),
    0 0 0 1px rgba(180, 83, 9, 0.45),
    0 0 12px rgba(251, 191, 36, 0.32);
}
.rivet.tl { top: 14px; left: 14px; }
.rivet.tr { top: 14px; right: 14px; }
.rivet.bl { bottom: 14px; left: 14px; }
.rivet.br { bottom: 14px; right: 14px; }

/* Vault dial */
.vlt-dial-wrap {
  position: relative;
  display: grid; place-items: center;
  aspect-ratio: 1 / 1;
  min-height: 360px;
  max-width: 460px;
  justify-self: start;
}
.vlt-dial {
  position: relative;
  width: 100%; height: 100%;
  display: grid; place-items: center;
}
.dial-svg { width: 100%; height: 100%; }
.rim-rot { transform-origin: 190px 190px; animation: rim-spin 90s linear infinite; }
@keyframes rim-spin { to { transform: rotate(360deg); } }
.dial-sweep { filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.55)); }
.dial-ag { filter: drop-shadow(0 0 4px rgba(248, 113, 113, 0.55)); animation: dial-ag-pulse 2.4s ease-in-out infinite; }
@keyframes dial-ag-pulse {
  0%, 100% { opacity: 0.85; }
  50%      { opacity: 1; }
}

.dial-core {
  position: absolute;
  inset: 22%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px;
  padding: 16px;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(251, 191, 36, 0.12), rgba(20, 14, 8, 0.75) 70%);
  border: 1px solid rgba(251, 191, 36, 0.30);
  box-shadow: inset 0 0 30px rgba(251, 191, 36, 0.20), 0 8px 20px -8px rgba(0,0,0,0.6);
  text-align: center;
}
[data-theme="light"] .dial-core {
  background:
    radial-gradient(circle, rgba(251, 191, 36, 0.20), rgba(255, 250, 240, 0.95) 70%);
  border-color: rgba(180, 83, 9, 0.36);
  box-shadow: inset 0 0 30px rgba(251, 191, 36, 0.18), 0 6px 18px -6px rgba(120, 53, 15, 0.30);
}
.core-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: #fde68a;
}
[data-theme="light"] .core-eye { color: #92400e; }
.core-led {
  width: 7px; height: 7px; border-radius: 50%;
  background: #34d399; box-shadow: 0 0 8px #34d399;
  animation: core-led-pulse 1.6s ease-in-out infinite;
}
.core-led[data-tone="amber"]   { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
.core-led[data-tone="crimson"] { background: #ef4444; box-shadow: 0 0 12px #ef4444; animation-duration: 0.9s; }
.core-led[data-tone="idle"]    { background: #94a3b8; box-shadow: 0 0 6px #94a3b8; animation: none; opacity: 0.6; }
@keyframes core-led-pulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.5); }
}
.core-num {
  font-size: clamp(38px, 6.5vw, 64px); font-weight: 900;
  letter-spacing: -0.04em; line-height: 1;
  background: linear-gradient(135deg, #fef3c7, #fbbf24 50%, #fb923c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  font-variant-numeric: tabular-nums;
}
[data-theme="light"] .core-num {
  background: linear-gradient(135deg, #92400e, #b45309 50%, #c2410c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.core-sub {
  font-size: 10px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--hr-text-muted);
}
.core-divider {
  width: 56px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.55), transparent);
  margin: 5px 0 2px;
}
.core-aux {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11px; font-weight: 800; color: var(--hr-text);
}
.core-aux small {
  font-size: 8.5px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase;
  color: var(--hr-text-muted); margin-left: 2px;
}
.aux-dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(251, 191, 36, 0.55); }

/* Satellite tiles around dial (square layout: TL/TR/BL/BR) */
.dial-sats {
  position: absolute; inset: 0;
  pointer-events: none;
}
.sat-tile {
  position: absolute;
  display: inline-flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 11px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.85), rgba(20, 14, 8, 0.92));
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: var(--hr-text);
  box-shadow: 0 12px 28px -16px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  pointer-events: auto;
  backdrop-filter: blur(8px);
}
[data-theme="light"] .sat-tile {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.95), rgba(255, 244, 218, 0.96));
  border-color: rgba(180, 83, 9, 0.26);
  box-shadow: 0 8px 18px -10px rgba(120, 53, 15, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.sat-tile[data-pos="tl"] { top: 4%;   left: -6%; }
.sat-tile[data-pos="tr"] { top: 4%;   right: -6%; }
.sat-tile[data-pos="bl"] { bottom: 4%; left: -6%; }
.sat-tile[data-pos="br"] { bottom: 4%; right: -6%; }
.sat-tile[data-tone="crimson"] { border-color: rgba(248, 113, 113, 0.55); color: #fca5a5; }
.sat-tile[data-tone="emerald"] { border-color: rgba(20, 184, 166, 0.55); color: #5eead4; }
[data-theme="light"] .sat-tile[data-tone="crimson"] { color: #b91c1c; border-color: rgba(220, 38, 38, 0.45); }
[data-theme="light"] .sat-tile[data-tone="emerald"] { color: #047857; border-color: rgba(20, 184, 166, 0.50); }
.sat-val {
  font-size: 16px; font-weight: 900; letter-spacing: -0.015em;
  font-variant-numeric: tabular-nums;
}
.sat-lbl {
  font-size: 9px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--hr-text-muted);
}

/* RIGHT — copy block */
.vlt-copy {
  display: flex; flex-direction: column; gap: 16px;
  min-width: 0;
}
.copy-led {
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
[data-theme="light"] .copy-led {
  background: rgba(251, 191, 36, 0.16);
  border-color: rgba(180, 83, 9, 0.30);
  color: #92400e;
}
.led-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #34d399; box-shadow: 0 0 8px #34d399;
  animation: core-led-pulse 1.6s ease-in-out infinite;
}
.led-dot[data-tone="amber"]   { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
.led-dot[data-tone="crimson"] { background: #ef4444; box-shadow: 0 0 12px #ef4444; animation-duration: 0.9s; }
.led-dot[data-tone="idle"]    { background: #94a3b8; box-shadow: 0 0 6px #94a3b8; animation: none; opacity: 0.6; }
.led-sep { color: rgba(251, 191, 36, 0.45); }
[data-theme="light"] .led-sep { color: rgba(180, 83, 9, 0.45); }

.copy-title {
  margin: 0;
  font-size: clamp(30px, 4.4vw, 48px);
  font-weight: 900; letter-spacing: -0.028em; line-height: 1.06;
  display: flex; flex-direction: column; gap: 4px;
}
.title-row { display: inline-flex; flex-wrap: wrap; gap: 0 14px; align-items: baseline; }
.title-row .word-em {
  font-style: normal;
  background: linear-gradient(135deg, #fef3c7, #fbbf24 40%, #fb923c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
[data-theme="light"] .title-row .word-em {
  background: linear-gradient(135deg, #92400e, #b45309 60%, #c2410c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.word-stamp {
  position: relative;
  padding: 0 14px;
  border: 2px solid rgba(251, 191, 36, 0.55);
  border-radius: 8px;
  color: #fef3c7;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(251, 146, 60, 0.10));
  letter-spacing: 0.02em;
  transform: rotate(-2deg);
  box-shadow: 0 12px 28px -16px rgba(251, 146, 60, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: stamp-arm 3.4s ease-in-out infinite;
}
[data-theme="light"] .word-stamp {
  border-color: rgba(180, 83, 9, 0.55);
  color: #7c2d12;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.30), rgba(255, 250, 240, 0.6));
  box-shadow: 0 10px 22px -14px rgba(120, 53, 15, 0.40);
}
@keyframes stamp-arm {
  0%, 100% { transform: rotate(-2deg); box-shadow: 0 12px 28px -16px rgba(251, 146, 60, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.1); }
  50%      { transform: rotate(-1deg) translateY(-1px); box-shadow: 0 18px 36px -16px rgba(251, 146, 60, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.18); }
}
.title-row.second {
  font-size: clamp(22px, 3vw, 34px);
  font-weight: 800;
  background: linear-gradient(135deg, #fef3c7, #fbbf24 40%, #fb923c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  opacity: 0.92;
}
[data-theme="light"] .title-row.second {
  background: linear-gradient(135deg, #4a2c0d, #92400e 70%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}

.copy-sub {
  margin: 0; max-width: 560px;
  font-size: 13px; line-height: 1.6; color: var(--hr-text-secondary);
}
.copy-sub b { color: #fbbf24; font-weight: 800; }
[data-theme="light"] .copy-sub b { color: #b45309; }

.copy-rail {
  display: inline-flex; align-items: center; gap: 10px;
  flex-wrap: wrap;
}
.rail-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px;
  border-radius: 11px;
  font: inherit; font-size: 12px; font-weight: 800; letter-spacing: 0.04em;
  cursor: pointer;
  border: 1px solid;
  transition: transform .22s cubic-bezier(0.34, 1.56, 0.64, 1), background .25s, border-color .25s, box-shadow .25s;
}
.rail-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.rail-btn.primary {
  background: linear-gradient(135deg, #fde68a, #fbbf24 40%, #fb923c);
  border-color: rgba(251, 191, 36, 0.65);
  color: #1f1408;
  box-shadow: 0 14px 28px -12px rgba(251, 146, 60, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.rail-btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 20px 38px -14px rgba(251, 146, 60, 0.70), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.rail-btn.ghost {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(251, 191, 36, 0.30);
  color: var(--hr-text);
}
.rail-btn.ghost:hover:not(:disabled) {
  transform: translateY(-2px);
  background: rgba(251, 191, 36, 0.10);
  border-color: rgba(251, 146, 60, 0.55);
}
[data-theme="light"] .rail-btn.ghost {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.26);
  color: #3a1f0b;
}
[data-theme="light"] .rail-btn.ghost:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.20);
  border-color: rgba(180, 83, 9, 0.42);
}
.rail-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(251, 191, 36, 0.30);
  color: var(--hr-text-muted);
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em;
}
[data-theme="light"] .rail-pill {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(180, 83, 9, 0.30);
  color: #6b5840;
}
.rail-pill svg { color: #fbbf24; }
[data-theme="light"] .rail-pill svg { color: #b45309; }

/* ════════════════════════════════════════════════════════════════════════════
   02 · AGING BANNER
   ════════════════════════════════════════════════════════════════════════════ */
.aging-banner {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 18px;
  border-radius: 14px;
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(248, 113, 113, 0.20), transparent 55%),
    linear-gradient(180deg, rgba(40, 18, 12, 0.78), rgba(28, 14, 8, 0.85));
  border: 1px solid rgba(248, 113, 113, 0.45);
  box-shadow: inset 4px 0 0 -1px rgba(248, 113, 113, 0.75);
  flex-wrap: wrap;
}
[data-theme="light"] .aging-banner {
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(248, 113, 113, 0.18), transparent 55%),
    rgba(254, 226, 226, 0.96);
  border-color: rgba(220, 38, 38, 0.40);
}
.ab-led {
  width: 8px; height: 8px; border-radius: 50%;
  background: #ef4444; box-shadow: 0 0 10px #ef4444;
  animation: core-led-pulse 1s ease-in-out infinite;
  flex-shrink: 0;
}
.ab-ic { color: #fca5a5; flex-shrink: 0; }
[data-theme="light"] .ab-ic { color: #b91c1c; }
.ab-text { font-size: 12.5px; color: var(--hr-text); flex: 1; line-height: 1.55; }
.ab-text strong { color: #fca5a5; font-size: 14px; font-weight: 900; }
.ab-text b { color: #fbbf24; font-weight: 800; }
[data-theme="light"] .ab-text strong { color: #b91c1c; }
[data-theme="light"] .ab-text b { color: #b45309; }
.ab-meter {
  width: 120px; height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden; flex-shrink: 0;
  border: 1px solid rgba(248, 113, 113, 0.25);
}
[data-theme="light"] .ab-meter { background: rgba(220, 38, 38, 0.12); border-color: rgba(220, 38, 38, 0.20); }
.ab-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #fb923c);
  transform-origin: left;
  box-shadow: 0 0 8px rgba(248, 113, 113, 0.55);
}

/* ════════════════════════════════════════════════════════════════════════════
   03 · QUEUE HEAD
   ════════════════════════════════════════════════════════════════════════════ */
.q-head {
  display: flex; flex-direction: column; gap: 6px;
  padding-top: 8px;
}
.qh-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: #fbbf24;
  width: max-content;
}
.qh-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fbbf24; box-shadow: 0 0 8px #fbbf24;
  animation: core-led-pulse 2s ease-in-out infinite;
}
[data-theme="light"] .qh-eye { color: #b45309; }
[data-theme="light"] .qh-dot { background: #b45309; box-shadow: 0 0 6px rgba(180, 83, 9, 0.55); }
.qh-title {
  margin: 0;
  font-size: 22px; font-weight: 900; letter-spacing: -0.018em;
  color: var(--hr-text);
}
.qh-sub {
  margin: 0; max-width: 760px;
  font-size: 12.5px; line-height: 1.55; color: var(--hr-text-secondary);
}
.qh-sub em {
  font-style: normal; font-weight: 800; color: #fbbf24;
}
[data-theme="light"] .qh-sub em { color: #b45309; }

/* ════════════════════════════════════════════════════════════════════════════
   GRID + SKELETONS + EMPTY
   ════════════════════════════════════════════════════════════════════════════ */
.vlt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 16px;
}
.cert-skel {
  height: 240px; border-radius: 18px;
  padding: 16px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.65), rgba(20, 14, 8, 0.78));
  border: 1px solid rgba(251, 191, 36, 0.18);
}
[data-theme="light"] .cert-skel { background: linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 218, 0.94)); border-color: rgba(180, 83, 9, 0.18); }

.vlt-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 56px 24px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.55), rgba(20, 14, 8, 0.78));
  border: 1px dashed rgba(251, 191, 36, 0.30);
  color: var(--hr-text);
  text-align: center;
}
[data-theme="light"] .vlt-empty { background: linear-gradient(180deg, rgba(255, 250, 240, 0.85), rgba(255, 244, 218, 0.90)); border-color: rgba(180, 83, 9, 0.30); }
.empty-seal {
  position: relative;
  display: grid; place-items: center;
  width: 90px; height: 90px; border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.30), rgba(251, 191, 36, 0.04) 70%);
  color: #fbbf24;
  margin-bottom: 4px;
}
.empty-ring {
  position: absolute; inset: -6px;
  border-radius: 50%;
  border: 2px solid rgba(251, 191, 36, 0.42);
  animation: empty-ring-pulse 2.2s ease-in-out infinite;
}
@keyframes empty-ring-pulse {
  0%, 100% { transform: scale(1); opacity: 0.45; }
  50%      { transform: scale(1.10); opacity: 0.8; }
}
.empty-shine {
  position: absolute; inset: 0;
  background: conic-gradient(from 90deg, transparent 0deg 60deg, rgba(251, 191, 36, 0.32) 90deg 120deg, transparent 150deg 360deg);
  border-radius: 50%;
  animation: empty-shine-rot 6s linear infinite;
  mix-blend-mode: screen;
}
@keyframes empty-shine-rot { to { transform: rotate(360deg); } }
.vlt-empty strong { font-size: 16px; font-weight: 800; }
.vlt-empty span { font-size: 12.5px; color: var(--hr-text-secondary); max-width: 360px; }

/* ════════════════════════════════════════════════════════════════════════════
   04 · CERT CARD
   ════════════════════════════════════════════════════════════════════════════ */
.cert {
  position: relative;
  display: flex; flex-direction: column; gap: 11px;
  padding: 16px 16px 14px 50px;
  border-radius: 18px;
  background:
    radial-gradient(80% 60% at 0% 0%, color-mix(in srgb, var(--c) 14%, transparent), transparent 65%),
    linear-gradient(180deg, rgba(28, 18, 10, 0.72), rgba(20, 14, 8, 0.85));
  border: 1px solid color-mix(in srgb, var(--c) 32%, rgba(251, 191, 36, 0.16));
  overflow: hidden;
  isolation: isolate;
  transform-style: preserve-3d;
  transition:
    transform .35s cubic-bezier(0.16, 1, 0.3, 1),
    border-color .25s,
    box-shadow .25s;
}
[data-theme="light"] .cert {
  background:
    radial-gradient(80% 60% at 0% 0%, color-mix(in srgb, var(--c) 18%, transparent), transparent 65%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 244, 218, 0.96));
  border-color: color-mix(in srgb, var(--c) 38%, rgba(180, 83, 9, 0.18));
}
.cert:hover {
  border-color: color-mix(in srgb, var(--c) 65%, transparent);
  box-shadow: 0 24px 50px -28px color-mix(in srgb, var(--c) 60%, transparent);
}
.cert[data-age="mid"]  { box-shadow: 0 14px 30px -22px rgba(245, 158, 11, 0.40); }
.cert[data-age="old"]  { box-shadow: 0 18px 36px -22px rgba(248, 113, 113, 0.45); }
.cert.cert-flash { animation: cert-flash 1.4s ease-out; }
@keyframes cert-flash {
  0%   { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.65); }
  50%  { box-shadow: 0 0 0 12px rgba(251, 191, 36, 0); }
  100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
}

.cert-foil {
  position: absolute; inset: 0;
  background: repeating-linear-gradient(115deg, transparent 0 60px, rgba(251, 191, 36, 0.04) 60px 61px, transparent 61px 120px);
  pointer-events: none;
  opacity: 0.7;
}
.cert-watermark {
  position: absolute; right: 14px; bottom: -8px;
  font-size: 64px; font-weight: 900;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: rgba(251, 191, 36, 0.04);
  letter-spacing: -0.08em;
  pointer-events: none;
  user-select: none;
  z-index: 0;
}
[data-theme="light"] .cert-watermark { color: rgba(180, 83, 9, 0.06); }

/* Hourglass (vertical, left edge) */
.cert-hg {
  position: absolute; top: 14px; bottom: 14px; left: 8px;
  width: 30px;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  z-index: 1;
}
.hg-svg {
  width: 24px; height: auto; flex: 1;
  filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.25));
}
.hg-pct {
  font-size: 8.5px; font-weight: 800;
  color: var(--hr-text-muted);
  letter-spacing: 0.04em;
}
.cert-hg[data-age="mid"] .hg-svg  { filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.45)); }
.cert-hg[data-age="old"] .hg-svg  { filter: drop-shadow(0 0 8px rgba(248, 113, 113, 0.55)); }
.cert-hg[data-age="old"] .hg-pct  { color: #fca5a5; }
.cert-hg[data-age="mid"] .hg-pct  { color: #fcd34d; }
.hg-trickle {
  animation: trickle-flow 2.6s ease-in-out infinite;
  opacity: 0.85;
}
@keyframes trickle-flow {
  0%   { stroke-dashoffset: 0; opacity: 0.4; }
  50%  { opacity: 1; }
  100% { stroke-dashoffset: -12; opacity: 0.4; }
}

/* Cert head row */
.cert-head {
  display: flex; align-items: center; gap: 10px;
  cursor: pointer;
  position: relative; z-index: 1;
}
.ch-avatar {
  position: relative;
  display: grid; place-items: center;
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 70%, #fbbf24), color-mix(in srgb, var(--c) 30%, #fb923c));
  color: #1f1408;
  font-weight: 900; font-size: 13px; letter-spacing: 0.02em;
  flex-shrink: 0;
  box-shadow: 0 6px 14px -6px color-mix(in srgb, var(--c) 70%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.av-initials { position: relative; z-index: 2; }
.av-glyph {
  position: absolute; inset: 3px;
  border-radius: 50%;
  border: 1px dashed rgba(31, 20, 8, 0.35);
}
.av-ring {
  position: absolute; inset: -3px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--c) 65%, transparent);
  animation: av-ring-pulse 3.4s ease-in-out infinite;
}
@keyframes av-ring-pulse {
  0%, 100% { transform: scale(1); opacity: 0.45; }
  50%      { transform: scale(1.10); opacity: 0.85; }
}
.ch-info {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 2px;
}
.ch-name {
  font-size: 13.5px; font-weight: 800; color: var(--hr-text);
  letter-spacing: -0.005em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ch-meta {
  font-size: 10px; letter-spacing: 0.06em;
  color: var(--hr-text-muted);
  display: inline-flex; align-items: center; gap: 6px;
}
.ch-sep { color: rgba(251, 191, 36, 0.55); }
[data-theme="light"] .ch-sep { color: rgba(180, 83, 9, 0.45); }

/* Cert body */
.cert-body {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 13px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid color-mix(in srgb, var(--c) 22%, rgba(251, 191, 36, 0.10));
  cursor: pointer;
  position: relative; z-index: 1;
  transition: border-color .22s, background .22s;
}
[data-theme="light"] .cert-body { background: rgba(255, 250, 240, 0.75); border-color: color-mix(in srgb, var(--c) 24%, rgba(180, 83, 9, 0.10)); }
.cert-body:hover { border-color: color-mix(in srgb, var(--c) 45%, transparent); }
.cb-icon { flex-shrink: 0; }
.cb-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cb-type {
  font-size: 13px; font-weight: 800; color: var(--hr-text);
  letter-spacing: -0.005em;
}
.cb-range {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10.5px; font-weight: 700; color: var(--hr-text-muted);
}
.cb-range svg { color: var(--c); }
.cb-half {
  padding: 1px 5px; border-radius: 999px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: #fbbf24;
}
.cb-days {
  display: inline-flex; align-items: baseline; gap: 3px;
  padding: 6px 10px;
  border-radius: 10px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 18%, transparent), color-mix(in srgb, var(--c) 4%, transparent));
  border: 1px solid color-mix(in srgb, var(--c) 35%, transparent);
}
.cb-days strong {
  font-size: 18px; font-weight: 900; letter-spacing: -0.02em;
  color: var(--c);
  font-variant-numeric: tabular-nums;
}
.cb-days small {
  font-size: 9px; font-weight: 800; letter-spacing: 0.10em; text-transform: uppercase;
  color: var(--hr-text-muted);
}

/* Manager signature */
.cert-sig {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 5px 11px 5px 5px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.32);
  width: max-content; max-width: 100%;
  position: relative; z-index: 1;
}
[data-theme="light"] .cert-sig { background: rgba(251, 191, 36, 0.18); border-color: rgba(180, 83, 9, 0.30); }
.sig-stamp {
  display: grid; place-items: center;
  width: 18px; height: 18px; border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #1f1408;
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.45);
}
.sig-text { font-size: 10.5px; color: var(--hr-text-muted); letter-spacing: 0.02em; }
.sig-name { font-size: 11px; font-weight: 800; color: var(--hr-text); }
.sig-when { margin-left: auto; font-size: 9.5px; color: var(--hr-text-muted); letter-spacing: 0.06em; }
[data-theme="light"] .sig-name { color: #3a1f0b; }

/* Reason */
.cert-reason {
  margin: 0;
  display: flex; gap: 7px; align-items: flex-start;
  padding: 9px 11px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-left: 2px solid color-mix(in srgb, var(--c) 45%, transparent);
  font-size: 12px; line-height: 1.5; color: var(--hr-text-secondary);
  font-style: italic;
  cursor: pointer;
  position: relative; z-index: 1;
}
[data-theme="light"] .cert-reason { background: rgba(255, 244, 218, 0.6); }
.cr-quote { color: var(--c); flex-shrink: 0; margin-top: 3px; opacity: 0.7; }

/* Footer stamps */
.cert-foot {
  display: flex; gap: 8px; justify-content: flex-end;
  flex-wrap: wrap;
  position: relative; z-index: 1;
  padding-top: 4px;
}
.stamp {
  position: relative;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 12px 8px 10px;
  white-space: nowrap;
  flex: 0 0 auto;
  border-radius: 11px;
  font: inherit; font-size: 11.5px; font-weight: 800; letter-spacing: 0.04em;
  cursor: pointer;
  border: 1px solid;
  overflow: hidden;
  isolation: isolate;
  transition:
    transform .22s cubic-bezier(0.34, 1.56, 0.64, 1),
    background .22s,
    border-color .22s,
    box-shadow .22s,
    letter-spacing .3s;
}
.stamp:disabled { opacity: 0.5; cursor: not-allowed; }
.stamp-glyph {
  display: grid; place-items: center;
  width: 22px; height: 22px; border-radius: 6px;
  flex-shrink: 0;
}
.stamp-shadow {
  position: absolute; inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.40) 50%, transparent 70%);
  transform: translateX(-130%);
  pointer-events: none;
  transition: transform .55s cubic-bezier(0.16, 1, 0.3, 1);
}
.stamp:hover:not(:disabled) .stamp-shadow { transform: translateX(130%); }

.stamp-reject {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(248, 113, 113, 0.45);
  color: #fca5a5;
}
.stamp-reject .stamp-glyph {
  background: rgba(248, 113, 113, 0.18);
  color: #fca5a5;
  border: 1px solid rgba(248, 113, 113, 0.45);
}
.stamp-reject:hover:not(:disabled) {
  transform: translateY(-2px) rotate(-1deg);
  background: rgba(248, 113, 113, 0.14);
  border-color: rgba(248, 113, 113, 0.75);
  color: #fff;
  letter-spacing: 0.06em;
}
[data-theme="light"] .stamp-reject {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(220, 38, 38, 0.45);
  color: #b91c1c;
}
[data-theme="light"] .stamp-reject .stamp-glyph {
  background: rgba(248, 113, 113, 0.16);
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.40);
}

.stamp-approve {
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 35%, #f59e0b 70%, #fb923c 100%);
  background-size: 200% 200%;
  border-color: rgba(251, 191, 36, 0.65);
  color: #1f1408;
  box-shadow:
    0 12px 24px -10px rgba(251, 146, 60, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.30);
}
.stamp-approve .stamp-glyph {
  background: rgba(31, 20, 8, 0.15);
  color: #1f1408;
  border: 1px solid rgba(31, 20, 8, 0.30);
}
.stamp-approve:hover:not(:disabled) {
  transform: translateY(-3px) rotate(1deg);
  background-position: 100% 0;
  letter-spacing: 0.06em;
  box-shadow:
    0 20px 38px -12px rgba(251, 146, 60, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.stamp-pulse {
  position: absolute; inset: -2px;
  border-radius: inherit;
  border: 1.5px solid rgba(251, 191, 36, 0.55);
  pointer-events: none;
  animation: stamp-pulse 2.6s ease-out infinite;
}
@keyframes stamp-pulse {
  0%   { transform: scale(1); opacity: 0.85; }
  100% { transform: scale(1.14); opacity: 0; }
}

/* ════════════════════════════════════════════════════════════════════════════
   05 · SEAL CINEMATIC OVERLAY
   ════════════════════════════════════════════════════════════════════════════ */
.cert[data-state="sealing"],
.cert[data-state="sealed"],
.cert[data-state="exit"] {
  border-color: rgba(251, 191, 36, 0.85);
  box-shadow: 0 24px 56px -22px rgba(251, 146, 60, 0.85);
}

.seal-stage {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  pointer-events: none;
  z-index: 3;
}
.seal-wash {
  position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.45) 0%, transparent 60%);
  animation: seal-wash 0.6s ease-out;
}
@keyframes seal-wash {
  0%   { opacity: 0; }
  40%  { opacity: 1; }
  100% { opacity: 0.5; }
}
.seal-coin {
  width: 130px; height: 130px;
  display: grid; place-items: center;
  filter: drop-shadow(0 18px 26px rgba(0, 0, 0, 0.55))
          drop-shadow(0 0 18px rgba(251, 191, 36, 0.65));
}
.seal-svg { width: 100%; height: 100%; }
.seal-shock {
  position: absolute;
  width: 120px; height: 120px;
  border-radius: 50%;
  border: 2px solid rgba(251, 191, 36, 0.65);
  box-shadow: 0 0 30px rgba(251, 191, 36, 0.65), inset 0 0 30px rgba(251, 191, 36, 0.35);
}
.seal-spark {
  position: absolute;
  width: 6px; height: 6px; border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
  animation: spark-fly 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}
@keyframes spark-fly {
  0%   { transform: translate(0, 0) scale(0.4); opacity: 0; }
  20%  { opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0.1); opacity: 0; }
}

/* ════════════════════════════════════════════════════════════════════════════
   06 · CONFETTI HOST
   ════════════════════════════════════════════════════════════════════════════ */
.confetti-host {
  position: fixed; inset: 0; pointer-events: none; z-index: 2000; overflow: hidden;
}
.confetti-bit {
  position: absolute; top: -24px;
  width: 8px; height: 12px;
  border-radius: 2px;
  animation: vault-conf-fall 1.9s ease-in forwards;
}
@keyframes vault-conf-fall {
  0%   { transform: translateY(0)     rotate(0deg);   opacity: 0; }
  10%  { opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
}

.spin { animation: vault-spin 1s linear infinite; }
@keyframes vault-spin { to { transform: rotate(360deg); } }

/* ════════════════════════════════════════════════════════════════════════════
   07 · PROOF — awaiting badge + attached chip + request button + gallery
   ════════════════════════════════════════════════════════════════════════════ */

/* Tiny awaiting LED on the avatar */
.av-awaiting {
  position: absolute;
  top: -4px; right: -4px;
  display: grid; place-items: center;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 70%);
  color: #3a1f0b;
  border: 2px solid rgba(20, 14, 8, 0.9);
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.65);
  animation: av-await-pulse 1.6s ease-in-out infinite;
  z-index: 3;
}
[data-theme="light"] .av-awaiting {
  border-color: rgba(255, 250, 240, 0.96);
  box-shadow: 0 0 10px rgba(217, 119, 6, 0.55);
}
@keyframes av-await-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 10px rgba(245, 158, 11, 0.65); }
  50%      { transform: scale(1.16); box-shadow: 0 0 16px rgba(245, 158, 11, 0.95); }
}

/* Proof row (chips between header and body) */
.proof-row {
  display: flex; flex-wrap: wrap; gap: 7px;
  position: relative; z-index: 1;
  padding-top: 2px;
}
.proof-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  font: inherit; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.06em; text-transform: uppercase;
  border: 1px solid;
  cursor: default;
  transition: transform .22s cubic-bezier(0.34, 1.56, 0.64, 1), background .22s, border-color .22s, box-shadow .22s;
}
.proof-chip .pc-text { font-size: 10.5px; letter-spacing: 0.06em; }

/* Awaiting — amber pulsing */
.proof-chip-await {
  background: rgba(245, 158, 11, 0.10);
  border-color: rgba(245, 158, 11, 0.55);
  color: #fcd34d;
}
[data-theme="light"] .proof-chip-await {
  background: rgba(254, 243, 199, 0.85);
  border-color: rgba(180, 83, 9, 0.42);
  color: #92400e;
}
.proof-chip-await .pc-led {
  width: 6px; height: 6px; border-radius: 50%;
  background: #fcd34d; box-shadow: 0 0 8px #fcd34d;
  animation: pc-led-pulse 1.4s ease-in-out infinite;
}
[data-theme="light"] .proof-chip-await .pc-led { background: #b45309; box-shadow: 0 0 6px #d97706; }
@keyframes pc-led-pulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.4); }
}

/* Attached — cyan glassy clickable */
.proof-chip-attached {
  background: rgba(6, 182, 212, 0.12);
  border-color: rgba(6, 182, 212, 0.55);
  color: #67e8f9;
  cursor: pointer;
  backdrop-filter: blur(6px);
}
[data-theme="light"] .proof-chip-attached {
  background: rgba(207, 250, 254, 0.85);
  border-color: rgba(8, 145, 178, 0.45);
  color: #0e7490;
}
.proof-chip-attached:hover {
  transform: translateY(-1px);
  background: rgba(6, 182, 212, 0.22);
  border-color: rgba(6, 182, 212, 0.85);
  color: #cffafe;
  box-shadow: 0 8px 18px -10px rgba(6, 182, 212, 0.6);
}
[data-theme="light"] .proof-chip-attached:hover {
  background: rgba(165, 243, 252, 0.95);
  border-color: rgba(8, 145, 178, 0.65);
  color: #155e75;
}
.proof-chip-attached .pc-arrow {
  font-weight: 900; transition: transform .25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.proof-chip-attached:hover .pc-arrow { transform: translateX(3px); }

/* ── Stamp variant — request-proof button ── */
.stamp-proof {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.16), rgba(20, 184, 166, 0.10));
  border-color: rgba(6, 182, 212, 0.55);
  color: #67e8f9;
}
.stamp-proof .stamp-glyph {
  background: rgba(6, 182, 212, 0.20);
  color: #67e8f9;
  border: 1px solid rgba(6, 182, 212, 0.50);
}
.stamp-proof:hover:not(:disabled) {
  transform: translateY(-2px);
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.30), rgba(20, 184, 166, 0.20));
  border-color: rgba(6, 182, 212, 0.85);
  color: #cffafe;
  letter-spacing: 0.06em;
  box-shadow: 0 12px 24px -10px rgba(6, 182, 212, 0.65);
}
[data-theme="light"] .stamp-proof {
  background: linear-gradient(135deg, rgba(207, 250, 254, 0.85), rgba(204, 251, 241, 0.80));
  border-color: rgba(8, 145, 178, 0.50);
  color: #0e7490;
}
[data-theme="light"] .stamp-proof .stamp-glyph {
  background: rgba(165, 243, 252, 0.85);
  color: #0e7490;
  border-color: rgba(8, 145, 178, 0.50);
}
[data-theme="light"] .stamp-proof:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(165, 243, 252, 0.95), rgba(153, 246, 228, 0.95));
  border-color: rgba(8, 145, 178, 0.80);
  color: #155e75;
}

/* Close (lapsed) — faded ember; the only action for a past-dated stale request */
.stamp-lapse {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.18), rgba(146, 64, 14, 0.12));
  border-color: rgba(217, 119, 6, 0.55);
  color: #fdba74;
}
.stamp-lapse .stamp-glyph {
  background: rgba(217, 119, 6, 0.20);
  color: #fdba74;
  border: 1px solid rgba(217, 119, 6, 0.50);
}
.stamp-lapse:hover:not(:disabled) {
  transform: translateY(-2px);
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.32), rgba(180, 83, 9, 0.22));
  border-color: rgba(217, 119, 6, 0.85);
  color: #fed7aa;
  letter-spacing: 0.06em;
  box-shadow: 0 12px 24px -10px rgba(180, 83, 9, 0.6);
}
[data-theme="light"] .stamp-lapse {
  background: linear-gradient(135deg, rgba(254, 243, 199, 0.9), rgba(253, 230, 138, 0.8));
  border-color: rgba(180, 83, 9, 0.5);
  color: #92400e;
}
[data-theme="light"] .stamp-lapse .stamp-glyph {
  background: rgba(253, 230, 138, 0.9);
  color: #92400e;
  border-color: rgba(180, 83, 9, 0.5);
}

/* ════════════════════════════════════════════════════════════════════════════
   08 · PROOF GALLERY OVERLAY
   ════════════════════════════════════════════════════════════════════════════ */
.pg-scrim {
  position: fixed; inset: 0; z-index: 1300;
  display: flex; align-items: center; justify-content: center;
  padding: 22px;
  background:
    radial-gradient(60% 60% at 50% 40%, rgba(6, 182, 212, 0.28), transparent 60%),
    radial-gradient(40% 50% at 25% 70%, rgba(251, 191, 36, 0.20), transparent 60%),
    rgba(4, 12, 18, 0.74);
  backdrop-filter: blur(14px) saturate(140%);
  overflow: hidden;
}
[data-theme="light"] .pg-scrim {
  background:
    radial-gradient(60% 60% at 50% 40%, rgba(6, 182, 212, 0.22), transparent 60%),
    radial-gradient(40% 50% at 25% 70%, rgba(251, 191, 36, 0.22), transparent 60%),
    rgba(8, 30, 38, 0.42);
}
.pg-orbit {
  position: absolute; border-radius: 50%;
  pointer-events: none; filter: blur(0.6px);
}
.pg-orbit-1 { width: 640px; height: 640px; border: 1px solid rgba(6, 182, 212, 0.24); animation: pm-spin 42s linear infinite; }
.pg-orbit-2 { width: 880px; height: 880px; border: 1px solid rgba(251, 191, 36, 0.16); animation: pm-spin 70s linear infinite reverse; }
@keyframes pg-spin { to { transform: rotate(360deg); } }

.pg-card {
  position: relative;
  width: 880px; max-width: calc(100vw - 32px);
  max-height: calc(100vh - 44px);
  border-radius: 24px;
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(6, 182, 212, 0.20), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(251, 191, 36, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(10, 18, 24, 0.96), rgba(6, 12, 18, 0.96));
  border: 1px solid rgba(6, 182, 212, 0.30);
  box-shadow:
    0 60px 140px -30px rgba(0, 0, 0, 0.88),
    0 0 0 1px rgba(94, 234, 212, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
  display: flex; flex-direction: column;
}
[data-theme="light"] .pg-card {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(6, 182, 212, 0.16), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(251, 191, 36, 0.18), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.98), rgba(247, 254, 252, 0.98));
  border-color: rgba(8, 145, 178, 0.32);
  box-shadow:
    0 50px 120px -30px rgba(8, 51, 68, 0.36),
    0 0 0 1px rgba(8, 145, 178, 0.10);
}

.pg-head {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 22px 24px 18px;
  border-bottom: 1px solid rgba(6, 182, 212, 0.22);
  background: linear-gradient(90deg, rgba(6, 182, 212, 0.10), rgba(251, 191, 36, 0.04) 60%, transparent);
}
[data-theme="light"] .pg-head {
  background: linear-gradient(90deg, rgba(6, 182, 212, 0.10), rgba(251, 191, 36, 0.08) 60%, transparent);
  border-color: rgba(8, 145, 178, 0.20);
}
.pg-glyph {
  width: 56px; height: 56px;
  display: grid; place-items: center;
  border-radius: 16px;
  background:
    radial-gradient(60% 60% at 30% 30%, rgba(94, 234, 212, 0.30), transparent 70%),
    linear-gradient(135deg, rgba(6, 182, 212, 0.32), rgba(20, 184, 166, 0.28));
  border: 1px solid rgba(6, 182, 212, 0.42);
  color: #cffafe;
  box-shadow: 0 12px 32px -10px rgba(6, 182, 212, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
[data-theme="light"] .pg-glyph { color: #0e7490; border-color: rgba(8, 145, 178, 0.40); }
.pg-meta { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.pg-eye {
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: #67e8f9;
}
[data-theme="light"] .pg-eye { color: #0e7490; }
.pg-title {
  margin: 0;
  font-size: 19px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.014em;
}
.pg-sub {
  margin: 0;
  font-size: 11.5px;
  color: var(--leave-text-muted);
  display: inline-flex; flex-wrap: wrap; gap: 6px; align-items: center;
}
.pg-emp { color: var(--leave-text-secondary); font-weight: 700; }
.pg-ref { color: #67e8f9; font-weight: 700; }
[data-theme="light"] .pg-ref { color: #0e7490; }
.pg-sep { opacity: 0.45; }
.pg-close {
  display: grid; place-items: center;
  width: 36px; height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(6, 182, 212, 0.30);
  background: rgba(10, 18, 24, 0.4);
  color: var(--leave-text-muted);
  cursor: pointer;
  transition: transform .26s cubic-bezier(0.16, 1, 0.3, 1), color .22s, border-color .22s, background .22s;
}
[data-theme="light"] .pg-close { background: rgba(247, 254, 252, 0.6); }
.pg-close:hover {
  transform: rotate(90deg) scale(1.08);
  color: #67e8f9; border-color: #06b6d4;
  background: rgba(6, 182, 212, 0.18);
}
[data-theme="light"] .pg-close:hover { color: #0e7490; }

.pg-body {
  padding: 22px 24px 26px;
  overflow-y: auto;
}
.pg-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 48px 24px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(6, 182, 212, 0.32);
  text-align: center;
  color: var(--leave-text-secondary);
}
[data-theme="light"] .pg-empty { background: rgba(247, 254, 252, 0.7); border-color: rgba(8, 145, 178, 0.28); }
.pg-empty strong { font-size: 14px; color: var(--leave-text); }
.pg-empty span { font-size: 12px; max-width: 380px; }
.pg-empty svg { color: #67e8f9; }
[data-theme="light"] .pg-empty svg { color: #0891b2; }

.pg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}
.pg-tile {
  display: flex; flex-direction: column; gap: 0;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.55), rgba(20, 14, 8, 0.78));
  border: 1px solid rgba(6, 182, 212, 0.26);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 10px 24px -16px rgba(0, 0, 0, 0.6);
  transition: border-color .22s, box-shadow .25s;
}
[data-theme="light"] .pg-tile {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(247, 254, 252, 0.96));
  border-color: rgba(8, 145, 178, 0.22);
  box-shadow: 0 8px 20px -14px rgba(8, 51, 68, 0.30);
}
.pg-tile:hover {
  border-color: rgba(6, 182, 212, 0.65);
  box-shadow: 0 18px 36px -16px rgba(6, 182, 212, 0.45);
}
.pgt-thumb {
  position: relative;
  aspect-ratio: 4 / 3;
  display: grid; place-items: center;
  background:
    radial-gradient(circle at 35% 35%, rgba(6, 182, 212, 0.18), transparent 65%),
    linear-gradient(135deg, rgba(8, 14, 20, 0.85), rgba(4, 10, 14, 0.92));
  color: #67e8f9;
  overflow: hidden;
}
[data-theme="light"] .pgt-thumb {
  background:
    radial-gradient(circle at 35% 35%, rgba(6, 182, 212, 0.18), transparent 65%),
    linear-gradient(135deg, rgba(247, 254, 252, 0.85), rgba(207, 250, 254, 0.65));
  color: #0e7490;
}
.pgt-thumb img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
}
.pgt-ext {
  position: absolute; right: 8px; bottom: 8px;
  padding: 3px 7px;
  border-radius: 6px;
  font-size: 9px; font-weight: 900; letter-spacing: 0.12em;
  background: rgba(6, 182, 212, 0.30);
  border: 1px solid rgba(6, 182, 212, 0.55);
  color: #cffafe;
}
[data-theme="light"] .pgt-ext {
  background: rgba(165, 243, 252, 0.85);
  border-color: rgba(8, 145, 178, 0.50);
  color: #0e7490;
}
.pgt-meta {
  display: flex; flex-direction: column; gap: 3px;
  padding: 10px 12px;
  border-top: 1px solid rgba(6, 182, 212, 0.18);
}
[data-theme="light"] .pgt-meta { border-color: rgba(8, 145, 178, 0.16); }
.pgt-name {
  font-size: 12px; font-weight: 700;
  color: var(--leave-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.pgt-info {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em;
  color: var(--leave-text-muted);
}
.pgt-dot {
  width: 3px; height: 3px; border-radius: 50%;
  background: rgba(6, 182, 212, 0.55);
}
[data-theme="light"] .pgt-dot { background: rgba(8, 145, 178, 0.55); }

.pg-enter-active, .pg-leave-active { transition: opacity .28s; }
.pg-enter-from, .pg-leave-to { opacity: 0; }

@media (max-width: 720px) {
  .pg-card { width: calc(100vw - 24px); border-radius: 18px; }
  .pg-head { grid-template-columns: 44px 1fr auto; padding: 18px 16px 14px; }
  .pg-glyph { width: 44px; height: 44px; border-radius: 12px; }
  .pg-title { font-size: 16px; }
  .pg-body { padding: 16px; }
  .pg-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
}

/* Reduce motion */
@media (prefers-reduced-motion: reduce) {
  .a-a, .a-b, .a-c, .bg-rays, .bg-scan,
  .rim-rot, .dial-ag, .core-led, .led-dot,
  .stamp-pulse, .av-ring, .empty-ring, .empty-shine,
  .word-stamp, .hg-trickle, .dial-sweep,
  .ab-led, .qh-dot,
  .av-awaiting, .proof-chip-await .pc-led,
  .pg-orbit-1, .pg-orbit-2 { animation: none !important; }
  .stamp-shadow { transition: none; }
}
</style>
