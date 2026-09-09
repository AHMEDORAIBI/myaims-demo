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

enhanceInvoiceForm();
normalize();
render();
