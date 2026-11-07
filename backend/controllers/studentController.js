const Student = require('../models/Student')

const allowedFormats = ['Hands-on workshops', 'Talks & seminars', 'Coding sessions', 'Project sprints', 'Peer learning circles']
const allowedSkills = ['Beginner', 'Intermediate', 'Advanced']
const allowedTimings = ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Weekend mornings', 'Weekend afternoons']
const allowedDepartments = ['Computer Science & Engineering', 'Information Technology', 'Electronics & Communication', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Business & Management', 'Design', 'Other']
const allowedYears = ['1st year', '2nd year', '3rd year', '4th year', '5th year', 'Graduate / postgraduate', 'Other']
const allowedInterests = ['Web Development', 'Artificial Intelligence', 'Data Science', 'Cybersecurity', 'Cloud & DevOps', 'Mobile Development', 'UI/UX Design', 'Competitive Programming']
const emailPattern = /^(?!\.)(?!.*\.\.)[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+(?<!\.)@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function validateRegistration(body) {
  const errors = {}
  const name = text(body.name)
  const email = text(body.email).toLowerCase()
  const countryCode = text(body.countryCode)
  const rawWhatsapp = text(body.whatsapp)
  const whatsapp = rawWhatsapp.replace(/[\s()-]/g, '')
  const department = text(body.department)
  const year = text(body.year)
  const interests = Array.isArray(body.interests) ? [...new Set(body.interests.map(text).filter(Boolean))] : []
  const skill = text(body.skill)
  const formats = Array.isArray(body.formats) ? [...new Set(body.formats.map(text).filter(Boolean))] : []
  const timing = text(body.timing)
  const goals = text(body.goals)
  const suggestions = text(body.suggestions)
  const customInterest = text(body.customInterest)

  if (name.length < 2 || name.length > 100) errors.name = 'Enter a name between 2 and 100 characters.'
  if (email.length > 254 || !emailPattern.test(email)) errors.email = 'Enter a valid email address.'
  if (!/^\+\d{1,4}$/.test(countryCode)) errors.countryCode = 'Choose a valid country calling code.'
  if (!/^\d{7,15}$/.test(whatsapp)) errors.whatsapp = 'Enter a valid WhatsApp number.'
  if (!allowedDepartments.includes(department)) errors.department = 'Choose a valid department.'
  if (!allowedYears.includes(year)) errors.year = 'Choose a valid year of study.'
  if (interests.length < 1 || interests.length > allowedInterests.length || interests.some(value => !allowedInterests.includes(value))) errors.interests = 'Choose at least one valid interest.'
  if (!allowedSkills.includes(skill)) errors.skill = 'Choose a valid skill level.'
  if (formats.length < 1 || formats.length > allowedFormats.length || formats.some(value => !allowedFormats.includes(value))) errors.formats = 'Choose at least one valid learning format.'
  if (!allowedTimings.includes(timing)) errors.timing = 'Choose a valid preferred session time.'
  if (goals.length > 500) errors.goals = 'Learning goals must be 500 characters or fewer.'
  if (suggestions.length > 500) errors.suggestions = 'Suggestions must be 500 characters or fewer.'
  if (customInterest.length > 100) errors.customInterest = 'Additional interests must be 100 characters or fewer.'
  if (body.consent !== true) errors.consent = 'Consent is required to register.'

  if (Object.keys(errors).length) return { errors }
  return {
    value: {
      name, email, countryCode, whatsapp, department, year, interests,
      customInterest, skill, formats, timing, goals, suggestions,
      consent: true, consentAt: new Date(),
    },
  }
}

async function registerStudent(req, res) {
  const result = validateRegistration(req.body || {})
  if (result.errors) {
    return res.status(400).json({ message: 'Please correct the highlighted fields.', errors: result.errors })
  }

  try {
    const student = await Student.create(result.value)
    return res.status(201).json({ success: true, registrationId: student.id })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A registration with this email already exists.' })
    }
    throw error
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function getStudents(req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25))
  const filter = {}
  const search = text(req.query.search).slice(0, 100)
  const department = text(req.query.department).slice(0, 100)
  const year = text(req.query.year).slice(0, 50)
  const interest = text(req.query.interest).slice(0, 80)

  if (search) {
    const safeSearch = new RegExp(escapeRegExp(search), 'i')
    filter.$or = [{ name: safeSearch }, { email: safeSearch }]
  }
  if (department) filter.department = department
  if (year) filter.year = year
  if (interest) filter.$and = [...(filter.$and || []), { $or: [{ interests: interest }, { customInterest: interest }] }]

  const [students, total] = await Promise.all([
    Student.find(filter).select('-__v').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Student.countDocuments(filter),
  ])

  res.set('Cache-Control', 'no-store')
  return res.json({ students, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
}

async function getAnalytics(_req, res) {
  const topics = {
    $concatArrays: [
      { $ifNull: ['$interests', []] },
      {
        $cond: [
          { $ne: [{ $trim: { input: { $ifNull: ['$customInterest', ''] } } }, ''] },
          [{ $trim: { input: { $ifNull: ['$customInterest', ''] } } }],
          [],
        ],
      },
    ],
  }
  const [totalStudents, departments, interests, skillLevels, departmentInterests, years, formats, timings] = await Promise.all([
    Student.countDocuments(),
    Student.distinct('department'),
    Student.aggregate([
      { $project: { topics } },
      { $unwind: '$topics' },
      { $group: { _id: '$topics', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { _id: 0, interest: '$_id', count: 1 } },
    ]),
    Student.aggregate([
      { $group: { _id: '$skill', count: { $sum: 1 } } },
      { $project: { _id: 0, skill: '$_id', count: 1 } },
    ]),
    Student.aggregate([
      { $project: { department: 1, topics } },
      { $unwind: '$topics' },
      { $group: { _id: { department: '$department', interest: '$topics' }, count: { $sum: 1 } } },
      { $sort: { '_id.department': 1, count: -1 } },
      { $project: { _id: 0, department: '$_id.department', interest: '$_id.interest', count: 1 } },
    ]),
    Student.aggregate([
      { $group: { _id: '$year', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, year: '$_id', count: 1 } },
    ]),
    Student.aggregate([
      { $unwind: '$formats' },
      { $group: { _id: '$formats', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { _id: 0, format: '$_id', count: 1 } },
    ]),
    Student.aggregate([
      { $group: { _id: '$timing', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { _id: 0, timing: '$_id', count: 1 } },
    ]),
  ])

  const levels = ['Beginner', 'Intermediate', 'Advanced'].map(skill => ({
    skill,
    count: skillLevels.find(level => level.skill === skill)?.count || 0,
  }))
  res.set('Cache-Control', 'no-store')
  return res.json({
    totalStudents,
    totalDepartments: departments.length,
    mostPopularTopic: interests[0]?.interest || null,
    interests,
    skillLevels: levels,
    departments: departments.sort((a, b) => a.localeCompare(b)),
    departmentInterests,
    years,
    formats,
    timings,
  })
}

function csvCell(value) {
  let safe = value == null ? '' : String(value)
  if (/^[\s]*[-=+@]/.test(safe)) safe = `'${safe}`
  return `"${safe.replace(/"/g, '""')}"`
}

async function exportStudents(_req, res) {
  const students = await Student.find().select('-__v').sort({ createdAt: -1 }).limit(10000).lean()
  const columns = [
    ['name', 'Name'], ['email', 'Email'], ['countryCode', 'Country code'], ['whatsapp', 'WhatsApp'],
    ['department', 'Department'], ['year', 'Year'], ['interests', 'Interests'], ['customInterest', 'Other interest'],
    ['skill', 'Skill level'], ['formats', 'Learning formats'], ['timing', 'Preferred timing'],
    ['goals', 'Learning goals'], ['suggestions', 'Suggestions'], ['consent', 'Consent'], ['consentAt', 'Consent date'], ['createdAt', 'Registered at'],
  ]
  const lines = [
    columns.map(([, label]) => csvCell(label)).join(','),
    ...students.map(student => columns.map(([key]) => {
      const value = Array.isArray(student[key]) ? student[key].join('; ') : student[key]
      return csvCell(value)
    }).join(',')),
  ]

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="bytemonk-students.csv"')
  res.setHeader('Cache-Control', 'no-store')
  return res.send(`\uFEFF${lines.join('\r\n')}`)
}

module.exports = { exportStudents, getAnalytics, getStudents, registerStudent, validateRegistration }
