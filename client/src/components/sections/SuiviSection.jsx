import React, { useState, useEffect, useCallback } from 'react';

function SuiviSection() {
  const [dossiers, setDossiers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [procFilter, setProcFilter] = useState('all');
  const itemsPerPage = 50;

  const fetchDossiers = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * itemsPerPage;
      let url = `/api/dossiers/paginated?offset=${offset}&limit=${itemsPerPage}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (procFilter !== 'all') url += `&procedure=${encodeURIComponent(procFilter)}`;

      const token = window.remoteAuthToken || '';
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await response.json();
      if (json.ok) {
        setDossiers(json.data);
        setTotal(json.total);
      }
    } catch (err) {
      console.error('Failed to fetch dossiers for Suivi', err);
    } finally {
      setLoading(false);
    }
  }, [page, itemsPerPage, searchTerm, procFilter]);

  useEffect(() => { fetchDossiers() }, [fetchDossiers]);

  const totalPages = Math.ceil(total / itemsPerPage) || 1;

  const handleEditDossier = (d) => {
    if (window.openDossierDetails) {
      window.openDossierDetails(d.clientId, d.dossierIndex || 0);
    } else {
      alert("En attente du chargeur legacy");
    }
  };

  return (
    <div id="suiviSection" className="section" style={{ display: 'none' }}>
      <h1><i className="fa-solid fa-folder-open"></i> Suivi des dossiers</h1>

      <div className="clients-toolbar suivi-toolbar" style={{ marginBottom: '15px' }}>
        <div className="search-box" style={{ flex: 1 }}>
          <i className="fa-solid fa-filter"></i>
          <input
            type="text"
            placeholder="Filter global (toutes les infos du dossier)..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>
        <div className="audience-color-filter">
          <label htmlFor="filterSuiviProcedure">Procédure</label>
          <select value={procFilter} onChange={e => { setProcFilter(e.target.value); setPage(1); }}>
            <option value="all">Toutes</option>
            <option value="ASS">ASS</option>
            <option value="Commandement">Commandement</option>
            <option value="Sanlam">Sanlam</option>
          </select>
        </div>
        <div className="audience-color-filter">
          <label htmlFor="filterSuiviTribunal">Tribunal</label>
          <input type="text" id="filterSuiviTribunal" placeholder="" autoComplete="off" />
        </div>
        <label id="suiviCheckedCount" className="audience-checked-count" htmlFor="suiviPageSelectionToggle">
          <input id="suiviPageSelectionToggle" type="checkbox" aria-label="Cocher ou décocher toute la page suivi" />
          <span className="label">Cochés</span>
          <span id="suiviCheckedCountValue" className="value">0</span>
        </label>
        <button id="selectAllSuiviBtn" className="btn-primary" type="button">
          <i className="fa-solid fa-check"></i> Cocher page
        </button>
        <button id="clearAllSuiviBtn" className="btn-primary" type="button">
          <i className="fa-regular fa-square-xmark"></i> Décocher page
        </button>
        <button id="exportSuiviBtn" className="btn-primary" type="button">
          <i className="fa-solid fa-file-export"></i> Exporter
        </button>
        <button id="previewSuiviBtn" className="btn-primary" type="button">
          <i className="fa-regular fa-eye"></i> Voir le fichier
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Sélection</th>
              <th>Type</th>
              <th>Client</th>
              <th>Date d'affectation</th>
              <th>Référence Client</th>
              <th>Procédure</th>
              <th>Débiteur</th>
              <th>Montant</th>
              <th>Ville</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="11" style={{textAlign:'center', padding:'2rem'}}>Chargement...</td></tr>
            ) : dossiers.length === 0 ? (
              <tr><td colSpan="11" style={{textAlign:'center', padding:'2rem'}}>Aucun dossier trouvé</td></tr>
            ) : (
              dossiers.map(d => (
                <tr key={d.dossierId} className={d.isDuplicate ? 'row-duplicate' : ''}>
                  <td><input type="checkbox" className="suivi-row-checkbox" /></td>
                  <td>-</td>
                  <td>{d.clientName}</td>
                  <td>{d.dateDepot || '-'}</td>
                  <td>{d.referenceClient || '-'}</td>
                  <td>{d.procedure || Object.keys(d.procedureDetails || {}).join(', ')}</td>
                  <td>{d.debiteur || '-'}</td>
                  <td>-</td>
                  <td>{d.ville || '-'}</td>
                  <td>-</td>
                  <td>
                    <button className="btn-primary" onClick={() => handleEditDossier(d)}>
                       <i className="fa-regular fa-eye"></i> Voir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="table-pagination" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', alignItems: 'center' }}>
         <div>Affichage: page {page} sur {totalPages}</div>
         <div>
            <button className="btn-primary" disabled={page === 1} onClick={() => setPage(page-1)}>Précédent</button>
            <button className="btn-primary" disabled={page >= totalPages} onClick={() => setPage(page+1)} style={{marginLeft: '10px'}}>Suivant</button>
         </div>
      </div>
    </div>
  )
}

export default SuiviSection
