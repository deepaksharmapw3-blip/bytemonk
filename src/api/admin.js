import axios from 'axios'

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function adminConfig(key, extra = {}) {
  return {
    ...extra,
    headers: { ...extra.headers, Authorization: `Bearer ${key}` },
  }
}

export async function getAdminAnalytics(key) {
  const { data } = await axios.get(`${apiBase}/students/analytics`, adminConfig(key))
  return data
}

export async function getStudentRegistrations(key, params) {
  const { data } = await axios.get(`${apiBase}/students`, adminConfig(key, { params }))
  return data
}

export async function downloadStudentExport(key) {
  const { data } = await axios.get(`${apiBase}/students/export`, adminConfig(key, { responseType: 'blob' }))
  return data
}
