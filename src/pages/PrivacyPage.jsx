import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Footer, SiteHeader } from '../components/SiteChrome.jsx'
import '../styles/privacy.css'

// Set VITE_CONTACT_EMAIL in the root .env (and in your hosting dashboard) to show a contact address here.
const configuredEmail = (import.meta.env.VITE_CONTACT_EMAIL || '').trim()
const CONTACT_EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(configuredEmail) ? configuredEmail : ''

const collected = [
  ['Identity and contact', 'Your name, email address, and WhatsApp number (with country calling code).'],
  ['About your studies', 'Your department and year of study.'],
  ['Your preferences', 'Topics you are interested in (including any you add yourself), your experience level, preferred learning formats, and when you are usually free.'],
  ['Optional notes', 'Learning goals and suggestions, only if you choose to write them.'],
  ['Consent record', 'That you agreed to the use described here, and the date and time you did so.'],
]

export default function PrivacyPage() {
  return <>
    <SiteHeader/>
    <main className="privacy-page">
      <article className="privacy-shell">
        <Link to="/register" className="back-link"><ArrowLeft size={14}/> Back to registration</Link>
        <header className="privacy-heading">
          <div className="eyebrow muted-eyebrow">PRIVACY POLICY</div>
          <h1>How ByteMonk handles your information.</h1>
          <p>Short, plain-language, and specific to this portal. Last updated 7 November 2026.</p>
        </header>

        <section>
          <h2>What we collect</h2>
          <p>When you submit the interest form, we store:</p>
          <ul className="privacy-list">
            {collected.map(([label, detail]) => <li key={label}><strong>{label}.</strong> {detail}</li>)}
          </ul>
          <p>We do not use advertising trackers, and this site does not set analytics or advertising cookies.</p>
        </section>

        <section>
          <h2>Why we collect it</h2>
          <p>We use your answers to plan workshops, sessions, and events that match what students want to learn, and to send you relevant ByteMonk event updates, including on WhatsApp. Your WhatsApp number is used for ByteMonk updates only.</p>
        </section>

        <section>
          <h2>Who can see it</h2>
          <p>Registrations are visible to ByteMonk organizers through a password-protected dashboard. Organizers can view individual registrations, see combined charts, and export the data as a spreadsheet for planning. We do not sell your information or share it with advertisers.</p>
          <p>Your data is stored in a managed MongoDB Atlas database, so it is processed by that provider on our behalf.</p>
        </section>

        <section>
          <h2>How long we keep it</h2>
          <p>We keep your registration while ByteMonk is planning and running student community activities, or until you ask us to delete it, whichever comes first. When you ask, an organizer permanently deletes your registration from our database. Organizers who have downloaded a spreadsheet of registrations are expected to remove your details from it as well.</p>
        </section>

        <section>
          <h2>Your choices</h2>
          <p>You can ask to see what we hold about you, correct it, stop updates, or have your registration deleted. You can withdraw your consent at any time; this does not affect anything we did before you withdrew it.</p>
          {CONTACT_EMAIL && <p className="privacy-contact"><ShieldCheck size={15}/><span>To make a request, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address you registered with.</span></p>}
        </section>

        <section>
          <h2>Changes to this policy</h2>
          <p>If we change how we use your information, we will update this page and the date above.</p>
        </section>
      </article>
    </main>
    <Footer/>
  </>
}
