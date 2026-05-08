function FactureSection() {
  return (
    <div id="factureSection" className="section" style={{ display: 'none' }}>
      <h1><i className="fa-solid fa-file-invoice"></i> Facture</h1>
      <div className="pro-card facture-card">
        <div className="pro-header">
          <div className="pro-title">
            <i className="fa-solid fa-receipt"></i> Honoraires
          </div>
        </div>
        <div className="pro-body facture-body">
          <div className="facture-picker-grid">
            <div className="form-group creation-layout-card facture-field-card">
              <label htmlFor="factureClientSelect">Client</label>
              <select id="factureClientSelect">
                <option value="">Choisir client</option>
              </select>
            </div>

            <div id="factureDossierSearchWrap" className="form-group creation-layout-card facture-field-card" style={{ display: 'none' }}>
              <label htmlFor="factureDossierSearchInput">Recherche dossier</label>
              <div className="search-box facture-search-box">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input id="factureDossierSearchInput" type="text" placeholder="Filtrer dossier..." autoComplete="off" />
              </div>
            </div>
          </div>

          <div className="facture-tracking-card">
            <div className="facture-tracking-head">
              <div>
                <strong>Suivi des factures</strong>
                <span id="factureTrackingCount">0 facture</span>
              </div>
              <button id="refreshFactureTrackingBtn" className="btn-primary" type="button">
                <i className="fa-solid fa-rotate"></i> Actualiser
              </button>
            </div>
            <div id="factureTrackingList" className="facture-tracking-list"></div>
          </div>

          <div id="factureDossierResults" className="facture-dossier-results" style={{ display: 'none' }}></div>

          <div id="factureHonorairePanel" className="facture-honoraire-panel" style={{ display: 'none' }}>
            <div className="facture-selected-title" id="factureSelectedDossierTitle"></div>
            <div className="form-group creation-layout-card facture-document-card">
              <label htmlFor="factureDocumentTypeSelect">Tranches d&apos;honoraire</label>
              <select id="factureDocumentTypeSelect" aria-label="Tranches d'honoraire">
                <option value="Tranche 1">Tranche 1</option>
                <option value="Tranche 2">Tranche 2</option>
                <option value="Tranche 3">Tranche 3</option>
                <option value="Tranche 4">Tranche 4</option>
              </select>
            </div>
            <div className="facture-actions">
              <button id="saveFactureHonoraireBtn" className="btn-success" type="button">
                <i className="fa-solid fa-floppy-disk"></i> Enregistrer
              </button>
              <span id="factureSaveFeedback" className="audience-save-feedback" aria-live="polite" style={{ display: 'none' }}></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FactureSection
