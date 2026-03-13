function renderStatusBadge(status){
  const value = String(status || 'En cours');
  let cls = 'status-encours';
  if(value === 'Soldé') cls = 'status-solde';
  if(value === 'Arrêt définitif') cls = 'status-arret';
  if(value === 'Clôture') cls = 'status-cloture';
  if(value === 'Suspension') cls = 'status-suspension';
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
  const explicitColor = String(row?.p?.color || '').trim();
  const allowedColors = new Set(['blue', 'green', 'red', 'yellow', 'purple-dark', 'purple-light']);
  if(allowedColors.has(explicitColor)) return explicitColor;
  return getAudienceStatusDerivedColor(row?.d?.statut || '');
}
