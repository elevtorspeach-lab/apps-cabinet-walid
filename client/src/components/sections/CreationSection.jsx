function CreationSection() {
  return (
    <div id="creationSection" className="section" style={{ display: 'none' }}>
      <h1><i className="fa-solid fa-folder-plus"></i> Création de Dossier</h1>

      <div className="pro-card">
        <div className="pro-header">
          <div className="pro-title">
            <i className="fa-solid fa-file-circle-plus"></i> Nouveau dossier
          </div>
        </div>

        <div className="pro-body">
          <div className="form-group full">
            <label>Boîte N°</label>
            <input type="text" id="boiteNoInput" placeholder="Numéro de boîte" />
          </div>

          <div className="creation-priority-banner full">
            <i className="fa-solid fa-bolt"></i>
            <span>Champs prioritaires: Client, Référence Client, Date d&apos;affectation et Débiteur.</span>
          </div>

          <div className="creation-form-layout full">
            <div className="creation-form-row creation-form-row-top-extended">
              <div className="creation-form-top-left">
                <div className="form-group creation-layout-card creation-client-card creation-priority-field">
                  <label>Client <span className="creation-priority-badge">Prioritaire</span></label>
                  <div className="creation-client-picker">
                    <select id="selectClient"></select>
                    <button id="unlockCreationClientBtn" className="btn-primary creation-client-change-btn" type="button" style={{ display: 'none' }}>
                      <i className="fa-solid fa-rotate"></i> Changer
                    </button>
                  </div>
                  <div className="creation-client-card-subtitle">Sélectionnez le client principal du dossier.</div>
                  <div id="creationClientHint" className="creation-client-hint" style={{ display: 'none' }}></div>
                </div>

                <div id="nRefFieldContainer" className="form-group creation-layout-card creation-top-inline-card">
                  <label>N / ref</label>
                  <input type="text" id="nRefInput" placeholder="N / ref" autoComplete="off" />
                </div>
              </div>

              <div className="creation-form-top-right">
                <div className="form-group creation-layout-card creation-priority-field">
                  <label>Date d&apos;affectation <span className="creation-priority-badge">Prioritaire</span></label>
                  <input type="text" id="dateAffectation" placeholder="jj/mm/aaaa" inputMode="numeric" autoComplete="off" />
                </div>

                <div className="form-group creation-layout-card creation-top-inline-card">
                  <label>Gestionnaire</label>
                  <input type="text" id="gestionnaireInput" placeholder="Gestionnaire" autoComplete="off" />
                </div>
              </div>
            </div>

            <div className="creation-form-row creation-form-row-four">
              <div className="form-group creation-layout-card creation-secondary-highlight-field">
                <label>Type</label>
                <input type="text" id="typeInput" placeholder="Type" />
              </div>

              <div className="form-group creation-layout-card creation-priority-field">
                <label>Référence Client <span className="creation-priority-badge">Prioritaire</span></label>
                <input type="text" id="referenceClientInput" placeholder="Référence client" />
                <div id="referenceClientError" className="creation-field-error">Cette référence client existe déjà.</div>
              </div>

              <div className="form-group creation-layout-card creation-priority-field">
                <label>Débiteur <span className="creation-priority-badge">Prioritaire</span></label>
                <input type="text" id="debiteurInput" placeholder="Nom du débiteur" />
              </div>
              <div className="form-group creation-layout-card">
                <label>Adversaire</label>
                <input type="text" id="adversaireInput" placeholder="Nom de l'adversaire" />
              </div>
            </div>

            <div className="creation-form-row creation-form-row-three">
              <div className="form-group creation-layout-card creation-secondary-highlight-field">
                <label>Adresse</label>
                <input type="text" id="adresseInput" placeholder="Adresse" />
              </div>

              <div className="form-group creation-layout-card creation-secondary-highlight-field">
                <label>Ville</label>
                <input type="text" id="villeInput" placeholder="Ville" />
              </div>

              <div className="form-group creation-layout-card creation-secondary-highlight-field">
                <label>Montant</label>
                <input type="text" id="montantInput" inputMode="decimal" placeholder="Montant" />
              </div>
            </div>

            <div className="creation-form-row creation-form-row-four" data-procedure-visibility="ASS">
              <div className="form-group creation-layout-card">
                <label>Caution</label>
                <input type="text" id="cautionInput" placeholder="Caution" />
              </div>

              <div className="form-group creation-layout-card">
                <label>Adresse de caution</label>
                <input type="text" id="cautionAdresseInput" placeholder="Adresse de caution" />
              </div>

              <div className="form-group creation-layout-card">
                <label>Ville de caution</label>
                <input type="text" id="cautionVilleInput" placeholder="Ville de caution" />
              </div>

              <div className="form-group creation-layout-card">
                <label>CIN de caution / RC</label>
                <div className="caution-cin-rc-row">
                  <input type="text" id="cautionCinInput" placeholder="CIN de caution" />
                  <input type="text" id="cautionRcInput" placeholder="RC" />
                </div>
              </div>
            </div>

            <div className="creation-form-row creation-form-row-two" data-procedure-visibility="Restitution">
              <div className="form-group creation-layout-card creation-restitution-highlight-field">
                <label>WW</label>
                <input type="text" id="wwInput" placeholder="WW" />
              </div>

              <div className="form-group creation-layout-card creation-restitution-highlight-field">
                <label>Marque</label>
                <input type="text" id="marqueInput" placeholder="Marque" />
              </div>
            </div>

            <div className="creation-form-row creation-form-row-three" data-procedure-visibility="Commandement">
              <div className="form-group creation-layout-card creation-commandement-highlight-field">
                <label>TF N°</label>
                <input type="text" id="efNumberInput" placeholder="TF N°" />
              </div>

              <div className="form-group creation-layout-card creation-commandement-highlight-field">
                <label>Conservation</label>
                <input type="text" id="conservationInput" placeholder="Conservation" />
              </div>

              <div className="form-group creation-layout-card creation-commandement-highlight-field">
                <label>Métrage</label>
                <input type="text" id="metrageInput" placeholder="Métrage" />
              </div>
            </div>

            <div className="creation-form-row creation-form-row-three" data-procedure-visibility="Sanlam">
              <div className="form-group creation-layout-card creation-sanlam-highlight-field">
                <label>Police n°</label>
                <input type="text" id="sanlamPoliceInput" placeholder="Police n°" />
              </div>
              <div className="form-group creation-layout-card creation-sanlam-highlight-field">
                <label>Sinistre n°</label>
                <input type="text" id="sanlamSinistreInput" placeholder="Sinistre n°" />
              </div>
              <div className="form-group creation-layout-card creation-sanlam-highlight-field">
                <label>Date accident</label>
                <input type="text" id="sanlamDateAccidentInput" placeholder="jj/mm/aaaa" />
              </div>
              <div className="form-group creation-layout-card creation-sanlam-highlight-field">
                <label>CIN conducteur</label>
                <input type="text" id="sanlamCinConducteurInput" placeholder="CIN conducteur" />
              </div>
              <div className="form-group creation-layout-card creation-sanlam-highlight-field">
                <label>Souscripteur</label>
                <input type="text" id="sanlamSouscripteurInput" placeholder="Souscripteur" />
              </div>
            </div>
            <div id="sanlamAdversairesContainer" className="creation-form-row creation-form-row-three" style={{ display: 'none' }}></div>
          </div>

          <div className="form-group full">
            <label>Montant par procédure</label>
            <div id="procedureMontantGroups" className="procedure-montant-groups"></div>
          </div>

          {/* Procédure */}
          <div className="form-group full">
            <label>Procédure (choix multiple)</label>
            <div className="checkbox-group">
              <label id="procExceptionelLabel" data-proc="Procedure exceptionel" style={{ display: 'none' }}><input type="checkbox" defaultValue="Procedure exceptionel" className="proc-check" /> Procedure exceptionel</label>
              <label data-proc="ASS"><input type="checkbox" defaultValue="ASS" className="proc-check" /> ASS</label>
              <label data-proc="Restitution"><input type="checkbox" defaultValue="Restitution" className="proc-check" /> Restitution</label>
              <label data-proc="Nantissement"><input type="checkbox" defaultValue="Nantissement" className="proc-check" /> Nantissement</label>
              <label data-proc="SFDC"><input type="checkbox" defaultValue="SFDC" className="proc-check" /> SFDC</label>
              <label data-proc="Injonction"><input type="checkbox" defaultValue="Injonction" className="proc-check" /> Injonction</label>
              <label data-proc="S/bien"><input type="checkbox" defaultValue="S/bien" className="proc-check" /> S/bien</label>
              <label data-proc="Commandement"><input type="checkbox" defaultValue="Commandement" className="proc-check" /> Commandement</label>
              <label data-proc="Vérification de créance"><input type="checkbox" defaultValue="Vérification de créance" className="proc-check" /> Vérification de créance</label>
              <label data-proc="Redressement"><input type="checkbox" defaultValue="Redressement" className="proc-check" /> Redressement</label>
              <label data-proc="Liquidation judiciaire"><input type="checkbox" defaultValue="Liquidation judiciaire" className="proc-check" /> Liquidation judiciaire</label>
              <label data-proc="Sanlam"><input type="checkbox" defaultValue="Sanlam" className="proc-check" /> Sanlam</label>
            </div>
            <div className="proc-add">
              <input type="text" id="procedureCustom" placeholder="Nouvelle procédure" />
              <button type="button" id="addProcedureBtn" className="btn-primary">Plus</button>
            </div>
            <div id="customProcedures" className="custom-procs"></div>
          </div>

          <div id="procedureDetails" className="procedure-details full"></div>
          <datalist id="procedureTribunalOptions"></datalist>
          <datalist id="commandementSortOptions">
            <option value="att expertise"></option>
          </datalist>

          {/* DOCUMENTS + NOTE/STATUT */}
          <div className="form-group full two-col">
            <div className="panel">
              <label>Documents</label>
              <div id="dropzone" className="dropzone exact-design">
                <i className="fa-solid fa-cloud-arrow-up"></i>
                <p>Glisser-déposer des fichiers ici ou</p>
                <button type="button" id="uploadBtn" className="btn-primary btn-upload">
                  Télécharger un fichier
                </button>
                <input type="file" id="fileInput" multiple hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
              </div>
              <ul id="fileList" className="file-list"></ul>
            </div>

            <div className="panel">
              <div className="panel-field">
                <textarea id="noteInput" rows="3" placeholder="Note dossier (optionnelle)..."></textarea>
              </div>

              <div className="panel-field">
                <textarea id="avancementInput" rows="5" placeholder="Ex: notification envoyée, audience fixée, en attente jugement..."></textarea>
              </div>

              <div className="panel-field">
                <select id="statutInput" defaultValue="En cours">
                  <option value="En cours">En cours</option>
                  <option value="Soldé">Soldé</option>
                  <option value="Arrêt définitif">Arrêt définitif</option>
                  <option value="Clôture">Clôture</option>
                  <option value="Suspension">Suspension</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-group full">
            <button id="addDossierBtn" className="btn-primary btn-big">
              <i className="fa-solid fa-floppy-disk"></i> Créer le Dossier
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

export default CreationSection
