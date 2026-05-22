'use client';
import { useState } from 'react';

export default function XlsxDownload({ spec, apiKey }: { spec: string; apiKey?: string | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);

  const generate = async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/generate-xlsx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec: (spec||'').trim(), apiKey }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Generation failed');

      const XLSX = await import('xlsx');
      const wb   = XLSX.utils.book_new();

      for (const sheet of data.workbook.sheets) {
        if (!sheet.data?.length) continue;
        const ws = XLSX.utils.aoa_to_sheet(sheet.data);
        if (sheet.colWidths) ws['!cols'] = sheet.colWidths.map((w: number) => ({ wch: w }));
        const name = (sheet.name||'Sheet').slice(0,30).replace(/[\\/?\*\[\]:]/g,'');
        XLSX.utils.book_append_sheet(wb, ws, name || 'Sheet');
      }

      XLSX.writeFile(wb, data.workbook.filename || 'spreadsheet.xlsx');
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  if (done) return (
    <div className="flex items-center gap-2 p-2"
      style={{background:'#0a1a0a',border:'1px solid #50a06044',borderRadius:4}}>
      <span style={{color:'#50a060',fontSize:16}}>✓</span>
      <p className="cinzel" style={{fontSize:11,color:'#50a060'}}>Downloaded! Check your downloads folder.</p>
      <button onClick={()=>setDone(false)} className="btn-dungeon ml-auto" style={{fontSize:9}}>Again</button>
    </div>
  );

  return (
    <div>
      <button onClick={generate} disabled={loading}
        className="btn-dungeon primary w-full" style={{fontSize:11,padding:'8px'}}>
        {loading ? '⟳ Building spreadsheet...' : '⬇️ Download .xlsx File'}
      </button>
      {error && <p className="cinzel mt-1" style={{fontSize:10,color:'#c83030'}}>{error}</p>}
      {!error && <p className="cinzel dim mt-1" style={{fontSize:9}}>Takes ~15 seconds · AI builds from spec</p>}
    </div>
  );
}