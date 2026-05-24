import axios from 'axios'

const authHeader = () => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchAssets(params = {}) {
  const { data } = await axios.get('/api/hr/assets/', { headers: authHeader(), params })
  return data
}
export async function createAsset(payload) {
  const { data } = await axios.post('/api/hr/assets/', payload, { headers: authHeader() })
  return data
}
export async function patchAsset(id, payload) {
  const { data } = await axios.patch(`/api/hr/assets/${id}`, payload, { headers: authHeader() })
  return data
}
export async function deleteAsset(id) {
  await axios.delete(`/api/hr/assets/${id}`, { headers: authHeader() })
}
export async function fetchAllocations(params = {}) {
  const { data } = await axios.get('/api/hr/assets/allocations', { headers: authHeader(), params })
  return data
}
export async function allocateAsset(assetId, payload) {
  const { data } = await axios.post(`/api/hr/assets/${assetId}/allocate`, payload, { headers: authHeader() })
  return data
}
export async function returnAllocation(allocId, payload) {
  const { data } = await axios.post(`/api/hr/assets/allocations/${allocId}/return`, payload, { headers: authHeader() })
  return data
}
export async function acknowledgeAllocation(allocId) {
  const { data } = await axios.post(`/api/hr/assets/allocations/${allocId}/acknowledge`, {}, { headers: authHeader() })
  return data
}
