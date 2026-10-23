import type {Profile} from './profiles';

function Logo({p}:{p:Profile}){
  return <div className="format-logo">{p.images?.avatar?<img src={p.images.avatar} alt={p.name+' profile picture'}/>:p.name.charAt(0)}</div>;
}
function Picture({src,alt,className=''}:{src?:string;alt:string;className?:string}){
  return <div className={'format-picture '+className}>{src?<img src={src} alt={alt}/>:<div className="format-illustration" aria-hidden="true"><span/><span/><span/></div>}</div>;
}
function Entries({text}:{text:string}){
  return <>{text.split('\n').filter(Boolean).map((line,i)=>{
    const [heading,...body]=line.split('|');
    return <div className="entry" key={i}>{body.length?<><h3>{heading.trim()}</h3><p>{body.join('|').trim()}</p></>:<p>{heading}</p>}</div>;
  })}</>;
}
function ContactDetails({p}:{p:Profile}){
  return <><p className="preserve">{p.contact}</p>{p.email&&<p>{p.email}</p>}{p.phone&&<p>{p.phone}</p>}{p.location&&<p>{p.location}</p>}</>;
}

export function LinkedInProfile({p}:{p:Profile}){
  return <div className="company linkedin">
    <div className="linkedin-bar"><b className="linkedin-mark" aria-label="LinkedIn-style page">in</b><span className="linkedin-search">Company profile</span><span className="linkedin-network">Professional network</span></div>
    <div className="linkedin-wrap">
      <section className="linkedin-card linkedin-intro">
        <Picture src={p.images?.cover} alt={p.name+' cover'} className="linkedin-cover"/>
        <div className="linkedin-intro-copy"><Logo p={p}/><h1>{p.name}</h1><p className="linkedin-tagline">{p.headline}</p><p className="linkedin-meta">{[p.sector,p.location,p.size].filter(Boolean).join(' · ')}</p><div className="linkedin-actions"><a href="#contact" className="linkedin-button">Contact company</a><a href="#linkedin-about">About us</a></div></div>
        <nav className="linkedin-tabs" aria-label="Company sections"><a href="#linkedin-about">About</a>{p.posts.trim()&&<a href="#linkedin-posts">Posts</a>}{p.services.trim()&&<a href="#linkedin-services">Services</a>}</nav>
      </section>
      <div className="linkedin-columns"><div>
        <section className="linkedin-card" id="linkedin-about"><h2>Overview</h2><p className="preserve">{p.about}</p>{p.advocacy&&<p className="linkedin-focus">Our focus · {p.advocacy}</p>}</section>
        {p.services&&<section className="linkedin-card" id="linkedin-services"><h2>What we do</h2><Entries text={p.services}/></section>}
        <section id="linkedin-posts"><h2 className="linkedin-feed-title">Company updates</h2>{!p.posts.trim()&&<div className="linkedin-card"><p>No updates yet.</p></div>}{p.posts.split('\n').filter(Boolean).map((post,i)=>{
          const [heading,...body]=post.split('|');
          return <article className="linkedin-card linkedin-post" key={i}><div className="linkedin-post-author"><Logo p={p}/><div><b>{p.name}</b><small>{body.length?heading:'Company update'}</small></div></div><p className="preserve">{body.length?body.join('|').trim():heading}</p>{p.images?.posts?.[i]&&<Picture src={p.images.posts[i]} alt={p.name+' post picture '+(i+1)}/>}</article>;
        })}</section>
      </div><aside>
        <section className="linkedin-card"><h2>Company details</h2><dl>{[['Industry',p.sector],['Company size',p.size],['Location',p.location],['Focus',p.advocacy]].filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
        <section className="linkedin-card" id="contact"><h2>Contact</h2><ContactDetails p={p}/></section>
      </aside></div>
    </div>
  </div>;
}

export function PosterProfile({p}:{p:Profile}){
  return <div className="company poster"><article className="poster-sheet">
    <header className="poster-heading"><Logo p={p}/><div><p className="poster-eyebrow">{p.sector}</p><h1>{p.name}</h1></div></header>
    <section className="poster-main"><p className="poster-eyebrow">{p.advocacy}</p><h2>{p.headline}</h2><Picture src={p.images?.cover} alt={p.name+' poster picture'}/></section>
    <section className="poster-copy"><p className="preserve">{p.about}</p>{p.services&&<div className="poster-services"><Entries text={p.services}/></div>}</section>
    {p.posts&&<section className="poster-updates">{p.posts.split('\n').filter(Boolean).map((post,i)=><div key={i}><Entries text={post}/>{p.images?.posts?.[i]&&<Picture src={p.images.posts[i]} alt={p.name+' update picture '+(i+1)}/>}</div>)}</section>}
    <footer className="poster-contact" id="contact"><h2>Get in touch</h2><ContactDetails p={p}/>{p.size&&<p className="poster-team">{p.size}</p>}</footer>
  </article></div>;
}
