function EquipeSection() {
  return (
    <div id="equipeSection" className="section" style={{ display: 'none' }}>
      <h1><i className="fa-solid fa-user-group"></i> Equipe</h1>
      <div id="teamLocked" className="diligence-empty" style={{ display: 'none' }}>
        Réservé au gestionnaire.
      </div>
      <div id="teamManagerPanel">
        <div className="pro-card">
          <div className="pro-header">
            <div className="pro-title"><i className="fa-solid fa-user-plus"></i> Ajouter / Modifier utilisateur</div>
          </div>
          <div className="pro-body">
            <div className="form-group">
              <label>Username</label>
              <input type="text" id="teamUsername" placeholder="username" />
            </div>
            <div className="form-group">
              <label>Mot de passe</label>
              <input type="password" id="teamPassword" placeholder="mot de passe" />
              <div className="diligence-empty" style={{ marginTop: '8px' }}>
                Vous pouvez utiliser un mot de passe simple comme `1234`. Laisser vide pour garder le mot de passe actuel.
              </div>
            </div>
            <div className="form-group">
              <label>Rôle</label>
              <select id="teamRole">
                <option value="client">Client</option>
                <option value="admin">Admin</option>
                <option value="manager">Gestionnaire</option>
              </select>
            </div>
            <div id="teamClientsWrap" className="form-group full">
              <input type="text" id="teamClientSearchInput" placeholder="Rechercher client..." />
              <div id="teamClientCount" className="diligence-empty">0 client sélectionné</div>
              <div id="teamClientsList" className="team-clients-list"></div>
            </div>
            <div className="form-group full" style={{ display: 'flex', gap: '8px', flexDirection: 'row' }}>
              <button id="teamSaveBtn" className="btn-success"><i className="fa-solid fa-floppy-disk"></i> Enregistrer</button>
              <button id="teamResetBtn" className="btn-primary" type="button"><i className="fa-solid fa-rotate-left"></i> Réinitialiser</button>
              <button id="teamProvisionStructureBtn" className="btn-primary" type="button"><i className="fa-solid fa-users-gear"></i> Structure 2G / 10A / 9C</button>
            </div>
          </div>
        </div>
        <div id="equipeTableContainer" className="table-container" style={{ marginTop: '12px' }}>
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Rôle</th>
                <th>Clients autorisés</th>
                <th>Sécurité</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="teamUsersBody"></tbody>
          </table>
        </div>
        <div id="equipePagination" className="table-pagination"></div>
      </div>
    </div>
  )
}

export default EquipeSection
