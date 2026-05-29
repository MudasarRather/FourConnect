<template>
  <aside class="ssd-rail" role="navigation" aria-label="Document categories">
    <!-- Rail header — punch-card style with eyebrow + stat pills -->
    <header class="rail-head">
      <span class="rail-eyebrow"><span class="rail-eyebrow-dot" />Your Vault</span>
      <h3 class="rail-title">Categories</h3>
      <div class="rail-meta">
        <span class="meta-pill">
          <strong>{{ totalDocs }}</strong>
          <em>{{ totalDocs === 1 ? 'document' : 'documents' }}</em>
        </span>
        <span class="meta-divider" />
        <span class="meta-pill">
          <strong>{{ categories.length }}</strong>
          <em>categories</em>
        </span>
      </div>
    </header>

    <div class="rail-divider" aria-hidden="true">
      <span class="rd-line" />
      <span class="rd-dot" />
      <span class="rd-line" />
    </div>

    <!-- Animated connector vine + stops -->
    <div class="rail-track">
      <!-- Connector SVG — gold dashed vine drawing in -->
      <svg class="rail-vine" :viewBox="`0 0 60 ${pathHeight}`" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="ssd-vine-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stop-color="#fde68a" stop-opacity="0.85" />
            <stop offset="50%" stop-color="#fbbf24" stop-opacity="0.95" />
            <stop offset="100%" stop-color="#fb923c" stop-opacity="0.75" />
          </linearGradient>
        </defs>
        <!-- Faint backing -->
        <line x1="30" y1="6" x2="30" y2="100%"
          stroke="rgba(251, 191, 36, 0.18)" stroke-width="1.5" stroke-dasharray="1 3" />
        <!-- Animated foreground -->
        <line x1="30" y1="6" x2="30" y2="100%"
          stroke="url(#ssd-vine-grad)" stroke-width="2" stroke-linecap="round"
          class="vine-fg"
          :style="{ '--vine-len': pathHeight + 'px' }" />
      </svg>

      <!-- Category stops — card-style with progress bar + status pips -->
      <Motion as="button" v-for="(c, i) in catsWithStats"
        :key="c.key"
        type="button"
        class="rail-stop"
        :class="{
          'is-active': c.key === active,
          'is-missing': c.missing,
          'is-empty':   c.total === 0 && !c.missing,
          'has-rejected': c.rejected > 0,
        }"
        :style="{ '--stop-color': c.tone }"
        :initial="{ opacity: 0, x: -10 }"
        :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.42, delay: 0.18 + i * 0.05, ease: [0.22, 1, 0.36, 1] }"
        :whileTap="{ scale: 0.97 }"
        @click="$emit('select', c.key)"
      >
        <!-- Aurora wash on active -->
        <span class="stop-aurora" aria-hidden="true" />

        <!-- Connector dot — sits on the vine -->
        <span class="stop-node" aria-hidden="true">
          <component :is="iconFor(c.icon)" :size="14" />
          <span class="node-ring" />
          <span class="node-pulse" />
        </span>

        <!-- Stop content -->
        <div class="stop-content">
          <div class="stop-line">
            <span class="stop-name">{{ c.label }}</span>
            <span class="stop-pips">
              <span v-if="c.pending > 0" class="pip pending" :title="`${c.pending} pending`">
                {{ c.pending }}
              </span>
              <span v-if="c.rejected > 0" class="pip rejected" :title="`${c.rejected} rejected`">
                <AlertCircle :size="9" />
              </span>
              <span v-if="c.missing" class="pip missing" title="Required document missing">
                <X :size="9" />
              </span>
            </span>
          </div>

          <!-- Progress + count line -->
          <div class="stop-meta">
            <span class="stop-progress" :class="{ 'is-empty': c.total === 0 }">
              <span class="stop-progress-fill" :style="{ width: progressPct(c) + '%' }" />
              <span class="stop-progress-shimmer" />
            </span>
            <span class="stop-count">{{ c.verified }}<span class="of">/</span>{{ c.total || 0 }}</span>
          </div>
        </div>

        <!-- Active indicator arrow -->
        <span class="stop-chevron" aria-hidden="true">
          <ChevronRight :size="13" />
        </span>
      </Motion>
    </div>

    <div class="rail-divider" aria-hidden="true">
      <span class="rd-line" />
      <span class="rd-dot small" />
      <span class="rd-line" />
    </div>

    <!-- Bottom CTA section -->
    <footer class="rail-foot">
      <Motion as="button"
        class="rail-cta"
        :whileTap="{ scale: 0.97 }"
        @click="$emit('request')"
      >
        <span class="rc-icon"><Mail :size="13" /></span>
        <span class="rc-label">Request a document</span>
        <span class="rc-arrow"><ArrowUpRight :size="13" /></span>
      </Motion>
    </footer>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import {
  IdCard, Fingerprint, FileSignature, GraduationCap, Award, Mail,
  ShieldCheck, Wallet, Folder, AlertCircle, X, ChevronRight, ArrowUpRight,
} from 'lucide-vue-next'

const props = defineProps({
  categories: { type: Array, required: true },
  summary:    { type: Object, default: () => ({ by_category: [] }) },
  active:     { type: String, default: '' },
  totalDocs:  { type: Number, default: 0 },
})

defineEmits(['select', 'request'])

const ICON_MAP = { IdCard, Fingerprint, FileSignature, GraduationCap, Award, Mail, ShieldCheck, Wallet, Folder }
const iconFor = (key) => ICON_MAP[key] || Folder

const catsWithStats = computed(() => {
  const map = new Map(((props.summary?.by_category) || []).map(b => [b.category, b]))
  return props.categories.map(c => {
    const b = map.get(c.key) || {}
    const missing = !!(b.is_mandatory && (b.total === 0 || (b.missing_required_types || []).length))
    return {
      ...c,
      total: b.total || 0,
      pending: (b.pending || 0) + (b.resubmit_required || 0),
      verified: b.verified || 0,
      rejected: b.rejected || 0,
      missing,
    }
  })
})

const pathHeight = computed(() => Math.max(120, catsWithStats.value.length * 68 + 40))

function progressPct(c) {
  if (!c.total) return 0
  return Math.round((c.verified / c.total) * 100)
}
</script>

<style scoped>
.ssd-rail {
  position: sticky;
  top: 20px;
  align-self: flex-start;
  width: 280px;
  display: flex; flex-direction: column;
  gap: 14px;
  padding: 18px 16px 16px;
  border-radius: 22px;
  background:
    radial-gradient(80% 60% at 50% 0%, rgba(251, 191, 36, 0.14), transparent 65%),
    rgba(20, 15, 12, 0.82);
  border: 1px solid rgba(251, 191, 36, 0.22);
  box-shadow:
    0 24px 60px -30px rgba(0, 0, 0, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  isolation: isolate;
  overflow: hidden;
  transform: translateZ(0);    /* GPU-promote: prevents scroll flicker */
}
.ssd-rail::before {
  content: '';
  position: absolute; inset: -30% -10% 60% -10%;
  background: radial-gradient(60% 50% at 50% 0%, rgba(251, 191, 36, 0.16), transparent 70%);
  pointer-events: none; z-index: -1;
  animation: ssd-rail-aurora 14s ease-in-out infinite;
}
@keyframes ssd-rail-aurora {
  0%, 100% { transform: translate(0, 0); opacity: 0.55; }
  50%      { transform: translate(4%, 2%); opacity: 0.80; }
}
[data-theme="light"] .ssd-rail {
  background:
    radial-gradient(80% 60% at 50% 0%, rgba(217, 119, 6, 0.20), transparent 65%),
    rgba(255, 250, 240, 0.98);
  border-color: rgba(180, 83, 9, 0.26);
  box-shadow:
    0 22px 60px -30px rgba(120, 53, 15, 0.30),
    inset 0 1px 0 rgba(255, 255, 255, 0.60);
}

/* ─── Header ─── */
.rail-head { display: flex; flex-direction: column; gap: 6px; padding: 0 6px; }
.rail-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; font-weight: 800; letter-spacing: 1.8px; text-transform: uppercase;
  color: #fde68a;
}
[data-theme="light"] .rail-eyebrow { color: #d97706; }
.rail-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fb923c; box-shadow: 0 0 8px rgba(251, 146, 60, 0.7);
  animation: ssd-eyebrow-pulse 2.4s ease-in-out infinite;
}
.rail-title {
  margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -0.015em;
  background: linear-gradient(110deg, #fde68a, #fbbf24, #f59e0b, #fb923c);
  background-size: 200% 200%;
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  animation: ssd-title-shimmer 7s ease-in-out infinite;
}
[data-theme="light"] .rail-title {
  background: linear-gradient(110deg, #d97706, #b45309, #92400e);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.rail-meta {
  display: flex; align-items: center; gap: 8px; margin-top: 2px;
}
.meta-pill {
  display: inline-flex; align-items: baseline; gap: 4px;
  font-size: 10.5px;
}
.meta-pill strong {
  font-size: 14px; font-weight: 800; color: var(--hr-text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.meta-pill em {
  font-style: normal;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase;
  color: var(--hr-text-muted);
}
[data-theme="light"] .meta-pill em { color: #786c5c; }
.meta-divider {
  width: 3px; height: 3px; border-radius: 50%;
  background: rgba(251, 191, 36, 0.45);
}

/* ─── Section dividers ─── */
.rail-divider {
  display: flex; align-items: center; gap: 8px;
  padding: 0 8px;
}
.rd-line {
  flex: 1; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.35), transparent);
}
[data-theme="light"] .rd-line {
  background: linear-gradient(90deg, transparent, rgba(180, 83, 9, 0.35), transparent);
}
.rd-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fde68a, #fb923c);
  box-shadow: 0 0 8px rgba(251, 146, 60, 0.6);
  flex-shrink: 0;
}
.rd-dot.small { width: 4px; height: 4px; opacity: 0.65; }

/* ─── Track + vine ─── */
.rail-track {
  position: relative;
  padding: 2px 0;
  display: flex; flex-direction: column; gap: 8px;
}
.rail-vine {
  position: absolute;
  left: 16px; top: 0; bottom: 0;
  width: 30px; height: 100%;
  pointer-events: none;
  z-index: 0;
}
.vine-fg {
  stroke-dasharray: var(--vine-len, 600);
  stroke-dashoffset: var(--vine-len, 600);
  animation: ssd-vine-draw 1.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards;
  filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.55));
}
@keyframes ssd-vine-draw {
  to { stroke-dashoffset: 0; }
}

/* ─── Each stop is a card-style chip ─── */
.rail-stop {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 36px 1fr 14px;
  gap: 10px;
  align-items: center;
  padding: 9px 12px 9px 8px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: var(--hr-text);
  --stop-color: #fbbf24;
  transition:
    background .35s var(--ssd-spring),
    border-color .35s var(--ssd-spring),
    box-shadow .35s var(--ssd-spring),
    transform .35s var(--ssd-spring);
  overflow: hidden;
  isolation: isolate;
}
.rail-stop:hover {
  background: rgba(251, 191, 36, 0.06);
  border-color: rgba(251, 191, 36, 0.18);
  transform: translateX(2px);
}
[data-theme="light"] .rail-stop:hover { background: rgba(217, 119, 6, 0.08); border-color: rgba(217, 119, 6, 0.20); }

.rail-stop.is-active {
  background: linear-gradient(95deg,
    color-mix(in srgb, var(--stop-color) 18%, transparent),
    color-mix(in srgb, var(--stop-color) 5%, transparent) 70%);
  border-color: color-mix(in srgb, var(--stop-color) 45%, transparent);
  box-shadow:
    0 16px 28px -16px color-mix(in srgb, var(--stop-color) 60%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
[data-theme="light"] .rail-stop.is-active {
  background: linear-gradient(95deg,
    color-mix(in srgb, var(--stop-color) 24%, transparent),
    color-mix(in srgb, var(--stop-color) 8%, transparent) 70%);
  box-shadow:
    0 14px 26px -18px color-mix(in srgb, var(--stop-color) 65%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

/* Aurora wash that pulses behind the active stop */
.stop-aurora {
  position: absolute; inset: -1px;
  background: radial-gradient(80% 100% at 0% 50%,
    color-mix(in srgb, var(--stop-color) 30%, transparent),
    transparent 65%);
  opacity: 0;
  z-index: -1;
  border-radius: inherit;
  transition: opacity .45s var(--ssd-spring);
}
.rail-stop.is-active .stop-aurora { opacity: 1; }

/* ─── Connector node ─── */
.stop-node {
  position: relative;
  width: 36px; height: 36px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 11px;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--stop-color) 22%, rgba(40, 30, 22, 0.85)),
    color-mix(in srgb, var(--stop-color) 6%, rgba(40, 30, 22, 0.85)));
  border: 1.5px solid color-mix(in srgb, var(--stop-color) 40%, transparent);
  color: var(--stop-color);
  flex-shrink: 0;
  z-index: 2;
  transition:
    border-color .35s var(--ssd-spring),
    box-shadow .35s var(--ssd-spring),
    transform .35s var(--ssd-spring);
}
[data-theme="light"] .stop-node {
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--stop-color) 22%, #fff),
    color-mix(in srgb, var(--stop-color) 8%, #fff));
}
.rail-stop:hover .stop-node {
  border-color: color-mix(in srgb, var(--stop-color) 65%, transparent);
  transform: scale(1.05) rotate(-3deg);
  box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--stop-color) 60%, transparent);
}
.rail-stop.is-active .stop-node {
  border-color: var(--stop-color);
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--stop-color) 25%, transparent),
    0 10px 22px -8px color-mix(in srgb, var(--stop-color) 60%, transparent);
}
.rail-stop.is-empty .stop-node {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(251, 191, 36, 0.18);
  color: rgba(251, 191, 36, 0.45);
}
[data-theme="light"] .rail-stop.is-empty .stop-node {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(180, 83, 9, 0.18);
  color: rgba(180, 83, 9, 0.40);
}

.node-ring {
  position: absolute; inset: -5px;
  border-radius: 50%;
  border: 1px dashed color-mix(in srgb, var(--stop-color) 35%, transparent);
  opacity: 0;
  transition: opacity .35s var(--ssd-spring);
  animation: ssd-glow-orbit 8s linear infinite;
  animation-play-state: paused;
}
.rail-stop.is-active .node-ring {
  opacity: 1;
  animation-play-state: running;
}
.node-pulse {
  position: absolute; inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--stop-color) 50%, transparent);
}
.rail-stop.is-active .node-pulse {
  animation: ssd-node-pulse 2.2s ease-out infinite;
}
@keyframes ssd-node-pulse {
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--stop-color) 55%, transparent); }
  100% { box-shadow: 0 0 0 10px color-mix(in srgb, var(--stop-color) 0%, transparent); }
}

/* ─── Content area ─── */
.stop-content { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.stop-line {
  display: flex; align-items: center; gap: 6px;
}
.stop-name {
  flex: 1; min-width: 0;
  font-size: 12.5px; font-weight: 700; letter-spacing: 0.1px;
  color: var(--hr-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: color .25s;
}
.rail-stop.is-active .stop-name { color: var(--stop-color); letter-spacing: 0.3px; }
[data-theme="light"] .rail-stop.is-active .stop-name {
  color: color-mix(in srgb, var(--stop-color) 80%, #000);
}

.stop-pips { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; }
.pip {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 16px; height: 16px; padding: 0 5px;
  border-radius: 999px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.2px;
  line-height: 1;
}
.pip.pending {
  background: linear-gradient(135deg, rgba(202, 138, 4, 0.30), rgba(202, 138, 4, 0.15));
  color: #fde68a;
  border: 1px solid rgba(202, 138, 4, 0.45);
}
.pip.rejected {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.35), rgba(220, 38, 38, 0.18));
  color: #fecaca;
  border: 1px solid rgba(220, 38, 38, 0.55);
  padding: 0; min-width: 14px;
}
.pip.missing {
  background: linear-gradient(135deg, #dc2626, #991b1b);
  color: #fff;
  border: 1px solid rgba(254, 226, 226, 0.40);
  box-shadow: 0 0 8px rgba(220, 38, 38, 0.50);
  padding: 0; min-width: 14px;
  animation: ssd-missing-blink 2.4s ease-in-out infinite;
}
@keyframes ssd-missing-blink {
  0%, 100% { box-shadow: 0 0 6px rgba(220, 38, 38, 0.45); }
  50%      { box-shadow: 0 0 14px rgba(220, 38, 38, 0.85); }
}
[data-theme="light"] .pip.pending { color: #854d0e; }
[data-theme="light"] .pip.rejected { color: #991b1b; }

/* ─── Progress + count ─── */
.stop-meta {
  display: flex; align-items: center; gap: 8px;
}
.stop-progress {
  flex: 1; height: 4px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.16);
  overflow: hidden;
  position: relative;
}
[data-theme="light"] .stop-progress {
  background: rgba(180, 83, 9, 0.08);
  border-color: rgba(180, 83, 9, 0.18);
}
.stop-progress.is-empty {
  background: rgba(220, 38, 38, 0.06);
  border-color: rgba(220, 38, 38, 0.20);
}
.stop-progress-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--stop-color) 100%, transparent),
    color-mix(in srgb, var(--stop-color) 60%, transparent));
  border-radius: inherit;
  transition: width .8s var(--ssd-spring);
}
.stop-progress-shimmer {
  position: absolute; inset: 0;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%);
  transform: translateX(-100%);
  animation: ssd-progress-shimmer 2.6s linear infinite;
}
@keyframes ssd-progress-shimmer {
  0%   { transform: translateX(-100%); }
  60%, 100% { transform: translateX(220%); }
}

.stop-count {
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.3px;
  color: var(--hr-text-muted);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.stop-count .of { opacity: 0.55; margin: 0 1px; }
[data-theme="light"] .stop-count { color: #786c5c; }
.rail-stop.is-active .stop-count { color: var(--stop-color); }

/* ─── Chevron ─── */
.stop-chevron {
  display: inline-flex; align-items: center; justify-content: center;
  color: rgba(251, 191, 36, 0.35);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity .35s, transform .35s var(--ssd-spring), color .25s;
}
.rail-stop:hover .stop-chevron,
.rail-stop.is-active .stop-chevron {
  opacity: 1;
  transform: translateX(0);
  color: var(--stop-color);
}
[data-theme="light"] .stop-chevron { color: rgba(180, 83, 9, 0.35); }

/* ─── Footer CTA ─── */
.rail-foot { padding: 0 4px 2px; }
.rail-cta {
  position: relative;
  width: 100%;
  display: inline-flex; align-items: center; gap: 10px;
  padding: 11px 14px;
  border-radius: 14px;
  font: inherit; font-size: 12px; font-weight: 800; letter-spacing: 0.4px;
  color: #1f1408;
  background:
    radial-gradient(120% 100% at 0% 50%, rgba(255, 255, 255, 0.30), transparent 60%),
    linear-gradient(135deg, #fde68a 0%, #fbbf24 35%, #f59e0b 70%, #fb923c 100%);
  background-size: 200% 200%;
  border: 1px solid rgba(251, 191, 36, 0.60);
  cursor: pointer;
  overflow: hidden; isolation: isolate;
  box-shadow:
    0 12px 26px -10px rgba(251, 146, 60, 0.60),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  transition: letter-spacing .35s var(--ssd-spring), box-shadow .35s, border-color .35s;
}
.rail-cta::after {
  content: ''; position: absolute; inset: 0; z-index: -1;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.35) 50%, transparent 70%);
  transform: translateX(-110%);
  transition: transform .8s var(--ssd-quint);
}
.rail-cta:hover {
  letter-spacing: 0.7px;
  box-shadow:
    0 20px 38px -12px rgba(251, 146, 60, 0.80),
    inset 0 1px 0 rgba(255, 255, 255, 0.70);
}
.rail-cta:hover::after { transform: translateX(110%); }
.rc-icon {
  width: 22px; height: 22px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.30);
}
.rc-label { flex: 1; text-align: left; }
.rc-arrow {
  display: inline-flex; align-items: center;
  transition: transform .35s var(--ssd-spring);
}
.rail-cta:hover .rc-arrow { transform: translate(2px, -2px); }
[data-theme="light"] .rail-cta {
  color: #fff;
  background: linear-gradient(135deg, #fbbf24, #f59e0b 55%, #ea580c);
}
[data-theme="light"] .rc-icon {
  background: rgba(255, 255, 255, 0.28);
}

/* ─── Mobile / narrow ─── */
@media (max-width: 1020px) {
  .ssd-rail {
    position: relative; top: auto;
    width: 100%;
    padding: 14px 14px 12px;
  }
  .rail-divider { display: none; }
  .rail-vine { display: none; }
  .rail-track {
    flex-direction: row; flex-wrap: nowrap;
    overflow-x: auto; overflow-y: hidden;
    padding-bottom: 4px;
    gap: 8px;
  }
  .rail-stop {
    grid-template-columns: 32px 1fr;
    grid-template-rows: auto;
    gap: 8px; padding: 9px 12px;
    min-width: 200px; flex-shrink: 0;
  }
  .stop-node { width: 32px; height: 32px; }
  .stop-chevron { display: none; }
}
</style>
