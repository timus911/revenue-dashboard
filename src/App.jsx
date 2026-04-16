import React, { useState, useMemo, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import MonthCard from './components/MonthCard';
import CalendarView from './components/CalendarView';
import StatsOverview from './components/StatsOverview';
import { processFile } from './utils/revenueLogic';
import { Trash2, Download, Search, X, Calendar, LayoutList } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const exportCSV = (data) => {
  const header = ['Date','Patient','Service','Category','Net Amount','Your Share','Doctor','Mobile','Source'];
  const rows = [header];
  [...data].sort((a,b) => (a.dateKey||'').localeCompare(b.dateKey||'')).forEach(r => {
    rows.push([
      r.date, r.patientName, r.serviceName, r.category,
      r.grossAmount.toFixed(2), r.calculatedShare.toFixed(2),
      r.doctorName||'', r.mobile||'', r.sourceFile||''
    ]);
  });
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `revenue-export-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
};

export default function App() {
  const [processedData, setProcessedData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCats, setActiveCats] = useState(['IPD','OPD Consultation','OPD Procedure','Investigation']);
  const [view, setView] = useState('cards');

  const handleUpload = useCallback(async (files) => {
    const all = [];
    for (const file of files) {
      try {
        const rows = await processFile(file);
        all.push(...rows);
      } catch (e) { console.error('Parse error:', file.name, e); }
    }
    setProcessedData(prev => {
      const ids = new Set(prev.map(r => r.id));
      return [...prev, ...all.filter(r => !ids.has(r.id))];
    });
  }, []);

  const visibleIds = useMemo(() => {
    const ids = new Set();
    processedData.forEach(r => {
      if (activeCats.includes(r.category)) ids.add(r.id);
      if (r.isExcluded && activeCats.includes('Investigation')) ids.add(r.id);
    });
    return ids;
  }, [processedData, activeCats]);

  const displayedData = useMemo(() => {
    let d = processedData.filter(r => visibleIds.has(r.id));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      d = d.filter(r =>
        (r.patientName||'').toLowerCase().includes(q) ||
        (r.serviceName||'').toLowerCase().includes(q) ||
        (r.category||'').toLowerCase().includes(q) ||
        (r.doctorName||'').toLowerCase().includes(q)
      );
    }
    return d;
  }, [processedData, visibleIds, searchQuery]);

  const monthGroups = useMemo(() => {
    const groups = {};
    displayedData.forEach(r => {
      const my = r.monthYear || 'Unknown';
      if (!groups[my]) groups[my] = { ipd:[], opdConsult:[], opdProc:[], investigations:[] };
      const cat = r.isExcluded ? 'investigations' :
        r.category==='IPD' ? 'ipd' :
        r.category==='OPD Consultation' ? 'opdConsult' : 'opdProc';
      if (groups[my][cat]) groups[my][cat].push(r);
    });
    return Object.entries(groups).sort(([a],[b]) => {
      const parseMY = (s) => {
        const [mon, yr] = s.split(' ');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return parseInt(yr)*12 + (months.indexOf(mon)||0);
      };
      return parseMY(b) - parseMY(a);
    });
  }, [displayedData]);

  const totalShare = useMemo(() =>
    displayedData.reduce((s,r) => s + (r.isExcluded ? 0 : r.calculatedShare), 0), [displayedData]);

  const toggleCat = (cat) => {
    setActiveCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const catPills = [
    { cat:'IPD',               label:'IPD',              color:'bg-purple-100 text-purple-700 border-purple-200' },
    { cat:'OPD Consultation', label:'OPD Consults',      color:'bg-sky-100   text-sky-700   border-sky-200'   },
    { cat:'OPD Procedure',    label:'OPD Procedures',     color:'bg-orange-100 text-orange-700 border-orange-200' },
    { cat:'Investigation',    label:'Investigations',    color:'bg-slate-100 text-slate-500 border-slate-200' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">RevDash</h1>
            <span className="text-xs text-slate-400 font-medium">Dr. Sumit</span>
          </div>
          <div className="flex-1 max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search patient, service..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
              {searchQuery && <button onClick={()=>setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-slate-400"/></button>}
            </div>
          </div>
          {processedData.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                <button onClick={() => setView('cards')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${view==='cards'?'bg-slate-800 text-white':'text-slate-500 hover:bg-slate-50'}`}>
                  <LayoutList className="w-3.5 h-3.5" /> Cards
                </button>
                <button onClick={() => setView('calendar')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${view==='calendar'?'bg-slate-800 text-white':'text-slate-500 hover:bg-slate-50'}`}>
                  <Calendar className="w-3.5 h-3.5" /> Calendar
                </button>
              </div>
              <button onClick={() => exportCSV(displayedData)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              <button onClick={() => setProcessedData([])}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
          )}
        </div>
        {processedData.length > 0 && (
          <div className="max-w-6xl mx-auto mt-2 flex items-center gap-2 flex-wrap">
            {catPills.map(({cat,label,color}) => (
              <button key={cat} onClick={() => toggleCat(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${color} ${activeCats.includes(cat) ? 'opacity-100 shadow-sm' : 'opacity-40'}`}>
                {label}
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-400 font-medium">{processedData.length} records · {fmt(totalShare)} your share</span>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {processedData.length === 0 ? (
          <div className="py-16"><FileUpload onUpload={handleUpload} /></div>
        ) : (
          <>
            <div className="mb-6"><StatsOverview data={displayedData} /></div>
            {view === 'calendar' ? (
              <CalendarView data={displayedData} />
            ) : (
              monthGroups.length === 0 ? (
                <div className="text-center py-12 text-slate-400"><p className="text-sm font-medium">No results match your filters</p></div>
              ) : (
                monthGroups.map(([month,g]) => (
                  <MonthCard key={month} month={month}
                    ipd={g.ipd} opdConsult={g.opdConsult} opdProc={g.opdProc} investigations={g.investigations}
                    totalShare={g.ipd.reduce((s,r)=>s+r.calculatedShare,0) + g.opdConsult.reduce((s,r)=>s+r.calculatedShare,0) + g.opdProc.reduce((s,r)=>s+r.calculatedShare,0)}
                  />
                ))
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
