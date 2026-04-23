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
  const ordonnanceValue = String(row?.p?.attOrdOrOrdOk ?? '').trim();
  if(normalizeDiligenceOrdonnance(ordonnanceValue)) return ordonnanceValue;
  const importedSortOrd = String(row?.p?._audienceSortOrd ?? '').trim();
  if(normalizeDiligenceOrdonnance(importedSortOrd)) return importedSortOrd;
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

function isAudienceRowOrdonnanceColorSuppressed(row){
  return String(row?.p?._disableAudienceRowColor || '').trim() === '1'
    || String(row?.p?._suppressAudienceOrdonnanceColor || '').trim() === '1';
}

function getAudienceRowRefClientMismatchFallbackColor(row, options = {}){
  if(!row?.p?._refClientMismatch) return '';
  const statusDerivedColor = getAudienceStatusDerivedColor(row?.__resolvedStatus || row?.d?.statut || '');
  const fallbackOrdonnanceColor = options.includeOrdonnanceColor === false
    ? ''
    : getAudienceRowOrdonnanceColor(row);
  if(fallbackOrdonnanceColor) return fallbackOrdonnanceColor;
  if(statusDerivedColor) return statusDerivedColor;
  return '';
}

function getAudienceRowEffectiveColor(row){
  const statusDerivedColor = getAudienceStatusDerivedColor(row?.__resolvedStatus || row?.d?.statut || '');
  const ordonnanceColor = getAudienceRowOrdonnanceColor(row);
  const explicitColor = String(row?.p?.color || '').trim();
  const ordonnanceColorSuppressed = isAudienceRowOrdonnanceColorSuppressed(row);
  if(!ordonnanceColorSuppressed && ordonnanceColor) return ordonnanceColor;
  if(statusDerivedColor) return statusDerivedColor;
  if(AUDIENCE_ALLOWED_ROW_COLORS.has(explicitColor)) return explicitColor;
  return getAudienceRowRefClientMismatchFallbackColor(row, {
    includeOrdonnanceColor: !ordonnanceColorSuppressed
  });
}

function audienceRowMatchesColorFilter(row, color){
  const targetColor = String(color || '').trim();
  if(!targetColor || targetColor === 'all') return true;
  if(targetColor === 'closed'){
    return !!getAudienceStatusDerivedColor(row?.__resolvedStatus || row?.d?.statut || '');
  }
  if(targetColor === 'green' || targetColor === 'yellow'){
    if(isAudienceRowOrdonnanceColorSuppressed(row)){
      return getAudienceRowEffectiveColor(row) === targetColor;
    }
    return getAudienceRowOrdonnanceColor(row) === targetColor;
  }
  if(targetColor === 'purple-dark' || targetColor === 'purple-light'){
    const statusDerivedColor = getAudienceStatusDerivedColor(row?.__resolvedStatus || row?.d?.statut || '');
    return statusDerivedColor === targetColor;
  }
  return getAudienceRowEffectiveColor(row) === targetColor;
}
