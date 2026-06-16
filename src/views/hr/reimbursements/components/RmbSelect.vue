<template>
  <div class="rsel" :class="{ open, filled: current }" ref="triggerRef">
    <button type="button" class="rsel-trigger" @click="toggle" :aria-expanded="open">
      <span v-if="current?.icon" class="rsel-ic"><component :is="current.icon" :size="14" /></span>
      <span class="rsel-val" :class="{ ph: !current }">{{ current ? current.label : placeholder }}</span>
      <ChevronDown :size="15" class="rsel-arr" />
    </button>

    <Teleport to="body">
      <Transition name="rsel-pop">
        <div v-if="open" class="rsel-pop" :style="popStyle" @mousedown.stop @click.stop ref="popRef">
          <ul class="rsel-list" role="listbox">
            <Motion v-for="(o, i) in options" :key="o.value" as="li" class="rsel-opt"
                    :class="{ on: o.value === modelValue }" role="option" :aria-selected="o.value === modelValue"
                    :initial="{ opacity: 0, x: -6 }" :animate="{ opacity: 1, x: 0 }"
                    :transition="{ delay: 0.02 * i, duration: 0.26, ease: [0.16, 1, 0.3, 1] }"
                    @click="pick(o)">
              <span v-if="o.icon" class="rsel-opt-ic"><component :is="o.icon" :size="14" /></span>
              <span class="rsel-opt-txt">
                <b>{{ o.label }}</b>
                <small v-if="o.hint">{{ o.hint }}</small>
              </span>
              <Check v-if="o.value === modelValue" :size="14" class="rsel-opt-chk" />
            </Motion>
          </ul>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { ChevronDown, Check } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  options: { type: Array, default: () => [] },   // [{ value, label, icon?, hint? }]
  placeholder: { type: String, default: 'Select…' },
})
const emit = defineEmits(['update:modelValue'])

const triggerRef = ref(null)
const popRef = ref(null)
const open = ref(false)
const popStyle = ref({})

const current = computed(() => props.options.find(o => o.value === props.modelValue) || null)

function recalc() {
  const el = triggerRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const below = window.innerHeight - r.bottom
  const openUp = below < 240 && r.top > below
  popStyle.value = {
    position: 'fixed',
    left: `${r.left}px`,
    width: `${r.width}px`,
    ...(openUp ? { bottom: `${window.innerHeight - r.top + 6}px` } : { top: `${r.bottom + 6}px` }),
  }
}
function onOutside(e) {
  if (!open.value) return
  if (triggerRef.value?.contains(e.target)) return
  if (popRef.value?.contains(e.target)) return
  close()
}
function onScroll() { if (open.value) recalc() }
function onKey(e) { if (e.key === 'Escape') close() }

function toggle() { open.value ? close() : openMenu() }
function openMenu() {
  recalc()
  open.value = true
  window.addEventListener('mousedown', onOutside, true)
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', recalc)
  window.addEventListener('keydown', onKey)
}
function close() {
  open.value = false
  window.removeEventListener('mousedown', onOutside, true)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', recalc)
  window.removeEventListener('keydown', onKey)
}
function pick(o) { emit('update:modelValue', o.value); close() }

onBeforeUnmount(close)
</script>

<style scoped>
.rsel { position: relative; }
.rsel-trigger { width: 100%; display: flex; align-items: center; gap: 7px; cursor: pointer;
  background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 9px;
  padding: 8px 10px; font-size: 12.5px; font-family: inherit; color: var(--rmb-text);
  transition: border-color 0.22s, box-shadow 0.22s, background 0.22s; }
[data-theme="light"] .rsel-trigger { background: rgba(40,25,10,0.04); border-color: rgba(40,25,10,0.14); }
.rsel-trigger:hover { border-color: var(--rmb-border-strong); }
.rsel.open .rsel-trigger { border-color: var(--rsel-acc, var(--rmb-amber)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--rsel-acc, var(--rmb-amber)) 14%, transparent); }
.rsel-ic { display: grid; place-items: center; color: var(--rsel-acc, var(--rmb-amber)); flex: 0 0 auto; }
.rsel-val { flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rsel-val.ph { color: var(--rmb-text-muted); }
.rsel-arr { flex: 0 0 auto; color: var(--rmb-text-muted); transition: transform 0.28s var(--rmb-spring); }
.rsel.open .rsel-arr { transform: rotate(180deg); color: var(--rsel-acc, var(--rmb-amber)); }

/* popover (teleported) */
.rsel-pop { z-index: 4300; border-radius: 12px; overflow: hidden; padding: 5px;
  background: var(--rmb-glass-deep); backdrop-filter: var(--rmb-glass-blur);
  border: 1px solid var(--rmb-border-strong); box-shadow: 0 24px 54px -26px rgba(0,0,0,0.7), var(--rmb-glass-shadow); }
.rsel-list { list-style: none; margin: 0; padding: 0; max-height: 260px; overflow-y: auto; }
.rsel-list::-webkit-scrollbar { width: 7px; }
.rsel-list::-webkit-scrollbar-thumb { background: var(--rmb-border-strong); border-radius: 7px; }
.rsel-opt { display: flex; align-items: center; gap: 9px; padding: 8px 9px; border-radius: 9px; cursor: pointer;
  color: var(--rmb-text-secondary); transition: background 0.18s, color 0.18s; }
.rsel-opt:hover { background: var(--rmb-surface); color: var(--rmb-text); }
.rsel-opt.on { background: color-mix(in srgb, var(--rsel-acc, var(--rmb-amber)) 14%, transparent); color: var(--rsel-acc, var(--rmb-amber)); }
.rsel-opt-ic { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; flex: 0 0 auto;
  background: var(--rmb-surface); color: var(--rsel-acc, var(--rmb-amber)); }
.rsel-opt.on .rsel-opt-ic { background: color-mix(in srgb, var(--rsel-acc, var(--rmb-amber)) 18%, transparent); }
.rsel-opt-txt { flex: 1; display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.rsel-opt-txt b { font-size: 12.5px; font-weight: 600; }
.rsel-opt-txt small { font-size: 10.5px; color: var(--rmb-text-muted); }
.rsel-opt-chk { flex: 0 0 auto; color: var(--rsel-acc, var(--rmb-amber)); }

.rsel-pop-enter-active { transition: opacity 0.2s ease, transform 0.26s var(--rmb-spring); transform-origin: top; }
.rsel-pop-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.rsel-pop-enter-from, .rsel-pop-leave-to { opacity: 0; transform: translateY(-6px) scaleY(0.96); }
</style>
