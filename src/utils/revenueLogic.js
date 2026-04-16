import { read, utils } from 'xlsx';

export const parseAmount = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(val.toString().replace(/[^0-9.-]+/g, '')) || 0;
};

export const parseDateInfo = (val) => {
  let dateObj = null;
  if (typeof val === 'number') {
    dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
  } else if (typeof val === 'string') {
    const parts = val.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (parts) dateObj = new Date(`${parts[3]}-${parts[2]}-${parts[1]}`);
    else dateObj = new Date(val);
  }
  if (!dateObj || isNaN(dateObj.getTime())) return { display: val || '', monthYear: 'Unknown', key: null };
  const display = dateObj.toLocaleDateString('en-GB');
  const monthYear = dateObj.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;
  return { display, monthYear, key, raw: dateObj };
};

export const isExcluded = (serviceName, serviceType) => {
  if (!serviceName) return false;
  const n = serviceName.toString().toLowerCase();
  const st = (serviceType || '').toLowerCase();
  if (['laboratory','radiology','pharmacy','consumables','ambulance'].some(s => st.includes(s))) return true;
  const x = [
    'x-ray','x ray','xray','chest x','ct scan','ncct','cect','hrct','mri','mammography','opg',
    'ultrasound','usg','sonography','doppler','echo','ecg','tmt','holter','pft','uroflowmetry','eeg','emg','ncv','audiometry',
    'injection','inj ','im/iv','cannula','cath','catheter','ryle tube','nebuliser','nebulization','steam','enema','physiotherapy',
    'iv set','iv fluid','infusion','cut down',
    'registration','admission','file charge','card','renewal','bed charge','room rent','nursing','dmo','rmo',
    'diet','food','beverage','mlc','biomedical','service charge',
    'blood','urine','stool','culture','biospy','pathology','sample','test','profile',
    'sugar','glucose','hemoglobin','cbc','platelet','creatinine',
    'drug','medicine','tablet','cap ','syringe','gloves','mask','cotton','bandage',
  ];
  return x.some(k => n.includes(k));
};

export const processIPD = (sheet, fileName) => {
  const raw = utils.sheet_to_json(sheet, { header: 1 });
  let hRow = -1;
  for (let i = 0; i < 20; i++) {
    const r = (raw[i] || []).map(c => c != null ? c.toString().trim() : '');
    if (r.includes('Deposit') || r.includes('PatientName')) { hRow = i; break; }
  }
  if (hRow === -1) hRow = 3;
  const headers = raw[hRow];
  const col = {};
  if (headers) headers.forEach((h, i) => { if (h) col[h.toString().trim()] = i; });

  return raw.slice(hRow + 1).map((row) => {
    const patient   = row[2]  || row[col['PatientName']];
    const disDate   = row[10] || row[col['DisDate']];
    const deposit   = parseAmount(row[17] || row[col['Deposit']]);
    const procedure = (row[19] || row[col['remarks']] || 'IPD Treatment').toString();
    const billAmt   = parseAmount(row[15] || row[col['BillAmount']]);
    const discount  = parseAmount(row[16] || row[col['discount']]);
    const mobile    = (row[5]  || row[col['MobileNo']] || '').toString();
    const ward      = (row[6]  || row[col['Ward']] || '').toString();
    const billNo    = (row[13] || row[col['BillNo']] || '').toString();

    if (!patient || !disDate) return null;

    const { display, monthYear, key } = parseDateInfo(disDate);
    const grossAmount = deposit;

    const sig = `ipd|${disDate}|${patient}|${procedure}|${grossAmount}`;
    const idHash = btoa(unescape(encodeURIComponent(sig))).replace(/[^a-zA-Z0-9]/g, '');

    return {
      id: `ipd-${idHash}`, date: display, monthYear, dateKey: key,
      patientName: patient.toString().trim(),
      serviceName: procedure, category: 'IPD',
      grossAmount, calculatedShare: grossAmount * 0.20,
      discount, billAmount: billAmt,
      sourceFile: fileName, sourceType: 'IPD',
      isExcluded: false, mobile, ward, billNo, payMode: '',
    };
  }).filter(r => r !== null && r.grossAmount > 0);
};

export const processOPD = (sheet, fileName) => {
  const raw = utils.sheet_to_json(sheet, { header: 1 });
  let hRow = 0;
  for (let i = 0; i < 5; i++) {
    const r = (raw[i] || []).map(c => c != null ? c.toString().trim() : '');
    if (r.includes('OpNo') || r.includes('BillNo')) { hRow = i; break; }
  }

  return raw.slice(hRow + 1).map((row) => {
    // OPD column mapping (DoctorWiseOpdProcedureReport):
    // 0=OpNo, 1=UhidNo, 2=BillNo, 3=BillDate(serial),
    // 4=Timein, 5=PatientName, 6=MobileNo, 7=Add1,
    // 8=DocID, 9=DoctorName, 10=SponsorId, 11=Sponsor_Name,
    // 12=SerId, 13=Ser_Name, 14=Typ, 15=ServiceType(Consultancy/Services/Laboratory) ← KEY
    // 16=Qty, 17=Rate, 18=Amount, 19=Discount, 20=NetAmount, 21=PayMode, 22=Remarks
    const patient   = row[5];
    const mobile    = row[6];
    const billDate  = row[3];
    const docName   = row[9];
    const sponsor   = row[11];
    const svcType   = row[15]; // ServiceType: Consultancy / Services / Laboratory ← PRIMARY
    const netAmt    = parseAmount(row[20]);
    const payMode   = row[21];
    const remarks   = row[22]; // actual procedure description
    const opNo      = row[0];
    const billNo    = row[2];

    if (!patient) return null;

    const sTypeLower = (svcType || '').toLowerCase();

    let category = 'OPD Procedure';
    let sharePct = 0.50;

    if (sTypeLower.includes('consult')) {
      category = 'OPD Consultation'; sharePct = 0.70;
    } else if (sTypeLower.includes('laboratory') || sTypeLower.includes('lab')) {
      category = 'Investigation'; sharePct = 0;
    } else if (sTypeLower.includes('service')) {
      // Services: check if excluded by name
      if (isExcluded(remarks, svcType)) { category = 'Investigation'; sharePct = 0; }
      else { category = 'OPD Procedure'; sharePct = 0.50; }
    }

    const serviceName = (remarks || svcType || 'Unknown').toString().trim();
    const { display, monthYear, key } = parseDateInfo(billDate);

    const sig = `opd|${billDate}|${patient}|${serviceName}|${netAmt}`;
    const idHash = btoa(unescape(encodeURIComponent(sig))).replace(/[^a-zA-Z0-9]/g, '');

    return {
      id: `opd-${idHash}`, date: display, monthYear, dateKey: key,
      patientName: patient.toString().trim(),
      mobile: mobile ? mobile.toString() : '',
      doctorName: docName ? docName.toString().trim() : '',
      sponsor: sponsor ? sponsor.toString().trim() : '',
      serviceName, category,
      grossAmount: netAmt, calculatedShare: netAmt * sharePct,
      sourceFile: fileName,
      sourceType: category === 'OPD Consultation' ? 'OPD_Consult' : 'OPD_Procedure',
      isExcluded: category === 'Investigation',
      payMode: payMode ? payMode.toString() : '',
      opNo: opNo ? opNo.toString() : '', billNo: billNo ? billNo.toString() : '',
    };
  }).filter(r => r !== null);
};

export const processFile = async (file) => {
  const buf = await file.arrayBuffer();
  const wb = read(new Uint8Array(buf), { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = utils.sheet_to_json(sheet, { header: 1 });
  let isIPD = false;
  for (let i = 0; i < 15; i++) {
    if ((raw[i] || []).join(' ').toLowerCase().includes('deposit')) { isIPD = true; break; }
  }
  return isIPD ? processIPD(sheet, file.name) : processOPD(sheet, file.name);
};
