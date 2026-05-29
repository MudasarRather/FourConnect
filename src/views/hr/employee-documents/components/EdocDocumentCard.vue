<template>
  <Motion
    as="article"
    class="edoc-doc-card edoc-card is-hoverable"
    :initial="{ opacity: 0, y: 14 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.36, delay: index * 0.04, ease: EASE }"
    :whileHover="{ y: -3 }"
    @click="$emit('open', doc)"
  >
    <span v-if="selectable" class="card-select" :class="{ 'is-on': selected }" @click.stop="$emit('toggle', doc)">
      <Check v-if="selected" :size="12" />
    </span>

    <div class="card-top">
      <div class="doc-icon"><component :is="catIcon" :size="18" /></div>
      <EdocStatusChip :status="doc.verification_status" />
    </div>

    <h4 class="doc-title">{{ doc.title }}</h4>
    <div class="doc-type edoc-mono">{{ prettyType }}</div>

    <div class="doc-emp" v-if="doc.employee_name">
      <UserRound :size="12" />
      <span>{{ doc.employee_name }}</span>
      <span v-if="doc.employee_code" class="emp-code edoc-mono">{{ doc.employee_code }}</span>
    </div>

    <div class="card-foot">
      <span v-if="expiryBadge" class="expiry" :class="expiryBadge.cls">
        <CalendarClock :size="12" /> {{ expiryBadge.text }}
      </span>
      <span v-else class="expiry is-none"><Infinity :size="12" /> No expiry</span>

      <span class="file-flag" :class="{ 'has-file': doc.has_file }">
        <component :is="doc.has_file ? Paperclip : FileWarning" :size="12" />
        {{ doc.has_file ? 'File' : 'No file' }}
      </span>
    </div>

    <span v-if="doc.source === 'ONBOARDING'" class="src-tag">From onboarding</span>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Check, UserRound, CalendarClock, Paperclip, FileWarning, Infinity,
  IdCard, FileSignature, Award, ReceiptIndianRupee, ScrollText, Fingerprint,
  GraduationCap, ShieldCheck, FileText,
} from 'lucide-vue-next'
import EdocStatusChip from './EdocStatusChip.vue'

const EASE = [0.16, 1, 0.3, 1]
const props = defineProps({
  doc: { type: Object, required: true },
  index: { type: Number, default: 0 },
  selectable: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
})
defineEmits(['open', 'toggle'])

const CAT_ICON = {
  KYC: IdCard, CONTRACT: FileSignature, CERTIFICATE: Award, SALARY_SLIP: ReceiptIndianRupee,
  EXPERIENCE_LETTER: ScrollText, ID_PROOF: Fingerprint, EDUCATION: GraduationCap,
  COMPLIANCE: ShieldCheck, OTHER: FileText,
}
const catIcon = computed(() => CAT_ICON[props.doc.category] || FileText)
const prettyType = computed(() => (props.doc.doc_type || '').replace(/_/g, ' '))

const expiryBadge = computed(() => {
  const d = props.doc.days_to_expiry
  if (d == null) return null
  if (d < 0) return { text: `Expired ${Math.abs(d)}d ago`, cls: 'is-expired' }
  if (d <= 30) return { text: `${d}d left`, cls: 'is-soon' }
  if (d <= 90) return { text: `${d}d left`, cls: 'is-watch' }
  return { text: `${d}d left`, cls: 'is-ok' }
})
</script>

<style scoped>
.edoc-doc-card {
  position: relative; padding: 16px; display: flex; flex-direction: column; gap: 9px; cursor: pointer;
  min-height: 168px;
}
.card-select {
  position: absolute; top: 12px; left: 12px; width: 18px; height: 18px; border-radius: 6px;
  display: grid; place-items: center; border: 1.5px solid var(--hr-border-strong);
  background: rgba(0,0,0,0.3); color: #1a1a1c; z-index: 3; transition: all 0.18s var(--edoc-spring);
}
.card-select.is-on { background: var(--hr-accent-gold); border-color: var(--hr-accent-gold); }
.card-top { display: flex; align-items: center; justify-content: space-between; }
.doc-icon {
  display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px;
  background: var(--hr-accent-gold-soft); border: 1px solid var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
}
.doc-title { margin: 2px 0 0; font-size: 14.5px; font-weight: 700; color: var(--hr-text); line-height: 1.3; }
.doc-type { font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--hr-accent-gold); }
.doc-emp { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--hr-text-secondary); }
.emp-code { font-size: 10px; color: var(--hr-text-muted); padding: 1px 5px; background: rgba(255,255,255,0.05); border-radius: 5px; }
.card-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 8px; border-top: 1px solid var(--edoc-grid-line); }
.expiry { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 600; }
.expiry.is-ok { color: var(--hr-text-muted); }
.expiry.is-watch { color: var(--hr-accent-gold); }
.expiry.is-soon { color: var(--hr-orange); }
.expiry.is-expired { color: var(--edoc-expired); }
.expiry.is-none { color: var(--hr-text-dim); }
.file-flag { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 600; color: var(--hr-text-dim); }
.file-flag.has-file { color: var(--edoc-verified); }
.src-tag {
  position: absolute; bottom: 0; right: 0; font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--hr-orange); background: var(--hr-orange-soft);
  padding: 2px 8px; border-top-left-radius: 8px; border-bottom-right-radius: 15px;
}
[data-theme="light"] .doc-title { color: #1a1410; }
[data-theme="light"] .doc-emp { color: #44362a; }
[data-theme="light"] .emp-code { background: rgba(40,25,10,0.06); color: #6b5840; }
</style>
