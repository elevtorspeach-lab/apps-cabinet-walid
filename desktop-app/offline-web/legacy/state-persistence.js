function buildPersistedStateSignature({
  clients = [],
  salleAssignments = [],
  users = [],
  audienceDraft: draft = {},
  recycleBin = [],
  recycleArchive = [],
  importHistory = [],
  version = Number.NaN,
  updatedAt = ''
} = {}){
  const normalizedUpdatedAt = String(updatedAt || '').trim();
  if(Number.isFinite(version) && version >= 0 && normalizedUpdatedAt){
    return `remote:${version}:${normalizedUpdatedAt}`;
  }
  return buildStateSignature(
    clients,
    salleAssignments,
    users,
    draft,
    recycleBin,
    recycleArchive,
    importHistory
  );
}

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
  const loadedImportHistory = normalizeImportHistoryEntries(rawState?.importHistory);
  const nextUsers = ensureManagerUser(loadedUsers);
  const nextSignature = buildPersistedStateSignature({
    clients: loadedClients,
    salleAssignments: loadedSalleAssignments,
    users: nextUsers,
    audienceDraft: loadedDraft,
    recycleBin: loadedRecycleBin,
    recycleArchive: loadedRecycleArchive,
    importHistory: loadedImportHistory,
    version: Number(rawState?.version),
    updatedAt: rawState?.updatedAt
  });
  return {
    clients: loadedClients,
    salleAssignments: loadedSalleAssignments,
    users: nextUsers,
    audienceDraft: loadedDraft,
    recycleBin: loadedRecycleBin,
    recycleArchive: loadedRecycleArchive,
    importHistory: loadedImportHistory,
    signature: nextSignature
  };
}

function isPersistedStateSourceLarge(normalizedState){
  const clients = Array.isArray(normalizedState?.clients) ? normalizedState.clients : [];
  if(clients.length >= 300) return true;
  let dossierCount = 0;
  for(const client of clients){
    dossierCount += Array.isArray(client?.dossiers) ? client.dossiers.length : 0;
    if(dossierCount >= 30000) return true;
  }
  return false;
}

function resolvePersistedStateCacheWrites(normalizedState, options = {}){
  const requestedIndexedDb = options.writeIndexedDb === true;
  const requestedLocalStorage = options.writeLocalStorage === true;
  if(!requestedIndexedDb && !requestedLocalStorage){
    return { indexedDb: false, localStorage: false };
  }

  const source = String(options.source || '').trim().toLowerCase();
  if(source !== 'server'){
    return {
      indexedDb: requestedIndexedDb,
      localStorage: requestedLocalStorage
    };
  }

  const isLarge = isPersistedStateSourceLarge(normalizedState);
  const appBooted = typeof hasLoadedState !== 'undefined' && hasLoadedState === true;
  if(!isLarge){
    return {
      indexedDb: requestedIndexedDb,
      localStorage: requestedLocalStorage
    };
  }

  if(!appBooted){
    return {
      indexedDb: requestedIndexedDb,
      localStorage: false
    };
  }

  const now = Date.now();
  const throttleMs = Number(REMOTE_APPLIED_CACHE_WRITE_LARGE_MIN_INTERVAL_MS) || (2 * 60 * 1000);
  const allowIndexedDbWrite = !lastRemoteAppliedCacheWriteAt || (now - lastRemoteAppliedCacheWriteAt) >= throttleMs;
  if(allowIndexedDbWrite){
    lastRemoteAppliedCacheWriteAt = now;
  }
  return {
    indexedDb: requestedIndexedDb && allowIndexedDbWrite,
    localStorage: false
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
  AppState.importHistory = normalizedState.importHistory;
  lastPersistedStateSignature = normalizedState.signature || buildPersistedStateSignature({
    clients: AppState.clients,
    salleAssignments: AppState.salleAssignments,
    users: USERS,
    audienceDraft,
    recycleBin: AppState.recycleBin,
    recycleArchive: AppState.recycleArchive,
    importHistory: AppState.importHistory
  });
  syncCurrentUserFromUsers();

  const cacheWrites = resolvePersistedStateCacheWrites(normalizedState, options);
  const cachePayload = (cacheWrites.indexedDb || cacheWrites.localStorage)
    ? buildAppStatePayload()
    : null;
  if(cacheWrites.indexedDb){
    if(options.deferWriteIndexedDb){
      queueDeferredStateCacheWrite(cachePayload, { indexedDb: true, localStorage: false });
    }else{
      await writeStateToIndexedDb(cachePayload);
    }
  }
  if(cacheWrites.localStorage){
    if(options.deferWriteLocalStorage){
      queueDeferredStateCacheWrite(cachePayload, { indexedDb: false, localStorage: true });
    }else{
      writeStateToLocalStorage(cachePayload);
    }
  }
  if(options.syncStatusMessage){
    setSyncStatus('ok', options.syncStatusMessage);
  }
  return true;
}
