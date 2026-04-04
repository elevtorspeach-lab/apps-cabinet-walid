function RecycleSection() {
  return (
    <div id="recycleSection" className="section" style={{ display: 'none' }}>
      <h1><i className="fa-solid fa-trash-arrow-up"></i> Corbeille</h1>
      <div className="clients-toolbar recycle-toolbar">
        <div className="recycle-toolbar-text">
          Restaurer un dossier/client supprimé, ou tout restaurer d&apos;un coup.
        </div>
        <button id="restoreAllRecycleBtn" className="btn-primary" type="button">
          <i className="fa-solid fa-rotate-left"></i> Restaurer tout
        </button>
        <button id="clearRecycleBinBtn" className="btn-danger" type="button">
          <i className="fa-solid fa-trash"></i> Vider corbeille
        </button>
      </div>
      <div id="recycleTableContainer" className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date &amp; heure</th>
              <th>Action</th>
              <th>Utilisateur</th>
              <th>Détails</th>
              <th>Restore</th>
            </tr>
          </thead>
          <tbody id="recycleBody"></tbody>
        </table>
      </div>
      <div id="recyclePagination" className="table-pagination"></div>
    </div>
  )
}

export default RecycleSection
