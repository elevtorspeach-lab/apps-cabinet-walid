function AudienceSection() {
  return (
    <div id="audienceSection" className="section" style={{ display: 'none' }}>
      <h1><i className="fa-solid fa-gavel"></i> Audience</h1>

      <div className="clients-toolbar audience-toolbar">
        <div className="audience-actions-row">
          <div className="audience-actions-center">
            <div className="audience-color-group">
              <div className="audience-color-group-label">Couleur</div>
              <div className="color-filters">
                <button className="color-btn all active" data-color="all">Tous</button>
                <button className="color-btn white" data-color="white">Blanc</button>
                <button id="audienceErrorsBtn" className="color-btn error" type="button">Erreurs</button>
                <button className="color-btn blue" data-color="blue">Att sort</button>
                <button className="color-btn green" data-color="green">ATT ORD</button>
                <button className="color-btn yellow" data-color="yellow">ORD OK</button>
                <button className="color-btn document-ok" data-color="document-ok">Document OK</button>
                <button className="color-btn purple-dark" data-color="closed">Soldé / Arrêt définitif</button>
              </div>
            </div>
          </div>

          <div className="audience-actions-right">
            <label id="audienceCheckedCount" className="audience-checked-count" htmlFor="audiencePageSelectionToggle">
              <input id="audiencePageSelectionToggle" type="checkbox" aria-label="Cocher ou décocher toute la page audience" />
              <span className="label">Cochés</span>
              <span id="audienceCheckedCountValue" className="value">0</span>
            </label>
            <button id="undoAudienceColorBtn" className="btn-primary" type="button" disabled>
              <i className="fa-solid fa-rotate-left"></i> Précédent
            </button>
            <button id="printAudienceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-square-check"></i> Cocher
            </button>
            <button id="selectAllPrintAudienceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-check-double"></i> Cocher page
            </button>
            <button id="clearAllPrintAudienceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-eraser"></i> Décocher page
            </button>
            <button id="exportAudienceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-file-export"></i> Exporter
            </button>
            <button id="exportAudienceDetailBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-file-lines"></i> Export d&apos;audience
            </button>
            <button id="previewAudienceBtn" className="btn-primary" type="button">
              <i className="fa-regular fa-eye"></i> Aperçu Excel
            </button>
          </div>
        </div>

        <div className="audience-filter-row">
          <div className="audience-search-shell">
            <div className="search-box audience-search-box">
              <i className="fa-solid fa-filter"></i>
              <input type="text" id="filterAudience" placeholder="Filter global (date / client / réf client / réf dossier)..." autoComplete="off" />
            </div>
          </div>

          <div className="audience-color-filter">
            <label htmlFor="filterAudienceColor">Sort</label>
            <select id="filterAudienceColor">
              <option value="all">Toutes</option>
              <option value="blue">Att sort</option>
              <option value="green">ATT ORD</option>
              <option value="yellow">ORD OK</option>
              <option value="document-ok">Document OK</option>
              <option value="closed">Soldé / Arrêt définitif</option>
            </select>
          </div>

          <div className="audience-color-filter">
            <label htmlFor="filterAudienceProcedure">Procédure</label>
            <select id="filterAudienceProcedure">
              <option value="all">Toutes</option>
            </select>
          </div>

          <div className="audience-color-filter">
            <label htmlFor="filterAudienceTribunal">Tribunal</label>
            <input
              type="text"
              id="filterAudienceTribunal"
              list="filterAudienceTribunalOptions"
              placeholder=""
              autoComplete="off"
            />
            <datalist id="filterAudienceTribunalOptions">
            </datalist>
          </div>
        </div>

        <div className="audience-filter-import-row">
          <button id="saveAudienceBtn" className="btn-success" type="button">
            <i className="fa-solid fa-floppy-disk"></i> Enregistrer
          </button>
          <span id="audienceSaveFeedback" className="audience-save-feedback" aria-live="polite" style={{ display: 'none' }}></span>
          <div className="import-excel">
            <input type="file" id="importAudienceExcelInput" accept=".xlsx,.xls" style={{ display: 'none' }} />
            <button id="importAudienceExcelBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-file-import"></i> Importer Audience
            </button>
          </div>
        </div>

      </div>

      <div id="audienceTableContainer" className="table-container">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Client</th>
              <th>Référence Client</th>
              <th>Débiteur</th>
              <th>Référence dossier</th>
              <th>Date d&apos;audience</th>
              <th>Juge</th>
              <th>Sort</th>
              <th>Tribunal</th>
              <th>Procédure</th>
              <th>Date dépôt</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="audienceBody"></tbody>
        </table>
      </div>
      <div id="audiencePagination" className="table-pagination"></div>
      <div id="audienceImportHistory" className="import-history-panel" style={{ display: 'none' }}></div>
    </div>
  )
}

export default AudienceSection
