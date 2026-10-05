(()=>{
  const menuButton=document.querySelector('button[aria-label="Open menu"]');
  if(menuButton){
    const menu=document.createElement('nav');menu.className='relay-mobile-menu';menu.setAttribute('aria-label','Mobile navigation');
    menu.innerHTML='<a href="/">Home</a><a href="/opportunities/">Programs</a><a href="/mentors/">Mentors</a><a href="/finalists/">Finalists</a><a href="/achievements/">Achievements</a><a href="/register/">Register</a>';
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
