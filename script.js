/* ====== Config / state ====== */
const startHour = 8;
const endHour = 21; // inclusive last hour shown (08..21)
const ROWS = 15;
const COLS = 8;

const weekdaysPT = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
const monthShortPT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const defaultPrices = {
  "Massagem Costas": 20, "Massagem Corpo": 30,
  "Sobrancelha": 4, "Buço": 3, "Axilas": 6, "Braço": 8, "Perna": 18, "Meia Perna": 13, "Virilha": 10, "Virilha Cavada": 7,
  "Mani Gel": 25, "Mani Soft Gel": 21, "Mani Molfe F1": 25, "Mani Verniz Gel": 17, "Mani Simples": 10, "Mani Remoção": 5,
  "Pedi Verniz Gel": 15, "Spa dos Pés": 19, "Pedi s/ Verniz": 10
};

const CATEGORY_MAP = {
  "Massagem Costas":"cat-massagem","Massagem Corpo":"cat-massagem",
  "Sobrancelha":"cat-depilacao","Buço":"cat-depilacao","Axilas":"cat-depilacao","Braço":"cat-depilacao",
  "Perna":"cat-depilacao","Meia Perna":"cat-depilacao","Virilha":"cat-depilacao","Virilha Cavada":"cat-depilacao",
  "Mani Gel":"cat-manicure","Mani Soft Gel":"cat-manicure","Mani Molfe F1":"cat-manicure",
  "Mani Verniz Gel":"cat-manicure","Mani Simples":"cat-manicure","Mani Remoção":"cat-manicure",
  "Pedi Verniz Gel":"cat-pedicure","Spa dos Pés":"cat-pedicure","Pedi s/ Verniz":"cat-pedicure",
  "Trabalho":"cat-trabalho"
};

/* ====== App state ====== */
let currentWeekStart = getStartOfWeek(new Date());
let events = loadEvents();
let currentOpenType = 'service';
let editingId = null;

/* ====== DOM refs ====== */
const calendar = document.getElementById('calendar');
const weekLabel = document.getElementById('weekLabel');
const overlay = document.getElementById('overlay');
const app = document.querySelector('.app');
const modalTitle = document.getElementById('modalTitle');

const openServiceBtn = document.getElementById('openService');
const openFixedBtn   = document.getElementById('openFixed');
const closeModalBtn  = document.getElementById('closeModal');
const eventForm      = document.getElementById('eventForm');
const deleteBtn      = document.getElementById('deleteBtn');

const inputId        = document.getElementById('eventId');
const inputCustomer  = document.getElementById('customerName');
const inputDate      = document.getElementById('date');
const inputStart     = document.getElementById('start');
const inputEnd       = document.getElementById('end');
const inputPrice     = document.getElementById('price');
const serviceRow     = document.getElementById('serviceRow');
const serviceDropdown = document.querySelector('.service-dropdown');

// NEW: Calculator refs
const calcNum1 = document.querySelector('.calc-num1');
const calcNum2 = document.querySelector('.calc-num2');
const calcBar  = document.querySelector('.calc-bar');

// NEW: validation toggle button (in modal)
const checkBtn = document.getElementById('checkBtn');

/* ====== Init ====== */
renderGrid();
renderWeekLabel();
wireCategoryToggles();
wireServiceClicks();
renderEvents();
bindUI();
updateCalculator();

/* ====== Bind UI controls ====== */
function bindUI(){
  openServiceBtn.addEventListener('click', ()=> openModalForNew('service'));
  openFixedBtn.addEventListener('click', ()=> openModalForNew('fixed'));
  closeModalBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e)=> { if(e.target === overlay) closeModal(); });

  document.getElementById('prevWeek').addEventListener('click', ()=> { shiftWeek(-7); });
  document.getElementById('nextWeek').addEventListener('click', ()=> { shiftWeek(7); });

  eventForm.addEventListener('submit', onSaveEvent);
  deleteBtn.addEventListener('click', onDeleteEvent);

  if(checkBtn){
    checkBtn.addEventListener('click', onToggleValidation);
  }
}

/* ====== Grid rendering ====== */
function renderGrid(){
  calendar.innerHTML = '';
  for(let r=1; r<=ROWS; r++){
    for(let c=1; c<=COLS; c++){
      const cell = document.createElement('div');
      cell.classList.add('grid-cell');

      if(r===1 && c===1){
        cell.classList.add('header-cell');
      }
      else if(r===1 && c>=2){
        const dayIndex = c-2;
        const dayDate = addDays(currentWeekStart, dayIndex);
        cell.classList.add('header-cell');
        const weekday = weekdaysPT[dayIndex];
        const day = pad(dayDate.getDate());
        const month = pad(dayDate.getMonth()+1);
        cell.innerHTML = `<div class="weekday">${weekday}</div><div class="small">${day}/${month}</div>`;
      }
      else if(c===1 && r>=2){
        const hour = startHour + (r-2);
        cell.classList.add('hour-cell');
        cell.textContent = formatHourLabel(hour);
      }
      else {
        const dayIndex = c-2;
        const hour = startHour + (r-2);
        cell.classList.add('slot-cell');
        cell.dataset.day = String(dayIndex);
        cell.dataset.hour = String(hour);
      }
      calendar.appendChild(cell);
    }
  }
  renderWeekLabel();
}

function renderWeekLabel(){
  const start = currentWeekStart;
  const end = addDays(currentWeekStart, 6);
  const textStart = `${start.getDate()} ${monthShortPT[start.getMonth()]}`;
  const textEnd   = `${end.getDate()} ${monthShortPT[end.getMonth()]}`;
  weekLabel.textContent = `${textStart} - ${textEnd}`;
}

/* ====== Helpers ====== */
function getStartOfWeek(d){ const x=new Date(d); const dayNum=(x.getDay()+6)%7; x.setDate(x.getDate()-dayNum); x.setHours(0,0,0,0); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function pad(n){ return String(n).padStart(2,'0'); }
function formatHourLabel(h){ return (h<10?'0'+h:h)+':00'; }
function formatDateLocal(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

/* ====== Events ====== */
function renderEvents(){
  document.querySelectorAll('.slot-cell').forEach(cell=>cell.innerHTML='');
  const ws = formatDateLocal(currentWeekStart);
  const we = formatDateLocal(addDays(currentWeekStart,6));

  events.forEach(ev=>{
    if(!ev.date) return;
    if(ev.date<ws || ev.date>we) return;
    const evDate = new Date(ev.date+'T00:00');
    const dayIndex=(evDate.getDay()+6)%7;
    const startH=parseInt((ev.start||'00:00').split(':')[0],10);
    const selector = `.slot-cell[data-day="${dayIndex}"][data-hour="${startH}"]`;
    const cell=document.querySelector(selector);
    if(!cell) return;

    const evNode=document.createElement('div');
    evNode.classList.add('event');
    const catClass=CATEGORY_MAP[ev.service]||'cat-trabalho';
    evNode.classList.add(catClass);

    const title=document.createElement('div');
    title.className='title';
    title.textContent=ev.customer||'';
    const meta=document.createElement('div');
    meta.className='meta';
    meta.textContent=`${ev.service||'Trabalho'} (€${Number(ev.price||0).toFixed(2)})`;

    evNode.appendChild(title);
    evNode.appendChild(meta);

    evNode.dataset.id=ev.id;
    if(ev.validated) evNode.classList.add('validated');

    evNode.addEventListener('click',(e)=>{ e.stopPropagation(); openModalForEdit(ev.id); });
    cell.appendChild(evNode);
  });
}

function saveEvents(){ try{ localStorage.setItem('weekcal_events_v1',JSON.stringify(events)); }catch(e){} }
function loadEvents(){ try{ return JSON.parse(localStorage.getItem('weekcal_events_v1')||'[]'); }catch(e){ return []; } }

/* ====== Modal ====== */
function openModalForNew(type){
  currentOpenType=type; editingId=null;
  inputId.value=''; inputCustomer.value=''; inputDate.value=formatDateLocal(new Date());
  inputStart.value='09:00'; inputEnd.value='10:00'; inputPrice.value='€0';
  deleteBtn.style.display='none';
  resetSelectedService();

  if(checkBtn) checkBtn.classList.remove('active');

  if(type==='service'){ modalTitle.textContent='Nova Marcação'; serviceRow.style.display=''; }
  else { modalTitle.textContent='Novo Trabalho'; serviceRow.style.display='none'; }

  overlay.classList.add('show'); app.classList.add('blur'); overlay.setAttribute('aria-hidden','false');
}

function openModalForEdit(id){
  const ev=events.find(x=>x.id===id); if(!ev) return;
  editingId=id;
  inputId.value=ev.id; inputCustomer.value=ev.customer||''; inputDate.value=ev.date||formatDateLocal(new Date());
  inputStart.value=ev.start||'09:00'; inputEnd.value=ev.end||'10:00'; inputPrice.value='€'+Number(ev.price||0).toFixed(2);
  deleteBtn.style.display='inline-block';

  if(checkBtn){
    checkBtn.classList.toggle('active', !!ev.validated);
  }

  if(ev.service && ev.service!=='Trabalho'){
    currentOpenType='service'; modalTitle.textContent='Editar Marcação'; serviceRow.style.display=''; setServiceTo(ev.service,true);
  } else {
    currentOpenType='fixed'; modalTitle.textContent='Editar Trabalho'; serviceRow.style.display='none'; resetSelectedService();
  }
  overlay.classList.add('show'); app.classList.add('blur'); overlay.setAttribute('aria-hidden','false');
}

function closeModal(){
  overlay.classList.remove('show'); app.classList.remove('blur'); overlay.setAttribute('aria-hidden','true');
  editingId=null; resetSelectedService();
}

/* ====== Save / Delete ====== */
function onSaveEvent(e){
  e.preventDefault();
  const id=inputId.value||('ev_'+Date.now());
  const customer=inputCustomer.value.trim();
  const date=inputDate.value;
  const start=inputStart.value;
  const end=inputEnd.value;
  let service=null;

  if(currentOpenType==='service'){
    service=getSelectedService();
    if(!service){ alert('Escolha um serviço ou selecione "Novo Trabalho".'); return; }
  } else service='Trabalho';

  const rawPrice=(inputPrice.value||'').toString().replace('€','').replace(',','.').trim();
  const price=parseFloat(rawPrice)||0;
  if(!customer||!date||!start||!end){ alert('Preencha todos os campos obrigatórios.'); return; }
  if(!isValidRange(start,end)){ alert('Hora final deve ser depois do início.'); return; }

  let ev=events.find(x=>x.id===id);
  if(ev){
    ev.customer=customer; ev.date=date; ev.start=start; ev.end=end; ev.service=service; ev.price=price;
  } else {
    ev={id,customer,date,start,end,service,price,validated:false};
    events.push(ev);
  }

  saveEvents(); renderEvents(); updateCalculator(); closeModal();
}

function onDeleteEvent(){
  if(!confirm('Eliminar este evento?')) return;
  const id=inputId.value||editingId; events=events.filter(e=>e.id!==id);
  saveEvents(); renderEvents(); updateCalculator(); closeModal();
}

/* ====== Validation toggle ====== */
function onToggleValidation(){
  const id = inputId.value || editingId;
  if(!id) return;
  const ev = events.find(e=>e.id===id);
  if(!ev) return;

  ev.validated = !ev.validated;
  saveEvents();
  renderEvents();
  updateCalculator();

  // 🔽 Toggle active + cancel visual state
  checkBtn.classList.toggle('active', ev.validated);
  checkBtn.classList.toggle('cancel', ev.validated);

  // 🔽 Update text dynamically
  if (ev.validated) {
    checkBtn.textContent = 'Cancelar Validação';
  } else {
    checkBtn.textContent = 'Validar Pagamento';
  }
}

/* ====== Calculator (week-scoped) ====== */
function updateCalculator(){
  // compute ISO date strings for the visible week (YYYY-MM-DD)
  const weekStartISO = formatDateLocal(currentWeekStart);
  const weekEndISO = formatDateLocal(addDays(currentWeekStart, 6));

  let totalValidated = 0;
  let totalAll = 0;

  // iterate events and only include those whose date is within [weekStartISO, weekEndISO]
  for (const ev of events){
    if (!ev || !ev.date) continue;
    // fast string comparison works with YYYY-MM-DD format
    if (ev.date < weekStartISO || ev.date > weekEndISO) continue;

    const p = Number(ev.price) || 0;
    totalAll += p;
    if (ev.validated) totalValidated += p;
  }

  if (calcNum1) calcNum1.textContent = "€" + totalValidated.toFixed(2);
  if (calcNum2) calcNum2.textContent = "€" + totalAll.toFixed(2);

  const percent = totalAll > 0 ? (totalValidated / totalAll * 100) : 0;
  // clamp to 0..100 and format as percent string
  const pctStr = Math.max(0, Math.min(100, percent)).toFixed(2) + '%';

  if (calcBar) {
    // set CSS variable used by ::after width
    calcBar.style.setProperty('--fill-percent', pctStr);
  }
}

/* ====== Services / categories ====== */
function resetSelectedService(){
  serviceRow.dataset.selectedService='';
  clearServiceHighlights();
}

function setServiceTo(serviceName, openCategory=false){
  serviceRow.dataset.selectedService=serviceName;
  clearServiceHighlights();
  const li=serviceDropdown.querySelector(`li[data-value="${serviceName}"]`);
  if(li) li.classList.add('selected-service');
  if(openCategory){
    const details=li.closest('details'); if(details) details.open=true;
  }
}

function getSelectedService(){ return serviceRow.dataset.selectedService||null; }

function clearServiceHighlights(){
  if(!serviceDropdown) return;
  serviceDropdown.querySelectorAll('li').forEach(li=>li.classList.remove('selected-service'));
}

function wireServiceClicks(){
  if(!serviceDropdown) return;
  const items=serviceDropdown.querySelectorAll('li');
  items.forEach(item=>{
    item.addEventListener('click',()=>{
      const serviceValue=item.dataset.value;
      setServiceTo(serviceValue);
      if(serviceValue && defaultPrices[serviceValue]!==undefined){
        inputPrice.value='€'+Number(defaultPrices[serviceValue]).toFixed(2);
      }
    });
  });
}

function wireCategoryToggles() {
  if (!serviceDropdown) return;
  const details = serviceDropdown.querySelectorAll('details');
  details.forEach(d => {
    const summary = d.querySelector('summary');
    const toggleIcon = summary.querySelector('.toggle');

    // Initialize: ensure all start as right-arrow
    if (toggleIcon) toggleIcon.classList.add('toggle-right');

    d.addEventListener('toggle', () => {
      // Ensure only one open at a time
      if (d.open) {
        closeAllDetailsExcept(d);
      }

      // Update arrow direction
      details.forEach(other => {
        const icon = other.querySelector('.toggle');
        if (!icon) return;
        if (other.open) {
          icon.classList.remove('toggle-right');
          icon.classList.add('toggle-down');
        } else {
          icon.classList.remove('toggle-down');
          icon.classList.add('toggle-right');
        }
      });
    });
  });
}

function closeAllDetailsExcept(keep){
  serviceDropdown.querySelectorAll('details').forEach(d=>{ if(d!==keep) d.open=false; });
}

/* ====== Time validation ====== */
function toMinutes(t){ const [h,m]=t.split(':').map(n=>parseInt(n,10)||0); return h*60+m; }
function isValidRange(s,e){ return toMinutes(e)>toMinutes(s); }

/* ====== Week navigation ====== */
function shiftWeek(days){
  currentWeekStart.setDate(currentWeekStart.getDate()+days);
  currentWeekStart=getStartOfWeek(currentWeekStart);
  renderGrid(); renderEvents(); updateCalculator();
}

/* ====== Debug ====== */
window._wc={renderGrid,renderEvents,events,saveEvents,loadEvents,updateCalculator};

// ====== Install prompt handling (Android only) ======
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'inline-block';
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('User response to install prompt:', outcome);
    deferredPrompt = null;
    installBtn.style.display = 'none';
  });
}
