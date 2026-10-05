import fs from 'node:fs';
import path from 'node:path';

const dist=path.resolve(import.meta.dirname,'..','dist');
const homeFile=path.join(dist,'index.html');
let home=fs.readFileSync(homeFile,'utf8');
const firstNav=home.indexOf('<nav class="hidden items-center gap-7 lg:flex">');
if(firstNav<0)throw Error('Home navigation was not found');
const navEnd=home.indexOf('</nav>',firstNav);
if(!home.slice(firstNav,navEnd).includes('href="/register/"')){
  home=home.slice(0,navEnd)+'<a class="text-sm text-white/70 transition-colors hover:text-white" href="/register/">Register</a>'+home.slice(navEnd);
}
home=home.replace(/>Join Relay<\/a>/g,'>Register</a>');
const cardStart=home.indexOf('<div class="glass-panel float-shadow mt-4 p-5">');
if(cardStart<0)throw Error('Home hero card was not found');
const cardEnd=home.indexOf('</div></div></section></div><section class="mx-auto',cardStart);
if(cardEnd<0)throw Error('Home hero card boundary was not found');
const signupCard='<div class="glass-panel float-shadow mt-4 p-5"><div class="text-xs uppercase tracking-widest text-white/50">Your next step</div><div class="mt-2 text-lg font-semibold text-white">Create your Relay profile</div><p class="mt-2 text-sm text-white/70">Sign in securely and share your school details, achievements and your own program essay.</p></div><div class="mt-5 flex justify-center"><a class="inline-flex h-14 w-full items-center justify-center rounded-full bg-lime px-8 text-base font-bold text-navy shadow-[0_12px_36px_-14px_var(--lime)] transition hover:brightness-105" style="max-width:360px" href="/register/">Apply to cohort <span aria-hidden="true" style="margin-left:0.5rem">→</span></a></div>';
home=home.slice(0,cardStart)+signupCard+home.slice(cardEnd+6);
const previewStart=home.indexOf('<div class="glass-panel float-shadow p-5">');
const previewEnd=home.indexOf('<div class="glass-panel float-shadow mt-4 p-5">',previewStart);
if(previewStart<0||previewEnd<0)throw Error('Home program preview was not found');
const programPreview='<div class="glass-panel float-shadow p-5"><div class="text-xs uppercase tracking-widest text-white/50">Featured programs</div><p class="mt-2 text-sm text-white/70">Compare the experiences and choose where to begin.</p><div class="mt-5 space-y-3"><a href="/programs/uwc/" class="flex items-center justify-between gap-3 rounded-2xl bg-white/10 p-4"><span><strong class="block text-sm text-white">UWC</strong><span class="text-xs text-white/60">International education</span></span><span class="text-lime">Explore</span></a><a href="/programs/lumiere/" class="flex items-center justify-between gap-3 rounded-2xl bg-white/10 p-4"><span><strong class="block text-sm text-white">Lumiere</strong><span class="text-xs text-white/60">Research mentorship</span></span><span class="text-lime">Explore</span></a></div></div>';
home=home.slice(0,previewStart)+programPreview+home.slice(previewEnd);
home=home.replace('Fellowship cohorts open for the next intake','Explore international opportunities');
home=home.replace('Personalised opportunity matches','Program summaries and official links').replace('Cohort workshops with mentors','A private place for your student profile');
home=home.replace('Relay Fellowship helps ambitious students discover, prepare for and win places in the world&#x27;s most selective programs.','Relay Fellowship helps ambitious students discover programs and prepare stronger applications.');
home=home.replace('Program information shown is sample data.','Program details are linked to official sources.');
const cardDestinations={
  UWC:'/programs/uwc/',
  FLEX:'/programs/flex/',
  Lumiere:'/programs/lumiere/',
  YYGS:'/programs/yygs/',
  Fellowships:'/register/',
  Research:'/opportunities/?type=Research',
  'Summer programs':'/opportunities/?type=Summer%20Program',
  Scholarships:'/opportunities/?funding=Fully%20funded'
};
if(!home.includes('class="home-program-card')){
  let converted=0;
  home=home.replace(/<div class="card-elevated group p-5 transition-transform duration-300 hover:-translate-y-1"><div class="text-2xl">([^<]*)<\/div><div class="mt-4 font-display text-lg font-semibold">([^<]*)<\/div><div class="text-sm text-muted-foreground">([^<]*)<\/div><\/div>/g,(_,icon,name,description)=>{
    const href=cardDestinations[name];
    if(!href)throw Error(`No destination for home card ${name}`);
    converted++;
    return `<a class="home-program-card card-elevated group p-5 transition-transform duration-300 hover:-translate-y-1" href="${href}" aria-label="Explore ${name}"><span class="block text-2xl" aria-hidden="true">${icon}</span><span class="mt-4 block font-display text-lg font-semibold">${name}</span><span class="block text-sm text-muted-foreground">${description}</span></a>`;
  });
  if(converted!==8)throw Error(`Expected 8 home program cards, found ${converted}`);
}
home=home.replace(/<meta property="og:image"[^>]*>/g,'').replace(/<meta name="twitter:image"[^>]*>/g,'');
home=home.replace(/<meta property="og:url"[^>]*>/g,'<meta property="og:url" content="https://imronuz1.github.io/relay-fellowship/">');
fs.writeFileSync(homeFile,home);

const siteCssFile=path.join(dist,'site.css');
let siteCss=fs.readFileSync(siteCssFile,'utf8');
if(!siteCss.includes('.home-program-card{')){
  siteCss+='\n.home-program-card{display:block;color:inherit;text-decoration:none;cursor:pointer}.home-program-card:hover{transform:translateY(-4px)}.home-program-card:focus-visible{outline:3px solid #a3e635;outline-offset:4px}\n';
  fs.writeFileSync(siteCssFile,siteCss);
}

const mentorsFile=path.join(dist,'mentors','index.html');
let mentors=fs.readFileSync(mentorsFile,'utf8');
mentors=mentors.replace(/<meta property="og:image"[^>]*>/g,'').replace(/<meta name="twitter:image"[^>]*>/g,'');
mentors=mentors.replace(/<meta property="og:url"[^>]*>/g,'<meta property="og:url" content="https://imronuz1.github.io/relay-fellowship/mentors/">');
fs.writeFileSync(mentorsFile,mentors);

const menuFile=path.join(dist,'site.js');
let menu=fs.readFileSync(menuFile,'utf8');
if(!menu.includes('href="/register/"'))menu=menu.replace('<a href="/achievements/">Achievements</a>','<a href="/achievements/">Achievements</a><a href="/register/">Register</a>');
menu=menu.replace(/>Join Relay<\/a>/g,'>Register</a>');
fs.writeFileSync(menuFile,menu);
