import React, { useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';

export default function FileUpload({ onUpload, compact = false }) {
  const [dragOver, setDragOver] = React.useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
    if (files.length) onUpload(files);
  }, [onUpload]);

  const handleFile = useCallback((e) => {
    const files = Array.from(e.target.files).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
    if (files.length) onUpload(files);
  }, [onUpload]);

  if (compact) {
    return (
      <div
        className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${dragOver ? 'border-sky-400 bg-sky-50' : 'border-slate-300 hover:border-slate-400'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input-compact').click()}
      >
        <input id="file-input-compact" type="file" multiple accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <Upload className="w-3 h-3" />
          <span>Drop VIPHA Excel files here or click to browse</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${dragOver ? 'border-sky-400 bg-sky-50 scale-105' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input').click()}
    >
      <input id="file-input" type="file" multiple accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
      <Upload className={`w-10 h-10 mx-auto mb-4 ${dragOver ? 'text-sky-500' : 'text-slate-400'}`} />
      <p className="text-slate-700 font-semibold text-lg mb-1">Drop VIPHA Excel files here</p>
      <p className="text-slate-400 text-sm">or click to browse — supports .xlsx and .xls</p>
      <div className="mt-4 flex justify-center gap-4">
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
          <FileText className="w-3 h-3" /> IPD Report
        </span>
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-medium">
          <FileText className="w-3 h-3" /> OPD Report
        </span>
      </div>
    </div>
  );
}
