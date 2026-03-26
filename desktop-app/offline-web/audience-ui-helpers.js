const STATUS_BADGE_CLASS_BY_VALUE = {
  'Soldé': 'status-solde',
  'Arrêt définitif': 'status-arret',
  'Clôture': 'status-cloture',
  'Suspension': 'status-suspension'
};

const AUDIENCE_ALLOWED_ROW_COLORS = new Set(['blue', 'green', 'red', 'yellow', 'purple-dark', 'purple-light']);

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
  const draftSort = String(row?.draft?.sort ?? '').trim();
  if(normalizeDiligenceOrdonnance(draftSort)) return draftSort;
  const audienceSort = String(row?.p?.sort ?? '').trim();
  if(normalizeDiligenceOrdonnance(audienceSort)) return audienceSort;
  return String(row?.p?.attOrdOrOrdOk ?? '').trim();
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

function getAudienceRowEffectiveColor(row){
  const statusDerivedColor = getAudienceStatusDerivedColor(row?.__resolvedStatus || row?.d?.statut || '');
  if(statusDerivedColor) return statusDerivedColor;
  if(String(row?.p?._disableAudienceRowColor || '').trim() === '1') return '';
  if(String(row?.p?._suppressAudienceOrdonnanceColor || '').trim() === '1') return '';
  const ordonnanceColor = getAudienceRowOrdonnanceColor(row);
  if(ordonnanceColor) return ordonnanceColor;
  const explicitColor = String(row?.p?.color || '').trim();
  if(explicitColor === 'green' || explicitColor === 'yellow') return '';
  if(AUDIENCE_ALLOWED_ROW_COLORS.has(explicitColor)) return explicitColor;
  return '';
}

function audienceRowMatchesColorFilter(row, color){
  const targetColor = String(color || '').trim();
  if(!targetColor || targetColor === 'all') return true;
  if(targetColor === 'closed'){
    const effectiveColor = getAudienceRowEffectiveColor(row);
    return effectiveColor === 'purple-dark' || effectiveColor === 'purple-light';
  }
  if(targetColor === 'green' || targetColor === 'yellow'){
    return getAudienceRowOrdonnanceColor(row) === targetColor;
  }
  return getAudienceRowEffectiveColor(row) === targetColor;
}
