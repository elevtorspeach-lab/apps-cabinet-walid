function renderDiligenceRowHtml(row, showInjonctionColumns){
  const procEncoded = encodeURIComponent(String(row.procedure || ''));
  const isChecked = isDiligenceSelectedForPrint(row);
  const refValue = row.details?.referenceClient || '';
  const ordValue = row.details?.attOrdOrOrdOk || '';
  const notificationSortValue = row.details?.notificationSort || '';
  const notificationNoValue = row.details?.notificationNo || '';
  const notificationStatusValue = row.details?.notificationStatus || '';
  const dateNotificationValue = row.details?.dateNotification || '';
  const certificatNonAppelValue = row.details?.certificatNonAppelStatus || '';
  const executionValue = row.details?.executionNo || '';
  const villeValue = row.dossier?.ville || '';
  const delegationValue = row.details?.attDelegationOuDelegat || '';
  const huissierValue = row.details?.huissier || '';
  const sortValue = row.details?.sort || '';
  const tribunalValue = row.details?.tribunal || '';
  if(showInjonctionColumns){
    return `
    <tr>
      <td>
        <label class="diligence-client-cell">
          <input
            type="checkbox"
            class="diligence-print-check"
            ${isChecked ? 'checked' : ''}
            onchange="toggleDiligencePrintSelectionEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}', this.checked)">
          <span>${escapeHtml(row.clientName || '-')}</span>
        </label>
      </td>
      <td>${escapeHtml(row.dossier?.debiteur || '-')}</td>
      <td>${escapeHtml(row.details?.depotLe || row.details?.dateDepot || '-')}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'referenceClient', refValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'attOrdOrOrdOk', ordValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'notificationNo', notificationNoValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'notificationStatus', notificationStatusValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'notificationSort', notificationSortValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'dateNotification', dateNotificationValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'certificatNonAppelStatus', certificatNonAppelValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'executionNo', executionValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'ville', villeValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'attDelegationOuDelegat', delegationValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'huissier', huissierValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'sort', sortValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'tribunal', tribunalValue)}</td>
    </tr>
  `;
  }
  return `
    <tr>
      <td>
        <label class="diligence-client-cell">
          <input
            type="checkbox"
            class="diligence-print-check"
            ${isChecked ? 'checked' : ''}
            onchange="toggleDiligencePrintSelectionEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}', this.checked)">
          <span>${escapeHtml(row.clientName || '-')}</span>
        </label>
      </td>
      <td>${escapeHtml(row.dossier?.debiteur || '-')}</td>
      <td>${escapeHtml(row.details?.depotLe || row.details?.dateDepot || '-')}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'referenceClient', refValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'attOrdOrOrdOk', ordValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'executionNo', executionValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'ville', villeValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'attDelegationOuDelegat', delegationValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'huissier', huissierValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'sort', sortValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'tribunal', tribunalValue)}</td>
    </tr>
  `;
}

function renderDiligenceVirtualWindow(force = false){
  const body = $('diligenceBody');
  if(!body) return;
  const rows = Array.isArray(diligenceVirtualRows) ? diligenceVirtualRows : [];
  const colCount = diligenceVirtualShowInjonctionColumns ? 15 : 11;
  if(!rows.length){
    diligenceVirtualLastRange = { start: -1, end: -1 };
    body.innerHTML = `<tr><td colspan="${colCount}" class="diligence-empty">Aucun dossier SFDC/S-bien/Injonction trouvé.</td></tr>`;
    return;
  }
  const { start, end } = getVirtualWindowByContainer('diligenceTableContainer', rows.length);
  if(!force && start === diligenceVirtualLastRange.start && end === diligenceVirtualLastRange.end) return;
  diligenceVirtualLastRange = { start, end };

  const topHeight = start * AUDIENCE_VIRTUAL_ROW_HEIGHT;
  const bottomHeight = (rows.length - end) * AUDIENCE_VIRTUAL_ROW_HEIGHT;
  const topSpacer = topHeight > 0
    ? `<tr class="virtual-spacer"><td colspan="${colCount}" style="height:${topHeight}px"></td></tr>`
    : '';
  const bottomSpacer = bottomHeight > 0
    ? `<tr class="virtual-spacer"><td colspan="${colCount}" style="height:${bottomHeight}px"></td></tr>`
    : '';
  const rowsHtml = rows
    .slice(start, end)
    .map(row=>renderDiligenceRowHtml(row, diligenceVirtualShowInjonctionColumns))
    .join('');
  body.innerHTML = `${topSpacer}${rowsHtml}${bottomSpacer}`;
  applyDiligenceAutoSizing(body);
}

function queueDiligenceVirtualRender(){
  if(diligenceVirtualRafId) return;
  diligenceVirtualRafId = window.requestAnimationFrame(()=>{
    diligenceVirtualRafId = null;
    renderDiligenceVirtualWindow();
  });
}

function renderDiligence(options = {}){
  if(!shouldRenderDeferredSection('diligence', options)) return;
  const diligenceQuery = $('diligenceSearchInput')?.value?.toLowerCase() || '';
  const diligenceFilterStateKey = [
    diligenceQuery,
    filterDiligenceProcedure,
    filterDiligenceSort,
    filterDiligenceDelegation,
    filterDiligenceOrdonnance,
    filterDiligenceTribunal
  ].join('||');
  syncPaginationFilterState(
    'diligence',
    diligenceFilterStateKey
  );
  const body = $('diligenceBody');
  const count = $('diligenceCount');
  const headRow = $('diligenceHeadRow');
  if(!body) return;
  const allRows = getDiligenceRows();
  syncDiligencePrintSelection(allRows);
  syncDiligenceProcedureFilter(allRows);
  syncDiligenceSortFilter(allRows);
  syncDiligenceDelegationFilter(allRows);
  syncDiligenceOrdonnanceFilter(allRows);
  syncDiligenceTribunalFilter(allRows);
  const finalizeDiligenceRender = (rows)=>{
    const showInjonctionColumns = rows.some(row=>String(row?.procedure || '').trim() === 'Injonction');

    if(headRow){
      if(showInjonctionColumns){
        headRow.innerHTML = `
          <th>Client</th>
          <th>Débiteur</th>
          <th>Date dépôt</th>
          <th>Référence dossier</th>
          <th>Ordonnance</th>
          <th>Notification N°</th>
          <th>Statut notification</th>
          <th>Sort notification</th>
          <th>Date notification</th>
          <th>Certificat non appel</th>
          <th>Execution N°</th>
          <th>Ville</th>
          <th>Délégation</th>
          <th>Huissier</th>
          <th>Sort</th>
          <th>Tribunal</th>
        `;
      }else{
        headRow.innerHTML = `
          <th>Client</th>
          <th>Débiteur</th>
          <th>Date dépôt</th>
          <th>Référence dossier</th>
          <th>Ordonnance</th>
          <th>Execution N°</th>
          <th>Ville</th>
          <th>Délégation</th>
          <th>Huissier</th>
          <th>Sort</th>
          <th>Tribunal</th>
        `;
      }
    }

    if(count){
      const labels = [];
      labels.push(filterDiligenceProcedure === 'all' ? 'toutes les procédures' : `procédure: ${filterDiligenceProcedure}`);
      labels.push(filterDiligenceSort === 'all' ? 'tous les sorts' : `sort: ${filterDiligenceSort}`);
      labels.push(filterDiligenceDelegation === 'all' ? 'toutes les délégations' : `délégation: ${filterDiligenceDelegation}`);
      labels.push(filterDiligenceOrdonnance === 'all' ? 'toutes les ordonnances' : `ordonnance: ${filterDiligenceOrdonnance}`);
      labels.push(filterDiligenceTribunal === 'all' ? 'tous les tribunaux' : `tribunal: ${filterDiligenceTribunal}`);
      const label = labels.join(', ');
      count.textContent = `${rows.length} ligne(s) diligence (${label})`;
    }

    if(!rows.length){
      diligenceVirtualRows = [];
      diligenceVirtualLastRange = { start: -1, end: -1 };
      body.innerHTML = `<tr><td colspan="${showInjonctionColumns ? 16 : 11}" class="diligence-empty">Aucun dossier SFDC/S-bien/Injonction trouvé.</td></tr>`;
      renderPagination('diligence', { totalRows: 0, page: 1, totalPages: 1, from: 0, to: 0 });
      return;
    }

    const pageData = paginateRows(rows, 'diligence');
    const useVirtual = pageData.rows.length >= DILIGENCE_VIRTUAL_MIN_ROWS;
    diligenceVirtualRows = pageData.rows;
    diligenceVirtualShowInjonctionColumns = showInjonctionColumns;
    diligenceVirtualLastRange = { start: -1, end: -1 };
    if(useVirtual){
      renderDiligenceVirtualWindow(true);
    }else{
      body.innerHTML = pageData.rows.map(row=>renderDiligenceRowHtml(row, showInjonctionColumns)).join('');
      applyDiligenceAutoSizing(body);
    }
    renderPagination('diligence', pageData);
  };

  if(diligenceQuery && allRows.length >= 1200 && !!getDiligenceFilterWorker()){
    const narrowedRows = allRows.filter(row=>{
      if(filterDiligenceProcedure !== 'all' && row.procedure !== filterDiligenceProcedure) return false;
      if(filterDiligenceSort !== 'all' && row.sort !== filterDiligenceSort) return false;
      if(filterDiligenceDelegation !== 'all' && row.delegation !== filterDiligenceDelegation) return false;
      if(filterDiligenceOrdonnance !== 'all' && row.ordonnance !== filterDiligenceOrdonnance) return false;
      if(filterDiligenceTribunal !== 'all' && row.tribunal !== filterDiligenceTribunal) return false;
      return true;
    });
    const requestId = ++diligenceFilterRequestSeq;
    body.innerHTML = '<tr><td colspan="16" class="diligence-empty">Recherche diligence en cours...</td></tr>';
    runDiligenceFilterInWorker(
      narrowedRows.map((row, idx)=>({
        idx,
        values: row.__diligenceSearchValues || (row.__diligenceSearchValues = getDiligenceSearchValues(row))
      })),
      diligenceQuery,
      requestId
    )
      .then((filteredIndexes)=>{
        const currentStateKey = [
          $('diligenceSearchInput')?.value?.toLowerCase() || '',
          filterDiligenceProcedure,
          filterDiligenceSort,
          filterDiligenceDelegation,
          filterDiligenceOrdonnance,
          filterDiligenceTribunal
        ].join('||');
        if(requestId !== diligenceFilterRequestSeq) return;
        if(currentStateKey !== diligenceFilterStateKey) return;
        if(!Array.isArray(filteredIndexes)){
          finalizeDiligenceRender(getFilteredDiligenceRows(allRows));
          return;
        }
        finalizeDiligenceRender(filteredIndexes.map(idx=>narrowedRows[idx]).filter(Boolean));
      })
      .catch(()=>{
        if(requestId !== diligenceFilterRequestSeq) return;
        finalizeDiligenceRender(getFilteredDiligenceRows(allRows));
      });
    return;
  }

  finalizeDiligenceRender(getFilteredDiligenceRows(allRows));
}
