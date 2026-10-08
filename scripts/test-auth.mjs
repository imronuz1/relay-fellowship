import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../dist/register/register.js',import.meta.url),'utf8')
  .replace(/^import .*;\n/gm,'')
  .replace('import.meta.url',"'https://imronuz1.github.io/relay-fellowship/register/register.js'");

function boot(path,emailLink=false,options={}){
  const elements=new Map(), calls=[], store=new Map(),sessionStore=new Map();
  const get=id=>{
    if(!elements.has(id))elements.set(id,{hidden:true,value:'',textContent:'',checked:false,classList:{toggle(){}},focus(){},select(){},reset(){},scrollIntoView(){},removeAttribute(){},addEventListener(name,cb){this[name]=cb},setAttribute(){},querySelector(){return {disabled:false,textContent:'',focus(){},setAttribute(){},addEventListener(){}}}});
    return elements.get(id);
  };
  const search=options.search||'';
  const location={pathname:`/relay-fellowship/${path}/`,search,href:`https://imronuz1.github.io/relay-fellowship/${path}/${search}`,replace:url=>calls.push(['route',url])};
  const storage={getItem:key=>{if(options.storageFails)throw Error('storage');return store.get(key)||null},setItem:(key,value)=>{if(options.storageFails)throw Error('storage');store.set(key,value)},removeItem:key=>{if(options.storageFails)throw Error('storage');store.delete(key)}};
  const sessionStorage={getItem:key=>sessionStore.get(key)||null,setItem:(key,value)=>sessionStore.set(key,value),removeItem:key=>sessionStore.delete(key)};
  let observer;
  const user={uid:'student-1',email:'student@example.com',emailVerified:true};
  const context=vm.createContext({
    document:{getElementById:get},location,localStorage:storage,sessionStorage,history:{replaceState:(_,__,url)=>calls.push(['clean',String(url)])},
    URL,URLSearchParams,Date,console,
    firebaseConfig:{apiKey:'test',authDomain:'test',projectId:'test',appId:'test'},
    initializeApp:()=>({}),getAuth:()=>({}),getFirestore:()=>({}),
    onAuthStateChanged:(_,cb)=>{observer=cb},isSignInWithEmailLink:()=>emailLink,
    browserLocalPersistence:{type:'LOCAL'},browserSessionPersistence:{type:'SESSION'},setPersistence:options.persistence||(async()=>{calls.push(['persistence'])}),
    signInWithPopup:options.popup||(async()=>{calls.push(['popup']);return {user}}),
    signInWithEmailLink:options.emailSignIn||(async()=>{calls.push(['email']);return {user}}),
    sendSignInLinkToEmail:async()=>{calls.push(['send']);},signOut:async()=>{},
    doc:(_, ...parts)=>({path:parts.join('/')}),getDoc:options.getDoc||(async()=>({exists:()=>false})),serverTimestamp:()=>({}),writeBatch:()=>({set(ref,data){calls.push(['write',ref.path,data])},commit:options.commit||(async()=>{calls.push(['commit'])})}),
    GoogleAuthProvider:class {}
  });
  vm.runInContext(source,context);
  return {get,calls,store,sessionStore,context,observer:()=>observer,user};
}

let page=boot('register');
page.observer()(page.user);
assert.equal(page.calls[0][1],'https://imronuz1.github.io/relay-fellowship/?welcome=1');
assert.deepEqual(JSON.parse(page.sessionStore.get('relayWelcomeAfterLogin')),{program:null});

page=boot('dashboard');
page.observer()(null);
assert.equal(page.calls[0][1],'https://imronuz1.github.io/relay-fellowship/register/');

page=boot('register');
await page.get('google-button').click();
assert.deepEqual(page.calls.map(x=>x[0]),['persistence','popup','route']);
assert.equal(page.calls[2][1],'https://imronuz1.github.io/relay-fellowship/?welcome=1');
assert.deepEqual(JSON.parse(page.sessionStore.get('relayWelcomeAfterLogin')),{program:null});

page=boot('register',true);
await vm.runInContext("finishEmail('student@example.com')",page.context);
assert.deepEqual(page.calls.map(x=>x[0]),['persistence','email','clean','route']);
assert.equal(page.calls[3][1],'https://imronuz1.github.io/relay-fellowship/?welcome=1');
assert.deepEqual(JSON.parse(page.sessionStore.get('relayWelcomeAfterLogin')),{program:null});

page=boot('dashboard');
page.observer()(page.user);
assert.equal(page.get('profile-panel').hidden,false);
assert.equal(page.calls.length,0);
console.log('Home redirect, welcome invitation flag, dashboard guard, persistent sign-in, and email callback routing: OK');

page=boot('register',false,{search:'?program=uwc'});
await page.get('google-button').click();
assert.equal(page.calls.at(-1)[1],'https://imronuz1.github.io/relay-fellowship/?program=uwc&welcome=1');
assert.deepEqual(JSON.parse(page.sessionStore.get('relayWelcomeAfterLogin')),{program:'uwc'});

page=boot('register',false,{search:'?program=https://evil.example/'});
await page.get('google-button').click();
assert.equal(page.calls.at(-1)[1],'https://imronuz1.github.io/relay-fellowship/?welcome=1');

page=boot('register',false,{storageFails:true});
page.get('email').value='student@example.com';
await page.get('email-form').submit({preventDefault(){},currentTarget:page.get('email-form')});
assert.equal(page.get('email-sent').hidden,false);
assert.equal(page.calls.at(-1)[0],'send');

page=boot('register',false,{persistence:async(_,mode)=>{page.calls.push(['persistence',mode.type]);if(mode.type==='LOCAL')throw Error('denied')}});
await page.get('google-button').click();
assert.deepEqual(page.calls.slice(0,3).map(x=>x[0]),['persistence','persistence','popup']);
assert.equal(page.calls[1][1],'SESSION');

page=boot('register',true,{storageFails:true});
assert.equal(page.get('confirm-email').hidden,false);
assert.equal(typeof page.observer(),'function');
await vm.runInContext("finishEmail('student@example.com')",page.context);
assert.equal(page.calls.at(-1)[0],'route');

page=boot('register',true,{emailSignIn:async()=>{throw {code:'auth/expired-action-code'}}});
await vm.runInContext("finishEmail('wrong@example.com')",page.context);
assert.equal(page.get('confirm-email').hidden,false);
assert.match(page.get('status').textContent,/expired/);

const tick=()=>new Promise(resolve=>setImmediate(resolve));
let resolveProfile,resolveEssay;
page=boot('dashboard',false,{search:'?program=flex',getDoc:ref=>new Promise(resolve=>{
  if(ref.path==='users/student-1')resolveProfile=resolve;
  else resolveEssay=resolve;
})});
page.observer()(page.user);
assert.equal(page.get('profile-fields').disabled,true);
assert.equal(await vm.runInContext('saveProfile()',page.context),false);
resolveProfile({exists:()=>false});await tick();
assert.equal(page.get('profile-fields').disabled,true);
resolveEssay({exists:()=>true,data:()=>({essay:'Saved original essay'})});await tick();
assert.equal(page.get('profile-fields').disabled,false);
assert.equal(page.get('essay').value,'Saved original essay');
page.get('essay').value='Unsaved FLEX draft';
page.get('profile-form').input({target:{id:'essay',removeAttribute(){}}});
page.get('program').value='uwc';
page.get('program').change();
assert.equal(page.get('switch-choice').hidden,false);
page.get('switch-keep').click();
assert.equal(page.get('profile-fields').disabled,true);
resolveEssay({exists:()=>false});await tick();
page.get('program').value='flex';page.get('program').change();
resolveEssay({exists:()=>true,data:()=>({essay:'Saved original essay'})});await tick();
assert.equal(page.get('essay').value,'Unsaved FLEX draft');

page=boot('dashboard',false,{search:'?program=flex'});
page.observer()(page.user);await tick();
page.get('school').value='   ';
page.get('grade').value='9';page.get('birth-date').value='2010-04-12';
page.get('achievements').value='Mentored peers';
page.get('essay').value='A'.repeat(100);page.get('consent').checked=true;
assert.equal(await vm.runInContext('saveProfile()',page.context),false);
assert.equal(page.calls.filter(x=>x[0]==='write').length,0);
page.get('school').value='My school';page.get('essay').value=' '.repeat(100);
assert.equal(await vm.runInContext('saveProfile()',page.context),false);
page.get('essay').value='A'.repeat(100);
assert.equal(await vm.runInContext('saveProfile()',page.context),true);
assert.equal(page.calls.filter(x=>x[0]==='write').length,2);
assert.equal(page.calls.filter(x=>x[0]==='commit').length,1);

let finishCommit;
page=boot('dashboard',false,{search:'?program=flex',commit:()=>new Promise(resolve=>{finishCommit=resolve})});
page.observer()(page.user);await tick();
page.get('school').value='My school';page.get('grade').value='9';
page.get('birth-date').value='2010-04-12';page.get('achievements').value='Mentored peers';
page.get('essay').value='A'.repeat(100);page.get('consent').checked=true;
const firstSave=vm.runInContext('saveProfile()',page.context);
const secondSave=await vm.runInContext('saveProfile()',page.context);
assert.equal(secondSave,false);
assert.equal(page.get('profile-fields').disabled,true);
page.get('program').value='uwc';page.get('program').change();
assert.equal(page.get('program').value,'flex');
finishCommit();assert.equal(await firstSave,true);
assert.equal(page.calls.filter(x=>x[0]==='write').length,2);

page=boot('dashboard',false,{search:'?program=flex',commit:async()=>{throw {code:'permission-denied'}}});
page.observer()(page.user);await tick();
page.get('school').value='My school';page.get('grade').value='9';
page.get('birth-date').value='2010-04-12';page.get('achievements').value='Mentored peers';
page.get('essay').value='A'.repeat(100);page.get('consent').checked=true;
assert.equal(await vm.runInContext('saveProfile()',page.context),false);
assert.equal(page.get('essay').value,'A'.repeat(100));
assert.equal(page.get('profile-fields').disabled,false);
assert.match(page.get('status').textContent,/Could not save FLEX/);
console.log('Program context, storage denial, callback recovery, profile loading, drafts, and trimmed validation: OK');
