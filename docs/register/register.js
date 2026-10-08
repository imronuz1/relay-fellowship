import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { browserLocalPersistence, browserSessionPersistence, getAuth, GoogleAuthProvider, isSignInWithEmailLink, onAuthStateChanged, sendSignInLinkToEmail, setPersistence, signInWithEmailLink, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { doc, getDoc, getFirestore, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig } from '../firebase-config.js';

const $ = id => document.getElementById(id);
const panels = ['setup-pending','account-panel','auth-panel','email-sent','confirm-email','profile-panel'];
const programInfo = {
  uwc: {prompt:'UWC brings students from different backgrounds together for academics, service and shared life. Paste your essay about how you would contribute to that community and what you hope to learn.',url:'https://uwc.org/how-to-apply/'},
  flex: {prompt:'FLEX is a year of study, host-family life and cultural exchange in the United States. Paste your essay about adapting to a new community and sharing your home culture.',url:'https://ais.americancouncils.org/flexglobal'},
  lumiere: {prompt:'Lumiere pairs students with research mentors. Paste your essay about the question you want to investigate, why it matters and how you would pursue it.',url:'https://www.lumiere-education.com/'},
  yygs: {prompt:'YYGS brings students together for interdisciplinary learning and global discussion. Paste your essay about a question or challenge you would explore with peers.',url:'https://globalscholars.yale.edu/'}
};
const siteRoot = new URL('../', import.meta.url);
const dashboardPath = new URL('dashboard/',siteRoot).pathname;
const isDashboard = location.pathname.replace(/\/?$/,'/')===dashboardPath;
const params = new URLSearchParams(location.search);
const requestedProgram = Object.hasOwn(programInfo,params.get('program'))?params.get('program'):null;
const emailKey = 'relayEmailForSignIn';
let auth, db, currentUser;
let accountMode='signup';
let completingEmailLink=false;
let navigating=false;
let authBusy=false;
let profileVersion=0;
let currentSlug='';
let profileReady=false;
let saving=false;
let dirty=false;
let pendingSlug='';
let lastSentAt=0;
const drafts=new Map();
const gradeOptions=new Set(['8','9','10','11','12','Other']);

function storage(method,...args){try{return localStorage[method](...args)}catch(error){return null}}
async function ensurePersistence(){try{await setPersistence(auth,browserLocalPersistence)}catch(error){await setPersistence(auth,browserSessionPersistence)}}
function formatDay(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function localToday(){return formatDay(new Date())}
function validBirth(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number);const date=new Date(y,m-1,d);return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d&&value<localToday()}
function draftKey(slug){return currentUser?.uid+':'+slug}
function setProfileEnabled(enabled){$('profile-fields').disabled=!enabled;$('retry-profile').hidden=true;profileReady=enabled}
function invalidateProfile(){profileVersion++;setProfileEnabled(false)}
function focusPanel(id){const heading=$(id).querySelector('h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}}

function markWelcome(){
  try{sessionStorage.setItem('relayWelcomeAfterLogin',JSON.stringify({program:requestedProgram}));}catch(error){}
}

function route(name){
  if(navigating)return;
  navigating=true;
  const url=new URL(name==='home'?'.':name+'/',siteRoot);
  if(requestedProgram)url.searchParams.set('program',requestedProgram);
  if(name==='home')url.searchParams.set('welcome','1');
  location.replace(url.href);
}

function panel(id){for(const name of panels)$(name).hidden=name!==id;focusPanel(id)}
function status(message,error=false){const el=$('status');el.textContent=message;el.classList.toggle('error',error);el.hidden=false;}
function clearStatus(){$('status').hidden=true;}
function showAuth(mode){accountMode=mode;$('auth-title').textContent='Continue with email or Google';clearStatus();panel('auth-panel');}
function setBusy(button,busy){button.disabled=busy;button.setAttribute('aria-busy',String(busy));}
function describeError(error){
  switch(error?.code){
    case 'auth/invalid-email':return 'Please enter a valid email address.';
    case 'auth/unauthorized-domain':return 'Sign-in is unavailable for this site. Please contact the site owner.';
    case 'auth/operation-not-allowed':return 'This sign-in method is unavailable. Please try another method.';
    case 'auth/popup-blocked':return 'Your browser blocked the Google window. Allow pop-ups for this site and try again.';
    case 'auth/popup-closed-by-user':return 'Google sign-in was closed before it finished.';
    case 'auth/cancelled-popup-request':return 'Google sign-in was interrupted. Please try again.';
    case 'auth/expired-action-code':return 'This sign-in link expired. Request a new one.';
    case 'auth/invalid-action-code':return 'This sign-in link has expired or has already been used. Request a new one.';
    case 'auth/too-many-requests':return 'Too many attempts. Wait a while before trying again.';
    case 'auth/network-request-failed':return 'Network connection failed. Check your connection and try again.';
    case 'permission-denied':return 'Your profile could not be accessed. Please try again or contact Relay.';
    default:return 'Something went wrong. Please try again.';
  }
}
function updateProgram(){
  const slug=$('program').value;
  $('essay-prompt').textContent=programInfo[slug]?.prompt||'Choose a program to see a relevant essay prompt.';
  $('official-application').href=programInfo[slug]?.url||new URL('opportunities/',siteRoot).href;
}
async function loadEssay(slug){
  const version=++profileVersion,uid=currentUser?.uid;
  setProfileEnabled(false);
  $('profile-loading').hidden=false;
  try{
    const snap=await getDoc(doc(db,'users',uid,'essays',slug));
    if(version!==profileVersion||currentUser?.uid!==uid||$('program').value!==slug)return;
    $('essay').value=drafts.has(draftKey(slug))?drafts.get(draftKey(slug)):(snap.exists()?snap.data().essay||'':'');
    currentSlug=slug;dirty=drafts.has(draftKey(slug));
    clearStatus();setProfileEnabled(true);
  }catch(error){
    if(version===profileVersion&&currentUser?.uid===uid){
      $('program').value=currentSlug;
      updateProgram();
      $('retry-profile').hidden=false;
      status('Could not load the essay. Your draft is still here. Retry before saving. '+describeError(error),true);
    }
  }finally{if(version===profileVersion)$('profile-loading').hidden=true}
}
async function showProfile(user){
  if(currentUser?.uid===user.uid&&profileReady)return;
  if(currentUser?.uid!==user.uid){drafts.clear();currentSlug='';dirty=false;$('profile-form').reset();$('essay').value=''}
  currentUser=user;invalidateProfile();const version=profileVersion;
  panel('profile-panel');clearStatus();$('profile-loading').hidden=false;
  $('signed-in-as').textContent=user.email||'Signed in with Google';
  const today=new Date();$('birth-date').max=formatDay(new Date(today.getFullYear(),today.getMonth(),today.getDate()-1));
  try{
    const snap=await getDoc(doc(db,'users',user.uid));
    if(version!==profileVersion||currentUser?.uid!==user.uid)return;
    const data=snap.exists()?snap.data():{};
    $('school').value=data.school||'';
    $('grade').value=data.grade||'';
    $('birth-date').value=data.dateOfBirth||'';
    $('achievements').value=data.achievements||'';
    const slug=requestedProgram||((Object.hasOwn(programInfo,data.lastProgram))?data.lastProgram:'');
    $('program').value=slug;
    updateProgram();
    if(slug)await loadEssay(slug);
    else {currentSlug='';$('essay').value='';setProfileEnabled(true);$('profile-loading').hidden=true}
  }catch(error){
    if(version===profileVersion&&currentUser?.uid===user.uid){
      $('profile-loading').hidden=true;
      $('retry-profile').hidden=false;
      status('Could not load your profile. Your saved details have not been changed. Retry to continue. '+describeError(error),true);
    }
  }
}
function switchTo(slug){
  $('save-success').hidden=true;
  $('program').value=slug;updateProgram();
  if(!slug){currentSlug='';$('essay').value='';dirty=false;return}
  loadEssay(slug);
}
function fieldError(id,message){
  const field=$(id);field.setAttribute('aria-invalid','true');
  field.setAttribute('aria-describedby','status');
  status(message,true);field.focus();return false;
}
async function saveProfile(){
  if(saving||!profileReady)return false;
  clearStatus();$('save-success').hidden=true;
  if(!currentUser?.emailVerified){status('Confirm your email before saving your profile.',true);return false}
  const uid=currentUser.uid,slug=currentSlug;
  const school=$('school').value.trim(),achievements=$('achievements').value.trim(),essay=$('essay').value.trim();
  const grade=$('grade').value,birthDate=$('birth-date').value;
  if(!slug||!Object.hasOwn(programInfo,slug))return fieldError('program','Choose a program.');
  if([...school].length<1||[...school].length>120)return fieldError('school','School must be 1–120 characters after removing surrounding spaces.');
  if(!gradeOptions.has(grade))return fieldError('grade','Select a valid grade.');
  if(!validBirth(birthDate))return fieldError('birth-date','Enter a real date of birth before today.');
  if([...achievements].length<1||[...achievements].length>3000)return fieldError('achievements','Achievements must be 1–3,000 characters after removing surrounding spaces.');
  if([...essay].length<100||[...essay].length>12000)return fieldError('essay','Essay must be 100–12,000 characters after removing surrounding spaces.');
  if(!$('consent').checked)return fieldError('consent','Confirm that your Relay profile is separate from the official application.');
  const snapshot={uid,slug,school,grade,birthDate,achievements,essay,email:currentUser.email,version:profileVersion};
  saving=true;$('profile-fields').disabled=true;setBusy($('sign-out'),true);
  try{
    const batch=writeBatch(db);
    batch.set(doc(db,'users',uid),{email:snapshot.email,school,grade,dateOfBirth:birthDate,achievements,lastProgram:slug,updatedAt:serverTimestamp()},{merge:true});
    batch.set(doc(db,'users',uid,'essays',slug),{programSlug:slug,essay,updatedAt:serverTimestamp()},{merge:true});
    await batch.commit();
    if(currentUser?.uid===uid&&profileVersion===snapshot.version){
      drafts.delete(draftKey(slug));dirty=false;
      $('save-success').querySelector('strong').textContent=programName(slug)+' profile saved.';
      $('save-success').hidden=false;
      $('save-success').scrollIntoView({behavior:'smooth',block:'nearest'});
    }
    return true;
  }catch(error){
    if(currentUser?.uid===uid){drafts.set(draftKey(slug),$('essay').value);status('Could not save '+programName(slug)+'. Your text is still here. '+describeError(error),true)}
    return false;
  }finally{
    saving=false;
    if(currentUser?.uid===uid){$('profile-fields').disabled=false;setBusy($('sign-out'),false)}
  }
}
function programName(slug){return {uwc:'UWC',flex:'FLEX',lumiere:'Lumiere',yygs:'YYGS'}[slug]||'Your'}
async function finishEmail(email){
  if(authBusy)return;
  authBusy=true;
  const button=$('confirm-email-form').querySelector('button');setBusy(button,true);clearStatus();
  try{
    await ensurePersistence();
    await signInWithEmailLink(auth,email,location.href);
    storage('removeItem',emailKey);
    const cleanUrl=new URL('register/',siteRoot);
    if(programInfo[requestedProgram])cleanUrl.searchParams.set('program',requestedProgram);
    try{history.replaceState(null,'',cleanUrl)}catch(error){}
    completingEmailLink=false;
    markWelcome();
    route('home');
  }catch(error){
    completingEmailLink=false;
    $('confirm-address').value=email;
    panel('confirm-email');
    status(describeError(error)+' You can correct the email or request a new link.',true);
  }
  finally{authBusy=false;setBusy(button,false);}
}

try{
  if(!firebaseConfig.apiKey||!firebaseConfig.authDomain||!firebaseConfig.projectId||!firebaseConfig.appId)throw new Error('Firebase configuration is incomplete');
  const app=initializeApp(firebaseConfig);
  auth=getAuth(app);db=getFirestore(app);
  panel('auth-panel');
  $('email-form').addEventListener('submit',async event=>{
    event.preventDefault();if(authBusy)return;
    if(Date.now()-lastSentAt<60000){status('Please wait a minute before requesting another link.',true);return}
    authBusy=true;clearStatus();
    const button=event.currentTarget.querySelector('button');
    const email=$('email').value.trim();setBusy(button,true);setBusy($('google-button'),true);
    try{
      const callback=new URL('register/',siteRoot);
      if(programInfo[requestedProgram])callback.searchParams.set('program',requestedProgram);
      await sendSignInLinkToEmail(auth,email,{url:callback.href,handleCodeInApp:true});
      lastSentAt=Date.now();
      storage('setItem',emailKey,email);
      $('sent-address').textContent=email;
      panel('email-sent');
    }catch(error){status(describeError(error),true);}
    finally{authBusy=false;setBusy(button,false);setBusy($('google-button'),false);}
  });
  $('change-email').addEventListener('click',()=>showAuth(accountMode));
  $('resend-email').addEventListener('click',()=>{const email=$('sent-address').textContent;showAuth(accountMode);$('email').value=email;$('email').focus()});
  $('confirm-change-email').addEventListener('click',()=>{$('confirm-address').focus();$('confirm-address').select()});
  $('confirm-new-link').addEventListener('click',()=>{showAuth(accountMode);$('email').value=$('confirm-address').value;$('email').focus()});
  $('confirm-back').addEventListener('click',()=>showAuth(accountMode));
  $('confirm-email-form').addEventListener('submit',event=>{event.preventDefault();finishEmail($('confirm-address').value.trim());});
  $('google-button').addEventListener('click',async()=>{
    if(authBusy)return;
    authBusy=true;clearStatus();setBusy($('google-button'),true);setBusy($('email-form').querySelector('button'),true);
    try{
      await ensurePersistence();
      const result=await signInWithPopup(auth,new GoogleAuthProvider());
      if(result.user){markWelcome();route('home');}
    }
    catch(error){status(describeError(error),true);}
    finally{authBusy=false;setBusy($('google-button'),false);setBusy($('email-form').querySelector('button'),false);}
  });
  $('sign-out').addEventListener('click',async()=>{
    setBusy($('sign-out'),true);
    try{await signOut(auth);invalidateProfile();drafts.clear();$('profile-form').reset();currentUser=null;route('register');}
    catch(error){status(describeError(error),true);setBusy($('sign-out'),false)}
  });
  $('profile-form').addEventListener('input',event=>{if(event.target.id!=='consent'&&event.target.id!=='program')dirty=true;event.target.removeAttribute('aria-invalid')});
  $('program').addEventListener('change',()=>{
    const next=$('program').value;
    $('program').value=currentSlug;updateProgram();
    if(saving||!profileReady||next===currentSlug)return;
    if(dirty&&currentSlug){
      pendingSlug=next;$('switch-choice').hidden=false;$('switch-choice').querySelector('button').focus();
    }else switchTo(next);
  });
  $('switch-cancel').addEventListener('click',()=>{$('switch-choice').hidden=true;pendingSlug='';$('program').focus()});
  $('switch-keep').addEventListener('click',()=>{if(currentSlug)drafts.set(draftKey(currentSlug),$('essay').value);dirty=false;const slug=pendingSlug;pendingSlug='';$('switch-choice').hidden=true;switchTo(slug)});
  $('switch-save').addEventListener('click',async()=>{const slug=pendingSlug;if(await saveProfile()){pendingSlug='';$('switch-choice').hidden=true;switchTo(slug)}});
  $('retry-profile').addEventListener('click',()=>showProfile(currentUser));
  $('profile-form').addEventListener('submit',event=>{event.preventDefault();saveProfile()});
  completingEmailLink=isSignInWithEmailLink(auth,location.href);
  if(completingEmailLink){
    const storedEmail=storage('getItem',emailKey);
    if(storedEmail)finishEmail(storedEmail);
    else panel('confirm-email');
  }
  onAuthStateChanged(auth,user=>{
    if(user){
      if(completingEmailLink)return;
      if(isDashboard)showProfile(user);
      else {markWelcome();route('home');}
    }else if(isDashboard){invalidateProfile();drafts.clear();$('profile-form').reset();currentUser=null;route('register')}
    else if(!completingEmailLink&&$('email-sent').hidden&&$('auth-panel').hidden)panel('auth-panel');
  },error=>status(describeError(error),true));
}catch(error){
  $('setup-pending').querySelector('h2').textContent='Sign-in could not load';
  $('setup-pending').querySelector('p').textContent='Check your connection and try reloading this page.';
  panel('setup-pending');
}

