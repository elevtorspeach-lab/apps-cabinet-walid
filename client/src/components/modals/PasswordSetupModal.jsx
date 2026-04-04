function PasswordSetupModal() {
  return (
    <div id="passwordSetupModal" className="modal-backdrop" style={{ display: 'none' }}>
      <div className="modal-card password-setup-card">
        <div className="modal-head">
          <h2 id="passwordSetupTitle"><i className="fa-solid fa-key"></i> Sécuriser ce compte</h2>
        </div>
        <div className="modal-body password-setup-body">
          <p id="passwordSetupLead" className="password-setup-lead">
            Vous pouvez mettre à jour le mot de passe de ce compte si vous le souhaitez.
          </p>
          <div className="form-group full">
            <label htmlFor="passwordSetupInput">Nouveau mot de passe</label>
            <input type="password" id="passwordSetupInput" placeholder="Ex: 1234" />
          </div>
          <div className="form-group full">
            <label htmlFor="passwordSetupConfirmInput">Confirmer le mot de passe</label>
            <input type="password" id="passwordSetupConfirmInput" placeholder="Retaper le mot de passe" />
          </div>
          <div id="passwordSetupError" className="error-msg password-setup-error">Veuillez définir un mot de passe valide.</div>
          <div className="password-setup-actions">
            <button id="passwordSetupSaveBtn" className="btn-success" type="button">
              <i className="fa-solid fa-shield-halved"></i> <span id="passwordSetupSaveLabel">Mettre à jour</span>
            </button>
            <button id="passwordSetupLogoutBtn" className="btn-danger" type="button">
              <i className="fa-solid fa-right-from-bracket"></i> Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PasswordSetupModal
