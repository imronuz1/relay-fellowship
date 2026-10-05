import fs from 'node:fs';
import path from 'node:path';

const dist=path.resolve(import.meta.dirname,'..','dist');
const homeFile=path.join(dist,'index.html');
let home=fs.readFileSync(homeFile,'utf8');
const firstNav=home.indexOf('<nav class="hidden items-center gap-7 lg:flex">');
if(firstNav<0)throw Error('Home navigation was not found');
const navEnd=home.indexOf('</nav>',firstNav);
if(!home.slice(firstNav,navEnd).includes('href="/register/"')){
  home=home.slice(0,navEnd)+'<a class="text-sm text-white/70 transition-colors hover:text-white" href="/register/">Join Relay</a>'+home.slice(navEnd);
}
const cardStart=home.indexOf('<div class="glass-panel float-shadow mt-4 p-5">');
if(cardStart<0)throw Error('Home hero card was not found');
const cardEnd=home.indexOf('</div></div></section></div><section class="mx-auto',cardStart);
if(cardEnd<0)throw Error('Home hero card boundary was not found');
const signupCard='<div class="glass-panel float-shadow mt-4 p-5"><div class="text-xs uppercase tracking-widest text-white/50">Your next step</div><div class="mt-2 text-lg font-semibold text-white">Create your Relay profile</div><p class="mt-2 text-sm text-white/70">Sign in securely and save your school details, achievements and your own program essay.</p><a class="mt-4 inline-flex items-center justify-center rounded-full bg-lime px-5 py-3 text-sm font-bold text-navy" href="/register/">Join Relay</a></div>';
home=home.slice(0,cardStart)+signupCard+home.slice(cardEnd+6);
home=home.replace('>94<!-- -->%</span>','>Explore</span>').replace('>82<!-- -->%</span>','>Explore</span>');
home=home.replace('Program information shown is sample data.','Program details are linked to official sources.');
home=home.replace(/<meta property="og:image"[^>]*>/g,'').replace(/<meta name="twitter:image"[^>]*>/g,'');
home=home.replace(/<meta property="og:url"[^>]*>/g,'<meta property="og:url" content="https://imronuz1.github.io/relay-fellowship/">');
fs.writeFileSync(homeFile,home);

const mentorsFile=path.join(dist,'mentors','index.html');
let mentors=fs.readFileSync(mentorsFile,'utf8');
mentors=mentors.replace(/<meta property="og:image"[^>]*>/g,'').replace(/<meta name="twitter:image"[^>]*>/g,'');
mentors=mentors.replace(/<meta property="og:url"[^>]*>/g,'<meta property="og:url" content="https://imronuz1.github.io/relay-fellowship/mentors/">');
fs.writeFileSync(mentorsFile,mentors);

const menuFile=path.join(dist,'site.js');
let menu=fs.readFileSync(menuFile,'utf8');
if(!menu.includes('href="/register/"'))menu=menu.replace('<a href="/achievements/">Achievements</a>','<a href="/achievements/">Achievements</a><a href="/register/">Join Relay</a>');
fs.writeFileSync(menuFile,menu);
