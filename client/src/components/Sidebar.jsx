import { useState, useEffect } from 'react';

function humanizeUsername(value) {
  return String(value || '')
    .trim()
    .replace(/([A-Za-z])([0-9])/g, '$1 $2')
    .replace(/([0-9])([A-Za-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildSidebarUserLabel(identity, isClient, isAdminOrManager) {
  const username = String(identity?.username || '').trim().toLowerCase();
  const aliases = {
    manager: 'Walid',
    walid: 'Walid',
    ghita: 'Ghita',
    doha: 'Doha',
    najwa: 'Najwa',
    yasmine: 'Yasmine',
    souhaila: 'Souhaila'
  };
  const prettyName = aliases[username] || humanizeUsername(identity?.username || '');

  if (typeof window !== 'undefined' && typeof window.isManager === 'function' && window.isManager()) {
    return prettyName ? `Manager ${prettyName}` : 'Manager';
  }
  if (typeof window !== 'undefined' && typeof window.isAdmin === 'function' && window.isAdmin()) {
    return prettyName ? `Admin ${prettyName}` : 'Admin';
  }
  if (typeof window !== 'undefined' && typeof window.isViewer === 'function' && window.isViewer()) {
    return prettyName ? `Client ${prettyName}` : 'Client';
  }

  if (identity?.role === 'manager') return prettyName ? `Manager ${prettyName}` : 'Manager';
  if (identity?.role === 'admin') return prettyName ? `Admin ${prettyName}` : 'Admin';
  if (isAdminOrManager) return prettyName || 'Manager';
  if (isClient) return prettyName ? `Client ${prettyName}` : 'Client';
  return prettyName || '';
}

function Sidebar() {
  const [isClient, setIsClient] = useState(typeof window !== 'undefined' && typeof window.isViewer === 'function' ? window.isViewer() : false);
  const [isAdminOrManager, setIsAdminOrManager] = useState(typeof window !== 'undefined' && (
    (typeof window.isAdmin === 'function' && window.isAdmin()) ||
    (typeof window.isManager === 'function' && window.isManager())
  ));
  const [currentUserLabel, setCurrentUserLabel] = useState('');

  useEffect(() => {
    const updateRoles = () => {
      const nextIsClient = typeof window !== 'undefined' && typeof window.isViewer === 'function' ? window.isViewer() : false;
      const nextIsAdminOrManager = typeof window !== 'undefined' && (
        (typeof window.isAdmin === 'function' && window.isAdmin()) ||
        (typeof window.isManager === 'function' && window.isManager())
      );
      const identity = typeof window !== 'undefined' && typeof window.getCurrentUserIdentity === 'function'
        ? window.getCurrentUserIdentity()
        : { username: '', role: '' };

      setIsClient(nextIsClient);
      setIsAdminOrManager(nextIsAdminOrManager);
      setCurrentUserLabel(buildSidebarUserLabel(identity, nextIsClient, nextIsAdminOrManager));
    };

    updateRoles();
    window.addEventListener('role_changed', updateRoles);
    const timer = window.setInterval(updateRoles, 1000);
    return () => {
      window.removeEventListener('role_changed', updateRoles);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="sidebar">
      <div className="sidebar-scroll">
        <h2><i className="fa-solid fa-gavel"></i> Cabinet Walid Araqi</h2>
        {!!currentUserLabel && (
          <div className="sidebar-react-user-label">{currentUserLabel}</div>
        )}
        <div id="syncStatusBadge" className="sync-status is-syncing">
          <span className="dot"></span>
          <span id="syncStatusText">Synchronisation serveur...</span>
        </div>
        <div className="sync-metrics" aria-live="polite">
          <span id="syncPingMetric" className="sync-metric">Ping: --</span>
          <span id="syncLiveMetric" className="sync-metric">Derniere synchro: --</span>
        </div>
        
        {!isClient && (
          <>
            <button id="openDesktopStateFileBtn" className="sidebar-file-btn" type="button" onClick={() => document.getElementById('openDesktopStateFileInput') ? document.getElementById('openDesktopStateFileInput').click() : window.openDesktopStateFile && window.openDesktopStateFile()}>
              <i className="fa-solid fa-file-lines"></i> Fichier Cabinet Walid Araqi
            </button>
            <input type="file" id="importAppsavocatInput" accept=".json,.appsavocat,.Cabinet Walid Araqi" style={{ display: 'none' }} />
            <button id="importAppsavocatBtn" className="sidebar-file-btn" type="button" onClick={() => document.getElementById('importAppsavocatInput') && document.getElementById('importAppsavocatInput').click()}>
              <i className="fa-solid fa-file-import"></i> Importer Cabinet Walid Araqi
            </button>
          </>
        )}
        
        <div id="dashboardLink" className="nav-link active" onClick={() => window.showView && window.showView('dashboard')}><i className="fa-solid fa-chart-pie"></i> Dashboard</div>
        
        <div id="clientsLink" className="nav-link" onClick={() => window.showView && window.showView('clients')}><i className="fa-solid fa-users"></i> Clients</div>
        
        {!isClient && (
          <div id="creationLink" className="nav-link" onClick={() => window.showView && window.showView('creation')}><i className="fa-solid fa-folder-plus"></i> Création de Dossier</div>
        )}
        
        <div id="suiviLink" className="nav-link" onClick={() => window.showView && window.showView('suivi')}><i className="fa-solid fa-folder-open"></i> Suivi des dossiers</div>
        
        <div id="audienceLink" className="nav-link" onClick={() => window.showView && window.showView('audience')}>
          <i className="fa-solid fa-gavel"></i> Audience
        </div>
        
        <div id="diligenceLink" className="nav-link" onClick={() => window.showView && window.showView('diligence')}>
          <i className="fa-solid fa-list-check"></i> Diligence
        </div>
        
        {!isClient && (
          <div id="salleLink" className="nav-link" onClick={() => window.showView && window.showView('salle')}>
            <i className="fa-solid fa-door-open"></i> Salle
          </div>
        )}
        
        {!isClient && (
          <div id="equipeLink" className="nav-link" onClick={() => window.showView && window.showView('equipe')}>
            <i className="fa-solid fa-user-group"></i> Equipe
          </div>
        )}
        
        {!isClient && (
          <div id="recycleLink" className="nav-link" onClick={() => window.showView && window.showView('recycle')}>
            <i className="fa-solid fa-trash-arrow-up"></i> Corbeille
          </div>
        )}
      </div>

      <button id="logoutBtn" className="logout-btn" onClick={() => window.logout && window.logout()}>
        <i className="fa-solid fa-right-from-bracket"></i> Déconnecter
      </button>
    </div>
  )
}

export default Sidebar
