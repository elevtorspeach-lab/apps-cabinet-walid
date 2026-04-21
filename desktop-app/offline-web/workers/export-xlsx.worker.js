self.addEventListener('message', (event)=>{
  const data = event?.data || {};
  const type = String(data.type || '');
  if(type !== 'xlsx-export' && type !== 'csv-export') return;
  const requestId = Number(data.requestId) || 0;

  try{
    if(type === 'csv-export'){
      const separator = String(data.separator || ';');
      const headers = Array.isArray(data.headers) ? data.headers : [];
      const rows = Array.isArray(data.rows) ? data.rows : [];
      const escapeCell = (value)=>`"${String(value ?? '').replace(/"/g, '""')}"`;
      const lines = ['\uFEFF'];
      if(headers.length){
        lines.push(headers.map(escapeCell).join(separator), '\r\n');
      }
      rows.forEach((row)=>{
        const values = Array.isArray(row) ? row : [];
        lines.push(values.map(escapeCell).join(separator), '\r\n');
      });
      const buffer = new TextEncoder().encode(lines.join('')).buffer;
      self.postMessage({
        type: 'csv-export-result',
        requestId,
        ok: true,
        buffer
      }, [buffer]);
      return;
    }

    const xlsxUrl = String(data.xlsxUrl || '').trim();
    const aoa = Array.isArray(data.aoa) ? data.aoa : [];
    const sheetName = String(data.sheetName || 'Export').trim() || 'Export';
    const colWidths = Array.isArray(data.colWidths) ? data.colWidths : [];
    if(typeof self.XLSX === 'undefined'){
      if(!xlsxUrl) throw new Error('Missing XLSX worker library URL.');
      self.importScripts(xlsxUrl);
    }
    if(typeof self.XLSX === 'undefined'){
      throw new Error('XLSX library unavailable in worker.');
    }

    const ws = self.XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = colWidths.length ? colWidths : [];
    const wb = self.XLSX.utils.book_new();
    self.XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const buffer = self.XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'array'
    });

    self.postMessage({
      type: 'xlsx-export-result',
      requestId,
      ok: true,
      buffer
    }, [buffer]);
  }catch(err){
    self.postMessage({
      type: 'xlsx-export-result',
      requestId,
      ok: false,
      error: String(err?.message || err)
    });
  }
});
