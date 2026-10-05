const cards=[...document.querySelectorAll('.program-card')];
const search=document.querySelector('#program-search');
const selects=[...document.querySelectorAll('[data-filter]')];
const count=document.querySelector('#result-count');
const empty=document.querySelector('#no-results');
const grid=document.querySelector('#program-grid');
function update(){
  const query=(search?.value||'').trim().toLowerCase();
  let visible=0;
  for(const card of cards){
    const matchesSearch=!query||card.dataset.search.includes(query);
    const matchesFilters=selects.every(select=>{
      const value=select.value;
      if(!value)return true;
      const key=select.dataset.filter;
      const raw=card.dataset[key==='grade'?'grades':key==='field'?'fields':key]||'';
      return key==='grade'||key==='field'?raw.split('|').includes(value):raw===value;
    });
    card.hidden=!(matchesSearch&&matchesFilters);
    if(!card.hidden)visible++;
  }
  if(count)count.textContent=String(visible);
  if(empty)empty.hidden=visible!==0;
  if(grid)grid.hidden=visible===0;
}
search?.addEventListener('input',update);
selects.forEach(select=>select.addEventListener('change',update));
document.querySelector('#clear-filters')?.addEventListener('click',()=>{if(search)search.value='';selects.forEach(x=>x.value='');update();search?.focus()});
