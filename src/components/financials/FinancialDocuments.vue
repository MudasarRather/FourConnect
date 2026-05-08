<template>
  <div class="documents-tab">
     <FinancialDocList :documents="documents" @upload="showUpload = true" />
     
     <transition name="fade">
        <UploadDocModal v-if="showUpload" @close="showUpload = false" @upload="handleUpload" />
     </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import { UploadCloud } from 'lucide-vue-next'
import FinancialDocList from './documents/FinancialDocList.vue'
import UploadDocModal from './documents/UploadDocModal.vue'

const props = defineProps({ projectId: String, token: String })
const documents = ref([])
const showUpload = ref(false)

const fetchDocs = async () => {
   if (!props.projectId) return
   console.log("Fetching docs for project:", props.projectId)
   try {
      const token = props.token || localStorage.getItem('user_token')
      const res = await axios.get(`http://localhost:8000/api/project-financials/${props.projectId}/documents`, {
         headers: { Authorization: `Bearer ${token}` }
      })
      documents.value = res.data
      console.log("Docs loaded:", res.data.length)
   } catch (e) { 
       console.error("Failed to fetch docs:", e) 
   }
}

const handleUpload = async (docData) => {
   try {
      await axios.post(`http://localhost:8000/api/project-financials/${props.projectId}/documents`, docData, {
         headers: { Authorization: `Bearer ${props.token}` }
      })
      fetchDocs()
   } catch (e) { console.error(e) }
}

onMounted(fetchDocs)

// Watch for projectId change (e.g. initial load or switching projects)
watch(() => props.projectId, (newVal) => {
    if (newVal) fetchDocs()
})
</script>

<style scoped>
.documents-tab { animation: fadeIn 0.4s ease-out; }
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
h2 { font-size: 20px; font-weight: 600; color: white; margin: 0; }
.btn-primary { 
   background: #3b82f6; color: white; border: none; padding: 10px 16px; 
   border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;
}
.btn-primary:hover { background: #2563eb; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
