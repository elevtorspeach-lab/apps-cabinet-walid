function AudienceSection() {
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
                <button className="color-btn pink" data-color="pink">ATT DELEGATION</button>
                <button className="color-btn purple-dark" data-color="closed">{"Sold\u00e9 / Arr\u00eat d\u00e9finitif"}</button>
              </div>
            </div>
          </div>

          <div className="audience-actions-right">
            <label id="audienceCheckedCount" className="audience-checked-count" htmlFor="audiencePageSelectionToggle">
              <input id="audiencePageSelectionToggle" type="checkbox" aria-label={"Cocher ou d\u00e9cocher toute la page audience"} />
              <span className="label">{"Coch\u00e9s"}</span>
              <span id="audienceCheckedCountValue" className="value">0</span>
            </label>
            <button id="undoAudienceColorBtn" className="btn-primary" type="button" disabled>
              <i className="fa-solid fa-rotate-left"></i> {"Pr\u00e9c\u00e9dent"}
            </button>
            <button id="printAudienceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-square-check"></i> Cocher
            </button>
            <button id="selectAllPrintAudienceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-check-double"></i> Cocher page
            </button>
            <button id="clearAllPrintAudienceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-eraser"></i> {"D\u00e9cocher page"}
            </button>
            <button id="exportAudienceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-file-export"></i> Exporter
            </button>
            <button id="exportAudienceDetailBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-file-lines"></i> Export d&apos;audience
            </button>
            <button id="exportAudienceDiligenceBtn" className="btn-primary" type="button">
              <i className="fa-solid fa-list-check"></i> DILLIGENCE
            </button>
            <button id="exportAudienceFactureBtn" className="btn-success" type="button">
              <i className="fa-solid fa-file-invoice"></i> Exporter Facture
            </button>
          </div>
        </div>

        <div className="audience-filter-row">
          <div className="audience-search-shell">
            <div className="search-box audience-search-box">
              <i className="fa-solid fa-filter"></i>
              <input type="text" id="filterAudience" placeholder={"Filter global (client / r\u00e9f client / d\u00e9biteur / juge / sort)..."} autoComplete="off" />
            </div>
          </div>

          <div className="audience-color-filter">
            <label htmlFor="filterAudienceRefDossier">{"R\u00e9f\u00e9rence dossier"}</label>
            <input type="text" id="filterAudienceRefDossier" placeholder="" autoComplete="off" />
          </div>


          <div className="audience-color-filter">
            <label htmlFor="filterAudienceDate">Date d&apos;audience</label>
            <input type="date" id="filterAudienceDate" />
          </div>



          <div className="audience-color-filter">
            <label htmlFor="filterAudienceColor">Sort</label>
            <select id="filterAudienceColor">
              <option value="all">Toutes</option>
              <option value="blue">Att sort</option>
              <option value="green">ATT ORD</option>
              <option value="yellow">ORD OK</option>
              <option value="document-ok">Document OK</option>
              <option value="pink">ATT DELEGATION</option>
              <option value="jugement-ok">ADD J OK</option>
              <option value="jugement-att">J ATT ADD</option>
              <option value="closed">{"Sold\u00e9 / Arr\u00eat d\u00e9finitif"}</option>
            </select>
          </div>

          <div className="audience-color-filter">
            <label htmlFor="filterAudienceProcedure">{"Proc\u00e9dure"}</label>
            <select id="filterAudienceProcedure">
              <option value="all">Toutes</option>
            </select>
          </div>

          <div className="audience-color-filter">
            <label htmlFor="filterAudienceTribunal">Tribunal</label>
            <input
              type="text"
              id="filterAudienceTribunal"
              list="filterAudienceTribunalOptions"
              placeholder=""
              autoComplete="off"
            />
            <datalist id="filterAudienceTribunalOptions">
            </datalist>
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

      <div id="audienceTableContainer" className="table-container">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Client</th>
              <th>{"R\u00e9f\u00e9rence Client"}</th>
              <th>{"D\u00e9biteur"}</th>
              <th>{"R\u00e9f\u00e9rence dossier"}</th>
              <th>Date d&apos;audience</th>
              <th>Juge</th>
              <th>Sort</th>
              <th>{"Jugement N\u00b0"}</th>
              <th>Tribunal</th>
              <th>{"Date d\u00e9p\u00f4t"}</th>
              <th>Statut</th>
              <th>{"Proc\u00e9dure"}</th>
              <th>Jugement ADD</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="audienceBody"></tbody>
        </table>
      </div>
      <div id="audiencePagination" className="table-pagination"></div>
      <div id="audienceImportHistory" className="import-history-panel" style={{ display: 'none' }}></div>
    </div>
  )
}

export default AudienceSection
