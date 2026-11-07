import axios from 'axios'

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export async function adminLogin(key, code) {
  const { data } = await axios.post(`${apiBase}/admin/login`, { key, code })
  return data
}

function adminConfig(token, extra = {}) {
  return {
    ...extra,
    headers: { ...extra.headers, Authorization: `Bearer ${token}` },
  }
}

export async function getAdminAnalytics(token) {
  const { data } = await axios.get(`${apiBase}/students/analytics`, adminConfig(token))
  return data
}

export async function getStudentRegistrations(token, params) {
  const { data } = await axios.get(`${apiBase}/students`, adminConfig(token, { params }))
  return data
}

export async function downloadStudentExport(token) {
  const { data } = await axios.get(`${apiBase}/students/export`, adminConfig(token, { responseType: 'blob' }))
  return data
}

export async function deleteStudentRegistration(token, id) {
  const { data } = await axios.delete(`${apiBase}/students/${encodeURIComponent(id)}`, adminConfig(token))
  return data
}
