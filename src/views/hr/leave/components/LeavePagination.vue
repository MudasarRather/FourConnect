<template>
  <!--
    LeavePagination — ultra-modern pager shared by the four admin leave sections.
    Distinctive features (different from the self-service /user/self-service/leave pager):
      1. A perspective 3D carousel of page tiles (active tile zooms forward,
         neighbours tilt back via rotateY).
      2. A page-size chip cluster (not a sliding pill) with hover lift.
      3. A direct "jump to" input — admins triaging 100s of rows hit this hard.
      4. A scrub rail that appears only when totalPages > 8, with a glowing
         orb the user can click to land directly on a position.
  -->
  <Motion v-if="visible" as="div" class="lp"
    :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
  >
    <!-- Decorative ambient flair -->
    <span class="lp-glow" />
    <span class="lp-grid" />

    <!-- ── ROW 1 — range readout + jump-to + page-size cluster ── -->
    <header class="lp-top">
      <div class="lp-range">
        <span class="lp-led" />
        <span class="lp-range-eye leave-mono">SHOWING</span>
        <strong class="lp-range-num leave-mono">{{ rangeLabel }}</strong>
        <span class="lp-range-sep">·</span>
        <span class="lp-range-meta leave-mono">{{ totalItems }} total</span>
      </div>

      <div class="lp-right">
        <!-- Quick jump -->
        <label class="lp-jump">
          <Crosshair :size="11" />
          <input
            type="number"
            v-model.number="jumpInput"
            :min="1"
            :max="totalPages"
            @keydown.enter.prevent="commitJump"
            @blur="commitJump"
            placeholder="#"
            aria-label="Jump to page"
          />
          <span class="lp-jump-of leave-mono">/ {{ totalPages }}</span>
        </label>

        <!-- Page-size chip cluster -->
        <div class="lp-size">
          <span class="lp-size-lbl leave-mono">per page</span>
          <div class="lp-size-cluster">
            <Motion v-for="(n, i) in pageSizeOptions" :key="n" as="button" type="button"
              class="lp-size-btn"
              :class="{ active: pageSize === n }"
              :initial="{ opacity: 0, y: 6 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.35, delay: 0.1 + i * 0.05, ease: [0.34, 1.56, 0.64, 1] }"
              :whileHover="{ y: -2, scale: 1.05 }"
              :whileTap="{ scale: 0.94 }"
              @click="$emit('update:pageSize', n)"
            >{{ n }}</Motion>
          </div>
        </div>
      </div>
    </header>

    <!-- ── ROW 2 — 3D carousel ── -->
    <div class="lp-stage">
      <button class="lp-arrow lp-arrow-prev"
        :disabled="page <= 1"
        @click="go(page - 1)"
        aria-label="Previous page"
      >
        <ChevronLeft :size="14" />
        <span class="lp-arrow-glow" />
      </button>

      <div class="lp-track">
        <!--
          Plain button (not <Motion>): the full 3D transform lives in :style.
          motion-v's whileHover would replace `transform` with just `scale`,
          dropping the translateX/rotateY and snapping the tile onto the centre
          one. Hover scale is folded into tileStyle() instead so the whole
          transform stays in one place.
        -->
        <button v-for="(p, i) in carouselPages" :key="`car-${p}`" type="button"
          class="lp-tile"
          :class="{ active: p === page }"
          :style="tileStyle(i, p)"
          @mouseenter="hovered = i"
          @mouseleave="hovered = -1"
          @click="go(p)"
        >
          <span class="lp-tile-num leave-mono">{{ p }}</span>
          <span v-if="p === page" class="lp-tile-glow" />
          <span v-if="p === page" class="lp-tile-orbit" />
          <span v-if="p === page" class="lp-tile-pulse" />
        </button>
      </div>

      <button class="lp-arrow lp-arrow-next"
        :disabled="page >= totalPages"
        @click="go(page + 1)"
        aria-label="Next page"
      >
        <ChevronRight :size="14" />
        <span class="lp-arrow-glow" />
      </button>
    </div>

    <!-- ── ROW 3 — scrub rail (only when there's enough pages to bother) ── -->
    <div v-if="totalPages > 8" class="lp-scrub" ref="scrubRef"
      @mousedown="onScrubDown"
    >
      <span class="lp-scrub-track" />
      <span class="lp-scrub-fill" :style="{ width: scrubPct + '%' }" />
      <!-- Per-page mini-ticks evenly spaced; show only major ticks if many pages -->
      <span v-for="t in scrubTicks" :key="`tk-${t}`"
        class="lp-scrub-tick"
        :class="{ major: t === 1 || t === totalPages, current: t === page }"
        :style="{ left: ((t - 1) / Math.max(1, totalPages - 1)) * 100 + '%' }"
      />
      <span class="lp-scrub-orb" :style="{ left: scrubPct + '%' }">
        <span class="lp-scrub-orb-core" />
        <span class="lp-scrub-orb-ring" />
      </span>
      <!-- Page-number tooltip while dragging -->
      <transition name="lp-tip">
        <span v-if="scrubDragging" class="lp-scrub-tip leave-mono"
          :style="{ left: scrubPct + '%' }"
        >{{ page }}</span>
      </transition>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { ChevronLeft, ChevronRight, Crosshair } from 'lucide-vue-next'

const props = defineProps({
  /** Current page (1-indexed). */
  page: { type: Number, required: true },
  /** Items per page. */
  pageSize: { type: Number, required: true },
  /** Total items across the dataset. */
  totalItems: { type: Number, required: true },
  /** Page-size chip options. */
  pageSizeOptions: { type: Array, default: () => [10, 25, 50, 100] },
  /**
   * When true, the pager stays mounted as long as the dataset exceeds the
   * SMALLEST page-size option — even if the currently-selected size happens to
   * fit everything on one page. Without this, picking a large size makes the
   * whole control (including the size chips) disappear with no way back.
   */
  persistOnFit: { type: Boolean, default: false },
})
const emit = defineEmits(['update:page', 'update:pageSize'])

// Visibility floor: normally hide once everything fits the current page; with
// persistOnFit, hide only once everything fits the smallest selectable size.
const visible = computed(() => {
  const floor = props.persistOnFit
    ? Math.min(...props.pageSizeOptions)
    : props.pageSize
  return props.totalItems > floor
})

// ─────────────────────────────────────────────────────────────────────
// Derived state
// ─────────────────────────────────────────────────────────────────────
const totalPages = computed(() =>
  Math.max(1, Math.ceil(props.totalItems / props.pageSize)),
)
const rangeLabel = computed(() => {
  if (!props.totalItems) return '0'
  const start = (props.page - 1) * props.pageSize + 1
  const end = Math.min(props.totalItems, start + props.pageSize - 1)
  return `${start}–${end}`
})

// Carousel — render up to 7 page tiles centred on the active page.
// Clamps the window so we never overflow page 1 / totalPages.
const CAROUSEL_HALF = 3
const carouselPages = computed(() => {
  const t = totalPages.value
  let start = Math.max(1, props.page - CAROUSEL_HALF)
  let end = Math.min(t, start + CAROUSEL_HALF * 2)
  start = Math.max(1, end - CAROUSEL_HALF * 2)
  const out = []
  for (let i = start; i <= end; i++) out.push(i)
  return out
})
const centerIndex = computed(() => {
  const idx = carouselPages.value.indexOf(props.page)
  return idx === -1 ? Math.floor(carouselPages.value.length / 2) : idx
})

// Perspective math — tiles further from centre shrink, fade, and tilt back.
const tileScale = (offset) => Math.max(0.55, 1 - Math.abs(offset) * 0.14)
const tileOpacity = (offset) => Math.max(0.38, 1 - Math.abs(offset) * 0.20)

// Hover state — the whole transform (position + tilt + hover lift) is built
// here so nothing fights the inline style. Hovered tile also rises above its
// neighbours so it can't paint underneath them.
const hovered = ref(-1)
const tileStyle = (i, p) => {
  const off = i - centerIndex.value
  const lift = hovered.value === i ? 1.07 : 1
  return {
    transform: `translateX(${off * 56}px) scale(${tileScale(off) * lift}) rotateY(${off * -14}deg)`,
    opacity: tileOpacity(off),
    zIndex: hovered.value === i ? 20 : (p === props.page ? 15 : 10 - Math.abs(off)),
  }
}

// ─────────────────────────────────────────────────────────────────────
// Page navigation
// ─────────────────────────────────────────────────────────────────────
const clamp = (n) => Math.max(1, Math.min(totalPages.value, Number(n) || 1))
const go = (n) => {
  const next = clamp(n)
  if (next === props.page) return
  emit('update:page', next)
}

// ─────────────────────────────────────────────────────────────────────
// Jump-to input — debounced commit on Enter / blur
// ─────────────────────────────────────────────────────────────────────
const jumpInput = ref(null)
watch(() => props.page, (p) => { jumpInput.value = null }, { immediate: true })
const commitJump = () => {
  if (jumpInput.value == null || jumpInput.value === '') return
  const n = clamp(jumpInput.value)
  jumpInput.value = null
  go(n)
}

// ─────────────────────────────────────────────────────────────────────
// Scrub rail — click + drag to land on any page
// ─────────────────────────────────────────────────────────────────────
const scrubRef = ref(null)
const scrubDragging = ref(false)
const scrubPct = computed(() => {
  if (totalPages.value <= 1) return 0
  return ((props.page - 1) / (totalPages.value - 1)) * 100
})
// Render ≤16 ticks even when there are 200+ pages so the rail stays clean.
const scrubTicks = computed(() => {
  const t = totalPages.value
  if (t <= 16) return Array.from({ length: t }, (_, i) => i + 1)
  const step = Math.max(1, Math.floor(t / 14))
  const out = [1]
  for (let i = step; i < t; i += step) out.push(i)
  if (out[out.length - 1] !== t) out.push(t)
  return out
})

const pageFromClientX = (clientX) => {
  const el = scrubRef.value
  if (!el) return props.page
  const rect = el.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  return clamp(1 + Math.round(ratio * (totalPages.value - 1)))
}
const onScrubMove = (e) => {
  if (!scrubDragging.value) return
  go(pageFromClientX(e.clientX))
}
const onScrubUp = () => {
  scrubDragging.value = false
  window.removeEventListener('mousemove', onScrubMove)
  window.removeEventListener('mouseup', onScrubUp)
}
const onScrubDown = (e) => {
  scrubDragging.value = true
  go(pageFromClientX(e.clientX))
  window.addEventListener('mousemove', onScrubMove)
  window.addEventListener('mouseup', onScrubUp)
}
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onScrubMove)
  window.removeEventListener('mouseup', onScrubUp)
})
</script>

<style scoped>
/* ════════════════════════════════════════════════════════════════════════════
   SHELL — glass panel with drifting gold flare
   ════════════════════════════════════════════════════════════════════════════ */
.lp {
  position: relative;
  display: flex; flex-direction: column; gap: 14px;
  margin-top: 18px;
  padding: 14px 18px 16px;
  border-radius: 20px;
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.14), transparent 65%),
    linear-gradient(180deg, rgba(28, 18, 10, 0.78), rgba(20, 14, 8, 0.86));
  border: 1px solid rgba(251, 191, 36, 0.28);
  box-shadow:
    0 22px 44px -24px rgba(120, 53, 15, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
  isolation: isolate;
}
[data-theme="light"] .lp {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.20), transparent 65%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 244, 218, 0.96));
  border-color: rgba(180, 83, 9, 0.22);
  box-shadow:
    0 18px 36px -22px rgba(120, 53, 15, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.lp-glow {
  position: absolute;
  inset: -40% -40% auto auto;
  width: 240px; height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.30), transparent 65%);
  filter: blur(46px);
  opacity: 0.7;
  pointer-events: none;
  z-index: 0;
  animation: lp-glow-drift 8s ease-in-out infinite;
}
@keyframes lp-glow-drift {
  0%, 100% { transform: translate(0, 0); opacity: 0.5; }
  50%      { transform: translate(-22px, 18px); opacity: 0.85; }
}
.lp-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(251, 191, 36, 0.06) 1px, transparent 1px);
  background-size: 18px 18px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.6), transparent 70%);
  opacity: 0.55;
  pointer-events: none;
  z-index: 0;
}
[data-theme="light"] .lp-grid {
  background-image: radial-gradient(rgba(180, 83, 9, 0.10) 1px, transparent 1px);
}

/* ════════════════════════════════════════════════════════════════════════════
   ROW 1 — top bar
   ════════════════════════════════════════════════════════════════════════════ */
.lp-top {
  position: relative; z-index: 2;
  display: flex; align-items: center; justify-content: space-between; gap: 18px;
  flex-wrap: wrap;
}

.lp-range {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11px; letter-spacing: 0.04em;
  color: var(--hr-text);
}
.lp-led {
  width: 7px; height: 7px; border-radius: 50%;
  background: #34d399; box-shadow: 0 0 8px #34d399;
  animation: lp-led 1.8s ease-in-out infinite;
}
@keyframes lp-led {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.4); }
}
.lp-range-eye {
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em;
  color: var(--hr-text-muted);
  text-transform: uppercase;
}
.lp-range-num {
  font-size: 16px; font-weight: 900; letter-spacing: -0.005em;
  background: linear-gradient(135deg, #fef3c7, #fbbf24 55%, #fb923c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  font-variant-numeric: tabular-nums;
}
[data-theme="light"] .lp-range-num {
  background: linear-gradient(135deg, #92400e, #b45309 60%, #c2410c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.lp-range-sep { color: rgba(251, 191, 36, 0.55); }
[data-theme="light"] .lp-range-sep { color: rgba(180, 83, 9, 0.45); }
.lp-range-meta {
  font-size: 10px; font-weight: 700;
  color: var(--hr-text-muted);
  letter-spacing: 0.06em;
}

.lp-right {
  display: inline-flex; align-items: center; gap: 14px; flex-wrap: wrap;
}

/* Jump-to input */
.lp-jump {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.30);
  transition: border-color .25s, background .25s, box-shadow .25s;
}
.lp-jump:focus-within {
  border-color: rgba(251, 146, 60, 0.65);
  background: rgba(251, 191, 36, 0.18);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.10);
}
[data-theme="light"] .lp-jump {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.24);
}
.lp-jump svg { color: #fbbf24; flex-shrink: 0; }
[data-theme="light"] .lp-jump svg { color: #b45309; }
.lp-jump > input {
  width: 44px;
  padding: 0;
  background: transparent;
  border: 0; outline: none;
  font: inherit; font-size: 12px; font-weight: 800;
  color: var(--hr-text);
  font-variant-numeric: tabular-nums;
  text-align: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  letter-spacing: 0.02em;
}
.lp-jump > input::-webkit-outer-spin-button,
.lp-jump > input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.lp-jump > input { -moz-appearance: textfield; }
.lp-jump > input::placeholder { color: var(--hr-text-muted); font-weight: 700; }
.lp-jump-of {
  font-size: 10px; font-weight: 700;
  color: var(--hr-text-muted);
  letter-spacing: 0.04em;
}

/* Page-size chip cluster */
.lp-size {
  display: inline-flex; align-items: center; gap: 8px;
}
.lp-size-lbl {
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--hr-text-muted);
}
.lp-size-cluster {
  display: inline-flex; gap: 4px;
}
.lp-size-btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 32px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-text-muted);
  font: inherit; font-size: 11px; font-weight: 800;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background .25s, border-color .25s, color .25s, box-shadow .25s;
}
.lp-size-btn:hover:not(.active) {
  background: rgba(251, 191, 36, 0.10);
  border-color: rgba(251, 146, 60, 0.45);
  color: var(--hr-text);
}
.lp-size-btn.active {
  background: linear-gradient(135deg, #fde68a, #fbbf24 40%, #fb923c);
  border-color: rgba(251, 146, 60, 0.85);
  color: #1f1408;
  box-shadow: 0 8px 18px -10px rgba(251, 146, 60, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
[data-theme="light"] .lp-size-btn {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.22);
  color: #6b5840;
}
[data-theme="light"] .lp-size-btn.active {
  background: linear-gradient(135deg, #fde68a, #fbbf24 40%, #fb923c);
  color: #1f1408;
}

/* ════════════════════════════════════════════════════════════════════════════
   ROW 2 — 3D carousel
   ════════════════════════════════════════════════════════════════════════════ */
.lp-stage {
  position: relative; z-index: 2;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 6px 0;
  perspective: 1100px;
  perspective-origin: 50% 50%;
}

.lp-arrow {
  position: relative;
  display: grid; place-items: center;
  width: 34px; height: 34px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: var(--hr-text);
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  transition: transform .25s cubic-bezier(0.34, 1.56, 0.64, 1), background .22s, border-color .22s, box-shadow .22s;
}
.lp-arrow:hover:not(:disabled) {
  transform: translateY(-2px);
  background: rgba(251, 191, 36, 0.16);
  border-color: rgba(251, 146, 60, 0.65);
  box-shadow: 0 10px 22px -10px rgba(251, 146, 60, 0.55);
}
.lp-arrow-prev:hover:not(:disabled) { transform: translateY(-2px) translateX(-2px); }
.lp-arrow-next:hover:not(:disabled) { transform: translateY(-2px) translateX(2px); }
.lp-arrow:disabled { opacity: 0.32; cursor: not-allowed; }
[data-theme="light"] .lp-arrow {
  background: rgba(255, 250, 240, 0.86);
  border-color: rgba(180, 83, 9, 0.24);
  color: #3a1f0b;
}
.lp-arrow-glow {
  position: absolute; inset: -1px;
  border-radius: inherit;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.35), transparent 65%);
  filter: blur(8px);
  opacity: 0;
  z-index: -1;
  transition: opacity .25s;
}
.lp-arrow:hover:not(:disabled) .lp-arrow-glow { opacity: 1; }

.lp-track {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  height: 56px;
  flex: 1;
  max-width: 480px;
  transform-style: preserve-3d;
}
.lp-tile {
  position: absolute;
  display: grid; place-items: center;
  width: 46px; height: 46px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.85), rgba(20, 14, 8, 0.92));
  border: 1px solid rgba(251, 191, 36, 0.32);
  color: var(--hr-text);
  font: inherit; font-size: 13px; font-weight: 800;
  cursor: pointer;
  overflow: visible;
  transform-origin: 50% 50%;
  transition:
    transform .55s cubic-bezier(0.16, 1, 0.3, 1),
    opacity .35s,
    background .25s,
    border-color .25s,
    box-shadow .35s;
  box-shadow: 0 10px 22px -12px rgba(0, 0, 0, 0.6);
  backface-visibility: hidden;
}
[data-theme="light"] .lp-tile {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.96), rgba(255, 244, 218, 0.98));
  border-color: rgba(180, 83, 9, 0.26);
}
.lp-tile-num {
  position: relative; z-index: 2;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.lp-tile.active {
  background: linear-gradient(135deg, #fde68a, #fbbf24 40%, #fb923c);
  border-color: rgba(251, 146, 60, 0.95);
  color: #1f1408;
  box-shadow:
    0 18px 38px -14px rgba(251, 146, 60, 0.85),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}
[data-theme="light"] .lp-tile.active {
  background: linear-gradient(135deg, #fde68a, #fbbf24 40%, #fb923c);
  border-color: rgba(180, 83, 9, 0.85);
  color: #1f1408;
}
.lp-tile-glow {
  position: absolute; inset: -8px;
  border-radius: 16px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.60), transparent 60%);
  filter: blur(14px);
  opacity: 0.85;
  z-index: 0;
  pointer-events: none;
  animation: lp-tile-glow 2.4s ease-in-out infinite;
}
@keyframes lp-tile-glow {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.10); }
}
.lp-tile-orbit {
  position: absolute; inset: -4px;
  border-radius: 14px;
  border: 1.5px solid rgba(251, 146, 60, 0.65);
  pointer-events: none;
  z-index: 1;
  animation: lp-tile-orbit 2.6s ease-out infinite;
}
@keyframes lp-tile-orbit {
  0%   { transform: scale(1);    opacity: 0.85; }
  100% { transform: scale(1.30); opacity: 0; }
}
.lp-tile-pulse {
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  width: 3px; height: 3px; border-radius: 50%;
  background: #1f1408;
  z-index: 1;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.55);
}

/* ════════════════════════════════════════════════════════════════════════════
   ROW 3 — scrub rail
   ════════════════════════════════════════════════════════════════════════════ */
.lp-scrub {
  position: relative;
  height: 24px;
  margin: 0 4px;
  cursor: pointer;
  user-select: none;
  z-index: 2;
}
.lp-scrub-track {
  position: absolute; left: 0; right: 0; top: 50%;
  transform: translateY(-50%);
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.20);
}
[data-theme="light"] .lp-scrub-track {
  background: rgba(180, 83, 9, 0.10);
  border-color: rgba(180, 83, 9, 0.22);
}
.lp-scrub-fill {
  position: absolute; left: 0; top: 50%;
  transform: translateY(-50%);
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, #fbbf24, #fb923c);
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.55);
  transition: width .35s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}
.lp-scrub-tick {
  position: absolute; top: 50%;
  transform: translate(-50%, -50%);
  width: 2px; height: 6px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.35);
  pointer-events: none;
}
.lp-scrub-tick.major {
  height: 10px;
  background: rgba(251, 191, 36, 0.65);
}
.lp-scrub-tick.current {
  height: 12px;
  background: #fbbf24;
  box-shadow: 0 0 6px #fbbf24;
}
[data-theme="light"] .lp-scrub-tick { background: rgba(180, 83, 9, 0.35); }
[data-theme="light"] .lp-scrub-tick.major { background: rgba(180, 83, 9, 0.65); }
[data-theme="light"] .lp-scrub-tick.current { background: #b45309; box-shadow: 0 0 6px rgba(180, 83, 9, 0.65); }

.lp-scrub-orb {
  position: absolute; top: 50%;
  width: 16px; height: 16px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: left .35s cubic-bezier(0.16, 1, 0.3, 1);
}
.lp-scrub-orb-core {
  position: absolute; inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fef3c7, #fbbf24 50%, #ea580c);
  border: 1.5px solid rgba(20, 14, 8, 0.95);
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.75);
}
[data-theme="light"] .lp-scrub-orb-core { border-color: rgba(255, 250, 240, 0.95); }
.lp-scrub-orb-ring {
  position: absolute; inset: -4px;
  border-radius: 50%;
  border: 1.5px solid rgba(251, 191, 36, 0.55);
  animation: lp-orb-ring 2.4s ease-out infinite;
  pointer-events: none;
}
@keyframes lp-orb-ring {
  0%   { transform: scale(1);    opacity: 0.85; }
  100% { transform: scale(1.6);  opacity: 0; }
}

.lp-scrub-tip {
  position: absolute; bottom: 100%;
  transform: translateX(-50%);
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(20, 14, 8, 0.96);
  border: 1px solid rgba(251, 191, 36, 0.55);
  color: #fde68a;
  font-size: 11px; font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 8px 18px -8px rgba(0, 0, 0, 0.7);
}
[data-theme="light"] .lp-scrub-tip {
  background: rgba(255, 250, 240, 0.97);
  border-color: rgba(180, 83, 9, 0.55);
  color: #92400e;
}
.lp-tip-enter-active, .lp-tip-leave-active {
  transition: opacity .2s, transform .25s cubic-bezier(0.16, 1, 0.3, 1);
}
.lp-tip-enter-from, .lp-tip-leave-to { opacity: 0; transform: translate(-50%, 4px); }

/* Responsive — stack rows under 720px */
@media (max-width: 720px) {
  .lp-top { flex-direction: column; align-items: stretch; gap: 12px; }
  .lp-right { justify-content: space-between; }
}

@media (prefers-reduced-motion: reduce) {
  .lp-led, .lp-tile-glow, .lp-tile-orbit, .lp-scrub-orb-ring, .lp-glow { animation: none !important; }
  .lp-tile, .lp-scrub-fill, .lp-scrub-orb { transition: none !important; }
}
</style>
