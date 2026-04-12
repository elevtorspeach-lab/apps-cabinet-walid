import React, { useState, useEffect, useCallback, useRef } from 'react';

function DiligenceSection() {
  const [dossiers, setDossiers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [procFilter, setProcFilter] = useState('all');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.XLSX) {
      alert("La bibliothèque Excel n'est pas encore chargée. Veuillez patienter.");
      return;
    }

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = window.XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (rows.length < 2) {
        alert("Le fichier semble vide.");
        return;
      }

      // Robust Header Mapping
      const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
      const findCol = (aliases) => headers.findIndex(h => aliases.some(a => h.includes(a)));

      const colIdx = {
        refClient: findCol(['ref client', 'référence client', 'reference client', 'ref. client']),
        refDossier: findCol(['ref dossier', 'référence dossier', 'reference dossier']),
        debiteur: findCol(['débiteur', 'debiteur', 'nom']),
        procedure: findCol(['procédure', 'procedure', 'type']),
        sort: findCol(['sort']),
        tribunal: findCol(['tribunal', 'tr']),
        huissier: findCol(['huissier', 'expert']),
        notifNo: findCol(['notification n', 'notification n°', 'notif n', 'notif n°']),
        notifSort: findCol(['sort notification', 'sort notif']),
        execNo: findCol(['exécution n', 'exécution n°', 'execution n', 'execution n°']),
        observation: findCol(['observation', 'remarque']),
      };

      const updates = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const refClient = row[colIdx.refClient] || row[colIdx.refDossier];
        if (!refClient) continue;

        const proc = String(row[colIdx.procedure] || 'ASS').trim();
        const details = {};
        
        if (colIdx.sort !== -1) details.sort = row[colIdx.sort];
        if (colIdx.huissier !== -1) {
          if (proc === 'Commandement') details.expert = row[colIdx.huissier];
          else details.huissier = row[colIdx.huissier];
        }
        if (colIdx.tribunal !== -1) details.tribunal = row[colIdx.tribunal];
        if (colIdx.notifNo !== -1) details.notificationNo = row[colIdx.notifNo];
        if (colIdx.notifSort !== -1) details.notificationSort = row[colIdx.notifSort];
        if (colIdx.execNo !== -1) details.executionNo = row[colIdx.execNo];
        if (colIdx.observation !== -1) details.observation = row[colIdx.observation];

        updates.push({
          referenceClient: String(refClient).trim(),
          debiteur: row[colIdx.debiteur] ? String(row[colIdx.debiteur]).trim() : null,
          procedure: proc,
          data: {
            procedureDetails: {
              [proc]: details
            }
          }
        });
      }

      if (updates.length > 0) {
        const token = window.remoteAuthToken || '';
        const response = await fetch('/api/dossiers/batch-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ updates })
        });
        const result = await response.json();
        if (result.ok) {
          alert(`${result.updated} dossiers mis à jour avec succès!`);
          fetchDossiers();
        } else {
          alert("Erreur lors de la mise à jour: " + result.message);
        }
      }

    } catch (err) {
      console.error("Import error:", err);
      alert("Erreur technique lors de l'importation.");
    } finally {
      setImporting(false);
      e.target.value = ''; // Reset input
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
              <label htmlFor="diligenceProcedureFilter">Procédure</label>
              <select value={procFilter} onChange={e => { setProcFilter(e.target.value); setPage(1); }}>
                <option value="all">Toutes</option>
                <option value="ASS">ASS</option>
                <option value="Commandement">Commandement</option>
                <option value="Sanlam">Sanlam</option>
              </select>
            </div>

            <div className="audience-color-filter">
              <label id="diligenceCheckedCount" className="audience-checked-count">
                <span className="label">Cochés</span>
                <span id="diligenceCheckedCountValue" className="value">0</span>
              </label>
            </div>

            <button id="exportDiligenceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-file-export"></i> Exporter
            </button>
            <button 
                id="importDiligenceBtn" 
                className="btn-primary" 
                type="button" 
                onClick={handleImportClick}
                disabled={importing}
            >
              <i className="fa-solid fa-file-import"></i> {importing ? 'Importation...' : 'Importer'}
            </button>
            <input 
                type="file" 
                ref={fileInputRef}
                id="diligenceImportInput" 
                accept=".xlsx,.xls" 
                style={{ display: 'none' }} 
                onChange={handleFileChange}
            />
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
                  <th>Notification N°</th>
                  <th>Sort notif</th>
                  <th>Execution N°</th>
                  <th>Ville</th>
                  <th>Huissier</th>
                  <th>Tribunal</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="14" style={{textAlign:'center', padding:'2rem'}}>Chargement...</td></tr>
                ) : dossiers.length === 0 ? (
                  <tr><td colSpan="14" style={{textAlign:'center', padding:'2rem'}}>Aucune diligence trouvée</td></tr>
                ) : (
                  dossiers.map(d => {
                    const proc = d.procedureDetails?.[d.procedure] || d.procedureDetails?.['ASS'] || d.procedureDetails?.['Commandement'] || {};
                    return (
                      <tr key={d.dossierId}>
                        <td>{d.clientName}</td>
                        <td>{d.referenceClient || '-'}</td>
                        <td>{d.debiteur || '-'}</td>
                        <td>{d.dateDepot || proc.dateDepot || '-'}</td>
                        <td>{d.reference || proc.referenceClient || '-'}</td>
                        <td>{proc.juge || '-'}</td>
                        <td>{proc.sort || '-'}</td>
                        <td>{proc.notificationNo || '-'}</td>
                        <td>{proc.notificationSort || '-'}</td>
                        <td>{proc.executionNo || '-'}</td>
                        <td>{d.ville || '-'}</td>
                        <td>{proc.huissier || proc.expert || '-'}</td>
                        <td>{d.tribunal || proc.tribunal || '-'}</td>
                        <td>
                          <button className="btn-primary" onClick={() => handleEditDossier(d)}>
                             <i className="fa-regular fa-eye"></i> Voir
                          </button>
                        </td>
                      </tr>
                    );
                  })
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

export default DiligenceSection;
