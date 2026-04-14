function SuiviSection() {
  return (
    <div id="suiviSection" className="section" style={{ display: 'none' }}>
      <h1><i className="fa-solid fa-folder-open"></i> Suivi des dossiers</h1>

      <div className="clients-toolbar suivi-toolbar" style={{ marginBottom: '15px' }}>
        <div className="search-box" style={{ flex: 1 }}>
          <i className="fa-solid fa-filter"></i>
          <input 
            type="text" 
            id="filterGlobal" 
            placeholder="Filter global (toutes les infos du dossier)..." 
          />
        </div>
        <div className="audience-color-filter">
          <label htmlFor="filterSuiviProcedure">Procédure</label>
          <select id="filterSuiviProcedure">
            <option value="all">Toutes</option>
          </select>
        </div>
        <div className="audience-color-filter">
          <label htmlFor="filterSuiviTribunal">Tribunal</label>
          <input
            type="text"
            id="filterSuiviTribunal"
            list="filterSuiviTribunalOptions"
            placeholder=""
            autoComplete="off"
          />
          <datalist id="filterSuiviTribunalOptions">
          </datalist>
        </div>
        <label id="suiviCheckedCount" className="audience-checked-count" htmlFor="suiviPageSelectionToggle">
          <input id="suiviPageSelectionToggle" type="checkbox" aria-label="Cocher ou décocher toute la page suivi" />
          <span className="label">Cochés</span>
          <span id="suiviCheckedCountValue" className="value">0</span>
        </label>
        <button id="selectAllSuiviBtn" className="btn-primary" type="button">
          <i className="fa-solid fa-check"></i> Cocher page
        </button>
        <button id="clearAllSuiviBtn" className="btn-primary" type="button">
          <i className="fa-regular fa-square-xmark"></i> Décocher page
        </button>
        <button id="exportSuiviBtn" className="btn-primary" type="button">
          <i className="fa-solid fa-file-export"></i> Exporter
        </button>
        <button id="previewSuiviBtn" className="btn-primary" type="button">
          <i className="fa-regular fa-eye"></i> Voir le fichier
        </button>
      </div>

      <div id="suiviTableContainer" className="table-container">
        <table>
          <thead>
            <tr>
              <th>Sélection</th>
              <th>Type</th>
              <th>Client</th>
              <th>Date d’affectation</th>
              <th>Référence Client</th>
              <th>Procédure</th>
              <th>Débiteur</th>
              <th>Montant</th>
              <th>Ville</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="suiviBody"></tbody>
        </table>
      </div>
      <div id="suiviPagination" className="table-pagination"></div>
    </div>
  )
}

export default SuiviSection
