<template>
  <div class="pf-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="pf" :class="{ off: !panel.is_active }">
      <span class="pf-glare" aria-hidden="true" />
      <span class="pf-spine" aria-hidden="true" />

      <header class="pf-head">
        <span class="pf-led" :class="panel.is_active ? 'on' : 'idle'" />
        <div class="pf-titles">
          <b>{{ panel.name }}</b>
          <span class="pf-dept">
            <Building2 :size="11" />{{ deptName || 'All departments' }}
          </span>
        </div>
        <span class="pf-status" :class="panel.is_active ? 'on' : 'idle'">
          {{ panel.is_active ? 'Active' : 'Inactive' }}
        </span>
      </header>

      <div v-if="expertise.length" class="pf-tags">
        <span v-for="(e, i) in expertise.slice(0, 5)" :key="i" class="pf-tag">{{ e }}</span>
        <span v-if="expertise.length > 5" class="pf-tag more">+{{ expertise.length - 5 }}</span>
      </div>
      <p v-else class="pf-noexp">No expertise tags</p>

      <div class="pf-members">
        <div class="pf-avatars">
          <span v-for="(m, i) in members.slice(0, 5)" :key="i" class="pf-av" :style="{ '--n': i, zIndex: 5 - i }" :title="m.name">
            {{ initials(m.name) }}
          </span>
          <span v-if="members.length > 5" class="pf-av rest" :style="{ '--n': 5 }">+{{ members.length - 5 }}</span>
          <span v-if="!members.length" class="pf-av empty"><UserRound :size="13" /></span>
        </div>
        <span class="pf-mcount">
          <Users :size="12" />{{ members.length }} {{ members.length === 1 ? 'panelist' : 'panelists' }}
        </span>
      </div>

      <footer class="pf-foot">
        <button class="pf-act" type="button" @click="$emit('edit', panel)">
          <Pencil :size="13" /> Edit
        </button>
        <button class="pf-act danger" type="button" @click="$emit('delete', panel)">
          <Trash2 :size="13" />
        </button>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Building2, Users, UserRound, Pencil, Trash2 } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  panel: { type: Object, required: true },
  deptName: { type: String, default: '' },
  index: { type: Number, default: 0 },
})
defineEmits(['edit', 'delete'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const expertise = computed(() => Array.isArray(props.panel.expertise) ? props.panel.expertise : [])
const members = computed(() => Array.isArray(props.panel.members) ? props.panel.members : [])
const initials = (name) => (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
</script>

<style scoped>
.pf-shell { animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.055s); }
.pf { position: relative; overflow: hidden; height: 100%;
  display: flex; flex-direction: column; gap: 12px;
  padding: 15px 16px; border-radius: 16px;
  background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  transition: transform 0.3s var(--set-spring), border-color 0.3s, box-shadow 0.3s;
  --acc: var(--set-ok); --mx: 0.5; --my: 0.5; --spot: 0; }
.pf.off { --acc: var(--set-unset); }
.pf:hover { transform: perspective(1000px) rotateX(calc((var(--my) - 0.5) * -5deg)) rotateY(calc((var(--mx) - 0.5) * 7deg)) translateY(-3px);
  border-color: color-mix(in srgb, var(--acc) 38%, transparent); box-shadow: var(--set-card-shadow-hover); }
.pf-glare { position: absolute; inset: 0; z-index: 3; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(360px circle at calc(var(--mx) * 100%) calc(var(--my) * 100%), color-mix(in srgb, var(--acc) 15%, transparent), transparent 45%); }
.pf-spine { position: absolute; left: 0; top: 13px; bottom: 13px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 18%, transparent)); box-shadow: 0 0 12px color-mix(in srgb, var(--acc) 45%, transparent); }

.pf-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 9px; }
.pf-led { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; background: var(--set-unset); }
.pf-led.on { background: var(--set-ok); box-shadow: 0 0 10px var(--set-ok); animation: set-led-pulse 2.6s ease-in-out infinite; }
.pf-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pf-titles b { font-size: 13.5px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pf-dept { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--set-text-muted); }
.pf-dept :deep(svg) { color: var(--set-gold); flex-shrink: 0; }
.pf-status { flex-shrink: 0; padding: 3px 9px; border-radius: 999px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.pf-status.on { color: var(--set-ok); background: var(--set-ok-soft); }
.pf-status.idle { color: var(--set-text-muted); background: var(--set-unset-soft); }

.pf-tags { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 5px; }
.pf-tag { padding: 3px 8px; border-radius: 7px; font-size: 10.5px; font-weight: 650; color: var(--set-gold);
  background: color-mix(in srgb, var(--set-gold) 10%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 24%, transparent); }
.pf-tag.more { color: var(--set-text-muted); background: var(--set-unset-soft); border-color: var(--set-border); }
.pf-noexp { position: relative; z-index: 1; margin: 0; font-size: 11px; font-style: italic; color: var(--set-text-dim); }

.pf-members { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; }
.pf-avatars { display: flex; }
.pf-av { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0;
  font-size: 9.5px; font-weight: 800; color: #1a1206; margin-left: calc(var(--n) * -7px);
  background: var(--set-grad-hero); border: 2px solid var(--set-surface); }
.pf-av.rest { background: var(--set-surface-elevated); color: var(--set-text-muted); border-color: var(--set-surface); }
.pf-av.empty { background: var(--set-surface-elevated); color: var(--set-text-dim); margin-left: 0; }
.pf-mcount { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 650; color: var(--set-text-muted); }
.pf-mcount :deep(svg) { color: var(--set-text-dim); }

.pf-foot { position: relative; z-index: 1; display: flex; gap: 7px; padding-top: 11px; border-top: 1px solid var(--set-border); }
.pf-act { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 9px; cursor: pointer; font: inherit;
  font-size: 11.5px; font-weight: 700; color: var(--set-text-secondary); background: var(--set-surface-elevated);
  border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.pf-act:first-child { flex: 1; justify-content: center; }
.pf-act:hover { color: var(--set-gold); border-color: var(--set-border-warm); }
.pf-act.danger { color: var(--set-text-muted); }
.pf-act.danger:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 36%, transparent); background: var(--set-conflict-soft); }

@media (prefers-reduced-motion: reduce) {
  .pf-shell { animation: none; }
  .pf:hover { transform: translateY(-2px); }
  .pf-led.on { animation: none; }
}
</style>
