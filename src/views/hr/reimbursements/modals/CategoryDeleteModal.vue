<template>
  <Teleport to="body">
    <div class="rmb-overlay cd-overlay" @mousedown.self="$emit('close')">
      <Motion as="div" class="rmb-modal rmb-receipt cd-modal" :style="{ '--cat': accent }"
              :initial="{ opacity: 0, scale: 0.94, y: 20 }"
              :animate="{ opacity: 1, scale: 1, y: 0 }"
              :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">

        <header class="cd-head" ref="headRef">
          <span class="cd-aura" aria-hidden="true" />
          <span class="cd-grid" aria-hidden="true" />
          <span class="rmb-spotlight" aria-hidden="true" />
          <span class="rmb-grain" aria-hidden="true" />
          <div class="cd-head-row">
            <span class="cd-eyebrow rmb-mono"><Trash2 :size="12" /> Delete category</span>
            <button class="x" @click="$emit('close')" aria-label="Close"><X :size="17" /></button>
          </div>
          <div class="cd-id">
            <span class="cd-ic"><component :is="meta.icon" :size="18" /></span>
            <div class="cd-id-txt">
              <b>{{ category.name }}</b>
              <span class="rmb-mono">{{ category.code }}</span>
            </div>
          </div>
        </header>

        <div class="cd-body">
          <!-- impact -->
          <Motion as="div" class="cd-impact" :class="{ blocked: liveBlocked }" v-bind="reveal(0)">
            <span class="cd-impact-ic"><component :is="liveBlocked ? Lock : AlertTriangle" :size="17" /></span>
            <div class="cd-impact-txt">
              <b v-if="liveBlocked">{{ claimCount }} claim{{ claimCount === 1 ? '' : 's' }} reference this category</b>
              <b v-else>This soft-deletes the category &amp; its policy</b>
              <p v-if="liveBlocked">Categories with in-flight claims can't be deleted — the server will refuse. Deactivate it instead to hide it from new claims while keeping history intact.</p>
              <p v-else>It disappears from new claims everywhere. Existing settled/closed claims keep their record. Any limits &amp; approval chain on it are removed too.</p>
            </div>
          </Motion>

          <!-- reason -->
          <Motion as="label" class="cd-fld" v-bind="reveal(1)">
            <span>Reason <i class="opt">— optional, logged to the audit trail</i></span>
            <textarea class="rmb-input" rows="2" v-model="reason" maxlength="1000"
                      placeholder="Why is this category being removed?"></textarea>
          </Motion>

          <!-- acknowledge -->
          <Motion as="button" type="button" class="cd-ack" :class="{ on: ack }" v-bind="reveal(2)" @click="ack = !ack">
            <span class="cd-ack-box"><Check :size="13" /></span>
            <span class="cd-ack-txt">I understand this removes the category and its policy from new claims.</span>
          </Motion>

          <Transition name="cd-err">
            <p v-if="err" class="cd-err-msg"><AlertTriangle :size="14" /> {{ err }}</p>
          </Transition>
        </div>

        <footer class="cd-foot">
          <button class="rmb-btn rmb-btn-ghost" @click="$emit('close')" :disabled="busy">Cancel</button>
          <span class="cd-foot-spacer" />
          <Motion v-if="category.is_active" as="button" class="rmb-btn rmb-btn-ghost cd-deact"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" :disabled="busy" @click="deactivate">
            <EyeOff :size="15" /> {{ busyDeact ? 'Deactivating…' : 'Deactivate instead' }}
          </Motion>
          <Motion as="button" class="rmb-btn cd-del" :class="{ armed: ack }"
                  :whileHover="ack ? { y: -2 } : {}" :whileTap="ack ? { scale: 0.96 } : {}"
                  :disabled="busy || !ack" @click="confirm">
            <Trash2 :size="15" /> {{ busyDel ? 'Deleting…' : 'Delete' }}
          </Motion>
        </footer>
      </Motion>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { X, Trash2, Check, AlertTriangle, Lock, EyeOff } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { deleteCategory, updateCategory, categoryMeta, errText } from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({ category: { type: Object, required: true } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const headRef = ref(null)
usePointerSpotlight(headRef)

const reason = ref('')
const ack = ref(false)
const busyDel = ref(false)
const busyDeact = ref(false)
const err = ref('')
const busy = computed(() => busyDel.value || busyDeact.value)

const meta = computed(() => categoryMeta(props.category.code))
const accent = computed(() => props.category.color_hex || meta.value.hex)
const claimCount = computed(() => Number(props.category.claim_count) || 0)
// Heuristic only — the server is the source of truth (blocks on live statuses) and we surface its 409 inline.
const liveBlocked = computed(() => claimCount.value > 0)

const reveal = (i) => ({
  initial: { opacity: 0, y: 14, filter: 'blur(5px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { delay: 0.1 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
})

async function confirm() {
  if (!ack.value) { err.value = 'Please acknowledge before deleting.'; return }
  err.value = ''
  busyDel.value = true
  try {
    await deleteCategory(props.category.id, reason.value.trim() || undefined)
    toast.success(`${props.category.name} deleted`)
    emit('done'); emit('close')
  } catch (e) { err.value = errText(e, 'Delete failed') }
  finally { busyDel.value = false }
}

async function deactivate() {
  err.value = ''
  busyDeact.value = true
  try {
    await updateCategory(props.category.id, { is_active: false })
    toast.success(`${props.category.name} deactivated`)
    emit('done'); emit('close')
  } catch (e) { err.value = errText(e, 'Deactivate failed') }
  finally { busyDeact.value = false }
}

const onKey = (e) => { if (e.key === 'Escape' && !busy.value) emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.cd-overlay { position: fixed; inset: 0; z-index: 4000; display: grid; place-items: center; padding: 24px;
  background: radial-gradient(120% 120% at 50% 0%, rgba(80,20,20,0.4), rgba(0,0,0,0.6)); backdrop-filter: blur(9px); }
[data-theme="light"] .cd-overlay { background: radial-gradient(120% 120% at 50% 0%, rgba(185,28,28,0.16), rgba(40,25,10,0.34)); }

.cd-modal { --cd: var(--rmb-st-rejected); width: min(500px, 96vw); max-height: 92vh; display: flex; flex-direction: column; overflow: hidden;
  background: var(--rmb-glass-deep); backdrop-filter: var(--rmb-glass-blur);
  border: 1px solid color-mix(in srgb, var(--cd) 28%, var(--rmb-border-strong));
  box-shadow: 0 40px 90px -42px color-mix(in srgb, var(--cd) 38%, rgba(0,0,0,0.7)), var(--rmb-glass-shadow); border-radius: 20px; }

.cd-head { position: relative; flex: 0 0 auto; padding: 20px 22px 18px; overflow: hidden; border-bottom: 1px solid var(--rmb-border-soft);
  background: radial-gradient(130% 130% at 100% 0%, color-mix(in srgb, var(--cat) 18%, transparent), transparent 62%),
    linear-gradient(160deg, var(--rmb-paper-elevated), var(--rmb-paper)); }
.cd-head > :not(.cd-aura):not(.cd-grid):not(.rmb-grain):not(.rmb-spotlight) { position: relative; z-index: 2; }
.cd-aura { position: absolute; top: -90px; right: -70px; width: 240px; height: 240px; border-radius: 50%; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--cd) 50%, transparent), transparent 68%); filter: blur(40px); opacity: 0.42; animation: rmb-aura-breathe 6s ease-in-out infinite; }
.cd-grid { position: absolute; inset: 0; z-index: 0; opacity: 0.42;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 28px 28px; -webkit-mask: radial-gradient(110% 90% at 80% 0%, #000, transparent 72%); mask: radial-gradient(110% 90% at 80% 0%, #000, transparent 72%); }
.cd-head-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 13px; }
.cd-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--cd); }
.x { background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted);
  width: 32px; height: 32px; border-radius: 10px; cursor: pointer; display: grid; place-items: center; transition: 0.2s; }
.x:hover { color: var(--cd); border-color: color-mix(in srgb, var(--cd) 45%, transparent); transform: rotate(90deg); }
.cd-id { display: flex; align-items: center; gap: 11px; }
.cd-ic { width: 42px; height: 42px; border-radius: 13px; display: grid; place-items: center; flex: 0 0 auto;
  color: var(--cat); background: color-mix(in srgb, var(--cat) 16%, transparent); }
.cd-id-txt { display: flex; flex-direction: column; gap: 1px; }
.cd-id-txt b { font-size: 16px; font-weight: 700; color: var(--rmb-text); }
.cd-id-txt span { font-size: 10.5px; color: var(--rmb-text-muted); letter-spacing: 0.5px; }

.cd-body { flex: 1; overflow-y: auto; padding: 16px 22px 18px; display: flex; flex-direction: column; gap: 13px; }

.cd-impact { display: flex; gap: 12px; padding: 13px 15px; border-radius: 13px;
  background: var(--rmb-surf-card); border: 1px solid color-mix(in srgb, var(--cd) 26%, var(--rmb-border-soft)); }
.cd-impact-ic { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center;
  color: var(--cd); background: var(--rmb-st-rejected-soft); }
.cd-impact.blocked { border-color: color-mix(in srgb, var(--rmb-st-returned) 32%, var(--rmb-border-soft)); }
.cd-impact.blocked .cd-impact-ic { color: var(--rmb-st-returned); background: var(--rmb-st-returned-soft); }
.cd-impact-txt b { display: block; font-size: 13px; font-weight: 700; color: var(--rmb-text); margin-bottom: 3px; }
.cd-impact-txt p { margin: 0; font-size: 12px; line-height: 1.55; color: var(--rmb-text-muted); }

.cd-fld { display: flex; flex-direction: column; gap: 6px; }
.cd-fld > span { font-size: 12px; font-weight: 600; color: var(--rmb-text-secondary); }
.opt { font-style: normal; font-weight: 400; color: var(--rmb-text-muted); }
.rmb-input { width: 100%; box-sizing: border-box; background: var(--hr-input-bg); color: var(--rmb-text); resize: vertical;
  border: 1px solid var(--hr-input-border); border-radius: 10px; padding: 10px 12px; font-size: 13px; font-family: inherit; line-height: 1.5; }
.rmb-input:focus { outline: none; border-color: var(--cd); box-shadow: 0 0 0 3px color-mix(in srgb, var(--cd) 14%, transparent); }
[data-theme="light"] .rmb-input { background: rgba(40,25,10,0.04); border-color: rgba(40,25,10,0.14); }

.cd-ack { display: flex; align-items: center; gap: 11px; text-align: left; width: 100%; cursor: pointer;
  padding: 11px 13px; border-radius: 12px; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft);
  color: var(--rmb-text-secondary); transition: all 0.25s var(--rmb-spring); }
.cd-ack:hover { border-color: var(--rmb-border-strong); }
.cd-ack.on { background: var(--rmb-st-rejected-soft); border-color: color-mix(in srgb, var(--cd) 45%, transparent); color: var(--rmb-text); }
.cd-ack-box { flex: 0 0 auto; width: 22px; height: 22px; border-radius: 7px; display: grid; place-items: center;
  border: 1.5px solid var(--rmb-border-strong); color: transparent; transition: all 0.25s var(--rmb-spring); }
.cd-ack.on .cd-ack-box { background: var(--cd); border-color: var(--cd); color: #fff; transform: scale(1.05); }
.cd-ack-txt { font-size: 12px; line-height: 1.45; }

.cd-err-msg { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 12px; color: var(--rmb-st-rejected); }
.cd-err-enter-active, .cd-err-leave-active { transition: opacity 0.25s, transform 0.25s; }
.cd-err-enter-from, .cd-err-leave-to { opacity: 0; transform: translateY(-4px); }

.cd-foot { flex: 0 0 auto; display: flex; align-items: center; gap: 10px; padding: 14px 22px 18px; flex-wrap: wrap;
  border-top: 1px solid var(--rmb-border-soft); background: var(--rmb-glass-deep); }
.cd-foot-spacer { flex: 1; }
.cd-deact { color: var(--rmb-st-returned); border-color: color-mix(in srgb, var(--rmb-st-returned) 35%, transparent); }
.cd-del { color: #fff; border: none; opacity: 0.55; cursor: not-allowed;
  background: linear-gradient(135deg, var(--cd), color-mix(in srgb, var(--cd) 70%, #7f1d1d)); transition: opacity 0.3s; }
.cd-del.armed { opacity: 1; cursor: pointer; box-shadow: 0 14px 30px -14px color-mix(in srgb, var(--cd) 70%, transparent); }

@media (prefers-reduced-motion: reduce) { .cd-aura { animation: none !important; } }
</style>
