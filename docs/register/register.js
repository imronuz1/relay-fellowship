import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { browserLocalPersistence, getAuth, GoogleAuthProvider, isSignInWithEmailLink, onAuthStateChanged, sendSignInLinkToEmail, setPersistence, signInWithEmailLink, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { doc, getDoc, getFirestore, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig } from '../firebase-config.js';

const $ = id => document.getElementById(id);
const panels = ['setup-pending','account-panel','auth-panel','email-sent','confirm-email','profile-panel'];
const programInfo = {
  uwc: {prompt:'UWC brings students from different backgrounds together for academics, service and shared life. Paste your essay about how you would contribute to that community and what you hope to learn.',url:'https://uwc.org/how-to-apply/'},
  flex: {prompt:'FLEX is a year of study, host-family life and cultural exchange in the United States. Paste your essay about adapting to a new community and sharing your home culture.',url:'https://exchanges.state.gov/non-us/program/future-leaders-exchange'},
  lumiere: {prompt:'Lumiere pairs students with research mentors. Paste your essay about the question you want to investigate, why it matters and how you would pursue it.',url:'https://www.lumiere-education.com/'},
  yygs: {prompt:'YYGS brings students together for interdisciplinary learning and global discussion. Paste your essay about a question or challenge you would explore with peers.',url:'https://globalscholars.yale.edu/'}
};
const siteRoot = new URL('../', import.meta.url);
const dashboardPath = new URL('dashboard/',siteRoot).pathname;
const isDashboard = location.pathname.replace(/\/?$/,'/')===dashboardPath;
const params = new URLSearchParams(location.search);
const requestedProgram = params.get('program');
const emailKey = 'relayEmailForSignIn';
let auth, db, currentUser;
let accountMode='signup';
let completingEmailLink=false;
let navigating=false;

function route(name){
  if(navigating)return;
  navigating=true;
  const url=new URL(name+'/',siteRoot);
  if(programInfo[requestedProgram])url.searchParams.set('program',requestedProgram);
  location.replace(url.href);
}

function panel(id){for(const name of panels)$(name).hidden=name!==id;}
function status(message,error=false){const el=$('status');el.textContent=message;el.classList.toggle('error',error);el.hidden=false;}
function clearStatus(){$('status').hidden=true;}
function showAuth(mode){accountMode=mode;$('auth-title').textContent=mode==='signin'?'Sign in':'Sign up';clearStatus();panel('auth-panel');}
function setBusy(button,busy){button.disabled=busy;button.setAttribute('aria-busy',String(busy));}
function describeError(error){
  switch(error?.code){
    case 'auth/invalid-email':return 'Please enter a valid email address.';
    case 'auth/unauthorized-domain':return 'This site has not been added to Firebase authorized domains yet.';
    case 'auth/operation-not-allowed':return 'This sign-in method has not been enabled in Firebase yet.';
    case 'auth/popup-blocked':return 'Your browser blocked Google sign-in. Open this page in Chrome or Safari and try again.';
    case 'auth/popup-closed-by-user':return 'Google sign-in was closed before it finished.';
    case 'auth/invalid-action-code':return 'This sign-in link has expired or has already been used. Request a new one.';
    case 'permission-denied':return 'Your profile could not be saved. Please contact Relay to check the database permissions.';
    default:return 'Something went wrong. Please try again.';
  }
}
function updateProgram(){
  const slug=$('program').value;
  $('essay-prompt').textContent=programInfo[slug]?.prompt||'Choose a program to see a relevant essay prompt.';
  $('official-application').href=programInfo[slug]?.url||new URL('opportunities/',siteRoot).href;
}
async function loadEssay(slug){
  $('essay').value='';
  if(!currentUser||!programInfo[slug])return;
  try{const snap=await getDoc(doc(db,'users',currentUser.uid,'essays',slug));if($('program').value===slug&&snap.exists())$('essay').value=snap.data().essay||'';}
  catch(error){status(describeError(error),true);}
}
async function showProfile(user){
  currentUser=user; panel('profile-panel');clearStatus();
  $('signed-in-as').textContent=user.email||'Signed in with Google';
  $('birth-date').max=new Date().toISOString().slice(0,10);
  if(programInfo[requestedProgram])$('program').value=requestedProgram;
  updateProgram();
  try{
    const snap=await getDoc(doc(db,'users',user.uid));
    if(snap.exists()){
      const data=snap.data();
      $('school').value=data.school||'';
      $('grade').value=data.grade||'';
      $('birth-date').value=data.dateOfBirth||'';
      $('achievements').value=data.achievements||'';
      if(!programInfo[requestedProgram]&&programInfo[data.lastProgram])$('program').value=data.lastProgram;
      updateProgram();
    }
    await loadEssay($('program').value);
  }catch(error){status(describeError(error),true);}
}
async function finishEmail(email){
  const button=$('confirm-email-form').querySelector('button');setBusy(button,true);clearStatus();
  try{
    await setPersistence(auth,browserLocalPersistence);
    await signInWithEmailLink(auth,email,location.href);
    localStorage.removeItem(emailKey);
    const cleanUrl=new URL('register/',siteRoot);
    if(programInfo[requestedProgram])cleanUrl.searchParams.set('program',requestedProgram);
    history.replaceState(null,'',cleanUrl);
    completingEmailLink=false;
    route('dashboard');
  }catch(error){completingEmailLink=false;status(describeError(error),true);}
  finally{setBusy(button,false);}
}

if(!firebaseConfig.apiKey||!firebaseConfig.authDomain||!firebaseConfig.projectId||!firebaseConfig.appId){
  panel('setup-pending');
}else{
  const app=initializeApp(firebaseConfig);
  auth=getAuth(app);db=getFirestore(app);
  $('choose-sign-up').addEventListener('click',()=>showAuth('signup'));
  $('choose-sign-in').addEventListener('click',()=>showAuth('signin'));
  $('back-to-account').addEventListener('click',()=>{clearStatus();panel('account-panel');});
  $('email-form').addEventListener('submit',async event=>{
    event.preventDefault();clearStatus();
    const button=event.currentTarget.querySelector('button');
    const email=$('email').value.trim();setBusy(button,true);
    try{
      const callback=new URL('register/',siteRoot);
      if(programInfo[requestedProgram])callback.searchParams.set('program',requestedProgram);
      await sendSignInLinkToEmail(auth,email,{url:callback.href,handleCodeInApp:true});
      localStorage.setItem(emailKey,email);
      $('sent-address').textContent=email;
      panel('email-sent');
    }catch(error){status(describeError(error),true);}
    finally{setBusy(button,false);}
  });
  $('change-email').addEventListener('click',()=>showAuth(accountMode));
  $('confirm-email-form').addEventListener('submit',event=>{event.preventDefault();finishEmail($('confirm-address').value.trim());});
  $('google-button').addEventListener('click',async()=>{
    clearStatus();setBusy($('google-button'),true);
    try{
      await setPersistence(auth,browserLocalPersistence);
      const result=await signInWithPopup(auth,new GoogleAuthProvider());
      if(result.user)route('dashboard');
    }
    catch(error){status(describeError(error),true);}
    finally{setBusy($('google-button'),false);}
  });
  $('sign-out').addEventListener('click',async()=>{
    try{await signOut(auth);currentUser=null;route('register');}
    catch(error){status(describeError(error),true);}
  });
  $('program').addEventListener('change',()=>{updateProgram();loadEssay($('program').value);$('save-success').hidden=true;});
  $('profile-form').addEventListener('submit',async event=>{
    event.preventDefault();clearStatus();$('save-success').hidden=true;
    if(!currentUser||!currentUser.emailVerified){status('Please confirm your email before saving your profile.',true);return;}
    const birthDate=$('birth-date').value;
    if(!birthDate||birthDate>=new Date().toISOString().slice(0,10)){status('Enter a valid date of birth.',true);return;}
    const slug=$('program').value;
    if(!programInfo[slug]){status('Select a program.',true);return;}
    const button=$('save-profile');setBusy(button,true);
    try{
      const userRef=doc(db,'users',currentUser.uid);
      const essayRef=doc(db,'users',currentUser.uid,'essays',slug);
      const batch=writeBatch(db);
      batch.set(userRef,{email:currentUser.email,school:$('school').value.trim(),grade:$('grade').value,dateOfBirth:birthDate,achievements:$('achievements').value.trim(),lastProgram:slug,updatedAt:serverTimestamp()},{merge:true});
      batch.set(essayRef,{programSlug:slug,essay:$('essay').value.trim(),updatedAt:serverTimestamp()},{merge:true});
      await batch.commit();
      $('save-success').hidden=false;
      $('save-success').scrollIntoView({behavior:'smooth',block:'nearest'});
    }catch(error){status(describeError(error),true);}
    finally{setBusy(button,false);}
  });
  completingEmailLink=isSignInWithEmailLink(auth,location.href);
  if(completingEmailLink){
    const storedEmail=localStorage.getItem(emailKey);
    if(storedEmail)finishEmail(storedEmail);
    else panel('confirm-email');
  }
  onAuthStateChanged(auth,user=>{
    currentUser=user;
    if(user){
      if(completingEmailLink)return;
      if(isDashboard)showProfile(user);
      else route('dashboard');
    }else if(isDashboard)route('register');
    else if(!completingEmailLink&&$('email-sent').hidden&&$('auth-panel').hidden)panel('account-panel');
  },error=>status(describeError(error),true));
}

