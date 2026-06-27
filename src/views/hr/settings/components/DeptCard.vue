<template>
  <Motion as="article" class="dc"
    :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }"
    @mousemove="onMove" @mouseleave="onLeave">
    <!-- tilt happens on an inner wrapper so it never fights motion-v's entrance transform -->
    <div class="dc-inner" :style="tiltStyle">
      <span class="dc-glow" aria-hidden="true" />
      <span class="dc-spotlight" aria-hidden="true" />
      <span class="dc-spine" aria-hidden="true" />

      <header class="dc-head">
        <span class="dc-ic"><component :is="dept.parent_department_id ? GitBranch : Building2" :size="16" /></span>
        <div class="dc-id">
          <b>{{ dept.name }}</b>
          <span class="dc-code set-mono"><Hash :size="9" />{{ dept.code }}</span>
        </div>
        <span class="dc-tier" :data-top="!dept.parent_department_id">
          {{ dept.parent_department_id ? 'Sub-dept' : 'Top-level' }}
        </span>
      </header>

      <div class="dc-hier">
        <template v-if="dept.parent_department_id">
          <Corner :size="12" /> Under <b @click.stop="$emit('go-parent', dept.parent_department_id)">{{ parentName || '—' }}</b>
        </template>
        <template v-else-if="childrenCount">
          <GitBranch :size="12" /> Parent of <b>{{ childrenCount }}</b> sub-department{{ childrenCount === 1 ? '' : 's' }}
        </template>
        <template v-else>
          <Minus :size="12" /> Standalone unit
        </template>
      </div>

      <!-- headcount instrument -->
      <div class="dc-people">
        <div class="dc-people-top">
          <span class="dc-people-lab"><Users :size="11" /> Headcount</span>
          <b class="dc-people-n">{{ headcount }}</b>
        </div>
        <div class="dc-bar"><span class="dc-bar-fill" :style="{ width: barPct + '%' }" /></div>
      </div>

      <div class="dc-meta">
        <span class="dc-chip" :class="{ ghost: !dept.cost_center }">
          <Landmark :size="10" /> {{ dept.cost_center || 'No cost centre' }}
        </span>
        <span class="dc-chip" :class="{ ok: !!dept.head_employee_id, ghost: !dept.head_employee_id }">
          <Crown :size="10" /> {{ headName || (dept.head_employee_id ? 'Head assigned' : 'No head') }}
        </span>
      </div>

      <footer class="dc-foot">
        <button class="dc-act" @click.stop="$emit('view', dept)" title="View people in this department">
          <Users :size="13" /> People
        </button>
        <span class="dc-foot-sp" />
        <button class="dc-act" @click.stop="$emit('edit', dept)"><FilePen :size="13" /> Edit</button>
        <button class="dc-act danger" @click.stop="$emit('delete', dept)" title="Delete department"><Trash2 :size="13" /></button>
      </footer>
    </div>
  </Motion>
</template>

<script setup>
import { ref } from 'vue'
import { Motion } from 'motion-v'
import { Building2, GitBranch, Hash, Users, Landmark, Crown, FilePen, Trash2, CornerDownRight as Corner, Minus } from 'lucide-vue-next'

defineProps({
  dept: { type: Object, required: true },
  headcount: { type: Number, default: 0 },
  childrenCount: { type: Number, default: 0 },
  parentName: { type: String, default: '' },
  headName: { type: String, default: '' },
  barPct: { type: Number, default: 0 },
  index: { type: Number, default: 0 },
})
defineEmits(['edit', 'delete', 'view', 'go-parent'])

const tiltStyle = ref({})
const onMove = (e) => {
  const r = e.currentTarget?.getBoundingClientRect?.(); if (!r) return
  const mx = (e.clientX - r.left) / r.width
  const my = (e.clientY - r.top) / r.height
  tiltStyle.value = {
    transform: `rotateY(${(mx - 0.5) * 7}deg) rotateX(${(0.5 - my) * 7}deg)`,
    '--mx': (mx * 100) + '%', '--my': (my * 100) + '%', '--lit': 1,
  }
}
const onLeave = () => { tiltStyle.value = { transform: 'rotateY(0deg) rotateX(0deg)', '--lit': 0 } }
</script>

<style scoped>
.dc { position: relative; border-radius: 18px; perspective: 950px; }
.dc-inner { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; height: 100%; padding: 16px;
  border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border);
  box-shadow: var(--set-card-shadow); transform-style: preserve-3d;
  transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s, border-color 0.3s; }
.dc:hover .dc-inner { border-color: var(--set-border-warm); box-shadow: var(--set-card-shadow-hover); }
.dc-glow { position: absolute; inset: -1px; border-radius: 18px; pointer-events: none; opacity: 0;
  background: radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--set-gold) 26%, transparent), transparent 70%);
  transition: opacity 0.3s; }
.dc:hover .dc-glow { opacity: 1; }
.dc-spotlight { position: absolute; inset: 0; pointer-events: none; border-radius: 18px;
  background: radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--set-gold) 16%, transparent), transparent 60%);
  opacity: calc(var(--lit, 0) * 0.9); transition: opacity 0.25s; }
.dc-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--set-gold), color-mix(in srgb, var(--set-orange) 50%, transparent)); }

.dc-head { position: relative; display: flex; align-items: center; gap: 11px; }
.dc-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--set-gold);
  background: color-mix(in srgb, var(--set-gold) 13%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 28%, transparent); }
.dc-id { flex: 1; min-width: 0; }
.dc-id b { display: block; font-size: 14.5px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dc-code { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; color: var(--set-text-muted); }
.dc-tier { flex-shrink: 0; font-size: 8.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px;
  color: var(--set-orange); background: color-mix(in srgb, var(--set-orange) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-orange) 28%, transparent); }
.dc-tier[data-top="true"] { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 12%, transparent); border-color: color-mix(in srgb, var(--set-gold) 30%, transparent); }

.dc-hier { position: relative; display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--set-text-muted); }
.dc-hier :deep(svg) { color: var(--set-text-dim); flex-shrink: 0; }
.dc-hier b { color: var(--set-text-secondary); font-weight: 700; cursor: pointer; }
.dc-hier b:hover { color: var(--set-gold); }

.dc-people { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 11px 12px; border-radius: 12px;
  background: var(--set-panel); border: 1px solid var(--set-border); }
.dc-people-top { display: flex; align-items: center; justify-content: space-between; }
.dc-people-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.dc-people-lab :deep(svg) { color: var(--set-gold); }
.dc-people-n { font-size: 16px; font-weight: 850; color: var(--set-text); }
.dc-bar { height: 6px; border-radius: 6px; overflow: hidden; background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.dc-bar-fill { display: block; height: 100%; border-radius: 6px; background: var(--set-grad-hero);
  box-shadow: 0 0 10px -2px var(--set-gold); transition: width 0.7s cubic-bezier(0.16,1,0.3,1); }

.dc-meta { position: relative; display: flex; flex-wrap: wrap; gap: 6px; }
.dc-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 650; color: var(--set-text-secondary);
  padding: 4px 9px; border-radius: 999px; background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.dc-chip :deep(svg) { color: var(--set-text-muted); }
.dc-chip.ok { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 30%, transparent); }
.dc-chip.ok :deep(svg) { color: var(--set-ok); }
.dc-chip.ghost { color: var(--set-text-dim); }

.dc-foot { position: relative; display: flex; align-items: center; gap: 7px; margin-top: auto; padding-top: 4px; }
.dc-foot-sp { flex: 1; }
.dc-act { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 600;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.dc-act:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.dc-act.danger { padding: 6px 9px; }
.dc-act.danger:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 40%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .dc-inner, .dc-bar-fill { transition: none; }
}
</style>
