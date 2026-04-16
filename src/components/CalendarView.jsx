import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Stethoscope, Users, Scissors, FlaskConical, X } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const catConfig = {
  IPD:                { label: 'IPD',        icon: Stethoscope,    color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500'   },
  'OPD Consultation': { label: 'Consult',    icon: Users,          color: 'bg-sky-100   text-sky-700',   dot: 'bg-sky-500'     },
  'OPD Procedure':    { label: 'Procedure',  icon: Scissors,       color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  Investigation:      { label: 'Lab/Inv.',   icon: FlaskConical,   color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400'  },
};

function timeStr(r) {
  // Try to get time from billDate if available — for IPD show admission time
  // For OPD show timein from column 4
  return r._time || '';
}

function DayCell({ dateKey, day, records, onClick }) {
  if (!records || records.length === 0) {
    return (
      <div className="min-h-[88px] border border-slate-100 rounded-lg p-1.5 bg-slate-50/50">
        <p className="text-[10px] text-slate-300 font-bold">{day}</p>
      </div>
    );
  }

  const byCat = {};
  records.forEach(r => {
    const cat = r.isExcluded ? 'Investigation' : (r.category || 'OPD Procedure');
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(r);
  });
  const totalShare = records.reduce((s,r) => s + (r.isExcluded ? 0 : r.calculatedShare), 0);

  return (
    <div
      className="min-h-[88px] border border-slate-200 rounded-lg p-1.5 bg-white hover:bg-purple-50 hover:border-purple-300 transition-all cursor-pointer group"
      onClick={() => onClick(dateKey, records)}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 group-hover:bg-purple-100 group-hover:text-purple-700 rounded px-1 transition-colors">{day}</span>
        <span className="text-[9px] font-bold text-slate-400">{records.length}</span>
      </div>
      <div className="space-y-0.5">
        {Object.entries(byCat).slice(0,3).map(([cat, recs]) => {
          const cfg = catConfig[cat] || catConfig['Investigation'];
          return (
            <div key={cat} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold ${cfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`}></span>
              <span className="truncate">{cfg.label}×{recs.length}</span>
            </div>
          );
        })}
        {Object.keys(byCat).length > 3 && (
          <p className="text-[9px] text-slate-400 font-medium pl-1">+{Object.keys(byCat).length - 3} more</p>
        )}
      </div>
      {totalShare > 0 && (
        <p className="text-[9px] font-bold text-slate-500 mt-1 text-right">{fmt(totalShare)}</p>
      )}
    </div>
  );
}

function ListModal({ title, records, onClose }) {
  // Sort by dateKey then by opNo/time
  const sorted = [...records].sort((a,b) => {
    const ka = (a.dateKey||'')+(a.opNo||'');
    const kb = (b.dateKey||'')+(b.opNo||'');
    return ka.localeCompare(kb);
  });

  const totalShare = records.reduce((s,r) => s + (r.isExcluded ? 0 : r.calculatedShare), 0);
  const totalGross = records.reduce((s,r) => s + r.grossAmount, 0);
  const byCat = {};
  records.forEach(r => {
    const cat = r.isExcluded ? 'Investigation' : (r.category||'OPD Procedure');
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(r);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50 rounded-t-2xl shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-lg leading-tight">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{records.length} entries · <span className="font-semibold">{fmt(totalShare)} your share</span> · {fmt(totalGross)} gross</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-3xl font-light leading-none ml-4">&times;</button>
        </div>

        {/* Category summary */}
        <div className="px-5 py-3 border-b border-slate-100 flex gap-3 flex-wrap">
          {Object.entries(byCat).map(([cat, recs]) => {
            const cfg = catConfig[cat] || catConfig['Investigation'];
            const cfgShare = recs.reduce((s,r) => s + (r.isExcluded ? 0 : r.calculatedShare), 0);
            return (
              <div key={cat} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
                <cfg.icon className="w-3.5 h-3.5" />
                {cfg.label}: {recs.length} · {fmt(cfgShare)}
              </div>
            );
          })}
        </div>

        {/* Scrollable list */}
        <div className="overflow-auto flex-1 p-4 space-y-1.5">
          {sorted.map(r => {
            const cfg = catConfig[r.isExcluded ? 'Investigation' : (r.category||'OPD Procedure')] || catConfig['Investigation'];
            return (
              <div key={r.id} className="flex items-start gap-3 px-4 py-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate">{r.patientName}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{r.serviceName}</p>
                      {r.opNo && <p className="text-[10px] text-slate-300 font-mono mt-0.5">#{r.opNo}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-700">{fmt(r.grossAmount)}</p>
                      {!r.isExcluded
                        ? <p className="text-xs font-semibold text-purple-600">→ {fmt(r.calculatedShare)}</p>
                        : <p className="text-xs text-slate-400">₹0 yours</p>
                      }
                    </div>
                  </div>
                  <div className="flex gap-3 mt-1.5">
                    {r.mobile && <p className="text-[10px] text-slate-400">{r.mobile}</p>}
                    {r.doctorName && <p className="text-[10px] text-slate-400">{r.doctorName}</p>}
                    {r.payMode && <p className="text-[10px] text-slate-400">{r.payMode}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50 rounded-b-2xl shrink-0">
          <span className="text-sm font-bold text-slate-600">Total Gross: <span className="text-slate-800">{fmt(totalGross)}</span></span>
          <span className="text-base font-extrabold text-slate-800">Your Share: <span className="text-purple-700">{fmt(totalShare)}</span></span>
        </div>
      </div>
    </div>
  );
}

function WeekView({ weekNum, startDate, endDate, records, onClick }) {
  const total = records.reduce((s,r) => s + (r.isExcluded ? 0 : r.calculatedShare), 0);
  const gross = records.reduce((s,r) => s + r.grossAmount, 0);
  const byCat = {};
  records.forEach(r => {
    const cat = r.isExcluded ? 'Investigation' : (r.category||'OPD Procedure');
    if (!byCat[cat]) byCat[cat] = 0;
    byCat[cat]++;
  });

  return (
    <div
      className="border border-slate-200 rounded-xl p-3 bg-white hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer"
      onClick={() => onClick(records)}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-slate-600">Week {weekNum}</p>
        <p className="text-xs font-bold text-purple-600">{fmt(total)}</p>
      </div>
      <p className="text-[10px] text-slate-400 mb-2">{startDate} – {endDate}</p>
      <div className="flex gap-1.5 flex-wrap">
        {Object.entries(byCat).map(([cat, count]) => {
          const cfg = catConfig[cat] || catConfig['Investigation'];
          return (
            <span key={cat} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
              {cfg.label}×{count}
            </span>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400 mt-2">Gross: {fmt(gross)} · {records.length} entries</p>
    </div>
  );
}

export default function CalendarView({ data }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [calView, setCalView] = useState('month'); // 'month' | 'week'
  const [expanded, setExpanded] = useState(null); // { title, records }

  const byDate = useMemo(() => {
    const m = {};
    data.forEach(r => { if (r.dateKey) { if (!m[r.dateKey]) m[r.dateKey] = []; m[r.dateKey].push(r); } });
    return m;
  }, [data]);

  const allDates = useMemo(() => Object.keys(byDate).sort(), [byDate]);

  const monthName = `${MONTHS[month-1]} ${year}`;
  const monthData = data.filter(r => r.monthYear === monthName);
  const monthShare = monthData.reduce((s,r) => s + (r.isExcluded ? 0 : r.calculatedShare), 0);
  const monthGross = monthData.reduce((s,r) => s + r.grossAmount, 0);

  const catCount = {};
  monthData.forEach(r => {
    const cat = r.isExcluded ? 'Investigation' : (r.category||'OPD Procedure');
    catCount[cat] = (catCount[cat]||0) + 1;
  });

  // Build weeks of the month
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month-1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const result = [];
    let day = 1;
    let weekNum = 1;
    while (day <= daysInMonth) {
      const weekStart = day === 1 ? new Date(year, month-1, 1) : new Date(year, month-1, day);
      const weekDays = [];
      for (let d = 0; d < 7; d++) {
        if ((result.length === 0 && d < firstDay) || day > daysInMonth) {
          weekDays.push(null);
        } else {
          const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          weekDays.push({ day, key, records: byDate[key] || [] });
          day++;
        }
      }
      const validDays = weekDays.filter(w => w !== null);
      if (validDays.length > 0) {
        const startStr = validDays[0].key;
        const endStr = validDays[validDays.length-1].key;
        const allRecs = validDays.flatMap(w => w.records);
        result.push({ weekNum, startStr, endStr, records: allRecs, days: weekDays });
      }
      weekNum++;
    }
    return result;
  }, [year, month, byDate]);

  const prevMonth = () => { if (month===1) { setYear(y=>y-1); setMonth(12); } else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12) { setYear(y=>y+1); setMonth(1); } else setMonth(m=>m+1); };

  const fmtD = (key) => {
    if (!key) return '';
    const [y,mo,dy] = key.split('-');
    return `${parseInt(dy)} ${MONTHS[parseInt(mo)-1].slice(0,3)}`;
  };

  const handleWeekClick = (records) => {
    setExpanded({ title: `Week View — ${monthName}`, records });
  };

  const handleDayClick = (dateKey, records) => {
    const [y,mo,dy] = dateKey.split('-');
    const title = `${parseInt(dy)} ${MONTHS[parseInt(mo)-1]} ${y}`;
    setExpanded({ title, records });
  };

  const handleMonthClick = () => {
    setExpanded({ title: monthName, records: monthData });
  };

  return (
    <div>
      {/* Month header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <h3 className="text-base font-extrabold text-slate-800">{monthName}</h3>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-xs text-slate-400 font-medium">Month Gross</p>
              <p className="text-sm font-extrabold text-slate-800">{fmt(monthGross)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Your Share</p>
              <p className="text-sm font-extrabold text-purple-700">{fmt(monthShare)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-3">
          {Object.entries(catCount).map(([cat,count]) => {
            const cfg = catConfig[cat] || catConfig['Investigation'];
            return (
              <div key={cat} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${cfg.color} border-opacity-50`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`}></span>
                {cfg.label}: {count}
              </div>
            );
          })}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => setCalView('month')}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${calView==='month'?'bg-slate-800 text-white':'text-slate-500 hover:bg-slate-50'}`}>
              Month
            </button>
            <button onClick={() => setCalView('week')}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${calView==='week'?'bg-slate-800 text-white':'text-slate-500 hover:bg-slate-50'}`}>
              Week
            </button>
          </div>
          <button onClick={handleMonthClick}
            className="ml-auto text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors">
            View all {monthName} →
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>)}
        </div>

        {calView === 'month' ? (
          <div className="grid grid-cols-7 gap-1">
            {weeks.flatMap((week, wi) =>
              week.days.map((w, di) => {
                if (!w) return <div key={`${wi}-${di}`} />;
                return (
                  <DayCell
                    key={w.key}
                    dateKey={w.key}
                    day={w.day}
                    records={w.records}
                    onClick={handleDayClick}
                  />
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {weeks.map(week => (
              <WeekView
                key={week.weekNum}
                weekNum={week.weekNum}
                startDate={fmtD(week.startStr)}
                endDate={fmtD(week.endStr)}
                records={week.records}
                onClick={handleWeekClick}
              />
            ))}
          </div>
        )}
      </div>

      {expanded && (
        <ListModal
          title={expanded.title}
          records={expanded.records}
          onClose={() => setExpanded(null)}
        />
      )}
    </div>
  );
}
