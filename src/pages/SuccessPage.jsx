import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Check, ShieldCheck, Sparkles } from 'lucide-react'
import { Footer, SiteHeader } from '../components/SiteChrome.jsx'

export default function SuccessPage({ response, onReset }) {
  const navigate = useNavigate()
  const firstName = response?.name?.trim().split(/\s+/)[0]
  const topic = response?.interests?.[0]
  return <><SiteHeader/><main className="success-page"><div className="success-card"><div className="success-orbit"><div className="success-check"><Check size={31}/></div><span className="success-spark s1">✦</span><span className="success-spark s2">✳</span><span className="success-spark s3">✦</span></div><div className="eyebrow muted-eyebrow">RESPONSE RECEIVED</div><h1>{firstName?`Thanks, ${firstName}.`:'Thanks for sharing.'}<br/><span>You’re part of what’s next.</span></h1><p className="success-copy">Your curiosity helps shape a more thoughtful ByteMonk community. The best learning experiences start when people tell us what they care about.</p>{topic&&<div className="success-interest"><span className="success-interest-icon"><Sparkles size={16}/></span><span>Your first interest</span><strong>{topic}</strong></div>}<div className="success-disclaimer"><ShieldCheck size={15}/><span>Your registration has been added to ByteMonk’s student interest database. Thank you for helping shape what the community learns next.</span></div><div className="success-actions"><Link to="/" className="button-primary">Back to ByteMonk <ArrowRight size={17}/></Link><button className="button-quiet" onClick={()=>{onReset();navigate('/register');window.scrollTo(0,0)}}>Share another response <ArrowUpRight size={15}/></button></div></div></main><Footer/></>
}

