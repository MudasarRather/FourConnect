<template>
  <div ref="rootEl" class="tex">
    <button class="tex-btn" type="button" :disabled="busy" @click="menu = !menu">
      <Download :size="13" aria-hidden="true" />
      {{ busy ? 'EXPORTING…' : 'EXPORT' }}
    </button>
    <Transition name="tex-pop">
      <div v-if="menu" class="tex-menu" role="menu" @mousedown.stop @click.stop>
        <button class="tex-item" type="button" role="menuitem" @click="run('csv')">
          CSV <span class="tex-hint">spreadsheet, 2000 newest</span>
        </button>
        <button class="tex-item" type="button" role="menuitem" @click="run('json')">
          JSON <span class="tex-hint">machine-readable envelope</span>
        </button>
        <button v-if="showPdf" class="tex-item" type="button" role="menuitem" @click="run('pdf')">
          PDF CHRONICLE <span class="tex-hint">printable dossier, 400 newest</span>
        </button>
        <div class="tex-note">Exports honour the filters exactly as set.</div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
/*
  SdIncTimelineExports — CSV / JSON (+ admin PDF CHRONICLE) over the CURRENT
  filter window. The host passes its live params() so an export can never
  disagree with the board. Blob downloads only — no tokens in URLs.
*/
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Download } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import {
  exportIncidentTimelineCsv, exportIncidentTimelineJson, exportIncidentTimelinePdf,
} from '@/composables/useSupportDesk'

const props = defineProps({
  params: { type: Function, required: true },    // () => current server params
  showPdf: { type: Boolean, default: false },    // admin chronicle
})

const toast = useToast()
const rootEl = ref(null)
const menu = ref(false)
const busy = ref(false)

const RUNNERS = {
  csv: { fn: exportIncidentTimelineCsv, ext: 'csv', name: 'incident-timeline' },
  json: { fn: exportIncidentTimelineJson, ext: 'json', name: 'incident-timeline' },
  pdf: { fn: exportIncidentTimelinePdf, ext: 'pdf', name: 'incident-chronicle' },
}
const run = async (kind) => {
  const r = RUNNERS[kind]
  menu.value = false
  busy.value = true
  try {
    const { page, limit, ...rest } = props.params() || {}
    const blob = await r.fn(rest)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${r.name}-${new Date().toISOString().slice(0, 10)}.${r.ext}`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${kind.toUpperCase()} exported`)
  } catch (err) {
    toast.error(err?.response?.status === 503
      ? 'PDF engine offline on this machine (GTK) — CSV/JSON still work'
      : 'Export failed')
  } finally { busy.value = false }
}

const onOutside = (e) => { if (rootEl.value && !rootEl.value.contains(e.target)) menu.value = false }
const onKey = (e) => { if (e.key === 'Escape') menu.value = false }
onMounted(() => {
  window.addEventListener('mousedown', onOutside, true)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('mousedown', onOutside, true)
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.tex { position: relative; }
.tex-btn {
  display: inline-flex; align-items: center; gap: 7px;
  border: 1px solid var(--tl-brd, var(--sd-border-strong)); background: transparent; cursor: pointer;
  color: var(--sd-text-secondary); border-radius: 999px; padding: 7px 14px;
  font: 700 10px/1 var(--sd-mono, monospace); letter-spacing: 1.5px;
  transition: transform .15s var(--sd-spring), border-color .15s, color .15s;
}
.tex-btn:hover:not(:disabled) { transform: translateY(-1px); color: var(--tl-core, var(--sd-inc-core)); border-color: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 55%, transparent); }
.tex-btn:disabled { opacity: .55; cursor: default; }
.tex-btn:focus-visible, .tex-item:focus-visible { outline: 2px solid var(--tl-core, var(--sd-inc-core)); outline-offset: 2px; }
.tex-menu {
  position: absolute; right: 0; top: calc(100% + 8px); z-index: 60; min-width: 250px;
  border: 1px solid var(--tl-brd, var(--sd-border-strong)); border-radius: 12px; padding: 6px;
  background: color-mix(in srgb, var(--sd-surface-elevated) 94%, transparent);
  backdrop-filter: blur(18px); box-shadow: 0 18px 44px rgba(0, 0, 0, .4);
  display: flex; flex-direction: column; gap: 2px;
}
.tex-item {
  display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
  border: 0; background: transparent; cursor: pointer; text-align: left;
  color: var(--sd-text); border-radius: 8px; padding: 8px 10px;
  font: 700 10.5px/1 var(--sd-mono, monospace); letter-spacing: 1.2px;
}
.tex-item:hover { background: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 10%, transparent); color: var(--tl-core, var(--sd-inc-core)); }
.tex-hint { font: 400 10px/1.2 inherit; letter-spacing: 0; color: var(--sd-text-dim); font-family: inherit; }
.tex-note {
  padding: 7px 10px 5px; border-top: 1px solid var(--tl-brd, var(--sd-border));
  font-size: 10px; color: var(--sd-text-dim);
}
.tex-pop-enter-active, .tex-pop-leave-active { transition: opacity .18s, transform .18s var(--sd-spring); }
.tex-pop-enter-from, .tex-pop-leave-to { opacity: 0; transform: translateY(-6px) scale(.97); }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .tex-pop-enter-active,
  html:not([data-cinematic="on"]) .tex-pop-leave-active { transition: none; }
}
[data-theme="light"] .tex-menu { box-shadow: 0 18px 44px rgba(60, 45, 20, .2); }
</style>
