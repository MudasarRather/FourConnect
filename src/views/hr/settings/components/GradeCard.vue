<template>
  <Motion as="article" class="gc"
    :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }"
    @mousemove="onMove" @mouseleave="onLeave">
    <div class="gc-inner" :style="tiltStyle">
      <span class="gc-glow" aria-hidden="true" />
      <span class="gc-spotlight" aria-hidden="true" />
      <span class="gc-spine" aria-hidden="true" />

      <header class="gc-head">
        <span class="gc-ic"><Layers :size="16" /></span>
        <div class="gc-id">
          <b>{{ grade.name }}</b>
          <span class="gc-code set-mono"><Hash :size="9" />{{ grade.code }}</span>
        </div>
        <span v-if="grade.level != null" class="gc-level">L{{ grade.level }}</span>
      </header>

      <div class="gc-tags">
        <span class="gc-chip" :class="{ ghost: !grade.band }"><Tag :size="10" /> {{ grade.band || 'No band label' }}</span>
        <span class="gc-chip" :class="{ ok: !!grade.default_pay_level, ghost: !grade.default_pay_level }">
          <Gauge :size="10" /> {{ grade.default_pay_level || 'No pay level' }}
        </span>
        <span v-if="overlap" class="gc-chip warn"><AlertTriangle :size="10" /> Band overlap</span>
      </div>

      <!-- CTC band instrument -->
      <div class="gc-band">
        <div class="gc-band-top">
          <span class="gc-band-lab"><IndianRupee :size="11" /> Annual CTC band</span>
          <b v-if="hasBand" class="gc-band-rng set-mono">₹{{ loText }} – ₹{{ hiText }}</b>
          <b v-else class="gc-band-rng none">Not set</b>
        </div>
        <div class="gc-track">
          <span v-if="hasBand" class="gc-track-fill" :style="{ left: leftPct + '%', width: Math.max(3, widthPct) + '%' }" :data-overlap="overlap" />
          <span v-else class="gc-track-empty">add a min &amp; max CTC to place this on the ladder</span>
        </div>
      </div>

      <div class="gc-stats">
        <button class="gc-stat" @click.stop="$emit('view', grade)" title="View people in this grade">
          <Users :size="13" /><b>{{ headcount }}</b><span>people</span>
        </button>
        <div class="gc-stat">
          <BadgeCheck :size="13" /><b>{{ designationCount }}</b><span>title{{ designationCount === 1 ? '' : 's' }}</span>
        </div>
      </div>

      <footer class="gc-foot">
        <span class="gc-foot-sp" />
        <button class="gc-act" @click.stop="$emit('edit', grade)"><FilePen :size="13" /> Edit</button>
        <button class="gc-act danger" @click.stop="$emit('delete', grade)" title="Delete grade"><Trash2 :size="13" /></button>
      </footer>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Layers, Hash, Tag, Gauge, AlertTriangle, IndianRupee, Users, BadgeCheck, FilePen, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  grade: { type: Object, required: true },
  headcount: { type: Number, default: 0 },
  designationCount: { type: Number, default: 0 },
  overlap: { type: Boolean, default: false },
  loText: { type: String, default: '' },
  hiText: { type: String, default: '' },
  leftPct: { type: Number, default: 0 },
  widthPct: { type: Number, default: 0 },
  index: { type: Number, default: 0 },
})
defineEmits(['edit', 'delete', 'view'])

const hasBand = computed(() => props.grade.min_ctc != null || props.grade.max_ctc != null)

const tiltStyle = ref({})
const onMove = (e) => {
  const r = e.currentTarget?.getBoundingClientRect?.(); if (!r) return
  const mx = (e.clientX - r.left) / r.width, my = (e.clientY - r.top) / r.height
  tiltStyle.value = {
    transform: `rotateY(${(mx - 0.5) * 7}deg) rotateX(${(0.5 - my) * 7}deg)`,
    '--mx': (mx * 100) + '%', '--my': (my * 100) + '%', '--lit': 1,
  }
}
const onLeave = () => { tiltStyle.value = { transform: 'rotateY(0deg) rotateX(0deg)', '--lit': 0 } }
</script>

<style scoped>
.gc { position: relative; border-radius: 18px; perspective: 950px; }
.gc-inner { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; height: 100%; padding: 16px;
  border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  transform-style: preserve-3d; transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s, border-color 0.3s; }
.gc:hover .gc-inner { border-color: var(--set-border-warm); box-shadow: var(--set-card-shadow-hover); }
.gc-glow { position: absolute; inset: -1px; border-radius: 18px; pointer-events: none; opacity: 0;
  background: radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--set-gold) 26%, transparent), transparent 70%); transition: opacity 0.3s; }
.gc:hover .gc-glow { opacity: 1; }
.gc-spotlight { position: absolute; inset: 0; pointer-events: none; border-radius: 18px;
  background: radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--set-gold) 16%, transparent), transparent 60%);
  opacity: calc(var(--lit, 0) * 0.9); transition: opacity 0.25s; }
.gc-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--set-gold), color-mix(in srgb, var(--set-orange) 50%, transparent)); }

.gc-head { position: relative; display: flex; align-items: center; gap: 11px; }
.gc-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--set-gold);
  background: color-mix(in srgb, var(--set-gold) 13%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 28%, transparent); }
.gc-id { flex: 1; min-width: 0; }
.gc-id b { display: block; font-size: 14.5px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gc-code { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; color: var(--set-text-muted); }
.gc-level { flex-shrink: 0; font-size: 10px; font-weight: 850; font-family: var(--set-mono); color: var(--set-gold); padding: 3px 9px; border-radius: 999px;
  background: color-mix(in srgb, var(--set-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 30%, transparent); }

.gc-tags { position: relative; display: flex; flex-wrap: wrap; gap: 6px; }
.gc-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 650; color: var(--set-text-secondary);
  padding: 4px 9px; border-radius: 999px; background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.gc-chip :deep(svg) { color: var(--set-text-muted); }
.gc-chip.ok { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 30%, transparent); }
.gc-chip.ok :deep(svg) { color: var(--set-ok); }
.gc-chip.warn { color: var(--set-partial); background: var(--set-partial-soft); border-color: color-mix(in srgb, var(--set-partial) 30%, transparent); }
.gc-chip.warn :deep(svg) { color: var(--set-partial); }
.gc-chip.ghost { color: var(--set-text-dim); }

.gc-band { position: relative; display: flex; flex-direction: column; gap: 7px; padding: 11px 12px; border-radius: 12px; background: var(--set-panel); border: 1px solid var(--set-border); }
.gc-band-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.gc-band-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); }
.gc-band-lab :deep(svg) { color: var(--set-gold); }
.gc-band-rng { font-size: 12.5px; font-weight: 800; color: var(--set-text); }
.gc-band-rng.none { color: var(--set-text-dim); font-weight: 600; }
.gc-track { position: relative; height: 8px; border-radius: 6px; background: var(--set-surface-elevated); border: 1px solid var(--set-border); overflow: hidden; }
.gc-track-fill { position: absolute; top: 0; bottom: 0; border-radius: 6px; background: var(--set-grad-hero); box-shadow: 0 0 10px -2px var(--set-gold);
  transform-origin: left; animation: gc-grow 0.7s cubic-bezier(0.16,1,0.3,1) both; }
.gc-track-fill[data-overlap="true"] { background: linear-gradient(90deg, var(--set-partial), var(--set-orange)); }
.gc-track-empty { position: absolute; inset: 0; display: flex; align-items: center; padding-left: 8px; font-size: 8.5px; color: var(--set-text-dim); white-space: nowrap; overflow: hidden; }
@keyframes gc-grow { from { transform: scaleX(0); opacity: 0; } to { transform: scaleX(1); opacity: 1; } }

.gc-stats { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.gc-stat { display: inline-flex; align-items: center; gap: 6px; padding: 8px 11px; border-radius: 10px; font: inherit; cursor: default;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); color: var(--set-text-muted); }
button.gc-stat { cursor: pointer; transition: all 0.2s; }
button.gc-stat:hover { color: var(--set-gold); border-color: color-mix(in srgb, var(--set-gold) 36%, transparent); transform: translateY(-1px); }
.gc-stat :deep(svg) { color: var(--set-gold); flex-shrink: 0; }
.gc-stat b { font-size: 14px; font-weight: 850; color: var(--set-text); }
.gc-stat span { font-size: 10.5px; }

.gc-foot { position: relative; display: flex; align-items: center; gap: 7px; margin-top: auto; padding-top: 2px; }
.gc-foot-sp { flex: 1; }
.gc-act { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 600;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.gc-act:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.gc-act.danger { padding: 6px 9px; }
.gc-act.danger:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 40%, transparent); }

@media (prefers-reduced-motion: reduce) { .gc-inner, .gc-track-fill { transition: none; animation: none; transform: none; } }
</style>
