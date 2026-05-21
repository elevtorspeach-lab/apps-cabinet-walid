function TeamHistorySection() {
  return (
    <div id="teamHistorySection" className="section" style={{ display: 'none' }}>
      <h1><i className="fa-solid fa-clock-rotate-left"></i> Historique</h1>
      <div id="teamHistoryLocked" className="diligence-empty" style={{ display: 'none' }}>
        Reserve au gestionnaire.
      </div>
      <div id="teamHistoryPanel">
        <div className="clients-toolbar" style={{ marginBottom: '12px' }}>
          <div className="search-box" style={{ flex: 1 }}>
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="teamHistorySearchInput" placeholder="Rechercher utilisateur, action, detail..." />
          </div>
          <button id="teamHistoryRefreshBtn" className="btn-primary" type="button">
            <i className="fa-solid fa-rotate"></i> Actualiser
          </button>
        </div>
        <div className="table-container" id="teamHistoryTableContainer">
          <table>
            <thead>
              <tr>
                <th>Date & heure</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Compte cible</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody id="teamHistoryBody"></tbody>
          </table>
        </div>
        <div id="teamHistoryPagination" className="table-pagination"></div>
      </div>
    </div>
  )
}

export default TeamHistorySection
