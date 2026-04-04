function ExportPreviewModal() {
  return (
    <div id="exportPreviewModal" className="modal-backdrop" style={{ display: 'none' }}>
      <div className="modal-card preview-modal-card">
        <div className="modal-head">
          <h2 id="exportPreviewTitle"><i className="fa-regular fa-file-excel"></i> Aperçu Excel</h2>
          <div className="preview-modal-actions">
            <button id="exportPreviewExcelBtn" className="btn-success" type="button" style={{ display: 'none' }}>
              <i className="fa-regular fa-file-excel"></i> Exporter Excel
            </button>
            <button id="closeExportPreviewModalBtn" className="btn-danger" type="button">
              <i className="fa-solid fa-xmark"></i> Fermer
            </button>
          </div>
        </div>
        <div className="modal-body preview-modal-body">
          <div id="exportPreviewMeta" className="preview-modal-meta"></div>
          <div id="exportPreviewTableWrap" className="preview-table-wrap"></div>
        </div>
      </div>
    </div>
  )
}

export default ExportPreviewModal
