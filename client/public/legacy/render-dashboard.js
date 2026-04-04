let queuedDashboardHeavyOptions = null;

function toDashboardDateKey(year, monthIndex, day){
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDashboardTodayKey(){
  const today = new Date();
  return toDashboardDateKey(today.getFullYear(), today.getMonth(), today.getDate());
}

function getDashboardTomorrowKey(){
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDashboardDateKey(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
}

function getDashboardDateLabel(dateKey){
  const raw = String(dateKey || '').trim();
  if(!raw) return '-';
  const parts = raw.split('-').map(Number);
  if(parts.length !== 3 || parts.some(part=>!Number.isFinite(part))) return raw;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if(Number.isNaN(date.getTime())) return raw;
  return formatDateDDMMYYYY(date) || raw;
}

function getDashboardDateAudienceRows(dateKey){
  const targetKey = String(dateKey || '').trim();
  if(!targetKey) return [];
  return getAudienceRowsForSidebarProjectedCached()
    .filter(row=>String(row?.calendarDateKey || '').trim() === targetKey)
    .map((row)=>row?.calendarEvent || null)
    .filter(Boolean)
    .sort((a, b)=>{
      const byClient = String(a?.client || '').localeCompare(String(b?.client || ''), 'fr', { sensitivity: 'base' });
      if(byClient !== 0) return byClient;
      const byProcedure = String(a?.procedure || '').localeCompare(String(b?.procedure || ''), 'fr', { sensitivity: 'base' });
      if(byProcedure !== 0) return byProcedure;
      return String(a?.debiteur || '').localeCompare(String(b?.debiteur || ''), 'fr', { sensitivity: 'base' });
    });
}

function getDashboardDateAudienceSourceRows(dateKey){
  const targetKey = String(dateKey || '').trim();
  if(!targetKey) return [];
  return getAudienceRowsForSidebar()
    .filter((row)=>{
      const audienceDateRaw = row?.draft?.dateAudience || row?.p?.audience || '';
      const parsedAudienceDate = parseDateForAge(audienceDateRaw);
      if(!(parsedAudienceDate instanceof Date) || Number.isNaN(parsedAudienceDate.getTime())) return false;
      return formatDateYYYYMMDD(parsedAudienceDate) === targetKey;
    })
    .sort(compareAudienceRowsByReferenceProximity);
}

function buildDashboardCalendarDateExcelFilename(dateKey){
  const safeDateKey = String(dateKey || '').trim().replace(/[^0-9-]/g, '') || 'audience';
  return `audiences_${safeDateKey}.xlsx`;
}

function openDashboardCalendarDateExcelPreviewWindow(dateKey){
  const exportRows = getDashboardDateAudienceSourceRows(dateKey);
  if(!exportRows.length){
    alert("Aucune ligne d'audience à afficher dans le fichier.");
    return;
  }
  const browserDownloadTarget = primeBrowserDownloadTarget('Ouverture du fichier Excel...');
  runWithHeavyUiOperation(async ()=>{
    const dataset = await buildAudienceSelectedExportDatasetAsync(exportRows, { blankSort: true });
    await exportAudienceWorkbookXlsxStyled({
      headers: dataset.headers,
      rows: dataset.tableRows,
      subtitle: dataset.subtitle,
      sheetName: 'Audience',
      colWidths: dataset.colWidths,
      filename: buildDashboardCalendarDateExcelFilename(dateKey),
      layoutPreset: 'audience-reference',
      openAfterExport: true,
      browserDownloadTarget,
      browserOpenInline: true
    });
  }).catch((err)=>{
    console.error(err);
    alert("Ouverture du fichier Excel impossible.");
  });
}

function openDashboardCalendarDateDetails(dateKey){
  const rows = getDashboardDateAudienceRows(dateKey);
  if(!rows.length) return;
  const todayKey = getDashboardTodayKey();
  const tomorrowKey = getDashboardTomorrowKey();
  let subtitleLabel = `Date d'audience : ${getDashboardDateLabel(dateKey)}`;
  if(dateKey === todayKey){
    subtitleLabel = `Aujourd'hui - ${getDashboardDateLabel(dateKey)}`;
  }else if(dateKey === tomorrowKey){
    subtitleLabel = `Demain - ${getDashboardDateLabel(dateKey)}`;
  }
  showExportPreviewModal({
    title: `Audiences du ${getDashboardDateLabel(dateKey)}`,
    subtitle: subtitleLabel,
    headers: ['Client', 'Procedure', 'Debiteur', 'Ref dossier', 'Juge', 'Tribunal', 'Sort', 'Statut'],
    exportLabel: 'Aperçu Excel',
    onExport: ()=>openDashboardCalendarDateExcelPreviewWindow(dateKey),
    rows: rows.map((row)=>[
      row?.client || '-',
      row?.procedure || '-',
      row?.debiteur || '-',
      row?.ref || '-',
      row?.juge || '-',
      row?.tribunal || '-',
      row?.sort || '-',
      row?.statut || 'En cours'
    ])
  });
}

function handleDashboardCalendarGridClick(event){
  const button = event?.target?.closest?.('.dashboard-calendar-day[data-date-key]');
  if(!button) return;
  const dateKey = String(button.dataset.dateKey || '').trim();
  if(!dateKey) return;
  openDashboardCalendarDateDetails(dateKey);
}

function buildDashboardCalendarDayHtml(day, key, todayKey, tomorrowKey, eventCount, tooltip){
  const classes = ['dashboard-calendar-day'];
  if(eventCount > 0) classes.push('has-event');
  if(key === todayKey) classes.push('is-today');
  if(key === tomorrowKey) classes.push('is-tomorrow');
  const ariaLabel = [
    day,
    key === todayKey ? "aujourd'hui" : '',
    key === tomorrowKey ? 'demain' : '',
    eventCount > 0 ? `${eventCount} audience(s)` : 'aucune audience'
  ].filter(Boolean).join(' - ');
  return `
    <button
      type="button"
      class="${classes.join(' ')}"
      data-date-key="${escapeAttr(key)}"
      title="${escapeAttr(tooltip || ariaLabel)}"
      aria-label="${escapeAttr(ariaLabel)}"
      ${eventCount > 0 ? '' : 'disabled'}
    >
      <span class="day-num">${day}</span>
      ${eventCount ? `<span class="day-count">${eventCount}</span>` : ''}
    </button>
  `;
}

function getDashboardCalendarEvents(){
  const userKey = getCurrentClientAccessCacheKey();
  if(
    dashboardCalendarEventsCache
    && dashboardCalendarEventsCacheVersion === audienceRowsRawDataVersion
    && dashboardCalendarEventsCacheUserKey === userKey
  ){
    return dashboardCalendarEventsCache;
  }
  const byDate = {};
  const audienceRows = getAudienceRowsForSidebarProjectedCached();
  audienceRows.forEach(row=>{
    const key = String(row?.calendarDateKey || '').trim();
    if(!key) return;
    if(!byDate[key]) byDate[key] = [];
    byDate[key].push(row.calendarEvent || {
      client: '-',
      procedure: '-',
      debiteur: '-'
    });
  });
  dashboardCalendarEventsCache = byDate;
  dashboardCalendarEventsCacheVersion = audienceRowsRawDataVersion;
  dashboardCalendarEventsCacheUserKey = userKey;
  return byDate;
}

function renderDashboardCalendar(){
  const label = $('calendarMonthLabel');
  const grid = $('dashboardCalendarGrid');
  if(!label || !grid) return;

  const year = dashboardCalendarCursor.getFullYear();
  const month = dashboardCalendarCursor.getMonth();
  label.textContent = dashboardCalendarCursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const eventsByDate = getDashboardCalendarEvents();
  const headers = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = getDashboardTodayKey();
  const tomorrowKey = getDashboardTomorrowKey();
  const cacheKey = [
    dashboardCalendarEventsCacheVersion,
    dashboardCalendarEventsCacheUserKey,
    year,
    month,
    todayKey,
    tomorrowKey
  ].join('||');
  if(cacheKey === dashboardCalendarMarkupCacheKey && dashboardCalendarMarkupCacheHtml){
    setElementHtmlWithRenderKey(grid, dashboardCalendarMarkupCacheHtml, cacheKey, { trustRenderKey: true });
    return;
  }

  let html = headers.map(h=>`<div class="dashboard-calendar-weekday">${h}</div>`).join('');
  for(let i = 0; i < firstWeekday; i++){
    html += '<div class="dashboard-calendar-day is-empty"></div>';
  }
  for(let day = 1; day <= daysInMonth; day++){
    const key = toDashboardDateKey(year, month, day);
    const events = eventsByDate[key] || [];
    const eventCount = events.length;
    const tooltip = events
      .map(e=>`${e.client} / ${e.procedure} / ${e.debiteur}`)
      .join(' | ');
    html += buildDashboardCalendarDayHtml(day, key, todayKey, tomorrowKey, eventCount, tooltip);
  }
  dashboardCalendarMarkupCacheKey = cacheKey;
  dashboardCalendarMarkupCacheHtml = html;
  setElementHtmlWithRenderKey(grid, html, cacheKey, { trustRenderKey: true });
}

function queueDashboardCalendarRender(){
  if(dashboardCalendarRenderTimer) return;
  const heavyDelay = isVeryLargeLiveSyncMode()
    ? getAdaptiveUiBatchDelay(1800, {
      largeDatasetExtraMs: 400,
      busyExtraMs: 700,
      importExtraMs: 900
    })
    : 120;
  const render = ()=>{
    dashboardCalendarRenderTimer = null;
    renderDashboardCalendar();
  };
  if(typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'){
    dashboardCalendarRenderTimer = window.requestIdleCallback(render, {
      timeout: Math.max(1200, Number(heavyDelay) || 1200)
    });
    return;
  }
  dashboardCalendarRenderTimer = setTimeout(render, Math.max(120, Number(heavyDelay) || 120));
}

function queueDashboardHeavyRender(options = {}){
  queuedDashboardHeavyOptions = {
    delayMs: Math.max(0, Number(options?.delayMs) || 0),
    includeAudienceMetrics: options.includeAudienceMetrics,
    immediate: options.immediate === true
  };
  if(dashboardHeavyRenderTimer) return;
  const render = ()=>{
    dashboardHeavyRenderTimer = null;
    const nextOptions = queuedDashboardHeavyOptions || {};
    queuedDashboardHeavyOptions = null;
    const snapshot = getDashboardSnapshot();
    const audienceMetrics = nextOptions.includeAudienceMetrics === false
      ? null
      : getDashboardAudienceMetrics();
    const metricOptions = { immediate: nextOptions.immediate === true };
    animateDashboardMetric('dossiersEnCours', snapshot.enCours, metricOptions);
    animateDashboardMetric('dossiersTermines', snapshot.clotureCount, metricOptions);
    if($('dossiersAttSort')) animateDashboardMetric('dossiersAttSort', audienceMetrics ? audienceMetrics.attSortCount : 0, metricOptions);
    if($('dossiersAttDepot')) animateDashboardMetric('dossiersAttDepot', audienceMetrics ? audienceMetrics.attDepotCount : 0, metricOptions);
    if($('audienceErrorsCount')) animateDashboardMetric('audienceErrorsCount', audienceMetrics ? audienceMetrics.audienceErrors : 0, metricOptions);
    if(nextOptions.includeAudienceMetrics !== false){
      queueDashboardCalendarRender();
    }
  };
  const delayMs = getAdaptiveUiBatchDelay(queuedDashboardHeavyOptions.delayMs, {
    largeDatasetExtraMs: 220,
    busyExtraMs: 320,
    importExtraMs: 420
  });
  if(delayMs > 0){
    dashboardHeavyRenderTimer = setTimeout(()=>{
      dashboardHeavyRenderTimer = null;
      if(typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'){
        dashboardHeavyRenderTimer = window.requestIdleCallback(render, { timeout: 2000 });
        return;
      }
      render();
    }, delayMs);
    return;
  }
  if(typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'){
    dashboardHeavyRenderTimer = window.requestIdleCallback(render, { timeout: 1500 });
    return;
  }
  dashboardHeavyRenderTimer = setTimeout(render, 80);
}

function renderDashboardLiveLite(){
  const metricOptions = { immediate: true };
  const snapshot = getDashboardSnapshot();
  animateDashboardMetric('totalClients', getVisibleClients().length, metricOptions);
  animateDashboardMetric('dossiersEnCours', snapshot.enCours, metricOptions);
  animateDashboardMetric('dossiersTermines', snapshot.clotureCount, metricOptions);
}

function renderDashboard(options = {}){
  if(!shouldRenderDeferredSection('dashboard', options)) return;
  const immediateMetrics = options.immediate === true || isLargeDatasetMode() || heavyUiOperationCount > 0;
  const shouldRenderCalendarNow =
    options.includeAudienceMetrics !== false
    && isDeferredRenderSectionVisible('dashboard')
    && !importInProgress;
  if(shouldRenderCalendarNow){
    if(typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'){
      window.requestAnimationFrame(()=>renderDashboardCalendar());
    }else{
      renderDashboardCalendar();
    }
  }
  animateDashboardMetric('totalClients', getVisibleClients().length, { immediate: immediateMetrics });
  queueDashboardHeavyRender({
    delayMs: options.deferHeavy ? 1800 : 0,
    includeAudienceMetrics: options.includeAudienceMetrics,
    immediate: immediateMetrics
  });
}
