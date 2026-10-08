import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./register.js',import.meta.url),'utf8')
  .replace(/^import .*;\n/gm,'')
  .replace('import.meta.url',"'https://imronuz1.github.io/relay-fellowship/register/register.js'");

function boot(path,emailLink=false){
  const elements=new Map(), calls=[], store=new Map();
  const get=id=>{
    if(!elements.has(id))elements.set(id,{hidden:true,value:'',textContent:'',classList:{toggle(){}},addEventListener(name,cb){this[name]=cb},setAttribute(){},querySelector(){return {disabled:false,setAttribute(){}}}});
    return elements.get(id);
  };
  const location={pathname:`/relay-fellowship/${path}/`,search:'',href:`https://imronuz1.github.io/relay-fellowship/${path}/`,replace:url=>calls.push(['route',url])};
  const storage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)};
  let observer;
  const user={uid:'student-1',email:'student@example.com',emailVerified:true};
  const context=vm.createContext({
    document:{getElementById:get},location,localStorage:storage,history:{replaceState:(_,__,url)=>calls.push(['clean',String(url)])},
    URL,URLSearchParams,Date,console,
    firebaseConfig:{apiKey:'test',authDomain:'test',projectId:'test',appId:'test'},
    initializeApp:()=>({}),getAuth:()=>({}),getFirestore:()=>({}),
    onAuthStateChanged:(_,cb)=>{observer=cb},isSignInWithEmailLink:()=>emailLink,
    browserLocalPersistence:{type:'LOCAL'},setPersistence:async()=>{calls.push(['persistence'])},
    signInWithPopup:async()=>{calls.push(['popup']);return {user}},
    signInWithEmailLink:async()=>{calls.push(['email']);return {user}},
    sendSignInLinkToEmail:async()=>{},signOut:async()=>{},
    doc:()=>({}),getDoc:async()=>({exists:()=>false}),serverTimestamp:()=>({}),writeBatch:()=>({set(){},commit:async()=>{}}),
    GoogleAuthProvider:class {}
  });
  vm.runInContext(source,context);
  return {get,calls,store,context,observer:()=>observer,user};
}

let page=boot('register');
page.observer()(page.user);
assert.equal(page.calls[0][1],'https://imronuz1.github.io/relay-fellowship/dashboard/');

page=boot('dashboard');
page.observer()(null);
assert.equal(page.calls[0][1],'https://imronuz1.github.io/relay-fellowship/register/');

page=boot('register');
await page.get('google-button').click();
assert.deepEqual(page.calls.map(x=>x[0]),['persistence','popup','route']);
assert.match(page.calls[2][1],/\/dashboard\/$/);

page=boot('register',true);
await vm.runInContext("finishEmail('student@example.com')",page.context);
assert.deepEqual(page.calls.map(x=>x[0]),['persistence','email','clean','route']);
assert.match(page.calls[3][1],/\/dashboard\/$/);

page=boot('dashboard');
page.observer()(page.user);
assert.equal(page.get('profile-panel').hidden,false);
assert.equal(page.calls.length,0);
console.log('Register guard, dashboard guard, persistent sign-in, and email callback routing: OK');
