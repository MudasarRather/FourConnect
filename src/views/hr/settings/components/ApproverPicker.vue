<template>
  <!-- Searchable person picker for a "Specific person" (USER) approval stage.
       Stores the selected employee's USER id (approver_user_id) — that is what the
       leave/travel/claim approval engine compares against the acting user. -->
  <div ref="rootEl" class="ap" :class="{ open }" :style="{ '--acc': accentColor }">
    <button type="button" class="ap-trigger" @click="toggle">
      <span class="ap-face">
        <span class="ap-av" :class="{ ph: !selectedPerson }">
          <template v-if="selectedPerson">{{ initials(selectedLabel) }}</template>
          <User v-else :size="14" />
        </span>
        <span class="ap-id">
          <span class="ap-name" :class="{ ph: !modelValue }">{{ selectedLabel || placeholder }}</span>
          <span v-if="selectedSub" class="ap-sub">{{ selectedSub }}</span>
        </span>
      </span>
      <ChevronDown :size="15" class="ap-chev" :class="{ flip: open }" />
    </button>

    <teleport to="body">
      <Presence>
        <Motion v-if="open" key="pop" ref="popEl" as="div" class="ap-pop" :style="popStyle" @mousedown.stop
          :initial="{ opacity: 0, y: -8, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: -6, scale: 0.98 }" :transition="{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }">
          <span class="ap-pop-edge" aria-hidden="true" />
          <div class="ap-search">
            <Search :size="14" class="ap-search-ic" />
            <input ref="searchEl" v-model="query" class="ap-search-in" placeholder="Search people…" @input="onSearch" />
            <button v-if="query" type="button" class="ap-search-x" title="Clear" @click="clearSearch"><X :size="13" /></button>
          </div>

          <div v-if="loading" class="ap-state"><Loader2 :size="16" class="ap-spin" /> Loading people…</div>
          <ul v-else-if="people.length" class="ap-list" role="listbox">
            <Motion v-for="(p, i) in people" :key="p.user_id" as="li" role="option"
              class="ap-opt" :class="{ sel: String(p.user_id) === String(modelValue) }"
              :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.24, delay: Math.min(i * 0.025, 0.3), ease: [0.16, 1, 0.3, 1] }"
              @click="choose(p)">
              <span class="ap-opt-av">{{ initials(p.full_name) }}</span>
              <span class="ap-opt-body">
                <span class="ap-opt-name">{{ p.full_name || 'Unnamed' }}</span>
                <span v-if="subFor(p)" class="ap-opt-sub">{{ subFor(p) }}</span>
              </span>
              <Check v-if="String(p.user_id) === String(modelValue)" :size="14" class="ap-opt-check" />
            </Motion>
          </ul>
          <div v-else class="ap-state muted"><UserX :size="16" /> {{ query ? 'No one matches' : 'No people found' }}</div>
        </Motion>
      </Presence>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import axios from 'axios'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { ChevronDown, Check, Search, Loader2, User, UserX, X } from 'lucide-vue-next'
import { API } from '@/utils/api'

const props = defineProps({
  modelValue: { type: String, default: null },   // the selected approver's USER id
  accentColor: { type: String, default: 'var(--set-ember)' },
  placeholder: { type: String, default: 'Choose a person…' },
})
const emit = defineEmits(['update:modelValue', 'change'])

// ── shared directory (module-scoped so multiple pickers don't each refetch) ────
let _dirCache = null
let _dirPromise = null
const authHeader = () => {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}
async function fetchDirectory() {
  if (_dirCache) return _dirCache
  if (_dirPromise) return _dirPromise
  _dirPromise = axios.get(`${API}/hr/employees/`, { headers: authHeader(), params: { limit: 100, exclude_separated: true } })
    .then(r => { _dirCache = (r.data?.items || []).filter(e => e.user_id); return _dirCache })
    .catch(() => { _dirCache = []; return _dirCache })
    .finally(() => { _dirPromise = null })
  return _dirPromise
}
async function searchDirectory(q) {
  try {
    const r = await axios.get(`${API}/hr/employees/`, { headers: authHeader(), params: { search: q, limit: 50, exclude_separated: true } })
    return (r.data?.items || []).filter(e => e.user_id)
  } catch { return [] }
}

const rootEl = ref(null), popEl = ref(null), searchEl = ref(null)
const open = ref(false)
const popStyle = ref({})
const people = ref([])
const query = ref('')
const loading = ref(false)
const resolved = ref(null)   // resolved person object for the current modelValue

const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
const subFor = (p) => [p.designation_name, p.department_name].filter(Boolean).join(' · ')

const selectedPerson = computed(() => resolved.value && String(resolved.value.user_id) === String(props.modelValue) ? resolved.value : null)
const selectedLabel = computed(() => {
  if (!props.modelValue) return null
  return selectedPerson.value?.full_name || 'Selected approver'
})
const selectedSub = computed(() => selectedPerson.value ? subFor(selectedPerson.value) : '')

async function resolveSelected() {
  if (!props.modelValue) { resolved.value = null; return }
  const dir = await fetchDirectory()
  const hit = dir.find(e => String(e.user_id) === String(props.modelValue))
  if (hit) resolved.value = hit
}
onMounted(resolveSelected)
watch(() => props.modelValue, resolveSelected)

let searchTimer = null
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    loading.value = true
    const q = query.value.trim()
    people.value = q ? await searchDirectory(q) : await fetchDirectory()
    loading.value = false
  }, 250)
}
function clearSearch() { query.value = ''; onSearch() }

// ── popover positioning (teleported, fixed — escapes the relay's overflow) ─────
function place() {
  const t = rootEl.value
  if (!t) return
  const r = t.getBoundingClientRect()
  const below = window.innerHeight - r.bottom
  const openUp = below < 300 && r.top > below
  popStyle.value = {
    position: 'fixed',
    left: `${r.left}px`,
    width: `${Math.max(r.width, 240)}px`,
    ...(openUp ? { bottom: `${window.innerHeight - r.top + 6}px` } : { top: `${r.bottom + 6}px` }),
    zIndex: 5200,
  }
}
function onScroll() { if (open.value) place() }
function onDocDown(e) {
  if (rootEl.value?.contains(e.target)) return
  const pop = popEl.value?.$el || popEl.value
  if (pop?.contains?.(e.target)) return
  close()
}
function onKey(e) { if (e.key === 'Escape') close() }
function bind() {
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onScroll)
  document.addEventListener('mousedown', onDocDown)
  document.addEventListener('keydown', onKey)
}
function unbind() {
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', onScroll)
  document.removeEventListener('mousedown', onDocDown)
  document.removeEventListener('keydown', onKey)
}
function toggle() { open.value ? close() : openMenu() }
async function openMenu() {
  place(); open.value = true; bind()
  if (!people.value.length) {
    loading.value = true
    people.value = await fetchDirectory()
    loading.value = false
  }
  await nextTick()
  searchEl.value?.focus()
}
function close() { open.value = false; unbind() }
function choose(p) {
  resolved.value = p
  emit('update:modelValue', p.user_id)
  emit('change', { id: p.user_id, name: p.full_name })
  close()
}
onBeforeUnmount(unbind)
</script>

<style scoped>
.ap { position: relative; width: 100%; }
.ap-trigger { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;
  min-height: var(--hr-input-height, 42px); padding: 6px 12px; border-radius: 11px; cursor: pointer; font: inherit;
  color: var(--hr-input-text, var(--set-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border);
  transition: border-color 0.2s var(--set-spring), background 0.2s var(--set-spring), box-shadow 0.25s var(--set-spring); }
.ap-trigger:hover { border-color: var(--hr-input-border-hover, var(--set-border-strong)); }
.ap.open .ap-trigger { border-color: color-mix(in srgb, var(--acc) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--acc) 14%, transparent), 0 0 24px -10px var(--acc); }
.ap-face { display: inline-flex; align-items: center; gap: 9px; min-width: 0; }
.ap-av { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; font-size: 10.5px; font-weight: 850;
  color: #1a1206; background: linear-gradient(135deg, color-mix(in srgb, var(--acc) 86%, #fff), var(--acc)); }
.ap-av.ph { color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.ap-id { min-width: 0; display: flex; flex-direction: column; gap: 1px; text-align: left; }
.ap-name { font-size: 12.5px; font-weight: 650; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-name.ph { color: var(--hr-input-placeholder, var(--set-text-dim)); font-weight: 500; }
.ap-sub { font-size: 10px; color: var(--set-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-chev { color: var(--set-text-muted); flex-shrink: 0; transition: transform 0.28s var(--set-spring), color 0.2s; }
.ap-chev.flip { transform: rotate(180deg); color: var(--acc); }
</style>

<style>
/* Teleported popover — unscoped (lives on <body>, above the relay + modals). */
.ap-pop { --acc: var(--set-ember); position: relative; overflow: hidden; padding: 8px; border-radius: 14px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border-strong);
  box-shadow: 0 30px 70px -30px rgba(0, 0, 0, 0.86), 0 0 0 1px color-mix(in srgb, var(--acc) 10%, transparent);
  backdrop-filter: blur(18px) saturate(140%); -webkit-backdrop-filter: blur(18px) saturate(140%); }
.ap-pop-edge { position: absolute; left: 0; right: 0; top: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--acc), transparent); }
.ap-search { display: flex; align-items: center; gap: 7px; padding: 7px 10px; margin-bottom: 6px; border-radius: 10px;
  background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.ap-search-ic { color: var(--set-text-muted); flex-shrink: 0; }
.ap-search-in { flex: 1; min-width: 0; border: none; background: transparent; font: inherit; font-size: 13px; color: var(--hr-input-text, var(--set-text)); }
.ap-search-in:focus { outline: none; }
.ap-search-in::placeholder { color: var(--hr-input-placeholder, var(--set-text-dim)); }
.ap-search-x { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0; cursor: pointer;
  color: var(--set-text-dim); background: transparent; border: none; transition: color 0.18s; }
.ap-search-x:hover { color: var(--set-conflict); }
.ap-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; max-height: 244px; overflow-y: auto; }
.ap-opt { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; cursor: pointer;
  color: var(--set-text-secondary); transition: background 0.16s, color 0.16s; }
.ap-opt:hover { background: color-mix(in srgb, var(--acc) 12%, transparent); color: var(--set-text); }
.ap-opt.sel { background: color-mix(in srgb, var(--acc) 15%, transparent); color: var(--set-text); }
.ap-opt-av { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; font-size: 10.5px; font-weight: 850;
  color: #1a1206; background: linear-gradient(135deg, color-mix(in srgb, var(--acc) 86%, #fff), var(--acc)); }
.ap-opt-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.ap-opt-name { font-size: 13px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-opt-sub { font-size: 10.5px; color: var(--set-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-opt-check { color: var(--acc); flex-shrink: 0; }
.ap-state { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 22px 12px; font-size: 12.5px; color: var(--set-text-muted); }
.ap-state.muted :deep(svg), .ap-state :deep(svg) { color: var(--set-text-dim); }
.ap-spin { animation: ap-spin 0.9s linear infinite; }
@keyframes ap-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .ap-spin { animation: none; } }
</style>
