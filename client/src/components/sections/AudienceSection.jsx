import React, { useState, useEffect, useCallback } from 'react';

function AudienceSection() {
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
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await response.json();
      if (json.ok) {
        setDossiers(json.data);
        setTotal(json.total);
      }
    } catch (err) {
      console.error('Failed to fetch dossiers', err);
    } finally {
      setLoading(false);
    }
  }, [page, itemsPerPage, searchTerm, procFilter]);

  useEffect(() => {
    // Only fetch if tab is active or just eagerly load
    fetchDossiers();
  }, [fetchDossiers]);

  const totalPages = Math.ceil(total / itemsPerPage) || 1;

  const handleEditDossier = (d) => {
    if (window.openDossierDetails) {
      window.openDossierDetails(d.clientId, d.dossierIndex || 0); // Need exact legacy lookup if using app.js
    } else {
      alert("En attente du chargeur legacy");
    }
  };

  return (
    <div id="audienceSection" className="section" style={{ display: 'none' }}>
      <h1><i className="fa-solid fa-gavel"></i> Audience</h1>

      <div className="clients-toolbar audience-toolbar">
        <div className="audience-actions-row">
          <div className="audience-actions-center">
            <div className="audience-color-group">
              <div className="audience-color-group-label">Couleur</div>
              <div className="color-filters">
                <button className="color-btn all active" data-color="all">Tous</button>
                <button className="color-btn white" data-color="white">Blanc</button>
                <button id="audienceErrorsBtn" className="color-btn error" type="button">Erreurs</button>
                <button className="color-btn blue" data-color="blue">Att sort</button>
                <button className="color-btn green" data-color="green">ATT ORD</button>
                <button className="color-btn yellow" data-color="yellow">ORD OK</button>
                <button className="color-btn document-ok" data-color="document-ok">Document OK</button>
                <button className="color-btn purple-dark" data-color="closed">Soldé / Arrêt définitif</button>
              </div>
            </div>
          </div>

          <div className="audience-actions-right">
            <label id="audienceCheckedCount" className="audience-checked-count" htmlFor="audiencePageSelectionToggle">
              <input id="audiencePageSelectionToggle" type="checkbox" aria-label="Cocher ou décocher toute la page audience" />
              <span className="label">Cochés</span>
              <span id="audienceCheckedCountValue" className="value">0</span>
            </label>
            <button id="undoAudienceColorBtn" className="btn-primary" type="button" disabled>
              <i className="fa-solid fa-rotate-left"></i> Précédent
            </button>
            <button id="printAudienceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-square-check"></i> Cocher
            </button>
            <button id="selectAllPrintAudienceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-check-double"></i> Cocher page
            </button>
            <button id="clearAllPrintAudienceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-eraser"></i> Décocher page
            </button>
            <button id="exportAudienceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-file-export"></i> Exporter
            </button>
            <button id="exportAudienceDetailBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-file-lines"></i> Export d&apos;audience
            </button>
            <button id="previewAudienceBtn" className="btn-primary" type="button">
              <i className="fa-regular fa-eye"></i> Aperçu Excel
            </button>
          </div>
        </div>

        <div className="audience-filter-row">
          <div className="audience-search-shell">
            <div className="search-box audience-search-box">
              <i className="fa-solid fa-filter"></i>
              <input 
                type="text" 
                placeholder="Filter global (date / client / réf client)..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                autoComplete="off" 
              />
            </div>
          </div>

          <div className="audience-color-filter">
            <label htmlFor="filterAudienceColor">Sort</label>
            <select id="filterAudienceColor">
              <option value="all">Toutes</option>
              <option value="blue">Att sort</option>
              <option value="green">ATT ORD</option>
              <option value="yellow">ORD OK</option>
              <option value="document-ok">Document OK</option>
              <option value="closed">Soldé / Arrêt définitif</option>
            </select>
          </div>

          <div className="audience-color-filter">
            <label htmlFor="filterAudienceProcedure">Procédure</label>
            <select value={procFilter} onChange={e => { setProcFilter(e.target.value); setPage(1); }}>
              <option value="all">Toutes</option>
              <option value="ASS">ASS</option>
              <option value="Commandement">Commandement</option>
              <option value="Sanlam">Sanlam</option>
            </select>
          </div>

          <div className="audience-color-filter">
            <label htmlFor="filterAudienceTribunal">Tribunal</label>
            <input type="text" id="filterAudienceTribunal" placeholder="" autoComplete="off" />
          </div>
        </div>

        <div className="audience-filter-import-row">
          <button id="saveAudienceBtn" className="btn-success" type="button">
            <i className="fa-solid fa-floppy-disk"></i> Enregistrer
          </button>
          <span id="audienceSaveFeedback" className="audience-save-feedback" aria-live="polite" style={{ display: 'none' }}></span>
          <div className="import-excel">
            <input type="file" id="importAudienceExcelInput" accept=".xlsx,.xls" style={{ display: 'none' }} />
            <button id="importAudienceExcelBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-file-import"></i> Importer Audience
            </button>
          </div>
        </div>

      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Client</th>
              <th>Référence Client</th>
              <th>Débiteur</th>
              <th>Référence dossier</th>
              <th>Date d'audience</th>
              <th>Juge</th>
              <th>Sort</th>
              <th>Tribunal</th>
              <th>Procédure</th>
              <th>Date dépôt</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="13" style={{textAlign:'center', padding:'2rem'}}>Chargement...</td></tr>
            ) : dossiers.length === 0 ? (
              <tr><td colSpan="13" style={{textAlign:'center', padding:'2rem'}}>Aucune audience trouvée</td></tr>
            ) : (
              dossiers.map(d => {
                let currentSort = '';
                let dateAudience = '';
                let juge = '';
                let statut = '';
                if (d.procedureDetails) {
                  const proc = d.procedureDetails['ASS'] || d.procedureDetails['Commandement'] || d.procedureDetails['Sanlam'] || d.procedureDetails['Injonction'];
                  currentSort = proc ? (proc.sort || '') : '';
                  dateAudience = proc ? (proc.dateAudience || '') : '';
                  juge = proc ? (proc.juge || '') : '';
                  if (!currentSort && d.procedureDetails['SFDC']) {
                    currentSort = d.procedureDetails['SFDC'].statut || '';
                  }
                }
                
                let rowColor = '';
                if(currentSort === 'Att sort') rowColor = 'row-blue';
                else if(currentSort === 'ATT ORD') rowColor = 'row-green';
                else if(currentSort === 'ORD OK') rowColor = 'row-yellow';
                else if(currentSort === 'Soldé' || currentSort === 'Arrêt définitif') rowColor = 'row-purple';

                return (
                  <tr key={d.dossierId} className={rowColor}>
                    <td><input type="checkbox" className="dossier-row-checkbox" /></td>
                    <td>{d.clientName}</td>
                    <td>{d.referenceClient || '-'}</td>
                    <td>{d.debiteur || '-'}</td>
                    <td>{d.reference || '-'}</td>
                    <td>{dateAudience || '-'}</td>
                    <td>{juge || '-'}</td>
                    <td><strong>{currentSort || '-'}</strong></td>
                    <td>{d.tribunal || '-'}</td>
                    <td>{d.procedure || Object.keys(d.procedureDetails || {}).join(', ')}</td>
                    <td>{d.dateDepot || '-'}</td>
                    <td>{statut || '-'}</td>
                    <td>
                      <button className="btn-primary" onClick={() => handleEditDossier(d)}>
                         <i className="fa-regular fa-eye"></i> Voir
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="table-pagination" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', alignItems: 'center' }}>
         <div>Affichage: page {page} sur {totalPages} (Total: {total} dossiers SQL)</div>
         <div>
            <button className="btn-primary" disabled={page === 1} onClick={() => setPage(page-1)}>Précédent</button>
            <button className="btn-primary" disabled={page >= totalPages} onClick={() => setPage(page+1)} style={{marginLeft: '10px'}}>Suivant</button>
         </div>
      </div>
      <div id="audienceImportHistory" className="import-history-panel" style={{ display: 'none' }}></div>
    </div>
  )
}

export default AudienceSection
