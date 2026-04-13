function DashboardSection() {
  return (
    <div id="dashboardSection" className="section">
      <h1><i className="fa-solid fa-chart-pie"></i> Tableau de bord</h1>
      <div className="stats-container">
        <div id="totalClientsCard" className="stat-card blue is-clickable" role="button" tabIndex="0">
          <i className="fa-solid fa-users fa-2x"></i>
          <h3>Total Clients</h3>
          <p id="totalClients">0</p>
        </div>
        <div id="dashboardEnCoursCard" className="stat-card green is-clickable" role="button" tabIndex="0">
          <i className="fa-solid fa-spinner fa-2x"></i>
          <h3>Dossiers en cours</h3>
          <p id="dossiersEnCours">0</p>
        </div>
        <div id="dashboardClotureCard" className="stat-card purple is-clickable" role="button" tabIndex="0">
          <i className="fa-solid fa-check fa-2x"></i>
          <h3>Dossiers Clôture</h3>
          <p id="dossiersTermines">0</p>
        </div>
        <div id="dashboardAttSortCard" className="stat-card orange is-clickable" role="button" tabIndex="0">
          <i className="fa-solid fa-hourglass-half fa-2x"></i>
          <h3>Dossiers Att sort</h3>
          <p id="dossiersAttSort">0</p>
        </div>
        <div id="dashboardAttDepotCard" className="stat-card amber is-clickable" role="button" tabIndex="0">
          <i className="fa-solid fa-folder-open fa-2x"></i>
          <h3>ATT Depot</h3>
          <p id="dossiersAttDepot">0</p>
        </div>
        <div id="dashboardAudienceErrorsCard" className="stat-card red is-clickable" role="button" tabIndex="0">
          <i className="fa-solid fa-triangle-exclamation fa-2x"></i>
          <h3>Erreurs Audience</h3>
          <p id="audienceErrorsCount">0</p>
        </div>
      </div>
      <div className="dashboard-calendar-card">
        <div className="dashboard-calendar-head">
          <h3><i className="fa-solid fa-calendar-days"></i> Calendrier des audiences</h3>
          <div className="dashboard-calendar-nav">
            <button id="calendarPrevBtn" className="btn-primary" type="button"><i className="fa-solid fa-chevron-left"></i></button>
            <span id="calendarMonthLabel"></span>
            <button id="calendarNextBtn" className="btn-primary" type="button"><i className="fa-solid fa-chevron-right"></i></button>
          </div>
        </div>
        <div id="dashboardCalendarGrid" className="dashboard-calendar-grid"></div>
      </div>
    </div>
  )
}

export default DashboardSection
