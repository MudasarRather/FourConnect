<template>
  <div ref="rootEl" class="hr-topbar" :class="{ stuck }">
    <!-- Top row: breadcrumb + brand dot + tour position -->
    <div class="row crumb-row">
      <div class="brand-cluster">
        <span class="brand-dot" />
        <span class="crumb-chip">HR</span>
        <span class="crumb-sep">›</span>
        <span class="crumb-chip">Employees</span>
        <span class="crumb-sep">›</span>
        <span class="crumb-chip current">{{ sectionLabel }}</span>
      </div>
      <div class="tour-cluster">
        <span class="tour-text">{{ tourPosition }} / {{ tourTotal }}</span>
        <span class="tour-dots">
          <span
            v-for="i in tourTotal"
            :key="i"
            class="tour-dot"
            :class="{ active: i === tourPosition }"
          />
        </span>
      </div>
    </div>

    <!-- Sentinel for stuck-shadow detection -->
    <span ref="sentinel" class="sticky-sentinel" aria-hidden="true" />

    <!-- Main row: section title + subtitle + action cluster -->
    <div class="row title-row">
      <div class="title-block">
        <h1 class="section-title">{{ sectionLabel }}</h1>
        <p v-if="sectionDescription" class="section-subtitle">{{ sectionDescription }}</p>
      </div>
      <div class="actions-cluster">
        <slot name="actions">
          <button
            ref="addBtn"
            type="button"
            class="cta-primary"
            @click="$emit('open-wizard')"
          >
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" />
            </svg>
            Add Employee
          </button>
        </slot>
      </div>
    </div>

    <!-- Ambient gradient strip -->
    <span class="ambient-strip" aria-hidden="true" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useMagnetic } from '../../composables/useMagnetic'

const props = defineProps({
  sectionLabel: { type: String, required: true },
  sectionDescription: { type: String, default: '' },
  tourPosition: { type: Number, default: 1 },
  tourTotal: { type: Number, default: 1 },
})
defineEmits(['open-wizard'])

const rootEl = ref(null)
const sentinel = ref(null)
const addBtn = ref(null)
const stuck = ref(false)

useMagnetic(addBtn, { strength: 0.22 })

let io = null
onMounted(() => {
  if (!sentinel.value) return
  io = new IntersectionObserver(
    ([entry]) => { stuck.value = !entry.isIntersecting },
    { threshold: [1.0], rootMargin: '0px 0px -100% 0px' }
  )
  io.observe(sentinel.value)
})
onBeforeUnmount(() => io?.disconnect())
</script>

<style scoped>
.hr-topbar {
  position: sticky;
  top: 52px; /* global top nav height */
  z-index: 12;
  background: transparent;
  border-bottom: 1px solid transparent;
  transition: background 220ms var(--hr-spring),
              border-color 220ms var(--hr-spring),
              backdrop-filter 220ms var(--hr-spring);
}
/* When the topbar sticks (page scrolled), gently fade in a transparent
   blur so the title stays readable against scrolling content — but no
   distinct rectangular background panel. */
.hr-topbar.stuck {
  background: linear-gradient(180deg, rgba(8, 8, 10, 0.42), rgba(8, 8, 10, 0.22) 75%, transparent);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  border-bottom-color: rgba(255, 255, 255, 0.04);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 28px;
}
.crumb-row {
  padding-top: 12px;
  padding-bottom: 6px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.04);
}
.title-row {
  padding-top: 12px;
  padding-bottom: 16px;
}

/* Brand & breadcrumb */
.brand-cluster {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.brand-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--hr-accent-gold);
  box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.6);
  animation: hr-pulse-dot-gold 2.4s ease-in-out infinite;
}
.crumb-chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--hr-border);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--hr-text-secondary);
  letter-spacing: 0.2px;
  transition: all 180ms var(--hr-spring);
}
.crumb-chip:not(.current):hover {
  transform: translateY(-1px);
  border-color: var(--hr-accent-gold-border);
  color: var(--hr-text);
}
.crumb-chip.current {
  background: var(--hr-accent-gold-soft);
  border-color: var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
  font-weight: 700;
}
.crumb-sep {
  color: var(--hr-text-dim);
  font-size: 10px;
  user-select: none;
}

/* Tour cluster */
.tour-cluster {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--hr-mono);
}
.tour-text {
  font-size: 10.5px;
  color: var(--hr-text-muted);
  letter-spacing: 0.5px;
}
.tour-dots { display: inline-flex; gap: 3px; }
.tour-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  transition: all 180ms var(--hr-spring);
}
.tour-dot.active {
  background: var(--hr-accent-gold);
  width: 14px;
  border-radius: 999px;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.6);
}

/* Sentinel for sticky-shadow detection */
.sticky-sentinel {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

/* Title row */
.title-block { flex: 1; min-width: 0; }
.section-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--hr-text);
  margin: 0;
  letter-spacing: -0.02em;
  background: linear-gradient(180deg, #ffffff 0%, #d4d4d8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.section-subtitle {
  font-size: 12px;
  color: var(--hr-text-muted);
  margin: 4px 0 0;
  line-height: 1.4;
}

.actions-cluster {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.cta-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 16px;
  background: var(--hr-gradient-rail-active);
  color: #1a1a1c;
  border: 0;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 220ms var(--hr-spring), box-shadow 220ms var(--hr-spring);
  box-shadow: 0 8px 20px -6px rgba(251, 146, 60, 0.5), var(--hr-accent-gold-glow);
  letter-spacing: 0.2px;
}
.cta-primary:hover {
  box-shadow: 0 12px 28px -6px rgba(251, 146, 60, 0.7), 0 0 36px rgba(251, 191, 36, 0.35);
}

/* Ambient gradient strip */
.ambient-strip {
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 1.5px;
  background: var(--hr-gradient-ambient);
  background-size: 200% 100%;
  opacity: 0.55;
  pointer-events: none;
  animation: hr-pan-gradient 12s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .brand-dot { animation: none; }
  .ambient-strip { animation: none; opacity: 0.3; }
}

@media (max-width: 900px) {
  .row { padding: 10px 16px; }
  .section-title { font-size: 18px; }
  .tour-cluster { display: none; }
}
</style>
