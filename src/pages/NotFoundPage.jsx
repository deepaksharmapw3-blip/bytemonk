import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Footer, SiteHeader } from '../components/SiteChrome.jsx'
import '../styles/not-found.css'

export default function NotFoundPage() {
  useEffect(() => {
    const previousTitle = document.title
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex'
    document.title = 'Page not found · ByteMonk'
    document.head.appendChild(robots)
    return () => {
      document.title = previousTitle
      robots.remove()
    }
  }, [])

  return <>
    <SiteHeader/>
    <main className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-code" aria-hidden="true">404</div>
        <div className="eyebrow muted-eyebrow">PAGE NOT FOUND</div>
        <h1>This page <span>wandered off.</span></h1>
        <p>The link may be broken, or the page may have moved. Head back home, or tell us what you’d like to learn.</p>
        <div className="not-found-actions">
          <Link to="/" className="button-primary">Back to home <ArrowRight size={16}/></Link>
          <Link to="/register" className="button-quiet">Share your interests <ArrowRight size={14}/></Link>
        </div>
      </div>
    </main>
    <Footer/>
  </>
}
