const STATUS_BADGE_CLASS_BY_VALUE = {
  'Soldé': 'status-solde',
  'Arrêt définitif': 'status-arret',
  'Clôture': 'status-cloture',
  'Suspension': 'status-suspension'
};

const AUDIENCE_ALLOWED_ROW_COLORS = new Set(['blue', 'green', 'red', 'yellow', 'document-ok', 'purple-dark', 'purple-light']);

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

function getAudienceRowEffectiveColor(row){
  const statusDerivedColor = getAudienceStatusDerivedColor(row?.d?.statut || '');
  if(statusDerivedColor) return statusDerivedColor;
  const explicitColor = String(row?.p?.color || '').trim();
  if(AUDIENCE_ALLOWED_ROW_COLORS.has(explicitColor)) return explicitColor;
  return '';
}
