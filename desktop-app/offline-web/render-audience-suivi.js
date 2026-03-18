const AUDIENCE_EMPTY_MESSAGE = 'Aucune audience trouvée avec ces filtres.';
const AUDIENCE_LOADING_MESSAGE = 'Recherche audience en cours...';
const AUDIENCE_NO_CLIENT_MESSAGE = 'Aucun client assigné à ce compte. Contactez le gestionnaire.';
const SUIVI_EMPTY_MESSAGE = 'Aucun dossier trouvé avec ces filtres.';
const SUIVI_LOADING_MESSAGE = 'Recherche dossier en cours...';
const SUIVI_NO_CLIENT_MESSAGE = 'Aucun client assigné à ce compte. Contactez le gestionnaire.';

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
  const safeColor = getAudienceRowEffectiveColor(row);
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
        <input class="${isMissingGlobal ? 'audience-ref-missing' : ''}" value="${escapeAttr(getAudienceRowDraftReferenceValue(row))}" ${canEdit ? '' : 'readonly'} oninput="updateAudienceDraftFromEncoded('${keyEncoded}','refDossier',this.value)">
        ${isMissingGlobal ? '<div class="audience-inline-error">Introuvable dans dossier global</div>' : ''}
      </td>
      <td data-label="Date d’audience"><input value="${escapeAttr(audienceDateValue)}" ${canEdit ? '' : 'readonly'} oninput="updateAudienceDraftFromEncoded('${keyEncoded}','dateAudience',this.value)" onblur="normalizeAudienceDateDraftInputFromEncoded('${keyEncoded}', this)"></td>
      <td data-label="Juge"><input value="${escapeAttr(draft.juge || p.juge || '')}" ${canEdit ? '' : 'readonly'} oninput="updateAudienceDraftFromEncoded('${keyEncoded}','juge',this.value)"></td>
      <td data-label="Sort"><input value="${escapeAttr(draft.sort || p.sort || '')}" ${canEdit ? '' : 'readonly'} oninput="updateAudienceDraftFromEncoded('${keyEncoded}','sort',this.value)"></td>
      <td data-label="Tribunal">${escapeHtml(p.tribunal || '-')}</td>
      <td data-label="Procédure">${escapeHtml(procKey || '-')}</td>
      <td data-label="Date dépôt">${escapeHtml(displayDateDepot)}</td>
      <td data-label="Statut">${renderStatusDisplay(d.statut || 'En cours', d.statutDetails || '')}</td>
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
    renderTableMessage(body, 13, AUDIENCE_EMPTY_MESSAGE, 'audience-empty');
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
    ? `<tr class="virtual-spacer"><td colspan="13" style="height:${topHeight}px"></td></tr>`
    : '';
  const bottomSpacer = bottomHeight > 0
    ? `<tr class="virtual-spacer"><td colspan="13" style="height:${bottomHeight}px"></td></tr>`
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
      <td data-label="Statut">${renderStatusDisplay(row.d.statut || 'En cours', row.d.statutDetails || '')}</td>
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
    renderTableMessage(body, 10, SUIVI_EMPTY_MESSAGE, 'suivi-empty');
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

function orderSuiviRowsByCheckedSelection(rows){
  if(!filterSuiviCheckedFirst || !Array.isArray(rows) || rows.length < 2) return rows;
  const checkedRows = [];
  const otherRows = [];
  rows.forEach(row=>{
    if(isSuiviSelectedForPrint(row)){
      checkedRows.push(row);
    }else{
      otherRows.push(row);
    }
  });
  return checkedRows.concat(otherRows);
}

function renderSuivi(options = {}){
  if(!shouldRenderDeferredSection('suivi', options)) return;
  const q = $('filterGlobal')?.value?.toLowerCase() || '';
  const suiviFilterCacheKey = [q, filterSuiviProcedure, filterSuiviTribunal].join('||');
  const suiviRenderStateKey = [suiviFilterCacheKey, filterSuiviCheckedFirst ? 'checked-first' : 'default'].join('||');
  syncPaginationFilterState('suivi', suiviRenderStateKey);
  const suiviBody = $('suiviBody');
  if(!suiviBody) return;
  if(!isManager() && getVisibleClients().length === 0){
    suiviVirtualRows = [];
    suiviVirtualLastRange = { start: -1, end: -1 };
    renderTableMessage(suiviBody, 10, SUIVI_NO_CLIENT_MESSAGE, 'suivi-no-client');
    renderPagination('suivi', { totalRows: 0, page: 1, totalPages: 1, from: 0, to: 0 });
    updateSuiviCheckedCount();
    return;
  }
  const base = getSuiviBaseRowsCached();
  suiviTribunalAliasMap = base.tribunalState.aliasMap;
  const noProcedureFilter = filterSuiviProcedure === 'all';
  const noTribunalFilter = filterSuiviTribunal === 'all';
  const noSearchFilter = !q;
  const finalizeSuiviRender = (sortedRows)=>{
    const orderedRows = orderSuiviRowsByCheckedSelection(sortedRows);
    syncSuiviPrintSelection(base.sortedDefaultRows);
    const pageData = paginateRows(orderedRows, 'suivi');
    const useVirtual = pageData.rows.length >= SUIVI_VIRTUAL_MIN_ROWS;
    suiviVirtualRows = pageData.rows;
    suiviVirtualLastRange = { start: -1, end: -1 };
    if(!pageData.rows.length){
      renderTableMessage(suiviBody, 10, SUIVI_EMPTY_MESSAGE, 'suivi-empty');
    }else if(useVirtual){
      renderSuiviVirtualWindow(true);
    }else{
      setElementHtmlWithRenderKey(
        suiviBody,
        pageData.rows.map(renderSuiviRowHtml).join(''),
        [
          'suivi-rows',
          audienceRowsRawDataVersion,
          suiviPrintSelectionVersion,
          pageData.page,
          pageData.rows.length,
          suiviRenderStateKey
        ].join('::'),
        { trustRenderKey: true }
      );
    }
    renderPagination('suivi', pageData);
    updateSuiviCheckedCount();
    syncSuiviFilterOptions(base.rowsMeta);
  };
  const queueFinalizeSuiviRender = (rows, expectedStateKey = suiviRenderStateKey, expectedRequestId = null)=>{
    const run = ()=>{
      const currentStateKey = [
        $('filterGlobal')?.value?.toLowerCase() || '',
        filterSuiviProcedure,
        filterSuiviTribunal,
        filterSuiviCheckedFirst ? 'checked-first' : 'default'
      ].join('||');
      if(currentStateKey !== expectedStateKey) return;
      if(expectedRequestId !== null && expectedRequestId !== suiviFilterRequestSeq) return;
      finalizeSuiviRender(rows);
    };
    if(!shouldDeferHeavySectionRender(rows.length, options)){
      run();
      return;
    }
    scheduleDeferredSectionRender('suivi', run, {
      delayMs: 60,
      onPending: ()=>renderTableMessage(suiviBody, 10, SUIVI_LOADING_MESSAGE, 'suivi-loading')
    });
  };
  let sortedRows = [];
  if(base === suiviFilteredRowsCacheSource && suiviFilterCacheKey === suiviFilteredRowsCacheKey){
    sortedRows = suiviFilteredRowsCacheOutput;
  }else if(noProcedureFilter && noTribunalFilter && noSearchFilter){
    sortedRows = base.sortedDefaultRows;
    suiviFilteredRowsCacheSource = base;
    suiviFilteredRowsCacheKey = suiviFilterCacheKey;
    suiviFilteredRowsCacheOutput = sortedRows;
  }else if(!noSearchFilter && base.rawRows.length >= 1500 && !!getSuiviFilterWorker()){
    const narrowedRows = base.rawRows.filter(row=>{
      const tribunalKeys = row.tribunalKeys || [];
      if(!noProcedureFilter && !row.procSet.has(filterSuiviProcedure)) return false;
      if(!noTribunalFilter && !tribunalKeys.includes(filterSuiviTribunal)) return false;
      return true;
    });
    const requestId = ++suiviFilterRequestSeq;
    renderTableMessage(suiviBody, 10, SUIVI_LOADING_MESSAGE, 'suivi-loading');
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
        if(currentStateKey !== suiviFilterCacheKey) return;
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
        suiviFilteredRowsCacheKey = suiviFilterCacheKey;
        suiviFilteredRowsCacheOutput = nextSortedRows;
        queueFinalizeSuiviRender(nextSortedRows, suiviRenderStateKey, requestId);
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
    suiviFilteredRowsCacheKey = suiviFilterCacheKey;
    suiviFilteredRowsCacheOutput = sortedRows;
  }
  queueFinalizeSuiviRender(sortedRows);
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
    filterAudienceCheckedFirst ? 'checked-first' : 'default',
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
  renderImportHistoryPanel('audienceImportHistory', 'audience');
  if(!isManager() && getVisibleClients().length === 0){
    audienceVirtualRows = [];
    audienceVirtualDuplicateKeySet = new Set();
    audienceVirtualLastRange = { start: -1, end: -1 };
    renderTableMessage(body, 13, AUDIENCE_NO_CLIENT_MESSAGE, 'audience-no-client');
    renderPagination('audience', { totalRows: 0, page: 1, totalPages: 1, from: 0, to: 0 });
    updateAudienceCheckedCount();
    queueSidebarSalleSessionsRender();
    return;
  }

  const finalizeAudienceRender = (allRows)=>{
    const selectionPruned = pruneAudiencePrintSelection(baseRows);
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
      renderTableMessage(body, 13, AUDIENCE_EMPTY_MESSAGE, 'audience-empty');
    }else if(useVirtual){
      renderAudienceVirtualWindow(true);
    }else{
      setElementHtmlWithRenderKey(
        body,
        pageData.rows.map(row=>renderAudienceRowHtml(row, duplicateKeySet)).join(''),
        [
          'audience-rows',
          audienceRowsRawDataVersion,
          audiencePrintSelectionVersion,
          pageData.page,
          pageData.rows.length,
          audienceFilterStateKey
        ].join('::'),
        { trustRenderKey: true }
      );
    }
    renderPagination('audience', pageData);
    if(selectionPruned){
      queueAudienceCheckedCountRender();
    }else{
      updateAudienceCheckedCount();
    }
    queueSidebarSalleSessionsRender();
  };
  const queueFinalizeAudienceRender = (rows, expectedStateKey = audienceFilterStateKey, expectedRequestId = null)=>{
    const run = ()=>{
      const currentStateKey = [
        $('filterAudience')?.value?.toLowerCase() || '',
        filterAudienceColor,
        filterAudienceProcedure,
        filterAudienceTribunal,
        filterAudienceDate,
        filterAudienceErrorsOnly ? '1' : '0',
        filterAudienceCheckedFirst ? 'checked-first' : 'default',
        selectedAudienceColor
      ].join('||');
      if(currentStateKey !== expectedStateKey) return;
      if(expectedRequestId !== null && expectedRequestId !== audienceFilterRequestSeq) return;
      finalizeAudienceRender(rows);
    };
    if(!shouldDeferHeavySectionRender(rows.length, options)){
      run();
      return;
    }
    scheduleDeferredSectionRender('audience', run, {
      delayMs: 60,
      onPending: ()=>renderTableMessage(body, 13, AUDIENCE_LOADING_MESSAGE, 'audience-loading')
    });
  };

  const baseRows = getAudienceRowsDedupedCached();
  const colorFilteredRows = filterAudienceColor === 'all'
    ? baseRows
    : baseRows.filter(row=>String(row?.p?.color || '').trim() === filterAudienceColor);
  const exactMatchedRows = audienceQuery
    ? getAudienceRowsByExactQuery(colorFilteredRows, audienceQuery)
    : null;
  const canUseWorker = (
    !!audienceQuery
    && !exactMatchedRows
    && audienceQuery.length >= 2
    && colorFilteredRows.length >= 1500
    && !!getAudienceFilterWorker()
  );
  if(!canUseWorker){
    if(exactMatchedRows){
      queueFinalizeAudienceRender(exactMatchedRows);
    }else{
      queueFinalizeAudienceRender(getAudienceRows());
    }
    return;
  }

  const requestId = ++audienceFilterRequestSeq;
  renderTableMessage(body, 13, AUDIENCE_LOADING_MESSAGE, 'audience-loading');
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
        filterAudienceCheckedFirst ? 'checked-first' : 'default',
        selectedAudienceColor
      ].join('||');
      if(requestId !== audienceFilterRequestSeq) return;
      if(currentStateKey !== audienceFilterStateKey) return;
      if(!Array.isArray(filteredIndexes)){
        queueFinalizeAudienceRender(getAudienceRows(), audienceFilterStateKey, requestId);
        return;
      }
      queueFinalizeAudienceRender(filteredIndexes.map(idx=>colorFilteredRows[idx]).filter(Boolean), audienceFilterStateKey, requestId);
    })
    .catch(()=>{
      if(requestId !== audienceFilterRequestSeq) return;
      queueFinalizeAudienceRender(getAudienceRows(), audienceFilterStateKey, requestId);
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
