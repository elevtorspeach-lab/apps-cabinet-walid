function normalizePersistedStateSource(rawState){
  const loadedClients = Array.isArray(rawState?.clients)
    ? rawState.clients.map(client=>normalizeClient(client, { deep: false })).filter(Boolean)
    : [];
  const loadedUsers = Array.isArray(rawState?.users)
    ? rawState.users.map(normalizeUser).filter(Boolean)
    : [];
  const loadedSalleAssignments = normalizeSalleAssignments(rawState?.salleAssignments);
  const loadedDraft = rawState?.audienceDraft && typeof rawState.audienceDraft === 'object'
    ? rawState.audienceDraft
    : {};
  const loadedRecycleBin = normalizeRecycleBinEntries(rawState?.recycleBin);
  const loadedRecycleArchive = normalizeRecycleArchiveEntries(rawState?.recycleArchive);
  const nextUsers = ensureManagerUser(loadedUsers);
  const nextSignature = buildStateSignature(
    loadedClients,
    loadedSalleAssignments,
    nextUsers,
    loadedDraft,
    loadedRecycleBin,
    loadedRecycleArchive
  );
  return {
    clients: loadedClients,
    salleAssignments: loadedSalleAssignments,
    users: nextUsers,
    audienceDraft: loadedDraft,
    recycleBin: loadedRecycleBin,
    recycleArchive: loadedRecycleArchive,
    signature: nextSignature
  };
}

async function applyPersistedStateSource(normalizedState, options = {}){
  if(!normalizedState || typeof normalizedState !== 'object') return false;
  const currentSignature = lastPersistedStateSignature;
  if(options.skipWhenSame && normalizedState.signature && normalizedState.signature === currentSignature){
    return false;
  }
  if(options.skipWhenDifferent && normalizedState.signature && normalizedState.signature !== currentSignature){
    return false;
  }

  AppState.clients = normalizedState.clients;
  AppState.salleAssignments = normalizedState.salleAssignments;
  if(typeof invalidateSalleAssignmentsCaches === 'function'){
    invalidateSalleAssignmentsCaches();
  }
  USERS = normalizedState.users;
  handleDossierDataChange({ audience: true });
  audienceDraft = normalizedState.audienceDraft;
  AppState.recycleBin = normalizedState.recycleBin;
  AppState.recycleArchive = normalizedState.recycleArchive;
  lastPersistedStateSignature = normalizedState.signature || buildStateSignature(
    AppState.clients,
    AppState.salleAssignments,
    USERS,
    audienceDraft,
    AppState.recycleBin,
    AppState.recycleArchive
  );
  syncCurrentUserFromUsers();

  if(options.writeIndexedDb){
    await writeStateToIndexedDb(buildAppStatePayload());
  }
  if(options.writeLocalStorage){
    writeStateToLocalStorage(buildAppStatePayload());
  }
  if(options.syncStatusMessage){
    setSyncStatus('ok', options.syncStatusMessage);
  }
  return true;
}
