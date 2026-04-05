function DiligenceSection() {
  return (
    <div id="diligenceSection" className="section" style={{ display: 'none' }}>
      <h1><i className="fa-solid fa-list-check"></i> Diligence</h1>
      <div className="pro-card">
        <div className="pro-header">
          <div className="pro-title">
            <i className="fa-solid fa-clipboard-list"></i> Procédures
          </div>
        </div>
        <div className="pro-body">
          <div className="diligence-toolbar">
            <div className="search-box diligence-search-box">
              <i className="fa-solid fa-filter"></i>
              <input type="text" id="diligenceSearchInput" placeholder="Filtrer (client / débiteur / réf dossier / notification / exécution / huissier / tribunal)..." />
            </div>
            <div className="audience-color-filter">
              <label htmlFor="diligenceSortFilter">Sort</label>
              <select id="diligenceSortFilter">
                <option value="all">Tous</option>
              </select>
            </div>
            <div className="audience-color-filter">
              <label htmlFor="diligenceDelegationFilter">Délégation</label>
              <select id="diligenceDelegationFilter">
                <option value="all">Toutes</option>
              </select>
            </div>
            <div className="audience-color-filter">
              <label htmlFor="diligenceOrdonnanceFilter">Ordonnance</label>
              <select id="diligenceOrdonnanceFilter">
                <option value="all">Toutes</option>
              </select>
            </div>
            <div className="audience-color-filter">
              <label htmlFor="diligenceProcedureFilter">Procédure</label>
              <select id="diligenceProcedureFilter">
                <option value="all">Toutes</option>
              </select>
            </div>
            <div className="audience-color-filter">
              <label htmlFor="diligenceTribunalFilter">Tribunal</label>
              <input
                type="text"
                id="diligenceTribunalFilter"
                list="diligenceTribunalOptions"
                placeholder=""
                autoComplete="off"
              />
              <datalist id="diligenceTribunalOptions"></datalist>
            </div>
            <label id="diligenceCheckedCount" className="audience-checked-count" htmlFor="diligencePageSelectionToggle">
              <input id="diligencePageSelectionToggle" type="checkbox" aria-label="Cocher ou décocher toute la page diligence" />
              <span className="label">Cochés</span>
              <span id="diligenceCheckedCountValue" className="value">0</span>
            </label>
            <button id="selectAllDiligenceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-check-double"></i> Cocher page
            </button>
            <button id="clearAllDiligenceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-eraser"></i> Décocher page
            </button>
            <button id="exportDiligenceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-file-export"></i> Exporter
            </button>
            <button id="previewDiligenceBtn" className="btn-primary" type="button">
              <i className="fa-regular fa-eye"></i> Voir le fichier
            </button>
          </div>
          <div id="diligenceCount" className="diligence-count"></div>
          <div id="diligenceTableContainer" className="table-container">
            <table>
              <thead>
                <tr id="diligenceHeadRow">
                  <th>Client</th>
                  <th>Référence client</th>
                  <th>Nom</th>
                  <th>Date dépôt</th>
                  <th>Référence dossier</th>
                  <th>Juge</th>
                  <th>Sort</th>
                  <th>Ordonnance</th>
                  <th>Notification N°</th>
                  <th>Sort notification</th>
                  <th>Lettre Rec</th>
                  <th>Curateur N°</th>
                  <th>ORD</th>
                  <th>Notif curateur</th>
                  <th>Sort notif</th>
                  <th>PV Police</th>
                  <th>Certificat non appel</th>
                  <th>Execution N°</th>
                  <th>Ville</th>
                  <th>Délégation</th>
                  <th>Huissier</th>
                  <th>Tribunal</th>
                </tr>
              </thead>
              <tbody id="diligenceBody"></tbody>
            </table>
          </div>
          <div id="diligencePagination" className="table-pagination"></div>
        </div>
      </div>
    </div>
  )
}

export default DiligenceSection
