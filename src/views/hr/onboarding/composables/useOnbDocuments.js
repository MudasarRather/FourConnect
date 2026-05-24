import axios from 'axios'

const authHeader = () => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchSlots(processId) {
  const { data } = await axios.get(`/api/hr/onboarding/documents/by-process/${processId}`, { headers: authHeader() })
  return data
}

export async function uploadToSlot(slotId, file, expiryDate = null) {
  const form = new FormData()
  form.append('file', file)
  if (expiryDate) form.append('expiry_date', expiryDate)
  const { data } = await axios.post(`/api/hr/onboarding/documents/${slotId}/upload`, form, {
    headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function verifySlot(slotId, { notes = '', expiryDate = null } = {}) {
  const { data } = await axios.post(`/api/hr/onboarding/documents/${slotId}/verify`,
    { notes, expiry_date: expiryDate },
    { headers: authHeader() }
  )
  return data
}

export async function rejectSlot(slotId, reason) {
  const { data } = await axios.post(`/api/hr/onboarding/documents/${slotId}/reject`,
    { reason },
    { headers: authHeader() }
  )
  return data
}

export async function clearSlotFile(slotId) {
  const { data } = await axios.delete(`/api/hr/onboarding/documents/${slotId}/file`, { headers: authHeader() })
  return data
}
