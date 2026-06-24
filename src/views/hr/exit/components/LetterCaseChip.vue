<template>
  <!-- Credential dossier chip — roster master for the Atelier. A mini wax-seal
       medallion (status-coloured) + employee + letter-state pill. 3D-tilt, a
       status spine, and a fresh "ready to mint" shimmer when eligible. -->
  <button ref="el" type="button" class="lcc" :class="[`st-${ls}`, { on: active, ready: c.eligible }]"
    :style="{ '--i': index }" @click="$emit('select', c.id)">
    <span class="lcc-glare" aria-hidden="true" />
    <span class="lcc-medal">
      <span class="lcc-wax" aria-hidden="true" />
      <component :is="meta.icon || FileClock" :size="15" class="lcc-ic" />
    </span>
    <span class="lcc-body">
      <span class="lcc-name">{{ c.employee_name || c.employee_code || '—' }}</span>
      <span class="lcc-meta ex-mono">{{ c.case_number }} · {{ c.department_name || '—' }}</span>
      <span class="lcc-foot">
        <span class="lcc-pill">{{ meta.label }}</span>
        <span v-if="c.eligible && (c.letterStatus === 'NOT_GENERATED' || c.letterStatus === 'REVOKED')" class="lcc-rdy"><Gem :size="9" /> ready</span>
        <span v-else-if="c.blocked" class="lcc-blk"><Lock :size="9" /> awaiting</span>
      </span>
    </span>
  </button>
</template>

<script setup>
import { computed, ref } from 'vue'
import { FileClock, PenLine, BadgeCheck, FileX, Gem, Lock } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  c: { type: Object, required: true },
  active: { type: Boolean, default: false },
  index: { type: Number, default: 0 },
})
defineEmits(['select'])

const el = ref(null)
usePointerSpotlight(el)

const ls = computed(() => (props.c.letterStatus || 'NOT_GENERATED').toLowerCase())
const META = {
  NOT_GENERATED: { label: 'Not minted', icon: FileClock, c: 'var(--ex-steel)' },
  GENERATED: { label: 'Drafted', icon: PenLine, c: 'var(--ex-amber)' },
  ISSUED: { label: 'Issued', icon: BadgeCheck, c: 'var(--ex-cleared)' },
  REVOKED: { label: 'Revoked', icon: FileX, c: 'var(--ex-blocked)' },
}
const meta = computed(() => META[props.c.letterStatus] || META.NOT_GENERATED)
</script>

<style scoped>
.lcc { position: relative; overflow: hidden; display: flex; align-items: center; gap: 11px; flex-shrink: 0; width: 250px; padding: 11px 13px; border-radius: 15px; cursor: pointer; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); font-family: inherit;
  transition: transform 0.22s var(--ex-spring), border-color 0.22s, box-shadow 0.22s;
  animation: ex-deal 0.5s var(--ex-spring) backwards; animation-delay: calc(var(--i) * 0.045s); --mc: var(--ex-steel); }
.lcc::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--mc); opacity: 0; transition: opacity 0.22s; }
.lcc:hover { transform: translateY(-2px); border-color: var(--ex-violet-border); box-shadow: var(--ex-shadow); }
.lcc.on { border-color: color-mix(in srgb, var(--mc) 60%, transparent); background: color-mix(in srgb, var(--mc) 9%, transparent); }
.lcc.on::before, .lcc.st-issued::before, .lcc.st-revoked::before { opacity: 1; }
.st-not_generated { --mc: var(--ex-steel); } .st-generated { --mc: var(--ex-amber); }
.st-issued { --mc: var(--ex-cleared); } .st-revoked { --mc: var(--ex-blocked); }

.lcc-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.25s;
  background: radial-gradient(180px circle at calc(var(--mx,0.5) * 100%) calc(var(--my,0.5) * 100%), color-mix(in srgb, var(--mc) 22%, transparent), transparent 60%); }

.lcc-medal { position: relative; flex-shrink: 0; width: 40px; height: 40px; display: grid; place-items: center; }
.lcc-wax { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 38% 34%, color-mix(in srgb, var(--mc) 60%, var(--ex-surface-elevated)), color-mix(in srgb, var(--mc) 26%, var(--ex-panel)));
  border: 1.5px solid color-mix(in srgb, var(--mc) 50%, transparent); box-shadow: inset 0 -2px 5px rgba(0,0,0,0.3);
  clip-path: polygon(50% 0,63% 9%,79% 6%,84% 22%,98% 32%,91% 48%,98% 66%,82% 73%,76% 92%,58% 88%,42% 99%,30% 84%,12% 84%,11% 66%,1% 50%,12% 33%,8% 15%,26% 14%,36% 1%); }
.lcc-ic { position: relative; z-index: 1; color: var(--mc); }
.lcc.ready .lcc-medal::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--ex-ember) 50%, transparent); animation: lcc-rdy 2.4s ease-out infinite; }

.lcc-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.lcc-name { font-size: 13px; font-weight: 750; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lcc-meta { font-size: 10px; color: var(--ex-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lcc-foot { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
.lcc-pill { font-size: 9.5px; font-weight: 800; letter-spacing: 0.02em; padding: 2px 7px; border-radius: 999px; color: var(--mc);
  background: color-mix(in srgb, var(--mc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--mc) 30%, transparent); }
.lcc-rdy { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 800; color: var(--ex-ember); }
.lcc-blk { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 750; color: var(--ex-text-dim); }

@keyframes lcc-rdy { 0% { transform: scale(0.92); opacity: 0.7; } 80%, 100% { transform: scale(1.18); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .lcc { animation: none; } .lcc.ready .lcc-medal::after { animation: none; } }
</style>
