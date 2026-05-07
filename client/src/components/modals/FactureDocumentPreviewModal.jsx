function FactureDocumentPreviewModal() {
  return (
    <div id="factureDocumentPreviewModal" className="modal-backdrop" style={{ display: 'none' }}>
      <div className="modal-card facture-document-preview-card">
        <div className="modal-head">
          <h2><i className="fa-solid fa-file-invoice"></i> Aperçu facture</h2>
          <div className="preview-modal-actions">
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
