'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';

interface Props {
  spec: string;
  apiKey?: string | null;
}

export default function XlsxDownload({ spec, apiKey }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState(false);

  const generate = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/generate-xlsx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec, apiKey }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Generation failed');

      // Build xlsx from JSON using SheetJS
      const wb = XLSX.utils.book_new();
      for (const sheet of data.workbook.sheets) {
        const ws = XLSX.utils.aoa_to_sheet(sheet.data);
        // Set column widths
        if (sheet.colWidths) {
          ws['!cols'] = sheet.colWidths.map((w: number) => ({ wch: w }));
        }
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      }

      // Download
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
      <span style={{color:'#50a060',fontSize:14}}>✓</span>
      <span className="cinzel" style={{fontSize:11,color:'#50a060'}}>
        Downloaded! Check your downloads folder.
      </span>
    </div>
  );

  return (
    <div>
      <button
        onClick={generate}
        disabled={loading}
        className="btn-dungeon primary w-full"
        style={{fontSize:11,padding:'8px 12px'}}
      >
        {loading ? '⟳ Generating spreadsheet...' : '⬇️ Download .xlsx File'}
      </button>
      {error && (
        <p className="cinzel mt-1" style={{fontSize:10,color:'#c83030'}}>{error}</p>
      )}
      <p className="cinzel dim mt-1" style={{fontSize:9}}>
        Uses AI to build the full spreadsheet from the spec above
      </p>
    </div>
  );
}