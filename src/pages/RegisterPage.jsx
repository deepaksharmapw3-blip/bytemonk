import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ArrowRight, Check, ChevronDown, ShieldCheck } from 'lucide-react'
import { Footer, SiteHeader } from '../components/SiteChrome.jsx'
import { interests } from '../data/interests.js'
import { registerStudent } from '../api/students.js'
import '../styles/form.css'

const initialForm = { name: '', email: '', countryCode: '+91', whatsapp: '', department: '', year: '', interests: [], skill: '', formats: [], timing: '', goals: '', suggestions: '', consent: false }
const formatOptions = ['Hands-on workshops', 'Talks & seminars', 'Coding sessions', 'Project sprints', 'Peer learning circles']
const timingOptions = ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Weekend mornings', 'Weekend afternoons']

function Field({ label, id, hint, error, children }) { return <div className="field"><label htmlFor={id}>{label}</label>{children}{hint && <span className="field-hint">{hint}</span>}{error && <span className="field-error" role="alert">{error}</span>}</div> }

export default function RegisterPage({ onSubmit }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [submissionError, setSubmissionError] = useState('')
  const update = (key, value) => { setForm(prev => ({ ...prev, [key]: value })); setErrors(prev => ({ ...prev, [key]: '' })); setSubmissionError('') }
  const toggle = (key, value) => update(key, form[key].includes(value) ? form[key].filter(v => v !== value) : [...form[key], value])
  const validate = () => {
    const next = {}
    if (form.name.trim().length < 2) next.name = 'Please enter your full name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.'
    if (!/^\d{7,15}$/.test(form.whatsapp.replace(/[\s()-]/g, ''))) next.whatsapp = 'Enter a valid number with 7–15 digits.'
    if (!form.department) next.department = 'Choose your department.'
    if (!form.year) next.year = 'Choose your year of study.'
    if (!form.interests.length) next.interests = 'Select at least one area that interests you.'
    if (!form.skill) next.skill = 'Choose the level that feels right.'
    if (!form.formats.length) next.formats = 'Choose at least one learning format.'
    if (!form.timing) next.timing = 'Choose a preferred session time.'
    if (!form.consent) next.consent = 'Please confirm consent to continue.'
    setErrors(next)
    const key = Object.keys(next)[0]
    if (key) document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return !Object.keys(next).length
  }
  const submit = async event => {
    event.preventDefault()
    if (!validate()) return
    setBusy(true)
    setSubmissionError('')
    try {
      const result = await registerStudent({
        ...form,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
      })
      onSubmit({ ...form, name: form.name.trim(), email: form.email.trim().toLowerCase(), registrationId: result.registrationId })
      navigate('/success')
    } catch (error) {
      const response = error.response
      if (response?.status === 400 && response.data?.errors) {
        setErrors(previous => ({ ...previous, ...response.data.errors }))
        setSubmissionError('Some information needs attention. Please check the highlighted fields.')
      } else if (response?.status === 409) {
        setErrors(previous => ({ ...previous, email: 'A registration with this email already exists.' }))
        setSubmissionError('This email has already been registered.')
      } else if (response?.status === 429) {
        setSubmissionError('Too many attempts. Please wait a little and try again.')
      } else {
        setSubmissionError('We could not submit your response right now. Please check your connection and try again.')
      }
    } finally {
      setBusy(false)
    }
  }
  return <><SiteHeader/><main className="register-page"><div className="form-shell"><Link to="/" className="back-link"><ArrowLeft size={15}/> Back to ByteMonk</Link><div className="form-heading"><div className="eyebrow muted-eyebrow">LET’S GET TO KNOW YOU</div><h1>Your interests,<br/><span>in your own words.</span></h1><p>A few details help us make ByteMonk more relevant to you and your fellow learners.</p><div className="form-progress"><div><span className="progress-dot active"/><span className="progress-line"/><span className="progress-dot active"/><span className="progress-line"/><span className="progress-dot"/></div><span>ABOUT YOU <i>·</i> YOUR INTERESTS <i>·</i> ALL SET</span></div></div><form onSubmit={submit} noValidate>{submissionError && <div className="form-server-error" role="alert" aria-live="polite"><AlertCircle size={16}/><span>{submissionError}</span></div>}
    <section className="form-section"><div className="form-section-heading"><span>01</span><div><h2>The basics</h2><p>Just enough to make this personal.</p></div></div><div className="form-grid"><Field label="Full name" id="name" error={errors.name}><input id="name" value={form.name} onChange={e => update('name',e.target.value)} placeholder="e.g. Aanya Sharma" autoComplete="name"/></Field><Field label="Email address" id="email" error={errors.email}><input id="email" type="email" value={form.email} onChange={e => update('email',e.target.value)} placeholder="you@college.edu" autoComplete="email"/></Field><Field label="WhatsApp number" id="whatsapp" hint="For occasional ByteMonk updates. No spam." error={errors.whatsapp}><div className="phone-field"><select aria-label="Country calling code" value={form.countryCode} onChange={e => update('countryCode',e.target.value)}>{[['+91','IN +91'],['+1','US +1'],['+44','UK +44'],['+61','AU +61'],['+971','AE +971'],['+65','SG +65'],['+977','NP +977'],['+94','LK +94']].map(([code,label])=><option value={code} key={code}>{label}</option>)}</select><input id="whatsapp" type="tel" value={form.whatsapp} onChange={e => update('whatsapp',e.target.value)} placeholder="98765 43210" autoComplete="tel-national"/></div></Field><Field label="Department" id="department" error={errors.department}><div className="select-wrap"><select id="department" value={form.department} onChange={e => update('department',e.target.value)}><option value="">Choose your department</option>{['Computer Science & Engineering','Information Technology','Electronics & Communication','Electrical Engineering','Mechanical Engineering','Civil Engineering','Business & Management','Design','Other'].map(x=><option key={x}>{x}</option>)}</select><ChevronDown size={15}/></div></Field><Field label="Year of study" id="year" error={errors.year}><div className="select-wrap"><select id="year" value={form.year} onChange={e => update('year',e.target.value)}><option value="">Choose your year</option>{['1st year','2nd year','3rd year','4th year','5th year','Graduate / postgraduate','Other'].map(x=><option key={x}>{x}</option>)}</select><ChevronDown size={15}/></div></Field></div></section>
    <section className="form-section"><div className="form-section-heading"><span>02</span><div><h2>What are you curious about?</h2><p>Pick everything that catches your eye. You can choose more than one.</p></div></div><div className="interest-picker" id="interests">{interests.map(item=>{const Icon=item.icon;const selected=form.interests.includes(item.name);return <button type="button" key={item.name} className={`interest-option ${selected?'selected':''}`} aria-pressed={selected} onClick={()=>toggle('interests',item.name)}><span className={`interest-option-icon ${item.color}`}><Icon size={17}/></span><span>{item.name}</span><span className="selection-check">{selected&&<Check size={12}/>}</span></button>})}</div>{errors.interests&&<span className="field-error" role="alert">{errors.interests}</span>}<Field label="Something else on your mind?" id="customInterest" hint="Optional · Is there another area you’d love us to explore?"><input id="customInterest" value={form.customInterest||''} onChange={e=>update('customInterest',e.target.value)} placeholder="e.g. Game development, AR / VR..."/></Field><div className="sub-field"><div className="sub-label">How would you describe your current experience?</div><div className="segmented-options" id="skill">{['Beginner','Intermediate','Advanced'].map((v,i)=><button type="button" key={v} className={form.skill===v?'active':''} aria-pressed={form.skill===v} onClick={()=>update('skill',v)}><span>0{i+1}</span>{v}</button>)}</div>{errors.skill&&<span className="field-error">{errors.skill}</span>}</div></section>
    <section className="form-section"><div className="form-section-heading"><span>03</span><div><h2>Make it work for you</h2><p>Help us plan sessions you’ll actually want to join.</p></div></div><div className="sub-field"><div className="sub-label">What kind of learning sounds good? <span>Choose all that apply</span></div><div className="format-grid" id="formats">{formatOptions.map((v,i)=><button key={v} type="button" className={`format-option ${form.formats.includes(v)?'active':''}`} aria-pressed={form.formats.includes(v)} onClick={()=>toggle('formats',v)}><span className="format-check">{form.formats.includes(v)&&<Check size={12}/>}</span><span>{v}</span><small>0{i+1}</small></button>)}</div>{errors.formats&&<span className="field-error">{errors.formats}</span>}</div><Field label="When are you usually free?" id="timing" error={errors.timing}><div className="select-wrap"><select id="timing" value={form.timing} onChange={e=>update('timing',e.target.value)}><option value="">Pick a time that works best</option>{timingOptions.map(x=><option key={x}>{x}</option>)}</select><ChevronDown size={15}/></div></Field><Field label="What would you love to achieve?" id="goals" hint="Optional · A skill you’d like to build, a project to ship, or a question you want answered."><textarea id="goals" rows="3" maxLength="500" value={form.goals} onChange={e=>update('goals',e.target.value)} placeholder="I’d love to learn how to..."/></Field><Field label="Any suggestions for ByteMonk?" id="suggestions" hint="Optional · Speakers, ideas, collaborations, the works."><textarea id="suggestions" rows="3" maxLength="500" value={form.suggestions} onChange={e=>update('suggestions',e.target.value)} placeholder="It would be great if..."/></Field></section>
    <div className={`consent-box ${errors.consent?'has-error':''}`} id="consent"><label className="consent-control"><input type="checkbox" checked={form.consent} onChange={e=>update('consent',e.target.checked)}/><span className="custom-checkbox"><Check size={13}/></span><span>I’m happy for the ByteMonk team to use these details for student community planning and relevant event updates.</span></label>{errors.consent&&<span className="field-error">{errors.consent}</span>}<p><ShieldCheck size={14}/> Your registration is stored in ByteMonk’s database and used for student community planning and relevant event updates.</p></div><button type="submit" className="button-primary submit-button" disabled={busy}>{busy?<><span className="spinner"/>Sending your response…</>:<>Send my interests <ArrowRight size={17}/></>}</button><span className="submit-footnote">Usually takes about 3 minutes <span>·</span> Your time matters</span>
    </form></div></main><Footer/></>
}

