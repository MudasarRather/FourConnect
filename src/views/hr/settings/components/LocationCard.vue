<template>
  <Motion as="article" class="lc"
    :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, delay: Math.min(index * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }"
    @mousemove="onMove" @mouseleave="onLeave">
    <div class="lc-inner" :style="[tiltStyle, { '--c': type.color }]">
      <span class="lc-glow" aria-hidden="true" />
      <span class="lc-spot" aria-hidden="true" />
      <span class="lc-spine" aria-hidden="true" />

      <header class="lc-head">
        <span class="lc-ic"><component :is="type.icon" :size="16" /></span>
        <div class="lc-id">
          <b>{{ location.name }}</b>
          <span class="lc-sub">
            <span class="lc-type">{{ type.label }}</span>
            <span v-if="location.code" class="lc-code set-mono"><Hash :size="8" />{{ location.code }}</span>
          </span>
        </div>
        <span v-if="type.key === 'hq'" class="lc-crown" title="Headquarters"><Crown :size="13" /></span>
      </header>

      <!-- live local clock instrument -->
      <div class="lc-clock" :class="{ off: !local, lit: local && open }">
        <div class="lc-clock-l">
          <template v-if="local">
            <div class="lc-time">
              <b class="set-mono">{{ local.label }}</b><span class="lc-sec set-mono">:{{ pad(local.ss) }}</span>
            </div>
            <span class="lc-off set-mono">{{ offLabel }} · local</span>
            <span class="lc-status" :data-on="open">
              <span class="lc-status-dot" />{{ open ? 'Business hours' : (isDay ? 'Daytime' : 'After hours') }}
            </span>
          </template>
          <template v-else>
            <div class="lc-time muted"><b>—:—</b></div>
            <span class="lc-off ghost"><AlertTriangle :size="10" /> No timezone set</span>
            <span class="lc-status missing">Add one to plot it on the map</span>
          </template>
        </div>

        <!-- sun-arc dial -->
        <div class="lc-dial">
          <svg viewBox="0 0 120 70" class="lc-arc">
            <defs>
              <linearGradient :id="`arc${uid}`" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#ea580c" /><stop offset="0.5" stop-color="#fcd34d" /><stop offset="1" stop-color="#ea580c" />
              </linearGradient>
            </defs>
            <path d="M10 60 A50 50 0 0 1 110 60" fill="none" :stroke="local && isDay ? `url(#arc${uid})` : 'rgba(255,238,205,0.14)'" stroke-width="2" stroke-linecap="round" class="lc-arc-track" />
            <line x1="10" y1="60" x2="110" y2="60" stroke="rgba(255,238,205,0.12)" stroke-width="1" />
            <g v-if="local && isDay">
              <circle :cx="sun.x" :cy="sun.y" r="6.5" fill="#fcd34d" class="lc-sun" />
              <circle :cx="sun.x" :cy="sun.y" r="11" fill="none" stroke="#fcd34d" stroke-width="1" opacity="0.4" />
            </g>
            <g v-else-if="local">
              <circle cx="60" cy="20" r="6" fill="rgba(255,238,205,0.7)" class="lc-moon" />
              <circle cx="63" cy="18" r="5" class="lc-moon-cut" />
            </g>
          </svg>
          <span class="lc-dial-cap">{{ local ? (isDay ? 'Day' : 'Night') : '' }}</span>
        </div>
      </div>

      <!-- geography -->
      <div class="lc-geo" v-if="place || location.timezone">
        <span v-if="place" class="lc-geo-chip"><MapPin :size="10" /> {{ place }}</span>
        <span v-if="location.timezone" class="lc-geo-chip ghost"><Clock3 :size="10" /> {{ location.timezone }}</span>
      </div>

      <!-- weekly-off rail -->
      <div class="lc-week">
        <span class="lc-week-lab">Weekly off</span>
        <div class="lc-week-days">
          <span v-for="d in week" :key="d.code" class="lc-day" :class="{ off: d.off }" :title="d.full + (d.off ? ' · off' : '')">{{ d.short }}</span>
        </div>
        <span v-if="woff.alternate_saturdays" class="lc-altsat" title="Alternate Saturdays off">alt&nbsp;S</span>
        <span v-if="!woff.days.length && !woff.alternate_saturdays" class="lc-week-none">not set</span>
      </div>

      <footer class="lc-foot">
        <button class="lc-stat" @click.stop="$emit('view', location)" title="View employees at this location">
          <Users :size="13" /><b>{{ headcount }}</b><span>{{ headcount === 1 ? 'person' : 'people' }}</span>
        </button>
        <span class="lc-foot-sp" />
        <button class="lc-act" @click.stop="$emit('edit', location)"><FilePen :size="13" /> Edit</button>
        <button class="lc-act danger" @click.stop="$emit('delete', location)" title="Delete location"><Trash2 :size="13" /></button>
      </footer>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Hash, Crown, MapPin, Clock3, Users, FilePen, Trash2, AlertTriangle,
  Building2, GitBranch, Wifi, Briefcase } from 'lucide-vue-next'
import { useNow, tzLocal, tzOffsetMinutes, offsetLabel, isBusinessHours, isDaylight, WEEKDAYS, normalizeWeeklyOff } from '../composables/useLocationClock'

const props = defineProps({
  location: { type: Object, required: true },
  index: { type: Number, default: 0 },
  headcount: { type: Number, default: 0 },
})
defineEmits(['edit', 'delete', 'view'])

const uid = Math.random().toString(36).slice(2, 7)
const now = useNow()
const pad = (n) => String(n).padStart(2, '0')

const TYPE = {
  HQ: { key: 'hq', label: 'Headquarters', color: 'var(--set-gold)', icon: Building2 },
  BRANCH: { key: 'branch', label: 'Branch', color: 'var(--set-orange)', icon: GitBranch },
  REMOTE: { key: 'remote', label: 'Remote', color: 'var(--set-ok)', icon: Wifi },
  CLIENT_SITE: { key: 'client', label: 'Client site', color: 'var(--set-deep)', icon: Briefcase },
}
const type = computed(() => TYPE[props.location.type] || TYPE.HQ)
const local = computed(() => tzLocal(props.location.timezone, now.value))
const off = computed(() => tzOffsetMinutes(props.location.timezone, now.value))
const offLabel = computed(() => offsetLabel(off.value))
const open = computed(() => (local.value ? isBusinessHours(local.value.minutes) : false))
const isDay = computed(() => (local.value ? isDaylight(local.value.hh) : false))
const place = computed(() => [props.location.city, props.location.state, props.location.country].filter(Boolean).join(', '))

const woff = computed(() => normalizeWeeklyOff(props.location.weekly_off_pattern))
const week = computed(() => WEEKDAYS.map((w) => ({ ...w, off: woff.value.days.includes(w.code) })))

const sun = computed(() => {
  const m = local.value?.minutes ?? 12 * 60
  const prog = Math.max(0, Math.min(1, (m - 6 * 60) / (12 * 60)))   // 06:00→0  18:00→1
  const t = prog * Math.PI
  return { x: (60 - 50 * Math.cos(t)).toFixed(1), y: (60 - 50 * Math.sin(t)).toFixed(1) }
})

const tiltStyle = ref({})
const onMove = (e) => {
  const r = e.currentTarget?.getBoundingClientRect?.(); if (!r) return
  const mx = (e.clientX - r.left) / r.width, my = (e.clientY - r.top) / r.height
  tiltStyle.value = { transform: `rotateY(${(mx - 0.5) * 6}deg) rotateX(${(0.5 - my) * 6}deg)`,
    '--mx': mx * 100 + '%', '--my': my * 100 + '%', '--lit': 1 }
}
const onLeave = () => { tiltStyle.value = { transform: 'rotateY(0deg) rotateX(0deg)', '--lit': 0 } }
</script>

<style scoped>
.lc { position: relative; border-radius: 18px; perspective: 950px; }
.lc-inner { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; height: 100%; padding: 16px;
  border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  transform-style: preserve-3d; transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s, border-color 0.3s; }
.lc:hover .lc-inner { border-color: var(--set-border-warm); box-shadow: var(--set-card-shadow-hover); }
.lc-glow { position: absolute; inset: -1px; border-radius: 18px; pointer-events: none; opacity: 0; transition: opacity 0.3s;
  background: radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--c) 26%, transparent), transparent 70%); }
.lc:hover .lc-glow { opacity: 1; }
.lc-spot { position: absolute; inset: 0; pointer-events: none; border-radius: 18px; opacity: calc(var(--lit, 0) * 0.9); transition: opacity 0.25s;
  background: radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--c) 15%, transparent), transparent 60%); }
.lc-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 30%, transparent)); box-shadow: 0 0 12px -2px var(--c); }

.lc-head { position: relative; display: flex; align-items: center; gap: 11px; }
.lc-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.lc-id { flex: 1; min-width: 0; }
.lc-id b { display: block; font-size: 14.5px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lc-sub { display: inline-flex; align-items: center; gap: 8px; margin-top: 2px; }
.lc-type { font-size: 10px; font-weight: 750; color: var(--c); }
.lc-code { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; color: var(--set-text-muted); }
.lc-crown { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; color: var(--set-gold);
  background: color-mix(in srgb, var(--set-gold) 13%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 30%, transparent); }

/* clock */
.lc-clock { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 13px; border-radius: 13px;
  background: var(--set-panel); border: 1px solid var(--set-border); overflow: hidden; transition: border-color 0.3s, box-shadow 0.3s; }
.lc-clock.lit { border-color: color-mix(in srgb, var(--c) 32%, transparent); box-shadow: inset 0 0 24px -14px var(--c); }
.lc-clock-l { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.lc-time { display: flex; align-items: baseline; gap: 1px; }
.lc-time b { font-size: 24px; font-weight: 850; line-height: 1; color: var(--set-text); letter-spacing: 0.5px; }
.lc-time.muted b { color: var(--set-text-dim); }
.lc-sec { font-size: 12px; font-weight: 700; color: var(--set-text-muted); }
.lc-off { font-size: 10px; font-weight: 700; color: var(--set-gold); }
.lc-off.ghost { display: inline-flex; align-items: center; gap: 4px; color: var(--set-partial); }
.lc-off.ghost :deep(svg) { color: var(--set-partial); }
.lc-status { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 700; color: var(--set-text-muted); }
.lc-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--set-text-dim); transition: background 0.3s, box-shadow 0.3s; }
.lc-status[data-on="true"] { color: var(--set-ok); }
.lc-status[data-on="true"] .lc-status-dot { background: var(--set-ok); box-shadow: 0 0 8px var(--set-ok); animation: set-led-pulse 1.8s ease-in-out infinite; }
.lc-status.missing { font-size: 9.5px; color: var(--set-text-dim); }
.lc-dial { display: flex; flex-direction: column; align-items: center; gap: 1px; flex-shrink: 0; }
.lc-arc { width: 76px; height: 44px; }
.lc-sun { filter: drop-shadow(0 0 5px var(--set-gold-bright)); transition: cx 0.6s linear, cy 0.6s linear; }
.lc-moon-cut { fill: var(--set-panel); }
.lc-clock.lit .lc-moon-cut { fill: var(--set-panel); }
.lc-dial-cap { font-size: 8px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }

/* geo */
.lc-geo { display: flex; flex-wrap: wrap; gap: 6px; }
.lc-geo-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; color: var(--set-text-secondary);
  padding: 4px 9px; border-radius: 999px; background: var(--set-surface-elevated); border: 1px solid var(--set-border); max-width: 100%; overflow: hidden; }
.lc-geo-chip :deep(svg) { color: var(--c); flex-shrink: 0; }
.lc-geo-chip.ghost :deep(svg) { color: var(--set-text-muted); }
.lc-geo-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* weekly off */
.lc-week { display: flex; align-items: center; gap: 9px; }
.lc-week-lab { font-size: 9px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; color: var(--set-text-dim); flex-shrink: 0; }
.lc-week-days { display: flex; gap: 4px; }
.lc-day { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; font-size: 9.5px; font-weight: 800;
  color: var(--set-text-dim); background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.lc-day.off { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 32%, transparent); }
.lc-altsat { font-size: 9px; font-weight: 800; color: var(--set-ok); padding: 3px 7px; border-radius: 999px;
  background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 30%, transparent); white-space: nowrap; }
.lc-week-none { font-size: 9.5px; color: var(--set-text-dim); }

.lc-foot { position: relative; display: flex; align-items: center; gap: 7px; margin-top: auto; padding-top: 2px; }
.lc-foot-sp { flex: 1; }
.lc-stat { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 10px; cursor: pointer; font: inherit;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); color: var(--set-text-muted); transition: all 0.2s; }
.lc-stat:hover { color: var(--c); border-color: color-mix(in srgb, var(--c) 36%, transparent); transform: translateY(-1px); }
.lc-stat :deep(svg) { color: var(--c); flex-shrink: 0; }
.lc-stat b { font-size: 13.5px; font-weight: 850; color: var(--set-text); }
.lc-stat span { font-size: 10px; }
.lc-act { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 600;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.lc-act:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.lc-act.danger { padding: 6px 9px; }
.lc-act.danger:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 40%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .lc-inner { transition: none; transform: none !important; }
  .lc-sun { transition: none; }
  .lc-status[data-on="true"] .lc-status-dot { animation: none; }
}
</style>
