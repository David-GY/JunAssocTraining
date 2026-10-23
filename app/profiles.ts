export type ProfileImages = {avatar?:string; cover?:string; posts?:string[]};
export type Profile = {id:string; name:string; style:string; sector:string; size:string; advocacy:string; headline:string; about:string; location:string; email:string; phone:string; contact:string; services:string; posts:string; version:number; profileLink?:string; images?:ProfileImages; deletedAt?:string};
export type ProfileFormat='minimal'|'linkedin'|'social'|'website'|'poster';
export const styles:ProfileFormat[] = ['minimal','linkedin','social','website','poster'];
export const formatLabels:Record<ProfileFormat,string>={minimal:'Number only',linkedin:'LinkedIn',social:'Facebook',website:'Website',poster:'Poster'};
export function profileFormat(style:string):ProfileFormat {
  if(styles.includes(style as ProfileFormat))return style as ProfileFormat;
  return style==='bold'?'poster':'website';
}
export const initialProfiles:Profile[] = [
{id:'kusina-ni-lina',name:'Kusina ni Lina',style:'social',sector:'Food & catering',size:'8 team members',advocacy:'Local livelihoods',headline:'Lutong bahay, para sa bawat salu-salo.',about:'Home-cooked trays and packed meals from our family kitchen in Marikina. We cook with neighborhood suppliers and welcome orders for office lunches, family gatherings, and community events. Send us a message for our weekly menu.',location:'Marikina City',email:'',phone:'',contact:'Message our page for orders and inquiries.',services:'Party trays\nPacked lunches\nSmall-event catering',posts:'October 18, 2026 | Sunday orders are open! Tell us your headcount and budget so we can recommend a tray set.\nOctober 12, 2026 | Salamat to our neighborhood suppliers for another busy week. Fresh ingredients, early mornings, and lots of teamwork.\nOctober 5, 2026 | Planning an office lunch? Message us at least three days ahead. We will confirm availability before accepting your order.',version:0},
{id:'verdant-packaging',name:'Verdant Packaging',style:'corporate',sector:'Sustainable packaging',size:'42 team members',advocacy:'Responsible production',headline:'Better packaging. Practical change.',about:'Verdant Packaging develops paper-based packaging for independent food and retail businesses. Our team works with local suppliers to help growing brands choose formats that suit their products and daily operations.',location:'Quezon City, Metro Manila',email:'partnerships@verdant.example',phone:'+63 (0)00 000 0000',contact:'Partnerships: partnerships@verdant.example\nSales: sales@verdant.example\nGeneral inquiries: hello@verdant.example\nOffice hours: Monday–Friday, 9 AM–5 PM',services:'Food-service packaging | Paper-based containers for daily operations.\nRetail packaging | Boxes and bags for independent brands.\nPackaging consultation | Product-fit discussions and material selection.',posts:'Our approach | We begin with the product, storage conditions, and how the packaging will be used.\nWorking together | We welcome focused conversations with organizations interested in responsible production and small-business support.',version:0},
{id:'reyes-repair',name:'Reyes Repair Shop',style:'minimal',sector:'Repair services',size:'4 team members',advocacy:'Repair and reuse',headline:'Reyes Repair Shop',about:'',location:'',email:'',phone:'+63 (0)00 000 0000',contact:'For repair inquiries, call during business hours.',services:'',posts:'',version:0},
{id:'habi-collective',name:'Habi Collective',style:'craft',sector:'Textiles & handmade goods',size:'16 artisan partners',advocacy:'Artisan livelihoods',headline:'Made by hand. Made to stay.',about:'A small collective creating woven home goods and everyday accessories with artisan partners. Each collection begins with a material, a conversation, and the skills passed between makers.',location:'Antipolo, Rizal',email:'hello@habi.example',phone:'',contact:'For stockist and partnership inquiries, write to Mara at hello@habi.example.',services:'Woven home goods\nEveryday accessories\nSmall-batch corporate gifts',posts:'The studio | Our production calendar follows the time each piece needs. For larger orders, please get in touch early.\nThe people | We work with artisan partners and local coordinators to plan materials, production, and deliveries.',version:0},
{id:'siklab-learning',name:'Siklab Learning Hub',style:'community',sector:'Community education',size:'9 staff & volunteer mentors',advocacy:'Youth learning access',headline:'A place to learn, together.',about:'Siklab Learning Hub runs neighborhood learning sessions for young people. We bring mentors, families, and local organizations together around practical skills and supported study time.',location:'Pasig City',email:'connect@siklab.example',phone:'',contact:'Contact Jo, program coordinator: connect@siklab.example\nLearning sessions: Saturday afternoons, by registration.',services:'After-school study support\nDigital skills sessions\nVolunteer mentoring',posts:'Learning Saturdays | Small-group sessions give learners time to ask questions and practice at their own pace.\nPartner with the hub | We welcome conversations about learning resources, mentoring, and support for neighborhood programs.',version:0},
{id:'golden-horizon',name:'Golden Horizon',style:'bold',sector:'Lifestyle & events',size:'28 team members',advocacy:'Youth opportunity',headline:'Make your next moment golden.',about:'Golden Horizon creates lifestyle experiences, pop-up events, and brand activations for young audiences. We bring fresh concepts and energetic teams to spaces where people connect.',location:'Makati City',email:'collaborate@goldenhorizon.example',phone:'',contact:'Send collaboration proposals to collaborate@goldenhorizon.example.',services:'Brand activations\nLifestyle pop-ups\nEvent production',posts:'New connections | We are exploring collaborations with student organizations and emerging brands.\nOur next chapter | More spaces, more ideas, and more ways to bring people together.',version:0}
];
export const MAX_PROFILE_BYTES = 1_600_000;
export const MAX_IMAGE_LENGTH = 200_000;
export const MAX_POST_IMAGES = 30;

export function serializePosts(entries:{text:string;image:string}[]):{posts:string;images:string[]} {
  const nonempty=entries.filter(entry=>entry.text.trim());
  return {posts:nonempty.map(entry=>entry.text.replace(/[\r\n]+/g,' ')).join('\n'),images:nonempty.map(entry=>entry.image)};
}

export function displayProfileLink(p:Profile):string {
  return p.profileLink || (p.style === 'social' ? 'social.example/' + p.id : p.style === 'linkedin' ? 'linkedin.example/company/' + p.id : p.id + '.example/');
}

export function validImageSource(value:unknown):value is string {
  if (value === '') return true;
  if (typeof value !== 'string' || value.length > MAX_IMAGE_LENGTH) return false;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  try {
    const bytes = atob(match[2]);
    if (match[1] === 'png') return bytes.startsWith('\x89PNG\r\n\x1a\n');
    if (match[1] === 'jpeg') return bytes.startsWith('\xff\xd8\xff');
    return bytes.startsWith('RIFF') && bytes.slice(8,12) === 'WEBP';
  } catch { return false; }
}

export function validProfile(p:unknown):p is Profile {
  if (!p || typeof p !== 'object') return false;
  const a = p as Record<string,unknown>;
  if (typeof a.id !== 'string' || !/^[a-z0-9-]{1,70}$/.test(a.id) ||
      typeof a.style !== 'string' || !(styles.includes(a.style as ProfileFormat)||['corporate','craft','community','bold'].includes(a.style)) ||
      !Number.isInteger(a.version) || (a.version as number) < 0 ||
      !['name','sector','size','advocacy','headline','about','location','email','phone','contact','services','posts'].every(k => typeof a[k] === 'string' && (a[k] as string).length <= 12000) ||
      !(a.name as string).trim()) return false;
  if (a.deletedAt !== undefined && (typeof a.deletedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(a.deletedAt) || !Number.isFinite(Date.parse(a.deletedAt)))) return false;
  if (a.profileLink !== undefined && (typeof a.profileLink !== 'string' || a.profileLink.length > 500 ||
      /[\s\x00-\x1f\x7f]/.test(a.profileLink) || (/^[a-z][a-z0-9+.-]*:/i.test(a.profileLink) && !/^https?:\/\//i.test(a.profileLink)))) return false;
  if (a.images !== undefined) {
    if (!a.images || typeof a.images !== 'object' || Array.isArray(a.images)) return false;
    const images = a.images as Record<string,unknown>;
    if (Object.keys(images).some(k => !['avatar','cover','posts'].includes(k))) return false;
    if (['avatar','cover'].some(k => images[k] !== undefined && !validImageSource(images[k]))) return false;
    if (images.posts !== undefined && (!Array.isArray(images.posts) || images.posts.length > MAX_POST_IMAGES || !images.posts.every(validImageSource))) return false;
  }
  // Lifecycle metadata grows on server writes without increasing user content.
  return new TextEncoder().encode(JSON.stringify({...a,version:0,deletedAt:undefined})).length <= MAX_PROFILE_BYTES;
}
