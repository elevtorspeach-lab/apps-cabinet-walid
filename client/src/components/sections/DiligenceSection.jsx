import React, { useState, useEffect, useCallback } from 'react';

function DiligenceSection() {
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
      console.error('Failed to fetch diligences', err);
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
    <div id="diligenceSection" className="section" style={{ display: 'none' }}>
      <h1><i className="fa-solid fa-list-check"></i> Diligence</h1>
      <div className="pro-card">
        <div className="pro-header">
          <div className="pro-title">
            <i className="fa-solid fa-clipboard-list"></i> Procédures
          </div>
        </div>
        <div className="pro-body">
          <div className="diligence-toolbar">
            <div className="search-box diligence-search-box">
              <i className="fa-solid fa-filter"></i>
              <input 
                type="text" 
                id="diligenceSearchInput" 
                placeholder="Filtrer (client / débiteur / réf dossier / notification / exécution / huissier / tribunal)..." 
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              />
            </div>
            <div className="audience-color-filter">
              <label htmlFor="diligenceSortFilter">Sort</label>
              <select id="diligenceSortFilter">
                <option value="all">Tous</option>
              </select>
            </div>
            <div className="audience-color-filter">
              <label htmlFor="diligenceDelegationFilter">Délégation</label>
              <select id="diligenceDelegationFilter">
                <option value="all">Toutes</option>
              </select>
            </div>
            <div className="audience-color-filter">
              <label htmlFor="diligenceOrdonnanceFilter">Ordonnance</label>
              <select id="diligenceOrdonnanceFilter">
                <option value="all">Toutes</option>
              </select>
            </div>
            <div className="audience-color-filter">
              <label htmlFor="diligenceProcedureFilter">Procédure</label>
              <select value={procFilter} onChange={e => { setProcFilter(e.target.value); setPage(1); }}>
                <option value="all">Toutes</option>
                <option value="ASS">ASS</option>
                <option value="Commandement">Commandement</option>
                <option value="Sanlam">Sanlam</option>
              </select>
            </div>
            <div className="audience-color-filter" id="diligenceMiseAPrixFilterContainer" style={{ display: 'none' }}>
              <label htmlFor="diligenceMiseAPrixFilter">Mise à prix</label>
              <select id="diligenceMiseAPrixFilter">
                <option value="all">Toutes</option>
                <option value="vide">Vide</option>
              </select>
            </div>
            <div className="audience-color-filter">
              <label htmlFor="diligenceTribunalFilter">Tribunal</label>
              <input
                type="text"
                id="diligenceTribunalFilter"
                list="diligenceTribunalOptions"
                placeholder=""
                autoComplete="off"
              />
              <datalist id="diligenceTribunalOptions"></datalist>
            </div>
            <label id="diligenceCheckedCount" className="audience-checked-count" htmlFor="diligencePageSelectionToggle">
              <input id="diligencePageSelectionToggle" type="checkbox" aria-label="Cocher ou décocher toute la page diligence" />
              <span className="label">Cochés</span>
              <span id="diligenceCheckedCountValue" className="value">0</span>
            </label>
            <button id="selectAllDiligenceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-check-double"></i> Cocher page
            </button>
            <button id="clearAllDiligenceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-eraser"></i> Décocher page
            </button>
            <button id="exportDiligenceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-file-export"></i> Exporter
            </button>
            <button id="importDiligenceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-file-import"></i> Importer
            </button>
            <input type="file" id="diligenceImportInput" accept=".xlsx,.xls" style={{ display: 'none' }} />
            <button id="previewDiligenceBtn" className="btn-primary" type="button">
              <i className="fa-regular fa-eye"></i> Voir le fichier
            </button>
          </div>
          <div id="diligenceCount" className="diligence-count">Total SQL: {total}</div>
          <div className="table-container">
            <table>
              <thead>
                <tr id="diligenceHeadRow">
                  <th>Client</th>
                  <th>Référence client</th>
                  <th>Nom</th>
                  <th>Date dépôt</th>
                  <th>Référence dossier</th>
                  <th>Juge</th>
                  <th>Sort</th>
                  <th>Ordonnance</th>
                  <th>Notification N°</th>
                  <th>Plie</th>
                  <th>Sort notification</th>
                  <th>Observation</th>
                  <th>Lettre Rec</th>
                  <th>Curateur N°</th>
                  <th>ORD</th>
                  <th>Notif curateur</th>
                  <th>Sort notif</th>
                  <th>PV Police</th>
                  <th>Certificat non appel</th>
                  <th>Execution N°</th>
                  <th>Ville</th>
                  <th>Délégation</th>
                  <th>Huissier</th>
                  <th>Tribunal</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="25" style={{textAlign:'center', padding:'2rem'}}>Chargement...</td></tr>
                ) : dossiers.length === 0 ? (
                  <tr><td colSpan="25" style={{textAlign:'center', padding:'2rem'}}>Aucune diligence trouvée</td></tr>
                ) : (
                  dossiers.map(d => (
                    <tr key={d.dossierId}>
                      <td>{d.clientName}</td>
                      <td>{d.referenceClient || '-'}</td>
                      <td>{d.debiteur || '-'}</td>
                      <td>{d.dateDepot || '-'}</td>
                      <td>{d.reference || '-'}</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>{d.ville || '-'}</td>
                      <td>-</td>
                      <td>-</td>
                      <td>{d.tribunal || '-'}</td>
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
      </div>
    </div>
  )
}

export default DiligenceSection
