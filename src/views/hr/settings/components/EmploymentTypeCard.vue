<template>
  <div class="etc-shell" :style="{ '--i': index }">
    <div ref="inner" class="etc" :class="{ off: !type.is_active, system: type.is_system }">
      <span class="etc-glare" aria-hidden="true" />
      <span class="etc-spine" aria-hidden="true" />

      <!-- main -->
      <div class="etc-main">
        <header class="etc-head">
          <span class="etc-ic"><component :is="glyph" :size="17" /></span>
          <div class="etc-id">
            <b class="etc-name" :title="type.label">{{ type.label }}</b>
            <span class="etc-code set-mono"><Hash :size="9" />{{ type.code }}</span>
          </div>
          <span v-if="type.is_system" class="etc-sys"><Lock :size="10" /> Built-in</span>
          <span v-else class="etc-dot" :data-on="type.is_active" :title="type.is_active ? 'Active' : 'Inactive'" />
        </header>

        <p class="etc-desc">{{ type.description || 'Engagement model for the workforce.' }}</p>

        <footer class="etc-foot">
          <button type="button" class="etc-toggle" :class="{ on: type.is_active }" @click.stop="$emit('toggle', type)"
            :title="type.is_active ? 'Active — selectable for new hires' : 'Inactive — hidden from new-hire picker'">
            <span class="etc-toggle-track"><span class="etc-toggle-knob" /></span>
            {{ type.is_active ? 'Active' : 'Inactive' }}
          </button>
          <button type="button" class="etc-act" title="Edit" @click.stop="$emit('edit', type)"><FilePen :size="14" /></button>
          <button v-if="!type.is_system" type="button" class="etc-act danger" title="Delete" @click.stop="$emit('delete', type)"><Trash2 :size="14" /></button>
          <span v-else class="etc-act locked" title="Built-in — deactivate instead of deleting"><Lock :size="13" /></span>
        </footer>
      </div>

      <!-- ticket stub: live workforce share -->
      <button type="button" class="etc-stub" :class="{ filled: engaged > 0 }" @click.stop="$emit('view', type)"
        :title="engaged + ' employee(s) engaged under this type'">
        <span class="etc-stub-eyebrow">Engaged</span>
        <b class="etc-stub-num">{{ engaged }}</b>
        <span v-if="hasWorkforce" class="etc-stub-share">{{ share }}%</span>
        <span v-else class="etc-stub-share none">—</span>
        <span class="etc-stub-bar"><i :style="{ height: hasWorkforce ? Math.max(4, share) + '%' : '0%' }" /></span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Hash, Lock, FilePen, Trash2, BriefcaseBusiness, Clock3, ScrollText, Handshake, GraduationCap, Tag } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  type: { type: Object, required: true },     // { id, code, label, description, is_active, is_system }
  index: { type: Number, default: 0 },
  engaged: { type: Number, default: 0 },
  share: { type: Number, default: 0 },
  hasWorkforce: { type: Boolean, default: false },
})
defineEmits(['edit', 'delete', 'toggle', 'view'])

const inner = ref(null)
usePointerSpotlight(inner)

const glyph = computed(() => {
  const c = String(props.type.code || '').toUpperCase()
  if (c.includes('FULL')) return BriefcaseBusiness
  if (c.includes('PART')) return Clock3
  if (c.includes('CONTRACT')) return ScrollText
  if (c.includes('CONSULT')) return Handshake
  if (c.includes('INTERN') || c.includes('TRAINEE')) return GraduationCap
  return Tag
})
</script>

<style scoped>
.etc-shell { animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.05s); }
.etc { position: relative; overflow: hidden; display: grid; grid-template-columns: 1fr 84px;
  border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  transition: transform 0.3s var(--set-spring), border-color 0.3s, box-shadow 0.3s, opacity 0.3s; }
.etc:hover { border-color: color-mix(in srgb, var(--set-deep) 38%, transparent); box-shadow: var(--set-card-shadow-hover);
  transform: perspective(1100px) rotateX(calc((var(--my,0.5) - 0.5) * -4deg)) rotateY(calc((var(--mx,0.5) - 0.5) * 6deg)) translateY(-2px); }
.etc.off { opacity: 0.74; }
.etc-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s; z-index: 4;
  background: radial-gradient(340px circle at calc(var(--mx,0.5)*100%) calc(var(--my,0.5)*100%), color-mix(in srgb, var(--set-deep) 16%, transparent), transparent 60%); }
.etc-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0; z-index: 1;
  background: linear-gradient(180deg, var(--set-deep), color-mix(in srgb, var(--set-deep) 30%, transparent)); }
.etc.off .etc-spine { background: var(--set-unset); }

.etc-main { display: flex; flex-direction: column; gap: 9px; padding: 14px 14px 12px 16px; min-width: 0; }

.etc-head { display: flex; align-items: center; gap: 10px; }
.etc-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--set-deep);
  background: color-mix(in srgb, var(--set-deep) 13%, transparent); border: 1px solid color-mix(in srgb, var(--set-deep) 26%, transparent); }
.etc-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.etc-name { font-size: 14.5px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.etc-code { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; color: var(--set-text-muted); }
.etc-code :deep(svg) { opacity: 0.6; }
.etc-sys { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;
  color: var(--set-text-muted); padding: 3px 8px; border-radius: 999px; background: var(--set-unset-soft); border: 1px solid var(--set-border); }
.etc-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--set-unset); }
.etc-dot[data-on="true"] { background: var(--set-ok); box-shadow: 0 0 8px var(--set-ok); }

.etc-desc { margin: 0; font-size: 12px; line-height: 1.45; color: var(--set-text-muted);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.9em; }

.etc-foot { display: flex; align-items: center; gap: 7px; margin-top: auto; }
.etc-toggle { flex: 1; display: inline-flex; align-items: center; gap: 8px; padding: 5px 10px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 11px; font-weight: 700; color: var(--set-text-muted); background: var(--set-unset-soft); border: 1px solid var(--set-border); transition: all 0.2s; }
.etc-toggle.on { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 34%, transparent); }
.etc-toggle-track { position: relative; width: 22px; height: 12px; border-radius: 999px; background: var(--set-unset); transition: background 0.25s; flex-shrink: 0; }
.etc-toggle.on .etc-toggle-track { background: var(--set-ok); }
.etc-toggle-knob { position: absolute; top: 1px; left: 1px; width: 10px; height: 10px; border-radius: 50%; background: #fff; transition: transform 0.25s var(--set-spring); }
.etc-toggle.on .etc-toggle-knob { transform: translateX(10px); }
.etc-act { width: 32px; height: 30px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; flex-shrink: 0;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.etc-act:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.etc-act.danger:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 40%, transparent); }
.etc-act.locked { cursor: default; color: var(--set-text-dim); }
.etc-act.locked:hover { transform: none; border-color: var(--set-border); }

/* ticket stub */
.etc-stub { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  padding: 12px 8px; cursor: pointer; font: inherit; border: none; background: color-mix(in srgb, var(--set-deep) 5%, var(--set-panel));
  border-left: 1.5px dashed var(--set-border-strong); transition: background 0.25s; }
.etc-stub:hover { background: color-mix(in srgb, var(--set-deep) 11%, var(--set-panel)); }
/* perforation notches */
.etc-stub::before, .etc-stub::after { content: ''; position: absolute; left: -7px; width: 13px; height: 13px; border-radius: 50%;
  background: var(--set-canvas); border: 1px solid var(--set-border); }
.etc-stub::before { top: -7px; }
.etc-stub::after { bottom: -7px; }
.etc-stub-eyebrow { font-size: 8px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.etc-stub-num { font-size: 26px; font-weight: 850; line-height: 1; color: var(--set-text); font-variant-numeric: tabular-nums; }
.etc-stub.filled .etc-stub-num { color: var(--set-deep); }
.etc-stub-share { font-size: 10px; font-weight: 700; color: var(--set-text-muted); }
.etc-stub-share.none { color: var(--set-text-dim); }
.etc-stub-bar { position: absolute; right: 7px; top: 12px; bottom: 12px; width: 4px; border-radius: 2px; background: var(--set-border); overflow: hidden; display: flex; align-items: flex-end; }
.etc-stub-bar i { display: block; width: 100%; border-radius: 2px; background: linear-gradient(180deg, var(--set-deep), var(--set-orange)); transition: height 0.9s var(--set-spring); }

@media (prefers-reduced-motion: reduce) {
  .etc-shell { animation: none; }
  .etc:hover { transform: translateY(-2px); }
  .etc-stub-bar i, .etc-toggle-knob { transition: none; }
}
</style>
