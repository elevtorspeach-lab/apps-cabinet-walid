const DILIGENCE_EMPTY_MESSAGE = 'Aucun dossier ASS/SFDC/S-bien/Injonction/Commandement trouvé.';
const DILIGENCE_LOADING_MESSAGE = 'Recherche diligence en cours...';

function getDiligenceFilterStateKey(query){
  return [
    query,
    filterDiligenceProcedure,
    filterDiligenceSort,
    filterDiligenceDelegation,
    filterDiligenceOrdonnance,
    filterDiligenceTribunal,
    filterDiligenceCheckedFirst ? 'checked-first' : 'default'
  ].join('||');
}

function buildDiligenceStatusRowHtml(message, colCount = getDiligenceColCount()){
  return `<tr><td colspan="${colCount}" class="diligence-empty">${message}</td></tr>`;
}

function buildDiligenceStatusRowKey(prefix, colCount = getDiligenceColCount()){
  return `${prefix}::${colCount}`;
}

function setDiligenceStatusRow(body, message, keyPrefix, colCount = getDiligenceColCount()){
  setElementHtmlWithRenderKey(
    body,
    buildDiligenceStatusRowHtml(message, colCount),
    buildDiligenceStatusRowKey(keyPrefix, colCount)
  );
}

function buildDiligenceCountLabel(totalRows){
  const labels = [];
  labels.push(filterDiligenceProcedure === 'all' ? 'toutes les procédures' : `procédure: ${filterDiligenceProcedure}`);
  labels.push(filterDiligenceSort === 'all' ? 'tous les sorts' : `sort: ${filterDiligenceSort}`);
  labels.push(filterDiligenceDelegation === 'all' ? 'toutes les délégations' : `délégation: ${filterDiligenceDelegation}`);
  labels.push(filterDiligenceOrdonnance === 'all' ? 'toutes les ordonnances' : `ordonnance: ${getDiligenceOrdonnanceLabel(filterDiligenceOrdonnance)}`);
  labels.push(filterDiligenceTribunal === 'all' ? 'tous les tribunaux' : `tribunal: ${getDiligenceTribunalFilterLabel(filterDiligenceTribunal)}`);
  return `${totalRows} ligne(s) diligence (${labels.join(', ')})`;
}

function renderDiligenceRowsHtml(rows){
  try{
    const showPlieColumn = !!diligenceVirtualShowAssColumns;
    return rows.map(row=>renderDiligenceRowHtml(row, showPlieColumn)).join('');
  }catch(err){
    console.error('Erreur renderDiligenceRowsHtml:', err);
    return `<tr><td colspan="${getDiligenceColCount()}">Erreur d'affichage des lignes.</td></tr>`;
  }
}

function maybeApplyDiligenceAutoSizing(root = document){
  if(isVeryLargeLiveSyncMode()) return;
  applyDiligenceAutoSizing(root);
}

function shouldShowDiligenceAssColumns(rows){
  if(isDiligenceAssLikeProcedure(filterDiligenceProcedure)) return true;
  const list = Array.isArray(rows) ? rows : [];
  return !!list.length && list.every(row=>isDiligenceAssLikeProcedure(row?.procedure));
}

function shouldShowDiligenceCommandementColumns(rows){
  if(isDiligenceCommandementProcedure(filterDiligenceProcedure)) return true;
  const list = Array.isArray(rows) ? rows : [];
  return !!list.length && list.every(row=>isDiligenceCommandementProcedure(row?.procedure));
}

function shouldShowDiligenceSaisieArretColumns(rows){
  if(isDiligenceSaisieArretProcedure(filterDiligenceProcedure)) return true;
  const list = Array.isArray(rows) ? rows : [];
  return !!list.length && list.every(row=>isDiligenceSaisieArretProcedure(row?.procedure));
}

function shouldShowDiligenceNantissementMedColumns(rows){
  if(isDiligenceNantissementMedProcedure(filterDiligenceProcedure)) return true;
  const list = Array.isArray(rows) ? rows : [];
  return !!list.length && list.every(row=>isDiligenceNantissementMedProcedure(row?.procedure));
}

function getDiligenceColCount(){
  if(diligenceVirtualCompactProcedureMode === 'nantissementmed') return 12;
  if(diligenceVirtualCompactProcedureMode === 'saisiearret') return 25;
  if(diligenceVirtualShowCommandementColumns){
    const cmdMode = getDiligenceCommandementHeaderMode(diligenceVirtualRows);
    if(cmdMode !== 'default') return 24;
    return 17;
  }
  if(diligenceVirtualCompactProcedureMode === 'sbien') return 14;
  if(diligenceVirtualCompactProcedureMode === 'sfdc') return 13;
  if(diligenceVirtualShowAssColumns){
    const assMode = getDiligenceAssHeaderMode(diligenceVirtualRows);
    const hasNantissementCurateurNotifie = Array.isArray(diligenceVirtualRows) && diligenceVirtualRows.some(row => isDiligenceNantissementCurateurNotifieLayout(row));
    const hasAssCurateurNotifie = Array.isArray(diligenceVirtualRows) && diligenceVirtualRows.some(row => isDiligenceAssCurateurNotifieLayout(row));
    const curateurExtraCols = hasNantissementCurateurNotifie ? 3 : (hasAssCurateurNotifie ? 2 : 0);
    if(assMode !== 'default') return 25 + curateurExtraCols;
    if(curateurExtraCols) return 21 + curateurExtraCols;
    const hasNotifier = Array.isArray(diligenceVirtualRows) && diligenceVirtualRows.some(row => isDiligenceAssNotifierLayout(row));
    return hasNotifier ? 25 : 18;
  }
  return 17;
}

function getDiligenceCompactProcedureMode(rows = []){
  if(diligenceVirtualShowCommandementColumns || diligenceVirtualShowAssColumns) return 'mixed';
  const explicitFilter = getDiligenceProcedureFilterValue(filterDiligenceProcedure);
  if(explicitFilter === 'SFDC') return 'sfdc';
  if(explicitFilter === 'SAISIE ARRÊT') return 'saisiearret';
  if(explicitFilter === 'S/bien') return 'sbien';
  if(explicitFilter === 'Injonction') return 'injonction';
  if(explicitFilter === 'Nantissement MED') return 'nantissementmed';
  const list = Array.isArray(rows) ? rows : [];
  if(list.length && list.every(row=>isDiligenceNantissementMedProcedure(row?.procedure))) return 'nantissementmed';
  const executionTypes = [...new Set(
    list
      .map(row=>getDiligenceProcedureFilterValue(row?.procedureFilterValue || row?.procedure || ''))
      .filter(value=>value === 'SFDC' || value === 'SAISIE ARRÊT' || value === 'S/bien' || value === 'Injonction')
  )];
  if(executionTypes.length !== 1) return 'mixed';
  if(executionTypes[0] === 'SFDC') return 'sfdc';
  if(executionTypes[0] === 'SAISIE ARRÊT') return 'saisiearret';
  if(executionTypes[0] === 'S/bien') return 'sbien';
  if(executionTypes[0] === 'Injonction') return 'injonction';
  return 'mixed';
}

function buildDiligenceHeadHtml(){
  if(diligenceVirtualCompactProcedureMode === 'nantissementmed'){
    if(getDiligenceNantissementMedHeaderMode(diligenceVirtualRows) === 'notifier'){
      return `
        <th>Client</th>
        <th>R&eacute;f&eacute;rence client</th>
        <th>Avis curateur</th>
        <th>PV Police</th>
        <th>Certificat non appel</th>
        <th>Execution N&deg;</th>
        <th>Ville</th>
        <th>D&eacute;l&eacute;gation</th>
        <th>Huissier</th>
        <th>Sort ex&eacute;cution</th>
        <th>Tribunal</th>
        <th>Bo&icirc;te N&deg;</th>
      `;
    }
    return `
      <th>Client</th>
      <th>R&eacute;f&eacute;rence client</th>
      <th>Date curateur</th>
      <th>R&eacute;f&eacute;rence curateur</th>
      <th>ORD</th>
      <th>Sort ORD</th>
      <th>Notif N&deg;</th>
      <th>Sort notif</th>
      <th>Avis curateur</th>
      <th>PV POLICE</th>
      <th>Ville</th>
      <th>Tribunal</th>
    `;
  }
  if(diligenceVirtualCompactProcedureMode === 'saisiearret'){
    return `
      <th>Client</th>
      <th>R&eacute;f&eacute;rence client</th>
      <th>Lot du</th>
      <th>Gestionnaire</th>
      <th>D&eacute;biteur FR</th>
      <th>D&eacute;biteur AR</th>
      <th>CIN/RC</th>
      <th>Adresse</th>
      <th>Ville</th>
      <th>Montant</th>
      <th>RIB</th>
      <th>Banque / STE FR</th>
      <th>Banque / STE AR</th>
      <th>Adresse Banque</th>
      <th>Avocat</th>
      <th>Observation</th>
      <th>D&eacute;p&ocirc;t</th>
      <th>Ref dossier</th>
      <th>Sort ORD</th>
      <th>Execution N&deg;</th>
      <th>Sort plie</th>
      <th>Notif banque</th>
      <th>Notif d&eacute;biteur</th>
      <th>Tribunal</th>
      <th>Bo&icirc;te</th>
    `;
  }
  if(diligenceVirtualShowCommandementColumns){
    const cmdMode = getDiligenceCommandementHeaderMode(diligenceVirtualRows);
    const cmdExpanded = cmdMode !== 'default';
    return `
      <th>Client</th>
      <th>Type</th>
      <th>Référence client</th>
      <th>Nom</th>
      <th>Référence dossier</th>
      <th>Date dépôt</th>
      <th>Execution N°</th>
      <th>Plie</th>
      <th>Pub au journal</th>
      <th>Notif Conservateur</th>
      <th>Notif débiteur</th>
      ${cmdExpanded ? '<th>Lettre Rec</th><th>Curateur N°</th><th>ORD</th><th>Notif curateur</th><th>Sort notif</th><th>Avis curateur</th><th>PV Police</th>' : ''}
      <th>Ref expertise</th>
      <th>Ord</th>
      <th>Expert</th>
      <th>Mise a prix</th>
      <th>Date vente</th>
      <th>Tribunal</th>
      <th>Boîte N°</th>
    `;
  }
  const assHeaderMode = diligenceVirtualShowAssColumns
    ? getDiligenceAssHeaderMode(diligenceVirtualRows)
    : 'default';
  const showAssFollowupColumns = diligenceVirtualShowAssColumns && assHeaderMode !== 'default';
  const hasNantissementCurateurNotifieRows = diligenceVirtualShowAssColumns && Array.isArray(diligenceVirtualRows) && diligenceVirtualRows.some(row => isDiligenceNantissementCurateurNotifieLayout(row));
  const hasAssCurateurNotifieRows = diligenceVirtualShowAssColumns && Array.isArray(diligenceVirtualRows) && diligenceVirtualRows.some(row => isDiligenceAssCurateurNotifieLayout(row));
  const hasNotifierRows = diligenceVirtualShowAssColumns && Array.isArray(diligenceVirtualRows) && diligenceVirtualRows.some(row => isDiligenceAssNotifierLayout(row));
  const showCurateurNotifieSortColumn = hasNantissementCurateurNotifieRows;
  const showCurateurNotifieAvisPvColumns = hasNantissementCurateurNotifieRows || hasAssCurateurNotifieRows;
  const showStandardContinuation = showAssFollowupColumns || hasNotifierRows || hasNantissementCurateurNotifieRows || hasAssCurateurNotifieRows;
  const avisHeader = (diligenceVirtualShowAssColumns && !showStandardContinuation) ? '' : 'Sort exécution';
  const compactMode = diligenceVirtualCompactProcedureMode;
  const showCompactInjonctionColumns = !diligenceVirtualShowAssColumns && compactMode !== 'sfdc' && compactMode !== 'sbien';
  const showSharedNotificationColumns = diligenceVirtualShowAssColumns || showCompactInjonctionColumns;
  return `
    <th>Client</th>
    <th>Type</th>
    <th>Référence client</th>
    <th>Nom</th>
    <th>Date dépôt</th>
    <th>Référence dossier</th>
    ${diligenceVirtualShowAssColumns ? '<th>Juge</th><th>Sort</th>' : ''}
    <th>Ordonnance</th>
    ${showSharedNotificationColumns ? `<th>Notification N°</th>${diligenceVirtualShowAssColumns ? '<th>Plie</th>' : ''}<th>Sort notification</th><th>Observation</th>` : ''}
    ${showAssFollowupColumns ? '<th>Lettre Rec</th><th>Curateur N°</th><th>ORD</th><th>Notif curateur</th><th>Sort notif</th><th>Avis curateur</th><th>PV Police</th>' : ''}
    ${showCurateurNotifieSortColumn ? '<th>Sort notif</th>' : ''}
    ${showCurateurNotifieAvisPvColumns ? '<th>Avis curateur</th><th>PV Police</th>' : ''}
    ${showStandardContinuation ? '<th>Certificat non appel</th>' : (showSharedNotificationColumns && !diligenceVirtualShowAssColumns ? '<th>Certificat non appel</th>' : '')}
    ${diligenceVirtualShowAssColumns ? (showStandardContinuation ? '<th>Execution N°</th>' : '') : '<th>Execution N°</th>'}
    ${diligenceVirtualShowAssColumns ? (showStandardContinuation ? '<th>Ville</th>' : '') : '<th>Ville</th>'}
    ${diligenceVirtualShowAssColumns ? (showStandardContinuation ? '<th>Délégation</th>' : '') : '<th>Délégation</th>'}
    ${diligenceVirtualShowAssColumns ? (showStandardContinuation ? '<th>Huissier</th>' : '') : '<th>Huissier</th>'}
    ${avisHeader ? `<th>${avisHeader}</th>` : ''}
    ${compactMode === 'sbien' ? '<th>Date execution</th>' : ''}
    <th>Tribunal</th>
    <th>Boîte N°</th>
  `;
}

function renderDiligenceRowHtml(row, showPlieColumn){
  const rowAttrs = `data-client-id="${row.clientId}" data-dossier-index="${row.dossierIndex}" data-proc-key="${escapeAttr(String(row.procedure || ''))}"`;
  const procEncoded = encodeURIComponent(String(row.procedure || ''));
  const isAssProcedure = isDiligenceAssProcedure(row?.procedure);
  const isAssLikeProcedure = isDiligenceAssLikeProcedure(row?.procedure);
  const isCommandementProcedure = isDiligenceCommandementProcedure(row?.procedure);
  const isSaisieArretProcedure = isDiligenceSaisieArretProcedure(row?.procedure);
  const isChecked = isDiligenceSelectedForPrint(row);
  const refClientValue = typeof getDiligenceGroupedReferenceClientDisplay === 'function'
    ? getDiligenceGroupedReferenceClientDisplay(row)
    : (row.dossier?.referenceClient || '');
  const refField = isCommandementProcedure ? 'refExpertise' : 'referenceClient';
  const refValue = getDiligenceReferenceDossierValue(row);
  const judgeValue = row.details?.juge || '';
  const sortValue = row.details?.sort || '';
  const ordField = isCommandementProcedure ? 'ord' : 'attOrdOrOrdOk';
  const ordValue = isCommandementProcedure
    ? (row.details?.ord || '')
    : getDiligenceOrdonnanceStatus(
      row.details?.attOrdOrOrdOk || row.details?._audienceSortOrd || '',
      row.details?.notificationNo || ''
    );
  const notificationSortField = isCommandementProcedure ? 'notifDebiteur' : 'notificationSort';
  const notificationSortValue = isCommandementProcedure
    ? (row.details?.notifDebiteur || '')
    : (row.details?.notificationSort || '');
  const notificationNoField = isCommandementProcedure ? 'notifConservateur' : 'notificationNo';
  const notificationNoValue = isCommandementProcedure
    ? (row.details?.notifConservateur || '')
    : (row.details?.notificationNo || '');
  const certificatNonAppelValue = row.details?.certificatNonAppelStatus || '';
  const executionValue = row.details?.executionNo || '';
  const villeValue = row.dossier?.ville || '';
  const delegationField = isCommandementProcedure ? 'dateVente' : 'attDelegationOuDelegat';
  const delegationValue = isCommandementProcedure
    ? (row.details?.dateVente || '')
    : (row.details?.attDelegationOuDelegat || '');
  const huissierField = isCommandementProcedure ? 'expert' : 'huissier';
  const huissierValue = isCommandementProcedure
    ? (row.details?.expert || '')
    : (row.details?.huissier || '');
  const executionSortValue = !isAssLikeProcedure || isDiligenceNantissementCurateurNotifieLayout(row) ? (row.details?.sort || '') : '';
  const pvPliceValue = row.details?.pvPlice || '';
  const tribunalValue = getDiligenceTribunalCellValue(row);
  const showCompactInjonctionColumns = !diligenceVirtualShowAssColumns
    && !isCommandementProcedure
    && diligenceVirtualCompactProcedureMode !== 'sfdc'
    && diligenceVirtualCompactProcedureMode !== 'sbien';
  const showSharedNotificationColumns = isAssLikeProcedure || showCompactInjonctionColumns;
  const assHeaderMode = diligenceVirtualShowAssColumns
    ? getDiligenceAssHeaderMode(diligenceVirtualRows)
    : 'default';
  const showAssFollowupColumns = isAssLikeProcedure && assHeaderMode !== 'default';
  const isAssNbLayoutValue = isDiligenceAssNbLayout(row);
  const isAssNotifierLayoutValue = isDiligenceAssNotifierLayout(row);
  const isNantissementCurateurNotifieLayoutValue = isDiligenceNantissementCurateurNotifieLayout(row);
  const isAssCurateurNotifieLayoutValue = isDiligenceAssCurateurNotifieLayout(row);
  const hasNantissementCurateurNotifieRows = diligenceVirtualShowAssColumns && Array.isArray(diligenceVirtualRows) && diligenceVirtualRows.some(item => isDiligenceNantissementCurateurNotifieLayout(item));
  const hasAssCurateurNotifieRows = diligenceVirtualShowAssColumns && Array.isArray(diligenceVirtualRows) && diligenceVirtualRows.some(item => isDiligenceAssCurateurNotifieLayout(item));
  const showCurateurNotifieSortColumn = hasNantissementCurateurNotifieRows;
  const showCurateurNotifieAvisPvColumns = hasNantissementCurateurNotifieRows || hasAssCurateurNotifieRows;
  const avisHeader = (diligenceVirtualShowAssColumns && !(isAssNbLayoutValue || isAssNotifierLayoutValue)) ? '' : 'Sort exécution';
  const shouldHideTail = isAssLikeProcedure && !(isAssNbLayoutValue || isAssNotifierLayoutValue || isNantissementCurateurNotifieLayoutValue || isAssCurateurNotifieLayoutValue);
  const hideWrap = (html)=> shouldHideTail ? `<div style="display:none">${html}</div>` : html;
  if(diligenceVirtualCompactProcedureMode === 'nantissementmed' && isDiligenceNantissementMedProcedure(row?.procedure)){
    if(isDiligenceNantissementMedNotifierLayout(row)){
      return `
        <tr ${rowAttrs}>
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
          <td>${escapeHtml(refClientValue || '-')}</td>
          <td>${renderDiligenceEditableCell(row, procEncoded, 'avisCurateur', row.details?.avisCurateur || '')}</td>
          <td>${renderDiligenceEditableCell(row, procEncoded, 'pvPlice', row.details?.pvPlice || '')}</td>
          <td>${renderDiligenceEditableCell(row, procEncoded, 'certificatNonAppelStatus', certificatNonAppelValue)}</td>
          <td>${renderDiligenceEditableCell(row, procEncoded, 'executionNo', executionValue)}</td>
          <td>${renderDiligenceEditableCell(row, procEncoded, 'ville', row.dossier?.ville || row.details?.ville || '')}</td>
          <td>${renderDiligenceEditableCell(row, procEncoded, delegationField, delegationValue)}</td>
          <td>${renderDiligenceEditableCell(row, procEncoded, huissierField, huissierValue)}</td>
          <td>${renderDiligenceEditableCell(row, procEncoded, 'sort', row.details?.sort || '')}</td>
          <td>${renderDiligenceEditableCell(row, procEncoded, 'tribunal', tribunalValue)}</td>
          <td>${renderDiligenceEditableCell(row, procEncoded, 'boiteNo', row.dossier?.boiteNo || '')}</td>
        </tr>
      `;
    }
    return `
      <tr ${rowAttrs}>
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
        <td>${escapeHtml(refClientValue || '-')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'dateCurateur', row.details?.dateCurateur || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'referenceCurateur', row.details?.referenceCurateur || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'ord', row.details?.ord || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'sortOrd', row.details?.sortOrd || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'notifCurateurNo', row.details?.notifCurateurNo || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'curateurSortNotif', row.details?.curateurSortNotif || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'avisCurateur', row.details?.avisCurateur || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'pvPlice', row.details?.pvPlice || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'ville', row.dossier?.ville || row.details?.ville || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'tribunal', tribunalValue)}</td>
      </tr>
    `;
  }
  if(diligenceVirtualCompactProcedureMode === 'saisiearret' && isSaisieArretProcedure){
    const cinRcValue = row.details?.cinRc || row.details?.cin || row.dossier?.cin || row.dossier?.cautionCin || '';
    const debiteurEpValue = row.details?.debiteurEp || row.dossier?.debiteur || '';
    const debiteurApValue = row.details?.debiteurAp || '';
    const adresseValue = row.details?.adresse || row.dossier?.adresse || '';
    const montantValue = row.details?.montant || row.dossier?.montant || '';
    const banqueFrValue = row.details?.banqueFr || row.details?.banque || '';
    const adresseBrancheValue = row.details?.adresseBranche || row.details?.adresseBanque || '';
    return `
      <tr ${rowAttrs}>
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
        <td>${escapeHtml(refClientValue || '-')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'lotDu', row.details?.lotDu || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'gestionnaire', row.dossier?.gestionnaire || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'debiteurEp', debiteurEpValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'debiteurAp', debiteurApValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'cinRc', cinRcValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'adresse', adresseValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'ville', row.dossier?.ville || row.details?.ville || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'montant', montantValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'rib', row.details?.rib || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'banqueFr', banqueFrValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'banqueAr', row.details?.banqueAr || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'adresseBranche', adresseBrancheValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'avocat', row.details?.avocat || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'observation', row.details?.observation || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'depotLe', row.details?.depotLe || row.details?.dateDepot || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'referenceClient', getDiligenceReferenceDossierValue(row))}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'attOrdOrOrdOk', ordValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'executionNo', row.details?.executionNo || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'sortPle', row.details?.sortPle || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'notifBanque', row.details?.notifBanque || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'notifDebiteur', row.details?.notifDebiteur || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'tribunal', tribunalValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'boiteNo', row.dossier?.boiteNo || '')}</td>
      </tr>
    `;
  }
  if(diligenceVirtualShowCommandementColumns && isCommandementProcedure){
    const cmdMode = getDiligenceCommandementHeaderMode(diligenceVirtualRows);
    const cmdExpanded = cmdMode !== 'default';
    const isCmdNb = isDiligenceCommandementNbLayout(row);
    const isCmdNotifier = isDiligenceCommandementNotifierLayout(row);
    let cmdExtraCells = '';
    if(cmdExpanded){
      const certifCell = `<td>${renderDiligenceEditableCell(row, procEncoded, 'certificatNonAppelStatus', row.details?.certificatNonAppelStatus || '')}</td>`;
      const execCell = `<td>${renderDiligenceEditableCell(row, procEncoded, 'executionNo', row.details?.executionNo || '')}</td>`;
      const villeCell = `<td>${renderDiligenceEditableCell(row, procEncoded, 'ville', row.dossier?.ville || row.details?.ville || '')}</td>`;
      const delCell = `<td>${renderDiligenceEditableCell(row, procEncoded, 'delegation', row.details?.delegation || '')}</td>`;
      const huissierCell = `<td>${renderDiligenceEditableCell(row, procEncoded, 'huissier', row.details?.huissier || '')}</td>`;
      const avisCell = `<td>${renderDiligenceEditableCell(row, procEncoded, 'avisRejetDossier', row.details?.avisRejetDossier || '')}</td>`;
      
      if(isCmdNb){
        const nbPrefix = `
          <td>${renderDiligenceEditableCell(row, procEncoded, 'lettreRec', row.details?.lettreRec || '')}</td>
          <td>${renderDiligenceEditableCell(row, procEncoded, 'curateurNo', row.details?.curateurNo || '')}</td>
          <td>${renderDiligenceEditableCell(row, procEncoded, 'attOrdOrOrdOk', row.details?.attOrdOrOrdOk || row.details?._audienceSortOrd || '')}</td>
          <td>${renderDiligenceEditableCell(row, procEncoded, 'notifCurateur', row.details?.notifCurateur || '')}</td>
          <td>${renderDiligenceEditableCell(row, procEncoded, 'sortNotif', row.details?.sortNotif || '')}</td>
          <td>${renderDiligenceEditableCell(row, procEncoded, 'avisCurateur', row.details?.avisCurateur || '')}</td>
          <td>${renderDiligenceEditableCell(row, procEncoded, 'pvPlice', row.details?.pvPlice || '')}</td>
        `;
        cmdExtraCells = nbPrefix;
      } else {
        // Placeholder cells to keep alignment when header is expanded
        cmdExtraCells = '<td></td>'.repeat(7);
      }
    }
    return `
      <tr ${rowAttrs}>
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
        <td>${escapeHtml(row.dossier?.type || '-')}</td>
        <td>${escapeHtml(refClientValue || '-')}</td>
        <td>${escapeHtml(row.dossier?.debiteur || '-')}</td>
        <td>${escapeHtml(getDiligenceReferenceDossierValue(row) || '-')}</td>
        <td>${escapeHtml(row.details?.depotLe || row.details?.dateDepot || '-')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'executionNo', row.details?.executionNo || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'plieCmd', row.details?.plieCmd || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'pubAuJournal', row.details?.pubAuJournal || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'notifConservateur', row.details?.notifConservateur || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'notifDebiteur', row.details?.notifDebiteur || '')}</td>
        ${cmdExtraCells}
        <td>${renderDiligenceEditableCell(row, procEncoded, refField, refValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'ord', row.details?.ord || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'expert', row.details?.expert || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'miseAPrix', row.details?.miseAPrix || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'dateVente', row.details?.dateVente || '')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'tribunal', tribunalValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'boiteNo', row.dossier?.boiteNo || '')}</td>
      </tr>
    `;
  }
  const isAssExpandedLayout = isAssNbLayoutValue;
  const isCasaRow = isDiligenceAssLikeProcedure(row?.procedure) && isCasablancaTpiTribunal(tribunalValue);
  const notificationCells = showSharedNotificationColumns
    ? `
      <td>${renderDiligenceEditableCell(row, procEncoded, notificationNoField, notificationNoValue)}</td>
      ${showPlieColumn ? `<td>${isAssLikeProcedure ? renderDiligenceEditableCell(row, procEncoded, 'plie', row.details?.plie || '') : ''}</td>` : ''}
      <td>${renderDiligenceEditableCell(row, procEncoded, notificationSortField, notificationSortValue)}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, 'observation', row.details?.observation || '')}</td>
    `
    : '';
  const curateurStandaloneCells = `
    ${showCurateurNotifieSortColumn ? `<td>${isNantissementCurateurNotifieLayoutValue ? hideWrap(renderDiligenceEditableCell(row, procEncoded, 'sortNotif', row.details?.sortNotif || '')) : ''}</td>` : ''}
    ${showCurateurNotifieAvisPvColumns ? `<td>${(isNantissementCurateurNotifieLayoutValue || isAssCurateurNotifieLayoutValue) ? hideWrap(renderDiligenceEditableCell(row, procEncoded, 'avisCurateur', row.details?.avisCurateur || '')) : ''}</td><td>${(isNantissementCurateurNotifieLayoutValue || isAssCurateurNotifieLayoutValue) ? hideWrap(renderDiligenceEditableCell(row, procEncoded, 'pvPlice', pvPliceValue)) : ''}</td>` : ''}
  `;
  const nbFollowupCells = isAssExpandedLayout
    ? `
      <td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, 'lettreRec', row.details?.lettreRec || ''))}</td>
      <td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, 'curateurNo', row.details?.curateurNo || ''))}</td>
      <td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, 'attOrdOrOrdOk', ordValue))}</td>
      <td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, 'notifCurateur', row.details?.notifCurateur || ''))}</td>
      <td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, 'sortNotif', row.details?.sortNotif || ''))}</td>
      <td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, 'avisCurateur', row.details?.avisCurateur || ''))}</td>
      <td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, 'pvPlice', pvPliceValue))}</td>
      ${curateurStandaloneCells}
    `
    : `${showAssFollowupColumns ? '<td></td><td></td><td></td><td></td><td></td><td></td><td></td>' : ''}${curateurStandaloneCells}`;
  const standardCells = `
    ${(showAssFollowupColumns || isAssNotifierLayoutValue || isNantissementCurateurNotifieLayoutValue || isAssCurateurNotifieLayoutValue) ? `<td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, 'certificatNonAppelStatus', certificatNonAppelValue))}</td>` : (showSharedNotificationColumns && !isAssLikeProcedure ? `<td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, 'certificatNonAppelStatus', certificatNonAppelValue))}</td>` : '')}
    ${isAssLikeProcedure ? ((showAssFollowupColumns || isAssNotifierLayoutValue || isNantissementCurateurNotifieLayoutValue || isAssCurateurNotifieLayoutValue) ? `<td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, 'executionNo', executionValue))}</td>` : '') : `<td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, 'executionNo', executionValue))}</td>`}
    ${isAssLikeProcedure ? ((showAssFollowupColumns || isAssNotifierLayoutValue || isNantissementCurateurNotifieLayoutValue || isAssCurateurNotifieLayoutValue) ? `<td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, 'ville', villeValue))}</td>` : '') : `<td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, 'ville', villeValue))}</td>`}
    ${isAssLikeProcedure ? ((showAssFollowupColumns || isAssNotifierLayoutValue || isNantissementCurateurNotifieLayoutValue || isAssCurateurNotifieLayoutValue) ? `<td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, delegationField, delegationValue))}</td>` : '') : `<td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, delegationField, delegationValue))}</td>`}
    ${isAssLikeProcedure ? ((showAssFollowupColumns || isAssNotifierLayoutValue || isNantissementCurateurNotifieLayoutValue || isAssCurateurNotifieLayoutValue) ? `<td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, huissierField, huissierValue))}</td>` : '') : `<td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, huissierField, huissierValue))}</td>`}
    ${(avisHeader || isNantissementCurateurNotifieLayoutValue)
      ? `<td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, 'sort', executionSortValue))}</td>`
      : ''
    }
    ${diligenceVirtualCompactProcedureMode === 'sbien'
      ? `<td>${hideWrap(renderDiligenceEditableCell(row, procEncoded, 'dateExecution', row.details?.dateExecution || ''))}</td>`
      : ''
    }
    <td>${isCommandementProcedure ? '' : renderDiligenceEditableCell(row, procEncoded, 'tribunal', tribunalValue)}</td>
    <td>${renderDiligenceEditableCell(row, procEncoded, 'boiteNo', row.dossier?.boiteNo || '')}</td>
  `;
  return `
    <tr ${rowAttrs}>
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
      <td>${escapeHtml(row.dossier?.type || '-')}</td>
      <td>${escapeHtml(refClientValue || '-')}</td>
      <td>${escapeHtml(row.dossier?.debiteur || '-')}</td>
      <td>${escapeHtml(row.details?.depotLe || row.details?.dateDepot || '-')}</td>
      <td>${renderDiligenceEditableCell(row, procEncoded, refField, refValue)}</td>
      ${diligenceVirtualShowAssColumns ? `<td>${renderDiligenceEditableCell(row, procEncoded, 'juge', judgeValue)}</td>` : ''}
      ${diligenceVirtualShowAssColumns ? `<td>${renderDiligenceEditableCell(row, procEncoded, 'sort', sortValue)}</td>` : ''}
      <td>${renderDiligenceEditableCell(row, procEncoded, ordField, ordValue)}</td>
      ${notificationCells}
      ${nbFollowupCells}
      ${standardCells}
    </tr>
  `;
}

function renderDiligenceVirtualWindow(force = false){
  const body = $('diligenceBody');
  if(!body) return;
  const rows = Array.isArray(diligenceVirtualRows) ? diligenceVirtualRows : [];
  const colCount = getDiligenceColCount();
  if(!rows.length){
    diligenceVirtualLastRange = { start: -1, end: -1 };
    setDiligenceStatusRow(body, DILIGENCE_EMPTY_MESSAGE, 'diligence-empty', colCount);
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
  const rowsHtml = renderDiligenceRowsHtml(rows.slice(start, end));
  body.innerHTML = `${topSpacer}${rowsHtml}${bottomSpacer}`;
  maybeApplyDiligenceAutoSizing(body);
}

function queueDiligenceVirtualRender(){
  if(diligenceVirtualRafId) return;
  diligenceVirtualRafId = window.requestAnimationFrame(()=>{
    diligenceVirtualRafId = null;
    renderDiligenceVirtualWindow();
  });
}

function orderDiligenceRowsByCheckedSelection(rows){
  if(!filterDiligenceCheckedFirst || !Array.isArray(rows) || rows.length < 2) return rows;
  if(
    rows === diligenceCheckedOrderedRowsCacheInput
    && diligenceCheckedOrderedRowsCacheVersion === diligencePrintSelectionVersion
  ){
    return diligenceCheckedOrderedRowsCacheOutput;
  }
  const checkedRows = [];
  const otherRows = [];
  rows.forEach(row=>{
    if(isDiligenceSelectedForPrint(row)){
      checkedRows.push(row);
    }else{
      otherRows.push(row);
    }
  });
  const out = checkedRows.concat(otherRows);
  diligenceCheckedOrderedRowsCacheInput = rows;
  diligenceCheckedOrderedRowsCacheVersion = diligencePrintSelectionVersion;
  diligenceCheckedOrderedRowsCacheOutput = out;
  return out;
}

function renderDiligence(options = {}){
  if(!shouldRenderDeferredSection('diligence', options)) return;
  if(typeof renderImportHistoryPanel === 'function'){
    renderImportHistoryPanel('diligenceImportHistory', 'diligence');
  }
  const diligenceQuery = normalizeDiligenceSearchQuery($('diligenceSearchInput')?.value || '');
  const diligenceFilterStateKey = getDiligenceFilterStateKey(diligenceQuery);
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
  const auxFilterRows = getDiligenceRowsScopedForAuxFilters(allRows);
  syncDiligenceSortFilter(auxFilterRows);
  syncDiligenceDelegationFilter(auxFilterRows);
  syncDiligenceOrdonnanceFilter(auxFilterRows);
  syncDiligenceTribunalFilter(auxFilterRows);
  const finalizeDiligenceRender = (rows)=>{
    try{
      const sortedByYearRows = [...rows].sort((a, b) => {
        try{
          const yearA = extractYearFromReferenceDiligence(getDiligenceReferenceDossierValue(a));
          const yearB = extractYearFromReferenceDiligence(getDiligenceReferenceDossierValue(b));
          return yearA - yearB;
        }catch(_){ return 0; }
      });
      const orderedRows = orderDiligenceRowsByCheckedSelection(sortedByYearRows);
      diligenceVirtualShowCommandementColumns = shouldShowDiligenceCommandementColumns(orderedRows);
      diligenceVirtualShowAssColumns = shouldShowDiligenceAssColumns(orderedRows);
      diligenceVirtualCompactProcedureMode = getDiligenceCompactProcedureMode(orderedRows);
      const pageData = orderedRows.length
        ? paginateRows(orderedRows, 'diligence')
        : { rows: [], page: 1, totalPages: 1, from: 0, to: 0 };
      syncDiligenceRenderedSelectionCache(orderedRows, pageData.rows, diligenceFilterStateKey, pageData.page);
      diligenceVirtualRows = pageData.rows;
      const colCount = getDiligenceColCount();

      if(headRow){
        const headMode = diligenceVirtualShowCommandementColumns
          ? 'commandement-columns'
          : (diligenceVirtualShowAssColumns ? 'ass-columns' : 'compact-columns');
        const headVariant = diligenceVirtualShowCommandementColumns
          ? `commandement-${getDiligenceCommandementHeaderMode(pageData.rows)}`
          : (diligenceVirtualShowAssColumns ? getDiligenceAssHeaderMode(pageData.rows) : diligenceVirtualCompactProcedureMode);
        
        const hasNotifier = diligenceVirtualShowAssColumns && pageData.rows.some(row => isDiligenceAssNotifierLayout(row));
        const hasPlie = !!diligenceVirtualShowAssColumns;
        const layoutVersion = `${hasNotifier ? 'notif' : 'std'}-${hasPlie ? 'plie' : 'noplie'}`;

        setElementHtmlWithRenderKey(
          headRow,
          buildDiligenceHeadHtml(),
          `diligence-head::${headMode}::${headVariant}::${layoutVersion}`,
          { trustRenderKey: true }
        );
      }

      if(count){
        setElementTextIfChanged(count, buildDiligenceCountLabel(orderedRows.length));
      }

      if(!orderedRows.length){
        diligenceVirtualRows = [];
        diligenceVirtualLastRange = { start: -1, end: -1 };
        setDiligenceStatusRow(body, DILIGENCE_EMPTY_MESSAGE, 'diligence-empty', colCount);
        renderPagination('diligence', { totalRows: 0, page: 1, totalPages: 1, from: 0, to: 0 });
        updateDiligenceCheckedCount();
        return;
      }

      const useVirtual = pageData.rows.length >= DILIGENCE_VIRTUAL_MIN_ROWS;
      diligenceVirtualRows = pageData.rows;
      diligenceVirtualShowInjonctionColumns = false;
      diligenceVirtualShowCommandementColumns = shouldShowDiligenceCommandementColumns(pageData.rows);
      diligenceVirtualCompactProcedureMode = getDiligenceCompactProcedureMode(pageData.rows);
      diligenceVirtualLastRange = { start: -1, end: -1 };
      if(useVirtual){
        renderDiligenceVirtualWindow(true);
      }else{
        setElementHtmlWithRenderKey(
          body,
          renderDiligenceRowsHtml(pageData.rows),
          [
            'diligence-rows',
            dossierDataVersion,
            diligencePrintSelectionVersion,
            pageData.page,
            pageData.rows.length,
            'comprehensive',
            diligenceFilterStateKey
          ].join('::'),
          { trustRenderKey: true }
        );
        maybeApplyDiligenceAutoSizing(body);
      }
      renderPagination('diligence', pageData);
      updateDiligenceCheckedCount();
    }catch(err){
      console.error('Erreur finalizeDiligenceRender:', err);
      setDiligenceStatusRow(body, 'Une erreur est survenue lors de l\'affichage.', 'diligence-error', getDiligenceColCount());
    }
  };
  const queueFinalizeDiligenceRender = (rows, expectedStateKey = diligenceFilterStateKey, expectedRequestId = null)=>{
    const run = ()=>{
      const currentStateKey = getDiligenceFilterStateKey(
        normalizeDiligenceSearchQuery($('diligenceSearchInput')?.value || '')
      );
      if(currentStateKey !== expectedStateKey) return;
      if(expectedRequestId !== null && expectedRequestId !== diligenceFilterRequestSeq) return;
      finalizeDiligenceRender(rows);
    };
    if(!shouldDeferHeavySectionRender(rows.length, options)){
      run();
      return;
    }
    scheduleDeferredSectionRender('diligence', run, {
      delayMs: 70,
      onPending: ()=>setDiligenceStatusRow(body, DILIGENCE_LOADING_MESSAGE, 'diligence-loading')
    });
  };

  if(diligenceQuery && allRows.length >= 1200 && !!getDiligenceFilterWorker()){
    const executionOnlyQuery = isDiligenceExecutionOnlyQuery(diligenceQuery);
    const restrictAssAttOrdToAudience = shouldRestrictDiligenceAssAttOrdToAudience();
    const narrowedRows = allRows.filter(row=>{
      if(!matchesDiligenceProcedureFilter(row, filterDiligenceProcedure)) return false;
      if(filterDiligenceSort !== 'all' && row.sort !== filterDiligenceSort) return false;
      if(filterDiligenceDelegation !== 'all' && row.delegation !== filterDiligenceDelegation) return false;
      if(
        filterDiligenceOrdonnance !== 'all'
        && normalizeDiligenceOrdonnance(row.ordonnance) !== normalizeDiligenceOrdonnance(filterDiligenceOrdonnance)
      ) return false;
      if(restrictAssAttOrdToAudience && isDiligenceAssProcedure(row?.procedure) && !isDiligenceAudienceAssAttOrdRow(row)) return false;
      if(filterDiligenceTribunal !== 'all' && resolveDiligenceTribunalFilterKey(row.tribunalFilterKey || row.tribunal) !== filterDiligenceTribunal) return false;
      return true;
    });
    const requestId = ++diligenceFilterRequestSeq;
    setDiligenceStatusRow(body, DILIGENCE_LOADING_MESSAGE, 'diligence-loading');
    runDiligenceFilterInWorker(
      narrowedRows.map((row, idx)=>({
        idx,
        haystack: getDiligenceSearchHaystack(row),
        executionNo: String(row?.details?.executionNo || '').trim()
      })),
      diligenceQuery,
      requestId,
      { executionOnlyQuery }
    )
      .then((filteredIndexes)=>{
        const currentStateKey = getDiligenceFilterStateKey(
          normalizeDiligenceSearchQuery($('diligenceSearchInput')?.value || '')
        );
        if(requestId !== diligenceFilterRequestSeq) return;
        if(currentStateKey !== diligenceFilterStateKey) return;
        if(!Array.isArray(filteredIndexes)){
          queueFinalizeDiligenceRender(getFilteredDiligenceRows(allRows), diligenceFilterStateKey, requestId);
          return;
        }
        queueFinalizeDiligenceRender(filteredIndexes.map(idx=>narrowedRows[idx]).filter(Boolean), diligenceFilterStateKey, requestId);
      })
      .catch(()=>{
        if(requestId !== diligenceFilterRequestSeq) return;
        queueFinalizeDiligenceRender(getFilteredDiligenceRows(allRows), diligenceFilterStateKey, requestId);
      });
    return;
  }

  queueFinalizeDiligenceRender(getFilteredDiligenceRows(allRows));
}
