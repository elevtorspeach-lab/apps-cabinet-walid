let queuedDashboardHeavyOptions = null;

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
  const audienceRows = getAudienceRowsForSidebar();
  audienceRows.forEach(row=>{
    const dt = parseDateForAge(row?.draft?.dateAudience || row?.p?.audience || '');
    if(!dt) return;
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    if(!byDate[key]) byDate[key] = [];
    byDate[key].push({
      client: row?.c?.name || '-',
      procedure: row?.procKey || '-',
      debiteur: row?.d?.debiteur || '-'
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
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  let html = headers.map(h=>`<div class="dashboard-calendar-weekday">${h}</div>`).join('');
  for(let i = 0; i < firstWeekday; i++){
    html += '<div class="dashboard-calendar-day is-empty"></div>';
  }
  for(let day = 1; day <= daysInMonth; day++){
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const events = eventsByDate[key] || [];
    const classes = ['dashboard-calendar-day'];
    if(key === todayKey) classes.push('is-today');
    const tooltip = events
      .map(e=>`${e.client} / ${e.procedure} / ${e.debiteur}`)
      .join(' | ');
    html += `
      <div class="${classes.join(' ')}" title="${escapeAttr(tooltip)}">
        <span class="day-num">${day}</span>
        ${key === todayKey && events.length ? `<span class="day-count">${events.length}</span>` : ''}
      </div>
    `;
  }
  grid.innerHTML = html;
}

function queueDashboardCalendarRender(){
  if(dashboardCalendarRenderTimer) return;
  const render = ()=>{
    dashboardCalendarRenderTimer = null;
    renderDashboardCalendar();
  };
  if(typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'){
    dashboardCalendarRenderTimer = window.requestIdleCallback(render, { timeout: 1200 });
    return;
  }
  dashboardCalendarRenderTimer = setTimeout(render, 120);
}

function queueDashboardHeavyRender(options = {}){
  queuedDashboardHeavyOptions = {
    delayMs: Math.max(0, Number(options?.delayMs) || 0),
    includeAudienceMetrics: options.includeAudienceMetrics
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
    animateDashboardMetric('dossiersEnCours', snapshot.enCours);
    animateDashboardMetric('dossiersTermines', snapshot.clotureCount);
    if($('dossiersAttSort')) animateDashboardMetric('dossiersAttSort', audienceMetrics ? audienceMetrics.attSortCount : 0);
    if($('audienceErrorsCount')) animateDashboardMetric('audienceErrorsCount', audienceMetrics ? audienceMetrics.audienceErrors : 0);
    if(nextOptions.includeAudienceMetrics !== false){
      queueDashboardCalendarRender();
    }
  };
  const delayMs = queuedDashboardHeavyOptions.delayMs;
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
  animateDashboardMetric('totalClients', getVisibleClients().length, options);
  queueDashboardHeavyRender({
    delayMs: options.deferHeavy ? 1800 : 0,
    includeAudienceMetrics: options.includeAudienceMetrics
  });
}
