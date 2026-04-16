import { read, utils } from 'xlsx';

// ── Helpers ────────────────────────────────────────────────────────────────

export const parseAmount = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleanStr = val.toString().replace(/[^0-9.-]+/g, '');
  return parseFloat(cleanStr) || 0;
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
  if (!dateObj || isNaN(dateObj.getTime())) return { display: val || '', monthYear: 'Unknown' };
  const display = dateObj.toLocaleDateString('en-GB');
  const monthYear = dateObj.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  return { display, monthYear, raw: dateObj };
};

// ── Exclusion Logic (mirrors Revenue Evaluator) ───────────────────────────

export const isExcluded = (serviceName, serviceType) => {
  if (!serviceName) return false;
  const n = serviceName.toString().toLowerCase();
  const st = (serviceType || '').toLowerCase();
  if (['laboratory', 'radiology', 'pharmacy', 'consumables', 'ambulance'].includes(st)) return true;
  const x = [
    'x-ray','x ray','xray','chest x','ct scan','ncct','cect','hrct','mri','mr scan','mammography','opg',
    'ultrasound','usg','sonography','doppler','echo','ecg','tmt','holter','pft','uroflowmetry','eeg','emg','ncv','audiometry',
    'injection','inj ','im/iv','cannula','cath','catheter','ryle tube','nebuliser','nebulization','steam','enema','physiotherapy',
    'iv set','iv fluid','infusion','cut down','suture removal charge',
    'registration','admission','file charge','card','renewal','bed charge','room rent','nursing','dmo','rmo','ambulance',
    'diet','food','beverage','mlc','biomedical','service charge',
    'blood','urine','stool','culture','biospy','pathology','sample','test','profile','sugar','glucose',
    'hemoglobin','cbc','platelet','creatinine',
    'drug','medicine','tablet','cap ','syringe','gloves','mask','cotton','bandage',
  ];
  return x.some(k => n.includes(k));
};

// ── IPD Parser ────────────────────────────────────────────────────────────

export const processIPD = (sheet, fileName) => {
  const raw = utils.sheet_to_json(sheet, { header: 1 });
  let hRow = -1;
  for (let i = 0; i < 20; i++) {
    const r = (raw[i] || []).map(c => c ? c.toString().trim() : '');
    if (r.includes('Deposit') || r.includes('PatientName')) { hRow = i; break; }
  }
  if (hRow === -1) hRow = 3;
  const headers = raw[hRow];
  const col = {};
  if (headers) headers.forEach((h, i) => { if (h) col[h.toString().trim()] = i; });

  return raw.slice(hRow + 1).map((row, idx) => {
    const patient = row[col['PatientName']] || row[2];
    const dateVal = row[col['BillDate']] || row[13];
    const deposit = parseAmount(row[col['Deposit']] || row[16]);
    const serviceName = (row[col['remarks']] || row[18] || 'IPD Treatment').toString();
    const grossAmount = deposit; // deposit = net (BillAmt - Disc)
    if (!dateVal || !patient) return null;
    const { display, monthYear } = parseDateInfo(dateVal);
    const sig = `${dateVal}|${patient}|${serviceName}|${grossAmount}`;
    const idHash = btoa(unescape(encodeURIComponent(sig))).replace(/[^a-zA-Z0-9]/g, '');
    return {
      id: `ipd-${idHash}`,
      date: display, monthYear,
      patientName: patient,
      serviceName,
      category: 'IPD',
      grossAmount,
      calculatedShare: grossAmount * 0.20,
      sourceFile: fileName,
      sourceType: 'IPD',
      isExcluded: false,
    };
  }).filter(r => r !== null && r.grossAmount > 0);
};

// ── OPD Parser ────────────────────────────────────────────────────────────

export const processOPD = (sheet, fileName) => {
  const raw = utils.sheet_to_json(sheet, { header: 1 });
  // Find header row (has OpNo in col A)
  let hRow = 0;
  for (let i = 0; i < 5; i++) {
    const r = (raw[i] || []).map(c => c ? c.toString().trim() : '');
    if (r.includes('OpNo') || r.includes('BillNo')) { hRow = i; break; }
  }
  const dataRows = raw.slice(hRow + 1);

  return dataRows.map((row, idx) => {
    // Confirmed column mapping (1-col shift from header):
    // A=OpNo, D=BillDate(serial), E=PatientName, F=Mobile, H=DoctorName,
    // J=Sponsor_Name, N=Typ(C/S/L or billno), O=ServiceType(Consultancy/Services/Lab),
    // W=Remarks(service name), U=NetAmount, V=PayMode
    const patient  = row[4];   // col E
    const mobile   = row[5];   // col F
    const dateVal  = row[3];   // col D
    const docName  = row[7];   // col H
    const sponsor  = row[9];   // col J
    const svcType  = row[14];  // col O = ServiceType (Consultancy/Services/Laboratory)
    const remarks  = row[22];  // col W = Remarks (actual service name)
    const netAmt   = parseAmount(row[20]); // col U = NetAmount
    const payMode  = row[21];  // col V = PayMode
    const typCode  = row[13];  // col N = Typ code

    if (!patient) return null;

    const sTypeLower = (svcType || '').toLowerCase();
    const isConsult = sTypeLower.includes('consult');
    const isLab     = sTypeLower.includes('laboratory') || sTypeLower.includes('lab');
    const isService = sTypeLower.includes('service') || sTypeLower.includes('dressing') || sTypeLower.includes('suturing');
    const excluded  = isExcluded(remarks, svcType);

    let category = 'OPD Procedure';
    let sharePct = 0.50;
    if (excluded) { category = 'Investigation'; sharePct = 0; }
    else if (isConsult) { category = 'OPD Consultation'; sharePct = 0.70; }
    else if (isLab) { category = 'Investigation'; sharePct = 0; }
    else if (isService) { category = 'OPD Procedure'; sharePct = 0.50; }

    const { display, monthYear } = parseDateInfo(dateVal);
    const sig = `opd|${dateVal}|${patient}|${remarks}|${netAmt}`;
    const idHash = btoa(unescape(encodeURIComponent(sig))).replace(/[^a-zA-Z0-9]/g, '');

    return {
      id: `opd-${idHash}`,
      date: display, monthYear,
      patientName: patient,
      mobile: mobile || '',
      doctorName: docName || '',
      sponsor: sponsor || '',
      serviceName: remarks || svcType || 'Unknown',
      category,
      grossAmount: netAmt,
      calculatedShare: netAmt * sharePct,
      sourceFile: fileName,
      sourceType: isConsult ? 'OPD_Consult' : 'OPD_Procedure',
      isExcluded: excluded,
      payMode: payMode || '',
    };
  }).filter(r => r !== null);
};

// ── Auto-detect file type & process ─────────────────────────────────────

export const processFile = async (file) => {
  const buf = await file.arrayBuffer();
  const wb = read(new Uint8Array(buf), { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];

  // Detect IPD: look for 'Deposit' in first 15 rows
  const raw = utils.sheet_to_json(sheet, { header: 1 });
  let isIPD = false;
  for (let i = 0; i < 15; i++) {
    if ((raw[i] || []).join(' ').toLowerCase().includes('deposit')) { isIPD = true; break; }
  }
  return isIPD ? processIPD(sheet, file.name) : processOPD(sheet, file.name);
};
