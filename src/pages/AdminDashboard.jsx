import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, ArrowDownToLine, ArrowLeft, BarChart3, Building2, CalendarClock, ChevronLeft, ChevronRight, Download, KeyRound, LogOut, RefreshCw, Search, ShieldCheck, Sparkles, Trash2, Users } from 'lucide-react'
import { Footer, SiteHeader } from '../components/SiteChrome.jsx'
import { adminLogin, deleteStudentRegistration, downloadStudentExport, getAdminAnalytics, getStudentRegistrations } from '../api/admin.js'
import '../styles/admin.css'

const chartColors = ['#9b87ff', '#61c8db', '#efa1d8', '#f1c46f', '#79d5a4', '#81a8ff', '#ff9a78', '#b6a0f0']
const emptyAnalytics = { totalStudents: 0, totalDepartments: 0, mostPopularTopic: null, interests: [], skillLevels: [], departments: [], departmentInterests: [], years: [], formats: [], timings: [] }
const initialFilters = { search: '', department: '', year: '', interest: '' }

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tooltip"><strong>{label}</strong>{payload.map(item => <span key={item.dataKey || item.name} style={{ color: item.color }}><i/>{item.name}: <b>{item.value}</b></span>)}</div>
}

function Panel({ eyebrow, title, description, className = '', children }) {
  return <section className={`admin-panel ${className}`}><div className="admin-panel-heading"><div><span>{eyebrow}</span><h2>{title}</h2></div>{description && <p>{description}</p>}</div>{children}</section>
}

function EmptyChart({ children = 'Registration data will appear here as students respond.' }) {
  return <div className="admin-empty-chart"><BarChart3 size={20}/><span>{children}</span></div>
}

function LoginGate({ value, onChange, onSubmit, error, loading }) {
  return <div className="admin-gate-wrap"><form className="admin-gate" onSubmit={onSubmit}><div className="admin-gate-icon"><KeyRound size={22}/></div><span className="admin-overline">BYTE MONK · ORGANIZERS</span><h1>Good to see you.</h1><p>Enter your organizer access key to review registrations and community trends.</p>{error && <div className="admin-alert" role="alert">{error}</div>}<label htmlFor="admin-key">Admin access key</label><input id="admin-key" type="password" autoComplete="current-password" value={value} onChange={event => onChange(event.target.value)} placeholder="Paste your private admin key" required/><button type="submit" className="button-primary" disabled={loading}>{loading ? <><span className="spinner"/>Verifying access…</> : <>Open dashboard <ArrowDownToLine size={16}/></>}</button><span className="admin-gate-note"><ShieldCheck size={14}/> Your key is sent once to sign in. Only a short-lived session is kept in memory.</span></form></div>
}

function SkillMix({ levels = [], total = 0 }) {
  const skillColors = { Beginner: '#76d5aa', Intermediate: '#9b87ff', Advanced: '#61c8db' }
  return <div className="skill-mix"><div className="skill-bar" aria-label="Skill level distribution">{levels.map(level => <span key={level.skill} style={{ width: `${total ? (level.count / total) * 100 : 0}%`, backgroundColor: skillColors[level.skill] }}/>)}</div><div className="skill-legend">{levels.map(level => <div key={level.skill}><span style={{ backgroundColor: skillColors[level.skill] }}/><span>{level.skill}</span><strong>{level.count}</strong></div>)}</div></div>
}

function AdminDashboard() {
  const [keyInput, setKeyInput] = useState('')
  const [adminToken, setAdminToken] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)
  const [authError, setAuthError] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [students, setStudents] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 })
  const [draftFilters, setDraftFilters] = useState(initialFilters)
  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!adminToken) return undefined
    let current = true
    setLoading(true)
    setError('')
    Promise.all([
      getAdminAnalytics(adminToken),
      getStudentRegistrations(adminToken, { ...filters, page, limit: 25 }),
    ]).then(([nextAnalytics, result]) => {
      if (!current) return
      setAnalytics(nextAnalytics)
      setStudents(result.students || [])
      setPagination(result.pagination || { page, limit: 25, total: 0, pages: 0 })
      setAuthError('')
    }).catch(requestError => {
      if (!current) return
      const status = requestError.response?.status
      if (status === 401 || status === 503) {
        setAuthError(status === 401 ? 'Your session has expired. Please sign in again.' : 'Admin access is not configured on the backend yet.')
        setAdminToken('')
        setAnalytics(null)
        setStudents([])
        return
      }
      setError(requestError.response?.data?.message || 'The dashboard could not reach the API. Make sure the backend and MongoDB are running.')
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [adminToken, filters, page, refreshTick])

  const analyticsData = analytics || emptyAnalytics
  const departmentChartData = useMemo(() => {
    if (!analyticsData.departmentInterests?.length) return []
    const topTopics = analyticsData.interests.slice(0, 5).map(item => item.interest)
    const departmentTotals = new Map()
    for (const item of analyticsData.departmentInterests) departmentTotals.set(item.department, (departmentTotals.get(item.department) || 0) + item.count)
    const topDepartments = [...departmentTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([department]) => department)
    return topDepartments.map(department => {
      const row = { department: department.length > 20 ? `${department.slice(0, 18)}…` : department }
      for (const topic of topTopics) {
        row[topic] = analyticsData.departmentInterests.find(item => item.department === department && item.interest === topic)?.count || 0
      }
      return row
    })
  }, [analyticsData])

  const handleLogin = async event => {
    event.preventDefault()
    const key = keyInput.trim()
    if (!key || signingIn) return
    setAuthError('')
    setAnalytics(null)
    setSigningIn(true)
    try {
      const { token } = await adminLogin(key)
      setKeyInput('')
      setAdminToken(token)
    } catch (loginError) {
      const status = loginError.response?.status
      if (status === 401) setAuthError('That key was not accepted.')
      else if (status === 429) {
        const seconds = Number(loginError.response?.data?.retryAfterSeconds)
        const minutes = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds / 60) : null
        setAuthError(minutes ? `Too many attempts. Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.` : 'Too many attempts. Please try again later.')
      } else if (status === 503) setAuthError('Admin access is not configured on the backend yet.')
      else setAuthError('Could not reach the API. Make sure the backend is running.')
    } finally {
      setSigningIn(false)
    }
  }

  const logout = () => {
    setAdminToken('')
    setAnalytics(null)
    setStudents([])
    setPagination({ page: 1, limit: 25, total: 0, pages: 0 })
    setDraftFilters(initialFilters)
    setFilters(initialFilters)
    setPage(1)
    setError('')
    setAuthError('')
  }

  const applyFilters = event => {
    event.preventDefault()
    setPage(1)
    setFilters({ ...draftFilters })
  }

  const clearFilters = () => {
    setDraftFilters(initialFilters)
    setFilters(initialFilters)
    setPage(1)
  }

  const removeStudent = async id => {
    setDeletingId(id)
    setError('')
    try {
      await deleteStudentRegistration(adminToken, id)
      setPendingDeleteId('')
      if (students.length === 1 && page > 1) setPage(page - 1)
      setRefreshTick(tick => tick + 1)
    } catch (deleteError) {
      const status = deleteError.response?.status
      if (status === 401) {
        logout()
        setAuthError('Your session has expired. Please sign in again.')
        return
      }
      if (status === 404) {
        setPendingDeleteId('')
        setRefreshTick(tick => tick + 1)
        return
      }
      setError('The registration could not be deleted. Please try again.')
    } finally {
      setDeletingId('')
    }
  }

  const exportCsv = async () => {
    setExporting(true)
    setError('')
    try {
      const blob = await downloadStudentExport(adminToken)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `bytemonk-students-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (exportError) {
      if (exportError.response?.status === 401) return logout()
      setError('The CSV export could not be downloaded. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const refresh = () => {
    setPage(currentPage => currentPage)
    setFilters(current => ({ ...current }))
  }

  return <><SiteHeader/><main className="admin-page">
    {!adminToken ? <LoginGate value={keyInput} onChange={setKeyInput} onSubmit={handleLogin} error={authError} loading={signingIn}/> : <div className="admin-shell">
      <div className="admin-toolbar"><div><span className="admin-overline"><span className="admin-live-dot"/> ORGANIZER CONSOLE</span><h1>Community overview</h1><p>Student interest, at a glance.</p></div><div className="admin-toolbar-actions"><span className="admin-secure-label"><ShieldCheck size={14}/> Protected workspace</span><button className="admin-icon-button" onClick={refresh} aria-label="Refresh dashboard" title="Refresh"><RefreshCw size={16}/></button><button className="admin-logout" onClick={logout}><LogOut size={15}/> Sign out</button></div></div>
      {error && <div className="admin-alert" role="alert">{error}</div>}
      {loading && !analytics ? <div className="admin-loading"><span className="spinner"/>Loading your dashboard…</div> : <>
        <section className="admin-metrics" aria-label="Registration overview">
          <article className="admin-metric"><div className="metric-icon purple"><Users size={18}/></div><span className="metric-label">TOTAL REGISTERED</span><strong>{analyticsData.totalStudents.toLocaleString()}</strong><small>Student responses received</small></article>
          <article className="admin-metric"><div className="metric-icon cyan"><Sparkles size={18}/></div><span className="metric-label">MOST POPULAR TOPIC</span><strong className="metric-topic">{analyticsData.mostPopularTopic || 'Awaiting responses'}</strong><small>{analyticsData.interests?.[0]?.count || 0} student selections</small></article>
          <article className="admin-metric"><div className="metric-icon pink"><Building2 size={18}/></div><span className="metric-label">DEPARTMENTS</span><strong>{analyticsData.totalDepartments.toLocaleString()}</strong><small>Represented in the community</small></article>
          <article className="admin-metric skill-metric"><div className="metric-icon green"><Activity size={18}/></div><span className="metric-label">SKILL LEVELS</span><SkillMix levels={analyticsData.skillLevels} total={analyticsData.totalStudents}/></article>
        </section>

        <div className="admin-section-title"><div><span className="admin-overline">DEMAND SIGNALS</span><h2>What students want to learn</h2></div><span className="data-note">Based on {analyticsData.totalStudents.toLocaleString()} registrations</span></div>
        <section className="admin-chart-grid">
          <Panel eyebrow="TOPIC LANDSCAPE" title="Technical domains" description="Interest selections across all registrations" className="chart-panel topic-chart-panel">
            {analyticsData.interests.length ? <div className="chart-area"><ResponsiveContainer width="100%" height={Math.max(250, analyticsData.interests.slice(0, 8).length * 39)}><BarChart data={analyticsData.interests.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 18, bottom: 0, left: 8 }}><CartesianGrid stroke="#ffffff0c" horizontal={false}/><XAxis type="number" allowDecimals={false} tick={{ fill: '#77788d', fontSize: 10 }} axisLine={false} tickLine={false}/><YAxis dataKey="interest" type="category" width={142} tick={{ fill: '#b9b8ca', fontSize: 10 }} axisLine={false} tickLine={false}/><Tooltip content={<ChartTooltip/>} cursor={{ fill: '#ffffff08' }}/><Bar dataKey="count" name="Students" fill="#9b87ff" radius={[0, 5, 5, 0]} barSize={17}/></BarChart></ResponsiveContainer></div> : <EmptyChart/>}
          </Panel>
          <Panel eyebrow="STUDENT PROFILE" title="Department-wise interests" description="Top departments and their most selected topics" className="chart-panel department-chart-panel">
            {departmentChartData.length ? <><div className="chart-area"><ResponsiveContainer width="100%" height={280}><BarChart data={departmentChartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}><CartesianGrid stroke="#ffffff0c" vertical={false}/><XAxis dataKey="department" tick={{ fill: '#89899f', fontSize: 9 }} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{ fill: '#77788d', fontSize: 10 }} axisLine={false} tickLine={false}/><Tooltip content={<ChartTooltip/>}/>{analyticsData.interests.slice(0, 5).map((topic, index) => <Bar key={topic.interest} dataKey={topic.interest} name={topic.interest} stackId="topics" fill={chartColors[index]} radius={index === Math.min(analyticsData.interests.length, 5) - 1 ? [3, 3, 0, 0] : 0}/>)}</BarChart></ResponsiveContainer></div><div className="chart-legend">{analyticsData.interests.slice(0, 5).map((topic, index) => <span key={topic.interest}><i style={{ background: chartColors[index] }}/>{topic.interest}</span>)}</div></> : <EmptyChart/>}
          </Panel>
          <Panel eyebrow="PARTICIPATION" title="Year of study" description="Students represented by current study year" className="chart-panel">
            {analyticsData.years.length ? <div className="chart-area"><ResponsiveContainer width="100%" height={230}><BarChart data={analyticsData.years} margin={{ top: 8, right: 10, bottom: 0, left: -12 }}><CartesianGrid stroke="#ffffff0c" vertical={false}/><XAxis dataKey="year" tick={{ fill: '#89899f', fontSize: 9 }} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{ fill: '#77788d', fontSize: 10 }} axisLine={false} tickLine={false}/><Tooltip content={<ChartTooltip/>}/><Bar dataKey="count" name="Students" fill="#61c8db" radius={[4, 4, 0, 0]} barSize={27}/></BarChart></ResponsiveContainer></div> : <EmptyChart/>}
          </Panel>
          <Panel eyebrow="LEARNING STYLE" title="Preferred workshop formats" description="How students prefer to learn together" className="chart-panel">
            {analyticsData.formats.length ? <div className="chart-area"><ResponsiveContainer width="100%" height={230}><BarChart data={analyticsData.formats} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 5 }}><CartesianGrid stroke="#ffffff0c" horizontal={false}/><XAxis type="number" allowDecimals={false} tick={{ fill: '#77788d', fontSize: 10 }} axisLine={false} tickLine={false}/><YAxis dataKey="format" type="category" width={143} tick={{ fill: '#b9b8ca', fontSize: 9 }} axisLine={false} tickLine={false}/><Tooltip content={<ChartTooltip/>}/><Bar dataKey="count" name="Selections" fill="#efa1d8" radius={[0, 4, 4, 0]} barSize={16}/></BarChart></ResponsiveContainer></div> : <EmptyChart/>}
          </Panel>
          <Panel eyebrow="WHEN TO GATHER" title="Preferred session timing" description="Scheduling windows students selected" className="chart-panel">
            {analyticsData.timings.length ? <div className="chart-area"><ResponsiveContainer width="100%" height={230}><BarChart data={analyticsData.timings} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 5 }}><CartesianGrid stroke="#ffffff0c" horizontal={false}/><XAxis type="number" allowDecimals={false} tick={{ fill: '#77788d', fontSize: 10 }} axisLine={false} tickLine={false}/><YAxis dataKey="timing" type="category" width={145} tick={{ fill: '#b9b8ca', fontSize: 9 }} axisLine={false} tickLine={false}/><Tooltip content={<ChartTooltip/>}/><Bar dataKey="count" name="Students" fill="#f1c46f" radius={[0, 4, 4, 0]} barSize={16}/></BarChart></ResponsiveContainer></div> : <EmptyChart/>}
          </Panel>
          <Panel eyebrow="EXPERIENCE MIX" title="Beginner to advanced" description="Current self-reported skill levels" className="chart-panel skill-chart-panel">
            {analyticsData.totalStudents ? <div className="skill-chart-body"><ResponsiveContainer width="100%" height={190}><PieChart><Pie data={analyticsData.skillLevels} dataKey="count" nameKey="skill" cx="50%" cy="50%" innerRadius={52} outerRadius={76} paddingAngle={4} stroke="none">{analyticsData.skillLevels.map((level, index) => <Cell key={level.skill} fill={['#76d5aa', '#9b87ff', '#61c8db'][index]}/>)}</Pie><Tooltip content={<ChartTooltip/>}/></PieChart></ResponsiveContainer><div className="skill-chart-center"><strong>{analyticsData.totalStudents}</strong><span>students</span></div><div className="skill-chart-legend">{analyticsData.skillLevels.map((level, index) => <span key={level.skill}><i style={{ background: ['#76d5aa', '#9b87ff', '#61c8db'][index] }}/>{level.skill}<b>{level.count}</b></span>)}</div></div> : <EmptyChart/>}
          </Panel>
        </section>

        <section className="admin-panel student-panel"><div className="admin-panel-heading student-heading"><div><span>REGISTRATION RECORDS</span><h2>Student management</h2></div><button className="admin-export-button" onClick={exportCsv} disabled={exporting || !analyticsData.totalStudents}>{exporting ? <span className="spinner"/> : <Download size={15}/>} Export CSV</button></div>
          <form className="student-filters" onSubmit={applyFilters}><label className="admin-search"><Search size={15}/><input aria-label="Search by name or email" placeholder="Search name or email" value={draftFilters.search} onChange={event => setDraftFilters(filters => ({ ...filters, search: event.target.value }))}/></label><select aria-label="Filter by department" value={draftFilters.department} onChange={event => setDraftFilters(filters => ({ ...filters, department: event.target.value }))}><option value="">All departments</option>{analyticsData.departments.map(department => <option key={department}>{department}</option>)}</select><select aria-label="Filter by year" value={draftFilters.year} onChange={event => setDraftFilters(filters => ({ ...filters, year: event.target.value }))}><option value="">All years</option>{analyticsData.years.map(item => <option key={item.year}>{item.year}</option>)}</select><select aria-label="Filter by interest" value={draftFilters.interest} onChange={event => setDraftFilters(filters => ({ ...filters, interest: event.target.value }))}><option value="">All interests</option>{analyticsData.interests.map(item => <option key={item.interest}>{item.interest}</option>)}</select><button type="submit" className="filter-apply">Apply filters</button><button type="button" className="filter-clear" onClick={clearFilters}>Clear</button></form>
          <div className="student-table-wrap"><table className="student-table"><thead><tr><th>STUDENT</th><th>DEPARTMENT & YEAR</th><th>INTERESTS</th><th>LEVEL</th><th>REGISTERED</th><th><span className="sr-only">ACTIONS</span></th></tr></thead><tbody>{students.map(student => <tr key={student._id}><td><strong>{student.name}</strong><span>{student.email}</span><span className="student-phone">{student.countryCode} {student.whatsapp}</span></td><td><strong>{student.department}</strong><span>{student.year}</span></td><td><div className="student-tags">{[...(student.interests || []), student.customInterest].filter(Boolean).map(interest => <span key={interest}>{interest}</span>)}</div></td><td><span className={`skill-badge skill-${student.skill?.toLowerCase()}`}>{student.skill}</span></td><td className="registered-date">{student.createdAt ? new Date(student.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td><td className="student-actions">{pendingDeleteId === student._id
            ? <div className="delete-confirm" role="group" aria-label={`Confirm deleting ${student.name}`}><span>Delete permanently?</span><button type="button" className="delete-yes" disabled={deletingId === student._id} onClick={() => removeStudent(student._id)}>{deletingId === student._id ? 'Deleting…' : 'Delete'}</button><button type="button" className="delete-no" disabled={deletingId === student._id} onClick={() => setPendingDeleteId('')}>Cancel</button></div>
            : <button type="button" className="admin-icon-button delete-trigger" aria-label={`Delete registration for ${student.name}`} title="Delete registration" onClick={() => setPendingDeleteId(student._id)}><Trash2 size={14}/></button>}</td></tr>)}</tbody></table>{!students.length && <div className="student-empty">{loading ? 'Loading registrations…' : pagination.total ? 'No registrations match these filters.' : 'No registrations yet. Student responses will appear here.'}</div>}</div>
          <div className="table-footer"><span>Showing {students.length ? ((page - 1) * 25) + 1 : 0}–{Math.min(page * 25, pagination.total)} of {pagination.total} registrations</span><div><button aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage(currentPage => Math.max(1, currentPage - 1))}><ChevronLeft size={16}/></button><span>Page {page} of {Math.max(pagination.pages, 1)}</span><button aria-label="Next page" disabled={page >= pagination.pages || loading} onClick={() => setPage(currentPage => currentPage + 1)}><ChevronRight size={16}/></button></div></div>
        </section>
        <div className="admin-footnote"><ShieldCheck size={14}/> Registration details are restricted to organizers. The access key is cleared when you sign out or close this page.</div>
      </>}
    </div>}
  </main><Footer/></>
}

export default AdminDashboard
