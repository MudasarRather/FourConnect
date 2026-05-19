<template>
  <div class="file-upload" :class="{ 'has-file': !!value, 'is-error': !!error, 'is-uploading': uploading }">
    <input
      ref="fileEl"
      type="file"
      :accept="accept"
      class="file-hidden"
      @change="onPick"
    />

    <!-- Empty state -->
    <div v-if="!value" class="dropzone" @click="trigger">
      <div class="dz-icon">
        <UploadCloud :size="20" />
      </div>
      <div class="dz-text">
        <span class="dz-primary">
          {{ uploading ? 'Uploading…' : 'Click to upload' }}
        </span>
        <span class="dz-sub">{{ acceptHint }}</span>
      </div>
    </div>

    <!-- Filled state -->
    <div v-else class="file-pill">
      <span class="file-icon"><FileText :size="14" /></span>
      <a :href="absoluteUrl" target="_blank" rel="noopener" class="file-link">
        {{ filename }}
      </a>
      <button type="button" class="file-act" @click="trigger" :title="`Replace ${kind}`">
        <RefreshCw :size="13" />
      </button>
      <button type="button" class="file-act danger" @click="$emit('clear')" :title="`Remove ${kind}`">
        <X :size="13" />
      </button>
    </div>

    <div v-if="error" class="file-error">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { UploadCloud, FileText, RefreshCw, X } from 'lucide-vue-next'

const props = defineProps({
  value:     { type: String, default: '' },
  accept:    { type: String, default: '*' },
  kind:      { type: String, default: 'file' }, // 'resume' | 'cover-letter' | etc.
  uploading: { type: Boolean, default: false },
  error:     { type: String, default: '' },
  maxBytes:  { type: Number, default: 10 * 1024 * 1024 }, // 10MB
})
const emit = defineEmits(['upload', 'clear'])

const fileEl = ref(null)

const trigger = () => {
  if (props.uploading) return
  fileEl.value?.click()
}

const onPick = (e) => {
  const file = e.target.files?.[0]
  // Reset the input so picking the same file again still fires change
  e.target.value = ''
  if (!file) return
  if (file.size > props.maxBytes) {
    emit('upload', { error: `File is too large (max ${Math.round(props.maxBytes / 1024 / 1024)}MB)` })
    return
  }
  emit('upload', { file })
}

const acceptHint = computed(() => {
  if (!props.accept || props.accept === '*') return 'Any file type'
  return props.accept.replace(/\./g, '').toUpperCase().replace(/,/g, ' · ')
})

const filename = computed(() => {
  if (!props.value) return ''
  try {
    const url = new URL(props.value, 'http://placeholder')
    const parts = url.pathname.split('/').filter(Boolean)
    return decodeURIComponent(parts[parts.length - 1] || 'file')
  } catch {
    const parts = String(props.value).split('/').filter(Boolean)
    return decodeURIComponent(parts[parts.length - 1] || 'file')
  }
})

const absoluteUrl = computed(() => {
  const v = props.value
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  // Relative paths returned by /api/uploads → resolve against backend
  return `http://localhost:8000${v.startsWith('/') ? '' : '/'}${v}`
})
</script>

<style scoped>
.file-upload { display: flex; flex-direction: column; gap: 6px; }

.dropzone {
  position: relative;
  display: flex; align-items: center; gap: 12px;
  padding: 14px 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1.5px dashed rgba(251, 191, 36, 0.25);
  border-radius: 12px;
  cursor: pointer;
  transition:
    background 220ms var(--hr-spring),
    border-color 220ms var(--hr-spring),
    transform 220ms var(--hr-spring);
}
.dropzone:hover {
  background: rgba(251, 191, 36, 0.05);
  border-color: var(--hr-accent-gold-border);
  transform: translateY(-1px);
}
.is-uploading .dropzone {
  pointer-events: none;
  opacity: 0.7;
}
.dz-icon {
  display: grid; place-items: center;
  width: 38px; height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.16), rgba(251, 146, 60, 0.08));
  border: 1px solid var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
}
.dz-text { display: flex; flex-direction: column; gap: 2px; }
.dz-primary {
  font-size: 13px;
  font-weight: 700;
  color: var(--hr-text);
  letter-spacing: -0.01em;
}
.dz-sub {
  font-size: 11px;
  color: var(--hr-text-muted);
  letter-spacing: 0.02em;
}

.file-pill {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 10px;
}
.file-icon {
  display: inline-grid; place-items: center;
  width: 28px; height: 28px;
  border-radius: 7px;
  background: rgba(251, 191, 36, 0.14);
  color: var(--hr-accent-gold);
}
.file-link {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--hr-text);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-link:hover { color: var(--hr-accent-gold); text-decoration: underline; }
.file-act {
  display: grid; place-items: center;
  width: 28px; height: 28px;
  background: transparent;
  border: 0;
  border-radius: 7px;
  color: var(--hr-text-muted);
  cursor: pointer;
  transition: background 180ms var(--hr-spring), color 180ms var(--hr-spring);
}
.file-act:hover { background: rgba(255,255,255,0.06); color: var(--hr-text); }
.file-act.danger:hover { background: rgba(248, 113, 113, 0.14); color: #fca5a5; }

.file-hidden { display: none; }

.is-error .dropzone {
  border-color: rgba(248, 113, 113, 0.6);
  background: rgba(248, 113, 113, 0.04);
}
.file-error {
  font-size: 11px;
  color: var(--hr-input-error, #f87171);
  font-weight: 500;
  margin-top: 2px;
}
</style>
