<template>
  <div class="mc-shell" :style="{ '--acc': accent, '--i': index }">
    <div ref="inner" class="mc" :class="{ system, off: active === false }">
      <span class="mc-glare" aria-hidden="true" />
      <span class="mc-spine" aria-hidden="true" />

      <header class="mc-head">
        <span class="mc-ic"><component :is="icon" :size="16" /></span>
        <div class="mc-id">
          <b class="mc-name">{{ view.title || '—' }}</b>
          <span v-if="view.code" class="mc-code set-mono"><Hash :size="9" />{{ view.code }}</span>
        </div>
        <span v-if="system" class="mc-sys"><Lock :size="10" /> System</span>
        <span v-else-if="active != null" class="mc-dot" :data-on="active" :title="active ? 'Active' : 'Inactive'" />
      </header>

      <p class="mc-sub">{{ view.sub || '—' }}</p>

      <div v-if="view.tags?.length" class="mc-tags">
        <span v-for="(t, i) in view.tags" :key="i" class="mc-tag">{{ t }}</span>
      </div>

      <footer class="mc-foot">
        <button v-if="active != null" type="button" class="mc-toggle" :class="{ on: active }" @click="$emit('toggle')">
          <span class="mc-toggle-knob" />{{ active ? 'Active' : 'Inactive' }}
        </button>
        <span v-else class="mc-spacer" />
        <button type="button" class="mc-act" title="Edit" @click="$emit('edit')"><FilePen :size="14" /></button>
        <button v-if="!system" type="button" class="mc-act danger" title="Delete" @click="$emit('delete')"><Trash2 :size="14" /></button>
        <span v-else class="mc-act locked" title="Built-in — can't be deleted"><Lock :size="13" /></span>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Hash, Lock, FilePen, Trash2 } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

defineProps({
  view: { type: Object, required: true }, // { title, code, sub, tags }
  icon: { type: [Object, Function], required: true },
  accent: { type: String, default: 'var(--set-gold)' },
  index: { type: Number, default: 0 },
  active: { type: [Boolean, null], default: null },
  system: { type: Boolean, default: false },
})
defineEmits(['edit', 'delete', 'toggle'])

const inner = ref(null)
usePointerSpotlight(inner)
</script>

<style scoped>
.mc-shell { animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.04s); }
.mc { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 9px; padding: 15px 16px 13px;
  border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  transition: transform 0.3s var(--set-spring), border-color 0.3s, box-shadow 0.3s, opacity 0.3s; }
.mc:hover { border-color: color-mix(in srgb, var(--acc) 38%, transparent); box-shadow: var(--set-card-shadow-hover);
  transform: perspective(1100px) rotateX(calc((var(--my,0.5) - 0.5) * -4deg)) rotateY(calc((var(--mx,0.5) - 0.5) * 6deg)) translateY(-2px); }
.mc.off { opacity: 0.66; }
.mc-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(360px circle at calc(var(--mx,0.5)*100%) calc(var(--my,0.5)*100%), color-mix(in srgb, var(--acc) 18%, transparent), transparent 60%); }
.mc-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 30%, transparent)); }

.mc-head { display: flex; align-items: center; gap: 10px; }
.mc-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.mc-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.mc-name { font-size: 14px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mc-code { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; color: var(--set-text-muted); }
.mc-code :deep(svg) { opacity: 0.6; }
.mc-sys { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--set-text-muted); padding: 3px 8px; border-radius: 999px; background: var(--set-unset-soft); border: 1px solid var(--set-border); }
.mc-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--set-unset); }
.mc-dot[data-on="true"] { background: var(--set-ok); box-shadow: 0 0 8px var(--set-ok); }

.mc-sub { margin: 0; font-size: 12px; color: var(--set-text-muted); line-height: 1.4;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mc-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.mc-tag { font-size: 10px; font-weight: 600; color: var(--set-text-secondary); padding: 2px 8px; border-radius: 7px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); }

.mc-foot { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.mc-spacer { flex: 1; }
.mc-toggle { flex: 1; display: inline-flex; align-items: center; gap: 7px; padding: 5px 10px; border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 700; color: var(--set-text-muted); background: var(--set-unset-soft); border: 1px solid var(--set-border); transition: all 0.2s; }
.mc-toggle.on { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 34%, transparent); }
.mc-toggle-knob { width: 8px; height: 8px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
.mc-act { width: 32px; height: 30px; border-radius: 9px; display: grid; place-items: center; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.mc-act:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.mc-act.danger:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 40%, transparent); }
.mc-act.locked { cursor: default; color: var(--set-text-dim); }
.mc-act.locked:hover { transform: none; border-color: var(--set-border); }

@media (prefers-reduced-motion: reduce) {
  .mc-shell { animation: none; }
  .mc:hover { transform: translateY(-2px); }
}
</style>
