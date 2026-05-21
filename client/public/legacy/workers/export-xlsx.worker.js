self.addEventListener('message', async (event)=>{
  const data = event?.data || {};
  const type = String(data.type || '');
  if(type !== 'xlsx-export' && type !== 'xlsx-multi-sheet-export' && type !== 'xlsx-styled-multi-sheet-export' && type !== 'csv-export') return;
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

    if(type === 'xlsx-styled-multi-sheet-export'){
      const excelJsUrl = String(data.excelJsUrl || '').trim();
      if(typeof self.ExcelJS === 'undefined'){
        if(!excelJsUrl) throw new Error('Missing ExcelJS worker library URL.');
        self.importScripts(excelJsUrl);
      }
      const ExcelJS = self.ExcelJS;
      if(typeof ExcelJS === 'undefined'){
        throw new Error('ExcelJS library unavailable in worker.');
      }
      const sheets = Array.isArray(data.sheets) ? data.sheets : [];
      const workbook = new ExcelJS.Workbook();
      const headerImageDataUrl = String(data.headerImageDataUrl || '').trim();
      const imageId = headerImageDataUrl
        ? workbook.addImage({ base64: headerImageDataUrl, extension: 'jpeg' })
        : null;
      const border = {
        top: { style: 'thin', color: { argb: 'FF1A1A1A' } },
        left: { style: 'thin', color: { argb: 'FF1A1A1A' } },
        bottom: { style: 'thin', color: { argb: 'FF1A1A1A' } },
        right: { style: 'thin', color: { argb: 'FF1A1A1A' } }
      };
      const headerBorder = {
        top: { style: 'thin', color: { argb: 'FF111111' } },
        left: { style: 'thin', color: { argb: 'FF111111' } },
        bottom: { style: 'thin', color: { argb: 'FF111111' } },
        right: { style: 'thin', color: { argb: 'FF111111' } }
      };
      sheets.forEach((entry, index)=>{
        const name = String(entry?.name || `Export ${index + 1}`).trim() || `Export ${index + 1}`;
        const headers = Array.isArray(entry?.headers) ? entry.headers : [];
        const rows = Array.isArray(entry?.rows) ? entry.rows : [];
        const subtitle = String(entry?.subtitle || '').trim();
        const editionLabel = String(entry?.editionLabel || '').trim();
        const colCount = Math.max(1, headers.length);
        const lastColLetter = String.fromCharCode(64 + Math.min(26, colCount));
        const sheet = workbook.addWorksheet(name.slice(0, 31));
        sheet.views = [{ showGridLines: false }];
        sheet.pageSetup = { orientation: 'landscape' };
        sheet.pageMargins = { left: 0, right: 0, top: 0, bottom: 0, header: 0, footer: 0 };
        const widths = Array.isArray(entry?.colWidths) && entry.colWidths.length
          ? entry.colWidths.map((value)=>Math.max(8, Number(value?.wch || value || 20)))
          : new Array(colCount).fill(20);
        sheet.columns = widths.map(width=>({ width }));
        sheet.mergeCells(`A5:${lastColLetter}5`);
        sheet.mergeCells(`A6:${lastColLetter}6`);
        sheet.getCell('A5').value = '';
        sheet.getCell('A6').value = {
          richText: [
            ...(subtitle ? [{
              text: subtitle,
              font: { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1A4590' } }
            }] : []),
            ...(subtitle ? [{
              text: '   ',
              font: { name: 'Arial', size: 11, color: { argb: 'FF111111' } }
            }] : []),
            {
              text: editionLabel,
              font: { name: 'Arial', size: 11, bold: true, color: { argb: 'FF111111' } }
            }
          ]
        };
        [1, 2, 3, 4].forEach(rowNumber=>{ sheet.getRow(rowNumber).height = 14.4; });
        sheet.getRow(5).height = 35.25;
        sheet.getRow(6).height = 24;
        sheet.getRow(7).height = 9.6;
        sheet.getRow(8).height = 38;
        headers.forEach((header, headerIndex)=>{
          const cell = sheet.getRow(8).getCell(headerIndex + 1);
          cell.value = header;
          cell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A4590' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = headerBorder;
        });
        sheet.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' };
        rows.forEach((row, rowIndex)=>{
          const sheetRow = sheet.getRow(rowIndex + 9);
          sheetRow.values = Array.isArray(row) ? row.slice(0, colCount) : [];
          sheetRow.height = 35.25;
          for(let c = 1; c <= colCount; c++){
            const cell = sheetRow.getCell(c);
            cell.font = { name: 'Calibri', size: 14, color: { argb: 'FF111111' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: c === 2 || c === 5 ? 'left' : 'center', vertical: 'middle', wrapText: true };
            cell.border = border;
          }
        });
        if(imageId){
          sheet.addImage(imageId, {
            tl: { col: 1.512, row: 0.154 },
            br: { col: Math.min(6.183, colCount), row: 4.862 },
            editAs: 'oneCell'
          });
        }
      });
      const buffer = await workbook.xlsx.writeBuffer();
      self.postMessage({
        type: 'xlsx-styled-multi-sheet-export-result',
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

    if(type === 'xlsx-multi-sheet-export'){
      const sheets = Array.isArray(data.sheets) ? data.sheets : [];
      const wb = self.XLSX.utils.book_new();
      const usedNames = new Set();
      const sanitizeSheetName = (value)=>{
        const base = (String(value || '').trim() || 'Export')
          .replace(/[\[\]\*\/\\\?:]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 31) || 'Export';
        let name = base;
        let suffix = 2;
        while(usedNames.has(name.toLowerCase())){
          const suffixText = ` ${suffix}`;
          name = `${base.slice(0, Math.max(1, 31 - suffixText.length))}${suffixText}`;
          suffix += 1;
        }
        usedNames.add(name.toLowerCase());
        return name;
      };
      sheets.forEach((sheet, index)=>{
        const aoa = Array.isArray(sheet?.aoa) ? sheet.aoa : [];
        const ws = self.XLSX.utils.aoa_to_sheet(aoa);
        const colWidths = Array.isArray(sheet?.colWidths) ? sheet.colWidths : [];
        if(colWidths.length) ws['!cols'] = colWidths;
        self.XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(sheet?.name || `Export ${index + 1}`));
      });
      const buffer = self.XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'array'
      });
      self.postMessage({
        type: 'xlsx-multi-sheet-export-result',
        requestId,
        ok: true,
        buffer
      }, [buffer]);
      return;
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
      type: type === 'xlsx-styled-multi-sheet-export'
        ? 'xlsx-styled-multi-sheet-export-result'
        : (type === 'xlsx-multi-sheet-export' ? 'xlsx-multi-sheet-export-result' : 'xlsx-export-result'),
      requestId,
      ok: false,
      error: String(err?.message || err)
    });
  }
});
