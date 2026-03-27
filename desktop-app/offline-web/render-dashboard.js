let queuedDashboardHeavyOptions = null;

function toDashboardDateKey(year, monthIndex, day){
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDashboardTodayKey(){
  const today = new Date();
  return toDashboardDateKey(today.getFullYear(), today.getMonth(), today.getDate());
}

function buildDashboardCalendarDayHtml(day, key, todayKey, eventCount, tooltip){
  const classes = ['dashboard-calendar-day'];
  if(key === todayKey) classes.push('is-today');
  return `
    <div class="${classes.join(' ')}" title="${escapeAttr(tooltip)}">
      <span class="day-num">${day}</span>
      ${key === todayKey && eventCount ? `<span class="day-count">${eventCount}</span>` : ''}
    </div>
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
  const cacheKey = [
    dashboardCalendarEventsCacheVersion,
    dashboardCalendarEventsCacheUserKey,
    year,
    month,
    todayKey
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
    html += buildDashboardCalendarDayHtml(day, key, todayKey, eventCount, tooltip);
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
