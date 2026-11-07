import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Menu, X } from 'lucide-react'

export function Brand({ light = false }) {
  return <Link to="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="ByteMonk home"><span className="brand-mark"><span /><span /><span /><span /></span><span className="brand-word">byte<span>monk</span><i>.</i></span></Link>
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  return <header className="site-header"><div className="nav-wrap"><Brand /><nav className={open ? 'nav-links nav-open' : 'nav-links'} aria-label="Main navigation"><a href="/#explore" onClick={() => setOpen(false)}>Explore</a><a href="/#how-it-works" onClick={() => setOpen(false)}>How it works</a><Link to="/register" className="nav-cta" onClick={() => setOpen(false)}>Share your interests <ArrowUpRight size={15}/></Link></nav><button className="menu-toggle" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button></div></header>
}

export function Footer() {
  return <footer className="site-footer"><div className="footer-inner"><Brand light/><p>Curiosity, shared. Skills, sharpened.</p><Link className="footer-admin-link" to="/admin">Organizer dashboard <ArrowUpRight size={12}/></Link><span>© 2026 ByteMonk · Built for curious minds</span></div></footer>
}

