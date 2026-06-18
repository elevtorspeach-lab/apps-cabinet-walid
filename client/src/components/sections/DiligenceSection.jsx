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
            <div className="audience-color-filter" id="diligenceLotDuFilterContainer" style={{ display: 'none' }}>
              <label htmlFor="diligenceLotDuFilterButton">Lot du</label>
              <input type="text" id="diligenceLotDuFilter" list="diligenceLotDuOptions" placeholder="" autoComplete="off" />
              <div id="diligenceLotDuFilterMenu" className="diligence-observation-filter-menu" style={{ display: 'none', position: 'relative' }}>
                <button id="diligenceLotDuFilterButton" className="btn-primary" type="button" style={{ minWidth: 140 }}>
                  Toutes
                </button>
                <div
                  id="diligenceLotDuFilterPanel"
                  style={{
                    display: 'none',
                    position: 'absolute',
                    zIndex: 50,
                    top: '100%',
                    left: 0,
                    minWidth: 220,
                    maxHeight: 260,
                    overflow: 'auto',
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    boxShadow: '0 12px 28px rgba(15,23,42,.18)',
                    padding: 8,
                  }}
                >
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 2px' }}>
                    <input type="checkbox" id="diligenceLotDuSelectAll" defaultChecked />
                    <span>(Selectionner tout)</span>
                  </label>
                  <div id="diligenceLotDuFilterOptions"></div>
                </div>
              </div>
            </div>
            <div className="audience-color-filter" id="diligenceObservationFilterContainer" style={{ display: 'none' }}>
              <label htmlFor="diligenceObservationFilterButton">Observation</label>
              <input type="text" id="diligenceObservationFilter" placeholder="Observation" style={{ display: 'none' }} />
              <div className="diligence-observation-filter-menu" style={{ position: 'relative' }}>
                <button id="diligenceObservationFilterButton" className="btn-primary" type="button" style={{ minWidth: 140 }}>
                  Toutes
                </button>
                <div
                  id="diligenceObservationFilterPanel"
                  style={{
                    display: 'none',
                    position: 'absolute',
                    zIndex: 50,
                    top: '100%',
                    left: 0,
                    minWidth: 220,
                    maxHeight: 260,
                    overflow: 'auto',
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    boxShadow: '0 12px 28px rgba(15,23,42,.18)',
                    padding: 8,
                  }}
                >
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 2px' }}>
                    <input type="checkbox" id="diligenceObservationSelectAll" defaultChecked />
                    <span>(Selectionner tout)</span>
                  </label>
                  <div id="diligenceObservationFilterOptions"></div>
                </div>
              </div>
            </div>
            <div className="audience-color-filter" id="diligenceSortFilterContainer">
              <label htmlFor="diligenceSortFilter">Sort</label>
              <select id="diligenceSortFilter">
                <option value="all">Tous</option>
              </select>
            </div>
            <div className="audience-color-filter" id="diligenceDelegationFilterContainer">
              <label htmlFor="diligenceDelegationFilter" id="diligenceDelegationFilterLabel">Délégation</label>
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
            <div className="audience-color-filter" id="diligenceSortSciFilterContainer" style={{ display: 'none' }}>
              <label htmlFor="diligenceSortSciFilter">Sort SCI</label>
              <select id="diligenceSortSciFilter">
                <option value="all">Tous</option>
                <option value="-">-</option>
                <option value="ATT ENREGISTREMENT">ATT ENREGISTREMENT</option>
                <option value="CERTIFICAT A RETIRER">CERTIFICAT A RETIRER</option>
                <option value="SCI ENREGISTRÉE">SCI ENREGISTRÃ‰E</option>
                <option value="PAS ENREGISTRER">PAS ENREGISTRER</option>
              </select>
            </div>
            <div className="audience-color-filter" id="diligenceSciTfObservationBulkContainer" style={{ display: 'none' }}>
              <label htmlFor="diligenceSciTfObservationBulkInput">Observation</label>
              <input type="text" id="diligenceSciTfObservationBulkInput" placeholder="Observation" />
              <button id="diligenceSciTfObservationBulkBtn" className="btn-primary" type="button">
                <i className="fa-solid fa-check"></i> Appliquer
              </button>
            </div>
            <div className="audience-color-filter" id="diligenceMiseAPrixFilterContainer" style={{ display: 'none' }}>
              <label htmlFor="diligenceMiseAPrixFilter">Mise à prix</label>
              <select id="diligenceMiseAPrixFilter">
                <option value="all">Toutes</option>
                <option value="vide">Vide</option>
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
            <button id="addDiligenceSaisieArretBtn" className="btn-success" type="button" style={{ display: 'none' }}>
              <i className="fa-solid fa-plus"></i> Ajouter saisie arrêt
            </button>
            <button id="importDiligenceSaisieArretBtn" className="btn-primary btn-saisie-arret-import" type="button" style={{ display: 'none' }}>
              <i className="fa-solid fa-file-import"></i> Importer Saisie Arrêt
            </button>
            <input type="file" id="diligenceSaisieArretImportInput" accept=".xlsx,.xls" style={{ display: 'none' }} />
            <button id="deleteDiligenceSaisieArretBtn" className="btn-danger" type="button" style={{ display: 'none' }} disabled>
              <i className="fa-solid fa-trash"></i> Supprimer cochés
            </button>
            <button id="exportDiligenceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-file-export"></i> Exporter
            </button>
            <button id="importDiligenceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-file-import"></i> Importer
            </button>
            <input type="file" id="diligenceImportInput" accept=".xlsx,.xls" style={{ display: 'none' }} />
            <button id="previewDiligenceBtn" className="btn-primary" type="button">
              <i className="fa-regular fa-eye"></i> Voir le fichier
            </button>
            <button id="exportDiligenceBackupExcelBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-file-export"></i> Sauvegarde Excel
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
                  <th>Certificat non appel / Lettre Rec</th>
                  <th>Execution N° / Curateur N°</th>
                  <th>Ville / ORD</th>
                  <th>Délégation / Notif curateur</th>
                  <th>Huissier / Sort notif</th>
                  <th>Avis curateur</th>
                  <th>Tribunal</th>
                </tr>
              </thead>
              <tbody id="diligenceBody"></tbody>
            </table>
          </div>
          <div id="diligencePagination" className="table-pagination"></div>
        </div>
      </div>
      <div id="diligenceImportHistory" className="import-history-panel import-history-panel--inline-menu" style={{ display: 'none' }}></div>
    </div>
  )
}

export default DiligenceSection
