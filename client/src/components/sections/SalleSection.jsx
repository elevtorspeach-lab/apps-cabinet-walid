function SalleSection() {
  return (
    <div id="salleSection" className="section" style={{ display: 'none' }}>
      <h1><i className="fa-solid fa-door-open"></i> Salle</h1>
      <div className="pro-card">
        <div className="pro-header">
          <div className="pro-title">
            <i className="fa-solid fa-users-viewfinder"></i> Les juges par salle
          </div>
        </div>
        <div className="pro-body">
          <div id="salleDayTabs" className="salle-day-tabs"></div>
          <div id="salleEditRow" className="salle-toolbar">
            <input type="text" id="salleNameInput" placeholder="Salle (ex: Salle 2)" />
            <input type="text" id="salleJudgeInput" placeholder="Juge" />
            <button id="addSalleJudgeBtn" type="button" className="btn-primary">
              <i className="fa-solid fa-plus"></i> Ajouter
            </button>
          </div>
          <div className="salle-toolbar">
            <div className="audience-color-filter">
              <label htmlFor="salleFilterSelect">Filtrer par salle</label>
              <select id="salleFilterSelect">
                <option value="all">Toutes</option>
              </select>
            </div>
            <div className="audience-color-filter">
              <label htmlFor="salleTribunalFilter">Tribunal</label>
              <select id="salleTribunalFilter">
                <option value="all">Tous</option>
                <option value="commerciale">المحكمة التجارية</option>
                <option value="appel">محكمة الاستئناف</option>
              </select>
            </div>
            <div className="audience-color-filter">
              <label htmlFor="salleAudienceDateFilter">Date d&apos;audience</label>
              <input type="date" id="salleAudienceDateFilter" />
            </div>
          </div>
          <div className="table-container" style={{ marginTop: '8px' }}>
            <table>
              <thead>
                <tr>
                  <th>Salle</th>
                  <th>Juges</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="salleBody"></tbody>
            </table>
          </div>
          <div id="sidebarSalleSessions" className="sidebar-salle-sessions" style={{ display: 'none', marginTop: '14px' }}></div>
        </div>
      </div>
    </div>
  )
}

export default SalleSection
