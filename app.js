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
