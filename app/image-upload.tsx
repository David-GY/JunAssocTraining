'use client';
import {useId, useState} from 'react';
import {MAX_IMAGE_LENGTH} from './profiles';

async function resizeImage(file:File, maxDimension:number):Promise<string> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw Error('Choose a JPEG, PNG, or WebP picture.');
  if (file.size > 10 * 1024 * 1024) throw Error('Choose a picture smaller than 10 MB.');
  let bitmap:ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw Error('This picture could not be opened. Try another file.'); }
  try {
    if (bitmap.width * bitmap.height > 40_000_000) throw Error('This picture is too large. Choose one under 40 megapixels.');
    const canvas = document.createElement('canvas');
    let scale = Math.min(1, maxDimension / Math.max(bitmap.width,bitmap.height));
    for (let attempt = 0; attempt < 5; attempt++) {
      canvas.width = Math.max(1,Math.round(bitmap.width * scale));
      canvas.height = Math.max(1,Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw Error('Picture uploads are unavailable in this browser.');
      context.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const source = canvas.toDataURL('image/webp',0.82);
      if (source.length <= MAX_IMAGE_LENGTH) return source;
      scale *= 0.7;
    }
    throw Error('This picture is too detailed to save. Choose a smaller picture.');
  } finally { bitmap.close(); }
}

export default function ImageUpload({label,value,onChange,onBusy,disabled=false,avatar=false}:{
  label:string; value:string; onChange:(value:string)=>void; onBusy:(busy:boolean)=>void; disabled?:boolean; avatar?:boolean;
}) {
  const id = useId();
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  return <div className="image-field">
    <label htmlFor={id}>{label}</label>
    {value && <img className={'image-preview '+(avatar?'round':'')} src={value} alt={label+' preview'}/>}
    <input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||busy}
      aria-describedby={id+'-note'+(error?' '+id+'-error':'')} aria-invalid={!!error}
      onChange={async e=>{
        const input=e.currentTarget, file=input.files?.[0];
        if (!file) return;
        setError(''); setBusy(true); onBusy(true);
        try { onChange(await resizeImage(file,avatar?640:1200)); }
        catch (error) { setError((error as Error).message); }
        finally { input.value=''; setBusy(false); onBusy(false); }
      }}/>
    <p id={id+'-note'} className="field-note">{busy?'Preparing picture…':'JPEG, PNG, or WebP, up to 10 MB. Pictures are resized and saved with the profile.'}</p>
    {error && <p id={id+'-error'} role="alert" className="image-error">{error}</p>}
    {value && <button type="button" disabled={disabled||busy} onClick={()=>{onChange('');setError('')}}>Remove {label.toLowerCase()}</button>}
  </div>;
}
