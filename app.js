const KEY="myaims-demo-v2";
const seed={
  patients:[
    {id:"P-1001",name:"Sara Ahmed",phone:"+973 3600 1122",status:"Active"},
    {id:"P-1002",name:"Mohammed Ali",phone:"+973 3900 2244",status:"Active"},
    {id:"P-1003",name:"Fatima Hassan",phone:"+973 3300 9988",status:"Active"}
  ],
  appointments:[
    {id:"A-001",date:"2026-09-10",time:"09:00",patient:"Sara Ahmed",therapist:"Dr. Eman",service:"Physiotherapy Session",status:"Confirmed"},
    {id:"A-002",date:"2026-09-10",time:"11:30",patient:"Mohammed Ali",therapist:"Dr. Hussain",service:"Assessment",status:"Confirmed"}
  ],
  invoices:[
    {no:"INV-2026-001",patient:"Sara Ahmed",date:"2026-09-08",service:"Physiotherapy Session",amount:120,insuranceCovered:20,paid:0},
    {no:"INV-2026-002",patient:"Mohammed Ali",date:"2026-09-09",service:"Assessment",amount:95,insuranceCovered:0,paid:0},
    {no:"INV-2026-003",patient:"Fatima Hassan",date:"2026-09-09",service:"Rehabilitation Session",amount:150,insuranceCovered:50,paid:0}
  ],
  receipts:[
    {no:"REC-2026-001",patient:"Sara Ahmed",date:"2026-09-08",method:"BenefitPay",amount:80,invoiceNo:"INV-2026-001"},
    {no:"REC-2026-002",patient:"Mohammed Ali",date:"2026-09-09",method:"Card",amount:95,invoiceNo:"INV-2026-002"},
    {no:"REC-2026-003",patient:"Fatima Hassan",date:"2026-09-09",method:"Cash",amount:50,invoiceNo:"INV-2026-003"}
  ],
  expenses:[
    {id:"E-001",date:"2026-09-08",category:"Clinic Supplies",description:"Therapy consumables",amount:22.500},
    {id:"E-002",date:"2026-09-09",category:"Professional Fees",description:"Professional service",amount:30.000}
  ]
};

let db=load(), lang="en";
function clone(v){return JSON.parse(JSON.stringify(v))}
function load(){try{return JSON.parse(localStorage.getItem(KEY))||clone(seed)}catch(e){return clone(seed)}}
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
const money=n=>"BHD "+Number(n||0).toFixed(3);
const sum=(a,k)=>a.reduce((t,x)=>t+Number(x[k]||0),0);
const today=()=>new Date().toISOString().slice(0,10);
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function t(en,ar){return lang==="ar"?ar:en}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1800)}
function invInsurance(inv){return Math.max(0,Math.min(Number(inv.insuranceCovered||0),Number(inv.amount||0)))}
function invPatientShare(inv){return Math.max(0,Number(inv.amount||0)-invInsurance(inv))}
function invBalance(inv){return Math.max(0,invPatientShare(inv)-Number(inv.paid||0))}
function invStatus(inv){const bal=invBalance(inv),share=invPatientShare(inv),paid=Number(inv.paid||0);if(bal<=0.0001)return "PAID";if(paid>0&&paid<share)return "PARTIAL";return "UNPAID"}
function nextNo(prefix,items,field){const year=new Date().getFullYear();const nums=items.map(x=>String(x[field]||"")).filter(x=>x.startsWith(`${prefix}-${year}-`)).map(x=>Number(x.split("-").pop())||0);return `${prefix}-${year}-${String((Math.max(0,...nums)+1)).padStart(3,"0")}`}

function normalize(){
  db.patients=db.patients||[];db.appointments=db.appointments||[];db.invoices=db.invoices||[];db.receipts=db.receipts||[];db.expenses=db.expenses||[];
  db.invoices.forEach(inv=>{if(inv.service==null)inv.service="Rehabilitation Service";if(inv.insuranceCovered==null)inv.insuranceCovered=0;if(inv.paid==null)inv.paid=0});
}

function allocatePayments(){
  db.invoices.forEach(i=>i.paid=0);
  for(const r of db.receipts){
    let rem=Number(r.amount||0);
    if(r.invoiceNo){
      const inv=db.invoices.find(i=>i.no===r.invoiceNo);
      if(inv){const room=invBalance(inv);const use=Math.min(room,rem);inv.paid+=use;rem-=use}
    }
    if(rem>0){
      for(const inv of db.invoices.filter(i=>i.patient===r.patient&&(!r.invoiceNo||i.no!==r.invoiceNo)).sort((a,b)=>a.date.localeCompare(b.date))){
        const room=invBalance(inv),use=Math.min(room,rem);inv.paid+=use;rem-=use;if(rem<=0)break;
      }
    }
  }
}
function patientBalance(name){return db.invoices.filter(i=>i.patient===name).reduce((a,i)=>a+invBalance(i),0)}
function actionButtons(type,idx,extra=""){return `<div class="actions">${extra}<button class="action-btn" onclick="editRow('${type}',${idx})">${t("Edit","تعديل")}</button><button class="action-btn danger" onclick="deleteRow('${type}',${idx})">${t("Delete","حذف")}</button></div>`}

function enhanceInvoiceForm(){
  const form=document.getElementById("invoiceForm");if(!form||form.dataset.enhanced)return;form.dataset.enhanced="1";
  const amountLabel=form.querySelector('input[name="amount"]')?.closest("label");if(!amountLabel)return;
  const service=document.createElement("label");service.innerHTML=`<span data-en="Service / Description" data-ar="الخدمة / البيان">Service / Description</span><input name="service" type="text" value="Physiotherapy Session" required>`;
  const insurance=document.createElement("label");insurance.innerHTML=`<span data-en="Insurance Covered (BHD)" data-ar="تغطية التأمين (د.ب)">Insurance Covered (BHD)</span><input name="insuranceCovered" type="number" min="0" step="0.001" value="0">`;
  amountLabel.parentNode.insertBefore(service,amountLabel);
  amountLabel.parentNode.insertBefore(insurance,amountLabel.nextSibling);
}

function render(){
  normalize();allocatePayments();
  document.querySelectorAll("[data-en][data-ar]").forEach(el=>el.textContent=el.dataset[lang]);document.documentElement.lang=lang;document.documentElement.dir=lang==="ar"?"rtl":"ltr";languageBtn.textContent=lang==="ar"?"English":"العربية";
  todayChip.textContent=new Intl.DateTimeFormat(lang==="ar"?"ar-BH":"en-GB",{weekday:"short",day:"2-digit",month:"short"}).format(new Date());
  const invoiced=sum(db.invoices,"amount"),collected=sum(db.receipts,"amount"),expenses=sum(db.expenses,"amount"),outstanding=db.invoices.reduce((a,x)=>a+invBalance(x),0);
  kpiPatients.textContent=db.patients.length;kpiAppointments.textContent=db.appointments.length;kpiOutstanding.textContent=money(outstanding);kpiNet.textContent=money(collected-expenses);heroRevenue.textContent=money(collected);
  reportInvoiced.textContent=money(invoiced);reportCollected.textContent=money(collected);reportExpenses.textContent=money(expenses);reportNet.textContent=money(collected-expenses);const pct=invoiced?Math.min(100,collected/invoiced*100):0;collectionBar.style.width=pct+"%";collectionText.textContent=t(`Collected ${pct.toFixed(1)}% of invoiced value.`,`تم تحصيل ${pct.toFixed(1)}% من إجمالي قيمة الفواتير.`);
  patientsBody.innerHTML=db.patients.map((p,i)=>`<tr><td>${esc(p.id)}</td><td>${esc(p.name)}</td><td>${esc(p.phone)}</td><td><span class="status">${t("Active","نشط")}</span></td><td>${money(patientBalance(p.name))}</td><td>${actionButtons("patient",i)}</td></tr>`).join("");
  appointmentsBody.innerHTML=db.appointments.map((a,i)=>`<tr><td>${esc(a.date)}</td><td>${esc(a.time)}</td><td>${esc(a.patient)}</td><td>${esc(a.therapist)}</td><td>${esc(a.service)}</td><td><span class="status">${t(a.status,a.status==="Confirmed"?"مؤكد":"مجدول")}</span></td><td>${actionButtons("appointment",i)}</td></tr>`).join("");
  invoicesBody.innerHTML=db.invoices.map((inv,i)=>{const bal=invBalance(inv),status=invStatus(inv),pay=bal>0?`<button class="action-btn pay" onclick="payInvoice(${i})">${t("Pay","سداد")}</button>`:"";const cls=status==="PAID"?"paid":status==="PARTIAL"?"due":"due";const arStatus=status==="PAID"?"مدفوعة":status==="PARTIAL"?"مدفوعة جزئيًا":"غير مدفوعة";return `<tr><td>${esc(inv.no)}<br><span class="invoice-status ${cls}">${t(status,arStatus)}</span></td><td>${esc(inv.patient)}<br><small>${esc(inv.service||"")}</small></td><td>${esc(inv.date)}</td><td>${money(inv.amount)}<br><small>${t("Insurance","التأمين")}: ${money(invInsurance(inv))}<br>${t("Patient share","حصة المريض")}: ${money(invPatientShare(inv))}</small></td><td>${money(inv.paid)}</td><td>${money(bal)}</td><td><div class="actions"><button class="action-btn" onclick="printInvoice(${i})">${t("Open / Print","فتح / طباعة")}</button>${pay}<button class="action-btn" onclick="editRow('invoice',${i})">${t("Edit","تعديل")}</button><button class="action-btn danger" onclick="deleteRow('invoice',${i})">${t("Delete","حذف")}</button></div></td></tr>`}).join("");
  receiptsBody.innerHTML=db.receipts.map((r,i)=>`<tr><td>${esc(r.no)}</td><td>${esc(r.patient)}${r.invoiceNo?`<br><small>${esc(r.invoiceNo)}</small>`:""}</td><td>${esc(r.date)}</td><td>${esc(r.method)}</td><td>${money(r.amount)}</td><td>${actionButtons("receipt",i)}</td></tr>`).join("");
  expensesBody.innerHTML=db.expenses.map((e,i)=>`<tr><td>${esc(e.date)}</td><td>${esc(e.category)}</td><td>${esc(e.description)}</td><td>${money(e.amount)}</td><td>${actionButtons("expense",i)}</td></tr>`).join("");
  dashboardAppointments.innerHTML=db.appointments.slice(-4).reverse().map(a=>`<div class="activity"><div><strong>${esc(a.patient)}</strong><br><small>${esc(a.service)}</small></div><div>${esc(a.date)} · ${esc(a.time)}</div></div>`).join("")||`<p>${t("No appointments yet.","لا توجد مواعيد بعد.")}</p>`;
  recentActivity.innerHTML=[...db.receipts.slice(-2).map(r=>({title:t("Receipt","سند قبض")+" · "+r.patient,value:money(r.amount)})),...db.expenses.slice(-2).map(e=>({title:t("Expense","مصروف")+" · "+e.description,value:"-"+money(e.amount)}))].reverse().map(x=>`<div class="activity"><strong>${esc(x.title)}</strong><span>${esc(x.value)}</span></div>`).join("");
  document.querySelectorAll(".patient-select").forEach(s=>s.innerHTML=`<option value="">${t("Select patient","اختر المريض")}</option>`+db.patients.map(p=>`<option>${esc(p.name)}</option>`).join(""));save();
}

window.editRow=function(type,i){
  if(type==="patient"){const p=db.patients[i],old=p.name,n=prompt(t("Patient name","اسم المريض"),p.name);if(!n)return;const ph=prompt(t("Phone","الهاتف"),p.phone);p.name=n;p.phone=ph||p.phone;db.appointments.forEach(x=>{if(x.patient===old)x.patient=n});db.invoices.forEach(x=>{if(x.patient===old)x.patient=n});db.receipts.forEach(x=>{if(x.patient===old)x.patient=n})}
  if(type==="appointment"){const a=db.appointments[i];a.date=prompt(t("Date YYYY-MM-DD","التاريخ YYYY-MM-DD"),a.date)||a.date;a.time=prompt(t("Time HH:MM","الوقت HH:MM"),a.time)||a.time;a.status=prompt(t("Status","الحالة"),a.status)||a.status}
  if(type==="invoice"){
    const x=db.invoices[i];x.service=prompt(t("Service / Description","الخدمة / البيان"),x.service||"")||x.service;
    const v=prompt(t("Total invoice amount BHD","إجمالي الفاتورة د.ب"),Number(x.amount).toFixed(3));if(v!==null&&!isNaN(v)&&Number(v)>=0)x.amount=Number(v);
    const ins=prompt(t("Insurance covered BHD","تغطية التأمين د.ب"),invInsurance(x).toFixed(3));if(ins!==null&&!isNaN(ins)&&Number(ins)>=0&&Number(ins)<=x.amount)x.insuranceCovered=Number(ins);
  }
  if(type==="receipt"){const x=db.receipts[i],v=prompt(t("Receipt amount BHD","قيمة السداد د.ب"),x.amount.toFixed(3));if(v!==null&&!isNaN(v)&&Number(v)>=0)x.amount=Number(v);x.method=prompt(t("Payment method","طريقة السداد"),x.method)||x.method}
  if(type==="expense"){const x=db.expenses[i];x.description=prompt(t("Description","البيان"),x.description)||x.description;const v=prompt(t("Amount BHD","المبلغ د.ب"),x.amount.toFixed(3));if(v!==null&&!isNaN(v)&&Number(v)>=0)x.amount=Number(v)}
  save();render();toast(t("Updated successfully.","تم التعديل بنجاح."));
}

window.deleteRow=function(type,i){if(!confirm(t("Delete this record?","هل تريد حذف هذا السجل؟")))return;if(type==="patient"){const p=db.patients[i];if(db.invoices.some(x=>x.patient===p.name)||db.receipts.some(x=>x.patient===p.name)||db.appointments.some(x=>x.patient===p.name)){alert(t("Cannot delete a patient with linked transactions.","لا يمكن حذف مريض مرتبط بحركات."));return}db.patients.splice(i,1)}else if(type==="invoice"){if(db.receipts.some(r=>r.invoiceNo===db.invoices[i].no)){alert(t("Delete related receipts first.","احذف سندات القبض المرتبطة أولاً."));return}db.invoices.splice(i,1)}else db[type+"s"].splice(i,1);save();render();toast(t("Deleted.","تم الحذف."))}

window.payInvoice=function(i){
  allocatePayments();const inv=db.invoices[i],bal=invBalance(inv);if(!bal)return;
  const v=prompt(t(`Amount to pay (max ${bal.toFixed(3)})`,`مبلغ السداد (الحد الأقصى ${bal.toFixed(3)})`),bal.toFixed(3));if(v===null)return;
  const amount=Math.min(bal,Math.max(0,Number(v)||0));if(!amount)return;
  const method=prompt(t("Payment method","طريقة السداد"),"BenefitPay")||"BenefitPay";
  db.receipts.push({no:nextNo("REC",db.receipts,"no"),patient:inv.patient,date:today(),method,amount,invoiceNo:inv.no});save();render();toast(t("Payment recorded and linked to invoice.","تم تسجيل السداد وربطه بالفاتورة."));
}

window.printInvoice=function(i){
  allocatePayments();const inv=db.invoices[i],insurance=invInsurance(inv),share=invPatientShare(inv),bal=invBalance(inv),status=invStatus(inv),patient=db.patients.find(p=>p.name===inv.patient)||{};
  const statusAr=status==="PAID"?"مدفوعة":status==="PARTIAL"?"مدفوعة جزئيًا":"غير مدفوعة";
  const w=window.open("","_blank","width=980,height=950");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.no)}</title><style>
  *{box-sizing:border-box}body{font-family:Arial,Tahoma,sans-serif;margin:0;background:#eef3f4;color:#17343c}.sheet{width:210mm;min-height:297mm;margin:12px auto;background:white;padding:18mm 16mm;position:relative}.head{display:flex;justify-content:space-between;gap:25px;border-bottom:3px solid #0c6174;padding-bottom:15px}.brand{font-size:32px;font-weight:800;color:#0c6174;letter-spacing:.3px}.clinic{font-size:13px;line-height:1.7}.ar{direction:rtl}.invoice-title{text-align:right}.invoice-title h1{margin:0;color:#0c6174;font-size:30px}.muted{color:#70838a;font-size:12px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:24px 0}.card{border:1px solid #dbe6e8;border-radius:12px;padding:14px;background:#fbfdfd}.label{font-size:11px;color:#70838a;text-transform:uppercase;letter-spacing:.5px}.value{font-weight:700;margin-top:5px}.service{margin-top:18px;border:1px solid #dbe6e8;border-radius:12px;overflow:hidden}.service .row{display:grid;grid-template-columns:1fr 150px;padding:13px 15px;border-bottom:1px solid #e7edef}.service .row:last-child{border-bottom:none}.service .headrow{background:#0c6174;color:white;font-weight:700}.totals{width:48%;margin-left:auto;margin-top:22px}.totals .row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #e7edef}.totals .grand{font-size:18px;font-weight:800;color:#0c6174}.status{display:inline-block;margin-top:22px;padding:10px 16px;border-radius:999px;font-weight:800;background:${status==='PAID'?'#e8f7f1':status==='PARTIAL'?'#fff6df':'#fdeeee'};color:${status==='PAID'?'#21866f':status==='PARTIAL'?'#9a6b1e':'#a83c3c'}}.footer{position:absolute;left:16mm;right:16mm;bottom:16mm;border-top:1px solid #dbe6e8;padding-top:10px;color:#70838a;font-size:11px;display:flex;justify-content:space-between}.toolbar{width:210mm;margin:10px auto;display:flex;gap:8px;justify-content:flex-end}.toolbar button{border:0;border-radius:9px;padding:10px 15px;cursor:pointer;font-weight:700}.print{background:#0c6174;color:white}.close{background:white;color:#17343c}@media print{body{background:white}.sheet{margin:0;width:auto;min-height:297mm;box-shadow:none}.toolbar{display:none}@page{size:A4;margin:0}}
  </style></head><body><div class="toolbar"><button class="close" onclick="window.close()">Close</button><button class="print" onclick="window.print()">Print / Save PDF</button></div><div class="sheet">
  <div class="head"><div><div class="brand">myAIMS</div><div class="clinic">MY AIMS REHABILITATION CENTER W.L.L<br><span class="ar">مركز أهدافي للتأهيل ذ.م.م</span><br>Kingdom of Bahrain</div></div><div class="invoice-title"><h1>INVOICE</h1><div class="ar">فاتورة</div><p><b>${esc(inv.no)}</b><br><span class="muted">${esc(inv.date)}</span></p></div></div>
  <div class="meta"><div class="card"><div class="label">Patient / المريض</div><div class="value">${esc(inv.patient)}</div><div class="muted">${esc(patient.phone||"")}</div></div><div class="card"><div class="label">Invoice Status / حالة الفاتورة</div><div class="value">${esc(status)} · <span class="ar">${statusAr}</span></div></div></div>
  <div class="service"><div class="row headrow"><div>Service / الخدمة</div><div>Amount / المبلغ</div></div><div class="row"><div><b>${esc(inv.service||"Rehabilitation Service")}</b></div><div>${money(inv.amount)}</div></div></div>
  <div class="totals"><div class="row"><span>Total / الإجمالي</span><b>${money(inv.amount)}</b></div><div class="row"><span>Insurance Covered / تغطية التأمين</span><b>${money(insurance)}</b></div><div class="row"><span>Patient Share / حصة المريض</span><b>${money(share)}</b></div><div class="row"><span>Paid / المدفوع</span><b>${money(inv.paid)}</b></div><div class="row grand"><span>Balance / الرصيد</span><span>${money(bal)}</span></div></div>
  <div class="status">${esc(status)} · <span class="ar">${statusAr}</span></div>
  <div class="footer"><span>myAIMS Rehabilitation Center</span><span>Demo System · APEX-ORAIBI</span></div></div></body></html>`);w.document.close();
}

document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));document.getElementById("page-"+b.dataset.page).classList.add("active")});
document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.open).classList.add("open"));document.querySelectorAll(".close").forEach(b=>b.onclick=()=>b.closest(".modal").classList.remove("open"));document.querySelectorAll(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove("open")});
languageBtn.onclick=()=>{lang=lang==="en"?"ar":"en";render()};resetBtn.onclick=()=>{db=clone(seed);save();render();toast(t("Demo data restored.","تمت إعادة بيانات العرض."))};
patientForm.onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);db.patients.push({id:"P-"+(1000+db.patients.length+1),name:f.get("name"),phone:f.get("phone"),status:"Active"});save();e.target.reset();patientModal.classList.remove("open");render();toast(t("Patient added.","تمت إضافة المريض."))};
appointmentForm.onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);db.appointments.push({id:"A-"+String(db.appointments.length+1).padStart(3,"0"),patient:f.get("patient"),date:f.get("date"),time:f.get("time"),therapist:f.get("therapist"),service:f.get("service"),status:"Confirmed"});save();e.target.reset();appointmentModal.classList.remove("open");render();toast(t("Appointment saved.","تم حفظ الموعد."))};
invoiceForm.onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),amount=Number(f.get("amount")||0),insurance=Math.max(0,Math.min(Number(f.get("insuranceCovered")||0),amount));db.invoices.push({no:nextNo("INV",db.invoices,"no"),patient:f.get("patient"),date:today(),service:f.get("service")||"Rehabilitation Service",amount,insuranceCovered:insurance,paid:0});save();e.target.reset();const ins=e.target.querySelector('[name="insuranceCovered"]');if(ins)ins.value="0";invoiceModal.classList.remove("open");render();toast(t("Invoice created.","تم إنشاء الفاتورة."))};
receiptForm.onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);db.receipts.push({no:nextNo("REC",db.receipts,"no"),patient:f.get("patient"),date:today(),method:f.get("method"),amount:Number(f.get("amount"))});save();e.target.reset();receiptModal.classList.remove("open");render();toast(t("Receipt recorded.","تم تسجيل السداد."))};
expenseForm.onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);db.expenses.push({id:"E-"+String(db.expenses.length+1).padStart(3,"0"),date:today(),category:f.get("category"),description:f.get("description"),amount:Number(f.get("amount"))});save();e.target.reset();expenseModal.classList.remove("open");render();toast(t("Expense recorded.","تم تسجيل المصروف."))};


// ===== V4: Advanced monthly reports & management summary =====
let reportPeriod="all";
function monthKey(d){return String(d||"").slice(0,7)}
function reportMonths(){
  return [...new Set([
    ...db.invoices.map(x=>monthKey(x.date)),
    ...db.receipts.map(x=>monthKey(x.date)),
    ...db.expenses.map(x=>monthKey(x.date)),
    ...db.appointments.map(x=>monthKey(x.date))
  ].filter(Boolean))].sort().reverse();
}
function periodLabel(v){
  if(v==="all") return t("All periods","جميع الفترات");
  const [y,m]=v.split("-").map(Number);
  return new Intl.DateTimeFormat(lang==="ar"?"ar-BH":"en-GB",{month:"long",year:"numeric"}).format(new Date(y,m-1,1));
}
function enhanceReports(){
  const page=document.getElementById("page-reports"); if(!page) return;
  let box=document.getElementById("advancedReportTools");
  if(!box){
    box=document.createElement("article");
    box.id="advancedReportTools"; box.className="panel";
    box.style.marginBottom="18px";
    box.innerHTML=`<div class="panel-head" style="gap:12px;align-items:center;flex-wrap:wrap">
      <div><h3 data-en="Monthly Management Report" data-ar="التقرير الإداري الشهري">Monthly Management Report</h3><small id="reportPeriodLabel"></small></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-inline-start:auto">
        <select id="reportPeriodSelect" style="padding:10px 12px;border:1px solid #dbe6e8;border-radius:10px;background:#fff"></select>
        <button id="printMonthlyReport" class="primary" type="button" data-en="Print Report" data-ar="طباعة التقرير">Print Report</button>
      </div>
    </div>
    <div id="monthlyReportSummary"></div>`;
    const existing=page.querySelector(".kpi-grid");
    page.insertBefore(box,existing||page.firstChild.nextSibling);
    box.querySelector("#reportPeriodSelect").addEventListener("change",e=>{reportPeriod=e.target.value;renderAdvancedReports()});
    box.querySelector("#printMonthlyReport").addEventListener("click",printMonthlyReport);
  }
  const sel=document.getElementById("reportPeriodSelect");
  const old=reportPeriod;
  sel.innerHTML=`<option value="all">${t("All periods","جميع الفترات")}</option>`+reportMonths().map(m=>`<option value="${m}">${esc(periodLabel(m))}</option>`).join("");
  if([...sel.options].some(o=>o.value===old)) sel.value=old; else {reportPeriod="all";sel.value="all"}
  box.querySelectorAll("[data-en][data-ar]").forEach(el=>el.textContent=el.dataset[lang]);
}
function getPeriodData(){
  const match=x=>reportPeriod==="all"||monthKey(x.date)===reportPeriod;
  return {
    invoices:db.invoices.filter(match),receipts:db.receipts.filter(match),expenses:db.expenses.filter(match),appointments:db.appointments.filter(match)
  };
}
function renderAdvancedReports(){
  enhanceReports(); allocatePayments();
  const d=getPeriodData();
  const invoiced=sum(d.invoices,"amount"),collected=sum(d.receipts,"amount"),expenses=sum(d.expenses,"amount");
  const outstanding=d.invoices.reduce((a,x)=>a+invBalance(x),0),net=collected-expenses;
  reportInvoiced.textContent=money(invoiced);reportCollected.textContent=money(collected);reportExpenses.textContent=money(expenses);reportNet.textContent=money(net);
  const pct=invoiced?Math.min(100,collected/invoiced*100):0;collectionBar.style.width=pct+"%";collectionText.textContent=t(`Collected ${pct.toFixed(1)}% of invoiced value.`,`تم تحصيل ${pct.toFixed(1)}% من إجمالي قيمة الفواتير.`);
  document.getElementById("reportPeriodLabel").textContent=periodLabel(reportPeriod);
  const paid=d.invoices.filter(x=>invStatus(x)==="PAID").length,partial=d.invoices.filter(x=>invStatus(x)==="PARTIAL").length,unpaid=d.invoices.filter(x=>invStatus(x)==="UNPAID").length;
  const byMethod={};d.receipts.forEach(r=>byMethod[r.method]=(byMethod[r.method]||0)+Number(r.amount||0));
  const methods=Object.entries(byMethod).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${money(v)}</td></tr>`).join("")||`<tr><td colspan="2">${t("No receipts in this period","لا توجد سندات قبض في هذه الفترة")}</td></tr>`;
  const topExpenses=[...d.expenses].sort((a,b)=>b.amount-a.amount).slice(0,5).map(x=>`<tr><td>${esc(x.category)}</td><td>${esc(x.description)}</td><td>${money(x.amount)}</td></tr>`).join("")||`<tr><td colspan="3">${t("No expenses in this period","لا توجد مصروفات في هذه الفترة")}</td></tr>`;
  document.getElementById("monthlyReportSummary").innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0">
      <div class="card" style="padding:13px"><small>${t("Appointments","المواعيد")}</small><strong style="display:block;font-size:22px">${d.appointments.length}</strong></div>
      <div class="card" style="padding:13px"><small>${t("Outstanding","المستحق")}</small><strong style="display:block;font-size:20px">${money(outstanding)}</strong></div>
      <div class="card" style="padding:13px"><small>${t("Paid invoices","فواتير مدفوعة")}</small><strong style="display:block;font-size:22px">${paid}</strong></div>
      <div class="card" style="padding:13px"><small>${t("Partial / Unpaid","جزئي / غير مدفوع")}</small><strong style="display:block;font-size:22px">${partial} / ${unpaid}</strong></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">
      <div><h4>${t("Collections by payment method","التحصيل حسب طريقة السداد")}</h4><div class="table-wrap"><table><thead><tr><th>${t("Method","الطريقة")}</th><th>${t("Amount","المبلغ")}</th></tr></thead><tbody>${methods}</tbody></table></div></div>
      <div><h4>${t("Largest expenses","أعلى المصروفات")}</h4><div class="table-wrap"><table><thead><tr><th>${t("Category","التصنيف")}</th><th>${t("Description","البيان")}</th><th>${t("Amount","المبلغ")}</th></tr></thead><tbody>${topExpenses}</tbody></table></div></div>
    </div>`;
}
function printMonthlyReport(){
  allocatePayments();const d=getPeriodData();const invoiced=sum(d.invoices,"amount"),collected=sum(d.receipts,"amount"),expenses=sum(d.expenses,"amount"),outstanding=d.invoices.reduce((a,x)=>a+invBalance(x),0),net=collected-expenses;
  const invRows=d.invoices.map(x=>`<tr><td>${esc(x.no)}</td><td>${esc(x.patient)}</td><td>${esc(x.date)}</td><td>${money(x.amount)}</td><td>${money(invBalance(x))}</td><td>${esc(invStatus(x))}</td></tr>`).join("")||`<tr><td colspan="6">-</td></tr>`;
  const w=window.open("","_blank","width=1050,height=950");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>myAIMS Report</title><style>*{box-sizing:border-box}body{font-family:Arial,Tahoma,sans-serif;margin:0;background:#edf2f3;color:#17343c}.sheet{width:210mm;min-height:297mm;margin:10px auto;background:#fff;padding:16mm}.head{display:flex;justify-content:space-between;border-bottom:3px solid #0c6174;padding-bottom:12px}.brand{font-size:28px;font-weight:800;color:#0c6174}.ar{direction:rtl}.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:18px 0}.kpi{border:1px solid #dbe6e8;border-radius:10px;padding:11px}.kpi small{color:#70838a}.kpi b{display:block;margin-top:5px;font-size:16px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{padding:8px;border-bottom:1px solid #e4ebed;text-align:left}th{background:#f2f7f8}.toolbar{width:210mm;margin:10px auto;text-align:right}.toolbar button{border:0;border-radius:8px;padding:10px 14px;background:#0c6174;color:#fff;font-weight:700;cursor:pointer}.footer{margin-top:25px;padding-top:9px;border-top:1px solid #dbe6e8;font-size:10px;color:#70838a;display:flex;justify-content:space-between}@media print{body{background:#fff}.toolbar{display:none}.sheet{margin:0;width:auto}@page{size:A4;margin:0}}</style></head><body><div class="toolbar"><button onclick="window.print()">Print / Save PDF</button></div><div class="sheet"><div class="head"><div><div class="brand">myAIMS</div><small>MY AIMS REHABILITATION CENTER W.L.L</small><br><small class="ar">مركز أهدافي للتأهيل ذ.م.م</small></div><div style="text-align:right"><h2 style="margin:0">MANAGEMENT REPORT</h2><div class="ar">التقرير الإداري</div><b>${esc(periodLabel(reportPeriod))}</b></div></div><div class="kpis"><div class="kpi"><small>Invoiced / الفواتير</small><b>${money(invoiced)}</b></div><div class="kpi"><small>Collected / التحصيل</small><b>${money(collected)}</b></div><div class="kpi"><small>Expenses / المصروفات</small><b>${money(expenses)}</b></div><div class="kpi"><small>Net Cash / صافي النقد</small><b>${money(net)}</b></div><div class="kpi"><small>Outstanding / المستحق</small><b>${money(outstanding)}</b></div><div class="kpi"><small>Appointments / المواعيد</small><b>${d.appointments.length}</b></div></div><h3>Invoice Summary / ملخص الفواتير</h3><table><thead><tr><th>No.</th><th>Patient</th><th>Date</th><th>Total</th><th>Balance</th><th>Status</th></tr></thead><tbody>${invRows}</tbody></table><div class="footer"><span>myAIMS Rehabilitation Center</span><span>Demo System · APEX-ORAIBI</span></div></div></body></html>`);w.document.close();
}

const renderV3=render;
render=function(){renderV3();enhanceReports();renderAdvancedReports();};

enhanceInvoiceForm();
normalize();
render();

// ===== V5: Executive Dashboard =====
function dashMonthKey(d){return String(d||"").slice(0,7)}
function dashCurrentMonth(){return today().slice(0,7)}
function dashMonthLabel(key){
  const [y,m]=key.split("-").map(Number);
  return new Intl.DateTimeFormat(lang==="ar"?"ar-BH":"en-GB",{month:"short"}).format(new Date(y,m-1,1));
}
function dashLastMonths(count=6){
  const base=new Date();const out=[];
  for(let i=count-1;i>=0;i--){const d=new Date(base.getFullYear(),base.getMonth()-i,1);out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`)}
  return out;
}
function ensureExecutiveDashboard(){
  const page=document.getElementById("page-dashboard");if(!page)return;
  let box=document.getElementById("executiveDashboard");
  if(!box){
    box=document.createElement("section");box.id="executiveDashboard";box.style.margin="18px 0";
    const grid=page.querySelector(".grid-2");page.insertBefore(box,grid||null);
  }
}
function renderExecutiveDashboard(){
  ensureExecutiveDashboard();allocatePayments();
  const box=document.getElementById("executiveDashboard");if(!box)return;
  const cm=dashCurrentMonth(),match=x=>dashMonthKey(x.date)===cm;
  const monthInvoices=db.invoices.filter(match),monthReceipts=db.receipts.filter(match),monthExpenses=db.expenses.filter(match),monthAppointments=db.appointments.filter(match);
  const monthInvoiced=sum(monthInvoices,"amount"),monthCollected=sum(monthReceipts,"amount"),monthExpensesTotal=sum(monthExpenses,"amount"),monthOutstanding=monthInvoices.reduce((a,x)=>a+invBalance(x),0),monthNet=monthCollected-monthExpensesTotal;
  const months=dashLastMonths(6);const series=months.map(m=>({m,collections:db.receipts.filter(x=>dashMonthKey(x.date)===m).reduce((a,x)=>a+Number(x.amount||0),0),expenses:db.expenses.filter(x=>dashMonthKey(x.date)===m).reduce((a,x)=>a+Number(x.amount||0),0)}));
  const max=Math.max(1,...series.flatMap(x=>[x.collections,x.expenses]));
  const bars=series.map(x=>`<div style="display:flex;flex-direction:column;align-items:center;gap:6px;min-width:48px;flex:1"><div style="height:150px;width:100%;display:flex;align-items:flex-end;justify-content:center;gap:5px;border-bottom:1px solid #dfe8ea"><span title="${t("Collections","التحصيل")}: ${money(x.collections)}" style="width:28%;max-width:18px;height:${Math.max(x.collections?5:0,x.collections/max*140)}px;background:#0c6174;border-radius:5px 5px 0 0;display:block"></span><span title="${t("Expenses","المصروفات")}: ${money(x.expenses)}" style="width:28%;max-width:18px;height:${Math.max(x.expenses?5:0,x.expenses/max*140)}px;background:#d7a94b;border-radius:5px 5px 0 0;display:block"></span></div><small>${esc(dashMonthLabel(x.m))}</small></div>`).join("");
  const upcoming=[...db.appointments].filter(a=>a.date>=today()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,5);
  const recent=[...db.receipts].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const paid=monthInvoices.filter(x=>invStatus(x)==="PAID").length,partial=monthInvoices.filter(x=>invStatus(x)==="PARTIAL").length,unpaid=monthInvoices.filter(x=>invStatus(x)==="UNPAID").length;
  const conversion=monthInvoiced?Math.min(100,(monthCollected/monthInvoiced)*100):0;
  box.innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;margin-bottom:16px">
      <article class="kpi"><span>${t("Month Invoiced","فواتير الشهر")}</span><strong>${money(monthInvoiced)}</strong><small>${monthInvoices.length} ${t("invoices","فاتورة")}</small></article>
      <article class="kpi"><span>${t("Month Collections","تحصيل الشهر")}</span><strong>${money(monthCollected)}</strong><small>${conversion.toFixed(1)}% ${t("collection rate","نسبة التحصيل")}</small></article>
      <article class="kpi"><span>${t("Month Outstanding","مستحق الشهر")}</span><strong>${money(monthOutstanding)}</strong><small>${partial} ${t("partial","جزئي")} · ${unpaid} ${t("unpaid","غير مدفوع")}</small></article>
      <article class="kpi"><span>${t("Month Expenses","مصروفات الشهر")}</span><strong>${money(monthExpensesTotal)}</strong><small>${monthExpenses.length} ${t("entries","حركة")}</small></article>
      <article class="kpi"><span>${t("Month Net Cash","صافي الشهر")}</span><strong>${money(monthNet)}</strong><small>${t("Collections less expenses","التحصيل ناقص المصروفات")}</small></article>
      <article class="kpi"><span>${t("Month Appointments","مواعيد الشهر")}</span><strong>${monthAppointments.length}</strong><small>${paid} ${t("paid invoices","فواتير مدفوعة")}</small></article>
    </div>
    <div style="display:grid;grid-template-columns:minmax(0,1.45fr) minmax(260px,.8fr);gap:16px">
      <article class="panel"><div class="panel-head"><div><h3>${t("Six-Month Cash Movement","الحركة النقدية لستة أشهر")}</h3><small>${t("Collections vs expenses","التحصيل مقابل المصروفات")}</small></div><div style="display:flex;gap:12px;font-size:12px"><span>● ${t("Collections","التحصيل")}</span><span style="color:#9b7428">● ${t("Expenses","المصروفات")}</span></div></div><div style="display:flex;gap:10px;align-items:flex-end;padding-top:12px;overflow-x:auto">${bars}</div></article>
      <article class="panel"><div class="panel-head"><h3>${t("Invoice Health","حالة الفواتير")}</h3></div><div style="display:grid;gap:10px"><div class="activity"><strong>${t("Paid","مدفوعة")}</strong><span>${paid}</span></div><div class="activity"><strong>${t("Partial","مدفوعة جزئيًا")}</strong><span>${partial}</span></div><div class="activity"><strong>${t("Unpaid","غير مدفوعة")}</strong><span>${unpaid}</span></div><div class="activity"><strong>${t("Collection rate","نسبة التحصيل")}</strong><span>${conversion.toFixed(1)}%</span></div></div></article>
    </div>`;
  const appBox=document.getElementById("dashboardAppointments");if(appBox)appBox.innerHTML=upcoming.map(a=>`<div class="activity"><div><strong>${esc(a.patient)}</strong><br><small>${esc(a.service)} · ${esc(a.therapist)}</small></div><div>${esc(a.date)} · ${esc(a.time)}</div></div>`).join("")||`<p>${t("No upcoming appointments.","لا توجد مواعيد قادمة.")}</p>`;
  const activity=document.getElementById("recentActivity");if(activity)activity.innerHTML=recent.map(r=>`<div class="activity"><div><strong>${t("Payment","سداد")} · ${esc(r.patient)}</strong><br><small>${esc(r.no)}${r.invoiceNo?" · "+esc(r.invoiceNo):""}</small></div><span>${money(r.amount)}</span></div>`).join("")||`<p>${t("No recent payments.","لا توجد تحصيلات حديثة.")}</p>`;
  if(typeof heroRevenue!=="undefined"&&heroRevenue)heroRevenue.textContent=money(monthCollected);
}

const renderV4=render;
render=function(){renderV4();renderExecutiveDashboard();};
render();

// ===== V6: Patient 360° Profile =====
function patientFinancials(name){
  allocatePayments();
  const invoices=db.invoices.filter(x=>x.patient===name);
  const receipts=db.receipts.filter(x=>x.patient===name);
  const appointments=db.appointments.filter(x=>x.patient===name);
  return {
    invoices,receipts,appointments,
    invoiced:invoices.reduce((a,x)=>a+Number(x.amount||0),0),
    patientShare:invoices.reduce((a,x)=>a+invPatientShare(x),0),
    collected:receipts.reduce((a,x)=>a+Number(x.amount||0),0),
    outstanding:invoices.reduce((a,x)=>a+invBalance(x),0)
  };
}
function patientProfileModal(){
  let modal=document.getElementById("patientProfile360");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="patientProfile360";
  modal.style.cssText="position:fixed;inset:0;background:rgba(10,31,37,.55);z-index:9999;display:none;align-items:center;justify-content:center;padding:18px;";
  modal.innerHTML=`<div style="width:min(1050px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.24)">
    <div style="position:sticky;top:0;background:#fff;z-index:3;display:flex;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid #e2eaec">
      <div style="width:42px;height:42px;border-radius:50%;background:#e9f4f6;color:#0c6174;display:grid;place-items:center;font-weight:800">360°</div>
      <div style="flex:1"><h2 id="p360Name" style="margin:0;font-size:22px"></h2><small id="p360Meta" style="color:#70838a"></small></div>
      <button id="p360Print" class="action-btn" type="button">${t("Print Statement","طباعة كشف المريض")}</button>
      <button id="p360Close" class="action-btn danger" type="button">${t("Close","إغلاق")}</button>
    </div>
    <div id="p360Body" style="padding:20px"></div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click",e=>{if(e.target===modal)modal.style.display="none"});
  modal.querySelector("#p360Close").onclick=()=>modal.style.display="none";
  return modal;
}
window.openPatientProfile=function(i){
  const p=db.patients[i];if(!p)return;
  const f=patientFinancials(p.name),modal=patientProfileModal();
  modal.dataset.patientIndex=String(i);
  modal.querySelector("#p360Name").textContent=p.name;
  modal.querySelector("#p360Meta").textContent=`${p.id} · ${p.phone||"-"}`;
  const next=[...f.appointments].filter(a=>a.date>=today()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))[0];
  const invRows=[...f.invoices].sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<tr><td>${esc(x.no)}</td><td>${esc(x.date)}</td><td>${esc(x.service||"")}</td><td>${money(invPatientShare(x))}</td><td>${money(x.paid)}</td><td>${money(invBalance(x))}</td><td>${t(invStatus(x),invStatus(x)==="PAID"?"مدفوعة":invStatus(x)==="PARTIAL"?"جزئية":"غير مدفوعة")}</td></tr>`).join("")||`<tr><td colspan="7">${t("No invoices","لا توجد فواتير")}</td></tr>`;
  const recRows=[...f.receipts].sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<tr><td>${esc(x.no)}</td><td>${esc(x.date)}</td><td>${esc(x.method)}</td><td>${esc(x.invoiceNo||"-")}</td><td>${money(x.amount)}</td></tr>`).join("")||`<tr><td colspan="5">${t("No payments","لا توجد سندات قبض")}</td></tr>`;
  const appRows=[...f.appointments].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.time)}</td><td>${esc(x.service)}</td><td>${esc(x.therapist)}</td><td>${esc(x.status)}</td></tr>`).join("")||`<tr><td colspan="5">${t("No appointments","لا توجد مواعيد")}</td></tr>`;
  modal.querySelector("#p360Body").innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:10px;margin-bottom:16px">
      <div class="card" style="padding:14px"><small>${t("Total invoiced","إجمالي الفواتير")}</small><strong style="display:block;font-size:20px;margin-top:5px">${money(f.invoiced)}</strong></div>
      <div class="card" style="padding:14px"><small>${t("Patient share","حصة المريض")}</small><strong style="display:block;font-size:20px;margin-top:5px">${money(f.patientShare)}</strong></div>
      <div class="card" style="padding:14px"><small>${t("Collected","المحصل")}</small><strong style="display:block;font-size:20px;margin-top:5px">${money(f.collected)}</strong></div>
      <div class="card" style="padding:14px"><small>${t("Outstanding","الرصيد المستحق")}</small><strong style="display:block;font-size:20px;margin-top:5px">${money(f.outstanding)}</strong></div>
      <div class="card" style="padding:14px"><small>${t("Appointments","المواعيد")}</small><strong style="display:block;font-size:20px;margin-top:5px">${f.appointments.length}</strong></div>
      <div class="card" style="padding:14px"><small>${t("Next appointment","الموعد القادم")}</small><strong style="display:block;font-size:14px;margin-top:5px">${next?esc(next.date+" · "+next.time):"-"}</strong></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">
      <button class="primary" type="button" onclick="patientQuickAction(${i},'appointment')">${t("+ Appointment","+ موعد")}</button>
      <button class="primary" type="button" onclick="patientQuickAction(${i},'invoice')">${t("+ Invoice","+ فاتورة")}</button>
      ${f.outstanding>0?`<button class="primary" type="button" onclick="patientQuickAction(${i},'payment')">${t("Record Payment","تسجيل سداد")}</button>`:""}
    </div>
    <h3 style="margin:10px 0">${t("Invoices","الفواتير")}</h3><div class="table-wrap"><table><thead><tr><th>${t("Invoice","الفاتورة")}</th><th>${t("Date","التاريخ")}</th><th>${t("Service","الخدمة")}</th><th>${t("Patient Share","حصة المريض")}</th><th>${t("Paid","المدفوع")}</th><th>${t("Balance","الرصيد")}</th><th>${t("Status","الحالة")}</th></tr></thead><tbody>${invRows}</tbody></table></div>
    <h3 style="margin:20px 0 10px">${t("Payments","المدفوعات")}</h3><div class="table-wrap"><table><thead><tr><th>${t("Receipt","السند")}</th><th>${t("Date","التاريخ")}</th><th>${t("Method","الطريقة")}</th><th>${t("Invoice","الفاتورة")}</th><th>${t("Amount","المبلغ")}</th></tr></thead><tbody>${recRows}</tbody></table></div>
    <h3 style="margin:20px 0 10px">${t("Appointments","المواعيد")}</h3><div class="table-wrap"><table><thead><tr><th>${t("Date","التاريخ")}</th><th>${t("Time","الوقت")}</th><th>${t("Service","الخدمة")}</th><th>${t("Therapist","المعالج")}</th><th>${t("Status","الحالة")}</th></tr></thead><tbody>${appRows}</tbody></table></div>`;
  modal.querySelector("#p360Print").textContent=t("Print Statement","طباعة كشف المريض");
  modal.querySelector("#p360Close").textContent=t("Close","إغلاق");
  modal.querySelector("#p360Print").onclick=()=>printPatientStatement(i);
  modal.style.display="flex";
};
window.patientQuickAction=function(i,type){
  const p=db.patients[i];if(!p)return;
  const modal=document.getElementById("patientProfile360");if(modal)modal.style.display="none";
  if(type==="appointment"){
    if(typeof appointmentModal!=="undefined"&&appointmentModal){appointmentModal.classList.add("open");const s=appointmentModal.querySelector('.patient-select');if(s)s.value=p.name;}
  }else if(type==="invoice"){
    if(typeof invoiceModal!=="undefined"&&invoiceModal){invoiceModal.classList.add("open");const s=invoiceModal.querySelector('.patient-select');if(s)s.value=p.name;}
  }else if(type==="payment"){
    allocatePayments();const idx=db.invoices.findIndex(x=>x.patient===p.name&&invBalance(x)>0);if(idx>=0)payInvoice(idx);
  }
};
window.printPatientStatement=function(i){
  const p=db.patients[i];if(!p)return;const f=patientFinancials(p.name);
  const invRows=[...f.invoices].sort((a,b)=>a.date.localeCompare(b.date)).map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.no)}</td><td>${esc(x.service||"")}</td><td>${money(invPatientShare(x))}</td><td>${money(x.paid)}</td><td>${money(invBalance(x))}</td></tr>`).join("")||`<tr><td colspan="6">-</td></tr>`;
  const recRows=[...f.receipts].sort((a,b)=>a.date.localeCompare(b.date)).map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.no)}</td><td>${esc(x.method)}</td><td>${money(x.amount)}</td></tr>`).join("")||`<tr><td colspan="4">-</td></tr>`;
  const w=window.open("","_blank","width=1000,height=950");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(p.id)} - Patient Statement</title><style>*{box-sizing:border-box}body{font-family:Arial,Tahoma,sans-serif;margin:0;background:#eef3f4;color:#17343c}.sheet{width:210mm;min-height:297mm;margin:10px auto;background:#fff;padding:16mm}.head{display:flex;justify-content:space-between;border-bottom:3px solid #0c6174;padding-bottom:12px}.brand{font-size:28px;font-weight:800;color:#0c6174}.ar{direction:rtl}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:18px 0}.box{border:1px solid #dbe6e8;border-radius:9px;padding:10px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}.kpi{border:1px solid #dbe6e8;border-radius:9px;padding:10px}.kpi small{color:#70838a}.kpi b{display:block;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:16px}th,td{padding:7px;border-bottom:1px solid #e5ecee;text-align:left}th{background:#f2f7f8}.toolbar{width:210mm;margin:10px auto;text-align:right}.toolbar button{border:0;border-radius:8px;padding:10px 14px;background:#0c6174;color:#fff;font-weight:700}.footer{margin-top:25px;border-top:1px solid #dbe6e8;padding-top:8px;font-size:10px;color:#70838a;display:flex;justify-content:space-between}@media print{body{background:#fff}.toolbar{display:none}.sheet{margin:0;width:auto}@page{size:A4;margin:0}}</style></head><body><div class="toolbar"><button onclick="window.print()">Print / Save PDF</button></div><div class="sheet"><div class="head"><div><div class="brand">myAIMS</div><small>MY AIMS REHABILITATION CENTER W.L.L</small><br><small class="ar">مركز أهدافي للتأهيل ذ.م.م</small></div><div style="text-align:right"><h2 style="margin:0">PATIENT STATEMENT</h2><div class="ar">كشف حساب المريض</div></div></div><div class="meta"><div class="box"><small>Patient / المريض</small><br><b>${esc(p.name)}</b></div><div class="box"><small>Patient ID / رقم المريض</small><br><b>${esc(p.id)}</b></div><div class="box"><small>Phone / الهاتف</small><br><b>${esc(p.phone||"-")}</b></div><div class="box"><small>Statement Date / تاريخ الكشف</small><br><b>${esc(today())}</b></div></div><div class="kpis"><div class="kpi"><small>Patient Share / حصة المريض</small><b>${money(f.patientShare)}</b></div><div class="kpi"><small>Collected / المحصل</small><b>${money(f.collected)}</b></div><div class="kpi"><small>Outstanding / المستحق</small><b>${money(f.outstanding)}</b></div><div class="kpi"><small>Appointments / المواعيد</small><b>${f.appointments.length}</b></div></div><h3>Invoices / الفواتير</h3><table><thead><tr><th>Date</th><th>Invoice</th><th>Service</th><th>Patient Share</th><th>Paid</th><th>Balance</th></tr></thead><tbody>${invRows}</tbody></table><h3>Payments / المدفوعات</h3><table><thead><tr><th>Date</th><th>Receipt</th><th>Method</th><th>Amount</th></tr></thead><tbody>${recRows}</tbody></table><div class="footer"><span>myAIMS Rehabilitation Center</span><span>Demo System · APEX-ORAIBI</span></div></div></body></html>`);w.document.close();
};
function enhancePatientListV6(){
  const body=document.getElementById("patientsBody");if(!body)return;
  body.innerHTML=db.patients.map((p,i)=>`<tr><td>${esc(p.id)}</td><td><button onclick="openPatientProfile(${i})" style="border:0;background:none;padding:0;color:#0c6174;font-weight:800;cursor:pointer;text-decoration:underline;text-underline-offset:3px">${esc(p.name)}</button></td><td>${esc(p.phone)}</td><td><span class="status">${t("Active","نشط")}</span></td><td>${money(patientBalance(p.name))}</td><td><div class="actions"><button class="action-btn" onclick="openPatientProfile(${i})">${t("Profile","الملف")}</button><button class="action-btn" onclick="editRow('patient',${i})">${t("Edit","تعديل")}</button><button class="action-btn danger" onclick="deleteRow('patient',${i})">${t("Delete","حذف")}</button></div></td></tr>`).join("");
}
const renderV5=render;
render=function(){renderV5();enhancePatientListV6();};
render();


/* =========================
   myAIMS V7 - Appointment Workflow Enhancements
   ========================= */
(function () {
  const APPT_STATUSES = ['Scheduled','Confirmed','Completed','Cancelled','No Show'];

  function ensureAppointmentFields() {
    try {
      const state = window.state || window.appState || null;
      if (!state || !Array.isArray(state.appointments)) return;
      state.appointments = state.appointments.map(a => ({
        ...a,
        status: a.status || 'Scheduled'
      }));
      if (typeof window.saveState === 'function') window.saveState();
    } catch (e) {}
  }

  function getAppointmentsSafe() {
    const state = window.state || window.appState || {};
    return Array.isArray(state.appointments) ? state.appointments : [];
  }

  window.setAppointmentStatus = function(id, status) {
    const state = window.state || window.appState || {};
    if (!Array.isArray(state.appointments)) return;
    const appt = state.appointments.find(a => String(a.id) === String(id));
    if (!appt) return;
    appt.status = APPT_STATUSES.includes(status) ? status : 'Scheduled';
    if (typeof window.saveState === 'function') window.saveState();
    if (typeof window.renderAppointments === 'function') window.renderAppointments();
    if (typeof window.renderDashboard === 'function') window.renderDashboard();
  };

  window.hasAppointmentConflict = function(date, time, excludeId) {
    return getAppointmentsSafe().some(a =>
      String(a.id) !== String(excludeId || '') &&
      a.date === date &&
      a.time === time &&
      !['Cancelled','No Show'].includes(a.status || 'Scheduled')
    );
  };

  window.getTodaysAppointments = function() {
    const today = new Date().toISOString().slice(0,10);
    return getAppointmentsSafe()
      .filter(a => a.date === today)
      .sort((a,b) => String(a.time || '').localeCompare(String(b.time || '')));
  };

  window.getAppointmentStatusBadge = function(status) {
    const s = status || 'Scheduled';
    return `<span class="status-badge status-${s.toLowerCase().replace(/\s+/g,'-')}">${s}</span>`;
  };

  window.createInvoiceFromAppointment = function(id) {
    const appt = getAppointmentsSafe().find(a => String(a.id) === String(id));
    if (!appt) return;
    try {
      if (typeof window.navigate === 'function') window.navigate('billing');
      else if (typeof window.showSection === 'function') window.showSection('billing');
    } catch(e) {}
    setTimeout(() => {
      const patientField = document.querySelector('[name="patient"], [name="patientId"], #invoicePatient');
      const serviceField = document.querySelector('[name="service"], #invoiceService');
      if (patientField) patientField.value = appt.patientId || appt.patient || '';
      if (serviceField && appt.service) serviceField.value = appt.service;
    }, 100);
  };

  const originalRenderAppointments = window.renderAppointments;
  if (typeof originalRenderAppointments === 'function') {
    window.renderAppointments = function() {
      originalRenderAppointments();
      enhanceAppointmentRows();
    };
  }

  function enhanceAppointmentRows() {
    ensureAppointmentFields();
    const appointments = getAppointmentsSafe();

    appointments.forEach(a => {
      const selectors = [
        `[data-appointment-id="${a.id}"]`,
        `tr[data-id="${a.id}"]`,
        `#appointment-${a.id}`
      ];
      let row = null;
      for (const s of selectors) {
        row = document.querySelector(s);
        if (row) break;
      }
      if (!row || row.dataset.v7Enhanced === '1') return;

      row.dataset.v7Enhanced = '1';

      const cell = document.createElement('div');
      cell.className = 'appt-v7-actions';
      cell.innerHTML = `
        <select onchange="setAppointmentStatus('${a.id}', this.value)" class="appt-status-select">
          ${APPT_STATUSES.map(s => `<option value="${s}" ${s === (a.status || 'Scheduled') ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-sm" onclick="createInvoiceFromAppointment('${a.id}')">Create Invoice</button>
      `;
      row.appendChild(cell);
    });
  }

  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (!form) return;
    const txt = ((form.id || '') + ' ' + (form.className || '')).toLowerCase();
    if (!txt.includes('appointment')) return;

    const dateField = form.querySelector('[name="date"], #appointmentDate');
    const timeField = form.querySelector('[name="time"], #appointmentTime');
    const idField = form.querySelector('[name="id"], [name="appointmentId"]');

    if (dateField && timeField && window.hasAppointmentConflict(dateField.value, timeField.value, idField ? idField.value : '')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      alert('There is already an active appointment at the same date and time.');
      return false;
    }
  }, true);

  function injectV7Styles() {
    if (document.getElementById('myaims-v7-style')) return;
    const style = document.createElement('style');
    style.id = 'myaims-v7-style';
    style.textContent = `
      .appt-v7-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
      .appt-status-select{padding:7px 10px;border:1px solid #d9dfe7;border-radius:8px;background:#fff}
      .status-badge{display:inline-block;padding:4px 9px;border-radius:999px;font-size:12px;font-weight:700}
      .status-scheduled{background:#eef4ff}
      .status-confirmed{background:#eaf8ef}
      .status-completed{background:#e8f7f1}
      .status-cancelled{background:#fdeeee}
      .status-no-show{background:#f3f3f3}
      @media (max-width:700px){.appt-v7-actions{align-items:stretch}.appt-status-select,.appt-v7-actions .btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function initV7() {
    injectV7Styles();
    ensureAppointmentFields();
    setTimeout(enhanceAppointmentRows, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV7);
  } else {
    initV7();
  }
})();


/* =========================
   myAIMS V8 - Insurance & Claims Demo
   ========================= */
(function () {
  const getState = () => window.state || window.appState || {};
  const save = () => { if (typeof window.saveState === 'function') window.saveState(); };

  function ensureInsuranceFields() {
    const s = getState();
    if (Array.isArray(s.patients)) {
      s.patients = s.patients.map(p => ({
        ...p,
        insuranceCompany: p.insuranceCompany || '',
        policyNumber: p.policyNumber || '',
        memberId: p.memberId || ''
      }));
    }
    if (Array.isArray(s.invoices)) {
      s.invoices = s.invoices.map(i => ({
        ...i,
        claimNumber: i.claimNumber || ('CLM-' + String(i.id || Date.now()).replace(/\D/g,'').slice(-6)),
        claimStatus: i.claimStatus || (Number(i.insuranceCovered || 0) > 0 ? 'Pending' : 'N/A'),
        insurancePaid: Number(i.insurancePaid || 0)
      }));
    }
    save();
  }

  window.setClaimStatus = function(invoiceId, status) {
    const s = getState();
    const inv = (s.invoices || []).find(x => String(x.id) === String(invoiceId));
    if (!inv) return;
    inv.claimStatus = status;
    save();
    if (typeof window.renderBilling === 'function') window.renderBilling();
    if (typeof window.renderReports === 'function') window.renderReports();
  };

  window.recordInsurancePayment = function(invoiceId) {
    const s = getState();
    const inv = (s.invoices || []).find(x => String(x.id) === String(invoiceId));
    if (!inv) return;
    const covered = Number(inv.insuranceCovered || 0);
    const already = Number(inv.insurancePaid || 0);
    const remaining = Math.max(0, covered - already);
    if (!remaining) {
      alert('No outstanding insurance amount.');
      return;
    }
    const raw = prompt('Insurance payment amount (BHD):', remaining.toFixed(3));
    if (raw === null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining + 0.0001) {
      alert('Please enter a valid amount.');
      return;
    }
    inv.insurancePaid = already + amount;
    inv.claimStatus = inv.insurancePaid + 0.0001 >= covered ? 'Paid' : 'Partially Paid';
    save();
    if (typeof window.renderBilling === 'function') window.renderBilling();
    if (typeof window.renderDashboard === 'function') window.renderDashboard();
    if (typeof window.renderReports === 'function') window.renderReports();
  };

  window.getInsuranceSummary = function() {
    const invoices = getState().invoices || [];
    return invoices.reduce((a, i) => {
      const covered = Number(i.insuranceCovered || 0);
      const paid = Number(i.insurancePaid || 0);
      a.claimed += covered;
      a.received += paid;
      a.outstanding += Math.max(0, covered - paid);
      if (covered > 0) a.claims += 1;
      return a;
    }, {claims:0, claimed:0, received:0, outstanding:0});
  };

  function injectInsurancePanel() {
    const billing = document.querySelector('#billing, [data-page="billing"], .billing-page');
    if (!billing || document.getElementById('insurance-claims-panel')) return;
    const box = document.createElement('section');
    box.id = 'insurance-claims-panel';
    box.className = 'v8-panel';
    const sm = window.getInsuranceSummary();
    box.innerHTML = `
      <div class="v8-head"><div><strong>Insurance Claims</strong><small>Claims & insurer receivables</small></div></div>
      <div class="v8-cards">
        <div><span>Claims</span><b>${sm.claims}</b></div>
        <div><span>Claimed</span><b>${sm.claimed.toFixed(3)} BHD</b></div>
        <div><span>Received</span><b>${sm.received.toFixed(3)} BHD</b></div>
        <div><span>Outstanding</span><b>${sm.outstanding.toFixed(3)} BHD</b></div>
      </div>`;
    billing.prepend(box);
  }

  function enhanceInvoiceRows() {
    const invoices = getState().invoices || [];
    invoices.filter(i => Number(i.insuranceCovered || 0) > 0).forEach(inv => {
      const row = document.querySelector(`[data-invoice-id="${inv.id}"], tr[data-id="${inv.id}"], #invoice-${inv.id}`);
      if (!row || row.dataset.v8Insurance === '1') return;
      row.dataset.v8Insurance = '1';
      const wrap = document.createElement('div');
      wrap.className = 'v8-claim-actions';
      wrap.innerHTML = `
        <span class="v8-claim-no">${inv.claimNumber}</span>
        <select onchange="setClaimStatus('${inv.id}',this.value)">
          ${['Pending','Submitted','Approved','Rejected','Partially Paid','Paid'].map(s =>
            `<option ${s === inv.claimStatus ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-sm" onclick="recordInsurancePayment('${inv.id}')">Insurance Payment</button>`;
      row.appendChild(wrap);
    });
  }

  function injectStyles() {
    if (document.getElementById('myaims-v8-style')) return;
    const st = document.createElement('style');
    st.id = 'myaims-v8-style';
    st.textContent = `
      .v8-panel{background:#fff;border:1px solid #e6e9ef;border-radius:14px;padding:16px;margin:0 0 18px}
      .v8-head{display:flex;justify-content:space-between;margin-bottom:12px}
      .v8-head small{display:block;opacity:.65;margin-top:3px}
      .v8-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .v8-cards>div{border:1px solid #edf0f4;border-radius:11px;padding:12px}
      .v8-cards span{display:block;font-size:12px;opacity:.65;margin-bottom:5px}
      .v8-cards b{font-size:16px}
      .v8-claim-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:8px}
      .v8-claim-actions select{padding:7px;border:1px solid #d9dfe7;border-radius:8px;background:#fff}
      .v8-claim-no{font-size:12px;font-weight:700;padding:5px 8px;border-radius:8px;background:#f3f6fa}
      @media(max-width:760px){.v8-cards{grid-template-columns:1fr 1fr}.v8-claim-actions select,.v8-claim-actions .btn{width:100%}}
    `;
    document.head.appendChild(st);
  }

  function refreshV8() {
    ensureInsuranceFields();
    injectInsurancePanel();
    enhanceInvoiceRows();
  }

  const oldBilling = window.renderBilling;
  if (typeof oldBilling === 'function') {
    window.renderBilling = function() {
      oldBilling.apply(this, arguments);
      setTimeout(() => { injectInsurancePanel(); enhanceInvoiceRows(); }, 30);
    };
  }

  function init() {
    injectStyles();
    ensureInsuranceFields();
    setTimeout(refreshV8, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


/* =========================
   myAIMS V9 - Daily & Monthly Closing / Cash Closing
   ========================= */
(function () {
  const getState = () => window.state || window.appState || {};
  const save = () => { if (typeof window.saveState === 'function') window.saveState(); };

  function toNum(v){ const n = Number(v || 0); return Number.isFinite(n) ? n : 0; }
  function fmt(v){ return toNum(v).toFixed(3) + ' BHD'; }
  function today(){ return new Date().toISOString().slice(0,10); }

  function ensureClosingState(){
    const s = getState();
    if (!Array.isArray(s.cashClosings)) s.cashClosings = [];
    save();
  }

  function receiptDate(r){
    return r.date || r.paymentDate || r.createdAt?.slice?.(0,10) || '';
  }

  function expenseDate(e){
    return e.date || e.expenseDate || e.createdAt?.slice?.(0,10) || '';
  }

  function receiptAmount(r){
    return toNum(r.amount || r.paidAmount || r.total);
  }

  function expenseAmount(e){
    return toNum(e.amount || e.total);
  }

  window.getClosingSummary = function(dateStr){
    const s = getState();
    const date = dateStr || today();

    const receipts = (s.receipts || s.payments || []).filter(r => receiptDate(r) === date);
    const expenses = (s.expenses || []).filter(e => expenseDate(e) === date);

    const byMethod = {};
    receipts.forEach(r => {
      const m = r.method || r.paymentMethod || 'Other';
      byMethod[m] = (byMethod[m] || 0) + receiptAmount(r);
    });

    const totalReceipts = receipts.reduce((a,r)=>a+receiptAmount(r),0);
    const totalExpenses = expenses.reduce((a,e)=>a+expenseAmount(e),0);

    return {
      date,
      totalReceipts,
      totalExpenses,
      netCash: totalReceipts - totalExpenses,
      receiptCount: receipts.length,
      expenseCount: expenses.length,
      byMethod
    };
  };

  window.saveCashClosing = function(dateStr){
    ensureClosingState();
    const s = getState();
    const sm = window.getClosingSummary(dateStr);

    const openingRaw = prompt('Opening cash balance (BHD):', '0.000');
    if (openingRaw === null) return;
    const opening = toNum(openingRaw);

    const countedRaw = prompt('Counted cash at closing (BHD):', (opening + sm.netCash).toFixed(3));
    if (countedRaw === null) return;
    const counted = toNum(countedRaw);

    const expected = opening + sm.netCash;
    const variance = counted - expected;

    const existing = s.cashClosings.find(x => x.date === sm.date);
    const record = {
      id: existing?.id || ('CLOSE-' + Date.now()),
      date: sm.date,
      openingCash: opening,
      receipts: sm.totalReceipts,
      expenses: sm.totalExpenses,
      expectedCash: expected,
      countedCash: counted,
      variance,
      closedAt: new Date().toISOString()
    };

    if (existing) Object.assign(existing, record);
    else s.cashClosings.push(record);

    save();
    alert('Cash closing saved successfully.');
    renderClosingPanel();
  };

  window.printCashClosing = function(dateStr){
    const sm = window.getClosingSummary(dateStr);
    const s = getState();
    const close = (s.cashClosings || []).find(x => x.date === sm.date);

    const methods = Object.entries(sm.byMethod)
      .map(([k,v]) => `<tr><td>${k}</td><td>${fmt(v)}</td></tr>`)
      .join('') || `<tr><td colspan="2">No receipts</td></tr>`;

    const html = `
    <html><head><title>Cash Closing ${sm.date}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:28px;color:#222}
      h1{font-size:22px;margin-bottom:4px}
      .muted{color:#666;font-size:12px}
      table{width:100%;border-collapse:collapse;margin-top:18px}
      td,th{border:1px solid #ddd;padding:9px;text-align:left}
      .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:18px}
      .card{border:1px solid #ddd;border-radius:10px;padding:12px}
      .card span{display:block;color:#666;font-size:12px}
      .card b{font-size:17px}
      .variance{font-size:18px;font-weight:700}
    </style></head><body>
      <h1>MY AIMS REHABILITATION CENTER W.L.L</h1>
      <div class="muted">Daily Cash Closing Report — ${sm.date}</div>

      <div class="grid">
        <div class="card"><span>Total Receipts</span><b>${fmt(sm.totalReceipts)}</b></div>
        <div class="card"><span>Total Expenses</span><b>${fmt(sm.totalExpenses)}</b></div>
        <div class="card"><span>Net Cash Movement</span><b>${fmt(sm.netCash)}</b></div>
        <div class="card"><span>Transactions</span><b>${sm.receiptCount + sm.expenseCount}</b></div>
      </div>

      <h3>Receipts by Payment Method</h3>
      <table><thead><tr><th>Method</th><th>Amount</th></tr></thead><tbody>${methods}</tbody></table>

      ${close ? `
      <h3>Cash Reconciliation</h3>
      <table>
        <tr><th>Opening Cash</th><td>${fmt(close.openingCash)}</td></tr>
        <tr><th>Expected Cash</th><td>${fmt(close.expectedCash)}</td></tr>
        <tr><th>Counted Cash</th><td>${fmt(close.countedCash)}</td></tr>
        <tr><th>Variance</th><td class="variance">${fmt(close.variance)}</td></tr>
      </table>` : ''}
    </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(()=>w.print(), 250);
  };

  window.getMonthlyClosingSummary = function(monthStr){
    const s = getState();
    const month = monthStr || today().slice(0,7);
    const receipts = (s.receipts || s.payments || []).filter(r => receiptDate(r).startsWith(month));
    const expenses = (s.expenses || []).filter(e => expenseDate(e).startsWith(month));

    const totalReceipts = receipts.reduce((a,r)=>a+receiptAmount(r),0);
    const totalExpenses = expenses.reduce((a,e)=>a+expenseAmount(e),0);

    return {
      month,
      totalReceipts,
      totalExpenses,
      net: totalReceipts-totalExpenses,
      receiptCount: receipts.length,
      expenseCount: expenses.length
    };
  };

  function renderClosingPanel(){
    ensureClosingState();
    const reports = document.querySelector('#reports, [data-page="reports"], .reports-page');
    if (!reports) return;

    let box = document.getElementById('cash-closing-panel');
    if (!box){
      box = document.createElement('section');
      box.id = 'cash-closing-panel';
      box.className = 'v9-panel';
      reports.prepend(box);
    }

    const sm = window.getClosingSummary(today());
    const close = (getState().cashClosings || []).find(x => x.date === sm.date);
    const month = window.getMonthlyClosingSummary(today().slice(0,7));

    box.innerHTML = `
      <div class="v9-head">
        <div><strong>Cash Closing</strong><small>Daily & monthly closing control</small></div>
        <div class="v9-actions">
          <button class="btn btn-sm" onclick="saveCashClosing('${sm.date}')">Close Today</button>
          <button class="btn btn-sm" onclick="printCashClosing('${sm.date}')">Print Closing</button>
        </div>
      </div>

      <div class="v9-cards">
        <div><span>Today's Receipts</span><b>${fmt(sm.totalReceipts)}</b></div>
        <div><span>Today's Expenses</span><b>${fmt(sm.totalExpenses)}</b></div>
        <div><span>Today's Net</span><b>${fmt(sm.netCash)}</b></div>
        <div><span>Closing Status</span><b>${close ? 'Closed' : 'Open'}</b></div>
      </div>

      <div class="v9-month">
        <strong>Current Month</strong>
        <span>Receipts: ${fmt(month.totalReceipts)}</span>
        <span>Expenses: ${fmt(month.totalExpenses)}</span>
        <span>Net: ${fmt(month.net)}</span>
      </div>

      ${close ? `
      <div class="v9-recon">
        <span>Opening: <b>${fmt(close.openingCash)}</b></span>
        <span>Expected: <b>${fmt(close.expectedCash)}</b></span>
        <span>Counted: <b>${fmt(close.countedCash)}</b></span>
        <span>Variance: <b>${fmt(close.variance)}</b></span>
      </div>` : ''}
    `;
  }

  function injectStyles(){
    if (document.getElementById('myaims-v9-style')) return;
    const st = document.createElement('style');
    st.id = 'myaims-v9-style';
    st.textContent = `
      .v9-panel{background:#fff;border:1px solid #e6e9ef;border-radius:14px;padding:16px;margin-bottom:18px}
      .v9-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
      .v9-head small{display:block;opacity:.65;margin-top:3px}
      .v9-actions{display:flex;gap:8px;flex-wrap:wrap}
      .v9-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .v9-cards>div{border:1px solid #edf0f4;border-radius:11px;padding:12px}
      .v9-cards span{display:block;font-size:12px;opacity:.65;margin-bottom:5px}
      .v9-cards b{font-size:16px}
      .v9-month,.v9-recon{display:flex;gap:18px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid #edf0f4}
      @media(max-width:760px){
        .v9-cards{grid-template-columns:1fr 1fr}
        .v9-head{align-items:flex-start;flex-direction:column}
        .v9-actions,.v9-actions .btn{width:100%}
      }
    `;
    document.head.appendChild(st);
  }

  const oldReports = window.renderReports;
  if (typeof oldReports === 'function'){
    window.renderReports = function(){
      oldReports.apply(this, arguments);
      setTimeout(renderClosingPanel, 40);
    };
  }

  function init(){
    injectStyles();
    ensureClosingState();
    setTimeout(renderClosingPanel, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


/* =========================
   myAIMS V10 - Smart Alerts & Follow-up Center
   ========================= */
(function () {
  const getState = () => window.state || window.appState || {};
  const save = () => { if (typeof window.saveState === 'function') window.saveState(); };

  function n(v){ const x = Number(v || 0); return Number.isFinite(x) ? x : 0; }
  function dateOnly(v){ return String(v || '').slice(0,10); }
  function today(){ return new Date().toISOString().slice(0,10); }
  function daysBetween(a,b){
    const da = new Date(a + 'T00:00:00'), db = new Date(b + 'T00:00:00');
    return Math.round((db-da)/86400000);
  }

  function receipts(){
    const s = getState();
    return s.receipts || s.payments || [];
  }

  function patientName(id){
    const s = getState();
    const p = (s.patients || []).find(x => String(x.id) === String(id));
    return p ? (p.name || p.fullName || p.patientName || 'Patient') : 'Patient';
  }

  window.getSmartAlerts = function(){
    const s = getState();
    const alerts = [];
    const t = today();

    (s.invoices || []).forEach(inv => {
      const total = n(inv.patientShare || inv.amount || inv.total);
      const paid = n(inv.paidAmount || inv.receivedAmount || 0);
      const due = Math.max(0, total - paid);
      const d = dateOnly(inv.date || inv.invoiceDate || inv.createdAt);
      if (due > 0 && d && daysBetween(d, t) >= 7) {
        alerts.push({
          type:'overdue',
          priority: daysBetween(d,t) >= 30 ? 'high' : 'medium',
          title:'Overdue invoice',
          text:`${patientName(inv.patientId || inv.patient)} — ${due.toFixed(3)} BHD outstanding`,
          ref: inv.id
        });
      }

      const covered = n(inv.insuranceCovered);
      const insurerPaid = n(inv.insurancePaid);
      if (covered > insurerPaid && ['Pending','Submitted','Approved','Partially Paid'].includes(inv.claimStatus || 'Pending')) {
        alerts.push({
          type:'insurance',
          priority:'medium',
          title:'Insurance follow-up',
          text:`${inv.claimNumber || 'Claim'} — ${(covered-insurerPaid).toFixed(3)} BHD pending`,
          ref: inv.id
        });
      }
    });

    (s.appointments || []).forEach(a => {
      const d = dateOnly(a.date);
      const diff = d ? daysBetween(t,d) : 999;
      if (diff >= 0 && diff <= 1 && !['Completed','Cancelled','No Show'].includes(a.status || 'Scheduled')) {
        alerts.push({
          type:'appointment',
          priority: diff === 0 ? 'high' : 'low',
          title: diff === 0 ? 'Appointment today' : 'Appointment tomorrow',
          text:`${patientName(a.patientId || a.patient)}${a.time ? ' — ' + a.time : ''}`,
          ref: a.id
        });
      }
    });

    (s.cashClosings || []).forEach(c => {
      if (Math.abs(n(c.variance)) > 0.001) {
        alerts.push({
          type:'cash',
          priority:'high',
          title:'Cash variance',
          text:`${c.date} — variance ${n(c.variance).toFixed(3)} BHD`,
          ref:c.id
        });
      }
    });

    return alerts.sort((a,b)=>{
      const p = {high:0,medium:1,low:2};
      return (p[a.priority]||9)-(p[b.priority]||9);
    });
  };

  function renderAlerts(){
    const dash = document.querySelector('#dashboard, [data-page="dashboard"], .dashboard-page');
    if (!dash) return;

    let panel = document.getElementById('smart-alerts-panel');
    if (!panel){
      panel = document.createElement('section');
      panel.id = 'smart-alerts-panel';
      panel.className = 'v10-panel';
      dash.prepend(panel);
    }

    const alerts = window.getSmartAlerts();
    panel.innerHTML = `
      <div class="v10-head">
        <div>
          <strong>Smart Alerts & Follow-up</strong>
          <small>Items that need attention</small>
        </div>
        <span class="v10-count">${alerts.length}</span>
      </div>
      <div class="v10-list">
        ${alerts.length ? alerts.slice(0,8).map(a => `
          <div class="v10-item ${a.priority}">
            <div class="v10-dot"></div>
            <div class="v10-copy">
              <b>${a.title}</b>
              <span>${a.text}</span>
            </div>
          </div>
        `).join('') : `
          <div class="v10-empty">No urgent follow-up items.</div>
        `}
      </div>
    `;
  }

  function injectStyles(){
    if (document.getElementById('myaims-v10-style')) return;
    const st = document.createElement('style');
    st.id = 'myaims-v10-style';
    st.textContent = `
      .v10-panel{background:#fff;border:1px solid #e6e9ef;border-radius:14px;padding:16px;margin-bottom:18px}
      .v10-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
      .v10-head small{display:block;opacity:.65;margin-top:3px}
      .v10-count{min-width:32px;height:32px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:#f3f6fa;font-weight:700}
      .v10-list{display:grid;gap:8px}
      .v10-item{display:flex;gap:10px;align-items:flex-start;border:1px solid #edf0f4;border-radius:11px;padding:11px}
      .v10-dot{width:9px;height:9px;border-radius:999px;background:#999;margin-top:5px;flex:0 0 auto}
      .v10-item.high .v10-dot{background:#c0392b}
      .v10-item.medium .v10-dot{background:#d68910}
      .v10-item.low .v10-dot{background:#2980b9}
      .v10-copy b{display:block;font-size:13px;margin-bottom:2px}
      .v10-copy span{font-size:12px;opacity:.75}
      .v10-empty{padding:12px;border:1px dashed #d9dfe7;border-radius:10px;opacity:.65}
    `;
    document.head.appendChild(st);
  }

  const oldDashboard = window.renderDashboard;
  if (typeof oldDashboard === 'function'){
    window.renderDashboard = function(){
      oldDashboard.apply(this, arguments);
      setTimeout(renderAlerts, 30);
    };
  }

  function init(){
    injectStyles();
    setTimeout(renderAlerts, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


/* =========================================================
   myAIMS V11 - SIDEBAR / DASHBOARD LAYOUT FIX
   Fixes V8-V10 panels accidentally rendering inside sidebar
   ========================================================= */
(function () {
  function sidebar() {
    return document.querySelector('aside, .sidebar, #sidebar, .side-nav, nav.sidebar');
  }

  function mainArea() {
    return document.querySelector('main, .main-content, #main-content, .content, #content, .app-main');
  }

  function activePageContainer(name) {
    const main = mainArea();
    if (!main) return null;
    return (
      main.querySelector(`#${name}`) ||
      main.querySelector(`.${name}-page`) ||
      main.querySelector(`[data-page-content="${name}"]`) ||
      main.querySelector(`[data-view="${name}"]`) ||
      main
    );
  }

  function removeBrokenSidebarPanels() {
    const side = sidebar();
    if (!side) return;
    ['insurance-claims-panel','cash-closing-panel','smart-alerts-panel'].forEach(id => {
      const el = side.querySelector('#' + id);
      if (el) el.remove();
    });
  }

  function movePanel(id, pageName) {
    const el = document.getElementById(id);
    if (!el) return;
    const side = sidebar();
    if (side && side.contains(el)) {
      const target = activePageContainer(pageName);
      if (target && target !== side) target.prepend(el);
      else el.remove();
    }
  }

  function normalizeSidebar() {
    const side = sidebar();
    if (!side) return;

    // Never allow dashboard/report cards to affect sidebar width/flow.
    side.querySelectorAll(
      '.v8-panel,.v9-panel,.v10-panel,.v8-cards,.v9-cards,.v10-list,' +
      '.dashboard-card,.metric-card,.chart-card,.report-card'
    ).forEach(el => {
      if (!el.closest('.nav-item') && !el.matches('a,button')) el.remove();
    });
  }

  function repair() {
    removeBrokenSidebarPanels();
    normalizeSidebar();
    movePanel('insurance-claims-panel', 'billing');
    movePanel('cash-closing-panel', 'reports');
    movePanel('smart-alerts-panel', 'dashboard');
  }

  function injectFixCSS() {
    if (document.getElementById('myaims-v11-layout-fix')) return;
    const st = document.createElement('style');
    st.id = 'myaims-v11-layout-fix';
    st.textContent = `
      /* Sidebar must remain a clean navigation column */
      aside, .sidebar, #sidebar, .side-nav, nav.sidebar {
        overflow-x: hidden !important;
        min-width: 228px;
        width: 228px;
        flex: 0 0 228px;
        box-sizing: border-box;
      }

      aside .v8-panel, aside .v9-panel, aside .v10-panel,
      .sidebar .v8-panel, .sidebar .v9-panel, .sidebar .v10-panel,
      #sidebar .v8-panel, #sidebar .v9-panel, #sidebar .v10-panel {
        display: none !important;
      }

      /* Keep navigation rows inside sidebar */
      aside a, aside button, .sidebar a, .sidebar button, #sidebar a, #sidebar button {
        max-width: 100%;
        box-sizing: border-box;
      }

      /* Main workspace must take remaining width only */
      main, .main-content, #main-content, .app-main {
        min-width: 0 !important;
        width: auto;
        flex: 1 1 auto;
        box-sizing: border-box;
      }

      /* Prevent cards from overflowing their grid */
      .v8-panel,.v9-panel,.v10-panel,
      .v8-cards>div,.v9-cards>div {
        min-width: 0;
        max-width: 100%;
        box-sizing: border-box;
      }

      /* Restore clean sidebar nav stacking */
      aside nav, .sidebar nav, #sidebar nav {
        display: flex;
        flex-direction: column;
        width: 100%;
      }

      @media (max-width: 900px) {
        aside, .sidebar, #sidebar, .side-nav, nav.sidebar {
          min-width: 210px;
          width: 210px;
          flex-basis: 210px;
        }
      }

      @media (max-width: 700px) {
        aside, .sidebar, #sidebar, .side-nav, nav.sidebar {
          min-width: 0;
          width: 100%;
          max-width: 100%;
        }
      }
    `;
    document.head.appendChild(st);
  }

  // Override only the panel placement functions from later versions.
  // They now search strictly inside the main workspace.
  window.myaimsSafePanelTarget = activePageContainer;

  function init() {
    injectFixCSS();
    repair();

    // Repair again after page renders/navigation without visible flicker.
    const observer = new MutationObserver(() => {
      clearTimeout(window.__myaimsV11RepairTimer);
      window.__myaimsV11RepairTimer = setTimeout(repair, 20);
    });
    observer.observe(document.body, {childList:true, subtree:true});

    document.addEventListener('click', () => setTimeout(repair, 60), true);
    setTimeout(repair, 250);
    setTimeout(repair, 700);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


/* =========================================================
   myAIMS V12 - NAVIGATION FIX
   Adds Insurance / Cash Closing / Alerts safely to sidebar
   and opens each feature in the MAIN workspace.
   ========================================================= */
(function () {
  const ITEMS = [
    { id:'insurance', label:'Insurance', icon:'♢' },
    { id:'cash-closing', label:'Cash Closing', icon:'▣' },
    { id:'alerts', label:'Alerts', icon:'♧' }
  ];

  function getSidebar() {
    return document.querySelector('aside, .sidebar, #sidebar, .side-nav');
  }

  function getMain() {
    return document.querySelector('main, .main-content, #main-content, .app-main, #content, .content');
  }

  function navContainer() {
    const side = getSidebar();
    if (!side) return null;
    return side.querySelector('nav') || side;
  }

  function findNavByText(text) {
    const nav = navContainer();
    if (!nav) return null;
    return [...nav.querySelectorAll('a,button,[role="button"],.nav-item')]
      .find(x => (x.textContent || '').trim().toLowerCase().includes(text.toLowerCase()));
  }

  function makeNavItem(item) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'v12-nav-item';
    el.dataset.v12Page = item.id;
    el.innerHTML = `<span class="v12-icon">${item.icon}</span><span>${item.label}</span>`;
    el.addEventListener('click', () => openV12Page(item.id));
    return el;
  }

  function installNav() {
    const nav = navContainer();
    if (!nav) return;

    ITEMS.forEach(item => {
      if (nav.querySelector(`[data-v12-page="${item.id}"]`)) return;

      const node = makeNavItem(item);

      if (item.id === 'insurance') {
        const reports = findNavByText('Reports');
        if (reports) nav.insertBefore(node, reports);
        else nav.appendChild(node);
      } else if (item.id === 'cash-closing') {
        const settings = findNavByText('Settings');
        if (settings) nav.insertBefore(node, settings);
        else nav.appendChild(node);
      } else if (item.id === 'alerts') {
        const settings = findNavByText('Settings');
        if (settings) nav.insertBefore(node, settings);
        else nav.appendChild(node);
      }
    });
  }

  function hideMainChildren() {
    const main = getMain();
    if (!main) return;
    [...main.children].forEach(el => {
      if (el.id !== 'v12-feature-host') {
        if (!el.dataset.v12Display) el.dataset.v12Display = el.style.display || '';
        el.style.display = 'none';
      }
    });
  }

  function restoreMainChildren() {
    const main = getMain();
    if (!main) return;
    [...main.children].forEach(el => {
      if (el.id !== 'v12-feature-host') {
        el.style.display = el.dataset.v12Display || '';
      }
    });
    const host = document.getElementById('v12-feature-host');
    if (host) host.style.display = 'none';
  }

  function host() {
    const main = getMain();
    if (!main) return null;
    let h = document.getElementById('v12-feature-host');
    if (!h) {
      h = document.createElement('div');
      h.id = 'v12-feature-host';
      h.className = 'v12-feature-host';
      main.appendChild(h);
    }
    h.style.display = 'block';
    return h;
  }

  function setActive(id) {
    document.querySelectorAll('[data-v12-page]').forEach(x =>
      x.classList.toggle('active', x.dataset.v12Page === id)
    );
  }

  function insuranceHTML() {
    let sm = {claims:0, claimed:0, received:0, outstanding:0};
    try {
      if (typeof window.getInsuranceSummary === 'function') sm = window.getInsuranceSummary();
    } catch(e){}

    return `
      <div class="v12-title">
        <div><small>FINANCE & INSURANCE</small><h2>Insurance Claims</h2>
        <p>Track insurer claims, collections and outstanding balances.</p></div>
      </div>
      <div class="v12-grid">
        <div class="v12-card"><span>Total Claims</span><b>${sm.claims || 0}</b></div>
        <div class="v12-card"><span>Claimed</span><b>BHD ${Number(sm.claimed||0).toFixed(3)}</b></div>
        <div class="v12-card"><span>Received</span><b>BHD ${Number(sm.received||0).toFixed(3)}</b></div>
        <div class="v12-card"><span>Outstanding</span><b>BHD ${Number(sm.outstanding||0).toFixed(3)}</b></div>
      </div>
      <div class="v12-white">
        <h3>Claims Overview</h3>
        <p class="v12-muted">Insurance-related invoices and claim statuses are managed from Billing. This page provides the financial overview for follow-up.</p>
      </div>`;
  }

  function cashHTML() {
    const date = new Date().toISOString().slice(0,10);
    let sm = {totalReceipts:0,totalExpenses:0,netCash:0};
    try {
      if (typeof window.getClosingSummary === 'function') sm = window.getClosingSummary(date);
    } catch(e){}

    return `
      <div class="v12-title">
        <div><small>DAILY FINANCIAL CONTROL</small><h2>Cash Closing</h2>
        <p>Reconcile today's receipts, expenses and physical cash.</p></div>
        <div class="v12-actions">
          <button onclick="saveCashClosing('${date}')">Close Today</button>
          <button class="secondary" onclick="printCashClosing('${date}')">Print Closing</button>
        </div>
      </div>
      <div class="v12-grid">
        <div class="v12-card"><span>Today's Receipts</span><b>BHD ${Number(sm.totalReceipts||0).toFixed(3)}</b></div>
        <div class="v12-card"><span>Today's Expenses</span><b>BHD ${Number(sm.totalExpenses||0).toFixed(3)}</b></div>
        <div class="v12-card"><span>Net Cash</span><b>BHD ${Number(sm.netCash||0).toFixed(3)}</b></div>
        <div class="v12-card"><span>Date</span><b>${date}</b></div>
      </div>`;
  }

  function alertsHTML() {
    let alerts = [];
    try {
      if (typeof window.getSmartAlerts === 'function') alerts = window.getSmartAlerts();
    } catch(e){}

    return `
      <div class="v12-title">
        <div><small>FOLLOW-UP CENTER</small><h2>Smart Alerts</h2>
        <p>Items that require operational or financial attention.</p></div>
      </div>
      <div class="v12-white">
        ${alerts.length ? alerts.map(a => `
          <div class="v12-alert ${a.priority || 'low'}">
            <span></span><div><b>${a.title}</b><small>${a.text}</small></div>
          </div>`).join('') :
          `<div class="v12-empty">No urgent follow-up items.</div>`}
      </div>`;
  }

  window.openV12Page = function(id) {
    const h = host();
    if (!h) return;
    hideMainChildren();
    h.style.display = 'block';
    setActive(id);

    if (id === 'insurance') h.innerHTML = insuranceHTML();
    if (id === 'cash-closing') h.innerHTML = cashHTML();
    if (id === 'alerts') h.innerHTML = alertsHTML();

    window.scrollTo({top:0, behavior:'smooth'});
  };

  function bindOriginalNav() {
    const nav = navContainer();
    if (!nav || nav.dataset.v12Bound) return;
    nav.dataset.v12Bound = '1';

    nav.addEventListener('click', function(e) {
      const custom = e.target.closest('[data-v12-page]');
      if (custom) return;

      const original = e.target.closest('a,button,[role="button"],.nav-item');
      if (original) {
        restoreMainChildren();
        setActive('');
      }
    }, true);
  }

  function css() {
    if (document.getElementById('myaims-v12-css')) return;
    const st = document.createElement('style');
    st.id = 'myaims-v12-css';
    st.textContent = `
      .v12-nav-item{
        appearance:none;border:0;background:transparent;color:inherit;
        width:100%;display:flex;align-items:center;gap:12px;
        padding:12px 18px;border-radius:9px;cursor:pointer;
        font:inherit;text-align:left;opacity:.94;
      }
      .v12-nav-item:hover,.v12-nav-item.active{background:rgba(255,255,255,.11)}
      .v12-icon{width:16px;text-align:center;opacity:.9}
      .v12-feature-host{padding:28px 30px;min-height:calc(100vh - 80px);background:#f4f8f9}
      .v12-title{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin-bottom:22px}
      .v12-title small{letter-spacing:1.5px;font-weight:700;opacity:.6}
      .v12-title h2{font-size:30px;margin:5px 0 5px}
      .v12-title p{margin:0;opacity:.65}
      .v12-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px}
      .v12-card,.v12-white{background:#fff;border:1px solid #dfe8eb;border-radius:14px;padding:18px}
      .v12-card span{display:block;font-size:12px;opacity:.65;margin-bottom:8px}
      .v12-card b{font-size:21px}
      .v12-white h3{margin-top:0}
      .v12-muted{opacity:.65}
      .v12-actions{display:flex;gap:9px}
      .v12-actions button{border:0;border-radius:9px;padding:10px 14px;background:#c99a42;color:#fff;font-weight:700;cursor:pointer}
      .v12-actions button.secondary{background:#fff;color:#173b45;border:1px solid #dbe4e7}
      .v12-alert{display:flex;gap:12px;padding:13px 4px;border-bottom:1px solid #edf1f2}
      .v12-alert>span{width:9px;height:9px;border-radius:50%;margin-top:5px;background:#2980b9}
      .v12-alert.high>span{background:#c0392b}.v12-alert.medium>span{background:#d68910}
      .v12-alert b,.v12-alert small{display:block}.v12-alert small{opacity:.65;margin-top:3px}
      .v12-empty{padding:25px;text-align:center;opacity:.6}
      @media(max-width:900px){.v12-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:650px){.v12-grid{grid-template-columns:1fr}.v12-title{align-items:flex-start;flex-direction:column}.v12-feature-host{padding:18px}}
    `;
    document.head.appendChild(st);
  }

  function init() {
    css();
    installNav();
    bindOriginalNav();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


/* =========================================================
   myAIMS V13 - USERS, ROLES & AUDIT TRAIL
   Demo-ready access control + activity log
   ========================================================= */
(function () {
  const getState = () => window.state || window.appState || {};
  const save = () => { if (typeof window.saveState === 'function') window.saveState(); };

  const DEFAULT_USERS = [
    { id:'USR-1', name:'Main User', username:'admin', role:'Administrator', status:'Active' },
    { id:'USR-2', name:'Reception', username:'reception', role:'Reception', status:'Active' },
    { id:'USR-3', name:'Accounts', username:'accounts', role:'Accounts', status:'Active' }
  ];

  const ROLE_ACCESS = {
    Administrator:['dashboard','patients','appointments','billing','receipts','expenses','insurance','reports','cash-closing','alerts','settings','users'],
    Reception:['dashboard','patients','appointments','billing','receipts'],
    Accounts:['dashboard','billing','receipts','expenses','insurance','reports','cash-closing'],
    Viewer:['dashboard','reports']
  };

  function ensureV13State(){
    const s = getState();
    if (!Array.isArray(s.users) || !s.users.length) s.users = DEFAULT_USERS.map(x => ({...x}));
    if (!Array.isArray(s.auditLog)) s.auditLog = [];
    if (!s.currentUserId) s.currentUserId = 'USR-1';
    save();
  }

  function currentUser(){
    const s = getState();
    return (s.users || []).find(u => String(u.id) === String(s.currentUserId)) || s.users?.[0] || DEFAULT_USERS[0];
  }

  window.logAudit = function(action, module, details){
    ensureV13State();
    const s = getState();
    const u = currentUser();
    s.auditLog.unshift({
      id:'LOG-' + Date.now(),
      timestamp:new Date().toISOString(),
      user:u?.name || 'Unknown',
      role:u?.role || '',
      action:action || 'Action',
      module:module || 'System',
      details:details || ''
    });
    s.auditLog = s.auditLog.slice(0,200);
    save();
  };

  window.switchDemoUser = function(userId){
    const s = getState();
    const user = (s.users || []).find(u => String(u.id) === String(userId));
    if (!user || user.status !== 'Active') return;
    s.currentUserId = user.id;
    save();
    window.logAudit('Login / Switch User','Security',user.name);
    applyRoleVisibility();
    renderUserChip();
    if (typeof window.renderDashboard === 'function') window.renderDashboard();
  };

  function detectPageKey(el){
    const txt = ((el.dataset?.page || '') + ' ' + (el.textContent || '')).toLowerCase();
    if (txt.includes('dashboard')) return 'dashboard';
    if (txt.includes('patient')) return 'patients';
    if (txt.includes('appointment')) return 'appointments';
    if (txt.includes('billing') || txt.includes('invoice')) return 'billing';
    if (txt.includes('receipt')) return 'receipts';
    if (txt.includes('expense')) return 'expenses';
    if (txt.includes('insurance')) return 'insurance';
    if (txt.includes('report')) return 'reports';
    if (txt.includes('cash closing')) return 'cash-closing';
    if (txt.includes('alert')) return 'alerts';
    if (txt.includes('setting')) return 'settings';
    if (txt.includes('user')) return 'users';
    return '';
  }

  function applyRoleVisibility(){
    const u = currentUser();
    const allowed = ROLE_ACCESS[u?.role] || ROLE_ACCESS.Viewer;

    document.querySelectorAll('aside a, aside button, .sidebar a, .sidebar button, #sidebar a, #sidebar button, [data-v12-page]')
      .forEach(el => {
        const key = detectPageKey(el);
        if (!key) return;
        el.style.display = allowed.includes(key) ? '' : 'none';
      });
  }

  function renderUserChip(){
    let header = document.querySelector('header, .topbar, .app-header, .header-actions');
    if (!header) return;

    let box = document.getElementById('v13-user-chip');
    if (!box){
      box = document.createElement('div');
      box.id = 'v13-user-chip';
      box.className = 'v13-user-chip';
      header.appendChild(box);
    }

    const s = getState();
    const u = currentUser();
    box.innerHTML = `
      <span class="v13-avatar">${(u?.name || 'U').charAt(0).toUpperCase()}</span>
      <div><b>${u?.name || 'User'}</b><small>${u?.role || ''}</small></div>
      <select onchange="switchDemoUser(this.value)">
        ${(s.users || []).filter(x => x.status === 'Active').map(x =>
          `<option value="${x.id}" ${x.id===u?.id?'selected':''}>${x.name}</option>`
        ).join('')}
      </select>
    `;
  }

  function ensureUsersNav(){
    const nav = document.querySelector('aside nav, .sidebar nav, #sidebar nav, aside, .sidebar, #sidebar');
    if (!nav || nav.querySelector('[data-v13-page="users"]')) return;

    const btn = document.createElement('button');
    btn.type='button';
    btn.className='v12-nav-item';
    btn.dataset.v13Page='users';
    btn.innerHTML='<span class="v12-icon">⚿</span><span>Users & Audit</span>';
    btn.onclick=()=>openUsersAudit();

    const settings = [...nav.querySelectorAll('a,button')].find(x => (x.textContent||'').toLowerCase().includes('settings'));
    if (settings) nav.insertBefore(btn, settings);
    else nav.appendChild(btn);
  }

  function mainHost(){
    const main = document.querySelector('main, .main-content, #main-content, .app-main, #content, .content');
    if (!main) return null;
    let h = document.getElementById('v13-users-host');
    if (!h){
      h=document.createElement('div');
      h.id='v13-users-host';
      h.className='v12-feature-host';
      main.appendChild(h);
    }
    return h;
  }

  function hideMain(){
    const main = document.querySelector('main, .main-content, #main-content, .app-main, #content, .content');
    if (!main) return;
    [...main.children].forEach(el=>{
      if (el.id !== 'v13-users-host') {
        if (!el.dataset.v13Display) el.dataset.v13Display = el.style.display || '';
        el.style.display='none';
      }
    });
  }

  function userRows(){
    const s=getState();
    return (s.users||[]).map(u=>`
      <tr>
        <td><b>${u.name}</b><small>${u.username}</small></td>
        <td>${u.role}</td>
        <td><span class="v13-status ${u.status==='Active'?'active':'inactive'}">${u.status}</span></td>
        <td>
          <button class="v13-mini" onclick="editDemoUser('${u.id}')">Edit</button>
        </td>
      </tr>`).join('');
  }

  function auditRows(){
    const s=getState();
    return (s.auditLog||[]).slice(0,50).map(l=>`
      <tr>
        <td>${new Date(l.timestamp).toLocaleString()}</td>
        <td><b>${l.user}</b><small>${l.role}</small></td>
        <td>${l.module}</td>
        <td>${l.action}</td>
        <td>${l.details || ''}</td>
      </tr>`).join('') || `<tr><td colspan="5" class="v13-empty">No activity recorded yet.</td></tr>`;
  }

  window.openUsersAudit=function(){
    ensureV13State();
    const h=mainHost();
    if (!h) return;
    hideMain();
    h.style.display='block';

    h.innerHTML=`
      <div class="v12-title">
        <div><small>SECURITY & CONTROL</small><h2>Users & Audit Trail</h2>
        <p>Demo access roles and system activity history.</p></div>
        <button class="v13-primary" onclick="addDemoUser()">+ New User</button>
      </div>

      <div class="v13-role-cards">
        <div><span>Administrator</span><b>Full Access</b></div>
        <div><span>Reception</span><b>Front Desk</b></div>
        <div><span>Accounts</span><b>Finance</b></div>
        <div><span>Viewer</span><b>Read Only</b></div>
      </div>

      <div class="v12-white">
        <div class="v13-section-head"><h3>Users</h3><span>${(getState().users||[]).length} users</span></div>
        <div class="v13-table-wrap">
          <table class="v13-table">
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>${userRows()}</tbody>
          </table>
        </div>
      </div>

      <div class="v12-white" style="margin-top:16px">
        <div class="v13-section-head"><h3>Audit Trail</h3><span>Latest 50 activities</span></div>
        <div class="v13-table-wrap">
          <table class="v13-table">
            <thead><tr><th>Date & Time</th><th>User</th><th>Module</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>${auditRows()}</tbody>
          </table>
        </div>
      </div>`;
  };

  window.addDemoUser=function(){
    const name=prompt('User name:');
    if (!name) return;
    const username=prompt('Username:', name.toLowerCase().replace(/\s+/g,'.'));
    if (!username) return;
    const role=prompt('Role: Administrator / Reception / Accounts / Viewer','Reception');
    const allowed=['Administrator','Reception','Accounts','Viewer'];
    const finalRole=allowed.includes(role) ? role : 'Viewer';

    const s=getState();
    s.users.push({
      id:'USR-'+Date.now(),
      name, username,
      role:finalRole,
      status:'Active'
    });
    save();
    window.logAudit('Create User','Users',name + ' — ' + finalRole);
    openUsersAudit();
    renderUserChip();
  };

  window.editDemoUser=function(id){
    const s=getState();
    const u=(s.users||[]).find(x=>String(x.id)===String(id));
    if (!u) return;

    const role=prompt('Role: Administrator / Reception / Accounts / Viewer',u.role);
    if (role!==null && ['Administrator','Reception','Accounts','Viewer'].includes(role)) u.role=role;

    const status=prompt('Status: Active / Inactive',u.status);
    if (status!==null && ['Active','Inactive'].includes(status)) u.status=status;

    save();
    window.logAudit('Update User','Users',u.name + ' — ' + u.role + ' — ' + u.status);
    openUsersAudit();
    applyRoleVisibility();
    renderUserChip();
  };

  function addGenericAuditCapture(){
    document.addEventListener('click', function(e){
      const btn=e.target.closest('button');
      if (!btn) return;
      const text=(btn.textContent||'').trim();
      if (!text) return;
      if (/new patient|new appointment|new invoice|pay|receipt|expense|close today|print closing/i.test(text)){
        window.logAudit(text,'Operation','Triggered from UI');
      }
    }, true);
  }

  function css(){
    if (document.getElementById('myaims-v13-css')) return;
    const st=document.createElement('style');
    st.id='myaims-v13-css';
    st.textContent=`
      .v13-user-chip{display:flex;align-items:center;gap:9px;margin-left:10px;padding:6px 9px;border:1px solid #dce5e8;border-radius:10px;background:#fff}
      .v13-avatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#184f5b;color:#fff;font-weight:700}
      .v13-user-chip b,.v13-user-chip small{display:block;line-height:1.15}.v13-user-chip small{font-size:10px;opacity:.6}
      .v13-user-chip select{border:0;background:#f5f8f9;border-radius:7px;padding:6px}
      .v13-role-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
      .v13-role-cards>div{background:#fff;border:1px solid #dfe8eb;border-radius:12px;padding:14px}
      .v13-role-cards span{display:block;font-size:12px;opacity:.65;margin-bottom:5px}.v13-role-cards b{font-size:16px}
      .v13-section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.v13-section-head h3{margin:0}
      .v13-section-head span{font-size:12px;opacity:.6}
      .v13-table-wrap{overflow:auto}.v13-table{width:100%;border-collapse:collapse}
      .v13-table th,.v13-table td{padding:11px;border-bottom:1px solid #edf1f2;text-align:left;vertical-align:top}
      .v13-table th{font-size:12px;opacity:.65}.v13-table td small{display:block;font-size:11px;opacity:.6;margin-top:3px}
      .v13-status{display:inline-block;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:700}
      .v13-status.active{background:#e8f7ef}.v13-status.inactive{background:#f2f2f2}
      .v13-mini,.v13-primary{border:0;border-radius:8px;padding:7px 10px;cursor:pointer}
      .v13-mini{background:#f2f6f7}.v13-primary{background:#c99a42;color:#fff;font-weight:700;padding:10px 14px}
      .v13-empty{text-align:center;opacity:.6;padding:24px!important}
      @media(max-width:900px){.v13-role-cards{grid-template-columns:1fr 1fr}.v13-user-chip{display:none}}
      @media(max-width:600px){.v13-role-cards{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  function init(){
    ensureV13State();
    css();
    ensureUsersNav();
    renderUserChip();
    applyRoleVisibility();
    addGenericAuditCapture();

    const observer=new MutationObserver(()=>{
      clearTimeout(window.__v13t);
      window.__v13t=setTimeout(()=>{
        ensureUsersNav();
        renderUserChip();
        applyRoleVisibility();
      },40);
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();


/* =========================================================
   myAIMS V14 - APPOINTMENTS PRO
   Calendar-like filters, therapist/room, duration, visit type,
   statuses, conflict checks, quick actions and follow-up.
   ========================================================= */
(function () {
  const getState = () => window.state || window.appState || {};
  const save = () => { if (typeof window.saveState === 'function') window.saveState(); };

  const STATUSES = ['Scheduled','Confirmed','Checked In','In Session','Completed','Cancelled','No Show'];
  const VISIT_TYPES = ['Initial Assessment','Follow-up','Physiotherapy Session','Rehabilitation Session','Consultation'];
  const DURATIONS = [30,45,60,90];

  function today(){ return new Date().toISOString().slice(0,10); }
  function nowTime(){ return new Date().toTimeString().slice(0,5); }
  function normalizeTime(t){ return String(t || '').slice(0,5); }

  function ensureAppointmentModel(){
    const s = getState();
    if (!Array.isArray(s.appointments)) s.appointments = [];
    s.appointments = s.appointments.map(a => ({
      ...a,
      status: a.status || 'Scheduled',
      therapist: a.therapist || '',
      room: a.room || '',
      duration: Number(a.duration || 60),
      visitType: a.visitType || 'Physiotherapy Session',
      notes: a.notes || '',
      checkedInAt: a.checkedInAt || '',
      completedAt: a.completedAt || '',
      followUpNeeded: !!a.followUpNeeded
    }));
    save();
  }

  function patientName(id){
    const s=getState();
    const p=(s.patients||[]).find(x=>String(x.id)===String(id));
    return p ? (p.name || p.fullName || p.patientName || 'Patient') : (id || 'Patient');
  }

  function appointmentRows(filterDate, filterStatus){
    const s=getState();
    return (s.appointments||[])
      .filter(a => !filterDate || a.date===filterDate)
      .filter(a => !filterStatus || filterStatus==='All' || a.status===filterStatus)
      .sort((a,b)=>(String(a.date)+String(a.time)).localeCompare(String(b.date)+String(b.time)));
  }

  window.hasAdvancedAppointmentConflict=function(appt){
    const s=getState();
    const duration=Number(appt.duration||60);
    const start=(appt.date||'')+'T'+normalizeTime(appt.time);
    if (!appt.date || !appt.time) return null;
    const startDate=new Date(start);
    const endDate=new Date(startDate.getTime()+duration*60000);

    return (s.appointments||[]).find(a=>{
      if (String(a.id)===String(appt.id||'')) return false;
      if (a.date!==appt.date) return false;
      if (['Cancelled','No Show'].includes(a.status||'Scheduled')) return false;

      const sameResource =
        (!!appt.therapist && !!a.therapist && appt.therapist===a.therapist) ||
        (!!appt.room && !!a.room && appt.room===a.room);

      if (!sameResource) return false;

      const aStart=new Date((a.date||'')+'T'+normalizeTime(a.time));
      const aEnd=new Date(aStart.getTime()+Number(a.duration||60)*60000);

      return startDate < aEnd && endDate > aStart;
    }) || null;
  };

  window.updateAppointmentStatusPro=function(id,status){
    const s=getState();
    const a=(s.appointments||[]).find(x=>String(x.id)===String(id));
    if (!a || !STATUSES.includes(status)) return;

    a.status=status;
    if (status==='Checked In' && !a.checkedInAt) a.checkedInAt=new Date().toISOString();
    if (status==='Completed') a.completedAt=new Date().toISOString();
    save();

    if (typeof window.logAudit==='function') window.logAudit('Update Appointment Status','Appointments',`${patientName(a.patientId||a.patient)} — ${status}`);
    renderAppointmentsPro();
    if (typeof window.renderDashboard==='function') window.renderDashboard();
  };

  window.toggleAppointmentFollowUp=function(id){
    const s=getState();
    const a=(s.appointments||[]).find(x=>String(x.id)===String(id));
    if (!a) return;
    a.followUpNeeded=!a.followUpNeeded;
    save();
    renderAppointmentsPro();
  };

  window.editAppointmentPro=function(id){
    const s=getState();
    const a=(s.appointments||[]).find(x=>String(x.id)===String(id));
    if (!a) return;

    const therapist=prompt('Therapist:',a.therapist||'');
    if (therapist===null) return;
    const room=prompt('Room / Treatment Area:',a.room||'');
    if (room===null) return;
    const duration=prompt('Duration in minutes: 30 / 45 / 60 / 90',String(a.duration||60));
    if (duration===null) return;
    const visitType=prompt('Visit Type:',a.visitType||'Physiotherapy Session');
    if (visitType===null) return;
    const notes=prompt('Notes:',a.notes||'');
    if (notes===null) return;

    const candidate={...a,therapist,room,duration:Number(duration||60),visitType,notes};
    const conflict=window.hasAdvancedAppointmentConflict(candidate);
    if (conflict){
      alert(`Conflict detected with ${patientName(conflict.patientId||conflict.patient)} at ${conflict.time}.`);
      return;
    }

    Object.assign(a,candidate);
    save();
    if (typeof window.logAudit==='function') window.logAudit('Edit Appointment','Appointments',patientName(a.patientId||a.patient));
    renderAppointmentsPro();
  };

  window.createFollowUpFromAppointment=function(id){
    const s=getState();
    const a=(s.appointments||[]).find(x=>String(x.id)===String(id));
    if (!a) return;

    const nextDate=prompt('Follow-up date (YYYY-MM-DD):', a.date || today());
    if (!nextDate) return;
    const nextTime=prompt('Follow-up time (HH:MM):', a.time || '10:00');
    if (!nextTime) return;

    const newAppt={
      ...a,
      id:'APT-'+Date.now(),
      date:nextDate,
      time:nextTime,
      status:'Scheduled',
      checkedInAt:'',
      completedAt:'',
      followUpNeeded:false
    };

    const conflict=window.hasAdvancedAppointmentConflict(newAppt);
    if (conflict){
      alert(`Conflict detected with ${patientName(conflict.patientId||conflict.patient)} at ${conflict.time}.`);
      return;
    }

    s.appointments.push(newAppt);
    save();
    if (typeof window.logAudit==='function') window.logAudit('Create Follow-up','Appointments',patientName(newAppt.patientId||newAppt.patient));
    renderAppointmentsPro();
  };

  function stats(date){
    const rows=appointmentRows(date,'All');
    const count = status => rows.filter(a=>a.status===status).length;
    return {
      total:rows.length,
      confirmed:count('Confirmed'),
      checkedIn:count('Checked In')+count('In Session'),
      completed:count('Completed'),
      noShow:count('No Show'),
      cancelled:count('Cancelled')
    };
  }

  function statusOptions(current){
    return STATUSES.map(s=>`<option ${s===current?'selected':''}>${s}</option>`).join('');
  }

  function renderAppointmentsPro(){
    const page=document.querySelector('#appointments, [data-page="appointments"], .appointments-page');
    if (!page) return;

    let panel=document.getElementById('appointments-pro-panel');
    if (!panel){
      panel=document.createElement('section');
      panel.id='appointments-pro-panel';
      panel.className='v14-wrap';
      page.prepend(panel);
    }

    const selectedDate=document.getElementById('v14-date-filter')?.value || today();
    const selectedStatus=document.getElementById('v14-status-filter')?.value || 'All';
    const rows=appointmentRows(selectedDate,selectedStatus);
    const st=stats(selectedDate);

    panel.innerHTML=`
      <div class="v14-head">
        <div>
          <small>CLINIC SCHEDULE</small>
          <h2>Appointments Pro</h2>
          <p>Manage therapist schedules, treatment rooms, visit flow and follow-up.</p>
        </div>
        <div class="v14-filters">
          <input id="v14-date-filter" type="date" value="${selectedDate}" onchange="renderAppointmentsPro()">
          <select id="v14-status-filter" onchange="renderAppointmentsPro()">
            ${['All',...STATUSES].map(s=>`<option ${s===selectedStatus?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="v14-stats">
        <div><span>Total</span><b>${st.total}</b></div>
        <div><span>Confirmed</span><b>${st.confirmed}</b></div>
        <div><span>Checked In / In Session</span><b>${st.checkedIn}</b></div>
        <div><span>Completed</span><b>${st.completed}</b></div>
        <div><span>No Show</span><b>${st.noShow}</b></div>
        <div><span>Cancelled</span><b>${st.cancelled}</b></div>
      </div>

      <div class="v14-table-card">
        <div class="v14-table-head">
          <h3>Schedule — ${selectedDate}</h3>
          <span>${rows.length} appointment${rows.length===1?'':'s'}</span>
        </div>
        <div class="v14-table-wrap">
          <table class="v14-table">
            <thead>
              <tr>
                <th>Time</th><th>Patient</th><th>Visit Type</th><th>Therapist</th><th>Room</th><th>Duration</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map(a=>`
                <tr>
                  <td><b>${a.time||'—'}</b></td>
                  <td><b>${patientName(a.patientId||a.patient)}</b>${a.followUpNeeded?'<small class="v14-follow">Follow-up needed</small>':''}</td>
                  <td>${a.visitType||'—'}</td>
                  <td>${a.therapist||'—'}</td>
                  <td>${a.room||'—'}</td>
                  <td>${Number(a.duration||60)} min</td>
                  <td>
                    <select class="v14-status" onchange="updateAppointmentStatusPro('${a.id}',this.value)">
                      ${statusOptions(a.status||'Scheduled')}
                    </select>
                  </td>
                  <td>
                    <div class="v14-actions">
                      <button onclick="editAppointmentPro('${a.id}')">Edit</button>
                      <button onclick="toggleAppointmentFollowUp('${a.id}')">${a.followUpNeeded?'Clear Follow-up':'Follow-up'}</button>
                      <button onclick="createFollowUpFromAppointment('${a.id}')">Next Visit</button>
                      <button onclick="createInvoiceFromAppointment('${a.id}')">Invoice</button>
                    </div>
                  </td>
                </tr>`).join('') :
                `<tr><td colspan="8" class="v14-empty">No appointments for this filter.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>`;
  }

  window.renderAppointmentsPro=renderAppointmentsPro;

  // Improve existing appointment creation forms with extra fields.
  function enhanceAppointmentForm(){
    const forms=[...document.querySelectorAll('form')].filter(f=>{
      const txt=((f.id||'')+' '+(f.className||'')+' '+(f.textContent||'')).toLowerCase();
      return txt.includes('appointment');
    });

    forms.forEach(form=>{
      if (form.dataset.v14Enhanced==='1') return;
      form.dataset.v14Enhanced='1';

      const holder=document.createElement('div');
      holder.className='v14-extra-fields';
      holder.innerHTML=`
        <label>Therapist<input name="therapist" placeholder="Therapist name"></label>
        <label>Room<input name="room" placeholder="Room / Treatment Area"></label>
        <label>Duration<select name="duration">${DURATIONS.map(d=>`<option value="${d}" ${d===60?'selected':''}>${d} min</option>`).join('')}</select></label>
        <label>Visit Type<select name="visitType">${VISIT_TYPES.map(v=>`<option>${v}</option>`).join('')}</select></label>
        <label class="v14-notes">Clinical / appointment note<textarea name="notes" rows="2" placeholder="Optional note"></textarea></label>`;
      form.appendChild(holder);
    });
  }

  // Capture form submission and enrich most recently added appointment.
  document.addEventListener('submit',function(e){
    const form=e.target;
    if (!form || form.dataset.v14Enhanced!=='1') return;

    const fd=new FormData(form);
    const appt={
      therapist:fd.get('therapist')||'',
      room:fd.get('room')||'',
      duration:Number(fd.get('duration')||60),
      visitType:fd.get('visitType')||'Physiotherapy Session',
      notes:fd.get('notes')||'',
      date:fd.get('date')||form.querySelector('[name="date"]')?.value||'',
      time:fd.get('time')||form.querySelector('[name="time"]')?.value||''
    };

    const conflict=window.hasAdvancedAppointmentConflict(appt);
    if (conflict){
      e.preventDefault();
      e.stopImmediatePropagation();
      alert(`Schedule conflict: ${patientName(conflict.patientId||conflict.patient)} already occupies the same therapist/room time.`);
      return false;
    }

    setTimeout(()=>{
      const s=getState();
      const last=(s.appointments||[])[s.appointments.length-1];
      if (last){
        last.therapist=appt.therapist;
        last.room=appt.room;
        last.duration=appt.duration;
        last.visitType=appt.visitType;
        last.notes=appt.notes;
        last.status=last.status||'Scheduled';
        save();
        renderAppointmentsPro();
      }
    },80);
  },true);

  function css(){
    if (document.getElementById('myaims-v14-css')) return;
    const st=document.createElement('style');
    st.id='myaims-v14-css';
    st.textContent=`
      .v14-wrap{margin-bottom:20px}
      .v14-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin-bottom:16px}
      .v14-head small{letter-spacing:1.5px;font-weight:700;opacity:.55}
      .v14-head h2{margin:4px 0;font-size:27px}.v14-head p{margin:0;opacity:.65}
      .v14-filters{display:flex;gap:8px}.v14-filters input,.v14-filters select{padding:10px;border:1px solid #dce5e8;border-radius:9px;background:#fff}
      .v14-stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:14px}
      .v14-stats>div{background:#fff;border:1px solid #dfe8eb;border-radius:12px;padding:13px}
      .v14-stats span{display:block;font-size:11px;opacity:.62;margin-bottom:5px}.v14-stats b{font-size:18px}
      .v14-table-card{background:#fff;border:1px solid #dfe8eb;border-radius:14px;padding:15px}
      .v14-table-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.v14-table-head h3{margin:0}.v14-table-head span{font-size:12px;opacity:.6}
      .v14-table-wrap{overflow:auto}.v14-table{width:100%;border-collapse:collapse;min-width:980px}
      .v14-table th,.v14-table td{padding:10px;border-bottom:1px solid #edf1f2;text-align:left;vertical-align:top}
      .v14-table th{font-size:11px;opacity:.62}.v14-table td{font-size:13px}
      .v14-status{padding:6px;border:1px solid #dce5e8;border-radius:8px;background:#fff}
      .v14-actions{display:flex;gap:5px;flex-wrap:wrap}.v14-actions button{border:0;background:#f1f6f7;border-radius:7px;padding:6px 8px;cursor:pointer;font-size:11px}
      .v14-actions button:last-child{background:#c99a42;color:white}
      .v14-follow{display:block;color:#b7791f;font-weight:700;margin-top:3px}
      .v14-empty{text-align:center!important;padding:28px!important;opacity:.55}
      .v14-extra-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid #edf1f2}
      .v14-extra-fields label{display:flex;flex-direction:column;gap:5px;font-size:12px}
      .v14-extra-fields input,.v14-extra-fields select,.v14-extra-fields textarea{padding:9px;border:1px solid #dce5e8;border-radius:8px}
      .v14-notes{grid-column:1/-1}
      @media(max-width:1100px){.v14-stats{grid-template-columns:repeat(3,1fr)}}
      @media(max-width:700px){.v14-head{align-items:flex-start;flex-direction:column}.v14-filters{width:100%}.v14-filters>*{flex:1}.v14-stats{grid-template-columns:1fr 1fr}.v14-extra-fields{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  const oldRender=window.renderAppointments;
  if (typeof oldRender==='function'){
    window.renderAppointments=function(){
      oldRender.apply(this,arguments);
      setTimeout(()=>{enhanceAppointmentForm();renderAppointmentsPro();},40);
    };
  }

  function init(){
    ensureAppointmentModel();
    css();
    setTimeout(()=>{enhanceAppointmentForm();renderAppointmentsPro();},300);

    const observer=new MutationObserver(()=>{
      clearTimeout(window.__v14t);
      window.__v14t=setTimeout(()=>{enhanceAppointmentForm();renderAppointmentsPro();},60);
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();


/* =========================================================
   myAIMS V15 - APPOINTMENTS VISUAL UPGRADE
   Premium day/week scheduler presentation for demos
   ========================================================= */
(function () {
  const getState = () => window.state || window.appState || {};
  const STATUS_COLORS = {
    'Scheduled':'#5b8def',
    'Confirmed':'#1fa97a',
    'Checked In':'#d39a2c',
    'In Session':'#8b5cf6',
    'Completed':'#2f855a',
    'Cancelled':'#d35d6e',
    'No Show':'#6b7280'
  };

  function today(){ return new Date().toISOString().slice(0,10); }
  function addDays(dateStr, n){
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate()+n);
    return d.toISOString().slice(0,10);
  }
  function dayLabel(dateStr){
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined,{weekday:'short',day:'2-digit',month:'short'});
  }
  function patientName(id){
    const s=getState();
    const p=(s.patients||[]).find(x=>String(x.id)===String(id));
    return p ? (p.name || p.fullName || p.patientName || 'Patient') : 'Patient';
  }
  function initials(name){
    return String(name||'P').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  }
  function getAppointments(){
    const s=getState();
    return Array.isArray(s.appointments) ? s.appointments : [];
  }

  window.__v15View = window.__v15View || 'day';
  window.__v15Date = window.__v15Date || today();

  window.setV15View = function(view){
    window.__v15View = view === 'week' ? 'week' : 'day';
    renderVisualScheduler();
  };

  window.shiftV15Date = function(days){
    window.__v15Date = addDays(window.__v15Date, days);
    renderVisualScheduler();
  };

  window.goV15Today = function(){
    window.__v15Date = today();
    renderVisualScheduler();
  };

  function dayAppointments(date){
    return getAppointments()
      .filter(a=>a.date===date)
      .sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
  }

  function quickActions(a){
    return `
      <div class="v15-card-actions">
        <button onclick="updateAppointmentStatusPro('${a.id}','Checked In')">Check In</button>
        <button onclick="updateAppointmentStatusPro('${a.id}','In Session')">Start</button>
        <button onclick="updateAppointmentStatusPro('${a.id}','Completed')">Complete</button>
        <button onclick="editAppointmentPro('${a.id}')">Edit</button>
      </div>`;
  }

  function appointmentCard(a){
    const name=patientName(a.patientId||a.patient);
    const color=STATUS_COLORS[a.status||'Scheduled'] || '#5b8def';
    return `
      <article class="v15-appt-card" style="--status:${color}">
        <div class="v15-time-col">
          <b>${a.time||'—'}</b>
          <small>${Number(a.duration||60)} min</small>
        </div>
        <div class="v15-appt-body">
          <div class="v15-appt-top">
            <div class="v15-patient">
              <span class="v15-avatar">${initials(name)}</span>
              <div>
                <b>${name}</b>
                <small>${a.visitType||'Physiotherapy Session'}</small>
              </div>
            </div>
            <span class="v15-status" style="color:${color};border-color:${color}33;background:${color}12">${a.status||'Scheduled'}</span>
          </div>
          <div class="v15-meta">
            <span>Therapist: <b>${a.therapist||'Not assigned'}</b></span>
            <span>Room: <b>${a.room||'—'}</b></span>
            ${a.followUpNeeded?'<span class="v15-follow-badge">Follow-up needed</span>':''}
          </div>
          ${a.notes ? `<div class="v15-note">${a.notes}</div>` : ''}
          ${quickActions(a)}
        </div>
      </article>`;
  }

  function dayView(date){
    const rows=dayAppointments(date);
    const active=rows.filter(a=>!['Cancelled','No Show','Completed'].includes(a.status||'Scheduled')).length;
    const completed=rows.filter(a=>a.status==='Completed').length;
    return `
      <div class="v15-day-header">
        <div><small>SELECTED DAY</small><h3>${dayLabel(date)}</h3></div>
        <div class="v15-day-kpis">
          <span><b>${rows.length}</b> Total</span>
          <span><b>${active}</b> Active</span>
          <span><b>${completed}</b> Completed</span>
        </div>
      </div>
      <div class="v15-day-list">
        ${rows.length ? rows.map(appointmentCard).join('') :
          `<div class="v15-empty-state">
            <div class="v15-empty-icon">○</div>
            <h4>No appointments</h4>
            <p>No appointments are scheduled for this date.</p>
          </div>`}
      </div>`;
  }

  function weekView(startDate){
    const dates=Array.from({length:7},(_,i)=>addDays(startDate,i));
    return `
      <div class="v15-week-grid">
        ${dates.map(date=>{
          const rows=dayAppointments(date);
          return `
            <section class="v15-week-day">
              <div class="v15-week-head ${date===today()?'today':''}">
                <small>${new Date(date+'T00:00:00').toLocaleDateString(undefined,{weekday:'short'}).toUpperCase()}</small>
                <b>${new Date(date+'T00:00:00').getDate()}</b>
                <span>${rows.length} appt${rows.length===1?'':'s'}</span>
              </div>
              <div class="v15-week-cards">
                ${rows.length ? rows.map(a=>{
                  const name=patientName(a.patientId||a.patient);
                  const color=STATUS_COLORS[a.status||'Scheduled'] || '#5b8def';
                  return `
                    <button class="v15-mini-card" onclick="window.__v15Date='${date}';window.__v15View='day';renderVisualScheduler()" style="--status:${color}">
                      <span class="v15-mini-time">${a.time||'—'}</span>
                      <b>${name}</b>
                      <small>${a.therapist||'Unassigned'}</small>
                      <i style="background:${color}"></i>
                    </button>`;
                }).join('') : `<div class="v15-week-empty">Free</div>`}
              </div>
            </section>`;
        }).join('')}
      </div>`;
  }

  function statusLegend(){
    const statuses=['Scheduled','Confirmed','Checked In','In Session','Completed','No Show','Cancelled'];
    return `
      <div class="v15-legend">
        ${statuses.map(s=>`<span><i style="background:${STATUS_COLORS[s]}"></i>${s}</span>`).join('')}
      </div>`;
  }

  function renderVisualScheduler(){
    const page=document.querySelector('#appointments, [data-page="appointments"], .appointments-page');
    if(!page) return;

    let box=document.getElementById('v15-visual-scheduler');
    if(!box){
      box=document.createElement('section');
      box.id='v15-visual-scheduler';
      box.className='v15-shell';
      page.prepend(box);
    }

    box.innerHTML=`
      <div class="v15-toolbar">
        <div>
          <small>APPOINTMENT EXPERIENCE</small>
          <h2>Clinic Schedule</h2>
          <p>A clearer visual view of the day's patient flow.</p>
        </div>
        <div class="v15-toolbar-actions">
          <div class="v15-segment">
            <button class="${window.__v15View==='day'?'active':''}" onclick="setV15View('day')">Day</button>
            <button class="${window.__v15View==='week'?'active':''}" onclick="setV15View('week')">Week</button>
          </div>
          <div class="v15-date-nav">
            <button onclick="shiftV15Date(${window.__v15View==='week'?-7:-1})">‹</button>
            <button class="today-btn" onclick="goV15Today()">Today</button>
            <button onclick="shiftV15Date(${window.__v15View==='week'?7:1})">›</button>
          </div>
        </div>
      </div>

      ${statusLegend()}

      <div class="v15-content">
        ${window.__v15View==='week' ? weekView(window.__v15Date) : dayView(window.__v15Date)}
      </div>
    `;
  }

  window.renderVisualScheduler=renderVisualScheduler;

  function css(){
    if(document.getElementById('myaims-v15-css')) return;
    const st=document.createElement('style');
    st.id='myaims-v15-css';
    st.textContent=`
      .v15-shell{background:linear-gradient(180deg,#f8fbfc 0%,#f3f7f8 100%);border:1px solid #dce7ea;border-radius:18px;padding:20px;margin-bottom:20px}
      .v15-toolbar{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin-bottom:14px}
      .v15-toolbar>div:first-child small{letter-spacing:1.5px;color:#b58734;font-weight:800}
      .v15-toolbar h2{margin:5px 0 4px;font-size:30px;color:#163e48}
      .v15-toolbar p{margin:0;color:#6b7b80}
      .v15-toolbar-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .v15-segment,.v15-date-nav{display:flex;background:#fff;border:1px solid #dbe5e8;border-radius:10px;padding:3px}
      .v15-segment button,.v15-date-nav button{border:0;background:transparent;padding:8px 12px;border-radius:7px;cursor:pointer;color:#294a52}
      .v15-segment button.active{background:#174f5b;color:#fff}
      .v15-date-nav .today-btn{font-weight:700}
      .v15-legend{display:flex;gap:14px;flex-wrap:wrap;margin:12px 0 16px;font-size:11px;color:#607277}
      .v15-legend span{display:flex;align-items:center;gap:5px}
      .v15-legend i{width:8px;height:8px;border-radius:50%}
      .v15-content{background:#fff;border:1px solid #e2eaec;border-radius:15px;padding:16px}
      .v15-day-header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #edf2f3;padding-bottom:13px;margin-bottom:12px}
      .v15-day-header small{font-size:10px;letter-spacing:1.2px;color:#9a7b42;font-weight:800}
      .v15-day-header h3{margin:3px 0 0;font-size:21px}
      .v15-day-kpis{display:flex;gap:18px;color:#687a7f;font-size:12px}
      .v15-day-kpis b{display:block;color:#163e48;font-size:17px}
      .v15-day-list{display:grid;gap:10px}
      .v15-appt-card{position:relative;display:grid;grid-template-columns:84px 1fr;border:1px solid #e3eaec;border-radius:13px;background:#fff;overflow:hidden;box-shadow:0 3px 10px rgba(20,65,75,.04)}
      .v15-appt-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--status)}
      .v15-time-col{display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f8fafb;border-right:1px solid #edf2f3;padding:14px}
      .v15-time-col b{font-size:17px;color:#183e47}.v15-time-col small{font-size:10px;color:#829095;margin-top:4px}
      .v15-appt-body{padding:13px 15px}
      .v15-appt-top{display:flex;justify-content:space-between;gap:12px;align-items:center}
      .v15-patient{display:flex;align-items:center;gap:10px}
      .v15-avatar{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#e8f2f4;color:#174f5b;font-size:12px;font-weight:800}
      .v15-patient b,.v15-patient small{display:block}.v15-patient small{font-size:11px;color:#79898e;margin-top:2px}
      .v15-status{border:1px solid;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:800;white-space:nowrap}
      .v15-meta{display:flex;gap:18px;flex-wrap:wrap;margin:10px 0 8px;font-size:11px;color:#738389}
      .v15-meta b{color:#37565e}
      .v15-follow-badge{color:#9b6c17;background:#fff6dd;padding:3px 7px;border-radius:999px}
      .v15-note{background:#f7fafb;border-radius:8px;padding:8px 10px;font-size:11px;color:#607277;margin-bottom:8px}
      .v15-card-actions{display:flex;gap:6px;flex-wrap:wrap}
      .v15-card-actions button{border:1px solid #dbe5e8;background:#fff;color:#355860;border-radius:7px;padding:6px 9px;font-size:10px;cursor:pointer}
      .v15-card-actions button:nth-child(3){background:#174f5b;color:#fff;border-color:#174f5b}
      .v15-week-grid{display:grid;grid-template-columns:repeat(7,minmax(150px,1fr));gap:8px;overflow:auto;padding-bottom:4px}
      .v15-week-day{border:1px solid #e3eaec;border-radius:12px;background:#fbfdfd;min-width:150px}
      .v15-week-head{padding:11px;text-align:center;border-bottom:1px solid #e6edef}
      .v15-week-head.today{background:#eaf5f6}
      .v15-week-head small,.v15-week-head b,.v15-week-head span{display:block}
      .v15-week-head small{font-size:10px;color:#809095}.v15-week-head b{font-size:23px;color:#194b56;margin:2px 0}.v15-week-head span{font-size:10px;color:#87979b}
      .v15-week-cards{padding:8px;display:grid;gap:7px}
      .v15-mini-card{position:relative;border:1px solid #e1e9eb;border-radius:9px;background:#fff;padding:9px;text-align:left;cursor:pointer;overflow:hidden}
      .v15-mini-card i{position:absolute;left:0;top:0;bottom:0;width:3px}
      .v15-mini-card span,.v15-mini-card b,.v15-mini-card small{display:block}
      .v15-mini-time{font-size:10px;color:#8a989c}.v15-mini-card b{font-size:11px;margin:3px 0;color:#294a52}.v15-mini-card small{font-size:9px;color:#8a989c}
      .v15-week-empty,.v15-empty-state{text-align:center;color:#9aa7aa}
      .v15-week-empty{padding:18px 6px;font-size:11px}
      .v15-empty-state{padding:45px 20px}.v15-empty-icon{font-size:32px}.v15-empty-state h4{margin:8px 0 4px;color:#567078}.v15-empty-state p{margin:0;font-size:12px}
      @media(max-width:900px){.v15-toolbar{align-items:flex-start;flex-direction:column}.v15-appt-card{grid-template-columns:70px 1fr}}
      @media(max-width:650px){.v15-shell{padding:12px}.v15-toolbar-actions{width:100%}.v15-segment,.v15-date-nav{flex:1}.v15-appt-card{grid-template-columns:1fr}.v15-time-col{align-items:flex-start;border-right:0;border-bottom:1px solid #edf2f3}.v15-appt-top{align-items:flex-start}.v15-day-header{align-items:flex-start;flex-direction:column;gap:9px}}
    `;
    document.head.appendChild(st);
  }

  const oldRenderAppointments = window.renderAppointments;
  if(typeof oldRenderAppointments==='function'){
    window.renderAppointments = function(){
      oldRenderAppointments.apply(this,arguments);
      setTimeout(renderVisualScheduler,50);
    };
  }

  function init(){
    css();
    setTimeout(renderVisualScheduler,300);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();


/* =========================================================
   myAIMS V16 - CLINIC TIMELINE + THERAPIST COLUMNS + SIDE PANEL
   ========================================================= */
(function(){
  const S = () => window.state || window.appState || {};
  const START_HOUR = 8, END_HOUR = 20, SLOT = 30, SLOT_H = 48;
  window.__v16Date = window.__v16Date || new Date().toISOString().slice(0,10);
  window.__v16View = window.__v16View || 'therapist';

  function appts(){ return Array.isArray(S().appointments) ? S().appointments : []; }
  function patients(){ return Array.isArray(S().patients) ? S().patients : []; }
  function pname(a){
    const id=a.patientId||a.patient;
    const p=patients().find(x=>String(x.id)===String(id));
    return p ? (p.name||p.fullName||p.patientName||'Patient') : 'Patient';
  }
  function pphone(a){
    const id=a.patientId||a.patient;
    const p=patients().find(x=>String(x.id)===String(id));
    return p ? (p.phone||p.mobile||p.contact||'—') : '—';
  }
  function mins(t){
    const [h,m]=String(t||'08:00').split(':').map(Number);
    return h*60+(m||0);
  }
  function fmt(h,m){ return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function initials(n){ return String(n||'P').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase(); }

  function resources(type){
    const rows=appts().filter(a=>a.date===window.__v16Date);
    let vals = rows.map(a=>type==='room' ? a.room : a.therapist).filter(Boolean);
    vals=[...new Set(vals)];
    if(!vals.length) vals=type==='room'?['Treatment Room 1','Treatment Room 2']:['Therapist 1','Therapist 2'];
    return vals;
  }

  function statusClass(s){
    return String(s||'Scheduled').toLowerCase().replace(/\s+/g,'-');
  }

  function timelineHours(){
    let html='';
    for(let h=START_HOUR;h<=END_HOUR;h++){
      html+=`<div class="v16-hour-label" style="top:${(h-START_HOUR)*2*SLOT_H}px">${fmt(h,0)}</div>`;
      if(h<END_HOUR) html+=`<div class="v16-half-label" style="top:${(h-START_HOUR)*2*SLOT_H+SLOT_H}px">${fmt(h,30)}</div>`;
    }
    return html;
  }

  function eventStyle(a){
    const start=mins(a.time)-START_HOUR*60;
    const top=Math.max(0,(start/SLOT)*SLOT_H);
    const height=Math.max(42,(Number(a.duration||60)/SLOT)*SLOT_H-5);
    return `top:${top}px;height:${height}px`;
  }

  function column(name,type){
    const rows=appts().filter(a=>{
      if(a.date!==window.__v16Date) return false;
      return type==='room' ? (a.room||'')===name : (a.therapist||'')===name;
    });
    return `
      <div class="v16-resource">
        <div class="v16-resource-head">
          <span class="v16-resource-avatar">${initials(name)}</span>
          <div><b>${esc(name)}</b><small>${rows.length} appointment${rows.length===1?'':'s'}</small></div>
        </div>
        <div class="v16-resource-body">
          ${Array.from({length:(END_HOUR-START_HOUR)*2},(_,i)=>`<div class="v16-slot" style="top:${i*SLOT_H}px"></div>`).join('')}
          ${rows.map(a=>`
            <button class="v16-event ${statusClass(a.status)}" style="${eventStyle(a)}" onclick="openV16Appointment('${a.id}')">
              <span class="v16-event-time">${esc(a.time||'')}</span>
              <b>${esc(pname(a))}</b>
              <small>${esc(a.visitType||'Session')}</small>
              <em>${Number(a.duration||60)} min</em>
            </button>`).join('')}
        </div>
      </div>`;
  }

  function renderTimeline(){
    const page=document.querySelector('#appointments, .appointments-page');
    if(!page) return;
    let root=document.getElementById('v16-timeline');
    if(!root){
      root=document.createElement('section');
      root.id='v16-timeline';
      page.prepend(root);
    }
    const type=window.__v16View;
    const list=resources(type);
    const d=new Date(window.__v16Date+'T00:00:00');
    root.innerHTML=`
      <div class="v16-top">
        <div>
          <small>SMART CLINIC SCHEDULER</small>
          <h2>Appointments Timeline</h2>
          <p>${d.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
        </div>
        <div class="v16-controls">
          <div class="v16-toggle">
            <button class="${type==='therapist'?'active':''}" onclick="setV16Resource('therapist')">Therapists</button>
            <button class="${type==='room'?'active':''}" onclick="setV16Resource('room')">Rooms</button>
          </div>
          <button onclick="shiftV16(-1)">‹</button>
          <input type="date" value="${window.__v16Date}" onchange="window.__v16Date=this.value;renderV16Timeline()">
          <button onclick="shiftV16(1)">›</button>
          <button class="v16-today" onclick="todayV16()">Today</button>
        </div>
      </div>
      <div class="v16-legend">
        ${['Scheduled','Confirmed','Checked In','In Session','Completed','No Show','Cancelled'].map(s=>`<span class="${statusClass(s)}"><i></i>${s}</span>`).join('')}
      </div>
      <div class="v16-board-wrap">
        <div class="v16-board" style="--cols:${list.length}">
          <div class="v16-times">
            <div class="v16-time-head">TIME</div>
            <div class="v16-time-body">${timelineHours()}<div id="v16-now-label"></div></div>
          </div>
          ${list.map(n=>column(n,type)).join('')}
          <div id="v16-now-line"></div>
        </div>
      </div>`;
    drawNowLine();
  }

  window.renderV16Timeline=renderTimeline;
  window.setV16Resource=function(v){ window.__v16View=v; renderTimeline(); };
  window.shiftV16=function(n){
    const d=new Date(window.__v16Date+'T00:00:00'); d.setDate(d.getDate()+n);
    window.__v16Date=d.toISOString().slice(0,10); renderTimeline();
  };
  window.todayV16=function(){ window.__v16Date=new Date().toISOString().slice(0,10); renderTimeline(); };

  function drawNowLine(){
    const line=document.getElementById('v16-now-line');
    const label=document.getElementById('v16-now-label');
    if(!line||!label) return;
    const now=new Date(), td=now.toISOString().slice(0,10);
    if(td!==window.__v16Date){ line.style.display='none'; label.style.display='none'; return; }
    const m=now.getHours()*60+now.getMinutes()-START_HOUR*60;
    if(m<0||m>(END_HOUR-START_HOUR)*60){ line.style.display='none'; label.style.display='none'; return; }
    const y=(m/SLOT)*SLOT_H;
    line.style.top=(58+y)+'px';
    label.style.top=y+'px';
    label.innerHTML='<span>NOW</span>';
  }

  window.openV16Appointment=function(id){
    const a=appts().find(x=>String(x.id)===String(id)); if(!a) return;
    let shade=document.getElementById('v16-shade');
    if(!shade){
      shade=document.createElement('div'); shade.id='v16-shade'; document.body.appendChild(shade);
    }
    shade.className='open';
    shade.innerHTML=`
      <div class="v16-overlay" onclick="closeV16Appointment()"></div>
      <aside class="v16-panel">
        <div class="v16-panel-head">
          <div><small>APPOINTMENT DETAILS</small><h3>${esc(a.time||'')} · ${Number(a.duration||60)} min</h3></div>
          <button onclick="closeV16Appointment()">×</button>
        </div>
        <div class="v16-patient-card">
          <span>${initials(pname(a))}</span>
          <div><h3>${esc(pname(a))}</h3><p>${esc(pphone(a))}</p></div>
          <i class="${statusClass(a.status)}">${esc(a.status||'Scheduled')}</i>
        </div>
        <div class="v16-detail-grid">
          <div><small>Visit Type</small><b>${esc(a.visitType||'Session')}</b></div>
          <div><small>Therapist</small><b>${esc(a.therapist||'Not assigned')}</b></div>
          <div><small>Room</small><b>${esc(a.room||'—')}</b></div>
          <div><small>Date</small><b>${esc(a.date||'—')}</b></div>
        </div>
        ${a.notes?`<div class="v16-panel-note"><small>Notes</small><p>${esc(a.notes)}</p></div>`:''}
        <div class="v16-journey">
          <h4>Patient Journey</h4>
          <div>${['Scheduled','Confirmed','Checked In','In Session','Completed'].map((s,i)=>{
            const order=['Scheduled','Confirmed','Checked In','In Session','Completed'];
            const current=order.indexOf(a.status);
            return `<span class="${i<=current?'done':''}"><i>${i<current?'✓':i+1}</i><small>${s}</small></span>`;
          }).join('')}</div>
        </div>
        <div class="v16-panel-actions">
          <button onclick="updateAppointmentStatusPro('${a.id}','Checked In');openV16Appointment('${a.id}')">Check In</button>
          <button onclick="updateAppointmentStatusPro('${a.id}','In Session');openV16Appointment('${a.id}')">Start Session</button>
          <button class="primary" onclick="updateAppointmentStatusPro('${a.id}','Completed');openV16Appointment('${a.id}')">Complete</button>
          <button onclick="editAppointmentPro('${a.id}');closeV16Appointment()">Edit</button>
          <button onclick="createFollowUpFromAppointment('${a.id}');closeV16Appointment()">Next Visit</button>
          <button onclick="createInvoiceFromAppointment('${a.id}');closeV16Appointment()">Create Invoice</button>
        </div>
      </aside>`;
  };
  window.closeV16Appointment=function(){
    const s=document.getElementById('v16-shade'); if(s) s.className='';
    renderTimeline();
  };

  function css(){
    if(document.getElementById('v16-css')) return;
    const st=document.createElement('style'); st.id='v16-css';
    st.textContent=`
      #v16-timeline{margin-bottom:22px;background:#f7fafb;border:1px solid #dce7e9;border-radius:20px;padding:20px;box-shadow:0 10px 30px rgba(21,65,75,.05)}
      .v16-top{display:flex;justify-content:space-between;gap:20px;align-items:flex-end}
      .v16-top small{font-size:10px;letter-spacing:1.6px;font-weight:800;color:#b48a3c}.v16-top h2{margin:4px 0;font-size:29px;color:#173f49}.v16-top p{margin:0;color:#718288}
      .v16-controls{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.v16-controls>button,.v16-controls input,.v16-toggle{height:38px;border:1px solid #d9e4e7;background:#fff;border-radius:9px}
      .v16-controls>button{padding:0 12px;cursor:pointer}.v16-controls input{padding:0 9px}.v16-today{font-weight:700;color:#174f5b}
      .v16-toggle{display:flex;padding:3px;height:32px}.v16-toggle button{border:0;background:transparent;border-radius:6px;padding:0 11px;cursor:pointer}.v16-toggle button.active{background:#174f5b;color:#fff}
      .v16-legend{display:flex;gap:13px;flex-wrap:wrap;margin:15px 0 12px;font-size:10px;color:#64777d}.v16-legend span{display:flex;align-items:center;gap:5px}.v16-legend i{width:8px;height:8px;border-radius:50%;background:#5b8def}
      .v16-legend .confirmed i{background:#1fa97a}.v16-legend .checked-in i{background:#d39a2c}.v16-legend .in-session i{background:#8b5cf6}.v16-legend .completed i{background:#2f855a}.v16-legend .no-show i{background:#6b7280}.v16-legend .cancelled i{background:#d35d6e}
      .v16-board-wrap{overflow:auto;border:1px solid #dfe8ea;border-radius:14px;background:#fff}.v16-board{position:relative;display:grid;grid-template-columns:72px repeat(var(--cols),minmax(220px,1fr));min-width:max-content}
      .v16-times,.v16-resource{position:relative;border-right:1px solid #e7edef}.v16-time-head,.v16-resource-head{height:58px;box-sizing:border-box;border-bottom:1px solid #e2eaec;background:#fbfdfd;position:sticky;top:0;z-index:5}
      .v16-time-head{display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#8a999d}
      .v16-resource-head{display:flex;align-items:center;gap:9px;padding:10px 12px}.v16-resource-avatar{width:34px;height:34px;border-radius:10px;background:#e8f2f4;color:#174f5b;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800}
      .v16-resource-head b,.v16-resource-head small{display:block}.v16-resource-head b{font-size:12px;color:#294d55}.v16-resource-head small{font-size:9px;color:#87969a;margin-top:2px}
      .v16-time-body,.v16-resource-body{height:${(END_HOUR-START_HOUR)*2*SLOT_H}px;position:relative}.v16-resource-body{min-width:220px}
      .v16-slot{position:absolute;left:0;right:0;height:${SLOT_H}px;border-bottom:1px dashed #edf1f2}.v16-hour-label,.v16-half-label{position:absolute;right:10px;transform:translateY(-6px);font-size:9px;color:#72858a}.v16-half-label{color:#a3afb2;font-size:8px}
      .v16-event{position:absolute;left:7px;right:7px;border:0;border-left:4px solid #5b8def;background:#edf4ff;border-radius:9px;padding:7px 8px;text-align:left;cursor:pointer;overflow:hidden;box-shadow:0 2px 7px rgba(40,70,80,.07);z-index:2}
      .v16-event.confirmed{border-color:#1fa97a;background:#ecfaf5}.v16-event.checked-in{border-color:#d39a2c;background:#fff8e8}.v16-event.in-session{border-color:#8b5cf6;background:#f5f0ff}.v16-event.completed{border-color:#2f855a;background:#edf8f1}.v16-event.no-show{border-color:#6b7280;background:#f2f3f4}.v16-event.cancelled{border-color:#d35d6e;background:#fff0f2;opacity:.72}
      .v16-event-time,.v16-event b,.v16-event small,.v16-event em{display:block}.v16-event-time{font-size:9px;color:#72858a}.v16-event b{font-size:11px;color:#264b54;margin:2px 0}.v16-event small{font-size:9px;color:#718287}.v16-event em{position:absolute;right:7px;top:7px;font-style:normal;font-size:8px;color:#849397}
      #v16-now-line{position:absolute;left:72px;right:0;height:2px;background:#d94b4b;z-index:4;pointer-events:none}#v16-now-line:before{content:"";position:absolute;left:-4px;top:-3px;width:8px;height:8px;border-radius:50%;background:#d94b4b}
      #v16-now-label{position:absolute;left:3px;right:0;z-index:6;pointer-events:none}#v16-now-label span{background:#d94b4b;color:#fff;border-radius:4px;padding:2px 4px;font-size:7px;font-weight:800}
      #v16-shade{display:none}#v16-shade.open{display:block;position:fixed;inset:0;z-index:99999}.v16-overlay{position:absolute;inset:0;background:rgba(14,32,38,.38);backdrop-filter:blur(2px)}
      .v16-panel{position:absolute;right:0;top:0;bottom:0;width:min(440px,94vw);background:#fff;padding:22px;box-shadow:-15px 0 45px rgba(0,0,0,.14);overflow:auto;animation:v16in .22s ease-out}
      @keyframes v16in{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}
      .v16-panel-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e8edef;padding-bottom:15px}.v16-panel-head small{font-size:9px;letter-spacing:1.4px;color:#ad8337;font-weight:800}.v16-panel-head h3{margin:4px 0 0}.v16-panel-head button{border:0;background:#f2f6f7;width:32px;height:32px;border-radius:50%;font-size:20px;cursor:pointer}
      .v16-patient-card{display:flex;align-items:center;gap:11px;padding:18px 0}.v16-patient-card>span{width:48px;height:48px;border-radius:14px;background:#e8f2f4;color:#174f5b;display:flex;align-items:center;justify-content:center;font-weight:800}.v16-patient-card h3,.v16-patient-card p{margin:0}.v16-patient-card p{font-size:11px;color:#819095;margin-top:3px}.v16-patient-card>i{margin-left:auto;font-style:normal;font-size:9px;background:#eef4f5;border-radius:999px;padding:5px 8px}
      .v16-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.v16-detail-grid>div,.v16-panel-note{border:1px solid #e5ecee;border-radius:10px;padding:11px}.v16-detail-grid small,.v16-detail-grid b{display:block}.v16-detail-grid small,.v16-panel-note small{font-size:9px;color:#89979b}.v16-detail-grid b{font-size:11px;margin-top:4px;color:#31535b}.v16-panel-note{margin-top:9px}.v16-panel-note p{margin:5px 0 0;font-size:11px}
      .v16-journey{margin:18px 0}.v16-journey h4{margin-bottom:12px}.v16-journey>div{display:flex;justify-content:space-between;position:relative}.v16-journey>div:before{content:"";position:absolute;left:8%;right:8%;top:13px;height:2px;background:#e4eaec}.v16-journey span{position:relative;z-index:1;text-align:center;width:20%}.v16-journey i{width:26px;height:26px;border-radius:50%;background:#edf1f2;display:flex;align-items:center;justify-content:center;margin:auto;font-style:normal;font-size:9px}.v16-journey span.done i{background:#174f5b;color:#fff}.v16-journey small{display:block;font-size:8px;margin-top:5px;color:#74858a}
      .v16-panel-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.v16-panel-actions button{border:1px solid #dbe5e7;background:#fff;border-radius:9px;padding:10px;cursor:pointer;color:#31545c}.v16-panel-actions .primary{background:#174f5b;color:#fff;border-color:#174f5b}
      @media(max-width:850px){.v16-top{align-items:flex-start;flex-direction:column}.v16-controls{width:100%}.v16-detail-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  function init(){
    css();
    setTimeout(renderTimeline,350);
    setInterval(drawNowLine,60000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();


/* =========================================================
   myAIMS V17 - APPOINTMENTS LAYOUT REPAIR
   Structural fix: appointment enhancements can only live
   inside #page-appointments, never inside the sidebar.
   ========================================================= */
(function () {
  const APPOINTMENTS_PAGE_ID = 'page-appointments';

  function page() {
    return document.getElementById(APPOINTMENTS_PAGE_ID);
  }

  function sidebar() {
    return document.querySelector('.sidebar, #sidebar, aside');
  }

  function appointmentNav() {
    return document.querySelector('.nav-item[data-page="appointments"]');
  }

  function removeBrokenSidebarInjections() {
    const side = sidebar();
    if (!side) return;

    [
      '#appointments-pro-panel',
      '#v15-visual-scheduler',
      '#v16-timeline'
    ].forEach(sel => {
      side.querySelectorAll(sel).forEach(el => {
        const target = page();
        if (target && sel === '#v16-timeline') {
          placeTimeline(el);
        } else {
          el.remove();
        }
      });
    });
  }

  function placeTimeline(el) {
    const target = page();
    if (!target || !el) return;

    const title = target.querySelector(':scope > .page-title');
    if (title) title.insertAdjacentElement('afterend', el);
    else target.prepend(el);
  }

  function repairExistingPanels() {
    const target = page();
    if (!target) return;

    // V14/V15 were experimental presentation layers.
    // Keep them disabled so V16 remains the single clean scheduler.
    document.querySelectorAll('#appointments-pro-panel, #v15-visual-scheduler')
      .forEach(el => {
        if (el.closest('.sidebar, #sidebar, aside')) el.remove();
        else el.style.display = 'none';
      });

    const timeline = document.getElementById('v16-timeline');
    if (timeline && !target.contains(timeline)) {
      placeTimeline(timeline);
    }

    // Keep the old table as an optional compact list below the scheduler.
    const oldPanel = [...target.children].find(el =>
      el.matches('article.panel') && el.querySelector('#appointmentsBody')
    );
    if (oldPanel) {
      oldPanel.classList.add('v17-original-list');
      oldPanel.style.display = window.__v17ListOpen ? '' : 'none';
    }
  }

  window.toggleV17AppointmentList = function () {
    window.__v17ListOpen = !window.__v17ListOpen;
    const target = page();
    const oldPanel = target?.querySelector('.v17-original-list');
    if (oldPanel) oldPanel.style.display = window.__v17ListOpen ? '' : 'none';

    const btn = document.getElementById('v17-list-toggle');
    if (btn) btn.textContent = window.__v17ListOpen ? 'Hide List' : 'List View';
  };

  function installPageHeaderControls() {
    const target = page();
    if (!target) return;

    const title = target.querySelector(':scope > .page-title');
    if (!title || document.getElementById('v17-list-toggle')) return;

    let actions = title.querySelector('.v17-page-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'v17-page-actions';

      const existingNew = title.querySelector('[data-open="appointmentModal"]');
      if (existingNew) actions.appendChild(existingNew);

      const listBtn = document.createElement('button');
      listBtn.type = 'button';
      listBtn.id = 'v17-list-toggle';
      listBtn.className = 'v17-secondary';
      listBtn.textContent = 'List View';
      listBtn.onclick = window.toggleV17AppointmentList;
      actions.appendChild(listBtn);

      title.appendChild(actions);
    }
  }

  function forceOpenAppointmentsPage() {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = page();
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n =>
      n.classList.toggle('active', n.dataset.page === 'appointments')
    );

    // Hide dynamic feature hosts that can sit above normal pages.
    ['v12-feature-host', 'v13-users-host'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    // Restore normal page display in case V12/V13 stored inline display:none.
    const main = target?.parentElement;
    if (main) {
      [...main.children].forEach(el => {
        if (el.classList.contains('page')) {
          el.style.display = '';
        }
      });
    }

    repairExistingPanels();
    setTimeout(() => {
      if (typeof window.renderV16Timeline === 'function') {
        try { window.renderV16Timeline(); } catch(e) {}
      }
      repairExistingPanels();
    }, 30);
  }

  function bindAppointmentNav() {
    const nav = appointmentNav();
    if (!nav || nav.dataset.v17Bound === '1') return;
    nav.dataset.v17Bound = '1';

    // Use bubble phase so the original navigation may run first,
    // then V17 guarantees the correct final layout.
    nav.addEventListener('click', () => {
      setTimeout(forceOpenAppointmentsPage, 0);
    });
  }

  function protectTimelineRenderer() {
    if (typeof window.renderV16Timeline !== 'function' || window.renderV16Timeline.__v17Wrapped) return;

    const original = window.renderV16Timeline;
    const wrapped = function () {
      const result = original.apply(this, arguments);
      setTimeout(repairExistingPanels, 0);
      return result;
    };
    wrapped.__v17Wrapped = true;
    window.renderV16Timeline = wrapped;
  }

  function css() {
    if (document.getElementById('myaims-v17-css')) return;

    const st = document.createElement('style');
    st.id = 'myaims-v17-css';
    st.textContent = `
      /* Absolute protection against scheduler content inside sidebar */
      .sidebar #appointments-pro-panel,
      .sidebar #v15-visual-scheduler,
      .sidebar #v16-timeline,
      #sidebar #appointments-pro-panel,
      #sidebar #v15-visual-scheduler,
      #sidebar #v16-timeline,
      aside #appointments-pro-panel,
      aside #v15-visual-scheduler,
      aside #v16-timeline {
        display:none !important;
      }

      /* V14/V15 are superseded by V16 */
      #page-appointments > #appointments-pro-panel,
      #page-appointments > #v15-visual-scheduler {
        display:none !important;
      }

      #page-appointments {
        width:100%;
        min-width:0;
      }

      #page-appointments.active {
        display:block;
      }

      #page-appointments > .page-title {
        margin-bottom:16px;
        align-items:center;
      }

      #page-appointments #v16-timeline {
        display:block !important;
        width:100%;
        max-width:none;
        margin:0 0 20px 0;
        box-sizing:border-box;
      }

      .v17-page-actions {
        display:flex;
        gap:8px;
        align-items:center;
        margin-left:auto;
      }

      .v17-secondary {
        border:1px solid #d7e3e6;
        background:#fff;
        color:#27525c;
        border-radius:9px;
        padding:10px 14px;
        font-weight:700;
        cursor:pointer;
      }

      .v17-secondary:hover {
        background:#f3f8f9;
      }

      #page-appointments .v17-original-list {
        margin-top:14px;
      }

      /* Sidebar must remain a navigation column only */
      .sidebar, #sidebar, aside.sidebar {
        overflow-x:hidden;
      }

      .sidebar > *,
      #sidebar > * {
        max-width:100%;
        box-sizing:border-box;
      }

      @media(max-width:760px){
        .v17-page-actions {
          width:100%;
          margin-left:0;
          flex-wrap:wrap;
        }
        #page-appointments > .page-title {
          align-items:flex-start;
          flex-direction:column;
        }
      }
    `;
    document.head.appendChild(st);
  }

  function repair() {
    css();
    bindAppointmentNav();
    protectTimelineRenderer();
    removeBrokenSidebarInjections();
    repairExistingPanels();
    installPageHeaderControls();
  }

  function init() {
    repair();

    // V14/V15/V16 contain render observers; this guard corrects
    // any future accidental sidebar injection immediately.
    const observer = new MutationObserver(() => {
      clearTimeout(window.__v17RepairTimer);
      window.__v17RepairTimer = setTimeout(repair, 20);
    });
    observer.observe(document.body, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


/* =========================================================
   myAIMS V18 - PROFESSIONAL NEW APPOINTMENT MODAL
   Patient / therapist / room / date / time / duration /
   visit type / availability check / notes.
   ========================================================= */
(function(){
  const S = () => window.state || window.appState || {};
  const save = () => { if (typeof window.saveState === 'function') window.saveState(); };

  const VISITS = [
    'Initial Assessment',
    'Physiotherapy Session',
    'Rehabilitation Session',
    'Follow-up',
    'Consultation'
  ];
  const DURATIONS = [30,45,60,90];

  function ensure(){
    if(!Array.isArray(S().appointments)) S().appointments = [];
    if(!Array.isArray(S().patients)) S().patients = [];
  }

  function pname(p){ return p.name || p.fullName || p.patientName || 'Patient'; }

  function therapistList(){
    const vals=[...new Set((S().appointments||[]).map(a=>a.therapist).filter(Boolean))];
    return vals.length ? vals : ['Dr. Eman','Therapist 2','Therapist 3'];
  }

  function roomList(){
    const vals=[...new Set((S().appointments||[]).map(a=>a.room).filter(Boolean))];
    return vals.length ? vals : ['Treatment Room 1','Treatment Room 2','Treatment Room 3'];
  }

  function mins(t){
    const [h,m]=String(t||'00:00').split(':').map(Number);
    return h*60+(m||0);
  }

  function conflict(candidate){
    return (S().appointments||[]).find(a=>{
      if(a.date!==candidate.date) return false;
      if(['Cancelled','No Show'].includes(a.status||'Scheduled')) return false;
      const sameTherapist = candidate.therapist && a.therapist===candidate.therapist;
      const sameRoom = candidate.room && a.room===candidate.room;
      if(!sameTherapist && !sameRoom) return false;

      const aStart=mins(a.time), aEnd=aStart+Number(a.duration||60);
      const cStart=mins(candidate.time), cEnd=cStart+Number(candidate.duration||60);
      return cStart < aEnd && cEnd > aStart;
    });
  }

  function availableSlots(date, therapist, room, duration){
    const out=[];
    for(let h=8;h<20;h++){
      for(const m of [0,30]){
        const t=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
        const c={date,time:t,therapist,room,duration};
        if(!conflict(c)) out.push(t);
      }
    }
    return out;
  }

  function modal(){
    let root=document.getElementById('v18-appt-modal');
    if(!root){
      root=document.createElement('div');
      root.id='v18-appt-modal';
      document.body.appendChild(root);
    }
    return root;
  }

  function patientOptions(){
    return (S().patients||[]).map(p=>`<option value="${p.id}">${pname(p)}</option>`).join('');
  }

  function renderSlots(){
    const date=document.getElementById('v18-date')?.value;
    const therapist=document.getElementById('v18-therapist')?.value;
    const room=document.getElementById('v18-room')?.value;
    const duration=Number(document.getElementById('v18-duration')?.value||60);
    const wrap=document.getElementById('v18-slots');
    if(!wrap) return;

    const slots=availableSlots(date,therapist,room,duration);
    wrap.innerHTML=slots.length
      ? slots.map(t=>`<button type="button" onclick="selectV18Slot('${t}',this)">${t}</button>`).join('')
      : `<div class="v18-no-slots">No available slots for this therapist / room.</div>`;
  }

  window.selectV18Slot=function(time,el){
    document.getElementById('v18-time').value=time;
    document.querySelectorAll('#v18-slots button').forEach(b=>b.classList.toggle('active',b===el));
  };

  window.openV18Appointment=function(){
    ensure();
    const root=modal();
    const defaultDate=window.__v16Date || new Date().toISOString().slice(0,10);

    root.className='open';
    root.innerHTML=`
      <div class="v18-backdrop" onclick="closeV18Appointment()"></div>
      <section class="v18-dialog">
        <div class="v18-head">
          <div>
            <small>NEW APPOINTMENT</small>
            <h2>Schedule Patient Visit</h2>
            <p>Create an appointment and check therapist / room availability.</p>
          </div>
          <button onclick="closeV18Appointment()">×</button>
        </div>

        <div class="v18-form-grid">
          <label class="span2">
            <span>Patient</span>
            <select id="v18-patient">
              <option value="">Select patient</option>
              ${patientOptions()}
            </select>
          </label>

          <label>
            <span>Date</span>
            <input id="v18-date" type="date" value="${defaultDate}" onchange="renderV18Slots()">
          </label>

          <label>
            <span>Duration</span>
            <select id="v18-duration" onchange="renderV18Slots()">
              ${DURATIONS.map(d=>`<option value="${d}" ${d===60?'selected':''}>${d} min</option>`).join('')}
            </select>
          </label>

          <label>
            <span>Therapist</span>
            <select id="v18-therapist" onchange="renderV18Slots()">
              ${therapistList().map(x=>`<option>${x}</option>`).join('')}
            </select>
          </label>

          <label>
            <span>Room</span>
            <select id="v18-room" onchange="renderV18Slots()">
              ${roomList().map(x=>`<option>${x}</option>`).join('')}
            </select>
          </label>

          <label class="span2">
            <span>Visit Type</span>
            <select id="v18-visit">
              ${VISITS.map(v=>`<option>${v}</option>`).join('')}
            </select>
          </label>

          <label class="span2">
            <span>Available Time</span>
            <input id="v18-time" type="hidden">
            <div id="v18-slots" class="v18-slots"></div>
          </label>

          <label class="span2">
            <span>Appointment Notes</span>
            <textarea id="v18-notes" rows="3" placeholder="Optional notes"></textarea>
          </label>
        </div>

        <div id="v18-warning" class="v18-warning"></div>

        <div class="v18-footer">
          <button class="secondary" onclick="closeV18Appointment()">Cancel</button>
          <button class="primary" onclick="saveV18Appointment()">Save Appointment</button>
        </div>
      </section>`;
    setTimeout(renderSlots,30);
  };

  window.closeV18Appointment=function(){
    const root=document.getElementById('v18-appt-modal');
    if(root) root.className='';
  };

  window.renderV18Slots=renderSlots;

  window.saveV18Appointment=function(){
    const patientId=document.getElementById('v18-patient')?.value;
    const date=document.getElementById('v18-date')?.value;
    const time=document.getElementById('v18-time')?.value;
    const therapist=document.getElementById('v18-therapist')?.value;
    const room=document.getElementById('v18-room')?.value;
    const duration=Number(document.getElementById('v18-duration')?.value||60);
    const visitType=document.getElementById('v18-visit')?.value;
    const notes=document.getElementById('v18-notes')?.value || '';
    const warning=document.getElementById('v18-warning');

    if(!patientId || !date || !time){
      if(warning) warning.textContent='Please select patient, date and an available time.';
      return;
    }

    const candidate={patientId,date,time,therapist,room,duration,visitType};
    const clash=conflict(candidate);
    if(clash){
      if(warning) warning.textContent='This time is no longer available. Please select another slot.';
      renderSlots();
      return;
    }

    S().appointments.push({
      id:'APT-'+Date.now(),
      patientId,
      date,
      time,
      therapist,
      room,
      duration,
      visitType,
      notes,
      status:'Scheduled',
      checkedInAt:'',
      completedAt:'',
      followUpNeeded:false
    });

    save();
    if(typeof window.logAudit==='function'){
      const p=(S().patients||[]).find(x=>String(x.id)===String(patientId));
      window.logAudit('Create Appointment','Appointments',`${p?pname(p):'Patient'} — ${date} ${time}`);
    }

    window.__v16Date=date;
    closeV18Appointment();

    if(typeof window.renderAppointments==='function') try{ window.renderAppointments(); }catch(e){}
    if(typeof window.renderV16Timeline==='function') try{ window.renderV16Timeline(); }catch(e){}
    if(typeof window.renderVisualScheduler==='function') try{ window.renderVisualScheduler(); }catch(e){}
  };

  function replaceButtons(){
    const page=document.getElementById('page-appointments');
    if(page){
      page.querySelectorAll('[data-open="appointmentModal"], button').forEach(btn=>{
        const txt=(btn.textContent||'').toLowerCase();
        if(btn.dataset?.open==='appointmentModal' || txt.includes('new appointment')){
          if(btn.dataset.v18Bound==='1') return;
          btn.dataset.v18Bound='1';
          btn.onclick=function(e){
            e.preventDefault();
            e.stopPropagation();
            openV18Appointment();
          };
        }
      });
    }

    document.querySelectorAll('button').forEach(btn=>{
      const txt=(btn.textContent||'').trim().toLowerCase();
      if(txt==='+ new appointment' || txt==='new appointment'){
        if(btn.dataset.v18Bound==='1') return;
        btn.dataset.v18Bound='1';
        btn.onclick=function(e){
          e.preventDefault();
          e.stopPropagation();
          openV18Appointment();
        };
      }
    });
  }

  function addTimelineButton(){
    const page=document.getElementById('page-appointments');
    const top=page?.querySelector('#v16-timeline .v16-top');
    if(!top || document.getElementById('v18-timeline-new')) return;

    const btn=document.createElement('button');
    btn.id='v18-timeline-new';
    btn.className='v18-new-btn';
    btn.innerHTML='+ New Appointment';
    btn.onclick=openV18Appointment;

    const controls=top.querySelector('.v16-controls');
    if(controls) controls.prepend(btn);
  }

  function css(){
    if(document.getElementById('v18-css')) return;
    const st=document.createElement('style');
    st.id='v18-css';
    st.textContent=`
      #v18-appt-modal{display:none}
      #v18-appt-modal.open{display:block;position:fixed;inset:0;z-index:100000}
      .v18-backdrop{position:absolute;inset:0;background:rgba(12,31,37,.44);backdrop-filter:blur(3px)}
      .v18-dialog{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(760px,94vw);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 28px 80px rgba(0,0,0,.22);padding:22px}
      .v18-head{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #e6edef;padding-bottom:15px;margin-bottom:17px}
      .v18-head small{font-size:9px;letter-spacing:1.5px;font-weight:800;color:#b68a3b}.v18-head h2{margin:4px 0;color:#173f49}.v18-head p{margin:0;color:#7b8b90;font-size:12px}
      .v18-head>button{border:0;background:#f1f5f6;width:34px;height:34px;border-radius:50%;font-size:22px;cursor:pointer}
      .v18-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .v18-form-grid label{display:flex;flex-direction:column;gap:6px}.v18-form-grid label>span{font-size:11px;font-weight:700;color:#50686f}
      .v18-form-grid input,.v18-form-grid select,.v18-form-grid textarea{border:1px solid #d9e4e7;border-radius:9px;padding:10px 11px;background:#fff;font:inherit;color:#294c55}
      .v18-form-grid .span2{grid-column:1/-1}
      .v18-slots{display:flex;gap:7px;flex-wrap:wrap;background:#f7fafb;border:1px solid #e1eaec;border-radius:10px;padding:10px;min-height:50px}
      .v18-slots button{border:1px solid #d8e4e7;background:#fff;border-radius:8px;padding:7px 10px;cursor:pointer;font-size:11px;color:#34565e}
      .v18-slots button:hover,.v18-slots button.active{background:#174f5b;color:#fff;border-color:#174f5b}
      .v18-no-slots{color:#9a6565;font-size:11px;padding:8px}
      .v18-warning{min-height:18px;margin-top:9px;color:#b44747;font-size:11px;font-weight:700}
      .v18-footer{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #e8edef;margin-top:12px;padding-top:14px}
      .v18-footer button,.v18-new-btn{border-radius:9px;padding:10px 14px;font-weight:700;cursor:pointer}
      .v18-footer .secondary{border:1px solid #d9e3e6;background:#fff;color:#385961}.v18-footer .primary,.v18-new-btn{border:1px solid #c99a42;background:#c99a42;color:#fff}
      .v18-new-btn{height:38px;padding:0 13px!important;white-space:nowrap}
      @media(max-width:650px){.v18-dialog{padding:16px}.v18-form-grid{grid-template-columns:1fr}.v18-form-grid .span2{grid-column:auto}}
    `;
    document.head.appendChild(st);
  }

  function repair(){
    replaceButtons();
    addTimelineButton();
  }

  function init(){
    ensure();
    css();
    repair();
    const obs=new MutationObserver(()=>{
      clearTimeout(window.__v18t);
      window.__v18t=setTimeout(repair,30);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();


/* =========================================================
   myAIMS V19 - RECURRING SESSIONS + TREATMENT PACKAGES
   Bulk booking with conflict checks + package progress.
   ========================================================= */
(function(){
  const S = () => window.state || window.appState || {};
  const save = () => { if (typeof window.saveState === 'function') window.saveState(); };

  function ensureV19(){
    if(!Array.isArray(S().appointments)) S().appointments = [];
    if(!Array.isArray(S().patients)) S().patients = [];
    if(!Array.isArray(S().treatmentPackages)) S().treatmentPackages = [];
  }

  function pnameById(id){
    const p=(S().patients||[]).find(x=>String(x.id)===String(id));
    return p ? (p.name||p.fullName||p.patientName||'Patient') : 'Patient';
  }

  function mins(t){
    const [h,m]=String(t||'00:00').split(':').map(Number);
    return h*60+(m||0);
  }

  function addDays(dateStr,n){
    const d=new Date(dateStr+'T00:00:00');
    d.setDate(d.getDate()+n);
    return d.toISOString().slice(0,10);
  }

  function clash(c){
    return (S().appointments||[]).find(a=>{
      if(a.date!==c.date) return false;
      if(['Cancelled','No Show'].includes(a.status||'Scheduled')) return false;

      const sameTherapist = c.therapist && a.therapist===c.therapist;
      const sameRoom = c.room && a.room===c.room;
      if(!sameTherapist && !sameRoom) return false;

      const s1=mins(a.time), e1=s1+Number(a.duration||60);
      const s2=mins(c.time), e2=s2+Number(c.duration||60);
      return s2<e1 && e2>s1;
    });
  }

  function modalRoot(){
    let r=document.getElementById('v19-modal');
    if(!r){
      r=document.createElement('div');
      r.id='v19-modal';
      document.body.appendChild(r);
    }
    return r;
  }

  function patientOptions(){
    return (S().patients||[]).map(p=>
      `<option value="${p.id}">${pnameById(p.id)}</option>`
    ).join('');
  }

  function therapists(){
    const vals=[...new Set((S().appointments||[]).map(a=>a.therapist).filter(Boolean))];
    return vals.length?vals:['Dr. Eman','Therapist 2','Therapist 3'];
  }

  function rooms(){
    const vals=[...new Set((S().appointments||[]).map(a=>a.room).filter(Boolean))];
    return vals.length?vals:['Treatment Room 1','Treatment Room 2','Treatment Room 3'];
  }

  window.openV19Recurring=function(){
    ensureV19();
    const r=modalRoot();
    const date=window.__v16Date || new Date().toISOString().slice(0,10);

    r.className='open';
    r.innerHTML=`
      <div class="v19-backdrop" onclick="closeV19Modal()"></div>
      <section class="v19-dialog">
        <div class="v19-head">
          <div>
            <small>RECURRING APPOINTMENTS</small>
            <h2>Book Treatment Plan</h2>
            <p>Create multiple sessions in one step with automatic conflict checking.</p>
          </div>
          <button onclick="closeV19Modal()">×</button>
        </div>

        <div class="v19-grid">
          <label class="span2">
            <span>Patient</span>
            <select id="v19-patient">
              <option value="">Select patient</option>
              ${patientOptions()}
            </select>
          </label>

          <label>
            <span>Package / Plan Name</span>
            <input id="v19-package-name" value="Physiotherapy Package">
          </label>

          <label>
            <span>Number of Sessions</span>
            <select id="v19-count">
              ${[4,6,8,10,12,15,20].map(n=>`<option ${n===10?'selected':''}>${n}</option>`).join('')}
            </select>
          </label>

          <label>
            <span>First Session Date</span>
            <input id="v19-date" type="date" value="${date}">
          </label>

          <label>
            <span>Start Time</span>
            <input id="v19-time" type="time" value="10:00">
          </label>

          <label>
            <span>Frequency</span>
            <select id="v19-frequency">
              <option value="7">Weekly</option>
              <option value="14">Every 2 Weeks</option>
              <option value="3">Every 3 Days</option>
              <option value="2">Every 2 Days</option>
            </select>
          </label>

          <label>
            <span>Duration</span>
            <select id="v19-duration">
              ${[30,45,60,90].map(n=>`<option value="${n}" ${n===60?'selected':''}>${n} min</option>`).join('')}
            </select>
          </label>

          <label>
            <span>Therapist</span>
            <select id="v19-therapist">
              ${therapists().map(x=>`<option>${x}</option>`).join('')}
            </select>
          </label>

          <label>
            <span>Room</span>
            <select id="v19-room">
              ${rooms().map(x=>`<option>${x}</option>`).join('')}
            </select>
          </label>

          <label class="span2">
            <span>Visit Type</span>
            <select id="v19-visit">
              <option>Physiotherapy Session</option>
              <option>Rehabilitation Session</option>
              <option>Follow-up</option>
              <option>Consultation</option>
            </select>
          </label>

          <label class="span2">
            <span>Notes</span>
            <textarea id="v19-notes" rows="3" placeholder="Optional treatment plan notes"></textarea>
          </label>
        </div>

        <div class="v19-preview-wrap">
          <div class="v19-preview-head">
            <h3>Schedule Preview</h3>
            <button onclick="previewV19Recurring()">Refresh Preview</button>
          </div>
          <div id="v19-preview"></div>
        </div>

        <div id="v19-warning" class="v19-warning"></div>

        <div class="v19-footer">
          <button class="secondary" onclick="closeV19Modal()">Cancel</button>
          <button class="primary" onclick="saveV19Recurring()">Create Sessions</button>
        </div>
      </section>`;

    setTimeout(previewV19Recurring,30);
  };

  window.closeV19Modal=function(){
    const r=document.getElementById('v19-modal');
    if(r) r.className='';
  };

  function recurringCandidates(){
    const count=Number(document.getElementById('v19-count')?.value||10);
    const first=document.getElementById('v19-date')?.value;
    const time=document.getElementById('v19-time')?.value;
    const gap=Number(document.getElementById('v19-frequency')?.value||7);
    const duration=Number(document.getElementById('v19-duration')?.value||60);
    const therapist=document.getElementById('v19-therapist')?.value;
    const room=document.getElementById('v19-room')?.value;

    const list=[];
    for(let i=0;i<count;i++){
      const c={date:addDays(first,i*gap),time,duration,therapist,room};
      c.conflict=clash(c);
      list.push(c);
    }
    return list;
  }

  window.previewV19Recurring=function(){
    const wrap=document.getElementById('v19-preview');
    if(!wrap) return;
    const rows=recurringCandidates();
    wrap.innerHTML=`
      <div class="v19-preview-grid">
        ${rows.map((x,i)=>`
          <div class="v19-preview-item ${x.conflict?'conflict':'ok'}">
            <span>${i+1}</span>
            <div><b>${x.date}</b><small>${x.time} · ${x.duration} min</small></div>
            <em>${x.conflict?'Conflict':'Available'}</em>
          </div>`).join('')}
      </div>`;
  };

  window.saveV19Recurring=function(){
    const patientId=document.getElementById('v19-patient')?.value;
    const packageName=document.getElementById('v19-package-name')?.value || 'Treatment Package';
    const visitType=document.getElementById('v19-visit')?.value;
    const notes=document.getElementById('v19-notes')?.value || '';
    const warning=document.getElementById('v19-warning');
    const rows=recurringCandidates();

    if(!patientId){
      if(warning) warning.textContent='Please select a patient.';
      return;
    }

    const conflicts=rows.filter(x=>x.conflict);
    if(conflicts.length){
      if(warning) warning.textContent=`${conflicts.length} session(s) conflict with existing therapist / room bookings. Adjust the plan first.`;
      previewV19Recurring();
      return;
    }

    const packageId='PKG-'+Date.now();

    S().treatmentPackages.push({
      id:packageId,
      patientId,
      name:packageName,
      totalSessions:rows.length,
      createdAt:new Date().toISOString(),
      status:'Active'
    });

    rows.forEach((x,i)=>{
      S().appointments.push({
        id:'APT-'+Date.now()+'-'+i,
        patientId,
        date:x.date,
        time:x.time,
        duration:x.duration,
        therapist:x.therapist,
        room:x.room,
        visitType,
        notes,
        status:'Scheduled',
        packageId,
        sessionNumber:i+1,
        followUpNeeded:false,
        checkedInAt:'',
        completedAt:''
      });
    });

    save();

    if(typeof window.logAudit==='function'){
      window.logAudit(
        'Create Recurring Sessions',
        'Appointments',
        `${pnameById(patientId)} — ${packageName} — ${rows.length} sessions`
      );
    }

    window.__v16Date=rows[0]?.date || window.__v16Date;
    closeV19Modal();

    if(typeof window.renderAppointments==='function') try{window.renderAppointments();}catch(e){}
    if(typeof window.renderV16Timeline==='function') try{window.renderV16Timeline();}catch(e){}
    renderV19PackageStrip();
  };

  function packageProgress(pkg){
    const related=(S().appointments||[]).filter(a=>a.packageId===pkg.id);
    const completed=related.filter(a=>a.status==='Completed').length;
    const remaining=Math.max(0,Number(pkg.totalSessions||related.length)-completed);
    return {completed,remaining,total:Number(pkg.totalSessions||related.length)};
  }

  window.openV19Packages=function(){
    ensureV19();
    const r=modalRoot();
    const pkgs=(S().treatmentPackages||[]).slice().reverse();

    r.className='open';
    r.innerHTML=`
      <div class="v19-backdrop" onclick="closeV19Modal()"></div>
      <section class="v19-dialog packages">
        <div class="v19-head">
          <div>
            <small>TREATMENT PACKAGES</small>
            <h2>Patient Packages</h2>
            <p>Track completed and remaining sessions for each treatment plan.</p>
          </div>
          <button onclick="closeV19Modal()">×</button>
        </div>

        <div class="v19-package-list">
          ${pkgs.length ? pkgs.map(pkg=>{
            const p=packageProgress(pkg);
            const pct=p.total?Math.round((p.completed/p.total)*100):0;
            return `
              <article class="v19-package-card">
                <div class="v19-package-top">
                  <div><small>${esc19(pkg.id)}</small><h3>${esc19(pkg.name)}</h3><p>${esc19(pnameById(pkg.patientId))}</p></div>
                  <span>${p.completed}/${p.total}</span>
                </div>
                <div class="v19-progress"><i style="width:${pct}%"></i></div>
                <div class="v19-package-stats">
                  <span><b>${p.completed}</b> Completed</span>
                  <span><b>${p.remaining}</b> Remaining</span>
                  <span><b>${pct}%</b> Progress</span>
                </div>
              </article>`;
          }).join('') : `<div class="v19-empty">No treatment packages created yet.</div>`}
        </div>

        <div class="v19-footer">
          <button class="primary" onclick="closeV19Modal();openV19Recurring()">+ New Treatment Plan</button>
        </div>
      </section>`;
  };

  function esc19(s){
    return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function renderV19PackageStrip(){
    const page=document.getElementById('page-appointments');
    if(!page) return;

    let strip=document.getElementById('v19-package-strip');
    if(!strip){
      strip=document.createElement('div');
      strip.id='v19-package-strip';
      strip.className='v19-package-strip';
      const timeline=document.getElementById('v16-timeline');
      if(timeline) timeline.insertAdjacentElement('afterend',strip);
      else page.prepend(strip);
    }

    const active=(S().treatmentPackages||[]).filter(p=>p.status!=='Closed');
    if(!active.length){
      strip.style.display='none';
      return;
    }

    strip.style.display='flex';
    const totalRemaining=active.reduce((sum,p)=>sum+packageProgress(p).remaining,0);
    strip.innerHTML=`
      <div>
        <small>ACTIVE TREATMENT PLANS</small>
        <b>${active.length}</b>
        <span>${totalRemaining} sessions remaining</span>
      </div>
      <button onclick="openV19Packages()">View Packages</button>`;
  }

  function installButtons(){
    const timeline=document.querySelector('#page-appointments #v16-timeline .v16-controls');
    if(timeline && !document.getElementById('v19-recurring-btn')){
      const recurring=document.createElement('button');
      recurring.id='v19-recurring-btn';
      recurring.className='v19-toolbar-btn';
      recurring.textContent='+ Recurring Sessions';
      recurring.onclick=openV19Recurring;

      const packages=document.createElement('button');
      packages.id='v19-packages-btn';
      packages.className='v19-toolbar-btn secondary';
      packages.textContent='Packages';
      packages.onclick=openV19Packages;

      timeline.prepend(packages);
      timeline.prepend(recurring);
    }
  }

  function css(){
    if(document.getElementById('v19-css')) return;
    const st=document.createElement('style');
    st.id='v19-css';
    st.textContent=`
      #v19-modal{display:none}
      #v19-modal.open{display:block;position:fixed;inset:0;z-index:100001}
      .v19-backdrop{position:absolute;inset:0;background:rgba(12,31,37,.46);backdrop-filter:blur(3px)}
      .v19-dialog{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(820px,95vw);max-height:92vh;overflow:auto;background:#fff;border-radius:19px;padding:22px;box-shadow:0 30px 90px rgba(0,0,0,.24)}
      .v19-dialog.packages{width:min(760px,95vw)}
      .v19-head{display:flex;justify-content:space-between;gap:15px;border-bottom:1px solid #e6edef;padding-bottom:15px;margin-bottom:16px}
      .v19-head small{font-size:9px;letter-spacing:1.5px;font-weight:800;color:#b68a3b}.v19-head h2{margin:4px 0;color:#173f49}.v19-head p{margin:0;font-size:12px;color:#78898e}
      .v19-head>button{border:0;background:#f1f5f6;width:34px;height:34px;border-radius:50%;font-size:22px;cursor:pointer}
      .v19-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.v19-grid label{display:flex;flex-direction:column;gap:5px}.v19-grid label>span{font-size:11px;font-weight:700;color:#526b72}.v19-grid .span2{grid-column:1/-1}
      .v19-grid input,.v19-grid select,.v19-grid textarea{border:1px solid #d9e4e7;border-radius:9px;padding:10px;background:#fff;font:inherit;color:#2d4e56}
      .v19-preview-wrap{margin-top:15px;border:1px solid #e3eaec;border-radius:12px;padding:12px;background:#f8fbfb}
      .v19-preview-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}.v19-preview-head h3{margin:0;font-size:14px}.v19-preview-head button{border:1px solid #d9e4e7;background:#fff;border-radius:7px;padding:6px 9px;cursor:pointer}
      .v19-preview-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.v19-preview-item{display:flex;align-items:center;gap:9px;border:1px solid #e3eaec;background:#fff;border-radius:9px;padding:8px}
      .v19-preview-item>span{width:25px;height:25px;border-radius:8px;background:#eef4f5;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800}.v19-preview-item b,.v19-preview-item small{display:block}.v19-preview-item b{font-size:11px}.v19-preview-item small{font-size:9px;color:#849398;margin-top:2px}.v19-preview-item em{margin-left:auto;font-style:normal;font-size:9px;font-weight:800}
      .v19-preview-item.ok em{color:#23845f}.v19-preview-item.conflict{background:#fff4f4;border-color:#efd0d0}.v19-preview-item.conflict em{color:#bd4d4d}
      .v19-warning{min-height:18px;margin-top:9px;color:#b44747;font-size:11px;font-weight:700}
      .v19-footer{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #e8edef;margin-top:12px;padding-top:14px}.v19-footer button{border-radius:9px;padding:10px 14px;font-weight:700;cursor:pointer}.v19-footer .secondary{border:1px solid #d9e3e6;background:#fff;color:#385961}.v19-footer .primary{border:1px solid #c99a42;background:#c99a42;color:#fff}
      .v19-toolbar-btn{height:38px!important;border:1px solid #c99a42!important;background:#c99a42!important;color:#fff!important;border-radius:9px!important;padding:0 12px!important;font-weight:700;cursor:pointer;white-space:nowrap}.v19-toolbar-btn.secondary{background:#fff!important;color:#31545c!important;border-color:#d9e4e7!important}
      .v19-package-strip{display:flex;align-items:center;justify-content:space-between;gap:15px;background:#fff;border:1px solid #dfe8ea;border-radius:13px;padding:13px 15px;margin:0 0 16px}.v19-package-strip small,.v19-package-strip b,.v19-package-strip span{display:block}.v19-package-strip small{font-size:9px;color:#a17e3d;font-weight:800;letter-spacing:1px}.v19-package-strip b{font-size:20px;color:#173f49;margin:2px 0}.v19-package-strip span{font-size:10px;color:#7d8c91}.v19-package-strip button{border:1px solid #d9e4e7;background:#fff;border-radius:8px;padding:8px 11px;cursor:pointer}
      .v19-package-list{display:grid;gap:10px}.v19-package-card{border:1px solid #e1e9eb;border-radius:12px;padding:14px}.v19-package-top{display:flex;justify-content:space-between;gap:10px}.v19-package-top small{font-size:8px;color:#94a0a4}.v19-package-top h3{margin:3px 0 2px;color:#294d55}.v19-package-top p{margin:0;font-size:11px;color:#7d8c91}.v19-package-top>span{font-size:18px;font-weight:800;color:#174f5b}
      .v19-progress{height:7px;background:#edf2f3;border-radius:999px;overflow:hidden;margin:12px 0}.v19-progress i{display:block;height:100%;background:#c99a42;border-radius:999px}.v19-package-stats{display:flex;gap:22px;font-size:10px;color:#829095}.v19-package-stats b{color:#35565e;font-size:12px}.v19-empty{text-align:center;padding:35px;color:#8a989d}
      @media(max-width:680px){.v19-dialog{padding:15px}.v19-grid,.v19-preview-grid{grid-template-columns:1fr}.v19-grid .span2{grid-column:auto}.v19-package-stats{gap:10px;justify-content:space-between}}
    `;
    document.head.appendChild(st);
  }

  function repair(){
    installButtons();
    renderV19PackageStrip();
  }

  function init(){
    ensureV19();
    css();
    setTimeout(repair,350);
    const obs=new MutationObserver(()=>{
      clearTimeout(window.__v19t);
      window.__v19t=setTimeout(repair,40);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();


/* =========================================================
   myAIMS V20 - WAITING LIST + CANCELLATION FILL
   Smart waitlist matching for cancelled / available slots.
   ========================================================= */
(function(){
  const S = () => window.state || window.appState || {};
  const save = () => { if (typeof window.saveState === 'function') window.saveState(); };

  function ensureV20(){
    if(!Array.isArray(S().waitingList)) S().waitingList = [];
    if(!Array.isArray(S().appointments)) S().appointments = [];
    if(!Array.isArray(S().patients)) S().patients = [];
  }

  function pname(id){
    const p=(S().patients||[]).find(x=>String(x.id)===String(id));
    return p ? (p.name||p.fullName||p.patientName||'Patient') : 'Patient';
  }

  function pphone(id){
    const p=(S().patients||[]).find(x=>String(x.id)===String(id));
    return p ? (p.phone||p.mobile||p.contact||'—') : '—';
  }

  function esc(s){
    return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function modalRoot(){
    let r=document.getElementById('v20-modal');
    if(!r){
      r=document.createElement('div');
      r.id='v20-modal';
      document.body.appendChild(r);
    }
    return r;
  }

  function patientOptions(){
    return (S().patients||[]).map(p=>
      `<option value="${p.id}">${esc(pname(p.id))}</option>`
    ).join('');
  }

  window.openV20Waitlist=function(){
    ensureV20();
    const r=modalRoot();
    const date=window.__v16Date || new Date().toISOString().slice(0,10);

    r.className='open';
    r.innerHTML=`
      <div class="v20-backdrop" onclick="closeV20Modal()"></div>
      <section class="v20-dialog">
        <div class="v20-head">
          <div>
            <small>WAITING LIST</small>
            <h2>Add Patient to Waiting List</h2>
            <p>Record preferred timing and priority for earlier appointment opportunities.</p>
          </div>
          <button onclick="closeV20Modal()">×</button>
        </div>

        <div class="v20-grid">
          <label class="span2">
            <span>Patient</span>
            <select id="v20-patient">
              <option value="">Select patient</option>
              ${patientOptions()}
            </select>
          </label>

          <label>
            <span>Preferred From</span>
            <input id="v20-from" type="date" value="${date}">
          </label>

          <label>
            <span>Preferred To</span>
            <input id="v20-to" type="date" value="${date}">
          </label>

          <label>
            <span>Preferred Time</span>
            <select id="v20-time-pref">
              <option>Any Time</option>
              <option>Morning</option>
              <option>Afternoon</option>
              <option>Evening</option>
            </select>
          </label>

          <label>
            <span>Priority</span>
            <select id="v20-priority">
              <option>Normal</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </label>

          <label>
            <span>Therapist Preference</span>
            <input id="v20-therapist" placeholder="Optional">
          </label>

          <label>
            <span>Visit Type</span>
            <input id="v20-visit" value="Physiotherapy Session">
          </label>

          <label class="span2">
            <span>Notes</span>
            <textarea id="v20-notes" rows="3" placeholder="Reason, flexibility, contact preference..."></textarea>
          </label>
        </div>

        <div id="v20-warning" class="v20-warning"></div>

        <div class="v20-footer">
          <button class="secondary" onclick="closeV20Modal()">Cancel</button>
          <button class="primary" onclick="saveV20Waitlist()">Add to Waiting List</button>
        </div>
      </section>`;
  };

  window.closeV20Modal=function(){
    const r=document.getElementById('v20-modal');
    if(r) r.className='';
  };

  window.saveV20Waitlist=function(){
    const patientId=document.getElementById('v20-patient')?.value;
    const warning=document.getElementById('v20-warning');
    if(!patientId){
      if(warning) warning.textContent='Please select a patient.';
      return;
    }

    S().waitingList.push({
      id:'WAIT-'+Date.now(),
      patientId,
      from:document.getElementById('v20-from')?.value,
      to:document.getElementById('v20-to')?.value,
      timePreference:document.getElementById('v20-time-pref')?.value || 'Any Time',
      priority:document.getElementById('v20-priority')?.value || 'Normal',
      therapist:document.getElementById('v20-therapist')?.value || '',
      visitType:document.getElementById('v20-visit')?.value || 'Physiotherapy Session',
      notes:document.getElementById('v20-notes')?.value || '',
      status:'Waiting',
      createdAt:new Date().toISOString()
    });

    save();
    if(typeof window.logAudit==='function'){
      window.logAudit('Add Waiting List','Appointments',pname(patientId));
    }
    closeV20Modal();
    renderV20WaitlistStrip();
  };

  function slotFitsTimePreference(time,pref){
    if(pref==='Any Time') return true;
    const h=Number(String(time||'00:00').split(':')[0]||0);
    if(pref==='Morning') return h<12;
    if(pref==='Afternoon') return h>=12 && h<17;
    if(pref==='Evening') return h>=17;
    return true;
  }

  function candidateScore(w,a){
    let score=0;
    if(w.priority==='Urgent') score+=50;
    else if(w.priority==='High') score+=25;

    if(w.therapist && a.therapist && w.therapist===a.therapist) score+=20;
    if(w.visitType && a.visitType && w.visitType===a.visitType) score+=10;
    if(slotFitsTimePreference(a.time,w.timePreference)) score+=15;

    const created=new Date(w.createdAt||0).getTime();
    score += Math.max(0,10-Math.floor((Date.now()-created)/86400000));
    return score;
  }

  function matchesForAppointment(a){
    return (S().waitingList||[])
      .filter(w=>w.status==='Waiting')
      .filter(w=>!w.from || a.date>=w.from)
      .filter(w=>!w.to || a.date<=w.to)
      .filter(w=>slotFitsTimePreference(a.time,w.timePreference))
      .map(w=>({...w,score:candidateScore(w,a)}))
      .sort((x,y)=>y.score-x.score);
  }

  window.openV20FillSlot=function(apptId){
    ensureV20();
    const a=(S().appointments||[]).find(x=>String(x.id)===String(apptId));
    if(!a) return;

    const matches=matchesForAppointment(a);
    const r=modalRoot();
    r.className='open';
    r.innerHTML=`
      <div class="v20-backdrop" onclick="closeV20Modal()"></div>
      <section class="v20-dialog">
        <div class="v20-head">
          <div>
            <small>CANCELLATION FILL</small>
            <h2>Fill Available Slot</h2>
            <p>${esc(a.date)} · ${esc(a.time)} · ${esc(a.therapist||'Therapist')} · ${esc(a.room||'Room')}</p>
          </div>
          <button onclick="closeV20Modal()">×</button>
        </div>

        <div class="v20-match-list">
          ${matches.length ? matches.map((w,i)=>`
            <article class="v20-match-card">
              <div class="v20-rank">${i+1}</div>
              <div class="v20-match-main">
                <div class="v20-match-top">
                  <div>
                    <h3>${esc(pname(w.patientId))}</h3>
                    <p>${esc(pphone(w.patientId))}</p>
                  </div>
                  <span class="${String(w.priority).toLowerCase()}">${esc(w.priority)}</span>
                </div>
                <div class="v20-match-meta">
                  <span>${esc(w.timePreference)}</span>
                  <span>${esc(w.visitType)}</span>
                  ${w.therapist?`<span>${esc(w.therapist)}</span>`:''}
                </div>
                ${w.notes?`<div class="v20-match-note">${esc(w.notes)}</div>`:''}
              </div>
              <button class="v20-assign" onclick="assignV20Waitlist('${w.id}','${a.id}')">Assign</button>
            </article>`).join('') :
            `<div class="v20-empty">No suitable patients found on the waiting list.</div>`}
        </div>
      </section>`;
  };

  window.assignV20Waitlist=function(waitId,apptId){
    const w=(S().waitingList||[]).find(x=>String(x.id)===String(waitId));
    const a=(S().appointments||[]).find(x=>String(x.id)===String(apptId));
    if(!w || !a) return;

    a.patientId=w.patientId;
    a.visitType=w.visitType || a.visitType;
    a.status='Scheduled';
    a.notes=[a.notes,w.notes].filter(Boolean).join(' | ');
    w.status='Booked';
    w.bookedAppointmentId=a.id;
    w.bookedAt=new Date().toISOString();

    save();
    if(typeof window.logAudit==='function'){
      window.logAudit('Fill Cancelled Slot','Appointments',`${pname(w.patientId)} — ${a.date} ${a.time}`);
    }

    closeV20Modal();
    if(typeof window.renderV16Timeline==='function') try{window.renderV16Timeline();}catch(e){}
    renderV20WaitlistStrip();
  };

  window.openV20WaitlistManager=function(){
    ensureV20();
    const r=modalRoot();
    const items=(S().waitingList||[]).slice().reverse();

    r.className='open';
    r.innerHTML=`
      <div class="v20-backdrop" onclick="closeV20Modal()"></div>
      <section class="v20-dialog manager">
        <div class="v20-head">
          <div>
            <small>WAITING LIST MANAGER</small>
            <h2>Patient Waiting List</h2>
            <p>Track patients waiting for an earlier or more suitable appointment.</p>
          </div>
          <button onclick="closeV20Modal()">×</button>
        </div>

        <div class="v20-manager-list">
          ${items.length ? items.map(w=>`
            <article class="v20-wait-row">
              <div>
                <b>${esc(pname(w.patientId))}</b>
                <small>${esc(w.from||'Any date')} → ${esc(w.to||'Any date')}</small>
              </div>
              <div><small>Preference</small><b>${esc(w.timePreference)}</b></div>
              <div><small>Priority</small><b>${esc(w.priority)}</b></div>
              <div><small>Status</small><span class="${String(w.status).toLowerCase()}">${esc(w.status)}</span></div>
            </article>`).join('') :
            `<div class="v20-empty">Waiting list is empty.</div>`}
        </div>

        <div class="v20-footer">
          <button class="primary" onclick="closeV20Modal();openV20Waitlist()">+ Add Patient</button>
        </div>
      </section>`;
  };

  function renderV20WaitlistStrip(){
    const page=document.getElementById('page-appointments');
    if(!page) return;

    let strip=document.getElementById('v20-wait-strip');
    if(!strip){
      strip=document.createElement('div');
      strip.id='v20-wait-strip';
      strip.className='v20-wait-strip';
      const pkg=document.getElementById('v19-package-strip');
      if(pkg) pkg.insertAdjacentElement('afterend',strip);
      else {
        const timeline=document.getElementById('v16-timeline');
        if(timeline) timeline.insertAdjacentElement('afterend',strip);
      }
    }

    const waiting=(S().waitingList||[]).filter(w=>w.status==='Waiting');
    if(!waiting.length){
      strip.style.display='none';
      return;
    }

    const urgent=waiting.filter(w=>w.priority==='Urgent').length;
    strip.style.display='flex';
    strip.innerHTML=`
      <div>
        <small>WAITING LIST</small>
        <b>${waiting.length}</b>
        <span>${urgent ? urgent+' urgent request'+(urgent>1?'s':'') : 'Patients waiting for earlier slots'}</span>
      </div>
      <button onclick="openV20WaitlistManager()">View Waiting List</button>`;
  }

  function installButtons(){
    const controls=document.querySelector('#page-appointments #v16-timeline .v16-controls');
    if(controls && !document.getElementById('v20-wait-btn')){
      const btn=document.createElement('button');
      btn.id='v20-wait-btn';
      btn.className='v20-toolbar-btn';
      btn.textContent='+ Waiting List';
      btn.onclick=openV20Waitlist;
      controls.prepend(btn);
    }
  }

  function enhanceCancelledEvents(){
    document.querySelectorAll('#page-appointments .v16-event.cancelled').forEach(btn=>{
      if(btn.dataset.v20Enhanced==='1') return;
      btn.dataset.v20Enhanced='1';
      btn.title='Cancelled slot — click to find waiting-list patient';
      const old=btn.getAttribute('onclick')||'';
      const m=old.match(/openV16Appointment\('([^']+)'\)/);
      if(m){
        const id=m[1];
        btn.onclick=function(e){
          e.preventDefault();
          openV20FillSlot(id);
        };
      }
    });
  }

  function css(){
    if(document.getElementById('v20-css')) return;
    const st=document.createElement('style');
    st.id='v20-css';
    st.textContent=`
      #v20-modal{display:none}
      #v20-modal.open{display:block;position:fixed;inset:0;z-index:100002}
      .v20-backdrop{position:absolute;inset:0;background:rgba(12,31,37,.46);backdrop-filter:blur(3px)}
      .v20-dialog{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(780px,95vw);max-height:92vh;overflow:auto;background:#fff;border-radius:19px;padding:22px;box-shadow:0 30px 90px rgba(0,0,0,.24)}
      .v20-dialog.manager{width:min(900px,95vw)}
      .v20-head{display:flex;justify-content:space-between;gap:15px;border-bottom:1px solid #e6edef;padding-bottom:15px;margin-bottom:16px}
      .v20-head small{font-size:9px;letter-spacing:1.5px;font-weight:800;color:#b68a3b}.v20-head h2{margin:4px 0;color:#173f49}.v20-head p{margin:0;font-size:12px;color:#78898e}
      .v20-head>button{border:0;background:#f1f5f6;width:34px;height:34px;border-radius:50%;font-size:22px;cursor:pointer}
      .v20-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.v20-grid label{display:flex;flex-direction:column;gap:5px}.v20-grid label>span{font-size:11px;font-weight:700;color:#526b72}.v20-grid .span2{grid-column:1/-1}
      .v20-grid input,.v20-grid select,.v20-grid textarea{border:1px solid #d9e4e7;border-radius:9px;padding:10px;background:#fff;font:inherit;color:#2d4e56}
      .v20-warning{min-height:18px;margin-top:9px;color:#b44747;font-size:11px;font-weight:700}
      .v20-footer{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #e8edef;margin-top:12px;padding-top:14px}.v20-footer button{border-radius:9px;padding:10px 14px;font-weight:700;cursor:pointer}.v20-footer .secondary{border:1px solid #d9e3e6;background:#fff;color:#385961}.v20-footer .primary{border:1px solid #c99a42;background:#c99a42;color:#fff}
      .v20-toolbar-btn{height:38px!important;border:1px solid #d9e4e7!important;background:#fff!important;color:#31545c!important;border-radius:9px!important;padding:0 12px!important;font-weight:700;cursor:pointer;white-space:nowrap}
      .v20-wait-strip{display:flex;align-items:center;justify-content:space-between;gap:15px;background:#fff;border:1px solid #dfe8ea;border-radius:13px;padding:13px 15px;margin:0 0 16px}
      .v20-wait-strip small,.v20-wait-strip b,.v20-wait-strip span{display:block}.v20-wait-strip small{font-size:9px;color:#a17e3d;font-weight:800;letter-spacing:1px}.v20-wait-strip b{font-size:20px;color:#173f49;margin:2px 0}.v20-wait-strip span{font-size:10px;color:#7d8c91}.v20-wait-strip button{border:1px solid #d9e4e7;background:#fff;border-radius:8px;padding:8px 11px;cursor:pointer}
      .v20-match-list{display:grid;gap:9px}.v20-match-card{display:grid;grid-template-columns:34px 1fr auto;gap:11px;align-items:center;border:1px solid #e1e9eb;border-radius:12px;padding:12px}.v20-rank{width:30px;height:30px;border-radius:9px;background:#eef4f5;color:#174f5b;display:flex;align-items:center;justify-content:center;font-weight:800}
      .v20-match-top{display:flex;justify-content:space-between;gap:10px}.v20-match-top h3,.v20-match-top p{margin:0}.v20-match-top p{font-size:10px;color:#829095;margin-top:2px}.v20-match-top span{font-size:9px;border-radius:999px;padding:4px 7px;background:#f1f4f5}.v20-match-top span.high{background:#fff4dd;color:#966b19}.v20-match-top span.urgent{background:#ffecef;color:#b84555}
      .v20-match-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.v20-match-meta span{font-size:9px;background:#f5f8f9;border-radius:999px;padding:4px 7px;color:#687b80}.v20-match-note{margin-top:7px;font-size:10px;color:#6f8186}
      .v20-assign{border:1px solid #c99a42;background:#c99a42;color:#fff;border-radius:8px;padding:8px 11px;font-weight:700;cursor:pointer}
      .v20-manager-list{display:grid;gap:7px}.v20-wait-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:10px;align-items:center;border:1px solid #e3eaec;border-radius:10px;padding:11px}.v20-wait-row b,.v20-wait-row small{display:block}.v20-wait-row small{font-size:9px;color:#8a989d}.v20-wait-row span{display:inline-block;font-size:9px;padding:4px 7px;border-radius:999px;background:#f2f5f6}.v20-wait-row span.waiting{background:#fff5df;color:#966b19}.v20-wait-row span.booked{background:#eaf7f0;color:#257355}
      .v20-empty{text-align:center;padding:35px;color:#8a989d}
      #page-appointments .v16-event.cancelled:after{content:"WAITLIST";position:absolute;right:5px;bottom:4px;font-size:7px;font-weight:800;color:#b84555;background:#fff;padding:2px 4px;border-radius:4px}
      @media(max-width:680px){.v20-dialog{padding:15px}.v20-grid{grid-template-columns:1fr}.v20-grid .span2{grid-column:auto}.v20-match-card{grid-template-columns:30px 1fr}.v20-assign{grid-column:1/-1}.v20-wait-row{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(st);
  }

  function repair(){
    installButtons();
    renderV20WaitlistStrip();
    enhanceCancelledEvents();
  }

  function init(){
    ensureV20();
    css();
    setTimeout(repair,350);

    const obs=new MutationObserver(()=>{
      clearTimeout(window.__v20t);
      window.__v20t=setTimeout(repair,40);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();


/* =========================================================
   myAIMS V21 - APPOINTMENT CONFIRMATION & REMINDER CENTER
   Confirmation statuses + WhatsApp-ready message templates.
   ========================================================= */
(function(){
  const S = () => window.state || window.appState || {};
  const save = () => { if (typeof window.saveState === 'function') window.saveState(); };

  const REMINDER_STATES = ['Not Sent','Reminder Sent','Confirmed','Patient Replied','Reschedule Requested','No Response'];

  function ensureV21(){
    if(!Array.isArray(S().appointments)) S().appointments = [];
    if(!Array.isArray(S().patients)) S().patients = [];
    S().appointments.forEach(a=>{
      if(!a.reminderStatus) a.reminderStatus='Not Sent';
      if(!a.reminderLanguage) a.reminderLanguage='EN';
      if(!a.lastReminderAt) a.lastReminderAt='';
    });
    save();
  }

  function pname(a){
    const id=a.patientId||a.patient;
    const p=(S().patients||[]).find(x=>String(x.id)===String(id));
    return p ? (p.name||p.fullName||p.patientName||'Patient') : 'Patient';
  }

  function phone(a){
    const id=a.patientId||a.patient;
    const p=(S().patients||[]).find(x=>String(x.id)===String(id));
    return p ? (p.phone||p.mobile||p.contact||'') : '';
  }

  function esc(s){
    return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function formatDate(date){
    if(!date) return '';
    const d=new Date(date+'T00:00:00');
    return d.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
  }

  function reminderText(a,lang){
    const name=pname(a);
    const date=formatDate(a.date);
    const time=a.time||'';
    const therapist=a.therapist||'';
    if(lang==='AR'){
      return `مرحبًا ${name}، نود تذكيركم بموعدكم في مركز أهدافي للتأهيل يوم ${date} الساعة ${time}${therapist?` مع ${therapist}`:''}. يرجى تأكيد الحضور أو إبلاغنا في حال الحاجة إلى تغيير الموعد.`;
    }
    return `Hello ${name}, this is a reminder of your appointment at myAIMS Rehabilitation Center on ${date} at ${time}${therapist?` with ${therapist}`:''}. Please confirm your attendance or let us know if you need to reschedule.`;
  }

  function modalRoot(){
    let r=document.getElementById('v21-modal');
    if(!r){
      r=document.createElement('div');
      r.id='v21-modal';
      document.body.appendChild(r);
    }
    return r;
  }

  window.openV21Reminder=function(id){
    ensureV21();
    const a=(S().appointments||[]).find(x=>String(x.id)===String(id));
    if(!a) return;
    const r=modalRoot();
    r.className='open';

    r.innerHTML=`
      <div class="v21-backdrop" onclick="closeV21Modal()"></div>
      <section class="v21-dialog">
        <div class="v21-head">
          <div>
            <small>APPOINTMENT REMINDER</small>
            <h2>${esc(pname(a))}</h2>
            <p>${esc(a.date)} · ${esc(a.time)} · ${esc(a.therapist||'')}</p>
          </div>
          <button onclick="closeV21Modal()">×</button>
        </div>

        <div class="v21-summary">
          <div><small>Status</small><b>${esc(a.status||'Scheduled')}</b></div>
          <div><small>Reminder</small><b>${esc(a.reminderStatus||'Not Sent')}</b></div>
          <div><small>Phone</small><b>${esc(phone(a)||'—')}</b></div>
        </div>

        <div class="v21-lang">
          <button class="${a.reminderLanguage!=='AR'?'active':''}" onclick="setV21Lang('${a.id}','EN')">English</button>
          <button class="${a.reminderLanguage==='AR'?'active':''}" onclick="setV21Lang('${a.id}','AR')">العربية</button>
        </div>

        <label class="v21-message-label">
          <span>Reminder Message</span>
          <textarea id="v21-message" rows="6">${esc(reminderText(a,a.reminderLanguage||'EN'))}</textarea>
        </label>

        <div class="v21-status-grid">
          ${REMINDER_STATES.map(s=>`
            <button class="${a.reminderStatus===s?'active':''}" onclick="setV21ReminderStatus('${a.id}','${s}')">${s}</button>
          `).join('')}
        </div>

        <div class="v21-footer">
          <button class="secondary" onclick="copyV21Message()">Copy Message</button>
          <button class="primary" onclick="markV21Sent('${a.id}')">Mark Reminder Sent</button>
        </div>
      </section>`;
  };

  window.closeV21Modal=function(){
    const r=document.getElementById('v21-modal');
    if(r) r.className='';
  };

  window.setV21Lang=function(id,lang){
    const a=(S().appointments||[]).find(x=>String(x.id)===String(id));
    if(!a) return;
    a.reminderLanguage=lang;
    save();
    openV21Reminder(id);
  };

  window.setV21ReminderStatus=function(id,status){
    const a=(S().appointments||[]).find(x=>String(x.id)===String(id));
    if(!a || !REMINDER_STATES.includes(status)) return;
    a.reminderStatus=status;
    if(status==='Confirmed' && a.status==='Scheduled') a.status='Confirmed';
    save();
    if(typeof window.logAudit==='function'){
      window.logAudit('Reminder Status','Appointments',`${pname(a)} — ${status}`);
    }
    openV21Reminder(id);
    if(typeof window.renderV16Timeline==='function') try{window.renderV16Timeline();}catch(e){}
    renderV21ReminderStrip();
  };

  window.markV21Sent=function(id){
    const a=(S().appointments||[]).find(x=>String(x.id)===String(id));
    if(!a) return;
    a.reminderStatus='Reminder Sent';
    a.lastReminderAt=new Date().toISOString();
    save();
    if(typeof window.logAudit==='function'){
      window.logAudit('Send Reminder','Appointments',`${pname(a)} — ${a.date} ${a.time}`);
    }
    openV21Reminder(id);
    renderV21ReminderStrip();
  };

  window.copyV21Message=async function(){
    const txt=document.getElementById('v21-message')?.value || '';
    try{
      await navigator.clipboard.writeText(txt);
      alert('Reminder message copied.');
    }catch(e){
      const ta=document.getElementById('v21-message');
      if(ta){ ta.select(); document.execCommand('copy'); alert('Reminder message copied.'); }
    }
  };

  function todayPlus(days){
    const d=new Date();
    d.setDate(d.getDate()+days);
    return d.toISOString().slice(0,10);
  }

  function upcoming(){
    const dates=[todayPlus(0),todayPlus(1)];
    return (S().appointments||[])
      .filter(a=>dates.includes(a.date))
      .filter(a=>!['Cancelled','Completed','No Show'].includes(a.status||'Scheduled'))
      .sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  }

  window.openV21ReminderCenter=function(){
    ensureV21();
    const rows=upcoming();
    const r=modalRoot();
    r.className='open';
    r.innerHTML=`
      <div class="v21-backdrop" onclick="closeV21Modal()"></div>
      <section class="v21-dialog wide">
        <div class="v21-head">
          <div>
            <small>REMINDER CENTER</small>
            <h2>Today & Tomorrow</h2>
            <p>Track confirmations and reminder follow-up.</p>
          </div>
          <button onclick="closeV21Modal()">×</button>
        </div>

        <div class="v21-center-list">
          ${rows.length ? rows.map(a=>`
            <article class="v21-reminder-row">
              <div class="v21-r-time">
                <b>${esc(a.time||'')}</b>
                <small>${a.date===todayPlus(0)?'Today':'Tomorrow'}</small>
              </div>
              <div class="v21-r-main">
                <b>${esc(pname(a))}</b>
                <small>${esc(a.therapist||'Unassigned')} · ${esc(a.visitType||'Session')}</small>
              </div>
              <span class="v21-rem-state ${String(a.reminderStatus||'Not Sent').toLowerCase().replace(/\s+/g,'-')}">${esc(a.reminderStatus||'Not Sent')}</span>
              <button onclick="openV21Reminder('${a.id}')">Open</button>
            </article>
          `).join('') : `<div class="v21-empty">No upcoming appointments for today or tomorrow.</div>`}
        </div>
      </section>`;
  };

  function renderV21ReminderStrip(){
    const page=document.getElementById('page-appointments');
    if(!page) return;

    let strip=document.getElementById('v21-reminder-strip');
    if(!strip){
      strip=document.createElement('div');
      strip.id='v21-reminder-strip';
      strip.className='v21-reminder-strip';
      const wait=document.getElementById('v20-wait-strip');
      if(wait) wait.insertAdjacentElement('afterend',strip);
      else {
        const timeline=document.getElementById('v16-timeline');
        if(timeline) timeline.insertAdjacentElement('afterend',strip);
      }
    }

    const rows=upcoming();
    const notSent=rows.filter(a=>(a.reminderStatus||'Not Sent')==='Not Sent').length;
    const requested=rows.filter(a=>a.reminderStatus==='Reschedule Requested').length;

    if(!rows.length){
      strip.style.display='none';
      return;
    }

    strip.style.display='flex';
    strip.innerHTML=`
      <div>
        <small>REMINDER CENTER</small>
        <b>${rows.length}</b>
        <span>${notSent} not sent${requested?` · ${requested} reschedule request${requested>1?'s':''}`:''}</span>
      </div>
      <button onclick="openV21ReminderCenter()">Open Reminder Center</button>`;
  }

  function installButtons(){
    const controls=document.querySelector('#page-appointments #v16-timeline .v16-controls');
    if(controls && !document.getElementById('v21-reminder-btn')){
      const btn=document.createElement('button');
      btn.id='v21-reminder-btn';
      btn.className='v21-toolbar-btn';
      btn.textContent='Reminders';
      btn.onclick=openV21ReminderCenter;
      controls.prepend(btn);
    }
  }

  function enhanceEvents(){
    document.querySelectorAll('#page-appointments .v16-event').forEach(btn=>{
      if(btn.dataset.v21Badge==='1') return;
      btn.dataset.v21Badge='1';

      const onclick=btn.getAttribute('onclick')||'';
      const m=onclick.match(/openV16Appointment\('([^']+)'\)/);
      if(!m) return;
      const a=(S().appointments||[]).find(x=>String(x.id)===String(m[1]));
      if(!a) return;

      const badge=document.createElement('span');
      badge.className='v21-event-reminder '+String(a.reminderStatus||'Not Sent').toLowerCase().replace(/\s+/g,'-');
      badge.textContent =
        a.reminderStatus==='Confirmed' ? '✓ Confirmed' :
        a.reminderStatus==='Reminder Sent' ? 'Reminder Sent' :
        a.reminderStatus==='Reschedule Requested' ? 'Reschedule' :
        '';
      if(badge.textContent) btn.appendChild(badge);
    });
  }

  function enhanceSidePanel(){
    const panel=document.querySelector('#v16-shade.open .v16-panel');
    if(!panel || panel.querySelector('.v21-side-reminder')) return;

    const head=panel.querySelector('.v16-panel-head');
    const text=panel.innerHTML;
    const m=text.match(/updateAppointmentStatusPro\('([^']+)'/);
    if(!m) return;
    const id=m[1];
    const a=(S().appointments||[]).find(x=>String(x.id)===String(id));
    if(!a) return;

    const box=document.createElement('div');
    box.className='v21-side-reminder';
    box.innerHTML=`
      <div>
        <small>REMINDER</small>
        <b>${esc(a.reminderStatus||'Not Sent')}</b>
      </div>
      <button onclick="openV21Reminder('${a.id}')">Reminder</button>`;
    if(head) head.insertAdjacentElement('afterend',box);
  }

  function css(){
    if(document.getElementById('v21-css')) return;
    const st=document.createElement('style');
    st.id='v21-css';
    st.textContent=`
      #v21-modal{display:none}
      #v21-modal.open{display:block;position:fixed;inset:0;z-index:100003}
      .v21-backdrop{position:absolute;inset:0;background:rgba(12,31,37,.46);backdrop-filter:blur(3px)}
      .v21-dialog{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(690px,95vw);max-height:92vh;overflow:auto;background:#fff;border-radius:19px;padding:22px;box-shadow:0 30px 90px rgba(0,0,0,.24)}
      .v21-dialog.wide{width:min(860px,95vw)}
      .v21-head{display:flex;justify-content:space-between;gap:15px;border-bottom:1px solid #e6edef;padding-bottom:15px;margin-bottom:16px}
      .v21-head small{font-size:9px;letter-spacing:1.5px;font-weight:800;color:#b68a3b}.v21-head h2{margin:4px 0;color:#173f49}.v21-head p{margin:0;font-size:12px;color:#78898e}
      .v21-head>button{border:0;background:#f1f5f6;width:34px;height:34px;border-radius:50%;font-size:22px;cursor:pointer}
      .v21-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:13px}.v21-summary>div{border:1px solid #e3eaec;border-radius:10px;padding:10px}.v21-summary small,.v21-summary b{display:block}.v21-summary small{font-size:9px;color:#8a989d}.v21-summary b{font-size:11px;color:#31545c;margin-top:3px}
      .v21-lang{display:flex;gap:6px;margin-bottom:10px}.v21-lang button{border:1px solid #d9e4e7;background:#fff;border-radius:8px;padding:7px 10px;cursor:pointer}.v21-lang button.active{background:#174f5b;color:#fff;border-color:#174f5b}
      .v21-message-label{display:flex;flex-direction:column;gap:6px}.v21-message-label span{font-size:11px;font-weight:700;color:#536b72}.v21-message-label textarea{border:1px solid #d9e4e7;border-radius:10px;padding:11px;font:inherit;line-height:1.55}
      .v21-status-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}.v21-status-grid button{border:1px solid #dfe7e9;background:#fff;border-radius:8px;padding:8px;font-size:10px;cursor:pointer}.v21-status-grid button.active{background:#e8f2f4;border-color:#174f5b;color:#174f5b;font-weight:800}
      .v21-footer{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #e8edef;margin-top:14px;padding-top:14px}.v21-footer button{border-radius:9px;padding:10px 14px;font-weight:700;cursor:pointer}.v21-footer .secondary{border:1px solid #d9e3e6;background:#fff;color:#385961}.v21-footer .primary{border:1px solid #c99a42;background:#c99a42;color:#fff}
      .v21-toolbar-btn{height:38px!important;border:1px solid #d9e4e7!important;background:#fff!important;color:#31545c!important;border-radius:9px!important;padding:0 12px!important;font-weight:700;cursor:pointer}
      .v21-reminder-strip{display:flex;align-items:center;justify-content:space-between;gap:15px;background:#fff;border:1px solid #dfe8ea;border-radius:13px;padding:13px 15px;margin:0 0 16px}.v21-reminder-strip small,.v21-reminder-strip b,.v21-reminder-strip span{display:block}.v21-reminder-strip small{font-size:9px;color:#a17e3d;font-weight:800;letter-spacing:1px}.v21-reminder-strip b{font-size:20px;color:#173f49;margin:2px 0}.v21-reminder-strip span{font-size:10px;color:#7d8c91}.v21-reminder-strip button{border:1px solid #d9e4e7;background:#fff;border-radius:8px;padding:8px 11px;cursor:pointer}
      .v21-center-list{display:grid;gap:8px}.v21-reminder-row{display:grid;grid-template-columns:75px 1fr auto 64px;gap:10px;align-items:center;border:1px solid #e2eaec;border-radius:11px;padding:10px}.v21-r-time b,.v21-r-time small,.v21-r-main b,.v21-r-main small{display:block}.v21-r-time b{font-size:14px}.v21-r-time small,.v21-r-main small{font-size:9px;color:#849397}.v21-r-main b{font-size:12px;color:#294d55}
      .v21-rem-state{font-size:9px;border-radius:999px;padding:5px 8px;background:#f0f3f4;color:#61747a}.v21-rem-state.confirmed{background:#e9f7f0;color:#247055}.v21-rem-state.reminder-sent{background:#eef4ff;color:#4a69a9}.v21-rem-state.reschedule-requested{background:#fff2df;color:#9a6812}.v21-reminder-row>button{border:1px solid #d9e4e7;background:#fff;border-radius:8px;padding:7px;cursor:pointer}
      .v21-event-reminder{display:block;margin-top:3px;font-size:7px;font-weight:800;color:#5a6d72}.v21-event-reminder.confirmed{color:#247055}.v21-event-reminder.reschedule-requested{color:#9a6812}
      .v21-side-reminder{display:flex;align-items:center;justify-content:space-between;border:1px solid #e2eaec;background:#f8fbfb;border-radius:10px;padding:10px;margin:12px 0}.v21-side-reminder small,.v21-side-reminder b{display:block}.v21-side-reminder small{font-size:8px;color:#8a989d}.v21-side-reminder b{font-size:11px;color:#31545c;margin-top:2px}.v21-side-reminder button{border:1px solid #d9e4e7;background:#fff;border-radius:8px;padding:7px 9px;cursor:pointer}
      .v21-empty{text-align:center;padding:35px;color:#8a989d}
      @media(max-width:680px){.v21-dialog{padding:15px}.v21-summary{grid-template-columns:1fr}.v21-status-grid{grid-template-columns:1fr 1fr}.v21-reminder-row{grid-template-columns:60px 1fr}.v21-rem-state,.v21-reminder-row>button{grid-column:auto}}
    `;
    document.head.appendChild(st);
  }

  function repair(){
    installButtons();
    renderV21ReminderStrip();
    enhanceEvents();
    enhanceSidePanel();
  }

  function init(){
    ensureV21();
    css();
    setTimeout(repair,350);

    const obs=new MutationObserver(()=>{
      clearTimeout(window.__v21t);
      window.__v21t=setTimeout(repair,40);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();


/* =========================================================
   myAIMS V22 - ORBIT CALENDAR
   A modern appointment experience:
   Week Orbit -> Day Flow -> Patient Card
   Capacity Pulse + Now Lens + Next 3 Hours
   ========================================================= */
(function(){
  const S=()=>window.state||window.appState||{};
  const DAY_START=8, DAY_END=20;

  function appts(){ return Array.isArray(S().appointments)?S().appointments:[]; }
  function patients(){ return Array.isArray(S().patients)?S().patients:[]; }
  function pname(a){
    const p=patients().find(x=>String(x.id)===String(a.patientId||a.patient));
    return p?(p.name||p.fullName||p.patientName||'Patient'):'Patient';
  }
  function initials(n){ return String(n||'P').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase(); }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function iso(d){ const x=new Date(d); x.setMinutes(x.getMinutes()-x.getTimezoneOffset()); return x.toISOString().slice(0,10); }
  function add(date,n){ const d=new Date(date+'T00:00:00'); d.setDate(d.getDate()+n); return iso(d); }
  function startWeek(date){
    const d=new Date(date+'T00:00:00'), day=(d.getDay()+6)%7;
    d.setDate(d.getDate()-day); return iso(d);
  }
  function fmt(date,opt){ return new Date(date+'T00:00:00').toLocaleDateString(undefined,opt); }
  function mins(t){ const [h,m]=String(t||'00:00').split(':').map(Number); return h*60+(m||0); }

  window.__v22Date=window.__v22Date||window.__v16Date||iso(new Date());
  window.__v22Mode=window.__v22Mode||'flow';

  function dayAppointments(date){
    return appts().filter(a=>a.date===date && a.status!=='Cancelled')
      .sort((a,b)=>String(a.time).localeCompare(String(b.time)));
  }

  function capacity(date){
    const list=dayAppointments(date);
    const booked=list.reduce((s,a)=>s+Number(a.duration||60),0);
    const capacityMinutes=(DAY_END-DAY_START)*60*3; // 3 treatment lanes
    const pct=Math.min(100,Math.round(booked/capacityMinutes*100));
    let label='Quiet';
    if(pct>=80) label='Full';
    else if(pct>=55) label='Busy';
    else if(pct>=25) label='Balanced';
    return {pct,label,count:list.length};
  }

  function nextThreeHours(){
    const now=new Date(), today=iso(now), cur=now.getHours()*60+now.getMinutes();
    return appts().filter(a=>{
      if(a.date!==today || ['Cancelled','Completed','No Show'].includes(a.status)) return false;
      const m=mins(a.time); return m>=cur && m<=cur+180;
    }).sort((a,b)=>a.time.localeCompare(b.time)).slice(0,4);
  }

  function weekOrbit(){
    const start=startWeek(window.__v22Date);
    const days=Array.from({length:7},(_,i)=>add(start,i));
    return `
      <div class="v22-orbit">
        <button class="v22-week-nav" onclick="moveV22Week(-7)">‹</button>
        <div class="v22-days">
          ${days.map(d=>{
            const c=capacity(d), active=d===window.__v22Date, today=d===iso(new Date());
            return `<button class="v22-day ${active?'active':''} ${today?'today':''}" onclick="selectV22Day('${d}')">
              <div class="v22-day-top"><span>${fmt(d,{weekday:'short'})}</span><b>${fmt(d,{day:'2-digit'})}</b></div>
              <div class="v22-ring" style="--p:${c.pct}">
                <i>${c.count}</i>
              </div>
              <small>${c.label}</small>
              <div class="v22-load"><i style="width:${c.pct}%"></i></div>
            </button>`;
          }).join('')}
        </div>
        <button class="v22-week-nav" onclick="moveV22Week(7)">›</button>
      </div>`;
  }

  function nowLens(){
    const today=window.__v22Date===iso(new Date());
    if(!today) return '';
    const now=new Date(), m=now.getHours()*60+now.getMinutes();
    if(m<DAY_START*60 || m>DAY_END*60) return '';
    const top=((m-DAY_START*60)/60)*76;
    return `<div class="v22-now" style="top:${top}px"><span>NOW</span><i></i></div>`;
  }

  function dayFlow(){
    const list=dayAppointments(window.__v22Date);
    const hours=Array.from({length:DAY_END-DAY_START+1},(_,i)=>DAY_START+i);
    const lanes=['Dr. Eman','Therapist 2','Therapist 3'];
    const therapists=[...new Set([...lanes,...list.map(a=>a.therapist).filter(Boolean)])].slice(0,3);

    return `
      <div class="v22-flow-shell">
        <div class="v22-flow-head">
          <div class="v22-time-head">TIME</div>
          ${therapists.map(t=>`<div><b>${esc(t)}</b><small>${list.filter(a=>a.therapist===t).length} visits</small></div>`).join('')}
        </div>
        <div class="v22-flow-body">
          ${nowLens()}
          <div class="v22-time-axis">
            ${hours.map(h=>`<div style="height:76px"><span>${String(h).padStart(2,'0')}:00</span></div>`).join('')}
          </div>
          ${therapists.map(t=>`
            <div class="v22-lane">
              ${hours.map(h=>`<button class="v22-empty-slot" style="top:${(h-DAY_START)*76}px;height:76px" onclick="quickV22Appointment('${window.__v22Date}','${String(h).padStart(2,'0')}:00','${esc(t)}')" title="Book ${h}:00"></button>`).join('')}
              ${list.filter(a=>(a.therapist||therapists[0])===t).map(a=>{
                const start=(mins(a.time)-DAY_START*60)/60*76;
                const height=Math.max(42,Number(a.duration||60)/60*76-5);
                return `<button class="v22-appt ${String(a.status||'scheduled').toLowerCase().replace(/\s+/g,'-')}" style="top:${start}px;height:${height}px" onclick="openV22PatientCard('${a.id}')">
                  <span class="v22-avatar">${esc(initials(pname(a)))}</span>
                  <span class="v22-appt-copy"><b>${esc(pname(a))}</b><small>${esc(a.time)} · ${esc(a.visitType||'Session')}</small><em>${esc(a.room||'Treatment Room')}</em></span>
                  <span class="v22-status-dot"></span>
                </button>`;
              }).join('')}
            </div>`).join('')}
        </div>
      </div>`;
  }

  function nextPanel(){
    const rows=nextThreeHours();
    return `<div class="v22-next">
      <div class="v22-next-title"><div><small>LIVE WINDOW</small><b>Next 3 Hours</b></div><span>${rows.length} upcoming</span></div>
      <div class="v22-next-list">
        ${rows.length?rows.map(a=>`<button onclick="openV22PatientCard('${a.id}')">
          <span>${esc(a.time)}</span><div><b>${esc(pname(a))}</b><small>${esc(a.therapist||'Therapist')}</small></div><i>›</i>
        </button>`).join(''):`<div class="v22-clear">No appointments in the next 3 hours</div>`}
      </div>
    </div>`;
  }

  function insightPanel(){
    const c=capacity(window.__v22Date);
    const list=dayAppointments(window.__v22Date);
    const confirmed=list.filter(a=>a.status==='Confirmed').length;
    const waiting=(S().waitingList||[]).filter(w=>w.status==='Waiting').length;
    return `<div class="v22-insight">
      <div class="v22-pulse"><div class="v22-pulse-ring" style="--p:${c.pct}"><b>${c.pct}%</b></div><div><small>CAPACITY PULSE</small><strong>${c.label}</strong><span>${c.count} scheduled visits</span></div></div>
      <div class="v22-mini"><div><b>${confirmed}</b><span>Confirmed</span></div><div><b>${waiting}</b><span>Waiting</span></div><div><b>${list.length}</b><span>Total</span></div></div>
    </div>`;
  }

  function render(){
    const page=document.getElementById('page-appointments');
    if(!page) return;

    // Hide all legacy appointment presentation layers. Data/functions remain active.
    [...page.children].forEach(el=>{
      if(el.id!=='v22-orbit-calendar' && !el.classList.contains('page-title')) el.style.display='none';
    });

    let root=document.getElementById('v22-orbit-calendar');
    if(!root){
      root=document.createElement('div');
      root.id='v22-orbit-calendar';
      const title=page.querySelector(':scope > .page-title');
      if(title) title.insertAdjacentElement('afterend',root); else page.prepend(root);
    }
    root.style.display='block';

    const c=capacity(window.__v22Date);
    root.innerHTML=`
      <section class="v22-hero">
        <div>
          <small>MYAIMS ORBIT CALENDAR</small>
          <h2>${fmt(window.__v22Date,{weekday:'long',month:'long',day:'numeric'})}</h2>
          <p>See the clinic rhythm, patient flow and available capacity in one view.</p>
        </div>
        <div class="v22-hero-actions">
          <button onclick="selectV22Day('${iso(new Date())}')">Today</button>
          <button onclick="openV20WaitlistManager()">Waiting List</button>
          <button onclick="openV21ReminderCenter()">Reminders</button>
          <button class="gold" onclick="openV18Appointment()">+ New Appointment</button>
        </div>
      </section>

      ${weekOrbit()}

      <div class="v22-command">
        <div class="v22-date-nav">
          <button onclick="moveV22Day(-1)">‹</button>
          <div><small>DAY FLOW</small><b>${fmt(window.__v22Date,{weekday:'long',day:'numeric',month:'short'})}</b></div>
          <button onclick="moveV22Day(1)">›</button>
        </div>
        <div class="v22-command-pills">
          <span class="quiet">Quiet</span><span class="balanced">Balanced</span><span class="busy">Busy</span><span class="full">Full</span>
        </div>
      </div>

      <div class="v22-layout">
        <main>${dayFlow()}</main>
        <aside>${insightPanel()}${nextPanel()}</aside>
      </div>`;
  }

  window.selectV22Day=function(d){ window.__v22Date=d; window.__v16Date=d; render(); };
  window.moveV22Day=function(n){ selectV22Day(add(window.__v22Date,n)); };
  window.moveV22Week=function(n){ selectV22Day(add(window.__v22Date,n)); };

  window.quickV22Appointment=function(date,time,therapist){
    window.__v16Date=date;
    if(typeof window.openV18Appointment==='function'){
      openV18Appointment();
      setTimeout(()=>{
        const d=document.getElementById('v18-date'), t=document.getElementById('v18-therapist');
        if(d){d.value=date;}
        if(t){
          [...t.options].forEach((o,i)=>{ if(o.text===therapist)t.selectedIndex=i; });
        }
        if(typeof window.renderV18Slots==='function') window.renderV18Slots();
        setTimeout(()=>{
          const buttons=[...document.querySelectorAll('#v18-slots button')];
          const b=buttons.find(x=>x.textContent.trim()===time);
          if(b && typeof window.selectV18Slot==='function') window.selectV18Slot(time,b);
        },40);
      },40);
    }
  };

  window.openV22PatientCard=function(id){
    const a=appts().find(x=>String(x.id)===String(id));
    if(!a) return;
    let shade=document.getElementById('v22-card-shade');
    if(!shade){ shade=document.createElement('div'); shade.id='v22-card-shade'; document.body.appendChild(shade); }
    const n=pname(a);
    shade.className='open';
    shade.innerHTML=`
      <div class="v22-card-back" onclick="closeV22PatientCard()"></div>
      <section class="v22-patient-card">
        <div class="v22-card-head"><span>${esc(initials(n))}</span><div><small>PATIENT VISIT</small><h3>${esc(n)}</h3><p>${esc(a.date)} · ${esc(a.time)}</p></div><button onclick="closeV22PatientCard()">×</button></div>
        <div class="v22-card-status">${esc(a.status||'Scheduled')}</div>
        <div class="v22-card-grid">
          <div><small>THERAPIST</small><b>${esc(a.therapist||'—')}</b></div>
          <div><small>ROOM</small><b>${esc(a.room||'—')}</b></div>
          <div><small>VISIT</small><b>${esc(a.visitType||'Session')}</b></div>
          <div><small>DURATION</small><b>${esc(a.duration||60)} min</b></div>
        </div>
        ${a.notes?`<div class="v22-card-note"><small>NOTES</small><p>${esc(a.notes)}</p></div>`:''}
        <div class="v22-card-actions">
          <button onclick="closeV22PatientCard();openV21Reminder('${a.id}')">Reminder</button>
          <button onclick="closeV22PatientCard();if(window.openPatientProfile)openPatientProfile('${a.patientId}')">Patient Profile</button>
          <button class="gold" onclick="closeV22PatientCard();if(window.openV16Appointment)openV16Appointment('${a.id}')">Manage Visit</button>
        </div>
      </section>`;
  };
  window.closeV22PatientCard=function(){ const x=document.getElementById('v22-card-shade'); if(x)x.className=''; };

  function css(){
    if(document.getElementById('v22-css')) return;
    const st=document.createElement('style'); st.id='v22-css'; st.textContent=`
      #page-appointments.active{display:block!important}
      #v22-orbit-calendar{width:100%;font-family:inherit}
      .v22-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:18px}.v22-hero small{font-size:9px;letter-spacing:1.8px;color:#b78c3e;font-weight:900}.v22-hero h2{font-size:26px;margin:5px 0 3px;color:#153f49}.v22-hero p{margin:0;color:#7d8c91;font-size:11px}.v22-hero-actions{display:flex;gap:7px;flex-wrap:wrap}.v22-hero-actions button{border:1px solid #dbe5e7;background:#fff;border-radius:9px;padding:9px 11px;font-weight:700;color:#35575f;cursor:pointer}.v22-hero-actions .gold{background:#c99a42;border-color:#c99a42;color:#fff}
      .v22-orbit{display:grid;grid-template-columns:35px 1fr 35px;gap:8px;align-items:stretch;margin-bottom:16px}.v22-week-nav{border:0;background:#f0f5f6;border-radius:12px;font-size:22px;color:#47636a;cursor:pointer}.v22-days{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}.v22-day{position:relative;border:1px solid #e0e8ea;background:#fff;border-radius:15px;padding:10px;text-align:left;cursor:pointer;min-height:126px;transition:.2s}.v22-day:hover{transform:translateY(-2px);box-shadow:0 9px 22px rgba(26,67,76,.08)}.v22-day.active{border-color:#174f5b;box-shadow:0 0 0 2px rgba(23,79,91,.08)}.v22-day.today:before{content:"TODAY";position:absolute;right:8px;top:7px;font-size:6px;font-weight:900;color:#b78c3e}.v22-day-top span,.v22-day-top b{display:block}.v22-day-top span{font-size:9px;color:#829095;text-transform:uppercase}.v22-day-top b{font-size:17px;color:#294e57;margin-top:1px}
      .v22-ring,.v22-pulse-ring{--p:0;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#c99a42 calc(var(--p)*1%),#edf2f3 0);position:relative;margin:8px 0}.v22-ring:after,.v22-pulse-ring:after{content:"";position:absolute;inset:4px;border-radius:50%;background:#fff}.v22-ring i,.v22-pulse-ring b{z-index:1;font-style:normal;font-size:10px;color:#36565e}.v22-day>small{font-size:8px;color:#7f8f94}.v22-load{height:3px;background:#eef3f4;border-radius:99px;margin-top:6px;overflow:hidden}.v22-load i{display:block;height:100%;background:#174f5b;border-radius:99px}
      .v22-command{display:flex;justify-content:space-between;align-items:center;border:1px solid #e0e8ea;background:#fff;border-radius:13px;padding:9px 12px;margin-bottom:10px}.v22-date-nav{display:flex;align-items:center;gap:10px}.v22-date-nav button{width:29px;height:29px;border:1px solid #dce5e7;background:#fff;border-radius:8px;cursor:pointer}.v22-date-nav small,.v22-date-nav b{display:block}.v22-date-nav small{font-size:7px;color:#b78c3e;font-weight:900;letter-spacing:1px}.v22-date-nav b{font-size:12px;color:#31545c}.v22-command-pills{display:flex;gap:5px}.v22-command-pills span{font-size:7px;border-radius:99px;padding:4px 7px;background:#f1f4f5}.v22-command-pills .balanced{background:#edf6f2}.v22-command-pills .busy{background:#fff5df}.v22-command-pills .full{background:#ffeded}
      .v22-layout{display:grid;grid-template-columns:minmax(0,1fr) 245px;gap:12px}.v22-layout>aside{display:flex!important;flex-direction:column;gap:10px;position:static!important;width:auto!important;background:transparent!important;overflow:visible!important}
      .v22-flow-shell{border:1px solid #dfe8ea;background:#fff;border-radius:15px;overflow:hidden}.v22-flow-head{display:grid;grid-template-columns:64px repeat(3,1fr);height:55px;border-bottom:1px solid #e4ebed;background:#fbfcfc}.v22-flow-head>div{padding:11px;border-left:1px solid #edf1f2}.v22-flow-head b,.v22-flow-head small{display:block}.v22-flow-head b{font-size:10px;color:#31545c}.v22-flow-head small{font-size:8px;color:#91a0a4;margin-top:2px}.v22-time-head{font-size:8px!important;font-weight:900;color:#9aa6aa!important;display:flex;align-items:center}
      .v22-flow-body{display:grid;grid-template-columns:64px repeat(3,1fr);height:988px;position:relative}.v22-time-axis{background:#fafcfc}.v22-time-axis>div{border-bottom:1px solid #edf2f3;box-sizing:border-box;padding:7px}.v22-time-axis span{font-size:8px;color:#96a3a7}.v22-lane{position:relative;border-left:1px solid #e8edef;background:linear-gradient(to bottom,transparent 75px,#edf2f3 76px);background-size:100% 76px}.v22-empty-slot{position:absolute;left:0;right:0;width:100%;border:0;background:transparent;cursor:crosshair}.v22-empty-slot:hover{background:rgba(201,154,66,.055)}
      .v22-appt{position:absolute;left:6px;right:6px;width:calc(100% - 12px);border:1px solid #dce7e9;background:#f5f9fa;border-radius:10px;padding:7px;display:flex;gap:7px;text-align:left;cursor:pointer;overflow:hidden;z-index:3;box-shadow:0 3px 8px rgba(31,70,79,.05)}.v22-appt:hover{z-index:5;transform:scale(1.015);box-shadow:0 8px 18px rgba(31,70,79,.12)}.v22-avatar{width:26px;height:26px;min-width:26px;border-radius:8px;background:#174f5b;color:#fff;display:grid;place-items:center;font-size:8px;font-weight:900}.v22-appt-copy{min-width:0}.v22-appt-copy b,.v22-appt-copy small,.v22-appt-copy em{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v22-appt-copy b{font-size:9px;color:#294e57}.v22-appt-copy small{font-size:7px;color:#73858a;margin-top:2px}.v22-appt-copy em{font-size:7px;color:#9a7b40;font-style:normal;margin-top:3px}.v22-status-dot{margin-left:auto;width:6px;height:6px;border-radius:50%;background:#c99a42}.v22-appt.confirmed .v22-status-dot,.v22-appt.completed .v22-status-dot{background:#2d8b68}.v22-appt.no-show .v22-status-dot{background:#bd5360}
      .v22-now{position:absolute;left:56px;right:0;height:1px;background:#c85c5c;z-index:8;pointer-events:none}.v22-now span{position:absolute;left:-3px;top:-8px;background:#c85c5c;color:#fff;border-radius:99px;padding:2px 5px;font-size:6px;font-weight:900}.v22-now i{position:absolute;left:0;top:-3px;width:7px;height:7px;border-radius:50%;background:#c85c5c}
      .v22-insight,.v22-next{border:1px solid #dfe8ea;background:#fff;border-radius:15px;padding:13px}.v22-pulse{display:flex;align-items:center;gap:10px}.v22-pulse-ring{width:62px;height:62px;margin:0}.v22-pulse-ring:after{inset:6px}.v22-pulse-ring b{font-size:12px}.v22-pulse small,.v22-pulse strong,.v22-pulse span{display:block}.v22-pulse small{font-size:7px;color:#b78c3e;font-weight:900;letter-spacing:1px}.v22-pulse strong{font-size:14px;color:#294e57;margin:2px 0}.v22-pulse span{font-size:8px;color:#89979b}.v22-mini{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:12px}.v22-mini div{background:#f7f9fa;border-radius:8px;padding:7px;text-align:center}.v22-mini b,.v22-mini span{display:block}.v22-mini b{font-size:13px;color:#31545c}.v22-mini span{font-size:7px;color:#8a989d}
      .v22-next-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}.v22-next-title small,.v22-next-title b{display:block}.v22-next-title small{font-size:7px;color:#b78c3e;font-weight:900}.v22-next-title b{font-size:12px;color:#31545c}.v22-next-title>span{font-size:7px;color:#8a989d}.v22-next-list{display:grid;gap:5px}.v22-next-list button{display:grid;grid-template-columns:40px 1fr 12px;align-items:center;gap:6px;border:0;background:#f7f9fa;border-radius:9px;padding:8px;text-align:left;cursor:pointer}.v22-next-list>button>span{font-size:9px;font-weight:900;color:#b78c3e}.v22-next-list b,.v22-next-list small{display:block}.v22-next-list b{font-size:9px;color:#31545c}.v22-next-list small{font-size:7px;color:#8a989d}.v22-next-list i{font-style:normal}.v22-clear{text-align:center;font-size:8px;color:#8a989d;padding:15px}
      #v22-card-shade{display:none}#v22-card-shade.open{display:block;position:fixed;inset:0;z-index:100010}.v22-card-back{position:absolute;inset:0;background:rgba(14,34,40,.35);backdrop-filter:blur(2px)}.v22-patient-card{position:absolute;right:0;top:0;bottom:0;width:min(390px,94vw);background:#fff;padding:22px;box-shadow:-20px 0 60px rgba(0,0,0,.16);overflow:auto}.v22-card-head{display:grid;grid-template-columns:48px 1fr 32px;gap:10px;align-items:center}.v22-card-head>span{width:48px;height:48px;border-radius:14px;background:#174f5b;color:#fff;display:grid;place-items:center;font-weight:900}.v22-card-head small{font-size:7px;color:#b78c3e;font-weight:900}.v22-card-head h3{margin:2px 0;color:#294e57}.v22-card-head p{margin:0;font-size:9px;color:#89979b}.v22-card-head button{border:0;background:#f1f4f5;border-radius:50%;width:30px;height:30px;font-size:18px}.v22-card-status{display:inline-block;margin:18px 0 12px;background:#edf6f2;color:#287458;border-radius:99px;padding:5px 9px;font-size:8px;font-weight:900}.v22-card-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v22-card-grid>div,.v22-card-note{border:1px solid #e3eaec;border-radius:10px;padding:10px}.v22-card-grid small,.v22-card-grid b{display:block}.v22-card-grid small,.v22-card-note small{font-size:7px;color:#9aa5a9}.v22-card-grid b{font-size:10px;color:#36575f;margin-top:3px}.v22-card-note{margin-top:8px}.v22-card-note p{font-size:10px;color:#65777c;line-height:1.5}.v22-card-actions{display:grid;gap:7px;margin-top:16px}.v22-card-actions button{border:1px solid #dce5e7;background:#fff;border-radius:9px;padding:10px;font-weight:700;color:#36575f;cursor:pointer}.v22-card-actions .gold{background:#c99a42;border-color:#c99a42;color:#fff}
      @media(max-width:1050px){.v22-layout{grid-template-columns:1fr}.v22-layout>aside{display:grid!important;grid-template-columns:1fr 1fr}.v22-days{overflow-x:auto;grid-template-columns:repeat(7,minmax(110px,1fr))}.v22-orbit{grid-template-columns:1fr}.v22-week-nav{display:none}}
      @media(max-width:700px){.v22-hero{align-items:flex-start;flex-direction:column}.v22-command{align-items:flex-start;gap:10px;flex-direction:column}.v22-command-pills{display:none}.v22-layout>aside{grid-template-columns:1fr}.v22-flow-shell{overflow-x:auto}.v22-flow-head,.v22-flow-body{min-width:760px}.v22-days{grid-template-columns:repeat(7,100px)}}
    `; document.head.appendChild(st);
  }

  function bindNav(){
    const nav=document.querySelector('.nav-item[data-page="appointments"]');
    if(nav && nav.dataset.v22Bound!=='1'){
      nav.dataset.v22Bound='1';
      nav.addEventListener('click',()=>setTimeout(render,60));
    }
  }

  function init(){
    css(); bindNav();
    if(document.getElementById('page-appointments')?.classList.contains('active')) render();
    const obs=new MutationObserver(()=>{
      clearTimeout(window.__v22Repair);
      window.__v22Repair=setTimeout(()=>{
        bindNav();
        if(document.getElementById('page-appointments')?.classList.contains('active')) render();
      },80);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();


/* =========================================================
   myAIMS V23 - SMART PATIENT PICKER + QUICK NEW PATIENT
   Search existing patients by name/mobile or create a new
   patient directly from the New Appointment window.
   Also adds a safe bridge so V7+ modules use the real db.
   ========================================================= */
(function(){

  /* ---------- Compatibility bridge for cumulative modules ---------- */
  try{
    Object.defineProperty(window,'state',{
      configurable:true,
      get:function(){ return db; },
      set:function(v){ db=v||db; try{save();}catch(e){} }
    });
    Object.defineProperty(window,'appState',{
      configurable:true,
      get:function(){ return db; },
      set:function(v){ db=v||db; try{save();}catch(e){} }
    });
    window.saveState=function(){ save(); };
  }catch(e){
    window.state=db;
    window.appState=db;
    window.saveState=save;
  }

  function pName(p){ return p ? (p.name||p.fullName||p.patientName||'Patient') : 'Patient'; }
  function pPhone(p){ return p ? (p.phone||p.mobile||p.contact||'') : ''; }
  function cleanPhone(s){ return String(s||'').replace(/[^\d+]/g,'').trim(); }
  function esc23(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function nextPatientId(){
    const nums=(db.patients||[]).map(p=>{
      const m=String(p.id||'').match(/(\d+)$/);
      return m?Number(m[1]):0;
    });
    return 'P-'+String(Math.max(1000,...nums)+1);
  }

  function patientById(id){
    return (db.patients||[]).find(p=>String(p.id)===String(id));
  }

  function pickerHtml(){
    return `
      <div id="v23-picker" class="v23-picker">
        <div class="v23-search-wrap">
          <span class="v23-search-icon">⌕</span>
          <input id="v23-patient-search"
                 type="text"
                 autocomplete="off"
                 placeholder="Search patient name or mobile..."
                 oninput="renderV23PatientResults()"
                 onfocus="renderV23PatientResults()">
          <button type="button" class="v23-add-mini" onclick="openV23QuickPatient()">+ New Patient</button>
        </div>

        <div id="v23-selected" class="v23-selected" style="display:none"></div>
        <div id="v23-results" class="v23-results"></div>
      </div>`;
  }

  function enhanceAppointmentModal(){
    const select=document.getElementById('v18-patient');
    if(!select || select.dataset.v23Enhanced==='1') return;

    select.dataset.v23Enhanced='1';

    const label=select.closest('label');
    if(!label) return;

    const selectedValue=select.value;
    select.style.display='none';

    const title=label.querySelector(':scope > span');
    if(title) title.innerHTML='Patient <small class="v23-required">Required</small>';

    const holder=document.createElement('div');
    holder.innerHTML=pickerHtml();
    label.appendChild(holder.firstElementChild);

    if(selectedValue){
      selectV23Patient(selectedValue);
    }else{
      renderV23PatientResults();
    }
  }

  window.renderV23PatientResults=function(){
    const input=document.getElementById('v23-patient-search');
    const box=document.getElementById('v23-results');
    if(!input || !box) return;

    const q=input.value.trim().toLowerCase();
    let list=(db.patients||[]).filter(p=>{
      if(!q) return true;
      return pName(p).toLowerCase().includes(q) ||
             pPhone(p).toLowerCase().includes(q) ||
             String(p.id||'').toLowerCase().includes(q);
    }).slice(0,8);

    if(!list.length){
      box.innerHTML=`
        <div class="v23-no-results">
          <b>No patient found</b>
          <span>Create a new patient without leaving this appointment.</span>
          <button type="button" onclick="openV23QuickPatient('${esc23(input.value)}')">+ Add New Patient</button>
        </div>`;
      box.classList.add('open');
      return;
    }

    box.innerHTML=list.map(p=>`
      <button type="button" class="v23-result" onclick="selectV23Patient('${esc23(p.id)}')">
        <span class="v23-avatar">${esc23(pName(p).split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())}</span>
        <span class="v23-result-copy">
          <b>${esc23(pName(p))}</b>
          <small>${esc23(pPhone(p)||'No mobile')} · ${esc23(p.id||'')}</small>
        </span>
        <span class="v23-arrow">›</span>
      </button>`).join('');
    box.classList.add('open');
  };

  window.selectV23Patient=function(id){
    const p=patientById(id);
    const select=document.getElementById('v18-patient');
    const selected=document.getElementById('v23-selected');
    const results=document.getElementById('v23-results');
    const input=document.getElementById('v23-patient-search');
    if(!p || !select || !selected) return;

    // Ensure V18 hidden select contains the patient ID.
    let opt=[...select.options].find(o=>String(o.value)===String(id));
    if(!opt){
      opt=document.createElement('option');
      opt.value=id;
      opt.textContent=pName(p);
      select.appendChild(opt);
    }
    select.value=id;

    selected.style.display='flex';
    selected.innerHTML=`
      <span class="v23-avatar large">${esc23(pName(p).split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())}</span>
      <div>
        <small>SELECTED PATIENT</small>
        <b>${esc23(pName(p))}</b>
        <span>${esc23(pPhone(p)||'No mobile')} · ${esc23(p.id)}</span>
      </div>
      <button type="button" onclick="clearV23Patient()">Change</button>`;
    if(input) input.value='';
    if(results){ results.innerHTML=''; results.classList.remove('open'); }
  };

  window.clearV23Patient=function(){
    const select=document.getElementById('v18-patient');
    const selected=document.getElementById('v23-selected');
    const input=document.getElementById('v23-patient-search');
    if(select) select.value='';
    if(selected) selected.style.display='none';
    if(input){ input.value=''; input.focus(); }
    renderV23PatientResults();
  };

  window.openV23QuickPatient=function(prefill){
    let root=document.getElementById('v23-quick-patient');
    if(!root){
      root=document.createElement('div');
      root.id='v23-quick-patient';
      document.body.appendChild(root);
    }

    let namePrefill='';
    let phonePrefill='';
    const val=String(prefill||'').trim();
    if(val){
      if(/[0-9]{5,}/.test(val)) phonePrefill=val;
      else namePrefill=val;
    }

    root.className='open';
    root.innerHTML=`
      <div class="v23-qp-back" onclick="closeV23QuickPatient()"></div>
      <section class="v23-qp-card">
        <div class="v23-qp-head">
          <div>
            <small>QUICK PATIENT</small>
            <h3>Add New Patient</h3>
            <p>Only essential information is required now. Complete the patient profile later.</p>
          </div>
          <button type="button" onclick="closeV23QuickPatient()">×</button>
        </div>

        <label>
          <span>Patient Name *</span>
          <input id="v23-new-name" type="text" value="${esc23(namePrefill)}" placeholder="Full name" autofocus>
        </label>

        <label>
          <span>Mobile Number *</span>
          <input id="v23-new-phone" type="tel" value="${esc23(phonePrefill)}" placeholder="+973 3XXX XXXX" oninput="checkV23Duplicate()">
        </label>

        <div id="v23-duplicate"></div>

        <div class="v23-qp-actions">
          <button type="button" class="secondary" onclick="closeV23QuickPatient()">Cancel</button>
          <button type="button" class="primary" onclick="saveV23QuickPatient()">Save & Select Patient</button>
        </div>
      </section>`;

    setTimeout(()=>{
      document.getElementById(namePrefill?'v23-new-phone':'v23-new-name')?.focus();
      checkV23Duplicate();
    },50);
  };

  window.closeV23QuickPatient=function(){
    const x=document.getElementById('v23-quick-patient');
    if(x) x.className='';
  };

  window.checkV23Duplicate=function(){
    const phone=cleanPhone(document.getElementById('v23-new-phone')?.value);
    const box=document.getElementById('v23-duplicate');
    if(!box) return;

    if(!phone || phone.replace(/\D/g,'').length<6){
      box.innerHTML='';
      return;
    }

    const existing=(db.patients||[]).find(p=>cleanPhone(pPhone(p))===phone);
    if(existing){
      box.innerHTML=`
        <div class="v23-dup-card">
          <span>!</span>
          <div>
            <b>This mobile already exists</b>
            <small>${esc23(pName(existing))} · ${esc23(existing.id)}</small>
          </div>
          <button type="button" onclick="useV23Existing('${esc23(existing.id)}')">Use Patient</button>
        </div>`;
    }else{
      box.innerHTML=`<div class="v23-available">✓ Mobile number is available</div>`;
    }
  };

  window.useV23Existing=function(id){
    closeV23QuickPatient();
    selectV23Patient(id);
  };

  window.saveV23QuickPatient=function(){
    const name=document.getElementById('v23-new-name')?.value.trim();
    const phoneRaw=document.getElementById('v23-new-phone')?.value.trim();
    const phone=cleanPhone(phoneRaw);

    if(!name || !phoneRaw){
      alert('Please enter patient name and mobile number.');
      return;
    }

    const duplicate=(db.patients||[]).find(p=>cleanPhone(pPhone(p))===phone);
    if(duplicate){
      if(confirm(`This mobile belongs to ${pName(duplicate)}. Use the existing patient instead?`)){
        useV23Existing(duplicate.id);
      }
      return;
    }

    const patient={
      id:nextPatientId(),
      name:name,
      phone:phoneRaw,
      status:'Active',
      createdAt:new Date().toISOString(),
      createdFrom:'Appointment Quick Add'
    };

    db.patients.push(patient);
    save();

    try{ render(); }catch(e){}

    // Restore the appointment modal enhancements after global render.
    setTimeout(()=>{
      enhanceAppointmentModal();
      const select=document.getElementById('v18-patient');
      if(select){
        let opt=[...select.options].find(o=>String(o.value)===String(patient.id));
        if(!opt){
          opt=document.createElement('option');
          opt.value=patient.id;
          opt.textContent=patient.name;
          select.appendChild(opt);
        }
      }
      selectV23Patient(patient.id);
    },40);

    if(typeof window.logAudit==='function'){
      try{window.logAudit('Quick Add Patient','Patients',patient.name);}catch(e){}
    }

    closeV23QuickPatient();
  };

  /* ---------- Replace V18 patient dropdown after opening modal ---------- */
  const originalOpenV18=window.openV18Appointment;
  if(typeof originalOpenV18==='function'){
    window.openV18Appointment=function(){
      originalOpenV18.apply(this,arguments);
      setTimeout(enhanceAppointmentModal,30);
    };
  }

  /* ---------- Also enhance any V18 modal already visible ---------- */
  function repair(){
    enhanceAppointmentModal();
  }

  function css(){
    if(document.getElementById('v23-css')) return;
    const st=document.createElement('style');
    st.id='v23-css';
    st.textContent=`
      .v23-required{font-size:7px;color:#b58b43;font-weight:800;margin-left:5px}
      .v23-picker{position:relative;width:100%;margin-top:2px}
      .v23-search-wrap{position:relative;display:grid;grid-template-columns:28px 1fr auto;align-items:center;border:1px solid #d9e4e7;background:#fff;border-radius:11px;min-height:44px;overflow:hidden;transition:.18s}
      .v23-search-wrap:focus-within{border-color:#174f5b;box-shadow:0 0 0 3px rgba(23,79,91,.07)}
      .v23-search-icon{display:grid;place-items:center;font-size:18px;color:#7f9297}
      .v23-search-wrap input{border:0!important;outline:0!important;box-shadow:none!important;padding:10px 4px!important;width:100%;min-width:0;background:transparent!important}
      .v23-add-mini{height:32px;margin-right:5px;border:1px solid #d8e2e5;background:#f8fbfb;color:#31545c;border-radius:8px;padding:0 9px;font-size:9px;font-weight:800;cursor:pointer;white-space:nowrap}
      .v23-add-mini:hover{border-color:#c99a42;color:#9a722d}
      .v23-results{display:none;position:absolute;left:0;right:0;top:49px;z-index:100006;background:#fff;border:1px solid #dce6e8;border-radius:12px;box-shadow:0 16px 35px rgba(27,62,70,.14);padding:5px;max-height:275px;overflow:auto}
      .v23-results.open{display:block}
      .v23-result{width:100%;display:grid;grid-template-columns:34px 1fr 14px;align-items:center;gap:9px;border:0;background:#fff;border-radius:9px;padding:8px;text-align:left;cursor:pointer}
      .v23-result:hover{background:#f4f8f9}
      .v23-avatar{width:32px;height:32px;border-radius:9px;background:#174f5b;color:#fff;display:grid;place-items:center;font-size:8px;font-weight:900}
      .v23-avatar.large{width:38px;height:38px;border-radius:11px}
      .v23-result-copy b,.v23-result-copy small{display:block}.v23-result-copy b{font-size:10px;color:#294e57}.v23-result-copy small{font-size:8px;color:#89979b;margin-top:2px}
      .v23-arrow{color:#a2adb0}
      .v23-selected{margin-top:7px;border:1px solid #dce7e9;background:#f8fbfb;border-radius:11px;padding:8px;align-items:center;gap:9px}
      .v23-selected>div{flex:1}.v23-selected small,.v23-selected b,.v23-selected span{display:block}.v23-selected small{font-size:7px;color:#b78c3e;font-weight:900;letter-spacing:.8px}.v23-selected b{font-size:10px;color:#31545c;margin:2px 0}.v23-selected span{font-size:8px;color:#87969a}
      .v23-selected>button{border:1px solid #d9e4e7;background:#fff;border-radius:7px;padding:6px 8px;color:#49656d;font-size:8px;font-weight:800;cursor:pointer}
      .v23-no-results{text-align:center;padding:18px 10px}.v23-no-results b,.v23-no-results span{display:block}.v23-no-results b{font-size:10px;color:#36565e}.v23-no-results span{font-size:8px;color:#8d9a9e;margin:4px 0 10px}.v23-no-results button{border:1px solid #c99a42;background:#fff8ea;color:#936c25;border-radius:8px;padding:7px 10px;font-size:9px;font-weight:800;cursor:pointer}

      #v23-quick-patient{display:none}
      #v23-quick-patient.open{display:block;position:fixed;inset:0;z-index:100020}
      .v23-qp-back{position:absolute;inset:0;background:rgba(14,34,40,.43);backdrop-filter:blur(3px)}
      .v23-qp-card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(430px,94vw);background:#fff;border-radius:18px;padding:20px;box-shadow:0 28px 80px rgba(0,0,0,.22)}
      .v23-qp-head{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #e5ecee;padding-bottom:13px;margin-bottom:15px}
      .v23-qp-head small{font-size:8px;color:#b78c3e;font-weight:900;letter-spacing:1.3px}.v23-qp-head h3{margin:3px 0;color:#294e57}.v23-qp-head p{margin:0;font-size:9px;line-height:1.45;color:#829196}
      .v23-qp-head>button{border:0;background:#f1f4f5;width:31px;height:31px;border-radius:50%;font-size:19px;cursor:pointer}
      .v23-qp-card>label{display:flex;flex-direction:column;gap:5px;margin:10px 0}.v23-qp-card>label span{font-size:9px;font-weight:800;color:#536c73}.v23-qp-card>label input{border:1px solid #d9e4e7;border-radius:9px;padding:10px;font:inherit}
      .v23-qp-actions{display:flex;justify-content:flex-end;gap:7px;border-top:1px solid #e7edef;margin-top:14px;padding-top:13px}.v23-qp-actions button{border-radius:8px;padding:9px 11px;font-weight:800;font-size:9px;cursor:pointer}.v23-qp-actions .secondary{border:1px solid #d9e4e7;background:#fff;color:#48636a}.v23-qp-actions .primary{border:1px solid #c99a42;background:#c99a42;color:#fff}
      .v23-dup-card{display:grid;grid-template-columns:28px 1fr auto;gap:8px;align-items:center;border:1px solid #f0d4b1;background:#fff8ed;border-radius:9px;padding:8px;margin-top:8px}.v23-dup-card>span{width:26px;height:26px;border-radius:50%;background:#e9a84d;color:#fff;display:grid;place-items:center;font-weight:900}.v23-dup-card b,.v23-dup-card small{display:block}.v23-dup-card b{font-size:9px;color:#845b22}.v23-dup-card small{font-size:8px;color:#9a7e5a;margin-top:2px}.v23-dup-card button{border:1px solid #e1be88;background:#fff;border-radius:7px;padding:6px 8px;color:#845b22;font-size:8px;font-weight:800;cursor:pointer}
      .v23-available{font-size:8px;color:#29765a;background:#edf8f2;border-radius:8px;padding:7px 9px;margin-top:8px}
      @media(max-width:620px){.v23-search-wrap{grid-template-columns:27px 1fr}.v23-add-mini{grid-column:1/-1;margin:0 6px 6px;height:30px}.v23-results{top:79px}}
    `;
    document.head.appendChild(st);
  }

  function init(){
    css();
    setTimeout(repair,250);
    const obs=new MutationObserver(()=>{
      clearTimeout(window.__v23repair);
      window.__v23repair=setTimeout(repair,40);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();


/* =========================================================
   myAIMS V24 - TREATMENT PLAN + CLINICAL SESSION NOTES
   Professional treatment-plan workflow with:
   - Fast pain/treatment area picker
   - Clinical comments
   - Goals / interventions / home advice
   - Pain score and progress score
   - Session report shown per appointment
   - Patient treatment history
   ========================================================= */
(function(){

  const S=()=>window.state||window.appState||{};
  const save=()=>{ if(typeof window.saveState==='function') window.saveState(); };

  const BODY_AREAS = [
    {group:'Head & Neck', items:['Head','Neck','Jaw','Upper Cervical']},
    {group:'Shoulder & Arm', items:['Right Shoulder','Left Shoulder','Right Arm','Left Arm','Right Elbow','Left Elbow','Right Wrist','Left Wrist','Right Hand','Left Hand']},
    {group:'Back & Spine', items:['Upper Back','Mid Back','Lower Back','Thoracic Spine','Lumbar Spine','Sacrum']},
    {group:'Hip & Leg', items:['Right Hip','Left Hip','Right Thigh','Left Thigh','Right Knee','Left Knee','Right Calf','Left Calf','Right Ankle','Left Ankle','Right Foot','Left Foot']},
    {group:'Other', items:['Chest','Abdomen','Pelvis','General Mobility','Post-operative Area']}
  ];

  const INTERVENTIONS = [
    'Assessment',
    'Manual Therapy',
    'Soft Tissue Therapy',
    'Joint Mobilisation',
    'Stretching',
    'Strengthening',
    'Balance Training',
    'Gait Training',
    'Range of Motion',
    'Neuromuscular Re-education',
    'Functional Training',
    'Posture Education',
    'Home Exercise Education'
  ];

  function ensure(){
    if(!Array.isArray(S().treatmentPlans)) S().treatmentPlans=[];
    if(!Array.isArray(S().sessionNotes)) S().sessionNotes=[];
    save();
  }

  function esc(s){
    return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function appt(id){ return (S().appointments||[]).find(a=>String(a.id)===String(id)); }
  function patient(id){ return (S().patients||[]).find(p=>String(p.id)===String(id)); }
  function patientName(id){
    const p=patient(id);
    return p?(p.name||p.fullName||p.patientName||'Patient'):'Patient';
  }

  function noteForAppointment(id){
    return (S().sessionNotes||[]).find(n=>String(n.appointmentId)===String(id));
  }

  function planForPatient(patientId){
    return (S().treatmentPlans||[])
      .filter(p=>String(p.patientId)===String(patientId) && p.status!=='Closed')
      .sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))[0];
  }

  function selectedAreasHtml(selected=[]){
    return BODY_AREAS.map(g=>`
      <div class="v24-area-group">
        <b>${esc(g.group)}</b>
        <div class="v24-chip-wrap">
          ${g.items.map(item=>`
            <button type="button"
              class="v24-chip ${selected.includes(item)?'active':''}"
              data-area="${esc(item)}"
              onclick="toggleV24Area(this)">
              ${esc(item)}
            </button>`).join('')}
        </div>
      </div>`).join('');
  }

  function interventionHtml(selected=[]){
    return `
      <div class="v24-chip-wrap interventions">
        ${INTERVENTIONS.map(item=>`
          <button type="button"
            class="v24-chip ${selected.includes(item)?'active':''}"
            data-intervention="${esc(item)}"
            onclick="toggleV24Intervention(this)">
            ${esc(item)}
          </button>`).join('')}
      </div>`;
  }

  window.toggleV24Area=function(btn){ btn.classList.toggle('active'); };
  window.toggleV24Intervention=function(btn){ btn.classList.toggle('active'); };

  function collectAreas(root){
    return [...root.querySelectorAll('[data-area].active')].map(x=>x.dataset.area);
  }
  function collectInterventions(root){
    return [...root.querySelectorAll('[data-intervention].active')].map(x=>x.dataset.intervention);
  }

  function modalRoot(){
    let root=document.getElementById('v24-clinical-modal');
    if(!root){
      root=document.createElement('div');
      root.id='v24-clinical-modal';
      document.body.appendChild(root);
    }
    return root;
  }

  window.openV24ClinicalNote=function(appointmentId){
    ensure();
    const a=appt(appointmentId);
    if(!a) return;

    const old=noteForAppointment(appointmentId)||{};
    const plan=planForPatient(a.patientId)||{};
    const root=modalRoot();
    root.className='open';

    root.innerHTML=`
      <div class="v24-backdrop" onclick="closeV24ClinicalNote()"></div>
      <section class="v24-dialog">
        <header class="v24-head">
          <div>
            <small>CLINICAL SESSION</small>
            <h2>${esc(patientName(a.patientId))}</h2>
            <p>${esc(a.date)} · ${esc(a.time||'')} · ${esc(a.therapist||'Therapist')}</p>
          </div>
          <button onclick="closeV24ClinicalNote()">×</button>
        </header>

        <div class="v24-tabs">
          <button class="active" onclick="switchV24Tab('session',this)">Session Note</button>
          <button onclick="switchV24Tab('plan',this)">Treatment Plan</button>
          <button onclick="switchV24Tab('history',this)">Patient History</button>
        </div>

        <div id="v24-tab-session" class="v24-tab active">
          <div class="v24-section-title">
            <div><small>01</small><h3>Pain / Treatment Areas</h3></div>
            <span>Select all relevant areas</span>
          </div>
          ${selectedAreasHtml(old.areas||plan.areas||[])}

          <div class="v24-metrics">
            <label>
              <span>Pain Score</span>
              <div class="v24-range-row">
                <input id="v24-pain" type="range" min="0" max="10" value="${Number(old.painScore??0)}" oninput="document.getElementById('v24-pain-val').textContent=this.value">
                <b id="v24-pain-val">${Number(old.painScore??0)}</b><small>/10</small>
              </div>
            </label>
            <label>
              <span>Session Progress</span>
              <div class="v24-range-row">
                <input id="v24-progress" type="range" min="0" max="100" step="5" value="${Number(old.progressScore??50)}" oninput="document.getElementById('v24-progress-val').textContent=this.value+'%'">
                <b id="v24-progress-val">${Number(old.progressScore??50)}%</b>
              </div>
            </label>
          </div>

          <div class="v24-section-title">
            <div><small>02</small><h3>Clinical Comments</h3></div>
            <span>Fast structured documentation</span>
          </div>

          <div class="v24-note-grid">
            <label class="wide">
              <span>Patient Report / Subjective</span>
              <textarea id="v24-subjective" rows="3" placeholder="Symptoms, changes since last visit, functional limitations...">${esc(old.subjective||'')}</textarea>
            </label>
            <label class="wide">
              <span>Clinical Findings / Objective</span>
              <textarea id="v24-objective" rows="3" placeholder="Movement, mobility, strength, tolerance, observed findings...">${esc(old.objective||'')}</textarea>
            </label>
          </div>

          <div class="v24-section-title">
            <div><small>03</small><h3>Interventions Performed</h3></div>
            <span>Quick-select treatment activities</span>
          </div>
          ${interventionHtml(old.interventions||[])}

          <div class="v24-note-grid">
            <label class="wide">
              <span>Session Response</span>
              <textarea id="v24-response" rows="2" placeholder="Patient response during and after the session...">${esc(old.response||'')}</textarea>
            </label>
            <label class="wide">
              <span>Next Session / Recommendation</span>
              <textarea id="v24-next" rows="2" placeholder="Focus for next visit, progression, review...">${esc(old.nextSession||'')}</textarea>
            </label>
          </div>
        </div>

        <div id="v24-tab-plan" class="v24-tab">
          <div class="v24-plan-banner">
            <div>
              <small>ACTIVE TREATMENT PLAN</small>
              <h3>${esc(plan.title||'New Treatment Plan')}</h3>
              <p>Create or update the overall patient rehabilitation plan.</p>
            </div>
            <span>${esc(plan.status||'Draft')}</span>
          </div>

          <div class="v24-note-grid">
            <label class="wide">
              <span>Treatment Plan Title</span>
              <input id="v24-plan-title" value="${esc(plan.title||'')} " placeholder="e.g. Lower Back Rehabilitation">
            </label>
            <label class="wide">
              <span>Main Clinical Comments</span>
              <textarea id="v24-plan-comments" rows="4" placeholder="Primary concerns, treatment direction, relevant comments...">${esc(plan.comments||'')}</textarea>
            </label>
            <label class="wide">
              <span>Treatment Goals</span>
              <textarea id="v24-plan-goals" rows="4" placeholder="Short and long-term functional goals...">${esc(plan.goals||'')}</textarea>
            </label>
            <label>
              <span>Planned Sessions</span>
              <input id="v24-plan-sessions" type="number" min="1" max="100" value="${Number(plan.plannedSessions||10)}">
            </label>
            <label>
              <span>Review After</span>
              <select id="v24-plan-review">
                ${[2,4,6,8,10,12].map(n=>`<option value="${n}" ${Number(plan.reviewAfter||4)===n?'selected':''}>${n} sessions</option>`).join('')}
              </select>
            </label>
            <label class="wide">
              <span>Home Advice / Exercise Notes</span>
              <textarea id="v24-plan-home" rows="3" placeholder="Education, home exercises or self-management notes...">${esc(plan.homeAdvice||'')}</textarea>
            </label>
          </div>

          <div class="v24-section-title">
            <div><small>AREA</small><h3>Treatment Areas</h3></div>
            <span>Stored with the active plan</span>
          </div>
          <div id="v24-plan-areas">
            ${selectedAreasHtml(plan.areas||old.areas||[])}
          </div>
        </div>

        <div id="v24-tab-history" class="v24-tab">
          ${renderV24PatientHistory(a.patientId)}
        </div>

        <footer class="v24-footer">
          <button class="secondary" onclick="closeV24ClinicalNote()">Close</button>
          <button class="secondary" onclick="previewV24SessionReport('${a.id}')">Preview Report</button>
          <button class="primary" onclick="saveV24ClinicalSession('${a.id}')">Save Clinical Session</button>
        </footer>
      </section>`;
  };

  window.closeV24ClinicalNote=function(){
    const root=document.getElementById('v24-clinical-modal');
    if(root) root.className='';
  };

  window.switchV24Tab=function(name,btn){
    document.querySelectorAll('#v24-clinical-modal .v24-tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('#v24-clinical-modal .v24-tabs button').forEach(x=>x.classList.remove('active'));
    document.getElementById('v24-tab-'+name)?.classList.add('active');
    btn?.classList.add('active');
  };

  window.saveV24ClinicalSession=function(appointmentId){
    ensure();
    const a=appt(appointmentId);
    const root=document.getElementById('v24-clinical-modal');
    if(!a || !root) return;

    const existing=noteForAppointment(appointmentId);
    const note={
      id: existing?.id || 'SN-'+Date.now(),
      appointmentId:a.id,
      patientId:a.patientId,
      date:a.date,
      therapist:a.therapist||'',
      areas:collectAreas(document.getElementById('v24-tab-session')),
      painScore:Number(document.getElementById('v24-pain')?.value||0),
      progressScore:Number(document.getElementById('v24-progress')?.value||0),
      subjective:document.getElementById('v24-subjective')?.value.trim()||'',
      objective:document.getElementById('v24-objective')?.value.trim()||'',
      interventions:collectInterventions(document.getElementById('v24-tab-session')),
      response:document.getElementById('v24-response')?.value.trim()||'',
      nextSession:document.getElementById('v24-next')?.value.trim()||'',
      updatedAt:new Date().toISOString(),
      createdAt:existing?.createdAt||new Date().toISOString()
    };

    if(existing) Object.assign(existing,note);
    else S().sessionNotes.push(note);

    const title=document.getElementById('v24-plan-title')?.value.trim();
    const comments=document.getElementById('v24-plan-comments')?.value.trim();
    const goals=document.getElementById('v24-plan-goals')?.value.trim();
    const home=document.getElementById('v24-plan-home')?.value.trim();
    const planned=Number(document.getElementById('v24-plan-sessions')?.value||0);
    const review=Number(document.getElementById('v24-plan-review')?.value||4);
    const planAreas=collectAreas(document.getElementById('v24-plan-areas'));

    if(title || comments || goals || home || planAreas.length){
      let plan=planForPatient(a.patientId);
      if(!plan){
        plan={
          id:'TP-'+Date.now(),
          patientId:a.patientId,
          createdAt:new Date().toISOString(),
          status:'Active'
        };
        S().treatmentPlans.push(plan);
      }
      Object.assign(plan,{
        title:title||plan.title||'Treatment Plan',
        comments,goals,homeAdvice:home,
        plannedSessions:planned||10,
        reviewAfter:review,
        areas:planAreas,
        updatedAt:new Date().toISOString(),
        status:'Active'
      });
    }

    save();
    if(typeof window.logAudit==='function'){
      try{window.logAudit('Clinical Session Saved','Appointments',`${patientName(a.patientId)} — ${a.date}`);}catch(e){}
    }

    closeV24ClinicalNote();
    renderV24SessionBadges();
    if(typeof window.renderV22==='function') try{window.renderV22();}catch(e){}
  };

  window.renderV24PatientHistory=function(patientId){
    ensure();
    const notes=(S().sessionNotes||[])
      .filter(n=>String(n.patientId)===String(patientId))
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)));

    const plan=planForPatient(patientId);

    return `
      <div class="v24-history-head">
        <div>
          <small>TREATMENT HISTORY</small>
          <h3>${notes.length} documented session${notes.length===1?'':'s'}</h3>
        </div>
        ${plan?`<span>${esc(plan.title||'Treatment Plan')}</span>`:''}
      </div>

      ${plan?`
        <div class="v24-plan-summary">
          <div><small>Plan</small><b>${esc(plan.title||'—')}</b></div>
          <div><small>Planned Sessions</small><b>${Number(plan.plannedSessions||0)}</b></div>
          <div><small>Areas</small><b>${esc((plan.areas||[]).slice(0,3).join(', ')||'—')}</b></div>
        </div>`:''}

      <div class="v24-history-list">
        ${notes.length?notes.map(n=>`
          <article class="v24-history-card">
            <div class="v24-history-date">
              <b>${esc(n.date)}</b>
              <small>${esc(n.therapist||'Therapist')}</small>
            </div>
            <div class="v24-history-main">
              <div class="v24-history-tags">
                ${(n.areas||[]).slice(0,4).map(x=>`<span>${esc(x)}</span>`).join('')}
              </div>
              <p>${esc(n.subjective||n.response||'Clinical session documented.')}</p>
              <small>${(n.interventions||[]).slice(0,4).map(esc).join(' · ')}</small>
            </div>
            <div class="v24-score">
              <b>${Number(n.painScore||0)}/10</b>
              <span>Pain</span>
            </div>
          </article>`).join(''):
          `<div class="v24-empty">No clinical session notes yet.</div>`}
      </div>`;
  };

  window.previewV24SessionReport=function(appointmentId){
    ensure();
    const a=appt(appointmentId);
    const n=noteForAppointment(appointmentId);
    const p=a?planForPatient(a.patientId):null;
    if(!a) return;

    let root=document.getElementById('v24-report-preview');
    if(!root){
      root=document.createElement('div');
      root.id='v24-report-preview';
      document.body.appendChild(root);
    }
    root.className='open';
    root.innerHTML=`
      <div class="v24-backdrop" onclick="closeV24Report()"></div>
      <section class="v24-report">
        <header>
          <div>
            <small>MY AIMS REHABILITATION CENTER W.L.L</small>
            <h2>Session Clinical Report</h2>
          </div>
          <button onclick="closeV24Report()">×</button>
        </header>

        <div class="v24-report-meta">
          <div><small>Patient</small><b>${esc(patientName(a.patientId))}</b></div>
          <div><small>Date</small><b>${esc(a.date)}</b></div>
          <div><small>Therapist</small><b>${esc(a.therapist||'—')}</b></div>
          <div><small>Visit Type</small><b>${esc(a.visitType||'Session')}</b></div>
        </div>

        ${p?`<section><small>TREATMENT PLAN</small><h3>${esc(p.title||'Treatment Plan')}</h3><p>${esc(p.goals||p.comments||'')}</p></section>`:''}

        ${n?`
          <section>
            <small>PAIN / TREATMENT AREAS</small>
            <div class="v24-report-tags">${(n.areas||[]).map(x=>`<span>${esc(x)}</span>`).join('')}</div>
          </section>
          <div class="v24-report-scores">
            <div><small>Pain Score</small><b>${Number(n.painScore||0)}/10</b></div>
            <div><small>Progress</small><b>${Number(n.progressScore||0)}%</b></div>
          </div>
          <section><small>PATIENT REPORT / SUBJECTIVE</small><p>${esc(n.subjective||'—')}</p></section>
          <section><small>CLINICAL FINDINGS / OBJECTIVE</small><p>${esc(n.objective||'—')}</p></section>
          <section><small>INTERVENTIONS</small><p>${esc((n.interventions||[]).join(' · ')||'—')}</p></section>
          <section><small>SESSION RESPONSE</small><p>${esc(n.response||'—')}</p></section>
          <section><small>NEXT SESSION / RECOMMENDATION</small><p>${esc(n.nextSession||'—')}</p></section>
        `:`<div class="v24-empty">No session note saved yet.</div>`}

        <footer>
          <button onclick="window.print()">Print / Save PDF</button>
          <button class="primary" onclick="closeV24Report()">Close</button>
        </footer>
      </section>`;
  };

  window.closeV24Report=function(){
    const r=document.getElementById('v24-report-preview');
    if(r) r.className='';
  };

  function renderV24SessionBadges(){
    document.querySelectorAll('#page-appointments .v22-appt').forEach(btn=>{
      btn.querySelector('.v24-clinical-badge')?.remove();

      const click=btn.getAttribute('onclick')||'';
      const m=click.match(/openV22PatientCard\('([^']+)'\)/);
      if(!m) return;

      const n=noteForAppointment(m[1]);
      if(!n) return;

      const badge=document.createElement('span');
      badge.className='v24-clinical-badge';
      badge.textContent='Clinical ✓';
      btn.appendChild(badge);
    });
  }

  function enhancePatientCard(){
    const card=document.querySelector('#v22-card-shade.open .v22-patient-card');
    if(!card || card.dataset.v24==='1') return;

    const shade=document.getElementById('v22-card-shade');
    const html=shade?.innerHTML||'';
    const m=html.match(/openV21Reminder\('([^']+)'\)/) || html.match(/openV16Appointment\('([^']+)'\)/);
    if(!m) return;

    const id=m[1];
    const a=appt(id);
    if(!a) return;

    card.dataset.v24='1';

    const plan=planForPatient(a.patientId);
    const note=noteForAppointment(id);

    const summary=document.createElement('div');
    summary.className='v24-card-summary';
    summary.innerHTML=`
      <div>
        <small>TREATMENT PLAN</small>
        <b>${esc(plan?.title||'No active plan')}</b>
        <span>${plan?.areas?.length?esc(plan.areas.slice(0,3).join(', ')):'Add treatment areas and goals'}</span>
      </div>
      ${note?`<em>${Number(note.painScore||0)}/10</em>`:'<em>NEW</em>'}`;

    const actions=card.querySelector('.v22-card-actions');
    if(actions) actions.insertAdjacentElement('beforebegin',summary);

    if(actions && !actions.querySelector('.v24-clinical-action')){
      const btn=document.createElement('button');
      btn.className='v24-clinical-action gold';
      btn.textContent=note?'Open Clinical Session':'Add Clinical Session';
      btn.onclick=()=>{ closeV22PatientCard(); openV24ClinicalNote(id); };
      actions.prepend(btn);

      if(note){
        const report=document.createElement('button');
        report.className='v24-clinical-action';
        report.textContent='Session Report';
        report.onclick=()=>{ closeV22PatientCard(); previewV24SessionReport(id); };
        actions.prepend(report);
      }
    }
  }

  function css(){
    if(document.getElementById('v24-css')) return;
    const st=document.createElement('style');
    st.id='v24-css';
    st.textContent=`
      #v24-clinical-modal,#v24-report-preview{display:none}
      #v24-clinical-modal.open,#v24-report-preview.open{display:block;position:fixed;inset:0;z-index:100030}
      .v24-backdrop{position:absolute;inset:0;background:rgba(11,31,37,.50);backdrop-filter:blur(4px)}
      .v24-dialog{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(980px,96vw);height:min(900px,94vh);background:#fff;border-radius:20px;box-shadow:0 35px 100px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden}
      .v24-head{display:flex;justify-content:space-between;align-items:flex-start;gap:15px;padding:20px 22px 15px;border-bottom:1px solid #e4ebed}.v24-head small{font-size:8px;letter-spacing:1.5px;color:#b68a3b;font-weight:900}.v24-head h2{margin:3px 0;color:#173f49}.v24-head p{margin:0;color:#839196;font-size:9px}.v24-head>button{border:0;background:#f1f4f5;width:33px;height:33px;border-radius:50%;font-size:20px;cursor:pointer}
      .v24-tabs{display:flex;gap:6px;padding:10px 22px;border-bottom:1px solid #edf1f2;background:#fbfcfc}.v24-tabs button{border:1px solid #dfe7e9;background:#fff;border-radius:8px;padding:8px 11px;font-size:9px;font-weight:800;color:#566e74;cursor:pointer}.v24-tabs button.active{background:#174f5b;border-color:#174f5b;color:#fff}
      .v24-tab{display:none;overflow:auto;padding:18px 22px;flex:1}.v24-tab.active{display:block}
      .v24-section-title{display:flex;justify-content:space-between;align-items:flex-end;margin:7px 0 10px}.v24-section-title>div{display:flex;align-items:center;gap:7px}.v24-section-title small{width:24px;height:24px;border-radius:8px;background:#fff7e8;color:#9b742d;display:grid;place-items:center;font-size:7px;font-weight:900}.v24-section-title h3{margin:0;font-size:13px;color:#31545c}.v24-section-title>span{font-size:8px;color:#8e9b9f}
      .v24-area-group{margin-bottom:9px}.v24-area-group>b{display:block;font-size:8px;color:#829095;margin-bottom:5px}.v24-chip-wrap{display:flex;flex-wrap:wrap;gap:5px}.v24-chip{border:1px solid #dce6e8;background:#fff;border-radius:999px;padding:6px 9px;font-size:8px;color:#61757b;cursor:pointer}.v24-chip:hover{border-color:#b8c9cd}.v24-chip.active{background:#eaf4f3;border-color:#3d8276;color:#256b60;font-weight:800}.v24-chip-wrap.interventions .v24-chip.active{background:#fff5e3;border-color:#c99a42;color:#8d6828}
      .v24-metrics{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:15px 0}.v24-metrics label{border:1px solid #e0e8ea;border-radius:11px;padding:10px}.v24-metrics label>span{display:block;font-size:8px;font-weight:800;color:#687b80;margin-bottom:8px}.v24-range-row{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:6px}.v24-range-row input{accent-color:#174f5b}.v24-range-row b{font-size:13px;color:#31545c}.v24-range-row small{font-size:8px;color:#88969a}
      .v24-note-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:12px}.v24-note-grid label{display:flex;flex-direction:column;gap:5px}.v24-note-grid .wide{grid-column:1/-1}.v24-note-grid label>span{font-size:8px;font-weight:800;color:#60757b}.v24-note-grid input,.v24-note-grid textarea,.v24-note-grid select{border:1px solid #dce6e8;border-radius:9px;padding:9px;font:inherit;font-size:10px;color:#375860;resize:vertical}
      .v24-plan-banner{display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#174f5b,#2b6874);color:#fff;border-radius:14px;padding:15px;margin-bottom:14px}.v24-plan-banner small{font-size:7px;letter-spacing:1px;opacity:.72}.v24-plan-banner h3{margin:3px 0}.v24-plan-banner p{margin:0;font-size:8px;opacity:.74}.v24-plan-banner>span{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.18);border-radius:99px;padding:5px 8px;font-size:8px}
      .v24-footer{display:flex;justify-content:flex-end;gap:7px;border-top:1px solid #e5ecee;padding:12px 20px;background:#fff}.v24-footer button{border-radius:8px;padding:9px 12px;font-size:9px;font-weight:800;cursor:pointer}.v24-footer .secondary{border:1px solid #dce6e8;background:#fff;color:#4b666d}.v24-footer .primary{border:1px solid #c99a42;background:#c99a42;color:#fff}
      .v24-history-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.v24-history-head small{font-size:7px;color:#b78c3e;font-weight:900;letter-spacing:1px}.v24-history-head h3{margin:3px 0;color:#31545c}.v24-history-head>span{font-size:8px;padding:5px 8px;border-radius:99px;background:#edf6f2;color:#286c57}.v24-plan-summary{display:grid;grid-template-columns:2fr 1fr 2fr;gap:8px;margin-bottom:12px}.v24-plan-summary>div{border:1px solid #e0e8ea;border-radius:9px;padding:9px}.v24-plan-summary small,.v24-plan-summary b{display:block}.v24-plan-summary small{font-size:7px;color:#8b989c}.v24-plan-summary b{font-size:9px;color:#36575f;margin-top:3px}
      .v24-history-list{display:grid;gap:8px}.v24-history-card{display:grid;grid-template-columns:100px 1fr 55px;gap:10px;border:1px solid #e0e8ea;border-radius:11px;padding:10px}.v24-history-date b,.v24-history-date small{display:block}.v24-history-date b{font-size:9px;color:#36575f}.v24-history-date small{font-size:7px;color:#8a989c;margin-top:2px}.v24-history-tags{display:flex;flex-wrap:wrap;gap:4px}.v24-history-tags span{font-size:7px;background:#f0f5f5;border-radius:99px;padding:3px 6px;color:#60767c}.v24-history-main p{font-size:9px;color:#62777c;margin:6px 0}.v24-history-main>small{font-size:7px;color:#9a7c45}.v24-score{text-align:center}.v24-score b,.v24-score span{display:block}.v24-score b{font-size:12px;color:#31545c}.v24-score span{font-size:7px;color:#8b989c}
      .v24-empty{text-align:center;padding:30px;color:#8c999d;font-size:9px}
      .v24-card-summary{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid #e0e8ea;background:#f8fbfb;border-radius:11px;padding:10px;margin:10px 0}.v24-card-summary small,.v24-card-summary b,.v24-card-summary span{display:block}.v24-card-summary small{font-size:7px;color:#b78c3e;font-weight:900}.v24-card-summary b{font-size:10px;color:#31545c;margin:2px 0}.v24-card-summary span{font-size:7px;color:#8b989c}.v24-card-summary em{font-style:normal;font-size:9px;font-weight:900;color:#fff;background:#174f5b;border-radius:99px;padding:5px 7px}.v24-clinical-badge{position:absolute;right:6px;bottom:5px;font-size:6px!important;background:#e9f6f0;color:#287359;border-radius:99px;padding:2px 5px;font-weight:900}
      .v24-report{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(780px,95vw);max-height:92vh;overflow:auto;background:#fff;border-radius:17px;padding:22px;box-shadow:0 30px 90px rgba(0,0,0,.22)}.v24-report header{display:flex;justify-content:space-between;border-bottom:2px solid #174f5b;padding-bottom:13px}.v24-report header small{font-size:8px;color:#b78c3e;font-weight:900;letter-spacing:1px}.v24-report header h2{margin:3px 0;color:#31545c}.v24-report header button{border:0;background:#f1f4f5;border-radius:50%;width:31px;height:31px;font-size:18px}.v24-report-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}.v24-report-meta>div{border:1px solid #e1e9eb;border-radius:9px;padding:8px}.v24-report-meta small,.v24-report-meta b{display:block}.v24-report-meta small,.v24-report section>small{font-size:7px;color:#8c999d;font-weight:800}.v24-report-meta b{font-size:9px;color:#36575f;margin-top:3px}.v24-report section{border-bottom:1px solid #edf1f2;padding:10px 0}.v24-report section h3{margin:3px 0;color:#31545c}.v24-report section p{font-size:9px;line-height:1.55;color:#60757b;white-space:pre-wrap}.v24-report-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.v24-report-tags span{font-size:7px;background:#eff5f5;border-radius:99px;padding:4px 7px}.v24-report-scores{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}.v24-report-scores>div{background:#f7f9fa;border-radius:9px;padding:9px}.v24-report-scores small,.v24-report-scores b{display:block}.v24-report-scores small{font-size:7px;color:#8b989c}.v24-report-scores b{font-size:14px;color:#31545c;margin-top:2px}.v24-report footer{display:flex;justify-content:flex-end;gap:7px;margin-top:14px}.v24-report footer button{border:1px solid #dbe5e7;background:#fff;border-radius:8px;padding:8px 11px;font-size:8px;font-weight:800}.v24-report footer .primary{background:#c99a42;border-color:#c99a42;color:#fff}
      @media(max-width:700px){.v24-dialog{height:96vh}.v24-metrics,.v24-note-grid{grid-template-columns:1fr}.v24-note-grid .wide{grid-column:auto}.v24-plan-summary{grid-template-columns:1fr}.v24-history-card{grid-template-columns:1fr}.v24-report-meta{grid-template-columns:1fr 1fr}}
      @media print{#v24-report-preview.open{position:static}.v24-backdrop{display:none}.v24-report{position:static;transform:none;width:100%;max-height:none;box-shadow:none;border-radius:0}.v24-report header button,.v24-report footer{display:none}}
    `;
    document.head.appendChild(st);
  }

  function repair(){
    renderV24SessionBadges();
    enhancePatientCard();
  }

  function init(){
    ensure();
    css();
    setTimeout(repair,400);

    const obs=new MutationObserver(()=>{
      clearTimeout(window.__v24repair);
      window.__v24repair=setTimeout(repair,60);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

})();


/* =========================================================
   myAIMS V25 - COLORED APPOINTMENTS UI
   Implements the approved visual direction:
   - Stronger visual hierarchy
   - Color-coded appointment cards
   - More distinct day cards
   - Status legend
   - Softer tinted panels instead of a white screen
   - Highlighted selected day
   - Available-slot cards
   ========================================================= */
(function(){

  const STATUS_CLASS = {
    'Scheduled':'scheduled',
    'Confirmed':'confirmed',
    'Checked In':'checked-in',
    'In Session':'in-session',
    'Completed':'completed',
    'Cancelled':'cancelled',
    'No Show':'no-show'
  };

  function statusClass(s){
    return STATUS_CLASS[s] || String(s||'Scheduled').toLowerCase().replace(/\s+/g,'-');
  }

  function enhanceOrbitCards(){
    document.querySelectorAll('#page-appointments .v22-day').forEach(day=>{
      const small=day.querySelector('small');
      const txt=(small?.textContent||'').trim().toLowerCase();
      day.classList.remove('quiet','balanced','busy','full');
      if(txt.includes('full')) day.classList.add('full');
      else if(txt.includes('busy')) day.classList.add('busy');
      else if(txt.includes('balanced')) day.classList.add('balanced');
      else day.classList.add('quiet');
    });
  }

  function enhanceAppointments(){
    document.querySelectorAll('#page-appointments .v22-appt').forEach(card=>{
      const onclick=card.getAttribute('onclick')||'';
      const m=onclick.match(/openV22PatientCard\('([^']+)'\)/);
      if(!m) return;

      const id=m[1];
      const db=window.state||window.appState||{};
      const a=(db.appointments||[]).find(x=>String(x.id)===String(id));
      if(!a) return;

      card.classList.add('v25-appt');
      Object.values(STATUS_CLASS).forEach(c=>card.classList.remove('v25-'+c));
      card.classList.add('v25-'+statusClass(a.status));

      // Treatment-area accent if available
      const note=(db.sessionNotes||[]).find(n=>String(n.appointmentId)===String(id));
      const visit=String(a.visitType||'').toLowerCase();
      const areas=(note?.areas||[]).join(' ').toLowerCase();

      let theme='general';
      if(areas.includes('back') || visit.includes('back')) theme='back';
      else if(areas.includes('shoulder') || visit.includes('shoulder')) theme='shoulder';
      else if(areas.includes('knee') || visit.includes('knee')) theme='knee';
      else if(areas.includes('neck') || visit.includes('neck')) theme='neck';
      else if(visit.includes('assessment')) theme='assessment';
      else if(visit.includes('pediatric')) theme='pediatric';
      else if(visit.includes('post')) theme='postop';
      card.dataset.v25Theme=theme;

      const copy=card.querySelector('.v22-appt-copy');
      if(copy && !copy.querySelector('.v25-meta')){
        const meta=document.createElement('div');
        meta.className='v25-meta';
        meta.innerHTML=`
          <span>${a.status||'Scheduled'}</span>
          ${a.room?`<span>${a.room}</span>`:''}
        `;
        copy.appendChild(meta);
      }
    });
  }

  function addVisualHeader(){
    const root=document.getElementById('v22-orbit-calendar');
    if(!root || root.querySelector('.v25-viewbar')) return;

    const hero=root.querySelector('.v22-hero');
    if(!hero) return;

    const viewbar=document.createElement('div');
    viewbar.className='v25-viewbar';
    viewbar.innerHTML=`
      <div class="v25-period">
        <button type="button" onclick="moveV22Week(-7)">‹</button>
        <div>
          <small>CALENDAR</small>
          <b>${new Date(window.__v22Date+'T00:00:00').toLocaleDateString(undefined,{month:'long',year:'numeric'})}</b>
        </div>
        <button type="button" onclick="moveV22Week(7)">›</button>
      </div>
      <div class="v25-modes">
        <button class="active">Day</button>
        <button>Week</button>
        <button>Month</button>
        <button>Timeline</button>
      </div>
      <div class="v25-legend">
        <span><i class="scheduled"></i>Scheduled</span>
        <span><i class="confirmed"></i>Confirmed</span>
        <span><i class="in-session"></i>In Progress</span>
        <span><i class="completed"></i>Completed</span>
        <span><i class="cancelled"></i>Cancelled</span>
      </div>`;
    hero.insertAdjacentElement('afterend',viewbar);
  }

  function addSummaryTitle(){
    const command=document.querySelector('#page-appointments .v22-command');
    if(!command || command.querySelector('.v25-day-summary')) return;

    const db=window.state||window.appState||{};
    const list=(db.appointments||[]).filter(a=>a.date===window.__v22Date && a.status!=='Cancelled');
    const available=Math.max(0,10-list.length);

    const sum=document.createElement('div');
    sum.className='v25-day-summary';
    sum.innerHTML=`
      <div class="v25-calendar-icon">▦</div>
      <div>
        <b>${new Date(window.__v22Date+'T00:00:00').toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</b>
        <small>${list.length} appointments · ${available} available slots</small>
      </div>`;
    command.prepend(sum);
  }

  function tintSidePanels(){
    document.querySelectorAll('#page-appointments .v22-insight,#page-appointments .v22-next').forEach((x,i)=>{
      x.classList.add(i%2===0?'v25-panel-teal':'v25-panel-sand');
    });
  }

  function addSlotLabels(){
    document.querySelectorAll('#page-appointments .v22-empty-slot').forEach(slot=>{
      if(slot.dataset.v25==='1') return;
      slot.dataset.v25='1';
      slot.addEventListener('mouseenter',()=>{
        if(slot.querySelector('.v25-slot-label')) return;
        const tag=document.createElement('span');
        tag.className='v25-slot-label';
        tag.textContent='+ Add Appointment';
        slot.appendChild(tag);
      });
      slot.addEventListener('mouseleave',()=>{
        slot.querySelector('.v25-slot-label')?.remove();
      });
    });
  }

  function repair(){
    enhanceOrbitCards();
    enhanceAppointments();
    addVisualHeader();
    addSummaryTitle();
    tintSidePanels();
    addSlotLabels();
  }

  function css(){
    if(document.getElementById('v25-css')) return;
    const st=document.createElement('style');
    st.id='v25-css';
    st.textContent=`
      /* ===== Overall appointment page depth ===== */
      #page-appointments{
        background:
          radial-gradient(circle at 82% 8%, rgba(201,154,66,.08), transparent 22%),
          linear-gradient(180deg,#f7fbfc 0%,#f1f7f8 100%)!important;
        border-radius:18px;
        padding:18px!important;
      }

      #page-appointments .v22-hero{
        background:linear-gradient(135deg,#ffffff 0%,#f4fafb 100%);
        border:1px solid #dbe8eb;
        border-radius:18px;
        padding:16px 18px;
        box-shadow:0 8px 24px rgba(28,72,82,.06);
      }

      #page-appointments .v22-hero h2{color:#0f4050!important}
      #page-appointments .v22-hero p{color:#698087!important}

      /* ===== New view bar ===== */
      .v25-viewbar{
        display:grid;
        grid-template-columns:auto auto 1fr;
        gap:14px;
        align-items:center;
        margin:12px 0 14px;
        padding:10px 12px;
        border:1px solid #d9e6e9;
        background:rgba(255,255,255,.92);
        border-radius:14px;
        box-shadow:0 5px 18px rgba(31,72,80,.05);
      }
      .v25-period{display:flex;align-items:center;gap:10px}
      .v25-period button{
        width:33px;height:33px;border:1px solid #d6e2e5;background:#fff;
        border-radius:9px;color:#264f59;font-size:18px;cursor:pointer
      }
      .v25-period small,.v25-period b{display:block}
      .v25-period small{font-size:7px;color:#b48637;font-weight:900;letter-spacing:1px}
      .v25-period b{font-size:11px;color:#244b55;margin-top:2px}
      .v25-modes{display:flex;background:#edf4f5;border-radius:9px;padding:3px}
      .v25-modes button{
        border:0;background:transparent;border-radius:7px;padding:7px 11px;
        font-size:8px;font-weight:800;color:#597078;cursor:pointer
      }
      .v25-modes button.active{background:#174f5b;color:#fff;box-shadow:0 4px 12px rgba(23,79,91,.18)}
      .v25-legend{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
      .v25-legend span{display:flex;align-items:center;gap:4px;font-size:7px;color:#62777d}
      .v25-legend i{width:8px;height:8px;border-radius:50%;display:block}
      .v25-legend i.scheduled{background:#4c9be8}
      .v25-legend i.confirmed{background:#3cba84}
      .v25-legend i.in-session{background:#19a78d}
      .v25-legend i.completed{background:#6a927d}
      .v25-legend i.cancelled{background:#e76d78}

      /* ===== Day orbit cards ===== */
      #page-appointments .v22-day{
        min-height:132px!important;
        border:1px solid #dce7e9!important;
        background:#fff!important;
        box-shadow:0 6px 17px rgba(34,74,83,.055);
      }
      #page-appointments .v22-day.quiet{background:linear-gradient(180deg,#ffffff,#f8fbfc)!important}
      #page-appointments .v22-day.balanced{background:linear-gradient(180deg,#f8fffc,#eef9f4)!important}
      #page-appointments .v22-day.busy{background:linear-gradient(180deg,#fffdf6,#fff6df)!important}
      #page-appointments .v22-day.full{background:linear-gradient(180deg,#fff9f9,#ffeded)!important}
      #page-appointments .v22-day.active{
        background:linear-gradient(145deg,#174f5b,#0f4050)!important;
        border-color:#174f5b!important;
        box-shadow:0 12px 28px rgba(23,79,91,.22)!important;
      }
      #page-appointments .v22-day.active *{color:#fff!important}
      #page-appointments .v22-day.active .v22-ring:after{background:#174f5b!important}
      #page-appointments .v22-day.active .v22-load{background:rgba(255,255,255,.22)!important}
      #page-appointments .v22-day.active .v22-load i{background:#d8aa52!important}
      #page-appointments .v22-day.today:not(.active){
        box-shadow:inset 0 0 0 2px rgba(201,154,66,.35),0 6px 17px rgba(34,74,83,.055)
      }

      /* ===== Day summary ===== */
      #page-appointments .v22-command{
        background:linear-gradient(135deg,#ffffff,#f7fbfc)!important;
        border:1px solid #dce8ea!important;
        box-shadow:0 5px 16px rgba(34,74,83,.05);
      }
      .v25-day-summary{display:flex;align-items:center;gap:10px;margin-right:auto}
      .v25-calendar-icon{
        width:34px;height:34px;border-radius:10px;
        background:#e8f3f6;color:#174f5b;display:grid;place-items:center;
        font-size:16px;font-weight:900
      }
      .v25-day-summary b,.v25-day-summary small{display:block}
      .v25-day-summary b{font-size:11px;color:#224a54}
      .v25-day-summary small{font-size:8px;color:#799096;margin-top:2px}

      /* ===== Main calendar area ===== */
      #page-appointments .v22-flow-shell{
        border:1px solid #d8e5e8!important;
        background:#fff!important;
        box-shadow:0 10px 30px rgba(23,65,74,.07);
      }
      #page-appointments .v22-flow-head{
        background:linear-gradient(180deg,#f9fcfd,#f0f6f7)!important;
      }
      #page-appointments .v22-time-axis{background:#f8fbfc!important}
      #page-appointments .v22-lane{
        background:
          linear-gradient(to bottom,transparent 75px,#eaf1f2 76px),
          linear-gradient(180deg,#ffffff,#fbfdfd)!important;
        background-size:100% 76px,100% 100%!important;
      }

      /* ===== Appointment cards - modern pastel ===== */
      #page-appointments .v22-appt.v25-appt{
        border-width:1px!important;
        border-left-width:4px!important;
        border-radius:11px!important;
        box-shadow:0 5px 14px rgba(35,72,80,.08)!important;
        transition:.18s ease!important;
      }
      #page-appointments .v22-appt.v25-appt:hover{
        transform:translateY(-2px) scale(1.01)!important;
        box-shadow:0 11px 24px rgba(35,72,80,.14)!important;
      }

      #page-appointments .v22-appt.v25-scheduled{
        background:linear-gradient(135deg,#eef7ff,#dfefff)!important;
        border-color:#67a9eb!important;
      }
      #page-appointments .v22-appt.v25-confirmed{
        background:linear-gradient(135deg,#effbf5,#dcf5e8)!important;
        border-color:#47b782!important;
      }
      #page-appointments .v22-appt.v25-checked-in{
        background:linear-gradient(135deg,#fff9e9,#ffefc3)!important;
        border-color:#d6a83e!important;
      }
      #page-appointments .v22-appt.v25-in-session{
        background:linear-gradient(135deg,#eafaf7,#d4f2eb)!important;
        border-color:#1aa58c!important;
      }
      #page-appointments .v22-appt.v25-completed{
        background:linear-gradient(135deg,#f0f7f4,#e3efe9)!important;
        border-color:#6a947d!important;
      }
      #page-appointments .v22-appt.v25-cancelled{
        background:linear-gradient(135deg,#fff2f3,#ffe3e6)!important;
        border-color:#e56b78!important;
        opacity:.86
      }
      #page-appointments .v22-appt.v25-no-show{
        background:linear-gradient(135deg,#fff0f7,#f6dfef)!important;
        border-color:#b86aa0!important;
      }

      /* Treatment type subtle tone */
      #page-appointments .v22-appt[data-v25-theme="back"]{box-shadow:inset 0 0 0 1px rgba(92,153,211,.10),0 5px 14px rgba(35,72,80,.08)!important}
      #page-appointments .v22-appt[data-v25-theme="shoulder"] .v22-avatar{background:#458fca!important}
      #page-appointments .v22-appt[data-v25-theme="knee"] .v22-avatar{background:#b18a39!important}
      #page-appointments .v22-appt[data-v25-theme="neck"] .v22-avatar{background:#7e68ba!important}
      #page-appointments .v22-appt[data-v25-theme="assessment"] .v22-avatar{background:#2b8e7d!important}
      #page-appointments .v22-appt[data-v25-theme="pediatric"] .v22-avatar{background:#bc719e!important}
      #page-appointments .v22-appt[data-v25-theme="postop"] .v22-avatar{background:#5c7f9f!important}

      .v25-meta{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
      .v25-meta span{
        font-size:6px!important;
        padding:2px 5px;border-radius:99px;
        background:rgba(255,255,255,.66);
        color:#587078!important;
        border:1px solid rgba(255,255,255,.7)
      }

      /* ===== Available slot hover ===== */
      #page-appointments .v22-empty-slot:hover{
        background:linear-gradient(90deg,rgba(23,79,91,.035),rgba(201,154,66,.07))!important;
        outline:1px dashed rgba(23,79,91,.20);
        outline-offset:-5px;
      }
      .v25-slot-label{
        position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
        border:1px dashed #8ab2b8;background:rgba(255,255,255,.9);
        color:#4b7078;border-radius:8px;padding:5px 9px;
        font-size:7px;font-weight:800;pointer-events:none
      }

      /* ===== Side panels ===== */
      #page-appointments .v22-insight.v25-panel-teal{
        background:linear-gradient(145deg,#f2faf9,#e7f5f2)!important;
        border-color:#cfe7e1!important;
      }
      #page-appointments .v22-next.v25-panel-sand{
        background:linear-gradient(145deg,#fffdf8,#fbf4e7)!important;
        border-color:#eadfc8!important;
      }
      #page-appointments .v22-insight,
      #page-appointments .v22-next{
        box-shadow:0 8px 22px rgba(33,71,80,.06)
      }

      /* ===== Main page title ===== */
      #page-appointments > .page-title{
        background:transparent!important;
      }

      /* ===== Responsive ===== */
      @media(max-width:1100px){
        .v25-viewbar{grid-template-columns:1fr}
        .v25-legend{justify-content:flex-start}
      }
      @media(max-width:700px){
        #page-appointments{padding:10px!important}
        .v25-modes{overflow:auto}
        .v25-legend{display:none}
        .v25-day-summary{display:none}
      }
    `;
    document.head.appendChild(st);
  }

  function init(){
    css();
    setTimeout(repair,250);
    const obs=new MutationObserver(()=>{
      clearTimeout(window.__v25repair);
      window.__v25repair=setTimeout(repair,60);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

})();


/* =========================================================
   myAIMS V26 - INTERACTIVE BODY MAP
   Front / Back visual body map for clinical documentation.
   Click a body region -> auto-select Right/Left area.
   Supports pain severity per area and syncs with V24 notes.
   ========================================================= */
(function(){

  const S=()=>window.state||window.appState||{};
  const save=()=>{ if(typeof window.saveState==='function') window.saveState(); };
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Keeps local selection state while V24 modal is open.
  window.__v26BodyMap = window.__v26BodyMap || {view:'front', areas:{}};

  const REGION_LABELS = {
    head:'Head',
    neck:'Neck',
    chest:'Chest',
    abdomen:'Abdomen',
    pelvis:'Pelvis',
    upperBack:'Upper Back',
    midBack:'Mid Back',
    lowerBack:'Lower Back',
    rShoulder:'Right Shoulder',
    lShoulder:'Left Shoulder',
    rArm:'Right Arm',
    lArm:'Left Arm',
    rElbow:'Right Elbow',
    lElbow:'Left Elbow',
    rWrist:'Right Wrist',
    lWrist:'Left Wrist',
    rHand:'Right Hand',
    lHand:'Left Hand',
    rHip:'Right Hip',
    lHip:'Left Hip',
    rThigh:'Right Thigh',
    lThigh:'Left Thigh',
    rKnee:'Right Knee',
    lKnee:'Left Knee',
    rCalf:'Right Calf',
    lCalf:'Left Calf',
    rAnkle:'Right Ankle',
    lAnkle:'Left Ankle',
    rFoot:'Right Foot',
    lFoot:'Left Foot'
  };

  const SEVERITY_LABELS = ['Selected','Mild','Moderate','Severe'];
  const SEVERITY_CLASS = ['selected','mild','moderate','severe'];

  function selectedV24Areas(){
    return [...document.querySelectorAll('#v24-tab-session [data-area].active')].map(x=>x.dataset.area);
  }

  function seedFromV24(){
    const selected=selectedV24Areas();
    const notePain=Number(document.getElementById('v24-pain')?.value||0);
    const defaultSeverity=notePain>=8?3:notePain>=5?2:notePain>=1?1:0;

    Object.entries(REGION_LABELS).forEach(([key,label])=>{
      if(selected.includes(label) && window.__v26BodyMap.areas[key] == null){
        window.__v26BodyMap.areas[key]=defaultSeverity;
      }
    });
  }

  function regionState(key){
    const val=window.__v26BodyMap.areas[key];
    return val == null ? -1 : Number(val);
  }

  function bodySvg(view){
    const back=view==='back';
    const selected=k=>{
      const st=regionState(k);
      return st>=0 ? `active ${SEVERITY_CLASS[st]}` : '';
    };
    const title=k=>`${REGION_LABELS[k]}${regionState(k)>=0?' · '+SEVERITY_LABELS[regionState(k)]:''}`;

    // Neutral, simplified clinical silhouette. SVG regions are intentionally broad.
    return `
      <svg class="v26-body-svg" viewBox="0 0 320 620" aria-label="${back?'Back':'Front'} body map">
        <defs>
          <filter id="v26shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity=".08"/>
          </filter>
        </defs>

        <g class="v26-silhouette" filter="url(#v26shadow)">
          <!-- HEAD -->
          <ellipse class="v26-region ${selected('head')}" data-region="head"
            onclick="toggleV26Region('head')" cx="160" cy="52" rx="34" ry="40">
            <title>${title('head')}</title>
          </ellipse>

          <!-- NECK -->
          <rect class="v26-region ${selected('neck')}" data-region="neck"
            onclick="toggleV26Region('neck')" x="143" y="88" width="34" height="30" rx="10">
            <title>${title('neck')}</title>
          </rect>

          ${back ? `
          <!-- BACK TORSO -->
          <path class="v26-region ${selected('upperBack')}" data-region="upperBack"
            onclick="toggleV26Region('upperBack')" d="M116 119 Q160 103 204 119 L213 195 Q160 205 107 195 Z">
            <title>${title('upperBack')}</title>
          </path>
          <path class="v26-region ${selected('midBack')}" data-region="midBack"
            onclick="toggleV26Region('midBack')" d="M108 196 Q160 205 212 196 L208 265 Q160 280 112 265 Z">
            <title>${title('midBack')}</title>
          </path>
          <path class="v26-region ${selected('lowerBack')}" data-region="lowerBack"
            onclick="toggleV26Region('lowerBack')" d="M112 265 Q160 280 208 265 L201 321 Q160 337 119 321 Z">
            <title>${title('lowerBack')}</title>
          </path>` : `
          <!-- FRONT TORSO -->
          <path class="v26-region ${selected('chest')}" data-region="chest"
            onclick="toggleV26Region('chest')" d="M116 119 Q160 103 204 119 L212 202 Q160 212 108 202 Z">
            <title>${title('chest')}</title>
          </path>
          <path class="v26-region ${selected('abdomen')}" data-region="abdomen"
            onclick="toggleV26Region('abdomen')" d="M109 203 Q160 213 211 203 L207 274 Q160 288 113 274 Z">
            <title>${title('abdomen')}</title>
          </path>
          <path class="v26-region ${selected('pelvis')}" data-region="pelvis"
            onclick="toggleV26Region('pelvis')" d="M113 274 Q160 288 207 274 L201 326 Q160 344 119 326 Z">
            <title>${title('pelvis')}</title>
          </path>`}

          <!-- SHOULDERS -->
          <ellipse class="v26-region ${selected('rShoulder')}" data-region="rShoulder"
            onclick="toggleV26Region('rShoulder')" cx="95" cy="142" rx="25" ry="28">
            <title>${title('rShoulder')}</title>
          </ellipse>
          <ellipse class="v26-region ${selected('lShoulder')}" data-region="lShoulder"
            onclick="toggleV26Region('lShoulder')" cx="225" cy="142" rx="25" ry="28">
            <title>${title('lShoulder')}</title>
          </ellipse>

          <!-- UPPER ARMS -->
          <path class="v26-region ${selected('rArm')}" data-region="rArm"
            onclick="toggleV26Region('rArm')" d="M77 159 Q92 153 107 160 L94 245 Q80 252 66 242 Z">
            <title>${title('rArm')}</title>
          </path>
          <path class="v26-region ${selected('lArm')}" data-region="lArm"
            onclick="toggleV26Region('lArm')" d="M213 160 Q228 153 243 159 L254 242 Q240 252 226 245 Z">
            <title>${title('lArm')}</title>
          </path>

          <!-- ELBOWS -->
          <ellipse class="v26-region ${selected('rElbow')}" data-region="rElbow"
            onclick="toggleV26Region('rElbow')" cx="80" cy="260" rx="16" ry="17">
            <title>${title('rElbow')}</title>
          </ellipse>
          <ellipse class="v26-region ${selected('lElbow')}" data-region="lElbow"
            onclick="toggleV26Region('lElbow')" cx="240" cy="260" rx="16" ry="17">
            <title>${title('lElbow')}</title>
          </ellipse>

          <!-- FOREARM/WRISTS -->
          <path class="v26-region ${selected('rWrist')}" data-region="rWrist"
            onclick="toggleV26Region('rWrist')" d="M68 278 Q80 274 91 280 L82 357 Q72 361 62 354 Z">
            <title>${title('rWrist')}</title>
          </path>
          <path class="v26-region ${selected('lWrist')}" data-region="lWrist"
            onclick="toggleV26Region('lWrist')" d="M229 280 Q240 274 252 278 L258 354 Q248 361 238 357 Z">
            <title>${title('lWrist')}</title>
          </path>

          <!-- HANDS -->
          <ellipse class="v26-region ${selected('rHand')}" data-region="rHand"
            onclick="toggleV26Region('rHand')" cx="69" cy="375" rx="15" ry="24">
            <title>${title('rHand')}</title>
          </ellipse>
          <ellipse class="v26-region ${selected('lHand')}" data-region="lHand"
            onclick="toggleV26Region('lHand')" cx="251" cy="375" rx="15" ry="24">
            <title>${title('lHand')}</title>
          </ellipse>

          <!-- HIPS -->
          <ellipse class="v26-region ${selected('rHip')}" data-region="rHip"
            onclick="toggleV26Region('rHip')" cx="131" cy="337" rx="27" ry="26">
            <title>${title('rHip')}</title>
          </ellipse>
          <ellipse class="v26-region ${selected('lHip')}" data-region="lHip"
            onclick="toggleV26Region('lHip')" cx="189" cy="337" rx="27" ry="26">
            <title>${title('lHip')}</title>
          </ellipse>

          <!-- THIGHS -->
          <path class="v26-region ${selected('rThigh')}" data-region="rThigh"
            onclick="toggleV26Region('rThigh')" d="M116 359 Q138 352 151 365 L143 447 Q126 454 111 444 Z">
            <title>${title('rThigh')}</title>
          </path>
          <path class="v26-region ${selected('lThigh')}" data-region="lThigh"
            onclick="toggleV26Region('lThigh')" d="M169 365 Q182 352 204 359 L209 444 Q194 454 177 447 Z">
            <title>${title('lThigh')}</title>
          </path>

          <!-- KNEES -->
          <ellipse class="v26-region ${selected('rKnee')}" data-region="rKnee"
            onclick="toggleV26Region('rKnee')" cx="127" cy="462" rx="19" ry="18">
            <title>${title('rKnee')}</title>
          </ellipse>
          <ellipse class="v26-region ${selected('lKnee')}" data-region="lKnee"
            onclick="toggleV26Region('lKnee')" cx="193" cy="462" rx="19" ry="18">
            <title>${title('lKnee')}</title>
          </ellipse>

          <!-- CALVES -->
          <path class="v26-region ${selected('rCalf')}" data-region="rCalf"
            onclick="toggleV26Region('rCalf')" d="M113 484 Q128 477 142 485 L137 552 Q126 558 116 551 Z">
            <title>${title('rCalf')}</title>
          </path>
          <path class="v26-region ${selected('lCalf')}" data-region="lCalf"
            onclick="toggleV26Region('lCalf')" d="M178 485 Q192 477 207 484 L204 551 Q194 558 183 552 Z">
            <title>${title('lCalf')}</title>
          </path>

          <!-- ANKLES -->
          <ellipse class="v26-region ${selected('rAnkle')}" data-region="rAnkle"
            onclick="toggleV26Region('rAnkle')" cx="126" cy="563" rx="13" ry="12">
            <title>${title('rAnkle')}</title>
          </ellipse>
          <ellipse class="v26-region ${selected('lAnkle')}" data-region="lAnkle"
            onclick="toggleV26Region('lAnkle')" cx="194" cy="563" rx="13" ry="12">
            <title>${title('lAnkle')}</title>
          </ellipse>

          <!-- FEET -->
          <path class="v26-region ${selected('rFoot')}" data-region="rFoot"
            onclick="toggleV26Region('rFoot')" d="M113 577 Q127 570 139 581 L145 603 Q126 613 106 599 Z">
            <title>${title('rFoot')}</title>
          </path>
          <path class="v26-region ${selected('lFoot')}" data-region="lFoot"
            onclick="toggleV26Region('lFoot')" d="M181 581 Q193 570 207 577 L214 599 Q194 613 175 603 Z">
            <title>${title('lFoot')}</title>
          </path>
        </g>

        <text x="160" y="615" text-anchor="middle" class="v26-view-label">${back?'BACK VIEW':'FRONT VIEW'}</text>
      </svg>`;
  }

  function selectedList(){
    const entries=Object.entries(window.__v26BodyMap.areas)
      .filter(([_,v])=>v!=null && Number(v)>=0)
      .map(([k,v])=>({key:k,label:REGION_LABELS[k],severity:Number(v)}));

    if(!entries.length){
      return `<div class="v26-none">No body area selected yet.</div>`;
    }
    return entries.map(x=>`
      <div class="v26-area-row">
        <span class="v26-severity-dot ${SEVERITY_CLASS[x.severity]}"></span>
        <div><b>${esc(x.label)}</b><small>${SEVERITY_LABELS[x.severity]}</small></div>
        <button type="button" onclick="cycleV26Severity('${x.key}')">Intensity</button>
        <button type="button" class="remove" onclick="removeV26Region('${x.key}')">×</button>
      </div>`).join('');
  }

  function syncToV24(){
    const labels=Object.entries(window.__v26BodyMap.areas)
      .filter(([_,v])=>v!=null && Number(v)>=0)
      .map(([k])=>REGION_LABELS[k]);

    document.querySelectorAll('#v24-tab-session [data-area]').forEach(btn=>{
      btn.classList.toggle('active', labels.includes(btn.dataset.area));
    });

    // Set global pain score to the strongest selected body area if greater.
    const severities=Object.values(window.__v26BodyMap.areas)
      .filter(v=>v!=null && Number(v)>=0).map(Number);
    if(severities.length){
      const max=Math.max(...severities);
      const suggested=[0,3,6,9][max];
      const pain=document.getElementById('v24-pain');
      const val=document.getElementById('v24-pain-val');
      if(pain && Number(pain.value)<suggested){
        pain.value=suggested;
        if(val) val.textContent=String(suggested);
      }
    }
  }

  function renderBodyMap(){
    const root=document.getElementById('v26-body-map');
    if(!root) return;

    root.innerHTML=`
      <div class="v26-map-head">
        <div>
          <small>VISUAL BODY MAP</small>
          <h3>Tap the pain or treatment area</h3>
          <p>Right / Left is recorded automatically.</p>
        </div>
        <div class="v26-view-toggle">
          <button type="button" class="${window.__v26BodyMap.view==='front'?'active':''}" onclick="setV26View('front')">Front</button>
          <button type="button" class="${window.__v26BodyMap.view==='back'?'active':''}" onclick="setV26View('back')">Back</button>
        </div>
      </div>

      <div class="v26-map-layout">
        <div class="v26-figure">
          ${bodySvg(window.__v26BodyMap.view)}
          <div class="v26-legend">
            <span><i class="selected"></i>Selected</span>
            <span><i class="mild"></i>Mild</span>
            <span><i class="moderate"></i>Moderate</span>
            <span><i class="severe"></i>Severe</span>
          </div>
        </div>
        <div class="v26-selection-panel">
          <div class="v26-selection-title">
            <div><small>SELECTED AREAS</small><b>${Object.values(window.__v26BodyMap.areas).filter(v=>v!=null && Number(v)>=0).length}</b></div>
            <button type="button" onclick="clearV26BodyMap()">Clear All</button>
          </div>
          <div class="v26-selected-list">${selectedList()}</div>
          <div class="v26-tip">
            <b>Fast documentation</b>
            <span>Click the same area again to increase pain intensity.</span>
          </div>
        </div>
      </div>`;
  }

  window.setV26View=function(view){
    window.__v26BodyMap.view=view;
    renderBodyMap();
  };

  window.toggleV26Region=function(key){
    const current=regionState(key);
    if(current<0) window.__v26BodyMap.areas[key]=0;
    else if(current<3) window.__v26BodyMap.areas[key]=current+1;
    else delete window.__v26BodyMap.areas[key];

    syncToV24();
    renderBodyMap();
  };

  window.cycleV26Severity=function(key){
    const current=regionState(key);
    if(current<0) window.__v26BodyMap.areas[key]=0;
    else window.__v26BodyMap.areas[key]=(current+1)%4;
    syncToV24();
    renderBodyMap();
  };

  window.removeV26Region=function(key){
    delete window.__v26BodyMap.areas[key];
    syncToV24();
    renderBodyMap();
  };

  window.clearV26BodyMap=function(){
    window.__v26BodyMap.areas={};
    syncToV24();
    renderBodyMap();
  };

  function injectIntoV24(){
    const tab=document.getElementById('v24-tab-session');
    if(!tab || tab.querySelector('#v26-body-map')) return;

    seedFromV24();

    const firstTitle=tab.querySelector('.v24-section-title');
    if(!firstTitle) return;

    const section=document.createElement('section');
    section.id='v26-body-map';
    section.className='v26-body-map';
    firstTitle.insertAdjacentElement('afterend',section);

    renderBodyMap();

    // Keep text chips as an alternate quick list, but visually secondary.
    const title=firstTitle;
    if(title){
      title.querySelector('h3').textContent='Pain / Treatment Areas';
      const span=title.querySelector(':scope > span');
      if(span) span.textContent='Use body map or quick list below';
    }
  }

  // Add body-map severity data to V24 session note after save.
  const originalSaveV24=window.saveV24ClinicalSession;
  if(typeof originalSaveV24==='function'){
    window.saveV24ClinicalSession=function(appointmentId){
      syncToV24();
      const severityMap={};
      Object.entries(window.__v26BodyMap.areas).forEach(([k,v])=>{
        if(v!=null && Number(v)>=0) severityMap[REGION_LABELS[k]]=Number(v);
      });

      originalSaveV24.apply(this,arguments);

      const state=S();
      const note=(state.sessionNotes||[]).find(n=>String(n.appointmentId)===String(appointmentId));
      if(note){
        note.bodyMapView=window.__v26BodyMap.view;
        note.bodyAreaSeverity=severityMap;
        save();
      }
    };
  }

  // Reset body map when opening a different clinical session,
  // and hydrate it from any previously saved session.
  const originalOpenV24=window.openV24ClinicalNote;
  if(typeof originalOpenV24==='function'){
    window.openV24ClinicalNote=function(appointmentId){
      window.__v26BodyMap={view:'front',areas:{}};

      const state=S();
      const note=(state.sessionNotes||[]).find(n=>String(n.appointmentId)===String(appointmentId));
      if(note?.bodyAreaSeverity){
        Object.entries(note.bodyAreaSeverity).forEach(([label,severity])=>{
          const key=Object.keys(REGION_LABELS).find(k=>REGION_LABELS[k]===label);
          if(key) window.__v26BodyMap.areas[key]=Number(severity);
        });
        if(note.bodyMapView) window.__v26BodyMap.view=note.bodyMapView;
      }

      originalOpenV24.apply(this,arguments);
      setTimeout(injectIntoV24,40);
    };
  }

  // Enhance report preview with a concise body map summary.
  function enhanceReport(){
    const report=document.querySelector('#v24-report-preview.open .v24-report');
    if(!report || report.dataset.v26==='1') return;
    report.dataset.v26='1';

    const sections=[...report.querySelectorAll('section')];
    const painSection=sections.find(s=>s.textContent.includes('PAIN / TREATMENT AREAS'));
    if(!painSection) return;

    const activeModal=document.getElementById('v24-clinical-modal');
    let severityMap={};

    // Try current session first; fallback to visible report patient/date matching.
    if(activeModal){
      Object.entries(window.__v26BodyMap.areas).forEach(([k,v])=>{
        if(v!=null && Number(v)>=0) severityMap[REGION_LABELS[k]]=Number(v);
      });
    }

    if(Object.keys(severityMap).length){
      const wrap=document.createElement('div');
      wrap.className='v26-report-severity';
      wrap.innerHTML=Object.entries(severityMap).map(([label,v])=>`
        <span class="${SEVERITY_CLASS[v]}">${esc(label)} · ${SEVERITY_LABELS[v]}</span>
      `).join('');
      painSection.appendChild(wrap);
    }
  }

  function css(){
    if(document.getElementById('v26-css')) return;
    const st=document.createElement('style');
    st.id='v26-css';
    st.textContent=`
      .v26-body-map{
        border:1px solid #dbe7e9;
        background:linear-gradient(145deg,#f8fcfd,#f1f7f8);
        border-radius:16px;
        padding:14px;
        margin:0 0 14px;
      }
      .v26-map-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;margin-bottom:10px}
      .v26-map-head small{font-size:7px;color:#b48637;font-weight:900;letter-spacing:1.2px}
      .v26-map-head h3{margin:3px 0 2px;font-size:13px;color:#244e58}
      .v26-map-head p{margin:0;font-size:8px;color:#849499}
      .v26-view-toggle{display:flex;background:#e9f1f3;border-radius:9px;padding:3px}
      .v26-view-toggle button{border:0;background:transparent;border-radius:7px;padding:7px 12px;font-size:8px;font-weight:800;color:#62777d;cursor:pointer}
      .v26-view-toggle button.active{background:#174f5b;color:#fff;box-shadow:0 4px 12px rgba(23,79,91,.16)}
      .v26-map-layout{display:grid;grid-template-columns:minmax(280px,1fr) minmax(240px,.75fr);gap:12px}
      .v26-figure{background:#fff;border:1px solid #e0e8ea;border-radius:14px;padding:10px;display:flex;flex-direction:column;align-items:center}
      .v26-body-svg{width:100%;max-width:335px;height:500px;display:block}
      .v26-region{fill:#edf3f4;stroke:#b8c9cd;stroke-width:1.7;cursor:pointer;transition:.16s ease}
      .v26-region:hover{fill:#dfecee;stroke:#6d9aa2;filter:brightness(.99)}
      .v26-region.active.selected{fill:#d9eef4;stroke:#5d9eac}
      .v26-region.active.mild{fill:#dff2e9;stroke:#55a67d}
      .v26-region.active.moderate{fill:#ffe8ad;stroke:#d2a239}
      .v26-region.active.severe{fill:#ffd6d9;stroke:#d85f6b}
      .v26-view-label{font-size:9px;fill:#7d9096;font-weight:800;letter-spacing:1.2px}
      .v26-legend{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;border-top:1px solid #edf1f2;padding-top:8px;width:100%}
      .v26-legend span{display:flex;align-items:center;gap:4px;font-size:7px;color:#70848a}
      .v26-legend i{width:8px;height:8px;border-radius:50%;display:block}
      .v26-legend i.selected{background:#77b9c8}.v26-legend i.mild{background:#69b58b}.v26-legend i.moderate{background:#e1b54e}.v26-legend i.severe{background:#df6b75}
      .v26-selection-panel{background:#fff;border:1px solid #e0e8ea;border-radius:14px;padding:11px;display:flex;flex-direction:column;min-height:360px}
      .v26-selection-title{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #edf1f2;padding-bottom:9px}
      .v26-selection-title>div{display:flex;align-items:center;gap:7px}.v26-selection-title small{font-size:7px;color:#8b999d;font-weight:900}.v26-selection-title b{min-width:23px;height:23px;border-radius:7px;background:#174f5b;color:#fff;display:grid;place-items:center;font-size:9px}
      .v26-selection-title>button{border:1px solid #dce6e8;background:#fff;border-radius:7px;padding:5px 7px;font-size:7px;color:#667c82;cursor:pointer}
      .v26-selected-list{display:grid;gap:6px;margin-top:9px;overflow:auto;max-height:335px}
      .v26-area-row{display:grid;grid-template-columns:10px 1fr auto 24px;gap:7px;align-items:center;border:1px solid #e5ecee;border-radius:9px;padding:7px}
      .v26-area-row .v26-severity-dot{width:8px;height:8px;border-radius:50%}.v26-severity-dot.selected{background:#77b9c8}.v26-severity-dot.mild{background:#69b58b}.v26-severity-dot.moderate{background:#e1b54e}.v26-severity-dot.severe{background:#df6b75}
      .v26-area-row b,.v26-area-row small{display:block}.v26-area-row b{font-size:8px;color:#375860}.v26-area-row small{font-size:7px;color:#8a989d;margin-top:1px}
      .v26-area-row button{border:1px solid #dbe5e7;background:#f8fbfb;border-radius:6px;padding:4px 6px;font-size:7px;color:#5e747a;cursor:pointer}.v26-area-row button.remove{padding:3px 0;font-size:13px;background:#fff}
      .v26-tip{margin-top:auto;background:#fff7e8;border:1px solid #ead9b5;border-radius:9px;padding:8px}.v26-tip b,.v26-tip span{display:block}.v26-tip b{font-size:8px;color:#8e6725}.v26-tip span{font-size:7px;color:#9a835d;margin-top:2px;line-height:1.35}
      .v26-none{text-align:center;color:#8a989d;font-size:8px;padding:22px 5px}
      .v26-report-severity{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.v26-report-severity span{font-size:7px;border-radius:99px;padding:4px 7px}.v26-report-severity .selected{background:#e4f2f5;color:#397885}.v26-report-severity .mild{background:#e7f6ed;color:#398160}.v26-report-severity .moderate{background:#fff3cf;color:#947023}.v26-report-severity .severe{background:#ffe6e8;color:#a54852}
      @media(max-width:780px){.v26-map-layout{grid-template-columns:1fr}.v26-body-svg{height:430px}.v26-selection-panel{min-height:0}}
    `;
    document.head.appendChild(st);
  }

  function repair(){
    css();
    injectIntoV24();
    enhanceReport();
  }

  function init(){
    css();
    const obs=new MutationObserver(()=>{
      clearTimeout(window.__v26repair);
      window.__v26repair=setTimeout(repair,50);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

})();


/* =========================================================
   myAIMS V27 - FINAL CALENDAR VISUAL POLISH
   Refinement of approved appointments design:
   - stronger but calm palette
   - tighter spacing
   - clearer appointment hierarchy
   - improved therapist headers
   - better selected-day emphasis
   - clearer empty slots / active timeline
   - refined side summary panels
   ========================================================= */
(function(){

  function polish(){
    const page=document.getElementById('page-appointments');
    if(!page) return;

    // Therapist headers: avatar initials + compact capacity indicator.
    page.querySelectorAll('.v22-flow-head > div:not(.v22-time-head)').forEach((cell,i)=>{
      if(cell.dataset.v27==='1') return;
      cell.dataset.v27='1';

      const b=cell.querySelector('b');
      const small=cell.querySelector('small');
      if(!b) return;

      const name=b.textContent.trim();
      const initials=name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();

      const wrap=document.createElement('div');
      wrap.className='v27-therapist-head';
      wrap.innerHTML=`
        <span class="v27-th-avatar">${initials}</span>
        <div>
          <b>${name}</b>
          <small>${small?.textContent||''}</small>
        </div>
        <span class="v27-th-dot"></span>
      `;
      cell.innerHTML='';
      cell.appendChild(wrap);
    });

    // Add compact "available" cue only to larger open areas.
    page.querySelectorAll('.v22-empty-slot').forEach(slot=>{
      if(slot.dataset.v27==='1') return;
      slot.dataset.v27='1';
      slot.addEventListener('mouseenter',()=>{
        if(slot.querySelector('.v27-slot-cue')) return;
        const cue=document.createElement('span');
        cue.className='v27-slot-cue';
        cue.innerHTML='<i>＋</i> Add Appointment';
        slot.appendChild(cue);
      });
      slot.addEventListener('mouseleave',()=>slot.querySelector('.v27-slot-cue')?.remove());
    });

    // Strengthen appointment card title and metadata layout.
    page.querySelectorAll('.v22-appt').forEach(card=>{
      card.classList.add('v27-card');
      const copy=card.querySelector('.v22-appt-copy');
      if(!copy || copy.dataset.v27==='1') return;
      copy.dataset.v27='1';

      const title=copy.querySelector('b');
      const details=copy.querySelector('small');
      const room=copy.querySelector('em');

      if(title) title.classList.add('v27-patient-name');
      if(details) details.classList.add('v27-appt-details');
      if(room) room.classList.add('v27-room');
    });

    // Day cards: add small capacity caption based on current ring value/count.
    page.querySelectorAll('.v22-day').forEach(day=>{
      if(day.querySelector('.v27-cap-label')) return;
      const count=day.querySelector('.v22-ring i')?.textContent?.trim()||'0';
      const label=document.createElement('div');
      label.className='v27-cap-label';
      label.textContent=count==='0'?'Open day':`${count} booked`;
      const load=day.querySelector('.v22-load');
      if(load) load.insertAdjacentElement('beforebegin',label);
    });

    // Refine capacity side card title.
    const insight=page.querySelector('.v22-insight');
    if(insight && !insight.querySelector('.v27-summary-kicker')){
      const kicker=document.createElement('div');
      kicker.className='v27-summary-kicker';
      kicker.textContent="Today's Flow";
      insight.prepend(kicker);
    }

    // Refine next appointments panel.
    const next=page.querySelector('.v22-next');
    if(next) next.classList.add('v27-next-panel');
  }

  function css(){
    if(document.getElementById('v27-css')) return;
    const st=document.createElement('style');
    st.id='v27-css';
    st.textContent=`
      :root{
        --v27-navy:#123f4c;
        --v27-teal:#175765;
        --v27-teal2:#2b7480;
        --v27-gold:#c7983f;
        --v27-bg:#eef5f6;
        --v27-line:#dbe6e8;
        --v27-text:#173f49;
        --v27-muted:#7e9196;
      }

      /* ---- overall page ---- */
      #page-appointments{
        background:
          linear-gradient(180deg,#f6fafb 0%,#edf4f5 100%)!important;
        padding:16px!important;
      }

      #page-appointments .v22-hero{
        padding:14px 16px!important;
        margin-bottom:10px!important;
        border-radius:15px!important;
        box-shadow:0 5px 16px rgba(25,66,75,.045)!important;
      }

      #page-appointments .v22-hero h2{
        font-size:23px!important;
        letter-spacing:-.25px;
      }

      #page-appointments .v22-hero-actions button{
        height:35px!important;
        padding:0 12px!important;
        border-radius:9px!important;
        font-size:9px!important;
      }

      #page-appointments .v22-hero-actions .gold{
        background:linear-gradient(135deg,#c5963d,#d2a64f)!important;
        box-shadow:0 5px 12px rgba(197,150,61,.20);
      }

      /* ---- view controls ---- */
      .v25-viewbar{
        padding:8px 10px!important;
        margin:9px 0 11px!important;
        border-radius:12px!important;
        gap:10px!important;
      }

      .v25-modes button{
        padding:6px 10px!important;
        min-width:56px;
      }

      .v25-modes button.active{
        background:linear-gradient(135deg,#123f4c,#195b69)!important;
      }

      .v25-legend{
        gap:8px!important;
      }

      .v25-legend span{
        background:#f7fafb;
        border:1px solid #e3ebed;
        padding:4px 6px;
        border-radius:999px;
      }

      /* ---- week cards ---- */
      #page-appointments .v22-orbit{
        margin-bottom:11px!important;
      }

      #page-appointments .v22-days{
        gap:7px!important;
      }

      #page-appointments .v22-day{
        min-height:116px!important;
        padding:9px!important;
        border-radius:13px!important;
        box-shadow:0 4px 11px rgba(29,67,75,.045)!important;
      }

      #page-appointments .v22-day:hover{
        transform:translateY(-2px)!important;
        box-shadow:0 8px 17px rgba(29,67,75,.09)!important;
      }

      #page-appointments .v22-day.active{
        background:
          radial-gradient(circle at 78% 18%,rgba(255,255,255,.11),transparent 28%),
          linear-gradient(145deg,#174f5b,#0f3f4c)!important;
        box-shadow:0 10px 24px rgba(17,67,78,.24)!important;
        transform:translateY(-1px);
      }

      #page-appointments .v22-day.active:after{
        content:"";
        position:absolute;
        left:12px;right:12px;bottom:0;
        height:3px;border-radius:999px 999px 0 0;
        background:#d1a34d;
      }

      #page-appointments .v22-day-top b{
        font-size:16px!important;
      }

      #page-appointments .v22-ring{
        width:36px!important;height:36px!important;
        margin:6px 0!important;
      }

      .v27-cap-label{
        font-size:6.5px;
        color:#8b9a9f;
        margin-top:3px;
      }

      #page-appointments .v22-day.active .v27-cap-label{
        color:rgba(255,255,255,.72)!important;
      }

      /* ---- day title bar ---- */
      #page-appointments .v22-command{
        padding:8px 10px!important;
        border-radius:11px!important;
        margin-bottom:8px!important;
      }

      .v25-day-summary b{
        font-size:12px!important;
      }

      .v25-calendar-icon{
        background:linear-gradient(145deg,#e6f3f5,#d8ebef)!important;
        border:1px solid #cfe2e6;
      }

      /* ---- timeline ---- */
      #page-appointments .v22-flow-shell{
        border-radius:13px!important;
        box-shadow:0 7px 21px rgba(23,65,74,.065)!important;
      }

      #page-appointments .v22-flow-head{
        height:58px!important;
        background:linear-gradient(180deg,#f8fbfc,#edf4f5)!important;
      }

      #page-appointments .v22-flow-head>div{
        padding:8px 10px!important;
      }

      .v27-therapist-head{
        height:100%;
        display:flex;
        align-items:center;
        gap:8px;
      }

      .v27-th-avatar{
        width:30px;height:30px;
        border-radius:50%;
        display:grid;place-items:center;
        flex:0 0 30px;
        background:linear-gradient(145deg,#236779,#174f5b);
        color:#fff;
        font-size:7px;
        font-weight:900;
        box-shadow:0 3px 8px rgba(23,79,91,.16);
      }

      .v27-therapist-head div{
        min-width:0;
        flex:1;
      }

      .v27-therapist-head b{
        font-size:9px!important;
        color:#214b55!important;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .v27-therapist-head small{
        font-size:6.5px!important;
        color:#88999e!important;
      }

      .v27-th-dot{
        width:7px;height:7px;
        border-radius:50%;
        background:#43b07b;
        box-shadow:0 0 0 3px rgba(67,176,123,.12);
      }

      #page-appointments .v22-flow-body{
        height:988px!important;
      }

      #page-appointments .v22-time-axis>div{
        padding:6px!important;
      }

      #page-appointments .v22-time-axis span{
        color:#71878d!important;
        font-weight:700;
      }

      #page-appointments .v22-lane{
        background:
          linear-gradient(to bottom,transparent 75px,#e7eef0 76px),
          linear-gradient(90deg,rgba(246,250,251,.22),rgba(255,255,255,.96))!important;
        background-size:100% 76px,100% 100%!important;
      }

      /* ---- appointment cards ---- */
      #page-appointments .v22-appt.v27-card{
        left:7px!important;
        right:7px!important;
        width:calc(100% - 14px)!important;
        padding:7px 8px!important;
        border-radius:10px!important;
        border-left-width:3px!important;
      }

      #page-appointments .v22-appt.v27-card .v22-avatar{
        width:28px!important;
        height:28px!important;
        min-width:28px!important;
        border-radius:9px!important;
        box-shadow:0 2px 6px rgba(31,71,80,.13);
      }

      .v27-patient-name{
        font-size:9.5px!important;
        line-height:1.1!important;
        color:#183f49!important;
        font-weight:850!important;
      }

      .v27-appt-details{
        font-size:6.8px!important;
        line-height:1.2!important;
        color:#6d8389!important;
        margin-top:2px!important;
      }

      .v27-room{
        display:inline-block!important;
        margin-top:3px!important;
        padding:2px 5px;
        border-radius:999px;
        background:rgba(255,255,255,.68);
        border:1px solid rgba(255,255,255,.75);
        font-size:6.3px!important;
        color:#8d6e34!important;
      }

      #page-appointments .v22-appt.v25-scheduled{
        background:linear-gradient(135deg,#edf7ff,#dceeff)!important;
        border-color:#4c9be8!important;
      }
      #page-appointments .v22-appt.v25-confirmed{
        background:linear-gradient(135deg,#edfaf4,#d9f2e5)!important;
        border-color:#3eb77f!important;
      }
      #page-appointments .v22-appt.v25-checked-in{
        background:linear-gradient(135deg,#fff9e8,#ffeec0)!important;
        border-color:#d1a33c!important;
      }
      #page-appointments .v22-appt.v25-in-session{
        background:linear-gradient(135deg,#e9faf6,#d4f1e9)!important;
        border-color:#18a58b!important;
      }
      #page-appointments .v22-appt.v25-completed{
        background:linear-gradient(135deg,#edf7f2,#dfede6)!important;
        border-color:#6d9882!important;
      }
      #page-appointments .v22-appt.v25-cancelled{
        background:linear-gradient(135deg,#fff0f1,#ffdfe3)!important;
        border-color:#e06572!important;
      }
      #page-appointments .v22-appt.v25-no-show{
        background:linear-gradient(135deg,#fff0f7,#f6dfef)!important;
        border-color:#b66b9f!important;
      }

      .v25-meta{
        margin-top:3px!important;
        gap:3px!important;
      }

      .v25-meta span{
        font-size:5.8px!important;
        padding:1px 4px!important;
      }

      /* ---- now line ---- */
      #page-appointments .v22-now{
        height:2px!important;
        background:#cf9a38!important;
      }

      #page-appointments .v22-now span{
        background:#c9973d!important;
        border-radius:7px!important;
        padding:3px 6px!important;
        font-size:6px!important;
        box-shadow:0 3px 7px rgba(201,151,61,.20);
      }

      #page-appointments .v22-now i{
        background:#c9973d!important;
        width:8px!important;height:8px!important;
      }

      /* ---- empty slot cue ---- */
      .v27-slot-cue{
        position:absolute;
        left:50%;top:50%;
        transform:translate(-50%,-50%);
        z-index:2;
        display:flex;
        align-items:center;
        gap:4px;
        white-space:nowrap;
        font-size:6.5px;
        font-weight:800;
        color:#5c7f87;
        background:rgba(255,255,255,.9);
        border:1px dashed #93b2b8;
        border-radius:8px;
        padding:5px 8px;
        pointer-events:none;
        box-shadow:0 3px 9px rgba(41,78,87,.05);
      }

      .v27-slot-cue i{
        font-style:normal;
        color:#b78732;
        font-size:10px;
      }

      /* ---- side summary ---- */
      #page-appointments .v22-layout{
        gap:10px!important;
      }

      #page-appointments .v22-layout>aside{
        gap:9px!important;
      }

      #page-appointments .v22-insight,
      #page-appointments .v22-next{
        border-radius:13px!important;
        padding:11px!important;
      }

      .v27-summary-kicker{
        font-size:7px;
        letter-spacing:1px;
        color:#b38738;
        font-weight:900;
        margin-bottom:9px;
      }

      #page-appointments .v22-insight.v25-panel-teal{
        background:
          radial-gradient(circle at 80% 8%,rgba(43,116,128,.08),transparent 35%),
          linear-gradient(145deg,#f0faf8,#e3f2ef)!important;
      }

      #page-appointments .v22-next.v25-panel-sand{
        background:
          radial-gradient(circle at 85% 10%,rgba(201,152,63,.10),transparent 35%),
          linear-gradient(145deg,#fffdf8,#f9f1e2)!important;
      }

      #page-appointments .v22-mini div{
        border:1px solid rgba(216,230,232,.75);
        background:rgba(255,255,255,.68)!important;
      }

      #page-appointments .v22-next-list button{
        border:1px solid rgba(222,231,233,.9)!important;
        background:rgba(255,255,255,.72)!important;
      }

      #page-appointments .v22-next-list button:hover{
        background:#fff!important;
        transform:translateX(2px);
      }

      /* ---- scrollbar refinement ---- */
      #page-appointments *::-webkit-scrollbar{width:7px;height:7px}
      #page-appointments *::-webkit-scrollbar-thumb{background:#cddcdf;border-radius:99px}
      #page-appointments *::-webkit-scrollbar-track{background:transparent}

      @media(max-width:1100px){
        .v25-viewbar{grid-template-columns:1fr!important}
        .v25-legend{justify-content:flex-start!important}
      }

      @media(max-width:760px){
        #page-appointments{padding:9px!important}
        #page-appointments .v22-hero{padding:12px!important}
        .v27-th-avatar{width:27px;height:27px;flex-basis:27px}
      }
    `;
    document.head.appendChild(st);
  }

  function init(){
    css();
    setTimeout(polish,250);
    const obs=new MutationObserver(()=>{
      clearTimeout(window.__v27repair);
      window.__v27repair=setTimeout(polish,60);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

})();


/* =========================================================
   myAIMS V28 - PATIENT CLINICAL JOURNEY
   Unified patient -> plan -> sessions -> appointments -> progress
   ========================================================= */
(function(){
  const S=()=>window.state||window.appState||{};
  const save=()=>{ if(typeof window.saveState==='function') window.saveState(); };
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function ensure(){
    if(!Array.isArray(S().treatmentPlans)) S().treatmentPlans=[];
    if(!Array.isArray(S().sessionNotes)) S().sessionNotes=[];
    if(!Array.isArray(S().appointments)) S().appointments=[];
    if(!Array.isArray(S().patients)) S().patients=[];
    save();
  }

  function patient(id){ return (S().patients||[]).find(p=>String(p.id)===String(id)); }
  function pname(id){
    const p=patient(id);
    return p?(p.name||p.fullName||p.patientName||'Patient'):'Patient';
  }
  function planForPatient(id){
    return (S().treatmentPlans||[])
      .filter(x=>String(x.patientId)===String(id) && x.status!=='Closed')
      .sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))[0];
  }
  function notesForPatient(id){
    return (S().sessionNotes||[])
      .filter(x=>String(x.patientId)===String(id))
      .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  }
  function apptsForPatient(id){
    return (S().appointments||[])
      .filter(x=>String(x.patientId)===String(id))
      .sort((a,b)=>(String(b.date||'')+String(b.time||'')).localeCompare(String(a.date||'')+String(a.time||'')));
  }

  function progressSeries(id){
    return notesForPatient(id).slice().reverse().map(n=>({
      date:n.date,
      pain:Number(n.painScore||0),
      progress:Number(n.progressScore||0)
    }));
  }

  function areaTrend(id){
    const notes=notesForPatient(id).slice().reverse();
    const map={};
    notes.forEach(n=>{
      (n.areas||[]).forEach(area=>{
        if(!map[area]) map[area]=[];
        const sev=n.bodyAreaSeverity?.[area];
        const pain=sev!=null ? [0,3,6,9][Number(sev)] : Number(n.painScore||0);
        map[area].push({date:n.date,pain});
      });
    });
    return map;
  }

  function root(){
    let el=document.getElementById('v28-journey');
    if(!el){
      el=document.createElement('div');
      el.id='v28-journey';
      document.body.appendChild(el);
    }
    return el;
  }

  function spark(points, key='pain', inverse=false){
    if(!points.length) return '<div class="v28-empty-chart">No progress data yet</div>';
    const w=320,h=90,p=10;
    const vals=points.map(x=>Number(x[key]||0));
    const max=Math.max(10,...vals), min=0;
    const coords=points.map((x,i)=>{
      const xx=p+(i*(w-2*p)/Math.max(1,points.length-1));
      let norm=(Number(x[key]||0)-min)/(max-min||1);
      if(inverse) norm=1-norm;
      const yy=h-p-norm*(h-2*p);
      return [xx,yy];
    });
    const poly=coords.map(x=>x.join(',')).join(' ');
    return `
      <svg viewBox="0 0 ${w} ${h}" class="v28-spark">
        <line x1="${p}" y1="${h-p}" x2="${w-p}" y2="${h-p}" class="axis"/>
        <polyline points="${poly}" class="line"/>
        ${coords.map((c,i)=>`<circle cx="${c[0]}" cy="${c[1]}" r="3"><title>${points[i].date} · ${points[i][key]}</title></circle>`).join('')}
      </svg>`;
  }

  function overviewHtml(patientId){
    const p=patient(patientId);
    const plan=planForPatient(patientId);
    const notes=notesForPatient(patientId);
    const appts=apptsForPatient(patientId);
    const completed=appts.filter(a=>a.status==='Completed').length;
    const next=appts.filter(a=>a.status!=='Completed' && a.status!=='Cancelled' && a.date>=new Date().toISOString().slice(0,10))
      .sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))[0];
    const latest=notes[0];
    const planned=Number(plan?.plannedSessions||0);
    const remaining=Math.max(0,planned-completed);

    return `
      <div class="v28-kpis">
        <div><small>ACTIVE PLAN</small><b>${esc(plan?.title||'No active plan')}</b><span>${esc((plan?.areas||[]).slice(0,3).join(', ')||'No areas selected')}</span></div>
        <div><small>SESSIONS</small><b>${completed}${planned?` / ${planned}`:''}</b><span>${remaining} remaining</span></div>
        <div><small>LATEST PAIN</small><b>${latest?Number(latest.painScore||0)+'/10':'—'}</b><span>${latest?.date||'No clinical note yet'}</span></div>
        <div><small>NEXT APPOINTMENT</small><b>${next?esc(next.date):'—'}</b><span>${next?esc(next.time||''):'Not scheduled'}</span></div>
      </div>

      <div class="v28-overview-grid">
        <section class="v28-card">
          <div class="v28-card-head"><div><small>CLINICAL SNAPSHOT</small><h3>Latest Patient Update</h3></div>${latest?`<span>${esc(latest.date)}</span>`:''}</div>
          ${latest?`
            <div class="v28-latest">
              <div><small>Patient Report</small><p>${esc(latest.subjective||'—')}</p></div>
              <div><small>Clinical Findings</small><p>${esc(latest.objective||'—')}</p></div>
              <div><small>Response</small><p>${esc(latest.response||'—')}</p></div>
              <div><small>Next Session</small><p>${esc(latest.nextSession||'—')}</p></div>
            </div>
          `:`<div class="v28-empty">No clinical session updates have been added yet.</div>`}
        </section>

        <section class="v28-card">
          <div class="v28-card-head"><div><small>PROGRESS</small><h3>Pain Trend</h3></div></div>
          ${spark(progressSeries(patientId),'pain',true)}
          <div class="v28-trend-foot">
            <span>First ${progressSeries(patientId)[0]?.pain ?? '—'}/10</span>
            <b>→</b>
            <span>Latest ${progressSeries(patientId).slice(-1)[0]?.pain ?? '—'}/10</span>
          </div>
        </section>
      </div>`;
  }

  function planHtml(patientId){
    const plan=planForPatient(patientId);
    const completed=apptsForPatient(patientId).filter(a=>a.status==='Completed').length;
    if(!plan) return `
      <div class="v28-empty-panel">
        <h3>No active treatment plan</h3>
        <p>Create the first treatment plan directly from here.</p>
        <button onclick="openV28PlanEditor('${patientId}')">+ Create Treatment Plan</button>
      </div>`;

    const pct=Math.min(100,Math.round(completed/Math.max(1,Number(plan.plannedSessions||1))*100));
    return `
      <div class="v28-plan-hero">
        <div>
          <small>ACTIVE TREATMENT PLAN</small>
          <h2>${esc(plan.title||'Treatment Plan')}</h2>
          <p>${esc(plan.comments||'')}</p>
        </div>
        <button onclick="openV28PlanEditor('${patientId}')">Edit Plan</button>
      </div>
      <div class="v28-plan-grid">
        <div class="v28-card">
          <small>GOALS</small>
          <p>${esc(plan.goals||'No goals documented yet.')}</p>
        </div>
        <div class="v28-card">
          <small>HOME ADVICE</small>
          <p>${esc(plan.homeAdvice||'No home advice documented yet.')}</p>
        </div>
        <div class="v28-card">
          <small>TREATMENT AREAS</small>
          <div class="v28-tags">${(plan.areas||[]).map(x=>`<span>${esc(x)}</span>`).join('')||'<span>None</span>'}</div>
        </div>
        <div class="v28-card">
          <small>SESSION PROGRESS</small>
          <div class="v28-progress"><i style="width:${pct}%"></i></div>
          <b>${completed} completed · ${Math.max(0,Number(plan.plannedSessions||0)-completed)} remaining</b>
        </div>
      </div>
      <div class="v28-plan-actions">
        <button onclick="openV28AddSession('${patientId}')">+ Add Session</button>
        <button onclick="openV19RecurringPlan && openV19RecurringPlan()">Recurring Sessions</button>
      </div>`;
  }

  function sessionsHtml(patientId){
    const notes=notesForPatient(patientId);
    const appts=apptsForPatient(patientId);
    const rows=appts.map(a=>({
      a,
      n:(S().sessionNotes||[]).find(n=>String(n.appointmentId)===String(a.id))
    }));
    return `
      <div class="v28-section-top">
        <div><small>SESSIONS</small><h3>${rows.length} appointment${rows.length===1?'':'s'}</h3></div>
        <button onclick="openV28AddSession('${patientId}')">+ Add Session</button>
      </div>
      <div class="v28-session-list">
        ${rows.length?rows.map(({a,n})=>`
          <article class="v28-session-row">
            <div class="v28-session-date"><b>${esc(a.date)}</b><span>${esc(a.time||'')}</span></div>
            <div class="v28-session-main">
              <div class="v28-session-title"><b>${esc(a.visitType||'Session')}</b><span>${esc(a.status||'Scheduled')}</span></div>
              <small>${esc(a.therapist||'Therapist')} · ${esc(a.room||'')}</small>
              ${n?`<p>${esc(n.subjective||n.response||'Clinical session documented.')}</p>`:'<p class="muted">No clinical note saved yet.</p>'}
            </div>
            <div class="v28-session-actions">
              ${n?`<button onclick="previewV24SessionReport('${a.id}')">Report</button>`:''}
              <button class="primary" onclick="openV24ClinicalNote('${a.id}')">${n?'Open Note':'Start Session'}</button>
            </div>
          </article>`).join(''):`<div class="v28-empty">No sessions scheduled yet.</div>`}
      </div>`;
  }

  function progressHtml(patientId){
    const series=progressSeries(patientId);
    const trends=areaTrend(patientId);
    return `
      <div class="v28-progress-grid">
        <section class="v28-card">
          <div class="v28-card-head"><div><small>PAIN</small><h3>Pain Score Over Time</h3></div></div>
          ${spark(series,'pain',true)}
        </section>
        <section class="v28-card">
          <div class="v28-card-head"><div><small>FUNCTION</small><h3>Session Progress</h3></div></div>
          ${spark(series,'progress',false)}
        </section>
      </div>
      <section class="v28-card">
        <div class="v28-card-head"><div><small>BODY AREAS</small><h3>Area-by-Area Trend</h3></div></div>
        <div class="v28-area-trends">
          ${Object.keys(trends).length?Object.entries(trends).map(([area,pts])=>`
            <div class="v28-area-trend">
              <div><b>${esc(area)}</b><small>${pts.length} session${pts.length===1?'':'s'}</small></div>
              <span>${pts[0].pain}/10</span><i>→</i><strong>${pts.slice(-1)[0].pain}/10</strong>
            </div>`).join(''):`<div class="v28-empty">No body-area trend data yet.</div>`}
        </div>
      </section>`;
  }

  function reportsHtml(patientId){
    const notes=notesForPatient(patientId);
    return `
      <div class="v28-section-top">
        <div><small>REPORTS</small><h3>Clinical Reports</h3></div>
      </div>
      <div class="v28-report-list">
        ${notes.length?notes.map(n=>`
          <button onclick="previewV24SessionReport('${n.appointmentId}')">
            <div><small>SESSION REPORT</small><b>${esc(n.date)}</b><span>${esc(n.therapist||'Therapist')}</span></div>
            <em>${Number(n.painScore||0)}/10</em><i>›</i>
          </button>`).join(''):`<div class="v28-empty">No reports available yet.</div>`}
      </div>`;
  }

  window.openV28Journey=function(patientId,tab='overview'){
    ensure();
    const p=patient(patientId);
    if(!p) return;

    const r=root();
    r.className='open';
    r.dataset.patientId=patientId;
    r.innerHTML=`
      <div class="v28-back" onclick="closeV28Journey()"></div>
      <section class="v28-shell">
        <header class="v28-head">
          <div class="v28-patient-id">
            <span>${esc((pname(patientId).split(/\s+/).slice(0,2).map(x=>x[0]||'').join('')||'P').toUpperCase())}</span>
            <div>
              <small>PATIENT CLINICAL JOURNEY</small>
              <h2>${esc(pname(patientId))}</h2>
              <p>${esc(p.phone||p.mobile||'No mobile')} · ${esc(p.id||'')}</p>
            </div>
          </div>
          <div class="v28-head-actions">
            <button onclick="openV28AddSession('${patientId}')">+ Add Session</button>
            <button class="primary" onclick="openV28PlanEditor('${patientId}')">Treatment Plan</button>
            <button onclick="closeV28Journey()">×</button>
          </div>
        </header>

        <nav class="v28-tabs">
          ${['overview','plan','sessions','progress','reports'].map(t=>`<button class="${t===tab?'active':''}" onclick="switchV28Tab('${t}',this)">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}
        </nav>

        <main id="v28-content">
          ${tab==='overview'?overviewHtml(patientId):tab==='plan'?planHtml(patientId):tab==='sessions'?sessionsHtml(patientId):tab==='progress'?progressHtml(patientId):reportsHtml(patientId)}
        </main>
      </section>`;
  };

  window.closeV28Journey=function(){
    const r=document.getElementById('v28-journey');
    if(r) r.className='';
  };

  window.switchV28Tab=function(tab,btn){
    const r=document.getElementById('v28-journey');
    if(!r) return;
    const patientId=r.dataset.patientId;
    r.querySelectorAll('.v28-tabs button').forEach(x=>x.classList.remove('active'));
    btn?.classList.add('active');
    const c=document.getElementById('v28-content');
    if(c) c.innerHTML=tab==='overview'?overviewHtml(patientId):tab==='plan'?planHtml(patientId):tab==='sessions'?sessionsHtml(patientId):tab==='progress'?progressHtml(patientId):reportsHtml(patientId);
  };

  window.openV28AddSession=function(patientId){
    closeV28Journey();
    if(typeof window.openV18Appointment==='function'){
      window.openV18Appointment();
      setTimeout(()=>{
        if(typeof window.selectV23Patient==='function') window.selectV23Patient(patientId);
      },60);
    }
  };

  window.openV28PlanEditor=function(patientId){
    const p=planForPatient(patientId)||{};
    let r=document.getElementById('v28-plan-editor');
    if(!r){
      r=document.createElement('div');
      r.id='v28-plan-editor';
      document.body.appendChild(r);
    }
    r.className='open';
    r.dataset.patientId=patientId;
    r.innerHTML=`
      <div class="v28-back" onclick="closeV28PlanEditor()"></div>
      <section class="v28-plan-editor-card">
        <header><div><small>TREATMENT PLAN</small><h3>${esc(pname(patientId))}</h3></div><button onclick="closeV28PlanEditor()">×</button></header>
        <label><span>Plan Title</span><input id="v28-pe-title" value="${esc(p.title||'')}"></label>
        <label><span>Main Clinical Comments</span><textarea id="v28-pe-comments" rows="3">${esc(p.comments||'')}</textarea></label>
        <label><span>Treatment Goals</span><textarea id="v28-pe-goals" rows="3">${esc(p.goals||'')}</textarea></label>
        <div class="v28-pe-grid">
          <label><span>Planned Sessions</span><input id="v28-pe-sessions" type="number" min="1" value="${Number(p.plannedSessions||10)}"></label>
          <label><span>Review After</span><input id="v28-pe-review" type="number" min="1" value="${Number(p.reviewAfter||4)}"></label>
        </div>
        <label><span>Home Advice</span><textarea id="v28-pe-home" rows="3">${esc(p.homeAdvice||'')}</textarea></label>
        <footer><button onclick="closeV28PlanEditor()">Cancel</button><button class="primary" onclick="saveV28PlanEditor()">Save Plan</button></footer>
      </section>`;
  };

  window.closeV28PlanEditor=function(){
    const r=document.getElementById('v28-plan-editor');
    if(r) r.className='';
  };

  window.saveV28PlanEditor=function(){
    const r=document.getElementById('v28-plan-editor');
    if(!r) return;
    const patientId=r.dataset.patientId;
    let p=planForPatient(patientId);
    if(!p){
      p={id:'TP-'+Date.now(),patientId,createdAt:new Date().toISOString(),status:'Active',areas:[]};
      S().treatmentPlans.push(p);
    }
    Object.assign(p,{
      title:document.getElementById('v28-pe-title')?.value.trim()||'Treatment Plan',
      comments:document.getElementById('v28-pe-comments')?.value.trim()||'',
      goals:document.getElementById('v28-pe-goals')?.value.trim()||'',
      plannedSessions:Number(document.getElementById('v28-pe-sessions')?.value||10),
      reviewAfter:Number(document.getElementById('v28-pe-review')?.value||4),
      homeAdvice:document.getElementById('v28-pe-home')?.value.trim()||'',
      updatedAt:new Date().toISOString(),
      status:'Active'
    });
    save();
    closeV28PlanEditor();
    openV28Journey(patientId,'plan');
  };

  function enhancePatientCard(){
    const card=document.querySelector('#v22-card-shade.open .v22-patient-card');
    if(!card || card.dataset.v28==='1') return;
    const shade=document.getElementById('v22-card-shade');
    const html=shade?.innerHTML||'';
    const m=html.match(/openPatientProfile\('([^']+)'\)/);
    if(!m) return;
    const patientId=m[1];
    card.dataset.v28='1';

    const actions=card.querySelector('.v22-card-actions');
    if(actions){
      const b=document.createElement('button');
      b.textContent='Clinical Journey';
      b.onclick=()=>{ closeV22PatientCard(); openV28Journey(patientId,'overview'); };
      actions.prepend(b);
    }
  }

  // Add a Clinical Journey button to patient profile if V6 profile is present.
  function enhancePatientProfile(){
    document.querySelectorAll('[data-patient-id], .patient-profile, .v6-patient-profile').forEach(el=>{
      if(el.dataset.v28Journey==='1') return;
      const pid=el.dataset.patientId;
      if(!pid) return;
      const target=el.querySelector('.actions,.profile-actions,.v6-actions');
      if(!target) return;
      el.dataset.v28Journey='1';
      const b=document.createElement('button');
      b.className='v28-open-journey';
      b.textContent='Clinical Journey';
      b.onclick=()=>openV28Journey(pid,'overview');
      target.prepend(b);
    });
  }

  function css(){
    if(document.getElementById('v28-css')) return;
    const st=document.createElement('style');
    st.id='v28-css';
    st.textContent=`
      #v28-journey,#v28-plan-editor{display:none}
      #v28-journey.open,#v28-plan-editor.open{display:block;position:fixed;inset:0;z-index:100050}
      .v28-back{position:absolute;inset:0;background:rgba(11,31,37,.48);backdrop-filter:blur(4px)}
      .v28-shell{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(1180px,97vw);height:min(920px,95vh);background:#f4f8f9;border-radius:20px;box-shadow:0 30px 100px rgba(0,0,0,.25);overflow:hidden;display:flex;flex-direction:column}
      .v28-head{display:flex;justify-content:space-between;gap:15px;align-items:center;padding:17px 20px;background:linear-gradient(135deg,#fff,#f4fafb);border-bottom:1px solid #dfe8ea}
      .v28-patient-id{display:flex;align-items:center;gap:11px}.v28-patient-id>span{width:46px;height:46px;border-radius:14px;background:linear-gradient(145deg,#174f5b,#286b78);color:#fff;display:grid;place-items:center;font-weight:900}.v28-patient-id small{font-size:7px;color:#b48637;font-weight:900;letter-spacing:1.2px}.v28-patient-id h2{margin:2px 0;color:#214a54}.v28-patient-id p{margin:0;font-size:8px;color:#85969b}.v28-head-actions{display:flex;gap:7px}.v28-head-actions button{border:1px solid #d9e4e6;background:#fff;border-radius:8px;padding:8px 10px;font-size:8px;font-weight:800;color:#536d74;cursor:pointer}.v28-head-actions .primary{background:#c99a42;border-color:#c99a42;color:#fff}
      .v28-tabs{display:flex;gap:5px;padding:9px 20px;background:#fff;border-bottom:1px solid #e2eaec}.v28-tabs button{border:0;background:#f0f5f6;border-radius:8px;padding:7px 11px;font-size:8px;font-weight:800;color:#60767d;cursor:pointer}.v28-tabs button.active{background:#174f5b;color:#fff}
      #v28-content{overflow:auto;padding:16px 20px;flex:1}
      .v28-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:12px}.v28-kpis>div,.v28-card{background:#fff;border:1px solid #dfe8ea;border-radius:12px;padding:11px;box-shadow:0 5px 14px rgba(28,66,75,.04)}.v28-kpis small,.v28-kpis b,.v28-kpis span{display:block}.v28-kpis small{font-size:7px;color:#a07a36;font-weight:900}.v28-kpis b{font-size:13px;color:#31545c;margin:3px 0}.v28-kpis span{font-size:7px;color:#89979c}
      .v28-overview-grid,.v28-progress-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.v28-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.v28-card-head small{font-size:7px;color:#b48637;font-weight:900}.v28-card-head h3{margin:2px 0;color:#31545c;font-size:12px}.v28-card-head>span{font-size:7px;color:#8b999d}.v28-latest{display:grid;grid-template-columns:1fr 1fr;gap:7px}.v28-latest>div{background:#f7fafb;border-radius:8px;padding:8px}.v28-latest small{font-size:7px;color:#8c999d}.v28-latest p{font-size:8px;color:#60767c;line-height:1.45;margin:4px 0 0}.v28-spark{width:100%;height:100px}.v28-spark .axis{stroke:#dbe6e8}.v28-spark .line{fill:none;stroke:#174f5b;stroke-width:2.5}.v28-spark circle{fill:#c99a42}.v28-trend-foot{display:flex;justify-content:center;gap:10px;font-size:8px;color:#64797f}
      .v28-plan-hero{display:flex;justify-content:space-between;align-items:center;gap:15px;background:linear-gradient(135deg,#174f5b,#2b6d79);color:#fff;border-radius:14px;padding:15px;margin-bottom:11px}.v28-plan-hero small{font-size:7px;letter-spacing:1px;opacity:.72}.v28-plan-hero h2{margin:3px 0}.v28-plan-hero p{font-size:8px;opacity:.78;max-width:760px}.v28-plan-hero button{border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:#fff;border-radius:8px;padding:8px 10px}.v28-plan-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.v28-card>small{font-size:7px;color:#a07831;font-weight:900}.v28-card>p{font-size:9px;color:#60767c;line-height:1.5}.v28-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.v28-tags span{font-size:7px;background:#edf5f5;color:#547178;border-radius:99px;padding:4px 7px}.v28-progress{height:6px;background:#edf2f3;border-radius:99px;overflow:hidden;margin:9px 0}.v28-progress i{display:block;height:100%;background:linear-gradient(90deg,#174f5b,#c99a42);border-radius:99px}.v28-plan-actions{display:flex;gap:7px;margin-top:10px}.v28-plan-actions button,.v28-section-top button{border:1px solid #d8e3e5;background:#fff;border-radius:8px;padding:8px 10px;font-size:8px;font-weight:800;color:#536d74}
      .v28-section-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}.v28-section-top small{font-size:7px;color:#b48637;font-weight:900}.v28-section-top h3{margin:2px 0;color:#31545c}.v28-session-list{display:grid;gap:7px}.v28-session-row{display:grid;grid-template-columns:90px 1fr auto;gap:10px;align-items:center;background:#fff;border:1px solid #dfe8ea;border-radius:11px;padding:9px}.v28-session-date b,.v28-session-date span{display:block}.v28-session-date b{font-size:9px;color:#36575f}.v28-session-date span{font-size:7px;color:#9a7c45}.v28-session-title{display:flex;gap:7px;align-items:center}.v28-session-title b{font-size:9px;color:#31545c}.v28-session-title span{font-size:6px;background:#edf6f2;color:#287359;border-radius:99px;padding:3px 6px}.v28-session-main>small{font-size:7px;color:#8c999d}.v28-session-main p{font-size:8px;color:#60767c;margin:4px 0 0}.v28-session-main p.muted{color:#9aa6aa}.v28-session-actions{display:flex;gap:5px}.v28-session-actions button{border:1px solid #d9e4e6;background:#fff;border-radius:7px;padding:6px 8px;font-size:7px;font-weight:800;color:#5b7177}.v28-session-actions .primary{background:#174f5b;border-color:#174f5b;color:#fff}
      .v28-area-trends{display:grid;gap:6px}.v28-area-trend{display:grid;grid-template-columns:1fr auto 18px auto;gap:8px;align-items:center;background:#f8fbfb;border:1px solid #e3eaec;border-radius:8px;padding:8px}.v28-area-trend b,.v28-area-trend small{display:block}.v28-area-trend b{font-size:8px;color:#36575f}.v28-area-trend small{font-size:7px;color:#8b999d}.v28-area-trend span{font-size:9px;color:#a04c55}.v28-area-trend strong{font-size:10px;color:#29765b}.v28-area-trend i{font-style:normal;color:#9a8a67;text-align:center}
      .v28-report-list{display:grid;gap:6px}.v28-report-list button{display:grid;grid-template-columns:1fr auto 12px;align-items:center;gap:8px;text-align:left;border:1px solid #dfe8ea;background:#fff;border-radius:9px;padding:9px}.v28-report-list small,.v28-report-list b,.v28-report-list span{display:block}.v28-report-list small{font-size:6px;color:#a07831;font-weight:900}.v28-report-list b{font-size:9px;color:#36575f}.v28-report-list span{font-size:7px;color:#8b999d}.v28-report-list em{font-style:normal;font-size:9px;background:#eef5f5;color:#31545c;border-radius:99px;padding:4px 6px}
      .v28-empty,.v28-empty-chart{text-align:center;color:#8f9da1;font-size:8px;padding:26px}.v28-empty-panel{text-align:center;background:#fff;border:1px dashed #ccdadd;border-radius:12px;padding:35px}.v28-empty-panel h3{color:#31545c}.v28-empty-panel p{font-size:8px;color:#8a989d}.v28-empty-panel button{border:1px solid #c99a42;background:#fff8ea;color:#8b6729;border-radius:8px;padding:8px 10px}
      .v28-plan-editor-card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,94vw);background:#fff;border-radius:17px;padding:18px;box-shadow:0 30px 90px rgba(0,0,0,.24)}.v28-plan-editor-card header{display:flex;justify-content:space-between;border-bottom:1px solid #e4ebed;padding-bottom:10px;margin-bottom:12px}.v28-plan-editor-card header small{font-size:7px;color:#b48637;font-weight:900}.v28-plan-editor-card header h3{margin:2px 0;color:#31545c}.v28-plan-editor-card header button{border:0;background:#f1f4f5;border-radius:50%;width:29px;height:29px;font-size:18px}.v28-plan-editor-card label{display:flex;flex-direction:column;gap:4px;margin:8px 0}.v28-plan-editor-card label span{font-size:8px;font-weight:800;color:#5d7379}.v28-plan-editor-card input,.v28-plan-editor-card textarea{border:1px solid #dbe5e7;border-radius:8px;padding:8px;font:inherit;font-size:9px}.v28-pe-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v28-plan-editor-card footer{display:flex;justify-content:flex-end;gap:7px;border-top:1px solid #e5ecee;margin-top:12px;padding-top:11px}.v28-plan-editor-card footer button{border:1px solid #dbe5e7;background:#fff;border-radius:8px;padding:8px 10px;font-size:8px;font-weight:800}.v28-plan-editor-card footer .primary{background:#c99a42;border-color:#c99a42;color:#fff}
      @media(max-width:800px){.v28-kpis{grid-template-columns:1fr 1fr}.v28-overview-grid,.v28-progress-grid,.v28-plan-grid{grid-template-columns:1fr}.v28-session-row{grid-template-columns:1fr}.v28-head{align-items:flex-start;flex-direction:column}.v28-head-actions{width:100%;flex-wrap:wrap}}
    `;
    document.head.appendChild(st);
  }

  function repair(){
    enhancePatientCard();
    enhancePatientProfile();
  }

  function init(){
    ensure();
    css();
    setTimeout(repair,350);
    const obs=new MutationObserver(()=>{
      clearTimeout(window.__v28repair);
      window.__v28repair=setTimeout(repair,60);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();


/* =========================================================
   myAIMS V29 - CLINICAL UPDATES + GOAL TRACKING
   Adds:
   - Quick patient clinical updates independent of appointments
   - Treatment goals with status + progress %
   - Clinical timeline inside Patient Journey
   - Update from patient / session view
   - Goal progress included in patient overview
   ========================================================= */
(function(){
  const S=()=>window.state||window.appState||{};
  const save=()=>{ if(typeof window.saveState==='function') window.saveState(); };
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function ensure(){
    if(!Array.isArray(S().clinicalUpdates)) S().clinicalUpdates=[];
    if(!Array.isArray(S().treatmentGoals)) S().treatmentGoals=[];
    save();
  }

  function patient(id){ return (S().patients||[]).find(p=>String(p.id)===String(id)); }
  function pname(id){
    const p=patient(id);
    return p?(p.name||p.fullName||p.patientName||'Patient'):'Patient';
  }
  function planForPatient(id){
    return (S().treatmentPlans||[])
      .filter(x=>String(x.patientId)===String(id) && x.status!=='Closed')
      .sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))[0];
  }

  function updatesForPatient(id){
    return (S().clinicalUpdates||[])
      .filter(x=>String(x.patientId)===String(id))
      .sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  }

  function goalsForPatient(id){
    return (S().treatmentGoals||[])
      .filter(x=>String(x.patientId)===String(id))
      .sort((a,b)=>Number(a.order||0)-Number(b.order||0));
  }

  function statusTone(s){
    const x=String(s||'Active').toLowerCase();
    if(x.includes('achiev')) return 'achieved';
    if(x.includes('hold')) return 'hold';
    if(x.includes('cancel')) return 'cancelled';
    return 'active';
  }

  function formatDateTime(x){
    if(!x) return '';
    try{
      return new Date(x).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    }catch(e){ return x; }
  }

  function getJourneyPatient(){
    return document.getElementById('v28-journey')?.dataset.patientId || '';
  }

  function addJourneyHeaderButtons(){
    const journey=document.querySelector('#v28-journey.open .v28-head-actions');
    if(!journey || journey.dataset.v29==='1') return;
    journey.dataset.v29='1';
    const pid=getJourneyPatient();
    if(!pid) return;

    const update=document.createElement('button');
    update.className='v29-update-btn';
    update.textContent='+ Clinical Update';
    update.onclick=()=>openV29ClinicalUpdate(pid);
    journey.prepend(update);

    const goal=document.createElement('button');
    goal.className='v29-goal-btn';
    goal.textContent='+ Goal';
    goal.onclick=()=>openV29GoalEditor(pid);
    journey.prepend(goal);
  }

  function addJourneyTimelineTab(){
    const nav=document.querySelector('#v28-journey.open .v28-tabs');
    if(!nav || nav.querySelector('[data-v29-tab="timeline"]')) return;

    const b=document.createElement('button');
    b.dataset.v29Tab='timeline';
    b.textContent='Clinical Timeline';
    b.onclick=function(){
      nav.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const c=document.getElementById('v28-content');
      const pid=getJourneyPatient();
      if(c && pid) c.innerHTML=renderV29ClinicalTimeline(pid);
    };
    nav.appendChild(b);
  }

  function enhanceJourneyOverview(){
    const c=document.getElementById('v28-content');
    const journey=document.getElementById('v28-journey');
    if(!c || !journey?.classList.contains('open')) return;

    const pid=journey.dataset.patientId;
    if(!pid || c.querySelector('.v29-goal-overview')) return;

    const activeTab=[...journey.querySelectorAll('.v28-tabs button')].find(x=>x.classList.contains('active'));
    if(!activeTab || activeTab.textContent.trim().toLowerCase()!=='overview') return;

    const goals=goalsForPatient(pid);
    const updates=updatesForPatient(pid);
    const avg=goals.length ? Math.round(goals.reduce((s,g)=>s+Number(g.progress||0),0)/goals.length) : 0;

    const block=document.createElement('section');
    block.className='v29-goal-overview';
    block.innerHTML=`
      <div class="v29-overview-head">
        <div>
          <small>TREATMENT GOALS</small>
          <h3>Goal Progress</h3>
        </div>
        <button onclick="openV29GoalEditor('${pid}')">+ Add Goal</button>
      </div>

      <div class="v29-goal-summary">
        <div class="v29-goal-ring" style="--p:${avg}"><b>${avg}%</b></div>
        <div class="v29-goal-summary-copy">
          <b>${goals.length} goal${goals.length===1?'':'s'} tracked</b>
          <span>${goals.filter(g=>statusTone(g.status)==='achieved').length} achieved</span>
        </div>
        <div class="v29-latest-update">
          <small>LATEST UPDATE</small>
          <b>${updates[0]?esc(updates[0].title||'Clinical Update'):'No updates yet'}</b>
          <span>${updates[0]?formatDateTime(updates[0].createdAt):'Add the first patient update'}</span>
        </div>
      </div>

      <div class="v29-goal-mini-list">
        ${goals.slice(0,4).map(g=>`
          <button onclick="openV29GoalEditor('${pid}','${g.id}')">
            <div><b>${esc(g.title)}</b><small>${esc(g.status||'Active')}</small></div>
            <span>${Number(g.progress||0)}%</span>
          </button>`).join('') || `<div class="v29-empty">No treatment goals added yet.</div>`}
      </div>`;
    c.appendChild(block);
  }

  window.renderV29ClinicalTimeline=function(patientId){
    ensure();

    const updates=updatesForPatient(patientId);
    const sessions=(S().sessionNotes||[])
      .filter(x=>String(x.patientId)===String(patientId))
      .map(x=>({
        type:'session',
        date:x.updatedAt||x.createdAt||x.date,
        title:'Clinical Session',
        body:x.subjective||x.response||'Clinical session documented.',
        meta:`${x.date||''}${x.therapist?' · '+x.therapist:''}`,
        pain:Number(x.painScore||0),
        appointmentId:x.appointmentId
      }));

    const updateRows=updates.map(x=>({
      type:'update',
      date:x.createdAt,
      title:x.title||'Clinical Update',
      body:x.note||'',
      meta:x.category||'Patient Update',
      pain:x.painScore,
      updateId:x.id
    }));

    const rows=[...updateRows,...sessions].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));

    return `
      <div class="v29-timeline-top">
        <div>
          <small>CLINICAL TIMELINE</small>
          <h3>Patient Updates & Session History</h3>
        </div>
        <button onclick="openV29ClinicalUpdate('${patientId}')">+ Add Update</button>
      </div>

      <div class="v29-timeline">
        ${rows.length?rows.map(r=>`
          <article class="v29-time-item ${r.type}">
            <div class="v29-time-dot"></div>
            <div class="v29-time-card">
              <div class="v29-time-head">
                <div>
                  <small>${esc(r.meta||'')}</small>
                  <h4>${esc(r.title)}</h4>
                </div>
                <span>${formatDateTime(r.date)}</span>
              </div>
              <p>${esc(r.body||'')}</p>
              ${r.pain!=null?`<div class="v29-pain-chip">Pain ${Number(r.pain)}/10</div>`:''}
              <div class="v29-time-actions">
                ${r.type==='session' && r.appointmentId?`<button onclick="previewV24SessionReport('${r.appointmentId}')">Open Session Report</button>`:''}
                ${r.type==='update' && r.updateId?`<button onclick="openV29ClinicalUpdate('${patientId}','${r.updateId}')">Edit Update</button>`:''}
              </div>
            </div>
          </article>`).join(''):`<div class="v29-empty">No clinical history available yet.</div>`}
      </div>`;
  };

  window.openV29ClinicalUpdate=function(patientId,updateId=''){
    ensure();

    const old=(S().clinicalUpdates||[]).find(x=>String(x.id)===String(updateId))||{};
    let r=document.getElementById('v29-update-modal');
    if(!r){
      r=document.createElement('div');
      r.id='v29-update-modal';
      document.body.appendChild(r);
    }
    r.className='open';
    r.dataset.patientId=patientId;
    r.dataset.updateId=updateId;

    r.innerHTML=`
      <div class="v29-back" onclick="closeV29ClinicalUpdate()"></div>
      <section class="v29-modal">
        <header>
          <div>
            <small>CLINICAL UPDATE</small>
            <h3>${esc(pname(patientId))}</h3>
            <p>Add a patient update without creating a new appointment.</p>
          </div>
          <button onclick="closeV29ClinicalUpdate()">×</button>
        </header>

        <div class="v29-form-grid">
          <label class="wide">
            <span>Update Title</span>
            <input id="v29-up-title" value="${esc(old.title||'')}" placeholder="e.g. Improved mobility after home exercise">
          </label>

          <label>
            <span>Category</span>
            <select id="v29-up-category">
              ${['General Update','Pain Update','Mobility','Functional Progress','Home Exercise','Caregiver Feedback','Medical Follow-up','Other'].map(x=>`<option ${old.category===x?'selected':''}>${x}</option>`).join('')}
            </select>
          </label>

          <label>
            <span>Pain Score</span>
            <input id="v29-up-pain" type="number" min="0" max="10" value="${old.painScore??''}" placeholder="0 - 10">
          </label>

          <label class="wide">
            <span>Clinical Update / Patient Status</span>
            <textarea id="v29-up-note" rows="5" placeholder="Document the latest change in the patient's condition...">${esc(old.note||'')}</textarea>
          </label>

          <label class="wide">
            <span>Next Action / Recommendation</span>
            <textarea id="v29-up-next" rows="3" placeholder="Recommended next action, follow-up or change to treatment...">${esc(old.nextAction||'')}</textarea>
          </label>
        </div>

        <footer>
          <button onclick="closeV29ClinicalUpdate()">Cancel</button>
          <button class="primary" onclick="saveV29ClinicalUpdate()">Save Update</button>
        </footer>
      </section>`;
  };

  window.closeV29ClinicalUpdate=function(){
    const r=document.getElementById('v29-update-modal');
    if(r) r.className='';
  };

  window.saveV29ClinicalUpdate=function(){
    const r=document.getElementById('v29-update-modal');
    if(!r) return;

    const patientId=r.dataset.patientId;
    const updateId=r.dataset.updateId;
    let x=(S().clinicalUpdates||[]).find(a=>String(a.id)===String(updateId));

    if(!x){
      x={
        id:'CU-'+Date.now(),
        patientId,
        createdAt:new Date().toISOString()
      };
      S().clinicalUpdates.push(x);
    }

    Object.assign(x,{
      title:document.getElementById('v29-up-title')?.value.trim()||'Clinical Update',
      category:document.getElementById('v29-up-category')?.value||'General Update',
      painScore:document.getElementById('v29-up-pain')?.value!==''?Number(document.getElementById('v29-up-pain')?.value):null,
      note:document.getElementById('v29-up-note')?.value.trim()||'',
      nextAction:document.getElementById('v29-up-next')?.value.trim()||'',
      updatedAt:new Date().toISOString()
    });

    save();
    closeV29ClinicalUpdate();

    if(document.getElementById('v28-journey')?.classList.contains('open')){
      const c=document.getElementById('v28-content');
      if(c) c.innerHTML=renderV29ClinicalTimeline(patientId);
      const nav=document.querySelector('#v28-journey .v28-tabs');
      nav?.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.v29Tab==='timeline'));
    }
  };

  window.openV29GoalEditor=function(patientId,goalId=''){
    ensure();
    const old=(S().treatmentGoals||[]).find(x=>String(x.id)===String(goalId))||{};
    let r=document.getElementById('v29-goal-modal');
    if(!r){
      r=document.createElement('div');
      r.id='v29-goal-modal';
      document.body.appendChild(r);
    }

    r.className='open';
    r.dataset.patientId=patientId;
    r.dataset.goalId=goalId;

    r.innerHTML=`
      <div class="v29-back" onclick="closeV29GoalEditor()"></div>
      <section class="v29-modal goal">
        <header>
          <div>
            <small>TREATMENT GOAL</small>
            <h3>${esc(pname(patientId))}</h3>
            <p>Track measurable rehabilitation goals.</p>
          </div>
          <button onclick="closeV29GoalEditor()">×</button>
        </header>

        <div class="v29-form-grid">
          <label class="wide">
            <span>Goal</span>
            <input id="v29-goal-title" value="${esc(old.title||'')}" placeholder="e.g. Walk independently for 10 minutes">
          </label>

          <label>
            <span>Status</span>
            <select id="v29-goal-status">
              ${['Active','Achieved','On Hold','Cancelled'].map(x=>`<option ${old.status===x?'selected':''}>${x}</option>`).join('')}
            </select>
          </label>

          <label>
            <span>Target Date</span>
            <input id="v29-goal-date" type="date" value="${esc(old.targetDate||'')}">
          </label>

          <label class="wide">
            <span>Progress</span>
            <div class="v29-goal-range">
              <input id="v29-goal-progress" type="range" min="0" max="100" step="5" value="${Number(old.progress||0)}" oninput="document.getElementById('v29-goal-progress-val').textContent=this.value+'%'">
              <b id="v29-goal-progress-val">${Number(old.progress||0)}%</b>
            </div>
          </label>

          <label class="wide">
            <span>Measurement / Criteria</span>
            <textarea id="v29-goal-measure" rows="3" placeholder="How will achievement be measured?">${esc(old.measurement||'')}</textarea>
          </label>

          <label class="wide">
            <span>Therapist Comment</span>
            <textarea id="v29-goal-comment" rows="3" placeholder="Progress notes or relevant comments...">${esc(old.comment||'')}</textarea>
          </label>
        </div>

        <footer>
          ${goalId?`<button class="danger" onclick="deleteV29Goal()">Delete</button>`:''}
          <span></span>
          <button onclick="closeV29GoalEditor()">Cancel</button>
          <button class="primary" onclick="saveV29Goal()">Save Goal</button>
        </footer>
      </section>`;
  };

  window.closeV29GoalEditor=function(){
    const r=document.getElementById('v29-goal-modal');
    if(r) r.className='';
  };

  window.saveV29Goal=function(){
    const r=document.getElementById('v29-goal-modal');
    if(!r) return;

    const patientId=r.dataset.patientId;
    const goalId=r.dataset.goalId;
    let x=(S().treatmentGoals||[]).find(a=>String(a.id)===String(goalId));

    if(!x){
      x={
        id:'TG-'+Date.now(),
        patientId,
        createdAt:new Date().toISOString(),
        order:goalsForPatient(patientId).length
      };
      S().treatmentGoals.push(x);
    }

    Object.assign(x,{
      title:document.getElementById('v29-goal-title')?.value.trim()||'Treatment Goal',
      status:document.getElementById('v29-goal-status')?.value||'Active',
      targetDate:document.getElementById('v29-goal-date')?.value||'',
      progress:Number(document.getElementById('v29-goal-progress')?.value||0),
      measurement:document.getElementById('v29-goal-measure')?.value.trim()||'',
      comment:document.getElementById('v29-goal-comment')?.value.trim()||'',
      updatedAt:new Date().toISOString()
    });

    save();
    closeV29GoalEditor();

    if(document.getElementById('v28-journey')?.classList.contains('open')){
      const pid=getJourneyPatient();
      const c=document.getElementById('v28-content');
      if(c && pid) c.innerHTML=`
        ${c.innerHTML}
      `;
      window.openV28Journey(pid,'overview');
      setTimeout(()=>{ addJourneyHeaderButtons(); addJourneyTimelineTab(); enhanceJourneyOverview(); },80);
    }
  };

  window.deleteV29Goal=function(){
    const r=document.getElementById('v29-goal-modal');
    if(!r) return;
    const id=r.dataset.goalId;
    if(!confirm('Delete this treatment goal?')) return;

    S().treatmentGoals=(S().treatmentGoals||[]).filter(x=>String(x.id)!==String(id));
    save();
    closeV29GoalEditor();

    const pid=getJourneyPatient();
    if(pid){
      window.openV28Journey(pid,'overview');
      setTimeout(()=>{ addJourneyHeaderButtons(); addJourneyTimelineTab(); enhanceJourneyOverview(); },80);
    }
  };

  function enhanceV24Session(){
    const modal=document.querySelector('#v24-clinical-modal.open .v24-dialog');
    if(!modal || modal.dataset.v29==='1') return;

    const pText=modal.querySelector('.v24-head h2')?.textContent?.trim();
    if(!pText) return;

    const p=(S().patients||[]).find(x=>(x.name||x.fullName||x.patientName||'').trim()===pText);
    if(!p) return;

    modal.dataset.v29='1';
    const tabs=modal.querySelector('.v24-tabs');
    if(tabs){
      const b=document.createElement('button');
      b.textContent='Patient Updates';
      b.onclick=function(){
        modal.querySelectorAll('.v24-tab').forEach(x=>x.classList.remove('active'));
        tabs.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');

        let panel=modal.querySelector('#v29-session-updates');
        if(!panel){
          panel=document.createElement('div');
          panel.id='v29-session-updates';
          panel.className='v24-tab active';
          modal.querySelector('.v24-footer').insertAdjacentElement('beforebegin',panel);
        }else panel.classList.add('active');

        const updates=updatesForPatient(p.id).slice(0,8);
        panel.innerHTML=`
          <div class="v29-session-update-head">
            <div><small>PATIENT UPDATES</small><h3>Recent Clinical Changes</h3></div>
            <button onclick="openV29ClinicalUpdate('${p.id}')">+ Add Update</button>
          </div>
          <div class="v29-session-update-list">
            ${updates.length?updates.map(u=>`
              <article><div><small>${esc(u.category||'Update')}</small><b>${esc(u.title||'Clinical Update')}</b><span>${formatDateTime(u.createdAt)}</span></div>${u.painScore!=null?`<em>${u.painScore}/10</em>`:''}<p>${esc(u.note||'')}</p></article>`).join(''):`<div class="v29-empty">No patient updates yet.</div>`}
          </div>`;
      };
      tabs.appendChild(b);
    }
  }

  function css(){
    if(document.getElementById('v29-css')) return;
    const st=document.createElement('style');
    st.id='v29-css';
    st.textContent=`
      #v29-update-modal,#v29-goal-modal{display:none}
      #v29-update-modal.open,#v29-goal-modal.open{display:block;position:fixed;inset:0;z-index:100070}
      .v29-back{position:absolute;inset:0;background:rgba(11,31,37,.48);backdrop-filter:blur(4px)}
      .v29-modal{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(620px,94vw);background:#fff;border-radius:18px;padding:18px;box-shadow:0 30px 90px rgba(0,0,0,.25)}
      .v29-modal header{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #e4ebed;padding-bottom:11px;margin-bottom:13px}.v29-modal header small{font-size:7px;color:#b48637;font-weight:900;letter-spacing:1.1px}.v29-modal header h3{margin:2px 0;color:#31545c}.v29-modal header p{margin:0;font-size:8px;color:#89979c}.v29-modal header button{border:0;background:#f1f4f5;width:30px;height:30px;border-radius:50%;font-size:18px}
      .v29-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.v29-form-grid label{display:flex;flex-direction:column;gap:5px}.v29-form-grid label.wide{grid-column:1/-1}.v29-form-grid label>span{font-size:8px;font-weight:800;color:#60767c}.v29-form-grid input,.v29-form-grid textarea,.v29-form-grid select{border:1px solid #dbe5e7;border-radius:8px;padding:8px;font:inherit;font-size:9px;color:#36575f}
      .v29-modal footer{display:flex;align-items:center;gap:7px;border-top:1px solid #e6edef;margin-top:13px;padding-top:11px}.v29-modal footer span{flex:1}.v29-modal footer button{border:1px solid #dbe5e7;background:#fff;border-radius:8px;padding:8px 10px;font-size:8px;font-weight:800}.v29-modal footer .primary{background:#c99a42;border-color:#c99a42;color:#fff}.v29-modal footer .danger{border-color:#efc8cd;color:#a84a54;background:#fff4f5}
      .v29-goal-range{display:grid;grid-template-columns:1fr 48px;align-items:center;gap:10px;border:1px solid #dbe5e7;border-radius:9px;padding:8px}.v29-goal-range input{border:0;padding:0;accent-color:#174f5b}.v29-goal-range b{text-align:center;color:#31545c}
      .v29-goal-overview{margin-top:11px;background:linear-gradient(135deg,#fff,#f4faf9);border:1px solid #dce8e9;border-radius:12px;padding:11px;box-shadow:0 5px 14px rgba(28,66,75,.04)}.v29-overview-head{display:flex;justify-content:space-between;align-items:center}.v29-overview-head small{font-size:7px;color:#b48637;font-weight:900}.v29-overview-head h3{margin:2px 0;color:#31545c}.v29-overview-head button{border:1px solid #d7e3e5;background:#fff;border-radius:8px;padding:6px 8px;font-size:7px;font-weight:800}
      .v29-goal-summary{display:grid;grid-template-columns:70px 1fr 1.4fr;align-items:center;gap:10px;margin-top:10px}.v29-goal-ring{--p:0;width:60px;height:60px;border-radius:50%;background:conic-gradient(#174f5b calc(var(--p)*1%),#e8eff0 0);display:grid;place-items:center;position:relative}.v29-goal-ring:after{content:"";position:absolute;inset:6px;background:#fff;border-radius:50%}.v29-goal-ring b{z-index:1;color:#31545c;font-size:11px}.v29-goal-summary-copy b,.v29-goal-summary-copy span,.v29-latest-update small,.v29-latest-update b,.v29-latest-update span{display:block}.v29-goal-summary-copy b{font-size:9px;color:#31545c}.v29-goal-summary-copy span{font-size:7px;color:#89979c}.v29-latest-update{border-left:1px solid #e1e9eb;padding-left:10px}.v29-latest-update small{font-size:6px;color:#b48637;font-weight:900}.v29-latest-update b{font-size:8px;color:#36575f;margin:2px 0}.v29-latest-update span{font-size:6px;color:#8c999d}
      .v29-goal-mini-list{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:9px}.v29-goal-mini-list button{display:grid;grid-template-columns:1fr auto;align-items:center;text-align:left;border:1px solid #e0e8ea;background:#fff;border-radius:8px;padding:7px}.v29-goal-mini-list b,.v29-goal-mini-list small{display:block}.v29-goal-mini-list b{font-size:8px;color:#36575f}.v29-goal-mini-list small{font-size:6px;color:#8a989d}.v29-goal-mini-list span{font-size:8px;font-weight:900;color:#174f5b}
      .v29-timeline-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.v29-timeline-top small{font-size:7px;color:#b48637;font-weight:900}.v29-timeline-top h3{margin:2px 0;color:#31545c}.v29-timeline-top button{border:1px solid #c99a42;background:#fff8ea;color:#8e6829;border-radius:8px;padding:7px 9px;font-size:7px;font-weight:800}
      .v29-timeline{position:relative;padding-left:24px}.v29-timeline:before{content:"";position:absolute;left:8px;top:4px;bottom:4px;width:2px;background:#dce7e9}.v29-time-item{position:relative;margin-bottom:10px}.v29-time-dot{position:absolute;left:-21px;top:13px;width:9px;height:9px;border-radius:50%;background:#174f5b;box-shadow:0 0 0 4px #edf5f6}.v29-time-item.update .v29-time-dot{background:#c99a42}.v29-time-card{background:#fff;border:1px solid #dfe8ea;border-radius:11px;padding:10px}.v29-time-head{display:flex;justify-content:space-between;gap:10px}.v29-time-head small{font-size:6px;color:#a17a35;font-weight:900}.v29-time-head h4{margin:2px 0;color:#31545c}.v29-time-head>span{font-size:6px;color:#8d9a9e}.v29-time-card p{font-size:8px;color:#60767c;line-height:1.45}.v29-pain-chip{display:inline-block;background:#fff1f2;color:#a64a55;border-radius:99px;padding:3px 6px;font-size:6px;font-weight:900}.v29-time-actions{display:flex;gap:5px;margin-top:7px}.v29-time-actions button{border:1px solid #dbe5e7;background:#fff;border-radius:7px;padding:5px 7px;font-size:6px;font-weight:800;color:#5f747a}
      .v29-update-btn,.v29-goal-btn{background:#fff!important}.v29-session-update-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}.v29-session-update-head small{font-size:7px;color:#b48637;font-weight:900}.v29-session-update-head h3{margin:2px 0;color:#31545c}.v29-session-update-head button{border:1px solid #c99a42;background:#fff8ea;color:#8e6829;border-radius:8px;padding:6px 8px;font-size:7px;font-weight:800}.v29-session-update-list{display:grid;gap:6px}.v29-session-update-list article{display:grid;grid-template-columns:1fr auto;gap:6px;border:1px solid #dfe8ea;background:#fff;border-radius:9px;padding:8px}.v29-session-update-list article p{grid-column:1/-1;font-size:8px;color:#60767c;margin:2px 0}.v29-session-update-list small,.v29-session-update-list b,.v29-session-update-list span{display:block}.v29-session-update-list small{font-size:6px;color:#a07831;font-weight:900}.v29-session-update-list b{font-size:8px;color:#36575f}.v29-session-update-list span{font-size:6px;color:#8a989d}.v29-session-update-list em{font-style:normal;font-size:7px;background:#fff1f2;color:#a64a55;border-radius:99px;padding:4px 6px;height:max-content}
      @media(max-width:720px){.v29-form-grid{grid-template-columns:1fr}.v29-form-grid label.wide{grid-column:auto}.v29-goal-summary{grid-template-columns:65px 1fr}.v29-latest-update{grid-column:1/-1;border-left:0;border-top:1px solid #e1e9eb;padding:8px 0 0}.v29-goal-mini-list{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  function repair(){
    addJourneyHeaderButtons();
    addJourneyTimelineTab();
    enhanceJourneyOverview();
    enhanceV24Session();
  }

  function init(){
    ensure();
    css();
    setTimeout(repair,300);
    const obs=new MutationObserver(()=>{
      clearTimeout(window.__v29repair);
      window.__v29repair=setTimeout(repair,60);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();


/* =========================================================
   myAIMS V30 - PROGRESS REVIEW + OUTCOME SUMMARY
   Adds:
   - Compare current vs previous clinical session
   - Review Due logic based on treatment plan reviewAfter
   - Milestones and goal achievement summary
   - Printable Progress Review report
   - Quick Review action inside Patient Clinical Journey
   ========================================================= */
(function(){
  const S=()=>window.state||window.appState||{};
  const save=()=>{ if(typeof window.saveState==='function') window.saveState(); };
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function notesForPatient(id){
    return (S().sessionNotes||[])
      .filter(x=>String(x.patientId)===String(id))
      .sort((a,b)=>(String(a.date||'')+String(a.updatedAt||'')).localeCompare(String(b.date||'')+String(b.updatedAt||'')));
  }

  function planForPatient(id){
    return (S().treatmentPlans||[])
      .filter(x=>String(x.patientId)===String(id) && x.status!=='Closed')
      .sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))[0];
  }

  function goalsForPatient(id){
    return (S().treatmentGoals||[]).filter(x=>String(x.patientId)===String(id));
  }

  function patient(id){
    return (S().patients||[]).find(p=>String(p.id)===String(id));
  }

  function pname(id){
    const p=patient(id);
    return p?(p.name||p.fullName||p.patientName||'Patient'):'Patient';
  }

  function completedAppointments(id){
    return (S().appointments||[]).filter(a=>String(a.patientId)===String(id) && a.status==='Completed').length;
  }

  function latestComparison(id){
    const notes=notesForPatient(id);
    const current=notes[notes.length-1]||null;
    const previous=notes.length>1?notes[notes.length-2]:null;
    return {current,previous};
  }

  function delta(current,previous){
    if(current==null || previous==null) return null;
    return Number(current)-Number(previous);
  }

  function arrow(d,reverseGood=false){
    if(d==null) return '—';
    if(d===0) return '→';
    const good=reverseGood ? d<0 : d>0;
    return good?'↓':'↑';
  }

  function statusClass(d,reverseGood=false){
    if(d==null || d===0) return 'neutral';
    const good=reverseGood ? d<0 : d>0;
    return good?'good':'watch';
  }

  function reviewStatus(id){
    const plan=planForPatient(id);
    if(!plan) return {due:false,text:'No active treatment plan'};
    const completed=completedAppointments(id);
    const every=Math.max(1,Number(plan.reviewAfter||4));
    const next=Math.ceil(Math.max(1,completed)/every)*every;
    const due=completed>0 && completed%every===0;
    return {
      due,
      text:due?`Review due now after ${completed} completed sessions`:`Next review after session ${next}`,
      completed,
      every
    };
  }

  function milestoneHtml(id){
    const goals=goalsForPatient(id);
    if(!goals.length) return `<div class="v30-empty">No treatment goals available.</div>`;
    return goals.map(g=>{
      const p=Math.max(0,Math.min(100,Number(g.progress||0)));
      return `
        <div class="v30-milestone">
          <div class="v30-ms-top">
            <div><b>${esc(g.title||'Goal')}</b><small>${esc(g.status||'Active')}</small></div>
            <strong>${p}%</strong>
          </div>
          <div class="v30-ms-bar"><i style="width:${p}%"></i></div>
          ${g.measurement?`<p>${esc(g.measurement)}</p>`:''}
        </div>`;
    }).join('');
  }

  function bodyAreaComparison(id){
    const {current,previous}=latestComparison(id);
    const currentMap=current?.bodyAreaSeverity||{};
    const prevMap=previous?.bodyAreaSeverity||{};
    const areas=[...new Set([...Object.keys(currentMap),...Object.keys(prevMap)])];
    if(!areas.length) return `<div class="v30-empty">No body-area comparison available yet.</div>`;

    const label=v=>['Selected','Mild','Moderate','Severe'][Number(v)]||'—';
    return areas.map(area=>{
      const a=prevMap[area];
      const b=currentMap[area];
      const d=(a!=null && b!=null)?Number(b)-Number(a):null;
      return `
        <div class="v30-area-row">
          <b>${esc(area)}</b>
          <span>${a!=null?label(a):'—'}</span>
          <i>→</i>
          <strong class="${statusClass(d,true)}">${b!=null?label(b):'—'}</strong>
        </div>`;
    }).join('');
  }

  window.openV30ProgressReview=function(patientId){
    const {current,previous}=latestComparison(patientId);
    const plan=planForPatient(patientId);
    const review=reviewStatus(patientId);

    let r=document.getElementById('v30-review');
    if(!r){
      r=document.createElement('div');
      r.id='v30-review';
      document.body.appendChild(r);
    }

    const painDelta=current&&previous?delta(Number(current.painScore||0),Number(previous.painScore||0)):null;
    const progDelta=current&&previous?delta(Number(current.progressScore||0),Number(previous.progressScore||0)):null;
    const completed=completedAppointments(patientId);
    const planned=Number(plan?.plannedSessions||0);
    const overall=planned?Math.min(100,Math.round(completed/planned*100)):0;

    r.className='open';
    r.dataset.patientId=patientId;
    r.innerHTML=`
      <div class="v30-back" onclick="closeV30ProgressReview()"></div>
      <section class="v30-shell">
        <header class="v30-head">
          <div>
            <small>PROGRESS REVIEW</small>
            <h2>${esc(pname(patientId))}</h2>
            <p>${review.text}</p>
          </div>
          <div class="v30-head-actions">
            <button onclick="printV30ProgressReview('${patientId}')">Print Review</button>
            <button onclick="closeV30ProgressReview()">×</button>
          </div>
        </header>

        <div class="v30-review-banner ${review.due?'due':'ok'}">
          <div>
            <small>${review.due?'REVIEW DUE':'REVIEW STATUS'}</small>
            <b>${review.text}</b>
          </div>
          <span>${completed}${planned?` / ${planned}`:''} sessions</span>
        </div>

        <div class="v30-kpis">
          <div>
            <small>PAIN SCORE</small>
            <b>${current?Number(current.painScore||0)+'/10':'—'}</b>
            <span class="${statusClass(painDelta,true)}">${previous?`${Number(previous.painScore||0)}/10 ${arrow(painDelta,true)} ${painDelta===0?'No change':Math.abs(painDelta)+' point'+(Math.abs(painDelta)!==1?'s':'')}`:'No previous session'}</span>
          </div>
          <div>
            <small>SESSION PROGRESS</small>
            <b>${current?Number(current.progressScore||0)+'%':'—'}</b>
            <span class="${statusClass(progDelta,false)}">${previous?`${Number(previous.progressScore||0)}% ${arrow(progDelta,false)} ${progDelta===0?'No change':Math.abs(progDelta)+'%'}`:'No previous session'}</span>
          </div>
          <div>
            <small>PLAN COMPLETION</small>
            <b>${overall}%</b>
            <span>${completed} completed${planned?` · ${Math.max(0,planned-completed)} remaining`:''}</span>
          </div>
          <div>
            <small>GOALS ACHIEVED</small>
            <b>${goalsForPatient(patientId).filter(g=>String(g.status).toLowerCase().includes('achiev')).length}</b>
            <span>of ${goalsForPatient(patientId).length} tracked goals</span>
          </div>
        </div>

        <div class="v30-grid">
          <section class="v30-card">
            <div class="v30-card-head"><div><small>SESSION COMPARISON</small><h3>Previous vs Latest</h3></div></div>
            ${current?`
              <div class="v30-compare">
                <div>
                  <small>PREVIOUS SESSION</small>
                  <b>${previous?.date||'—'}</b>
                  <p>${esc(previous?.subjective||previous?.response||'No previous note available.')}</p>
                </div>
                <div class="latest">
                  <small>LATEST SESSION</small>
                  <b>${current.date||'—'}</b>
                  <p>${esc(current.subjective||current.response||'No clinical summary.')}</p>
                </div>
              </div>
            `:`<div class="v30-empty">No clinical session data yet.</div>`}
          </section>

          <section class="v30-card">
            <div class="v30-card-head"><div><small>BODY MAP</small><h3>Area Change</h3></div></div>
            <div class="v30-area-list">${bodyAreaComparison(patientId)}</div>
          </section>
        </div>

        <section class="v30-card">
          <div class="v30-card-head">
            <div><small>MILESTONES</small><h3>Treatment Goal Progress</h3></div>
          </div>
          <div class="v30-milestones">${milestoneHtml(patientId)}</div>
        </section>

        <section class="v30-card v30-clinical-review">
          <div class="v30-card-head">
            <div><small>REVIEW NOTE</small><h3>Progress Review Summary</h3></div>
          </div>
          <div class="v30-review-fields">
            <label><span>Overall Progress Summary</span><textarea id="v30-summary" rows="3" placeholder="Summarise overall progress since the previous review..."></textarea></label>
            <label><span>Plan Decision</span>
              <select id="v30-decision">
                <option>Continue Current Plan</option>
                <option>Modify Treatment Plan</option>
                <option>Increase Session Frequency</option>
                <option>Reduce Session Frequency</option>
                <option>Prepare for Discharge</option>
                <option>Refer for Medical Review</option>
              </select>
            </label>
            <label><span>Next Review / Action</span><textarea id="v30-next" rows="2" placeholder="Next review date, action or treatment adjustment..."></textarea></label>
          </div>
          <div class="v30-review-actions">
            <button onclick="saveV30Review('${patientId}')">Save Progress Review</button>
          </div>
        </section>
      </section>`;
  };

  window.closeV30ProgressReview=function(){
    const r=document.getElementById('v30-review');
    if(r) r.className='';
  };

  window.saveV30Review=function(patientId){
    if(!Array.isArray(S().progressReviews)) S().progressReviews=[];
    const plan=planForPatient(patientId);
    S().progressReviews.push({
      id:'PR-'+Date.now(),
      patientId,
      planId:plan?.id||'',
      createdAt:new Date().toISOString(),
      completedSessions:completedAppointments(patientId),
      summary:document.getElementById('v30-summary')?.value.trim()||'',
      decision:document.getElementById('v30-decision')?.value||'Continue Current Plan',
      nextAction:document.getElementById('v30-next')?.value.trim()||''
    });
    save();
    alert('Progress review saved.');
  };

  window.printV30ProgressReview=function(patientId){
    const p=patient(patientId);
    const plan=planForPatient(patientId);
    const {current,previous}=latestComparison(patientId);
    const goals=goalsForPatient(patientId);
    const review=reviewStatus(patientId);

    const win=window.open('','_blank','width=900,height=1000');
    if(!win) return;

    win.document.write(`
      <html>
      <head>
        <title>Progress Review - ${esc(pname(patientId))}</title>
        <style>
          body{font-family:Arial,sans-serif;color:#27434a;margin:0;background:#fff}
          .page{width:190mm;min-height:270mm;margin:0 auto;padding:13mm;box-sizing:border-box}
          header{display:flex;justify-content:space-between;border-bottom:2px solid #174f5b;padding-bottom:10px}
          h1{font-size:20px;margin:0;color:#174f5b} h2{font-size:14px;color:#174f5b}
          small{color:#a27c36;font-weight:bold;font-size:9px;letter-spacing:.8px}
          p,td,th{font-size:10px;line-height:1.5}
          .meta{font-size:10px;color:#687d82}
          .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}
          .kpis div{border:1px solid #dbe6e8;border-radius:8px;padding:8px}
          .kpis b{display:block;font-size:15px;color:#174f5b;margin-top:3px}
          table{border-collapse:collapse;width:100%;margin-top:7px}
          th,td{border:1px solid #dfe7e9;padding:7px;text-align:left}
          th{background:#f2f7f8}
          .box{border:1px solid #dbe6e8;border-radius:8px;padding:10px;margin:10px 0}
          @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.page{margin:0}}
        </style>
      </head>
      <body>
        <div class="page">
          <header>
            <div><small>myAIMS REHABILITATION CENTER</small><h1>Patient Progress Review</h1></div>
            <div class="meta">${new Date().toLocaleDateString()}</div>
          </header>

          <div class="box">
            <b>${esc(pname(patientId))}</b>
            <div class="meta">${esc(p?.id||'')} · ${esc(p?.phone||p?.mobile||'')}</div>
            <div class="meta">Treatment Plan: ${esc(plan?.title||'No active plan')}</div>
          </div>

          <div class="kpis">
            <div><small>Sessions</small><b>${completedAppointments(patientId)}</b></div>
            <div><small>Latest Pain</small><b>${current?Number(current.painScore||0)+'/10':'—'}</b></div>
            <div><small>Latest Progress</small><b>${current?Number(current.progressScore||0)+'%':'—'}</b></div>
            <div><small>Review</small><b>${review.due?'Due':'On Track'}</b></div>
          </div>

          <h2>Session Comparison</h2>
          <table>
            <tr><th></th><th>Previous</th><th>Latest</th></tr>
            <tr><td>Date</td><td>${previous?.date||'—'}</td><td>${current?.date||'—'}</td></tr>
            <tr><td>Pain Score</td><td>${previous?Number(previous.painScore||0)+'/10':'—'}</td><td>${current?Number(current.painScore||0)+'/10':'—'}</td></tr>
            <tr><td>Progress</td><td>${previous?Number(previous.progressScore||0)+'%':'—'}</td><td>${current?Number(current.progressScore||0)+'%':'—'}</td></tr>
          </table>

          <h2>Treatment Goals</h2>
          <table>
            <tr><th>Goal</th><th>Status</th><th>Progress</th></tr>
            ${goals.map(g=>`<tr><td>${esc(g.title||'')}</td><td>${esc(g.status||'')}</td><td>${Number(g.progress||0)}%</td></tr>`).join('') || '<tr><td colspan="3">No treatment goals documented.</td></tr>'}
          </table>

          <div class="box">
            <small>LATEST CLINICAL SUMMARY</small>
            <p>${esc(current?.subjective||current?.response||'No latest clinical note available.')}</p>
          </div>
        </div>
        <script>window.onload=()=>setTimeout(()=>window.print(),200)<\/script>
      </body>
      </html>`);
    win.document.close();
  };

  function enhanceJourney(){
    const journey=document.getElementById('v28-journey');
    if(!journey?.classList.contains('open')) return;
    const pid=journey.dataset.patientId;
    if(!pid) return;

    const actions=journey.querySelector('.v28-head-actions');
    if(actions && !actions.querySelector('.v30-review-btn')){
      const b=document.createElement('button');
      b.className='v30-review-btn';
      const rs=reviewStatus(pid);
      b.innerHTML=rs.due?'Review Due':'Progress Review';
      if(rs.due) b.classList.add('due');
      b.onclick=()=>openV30ProgressReview(pid);
      actions.prepend(b);
    }

    const c=document.getElementById('v28-content');
    const active=[...journey.querySelectorAll('.v28-tabs button')].find(x=>x.classList.contains('active'));
    if(c && active?.textContent.trim().toLowerCase()==='progress' && !c.querySelector('.v30-progress-review-card')){
      const rs=reviewStatus(pid);
      const x=document.createElement('section');
      x.className='v30-progress-review-card '+(rs.due?'due':'');
      x.innerHTML=`
        <div>
          <small>PROGRESS REVIEW</small>
          <h3>${rs.due?'Review is due':'Treatment review status'}</h3>
          <p>${rs.text}</p>
        </div>
        <button onclick="openV30ProgressReview('${pid}')">${rs.due?'Start Review':'Open Review'}</button>`;
      c.prepend(x);
    }
  }

  function css(){
    if(document.getElementById('v30-css')) return;
    const st=document.createElement('style');
    st.id='v30-css';
    st.textContent=`
      #v30-review{display:none}
      #v30-review.open{display:block;position:fixed;inset:0;z-index:100090}
      .v30-back{position:absolute;inset:0;background:rgba(10,30,37,.50);backdrop-filter:blur(4px)}
      .v30-shell{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(1100px,96vw);height:min(900px,94vh);overflow:auto;background:#f4f8f9;border-radius:19px;box-shadow:0 30px 100px rgba(0,0,0,.27);padding:18px;box-sizing:border-box}
      .v30-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;background:#fff;border:1px solid #dfe8ea;border-radius:13px;padding:13px}.v30-head small{font-size:7px;color:#b48637;font-weight:900;letter-spacing:1px}.v30-head h2{margin:2px 0;color:#31545c}.v30-head p{font-size:8px;color:#89979c;margin:0}.v30-head-actions{display:flex;gap:6px}.v30-head-actions button{border:1px solid #d9e4e6;background:#fff;border-radius:8px;padding:7px 9px;font-size:7px;font-weight:800;color:#526d74}
      .v30-review-banner{display:flex;justify-content:space-between;align-items:center;border-radius:11px;padding:10px 12px;margin:10px 0}.v30-review-banner.ok{background:#edf8f3;border:1px solid #cee8da}.v30-review-banner.due{background:#fff4dc;border:1px solid #ead4a3}.v30-review-banner small,.v30-review-banner b{display:block}.v30-review-banner small{font-size:6px;color:#9d7938;font-weight:900}.v30-review-banner b{font-size:9px;color:#405d64}.v30-review-banner span{font-size:8px;color:#6f8389}
      .v30-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}.v30-kpis>div{background:#fff;border:1px solid #dfe8ea;border-radius:11px;padding:10px}.v30-kpis small,.v30-kpis b,.v30-kpis span{display:block}.v30-kpis small{font-size:6px;color:#a17a35;font-weight:900}.v30-kpis b{font-size:14px;color:#31545c;margin:3px 0}.v30-kpis span{font-size:7px;color:#86969b}.v30-kpis span.good{color:#277357}.v30-kpis span.watch{color:#b16b30}.v30-kpis span.neutral{color:#7f9095}
      .v30-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.v30-card{background:#fff;border:1px solid #dfe8ea;border-radius:12px;padding:11px;margin-bottom:9px}.v30-card-head small{font-size:6px;color:#b48637;font-weight:900}.v30-card-head h3{margin:2px 0 8px;color:#31545c;font-size:11px}.v30-compare{display:grid;grid-template-columns:1fr 1fr;gap:7px}.v30-compare>div{background:#f8fbfb;border:1px solid #e3ebed;border-radius:8px;padding:8px}.v30-compare>div.latest{background:#eef7f5;border-color:#d5e8e3}.v30-compare small,.v30-compare b{display:block}.v30-compare small{font-size:6px;color:#9d7a3b;font-weight:900}.v30-compare b{font-size:8px;color:#36575f;margin:2px 0}.v30-compare p{font-size:7px;color:#667a80;line-height:1.45}
      .v30-area-list{display:grid;gap:5px}.v30-area-row{display:grid;grid-template-columns:1fr auto 18px auto;gap:7px;align-items:center;background:#f8fbfb;border:1px solid #e4ebed;border-radius:8px;padding:7px}.v30-area-row b{font-size:7px;color:#36575f}.v30-area-row span,.v30-area-row strong{font-size:7px}.v30-area-row i{font-style:normal;color:#9b8a65}.v30-area-row strong.good{color:#277357}.v30-area-row strong.watch{color:#b26539}.v30-area-row strong.neutral{color:#73878d}
      .v30-milestones{display:grid;grid-template-columns:1fr 1fr;gap:7px}.v30-milestone{border:1px solid #e1e9eb;border-radius:9px;padding:8px;background:#fbfdfd}.v30-ms-top{display:flex;justify-content:space-between;gap:8px}.v30-ms-top b,.v30-ms-top small{display:block}.v30-ms-top b{font-size:8px;color:#36575f}.v30-ms-top small{font-size:6px;color:#89979c}.v30-ms-top strong{font-size:9px;color:#174f5b}.v30-ms-bar{height:5px;background:#eaf0f1;border-radius:99px;overflow:hidden;margin:6px 0}.v30-ms-bar i{display:block;height:100%;background:linear-gradient(90deg,#174f5b,#c99a42)}.v30-milestone p{font-size:7px;color:#6c8085;margin:3px 0 0}
      .v30-review-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v30-review-fields label{display:flex;flex-direction:column;gap:4px}.v30-review-fields label:first-child{grid-column:1/-1}.v30-review-fields label span{font-size:7px;font-weight:800;color:#5d7379}.v30-review-fields textarea,.v30-review-fields select{border:1px solid #dbe5e7;border-radius:8px;padding:8px;font:inherit;font-size:8px}.v30-review-actions{display:flex;justify-content:flex-end;margin-top:8px}.v30-review-actions button{background:#174f5b;color:#fff;border:0;border-radius:8px;padding:8px 10px;font-size:7px;font-weight:800}
      .v30-review-btn.due{background:#fff4dc!important;border-color:#dfbd76!important;color:#926828!important}
      .v30-progress-review-card{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#edf8f3;border:1px solid #cfe8dc;border-radius:11px;padding:10px;margin-bottom:10px}.v30-progress-review-card.due{background:#fff5df;border-color:#e4c886}.v30-progress-review-card small{font-size:6px;color:#a17a35;font-weight:900}.v30-progress-review-card h3{margin:2px 0;color:#36575f}.v30-progress-review-card p{margin:0;font-size:7px;color:#76898e}.v30-progress-review-card button{border:1px solid #d6e2e4;background:#fff;border-radius:8px;padding:7px 9px;font-size:7px;font-weight:800}
      .v30-empty{text-align:center;color:#8d9b9f;font-size:7px;padding:18px}
      @media(max-width:780px){.v30-kpis{grid-template-columns:1fr 1fr}.v30-grid,.v30-milestones,.v30-review-fields,.v30-compare{grid-template-columns:1fr}.v30-review-fields label:first-child{grid-column:auto}}
    `;
    document.head.appendChild(st);
  }

  function repair(){
    enhanceJourney();
  }

  function init(){
    if(!Array.isArray(S().progressReviews)) S().progressReviews=[];
    save();
    css();
    setTimeout(repair,300);
    const obs=new MutationObserver(()=>{
      clearTimeout(window.__v30repair);
      window.__v30repair=setTimeout(repair,60);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();

/* =========================================================
   myAIMS V31 - PATIENT WORKSPACE
   Makes the patient record a full in-page workspace:
   Overview | Treatment Plan | Sessions | Progress |
   Clinical Timeline | Reports
   ========================================================= */
(function(){
 const S=()=>window.state||window.appState||{};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const patient=id=>(S().patients||[]).find(p=>String(p.id)===String(id));
 const name=id=>{const p=patient(id);return p?(p.name||p.fullName||p.patientName||'Patient'):'Patient'};
 const notes=id=>(S().sessionNotes||[]).filter(n=>String(n.patientId)===String(id)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 const appts=id=>(S().appointments||[]).filter(a=>String(a.patientId)===String(id)).sort((a,b)=>(String(b.date||'')+String(b.time||'')).localeCompare(String(a.date||'')+String(a.time||'')));
 const plan=id=>(S().treatmentPlans||[]).filter(x=>String(x.patientId)===String(id)&&x.status!=='Closed').sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))[0];
 const goals=id=>(S().treatmentGoals||[]).filter(x=>String(x.patientId)===String(id));
 const updates=id=>(S().clinicalUpdates||[]).filter(x=>String(x.patientId)===String(id)).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));

 function workspace(){
   let w=document.getElementById('v31-workspace');
   if(!w){
     w=document.createElement('div');
     w.id='v31-workspace';
     const page=document.getElementById('page-patients');
     if(page) page.appendChild(w);
   }
   return w;
 }

 function body(pid,tab){
   const p=patient(pid), ns=notes(pid), as=appts(pid), pl=plan(pid), gs=goals(pid), us=updates(pid);
   const completed=as.filter(a=>a.status==='Completed').length;
   const latest=ns[0];
   if(tab==='overview') return `
     <div class="v31-kpis">
       <div><small>ACTIVE PLAN</small><b>${esc(pl?.title||'No active plan')}</b><span>${esc((pl?.areas||[]).slice(0,2).join(', ')||'')}</span></div>
       <div><small>SESSIONS</small><b>${completed}${pl?.plannedSessions?' / '+pl.plannedSessions:''}</b><span>${Math.max(0,Number(pl?.plannedSessions||0)-completed)} remaining</span></div>
       <div><small>LATEST PAIN</small><b>${latest?Number(latest.painScore||0)+'/10':'—'}</b><span>${latest?.date||'No session note'}</span></div>
       <div><small>GOALS</small><b>${gs.filter(g=>String(g.status).toLowerCase().includes('achiev')).length} / ${gs.length}</b><span>achieved</span></div>
     </div>
     <div class="v31-grid">
       <section class="v31-card"><div class="v31-card-head"><div><small>LATEST CLINICAL UPDATE</small><h3>${esc(us[0]?.title||'No update yet')}</h3></div><button onclick="openV29ClinicalUpdate('${pid}')">+ Update</button></div><p>${esc(us[0]?.note||latest?.subjective||'Add the latest patient status or clinical update.')}</p>${us[0]?`<span class="v31-date">${new Date(us[0].createdAt).toLocaleString()}</span>`:''}</section>
       <section class="v31-card"><div class="v31-card-head"><div><small>TREATMENT PLAN</small><h3>${esc(pl?.title||'Not created')}</h3></div><button onclick="openV28PlanEditor('${pid}')">${pl?'Edit':'Create'}</button></div><p>${esc(pl?.comments||'No active treatment plan documented.')}</p><div class="v31-tags">${(pl?.areas||[]).map(x=>`<span>${esc(x)}</span>`).join('')}</div></section>
     </div>
     <div class="v31-grid">
       <section class="v31-card"><div class="v31-card-head"><div><small>RECENT SESSIONS</small><h3>Clinical Activity</h3></div><button onclick="v31Tab('${pid}','sessions')">View All</button></div>${as.slice(0,4).map(a=>`<div class="v31-mini-row"><div><b>${esc(a.visitType||'Session')}</b><small>${esc(a.date)} · ${esc(a.time||'')}</small></div><span>${esc(a.status||'')}</span></div>`).join('')||'<p>No sessions yet.</p>'}</section>
       <section class="v31-card"><div class="v31-card-head"><div><small>GOAL PROGRESS</small><h3>Treatment Goals</h3></div><button onclick="openV29GoalEditor('${pid}')">+ Goal</button></div>${gs.slice(0,4).map(g=>`<div class="v31-goal"><div><b>${esc(g.title)}</b><small>${esc(g.status||'Active')}</small></div><div class="v31-bar"><i style="width:${Number(g.progress||0)}%"></i></div><strong>${Number(g.progress||0)}%</strong></div>`).join('')||'<p>No goals added yet.</p>'}</section>
     </div>`;

   if(tab==='plan') return `<div class="v31-card v31-full"><div class="v31-card-head"><div><small>TREATMENT PLAN</small><h3>${esc(pl?.title||'No active treatment plan')}</h3></div><button onclick="openV28PlanEditor('${pid}')">${pl?'Edit Plan':'+ Create Plan'}</button></div>${pl?`<div class="v31-plan-grid"><div><small>CLINICAL COMMENTS</small><p>${esc(pl.comments||'—')}</p></div><div><small>GOALS</small><p>${esc(pl.goals||'—')}</p></div><div><small>HOME ADVICE</small><p>${esc(pl.homeAdvice||'—')}</p></div><div><small>SESSIONS</small><p>${completed} completed · ${Math.max(0,Number(pl.plannedSessions||0)-completed)} remaining</p></div></div><div class="v31-tags">${(pl.areas||[]).map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:'<div class="v31-empty">Create the patient treatment plan to start the clinical journey.</div>'}</div>`;

   if(tab==='sessions') return `<div class="v31-section-head"><div><small>SESSIONS</small><h3>Appointments & Clinical Sessions</h3></div><button onclick="openV28AddSession('${pid}')">+ Add Session</button></div><div class="v31-session-list">${as.map(a=>{const n=(S().sessionNotes||[]).find(x=>String(x.appointmentId)===String(a.id));return `<article><div class="v31-session-date"><b>${esc(a.date)}</b><span>${esc(a.time||'')}</span></div><div><b>${esc(a.visitType||'Session')}</b><small>${esc(a.therapist||'')} · ${esc(a.room||'')} · ${esc(a.status||'')}</small><p>${esc(n?.subjective||n?.response||'No clinical note yet.')}</p></div><div class="v31-actions">${n?`<button onclick="previewV24SessionReport('${a.id}')">Report</button>`:''}<button class="primary" onclick="openV24ClinicalNote('${a.id}')">${n?'Open Note':'Start Session'}</button></div></article>`}).join('')||'<div class="v31-empty">No sessions scheduled.</div>'}</div>`;

   if(tab==='progress') return `<div class="v31-section-head"><div><small>PROGRESS</small><h3>Clinical Progress & Outcomes</h3></div><button onclick="openV30ProgressReview('${pid}')">Progress Review</button></div><div class="v31-kpis"><div><small>LATEST PAIN</small><b>${latest?latest.painScore+'/10':'—'}</b><span>${latest?.date||''}</span></div><div><small>SESSION PROGRESS</small><b>${latest?latest.progressScore+'%':'—'}</b><span>latest recorded</span></div><div><small>COMPLETED</small><b>${completed}</b><span>sessions</span></div><div><small>UPDATES</small><b>${us.length}</b><span>clinical updates</span></div></div><div class="v31-card v31-full"><div class="v31-card-head"><div><small>GOALS</small><h3>Outcome Tracking</h3></div><button onclick="openV29GoalEditor('${pid}')">+ Goal</button></div>${gs.map(g=>`<div class="v31-goal"><div><b>${esc(g.title)}</b><small>${esc(g.status||'')}</small></div><div class="v31-bar"><i style="width:${Number(g.progress||0)}%"></i></div><strong>${Number(g.progress||0)}%</strong></div>`).join('')||'<div class="v31-empty">No goals recorded.</div>'}</div>`;

   if(tab==='timeline') return typeof window.renderV29ClinicalTimeline==='function'?window.renderV29ClinicalTimeline(pid):'<div class="v31-empty">Clinical timeline unavailable.</div>';

   return `<div class="v31-section-head"><div><small>REPORTS</small><h3>Patient Clinical Reports</h3></div><button onclick="openV30ProgressReview('${pid}')">Progress Review</button></div><div class="v31-report-list">${ns.map(n=>`<button onclick="previewV24SessionReport('${n.appointmentId}')"><div><small>SESSION REPORT</small><b>${esc(n.date||'')}</b><span>${esc(n.therapist||'')}</span></div><strong>${Number(n.painScore||0)}/10</strong><i>›</i></button>`).join('')||'<div class="v31-empty">No reports available.</div>'}</div>`;
 }

 window.openV31PatientWorkspace=function(pid,tab='overview'){
   const p=patient(pid),w=workspace(); if(!p||!w)return;
   const page=document.getElementById('page-patients');
   [...page.children].forEach(x=>{if(x!==w)x.classList.add('v31-hidden-patient-list')});
   w.className='open';w.dataset.pid=pid;
   w.innerHTML=`<div class="v31-top"><button class="v31-back" onclick="closeV31PatientWorkspace()">← Patients</button><div class="v31-identity"><span>${esc(name(pid).split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())}</span><div><small>PATIENT RECORD</small><h2>${esc(name(pid))}</h2><p>${esc(p.phone||p.mobile||'No mobile')} · ${esc(p.id||'')}</p></div></div><div class="v31-top-actions"><button onclick="openV29ClinicalUpdate('${pid}')">+ Clinical Update</button><button onclick="openV28AddSession('${pid}')">+ Session</button><button class="gold" onclick="openV30ProgressReview('${pid}')">Progress Review</button></div></div><nav class="v31-tabs">${[['overview','Overview'],['plan','Treatment Plan'],['sessions','Sessions'],['progress','Progress'],['timeline','Clinical Timeline'],['reports','Reports']].map(([x,l])=>`<button class="${x===tab?'active':''}" onclick="v31Tab('${pid}','${x}',this)">${l}</button>`).join('')}</nav><main id="v31-body">${body(pid,tab)}</main>`;
 };

 window.v31Tab=function(pid,tab,btn){
   document.querySelectorAll('#v31-workspace .v31-tabs button').forEach(x=>x.classList.remove('active'));
   if(btn)btn.classList.add('active');
   else [...document.querySelectorAll('#v31-workspace .v31-tabs button')].find(x=>x.textContent.trim().toLowerCase().replace(/\s+/g,'')===tab.toLowerCase().replace(/\s+/g,''))?.classList.add('active');
   const b=document.getElementById('v31-body');if(b)b.innerHTML=body(pid,tab);
 };

 window.closeV31PatientWorkspace=function(){
   const w=document.getElementById('v31-workspace');if(w)w.className='';
   document.querySelectorAll('#page-patients .v31-hidden-patient-list').forEach(x=>x.classList.remove('v31-hidden-patient-list'));
 };

 function enhancePatients(){
   const page=document.getElementById('page-patients');if(!page)return;
   page.querySelectorAll('tbody tr').forEach(tr=>{
     if(tr.dataset.v31==='1')return;
     const text=tr.textContent||'';
     const p=(S().patients||[]).find(x=>text.includes(x.name||x.fullName||x.patientName||'')||text.includes(String(x.id)));
     if(!p)return;
     tr.dataset.v31='1';tr.classList.add('v31-patient-row');tr.title='Open Patient Record';
     tr.addEventListener('dblclick',e=>{if(!e.target.closest('button,a,input,select'))openV31PatientWorkspace(p.id)});
     const nameCell=[...tr.querySelectorAll('td')].find(td=>td.textContent.includes(p.name||p.fullName||p.patientName||''));
     if(nameCell){
       nameCell.classList.add('v31-name-cell');
       nameCell.addEventListener('click',e=>{if(!e.target.closest('button,a'))openV31PatientWorkspace(p.id)});
     }
   });
 }

 function css(){
   if(document.getElementById('v31-css'))return;
   const s=document.createElement('style');s.id='v31-css';s.textContent=`
   #v31-workspace{display:none}#v31-workspace.open{display:block;background:linear-gradient(180deg,#f7fafb,#edf4f5);min-height:720px;border-radius:15px;padding:14px}.v31-hidden-patient-list{display:none!important}
   .v31-top{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;background:#fff;border:1px solid #dfe8ea;border-radius:13px;padding:12px 14px}.v31-back{border:0;background:#eef4f5;color:#4e6970;border-radius:8px;padding:8px 10px;font-size:8px;font-weight:800}.v31-identity{display:flex;gap:9px;align-items:center}.v31-identity>span{width:43px;height:43px;border-radius:13px;background:linear-gradient(145deg,#174f5b,#286b78);color:#fff;display:grid;place-items:center;font-size:9px;font-weight:900}.v31-identity small{font-size:6px;color:#b48637;font-weight:900;letter-spacing:1px}.v31-identity h2{margin:1px 0;color:#31545c;font-size:17px}.v31-identity p{margin:0;font-size:7px;color:#8b999d}.v31-top-actions{display:flex;gap:6px}.v31-top-actions button{border:1px solid #d9e4e6;background:#fff;border-radius:8px;padding:7px 9px;font-size:7px;font-weight:800;color:#566f75}.v31-top-actions .gold{background:#c99a42;border-color:#c99a42;color:#fff}
   .v31-tabs{display:flex;gap:5px;margin:9px 0;background:#fff;border:1px solid #dfe8ea;border-radius:11px;padding:6px}.v31-tabs button{border:0;background:transparent;border-radius:7px;padding:7px 10px;font-size:7px;font-weight:800;color:#6a7f84}.v31-tabs button.active{background:#174f5b;color:#fff}
   #v31-body{min-height:580px}.v31-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:9px}.v31-kpis>div,.v31-card{background:#fff;border:1px solid #dfe8ea;border-radius:11px;padding:10px;box-shadow:0 4px 12px rgba(28,66,75,.035)}.v31-kpis small,.v31-kpis b,.v31-kpis span{display:block}.v31-kpis small,.v31-card small{font-size:6px;color:#a27a35;font-weight:900}.v31-kpis b{font-size:12px;color:#31545c;margin:3px 0}.v31-kpis span{font-size:6px;color:#89979c}.v31-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:9px}.v31-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.v31-card-head h3{margin:2px 0;color:#31545c;font-size:10px}.v31-card-head button,.v31-section-head button{border:1px solid #d8e3e5;background:#fff;border-radius:7px;padding:5px 7px;font-size:6px;font-weight:800;color:#587178}.v31-card p{font-size:8px;color:#63787e;line-height:1.5}.v31-date{font-size:6px;color:#9a9fa0}.v31-tags{display:flex;gap:4px;flex-wrap:wrap}.v31-tags span{background:#edf5f5;color:#567178;border-radius:99px;padding:3px 6px;font-size:6px}.v31-mini-row{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #edf1f2;padding:6px 0}.v31-mini-row b,.v31-mini-row small{display:block}.v31-mini-row b{font-size:7px;color:#36575f}.v31-mini-row small,.v31-mini-row span{font-size:6px;color:#89979c}.v31-goal{display:grid;grid-template-columns:minmax(110px,1fr) 1fr 35px;gap:8px;align-items:center;padding:6px 0;border-top:1px solid #edf1f2}.v31-goal b,.v31-goal small{display:block}.v31-goal b{font-size:7px;color:#36575f}.v31-goal small{font-size:6px;color:#89979c}.v31-bar{height:5px;background:#e9f0f1;border-radius:99px;overflow:hidden}.v31-bar i{display:block;height:100%;background:linear-gradient(90deg,#174f5b,#c99a42)}.v31-goal strong{font-size:7px;color:#31545c}.v31-full{margin-bottom:9px}.v31-plan-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:9px 0}.v31-plan-grid>div{background:#f8fbfb;border-radius:8px;padding:8px}.v31-plan-grid p{margin:4px 0}
   .v31-section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.v31-section-head small{font-size:6px;color:#a27a35;font-weight:900}.v31-section-head h3{margin:2px 0;color:#31545c}.v31-session-list{display:grid;gap:6px}.v31-session-list article{display:grid;grid-template-columns:85px 1fr auto;gap:9px;align-items:center;background:#fff;border:1px solid #dfe8ea;border-radius:10px;padding:9px}.v31-session-date b,.v31-session-date span,.v31-session-list article>div:nth-child(2)>b,.v31-session-list article>div:nth-child(2)>small{display:block}.v31-session-date b,.v31-session-list article>div:nth-child(2)>b{font-size:8px;color:#36575f}.v31-session-date span,.v31-session-list article>div:nth-child(2)>small{font-size:6px;color:#89979c}.v31-session-list p{font-size:7px;color:#687d82;margin:3px 0}.v31-actions{display:flex;gap:4px}.v31-actions button{border:1px solid #d8e3e5;background:#fff;border-radius:7px;padding:6px 7px;font-size:6px;font-weight:800}.v31-actions .primary{background:#174f5b;color:#fff;border-color:#174f5b}.v31-report-list{display:grid;gap:6px}.v31-report-list>button{display:grid;grid-template-columns:1fr auto 12px;align-items:center;text-align:left;background:#fff;border:1px solid #dfe8ea;border-radius:9px;padding:9px}.v31-report-list small,.v31-report-list b,.v31-report-list span{display:block}.v31-report-list small{font-size:6px;color:#a27a35}.v31-report-list b{font-size:8px;color:#36575f}.v31-report-list span{font-size:6px;color:#89979c}.v31-report-list strong{font-size:8px;color:#31545c}.v31-empty{text-align:center;padding:30px;color:#8b999d;font-size:8px}.v31-patient-row{cursor:default}.v31-name-cell{cursor:pointer!important;color:#175765!important;font-weight:800}.v31-name-cell:hover{text-decoration:underline}
   @media(max-width:850px){.v31-top{grid-template-columns:1fr}.v31-top-actions{flex-wrap:wrap}.v31-tabs{overflow:auto}.v31-kpis{grid-template-columns:1fr 1fr}.v31-grid,.v31-plan-grid{grid-template-columns:1fr}.v31-session-list article{grid-template-columns:1fr}}
   `;document.head.appendChild(s);
 }

 function init(){
   css();setTimeout(enhancePatients,300);
   const o=new MutationObserver(()=>{clearTimeout(window.__v31);window.__v31=setTimeout(enhancePatients,70)});
   o.observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();


/* =========================================================
   myAIMS V32 - PATIENT PROFILE ROUTING FIX
   Fixes the old V6 Patient 360 popup still opening from Profile.
   Now:
   - Profile button -> V31 Patient Workspace
   - Patient name -> V31 Patient Workspace
   - V22 Patient Profile action -> V31 Patient Workspace
   - Old 360 modal is suppressed
   - Financial summary from old 360 is preserved in Overview
   ========================================================= */
(function(){
  const S=()=>window.state||window.appState||{};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function resolvePatient(ref){
    const list=S().patients||[];

    if(typeof ref==='number' && list[ref]) return {patient:list[ref],index:ref};

    if(typeof ref==='string'){
      const byId=list.findIndex(p=>String(p.id)===String(ref));
      if(byId>=0) return {patient:list[byId],index:byId};

      const n=Number(ref);
      if(Number.isInteger(n) && list[n]) return {patient:list[n],index:n};
    }

    return {patient:null,index:-1};
  }

  function suppressOld360(){
    const old=document.getElementById('patientProfile360');
    if(old){
      old.style.display='none';
      old.setAttribute('aria-hidden','true');
    }
  }

  function financials(p){
    try{
      if(typeof patientFinancials==='function') return patientFinancials(p.name);
    }catch(e){}

    const invoices=(S().invoices||[]).filter(x=>x.patient===p.name || String(x.patientId)===String(p.id));
    const receipts=(S().receipts||[]).filter(x=>x.patient===p.name || String(x.patientId)===String(p.id));
    const appointments=(S().appointments||[]).filter(x=>x.patient===p.name || String(x.patientId)===String(p.id));

    const invoiceAmount=x=>Number(x.amount||x.total||0);
    const patientShare=x=>{
      try{ if(typeof invPatientShare==='function') return Number(invPatientShare(x)||0); }catch(e){}
      return Number(x.patientShare ?? x.amount ?? x.total ?? 0);
    };
    const balance=x=>{
      try{ if(typeof invBalance==='function') return Number(invBalance(x)||0); }catch(e){}
      return Math.max(0,patientShare(x)-Number(x.paid||0));
    };

    return {
      invoices,receipts,appointments,
      invoiced:invoices.reduce((a,x)=>a+invoiceAmount(x),0),
      patientShare:invoices.reduce((a,x)=>a+patientShare(x),0),
      collected:receipts.reduce((a,x)=>a+Number(x.amount||0),0),
      outstanding:invoices.reduce((a,x)=>a+balance(x),0)
    };
  }

  function moneyV32(v){
    try{ if(typeof money==='function') return money(Number(v||0)); }catch(e){}
    return 'BHD '+Number(v||0).toFixed(3);
  }

  function decorateWorkspace(patientId){
    const w=document.getElementById('v31-workspace');
    const body=document.getElementById('v31-body');
    if(!w?.classList.contains('open') || !body) return;

    const p=(S().patients||[]).find(x=>String(x.id)===String(patientId));
    if(!p) return;

    const active=[...w.querySelectorAll('.v31-tabs button')].find(x=>x.classList.contains('active'));
    if((active?.textContent||'').trim()!=='Overview') return;
    if(body.querySelector('.v32-financial-summary')) return;

    const f=financials(p);

    const box=document.createElement('section');
    box.className='v32-financial-summary';
    box.innerHTML=`
      <div class="v32-fin-head">
        <div>
          <small>FINANCIAL SUMMARY</small>
          <h3>Patient Account</h3>
        </div>
        <div class="v32-fin-actions">
          <button onclick="v32AddInvoice('${p.id}')">+ Invoice</button>
          ${Number(f.outstanding||0)>0?`<button onclick="v32RecordPayment('${p.id}')">Record Payment</button>`:''}
          <button onclick="v32PrintStatement('${p.id}')">Print Statement</button>
        </div>
      </div>

      <div class="v32-fin-kpis">
        <div><small>TOTAL INVOICED</small><b>${moneyV32(f.invoiced)}</b></div>
        <div><small>PATIENT SHARE</small><b>${moneyV32(f.patientShare)}</b></div>
        <div><small>COLLECTED</small><b>${moneyV32(f.collected)}</b></div>
        <div><small>OUTSTANDING</small><b>${moneyV32(f.outstanding)}</b></div>
      </div>
    `;

    const firstGrid=body.querySelector('.v31-grid');
    if(firstGrid) firstGrid.insertAdjacentElement('beforebegin',box);
    else body.prepend(box);
  }

  // Critical fix: replace old V6 routing completely.
  window.openPatientProfile=function(ref){
    suppressOld360();
    const r=resolvePatient(ref);
    if(!r.patient) return;

    if(typeof window.openV31PatientWorkspace==='function'){
      window.openV31PatientWorkspace(r.patient.id,'overview');
      setTimeout(()=>decorateWorkspace(r.patient.id),40);
    }
  };

  window.v32PrintStatement=function(patientId){
    const r=resolvePatient(patientId);
    if(!r.patient) return;
    if(typeof window.printPatientStatement==='function') window.printPatientStatement(r.index);
  };

  window.v32AddInvoice=function(patientId){
    const r=resolvePatient(patientId);
    if(!r.patient) return;

    try{
      if(typeof patientQuickAction==='function'){
        patientQuickAction(r.index,'invoice');
        return;
      }
    }catch(e){}

    const modal=document.querySelector('#invoiceModal,.invoice-modal');
    if(modal) modal.classList.add('open');
  };

  window.v32RecordPayment=function(patientId){
    const r=resolvePatient(patientId);
    if(!r.patient) return;

    try{
      if(typeof patientQuickAction==='function'){
        patientQuickAction(r.index,'payment');
        return;
      }
    }catch(e){}
  };

  function forceProfileButtons(){
    const page=document.getElementById('page-patients');
    if(!page) return;

    page.querySelectorAll('tbody tr').forEach(tr=>{
      const text=tr.textContent||'';
      const p=(S().patients||[]).find(x=>{
        const nm=x.name||x.fullName||x.patientName||'';
        return (nm && text.includes(nm)) || text.includes(String(x.id));
      });
      if(!p) return;

      const cells=[...tr.querySelectorAll('td')];
      const nameCell=cells.find(td=>(td.textContent||'').includes(p.name||p.fullName||p.patientName||''));

      if(nameCell && nameCell.dataset.v32!=='1'){
        nameCell.dataset.v32='1';
        nameCell.style.cursor='pointer';
        nameCell.addEventListener('click',function(e){
          if(e.target.closest('button')){
            const txt=(e.target.textContent||'').trim().toLowerCase();
            if(txt==='edit' || txt==='delete' || txt==='تعديل' || txt==='حذف') return;
          }
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          openPatientProfile(p.id);
        },true);
      }

      tr.querySelectorAll('button').forEach(btn=>{
        const txt=(btn.textContent||'').trim().toLowerCase();
        const isProfile=txt==='profile' || txt==='الملف';
        if(!isProfile || btn.dataset.v32==='1') return;

        btn.dataset.v32='1';
        btn.removeAttribute('onclick');
        btn.addEventListener('click',function(e){
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          openPatientProfile(p.id);
        },true);
      });
    });
  }

  // Also repair V31 tab changes so financial summary is re-added on Overview.
  const oldV31Tab=window.v31Tab;
  if(typeof oldV31Tab==='function'){
    window.v31Tab=function(pid,tab,btn){
      oldV31Tab(pid,tab,btn);
      if(tab==='overview') setTimeout(()=>decorateWorkspace(pid),20);
    };
  }

  // Repair calls from V22 patient card that may pass patient ID.
  document.addEventListener('click',function(e){
    const btn=e.target.closest('button');
    if(!btn) return;

    const txt=(btn.textContent||'').trim().toLowerCase();
    if(txt!=='patient profile' && txt!=='clinical journey') return;

    const shade=document.getElementById('v22-card-shade');
    if(!shade?.classList.contains('open')) return;

    const html=shade.innerHTML||'';
    let m=html.match(/openPatientProfile\('([^']+)'\)/);
    if(!m) m=html.match(/openPatientProfile\((\d+)\)/);
    if(!m) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    suppressOld360();

    const r=resolvePatient(m[1]);
    if(r.patient){
      if(typeof window.closeV22PatientCard==='function') window.closeV22PatientCard();
      openPatientProfile(r.patient.id);
    }
  },true);

  function css(){
    if(document.getElementById('v32-css')) return;
    const st=document.createElement('style');
    st.id='v32-css';
    st.textContent=`
      #patientProfile360{display:none!important}
      .v32-financial-summary{background:linear-gradient(135deg,#fff,#f8fbfb);border:1px solid #dfe8ea;border-radius:11px;padding:10px;margin-bottom:9px;box-shadow:0 4px 12px rgba(28,66,75,.035)}
      .v32-fin-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:9px}
      .v32-fin-head small{font-size:6px;color:#a27a35;font-weight:900;letter-spacing:.8px}
      .v32-fin-head h3{margin:2px 0;color:#31545c;font-size:10px}
      .v32-fin-actions{display:flex;gap:5px;flex-wrap:wrap}
      .v32-fin-actions button{border:1px solid #d8e3e5;background:#fff;border-radius:7px;padding:5px 7px;font-size:6px;font-weight:800;color:#587178}
      .v32-fin-actions button:first-child{background:#c99a42;border-color:#c99a42;color:#fff}
      .v32-fin-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
      .v32-fin-kpis>div{background:#f7fafb;border:1px solid #e2eaec;border-radius:8px;padding:8px}
      .v32-fin-kpis small,.v32-fin-kpis b{display:block}
      .v32-fin-kpis small{font-size:6px;color:#89979c;font-weight:800}
      .v32-fin-kpis b{font-size:10px;color:#31545c;margin-top:3px}
      @media(max-width:760px){.v32-fin-head{align-items:flex-start;flex-direction:column}.v32-fin-kpis{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(st);
  }

  function repair(){
    suppressOld360();
    forceProfileButtons();

    const w=document.getElementById('v31-workspace');
    if(w?.classList.contains('open') && w.dataset.pid){
      decorateWorkspace(w.dataset.pid);
    }
  }

  function init(){
    css();
    setTimeout(repair,250);

    const obs=new MutationObserver(()=>{
      clearTimeout(window.__v32repair);
      window.__v32repair=setTimeout(repair,50);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();


/* =========================================================
   myAIMS V33 - LARGER READABLE TYPOGRAPHY
   Improves readability across the new Patient Workspace.
   Focus: larger text without breaking layout.
   ========================================================= */
(function(){
  function css(){
    if(document.getElementById('v33-typography-css')) return;

    const st=document.createElement('style');
    st.id='v33-typography-css';
    st.textContent=`
      /* ================================
         GLOBAL PATIENT WORKSPACE TYPE
         ================================ */
      #v31-workspace{
        font-size:14px !important;
      }

      /* Patient header */
      #v31-workspace .v31-identity small{
        font-size:10px !important;
        letter-spacing:1.2px !important;
      }
      #v31-workspace .v31-identity h2{
        font-size:24px !important;
        line-height:1.2 !important;
        margin:3px 0 !important;
      }
      #v31-workspace .v31-identity p{
        font-size:12px !important;
        line-height:1.4 !important;
      }
      #v31-workspace .v31-identity>span{
        width:52px !important;
        height:52px !important;
        font-size:14px !important;
      }

      /* Main top actions */
      #v31-workspace .v31-back,
      #v31-workspace .v31-top-actions button{
        font-size:12px !important;
        padding:10px 14px !important;
        min-height:38px !important;
      }

      /* Tabs */
      #v31-workspace .v31-tabs{
        gap:7px !important;
        padding:8px !important;
      }
      #v31-workspace .v31-tabs button{
        font-size:12px !important;
        padding:10px 15px !important;
        line-height:1.2 !important;
      }

      /* KPI cards */
      #v31-workspace .v31-kpis>div{
        padding:14px !important;
        min-height:88px !important;
      }
      #v31-workspace .v31-kpis small{
        font-size:9px !important;
        line-height:1.3 !important;
      }
      #v31-workspace .v31-kpis b{
        font-size:18px !important;
        margin:6px 0 4px !important;
        line-height:1.2 !important;
      }
      #v31-workspace .v31-kpis span{
        font-size:11px !important;
        line-height:1.35 !important;
      }

      /* Card headings and content */
      #v31-workspace .v31-card{
        padding:15px !important;
      }
      #v31-workspace .v31-card small,
      #v31-workspace .v31-section-head small{
        font-size:9px !important;
      }
      #v31-workspace .v31-card-head h3,
      #v31-workspace .v31-section-head h3{
        font-size:17px !important;
        line-height:1.3 !important;
        margin:4px 0 6px !important;
      }
      #v31-workspace .v31-card p{
        font-size:13px !important;
        line-height:1.6 !important;
      }
      #v31-workspace .v31-date{
        font-size:10px !important;
      }

      /* Card buttons */
      #v31-workspace .v31-card-head button,
      #v31-workspace .v31-section-head button{
        font-size:11px !important;
        padding:8px 12px !important;
        min-height:34px !important;
      }

      /* Tags */
      #v31-workspace .v31-tags{
        gap:6px !important;
      }
      #v31-workspace .v31-tags span{
        font-size:10px !important;
        padding:5px 9px !important;
      }

      /* Recent sessions mini rows */
      #v31-workspace .v31-mini-row{
        padding:10px 0 !important;
      }
      #v31-workspace .v31-mini-row b{
        font-size:12px !important;
      }
      #v31-workspace .v31-mini-row small,
      #v31-workspace .v31-mini-row span{
        font-size:10px !important;
      }

      /* Goals */
      #v31-workspace .v31-goal{
        padding:10px 0 !important;
        gap:10px !important;
      }
      #v31-workspace .v31-goal b{
        font-size:12px !important;
      }
      #v31-workspace .v31-goal small{
        font-size:10px !important;
      }
      #v31-workspace .v31-goal strong{
        font-size:12px !important;
      }
      #v31-workspace .v31-bar{
        height:7px !important;
      }

      /* Treatment plan details */
      #v31-workspace .v31-plan-grid>div{
        padding:12px !important;
      }
      #v31-workspace .v31-plan-grid small{
        font-size:9px !important;
      }
      #v31-workspace .v31-plan-grid p{
        font-size:13px !important;
        line-height:1.55 !important;
      }

      /* Session list */
      #v31-workspace .v31-session-list article{
        grid-template-columns:110px 1fr auto !important;
        padding:13px !important;
        gap:13px !important;
      }
      #v31-workspace .v31-session-date b,
      #v31-workspace .v31-session-list article>div:nth-child(2)>b{
        font-size:13px !important;
      }
      #v31-workspace .v31-session-date span,
      #v31-workspace .v31-session-list article>div:nth-child(2)>small{
        font-size:10px !important;
      }
      #v31-workspace .v31-session-list p{
        font-size:12px !important;
        line-height:1.5 !important;
      }
      #v31-workspace .v31-actions button{
        font-size:10px !important;
        padding:8px 10px !important;
      }

      /* Reports */
      #v31-workspace .v31-report-list>button{
        padding:13px !important;
      }
      #v31-workspace .v31-report-list small{
        font-size:9px !important;
      }
      #v31-workspace .v31-report-list b{
        font-size:13px !important;
      }
      #v31-workspace .v31-report-list span{
        font-size:10px !important;
      }
      #v31-workspace .v31-report-list strong{
        font-size:12px !important;
      }

      /* Financial summary - V32 */
      #v31-workspace .v32-financial-summary{
        padding:15px !important;
      }
      #v31-workspace .v32-fin-head small{
        font-size:9px !important;
      }
      #v31-workspace .v32-fin-head h3{
        font-size:17px !important;
        margin:4px 0 !important;
      }
      #v31-workspace .v32-fin-actions button{
        font-size:11px !important;
        padding:8px 12px !important;
      }
      #v31-workspace .v32-fin-kpis>div{
        padding:12px !important;
        min-height:70px !important;
      }
      #v31-workspace .v32-fin-kpis small{
        font-size:9px !important;
      }
      #v31-workspace .v32-fin-kpis b{
        font-size:16px !important;
        margin-top:6px !important;
      }

      /* Clinical Timeline V29 when rendered inside workspace */
      #v31-workspace .v29-timeline-top small{
        font-size:9px !important;
      }
      #v31-workspace .v29-timeline-top h3{
        font-size:17px !important;
      }
      #v31-workspace .v29-timeline-top button{
        font-size:11px !important;
        padding:8px 12px !important;
      }
      #v31-workspace .v29-time-head small{
        font-size:9px !important;
      }
      #v31-workspace .v29-time-head h4{
        font-size:14px !important;
      }
      #v31-workspace .v29-time-head>span{
        font-size:10px !important;
      }
      #v31-workspace .v29-time-card p{
        font-size:12px !important;
        line-height:1.55 !important;
      }
      #v31-workspace .v29-pain-chip{
        font-size:10px !important;
        padding:5px 8px !important;
      }
      #v31-workspace .v29-time-actions button{
        font-size:10px !important;
        padding:7px 9px !important;
      }

      /* Empty states */
      #v31-workspace .v31-empty,
      #v31-workspace .v29-empty,
      #v31-workspace .v30-empty{
        font-size:12px !important;
        line-height:1.5 !important;
      }

      /* General patient table readability too */
      #page-patients table{
        font-size:13px !important;
      }
      #page-patients th{
        font-size:11px !important;
        padding:13px 12px !important;
      }
      #page-patients td{
        font-size:13px !important;
        padding:14px 12px !important;
      }
      #page-patients td button{
        font-size:11px !important;
        padding:7px 10px !important;
      }

      /* Larger workspace spacing so text does not feel cramped */
      #v31-workspace.open{
        padding:18px !important;
      }
      #v31-workspace .v31-top{
        padding:15px 17px !important;
      }
      #v31-workspace .v31-grid{
        gap:12px !important;
        margin-bottom:12px !important;
      }
      #v31-workspace .v31-kpis{
        gap:10px !important;
        margin-bottom:12px !important;
      }

      /* Responsive */
      @media(max-width:900px){
        #v31-workspace .v31-identity h2{
          font-size:21px !important;
        }
        #v31-workspace .v31-tabs button{
          font-size:11px !important;
          padding:9px 12px !important;
        }
      }

      @media(max-width:760px){
        #v31-workspace{
          font-size:13px !important;
        }
        #v31-workspace .v31-kpis{
          grid-template-columns:1fr 1fr !important;
        }
        #v31-workspace .v32-fin-kpis{
          grid-template-columns:1fr 1fr !important;
        }
        #v31-workspace .v31-session-list article{
          grid-template-columns:1fr !important;
        }
      }
    `;
    document.head.appendChild(st);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',css);
  }else{
    css();
  }
})();
