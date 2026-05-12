function FactureDocumentPreviewModal() {
  return (
    <div id="factureDocumentPreviewModal" className="modal-backdrop" style={{ display: 'none' }}>
      <div className="modal-card facture-document-preview-card">
        <div className="modal-head">
          <h2><i className="fa-solid fa-file-invoice"></i> Apercu facture</h2>
          <div className="preview-modal-actions">
            <button id="toggleFacturePreviewEditBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-pen-to-square"></i> Modifier
            </button>
            <button id="saveFacturePreviewEditsBtn" className="btn-success" type="button">
              <i className="fa-solid fa-floppy-disk"></i> Sauvegarder
            </button>
            <button id="addFacturePreviewRowBtn" className="btn-primary" type="button" disabled>
              <i className="fa-solid fa-plus"></i> Ligne
            </button>
            <button id="addFacturePreviewColumnBtn" className="btn-primary" type="button" disabled>
              <i className="fa-solid fa-table-columns"></i> Case
            </button>
            <button id="exportFactureDocumentExcelBtn" className="btn-success" type="button">
              <i className="fa-regular fa-file-excel"></i> Exporter Excel
            </button>
            <button id="closeFactureDocumentPreviewModalBtn" className="btn-danger" type="button">
              <i className="fa-solid fa-xmark"></i> Fermer
            </button>
          </div>
        </div>
        <div className="modal-body facture-document-preview-body">
          <div id="factureDocumentPreviewContent" className="facture-document-preview-content"></div>
        </div>
      </div>
    </div>
  )
}

export default FactureDocumentPreviewModal
