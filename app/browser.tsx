'use client';
import {useState,useEffect,useRef} from 'react';
import {initialProfiles,styles,formatLabels,profileFormat,displayProfileLink,MAX_POST_IMAGES,validProfile,serializePosts,type Profile} from './profiles';
import ImageUpload from './image-upload';
import {LinkedInProfile,PosterProfile} from './social-formats';
function Lines({text}:{text:string}){return <>{text.split('\n').filter(Boolean).map((line,i)=>{const [title,...rest]=line.split('|');return <div className="entry" key={i}>{rest.length?<><h3>{title.trim()}</h3><p>{rest.join('|').trim()}</p></>:<p>{line}</p>}</div>})}</>}
function Contact({p}:{p:Profile}){return <section className="contact-block" id="contact"><h2>Let’s talk.</h2><p className="preserve">{p.contact}</p>{p.email&&<p className="email">{p.email}</p>}{p.phone&&<p>{p.phone}</p>}{p.location&&<p>{p.location}</p>}</section>}
function Artwork({kind,src,alt='Company picture'}:{kind:string;src?:string;alt?:string}){if(src)return <div className={'art uploaded-art art-'+kind}><img src={src} alt={alt}/></div>;return <div className={'art art-'+kind} aria-hidden="true"><span/><span/><span/><span/><span/><span/></div>}
function Company({p:stored}:{p:Profile}){
const p:Profile={...stored,style:profileFormat(stored.style)};
if(p.style==='linkedin')return <LinkedInProfile p={p}/>;
if(p.style==='poster')return <PosterProfile p={p}/>;
if(p.style==='minimal')return <div className="company minimal"><div className="minimal-inner">{p.images?.avatar&&<img className="minimal-avatar" src={p.images.avatar} alt={p.name+' profile picture'}/ >}{p.images?.cover&&<Artwork kind="minimal" src={p.images.cover} alt={p.name+' cover'}/>}<h1>{p.headline||p.name}</h1>{p.phone&&<div className="phone">{p.phone}</div>}{p.contact&&<p>{p.contact}</p>}{p.about&&<p>{p.about}</p>}{p.email&&<p>{p.email}</p>}{p.location&&<p>{p.location}</p>}</div></div>;
if(p.style==='social')return <div className="company social"><div className="social-bar"><b className="fb">f</b><span>Search this page</span><b>Community feed</b></div><div className="social-wrap"><div className="social-cover"><Artwork kind="food" src={p.images?.cover} alt={p.name+' cover'}/><h2>{p.headline}</h2></div><div className="social-title"><div className="avatar"><Avatar p={p}/></div><div><h1>{p.name}</h1><p>{p.sector} · {p.location}</p></div><a className="message-button" href="#contact">Message</a></div><div className="social-nav">Posts <span>About</span> <span>Photos</span></div><div className="social-columns"><aside className="social-card"><h2>Intro</h2><p>{p.about}</p><p>⌖ {p.location}</p><p>♡ {p.advocacy}</p><Lines text={p.services}/><div id="contact"><p className="preserve">{p.contact}</p>{p.email&&<p>{p.email}</p>}{p.phone&&<p>{p.phone}</p>}</div></aside><div><h2 className="feed-title">Posts</h2>{p.posts.split('\n').filter(Boolean).map((s,i)=><article className="social-card post" key={i}><div className="post-author"><span className="small-avatar"><Avatar p={p}/></span><div><b>{p.name}</b><small>{s.includes('|')?s.split('|')[0]:'Page update'}</small></div></div><p>{s.includes('|')?s.split('|').slice(1).join('|'):s}</p>{(i===0||p.images?.posts?.[i])&&<Artwork kind="food" src={p.images?.posts?.[i]} alt={p.name+' post picture '+(i+1)}/>}<div className="post-actions">♡ Like <span>Comment</span> <span>Share</span></div></article>)}</div></div></div></div>;
return <div className={'company corporate '+p.style}><nav className="brand-nav"><b className="wordmark">{p.images?.avatar&&<img className="brand-avatar" src={p.images.avatar} alt={p.name+' profile picture'}/ >}{p.name}</b><div><a href="#about">About</a><a href="#services">What we do</a><a href="#contact">Contact</a></div></nav><section className="brand-hero"><div className="hero-copy"><p className="sector">{p.sector}</p><h1>{p.headline}</h1><p>{p.advocacy}</p><a className="brand-button" href="#about">{'Discover '+p.name}</a></div><Artwork kind="corporate" src={p.images?.cover} alt={p.name+' cover'}/></section><section className="about-section" id="about"><h2>Who we are</h2><div><p>{p.about}</p><div className="facts"><span>{p.size}</span><span>{p.location}</span><span>{p.advocacy}</span></div></div></section>{p.services&&<section id="services" className="services-section"><h2>What we do</h2><div className="service-grid"><Lines text={p.services}/></div></section>}{p.posts&&<section className="updates-section">{p.posts.split('\n').filter(Boolean).map((post,i)=><div key={i}><Lines text={post}/>{p.images?.posts?.[i]&&<Artwork kind="corporate" src={p.images.posts[i]} alt={p.name+' update picture '+(i+1)}/>}</div>)}</section>}<Contact p={p}/><footer className="brand-footer">{p.name}<span>{p.advocacy}</span></footer></div>
}
function Avatar({p}:{p:Profile}){return p.images?.avatar?<img src={p.images.avatar} alt={p.name+' profile picture'}/>:<>{p.name.charAt(0)}</>}

export default function Browser(){
  const [profiles,setProfiles]=useState<Profile[]>(initialProfiles);
  const [active,setActive]=useState(initialProfiles[0].id);
  const [draft,setDraft]=useState<Profile|null>(null);
  const [draftPosts,setDraftPosts]=useState<{key:string;text:string;image:string}[]>([]);
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
  const [unlocked,setUnlocked]=useState(false),[unlocking,setUnlocking]=useState(false);
  const [unlockDialog,setUnlockDialog]=useState(false),[password,setPassword]=useState('');
  const [editorAction,setEditorAction]=useState<'edit'|'duplicate'|'resume'>('edit');
  const [uploads,setUploads]=useState(0);
  const [notice,setNotice]=useState(''),[error,setError]=useState('');
  const closeRef=useRef<HTMLButtonElement>(null);
  const passwordRef=useRef<HTMLInputElement>(null);
  const triggerRef=useRef<HTMLElement|null>(null);
  const selected=profiles.find(p=>p.id===active)||profiles[0];
  const busy=saving||uploads>0;

  useEffect(()=>{
    const id=new URLSearchParams(location.search).get('company'); if(id)setActive(id);
    fetch('/api/profiles').then(async r=>{
      if(!r.ok)throw Error('Shared profiles are unavailable. Refresh to try again.');
      setProfiles(await r.json());
    }).catch(e=>setError(e.message)).finally(()=>setLoading(false));
    fetch('/api/editor').then(r=>r.json()).then(data=>setUnlocked((data as {unlocked:boolean}).unlocked)).catch(()=>{});
    const pop=()=>setActive(new URLSearchParams(location.search).get('company')||initialProfiles[0].id);
    window.addEventListener('popstate',pop); return()=>window.removeEventListener('popstate',pop);
  },[]);
  useEffect(()=>{if(draft&&!unlockDialog)closeRef.current?.focus()},[!!draft,unlockDialog]);
  useEffect(()=>{if(unlockDialog)passwordRef.current?.focus()},[unlockDialog]);

  function select(id:string){setActive(id);history.pushState({},'','?company='+encodeURIComponent(id));setNotice('');window.scrollTo(0,0)}
  function close(){if(busy)return;setDraft(null);setError('');triggerRef.current?.focus()}
  function beginDraft(duplicate=false){
    setDraftPosts(selected.posts.split('\n').filter(Boolean).map((text,i)=>({key:crypto.randomUUID(),text,image:selected.images?.posts?.[i]||''})));
    setDraft(duplicate?{...selected,id:'company-'+crypto.randomUUID().slice(0,8),name:selected.name+' (copy)',version:0}:{...selected});
  }
  function openEditor(duplicate=false){
    triggerRef.current=document.activeElement as HTMLElement;
    setError('');
    if(!unlocked){setEditorAction(duplicate?'duplicate':'edit');setUnlockDialog(true);return}
    beginDraft(duplicate);
  }
  async function unlock(){
    setUnlocking(true);setError('');
    try{
      const response=await fetch('/api/editor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
      const data=await response.json() as {error?:string};
      if(!response.ok)throw Error(data.error||'Could not unlock editing.');
      setUnlocked(true);setUnlockDialog(false);setPassword('');
      if(editorAction!=='resume')beginDraft(editorAction==='duplicate');
    }catch(e){setError((e as Error).message)}finally{setUnlocking(false)}
  }
  async function lock(){
    setUnlocking(true);setError('');
    try{
      const response=await fetch('/api/editor',{method:'DELETE'});
      if(!response.ok)throw Error('Could not lock editing. Try again.');
      setUnlocked(false);setNotice('Editing is locked.');
    }catch(e){setError((e as Error).message)}finally{setUnlocking(false)}
  }
  async function share(){
    const link=location.origin+'/?company='+encodeURIComponent(selected.id);
    try{await navigator.clipboard.writeText(link);setNotice('Profile link copied. Anyone with the link can view.')}
    catch{setNotice('Copy this address: '+link)}
  }
  async function save(){
    if(!draft||busy)return;
    const posts=serializePosts(draftPosts);
    const normalized={...draft,style:profileFormat(draft.style),posts:posts.posts,images:{...draft.images,posts:posts.images.slice(0,MAX_POST_IMAGES)},profileLink:draft.profileLink?.trim()};
    if(!validProfile(normalized)){setError('Check the profile address and pictures. Use a web address without spaces; remove a few pictures if the profile is too large.');return}
    setSaving(true);setError('');
    try{
      const r=await fetch('/api/profiles',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(normalized)});
      const data=await r.json() as Profile & {error?:string};
      if(r.status===401){setUnlocked(false);setEditorAction('resume');setUnlockDialog(true)}
      if(!r.ok)throw Error(data.error||'Could not save.');
      setProfiles(prev=>prev.some(p=>p.id===data.id)?prev.map(p=>p.id===data.id?data:p):[...prev,data]);
      select(data.id);setDraft(null);triggerRef.current?.focus();
      setNotice('Saved. Everyone can see the update when they refresh.');
    }catch(e){setError((e as Error).message)}finally{setSaving(false)}
  }
  function exportData(){
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(profiles,null,2)],{type:'application/json'}));
    a.download='engage-company-profiles.json';a.click();URL.revokeObjectURL(a.href);
  }
  function modalKeys(e:React.KeyboardEvent<HTMLElement>){
    if(e.key==='Escape'){e.preventDefault();if(unlockDialog&&!unlocking){setUnlockDialog(false);setPassword('');setError('');if(!draft)triggerRef.current?.focus()}else if(!unlockDialog)close()}
    if(e.key==='Tab'){
      const items=e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]');
      const first=items[0],last=items[items.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
    }
  }
  function updateImage(key:'avatar'|'cover',value:string){setDraft(prev=>prev?{...prev,images:{...prev.images,[key]:value}}:prev)}
  function uploadBusy(value:boolean){setUploads(n=>Math.max(0,n+(value?1:-1)))}

  return <main>
    <header className="workshop-header">
      <a href="/" className="engage-logo">engage<span> / company browser</span></a>
      <div className="workshop-actions">
        <span className="training-tag">Fictional training companies</span>
        {unlocked&&<button disabled={unlocking} onClick={lock}>Lock editing</button>}
        <button className="primary" disabled={loading||unlocking} onClick={()=>openEditor()}>{unlocking?'Please wait…':unlocked?'Edit profile':'Unlock editing'}</button>
      </div>
    </header>
    <div className="browser-frame">
      <div className="tab-strip" role="tablist" aria-label="Company profiles">
        {profiles.map(p=><button key={p.id} role="tab" aria-selected={selected.id===p.id} aria-controls="company-panel" tabIndex={selected.id===p.id?0:-1}
          onKeyDown={e=>{
            if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){
              e.preventDefault();const index=profiles.indexOf(p);
              const next=e.key==='Home'?profiles[0]:e.key==='End'?profiles[profiles.length-1]:profiles[(index+(e.key==='ArrowRight'?1:profiles.length-1))%profiles.length];
              select(next.id);(e.currentTarget.parentElement?.children[profiles.indexOf(next)] as HTMLElement)?.focus();
            }
          }} onClick={()=>select(p.id)} className={'browser-tab '+(selected.id===p.id?'active':'')}>
          <span className={'tab-icon icon-'+profileFormat(p.style)}>{p.images?.avatar?<img src={p.images.avatar} alt=""/>:p.name.charAt(0)}</span><span>{p.name}</span>
        </button>)}
        <button className="add-tab" onClick={()=>openEditor(true)} disabled={loading||unlocking} aria-label="Duplicate selected company as a new tab">+</button>
      </div>
      <div className="address-row"><span className="lock" aria-hidden="true">◈</span><div className="address">{displayProfileLink(selected)}</div><button onClick={share}>Copy profile link</button></div>
      <div role="tabpanel" id="company-panel" aria-label={selected.name}><Company p={selected}/></div>
    </div>
    <footer className="workshop-footer"><span>ENGAGE workshop · All companies and contact details are fictional.</span><button onClick={exportData}>Export profiles</button></footer>
    {(notice||error&&!draft&&!unlockDialog)&&<div className={'toast '+(error?'error':'')} role="status">{error||notice}<button onClick={()=>{setNotice('');setError('')}} aria-label="Dismiss message">×</button></div>}
    {loading&&<div className="load-status" role="status">Loading shared profiles…</div>}
    {draft&&!unlockDialog&&<div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="editor-modal" onKeyDown={modalKeys}>
      <header><div><h2 id="dialog-title">Edit company profile</h2><p>Save once. Everyone sees the update.</p></div><button ref={closeRef} disabled={busy} onClick={close} aria-label="Close dialog">×</button></header>
      <form onSubmit={e=>{e.preventDefault();save()}}>
        <fieldset className="editor-fields" disabled={busy}>
          <legend className="sr-only">Company details and pictures</legend>
          <div className="field-pair">
            <label>Company name<input required maxLength={150} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
            <label>Format<select value={profileFormat(draft.style)} onChange={e=>setDraft({...draft,style:e.target.value})}>{styles.map(s=><option key={s} value={s}>{formatLabels[s]}</option>)}</select></label>
          </div>
          <label>Displayed profile link<input maxLength={500} value={draft.profileLink??displayProfileLink(draft)} onChange={e=>setDraft({...draft,profileLink:e.target.value})} aria-describedby="profile-link-note"/></label>
          <p className="field-note" id="profile-link-note">The address shown above this company. Leave blank to use the default. Copy profile link still shares this company’s workshop page.</p>
          <h3>Pictures</h3>
          <ImageUpload label="Profile picture" avatar value={draft.images?.avatar||''} onChange={value=>updateImage('avatar',value)} onBusy={uploadBusy}/>
          <ImageUpload label="Cover / hero picture" value={draft.images?.cover||''} onChange={value=>updateImage('cover',value)} onBusy={uploadBusy}/>
          {(['headline','sector','size','advocacy','location','email','phone'] as const).map(k=><label key={k}>{({headline:'Main headline',sector:'Sector',size:'Company size',advocacy:'Advocacy',location:'Location',email:'Contact email (display only)',phone:'Phone number (display only)'})[k]}<input maxLength={500} value={draft[k]} onChange={e=>setDraft({...draft,[k]:e.target.value})}/></label>)}
          {(['about','contact','services'] as const).map(k=><label key={k}>{({about:'About the company',contact:'Contact details / instructions',services:'Services or programs (one per line)'})[k]}<textarea rows={3} maxLength={12000} value={draft[k]} onChange={e=>setDraft({...draft,[k]:e.target.value})}/></label>)}
          <h3>Posts or updates</h3>
          <p className="field-note">One update per card, with its own picture. Use title | description if you want a heading or date. Empty posts are omitted when you save.</p>
          {draftPosts.map((post,i)=><div className="post-editor" key={post.key}>
            <label>Post {i+1} text<textarea rows={3} maxLength={12000} value={post.text} onChange={e=>setDraftPosts(prev=>prev.map(entry=>entry.key===post.key?{...entry,text:e.target.value.replace(/[\r\n]+/g,' ')}:entry))}/></label>
            {i<MAX_POST_IMAGES&&<ImageUpload label={'Post '+(i+1)+' picture'} value={post.image} onChange={value=>setDraftPosts(prev=>prev.map(entry=>entry.key===post.key?{...entry,image:value}:entry))} onBusy={uploadBusy}/>}
            <button type="button" onClick={()=>setDraftPosts(prev=>prev.filter(entry=>entry.key!==post.key))}>Remove post {i+1}</button>
          </div>)}
          <button type="button" disabled={draftPosts.length>=MAX_POST_IMAGES} onClick={()=>setDraftPosts(prev=>[...prev,{key:crypto.randomUUID(),text:'',image:''}])}>Add post</button>
          {draftPosts.length>=MAX_POST_IMAGES&&<p className="field-note">Up to {MAX_POST_IMAGES} posts can have pictures.</p>}
          <p className="field-note">Removing a cover or the first social post picture restores the illustration. Other fields remain saved when you switch personalities.</p>
        </fieldset>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <footer><button type="button" disabled={busy} onClick={close}>Cancel</button><button className="primary" disabled={busy} type="submit">{saving?'Saving…':uploads?'Preparing pictures…':'Save changes'}</button></footer>
      </form>
    </section></div>}
    {unlockDialog&&<div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="unlock-title" className="editor-modal unlock-modal" onKeyDown={modalKeys}>
      <header><div><h2 id="unlock-title">Unlock editing</h2><p>Enter the workshop editing password.</p></div><button disabled={unlocking} aria-label="Close unlock dialog" onClick={()=>{setUnlockDialog(false);setPassword('');setError('');if(!draft)triggerRef.current?.focus()}}>×</button></header>
      <form onSubmit={e=>{e.preventDefault();unlock()}}><div className="editor-fields">
        <label>Editing password<input ref={passwordRef} type="password" autoComplete="current-password" maxLength={256} value={password} disabled={unlocking} required onChange={e=>setPassword(e.target.value)}/></label>
        <p className="field-note">No account needed. Editing stays unlocked in this browser for up to eight hours.</p>
      </div>{error&&<p className="form-error" role="alert">{error}</p>}<footer><button disabled={unlocking} className="primary" type="submit">{unlocking?'Unlocking…':'Unlock editing'}</button></footer></form>
    </section></div>}
  </main>;
}
