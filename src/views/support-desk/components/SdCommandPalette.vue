<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="cmdp-ov" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.18 }" @mousedown.self="emit('close')">
        <Motion class="cmdp" :initial="{ opacity: 0, y: -16, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: -10, scale: 0.98 }" :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }"
          @mousedown.stop @click.stop>
          <div class="cmdp-search">
            <Command :size="16" />
            <input ref="inEl" v-model="q" type="text" placeholder="Search actions, lenses or jump to a ticket…"
              @keydown.down.prevent="move(1)" @keydown.up.prevent="move(-1)" @keydown.enter.prevent="run()" @keydown.esc="emit('close')" />
            <kbd>ESC</kbd>
          </div>
          <div ref="listEl" class="cmdp-list">
            <template v-for="(grp, gi) in groups" :key="grp.title">
              <div v-if="grp.items.length" class="cmdp-grp">{{ grp.title }}</div>
              <button v-for="it in grp.items" :key="it._k" class="cmdp-item" :class="{ on: it._i === cursor }"
                :data-i="it._i" @click="choose(it)" @mousemove="cursor = it._i">
                <span class="ci-ic"><component :is="it.icon" :size="15" /></span>
                <span class="ci-body"><span class="ci-label">{{ it.label }}</span><span v-if="it.hint" class="ci-hint">{{ it.hint }}</span></span>
                <span v-if="it.kbd" class="ci-kbd">{{ it.kbd }}</span>
              </button>
            </template>
            <div v-if="!flat.length" class="cmdp-none">No matches.</div>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Command, Ticket } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  commands: { type: Array, default: () => [] }, // [{ id, label, hint, icon, kbd, run }]
  tickets: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'run', 'open'])

const q = ref('')
const cursor = ref(0)
const inEl = ref(null)
const listEl = ref(null)

const match = (hay) => {
  const s = q.value.trim().toLowerCase()
  if (!s) return true
  return (hay || '').toLowerCase().includes(s)
}
const cmdMatches = computed(() => props.commands.filter(c => match(c.label) || match(c.hint)))
const ticketMatches = computed(() => {
  const s = q.value.trim()
  if (!s) return []
  return props.tickets.filter(t => match(t.subject) || match(t.ticket_number)).slice(0, 6)
})

const groups = computed(() => {
  let i = 0
  const cmds = cmdMatches.value.map(c => ({ ...c, _k: 'c' + c.id, _i: i++, _ticket: null }))
  const tks = ticketMatches.value.map(t => ({
    _k: 't' + t.id, _i: i++, icon: Ticket, label: t.subject || t.ticket_number,
    hint: `${t.ticket_number} · ${t.status}`, _ticket: t,
  }))
  return [{ title: 'Actions', items: cmds }, { title: 'Jump to ticket', items: tks }]
})
const flat = computed(() => groups.value.flatMap(g => g.items))

const move = (d) => {
  if (!flat.value.length) return
  cursor.value = (cursor.value + d + flat.value.length) % flat.value.length
  nextTick(() => listEl.value?.querySelector(`[data-i="${cursor.value}"]`)?.scrollIntoView({ block: 'nearest' }))
}
const choose = (it) => {
  if (it._ticket) emit('open', it._ticket.id)
  else if (it.run) emit('run', it)
  emit('close')
}
const run = () => { const it = flat.value[cursor.value]; if (it) choose(it) }

watch(() => props.open, (o) => { if (o) { q.value = ''; cursor.value = 0; nextTick(() => inEl.value?.focus()) } })
watch(q, () => { cursor.value = 0 })
</script>

<style scoped>
.cmdp-ov { position: fixed; inset: 0; z-index: 6000; display: flex; align-items: flex-start; justify-content: center; padding-top: 12vh; background: rgba(6, 7, 8, 0.5); backdrop-filter: blur(6px); }
[data-theme="light"] .cmdp-ov { background: rgba(60, 50, 35, 0.28); }
.cmdp { width: min(620px, 92vw); max-height: 64vh; display: flex; flex-direction: column; overflow: hidden; border-radius: 18px; background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); box-shadow: 0 30px 80px rgba(0,0,0,0.5); }
.cmdp-search { display: flex; align-items: center; gap: 11px; padding: 15px 17px; border-bottom: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.cmdp-search svg { color: var(--sd-amber); }
.cmdp-search input { flex: 1; min-width: 0; background: none; border: none; outline: none; font-family: inherit; font-size: 15px; color: var(--sd-text); }
.cmdp-search kbd { font-family: var(--sd-mono); font-size: 9.5px; font-weight: 700; color: var(--sd-text-dim); padding: 3px 6px; border-radius: 6px; border: 1px solid var(--sd-border-strong); }
.cmdp-list { overflow-y: auto; padding: 8px; }
.cmdp-grp { font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--sd-text-dim); padding: 9px 10px 5px; }
.cmdp-item { display: flex; align-items: center; gap: 11px; width: 100%; padding: 9px 11px; border-radius: 11px; cursor: pointer; border: none; background: transparent; text-align: left; font-family: inherit; transition: background 0.12s; }
.cmdp-item.on { background: var(--sd-amber-soft); }
.ci-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; color: var(--sd-text-secondary); background: var(--sd-surface-glass); }
.cmdp-item.on .ci-ic { color: var(--sd-amber); }
.ci-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.ci-label { font-size: 13.5px; font-weight: 600; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ci-hint { font-size: 11px; color: var(--sd-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ci-kbd { font-family: var(--sd-mono); font-size: 9px; font-weight: 700; color: var(--sd-text-dim); padding: 2px 6px; border-radius: 6px; border: 1px solid var(--sd-border); }
.cmdp-none { padding: 22px; text-align: center; font-size: 13px; color: var(--sd-text-dim); }
@media (prefers-reduced-motion: reduce) { html:not([data-cinematic="on"]) .cmdp-ov { backdrop-filter: none; } }
</style>
