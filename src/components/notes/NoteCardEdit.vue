<template>
  <div class="edit-container">
    <!-- Edit Header -->
    <div class="edit-header">
      <input 
        v-model="form.title" 
        class="edit-title" 
        placeholder="Note Title" 
        @keydown.enter.prevent 
        ref="titleInputRef"
      />
      <div class="type-selector-mini">
        <button 
          v-for="t in noteTypes" :key="t.id"
          class="type-dot"
          :class="{ active: form.note_type === t.id, [t.id]: true }"
          :title="t.label"
          @click.stop="form.note_type = t.id"
        >
          <component :is="t.icon" :size="12" />
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar-wrapper">
       <EditorToolbar
         :autoCorrectEnabled="isFixingGrammar"
         :suggestionActive="shouldSuggestRewrite"
         :currentColor="currentColor"
         @cmd="execCmd"
         @insertTable="insertTable"
         @attach="triggerFileUpload"
         @toggleAutoCorrect="rewriteWithAI"
         @setColor="setTextColor"
       />
    </div>
    <input type="file" multiple accept="image/*,.pdf" @change="handleFileUpload" style="display:none" ref="fileInputRef" />

    <!-- Edit Mode Attachments List -->
    <div class="edit-attachments" v-if="form.attachment_urls.length">
      <div v-for="(att, idx) in form.attachment_urls" :key="idx" class="edit-att-item">
        <span class="att-name"><Paperclip :size="10"/> {{ att.name }}</span>
        <button class="att-del-btn" @click="removeAttachment(idx)">×</button>
      </div>
    </div>

    <!-- Content Editor -->
    <div 
      ref="editorRef"
      class="rich-editor"
      contenteditable="true"
      @input="onContentInput"
      @keydown="onEditorKeydown"
      @click.stop="onEditorClick"
      @keyup="handleKeyup"
      @mouseup="saveSelection"
      @blur="saveSelection"
    ></div>

    <!-- Table Context Toolbar -->
    <TableToolbar
      v-if="isInsideTable"
      @addRow="addTableRow"
      @addColumn="addTableColumn"
      @deleteRow="deleteTableRow"
      @deleteColumn="deleteTableColumn"
      @deleteTable="deleteTable"
    />

    <!-- Mentions Dropdown -->
    <MentionsDropdown
      :show="showMentions"
      :users="mentionsList"
      :activeIndex="mentionIndex"
      :position="mentionsPosition"
      @select="insertMention"
    />

    <!-- Edit Footer -->
    <div class="edit-footer">
      <div class="edit-meta">
        <label class="toggle-pin" :class="{ active: form.is_pinned }" @click.stop="form.is_pinned = !form.is_pinned">
          <Pin :size="12" :fill="form.is_pinned ? 'currentColor' : 'none'" /> Pin Note
        </label>
        <div class="last-updated" v-if="note.updated_at">
          Updated {{ updatedAgoText }}
        </div>
      </div>
      <div class="edit-actions">
        <button class="btn-mini-cancel" @click.stop="$emit('cancel')">Cancel</button>
        <button class="btn-mini-save" @click.stop="saveNote">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, computed, onMounted } from 'vue'
import axios from 'axios'
import { FileText, DollarSign, Lock, Archive, Paperclip, Pin, Loader2 } from 'lucide-vue-next'
import EditorToolbar from './EditorToolbar.vue'
import TableToolbar from './TableToolbar.vue'
import MentionsDropdown from './MentionsDropdown.vue'

const props = defineProps({
  note: { type: Object, required: true },
  token: { type: String, required: true },
  now: { type: Number, required: true },
})

const emit = defineEmits(['save', 'cancel', 'toast'])

// --- Refs ---
const editorRef = ref(null)
const titleInputRef = ref(null)
const fileInputRef = ref(null)

const noteTypes = [
  { id: 'general', label: 'General', icon: FileText },
  { id: 'financial', label: 'Financial', icon: DollarSign },
  { id: 'private', label: 'Private', icon: Lock },
  { id: 'other', label: 'Other', icon: Archive },
]

const form = reactive({
  title: '',
  content: '',
  note_type: 'general',
  is_pinned: false,
  attachment_urls: [],
  mentions: [],
})

// Mentions state
const mentionsList = ref([])
const showMentions = ref(false)
const mentionIndex = ref(0)
const mentionQuery = ref('')
const mentionRange = ref(null)
const mentionsPosition = reactive({ top: '0px', left: '0px' })
// Use non-reactive variable for DOM Range to avoid Vue proxy issues
let lastRange = null
const teamMembers = ref([])

// Editor state
const currentColor = ref('#ffffff')
const isFixingGrammar = ref(false) // Replaces autoCorrectEnabled
const shouldSuggestRewrite = ref(false)
const lastPolishedText = ref('')
const isInsideTable = ref(false)
let backgroundCheckTimeout = null
const activeTable = ref(null)
let autoCorrectTimeout = null

const showToast = (msg) => emit('toast', msg)

// --- Computed ---
const updatedAgoText = computed(() => {
  if (!props.note.updated_at) return ''
  const diff = props.now - new Date(props.note.updated_at).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(props.note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})

// --- Init ---
const initEditor = () => {
  form.title = props.note.title
  form.content = props.note.content
  form.note_type = props.note.note_type
  form.is_pinned = props.note.is_pinned
  form.attachment_urls = [...(props.note.attachment_urls || [])]

  nextTick(() => {
    if (titleInputRef.value) titleInputRef.value.focus()
    if (editorRef.value) {
      editorRef.value.innerHTML = form.content
      document.execCommand('defaultParagraphSeparator', false, 'p')
      document.execCommand('styleWithCSS', false, true)
      // NOTE: Do NOT check for polish on init. User finds it annoying if they just saved. 
      // Only check on content input.
      // checkIfPolishNeeded() 
    }
  })
}

const checkGrammarInBackground = async () => {
  if (!editorRef.value || isFixingGrammar.value || showMentions.value) return
  const plainText = editorRef.value.innerText || ''
  const trimmed = plainText.trim()
  
  // Skip if too short or same as last result
  if (trimmed.length <= 10 || trimmed === lastPolishedText.value) {
     shouldSuggestRewrite.value = false
     return
  }

  try {
    // For background check, we can still send plain text to save tokens, 
    // OR send HTML if we want accurate "is polish needed" detection.
    // Plain text is safer/faster for just detection.
    const res = await axios.post(
      'http://localhost:8000/api/project-notes/grammar-check',
      { text: trimmed }, 
      { params: { token: props.token } }
    )
    const suggestedText = res.data.corrected_text
    
    // If AI returns different text, it means improvements were found
    if (suggestedText && suggestedText.trim() !== trimmed) {
      shouldSuggestRewrite.value = true
    } else {
      shouldSuggestRewrite.value = false
    }
  } catch (e) {
    // Silent fail for background check
    shouldSuggestRewrite.value = false
  }
}

const checkIfPolishNeeded = () => {
   if (backgroundCheckTimeout) clearTimeout(backgroundCheckTimeout)
   if (showMentions.value) return // Don't schedule check if mentioning
   // Debounce for 2 seconds to avoid spamming API while typing
   backgroundCheckTimeout = setTimeout(checkGrammarInBackground, 2000)
}

const fetchTeamMembers = async () => {
  try {
    const res = await axios.get(
      `http://localhost:8000/api/project-notes/${props.note.project_id}/notes/mentions`,
      { params: { token: props.token } }
    )
    teamMembers.value = res.data
  } catch (e) {}
}

onMounted(() => {
  initEditor()
  fetchTeamMembers()
})

// --- Editor Commands ---
// --- Editor Commands ---
const saveSelection = () => {
  const sel = window.getSelection()
  if (sel.rangeCount > 0) {
    const range = sel.getRangeAt(0)
    // Only save if selection is inside editor
    if (editorRef.value && editorRef.value.contains(range.commonAncestorContainer)) {
        lastRange = range.cloneRange()
    }
  }
}

const restoreSelection = () => {
   if (lastRange) {
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(lastRange)
   } else if (editorRef.value) {
      editorRef.value.focus()
   }
}

const execCmd = (cmd, val = null) => {
  // Always ensure editor is focused first
  if (editorRef.value) {
      editorRef.value.focus()
  }
  
  restoreSelection()
  document.execCommand(cmd, false, val)
  if (editorRef.value) form.content = editorRef.value.innerHTML
}

const setTextColor = (color) => {
  currentColor.value = color
  execCmd('foreColor', color)
}

const toggleAutoCorrect = () => {
  autoCorrectEnabled.value = !autoCorrectEnabled.value
  showToast(`Auto-correct ${autoCorrectEnabled.value ? 'enabled' : 'disabled'}`)
}

// --- Table ---
const insertTable = () => {
  const tableHTML = `
    <table class="editor-table">
      <tbody>
        <tr><td>Cell 1</td><td>Cell 2</td></tr>
        <tr><td>Cell 3</td><td>Cell 4</td></tr>
      </tbody>
    </table><p><br/></p>
  `
  execCmd('insertHTML', tableHTML)
}

const getActiveTableFromSelection = () => {
  const sel = window.getSelection()
  if (!sel.rangeCount) return null
  let node = sel.getRangeAt(0).startContainer
  while (node && node !== editorRef.value) {
    if (node.nodeName === 'TABLE') return node
    if (node.nodeName === 'TD' || node.nodeName === 'TR' || node.nodeName === 'TBODY') {
      let parent = node.parentElement
      while (parent && parent !== editorRef.value) {
        if (parent.nodeName === 'TABLE') return parent
        parent = parent.parentElement
      }
    }
    node = node.parentElement
  }
  return null
}

const getActiveCellFromSelection = () => {
  const sel = window.getSelection()
  if (!sel.rangeCount) return null
  let node = sel.getRangeAt(0).startContainer
  while (node && node !== editorRef.value) {
    if (node.nodeName === 'TD') return node
    node = node.parentElement
  }
  return null
}

const onEditorClick = () => {
  checkCursorContext()
  const table = getActiveTableFromSelection()
  isInsideTable.value = !!table
  activeTable.value = table
}

const addTableRow = () => {
  const table = activeTable.value
  if (!table) return
  const tbody = table.querySelector('tbody') || table
  const lastRow = tbody.lastElementChild
  if (!lastRow) return
  const colCount = lastRow.children.length
  const newRow = document.createElement('tr')
  for (let i = 0; i < colCount; i++) {
    const td = document.createElement('td')
    td.innerHTML = '&nbsp;'
    newRow.appendChild(td)
  }
  tbody.appendChild(newRow)
  newRow.firstElementChild?.focus()
  form.content = editorRef.value.innerHTML
}

const addTableColumn = () => {
  const table = activeTable.value
  if (!table) return
  table.querySelectorAll('tr').forEach(row => {
    const td = document.createElement('td')
    td.innerHTML = '&nbsp;'
    row.appendChild(td)
  })
  form.content = editorRef.value.innerHTML
}

const deleteTableRow = () => {
  const table = activeTable.value
  if (!table) return
  const cell = getActiveCellFromSelection()
  const row = cell ? cell.closest('tr') : null
  if (!row) { showToast('Click inside a table cell first'); return }
  const tbody = table.querySelector('tbody') || table
  if (tbody.querySelectorAll('tr').length <= 1) { showToast('Cannot delete the last row'); return }
  row.remove()
  form.content = editorRef.value.innerHTML
}

const deleteTableColumn = () => {
  const table = activeTable.value
  if (!table) return
  const cell = getActiveCellFromSelection()
  if (!cell) { showToast('Click inside a table cell first'); return }
  const colIndex = Array.from(cell.parentElement.children).indexOf(cell)
  const rows = table.querySelectorAll('tr')
  if (rows[0] && rows[0].children.length <= 1) { showToast('Cannot delete the last column'); return }
  rows.forEach(row => { if (row.children[colIndex]) row.children[colIndex].remove() })
  form.content = editorRef.value.innerHTML
}

const deleteTable = () => {
  const table = activeTable.value
  if (!table) return
  table.remove()
  isInsideTable.value = false
  activeTable.value = null
  form.content = editorRef.value.innerHTML
}

// --- Content Input ---
const onContentInput = () => {
  // Update state regardless of selection
  form.content = editorRef.value?.innerHTML || ''
  checkIfPolishNeeded()

  const selection = window.getSelection()
  if (!selection.rangeCount) return

  const range = selection.getRangeAt(0)
  const text = range.startContainer.textContent || ''
  const cursor = range.startOffset

  // Local Auto-Caps
  if (autoCorrectEnabled.value && range.startContainer.nodeType === Node.TEXT_NODE) {
    const content = range.startContainer.textContent
    const char = content[cursor - 1]
    if (char && /[a-z]/.test(char)) {
      let shouldCap = false
      if (cursor === 1) shouldCap = true
      if (cursor >= 3 && content.slice(cursor - 3, cursor - 1) === '. ') shouldCap = true
      if (shouldCap) {
        const newText = content.slice(0, cursor - 1) + char.toUpperCase() + content.slice(cursor)
        range.startContainer.textContent = newText
        const newRange = document.createRange()
        newRange.setStart(range.startContainer, cursor)
        newRange.collapse(true)
        selection.removeAllRanges()
        selection.addRange(newRange)
      }
    }
  }

  // NOTE: Mention detection REMOVED from onContentInput. 
  // It is now strictly triggered via Shift + Space in onEditorKeydown.

  if (showMentions.value) {
    const lastAt = text.lastIndexOf('@', cursor - 1)
    if (lastAt !== -1) {
      const query = text.substring(lastAt + 1, cursor)
      if (!query.includes(' ')) {
        mentionQuery.value = query
        fetchMentions(query)
        return
      }
    }
  }

  showMentions.value = false
}

const checkCursorContext = () => {
  const selection = window.getSelection()
  if (!selection.rangeCount) return
  const range = selection.getRangeAt(0)
  const text = range.startContainer.textContent || ''
  const cursor = range.startOffset
  if (showMentions.value) {
    const lastAt = text.lastIndexOf('@', cursor - 1)
    if (lastAt === -1 || text.substring(lastAt + 1, cursor).includes(' ')) {
      showMentions.value = false
    }
  }
}

const handleKeyup = () => {
  checkCursorContext()
  saveSelection()
}

const onEditorKeydown = (e) => {
  if (showMentions.value) {
    if (e.key === 'ArrowDown') { e.preventDefault(); mentionIndex.value = (mentionIndex.value + 1) % mentionsList.value.length; return }
    if (e.key === 'ArrowUp') { e.preventDefault(); mentionIndex.value = (mentionIndex.value - 1 + mentionsList.value.length) % mentionsList.value.length; return }
    if (e.key === 'Enter') { e.preventDefault(); if (mentionsList.value[mentionIndex.value]) insertMention(mentionsList.value[mentionIndex.value]); return }
    if (e.key === 'Escape') { showMentions.value = false; return }
  }
  if (e.key === 'Tab') { e.preventDefault(); execCmd('insertText', '    '); return }
  
  // Shift + Space to trigger mentions
  if (e.shiftKey && e.code === 'Space') {
    const selection = window.getSelection()
    if (!selection.rangeCount) return
    const range = selection.getRangeAt(0)
    const text = range.startContainer.textContent || ''
    const cursor = range.startOffset
    
    // Check if character before cursor is @
    if (cursor > 0 && text[cursor - 1] === '@') {
      e.preventDefault() // prevent space insertion
      mentionQuery.value = ''
      mentionRange.value = range.cloneRange()
      mentionRange.value.setStart(range.startContainer, cursor - 1)
      mentionRange.value.setEnd(range.startContainer, cursor)
      
      let rect = mentionRange.value.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) {
        const rects = mentionRange.value.getClientRects()
        if (rects.length > 0) rect = rects[0]
      }
      
      if (rect.top !== 0 || rect.left !== 0) {
        mentionsPosition.top = `${rect.bottom + 10}px`
        mentionsPosition.left = `${rect.left}px`
        fetchMentions('')
      }
    }
  }
}

// --- Mentions ---
const fetchMentions = async (q) => {
  try {
    const res = await axios.get(
      `http://localhost:8000/api/project-notes/${props.note.project_id}/notes/mentions`,
      { params: { q, token: props.token } }
    )
    mentionsList.value = res.data
    showMentions.value = mentionsList.value.length > 0
    mentionIndex.value = 0
  } catch (e) { showMentions.value = false }
}

const insertMention = (user) => {
  if (!mentionRange.value) return
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(mentionRange.value)
  document.execCommand('delete')
  const span = `<span class="mention-pill" data-id="${user.id}" contenteditable="false">@${user.name}</span>&nbsp;`
  document.execCommand('insertHTML', false, span)
  if (!form.mentions) form.mentions = []
  if (!form.mentions.includes(user.id)) form.mentions.push(user.id)
  showMentions.value = false
  form.content = editorRef.value.innerHTML
}

// --- Editor Commands ---
// Helper: Get cursor offset relative to the editor root (ignoring HTML tags)
const getCursorOffset = (root) => {
  const selection = window.getSelection()
  if (!selection.rangeCount) return 0
  const range = selection.getRangeAt(0)
  const preCaretRange = range.cloneRange()
  preCaretRange.selectNodeContents(root)
  preCaretRange.setEnd(range.endContainer, range.endOffset)
  return preCaretRange.toString().length
}

// Helper: Set cursor at a specific text offset relative to editor root
const setCursorOffset = (root, offset) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false)
  let current = 0
  while (walker.nextNode()) {
    const node = walker.currentNode
    const length = node.textContent.length
    if (current + length >= offset) {
      const range = document.createRange()
      range.setStart(node, offset - current)
      range.collapse(true)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
      return
    }
    current += length
  }
}

// --- AI Grammar Rewrite (Backend Proxy) ---
const applyMentionsToHTML = (html) => {
    // Sort team members by name length descending to avoid partial matches
    const sortedMembers = [...teamMembers.value].sort((a, b) => b.name.length - a.name.length)
    
    let processedUrl = html
    sortedMembers.forEach(member => {
        // Escape special regex characters in the name (e.g. dots, parenthesis)
        const escapedName = member.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Find @Name that is NOT already inside a tag or existing pill
        // Matches @Name boundaries more robustly
        const mentionRegex = new RegExp(`(?<!<span[^>]*>)@${escapedName}\\b(?![^<]*<\/span>)`, 'g')
        const pillHtml = `<span class="mention-pill" data-id="${member.id}" contenteditable="false">@${member.name}</span>`
        processedUrl = processedUrl.replace(mentionRegex, pillHtml)
    })
    return processedUrl
}

// --- AI Grammar Rewrite (Backend Proxy) ---
const rewriteWithAI = async () => {
  if (!editorRef.value || isFixingGrammar.value) return
  
  // Use innerHTML to preserve formatting (colors, bold, lists, etc.)
  const content = editorRef.value.innerHTML 
  // Strip tags for length check only
  if (!editorRef.value.innerText || editorRef.value.innerText.length < 3) return
  
  shouldSuggestRewrite.value = false
  isFixingGrammar.value = true
  showToast("AI is rewriting your text...")

  try {
    // Call our backend proxy
    const res = await axios.post(
      'http://localhost:8000/api/project-notes/grammar-check',
      { text: content },
      { params: { token: props.token } }
    )

    const fixedHtml = res.data.corrected_text
    
    if (fixedHtml && fixedHtml !== content) {
       // 1. Convert any plain text @Mentions that AI might have messed up (or new ones) back to pills
       // The new specific prompt should preserve existing pills, but this safety check helps.
       const finalHtml = applyMentionsToHTML(fixedHtml)
       
       // 2. Update editor
       editorRef.value.innerHTML = finalHtml
       
       lastPolishedText.value = editorRef.value.innerText.trim() // Compare against plain text for suppression
       form.content = editorRef.value.innerHTML
       showToast("Text rewritten by AI")
    } else {
       showToast("Text looks good!")
    }

  } catch (e) {
    console.error(e)
    showToast("AI Repair failed today.")
  } finally {
    isFixingGrammar.value = false
  }
}


// --- File Upload ---
const triggerFileUpload = () => fileInputRef.value?.click()

const handleFileUpload = async (event) => {
  const files = event.target.files
  if (!files?.length) return

  for (const file of files) {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      showToast('Only Images and PDFs are allowed')
      continue
    }
    const isValid = await validateFileContent(file)
    if (!isValid) { showToast(`Invalid file content: ${file.name}`); continue }

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await axios.post('http://localhost:8000/api/uploads/file', fd, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${props.token}` }
      })
      form.attachment_urls.push({
        name: file.name,
        url: res.data.url || res.data.file_url || '',
        size: file.size,
      })
    } catch (e) { 
      console.error(e)
      showToast('Upload failed')
    }
  }
  event.target.value = ''
}

const removeAttachment = (index) => {
  form.attachment_urls.splice(index, 1)
}

const validateFileContent = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = (e) => {
      const arr = (new Uint8Array(e.target.result)).subarray(0, 4)
      let header = ""
      for (let i = 0; i < arr.length; i++) header += arr[i].toString(16)

      if (file.type === 'application/pdf') {
        resolve(header.startsWith('25504446'))
      } else if (file.type.startsWith('image/')) {
        resolve(header.startsWith('ffd8') || header.startsWith('89504e47') || header.startsWith('47494638') || header.startsWith('424d') || true)
      } else {
        resolve(false)
      }
    }
    reader.readAsArrayBuffer(file.slice(0, 4))
  })
}

// --- Save ---
const saveNote = async () => {
  if (!form.title.trim()) return
  
  if (editorRef.value) {
    // 1. First, try to auto-convert any plain text @name to pills if they match a team member
    let html = editorRef.value.innerHTML
    
    // Sort team members by name length descending to avoid partial matches (e.g. @Mudasar vs @Muda)
    const sortedMembers = [...teamMembers.value].sort((a, b) => b.name.length - a.name.length)
    
    sortedMembers.forEach(member => {
        // Regex to find @MemberName not already inside a mention-pill span
        // This is a simplified approach; ideally we'd use DOM walker but for "fix right now" this works well for common cases
        const mentionRegex = new RegExp(`(?<!<span[^>]*>)@${member.name}(?![^<]*<\/span>)`, 'g')
        const pillHtml = `<span class="mention-pill" data-id="${member.id}" contenteditable="false">@${member.name}</span>`
        html = html.replace(mentionRegex, pillHtml)
    })
    
    editorRef.value.innerHTML = html
    form.content = html
    
    // 2. Scan for mentions in the actual HTML to be 100% accurate
    const pills = editorRef.value.querySelectorAll('.mention-pill')
    const extractedIds = []
    pills.forEach(p => {
      const id = p.getAttribute('data-id')
      if (id && !extractedIds.includes(id)) {
        extractedIds.push(id)
      }
    })
    form.mentions = extractedIds

    // 3. Clean up LT Highlights before saving
    // We don't want to persist the dotted underlines
    const mistakes = editorRef.value.querySelectorAll('.lt-mistake')
    mistakes.forEach(span => {
        const text = document.createTextNode(span.textContent)
        span.parentNode.replaceChild(text, span)
    })
    // Re-read content after cleanup
    form.content = editorRef.value.innerHTML
  }

  try {
    const payload = { ...form }
    const res = await axios.put(
      `http://localhost:8000/api/project-notes/${props.note.project_id}/notes/${props.note.id}`,
      payload,
      { params: { token: props.token } }
    )
    emit('save', res.data)
  } catch (e) {
    alert('Failed to save')
    console.error(e)
  }
}
</script>

<style scoped>
.edit-container { display: flex; flex-direction: column; height: 100%; }

.edit-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.edit-title {
  background: transparent; border: none; color: white; font-size: 17px; font-weight: 700;
  width: 100%; outline: none; font-family: 'Inter', sans-serif; letter-spacing: -0.01em;
  padding: 0;
}
.edit-title::placeholder { color: rgba(255,255,255,0.2); }

.type-selector-mini { display: flex; gap: 4px; }
.type-dot {
  width: 24px; height: 24px; border-radius: 6px; border: none; background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s;
}
.type-dot:hover { color: white; background: rgba(255,255,255,0.1); }
.type-dot.active { background: white; color: black; } /* Simple active state for new design */

.toolbar-wrapper { 
   margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.06); 
   border-radius: 8px; background: rgba(255,255,255,0.02); /* overflow: visible; */
   position: relative; z-index: 10;
}

/* Edit Attachments */
.edit-attachments { 
  display: flex; flex-wrap: wrap; gap: 6px; padding-bottom: 8px; margin-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.05); 
}
.edit-att-item { 
  display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.08); 
  padding: 3px 8px; border-radius: 6px; font-size: 11px; color: #e4e4e7;
}
.att-del-btn { 
  background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 14px; padding: 0 2px;
}
.att-del-btn:hover { color: #ef4444; }

.rich-editor {
  flex: 1; min-height: 120px; color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.6;
  outline: none; margin-bottom: 16px; overflow-x: auto;
}
.rich-editor :deep(ul) { padding-left: 20px; list-style-type: disc !important; }
.rich-editor :deep(ol) { padding-left: 20px; list-style-type: decimal !important; }
.rich-editor:empty:before { content: 'Type something...'; color: rgba(255,255,255,0.2); }

/* Tables in editor */
:deep(.editor-table), .rich-editor table {
  width: auto; min-width: 100%; border-collapse: collapse; margin: 10px 0;
  border: 1px solid rgba(255,255,255,0.15);
}
:deep(.editor-table) td, .rich-editor table td {
  border: 1px solid rgba(255,255,255,0.12); padding: 8px 12px;
  min-width: 60px; vertical-align: top;
}
:deep(.editor-table) td:focus, .rich-editor table td:focus {
  outline: 1px solid rgba(245,158,11,0.4); outline-offset: -1px;
}

/* Mention Pill in Editor */

/* Mention Pill in Editor - Premium Blue Glass */
:deep(.mention-pill) {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  background: rgba(59, 130, 246, 0.15); /* Blue-500 alpha */
  color: #60a5fa; /* Blue-400 */
  padding: 0 6px; 
  border-radius: 6px; 
  font-weight: 600; 
  font-size: 0.85em;
  font-family: 'Inter', sans-serif;
  border: 1px solid rgba(59, 130, 246, 0.3);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  user-select: none;
  margin: 0 1px;
  transition: all 0.2s ease;
}
:deep(.mention-pill:hover) {
  background: rgba(59, 130, 246, 0.25);
  border-color: rgba(59, 130, 246, 0.5);
}

.rich-editor::-webkit-scrollbar { width: 4px; }
.rich-editor::-webkit-scrollbar-track { background: transparent; }
.rich-editor::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

/* Grammar Check Highlights */
:deep(.lt-mistake) {
    border-bottom: 2px dotted #f59e0b;
    cursor: help;
    background: rgba(245, 158, 11, 0.1);
}

.edit-footer { 
  display: flex; align-items: center; justify-content: space-between; 
  padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06);
}
.edit-meta { display: flex; gap: 12px; font-size: 11px; color: rgba(255,255,255,0.4); align-items: center; }
.last-updated { font-size: 10px; color: rgba(255,255,255,0.3); }
.toggle-pin { cursor: pointer; display: flex; align-items: center; gap: 4px; transition: color 0.2s; font-size: 11px; }
.toggle-pin.active { color: #f59e0b; }
.toggle-pin:hover { color: white; }

.edit-actions { display: flex; gap: 8px; }
.btn-mini-cancel {
  background: transparent; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 12px;
  cursor: pointer; padding: 6px 12px; border-radius: 6px; transition: all 0.2s;
}
.btn-mini-cancel:hover { color: white; background: rgba(255,255,255,0.08); }

.btn-mini-save {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white; border: none; font-size: 12px; font-weight: 600;
  padding: 6px 16px; border-radius: 6px; cursor: pointer;
  box-shadow: 0 2px 10px rgba(245, 158, 11, 0.2); transition: all 0.2s;
}
.btn-mini-save:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); }

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════ */
[data-theme="light"] .edit-title { color: var(--text-primary); }
[data-theme="light"] .edit-title::placeholder { color: rgba(26, 20, 16, 0.30); }

/* Type selector dots (header right) */
[data-theme="light"] .type-dot {
  background: rgba(255, 250, 240, 0.55);
  color: #6b5840;
  border: 1px solid rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .type-dot:hover {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .type-dot.active {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
  border-color: #b45309;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.30);
}

/* Toolbar wrapper */
[data-theme="light"] .toolbar-wrapper {
  background: rgba(255, 250, 240, 0.45);
  border-color: rgba(217, 119, 6, 0.22);
}

/* Edit attachments row */
[data-theme="light"] .edit-attachments {
  border-bottom-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .edit-att-item {
  background: rgba(217, 119, 6, 0.10);
  color: #92400e;
}
[data-theme="light"] .att-del-btn { color: #92400e; }
[data-theme="light"] .att-del-btn:hover { color: #b91c1c; }

/* Rich editor body */
[data-theme="light"] .rich-editor { color: var(--text-primary); }
[data-theme="light"] .rich-editor:empty:before { color: rgba(26, 20, 16, 0.30); }
[data-theme="light"] :deep(.editor-table),
[data-theme="light"] .rich-editor table { border-color: rgba(40, 25, 10, 0.18); }
[data-theme="light"] :deep(.editor-table) td,
[data-theme="light"] .rich-editor table td { border-color: rgba(40, 25, 10, 0.14); }
[data-theme="light"] :deep(.editor-table) td:focus,
[data-theme="light"] .rich-editor table td:focus {
  outline-color: rgba(217, 119, 6, 0.55);
}
[data-theme="light"] .rich-editor::-webkit-scrollbar-thumb {
  background: rgba(217, 119, 6, 0.28);
}

/* Mention pill — recolor blue → amber to stay on palette */
[data-theme="light"] :deep(.mention-pill) {
  background: rgba(217, 119, 6, 0.16);
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.36);
  box-shadow: 0 1px 2px rgba(40, 25, 10, 0.10);
}
[data-theme="light"] :deep(.mention-pill:hover) {
  background: rgba(217, 119, 6, 0.26);
  border-color: rgba(217, 119, 6, 0.55);
}

/* Grammar check underline */
[data-theme="light"] :deep(.lt-mistake) {
  border-bottom-color: #d97706;
  background: rgba(217, 119, 6, 0.12);
}

/* Footer */
[data-theme="light"] .edit-footer { border-top-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .edit-meta { color: #92400e; }
[data-theme="light"] .last-updated { color: #92400e; }
[data-theme="light"] .toggle-pin { color: #6b5840; }
[data-theme="light"] .toggle-pin:hover { color: #92400e; }
[data-theme="light"] .toggle-pin.active { color: #b45309; }

/* Cancel button — was invisible in light */
[data-theme="light"] .btn-mini-cancel {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(217, 119, 6, 0.30);
  color: #6b5840;
}
[data-theme="light"] .btn-mini-cancel:hover {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.50);
}

/* Save button — keep golden gradient */
[data-theme="light"] .btn-mini-save {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  color: #fff;
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .btn-mini-save:hover {
  background: linear-gradient(135deg, #c2410c 0%, #92400e 100%);
  box-shadow: 0 8px 22px rgba(217, 119, 6, 0.42);
}
</style>
