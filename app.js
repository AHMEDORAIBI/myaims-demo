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
