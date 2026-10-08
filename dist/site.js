(()=>{
  const root=location.pathname.startsWith('/relay-fellowship/')?'/relay-fellowship/':'/';
  if(location.pathname===root){
    const flexOpen=Date.now()<Date.UTC(2026,9,23,4);
    const flexNote=flexOpen?'FLEX Global 2027–28 applications are open for Uzbekistan through October 22, 2026.':'Explore FLEX Global and check the official application for current dates.';
    const currentUrl=new URL(location.href);
    const program=['uwc','flex','lumiere','yygs'].includes(currentUrl.searchParams.get('program'))?currentUrl.searchParams.get('program'):null;
    let welcome=currentUrl.searchParams.get('welcome')==='1';
    try{welcome=welcome||Boolean(sessionStorage.getItem('relayWelcomeAfterLogin'));}catch(error){}
    const profileUrl=root+'dashboard/'+(program?'?program='+encodeURIComponent(program):'');
    const header=document.querySelector('.hero-surface > header');
    if(welcome&&header){
      const invitation=document.createElement('div');
      invitation.className='relay-welcome';
      invitation.setAttribute('role','region');
      invitation.setAttribute('aria-label','Your next exchange opportunity');
      invitation.innerHTML=`<div class="relay-welcome-inner"><div class="relay-welcome-copy"><span class="relay-welcome-kicker">WELCOME TO RELAY FELLOWSHIP</span><h2>Where will you go next?</h2><p>${flexNote} Explore the exchange, or find another program that fits your goals.</p></div><div class="relay-welcome-actions"><a class="relay-welcome-primary" href="${root}programs/flex/">Explore FLEX 2027–28</a><a class="relay-welcome-secondary" href="${root}opportunities/">Explore other exchanges</a><a class="relay-welcome-profile" href="https://ais.americancouncils.org/flexglobal" target="_blank" rel="noopener noreferrer">Official FLEX application ↗</a><a class="relay-welcome-profile" href="${profileUrl}">Complete your profile</a></div><button class="relay-welcome-close" type="button" aria-label="Dismiss welcome invitation">×</button></div>`;
      invitation.querySelector('.relay-welcome-close').addEventListener('click',()=>invitation.remove());
      header.after(invitation);
      try{sessionStorage.removeItem('relayWelcomeAfterLogin');}catch(error){}
      if(currentUrl.searchParams.has('welcome')){currentUrl.searchParams.delete('welcome');history.replaceState(null,'',currentUrl)}
    }
  }
  const menuButton=document.querySelector('button[aria-label="Open menu"]');
  if(menuButton){
    const menu=document.createElement('nav');menu.className='relay-mobile-menu';menu.setAttribute('aria-label','Mobile navigation');
    menu.innerHTML='<a href="/">Home</a><a href="/opportunities/">Programs</a><a href="/mentors/">Mentors</a><a href="/finalists/">Finalists</a><a href="/achievements/">Achievements</a><a href="/register/">Register</a><a href="/flex-mock/">FLEX Essay Mock Test</a>';
    document.body.append(menu);
    menuButton.setAttribute('aria-expanded','false');
    menuButton.addEventListener('click',()=>{const open=menu.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Close menu':'Open menu')});
    menu.addEventListener('click',e=>{if(e.target.closest('a')){menu.classList.remove('open');menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open menu')}});
  }

  const search=document.querySelector('input[placeholder^="Search fellowships"]');
  if(!search)return;
  const cards=[...document.querySelectorAll('article.card-elevated')];
  const filters=[...document.querySelectorAll('button')].filter(b=>['All','Scholarship','Exchange','Research','Summer school','Fellowship','Competition','Leadership','Fully funded'].includes(b.textContent.trim()));
  let active='All';
  function update(){const query=search.value.trim().toLowerCase();for(const card of cards){const body=card.textContent.toLowerCase();const category=card.querySelector('h2')?.parentElement?.textContent.toLowerCase()||'';const matchesCategory=active==='All'||(active==='Fully funded'?body.includes('fully funded'):category.includes(active.toLowerCase()));card.hidden=!(matchesCategory&&body.includes(query));}}
  search.addEventListener('input',update);
  filters.forEach(button=>button.addEventListener('click',()=>{active=button.textContent.trim();filters.forEach(b=>{const selected=b===button;b.classList.toggle('border-transparent',selected);b.classList.toggle('bg-primary',selected);b.classList.toggle('text-primary-foreground',selected);b.classList.toggle('border-border',!selected);b.classList.toggle('bg-background',!selected);b.classList.toggle('text-muted-foreground',!selected)});update()}));
  function toast(message){document.querySelector('.relay-toast')?.remove();const el=document.createElement('div');el.className='relay-toast';el.setAttribute('role','status');el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),3200)}
  cards.forEach(card=>{const name=card.querySelector('h2')?.textContent.trim()||'Opportunity';const buttons=[...card.querySelectorAll('button')];buttons.find(b=>b.textContent.trim()==='View opportunity')?.addEventListener('click',()=>toast(name+' details opened'));buttons.find(b=>b.textContent.trim()==='Track')?.addEventListener('click',()=>toast('Sign in to track '+name+' on Relay'));});
})();
