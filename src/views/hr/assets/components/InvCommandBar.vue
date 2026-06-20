<template>
  <div class="cb">
    <div class="cb-count">
      <span class="cb-count-num as-mono"><AssetCountUp :value="resultCount" :duration="0.7" /></span>
      <span class="cb-count-lab">{{ resultCount === 1 ? 'asset' : 'assets' }}<i v-if="filtered"> · filtered</i></span>
      <span v-if="loading" class="cb-pip" aria-hidden="true" />
    </div>

    <div class="cb-search" :class="{ active: focused }">
      <Search :size="15" />
      <input :value="search" @input="$emit('update:search', $event.target.value)"
        @focus="focused = true" @blur="focused = false"
        placeholder="Search code, serial, model, brand, tag…" />
      <button v-if="search" class="cb-clear" title="Clear" @click="$emit('update:search', '')"><X :size="13" /></button>
      <span class="cb-laser" aria-hidden="true" />
    </div>

    <!-- sort -->
    <button ref="sortTrigger" class="cb-sort" :class="{ open: sortOpen }" @click="toggleSort">
      <ArrowDownUp :size="14" />
      <span class="cb-sort-lab">{{ sort.label }}</span>
      <ChevronDown :size="13" class="cb-caret" />
    </button>

    <!-- view toggle -->
    <div class="cb-view" role="tablist">
      <span class="cb-view-thumb" :style="{ transform: `translateX(${view === 'manifest' ? 100 : 0}%)` }" aria-hidden="true" />
      <button class="cb-view-btn" :class="{ on: view === 'bay' }" @click="$emit('update:view', 'bay')" title="Bay grid"><LayoutGrid :size="15" /></button>
      <button class="cb-view-btn" :class="{ on: view === 'manifest' }" @click="$emit('update:view', 'manifest')" title="Manifest list"><List :size="15" /></button>
    </div>

    <Motion as="button" type="button" class="as-btn as-btn-primary cb-reg"
      :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('register')">
      <Plus :size="15" /> Register
    </Motion>

    <!-- teleported sort popover (escapes any transformed ancestor / stacking context) -->
    <Teleport to="body">
      <Transition name="cb-pop">
        <div v-if="sortOpen" class="cb-menu" :style="menuStyle" @mousedown.stop @click.stop>
          <button v-for="o in options" :key="o.id" class="cb-opt" :class="{ on: o.id === sort.id }" @click="pick(o)">
            <component :is="o.icon" :size="14" />
            <span>{{ o.label }}</span>
            <Check v-if="o.id === sort.id" :size="14" class="cb-opt-tick" />
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { Search, X, ArrowDownUp, ChevronDown, LayoutGrid, List, Plus, Check } from 'lucide-vue-next'
import AssetCountUp from './AssetCountUp.vue'

const props = defineProps({
  search: { type: String, default: '' },
  sort: { type: Object, required: true },
  options: { type: Array, required: true },
  view: { type: String, default: 'bay' },
  resultCount: { type: Number, default: 0 },
  filtered: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:search', 'update:sort', 'update:view', 'register'])

const focused = ref(false)
const sortOpen = ref(false)
const sortTrigger = ref(null)
const menuStyle = ref({})

function recalc() {
  const el = sortTrigger.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const width = 218
  let left = r.right - width
  left = Math.max(10, Math.min(left, window.innerWidth - width - 10))
  menuStyle.value = { top: `${r.bottom + 8}px`, left: `${left}px`, width: `${width}px` }
}
function toggleSort() {
  sortOpen.value = !sortOpen.value
  if (sortOpen.value) {
    recalc()
    window.addEventListener('resize', recalc)
    window.addEventListener('scroll', recalc, true)
    document.addEventListener('mousedown', onDocDown)
  } else closeSort()
}
function closeSort() {
  sortOpen.value = false
  window.removeEventListener('resize', recalc)
  window.removeEventListener('scroll', recalc, true)
  document.removeEventListener('mousedown', onDocDown)
}
function onDocDown(e) {
  if (sortTrigger.value && sortTrigger.value.contains(e.target)) return
  closeSort()
}
function pick(o) { emit('update:sort', o); closeSort() }
onBeforeUnmount(closeSort)
</script>

<style scoped>
.cb { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }

.cb-count { display: flex; align-items: baseline; gap: 7px; padding-right: 4px; }
.cb-count-num { font-size: 20px; font-weight: 850; color: var(--as-text); }
.cb-count-lab { font-size: 11.5px; color: var(--as-text-muted); }
.cb-count-lab i { color: var(--as-amber); font-style: normal; font-weight: 600; }
.cb-pip { width: 7px; height: 7px; border-radius: 50%; background: var(--as-amber); box-shadow: 0 0 8px var(--as-amber); animation: as-bay-pulse 0.9s ease-in-out infinite; }

.cb-search { position: relative; flex: 1; min-width: 220px; display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 12px;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); color: var(--as-text-dim); transition: border-color 0.25s, box-shadow 0.25s; }
.cb-search.active { border-color: color-mix(in srgb, var(--as-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-amber) 12%, transparent); }
.cb-search input { flex: 1; border: none; background: none; outline: none; font: inherit; font-size: 13.5px; color: var(--as-text); }
.cb-clear { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; border: none; cursor: pointer; color: var(--as-text-muted); background: var(--as-surface-elevated); }
.cb-clear:hover { color: var(--as-text); }
.cb-laser { position: absolute; left: 10px; right: 10px; bottom: 4px; height: 1.5px; border-radius: 2px; transform: scaleX(0); transform-origin: left; opacity: 0;
  background: linear-gradient(90deg, transparent, var(--as-amber), transparent); }
.cb-search.active .cb-laser { opacity: 1; animation: cb-laser-sweep 1.4s var(--as-ease) infinite; }
@keyframes cb-laser-sweep { 0% { transform: scaleX(0); transform-origin: left; } 50% { transform: scaleX(1); transform-origin: left; } 50.01% { transform-origin: right; } 100% { transform: scaleX(0); transform-origin: right; } }

.cb-sort { display: inline-flex; align-items: center; gap: 7px; padding: 9px 12px; border-radius: 11px; cursor: pointer; font: inherit; font-size: 13px;
  color: var(--as-text-secondary); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s; }
.cb-sort:hover, .cb-sort.open { color: var(--as-text); border-color: var(--as-border-strong); }
.cb-sort-lab { white-space: nowrap; }
.cb-caret { transition: transform 0.25s var(--as-spring); color: var(--as-text-dim); }
.cb-sort.open .cb-caret { transform: rotate(180deg); }

.cb-view { position: relative; display: inline-flex; padding: 3px; border-radius: 11px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.cb-view-thumb { position: absolute; top: 3px; left: 3px; width: calc((100% - 6px) / 2); bottom: 3px; border-radius: 8px;
  background: var(--hr-gradient-hero, linear-gradient(135deg, #fbbf24, #f59e0b)); box-shadow: 0 4px 12px -4px rgba(251,146,60,0.5); transition: transform 0.32s var(--as-spring); }
.cb-view-btn { position: relative; z-index: 1; display: grid; place-items: center; width: 34px; height: 28px; border: none; background: transparent; cursor: pointer; color: var(--as-text-muted); transition: color 0.25s; }
.cb-view-btn.on { color: #1a1206; }
[data-theme="light"] .cb-view-btn.on { color: #2a1a06; }

.cb-reg { flex-shrink: 0; }

/* teleported menu */
.cb-menu { position: fixed; z-index: 4000; padding: 6px; border-radius: 13px; display: flex; flex-direction: column; gap: 2px;
  background: var(--as-glass-deep); border: 1px solid var(--as-border-strong); box-shadow: var(--as-glass-shadow); backdrop-filter: var(--as-glass-blur); }
.cb-opt { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 13px; text-align: left;
  background: transparent; border: none; color: var(--as-text-secondary); transition: all 0.16s; }
.cb-opt:hover { background: var(--as-surface-elevated); color: var(--as-text); }
.cb-opt.on { color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 12%, transparent); }
.cb-opt span { flex: 1; }
.cb-opt-tick { color: var(--as-amber); }

.cb-pop-enter-active, .cb-pop-leave-active { transition: opacity 0.2s var(--as-ease), transform 0.2s var(--as-ease); }
.cb-pop-enter-from, .cb-pop-leave-to { opacity: 0; transform: translateY(-8px) scale(0.97); }

@media (max-width: 640px) {
  .cb-sort-lab { display: none; }
  .cb-count { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .cb-search.active .cb-laser, .cb-pip { animation: none; }
}
</style>
