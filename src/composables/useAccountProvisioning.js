/**
 * useAccountProvisioning — thin client for the HR Account-Provisioning API
 * (`/api/hr/account-provisioning`). Drives the employee's ERP login + the
 * per-system IT access records (EMAIL / VPN / GIT / SLACK / BIOMETRIC / …).
 *
 * The **ERP** account_type is special: granting / revoking it flips the linked
 * `User` (set password, toggle is_active + is_activated) so the employee can
 * sign in directly. See the backend router docstring for the full contract.
 *
 * Lives in `composables/` (not the onboarding view folder) so any per-employee
 * surface — the profile Accounts tab, exit clearance, etc. — can share it
 * without coupling to onboarding internals.
 */
import axios from 'axios'
import { API, authHeader } from '@/utils/api'

const BASE = `${API}/hr/account-provisioning`

// Canonical AccountType enum — mirrors app/models/hr/account_provisioning.py.
export const ACCOUNT_TYPES = [
  'ERP', 'EMAIL', 'VPN', 'BIOMETRIC', 'ATTENDANCE',
  'RFID_SYSTEM', 'GIT', 'SLACK', 'DRIVE', 'OTHER',
]

export function useAccountProvisioning() {
  const fetchByEmployee = async (employeeId) => {
    const { data } = await axios.get(`${BASE}/by-employee/${employeeId}`, { headers: authHeader() })
    return data
  }
  const create = async (payload) => {
    const { data } = await axios.post(`${BASE}/`, payload, { headers: authHeader() })
    return data
  }
  const patch = async (id, payload) => {
    const { data } = await axios.patch(`${BASE}/${id}`, payload, { headers: authHeader() })
    return data
  }
  const activate = async (id) => {
    const { data } = await axios.post(`${BASE}/${id}/activate`, {}, { headers: authHeader() })
    return data
  }
  const revoke = async (id) => {
    const { data } = await axios.post(`${BASE}/${id}/revoke`, {}, { headers: authHeader() })
    return data
  }
  // ERP login bridge — set/reset the linked User's password and activate the login.
  const setCredentials = async (id, payload) => {
    const { data } = await axios.post(`${BASE}/${id}/set-credentials`, payload, { headers: authHeader() })
    return data
  }
  const remove = async (id) => {
    await axios.delete(`${BASE}/${id}`, { headers: authHeader() })
  }
  return { fetchByEmployee, create, patch, activate, revoke, setCredentials, remove }
}
