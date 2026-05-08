<template>
  <div class="payments-tab">
     <div class="header-row">
        <h2>Payments & Transactions</h2>
        <button class="btn-yellow" @click="showModal = true">
           <Plus :size="18" stroke-width="2.5" />
           <span>Record New Payment</span>
        </button>
     </div>

     <PaymentKpis :payments="payments" :currency="project?.currency || 'USD'" :project="project" />
     <PaymentsTable :payments="payments" :project="project" @export="handleExport" @select="handleRowSelect" />

     <!-- Modals -->
     <PaymentEntryModal 
        v-model="showModal"
        :project-id="projectId"
        :project-name="project?.name"
        :project-currency="project?.currency || 'USD'"
        :project-budget="project?.budget_amount"
        :milestones="milestones"
        :token="token"
        :initial-data="editPaymentData"
        :is-edit-mode="!!editPaymentData"
        :paid-milestone-ids="paidMilestoneIds"
        :stats="stats"
        @save="handleSave"
     />

     <PaymentDetailsDrawer
        :is-open="!!selectedPaymentId"
        :payment="selectedPayment"
        :milestones="milestones"
        :current-user="currentUser"
        :project="project"
        @close="handleCloseDrawer"
        @edit="handleEdit"
        @deleted="handlePaymentDeleted"
     />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import axios from 'axios'
import { Plus } from 'lucide-vue-next'
import PaymentKpis from './payments/PaymentKpis.vue'
import PaymentsTable from './payments/PaymentsTable.vue'
import PaymentEntryModal from './payments/PaymentEntryModal.vue'
import PaymentDetailsDrawer from './payments/PaymentDetailsDrawer.vue'

const props = defineProps({ 
  projectId: String, 
  token: String,
  project: Object
})

const payments = ref([])
const milestones = ref([])
const showModal = ref(false)
const currentUser = ref({ name: 'User' })

const stats = computed(() => {
   const paymentList = payments.value || []
   const total_gross = paymentList.reduce((a, b) => a + Number(b.invoice_amount_gross || b.amount_paid || 0), 0)
   const projectBudget = parseFloat(props.project?.budget_amount) || 0
   const remaining = projectBudget - total_gross
   const remainingPercent = projectBudget > 0 ? (remaining / projectBudget) * 100 : 0
   return { remaining, remainingPercent }
})

// Fetch User
const fetchUser = async () => {
    try {
        const res = await axios.get('http://localhost:8000/api/auth/me', {
            headers: { Authorization: `Bearer ${props.token}` }
        })
        currentUser.value = res.data
    } catch (e) { console.error('Failed to fetch user', e) }
}

// Drawer State
const selectedPaymentId = ref(null)
const selectedPayment = ref({})

const fetchPayments = async () => {
   if (!props.projectId) return
   try {
      const res = await axios.get(`http://localhost:8000/api/project-financials/${props.projectId}/payments`, {
         headers: { Authorization: `Bearer ${props.token}` }
      })
      payments.value = res.data
   } catch (e) { console.error(e) }
}

const fetchMilestones = async () => {
   if (!props.projectId) return
   try {
      const res = await axios.get(`http://localhost:8000/api/projects/${props.projectId}/milestones`, {
         headers: { Authorization: `Bearer ${props.token}` }
      })
      milestones.value = res.data
   } catch (e) { console.error(e) }
}

const handleRowSelect = async (id) => {
    selectedPaymentId.value = id
    // Fetch full details
    try {
        const res = await axios.get(`http://localhost:8000/api/project-financials/payments/${id}`, {
            headers: { Authorization: `Bearer ${props.token}` }
        })
        selectedPayment.value = res.data
    } catch (e) {
        console.error(e)
    }
}

const handleCloseDrawer = () => {
    selectedPaymentId.value = null
}


const handlePaymentDeleted = () => {
   selectedPaymentId.value = null // Close drawer immediately
   fetchPayments()
}

import { useToast } from '../../composables/useToast'

const { success, error } = useToast()

const paidMilestoneIds = computed(() => {
    const ids = new Set()
    payments.value.forEach(p => {
        if (p.milestone_ids && Array.isArray(p.milestone_ids) && p.status !== 'Failed' && p.status !== 'Cancelled') {
            p.milestone_ids.forEach(id => ids.add(id))
        }
    })
    return Array.from(ids)
})

const editPaymentData = ref(null)

const handleEdit = (payment) => {
   selectedPaymentId.value = null // Close drawer
   editPaymentData.value = payment
   showModal.value = true
}

const handleSave = async (data) => {
   try {
      if (editPaymentData.value) {
          // Edit Mode
          await axios.put(`http://localhost:8000/api/project-financials/payments/${editPaymentData.value.id}`, data, {
             headers: { Authorization: `Bearer ${props.token}` }
          })
          success('Payment updated successfully')
      } else {
          // Create Mode
          await axios.post(`http://localhost:8000/api/project-financials/${props.projectId}/payments`, data, {
             headers: { Authorization: `Bearer ${props.token}` }
          })
          success('Payment recorded successfully')
      }
      
      showModal.value = false
      editPaymentData.value = null // Reset 
      fetchPayments()
   } catch (e) { 
      console.error(e) 
      error('Failed to save payment')
   }
}

// Reset edit data when modal closes if not via save (e.g. cancelled)
watch(showModal, (val) => {
    if (!val) {
        setTimeout(() => { editPaymentData.value = null }, 300) // Delay to avoid UI jump
    }
})

const handleExport = () => {
   // Generate CSV
   const headers = ['Payment ID', 'Vendor', 'Amount', 'Currency', 'Date', 'Status']
   const rows = payments.value.map(p => [
      p.payment_id || p.id,
      p.vendor_name,
      p.net_receivable_amount || p.amount_paid,
      p.currency,
      p.payment_date,
      p.status
   ])
   
   const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
   const blob = new Blob([csv], { type: 'text/csv' })
   const url = URL.createObjectURL(blob)
   const a = document.createElement('a')
   a.href = url
   a.download = `payments-${props.projectId}.csv`
   a.click()
}

watch(() => props.projectId, () => {
  fetchPayments()
  fetchMilestones()
})

onMounted(() => {
  fetchPayments()
  fetchMilestones()
  fetchUser()
})
</script>

<style scoped>
.payments-tab { animation: fadeIn 0.4s ease-out; }

.header-row { 
  display: flex; justify-content: space-between; align-items: center; 
  margin-bottom: 24px; 
}

h2 { 
  font-size: 20px; font-weight: 600; color: white; margin: 0; 
  letter-spacing: -0.02em;
}

.btn-yellow { 
   background: #F59E0B; /* Premium Yellow */
   color: #000; 
   border: none; padding: 10px 20px; 
   border-radius: 10px; 
   font-weight: 600; cursor: pointer;
   display: flex; align-items: center; gap: 8px;
   font-size: 13px; letter-spacing: 0.01em;
   /* No shadow/glow as requested */
   transition: transform 0.15s ease, background 0.15s ease;
}
.btn-yellow:hover {
   transform: scale(1.02); /* Subtle scale */
   background: #fbbf24; /* Slightly lighter yellow */
}
.btn-yellow:active { transform: scale(0.98); }

@keyframes fadeIn { 
  from { opacity: 0; transform: translateY(10px); } 
  to { opacity: 1; transform: translateY(0); } 
}
</style>
