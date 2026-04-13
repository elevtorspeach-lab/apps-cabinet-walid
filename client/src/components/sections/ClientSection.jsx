function ClientSection() {
  return (
    <div id="clientSection" className="section" style={{ display: 'none' }}>
      <h1><i className="fa-solid fa-users"></i> Gestion des Clients</h1>
      <div className="clients-toolbar">
        <div className="search-box search-box--clients-pro">
          <i className="fa-solid fa-magnifying-glass"></i>
          <div className="search-box-content">
            <span className="search-box-label">Recherche client</span>
            <input type="text" id="searchClientInput" placeholder="Rechercher un client..." />
          </div>
        </div>
        <div className="add-client-form add-client-form--pro">
          <label className="add-client-label" htmlFor="clientName">
            <span className="add-client-label-main"><i className="fa-solid fa-user-plus"></i> Nouveau client</span>
            <span className="add-client-label-sub">Ajout rapide pour lancer un dossier</span>
          </label>
          <div className="add-client-input-wrap">
            <input type="text" id="clientName" placeholder="Nom du client" />
          </div>
          <button id="addClientBtn" className="btn-success">
            <i className="fa-solid fa-plus"></i> Ajouter
          </button>
        </div>
        <div className="import-excel">
          <input type="file" id="importExcelInput" accept=".xlsx,.xls" style={{ display: 'none' }} />
          <button id="importExcelBtn" className="btn-primary">
            <i className="fa-solid fa-file-import"></i> Importer Excel
          </button>
          <button id="exportBackupExcelBtn" className="btn-primary" type="button">
            <i className="fa-solid fa-file-export"></i> Sauvegarde Excel
          </button>
        </div>
      </div>
      <div id="globalImportHistory" className="import-history-panel" style={{ display: 'none' }}></div>
      <div id="suiviTableContainer" className="table-container">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Nb Dossiers</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="clientsBody"></tbody>
        </table>
      </div>
      <div id="clientsPagination" className="table-pagination"></div>
    </div>
  )
}

export default ClientSection
