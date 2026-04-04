function ImportProgressModal() {
  return (
    <div id="importProgressModal" className="modal-backdrop" style={{ display: 'none' }}>
      <div className="modal-card import-progress-card">
        <div className="modal-head">
          <h2 id="importProgressTitle"><i className="fa-solid fa-rotate"></i> Import en cours...</h2>
        </div>
        <div className="modal-body">
          <p id="importProgressText" className="import-progress-text">Préparation...</p>
          <div className="import-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div id="importProgressFill" className="import-progress-fill"></div>
          </div>
          <p id="importProgressPercent" className="import-progress-percent">0%</p>
        </div>
      </div>
    </div>
  )
}

export default ImportProgressModal
