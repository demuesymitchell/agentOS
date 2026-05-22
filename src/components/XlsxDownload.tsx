'use client';
import { useState } from 'react';

interface Props {
  spec: string;
  apiKey?: string | null;
}

export default function XlsxDownload({ spec, apiKey }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);

  const generate = async () => {
    setLoading(true); setError('');

    // Validate spec before sending
    const cleanSpec = (spec || '').trim();
    if (!cleanSpec || cleanSpec.length < 50) {
      setError('Spec is too short or empty. Re-run the directive first.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/generate-xlsx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec: cleanSpec, apiKey }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error ${res.status}: ${text.slice(0,200)}`);
      }

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Generation failed');
      if (!data.workbook?.sheets?.length) throw new Error('No sheets returned');

      // Build xlsx using SheetJS loaded from CDN (avoids bundle issues)
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      for (const sheet of data.workbook.sheets) {
        if (!sheet.data?.length) continue;
        const ws = XLSX.utils.aoa_to_sheet(sheet.data);
        if (sheet.colWidths) {
          ws['!cols'] = sheet.colWidths.map((w: number) => ({ wch: w }));
        }
        // Sanitize sheet name (Excel max 31 chars, no special chars)
        const safeName = (sheet.name || 'Sheet').slice(0,31).replace(/[\/\\?\*\[\]]/g,'');
        XLSX.utils.book_append_sheet(wb, ws, safeName);
      }

      const filename = data.workbook.filename || 'spreadsheet.xlsx';
      XLSX.writeFile(wb, filename);
      setDone(true);
    } catch (e: any) {
      setError(e.message || 'Download failed');
    }
    setLoading(false);
  };

  if (done) return (
    <div className="flex items-center gap-2 p-2"
      style={{background:'#0a1a0a',border:'1px solid #50a06044',borderRadius:4}}>
      <span style={{color:'#50a060',fontSize:16}}>✓</span>
      <div>
        <p className="cinzel" style={{fontSize:11,color:'#50a060'}}>Downloaded successfully!</p>
        <p className="cinzel dim" style={{fontSize:10}}>Check your downloads folder</p>
      </div>
      <button onClick={()=>setDone(false)} className="btn-dungeon ml-auto" style={{fontSize:9}}>
        Download Again
      </button>
    </div>
  );

  return (
    <div className="space-y-1">
      <button onClick={generate} disabled={loading}
        className="btn-dungeon primary w-full" style={{fontSize:11,padding:'8px 12px'}}>
        {loading ? '⟳ Generating spreadsheet...' : '⬇️ Download .xlsx File'}
      </button>
      {error && (
        <p className="cinzel" style={{fontSize:10,color:'#c83030',marginTop:4}}>{error}</p>
      )}
      {!error && (
        <p className="cinzel dim" style={{fontSize:9}}>
          AI builds the full spreadsheet from the spec · takes ~10 seconds
        </p>
      )}
    </div>
  );
}