
const KEY="myaims-demo-v1";
const seed={
  patients:[
    {id:"P-1001",name:"Sara Ahmed",phone:"+973 3600 1122",status:"Active"},
    {id:"P-1002",name:"Mohammed Ali",phone:"+973 3900 2244",status:"Active"},
    {id:"P-1003",name:"Fatima Hassan",phone:"+973 3300 9988",status:"Active"}
  ],
  appointments:[
    {date:"2026-09-10",time:"09:00",patient:"Sara Ahmed",therapist:"Dr. Eman",service:"Physiotherapy Session",status:"Confirmed"},
    {date:"2026-09-10",time:"11:30",patient:"Mohammed Ali",therapist:"Dr. Hussain",service:"Assessment",status:"Confirmed"}
  ],
  invoices:[
    {no:"INV-2026-001",patient:"Sara Ahmed",date:"2026-09-08",amount:120,paid:80},
    {no:"INV-2026-002",patient:"Mohammed Ali",date:"2026-09-09",amount:95,paid:95},
    {no:"INV-2026-003",patient:"Fatima Hassan",date:"2026-09-09",amount:150,paid:50}
  ],
  receipts:[
    {no:"REC-2026-001",patient:"Sara Ahmed",date:"2026-09-08",method:"BenefitPay",amount:80},
    {no:"REC-2026-002",patient:"Mohammed Ali",date:"2026-09-09",method:"Card",amount:95},
    {no:"REC-2026-003",patient:"Fatima Hassan",date:"2026-09-09",method:"Cash",amount:50}
  ],
  expenses:[
    {date:"2026-09-08",category:"Clinic Supplies",description:"Therapy consumables",amount:22.500},
    {date:"2026-09-09",category:"Professional Fees",description:"Professional service",amount:30.000}
  ]
};
let db=load(), lang="en";
function load(){try{return JSON.parse(localStorage.getItem(KEY))||structuredClone(seed)}catch(e){return JSON.parse(JSON.stringify(seed))}}
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
const money=n=>"BHD "+Number(n||0).toFixed(3);
const sum=(a,k)=>a.reduce((t,x)=>t+Number(x[k]||0),0);
const today=()=>new Date().toISOString().slice(0,10);
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function t(en,ar){return lang==="ar"?ar:en}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1800)}
function render(){
  document.querySelectorAll("[data-en][data-ar]").forEach(el=>el.textContent=el.dataset[lang]);
  document.documentElement.lang=lang;
  document.documentElement.dir=lang==="ar"?"rtl":"ltr";
  languageBtn.textContent=lang==="ar"?"English":"العربية";
  todayChip.textContent=new Intl.DateTimeFormat(lang==="ar"?"ar-BH":"en-GB",{weekday:"short",day:"2-digit",month:"short"}).format(new Date());

  const invoiced=sum(db.invoices,"amount"), collected=sum(db.receipts,"amount"), expenses=sum(db.expenses,"amount");
  const outstanding=db.invoices.reduce((a,x)=>a+Math.max(0,x.amount-x.paid),0);
  kpiPatients.textContent=db.patients.length;kpiAppointments.textContent=db.appointments.length;kpiOutstanding.textContent=money(outstanding);kpiNet.textContent=money(collected-expenses);heroRevenue.textContent=money(collected);
  reportInvoiced.textContent=money(invoiced);reportCollected.textContent=money(collected);reportExpenses.textContent=money(expenses);reportNet.textContent=money(collected-expenses);
  const pct=invoiced?Math.min(100,collected/invoiced*100):0;collectionBar.style.width=pct+"%";collectionText.textContent=t(`Collected ${pct.toFixed(1)}% of invoiced value.`,`تم تحصيل ${pct.toFixed(1)}% من إجمالي قيمة الفواتير.`);

  patientsBody.innerHTML=db.patients.map(p=>`<tr><td>${esc(p.id)}</td><td>${esc(p.name)}</td><td>${esc(p.phone)}</td><td><span class="status">${t("Active","نشط")}</span></td><td>${money(patientBalance(p.name))}</td></tr>`).join("");
  appointmentsBody.innerHTML=db.appointments.map(a=>`<tr><td>${esc(a.date)}</td><td>${esc(a.time)}</td><td>${esc(a.patient)}</td><td>${esc(a.therapist)}</td><td>${esc(a.service)}</td><td><span class="status">${t(a.status,a.status==="Confirmed"?"مؤكد":"مجدول")}</span></td></tr>`).join("");
  invoicesBody.innerHTML=db.invoices.map(i=>`<tr><td>${esc(i.no)}</td><td>${esc(i.patient)}</td><td>${esc(i.date)}</td><td>${money(i.amount)}</td><td>${money(i.paid)}</td><td>${money(i.amount-i.paid)}</td></tr>`).join("");
  receiptsBody.innerHTML=db.receipts.map(r=>`<tr><td>${esc(r.no)}</td><td>${esc(r.patient)}</td><td>${esc(r.date)}</td><td>${esc(r.method)}</td><td>${money(r.amount)}</td></tr>`).join("");
  expensesBody.innerHTML=db.expenses.map(e=>`<tr><td>${esc(e.date)}</td><td>${esc(e.category)}</td><td>${esc(e.description)}</td><td>${money(e.amount)}</td></tr>`).join("");
  dashboardAppointments.innerHTML=db.appointments.slice(-4).reverse().map(a=>`<div class="activity"><div><strong>${esc(a.patient)}</strong><br><small>${esc(a.service)}</small></div><div>${esc(a.date)} · ${esc(a.time)}</div></div>`).join("")||`<p>${t("No appointments yet.","لا توجد مواعيد بعد.")}</p>`;
  recentActivity.innerHTML=[
    ...db.receipts.slice(-2).map(r=>({title:t("Receipt","سند قبض")+" · "+r.patient,value:money(r.amount)})),
    ...db.expenses.slice(-2).map(e=>({title:t("Expense","مصروف")+" · "+e.description,value:"-"+money(e.amount)}))
  ].reverse().map(x=>`<div class="activity"><strong>${esc(x.title)}</strong><span>${esc(x.value)}</span></div>`).join("");
  document.querySelectorAll(".patient-select").forEach(s=>s.innerHTML=`<option value="">${t("Select patient","اختر المريض")}</option>`+db.patients.map(p=>`<option>${esc(p.name)}</option>`).join(""));
}
function patientBalance(name){return db.invoices.filter(i=>i.patient===name).reduce((a,i)=>a+(i.amount-i.paid),0)}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));document.getElementById("page-"+b.dataset.page).classList.add("active")});
document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.open).classList.add("open"));
document.querySelectorAll(".close").forEach(b=>b.onclick=()=>b.closest(".modal").classList.remove("open"));
document.querySelectorAll(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove("open")});
languageBtn.onclick=()=>{lang=lang==="en"?"ar":"en";render()};
resetBtn.onclick=()=>{db=JSON.parse(JSON.stringify(seed));save();render();toast(t("Demo data restored.","تمت إعادة بيانات العرض."))};
patientForm.onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);db.patients.push({id:"P-"+(1000+db.patients.length+1),name:f.get("name"),phone:f.get("phone"),status:"Active"});save();e.target.reset();patientModal.classList.remove("open");render();toast(t("Patient added.","تمت إضافة المريض."))};
appointmentForm.onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);db.appointments.push({patient:f.get("patient"),date:f.get("date"),time:f.get("time"),therapist:f.get("therapist"),service:f.get("service"),status:"Confirmed"});save();e.target.reset();appointmentModal.classList.remove("open");render();toast(t("Appointment saved.","تم حفظ الموعد."))};
invoiceForm.onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);db.invoices.push({no:"INV-2026-"+String(db.invoices.length+1).padStart(3,"0"),patient:f.get("patient"),date:today(),amount:Number(f.get("amount")),paid:0});save();e.target.reset();invoiceModal.classList.remove("open");render();toast(t("Invoice created.","تم إنشاء الفاتورة."))};
receiptForm.onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),patient=f.get("patient"),amount=Number(f.get("amount"));db.receipts.push({no:"REC-2026-"+String(db.receipts.length+1).padStart(3,"0"),patient,date:today(),method:f.get("method"),amount});let rem=amount;for(const inv of db.invoices.filter(i=>i.patient===patient&&i.paid<i.amount)){const use=Math.min(rem,inv.amount-inv.paid);inv.paid+=use;rem-=use;if(rem<=0)break}save();e.target.reset();receiptModal.classList.remove("open");render();toast(t("Receipt recorded.","تم تسجيل السداد."))};
expenseForm.onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);db.expenses.push({date:today(),category:f.get("category"),description:f.get("description"),amount:Number(f.get("amount"))});save();e.target.reset();expenseModal.classList.remove("open");render();toast(t("Expense recorded.","تم تسجيل المصروف."))};
render();
