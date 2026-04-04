function DossierModal() {
  return (
    <div id="dossierModal" className="modal-backdrop" style={{ display: 'none' }}>
      <div className="modal-card">
        <div className="modal-head">
          <h2><i className="fa-solid fa-folder-open"></i> Détails du dossier</h2>
          <button id="closeDossierModalBtn" className="btn-danger" type="button">
            <i className="fa-solid fa-xmark"></i> Fermer
          </button>
        </div>
        <div id="dossierModalBody" className="modal-body"></div>
      </div>
    </div>
  )
}

export default DossierModal
