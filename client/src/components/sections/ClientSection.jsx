import React, { useState, useEffect } from 'react';

function ClientSection() {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newClientName, setNewClientName] = useState('');

  const fetchClients = async () => {
    try {
      const token = window.remoteAuthToken || '';
      const response = await fetch('/api/clients/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.ok) {
        setClients(data.data);
      }
    } catch (err) {
      console.error('Failed to load clients', err);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleAddClient = async () => {
    if (!newClientName.trim()) return;
    try {
      const token = window.remoteAuthToken || '';
      const res = await fetch('/api/state/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'add',
          client: { id: Date.now(), name: newClientName, dossiers: [] }
        })
      });
      if (res.ok) {
        setNewClientName('');
        fetchClients();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="clientSection" className="section" style={{ display: 'none' }}>
      <h1><i className="fa-solid fa-users"></i> Gestion des Clients</h1>
      <div className="clients-toolbar">
        <div className="search-box search-box--clients-pro">
          <i className="fa-solid fa-magnifying-glass"></i>
          <div className="search-box-content">
            <span className="search-box-label">Recherche client</span>
            <input 
              type="text" 
              placeholder="Rechercher un client..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="add-client-form add-client-form--pro">
          <label className="add-client-label" htmlFor="clientName">
            <span className="add-client-label-main"><i className="fa-solid fa-user-plus"></i> Nouveau client</span>
            <span className="add-client-label-sub">Ajout rapide pour lancer un dossier</span>
          </label>
          <div className="add-client-input-wrap">
            <input 
              type="text" 
              placeholder="Nom du client" 
              value={newClientName}
              onChange={e => setNewClientName(e.target.value)}
            />
          </div>
          <button className="btn-success" onClick={handleAddClient}>
            <i className="fa-solid fa-plus"></i> Ajouter
          </button>
        </div>
        <div className="import-excel">
          <input type="file" id="importExcelInput" accept=".xlsx,.xls" style={{ display: 'none' }} />
          <button id="importExcelBtn" className="btn-primary">
            <i className="fa-solid fa-file-import"></i> Importer Excel
          </button>
          <button id="exportBackupExcelBtn" className="btn-primary" type="button">
            <i className="fa-solid fa-file-export"></i> Sauvegarde Excel
          </button>
        </div>
      </div>
      <div id="globalImportHistory" className="import-history-panel" style={{ display: 'none' }}></div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>
                  <button className="btn-primary" onClick={() => {
                    if (window.openDossierModalCreation) {
                       window.openDossierModalCreation(c.id);
                    }
                  }}>
                    <i className="fa-solid fa-plus"></i> Nouveau Dossier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ClientSection
