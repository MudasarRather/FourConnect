<template>
  <div class="lpp">
    <div class="lpp-sheet">
      <div class="lpp-mast">
        <div><span class="lpp-brand">Fourreck</span><span class="lpp-sub">Human Resources</span></div>
        <div class="lpp-ref">Ref: {{ c?.employee_code || '—' }}<br/>{{ today }}</div>
      </div>
      <h3 class="lpp-h">{{ isRelieving ? 'RELIEVING LETTER' : 'EXPERIENCE CERTIFICATE' }}</h3>
      <p v-if="isRelieving" class="lpp-body">
        This is to certify that <b>{{ c?.employee_name || '—' }}</b> ({{ c?.employee_code }}), who served as
        <b>{{ c?.designation_name || '—' }}</b> in {{ c?.department_name || '—' }}, has been relieved from the
        services of Fourreck with effect from <b>{{ fmtDate(c?.last_working_date) }}</b>. All dues and clearances
        are complete and the full &amp; final settlement has been processed.
      </p>
      <p v-else class="lpp-body">
        This is to certify that <b>{{ c?.employee_name || '—' }}</b> ({{ c?.employee_code }}) was employed with
        Fourreck as <b>{{ c?.designation_name || '—' }}</b> in {{ c?.department_name || '—' }} from
        <b>{{ fmtDate(c?.joining_date_snapshot || c?.resignation_date) }}</b> to <b>{{ fmtDate(c?.last_working_date) }}</b>.
        Conduct and performance during the tenure were found satisfactory.
      </p>
      <div class="lpp-foot">
        <span class="lpp-sign">Authorised Signatory<br/>Fourreck — HR</span>
        <span class="lpp-qr"><span class="qr-grid"><i v-for="n in 36" :key="n" :class="{ on: (n * 7 + 3) % 5 < 2 }" /></span>verify</span>
      </div>
      <span class="lpp-ribbon" />
      <span v-if="watermark" class="lpp-wm">{{ watermark }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { fmtDate } from '@/composables/useExit'
const props = defineProps({
  c: { type: Object, default: null },
  letterType: { type: String, default: 'experience-letter' },
  status: { type: String, default: 'NOT_GENERATED' },
})
const isRelieving = computed(() => props.letterType === 'relieving-letter')
const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const watermark = computed(() => props.status === 'REVOKED' ? 'REVOKED' : props.status === 'NOT_GENERATED' ? 'DRAFT' : '')
</script>

<style scoped>
.lpp { display: flex; justify-content: center; }
.lpp-sheet { position: relative; overflow: hidden; width: 100%; max-width: 420px; aspect-ratio: 1 / 1.3; padding: 22px;
  background: #fbf8f2; color: #2a2030; border-radius: 6px; box-shadow: 0 18px 50px rgba(0,0,0,0.4); font-size: 11px; line-height: 1.6; }
.lpp-mast { display: flex; justify-content: space-between; border-bottom: 2.5px solid #ea580c; padding-bottom: 9px; }
.lpp-brand { font-size: 19px; font-weight: 800; background: linear-gradient(120deg,#d97706,#ea580c); -webkit-background-clip: text; background-clip: text; color: transparent; display: block; }
.lpp-sub { font-size: 7px; letter-spacing: 2px; text-transform: uppercase; color: #6b5f78; }
.lpp-ref { font-size: 8px; color: #6b5f78; text-align: right; }
.lpp-h { font-size: 12px; letter-spacing: 2px; text-align: center; color: #b45309; margin: 22px 0 16px; }
.lpp-body { margin: 0 0 12px; }
.lpp-foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; }
.lpp-sign { font-size: 9px; }
.lpp-qr { display: flex; flex-direction: column; align-items: center; font-size: 7px; color: #8a7f9a; }
.qr-grid { display: grid; grid-template-columns: repeat(6, 5px); grid-auto-rows: 5px; gap: 1px; margin-bottom: 3px; }
.qr-grid i { background: #ece6f0; border-radius: 1px; } .qr-grid i.on { background: #2a2030; }
.lpp-ribbon { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: linear-gradient(90deg,#fcd34d,#fb923c,#fb923c); }
.lpp-wm { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-22deg); font-size: 52px; font-weight: 900; color: rgba(234,88,12,0.08); letter-spacing: 6px; pointer-events: none; }
</style>
