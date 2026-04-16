import React from 'react';
import { ChevronDown, ChevronUp, Users, TrendingUp, Stethoscope, FlaskConical } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const CatBlock = ({ label, amount, count, color, darkColor, icon: Icon }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${color}`}>
    <Icon className={`w-4 h-4 ${darkColor}`} />
    <div className="flex-1 min-w-0">
      <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
      <p className={`text-sm font-bold ${darkColor} truncate`}>{fmt(amount)}</p>
    </div>
    <span className="text-xs text-slate-400 font-medium">{count}</span>
  </div>
);

export default function MonthCard({ month, ipd, opdConsult, opdProc, investigations, totalShare, onExpand }) {
  const [open, setOpen] = React.useState(false);
  const ipdTotal = ipd.reduce((s, r) => s + r.grossAmount, 0);
  const consultTotal = opdConsult.reduce((s, r) => s + r.grossAmount, 0);
  const procTotal = opdProc.reduce((s, r) => s + r.grossAmount, 0);
  const invTotal = investigations.reduce((s, r) => s + r.grossAmount, 0);

  const totalGross = ipdTotal + consultTotal + procTotal + invTotal;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4">
      {/* Header */}
      <button
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-slate-800">{month}</span>
          <span className="text-xs text-slate-400 font-medium">{ipd.length + opdConsult.length + opdProc.length + investigations.length} patients</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-400 font-medium">Your Share</p>
            <p className="text-base font-extrabold text-slate-800">{fmt(totalShare)}</p>
          </div>
          {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {/* Summary Bar */}
      <div className="px-5 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-purple-50 rounded-lg px-3 py-2">
          <p className="text-xs text-purple-400 font-medium">IPD</p>
          <p className="text-sm font-bold text-purple-700">{fmt(ipdTotal)}</p>
        </div>
        <div className="bg-sky-50 rounded-lg px-3 py-2">
          <p className="text-xs text-sky-400 font-medium">Consults</p>
          <p className="text-sm font-bold text-sky-700">{fmt(consultTotal)}</p>
        </div>
        <div className="bg-orange-50 rounded-lg px-3 py-2">
          <p className="text-xs text-orange-400 font-medium">Procedures</p>
          <p className="text-sm font-bold text-orange-700">{fmt(procTotal)}</p>
        </div>
        <div className="bg-slate-100 rounded-lg px-3 py-2">
          <p className="text-xs text-slate-400 font-medium">Labs/Inv.</p>
          <p className="text-sm font-bold text-slate-500">{fmt(invTotal)}</p>
        </div>
      </div>

      {/* Expanded Detail */}
      {open && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CatBlock label="IPD Admissions" amount={ipdTotal} count={ipd.length} color="bg-purple-50" darkColor="text-purple-700" icon={Stethoscope} />
            <CatBlock label="OPD Consultations" amount={consultTotal} count={opdConsult.length} color="bg-sky-50" darkColor="text-sky-700" icon={Users} />
            <CatBlock label="OPD Procedures" amount={procTotal} count={opdProc.length} color="bg-orange-50" darkColor="text-orange-700" icon={TrendingUp} />
            <CatBlock label="Investigations" amount={invTotal} count={investigations.length} color="bg-slate-100" darkColor="text-slate-500" icon={FlaskConical} />
          </div>

          {/* Patient table toggle */}
          <details className="mt-3">
            <summary className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-medium">
              Show patient details ({ipd.length + opdConsult.length + opdProc.length + investigations.length} entries)
            </summary>
            <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-100">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-500">Date</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-500">Patient</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-500">Service</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-500">Category</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-500">Net</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-500">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...ipd, ...opdConsult, ...opdProc, ...investigations].sort((a,b) => {
                    const [d1,m1,y1] = (a.date||'').split('/');
                    const [d2,m2,y2] = (b.date||'').split('/');
                    return new Date(`${y2}-${m2}-${d2}`) - new Date(`${y1}-${m1}-${d1}`);
                  }).map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 text-slate-400">{r.date}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-700 truncate max-w-[120px]">{r.patientName}</td>
                      <td className="px-3 py-1.5 text-slate-600 truncate max-w-[150px]">{r.serviceName}</td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.category==='IPD'?'bg-purple-100 text-purple-700':
                          r.category==='OPD Consultation'?'bg-sky-100 text-sky-700':
                          r.category==='OPD Procedure'?'bg-orange-100 text-orange-700':
                          'bg-slate-100 text-slate-500'
                        }`}>{r.category}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-600">{fmt(r.grossAmount)}</td>
                      <td className="px-3 py-1.5 text-right font-semibold text-slate-800">{fmt(r.calculatedShare)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
