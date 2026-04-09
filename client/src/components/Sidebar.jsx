function Sidebar() {
  const isClient = typeof window !== 'undefined' && typeof window.isViewer === 'function' ? window.isViewer() : false;
  const isAdminOrManager = typeof window !== 'undefined' && (
    (typeof window.isAdmin === 'function' && window.isAdmin()) ||
    (typeof window.isManager === 'function' && window.isManager())
  );

  return (
    <div className="sidebar">
      <div className="sidebar-scroll">
        <h2><i className="fa-solid fa-gavel"></i> Cabinet ARAQI HOUSSAINI</h2>
        <div id="syncStatusBadge" className="sync-status is-syncing">
          <span className="dot"></span>
          <span id="syncStatusText">Synchronisation serveur...</span>
        </div>
        <div className="sync-metrics" aria-live="polite">
          <span id="syncPingMetric" className="sync-metric">Ping: --</span>
          <span id="syncLiveMetric" className="sync-metric">Live: --</span>
        </div>
        <button id="openDesktopStateFileBtn" className="sidebar-file-btn" type="button" style={{ display: isClient ? 'none' : '' }}>
          <i className="fa-solid fa-file-lines"></i> Fichier Cabinet ARAQI HOUSSAINI
        </button>
        <input type="file" id="importAppsavocatInput" accept=".json,.appsavocat,.applicationversion1" style={{ display: 'none' }} />
        <button id="importAppsavocatBtn" className="sidebar-file-btn" type="button" style={{ display: isClient ? 'none' : '' }}>
          <i className="fa-solid fa-file-import"></i> Importer Cabinet ARAQI HOUSSAINI
        </button>
        
        <div id="dashboardLink" className="nav-link active"><i className="fa-solid fa-chart-pie"></i> Dashboard</div>
        
        {!isClient && (
          <div id="clientsLink" className="nav-link"><i className="fa-solid fa-users"></i> Clients</div>
        )}
        
        {!isClient && (
          <div id="creationLink" className="nav-link"><i className="fa-solid fa-folder-plus"></i> Création de Dossier</div>
        )}
        
        <div id="suiviLink" className="nav-link"><i className="fa-solid fa-folder-open"></i> Suivi des dossiers</div>
        
        <div id="audienceLink" className="nav-link">
          <i className="fa-solid fa-gavel"></i> Audience
        </div>
        
        <div id="diligenceLink" className="nav-link">
          <i className="fa-solid fa-list-check"></i> Diligence
        </div>
        
        <div id="salleLink" className="nav-link">
          <i className="fa-solid fa-door-open"></i> Salle
        </div>
        
        {!isClient && (
          <div id="equipeLink" className="nav-link">
            <i className="fa-solid fa-user-group"></i> Equipe
          </div>
        )}
        
        {!isClient && (
          <div id="recycleLink" className="nav-link">
            <i className="fa-solid fa-trash-arrow-up"></i> Corbeille
          </div>
        )}
      </div>

      <button id="logoutBtn" className="logout-btn">
        <i className="fa-solid fa-right-from-bracket"></i> Déconnecter
      </button>
    </div>
  )
}

export default Sidebar
