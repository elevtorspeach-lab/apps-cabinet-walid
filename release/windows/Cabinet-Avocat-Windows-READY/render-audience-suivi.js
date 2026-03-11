function getAudienceVirtualWindow(rowsLength){
  return getVirtualWindowByContainer('audienceTableContainer', rowsLength);
}

function queueAudienceVirtualRender(){
  if(audienceVirtualRafId) return;
  audienceVirtualRafId = window.requestAnimationFrame(()=>{
    audienceVirtualRafId = null;
    renderAudienceVirtualWindow();
  });
}

function renderAudienceRowHtml(row, duplicateKeySet){
  const { c, d, procKey, p, key, draft } = row;
  const canEdit = canEditClient(c) && canEditData();
  const canView = Number.isFinite(Number(row?.c?.id)) && Number.isFinite(Number(row?.di));
  const liveColor = String(p?.color || '').trim();
  const safeColor = ['blue', 'green', 'red', 'yellow', 'purple-dark', 'purple-light'].includes(liveColor) ? liveColor : '';
  const duplicateKey = buildAudienceDuplicateKey(row);
  const isDuplicate = !!(duplicateKey && duplicateKeySet.has(duplicateKey));
  const hasError = isAudienceRowInvalid(row, duplicateKeySet);
  const isMissingGlobal = !!row?.p?._missingGlobal;
  const isRefClientMismatch = !!row?.p?._refClientMismatch;
  const refClientDisplay = isRefClientMismatch
    ? String(row?.p?._refClientProvided || d.referenceClient || '-')
    : String(d.referenceClient || '-');
  const rowColor = (isDuplicate || hasError) ? 'red' : safeColor;
  const procKeyEncoded = encodeURIComponent(String(procKey));
  const keyEncoded = encodeURIComponent(String(key));
  const isPrintChecked = isAudienceSelectedForPrint(row.ci, row.di, procKey);
  const displayDateDepot = getAudienceDateDepotDisplayValue(row);
  const audienceDateValue = formatAudienceDateDisplayValue(draft.dateAudience || p.audience || '');
  return `
    <tr class="color-${rowColor}">
      <td data-label="Sélection">
        <input type="checkbox" class="audience-print-check"
          data-ci="${row.ci}"
          data-di="${row.di}"
          data-proc-key="${procKeyEncoded}"
          ${isPrintChecked ? 'checked' : ''}
          onchange="toggleAudienceSelectionAndColorEncoded(${row.ci},${row.di},'${procKeyEncoded}', this.checked)">
      </td>
      <td data-label="Client">${escapeHtml(c.name)}</td>
      <td data-label="Référence Client" class="${isRefClientMismatch ? 'audience-refclient-mismatch' : ''}">
        ${escapeHtml(refClientDisplay)}
        ${isRefClientMismatch ? '<div class="audience-inline-error">Réf client audience différente du global</div>' : ''}
      </td>
      <td data-label="Débiteur">${escapeHtml(d.debiteur || '-')}</td>
      <td data-label="Référence dossier">
        <input class="${isMissingGlobal ? 'audience-ref-missing' : ''}" value="${escapeAttr(draft.refDossier || p.referenceClient || '')}" ${canEdit ? '' : 'readonly'} oninput="updateAudienceDraftFromEncoded('${keyEncoded}','refDossier',this.value)">
        ${isMissingGlobal ? '<div class="audience-inline-error">Introuvable dans dossier global</div>' : ''}
      </td>
      <td data-label="Date d’audience"><input value="${escapeAttr(audienceDateValue)}" ${canEdit ? '' : 'readonly'} oninput="updateAudienceDraftFromEncoded('${keyEncoded}','dateAudience',this.value)" onblur="normalizeAudienceDateDraftInputFromEncoded('${keyEncoded}', this)"></td>
      <td data-label="Juge"><input value="${escapeAttr(draft.juge || p.juge || '')}" ${canEdit ? '' : 'readonly'} oninput="updateAudienceDraftFromEncoded('${keyEncoded}','juge',this.value)"></td>
      <td data-label="Sort"><input value="${escapeAttr(draft.sort || p.sort || '')}" ${canEdit ? '' : 'readonly'} oninput="updateAudienceDraftFromEncoded('${keyEncoded}','sort',this.value)"></td>
      <td data-label="Tribunal">${escapeHtml(p.tribunal || '-')}</td>
      <td data-label="Procédure">${escapeHtml(procKey || '-')}</td>
      <td data-label="Date dépôt">${escapeHtml(displayDateDepot)}</td>
      <td data-label="Actions">
        <div class="table-actions">
          <button type="button" class="btn-primary" ${canView ? `onclick="openDossierDetails(${Number(row.c.id)}, ${Number(row.di)})"` : 'disabled'}>
            <i class="fa-solid fa-eye"></i>
          </button>
          <button type="button" class="btn-primary" ${(canEdit && canView) ? `onclick="editDossier(${Number(row.c.id)}, ${Number(row.di)})"` : 'disabled'}>
            <i class="fa-solid fa-pen"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderAudienceVirtualWindow(force = false){
  const body = $('audienceBody');
  if(!body) return;
  const rows = Array.isArray(audienceVirtualRows) ? audienceVirtualRows : [];
  if(!rows.length){
    audienceVirtualLastRange = { start: -1, end: -1 };
    body.innerHTML = '<tr><td colspan="12" class="diligence-empty">Aucune audience trouvée avec ces filtres.</td></tr>';
    return;
  }

  const { start, end } = getAudienceVirtualWindow(rows.length);
  if(!force && start === audienceVirtualLastRange.start && end === audienceVirtualLastRange.end){
    return;
  }
  audienceVirtualLastRange = { start, end };

  const topHeight = start * AUDIENCE_VIRTUAL_ROW_HEIGHT;
  const bottomHeight = (rows.length - end) * AUDIENCE_VIRTUAL_ROW_HEIGHT;
  const topSpacer = topHeight > 0
    ? `<tr class="virtual-spacer"><td colspan="12" style="height:${topHeight}px"></td></tr>`
    : '';
  const bottomSpacer = bottomHeight > 0
    ? `<tr class="virtual-spacer"><td colspan="12" style="height:${bottomHeight}px"></td></tr>`
    : '';
  const rowsHtml = rows
    .slice(start, end)
    .map(row=>renderAudienceRowHtml(row, audienceVirtualDuplicateKeySet))
    .join('');
  body.innerHTML = `${topSpacer}${rowsHtml}${bottomSpacer}`;
}

function renderSuiviRowHtml(row){
  const displayDateAffectation = normalizeDateDDMMYYYY(row.d.dateAffectation || '') || '-';
  const isChecked = isSuiviSelectedForPrint(row);
  return `
    <tr>
      <td data-label="Sélection">
        <input
          type="checkbox"
          class="audience-print-check"
          ${isChecked ? 'checked' : ''}
          onchange="toggleSuiviPrintSelection(${row.c.id}, ${row.index}, this.checked)">
      </td>
      <td data-label="Client">${escapeHtml(row.c.name)}</td>
      <td data-label="Date d’affectation">${escapeHtml(displayDateAffectation)}</td>
      <td data-label="Référence Client">${escapeHtml(row.d.referenceClient || '-')}</td>
      <td class="procedure-cell" data-label="Procédure">${renderProcedureBadges(row.procSource)}</td>
      <td data-label="Débiteur">${escapeHtml(row.d.debiteur || '-')}</td>
      <td data-label="Montant">${escapeHtml(row.d.montant || '-')}</td>
      <td data-label="Ville">${escapeHtml(row.d.ville || '-')}</td>
      <td data-label="Statut">${renderStatusBadge(row.d.statut || 'En cours')}</td>
      <td data-label="Actions">
        <button type="button" class="btn-primary" data-action="view" data-client-id="${row.c.id}" data-dossier-index="${row.index}">
          <i class="fa-solid fa-eye"></i>
        </button>
        <button type="button" class="btn-primary" data-action="edit" data-client-id="${row.c.id}" data-dossier-index="${row.index}" ${canEditClient(row.c) ? '' : 'disabled'}>
          <i class="fa-solid fa-pen"></i>
        </button>
        <button type="button" class="btn-danger" data-action="delete" data-client-id="${row.c.id}" data-dossier-index="${row.index}" ${canDeleteData() ? '' : 'disabled'}>
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>
  `;
}

function renderSuiviVirtualWindow(force = false){
  const body = $('suiviBody');
  if(!body) return;
  const rows = Array.isArray(suiviVirtualRows) ? suiviVirtualRows : [];
  if(!rows.length){
    suiviVirtualLastRange = { start: -1, end: -1 };
    body.innerHTML = '<tr><td colspan="10" class="diligence-empty">Aucun dossier trouvé avec ces filtres.</td></tr>';
    return;
  }
  const { start, end } = getVirtualWindowByContainer('suiviTableContainer', rows.length);
  if(!force && start === suiviVirtualLastRange.start && end === suiviVirtualLastRange.end) return;
  suiviVirtualLastRange = { start, end };

  const topHeight = start * AUDIENCE_VIRTUAL_ROW_HEIGHT;
  const bottomHeight = (rows.length - end) * AUDIENCE_VIRTUAL_ROW_HEIGHT;
  const topSpacer = topHeight > 0
    ? `<tr class="virtual-spacer"><td colspan="10" style="height:${topHeight}px"></td></tr>`
    : '';
  const bottomSpacer = bottomHeight > 0
    ? `<tr class="virtual-spacer"><td colspan="10" style="height:${bottomHeight}px"></td></tr>`
    : '';
  const rowsHtml = rows.slice(start, end).map(renderSuiviRowHtml).join('');
  body.innerHTML = `${topSpacer}${rowsHtml}${bottomSpacer}`;
}

function queueSuiviVirtualRender(){
  if(suiviVirtualRafId) return;
  suiviVirtualRafId = window.requestAnimationFrame(()=>{
    suiviVirtualRafId = null;
    renderSuiviVirtualWindow();
  });
}

function renderSuivi(options = {}){
  if(!shouldRenderDeferredSection('suivi', options)) return;
  const q = $('filterGlobal')?.value?.toLowerCase() || '';
  const suiviFilterKey = [q, filterSuiviProcedure, filterSuiviTribunal].join('||');
  syncPaginationFilterState('suivi', suiviFilterKey);
  const suiviBody = $('suiviBody');
  if(!suiviBody) return;
  suiviBody.innerHTML='';
  if(!isManager() && getVisibleClients().length === 0){
    suiviVirtualRows = [];
    suiviVirtualLastRange = { start: -1, end: -1 };
    suiviBody.innerHTML = '<tr><td colspan="10" class="diligence-empty">Aucun client assigné à ce compte. Contactez le gestionnaire.</td></tr>';
    renderPagination('suivi', { totalRows: 0, page: 1, totalPages: 1, from: 0, to: 0 });
    return;
  }
  const base = getSuiviBaseRowsCached();
  suiviTribunalAliasMap = base.tribunalState.aliasMap;
  const noProcedureFilter = filterSuiviProcedure === 'all';
  const noTribunalFilter = filterSuiviTribunal === 'all';
  const noSearchFilter = !q;
  const finalizeSuiviRender = (sortedRows)=>{
    syncSuiviPrintSelection(sortedRows);
    const pageData = paginateRows(sortedRows, 'suivi');
    const useVirtual = pageData.rows.length >= SUIVI_VIRTUAL_MIN_ROWS;
    suiviVirtualRows = pageData.rows;
    suiviVirtualLastRange = { start: -1, end: -1 };
    if(!pageData.rows.length){
      suiviBody.innerHTML = '<tr><td colspan="10" class="diligence-empty">Aucun dossier trouvé avec ces filtres.</td></tr>';
    }else if(useVirtual){
      renderSuiviVirtualWindow(true);
    }else{
      suiviBody.innerHTML = pageData.rows.map(renderSuiviRowHtml).join('');
    }
    renderPagination('suivi', pageData);
    updateSuiviCheckedCount();
    syncSuiviFilterOptions(base.rowsMeta);
  };
  let sortedRows = [];
  if(base === suiviFilteredRowsCacheSource && suiviFilterKey === suiviFilteredRowsCacheKey){
    sortedRows = suiviFilteredRowsCacheOutput;
  }else if(noProcedureFilter && noTribunalFilter && noSearchFilter){
    sortedRows = base.sortedDefaultRows;
    suiviFilteredRowsCacheSource = base;
    suiviFilteredRowsCacheKey = suiviFilterKey;
    suiviFilteredRowsCacheOutput = sortedRows;
  }else if(!noSearchFilter && base.rawRows.length >= 1500 && !!getSuiviFilterWorker()){
    const narrowedRows = base.rawRows.filter(row=>{
      const tribunalKeys = row.tribunalKeys || [];
      if(!noProcedureFilter && !row.procSet.has(filterSuiviProcedure)) return false;
      if(!noTribunalFilter && !tribunalKeys.includes(filterSuiviTribunal)) return false;
      return true;
    });
    const requestId = ++suiviFilterRequestSeq;
    suiviBody.innerHTML = '<tr><td colspan="10" class="diligence-empty">Recherche dossier en cours...</td></tr>';
    runSuiviFilterInWorker(
      narrowedRows.map((row, idx)=>({
        idx,
        haystack: row.__suiviHaystack
          || (row.__suiviHaystack = buildSuiviSearchHaystack(
            row.c.name,
            row.d,
            row.procSource,
            (row.tribunalList && row.tribunalList.length) ? row.tribunalList : row.tribunalLabels
          ))
      })),
      q,
      requestId
    )
      .then((filteredIndexes)=>{
        const currentStateKey = [
          $('filterGlobal')?.value?.toLowerCase() || '',
          filterSuiviProcedure,
          filterSuiviTribunal
        ].join('||');
        if(requestId !== suiviFilterRequestSeq) return;
        if(currentStateKey !== suiviFilterKey) return;
        let nextRows;
        if(Array.isArray(filteredIndexes)){
          nextRows = filteredIndexes.map(idx=>narrowedRows[idx]).filter(Boolean);
        }else{
          nextRows = narrowedRows.filter(row=>{
            const haystack = row.__suiviHaystack
              || (row.__suiviHaystack = buildSuiviSearchHaystack(
                row.c.name,
                row.d,
                row.procSource,
                (row.tribunalList && row.tribunalList.length) ? row.tribunalList : row.tribunalLabels
              ));
            return haystack.includes(q);
          });
        }
        const duplicatePairCounts = new Map();
        nextRows.forEach(row=>{
          const key = buildSuiviRefDebiteurKey(row);
          if(!key) return;
          duplicatePairCounts.set(key, (duplicatePairCounts.get(key) || 0) + 1);
        });
        const nextSortedRows = nextRows
          .slice()
          .sort((a, b)=>compareSuiviRowsByReferenceProximity(a, b, duplicatePairCounts));
        suiviFilteredRowsCacheSource = base;
        suiviFilteredRowsCacheKey = suiviFilterKey;
        suiviFilteredRowsCacheOutput = nextSortedRows;
        finalizeSuiviRender(nextSortedRows);
      })
      .catch(()=>{
        if(requestId !== suiviFilterRequestSeq) return;
        renderSuivi();
      });
    return;
  }else{
    const filteredRows = [];
    base.rawRows.forEach(row=>{
      const tribunalKeys = row.tribunalKeys || [];
      if(!noProcedureFilter && !row.procSet.has(filterSuiviProcedure)) return;
      if(!noTribunalFilter && !tribunalKeys.includes(filterSuiviTribunal)) return;
      if(!noSearchFilter){
        const haystack = row.__suiviHaystack
          || (row.__suiviHaystack = buildSuiviSearchHaystack(
            row.c.name,
            row.d,
            row.procSource,
            (row.tribunalList && row.tribunalList.length) ? row.tribunalList : row.tribunalLabels
          ));
        if(!haystack.includes(q)) return;
      }
      filteredRows.push(row);
    });

    const duplicatePairCounts = new Map();
    filteredRows.forEach(row=>{
      const key = buildSuiviRefDebiteurKey(row);
      if(!key) return;
      duplicatePairCounts.set(key, (duplicatePairCounts.get(key) || 0) + 1);
    });
    sortedRows = filteredRows
      .slice()
      .sort((a, b)=>compareSuiviRowsByReferenceProximity(a, b, duplicatePairCounts));
    suiviFilteredRowsCacheSource = base;
    suiviFilteredRowsCacheKey = suiviFilterKey;
    suiviFilteredRowsCacheOutput = sortedRows;
  }
  finalizeSuiviRender(sortedRows);
}

function renderAudience(options = {}){
  if(!shouldRenderDeferredSection('audience', options)) return;
  const audienceQuery = $('filterAudience')?.value?.toLowerCase() || '';
  const audienceFilterStateKey = [
    audienceQuery,
    filterAudienceColor,
    filterAudienceProcedure,
    filterAudienceTribunal,
    filterAudienceDate,
    filterAudienceErrorsOnly ? '1' : '0',
    selectedAudienceColor
  ].join('||');
  syncPaginationFilterState(
    'audience',
    audienceFilterStateKey
  );
  const body = $('audienceBody');
  if(!body){
    queueSidebarSalleSessionsRender();
    return;
  }
  body.innerHTML='';
  if(!isManager() && getVisibleClients().length === 0){
    audienceVirtualRows = [];
    audienceVirtualDuplicateKeySet = new Set();
    audienceVirtualLastRange = { start: -1, end: -1 };
    body.innerHTML = '<tr><td colspan="12" class="diligence-empty">Aucun client assigné à ce compte. Contactez le gestionnaire.</td></tr>';
    renderPagination('audience', { totalRows: 0, page: 1, totalPages: 1, from: 0, to: 0 });
    updateAudienceCheckedCount();
    queueSidebarSalleSessionsRender();
    return;
  }

  const finalizeAudienceRender = (allRows)=>{
    const selectionPruned = pruneAudiencePrintSelection(allRows);
    syncAudienceFilterOptions(allRows);
    const duplicateKeySet = getAudienceDuplicateKeySet(allRows);
    const rows = getFilteredAudienceRows(allRows);
    lastAudienceRenderedRows = rows;
    const pageData = paginateRows(rows, 'audience');
    const useVirtual = shouldUseAudienceVirtualization(pageData.rows.length);
    audienceVirtualRows = pageData.rows;
    audienceVirtualDuplicateKeySet = duplicateKeySet;
    audienceVirtualLastRange = { start: -1, end: -1 };
    if(!pageData.rows.length){
      body.innerHTML = '<tr><td colspan="12" class="diligence-empty">Aucune audience trouvée avec ces filtres.</td></tr>';
    }else if(useVirtual){
      renderAudienceVirtualWindow(true);
    }else{
      body.innerHTML = pageData.rows.map(row=>renderAudienceRowHtml(row, duplicateKeySet)).join('');
    }
    renderPagination('audience', pageData);
    if(selectionPruned){
      queueAudienceCheckedCountRender();
    }else{
      updateAudienceCheckedCount();
    }
    queueSidebarSalleSessionsRender();
  };

  const baseRows = getAudienceRowsDedupedCached();
  const colorFilteredRows = filterAudienceColor === 'all'
    ? baseRows
    : baseRows.filter(row=>String(row?.p?.color || '').trim() === filterAudienceColor);
  const canUseWorker = (
    !!audienceQuery
    && audienceQuery.length >= 2
    && colorFilteredRows.length >= 1500
    && !!getAudienceFilterWorker()
  );
  if(!canUseWorker){
    finalizeAudienceRender(getAudienceRows());
    return;
  }

  const requestId = ++audienceFilterRequestSeq;
  body.innerHTML = '<tr><td colspan="12" class="diligence-empty">Recherche audience en cours...</td></tr>';
  runAudienceFilterInWorker(
    colorFilteredRows.map((row, idx)=>({
      idx,
      haystack: row.__haystack || (row.__haystack = buildAudienceSearchHaystack(row.c?.name, row.d, row.procKey, row.p, row.draft))
    })),
    audienceQuery,
    requestId
  )
    .then((filteredIndexes)=>{
      const currentStateKey = [
        $('filterAudience')?.value?.toLowerCase() || '',
        filterAudienceColor,
        filterAudienceProcedure,
        filterAudienceTribunal,
        filterAudienceDate,
        filterAudienceErrorsOnly ? '1' : '0',
        selectedAudienceColor
      ].join('||');
      if(requestId !== audienceFilterRequestSeq) return;
      if(currentStateKey !== audienceFilterStateKey) return;
      if(!Array.isArray(filteredIndexes)){
        finalizeAudienceRender(getAudienceRows());
        return;
      }
      finalizeAudienceRender(filteredIndexes.map(idx=>colorFilteredRows[idx]).filter(Boolean));
    })
    .catch(()=>{
      if(requestId !== audienceFilterRequestSeq) return;
      finalizeAudienceRender(getAudienceRows());
    });
}

function shouldUseAudienceVirtualization(rowCount){
  if(Number(rowCount) < AUDIENCE_VIRTUAL_MIN_ROWS) return false;
  const container = $('audienceTableContainer');
  if(!container) return false;
  if(typeof window === 'undefined' || typeof window.getComputedStyle !== 'function'){
    return false;
  }
  const style = window.getComputedStyle(container);
  const overflowY = String(style.overflowY || '').toLowerCase();
  const maxHeight = String(style.maxHeight || '').trim().toLowerCase();
  const height = String(style.height || '').trim().toLowerCase();
  const hasConstrainedHeight = (maxHeight && maxHeight !== 'none') || (height && height !== 'auto');
  if(!hasConstrainedHeight) return false;
  return overflowY === 'auto' || overflowY === 'scroll';
}

function captureAudienceScrollState(){
  const container = $('audienceTableContainer');
  return {
    containerTop: container ? Number(container.scrollTop) || 0 : null,
    containerLeft: container ? Number(container.scrollLeft) || 0 : null,
    pageX: (typeof window !== 'undefined' ? Number(window.scrollX) : 0) || 0,
    pageY: (typeof window !== 'undefined' ? Number(window.scrollY) : 0) || 0
  };
}

function restoreAudienceScrollState(snapshot){
  if(!snapshot || typeof snapshot !== 'object') return;
  const container = $('audienceTableContainer');
  if(container && Number.isFinite(snapshot.containerTop)){
    container.scrollTop = Math.max(0, snapshot.containerTop);
    if(Number.isFinite(snapshot.containerLeft)){
      container.scrollLeft = Math.max(0, snapshot.containerLeft);
    }
    if(Array.isArray(audienceVirtualRows) && audienceVirtualRows.length >= AUDIENCE_VIRTUAL_MIN_ROWS){
      queueAudienceVirtualRender();
    }
  }
  if(typeof window !== 'undefined' && typeof window.scrollTo === 'function'){
    window.scrollTo(snapshot.pageX || 0, snapshot.pageY || 0);
  }
}

function renderAudienceKeepingPosition(){
  const snapshot = captureAudienceScrollState();
  renderAudience();
  const apply = ()=>restoreAudienceScrollState(snapshot);
  if(typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'){
    window.requestAnimationFrame(()=>window.requestAnimationFrame(apply));
    return;
  }
  setTimeout(apply, 0);
}
