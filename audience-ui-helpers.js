const STATUS_BADGE_CLASS_BY_VALUE = {
  'Soldé': 'status-solde',
  'Arrêt définitif': 'status-arret',
  'Clôture': 'status-cloture',
  'Suspension': 'status-suspension'
};

const AUDIENCE_ALLOWED_ROW_COLORS = new Set([
  'blue',
  'green',
  'red',
  'yellow',
  'document-ok',
  'purple-dark',
  'purple-light',
  'green-purple',
  'yellow-purple'
]);

function getStatusBadgeClass(status){
  const value = String(status || 'En cours');
  return STATUS_BADGE_CLASS_BY_VALUE[value] || 'status-encours';
}

function renderStatusBadge(status){
  const value = String(status || 'En cours');
  const cls = getStatusBadgeClass(value);
  return `<span class="status-badge ${cls}">${escapeHtml(value)}</span>`;
}

function renderStatusDisplay(status, detail = ''){
  const safeDetail = String(detail || '').trim();
  if(!safeDetail) return renderStatusBadge(status);
  return `<div class="status-display">${renderStatusBadge(status)}<div class="status-detail">${escapeHtml(safeDetail)}</div></div>`;
}

function getAudienceStatusDerivedColor(status){
  const value = String(status || '').trim();
  if(value === 'Soldé') return 'purple-dark';
  if(value === 'Arrêt définitif') return 'purple-light';
  return '';
}

function getAudienceRowOrdonnanceSourceValue(row){
  if(row?.p && Object.prototype.hasOwnProperty.call(row.p, '_audienceSortOrd')){
    const importedSortOrd = String(row.p._audienceSortOrd ?? '').trim();
    if(normalizeDiligenceOrdonnance(importedSortOrd)) return importedSortOrd;
    return '';
  }
  const legacyImportedSortOrd = String(row?.p?.attOrdOrOrdOk ?? '').trim();
  if(String(row?.p?._audienceImportBatchId || '').trim() && normalizeDiligenceOrdonnance(legacyImportedSortOrd)){
    return legacyImportedSortOrd;
  }
  const draftSort = String(row?.draft?.sort ?? '').trim();
  if(normalizeDiligenceOrdonnance(draftSort)) return draftSort;
  const audienceSort = String(row?.p?.sort ?? '').trim();
  if(normalizeDiligenceOrdonnance(audienceSort)) return audienceSort;
  return '';
}

function getAudienceRowOrdonnanceStatus(row){
  const sortStatus = normalizeDiligenceOrdonnance(getAudienceRowOrdonnanceSourceValue(row));
  return sortStatus || '';
}

function getAudienceRowOrdonnanceColor(row){
  const status = getAudienceRowOrdonnanceStatus(row);
  if(status === 'att') return 'green';
  if(status === 'ok') return 'yellow';
  return '';
}

function getAudienceRowClosedOrdonnanceComboColor(statusDerivedColor, ordonnanceColor){
  if(!statusDerivedColor || !ordonnanceColor) return '';
  if((statusDerivedColor === 'purple-dark' || statusDerivedColor === 'purple-light') && ordonnanceColor === 'green'){
    return 'green-purple';
  }
  if((statusDerivedColor === 'purple-dark' || statusDerivedColor === 'purple-light') && ordonnanceColor === 'yellow'){
    return 'yellow-purple';
  }
  return '';
}

function getAudienceRowRefClientMismatchFallbackColor(row){
  if(!row?.p?._refClientMismatch) return '';
  const statusDerivedColor = getAudienceStatusDerivedColor(row?.__resolvedStatus || row?.d?.statut || '');
  const fallbackSources = [
    row?.p?._audienceSortOrd,
    row?.p?.attOrdOrOrdOk,
    row?.draft?.sort,
    row?.p?.sort
  ];
  let fallbackOrdonnanceColor = '';
  for(const value of fallbackSources){
    const normalized = normalizeDiligenceOrdonnance(value);
    if(normalized === 'att'){
      fallbackOrdonnanceColor = 'green';
      break;
    }
    if(normalized === 'ok'){
      fallbackOrdonnanceColor = 'yellow';
      break;
    }
  }
  const comboColor = getAudienceRowClosedOrdonnanceComboColor(statusDerivedColor, fallbackOrdonnanceColor);
  if(comboColor) return comboColor;
  if(statusDerivedColor) return statusDerivedColor;
  return fallbackOrdonnanceColor;
}

function getAudienceRowEffectiveColor(row){
  const statusDerivedColor = getAudienceStatusDerivedColor(row?.__resolvedStatus || row?.d?.statut || '');
  const ordonnanceColor = getAudienceRowOrdonnanceColor(row);
  const comboColor = getAudienceRowClosedOrdonnanceComboColor(statusDerivedColor, ordonnanceColor);
  if(comboColor) return comboColor;
  if(statusDerivedColor) return statusDerivedColor;
  if(String(row?.p?._disableAudienceRowColor || '').trim() === '1'){
    return getAudienceRowRefClientMismatchFallbackColor(row);
  }
  if(String(row?.p?._suppressAudienceOrdonnanceColor || '').trim() === '1'){
    return getAudienceRowRefClientMismatchFallbackColor(row);
  }
  if(ordonnanceColor) return ordonnanceColor;
  const explicitColor = String(row?.p?.color || '').trim();
  if(explicitColor === 'green' || explicitColor === 'yellow') return '';
  if(AUDIENCE_ALLOWED_ROW_COLORS.has(explicitColor)) return explicitColor;
  return getAudienceRowRefClientMismatchFallbackColor(row);
}

function audienceRowMatchesColorFilter(row, color){
  const targetColor = String(color || '').trim();
  if(!targetColor || targetColor === 'all') return true;
  if(targetColor === 'closed'){
    const effectiveColor = getAudienceRowEffectiveColor(row);
    return effectiveColor === 'purple-dark'
      || effectiveColor === 'purple-light'
      || effectiveColor === 'green-purple'
      || effectiveColor === 'yellow-purple';
  }
  if(targetColor === 'green' || targetColor === 'yellow'){
    return getAudienceRowOrdonnanceColor(row) === targetColor;
  }
  if(targetColor === 'purple-dark' || targetColor === 'purple-light'){
    const statusDerivedColor = getAudienceStatusDerivedColor(row?.__resolvedStatus || row?.d?.statut || '');
    return statusDerivedColor === targetColor;
  }
  return getAudienceRowEffectiveColor(row) === targetColor;
}
