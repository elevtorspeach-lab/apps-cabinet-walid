function ImportResultModal() {
  return (
    <div id="importResultModal" className="modal-backdrop" style={{ display: 'none' }}>
      <div className="modal-card import-result-card">
        <div className="modal-head">
          <h2><i className="fa-solid fa-file-import"></i> Résultat import Excel</h2>
          <button id="closeImportResultModalBtn" className="btn-danger" type="button">
            <i className="fa-solid fa-xmark"></i> Fermer
          </button>
        </div>
        <div className="modal-body">
          <pre id="importResultSummary" className="import-result-summary"></pre>
          <div className="import-result-label">Détails des erreurs ignorées</div>
          <div id="importResultErrors" className="import-result-errors" role="region" aria-label="Détails des erreurs ignorées"></div>
          <div className="import-result-actions">
            <button id="copyImportErrorsBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-copy"></i> Copier les erreurs
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportResultModal
