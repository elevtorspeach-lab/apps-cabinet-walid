import React, { useState, useEffect } from 'react';

function DashboardSection() {
  const [stats, setStats] = useState({
    totalClients: 0,
    dossiersEnCours: 0,
    dossiersTermines: 0,
    dossiersAttSort: 0,
    dossiersAttDepot: 0,
    audienceErrorsCount: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = window.remoteAuthToken || '';
        const res = await fetch('/api/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok) {
          setStats(data.stats);
        }
      } catch (err) {
        console.error('Failed to load DB stats', err);
      }
    };
    fetchStats();
    // Refresh stats every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="dashboardSection" className="section">
      <h1><i className="fa-solid fa-chart-pie"></i> Tableau de bord</h1>
      <div className="stats-container">
        <div id="totalClientsCard" className="stat-card blue is-clickable" role="button" tabIndex="0">
          <i className="fa-solid fa-users fa-2x"></i>
          <h3>Total Clients</h3>
          <p id="totalClients">{stats.totalClients}</p>
        </div>
        <div id="dashboardEnCoursCard" className="stat-card green is-clickable" role="button" tabIndex="0">
          <i className="fa-solid fa-spinner fa-2x"></i>
          <h3>Dossiers en cours</h3>
          <p id="dossiersEnCours">{stats.dossiersEnCours}</p>
        </div>
        <div id="dashboardClotureCard" className="stat-card purple is-clickable" role="button" tabIndex="0">
          <i className="fa-solid fa-check fa-2x"></i>
          <h3>Dossiers Clôture</h3>
          <p id="dossiersTermines">{stats.dossiersTermines}</p>
        </div>
        <div id="dashboardAttSortCard" className="stat-card orange is-clickable" role="button" tabIndex="0">
          <i className="fa-solid fa-hourglass-half fa-2x"></i>
          <h3>Dossiers Att sort</h3>
          <p id="dossiersAttSort">{stats.dossiersAttSort}</p>
        </div>
        <div id="dashboardAttDepotCard" className="stat-card amber is-clickable" role="button" tabIndex="0">
          <i className="fa-solid fa-folder-open fa-2x"></i>
          <h3>ATT Depot</h3>
          <p id="dossiersAttDepot">{stats.dossiersAttDepot}</p>
        </div>
        <div id="dashboardAudienceErrorsCard" className="stat-card red is-clickable" role="button" tabIndex="0">
          <i className="fa-solid fa-triangle-exclamation fa-2x"></i>
          <h3>Erreurs Audience</h3>
          <p id="audienceErrorsCount">{stats.audienceErrorsCount}</p>
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
