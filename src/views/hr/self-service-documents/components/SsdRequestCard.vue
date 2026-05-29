<template>
  <Motion as="article"
    class="ssd-req-card"
    :class="`status-${(req.status || 'PENDING').toLowerCase()}`"
    :initial="{ opacity: 0, y: 10 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.4, delay: 0.04 * (index || 0), ease: [0.22, 1, 0.36, 1] }"
  >
    <header class="req-head">
      <span class="req-icon"><Send :size="14" /></span>
      <div class="req-head-text">
        <span class="req-eyebrow">{{ typeMeta.tag }} request</span>
        <h4 class="req-title">{{ typeLabel }}</h4>
      </div>
      <span class="req-pill" :style="{ '--p-fg': tone.fg, '--p-bg': tone.bg }">
        <span class="req-pill-dot" />
        {{ tone.label }}
      </span>
    </header>

    <p class="req-reason">{{ req.reason }}</p>

    <div class="req-meta">
      <span v-if="req.purpose" class="req-chip">
        <Target :size="10" />
        <span>{{ req.purpose }}</span>
      </span>
      <span class="req-chip" :title="`Submitted ${formatDate(req.created_at)}`">
        <Clock :size="10" />
        <span>{{ relativeDate(req.created_at) }}</span>
      </span>
      <span v-if="req.assigned_to_name" class="req-chip">
        <User :size="10" />
        <span>{{ req.assigned_to_name }}</span>
      </span>
    </div>

    <div v-if="req.decision_notes && (req.status === 'REJECTED' || req.status === 'FULFILLED' || req.status === 'IN_PROGRESS')"
         class="req-decision">
      <strong>HR note:</strong>
      <span>{{ req.decision_notes }}</span>
    </div>

    <div class="req-foot">
      <span class="req-eta">
        <Hourglass :size="11" />
        ETA: {{ typeMeta.eta }}
      </span>
      <Motion v-if="req.status === 'PENDING'"
        as="button"
        class="req-cancel"
        :whileHover="{ y: -1 }"
        :whileTap="{ scale: 0.95 }"
        :disabled="cancelling"
        @click="onCancel"
      >
        <X :size="11" />
        <span>{{ cancelling ? 'Cancelling…' : 'Cancel' }}</span>
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { Send, Clock, User, Target, Hourglass, X } from 'lucide-vue-next'
import { REQUEST_TYPES, REQUEST_STATUS_TONE } from '@/composables/useSelfServiceDocuments'

const props = defineProps({
  req:   { type: Object, required: true },
  index: { type: Number, default: 0 },
})

const emit = defineEmits(['cancel'])
const cancelling = ref(false)

const typeMeta = computed(() =>
  REQUEST_TYPES.find(t => t.key === props.req.request_type) || REQUEST_TYPES[REQUEST_TYPES.length - 1]
)
const typeLabel = computed(() =>
  props.req.request_type === 'CUSTOM' && props.req.custom_title
    ? props.req.custom_title
    : typeMeta.value.label
)
const tone = computed(() => REQUEST_STATUS_TONE[props.req.status] || REQUEST_STATUS_TONE.PENDING)

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
function relativeDate(d) {
  if (!d) return ''
  const ms = Date.now() - new Date(d).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return m <= 1 ? 'Just now' : `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const day = Math.floor(h / 24)
  if (day < 30) return `${day}d ago`
  return formatDate(d)
}

async function onCancel() {
  if (cancelling.value) return
  cancelling.value = true
  try { emit('cancel', props.req) }
  finally { setTimeout(() => { cancelling.value = false }, 600) }
}
</script>

<style scoped>
.ssd-req-card {
  position: relative;
  padding: 16px 18px 14px;
  border-radius: 16px;
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(251, 191, 36, 0.12), transparent 60%),
    rgba(20, 15, 12, 0.78);
  border: 1px solid rgba(251, 191, 36, 0.20);
  display: flex; flex-direction: column; gap: 10px;
  isolation: isolate;
  transition: border-color .25s, transform .25s var(--ssd-spring), box-shadow .25s;
}
[data-theme="light"] .ssd-req-card {
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(251, 191, 36, 0.18), transparent 60%),
    rgba(255, 250, 240, 0.96);
  border-color: rgba(180, 83, 9, 0.22);
}
.ssd-req-card:hover {
  border-color: rgba(251, 146, 60, 0.45);
  box-shadow: 0 22px 50px -28px rgba(251, 146, 60, 0.35);
}
.ssd-req-card.status-fulfilled { border-color: rgba(13, 148, 136, 0.40); }
.ssd-req-card.status-rejected  { border-color: rgba(220, 38, 38, 0.40); }
.ssd-req-card.status-cancelled { opacity: 0.7; }

.req-head { display: flex; align-items: flex-start; gap: 10px; }
.req-icon {
  width: 32px; height: 32px;
  flex-shrink: 0;
  border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(251, 191, 36, 0.06));
  color: var(--ssd-gold-400);
  border: 1px solid rgba(251, 191, 36, 0.34);
}
[data-theme="light"] .req-icon { color: var(--ssd-amber-600); }
.req-head-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.req-eyebrow {
  font-size: 9px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;
  color: var(--ssd-gold-400);
}
[data-theme="light"] .req-eyebrow { color: var(--ssd-amber-600); }
.req-title {
  margin: 0; font-size: 14px; font-weight: 800; letter-spacing: -0.01em;
  color: var(--hr-text); line-height: 1.3;
}
.req-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.4px;
  background: var(--p-bg);
  color: var(--p-fg);
}
.req-pill-dot {
  width: 5px; height: 5px; border-radius: 50%; background: var(--p-fg);
}

.req-reason {
  margin: 0; font-size: 12px; line-height: 1.5;
  color: var(--hr-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.req-meta { display: flex; flex-wrap: wrap; gap: 5px; }
.req-chip {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.18);
  color: var(--hr-text);
}
[data-theme="light"] .req-chip { background: rgba(255, 250, 240, 0.65); border-color: rgba(180, 83, 9, 0.20); color: var(--ssd-amber-800); }

.req-decision {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(2, 132, 199, 0.10);
  border: 1px solid rgba(2, 132, 199, 0.28);
  font-size: 11px; line-height: 1.4;
  color: #7dd3fc;
}
.req-decision strong {
  display: block; font-weight: 800; letter-spacing: 0.4px; font-size: 9.5px;
  text-transform: uppercase; margin-bottom: 2px;
}
[data-theme="light"] .req-decision { color: #0369a1; }

.req-foot {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 4px;
  border-top: 1px dashed rgba(251, 191, 36, 0.18);
  margin-top: auto;
}
[data-theme="light"] .req-foot { border-top-color: rgba(180, 83, 9, 0.22); }
.req-eta {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700;
  color: var(--hr-text-muted);
  letter-spacing: 0.2px;
}
.req-cancel {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 9px;
  border-radius: 8px;
  font: inherit; font-size: 10px; font-weight: 800; letter-spacing: 0.3px;
  background: rgba(220, 38, 38, 0.12);
  border: 1px solid rgba(220, 38, 38, 0.32);
  color: #fca5a5;
  cursor: pointer;
  transition: background .2s, border-color .2s;
}
.req-cancel:hover { background: rgba(220, 38, 38, 0.22); border-color: rgba(220, 38, 38, 0.55); }
[data-theme="light"] .req-cancel { background: rgba(254, 226, 226, 0.85); color: #b91c1c; border-color: rgba(185, 28, 28, 0.32); }
</style>
