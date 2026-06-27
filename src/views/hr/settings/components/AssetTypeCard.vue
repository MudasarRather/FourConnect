<template>
  <div class="atc-shell" :style="{ '--acc': accent, '--i': index }">
    <div ref="inner" class="atc" :class="{ off: !active, system }">
      <span class="atc-glare" aria-hidden="true" />
      <span class="atc-spine" aria-hidden="true" />

      <header class="atc-head">
        <span class="atc-ic"><component :is="iconComp" :size="18" /></span>
        <div class="atc-id">
          <b class="atc-name">{{ type.label || '—' }}</b>
          <span class="atc-code set-mono"><Hash :size="9" />{{ type.code }}</span>
        </div>
        <span class="atc-tag" :class="system ? 'sys' : 'cust'">
          <component :is="system ? Lock : Sparkles" :size="9" />{{ system ? 'Built-in' : 'Custom' }}
        </span>
      </header>

      <div class="atc-meta">
        <span class="atc-count">
          <b class="set-mono"><SetCountUp :value="count" /></b> {{ count === 1 ? 'asset' : 'assets' }} of this kind
        </span>
      </div>

      <footer class="atc-foot">
        <button type="button" class="atc-toggle" :class="{ on: active }" @click="$emit('toggle', type)">
          <span class="atc-toggle-knob" />{{ active ? 'Active' : 'Inactive' }}
        </button>
        <button type="button" class="atc-act" title="Edit type" @click="$emit('edit', type)"><FilePen :size="14" /></button>
        <button v-if="system" type="button" class="atc-act locked" title="Built-in — can't be deleted (deactivate instead)" @click="$emit('delete', type)"><Lock :size="13" /></button>
        <button v-else type="button" class="atc-act danger" :class="{ guarded: locked }"
          :title="locked ? `${count} assets use this type — guarded` : 'Delete type'" @click="$emit('delete', type)">
          <component :is="locked ? ShieldAlert : Trash2" :size="14" />
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Hash, Lock, Sparkles, FilePen, Trash2, ShieldAlert } from 'lucide-vue-next'
import SetCountUp from './SetCountUp.vue'
import { iconForTypeName } from '@/composables/useAssets'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  type: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['edit', 'delete', 'toggle'])

const inner = ref(null)
usePointerSpotlight(inner)

const count = computed(() => Number(props.type.asset_count || 0))
const active = computed(() => props.type.is_active !== false)
const system = computed(() => !!props.type.is_system)
const locked = computed(() => count.value > 0)
const iconComp = computed(() => iconForTypeName(props.type.icon))
const accent = computed(() => system.value ? 'var(--set-gold)' : 'var(--set-deep)')
</script>

<style scoped>
.atc-shell { animation: set-deal 0.55s var(--set-spring) both; animation-delay: calc(var(--i) * 0.045s); }
.atc { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 10px; padding: 15px 16px 13px 17px;
  border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  transition: transform 0.3s var(--set-spring), border-color 0.3s, box-shadow 0.3s, opacity 0.3s; }
.atc:hover { border-color: color-mix(in srgb, var(--acc) 38%, transparent); box-shadow: var(--set-card-shadow-hover);
  transform: perspective(1100px) rotateX(calc((var(--my,0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx,0.5) - 0.5) * 7deg)) translateY(-2px); }
.atc.off { opacity: 0.7; }
.atc-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(320px circle at calc(var(--mx,0.5)*100%) calc(var(--my,0.5)*100%), color-mix(in srgb, var(--acc) 18%, transparent), transparent 60%); }
.atc-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 30%, transparent)); box-shadow: 0 0 12px -2px var(--acc); }

.atc-head { display: flex; align-items: center; gap: 10px; }
.atc-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.atc-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.atc-name { font-size: 14px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.atc-code { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; color: var(--set-text-muted); }
.atc-code :deep(svg) { opacity: 0.6; }
.atc-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase;
  padding: 3px 8px; border-radius: 999px; flex-shrink: 0; }
.atc-tag.sys { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 14%, transparent); }
.atc-tag.cust { color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 14%, transparent); }

.atc-meta { font-size: 11.5px; color: var(--set-text-muted); }
.atc-count b { font-size: 14px; font-weight: 850; color: var(--set-text); }

.atc-foot { display: flex; align-items: center; gap: 7px; margin-top: 2px; }
.atc-toggle { flex: 1; display: inline-flex; align-items: center; gap: 7px; padding: 5px 10px; border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 700; color: var(--set-text-muted); background: var(--set-unset-soft); border: 1px solid var(--set-border); transition: all 0.2s; }
.atc-toggle.on { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 34%, transparent); }
.atc-toggle-knob { width: 8px; height: 8px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
.atc-act { width: 32px; height: 30px; border-radius: 9px; display: grid; place-items: center; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.atc-act:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.atc-act.danger:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 40%, transparent); }
.atc-act.guarded { color: var(--set-partial); }
.atc-act.locked { color: var(--set-text-dim); cursor: pointer; }
.atc-act.locked:hover { color: var(--set-gold); border-color: color-mix(in srgb, var(--set-gold) 36%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .atc-shell { animation: none; }
  .atc:hover { transform: translateY(-2px); }
}
</style>
