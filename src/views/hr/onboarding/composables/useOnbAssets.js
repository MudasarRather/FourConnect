import axios from 'axios'
import { API, authHeader } from '@/utils/api'

export async function fetchAssets(params = {}) {
  const { data } = await axios.get(`${API}/hr/assets/`, { headers: authHeader(), params })
  return data
}
export async function createAsset(payload) {
  const { data } = await axios.post(`${API}/hr/assets/`, payload, { headers: authHeader() })
  return data
}
export async function patchAsset(id, payload) {
  const { data } = await axios.patch(`${API}/hr/assets/${id}`, payload, { headers: authHeader() })
  return data
}
export async function deleteAsset(id) {
  await axios.delete(`${API}/hr/assets/${id}`, { headers: authHeader() })
}
export async function fetchAllocations(params = {}) {
  const { data } = await axios.get(`${API}/hr/assets/allocations`, { headers: authHeader(), params })
  return data
}
export async function allocateAsset(assetId, payload) {
  const { data } = await axios.post(`${API}/hr/assets/${assetId}/allocate`, payload, { headers: authHeader() })
  return data
}
export async function returnAllocation(allocId, payload) {
  const { data } = await axios.post(`${API}/hr/assets/allocations/${allocId}/return`, payload, { headers: authHeader() })
  return data
}
export async function acknowledgeAllocation(allocId) {
  const { data } = await axios.post(`${API}/hr/assets/allocations/${allocId}/acknowledge`, {}, { headers: authHeader() })
  return data
}
