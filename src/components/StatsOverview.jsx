import React from 'react';
import { IndianRupee, TrendingUp, Stethoscope, Users, FlaskConical, ArrowUpRight } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function StatsOverview({ data }) {
  const ipd = data.filter(r => r.category === 'IPD' && !r.isExcluded);
  const consults = data.filter(r => r.category === 'OPD Consultation' && !r.isExcluded);
  const procedures = data.filter(r => r.category === 'OPD Procedure' && !r.isExcluded);
  const investigations = data.filter(r => r.isExcluded || r.category === 'Investigation');

  const ipdShare = ipd.reduce((s, r) => s + r.calculatedShare, 0);
  const consultShare = consults.reduce((s, r) => s + r.calculatedShare, 0);
  const procShare = procedures.reduce((s, r) => s + r.calculatedShare, 0);
  const totalShare = ipdShare + consultShare + procShare;

  const ipdGross = ipd.reduce((s, r) => s + r.grossAmount, 0);
  const consultGross = consults.reduce((s, r) => s + r.grossAmount, 0);
  const procGross = procedures.reduce((s, r) => s + r.grossAmount, 0);
  const invGross = investigations.reduce((s, r) => s + r.grossAmount, 0);
  const totalGross = ipdGross + consultGross + procGross + invGross;

  const cards = [
    {
      label: 'Total Revenue',
      value: totalGross,
      sub: `${fmt(totalShare)} your share`,
      icon: IndianRupee,
      bg: 'bg-slate-800',
      text: 'text-white',
      iconBg: 'bg-white/10',
    },
    {
      label: 'IPD',
      value: ipdGross,
      sub: `${ipd.length} patients · ${fmt(ipdShare)} your share`,
      icon: Stethoscope,
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      iconBg: 'bg-purple-100',
    },
    {
      label: 'OPD Consultations',
      value: consultGross,
      sub: `${consults.length} visits · ${fmt(consultShare)} your share`,
      icon: Users,
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      iconBg: 'bg-sky-100',
    },
    {
      label: 'OPD Procedures',
      value: procGross,
      sub: `${procedures.length} procedures · ${fmt(procShare)} your share`,
      icon: TrendingUp,
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      iconBg: 'bg-orange-100',
    },
    {
      label: 'Investigations',
      value: invGross,
      sub: `${investigations.length} tests · ₹0 to you`,
      icon: FlaskConical,
      bg: 'bg-slate-100',
      text: 'text-slate-500',
      iconBg: 'bg-slate-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(c => (
        <div key={c.label} className={`${c.bg} rounded-xl p-4`}>
          <div className={`${c.iconBg} w-8 h-8 rounded-lg flex items-center justify-center mb-3`}>
            <c.icon className={`w-4 h-4 ${c.text}`} />
          </div>
          <p className={`text-xs font-medium ${c.text} opacity-60`}>{c.label}</p>
          <p className={`text-lg font-extrabold ${c.text} mt-0.5`}>{fmt(c.value)}</p>
          <p className={`text-[10px] font-medium ${c.text} opacity-50 mt-1`}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
