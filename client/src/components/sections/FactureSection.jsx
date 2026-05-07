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

          <div id="factureDossierResults" className="facture-dossier-results" style={{ display: 'none' }}></div>

          <div id="factureHonorairePanel" className="facture-honoraire-panel" style={{ display: 'none' }}>
            <div className="facture-selected-title" id="factureSelectedDossierTitle"></div>
            <div className="form-group creation-layout-card facture-honoraire-card">
              <label htmlFor="factureTranchesHonoraireInput">Tranches d&apos;honoraire</label>
              <textarea id="factureTranchesHonoraireInput" rows="6" placeholder="Tranches d&apos;honoraire"></textarea>
            </div>
            <div className="form-group creation-layout-card facture-document-card">
              <label htmlFor="factureDocumentTypeSelect">Type document</label>
              <select id="factureDocumentTypeSelect">
                <option value="">Choisir type</option>
                <option value="Proces-verbal">Proces-verbal</option>
                <option value="Jugement">Jugement</option>
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
