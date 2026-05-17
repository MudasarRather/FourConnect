<template>
  <aside ref="railEl" class="hr-rail" :class="{ collapsed }">
    <!-- Header with collapse toggle -->
    <header class="rail-head">
      <div v-if="!collapsed" class="rail-head-title">
        <span class="head-mark">
          <span class="mark-bar" />
          <span class="mark-bar" />
          <span class="mark-bar" />
        </span>
        <span class="head-text">{{ title || 'Employees' }}</span>
      </div>
      <button
        type="button"
        class="rail-collapse"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="$emit('toggle-collapsed')"
      >
        <svg viewBox="0 0 10 10" :class="{ flipped: collapsed }" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6.5,1.5 2,5 6.5,8.5" />
        </svg>
      </button>
    </header>

    <!-- Item list — single flat list with section dividers -->
    <nav class="rail-nav" ref="groupsEl">
      <template v-for="(group, gi) in groups" :key="gi">
        <header v-if="!collapsed" class="group-head">
          <span class="group-num">{{ String(gi + 1).padStart(2, '0') }}</span>
          <span class="group-label">{{ group.title }}</span>
          <span class="group-rule" />
        </header>
        <ul class="group-items">
          <li v-for="item in group.items" :key="item.key">
            <button
              type="button"
              :ref="(el) => setItemRef(item.key, el)"
              class="rail-item"
              :class="{ active: item.key === modelValue }"
              :title="collapsed ? item.label : ''"
              @mouseenter="onItemHover($event, item.key)"
              @mouseleave="onItemLeave"
              @click="onSelect(item.key)"
            >
              <span class="item-bar" aria-hidden="true" />
              <span class="ic-wrap">
                <component :is="item.icon" :size="15" :stroke-width="item.key === modelValue ? 2.2 : 1.7" />
              </span>
              <span v-if="!collapsed" class="lbl">{{ item.label }}</span>
              <span
                v-if="!collapsed && item.count != null"
                class="count-badge"
              >{{ item.count }}</span>
            </button>
          </li>
        </ul>
      </template>

      <!-- Hover preview indicator (subtle ghost on hover) -->
      <span class="rail-hover-ghost" :style="hoverGhostStyle" aria-hidden="true" />
    </nav>

    <!-- Recent footer -->
    <footer v-if="!collapsed && recent.length" class="rail-recent">
      <div class="recent-label">
        <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="8" cy="8" r="6" /><polyline points="8,4.5 8,8 10.5,9.5" />
        </svg>
        <span>Recently viewed</span>
      </div>
      <ul class="recent-list">
        <li v-for="r in recent" :key="r.id">
          <button class="recent-item" @click="$emit('open-recent', r.id)">
            <span class="recent-avatar" :style="{ background: avatarColor(r) }">{{ initials(r) }}</span>
            <span class="recent-text">
              <span class="recent-name">{{ r.full_name || '—' }}</span>
              <span class="recent-meta">{{ r.employee_id }}</span>
            </span>
            <span class="recent-arrow">
              <svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3,1 7,5 3,9" />
              </svg>
            </span>
          </button>
        </li>
      </ul>
    </footer>
  </aside>
</template>

<script setup>
import { ref, nextTick, watch, onMounted } from 'vue'

const props = defineProps({
  modelValue: { type: String, required: true },
  groups: { type: Array, required: true },
  collapsed: { type: Boolean, default: false },
  title: { type: String, default: 'Employees' },
  recent: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'select', 'toggle-collapsed', 'open-recent'])

const railEl = ref(null)
const groupsEl = ref(null)
const itemRefs = ref({})
const hoverGhostStyle = ref({ opacity: 0, transform: 'translateY(0)', height: '0px' })

const setItemRef = (key, el) => {
  if (el) itemRefs.value[key] = el
  else delete itemRefs.value[key]
}

const onSelect = (key) => {
  emit('update:modelValue', key)
  emit('select', key)
}

const onItemHover = (event, key) => {
  if (key === props.modelValue) return
  const el = event.currentTarget
  const wrap = groupsEl.value
  if (!el || !wrap) return
  const elRect = el.getBoundingClientRect()
  const wrapRect = wrap.getBoundingClientRect()
  hoverGhostStyle.value = {
    opacity: 1,
    transform: `translateY(${elRect.top - wrapRect.top + wrap.scrollTop}px)`,
    height: `${elRect.height}px`,
  }
}
const onItemLeave = () => {
  hoverGhostStyle.value = { ...hoverGhostStyle.value, opacity: 0 }
}

const initials = (r) => {
  const s = r.full_name || r.email || '?'
  return s.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}
const avatarColor = (r) => {
  const s = String(r.id || r.employee_id || '')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xfff
  return `hsl(${h % 360}, 50%, 30%)`
}
</script>

<style scoped>
.hr-rail {
  width: 248px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  /* Pin the rail to the viewport. Without `sticky` the rail flex-grows to
     match a long canvas (e.g. the History timeline) and gets unusable.
     128px is the top-nav (52) + workspace breadcrumb/title rows; the rail
     starts just below them and never extends past the viewport bottom. */
  position: sticky;
  top: 128px;
  align-self: flex-start;
  max-height: calc(100vh - 144px);
  margin: 6px 18px 6px 0;
  border-radius: 18px;
  background:
    linear-gradient(180deg,
      rgba(28, 28, 32, 0.55) 0%,
      rgba(18, 18, 22, 0.55) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.04) inset,
    0 24px 48px -28px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  transition: width 320ms var(--hr-spring);
  overflow: hidden;
  z-index: 4;
}
/* Soft inner gold accent along the leading edge */
.hr-rail::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    linear-gradient(180deg,
      rgba(251, 191, 36, 0.10) 0%,
      transparent 24%,
      transparent 76%,
      rgba(251, 146, 60, 0.06) 100%);
  opacity: 0.7;
  mix-blend-mode: screen;
}
.hr-rail.collapsed { width: 70px; }

/* ──────────── Header ──────────── */
.rail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 10px;
  position: relative;
  z-index: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 2px;
}
.rail-head-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  font-weight: 800;
  color: var(--hr-text);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.head-mark {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  width: 14px;
  align-items: flex-start;
}
.mark-bar {
  display: block;
  height: 2px;
  background: var(--hr-accent-gold);
  border-radius: 999px;
  transition: width 320ms var(--hr-spring), background 220ms;
}
.mark-bar:nth-child(1) { width: 14px; }
.mark-bar:nth-child(2) { width: 9px; }
.mark-bar:nth-child(3) { width: 5px; background: var(--hr-orange); }
.head-text { letter-spacing: 1.4px; }

.rail-collapse {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: transparent;
  color: var(--hr-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms var(--hr-spring);
}
.rail-collapse:hover {
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.03);
  color: var(--hr-text);
}
.rail-collapse svg { transition: transform 280ms var(--hr-spring); }
.rail-collapse svg.flipped { transform: rotate(180deg); }

/* ──────────── Nav ──────────── */
.rail-nav {
  flex: 1;
  position: relative;
  /* Keep scroll capability for very small viewports but hide the scrollbar
     visually — the user does not want an inner-scrollbar artifact. */
  overflow-y: auto;
  padding: 6px 10px 14px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.rail-nav::-webkit-scrollbar { width: 0; height: 0; display: none; }

/* Group headers with mission-control flair */
.group-head {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 10px 4px 5px;
}
.group-num {
  font-family: var(--hr-mono);
  font-size: 9.5px;
  font-weight: 700;
  color: var(--hr-orange);
  letter-spacing: 0.5px;
}
.group-label {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--hr-text-muted);
  text-transform: uppercase;
  letter-spacing: 1.4px;
}
.group-rule {
  height: 1px;
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.04) 40%,
    transparent 100%);
}

.group-items {
  list-style: none;
  padding: 0;
  margin: 0 0 2px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

/* ──────────── Item ──────────── */
.rail-item {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  height: 34px;
  padding: 0 8px 0 12px;
  background: transparent;
  border: 0;
  border-radius: 10px;
  color: var(--hr-text-muted);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: color 240ms var(--hr-spring), background 200ms var(--hr-spring);
  font-family: inherit;
  letter-spacing: 0.1px;
  text-align: left;
}
.rail-item:hover { color: var(--hr-text); background: rgba(255, 255, 255, 0.02); }
.rail-item.active {
  color: var(--hr-text);
  font-weight: 600;
  background:
    linear-gradient(90deg,
      rgba(251, 191, 36, 0.10) 0%,
      rgba(251, 191, 36, 0.04) 70%,
      transparent 100%);
}

/* The 2px gold bar on the LEFT of the active item — Awwwards-style */
.item-bar {
  position: absolute;
  left: -10px;
  top: 50%;
  width: 2px;
  height: 0;
  background: linear-gradient(180deg, var(--hr-accent-gold), var(--hr-orange));
  border-radius: 0 2px 2px 0;
  transform: translateY(-50%);
  transition: height 320ms var(--hr-spring);
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.45);
}
.rail-item.active .item-bar { height: 20px; }
.rail-item:hover:not(.active) .item-bar { height: 10px; opacity: 0.45; }

.ic-wrap {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  transition: color 220ms var(--hr-spring), transform 220ms var(--hr-spring);
}
/* Force every icon to render at an identical box so label x-position is
   pixel-consistent across rows regardless of the icon glyph's visual width. */
.ic-wrap :deep(svg) {
  width: 15px;
  height: 15px;
  display: block;
  flex-shrink: 0;
}
.rail-item.active .ic-wrap { color: var(--hr-accent-gold); }

.lbl {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transform: translateX(0);
  transition: transform 280ms var(--hr-spring);
}
.rail-item.active .lbl { transform: translateX(2px); }

.count-badge {
  font-family: var(--hr-mono);
  font-size: 10px;
  font-weight: 600;
  color: var(--hr-text-dim);
  padding: 0 4px;
  letter-spacing: 0.5px;
  transition: color 220ms var(--hr-spring);
}
.rail-item.active .count-badge { color: var(--hr-accent-gold); }
.rail-item:hover .count-badge { color: var(--hr-text-secondary); }

/* Hover ghost — deliberately suppressed; the per-item hover background
   already handles the visual cue. Kept in the DOM for backwards-compat. */
.rail-hover-ghost {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
  opacity: 0;
  display: none;
}

/* Collapsed state */
.hr-rail.collapsed .rail-item { padding: 0; justify-content: center; height: 38px; }
.hr-rail.collapsed .group-head { padding: 6px 0 4px; justify-content: center; }
.hr-rail.collapsed .group-num { display: none; }
.hr-rail.collapsed .group-label { display: none; }
.hr-rail.collapsed .group-rule { width: 18px; margin: 0 auto; grid-column: 1 / -1; }
.hr-rail.collapsed .head-text { display: none; }

/* ──────────── Recent footer ──────────── */
.rail-recent {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding: 12px 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  z-index: 1;
}
.recent-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px 4px;
  font-size: 9.5px;
  font-weight: 700;
  color: var(--hr-text-muted);
  text-transform: uppercase;
  letter-spacing: 1.2px;
}
.recent-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 8px;
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  color: var(--hr-text-secondary);
  transition: background 180ms var(--hr-spring),
              padding 220ms var(--hr-spring);
  font-family: inherit;
}
.recent-item:hover {
  background: rgba(255, 255, 255, 0.025);
  color: var(--hr-text);
  padding-left: 10px;
}
.recent-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: 0;
}
.recent-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.recent-name {
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recent-meta {
  font-size: 9.5px;
  color: var(--hr-text-dim);
  font-family: var(--hr-mono);
  letter-spacing: 0.4px;
}
.recent-arrow {
  color: var(--hr-text-dim);
  opacity: 0;
  transform: translateX(-4px);
  transition: all 220ms var(--hr-spring);
}
.recent-item:hover .recent-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--hr-accent-gold);
}

@media (prefers-reduced-motion: reduce) {
  .item-bar, .ic-wrap, .lbl, .recent-arrow, .recent-item, .rail-hover-ghost {
    transition: none !important;
    transform: none !important;
  }
}
</style>
