const STATUS_BADGE_CLASS_BY_VALUE = {
  'Soldé': 'status-solde',
  'Arrêt définitif': 'status-arret',
  'Clôture': 'status-cloture',
  'Suspension': 'status-suspension'
};

const AUDIENCE_ALLOWED_ROW_COLORS = new Set([
  'white',
  'blue',
  'green',
  'red',
  'yellow',
  'document-ok',
  'pink',
  'purple-dark',
  'purple-light',
  'green-purple',
  'yellow-purple'
]);

function getStatusBadgeClass(status){
  const value = String(status || 'En cours').trim() || 'En cours';
  if(STATUS_BADGE_CLASS_BY_VALUE[value]) return STATUS_BADGE_CLASS_BY_VALUE[value];
  if(value === 'Soldé') return 'status-solde';
  if(value === 'Arrêt définitif') return 'status-arret';
  if(value === 'Clôture') return 'status-cloture';
  return value === 'En cours' ? 'status-encours' : 'status-custom';
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
  if(value === 'Clôture') return 'green';
  if(value === 'Suspension') return 'yellow';
  return '';
}

function isAudienceRowStatusColorSuppressed(row){
  return String(row?.p?._suppressAudienceStatusColor || '').trim() === '1';
}

function getAudienceRowStatusDerivedColor(row){
  if(isAudienceRowStatusColorSuppressed(row)) return '';
  return getAudienceStatusDerivedColor(row?.__resolvedStatus || row?.d?.statut || '');
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

function getAudienceRowDelegationStatus(row){
  const delegationValue = String(row?.p?.attDelegationOuDelegat ?? row?.p?.delegation ?? '').trim();
  if(typeof normalizeDiligenceAttOk === 'function'){
    return normalizeDiligenceAttOk(delegationValue);
  }
  const raw = delegationValue.toLowerCase();
  if(!raw) return '';
  if(raw.includes('ok')) return 'ok';
  if(raw.includes('att')) return 'att';
  return '';
}

function getAudienceRowDelegationColor(row){
  return getAudienceRowDelegationStatus(row) === 'att' ? 'pink' : '';
}

function getAudienceRowJugementAddStatus(row){
  const explicitValue = String(row?.draft?.jugementAdd || row?.p?.jugementAdd || '').trim().toLowerCase();
  if(explicitValue === 'ok' || explicitValue === 'att') return explicitValue;
  if(row?.p?._jugementAddCleared === true) return '';
  const sortValue = normalizeCaseInsensitiveSearchText(row?.draft?.sort ?? row?.p?.sort ?? '');
  if(!sortValue) return '';
  const hasJugement = sortValue.includes('jugement') || /\bj\b/.test(sortValue);
  const hasAdd = /\badd\b/.test(sortValue);
  if(!hasJugement && !hasAdd) return '';
  if(/\bjugement\b(?:\s*\+\s*|\s+)*(?:\badd\b\s*)?\bok\b/.test(sortValue)) return 'ok';
  if(/\badd\b(?:\s*\+\s*|\s+)*\bj\b(?:\s*\+\s*|\s+)*\bok\b/.test(sortValue)) return 'ok';
  if(/\batt\b/.test(sortValue) || sortValue.includes('attente')) return 'att';
  if(hasJugement) return 'att';
  return '';
}

function isAudienceRowOrdonnanceColorSuppressed(row){
  const explicitColor = String(row?.p?.color || '').trim();
  if(explicitColor === 'white') return true;
  if(getAudienceRowDelegationColor(row)) return true;
  return false;
}

function getAudienceRowRefClientMismatchFallbackColor(row, options = {}){
  if(!row?.p?._refClientMismatch) return '';
  const statusDerivedColor = getAudienceRowStatusDerivedColor(row);
  const fallbackOrdonnanceColor = options.includeOrdonnanceColor === false
    ? ''
    : getAudienceRowOrdonnanceColor(row);
  if(fallbackOrdonnanceColor) return fallbackOrdonnanceColor;
  if(statusDerivedColor) return statusDerivedColor;
  return '';
}

function getAudienceRowEffectiveColor(row){
  const statusDerivedColor = getAudienceRowStatusDerivedColor(row);
  const ordonnanceColor = getAudienceRowOrdonnanceColor(row);
  const delegationColor = getAudienceRowDelegationColor(row);
  const explicitColor = String(row?.p?.color || '').trim();
  const ordonnanceColorSuppressed = isAudienceRowOrdonnanceColorSuppressed(row);
  if(explicitColor === 'white') return '';
  if(AUDIENCE_ALLOWED_ROW_COLORS.has(explicitColor)) return explicitColor;
  if(delegationColor && ordonnanceColorSuppressed) return delegationColor;
  if(!ordonnanceColorSuppressed && ordonnanceColor) return ordonnanceColor;
  if(statusDerivedColor) return statusDerivedColor;
  if(delegationColor) return delegationColor;
  return getAudienceRowRefClientMismatchFallbackColor(row, {
    includeOrdonnanceColor: !ordonnanceColorSuppressed
  });
}

function audienceRowMatchesColorFilter(row, color){
  const targetColor = String(color || '').trim();
  if(!targetColor || targetColor === 'all') return true;
  if(targetColor === 'jugement-ok' || targetColor === 'jugement-att'){
    const expectedValue = targetColor === 'jugement-ok' ? 'ok' : 'att';
    return getAudienceRowJugementAddStatus(row) === expectedValue;
  }
  if(targetColor === 'closed'){
    return !!getAudienceStatusDerivedColor(row?.__resolvedStatus || row?.d?.statut || '');
  }
  if(targetColor === 'green' || targetColor === 'yellow'){
    return getAudienceRowEffectiveColor(row) === targetColor;
  }
  if(targetColor === 'purple-dark' || targetColor === 'purple-light'){
    const statusDerivedColor = getAudienceRowStatusDerivedColor(row);
    return statusDerivedColor === targetColor;
  }
  if(targetColor === 'pink'){
    return getAudienceRowEffectiveColor(row) === targetColor;
  }
  return getAudienceRowEffectiveColor(row) === targetColor;
}
