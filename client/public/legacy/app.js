// ================== STATE ==================
const AppState = { clients: [], salleAssignments: [], recycleBin: [], recycleArchive: [], importHistory: [] };
const DEFAULT_MANAGER_USERNAME = 'manager';
const DEFAULT_MANAGER_PASSWORD = '1234';
const REMOTE_MANAGER_USERNAME = 'manager';
const LEGACY_MANAGER_USERNAMES = ['walid'];
const IMPORT_HISTORY_MAX_ENTRIES = 80;
const IMPORT_HISTORY_PANEL_MARKUP_CACHE_LIMIT = 16;
const IMPORT_HISTORY_MENU_MARKUP_CACHE_LIMIT = 32;
const PASSWORD_HASH_VERSION = 1;
const PASSWORD_HASH_ITERATIONS = 120000;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_MIN_LENGTH = 1;
const AUDIENCE_AUTOCOMPLETE_MAX_ITEMS = 8;
const PROCEDURE_TRIBUNAL_DATALIST_ID = 'procedureTribunalOptions';
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 2 * 60 * 1000;
const PASSWORD_SETUP_MODE_FORCED = 'forced';
const PASSWORD_SETUP_MODE_BOOTSTRAP_LOCAL = 'bootstrap-local';
const PASSWORD_SETUP_MODE_BOOTSTRAP_REMOTE = 'bootstrap-remote';
const STANDARD_TEAM_TOTAL_MANAGERS = 2;
const STANDARD_TEAM_TOTAL_ADMINS = 8;
const STANDARD_TEAM_TOTAL_CLIENTS = 5;
const STANDARD_TEAM_DEFAULT_PASSWORD = '1234';
const STANDARD_TEAM_MANAGER_USERNAMES = ['manager', 'amine'];

function normalizeLoginUsername(value){
  return String(value || '').trim().toLowerCase();
}

function isManagerLoginAlias(value){
  const username = normalizeLoginUsername(value);
  return username === DEFAULT_MANAGER_USERNAME
    || username === REMOTE_MANAGER_USERNAME
    || LEGACY_MANAGER_USERNAMES.includes(username);
}

function isDefaultManagerPasswordLogin(username, password){
  return isManagerLoginAlias(username)
    && normalizeLoginPassword(password) === normalizeLoginPassword(DEFAULT_MANAGER_PASSWORD);
}

function resolveLocalLoginUsername(value){
  const username = normalizeLoginUsername(value);
  return isManagerLoginAlias(username) ? DEFAULT_MANAGER_USERNAME : username;
}

function resolveRemoteLoginUsername(value){
  const username = normalizeLoginUsername(value);
  return isManagerLoginAlias(username) ? REMOTE_MANAGER_USERNAME : username;
}

function buildSeedUsers(){
  return [
    {
      id: 1,
      username: DEFAULT_MANAGER_USERNAME,
      password: DEFAULT_MANAGER_PASSWORD,
      passwordHash: '',
      passwordSalt: '',
      passwordVersion: 0,
      passwordUpdatedAt: '',
      requirePasswordChange: false,
      role: 'manager',
      clientIds: []
    }
  ];
}

let USERS = buildSeedUsers();
let uploadedFiles = [];
let audienceDraft = {};
let selectedAudienceColor = 'all';
let filterAudienceColor = 'all';
let filterAudienceProcedure = 'all';
let filterAudienceTribunal = 'all';
let filterAudienceDate = '';
let filterAudienceErrorsOnly = false;
let filterAudienceCheckedFirst = false;
let paginationState = { clients: 1, audience: 1, suivi: 1, diligence: 1, recycle: 1 };
let paginationFilterState = { clients: '', audience: '', suivi: '', diligence: '', recycle: '' };
let audienceTribunalAliasMap = new Map();
let audienceTribunalLabelMap = new Map();
let audiencePrintSelection = new Set();
let audiencePrintSelectionVersion = 0;
let audiencePrintSelectionPruneDataVersion = -1;
let audienceTransientPriorityColorRows = new Map();
let audienceTransientPinnedRowKeys = new Set();
let audienceTransientPriorityColorResetTimer = null;
let audienceColorUndoState = null;
let audienceAutocompleteItems = [];
let audienceAutocompleteActiveIndex = -1;
let audienceAutocompleteHideTimer = null;
let filterSuiviProcedure = 'all';
let filterSuiviTribunal = 'all';
let filterSuiviStatus = 'all';
let filterSuiviAttDepotOnly = false;
let filterSuiviCheckedFirst = false;
let suiviTribunalAliasMap = new Map();
let suiviTribunalLabelMap = new Map();
let suiviPrintSelection = new Set();
let suiviPrintSelectionVersion = 0;
let suiviPrintSelectionPruneDataVersion = -1;
let lastSuiviRenderedRows = [];
let lastSuiviRenderedPageRows = [];
let lastSuiviRenderedStateKey = '';
let lastSuiviRenderedPage = 1;
let lastSuiviRenderedRowKeySet = new Set();
let lastSuiviRenderedSelectedCount = 0;
let filterDiligenceProcedure = 'all';
let filterDiligenceSort = 'all';
let filterDiligenceDelegation = 'all';
let filterDiligenceOrdonnance = 'all';
let filterDiligenceTribunal = 'all';
let diligenceTribunalAliasMap = new Map();
let diligenceTribunalLabelMap = new Map();
let filterDiligenceCheckedFirst = false;
let diligencePrintSelection = new Set();
let diligencePrintSelectionVersion = 0;
let diligencePrintSelectionPruneDataVersion = -1;
let audienceCheckedCountRenderQueued = false;
let diligenceCheckedCountRenderQueued = false;
let filterSalle = 'all';
let filterSalleTribunal = 'all';
let filterSalleAudienceDate = '';
let selectedSalleDay = 'lundi';
let creationPinnedClientId = '';
let editingDossier = null;
let editingOriginalProcedures = [];
let customProcedures = [];
let suppressProcedureChange = false;
let currentUser = null;
let currentView = '';
let editingTeamUserId = null;
let dashboardCalendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let procedureMontantGroups = [];
const STORAGE_KEY = 'cabinet-avocat-state-v1';
const INDEXED_DB_NAME = 'cabinet-avocat-db-v1';
const INDEXED_DB_VERSION = 4;
const INDEXED_DB_STORE = 'state_store';
const INDEXED_DB_BACKUP_STORE = 'backup_store';
const INDEXED_DB_EXPORT_STORE = 'export_store';
const INDEXED_DB_SYNC_STORE = 'sync_queue';
const INDEXED_DB_STATE_KEY = 'app_state';
const INDEXED_DB_EXPORT_DIRECTORY_KEY = 'preferred_export_directory';
const API_BASE_STORAGE_KEY = 'applicationversion1-api-base-v1';
const APP_INSTANCE_ID = `cabinet-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const AUTO_BACKUP_STORAGE_KEY = 'cabinet-avocat-auto-backups-v1';
let API_BASE = (() => {
  if(typeof window !== 'undefined' && window.location && (window.location.protocol === 'http:' || window.location.protocol === 'https:')){
    return `${window.location.origin}/api`;
  }
  return 'http://127.0.0.1:3000/api';
})();
let API_BASE_RESOLVED = false;
let remoteAuthToken = '';
let persistTimer = null;
let queuedPersistPayload = null;
let dossierPatchPersistTimer = null;
let dossierPatchRetryTimer = null;
let dossierPatchRetryBackoffMs = 0;
let queuedDossierPatchEntries = new Map();
let desktopStatePersistTimer = null;
let desktopStatePersistInFlight = false;
let desktopStatePersistQueuedPayload = null;
let desktopStatePersistQueuedSignature = '';
let lastDesktopStatePersistSignature = '';
let deferredStateCacheWriteTimer = null;
let deferredStateCacheWriteIdleId = null;
let deferredStateCacheWritePayload = null;
let deferredStateCacheWriteIndexedDb = false;
let deferredStateCacheWriteLocalStorage = false;
let audienceAutoSaveTimer = null;
let audienceSaveFeedbackTimer = null;
let audienceColorBatchTimer = null;
let audienceColorBatchNeedsPersist = false;
let audienceColorBatchNeedsDashboard = false;
let audienceColorBatchNeedsSuivi = false;
let hasLoadedState = false;
let applicationBootFailed = false;
let importInProgress = false;
let heavyUiOperationCount = 0;
let remoteSyncTimer = null;
let remoteSyncStream = null;
let remoteSyncStreamRetryTimer = null;
let remoteSyncHealthTick = 0;
let remoteSyncStreamConnected = false;
let remoteSyncHealthCheckInFlight = false;
let remoteSyncLastRecoveryRefreshAt = 0;
let remoteSyncStreamRetryDelayMs = 0;
let remoteBootstrapSetupRequired = false;
let remoteServerReachable = false;
let lastApiBaseSuccessAt = 0;
let lastPersistedStateSignature = '';
let lastLocalSnapshotSignature = '';
let lastRemoteStateLoadVersion = 0;
let lastRemoteStateLoadUpdatedAt = '';
let remoteStateVersion = 0;
let remoteStateUpdatedAt = '';
let remoteRefreshPending = false;
let remoteRefreshInFlight = false;
let deferredLocalSnapshotTimer = null;
let deferredLocalSnapshotPayload = null;
let deferredLocalSnapshotSource = 'persist';
let deferredLocalSnapshotSignature = '';
let pendingLoginRetryAfterInit = false;
let contentZoomRefreshTimer = null;
let linkedSectionRenderTimer = null;
let linkedSectionRenderKeys = new Set();
let linkedSectionRenderKeepAudiencePosition = false;
let remoteRefreshTimer = null;
let remoteSyncRenderTimer = null;
let remoteSyncRenderSections = new Set();
let remoteDashboardLightRefreshPending = false;
let remoteSectionLastRenderAt = new Map();
let pendingRemoteLiveUpdateTimer = null;
let pendingRemoteLiveUpdateOptions = {
  audience: false,
  sections: new Set(),
  secondarySections: new Set(),
  refreshClientDropdown: false
};
let lastPingMs = null;
let lastLiveDelayMs = null;
let syncMetricsRenderQueued = false;
let loginAttemptCount = 0;
let loginLockedUntil = 0;
let loginInFlight = false;
let lastRemoteAppliedCacheWriteAt = 0;
let lastAutoBackupAt = 0;
let lastAutoBackupSignature = '';
let lastAudienceRenderedRows = [];
let lastAudienceRenderedPageRows = [];
let lastAudienceRenderedStateKey = '';
let lastAudienceRenderedPage = 1;
let lastAudienceRenderedRowKeySet = new Set();
let lastAudienceRenderedSelectedCount = 0;
let audienceVirtualRows = [];
let audienceVirtualDuplicateKeySet = new Set();
let audienceVirtualLastRange = { start: -1, end: -1 };
let audienceVirtualRafId = null;
let audienceRowsRawCache = null;
let audienceRowsRawCacheVersion = 0;
let audienceRowsRawCacheViewerKey = '';
let dossierDataVersion = 0;
let audienceRowsRawDataVersion = 0;
let audienceRowsDedupeCache = null;
let audienceRowsDedupeCacheVersion = 0;
let audienceRowsDedupeCacheViewerKey = '';
let audienceClosedStatusLookupCache = null;
let audienceClosedStatusLookupCacheVersion = -1;
let audienceRowsViewCacheSource = null;
let audienceRowsViewCacheKey = '';
let audienceRowsViewCacheOutput = [];
let audienceFilteredRowsCacheInput = null;
let audienceFilteredRowsCacheKey = '';
let audienceFilteredRowsCacheOutput = [];
let audienceCheckedOrderedRowsCacheInput = null;
let audienceCheckedOrderedRowsCacheVersion = -1;
let audienceCheckedOrderedRowsCacheOutput = [];
let audienceFilterOptionsRowsRef = null;
const audienceFilterOptionsMetaCache = new WeakMap();
let audienceDuplicateKeySetCacheInput = null;
let audienceDuplicateKeySetCacheOutput = new Set();
let audienceMismatchRefClientSetCacheInput = null;
let audienceMismatchRefClientSetCacheOutput = new Set();
let audienceErrorRowsCacheInput = null;
let audienceErrorRowsCacheOutput = [];
let audienceExactSearchIndexCacheInput = null;
let audienceExactSearchIndexCacheOutput = null;
let audienceSelectedExportRowsCacheInput = null;
let audienceSelectedExportRowsCacheVersion = -1;
let audienceSelectedExportRowsCacheOutput = [];
let audienceSelectionCountRowsRef = null;
let audienceSelectionCountVersion = -1;
let audienceSelectionCountValue = 0;
let sidebarSalleRenderTimer = null;
let sidebarSalleRenderSeq = 0;
let indexedDbOpenPromise = null;
let suiviVirtualRows = [];
let suiviVirtualLastRange = { start: -1, end: -1 };
let suiviVirtualRafId = null;
let suiviBaseRowsCache = null;
let suiviBaseRowsCacheVersion = 0;
let suiviBaseRowsCacheViewerKey = '';
let suiviFilterOptionsRowsMetaRef = null;
let suiviFilteredRowsCacheSource = null;
let suiviFilteredRowsCacheKey = '';
let suiviFilteredRowsCacheOutput = [];
let suiviCheckedOrderedRowsCacheInput = null;
let suiviCheckedOrderedRowsCacheVersion = -1;
let suiviCheckedOrderedRowsCacheOutput = [];
let suiviSelectionCountRowsRef = null;
let suiviSelectionCountVersion = -1;
let suiviSelectionCountValue = 0;
let suiviSelectedExportRowsCacheInput = null;
let suiviSelectedExportRowsCacheVersion = -1;
let suiviSelectedExportRowsCacheOutput = [];
let diligenceVirtualRows = [];
let diligenceVirtualLastRange = { start: -1, end: -1 };
let diligenceVirtualRafId = null;
let diligenceVirtualShowInjonctionColumns = false;
let diligenceVirtualCompactProcedureMode = 'mixed';
let diligenceVirtualShowAssColumns = false;
let diligenceVirtualShowCommandementColumns = false;
let diligenceRowsCache = null;
let diligenceRowsCacheVersion = 0;
let diligenceRowsCacheViewerKey = '';
let diligenceFilteredRowsCacheInput = null;
let diligenceFilteredRowsCacheKey = '';
let diligenceFilteredRowsCacheOutput = [];
let diligenceCheckedOrderedRowsCacheInput = null;
let diligenceCheckedOrderedRowsCacheVersion = -1;
let diligenceCheckedOrderedRowsCacheOutput = [];
let diligenceFilterProcedureRowsRef = null;
let diligenceFilterTribunalRowsRef = null;
let diligenceFilterSortRowsRef = null;
let diligenceFilterDelegationRowsRef = null;
let diligenceFilterOrdonnanceRowsRef = null;
let diligenceSelectedExportRowsCacheInput = null;
let diligenceSelectedExportRowsCacheVersion = -1;
let diligenceSelectedExportRowsCacheOutput = [];
let lastDiligenceRenderedRows = [];
let lastDiligenceRenderedPageRows = [];
let lastDiligenceRenderedStateKey = '';
let lastDiligenceRenderedPage = 1;
let lastDiligenceRenderedRowKeySet = new Set();
let lastDiligenceRenderedSelectedCount = 0;
let diligenceSelectionCountRowsRef = null;
let diligenceSelectionCountVersion = -1;
let diligenceSelectionCountValue = 0;
let audienceColorButtons = [];
let backgroundDataWarmupTimer = null;
let backgroundDataWarmupVersion = -1;
let audienceSearchWarmupTimer = null;
let audienceSearchWarmupToken = 0;
let suiviSearchWarmupTimer = null;
let preferredExportDirectoryHandle = null;
let preferredExportDirectoryHandleLoaded = false;
let suiviSearchWarmupToken = 0;
let diligenceSearchWarmupTimer = null;
let diligenceSearchWarmupToken = 0;
let visibleClientsCache = null;
let visibleClientsCacheVersion = -1;
let visibleClientsCacheUserKey = '';
let editableClientsCache = null;
let editableClientsCacheVersion = -1;
let editableClientsCacheUserKey = '';
let editableClientsDropdownMarkupCache = '';
let editableClientsDropdownMarkupVersion = -1;
let editableClientsDropdownMarkupUserKey = '';
let clientListSummaryCache = null;
let clientListSummaryCacheVersion = -1;
let clientListSummaryCacheUserKey = '';
let clientClotureCountCacheValue = 0;
let clientClotureCountCacheVersion = -1;
let clientClotureCountCacheUserKey = '';
let largeDatasetModeCacheValue = false;
let largeDatasetModeCacheVersion = -1;
let largeDatasetModeCacheUserKey = '';
let ultraLargeDatasetModeCacheValue = false;
let ultraLargeDatasetModeCacheVersion = -1;
let ultraLargeDatasetModeCacheUserKey = '';
let visibleDossierCountCacheValue = 0;
let visibleDossierCountCacheVersion = -1;
let visibleDossierCountCacheUserKey = '';
let dashboardSnapshotCache = null;
let dashboardSnapshotCacheVersion = -1;
let dashboardSnapshotCacheUserKey = '';
let dashboardAudienceMetricsCache = null;
let dashboardAudienceMetricsCacheVersion = -1;
let dashboardAudienceMetricsCacheUserKey = '';
let dashboardCalendarEventsCache = null;
let dashboardCalendarEventsCacheVersion = -1;
let dashboardCalendarEventsCacheUserKey = '';
let dashboardCalendarMarkupCacheKey = '';
let dashboardCalendarMarkupCacheHtml = '';
let audienceSidebarProjectionCache = null;
let audienceSidebarProjectionCacheVersion = -1;
let audienceSidebarProjectionCacheUserKey = '';
let importHistoryPanelMarkupCache = new Map();
let importHistoryMenuMarkupCache = new Map();
let importHistoryOpenPanels = new Set();
let importHistoryOutsideClickBound = false;
let dashboardCalendarRenderTimer = null;
let dashboardHeavyRenderTimer = null;
let audienceErrorCountCacheVersion = -1;
let audienceErrorCountCacheValue = 0;
let knownJudgesCache = null;
let knownJudgesCacheVersion = -1;
let knownJudgesDatalistRenderKey = '';
let salleAssignmentsVersion = 0;
let salleAudienceMapCache = null;
let salleAudienceMapCacheVersion = -1;
let salleAudienceMapAssignmentsVersion = -1;
let salleAudienceMapCacheUserKey = '';
let filteredSalleAudienceMapCache = null;
let filteredSalleAudienceMapCacheVersion = -1;
let filteredSalleAudienceMapAssignmentsVersion = -1;
let filteredSalleAudienceMapCacheUserKey = '';
let filteredSalleAudienceMapFilterKey = '';
let lastSalleRenderKey = '';
let loginPostBootTimer = null;
const dashboardMetricState = new Map();
const dashboardMetricAnimationFrames = new Map();
const dashboardMetricLastBumpAt = new Map();
const DEFERRED_RENDER_SECTION_IDS = {
  dashboard: 'dashboardSection',
  clients: 'clientSection',
  creation: 'creationSection',
  suivi: 'suiviSection',
  audience: 'audienceSection',
  diligence: 'diligenceSection',
  salle: 'salleSection',
  equipe: 'equipeSection',
  recycle: 'recycleSection'
};
const deferredRenderDirtyState = {
  dashboard: true,
  clients: true,
  creation: true,
  suivi: true,
  audience: true,
  diligence: true,
  salle: true,
  equipe: true,
  recycle: true,
  clientDropdown: true
};
const DOSSIER_HISTORY_MAX_ENTRIES = 400;
const DOSSIER_HISTORY_DEBOUNCE_MS = 900;
const RECYCLE_BIN_MAX_ENTRIES = 600;
const RECYCLE_ARCHIVE_MAX_ENTRIES = 8000;
const DOSSIER_PATCH_DEBOUNCE_MS = 500;
const DOSSIER_HISTORY_FIELD_LABELS = {
  debiteur: 'Débiteur',
  nRef: 'N / ref',
  boiteNo: 'Boîte N°',
  referenceClient: 'Référence Client',
  dateAffectation: 'Date d’affectation',
  gestionnaire: 'Gestionnaire',
  procedure: 'Procédure',
  montant: 'Montant',
  ville: 'Ville',
  adresse: 'Adresse',
  ww: 'WW',
  marque: 'Marque',
  type: 'Type',
  caution: 'Caution',
  cautionAdresse: 'Adresse de caution',
  cautionVille: 'Ville de caution',
  cautionCin: 'CIN de caution',
  cautionRc: 'RC',
  efNumber: 'TF N°',
  conservation: 'Conservation',
  metrage: 'Métrage',
  note: 'Note',
  avancement: 'Avancement',
  statut: 'Statut',
  'procedureDetails.referenceClient': 'Référence dossier',
  'procedureDetails.audience': 'Date d’audience',
  'procedureDetails.juge': 'Juge',
  'procedureDetails.sort': 'Sort',
  'procedureDetails.tribunal': 'Tribunal',
  'procedureDetails.dateDepot': 'Date dépôt',
  'procedureDetails.depotLe': 'Date dépôt',
  'procedureDetails.executionNo': 'N° exécution',
  'procedureDetails.attOrdOrOrdOk': 'Ordonnance',
  'procedureDetails.attDelegationOuDelegat': 'Délégation',
  'procedureDetails.nomHuissier': 'Nom huissier',
  'procedureDetails.datePrevueExecution': 'Date prévue exécution',
  'procedureDetails.montantRecupere': 'Montant récupéré',
  'procedureDetails.instruction': 'Instruction',
  'procedureDetails.declarationCreance': 'Declaration',
  'procedureDetails.syndicName': 'Nom du syndic',
  'procedureDetails.huissier': 'Huissier',
  'procedureDetails.notificationNo': 'Notification N°',
  'procedureDetails.dateNotification': 'Date notification',
  'procedureDetails.villeProcedure': 'Ville',
  'procedureDetails.certificatNonAppelStatus': 'Statut certificat non appel',
  'procedureDetails.notificationStatus': 'Statut notification',
  'procedureDetails.notificationSort': 'Sort notification',
  'procedureDetails.notifConservateur': 'Not conservateur',
  'procedureDetails.notifDebiteur': 'Not débiteur',
  'procedureDetails.refExpertise': 'Ref expertise',
  'procedureDetails.ord': 'Ord',
  'procedureDetails.expert': 'Expert',
  'procedureDetails.dateVente': 'Date vente',
  'procedureDetails.lettreRec': 'Lettre Rec',
  'procedureDetails.curateurNo': 'Curateur N°',
  'procedureDetails.notifCurateur': 'Notif curateur',
  'procedureDetails.sortNotif': 'Sort notif',
  'procedureDetails.avisCurateur': 'Avis curateur',
  'procedureDetails.pvPlice': 'PV Police'
};
const DOSSIER_HISTORY_SOURCE_LABELS = {
  form: 'Modifier dossier',
  audience: 'Audience',
  diligence: 'Diligence'
};
let dossierHistoryPendingEntries = new Map();
let dossierHistoryPendingTimers = new Map();
const dossierHistoryObjectIds = new WeakMap();
let dossierHistoryObjectIdCounter = 1;
const SIDEBAR_COLLAPSED_KEY = 'cabinet-avocat-sidebar-collapsed';
const CONTENT_ZOOM_STORAGE_KEY = 'cabinet-avocat-content-zoom-v1';
const CONTENT_ZOOM_DEFAULT = 1;
const CONTENT_ZOOM_MIN = 0.6;
const CONTENT_ZOOM_MAX = 1.4;
const CONTENT_ZOOM_STEP = 0.05;
const REMOTE_SYNC_POLL_INTERVAL_MS = 5000;
const REMOTE_SYNC_HEALTH_EVERY_TICKS = 18;
const REMOTE_SYNC_EVENT_DEBOUNCE_MS = 250;
const REMOTE_SYNC_BLOCKED_RETRY_MS = 2000;
const REMOTE_SYNC_RECOVERY_REFRESH_INTERVAL_MS = 15000;
const REMOTE_SYNC_STREAM_RETRY_BASE_MS = 2000;
const REMOTE_SYNC_STREAM_RETRY_MAX_MS = 15000;
const REMOTE_SYNC_RENDER_DEBOUNCE_MS = 320;
const REMOTE_SYNC_RENDER_BLOCKED_RETRY_MS = 800;
const REMOTE_APPLIED_CACHE_WRITE_LARGE_MIN_INTERVAL_MS = 2 * 60 * 1000;
const LINKED_SECTION_RENDER_DEBOUNCE_MS = 180;
const DASHBOARD_METRIC_BUMP_INTERVAL_MS = 900;
const API_BASE_REDISCOVERY_COOLDOWN_MS = 60000;
const DEFERRED_LOCAL_SNAPSHOT_DEBOUNCE_MS = 250;
const DESKTOP_STATE_SAVE_DEBOUNCE_MS = 250;
const AUTO_BACKUP_RETENTION_COUNT = 12;
const AUTO_BACKUP_MIN_INTERVAL_MS = 3 * 60 * 1000;
const CLIENT_IMPORT_ALLOWED_PROCEDURES = new Set(['SFDC', 'S/bien', 'Injonction']);
const AUDIENCE_ORPHAN_CLIENT_NAME = 'Audience import (hors dossier global)';
const PAGINATION_PAGE_SIZES = {
  clients: 20,
  audience: 20,
  suivi: 20,
  diligence: 20,
  recycle: 20,
  equipe: 20
};
const IMPORT_CHUNK_SIZE = 80;
const IMPORT_EXCEL_CHUNK_SIZE = 60;
const IMPORT_STATUS_THROTTLE_MS = 120;
const AUDIENCE_VIRTUAL_MIN_ROWS = 40;
const AUDIENCE_VIRTUAL_ROW_HEIGHT = 56;
const AUDIENCE_VIRTUAL_OVERSCAN = 10;
const SALLE_SIDEBAR_SESSION_RENDER_LIMIT = 18;
const SALLE_SIDEBAR_SESSION_RENDER_LIMIT_VERY_LARGE = 8;
const AUDIENCE_DEFAULT_SORT_MAX_ROWS = 60000;
const STYLED_XLSX_MAX_ROWS = 12000;
const AUDIENCE_REGULAR_EXPORT_CSV_THRESHOLD_STABLE = 8000;
const AUDIENCE_REGULAR_EXPORT_CSV_THRESHOLD = 40000;
const AUDIENCE_REGULAR_EXPORT_CSV_THRESHOLD_LARGE = 24000;
const AUDIENCE_REGULAR_EXPORT_CSV_THRESHOLD_VERY_LARGE = 12000;
const SELECTED_EXPORT_CSV_THRESHOLD = 200;
const SALLE_EXPORT_CSV_THRESHOLD = 250;
const SALLE_EXPORT_CSV_THRESHOLD_LARGE = 160;
const SALLE_EXPORT_CSV_THRESHOLD_VERY_LARGE = 80;
const SALLE_SIDEBAR_COMPACT_RENDER_AUDIENCE_THRESHOLD = 4000;
const SALLE_SIDEBAR_COMPACT_RENDER_JUDGE_THRESHOLD = 40;
const LARGE_DATASET_VISIBLE_CLIENTS_THRESHOLD = 300;
const LARGE_DATASET_DOSSIERS_THRESHOLD = 30000;
const ULTRA_LARGE_DATASET_VISIBLE_CLIENTS_THRESHOLD = 450;
const ULTRA_LARGE_DATASET_DOSSIERS_THRESHOLD = 50000;
const REMOTE_SYNC_SECTION_MIN_INTERVAL_LARGE_MS = 1200;
const REMOTE_SYNC_SECTION_MIN_INTERVAL_VERY_LARGE_MS = 3200;
const REMOTE_SYNC_SECTION_MIN_INTERVAL_BY_SECTION = Object.freeze({
  dashboard: 4200,
  clients: 2600,
  suivi: 2400,
  audience: 2600,
  diligence: 2600,
  salle: 5200
});
const SUIVI_VIRTUAL_MIN_ROWS = 40;
const SUIVI_DEFAULT_SORT_MAX_ROWS = 60000;
const SUIVI_HEAVY_SORT_MAX_CLIENTS = 500;
const SUIVI_HEAVY_SORT_MAX_ROWS = 25000;
const DILIGENCE_VIRTUAL_MIN_ROWS = 40;
const AUDIENCE_COLOR_BATCH_MS = 80;
const SEARCH_CACHE_WARMUP_CHUNK_SIZE = 240;
const LOCAL_STORAGE_CACHE_MAX_CLIENTS = 120;
const LOCAL_STORAGE_CACHE_MAX_DOSSIERS = 12000;
const LOCAL_STORAGE_CACHE_MAX_AUDIENCE_DRAFTS = 12000;
const REMOTE_STATE_PAGED_LOAD_MIN_CLIENTS = 250;
const REMOTE_STATE_PAGED_LOAD_MIN_DOSSIERS = 25000;
const IS_FILE_PROTOCOL = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
const LOCAL_ONLY_MODE = (() => {
  if(typeof window === 'undefined') return false;
  const query = new URLSearchParams(window.location.search);
  const rawFlag = String(
    query.get('localOnly')
    || query.get('offline')
    || ''
  ).trim().toLowerCase();
  if(rawFlag){
    return !['0', 'false', 'no', 'off'].includes(rawFlag);
  }
  if(typeof window.CABINET_LOCAL_ONLY === 'boolean') return window.CABINET_LOCAL_ONLY;
  if(IS_FILE_PROTOCOL) return true;
  return !!window.cabinetDesktopState;
})();
const IS_REMOTE_WEB_HOST = (() => {
  if(typeof window === 'undefined' || !window.location) return false;
  const hostname = String(window.location.hostname || '').toLowerCase();
  if(window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return false;
  if(hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
  return true;
})();
const API_PROBE_TIMEOUT_MS = IS_REMOTE_WEB_HOST ? 900 : 2500;
const API_HEALTH_TIMEOUT_MS = IS_REMOTE_WEB_HOST ? 1500 : 4000;
const API_STATE_LOAD_TIMEOUT_MS = IS_REMOTE_WEB_HOST ? 1800 : 25000;
const API_STATE_SAVE_TIMEOUT_MS = IS_REMOTE_WEB_HOST ? 30000 : 20000;
const API_AUTH_LOGIN_TIMEOUT_MS = IS_REMOTE_WEB_HOST ? 4000 : 5000;
const REMOTE_STATE_PAGED_LOAD_CLIENT_PAGE_SIZE = IS_REMOTE_WEB_HOST ? 25 : 40;
const REMOTE_STATE_PAGED_LOAD_MAX_PAGES = 2000;
const REMOTE_STATE_CHUNK_UPLOAD_MIN_LENGTH = IS_REMOTE_WEB_HOST ? 350000 : 1200000;
const REMOTE_STATE_CHUNK_UPLOAD_SIZE = 250000;
const XLSX_LOCAL_URL = IS_FILE_PROTOCOL ? './vendor/libs/xlsx.full.min.js' : '/vendor/libs/xlsx.full.min.js';
const EXCELJS_LOCAL_URL = IS_FILE_PROTOCOL ? './vendor/libs/exceljs.min.js' : '/vendor/libs/exceljs.min.js';
const XLSX_CDN_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const EXCELJS_CDN_URL = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
const AUDIENCE_EXPORT_HEADER_IMAGE_URL = IS_FILE_PROTOCOL ? './assets/audience-export-header.jpeg' : '/assets/audience-export-header.jpeg';
const AUDIENCE_EXPORT_TEMPLATE_ASSET_VERSION = 'ad99528-audience-header';
const AUDIENCE_EXPORT_TEMPLATE_URL = `${IS_FILE_PROTOCOL ? './assets/audience-export-template.xlsx' : '/assets/audience-export-template.xlsx'}?v=${AUDIENCE_EXPORT_TEMPLATE_ASSET_VERSION}`;
const AUDIENCE_EXPORT_TEMPLATE_BASE64_SCRIPT_URL = `${IS_FILE_PROTOCOL ? './assets/audience-export-template.base64.js' : '/assets/audience-export-template.base64.js'}?v=${AUDIENCE_EXPORT_TEMPLATE_ASSET_VERSION}`;
const AUDIENCE_EXPORT_HEADER_IMAGE_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAlgCWAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAElBLoDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9U6KKKACiiigAooooAKKKKACiiigAooooAKKKKAMrxB4V0nxXarbavYQ6hAp3COYZAPrXmnir9k34Y+KrWWJ/DVvp08gwbqx+SUficj9K9goranWq0vgk18zGpRpVfjin8j8s/wBpf9lnU/gfeJf2kj6j4buH2xXWPmjbsj+/XmvA6/Z/4neBbP4keBdX8PXyr5V5AyK5GTG2OGHoR61+OPiLRp/D+tXmn3MZint5WjZG6gg4r7zKsdLF03Gp8UfxPg81wMcJUUqfwy/AzqKKVfvD617Z4h9Kfso/spj41NPreuTzWfh22fywIcCS4fuFY5wBjnjvX2xof7Knwu0KJFTwnZ3cqjHn3QLv+dc1+wzJDJ+z1pPkAAC6uA2P72/mvoCvz7McbXnXnBSaSdrI/QcuwVCGHhNxTbV7sxfDfg3RPB8MkWi6bBpscmN6wLgNjpW1RRXiOTk7tntpKKskFFFFIYUUUUAFZviTW7fw3oGoapdyCK3tYWldz2wK0q+df25vH3/CI/Bi406Jv9I1mUWhQHB8vBZm/wDHR+ddGHouvWjSXVnPiKyoUZVX0R+b/jjxPceL/GGqa1efNcXlw00nuSf8K/Tv9j74lH4jfBrTftEqvqOlj7FOoP3VXIj/ADUCvymJyc19V/sA/Ez/AIRn4kTeG7mYR2OtR7UX+9cKRs/QtX3ea4ZVcK+Vax1X9eh8JlWJdLFLmektH/Xqfo7RRRX54foYUUUUAFMmhS4heKRQ8bjaynoR6U+igDir74L+B9TDC68M2E4Y5O+M8/rXHeIP2Q/hbr0LovhqHTHccyWJKN9ec17NRXRHEVoO8ZtfM55YejUVpQT+R8NfFT/gneLexlu/A+qSXEkYLCxvyC8nsrgAD8a+K9e0G+8NarcadqVtJaXlu5jkikXBUg9K/bmvhP8A4KJ/DuxtdQ8PeJrKBY76/MltdFRjft2lWwOp+Y19RleZ1atVUKzvfZny+aZZSpUnXoq1t0fG3hzw3qXizV7fTNKtJb29nbYkUSliTX2j8Kf+CeIltIbzxzqbwSOAx0+wK74z6M/IP4V6n+xz+zvbfC/wjB4g1a2R/EupR+Zl1ybaI8qqn1IwSffFfSNZZhm8+d0sO7Jde/obZflEORVcQrt9O3qeP6H+yX8LdEhRT4Vtb+Rek15l3/pXf+GPh/4c8Fs7aHo9tphcbW+zrjI9K6Givm516tT45N/M+jhQpU/ggl8gooorA3CiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACvy6/be8B/8Id8btRuUQiHV0W/XA+UZJUgfiv61+otfI3/AAUO8CnVvAek+I4IwH0+fyriTHPltgKP++j+te3k9b2WKUXtLT/I8TOKPtcK2t46n54UUUV+hH56fob/AME6fFQ1DwHruhlsHT7hJVU9xJuJP5rX13X5pfsD+N/+Ed+MC6XNKEtNUt2h25+9LkbP5mv0tr88zel7PFyf82p+h5PV9phIr+XQKKKK8U9oKKKKACiiigAr84f+CgfxAXxD8ULbQYJCYtGgCOFPys7gOT9RnFfo9X5jft0fDyTwd8YJtRTP2LWIxcQg84IAV+f96voMkUHive3s7f16Hz+duf1X3drq/wDXqfOFbHg/xFd+E/EunavYyeVdWkyyxv6EHNY9FfetJqzPg02ndH7V+BfFVr438H6Rrtk2+1v7dZkb69f1zW7XyX/wT6+Jn/CQ+BdQ8K3Mxku9Kk86IH+GBsAKPowb86+tK/LcXQeHrypPo/wP1HCV1iKEaq6/mFFFFch1hRRRQAUUUUAFeO/Gj4dn4lfED4e2kqMdN026mv7ptuVJQIUQ/UgivYqK1pVHSlzx3MqtNVY8kthqqsahVAVVGAAOAKdRRWRqFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAVxPxo8HQ+PPhf4i0aZN4mtHdFxnLoNy/qBXbUhAYEEZBq4ScJKS3RE4qcXF7M/EDULSWxvp7eZPLmjdkdD/CQcEVXr2L9rDwF/wAK/wDjXr9oiEQ3UpvUbHy4l+fA+hJrx2v1alUVWEai6q5+U1abpVJU30djoPAHiiXwV4y0fXIAWmsLlLhAPVSDX7MaBq0Wu6HYahA6yRXMKShl6cjNfiOrFWBHWv1H/Yj8fL4y+ClnZs5e40WVrJ2Y/MR98E/g36V83ntHmpxrLpp959JkVblqSovrr9x9A0UUV8UfahRRRQAUUUUAFeO/Gj4F+GviL4V0rXfD1xDqV5BuWaaM5TPsW4P4V6nRWRqQqTh8MkoTk3dfkdXRRRXAdwUUUUAFFFFABXyl/wVK+Gf9s+ENJ8Y2sRL6m4S3mHJ8s5I3D8FAr6Aqvo+rQaZpF9qN5I80N1C0jjuVYAj8q6sVo1o0V0Rz4ik5VJTfVH4k1j6rqEGkeKNN0e0jf7dqFslvGv95SHQj6iv1O/4J9eD7rxb8MtT1hRHeTUpEVz6F4VBn8a/Pqsj4G/Ev4i/CXxv9k8Ga3f6JqumS+VcXQQEIgkYEgyKc4x7fXmv11L8Ho4mM6tN+v/BP0vKcrq5djITaP5Iooqz4QvLTxX4V1W+HVprq20tz/ABHBBrMv2S3m1GUQNDfQykDPzM4OQfxrWrWl8UVPqWa4Kj7PfhqfceDPhXpHwj8N2WlaHbi2tpyrSIeZJHU46nsSa9MormqVVVJxpyc1oSak0FFFFMQUUUUAFFfIP/BQj4DWWo+JIPiBrESJZX83k6fM4Pl26j7sq+4r1+rquJnSlTjGMViIV4OUlyM/PCvz0/Zv+IGm+FPiv4w0DTdQNlBf2qW6W7wBtrvKxAEB7ZGfWv2Ar4E/wCCiXg2STxf4L8YzNBvWLSIwb/U7sDK1uFI/76r7XLaUaeXwh0uul/wAH5nmUcZTeYttbX/M+P6K+jP+G3vhd/0Suv/AH/lP/iaP+G3vhd/0Suv/AH/lP/ia5/7cw3/P58v/AABz/UMJfz7/AAQfG9foV/w298Lv+iV1/wC/8p/8TR/w298Lv+iV1/7/AMp/8TR/ZmG/5/Pl/wCAf2phL+ff4I8aor6M/wCG3vhd/wBErr/3/lP/AImj/ht74Xf9Err/AN/5T/4mj+zMN/z+fL/wD/ZmEv59/gjxqivoz/ht74Xf9Err/wB/5T/4mj/ht74Xf9Err/3/AJT/AOJo/szDf8/ny/8AAP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v8Ayn/xNH/Db3wu/wCiV1/7/yn/AMTR/ZmG/wCfz5f+AP7Mwl/Pv8EeNUV9Gf8ADb3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABNH/Db3wu/6JXX/AL/yn/xNH9mYb/n8+X/gD+zMJfz7/BHjVFfRn/Db3wu/6JXX/v/Kf/ABP/2Q==';
const CLIENT_FILTER_WORKER_URL = IS_FILE_PROTOCOL ? './workers/client-filter.worker.js' : '/workers/client-filter.worker.js';
const AUDIENCE_FILTER_WORKER_URL = IS_FILE_PROTOCOL ? './workers/audience-filter.worker.js' : '/workers/audience-filter.worker.js';
const SUIVI_FILTER_WORKER_URL = IS_FILE_PROTOCOL ? './workers/suivi-filter.worker.js' : '/workers/suivi-filter.worker.js';
const DILIGENCE_FILTER_WORKER_URL = IS_FILE_PROTOCOL ? './workers/diligence-filter.worker.js' : '/workers/diligence-filter.worker.js';
const EXPORT_XLSX_WORKER_URL = IS_FILE_PROTOCOL ? './workers/export-xlsx.worker.js' : '/workers/export-xlsx.worker.js';
const SALLE_SIDEBAR_WORKER_URL = IS_FILE_PROTOCOL ? './workers/salle-sidebar.worker.js' : '/workers/salle-sidebar.worker.js';
let xlsxLoadPromise = null;
let excelJsLoadPromise = null;
let audienceExportTemplateBase64ScriptPromise = null;
let clientFilterWorker = null;
let clientFilterWorkerFailed = false;
let clientFilterRequestSeq = 0;
let clientDeferredRenderTimer = null;
let clientDeferredRenderSeq = 0;
let creationDropdownRenderTimer = null;
let creationDropdownRenderSeq = 0;
let dashboardDeferredRenderTimer = null;
let dashboardDeferredRenderSeq = 0;
let sectionRenderDepthByKey = new Map();
let audienceFilterWorker = null;
let audienceFilterWorkerFailed = false;
let audienceFilterRequestSeq = 0;
let audienceDeferredRenderTimer = null;
let audienceDeferredRenderSeq = 0;
let audienceExportHeaderImageDataUrlPromise = null;
let audienceExportTemplateArrayBufferPromise = null;
let suiviFilterWorker = null;
let suiviFilterWorkerFailed = false;
let suiviFilterRequestSeq = 0;
let suiviDeferredRenderTimer = null;
let suiviDeferredRenderSeq = 0;
let salleDeferredRenderTimer = null;
let salleDeferredRenderSeq = 0;
let diligenceDeferredRenderTimer = null;
let diligenceDeferredRenderSeq = 0;
let diligenceFilterWorker = null;
let diligenceFilterWorkerFailed = false;
let diligenceFilterRequestSeq = 0;
let exportXlsxWorker = null;
let exportXlsxWorkerFailed = false;
let exportXlsxWorkerRequestSeq = 0;
let salleSidebarWorker = null;
let salleSidebarWorkerFailed = false;
let salleSidebarWorkerRequestSeq = 0;
const SALLE_WEEKDAY_OPTIONS = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' }
];

// ================== HELPERS ==================
const $ = (id) => document.getElementById(id);

function getDossierHistoryObjectId(dossier){
  if(!dossier || typeof dossier !== 'object') return 0;
  if(dossierHistoryObjectIds.has(dossier)) return dossierHistoryObjectIds.get(dossier);
  const id = dossierHistoryObjectIdCounter++;
  dossierHistoryObjectIds.set(dossier, id);
  return id;
}

function normalizeHistoryValue(value){
  if(value === undefined || value === null) return '';
  if(Array.isArray(value)){
    return value.map(v=>String(v || '').trim()).filter(Boolean).join(', ');
  }
  if(typeof value === 'object'){
    try{
      return JSON.stringify(value);
    }catch(err){
      return String(value);
    }
  }
  return String(value).trim();
}

function isImplicitProcedureDefaultHistoryEntry(entry){
  if(!entry || typeof entry !== 'object') return false;
  const source = String(entry.source || '').trim();
  if(source !== 'form') return false;
  const before = normalizeHistoryValue(entry.before);
  const after = normalizeHistoryValue(entry.after);
  if(before) return false;
  const field = String(entry.field || '').trim();
  const procedure = String(entry.procedure || '').trim();
  if(procedure === 'Injonction' && field === 'procedureDetails.notificationStatus' && after === 'att plie avec tr'){
    return true;
  }
  if(procedure === 'Injonction' && field === 'procedureDetails.certificatNonAppelStatus' && after === 'att certificat non appel'){
    return true;
  }
  return false;
}

function normalizeDossierHistoryEntries(rawHistory){
  if(!Array.isArray(rawHistory)) return [];
  return rawHistory
    .map(entry=>{
      if(!entry || typeof entry !== 'object') return null;
      const at = String(entry.at || '').trim() || new Date().toISOString();
      const by = String(entry.by || '').trim() || '-';
      const byRole = String(entry.byRole || '').trim() || '';
      const source = String(entry.source || '').trim() || 'form';
      const field = String(entry.field || '').trim() || '-';
      const procedure = String(entry.procedure || '').trim();
      const before = normalizeHistoryValue(entry.before);
      const after = normalizeHistoryValue(entry.after);
      if(before === after) return null;
      const normalizedEntry = { at, by, byRole, source, field, procedure, before, after };
      if(isImplicitProcedureDefaultHistoryEntry(normalizedEntry)) return null;
      return normalizedEntry;
    })
    .filter(Boolean)
    .slice(-DOSSIER_HISTORY_MAX_ENTRIES);
}

function getHistoryFieldLabel(field){
  const key = String(field || '').trim();
  if(DOSSIER_HISTORY_FIELD_LABELS[key]) return DOSSIER_HISTORY_FIELD_LABELS[key];
  const lastKey = key.includes('.') ? key.split('.').pop() : key;
  const humanized = String(lastKey || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  if(!humanized) return '-';
  return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}

function getHistorySourceLabel(source){
  const key = String(source || '').trim();
  return DOSSIER_HISTORY_SOURCE_LABELS[key] || key || '-';
}

function getRoleLabel(role){
  const key = normalizeUserRole(role);
  if(key === 'manager') return 'Gestionnaire';
  if(key === 'admin') return 'Admin';
  if(key === 'client') return 'Client';
  return key || '-';
}

function formatHistoryDisplayValue(value){
  const normalized = normalizeHistoryValue(value);
  return normalized || 'Vide';
}

function renderHistoryProcedureBadge(procedure){
  const label = String(procedure || '').trim();
  if(!label) return '';
  const colorClass = getProcedureColorClass(label);
  const cls = ['proc-pill'];
  if(colorClass) cls.push(colorClass);
  return `<span class="${cls.join(' ')}">${escapeHtml(label)}</span>`;
}

function getDossierHistoryProcedureFilterKey(procedure){
  const label = String(procedure || '').trim();
  if(!label) return 'general';
  return normalizeLooseText(label).toLowerCase() || 'general';
}

function getDossierHistoryFilterDefinitions(dossier, historyEntries){
  const definitions = [{ key: 'all', label: 'Toutes', procedure: '', variant: 'all' }];
  const seen = new Set(['all']);
  const procedureNames = [];
  const pushProcedure = (procedure)=>{
    const label = String(procedure || '').trim();
    if(!label) return;
    const key = getDossierHistoryProcedureFilterKey(label);
    if(seen.has(key)) return;
    seen.add(key);
    procedureNames.push(label);
  };

  normalizeProcedures(dossier).forEach(pushProcedure);
  (historyEntries || []).forEach(entry=>pushProcedure(entry?.procedure));

  const hasGeneralEntries = (historyEntries || []).some(entry=>!String(entry?.procedure || '').trim());
  if(hasGeneralEntries){
    definitions.push({ key: 'general', label: 'Général', procedure: '', variant: 'general' });
  }

  procedureNames.forEach((procedure)=>{
    definitions.push({
      key: getDossierHistoryProcedureFilterKey(procedure),
      label: procedure,
      procedure,
      variant: 'procedure'
    });
  });
  return definitions;
}

function renderDossierHistoryFilterButton(definition, active = false){
  const def = definition && typeof definition === 'object' ? definition : {};
  const label = String(def.label || '').trim() || 'Toutes';
  const procedure = String(def.procedure || '').trim();
  const classes = ['details-history-filter-btn'];
  if(active) classes.push('is-active');
  if(def.variant === 'all') classes.push('is-all');
  if(def.variant === 'general') classes.push('is-general');
  if(procedure){
    const colorClass = getProcedureColorClass(procedure);
    if(colorClass) classes.push(colorClass);
  }
  return `
    <button
      type="button"
      class="${classes.join(' ')}"
      data-history-filter="${escapeAttr(def.key || 'all')}">
      ${escapeHtml(label)}
    </button>
  `;
}

function renderDossierHistoryEntry(entry){
  if(!entry || typeof entry !== 'object') return '';
  const procedureBadge = renderHistoryProcedureBadge(entry.procedure);
  const fieldLabel = getHistoryFieldLabel(entry.field);
  const sourceLabel = getHistorySourceLabel(entry.source);
  const roleLabel = getRoleLabel(entry.byRole);
  const beforeLabel = formatHistoryDisplayValue(entry.before);
  const afterLabel = formatHistoryDisplayValue(entry.after);
  const procedureKey = getDossierHistoryProcedureFilterKey(entry.procedure);
  return `
    <div class="details-history-item" data-history-procedure="${escapeAttr(procedureKey)}">
      <div class="details-history-top">
        <div class="details-history-title-wrap">
          <strong class="details-history-field">${escapeHtml(fieldLabel)}</strong>
          ${procedureBadge}
        </div>
        <span class="details-history-time">${escapeHtml(formatHistoryDateTime(entry.at))}</span>
      </div>
      <div class="details-history-meta">
        <span class="details-history-chip">${escapeHtml(sourceLabel)}</span>
        <span class="details-history-chip">Par: ${escapeHtml(entry.by || '-')}</span>
        <span class="details-history-chip">${escapeHtml(roleLabel)}</span>
      </div>
      <div class="details-history-change-grid">
        <div class="details-history-value-card details-history-before-card">
          <span class="details-history-value-label">Avant</span>
          <span class="details-history-value-text">${escapeHtml(beforeLabel)}</span>
        </div>
        <div class="details-history-arrow"><i class="fa-solid fa-arrow-right"></i></div>
        <div class="details-history-value-card details-history-after-card">
          <span class="details-history-value-label">Après</span>
          <span class="details-history-value-text">${escapeHtml(afterLabel)}</span>
        </div>
      </div>
    </div>
  `;
}

function applyDossierHistoryFilter(root, filterKey){
  if(!root) return;
  const nextFilter = String(filterKey || 'all').trim() || 'all';
  root.querySelectorAll('.details-history-filter-btn').forEach((button)=>{
    const isActive = String(button.dataset.historyFilter || 'all') === nextFilter;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  const entries = [...root.querySelectorAll('.details-history-item')];
  let visibleCount = 0;
  entries.forEach((entry)=>{
    const entryKey = String(entry.dataset.historyProcedure || 'general').trim() || 'general';
    const visible = nextFilter === 'all' || entryKey === nextFilter;
    entry.style.display = visible ? '' : 'none';
    if(visible) visibleCount += 1;
  });
  const emptyNode = root.querySelector('.details-history-empty-filter');
  if(emptyNode){
    emptyNode.style.display = visibleCount ? 'none' : '';
  }
}

function normalizeUserRole(role){
  const key = String(role || '').trim().toLowerCase();
  if(key === 'manager' || key === 'gestionnaire') return 'manager';
  if(key === 'admin') return 'admin';
  if(key === 'viewer' || key === 'client' || key === 'consultation') return 'client';
  return 'client';
}

function formatHistoryDateTime(iso){
  const ts = Date.parse(String(iso || ''));
  if(!Number.isFinite(ts)) return '-';
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function pushDossierHistoryEntry(dossier, entry){
  if(!dossier || typeof dossier !== 'object' || !entry || typeof entry !== 'object') return false;
  const before = normalizeHistoryValue(entry.before);
  const after = normalizeHistoryValue(entry.after);
  if(before === after) return false;
  const normalizedEntry = {
    at: String(entry.at || '').trim() || new Date().toISOString(),
    by: String(entry.by || '').trim() || String(currentUser?.username || '-'),
    byRole: String(entry.byRole || '').trim() || String(currentUser?.role || ''),
    source: String(entry.source || '').trim() || 'form',
    field: String(entry.field || '').trim() || '-',
    procedure: String(entry.procedure || '').trim(),
    before,
    after
  };
  if(isImplicitProcedureDefaultHistoryEntry(normalizedEntry)) return false;
  if(!Array.isArray(dossier.history)) dossier.history = [];
  dossier.history.push(normalizedEntry);
  if(dossier.history.length > DOSSIER_HISTORY_MAX_ENTRIES){
    dossier.history = dossier.history.slice(-DOSSIER_HISTORY_MAX_ENTRIES);
  }
  return true;
}

function makeDossierHistoryPendingKey(dossier, entry){
  const dossierId = getDossierHistoryObjectId(dossier);
  const source = String(entry?.source || '').trim();
  const field = String(entry?.field || '').trim();
  const procedure = String(entry?.procedure || '').trim();
  return `${dossierId}::${source}::${field}::${procedure}`;
}

function findDossierOwnerByReference(dossierRef){
  const target = dossierRef && typeof dossierRef === 'object' ? dossierRef : null;
  if(!target) return null;
  for(const client of (Array.isArray(AppState.clients) ? AppState.clients : [])){
    const dossiers = Array.isArray(client?.dossiers) ? client.dossiers : [];
    const dossierIndex = dossiers.indexOf(target);
    if(dossierIndex === -1) continue;
    return {
      clientId: Number(client?.id),
      dossierIndex,
      dossier: target
    };
  }
  return null;
}

function flushDossierHistoryPendingEntryByKey(key, options = {}){
  const pending = dossierHistoryPendingEntries.get(key);
  if(!pending) return false;
  const timer = dossierHistoryPendingTimers.get(key);
  if(timer){
    clearTimeout(timer);
    dossierHistoryPendingTimers.delete(key);
  }
  dossierHistoryPendingEntries.delete(key);
  const changed = pushDossierHistoryEntry(pending.dossier, pending.entry);
  if(changed && options.persist){
    const owner = findDossierOwnerByReference(pending.dossier);
    if(owner && Number.isFinite(owner.clientId)){
      persistDossierReferenceNow(owner.clientId, owner.dossier, { source: 'dossier-history' }).catch(()=>{
        queuePersistAppState();
      });
    }else{
      queuePersistAppState();
    }
  }
  return changed;
}

function queueDossierHistoryEntry(dossier, entry, options = {}){
  if(!dossier || typeof dossier !== 'object') return;
  const before = normalizeHistoryValue(entry?.before);
  const after = normalizeHistoryValue(entry?.after);
  if(before === after) return;
  const normalizedEntry = {
    at: String(entry?.at || '').trim() || new Date().toISOString(),
    by: String(entry?.by || '').trim() || String(currentUser?.username || '-'),
    byRole: String(entry?.byRole || '').trim() || String(currentUser?.role || ''),
    source: String(entry?.source || '').trim() || 'form',
    field: String(entry?.field || '').trim() || '-',
    procedure: String(entry?.procedure || '').trim(),
    before,
    after
  };
  if(isImplicitProcedureDefaultHistoryEntry(normalizedEntry)) return;
  if(options.immediate){
    pushDossierHistoryEntry(dossier, normalizedEntry);
    return;
  }
  const key = makeDossierHistoryPendingKey(dossier, normalizedEntry);
  const existing = dossierHistoryPendingEntries.get(key);
  if(existing){
    existing.entry.after = normalizedEntry.after;
    existing.entry.at = normalizedEntry.at;
    existing.entry.by = normalizedEntry.by;
    existing.entry.byRole = normalizedEntry.byRole;
  }else{
    dossierHistoryPendingEntries.set(key, {
      dossier,
      entry: normalizedEntry
    });
  }
  if(dossierHistoryPendingTimers.has(key)){
    clearTimeout(dossierHistoryPendingTimers.get(key));
  }
  dossierHistoryPendingTimers.set(key, setTimeout(()=>{
    flushDossierHistoryPendingEntryByKey(key, { persist: true });
  }, DOSSIER_HISTORY_DEBOUNCE_MS));
}

function flushAllDossierHistoryPendingEntries(){
  const keys = [...dossierHistoryPendingEntries.keys()];
  keys.forEach(key=>{
    flushDossierHistoryPendingEntryByKey(key, { persist: false });
  });
}

function collectDossierDiffEntries(prevDossier, nextDossier){
  const previous = prevDossier && typeof prevDossier === 'object' ? prevDossier : {};
  const next = nextDossier && typeof nextDossier === 'object' ? nextDossier : {};
  const entries = [];
  const dossierFields = [
    'debiteur',
    'nRef',
    'boiteNo',
    'referenceClient',
    'dateAffectation',
    'gestionnaire',
    'procedure',
    'montant',
    'ville',
    'adresse',
    'ww',
    'marque',
    'type',
    'caution',
    'cautionAdresse',
    'cautionVille',
    'cautionCin',
    'cautionRc',
    'efNumber',
    'conservation',
    'metrage',
    'note',
    'avancement',
    'statut'
  ];
  dossierFields.forEach(field=>{
    const before = previous[field];
    const after = next[field];
    if(normalizeHistoryValue(before) === normalizeHistoryValue(after)) return;
    entries.push({
      source: 'form',
      field,
      before,
      after
    });
  });

  const previousDetails = previous?.procedureDetails && typeof previous.procedureDetails === 'object'
    ? previous.procedureDetails
    : {};
  const nextDetails = next?.procedureDetails && typeof next.procedureDetails === 'object'
    ? next.procedureDetails
    : {};
  const procKeys = new Set([...Object.keys(previousDetails), ...Object.keys(nextDetails)]);
  procKeys.forEach(procKey=>{
    const beforeProc = previousDetails[procKey] && typeof previousDetails[procKey] === 'object'
      ? previousDetails[procKey]
      : {};
    const afterProc = nextDetails[procKey] && typeof nextDetails[procKey] === 'object'
      ? nextDetails[procKey]
      : {};
    const fieldKeys = new Set([...Object.keys(beforeProc), ...Object.keys(afterProc)]);
    fieldKeys.forEach(field=>{
      const before = beforeProc[field];
      const after = afterProc[field];
      if(normalizeHistoryValue(before) === normalizeHistoryValue(after)) return;
      const entry = {
        source: 'form',
        field: `procedureDetails.${field}`,
        procedure: procKey,
        before,
        after
      };
      if(isImplicitProcedureDefaultHistoryEntry(entry)) return;
      entries.push(entry);
    });
  });
  return entries;
}

function getAudienceProcedureFieldValue(procData, draftField){
  if(!procData || !draftField) return '';
  if(draftField === 'refDossier') return procData.referenceClient;
  if(draftField === 'dateAudience') return procData.audience;
  if(draftField === 'juge') return procData.juge;
  if(draftField === 'sort') return procData.sort;
  return procData[draftField];
}

function normalizeApiBaseCandidate(value){
  let base = String(value || '').trim();
  if(!base) return '';
  base = base.replace(/\/+$/, '');
  base = base.replace(/\/api\/health$/i, '');
  base = base.replace(/\/health$/i, '');
  if(!/\/api$/i.test(base)){
    base = `${base}/api`;
  }
  return base.replace(/\/+$/, '');
}

function getAudienceViewerCacheKey(){
  const user = currentUser || {};
  const role = normalizeUserRole(user.role);
  const id = Number(user.id) || 0;
  const clientIds = Array.isArray(user.clientIds)
    ? [...user.clientIds].map(v=>Number(v)).filter(v=>Number.isFinite(v)).sort((a, b)=>a - b).join(',')
    : '';
  return `${id}::${role}::${clientIds}`;
}

function invalidateDerivedCaches(options = {}){
  const audience = options.audience !== false;
  const preserveBaseRowCaches = options.preserveBaseRowCaches === true;
  const preserveClientAccessCaches = options.preserveClientAccessCaches === true;
  const preserveClientListSummary = options.preserveClientListSummary === true;
  const preserveDashboardSnapshot = options.preserveDashboardSnapshot === true;
  const preserveDashboardAudienceMetrics = options.preserveDashboardAudienceMetrics === true;
  const preserveKnownJudgesCache = options.preserveKnownJudgesCache === true;
  dossierDataVersion += 1;
  if(audience) audienceRowsRawDataVersion += 1;
  backgroundDataWarmupVersion = -1;
  if(!preserveClientAccessCaches){
    visibleClientsCache = null;
    visibleClientsCacheVersion = -1;
    visibleClientsCacheUserKey = '';
    editableClientsCache = null;
    editableClientsCacheVersion = -1;
    editableClientsCacheUserKey = '';
  }
  if(!preserveClientListSummary){
    clientListSummaryCache = null;
    clientListSummaryCacheVersion = -1;
    clientListSummaryCacheUserKey = '';
    clientClotureCountCacheValue = 0;
    clientClotureCountCacheVersion = -1;
    clientClotureCountCacheUserKey = '';
  }
  if(!preserveDashboardSnapshot){
    dashboardSnapshotCache = null;
    dashboardSnapshotCacheVersion = -1;
    dashboardSnapshotCacheUserKey = '';
  }
  if(!preserveDashboardAudienceMetrics){
    dashboardAudienceMetricsCache = null;
    dashboardAudienceMetricsCacheVersion = -1;
    dashboardAudienceMetricsCacheUserKey = '';
  }
  if(!preserveBaseRowCaches){
    suiviBaseRowsCache = null;
  }
  suiviFilterOptionsRowsMetaRef = null;
  suiviFilteredRowsCacheSource = null;
  suiviFilteredRowsCacheKey = '';
  suiviFilteredRowsCacheOutput = [];
  suiviCheckedOrderedRowsCacheInput = null;
  suiviCheckedOrderedRowsCacheVersion = -1;
  suiviCheckedOrderedRowsCacheOutput = [];
  suiviSelectionCountRowsRef = null;
  suiviSelectionCountVersion = -1;
  suiviSelectionCountValue = 0;
  suiviSelectedExportRowsCacheInput = null;
  suiviSelectedExportRowsCacheVersion = -1;
  suiviSelectedExportRowsCacheOutput = [];
  suiviPrintSelectionPruneDataVersion = -1;
  lastSuiviRenderedRows = [];
  lastSuiviRenderedPageRows = [];
  lastSuiviRenderedStateKey = '';
  lastSuiviRenderedPage = 1;
  lastSuiviRenderedRowKeySet = new Set();
  lastSuiviRenderedSelectedCount = 0;
  diligenceRowsCache = null;
  diligenceFilteredRowsCacheInput = null;
  diligenceFilteredRowsCacheKey = '';
  diligenceFilteredRowsCacheOutput = [];
  diligenceCheckedOrderedRowsCacheInput = null;
  diligenceCheckedOrderedRowsCacheVersion = -1;
  diligenceCheckedOrderedRowsCacheOutput = [];
  diligenceFilterProcedureRowsRef = null;
  diligenceFilterTribunalRowsRef = null;
  diligenceFilterSortRowsRef = null;
  diligenceFilterDelegationRowsRef = null;
  diligenceFilterOrdonnanceRowsRef = null;
  diligencePrintSelectionPruneDataVersion = -1;
  diligenceSelectionCountRowsRef = null;
  diligenceSelectionCountVersion = -1;
  diligenceSelectionCountValue = 0;
  lastDiligenceRenderedRows = [];
  lastDiligenceRenderedPageRows = [];
  lastDiligenceRenderedStateKey = '';
  lastDiligenceRenderedPage = 1;
  lastDiligenceRenderedRowKeySet = new Set();
  lastDiligenceRenderedSelectedCount = 0;
  if(!audience) return;
  dashboardCalendarEventsCache = null;
  dashboardCalendarEventsCacheVersion = -1;
  dashboardCalendarEventsCacheUserKey = '';
  dashboardCalendarMarkupCacheKey = '';
  dashboardCalendarMarkupCacheHtml = '';
  audienceSidebarProjectionCache = null;
  audienceSidebarProjectionCacheVersion = -1;
  audienceSidebarProjectionCacheUserKey = '';
  audienceErrorCountCacheVersion = -1;
  audienceErrorCountCacheValue = 0;
  audienceClosedStatusLookupCache = null;
  audienceClosedStatusLookupCacheVersion = -1;
  audienceExactSearchIndexCacheInput = null;
  audienceExactSearchIndexCacheOutput = null;
  if(!preserveKnownJudgesCache){
    knownJudgesCache = null;
    knownJudgesCacheVersion = -1;
    knownJudgesDatalistRenderKey = '';
  }
  salleAudienceMapCache = null;
  salleAudienceMapCacheVersion = -1;
  salleAudienceMapCacheUserKey = '';
  filteredSalleAudienceMapCache = null;
  filteredSalleAudienceMapCacheVersion = -1;
  filteredSalleAudienceMapAssignmentsVersion = -1;
  filteredSalleAudienceMapCacheUserKey = '';
  filteredSalleAudienceMapFilterKey = '';
  lastSalleRenderKey = '';
  if(!preserveBaseRowCaches){
    audienceRowsRawCache = null;
    audienceRowsDedupeCache = null;
  }
  audienceRowsViewCacheSource = null;
  audienceRowsViewCacheKey = '';
  audienceRowsViewCacheOutput = [];
  audienceFilteredRowsCacheInput = null;
  audienceFilteredRowsCacheKey = '';
  audienceFilteredRowsCacheOutput = [];
  audienceCheckedOrderedRowsCacheInput = null;
  audienceCheckedOrderedRowsCacheVersion = -1;
  audienceCheckedOrderedRowsCacheOutput = [];
  audienceFilterOptionsRowsRef = null;
  audienceDuplicateKeySetCacheInput = null;
  audienceDuplicateKeySetCacheOutput = new Set();
  audienceMismatchRefClientSetCacheInput = null;
  audienceMismatchRefClientSetCacheOutput = new Set();
}

function markAudienceRowsCacheDirty(options = {}){
  invalidateDerivedCaches({
    audience: true,
    preserveBaseRowCaches: options.preserveBaseRowCaches === true,
    preserveClientAccessCaches: options.preserveClientAccessCaches === true,
    preserveClientListSummary: options.preserveClientListSummary === true,
    preserveDashboardSnapshot: options.preserveDashboardSnapshot === true,
    preserveDashboardAudienceMetrics: options.preserveDashboardAudienceMetrics === true,
    preserveKnownJudgesCache: options.preserveKnownJudgesCache === true
  });
  audienceErrorRowsCacheInput = null;
  audienceErrorRowsCacheOutput = [];
  audienceSelectedExportRowsCacheInput = null;
  audienceSelectedExportRowsCacheVersion = -1;
  audienceSelectedExportRowsCacheOutput = [];
  lastAudienceRenderedRows = [];
  lastAudienceRenderedPageRows = [];
  lastAudienceRenderedStateKey = '';
  lastAudienceRenderedPage = 1;
  lastAudienceRenderedRowKeySet = new Set();
  lastAudienceRenderedSelectedCount = 0;
  audienceSelectionCountRowsRef = null;
  audienceSelectionCountVersion = -1;
  audienceSelectionCountValue = 0;
  diligenceSelectedExportRowsCacheInput = null;
  diligenceSelectedExportRowsCacheVersion = -1;
  diligenceSelectedExportRowsCacheOutput = [];
}

function markAudienceColorCachesDirty(){
  backgroundDataWarmupVersion = -1;
  dashboardAudienceMetricsCache = null;
  dashboardAudienceMetricsCacheVersion = -1;
  dashboardAudienceMetricsCacheUserKey = '';
  audienceRowsViewCacheSource = null;
  audienceRowsViewCacheKey = '';
  audienceRowsViewCacheOutput = [];
  audienceFilteredRowsCacheInput = null;
  audienceFilteredRowsCacheKey = '';
  audienceFilteredRowsCacheOutput = [];
  audienceSelectionCountRowsRef = null;
  audienceSelectionCountVersion = -1;
  audienceSelectionCountValue = 0;
  lastAudienceRenderCacheKey = '';
  lastAudienceRenderIdentityKey = '';
  audienceVirtualLastRange = { start: -1, end: -1 };
}

function markNonAudienceDossierCachesDirty(){
  invalidateDerivedCaches({ audience: false });
  diligenceSelectedExportRowsCacheInput = null;
  diligenceSelectedExportRowsCacheVersion = -1;
  diligenceSelectedExportRowsCacheOutput = [];
}

function invalidateSalleAssignmentsCaches(){
  salleAssignmentsVersion += 1;
  salleAudienceMapCache = null;
  salleAudienceMapCacheVersion = -1;
  salleAudienceMapAssignmentsVersion = -1;
  salleAudienceMapCacheUserKey = '';
  filteredSalleAudienceMapCache = null;
  filteredSalleAudienceMapCacheVersion = -1;
  filteredSalleAudienceMapAssignmentsVersion = -1;
  filteredSalleAudienceMapCacheUserKey = '';
  filteredSalleAudienceMapFilterKey = '';
  knownJudgesDatalistRenderKey = '';
  lastSalleRenderKey = '';
}

function dossierHasAudienceImpact(dossier){
  return normalizeProcedures(dossier).some(procName=>isAudienceProcedure(procName));
}

function handleDossierDataChange(options = {}){
  const hasAudienceImpact = options.audience === true;
  const rerenderLinked = options.rerenderLinked === true;
  if(hasAudienceImpact){
    markAudienceRowsCacheDirty({
      preserveBaseRowCaches: options.preserveBaseRowCaches === true,
      preserveClientAccessCaches: options.preserveClientAccessCaches === true,
      preserveClientListSummary: options.preserveClientListSummary === true,
      preserveDashboardSnapshot: options.preserveDashboardSnapshot === true,
      preserveDashboardAudienceMetrics: options.preserveDashboardAudienceMetrics === true,
      preserveKnownJudgesCache: options.preserveKnownJudgesCache === true
    });
  }else{
    invalidateDerivedCaches({
      audience: false,
      preserveBaseRowCaches: options.preserveBaseRowCaches === true,
      preserveClientAccessCaches: options.preserveClientAccessCaches === true,
      preserveClientListSummary: options.preserveClientListSummary === true,
      preserveDashboardSnapshot: options.preserveDashboardSnapshot === true
    });
    diligenceSelectedExportRowsCacheInput = null;
    diligenceSelectedExportRowsCacheVersion = -1;
    diligenceSelectedExportRowsCacheOutput = [];
  }
  if(rerenderLinked){
    queueDossierLinkedRenders();
  }
}

function pushApiCandidate(candidates, seen, value){
  const normalized = normalizeApiBaseCandidate(value);
  if(!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  candidates.push(normalized);
}

function appendCandidateVariants(candidates, seen, value){
  const normalized = normalizeApiBaseCandidate(value);
  if(!normalized) return;
  pushApiCandidate(candidates, seen, normalized);
}

function buildApiBaseCandidates(){
  const out = [];
  const seen = new Set();
  appendCandidateVariants(out, seen, API_BASE);
  const queryApiBase = new URLSearchParams(window.location.search).get('apiBase');
  appendCandidateVariants(out, seen, queryApiBase);
  if(typeof localStorage !== 'undefined'){
    try{
      appendCandidateVariants(out, seen, localStorage.getItem(API_BASE_STORAGE_KEY));
    }catch(err){
      console.warn('Impossible de lire la configuration API locale', err);
    }
  }
  appendCandidateVariants(out, seen, window.CABINET_API_BASE);
  const metaApiBase = document.querySelector('meta[name="api-base"]')?.getAttribute('content');
  appendCandidateVariants(out, seen, metaApiBase);

  if(window.location.protocol === 'http:' || window.location.protocol === 'https:'){
    appendCandidateVariants(out, seen, `${window.location.origin}/api`);
  }
  const hostname = String(window.location.hostname || '').toLowerCase();
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  const runningOnDefaultLocalApiPort = Number(window.location.port || 0) === 3000;
  if(isLocalHost && (IS_FILE_PROTOCOL || !window.location.port || runningOnDefaultLocalApiPort)){
    appendCandidateVariants(out, seen, 'http://127.0.0.1:3000/api');
  }
  if(!IS_REMOTE_WEB_HOST && IS_FILE_PROTOCOL){
    appendCandidateVariants(out, seen, 'http://127.0.0.1:3000/api');
  }
  return out;
}

function setSidebarCollapsed(collapsed){
  const app = $('appContent');
  const btn = $('sidebarToggleBtn');
  if(!app || !btn) return;
  app.classList.toggle('sidebar-collapsed', !!collapsed);
  btn.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
}

function toggleSidebar(){
  const app = $('appContent');
  if(!app) return;
  const collapsed = !app.classList.contains('sidebar-collapsed');
  setSidebarCollapsed(collapsed);
  if(typeof localStorage !== 'undefined'){
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  }
}

function isMobileViewport(){
  if(typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(max-width: 600px)').matches;
}

function restoreSidebarState(){
  const mobileDefault = isMobileViewport();
  if(typeof localStorage === 'undefined'){
    setSidebarCollapsed(mobileDefault);
    return;
  }
  const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
  if(raw === null){
    setSidebarCollapsed(mobileDefault);
    return;
  }
  setSidebarCollapsed(raw === '1');
}

function clampContentZoom(value){
  const numeric = Number(value);
  if(!Number.isFinite(numeric)) return CONTENT_ZOOM_DEFAULT;
  return Math.min(CONTENT_ZOOM_MAX, Math.max(CONTENT_ZOOM_MIN, numeric));
}

function normalizeContentZoomStep(value){
  const clamped = clampContentZoom(value);
  return Math.round(clamped / CONTENT_ZOOM_STEP) * CONTENT_ZOOM_STEP;
}

function getContentZoomPercent(value){
  return Math.round(clampContentZoom(value) * 100);
}

function supportsCssZoom(){
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('zoom', '1');
}

function syncContentZoomControls(level){
  const percent = getContentZoomPercent(level);
  const range = $('zoomRange');
  const label = $('zoomPercent');
  if(range) range.value = String(percent);
  if(label) label.textContent = `${percent} %`;
}

function scheduleContentZoomRefresh(){
  if(contentZoomRefreshTimer){
    clearTimeout(contentZoomRefreshTimer);
  }
  contentZoomRefreshTimer = setTimeout(()=>{
    contentZoomRefreshTimer = null;
    if(isDeferredRenderSectionVisible('audience')){
      renderAudienceKeepingPosition();
    }
    if(isDeferredRenderSectionVisible('suivi')){
      renderSuivi();
    }
    if(isDeferredRenderSectionVisible('diligence')){
      renderDiligence();
    }
  }, 80);
}

function applyContentZoom(level, options = {}){
  const zoomLevel = normalizeContentZoomStep(level);
  const content = $('contentArea');
  const viewport = $('contentZoomViewport');
  if(!content || !viewport) return zoomLevel;
  const useCssZoom = supportsCssZoom();
  content.style.setProperty('--content-zoom', String(zoomLevel));
  content.classList.toggle('content-transform-zoom', !useCssZoom);
  if(useCssZoom){
    viewport.style.zoom = String(zoomLevel);
    viewport.style.transform = '';
    viewport.style.width = '';
  }else{
    viewport.style.zoom = '';
    viewport.style.transform = `scale(${zoomLevel})`;
    viewport.style.width = `${100 / zoomLevel}%`;
  }
  syncContentZoomControls(zoomLevel);
  if(options.persist !== false && typeof localStorage !== 'undefined'){
    try{
      localStorage.setItem(CONTENT_ZOOM_STORAGE_KEY, String(zoomLevel));
    }catch(err){
      console.warn('Sauvegarde du zoom impossible', err);
    }
  }
  if(hasLoadedState){
    scheduleContentZoomRefresh();
  }
  return zoomLevel;
}

function changeContentZoom(delta){
  const current = Number($('zoomRange')?.value || getContentZoomPercent(CONTENT_ZOOM_DEFAULT)) / 100;
  return applyContentZoom(current + delta);
}

function resetContentZoom(){
  return applyContentZoom(CONTENT_ZOOM_DEFAULT);
}

function restoreContentZoom(){
  if(typeof localStorage === 'undefined'){
    applyContentZoom(CONTENT_ZOOM_DEFAULT, { persist: false });
    return;
  }
  let nextZoom = CONTENT_ZOOM_DEFAULT;
  try{
    const raw = localStorage.getItem(CONTENT_ZOOM_STORAGE_KEY);
    if(raw !== null) nextZoom = Number(raw);
  }catch(err){
    console.warn('Lecture du zoom impossible', err);
  }
  applyContentZoom(nextZoom, { persist: false });
}

function markDeferredRenderDirty(...keys){
  keys.forEach(key=>{
    if(Object.prototype.hasOwnProperty.call(deferredRenderDirtyState, key)){
      deferredRenderDirtyState[key] = true;
    }
  });
}

function clearDeferredRenderDirty(key){
  if(Object.prototype.hasOwnProperty.call(deferredRenderDirtyState, key)){
    deferredRenderDirtyState[key] = false;
  }
}

function isDeferredRenderSectionVisible(key){
  const id = DEFERRED_RENDER_SECTION_IDS[key];
  if(!id) return true;
  const el = $(id);
  return !!el && el.style.display !== 'none';
}

function shouldRenderDeferredSection(key, options = {}){
  if(options.force === true || isDeferredRenderSectionVisible(key)){
    clearDeferredRenderDirty(key);
    return true;
  }
  markDeferredRenderDirty(key);
  return false;
}

function shouldRenderClientDropdown(options = {}){
  if(options.force === true || isDeferredRenderSectionVisible('creation')){
    clearDeferredRenderDirty('clientDropdown');
    return true;
  }
  markDeferredRenderDirty('clientDropdown');
  return false;
}

function getVisibleDeferredSectionKeys(){
  return Object.keys(DEFERRED_RENDER_SECTION_IDS).filter(key=>isDeferredRenderSectionVisible(key));
}

function getVisibleDossierCount(){
  const userKey = getCurrentClientAccessCacheKey();
  if(
    visibleDossierCountCacheVersion === dossierDataVersion
    && visibleDossierCountCacheUserKey === userKey
  ){
    return visibleDossierCountCacheValue;
  }
  let dossierCount = 0;
  const visibleClients = getVisibleClients();
  for(const client of visibleClients){
    dossierCount += Array.isArray(client?.dossiers) ? client.dossiers.length : 0;
  }
  visibleDossierCountCacheValue = dossierCount;
  visibleDossierCountCacheVersion = dossierDataVersion;
  visibleDossierCountCacheUserKey = userKey;
  return dossierCount;
}

function isUltraLargeDatasetMode(){
  const userKey = getCurrentClientAccessCacheKey();
  if(
    ultraLargeDatasetModeCacheVersion === dossierDataVersion
    && ultraLargeDatasetModeCacheUserKey === userKey
  ){
    return ultraLargeDatasetModeCacheValue;
  }
  const visibleClients = getVisibleClients();
  const dossierCount = getVisibleDossierCount();
  const ultraLarge = visibleClients.length >= ULTRA_LARGE_DATASET_VISIBLE_CLIENTS_THRESHOLD
    || dossierCount >= ULTRA_LARGE_DATASET_DOSSIERS_THRESHOLD;
  ultraLargeDatasetModeCacheValue = ultraLarge;
  ultraLargeDatasetModeCacheVersion = dossierDataVersion;
  ultraLargeDatasetModeCacheUserKey = userKey;
  return ultraLarge;
}

function isVeryLargeLiveSyncMode(){
  if(isUltraLargeDatasetMode()) return true;
  if(!isLargeDatasetMode()) return false;
  if(remoteSyncStreamConnected || hasRemoteAuthSession()) return true;
  return getVisibleClients().length >= 250 || getVisibleDossierCount() >= 35000;
}

function shouldPreferFastWorkbookPath(rowCount = 0){
  const totalRows = Math.max(0, Number(rowCount) || 0);
  if(totalRows > STYLED_XLSX_MAX_ROWS) return true;
  if(isUltraLargeDatasetMode()){
    return totalRows >= 40;
  }
  if(!isLargeDatasetMode()) return false;
  if(isVeryLargeLiveSyncMode()){
    return totalRows >= 80;
  }
  return totalRows >= 200;
}

function shouldPreferAudienceRegularExportCsvPath(rowCount = 0){
  const totalRows = Math.max(0, Number(rowCount) || 0);
  if(totalRows <= 0) return false;
  if(totalRows >= AUDIENCE_REGULAR_EXPORT_CSV_THRESHOLD_STABLE) return true;
  if(totalRows >= AUDIENCE_REGULAR_EXPORT_CSV_THRESHOLD) return true;
  if(isVeryLargeLiveSyncMode()){
    return totalRows >= AUDIENCE_REGULAR_EXPORT_CSV_THRESHOLD_VERY_LARGE;
  }
  if(isLargeDatasetMode() || heavyUiOperationCount > 0){
    return totalRows >= AUDIENCE_REGULAR_EXPORT_CSV_THRESHOLD_LARGE;
  }
  return false;
}

function shouldPreferSalleExportCsvPath(rowCount = 0){
  const totalRows = Math.max(0, Number(rowCount) || 0);
  if(totalRows <= 0) return false;
  if(totalRows >= SALLE_EXPORT_CSV_THRESHOLD) return true;
  if(isVeryLargeLiveSyncMode()){
    return totalRows >= SALLE_EXPORT_CSV_THRESHOLD_VERY_LARGE;
  }
  if(isLargeDatasetMode() || heavyUiOperationCount > 0){
    return totalRows >= SALLE_EXPORT_CSV_THRESHOLD_LARGE;
  }
  return false;
}

function getRemoteSyncSectionMinInterval(sectionKey, options = {}){
  if(options?.livePatch !== true) return 0;
  const safeKey = String(sectionKey || '').trim();
  if(!safeKey) return 0;
  let baseDelay = 0;
  if(isVeryLargeLiveSyncMode()){
    baseDelay = REMOTE_SYNC_SECTION_MIN_INTERVAL_VERY_LARGE_MS;
  }else if(isLargeDatasetMode()){
    baseDelay = REMOTE_SYNC_SECTION_MIN_INTERVAL_LARGE_MS;
  }
  const sectionDelay = Number(REMOTE_SYNC_SECTION_MIN_INTERVAL_BY_SECTION[safeKey]) || 0;
  if(safeKey === 'dashboard' && remoteDashboardLightRefreshPending){
    return Math.max(baseDelay, sectionDelay);
  }
  return Math.max(baseDelay, sectionDelay);
}

function getRemoteSyncRenderCooldownDelay(sectionKeys = [], options = {}){
  const keys = sectionKeys instanceof Set ? [...sectionKeys] : (Array.isArray(sectionKeys) ? sectionKeys : []);
  const now = Date.now();
  return keys.reduce((maxDelay, key)=>{
    const safeKey = String(key || '').trim();
    if(!safeKey) return maxDelay;
    const minIntervalMs = getRemoteSyncSectionMinInterval(safeKey, options);
    if(minIntervalMs <= 0) return maxDelay;
    const lastRenderedAt = Number(remoteSectionLastRenderAt.get(safeKey) || 0);
    const remaining = minIntervalMs - (now - lastRenderedAt);
    return Math.max(maxDelay, remaining > 0 ? remaining : 0);
  }, 0);
}

function markRemoteSyncSectionsRendered(sectionKeys = []){
  const now = Date.now();
  (Array.isArray(sectionKeys) ? sectionKeys : []).forEach((key)=>{
    const safeKey = String(key || '').trim();
    if(!safeKey) return;
    remoteSectionLastRenderAt.set(safeKey, now);
  });
}

function refreshVisibleSectionsAfterRemoteSync(sectionKeys = null){
  const visibleKeys = new Set(getVisibleDeferredSectionKeys());
  const requestedKeys = Array.isArray(sectionKeys) && sectionKeys.length
    ? new Set(sectionKeys.map(key=>String(key || '').trim()).filter(Boolean))
    : null;
  const shouldRender = (key)=>visibleKeys.has(key) && (!requestedKeys || requestedKeys.has(key));
  const shouldUseDeferredHeavyRender = isLargeDatasetMode() || importInProgress || heavyUiOperationCount > 0;
  const queueDeferredRemoteSectionRender = (sectionKey, renderFn, delayMs = 60)=>{
    if(!shouldUseDeferredHeavyRender) return false;
    return scheduleDeferredSectionRender(sectionKey, ()=>runSectionRenderSafely(sectionKey, renderFn, { delayMs }), { delayMs });
  };
  if(shouldRender('dashboard')){
    const lightRefresh = remoteDashboardLightRefreshPending;
    remoteDashboardLightRefreshPending = false;
    if(lightRefresh && isVeryLargeLiveSyncMode() && typeof renderDashboardLiveLite === 'function'){
      runSectionRenderSafely('dashboard', ()=>renderDashboardLiveLite(), { delayMs: 50 });
    }else if(!queueDeferredRemoteSectionRender('dashboard', ()=>renderDashboard(lightRefresh ? { includeAudienceMetrics: false } : {}), 50)){
      runSectionRenderSafely('dashboard', ()=>renderDashboard(lightRefresh ? { includeAudienceMetrics: false } : {}), { delayMs: 50 });
    }
    markRemoteSyncSectionsRendered(['dashboard']);
  }
  if(shouldRender('clients')){
    if(!queueDeferredRemoteSectionRender('clients', ()=>renderClients(), 50)){
      runSectionRenderSafely('clients', ()=>renderClients(), { delayMs: 50 });
    }
    markRemoteSyncSectionsRendered(['clients']);
  }
  if(shouldRender('suivi')){
    if(!queueDeferredRemoteSectionRender('suivi', ()=>renderSuivi(), 70)){
      runSectionRenderSafely('suivi', ()=>renderSuivi(), { delayMs: 70 });
    }
    markRemoteSyncSectionsRendered(['suivi']);
  }
  if(shouldRender('audience')){
    if(!queueDeferredRemoteSectionRender('audience', ()=>renderAudience(), 70)){
      runSectionRenderSafely('audience', ()=>renderAudience(), { delayMs: 70 });
    }
    markRemoteSyncSectionsRendered(['audience']);
  }
  if(shouldRender('diligence')){
    if(!queueDeferredRemoteSectionRender('diligence', ()=>renderDiligence(), 70)){
      runSectionRenderSafely('diligence', ()=>renderDiligence(), { delayMs: 70 });
    }
    markRemoteSyncSectionsRendered(['diligence']);
  }
  if(shouldRender('salle')){
    if(!queueDeferredRemoteSectionRender('salle', ()=>renderSalle(), 80)){
      runSectionRenderSafely('salle', ()=>renderSalle(), { delayMs: 80 });
    }
    markRemoteSyncSectionsRendered(['salle']);
  }
  if(shouldRender('equipe')) runSectionRenderSafely('equipe', ()=>renderEquipe(), { delayMs: 80 });
  if(shouldRender('recycle')) runSectionRenderSafely('recycle', ()=>renderRecycleBin(), { delayMs: 80 });
  if(shouldRender('creation')) updateClientDropdown();
}

function flushRemoteSyncRenderQueue(){
  remoteSyncRenderTimer = null;
  if(!(remoteSyncRenderSections instanceof Set) || !remoteSyncRenderSections.size) return;
  const blocker = getRemoteRefreshBlocker();
  if(blocker){
    remoteSyncRenderTimer = setTimeout(flushRemoteSyncRenderQueue, REMOTE_SYNC_RENDER_BLOCKED_RETRY_MS);
    return;
  }
  const sections = [...remoteSyncRenderSections];
  remoteSyncRenderSections = new Set();
  refreshVisibleSectionsAfterRemoteSync(sections);
}

function queueRemoteSyncRender(sectionKeys = [], options = {}){
  const keys = Array.isArray(sectionKeys) ? sectionKeys : [];
  keys.forEach((key)=>{
    const safeKey = String(key || '').trim();
    if(safeKey) remoteSyncRenderSections.add(safeKey);
  });
  if(!remoteSyncRenderSections.size) return;
  const cooldownDelay = getRemoteSyncRenderCooldownDelay(remoteSyncRenderSections, options);
  const baseDelay = Math.max(Number(options.delayMs) || REMOTE_SYNC_RENDER_DEBOUNCE_MS, cooldownDelay);
  const delayMs = getAdaptiveUiBatchDelay(baseDelay, {
    ultraLargeDatasetExtraMs: 1800,
    largeDatasetExtraMs: 260,
    busyExtraMs: 420,
    importExtraMs: 420
  });
  if(remoteSyncRenderTimer) clearTimeout(remoteSyncRenderTimer);
  remoteSyncRenderTimer = setTimeout(flushRemoteSyncRenderQueue, delayMs);
}

function flushLinkedSectionRenderQueue(){
  linkedSectionRenderTimer = null;
  if(!(linkedSectionRenderKeys instanceof Set) || !linkedSectionRenderKeys.size) return;
  if(importInProgress || heavyUiOperationCount > 0){
    linkedSectionRenderTimer = setTimeout(flushLinkedSectionRenderQueue, LINKED_SECTION_RENDER_DEBOUNCE_MS);
    return;
  }
  const sectionKeys = [...linkedSectionRenderKeys];
  const keepAudiencePosition = linkedSectionRenderKeepAudiencePosition;
  linkedSectionRenderKeys = new Set();
  linkedSectionRenderKeepAudiencePosition = false;
  const shouldRender = (key)=>sectionKeys.includes(key);
  if(shouldRender('dashboard')){
    if(isDeferredRenderSectionVisible('dashboard')){
      runSectionRenderSafely('dashboard', ()=>renderDashboard(), { delayMs: 50 });
    }else{
      markDeferredRenderDirty('dashboard');
    }
  }
  if(shouldRender('audience')){
    if(isDeferredRenderSectionVisible('audience')){
      if(keepAudiencePosition){
        runSectionRenderSafely('audience', ()=>renderAudienceKeepingPosition(), { delayMs: 70 });
      }else{
        runSectionRenderSafely('audience', ()=>renderAudience(), { delayMs: 70 });
      }
    }else{
      markDeferredRenderDirty('audience');
    }
  }
  if(shouldRender('suivi')){
    if(isDeferredRenderSectionVisible('suivi')){
      runSectionRenderSafely('suivi', ()=>renderSuivi(), { delayMs: 70 });
    }else{
      markDeferredRenderDirty('suivi');
    }
  }
  if(shouldRender('salleSidebar')){
    if(isDeferredRenderSectionVisible('salle')){
      queueSidebarSalleSessionsRender(0);
    }
  }
}

function queueLinkedSectionRender(sectionKeys = [], options = {}){
  const keys = Array.isArray(sectionKeys) ? sectionKeys : [];
  keys.forEach((key)=>{
    const safeKey = String(key || '').trim();
    if(safeKey) linkedSectionRenderKeys.add(safeKey);
  });
  if(!linkedSectionRenderKeys.size) return;
  if(options.keepAudiencePosition === true){
    linkedSectionRenderKeepAudiencePosition = true;
  }
  const delayMs = getAdaptiveUiBatchDelay(Number(options.delayMs) || LINKED_SECTION_RENDER_DEBOUNCE_MS, {
    ultraLargeDatasetExtraMs: 780,
    largeDatasetExtraMs: 160,
    busyExtraMs: 260,
    importExtraMs: 360
  });
  if(linkedSectionRenderTimer) clearTimeout(linkedSectionRenderTimer);
  linkedSectionRenderTimer = setTimeout(flushLinkedSectionRenderQueue, delayMs);
}

function getDossierClotureContribution(dossier){
  return isDossierClosedStatus(dossier) ? 1 : 0;
}

function detectCanonicalDossierStatus(value){
  const raw = String(value || '').trim();
  const loose = normalizeLooseText(raw).toLowerCase();
  if(!loose) return null;
  const statusMatchers = [
    {
      statut: 'Arrêt définitif',
      prefixes: [
        'arrêt definitif',
        'arret definitif',
        'arrêt definitive',
        'arret definitive',
        'arrêt defenif',
        'arret defenif',
        'arrêt defenitive',
        'arret defenitive',
        'arrêt defentif',
        'arret defentif',
        'arrêt defentive',
        'arret defentive',
        'arrêt',
        'arret'
      ]
    },
    { statut: 'Suspension', prefixes: ['suspension'] },
    { statut: 'Clôture', prefixes: ['clôture', 'cloture'] },
    { statut: 'Soldé', prefixes: ['soldé', 'solde'] },
    { statut: 'En cours', prefixes: ['en cours'] }
  ];
  for(const matcher of statusMatchers){
    const exactPrefix = matcher.prefixes.find(prefix=>loose === prefix);
    if(exactPrefix){
      return { statut: matcher.statut, matchType: 'exact' };
    }
    const prefixedMatch = matcher.prefixes.find(prefix=>loose.startsWith(prefix));
    if(prefixedMatch){
      return { statut: matcher.statut, matchType: 'prefixed' };
    }
  }
  return null;
}

function getDossierDisplayStatusSnapshot(dossier){
  const currentStatus = String(dossier?.statut || '').trim();
  const currentDetail = String(dossier?.statutDetails || '').trim();
  const detectedStatus = detectCanonicalDossierStatus(currentStatus);
  if(detectedStatus && detectedStatus.statut !== 'En cours'){
    return {
      statut: detectedStatus.statut,
      detail: detectedStatus.matchType === 'exact' ? currentDetail : (currentDetail || currentStatus)
    };
  }
  const detectedDetail = detectCanonicalDossierStatus(currentDetail);
  if(detectedDetail && detectedDetail.statut !== 'En cours'){
    return {
      statut: detectedDetail.statut,
      detail: currentDetail
    };
  }
  if(detectedStatus){
    return {
      statut: detectedStatus.statut,
      detail: detectedStatus.matchType === 'exact' ? currentDetail : (currentDetail || currentStatus)
    };
  }
  return {
    statut: currentStatus || 'En cours',
    detail: currentDetail
  };
}

function getDossierNormalizedStatusKey(dossier){
  return normalizeLooseText(getDossierDisplayStatusSnapshot(dossier)?.statut || '').toLowerCase();
}

function isDossierClosedStatus(dossier){
  const statusKey = getDossierNormalizedStatusKey(dossier);
  if(!statusKey) return false;
  return (
    statusKey.startsWith('cloture')
    || statusKey.startsWith('solde')
    || statusKey.startsWith('arret definitif')
    || statusKey.startsWith('arret defenif')
    || statusKey.startsWith('arret defenitive')
  );
}

function matchesSuiviStatusFilter(dossier, statusFilter = filterSuiviStatus){
  const mode = String(statusFilter || 'all').trim();
  if(mode === 'closed') return isDossierClosedStatus(dossier);
  if(mode === 'open') return !isDossierClosedStatus(dossier);
  return true;
}

function getDossierCreatedAtSortValue(dossier){
  const raw = String(dossier?.createdAt || '').trim();
  if(!raw) return 0;
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? ts : 0;
}

function applyIncrementalRemoteDossierCaches(meta){
  if(!meta) return;
  const userKey = getCurrentClientAccessCacheKey();

  if(
    clientListSummaryCache
    && clientListSummaryCacheVersion === dossierDataVersion
    && clientListSummaryCacheUserKey === userKey
  ){
    const adjustSummary = (clientId, delta, clotureDelta = 0)=>{
      if(!delta && !clotureDelta) return;
      const entry = clientListSummaryCache.find(item=>Number(item?.id) === Number(clientId));
      if(!entry) return;
      if(delta){
        entry.dossierCount = Math.max(0, Number(entry.dossierCount || 0) + delta);
      }
      if(clotureDelta){
        entry.clotureCount = Math.max(0, Number(entry.clotureCount || 0) + clotureDelta);
      }
    };
    if(meta.action === 'create'){
      if(meta.targetVisible){
        adjustSummary(
          meta.targetClientId,
          1,
          getDossierClotureContribution(meta.nextDossier)
        );
      }
    }else if(meta.action === 'delete'){
      if(meta.sourceVisible){
        adjustSummary(
          meta.sourceClientId,
          -1,
          -getDossierClotureContribution(meta.previousDossier)
        );
      }
    }else if(meta.action === 'update' && meta.sourceClientId !== meta.targetClientId){
      if(meta.sourceVisible){
        adjustSummary(
          meta.sourceClientId,
          -1,
          -getDossierClotureContribution(meta.previousDossier)
        );
      }
      if(meta.targetVisible){
        adjustSummary(
          meta.targetClientId,
          1,
          getDossierClotureContribution(meta.nextDossier)
        );
      }
    }else if(meta.action === 'update' && meta.targetVisible){
      adjustSummary(
        meta.targetClientId,
        0,
        getDossierClotureContribution(meta.nextDossier) - getDossierClotureContribution(meta.previousDossier)
      );
    }
  }

  if(
    clientClotureCountCacheVersion === dossierDataVersion
    && clientClotureCountCacheUserKey === userKey
  ){
    let clotureDelta = 0;
    if(meta.action === 'create'){
      if(meta.targetVisible){
        clotureDelta += getDossierClotureContribution(meta.nextDossier);
      }
    }else if(meta.action === 'delete'){
      if(meta.sourceVisible){
        clotureDelta -= getDossierClotureContribution(meta.previousDossier);
      }
    }else if(meta.action === 'update' && meta.sourceClientId !== meta.targetClientId){
      if(meta.sourceVisible){
        clotureDelta -= getDossierClotureContribution(meta.previousDossier);
      }
      if(meta.targetVisible){
        clotureDelta += getDossierClotureContribution(meta.nextDossier);
      }
    }else if(meta.action === 'update' && meta.targetVisible){
      clotureDelta += getDossierClotureContribution(meta.nextDossier) - getDossierClotureContribution(meta.previousDossier);
    }
    if(clotureDelta){
      clientClotureCountCacheValue = Math.max(0, Number(clientClotureCountCacheValue || 0) + clotureDelta);
    }
  }

  if(
    dashboardSnapshotCache
    && dashboardSnapshotCacheVersion === dossierDataVersion
    && dashboardSnapshotCacheUserKey === userKey
  ){
    let enCoursDelta = 0;
    let clotureDelta = 0;
    if(meta.action === 'create'){
      if(meta.targetVisible){
        enCoursDelta += 1;
        clotureDelta += getDossierClotureContribution(meta.nextDossier);
      }
    }else if(meta.action === 'delete'){
      if(meta.sourceVisible){
        enCoursDelta -= 1;
        clotureDelta -= getDossierClotureContribution(meta.previousDossier);
      }
    }else if(meta.action === 'update'){
      if(meta.sourceClientId !== meta.targetClientId){
        if(meta.sourceVisible){
          enCoursDelta -= 1;
          clotureDelta -= getDossierClotureContribution(meta.previousDossier);
        }
        if(meta.targetVisible){
          enCoursDelta += 1;
          clotureDelta += getDossierClotureContribution(meta.nextDossier);
        }
      }else if(meta.targetVisible){
        clotureDelta += getDossierClotureContribution(meta.nextDossier) - getDossierClotureContribution(meta.previousDossier);
      }
    }
    dashboardSnapshotCache = {
      ...dashboardSnapshotCache,
      enCours: Math.max(0, Number(dashboardSnapshotCache.enCours || 0) + enCoursDelta),
      clotureCount: Math.max(0, Number(dashboardSnapshotCache.clotureCount || 0) + clotureDelta)
    };
  }

  const affectedClientIds = [...new Set(
    [meta.sourceClientId, meta.targetClientId]
      .map(value=>Number(value))
      .filter(value=>Number.isFinite(value))
  )];
  if(affectedClientIds.length){
    if(
      suiviBaseRowsCache
      && suiviBaseRowsCacheVersion === dossierDataVersion - 1
      && suiviBaseRowsCacheViewerKey === userKey
    ){
      const nextRawRows = replaceRowsForClientIds(
        suiviBaseRowsCache.rawRows,
        affectedClientIds,
        (clientId)=>{
          const resolved = getClientByIdWithIndex(clientId);
          return resolved.client ? buildSuiviRowsForClient(resolved.client) : [];
        },
        row=>row?.c?.id
      );
      const hydratedBase = hydrateSuiviBaseRows(nextRawRows);
      suiviBaseRowsCache = {
        rawRows: hydratedBase.rawRows,
        rowsMeta: hydratedBase.rowsMeta,
        tribunalState: hydratedBase.tribunalState,
        sortedDefaultRows: buildSortedSuiviRows(hydratedBase.rawRows)
      };
      suiviBaseRowsCacheVersion = dossierDataVersion;
    }

    if(
      meta.audienceImpact === true
      && audienceRowsRawCache
      && audienceRowsRawCacheVersion === audienceRowsRawDataVersion - 1
      && audienceRowsRawCacheViewerKey === getAudienceViewerCacheKey()
    ){
      const closedStatusLookup = getAudienceClosedStatusLookupCached();
      const nextAudienceRows = replaceRowsForClientIds(
        audienceRowsRawCache,
        affectedClientIds,
        (clientId)=>{
          const resolved = getClientByIdWithIndex(clientId);
          if(!resolved.client || resolved.index < 0) return [];
          return buildAudienceRowsForClient(resolved.client, resolved.index, closedStatusLookup);
        },
        row=>row?.c?.id
      );
      audienceRowsRawCache = nextAudienceRows;
      audienceRowsRawCacheVersion = audienceRowsRawDataVersion;
      audienceRowsRawCacheViewerKey = getAudienceViewerCacheKey();
      audienceRowsDedupeCache = nextAudienceRows;
      audienceRowsDedupeCacheVersion = audienceRowsRawDataVersion;
      audienceRowsDedupeCacheViewerKey = audienceRowsRawCacheViewerKey;
    }
  }
}

function normalizeRemoteSyncSectionList(sectionKeys = [], options = {}){
  const next = new Set();
  (Array.isArray(sectionKeys) ? sectionKeys : []).forEach((key)=>{
    const safeKey = String(key || '').trim();
    if(safeKey) next.add(safeKey);
  });
  if(options.includeAudience === true){
    next.add('audience');
    next.add('salle');
  }
  return [...next];
}

function buildDiligenceRelevantProcedureDetailsSnapshot(dossier){
  const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
    ? dossier.procedureDetails
    : {};
  const procedureNames = new Set([
    ...normalizeProcedures(dossier),
    ...Object.keys(details)
  ]);
  const snapshot = {};
  procedureNames.forEach((procName)=>{
    const baseProc = getDiligenceProcedureFilterValue(procName);
    if(
      baseProc !== 'ASS'
      && baseProc !== 'SFDC'
      && baseProc !== 'S/bien'
      && baseProc !== 'Injonction'
      && baseProc !== 'Commandement'
    ){
      return;
    }
    const procDetails = details?.[procName];
    snapshot[procName] = procDetails && typeof procDetails === 'object'
      ? procDetails
      : {};
  });
  return snapshot;
}

function buildDiligenceRelevantDossierSignature(dossier){
  if(!dossier || typeof dossier !== 'object') return '';
  try{
    return JSON.stringify({
      referenceClient: String(dossier?.referenceClient || '').trim(),
      debiteur: String(dossier?.debiteur || '').trim(),
      ville: String(dossier?.ville || '').trim(),
      procedureDetails: buildDiligenceRelevantProcedureDetailsSnapshot(dossier)
    });
  }catch(_){
    return '';
  }
}

function remoteDossierPatchAffectsDiligence(previousDossier, nextDossier){
  return buildDiligenceRelevantDossierSignature(previousDossier) !== buildDiligenceRelevantDossierSignature(nextDossier);
}

function buildRemoteDossierRefreshOptions(meta){
  const patchMeta = meta && typeof meta === 'object' ? meta : {};
  const action = String(patchMeta.action || '').trim().toLowerCase();
  const sections = new Set();
  const secondarySections = new Set();
  if(patchMeta.audienceImpact === true){
    sections.add('suivi');
    sections.add('audience');
    secondarySections.add('diligence');
    secondarySections.add('salle');
  }else{
    sections.add('suivi');
    const sourceClientId = Number(patchMeta.sourceClientId);
    const targetClientId = Number(patchMeta.targetClientId);
    const movedAcrossClients =
      Number.isFinite(sourceClientId)
      && Number.isFinite(targetClientId)
      && sourceClientId !== targetClientId;
    const shouldRefreshDiligence = action !== 'update'
      || movedAcrossClients
      || remoteDossierPatchAffectsDiligence(patchMeta.previousDossier, patchMeta.nextDossier);
    if(shouldRefreshDiligence){
      secondarySections.add('diligence');
    }
  }

  const sourceClientId = Number(patchMeta.sourceClientId);
  const targetClientId = Number(patchMeta.targetClientId);
  const movedAcrossClients =
    Number.isFinite(sourceClientId)
    && Number.isFinite(targetClientId)
    && sourceClientId !== targetClientId;

  const shouldRefreshCounts = action === 'create' || action === 'delete' || movedAcrossClients;
  const isInPlaceUpdate = action === 'update' && !movedAcrossClients;
  if(shouldRefreshCounts){
    secondarySections.add('dashboard');
    secondarySections.add('clients');
  }

  return {
    livePatch: true,
    audience: patchMeta.audienceImpact === true,
    incrementalPatch: patchMeta.patchCount ? null : patchMeta,
    preserveDashboardAudienceMetrics: isInPlaceUpdate,
    preserveKnownJudgesCache: isInPlaceUpdate,
    sections: [...sections],
    secondarySections: [...secondarySections]
  };
}

function getRemoteSliceRefreshOptions(patchKind){
  const kind = String(patchKind || '').trim().toLowerCase();
  if(kind === 'clients'){
    return {
      audience: true,
      sections: ['dashboard', 'clients', 'creation', 'suivi', 'audience', 'diligence', 'salle', 'equipe', 'recycle']
    };
  }
  if(kind === 'users'){
    return {
      audience: false,
      sections: ['equipe']
    };
  }
  if(kind === 'salle-assignments'){
    return {
      audience: false,
      sections: ['salle']
    };
  }
  if(kind === 'audience-draft'){
    return {
      audience: true,
      sections: ['audience', 'salle']
    };
  }
  return {
    audience: false,
    sections: ['suivi', 'diligence']
  };
}

function normalizeDossierPatchReference(value){
  return String(value || '').trim().toLowerCase();
}

function resolveRemoteDossierPatchReference(patch, dossier){
  const direct = normalizeDossierPatchReference(patch?.referenceClient);
  if(direct) return direct;
  return normalizeDossierPatchReference(dossier?.referenceClient);
}

function findLocalDossierIndexForPatch(dossiers, requestedIndex, referenceClient){
  const list = Array.isArray(dossiers) ? dossiers : [];
  const normalizedReference = normalizeDossierPatchReference(referenceClient);
  if(Number.isFinite(requestedIndex) && requestedIndex >= 0 && requestedIndex < list.length){
    const indexed = list[requestedIndex];
    if(!normalizedReference || normalizeDossierPatchReference(indexed?.referenceClient) === normalizedReference){
      return requestedIndex;
    }
  }
  if(!normalizedReference) return requestedIndex;
  return list.findIndex(entry=>normalizeDossierPatchReference(entry?.referenceClient) === normalizedReference);
}

function applyRemoteDossierPatchLocally(patch){
  if(!patch || typeof patch !== 'object') return false;
  const action = String(patch.action || '').trim().toLowerCase();
  const clientId = Number(patch.clientId);
  const dossierIndex = Number(patch.dossierIndex);
  const targetClientId = Number(patch.targetClientId);
  const dossier = patch.dossier && typeof patch.dossier === 'object'
    ? JSON.parse(JSON.stringify(patch.dossier))
    : null;
  const referenceClient = resolveRemoteDossierPatchReference(patch, dossier);
  const findClientIndex = (id)=>AppState.clients.findIndex(client=>Number(client?.id) === Number(id));

    if(action === 'create'){
      const clientIdx = findClientIndex(clientId);
      if(clientIdx === -1 || !dossier) return false;
      if(!Array.isArray(AppState.clients[clientIdx].dossiers)) AppState.clients[clientIdx].dossiers = [];
      AppState.clients[clientIdx].dossiers.unshift(dossier);
      const targetClient = AppState.clients[clientIdx];
      return {
      action,
      sourceClientId: clientId,
      targetClientId: clientId,
      previousDossier: null,
      nextDossier: dossier,
      sourceVisible: canViewClient(targetClient),
      targetVisible: canViewClient(targetClient),
      audienceImpact: dossierHasAudienceImpact(dossier)
    };
  }

  if(action === 'delete'){
    const clientIdx = findClientIndex(clientId);
    if(clientIdx === -1 || !Number.isFinite(dossierIndex)) return false;
    if(!Array.isArray(AppState.clients[clientIdx].dossiers)) AppState.clients[clientIdx].dossiers = [];
    const resolvedIndex = findLocalDossierIndexForPatch(
      AppState.clients[clientIdx].dossiers,
      dossierIndex,
      referenceClient
    );
    if(resolvedIndex < 0 || resolvedIndex >= AppState.clients[clientIdx].dossiers.length) return false;
    const previousDossier = AppState.clients[clientIdx].dossiers[resolvedIndex];
    const sourceClient = AppState.clients[clientIdx];
    AppState.clients[clientIdx].dossiers.splice(resolvedIndex, 1);
    return {
      action,
      sourceClientId: clientId,
      targetClientId: clientId,
      previousDossier,
      nextDossier: null,
      sourceVisible: canViewClient(sourceClient),
      targetVisible: canViewClient(sourceClient),
      audienceImpact: dossierHasAudienceImpact(previousDossier)
    };
  }

  if(action === 'update'){
    const sourceClientIdx = findClientIndex(clientId);
    if(sourceClientIdx === -1 || !Number.isFinite(dossierIndex) || !dossier) return false;
    if(!Array.isArray(AppState.clients[sourceClientIdx].dossiers)) AppState.clients[sourceClientIdx].dossiers = [];
    const resolvedIndex = findLocalDossierIndexForPatch(
      AppState.clients[sourceClientIdx].dossiers,
      dossierIndex,
      referenceClient
    );
    if(resolvedIndex < 0 || resolvedIndex >= AppState.clients[sourceClientIdx].dossiers.length) return false;
    const previousDossier = AppState.clients[sourceClientIdx].dossiers[resolvedIndex];
    const nextTargetClientId = Number.isFinite(targetClientId) ? targetClientId : clientId;
    const targetClientIdx = findClientIndex(nextTargetClientId);
    if(targetClientIdx === -1) return false;
    if(!Array.isArray(AppState.clients[targetClientIdx].dossiers)) AppState.clients[targetClientIdx].dossiers = [];
    const sourceClient = AppState.clients[sourceClientIdx];
    const targetClient = AppState.clients[targetClientIdx];
    if(targetClientIdx === sourceClientIdx){
      AppState.clients[sourceClientIdx].dossiers[resolvedIndex] = dossier;
      return {
        action,
        sourceClientId: clientId,
        targetClientId: nextTargetClientId,
        previousDossier,
        nextDossier: dossier,
        sourceVisible: canViewClient(sourceClient),
        targetVisible: canViewClient(targetClient),
        audienceImpact: dossierHasAudienceImpact(previousDossier) || dossierHasAudienceImpact(dossier)
      };
    }
    AppState.clients[sourceClientIdx].dossiers.splice(resolvedIndex, 1);
    AppState.clients[targetClientIdx].dossiers.push(dossier);
    return {
      action,
      sourceClientId: clientId,
      targetClientId: nextTargetClientId,
      previousDossier,
      nextDossier: dossier,
      sourceVisible: canViewClient(sourceClient),
      targetVisible: canViewClient(targetClient),
      audienceImpact: dossierHasAudienceImpact(previousDossier) || dossierHasAudienceImpact(dossier)
    };
  }

  return false;
}

function applyRemoteDossierPatchBatchLocally(patches){
  const list = Array.isArray(patches) ? patches : [];
  if(!list.length) return false;
  let audienceImpact = false;
  for(const patch of list){
    const applied = applyRemoteDossierPatchLocally(patch);
    if(!applied) return false;
    if(applied.audienceImpact === true) audienceImpact = true;
  }
  return {
    action: 'batch',
    patchCount: list.length,
    audienceImpact
  };
}

function applyRemoteSlicePatchLocally(patchKind, patch){
  if(!patch || typeof patch !== 'object') return false;
  if(patchKind === 'clients'){
    const action = String(patch.action || '').trim().toLowerCase();
    if(action === 'create'){
      const incomingClient = normalizeClient(patch.client);
      if(!incomingClient) return false;
      const existingIdx = AppState.clients.findIndex(client=>Number(client?.id) === Number(incomingClient.id));
      if(existingIdx !== -1){
        AppState.clients[existingIdx] = incomingClient;
      }else{
        AppState.clients.push(incomingClient);
      }
      if(Array.isArray(patch.users)){
        USERS = ensureManagerUser(
          patch.users.map(normalizeUser).filter(Boolean)
        );
      }
      return true;
    }
    if(action === 'delete'){
      const removedClientId = Number(patch.clientId);
      if(Number.isFinite(removedClientId)){
        AppState.clients = AppState.clients.filter(client=>Number(client?.id) !== removedClientId);
      }
      if(Array.isArray(patch.users)){
        USERS = ensureManagerUser(
          patch.users.map(normalizeUser).filter(Boolean)
        );
      }
      syncImportHistoryWithCurrentState();
      return true;
    }
    if(action === 'delete-all'){
      AppState.clients = [];
      AppState.importHistory = [];
      audienceDraft = {};
      audiencePrintSelection = new Set();
      diligencePrintSelection = new Set();
      if(Array.isArray(patch.users)){
        USERS = ensureManagerUser(
          patch.users.map(normalizeUser).filter(Boolean)
        );
      }
      return true;
    }
    return false;
  }
  if(patchKind === 'users'){
    const nextUsers = Array.isArray(patch.users)
      ? patch.users.map(normalizeUser).filter(Boolean)
      : null;
    if(!nextUsers) return false;
    USERS = ensureManagerUser(nextUsers);
    return true;
  }
  if(patchKind === 'salle-assignments'){
    AppState.salleAssignments = normalizeSalleAssignments(patch.salleAssignments);
    invalidateSalleAssignmentsCaches();
    return true;
  }
  if(patchKind === 'audience-draft'){
    audienceDraft = patch.audienceDraft && typeof patch.audienceDraft === 'object'
      ? patch.audienceDraft
      : {};
    return true;
  }
  return false;
}

function finalizeRemoteStateUpdateLocally(options = {}){
  const incrementalPatch = options.incrementalPatch && typeof options.incrementalPatch === 'object'
    ? options.incrementalPatch
    : null;
  const hasAudienceImpact = options.audience === true;
  const useIncrementalCaches = !!incrementalPatch;
  const preserveDashboardAudienceMetrics = options.preserveDashboardAudienceMetrics === true;
  const preserveKnownJudgesCache = options.preserveKnownJudgesCache === true;
  const refreshSections = normalizeRemoteSyncSectionList(options.sections, {
    includeAudience: hasAudienceImpact
  });
  const secondaryRefreshSections = normalizeRemoteSyncSectionList(options.secondarySections, {
    includeAudience: false
  }).filter(section=>!refreshSections.includes(section));
  if(options.livePatch === true && hasAudienceImpact && isVeryLargeLiveSyncMode()){
    if(refreshSections.includes('dashboard') || secondaryRefreshSections.includes('dashboard')){
      remoteDashboardLightRefreshPending = true;
    }
    const salleIndex = refreshSections.indexOf('salle');
    if(salleIndex !== -1){
      refreshSections.splice(salleIndex, 1);
      if(!secondaryRefreshSections.includes('salle')){
        secondaryRefreshSections.push('salle');
      }
    }
    for(let index = secondaryRefreshSections.length - 1; index >= 0; index -= 1){
      if(secondaryRefreshSections[index] === 'salle'){
        if(!isDeferredRenderSectionVisible('salle')){
          secondaryRefreshSections.splice(index, 1);
        }
      }
    }
  }
  handleDossierDataChange({
    audience: hasAudienceImpact,
    preserveBaseRowCaches: useIncrementalCaches,
    preserveClientAccessCaches: useIncrementalCaches,
    preserveClientListSummary: useIncrementalCaches,
    preserveDashboardSnapshot: useIncrementalCaches,
    preserveDashboardAudienceMetrics: useIncrementalCaches && preserveDashboardAudienceMetrics,
    preserveKnownJudgesCache: useIncrementalCaches && preserveKnownJudgesCache
  });
  if(useIncrementalCaches){
    applyIncrementalRemoteDossierCaches(incrementalPatch);
  }
  // Avoid expensive full-state signature recomputation on every live patch.
  // A later full reload can rebuild the signature if needed.
  lastPersistedStateSignature = '';
  lastRemoteStateLoadVersion = remoteStateVersion;
  lastRemoteStateLoadUpdatedAt = remoteStateUpdatedAt;
  syncCurrentUserFromUsers();
  const shouldRefreshClientDropdown = options.refreshClientDropdown === true || refreshSections.includes('clients') || secondaryRefreshSections.includes('clients');
  if(shouldRefreshClientDropdown){
    markDeferredRenderDirty(...refreshSections, ...secondaryRefreshSections, 'clientDropdown');
  }else{
    markDeferredRenderDirty(...refreshSections, ...secondaryRefreshSections);
  }
  queueRemoteSyncRender(refreshSections, { livePatch: options.livePatch === true });
  if(secondaryRefreshSections.length){
    queueRemoteSyncRender(secondaryRefreshSections, {
      livePatch: options.livePatch === true,
      delayMs: getAdaptiveUiBatchDelay(250, {
        largeDatasetExtraMs: 450,
        busyExtraMs: 650,
        importExtraMs: 900
      })
    });
  }
}

function setSyncStatus(status, message){
  const badge = $('syncStatusBadge');
  const text = $('syncStatusText');
  if(!badge || !text) return;
  badge.classList.remove('is-ok', 'is-error', 'is-syncing', 'is-pending', 'is-conflict');
  
  let next = ['ok', 'error', 'syncing', 'pending', 'conflict'].includes(status) ? status : 'pending';
  
  // Si on est en mode local seulement, on ne veut pas effrayer l'utilisateur avec
  // des messages de "Synchronisation serveur" qui n'auront pas lieu immédiatement.
  const isLocal = LOCAL_ONLY_MODE || !remoteServerReachable;

  if(isLocal && next === 'syncing'){
    next = 'ok';
  }

  badge.classList.add(`is-${next}`);
  
  const fallbackText = {
    pending: 'Modification détectée...',
    syncing: 'Synchronisation serveur...',
    ok: isLocal ? 'Mode local (actif)' : 'Connecté au serveur (actif)',
    error: 'Serveur indisponible (local)',
    conflict: 'Conflit détecté, rechargement...'
  };
  
  const displayMessage = message || fallbackText[next];
  text.innerText = String(displayMessage);
}

function formatSyncMetricMs(value){
  const num = Number(value);
  if(!Number.isFinite(num) || num < 0) return '--';
  return `${Math.round(num)}ms`;
}

function renderSyncMetrics(){
  const pingNode = $('syncPingMetric');
  const liveNode = $('syncLiveMetric');
  if(pingNode) pingNode.innerText = `Ping: ${formatSyncMetricMs(lastPingMs)}`;
  if(liveNode) liveNode.innerText = `Live: ${formatSyncMetricMs(lastLiveDelayMs)}`;
}

function queueSyncMetricsRender(){
  if(syncMetricsRenderQueued) return;
  syncMetricsRenderQueued = true;
  const render = ()=>{
    syncMetricsRenderQueued = false;
    renderSyncMetrics();
  };
  if(typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'){
    window.requestAnimationFrame(render);
    return;
  }
  setTimeout(render, 0);
}

function setPingMetric(value){
  lastPingMs = Number.isFinite(Number(value)) ? Number(value) : null;
  queueSyncMetricsRender();
}

function setLiveDelayMetricFromIso(updatedAtIso){
  const ts = Date.parse(String(updatedAtIso || ''));
  if(!Number.isFinite(ts)){
    lastLiveDelayMs = null;
  }else{
    lastLiveDelayMs = Math.max(0, Date.now() - ts);
  }
  queueSyncMetricsRender();
}

function debounce(fn, wait = 120){
  let timer = null;
  return (...args)=>{
    if(timer) clearTimeout(timer);
    timer = setTimeout(()=>{
      timer = null;
      fn(...args);
    }, wait);
  };
}

function setElementTextIfChanged(el, text){
  if(!el) return false;
  const nextText = String(text ?? '');
  if(el.textContent === nextText) return false;
  el.textContent = nextText;
  return true;
}

function setElementHtmlWithRenderKey(el, html, renderKey, options = {}){
  if(!el) return false;
  const nextHtml = String(html ?? '');
  const nextKey = String(renderKey ?? '');
  const trustRenderKey = options?.trustRenderKey === true;
  if(el.dataset.renderKey === nextKey){
    if(trustRenderKey) return false;
    if(el.innerHTML === nextHtml) return false;
  }
  el.innerHTML = nextHtml;
  el.dataset.renderKey = nextKey;
  return true;
}

function setCappedMapEntry(map, key, value, maxEntries){
  if(!(map instanceof Map)) return;
  const limit = Math.max(1, Number(maxEntries) || 1);
  if(map.has(key)) map.delete(key);
  map.set(key, value);
  while(map.size > limit){
    const oldestKey = map.keys().next().value;
    if(oldestKey === undefined) break;
    map.delete(oldestKey);
  }
}

function buildTableMessageRowHtml(colSpan, message, className = 'diligence-empty'){
  const safeColSpan = Math.max(1, Number(colSpan) || 1);
  return `<tr><td colspan="${safeColSpan}" class="${escapeAttr(className)}">${escapeHtml(String(message ?? ''))}</td></tr>`;
}

function renderTableMessage(el, colSpan, message, renderKey, className = 'diligence-empty'){
  return setElementHtmlWithRenderKey(
    el,
    buildTableMessageRowHtml(colSpan, message, className),
    renderKey,
    { trustRenderKey: true }
  );
}

function getClientFilterWorker(){
  if(clientFilterWorkerFailed) return null;
  if(clientFilterWorker) return clientFilterWorker;
  if(typeof Worker === 'undefined') return null;
  try{
    clientFilterWorker = new Worker(CLIENT_FILTER_WORKER_URL);
    return clientFilterWorker;
  }catch(err){
    console.warn('Client filter worker indisponible', err);
    clientFilterWorkerFailed = true;
    return null;
  }
}

function runClientFilterInWorker(items, query, requestId){
  const worker = getClientFilterWorker();
  if(!worker){
    return Promise.resolve(null);
  }
  return new Promise((resolve)=>{
    const handleMessage = (event)=>{
      const data = event?.data || {};
      if(String(data.type || '') !== 'client-filter-result') return;
      if(Number(data.requestId) !== Number(requestId)) return;
      cleanup();
      resolve(Array.isArray(data.filteredIndexes) ? data.filteredIndexes : null);
    };
    const handleError = (err)=>{
      console.warn('Client filter worker error', err);
      cleanup();
      clientFilterWorkerFailed = true;
      if(clientFilterWorker){
        try{ clientFilterWorker.terminate(); }catch(_){}
      }
      clientFilterWorker = null;
      resolve(null);
    };
    const cleanup = ()=>{
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
    };
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage({
      type: 'client-filter',
      requestId,
      query: String(query || ''),
      items
    });
  });
}

function getAudienceFilterWorker(){
  if(audienceFilterWorkerFailed) return null;
  if(audienceFilterWorker) return audienceFilterWorker;
  if(typeof Worker === 'undefined') return null;
  try{
    audienceFilterWorker = new Worker(AUDIENCE_FILTER_WORKER_URL);
    return audienceFilterWorker;
  }catch(err){
    console.warn('Audience filter worker indisponible', err);
    audienceFilterWorkerFailed = true;
    return null;
  }
}

function runAudienceFilterInWorker(items, query, requestId){
  const worker = getAudienceFilterWorker();
  if(!worker){
    return Promise.resolve(null);
  }
  return new Promise((resolve)=>{
    const handleMessage = (event)=>{
      const data = event?.data || {};
      if(String(data.type || '') !== 'audience-filter-result') return;
      if(Number(data.requestId) !== Number(requestId)) return;
      cleanup();
      resolve(Array.isArray(data.filteredIndexes) ? data.filteredIndexes : null);
    };
    const handleError = (err)=>{
      console.warn('Audience filter worker error', err);
      cleanup();
      audienceFilterWorkerFailed = true;
      if(audienceFilterWorker){
        try{ audienceFilterWorker.terminate(); }catch(_){}
      }
      audienceFilterWorker = null;
      resolve(null);
    };
    const cleanup = ()=>{
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
    };
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage({
      type: 'audience-filter',
      requestId,
      query: String(query || ''),
      items
    });
  });
}

function getSuiviFilterWorker(){
  if(suiviFilterWorkerFailed) return null;
  if(suiviFilterWorker) return suiviFilterWorker;
  if(typeof Worker === 'undefined') return null;
  try{
    suiviFilterWorker = new Worker(SUIVI_FILTER_WORKER_URL);
    return suiviFilterWorker;
  }catch(err){
    console.warn('Suivi filter worker indisponible', err);
    suiviFilterWorkerFailed = true;
    return null;
  }
}

function runSuiviFilterInWorker(items, query, requestId){
  const worker = getSuiviFilterWorker();
  if(!worker){
    return Promise.resolve(null);
  }
  return new Promise((resolve)=>{
    const handleMessage = (event)=>{
      const data = event?.data || {};
      if(String(data.type || '') !== 'suivi-filter-result') return;
      if(Number(data.requestId) !== Number(requestId)) return;
      cleanup();
      resolve(Array.isArray(data.filteredIndexes) ? data.filteredIndexes : null);
    };
    const handleError = (err)=>{
      console.warn('Suivi filter worker error', err);
      cleanup();
      suiviFilterWorkerFailed = true;
      if(suiviFilterWorker){
        try{ suiviFilterWorker.terminate(); }catch(_){}
      }
      suiviFilterWorker = null;
      resolve(null);
    };
    const cleanup = ()=>{
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
    };
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage({
      type: 'suivi-filter',
      requestId,
      query: String(query || ''),
      items
    });
  });
}

function getDiligenceFilterWorker(){
  if(diligenceFilterWorkerFailed) return null;
  if(diligenceFilterWorker) return diligenceFilterWorker;
  if(typeof Worker === 'undefined') return null;
  try{
    diligenceFilterWorker = new Worker(DILIGENCE_FILTER_WORKER_URL);
    return diligenceFilterWorker;
  }catch(err){
    console.warn('Diligence filter worker indisponible', err);
    diligenceFilterWorkerFailed = true;
    return null;
  }
}

function runDiligenceFilterInWorker(items, query, requestId, options = {}){
  const worker = getDiligenceFilterWorker();
  if(!worker){
    return Promise.resolve(null);
  }
  return new Promise((resolve)=>{
    const handleMessage = (event)=>{
      const data = event?.data || {};
      if(String(data.type || '') !== 'diligence-filter-result') return;
      if(Number(data.requestId) !== Number(requestId)) return;
      cleanup();
      resolve(Array.isArray(data.filteredIndexes) ? data.filteredIndexes : null);
    };
    const handleError = (err)=>{
      console.warn('Diligence filter worker error', err);
      cleanup();
      diligenceFilterWorkerFailed = true;
      if(diligenceFilterWorker){
        try{ diligenceFilterWorker.terminate(); }catch(_){}
      }
      diligenceFilterWorker = null;
      resolve(null);
    };
    const cleanup = ()=>{
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
    };
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage({
      type: 'diligence-filter',
      requestId,
      query: String(query || ''),
      items,
      executionOnlyQuery: options?.executionOnlyQuery === true
    });
  });
}

function getExportXlsxWorker(){
  if(exportXlsxWorkerFailed) return null;
  if(exportXlsxWorker) return exportXlsxWorker;
  if(typeof Worker === 'undefined') return null;
  try{
    exportXlsxWorker = new Worker(EXPORT_XLSX_WORKER_URL);
    return exportXlsxWorker;
  }catch(err){
    console.warn('XLSX export worker indisponible', err);
    exportXlsxWorkerFailed = true;
    return null;
  }
}

function createXlsxBlobInWorker({ headers, rows, subtitle = '', editionLabel = '', sheetName = 'Audience', colWidths = [] }){
  const worker = getExportXlsxWorker();
  if(!worker) return Promise.resolve(null);
  const requestId = ++exportXlsxWorkerRequestSeq;
  const aoa = [
    ['CABINET ARAQUI HOUSSAINI'],
    [String(editionLabel || '').trim()],
    [String(subtitle || '').trim()],
    [],
    Array.isArray(headers) ? headers : [],
    ...(Array.isArray(rows) ? rows : [])
  ];
  return new Promise((resolve)=>{
    const cleanup = ()=>{
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
    };
    const handleMessage = (event)=>{
      const data = event?.data || {};
      if(String(data.type || '') !== 'xlsx-export-result') return;
      if(Number(data.requestId) !== Number(requestId)) return;
      cleanup();
      if(data.ok !== true || !data.buffer){
        resolve(null);
        return;
      }
      resolve(new Blob(
        [data.buffer],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      ));
    };
    const handleError = (err)=>{
      console.warn('XLSX export worker error', err);
      cleanup();
      exportXlsxWorkerFailed = true;
      if(exportXlsxWorker){
        try{ exportXlsxWorker.terminate(); }catch(_){}
      }
      exportXlsxWorker = null;
      resolve(null);
    };
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage({
      type: 'xlsx-export',
      requestId,
      xlsxUrl: XLSX_LOCAL_URL,
      aoa,
      sheetName,
      colWidths
    });
  });
}

function createCsvBlobInWorker({ headers, rows, separator = ';' } = {}){
  const worker = getExportXlsxWorker();
  if(!worker) return Promise.resolve(null);
  const requestId = ++exportXlsxWorkerRequestSeq;
  return new Promise((resolve)=>{
    const cleanup = ()=>{
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
    };
    const handleMessage = (event)=>{
      const data = event?.data || {};
      if(String(data.type || '') !== 'csv-export-result') return;
      if(Number(data.requestId) !== Number(requestId)) return;
      cleanup();
      if(data.ok !== true || !data.buffer){
        resolve(null);
        return;
      }
      resolve(new Blob(
        [data.buffer],
        { type: 'text/csv;charset=utf-8;' }
      ));
    };
    const handleError = (err)=>{
      console.warn('CSV export worker error', err);
      cleanup();
      exportXlsxWorkerFailed = true;
      if(exportXlsxWorker){
        try{ exportXlsxWorker.terminate(); }catch(_){}
      }
      exportXlsxWorker = null;
      resolve(null);
    };
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage({
      type: 'csv-export',
      requestId,
      headers: Array.isArray(headers) ? headers : [],
      rows: Array.isArray(rows) ? rows : [],
      separator: String(separator || ';')
    });
  });
}

function getSalleSidebarWorker(){
  if(salleSidebarWorkerFailed) return null;
  if(salleSidebarWorker) return salleSidebarWorker;
  if(typeof Worker === 'undefined') return null;
  try{
    salleSidebarWorker = new Worker(SALLE_SIDEBAR_WORKER_URL);
    return salleSidebarWorker;
  }catch(err){
    console.warn('Salle sidebar worker indisponible', err);
    salleSidebarWorkerFailed = true;
    return null;
  }
}

function runSalleSidebarWorker(payload, requestId){
  const worker = getSalleSidebarWorker();
  if(!worker) return Promise.resolve(null);
  return new Promise((resolve)=>{
    const cleanup = ()=>{
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
    };
    const handleMessage = (event)=>{
      const data = event?.data || {};
      if(String(data.type || '') !== 'salle-sidebar-result') return;
      if(Number(data.requestId) !== Number(requestId)) return;
      cleanup();
      resolve(data.summary && typeof data.summary === 'object' ? data.summary : null);
    };
    const handleError = (err)=>{
      console.warn('Salle sidebar worker error', err);
      cleanup();
      salleSidebarWorkerFailed = true;
      if(salleSidebarWorker){
        try{ salleSidebarWorker.terminate(); }catch(_){}
      }
      salleSidebarWorker = null;
      resolve(null);
    };
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage({
      type: 'salle-sidebar-summary',
      requestId,
      payload
    });
  });
}

function captureSyncStatusSnapshot(){
  const text = $('syncStatusText');
  return {
    status: getCurrentSyncStatus(),
    message: text ? String(text.innerText || '').trim() : ''
  };
}

function restoreSyncStatusSnapshot(snapshot){
  if(!snapshot || typeof snapshot !== 'object'){
    setSyncStatus('pending');
    return;
  }
  setSyncStatus(snapshot.status, snapshot.message || undefined);
}

function openImportProgressModal(title = 'Import en cours...'){
  const modal = $('importProgressModal');
  const titleNode = $('importProgressTitle');
  const textNode = $('importProgressText');
  const fill = $('importProgressFill');
  const percentNode = $('importProgressPercent');
  if(titleNode) titleNode.innerHTML = `<i class="fa-solid fa-rotate"></i> ${escapeHtml(title)}`;
  if(textNode) textNode.innerText = 'Préparation...';
  if(fill) fill.style.width = '0%';
  const track = document.querySelector('#importProgressModal .import-progress-track');
  if(track) track.setAttribute('aria-valuenow', '0');
  if(percentNode) percentNode.innerText = '0%';
  if(modal) modal.style.display = 'flex';
}

function updateImportProgress(message, done, total){
  const textNode = $('importProgressText');
  const fill = $('importProgressFill');
  const percentNode = $('importProgressPercent');
  const safeTotal = Number(total);
  const safeDone = Number(done);
  const hasNumbers = Number.isFinite(safeTotal) && safeTotal > 0 && Number.isFinite(safeDone);
  const percent = hasNumbers ? Math.max(0, Math.min(100, Math.round((safeDone / safeTotal) * 100))) : 0;
  if(textNode){
    if(hasNumbers){
      textNode.innerText = `${String(message || 'Import en cours...')} (${safeDone}/${safeTotal})`;
    }else{
      textNode.innerText = String(message || 'Import en cours...');
    }
  }
  if(fill) fill.style.width = `${percent}%`;
  const track = document.querySelector('#importProgressModal .import-progress-track');
  if(track) track.setAttribute('aria-valuenow', String(percent));
  if(percentNode) percentNode.innerText = `${percent}%`;
}

function closeImportProgressModal(markDone = false){
  const modal = $('importProgressModal');
  if(!modal) return;
  if(markDone){
    updateImportProgress('Import terminé', 1, 1);
    modal.dataset.doneUntil = String(Date.now() + 220);
    setTimeout(()=>{
      if(modal) modal.style.display = 'none';
    }, 220);
    return;
  }
  const lockUntil = Number(modal.dataset.doneUntil || '0');
  if(Number.isFinite(lockUntil) && lockUntil > Date.now()) return;
  delete modal.dataset.doneUntil;
  modal.style.display = 'none';
}

function yieldToMainThread(){
  if(typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'){
    return new Promise(resolve=>window.requestAnimationFrame(()=>resolve()));
  }
  return new Promise(resolve=>setTimeout(resolve, 0));
}

function promiseWithTimeout(promise, timeoutMs, label = 'Operation'){
  const safeTimeoutMs = Math.max(1000, Number(timeoutMs) || 0);
  return new Promise((resolve, reject)=>{
    const timer = setTimeout(()=>{
      reject(new Error(`${label} timeout`));
    }, safeTimeoutMs);
    Promise.resolve(promise)
      .then((value)=>{
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err)=>{
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function runChunked(items, task, options = {}){
  const list = Array.isArray(items) ? items : [];
  const requestedChunkSize = Math.max(1, Number(options.chunkSize) || IMPORT_CHUNK_SIZE);
  const chunkSize = (
    list.length >= 200
      ? (isVeryLargeLiveSyncMode() ? Math.min(requestedChunkSize, 20) : (isLargeDatasetMode() ? Math.min(requestedChunkSize, 40) : requestedChunkSize))
      : requestedChunkSize
  );
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  for(let index = 0; index < list.length; index += 1){
    await task(list[index], index, list.length);
    if((index + 1) % chunkSize === 0){
      if(onProgress) onProgress(index + 1, list.length);
      await yieldToMainThread();
    }
  }
  if(onProgress) onProgress(list.length, list.length);
}

async function mapChunked(items, mapper, options = {}){
  const list = Array.isArray(items) ? items : [];
  const out = new Array(list.length);
  await runChunked(list, async (item, index, total)=>{
    out[index] = await mapper(item, index, total);
  }, options);
  return out;
}

function makeProgressReporter(prefix){
  let lastAt = 0;
  return (done, total)=>{
    const progressModal = $('importProgressModal');
    const progressVisible = !!progressModal && progressModal.style.display !== 'none';
    if(!progressVisible) return;
    const now = Date.now();
    if(done < total && now - lastAt < IMPORT_STATUS_THROTTLE_MS) return;
    lastAt = now;
    updateImportProgress(prefix, done, total);
  };
}

function shouldPreferSelectedExportCsvPath(rowCount = 0){
  const totalRows = Math.max(0, Number(rowCount) || 0);
  if(totalRows <= 0) return false;
  if(totalRows >= STYLED_XLSX_MAX_ROWS) return true;
  if(isVeryLargeLiveSyncMode()){
    return totalRows >= Math.min(SELECTED_EXPORT_CSV_THRESHOLD, 80);
  }
  return isLargeDatasetMode() && totalRows >= Math.min(SELECTED_EXPORT_CSV_THRESHOLD, 140);
}

function getRenderForSection(section){
  if(section === 'clients') return renderClients;
  if(section === 'audience') return renderAudience;
  if(section === 'suivi') return renderSuivi;
  if(section === 'diligence') return renderDiligence;
  if(section === 'recycle') return renderRecycleBin;
  return null;
}

function getTableContainerBySection(section){
  return $(`${String(section || '').trim()}TableContainer`);
}

function getPaginationPageSize(section){
  const key = String(section || '').trim();
  const raw = Number(PAGINATION_PAGE_SIZES[key]);
  if(Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  return 300;
}

function resetPaginationPage(section){
  if(!Object.prototype.hasOwnProperty.call(paginationState, section)) return;
  paginationState[section] = 1;
}

function syncPaginationFilterState(section, key){
  if(!Object.prototype.hasOwnProperty.call(paginationFilterState, section)) return;
  const next = String(key || '');
  if(paginationFilterState[section] === next) return;
  paginationFilterState[section] = next;
  paginationState[section] = 1;
  const container = getTableContainerBySection(section);
  if(container) container.scrollTop = 0;
}

function paginateRows(rows, section){
  const list = Array.isArray(rows) ? rows : [];
  const safeSection = String(section || '');
  const pageSize = getPaginationPageSize(safeSection);
  const rawPage = Number(paginationState[safeSection]) || 1;
  const totalRows = list.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const page = Math.min(Math.max(1, rawPage), totalPages);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  paginationState[safeSection] = page;
  return {
    rows: list.slice(start, end),
    page,
    totalPages,
    totalRows,
    from: totalRows ? start + 1 : 0,
    to: Math.min(totalRows, end)
  };
}

function getCurrentPageRows(rows, section){
  return paginateRows(rows, section).rows;
}

function renderPagination(section, pagination){
  const el = $(`${section}Pagination`);
  if(!el) return;
  const pageSize = getPaginationPageSize(section);
  const meta = pagination && typeof pagination === 'object'
    ? pagination
    : { page: 1, totalPages: 1, totalRows: 0, from: 0, to: 0 };
  if(!meta.totalRows){
    setElementHtmlWithRenderKey(el, '', `${section}::empty`, { trustRenderKey: true });
    return;
  }
  const buildCompactPages = ()=>{
    if(meta.totalPages <= 7){
      return Array.from({ length: meta.totalPages }, (_, idx)=>idx + 1);
    }
    const around = new Set([1, meta.totalPages, meta.page - 1, meta.page, meta.page + 1]);
    return [...around]
      .filter(page=>page >= 1 && page <= meta.totalPages)
      .sort((a, b)=>a - b);
  };
  const compactPages = buildCompactPages();
  const compactPageHtml = compactPages.map((page, idx)=>{
    const prevPage = compactPages[idx - 1];
    const needsGap = idx > 0 && page - prevPage > 1;
    const gapHtml = needsGap ? '<span class="table-pagination-gap">...</span>' : '';
    const activeClass = page === meta.page ? ' is-active' : '';
    return `${gapHtml}
      <button type="button" class="table-pagination-chip${activeClass}" onclick="setPaginationPage('${section}', ${page})">
        <span>${page}</span>
      </button>`;
  }).join('');
  const fullPageHtml = Array.from({ length: meta.totalPages }, (_, idx)=>{
    const page = idx + 1;
    const activeClass = page === meta.page ? ' is-active' : '';
    return `
      <button type="button" class="table-pagination-flyout-chip${activeClass}" onclick="setPaginationPage('${section}', ${page})">
        <span>${page}</span>
      </button>
    `;
  }).join('');
  const prevDisabled = meta.page <= 1 ? 'disabled' : '';
  const nextDisabled = meta.page >= meta.totalPages ? 'disabled' : '';
  const paginationHtml = `
    <div class="table-pagination-info">
      ${meta.from}-${meta.to} / ${meta.totalRows} (${pageSize}/page)
    </div>
    <div class="table-pagination-actions">
      <button type="button" class="btn-primary" ${prevDisabled} onclick="changePaginationPage('${section}', -1)">
        <i class="fa-solid fa-chevron-left"></i> Préc
      </button>
      <div class="table-pagination-chooser" tabindex="0" aria-label="Pagination ${section}">
        <div class="table-pagination-page">Page ${meta.page}/${meta.totalPages}</div>
        <div class="table-pagination-rail">
          ${compactPageHtml}
        </div>
        <div class="table-pagination-flyout">
          <div class="table-pagination-flyout-grid">
            ${fullPageHtml}
          </div>
        </div>
      </div>
      <button type="button" class="btn-primary" ${nextDisabled} onclick="changePaginationPage('${section}', 1)">
        Suiv <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  `;
  const renderKey = [
    section,
    meta.page,
    meta.totalPages,
    meta.totalRows,
    meta.from,
    meta.to,
    pageSize
  ].join('::');
  setElementHtmlWithRenderKey(el, paginationHtml, renderKey, { trustRenderKey: true });
}

function changePaginationPage(section, delta){
  const key = String(section || '').trim();
  if(!Object.prototype.hasOwnProperty.call(paginationState, key)) return;
  const step = Number(delta);
  if(!Number.isFinite(step) || step === 0) return;
  paginationState[key] = Math.max(1, (Number(paginationState[key]) || 1) + step);
  const container = getTableContainerBySection(key);
  if(container) container.scrollTop = 0;
  const render = getRenderForSection(key);
  if(typeof render === 'function') render();
}

function setPaginationPage(section, page){
  const key = String(section || '').trim();
  if(!Object.prototype.hasOwnProperty.call(paginationState, key)) return;
  const nextPage = Number(page);
  if(!Number.isFinite(nextPage)) return;
  paginationState[key] = Math.max(1, Math.floor(nextPage));
  const container = getTableContainerBySection(key);
  if(container) container.scrollTop = 0;
  const render = getRenderForSection(key);
  if(typeof render === 'function') render();
}

function makeSuiviPrintKey(clientId, dossierIndex){
  return `${Number(clientId) || 0}::${Number(dossierIndex) || 0}`;
}

function getSuiviRenderStateKey(){
  const q = normalizeCaseInsensitiveSearchText($('filterGlobal')?.value || '');
  const suiviFilterCacheKey = [
    q,
    filterSuiviProcedure,
    filterSuiviTribunal,
    filterSuiviStatus,
    filterSuiviAttDepotOnly ? 'att-depot' : 'all'
  ].join('||');
  return [suiviFilterCacheKey, filterSuiviCheckedFirst ? 'checked-first' : 'default'].join('||');
}

function countSelectedSuiviRows(rows){
  const list = Array.isArray(rows) ? rows : [];
  if(
    list === suiviSelectionCountRowsRef
    && suiviSelectionCountVersion === suiviPrintSelectionVersion
  ){
    return suiviSelectionCountValue;
  }
  const out = list.reduce((count, row)=>count + (isSuiviSelectedForPrint(row) ? 1 : 0), 0);
  suiviSelectionCountRowsRef = list;
  suiviSelectionCountVersion = suiviPrintSelectionVersion;
  suiviSelectionCountValue = out;
  return out;
}

function syncSuiviRenderedSelectionCache(rows, pageRows, stateKey, page){
  const filteredRows = Array.isArray(rows) ? rows : [];
  const visibleRows = Array.isArray(pageRows) ? pageRows : [];
  lastSuiviRenderedRows = filteredRows;
  lastSuiviRenderedPageRows = visibleRows;
  lastSuiviRenderedStateKey = String(stateKey || '');
  lastSuiviRenderedPage = Math.max(1, Number(page) || 1);
  lastSuiviRenderedRowKeySet = new Set(filteredRows.map((row)=>makeSuiviPrintKey(row?.c?.id, row?.index)));
  lastSuiviRenderedSelectedCount = countSelectedSuiviRows(filteredRows);
}

function isSuiviSelectedForPrint(row){
  return suiviPrintSelection.has(makeSuiviPrintKey(row?.c?.id, row?.index));
}

function syncPageSelectionToggleControl(inputId, labelId, totalRows, selectedRows){
  const input = $(inputId);
  if(!input) return;
  const label = labelId ? $(labelId) : input.closest('label');
  const total = Math.max(0, Number(totalRows) || 0);
  const selected = Math.max(0, Number(selectedRows) || 0);
  input.disabled = total === 0;
  input.indeterminate = total > 0 && selected > 0 && selected < total;
  input.checked = total > 0 && selected === total;
  if(label){
    label.classList.toggle('is-disabled', total === 0);
    label.classList.toggle('is-partial', total > 0 && selected > 0 && selected < total);
  }
}

function getVisibleSuiviPageRowsForPrintSelection(){
  const currentStateKey = getSuiviRenderStateKey();
  if(
    currentStateKey === lastSuiviRenderedStateKey
    && lastSuiviRenderedPage === (Number(paginationState.suivi) || 1)
  ){
    return lastSuiviRenderedPageRows;
  }
  const filteredRows = getFilteredSuiviRowsForSelection();
  const orderedRows = typeof orderSuiviRowsByCheckedSelection === 'function'
    ? orderSuiviRowsByCheckedSelection(filteredRows)
    : filteredRows;
  return getCurrentPageRows(orderedRows, 'suivi');
}

function getAllFilteredSuiviRowsForPrintSelection(){
  if(getSuiviRenderStateKey() === lastSuiviRenderedStateKey){
    return lastSuiviRenderedRows;
  }
  return getFilteredSuiviRowsForSelection();
}

function syncSuiviPageSelectionToggle(){
  const rows = getAllFilteredSuiviRowsForPrintSelection();
  const selected = (
    rows === lastSuiviRenderedRows
    && getSuiviRenderStateKey() === lastSuiviRenderedStateKey
  )
    ? countSelectedSuiviRows(lastSuiviRenderedRows)
    : countSelectedSuiviRows(rows);
  syncPageSelectionToggleControl('suiviPageSelectionToggle', 'suiviCheckedCount', rows.length, selected);
}

function updateSuiviCheckedCount(){
  const node = $('suiviCheckedCountValue');
  if(node) node.textContent = String(suiviPrintSelection.size);
  syncSuiviPageSelectionToggle();
}

function toggleSuiviPrintSelection(clientId, dossierIndex, checked){
  const key = makeSuiviPrintKey(clientId, dossierIndex);
  if(checked){
    const sizeBefore = suiviPrintSelection.size;
    suiviPrintSelection.add(key);
    if(suiviPrintSelection.size !== sizeBefore){
      suiviPrintSelectionVersion += 1;
      if(lastSuiviRenderedRowKeySet.has(key)){
        lastSuiviRenderedSelectedCount = Math.min(
          lastSuiviRenderedRows.length,
          lastSuiviRenderedSelectedCount + 1
        );
      }
    }
  }else{
    if(suiviPrintSelection.delete(key)){
      suiviPrintSelectionVersion += 1;
      if(lastSuiviRenderedRowKeySet.has(key)){
        lastSuiviRenderedSelectedCount = Math.max(0, lastSuiviRenderedSelectedCount - 1);
      }
    }
  }
  updateSuiviCheckedCount();
  if(filterSuiviCheckedFirst){
    paginationState.suivi = 1;
    renderSuivi();
  }
}

function syncSuiviPrintSelection(allRows){
  const currentDataVersion = dossierDataVersion;
  if(currentDataVersion === suiviPrintSelectionPruneDataVersion){
    updateSuiviCheckedCount();
    return;
  }
  const allowed = new Set((allRows || []).map(row=>makeSuiviPrintKey(row?.c?.id, row?.index)));
  const next = new Set([...suiviPrintSelection].filter(key=>allowed.has(key)));
  const changed = next.size !== suiviPrintSelection.size || [...next].some(key=>!suiviPrintSelection.has(key));
  suiviPrintSelection = next;
  suiviPrintSelectionPruneDataVersion = currentDataVersion;
  if(changed) suiviPrintSelectionVersion += 1;
  if(changed){
    lastSuiviRenderedSelectedCount = countSelectedSuiviRows(lastSuiviRenderedRows);
  }
  updateSuiviCheckedCount();
}

function setAllVisibleSuiviRowsForPrint(checked){
  const rows = getVisibleSuiviPageRowsForPrintSelection();
  if(!rows.length){
    alert('Aucune ligne visible.');
    return;
  }
  let changed = false;
  rows.forEach(row=>{
    const key = makeSuiviPrintKey(row?.c?.id, row?.index);
    if(checked){
      const sizeBefore = suiviPrintSelection.size;
      suiviPrintSelection.add(key);
      if(suiviPrintSelection.size !== sizeBefore) changed = true;
    }else{
      if(suiviPrintSelection.delete(key)) changed = true;
    }
  });
  if(changed) suiviPrintSelectionVersion += 1;
  if(changed && getSuiviRenderStateKey() === lastSuiviRenderedStateKey){
    lastSuiviRenderedSelectedCount = countSelectedSuiviRows(lastSuiviRenderedRows);
  }
  updateSuiviCheckedCount();
  if(filterSuiviCheckedFirst) paginationState.suivi = 1;
  renderSuivi();
}

function setAllFilteredSuiviRowsForPrint(checked){
  const rows = getAllFilteredSuiviRowsForPrintSelection();
  if(!rows.length){
    alert('Aucune ligne filtrée.');
    return;
  }
  let changed = false;
  rows.forEach(row=>{
    const key = makeSuiviPrintKey(row?.c?.id, row?.index);
    if(checked){
      const sizeBefore = suiviPrintSelection.size;
      suiviPrintSelection.add(key);
      if(suiviPrintSelection.size !== sizeBefore) changed = true;
    }else{
      if(suiviPrintSelection.delete(key)) changed = true;
    }
  });
  if(changed) suiviPrintSelectionVersion += 1;
  if(changed && rows === lastSuiviRenderedRows){
    lastSuiviRenderedSelectedCount = checked ? rows.length : 0;
  }
  updateSuiviCheckedCount();
  if(filterSuiviCheckedFirst) paginationState.suivi = 1;
  renderSuivi();
}

function getFilteredSuiviRowsForSelection(){
  const q = normalizeCaseInsensitiveSearchText($('filterGlobal')?.value || '');
  const base = getSuiviBaseRowsCached();
  const suiviFilterKey = [
    q,
    filterSuiviProcedure,
    filterSuiviTribunal,
    filterSuiviStatus,
    filterSuiviAttDepotOnly ? 'att-depot' : 'all'
  ].join('||');
  const noProcedureFilter = filterSuiviProcedure === 'all';
  const noTribunalFilter = filterSuiviTribunal === 'all';
  const noStatusFilter = filterSuiviStatus === 'all';
  const noAttDepotFilter = filterSuiviAttDepotOnly !== true;
  const noSearchFilter = !q;
  if(base === suiviFilteredRowsCacheSource && suiviFilterKey === suiviFilteredRowsCacheKey){
    return suiviFilteredRowsCacheOutput;
  }
  if(noProcedureFilter && noTribunalFilter && noStatusFilter && noAttDepotFilter && noSearchFilter){
    return base.sortedDefaultRows;
  }
  return base.rawRows.filter(row=>{
    const tribunalKeys = row.tribunalKeys || [];
    if(!noProcedureFilter && !row.procSet.has(filterSuiviProcedure)) return false;
    if(!noTribunalFilter && !tribunalKeys.includes(filterSuiviTribunal)) return false;
    if(!noStatusFilter && !matchesSuiviStatusFilter(row?.d, filterSuiviStatus)) return false;
    if(!noAttDepotFilter && row?.hasPendingDepot !== true) return false;
    if(noSearchFilter) return true;
    const haystack = row.__suiviHaystack
      || (row.__suiviHaystack = buildSuiviSearchHaystack(
        row.c.name,
        row.d,
        row.procSource,
        (row.tribunalList && row.tribunalList.length) ? row.tribunalList : row.tribunalLabels
      ));
    if(haystack.includes(q)) return true;
    return matchesSuiviDebiteurSearch(row?.d?.debiteur || '', q);
  });
}

function getAllSuiviRows(){
  return getSuiviBaseRowsCached().sortedDefaultRows;
}

function getSelectedSuiviRowsForExport(){
  const rows = getAllSuiviRows();
  if(
    rows === suiviSelectedExportRowsCacheInput
    && suiviSelectedExportRowsCacheVersion === suiviPrintSelectionVersion
  ){
    return suiviSelectedExportRowsCacheOutput;
  }
  const out = rows.filter(row=>isSuiviSelectedForPrint(row));
  suiviSelectedExportRowsCacheInput = rows;
  suiviSelectedExportRowsCacheVersion = suiviPrintSelectionVersion;
  suiviSelectedExportRowsCacheOutput = out;
  return out;
}

function buildSuiviSelectedExportDatasetBase(){
  const rows = getSelectedSuiviRowsForExport();
  const omitWwAndMarque = shouldOmitSuiviWwAndMarqueColumns(rows);
  const omitCaution = shouldOmitSuiviExportColumn(rows, (row)=>row?.d?.caution);
  const omitCautionAdresse = shouldOmitSuiviExportColumn(rows, (row)=>row?.d?.cautionAdresse);
  const columnDefs = [
    { header: 'Client', width: 22 },
    { header: 'date affectation', width: 21 },
    { header: 'Type', width: 13 },
    { header: 'ref client', width: 30 },
    { header: 'Procédure', width: 22 },
    { header: 'debiteur ', width: 34 },
    { header: 'Adresse', width: 42 },
    { header: 'Ville', width: 22 },
    ...(!omitWwAndMarque ? [
      { header: 'WW', width: 20 },
      { header: 'Marque', width: 24 }
    ] : []),
    ...(!omitCaution ? [{ header: 'Caution', width: 28 }] : []),
    ...(!omitCautionAdresse ? [{ header: 'Adresse  caution', width: 36 }] : []),
    { header: 'Date depot', width: 18 },
    { header: 'Réf Ass', width: 26 },
    { header: 'Audience', width: 18 },
    { header: 'Sort', width: 24 },
    { header: 'Tribunal', width: 42 }
  ];
  const headers = columnDefs.map((column)=>column.header);
  const colWidths = columnDefs.map((column)=>({ wch: column.width }));
  const wrapColumnIndexes = headers.reduce((indexes, header, index)=>{
    const normalizedHeader = String(header || '').trim().toLowerCase();
    if(
      normalizedHeader === 'client'
      || normalizedHeader === 'ref client'
      || normalizedHeader === 'procédure'
      || normalizedHeader === 'debiteur'
      || normalizedHeader === 'debiteur '
      || normalizedHeader === 'adresse'
      || normalizedHeader === 'caution'
      || normalizedHeader === 'adresse  caution'
      || normalizedHeader === 'réf ass'
      || normalizedHeader === 'sort'
      || normalizedHeader === 'tribunal'
      || normalizedHeader === 'marque'
    ){
      indexes.push(index);
    }
    return indexes;
  }, []);
  return {
    rows,
    headers,
    omitWwAndMarque,
    omitCaution,
    omitCautionAdresse,
    colWidths,
    wrapColumnIndexes
  };
}

function getSuiviExportProcedureNames(row){
  const procedures = Array.isArray(row?.procSource) && row.procSource.length
    ? row.procSource
    : normalizeProcedures(row?.d || {});
  const out = [...new Set(
    procedures
      .map(value=>String(value || '').trim())
      .filter(Boolean)
  )];
  return out.length ? out : [''];
}

function collectSuiviProcedureExportValues(dossier, procedureName){
  const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
    ? dossier.procedureDetails
    : {};
  const baseProcedureName = getProcedureBaseName(procedureName);
  const matchingDetails = Object.entries(details)
    .filter(([procName])=>getProcedureBaseName(procName) === baseProcedureName)
    .map(([, procDetails])=>procDetails || {});
  const collect = (getter)=>{
    const values = matchingDetails
      .map(getter)
      .map(value=>String(value || '').trim())
      .filter(Boolean);
    return values.length ? [...new Set(values)].join(', ') : '';
  };
  return {
    dateDepot: collect(proc=>proc.depotLe || proc.dateDepot || ''),
    reference: collect(proc=>proc.referenceClient || ''),
    audience: collect(proc=>proc.audience || ''),
    sort: collect(proc=>proc.sort || ''),
    ordonnance: collect((proc)=>{
      if(isDiligenceCommandementProcedure(baseProcedureName)) return proc?.ord || '';
      return getDiligenceOrdonnanceLabelFromDetails(proc || {});
    }),
    tribunal: collect(proc=>proc.tribunal || '')
  };
}

function shouldOmitSuiviWwAndMarqueColumns(rows){
  const sourceRows = Array.isArray(rows) ? rows : [];
  if(!sourceRows.length) return false;
  return sourceRows.every((row)=>{
    const procedures = getSuiviExportProcedureNames(row);
    return procedures.length > 0 && procedures.every((procedureName)=>getProcedureBaseName(procedureName) === 'ASS');
  });
}

function shouldOmitSuiviExportColumn(rows, getter){
  const sourceRows = Array.isArray(rows) ? rows : [];
  if(!sourceRows.length) return false;
  return sourceRows.every((row)=>!String(getter(row) || '').trim());
}

function buildSuiviExportTableRows(rows, options = {}){
  const sourceRows = Array.isArray(rows) ? rows : [];
  const omitWwAndMarque = options?.omitWwAndMarque === true;
  const omitCaution = options?.omitCaution === true;
  const omitCautionAdresse = options?.omitCautionAdresse === true;
  return sourceRows.flatMap((row)=>{
    const procedures = getSuiviExportProcedureNames(row);
    return procedures.map((procedureName)=>{
      const procedureValues = collectSuiviProcedureExportValues(row?.d, procedureName);
      const fallbackTribunal = (row?.tribunalList && row.tribunalList.length)
        ? row.tribunalList.join(', ')
        : '';
      const exportRow = [
        row.c?.name || '-',
        normalizeDateDDMMYYYY(row.d?.dateAffectation || '') || '-',
        row.d?.type || '-',
        row.d?.referenceClient || '-',
        procedureName || '-',
        row.d?.debiteur || '-',
        row.d?.adresse || '-',
        row.d?.ville || '-'
      ];
      if(!omitWwAndMarque){
        exportRow.push(row.d?.ww || '-', row.d?.marque || '-');
      }
      if(!omitCaution) exportRow.push(row.d?.caution || '-');
      if(!omitCautionAdresse) exportRow.push(row.d?.cautionAdresse || '-');
      exportRow.push(
        procedureValues.dateDepot || '',
        procedureValues.reference || '',
        procedureValues.audience || '',
        procedureValues.sort || '',
        procedureValues.tribunal || fallbackTribunal || ''
      );
      return exportRow;
    });
  });
}

function buildSuiviSelectedExportDataset(){
  const dataset = buildSuiviSelectedExportDatasetBase();
  return {
    ...dataset,
    tableRows: buildSuiviExportTableRows(dataset.rows, {
      omitWwAndMarque: dataset.omitWwAndMarque,
      omitCaution: dataset.omitCaution,
      omitCautionAdresse: dataset.omitCautionAdresse
    })
  };
}

async function buildSuiviSelectedExportDatasetAsync(){
  const dataset = buildSuiviSelectedExportDatasetBase();
  const rowGroups = await mapChunked(dataset.rows, async (row)=>{
    return buildSuiviExportTableRows([row], {
      omitWwAndMarque: dataset.omitWwAndMarque,
      omitCaution: dataset.omitCaution,
      omitCautionAdresse: dataset.omitCautionAdresse
    });
  }, { chunkSize: 80, onProgress: makeProgressReporter('Export suivi') });
  return {
    ...dataset,
    tableRows: rowGroups.flat()
  };
}

function previewSuiviSelectedRows(){
  const dataset = buildSuiviSelectedExportDataset();
  if(!dataset.tableRows.length){
    alert('Cochez au moins une ligne pour afficher le fichier.');
    return;
  }
  if(hasDesktopExportBridge()){
    exportSuiviSelectedXLS({ openAfterExport: true }).catch(err=>console.error(err));
    return;
  }
  showExportPreviewModal({
    title: 'Aperçu Excel - Suivi des dossiers',
    subtitle: 'Lignes cochées prêtes à exporter',
    headers: dataset.headers,
    rows: dataset.tableRows,
    exportLabel: 'Voir le fichier Excel',
    onExport: openSuiviExcelFilePreviewWindow
  });
}

function openSuiviExcelFilePreviewWindow(){
  const dataset = buildSuiviSelectedExportDataset();
  if(!dataset.tableRows.length){
    alert('Cochez au moins une ligne pour afficher le fichier.');
    return;
  }
  const browserDownloadTarget = primeBrowserDownloadTarget('Ouverture du fichier Excel...');
  exportSuiviSelectedXLS({
    openAfterExport: true,
    browserDownloadTarget,
    browserOpenInline: true
  }).catch(err=>{
    console.error(err);
    alert("Ouverture du fichier Excel impossible.");
  });
}

async function exportSuiviSelectedXLS(options = {}){
  if(!canExportData()) return alert('Accès refusé');
  return runWithHeavyUiOperation(async ()=>{
    const dataset = await buildSuiviSelectedExportDatasetAsync();
    if(!dataset.tableRows.length){
      alert('Cochez au moins une ligne pour exporter.');
      return;
    }
    if(shouldPreferSelectedExportCsvPath(dataset.tableRows.length)){
      const csvBlob = await createMappedCsvBlobChunked({
        headers: dataset.headers,
        items: dataset.tableRows,
        mapRow: (row)=>row,
        progressLabel: 'Export suivi CSV',
        chunkSize: 120
      });
      await saveBlobDirectOrDownload(csvBlob, 'suivi_export.csv', {
        openAfterExport: options?.openAfterExport === true,
        browserDownloadTarget: options?.browserDownloadTarget || null,
        browserOpenInline: options?.browserOpenInline === true,
        preferredFileHandle: options?.preferredFileHandle || null
      });
      return;
    }
    await exportAudienceWorkbookXlsxStyled({
      headers: dataset.headers,
      rows: dataset.tableRows,
      subtitle: '',
      sheetName: 'Suivi',
      colWidths: dataset.colWidths,
      filename: 'suivis dossier.xlsx',
      layoutPreset: 'suivi-reference',
      wrapColumnIndexes: dataset.wrapColumnIndexes,
      openAfterExport: options?.openAfterExport === true,
      browserDownloadTarget: options?.browserDownloadTarget || null,
      browserOpenInline: options?.browserOpenInline === true,
      preferredFileHandle: options?.preferredFileHandle || null
    });
  });
}

function getVirtualWindowByContainer(containerId, rowsLength){
  const container = $(containerId);
  if(!container){
    return { start: 0, end: rowsLength };
  }
  const total = Math.max(0, Number(rowsLength) || 0);
  const viewportHeight = Math.max(container.clientHeight || 0, AUDIENCE_VIRTUAL_ROW_HEIGHT * 6);
  const scrollTop = Math.max(0, container.scrollTop || 0);
  const start = Math.max(0, Math.floor(scrollTop / AUDIENCE_VIRTUAL_ROW_HEIGHT) - AUDIENCE_VIRTUAL_OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / AUDIENCE_VIRTUAL_ROW_HEIGHT) + (AUDIENCE_VIRTUAL_OVERSCAN * 2);
  const end = Math.min(total, start + visibleCount);
  return { start, end };
}

function loadExternalScript(url, key){
  return new Promise((resolve, reject)=>{
    const selector = `script[data-lib-key="${key}"]`;
    const existing = document.querySelector(selector);
    if(existing){
      if(existing.dataset.loaded === '1'){
        resolve();
        return;
      }
      existing.addEventListener('load', ()=>resolve(), { once: true });
      existing.addEventListener('error', ()=>reject(new Error(`Impossible de charger ${key}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.dataset.libKey = key;
    script.addEventListener('load', ()=>{
      script.dataset.loaded = '1';
      resolve();
    }, { once: true });
    script.addEventListener('error', ()=>{
      reject(new Error(`Impossible de charger ${key}`));
    }, { once: true });
    document.head.appendChild(script);
  });
}

async function ensureExcelLibraries({ needXlsx = true, needExcelJs = false, silent = false } = {}){
  try{
    if(needXlsx && typeof XLSX === 'undefined'){
      if(!xlsxLoadPromise){
        xlsxLoadPromise = loadExternalScript(XLSX_LOCAL_URL, 'xlsx-local')
          .catch(()=>loadExternalScript(XLSX_CDN_URL, 'xlsx-cdn'));
      }
      await xlsxLoadPromise;
      if(typeof XLSX === 'undefined'){
        xlsxLoadPromise = null;
        throw new Error("Librairie XLSX introuvable (vérifiez /vendor/libs/xlsx.full.min.js ou l'accès CDN).");
      }
    }
    if(needExcelJs && typeof ExcelJS === 'undefined'){
      if(!excelJsLoadPromise){
        excelJsLoadPromise = loadExternalScript(EXCELJS_LOCAL_URL, 'exceljs-local')
          .catch(()=>loadExternalScript(EXCELJS_CDN_URL, 'exceljs-cdn'));
      }
      await excelJsLoadPromise;
      if(typeof ExcelJS === 'undefined'){
        excelJsLoadPromise = null;
        throw new Error("Librairie ExcelJS introuvable (vérifiez /vendor/libs/exceljs.min.js ou l'accès CDN).");
      }
    }
    return true;
  }catch(err){
    console.error(err);
    if(silent) return false;
    const details = String(err?.message || '').trim();
    const extra = details ? `\nDétail: ${details}` : '';
    alert(`Chargement du module Excel impossible.${extra}`);
    return false;
  }
}

function warmupExcelLibrariesOnIdle(){
  // Keep startup lean: Excel libraries are loaded on demand when an import/export is triggered.
}

async function ensureAudienceExportTemplateEmbeddedScript(){
  if(typeof AUDIENCE_EXPORT_TEMPLATE_BASE64 !== 'undefined' && AUDIENCE_EXPORT_TEMPLATE_BASE64){
    return true;
  }
  if(!audienceExportTemplateBase64ScriptPromise){
    audienceExportTemplateBase64ScriptPromise = loadExternalScript(
      AUDIENCE_EXPORT_TEMPLATE_BASE64_SCRIPT_URL,
      'audience-export-template-base64'
    ).then(()=>true).catch((err)=>{
      console.warn('Chargement du template audience embarque indisponible', err);
      audienceExportTemplateBase64ScriptPromise = null;
      return false;
    });
  }
  return audienceExportTemplateBase64ScriptPromise;
}

function clearScheduledWarmupTimer(timerId){
  if(!timerId) return null;
  if(typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function' && typeof timerId === 'number'){
    try{
      window.cancelIdleCallback(timerId);
      return null;
    }catch(_){}
  }
  clearTimeout(timerId);
  return null;
}

function scheduleChunkedSearchWarmup(kind, rows, stepFn){
  if(typeof stepFn !== 'function') return;
  const list = Array.isArray(rows) ? rows : [];
  const stateMap = {
    audience: {
      get timer(){ return audienceSearchWarmupTimer; },
      set timer(value){ audienceSearchWarmupTimer = value; },
      get token(){ return audienceSearchWarmupToken; },
      set token(value){ audienceSearchWarmupToken = value; }
    },
    suivi: {
      get timer(){ return suiviSearchWarmupTimer; },
      set timer(value){ suiviSearchWarmupTimer = value; },
      get token(){ return suiviSearchWarmupToken; },
      set token(value){ suiviSearchWarmupToken = value; }
    },
    diligence: {
      get timer(){ return diligenceSearchWarmupTimer; },
      set timer(value){ diligenceSearchWarmupTimer = value; },
      get token(){ return diligenceSearchWarmupToken; },
      set token(value){ diligenceSearchWarmupToken = value; }
    }
  };
  const state = stateMap[kind];
  if(!state) return;
  state.timer = clearScheduledWarmupTimer(state.timer);
  if(!list.length) return;
  state.token += 1;
  const token = state.token;
  let index = 0;
  const schedule = ()=>{
    if(typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'){
      state.timer = window.requestIdleCallback(run, { timeout: 1500 });
      return;
    }
    state.timer = setTimeout(()=>run(null), 16);
  };
  const run = (deadline)=>{
    if(token !== state.token) return;
    state.timer = null;
    let processed = 0;
    while(index < list.length && processed < SEARCH_CACHE_WARMUP_CHUNK_SIZE){
      if(
        deadline
        && typeof deadline.timeRemaining === 'function'
        && processed > 0
        && deadline.timeRemaining() <= 3
      ){
        break;
      }
      stepFn(list[index], index);
      index += 1;
      processed += 1;
    }
    if(index < list.length){
      schedule();
    }
  };
  schedule();
}

function scheduleBackgroundDataWarmup(delayMs = 1500){
  if(typeof window === 'undefined' || !currentUser || isLargeDatasetMode()) return;
  const targetVersion = dossierDataVersion;
  if(backgroundDataWarmupVersion === targetVersion) return;
  if(backgroundDataWarmupTimer){
    clearTimeout(backgroundDataWarmupTimer);
    backgroundDataWarmupTimer = null;
  }
  const warmup = ()=>{
    backgroundDataWarmupTimer = null;
    if(!currentUser) return;
    if(backgroundDataWarmupVersion === dossierDataVersion) return;
    try{
      getClientListSummaries();
      getDashboardSnapshot();
      getDashboardCalendarEvents();
      const suiviBase = getSuiviBaseRowsCached();
      const audienceRows = getAudienceRows();
      const prevAudienceColor = selectedAudienceColor;
      const prevErrorsOnly = filterAudienceErrorsOnly;
      selectedAudienceColor = 'all';
      filterAudienceErrorsOnly = false;
      getFilteredAudienceRows(audienceRows);
      selectedAudienceColor = 'blue';
      getFilteredAudienceRows(audienceRows);
      selectedAudienceColor = prevAudienceColor;
      filterAudienceErrorsOnly = prevErrorsOnly;
      const audienceSearchRows = getAudienceRowsDedupedCached();
      const diligenceRows = getDiligenceRows();
      scheduleChunkedSearchWarmup('audience', audienceSearchRows, (row)=>{
        if(!row) return;
        if(!row.__haystack){
          row.__haystack = buildAudienceSearchHaystack(row.c?.name, row.d, row.procKey, row.p, row.draft, row);
        }
        if(!row.__audienceDateDisplay){
          row.__audienceDateDisplay = getAudienceRowDateValue(row);
        }
      });
      scheduleChunkedSearchWarmup('suivi', suiviBase?.rawRows || [], (row)=>{
        if(!row) return;
        if(!row.__suiviHaystack){
          row.__suiviHaystack = buildSuiviSearchHaystack(
            row.c?.name,
            row.d,
            row.procSource,
            (row.tribunalList && row.tribunalList.length) ? row.tribunalList : row.tribunalLabels
          );
        }
      });
      scheduleChunkedSearchWarmup('diligence', diligenceRows, (row)=>{
        if(!row) return;
        if(!row.__diligenceSearchValues){
          row.__diligenceSearchValues = getDiligenceSearchValues(row);
        }
      });
      backgroundDataWarmupVersion = dossierDataVersion;
    }catch(err){
      console.warn('Préchargement des caches impossible', err);
    }
  };
  backgroundDataWarmupTimer = setTimeout(()=>{
    backgroundDataWarmupTimer = null;
    if(typeof window.requestIdleCallback === 'function'){
      window.requestIdleCallback(warmup, { timeout: 2500 });
      return;
    }
    warmup();
  }, Math.max(0, Number(delayMs) || 0));
}

function queueLargeDatasetDashboardWarmup(delayMs = 120){
  if(typeof window === 'undefined' || !currentUser || !isLargeDatasetMode()) return;
  const safeDelay = getAdaptiveUiBatchDelay(
    isUltraLargeDatasetMode()
      ? Math.max(2200, Math.max(0, Number(delayMs) || 0))
      : Math.max(1400, Math.max(0, Number(delayMs) || 0)),
    {
      largeDatasetExtraMs: 600,
      busyExtraMs: 900,
      importExtraMs: 1200
    }
  );
  setTimeout(()=>{
    if(!currentUser) return;
    if(dashboardSnapshotCacheVersion === dossierDataVersion) return;
    if(importInProgress || heavyUiOperationCount > 0){
      queueLargeDatasetDashboardWarmup(1800);
      return;
    }
    const run = ()=>{
      try{
        if(dashboardSnapshotCacheVersion === dossierDataVersion) return;
        getDashboardSnapshot();
      }catch(err){
        console.warn('Préchargement dashboard impossible', err);
      }
    };
    if(typeof window.requestIdleCallback === 'function'){
      window.requestIdleCallback(run, { timeout: isUltraLargeDatasetMode() ? 3200 : 1200 });
      return;
    }
    run();
  }, safeDelay);
}

function getCurrentSyncStatus(){
  const badge = $('syncStatusBadge');
  if(!badge) return 'pending';
  if(badge.classList.contains('is-ok')) return 'ok';
  if(badge.classList.contains('is-error')) return 'error';
  if(badge.classList.contains('is-syncing')) return 'syncing';
  return 'pending';
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 6000){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  }finally{
    clearTimeout(timer);
  }
}

function waitForMs(ms){
  return new Promise((resolve)=>setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

function getRemoteSaveTimeoutMs(pathname, body){
  const safePath = String(pathname || '').trim();
  const baseTimeout = API_STATE_SAVE_TIMEOUT_MS + (isLargeDatasetMode() ? 12000 : 0) + (isUltraLargeDatasetMode() ? 8000 : 0);
  if(safePath === '/state/dossiers'){
    const action = String(body?.action || '').trim().toLowerCase();
    if(action === 'update' || action === 'delete'){
      if(isUltraLargeDatasetMode()) return baseTimeout + 55000;
      if(isLargeDatasetMode()) return baseTimeout + 28000;
      return baseTimeout + 8000;
    }
  }
  if(safePath === '/state/dossiers/batch'){
    const patches = Array.isArray(body?.patches) ? body.patches : [];
    const safeOnly = patches.length > 0 && patches.every((patch)=>{
      const action = String(patch?.action || '').trim().toLowerCase();
      return action === 'update' || action === 'delete';
    });
    if(safeOnly){
      if(isUltraLargeDatasetMode()) return baseTimeout + 70000;
      if(isLargeDatasetMode()) return baseTimeout + 36000;
      return baseTimeout + 10000;
    }
  }
  return baseTimeout;
}

function shouldRetryPersistRequest(pathname, body, error){
  const safePath = String(pathname || '').trim();
  const message = String(error?.message || error || '').trim().toLowerCase();
  const isAbort = error?.name === 'AbortError' || message.includes('abort');
  if(!isAbort) return false;
  if(safePath === '/state/dossiers'){
    const action = String(body?.action || '').trim().toLowerCase();
    return action === 'update' || action === 'delete';
  }
  if(safePath === '/state/dossiers/batch'){
    const patches = Array.isArray(body?.patches) ? body.patches : [];
    return patches.length > 0 && patches.every((patch)=>{
      const action = String(patch?.action || '').trim().toLowerCase();
      return action === 'update' || action === 'delete';
    });
  }
  return false;
}

function isRecoverableDossierPersistFailure(error){
  const message = String(error?.message || error || '').trim().toLowerCase();
  const name = String(error?.name || '').trim();
  return name === 'AbortError'
    || message.includes('abort')
    || message.includes('networkerror')
    || message.includes('failed to fetch')
    || message.includes('load failed');
}

function hasRemoteAuthSession(){
  return !!String(remoteAuthToken || '').trim();
}

function clearRemoteAuthSession(){
  remoteAuthToken = '';
}

function buildRemoteAuthHeaders(headers = {}){
  const nextHeaders = { ...headers };
  if(hasRemoteAuthSession()){
    nextHeaders.Authorization = `Bearer ${remoteAuthToken}`;
  }
  return nextHeaders;
}

function markApiBaseHealthy(base){
  const normalized = normalizeApiBaseCandidate(base);
  if(normalized){
    API_BASE = normalized;
  }
  API_BASE_RESOLVED = true;
  lastApiBaseSuccessAt = Date.now();
  if(typeof localStorage !== 'undefined'){
    try{
      localStorage.setItem(API_BASE_STORAGE_KEY, API_BASE);
    }catch(err){
      console.warn('Impossible de sauvegarder la configuration API locale', err);
    }
  }
}

function canRetryApiBaseDiscovery(){
  if(!lastApiBaseSuccessAt) return true;
  return (Date.now() - lastApiBaseSuccessAt) >= API_BASE_REDISCOVERY_COOLDOWN_MS;
}

async function loginRemoteSession(username, password){
  if(LOCAL_ONLY_MODE) return { ok: false, reason: 'offline' };
  await resolveApiBase();
  try{
    const res = await fetchWithTimeout(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }, getApiAuthLoginTimeoutMs());
    if(res.status === 401){
      remoteServerReachable = true;
      clearRemoteAuthSession();
      return { ok: false, reason: 'invalid' };
    }
    if(res.status === 428){
      remoteServerReachable = true;
      clearRemoteAuthSession();
      remoteBootstrapSetupRequired = true;
      return { ok: false, reason: 'bootstrap_required' };
    }
    if(!res.ok){
      throw new Error(`HTTP ${res.status}`);
    }
    remoteServerReachable = true;
    const payload = await res.json().catch(()=>({}));
    remoteAuthToken = String(payload?.token || '').trim();
    if(!remoteAuthToken){
      return { ok: false, reason: 'invalid' };
    }
    remoteBootstrapSetupRequired = false;
    markApiBaseHealthy(API_BASE);
    return { ok: true };
  }catch(err){
    remoteServerReachable = false;
    clearRemoteAuthSession();
    console.warn('Connexion serveur impossible pendant la connexion', err);
    return { ok: false, reason: 'unavailable' };
  }
}

function handleUnauthorizedRemoteSession(){
  clearRemoteAuthSession();
  stopRemoteSync();
  remoteRefreshPending = false;
  remoteRefreshInFlight = false;
  setSyncStatus('error', 'Session serveur expirée');
}

async function pingApiBase(base, timeoutMs = 3500){
  const probe = await pingApiBaseWithLatency(base, timeoutMs);
  return probe.ok;
}

async function pingApiBaseWithLatency(base, timeoutMs = 3500){
  if(!base){
    remoteServerReachable = false;
    return {
      ok: false,
      latencyMs: null
    };
  }
  const now = (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? ()=>performance.now()
    : ()=>Date.now();
  const startedAt = now();
  try{
    const res = await fetchWithTimeout(`${base}/health`, { cache: 'no-store' }, timeoutMs);
    remoteServerReachable = !!res.ok;
    const payload = await res.clone().json().catch(()=>null);
    remoteBootstrapSetupRequired = payload?.bootstrapSetupRequired === true;
    return {
      ok: !!res.ok,
      latencyMs: Math.max(0, now() - startedAt)
    };
  }catch(err){
    remoteServerReachable = false;
    remoteBootstrapSetupRequired = false;
    return {
      ok: false,
      latencyMs: null
    };
  }
}

async function resolveApiBase(forceRetry = false){
  if(LOCAL_ONLY_MODE){
    API_BASE_RESOLVED = true;
    return API_BASE;
  }
  if(API_BASE_RESOLVED && !forceRetry){
    return API_BASE;
  }
  if(forceRetry && API_BASE_RESOLVED && !canRetryApiBaseDiscovery()){
    return API_BASE;
  }
  const candidates = buildApiBaseCandidates();
  for(const candidate of candidates){
    if(await pingApiBase(candidate, API_PROBE_TIMEOUT_MS)){
      markApiBaseHealthy(candidate);
      return API_BASE;
    }
  }
  if(candidates.length){
    API_BASE = candidates[0];
  }
  API_BASE_RESOLVED = true;
  return API_BASE;
}

async function refreshServerConnectionStatus(options = {}){
  if(remoteSyncHealthCheckInFlight) return false;
  if(LOCAL_ONLY_MODE){
    setPingMetric(null);
    lastLiveDelayMs = null;
    renderSyncMetrics();
    setSyncStatus('error', 'Mode local (offline)');
    return false;
  }
  const force = options?.force === true;
  if(remoteSyncStreamConnected && !force){
    return true;
  }
  const blocker = getRemoteRefreshBlocker();
  if(!force && remoteSyncStreamConnected && blocker && blocker !== 'hidden'){
    return true;
  }
  remoteSyncHealthCheckInFlight = true;
  try{
    const currentProbe = await pingApiBaseWithLatency(API_BASE, API_HEALTH_TIMEOUT_MS);
    if(currentProbe.ok){
      markApiBaseHealthy(API_BASE);
      setPingMetric(currentProbe.latencyMs);
      setSyncStatus('ok', 'Connecte au serveur (actif)');
      return true;
    }
    if(canRetryApiBaseDiscovery()){
      await resolveApiBase(true);
      const retryProbe = await pingApiBaseWithLatency(API_BASE, API_HEALTH_TIMEOUT_MS);
      if(retryProbe.ok){
        markApiBaseHealthy(API_BASE);
        setPingMetric(retryProbe.latencyMs);
        setSyncStatus('ok', 'Connecte au serveur (actif)');
        return true;
      }
    }
    setPingMetric(null);
    lastLiveDelayMs = null;
    renderSyncMetrics();
    setSyncStatus(remoteSyncStreamConnected ? 'pending' : 'error', remoteSyncStreamConnected ? 'Connexion serveur ralentie' : 'Mode local (serveur indisponible)');
    return false;
  }finally{
    remoteSyncHealthCheckInFlight = false;
  }
}

async function refreshPreLoginServerStatus(){
  if(LOCAL_ONLY_MODE){
    setSyncStatus('error', 'Mode local (offline)');
    return false;
  }
  const connected = await refreshServerConnectionStatus({ force: true });
  if(hasRemoteAuthSession()) return connected;
  if(connected){
    setSyncStatus(
      'pending',
      remoteBootstrapSetupRequired ? 'Initialisation serveur requise' : 'Connexion serveur en attente'
    );
    return true;
  }
  setSyncStatus(
    remoteBootstrapSetupRequired ? 'pending' : 'error',
    remoteBootstrapSetupRequired ? 'Initialisation serveur requise' : 'Mode local (serveur indisponible)'
  );
  return false;
}

function isManager(){
  return normalizeUserRole(currentUser?.role) === 'manager';
}

function isAdmin(){
  return normalizeUserRole(currentUser?.role) === 'admin';
}

function isViewer(){
  return normalizeUserRole(currentUser?.role) === 'client';
}

function isDefaultManagerUser(user){
  return String(user?.username || '').trim().toLowerCase() === DEFAULT_MANAGER_USERNAME;
}

function canEditData(){
  return isManager() || isAdmin();
}

function canImportData(){
  return canEditData();
}

function canExportData(){
  return canEditData();
}

function canDeleteData(){
  return isManager();
}

function canManageTeam(){
  return isManager();
}

function getAccessibleViewsForCurrentUser(){
  if(!currentUser){
    return new Set(['dashboard', 'clients', 'creation', 'suivi', 'audience', 'diligence', 'salle', 'equipe', 'recycle']);
  }
  if(isManager()){
    return new Set(['dashboard', 'clients', 'creation', 'suivi', 'audience', 'diligence', 'salle', 'equipe', 'recycle']);
  }
  if(isAdmin()){
    return new Set(['dashboard', 'clients', 'creation', 'suivi', 'audience', 'diligence', 'salle']);
  }
  return new Set(['dashboard', 'suivi']);
}

function getFallbackViewForCurrentUser(){
  return isViewer() ? 'suivi' : 'dashboard';
}

function resolveAccessibleView(viewName){
  const requested = String(viewName || '').trim() || getFallbackViewForCurrentUser();
  const allowed = getAccessibleViewsForCurrentUser();
  if(allowed.has(requested)) return requested;
  return allowed.has('dashboard') ? 'dashboard' : getFallbackViewForCurrentUser();
}

function setRoleControlledVisibility(ids, visible){
  ids.forEach((id)=>{
    const el = $(id);
    if(!el) return;
    el.style.display = visible ? '' : 'none';
  });
}

function canViewClient(client){
  if(!client) return false;
  if(isManager() || isAdmin()) return true;
  const ids = Array.isArray(currentUser?.clientIds) ? currentUser.clientIds : [];
  return ids.includes(client.id);
}

function canEditClient(client){
  if(!canEditData()) return false;
  return canViewClient(client);
}

function grantCurrentViewerAccessToClient(clientId){
  if(!isViewer()) return;
  const idNum = Number(clientId);
  if(!Number.isFinite(idNum)) return;
  if(!Array.isArray(currentUser.clientIds)){
    currentUser.clientIds = [];
  }
  if(!currentUser.clientIds.includes(idNum)){
    currentUser.clientIds.push(idNum);
  }
  const userIdx = USERS.findIndex(u=>Number(u?.id) === Number(currentUser?.id));
  if(userIdx === -1){
    return;
  }
  const user = USERS[userIdx];
  const nextIds = Array.isArray(user?.clientIds) ? user.clientIds.slice() : [];
  if(!nextIds.includes(idNum)){
    nextIds.push(idNum);
  }
  USERS[userIdx] = { ...user, clientIds: nextIds };
  currentUser = USERS[userIdx];
  persistStateSliceNow('users', USERS, { source: 'client-access' }).catch(()=>{});
}

function normalizeSalleName(value){
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeJudgeName(value){
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeSalleWeekday(value){
  const raw = String(value || '').trim().toLowerCase();
  const allowed = new Set(SALLE_WEEKDAY_OPTIONS.map(v=>v.key));
  if(allowed.has(raw)) return raw;
  return 'lundi';
}

function getSalleWeekdayLabel(dayKey){
  const key = normalizeSalleWeekday(dayKey);
  return SALLE_WEEKDAY_OPTIONS.find(v=>v.key === key)?.label || 'Lundi';
}

function renderSalleDayTabs(){
  const container = $('salleDayTabs');
  if(!container) return;
  const normalizedDay = normalizeSalleWeekday(selectedSalleDay);
  if(selectedSalleDay !== normalizedDay) selectedSalleDay = normalizedDay;
  container.innerHTML = SALLE_WEEKDAY_OPTIONS.map(day=>{
    const activeClass = day.key === selectedSalleDay ? ' active' : '';
    return `<button type="button" class="salle-day-tab${activeClass}" data-day="${escapeAttr(day.key)}">${escapeHtml(day.label)}</button>`;
  }).join('');
}

function makeJudgeMatchKey(value){
  return normalizeJudgeName(value)
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[^\u0600-\u06FFa-z0-9]/g, '');
}

function splitJudgeCandidates(value){
  const raw = normalizeJudgeName(value);
  if(!raw) return [];
  const parts = raw
    .split(/[|/,;،]+/)
    .map(v=>normalizeJudgeName(v))
    .filter(Boolean);
  if(!parts.includes(raw)) parts.push(raw);
  return [...new Set(parts)];
}

function normalizeSalleAssignments(raw){
  if(!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  raw.forEach(item=>{
    if(!item || typeof item !== 'object') return;
    const salle = normalizeSalleName(item.salle);
    const juge = normalizeJudgeName(item.juge);
    const day = normalizeSalleWeekday(item.day);
    if(!salle || !juge) return;
    const key = `${day}::${salle.toLowerCase()}::${juge.toLowerCase()}`;
    if(seen.has(key)) return;
    seen.add(key);
    out.push({
      id: Number(item.id) || Date.now() + Math.floor(Math.random() * 1000000),
      salle,
      juge,
      day
    });
  });
  return out;
}

function syncCurrentUserFromUsers(){
  if(!currentUser) return;
  const byId = USERS.find(u=>Number(u.id) === Number(currentUser.id));
  if(byId){
    currentUser = byId;
    return;
  }
  const byUsername = USERS.find(
    u=>String(u.username || '').trim().toLowerCase() === String(currentUser.username || '').trim().toLowerCase()
  );
  if(byUsername){
    currentUser = byUsername;
  }
}

function getCurrentClientAccessCacheKey(){
  const user = currentUser || {};
  const ids = Array.isArray(user?.clientIds) ? user.clientIds.map(v=>Number(v)).filter(Number.isFinite).sort((a, b)=>a - b) : [];
  return [
    String(user?.id || ''),
    normalizeUserRole(user?.role),
    ids.join(',')
  ].join('||');
}

function getVisibleClients(){
  const userKey = getCurrentClientAccessCacheKey();
  if(
    visibleClientsCache
    && visibleClientsCacheVersion === dossierDataVersion
    && visibleClientsCacheUserKey === userKey
  ){
    return visibleClientsCache;
  }
  const next = AppState.clients.filter(c=>canViewClient(c));
  visibleClientsCache = next;
  visibleClientsCacheVersion = dossierDataVersion;
  visibleClientsCacheUserKey = userKey;
  return next;
}

function isLargeDatasetMode(){
  const userKey = getCurrentClientAccessCacheKey();
  if(
    largeDatasetModeCacheVersion === dossierDataVersion
    && largeDatasetModeCacheUserKey === userKey
  ){
    return largeDatasetModeCacheValue;
  }
  const visibleClients = getVisibleClients();
  const dossierCount = getVisibleDossierCount();
  const large = visibleClients.length >= LARGE_DATASET_VISIBLE_CLIENTS_THRESHOLD
    || dossierCount >= LARGE_DATASET_DOSSIERS_THRESHOLD;
  largeDatasetModeCacheValue = large;
  largeDatasetModeCacheVersion = dossierDataVersion;
  largeDatasetModeCacheUserKey = userKey;
  return large;
}

function getAdaptiveUiBatchDelay(baseDelay = 0, options = {}){
  const base = Math.max(0, Number(baseDelay) || 0);
  let delay = base;
  if(isUltraLargeDatasetMode()){
    delay = Math.max(delay, base + (Number(options.ultraLargeDatasetExtraMs) || 260));
  }
  if(isLargeDatasetMode()){
    delay = Math.max(delay, base + (Number(options.largeDatasetExtraMs) || 140));
  }
  if(heavyUiOperationCount > 0){
    delay = Math.max(delay, base + (Number(options.busyExtraMs) || 240));
  }
  if(importInProgress){
    delay = Math.max(delay, base + (Number(options.importExtraMs) || 320));
  }
  return delay;
}

function getDossierPatchPersistDelayMs(){
  return getAdaptiveUiBatchDelay(DOSSIER_PATCH_DEBOUNCE_MS, {
    ultraLargeDatasetExtraMs: 650,
    largeDatasetExtraMs: 300,
    busyExtraMs: 380,
    importExtraMs: 520
  });
}

function shouldDeferHeavySectionRender(rowCount = 0, options = {}){
  if(options?.immediate === true) return false;
  const totalRows = Math.max(0, Number(rowCount) || 0);
  if(totalRows <= 0) return false;
  if(isUltraLargeDatasetMode()){
    return totalRows >= 80;
  }
  if(importInProgress || heavyUiOperationCount > 0){
    return totalRows >= 120;
  }
  if(isLargeDatasetMode()){
    return totalRows >= 180;
  }
  return totalRows >= 1200;
}

function scheduleSectionRenderRetry(sectionKey, renderFn, options = {}){
  const safeKey = String(sectionKey || '').trim();
  if(typeof renderFn !== 'function' || !safeKey) return false;
  const delayMs = Math.max(
    80,
    Number(options.delayMs) || getPrimaryViewDeferredRenderDelay(safeKey) || 120
  );
  if(scheduleDeferredSectionRender(safeKey, renderFn, {
    delayMs,
    timeoutMs: Math.max(1800, delayMs + 1200)
  })){
    return true;
  }
  setTimeout(()=>{
    try{
      renderFn();
    }catch(err){
      console.warn(`Rendu différé impossible pour ${safeKey}`, err);
    }
  }, delayMs);
  return true;
}

function runSectionRenderSafely(sectionKey, renderFn, options = {}){
  const safeKey = String(sectionKey || '').trim();
  if(typeof renderFn !== 'function'){
    return false;
  }
  if(!safeKey){
    renderFn();
    return true;
  }
  const currentDepth = Number(sectionRenderDepthByKey.get(safeKey) || 0);
  if(currentDepth > 0){
    markDeferredRenderDirty(safeKey);
    if(options.scheduleOnReentry !== false){
      scheduleSectionRenderRetry(safeKey, ()=>runSectionRenderSafely(safeKey, renderFn, {
        ...options,
        scheduleOnReentry: false
      }), {
        delayMs: options.delayMs
      });
    }
    return false;
  }
  sectionRenderDepthByKey.set(safeKey, currentDepth + 1);
  try{
    renderFn();
    return true;
  }catch(err){
    const message = String(err?.message || err || '').trim();
    const isStackOverflow = err instanceof RangeError || message.includes('Maximum call stack size exceeded');
    if(isStackOverflow){
      console.warn(`Boucle de rendu évitée sur ${safeKey}`, err);
      markDeferredRenderDirty(safeKey);
      scheduleSectionRenderRetry(safeKey, ()=>runSectionRenderSafely(safeKey, renderFn, {
        ...options,
        scheduleOnReentry: false
      }), {
        delayMs: Math.max(140, Number(options.delayMs) || 0)
      });
      return false;
    }
    throw err;
  }finally{
    const nextDepth = Math.max(0, Number(sectionRenderDepthByKey.get(safeKey) || 1) - 1);
    if(nextDepth <= 0){
      sectionRenderDepthByKey.delete(safeKey);
    }else{
      sectionRenderDepthByKey.set(safeKey, nextDepth);
    }
  }
}

function scheduleDeferredSectionRender(sectionKey, renderFn, options = {}){
  if(typeof renderFn !== 'function') return false;
  const stateMap = {
    dashboard: {
      get timer(){ return dashboardDeferredRenderTimer; },
      set timer(value){ dashboardDeferredRenderTimer = value; },
      get seq(){ return dashboardDeferredRenderSeq; },
      set seq(value){ dashboardDeferredRenderSeq = value; }
    },
    clients: {
      get timer(){ return clientDeferredRenderTimer; },
      set timer(value){ clientDeferredRenderTimer = value; },
      get seq(){ return clientDeferredRenderSeq; },
      set seq(value){ clientDeferredRenderSeq = value; }
    },
    audience: {
      get timer(){ return audienceDeferredRenderTimer; },
      set timer(value){ audienceDeferredRenderTimer = value; },
      get seq(){ return audienceDeferredRenderSeq; },
      set seq(value){ audienceDeferredRenderSeq = value; }
    },
    suivi: {
      get timer(){ return suiviDeferredRenderTimer; },
      set timer(value){ suiviDeferredRenderTimer = value; },
      get seq(){ return suiviDeferredRenderSeq; },
      set seq(value){ suiviDeferredRenderSeq = value; }
    },
    salle: {
      get timer(){ return salleDeferredRenderTimer; },
      set timer(value){ salleDeferredRenderTimer = value; },
      get seq(){ return salleDeferredRenderSeq; },
      set seq(value){ salleDeferredRenderSeq = value; }
    },
    diligence: {
      get timer(){ return diligenceDeferredRenderTimer; },
      set timer(value){ diligenceDeferredRenderTimer = value; },
      get seq(){ return diligenceDeferredRenderSeq; },
      set seq(value){ diligenceDeferredRenderSeq = value; }
    }
  };
  const state = stateMap[sectionKey];
  if(!state) return false;
  state.timer = clearScheduledWarmupTimer(state.timer);
  state.seq += 1;
  const token = state.seq;
  const onPending = typeof options?.onPending === 'function' ? options.onPending : null;
  if(onPending) onPending();
  const queueRun = (extraDelayMs = 0)=>{
    const delayMs = getAdaptiveUiBatchDelay((Number(options.delayMs) || 0) + Math.max(0, Number(extraDelayMs) || 0), {
      ultraLargeDatasetExtraMs: 420,
      largeDatasetExtraMs: 120,
      busyExtraMs: 220,
      importExtraMs: 320
    });
    const execute = ()=>{
      state.timer = null;
      if(token !== state.seq) return;
      if(importInProgress){
        queueRun(140);
        return;
      }
      const runNow = ()=>{
        if(token !== state.seq) return;
        renderFn();
      };
      if(typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'){
        state.timer = window.requestIdleCallback(()=>{
          state.timer = null;
          runNow();
        }, { timeout: Math.max(1200, Number(options.timeoutMs) || 1800) });
        return;
      }
      state.timer = setTimeout(()=>{
        state.timer = null;
        runNow();
      }, 16);
    };
    if(delayMs > 0){
      state.timer = setTimeout(execute, delayMs);
      return;
    }
    execute();
  };
  queueRun();
  return true;
}

function getEditableClients(){
  const userKey = getCurrentClientAccessCacheKey();
  if(
    editableClientsCache
    && editableClientsCacheVersion === dossierDataVersion
    && editableClientsCacheUserKey === userKey
  ){
    return editableClientsCache;
  }
  const next = getVisibleClients().filter(c=>canEditClient(c));
  editableClientsCache = next;
  editableClientsCacheVersion = dossierDataVersion;
  editableClientsCacheUserKey = userKey;
  return next;
}

function getClientListSummaries(){
  const userKey = getCurrentClientAccessCacheKey();
  if(
    clientListSummaryCache
    && clientListSummaryCacheVersion === dossierDataVersion
    && clientListSummaryCacheUserKey === userKey
  ){
    return clientListSummaryCache;
  }
  const next = getVisibleClients().map(client=>({
    client,
    id: client?.id,
    name: String(client?.name || ''),
    nameLower: normalizeCaseInsensitiveSearchText(client?.name || ''),
    dossierCount: Array.isArray(client?.dossiers) ? client.dossiers.length : 0,
    canEdit: canEditClient(client)
  }));
  clientListSummaryCache = next;
  clientListSummaryCacheVersion = dossierDataVersion;
  clientListSummaryCacheUserKey = userKey;
  return next;
}

function getClientClotureCountTotal(){
  const userKey = getCurrentClientAccessCacheKey();
  if(
    clientClotureCountCacheVersion === dossierDataVersion
    && clientClotureCountCacheUserKey === userKey
  ){
    return clientClotureCountCacheValue;
  }
  const total = getVisibleClients().reduce((sum, client)=>{
    const dossiers = Array.isArray(client?.dossiers) ? client.dossiers : [];
    return sum + dossiers.reduce((clientSum, dossier)=>clientSum + getDossierClotureContribution(dossier), 0);
  }, 0);
  clientClotureCountCacheValue = total;
  clientClotureCountCacheVersion = dossierDataVersion;
  clientClotureCountCacheUserKey = userKey;
  return total;
}

function refreshKnownJudgesDatalist(options = {}){
  const jugeInput = $('salleJudgeInput');
  if(!jugeInput) return;
  const listId = 'knownJudgesList';
  let datalist = $(listId);
  if(!datalist){
    datalist = document.createElement('datalist');
    datalist.id = listId;
    document.body.appendChild(datalist);
  }
  jugeInput.setAttribute('list', listId);
  const shouldDefer = isVeryLargeLiveSyncMode() && options.force !== true && document.activeElement !== jugeInput;
  if(shouldDefer) return;
  const renderKey = [
    audienceRowsRawDataVersion,
    getCurrentClientAccessCacheKey(),
    shouldDefer ? 'deferred' : 'ready'
  ].join('||');
  if(renderKey === knownJudgesDatalistRenderKey) return;
  const known = getKnownJudges();
  setElementHtmlWithRenderKey(
    datalist,
    known.map(v=>`<option value="${escapeAttr(v)}"></option>`).join(''),
    renderKey,
    { trustRenderKey: true }
  );
  knownJudgesDatalistRenderKey = renderKey;
}

function scheduleCreationDropdownRender(delayMs = 60){
  creationDropdownRenderTimer = clearScheduledWarmupTimer(creationDropdownRenderTimer);
  creationDropdownRenderSeq += 1;
  const token = creationDropdownRenderSeq;
  const run = ()=>{
    if(token !== creationDropdownRenderSeq) return;
    creationDropdownRenderTimer = null;
    updateClientDropdown({ force: true, immediate: true });
  };
  const nextDelay = getAdaptiveUiBatchDelay(delayMs, {
    largeDatasetExtraMs: 120,
    busyExtraMs: 220,
    importExtraMs: 320
  });
  creationDropdownRenderTimer = setTimeout(()=>{
    if(token !== creationDropdownRenderSeq) return;
    if(typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'){
      creationDropdownRenderTimer = window.requestIdleCallback(()=>{
        creationDropdownRenderTimer = null;
        run();
      }, { timeout: 1500 });
      return;
    }
    creationDropdownRenderTimer = null;
    run();
  }, Math.max(0, Number(nextDelay) || 0));
}

function collectDeepValues(value, out = []){
  if(value === null || value === undefined) return out;
  if(Array.isArray(value)){
    value.forEach(v => collectDeepValues(v, out));
    return out;
  }
  if(typeof value === 'object'){
    Object.values(value).forEach(v => collectDeepValues(v, out));
    return out;
  }
  out.push(String(value));
  return out;
}

function escapeAttr(value){
  return escapeHtml(String(value ?? ''));
}

function normalizeLooseText(value){
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatMixedDirectionExportText(value){
  const text = normalizeLooseText(value);
  if(!text) return '';
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  const hasLatinOrDigits = /[A-Za-z0-9]/.test(text);
  if(!hasArabic || !hasLatinOrDigits) return text;
  return `\u200F${text.replace(/[A-Za-z0-9][A-Za-z0-9\s/+().:-]*/g, (segment)=>{
    const cleaned = String(segment || '').trim();
    return cleaned ? `\u2066${cleaned}\u2069` : '';
  })}`;
}

function getAudienceReferenceCellAlignment(layout, columnIndex){
  const idx = Math.max(0, Number(columnIndex) - 1);
  return {
    horizontal: layout.columnAlignments[idx] || 'left',
    vertical: 'middle',
    wrapText: layout.columnWrap[idx] === true,
    shrinkToFit: layout.columnShrinkToFit[idx] === true
  };
}

function normalizeCaseInsensitiveSearchText(value){
  return normalizeLooseText(value).toLowerCase();
}

function highlightSearchMatchHtml(value, query){
  const text = String(value ?? '');
  const rawQuery = String(query ?? '').trim();
  if(!text) return '';
  if(!rawQuery) return escapeHtml(text);
  const lowerText = text.toLowerCase();
  const lowerQuery = rawQuery.toLowerCase();
  if(!lowerQuery || !lowerText.includes(lowerQuery)){
    return escapeHtml(text);
  }
  let cursor = 0;
  let out = '';
  while(cursor < text.length){
    const idx = lowerText.indexOf(lowerQuery, cursor);
    if(idx === -1){
      out += escapeHtml(text.slice(cursor));
      break;
    }
    out += escapeHtml(text.slice(cursor, idx));
    out += `<em>${escapeHtml(text.slice(idx, idx + rawQuery.length))}</em>`;
    cursor = idx + rawQuery.length;
  }
  return out;
}

function normalizeImportedDossierStatus(value){
  const raw = String(value || '').trim();
  if(!raw) return { statut: 'En cours', detail: '' };
  const detectedStatus = detectCanonicalDossierStatus(raw);
  if(detectedStatus){
    return {
      statut: detectedStatus.statut || 'En cours',
      detail: detectedStatus.matchType === 'exact' ? '' : raw
    };
  }
  return { statut: 'En cours', detail: raw };
}

function makeTribunalFilterKey(value){
  const base = normalizeLooseText(value)
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u0640]/g, '') // Arabic tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[ة]/g, 'ه');
  // Ignore spaces to avoid duplicates like "بالدار البيضاء" vs "بالدارالبيضاء".
  return base
    .replace(/\s+/g, '')
    .replace(/[^\u0600-\u06FFa-z0-9]/g, '');
}

function getTextBigrams(text){
  const out = [];
  const src = String(text || '');
  if(src.length < 2) return out;
  for(let i = 0; i < src.length - 1; i++){
    out.push(src.slice(i, i + 2));
  }
  return out;
}

function getDiceSimilarity(a, b){
  const aa = String(a || '');
  const bb = String(b || '');
  if(!aa || !bb) return 0;
  if(aa === bb) return 1;
  const a2 = getTextBigrams(aa);
  const b2 = getTextBigrams(bb);
  if(!a2.length || !b2.length) return 0;
  const bCount = new Map();
  b2.forEach(g=>bCount.set(g, (bCount.get(g) || 0) + 1));
  let intersection = 0;
  a2.forEach(g=>{
    const count = bCount.get(g) || 0;
    if(count > 0){
      intersection += 1;
      bCount.set(g, count - 1);
    }
  });
  return (2 * intersection) / (a2.length + b2.length);
}

function getTribunalSimilarity(a, b){
  const aa = makeTribunalFilterKey(a);
  const bb = makeTribunalFilterKey(b);
  if(!aa || !bb) return 0;
  if(aa === bb) return 1;
  const minLen = Math.min(aa.length, bb.length);
  const maxLen = Math.max(aa.length, bb.length);
  const inclusion = (aa.includes(bb) || bb.includes(aa)) ? (minLen / maxLen) : 0;
  const dice = getDiceSimilarity(aa, bb);
  return Math.max(dice, inclusion);
}

function pickMostFrequentTribunalLabel(labelCounts){
  let bestLabel = '';
  let bestCount = -1;
  labelCounts.forEach((count, label)=>{
    const nextLabel = String(label || '');
    if(!nextLabel) return;
    if(count > bestCount){
      bestCount = count;
      bestLabel = nextLabel;
      return;
    }
    if(count === bestCount){
      const hasMoreWords = nextLabel.split(/\s+/).length > bestLabel.split(/\s+/).length;
      if(hasMoreWords || nextLabel.length > bestLabel.length){
        bestLabel = nextLabel;
      }
    }
  });
  return bestLabel;
}

function buildAudienceTribunalClusterState(rows){
  const keyCountMap = new Map();
  const keyLabelCountsMap = new Map();

  (rows || []).forEach(row=>{
    const label = normalizeLooseText(row?.p?.tribunal || '');
    if(!label) return;
    const key = makeTribunalFilterKey(label);
    if(!key) return;
    keyCountMap.set(key, (keyCountMap.get(key) || 0) + 1);
    if(!keyLabelCountsMap.has(key)) keyLabelCountsMap.set(key, new Map());
    const labelMap = keyLabelCountsMap.get(key);
    labelMap.set(label, (labelMap.get(label) || 0) + 1);
  });

  const keys = [...keyCountMap.keys()].sort((a, b)=>{
    const diff = (keyCountMap.get(b) || 0) - (keyCountMap.get(a) || 0);
    if(diff !== 0) return diff;
    return b.length - a.length;
  });

  const clusters = [];
  const SIMILARITY_THRESHOLD = 0.92;
  const INCLUSION_THRESHOLD = 0.88;

  keys.forEach(key=>{
    const count = keyCountMap.get(key) || 0;
    const labels = keyLabelCountsMap.get(key) || new Map();
    let bestCluster = null;
    let bestScore = 0;
    clusters.forEach(cluster=>{
      const score = getTribunalSimilarity(key, cluster.representativeKey);
      if(score > bestScore){
        bestScore = score;
        bestCluster = cluster;
      }
    });

    const canMergeBySimilarity = bestScore >= SIMILARITY_THRESHOLD;
    const canMergeByInclusion = !!bestCluster
      && (bestCluster.representativeKey.includes(key) || key.includes(bestCluster.representativeKey))
      && (Math.min(bestCluster.representativeKey.length, key.length) / Math.max(bestCluster.representativeKey.length, key.length)) >= INCLUSION_THRESHOLD;

    if(bestCluster && (canMergeBySimilarity || canMergeByInclusion)){
      bestCluster.totalCount += count;
      bestCluster.memberKeys.add(key);
      labels.forEach((c, label)=>{
        bestCluster.labelCounts.set(label, (bestCluster.labelCounts.get(label) || 0) + c);
      });
      if(count > bestCluster.representativeCount){
        bestCluster.representativeKey = key;
        bestCluster.representativeCount = count;
      }
      return;
    }

    const labelCounts = new Map();
    labels.forEach((c, label)=>labelCounts.set(label, c));
    clusters.push({
      representativeKey: key,
      representativeCount: count,
      totalCount: count,
      memberKeys: new Set([key]),
      labelCounts
    });
  });

  const aliasMap = new Map();
  const options = clusters.map(cluster=>{
    const label = pickMostFrequentTribunalLabel(cluster.labelCounts) || cluster.representativeKey;
    const clusterKey = makeTribunalFilterKey(label) || cluster.representativeKey;
    cluster.memberKeys.forEach(memberKey=>aliasMap.set(memberKey, clusterKey));
    aliasMap.set(clusterKey, clusterKey);
    return { key: clusterKey, label, count: cluster.totalCount };
  }).sort((a, b)=>a.label.localeCompare(b.label, 'fr'));

  return {
    aliasMap,
    options,
    keySet: new Set(options.map(v=>v.key))
  };
}

function resolveAudienceTribunalFilterKey(value){
  const rawKey = makeTribunalFilterKey(value);
  if(!rawKey) return '';
  return audienceTribunalAliasMap.get(rawKey) || rawKey;
}

function getAudienceTribunalFilterLabel(value){
  const key = resolveAudienceTribunalFilterKey(value);
  if(!key || key === 'all') return 'Tous';
  return audienceTribunalLabelMap.get(key) || String(value || '').trim() || 'Tous';
}

function resolveAudienceTribunalInputSelection(value, allowApproximate = false){
  const raw = normalizeLooseText(value || '');
  if(!raw) return { key: 'all', label: 'Tous' };
  const rawKey = makeTribunalFilterKey(raw);
  if(!rawKey) return null;
  const directKey = audienceTribunalAliasMap.get(rawKey) || rawKey;
  if(audienceTribunalLabelMap.has(directKey)){
    return { key: directKey, label: audienceTribunalLabelMap.get(directKey) || raw };
  }
  if(!allowApproximate) return null;

  let best = null;
  let bestScore = -1;
  audienceTribunalLabelMap.forEach((label, key)=>{
    const normalizedLabel = normalizeLooseText(label || '');
    if(!normalizedLabel) return;
    let score = -1;
    if(normalizedLabel === raw) score = 1000;
    else if(normalizedLabel.startsWith(raw)) score = 800 - Math.max(0, normalizedLabel.length - raw.length);
    else if(normalizedLabel.includes(raw)) score = 600 - Math.max(0, normalizedLabel.length - raw.length);
    else {
      const similarity = getTribunalSimilarity(rawKey, makeTribunalFilterKey(normalizedLabel));
      if(similarity >= 0.55) score = Math.round(similarity * 100);
    }
    if(score > bestScore){
      bestScore = score;
      best = { key, label };
    }
  });
  return bestScore >= 0 ? best : null;
}

function applyAudienceTribunalFilterFromInput(value, options = {}){
  const opts = options && typeof options === 'object' ? options : {};
  const selection = resolveAudienceTribunalInputSelection(value, !!opts.allowApproximate);
  if(!selection){
    return false;
  }
  const changed = filterAudienceTribunal !== selection.key;
  filterAudienceTribunal = selection.key;
  if(changed && opts.clearSelection !== false){
    clearAudiencePrintSelection({ immediate: true });
  }
  const tribunalInput = $('filterAudienceTribunal');
  if(tribunalInput){
    tribunalInput.value = selection.key === 'all' ? '' : selection.label;
  }
  renderAudience();
  return true;
}

function buildTribunalClusterStateFromLabels(labels){
  const keyCountMap = new Map();
  const keyLabelCountsMap = new Map();

  (labels || []).forEach(rawLabel=>{
    const label = normalizeLooseText(rawLabel || '');
    if(!label) return;
    const key = makeTribunalFilterKey(label);
    if(!key) return;
    keyCountMap.set(key, (keyCountMap.get(key) || 0) + 1);
    if(!keyLabelCountsMap.has(key)) keyLabelCountsMap.set(key, new Map());
    const labelMap = keyLabelCountsMap.get(key);
    labelMap.set(label, (labelMap.get(label) || 0) + 1);
  });

  const keys = [...keyCountMap.keys()].sort((a, b)=>{
    const diff = (keyCountMap.get(b) || 0) - (keyCountMap.get(a) || 0);
    if(diff !== 0) return diff;
    return b.length - a.length;
  });

  const clusters = [];
  const SIMILARITY_THRESHOLD = 0.92;
  const INCLUSION_THRESHOLD = 0.88;

  keys.forEach(key=>{
    const count = keyCountMap.get(key) || 0;
    const labelsMap = keyLabelCountsMap.get(key) || new Map();
    let bestCluster = null;
    let bestScore = 0;
    clusters.forEach(cluster=>{
      const score = getTribunalSimilarity(key, cluster.representativeKey);
      if(score > bestScore){
        bestScore = score;
        bestCluster = cluster;
      }
    });

    const canMergeBySimilarity = bestScore >= SIMILARITY_THRESHOLD;
    const canMergeByInclusion = !!bestCluster
      && (bestCluster.representativeKey.includes(key) || key.includes(bestCluster.representativeKey))
      && (Math.min(bestCluster.representativeKey.length, key.length) / Math.max(bestCluster.representativeKey.length, key.length)) >= INCLUSION_THRESHOLD;

    if(bestCluster && (canMergeBySimilarity || canMergeByInclusion)){
      bestCluster.totalCount += count;
      bestCluster.memberKeys.add(key);
      labelsMap.forEach((c, label)=>{
        bestCluster.labelCounts.set(label, (bestCluster.labelCounts.get(label) || 0) + c);
      });
      if(count > bestCluster.representativeCount){
        bestCluster.representativeKey = key;
        bestCluster.representativeCount = count;
      }
      return;
    }

    const labelCounts = new Map();
    labelsMap.forEach((c, label)=>labelCounts.set(label, c));
    clusters.push({
      representativeKey: key,
      representativeCount: count,
      totalCount: count,
      memberKeys: new Set([key]),
      labelCounts
    });
  });

  const aliasMap = new Map();
  const options = clusters.map(cluster=>{
    const label = pickMostFrequentTribunalLabel(cluster.labelCounts) || cluster.representativeKey;
    const clusterKey = makeTribunalFilterKey(label) || cluster.representativeKey;
    cluster.memberKeys.forEach(memberKey=>aliasMap.set(memberKey, clusterKey));
    aliasMap.set(clusterKey, clusterKey);
    return { key: clusterKey, label, count: cluster.totalCount };
  }).sort((a, b)=>a.label.localeCompare(b.label, 'fr'));

  return {
    aliasMap,
    options,
    keySet: new Set(options.map(v=>v.key))
  };
}

function resolveSuiviTribunalFilterKey(value){
  const rawKey = makeTribunalFilterKey(value);
  if(!rawKey) return '';
  return suiviTribunalAliasMap.get(rawKey) || rawKey;
}

function getSuiviTribunalFilterLabel(value){
  const key = resolveSuiviTribunalFilterKey(value);
  if(!key || key === 'all') return 'Tous';
  return suiviTribunalLabelMap.get(key) || String(value || '').trim() || 'Tous';
}

function resolveSuiviTribunalInputSelection(value, allowApproximate = false){
  const raw = normalizeLooseText(value || '');
  if(!raw) return { key: 'all', label: 'Tous' };
  const rawKey = makeTribunalFilterKey(raw);
  if(!rawKey) return null;
  const directKey = suiviTribunalAliasMap.get(rawKey) || rawKey;
  if(suiviTribunalLabelMap.has(directKey)){
    return { key: directKey, label: suiviTribunalLabelMap.get(directKey) || raw };
  }
  if(!allowApproximate) return null;

  let best = null;
  let bestScore = -1;
  suiviTribunalLabelMap.forEach((label, key)=>{
    const normalizedLabel = normalizeLooseText(label || '');
    if(!normalizedLabel) return;
    let score = -1;
    if(normalizedLabel === raw) score = 1000;
    else if(normalizedLabel.startsWith(raw)) score = 800 - Math.max(0, normalizedLabel.length - raw.length);
    else if(normalizedLabel.includes(raw)) score = 600 - Math.max(0, normalizedLabel.length - raw.length);
    else{
      const similarity = getTribunalSimilarity(rawKey, makeTribunalFilterKey(normalizedLabel));
      if(similarity >= 0.55) score = Math.round(similarity * 100);
    }
    if(score > bestScore){
      bestScore = score;
      best = { key, label };
    }
  });
  return bestScore >= 0 ? best : null;
}

function applySuiviTribunalFilterFromInput(value, options = {}){
  const opts = options && typeof options === 'object' ? options : {};
  const selection = resolveSuiviTribunalInputSelection(value, !!opts.allowApproximate);
  if(!selection){
    return false;
  }
  filterSuiviTribunal = selection.key;
  const tribunalInput = $('filterSuiviTribunal');
  if(tribunalInput){
    tribunalInput.value = selection.key === 'all' ? '' : selection.label;
  }
  renderSuivi();
  return true;
}

function resolveDiligenceTribunalFilterKey(value){
  const rawKey = makeTribunalFilterKey(value);
  if(!rawKey) return '';
  return diligenceTribunalAliasMap.get(rawKey) || rawKey;
}

function getDiligenceTribunalFilterLabel(value){
  const key = resolveDiligenceTribunalFilterKey(value);
  if(!key || key === 'all') return 'Tous';
  return diligenceTribunalLabelMap.get(key) || String(value || '').trim() || 'Tous';
}

function resolveDiligenceTribunalInputSelection(value, allowApproximate = false){
  const raw = normalizeLooseText(value || '');
  if(!raw) return { key: 'all', label: 'Tous' };
  const rawKey = makeTribunalFilterKey(raw);
  if(!rawKey) return null;
  const directKey = diligenceTribunalAliasMap.get(rawKey) || rawKey;
  if(diligenceTribunalLabelMap.has(directKey)){
    return { key: directKey, label: diligenceTribunalLabelMap.get(directKey) || raw };
  }
  if(!allowApproximate) return null;

  let best = null;
  let bestScore = -1;
  diligenceTribunalLabelMap.forEach((label, key)=>{
    const normalizedLabel = normalizeLooseText(label || '');
    if(!normalizedLabel) return;
    let score = -1;
    if(normalizedLabel === raw) score = 1000;
    else if(normalizedLabel.startsWith(raw)) score = 800 - Math.max(0, normalizedLabel.length - raw.length);
    else if(normalizedLabel.includes(raw)) score = 600 - Math.max(0, normalizedLabel.length - raw.length);
    else{
      const similarity = getTribunalSimilarity(rawKey, makeTribunalFilterKey(normalizedLabel));
      if(similarity >= 0.55) score = Math.round(similarity * 100);
    }
    if(score > bestScore){
      bestScore = score;
      best = { key, label };
    }
  });
  return bestScore >= 0 ? best : null;
}

function applyDiligenceTribunalFilterFromInput(value, options = {}){
  const opts = options && typeof options === 'object' ? options : {};
  const selection = resolveDiligenceTribunalInputSelection(value, !!opts.allowApproximate);
  if(!selection){
    return false;
  }
  filterDiligenceTribunal = selection.key;
  const tribunalInput = $('diligenceTribunalFilter');
  if(tribunalInput){
    tribunalInput.value = selection.key === 'all' ? '' : selection.label;
  }
  renderDiligence();
  return true;
}

function getProcedureShortLabel(procName){
  const raw = String(procName || '').trim();
  if(!raw) return '';
  const base = getProcedureBaseName(raw);
  const suffixMatch = raw.match(/(\d+)$/);
  const suffix = suffixMatch ? suffixMatch[1] : '';
  const map = {
    ASS: 'ASS',
    Restitution: 'RESTIT',
    Commandement: 'COMD',
    Nantissement: 'NANTI',
    Redressement: 'REDR',
    'Vérification de créance': 'VERIF',
    'Liquidation judiciaire': 'LIQ',
    SFDC: 'SFDC',
    'S/bien': 'SBIEN',
    Injonction: 'INJ'
  };
  const shortBase = map[base] || base.slice(0, 6).toUpperCase();
  return `${shortBase}${suffix}`;
}

function cloneProcedureMontantGroups(groups){
  if(!Array.isArray(groups)) return [];
  return groups.map(group=>({
    id: String(group?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    createdAt: Number(group?.createdAt || Date.now()),
    montant: String(group?.montant || ''),
    procedures: Array.isArray(group?.procedures)
      ? [...new Set(group.procedures.map(v=>String(v || '').trim()).filter(Boolean))]
      : []
  })).filter(group=>group.procedures.length > 0);
}

function normalizeProcedureMontantGroups(rawGroups, procedures = [], fallbackMontant = ''){
  const cleanProcedures = [...new Set((procedures || []).map(v=>String(v || '').trim()).filter(Boolean))];
  const normalized = cloneProcedureMontantGroups(rawGroups).map(group=>({
    ...group,
    procedures: group.procedures.filter(proc=>cleanProcedures.includes(proc))
  })).filter(group=>group.procedures.length > 0);

  if(normalized.length) return normalized;
  if(!cleanProcedures.length) return [];
  if(!String(fallbackMontant || '').trim()) return [];

  return [{
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    montant: String(fallbackMontant || ''),
    procedures: cleanProcedures
  }];
}

function renderProcedureMontantGroups(){
  const container = $('procedureMontantGroups');
  if(!container) return;
  if(!procedureMontantGroups.length){
    container.innerHTML = '<div class="procedure-montant-empty">Choisissez des procédures pour gérer les montants par groupe.</div>';
    return;
  }
  container.innerHTML = procedureMontantGroups.map((group, index)=>{
    const pills = group.procedures.map(proc=>{
      const procClass = getProcedureColorClass(proc) || 'proc-autre';
      return `<span class="procedure-montant-pill ${procClass}">${escapeHtml(getProcedureShortLabel(proc))}</span>`;
    }).join('');
    const title = `Montant ${index + 1}`;
    return `
      <div class="procedure-montant-group">
        <div>
          <p class="group-title">${escapeHtml(title)}</p>
          <div class="procedure-montant-pill-list">${pills}</div>
        </div>
        <div>
          <input
            type="text"
            inputmode="decimal"
            placeholder="Montant groupe ${index + 1}"
            value="${escapeAttr(group.montant || '')}"
            oninput="updateProcedureMontantGroupAmount(${index}, this.value)">
        </div>
      </div>
    `;
  }).join('');
}

function updateProcedureMontantGroupAmount(index, value){
  const group = procedureMontantGroups[index];
  if(!group) return;
  group.montant = String(value || '').trim();
}

function syncMainMontantToGroup1(value){
  if(editingDossier) return;
  const normalized = String(value || '').trim();
  if(!procedureMontantGroups.length) return;
  if(!procedureMontantGroups[0]) return;
  procedureMontantGroups[0].montant = normalized;
  const input = document.querySelector('#procedureMontantGroups .procedure-montant-group input');
  if(input && String(input.value || '').trim() !== normalized){
    input.value = normalized;
  }
}

function hasMultipleAffectationDatesForSelection(selectedProcedures){
  const selected = [...new Set((selectedProcedures || []).map(v=>String(v || '').trim()).filter(Boolean))];
  if(selected.length <= 1) return false;
  const dateSet = new Set();
  const draft = collectProcedureDraft();
  let fallbackDate = '';

  if(editingDossier){
    const data = getDossierByIds(editingDossier.clientId, editingDossier.index);
    const dossier = data?.dossier;
    fallbackDate = normalizeDateDDMMYYYY(dossier?.dateAffectation || '') || String(dossier?.dateAffectation || '').trim();
    selected.forEach(proc=>{
      const fromDraft = normalizeDateDDMMYYYY(draft?.[proc]?.dateDepot || '') || String(draft?.[proc]?.dateDepot || '').trim();
      const fromDetails = normalizeDateDDMMYYYY(dossier?.procedureDetails?.[proc]?.dateDepot || '') || String(dossier?.procedureDetails?.[proc]?.dateDepot || '').trim();
      const value = fromDraft || fromDetails || fallbackDate;
      if(value) dateSet.add(value);
    });
  }else{
    fallbackDate = normalizeDateDDMMYYYY($('dateAffectation')?.value || '') || String($('dateAffectation')?.value || '').trim();
    selected.forEach(proc=>{
      const fromDraft = normalizeDateDDMMYYYY(draft?.[proc]?.dateDepot || '') || String(draft?.[proc]?.dateDepot || '').trim();
      const value = fromDraft || fallbackDate;
      if(value) dateSet.add(value);
    });
  }

  return dateSet.size > 1;
}

function hasNewProceduresComparedToOriginal(selectedProcedures){
  if(!editingDossier) return false;
  const selected = [...new Set((selectedProcedures || []).map(v=>String(v || '').trim()).filter(Boolean))];
  if(!selected.length) return false;
  const originalSet = new Set((editingOriginalProcedures || []).map(v=>String(v || '').trim()).filter(Boolean));
  if(!originalSet.size) return false;
  return selected.some(proc=>!originalSet.has(proc));
}

function syncProcedureMontantGroups(selectedProcedures){
  const selected = [...new Set((selectedProcedures || []).map(v=>String(v || '').trim()).filter(Boolean))];
  if(!selected.length){
    procedureMontantGroups = [];
    renderProcedureMontantGroups();
    return;
  }

  procedureMontantGroups = cloneProcedureMontantGroups(procedureMontantGroups).map(group=>({
    ...group,
    procedures: group.procedures.filter(proc=>selected.includes(proc))
  })).filter(group=>group.procedures.length > 0);

  const allowSecondGroup = hasMultipleAffectationDatesForSelection(selected)
    || hasNewProceduresComparedToOriginal(selected);

  // In "new dossier" mode, keep a single montant group only.
  // Group splitting (Montant 2) is reserved for dossier modification mode.
  if(!editingDossier || !allowSecondGroup){
    const mainMontantValue = String($('montantInput')?.value || '').trim();
    const now = Date.now();
    const resolvedMontantValue = mainMontantValue
      || String(procedureMontantGroups[0]?.montant || '').trim()
      || '';
    if(!procedureMontantGroups.length){
      procedureMontantGroups = [{
        id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        montant: resolvedMontantValue,
        procedures: selected
      }];
    }else{
      const first = procedureMontantGroups[0];
      const merged = new Set(first.procedures);
      selected.forEach(proc=>merged.add(proc));
      first.procedures = [...merged];
      if(resolvedMontantValue){
        first.montant = resolvedMontantValue;
      }
      procedureMontantGroups = [first];
    }
    renderProcedureMontantGroups();
    return;
  }

  // Keep at most 2 montant groups:
  // - Montant 1: original procedures
  // - Montant 2: all newly added procedures
  if(procedureMontantGroups.length > 2){
    const second = procedureMontantGroups[1];
    const mergedSet = new Set(second.procedures);
    for(let i = 2; i < procedureMontantGroups.length; i++){
      procedureMontantGroups[i].procedures.forEach(proc=>mergedSet.add(proc));
    }
    second.procedures = [...mergedSet];
    procedureMontantGroups = procedureMontantGroups.slice(0, 2);
  }

  const assigned = new Set(procedureMontantGroups.flatMap(group=>group.procedures));
  const now = Date.now();
  const missing = selected.filter(proc=>!assigned.has(proc));

  if(missing.length){
    if(procedureMontantGroups.length === 0){
      procedureMontantGroups.push({
        id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        montant: '',
        procedures: missing
      });
    }else if(procedureMontantGroups.length === 1){
      procedureMontantGroups.push({
        id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        montant: '',
        procedures: missing
      });
    }else{
      const second = procedureMontantGroups[1];
      const mergedSet = new Set(second.procedures);
      missing.forEach(proc=>mergedSet.add(proc));
      second.procedures = [...mergedSet];
    }
  }

  renderProcedureMontantGroups();
}

function getProcedureMontantGroupsForSave(){
  return cloneProcedureMontantGroups(procedureMontantGroups);
}

function normalizeHeader(value){
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildHeaderMap(row){
  const map = {};
  row.forEach((cell, idx)=>{
    const key = normalizeHeader(cell);
    if(key && map[key] === undefined) map[key] = idx;
  });
  return map;
}

function getColIndex(map, keys){
  for(const key of keys){
    const idx = map[key];
    if(idx !== undefined) return idx;
  }
  return -1;
}

function ensureExcelHtmlUtf8(html){
  const text = String(html || '');
  if(/<meta[^>]+charset\s*=/i.test(text)) return text;
  return text.replace(
    /<head>/i,
    '<head><meta charset="UTF-8"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">'
  );
}

function createExcelUtf8Blob(html){
  const utf8Html = ensureExcelHtmlUtf8(html);
  return new Blob(['\uFEFF', utf8Html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
}

function createXlsxBlobFromWorkbook(wb){
  if(typeof XLSX === 'undefined' || !wb) return null;
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob(
    [buffer],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
}

function escapeCsvCell(value){
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

async function createMappedCsvBlobChunked({ headers, items, mapRow, separator = ';', progressLabel = 'Export CSV', chunkSize = 200 }){
  const list = Array.isArray(items) ? items : [];
  const mapper = typeof mapRow === 'function' ? mapRow : (value)=>value;
  const safeSeparator = String(separator || ';');
  const useWorker = list.length >= 1000;
  if(useWorker){
    const mappedRows = new Array(list.length);
    await runChunked(list, async (item, index, total)=>{
      const row = await mapper(item, index, total);
      mappedRows[index] = Array.isArray(row) ? row : [];
    }, {
      chunkSize,
      onProgress: makeProgressReporter(progressLabel)
    });
    const workerBlob = await createCsvBlobInWorker({
      headers,
      rows: mappedRows,
      separator: safeSeparator
    });
    if(workerBlob){
      return workerBlob;
    }
  }
  const parts = ['\uFEFF'];
  if(Array.isArray(headers) && headers.length){
    parts.push(headers.map(escapeCsvCell).join(safeSeparator), '\r\n');
  }
  await runChunked(list, async (item, index, total)=>{
    const row = await mapper(item, index, total);
    const values = Array.isArray(row) ? row : [];
    parts.push(values.map(escapeCsvCell).join(safeSeparator), '\r\n');
  }, {
    chunkSize,
    onProgress: makeProgressReporter(progressLabel)
  });
  return new Blob(parts, { type: 'text/csv;charset=utf-8;' });
}

function primeBrowserDownloadTarget(title = 'Preparation du fichier...'){
  if(typeof window === 'undefined' || typeof window.open !== 'function') return null;
  try{
    const popup = window.open('', '_blank');
    if(!popup) return null;
    try{
      popup.document.title = String(title || 'Preparation du fichier...');
      if(popup.document.body){
        popup.document.body.innerHTML = '<div style="font-family:Arial,sans-serif;padding:24px;">Preparation du fichier Excel...</div>';
      }
    }catch(_){}
    return popup;
  }catch(err){
    console.warn('Ouverture fenetre de telechargement impossible', err);
    return null;
  }
}

function triggerBrowserDownloadFromBlob(blob, filename, options = {}){
  if(!blob) return false;
  const url = URL.createObjectURL(blob);
  const browserTarget = options.browserDownloadTarget && !options.browserDownloadTarget.closed
    ? options.browserDownloadTarget
    : null;
  const openInline = options.openInline === true;
  let a = null;
  if(openInline){
    try{
      if(browserTarget && !browserTarget.closed){
        browserTarget.location.href = url;
        browserTarget.focus();
      }else{
        window.open(url, '_blank', 'noopener');
      }
    }catch(err){
      console.warn('Ouverture directe du fichier impossible, fallback telechargement', err);
      try{
        const ownerDocument = browserTarget?.document || document;
        a = ownerDocument.createElement('a');
        a.href = url;
        a.download = String(filename || 'export');
        a.rel = 'noopener';
        a.style.display = 'none';
        ownerDocument.body.appendChild(a);
        a.click();
      }catch(downloadErr){
        console.warn('Telechargement direct impossible apres echec ouverture', downloadErr);
      }
    }
    setTimeout(()=>{
      try{ a?.remove(); }catch(_){}
      try{ URL.revokeObjectURL(url); }catch(_){}
    }, 60000);
    return true;
  }
  try{
    const ownerDocument = browserTarget?.document || document;
    a = ownerDocument.createElement('a');
    a.href = url;
    a.download = String(filename || 'export');
    a.rel = 'noopener';
    a.style.display = 'none';
    ownerDocument.body.appendChild(a);
    a.click();
  }catch(err){
    console.warn('Telechargement direct impossible, ouverture URL blob', err);
    if(browserTarget && !browserTarget.closed){
      try{
        browserTarget.location.href = url;
      }catch(_){
        window.open(url, '_blank', 'noopener');
      }
    }else{
      window.open(url, '_blank', 'noopener');
    }
  }
  setTimeout(()=>{
    try{ a?.remove(); }catch(_){}
    try{
      if(browserTarget && !browserTarget.closed) browserTarget.close();
    }catch(_){}
    try{ URL.revokeObjectURL(url); }catch(_){}
  }, 30000);
  return true;
}

async function primeBrowserSaveFileHandle(filename = 'export.xlsx', options = {}){
  if(typeof window === 'undefined') return null;
  if(window.isSecureContext !== true) return null;
  if(typeof window.showSaveFilePicker !== 'function') return null;
  try{
    return await window.showSaveFilePicker({
      suggestedName: String(filename || 'export.xlsx'),
      types: [{
        description: String(options.description || 'Fichier Excel'),
        accept: {
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
        }
      }]
    });
  }catch(err){
    if(String(err?.name || '') === 'AbortError') return false;
    console.warn('Selection du fichier export impossible', err);
    return null;
  }
}

function canUseDirectBrowserExport(){
  return typeof window !== 'undefined'
    && window.isSecureContext === true
    && typeof window.showDirectoryPicker === 'function';
}

async function ensureExportDirectoryPermission(handle, options = {}){
  if(!handle) return false;
  const prompt = options.prompt === true;
  const permissionOptions = { mode: 'readwrite' };
  try{
    if(typeof handle.queryPermission === 'function'){
      const status = await handle.queryPermission(permissionOptions);
      if(status === 'granted') return true;
      if(status === 'denied') return false;
    }
    if(prompt && typeof handle.requestPermission === 'function'){
      const status = await handle.requestPermission(permissionOptions);
      return status === 'granted';
    }
  }catch(err){
    console.warn('Permission export direct introuvable', err);
    return false;
  }
  return true;
}

async function writeBlobToDirectoryHandle(handle, filename, blob){
  if(!handle || !blob) return false;
  const fileHandle = await handle.getFileHandle(String(filename || 'export'), { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
  return true;
}

async function writeBlobToFileHandle(fileHandle, blob){
  if(!fileHandle || !blob) return false;
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
  return true;
}

function primeDirectExportDirectoryAccess(){
  return Promise.resolve(null);
}

async function saveBlobDirectOrDownload(blob, filename, options = {}){
  if(!blob){
    console.warn('Aucun contenu à exporter pour', filename);
    return 'error';
  }
  const preferredFileHandle = options.preferredFileHandle || null;
  if(preferredFileHandle){
    try{
      await writeBlobToFileHandle(preferredFileHandle, blob);
      return 'file-handle';
    }catch(err){
      console.warn('Export fichier direct impossible, fallback telechargement', err);
    }
  }
  if(hasDesktopExportBridge()){
    try{
      const desktopResult = await saveBlobViaDesktopExportBridge(blob, filename);
      if(desktopResult?.ok){
        return options.openAfterExport === true ? 'desktop-open' : 'desktop-save';
      }
      const details = String(desktopResult?.error || '').trim();
      if(details){
        console.warn('Export desktop impossible', details);
      }
    }catch(err){
      console.warn('Export desktop impossible', err);
    }
  }
  const fallback = ()=>triggerBrowserDownloadFromBlob(blob, filename, {
    browserDownloadTarget: options.browserDownloadTarget || null,
    openInline: options.browserOpenInline === true
  });
  if(options.direct !== true){
    fallback();
    return 'download';
  }
  const candidateHandle = options.preferredHandle || null;
  if(!canUseDirectBrowserExport()){
    fallback();
    return 'download';
  }

  let handle = candidateHandle;
  if(handle){
    const granted = await ensureExportDirectoryPermission(handle, { prompt: false });
    if(!granted) handle = null;
  }
  if(!handle){
    handle = await ensurePreferredExportDirectoryHandle({ prompt: options.prompt !== false });
  }

  if(handle){
    try{
      await writeBlobToDirectoryHandle(handle, filename, blob);
      return 'direct';
    }catch(err){
      console.warn('Export direct impossible, fallback téléchargement', err);
      await clearPreferredExportDirectoryHandle();
    }
  }

  fallback();
  return 'download';
}

async function exportAudienceWorkbookXlsxStyled({ headers, rows, subtitle = '', sheetName = 'Audience', colWidths = [], filename = 'audience_export.xlsx', preferWorker = false, openAfterExport = false, layoutPreset = 'default', browserDownloadTarget = null, browserOpenInline = false, preferredFileHandle = null, wrapColumnIndexes = [] }){
  const directExportHandlePromise = primeDirectExportDirectoryAccess();
  const colCount = Array.isArray(headers) ? headers.length : 0;
  const rowCount = Array.isArray(rows) ? rows.length : 0;
  const useAudienceReferenceLayout = layoutPreset === 'audience-reference';
  const useAudienceCompactReferenceLayout = useAudienceReferenceLayout && colCount === 6;
  const useSuiviReferenceLayout = layoutPreset === 'suivi-reference';
  const instructionColumnIndex = Array.isArray(headers)
    ? headers.findIndex((header)=>String(header || '').trim().toLowerCase() === 'instruction')
    : -1;
  const defaultWrapColumnIndexes = useAudienceReferenceLayout
    ? [0, 1, Math.max(0, colCount - 1), instructionColumnIndex]
    : [];
  const normalizedWrapColumnIndexes = [...new Set(
    [
      ...(Array.isArray(wrapColumnIndexes) ? wrapColumnIndexes : []),
      ...defaultWrapColumnIndexes
    ]
      .map((value)=>Number(value))
      .filter((value)=>Number.isInteger(value) && value >= 0)
  )];
  const wrapColumnIndexSet = new Set(normalizedWrapColumnIndexes);
  const useCompactAudienceFastWorkbookPath = useAudienceCompactReferenceLayout
    && (preferWorker === true || shouldPreferFastWorkbookPath(rowCount));
  const useFastWorkbookPath = useCompactAudienceFastWorkbookPath || (
    !useAudienceReferenceLayout
    && !useSuiviReferenceLayout
    && !wrapColumnIndexSet.size
    && (preferWorker === true || shouldPreferFastWorkbookPath(rowCount))
  );
  const subtitleText = String(subtitle || '').trim();
  const editionDateText = formatDateDDMMYYYY(new Date());
  const editionLabelText = editionDateText ? `Edition le ${editionDateText}` : 'Edition le';
  const compactAudienceHeaderText = useAudienceCompactReferenceLayout ? '' : editionLabelText;
  const compactAudienceSubtitleText = useAudienceCompactReferenceLayout ? editionLabelText : subtitleText;
  const genericHeaderText = useSuiviReferenceLayout ? editionLabelText : compactAudienceHeaderText;
  const genericSubtitleText = useSuiviReferenceLayout ? '' : compactAudienceSubtitleText;
  const hasGenericSubtitleRow = !useSuiviReferenceLayout;
  const genericHeaderRowNumber = hasGenericSubtitleRow ? 5 : 4;
  const genericDataStartRowNumber = genericHeaderRowNumber + 1;
  const createAudienceSubtitleCellValue = ()=>{
    const richText = [];
    if(subtitleText){
      richText.push({
        text: subtitleText,
        font: { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1A4590' } }
      });
    }
    if(editionLabelText){
      if(richText.length){
        richText.push({
          text: '   ',
          font: { name: 'Arial', size: 11, color: { argb: 'FF111111' } }
        });
      }
      richText.push({
        text: editionLabelText,
        font: { name: 'Arial', size: 11, bold: true, color: { argb: 'FF111111' } }
      });
    }
    if(!richText.length) return '';
    return { richText };
  };
  const excelReady = await ensureExcelLibraries({ needXlsx: true, needExcelJs: !useFastWorkbookPath });
  if(!excelReady) return;
  if(useFastWorkbookPath){
    const workerBlob = await createXlsxBlobInWorker({
      headers,
      rows,
      subtitle: subtitleText,
      editionLabel: editionLabelText,
      sheetName,
      colWidths
    });
    if(workerBlob){
      await saveBlobDirectOrDownload(workerBlob, filename, {
        preferredHandle: await directExportHandlePromise,
        openAfterExport,
        browserDownloadTarget,
        browserOpenInline,
        preferredFileHandle
      });
      return;
    }
  }
  if(useFastWorkbookPath || typeof ExcelJS === 'undefined'){
    if(typeof XLSX === 'undefined'){
      alert('Export XLSX indisponible: librairie Excel non chargée.');
      return;
    }
    await yieldToMainThread();
    const aoa = hasGenericSubtitleRow
      ? [
        ['CABINET ARAQUI HOUSSAINI'],
        [genericHeaderText],
        [genericSubtitleText],
        [],
        headers,
        ...rows
      ]
      : [
        ['CABINET ARAQUI HOUSSAINI'],
        [genericHeaderText],
        [],
        headers,
        ...rows
      ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = colWidths.length ? colWidths : new Array(headers.length).fill({ wch: 20 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const blob = createXlsxBlobFromWorkbook(wb);
    await saveBlobDirectOrDownload(blob, filename, {
      preferredHandle: await directExportHandlePromise,
      openAfterExport,
      browserDownloadTarget,
      browserOpenInline,
      preferredFileHandle
    });
    return;
  }

  const lastColLetter = String.fromCharCode(64 + Math.max(1, colCount));
  const audienceReferenceLayout = {
    columnWidths: (
      Array.isArray(colWidths) && colWidths.length === colCount
        ? colWidths.map((value)=>Math.max(8, Number(value?.wch || value || 20)))
        : [14.77734375, 20.6640625, 16.33203125, 13.77734375, 16.77734375, 23.21875, 26.88671875]
    ),
    rowHeights: {
      1: 14.4,
      2: 14.4,
      3: 14.4,
      4: 14.4,
      5: 35.25,
      6: 24,
      7: 9.6,
      8: 36.75
    },
    dataRowHeight: 35.25,
    imageAnchor: {
      tl: { col: 1.512, row: 0.154 },
      br: { col: 6.183, row: 4.862 }
    },
    pageMargins: { left: 0, right: 0, top: 0, bottom: 0, header: 0, footer: 0 },
    pageSetup: { orientation: 'landscape' },
    columnAlignments: ['center', 'left', 'center', 'center', 'center', 'left', 'center'],
    columnWrap: [true, true, false, false, true, false, true],
    columnShrinkToFit: [false, false, false, false, true, false, false]
  };
  const estimateWrappedLineCountForWidth = (value, width)=>{
    const text = String(value ?? '');
    if(!text) return 1;
    const safeWidth = Math.max(8, Number(width) || 20);
    return text
      .split(/\r?\n/)
      .reduce((maxLines, segment)=>{
        const segmentLength = String(segment || '').length;
        const estimatedLines = Math.max(1, Math.ceil(segmentLength / Math.max(1, Math.floor(safeWidth * 0.95))));
        return Math.max(maxLines, estimatedLines);
      }, 1);
  };
  const getAudienceReferenceRowHeight = (rowValues)=>{
    const values = Array.isArray(rowValues) ? rowValues : [];
    let maxLines = 1;
    audienceReferenceLayout.columnWrap.forEach((shouldWrap, index)=>{
      if(!shouldWrap) return;
      const width = audienceReferenceLayout.columnWidths[index] || 20;
      maxLines = Math.max(
        maxLines,
        estimateWrappedLineCountForWidth(values[index], width)
      );
    });
    return Math.max(
      audienceReferenceLayout.dataRowHeight,
      18 + (maxLines * 18)
    );
  };
  const audienceReferenceBodyBorder = {
    top: { style: 'thin', color: { argb: 'FF1A1A1A' } },
    left: { style: 'thin', color: { argb: 'FF1A1A1A' } },
    bottom: { style: 'thin', color: { argb: 'FF1A1A1A' } },
    right: { style: 'thin', color: { argb: 'FF1A1A1A' } }
  };
  const audienceReferenceHeaderBorder = {
    top: { style: 'thin', color: { argb: 'FF111111' } },
    left: { style: 'thin', color: { argb: 'FF111111' } },
    bottom: { style: 'thin', color: { argb: 'FF111111' } },
    right: { style: 'thin', color: { argb: 'FF111111' } }
  };

  if(useAudienceReferenceLayout && colCount === 7){
    try{
      const templateArrayBuffer = await getAudienceExportTemplateArrayBuffer();
      if(templateArrayBuffer){
        const templateWorkbook = new ExcelJS.Workbook();
        await templateWorkbook.xlsx.load(templateArrayBuffer);
        const templateSheet = templateWorkbook.getWorksheet('Audience') || templateWorkbook.worksheets[0];
        if(!templateSheet) throw new Error('Feuille template audience introuvable');
        const sampleRow = templateSheet.getRow(9);
        const sampleRowHeight = Number(sampleRow.height || 35.25);
        const existingRowsToDelete = Math.max(0, Number(templateSheet.rowCount || 0) - 9);
        if(existingRowsToDelete > 0){
          templateSheet.spliceRows(10, existingRowsToDelete);
        }
        if(rows.length > 1){
          templateSheet.duplicateRow(9, rows.length - 1, true);
        }
        templateSheet.getCell('A5').value = '';
        templateSheet.getCell('A6').value = createAudienceSubtitleCellValue();
        templateSheet.views = [{ showGridLines: false }];
        templateSheet.columns = audienceReferenceLayout.columnWidths.map(width=>({ width }));
        templateSheet.getRow(8).height = 38;
        const templateSubtitleCell = templateSheet.getCell('A6');
        templateSubtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        await runChunked(rows, async (row, index)=>{
          const rowIndex = index + 9;
          const sheetRow = templateSheet.getRow(rowIndex);
          sheetRow.values = Array.isArray(row) ? row.slice(0, colCount) : new Array(colCount).fill('');
          sheetRow.height = Math.max(sampleRowHeight, getAudienceReferenceRowHeight(row));
          for(let c = 1; c <= colCount; c++){
            const cell = sheetRow.getCell(c);
            cell.font = { name: 'Calibri', size: 14, color: { argb: 'FF111111' } };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFFFF' }
            };
            cell.alignment = getAudienceReferenceCellAlignment(audienceReferenceLayout, c);
            cell.border = audienceReferenceBodyBorder;
          }
        }, { chunkSize: 120 });
        await yieldToMainThread();
        const templateBuffer = await promiseWithTimeout(
          templateWorkbook.xlsx.writeBuffer(),
          30000,
          'Export audience template Excel'
        );
        const templateBlob = new Blob(
          [templateBuffer],
          { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        );
        await saveBlobDirectOrDownload(templateBlob, filename, {
          preferredHandle: await directExportHandlePromise,
          openAfterExport,
          browserDownloadTarget,
          browserOpenInline,
          preferredFileHandle
        });
        return;
      }
    }catch(err){
      console.warn('Export audience via template impossible, fallback layout manuel', err);
    }
  }

  let workbook = new ExcelJS.Workbook();
  let sheet = workbook.addWorksheet(sheetName);

  if(useAudienceReferenceLayout && colCount === 7){
    try{
      sheet.views = [{ showGridLines: false }];
      sheet.pageSetup = { ...audienceReferenceLayout.pageSetup };
      sheet.pageMargins = { ...audienceReferenceLayout.pageMargins };
      sheet.columns = audienceReferenceLayout.columnWidths.map(width=>({ width }));

      sheet.mergeCells(`A5:${lastColLetter}5`);
      sheet.mergeCells(`A6:${lastColLetter}6`);
      sheet.getCell('A5').value = '';
      sheet.getCell('A6').value = createAudienceSubtitleCellValue();
      Object.entries(audienceReferenceLayout.rowHeights).forEach(([rowNumber, height])=>{
        sheet.getRow(Number(rowNumber)).height = Number(height);
      });

      headers.forEach((header, index)=>{
        sheet.getRow(8).getCell(index + 1).value = header;
      });
      sheet.getRow(8).height = 38;
      await runChunked(rows, async (row, index)=>{
        const rowNumber = index + 9;
        const sheetRow = sheet.getRow(rowNumber);
        sheetRow.values = Array.isArray(row) ? row : [];
        sheetRow.height = getAudienceReferenceRowHeight(row);
      }, { chunkSize: 80 });

      for(let c = 1; c <= colCount; c++){
        const topCell = sheet.getRow(5).getCell(c);
        topCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' }
        };
        topCell.border = {
          bottom: { style: 'thin', color: { argb: 'FF2F6FB1' } }
        };

        const headerCell = sheet.getRow(8).getCell(c);
        headerCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        headerCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1A4590' }
        };
        headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
        headerCell.border = audienceReferenceHeaderBorder;
      }

      const subtitleCell = sheet.getCell('A6');
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      await runChunked(rows, async (row, index)=>{
        const rowIndex = index + 9;
        const sheetRow = sheet.getRow(rowIndex);
        sheetRow.height = getAudienceReferenceRowHeight(row);
        for(let c = 1; c <= colCount; c++){
          const cell = sheetRow.getCell(c);
          cell.value = Array.isArray(row) ? (row[c - 1] ?? '') : '';
          cell.font = { name: 'Calibri', size: 14, color: { argb: 'FF111111' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' }
          };
          cell.alignment = getAudienceReferenceCellAlignment(audienceReferenceLayout, c);
          cell.border = audienceReferenceBodyBorder;
        }
      }, { chunkSize: 40 });

      const headerImageDataUrl = await getAudienceExportHeaderImageDataUrl();
      if(headerImageDataUrl){
        const imageId = workbook.addImage({
          base64: headerImageDataUrl,
          extension: 'jpeg'
        });
        sheet.addImage(imageId, { ...audienceReferenceLayout.imageAnchor, editAs: 'oneCell' });
      }

      await yieldToMainThread();
      const buffer = await promiseWithTimeout(
        workbook.xlsx.writeBuffer(),
        30000,
        'Export audience Excel'
      );
      const blob = new Blob(
        [buffer],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );
      await saveBlobDirectOrDownload(blob, filename, {
        preferredHandle: await directExportHandlePromise,
        openAfterExport,
        browserDownloadTarget,
        browserOpenInline,
        preferredFileHandle
      });
      return;
    }catch(err){
      console.warn('Export audience avec logo impossible', err);
      // Reset the workbook before falling back to the generic export layout.
      workbook = new ExcelJS.Workbook();
      sheet = workbook.addWorksheet(sheetName);
    }
  }

  sheet.getCell('A1').value = 'CABINET ARAQUI HOUSSAINI';
  sheet.getCell('A2').value = genericHeaderText;
  sheet.mergeCells(`A1:${lastColLetter}1`);
  sheet.mergeCells(`A2:${lastColLetter}2`);
  if(hasGenericSubtitleRow){
    sheet.getCell('A3').value = genericSubtitleText;
    sheet.mergeCells(`A3:${lastColLetter}3`);
  }
  sheet.addRow([]);
  sheet.addRow(headers);
  await runChunked(rows, async (row)=>{
    sheet.addRow(row);
  }, { chunkSize: 80 });

  const widthValues = colWidths.length
    ? colWidths.map(v=>Number(v?.wch || 20))
    : new Array(colCount).fill(22);
  sheet.columns = widthValues.map(w=>({ width: w }));

  const genericLayoutConfig = useSuiviReferenceLayout
    ? {
      titleRowHeight: 28.25,
      subtitleRowHeight: 19.25,
      headerRowHeight: 34.75,
      baseDataRowHeight: 28.25,
      titleFontSize: 24,
      subtitleFontSize: 17,
      headerFontSize: 16,
      bodyFontSize: 14,
      wrapLineHeight: 17.25
    }
    : useAudienceCompactReferenceLayout
      ? {
        titleRowHeight: 28.2,
        subtitleRowHeight: 19.2,
        headerRowHeight: 29.4,
        baseDataRowHeight: 28.2,
        titleFontSize: 20,
        subtitleFontSize: 16,
        headerFontSize: 14,
        bodyFontSize: 14,
        wrapLineHeight: 16.8
      }
      : {
        titleRowHeight: 44,
        subtitleRowHeight: 30,
        headerRowHeight: 46,
        baseDataRowHeight: 44,
        titleFontSize: useAudienceReferenceLayout ? 20 : 24,
        subtitleFontSize: useAudienceReferenceLayout ? 16 : 17,
        headerFontSize: useAudienceReferenceLayout ? 14 : 20,
        bodyFontSize: useAudienceReferenceLayout ? 14 : 18,
        wrapLineHeight: 20
      };

  const estimateWrappedLineCount = (value, width)=>{
    const text = String(value ?? '');
    if(!text) return 1;
    const safeWidth = Math.max(8, Number(width) || 20);
    return text
      .split(/\r?\n/)
      .reduce((maxLines, segment)=>{
        const segmentLength = String(segment || '').length;
        const estimatedLines = Math.max(1, Math.ceil(segmentLength / Math.max(1, Math.floor(safeWidth * 0.95))));
        return Math.max(maxLines, estimatedLines);
      }, 1);
  };

  sheet.getRow(1).height = genericLayoutConfig.titleRowHeight;
  sheet.getRow(2).height = genericLayoutConfig.subtitleRowHeight;
  if(hasGenericSubtitleRow){
    sheet.getRow(3).height = genericLayoutConfig.subtitleRowHeight;
  }
  sheet.getRow(genericHeaderRowNumber).height = genericLayoutConfig.headerRowHeight;
  await runChunked(Array.from({ length: rows.length }, (_, index)=>index + genericDataStartRowNumber), async (rowIndex)=>{
    let nextHeight = genericLayoutConfig.baseDataRowHeight;
    if(wrapColumnIndexSet.size){
      const rowValues = Array.isArray(rows[rowIndex - genericDataStartRowNumber]) ? rows[rowIndex - genericDataStartRowNumber] : [];
      normalizedWrapColumnIndexes.forEach((colIndex)=>{
        const estimatedLines = estimateWrappedLineCount(rowValues[colIndex], widthValues[colIndex]);
        if(estimatedLines > 1){
          nextHeight = Math.max(
            nextHeight,
            18 + ((estimatedLines - 1) * genericLayoutConfig.wrapLineHeight)
          );
        }
      });
    }
    sheet.getRow(rowIndex).height = nextHeight;
  }, { chunkSize: 120 });

  const border = {
    top: { style: 'thin', color: { argb: 'FFBFC5CE' } },
    left: { style: 'thin', color: { argb: 'FFBFC5CE' } },
    bottom: { style: 'thin', color: { argb: 'FFBFC5CE' } },
    right: { style: 'thin', color: { argb: 'FFBFC5CE' } }
  };

  sheet.getCell('A1').font = { name: 'Arial', size: genericLayoutConfig.titleFontSize, bold: true, color: { argb: 'FF1F3B8F' } };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('A2').font = {
    name: 'Arial',
    size: useSuiviReferenceLayout ? genericLayoutConfig.subtitleFontSize : Math.max(13, genericLayoutConfig.subtitleFontSize - 1),
    bold: true,
    color: { argb: useSuiviReferenceLayout ? 'FF111111' : 'FF1A4590' }
  };
  sheet.getCell('A2').alignment = { horizontal: useSuiviReferenceLayout ? 'center' : 'left', vertical: 'middle' };
  if(hasGenericSubtitleRow){
    sheet.getCell('A3').font = { name: 'Arial', size: genericLayoutConfig.subtitleFontSize, bold: true, color: { argb: 'FF1A4590' } };
    sheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }

  for(let c=1; c<=colCount; c++){
    const cell = sheet.getRow(genericHeaderRowNumber).getCell(c);
    cell.font = { name: 'Arial', size: genericLayoutConfig.headerFontSize, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A4590' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = border;
  }

  await runChunked(Array.from({ length: rows.length }, (_, index)=>index + genericDataStartRowNumber), async (rowIndex)=>{
    for(let c=1; c<=colCount; c++){
      const cell = sheet.getRow(rowIndex).getCell(c);
      cell.font = { name: 'Arial', size: genericLayoutConfig.bodyFontSize, color: { argb: 'FF111111' } };
      const isArabicColumn = c === colCount;
      const headerLabel = String(headers[c - 1] || '').trim().toLowerCase();
      const align = useAudienceReferenceLayout
        ? ((c === 1 || c === 3 || c === 4 || c === 5 || isArabicColumn) ? 'center' : 'left')
        : useSuiviReferenceLayout
          ? (
            ['ref client', 'procédure', 'tribunal', 'client', 'type', 'ville', 'marque', 'audience', 'sort', 'date affectation'].includes(headerLabel)
              ? 'center'
              : 'left'
          )
          : (c === 4 || c === 5 || isArabicColumn ? 'center' : 'left');
      cell.alignment = {
        horizontal: align,
        vertical: 'middle',
        wrapText: wrapColumnIndexSet.has(c - 1)
      };
      cell.border = border;
    }
  }, { chunkSize: 40 });

  await yieldToMainThread();
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob(
    [buffer],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
  await saveBlobDirectOrDownload(blob, filename, {
    preferredHandle: await directExportHandlePromise,
    openAfterExport,
    browserDownloadTarget,
    browserOpenInline,
    preferredFileHandle
  });
}

function parseProcedureToken(token){
  const raw = String(token || '').trim();
  if(!raw) return '';
  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if(compact === 'ass') return 'ASS';
  if(compact === 'rest' || compact === 'restitution' || compact === 'restit' || compact === 'rv' || compact === 'res') return 'Restitution';
  if(compact === 'commandement' || compact === 'cmd' || compact === 'com') return 'Commandement';
  if(compact === 'nant' || compact === 'nantissement' || compact === 'nanti') return 'Nantissement';
  if(compact === 'redressement' || compact === 'redress' || compact === 'redr') return 'Redressement';
  if(compact === 'verificationdecreance' || compact === 'verificationcreance' || compact === 'verifcreance' || compact === 'verifdecreance' || compact === 'verif' || compact === 'creance') return 'Vérification de créance';
  if(compact === 'liquidationjudiciaire' || compact === 'liquidation' || compact === 'liq' || compact === 'declarationdecreance' || compact === 'declarationcreance' || compact === 'declcreance' || compact === 'decl') return 'Liquidation judiciaire';
  if(compact === 'sfdc') return 'SFDC';
  if(compact === 'sbien') return 'S/bien';
  if(compact === 'inj' || compact === 'injonction') return 'Injonction';
  return raw;
}

function parseProcedureList(value){
  const raw = String(value || '');
  if(!raw) return [];
  return raw
    .split(/[+,]/)
    .map(v=>parseProcedureToken(v))
    .map(v=>String(v || '').trim())
    .filter(Boolean);
}

function formatDateDDMMYYYY(date){
  if(!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function normalizeDateDDMMYYYY(value){
  if(value === null || value === undefined) return '';
  if(value instanceof Date) return formatDateDDMMYYYY(value);
  const text = String(value)
    .trim()
    .replace(/[٠-٩]/g, d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  if(!text) return '';

  const isValidDateParts = (d, m, y)=>{
    const dt = new Date(y, m - 1, d);
    return !Number.isNaN(dt.getTime())
      && dt.getFullYear() === y
      && dt.getMonth() === m - 1
      && dt.getDate() === d;
  };

  const parseYear = (raw)=>{
    const n = Number(raw);
    if(!Number.isFinite(n)) return NaN;
    if(raw.length === 2) return n >= 70 ? 1900 + n : 2000 + n;
    return n;
  };

  let m = text.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if(m){
    const year = parseYear(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if(!isValidDateParts(day, month, year)) return '';
    return formatDateDDMMYYYY(new Date(year, month - 1, day));
  }else{
    m = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
    if(!m){
      const embedded = text.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.](?:\d{2}|\d{4})|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})/);
      if(!embedded) return '';
      return normalizeDateDDMMYYYY(embedded[1]);
    }
    const a = Number(m[1]);
    const b = Number(m[2]);
    const year = parseYear(m[3]);
    if(isValidDateParts(a, b, year)){
      return formatDateDDMMYYYY(new Date(year, b - 1, a));
    }
    return '';
  }
}

function looksLikeImportedCity(value){
  const text = String(value || '').trim();
  if(!text) return false;
  if(/\d/.test(text)) return false;
  if(/[;,]/.test(text)) return false;
  const words = text.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= 4 && text.length <= 40;
}

function looksLikeImportedAddress(value){
  const text = String(value || '').trim().toLowerCase();
  if(!text) return false;
  if(/\d/.test(text)) return true;
  if(/[;,]/.test(text)) return true;
  return /\b(rue|avenue|av\.?|bd|boulevard|lot|appt|appartement|imm|immeuble|residence|résidence|quartier|hay|route|km|angle|zone|n°|no)\b/.test(text);
}

function normalizeImportedAddressVille(adresseValue, villeValue){
  let adresse = String(adresseValue || '').trim();
  let ville = String(villeValue || '').trim();
  if(adresse && ville && looksLikeImportedCity(adresse) && looksLikeImportedAddress(ville)){
    return { adresse: ville, ville: adresse };
  }
  if(!ville && looksLikeImportedCity(adresse) && !looksLikeImportedAddress(adresse)){
    return { adresse: '', ville: adresse };
  }
  return { adresse, ville };
}

function normalizeImportedDebiteurName(value){
  const text = normalizeLooseText(value)
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u061C]/g, '')
    .trim();
  if(!text) return '';
  const latinTokens = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[’'`´-][A-Za-zÀ-ÖØ-öø-ÿ]+)*/g) || [];
  const frenchValue = latinTokens.join(' ').replace(/\s+/g, ' ').trim();
  if(frenchValue) return frenchValue;
  if(/[\u0600-\u06FF]/.test(text)) return text;
  return text;
}

function normalizeReferenceValue(value){
  return String(value || '')
    .normalize('NFKC')
    .trim()
    // Remove invisible direction/zero-width markers often present in Excel content.
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u061C]/g, '')
    .replace(/[’'`´]/g, '')
    // Unify all slash variants to "/" so matching is stable.
    .replace(/[\\\/⁄∕／]+/g, '/')
    .replace(/\s+/g, '')
    .toUpperCase();
}

function isLetterOnlyClientReference(value){
  const normalized = normalizeReferenceValue(value).replace(/[\/]+/g, '');
  if(!normalized) return false;
  return /\p{L}/u.test(normalized) && !/\d/.test(normalized);
}

function isStrictDuplicateProtectedClientReference(value){
  const normalized = normalizeReferenceValue(value);
  if(!normalized) return false;
  return /[A-Z]/.test(normalized) && /\d/.test(normalized);
}

function areEquivalentClientReferences(a, b){
  return normalizeReferenceValue(a) === normalizeReferenceValue(b);
}

function normalizeDossierReferenceValue(value){
  const raw = String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u061C]/g, '');
  if(!raw) return '';

  const unified = raw
    .replace(/['\u2018\u2019`\u00b4]/g, '')
    .replace(/[\\\/\u2044\u2215\uff0f]+/g, '/')
    .replace(/[_\-.]+/g, '/')
    .replace(/\s+/g, '');

  let parts = null;
  let matchIndex = -1;
  const slashMatch = unified.match(/(\d{1,10})\/(\d{1,10})\/(\d{2,4})/);
  if(slashMatch){
    parts = [slashMatch[1], slashMatch[2], slashMatch[3]];
    matchIndex = slashMatch.index;
  }else{
    const numericParts = unified.match(/\d+/g) || [];
    if(numericParts.length >= 3){
      parts = [numericParts[0], numericParts[1], numericParts[2]];
      // Find where the first numeric part starts in the unified string.
      matchIndex = unified.indexOf(numericParts[0]);
    }
  }
  if(!parts) return '';

  const firstNum = Number.parseInt(parts[0], 10);
  const secondNum = Number.parseInt(parts[1], 10);
  const yearNum = Number.parseInt(parts[2], 10);
  if(!Number.isFinite(firstNum) || !Number.isFinite(secondNum) || !Number.isFinite(yearNum)){
    return '';
  }
  const year = parts[2].length === 2
    ? (yearNum >= 70 ? 1900 + yearNum : 2000 + yearNum)
    : yearNum;
  // Preserve any letter prefix before the numeric portion so that
  // references like "Sanlam 1/23/2024" and "Bank 1/23/2024" stay distinct.
  let prefix = '';
  if(matchIndex > 0){
    const rawPrefix = unified.slice(0, matchIndex)
      .replace(/[\/\-_. ]+$/g, '')
      .toUpperCase();
    if(rawPrefix && /[A-Z]/i.test(rawPrefix)){
      prefix = rawPrefix + '/';
    }
  }
  return `${prefix}${firstNum}/${secondNum}/${year}`;
}

function clearCreationReferenceClientError(){
  const input = $('referenceClientInput');
  const error = $('referenceClientError');
  if(input) input.classList.remove('input-invalid');
  if(error) error.classList.remove('visible');
}

function showCreationReferenceClientError(message){
  const input = $('referenceClientInput');
  const error = $('referenceClientError');
  if(input) input.classList.add('input-invalid');
  if(error){
    error.textContent = String(message || 'Cette référence client existe déjà.');
    error.classList.add('visible');
  }
}

function findDuplicateClientReference(referenceValue, options = {}){
  const normalizedReference = normalizeReferenceValue(referenceValue);
  if(!normalizedReference || !isStrictDuplicateProtectedClientReference(normalizedReference)) return null;
  const ignoreClientId = Number(options.ignoreClientId);
  const ignoreDossierIndex = Number(options.ignoreDossierIndex);
  for(const client of AppState.clients){
    const clientId = Number(client?.id);
    const dossiers = Array.isArray(client?.dossiers) ? client.dossiers : [];
    for(let index = 0; index < dossiers.length; index += 1){
      if(
        Number.isFinite(ignoreClientId)
        && Number.isFinite(ignoreDossierIndex)
        && clientId === ignoreClientId
        && index === ignoreDossierIndex
      ){
        continue;
      }
      const dossier = dossiers[index];
      if(normalizeReferenceValue(dossier?.referenceClient || '') !== normalizedReference) continue;
      return {
        clientId,
        dossierIndex: index,
        clientName: String(client?.name || '').trim(),
        referenceClient: String(dossier?.referenceClient || '').trim()
      };
    }
  }
  return null;
}

function validateCreationReferenceClient(options = {}){
  const rawReference = String($('referenceClientInput')?.value || '').trim();
  if(!rawReference){
    clearCreationReferenceClientError();
    return true;
  }
  if(!isStrictDuplicateProtectedClientReference(rawReference)){
    clearCreationReferenceClientError();
    return true;
  }
  const duplicate = findDuplicateClientReference(rawReference, {
    ignoreClientId: editingDossier?.clientId,
    ignoreDossierIndex: editingDossier?.index
  });
  if(!duplicate){
    clearCreationReferenceClientError();
    return true;
  }
  const message = `Cette référence client existe déjà${duplicate.clientName ? ` (${duplicate.clientName})` : ''}.`;
  showCreationReferenceClientError(message);
  if(options.focus !== false){
    $('referenceClientInput')?.focus();
  }
  return false;
}

function normalizeReferenceForAudienceLookup(value){
  const dossierRef = normalizeDossierReferenceValue(value);
  if(dossierRef) return dossierRef;
  return normalizeReferenceValue(value);
}

function createImportTrackingId(prefix = 'imp'){
  return `${String(prefix || 'imp').trim() || 'imp'}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function ensureDossierImportUid(dossier){
  if(!dossier || typeof dossier !== 'object') return '';
  const existing = String(dossier.importUid || '').trim();
  if(existing) return existing;
  const nextId = createImportTrackingId('dossier');
  dossier.importUid = nextId;
  return nextId;
}

function normalizeImportHistoryEntries(rawEntries){
  if(!Array.isArray(rawEntries)) return [];
  return rawEntries
    .map(entry=>{
      if(!entry || typeof entry !== 'object') return null;
      const id = String(entry.id || '').trim() || createImportTrackingId('import');
      const type = String(entry.type || '').trim() === 'audience' ? 'audience' : 'global';
      const fileName = String(entry.fileName || '').trim() || 'Import Excel';
      const createdAt = String(entry.createdAt || '').trim() || new Date().toISOString();
      const createdClientIds = Array.isArray(entry.createdClientIds)
        ? entry.createdClientIds.map(v=>Number(v)).filter(Number.isFinite)
        : [];
      const createdDossierUids = Array.isArray(entry.createdDossierUids)
        ? entry.createdDossierUids.map(v=>String(v || '').trim()).filter(Boolean)
        : [];
      const createdOrphanClientIds = Array.isArray(entry.createdOrphanClientIds)
        ? entry.createdOrphanClientIds.map(v=>Number(v)).filter(Number.isFinite)
        : [];
      const createdOrphanDossierUids = Array.isArray(entry.createdOrphanDossierUids)
        ? entry.createdOrphanDossierUids.map(v=>String(v || '').trim()).filter(Boolean)
        : [];
      const operations = Array.isArray(entry.operations)
        ? entry.operations
          .map(op=>{
            if(!op || typeof op !== 'object') return null;
            const dossierUid = String(op.dossierUid || '').trim();
            const procKey = String(op.procKey || '').trim();
            if(!dossierUid || !procKey) return null;
            return {
              dossierUid,
              procKey,
              beforeProc: op.beforeProc && typeof op.beforeProc === 'object'
                ? JSON.parse(JSON.stringify(op.beforeProc))
                : null
            };
          })
          .filter(Boolean)
        : [];
      const stats = entry.stats && typeof entry.stats === 'object'
        ? {
          dossiers: Number(entry.stats.dossiers) || 0,
          audiences: Number(entry.stats.audiences) || 0
        }
        : { dossiers: 0, audiences: 0 };
      return {
        id,
        type,
        fileName,
        createdAt,
        createdClientIds: [...new Set(createdClientIds)],
        createdDossierUids: [...new Set(createdDossierUids)],
        createdOrphanClientIds: [...new Set(createdOrphanClientIds)],
        createdOrphanDossierUids: [...new Set(createdOrphanDossierUids)],
        operations,
        stats
      };
    })
    .filter(Boolean)
    .slice(-IMPORT_HISTORY_MAX_ENTRIES);
}

function splitReferenceValues(value){
  const DOSSIER_REF_PATTERN = /^\d+\/\d+\/\d{2,4}$/;
  const dossierRefs = [];
  const rawChunks = String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u061C]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(
      /\d+\s*[\\\/⁄∕／]\s*\d+\s*[\\\/⁄∕／]\s*\d{2,4}/g,
      (match)=>{
        const normalizedMatch = normalizeReferenceValue(match);
        if(!normalizedMatch) return ' ';
        const token = `DOSSIERREFTOKEN${dossierRefs.length}END`;
        dossierRefs.push(normalizedMatch);
        return ` ${token} `;
      }
    )
    .split(/(?:[,;|+_&\n]+|\s+[xX×]\s+|\s+-\s+)/)
    .map(v=>String(v || '').trim())
    .filter(Boolean);

  const out = [];
  rawChunks.forEach(chunk=>{
    const dossierTokenMatch = chunk.match(/^DOSSIERREFTOKEN(\d+)END$/);
    if(dossierTokenMatch){
      const dossierRef = dossierRefs[Number(dossierTokenMatch[1])];
      if(dossierRef) out.push(dossierRef);
      return;
    }
    const normalizedChunk = normalizeReferenceValue(chunk);
    if(!normalizedChunk) return;
    if(DOSSIER_REF_PATTERN.test(normalizedChunk)){
      // Keep dossier references like 13580/8209/2025 intact.
      out.push(normalizedChunk);
      return;
    }
    // Ref client can be packed with "/" (e.g. C5034086/C5034027).
    normalizedChunk
      .split('/')
      .map(v=>String(v || '').trim())
      .filter(Boolean)
      .forEach(v=>out.push(v));
  });
  return out;
}

function normalizeLooseClientReferenceValue(value){
  const normalized = normalizeReferenceValue(value);
  if(!normalized) return '';
  return normalized.replace(/[^A-Z0-9]/g, '');
}

function getClientReferenceMatchKeys(value){
  const raw = String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u061C]/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
  if(!raw) return [];

  if(isLetterOnlyClientReference(raw)){
    const strict = normalizeReferenceValue(raw);
    return strict ? [strict] : [];
  }

  const out = new Set();
  const pushCandidate = (candidate)=>{
    const strict = normalizeReferenceValue(candidate);
    if(strict) out.add(strict);
    const loose = normalizeLooseClientReferenceValue(candidate);
    if(loose) out.add(loose);
  };

  pushCandidate(raw);
  splitReferenceValues(raw).forEach(pushCandidate);

  const extraChunks = raw
    .replace(/\d+\s*[\\\/⁄∕／]\s*\d+\s*[\\\/⁄∕／]\s*\d{2,4}/g, ' ')
    .split(/(?:[\\\/⁄∕／,;|+_&\n-]+|\s+[xX×]\s+)/)
    .map(v=>normalizeLooseClientReferenceValue(v))
    .filter(v=>v.length >= 4 || (/[A-Z]/.test(v) && /\d/.test(v)));

  if(extraChunks.length > 1){
    extraChunks.forEach(chunk=>out.add(chunk));
  }

  return [...out];
}

function isAudienceOrdonnanceColorSuppressed(procData){
  return String(procData?._suppressAudienceOrdonnanceColor || '').trim() === '1';
}

function hasAudienceOrdonnanceColorSource(procData){
  const ordonnanceValue = String(procData?.attOrdOrOrdOk || procData?._audienceSortOrd || '').trim();
  return !!normalizeDiligenceOrdonnance(ordonnanceValue);
}

function getAudienceOrdonnanceColorValue(color){
  const targetColor = String(color || '').trim();
  if(targetColor === 'green') return 'att ord';
  if(targetColor === 'yellow') return 'ord ok';
  return '';
}

function applyAudienceOrdonnanceColorState(procData, color){
  const p = procData && typeof procData === 'object' ? procData : null;
  const ordonnanceValue = getAudienceOrdonnanceColorValue(color);
  if(!p || !ordonnanceValue) return false;
  let changed = false;
  if(String(p.attOrdOrOrdOk || '').trim() !== ordonnanceValue){
    p.attOrdOrOrdOk = ordonnanceValue;
    changed = true;
  }
  if(String(p._audienceSortOrd || '').trim() !== ordonnanceValue){
    p._audienceSortOrd = ordonnanceValue;
    changed = true;
  }
  if(['green', 'yellow'].includes(String(p?.color || '').trim())){
    delete p.color;
    changed = true;
  }
  if(String(p?._disableAudienceRowColor || '').trim()){
    delete p._disableAudienceRowColor;
    changed = true;
  }
  if(String(p?._suppressAudienceOrdonnanceColor || '').trim()){
    delete p._suppressAudienceOrdonnanceColor;
    changed = true;
  }
  return changed;
}

function applyAudienceWhiteColorState(procData, dossier, currentEffectiveColor = ''){
  const p = procData && typeof procData === 'object' ? procData : null;
  if(!p || !dossier || typeof dossier !== 'object') return false;
  const effectiveColor = String(currentEffectiveColor || '').trim();
  const hasOrdonnanceColor = hasAudienceOrdonnanceColorSource(p)
    || ['green', 'yellow'].includes(String(p?.color || '').trim())
    || ['green', 'yellow'].includes(effectiveColor);
  let changed = false;
  if(hasOrdonnanceColor){
    if(String(p?._disableAudienceRowColor || '').trim() !== '1'){
      p._disableAudienceRowColor = '1';
      changed = true;
    }
    if(String(p?._suppressAudienceOrdonnanceColor || '').trim() !== '1'){
      p._suppressAudienceOrdonnanceColor = '1';
      changed = true;
    }
  }else{
    if(String(p?._disableAudienceRowColor || '').trim()){
      delete p._disableAudienceRowColor;
      changed = true;
    }
    if(String(p?._suppressAudienceOrdonnanceColor || '').trim()){
      delete p._suppressAudienceOrdonnanceColor;
      changed = true;
    }
  }
  if(String(p?.color || '').trim()){
    p.color = '';
    changed = true;
  }
  if(dossier.statut === 'Soldé' || dossier.statut === 'Arrêt définitif'){
    dossier.statut = 'En cours';
    changed = true;
  }
  return changed;
}

function parseExcelDateValue(value){
  if(value === null || value === undefined) return '';

  if(value instanceof Date){
    return formatDateDDMMYYYY(value);
  }

  if(typeof value === 'number' && Number.isFinite(value)){
    if(typeof XLSX !== 'undefined' && XLSX?.SSF?.parse_date_code){
      const parsed = XLSX.SSF.parse_date_code(value);
      if(parsed?.y && parsed?.m && parsed?.d){
        return `${String(parsed.d).padStart(2, '0')}/${String(parsed.m).padStart(2, '0')}/${parsed.y}`;
      }
    }
    const excelEpochUtc = Date.UTC(1899, 11, 30);
    const ms = Math.round(value * 24 * 60 * 60 * 1000);
    const dtUtc = new Date(excelEpochUtc + ms);
    if(!Number.isNaN(dtUtc.getTime())){
      const localDate = new Date(dtUtc.getUTCFullYear(), dtUtc.getUTCMonth(), dtUtc.getUTCDate());
      return formatDateDDMMYYYY(localDate);
    }
    return String(value);
  }

  const text = String(value).trim();
  if(!text) return '';

  const normalized = normalizeDateDDMMYYYY(text);
  return normalized || text;
}

function parseExcelDateValues(value){
  if(value === null || value === undefined) return [];
  if(value instanceof Date || (typeof value === 'number' && Number.isFinite(value))){
    const single = parseExcelDateValue(value);
    return single ? [single] : [];
  }

  const text = String(value || '').trim();
  if(!text) return [];

  const candidates = text.match(/\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}/g) || [];
  const normalizedCandidates = candidates
    .map(token=>normalizeDateDDMMYYYY(token))
    .filter(Boolean);

  if(normalizedCandidates.length){
    return [...new Set(normalizedCandidates)];
  }

  const single = normalizeDateDDMMYYYY(text);
  return single ? [single] : [];
}

function parseMontantTokenNumber(token){
  let text = String(token || '')
    .trim()
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, '');
  if(!text || !/\d/.test(text)) return NaN;

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');

  if(lastComma !== -1 && lastDot !== -1){
    const decimalIdx = Math.max(lastComma, lastDot);
    text = text.replace(/[.,]/g, (sep, idx)=>idx === decimalIdx ? '.' : '');
  }else if(lastComma !== -1){
    text = text.replace(/\./g, '').replace(',', '.');
  }else if(lastDot !== -1){
    const parts = text.split('.');
    if(parts.length > 2){
      const decimalPart = parts.pop();
      text = `${parts.join('')}.${decimalPart}`;
    }
  }

  text = text.replace(/[^\d.+-]/g, '');
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value : NaN;
}

function getLowerMontantValue(value){
  const raw = String(value || '').trim();
  if(!raw) return '';
  const parts = raw.match(/[-+]?\d+(?:[.,]\d+)?/g) || [];
  if(parts.length <= 1) return raw;
  const candidates = parts
    .map(part=>{
      const token = String(part || '').trim();
      return {
        token,
        numeric: parseMontantTokenNumber(token)
      };
    })
    .filter(item=>item.token && Number.isFinite(item.numeric));
  if(candidates.length <= 1) return raw;
  let min = candidates[0];
  for(let i = 1; i < candidates.length; i++){
    if(candidates[i].numeric < min.numeric) min = candidates[i];
  }
  return min.token || raw;
}

function parseExcelMontantValues(value){
  const text = String(value || '').trim();
  if(!text) return [];

  const lineCandidates = text
    .replace(/\r\n/g, '\n')
    .split(/[\n;|]+/)
    .map(v=>String(v || '').trim())
    .filter(Boolean);

  const source = lineCandidates.length ? lineCandidates : [text];
  const out = [];

  source.forEach(token=>{
    const tokenNumeric = parseMontantTokenNumber(token);
    if(Number.isFinite(tokenNumeric)){
      out.push(token);
      return;
    }
    const parts = String(token).match(/[-+]?\d[\d\s\u00A0.,]*/g) || [];
    parts.forEach(part=>{
      const cleaned = String(part || '').trim();
      if(!cleaned) return;
      const numeric = parseMontantTokenNumber(cleaned);
      if(Number.isFinite(numeric)) out.push(cleaned);
    });
  });

  return [...new Set(out)];
}

function makeAudienceDraftKey(ci, di, procKey){
  return `${ci}::${di}::${encodeURIComponent(String(procKey))}`;
}

function parseAudienceDraftKey(key){
  const value = String(key);
  if(value.includes('::')){
    const [ci = '', di = '', ...rest] = value.split('::');
    return { ci, di, procKey: decodeURIComponent(rest.join('::')) };
  }
  const [ci = '', di = '', ...rest] = value.split('_');
  return { ci, di, procKey: rest.join('_') };
}

function fileToDataUrl(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve(String(reader.result || ''));
    reader.onerror = ()=>reject(new Error('Lecture fichier impossible'));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve(String(reader.result || ''));
    reader.onerror = ()=>reject(new Error('Lecture blob impossible'));
    reader.readAsDataURL(blob);
  });
}

function imageElementUrlToDataUrl(url){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.decoding = 'async';
    img.onload = ()=>{
      try{
        const width = Number(img.naturalWidth || img.width || 0);
        const height = Number(img.naturalHeight || img.height || 0);
        if(width <= 0 || height <= 0){
          reject(new Error('Image export invalide'));
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if(!ctx){
          reject(new Error('Canvas export indisponible'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.96));
      }catch(err){
        reject(err);
      }
    };
    img.onerror = ()=>reject(new Error(`Chargement image impossible: ${url}`));
    img.src = url;
  });
}

function cloneArrayBuffer(buffer){
  if(!buffer) return null;
  return typeof buffer.slice === 'function' ? buffer.slice(0) : buffer;
}

function loadArrayBufferWithXhr(url){
  return new Promise((resolve, reject)=>{
    if(typeof XMLHttpRequest === 'undefined'){
      reject(new Error('XHR indisponible'));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = ()=>{
      const status = Number(xhr.status || 0);
      if(status === 0 || (status >= 200 && status < 300)){
        resolve(xhr.response);
        return;
      }
      reject(new Error(`HTTP ${status}`));
    };
    xhr.onerror = ()=>reject(new Error(`Chargement impossible: ${url}`));
    xhr.send();
  });
}

function base64ToArrayBuffer(base64Value){
  const normalized = String(base64Value || '').trim();
  if(!normalized) return null;
  try{
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for(let index = 0; index < binary.length; index += 1){
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes.buffer;
  }catch(err){
    console.warn('Décodage base64 du template audience impossible', err);
    return null;
  }
}

async function getAudienceExportTemplateArrayBuffer(){
  if(!audienceExportTemplateArrayBufferPromise){
    audienceExportTemplateArrayBufferPromise = (async ()=>{
      await ensureAudienceExportTemplateEmbeddedScript();
      if(typeof AUDIENCE_EXPORT_TEMPLATE_BASE64 !== 'undefined' && AUDIENCE_EXPORT_TEMPLATE_BASE64){
        const embeddedBuffer = base64ToArrayBuffer(AUDIENCE_EXPORT_TEMPLATE_BASE64);
        if(embeddedBuffer) return embeddedBuffer;
      }
      try{
        const response = await fetch(AUDIENCE_EXPORT_TEMPLATE_URL, { cache: 'no-store' });
        if(!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.arrayBuffer();
      }catch(fetchErr){
        console.warn('Chargement template audience via fetch indisponible', fetchErr);
        try{
          return await loadArrayBufferWithXhr(AUDIENCE_EXPORT_TEMPLATE_URL);
        }catch(xhrErr){
          console.warn('Chargement template audience via XHR indisponible', xhrErr);
          return null;
        }
      }
    })();
  }
  return cloneArrayBuffer(await audienceExportTemplateArrayBufferPromise);
}

async function getAudienceExportHeaderImageDataUrl(){
  if(!audienceExportHeaderImageDataUrlPromise){
    audienceExportHeaderImageDataUrlPromise = Promise.resolve(AUDIENCE_EXPORT_HEADER_IMAGE_DATA_URL);
  }
  return audienceExportHeaderImageDataUrlPromise;
}

async function serializeUploadedFiles(files){
  const result = [];
  for(const file of files){
    if(!file) continue;
    if(file.dataUrl && file.name){
      result.push({
        name: String(file.name || ''),
        size: Number(file.size || 0),
        type: String(file.type || ''),
        dataUrl: String(file.dataUrl || '')
      });
      continue;
    }
    if(typeof File !== 'undefined' && file instanceof File){
      const dataUrl = await fileToDataUrl(file);
      result.push({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl
      });
    }
  }
  return result;
}

function getStoredFileSource(file){
  if(!file) return '';
  if(file.dataUrl) return String(file.dataUrl);
  if(typeof File !== 'undefined' && file instanceof File){
    return URL.createObjectURL(file);
  }
  return '';
}

function openStoredFile(file){
  const src = getStoredFileSource(file);
  if(!src){
    alert('Fichier non disponible pour aperçu');
    return;
  }
  window.open(src, '_blank');
  if(typeof File !== 'undefined' && file instanceof File){
    setTimeout(()=>URL.revokeObjectURL(src), 10000);
  }
}

function downloadStoredFile(file){
  const src = getStoredFileSource(file);
  if(!src){
    alert('Fichier non disponible pour téléchargement');
    return;
  }
  const a = document.createElement('a');
  a.href = src;
  a.download = String(file?.name || 'document');
  document.body.appendChild(a);
  a.click();
  a.remove();
  if(typeof File !== 'undefined' && file instanceof File){
    setTimeout(()=>URL.revokeObjectURL(src), 10000);
  }
}

function hasStoredPasswordHash(user){
  return !!String(user?.passwordHash || '').trim() && !!String(user?.passwordSalt || '').trim();
}

function hasAnyStoredPassword(user){
  return hasStoredPasswordHash(user) || !!normalizeLoginPassword(user?.password || '');
}

function isBootstrapSetupRequiredForUsers(users){
  const manager = (Array.isArray(users) ? users : []).find(
    user=>String(user?.username || '').trim().toLowerCase() === DEFAULT_MANAGER_USERNAME
  );
  return !manager || !hasAnyStoredPassword(manager);
}

function getSeedBootstrapPasswordForUser(user){
  return '';
}

function isBootstrapPasswordForUser(user, password){
  const normalizedPassword = normalizeLoginPassword(password);
  const expected = normalizeLoginPassword(getSeedBootstrapPasswordForUser(user));
  return !!expected && normalizedPassword === expected;
}

function canUseSecurePasswordHashing(){
  return typeof crypto !== 'undefined'
    && !!crypto?.subtle
    && typeof crypto.getRandomValues === 'function'
    && typeof TextEncoder !== 'undefined';
}

function bytesToHex(bytes){
  return Array.from(bytes || [])
    .map(byte=>byte.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex){
  const value = String(hex || '').trim();
  if(!value || value.length % 2 !== 0) return new Uint8Array();
  const bytes = new Uint8Array(value.length / 2);
  for(let i = 0; i < value.length; i += 2){
    bytes[i / 2] = parseInt(value.slice(i, i + 2), 16);
  }
  return bytes;
}

function createPasswordSaltHex(){
  const salt = new Uint8Array(PASSWORD_SALT_BYTES);
  crypto.getRandomValues(salt);
  return bytesToHex(salt);
}

async function derivePasswordHash(password, saltHex){
  if(!canUseSecurePasswordHashing()) return '';
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(String(password || '')),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBytes(saltHex),
      iterations: PASSWORD_HASH_ITERATIONS,
      hash: 'SHA-256'
    },
    key,
    256
  );
  return bytesToHex(new Uint8Array(derived));
}

async function secureUserPassword(user, rawPassword, options = {}){
  const normalizedPassword = normalizeLoginPassword(rawPassword);
  const requirePasswordChange = options.requirePasswordChange === true;
  const baseUser = user && typeof user === 'object' ? { ...user } : {};
  if(!normalizedPassword){
    return {
      ...baseUser,
      requirePasswordChange
    };
  }
  if(canUseSecurePasswordHashing()){
    const passwordSalt = createPasswordSaltHex();
    const passwordHash = await derivePasswordHash(normalizedPassword, passwordSalt);
    return {
      ...baseUser,
      password: '',
      passwordHash,
      passwordSalt,
      passwordVersion: PASSWORD_HASH_VERSION,
      passwordUpdatedAt: new Date().toISOString(),
      requirePasswordChange
    };
  }
  return {
    ...baseUser,
    password: normalizedPassword,
    passwordHash: '',
    passwordSalt: '',
    passwordVersion: 0,
    passwordUpdatedAt: new Date().toISOString(),
    requirePasswordChange
  };
}

async function verifyUserPassword(user, rawPassword){
  const normalizedPassword = normalizeLoginPassword(rawPassword);
  if(!normalizedPassword || !user) return false;
  if(hasStoredPasswordHash(user) && canUseSecurePasswordHashing()){
    const computedHash = await derivePasswordHash(normalizedPassword, user.passwordSalt);
    return computedHash === String(user.passwordHash || '');
  }
  return normalizeLoginPassword(user.password || '') === normalizedPassword;
}

function getPasswordPolicyError(password){
  const value = normalizeLoginPassword(password);
  if(!value) return 'Mot de passe obligatoire.';
  return '';
}

async function migrateUsersToSecureStorage(users){
  const safeUsers = Array.isArray(users) ? users.map(normalizeUser).filter(Boolean) : [];
  const nextUsers = [];
  let changed = false;

  for(const user of safeUsers){
    const legacyPassword = normalizeLoginPassword(user.password || '');
    const shouldRotatePassword = user.requirePasswordChange === true || isBootstrapPasswordForUser(user, legacyPassword);
    let nextUser = { ...user };

    if(hasStoredPasswordHash(nextUser)){
      if(legacyPassword){
        nextUser.password = '';
        changed = true;
      }
      if(nextUser.requirePasswordChange !== shouldRotatePassword){
        nextUser.requirePasswordChange = shouldRotatePassword;
        changed = true;
      }
    }else if(legacyPassword){
      nextUser = await secureUserPassword(nextUser, legacyPassword, {
        requirePasswordChange: shouldRotatePassword
      });
      changed = true;
    }else if(nextUser.requirePasswordChange !== shouldRotatePassword){
      nextUser.requirePasswordChange = shouldRotatePassword;
      changed = true;
    }

    nextUsers.push(nextUser);
  }

  return { users: nextUsers, changed };
}

async function hardenUsersOnBoot(){
  USERS = ensureManagerUser(Array.isArray(USERS) ? USERS : []);
  if(!LOCAL_ONLY_MODE){
    return false;
  }
  const migration = await migrateUsersToSecureStorage(USERS);
  USERS = ensureManagerUser(migration.users);
  if(!migration.changed) return false;
  try{
    await persistStateSliceNow('users', USERS, { source: 'user-security-migration' });
  }catch(err){
    console.warn('Impossible de renforcer la sécurité des mots de passe', err);
  }
  syncCurrentUserFromUsers();
  return true;
}

function getLoginLockoutRemainingMs(){
  return Math.max(0, Number(loginLockedUntil || 0) - Date.now());
}

function getLoginLockoutMessage(){
  const remainingMs = getLoginLockoutRemainingMs();
  if(remainingMs <= 0) return '';
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  return `Trop de tentatives. Réessayez dans ${remainingSeconds}s.`;
}

function showLoginError(message){
  const errorMsg = $('errorMsg');
  if(!errorMsg) return;
  errorMsg.textContent = String(message || "Nom d'utilisateur ou mot de passe incorrect");
  errorMsg.style.display = 'block';
  
  const loginBtn = $('loginBtn');
  if(loginBtn){
    loginBtn.disabled = false;
    loginBtn.innerHTML = 'Se connecter';
  }
}

function clearLoginError(){
  const errorMsg = $('errorMsg');
  if(!errorMsg) return;
  errorMsg.textContent = "Nom d'utilisateur ou mot de passe incorrect";
  errorMsg.style.display = 'none';
}

function registerFailedLoginAttempt(){
  loginAttemptCount += 1;
  if(loginAttemptCount >= LOGIN_MAX_ATTEMPTS){
    loginAttemptCount = 0;
    loginLockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
    return getLoginLockoutMessage();
  }
  const attemptsLeft = Math.max(0, LOGIN_MAX_ATTEMPTS - loginAttemptCount);
  return `Nom d'utilisateur ou mot de passe incorrect (${attemptsLeft} tentative${attemptsLeft > 1 ? 's' : ''} restante${attemptsLeft > 1 ? 's' : ''}).`;
}

function resetLoginAttempts(){
  loginAttemptCount = 0;
  loginLockedUntil = 0;
}

function showPasswordSetupError(message){
  const errorMsg = $('passwordSetupError');
  if(!errorMsg) return;
  errorMsg.textContent = String(message || 'Veuillez définir un mot de passe valide.');
  errorMsg.style.display = 'block';
}

function clearPasswordSetupError(){
  const errorMsg = $('passwordSetupError');
  if(!errorMsg) return;
  errorMsg.textContent = 'Veuillez définir un mot de passe valide.';
  errorMsg.style.display = 'none';
}

function updateBootstrapSetupUi(options = {}){
  const visible = options.visible === true;
  const remote = options.remote === true;
  const hint = $('loginBootstrapHint');
  const btn = $('bootstrapSetupBtn');
  const message = remote
    ? 'Le serveur attend encore la configuration du mot de passe initial du compte gestionnaire.'
    : 'Définissez un mot de passe initial pour activer le compte gestionnaire.';
  if(hint){
    hint.textContent = message;
    hint.style.display = visible ? 'block' : 'none';
  }
  if(btn){
    btn.dataset.mode = remote ? PASSWORD_SETUP_MODE_BOOTSTRAP_REMOTE : PASSWORD_SETUP_MODE_BOOTSTRAP_LOCAL;
    btn.style.display = visible ? 'block' : 'none';
  }
}

function shouldOfferLocalBootstrapSetup(){
  return isBootstrapSetupRequiredForUsers(USERS) && (LOCAL_ONLY_MODE || !remoteServerReachable);
}

function configurePasswordSetupModal(mode = PASSWORD_SETUP_MODE_FORCED){
  const modal = $('passwordSetupModal');
  if(!modal) return;
  modal.dataset.mode = mode;
  const reason = String(modal.dataset.reason || '').trim().toLowerCase();
  const title = $('passwordSetupTitle');
  const lead = $('passwordSetupLead');
  const saveLabel = $('passwordSetupSaveLabel');
  if(mode === PASSWORD_SETUP_MODE_BOOTSTRAP_LOCAL){
    if(title) title.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Initialiser le compte gestionnaire';
    if(lead) lead.textContent = 'Aucun mot de passe initial n’est défini en local. Créez maintenant un mot de passe pour activer le compte gestionnaire.';
    if(saveLabel) saveLabel.textContent = 'Initialiser le compte';
    return;
  }
  if(mode === PASSWORD_SETUP_MODE_BOOTSTRAP_REMOTE){
    if(title) title.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Initialiser le serveur';
    if(lead) lead.textContent = 'Le serveur attend encore un mot de passe initial pour le compte gestionnaire. Définissez-le maintenant pour activer la connexion.';
    if(saveLabel) saveLabel.textContent = 'Initialiser le serveur';
    return;
  }
  if(reason === 'default-manager-password'){
    if(title) title.innerHTML = '<i class="fa-solid fa-key"></i> Sécuriser le compte gestionnaire';
    if(lead) lead.textContent = 'Le compte gestionnaire utilise encore le mot de passe par défaut. Définissez maintenant un nouveau mot de passe pour continuer.';
    if(saveLabel) saveLabel.textContent = 'Sécuriser le compte';
    return;
  }
  if(title) title.innerHTML = '<i class="fa-solid fa-key"></i> Sécuriser ce compte';
  if(lead) lead.textContent = 'Vous pouvez mettre à jour le mot de passe de ce compte si vous le souhaitez.';
  if(saveLabel) saveLabel.textContent = 'Mettre à jour';
}

function openPasswordSetupModal(options = {}){
  const modal = $('passwordSetupModal');
  if(!modal) return;
  modal.dataset.reason = String(options.reason || '').trim().toLowerCase();
  configurePasswordSetupModal(options.mode || PASSWORD_SETUP_MODE_FORCED);
  if($('passwordSetupInput')) $('passwordSetupInput').value = '';
  if($('passwordSetupConfirmInput')) $('passwordSetupConfirmInput').value = '';
  clearPasswordSetupError();
  modal.style.display = 'flex';
  setTimeout(()=>{
    $('passwordSetupInput')?.focus();
  }, 0);
}

function closePasswordSetupModal(){
  const modal = $('passwordSetupModal');
  if(!modal) return;
  modal.style.display = 'none';
  modal.dataset.mode = PASSWORD_SETUP_MODE_FORCED;
  modal.dataset.reason = '';
  if($('passwordSetupInput')) $('passwordSetupInput').value = '';
  if($('passwordSetupConfirmInput')) $('passwordSetupConfirmInput').value = '';
  clearPasswordSetupError();
}

async function submitLocalBootstrapPasswordSetup(password, options = {}){
  USERS = ensureManagerUser(Array.isArray(USERS) ? USERS : []);
  const managerIndex = USERS.findIndex(
    user=>String(user?.username || '').trim().toLowerCase() === DEFAULT_MANAGER_USERNAME
  );
  if(managerIndex === -1){
    throw new Error('Compte gestionnaire introuvable.');
  }
  const updatedUser = await secureUserPassword(USERS[managerIndex], password, { requirePasswordChange: false });
  USERS[managerIndex] = updatedUser;
  USERS = ensureManagerUser(USERS);
  await persistStateSliceNow('users', USERS, { source: 'bootstrap-password-setup-local' });
  updateBootstrapSetupUi({ visible: false });
  closePasswordSetupModal();
  clearLoginError();
  if(options.silent === true) return;
  if($('username')) $('username').value = REMOTE_MANAGER_USERNAME;
  if($('password')) $('password').value = '';
  alert('Compte gestionnaire initialisé. Connectez-vous maintenant avec votre nouveau mot de passe.');
  $('password')?.focus();
}

async function submitRemoteBootstrapPasswordSetup(password, options = {}){
  if(LOCAL_ONLY_MODE){
    throw new Error('Mode local uniquement.');
  }
  await resolveApiBase();
  const res = await fetchWithTimeout(`${API_BASE}/auth/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: REMOTE_MANAGER_USERNAME,
      password
    })
  }, API_STATE_SAVE_TIMEOUT_MS);
  const payload = await res.json().catch(()=>({}));
  if(!res.ok){
    const message = String(payload?.message || `HTTP ${res.status}`);
    throw new Error(message);
  }
  remoteBootstrapSetupRequired = false;
  updateBootstrapSetupUi({ visible: false });
  closePasswordSetupModal();
  clearLoginError();
  if(options.silent === true) return;
  if($('username')) $('username').value = REMOTE_MANAGER_USERNAME;
  if($('password')) $('password').value = '';
  alert('Compte gestionnaire serveur initialisé. Connectez-vous maintenant avec votre nouveau mot de passe.');
  $('password')?.focus();
}

async function submitForcedPasswordChange(){
  const mode = String($('passwordSetupModal')?.dataset.mode || PASSWORD_SETUP_MODE_FORCED);
  const password = normalizeLoginPassword($('passwordSetupInput')?.value || '');
  const confirmPassword = normalizeLoginPassword($('passwordSetupConfirmInput')?.value || '');
  const passwordPolicyError = getPasswordPolicyError(password);
  if(passwordPolicyError){
    showPasswordSetupError(passwordPolicyError);
    return;
  }
  if(password !== confirmPassword){
    showPasswordSetupError('La confirmation du mot de passe ne correspond pas.');
    return;
  }
  const currentSaveBtn = $('passwordSetupSaveBtn');
  if(currentSaveBtn) currentSaveBtn.disabled = true;
  try{
    if(mode === PASSWORD_SETUP_MODE_BOOTSTRAP_LOCAL){
      await submitLocalBootstrapPasswordSetup(password);
      return;
    }
    if(mode === PASSWORD_SETUP_MODE_BOOTSTRAP_REMOTE){
      await submitRemoteBootstrapPasswordSetup(password);
      return;
    }
    if(!currentUser){
      showPasswordSetupError('Compte introuvable. Reconnectez-vous.');
      return;
    }
    const userIndex = USERS.findIndex(u=>u.id === currentUser.id);
    if(userIndex === -1){
      showPasswordSetupError('Compte introuvable. Reconnectez-vous.');
      return;
    }
    const updatedUser = await secureUserPassword(USERS[userIndex], password, { requirePasswordChange: false });
    USERS[userIndex] = updatedUser;
    USERS = ensureManagerUser(USERS);
    await persistStateSliceNow('users', USERS, { source: 'password-setup' });
    syncCurrentUserFromUsers();
    currentUser = USERS.find(u=>u.id === updatedUser.id) || updatedUser;
    closePasswordSetupModal();
    if(isManager()) renderEquipe();
  }catch(err){
    console.warn('Impossible de mettre à jour le mot de passe', err);
    showPasswordSetupError('Impossible de sauvegarder le nouveau mot de passe.');
  }finally{
    if(currentSaveBtn) currentSaveBtn.disabled = false;
  }
}

function normalizeUser(rawUser){
  if(!rawUser || typeof rawUser !== 'object') return null;
  const id = Number(rawUser.id);
  const username = String(rawUser.username || '').trim();
  const password = normalizeLoginPassword(rawUser.password || '');
  const passwordHash = String(rawUser.passwordHash || '').trim();
  const passwordSalt = String(rawUser.passwordSalt || '').trim();
  const passwordVersion = Number(rawUser.passwordVersion);
  const passwordUpdatedAt = String(rawUser.passwordUpdatedAt || '').trim();
  const requirePasswordChange = false;
  const role = normalizeUserRole(rawUser.role);
  const clientIds = Array.isArray(rawUser.clientIds)
    ? [...new Set(rawUser.clientIds.map(v=>Number(v)).filter(v=>Number.isFinite(v)))]
    : [];
  if(!Number.isFinite(id) || !username) return null;
  return {
    id,
    username,
    password,
    passwordHash,
    passwordSalt,
    passwordVersion: Number.isFinite(passwordVersion) ? passwordVersion : 0,
    passwordUpdatedAt,
    requirePasswordChange,
    role,
    clientIds
  };
}

function normalizeClient(rawClient, options = {}){
  if(!rawClient || typeof rawClient !== 'object') return null;
  const opts = options && typeof options === 'object' ? options : {};
  const deepNormalize = opts.deep !== false;
  const id = Number(rawClient.id);
  const name = String(rawClient.name || '').trim();
  const dossiers = Array.isArray(rawClient.dossiers)
    ? (
      deepNormalize
        ? rawClient.dossiers.map(d=>{
          if(!d || typeof d !== 'object') return d;
          const normalizedDate = normalizeDateDDMMYYYY(d.dateAffectation || '');
          const normalizedProcedures = normalizeProcedures(d);
          return {
            ...d,
            importUid: String(d.importUid || '').trim() || createImportTrackingId('dossier'),
            nRef: String(d.nRef || '').trim(),
            dateAffectation: normalizedDate || '',
            gestionnaire: String(d.gestionnaire || '').trim(),
            montant: getLowerMontantValue(d.montant || ''),
            history: normalizeDossierHistoryEntries(d.history),
            montantByProcedure: normalizeProcedureMontantGroups(
              d.montantByProcedure,
              normalizedProcedures,
              getLowerMontantValue(d.montant || '')
            )
          };
        })
        : rawClient.dossiers
          .filter(d=>!!d && typeof d === 'object')
          .map(d=>({
            ...d,
            importUid: String(d.importUid || '').trim() || createImportTrackingId('dossier')
          }))
    )
    : [];
  if(!Number.isFinite(id) || !name) return null;
  return { id, name, dossiers };
}

function normalizeRecycleBinEntries(rawEntries){
  if(!Array.isArray(rawEntries)) return [];
  return rawEntries
    .map(entry=>{
      if(!entry || typeof entry !== 'object') return null;
      const type = String(entry.type || '').trim() || 'unknown';
      const at = String(entry.at || '').trim() || new Date().toISOString();
      const by = String(entry.by || '').trim() || '-';
      const byRole = String(entry.byRole || '').trim() || '';
      const payload = entry.payload && typeof entry.payload === 'object'
        ? entry.payload
        : {};
      return { type, at, by, byRole, payload };
    })
    .filter(Boolean)
    .slice(-RECYCLE_BIN_MAX_ENTRIES);
}

function normalizeRecycleArchiveEntries(rawEntries){
  if(!Array.isArray(rawEntries)) return [];
  return rawEntries
    .map(entry=>{
      if(!entry || typeof entry !== 'object') return null;
      const type = String(entry.type || '').trim() || 'unknown';
      const at = String(entry.at || '').trim() || new Date().toISOString();
      const by = String(entry.by || '').trim() || '-';
      const byRole = String(entry.byRole || '').trim() || '';
      const payload = entry.payload && typeof entry.payload === 'object'
        ? entry.payload
        : {};
      return { type, at, by, byRole, payload };
    })
    .filter(Boolean)
    .slice(-RECYCLE_ARCHIVE_MAX_ENTRIES);
}

function getImportHistoryEntriesByType(type){
  const targetType = String(type || '').trim() === 'audience' ? 'audience' : 'global';
  return normalizeImportHistoryEntries(AppState.importHistory)
    .filter(entry=>entry.type === targetType)
    .sort((a, b)=>String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function createImportHistoryEntry(type, fileName){
  return {
    id: createImportTrackingId(type === 'audience' ? 'aud' : 'glob'),
    type: type === 'audience' ? 'audience' : 'global',
    fileName: String(fileName || '').trim() || 'Import Excel',
    createdAt: new Date().toISOString(),
    createdClientIds: [],
    createdDossierUids: [],
    createdOrphanClientIds: [],
    createdOrphanDossierUids: [],
    operations: [],
    stats: { dossiers: 0, audiences: 0 }
  };
}

function saveImportHistoryEntry(entry){
  if(!entry || typeof entry !== 'object') return;
  if(!Array.isArray(AppState.importHistory)) AppState.importHistory = [];
  const normalizedEntry = normalizeImportHistoryEntries([entry])[0];
  if(!normalizedEntry) return;
  AppState.importHistory = normalizeImportHistoryEntries([
    normalizedEntry,
    ...AppState.importHistory.filter(item=>String(item?.id || '').trim() !== normalizedEntry.id)
  ]);
}

function removeImportHistoryEntry(batchId){
  const targetId = String(batchId || '').trim();
  if(!targetId || !Array.isArray(AppState.importHistory)) return;
  AppState.importHistory = AppState.importHistory.filter(entry=>String(entry?.id || '').trim() !== targetId);
}

function collectRelevantImportHistoryEntries({ clientId = null, dossiers = [] } = {}){
  const safeClientId = Number(clientId);
  const globalBatchIds = new Set();
  const audienceBatchIds = new Set();
  (Array.isArray(dossiers) ? dossiers : []).forEach(dossier=>{
    const globalBatchId = String(dossier?.importGlobalBatchId || '').trim();
    if(globalBatchId) globalBatchIds.add(globalBatchId);
    const orphanAudienceBatchId = String(dossier?.importAudienceBatchId || '').trim();
    if(orphanAudienceBatchId) audienceBatchIds.add(orphanAudienceBatchId);
    const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
      ? dossier.procedureDetails
      : {};
    Object.values(details).forEach(procDetails=>{
      const audienceBatchId = String(procDetails?._audienceImportBatchId || '').trim();
      if(audienceBatchId) audienceBatchIds.add(audienceBatchId);
    });
  });
  return normalizeImportHistoryEntries(AppState.importHistory).filter(entry=>{
    if(String(entry?.type || '').trim() === 'audience'){
      if(audienceBatchIds.has(entry.id)) return true;
      return Number.isFinite(safeClientId) && entry.createdOrphanClientIds.includes(safeClientId);
    }
    if(globalBatchIds.has(entry.id)) return true;
    return Number.isFinite(safeClientId) && entry.createdClientIds.includes(safeClientId);
  });
}

function syncImportHistoryWithCurrentState(){
  const normalizedEntries = normalizeImportHistoryEntries(AppState.importHistory);
  if(!normalizedEntries.length){
    AppState.importHistory = [];
    return;
  }

  const existingClientIds = new Set();
  const globalDossierUidsByBatch = new Map();
  const audienceOrphanDossierUidsByBatch = new Map();
  const audienceOperationKeysByBatch = new Map();
  const pushBatchValue = (map, batchId, value)=>{
    if(!batchId || !value) return;
    if(!map.has(batchId)) map.set(batchId, new Set());
    map.get(batchId).add(value);
  };

  (Array.isArray(AppState.clients) ? AppState.clients : []).forEach(client=>{
    const clientId = Number(client?.id);
    if(Number.isFinite(clientId)) existingClientIds.add(clientId);
    (Array.isArray(client?.dossiers) ? client.dossiers : []).forEach(dossier=>{
      const dossierUid = String(dossier?.importUid || '').trim();
      const globalBatchId = String(dossier?.importGlobalBatchId || '').trim();
      pushBatchValue(globalDossierUidsByBatch, globalBatchId, dossierUid);

      const orphanAudienceBatchId = String(dossier?.importAudienceBatchId || '').trim();
      pushBatchValue(audienceOrphanDossierUidsByBatch, orphanAudienceBatchId, dossierUid);

      const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
        ? dossier.procedureDetails
        : {};
      Object.entries(details).forEach(([procKey, procDetails])=>{
        const audienceBatchId = String(procDetails?._audienceImportBatchId || '').trim();
        pushBatchValue(audienceOperationKeysByBatch, audienceBatchId, `${dossierUid}::${String(procKey || '').trim()}`);
      });
    });
  });

  AppState.importHistory = normalizeImportHistoryEntries(normalizedEntries.map(entry=>{
    if(entry.type === 'audience'){
      const orphanClientIds = entry.createdOrphanClientIds.filter(id=>existingClientIds.has(id));
      const orphanDossierUids = [...(audienceOrphanDossierUidsByBatch.get(entry.id) || new Set())];
      const liveOperationKeys = audienceOperationKeysByBatch.get(entry.id) || new Set();
      const operations = entry.operations.filter(op=>liveOperationKeys.has(`${op.dossierUid}::${op.procKey}`));
      if(!operations.length && !orphanDossierUids.length) return null;
      return {
        ...entry,
        createdOrphanClientIds: orphanClientIds,
        createdOrphanDossierUids: orphanDossierUids,
        operations,
        stats: {
          ...entry.stats,
          audiences: operations.length
        }
      };
    }

    const createdClientIds = entry.createdClientIds.filter(id=>existingClientIds.has(id));
    const createdDossierUids = [...(globalDossierUidsByBatch.get(entry.id) || new Set())];
    if(!createdDossierUids.length) return null;
    return {
      ...entry,
      createdClientIds,
      createdDossierUids,
      stats: {
        ...entry.stats,
        dossiers: createdDossierUids.length
      }
    };
  }).filter(Boolean));
}

function findDossierByImportUid(importUid){
  const targetUid = String(importUid || '').trim();
  if(!targetUid) return null;
  for(const client of AppState.clients){
    const dossiers = Array.isArray(client?.dossiers) ? client.dossiers : [];
    for(const dossier of dossiers){
      if(String(dossier?.importUid || '').trim() !== targetUid) continue;
      return { client, dossier };
    }
  }
  return null;
}

function isProtectedManualDossier(dossier){
  if(!dossier || typeof dossier !== 'object') return false;
  if(dossier.isManualEntry === true) return true;
  if(dossier.isAudienceOrphanImport === true) return false;
  const globalBatchId = String(dossier.importGlobalBatchId || '').trim();
  const audienceBatchId = String(dossier.importAudienceBatchId || '').trim();
  return !globalBatchId && !audienceBatchId;
}

function syncUsersWithVisibleClients(){
  const allowedClientIds = new Set((Array.isArray(AppState.clients) ? AppState.clients : []).map(client=>Number(client?.id)).filter(Number.isFinite));
  USERS = ensureManagerUser(USERS.map(user=>{
    if(!Array.isArray(user?.clientIds)) return user;
    return {
      ...user,
      clientIds: user.clientIds.map(v=>Number(v)).filter(id=>allowedClientIds.has(id))
    };
  }));
}

function deleteGlobalImportBatch(batchId){
  if(!canDeleteData()) return alert('Seul le gestionnaire peut supprimer un import global');
  const batch = getImportHistoryEntriesByType('global').find(entry=>String(entry?.id || '').trim() === String(batchId || '').trim());
  if(!batch) return alert('Import global introuvable.');
  if(!window.confirm(`Supprimer l'import global "${batch.fileName}" ?\nTous les dossiers importés par ce fichier seront supprimés.`)) return;

  const createdClientIds = new Set((batch.createdClientIds || []).map(v=>Number(v)).filter(Number.isFinite));
  let removedDossiers = 0;
  AppState.clients = (Array.isArray(AppState.clients) ? AppState.clients : []).filter(client=>{
    const dossiers = Array.isArray(client?.dossiers) ? client.dossiers : [];
    const keptDossiers = dossiers.filter(dossier=>{
      if(isProtectedManualDossier(dossier)) return true;
      return String(dossier?.importGlobalBatchId || '').trim() !== batch.id;
    });
    removedDossiers += Math.max(0, dossiers.length - keptDossiers.length);
    client.dossiers = keptDossiers;
    if(keptDossiers.length) return true;
    return !createdClientIds.has(Number(client?.id));
  });

  removeImportHistoryEntry(batch.id);
  audienceDraft = {};
  audiencePrintSelection = new Set();
  diligencePrintSelection = new Set();
  syncUsersWithVisibleClients();
  reconcileAudienceOrphanDossiers();
  handleDossierDataChange({ audience: true });
  queuePersistAppState();
  refreshPrimaryViews({ includeSalle: true });
  alert(`Import global supprimé.\nDossiers retirés: ${removedDossiers}`);
}

function deleteAudienceImportBatch(batchId){
  if(!canDeleteData()) return alert('Seul le gestionnaire peut supprimer un import audience');
  const batch = getImportHistoryEntriesByType('audience').find(entry=>String(entry?.id || '').trim() === String(batchId || '').trim());
  if(!batch) return alert('Import audience introuvable.');
  if(!window.confirm(`Supprimer l'import audience "${batch.fileName}" ?\nLes données audience importées par ce fichier seront retirées.`)) return;

  const operationMap = new Map((batch.operations || []).map(op=>[`${op.dossierUid}::${op.procKey}`, op]));
  const orphanClientIds = new Set((batch.createdOrphanClientIds || []).map(v=>Number(v)).filter(Number.isFinite));
  const orphanDossierUids = new Set((batch.createdOrphanDossierUids || []).map(v=>String(v || '').trim()).filter(Boolean));
  let restoredProcedures = 0;
  let removedOrphanDossiers = 0;
  let preservedManualProcedures = 0;

  AppState.clients = (Array.isArray(AppState.clients) ? AppState.clients : []).filter(client=>{
    let dossiers = Array.isArray(client?.dossiers) ? client.dossiers : [];
    dossiers = dossiers.filter(dossier=>{
      const dossierUid = ensureDossierImportUid(dossier);
      if(orphanDossierUids.has(dossierUid) && String(dossier?.importAudienceBatchId || '').trim() === batch.id){
        removedOrphanDossiers += 1;
        return false;
      }
      const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
        ? dossier.procedureDetails
        : {};
      Object.keys(details).forEach(procKey=>{
        const proc = details[procKey];
        if(String(proc?._audienceImportBatchId || '').trim() !== batch.id) return;
        if(hasManualAudienceChangesAfterImport(dossier, procKey, batch.createdAt)){
          delete proc._audienceImportBatchId;
          preservedManualProcedures += 1;
          return;
        }
        const op = operationMap.get(`${dossierUid}::${procKey}`);
        if(op && op.beforeProc && typeof op.beforeProc === 'object'){
          details[procKey] = JSON.parse(JSON.stringify(op.beforeProc));
        }else if(op && op.beforeProc === null){
          delete details[procKey];
        }else{
          ['referenceClient', 'audience', 'juge', 'sort', 'tribunal', 'depotLe', 'dateDepot', 'executionNo', 'instruction', 'color', 'attOrdOrOrdOk'].forEach(field=>{
            delete proc[field];
          });
          delete proc._missingGlobal;
          delete proc._refClientMismatch;
          delete proc._refClientProvided;
          delete proc._refClientExpected;
          delete proc._audienceImportBatchId;
          if(!Object.keys(proc).length){
            delete details[procKey];
          }
        }
        restoredProcedures += 1;
      });
      dossier.procedureDetails = details;
      const nextProcedures = normalizeProcedures(dossier);
      dossier.procedureList = nextProcedures;
      dossier.procedure = nextProcedures.join(', ');
      return true;
    });
    client.dossiers = dossiers;
    if(dossiers.length) return true;
    return !orphanClientIds.has(Number(client?.id));
  });

  removeImportHistoryEntry(batch.id);
  audienceDraft = {};
  audiencePrintSelection = new Set();
  diligencePrintSelection = new Set();
  syncUsersWithVisibleClients();
  reconcileAudienceOrphanDossiers();
  handleDossierDataChange({ audience: true });
  queuePersistAppState();
  refreshPrimaryViews({ includeSalle: true });
  alert(`Import audience supprimé.\nProcédures restaurées: ${restoredProcedures}\nProcédures manuelles conservées: ${preservedManualProcedures}\nDossiers hors global retirés: ${removedOrphanDossiers}`);
}

function formatImportHistoryDate(value){
  const rawValue = String(value || '').trim();
  if(!rawValue) return '-';
  const date = new Date(rawValue);
  if(Number.isNaN(date.getTime())) return rawValue;
  const pad = (num)=>String(num).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getImportHistorySummary(entry){
  if(!entry || typeof entry !== 'object') return '';
  if(entry.type === 'audience'){
    const audienceCount = Math.max(
      Number(entry?.stats?.audiences) || 0,
      Array.isArray(entry?.operations) ? entry.operations.length : 0
    );
    const orphanCount = Array.isArray(entry?.createdOrphanDossierUids)
      ? entry.createdOrphanDossierUids.length
      : 0;
    const parts = [`${audienceCount} audience${audienceCount > 1 ? 's' : ''}`];
    if(orphanCount){
      parts.push(`${orphanCount} hors global`);
    }
    return parts.join(' | ');
  }
  const dossierCount = Math.max(
    Number(entry?.stats?.dossiers) || 0,
    Array.isArray(entry?.createdDossierUids) ? entry.createdDossierUids.length : 0
  );
  const clientCount = Array.isArray(entry?.createdClientIds)
    ? entry.createdClientIds.length
    : 0;
  const parts = [`${dossierCount} dossier${dossierCount > 1 ? 's' : ''}`];
  if(clientCount){
    parts.push(`${clientCount} client${clientCount > 1 ? 's' : ''}`);
  }
  return parts.join(' | ');
}

function buildImportHistoryPanelKey(entries, type, canDelete){
  return JSON.stringify({
    type,
    canDelete: canDelete ? 1 : 0,
    entries: (entries || []).map(entry=>({
      id: String(entry?.id || ''),
      fileName: String(entry?.fileName || ''),
      createdAt: String(entry?.createdAt || ''),
      summary: getImportHistorySummary(entry)
    }))
  });
}

function buildImportHistoryMenuMarkup(entries, normalizedType, canDelete){
  const menuCacheKey = `${normalizedType}::${canDelete ? '1' : '0'}::${buildImportHistoryPanelKey(entries, normalizedType, canDelete)}`;
  const cached = importHistoryMenuMarkupCache.get(menuCacheKey);
  if(cached) return cached;
  const deleteFn = normalizedType === 'audience'
    ? 'deleteAudienceImportBatch'
    : 'deleteGlobalImportBatch';
  const compactDeleteLabel = normalizedType === 'audience'
    ? 'Supprimer'
    : 'Supprimer dossier global';
  const markup = `
    <div class="import-history-list">
      ${entries.map(entry=>`
        <div class="import-history-item import-history-item--menu">
          <div class="import-history-main">
            <span class="import-history-icon"><i class="fa-solid fa-file-excel"></i></span>
            <div class="import-history-content">
              <div class="import-history-file">${escapeHtml(entry.fileName || 'Import Excel')}</div>
              <div class="import-history-meta">
                <span>${escapeHtml(formatImportHistoryDate(entry.createdAt))}</span>
                <span>${escapeHtml(getImportHistorySummary(entry))}</span>
              </div>
            </div>
          </div>
          <div class="import-history-actions">
            <button
              class="btn-danger import-history-delete"
              type="button"
              onclick='${deleteFn}(${JSON.stringify(entry.id)})'
              ${canDelete ? '' : 'disabled'}
            >
              <i class="fa-solid fa-trash"></i> ${escapeHtml(compactDeleteLabel)}
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  setCappedMapEntry(
    importHistoryMenuMarkupCache,
    menuCacheKey,
    markup,
    IMPORT_HISTORY_MENU_MARKUP_CACHE_LIMIT
  );
  return markup;
}

function ensureImportHistoryHoverMenu(containerId, type){
  const container = $(containerId);
  if(!container) return;
  const normalizedType = String(type || '').trim() === 'audience' ? 'audience' : 'global';
  const entries = getImportHistoryEntriesByType(normalizedType);
  if(!entries.length) return;
  const canDelete = canDeleteData();
  const menu = container.querySelector('.import-history-hover-menu');
  if(!menu) return;
  const renderKey = buildImportHistoryPanelKey(entries, normalizedType, canDelete);
  setElementHtmlWithRenderKey(
    menu,
    buildImportHistoryMenuMarkup(entries, normalizedType, canDelete),
    renderKey,
    { trustRenderKey: true }
  );
}

function ensureImportHistoryOutsideClickHandler(){
  if(importHistoryOutsideClickBound || typeof document === 'undefined') return;
  document.addEventListener('click', (event)=>{
    const target = event?.target;
    if(target && typeof target.closest === 'function' && target.closest('.import-history-hoverbox')) return;
    importHistoryOpenPanels.forEach(containerId=>{
      const container = $(containerId);
      const hoverBox = container?.querySelector('.import-history-hoverbox');
      if(hoverBox) hoverBox.classList.remove('is-open');
    });
    importHistoryOpenPanels = new Set();
  });
  importHistoryOutsideClickBound = true;
}

function toggleImportHistoryMenu(containerId, type){
  const container = $(containerId);
  if(!container) return;
  const normalizedType = String(type || '').trim() === 'audience' ? 'audience' : 'global';
  const hoverBox = container.querySelector('.import-history-hoverbox');
  if(!hoverBox) return;
  const shouldOpen = !hoverBox.classList.contains('is-open');
  importHistoryOpenPanels.forEach(openContainerId=>{
    const openContainer = $(openContainerId);
    const openBox = openContainer?.querySelector('.import-history-hoverbox');
    if(openBox) openBox.classList.remove('is-open');
  });
  importHistoryOpenPanels = new Set();
  if(!shouldOpen) return;
  ensureImportHistoryHoverMenu(containerId, normalizedType);
  hoverBox.classList.add('is-open');
  importHistoryOpenPanels.add(containerId);
  ensureImportHistoryOutsideClickHandler();
}

function handleImportHistoryToggleKey(event, containerId, type){
  if(!event) return;
  if(event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  toggleImportHistoryMenu(containerId, type);
}

function renderImportHistoryPanel(containerId, type){
  const container = $(containerId);
  if(!container) return;
  const normalizedType = String(type || '').trim() === 'audience' ? 'audience' : 'global';
  const entries = getImportHistoryEntriesByType(normalizedType);
  if(!entries.length){
    container.innerHTML = '';
    container.style.display = 'none';
    container.dataset.renderKey = '';
    importHistoryOpenPanels.delete(containerId);
    return;
  }

  const canDelete = canDeleteData();
  const title = normalizedType === 'audience'
    ? 'Fichiers Audience importes'
    : 'Fichiers dossier global importes';
  const subtitle = normalizedType === 'audience'
    ? 'Les imports ci-dessous peuvent etre supprimes individuellement.'
    : 'Chaque fichier importe peut etre retire separement.';
  const deleteFn = normalizedType === 'audience'
    ? 'deleteAudienceImportBatch'
    : 'deleteGlobalImportBatch';
  const compactMode = true;
  const compactSummaryLabel = normalizedType === 'audience'
    ? 'Cliquez pour voir la liste complete'
    : 'Cliquez pour voir tous les fichiers importes';
  const renderKey = buildImportHistoryPanelKey(entries, normalizedType, canDelete);

  if(container.dataset.renderKey === renderKey){
    container.style.display = '';
    const hoverBox = container.querySelector('.import-history-hoverbox');
    if(hoverBox){
      hoverBox.classList.toggle('is-open', importHistoryOpenPanels.has(containerId));
    }
    if(isMobileViewport() || importHistoryOpenPanels.has(containerId)){
      ensureImportHistoryHoverMenu(containerId, normalizedType);
    }
    return;
  }

  container.style.display = '';
  const panelCacheKey = `${containerId}::${renderKey}`;
  const cachedMarkup = importHistoryPanelMarkupCache.get(panelCacheKey);
  const nextMarkup = cachedMarkup || `
    <div class="import-history-card ${compactMode ? 'import-history-card--compact' : ''}">
      <div class="import-history-header">
        <div>
          <h3 class="import-history-title">${escapeHtml(title)}</h3>
          <p class="import-history-subtitle">${escapeHtml(compactMode ? 'Cliquez sur la case pour afficher tous les fichiers Excel importes.' : subtitle)}</p>
        </div>
      </div>
      ${
        compactMode
          ? `
            <div
              class="import-history-hoverbox"
              tabindex="0"
            >
              <div
                class="import-history-hover-trigger"
                role="button"
                tabindex="0"
                onclick='toggleImportHistoryMenu(${JSON.stringify(containerId)}, ${JSON.stringify(normalizedType)})'
                onkeydown='handleImportHistoryToggleKey(event, ${JSON.stringify(containerId)}, ${JSON.stringify(normalizedType)})'
              >
                <div class="import-history-main">
                  <span class="import-history-icon"><i class="fa-solid fa-file-excel"></i></span>
                  <div class="import-history-content">
                    <div class="import-history-file">${entries.length} fichier${entries.length > 1 ? 's' : ''} Excel importe${entries.length > 1 ? 's' : ''}</div>
                    <div class="import-history-meta">
                      <span>Dernier: ${escapeHtml(entries[0]?.fileName || 'Import Excel')}</span>
                      <span>${escapeHtml(compactSummaryLabel)}</span>
                    </div>
                  </div>
                </div>
                <span class="import-history-caret">
                  <span class="import-history-caret-label">Afficher</span>
                  <i class="fa-solid fa-chevron-down"></i>
                </span>
              </div>
              <div class="import-history-hover-menu"></div>
            </div>
          `
          : ''
      }
    </div>
  `;
  if(!cachedMarkup){
    setCappedMapEntry(
      importHistoryPanelMarkupCache,
      panelCacheKey,
      nextMarkup,
      IMPORT_HISTORY_PANEL_MARKUP_CACHE_LIMIT
    );
  }
  setElementHtmlWithRenderKey(container, nextMarkup, renderKey, { trustRenderKey: true });
  const hoverBox = container.querySelector('.import-history-hoverbox');
  if(hoverBox){
    hoverBox.classList.toggle('is-open', importHistoryOpenPanels.has(containerId));
  }
  if(isMobileViewport() || importHistoryOpenPanels.has(containerId)){
    ensureImportHistoryHoverMenu(containerId, normalizedType);
  }
}

function pushRecycleBinEntry(type, payload){
  if(!AppState || typeof AppState !== 'object') return;
  if(!Array.isArray(AppState.recycleBin)) AppState.recycleBin = [];
  const normalizedType = String(type || 'unknown');
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const buildRecycleEntrySignature = (entryType, entryPayload)=>{
    const safeType = String(entryType || '').trim();
    const data = entryPayload && typeof entryPayload === 'object' ? entryPayload : {};
    if(safeType === 'client_delete'){
      return `${safeType}::${String(data?.client?.name || '').trim().toLowerCase()}`;
    }
    if(safeType === 'dossier_delete'){
      return [
        safeType,
        Number(data?.clientId) || 0,
        String(data?.clientName || '').trim().toLowerCase(),
        String(data?.dossier?.referenceClient || data?.dossier?.debiteur || '').trim().toLowerCase()
      ].join('::');
    }
    if(safeType === 'all_clients_delete'){
      return safeType;
    }
    return '';
  };
  const nextSignature = buildRecycleEntrySignature(normalizedType, safePayload);
  if(nextSignature){
    AppState.recycleBin = AppState.recycleBin.filter(entry=>{
      const entryPayload = entry?.payload && typeof entry.payload === 'object' ? entry.payload : {};
      return buildRecycleEntrySignature(entry?.type, entryPayload) !== nextSignature;
    });
  }
  AppState.recycleBin.push({
    type: normalizedType,
    at: new Date().toISOString(),
    by: String(currentUser?.username || '-'),
    byRole: String(currentUser?.role || ''),
    payload: safePayload
  });
  if(AppState.recycleBin.length > RECYCLE_BIN_MAX_ENTRIES){
    AppState.recycleBin = AppState.recycleBin.slice(-RECYCLE_BIN_MAX_ENTRIES);
  }
}

function pushRecycleArchiveEntries(entries){
  if(!AppState || typeof AppState !== 'object') return;
  if(!Array.isArray(entries) || !entries.length) return;
  if(!Array.isArray(AppState.recycleArchive)) AppState.recycleArchive = [];
  const normalized = normalizeRecycleArchiveEntries(entries);
  if(!normalized.length) return;
  AppState.recycleArchive.push(...normalized);
  if(AppState.recycleArchive.length > RECYCLE_ARCHIVE_MAX_ENTRIES){
    AppState.recycleArchive = AppState.recycleArchive.slice(-RECYCLE_ARCHIVE_MAX_ENTRIES);
  }
}

function getNextClientId(preferred){
  const used = new Set(
    (Array.isArray(AppState.clients) ? AppState.clients : [])
      .map(c=>Number(c?.id))
      .filter(Number.isFinite)
  );
  let id = Number(preferred);
  if(!Number.isFinite(id) || used.has(id)){
    id = Date.now() + Math.floor(Math.random() * 1000000);
  }
  while(used.has(id)) id += 1;
  return id;
}

function getUniqueClientName(baseName){
  const source = String(baseName || '').trim() || 'Client restauré';
  const names = new Set(
    (Array.isArray(AppState.clients) ? AppState.clients : [])
      .map(c=>String(c?.name || '').trim().toLowerCase())
      .filter(Boolean)
  );
  if(!names.has(source.toLowerCase())) return source;
  let counter = 2;
  let candidate = `${source} (${counter})`;
  while(names.has(candidate.toLowerCase())){
    counter += 1;
    candidate = `${source} (${counter})`;
  }
  return candidate;
}

function getRecycleEntryActionLabel(entry){
  const type = String(entry?.type || '').trim();
  if(type === 'client_delete') return 'Suppression client';
  if(type === 'dossier_delete') return 'Suppression dossier';
  if(type === 'all_clients_delete') return 'Suppression globale';
  return 'Suppression';
}

function getRecycleEntryTypeUi(entry){
  const type = String(entry?.type || '').trim();
  if(type === 'client_delete'){
    return { icon: 'fa-solid fa-users', cls: 'client' };
  }
  if(type === 'dossier_delete'){
    return { icon: 'fa-solid fa-folder-open', cls: 'dossier' };
  }
  if(type === 'all_clients_delete'){
    return { icon: 'fa-solid fa-layer-group', cls: 'snapshot' };
  }
  return { icon: 'fa-solid fa-trash-can', cls: 'default' };
}

function getRecycleEntryActorLabel(entry){
  const by = String(entry?.by || '-').trim() || '-';
  let role = String(entry?.byRole || '').trim().toLowerCase();
  if(!role && by && by !== '-'){
    const found = (Array.isArray(USERS) ? USERS : []).find(u=>
      String(u?.username || '').trim().toLowerCase() === by.toLowerCase()
    );
    role = String(found?.role || '').trim().toLowerCase();
  }
  if(!role) return by;
  return `${by} (${getRoleLabel(role)})`;
}

function getRecycleEntryDetails(entry){
  const payload = entry?.payload && typeof entry.payload === 'object' ? entry.payload : {};
  const type = String(entry?.type || '').trim();
  if(type === 'client_delete'){
    const client = payload.client && typeof payload.client === 'object' ? payload.client : {};
    const dossierCount = Array.isArray(client.dossiers) ? client.dossiers.length : 0;
    return `Client: ${client.name || '-'} (${dossierCount} dossier(s))`;
  }
  if(type === 'dossier_delete'){
    const dossier = payload.dossier && typeof payload.dossier === 'object' ? payload.dossier : {};
    const ref = dossier.referenceClient || dossier.debiteur || '-';
    const clientName = payload.clientName || '-';
    return `Client: ${clientName} | Réf dossier: ${ref}`;
  }
  if(type === 'all_clients_delete'){
    const clients = Array.isArray(payload.clients) ? payload.clients : [];
    const clientCount = clients.length;
    const dossierCount = clients.reduce((sum, client)=>sum + (Array.isArray(client?.dossiers) ? client.dossiers.length : 0), 0);
    return `Snapshot: ${clientCount} client(s), ${dossierCount} dossier(s)`;
  }
  return '-';
}

function refreshAfterRecycleRestore(){
  queuePersistAppState();
  refreshPrimaryViews({ includeSalle: true, includeRecycle: true, refreshClientDropdown: true });
}

function getPrimaryViewDeferredRenderDelay(key){
  const safeKey = String(key || '').trim();
  if(safeKey === 'dashboard') return 40;
  if(safeKey === 'clients') return 50;
  if(safeKey === 'suivi') return 70;
  if(safeKey === 'audience') return 70;
  if(safeKey === 'diligence') return 70;
  if(safeKey === 'salle') return 80;
  return 0;
}

function refreshDeferredSectionIfNeeded(key, renderFn, options = {}){
  if(typeof renderFn !== 'function') return;
  const safeKey = String(key || '').trim();
  const force = options.force === true;
  const include = options.include === true;
  const shouldDefer = !force
    && (isLargeDatasetMode() || importInProgress || heavyUiOperationCount > 0)
    && ['dashboard', 'clients', 'suivi', 'audience', 'diligence', 'salle'].includes(safeKey);
  if(force || include || isDeferredRenderSectionVisible(key)){
    if(shouldDefer){
      const scheduled = scheduleDeferredSectionRender(safeKey, ()=>runSectionRenderSafely(safeKey, ()=>renderFn({}), {
        delayMs: getPrimaryViewDeferredRenderDelay(safeKey)
      }), {
        delayMs: getPrimaryViewDeferredRenderDelay(key)
      });
      if(scheduled) return;
    }
    runSectionRenderSafely(safeKey, ()=>renderFn(force ? { force: true } : {}), {
      delayMs: getPrimaryViewDeferredRenderDelay(safeKey)
    });
    return;
  }
  markDeferredRenderDirty(key);
}

function refreshPrimaryViews(options = {}){
  refreshDeferredSectionIfNeeded('clients', renderClients, { force: options.force === true });
  const shouldRefreshClientDropdown = options.refreshClientDropdown === true || options.force === true;
  if(shouldRefreshClientDropdown){
    if(options.force === true || isDeferredRenderSectionVisible('creation')){
      updateClientDropdown(options.force === true ? { force: true } : {});
    }else{
      markDeferredRenderDirty('clientDropdown');
    }
  }
  if(options.dashboardOptions){
    refreshDeferredSectionIfNeeded('dashboard', (renderOptions)=>renderDashboard({ ...renderOptions, ...options.dashboardOptions }), {
      force: options.force === true
    });
  }else{
    refreshDeferredSectionIfNeeded('dashboard', renderDashboard, { force: options.force === true });
  }
  refreshDeferredSectionIfNeeded('suivi', renderSuivi, { force: options.force === true });
  refreshDeferredSectionIfNeeded('audience', renderAudience, { force: options.force === true });
  refreshDeferredSectionIfNeeded('diligence', renderDiligence, { force: options.force === true });
  refreshDeferredSectionIfNeeded('equipe', renderEquipe, { force: options.force === true });
  refreshDeferredSectionIfNeeded('salle', renderSalle, { force: options.force === true, include: options.includeSalle === true });
  refreshDeferredSectionIfNeeded('recycle', renderRecycleBin, { force: options.force === true, include: options.includeRecycle === true });
  if(options.resetCreationForm){
    resetCreationForm();
  }
  if(options.showView){
    showView(options.showView);
  }
}

function restoreRecycleEntryAt(index, options = {}){
  if(!canDeleteData()) return false;
  const idx = Number(index);
  if(!Number.isFinite(idx)) return false;
  const list = Array.isArray(AppState.recycleBin) ? AppState.recycleBin : [];
  const entry = list[idx];
  if(!entry) return false;
  const payload = entry.payload && typeof entry.payload === 'object' ? entry.payload : {};
  const type = String(entry.type || '').trim();
  let restored = false;
  const importHistoryEntries = normalizeImportHistoryEntries(payload.importHistoryEntries);

  if(type === 'client_delete'){
    const rawClient = payload.client && typeof payload.client === 'object' ? payload.client : null;
    const client = normalizeClient(rawClient);
    if(client){
      const restoredNameKey = String(client.name || '').trim().toLowerCase();
      const existingClient = AppState.clients.find(c=>
        String(c?.name || '').trim().toLowerCase() === restoredNameKey
      );
      if(existingClient){
        if(!Array.isArray(existingClient.dossiers)) existingClient.dossiers = [];
        const existingSignatures = new Set(
          existingClient.dossiers
            .map(d=>makeDossierMergeSignature(d))
            .filter(Boolean)
        );
        const incomingDossiers = Array.isArray(client.dossiers) ? client.dossiers : [];
        incomingDossiers.forEach(dossier=>{
          const signature = makeDossierMergeSignature(dossier);
          if(signature && existingSignatures.has(signature)) return;
          if(signature) existingSignatures.add(signature);
          existingClient.dossiers.push(dossier);
        });
      }else{
        client.id = getNextClientId(client.id);
        client.name = String(client.name || '').trim() || 'Client restauré';
        AppState.clients.push(client);
      }
      restored = true;
    }
  }else if(type === 'dossier_delete'){
    const rawDossier = payload.dossier && typeof payload.dossier === 'object' ? payload.dossier : null;
    const dossier = rawDossier ? JSON.parse(JSON.stringify(rawDossier)) : null;
    if(dossier){
      const wantedClientId = Number(payload.clientId);
      let client = AppState.clients.find(c=>Number(c?.id) === wantedClientId);
      if(!client){
        const fallbackName = getUniqueClientName(payload.clientName || 'Client restauré');
        client = { id: getNextClientId(wantedClientId), name: fallbackName, dossiers: [] };
        AppState.clients.push(client);
      }
      if(!Array.isArray(client.dossiers)) client.dossiers = [];
      client.dossiers.push(dossier);
      restored = true;
    }
  }else if(type === 'all_clients_delete'){
    const rawClients = Array.isArray(payload.clients) ? payload.clients : [];
    const restoredClients = rawClients.map(normalizeClient).filter(Boolean);
    const restoredUsers = Array.isArray(payload.usersBeforeDelete)
      ? payload.usersBeforeDelete.map(normalizeUser).filter(Boolean)
      : [];
    AppState.clients = restoredClients;
    USERS = ensureManagerUser(restoredUsers.length ? restoredUsers : USERS);
    restored = true;
  }

  if(!restored) return false;
  if(importHistoryEntries.length){
    AppState.importHistory = normalizeImportHistoryEntries([
      ...importHistoryEntries,
      ...normalizeImportHistoryEntries(AppState.importHistory)
    ]);
  }
  syncImportHistoryWithCurrentState();
  AppState.recycleBin.splice(idx, 1);
  if(!options.skipRefresh) refreshAfterRecycleRestore();
  return true;
}

function restoreRecycleItem(index){
  if(!canDeleteData()) return alert('Seul le gestionnaire peut restaurer');
  const idx = Number(index);
  if(!Number.isFinite(idx)) return;
  const entry = (Array.isArray(AppState.recycleBin) ? AppState.recycleBin : [])[idx];
  if(!entry) return;
  const detail = getRecycleEntryDetails(entry);
  if(!window.confirm(`Restaurer cet élément ?\n${detail}`)) return;
  const ok = restoreRecycleEntryAt(idx);
  if(!ok) alert('Impossible de restaurer cet élément');
}

function restoreAllRecycleItems(){
  if(!canDeleteData()) return alert('Seul le gestionnaire peut restaurer');
  const items = Array.isArray(AppState.recycleBin) ? AppState.recycleBin : [];
  if(!items.length) return alert('Corbeille vide');
  if(!window.confirm(`Restaurer tous les éléments (${items.length}) ?`)) return;
  let restoredCount = 0;
  for(let i = items.length - 1; i >= 0; i -= 1){
    if(restoreRecycleEntryAt(i, { skipRefresh: true })) restoredCount += 1;
  }
  refreshAfterRecycleRestore();
  alert(`Restauration terminée: ${restoredCount} élément(s) restauré(s).`);
}

function clearRecycleBinToBackup(){
  if(!canDeleteData()) return alert('Seul le gestionnaire peut vider la corbeille');
  const items = Array.isArray(AppState.recycleBin) ? AppState.recycleBin : [];
  if(!items.length) return alert('Corbeille vide');
  if(!window.confirm(`Vider la corbeille (${items.length} élément(s)) ?\nLes éléments seront gardés dans le backup interne.`)) return;
  pushRecycleArchiveEntries(items);
  AppState.recycleBin = [];
  queuePersistAppState();
  renderRecycleBin();
  alert('Corbeille vidée. Backup interne conservé.');
}

function renderRecycleBin(options = {}){
  if(!shouldRenderDeferredSection('recycle', options)) return;
  const body = $('recycleBody');
  if(!body) return;
  const restoreAllBtn = $('restoreAllRecycleBtn');
  const clearBtn = $('clearRecycleBinBtn');
  if(restoreAllBtn) restoreAllBtn.style.display = canDeleteData() ? '' : 'none';
  if(clearBtn) clearBtn.style.display = canDeleteData() ? '' : 'none';
  if(!canDeleteData()){
    if(clearBtn) clearBtn.disabled = true;
    body.innerHTML = '<tr><td colspan="5">Accès réservé au gestionnaire.</td></tr>';
    renderPagination('recycle', { totalRows: 0 });
    return;
  }
  const source = Array.isArray(AppState.recycleBin) ? AppState.recycleBin : [];
  if(clearBtn) clearBtn.disabled = source.length === 0;
  const rows = source
    .map((entry, originalIndex)=>({ entry, originalIndex }))
    .slice()
    .reverse();
  const pagination = paginateRows(rows, 'recycle');
  if(!pagination.rows.length){
    body.innerHTML = '<tr><td colspan="5">Corbeille vide.</td></tr>';
    renderPagination('recycle', { totalRows: 0 });
    return;
  }
  body.innerHTML = pagination.rows.map(row=>{
    const entry = row.entry;
    const typeUi = getRecycleEntryTypeUi(entry);
    const actionLabel = getRecycleEntryActionLabel(entry);
    return `
      <tr>
        <td data-label="Date & heure">${escapeHtml(formatHistoryDateTime(entry.at))}</td>
        <td data-label="Action">
          <span class="recycle-type-badge recycle-type-${escapeHtml(typeUi.cls)}">
            <i class="${escapeHtml(typeUi.icon)}"></i>
            ${escapeHtml(actionLabel)}
          </span>
        </td>
        <td data-label="Utilisateur">${escapeHtml(getRecycleEntryActorLabel(entry))}</td>
        <td data-label="Détails">${escapeHtml(getRecycleEntryDetails(entry))}</td>
        <td data-label="Restore">
          <button type="button" class="btn-primary" data-action="restore" data-index="${row.originalIndex}">
            <i class="fa-solid fa-rotate-left"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  renderPagination('recycle', pagination);
}

function getKnownJudges(){
  if(knownJudgesCache && knownJudgesCacheVersion === audienceRowsRawDataVersion){
    return knownJudgesCache;
  }
  const set = new Set();
  AppState.clients.forEach(c=>{
    c.dossiers.forEach(d=>{
      Object.values(d?.procedureDetails || {}).forEach(details=>{
        const juge = normalizeJudgeName(details?.juge || '');
        if(juge) set.add(juge);
      });
    });
  });
  knownJudgesCache = [...set].sort((a, b)=>a.localeCompare(b, 'fr'));
  knownJudgesCacheVersion = audienceRowsRawDataVersion;
  return knownJudgesCache;
}

function buildSalleAudienceMap(dayKey = selectedSalleDay){
  const targetDay = normalizeSalleWeekday(dayKey);
  const userKey = `${getCurrentClientAccessCacheKey()}||${targetDay}`;
  if(
    salleAudienceMapCache
    && salleAudienceMapCacheVersion === audienceRowsRawDataVersion
    && salleAudienceMapAssignmentsVersion === salleAssignmentsVersion
    && salleAudienceMapCacheUserKey === userKey
  ){
    return salleAudienceMapCache;
  }
  const salleToJudges = new Map();
  const normalizedAssignments = normalizeSalleAssignments(AppState.salleAssignments);
  const judgeTargetsByKey = new Map();
  normalizedAssignments.forEach(row=>{
    if(normalizeSalleWeekday(row?.day) !== targetDay) return;
    const salleLabel = normalizeSalleName(row?.salle || '');
    const judge = normalizeJudgeName(row?.juge || '');
    if(!salleLabel || !judge) return;
    if(!salleToJudges.has(salleLabel)) salleToJudges.set(salleLabel, new Set());
    salleToJudges.get(salleLabel).add(judge);
  });

  const bySalleAndJudge = new Map();
  salleToJudges.forEach((judges, salleLabel)=>{
    const judgeMap = new Map();
    [...judges].forEach(j=>{
      const sessions = [];
      judgeMap.set(j, sessions);
      const judgeKey = makeJudgeMatchKey(j);
      if(judgeKey){
        const existing = judgeTargetsByKey.get(judgeKey) || [];
        existing.push(sessions);
        judgeTargetsByKey.set(judgeKey, existing);
      }
    });
    bySalleAndJudge.set(salleLabel, judgeMap);
  });

  const matchedJudgeTargetCache = new Map();
  const audienceRows = getAudienceRowsForSidebarProjectedCached();
  audienceRows.forEach(row=>{
    if(!Array.isArray(row?.judgeKeys) || !row.judgeKeys.length || !row.session) return;
    const matchedSessionLists = new Set();
    row.judgeKeys.forEach(candidateKey=>{
      const matchedKeys = getMatchedJudgeTargetKeys(candidateKey, judgeTargetsByKey, matchedJudgeTargetCache);
      matchedKeys.forEach((targetJudgeKey)=>{
        const sessionLists = judgeTargetsByKey.get(targetJudgeKey) || [];
        sessionLists.forEach(list=>matchedSessionLists.add(list));
      });
    });
    matchedSessionLists.forEach(list=>list.push(row.session));
  });

  salleAudienceMapCache = bySalleAndJudge;
  salleAudienceMapCacheVersion = audienceRowsRawDataVersion;
  salleAudienceMapAssignmentsVersion = salleAssignmentsVersion;
  salleAudienceMapCacheUserKey = userKey;
  return bySalleAndJudge;
}

function formatDateYYYYMMDD(date){
  if(!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getSalleTribunalCategory(value){
  const text = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKC');
  if(!text) return '';
  if(
    text.includes('تجاري')
    || text.includes('تجارة')
    || text.includes('commerce')
    || text.includes('commercial')
  ){
    return 'commerciale';
  }
  if(
    text.includes('استئناف')
    || text.includes('appel')
  ){
    return 'appel';
  }
  return '';
}

function isSalleSessionMatchingDate(session){
  if(!filterSalleAudienceDate) return true;
  return String(session?.dateKey || '').trim() === filterSalleAudienceDate;
}

function isSalleSessionMatchingTribunal(session){
  if(filterSalleTribunal === 'all') return true;
  return String(session?.tribunalCategory || '').trim() === filterSalleTribunal;
}

function getSalleSidebarSessionRenderLimit(){
  if(filterSalleAudienceDate || filterSalleTribunal !== 'all'){
    return Number.POSITIVE_INFINITY;
  }
  if(isVeryLargeLiveSyncMode()){
    return SALLE_SIDEBAR_SESSION_RENDER_LIMIT_VERY_LARGE;
  }
  if(isLargeDatasetMode()){
    return SALLE_SIDEBAR_SESSION_RENDER_LIMIT;
  }
  return Number.POSITIVE_INFINITY;
}

function getMatchedJudgeTargetKeys(candidateKey, judgeTargetsByKey, cache){
  const safeCandidateKey = String(candidateKey || '').trim();
  if(!safeCandidateKey) return [];
  if(cache instanceof Map && cache.has(safeCandidateKey)){
    return cache.get(safeCandidateKey);
  }
  const matchedKeys = judgeTargetsByKey instanceof Map && judgeTargetsByKey.has(safeCandidateKey)
    ? [safeCandidateKey]
    : [];
  if(cache instanceof Map){
    cache.set(safeCandidateKey, matchedKeys);
  }
  return matchedKeys;
}

function countSalleSidebarJudges(summaryRows){
  return (Array.isArray(summaryRows) ? summaryRows : []).reduce((total, row)=>{
    const judges = Array.isArray(row?.judges) ? row.judges.length : 0;
    return total + judges;
  }, 0);
}

function shouldUseCompactSalleSidebarSummary(summaryRows, options = {}){
  if(filterSalleAudienceDate || filterSalleTribunal !== 'all') return false;
  if(options.forceCompact === true) return true;
  const audienceRowCount = Math.max(0, Number(options.audienceRowCount) || 0);
  if(audienceRowCount >= SALLE_SIDEBAR_COMPACT_RENDER_AUDIENCE_THRESHOLD){
    return true;
  }
  return countSalleSidebarJudges(summaryRows) >= SALLE_SIDEBAR_COMPACT_RENDER_JUDGE_THRESHOLD;
}

function buildSalleAudienceSidebarSummary(dayKey = selectedSalleDay, options = {}){
  const targetDay = normalizeSalleWeekday(dayKey);
  const renderLimit = Number.isFinite(Number(options.renderLimit))
    ? Math.max(0, Number(options.renderLimit))
    : getSalleSidebarSessionRenderLimit();
  const tribunalFilter = String(options.tribunalFilter || filterSalleTribunal || 'all').trim() || 'all';
  const dateFilter = String(options.dateFilter || filterSalleAudienceDate || '').trim();
  const normalizedAssignments = Array.isArray(options.assignments)
    ? options.assignments
    : normalizeSalleAssignments(AppState.salleAssignments);
  const audienceRows = Array.isArray(options.audienceRows)
    ? options.audienceRows
    : getAudienceRowsForSidebarProjectedCached();
  const salleLookup = new Map();
  const judgeTargetsByKey = new Map();
  normalizedAssignments.forEach((row)=>{
    if(normalizeSalleWeekday(row?.day) !== targetDay) return;
    const salleLabel = normalizeSalleName(row?.salle || '');
    const judgeName = normalizeJudgeName(row?.juge || '');
    if(!salleLabel || !judgeName) return;
    let judgeMap = salleLookup.get(salleLabel);
    if(!judgeMap){
      judgeMap = new Map();
      salleLookup.set(salleLabel, judgeMap);
    }
    if(judgeMap.has(judgeName)) return;
    const summary = {
      judgeName,
      totalSessionCount: 0,
      hiddenSessionCount: 0,
      sessions: []
    };
    judgeMap.set(judgeName, summary);
    const judgeKey = makeJudgeMatchKey(judgeName);
    if(!judgeKey) return;
    const existingTargets = judgeTargetsByKey.get(judgeKey) || [];
    existingTargets.push(summary);
    judgeTargetsByKey.set(judgeKey, existingTargets);
  });
  if(!salleLookup.size) return [];

  const matchedJudgeTargetCache = new Map();
  audienceRows.forEach((row)=>{
    if(!Array.isArray(row?.judgeKeys) || !row.judgeKeys.length || !row.session) return;
    const session = row.session;
    if(tribunalFilter !== 'all' && String(session?.tribunalCategory || '').trim() !== tribunalFilter) return;
    if(dateFilter && String(session?.dateKey || '').trim() !== dateFilter) return;
    const matchedTargets = new Set();
    row.judgeKeys.forEach((candidateKey)=>{
      const matchedKeys = getMatchedJudgeTargetKeys(candidateKey, judgeTargetsByKey, matchedJudgeTargetCache);
      matchedKeys.forEach((targetJudgeKey)=>{
        const summaries = judgeTargetsByKey.get(targetJudgeKey) || [];
        summaries.forEach((summary)=>matchedTargets.add(summary));
      });
    });
    matchedTargets.forEach((summary)=>{
      summary.totalSessionCount += 1;
      if(summary.sessions.length < renderLimit){
        summary.sessions.push(session);
      }
    });
  });

  return [...salleLookup.entries()]
    .sort((a, b)=>a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }))
    .map(([salleLabel, judgeMap])=>({
      salleLabel,
      judges: [...judgeMap.values()]
        .map((summary)=>({
          ...summary,
          sessions: summary.sessions.slice().sort((a, b)=>(Number(b?.sortTime) || 0) - (Number(a?.sortTime) || 0)),
          hiddenSessionCount: Math.max(0, Number(summary.totalSessionCount || 0) - summary.sessions.length)
        }))
        .sort((a, b)=>a.judgeName.localeCompare(b.judgeName, 'fr', { sensitivity: 'base' }))
    }));
}

function renderSalleSidebarSummaryHtml(summaryRows, dayLabel, options = {}){
  const rows = Array.isArray(summaryRows) ? summaryRows : [];
  const compact = options.compact === true;
  if(!rows.length) return '';
  const html = rows.map(({ salleLabel, judges })=>{
    const salleEncoded = encodeURIComponent(String(salleLabel));
    const dayEncoded = encodeURIComponent(String(selectedSalleDay));
    const judgeHtml = judges.map((summary)=>{
      const sessionHtml = compact
        ? `<div class="sidebar-salle-session">${Math.max(0, Number(summary.totalSessionCount) || 0)} audience(s)</div>`
        : (
          summary.sessions.length
            ? summary.sessions
              .map((session)=>`<div class="sidebar-salle-session">${escapeHtml(session.date)} | ${escapeHtml(session.ref)} | ${escapeHtml(session.debiteur)}</div>`)
              .join('')
              + (summary.hiddenSessionCount > 0
                ? `<div class="sidebar-salle-session">+${summary.hiddenSessionCount} audience(s) supplementaire(s)</div>`
                : '')
            : '<div class="sidebar-salle-session">Aucune audience</div>'
        );
      return `
        <div class="sidebar-salle-item">
          <div class="sidebar-salle-judge">${escapeHtml(summary.judgeName)}</div>
          ${sessionHtml}
        </div>
      `;
    }).join('');
    return `
      <div class="sidebar-salle-item">
        <div class="sidebar-salle-title-row">
          <div class="sidebar-salle-title">${escapeHtml(salleLabel)}</div>
          <button type="button" class="btn-primary btn-salle-export" onclick="exportSalleAudiences('${salleEncoded}','${dayEncoded}')">
            <i class="fa-solid fa-file-export"></i> Exporter
          </button>
        </div>
        ${judgeHtml}
      </div>
    `;
  }).join('');
  return `<h4><i class="fa-solid fa-calendar-check"></i> Audiences par salle - ${escapeHtml(dayLabel)}</h4>${html}`;
}

function getFilteredSalleAudienceMap(dayKey = selectedSalleDay){
  const targetDay = normalizeSalleWeekday(dayKey);
  const userKey = getCurrentClientAccessCacheKey();
  const filterKey = [
    targetDay,
    filterSalleTribunal,
    filterSalleAudienceDate,
    userKey
  ].join('||');
  if(
    filteredSalleAudienceMapCache
    && filteredSalleAudienceMapCacheVersion === audienceRowsRawDataVersion
    && filteredSalleAudienceMapAssignmentsVersion === salleAssignmentsVersion
    && filteredSalleAudienceMapCacheUserKey === userKey
    && filteredSalleAudienceMapFilterKey === filterKey
  ){
    return filteredSalleAudienceMapCache;
  }

  const sourceMap = buildSalleAudienceMap(targetDay);
  const filteredMap = new Map();
  sourceMap.forEach((judgeMap, salleLabel)=>{
    const nextJudgeMap = new Map();
    judgeMap.forEach((sessions, judgeName)=>{
      const visibleSessions = (Array.isArray(sessions) ? sessions : [])
        .filter(session=>isSalleSessionMatchingTribunal(session))
        .filter(session=>isSalleSessionMatchingDate(session))
        .sort((a, b)=>(Number(b?.sortTime) || 0) - (Number(a?.sortTime) || 0));
      nextJudgeMap.set(judgeName, visibleSessions);
    });
    filteredMap.set(salleLabel, nextJudgeMap);
  });

  filteredSalleAudienceMapCache = filteredMap;
  filteredSalleAudienceMapCacheVersion = audienceRowsRawDataVersion;
  filteredSalleAudienceMapAssignmentsVersion = salleAssignmentsVersion;
  filteredSalleAudienceMapCacheUserKey = userKey;
  filteredSalleAudienceMapFilterKey = filterKey;
  return filteredMap;
}

function renderSidebarSalleSessions(){
  const container = $('sidebarSalleSessions');
  if(!container) return;
  if(typeof shouldRenderSidebarSalleSessionsNow === 'function' && !shouldRenderSidebarSalleSessionsNow()){
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }
  if(!currentUser){
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const dayLabel = getSalleWeekdayLabel(selectedSalleDay);
  const projectedAudienceRows = getAudienceRowsForSidebarProjectedCached();
  const preferCompactSummary = projectedAudienceRows.length >= SALLE_SIDEBAR_COMPACT_RENDER_AUDIENCE_THRESHOLD;
  const preferredRenderLimit = preferCompactSummary ? 0 : getSalleSidebarSessionRenderLimit();
  if(isVeryLargeLiveSyncMode() || preferCompactSummary){
    const requestId = ++salleSidebarWorkerRequestSeq;
    const renderKey = [
      audienceRowsRawDataVersion,
      salleAssignmentsVersion,
      selectedSalleDay,
      filterSalleTribunal,
      filterSalleAudienceDate,
      getCurrentClientAccessCacheKey(),
      preferCompactSummary ? 'compact' : 'full',
      'worker'
    ].join('||');
    setElementHtmlWithRenderKey(
      container,
      '<div class="diligence-empty">Chargement des audiences par salle...</div>',
      `sidebar-salle-loading::${renderKey}`,
      { trustRenderKey: true }
    );
    container.style.display = '';
    runSalleSidebarWorker({
      dayKey: selectedSalleDay,
      renderLimit: preferredRenderLimit,
      tribunalFilter: filterSalleTribunal,
      dateFilter: filterSalleAudienceDate,
      assignments: normalizeSalleAssignments(AppState.salleAssignments),
      audienceRows: projectedAudienceRows
    }, requestId).then((summary)=>{
      if(requestId !== salleSidebarWorkerRequestSeq) return;
      const summaryRows = Array.isArray(summary?.salles) ? summary.salles : null;
      const fallbackRows = summaryRows || buildSalleAudienceSidebarSummary(selectedSalleDay, {
        renderLimit: preferredRenderLimit,
        audienceRows: projectedAudienceRows
      });
      if(!fallbackRows.length){
        container.style.display = 'none';
        setElementHtmlWithRenderKey(container, '', `sidebar-salle-empty::${renderKey}`, { trustRenderKey: true });
        return;
      }
      const compact = shouldUseCompactSalleSidebarSummary(fallbackRows, {
        audienceRowCount: projectedAudienceRows.length,
        forceCompact: preferCompactSummary
      });
      setElementHtmlWithRenderKey(
        container,
        renderSalleSidebarSummaryHtml(fallbackRows, dayLabel, { compact }),
        `sidebar-salle-summary::${renderKey}::${fallbackRows.length}::${compact ? 'compact' : 'full'}`,
        { trustRenderKey: true }
      );
      container.style.display = '';
    }).catch(()=>{
      if(requestId !== salleSidebarWorkerRequestSeq) return;
      const fallbackRows = buildSalleAudienceSidebarSummary(selectedSalleDay, {
        renderLimit: preferredRenderLimit,
        audienceRows: projectedAudienceRows
      });
      if(!fallbackRows.length){
        container.style.display = 'none';
        setElementHtmlWithRenderKey(container, '', `sidebar-salle-empty::${renderKey}`, { trustRenderKey: true });
        return;
      }
      const compact = shouldUseCompactSalleSidebarSummary(fallbackRows, {
        audienceRowCount: projectedAudienceRows.length,
        forceCompact: preferCompactSummary
      });
      setElementHtmlWithRenderKey(
        container,
        renderSalleSidebarSummaryHtml(fallbackRows, dayLabel, { compact }),
        `sidebar-salle-summary::${renderKey}::fallback::${fallbackRows.length}::${compact ? 'compact' : 'full'}`,
        { trustRenderKey: true }
      );
      container.style.display = '';
    });
    return;
  }

  try{
    const summaryRows = buildSalleAudienceSidebarSummary(selectedSalleDay, {
      renderLimit: preferredRenderLimit,
      audienceRows: projectedAudienceRows
    });
    if(!summaryRows.length){
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }
    const compact = shouldUseCompactSalleSidebarSummary(summaryRows, {
      audienceRowCount: projectedAudienceRows.length
    });
    container.innerHTML = renderSalleSidebarSummaryHtml(summaryRows, dayLabel, { compact });
    container.style.display = '';
  }catch(err){
    const message = String(err?.message || err || '').trim();
    const isStackOverflow = err instanceof RangeError || message.includes('Maximum call stack size exceeded');
    if(!isStackOverflow) throw err;
    console.warn('Sidebar salle compacte de secours activee', err);
    const fallbackRows = buildSalleAudienceSidebarSummary(selectedSalleDay, {
      renderLimit: 0,
      audienceRows: projectedAudienceRows
    });
    if(!fallbackRows.length){
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }
    container.innerHTML = renderSalleSidebarSummaryHtml(fallbackRows, dayLabel, { compact: true });
    container.style.display = '';
  }
}

async function exportSalleAudiences(salleEncoded, dayEncoded){
  return runWithHeavyUiOperation(async ()=>{
    const salleLabel = decodeURIComponent(String(salleEncoded || ''));
    const dayKey = normalizeSalleWeekday(decodeURIComponent(String(dayEncoded || selectedSalleDay)));
    const bySalleAndJudge = getFilteredSalleAudienceMap(dayKey);
    const judgeMap = bySalleAndJudge.get(salleLabel);
    if(!judgeMap){
      alert('Salle introuvable.');
      return;
    }

    const headers = ['Client', 'Adversaire', 'N° Dossier', 'Juge', 'Instruction', 'Statut', 'Ordonnance', 'Sort'];
    const sessionEntries = [];
    let dateAudience = '';
    const tribunalLabelsRaw = [];
    const judgeEntries = [...judgeMap.entries()]
      .sort((a, b)=>a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }));
    await runChunked(judgeEntries, async ([judgeName, sessions])=>{
        const visibleSessions = Array.isArray(sessions) ? sessions : [];
        await runChunked(visibleSessions, async (s)=>{
            const maybeDate = String(s?.date || '').trim();
            if(!dateAudience && maybeDate && maybeDate !== '-') dateAudience = maybeDate;
            const tribunalText = String(s?.tribunal || '').trim();
            if(tribunalText && tribunalText !== '-') tribunalLabelsRaw.push(tribunalText);
            sessionEntries.push({
              judgeName: judgeName || '-',
              session: s
            });
        }, {
          chunkSize: isVeryLargeLiveSyncMode() ? 12 : (isLargeDatasetMode() ? 24 : 60)
        });
    }, {
      chunkSize: 1
    });
    const tribunalClusterState = buildTribunalClusterStateFromLabels(tribunalLabelsRaw);
    const tribunalLabels = tribunalClusterState.options.map(v=>String(v?.label || '').trim()).filter(Boolean);
    const tribunalLabel = tribunalLabels.length ? tribunalLabels.join(' / ') : '-';

    const safeSalle = salleLabel.replace(/[^\w\-]+/g, '_');
    const safeDay = dayKey.replace(/[^\w\-]+/g, '_');
    if(isVeryLargeLiveSyncMode() || shouldPreferSalleExportCsvPath(sessionEntries.length)){
      const csvHeaders = ['Salle', 'Jour', 'Date audience', 'Tribunal', ...headers];
      const csvBlob = await createMappedCsvBlobChunked({
        headers: csvHeaders,
        items: sessionEntries.length ? sessionEntries : [null],
        mapRow: (entry)=>{
          if(!entry){
            return [
              salleLabel || '-',
              dayKey || '-',
              dateAudience || '-',
              tribunalLabel || '-',
              '-', '-', '-', '-', '-', '-', '-', '-'
            ];
          }
          const session = entry.session || {};
          return [
            salleLabel || '-',
            dayKey || '-',
            dateAudience || '-',
            tribunalLabel || '-',
            session.client || '-',
            session.debiteur || '-',
            session.ref || '-',
            entry.judgeName || '-',
            session.instruction || '-',
            session.statut || 'En cours',
            session.ordonnance || '',
            ''
          ];
        },
        progressLabel: 'Export salle CSV',
        chunkSize: isVeryLargeLiveSyncMode() ? 12 : (isLargeDatasetMode() ? 24 : 80)
      });
      await saveBlobDirectOrDownload(csvBlob, `audiences_${safeSalle || 'salle'}_${safeDay || 'jour'}.csv`);
      return;
    }

    const rows = sessionEntries.length
      ? await mapChunked(sessionEntries, async (entry)=>{
        const session = entry.session || {};
        return [
          session.client || '-',
          session.debiteur || '-',
          session.ref || '-',
          entry.judgeName || '-',
          session.instruction || '-',
          session.statut || 'En cours',
          session.ordonnance || '',
          ''
        ];
      }, {
        chunkSize: isVeryLargeLiveSyncMode() ? 20 : 60
      })
      : [['-', '-', '-', '-', '-', '-', '-', '-']];

    await exportAudienceWorkbookXlsxStyled({
      headers,
      rows,
      subtitle: `Date d'audience : ${String(dateAudience || '-')} | Salle : ${salleLabel || '-'} | Tribunal : ${tribunalLabel || '-'}`,
      sheetName: 'Audience',
      colWidths: [{ wch: 22 }, { wch: 28 }, { wch: 28 }, { wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 34 }],
      filename: `audiences_${safeSalle || 'salle'}_${safeDay || 'jour'}.xlsx`
    });
  });
}

function ensureManagerUser(users){
  const validUsers = Array.isArray(users) ? users.filter(Boolean).map(u=>({ ...u })) : [];
  const defaultManagerIdx = validUsers.findIndex(
    u=>String(u?.username || '').trim().toLowerCase() === DEFAULT_MANAGER_USERNAME
  );
  if(defaultManagerIdx === -1){
    const legacyManagerIdx = validUsers.findIndex(
      u=>LEGACY_MANAGER_USERNAMES.includes(String(u?.username || '').trim().toLowerCase())
    );
    if(legacyManagerIdx >= 0){
      validUsers[legacyManagerIdx].username = DEFAULT_MANAGER_USERNAME;
      validUsers[legacyManagerIdx].role = 'manager';
      validUsers[legacyManagerIdx].clientIds = [];
    }
  }
  const existingUsernames = new Set(
    validUsers.map(u=>String(u?.username || '').trim().toLowerCase()).filter(Boolean)
  );
  buildSeedUsers().forEach(seedUser=>{
    const usernameKey = String(seedUser?.username || '').trim().toLowerCase();
    if(!usernameKey || existingUsernames.has(usernameKey)) return;
    validUsers.push({ ...seedUser });
    existingUsernames.add(usernameKey);
  });
  const resolvedManagerIdx = validUsers.findIndex(
    u=>String(u.username || '').trim().toLowerCase() === DEFAULT_MANAGER_USERNAME
  );

  if(resolvedManagerIdx >= 0){
    // Keep the default manager account always available.
    const defaultManager = validUsers[resolvedManagerIdx];
    defaultManager.username = DEFAULT_MANAGER_USERNAME;
    defaultManager.role = 'manager';
    defaultManager.clientIds = [];
    defaultManager.requirePasswordChange = false;
    if(!hasAnyStoredPassword(defaultManager)){
      defaultManager.password = DEFAULT_MANAGER_PASSWORD;
      defaultManager.passwordHash = '';
      defaultManager.passwordSalt = '';
      defaultManager.passwordVersion = 0;
      defaultManager.passwordUpdatedAt = '';
    }
    return validUsers;
  }

  const maxId = validUsers.reduce((acc, u)=>Math.max(acc, Number(u.id) || 0), 0);
  validUsers.unshift({
    id: Math.max(1, maxId + 1),
    username: DEFAULT_MANAGER_USERNAME,
    password: DEFAULT_MANAGER_PASSWORD,
    passwordHash: '',
    passwordSalt: '',
    passwordVersion: 0,
    passwordUpdatedAt: '',
    requirePasswordChange: false,
    role: 'manager',
    clientIds: []
  });
  return validUsers;
}

function buildStateSignature(clients, salleAssignments, users, draft, recycleBin, recycleArchive, importHistory){
  try{
    return JSON.stringify({
      clients,
      salleAssignments,
      users,
      audienceDraft: draft,
      recycleBin,
      recycleArchive,
      importHistory
    });
  }catch(err){
    return '';
  }
}

function getStateSignatureFromPayload(payload){
  if(!payload || typeof payload !== 'object') return '';
  return buildStateSignature(
    payload.clients,
    payload.salleAssignments,
    payload.users,
    payload.audienceDraft,
    payload.recycleBin,
    payload.recycleArchive,
    payload.importHistory
  );
}

function buildAppStatePayload(){
  return {
    clients: AppState.clients,
    salleAssignments: AppState.salleAssignments,
    users: USERS,
    audienceDraft: audienceDraft,
    recycleBin: Array.isArray(AppState.recycleBin) ? AppState.recycleBin : [],
    recycleArchive: Array.isArray(AppState.recycleArchive) ? AppState.recycleArchive : [],
    importHistory: normalizeImportHistoryEntries(AppState.importHistory)
  };
}

function resolveAppStateSnapshotPayload(payload){
  return payload && typeof payload === 'object'
    ? payload
    : buildAppStatePayload();
}

function buildRemoteStateVersionSignature(source){
  const versionNum = Number(source?.version);
  const updatedAt = String(source?.updatedAt || '').trim();
  if(!(Number.isFinite(versionNum) && versionNum >= 0) || !updatedAt) return '';
  return `remote:${versionNum}:${updatedAt}`;
}

function shouldUsePagedRemoteStateLoad(meta){
  if(!meta || typeof meta !== 'object') return false;
  if(String(meta?.recommendedMode || '').trim().toLowerCase() === 'paged') return true;
  const clientCount = Number(meta?.clientCount);
  if(Number.isFinite(clientCount) && clientCount >= REMOTE_STATE_PAGED_LOAD_MIN_CLIENTS) return true;
  const dossierCount = Number(meta?.dossierCount);
  return Number.isFinite(dossierCount) && dossierCount >= REMOTE_STATE_PAGED_LOAD_MIN_DOSSIERS;
}

function updateRemoteStateMetadata(source){
  const versionNum = Number(source?.version);
  remoteStateVersion = Number.isFinite(versionNum) && versionNum >= 0 ? versionNum : 0;
  remoteStateUpdatedAt = String(source?.updatedAt || '');
}

function beginHeavyUiOperation(){
  heavyUiOperationCount += 1;
}

function endHeavyUiOperation(){
  heavyUiOperationCount = Math.max(0, heavyUiOperationCount - 1);
}

async function runWithHeavyUiOperation(task){
  beginHeavyUiOperation();
  try{
    await yieldToMainThread();
    const result = await task();
    await yieldToMainThread();
    return result;
  }finally{
    endHeavyUiOperation();
  }
}

function getRemoteRefreshBlocker(){
  if(typeof document !== 'undefined' && document.hidden) return 'hidden';
  if(editingDossier) return 'editing';
  if(importInProgress) return 'import';
  if(heavyUiOperationCount > 0) return 'busy';
  if(persistTimer) return 'persist';
  // Only block while local audience draft changes are still unsaved.
  // A non-empty persisted draft should not stop live updates from other users.
  if(audienceAutoSaveTimer) return 'draft';
  return '';
}

function makeClientMatchKey(value){
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getDossierAudienceReferenceKeys(dossier){
  const refs = new Set();
  const pushRef = (value)=>{
    splitReferenceValues(value).forEach(part=>{
      const key = normalizeReferenceForAudienceLookup(part);
      if(key) refs.add(key);
    });
  };
  pushRef(dossier?.referenceClient || '');
  const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
    ? dossier.procedureDetails
    : {};
  Object.values(details).forEach(proc=>{
    pushRef(proc?.referenceClient || '');
  });
  return refs;
}

function getDossierClientReferenceMatchKeys(dossier){
  const refs = new Set();
  const pushRef = (value)=>{
    const raw = String(value || '').trim();
    if(!raw || normalizeDossierReferenceValue(raw)) return;
    getClientReferenceMatchKeys(raw).forEach(key=>{
      if(key) refs.add(key);
    });
  };
  pushRef(dossier?.referenceClient || '');
  const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
    ? dossier.procedureDetails
    : {};
  Object.values(details).forEach(proc=>{
    pushRef(proc?.referenceClient || '');
  });
  return refs;
}

function getDossierClientReferenceDisplayValues(dossier){
  const refs = [];
  const seen = new Set();
  const pushRef = (value)=>{
    const raw = String(value || '').trim();
    if(!raw || normalizeDossierReferenceValue(raw) || seen.has(raw)) return;
    seen.add(raw);
    refs.push(raw);
  };
  pushRef(dossier?.referenceClient || '');
  const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
    ? dossier.procedureDetails
    : {};
  Object.values(details).forEach(proc=>{
    pushRef(proc?.referenceClient || '');
  });
  return refs;
}

function refreshAudienceRefClientMismatchFlags(dossier){
  if(!dossier || typeof dossier !== 'object') return false;
  const refs = getDossierClientReferenceMatchKeys(dossier);
  const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
    ? dossier.procedureDetails
    : {};
  let changed = false;
  Object.values(details).forEach((proc)=>{
    if(!proc || typeof proc !== 'object' || !proc._refClientMismatch) return;
    const providedKeys = getClientReferenceMatchKeys(proc._refClientProvided || '');
    if(providedKeys.some(key=>refs.has(key))){
      delete proc._refClientMismatch;
      delete proc._refClientProvided;
      delete proc._refClientExpected;
      changed = true;
      return;
    }
    const expectedRefs = getDossierClientReferenceDisplayValues(dossier);
    proc._refClientExpected = expectedRefs.length ? expectedRefs.join('/') : '-';
  });
  return changed;
}

function getDossierProcedureReferenceKeys(dossier){
  const refs = new Set();
  const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
    ? dossier.procedureDetails
    : {};
  Object.values(details).forEach(proc=>{
    splitReferenceValues(proc?.referenceClient || '').forEach(part=>{
      const key = normalizeReferenceForAudienceLookup(part);
      if(key) refs.add(key);
    });
  });
  return refs;
}

function getDossierDebiteurKey(dossier){
  return String(dossier?.debiteur || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getDossierProcedureAudienceReferenceKeys(dossier, procKey){
  const refs = new Set();
  const normalizedProcKey = parseProcedureToken(procKey || '');
  const pushRef = (value)=>{
    splitReferenceValues(value).forEach(part=>{
      const key = normalizeReferenceForAudienceLookup(part);
      if(key) refs.add(key);
    });
  };
  const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
    ? dossier.procedureDetails
    : {};
  if(normalizedProcKey && details[normalizedProcKey]){
    pushRef(details[normalizedProcKey]?.referenceClient || '');
  }
  if(!refs.size){
    pushRef(dossier?.referenceClient || '');
  }
  if(!refs.size){
    getDossierAudienceReferenceKeys(dossier).forEach(ref=>refs.add(ref));
  }
  return refs;
}

function getAudiencePurpleStatusSnapshot(dossier){
  const snapshot = getDossierDisplayStatusSnapshot(dossier);
  if(snapshot.statut === 'Arrêt définitif'){
    return { statut: snapshot.statut, detail: snapshot.detail || '', priority: 2 };
  }
  if(snapshot.statut === 'Soldé'){
    return { statut: snapshot.statut, detail: snapshot.detail || '', priority: 1 };
  }
  return null;
}

function buildAudienceClosedStatusLookup(){
  const lookup = new Map();
  AppState.clients.forEach(client=>{
    (Array.isArray(client?.dossiers) ? client.dossiers : []).forEach(dossier=>{
      const snapshot = getAudiencePurpleStatusSnapshot(dossier);
      if(!snapshot) return;
      normalizeProcedures(dossier).forEach(procKey=>{
        if(!isAudienceProcedure(procKey)) return;
        getDossierProcedureAudienceReferenceKeys(dossier, procKey).forEach(refKey=>{
          const lookupKey = `${procKey}::${refKey}`;
          const existing = lookup.get(lookupKey);
          if(!existing || snapshot.priority > existing.priority){
            lookup.set(lookupKey, snapshot);
          }
        });
      });
    });
  });
  return lookup;
}

function getAudienceClosedStatusLookupCached(){
  if(
    audienceClosedStatusLookupCache
    && audienceClosedStatusLookupCacheVersion === audienceRowsRawDataVersion
  ){
    return audienceClosedStatusLookupCache;
  }
  const lookup = buildAudienceClosedStatusLookup();
  audienceClosedStatusLookupCache = lookup;
  audienceClosedStatusLookupCacheVersion = audienceRowsRawDataVersion;
  return lookup;
}

function resolveAudienceRowStatusSnapshot(row, closedStatusLookup){
  const currentSnapshot = getDossierDisplayStatusSnapshot(row?.d);
  const directSnapshot = getAudiencePurpleStatusSnapshot(row?.d);
  if(directSnapshot){
    return { statut: directSnapshot.statut, detail: directSnapshot.detail || currentSnapshot.detail || '' };
  }
  const refKey = String(row?.__rowReference || '').trim();
  const procKey = parseProcedureToken(row?.procKey || '');
  if(!refKey || !procKey || !(closedStatusLookup instanceof Map)){
    return currentSnapshot;
  }
  const linkedSnapshot = closedStatusLookup.get(`${procKey}::${refKey}`);
  if(linkedSnapshot){
    return { statut: linkedSnapshot.statut, detail: linkedSnapshot.detail || currentSnapshot.detail || '' };
  }
  return currentSnapshot;
}

function chooseAudienceProcedureTarget(globalDossier, orphanProcKey){
  const globalProcs = new Set(normalizeProcedures(globalDossier));
  if(globalProcs.has(orphanProcKey)) return orphanProcKey;
  const audienceProcs = [...globalProcs].filter(proc=>isAudienceProcedure(proc));
  if(audienceProcs.length) return audienceProcs[0];
  return orphanProcKey || 'ASS';
}

function findAudienceOrphanClient(){
  return AppState.clients.find(
    client=>makeClientMatchKey(client?.name || '') === makeClientMatchKey(AUDIENCE_ORPHAN_CLIENT_NAME)
  ) || null;
}

function mergeAudienceProcedureFields(targetProc, sourceProc){
  const fields = ['referenceClient', 'audience', 'juge', 'sort', 'tribunal', 'depotLe', 'dateDepot', 'executionNo', 'color', 'instruction', 'attOrdOrOrdOk'];
  let sourceHasAudienceData = false;
  let targetHasAudienceData = false;
  let changed = false;
  fields.forEach(field=>{
    const incoming = String(sourceProc?.[field] ?? '').trim();
    const existing = String(targetProc?.[field] ?? '').trim();
    if(incoming){
      sourceHasAudienceData = true;
      if(!existing){
        targetProc[field] = sourceProc[field];
        changed = true;
      }
    }
    const targetValue = String(targetProc?.[field] ?? '').trim();
    if(targetValue){
      targetHasAudienceData = true;
    }
  });
  const sourceBatchId = String(sourceProc?._audienceImportBatchId || '').trim();
  const targetBatchId = String(targetProc?._audienceImportBatchId || '').trim();
  if(sourceBatchId && !targetBatchId){
    targetProc._audienceImportBatchId = sourceBatchId;
    changed = true;
  }
  delete targetProc._missingGlobal;
  // Mark as merged only when source actually contains audience payload and
  // target now carries audience values (newly copied or already present).
  return sourceHasAudienceData && (changed || targetHasAudienceData);
}

function resolveAudienceTargetProcKey(dossier, preferredProcKey, sourceProcData){
  if(!dossier.procedureDetails || typeof dossier.procedureDetails !== 'object'){
    dossier.procedureDetails = {};
  }
  const details = dossier.procedureDetails;
  const baseKey = String(preferredProcKey || 'ASS').trim() || 'ASS';
  const sourceRef = normalizeReferenceForAudienceLookup(String(sourceProcData?.referenceClient || '').trim());

  if(!details[baseKey]) return baseKey;

  const baseRef = normalizeReferenceForAudienceLookup(String(details[baseKey]?.referenceClient || '').trim());
  if(!sourceRef || !baseRef || sourceRef === baseRef){
    return baseKey;
  }

  const sameRefEntry = Object.entries(details).find(([, procData])=>{
    const ref = normalizeReferenceForAudienceLookup(String(procData?.referenceClient || '').trim());
    return !!(ref && sourceRef && ref === sourceRef);
  });
  if(sameRefEntry) return sameRefEntry[0];

  let idx = 2;
  while(details[`${baseKey} ${idx}`]){
    idx += 1;
  }
  return `${baseKey} ${idx}`;
}

function reconcileAudienceOrphanDossiers(){
  const orphanClient = findAudienceOrphanClient();
  if(!orphanClient || !Array.isArray(orphanClient.dossiers) || !orphanClient.dossiers.length){
    return { matchedDossiers: 0, mergedProcedures: 0 };
  }

  const globalCandidates = [];
  AppState.clients.forEach(client=>{
    if(client === orphanClient) return;
    (Array.isArray(client?.dossiers) ? client.dossiers : []).forEach(dossier=>{
      if(!dossier || dossier.isAudienceOrphanImport) return;
      globalCandidates.push({
        dossier,
        refs: getDossierAudienceReferenceKeys(dossier),
        clientRefs: getDossierClientReferenceMatchKeys(dossier),
        procRefs: getDossierProcedureReferenceKeys(dossier),
        debiteurKey: getDossierDebiteurKey(dossier)
      });
    });
  });

  let matchedDossiers = 0;
  let mergedProcedures = 0;
  const keptOrphans = [];

  orphanClient.dossiers.forEach(orphanDossier=>{
    if(!orphanDossier || !orphanDossier.isAudienceOrphanImport){
      keptOrphans.push(orphanDossier);
      return;
    }

    const orphanRefs = getDossierAudienceReferenceKeys(orphanDossier);
    const orphanProcRefs = getDossierProcedureReferenceKeys(orphanDossier);
    if(!orphanRefs.size && !orphanProcRefs.size){
      keptOrphans.push(orphanDossier);
      return;
    }
    const orphanDebiteur = getDossierDebiteurKey(orphanDossier);
    const orphanProcs = new Set(normalizeProcedures(orphanDossier));
    const orphanClientRefKeys = getClientReferenceMatchKeys(String(orphanDossier?.referenceClient || '').trim());

    let bestCandidate = null;
    let bestScore = -1;
    globalCandidates.forEach(candidate=>{
      const hasProcRefMatch = orphanProcRefs.size
        ? [...orphanProcRefs].some(ref=>candidate.procRefs.has(ref))
        : false;
      const hasDirectClientRefMatch = orphanClientRefKeys.length
        && orphanClientRefKeys.some(ref=>candidate.clientRefs.has(ref) || candidate.refs.has(ref) || candidate.procRefs.has(ref));
      const hasRefMatch = hasProcRefMatch || hasDirectClientRefMatch || [...orphanRefs].some(ref=>candidate.refs.has(ref));
      if(!hasRefMatch) return;
      let score = 200;
      if(hasProcRefMatch) score += 120;
      if(hasDirectClientRefMatch) score += 90;
      const candidateClientRefKeys = getClientReferenceMatchKeys(String(candidate?.dossier?.referenceClient || '').trim());
      if(orphanClientRefKeys.length && candidateClientRefKeys.some(key=>orphanClientRefKeys.includes(key))){
        score += 60;
      }
      if(orphanDebiteur && candidate.debiteurKey && orphanDebiteur === candidate.debiteurKey){
        score += 50;
      }
      const candidateProcs = new Set(normalizeProcedures(candidate.dossier));
      let overlap = 0;
      orphanProcs.forEach(proc=>{
        if(candidateProcs.has(proc)) overlap += 1;
      });
      score += overlap * 20;
      if(score > bestScore){
        bestScore = score;
        bestCandidate = candidate;
      }
    });

    if(!bestCandidate){
      keptOrphans.push(orphanDossier);
      return;
    }

    if(!bestCandidate.dossier.procedureDetails || typeof bestCandidate.dossier.procedureDetails !== 'object'){
      bestCandidate.dossier.procedureDetails = {};
    }
    const orphanDetails = orphanDossier?.procedureDetails && typeof orphanDossier.procedureDetails === 'object'
      ? orphanDossier.procedureDetails
      : {};
    let mergedForCurrentOrphan = 0;
    Object.entries(orphanDetails).forEach(([orphanProcKey, orphanProcData])=>{
      const baseTargetProcKey = chooseAudienceProcedureTarget(bestCandidate.dossier, orphanProcKey);
      const targetProcKey = resolveAudienceTargetProcKey(bestCandidate.dossier, baseTargetProcKey, orphanProcData || {});
      if(!bestCandidate.dossier.procedureDetails[targetProcKey]){
        bestCandidate.dossier.procedureDetails[targetProcKey] = {};
      }
      const targetProc = bestCandidate.dossier.procedureDetails[targetProcKey] || {};
      const sourceProc = orphanProcData || {};
      const didMergeAudienceData = mergeAudienceProcedureFields(targetProc, sourceProc);
      if(didMergeAudienceData){
        mergedProcedures += 1;
        mergedForCurrentOrphan += 1;
      }
    });

    const updatedProcedures = normalizeProcedures(bestCandidate.dossier);
    bestCandidate.dossier.procedureList = updatedProcedures;
    bestCandidate.dossier.procedure = updatedProcedures.join(', ');

    if(mergedForCurrentOrphan > 0){
      matchedDossiers += 1;
      return;
    }
    keptOrphans.push(orphanDossier);
  });

  orphanClient.dossiers = keptOrphans;
  if(!orphanClient.dossiers.length){
    const orphanIdx = AppState.clients.findIndex(c=>c === orphanClient);
    if(orphanIdx !== -1) AppState.clients.splice(orphanIdx, 1);
  }

  return { matchedDossiers, mergedProcedures };
}

function makeDossierMergeSignature(dossier){
  if(!dossier || typeof dossier !== 'object') return '';
  const ref = normalizeReferenceValue(String(dossier.referenceClient || '').trim());
  const debiteur = String(dossier.debiteur || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const procedures = normalizeProcedures(dossier).map(v=>String(v || '').trim()).filter(Boolean).sort();
  const procedureKey = procedures.join('|');
  const dateAffectation = normalizeDateDDMMYYYY(dossier.dateAffectation || '') || '';
  return [ref, debiteur, procedureKey, dateAffectation].join('::');
}

function normalizeImportedPayload(raw){
  if(!raw || typeof raw !== 'object') return null;
  if(Array.isArray(raw.clients)){
    return raw;
  }
  if(raw.data && typeof raw.data === 'object' && Array.isArray(raw.data.clients)){
    return raw.data;
  }
  if(raw.state && typeof raw.state === 'object' && Array.isArray(raw.state.clients)){
    return raw.state;
  }
  return null;
}

async function importAppsavocatPayload(rawPayload){
  try{
    const payload = normalizeImportedPayload(rawPayload);
    if(!payload){
      throw new Error('Format non reconnu: structure "clients" introuvable.');
    }

    const importedClients = Array.isArray(payload.clients)
      ? payload.clients.map(normalizeClient).filter(Boolean)
      : [];
    const importedUsers = Array.isArray(payload.users)
      ? payload.users.map(normalizeUser).filter(Boolean)
      : [];
    const importedSalleAssignments = normalizeSalleAssignments(payload.salleAssignments);

    if(!importedClients.length && !importedUsers.length && !importedSalleAssignments.length){
      throw new Error('Le fichier ne contient aucune donnée exploitable.');
    }

    const existingClients = Array.isArray(AppState.clients) ? AppState.clients : [];
    const existingByName = new Map();
    const allClientIds = new Set();
    const importedClientIdToResolvedId = new Map();
    existingClients.forEach(client=>{
      allClientIds.add(Number(client?.id) || 0);
      const key = makeClientMatchKey(client?.name || '');
      if(key) existingByName.set(key, client);
    });
    const nextClientId = ()=>{
      let id = Date.now() + Math.floor(Math.random() * 1000000);
      while(allClientIds.has(id)) id += 1;
      allClientIds.add(id);
      return id;
    };

    let addedClients = 0;
    let addedDossiers = 0;
    let skippedDossiers = 0;

    const reportClientsProgress = makeProgressReporter('Import Cabinet ARAQI HOUSSAINI - clients');
    await runChunked(importedClients, async (importedClient)=>{
    const key = makeClientMatchKey(importedClient.name || '');
    if(!key) return;
    const importedClientId = Number(importedClient.id);
    const target = existingByName.get(key);
    if(!target){
      const resolvedClientId = allClientIds.has(importedClientId) ? nextClientId() : importedClientId;
      const nextClient = {
        ...importedClient,
        id: resolvedClientId,
        dossiers: Array.isArray(importedClient.dossiers) ? importedClient.dossiers.slice() : []
      };
      nextClient.dossiers.forEach(()=>{ addedDossiers += 1; });
      AppState.clients.push(nextClient);
      existingByName.set(key, nextClient);
      allClientIds.add(Number(nextClient.id));
      if(Number.isFinite(importedClientId)) importedClientIdToResolvedId.set(importedClientId, Number(nextClient.id));
      addedClients += 1;
      return;
    }
    if(Number.isFinite(importedClientId)){
      importedClientIdToResolvedId.set(importedClientId, Number(target.id));
    }

    const existingSignatures = new Set(
      (Array.isArray(target.dossiers) ? target.dossiers : [])
        .map(d=>makeDossierMergeSignature(d))
        .filter(Boolean)
    );
    const importedDossiers = Array.isArray(importedClient.dossiers) ? importedClient.dossiers : [];
    importedDossiers.forEach(dossier=>{
      const signature = makeDossierMergeSignature(dossier);
      if(signature && existingSignatures.has(signature)){
        skippedDossiers += 1;
        return;
      }
      if(signature) existingSignatures.add(signature);
      if(!Array.isArray(target.dossiers)) target.dossiers = [];
      target.dossiers.push(dossier);
      addedDossiers += 1;
    });
    }, { chunkSize: IMPORT_CHUNK_SIZE, onProgress: reportClientsProgress });

    const existingUserByUsername = new Map(
      USERS.map(user=>[String(user?.username || '').trim().toLowerCase(), user])
    );
    let addedUsers = 0;
    const reportUsersProgress = makeProgressReporter('Import Cabinet ARAQI HOUSSAINI - utilisateurs');
    await runChunked(importedUsers, async (user)=>{
    const usernameKey = String(user?.username || '').trim().toLowerCase();
    if(!usernameKey) return;
    if(existingUserByUsername.has(usernameKey)) return;
    const mappedClientIds = Array.isArray(user?.clientIds)
      ? [...new Set(user.clientIds.map(v=>{
        const num = Number(v);
        if(!Number.isFinite(num)) return null;
        return importedClientIdToResolvedId.has(num)
          ? importedClientIdToResolvedId.get(num)
          : num;
      }).filter(v=>Number.isFinite(v)))]
      : [];
    USERS.push({
      ...user,
      id: Number(user.id) || Date.now() + Math.floor(Math.random() * 1000000),
      clientIds: mappedClientIds
    });
    existingUserByUsername.set(usernameKey, user);
    addedUsers += 1;
    }, { chunkSize: IMPORT_CHUNK_SIZE, onProgress: reportUsersProgress });
    USERS = ensureManagerUser(USERS);

    AppState.salleAssignments = normalizeSalleAssignments([
      ...(Array.isArray(AppState.salleAssignments) ? AppState.salleAssignments : []),
      ...importedSalleAssignments
    ]);
    invalidateSalleAssignmentsCaches();

    // audienceDraft keys depend on table indexes; imported draft keys may mismatch after merge.
    audienceDraft = {};
    const reconciliation = reconcileAudienceOrphanDossiers();
    handleDossierDataChange({ audience: true });

    await persistAppStateNow();
    refreshPrimaryViews({
      dashboardOptions: { force: true, immediate: true },
      includeSalle: true
    });
    alert(
      [
        'Import Cabinet ARAQI HOUSSAINI terminé.',
        `Clients ajoutés: ${addedClients}`,
        `Dossiers ajoutés: ${addedDossiers}`,
        `Dossiers ignorés (doublons): ${skippedDossiers}`,
        `Utilisateurs ajoutés: ${addedUsers}`,
        `Salles fusionnées: ${AppState.salleAssignments.length}`,
        `Audience hors global rapprochée: ${reconciliation.matchedDossiers}`
      ].join('\n')
    );
  }finally{
    // Keep current sync status (persist call already set the right state).
  }
}

async function handleAppsavocatImportFile(file){
  if(importInProgress) return;
  if(!file) return;
  if(!canEditData()){
    alert('Accès refusé');
    return;
  }
  importInProgress = true;
  beginHeavyUiOperation();
  try{
    openImportProgressModal('Import Cabinet ARAQI HOUSSAINI');
    updateImportProgress('Lecture du fichier...', 0, 1);
    setSyncStatus('syncing', 'Import Cabinet ARAQI HOUSSAINI en cours...');
    const text = await file.text();
    updateImportProgress('Analyse du fichier...', 1, 3);
    const parsed = JSON.parse(text);
    updateImportProgress('Fusion des données...', 2, 3);
    await importAppsavocatPayload(parsed);
    closeImportProgressModal(true);
  }catch(err){
    console.error(err);
    const details = String(err?.message || '').trim();
    alert(`Import Cabinet ARAQI HOUSSAINI impossible.${details ? `\nDétail: ${details}` : ''}`);
  }finally{
    closeImportProgressModal(false);
    importInProgress = false;
    endHeavyUiOperation();
  }
}

function hasDesktopStateBridge(){
  return typeof window !== 'undefined'
    && !!window.cabinetDesktopState
    && typeof window.cabinetDesktopState.writeState === 'function';
}

function hasDesktopExportBridge(){
  return typeof window !== 'undefined'
    && !!window.cabinetDesktopState
    && typeof window.cabinetDesktopState.saveExportAndOpen === 'function';
}

async function saveBlobViaDesktopExportBridge(blob, filename){
  if(!hasDesktopExportBridge() || !blob) return null;
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = Array.from(new Uint8Array(arrayBuffer));
  const result = await window.cabinetDesktopState.saveExportAndOpen({
    filename: String(filename || 'cabinet_export.xlsx').trim() || 'cabinet_export.xlsx',
    bytes
  });
  return result && typeof result === 'object' ? result : null;
}

function hasIndexedDbSupport(){
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

function getIndexedDbConnection(){
  if(!hasIndexedDbSupport()) return Promise.resolve(null);
  if(indexedDbOpenPromise) return indexedDbOpenPromise;
  indexedDbOpenPromise = new Promise((resolve)=>{
    try{
      const req = indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);
      req.onupgradeneeded = ()=>{
        const db = req.result;
        if(!db.objectStoreNames.contains(INDEXED_DB_STORE)){
          db.createObjectStore(INDEXED_DB_STORE);
        }
        if(!db.objectStoreNames.contains(INDEXED_DB_BACKUP_STORE)){
          db.createObjectStore(INDEXED_DB_BACKUP_STORE);
        }
        if(!db.objectStoreNames.contains(INDEXED_DB_EXPORT_STORE)){
          db.createObjectStore(INDEXED_DB_EXPORT_STORE);
        }
        if(!db.objectStoreNames.contains(INDEXED_DB_SYNC_STORE)){
          db.createObjectStore(INDEXED_DB_SYNC_STORE, { autoIncrement: true });
        }
      };
      req.onsuccess = ()=>resolve(req.result || null);
      req.onerror = ()=>{
        console.warn('IndexedDB indisponible, fallback localStorage', req.error);
        resolve(null);
      };
    }catch(err){
      console.warn('Ouverture IndexedDB impossible', err);
      resolve(null);
    }
  });
  return indexedDbOpenPromise;
}

async function readIndexedDbValue(storeName, key){
  const db = await getIndexedDbConnection();
  if(!db || !storeName) return null;
  return new Promise((resolve)=>{
    try{
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = ()=>resolve(req.result ?? null);
      req.onerror = ()=>{
        console.warn(`Lecture IndexedDB impossible (${storeName})`, req.error);
        resolve(null);
      };
    }catch(err){
      console.warn(`Transaction IndexedDB impossible (${storeName})`, err);
      resolve(null);
    }
  });
}

function getSyncQueueItems(){
  return new Promise((resolve)=>{
    getIndexedDbConnection().then(db=>{
      if(!db) return resolve([]);
      try{
        const tx = db.transaction(INDEXED_DB_SYNC_STORE, 'readonly');
        const store = tx.objectStore(INDEXED_DB_SYNC_STORE);
        const req = store.getAll();
        req.onsuccess = ()=>resolve(req.result || []);
        req.onerror = ()=>resolve([]);
      }catch(err){
        resolve([]);
      }
    });
  });
}

async function enqueueSyncAction(pathname, body){
  const db = await getIndexedDbConnection();
  if(!db) return false;
  return new Promise((resolve)=>{
    try{
      const tx = db.transaction(INDEXED_DB_SYNC_STORE, 'readwrite');
      const store = tx.objectStore(INDEXED_DB_SYNC_STORE);
      store.add({ pathname, body, timestamp: Date.now() });
      tx.oncomplete = ()=>{
        resolve(true);
        triggerSyncQueueFlush();
      };
      tx.onerror = ()=>resolve(false);
    }catch(err){
      resolve(false);
    }
  });
}

let isSyncingQueue = false;

async function writeIndexedDbValue(storeName, key, value){
  const db = await getIndexedDbConnection();
  if(!db || !storeName) return false;
  return new Promise((resolve)=>{
    try{
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(value, key);
      tx.oncomplete = ()=>resolve(true);
      tx.onerror = ()=>{
        console.warn(`Echec écriture IndexedDB (${storeName})`, tx.error);
        resolve(false);
      };
      tx.onabort = ()=>resolve(false);
    }catch(err){
      console.warn(`Ecriture IndexedDB impossible (${storeName})`, err);
      resolve(false);
    }
  });
}

async function deleteIndexedDbValue(storeName, key){
  const db = await getIndexedDbConnection();
  if(!db || !storeName) return false;
  return new Promise((resolve)=>{
    try{
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(key);
      tx.oncomplete = ()=>resolve(true);
      tx.onerror = ()=>{
        console.warn(`Echec suppression IndexedDB (${storeName})`, tx.error);
        resolve(false);
      };
      tx.onabort = ()=>resolve(false);
    }catch(err){
      console.warn(`Suppression IndexedDB impossible (${storeName})`, err);
      resolve(false);
    }
  });
}

async function readPreferredExportDirectoryHandle(){
  if(preferredExportDirectoryHandleLoaded) return preferredExportDirectoryHandle;
  preferredExportDirectoryHandleLoaded = true;
  preferredExportDirectoryHandle = await readIndexedDbValue(
    INDEXED_DB_EXPORT_STORE,
    INDEXED_DB_EXPORT_DIRECTORY_KEY
  );
  return preferredExportDirectoryHandle;
}

async function writePreferredExportDirectoryHandle(handle){
  preferredExportDirectoryHandle = handle || null;
  preferredExportDirectoryHandleLoaded = true;
  if(!handle) return deleteIndexedDbValue(INDEXED_DB_EXPORT_STORE, INDEXED_DB_EXPORT_DIRECTORY_KEY);
  return writeIndexedDbValue(INDEXED_DB_EXPORT_STORE, INDEXED_DB_EXPORT_DIRECTORY_KEY, handle);
}

async function clearPreferredExportDirectoryHandle(){
  preferredExportDirectoryHandle = null;
  preferredExportDirectoryHandleLoaded = true;
  return deleteIndexedDbValue(INDEXED_DB_EXPORT_STORE, INDEXED_DB_EXPORT_DIRECTORY_KEY);
}

async function ensurePreferredExportDirectoryHandle(options = {}){
  if(!canUseDirectBrowserExport()) return null;
  const prompt = options.prompt === true;
  let handle = await readPreferredExportDirectoryHandle();
  if(handle){
    const granted = await ensureExportDirectoryPermission(handle, { prompt });
    if(granted) return handle;
    await clearPreferredExportDirectoryHandle();
  }
  if(!prompt) return null;
  try{
    handle = await window.showDirectoryPicker({
      id: 'cabinet-avocat-exports',
      mode: 'readwrite'
    });
    if(!handle) return null;
    const granted = await ensureExportDirectoryPermission(handle, { prompt: true });
    if(!granted) return null;
    const stored = await writePreferredExportDirectoryHandle(handle);
    if(!stored){
      preferredExportDirectoryHandle = handle;
      preferredExportDirectoryHandleLoaded = true;
    }
    return handle;
  }catch(err){
    if(err?.name !== 'AbortError'){
      console.warn('Sélection du dossier export impossible', err);
    }
    return null;
  }
}

async function writeStateToIndexedDb(payload){
  const db = await getIndexedDbConnection();
  if(!db) return false;
  return new Promise((resolve)=>{
    try{
      const tx = db.transaction(INDEXED_DB_STORE, 'readwrite');
      const store = tx.objectStore(INDEXED_DB_STORE);
      store.put(payload, INDEXED_DB_STATE_KEY);
      tx.oncomplete = ()=>resolve(true);
      tx.onerror = ()=>{
        console.warn('Echec écriture IndexedDB', tx.error);
        resolve(false);
      };
      tx.onabort = ()=>resolve(false);
    }catch(err){
      console.warn('Ecriture IndexedDB impossible', err);
      resolve(false);
    }
  });
}

async function writeAutoBackupToIndexedDb(entry){
  const db = await getIndexedDbConnection();
  if(!db) return false;
  return new Promise((resolve)=>{
    try{
      const tx = db.transaction(INDEXED_DB_BACKUP_STORE, 'readwrite');
      const store = tx.objectStore(INDEXED_DB_BACKUP_STORE);
      store.put(entry, entry.id);
      tx.oncomplete = ()=>resolve(true);
      tx.onerror = ()=>{
        console.warn('Echec sauvegarde backup IndexedDB', tx.error);
        resolve(false);
      };
      tx.onabort = ()=>resolve(false);
    }catch(err){
      console.warn('Ecriture backup IndexedDB impossible', err);
      resolve(false);
    }
  });
}

async function readStateFromIndexedDb(){
  const db = await getIndexedDbConnection();
  if(!db) return null;
  return new Promise((resolve)=>{
    try{
      const tx = db.transaction(INDEXED_DB_STORE, 'readonly');
      const store = tx.objectStore(INDEXED_DB_STORE);
      const req = store.get(INDEXED_DB_STATE_KEY);
      req.onsuccess = ()=>resolve(req.result || null);
      req.onerror = ()=>{
        console.warn('Lecture IndexedDB impossible', req.error);
        resolve(null);
      };
    }catch(err){
      console.warn('Transaction IndexedDB impossible', err);
      resolve(null);
    }
  });
}

function readAutoBackupsFromLocalStorage(){
  if(typeof localStorage === 'undefined') return [];
  try{
    const raw = localStorage.getItem(AUTO_BACKUP_STORAGE_KEY);
    if(!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }catch(err){
    console.warn('Lecture auto backup localStorage impossible', err);
    return [];
  }
}

function writeAutoBackupsToLocalStorage(entries){
  if(typeof localStorage === 'undefined') return false;
  try{
    localStorage.setItem(
      AUTO_BACKUP_STORAGE_KEY,
      JSON.stringify(Array.isArray(entries) ? entries.slice(0, AUTO_BACKUP_RETENTION_COUNT) : [])
    );
    return true;
  }catch(err){
    console.warn('Echec auto backup localStorage (quota/accès)', err);
    return false;
  }
}

async function pruneIndexedDbAutoBackups(){
  const db = await getIndexedDbConnection();
  if(!db) return;
  await new Promise((resolve)=>{
    try{
      const tx = db.transaction(INDEXED_DB_BACKUP_STORE, 'readwrite');
      const store = tx.objectStore(INDEXED_DB_BACKUP_STORE);
      const getAllReq = store.getAll();
      getAllReq.onsuccess = ()=>{
        const entries = Array.isArray(getAllReq.result) ? getAllReq.result : [];
        const extras = entries
          .sort((a, b)=>String(b?.createdAt || '').localeCompare(String(a?.createdAt || '')))
          .slice(AUTO_BACKUP_RETENTION_COUNT);
        extras.forEach(entry=>{
          if(entry?.id) store.delete(entry.id);
        });
      };
      getAllReq.onerror = ()=>resolve();
      tx.oncomplete = ()=>resolve();
      tx.onerror = ()=>resolve();
      tx.onabort = ()=>resolve();
    }catch(err){
      console.warn('Nettoyage auto backup IndexedDB impossible', err);
      resolve();
    }
  });
}

async function createAutoBackupSnapshot(payload, options = {}){
  const safePayload = payload && typeof payload === 'object'
    ? payload
    : buildAppStatePayload();
  const force = options.force === true;
  const signature = typeof options.signature === 'string'
    ? options.signature
    : getStateSignatureFromPayload(safePayload);
  const now = Date.now();
  if(!force){
    if(signature && signature === lastAutoBackupSignature) return false;
    if(lastAutoBackupAt && (now - lastAutoBackupAt) < AUTO_BACKUP_MIN_INTERVAL_MS) return false;
  }

  const createdAt = new Date(now).toISOString();
  const entry = {
    id: `backup_${createdAt}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
    source: String(options.source || 'auto'),
    payload: safePayload
  };

  await writeAutoBackupToIndexedDb(entry);
  if(!shouldSkipFullLocalStorageCache(safePayload)){
    const localEntries = readAutoBackupsFromLocalStorage();
    localEntries.unshift(entry);
    writeAutoBackupsToLocalStorage(localEntries);
  }
  pruneIndexedDbAutoBackups().catch(()=>{});
  lastAutoBackupAt = now;
  lastAutoBackupSignature = signature;
  return true;
}

function writeStateToLocalStorage(payload){
  if(typeof localStorage === 'undefined') return false;
  try{
    if(shouldSkipFullLocalStorageCache(payload)){
      localStorage.removeItem(STORAGE_KEY);
      return true;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  }catch(err){
    console.warn('Echec localStorage (quota/accès)', err);
    return false;
  }
}

function queueDeferredStateCacheWrite(payload, options = {}){
  const safePayload = payload && typeof payload === 'object'
    ? payload
    : buildAppStatePayload();
  const shouldWriteIndexedDb = options.indexedDb === true;
  const shouldWriteLocalStorage = options.localStorage === true;
  if(!shouldWriteIndexedDb && !shouldWriteLocalStorage) return;
  deferredStateCacheWritePayload = safePayload;
  deferredStateCacheWriteIndexedDb = deferredStateCacheWriteIndexedDb || shouldWriteIndexedDb;
  deferredStateCacheWriteLocalStorage = deferredStateCacheWriteLocalStorage || shouldWriteLocalStorage;

  const run = async ()=>{
    const pendingPayload = deferredStateCacheWritePayload;
    const writeIndexedDb = deferredStateCacheWriteIndexedDb;
    const writeLocalStorage = deferredStateCacheWriteLocalStorage;
    deferredStateCacheWritePayload = null;
    deferredStateCacheWriteIndexedDb = false;
    deferredStateCacheWriteLocalStorage = false;
    deferredStateCacheWriteTimer = null;
    deferredStateCacheWriteIdleId = null;
    if(!pendingPayload || (!writeIndexedDb && !writeLocalStorage)) return;
    if(writeIndexedDb){
      await writeStateToIndexedDb(pendingPayload);
    }
    if(writeLocalStorage){
      writeStateToLocalStorage(pendingPayload);
    }
  };

  if(deferredStateCacheWriteTimer || deferredStateCacheWriteIdleId !== null) return;

  const scheduleRun = ()=>{
    if(typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'){
      deferredStateCacheWriteIdleId = window.requestIdleCallback(()=>{
        run().catch((err)=>{
          console.warn('Impossible de mettre en cache l’état applicatif', err);
        });
      }, { timeout: 2500 });
      return;
    }
    deferredStateCacheWriteIdleId = setTimeout(()=>{
      run().catch((err)=>{
        console.warn('Impossible de mettre en cache l’état applicatif', err);
      });
    }, 0);
  };

  const delayMs = getAdaptiveUiBatchDelay(80, {
    largeDatasetExtraMs: 260,
    busyExtraMs: 420,
    importExtraMs: 540
  });
  deferredStateCacheWriteTimer = setTimeout(scheduleRun, delayMs);
}

async function openDesktopStateFile(){
  if(
    typeof window !== 'undefined'
    && window.cabinetDesktopState
    && typeof window.cabinetDesktopState.openStateFile === 'function'
  ){
    try{
      // Force-write latest in-memory state before opening the file.
      await persistDesktopStateFileNow(buildAppStatePayload(), { force: true, signature: '' });
      const result = await window.cabinetDesktopState.openStateFile();
      if(result?.ok) return;
      const fallbackPath = String(result?.filePath || '').trim();
      if(fallbackPath){
        alert(`Fichier Cabinet ARAQI HOUSSAINI créé ici:\n${fallbackPath}\n\nImpossible de l'ouvrir automatiquement, ouvrez-le manuellement.`);
        return;
      }
      alert('Impossible d’ouvrir le fichier Cabinet ARAQI HOUSSAINI.');
      return;
    }catch(err){
      console.warn('Ouverture Cabinet ARAQI HOUSSAINI impossible', err);
      alert('Impossible d’ouvrir le fichier Cabinet ARAQI HOUSSAINI.');
      return;
    }
  }
  alert('Option disponible uniquement dans la version Desktop (EXE/DMG).');
}

async function persistDesktopStateFileNow(payload = buildAppStatePayload(), options = {}){
  if(!hasDesktopStateBridge()) return;
  const nextPayload = payload && typeof payload === 'object'
    ? payload
    : buildAppStatePayload();
  const nextSignature = typeof options.signature === 'string'
    ? options.signature
    : getStateSignatureFromPayload(nextPayload);
  if(options.force !== true && nextSignature && nextSignature === lastDesktopStatePersistSignature){
    return;
  }
  if(desktopStatePersistInFlight){
    desktopStatePersistQueuedPayload = nextPayload;
    desktopStatePersistQueuedSignature = nextSignature;
    return;
  }
  desktopStatePersistInFlight = true;
  try{
    await window.cabinetDesktopState.writeState(nextPayload);
    if(nextSignature){
      lastDesktopStatePersistSignature = nextSignature;
    }
  }catch(err){
    console.warn('Impossible de sauvegarder applicationversion1.json', err);
  }finally{
    desktopStatePersistInFlight = false;
    if(desktopStatePersistQueuedPayload){
      const queuedPayload = desktopStatePersistQueuedPayload;
      const queuedSignature = desktopStatePersistQueuedSignature;
      desktopStatePersistQueuedPayload = null;
      desktopStatePersistQueuedSignature = '';
      persistDesktopStateFileNow(queuedPayload, { signature: queuedSignature }).catch(()=>{});
    }
  }
}

function queueDesktopStateFilePersist(payload = null, options = {}){
  if(!hasDesktopStateBridge()) return;
  if(desktopStatePersistTimer) clearTimeout(desktopStatePersistTimer);
  desktopStatePersistTimer = setTimeout(()=>{
    const pendingPayload = payload && typeof payload === 'object'
      ? payload
      : buildAppStatePayload();
    const pendingSignature = typeof options.signature === 'string'
      ? options.signature
      : getStateSignatureFromPayload(pendingPayload);
    desktopStatePersistTimer = null;
    persistDesktopStateFileNow(pendingPayload, {
      signature: pendingSignature,
      force: options.force === true
    }).catch(()=>{});
  }, DESKTOP_STATE_SAVE_DEBOUNCE_MS);
}

function scheduleInitialDesktopStatePersist(delayMs = 1200){
  if(!hasDesktopStateBridge()) return;
  setTimeout(()=>{
    queueDesktopStateFilePersist();
  }, Math.max(0, Number(delayMs) || 0));
}

function shouldSkipFullLocalStorageCache(payload){
  const safePayload = payload && typeof payload === 'object' ? payload : null;
  if(!safePayload) return false;
  const clients = Array.isArray(safePayload.clients) ? safePayload.clients : [];
  if(clients.length >= LOCAL_STORAGE_CACHE_MAX_CLIENTS) return true;
  let dossierCount = 0;
  for(const client of clients){
    dossierCount += Array.isArray(client?.dossiers) ? client.dossiers.length : 0;
    if(dossierCount >= LOCAL_STORAGE_CACHE_MAX_DOSSIERS) return true;
  }
  const audienceDraftCount = safePayload.audienceDraft && typeof safePayload.audienceDraft === 'object'
    ? Object.keys(safePayload.audienceDraft).length
    : 0;
  return audienceDraftCount >= LOCAL_STORAGE_CACHE_MAX_AUDIENCE_DRAFTS;
}

async function persistLocalStateSnapshot(payload = null, options = {}){
  const source = String(options?.source || 'persist');
  const safePayload = resolveAppStateSnapshotPayload(payload);
  const nextSignature = typeof options.signature === 'string'
    ? options.signature
    : getStateSignatureFromPayload(safePayload);
  if(!options.force && nextSignature && nextSignature === lastLocalSnapshotSignature){
    queueDesktopStateFilePersist(safePayload, { signature: nextSignature });
    return safePayload;
  }
  if(nextSignature){
    lastPersistedStateSignature = nextSignature;
    lastLocalSnapshotSignature = nextSignature;
  }
  const preferDeferredCacheWrite = options.force !== true && (
    heavyUiOperationCount > 0
    || importInProgress
    || shouldSkipFullLocalStorageCache(safePayload)
    || isLargeDatasetMode()
    || source === 'diligence'
    || source === 'audience'
  );
  if(preferDeferredCacheWrite){
    queueDeferredLocalStateSnapshot(safePayload, { source, signature: nextSignature });
  }else{
    await writeStateToIndexedDb(safePayload);
    writeStateToLocalStorage(safePayload);
  }
  await createAutoBackupSnapshot(safePayload, { source, signature: nextSignature });
  queueDesktopStateFilePersist(safePayload, { signature: nextSignature });
  return safePayload;
}

function queueDeferredLocalStateSnapshot(payload = null, options = {}){
  const source = String(options?.source || 'persist');
  const hasProvidedPayload = !!(payload && typeof payload === 'object');
  const nextSignature = typeof options.signature === 'string'
    ? options.signature
    : (hasProvidedPayload ? getStateSignatureFromPayload(payload) : '');
  if(nextSignature){
    lastPersistedStateSignature = nextSignature;
  }
  deferredLocalSnapshotPayload = hasProvidedPayload ? payload : null;
  deferredLocalSnapshotSource = source;
  deferredLocalSnapshotSignature = nextSignature;
  if(deferredLocalSnapshotTimer) return hasProvidedPayload ? payload : null;
  deferredLocalSnapshotTimer = setTimeout(()=>{
    const pendingPayload = deferredLocalSnapshotPayload;
    const pendingSource = deferredLocalSnapshotSource;
    const pendingSignature = deferredLocalSnapshotSignature;
    deferredLocalSnapshotTimer = null;
    deferredLocalSnapshotPayload = null;
    deferredLocalSnapshotSource = 'persist';
    deferredLocalSnapshotSignature = '';
    persistLocalStateSnapshot(pendingPayload, { source: pendingSource, signature: pendingSignature }).catch((err)=>{
      console.warn('Impossible de sauvegarder le snapshot local différé', err);
    });
  }, DEFERRED_LOCAL_SNAPSHOT_DEBOUNCE_MS);
  return hasProvidedPayload ? payload : null;
}

async function persistRemoteRequestNow(pathname, body){
  if(LOCAL_ONLY_MODE){
    setSyncStatus('error', 'Mode local (offline)');
    return true;
  }
  if(!hasRemoteAuthSession()){
    setSyncStatus('error', 'Mode local (offline)');
    return true;
  }
  // Fast-path: if the server was previously found unreachable, skip the
  // remote save entirely so that local operations never block.
  if(!remoteServerReachable){
    setSyncStatus('error', 'Mode local (serveur indisponible)');
    return true;
  }
  setSyncStatus('syncing');
  try{
    const payload = {
      ...body,
      _sourceId: APP_INSTANCE_ID,
      _baseVersion: remoteStateVersion
    };
    const serializedPayload = JSON.stringify(payload);
    let saveResult = null;
    if(pathname === '/state' && serializedPayload.length >= REMOTE_STATE_CHUNK_UPLOAD_MIN_LENGTH){
      saveResult = await persistChunkedRemoteStateNow(payload, serializedPayload);
      if(!saveResult) return false;
    }else{
      const requestOptions = {
        method: 'POST',
        headers: buildRemoteAuthHeaders({ 'Content-Type': 'application/json' }),
        body: serializedPayload
      };
      const timeoutMs = getRemoteSaveTimeoutMs(pathname, body);
      try{
        const res = await fetchWithTimeout(`${API_BASE}${pathname}`, requestOptions, timeoutMs);
        saveResult = await handlePersistRemoteResponse(res);
        if(!saveResult) return false;
      }catch(err){
        if(!shouldRetryPersistRequest(pathname, body, err)) throw err;
        await waitForMs(180);
        const retryRes = await fetchWithTimeout(`${API_BASE}${pathname}`, requestOptions, timeoutMs);
        saveResult = await handlePersistRemoteResponse(retryRes);
        if(!saveResult) return false;
      }
    }
    updateRemoteStateMetadata(saveResult);
    markApiBaseHealthy(API_BASE);
    setSyncStatus('ok');
    return true;
  }catch(err){
    remoteServerReachable = false;
    setSyncStatus('error', 'Mode local (serveur indisponible)');
    console.warn('Impossible de sauvegarder sur le serveur', err);
    return true;
  }
}

async function handlePersistRemoteResponse(res){
  if(res.status === 401){
    handleUnauthorizedRemoteSession();
    return null;
  }
  if(res.status === 409){
    const conflictPayload = await res.json().catch(()=>({}));
    updateRemoteStateMetadata(conflictPayload);
    remoteRefreshPending = true;
    setSyncStatus('conflict', 'Conflit: serveur plus recent, rechargement...');
    queueRemoteStateRefresh(REMOTE_SYNC_EVENT_DEBOUNCE_MS);
    return null;
  }
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json().catch(()=>({}));
}

function splitPayloadIntoUploadChunks(serializedPayload, chunkSize = REMOTE_STATE_CHUNK_UPLOAD_SIZE){
  const raw = String(serializedPayload || '');
  const safeChunkSize = Math.max(20000, Number(chunkSize) || REMOTE_STATE_CHUNK_UPLOAD_SIZE);
  const chunks = [];
  for(let start = 0; start < raw.length; start += safeChunkSize){
    chunks.push(raw.slice(start, start + safeChunkSize));
  }
  return chunks.length ? chunks : ['{}'];
}

async function persistChunkedRemoteStateNow(payload, serializedPayload){
  const chunks = splitPayloadIntoUploadChunks(serializedPayload);
  const uploadId = `state-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  let finalResult = null;
  for(let index = 0; index < chunks.length; index += 1){
    const res = await fetchWithTimeout(`${API_BASE}/state/upload-chunk`, {
      method: 'POST',
      headers: buildRemoteAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        uploadId,
        mode: 'replace',
        index,
        total: chunks.length,
        chunk: chunks[index],
        _sourceId: String(payload?._sourceId || '').trim(),
        _baseVersion: payload?._baseVersion
      })
    }, API_STATE_SAVE_TIMEOUT_MS);
    const result = await handlePersistRemoteResponse(res);
    if(!result) return null;
    finalResult = result;
  }
  return finalResult;
}

async function persistStateSliceNow(sliceKey, sliceValue, options = {}){
  await persistLocalStateSnapshot(null, { source: options.source || sliceKey, signature: '' });
  const payload = buildAppStatePayload();
  const routeBySlice = {
    audienceDraft: '/state/audience-draft',
    users: '/state/users',
    salleAssignments: '/state/salle-assignments'
  };
  const pathname = routeBySlice[sliceKey];
  if(!pathname){
    return persistRemoteRequestNow('/state', payload);
  }
  return persistRemoteRequestNow(pathname, { [sliceKey]: sliceValue });
}

async function persistClientPatchNow(patch, options = {}){
  queueDeferredLocalStateSnapshot(null, { source: options.source || 'clients', signature: '' });
  return persistRemoteRequestNow('/state/clients', patch);
}

function getDossierPatchQueueKey(patch){
  if(!patch || typeof patch !== 'object') return '';
  const action = String(patch.action || '').trim().toLowerCase();
  if(action !== 'update') return '';
  const clientId = Number(patch.clientId);
  const dossierIndex = Number(patch.dossierIndex);
  const targetClientId = Number(patch.targetClientId);
  if(!Number.isFinite(clientId) || !Number.isFinite(dossierIndex)) return '';
  return `${action}:${clientId}:${dossierIndex}:${Number.isFinite(targetClientId) ? targetClientId : clientId}`;
}

function getNextDossierPatchRetryDelayMs(){
  const baseDelay = Math.max(900, getDossierPatchPersistDelayMs() + 350);
  const nextDelay = dossierPatchRetryBackoffMs > 0
    ? Math.min(12000, Math.max(baseDelay, Math.round(dossierPatchRetryBackoffMs * 1.7)))
    : baseDelay;
  dossierPatchRetryBackoffMs = nextDelay;
  return nextDelay;
}

function resetDossierPatchRetryState(){
  dossierPatchRetryBackoffMs = 0;
  if(dossierPatchRetryTimer){
    clearTimeout(dossierPatchRetryTimer);
    dossierPatchRetryTimer = null;
  }
}

function scheduleDossierPatchRetry(delayMs = null){
  if(dossierPatchRetryTimer) return;
  const nextDelayMs = Math.max(250, Number(delayMs) || getNextDossierPatchRetryDelayMs());
  dossierPatchRetryTimer = setTimeout(()=>{
    dossierPatchRetryTimer = null;
    flushQueuedDossierPatchesNow().catch((err)=>{
      console.warn('Nouvelle tentative dossier impossible', err);
    });
  }, nextDelayMs);
}

function requeueQueuedDossierPatchEntries(entries){
  const list = Array.isArray(entries) ? entries : [];
  if(!list.length) return;
  list.forEach((entry, index)=>{
    const patch = entry?.patch && typeof entry.patch === 'object' ? entry.patch : null;
    const queueKey = String(entry?.key || '').trim() || getDossierPatchQueueKey(patch) || `retry:${Date.now()}:${index}`;
    const existing = queuedDossierPatchEntries.get(queueKey);
    if(existing){
      existing.patch = patch || existing.patch;
      if(Array.isArray(entry?.resolvers) && entry.resolvers.length){
        existing.resolvers.push(...entry.resolvers);
      }
      if(Array.isArray(entry?.rejecters) && entry.rejecters.length){
        existing.rejecters.push(...entry.rejecters);
      }
      return;
    }
    queuedDossierPatchEntries.set(queueKey, {
      key: queueKey,
      patch,
      resolvers: Array.isArray(entry?.resolvers) ? entry.resolvers.slice() : [],
      rejecters: Array.isArray(entry?.rejecters) ? entry.rejecters.slice() : []
    });
  });
  setSyncStatus('syncing');
  // scheduleDossierPatchRetry(); // No longer needed, handled by SyncQueue heartbeat
}

function triggerSyncQueueFlush(){
  if(persistSyncQueueTimer) clearTimeout(persistSyncQueueTimer);
  persistSyncQueueTimer = setTimeout(()=>{
    persistSyncQueueTimer = null;
    flushSyncQueueNow();
  }, 100);
}

async function flushSyncQueueNow(){
  if(isSyncingQueue) return;
  if(!remoteServerReachable || !hasRemoteAuthSession()) return;
  if(LOCAL_ONLY_MODE) return;

  const db = await getIndexedDbConnection();
  if(!db) return;

  isSyncingQueue = true;
  let hasFailures = false;
  
  try {
    const tx = db.transaction(INDEXED_DB_SYNC_STORE, 'readwrite');
    const store = tx.objectStore(INDEXED_DB_SYNC_STORE);
    const req = store.openCursor();
    
    return new Promise((resolve)=>{
      req.onsuccess = async (event) => {
        const cursor = event.target.result;
        if(!cursor || hasFailures){
          tx.oncomplete = ()=>resolve(true);
          return;
        }
        
        const item = cursor.value;
        try {
          const success = await persistRemoteRequestNow(item.pathname, item.body);
          if(success){
            cursor.delete();
            cursor.continue();
          } else {
            hasFailures = true;
            resolve(false);
          }
        } catch(err){
          hasFailures = true;
          resolve(false);
        }
      };
      req.onerror = ()=>resolve(false);
    });
  } finally {
    isSyncingQueue = false;
    updateSyncStatusLabel();
  }
}

function updateSyncStatusLabel(){
  getSyncQueueItems().then(items=>{
    if(!items.length){
      setSyncStatus('ok');
    } else {
      const isLocal = LOCAL_ONLY_MODE || !remoteServerReachable;
      if (isLocal) {
        setSyncStatus('ok', 'Mode local (données sauvegardées)');
      } else {
        setSyncStatus('syncing', `Synchronisation: ${items.length} modification(s) en attente`);
      }
    }
  });
}

async function flushQueuedDossierPatchesNow(){
  if(dossierPatchPersistTimer){
    clearTimeout(dossierPatchPersistTimer);
    dossierPatchPersistTimer = null;
  }
  if(!(queuedDossierPatchEntries instanceof Map) || !queuedDossierPatchEntries.size){
    return [];
  }
  const entries = [...queuedDossierPatchEntries.values()];
  queuedDossierPatchEntries = new Map();
  const results = [];
  try{
    const [entry] = entries;
    if(entries.length === 1){
      const result = await enqueueSyncAction('/state/dossiers', entry.patch);
      entry.resolvers.forEach(resolve=>resolve(result));
      results.push(result);
      return results;
    }
    const result = await enqueueSyncAction('/state/dossiers/batch', {
      patches: entries.map(e=>e.patch)
    });
    entries.forEach((e)=>{
      e.resolvers.forEach(resolve=>resolve(result));
    });
    results.push(result);
  }catch(err){
    entries.forEach((entry)=>{
      entry.rejecters.forEach(reject=>reject(err));
    });
    throw err;
  }
  return results;
}

async function persistDossierPatchNow(patch, options = {}){
  queueDeferredLocalStateSnapshot(null, { source: options.source || 'dossier', signature: '' });
  const queueKey = getDossierPatchQueueKey(patch);
  if(!queueKey){
    await flushQueuedDossierPatchesNow();
    return enqueueSyncAction('/state/dossiers', patch);
  }
  return new Promise((resolve, reject)=>{
    const existing = queuedDossierPatchEntries.get(queueKey);
    if(existing){
      existing.patch = patch;
      existing.resolvers.push(resolve);
      existing.rejecters.push(reject);
    }else{
      queuedDossierPatchEntries.set(queueKey, {
        key: queueKey,
        patch,
        resolvers: [resolve],
        rejecters: [reject]
      });
    }
    setSyncStatus('syncing');
    if(dossierPatchPersistTimer) clearTimeout(dossierPatchPersistTimer);
    if(dossierPatchRetryTimer){
      clearTimeout(dossierPatchRetryTimer);
      dossierPatchRetryTimer = null;
    }
    dossierPatchPersistTimer = setTimeout(()=>{
      flushQueuedDossierPatchesNow().catch((err)=>{
        console.warn('Impossible de sauvegarder les modifications dossier', err);
      });
    }, getDossierPatchPersistDelayMs());
  });
}

async function persistAppStateNow(payload = null){
  flushAllDossierHistoryPendingEntries();
  const nextPayload = payload && typeof payload === 'object'
    ? payload
    : buildAppStatePayload();
  queuedPersistPayload = null;
  await persistLocalStateSnapshot(nextPayload, { source: 'persist', signature: '' });
  return enqueueSyncAction('/state', nextPayload);
}

function queuePersistAppState(){
  markAudienceRowsCacheDirty();
  queuedPersistPayload = buildAppStatePayload();
  setSyncStatus('syncing');

  if(persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(()=>{
    persistTimer = null;
    persistLocalStateSnapshot(queuedPersistPayload, { source: 'persist', signature: '' })
      .then(()=>enqueueSyncAction('/state', queuedPersistPayload))
      .catch((err)=>{
      console.warn('Impossible de sauvegarder l’état applicatif', err);
    });
  }, 250);
}

async function fetchRemoteStateMetadata(){
  const res = await fetchWithTimeout(`${API_BASE}/state/meta`, {
    cache: 'no-store',
    headers: buildRemoteAuthHeaders()
  }, API_STATE_LOAD_TIMEOUT_MS);
  if(res.status === 401){
    handleUnauthorizedRemoteSession();
    return null;
  }
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchRemoteStateFromPagedExport(remoteMeta){
  const nextState = {
    clients: [],
    salleAssignments: [],
    users: [],
    audienceDraft: {},
    recycleBin: [],
    recycleArchive: [],
    importHistory: [],
    version: Number(remoteMeta?.version) || 0,
    updatedAt: String(remoteMeta?.updatedAt || '')
  };
  const pageLimit = Math.max(
    10,
    Number(remoteMeta?.recommendedClientPageSize) || REMOTE_STATE_PAGED_LOAD_CLIENT_PAGE_SIZE
  );
  let offset = 0;
  let includeShared = true;
  let pageCount = 0;

  for(;;){
    pageCount += 1;
    if(pageCount > REMOTE_STATE_PAGED_LOAD_MAX_PAGES){
      throw new Error('Chargement pagine du serveur interrompu: trop de pages.');
    }
    const res = await fetchWithTimeout(
      `${API_BASE}/state/export-page?offset=${encodeURIComponent(String(offset))}&limit=${encodeURIComponent(String(pageLimit))}&includeShared=${includeShared ? '1' : '0'}`,
      {
        cache: 'no-store',
        headers: buildRemoteAuthHeaders()
      },
      API_STATE_LOAD_TIMEOUT_MS
    );
    if(res.status === 401){
      handleUnauthorizedRemoteSession();
      return null;
    }
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const parsed = await res.json();
    markApiBaseHealthy(API_BASE);
    updateRemoteStateMetadata(parsed);
    if(includeShared && parsed?.sharedState && typeof parsed.sharedState === 'object'){
      nextState.salleAssignments = Array.isArray(parsed.sharedState.salleAssignments) ? parsed.sharedState.salleAssignments : [];
      nextState.users = Array.isArray(parsed.sharedState.users) ? parsed.sharedState.users : [];
      nextState.audienceDraft = parsed.sharedState.audienceDraft && typeof parsed.sharedState.audienceDraft === 'object'
        ? parsed.sharedState.audienceDraft
        : {};
      nextState.recycleBin = Array.isArray(parsed.sharedState.recycleBin) ? parsed.sharedState.recycleBin : [];
      nextState.recycleArchive = Array.isArray(parsed.sharedState.recycleArchive) ? parsed.sharedState.recycleArchive : [];
      nextState.importHistory = Array.isArray(parsed.sharedState.importHistory) ? parsed.sharedState.importHistory : [];
    }
    const pageClients = Array.isArray(parsed?.clients) ? parsed.clients : [];
    if(pageClients.length){
      nextState.clients.push(...pageClients);
    }
    nextState.version = Number(parsed?.version) || nextState.version;
    nextState.updatedAt = String(parsed?.updatedAt || nextState.updatedAt || '');
    if(!parsed?.hasMore) break;
    const nextOffset = Number(parsed?.nextOffset);
    if(!(Number.isFinite(nextOffset) && nextOffset > offset)){
      throw new Error('Chargement pagine du serveur interrompu: curseur invalide.');
    }
    offset = nextOffset;
    includeShared = false;
  }

  return nextState;
}

async function fetchRemoteStateChanges(sinceVersion){
  const res = await fetchWithTimeout(
    `${API_BASE}/state/changes?sinceVersion=${encodeURIComponent(String(sinceVersion))}`,
    {
      cache: 'no-store',
      headers: buildRemoteAuthHeaders()
    },
    API_STATE_LOAD_TIMEOUT_MS
  );
  if(res.status === 401){
    handleUnauthorizedRemoteSession();
    return null;
  }
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function mergeRemoteRefreshOptions(target, source){
  const next = target && typeof target === 'object'
    ? target
    : { audience: false, sections: new Set(), secondarySections: new Set() };
  const incoming = source && typeof source === 'object' ? source : null;
  if(!incoming) return next;
  if(incoming.audience === true) next.audience = true;
  (Array.isArray(incoming.sections) ? incoming.sections : []).forEach((section)=>{
    const safeSection = String(section || '').trim();
    if(safeSection) next.sections.add(safeSection);
  });
  (Array.isArray(incoming.secondarySections) ? incoming.secondarySections : []).forEach((section)=>{
    const safeSection = String(section || '').trim();
    if(safeSection) next.secondarySections.add(safeSection);
  });
  return next;
}

function resetPendingRemoteLiveUpdateOptions(){
  pendingRemoteLiveUpdateOptions = {
    audience: false,
    sections: new Set(),
    secondarySections: new Set(),
    refreshClientDropdown: false
  };
}

function queueRemoteLivePatchFinalize(options = {}){
  const incomingSections = Array.isArray(options.sections) ? options.sections : [];
  const incomingSecondarySections = Array.isArray(options.secondarySections) ? options.secondarySections : [];
  if(options.audience === true) pendingRemoteLiveUpdateOptions.audience = true;
  if(options.refreshClientDropdown === true) pendingRemoteLiveUpdateOptions.refreshClientDropdown = true;
  incomingSections.forEach((section)=>{
    const safeSection = String(section || '').trim();
    if(safeSection) pendingRemoteLiveUpdateOptions.sections.add(safeSection);
  });
  incomingSecondarySections.forEach((section)=>{
    const safeSection = String(section || '').trim();
    if(safeSection) pendingRemoteLiveUpdateOptions.secondarySections.add(safeSection);
  });
  if(pendingRemoteLiveUpdateTimer) clearTimeout(pendingRemoteLiveUpdateTimer);
  const baseDelayMs = isVeryLargeLiveSyncMode() ? 520 : 180;
  const delayMs = getAdaptiveUiBatchDelay(baseDelayMs, {
    ultraLargeDatasetExtraMs: 720,
    largeDatasetExtraMs: 180,
    busyExtraMs: 360,
    importExtraMs: 420
  });
  pendingRemoteLiveUpdateTimer = setTimeout(()=>{
    pendingRemoteLiveUpdateTimer = null;
    const aggregated = {
      livePatch: true,
      audience: pendingRemoteLiveUpdateOptions.audience === true,
      sections: [...pendingRemoteLiveUpdateOptions.sections],
      secondarySections: [...pendingRemoteLiveUpdateOptions.secondarySections],
      refreshClientDropdown: pendingRemoteLiveUpdateOptions.refreshClientDropdown === true
    };
    resetPendingRemoteLiveUpdateOptions();
    finalizeRemoteStateUpdateLocally(aggregated);
  }, delayMs);
}

async function applyRemoteStateChangesIncrementally(changePayload){
  const changes = Array.isArray(changePayload?.changes) ? changePayload.changes : [];
  if(!changes.length) return false;
  const aggregatedOptions = { audience: false, sections: new Set(), secondarySections: new Set() };
  for(const change of changes){
    const patchKind = String(change?.patchKind || '').trim();
    const patch = change?.patch && typeof change.patch === 'object' ? change.patch : null;
    if(!patchKind || !patch) return false;
    const appliedDossierPatch = patchKind === 'dossier'
      ? applyRemoteDossierPatchLocally(patch)
      : patchKind === 'dossier-batch'
        ? applyRemoteDossierPatchBatchLocally(patch?.patches || [])
        : null;
    if(appliedDossierPatch){
      mergeRemoteRefreshOptions(aggregatedOptions, buildRemoteDossierRefreshOptions(appliedDossierPatch));
      continue;
    }
    if(applyRemoteSlicePatchLocally(patchKind, patch)){
      mergeRemoteRefreshOptions(aggregatedOptions, getRemoteSliceRefreshOptions(patchKind));
      continue;
    }
    return false;
  }
  updateRemoteStateMetadata(changePayload);
  if(changePayload?.updatedAt) setLiveDelayMetricFromIso(changePayload.updatedAt);
  const livePatchOptions = {
    audience: aggregatedOptions.audience,
    sections: [...aggregatedOptions.sections],
    secondarySections: [...aggregatedOptions.secondarySections]
  };
  if(isVeryLargeLiveSyncMode()){
    queueRemoteLivePatchFinalize(livePatchOptions);
  }else{
    finalizeRemoteStateUpdateLocally({
      livePatch: true,
      ...livePatchOptions
    });
  }
  const remoteSignature = buildRemoteStateVersionSignature(changePayload);
  if(remoteSignature){
    lastPersistedStateSignature = remoteSignature;
    lastLocalSnapshotSignature = remoteSignature;
  }
  queueDeferredLocalStateSnapshot(null, {
    source: 'server',
    signature: remoteSignature
  });
  setSyncStatus('ok', 'Etat charge depuis serveur');
  return true;
}

async function fetchRemoteStateSnapshot(remoteMeta = null){
  if(shouldUsePagedRemoteStateLoad(remoteMeta)){
    return fetchRemoteStateFromPagedExport(remoteMeta);
  }
  const res = await fetchWithTimeout(`${API_BASE}/state`, {
    cache: 'no-store',
    headers: buildRemoteAuthHeaders()
  }, API_STATE_LOAD_TIMEOUT_MS);
  if(res.status === 401){
    handleUnauthorizedRemoteSession();
    return null;
  }
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadPersistedState(){
  let loaded = false;
  let changed = false;
  if(!LOCAL_ONLY_MODE && hasRemoteAuthSession()){
    try{
      let remoteMeta = null;
      try{
        remoteMeta = await fetchRemoteStateMetadata();
      }catch(err){
        console.warn('Metadata distante indisponible, fallback snapshot complet', err);
      }
      if(remoteMeta && typeof remoteMeta === 'object'){
        markApiBaseHealthy(API_BASE);
        updateRemoteStateMetadata(remoteMeta);
        const remoteSignature = buildRemoteStateVersionSignature(remoteMeta);
        if(remoteSignature && remoteSignature === lastPersistedStateSignature){
          loaded = true;
          lastRemoteStateLoadVersion = remoteStateVersion;
          lastRemoteStateLoadUpdatedAt = remoteStateUpdatedAt;
          setSyncStatus('ok', 'Etat charge depuis serveur');
          return false;
        }
        const targetVersion = Number(remoteMeta?.version);
        const sourceVersion = Number(lastRemoteStateLoadVersion);
        if(Number.isFinite(targetVersion) && targetVersion > 0 && Number.isFinite(sourceVersion) && sourceVersion > 0 && targetVersion > sourceVersion){
          try{
            const deltaPayload = await fetchRemoteStateChanges(sourceVersion);
            if(
              deltaPayload
              && deltaPayload.snapshotRequired !== true
              && Number(deltaPayload?.version) === targetVersion
              && String(deltaPayload?.updatedAt || '') === String(remoteMeta?.updatedAt || '')
            ){
              const appliedIncrementally = await applyRemoteStateChangesIncrementally(deltaPayload);
              if(appliedIncrementally){
                loaded = true;
                changed = true;
                return true;
              }
            }
          }catch(err){
            console.warn('Delta distante indisponible, fallback snapshot', err);
          }
        }
      }
      const parsed = await fetchRemoteStateSnapshot(remoteMeta);
      if(parsed && typeof parsed === 'object'){
        markApiBaseHealthy(API_BASE);
        if(!remoteMeta) updateRemoteStateMetadata(parsed);
        const normalizedState = normalizePersistedStateSource(parsed);
        if(normalizedState.signature && normalizedState.signature === lastPersistedStateSignature){
          loaded = true;
          lastRemoteStateLoadVersion = remoteStateVersion;
          lastRemoteStateLoadUpdatedAt = remoteStateUpdatedAt;
          setSyncStatus('ok', 'Etat charge depuis serveur');
          return false;
        }
        await applyPersistedStateSource(normalizedState, {
          source: 'server',
          writeIndexedDb: true,
          writeLocalStorage: true,
          deferWriteIndexedDb: true,
          deferWriteLocalStorage: true,
          syncStatusMessage: 'Etat charge depuis serveur'
        });
        lastRemoteStateLoadVersion = remoteStateVersion;
        lastRemoteStateLoadUpdatedAt = remoteStateUpdatedAt;
        loaded = true;
        changed = true;
      }
    }catch(err){
      console.warn('Impossible de charger depuis le serveur', err);
    }
  }

  if(loaded) return changed;
  if(
    hasDesktopStateBridge()
    && typeof window.cabinetDesktopState.readState === 'function'
  ){
    try{
      const desktopResult = await window.cabinetDesktopState.readState();
      const parsed = desktopResult?.data;
      if(parsed && typeof parsed === 'object'){
        const normalizedState = normalizePersistedStateSource(parsed);
        if(normalizedState.signature && normalizedState.signature === lastPersistedStateSignature){
          return false;
        }
        await applyPersistedStateSource(normalizedState, {
          source: 'desktop',
          writeIndexedDb: true,
          writeLocalStorage: true,
          deferWriteIndexedDb: true,
          deferWriteLocalStorage: true,
          syncStatusMessage: 'Etat charge depuis Cabinet ARAQI HOUSSAINI'
        });
        return true;
      }
    }catch(err){
      console.warn('Impossible de charger applicationversion1.json', err);
    }
  }

  const indexedState = await readStateFromIndexedDb();
  if(indexedState && typeof indexedState === 'object'){
    const normalizedState = normalizePersistedStateSource(indexedState);
    if(normalizedState.signature && normalizedState.signature !== lastPersistedStateSignature){
      await applyPersistedStateSource(normalizedState, {
        source: 'indexeddb',
        writeLocalStorage: true,
        deferWriteLocalStorage: true,
        syncStatusMessage: 'Etat charge depuis IndexedDB'
      });
      return true;
    }
  }

  if(typeof localStorage === 'undefined') return false;
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return false;
    const parsed = JSON.parse(raw);
    const normalizedState = normalizePersistedStateSource(parsed);
    if(normalizedState.signature && normalizedState.signature === lastPersistedStateSignature){
      return false;
    }
    await applyPersistedStateSource(normalizedState);
    return true;
  }catch(err){
    console.warn('Etat local corrompu, utilisation des valeurs par défaut', err);
    return false;
  }
}

async function refreshRemoteState(){
  if(LOCAL_ONLY_MODE) return;
  if(!currentUser) return;
  if(
    !remoteRefreshPending
    && Number(remoteStateVersion) > 0
    && Number(remoteStateVersion) === Number(lastRemoteStateLoadVersion)
    && String(remoteStateUpdatedAt || '') === String(lastRemoteStateLoadUpdatedAt || '')
  ){
    return;
  }
  if(remoteRefreshInFlight){
    remoteRefreshPending = true;
    return;
  }
  const blocker = getRemoteRefreshBlocker();
  if(blocker){
    remoteRefreshPending = true;
    queueRemoteStateRefresh(REMOTE_SYNC_BLOCKED_RETRY_MS);
    return;
  }
  remoteRefreshInFlight = true;
  try{
    const hasChanged = await loadPersistedState();
    if(hasChanged){
      const refreshSections = [
        'dashboard',
        'clients',
        'creation',
        'suivi',
        'audience',
        'diligence',
      'salle',
      'equipe',
      'recycle'
      ];
      markDeferredRenderDirty(...refreshSections, 'clientDropdown');
      queueRemoteSyncRender(refreshSections);
    }
  }finally{
    remoteRefreshInFlight = false;
    if(remoteRefreshPending){
      remoteRefreshPending = false;
      queueRemoteStateRefresh(REMOTE_SYNC_EVENT_DEBOUNCE_MS);
    }
  }
}

function queueRemoteStateRefresh(delayMs = REMOTE_SYNC_EVENT_DEBOUNCE_MS){
  if(remoteRefreshTimer) clearTimeout(remoteRefreshTimer);
  const nextDelay = getAdaptiveUiBatchDelay(delayMs, {
    ultraLargeDatasetExtraMs: 1200,
    largeDatasetExtraMs: 650,
    busyExtraMs: 900,
    importExtraMs: 1200
  });
  remoteRefreshTimer = setTimeout(()=>{
    remoteRefreshTimer = null;
    refreshRemoteState().catch(()=>{});
  }, Math.max(0, Number(nextDelay) || 0));
}

function startRemoteSync(){
  if(LOCAL_ONLY_MODE){
    updateRemoteStateMetadata({ version: 0, updatedAt: '' });
    setSyncStatus('error', 'Mode local (offline)');
    return;
  }
  if(!remoteServerReachable){
    setSyncStatus('error', 'Mode local (serveur indisponible)');
    return;
  }
  if(!hasRemoteAuthSession()){
    setSyncStatus('pending', 'Connexion serveur en attente');
    return;
  }
  if(remoteSyncTimer) return;
  startRemoteSyncStream();
  refreshServerConnectionStatus({ force: true }).catch(()=>{});
  remoteSyncTimer = setInterval(()=>{
    remoteSyncHealthTick = (remoteSyncHealthTick + 1) % REMOTE_SYNC_HEALTH_EVERY_TICKS;
    if(remoteSyncHealthTick === 0){
      refreshServerConnectionStatus().catch(()=>{});
    }
    if(remoteRefreshPending){
      queueRemoteStateRefresh(REMOTE_SYNC_EVENT_DEBOUNCE_MS);
      return;
    }
    if(!remoteSyncStreamConnected){
      const now = Date.now();
      if((now - remoteSyncLastRecoveryRefreshAt) >= REMOTE_SYNC_RECOVERY_REFRESH_INTERVAL_MS){
        remoteSyncLastRecoveryRefreshAt = now;
        queueRemoteStateRefresh(REMOTE_SYNC_EVENT_DEBOUNCE_MS);
      }
    }
  }, REMOTE_SYNC_POLL_INTERVAL_MS);
}

function stopRemoteSync(){
  if(remoteSyncStream){
    remoteSyncStream.close();
    remoteSyncStream = null;
  }
  remoteSyncStreamConnected = false;
  if(remoteSyncStreamRetryTimer){
    clearTimeout(remoteSyncStreamRetryTimer);
    remoteSyncStreamRetryTimer = null;
  }
  if(remoteRefreshTimer){
    clearTimeout(remoteRefreshTimer);
    remoteRefreshTimer = null;
  }
  if(remoteSyncRenderTimer){
    clearTimeout(remoteSyncRenderTimer);
    remoteSyncRenderTimer = null;
  }
  if(pendingRemoteLiveUpdateTimer){
    clearTimeout(pendingRemoteLiveUpdateTimer);
    pendingRemoteLiveUpdateTimer = null;
  }
  resetPendingRemoteLiveUpdateOptions();
  remoteSyncRenderSections = new Set();
  if(!remoteSyncTimer) return;
  clearInterval(remoteSyncTimer);
  remoteSyncTimer = null;
  remoteSyncLastRecoveryRefreshAt = 0;
}

function scheduleRemoteSyncStreamRetry(){
  if(remoteSyncStreamRetryTimer) return;
  const blocker = getRemoteRefreshBlocker();
  const nextDelay = blocker
    ? REMOTE_SYNC_STREAM_RETRY_MAX_MS
    : Math.min(
      REMOTE_SYNC_STREAM_RETRY_MAX_MS,
      remoteSyncStreamRetryDelayMs > 0 ? remoteSyncStreamRetryDelayMs * 2 : REMOTE_SYNC_STREAM_RETRY_BASE_MS
    );
  remoteSyncStreamRetryDelayMs = nextDelay;
  remoteSyncStreamRetryTimer = setTimeout(()=>{
    remoteSyncStreamRetryTimer = null;
    if(!currentUser) return;
    startRemoteSyncStream();
  }, nextDelay);
}

function startRemoteSyncStream(){
  if(LOCAL_ONLY_MODE) return;
  if(typeof EventSource === 'undefined') return;
  if(!hasRemoteAuthSession()) return;
  if(remoteSyncStream) return;
  try{
    const token = encodeURIComponent(remoteAuthToken);
    const stream = new EventSource(`${API_BASE}/state/stream?token=${token}`);
    remoteSyncStream = stream;
    stream.onopen = ()=>{
      remoteSyncStreamConnected = true;
      remoteSyncStreamRetryDelayMs = REMOTE_SYNC_STREAM_RETRY_BASE_MS;
      remoteSyncLastRecoveryRefreshAt = Date.now();
      markApiBaseHealthy(API_BASE);
      setSyncStatus('ok', 'Connecte au serveur (actif)');
    };
    stream.addEventListener('state-updated', (event)=>{
      try{
        const payload = JSON.parse(String(event?.data || '{}'));
        const previousVersion = remoteStateVersion;
        const previousUpdatedAt = remoteStateUpdatedAt;
        updateRemoteStateMetadata(payload);
        if(payload?.updatedAt) setLiveDelayMetricFromIso(payload.updatedAt);
        if(String(payload?.sourceId || '') === APP_INSTANCE_ID) return;
        const appliedDossierPatch = payload?.patchKind === 'dossier'
          ? applyRemoteDossierPatchLocally(payload.patch)
          : payload?.patchKind === 'dossier-batch'
            ? applyRemoteDossierPatchBatchLocally(payload?.patch?.patches || payload?.patches || [])
            : null;
        if(appliedDossierPatch){
          const livePatchOptions = buildRemoteDossierRefreshOptions(appliedDossierPatch);
          if(isVeryLargeLiveSyncMode()){
            queueRemoteLivePatchFinalize(livePatchOptions);
          }else{
            finalizeRemoteStateUpdateLocally(livePatchOptions);
          }
          remoteRefreshPending = false;
          return;
        }
        if(applyRemoteSlicePatchLocally(payload?.patchKind, payload?.patch)){
          const livePatchOptions = getRemoteSliceRefreshOptions(payload?.patchKind);
          if(isVeryLargeLiveSyncMode()){
            queueRemoteLivePatchFinalize(livePatchOptions);
          }else{
            finalizeRemoteStateUpdateLocally(livePatchOptions);
          }
          remoteRefreshPending = false;
          return;
        }
        if(
          Number(payload?.version) > 0
          && Number(previousVersion) > 0
          && Number(payload.version) === Number(previousVersion)
          && String(payload?.updatedAt || '') === String(previousUpdatedAt || '')
        ){
          remoteRefreshPending = false;
          return;
        }
      }catch(err){}
      queueRemoteStateRefresh(REMOTE_SYNC_EVENT_DEBOUNCE_MS);
    });
    stream.onerror = ()=>{
      remoteSyncStreamConnected = false;
      if(remoteSyncStream){
        remoteSyncStream.close();
        remoteSyncStream = null;
      }
      scheduleRemoteSyncStreamRetry();
    };
  }catch(err){
    scheduleRemoteSyncStreamRetry();
  }
}

function parseExcelData(rows, sheet = null){
  const dossierHeaderKeys = {
    client: ['client', 'clients', 'nom client', 'nom clients'],
    nRef: ['n / ref', 'n/ref', 'n ref', 'num ref', 'numero ref', 'numéro ref', 'n° ref', 'ref interne'],
    affectation: ['affectation', 'date affectation', 'date d affectation'],
    gestionnaire: ['gestionnaire', 'manager', 'responsable', 'charge dossier', 'chargé dossier', 'charge de dossier', 'chargé de dossier'],
    type: ['type'],
    procedure: ['procedure', 'procedure (choix multiple)', 'procédure'],
    refClient: ['ref client', 'refclient', 'ref. client', 'ref client ', 'reference client', 'réference client', 'référence client'],
    debiteur: ['debiteur', 'debiteur ', 'débiteur'],
    montant: ['montant'],
    immatriculation: ['immatriculation'],
    boiteNo: ['boite n', 'boite no', 'boite n°', 'boîte n', 'boîte no', 'boîte n°'],
    caution: ['caution', 'nom caution', 'nom de caution'],
    marque: ['marque'],
    adresse: ['adresse', 'adress', 'adresse complete', 'adresse complète'],
    ville: ['ville', 'city', 'commune', 'ville / commune'],
    cautionAdresse: ['adresse de caution', 'adresse caution'],
    cautionVille: ['ville de caution', 'ville caution'],
    cautionCin: ['cin de caution', 'cni de caution', 'cin caution', 'cni caution'],
    cautionRc: ['rc', 'r.c', 'r c'],
    efNumber: ['ef n', 'ef n°', 'ef no', 'ef numero', 'ef numéro'],
    conservation: ['conservation'],
    metrage: ['metrage', 'métrage'],
    refAssignation: ['reference dossier assignation', 'réference dossier assignation', 'référence dossier assignation', 'ref dossier assignation'],
    refRestitution: ['reference dossier restitution', 'réference dossier restitution', 'référence dossier restitution', 'ref dossier restitution'],
    refSfdc: ['reference dossier sfdc', 'réference dossier sfdc', 'référence dossier sfdc', 'ref dossier sfdc'],
    refInjonction: ['reference dossier inj', 'réference dossier inj', 'référence dossier inj', 'ref dossier inj', 'reference dossier injonction', 'réference dossier injonction', 'référence dossier injonction', 'ref dossier injonction'],
    notificationSort: ['sort notification', 'sort notif', 'notification sort', 'sort de notification', 'sort nottifiation', 'sort notifiation'],
    notificationNo: ['notification', 'notification n', 'notification n°', 'notificat', 'notification no', 'notification numero', 'num notification', 'numéro notification'],
    executionNo: [
      'execution',
      'execution n',
      'execution no',
      'execution n°',
      'execution numero',
      'execution num',
      'execution nume ro',
      'n execution',
      'n execution inj',
      'n execution injonction',
      'n d execution',
      'n d execution inj',
      'n d execution injonction',
      'num execution',
      'num execution inj',
      'num execution injonction',
      'numero execution',
      'numero execution inj',
      'numero execution injonction',
      'numéro execution',
      'numéro execution inj',
      'numéro execution injonction',
      'execution inj',
      'execution injonction'
    ],
    dateDepot: ['date depot', 'date depôt', 'date dépôt', 'date depot '],
    sort: ['sort'],
    sortExecution: ['sort execution', 'sort exécution', 'sort exec', 'sort exéc'],
    sortOrd: ['sort ord', 'sord ord', 'sort ordonnance', 'ordonnance', 'statut ordonnance'],
    tribunal: ['tribunal', 'trib', 'tr'],
    statut: ['statut', 'status', 'etat', 'état', 'statut dossier', 'etat dossier', 'état dossier', 'solde', 'soldé', 'soldée']
  };

  const audienceHeaderKeys = {
    refClient: ['ref client', 'refclient', 'reference client', 'réference client', 'référence client'],
    debiteur: ['debiteur', 'débiteur'],
    refDossier: [
      'ref dossier',
      'reference dossier',
      'référence dossier',
      'ref dossier assignation',
      'reference dossier assignation',
      'référence dossier assignation',
      'ref dossier restitution',
      'reference dossier restitution',
      'référence dossier restitution',
      'ref dossier sfdc',
      'reference dossier sfdc',
      'référence dossier sfdc',
      'ref dossier inj',
      'reference dossier inj',
      'référence dossier inj',
      'ref dossier injonction',
      'reference dossier injonction',
      'référence dossier injonction'
    ],
    procedure: ['procedure', 'procédure'],
    audience: ['audience'],
    juge: ['juge'],
    sort: ['sort'],
    sortOrd: ['sort ord', 'sort ordd', 'sord ord', 'sord ordd', 'sortord', 'sort ordonnance', 'sort ordonance', 'ordonnance', 'statut ordonnance', 'statut ordonnance'],
    tribunal: ['tribunal'],
    dateDepot: ['date depot', 'date depôt', 'date dépôt', 'date depot '],
    statut: ['statut', 'status', 'etat', 'état', 'statut dossier', 'etat dossier', 'état dossier', 'solde', 'soldé', 'soldée']
  };
  const isAudienceHeaderMap = (map)=>{
    const hasRefDossier = getColIndex(map, audienceHeaderKeys.refDossier) !== -1;
    const hasAudience = getColIndex(map, audienceHeaderKeys.audience) !== -1;
    const hasIdentity =
      getColIndex(map, audienceHeaderKeys.refClient) !== -1
      || getColIndex(map, audienceHeaderKeys.debiteur) !== -1;
    return hasRefDossier && hasAudience && hasIdentity;
  };
  const normalizeImportColorHex = (value)=>{
    const raw = String(value || '').trim().replace(/^#/, '').toUpperCase();
    if(!raw) return '';
    if(/^[0-9A-F]{8}$/.test(raw)) return raw.slice(2);
    if(/^[0-9A-F]{6}$/.test(raw)) return raw;
    return '';
  };
  const parseImportHexRgb = (value)=>{
    const hex = normalizeImportColorHex(value);
    if(!hex) return null;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if(!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
    return { hex, r, g, b };
  };
  const importFillDescriptors = [
    { color: 'blue', hex: 'E3F0FF', ordonnanceStatus: '' },
    { color: 'green', hex: 'E8F8EE', ordonnanceStatus: 'att' },
    { color: 'green', hex: 'D99694', ordonnanceStatus: 'att' },
    { color: 'red', hex: 'FDEAEA', ordonnanceStatus: '' },
    { color: 'yellow', hex: 'FFF9DB', ordonnanceStatus: 'ok' },
    { color: 'document-ok', hex: 'F4EDC9', ordonnanceStatus: '' },
    { color: 'yellow', hex: '77933C', ordonnanceStatus: 'ok' },
    { color: 'purple-dark', hex: 'EDE6FF', ordonnanceStatus: '' },
    { color: 'purple-light', hex: 'F5EEFF', ordonnanceStatus: '' }
  ].map(item=>({
    ...item,
    rgb: parseImportHexRgb(item.hex)
  }));
  const getCellFillHex = (rowIndex, colIndex)=>{
    if(!sheet || typeof XLSX === 'undefined' || !XLSX?.utils?.encode_cell) return '';
    if(!Number.isInteger(rowIndex) || !Number.isInteger(colIndex) || rowIndex < 0 || colIndex < 0) return '';
    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
    const cell = sheet[cellRef];
    if(!cell || typeof cell !== 'object') return '';
    const directCandidates = [
      cell?.s?.fgColor?.rgb,
      cell?.s?.bgColor?.rgb,
      cell?.s?.fill?.fgColor?.rgb,
      cell?.s?.fill?.bgColor?.rgb,
      cell?.s?.fgColor?.rawRgb,
      cell?.s?.fill?.fgColor?.rawRgb
    ];
    for(const candidate of directCandidates){
      const normalized = normalizeImportColorHex(candidate);
      if(normalized) return normalized;
    }
    return '';
  };
  const getImportFillDescriptor = (fillHex)=>{
    const rgb = parseImportHexRgb(fillHex);
    if(!rgb) return null;
    const maxChannel = Math.max(rgb.r, rgb.g, rgb.b);
    const minChannel = Math.min(rgb.r, rgb.g, rgb.b);
    const chroma = maxChannel - minChannel;
    if(maxChannel >= 245 && chroma <= 12) return null;
    if(rgb.g >= 150 && rgb.g >= rgb.r + 10 && rgb.g >= rgb.b + 10){
      return { color: 'green', ordonnanceStatus: 'att', distance: 0 };
    }
    if(rgb.r >= 210 && rgb.g >= 190 && rgb.b <= 235 && rgb.r >= rgb.b + 12 && rgb.g >= rgb.b + 6){
      return { color: 'yellow', ordonnanceStatus: 'ok', distance: 0 };
    }
    let best = null;
    importFillDescriptors.forEach(descriptor=>{
      if(!descriptor.rgb) return;
      const distance = Math.sqrt(
        ((rgb.r - descriptor.rgb.r) ** 2)
        + ((rgb.g - descriptor.rgb.g) ** 2)
        + ((rgb.b - descriptor.rgb.b) ** 2)
      );
      if(!best || distance < best.distance){
        best = {
          color: descriptor.color,
          ordonnanceStatus: descriptor.ordonnanceStatus,
          distance
        };
      }
    });
    if(!best) return null;
    if(best.distance <= 48) return best;
    if(best.distance <= 85 && chroma >= 16) return best;
    return null;
  };
  const getOrdonnanceStatusFromFill = (rowIndex, colIndex)=>{
    const descriptor = getImportFillDescriptor(getCellFillHex(rowIndex, colIndex));
    return String(descriptor?.ordonnanceStatus || '').trim();
  };
  const getAudienceImportRowMeta = (rowIndex, colIndexes = [])=>{
    const hits = new Map();
    colIndexes.forEach(colIndex=>{
      if(!Number.isInteger(colIndex) || colIndex < 0) return;
      const descriptor = getImportFillDescriptor(getCellFillHex(rowIndex, colIndex));
      if(!descriptor) return;
      const key = `${descriptor.color || ''}::${descriptor.ordonnanceStatus || ''}`;
      const previous = hits.get(key) || {
        color: descriptor.color,
        ordonnanceStatus: descriptor.ordonnanceStatus,
        hits: 0,
        distanceTotal: 0
      };
      previous.hits += 1;
      previous.distanceTotal += Number(descriptor.distance) || 0;
      hits.set(key, previous);
    });
    const ranked = [...hits.values()].sort((a, b)=>{
      if(b.hits !== a.hits) return b.hits - a.hits;
      return a.distanceTotal - b.distanceTotal;
    });
    const best = ranked[0] || null;
    return {
      color: String(best?.color || '').trim(),
      ordonnanceStatus: String(best?.ordonnanceStatus || '').trim()
    };
  };
  const getAudienceOrdonnanceMetaFromValue = (value)=>{
    const status = normalizeDiligenceOrdonnance(value);
    if(status === 'ok'){
      return { color: 'yellow', ordonnanceStatus: 'ok' };
    }
    if(status === 'att'){
      return { color: 'green', ordonnanceStatus: 'att' };
    }
    return { color: '', ordonnanceStatus: '' };
  };
  const referenceHints = {};
  const registerReferenceHint = (rawRef, procName, extras = {})=>{
    const key = normalizeReferenceForAudienceLookup(rawRef);
    const proc = String(procName || '').trim();
    if(!key || !proc) return;
    const executionNo = String(extras.executionNo || '').trim();
    const sort = String(extras.sort || '').trim();
    if(!referenceHints[key]){
      referenceHints[key] = { procedure: proc };
    }
    if(!referenceHints[key].procedure) referenceHints[key].procedure = proc;
    if(executionNo && !referenceHints[key].executionNo) referenceHints[key].executionNo = executionNo;
    if(sort && !referenceHints[key].sort) referenceHints[key].sort = sort;
  };

  // Support loose mapping blocks that only contain dossier references
  // (e.g. "référence dossier assignation/restitution") used by audience import.
  for(let i=0;i<rows.length;i++){
    const map = buildHeaderMap(rows[i] || []);
    const idxAssign = getColIndex(map, dossierHeaderKeys.refAssignation);
    const idxRest = getColIndex(map, dossierHeaderKeys.refRestitution);
    const idxSfdc = getColIndex(map, dossierHeaderKeys.refSfdc);
    const idxInjonction = getColIndex(map, dossierHeaderKeys.refInjonction);
    const idxExecution = getColIndex(map, dossierHeaderKeys.executionNo);
    const idxSortExecution = getColIndex(map, dossierHeaderKeys.sortExecution);
    const idxSort = idxSortExecution !== -1 ? idxSortExecution : getColIndex(map, dossierHeaderKeys.sort);
    if(idxAssign === -1 && idxRest === -1 && idxSfdc === -1 && idxInjonction === -1) continue;
    for(let j=i+1; j<rows.length; j++){
      const row = rows[j] || [];
      const assignRef = idxAssign !== -1 ? String(row[idxAssign] || '').trim() : '';
      const restRef = idxRest !== -1 ? String(row[idxRest] || '').trim() : '';
      const sfdcRef = idxSfdc !== -1 ? String(row[idxSfdc] || '').trim() : '';
      const injRef = idxInjonction !== -1 ? String(row[idxInjonction] || '').trim() : '';
      const executionNo = idxExecution !== -1 ? String(row[idxExecution] || '').trim() : '';
      const sort = idxSort !== -1 ? String(row[idxSort] || '').trim() : '';
      if(!assignRef && !restRef && !sfdcRef && !injRef) break;
      if(assignRef) registerReferenceHint(assignRef, 'ASS', { executionNo, sort });
      if(restRef) registerReferenceHint(restRef, 'Restitution', { executionNo, sort });
      if(sfdcRef) registerReferenceHint(sfdcRef, 'SFDC', { executionNo, sort });
      if(injRef) registerReferenceHint(injRef, 'Injonction', { executionNo, sort });
    }
  }

  const dossiers = [];
  for(let i=0;i<rows.length;i++){
    const dossierColMap = buildHeaderMap(rows[i] || []);
    const looksLikeAudienceHeader = isAudienceHeaderMap(dossierColMap);
    if(looksLikeAudienceHeader) continue;
    const hasDebiteur = getColIndex(dossierColMap, dossierHeaderKeys.debiteur) !== -1;
    const hasClientLike = getColIndex(dossierColMap, dossierHeaderKeys.client) !== -1;
    const hasDossierSignals =
      getColIndex(dossierColMap, dossierHeaderKeys.procedure) !== -1
      || getColIndex(dossierColMap, dossierHeaderKeys.type) !== -1
      || getColIndex(dossierColMap, dossierHeaderKeys.montant) !== -1
      || getColIndex(dossierColMap, dossierHeaderKeys.immatriculation) !== -1;
    if(!(hasDebiteur && (hasClientLike || hasDossierSignals))) continue;

    const idx = {
      client: getColIndex(dossierColMap, dossierHeaderKeys.client),
      nRef: getColIndex(dossierColMap, dossierHeaderKeys.nRef),
      affectation: getColIndex(dossierColMap, dossierHeaderKeys.affectation),
      gestionnaire: getColIndex(dossierColMap, dossierHeaderKeys.gestionnaire),
      type: getColIndex(dossierColMap, dossierHeaderKeys.type),
      procedure: getColIndex(dossierColMap, dossierHeaderKeys.procedure),
      refClient: getColIndex(dossierColMap, dossierHeaderKeys.refClient),
      debiteur: getColIndex(dossierColMap, dossierHeaderKeys.debiteur),
      montant: getColIndex(dossierColMap, dossierHeaderKeys.montant),
      immatriculation: getColIndex(dossierColMap, dossierHeaderKeys.immatriculation),
      boiteNo: getColIndex(dossierColMap, dossierHeaderKeys.boiteNo),
      caution: getColIndex(dossierColMap, dossierHeaderKeys.caution),
      marque: getColIndex(dossierColMap, dossierHeaderKeys.marque),
      adresse: getColIndex(dossierColMap, dossierHeaderKeys.adresse),
      ville: getColIndex(dossierColMap, dossierHeaderKeys.ville),
      cautionAdresse: getColIndex(dossierColMap, dossierHeaderKeys.cautionAdresse),
      cautionVille: getColIndex(dossierColMap, dossierHeaderKeys.cautionVille),
      cautionCin: getColIndex(dossierColMap, dossierHeaderKeys.cautionCin),
      cautionRc: getColIndex(dossierColMap, dossierHeaderKeys.cautionRc),
      efNumber: getColIndex(dossierColMap, dossierHeaderKeys.efNumber),
      conservation: getColIndex(dossierColMap, dossierHeaderKeys.conservation),
      metrage: getColIndex(dossierColMap, dossierHeaderKeys.metrage),
      refAssignation: getColIndex(dossierColMap, dossierHeaderKeys.refAssignation),
      refRestitution: getColIndex(dossierColMap, dossierHeaderKeys.refRestitution),
      refSfdc: getColIndex(dossierColMap, dossierHeaderKeys.refSfdc),
      refInjonction: getColIndex(dossierColMap, dossierHeaderKeys.refInjonction),
      notificationSort: getColIndex(dossierColMap, dossierHeaderKeys.notificationSort),
      notificationNo: getColIndex(dossierColMap, dossierHeaderKeys.notificationNo),
      executionNo: getColIndex(dossierColMap, dossierHeaderKeys.executionNo),
      dateDepot: getColIndex(dossierColMap, dossierHeaderKeys.dateDepot),
      sortExecution: getColIndex(dossierColMap, dossierHeaderKeys.sortExecution),
      sort: getColIndex(dossierColMap, dossierHeaderKeys.sort),
      sortOrd: getColIndex(dossierColMap, dossierHeaderKeys.sortOrd),
      tribunal: getColIndex(dossierColMap, dossierHeaderKeys.tribunal),
      statut: getColIndex(dossierColMap, dossierHeaderKeys.statut)
    };

    let carriedAffectationDate = '';
    let carriedMontant = '';
    for(let j=i + 1; j<rows.length; j++){
      const row = rows[j] || [];
      const rowMap = buildHeaderMap(row);
      const rowLooksLikeAudienceHeader = isAudienceHeaderMap(rowMap);
      if(rowLooksLikeAudienceHeader) break;
      const rowLooksLikeHeader =
        getColIndex(rowMap, dossierHeaderKeys.debiteur) !== -1
        && (
          getColIndex(rowMap, dossierHeaderKeys.client) !== -1
          || getColIndex(rowMap, dossierHeaderKeys.refClient) !== -1
        );
      if(rowLooksLikeHeader) break;

      const refClient = idx.refClient !== -1 ? String(row[idx.refClient] || '').trim() : '';
      const debiteur = idx.debiteur !== -1 ? normalizeImportedDebiteurName(row[idx.debiteur]) : '';
      const clientName = idx.client !== -1 ? String(row[idx.client] || '').trim() : '';
      const nRef = idx.nRef !== -1 ? String(row[idx.nRef] || '').trim() : '';
      const procedureText = idx.procedure !== -1 ? String(row[idx.procedure] || '').trim() : '';
      const gestionnaire = idx.gestionnaire !== -1 ? String(row[idx.gestionnaire] || '').trim() : '';
      const type = idx.type !== -1 ? String(row[idx.type] || '').trim() : '';
      const refAssignation = idx.refAssignation !== -1 ? String(row[idx.refAssignation] || '').trim() : '';
      const refRestitution = idx.refRestitution !== -1 ? String(row[idx.refRestitution] || '').trim() : '';
      const refSfdc = idx.refSfdc !== -1 ? String(row[idx.refSfdc] || '').trim() : '';
      const refInjonction = idx.refInjonction !== -1 ? String(row[idx.refInjonction] || '').trim() : '';
      const notificationSort = idx.notificationSort !== -1 ? String(row[idx.notificationSort] || '').trim() : '';
      const notificationNo = idx.notificationNo !== -1 ? String(row[idx.notificationNo] || '').trim() : '';
      const tribunal = idx.tribunal !== -1 ? String(row[idx.tribunal] || '').trim() : '';
      const dateDepot = idx.dateDepot !== -1 ? parseExcelDateValue(row[idx.dateDepot]) : '';
      const immatriculation = idx.immatriculation !== -1 ? String(row[idx.immatriculation] || '').trim() : '';
      const boiteNo = idx.boiteNo !== -1 ? String(row[idx.boiteNo] || '').trim() : '';
      const caution = idx.caution !== -1 ? String(row[idx.caution] || '').trim() : '';
      const marque = idx.marque !== -1 ? String(row[idx.marque] || '').trim() : '';
      const rawAdresse = idx.adresse !== -1 ? String(row[idx.adresse] || '').trim() : '';
      const rawVille = idx.ville !== -1 ? String(row[idx.ville] || '').trim() : '';
      const normalizedLocation = normalizeImportedAddressVille(rawAdresse, rawVille);
      const adresse = normalizedLocation.adresse;
      const ville = normalizedLocation.ville;
      const cautionAdresse = idx.cautionAdresse !== -1 ? String(row[idx.cautionAdresse] || '').trim() : '';
      const cautionVille = idx.cautionVille !== -1 ? String(row[idx.cautionVille] || '').trim() : '';
      const cautionCin = idx.cautionCin !== -1 ? String(row[idx.cautionCin] || '').trim() : '';
      const cautionRc = idx.cautionRc !== -1 ? String(row[idx.cautionRc] || '').trim() : '';
      const efNumber = idx.efNumber !== -1 ? String(row[idx.efNumber] || '').trim() : '';
      const conservation = idx.conservation !== -1 ? String(row[idx.conservation] || '').trim() : '';
      const metrage = idx.metrage !== -1 ? String(row[idx.metrage] || '').trim() : '';
      const montantRaw = idx.montant !== -1 ? String(row[idx.montant] || '').trim() : '';
      const montantValues = parseExcelMontantValues(montantRaw);
      const montant = String(montantValues[0] || '').trim();
      const montantExtra = String(montantValues[1] || '').trim();
      const affectationValues = idx.affectation !== -1 ? parseExcelDateValues(row[idx.affectation]) : [];
      const dateAffectation = String(affectationValues[0] || '').trim();
      const dateAffectationExtra = String(affectationValues[1] || '').trim();
      const executionNo = idx.executionNo !== -1 ? String(row[idx.executionNo] || '').trim() : '';
      const sortExecution = idx.sortExecution !== -1
        ? String(row[idx.sortExecution] || '').trim()
        : (idx.sort !== -1 ? String(row[idx.sort] || '').trim() : '');
      const sort = idx.sort !== -1 ? String(row[idx.sort] || '').trim() : '';
      const sortOrd = idx.sortOrd !== -1 ? String(row[idx.sortOrd] || '').trim() : '';
      const statutRaw = idx.statut !== -1 ? String(row[idx.statut] || '').trim() : '';
      const isEmptyDossierRow = !refClient && !debiteur && !clientName && !procedureText && !type && !montant && !dateAffectation;
      if(isEmptyDossierRow) break;
      const hasExplicitReferences = !!(refAssignation || refRestitution || refSfdc || refInjonction);
      const hasOtherDossierSignals = !!(
        immatriculation
        || boiteNo
        || caution
        || marque
        || adresse
        || ville
        || cautionAdresse
        || cautionVille
        || cautionCin
        || cautionRc
        || efNumber
        || conservation
        || metrage
      );
      const isCarryDossierRow = !refClient
        && !debiteur
        && !clientName
        && !procedureText
        && !type
        && !hasExplicitReferences
        && !hasOtherDossierSignals
        && (!!dateAffectation || !!montant);
      if(isCarryDossierRow){
        if(dateAffectation) carriedAffectationDate = dateAffectation;
        if(montant) carriedMontant = montant;
        continue;
      }
      const isClientTitleRow = /^client\s*:/i.test(clientName) && !refClient && !debiteur && !procedureText && !type && !montant;
      if(isClientTitleRow) continue;

      dossiers.push({
        rowNumber: j + 1,
        clientName,
        nRef,
        dateAffectation,
        carriedAffectationDate,
        gestionnaire,
        carriedMontant,
        dateAffectationExtra,
        type,
        procedureText,
        refClient,
        debiteur,
        montant,
        montantExtra,
        immatriculation,
        boiteNo,
        caution,
        marque,
        adresse,
        ville,
        cautionAdresse,
        cautionVille,
        cautionCin,
        cautionRc,
        efNumber,
        conservation,
        metrage,
        refAssignation,
        refRestitution,
        refSfdc,
        refInjonction,
        notificationSort,
        notificationNo,
        executionNo,
        dateDepot,
        sortExecution,
        sort,
        sortOrd,
        tribunal,
        statutRaw
      });
      carriedAffectationDate = '';
      carriedMontant = '';
    }
  }

  const audiences = [];
  for(let i=0;i<rows.length;i++){
    const map = buildHeaderMap(rows[i] || []);
    const isAudienceHeader = isAudienceHeaderMap(map);
    if(!isAudienceHeader) continue;

    const idx = {
      refClient: getColIndex(map, audienceHeaderKeys.refClient),
      debiteur: getColIndex(map, audienceHeaderKeys.debiteur),
      refDossier: getColIndex(map, audienceHeaderKeys.refDossier),
      procedure: getColIndex(map, audienceHeaderKeys.procedure),
      audience: getColIndex(map, audienceHeaderKeys.audience),
      juge: getColIndex(map, audienceHeaderKeys.juge),
      sort: getColIndex(map, audienceHeaderKeys.sort),
      sortOrd: getColIndex(map, audienceHeaderKeys.sortOrd),
      tribunal: getColIndex(map, audienceHeaderKeys.tribunal),
      dateDepot: getColIndex(map, audienceHeaderKeys.dateDepot),
      statut: getColIndex(map, audienceHeaderKeys.statut)
    };

    for(let j=i+1; j<rows.length; j++){
      const row = rows[j] || [];
      const refDossier = idx.refDossier !== -1 ? String(row[idx.refDossier] || '').trim() : '';
      const debiteur = idx.debiteur !== -1 ? normalizeImportedDebiteurName(row[idx.debiteur]) : '';
      const refClient = idx.refClient !== -1 ? String(row[idx.refClient] || '').trim() : '';
      if(!refDossier && !debiteur && !refClient) break;
      const sortOrdText = idx.sortOrd !== -1 ? String(row[idx.sortOrd] || '').trim() : '';
      const importColorMeta = getAudienceOrdonnanceMetaFromValue(sortOrdText);
      audiences.push({
        rowNumber: j + 1,
        refClient,
        debiteur,
        refDossier,
        procedureText: idx.procedure !== -1 ? String(row[idx.procedure] || '').trim() : '',
        audience: idx.audience !== -1 ? parseExcelDateValue(row[idx.audience]) : '',
        juge: idx.juge !== -1 ? String(row[idx.juge] || '').trim() : '',
        sort: idx.sort !== -1 ? String(row[idx.sort] || '').trim() : '',
        sortOrd: sortOrdText,
        tribunal: idx.tribunal !== -1 ? String(row[idx.tribunal] || '').trim() : '',
        dateDepot: idx.dateDepot !== -1 ? parseExcelDateValue(row[idx.dateDepot]) : '',
        importedColor: importColorMeta.color,
        importedOrdonnanceStatus: importColorMeta.ordonnanceStatus,
        hasSortOrdColumn: idx.sortOrd !== -1,
        statutRaw: idx.statut !== -1 ? String(row[idx.statut] || '').trim() : '',
        hasStatutColumn: idx.statut !== -1
      });
    }
  }

  return { dossiers, audiences, referenceHints };
}

function buildExcelImportIssueMessage(issues, options = {}){
  if(!Array.isArray(issues) || !issues.length) return '';
  const maxIssues = 200;
  const limitedIssues = issues.slice(0, maxIssues);
  const groupedByLine = new Map();
  const unknownLineLabel = 'Ligne ?';
  const introLabel = String(options?.introLabel || 'Erreurs classées par ligne :').trim() || 'Erreurs classées par ligne :';

  const parseIssue = (issueText)=>{
    const rawText = String(issueText || '').trim();
    const lineMatch = rawText.match(/^Ligne\s+(\d+|\?)\s*:\s*(.+)$/i);
    if(!lineMatch){
      return {
        lineNumber: null,
        lineLabel: unknownLineLabel,
        detail: rawText
      };
    }
    const lineToken = lineMatch[1];
    const detail = lineMatch[2].trim();
    const parsedNumber = Number(lineToken);
    return {
      lineNumber: Number.isFinite(parsedNumber) ? parsedNumber : null,
      lineLabel: Number.isFinite(parsedNumber) ? `Ligne ${parsedNumber}` : unknownLineLabel,
      detail
    };
  };

  const classifyIssue = (detail)=>{
    const normalized = String(detail || '').toLowerCase();
    if(normalized.includes('ref client introuvable')) return 'Ref client';
    if(normalized.includes('ref dossier introuvable')) return 'Ref dossier';
    if(normalized.includes('procédure inconnue') || normalized.includes('procedure inconnue')) return 'Procédure';
    if(normalized.includes('date audience invalide')) return 'Date audience';
    if(normalized.includes('audience ignorée')) return 'Audience';
    if(normalized.includes('dossier ignoré') || normalized.includes('dossier ignore')) return 'Dossier';
    return 'Autre';
  };

  limitedIssues.forEach(issue=>{
    const parsed = parseIssue(issue);
    const key = parsed.lineNumber === null ? `${unknownLineLabel}:${parsed.detail}` : String(parsed.lineNumber);
    if(!groupedByLine.has(key)){
      groupedByLine.set(key, {
        lineNumber: parsed.lineNumber,
        lineLabel: parsed.lineLabel,
        details: []
      });
    }
    groupedByLine.get(key).details.push({
      type: classifyIssue(parsed.detail),
      text: parsed.detail
    });
  });

  const groups = [...groupedByLine.values()].sort((a, b)=>{
    if(a.lineNumber === null && b.lineNumber === null) return 0;
    if(a.lineNumber === null) return 1;
    if(b.lineNumber === null) return -1;
    return a.lineNumber - b.lineNumber;
  });

  const lines = [introLabel];
  groups.forEach(group=>{
    lines.push(`${group.lineLabel}:`);
    group.details.forEach((detail, idx)=>{
      lines.push(`  ${idx + 1}) [${detail.type}] ${detail.text}`);
    });
  });

  if(issues.length > maxIssues){
    lines.push('');
    lines.push(`... +${issues.length - maxIssues} autres lignes ignorées`);
  }
  return lines.join('\n');
}

function buildExcelImportResultDetails({ skippedIssues = [], warningIssues = [], infoIssues = [] } = {}){
  const sections = [];
  if(Array.isArray(skippedIssues) && skippedIssues.length){
    sections.push(buildExcelImportIssueMessage(skippedIssues, {
      introLabel: `Lignes non importées (${skippedIssues.length}) :`
    }));
  }
  if(Array.isArray(warningIssues) && warningIssues.length){
    if(sections.length) sections.push('');
    sections.push(buildExcelImportIssueMessage(warningIssues, {
      introLabel: `Avertissements sur lignes importées (${warningIssues.length}) :`
    }));
  }
  if(Array.isArray(infoIssues) && infoIssues.length){
    const visibleInfo = infoIssues.filter(Boolean);
    if(visibleInfo.length){
      if(sections.length) sections.push('');
      sections.push(['Informations :', ...visibleInfo].join('\n'));
    }
  }
  return sections.join('\n').trim() || 'Aucune erreur.';
}

function isExcelImportDisplayError(issue){
  const normalized = String(issue || '').trim().toLowerCase();
  if(!normalized) return false;
  if(normalized.startsWith('rapprochement automatique:')) return false;
  return true;
}

function renderExcelImportIssues(issuesText, container){
  if(!container) return;
  const text = String(issuesText || '').trim() || 'Aucune erreur.';
  container.dataset.copyText = text;

  if(text === 'Aucune erreur.'){
    container.innerHTML = '<div class="import-error-empty">Aucune erreur.</div>';
    return;
  }

  const lines = text.split(/\r?\n/);
  const intro = [];
  const groups = [];
  const extras = [];
  let currentGroup = null;

  lines.forEach(rawLine=>{
    const line = String(rawLine || '').trim();
    if(!line) return;
    if(/^ligne\s+(\d+|\?)\s*:$/i.test(line)){
      currentGroup = { title: line, items: [] };
      groups.push(currentGroup);
      return;
    }
    if(line.startsWith('... +')){
      extras.push(line);
      return;
    }
    if(currentGroup){
      currentGroup.items.push(line);
    }else{
      intro.push(line);
    }
  });

  const html = [];
  if(intro.length){
    html.push(`<div class="import-error-intro">${escapeHtml(intro.join(' '))}</div>`);
  }

  groups.forEach((group, idx)=>{
    const colorClass = `color-${(idx % 6) + 1}`;
    html.push(`<div class="import-error-line ${colorClass}">`);
    html.push(`<div class="import-error-line-head">${escapeHtml(group.title)}</div>`);
    group.items.forEach(item=>{
      const itemMatch = item.match(/^\d+\)\s*\[([^\]]+)\]\s*(.+)$/);
      if(itemMatch){
        html.push(`<div class="import-error-item"><span class="import-error-badge">${escapeHtml(itemMatch[1])}</span><span class="import-error-text">${escapeHtml(itemMatch[2])}</span></div>`);
        return;
      }
      const plainItemMatch = item.match(/^\d+\)\s*(.+)$/);
      if(plainItemMatch){
        html.push(`<div class="import-error-item"><span class="import-error-text">${escapeHtml(plainItemMatch[1])}</span></div>`);
        return;
      }
      html.push(`<div class="import-error-note">${escapeHtml(item)}</div>`);
    });
    html.push('</div>');
  });

  if(extras.length){
    html.push(`<div class="import-error-extra">${escapeHtml(extras.join(' | '))}</div>`);
  }

  container.innerHTML = html.join('');
}

function closeImportResultModal(){
  const modal = $('importResultModal');
  if(modal) modal.style.display = 'none';
}

let exportPreviewAction = null;
let exportPreviewButtonLabel = 'Exporter Excel';
let exportPreviewBusy = false;

function closeExportPreviewModal(){
  const modal = $('exportPreviewModal');
  const meta = $('exportPreviewMeta');
  const wrap = $('exportPreviewTableWrap');
  const exportBtn = $('exportPreviewExcelBtn');
  const printBtn = $('printExportPreviewBtn');
  exportPreviewAction = null;
  exportPreviewButtonLabel = 'Exporter Excel';
  exportPreviewBusy = false;
  if(meta) meta.innerHTML = '';
  if(wrap){
    wrap.innerHTML = '';
    wrap.classList.remove('preview-table-wrap-audience');
  }
  if(exportBtn){
    exportBtn.style.display = 'none';
    exportBtn.disabled = false;
    exportBtn.innerHTML = '<i class="fa-regular fa-file-excel"></i> Exporter Excel';
  }
  if(printBtn){
    printBtn.style.display = 'none';
    printBtn.disabled = false;
  }
  if(modal) modal.style.display = 'none';
}

function setExportPreviewModalState({ title = '', subtitle = '', rows = [], onExport = null, exportLabel = 'Exporter Excel', metaHtml = '' } = {}){
  const modal = $('exportPreviewModal');
  const titleNode = $('exportPreviewTitle');
  const metaNode = $('exportPreviewMeta');
  const wrap = $('exportPreviewTableWrap');
  const exportBtn = $('exportPreviewExcelBtn');
  if(!modal || !titleNode || !metaNode || !wrap){
    alert('Aperçu indisponible.');
    return null;
  }
  const safeRows = Array.isArray(rows) ? rows : [];
  exportPreviewAction = typeof onExport === 'function' ? onExport : null;
  exportPreviewButtonLabel = String(exportLabel || 'Exporter Excel').trim() || 'Exporter Excel';
  exportPreviewBusy = false;
  titleNode.innerHTML = `<i class="fa-regular fa-file-excel"></i> ${escapeHtml(title || 'Aperçu Excel')}`;
  metaNode.innerHTML = String(metaHtml || '').trim() || `
    <div>${String(subtitle || '').trim() ? escapeHtml(String(subtitle || '').trim()) : 'Aperçu sans téléchargement'}</div>
    <div>${safeRows.length} ligne(s)</div>
  `;
  wrap.classList.remove('preview-table-wrap-audience');
  if(exportBtn){
    if(exportPreviewAction && safeRows.length){
      exportBtn.style.display = 'inline-flex';
      exportBtn.disabled = false;
      exportBtn.innerHTML = `<i class="fa-regular fa-file-excel"></i> ${escapeHtml(exportPreviewButtonLabel)}`;
    }else{
      exportBtn.style.display = 'none';
      exportBtn.disabled = false;
      exportBtn.innerHTML = '<i class="fa-regular fa-file-excel"></i> Exporter Excel';
    }
  }
  return { modal, titleNode, metaNode, wrap, exportBtn };
}

function buildAudienceReferencePreviewHtml({ subtitle = '', headers = [], rows = [], headerImageDataUrl = '' } = {}){
  const safeHeaders = Array.isArray(headers) ? headers.slice(0, 7) : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  const columnWidths = [14.77734375, 20.6640625, 16.33203125, 13.77734375, 16.77734375, 23.21875, 26.88671875];
  const totalWidth = columnWidths.reduce((sum, width)=>sum + width, 0) || 1;
  const colGroupHtml = columnWidths
    .map((width)=>`<col style="width:${((width / totalWidth) * 100).toFixed(4)}%">`)
    .join('');
  const theadHtml = `<tr>${safeHeaders.map((header)=>`<th>${escapeHtml(header)}</th>`).join('')}</tr>`;
  const tbodyHtml = safeRows
    .map((row)=>`<tr>${(Array.isArray(row) ? row : []).slice(0, 7).map((cell, index)=>{
      const text = formatMixedDirectionExportText(String(cell ?? ''));
      const html = escapeHtml(text) || '&nbsp;';
      const nowrapClass = index === 4 ? ' preview-bidi-cell-nowrap' : '';
      return `<td><span class="preview-bidi-cell${nowrapClass}" dir="auto">${html}</span></td>`;
    }).join('')}</tr>`)
    .join('');
  const headerHtml = headerImageDataUrl
    ? `<img class="preview-audience-sheet-header-image" src="${escapeAttr(headerImageDataUrl)}" alt="En-tête audience">`
    : '';
  return `
    <div class="preview-audience-sheet">
      <div class="preview-audience-sheet-paper">
        <div class="preview-audience-sheet-header">${headerHtml}</div>
        <div class="preview-audience-sheet-subtitle-row">
          <div class="preview-audience-sheet-subtitle">${escapeHtml(String(subtitle || '').trim() || '-')}</div>
          <div class="preview-audience-sheet-count">${safeRows.length} ligne(s)</div>
        </div>
        <div class="preview-audience-sheet-table-wrap">
          <table class="preview-table preview-table-audience-reference">
            <colgroup>${colGroupHtml}</colgroup>
            <thead>${theadHtml}</thead>
            <tbody>${tbodyHtml}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

async function showAudienceExportPreviewModal({ title = '', subtitle = '', headers = [], rows = [], onExport = null, exportLabel = 'Ouvrir le fichier Excel' } = {}){
  const state = setExportPreviewModalState({
    title,
    subtitle,
    rows,
    onExport,
    exportLabel,
    metaHtml: ''
  });
  if(!state) return;
  const { modal, wrap } = state;
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  if(!safeHeaders.length || !safeRows.length){
    wrap.innerHTML = '<div class="preview-empty">Aucune donnée à afficher.</div>';
    modal.style.display = 'flex';
    return;
  }
  wrap.classList.add('preview-table-wrap-audience');
  const headerImageDataUrl = await getAudienceExportHeaderImageDataUrl();
  wrap.innerHTML = buildAudienceReferencePreviewHtml({
    subtitle,
    headers: safeHeaders,
    rows: safeRows,
    headerImageDataUrl
  });
  modal.style.display = 'flex';
}

async function handleExportPreviewExcel(){
  if(!canExportData()) return alert('Accès refusé');
  if(exportPreviewBusy || typeof exportPreviewAction !== 'function') return;
  const exportBtn = $('exportPreviewExcelBtn');
  exportPreviewBusy = true;
  if(exportBtn){
    exportBtn.disabled = true;
    exportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Export en cours...';
  }
  try{
    await exportPreviewAction();
  }finally{
    exportPreviewBusy = false;
    if(exportBtn){
      exportBtn.disabled = false;
      exportBtn.innerHTML = `<i class="fa-regular fa-file-excel"></i> ${escapeHtml(exportPreviewButtonLabel)}`;
    }
  }
}

function handlePrintExportPreview(){
  const titleNode = $('exportPreviewTitle');
  const metaNode = $('exportPreviewMeta');
  const wrap = $('exportPreviewTableWrap');
  if(!titleNode || !metaNode || !wrap){
    alert('Aperçu indisponible.');
    return;
  }
  const tableHtml = String(wrap.innerHTML || '').trim();
  if(!tableHtml || tableHtml.includes('preview-empty')){
    alert('Aucune donnée à imprimer.');
    return;
  }
  const title = escapeHtml(titleNode.textContent || 'Aperçu Excel');
  const meta = metaNode.innerHTML;
  const printHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    :root{color-scheme:light}
    *{box-sizing:border-box}
    body{margin:0;padding:24px;font-family:Arial,sans-serif;color:#0f172a;background:#fff}
    .print-head{margin-bottom:18px}
    .print-head h1{margin:0 0 10px;color:#1e3a8a;font-size:28px}
    .print-meta{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:#475569;font-size:13px;font-weight:700;margin-bottom:14px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    thead th{background:#1e3a8a;color:#fff;padding:8px;border:1px solid #cbd5e1;text-align:left}
    td{padding:8px;border:1px solid #d9e4f5;text-align:left;vertical-align:top}
    tbody tr:nth-child(even) td{background:#f8fbff}
    @page{size:auto;margin:12mm}
  </style>
</head>
<body>
  <div class="print-head">
    <h1>${title}</h1>
    <div class="print-meta">${meta}</div>
  </div>
  ${tableHtml}
</body>
</html>`;

  const existingFrame = document.getElementById('exportPreviewPrintFrame');
  if(existingFrame) existingFrame.remove();

  const printFrame = document.createElement('iframe');
  printFrame.id = 'exportPreviewPrintFrame';
  printFrame.setAttribute('aria-hidden', 'true');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  printFrame.style.opacity = '0';

  const cleanup = ()=>{
    setTimeout(()=>{
      if(printFrame.parentNode) printFrame.remove();
    }, 400);
  };

  printFrame.onload = ()=>{
    const frameWindow = printFrame.contentWindow;
    if(!frameWindow){
      cleanup();
      alert("Ouverture de l'aperçu d'impression impossible.");
      return;
    }
    frameWindow.focus();
    if('onafterprint' in frameWindow){
      frameWindow.onafterprint = cleanup;
    }
    setTimeout(()=>{
      try{
        frameWindow.print();
      }catch(err){
        console.error(err);
        cleanup();
        alert("L'impression a échoué. Réessayez.");
      }
    }, 150);
  };

  document.body.appendChild(printFrame);
  const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
  if(!frameDoc){
    cleanup();
    alert("Création de l'aperçu d'impression impossible.");
    return;
  }
  frameDoc.open();
  frameDoc.write(printHtml);
  frameDoc.close();
}

function showExportPreviewModal({ title = '', subtitle = '', headers = [], rows = [], onExport = null, exportLabel = 'Exporter Excel' } = {}){
  const state = setExportPreviewModalState({ title, subtitle, rows, onExport, exportLabel });
  if(!state) return;
  const { modal, wrap } = state;
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  if(!safeHeaders.length || !safeRows.length){
    wrap.innerHTML = '<div class="preview-empty">Aucune donnée à afficher.</div>';
  }else{
    const thead = `<tr>${safeHeaders.map(header=>`<th>${escapeHtml(header)}</th>`).join('')}</tr>`;
    const tbody = safeRows.map(row=>`<tr>${row.map(cell=>`<td>${escapeHtml(String(cell ?? '-'))}</td>`).join('')}</tr>`).join('');
    wrap.innerHTML = `<table class="preview-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
  }
  modal.style.display = 'flex';
}

async function copyImportErrors(){
  const field = $('importResultErrors');
  if(!field) return;
  const text = String(field.dataset?.copyText || field.innerText || '').trim();
  if(!text) return alert('Aucune erreur à copier.');
  try{
    if(navigator?.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
    }else{
      const temp = document.createElement('textarea');
      temp.value = text;
      temp.setAttribute('readonly', 'readonly');
      temp.style.position = 'fixed';
      temp.style.opacity = '0';
      document.body.appendChild(temp);
      temp.focus();
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
    }
    alert('Erreurs copiées.');
  }catch(err){
    console.error(err);
    alert('Copie impossible. Sélectionnez et copiez manuellement.');
  }
}

function showExcelImportResult(summary, issuesText){
  const modal = $('importResultModal');
  const summaryNode = $('importResultSummary');
  const errorsNode = $('importResultErrors');
  if(!modal || !summaryNode || !errorsNode){
    alert([summary, issuesText ? `\nDétails:\n${issuesText}` : ''].filter(Boolean).join('\n'));
    return;
  }
  summaryNode.innerText = summary;
  renderExcelImportIssues(issuesText || 'Aucune erreur.', errorsNode);
  errorsNode.scrollTop = 0;
  modal.style.display = 'flex';
}

function syncAudienceColorFilterSelectAppearance(){
  const select = $('filterAudienceColor');
  if(!select) return;
  const allowed = ['all', 'blue', 'green', 'yellow', 'document-ok', 'purple-dark', 'purple-light', 'closed'];
  allowed.forEach(value=>select.classList.remove(`audience-color-select-${value}`));
  const normalizedValue = normalizeAudienceFilterColorValue(filterAudienceColor);
  if(filterAudienceColor !== normalizedValue) filterAudienceColor = normalizedValue;
  select.value = normalizedValue;
}

function normalizeAudienceFilterColorValue(value){
  const normalized = String(value || 'all').trim() || 'all';
  if(normalized === 'purple-dark' || normalized === 'purple-light'){
    return 'closed';
  }
  const allowed = new Set(['all', 'blue', 'green', 'yellow', 'document-ok', 'closed']);
  return allowed.has(normalized) ? normalized : 'all';
}

function getAudienceSelectionToneClass(color = selectedAudienceColor){
  const normalized = String(color || '').trim();
  const resolved = normalized === 'closed' ? 'purple-dark' : normalized;
  const allowed = new Set(['blue', 'green', 'yellow', 'document-ok', 'purple-dark', 'purple-light']);
  if(!allowed.has(resolved)) return 'audience-tone-all';
  return `audience-tone-${resolved}`;
}

function syncAudienceSelectionTone(){
  const toneClasses = [
    'audience-tone-all',
    'audience-tone-blue',
    'audience-tone-green',
    'audience-tone-yellow',
    'audience-tone-document-ok',
    'audience-tone-purple-dark',
    'audience-tone-purple-light'
  ];
  const targets = [$('audienceCheckedCount'), $('printAudienceBtn')].filter(Boolean);
  const nextToneClass = getAudienceSelectionToneClass();
  targets.forEach((node)=>{
    toneClasses.forEach(cls=>node.classList.remove(cls));
    node.classList.add(nextToneClass);
  });
}

function syncAudienceColorUndoAvailability(){
  const btn = $('undoAudienceColorBtn');
  if(!btn) return;
  const enabled = !!(audienceColorUndoState && Array.isArray(audienceColorUndoState.entries) && audienceColorUndoState.entries.length && canEditData());
  btn.disabled = !enabled;
  btn.classList.toggle('is-disabled', !enabled);
  if(enabled){
    btn.removeAttribute('aria-disabled');
    btn.removeAttribute('title');
  }else{
    btn.setAttribute('aria-disabled', 'true');
    btn.title = 'Aucun changement de couleur à annuler.';
  }
}

function syncAudienceColorActionAvailability(){
  const buttons = audienceColorButtons.length ? audienceColorButtons : Array.from(document.querySelectorAll('.color-btn[data-color]'));
  const hasSelection = audiencePrintSelection.size > 0;
  if(!hasSelection && selectedAudienceColor !== 'all'){
    setSelectedAudienceColor('all', false);
  }
  buttons.forEach((btn)=>{
    const color = String(btn?.dataset?.color || '').trim();
    const shouldDisable = !hasSelection && color !== 'all';
    btn.disabled = shouldDisable;
    btn.classList.toggle('is-disabled', shouldDisable);
    if(shouldDisable){
      btn.setAttribute('aria-disabled', 'true');
      btn.title = 'Cochez d’abord un ou plusieurs dossiers avant de choisir une couleur.';
    }else{
      btn.removeAttribute('aria-disabled');
      btn.removeAttribute('title');
    }
  });
  syncAudienceColorUndoAvailability();
}

function captureAudienceColorFieldSnapshot(target, field){
  const source = target && typeof target === 'object' ? target : {};
  return {
    present: Object.prototype.hasOwnProperty.call(source, field),
    value: source[field]
  };
}

function restoreAudienceColorFieldSnapshot(target, field, snapshot){
  if(!target || typeof target !== 'object' || !field || !snapshot) return;
  if(snapshot.present){
    target[field] = snapshot.value;
  }else{
    delete target[field];
  }
}

function buildAudienceColorUndoEntry(ci, di, procKey){
  const dossier = AppState.clients?.[ci]?.dossiers?.[di];
  if(!dossier) return null;
  const p = getAudienceProcedure(ci, di, procKey);
  return {
    ci,
    di,
    procKey,
    fields: {
      color: captureAudienceColorFieldSnapshot(p, 'color'),
      attOrdOrOrdOk: captureAudienceColorFieldSnapshot(p, 'attOrdOrOrdOk'),
      _audienceSortOrd: captureAudienceColorFieldSnapshot(p, '_audienceSortOrd'),
      _disableAudienceRowColor: captureAudienceColorFieldSnapshot(p, '_disableAudienceRowColor'),
      _suppressAudienceOrdonnanceColor: captureAudienceColorFieldSnapshot(p, '_suppressAudienceOrdonnanceColor'),
      statut: captureAudienceColorFieldSnapshot(dossier, 'statut')
    }
  };
}

function rememberAudienceColorUndoState(entries, options = {}){
  const safeEntries = Array.isArray(entries) ? entries.filter(Boolean) : [];
  audienceColorUndoState = safeEntries.length ? {
    entries: safeEntries,
    selectionKeys: [...audiencePrintSelection],
    filterAudienceColor: normalizeAudienceFilterColorValue(options.filterAudienceColor ?? filterAudienceColor),
    selectedAudienceColor: String(options.selectedAudienceColor ?? selectedAudienceColor ?? 'all').trim() || 'all',
    filterAudienceCheckedFirst: options.filterAudienceCheckedFirst ?? filterAudienceCheckedFirst
  } : null;
  syncAudienceColorUndoAvailability();
}

function clearAudienceColorUndoState(){
  if(!audienceColorUndoState) return;
  audienceColorUndoState = null;
  syncAudienceColorUndoAvailability();
}

function undoLastAudienceColorChange(){
  if(!audienceColorUndoState || !Array.isArray(audienceColorUndoState.entries) || !audienceColorUndoState.entries.length){
    syncAudienceColorUndoAvailability();
    return;
  }
  if(!canEditData()) return alert('Accès refusé');
  const undoState = audienceColorUndoState;
  audienceColorUndoState = null;
  let changed = false;
  let lastClientId = null;
  let lastDossier = null;
  undoState.entries.forEach((entry)=>{
    const client = AppState.clients?.[entry?.ci];
    const dossier = AppState.clients?.[entry?.ci]?.dossiers?.[entry?.di];
    if(!client || !dossier) return;
    const p = getAudienceProcedure(entry.ci, entry.di, entry.procKey);
    detachAudienceImportBatchOwnership(p);
    restoreAudienceColorFieldSnapshot(p, 'color', entry.fields?.color);
    restoreAudienceColorFieldSnapshot(p, 'attOrdOrOrdOk', entry.fields?.attOrdOrOrdOk);
    restoreAudienceColorFieldSnapshot(p, '_audienceSortOrd', entry.fields?._audienceSortOrd);
    restoreAudienceColorFieldSnapshot(p, '_disableAudienceRowColor', entry.fields?._disableAudienceRowColor);
    restoreAudienceColorFieldSnapshot(p, '_suppressAudienceOrdonnanceColor', entry.fields?._suppressAudienceOrdonnanceColor);
    restoreAudienceColorFieldSnapshot(dossier, 'statut', entry.fields?.statut);
    rememberAudienceTransientPriorityColor(entry.ci, entry.di, entry.procKey, '');
    pinAudienceRowTemporarily(entry.ci, entry.di, entry.procKey);
    changed = true;
    lastClientId = client.id;
    lastDossier = dossier;
  });
  audiencePrintSelection = new Set(Array.isArray(undoState.selectionKeys) ? undoState.selectionKeys : []);
  audiencePrintSelectionVersion += 1;
  filterAudienceColor = normalizeAudienceFilterColorValue(undoState.filterAudienceColor || 'all');
  filterAudienceCheckedFirst = undoState.filterAudienceCheckedFirst === true;
  if($('filterAudienceCheckedOrder')){
    $('filterAudienceCheckedOrder').value = filterAudienceCheckedFirst ? 'checked-first' : 'default';
  }
  if($('filterAudienceColor')) $('filterAudienceColor').value = filterAudienceColor;
  setSelectedAudienceColor(undoState.selectedAudienceColor || 'all', false);
  syncAudienceColorFilterSelectAppearance();
  if(changed){
    markAudienceColorCachesDirty();
    queueAudienceColorBatchUpdate({
      persist: true,
      persistClientId: lastClientId,
      persistDossier: lastDossier,
      dashboard: true,
      suivi: true
    });
  }
  paginationState.audience = 1;
  queueAudienceCheckedCountRender();
  syncAudienceColorUndoAvailability();
  renderAudience();
}

function resetAudienceFiltersUi(){
  filterAudienceColor = 'all';
  filterAudienceProcedure = 'all';
  filterAudienceTribunal = 'all';
  filterAudienceDate = '';
  filterAudienceErrorsOnly = false;
  filterAudienceCheckedFirst = false;
  setSelectedAudienceColor('all', false);
  if($('filterAudience')) $('filterAudience').value = '';
  if($('filterAudienceColor')) $('filterAudienceColor').value = 'all';
  syncAudienceColorFilterSelectAppearance();
  if($('filterAudienceProcedure')) $('filterAudienceProcedure').value = 'all';
  if($('filterAudienceTribunal')) $('filterAudienceTribunal').value = '';
  if($('filterAudienceDate')) $('filterAudienceDate').value = '';
  if($('filterAudienceCheckedOrder')) $('filterAudienceCheckedOrder').value = 'default';
  const errBtn = $('audienceErrorsBtn');
  if(errBtn) errBtn.classList.remove('active');
}

function resetSuiviFiltersUi(){
  filterSuiviProcedure = 'all';
  filterSuiviTribunal = 'all';
  filterSuiviStatus = 'all';
  filterSuiviCheckedFirst = false;
  filterSuiviAttDepotOnly = false;
  if($('filterGlobal')) $('filterGlobal').value = '';
  if($('filterSuiviProcedure')) $('filterSuiviProcedure').value = 'all';
  if($('filterSuiviTribunal')) $('filterSuiviTribunal').value = '';
  if($('filterSuiviCheckedOrder')) $('filterSuiviCheckedOrder').value = 'default';
}

function openDashboardClientsView(){
  showView('clients', { force: true });
}

function openDashboardSuiviEnCoursView(){
  resetSuiviFiltersUi();
  filterSuiviStatus = 'open';
  paginationState.suivi = 1;
  showView('suivi', { force: true });
}

function openDashboardSuiviClosedView(){
  resetSuiviFiltersUi();
  filterSuiviStatus = 'closed';
  paginationState.suivi = 1;
  showView('suivi', { force: true });
}

function openDashboardAudienceErrorsView(){
  resetAudienceFiltersUi();
  filterAudienceErrorsOnly = true;
  const errBtn = $('audienceErrorsBtn');
  if(errBtn) errBtn.classList.add('active');
  paginationState.audience = 1;
  showView('audience', { force: true });
}

function openDashboardAudienceAttSortView(){
  resetAudienceFiltersUi();
  filterAudienceColor = 'blue';
  if($('filterAudienceColor')) $('filterAudienceColor').value = 'blue';
  syncAudienceColorFilterSelectAppearance();
  paginationState.audience = 1;
  showView('audience', { force: true });
}

function openDashboardSuiviAttDepotView(){
  resetSuiviFiltersUi();
  filterSuiviAttDepotOnly = true;
  paginationState.suivi = 1;
  showView('suivi', { force: true });
}

function bindDashboardShortcutCard(cardId, handler){
  const card = $(cardId);
  if(!card || typeof handler !== 'function') return;
  card.addEventListener('click', handler);
  card.addEventListener('keydown', (e)=>{
    if(e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    handler();
  });
}

async function applyExcelImport(payload, options = {}){
  const { dossiers, audiences } = payload;
  const referenceHints = payload && typeof payload.referenceHints === 'object'
    ? payload.referenceHints
    : {};
  const getReferenceHint = (refKey)=>{
    if(!refKey) return { procedure: '', executionNo: '', sort: '' };
    const raw = referenceHints[refKey];
    if(!raw) return { procedure: '', executionNo: '', sort: '' };
    if(typeof raw === 'string'){
      return { procedure: raw, executionNo: '', sort: '' };
    }
    return {
      procedure: String(raw.procedure || '').trim(),
      executionNo: String(raw.executionNo || '').trim(),
      sort: String(raw.sort || '').trim()
    };
  };
  const opts = (options && typeof options === 'object' && !Array.isArray(options)) ? options : {};
  const importFileName = String(opts.importFileName || '').trim() || 'Import Excel';
  const importDossiers = opts.importDossiers !== false;
  const importAudiences = opts.importAudiences !== false;
  const audienceOnlyMode = String(opts.audienceMode || '').trim().toLowerCase() === 'audience-only';
  const clearAudienceOnDossierOnly = opts.clearAudienceOnDossierOnly === true;
  const allowedDossierProcedureSet = opts.allowedDossierProcedureSet instanceof Set
    ? opts.allowedDossierProcedureSet
    : null;
  const globalImportEntry = importDossiers ? createImportHistoryEntry('global', importFileName) : null;
  const audienceImportEntry = importAudiences ? createImportHistoryEntry('audience', importFileName) : null;
  const audienceOperationMap = new Map();
  setSyncStatus('syncing', 'Import Excel en cours...');
  try{

  const resetAudienceDataForGlobalImport = ()=>{
    AppState.clients.forEach(client=>{
      (Array.isArray(client?.dossiers) ? client.dossiers : []).forEach(dossier=>{
        if(!dossier || typeof dossier !== 'object') return;
        if(!dossier.procedureDetails || typeof dossier.procedureDetails !== 'object') return;
        Object.entries(dossier.procedureDetails).forEach(([procName, details])=>{
          if(!isAudienceProcedure(procName)) return;
          if(!details || typeof details !== 'object') return;
          delete details.audience;
          delete details.juge;
          delete details.sort;
          delete details.tribunal;
          delete details.depotLe;
          delete details.dateDepot;
          delete details.color;
          delete details.instruction;
          delete details._missingGlobal;
          delete details._refClientMismatch;
          delete details._refClientProvided;
          delete details._refClientExpected;
          delete details._refClientExpectedOptions;
        });
      });
    });
    audienceDraft = {};
    audiencePrintSelection = new Set();
  };

  // Keep Audience data by default so "Audience -> Global" reconciliation can match
  // orphan audience rows when global dossiers are imported later.
  // Legacy reset behavior can be forced with clearAudienceOnDossierOnly=true.
  if(importDossiers && !importAudiences && clearAudienceOnDossierOnly){
    resetAudienceDataForGlobalImport();
  }

  if(importDossiers && !dossiers.length){
    alert('Aucune ligne de dossier trouvée. Vérifiez les colonnes Excel (ex: Client/Ref client, Débiteur, Procédure/Type).');
    return;
  }
  if(!importDossiers && !audiences.length){
    alert('Aucune ligne audience trouvée. Vérifiez les colonnes Excel (ex: Réf dossier, Audience, Juge, Sort, Tribunal).');
    return;
  }

  const importSkippedRows = [];
  const importWarningRows = [];
  const importInfoRows = [];
  const knownProcedureSet = new Set(['ASS', 'Restitution', 'Commandement', 'Nantissement', 'Redressement', 'Vérification de créance', 'Liquidation judiciaire', 'SFDC', 'S/bien', 'Injonction']);
  const defaultDossierProceduresWhenMissing = ['ASS', 'Restitution', 'SFDC'];
  let importedDossiersCount = 0;
  let skippedDossiersCount = 0;
  let linkedAudiencesCount = 0;
  let skippedAudiencesCount = 0;
  const audienceImportSlotMap = new Map();
  const addSkippedImportIssue = (message)=>{
    const text = String(message || '').trim();
    if(text) importSkippedRows.push(text);
  };
  const addWarningImportIssue = (message)=>{
    const text = String(message || '').trim();
    if(text) importWarningRows.push(text);
  };
  const addInfoImportIssue = (message)=>{
    const text = String(message || '').trim();
    if(text) importInfoRows.push(text);
  };

  const clientMap = new Map();
  AppState.clients.forEach(c=>clientMap.set(String(c.name || '').trim().toLowerCase(), c));

  const refToProcMap = new Map();
  const refToStateProcMap = new Map();
  const dossierRefClientSet = new Set();
  const rowRefClientToProcMap = new Map();
  const audienceOrphanDossierMap = new Map();
  const candidateSeenByMap = new WeakMap();
  const dossierAudienceRefsCache = new WeakMap();
  const dossierClientRefMatchCache = new WeakMap();

  const getDossierAudienceRefsCached = (dossier)=>{
    if(!dossier || typeof dossier !== 'object') return new Set();
    const cached = dossierAudienceRefsCache.get(dossier);
    if(cached) return cached;
    const refs = getDossierAudienceReferenceKeys(dossier);
    dossierAudienceRefsCache.set(dossier, refs);
    return refs;
  };

  const getDossierClientRefMatchKeysCached = (dossier)=>{
    if(!dossier || typeof dossier !== 'object') return new Set();
    const cached = dossierClientRefMatchCache.get(dossier);
    if(cached) return cached;
    const refs = getDossierClientReferenceMatchKeys(dossier);
    dossierClientRefMatchCache.set(dossier, refs);
    return refs;
  };

  const pushCandidate = (map, key, candidate)=>{
    if(!key) return;
    if(!map.has(key)) map.set(key, []);
    const arr = map.get(key);
    let seen = candidateSeenByMap.get(arr);
    if(!seen){
      seen = new Set();
      candidateSeenByMap.set(arr, seen);
    }
    const signature = `${candidate.client?.id || ''}::${candidate.proc || ''}::${candidate.rowRefClient || ''}::${candidate.rowDebiteur || ''}`;
    if(seen.has(signature)) return;
    seen.add(signature);
    arr.push(candidate);
  };

  const formatProcedureContextFromText = (procedureText)=>{
    const parsed = parseProcedureList(procedureText);
    if(parsed.length) return parsed.join(', ');
    const raw = String(procedureText || '').trim();
    return raw || 'non déterminée';
  };

  const formatProcedureContextFromCandidates = (candidates)=>{
    const set = new Set((candidates || []).map(c=>String(c?.proc || '').trim()).filter(Boolean));
    return set.size ? [...set].join(', ') : 'non déterminée';
  };

  const buildIssueContext = ({ source = '', zone = '', procedure = '' } = {})=>{
    const parts = [];
    if(source) parts.push(`Source: ${source}`);
    if(zone) parts.push(`Zone: ${zone}`);
    if(procedure) parts.push(`Procédure: ${procedure}`);
    return parts.length ? ` | ${parts.join(' | ')}` : '';
  };

  const getOrCreateAudienceOrphanClient = ()=>{
    const key = AUDIENCE_ORPHAN_CLIENT_NAME.toLowerCase();
    let client = clientMap.get(key);
    if(client) return client;
    client = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      name: AUDIENCE_ORPHAN_CLIENT_NAME,
      dossiers: []
    };
    AppState.clients.push(client);
    clientMap.set(key, client);
    grantCurrentViewerAccessToClient(client.id);
    if(audienceImportEntry){
      audienceImportEntry.createdOrphanClientIds.push(Number(client.id));
    }
    return client;
  };

  const buildAudienceOrphanDossierKey = (refKey, row, options = {})=>{
    const safeRef = String(refKey || '').trim();
    const safeRefClient = getClientReferenceMatchKeys(String(row?.refClient || '').trim())[0]
      || normalizeReferenceValue(String(row?.refClient || '').trim());
    const safeDebiteur = String(row?.debiteur || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    if(options.forceUnique){
      const batchId = String(audienceImportEntry?.id || '').trim();
      const rowKey = Number.isFinite(Number(row?.rowNumber))
        ? `row-${Number(row.rowNumber)}`
        : `stamp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return `${safeRef}::${safeRefClient}::${safeDebiteur}::${batchId}::${rowKey}`;
    }
    return `${safeRef}::${safeRefClient}::${safeDebiteur}`;
  };

  const getOrCreateAudienceOrphanDossier = (refKey, row, preferredProc = 'ASS', options = {})=>{
    const key = buildAudienceOrphanDossierKey(refKey, row, options);
    const normalizedPreferredProc = parseProcedureToken(preferredProc || '') || 'ASS';
    if(audienceOrphanDossierMap.has(key)){
      const existing = audienceOrphanDossierMap.get(key);
      if(!existing.procedureDetails[normalizedPreferredProc]){
        existing.procedureDetails[normalizedPreferredProc] = { _missingGlobal: true };
      }else{
        existing.procedureDetails[normalizedPreferredProc]._missingGlobal = true;
      }
      const nextProcedures = normalizeProcedures(existing);
      existing.procedureList = nextProcedures;
      existing.procedure = nextProcedures.join(', ');
      return existing;
    }

    const orphanClient = getOrCreateAudienceOrphanClient();
    const rowRefClient = String(row?.refClient || '').trim();
    const rowDebiteur = String(row?.debiteur || '').trim();
    const dossier = {
      importUid: createImportTrackingId('dossier'),
      createdAt: new Date().toISOString(),
      debiteur: rowDebiteur || '-',
      nRef: '',
      boiteNo: '',
      referenceClient: rowRefClient || String(row?.refDossier || '').trim(),
      importAudienceBatchId: audienceImportEntry ? audienceImportEntry.id : '',
      isAudienceOrphanImport: true,
      dateAffectation: '',
      gestionnaire: '',
      procedure: normalizedPreferredProc,
      procedureList: [normalizedPreferredProc],
      procedureDetails: {
        [normalizedPreferredProc]: { _missingGlobal: true }
      },
      ville: '',
      adresse: '',
      montant: '',
      montantByProcedure: [],
      ww: '',
      marque: '',
      type: '',
      note: '',
      avancement: '',
      statut: 'En cours',
      files: []
    };
    orphanClient.dossiers.push(dossier);
    audienceOrphanDossierMap.set(key, dossier);
    if(audienceImportEntry){
      audienceImportEntry.createdOrphanDossierUids.push(dossier.importUid);
    }
    return dossier;
  };

  const importAudienceIssueAsOrphanRow = (row, preferredProc = 'ASS', issueMessage = '')=>{
    const normalizedPreferredProc = parseProcedureToken(preferredProc || '') || 'ASS';
    const fallbackRef = String(row?.refDossier || '').trim();
    const fallbackRefKey = normalizeReferenceForAudienceLookup(fallbackRef)
      || `__audience_issue__${String(audienceImportEntry?.id || 'local').trim()}::${Number.isFinite(Number(row?.rowNumber)) ? Number(row.rowNumber) : Date.now()}`;
    const orphanDossier = getOrCreateAudienceOrphanDossier(fallbackRefKey, row, normalizedPreferredProc, { forceUnique: true });
    if(!orphanDossier.procedureDetails) orphanDossier.procedureDetails = {};
    if(!orphanDossier.procedureDetails[normalizedPreferredProc]){
      orphanDossier.procedureDetails[normalizedPreferredProc] = {};
    }
    recordAudienceImportOperation(orphanDossier, normalizedPreferredProc);
    const p = orphanDossier.procedureDetails[normalizedPreferredProc];
    p._missingGlobal = true;
    p._audienceImportErrorMessage = String(issueMessage || '').trim();
    p._audienceImportBatchId = audienceImportEntry ? audienceImportEntry.id : '';
    if(fallbackRef || !String(p.referenceClient || '').trim()) p.referenceClient = fallbackRef;
    const audienceRaw = String(row?.audience || '').trim();
    if(audienceRaw){
      p.audience = normalizeDateDDMMYYYY(audienceRaw) || audienceRaw;
    }
    if(row?.juge) p.juge = row.juge;
    if(row?.sort) p.sort = row.sort;
    if(row?.tribunal) p.tribunal = row.tribunal;
    const dateDepotRaw = String(row?.dateDepot || '').trim();
    if(dateDepotRaw){
      p.depotLe = normalizeDateDDMMYYYY(dateDepotRaw) || dateDepotRaw;
    }
    const importedOrdonnanceStatus = normalizeDiligenceOrdonnance(row?.sortOrd || '');
    if(row?.hasSortOrdColumn === true){
      p._audienceSortOrd = String(row?.sortOrd || '').trim();
    }
    if(importedOrdonnanceStatus === 'att') p.attOrdOrOrdOk = 'att ord';
    if(importedOrdonnanceStatus === 'ok') p.attOrdOrOrdOk = 'ord ok';
    if(row?.hasStatutColumn === true){
      const importedStatus = normalizeImportedDossierStatus(row?.statutRaw || '');
      orphanDossier.statut = importedStatus.statut || orphanDossier.statut || 'En cours';
      orphanDossier.statutDetails = importedStatus.detail || '';
    }
    const normalizedProcedures = normalizeProcedures(orphanDossier);
    orphanDossier.procedureList = normalizedProcedures;
    orphanDossier.procedure = normalizedProcedures.join(', ');
    dossierAudienceRefsCache.delete(orphanDossier);
    dossierClientRefMatchCache.delete(orphanDossier);
    return {
      dossier: orphanDossier,
      client: getOrCreateAudienceOrphanClient(),
      proc: normalizedPreferredProc,
      rowRefClient: getClientReferenceMatchKeys(String(row?.refClient || '').trim())[0]
        || normalizeReferenceValue(String(row?.refClient || '').trim()),
      rowDebiteur: String(row?.debiteur || '').trim().toLowerCase()
    };
  };

  const recordAudienceImportOperation = (dossier, procKey)=>{
    if(!audienceImportEntry || !dossier || typeof dossier !== 'object') return;
    const dossierUid = ensureDossierImportUid(dossier);
    const normalizedProcKey = String(procKey || '').trim();
    if(!dossierUid || !normalizedProcKey) return;
    const opKey = `${dossierUid}::${normalizedProcKey}`;
    if(audienceOperationMap.has(opKey)) return;
    const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
      ? dossier.procedureDetails
      : {};
    const beforeProc = details[normalizedProcKey] && typeof details[normalizedProcKey] === 'object'
      ? JSON.parse(JSON.stringify(details[normalizedProcKey]))
      : null;
    const op = { dossierUid, procKey: normalizedProcKey, beforeProc };
    audienceOperationMap.set(opKey, op);
    audienceImportEntry.operations.push(op);
  };

  const registerFallbackFromDossier = (client, dossier)=>{
    if(dossier?.isAudienceOrphanImport) return;
    const rowDebiteur = String(dossier?.debiteur || '').trim().toLowerCase();
    const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
      ? dossier.procedureDetails
      : {};
    const detailProcRefs = [];
    const refKeyToProcSet = new Map();
    const pushRefProc = (refValue, procValue)=>{
      const refKey = normalizeReferenceForAudienceLookup(refValue);
      const procKey = String(procValue || '').trim();
      if(!refKey || !procKey) return;
      if(!refKeyToProcSet.has(refKey)) refKeyToProcSet.set(refKey, new Set());
      refKeyToProcSet.get(refKey).add(procKey);
    };
    Object.entries(details).forEach(([procName, procDetails])=>{
      const proc = String(procName || '').trim() || 'ASS';
      const refs = splitReferenceValues(procDetails?.referenceClient || '');
      refs.forEach(ref=>{
        detailProcRefs.push({ ref, proc });
        pushRefProc(ref, proc);
      });
    });

    const mainRefs = splitReferenceValues(dossier?.referenceClient || '');
    const allRefs = [];
    if(mainRefs.length){
      mainRefs.forEach(ref=>allRefs.push({ ref, proc: '' }));
    }else{
      const fallbackRef = String(dossier?.referenceClient || '').trim();
      if(fallbackRef) allRefs.push({ ref: fallbackRef, proc: '' });
    }
    detailProcRefs.forEach(item=>allRefs.push(item));

    const detailProcs = Object.keys(details).filter(Boolean);
    const procList = detailProcs.length
      ? detailProcs
      : (Array.isArray(dossier?.procedureList) && dossier.procedureList.length
        ? dossier.procedureList
        : String(dossier?.procedure || '').split(',').map(v=>String(v || '').trim()).filter(Boolean));
    const defaultProc = procList[0] || 'ASS';
    const procCandidates = procList.length ? procList : [defaultProc];
    const mainRefParts = getClientReferenceMatchKeys(dossier?.referenceClient || '');
    const rowRefClient = mainRefParts[0] || normalizeReferenceValue(String(dossier?.referenceClient || '').trim());

    // Dossier-level reference is ambiguous when multiple procedures exist:
    // map it to a single procedure only when there is exactly one candidate.
    if(mainRefs.length === 1 && procCandidates.length === 1){
      pushRefProc(mainRefs[0], procCandidates[0]);
    }

    allRefs.forEach(({ ref, proc })=>{
      const refKey = normalizeReferenceForAudienceLookup(ref);
      if(!refKey) return;
      getClientReferenceMatchKeys(ref).forEach(key=>dossierRefClientSet.add(key));
      pushCandidate(rowRefClientToProcMap, refKey, {
        dossier,
        client,
        proc: String(proc || '').trim() || defaultProc,
        rowRefClient: refKey,
        rowDebiteur
      });
    });

    const refKeys = getDossierAudienceReferenceKeys(dossier);
    refKeys.forEach(refKey=>{
      const mappedProcs = refKeyToProcSet.has(refKey)
        ? [...refKeyToProcSet.get(refKey)]
        : procCandidates;
      mappedProcs.forEach(proc=>{
        pushCandidate(refToStateProcMap, refKey, {
          dossier,
          client,
          proc: String(proc || '').trim() || defaultProc,
          rowRefClient,
          rowDebiteur
        });
      });
    });
  };

  AppState.clients.forEach(client=>{
    (Array.isArray(client?.dossiers) ? client.dossiers : []).forEach(dossier=>{
      registerFallbackFromDossier(client, dossier);
    });
  });

  const getCandidatesByRefDossier = (targetRefKey)=>refToStateProcMap.get(targetRefKey) || [];
  const normalizeAudienceDepotDateValue = (value)=>{
    const raw = String(value || '').trim();
    if(!raw) return '';
    return normalizeDateDDMMYYYY(raw) || raw;
  };
  const getProcedureReferenceKeys = (details)=>{
    if(!details || typeof details !== 'object') return [];
    return splitReferenceValues(details.referenceClient || '')
      .map(v=>normalizeReferenceForAudienceLookup(v))
      .filter(Boolean);
  };
  const resolveAudienceDepotDateForRef = (dossier, refKey, targetProc, importedValue = '')=>{
    const importedDepotDate = normalizeAudienceDepotDateValue(importedValue);
    if(importedDepotDate) return importedDepotDate;
    const targetDetails = dossier?.procedureDetails?.[targetProc];
    const targetDepotDate = normalizeAudienceDepotDateValue(targetDetails?.depotLe || targetDetails?.dateDepot || '');
    if(targetDepotDate) return targetDepotDate;
    const detailsMap = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
      ? dossier.procedureDetails
      : {};
    for(const details of Object.values(detailsMap)){
      if(!getProcedureReferenceKeys(details).includes(refKey)) continue;
      const existingDepotDate = normalizeAudienceDepotDateValue(details?.depotLe || details?.dateDepot || '');
      if(existingDepotDate) return existingDepotDate;
    }
    return '';
  };
  const propagateAudienceDepotDateForRef = (dossier, refKey, depotDate)=>{
    const resolvedDepotDate = normalizeAudienceDepotDateValue(depotDate);
    if(!resolvedDepotDate) return '';
    const detailsMap = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
      ? dossier.procedureDetails
      : {};
    Object.values(detailsMap).forEach((details)=>{
      if(!details || typeof details !== 'object') return;
      if(!getProcedureReferenceKeys(details).includes(refKey)) return;
      const currentDepotDate = normalizeAudienceDepotDateValue(details.depotLe || details.dateDepot || '');
      if(currentDepotDate) return;
      details.depotLe = resolvedDepotDate;
    });
    return resolvedDepotDate;
  };

  if(importDossiers){
    const reportDossiersProgress = makeProgressReporter('Import Excel - dossiers');
    await runChunked(dossiers, async (row)=>{
    const rowNumberLabel = Number.isFinite(Number(row?.rowNumber)) ? `Ligne ${Number(row.rowNumber)}` : 'Ligne ?';
    const dossierProcedureContext = formatProcedureContextFromText(row?.procedureText || '');
    const dossierContext = buildIssueContext({
      source: 'Dossiers',
      zone: 'Dossiers globaux',
      procedure: dossierProcedureContext
    });
    const rawProcedureTokens = String(row?.procedureText || '')
      .split(/[+,]/)
      .map(v=>String(v || '').trim())
      .filter(Boolean);
    const normalizedProcedureTokens = rawProcedureTokens.map(v=>parseProcedureToken(v));
    const unknownProcedureTokens = rawProcedureTokens.filter((raw, idx)=>!knownProcedureSet.has(normalizedProcedureTokens[idx]));
    if(unknownProcedureTokens.length){
      addWarningImportIssue(`${rowNumberLabel}: procédure inconnue (${unknownProcedureTokens.join(', ')})${dossierContext}`);
    }
    const clientName = row.clientName || row.debiteur || 'Client';
    const clientKey = String(clientName).trim().toLowerCase();
    let client = clientMap.get(clientKey);
    if(!client){
      client = { id: Date.now() + Math.floor(Math.random() * 100000), name: clientName, dossiers: [] };
      AppState.clients.push(client);
      clientMap.set(clientKey, client);
      if(globalImportEntry){
        globalImportEntry.createdClientIds.push(Number(client.id));
      }
    }
    grantCurrentViewerAccessToClient(client.id);

    const parsedProceduresRaw = parseProcedureList(row.procedureText);
    const parsedKnownProcedures = parsedProceduresRaw.filter(proc=>knownProcedureSet.has(proc));
    const parsedProcedures = parsedKnownProcedures.length
      ? parsedKnownProcedures
      : defaultDossierProceduresWhenMissing.slice();
    const movedToAudience = allowedDossierProcedureSet
      ? parsedProcedures.filter(proc=>!allowedDossierProcedureSet.has(proc))
      : [];
    if(movedToAudience.length){
      addWarningImportIssue(`${rowNumberLabel}: procédures déplacées vers import Audience (${movedToAudience.join(', ')})${dossierContext}`);
    }
    const procedures = allowedDossierProcedureSet
      ? parsedProcedures.filter(proc=>allowedDossierProcedureSet.has(proc))
      : parsedProcedures;
    if(!procedures.length){
      skippedDossiersCount += 1;
      addSkippedImportIssue(`${rowNumberLabel}: dossier ignoré (aucune procédure valide) - Ref client "${row.refClient || '-'}", Débiteur "${row.debiteur || '-'}"${dossierContext}`);
      return;
    }
    const procedureDetails = {};
    const rowMontant = String(row.montant || '').trim();
    const rowMontantExtra = String(row.montantExtra || '').trim();
    const carriedMontant = String(row.carriedMontant || '').trim();
    const rowDateAffectation = String(row.dateAffectation || '').trim();
    const rowDateAffectationExtra = String(row.dateAffectationExtra || '').trim();
    const carriedAffectationDate = String(row.carriedAffectationDate || '').trim();
    const primaryMontant = carriedMontant || rowMontant;
    const secondaryMontantCandidate = carriedMontant ? rowMontant : rowMontantExtra;
    const primaryDateCandidate = carriedAffectationDate || rowDateAffectation;
    const secondaryDateCandidate = carriedAffectationDate ? rowDateAffectation : rowDateAffectationExtra;
    const principalMontant = primaryMontant;
    const importedStatus = normalizeImportedDossierStatus(row.statutRaw || '');

    const dossier = {
      importUid: createImportTrackingId('dossier'),
      importGlobalBatchId: globalImportEntry ? globalImportEntry.id : '',
      createdAt: new Date().toISOString(),
      debiteur: row.debiteur,
      nRef: String(row.nRef || '').trim(),
      boiteNo: row.boiteNo || '',
      referenceClient: row.refClient || row.refAssignation || row.refRestitution || row.refSfdc || row.refInjonction || '',
      dateAffectation: rowDateAffectation || '',
      gestionnaire: String(row.gestionnaire || '').trim(),
      procedure: procedures.join(', '),
      procedureList: procedures.slice(),
      procedureDetails,
      ville: row.ville,
      adresse: row.adresse,
      caution: row.caution || '',
      cautionAdresse: row.cautionAdresse || '',
      cautionVille: row.cautionVille || '',
      cautionCin: row.cautionCin || '',
      cautionRc: row.cautionRc || '',
      efNumber: row.efNumber || '',
      conservation: row.conservation || '',
      metrage: row.metrage || '',
      montant: principalMontant,
      montantByProcedure: [],
      ww: row.immatriculation,
      marque: row.marque,
      type: row.type,
      note: '',
      avancement: '',
      statut: importedStatus.statut || 'En cours',
      statutDetails: importedStatus.detail || '',
      files: []
    };

    const procedureSet = new Set(procedures);
    const setProcRef = (proc, ref)=>{
      const refText = String(ref || '').trim();
      const refKey = normalizeReferenceForAudienceLookup(refText);
      if(!refKey) return;
      dossierRefClientSet.add(refKey);
      const keepProcedureInDossier = !allowedDossierProcedureSet || allowedDossierProcedureSet.has(proc);
      if(keepProcedureInDossier){
        if(!dossier.procedureDetails[proc]) dossier.procedureDetails[proc] = {};
        dossier.procedureDetails[proc].referenceClient = refText;
        if(!procedureSet.has(proc)){
          procedureSet.add(proc);
        }
      }
      const baseRowRefClientKeys = getClientReferenceMatchKeys(row.refClient || '');
      const baseRowRefClient = baseRowRefClientKeys[0] || normalizeReferenceValue(row.refClient || '');
      const candidate = {
        dossier,
        client,
        proc,
        rowRefClient: baseRowRefClient,
        rowDebiteur: String(row.debiteur || '').trim().toLowerCase()
      };
      pushCandidate(refToProcMap, refKey, candidate);
      if(!baseRowRefClientKeys.length && baseRowRefClient){
        pushCandidate(rowRefClientToProcMap, baseRowRefClient, candidate);
        dossierRefClientSet.add(baseRowRefClient);
      }else{
        baseRowRefClientKeys.forEach(key=>{
          pushCandidate(rowRefClientToProcMap, key, { ...candidate, rowRefClient: key });
          dossierRefClientSet.add(key);
        });
      }
    };

    const resolveProcedureReference = (proc, explicitRefValue)=>{
      const explicitRef = String(explicitRefValue || '').trim();
      return explicitRef;
    };

    const assReference = resolveProcedureReference('ASS', row.refAssignation);
    const restitutionReference = resolveProcedureReference('Restitution', row.refRestitution);
    const sfdcReference = resolveProcedureReference('SFDC', row.refSfdc);
    const injonctionReference = resolveProcedureReference('Injonction', row.refInjonction);

    setProcRef('ASS', assReference);
    setProcRef('Restitution', restitutionReference);
    setProcRef('SFDC', sfdcReference);
    setProcRef('Injonction', injonctionReference);
    const executionNoValue = String(row.executionNo || '').trim();
    const importedDateDepotValue = normalizeDateDDMMYYYY(row.dateDepot || '') || String(row.dateDepot || '').trim();
    const notificationSortValue = String(row.notificationSort || '').trim();
    const notificationNoValue = String(row.notificationNo || '').trim();
    const sortValue = String(row.sortExecution || row.sort || '').trim();
    const importedOrdonnanceStatus = normalizeDiligenceOrdonnance(row.sortOrd || '');
    const tribunalValue = String(row.tribunal || '').trim();
    const assignProcedureMeta = (proc, refValue)=>{
      if(
        !(
          executionNoValue
          || importedDateDepotValue
          || sortValue
          || tribunalValue
          || ((proc === 'SFDC' || proc === 'Injonction') && importedOrdonnanceStatus)
          || (proc === 'Injonction' && (notificationSortValue || notificationNoValue))
        )
      ) return;
      if(!procedureSet.has(proc)) return;
      if(!dossier.procedureDetails[proc]) dossier.procedureDetails[proc] = {};
      if(String(refValue || '').trim() && !String(dossier.procedureDetails[proc].referenceClient || '').trim()){
        dossier.procedureDetails[proc].referenceClient = String(refValue || '').trim();
      }
      if(executionNoValue) dossier.procedureDetails[proc].executionNo = executionNoValue;
      if(importedDateDepotValue) dossier.procedureDetails[proc].dateDepot = importedDateDepotValue;
      if(sortValue) dossier.procedureDetails[proc].sort = sortValue;
      if(tribunalValue) dossier.procedureDetails[proc].tribunal = tribunalValue;
      if((proc === 'SFDC' || proc === 'Injonction') && importedOrdonnanceStatus){
        dossier.procedureDetails[proc].attOrdOrOrdOk = importedOrdonnanceStatus === 'ok' ? 'ord ok' : 'att ord';
      }
      if(proc === 'Injonction' && notificationSortValue) dossier.procedureDetails[proc].notificationSort = notificationSortValue;
      if(proc === 'Injonction' && notificationNoValue) dossier.procedureDetails[proc].notificationNo = notificationNoValue;
    };
    assignProcedureMeta('SFDC', sfdcReference);
    assignProcedureMeta('Injonction', injonctionReference);
    const normalizedImportedProcs = [...procedureSet];
    // Keep Excel procedure order as the source of truth.
    // Any extra procedures discovered from references are appended after.
    const excelOrderedProcs = (parsedProcedures && parsedProcedures.length ? parsedProcedures : procedures).slice();
    const extraImportedProcs = normalizedImportedProcs.filter(proc=>!excelOrderedProcs.includes(proc));
    const orderedImportedProcs = [...excelOrderedProcs, ...extraImportedProcs];
    const normalizedPrimaryDate = normalizeDateDDMMYYYY(primaryDateCandidate) || primaryDateCandidate;
    const normalizedSecondaryDate = normalizeDateDDMMYYYY(secondaryDateCandidate) || secondaryDateCandidate;
    const hasDualDates = orderedImportedProcs.length > 1
      && !!normalizedPrimaryDate
      && !!normalizedSecondaryDate
      && normalizedPrimaryDate !== normalizedSecondaryDate;
    // Split montants only when there are truly two affectation dates.
    const hasDualMontants = hasDualDates && orderedImportedProcs.length > 1 && !!primaryMontant && !!secondaryMontantCandidate;

    orderedImportedProcs.forEach((proc, idx)=>{
      if(!dossier.procedureDetails[proc]) dossier.procedureDetails[proc] = {};
      if(importedDateDepotValue && !String(dossier.procedureDetails[proc].dateDepot || '').trim()){
        dossier.procedureDetails[proc].dateDepot = importedDateDepotValue;
      }
      let procDate = normalizedPrimaryDate || normalizedSecondaryDate;
      if(hasDualDates){
        procDate = idx === 0
          ? normalizedPrimaryDate
          : normalizedSecondaryDate;
      }
      if(procDate && !String(dossier.procedureDetails[proc].dateDepot || '').trim()){
        dossier.procedureDetails[proc].dateDepot = procDate;
      }
    });

    const montantGroupSeed = [];
    const resolvedPrincipalMontant = hasDualMontants
      ? primaryMontant
      : (primaryMontant || secondaryMontantCandidate);
    if(hasDualMontants && orderedImportedProcs.length){
      const now = Date.now();
      montantGroupSeed.push({
        id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        montant: primaryMontant,
        procedures: [orderedImportedProcs[0]]
      });
      const secondaryProcedures = orderedImportedProcs.slice(1);
      if(secondaryProcedures.length){
        montantGroupSeed.push({
          id: `${now + 1}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: now + 1,
          montant: secondaryMontantCandidate,
          procedures: secondaryProcedures
        });
      }
    }
    dossier.montant = resolvedPrincipalMontant;
    dossier.montantByProcedure = normalizeProcedureMontantGroups(
      montantGroupSeed,
      orderedImportedProcs,
      resolvedPrincipalMontant || ''
    );
    dossier.dateAffectation = hasDualDates
      ? normalizedPrimaryDate
      : (normalizedPrimaryDate || normalizedSecondaryDate || '');
    dossier.procedureList = orderedImportedProcs;
    dossier.procedure = orderedImportedProcs.join(', ');

    client.dossiers.push(dossier);
    if(globalImportEntry){
      globalImportEntry.createdDossierUids.push(dossier.importUid);
    }
    registerFallbackFromDossier(client, dossier);
    importedDossiersCount += 1;
    }, { chunkSize: IMPORT_EXCEL_CHUNK_SIZE, onProgress: reportDossiersProgress });
  }

  if(importAudiences){
    const reportAudiencesProgress = makeProgressReporter('Import Excel - audiences');
    await runChunked(audiences, async (row)=>{
    const rowNumberLabel = Number.isFinite(Number(row?.rowNumber)) ? `Ligne ${Number(row.rowNumber)}` : 'Ligne ?';
    const audienceBaseContext = buildIssueContext({
      source: 'Audience',
      zone: 'Import audience'
    });
    const ref = String(row.refDossier || '').trim();
    const refKey = normalizeReferenceForAudienceLookup(ref);
    const hint = getReferenceHint(refKey);
    const hintedProc = parseProcedureToken(hint.procedure || '');
    const explicitProcRaw = String(row?.procedureText || '').trim();
    const explicitProc = explicitProcRaw ? parseProcedureToken(explicitProcRaw) : '';
    const preferredIssueProc = explicitProc && knownProcedureSet.has(explicitProc)
      ? explicitProc
      : (hintedProc && knownProcedureSet.has(hintedProc) ? hintedProc : 'ASS');
    if(!refKey){
      const issueMessage = 'Ref dossier vide dans fichier audience';
      importAudienceIssueAsOrphanRow(row, preferredIssueProc, issueMessage);
      linkedAudiencesCount += 1;
      addWarningImportIssue(`${rowNumberLabel}: ${issueMessage} (ajouté à Audience, ligne marquée en rouge)${audienceBaseContext}`);
      return;
    }
    const normalizedAudienceDate = normalizeDateDDMMYYYY(row.audience || '');
    if(String(row.audience || '').trim() && !normalizedAudienceDate){
      addWarningImportIssue(`${rowNumberLabel}: date audience invalide "${row.audience}" (format attendu jj/mm/aaaa)${audienceBaseContext}`);
    }
    if(explicitProcRaw && !knownProcedureSet.has(explicitProc)){
      const issueMessage = `Procédure audience inconnue: ${explicitProcRaw}`;
      importAudienceIssueAsOrphanRow(row, 'ASS', issueMessage);
      linkedAudiencesCount += 1;
      addWarningImportIssue(`${rowNumberLabel}: ${issueMessage} (ajouté à Audience, ligne marquée en rouge)${audienceBaseContext}`);
      return;
    }
    const rowRefClientKeys = getClientReferenceMatchKeys(row.refClient || '');
    const rowRefClientKeySet = new Set(rowRefClientKeys);
    const candidatesByRefDossier = refToProcMap.get(refKey) || [];
    const procByRefDossier = formatProcedureContextFromCandidates(candidatesByRefDossier);
    const missingRefContext = buildIssueContext({
      source: 'Audience',
      zone: 'Dossiers globaux',
      procedure: procByRefDossier
    });
    const byGlobalScan = getCandidatesByRefDossier(refKey);
    let candidates = [];
    const mergedCandidateSeen = new Set();
    [...candidatesByRefDossier, ...byGlobalScan].forEach(candidate=>{
      const signature = `${candidate?.client?.id || ''}::${candidate?.proc || ''}::${candidate?.rowRefClient || ''}::${candidate?.rowDebiteur || ''}`;
      if(mergedCandidateSeen.has(signature)) return;
      mergedCandidateSeen.add(signature);
      candidates.push(candidate);
    });
    if(!candidates.length){
      const fallback = [];
      const fallbackSeen = new Set();
      rowRefClientKeys.forEach(key=>{
        const items = rowRefClientToProcMap.get(key) || [];
        items.forEach(item=>{
          const signature = `${item.client?.id || ''}::${item.proc || ''}::${item.rowRefClient || ''}::${item.rowDebiteur || ''}`;
          if(fallbackSeen.has(signature)) return;
          fallbackSeen.add(signature);
          fallback.push(item);
        });
      });
      if(!fallback.length){
        const procFallback = explicitProc && knownProcedureSet.has(explicitProc)
          ? explicitProc
          : (hintedProc && knownProcedureSet.has(hintedProc) ? hintedProc : 'ASS');
        if(audienceOnlyMode && !isAudienceProcedure(procFallback)){
          const issueMessage = `Procédure "${procFallback}" ignorée pour import Audience`;
          importAudienceIssueAsOrphanRow(row, 'ASS', issueMessage);
          linkedAudiencesCount += 1;
          addWarningImportIssue(`${rowNumberLabel}: ${issueMessage} (ajouté à Audience, ligne marquée en rouge)${audienceBaseContext}`);
          return;
        }
        const orphanDossier = getOrCreateAudienceOrphanDossier(refKey, row, procFallback, { forceUnique: true });
        candidates = [{
          dossier: orphanDossier,
          client: getOrCreateAudienceOrphanClient(),
          proc: procFallback,
          rowRefClient: getClientReferenceMatchKeys(String(row?.refClient || '').trim())[0]
            || normalizeReferenceValue(String(row?.refClient || '').trim()),
          rowDebiteur: String(row?.debiteur || '').trim().toLowerCase()
        }];
        addWarningImportIssue(`${rowNumberLabel}: ${ref || '-'} introuvable dans dossier global (ajouté à Audience, ligne marquée en rouge)${missingRefContext}`);
      }else{
        candidates = fallback;
      }
      // Fallback by ref client is a successful link path, not an import error.
    }
    const rowDebiteur = String(row.debiteur || '').trim().toLowerCase();
    let match = null;
    const candidatePool = hintedProc
      ? candidates.filter(c=>String(c?.proc || '').trim() === hintedProc)
      : candidates;
    const activeCandidatesRaw = candidatePool.length ? candidatePool : candidates;
    const nonOrphanCandidates = activeCandidatesRaw.filter(c=>!c?.dossier?.isAudienceOrphanImport);
    const activeCandidates = nonOrphanCandidates.length ? nonOrphanCandidates : activeCandidatesRaw;
    if(activeCandidates.length){
      let bestCandidate = null;
      let bestScore = -1;
      activeCandidates.forEach(candidate=>{
        let score = 0;
        if(rowRefClientKeySet.size && rowRefClientKeySet.has(candidate.rowRefClient)) score += 220;
        if(rowDebiteur && candidate.rowDebiteur === rowDebiteur) score += 140;
        const candidateAudienceRefs = getDossierAudienceRefsCached(candidate?.dossier || null);
        const candidateClientRefs = getDossierClientRefMatchKeysCached(candidate?.dossier || null);
        if(candidateAudienceRefs.has(refKey)) score += 90;
        if(rowRefClientKeySet.size && [...rowRefClientKeySet].some(key=>candidateClientRefs.has(key))) score += 80;
        if(score > bestScore){
          bestScore = score;
          bestCandidate = candidate;
        }
      });
      match = bestCandidate || activeCandidates[0];
    }
    if(!match){
      const issueMessage = `Aucun dossier correspondant trouvé pour Réf dossier "${ref || '-'}"`;
      importAudienceIssueAsOrphanRow(row, preferredIssueProc, issueMessage);
      linkedAudiencesCount += 1;
      addWarningImportIssue(`${rowNumberLabel}: ${issueMessage} (ajouté à Audience, ligne marquée en rouge)${audienceBaseContext}`);
      return;
    }
    const { dossier, proc } = match;
    let refClientMismatch = null;
    if(rowRefClientKeySet.size){
      const matchedDossierRefKeys = getDossierClientRefMatchKeysCached(dossier);
      const hasSameRefClient = [...rowRefClientKeySet].some(key=>matchedDossierRefKeys.has(key));
      const hasKnownRefClientElsewhere = [...rowRefClientKeySet].some(key=>dossierRefClientSet.has(key));
      // Only flag ref client mismatch when the provided ref client is unknown globally.
      // If it exists elsewhere in global dossiers, keep the row linked by ref dossier priority.
      if(!hasSameRefClient && !hasKnownRefClientElsewhere){
        const givenRefClient = [...rowRefClientKeySet].join('/') || '-';
        const expectedRefClient = getDossierClientReferenceDisplayValues(dossier).join('/') || '-';
        refClientMismatch = {
          provided: givenRefClient,
          expected: expectedRefClient
        };
        addWarningImportIssue(
          `${rowNumberLabel}: incohérence ref client pour Réf dossier "${ref || '-'}" et Débiteur "${row.debiteur || '-'}" (fourni: "${givenRefClient}" | dossier global: "${expectedRefClient}")${missingRefContext}`
        );
      }
    }
    let targetProc = explicitProc && knownProcedureSet.has(explicitProc)
      ? explicitProc
      : (hintedProc && knownProcedureSet.has(hintedProc) ? hintedProc : proc);
    if(!targetProc) targetProc = 'ASS';
    if(audienceOnlyMode && !isAudienceProcedure(targetProc)){
      if(explicitProc && !isAudienceProcedure(explicitProc)){
        const issueMessage = `Procédure "${explicitProc}" ignorée pour import Audience`;
        importAudienceIssueAsOrphanRow(row, 'ASS', issueMessage);
        linkedAudiencesCount += 1;
        addWarningImportIssue(`${rowNumberLabel}: ${issueMessage} (ajouté à Audience, ligne marquée en rouge)${audienceBaseContext}`);
        return;
      }
      targetProc = 'ASS';
    }
    const targetDossierUid = ensureDossierImportUid(dossier);
    const audienceSlotKey = `${targetDossierUid || ''}::${String(targetProc || '').trim()}`;
    const existingAudienceSlot = audienceImportSlotMap.get(audienceSlotKey);
    if(existingAudienceSlot){
      const issueMessage = `Même dossier/procédure déjà importé à ${existingAudienceSlot.rowLabel}`;
      importAudienceIssueAsOrphanRow(row, targetProc, issueMessage);
      linkedAudiencesCount += 1;
      addWarningImportIssue(
        `${rowNumberLabel}: ${issueMessage} (ajouté à Audience, ligne marquée en rouge) - Réf dossier "${ref || '-'}", Procédure "${targetProc}", Débiteur "${row.debiteur || '-'}"${audienceBaseContext}`
      );
      return;
    }
    audienceImportSlotMap.set(audienceSlotKey, {
      rowLabel: rowNumberLabel
    });
    if(!dossier.procedureDetails) dossier.procedureDetails = {};
    if(!dossier.procedureDetails[targetProc]) dossier.procedureDetails[targetProc] = {};
    recordAudienceImportOperation(dossier, targetProc);
    const p = dossier.procedureDetails[targetProc];
    if(refClientMismatch){
      p._refClientMismatch = true;
      p._refClientProvided = refClientMismatch.provided;
      p._refClientExpected = refClientMismatch.expected;
    }else{
      delete p._refClientMismatch;
      delete p._refClientProvided;
      delete p._refClientExpected;
    }
    if(!!dossier?.isAudienceOrphanImport){
      p._missingGlobal = true;
    }
    if(ref){
      p.referenceClient = ref;
      dossierAudienceRefsCache.delete(dossier);
    }
    if(normalizedAudienceDate) p.audience = normalizedAudienceDate;
    if(row.juge) p.juge = row.juge;
    if(row.sort) p.sort = row.sort;
    if(row.tribunal) p.tribunal = row.tribunal;
    // Keep "date depot" synchronized across repeated audience imports for the same ref dossier.
    const resolvedAudienceDepotDate = resolveAudienceDepotDateForRef(dossier, refKey, targetProc, row.dateDepot);
    if(resolvedAudienceDepotDate){
      p.depotLe = resolvedAudienceDepotDate;
      propagateAudienceDepotDateForRef(dossier, refKey, resolvedAudienceDepotDate);
    }
    const importedOrdonnanceStatus = normalizeDiligenceOrdonnance(row.sortOrd || '');
    const importedAudienceColor = importedOrdonnanceStatus === 'att'
      ? 'green'
      : (importedOrdonnanceStatus === 'ok' ? 'yellow' : String(row.importedColor || '').trim());
    if(row.hasSortOrdColumn === true){
      p._audienceSortOrd = String(row.sortOrd || '').trim();
      if(importedOrdonnanceStatus){
        delete p._disableAudienceRowColor;
        delete p._suppressAudienceOrdonnanceColor;
        p.color = importedAudienceColor;
      }else if(isAudienceOrdonnanceColorSuppressed(p)){
        p._disableAudienceRowColor = '1';
        p.color = '';
      }else{
        p._disableAudienceRowColor = importedAudienceColor ? '' : '1';
        p.color = importedAudienceColor || '';
      }
    }
    if(importedOrdonnanceStatus === 'att') p.attOrdOrOrdOk = 'att ord';
    if(importedOrdonnanceStatus === 'ok') p.attOrdOrOrdOk = 'ord ok';
    if(row.hasStatutColumn === true){
      const importedStatus = normalizeImportedDossierStatus(row.statutRaw || '');
      dossier.statut = importedStatus.statut || 'En cours';
      dossier.statutDetails = importedStatus.detail || '';
    }
    if(!p.executionNo && hint.executionNo) p.executionNo = hint.executionNo;
    if(!p.sort && hint.sort) p.sort = hint.sort;
    p._audienceImportBatchId = audienceImportEntry ? audienceImportEntry.id : '';
    const normalizedProcedures = normalizeProcedures(dossier);
    dossier.procedureList = normalizedProcedures;
    dossier.procedure = normalizedProcedures.join(', ');
    linkedAudiencesCount += 1;
    }, { chunkSize: IMPORT_EXCEL_CHUNK_SIZE, onProgress: reportAudiencesProgress });
  }

  let reconciledOrphans = 0;
  if(importDossiers){
    const reconciliation = reconcileAudienceOrphanDossiers();
    reconciledOrphans = reconciliation.matchedDossiers;
    if(reconciledOrphans > 0){
      addInfoImportIssue(`Rapprochement automatique: ${reconciledOrphans} dossier(s) audience hors global fusionné(s).`);
    }
  }

  if(globalImportEntry && (importedDossiersCount > 0 || globalImportEntry.createdClientIds.length)){
    globalImportEntry.stats.dossiers = importedDossiersCount;
    saveImportHistoryEntry(globalImportEntry);
  }
  if(audienceImportEntry && (linkedAudiencesCount > 0 || audienceImportEntry.createdOrphanDossierUids.length || audienceImportEntry.operations.length)){
    audienceImportEntry.stats.audiences = linkedAudiencesCount;
    saveImportHistoryEntry(audienceImportEntry);
  }

  handleDossierDataChange({ audience: true });
  await persistAppStateNow();
  refreshPrimaryViews();
  const importDisplaySkipped = importSkippedRows.filter(isExcelImportDisplayError);
  const importDisplayWarnings = importWarningRows.filter(isExcelImportDisplayError);
  const issuesText = buildExcelImportResultDetails({
    skippedIssues: importDisplaySkipped,
    warningIssues: importDisplayWarnings,
    infoIssues: importInfoRows
  });
  const summaryLines = [
    `Import terminé.`,
    `Dossiers détectés: ${dossiers.length}`,
    `Dossiers importés: ${importedDossiersCount}`,
    `Dossiers non importés: ${skippedDossiersCount}`,
    `Audience hors global rapprochée: ${reconciledOrphans}`,
    `Audiences détectées: ${audiences.length}`,
    `Audiences importées: ${linkedAudiencesCount}`,
    `Audiences non importées: ${skippedAudiencesCount}`,
    `Avertissements sur lignes importées: ${importDisplayWarnings.length}`
  ];
  const summary = summaryLines.join('\n');
  closeImportProgressModal(true);
  showExcelImportResult(summary, issuesText);
  }finally{
    // Keep current sync status (persist call already set the right state).
  }
}

async function handleExcelImportFile(file, options = {}){
  if(importInProgress) return;
  if(!file) return;
  if(!canImportData()){
    alert('Accès refusé');
    return;
  }
  const excelReady = await ensureExcelLibraries({ needXlsx: true, needExcelJs: false });
  if(!excelReady){
    return;
  }
  importInProgress = true;
  beginHeavyUiOperation();
  try{
    openImportProgressModal('Import Excel');
    updateImportProgress('Lecture du fichier...', 0, 1);
    setSyncStatus('syncing', 'Import Excel: lecture du fichier...');
    const buffer = await file.arrayBuffer();
    updateImportProgress('Analyse de la feuille...', 1, 3);
    setSyncStatus('syncing', 'Import Excel: analyse de la feuille...');
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellStyles: true });
    const sheetName = workbook.SheetNames[0];
    if(!sheetName){
      throw new Error('Le fichier Excel ne contient aucune feuille.');
    }
    const sheet = workbook.Sheets[sheetName];
    if(!sheet){
      throw new Error('Impossible de lire la première feuille du fichier.');
    }
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: true,
      dateNF: 'dd/mm/yyyy'
    });
    if(!Array.isArray(rows)){
      throw new Error('Format de feuille non reconnu.');
    }
    const parsed = parseExcelData(rows, sheet);
    updateImportProgress('Fusion des données...', 2, 3);
    setSyncStatus('syncing', 'Import Excel: fusion des données...');
    await applyExcelImport(parsed, {
      ...options,
      importFileName: String(file?.name || '').trim() || 'Import Excel'
    });
  }catch(err){
    console.error(err);
    const details = String(err?.message || '').trim();
    const extra = details ? `\nDétail: ${details}` : '';
    alert(`Erreur import Excel. Vérifiez le format (xlsx/xls) et les en-têtes.${extra}`);
  }finally{
    closeImportProgressModal(false);
    importInProgress = false;
    endHeavyUiOperation();
  }
}

async function handleAudienceImportFile(file){
  if(!canImportData()){
    alert('Accès refusé');
    return;
  }
  await handleExcelImportFile(file, {
    importDossiers: false,
    importAudiences: true,
    audienceMode: 'audience-only'
  });
  resetAudienceFiltersUi();
  showView('audience');
  renderAudience();
}

async function exportBackupExcelImportable(){
  if(!canExportData()){
    alert('Accès refusé');
    return;
  }
  const dossierHeaders = [
    'client',
    'affectation',
    'type',
    'procedure',
    'ref client',
    'debiteur',
    'montant',
    'immatriculation',
    'marque',
    'adresse',
    'ville',
    'ref dossier assignation',
    'ref dossier restitution',
    'ref dossier sfdc'
  ];
  const audienceHeaders = [
    'ref client',
    'debiteur',
    'ref dossier',
    'audience',
    'juge',
    'sort',
    'tribunal',
    'date depot',
    'statut'
  ];

  const clients = getVisibleClients();
  const clientBlocks = clients.map(client=>{
    const clientDossierRows = [];
    const clientAudienceRows = [];
    (Array.isArray(client?.dossiers) ? client.dossiers : []).forEach(dossier=>{
      const procedures = normalizeProcedures(dossier);
      const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
        ? dossier.procedureDetails
        : {};
      const assignationRef = String(details?.ASS?.referenceClient || '').trim();
      const restitutionRef = String(details?.Restitution?.referenceClient || '').trim();
      const sfdcRef = String(
        details?.SFDC?.referenceClient
        || details?.['S/bien']?.referenceClient
        || details?.Injonction?.referenceClient
        || ''
      ).trim();

      clientDossierRows.push([
        String(client?.name || '').trim(),
        String(dossier?.dateAffectation || '').trim(),
        String(dossier?.type || '').trim(),
        procedures.join('+'),
        String(dossier?.referenceClient || '').trim(),
        String(dossier?.debiteur || '').trim(),
        String(dossier?.montant || '').trim(),
        String(dossier?.ww || '').trim(),
        String(dossier?.marque || '').trim(),
        String(dossier?.adresse || '').trim(),
        String(dossier?.ville || '').trim(),
        assignationRef,
        restitutionRef,
        sfdcRef
      ]);
      Object.entries(details).forEach(([procName, procDetails])=>{
        if(!isAudienceProcedure(procName)) return;
        const p = procDetails || {};
        const row = [
          String(dossier?.referenceClient || '').trim(),
          String(dossier?.debiteur || '').trim(),
          String(p?.referenceClient || '').trim(),
          String(p?.audience || '').trim(),
          String(p?.juge || '').trim(),
          String(p?.sort || '').trim(),
          String(p?.tribunal || '').trim(),
          String(p?.depotLe || p?.dateDepot || '').trim(),
          String(dossier?.statut || 'En cours').trim()
        ];
        clientAudienceRows.push({ cells: row, color: String(p?.color || '').trim() });
      });
    });
    return {
      clientName: String(client?.name || '').trim(),
      dossierRows: clientDossierRows,
      audienceRows: clientAudienceRows
    };
  });

  const totalCols = 14;
  const fillToCols = (arr, size)=>[...arr, ...Array(Math.max(0, size - arr.length)).fill('')];
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '_',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0')
  ].join('');
  const filename = `sauvegarde_importable_${stamp}.xlsx`;
  const directExportHandlePromise = primeDirectExportDirectoryAccess();

  const excelReady = await ensureExcelLibraries({ needXlsx: true, needExcelJs: true });
  if(!excelReady){
    return;
  }

  if(typeof ExcelJS !== 'undefined'){
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sauvegarde');
    const colWidths = [18, 15, 12, 26, 16, 20, 14, 16, 14, 30, 14, 20, 20, 20];
    sheet.columns = colWidths.map(width=>({ width }));
    const lastColLetter = String.fromCharCode(64 + totalCols);
    const rowMeta = new Map();
    const audienceRowColorMap = new Map();

    const addRow = (cells, type, extra = {})=>{
      const row = sheet.addRow(fillToCols(cells, totalCols));
      rowMeta.set(row.number, { type, ...extra });
      return row;
    };

    addRow(['SAUVEGARDE IMPORTABLE'], 'title');
    sheet.mergeCells(`A1:${lastColLetter}1`);

    if(clientBlocks.length){
      clientBlocks.forEach((block, index)=>{
        addRow([`CLIENT : ${block.clientName || '-'}`], 'client');
        addRow(dossierHeaders, 'dossier-header');
        if(block.dossierRows.length){
          block.dossierRows.forEach(cells=>addRow(cells, 'dossier-data'));
        }else{
          addRow([''], 'spacer');
        }
        addRow([''], 'spacer');
        addRow(audienceHeaders, 'audience-header');
        if(block.audienceRows.length){
          block.audienceRows.forEach(audienceRow=>{
            const row = addRow(audienceRow.cells, 'audience-data');
            if(audienceRow.color) audienceRowColorMap.set(row.number, String(audienceRow.color).trim());
          });
        }else{
          addRow([''], 'spacer');
        }
        if(index < clientBlocks.length - 1){
          addRow([''], 'spacer');
          addRow([''], 'spacer');
        }
      });
    }else{
      addRow(dossierHeaders, 'dossier-header');
      addRow([''], 'spacer');
      addRow([''], 'spacer');
      addRow(audienceHeaders, 'audience-header');
      addRow([''], 'spacer');
    }

    const border = {
      top: { style: 'thin', color: { argb: 'FFCCD4E1' } },
      left: { style: 'thin', color: { argb: 'FFCCD4E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCCD4E1' } },
      right: { style: 'thin', color: { argb: 'FFCCD4E1' } }
    };
    const palette = {
      titleBg: 'FF123B8C',
      titleFg: 'FFFFFFFF',
      clientBg: 'FFE8EFFD',
      clientFg: 'FF123B8C',
      dossierHeaderBg: 'FF1A4590',
      audienceHeaderBg: 'FF0F766E',
      headerFg: 'FFFFFFFF',
      audienceBlue: 'FFE3F0FF',
      audienceGreen: 'FFE8F8EE',
      audienceRed: 'FFFDEAEA',
      audienceYellow: 'FFFFF9DB',
      audienceDocumentOk: 'FFF4EDC9',
      audiencePurpleDark: 'FFEDE6FF',
      audiencePurpleLight: 'FFF5EEFF',
      rowAlt: 'FFF8FAFC'
    };
    const audienceFillByColor = {
      blue: palette.audienceBlue,
      green: palette.audienceGreen,
      red: palette.audienceRed,
      yellow: palette.audienceYellow,
      'document-ok': palette.audienceDocumentOk,
      'purple-dark': palette.audiencePurpleDark,
      'purple-light': palette.audiencePurpleLight
    };

    sheet.getRow(1).height = 36;
    for(let r = 1; r <= sheet.rowCount; r++){
      const row = sheet.getRow(r);
      const meta = rowMeta.get(r) || { type: '' };
      const isHeader = meta.type === 'dossier-header' || meta.type === 'audience-header';
      const isTitle = meta.type === 'title';
      const isClient = meta.type === 'client';
      const isSpacer = meta.type === 'spacer';
      row.height = isTitle ? 36 : isHeader ? 28 : isClient ? 24 : 22;

      if(isClient){
        sheet.mergeCells(`A${r}:${lastColLetter}${r}`);
      }

      for(let c = 1; c <= totalCols; c++){
        const cell = row.getCell(c);
        if(isSpacer){
          cell.value = '';
          continue;
        }
        cell.border = border;
        cell.font = { name: 'Arial', size: 11, color: { argb: 'FF111827' } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };

        if(isTitle){
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.titleBg } };
          cell.font = { name: 'Arial', size: 18, bold: true, color: { argb: palette.titleFg } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }else if(isClient){
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.clientBg } };
          cell.font = { name: 'Arial', size: 13, bold: true, color: { argb: palette.clientFg } };
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }else if(meta.type === 'dossier-header'){
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.dossierHeaderBg } };
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: palette.headerFg } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }else if(meta.type === 'audience-header'){
          const inAudienceCols = c <= audienceHeaders.length;
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: inAudienceCols ? palette.audienceHeaderBg : 'FFFFFFFF' }
          };
          cell.font = {
            name: 'Arial',
            size: 11,
            bold: true,
            color: { argb: inAudienceCols ? palette.headerFg : 'FF111827' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }else if(meta.type === 'audience-data'){
          const rowColor = audienceRowColorMap.get(r) || '';
          const mappedFill = audienceFillByColor[rowColor];
          const fallbackAlt = r % 2 === 0 ? palette.rowAlt : '';
          const fg = mappedFill || fallbackAlt;
          if(fg){
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fg } };
          }
          if(c > audienceHeaders.length){
            cell.value = '';
          }
        }else if(meta.type === 'dossier-data'){
          if(r % 2 === 0){
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.rowAlt } };
          }
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob(
      [buffer],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );
    await saveBlobDirectOrDownload(blob, filename, {
      preferredHandle: await directExportHandlePromise
    });
    return;
  }

  const aoa = [];
  aoa.push(fillToCols(['SAUVEGARDE IMPORTABLE'], totalCols));

  if(clientBlocks.length){
    clientBlocks.forEach((block, index)=>{
      aoa.push(fillToCols([`CLIENT : ${block.clientName || '-'}`], totalCols));
      aoa.push(fillToCols(dossierHeaders, totalCols));
      if(block.dossierRows.length){
        block.dossierRows.forEach(r=>aoa.push(fillToCols(r, totalCols)));
      }else{
        aoa.push(fillToCols([''], totalCols));
      }
      aoa.push(fillToCols([''], totalCols));
      aoa.push(fillToCols(audienceHeaders, totalCols));
      if(block.audienceRows.length){
        block.audienceRows.forEach(r=>aoa.push(fillToCols(r.cells, totalCols)));
      }else{
        aoa.push(fillToCols([''], totalCols));
      }
      if(index < clientBlocks.length - 1){
        aoa.push(fillToCols([''], totalCols));
        aoa.push(fillToCols([''], totalCols));
      }
    });
  }else{
    aoa.push(fillToCols(dossierHeaders, totalCols));
    aoa.push(fillToCols([''], totalCols));
    aoa.push(fillToCols([''], totalCols));
    aoa.push(fillToCols(audienceHeaders, totalCols));
    aoa.push(fillToCols([''], totalCols));
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 26 }, { wch: 16 }, { wch: 20 }, { wch: 14 },
    { wch: 16 }, { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sauvegarde');
  const blob = createXlsxBlobFromWorkbook(wb);
  await saveBlobDirectOrDownload(blob, filename, {
    preferredHandle: await directExportHandlePromise
  });
}

// ================== INIT ==================
async function initApplication(){
  setSyncStatus(LOCAL_ONLY_MODE ? 'error' : 'pending', LOCAL_ONLY_MODE ? 'Mode local (offline)' : 'Vérification serveur...');
  renderSyncMetrics();
  if(!LOCAL_ONLY_MODE){
    try{
      await resolveApiBase();
    }catch(err){
      console.warn('Résolution API impossible, passage en mode local', err);
    }
    // If the server wasn't found during boot, immediately switch to local
    // mode so the app never appears frozen.
    if(!remoteServerReachable){
      setSyncStatus('error', 'Mode local (serveur indisponible)');
    }
  }
  await loadPersistedState();
  await hardenUsersOnBoot();
  const localBootstrapSetupRequired = shouldOfferLocalBootstrapSetup();
  updateBootstrapSetupUi({
    visible: localBootstrapSetupRequired || (!LOCAL_ONLY_MODE && remoteBootstrapSetupRequired),
    remote: !LOCAL_ONLY_MODE && remoteBootstrapSetupRequired
  });
  const startupAudienceReconciliation = reconcileAudienceOrphanDossiers();
  if(startupAudienceReconciliation.matchedDossiers > 0){
    handleDossierDataChange({ audience: true });
  }
  applicationBootFailed = false;
  scheduleInitialDesktopStatePersist();
  hasLoadedState = true;
  if(startupAudienceReconciliation.matchedDossiers > 0){
    queuePersistAppState();
  }
  setupEvents();
  restoreSidebarState();
  restoreContentZoom();
  renderProcedureMontantGroups();
  syncConditionalCreationFieldsVisibility([]);
  markDeferredRenderDirty(
    'dashboard',
    'clients',
    'creation',
    'suivi',
    'audience',
    'diligence',
    'salle',
    'equipe',
    'recycle',
    'clientDropdown'
  );
  showView('dashboard', { warmup: false });
  if(localBootstrapSetupRequired){
    setTimeout(()=>{
      openPasswordSetupModal({ mode: PASSWORD_SETUP_MODE_BOOTSTRAP_LOCAL });
    }, 120);
  }else if(!LOCAL_ONLY_MODE && remoteBootstrapSetupRequired){
    setTimeout(()=>{
      openPasswordSetupModal({ mode: PASSWORD_SETUP_MODE_BOOTSTRAP_REMOTE });
    }, 120);
  }
  if(pendingLoginRetryAfterInit){
    setTimeout(()=>login(), 0);
  }
}

async function bootstrapApplication(){
  try{
    await initApplication();
    if(!hasRemoteAuthSession()){
      try{
        await refreshPreLoginServerStatus();
      }catch(err){
        console.warn('Vérification serveur pré-connexion impossible', err);
        setSyncStatus('error', 'Mode local (serveur indisponible)');
      }
    }
  }catch(err){
    applicationBootFailed = false;
    console.error('Initialisation application impossible', err);
    setSyncStatus('error', LOCAL_ONLY_MODE ? 'Mode local (offline)' : 'Mode local (serveur indisponible)');
  }
  updateSyncStatusLabel();
  setInterval(flushSyncQueueNow, 30000);
}

// ================== EVENTS ==================
function setupEvents(){
  $('sidebarToggleBtn')?.addEventListener('click', toggleSidebar);
  $('zoomOutBtn')?.addEventListener('click', ()=>changeContentZoom(-CONTENT_ZOOM_STEP));
  $('zoomInBtn')?.addEventListener('click', ()=>changeContentZoom(CONTENT_ZOOM_STEP));
  $('zoomResetBtn')?.addEventListener('click', resetContentZoom);
  $('zoomRange')?.addEventListener('input', (e)=>{
    const percent = Number(e.target?.value || 100) / 100;
    applyContentZoom(percent);
  });
  $('openDesktopStateFileBtn')?.addEventListener('click', ()=>{
    openDesktopStateFile().catch(()=>{});
  });
  $('importAppsavocatBtn')?.addEventListener('click', ()=>{
    if(!canEditData()) return alert('Accès refusé');
    $('importAppsavocatInput')?.click();
  });
  $('importAppsavocatInput')?.addEventListener('change', (e)=>{
    const file = e.target?.files?.[0];
    if(!file) return;
    handleAppsavocatImportFile(file).catch(err=>console.error(err));
    e.target.value = '';
  });
  $('dashboardLink').onclick = ()=>showView('dashboard');
  $('clientsLink').onclick = ()=>showView('clients');
  $('creationLink').onclick = ()=>{
    creationPinnedClientId = '';
    resetCreationForm();
    showView('creation');
  };
  $('suiviLink').onclick = ()=>{
    filterSuiviStatus = 'all';
    filterSuiviAttDepotOnly = false;
    showView('suivi');
  };
  $('audienceLink').onclick = ()=>showView('audience');
  $('diligenceLink').onclick = ()=>showView('diligence');
  $('salleLink').onclick = ()=>showView('salle');
  $('equipeLink')?.addEventListener('click', ()=>showView('equipe'));
  $('recycleLink')?.addEventListener('click', ()=>showView('recycle'));

  $('loginBtn').onclick = login;
  $('bootstrapSetupBtn')?.addEventListener('click', ()=>{
    const mode = String($('bootstrapSetupBtn')?.dataset.mode || PASSWORD_SETUP_MODE_BOOTSTRAP_LOCAL);
    openPasswordSetupModal({ mode });
  });
  $('username')?.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter') login();
  });
  $('password')?.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter') login();
  });
  $('logoutBtn').onclick = logout;
  $('closeDossierModalBtn')?.addEventListener('click', closeDossierModal);
  $('closeImportResultModalBtn')?.addEventListener('click', closeImportResultModal);
  $('closeExportPreviewModalBtn')?.addEventListener('click', closeExportPreviewModal);
  $('exportPreviewExcelBtn')?.addEventListener('click', handleExportPreviewExcel);
  $('printExportPreviewBtn')?.addEventListener('click', handlePrintExportPreview);
  $('copyImportErrorsBtn')?.addEventListener('click', copyImportErrors);
  $('dossierModal')?.addEventListener('click', (e)=>{
    if(e.target?.id === 'dossierModal') closeDossierModal();
  });
  $('importResultModal')?.addEventListener('click', (e)=>{
    if(e.target?.id === 'importResultModal') closeImportResultModal();
  });
  $('exportPreviewModal')?.addEventListener('click', (e)=>{
    if(e.target?.id === 'exportPreviewModal') closeExportPreviewModal();
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key !== 'Escape') return;
    closeDossierModal();
    closeImportResultModal();
    closeExportPreviewModal();
  });
  $('addClientBtn').onclick = ()=>addClient($('clientName').value);
  $('selectClient')?.addEventListener('change', ()=>{
    if(creationPinnedClientId && String($('selectClient')?.value || '') !== String(creationPinnedClientId)){
      creationPinnedClientId = '';
    }
    updateCreationPinnedClientUi();
  });
  $('unlockCreationClientBtn')?.addEventListener('click', ()=>{
    creationPinnedClientId = '';
    updateCreationPinnedClientUi();
    $('selectClient')?.focus();
  });
  $('deleteAllClientsBtn')?.addEventListener('click', deleteAllClients);
  $('importExcelBtn')?.addEventListener('click', ()=> $('importExcelInput')?.click());
  $('exportBackupExcelBtn')?.addEventListener('click', ()=>{
    if(!canEditData()) return alert('Accès refusé');
    exportBackupExcelImportable().catch(err=>console.error(err));
  });
  $('importExcelInput')?.addEventListener('change', (e)=>{
    if(!canEditData()) return alert('Accès refusé');
    const file = e.target?.files?.[0];
    if(!file) return;
    handleExcelImportFile(file, {
      importDossiers: true,
      importAudiences: false
    }).catch(err=>console.error(err));
    e.target.value = '';
  });
  $('importAudienceExcelBtn')?.addEventListener('click', ()=> $('importAudienceExcelInput')?.click());
  $('importAudienceExcelInput')?.addEventListener('change', (e)=>{
    if(!canEditData()) return alert('Accès refusé');
    const file = e.target?.files?.[0];
    if(!file) return;
    handleAudienceImportFile(file).catch(err=>console.error(err));
    e.target.value = '';
  });
  $('addDossierBtn').onclick = addDossier;
  $('referenceClientInput')?.addEventListener('input', ()=>{
    clearCreationReferenceClientError();
  });
  $('referenceClientInput')?.addEventListener('blur', ()=>{
    validateCreationReferenceClient({ focus: false });
  });
  $('montantInput')?.addEventListener('input', (e)=>{
    syncMainMontantToGroup1(e.target?.value || '');
  });
  $('dateAffectation')?.addEventListener('blur', (e)=>{
    const raw = String(e.target?.value || '').trim();
    if(!raw){
      e.target.value = '';
      return;
    }
    const normalized = normalizeDateDDMMYYYY(raw);
    if(!normalized){
      alert('Date d’affectation invalide. Utilisez le format jj/mm/aaaa.');
      return;
    }
    e.target.value = normalized;
    syncProcedureDateAffectationToCards(true);
  });
  $('uploadBtn')?.addEventListener('click', ()=> $('fileInput')?.click());
  $('fileInput')?.addEventListener('change', handleFiles);

  const dz = $('dropzone');
  if(dz){
    dz.addEventListener('dragover', (e)=>{
      e.preventDefault();
      dz.classList.add('dragover');
    });
    dz.addEventListener('dragleave', ()=> dz.classList.remove('dragover'));
    dz.addEventListener('drop', (e)=>{
      e.preventDefault();
      dz.classList.remove('dragover');
      handleFiles(e);
    });
  }

  document.querySelectorAll('.proc-check').forEach(cb=>{
    cb.addEventListener('change', e=>{
      if(suppressProcedureChange) return;
      const label = e.target.closest('label');
      if(label) label.classList.toggle('active', e.target.checked);
      if(!e.target.checked){
        const value = String(e.target.value || '').trim();
        if(value){
          editingOriginalProcedures = editingOriginalProcedures.filter(p=>p !== value);
        }
      }
      syncConditionalCreationFieldsVisibility();
      renderProcedureDetails();
    });
  });
  $('procedureCustom')?.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      addCustomProcedure();
    }
  });
  $('addProcedureBtn')?.addEventListener('click', addCustomProcedure);

  const renderClientsDebounced = debounce(renderClients, 120);
  const renderSuiviDebounced = debounce(renderSuivi, 120);
  const renderAudienceDebounced = debounce(renderAudience, 220);
  const renderDiligenceDebounced = debounce(renderDiligence, 120);
  const filterTeamClientListDebounced = debounce(filterTeamClientList, 120);
  $('audienceTableContainer')?.addEventListener('scroll', queueAudienceVirtualRender, { passive: true });
  $('suiviTableContainer')?.addEventListener('scroll', queueSuiviVirtualRender, { passive: true });
  $('diligenceTableContainer')?.addEventListener('scroll', queueDiligenceVirtualRender, { passive: true });

  $('searchClientInput')?.addEventListener('input', renderClientsDebounced);

  $('filterGlobal')?.addEventListener('input', ()=>{
    filterSuiviAttDepotOnly = false;
    renderSuiviDebounced();
  });
  $('suiviBody')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-action]');
    if(!btn) return;
    const clientId = Number(btn.dataset.clientId);
    const dossierIndex = Number(btn.dataset.dossierIndex);
    if(!Number.isFinite(clientId) || !Number.isFinite(dossierIndex)) return;
    const action = btn.dataset.action;
    if(action === 'view') openDossierDetails(clientId, dossierIndex);
    if(action === 'edit') editDossier(clientId, dossierIndex);
    if(action === 'delete') deleteDossier(clientId, dossierIndex);
  });
  $('filterSuiviProcedure')?.addEventListener('change', (e)=>{
    filterSuiviAttDepotOnly = false;
    filterSuiviProcedure = e.target.value;
    renderSuivi();
  });
  $('filterSuiviTribunal')?.addEventListener('change', (e)=>{
    filterSuiviAttDepotOnly = false;
    applySuiviTribunalFilterFromInput(e.target.value, { allowApproximate: true });
  });
  $('filterSuiviTribunal')?.addEventListener('keydown', (e)=>{
    if(e.key !== 'Enter') return;
    e.preventDefault();
    filterSuiviAttDepotOnly = false;
    applySuiviTribunalFilterFromInput(e.target.value, { allowApproximate: true });
  });
  $('filterSuiviTribunal')?.addEventListener('input', (e)=>{
    if(String(e.target?.value || '').trim()) return;
    filterSuiviAttDepotOnly = false;
    applySuiviTribunalFilterFromInput('', { allowApproximate: false });
  });
  $('filterSuiviCheckedOrder')?.addEventListener('change', (e)=>{
    filterSuiviCheckedFirst = String(e.target?.value || 'default') === 'checked-first';
    renderSuivi();
  });
  bindDashboardShortcutCard('dashboardAudienceErrorsCard', openDashboardAudienceErrorsView);
  bindDashboardShortcutCard('dashboardAttSortCard', openDashboardAudienceAttSortView);
  bindDashboardShortcutCard('dashboardAttDepotCard', openDashboardSuiviAttDepotView);
  bindDashboardShortcutCard('totalClientsCard', openDashboardClientsView);
  bindDashboardShortcutCard('dashboardEnCoursCard', openDashboardSuiviEnCoursView);
  bindDashboardShortcutCard('dashboardClotureCard', openDashboardSuiviClosedView);
  $('selectAllSuiviBtn')?.addEventListener('click', ()=>setAllVisibleSuiviRowsForPrint(true));
  $('clearAllSuiviBtn')?.addEventListener('click', ()=>setAllVisibleSuiviRowsForPrint(false));
  $('suiviPageSelectionToggle')?.addEventListener('change', (e)=>setAllFilteredSuiviRowsForPrint(!!e.target?.checked));
  $('exportSuiviBtn')?.addEventListener('click', exportSuiviSelectedXLS);
  $('previewSuiviBtn')?.addEventListener('click', previewSuiviSelectedRows);
  $('filterAudience')?.addEventListener('input', renderAudienceDebounced);
  $('audienceErrorsBtn')?.addEventListener('click', ()=>{
    filterAudienceErrorsOnly = !filterAudienceErrorsOnly;
    const btn = $('audienceErrorsBtn');
    if(btn) btn.classList.toggle('active', filterAudienceErrorsOnly);
    // Error mode must ignore color filtering and keep full base list.
    setSelectedAudienceColor('all', false);
    filterAudienceColor = 'all';
    const colorSel = $('filterAudienceColor');
    if(colorSel) colorSel.value = 'all';
    syncAudienceColorFilterSelectAppearance();
    renderAudience();
  });
  $('diligenceProcedureFilter')?.addEventListener('change', (e)=>{
    const nextProcedure = String(e.target?.value || 'all');
    const procedureChanged = nextProcedure !== filterDiligenceProcedure;
    filterDiligenceProcedure = nextProcedure;
    if(procedureChanged){
      clearDiligencePrintSelection({ immediate: true });
      resetDiligenceAuxFilters();
      paginationState.diligence = 1;
    }
    renderDiligence();
  });
  $('diligenceSortFilter')?.addEventListener('change', (e)=>{
    const nextValue = applyDiligenceFilterSelectionToCheckedRows('sort', e.target?.value);
    filterDiligenceSort = nextValue;
    renderDiligence();
  });
  $('diligenceDelegationFilter')?.addEventListener('change', (e)=>{
    const nextValue = applyDiligenceFilterSelectionToCheckedRows('attDelegationOuDelegat', e.target?.value);
    filterDiligenceDelegation = nextValue;
    renderDiligence();
  });
  $('diligenceOrdonnanceFilter')?.addEventListener('change', (e)=>{
    const nextValue = applyDiligenceFilterSelectionToCheckedRows('attOrdOrOrdOk', e.target?.value);
    filterDiligenceOrdonnance = nextValue;
    renderDiligence();
  });
  $('diligenceTribunalFilter')?.addEventListener('change', (e)=>{
    applyDiligenceTribunalFilterFromInput(e.target.value, { allowApproximate: true });
  });
  $('diligenceTribunalFilter')?.addEventListener('keydown', (e)=>{
    if(e.key !== 'Enter') return;
    e.preventDefault();
    applyDiligenceTribunalFilterFromInput(e.target.value, { allowApproximate: true });
  });
  $('diligenceTribunalFilter')?.addEventListener('input', (e)=>{
    if(String(e.target?.value || '').trim()) return;
    applyDiligenceTribunalFilterFromInput('', { allowApproximate: false });
  });
  $('diligenceCheckedOrder')?.addEventListener('change', (e)=>{
    filterDiligenceCheckedFirst = String(e.target?.value || 'default') === 'checked-first';
    renderDiligence();
  });
  $('diligenceSearchInput')?.addEventListener('input', renderDiligenceDebounced);
  $('exportDiligenceBtn')?.addEventListener('click', exportDiligenceXLS);
  $('previewDiligenceBtn')?.addEventListener('click', previewDiligenceSelectedRows);
  $('selectAllDiligenceBtn')?.addEventListener('click', ()=>setAllVisibleDiligenceRowsForPrint(true));
  $('clearAllDiligenceBtn')?.addEventListener('click', ()=>setAllVisibleDiligenceRowsForPrint(false));
  $('diligencePageSelectionToggle')?.addEventListener('change', (e)=>setAllFilteredDiligenceRowsForPrint(!!e.target?.checked));
  $('salleFilterSelect')?.addEventListener('change', (e)=>{
    filterSalle = String(e.target?.value || 'all');
    renderSalle();
  });
  $('salleTribunalFilter')?.addEventListener('change', (e)=>{
    filterSalleTribunal = String(e.target?.value || 'all');
    renderSidebarSalleSessions();
  });
  $('salleAudienceDateFilter')?.addEventListener('change', (e)=>{
    filterSalleAudienceDate = String(e.target?.value || '').trim();
    renderSidebarSalleSessions();
  });
  $('addSalleJudgeBtn')?.addEventListener('click', addSalleJudge);
  $('salleDayTabs')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-day]');
    if(!btn) return;
    selectedSalleDay = normalizeSalleWeekday(btn.dataset.day || '');
    renderSalle();
  });
  $('salleNameInput')?.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      addSalleJudge();
    }
  });
  $('salleJudgeInput')?.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      addSalleJudge();
    }
  });
  $('salleJudgeInput')?.addEventListener('focus', ()=>{
    refreshKnownJudgesDatalist({ force: true });
  });
  $('salleJudgeInput')?.addEventListener('blur', ()=>{
    const salle = normalizeSalleName($('salleNameInput')?.value || '');
    const juge = normalizeJudgeName($('salleJudgeInput')?.value || '');
    if(!salle || !juge) return;
    addSalleJudge();
  });
  $('teamRole')?.addEventListener('change', updateTeamClientSelectorState);
  $('teamSaveBtn')?.addEventListener('click', saveTeamUser);
  $('teamResetBtn')?.addEventListener('click', resetTeamForm);
  $('teamProvisionStructureBtn')?.addEventListener('click', ()=>{
    provisionStandardTeamStructure().catch(err=>{
      console.error(err);
      alert(`Création structure standard impossible.\nDétail: ${String(err?.message || err || 'Erreur inconnue')}`);
    });
  });
  $('teamClientSearchInput')?.addEventListener('input', filterTeamClientListDebounced);
  $('passwordSetupSaveBtn')?.addEventListener('click', submitForcedPasswordChange);
  $('passwordSetupLogoutBtn')?.addEventListener('click', logout);
  $('passwordSetupInput')?.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      submitForcedPasswordChange();
    }
  });
  $('passwordSetupConfirmInput')?.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      submitForcedPasswordChange();
    }
  });
  $('restoreAllRecycleBtn')?.addEventListener('click', restoreAllRecycleItems);
  $('clearRecycleBinBtn')?.addEventListener('click', clearRecycleBinToBackup);
  $('recycleBody')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-action="restore"]');
    if(!btn) return;
    const idx = Number(btn.dataset.index);
    if(!Number.isFinite(idx)) return;
    restoreRecycleItem(idx);
  });
  $('filterAudienceColor')?.addEventListener('change', (e)=>{
    const previousColor = normalizeAudienceFilterColorValue(filterAudienceColor);
    const nextColor = normalizeAudienceFilterColorValue(e.target.value);
    const previousIsOrdonnanceColor = previousColor === 'green' || previousColor === 'yellow';
    const nextIsOrdonnanceColor = nextColor === 'green' || nextColor === 'yellow';
    filterAudienceColor = nextColor;
    const canApplyOrdonnanceTransitionFromFilter =
      audiencePrintSelection.size
      && nextIsOrdonnanceColor
      && !previousIsOrdonnanceColor;
    if(canApplyOrdonnanceTransitionFromFilter){
      const appliedToCheckedRows = applyColorToSelectedAudienceRows(nextColor);
      if(appliedToCheckedRows){
        filterAudienceCheckedFirst = true;
        if($('filterAudienceCheckedOrder')) $('filterAudienceCheckedOrder').value = 'checked-first';
        paginationState.audience = 1;
      }
      clearAudiencePrintSelection({ immediate: true });
      syncAudienceColorFilterSelectAppearance();
      renderAudience();
      return;
    }
    clearAudiencePrintSelection({ immediate: true });
    syncAudienceColorFilterSelectAppearance();
    renderAudience();
  });
  $('filterAudienceProcedure')?.addEventListener('change', (e)=>{
    setAudienceProcedureFilter(e.target.value, { syncUi: false });
    renderAudience();
  });
  $('filterAudienceTribunal')?.addEventListener('change', (e)=>{
    applyAudienceTribunalFilterFromInput(e.target.value, { allowApproximate: true, clearSelection: true });
  });
  $('filterAudienceTribunal')?.addEventListener('keydown', (e)=>{
    if(e.key !== 'Enter') return;
    e.preventDefault();
    applyAudienceTribunalFilterFromInput(e.target.value, { allowApproximate: true, clearSelection: true });
  });
  $('filterAudienceTribunal')?.addEventListener('search', (e)=>{
    applyAudienceTribunalFilterFromInput(e.target.value, { allowApproximate: false, clearSelection: true });
  });
  $('filterAudienceDate')?.addEventListener('change', (e)=>{
    filterAudienceDate = String(e.target?.value || '').trim();
    renderAudience();
  });
  $('filterAudienceCheckedOrder')?.addEventListener('change', (e)=>{
    filterAudienceCheckedFirst = String(e.target?.value || 'default') === 'checked-first';
    renderAudience();
  });
  $('undoAudienceColorBtn')?.addEventListener('click', undoLastAudienceColorChange);

  document.addEventListener('keydown', handleAudienceSaveShortcut);
  $('saveAudienceBtn')?.addEventListener('click', ()=>saveAllAudience({ feedback: true }));
  $('printAudienceBtn')?.addEventListener('click', ()=>{
    const rows = getVisibleAudiencePageRowsForPrintSelection();
    if(!rows.length){
      syncAudienceSelectionActionButton();
      alert('Aucune ligne visible.');
      return;
    }
    const selected = countSelectedAudienceRows(rows);
    setAllVisibleAudienceRowsForPrint(selected !== rows.length);
  });
  $('selectAllPrintAudienceBtn')?.addEventListener('click', ()=>setAllVisibleAudienceRowsForPrint(true));
  $('clearAllPrintAudienceBtn')?.addEventListener('click', ()=>setAllVisibleAudienceRowsForPrint(false));
  $('audiencePageSelectionToggle')?.addEventListener('change', (e)=>setAllFilteredAudienceRowsForPrint(!!e.target?.checked));
  $('exportAudienceBtn')?.addEventListener('click', ()=>exportAudienceRegularXLS({ openAfterExport: true, browserOpenInline: true }));
  $('exportAudienceDetailBtn')?.addEventListener('click', ()=>{
    return exportAudienceXLS({
      blankSort: true
    });
  });
  $('previewAudienceBtn')?.addEventListener('click', previewAudienceSelectedRows);
  $('calendarPrevBtn')?.addEventListener('click', ()=>{
    dashboardCalendarCursor = new Date(dashboardCalendarCursor.getFullYear(), dashboardCalendarCursor.getMonth() - 1, 1);
    renderDashboardCalendar();
  });
  $('calendarNextBtn')?.addEventListener('click', ()=>{
    dashboardCalendarCursor = new Date(dashboardCalendarCursor.getFullYear(), dashboardCalendarCursor.getMonth() + 1, 1);
    renderDashboardCalendar();
  });
  $('dashboardCalendarGrid')?.addEventListener('click', handleDashboardCalendarGridClick);

  // ===== Audience color filters =====
  audienceColorButtons = Array.from(document.querySelectorAll('.color-btn[data-color]'));
  audienceColorButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const color = btn.dataset.color;
      if(color === 'all'){
        filterAudienceErrorsOnly = false;
        const errBtn = $('audienceErrorsBtn');
        if(errBtn) errBtn.classList.remove('active');
        clearAudiencePrintSelection({ immediate: true });
        filterAudienceCheckedFirst = false;
        if($('filterAudienceCheckedOrder')) $('filterAudienceCheckedOrder').value = 'default';
        filterAudienceColor = 'all';
        const colorSel = $('filterAudienceColor');
        if(colorSel) colorSel.value = 'all';
        setSelectedAudienceColor('all', false);
        syncAudienceColorFilterSelectAppearance();
        renderAudience();
        return;
      }
      if(color !== 'all' && !audiencePrintSelection.size){
        syncAudienceColorActionAvailability();
        alert('Cochez d’abord un ou plusieurs dossiers avant de choisir une couleur.');
        return;
      }
      // Color buttons are paint mode selectors (not table filters).
      filterAudienceErrorsOnly = false;
      const errBtn = $('audienceErrorsBtn');
      if(errBtn) errBtn.classList.remove('active');
      setSelectedAudienceColor(color, false);
      const undoEntries = color === 'all'
        ? []
        : getAudienceRows({ ignoreSearch: true, ignoreColor: true })
          .filter(row=>audiencePrintSelection.has(makeAudiencePrintKey(row.ci, row.di, row.procKey)))
          .map(row=>buildAudienceColorUndoEntry(row.ci, row.di, row.procKey));
      const appliedToCheckedRows = applyColorToSelectedAudienceRows(color);
      if(appliedToCheckedRows){
        rememberAudienceColorUndoState(undoEntries, {
          filterAudienceColor,
          selectedAudienceColor: color,
          filterAudienceCheckedFirst
        });
      }
      const keepAudienceColorFilter = appliedToCheckedRows && (color === 'green' || color === 'yellow');
      if(appliedToCheckedRows && !keepAudienceColorFilter){
        setSelectedAudienceColor('all', false);
      }
      if(appliedToCheckedRows){
        filterAudienceCheckedFirst = true;
        if($('filterAudienceCheckedOrder')) $('filterAudienceCheckedOrder').value = 'checked-first';
        paginationState.audience = 1;
      }
      filterAudienceColor = keepAudienceColorFilter ? color : 'all';
      const colorSel = $('filterAudienceColor');
      if(colorSel) colorSel.value = keepAudienceColorFilter ? color : 'all';
      syncAudienceColorFilterSelectAppearance();
      renderAudience();
    });
  });
  syncAudienceColorFilterSelectAppearance();
  syncAudienceSelectionTone();
  syncAudienceColorActionAvailability();
  syncAudienceColorUndoAvailability();
  window.addEventListener('beforeunload', ()=>{
    if(hasLoadedState) persistAppStateNow();
  });
}

function setSelectedAudienceColor(color, syncFilter){
  selectedAudienceColor = color;
  const buttons = audienceColorButtons.length ? audienceColorButtons : Array.from(document.querySelectorAll('.color-btn[data-color]'));
  buttons.forEach(b=>b.classList.remove('active'));
  const btn = buttons.find(b=>b.dataset.color === color) || null;
  if(btn) btn.classList.add('active');
  syncAudienceSelectionTone();
  if(syncFilter){
    filterAudienceColor = color;
    const sel = $('filterAudienceColor');
    if(sel) sel.value = color;
    syncAudienceColorFilterSelectAppearance();
  }
}

// ================== NAV ==================
function showView(v, options = {}){
  const nextView = resolveAccessibleView(v);
  const isSameView = nextView && nextView === currentView;
  const isKnownDeferredView = Object.prototype.hasOwnProperty.call(DEFERRED_RENDER_SECTION_IDS, nextView);
  const viewIsDirty = isKnownDeferredView ? deferredRenderDirtyState[nextView] === true : false;
  const shouldRefreshView = options.force === true || !isSameView || viewIsDirty;
  const sectionRenderOptions = options.force === true ? { force: true } : {};
  const setVisible = (id, visible)=>{
    const el = $(id);
    if(!el) return;
    if(visible){
      el.style.display = 'block';
      el.classList.remove('section-enter');
      const shouldAnimateSectionEnter = !(
        isLargeDatasetMode()
        || importInProgress
        || heavyUiOperationCount > 0
      );
      if(shouldAnimateSectionEnter){
        requestAnimationFrame(()=>el.classList.add('section-enter'));
      }
    }else{
      el.style.display = 'none';
      el.classList.remove('section-enter');
    }
  };
  if(!isSameView){
    setVisible('dashboardSection', nextView==='dashboard');
    setVisible('clientSection', nextView==='clients');
    setVisible('creationSection', nextView==='creation');
    setVisible('suiviSection', nextView==='suivi');
    setVisible('audienceSection', nextView==='audience');
    setVisible('diligenceSection', nextView==='diligence');
    setVisible('salleSection', nextView==='salle');
    setVisible('equipeSection', nextView==='equipe');
    setVisible('recycleSection', nextView==='recycle');

    document.querySelectorAll('.nav-link').forEach(n=>n.classList.remove('active'));
    const target = $(nextView+'Link');
    if(target) target.classList.add('active');
  }
  if(shouldRefreshView){
    if(nextView === 'dashboard') runSectionRenderSafely('dashboard', ()=>renderDashboard(sectionRenderOptions), { delayMs: 50 });
    if(nextView === 'clients') runSectionRenderSafely('clients', ()=>renderClients(sectionRenderOptions), { delayMs: 50 });
    if(nextView === 'creation') updateClientDropdown(sectionRenderOptions);
    if(nextView === 'suivi'){
      runSectionRenderSafely('suivi', ()=>renderSuivi(sectionRenderOptions), { delayMs: 70 });
    }
    if(nextView === 'audience'){
      runSectionRenderSafely('audience', ()=>renderAudience(sectionRenderOptions), { delayMs: 70 });
    }
    if(nextView === 'diligence') runSectionRenderSafely('diligence', ()=>renderDiligence(sectionRenderOptions), { delayMs: 70 });
    if(nextView === 'salle') runSectionRenderSafely('salle', ()=>renderSalle(sectionRenderOptions), { delayMs: 80 });
    if(nextView === 'equipe') runSectionRenderSafely('equipe', ()=>renderEquipe(sectionRenderOptions), { delayMs: 80 });
    if(nextView === 'recycle') runSectionRenderSafely('recycle', ()=>renderRecycleBin(sectionRenderOptions), { delayMs: 80 });
  }
  currentView = nextView;
  if(nextView === 'dashboard' && options.warmup !== false && !isSameView){
    scheduleBackgroundDataWarmup(1800);
  }
  if(isMobileViewport()){
    setSidebarCollapsed(true);
  }
}

// ================== LOGIN ==================
async function login(){
  if(applicationBootFailed){
    showLoginError('Initialisation impossible. Rechargez la page ou verifiez le serveur.');
    return;
  }
  if(!hasLoadedState){
    pendingLoginRetryAfterInit = true;
    showLoginError('Chargement des donnees en cours...');
    return;
  }
  if(loginInFlight) return;
  const lockoutMessage = getLoginLockoutMessage();
  if(lockoutMessage){
    showLoginError(lockoutMessage);
    return;
  }

  loginInFlight = true;
  const loginBtn = $('loginBtn');
  const oldLoginText = loginBtn ? loginBtn.innerHTML : 'Se connecter';
  if(loginBtn){
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connexion en cours...';
  }
  
  const restoreLoginBtn = () => {
    loginInFlight = false;
    if(loginBtn){
      loginBtn.disabled = false;
      loginBtn.innerHTML = oldLoginText;
    }
  };

  try{
    const rawUsernameInput = $('username').value || '';
    const usernameInput = resolveLocalLoginUsername(rawUsernameInput);
    const remoteUsernameInput = resolveRemoteLoginUsername(rawUsernameInput);
    const passwordInput = normalizeLoginPassword($('password').value);
    const usedDefaultManagerPassword = isDefaultManagerPasswordLogin(rawUsernameInput, passwordInput);
    let remoteLoginState = 'offline';
    if(!LOCAL_ONLY_MODE){
      let remoteAuth = await loginRemoteSession(remoteUsernameInput, passwordInput);
      if(remoteAuth.reason === 'bootstrap_required' && usedDefaultManagerPassword){
        try{
          await submitRemoteBootstrapPasswordSetup(passwordInput, { silent: true });
          remoteAuth = await loginRemoteSession(remoteUsernameInput, passwordInput);
        }catch(err){
          console.warn('Initialisation automatique du compte gestionnaire serveur impossible', err);
        }
      }
      if(remoteAuth.ok){
        remoteLoginState = 'ok';
        updateBootstrapSetupUi({ visible: false });
      }else if(remoteAuth.reason === 'bootstrap_required'){
        updateBootstrapSetupUi({ visible: true, remote: true });
        showLoginError('Configurez d’abord le mot de passe initial du compte gestionnaire.');
        openPasswordSetupModal({ mode: PASSWORD_SETUP_MODE_BOOTSTRAP_REMOTE });
        return;
      }else if(remoteAuth.reason === 'invalid'){
        showLoginError(registerFailedLoginAttempt());
        return;
      }else if(remoteAuth.reason === 'unavailable'){
        remoteLoginState = 'unavailable';
      }
    }

    USERS = ensureManagerUser(Array.isArray(USERS) ? USERS : []);
    if(remoteLoginState === 'unavailable' && shouldOfferLocalBootstrapSetup()){
      if(usedDefaultManagerPassword){
        try{
          await submitLocalBootstrapPasswordSetup(passwordInput, { silent: true });
        }catch(err){
          console.warn('Initialisation automatique du compte gestionnaire local impossible', err);
        }
      }
    }
    if(remoteLoginState === 'unavailable' && shouldOfferLocalBootstrapSetup()){
      updateBootstrapSetupUi({ visible: true, remote: false });
      showLoginError('Le serveur est indisponible. Initialisez un mot de passe local pour utiliser la version web.');
      openPasswordSetupModal({ mode: PASSWORD_SETUP_MODE_BOOTSTRAP_LOCAL });
      return;
    }

    if(remoteLoginState === 'ok'){
      // A successful server login must refresh the in-memory state first so
      // stale offline/test caches do not leak into the remote web session.
      await loadPersistedState();
    }

    let userIndex = USERS.findIndex(
      x=>String(x.username || '').trim().toLowerCase() === usernameInput
    );
    let user = userIndex >= 0 ? USERS[userIndex] : null;
    let isValid = await verifyUserPassword(user, passwordInput);
    if((!user || !isValid) && remoteLoginState === 'ok'){
      await loadPersistedState();
      USERS = ensureManagerUser(Array.isArray(USERS) ? USERS : []);
      userIndex = USERS.findIndex(
        x=>String(x.username || '').trim().toLowerCase() === usernameInput
      );
      user = userIndex >= 0 ? USERS[userIndex] : null;
      isValid = await verifyUserPassword(user, passwordInput);
    }
    if(!user || !isValid){
      if(remoteLoginState === 'unavailable'){
        clearRemoteAuthSession();
      }
      showLoginError(registerFailedLoginAttempt());
      return;
    }

    const shouldUpgradePasswordSecurity = Boolean(
      (!hasStoredPasswordHash(user) || normalizeLoginPassword(user.password || ''))
      && passwordInput
      && Number.isFinite(userIndex)
      && userIndex >= 0
    );

    resetLoginAttempts();
    pendingLoginRetryAfterInit = false;
    syncCurrentUserFromUsers();
    currentUser = USERS.find(x=>String(x.username || '').trim().toLowerCase() === usernameInput) || user;
    visibleClientsCache = null;
    visibleClientsCacheVersion = -1;
    visibleClientsCacheUserKey = '';
    editableClientsCache = null;
    editableClientsCacheVersion = -1;
    editableClientsCacheUserKey = '';
    editableClientsDropdownMarkupCache = '';
    editableClientsDropdownMarkupVersion = -1;
    editableClientsDropdownMarkupUserKey = '';
    clientListSummaryCache = null;
    clientListSummaryCacheVersion = -1;
    clientListSummaryCacheUserKey = '';
    clearLoginError();
    const initialView = resolveAccessibleView(getFallbackViewForCurrentUser());
    const initialSectionIdByView = {
      dashboard: 'dashboardSection',
      clients: 'clientSection',
      creation: 'creationSection',
      suivi: 'suiviSection',
      audience: 'audienceSection',
      diligence: 'diligenceSection',
      salle: 'salleSection',
      equipe: 'equipeSection',
      recycle: 'recycleSection'
    };
    const forceInitialViewVisible = ()=>{
      if($('loginScreen')) $('loginScreen').style.display = 'none';
      if($('appContent')) $('appContent').style.display = 'flex';
      const sectionIds = [
        'dashboardSection',
        'clientSection',
        'creationSection',
        'suiviSection',
        'audienceSection',
        'diligenceSection',
        'salleSection',
        'equipeSection',
        'recycleSection'
      ];
      const targetSectionId = initialSectionIdByView[initialView] || 'dashboardSection';
      sectionIds.forEach(id=>{
        const el = $(id);
        if(!el) return;
        el.style.display = (id === targetSectionId) ? 'block' : 'none';
      });
      document.querySelectorAll('.nav-link').forEach(n=>n.classList.remove('active'));
      const activeLink = $(`${initialView}Link`) || $('dashboardLink');
      if(activeLink) activeLink.classList.add('active');
      if(isMobileViewport()) setSidebarCollapsed(true);
    };

    const safeRun = (label, fn)=>{
      try{
        fn();
      }catch(err){
        console.error(`[login] ${label} failed`, err);
      }
    };

    const queueLoginPostBoot = ()=>{
      if(loginPostBootTimer){
        clearTimeout(loginPostBootTimer);
        loginPostBootTimer = null;
      }
      loginPostBootTimer = setTimeout(()=>{
        loginPostBootTimer = null;
        const deferInitialHeavyRender = isLargeDatasetMode();
        if(initialView === 'dashboard'){
          if(deferInitialHeavyRender){
            setTimeout(()=>{
              if(!currentUser || currentView !== 'dashboard') return;
              safeRun(
                'renderDashboard(deferred-login)',
                ()=>runSectionRenderSafely('dashboard', ()=>renderDashboard({
                  force: false,
                  immediate: true,
                  deferHeavy: true,
                  includeAudienceMetrics: false
                }), { delayMs: 60 })
              );
            }, 900);
            safeRun('queueLargeDatasetDashboardWarmup', ()=>queueLargeDatasetDashboardWarmup(120));
          }else{
            safeRun(
              'renderDashboard(immediate)',
              ()=>runSectionRenderSafely('dashboard', ()=>renderDashboard({
                force: true,
                immediate: true,
                deferHeavy: true,
                includeAudienceMetrics: false
              }), { delayMs: 40 })
            );
            safeRun('queueSidebarSalleSessionsRender', ()=>queueSidebarSalleSessionsRender(2800));
            safeRun('scheduleBackgroundDataWarmup', ()=>scheduleBackgroundDataWarmup(2200));
          }
        }else{
          safeRun('showView(initial)', ()=>showView(initialView, { force: !deferInitialHeavyRender, warmup: false }));
        }
      }, 0);
    };

    forceInitialViewVisible();
    markDeferredRenderDirty(
      'dashboard',
      'clients',
      'creation',
      'suivi',
      'audience',
      'diligence',
      'salle',
      'equipe',
      'recycle',
      'clientDropdown'
    );
    safeRun('applyRoleUI', ()=>applyRoleUI({ skipNavigation: true }));
    safeRun('primeDashboardTotalClients', ()=>animateDashboardMetric('totalClients', getVisibleClients().length, { immediate: true }));
    queueLoginPostBoot();
    if(shouldUpgradePasswordSecurity && (LOCAL_ONLY_MODE || !hasRemoteAuthSession())){
      setTimeout(async ()=>{
        try{
          const latestUser = USERS[userIndex];
          if(!latestUser) return;
          const upgradedUser = await secureUserPassword(latestUser, passwordInput, {
            requirePasswordChange: false
          });
          USERS[userIndex] = upgradedUser;
          if(currentUser && String(currentUser.username || '').trim().toLowerCase() === usernameInput){
            currentUser = upgradedUser;
          }
          await persistStateSliceNow('users', USERS, { source: 'auth-security-upgrade' });
        }catch(err){
          console.warn('Impossible de mettre à jour la sécurité du compte', err);
        }
      }, 0);
    }
    if(!LOCAL_ONLY_MODE && hasRemoteAuthSession()){
      const remoteSyncDelayMs = isLargeDatasetMode() ? 900 : 0;
      if(remoteSyncDelayMs > 0){
        setTimeout(()=>{
          if(currentUser){
            startRemoteSync();
          }
        }, remoteSyncDelayMs);
      }else{
        startRemoteSync();
      }
      setTimeout(()=>{
        refreshRemoteState().catch(()=>{});
      }, 80);
    }else if(remoteLoginState === 'unavailable'){
      setSyncStatus('error', 'Mode local (serveur indisponible)');
    }

    const hasVisibleSection = [
      'dashboardSection',
      'clientSection',
      'creationSection',
      'suiviSection',
      'audienceSection',
      'diligenceSection',
      'salleSection',
      'equipeSection',
      'recycleSection'
    ].some(id=>{
      const el = $(id);
      return !!el && el.style.display !== 'none';
    });
    const initialSectionId = initialSectionIdByView[initialView] || 'dashboardSection';
    if(!hasVisibleSection || $(initialSectionId)?.style.display === 'none'){
      forceInitialViewVisible();
    }
    closePasswordSetupModal();
  }finally{
    loginInFlight = false;
    restoreLoginBtn();
  }
}

function normalizeLoginPassword(value){
  return String(value || '')
    .trim()
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));
}

function logout(){
  stopRemoteSync();
  clearRemoteAuthSession();
  closePasswordSetupModal();
  closeDossierModal();
  currentUser = null;
  resetLoginAttempts();
  visibleClientsCache = null;
  visibleClientsCacheVersion = -1;
  visibleClientsCacheUserKey = '';
  editableClientsCache = null;
  editableClientsCacheVersion = -1;
  editableClientsCacheUserKey = '';
  clientListSummaryCache = null;
  clientListSummaryCacheVersion = -1;
  clientListSummaryCacheUserKey = '';
  lastPingMs = null;
  lastLiveDelayMs = null;
  renderSyncMetrics();
  $('appContent').style.display='none';
  $('loginScreen').style.display='flex';
  $('username').value='';
  $('password').value='';
  clearLoginError();
  renderSidebarSalleSessions();
  setSyncStatus('pending');
}

function applyRoleUI(options = {}){
  const skipNavigation = options.skipNavigation === true;
  const viewer = isViewer();
  const manager = isManager();
  const canCreateClient = canEditData();
  const canImport = canImportData();
  const canExport = canExportData();

  if($('creationLink')) $('creationLink').style.display = viewer ? 'none' : '';
  if($('clientsLink')) $('clientsLink').style.display = viewer ? 'none' : '';
  if($('suiviLink')) $('suiviLink').style.display = '';
  if($('audienceLink')) $('audienceLink').style.display = viewer ? 'none' : '';
  if($('diligenceLink')) $('diligenceLink').style.display = viewer ? 'none' : '';
  if($('salleLink')) $('salleLink').style.display = viewer ? 'none' : '';
  if($('equipeLink')) $('equipeLink').style.display = manager ? '' : 'none';
  if($('recycleLink')) $('recycleLink').style.display = manager ? '' : 'none';
  if($('openDesktopStateFileBtn')) $('openDesktopStateFileBtn').style.display = canImport ? '' : 'none';
  if($('importAppsavocatBtn')) $('importAppsavocatBtn').style.display = canImport ? '' : 'none';
  if($('addClientBtn')) $('addClientBtn').style.display = canCreateClient ? '' : 'none';
  if($('deleteAllClientsBtn')) $('deleteAllClientsBtn').style.display = canDeleteData() ? '' : 'none';
  if($('totalClientsCard')) $('totalClientsCard').style.display = viewer ? 'none' : '';
  setRoleControlledVisibility(['importExcelBtn', 'importAudienceExcelBtn', 'exportBackupExcelBtn'], canImport);
  setRoleControlledVisibility([
    'selectAllSuiviBtn',
    'clearAllSuiviBtn',
    'exportSuiviBtn',
    'previewSuiviBtn',
    'printAudienceBtn',
    'selectAllPrintAudienceBtn',
    'clearAllPrintAudienceBtn',
    'exportAudienceBtn',
    'exportAudienceDetailBtn',
    'previewAudienceBtn',
    'selectAllDiligenceBtn',
    'clearAllDiligenceBtn',
    'exportDiligenceBtn',
    'previewDiligenceBtn'
  ], canExport);

  const audienceEditable = canEditData();
  document.querySelectorAll('.color-btn').forEach(btn=> btn.disabled = !audienceEditable);
  if($('saveAudienceBtn')) $('saveAudienceBtn').style.display = audienceEditable ? '' : 'none';

  if(skipNavigation) return;
  if(!getAccessibleViewsForCurrentUser().has(String(currentView || '').trim())){
    showView(getFallbackViewForCurrentUser());
  }
}

// ================== CLIENTS ==================
async function addClient(name){
  if(!canEditData()) return alert('Accès refusé');
  name = name.trim();
  if(!name) return alert('Nom obligatoire');
  const existing = AppState.clients.find(c=>c.name.trim().toLowerCase() === name.toLowerCase());
  if(existing){
    alert('Client déjà موجود, on ouvre le client existant');
    goToCreation(existing.id);
    return;
  }
  const newClient = { id: Date.now(), name, dossiers: [] };
  AppState.clients.push(newClient);
  handleDossierDataChange({ audience: false });
  persistClientPatchNow({
    action: 'create',
    client: newClient
  }, { source: 'clients' }).catch((err)=>{
    console.warn('Impossible de sauvegarder le client', err);
  });
  $('clientName').value='';
  refreshPrimaryViews({ force: true, refreshClientDropdown: true });
  goToCreation(newClient.id);
}

function updateCreationPinnedClientUi(){
  const selectClient = $('selectClient');
  const hint = $('creationClientHint');
  const changeBtn = $('unlockCreationClientBtn');
  const pinnedId = String(creationPinnedClientId || '').trim();
  const pinnedClient = pinnedId
    ? AppState.clients.find(client=>String(client?.id || '') === pinnedId)
    : null;
  if(selectClient) selectClient.disabled = false;
  if(changeBtn) changeBtn.style.display = pinnedClient ? 'inline-flex' : 'none';
  if(!hint) return;
  if(!pinnedClient){
    hint.style.display = 'none';
    hint.innerHTML = '';
    return;
  }
  hint.style.display = 'flex';
  hint.innerHTML = `Client sélectionné automatiquement: <strong>${escapeHtml(pinnedClient.name || '-')}</strong>. Vous pouvez le changer si besoin.`;
}

function updateClientDropdown(options = {}){
  if(!shouldRenderClientDropdown(options)) return;
  const selectClient = $('selectClient');
  if(!selectClient) return;
  if(
    options.force !== true
    && options.immediate !== true
    && (isLargeDatasetMode() || importInProgress || heavyUiOperationCount > 0)
  ){
    selectClient.disabled = true;
    scheduleCreationDropdownRender(70);
    return;
  }
  const currentValue = creationPinnedClientId
    ? String(creationPinnedClientId)
    : String(selectClient.value || '');
  const editableClients = getEditableClients();
  let optionsHtml = editableClientsDropdownMarkupCache;
  if(
    editableClientsDropdownMarkupVersion !== editableClientsCacheVersion
    || editableClientsDropdownMarkupUserKey !== editableClientsCacheUserKey
  ){
    optionsHtml = editableClients
      .map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`)
      .join('');
    editableClientsDropdownMarkupCache = optionsHtml;
    editableClientsDropdownMarkupVersion = editableClientsCacheVersion;
    editableClientsDropdownMarkupUserKey = editableClientsCacheUserKey;
  }
  const markup = `<option value="">Client</option>${optionsHtml}`;
  const renderKey = [
    'client-dropdown',
    editableClientsCacheVersion,
    editableClientsCacheUserKey,
    creationPinnedClientId ? String(creationPinnedClientId) : 'none',
    optionsHtml.length
  ].join('::');
  setElementHtmlWithRenderKey(selectClient, markup, renderKey, { trustRenderKey: true });
  if(currentValue) selectClient.value = currentValue;
  selectClient.disabled = false;
  updateCreationPinnedClientUi();
}

function renderClients(options = {}){
  if(!shouldRenderDeferredSection('clients', options)) return;
  const q = normalizeCaseInsensitiveSearchText($('searchClientInput')?.value || '');
  const clientsBody = $('clientsBody');
  if(!clientsBody) return;
  renderImportHistoryPanel('globalImportHistory', 'global');
  const allVisibleClients = getClientListSummaries();
  const canDelete = canDeleteData();
  syncPaginationFilterState('clients', `${q}||${allVisibleClients.length}`);

  const renderRows = (rows)=>{
    const pageData = paginateRows(rows, 'clients');
    if(!pageData.rows.length){
      setElementHtmlWithRenderKey(
        clientsBody,
        '<tr><td colspan="3" class="diligence-empty">Aucun client trouvé.</td></tr>',
        ['clients-empty', q, pageData.page].join('::'),
        { trustRenderKey: true }
      );
      renderPagination('clients', { totalRows: 0, page: 1, totalPages: 1, from: 0, to: 0 });
      return;
    }
    const rowsHtml = pageData.rows.map(item=>{
      const c = item.client;
      const canEdit = item.canEdit;
      return `
        <tr>
          <td data-label="Client">${escapeHtml(item.name)}</td>
          <td data-label="Nb Dossiers">${item.dossierCount}</td>
          <td data-label="Actions" class="client-actions-cell">
            <button class="btn-primary" onclick="goToCreation(${item.id})" ${canEdit ? '' : 'disabled'}>
              <i class="fa-solid fa-plus"></i>
            </button>
            <button class="btn-danger" onclick="deleteClient(${item.id})" ${canDelete ? '' : 'disabled'}>
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
    setElementHtmlWithRenderKey(
      clientsBody,
      rowsHtml,
      [
        'clients-rows',
        dossierDataVersion,
        pageData.page,
        pageData.rows.length,
        q,
        allVisibleClients.length
      ].join('::'),
      { trustRenderKey: true }
    );
    renderPagination('clients', pageData);
  };

  const canUseWorker = !!getClientFilterWorker() && allVisibleClients.length >= 200;
  const scheduleRowsRender = (rows, loadingMessage = 'Chargement des clients...')=>{
    if(!shouldDeferHeavySectionRender(rows.length, options)){
      renderRows(rows);
      return;
    }
    scheduleDeferredSectionRender('clients', ()=>{
      const currentQuery = normalizeCaseInsensitiveSearchText($('searchClientInput')?.value || '');
      if(currentQuery !== q) return;
      renderRows(rows);
    }, {
      delayMs: 60,
      onPending: ()=>{
        clientsBody.innerHTML = `<tr><td colspan="3" class="diligence-empty">${escapeHtml(loadingMessage)}</td></tr>`;
      }
    });
  };
  if(!q){
    scheduleRowsRender(allVisibleClients);
    return;
  }
  if(!canUseWorker){
    scheduleRowsRender(allVisibleClients.filter(item=>item.nameLower.includes(q)), 'Filtrage des clients...');
    return;
  }

  const requestId = ++clientFilterRequestSeq;
  clientsBody.innerHTML = '<tr><td colspan="3" class="diligence-empty">Filtrage des clients...</td></tr>';
  const workerInput = allVisibleClients.map((item, idx)=>({
    idx,
    name: item.name
  }));

  runClientFilterInWorker(workerInput, q, requestId)
    .then((filteredIndexes)=>{
      if(requestId !== clientFilterRequestSeq) return;
      if(!Array.isArray(filteredIndexes)){
        renderRows(allVisibleClients.filter(item=>item.nameLower.includes(q)));
        return;
      }
      renderRows(filteredIndexes.map(idx=>allVisibleClients[idx]).filter(Boolean));
    })
    .catch(()=>{
      if(requestId !== clientFilterRequestSeq) return;
      renderRows(allVisibleClients.filter(item=>item.nameLower.includes(q)));
    });
}

function deleteClient(clientId){
  if(!canDeleteData()) return alert('Seul le gestionnaire peut supprimer un client');
  const idx = AppState.clients.findIndex(c=>c.id == clientId);
  if(idx === -1) return;
  const client = AppState.clients[idx];
  const dossierCount = Array.isArray(client.dossiers) ? client.dossiers.length : 0;
  const warning = dossierCount > 0
    ? `Supprimer le client "${client.name}" et ses ${dossierCount} dossier(s) ?`
    : `Supprimer le client "${client.name}" ?`;
  if(!window.confirm(warning)) return;

  pushRecycleBinEntry('client_delete', {
    client: JSON.parse(JSON.stringify(client || {})),
    importHistoryEntries: collectRelevantImportHistoryEntries({
      clientId: client.id,
      dossiers: Array.isArray(client?.dossiers) ? client.dossiers : []
    })
  });
  AppState.clients.splice(idx, 1);
  USERS = USERS.map(user=>{
    if(!Array.isArray(user.clientIds)) return user;
    return { ...user, clientIds: user.clientIds.filter(id => Number(id) !== Number(client.id)) };
  });
  syncImportHistoryWithCurrentState();
  handleDossierDataChange({
    audience: (Array.isArray(client?.dossiers) ? client.dossiers : []).some(dossierHasAudienceImpact)
  });
  persistClientPatchNow({
    action: 'delete',
    clientId: client.id
  }, { source: 'clients' }).catch((err)=>{
    console.warn('Impossible de supprimer le client sur le serveur', err);
  });
  refreshPrimaryViews({ includeRecycle: true, refreshClientDropdown: true });
}

function deleteAllClients(){
  if(!canDeleteData()) return alert('Seul le gestionnaire peut supprimer tous les clients');
  const totalClients = AppState.clients.length;
  if(!totalClients) return alert('Aucun client à supprimer');
  const totalDossiers = AppState.clients.reduce((sum, client)=>{
    const count = Array.isArray(client?.dossiers) ? client.dossiers.length : 0;
    return sum + count;
  }, 0);
  const warning =
    `Supprimer TOUS les clients (${totalClients}) et TOUS les dossiers (${totalDossiers}) ?\n\n`
    + 'Cette action est irréversible.';
  if(!window.confirm(warning)) return;

  pushRecycleBinEntry('all_clients_delete', {
    clients: JSON.parse(JSON.stringify(AppState.clients || [])),
    usersBeforeDelete: JSON.parse(JSON.stringify(USERS || []))
  });
  AppState.clients = [];
  AppState.importHistory = [];
  audienceDraft = {};
  audiencePrintSelection = new Set();
  diligencePrintSelection = new Set();
  USERS = ensureManagerUser(
    USERS.map(user=>({
      ...user,
      clientIds: []
    }))
  );

  persistClientPatchNow({
    action: 'delete-all'
  }, { source: 'clients' }).catch((err)=>{
    console.warn('Impossible de supprimer tous les clients sur le serveur', err);
  });
  refreshPrimaryViews({ includeSalle: true, includeRecycle: true, refreshClientDropdown: true });
}

function goToCreation(clientId){
  const client = AppState.clients.find(c=>c.id == clientId);
  if(!client || !canEditClient(client)) return alert('Accès refusé');
  creationPinnedClientId = String(clientId || '');
  resetCreationForm(clientId);
  showView('creation');
}

// ================== DOSSIERS ==================
async function addDossier(){
  try{
    if(!canEditData()) return alert('Accès refusé');
    const wasEditing = !!editingDossier;
    const client = AppState.clients.find(c=>c.id == $('selectClient').value);
    if(!client) return alert('Choisir client');
    if(!canEditClient(client)) return alert('Accès refusé');

    let selected = [...document.querySelectorAll('.proc-check:checked')].map(cb=>cb.value);
    const activeLabels = [...document.querySelectorAll('.checkbox-group label.active')]
      .map(l=>l.dataset.proc)
      .filter(Boolean);
    const customList = customProcedures.slice();
    const cardProcs = getProcedureCardNames();
    selected.push(...activeLabels, ...customList, ...cardProcs);
    selected = [...new Set(selected.map(v=>String(v).trim()).filter(Boolean))].filter(v=>v !== 'Autre');
    if(selected.length === 0) return alert('Choisir au moins une procédure');

    const details = collectProcedureDraftFromCards({ trimValues: true });

    const rawDateAffectation = String($('dateAffectation')?.value || '').trim();
    if(!rawDateAffectation){
      return alert('Date d’affectation obligatoire');
    }
    const normalizedDateAffectation = normalizeDateDDMMYYYY(rawDateAffectation);
    if(!normalizedDateAffectation){
      return alert('Date d’affectation invalide. Utilisez le format jj/mm/aaaa.');
    }
    if(!validateCreationReferenceClient()){
      return;
    }
    const montantGroups = getProcedureMontantGroupsForSave();
    const montantInputValue = String($('montantInput')?.value || '').trim();
    const montantFallbackRaw = montantInputValue || montantGroups.map(g=>String(g.montant || '').trim()).filter(Boolean).join(' | ');
    const montantFallback = getLowerMontantValue(montantFallbackRaw);
    const previousImportMeta = editingDossier
      ? AppState.clients.find(c=>c.id == editingDossier.clientId)?.dossiers?.[editingDossier.index]
      : null;

    const dossier = {
      importUid: String(previousImportMeta?.importUid || '').trim() || createImportTrackingId('dossier'),
      importGlobalBatchId: String(previousImportMeta?.importGlobalBatchId || '').trim(),
      importAudienceBatchId: String(previousImportMeta?.importAudienceBatchId || '').trim(),
      isManualEntry: editingDossier ? previousImportMeta?.isManualEntry === true : true,
      isAudienceOrphanImport: previousImportMeta?.isAudienceOrphanImport === true,
      createdAt: String(previousImportMeta?.createdAt || '').trim() || new Date().toISOString(),
      debiteur: $('debiteurInput').value.trim(),
      nRef: $('nRefInput')?.value.trim() || '',
      boiteNo: $('boiteNoInput')?.value.trim() || '',
      referenceClient: $('referenceClientInput').value.trim(),
      dateAffectation: normalizedDateAffectation,
      gestionnaire: $('gestionnaireInput')?.value.trim() || '',
      procedure: selected.join(', '),
      procedureList: selected.slice(),
      procedureDetails: details,
      ville: $('villeInput').value.trim(),
      adresse: $('adresseInput').value.trim(),
      montant: montantFallback,
      montantByProcedure: montantGroups,
      ww: $('wwInput').value.trim(),
      marque: $('marqueInput').value.trim(),
      type: $('typeInput').value.trim(),
      caution: $('cautionInput')?.value.trim() || '',
      cautionAdresse: $('cautionAdresseInput')?.value.trim() || '',
      cautionVille: $('cautionVilleInput')?.value.trim() || '',
      cautionCin: $('cautionCinInput')?.value.trim() || '',
      cautionRc: $('cautionRcInput')?.value.trim() || '',
      efNumber: $('efNumberInput')?.value.trim() || '',
      conservation: $('conservationInput')?.value.trim() || '',
      metrage: $('metrageInput')?.value.trim() || '',
      note: $('noteInput')?.value.trim() || '',
      avancement: $('avancementInput')?.value.trim() || '',
      statut: $('statutInput')?.value || 'En cours',
      files: await serializeUploadedFiles(uploadedFiles)
    };
    dossier.history = [];
    let dossierPatch = null;
    if(editingDossier){
      const prevClient = AppState.clients.find(c=>c.id == editingDossier.clientId);
      const previousDossier = prevClient?.dossiers?.[editingDossier.index];
      dossier.history = normalizeDossierHistoryEntries(previousDossier?.history);
      collectDossierDiffEntries(previousDossier, dossier).forEach(entry=>{
        queueDossierHistoryEntry(dossier, entry, { immediate: true });
      });
      if(prevClient && prevClient.id === client.id){
        prevClient.dossiers[editingDossier.index] = dossier;
      }else{
        if(prevClient) prevClient.dossiers.splice(editingDossier.index, 1);
        client.dossiers.push(dossier);
      }
      dossierPatch = {
        action: 'update',
        clientId: Number(editingDossier.clientId),
        dossierIndex: Number(editingDossier.index),
        targetClientId: Number(client.id),
        dossier
      };
    }else{
      dossier.history = [];
      client.dossiers.unshift(dossier);
      dossierPatch = {
        action: 'create',
        clientId: Number(client.id),
        dossier
      };
    }
    const previousAudienceImpact = editingDossier
      ? dossierHasAudienceImpact(
        AppState.clients.find(c=>c.id == editingDossier.clientId)?.dossiers?.[editingDossier.index] || {}
      )
      : false;
    const dossierRequiresAudienceRefresh = previousAudienceImpact || dossierHasAudienceImpact(dossier);
    if(dossierRequiresAudienceRefresh){
      reconcileAudienceOrphanDossiers();
    }
    handleDossierDataChange({ audience: dossierRequiresAudienceRefresh });
    if(dossierPatch){
      await persistDossierPatchNow(dossierPatch, { source: 'dossier' });
    }else{
      queuePersistAppState();
    }

    refreshPrimaryViews({ resetCreationForm: true, showView: 'suivi' });
  }catch(err){
    console.error(err);
    alert('Erreur pendant la sauvegarde du dossier');
  }
}

function handleFiles(e){
  let files = [];
  if(e.dataTransfer?.files) files = [...e.dataTransfer.files];
  if(e.target?.files) files = [...e.target.files];
  if(!files.length) return;
  files.forEach(f=>{
    uploadedFiles.push(f);
  });
  renderFileList();
}

function renderFileList(){
  const list = $('fileList');
  if(!list) return;
  list.innerHTML = '';
  uploadedFiles.forEach((f, idx)=>{
    const li = document.createElement('li');
    const name = document.createElement('span');
    const fileName = String(f?.name || `Fichier ${idx + 1}`);
    const fileSize = Number(f?.size || 0);
    const sizeText = fileSize ? ` (${Math.round(fileSize / 1024)} KB)` : '';
    name.textContent = `${fileName}${sizeText}`;

    const actions = document.createElement('span');
    actions.className = 'file-actions';

    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.className = 'btn-view';
    viewBtn.textContent = 'Voir';
    viewBtn.addEventListener('click', ()=>viewFile(idx));

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = 'Supprimer';
    removeBtn.addEventListener('click', ()=>removeFile(idx));

    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'btn-primary';
    downloadBtn.textContent = 'Télécharger';
    downloadBtn.addEventListener('click', ()=>downloadFile(idx));

    actions.appendChild(viewBtn);
    actions.appendChild(downloadBtn);
    actions.appendChild(removeBtn);
    li.appendChild(name);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

function viewFile(index){
  const f = uploadedFiles[index];
  if(!f) return;
  openStoredFile(f);
}

function downloadFile(index){
  const f = uploadedFiles[index];
  if(!f) return;
  downloadStoredFile(f);
}

function removeFile(index){
  uploadedFiles.splice(index, 1);
  renderFileList();
}

function getSuiviBaseRowsCached(){
  const viewerKey = getAudienceViewerCacheKey();
  if(
    suiviBaseRowsCache
    && suiviBaseRowsCacheVersion === dossierDataVersion
    && suiviBaseRowsCacheViewerKey === viewerKey
  ){
    return suiviBaseRowsCache;
  }

  const rawRows = getVisibleClients().flatMap(client=>buildSuiviRowsForClient(client));
  const hydratedBase = hydrateSuiviBaseRows(rawRows);
  const sortedDefaultRows = buildSortedSuiviRows(hydratedBase.rawRows);

  suiviBaseRowsCache = {
    rawRows: hydratedBase.rawRows,
    rowsMeta: hydratedBase.rowsMeta,
    tribunalState: hydratedBase.tribunalState,
    sortedDefaultRows
  };
  suiviBaseRowsCacheVersion = dossierDataVersion;
  suiviBaseRowsCacheViewerKey = viewerKey;
  return suiviBaseRowsCache;
}

function parseSuiviReferenceParts(value){
  const ref = normalizeReferenceForAudienceLookup(value);
  if(!ref) return null;
  const m = ref.match(/^([A-Za-z]+)?(\d+)([A-Za-z]+)?(\d+)?$/);
  if(m){
    return {
      prefix: String(m[1] || '').toLowerCase(),
      firstNum: Number(m[2] || 0),
      infix: String(m[3] || '').toLowerCase(),
      secondNum: Number(m[4] || 0),
      raw: ref
    };
  }
  const slash = ref.match(/^(\d+)\/(\d+)\/(\d{2,4})$/);
  if(slash){
    const yearRaw = Number(slash[3]);
    return {
      prefix: '',
      firstNum: Number(slash[2] || 0),
      infix: '',
      secondNum: Number.isFinite(yearRaw)
        ? (String(slash[3]).length === 2 ? (yearRaw >= 70 ? 1900 + yearRaw : 2000 + yearRaw) : yearRaw)
        : 0,
      raw: ref
    };
  }
  return {
    prefix: '',
    firstNum: 0,
    infix: '',
    secondNum: 0,
    raw: ref
  };
}

function buildSuiviRefDebiteurKey(row){
  if(typeof row?.__suiviPairKey === 'string' && row.__suiviPairKey) return row.__suiviPairKey;
  const rawReference = String(row?.d?.referenceClient || '').trim();
  if(isLetterOnlyClientReference(rawReference)) return '';
  const dossierRef = normalizeReferenceForAudienceLookup(rawReference);
  const ref = dossierRef || normalizeReferenceValue(rawReference);
  const debiteur = String(row?.d?.debiteur || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if(!ref) return '';
  const key = dossierRef
    ? `ref:${ref}`
    : (debiteur ? `pair:${ref}__${debiteur}` : `ref:${ref}`);
  if(row && typeof row === 'object') row.__suiviPairKey = key;
  return key;
}

function applySuiviDuplicateCounts(rows, pairCounts = null){
  const sourceRows = Array.isArray(rows) ? rows : [];
  sourceRows.forEach((row)=>{
    const key = row?.__suiviPairKey || buildSuiviRefDebiteurKey(row);
    row.__suiviDuplicateCount = key && pairCounts ? (pairCounts.get(key) || 0) : 0;
  });
}

function isSuiviRowDuplicate(row){
  return Number(row?.__suiviDuplicateCount || 0) >= 2;
}

function compareSuiviRowsByReferenceProximity(a, b, pairCounts = null){
  if(pairCounts){
    const pairKeyA = a?.__suiviPairKey || buildSuiviRefDebiteurKey(a);
    const pairKeyB = b?.__suiviPairKey || buildSuiviRefDebiteurKey(b);
    const pairCountA = pairKeyA ? (pairCounts.get(pairKeyA) || 0) : 0;
    const pairCountB = pairKeyB ? (pairCounts.get(pairKeyB) || 0) : 0;
    const isGroupedA = pairCountA >= 2 ? 1 : 0;
    const isGroupedB = pairCountB >= 2 ? 1 : 0;
    if(isGroupedA !== isGroupedB) return isGroupedB - isGroupedA;
    if(isGroupedA && isGroupedB && pairKeyA !== pairKeyB){
      if(pairCountA !== pairCountB) return pairCountB - pairCountA;
      const byPair = pairKeyA.localeCompare(pairKeyB, 'fr', { numeric: true, sensitivity: 'base' });
      if(byPair !== 0) return byPair;
    }
  }

  const createdAtA = Number(a?.createdAtTs || 0);
  const createdAtB = Number(b?.createdAtTs || 0);
  if((createdAtA || createdAtB) && createdAtA !== createdAtB){
    return createdAtB - createdAtA;
  }

  const refA = String(a?.d?.referenceClient || '').trim();
  const refB = String(b?.d?.referenceClient || '').trim();
  const pa = a?.__suiviRefParts !== undefined ? a.__suiviRefParts : parseSuiviReferenceParts(refA);
  const pb = b?.__suiviRefParts !== undefined ? b.__suiviRefParts : parseSuiviReferenceParts(refB);
  if(a && typeof a === 'object' && a.__suiviRefParts === undefined) a.__suiviRefParts = pa;
  if(b && typeof b === 'object' && b.__suiviRefParts === undefined) b.__suiviRefParts = pb;

  if(pa && pb){
    const byPrefix = pa.prefix.localeCompare(pb.prefix, 'fr', { sensitivity: 'base' });
    if(byPrefix !== 0) return byPrefix;
    if(pa.firstNum !== pb.firstNum) return pa.firstNum - pb.firstNum;
    const byInfix = pa.infix.localeCompare(pb.infix, 'fr', { sensitivity: 'base' });
    if(byInfix !== 0) return byInfix;
    if(pa.secondNum !== pb.secondNum) return pa.secondNum - pb.secondNum;
    const byRaw = pa.raw.localeCompare(pb.raw, 'fr', { numeric: true, sensitivity: 'base' });
    if(byRaw !== 0) return byRaw;
  }else if(pa){
    return -1;
  }else if(pb){
    return 1;
  }

  const byRef = refA.localeCompare(refB, 'fr', { numeric: true, sensitivity: 'base' });
  if(byRef !== 0) return byRef;
  const byClient = String(a?.c?.name || '').localeCompare(String(b?.c?.name || ''), 'fr', { sensitivity: 'base' });
  if(byClient !== 0) return byClient;
  return String(a?.d?.debiteur || '').localeCompare(String(b?.d?.debiteur || ''), 'fr', { sensitivity: 'base' });
}

function syncSuiviFilterOptions(rowsMeta){
  const procedureSelect = $('filterSuiviProcedure');
  const tribunalInput = $('filterSuiviTribunal');
  const tribunalOptions = $('filterSuiviTribunalOptions');
  if(!procedureSelect || !tribunalInput || !tribunalOptions) return;
  if(rowsMeta === suiviFilterOptionsRowsMetaRef){
    procedureSelect.value = filterSuiviProcedure;
    tribunalInput.value = filterSuiviTribunal === 'all' ? '' : getSuiviTribunalFilterLabel(filterSuiviTribunal);
    return;
  }

  const procedures = new Set();
  const tribunaux = new Map();
  rowsMeta.forEach(row=>{
    row.procSet.forEach(v=>procedures.add(String(v)));
    (row.tribunalKeys || []).forEach((key, idx)=>{
      const label = (row.tribunalList || [])[idx] || '';
      if(!key || !label) return;
      const existing = tribunaux.get(key);
      if(!existing || (!/\s/.test(existing) && /\s/.test(label))){
        tribunaux.set(key, label);
      }
    });
  });

  const sortedProcedures = [...procedures].sort((a,b)=>a.localeCompare(b, 'fr'));
  const sortedTribunaux = [...tribunaux.entries()].sort((a,b)=>a[1].localeCompare(b[1], 'fr'));
  suiviTribunalLabelMap = new Map(sortedTribunaux.map(([key, label])=>[key, label]));

  procedureSelect.innerHTML = `<option value="all">Toutes</option>${sortedProcedures.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}`;
  tribunalOptions.innerHTML = sortedTribunaux.map(([, label])=>`<option value="${escapeHtml(label)}"></option>`).join('');

  if(filterSuiviProcedure !== 'all' && !procedures.has(filterSuiviProcedure)){
    filterSuiviProcedure = 'all';
  }
  if(filterSuiviTribunal !== 'all'){
    filterSuiviTribunal = resolveSuiviTribunalFilterKey(filterSuiviTribunal);
  }
  if(filterSuiviTribunal !== 'all' && !tribunaux.has(filterSuiviTribunal)){
    filterSuiviTribunal = 'all';
  }

  procedureSelect.value = filterSuiviProcedure;
  tribunalInput.value = filterSuiviTribunal === 'all' ? '' : getSuiviTribunalFilterLabel(filterSuiviTribunal);
  suiviFilterOptionsRowsMetaRef = rowsMeta;
}

function renderProcedureBadges(procedureText){
  if(!procedureText) return '-';
  const items = Array.isArray(procedureText)
    ? procedureText.map(p=>String(p).trim()).filter(Boolean)
    : procedureText.split(',').map(p=>p.trim()).filter(Boolean);
  if(!items.length) return '-';
  const pills = items.map(name=>{
    let cls = 'proc-autre';
    if(name === 'ASS') cls = 'proc-ass';
    if(name === 'Restitution') cls = 'proc-restitution';
    if(name === 'Commandement') cls = 'proc-commandement';
    if(name === 'Nantissement') cls = 'proc-nantissement';
    if(name === 'Redressement') cls = 'proc-redressement';
    if(name === 'Vérification de créance') cls = 'proc-verification-creance';
    if(name === 'Liquidation judiciaire') cls = 'proc-declaration-creance';
    if(name === 'SFDC') cls = 'proc-sfdc';
    if(name === 'S/bien') cls = 'proc-sbien';
    if(name === 'Injonction') cls = 'proc-injonction';
    return `<span class="proc-pill ${cls}">${escapeHtml(name)}</span>`;
  }).join('');
  return `<div class="proc-pill-list">${pills}</div>`;
}

function buildSuiviDebiteurSearchVariants(value){
  const normalized = normalizeCaseInsensitiveSearchText(value || '');
  if(!normalized) return [];
  const tokens = normalized
    .split(/\s+/)
    .map(token=>token.trim())
    .filter(Boolean);
  if(tokens.length < 2) return [normalized];
  const reversed = [...tokens].reverse().join(' ');
  return [...new Set([normalized, reversed, ...tokens])];
}

function buildSuiviSearchHaystack(clientName, dossier, procedures, tribunaux){
  const fileNames = Array.isArray(dossier?.files)
    ? dossier.files.map(f=>String(f?.name || '').trim()).filter(Boolean)
    : [];
  const procedureDetailsValues = collectDeepValues(dossier?.procedureDetails || {});
  const diligenceValues = collectDeepValues(dossier?.diligence || {});
  const staticFields = [
    clientName || '',
    dossier?.debiteur || '',
    dossier?.nRef || '',
    ...buildSuiviDebiteurSearchVariants(dossier?.debiteur || ''),
    dossier?.boiteNo || '',
    dossier?.referenceClient || '',
    dossier?.dateAffectation || '',
    dossier?.gestionnaire || '',
    dossier?.procedure || '',
    ...(Array.isArray(dossier?.procedureList) ? dossier.procedureList : []),
    dossier?.ville || '',
    dossier?.adresse || '',
    dossier?.montant || '',
    dossier?.ww || '',
    dossier?.marque || '',
    dossier?.type || '',
    dossier?.caution || '',
    dossier?.cautionAdresse || '',
    dossier?.cautionVille || '',
    dossier?.cautionCin || '',
    dossier?.cautionRc || '',
    dossier?.efNumber || '',
    dossier?.conservation || '',
    dossier?.metrage || '',
    dossier?.note || '',
    dossier?.avancement || '',
    dossier?.statut || '',
    ...(Array.isArray(procedures) ? procedures : []),
    ...(Array.isArray(tribunaux) ? tribunaux : []),
    ...fileNames
  ];
  return [...staticFields, ...procedureDetailsValues, ...diligenceValues]
    .map(v=>normalizeCaseInsensitiveSearchText(v))
    .filter(Boolean)
    .join(' ');
}

function tokenizeNormalizedSearchText(value){
  return String(value || '')
    .split(/\s+/)
    .map(token=>token.trim())
    .filter(Boolean);
}

function matchesSuiviDebiteurSearch(debiteur, normalizedQuery){
  const queryTokens = tokenizeNormalizedSearchText(normalizedQuery);
  if(!queryTokens.length) return false;
  const debiteurTokens = tokenizeNormalizedSearchText(normalizeCaseInsensitiveSearchText(debiteur || ''));
  if(!debiteurTokens.length) return false;
  return queryTokens.every(queryToken=>debiteurTokens.some(nameToken=>nameToken.includes(queryToken)));
}

function getDiligenceSearchValues(row){
  if(!row || typeof row !== 'object') return [];
  const details = row.details || {};
  const values = [
    row.clientName,
    row.procedure,
    row.tribunal,
    row.dossier?.debiteur,
    row.dossier?.boiteNo,
    row.dossier?.referenceClient,
    row.dossier?.ville,
    details.referenceClient,
    details.dateDepot,
    details.depotLe,
    details.juge,
    details.sort,
    details.notificationNo,
    details.notificationStatus,
    details.notificationSort,
    details.lettreRec,
    details.curateurNo,
    details.notifCurateur,
    details.sortNotif,
    details.avisCurateur,
    details.pvPlice,
    details.dateNotification,
    details.certificatNonAppelStatus,
    details.executionNo,
    details.huissier,
    details.ord,
    details.notifConservateur,
    details.notifDebiteur,
    details.refExpertise,
    details.expert,
    details.dateVente
  ];
  return values
    .map(value=>normalizeDiligenceSearchQuery(value))
    .filter(Boolean);
}

function buildAudienceSearchHaystack(clientName, dossier, procKey, procedureData, draftData, row = null){
  const fileNames = Array.isArray(dossier?.files)
    ? dossier.files.map(f=>String(f?.name || '').trim()).filter(Boolean)
    : [];
  const resolvedStatus = String(row?.__resolvedStatus || dossier?.statut || '').trim();
  const resolvedStatusDetail = String(row?.__resolvedStatusDetail || dossier?.statutDetails || '').trim();
  const dossierValues = [
    clientName || '',
    dossier?.debiteur || '',
    dossier?.nRef || '',
    dossier?.boiteNo || '',
    dossier?.referenceClient || '',
    dossier?.dateAffectation || '',
    dossier?.gestionnaire || '',
    dossier?.ville || '',
    dossier?.adresse || '',
    dossier?.montant || '',
    dossier?.ww || '',
    dossier?.marque || '',
    dossier?.type || '',
    dossier?.caution || '',
    dossier?.cautionAdresse || '',
    dossier?.cautionVille || '',
    dossier?.cautionCin || '',
    dossier?.cautionRc || '',
    dossier?.note || '',
    dossier?.avancement || '',
    dossier?.statut || '',
    dossier?.statutDetails || '',
    resolvedStatus,
    resolvedStatusDetail,
    dossier?.procedure || '',
    ...(Array.isArray(dossier?.procedureList) ? dossier.procedureList : []),
    ...fileNames
  ];
  const procValues = [
    procKey || '',
    ...collectDeepValues(procedureData || {}),
    ...collectDeepValues(draftData || {})
  ];
  // Audience filtering must stay scoped to the current procedure row.
  return [...dossierValues, ...procValues]
    .map(v=>normalizeCaseInsensitiveSearchText(v))
    .join(' ');
}

function buildAudienceExactSearchTokens(row){
  if(!row || typeof row !== 'object') return [];
  const tokens = new Set();
  const pushRefToken = (value)=>{
    const key = normalizeReferenceForAudienceLookup(value);
    if(key) tokens.add(key);
  };
  const pushTextToken = (value)=>{
    const key = normalizeCaseInsensitiveSearchText(value);
    if(key) tokens.add(key);
  };
  pushRefToken(getAudienceRowDraftReferenceValue(row));
  pushRefToken(row?.d?.referenceClient || '');
  pushRefToken(row?.p?.referenceClient || '');
  pushTextToken(row?.d?.debiteur || '');
  pushTextToken(row?.d?.statut || '');
  pushTextToken(row?.d?.statutDetails || '');
  pushTextToken(row?.__resolvedStatus || '');
  pushTextToken(row?.__resolvedStatusDetail || '');
  return [...tokens];
}

function normalizeAudienceExactSearchQuery(value){
  const raw = String(value || '').trim();
  if(!raw) return '';
  const refKey = normalizeReferenceForAudienceLookup(raw);
  if(refKey && refKey.length >= 5) return refKey;
  const textKey = normalizeCaseInsensitiveSearchText(raw);
  if(textKey.length >= 6) return textKey;
  return '';
}

function getAudienceRowsByExactQuery(rows, query){
  const exactQuery = normalizeAudienceExactSearchQuery(query);
  if(!exactQuery) return null;
  const sourceRows = Array.isArray(rows) ? rows : [];
  let index = null;
  if(sourceRows === audienceExactSearchIndexCacheInput){
    index = audienceExactSearchIndexCacheOutput;
  }else{
    index = new Map();
    sourceRows.forEach((row)=>{
      const tokens = row.__exactSearchTokens || (row.__exactSearchTokens = buildAudienceExactSearchTokens(row));
      tokens.forEach((token)=>{
        if(!token) return;
        if(!index.has(token)) index.set(token, []);
        index.get(token).push(row);
      });
    });
    audienceExactSearchIndexCacheInput = sourceRows;
    audienceExactSearchIndexCacheOutput = index;
  }
  const matchedRows = index.get(exactQuery);
  return Array.isArray(matchedRows) && matchedRows.length ? matchedRows : null;
}

function computeAudienceRowContentScore(row){
  const refDossier = String(row?.draft?.refDossier ?? row?.p?.referenceClient ?? '').trim();
  const dateAudience = String(row?.draft?.dateAudience ?? row?.p?.audience ?? '').trim();
  const juge = String(row?.draft?.juge ?? row?.p?.juge ?? '').trim();
  const sort = String(row?.draft?.sort ?? row?.p?.sort ?? '').trim();
  const tribunal = String(row?.p?.tribunal || '').trim();
  let score = 0;
  if(refDossier) score += 4;
  if(dateAudience) score += 3;
  if(juge) score += 2;
  if(sort) score += 2;
  if(tribunal) score += 1;
  return score;
}

function getAudienceRowDedupeOrdonnanceRank(row){
  const status = getAudienceRowOrdonnanceStatus(row);
  if(status === 'att' || status === 'ok') return 1;
  return 0;
}

function compareAudienceRowsForDedupe(existing, next){
  const existingOrdonnanceRank = getAudienceRowDedupeOrdonnanceRank(existing);
  const nextOrdonnanceRank = getAudienceRowDedupeOrdonnanceRank(next);
  if(nextOrdonnanceRank !== existingOrdonnanceRank){
    return nextOrdonnanceRank - existingOrdonnanceRank;
  }

  const existingMissingGlobalRank = existing?.p?._missingGlobal ? 0 : 1;
  const nextMissingGlobalRank = next?.p?._missingGlobal ? 0 : 1;
  if(nextMissingGlobalRank !== existingMissingGlobalRank){
    return nextMissingGlobalRank - existingMissingGlobalRank;
  }

  const existingRefClientRank = existing?.p?._refClientMismatch ? 0 : 1;
  const nextRefClientRank = next?.p?._refClientMismatch ? 0 : 1;
  if(nextRefClientRank !== existingRefClientRank){
    return nextRefClientRank - existingRefClientRank;
  }

  const existingContentScore = getAudienceRowContentScore(existing);
  const nextContentScore = getAudienceRowContentScore(next);
  if(nextContentScore !== existingContentScore){
    return nextContentScore - existingContentScore;
  }

  const existingClosedRank = getAudienceStatusDerivedColor(existing?.__resolvedStatus || existing?.d?.statut || '') ? 1 : 0;
  const nextClosedRank = getAudienceStatusDerivedColor(next?.__resolvedStatus || next?.d?.statut || '') ? 1 : 0;
  if(nextClosedRank !== existingClosedRank){
    return nextClosedRank - existingClosedRank;
  }

  return 0;
}

function editDossier(clientId, index){
  if(!canEditData()) return alert('Accès refusé');
  clearCreationReferenceClientError();
  creationPinnedClientId = '';
  const client = AppState.clients.find(c=>c.id == clientId);
  if(!client) return;
  if(!canEditClient(client)) return alert('Accès refusé');
  const d = client.dossiers[index];
  if(!d) return;
  editingDossier = { clientId, index };
  editingOriginalProcedures = normalizeProcedures(d);
  showView('creation');

  $('selectClient').value = clientId;
  $('debiteurInput').value = d.debiteur || '';
  if($('nRefInput')) $('nRefInput').value = d.nRef || '';
  if($('boiteNoInput')) $('boiteNoInput').value = d.boiteNo || '';
  $('referenceClientInput').value = d.referenceClient || '';
  $('dateAffectation').value = normalizeDateDDMMYYYY(d.dateAffectation || '') || '';
  if($('gestionnaireInput')) $('gestionnaireInput').value = d.gestionnaire || '';
  $('villeInput').value = d.ville || '';
  $('adresseInput').value = d.adresse || '';
  $('montantInput').value = d.montant || '';
  $('wwInput').value = d.ww || '';
  $('marqueInput').value = d.marque || '';
  $('typeInput').value = d.type || '';
  if($('cautionInput')) $('cautionInput').value = d.caution || '';
  if($('cautionAdresseInput')) $('cautionAdresseInput').value = d.cautionAdresse || '';
  if($('cautionVilleInput')) $('cautionVilleInput').value = d.cautionVille || '';
  if($('cautionCinInput')) $('cautionCinInput').value = d.cautionCin || '';
  if($('cautionRcInput')) $('cautionRcInput').value = d.cautionRc || '';
  if($('efNumberInput')) $('efNumberInput').value = d.efNumber || '';
  if($('conservationInput')) $('conservationInput').value = d.conservation || '';
  if($('metrageInput')) $('metrageInput').value = d.metrage || '';
  if($('noteInput')) $('noteInput').value = d.note || '';
  if($('avancementInput')) $('avancementInput').value = d.avancement || '';
  if($('statutInput')) $('statutInput').value = d.statut || 'En cours';
  uploadedFiles = Array.isArray(d.files) ? d.files.map(f=>({ ...f })) : [];
  renderFileList();

  document.querySelectorAll('.proc-check').forEach(cb=>cb.checked=false);
  document.querySelectorAll('.checkbox-group label').forEach(l=>l.classList.remove('active'));

  const standard = new Set(['ASS','Restitution','Commandement','Nantissement','Redressement','Vérification de créance','Liquidation judiciaire','SFDC','S/bien','Injonction']);
  const procs = normalizeProcedures(d);
  procedureMontantGroups = normalizeProcedureMontantGroups(d.montantByProcedure, procs, d.montant || '');
  if(!hasMultipleAffectationDatesForSelection(procs)){
    const now = Date.now();
    const mainMontantValue = String(d.montant || '').trim()
      || String(procedureMontantGroups[0]?.montant || '').trim()
      || '';
    procedureMontantGroups = [{
      id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      montant: mainMontantValue,
      procedures: procs
    }];
  }
  renderProcedureMontantGroups();

  d.procedureList = procs.slice();
  d.procedure = procs.join(', ');
  customProcedures = procs.filter(p=>!standard.has(p));
  $('procedureCustom').value = '';
  renderCustomProcedures();

  activateProcedureCheckboxes(procs);

  const details = d.procedureDetails || {};
  const detailsKeys = Object.keys(details);
  renderProcedureDetails(procs);
  if(!getProcedureCardElements().length && detailsKeys.length){
    renderProcedureDetails(detailsKeys);
  }
  applyProcedureDraftToCards(details);
  const addBtn = $('addDossierBtn');
  if(addBtn) addBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Mettre à jour';
}

function deleteDossier(clientId, index){
  if(!canDeleteData()) return alert('Seul le gestionnaire peut supprimer un dossier');
  const client = AppState.clients.find(c=>c.id == clientId);
  if(!client) return;
  const dossier = client.dossiers[index];
  if(!dossier) return;
  const ref = dossier.referenceClient || dossier.debiteur || `#${index + 1}`;
  if(!window.confirm(`Supprimer définitivement le dossier "${ref}" ?`)) return;
  pushRecycleBinEntry('dossier_delete', {
    clientId: client.id,
    clientName: client.name || '',
    dossierIndex: index,
    dossier: JSON.parse(JSON.stringify(dossier || {})),
    importHistoryEntries: collectRelevantImportHistoryEntries({
      clientId: client.id,
      dossiers: [dossier]
    })
  });
  client.dossiers.splice(index, 1);
  syncImportHistoryWithCurrentState();
  handleDossierDataChange({ audience: dossierHasAudienceImpact(dossier) });
  persistDossierPatchNow({
    action: 'delete',
    clientId: Number(client.id),
    dossierIndex: Number(index),
    referenceClient: String(dossier.referenceClient || '').trim()
  }, { source: 'dossier-delete' }).catch(()=>{});
  closeDossierModal();
  refreshPrimaryViews({ includeRecycle: true });
}

function resetCreationForm(clientId = ''){
  editingDossier = null;
  editingOriginalProcedures = [];
  customProcedures = [];
  uploadedFiles = [];
  procedureMontantGroups = [];
  clearCreationReferenceClientError();

  document.querySelectorAll('#creationSection input').forEach(i=> i.value='');
  document.querySelectorAll('.proc-check').forEach(cb=>cb.checked=false);
  document.querySelectorAll('.checkbox-group label').forEach(l=>l.classList.remove('active'));
  $('procedureDetails').innerHTML = '';
  $('procedureCustom').value = '';
  renderCustomProcedures();
  syncConditionalCreationFieldsVisibility([]);
  if($('noteInput')) $('noteInput').value = '';
  if($('avancementInput')) $('avancementInput').value = '';
  if($('statutInput')) $('statutInput').value = 'En cours';
  if($('fileInput')) $('fileInput').value = '';
  if($('fileList')) $('fileList').innerHTML = '';
  renderProcedureMontantGroups();

  const selectClient = $('selectClient');
  if(selectClient){
    const selectedClientId = clientId ? String(clientId) : String(creationPinnedClientId || '');
    selectClient.value = selectedClientId;
    selectClient.disabled = false;
  }
  updateCreationPinnedClientUi();
  const addBtn = $('addDossierBtn');
  if(addBtn) addBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Créer le Dossier';
}

function closeDossierModal(){
  const modal = $('dossierModal');
  const body = $('dossierModalBody');
  if(body) body.innerHTML = '';
  if(modal) modal.style.display = 'none';
}

function openDossierDetails(clientId, index){
  flushAllDossierHistoryPendingEntries();
  const client = AppState.clients.find(c=>c.id == clientId);
  if(!client) return;
  const dossier = client.dossiers[index];
  if(!dossier) return;

  const body = $('dossierModalBody');
  const modal = $('dossierModal');
  if(!body || !modal) return;

  const files = Array.isArray(dossier.files) ? dossier.files : [];
  const detailsRows = [
    ['Client', client.name || '-'],
    ['N / ref', dossier.nRef || '-'],
    ['Débiteur', dossier.debiteur || '-'],
    ['Boîte N°', dossier.boiteNo || '-'],
    ['Référence Client', dossier.referenceClient || '-'],
    ['Date d’affectation', dossier.dateAffectation || '-'],
    ['Gestionnaire', dossier.gestionnaire || '-'],
    ['Procédure', dossier.procedure || '-'],
    ['Montant', dossier.montant || '-'],
    ['Ville', dossier.ville || '-'],
    ['Adresse', dossier.adresse || '-'],
    ['WW', dossier.ww || '-'],
    ['Marque', dossier.marque || '-'],
    ['Type', dossier.type || '-'],
    ['Caution', dossier.caution || '-'],
    ['Adresse de caution', dossier.cautionAdresse || '-'],
    ['Ville de caution', dossier.cautionVille || '-'],
    ['CIN de caution', dossier.cautionCin || '-'],
    ['RC', dossier.cautionRc || '-'],
    ['TF N°', dossier.efNumber || '-'],
    ['Conservation', dossier.conservation || '-'],
    ['Métrage', dossier.metrage || '-'],
    ['Statut', getDossierDisplayStatusSnapshot(dossier).statut || 'En cours'],
    ['Avancement', dossier.avancement || '-'],
    ['Note', dossier.note || '-']
  ];

  const detailsHtml = detailsRows.map(([label, value])=>`
    <div class="details-row">
      <div class="details-label">${escapeHtml(label)}</div>
      <div class="details-value">${label === 'Statut' ? renderStatusDisplay(value, getDossierDisplayStatusSnapshot(dossier).detail || '') : escapeHtml(value)}</div>
    </div>
  `).join('');

  const filesHtml = files.length
    ? files.map((f, i)=>`
      <div class="details-file-item">
        <span>${escapeHtml(String(f?.name || `Fichier ${i + 1}`))}</span>
        <span class="details-file-actions">
          <button type="button" class="btn-primary" onclick="viewDossierFile(${client.id}, ${index}, ${i})">Voir</button>
          <button type="button" class="btn-success" onclick="downloadDossierFile(${client.id}, ${index}, ${i})">Télécharger</button>
        </span>
      </div>
    `).join('')
    : '<div class="details-empty">Aucun document.</div>';
  const historyEntries = normalizeDossierHistoryEntries(dossier.history);
  const historyFilterDefinitions = getDossierHistoryFilterDefinitions(dossier, historyEntries);
  const historyFiltersHtml = historyEntries.length > 0
    ? `
      <div class="details-history-filters">
        ${historyFilterDefinitions.map((definition, index)=>renderDossierHistoryFilterButton(definition, index === 0)).join('')}
      </div>
    `
    : '';
  const historyHtml = historyEntries.length
    ? `
      ${historyFiltersHtml}
      <div class="details-history-list">
        ${[...historyEntries].reverse().map(renderDossierHistoryEntry).join('')}
      </div>
      <div class="details-empty details-history-empty-filter" style="display:none;">Aucune modification pour cette procédure.</div>
    `
    : '<div class="details-empty">Aucune modification enregistrée.</div>';

  body.innerHTML = `
    <div class="details-grid">
      ${detailsHtml}
    </div>
    <div class="details-files">
      <h3><i class="fa-solid fa-paperclip"></i> Documents</h3>
      ${filesHtml}
    </div>
    <div class="details-history">
      <h3><i class="fa-solid fa-clock-rotate-left"></i> Historique des modifications</h3>
      ${historyHtml}
    </div>
    <div class="details-actions">
      <button type="button" class="btn-primary" onclick="downloadDossierSummary(${client.id}, ${index})">
        <i class="fa-regular fa-eye"></i> Voir le fichier
      </button>
      <button type="button" class="btn-danger" onclick="deleteDossier(${client.id}, ${index})" ${canDeleteData() ? '' : 'disabled'}>
        <i class="fa-solid fa-trash"></i> Supprimer dossier
      </button>
    </div>
  `;

  modal.style.display = 'flex';
  const historyRoot = body.querySelector('.details-history');
  if(historyRoot){
    historyRoot.querySelectorAll('.details-history-filter-btn').forEach((button)=>{
      button.addEventListener('click', ()=>{
        applyDossierHistoryFilter(historyRoot, button.dataset.historyFilter || 'all');
      });
    });
    applyDossierHistoryFilter(historyRoot, 'all');
  }
}

function getClientByIdWithIndex(clientId){
  const index = AppState.clients.findIndex(client=>Number(client?.id) === Number(clientId));
  return {
    index,
    client: index >= 0 ? AppState.clients[index] : null
  };
}

function replaceRowsForClientIds(sourceRows, clientIds, buildRowsForClientId, getRowClientId){
  const rows = Array.isArray(sourceRows) ? sourceRows : [];
  const ids = [...new Set(
    (Array.isArray(clientIds) ? clientIds : [])
      .map(value=>Number(value))
      .filter(value=>Number.isFinite(value))
  )];
  if(!ids.length) return rows;
  const targetIds = new Set(ids);
  const insertedIds = new Set();
  const nextRows = [];
  rows.forEach((row)=>{
    const rowClientId = Number(typeof getRowClientId === 'function' ? getRowClientId(row) : NaN);
    if(!targetIds.has(rowClientId)){
      nextRows.push(row);
      return;
    }
    if(insertedIds.has(rowClientId)) return;
    insertedIds.add(rowClientId);
    const replacementRows = typeof buildRowsForClientId === 'function' ? buildRowsForClientId(rowClientId) : [];
    if(Array.isArray(replacementRows) && replacementRows.length){
      nextRows.push(...replacementRows);
    }
  });
  ids.forEach((clientId)=>{
    if(insertedIds.has(clientId)) return;
    const replacementRows = typeof buildRowsForClientId === 'function' ? buildRowsForClientId(clientId) : [];
    if(Array.isArray(replacementRows) && replacementRows.length){
      nextRows.push(...replacementRows);
    }
  });
  return nextRows;
}

function collectSuiviTribunalLabels(dossier){
  const labels = [];
  Object.values(dossier?.procedureDetails || {}).forEach((p)=>{
    const tribunal = normalizeLooseText(p?.tribunal || '');
    if(tribunal) labels.push(tribunal);
  });
  return [...new Set(labels)];
}

function buildSuiviRowForDossier(client, dossier, index){
  const procSource = normalizeProcedures(dossier);
  return {
    c: client,
    d: dossier,
    index,
    createdAtTs: getDossierCreatedAtSortValue(dossier),
    procSource,
    procSet: new Set(procSource),
    hasPendingDepot: false,
    __suiviPairKey: '',
    __suiviRefParts: undefined,
    tribunalLabels: collectSuiviTribunalLabels(dossier),
    tribunalKeys: [],
    tribunalList: []
  };
}

function buildSuiviRowsForClient(client){
  if(!client || !canViewClient(client)) return [];
  return (Array.isArray(client?.dossiers) ? client.dossiers : []).map((dossier, index)=>{
    return buildSuiviRowForDossier(client, dossier, index);
  });
}

function hydrateSuiviBaseRows(rawRows){
  const rows = Array.isArray(rawRows) ? rawRows : [];
  const tribunalState = buildTribunalClusterStateFromLabels(rows.flatMap(row=>row.tribunalLabels || []));
  const tribunalLabelByKey = new Map(tribunalState.options.map(v=>[v.key, v.label]));
  const rowsMeta = [];
  rows.forEach((row)=>{
    row.__suiviPairKey = buildSuiviRefDebiteurKey(row);
    row.__suiviRefParts = parseSuiviReferenceParts(row?.d?.referenceClient || '');
    row.hasPendingDepot = hasSuiviPendingDepotRow(row);
    const tribunalKeys = [...new Set((row.tribunalLabels || [])
      .map(label=>resolveSuiviTribunalFilterKey(label))
      .filter(Boolean))];
    const tribunalList = tribunalKeys
      .map(key=>tribunalLabelByKey.get(key) || '')
      .filter(Boolean);
    row.tribunalKeys = tribunalKeys;
    row.tribunalList = tribunalList;
    rowsMeta.push({ procSet: row.procSet, tribunalList, tribunalKeys });
  });
  return { rawRows: rows, rowsMeta, tribunalState };
}

function buildSortedSuiviRows(rawRows){
  const rows = Array.isArray(rawRows) ? rawRows : [];
  let sortedDefaultRows = rows;
  const visibleClientCount = getVisibleClients().length;
  const shouldSkipDefaultSort =
    rows.length > SUIVI_DEFAULT_SORT_MAX_ROWS
    || (visibleClientCount >= SUIVI_HEAVY_SORT_MAX_CLIENTS && rows.length >= SUIVI_HEAVY_SORT_MAX_ROWS);
  if(!shouldSkipDefaultSort){
    const duplicatePairCounts = new Map();
    rows.forEach((row)=>{
      const key = row.__suiviPairKey || buildSuiviRefDebiteurKey(row);
      if(!key) return;
      duplicatePairCounts.set(key, (duplicatePairCounts.get(key) || 0) + 1);
    });
    applySuiviDuplicateCounts(rows, duplicatePairCounts);
    sortedDefaultRows = rows
      .slice()
      .sort((a, b)=>compareSuiviRowsByReferenceProximity(a, b, duplicatePairCounts));
  }else{
    applySuiviDuplicateCounts(rows);
  }
  return sortedDefaultRows;
}

function getDossierByIds(clientId, index){
  const client = AppState.clients.find(c=>c.id == clientId);
  if(!client) return null;
  const dossier = client.dossiers[index];
  if(!dossier) return null;
  return { client, dossier };
}

function getDossierIndexByReference(clientId, dossierRef){
  const client = AppState.clients.find(c=>c.id == clientId);
  if(!client || !Array.isArray(client.dossiers)) return -1;
  return client.dossiers.indexOf(dossierRef);
}

function persistDossierReferenceNow(clientId, dossierRef, options = {}){
  const dossierIndex = getDossierIndexByReference(clientId, dossierRef);
  if(dossierIndex === -1) return Promise.resolve(false);
  return persistDossierPatchNow({
    action: 'update',
    clientId: Number(clientId),
    dossierIndex,
    targetClientId: Number(clientId),
    referenceClient: String(dossierRef?.referenceClient || '').trim(),
    dossier: dossierRef
  }, options);
}

function viewDossierFile(clientId, index, fileIndex){
  const data = getDossierByIds(clientId, index);
  if(!data) return;
  const file = data.dossier.files?.[fileIndex];
  openStoredFile(file);
}

function downloadDossierFile(clientId, index, fileIndex){
  const data = getDossierByIds(clientId, index);
  if(!data) return;
  const file = data.dossier.files?.[fileIndex];
  downloadStoredFile(file);
}

function formatDossierExcelCellValue(value, fallback = '-'){
  if(value === null || value === undefined) return fallback;
  if(typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if(typeof value === 'boolean') return value ? 'Oui' : 'Non';
  const text = String(value).trim();
  return text || fallback;
}

function buildDossierProcedureExportSections(dossier){
  const procedures = normalizeProcedures(dossier);
  const detailsByProcedure = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
    ? dossier.procedureDetails
    : {};
  const sections = [];

  procedures.forEach((procedureName)=>{
    const label = String(procedureName || '').trim();
    if(!label) return;
    const details = detailsByProcedure[label] && typeof detailsByProcedure[label] === 'object'
      ? detailsByProcedure[label]
      : {};
    const entries = Object.entries(details)
      .filter(([field, value])=>{
        if(String(field || '').startsWith('_')) return false;
        if(value === null || value === undefined) return false;
        const text = String(value).trim();
        return text !== '';
      });

    sections.push({
      procedure: label,
      rows: entries.map(([field, value])=>[
        getHistoryFieldLabel(`procedureDetails.${field}`),
        formatDossierExcelCellValue(value)
      ])
    });
  });

  return sections;
}

function getDossierProcedureExcelAccentColor(procedureName){
  const procClass = getProcedureColorClass(procedureName);
  if(procClass === 'proc-ass') return 'FF1A4590';
  if(procClass === 'proc-restitution') return 'FFD97706';
  if(procClass === 'proc-nantissement') return 'FF6D28D9';
  if(procClass === 'proc-redressement') return 'FF0F9D58';
  if(procClass === 'proc-verification-creance') return 'FF0F766E';
  if(procClass === 'proc-declaration-creance') return 'FFDB2777';
  if(procClass === 'proc-sfdc') return 'FF2563EB';
  if(procClass === 'proc-sbien') return 'FF7C3AED';
  if(procClass === 'proc-injonction') return 'FFEA580C';
  return 'FF1A4590';
}

function buildDossierSummarySections(client, dossier){
  const statusSnapshot = getDossierDisplayStatusSnapshot(dossier);
  return [
    {
      title: 'Informations generales',
      rows: [
        ['Client', formatDossierExcelCellValue(client?.name)],
        ['N / ref', formatDossierExcelCellValue(dossier?.nRef)],
        ['Debiteur', formatDossierExcelCellValue(dossier?.debiteur)],
        ['Boite N°', formatDossierExcelCellValue(dossier?.boiteNo)],
        ['Reference Client', formatDossierExcelCellValue(dossier?.referenceClient)],
        ['Date d’affectation', formatDossierExcelCellValue(dossier?.dateAffectation)],
        ['Gestionnaire', formatDossierExcelCellValue(dossier?.gestionnaire)],
        ['Procedure', formatDossierExcelCellValue(normalizeProcedures(dossier).join(', ') || dossier?.procedure)],
        ['Montant', formatDossierExcelCellValue(dossier?.montant)],
        ['Ville', formatDossierExcelCellValue(dossier?.ville)],
        ['Adresse', formatDossierExcelCellValue(dossier?.adresse)],
        ['WW', formatDossierExcelCellValue(dossier?.ww)],
        ['Marque', formatDossierExcelCellValue(dossier?.marque)],
        ['Type', formatDossierExcelCellValue(dossier?.type)]
      ]
    },
    {
      title: 'Caution',
      rows: [
        ['Caution', formatDossierExcelCellValue(dossier?.caution)],
        ['Adresse de caution', formatDossierExcelCellValue(dossier?.cautionAdresse)],
        ['Ville de caution', formatDossierExcelCellValue(dossier?.cautionVille)],
        ['CIN de caution', formatDossierExcelCellValue(dossier?.cautionCin)],
        ['RC', formatDossierExcelCellValue(dossier?.cautionRc)],
        ['TF N°', formatDossierExcelCellValue(dossier?.efNumber)],
        ['Conservation', formatDossierExcelCellValue(dossier?.conservation)],
        ['Métrage', formatDossierExcelCellValue(dossier?.metrage)]
      ]
    },
    {
      title: 'Suivi',
      rows: [
        ['Statut', formatDossierExcelCellValue(statusSnapshot.statut || 'En cours')],
        ['Avancement', formatDossierExcelCellValue(dossier?.avancement)],
        ['Note', formatDossierExcelCellValue(dossier?.note)]
      ]
    }
  ];
}

function buildDossierDocumentExportRows(files){
  if(!files.length){
    return [['#', 'Nom', 'Taille (KB)'], [1, 'Aucun document', '-']];
  }
  return [
    ['#', 'Nom', 'Taille (KB)'],
    ...files.map((file, fileIndex)=>[
      fileIndex + 1,
      formatDossierExcelCellValue(file?.name, 'Sans nom'),
      Math.round(Number(file?.size || 0) / 1024)
    ])
  ];
}

function appendDossierSectionToWorksheet(sheet, startRow, section, options = {}){
  const title = String(section?.title || '').trim() || 'Section';
  const rows = Array.isArray(section?.rows) ? section.rows : [];
  const accentColor = String(options.accentColor || 'FF1A4590');
  const sectionRow = sheet.getRow(startRow);
  sheet.mergeCells(`A${startRow}:B${startRow}`);
  sectionRow.getCell(1).value = title;
  sectionRow.height = 24;
  sectionRow.getCell(1).font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  sectionRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accentColor } };
  sectionRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

  rows.forEach((cells, index)=>{
    const rowNumber = startRow + index + 1;
    const row = sheet.getRow(rowNumber);
    row.height = 22;
    row.getCell(1).value = cells[0];
    row.getCell(2).value = cells[1];
  });
  return startRow + rows.length + 2;
}

function applyDossierWorksheetStyles(sheet, columnCount){
  const border = {
    top: { style: 'thin', color: { argb: 'FFD7DDEA' } },
    left: { style: 'thin', color: { argb: 'FFD7DDEA' } },
    bottom: { style: 'thin', color: { argb: 'FFD7DDEA' } },
    right: { style: 'thin', color: { argb: 'FFD7DDEA' } }
  };
  for(let rowIndex = 1; rowIndex <= sheet.rowCount; rowIndex++){
    const row = sheet.getRow(rowIndex);
    for(let colIndex = 1; colIndex <= columnCount; colIndex++){
      const cell = row.getCell(colIndex);
      if(rowIndex <= 2 && colIndex > 1) continue;
      const hasExplicitFill = !!(cell.fill && Object.keys(cell.fill).length);
      const hasExplicitFont = !!(cell.font && Object.keys(cell.font).length);
      if(rowIndex >= 4 && cell.value !== null && cell.value !== undefined && cell.value !== ''){
        cell.border = border;
      }
      if(rowIndex >= 4){
        cell.alignment = { horizontal: colIndex === 1 ? 'left' : 'left', vertical: 'middle', wrapText: true };
        if(!hasExplicitFont && colIndex === 1){
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF334155' } };
        }else if(!hasExplicitFont){
          cell.font = { name: 'Arial', size: 11, color: { argb: 'FF0F172A' } };
        }
        if(!hasExplicitFill && colIndex === 1){
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      }
    }
  }
}

async function createStyledDossierWorkbookBlob({ client, dossier, files, procedureSections, summarySections }){
  const workbook = new ExcelJS.Workbook();
  const title = 'CABINET ARAQUI HOUSSAINI';
  const dossierRef = formatDossierExcelCellValue(dossier?.referenceClient || dossier?.debiteur || `Dossier ${client?.id || ''}`, 'Dossier');

  const summarySheet = workbook.addWorksheet('Fiche dossier');
  summarySheet.columns = [{ width: 28 }, { width: 54 }];
  summarySheet.mergeCells('A1:B1');
  summarySheet.mergeCells('A2:B2');
  summarySheet.getCell('A1').value = title;
  summarySheet.getCell('A2').value = `Fiche dossier - ${dossierRef}`;
  summarySheet.getCell('A1').font = { name: 'Arial', size: 20, bold: true, color: { argb: 'FF1F3B8F' } };
  summarySheet.getCell('A2').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF475569' } };
  summarySheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 30;
  summarySheet.getRow(2).height = 22;

  let currentRow = 4;
  summarySections.forEach((section, index)=>{
    currentRow = appendDossierSectionToWorksheet(summarySheet, currentRow, section, {
      accentColor: index === 0 ? 'FF1A4590' : index === 1 ? 'FF0F766E' : 'FF2563EB'
    });
  });
  summarySheet.views = [{ state: 'frozen', ySplit: 3 }];
  applyDossierWorksheetStyles(summarySheet, 2);

  const proceduresSheet = workbook.addWorksheet('Procedures');
  proceduresSheet.columns = [{ width: 30 }, { width: 46 }];
  proceduresSheet.mergeCells('A1:B1');
  proceduresSheet.mergeCells('A2:B2');
  proceduresSheet.getCell('A1').value = title;
  proceduresSheet.getCell('A2').value = `Informations des procedures - ${dossierRef}`;
  proceduresSheet.getCell('A1').font = { name: 'Arial', size: 20, bold: true, color: { argb: 'FF1F3B8F' } };
  proceduresSheet.getCell('A2').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF475569' } };
  proceduresSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  proceduresSheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
  proceduresSheet.getRow(1).height = 30;
  proceduresSheet.getRow(2).height = 22;

  let procedureRow = 4;
  if(procedureSections.length){
    procedureSections.forEach((section)=>{
      procedureRow = appendDossierSectionToWorksheet(proceduresSheet, procedureRow, {
        title: section.procedure,
        rows: section.rows.length ? section.rows : [['Information', 'Aucune information de procédure']]
      }, {
        accentColor: getDossierProcedureExcelAccentColor(section.procedure)
      });
    });
  }else{
    procedureRow = appendDossierSectionToWorksheet(proceduresSheet, procedureRow, {
      title: 'Procedures',
      rows: [['Information', 'Aucune procédure enregistrée']]
    }, {
      accentColor: 'FF64748B'
    });
  }
  proceduresSheet.views = [{ state: 'frozen', ySplit: 3 }];
  applyDossierWorksheetStyles(proceduresSheet, 2);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob(
    [buffer],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
}

async function downloadDossierSummary(clientId, index){
  const data = getDossierByIds(clientId, index);
  if(!data) return;
  const { client, dossier } = data;
  const directExportHandlePromise = primeDirectExportDirectoryAccess();
  const richExcelReady = await ensureExcelLibraries({ needXlsx: true, needExcelJs: true, silent: true });
  if(!richExcelReady){
    const basicExcelReady = await ensureExcelLibraries({ needXlsx: true, needExcelJs: false });
    if(!basicExcelReady) return;
  }
  const canUseStyledWorkbook = typeof ExcelJS !== 'undefined';
  if(typeof XLSX === 'undefined' && !canUseStyledWorkbook){
    return;
  }
  const procedureSections = buildDossierProcedureExportSections(dossier);
  const summarySections = buildDossierSummarySections(client, dossier);
  let blob = null;

  if(canUseStyledWorkbook){
    blob = await createStyledDossierWorkbookBlob({
      client,
      dossier,
      procedureSections,
      summarySections
    });
  }else{
    const summaryAoA = [['CABINET ARAQUI HOUSSAINI'], [`Fiche dossier - ${formatDossierExcelCellValue(dossier.referenceClient || dossier.debiteur, 'Dossier')}`], []];
    summarySections.forEach((section)=>{
      summaryAoA.push([section.title, '']);
      section.rows.forEach((row)=>summaryAoA.push(row));
      summaryAoA.push([]);
    });

    const proceduresAoA = [['CABINET ARAQUI HOUSSAINI'], ['Informations des procedures'], []];
    if(procedureSections.length){
      procedureSections.forEach((section)=>{
        proceduresAoA.push([section.procedure, '']);
        proceduresAoA.push(['Champ', 'Valeur']);
        if(section.rows.length){
          section.rows.forEach((row)=>proceduresAoA.push(row));
        }else{
          proceduresAoA.push(['Information', 'Aucune information de procédure']);
        }
        proceduresAoA.push([]);
      });
    }else{
      proceduresAoA.push(['Procedures', '']);
      proceduresAoA.push(['Information', 'Aucune procédure enregistrée']);
    }

    const wb = XLSX.utils.book_new();
    const dossierSheet = XLSX.utils.aoa_to_sheet(summaryAoA);
    dossierSheet['!cols'] = [{ wch: 28 }, { wch: 54 }];
    XLSX.utils.book_append_sheet(wb, dossierSheet, 'Fiche dossier');

    const proceduresSheet = XLSX.utils.aoa_to_sheet(proceduresAoA);
    proceduresSheet['!cols'] = [{ wch: 30 }, { wch: 46 }];
    XLSX.utils.book_append_sheet(wb, proceduresSheet, 'Procedures');
    blob = createXlsxBlobFromWorkbook(wb);
  }

  const filename = `fiche_dossier_${client.id}_${index + 1}.xlsx`;
  await saveBlobDirectOrDownload(blob, filename, {
    preferredHandle: await directExportHandlePromise,
    openAfterExport: true
  });
}

// ================== DILIGENCE ==================
function makeDiligencePrintKey(clientId, dossierIndex, procedure){
  return `${clientId}::${dossierIndex}::${encodeURIComponent(String(procedure || ''))}`;
}

function isDiligenceSelectedForPrint(row){
  const key = makeDiligencePrintKey(row?.clientId, row?.dossierIndex, row?.procedure);
  return diligencePrintSelection.has(key);
}

function countSelectedDiligenceRows(rows){
  const list = Array.isArray(rows) ? rows : [];
  if(
    list === diligenceSelectionCountRowsRef
    && diligenceSelectionCountVersion === diligencePrintSelectionVersion
  ){
    return diligenceSelectionCountValue;
  }
  const out = list.reduce((count, row)=>count + (isDiligenceSelectedForPrint(row) ? 1 : 0), 0);
  diligenceSelectionCountRowsRef = list;
  diligenceSelectionCountVersion = diligencePrintSelectionVersion;
  diligenceSelectionCountValue = out;
  return out;
}

function syncDiligenceRenderedSelectionCache(rows, pageRows, stateKey, page){
  const filteredRows = Array.isArray(rows) ? rows : [];
  const visibleRows = Array.isArray(pageRows) ? pageRows : [];
  lastDiligenceRenderedRows = filteredRows;
  lastDiligenceRenderedPageRows = visibleRows;
  lastDiligenceRenderedStateKey = String(stateKey || '');
  lastDiligenceRenderedPage = Math.max(1, Number(page) || 1);
  lastDiligenceRenderedRowKeySet = new Set(
    filteredRows.map((row)=>makeDiligencePrintKey(row?.clientId, row?.dossierIndex, row?.procedure))
  );
  lastDiligenceRenderedSelectedCount = countSelectedDiligenceRows(filteredRows);
}

function getVisibleDiligencePageRowsForPrintSelection(){
  const currentStateKey = getDiligenceFilterStateKey(
    normalizeDiligenceSearchQuery($('diligenceSearchInput')?.value || '')
  );
  if(
    currentStateKey === lastDiligenceRenderedStateKey
    && lastDiligenceRenderedPage === (Number(paginationState.diligence) || 1)
  ){
    return lastDiligenceRenderedPageRows;
  }
  const filteredRows = getFilteredDiligenceRows(getDiligenceRows());
  const orderedRows = typeof orderDiligenceRowsByCheckedSelection === 'function'
    ? orderDiligenceRowsByCheckedSelection(filteredRows)
    : filteredRows;
  return getCurrentPageRows(orderedRows, 'diligence');
}

function getAllFilteredDiligenceRowsForPrintSelection(){
  const currentStateKey = getDiligenceFilterStateKey(
    normalizeDiligenceSearchQuery($('diligenceSearchInput')?.value || '')
  );
  if(currentStateKey === lastDiligenceRenderedStateKey){
    return lastDiligenceRenderedRows;
  }
  return getFilteredDiligenceRows(getDiligenceRows());
}

function syncDiligencePageSelectionToggle(){
  const rows = getAllFilteredDiligenceRowsForPrintSelection();
  const currentStateKey = getDiligenceFilterStateKey(
    normalizeDiligenceSearchQuery($('diligenceSearchInput')?.value || '')
  );
  const selected = (
    rows === lastDiligenceRenderedRows
    && currentStateKey === lastDiligenceRenderedStateKey
  )
    ? lastDiligenceRenderedSelectedCount
    : countSelectedDiligenceRows(rows);
  syncPageSelectionToggleControl('diligencePageSelectionToggle', 'diligenceCheckedCount', rows.length, selected);
}

function updateDiligenceCheckedCount(){
  const node = $('diligenceCheckedCountValue');
  if(node) node.textContent = String(diligencePrintSelection.size);
  syncDiligencePageSelectionToggle();
}

function clearDiligencePrintSelection(options = {}){
  if(!diligencePrintSelection.size){
    if(options.immediate) updateDiligenceCheckedCount();
    return false;
  }
  diligencePrintSelection = new Set();
  diligencePrintSelectionVersion += 1;
  lastDiligenceRenderedSelectedCount = 0;
  if(options.immediate){
    updateDiligenceCheckedCount();
    return true;
  }
  queueDiligenceCheckedCountRender();
  return true;
}

function queueDiligenceCheckedCountRender(){
  if(diligenceCheckedCountRenderQueued) return;
  diligenceCheckedCountRenderQueued = true;
  const render = ()=>{
    diligenceCheckedCountRenderQueued = false;
    updateDiligenceCheckedCount();
  };
  if(typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'){
    window.requestAnimationFrame(render);
    return;
  }
  setTimeout(render, 0);
}

function toggleDiligencePrintSelection(clientId, dossierIndex, procedure, checked){
  const key = makeDiligencePrintKey(clientId, dossierIndex, procedure);
  let changed = false;
  if(checked){
    const sizeBefore = diligencePrintSelection.size;
    diligencePrintSelection.add(key);
    if(diligencePrintSelection.size !== sizeBefore){
      changed = true;
      diligencePrintSelectionVersion += 1;
      if(lastDiligenceRenderedRowKeySet.has(key)){
        lastDiligenceRenderedSelectedCount = Math.min(
          lastDiligenceRenderedRows.length,
          lastDiligenceRenderedSelectedCount + 1
        );
      }
      queueDiligenceCheckedCountRender();
    }
  }else{
    if(diligencePrintSelection.delete(key)){
      changed = true;
      diligencePrintSelectionVersion += 1;
      if(lastDiligenceRenderedRowKeySet.has(key)){
        lastDiligenceRenderedSelectedCount = Math.max(0, lastDiligenceRenderedSelectedCount - 1);
      }
      queueDiligenceCheckedCountRender();
    }
  }
  if(changed && filterDiligenceCheckedFirst){
    paginationState.diligence = 1;
    renderDiligence();
  }
}

function toggleDiligencePrintSelectionEncoded(clientId, dossierIndex, procedureEncoded, checked){
  toggleDiligencePrintSelection(clientId, dossierIndex, decodeURIComponent(String(procedureEncoded)), checked);
}

function syncDiligencePrintSelection(allRows){
  const currentDataVersion = dossierDataVersion;
  if(currentDataVersion === diligencePrintSelectionPruneDataVersion){
    updateDiligenceCheckedCount();
    return;
  }
  const allowed = new Set((allRows || []).map(row=>makeDiligencePrintKey(row.clientId, row.dossierIndex, row.procedure)));
  const next = new Set([...diligencePrintSelection].filter(key=>allowed.has(key)));
  const changed = next.size !== diligencePrintSelection.size;
  diligencePrintSelection = next;
  diligencePrintSelectionPruneDataVersion = currentDataVersion;
  if(changed){
    diligencePrintSelectionVersion += 1;
    lastDiligenceRenderedSelectedCount = countSelectedDiligenceRows(lastDiligenceRenderedRows);
    queueDiligenceCheckedCountRender();
  }else{
    updateDiligenceCheckedCount();
  }
}

function setAllVisibleDiligenceRowsForPrint(checked){
  const filteredRows = getFilteredDiligenceRows(getDiligenceRows());
  const orderedRows = typeof orderDiligenceRowsByCheckedSelection === 'function'
    ? orderDiligenceRowsByCheckedSelection(filteredRows)
    : filteredRows;
  const rows = getCurrentPageRows(orderedRows, 'diligence');
  if(!rows.length){
    alert('Aucune ligne visible.');
    return;
  }
  let changed = false;
  rows.forEach(row=>{
    const key = makeDiligencePrintKey(row.clientId, row.dossierIndex, row.procedure);
    if(checked){
      const sizeBefore = diligencePrintSelection.size;
      diligencePrintSelection.add(key);
      if(diligencePrintSelection.size !== sizeBefore) changed = true;
    }else{
      if(diligencePrintSelection.delete(key)) changed = true;
    }
  });
  if(changed) diligencePrintSelectionVersion += 1;
  if(changed && getDiligenceFilterStateKey(normalizeDiligenceSearchQuery($('diligenceSearchInput')?.value || '')) === lastDiligenceRenderedStateKey){
    lastDiligenceRenderedSelectedCount = countSelectedDiligenceRows(lastDiligenceRenderedRows);
  }
  queueDiligenceCheckedCountRender();
  if(filterDiligenceCheckedFirst) paginationState.diligence = 1;
  renderDiligence();
}

function setAllFilteredDiligenceRowsForPrint(checked){
  const rows = getAllFilteredDiligenceRowsForPrintSelection();
  if(!rows.length){
    alert('Aucune ligne filtrée.');
    return;
  }
  let changed = false;
  rows.forEach(row=>{
    const key = makeDiligencePrintKey(row.clientId, row.dossierIndex, row.procedure);
    if(checked){
      const sizeBefore = diligencePrintSelection.size;
      diligencePrintSelection.add(key);
      if(diligencePrintSelection.size !== sizeBefore) changed = true;
    }else{
      if(diligencePrintSelection.delete(key)) changed = true;
    }
  });
  if(changed) diligencePrintSelectionVersion += 1;
  if(changed && rows === lastDiligenceRenderedRows){
    lastDiligenceRenderedSelectedCount = checked ? rows.length : 0;
  }
  queueDiligenceCheckedCountRender();
  if(filterDiligenceCheckedFirst) paginationState.diligence = 1;
  renderDiligence();
}

function getDiligenceProcedureFilterValue(procedure){
  return getProcedureBaseName(String(procedure || '').trim());
}

function getDiligenceProcedureVariantValue(procedure){
  const raw = String(procedure || '').trim();
  if(!raw) return '';
  return parseProcedureToken(raw) || raw;
}

function getDiligenceRowProcedureFilterValue(row){
  if(!row || typeof row !== 'object') return '';
  return getDiligenceProcedureVariantValue(row.procedureFilterValue || row.procedure || '');
}

function isDiligenceAssProcedure(procedure){
  return getDiligenceProcedureFilterValue(procedure) === 'ASS';
}

function isDiligenceCommandementProcedure(procedure){
  return getDiligenceProcedureFilterValue(procedure) === 'Commandement';
}

function matchesDiligenceProcedureFilter(procedure, filterValue){
  const activeFilter = String(filterValue || 'all').trim() || 'all';
  if(activeFilter === 'all') return true;
  const procedureValue = typeof procedure === 'object' && procedure
    ? getDiligenceRowProcedureFilterValue(procedure)
    : getDiligenceProcedureVariantValue(procedure);
  return procedureValue === getDiligenceProcedureVariantValue(activeFilter);
}

function isDiligenceExecutionProcedure(procedure){
  const proc = getDiligenceProcedureFilterValue(procedure);
  return proc === 'SFDC' || proc === 'S/bien' || proc === 'Injonction';
}

function isDiligenceFreeTextExecutionSortProcedure(procedure){
  const proc = getDiligenceProcedureFilterValue(procedure);
  return proc === 'SFDC' || proc === 'Injonction';
}

function isDiligenceAssAudienceDue(details){
  const audienceDateRaw = normalizeDateDDMMYYYY(details?.audience || '') || String(details?.audience || '').trim();
  if(!audienceDateRaw) return false;
  const parsed = parseDateForAge(audienceDateRaw);
  if(!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) return false;
  const audienceDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return audienceDay < todayStart.getTime();
}

function shouldRestrictDiligenceAssAttOrdToAudience(){
  return getDiligenceProcedureFilterValue(filterDiligenceProcedure) === 'ASS'
    && normalizeDiligenceOrdonnance(filterDiligenceOrdonnance) === 'att';
}

function getDiligenceAudienceAssAttOrdKeySet(){
  const viewerKey = getAudienceViewerCacheKey();
  if(
    getDiligenceAudienceAssAttOrdKeySet._cache
    && getDiligenceAudienceAssAttOrdKeySet._version === audienceRowsRawDataVersion
    && getDiligenceAudienceAssAttOrdKeySet._viewerKey === viewerKey
  ){
    return getDiligenceAudienceAssAttOrdKeySet._cache;
  }
  const set = new Set();
  getAudienceRowsRawCached().forEach((row)=>{
    if(row?.__procFilterKey !== 'ASS') return;
    if(!audienceRowMatchesColorFilter(row, 'green')) return;
    set.add(makeDiligencePrintKey(row?.c?.id, row?.di, row?.procKey));
  });
  getDiligenceAudienceAssAttOrdKeySet._cache = set;
  getDiligenceAudienceAssAttOrdKeySet._version = audienceRowsRawDataVersion;
  getDiligenceAudienceAssAttOrdKeySet._viewerKey = viewerKey;
  return set;
}

function isDiligenceAudienceAssAttOrdRow(row){
  return getDiligenceAudienceAssAttOrdKeySet().has(
    makeDiligencePrintKey(row?.clientId, row?.dossierIndex, row?.procedure)
  );
}

function getDiligenceRows(){
  const viewerKey = getAudienceViewerCacheKey();
  if(
    diligenceRowsCache
    && diligenceRowsCacheVersion === dossierDataVersion
    && diligenceRowsCacheViewerKey === viewerKey
  ){
    return diligenceRowsCache;
  }
  const rows = [];
  getVisibleClients().forEach(c=>{
    c.dossiers.forEach((d, di)=>{
      const procedures = normalizeProcedures(d);
      procedures.forEach(proc=>{
        const baseProc = getDiligenceProcedureFilterValue(proc);
        if(
          baseProc !== 'ASS'
          && baseProc !== 'SFDC'
          && baseProc !== 'S/bien'
          && baseProc !== 'Injonction'
          && baseProc !== 'Commandement'
        ) return;
        const details = d?.procedureDetails?.[proc] || {};
        const isCommandement = baseProc === 'Commandement';
        const tribunal = isCommandement ? '' : String(details.tribunal || '').trim();
        const rawSort = String(details.sort || '').trim();
        const sort = isDiligenceExecutionProcedure(baseProc) && !isDiligenceFreeTextExecutionSortProcedure(baseProc)
          ? normalizeDiligenceSort(rawSort)
          : rawSort;
        const delegation = isCommandement
          ? ''
          : (normalizeDiligenceAttOk(details.attDelegationOuDelegat || '') || 'att');
        const ordonnance = isCommandement
          ? String(details.ord || '').trim()
          : (shouldShowBlankDiligenceOrdonnance({
            procedure: proc,
            details
          })
            ? ''
            : (getDiligenceOrdonnanceStatus(
              details.attOrdOrOrdOk || '',
              details.notificationNo || ''
            ) || 'att'));
        rows.push({
          clientId: c.id,
          dossierIndex: di,
          clientName: c.name || '',
          dossier: d,
          procedure: proc,
          procedureFilterValue: proc,
          details,
          sort,
          delegation,
          ordonnance,
          tribunal,
          tribunalFilterKey: makeTribunalFilterKey(tribunal),
          canEdit: canEditClient(c)
        });
      });
    });
  });
  const out = dedupeDiligenceRowsByReferenceAndDebiteur(rows);
  diligenceRowsCache = out;
  diligenceRowsCacheVersion = dossierDataVersion;
  diligenceRowsCacheViewerKey = viewerKey;
  return out;
}

function getDiligenceRowsScopedForAuxFilters(rows){
  const list = Array.isArray(rows) ? rows : [];
  if(filterDiligenceProcedure === 'all') return list;
  return list.filter(row=>matchesDiligenceProcedureFilter(row, filterDiligenceProcedure));
}

function resetDiligenceAuxFilters(){
  filterDiligenceSort = 'all';
  filterDiligenceDelegation = 'all';
  filterDiligenceOrdonnance = 'all';
  filterDiligenceTribunal = 'all';
  const sortSelect = $('diligenceSortFilter');
  if(sortSelect) sortSelect.value = 'all';
  const delegationSelect = $('diligenceDelegationFilter');
  if(delegationSelect) delegationSelect.value = 'all';
  const ordonnanceSelect = $('diligenceOrdonnanceFilter');
  if(ordonnanceSelect) ordonnanceSelect.value = 'all';
  const tribunalInput = $('diligenceTribunalFilter');
  if(tribunalInput) tribunalInput.value = '';
}

function syncDiligenceProcedureFilter(rows){
  const select = $('diligenceProcedureFilter');
  if(!select) return;
  if(rows === diligenceFilterProcedureRowsRef){
    select.value = filterDiligenceProcedure;
    return;
  }
  const set = new Set();
  rows.forEach(r=>{
    const procedureValue = getDiligenceRowProcedureFilterValue(r);
    if(procedureValue) set.add(procedureValue);
  });
  const sorted = [...set].sort((a,b)=>a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' }));
  select.innerHTML = `<option value="all">Toutes</option>${sorted.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}`;
  if(!set.has(filterDiligenceProcedure)){
    filterDiligenceProcedure = 'all';
  }
  select.value = filterDiligenceProcedure;
  diligenceFilterProcedureRowsRef = rows;
}

function syncDiligenceTribunalFilter(rows){
  const tribunalInput = $('diligenceTribunalFilter');
  const tribunalOptions = $('diligenceTribunalOptions');
  if(!tribunalInput || !tribunalOptions) return;
  if(rows === diligenceFilterTribunalRowsRef){
    tribunalInput.value = filterDiligenceTribunal === 'all' ? '' : getDiligenceTribunalFilterLabel(filterDiligenceTribunal);
    return;
  }
  const tribunalState = buildTribunalClusterStateFromLabels(
    rows.map(r=>normalizeLooseText(r?.tribunal || '')).filter(Boolean)
  );
  diligenceTribunalAliasMap = tribunalState.aliasMap;
  diligenceTribunalLabelMap = new Map(tribunalState.options.map(({ key, label })=>[key, label]));
  tribunalOptions.innerHTML = tribunalState.options.map(({ label })=>`<option value="${escapeHtml(label)}"></option>`).join('');
  if(filterDiligenceTribunal !== 'all'){
    filterDiligenceTribunal = resolveDiligenceTribunalFilterKey(filterDiligenceTribunal);
  }
  if(filterDiligenceTribunal !== 'all' && !tribunalState.keySet.has(filterDiligenceTribunal)){
    filterDiligenceTribunal = 'all';
  }
  tribunalInput.value = filterDiligenceTribunal === 'all' ? '' : getDiligenceTribunalFilterLabel(filterDiligenceTribunal);
  diligenceFilterTribunalRowsRef = rows;
}

function syncDiligenceSortFilter(rows){
  const select = $('diligenceSortFilter');
  if(!select) return;
  if(rows === diligenceFilterSortRowsRef){
    select.value = filterDiligenceSort;
    return;
  }
  const set = new Set();
  rows.forEach(r=>{
    const sort = String(r.sort || '').trim();
    if(sort) set.add(sort);
  });
  const sorted = [...set].sort((a,b)=>a.localeCompare(b, 'fr'));
  select.innerHTML = `<option value="all">Tous</option>${sorted.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}`;
  if(filterDiligenceSort !== 'all' && !set.has(filterDiligenceSort)){
    filterDiligenceSort = 'all';
  }
  select.value = filterDiligenceSort;
  diligenceFilterSortRowsRef = rows;
}

function syncDiligenceDelegationFilter(rows){
  const select = $('diligenceDelegationFilter');
  if(!select) return;
  if(rows === diligenceFilterDelegationRowsRef){
    select.value = filterDiligenceDelegation;
    return;
  }
  const set = new Set();
  rows.forEach(r=>{
    const delegation = String(r.delegation || '').trim();
    if(delegation) set.add(delegation);
  });
  const sorted = [...set].sort((a,b)=>a.localeCompare(b, 'fr'));
  select.innerHTML = `<option value="all">Toutes</option>${sorted.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}`;
  if(filterDiligenceDelegation !== 'all' && !set.has(filterDiligenceDelegation)){
    filterDiligenceDelegation = 'all';
  }
  select.value = filterDiligenceDelegation;
  diligenceFilterDelegationRowsRef = rows;
}

function syncDiligenceOrdonnanceFilter(rows){
  const select = $('diligenceOrdonnanceFilter');
  if(!select) return;
  const currentFilter = filterDiligenceOrdonnance === 'all'
    ? 'all'
    : (normalizeDiligenceOrdonnance(filterDiligenceOrdonnance) || 'all');
  if(rows === diligenceFilterOrdonnanceRowsRef){
    select.value = currentFilter;
    return;
  }
  const set = new Set();
  rows.forEach(r=>{
    const ordonnance = normalizeDiligenceOrdonnance(r.ordonnance || '');
    if(ordonnance) set.add(ordonnance);
  });
  const sorted = [...set].sort((a, b)=>getDiligenceOrdonnanceLabel(a).localeCompare(getDiligenceOrdonnanceLabel(b), 'fr'));
  select.innerHTML = `<option value="all">Toutes</option>${sorted.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(getDiligenceOrdonnanceLabel(v))}</option>`).join('')}`;
  filterDiligenceOrdonnance = currentFilter;
  if(filterDiligenceOrdonnance !== 'all' && !set.has(filterDiligenceOrdonnance)){
    filterDiligenceOrdonnance = 'all';
  }
  select.value = filterDiligenceOrdonnance;
  diligenceFilterOrdonnanceRowsRef = rows;
}

function normalizeDiligenceAttOk(value){
  const raw = String(value ?? '').trim().toLowerCase();
  if(!raw) return '';
  if(raw.includes('ok')) return 'ok';
  if(raw.includes('att')) return 'att';
  return '';
}

function normalizeDiligenceOrdonnance(value){
  return normalizeDiligenceAttOk(value);
}

function isDiligenceNotificationNumberOrdOk(value){
  const raw = String(value ?? '').trim().replace(/\s+/g, '');
  if(!raw) return false;
  return /^\d+$/.test(raw) || /^\d+(\/\d+)+$/.test(raw);
}

function getDiligenceOrdonnanceStatus(value, notificationNo = ''){
  const normalized = normalizeDiligenceOrdonnance(value);
  if(normalized) return normalized;
  if(isDiligenceNotificationNumberOrdOk(notificationNo)) return 'ok';
  return '';
}

function getDiligenceOrdonnanceLabel(value, notificationNo = ''){
  const status = getDiligenceOrdonnanceStatus(value, notificationNo);
  if(status === 'ok') return 'ORD OK';
  if(status === 'att') return 'ATT ORD';
  return String(value || '').trim();
}

function getDiligenceOrdonnanceLabelFromDetails(details){
  const status = getDiligenceOrdonnanceStatus(
    details?.attOrdOrOrdOk || '',
    details?.notificationNo || ''
  );
  if(status === 'ok') return 'ORD OK';
  if(status === 'att') return 'ATT ORD';
  return '';
}

function getDiligenceOrdonnanceSearchValues(value, notificationNo = ''){
  const status = getDiligenceOrdonnanceStatus(value, notificationNo);
  if(status === 'ok') return ['ok', 'ord ok'];
  if(status === 'att') return ['att', 'att ord'];
  return [];
}

function normalizeDiligenceSort(value){
  const raw = String(value ?? '').trim().toLowerCase();
  if(!raw) return 'Att PV';
  if(raw.includes('ok')) return 'PV OK';
  if(raw.includes('att')) return 'Att PV';
  if(raw === 'pv') return 'Att PV';
  return 'Att PV';
}

function normalizeDiligenceNotificationSort(value){
  const raw = String(value ?? '').trim().toLowerCase();
  if(!raw) return '';
  if(raw === 'nb') return 'NB';
  if(raw.includes('notif')) return 'notifier';
  return String(value ?? '').trim();
}

function getDiligenceNotificationSortValue(value, procedure = ''){
  const normalized = normalizeDiligenceNotificationSort(value);
  if(normalized) return normalized;
  if(isDiligenceAssProcedure(procedure)) return 'notifier';
  return '';
}

function getDiligenceReferenceDossierValue(row){
  if(isDiligenceCommandementProcedure(row?.procedure)){
    return String(row?.details?.refExpertise || '').trim();
  }
  return String(row?.details?.referenceClient || '').trim();
}

function shouldShowBlankDiligenceOrdonnance(row){
  if(!isDiligenceExecutionProcedure(row?.procedure) || isDiligenceCommandementProcedure(row?.procedure)){
    return false;
  }
  return !String(getDiligenceReferenceDossierValue(row) || '').trim();
}

function getDiligenceOrdonnanceCellValue(row){
  if(isDiligenceCommandementProcedure(row?.procedure)){
    return String(row?.details?.ord || '').trim();
  }
  if(shouldShowBlankDiligenceOrdonnance(row)){
    return '';
  }
  return getDiligenceOrdonnanceLabelFromDetails(row?.details) || '';
}

function getDiligenceNotificationNumberCellValue(row){
  if(isDiligenceCommandementProcedure(row?.procedure)){
    return String(row?.details?.notifConservateur || '').trim();
  }
  return String(row?.details?.notificationNo || '').trim();
}

function getDiligenceNotificationSortCellValue(row){
  if(isDiligenceCommandementProcedure(row?.procedure)){
    return String(row?.details?.notifDebiteur || '').trim();
  }
  return getDiligenceNotificationSortValue(row?.details?.notificationSort || '', row?.procedure);
}

function getDiligenceDelegationCellValue(row){
  if(isDiligenceCommandementProcedure(row?.procedure)){
    return String(row?.details?.dateVente || '').trim();
  }
  return isDiligenceAssNbLayout(row)
    ? String(row?.details?.notifCurateur || '').trim()
    : (normalizeDiligenceAttOk(row?.details?.attDelegationOuDelegat || '') || '');
}

function getDiligenceHuissierCellValue(row){
  if(isDiligenceCommandementProcedure(row?.procedure)){
    return String(row?.details?.expert || '').trim();
  }
  return isDiligenceAssNbLayout(row)
    ? String(row?.details?.sortNotif || '').trim()
    : String(row?.details?.huissier || '').trim();
}

function getDiligenceExecutionSortCellValue(row){
  if(isDiligenceCommandementProcedure(row?.procedure)){
    return String(row?.details?.sort || '').trim();
  }
  if(isDiligenceAssNbLayout(row)){
    return getDiligenceAvisCurateurValue(row?.details?.avisCurateur || '');
  }
  if(isDiligenceFreeTextExecutionSortProcedure(row?.procedure)){
    return String(row?.details?.sort || '').trim();
  }
  return !isDiligenceAssProcedure(row?.procedure)
    ? normalizeDiligenceSort(row?.details?.sort || '')
    : '';
}

function getDiligenceTribunalCellValue(row){
  if(isDiligenceCommandementProcedure(row?.procedure)) return '';
  return String(row?.tribunal || row?.details?.tribunal || '').trim();
}

function isDiligenceAssNbLayout(row){
  return isDiligenceAssProcedure(row?.procedure)
    && getDiligenceNotificationSortValue(row?.details?.notificationSort || '', row?.procedure) === 'NB';
}

function getDiligenceAssHeaderMode(rows){
  const list = Array.isArray(rows) ? rows.filter(row=>isDiligenceAssProcedure(row?.procedure)) : [];
  if(!list.length) return 'default';
  const nbCount = list.reduce((count, row)=>count + (isDiligenceAssNbLayout(row) ? 1 : 0), 0);
  if(nbCount === 0) return 'default';
  if(nbCount === list.length) return 'nb';
  return 'mixed';
}

function normalizeDiligenceLettreRec(value){
  const raw = String(value ?? '').trim().toLowerCase();
  if(!raw) return '';
  if(raw.includes('retour')) return 'att retour la lettre';
  if(raw === 'ok' || raw.includes(' ok')) return 'OK';
  if(raw.includes('lettre') || raw.includes('tr')) return 'att lettre du TR';
  return String(value ?? '').trim();
}

function getDiligenceLettreRecValue(value){
  const normalized = normalizeDiligenceLettreRec(value);
  return normalized || 'att lettre du TR';
}

function normalizeDiligenceAvisCurateur(value){
  const raw = String(value ?? '').trim().toLowerCase();
  if(!raw) return '';
  if(raw.includes('pub au j') || raw.includes('pubauj') || raw.includes('auj') || raw.includes('au j') || raw.includes('anj')){
    return 'pub au J';
  }
  if(raw.includes('att pub') || raw === 'ok' || raw.includes(' ok')){
    return 'Att Pub.';
  }
  if(raw.includes('tr') || raw.includes('avis') || raw.includes('envoyer')){
    return 'Avis en TR';
  }
  return String(value ?? '').trim();
}

function getDiligenceAvisCurateurValue(value){
  const normalized = normalizeDiligenceAvisCurateur(value);
  return normalized || 'Avis en TR';
}

function getDiligencePvPliceValue(value){
  return normalizeDiligenceAttOk(value) || 'att';
}

function normalizeDiligenceSearchQuery(value){
  return normalizeLooseText(String(value || '').trim()).toLowerCase();
}

function isDiligenceExecutionOnlyQuery(value){
  // Keep diligence search strict: no shortcut should broaden the result set.
  return false;
}

function hasDiligenceExecutionNumber(row){
  return !!String(row?.details?.executionNo || '').trim();
}

const DILIGENCE_AUTOSIZE_FIELDS = new Set([
  'referenceClient',
  'juge',
  'attOrdOrOrdOk',
  'lettreRec',
  'curateurNo',
  'executionNo',
  'notifCurateur',
  'sortNotif',
  'avisCurateur',
  'pvPlice',
  'ville',
  'attDelegationOuDelegat',
  'huissier',
  'sort',
  'tribunal'
]);

function shouldAutoSizeDiligenceField(field){
  return DILIGENCE_AUTOSIZE_FIELDS.has(String(field || '').trim());
}

function getDiligenceAutoSizeWidthCh(field, text){
  const rawField = String(field || '').trim();
  const value = String(text || '').trim();
  const minByField = {
    referenceClient: 18,
    juge: 16,
    attOrdOrOrdOk: 10,
    lettreRec: 16,
    curateurNo: 14,
    executionNo: 14,
    notifCurateur: 16,
    sortNotif: 14,
    avisCurateur: 14,
    pvPlice: 10,
    ville: 14,
    attDelegationOuDelegat: 10,
    huissier: 14,
    sort: 12,
    tribunal: 16
  };
  const maxByField = {
    referenceClient: 34,
    juge: 34,
    lettreRec: 22,
    curateurNo: 24,
    executionNo: 34,
    notifCurateur: 24,
    sortNotif: 24,
    avisCurateur: 18,
    pvPlice: 10,
    ville: 26,
    huissier: 34,
    tribunal: 36,
    sort: 18,
    attOrdOrOrdOk: 14,
    attDelegationOuDelegat: 16
  };
  const minCh = minByField[rawField] || 8;
  const maxCh = maxByField[rawField] || 22;
  return Math.min(maxCh, Math.max(minCh, value.length + 2));
}

function autoSizeDiligenceControl(el){
  if(!el) return;
  const field = String(el.dataset?.field || '').trim();
  if(!shouldAutoSizeDiligenceField(field)) return;
  const content = el.tagName === 'SELECT'
    ? String(el.options?.[el.selectedIndex]?.text || el.value || '').trim()
    : String(el.value || '').trim();
  const widthCh = getDiligenceAutoSizeWidthCh(field, content);
  el.style.width = `${widthCh}ch`;
}

function applyDiligenceAutoSizing(root = document){
  if(!root) return;
  root.querySelectorAll('.diligence-autosize').forEach(autoSizeDiligenceControl);
}

function renderDiligenceEditableCell(row, procEncoded, field, value){
  const normalized = String(value ?? '').trim();
  const isAutoSize = shouldAutoSizeDiligenceField(field);
  const autoSizeClass = isAutoSize ? ' diligence-autosize' : '';
  const autoSizeAttrs = isAutoSize ? ` data-field="${escapeAttr(field)}"` : '';
  const autoSizeStyle = isAutoSize ? ` style="width:${getDiligenceAutoSizeWidthCh(field, normalized)}ch"` : '';
  const onSizeChange = isAutoSize ? 'autoSizeDiligenceControl(this);' : '';
  const isOrdonnanceField = field === 'attOrdOrOrdOk';
  const isDelegationField = field === 'attDelegationOuDelegat';
  if(isOrdonnanceField || isDelegationField){
    const status = isOrdonnanceField
      ? (
        shouldShowBlankDiligenceOrdonnance(row)
          ? ''
          : (getDiligenceOrdonnanceStatus(normalized, row?.details?.notificationNo || '') || 'att')
      )
      : (normalizeDiligenceAttOk(normalized) || 'att');
    if(!row?.canEdit){
      if(isOrdonnanceField){
        return escapeHtml(getDiligenceOrdonnanceLabel(status) || '-');
      }
      return escapeHtml(status || '-');
    }
    if(isOrdonnanceField){
      return `
      <select
        class="diligence-inline-select${autoSizeClass}"${autoSizeAttrs}${autoSizeStyle}
        onchange="${onSizeChange}updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
        <option value="" ${status === '' ? 'selected' : ''}>-</option>
        <option value="att" ${status === 'att' ? 'selected' : ''}>ATT ORD</option>
        <option value="ok" ${status === 'ok' ? 'selected' : ''}>ORD OK</option>
      </select>
    `;
    }
    return `
      <select
        class="diligence-inline-select${autoSizeClass}"${autoSizeAttrs}${autoSizeStyle}
        onchange="${onSizeChange}updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
        <option value="att" ${status === 'att' ? 'selected' : ''}>att</option>
        <option value="ok" ${status === 'ok' ? 'selected' : ''}>ok</option>
      </select>
    `;
  }
  if(field === 'notificationStatus'){
    const status = normalized || 'att plie avec tr';
    if(!row?.canEdit){
      return escapeHtml(status || '-');
    }
    return `
      <select
        class="diligence-inline-select"
        onchange="updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
        <option value="att plie avec tr" ${status === 'att plie avec tr' ? 'selected' : ''}>att plie avec tr</option>
        <option value="att notif" ${status === 'att notif' ? 'selected' : ''}>att notif</option>
        <option value="notifier" ${status === 'notifier' ? 'selected' : ''}>notifier</option>
        <option value="NB" ${status === 'NB' ? 'selected' : ''}>NB</option>
      </select>
    `;
  }
  if(field === 'certificatNonAppelStatus'){
    const status = normalized || 'att certificat non appel';
    if(!row?.canEdit){
      return escapeHtml(status || '-');
    }
    return `
      <select
        class="diligence-inline-select"
        onchange="updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
        <option value="att certificat non appel" ${status === 'att certificat non appel' ? 'selected' : ''}>att certificat non appel</option>
        <option value="certificat non appel ok" ${status === 'certificat non appel ok' ? 'selected' : ''}>certificat non appel ok</option>
      </select>
    `;
  }
  if(field === 'notificationSort'){
    const status = getDiligenceNotificationSortValue(normalized, row?.procedure);
    const isAssProcedure = isDiligenceAssProcedure(row?.procedure);
    if(!row?.canEdit){
      return escapeHtml(status || '-');
    }
    if(!isAssProcedure){
      return `
      <input
        type="text"
        class="diligence-inline-input"
        value="${escapeAttr(value || '')}"
        oninput="updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
    `;
    }
    return `
      <select
        class="diligence-inline-select"
        onchange="updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
        <option value="notifier" ${status === 'notifier' ? 'selected' : ''}>notifier</option>
        <option value="NB" ${status === 'NB' ? 'selected' : ''}>NB</option>
      </select>
    `;
  }
  if(field === 'lettreRec'){
    const status = getDiligenceLettreRecValue(normalized);
    if(!row?.canEdit){
      return escapeHtml(status || '-');
    }
    return `
      <select
        class="diligence-inline-select${autoSizeClass}"${autoSizeAttrs}${autoSizeStyle}
        onchange="${onSizeChange}updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
        <option value="att lettre du TR" ${status === 'att lettre du TR' ? 'selected' : ''}>1 Att lettre du TR</option>
        <option value="att retour la lettre" ${status === 'att retour la lettre' ? 'selected' : ''}>2 att retour la lettre</option>
        <option value="OK" ${status === 'OK' ? 'selected' : ''}>3 OK</option>
      </select>
    `;
  }
  if(field === 'avisCurateur'){
    const status = getDiligenceAvisCurateurValue(normalized);
    if(!row?.canEdit){
      return escapeHtml(status || '-');
    }
    return `
      <select
        class="diligence-inline-select${autoSizeClass}"${autoSizeAttrs}${autoSizeStyle}
        onchange="${onSizeChange}updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
        <option value="Avis en TR" ${status === 'Avis en TR' ? 'selected' : ''}>1 Avis en TR</option>
        <option value="Att Pub." ${status === 'Att Pub.' ? 'selected' : ''}>2 Att Pub.</option>
        <option value="pub au J" ${status === 'pub au J' ? 'selected' : ''}>3 pub au J</option>
      </select>
    `;
  }
  if(field === 'pvPlice'){
    const status = getDiligencePvPliceValue(normalized);
    if(!row?.canEdit){
      return escapeHtml(status || '-');
    }
    return `
      <select
        class="diligence-inline-select${autoSizeClass}"${autoSizeAttrs}${autoSizeStyle}
        onchange="${onSizeChange}updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
        <option value="att" ${status === 'att' ? 'selected' : ''}>att</option>
        <option value="ok" ${status === 'ok' ? 'selected' : ''}>ok</option>
      </select>
    `;
  }
  if(field === 'dateNotification'){
    if(!row?.canEdit){
      return escapeHtml(normalized || '-');
    }
    return `
      <input
        type="date"
        class="diligence-inline-input"
        value="${escapeAttr(normalized)}"
        oninput="updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
    `;
  }
  if(field === 'dateVente'){
    if(!row?.canEdit){
      return escapeHtml(normalized || '-');
    }
    return `
      <input
        type="date"
        class="diligence-inline-input"
        value="${escapeAttr(normalized)}"
        oninput="updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
    `;
  }
  if(field === 'ord'){
    if(!row?.canEdit){
      return escapeHtml(normalized || '-');
    }
    return `
      <select
        class="diligence-inline-select${autoSizeClass}"${autoSizeAttrs}${autoSizeStyle}
        onchange="${onSizeChange}updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
        <option value="att ord" ${normalized === 'att ord' ? 'selected' : ''}>att ord</option>
        <option value="ord ok" ${normalized === 'ord ok' ? 'selected' : ''}>ord ok</option>
        <option value="att paiement" ${normalized === 'att paiement' ? 'selected' : ''}>att paiement</option>
      </select>
    `;
  }
  if(field === 'sort'){
    if(!isDiligenceExecutionProcedure(row?.procedure)){
      if(!row?.canEdit){
        return escapeHtml(normalized || '-');
      }
      return `
      <input
        type="text"
        class="diligence-inline-input${autoSizeClass}"${autoSizeAttrs}${autoSizeStyle}
        value="${escapeAttr(value || '')}"
        oninput="${onSizeChange}updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
    `;
    }
    if(isDiligenceFreeTextExecutionSortProcedure(row?.procedure)){
      if(!row?.canEdit){
        return escapeHtml(normalized || '-');
      }
      return `
      <input
        type="text"
        class="diligence-inline-input${autoSizeClass}"${autoSizeAttrs}${autoSizeStyle}
        value="${escapeAttr(value || '')}"
        oninput="${onSizeChange}updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
    `;
    }
    const sortStatus = normalizeDiligenceSort(normalized);
    if(!row?.canEdit){
      return escapeHtml(sortStatus || '-');
    }
    return `
      <select
        class="diligence-inline-select${autoSizeClass}"${autoSizeAttrs}${autoSizeStyle}
        onchange="${onSizeChange}updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
        <option value="Att PV" ${sortStatus === 'Att PV' ? 'selected' : ''}>Att PV</option>
        <option value="PV OK" ${sortStatus === 'PV OK' ? 'selected' : ''}>PV OK</option>
      </select>
    `;
  }
  if(!row?.canEdit){
    return escapeHtml(normalized || '-');
  }
  return `
    <input
      type="text"
      class="diligence-inline-input${autoSizeClass}"${autoSizeAttrs}${autoSizeStyle}
      value="${escapeAttr(value || '')}"
      oninput="${onSizeChange}updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
  `;
}

const DILIGENCE_BATCH_UPDATE_FIELDS = new Set([
  'attDelegationOuDelegat',
  'sort'
]);

function applyDiligenceFieldValue(clientId, dossierIndex, procKey, field, value){
  const data = getDossierByIds(clientId, dossierIndex);
  if(!data || !canEditClient(data.client)) return { changed: false };
  const dossier = data.dossier;
  const proc = String(procKey || '').trim();
  if(!proc) return { changed: false };
  if(!dossier.procedureDetails) dossier.procedureDetails = {};
  if(!dossier.procedureDetails[proc]) dossier.procedureDetails[proc] = {};
  const details = dossier.procedureDetails[proc];
  const previousValue = field === 'ville' ? dossier.ville : details[field];
  const previousOrdonnanceValue = details.attOrdOrOrdOk;
  let nextValue = value;
  if(field === 'attOrdOrOrdOk' || field === 'attDelegationOuDelegat'){
    nextValue = normalizeDiligenceAttOk(value);
  }else if(field === 'sort'){
    nextValue = isDiligenceExecutionProcedure(proc) && !isDiligenceFreeTextExecutionSortProcedure(proc)
      ? normalizeDiligenceSort(value)
      : String(value ?? '').trim();
  }else if(field === 'notificationSort'){
    nextValue = normalizeDiligenceNotificationSort(value);
  }else if(field === 'lettreRec'){
    nextValue = normalizeDiligenceLettreRec(value);
  }else if(field === 'avisCurateur'){
    nextValue = normalizeDiligenceAvisCurateur(value);
  }else if(field === 'pvPlice'){
    nextValue = getDiligencePvPliceValue(value);
  }
  if(field === 'ville'){
    dossier.ville = nextValue;
  }else{
    details[field] = nextValue;
  }
  if(
    field === 'notificationNo'
    && isDiligenceNotificationNumberOrdOk(nextValue)
    && !normalizeDiligenceOrdonnance(details.attOrdOrOrdOk || '')
  ){
    details.attOrdOrOrdOk = 'ok';
  }
  const finalValue = field === 'ville' ? dossier.ville : details[field];
  queueDossierHistoryEntry(dossier, {
    source: 'diligence',
    field: field === 'ville' ? 'ville' : `procedureDetails.${field}`,
    procedure: field === 'ville' ? '' : proc,
    before: previousValue,
    after: finalValue
  });
  if(details.attOrdOrOrdOk !== previousOrdonnanceValue && field !== 'attOrdOrOrdOk'){
    queueDossierHistoryEntry(dossier, {
      source: 'diligence',
      field: 'procedureDetails.attOrdOrOrdOk',
      procedure: proc,
      before: previousOrdonnanceValue,
      after: details.attOrdOrOrdOk
    });
  }
  const changed = normalizeHistoryValue(previousValue) !== normalizeHistoryValue(finalValue)
    || (
      field !== 'attOrdOrOrdOk'
      && normalizeHistoryValue(previousOrdonnanceValue) !== normalizeHistoryValue(details.attOrdOrOrdOk)
    );
  return {
    changed,
    clientId: data.client?.id,
    dossier
  };
}

function getCheckedDiligenceRowsForBatchUpdate(){
  if(!diligencePrintSelection.size) return [];
  const seen = new Set();
  return getDiligenceRows().filter(row=>{
    const key = makeDiligencePrintKey(row?.clientId, row?.dossierIndex, row?.procedure);
    if(!diligencePrintSelection.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shouldBatchUpdateCheckedDiligenceRows(clientId, dossierIndex, procKey, field){
  if(!DILIGENCE_BATCH_UPDATE_FIELDS.has(String(field || '').trim())) return false;
  if(!diligencePrintSelection.size) return false;
  const currentKey = makeDiligencePrintKey(clientId, dossierIndex, procKey);
  return diligencePrintSelection.has(currentKey);
}

function applyDiligenceBatchValueToCheckedRows(field, value){
  if(!DILIGENCE_BATCH_UPDATE_FIELDS.has(String(field || '').trim())) return false;
  const rows = getCheckedDiligenceRowsForBatchUpdate();
  if(!rows.length) return false;
  let changed = false;
  const changedDossiers = new Map();
  rows.forEach(row=>{
    const result = applyDiligenceFieldValue(row.clientId, row.dossierIndex, row.procedure, field, value);
    if(!result.changed) return;
    changed = true;
    const dossier = result.dossier && typeof result.dossier === 'object' ? result.dossier : null;
    if(!dossier) return;
    const changeKey = `${Number(result.clientId) || 0}::${String(dossier.referenceClient || row?.dossier?.referenceClient || row?.dossierIndex || '').trim()}`;
    changedDossiers.set(changeKey, {
      clientId: result.clientId,
      dossier
    });
  });
  if(!changed) return false;
  handleDossierDataChange({ audience: true, rerenderLinked: true });
  [...changedDossiers.values()].forEach((entry)=>{
    persistDossierReferenceNow(entry.clientId, entry.dossier, { source: 'diligence-batch' }).catch(()=>{});
  });
  return true;
}

function applyDiligenceFilterSelectionToCheckedRows(field, value){
  const nextValue = String(value || 'all').trim() || 'all';
  if(nextValue !== 'all'){
    applyDiligenceBatchValueToCheckedRows(field, nextValue);
  }
  if(typeof clearDiligencePrintSelection === 'function'){
    clearDiligencePrintSelection({ immediate: true });
  }
  return nextValue;
}

function updateDiligenceField(clientId, dossierIndex, procKey, field, value){
  if(!canEditData()) return;
  const proc = String(procKey || '').trim();
  if(!proc) return;
  if(shouldBatchUpdateCheckedDiligenceRows(clientId, dossierIndex, proc, field)){
    if(!applyDiligenceBatchValueToCheckedRows(field, value)) return;
    return;
  }
  const result = applyDiligenceFieldValue(clientId, dossierIndex, proc, field, value);
  if(!result.changed) return;
  handleDossierDataChange({ audience: true, rerenderLinked: true });
  if(field === 'notificationSort' && typeof renderDiligence === 'function'){
    renderDiligence({ force: true });
  }
  persistDossierReferenceNow(result.clientId, result.dossier, { source: 'diligence' }).catch(()=>{});
}

function updateDiligenceFieldEncoded(clientId, dossierIndex, procKeyEncoded, field, value){
  updateDiligenceField(clientId, dossierIndex, decodeURIComponent(String(procKeyEncoded)), field, value);
}

function extractYearFromReferenceDiligence(ref) {
  if (!ref) return 9999;
  const str = String(ref).trim();
  const match = str.match(/\/(20\d{2})$|\/(19\d{2})$/);
  if (match) {
    return parseInt(match[1] || match[2], 10);
  }
  const parts = str.split('/');
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i].trim();
    if (p.length === 4 && !isNaN(p)) {
      return parseInt(p, 10);
    }
  }
  return 9999;
}

function getFilteredDiligenceRows(allRows){
  const q = normalizeDiligenceSearchQuery($('diligenceSearchInput')?.value || '');
  const executionOnlyQuery = isDiligenceExecutionOnlyQuery(q);
  const restrictAssAttOrdToAudience = shouldRestrictDiligenceAssAttOrdToAudience();
  const audienceAssAttOrdKeySet = restrictAssAttOrdToAudience ? getDiligenceAudienceAssAttOrdKeySet() : null;
  const filterKey = [
    q,
    executionOnlyQuery ? 'execution-only' : 'default',
    filterDiligenceProcedure,
    filterDiligenceSort,
    filterDiligenceDelegation,
    filterDiligenceOrdonnance,
    filterDiligenceTribunal,
    restrictAssAttOrdToAudience ? `audience-green-only:${audienceAssAttOrdKeySet?.size || 0}` : 'all-ass-att-ord'
  ].join('||');
  if(allRows === diligenceFilteredRowsCacheInput && filterKey === diligenceFilteredRowsCacheKey){
    return diligenceFilteredRowsCacheOutput;
  }
  const filteredRows = allRows.filter(row=>{
    if(!matchesDiligenceProcedureFilter(row, filterDiligenceProcedure)) return false;
    if(filterDiligenceSort !== 'all' && row.sort !== filterDiligenceSort) return false;
    if(filterDiligenceDelegation !== 'all' && row.delegation !== filterDiligenceDelegation) return false;
    if(
      filterDiligenceOrdonnance !== 'all'
      && normalizeDiligenceOrdonnance(row.ordonnance) !== normalizeDiligenceOrdonnance(filterDiligenceOrdonnance)
    ) return false;
    if(restrictAssAttOrdToAudience && isDiligenceAssProcedure(row?.procedure) && !audienceAssAttOrdKeySet?.has(makeDiligencePrintKey(row?.clientId, row?.dossierIndex, row?.procedure))) return false;
    if(filterDiligenceTribunal !== 'all' && resolveDiligenceTribunalFilterKey(row.tribunalFilterKey || row.tribunal) !== filterDiligenceTribunal) return false;
    if(!q) return true;
    if(executionOnlyQuery) return hasDiligenceExecutionNumber(row);
    const searchValues = row.__diligenceSearchValues || (row.__diligenceSearchValues = getDiligenceSearchValues(row));
    return searchValues.some(value=>value.includes(q));
  });
  
  filteredRows.sort((a, b) => {
    // Dans la page Diligence, les Références dossier doivent toujours s’afficher du plus ancien au plus récent (ASC).
    return compareAudienceRowsByReferenceProximity(a, b, { direction: 1 });
  });

  diligenceFilteredRowsCacheInput = allRows;
  diligenceFilteredRowsCacheKey = filterKey;
  diligenceFilteredRowsCacheOutput = filteredRows;
  return filteredRows;
}

function exportDiligenceXLS(options = {}){
  if(!canExportData()) return alert('Accès refusé');
  return runWithHeavyUiOperation(async ()=>{
    const dataset = await buildDiligenceSelectedExportDatasetAsync();
    if(!dataset.rows.length){
      alert('Cochez au moins une ligne pour exporter.');
      return;
    }
    if(shouldPreferSelectedExportCsvPath(dataset.rows.length)){
      const csvBlob = await createMappedCsvBlobChunked({
        headers: dataset.headers,
        items: dataset.tableRows,
        mapRow: (row)=>row,
        progressLabel: 'Export diligence CSV',
        chunkSize: 120
      });
      await saveBlobDirectOrDownload(csvBlob, 'diligence_export.csv', {
        openAfterExport: options?.openAfterExport === true,
        browserDownloadTarget: options?.browserDownloadTarget || null,
        browserOpenInline: options?.browserOpenInline === true,
        preferredFileHandle: options?.preferredFileHandle || null
      });
      return;
    }
    await exportAudienceWorkbookXlsxStyled({
      headers: dataset.headers,
      rows: dataset.tableRows,
      subtitle: 'Diligence',
      sheetName: 'Diligence',
      colWidths: dataset.colWidths,
      filename: 'diligence_export.xlsx',
      openAfterExport: options?.openAfterExport === true,
      browserDownloadTarget: options?.browserDownloadTarget || null,
      browserOpenInline: options?.browserOpenInline === true,
      preferredFileHandle: options?.preferredFileHandle || null
    });
  });
}

function getDiligenceExportColumnDefinitions(){
  return [
    {
      key: 'clientName',
      header: 'Client',
      width: 24,
      getValue: (row)=>row?.clientName || ''
    },
    {
      key: 'referenceClient',
      header: 'Référence client',
      width: 26,
      getValue: (row)=>row?.dossier?.referenceClient || ''
    },
    {
      key: 'nom',
      header: 'Nom',
      width: 30,
      getValue: (row)=>row?.dossier?.debiteur || ''
    },
    {
      key: 'dateDepot',
      header: 'Date dépôt',
      width: 20,
      getValue: (row)=>row?.details?.depotLe || row?.details?.dateDepot || ''
    },
    {
      key: 'referenceDossier',
      header: 'Référence dossier',
      width: 26,
      getValue: (row)=>getDiligenceReferenceDossierValue(row)
    },
    {
      key: 'juge',
      header: 'Juge',
      width: 28,
      assOnly: true,
      getValue: (row)=>row?.details?.juge || ''
    },
    {
      key: 'sortAudience',
      header: 'Sort',
      width: 24,
      assOnly: true,
      getValue: (row)=>isDiligenceAssProcedure(row?.procedure) ? (row?.details?.sort || '') : ''
    },
    {
      key: 'ordonnance',
      header: 'Ordonnance',
      width: 18,
      getValue: (row)=>getDiligenceOrdonnanceCellValue(row)
    },
    {
      key: 'notificationNo',
      header: 'Notification N°',
      width: 22,
      getValue: (row)=>getDiligenceNotificationNumberCellValue(row)
    },
    {
      key: 'notificationSort',
      header: 'Sort notification',
      width: 24,
      getValue: (row)=>getDiligenceNotificationSortCellValue(row)
    },
    {
      key: 'certificatNonAppel',
      header: 'Certificat non appel',
      headerAss: 'Certificat non appel / Lettre Rec',
      headerNb: 'Lettre Rec',
      width: 26,
      getValue: (row)=>isDiligenceAssNbLayout(row)
        ? getDiligenceLettreRecValue(row?.details?.lettreRec || '')
        : (row?.details?.certificatNonAppelStatus || '')
    },
    {
      key: 'executionNo',
      header: 'Exécution N°',
      headerAss: 'Exécution N° / Curateur N°',
      headerNb: 'Curateur N°',
      width: 20,
      getValue: (row)=>isDiligenceAssNbLayout(row)
        ? (row?.details?.curateurNo || '')
        : (row?.details?.executionNo || '')
    },
    {
      key: 'ville',
      header: 'Ville',
      headerAss: 'Ville / ORD',
      headerNb: 'ORD',
      width: 20,
      getValue: (row)=>isDiligenceAssNbLayout(row)
        ? (getDiligenceOrdonnanceLabelFromDetails(row?.details) || '')
        : (row?.dossier?.ville || '')
    },
    {
      key: 'delegation',
      header: 'Délégation',
      headerAss: 'Délégation / Notif curateur',
      headerNb: 'Notif curateur',
      width: 18,
      getValue: (row)=>getDiligenceDelegationCellValue(row)
    },
    {
      key: 'huissier',
      header: 'Huissier',
      headerAss: 'Huissier / Sort notif',
      headerNb: 'Sort notif',
      width: 26,
      getValue: (row)=>getDiligenceHuissierCellValue(row)
    },
    {
      key: 'sortExecution',
      header: 'Sort exécution',
      headerAss: 'Avis curateur',
      headerNb: 'Avis curateur',
      width: 22,
      getValue: (row)=>getDiligenceExecutionSortCellValue(row)
    },
    {
      key: 'pvPlice',
      header: 'PV Police',
      width: 14,
      assOnly: true,
      getValue: (row)=>isDiligenceAssProcedure(row?.procedure)
        ? getDiligencePvPliceValue(row?.details?.pvPlice || '')
        : ''
    },
    {
      key: 'tribunal',
      header: 'Tribunal',
      width: 34,
      getValue: (row)=>getDiligenceTribunalCellValue(row)
    }
  ];
}

function shouldShowDiligenceAssColumnsForRows(rows){
  if(isDiligenceAssProcedure(filterDiligenceProcedure)) return true;
  const sourceRows = Array.isArray(rows) ? rows : [];
  return !!sourceRows.length && sourceRows.every((row)=>isDiligenceAssProcedure(row?.procedure));
}

function shouldShowDiligenceCommandementColumnsForRows(rows){
  if(isDiligenceCommandementProcedure(filterDiligenceProcedure)) return true;
  const sourceRows = Array.isArray(rows) ? rows : [];
  return !!sourceRows.length && sourceRows.every((row)=>isDiligenceCommandementProcedure(row?.procedure));
}

function buildDiligenceExportRowCells(row, columns){
  return columns.map((column)=>{
    const value = typeof column.getValue === 'function' ? column.getValue(row) : '';
    return String(value || '').trim();
  });
}

function finalizeDiligenceExportDataset(rows){
  const sourceRows = Array.isArray(rows) ? rows : [];
  const showCommandementColumns = shouldShowDiligenceCommandementColumnsForRows(sourceRows);
  if(showCommandementColumns){
    const columns = [
      { header: 'Client', width: 24, getValue: (row)=>row?.clientName || '' },
      { header: 'Référence client', width: 26, getValue: (row)=>row?.dossier?.referenceClient || '' },
      { header: 'Nom', width: 30, getValue: (row)=>row?.dossier?.debiteur || '' },
      { header: 'Date dépôt', width: 20, getValue: (row)=>row?.details?.depotLe || row?.details?.dateDepot || '' },
      { header: 'Execution N°', width: 20, getValue: (row)=>row?.details?.executionNo || '' },
      { header: 'Notif Conservateur', width: 24, getValue: (row)=>row?.details?.notifConservateur || '' },
      { header: 'Notif débiteur', width: 24, getValue: (row)=>row?.details?.notifDebiteur || '' },
      { header: 'Ref expertise', width: 26, getValue: (row)=>getDiligenceReferenceDossierValue(row) },
      { header: 'Ord', width: 18, getValue: (row)=>row?.details?.ord || '' },
      { header: 'Expert', width: 24, getValue: (row)=>row?.details?.expert || '' },
      { header: 'Sort', width: 22, getValue: (row)=>row?.details?.sort || '' },
      { header: 'Date vente', width: 20, getValue: (row)=>row?.details?.dateVente || '' }
    ];
    const tableRows = sourceRows.map((row)=>columns.map((column)=>String(column.getValue(row) || '').trim()));
    return {
      rows: sourceRows,
      headers: columns.map((column)=>column.header),
      tableRows,
      colWidths: columns.map((column)=>({ wch: Number(column.width) || 22 }))
    };
  }
  const showAssColumns = shouldShowDiligenceAssColumnsForRows(sourceRows);
  const assHeaderMode = showAssColumns ? getDiligenceAssHeaderMode(sourceRows) : 'default';
  const columns = getDiligenceExportColumnDefinitions().filter((column)=>!column.assOnly || showAssColumns);
  const activeColumnIndexes = new Set();
  const rowCells = sourceRows.map((row)=>{
    const cells = buildDiligenceExportRowCells(row, columns);
    cells.forEach((value, index)=>{
      if(value) activeColumnIndexes.add(index);
    });
    return cells;
  });
  const activeIndexes = columns.reduce((list, _column, index)=>{
    if(activeColumnIndexes.has(index)) list.push(index);
    return list;
  }, []);
  const activeColumns = activeIndexes.map((index)=>columns[index]);
  return {
    rows: sourceRows,
    headers: activeColumns.map((column)=>{
      if(!showAssColumns) return column.header;
      if(assHeaderMode === 'nb') return column.headerNb || column.headerAss || column.header;
      if(assHeaderMode === 'mixed') return column.headerAss || column.header;
      return column.header;
    }),
    tableRows: activeIndexes.length === columns.length
      ? rowCells
      : rowCells.map((cells)=>activeIndexes.map((index)=>cells[index])),
    colWidths: activeColumns.map((column)=>({ wch: Number(column.width) || 22 }))
  };
}

function buildDiligenceSelectedExportDatasetBase(){
  const allRows = getDiligenceRows();
  syncDiligencePrintSelection(allRows);
  syncDiligenceProcedureFilter(allRows);
  const auxFilterRows = getDiligenceRowsScopedForAuxFilters(allRows);
  syncDiligenceSortFilter(auxFilterRows);
  syncDiligenceDelegationFilter(auxFilterRows);
  syncDiligenceOrdonnanceFilter(auxFilterRows);
  syncDiligenceTribunalFilter(auxFilterRows);
  const filteredRows = getFilteredDiligenceRows(allRows);
  const rows = (
    filteredRows === diligenceSelectedExportRowsCacheInput
    && diligenceSelectedExportRowsCacheVersion === diligencePrintSelectionVersion
  )
    ? diligenceSelectedExportRowsCacheOutput
    : filteredRows.filter(row=>isDiligenceSelectedForPrint(row));
  if(rows !== diligenceSelectedExportRowsCacheOutput){
    diligenceSelectedExportRowsCacheInput = filteredRows;
    diligenceSelectedExportRowsCacheVersion = diligencePrintSelectionVersion;
    diligenceSelectedExportRowsCacheOutput = rows;
  }
  return finalizeDiligenceExportDataset(rows);
}

function buildDiligenceSelectedExportDataset(){
  return buildDiligenceSelectedExportDatasetBase();
}

async function buildDiligenceSelectedExportDatasetAsync(){
  const dataset = buildDiligenceSelectedExportDatasetBase();
  if(Array.isArray(dataset.tableRows) && dataset.tableRows.length){
    await yieldToMainThread();
  }
  return {
    rows: dataset.rows,
    headers: Array.isArray(dataset.headers) ? dataset.headers.slice() : [],
    tableRows: Array.isArray(dataset.tableRows) ? dataset.tableRows.slice() : [],
    colWidths: Array.isArray(dataset.colWidths) ? dataset.colWidths.slice() : []
  };
}

function previewDiligenceSelectedRows(){
  const dataset = buildDiligenceSelectedExportDataset();
  if(!dataset.rows.length){
    alert('Cochez au moins une ligne pour afficher le fichier.');
    return;
  }
  if(hasDesktopExportBridge()){
    exportDiligenceXLS({ openAfterExport: true }).catch(err=>console.error(err));
    return;
  }
  showExportPreviewModal({
    title: 'Aperçu Excel - Diligence',
    subtitle: 'Lignes cochées prêtes à exporter',
    headers: dataset.headers,
    rows: dataset.tableRows,
    exportLabel: 'Voir le fichier Excel',
    onExport: openDiligenceExcelFilePreviewWindow
  });
}

function openDiligenceExcelFilePreviewWindow(){
  const dataset = buildDiligenceSelectedExportDataset();
  if(!dataset.rows.length){
    alert('Cochez au moins une ligne pour afficher le fichier.');
    return;
  }
  const browserDownloadTarget = primeBrowserDownloadTarget('Ouverture du fichier Excel...');
  exportDiligenceXLS({
    openAfterExport: true,
    browserDownloadTarget,
    browserOpenInline: true
  }).catch(err=>{
    console.error(err);
    alert("Ouverture du fichier Excel impossible.");
  });
}

// ================== EQUIPE ==================
function getClientNameById(id){
  return AppState.clients.find(c=>c.id === id)?.name || '-';
}

function getSelectedTeamClientIds(){
  return [...document.querySelectorAll('#teamClientsList input[type="checkbox"]:checked')]
    .map(i=>Number(i.value))
    .filter(v=>Number.isFinite(v));
}

function renderTeamClientCheckboxes(selectedIds = []){
  const box = $('teamClientsList');
  if(!box) return;
  if(!AppState.clients.length){
    box.innerHTML = '<div class="diligence-empty">Aucun client pour le moment.</div>';
    updateTeamClientCount();
    return;
  }
  box.innerHTML = AppState.clients.map(c=>{
    const checked = selectedIds.includes(c.id) ? 'checked' : '';
    return `<label class="team-client-item" data-client-name="${escapeAttr(c.name.toLowerCase())}">
      <input type="checkbox" value="${c.id}" ${checked}>
      <span>${escapeHtml(c.name)}</span>
    </label>`;
  }).join('');
  box.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
    cb.addEventListener('change', updateTeamClientCount);
  });
  filterTeamClientList();
  updateTeamClientCount();
}

function filterTeamClientList(){
  const q = String($('teamClientSearchInput')?.value || '').trim().toLowerCase();
  const items = [...document.querySelectorAll('#teamClientsList .team-client-item')];
  let visibleCount = 0;
  items.forEach(item=>{
    const name = String(item.dataset.clientName || '');
    const visible = q ? name.includes(q) : false;
    item.style.display = visible ? '' : 'none';
    if(visible) visibleCount += 1;
  });
  const box = $('teamClientsList');
  if(!box) return;
  const existing = box.querySelector('.team-client-empty');
  const message = !q
    ? 'Tapez pour rechercher un client.'
    : (visibleCount === 0 ? 'Aucun client trouvé.' : '');
  if(message && items.length){
    if(!existing){
      const empty = document.createElement('div');
      empty.className = 'diligence-empty team-client-empty';
      empty.textContent = message;
      box.appendChild(empty);
    }else{
      existing.textContent = message;
    }
  }else if(existing){
    existing.remove();
  }
}

function updateTeamClientCount(){
  const countEl = $('teamClientCount');
  if(!countEl) return;
  const count = getSelectedTeamClientIds().length;
  countEl.textContent = `${count} client${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;
}

function updateTeamClientSelectorState(){
  const role = normalizeUserRole($('teamRole')?.value || 'client');
  const wrap = $('teamClientsWrap');
  if(!wrap) return;
  const disabled = role !== 'client';
  wrap.style.opacity = disabled ? '0.6' : '1';
  wrap.querySelectorAll('input[type="checkbox"]').forEach(i=> i.disabled = disabled);
  const search = $('teamClientSearchInput');
  if(search) search.disabled = disabled;
}

function addClientFromTeam(){
  return;
}

function resetTeamForm(){
  editingTeamUserId = null;
  if($('teamUsername')) $('teamUsername').value = '';
  if($('teamUsername')) $('teamUsername').disabled = false;
  if($('teamPassword')) $('teamPassword').value = '';
  if($('teamRole')) $('teamRole').value = 'client';
  if($('teamRole')) $('teamRole').disabled = false;
  if($('teamClientSearchInput')) $('teamClientSearchInput').value = '';
  renderTeamClientCheckboxes([]);
  updateTeamClientSelectorState();
  if($('teamSaveBtn')) $('teamSaveBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Enregistrer';
}

function buildStandardTeamClientAssignments(totalClients){
  const clientIds = Array.isArray(AppState?.clients)
    ? AppState.clients
      .map((client)=>Number(client?.id))
      .filter((id)=>Number.isFinite(id))
    : [];
  return Array.from({ length: totalClients }, (_, index)=>{
    if(!clientIds.length) return [];
    return [clientIds[index % clientIds.length]];
  });
}

async function upsertProvisionedUser(nextUsers, config, nextIdRef){
  const username = String(config?.username || '').trim();
  if(!username) return { created: false, updated: false };
  const role = normalizeUserRole(config?.role || 'client');
  const clientIds = role === 'client'
    ? [...new Set((Array.isArray(config?.clientIds) ? config.clientIds : []).map((id)=>Number(id)).filter((id)=>Number.isFinite(id)))]
    : [];
  const existingIndex = nextUsers.findIndex(
    (user)=>String(user?.username || '').trim().toLowerCase() === username.toLowerCase()
  );
  const existingUser = existingIndex >= 0 ? nextUsers[existingIndex] : null;
  let nextUser = {
    ...(existingUser && typeof existingUser === 'object' ? existingUser : {}),
    id: existingUser ? Number(existingUser.id) : nextIdRef.value++,
    username,
    role,
    clientIds,
    requirePasswordChange: false
  };
  if(existingUser){
    nextUser.id = Number.isFinite(Number(existingUser.id)) ? Number(existingUser.id) : nextIdRef.value++;
  }
  nextUser = await secureUserPassword(nextUser, STANDARD_TEAM_DEFAULT_PASSWORD, {
    requirePasswordChange: false
  });
  if(existingIndex >= 0){
    const changed = JSON.stringify(normalizeUser(existingUser)) !== JSON.stringify(normalizeUser(nextUser));
    nextUsers[existingIndex] = nextUser;
    return { created: false, updated: changed };
  }
  nextUsers.push(nextUser);
  return { created: true, updated: false };
}

async function provisionStandardTeamStructure(){
  if(!canManageTeam()) return alert('Accès refusé');
  const confirmation = window.confirm(
    `Créer / mettre à jour la structure standard ?\n\n`
    + `- ${STANDARD_TEAM_TOTAL_MANAGERS} gestionnaires\n`
    + `- ${STANDARD_TEAM_TOTAL_ADMINS} admins\n`
    + `- ${STANDARD_TEAM_TOTAL_CLIENTS} clients\n\n`
    + `Les comptes existants non standards ne seront pas supprimés.`
  );
  if(!confirmation) return;

  USERS = ensureManagerUser(Array.isArray(USERS) ? USERS : []);
  const nextUsers = USERS.map((user)=>({ ...user }));
  const nextIdRef = {
    value: nextUsers.reduce((max, user)=>Math.max(max, Number(user?.id) || 0), 0) + 1
  };
  const clientAssignments = buildStandardTeamClientAssignments(STANDARD_TEAM_TOTAL_CLIENTS);
  let createdCount = 0;
  let updatedCount = 0;

  const accounts = [
    ...STANDARD_TEAM_MANAGER_USERNAMES
      .slice(0, Math.max(0, STANDARD_TEAM_TOTAL_MANAGERS))
      .map((username)=>({
        username,
        role: 'manager',
        clientIds: []
      })),
    ...Array.from({ length: STANDARD_TEAM_TOTAL_ADMINS }, (_, index)=>({
      username: `admin${index + 1}`,
      role: 'admin',
      clientIds: []
    })),
    ...Array.from({ length: STANDARD_TEAM_TOTAL_CLIENTS }, (_, index)=>({
      username: `client${index + 1}`,
      role: 'client',
      clientIds: clientAssignments[index] || []
    }))
  ];

  for(const account of accounts){
    const result = await upsertProvisionedUser(nextUsers, account, nextIdRef);
    if(result.created) createdCount += 1;
    if(result.updated) updatedCount += 1;
  }

  USERS = ensureManagerUser(nextUsers);
  await persistStateSliceNow('users', USERS, { source: 'team-standard-structure' });
  syncCurrentUserFromUsers();
  renderEquipe({ force: true });
  resetTeamForm();

  const unassignedClients = clientAssignments.filter((ids)=>!ids.length).length;
  const summary = [
    `Structure standard prête: ${STANDARD_TEAM_TOTAL_MANAGERS} gestionnaires, ${STANDARD_TEAM_TOTAL_ADMINS} admins, ${STANDARD_TEAM_TOTAL_CLIENTS} clients.`,
    `Comptes créés: ${createdCount}.`,
    `Comptes mis à jour: ${updatedCount}.`
  ];
  if(unassignedClients > 0){
    summary.push(`Attention: ${unassignedClients} compte(s) client créés sans client lié, car aucun client n'existe encore dans la base.`);
  }
  alert(summary.join('\n'));
}

async function saveTeamUser(){
  if(!canManageTeam()) return alert('Accès refusé');
  const username = $('teamUsername')?.value?.trim() || '';
  const password = normalizeLoginPassword($('teamPassword')?.value?.trim() || '');
  const role = normalizeUserRole($('teamRole')?.value || 'client');
  if(!username) return alert('Username obligatoire');
  if(!editingTeamUserId && !password) return alert('Mot de passe obligatoire');
  if(password){
    const passwordPolicyError = getPasswordPolicyError(password);
    if(passwordPolicyError) return alert(passwordPolicyError);
  }

  const selectedClientIds = role === 'manager' ? [] : getSelectedTeamClientIds();
  const finalClientIds = role === 'client' ? selectedClientIds : [];
  if(role === 'client' && finalClientIds.length === 0){
    return alert('Choisir au moins un client pour ce compte client');
  }

  const usernameTaken = USERS.some(u=>
    String(u.username || '').trim().toLowerCase() === username.toLowerCase()
    && u.id !== editingTeamUserId
  );
  if(usernameTaken) return alert('Username déjà utilisé');

  if(editingTeamUserId){
    const userIndex = USERS.findIndex(u=>u.id === editingTeamUserId);
    if(userIndex === -1) return;
    const user = USERS[userIndex];
    let nextUser = { ...user };
    if(isDefaultManagerUser(user)){
      nextUser.username = DEFAULT_MANAGER_USERNAME;
      nextUser.role = 'manager';
      nextUser.clientIds = [];
    }else{
      nextUser.username = username;
      nextUser.role = role;
      nextUser.clientIds = finalClientIds;
    }
    if(password){
      nextUser = await secureUserPassword(nextUser, password, { requirePasswordChange: false });
    }
    USERS[userIndex] = nextUser;
  }else{
    let nextUser = {
      id: Date.now(),
      username,
      password: '',
      passwordHash: '',
      passwordSalt: '',
      passwordVersion: 0,
      passwordUpdatedAt: '',
      requirePasswordChange: false,
      role,
      clientIds: finalClientIds
    };
    nextUser = await secureUserPassword(nextUser, password, { requirePasswordChange: false });
    USERS.push(nextUser);
  }
  USERS = ensureManagerUser(USERS);
  await persistStateSliceNow('users', USERS, { source: 'team' });
  syncCurrentUserFromUsers();
  renderEquipe();
  resetTeamForm();
}

function editTeamUser(userId){
  if(!canManageTeam()) return;
  const user = USERS.find(u=>u.id === userId);
  if(!user) return;
  editingTeamUserId = userId;
  if($('teamUsername')) $('teamUsername').value = user.username;
  if($('teamUsername')) $('teamUsername').disabled = isDefaultManagerUser(user);
  if($('teamPassword')) $('teamPassword').value = '';
  if($('teamRole')) $('teamRole').value = normalizeUserRole(user.role);
  if($('teamRole')) $('teamRole').disabled = isDefaultManagerUser(user);
  if($('teamClientSearchInput')) $('teamClientSearchInput').value = '';
  renderTeamClientCheckboxes(Array.isArray(user.clientIds) ? user.clientIds : []);
  updateTeamClientSelectorState();
  if($('teamSaveBtn')) $('teamSaveBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Mettre à jour';
}

function deleteTeamUser(userId){
  if(!canManageTeam()) return;
  const user = USERS.find(u=>u.id === userId);
  if(!user) return;
  if(isDefaultManagerUser(user)){
    return alert('Impossible de supprimer le compte manager par défaut');
  }
  const managerCount = USERS.filter(u=>u.role === 'manager').length;
  if(user.role === 'manager' && managerCount <= 1){
    return alert('Impossible de supprimer le dernier manager');
  }
  if(currentUser?.id === userId){
    return alert('Impossible de supprimer l’utilisateur connecté');
  }
  USERS = USERS.filter(u=>u.id !== userId);
  persistStateSliceNow('users', USERS, { source: 'team' }).catch(()=>{});
  renderEquipe();
  if(editingTeamUserId === userId) resetTeamForm();
}

function renderEquipe(options = {}){
  if(!shouldRenderDeferredSection('equipe', options)) return;
  const panel = $('teamManagerPanel');
  const locked = $('teamLocked');
  const body = $('teamUsersBody');
  if(!panel || !locked || !body) return;

  if(!canManageTeam()){
    panel.style.display = 'none';
    locked.style.display = '';
    body.innerHTML = '';
    return;
  }

  panel.style.display = '';
  locked.style.display = 'none';
  if(!editingTeamUserId) {
    renderTeamClientCheckboxes([]);
    updateTeamClientSelectorState();
  }

  const pagination = paginateRows(USERS, 'equipe');

  body.innerHTML = pagination.rows.map(u=>{
    const roleLabel = getRoleLabel(u.role);
    const clients = (Array.isArray(u.clientIds) ? u.clientIds : [])
      .map(getClientNameById)
      .join(', ') || '-';
    const securityLabel = u.requirePasswordChange
      ? 'Mot de passe à changer'
      : (hasStoredPasswordHash(u) ? 'Protégé' : 'Ancien format');
    return `
      <tr>
        <td>${escapeHtml(u.username)}</td>
        <td>${escapeHtml(roleLabel)}</td>
        <td>${escapeHtml(clients)}</td>
        <td>${escapeHtml(securityLabel)}</td>
        <td>
          <button class="btn-primary" onclick="editTeamUser(${u.id})"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-danger" onclick="deleteTeamUser(${u.id})"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  }).join('');

  renderPagination('equipe', pagination);
}

function addSalleJudge(){
  if(!canEditData()) return alert('Accès refusé');
  const day = normalizeSalleWeekday(selectedSalleDay);
  const salleInput = $('salleNameInput');
  const jugeInput = $('salleJudgeInput');
  const salle = normalizeSalleName(salleInput?.value || '');
  const juge = normalizeJudgeName(jugeInput?.value || '');
  if(!salle || !juge){
    if(!salle && salleInput){
      salleInput.focus();
      return;
    }
    if(!juge && jugeInput){
      jugeInput.focus();
    }
    return;
  }
  const exists = AppState.salleAssignments.some(row=>
    normalizeSalleWeekday(row?.day) === day
    && String(row?.salle || '').toLowerCase() === salle.toLowerCase()
    && String(row?.juge || '').toLowerCase() === juge.toLowerCase()
  );
  if(exists){
    if(jugeInput) jugeInput.value = '';
    return;
  }
  AppState.salleAssignments.push({
    id: Date.now(),
    salle,
    juge,
    day
  });
  AppState.salleAssignments = normalizeSalleAssignments(AppState.salleAssignments);
  invalidateSalleAssignmentsCaches();
  persistStateSliceNow('salleAssignments', AppState.salleAssignments, { source: 'salle' }).catch(()=>{});
  if(jugeInput) jugeInput.value = '';
  renderSalle();
}

function deleteSalleJudge(id){
  if(!canEditData()) return alert('Accès refusé');
  AppState.salleAssignments = AppState.salleAssignments.filter(row=>Number(row.id) !== Number(id));
  invalidateSalleAssignmentsCaches();
  persistStateSliceNow('salleAssignments', AppState.salleAssignments, { source: 'salle' }).catch(()=>{});
  renderSalle();
}

function renderSalle(options = {}){
  if(!shouldRenderDeferredSection('salle', options)) return;
  const body = $('salleBody');
  const filterSelect = $('salleFilterSelect');
  const tribunalFilterSelect = $('salleTribunalFilter');
  const dateFilterInput = $('salleAudienceDateFilter');
  const editRow = $('salleEditRow');
  const selectedDay = normalizeSalleWeekday(selectedSalleDay);
  selectedSalleDay = selectedDay;
  if(!body || !filterSelect) return;

  renderSalleDayTabs();
  if(editRow) editRow.style.display = canEditData() ? '' : 'none';

  const normalized = normalizeSalleAssignments(AppState.salleAssignments);
  AppState.salleAssignments = normalized;

  const grouped = new Map();
  normalized.forEach(row=>{
    if(normalizeSalleWeekday(row?.day) !== selectedDay) return;
    const salle = row.salle;
    if(!grouped.has(salle)) grouped.set(salle, []);
    grouped.get(salle).push(row);
  });

  const salles = [...grouped.keys()].sort((a, b)=>a.localeCompare(b, 'fr'));
  const forceRender = options.force === true;
  const salleRenderKey = [
    audienceRowsRawDataVersion,
    salleAssignmentsVersion,
    selectedDay,
    filterSalle,
    filterSalleTribunal,
    filterSalleAudienceDate,
    canEditData() ? 'edit' : 'read',
    getCurrentClientAccessCacheKey(),
    salles.length
  ].join('||');
  filterSelect.innerHTML = `<option value="all">Toutes</option>${salles.map(s=>`<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`).join('')}`;
  if(filterSalle !== 'all' && !grouped.has(filterSalle)) filterSalle = 'all';
  filterSelect.value = filterSalle;
  if(tribunalFilterSelect){
    if(!['all', 'commerciale', 'appel'].includes(filterSalleTribunal)){
      filterSalleTribunal = 'all';
    }
    tribunalFilterSelect.value = filterSalleTribunal;
  }
  if(dateFilterInput){
    dateFilterInput.value = filterSalleAudienceDate;
  }
  if(!forceRender && salleRenderKey === lastSalleRenderKey){
    if(shouldQueueSidebarSalleSessionsRender()) queueSidebarSalleSessionsRender();
    return;
  }

  if(!salles.length){
    lastSalleRenderKey = salleRenderKey;
    body.innerHTML = `<tr><td colspan="3" class="diligence-empty">Aucune salle configurée pour ${escapeHtml(getSalleWeekdayLabel(selectedDay))}.</td></tr>`;
    queueSidebarSalleSessionsRender();
    return;
  }

  const rowsHtml = salles
    .filter(salle=>filterSalle === 'all' ? true : salle === filterSalle)
    .map(salle=>{
      const judges = grouped.get(salle) || [];
      const jugeText = [...new Set(judges.map(v=>v.juge).filter(Boolean))]
        .sort((a, b)=>a.localeCompare(b, 'fr'))
        .join(' | ') || '-';
      const actions = canEditData()
        ? `<div class="salle-actions-list">${judges.map(j=>{
          const judgeLabel = String(j?.juge || '').trim() || 'Juge';
          return `<button type="button" class="btn-danger salle-action-btn" onclick="deleteSalleJudge(${j.id})" title="Supprimer ${escapeAttr(judgeLabel)}"><i class="fa-solid fa-trash"></i><span>${escapeHtml(judgeLabel)}</span></button>`;
        }).join('')}</div>`
        : '-';
      return `
        <tr>
          <td>${escapeHtml(salle)}</td>
          <td>${escapeHtml(jugeText)}</td>
          <td>${actions}</td>
        </tr>
      `;
    }).join('');

  body.innerHTML = rowsHtml || `<tr><td colspan="3" class="diligence-empty">Aucun résultat.</td></tr>`;

  refreshKnownJudgesDatalist({ force: options.force === true && !isVeryLargeLiveSyncMode() });
  lastSalleRenderKey = salleRenderKey;
  queueSidebarSalleSessionsRender();
}

function normalizeProcedures(d){
  if(!d || typeof d !== 'object') return [];
  const procedureDetails = d.procedureDetails && typeof d.procedureDetails === 'object'
    ? d.procedureDetails
    : null;
  const procedureDetailsKeys = procedureDetails ? Object.keys(procedureDetails) : [];
  const cacheKey = [
    Array.isArray(d.procedureList) ? d.procedureList.join('\u001f') : String(d.procedureList || ''),
    Array.isArray(d.procedure) ? d.procedure.join('\u001f') : String(d.procedure || ''),
    procedureDetailsKeys.join('\u001f')
  ].join('\u001e');
  if(d.__normalizedProceduresCacheKey === cacheKey && Array.isArray(d.__normalizedProceduresCacheValue)){
    return d.__normalizedProceduresCacheValue;
  }
  let list = [];
  if(Array.isArray(d.procedureList)) list = d.procedureList;
  else if(typeof d.procedureList === 'string') list = d.procedureList.split(',');

  if(!list.length){
    if(Array.isArray(d.procedure)) list = d.procedure;
    else if(typeof d.procedure === 'string') list = d.procedure.split(',');
  }

  if(!list.length && d.procedure) list = [String(d.procedure)];

  const fromDetails = procedureDetailsKeys;
  list = list.concat(fromDetails);

  const cleaned = list
    .map(v=>parseProcedureToken(v))
    .map(v=>String(v).trim())
    .filter(Boolean);
  const out = [...new Set(cleaned)];
  d.__normalizedProceduresCacheKey = cacheKey;
  d.__normalizedProceduresCacheValue = out;
  return out;
}

function getSelectedDossierProcedures(d){
  let list = [];
  if(Array.isArray(d?.procedureList)) list = d.procedureList;
  else if(typeof d?.procedureList === 'string') list = d.procedureList.split(',');

  if(!list.length){
    if(Array.isArray(d?.procedure)) list = d.procedure;
    else if(typeof d?.procedure === 'string') list = d.procedure.split(',');
  }

  if(!list.length && d?.procedure) list = [String(d.procedure)];

  return [...new Set(
    list
      .map(v=>parseProcedureToken(v))
      .map(v=>String(v || '').trim())
      .filter(Boolean)
  )];
}

function syncProcedureCheckboxes(procList){
  const toMatchKey = (value)=>{
    const normalized = parseProcedureToken(value);
    const base = getProcedureBaseName(normalized);
    return String(base || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  };
  const keySet = new Set((procList || [])
    .map(v=>toMatchKey(v))
    .filter(Boolean));

  document.querySelectorAll('.proc-check').forEach(cb=>{
    const rawValue = String(cb.value || '').trim();
    const checkKey = toMatchKey(rawValue);
    const shouldCheck = keySet.has(checkKey);
    cb.checked = shouldCheck;
    const label = cb.closest('label');
    if(label) label.classList.toggle('active', shouldCheck);
  });
}

function resyncProcedureSelectionFromUI(fallbackList){
  const fromCards = getProcedureCardNames();
  const source = fromCards.length ? fromCards : (fallbackList || []);
  suppressProcedureChange = true;
  syncProcedureCheckboxes(source);
  suppressProcedureChange = false;
}

function isAudienceProcedure(procName){
  const value = String(procName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if(!value) return false;
  return value !== 'sfdc' && value !== 'sbien' && value !== 'injonction';
}

function getAudienceProcedureFilterKey(procName){
  const raw = String(procName || '').trim();
  if(!raw) return '';
  const normalized = parseProcedureToken(raw);
  const base = getProcedureBaseName(normalized);
  return String(base || normalized || raw).trim();
}

function parseDateForAge(value){
  if(!value) return null;
  const raw = String(value).trim();
  if(!raw) return null;
  const isoInText = raw.match(/(\d{4}-\d{2}-\d{2})/);
  if(isoInText && isoInText[1] !== raw){
    return parseDateForAge(isoInText[1]);
  }
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m){
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return new Date(y, mo, d);
  }
  const fr = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if(fr){
    const d = Number(fr[1]);
    const mo = Number(fr[2]) - 1;
    const y = Number(fr[3]);
    return new Date(y, mo, d);
  }
  const dt = new Date(raw);
  if(Number.isNaN(dt.getTime())) return null;
  return dt;
}

function toAgeDays(value){
  const dt = parseDateForAge(value);
  if(!dt) return null;
  const now = new Date();
  const start = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  return days >= 0 ? days : 0;
}

function getDashboardAttSortCount(){
  return getAudienceRowsDedupedCached().reduce((count, row)=>{
    return count + (audienceRowMatchesColorFilter(row, 'blue') ? 1 : 0);
  }, 0);
}

function getSuiviRequiredProcedureFields(procName, details){
  const baseProc = getProcedureBaseName(parseProcedureToken(procName));
  const procDetails = details && typeof details === 'object' ? details : {};
  if(baseProc === 'Commandement'){
    return [
      'dateDepot',
      'executionNo',
      'notifConservateur',
      'notifDebiteur',
      'refExpertise',
      'ord',
      'expert',
      'sort',
      'dateVente'
    ];
  }
  if(baseProc === 'SFDC' || baseProc === 'S/bien'){
    return [
      'dateDepot',
      'depotLe',
      'referenceClient',
      'attOrdOrOrdOk',
      'executionNo',
      'attDelegationOuDelegat',
      'huissier',
      'sort',
      'tribunal'
    ];
  }
  if(baseProc === 'Injonction'){
    const fields = [
      'dateDepot',
      'depotLe',
      'referenceClient',
      'attOrdOrOrdOk',
      'notificationSort',
      'notificationNo',
      'notificationStatus',
      'certificatNonAppelStatus',
      'executionNo',
      'huissier',
      'sort',
      'tribunal'
    ];
    const notificationStatus = String(procDetails.notificationStatus || '').trim().toLowerCase();
    if(notificationStatus === 'notifier' || notificationStatus === 'nb'){
      fields.push('dateNotification');
    }
    return fields;
  }
  if(baseProc === 'Redressement' || baseProc === 'Liquidation judiciaire'){
    return [
      'syndicName',
      'notificationStatus',
      'dateNotification',
      'villeProcedure'
    ];
  }
  return [
    'dateDepot',
    'depotLe',
    'referenceClient',
    'audience',
    'juge',
    'sort',
    'tribunal'
  ];
}

function hasSuiviProcedureHistoryActivity(dossier, procName){
  const procedure = String(procName || '').trim();
  if(!procedure) return false;
  const historyEntries = Array.isArray(dossier?.history) ? dossier.history : [];
  return historyEntries.some(entry=>{
    if(String(entry?.procedure || '').trim() !== procedure) return false;
    const field = String(entry?.field || '').trim();
    if(!field.startsWith('procedureDetails.')) return false;
    return normalizeHistoryValue(entry?.before) !== normalizeHistoryValue(entry?.after);
  });
}

function isPendingDepotReferenceValue(value){
  return String(value || '').trim().includes('.');
}

function isSuiviProcedurePendingDepot(dossier, procName, details){
  const procDetails = details && typeof details === 'object' ? details : {};
  const procedureReference = String(procDetails.referenceClient || '').trim();
  return !procedureReference;
}

function hasSuiviPendingDepotRow(row){
  const dossier = row?.d;
  if(!dossier || typeof dossier !== 'object') return false;
  const procedures = normalizeProcedures(dossier);
  if(!procedures.length) return false;
  const detailsMap = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
    ? dossier.procedureDetails
    : {};
  return procedures.some(procName=>isSuiviProcedurePendingDepot(dossier, procName, detailsMap[procName]));
}

function getDashboardAttDepotCount(){
  return getSuiviBaseRowsCached().sortedDefaultRows.filter(row=>row?.hasPendingDepot === true).length;
}

function getDashboardSnapshot(){
  const userKey = getCurrentClientAccessCacheKey();
  if(
    dashboardSnapshotCache
    && dashboardSnapshotCacheVersion === dossierDataVersion
    && dashboardSnapshotCacheUserKey === userKey
  ){
    return dashboardSnapshotCache;
  }
  const clientSummaries = getClientListSummaries();
  const clotureCount = getClientClotureCountTotal();
  const totalDossiers = clientSummaries.reduce((sum, client)=>sum + Math.max(0, Number(client?.dossierCount || 0)), 0);
  const snapshot = {
    totalClients: clientSummaries.length,
    enCours: Math.max(0, totalDossiers - clotureCount),
    clotureCount
  };
  dashboardSnapshotCache = snapshot;
  dashboardSnapshotCacheVersion = dossierDataVersion;
  dashboardSnapshotCacheUserKey = userKey;
  return snapshot;
}

function getDashboardAudienceMetrics(){
  const userKey = getCurrentClientAccessCacheKey();
  if(
    dashboardAudienceMetricsCache
    && dashboardAudienceMetricsCacheVersion === dossierDataVersion
    && dashboardAudienceMetricsCacheUserKey === userKey
  ){
    return dashboardAudienceMetricsCache;
  }
  const metrics = {
    attSortCount: getDashboardAttSortCount(),
    attDepotCount: getDashboardAttDepotCount(),
    audienceErrors: getAudienceErrorDossierCount()
  };
  dashboardAudienceMetricsCache = metrics;
  dashboardAudienceMetricsCacheVersion = dossierDataVersion;
  dashboardAudienceMetricsCacheUserKey = userKey;
  return metrics;
}

function animateDashboardMetric(id, nextValue, options = {}){
  const el = $(id);
  if(!el) return;
  const safeNext = Number.isFinite(Number(nextValue)) ? Math.max(0, Math.round(Number(nextValue))) : 0;
  const prevValue = dashboardMetricState.has(id)
    ? dashboardMetricState.get(id)
    : (Number.parseInt(String(el.textContent || '0'), 10) || 0);
  dashboardMetricState.set(id, safeNext);

  const shouldReduceMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const currentAnimationFrame = dashboardMetricAnimationFrames.get(id);
  if(currentAnimationFrame && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function'){
    window.cancelAnimationFrame(currentAnimationFrame);
    dashboardMetricAnimationFrames.delete(id);
  }
  if(options.immediate === true || shouldReduceMotion || prevValue === safeNext){
    el.textContent = String(safeNext);
    return;
  }

  const card = el.closest('.stat-card');
  if(card){
    const nowTs = Date.now();
    const lastBumpAt = dashboardMetricLastBumpAt.get(id) || 0;
    if((nowTs - lastBumpAt) >= DASHBOARD_METRIC_BUMP_INTERVAL_MS){
      card.classList.remove('is-bump');
      void card.offsetWidth;
      card.classList.add('is-bump');
      dashboardMetricLastBumpAt.set(id, nowTs);
    }
  }

  const duration = 520;
  const startTs = performance.now();
  const delta = safeNext - prevValue;
  const easeOutCubic = (t)=>1 - Math.pow(1 - t, 3);

  const frame = (ts)=>{
    const p = Math.min(1, (ts - startTs) / duration);
    const v = Math.round(prevValue + (delta * easeOutCubic(p)));
    el.textContent = String(v);
    if(p < 1){
      const nextFrameId = requestAnimationFrame(frame);
      dashboardMetricAnimationFrames.set(id, nextFrameId);
      return;
    }
    dashboardMetricAnimationFrames.delete(id);
    el.textContent = String(safeNext);
  };

  const frameId = requestAnimationFrame(frame);
  dashboardMetricAnimationFrames.set(id, frameId);
}

// ================== AUDIENCE ==================
function makeAudiencePrintKey(ci, di, procKey){
  return `${Number(ci)}::${Number(di)}::${String(procKey || '')}`;
}

function getAudienceTransientPriorityColorKey(ci, di, procKey){
  return makeAudiencePrintKey(ci, di, procKey);
}

function getAudienceTransientPriorityColorForRow(row){
  const key = getAudienceTransientPriorityColorKey(row?.ci, row?.di, row?.procKey);
  return String(audienceTransientPriorityColorRows.get(key) || '').trim();
}

function queueAudienceTransientPriorityColorReset(){
  if(audienceTransientPriorityColorResetTimer) return;
  audienceTransientPriorityColorResetTimer = setTimeout(()=>{
    audienceTransientPriorityColorResetTimer = null;
    audienceTransientPriorityColorRows.clear();
    audienceTransientPinnedRowKeys.clear();
  }, 0);
}

function rememberAudienceTransientPriorityColor(ci, di, procKey, color){
  const key = getAudienceTransientPriorityColorKey(ci, di, procKey);
  const safeColor = String(color || '').trim();
  if(!key) return;
  if(!safeColor){
    audienceTransientPriorityColorRows.delete(key);
    return;
  }
  audienceTransientPriorityColorRows.set(key, safeColor);
  queueAudienceTransientPriorityColorReset();
}

function pinAudienceRowTemporarily(ci, di, procKey){
  const key = getAudienceTransientPriorityColorKey(ci, di, procKey);
  if(!key) return;
  audienceTransientPinnedRowKeys.add(key);
  queueAudienceTransientPriorityColorReset();
}

function getAudienceFilterStateKey(){
  return [
    $('filterAudience')?.value?.toLowerCase() || '',
    filterAudienceColor,
    filterAudienceProcedure,
    filterAudienceTribunal,
    filterAudienceDate,
    filterAudienceErrorsOnly ? '1' : '0',
    filterAudienceCheckedFirst ? 'checked-first' : 'default',
    selectedAudienceColor
  ].join('||');
}

function setAudienceProcedureFilter(value, options = {}){
  const nextValue = String(value || 'all').trim() || 'all';
  const changed = nextValue !== filterAudienceProcedure;
  filterAudienceProcedure = nextValue;
  if(changed && options.clearSelection !== false){
    clearAudiencePrintSelection({ immediate: true });
  }
  if(options.syncUi !== false && $('filterAudienceProcedure')){
    $('filterAudienceProcedure').value = filterAudienceProcedure;
  }
  return changed;
}

function countSelectedAudienceRows(rows){
  const list = Array.isArray(rows) ? rows : [];
  if(
    list === audienceSelectionCountRowsRef
    && audienceSelectionCountVersion === audiencePrintSelectionVersion
  ){
    return audienceSelectionCountValue;
  }
  const out = list.reduce((count, row)=>count + (isAudienceSelectedForPrint(row?.ci, row?.di, row?.procKey) ? 1 : 0), 0);
  audienceSelectionCountRowsRef = list;
  audienceSelectionCountVersion = audiencePrintSelectionVersion;
  audienceSelectionCountValue = out;
  return out;
}

function syncAudienceRenderedSelectionCache(rows, pageRows, stateKey, page){
  const filteredRows = Array.isArray(rows) ? rows : [];
  const visibleRows = Array.isArray(pageRows) ? pageRows : [];
  lastAudienceRenderedRows = filteredRows;
  lastAudienceRenderedPageRows = visibleRows;
  lastAudienceRenderedStateKey = String(stateKey || '');
  lastAudienceRenderedPage = Math.max(1, Number(page) || 1);
  lastAudienceRenderedRowKeySet = new Set(filteredRows.map((row)=>makeAudiencePrintKey(row?.ci, row?.di, row?.procKey)));
  lastAudienceRenderedSelectedCount = countSelectedAudienceRows(filteredRows);
}

function isAudienceSelectedForPrint(ci, di, procKey){
  return audiencePrintSelection.has(makeAudiencePrintKey(ci, di, procKey));
}

function getSelectedAudienceRowsCount(){
  const sourceRows = getFilteredAudienceRows(getAudienceRows({ ignoreSearch: true, ignoreColor: true }));
  return countSelectedAudienceRows(sourceRows);
}

function queueAudienceCheckedCountRender(){
  if(audienceCheckedCountRenderQueued) return;
  audienceCheckedCountRenderQueued = true;
  const render = ()=>{
    audienceCheckedCountRenderQueued = false;
    updateAudienceCheckedCount();
  };
  if(typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'){
    window.requestAnimationFrame(render);
    return;
  }
  setTimeout(render, 0);
}

function pruneAudiencePrintSelection(rows = null){
  const currentDataVersion = audienceRowsRawDataVersion;
  if(currentDataVersion === audiencePrintSelectionPruneDataVersion){
    return false;
  }
  const sourceRows = Array.isArray(rows) ? rows : getAudienceRowsDedupedCached();
  const validKeys = new Set(sourceRows.map(row=>makeAudiencePrintKey(row.ci, row.di, row.procKey)));
  let changed = false;
  audiencePrintSelection.forEach(key=>{
    if(validKeys.has(key)) return;
    audiencePrintSelection.delete(key);
    changed = true;
  });
  audiencePrintSelectionPruneDataVersion = currentDataVersion;
  if(changed){
    audiencePrintSelectionVersion += 1;
    lastAudienceRenderedSelectedCount = countSelectedAudienceRows(lastAudienceRenderedRows);
  }
  return changed;
}

function updateAudienceCheckedCount(){
  const count = audiencePrintSelection.size;
  const node = $('audienceCheckedCountValue');
  if(node) node.textContent = String(count);
  syncAudienceColorActionAvailability();
  syncAudiencePageSelectionToggle();
  syncAudienceSelectionActionButton();
}

function syncAudienceSelectionActionButton(){
  const btn = $('printAudienceBtn');
  if(!btn) return;
  const rows = getVisibleAudiencePageRowsForPrintSelection();
  const total = rows.length;
  const selected = total ? countSelectedAudienceRows(rows) : 0;
  const shouldClear = total > 0 && selected === total;
  btn.innerHTML = shouldClear
    ? '<i class="fa-regular fa-square-minus"></i> Décocher'
    : '<i class="fa-solid fa-square-check"></i> Cocher';
  btn.disabled = total === 0;
  btn.classList.toggle('is-disabled', total === 0);
  if(total === 0){
    btn.setAttribute('aria-disabled', 'true');
    btn.title = 'Aucune ligne visible sur cette page.';
    return;
  }
  btn.removeAttribute('aria-disabled');
  btn.title = shouldClear
    ? 'Décocher toutes les lignes visibles de cette page.'
    : 'Cocher toutes les lignes visibles de cette page.';
}

function showAudienceSaveFeedback(message, tone = 'muted'){
  const node = $('audienceSaveFeedback');
  if(!node) return;
  const text = String(message || '').trim();
  if(audienceSaveFeedbackTimer){
    clearTimeout(audienceSaveFeedbackTimer);
    audienceSaveFeedbackTimer = null;
  }
  if(!text){
    node.textContent = '';
    node.style.display = 'none';
    node.className = 'audience-save-feedback';
    return;
  }
  node.textContent = text;
  node.style.display = 'inline-flex';
  node.className = `audience-save-feedback is-${tone}`;
  audienceSaveFeedbackTimer = setTimeout(()=>{
    const currentNode = $('audienceSaveFeedback');
    if(!currentNode) return;
    currentNode.textContent = '';
    currentNode.style.display = 'none';
    currentNode.className = 'audience-save-feedback';
    audienceSaveFeedbackTimer = null;
  }, 2600);
}

function shouldHandleAudienceSaveShortcut(event){
  if(!event || event.defaultPrevented || event.key !== 'Enter') return false;
  if(event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return false;
  if(!canEditData()) return false;
  const target = event.target;
  if(typeof Element === 'undefined' || !(target instanceof Element)) return false;
  const audienceSection = $('audienceSection');
  if(!audienceSection || audienceSection.style.display === 'none' || !audienceSection.contains(target)) return false;
  if(target.closest('#importResultModal, #exportPreviewModal')) return false;
  if(target.closest('.search-box, .audience-color-filter, .audience-actions-right, .import-excel')) return false;
  if(target.closest('textarea') || target.isContentEditable) return false;
  return !!target.closest('#audienceTableContainer');
}

function handleAudienceSaveShortcut(event){
  if(!shouldHandleAudienceSaveShortcut(event)) return;
  event.preventDefault();
  saveAllAudience({ feedback: true });
}

function clearAudiencePrintSelection(options = {}){
  if(!audiencePrintSelection.size){
    if(options.immediate) updateAudienceCheckedCount();
    return false;
  }
  audiencePrintSelection = new Set();
  audiencePrintSelectionVersion += 1;
  lastAudienceRenderedSelectedCount = 0;
  if(options.immediate){
    updateAudienceCheckedCount();
    return true;
  }
  queueAudienceCheckedCountRender();
  return true;
}

function toggleAudiencePrintSelection(ci, di, procKey, checked){
  const key = makeAudiencePrintKey(ci, di, procKey);
  if(checked){
    const sizeBefore = audiencePrintSelection.size;
    audiencePrintSelection.add(key);
    if(audiencePrintSelection.size !== sizeBefore){
      audiencePrintSelectionVersion += 1;
      if(lastAudienceRenderedRowKeySet.has(key)){
        lastAudienceRenderedSelectedCount = Math.min(
          lastAudienceRenderedRows.length,
          lastAudienceRenderedSelectedCount + 1
        );
      }
      queueAudienceCheckedCountRender();
    }
    return;
  }
  if(audiencePrintSelection.delete(key)){
    audiencePrintSelectionVersion += 1;
    if(lastAudienceRenderedRowKeySet.has(key)){
      lastAudienceRenderedSelectedCount = Math.max(0, lastAudienceRenderedSelectedCount - 1);
    }
    queueAudienceCheckedCountRender();
  }
}

function clearAudienceRowPrintSelection(ci, di, procKey){
  const key = makeAudiencePrintKey(ci, di, procKey);
  if(!audiencePrintSelection.delete(key)) return false;
  audiencePrintSelectionVersion += 1;
  if(lastAudienceRenderedRowKeySet.has(key)){
    lastAudienceRenderedSelectedCount = Math.max(0, lastAudienceRenderedSelectedCount - 1);
  }
  queueAudienceCheckedCountRender();
  return true;
}

function toggleAudiencePrintSelectionEncoded(ci, di, procKeyEncoded, checked){
  toggleAudiencePrintSelection(ci, di, decodeURIComponent(String(procKeyEncoded)), checked);
}

function toggleAudienceSelectionAndColorEncoded(ci, di, procKeyEncoded, checked){
  const procKey = decodeURIComponent(String(procKeyEncoded));
  toggleAudiencePrintSelection(ci, di, procKey, checked);
  if(filterAudienceCheckedFirst){
    paginationState.audience = 1;
    renderAudience();
  }
}

function getActiveAudiencePriorityColor(){
  if(filterAudienceColor && filterAudienceColor !== 'all') return 'all';
  const activeBtn = document.querySelector('.color-btn[data-color].active');
  const color = String(activeBtn?.dataset?.color || '').trim();
  return color || selectedAudienceColor || 'all';
}

function getSelectedAudienceAppliedColorValue(){
  const explicitSelectedColor = String(selectedAudienceColor || '').trim();
  const filterSelectedColor = String(filterAudienceColor || '').trim();
  const targetColor = explicitSelectedColor && explicitSelectedColor !== 'all'
    ? explicitSelectedColor
    : filterSelectedColor;
  const allowed = new Set(['blue', 'green', 'red', 'yellow', 'document-ok', 'purple-dark', 'purple-light', 'closed']);
  if(!allowed.has(targetColor) || targetColor === 'all') return '';
  return targetColor === 'closed' ? 'purple-dark' : targetColor;
}

function clearSelectedAudienceColorFromRow(ci, di, procKey, appliedColor){
  const client = AppState.clients?.[ci];
  if(!canEditData() || !canEditClient(client)) return false;
  const dossier = AppState.clients?.[ci]?.dossiers?.[di];
  if(!dossier) return false;
  const p = getAudienceProcedure(ci, di, procKey);
  const currentRow = {
    c: client,
    d: dossier,
    procKey,
    p,
    draft: {},
    ci,
    di
  };
  if(getAudienceRowEffectiveColor(currentRow) !== appliedColor){
    return false;
  }
  detachAudienceImportBatchOwnership(p);
  let changed = false;
  if(appliedColor === 'green' || appliedColor === 'yellow'){
    delete p._audienceSortOrd;
    delete p.attOrdOrOrdOk;
    if(['green', 'yellow'].includes(String(p?.color || '').trim())){
      p.color = '';
    }
    delete p._disableAudienceRowColor;
    delete p._suppressAudienceOrdonnanceColor;
    changed = true;
  }else if(appliedColor === 'purple-dark' || appliedColor === 'purple-light'){
    if(String(p?.color || '').trim() === appliedColor){
      p.color = '';
      changed = true;
    }
    if(appliedColor === 'purple-dark' && String(dossier?.statut || '').trim() === 'Soldé'){
      dossier.statut = 'En cours';
      changed = true;
    }
    if(appliedColor === 'purple-light' && String(dossier?.statut || '').trim() === 'Arrêt définitif'){
      dossier.statut = 'En cours';
      changed = true;
    }
  }else{
    if(String(p?.color || '').trim() === appliedColor){
      p.color = '';
      changed = true;
    }
  }
  if(!changed) return false;
  rememberAudienceTransientPriorityColor(ci, di, procKey, appliedColor);
  pinAudienceRowTemporarily(ci, di, procKey);
  clearAudienceRowPrintSelection(ci, di, procKey);
  markAudienceColorCachesDirty();
  queueAudienceColorBatchUpdate({
    persist: true,
    persistClientId: client.id,
    persistDossier: dossier,
    dashboard: true,
    suivi: true
  });
  return true;
}

function applySelectedAudienceColorToRow(ci, di, procKey){
  const appliedColor = getSelectedAudienceAppliedColorValue();
  if(!appliedColor) return false;
  if(clearSelectedAudienceColorFromRow(ci, di, procKey, appliedColor)){
    return true;
  }
  const client = AppState.clients?.[ci];
  if(!canEditData() || !canEditClient(client)) return false;
  const dossier = AppState.clients?.[ci]?.dossiers?.[di];
  if(!dossier) return false;
  const p = getAudienceProcedure(ci, di, procKey);
  rememberAudienceTransientPriorityColor(ci, di, procKey, '');
  pinAudienceRowTemporarily(ci, di, procKey);
  clearAudienceRowPrintSelection(ci, di, procKey);
  detachAudienceImportBatchOwnership(p);
  delete p._disableAudienceRowColor;
  delete p._suppressAudienceOrdonnanceColor;
  if(String(p?.color || '').trim() === appliedColor) return false;
  p.color = appliedColor;
  if(appliedColor === 'purple-dark') dossier.statut = 'Soldé';
  if(appliedColor === 'purple-light') dossier.statut = 'Arrêt définitif';
  markAudienceColorCachesDirty();
  queueAudienceColorBatchUpdate({
    persist: true,
    persistClientId: client.id,
    persistDossier: dossier,
    dashboard: true,
    suivi: true
  });
  return true;
}

function getAudienceRowDateValue(row){
  if(typeof row?.__audienceDateDisplay === 'string') return row.__audienceDateDisplay;
  const value = formatAudienceDateDisplayValue(row?.draft?.dateAudience || row?.p?.audience || '');
  if(row && typeof row === 'object') row.__audienceDateDisplay = value;
  return value;
}

function formatAudienceDateDisplayValue(value){
  if(value === null || value === undefined) return '';
  const normalized = normalizeDateDDMMYYYY(value);
  if(normalized) return normalized;
  const text = String(value || '').trim();
  if(!text) return '';
  const parsed = new Date(text);
  if(!Number.isNaN(parsed.getTime())){
    return formatDateDDMMYYYY(parsed);
  }
  return text;
}

function normalizeIsoDateToDDMMYYYY(value){
  const text = String(value || '').trim();
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function getAudienceRowRefClientDisplayKey(row){
  const displayed = row?.p?._refClientMismatch
    ? String(row?.p?._refClientProvided || '')
    : String(row?.d?.referenceClient || '');
  return normalizeReferenceValue(displayed);
}

function buildAudienceMismatchRefClientSet(rows){
  if(rows === audienceMismatchRefClientSetCacheInput){
    return audienceMismatchRefClientSetCacheOutput;
  }
  const set = new Set();
  (rows || []).forEach(row=>{
    if(!row?.p?._refClientMismatch) return;
    const key = getAudienceRowRefClientDisplayKey(row);
    if(key) set.add(key);
  });
  audienceMismatchRefClientSetCacheInput = rows;
  audienceMismatchRefClientSetCacheOutput = set;
  return set;
}

function getAudienceRowDraftReferenceValue(row){
  return String(row?.draft?.refDossier || row?.p?.referenceClient || row?.d?.referenceClient || '').trim();
}

function getAudiencePriorityBucket(row, duplicateKeySet, mismatchRefClientSet){
  const isRefClientMismatch = !!row?.p?._refClientMismatch;
  if(isRefClientMismatch) return 0;
  const refClientKey = getAudienceRowRefClientDisplayKey(row);
  if(refClientKey && mismatchRefClientSet.has(refClientKey)) return 1;
  const isOtherError = isAudienceRowInvalid(row, duplicateKeySet);
  if(isOtherError) return 2;
  return 3;
}

function getFilteredAudienceRows(allRows = null){
  const rows = Array.isArray(allRows) ? allRows : getAudienceRows();
  const priorityColor = getActiveAudiencePriorityColor();
  const strictPriorityColorFilter = (!filterAudienceErrorsOnly && filterAudienceColor === 'all' && priorityColor === 'closed')
    ? priorityColor
    : '';
  const filterKey = [
    filterAudienceProcedure,
    filterAudienceTribunal,
    filterAudienceDate,
    filterAudienceErrorsOnly ? '1' : '0',
    strictPriorityColorFilter || priorityColor || 'all'
  ].join('||');
  if(rows === audienceFilteredRowsCacheInput && filterKey === audienceFilteredRowsCacheKey){
    return orderAudienceRowsByCheckedSelection(audienceFilteredRowsCacheOutput);
  }
  const duplicateKeySet = getAudienceDuplicateKeySet(rows);
  const mismatchRefClientSet = buildAudienceMismatchRefClientSet(rows);
  const targetDate = filterAudienceDate ? normalizeIsoDateToDDMMYYYY(filterAudienceDate) : '';
  const filtered = rows.filter(row=>{
    if(filterAudienceProcedure !== 'all' && row.__procFilterKey !== filterAudienceProcedure) return false;
    if(filterAudienceTribunal !== 'all' && row.__tribunalFilterKey !== filterAudienceTribunal) return false;
    if(filterAudienceDate){
      const rowDate = row.__audienceDateDisplay || (row.__audienceDateDisplay = getAudienceRowDateValue(row));
      if(targetDate && rowDate !== targetDate) return false;
    }
    if(filterAudienceErrorsOnly && !isAudienceRowInvalid(row, duplicateKeySet)) return false;
    if(strictPriorityColorFilter && !audienceRowMatchesColorFilter(row, strictPriorityColorFilter)) return false;
    return true;
  });
  const decorated = filtered.map(row=>{
    const bucket = getAudienceDisplayOrderBucket(row, duplicateKeySet, mismatchRefClientSet);
    const priorityRank = (!filterAudienceErrorsOnly && priorityColor && priorityColor !== 'all' && !strictPriorityColorFilter)
      ? (audienceRowMatchesColorFilter(row, priorityColor) ? 0 : 1)
      : 0;
    const sortMeta = buildAudienceSortMeta(row);
    return { row, bucket, priorityRank, sortMeta };
  });
  decorated.sort((a, b)=>{
    if(a.bucket !== b.bucket) return a.bucket - b.bucket;
    if(a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
    return compareAudienceSortMeta(a.sortMeta, b.sortMeta);
  });
  const out = applyAudienceTransientPinnedRowOrder(decorated.map(item=>item.row));
  audienceFilteredRowsCacheInput = rows;
  audienceFilteredRowsCacheKey = filterKey;
  audienceFilteredRowsCacheOutput = out;
  return orderAudienceRowsByCheckedSelection(out);
}

function applyAudienceTransientPinnedRowOrder(rows){
  const list = Array.isArray(rows) ? rows.slice() : [];
  if(!list.length || !audienceTransientPinnedRowKeys.size || !lastAudienceRenderedRows.length){
    return list;
  }
  const previousIndexByKey = new Map();
  lastAudienceRenderedRows.forEach((row, index)=>{
    previousIndexByKey.set(makeAudiencePrintKey(row?.ci, row?.di, row?.procKey), index);
  });
  const pinnedMoves = [];
  list.forEach((row)=>{
    const key = makeAudiencePrintKey(row?.ci, row?.di, row?.procKey);
    if(!audienceTransientPinnedRowKeys.has(key)) return;
    const previousIndex = previousIndexByKey.get(key);
    if(!Number.isFinite(previousIndex)) return;
    pinnedMoves.push({ key, previousIndex });
  });
  pinnedMoves
    .sort((a, b)=>a.previousIndex - b.previousIndex)
    .forEach((move)=>{
      const currentIndex = list.findIndex(row=>makeAudiencePrintKey(row?.ci, row?.di, row?.procKey) === move.key);
      if(currentIndex < 0) return;
      const [row] = list.splice(currentIndex, 1);
      const targetIndex = Math.max(0, Math.min(move.previousIndex, list.length));
      list.splice(targetIndex, 0, row);
    });
  return list;
}

function applyColorToSelectedAudienceRows(color){
  const targetColor = String(color || '').trim();
  const allowed = new Set(['white', 'blue', 'green', 'red', 'yellow', 'document-ok', 'purple-dark', 'purple-light', 'closed']);
  if(!allowed.has(targetColor) || !audiencePrintSelection.size) return false;
  const rows = getAudienceRows({ ignoreSearch: true, ignoreColor: true });
  let changed = false;
  let lastClientId = null;
  let lastDossier = null;
  rows.forEach(row=>{
    const key = makeAudiencePrintKey(row.ci, row.di, row.procKey);
    if(!audiencePrintSelection.has(key)) return;
    const dossier = AppState.clients?.[row.ci]?.dossiers?.[row.di];
    const client = AppState.clients?.[row.ci];
    if(!dossier || !client) return;
    const p = getAudienceProcedure(row.ci, row.di, row.procKey);
    detachAudienceImportBatchOwnership(p);
    const currentEffectiveColor = String(getAudienceRowEffectiveColor(row) || '').trim();
    let rowChanged = false;
    if(targetColor === 'white'){
      rowChanged = applyAudienceWhiteColorState(p, dossier, currentEffectiveColor);
      if(!rowChanged && !currentEffectiveColor) return;
    }else if(targetColor === 'green' || targetColor === 'yellow'){
      rowChanged = applyAudienceOrdonnanceColorState(p, targetColor);
      if(!rowChanged && getAudienceRowOrdonnanceColor(row) === targetColor) return;
    }else{
      const appliedColor = targetColor === 'closed' ? 'purple-dark' : targetColor;
      delete p._disableAudienceRowColor;
      delete p._suppressAudienceOrdonnanceColor;
      if(String(p?.color || '').trim() === appliedColor) return;
      p.color = appliedColor;
      if(appliedColor === 'purple-dark') dossier.statut = 'Soldé';
      if(appliedColor === 'purple-light') dossier.statut = 'Arrêt définitif';
      rowChanged = true;
    }
    rememberAudienceTransientPriorityColor(row.ci, row.di, row.procKey, currentEffectiveColor);
    pinAudienceRowTemporarily(row.ci, row.di, row.procKey);
    changed = changed || rowChanged;
    lastClientId = client.id;
    lastDossier = dossier;
  });
  if(!changed) return false;
  markAudienceColorCachesDirty();
  queueAudienceColorBatchUpdate({
    persist: true,
    persistClientId: lastClientId,
    persistDossier: lastDossier,
    dashboard: true,
    suivi: true
  });
  return true;
}

function setAllVisibleAudienceRowsForPrint(checked){
  const rows = getVisibleAudiencePageRowsForPrintSelection();
  if(!rows.length){
    alert('Aucune ligne visible.');
    return;
  }
  let changed = false;
  if(checked){
    rows.forEach(row=>{
      const sizeBefore = audiencePrintSelection.size;
      audiencePrintSelection.add(makeAudiencePrintKey(row.ci, row.di, row.procKey));
      if(audiencePrintSelection.size !== sizeBefore) changed = true;
    });
  }else{
    rows.forEach(row=>{
      if(audiencePrintSelection.delete(makeAudiencePrintKey(row.ci, row.di, row.procKey))){
        changed = true;
      }
    });
  }
  if(changed) audiencePrintSelectionVersion += 1;
  if(changed && getAudienceFilterStateKey() === lastAudienceRenderedStateKey){
    lastAudienceRenderedSelectedCount = countSelectedAudienceRows(lastAudienceRenderedRows);
  }
  queueAudienceCheckedCountRender();
  if(filterAudienceCheckedFirst) paginationState.audience = 1;
  renderAudience();
}

function getVisibleAudiencePageRowsForPrintSelection(){
  const currentStateKey = getAudienceFilterStateKey();
  if(
    currentStateKey === lastAudienceRenderedStateKey
    && lastAudienceRenderedPage === (Number(paginationState.audience) || 1)
  ){
    return lastAudienceRenderedPageRows;
  }
  return getCurrentPageRows(getFilteredAudienceRows(), 'audience');
}

function getAllFilteredAudienceRowsForPrintSelection(){
  if(getAudienceFilterStateKey() === lastAudienceRenderedStateKey){
    return lastAudienceRenderedRows;
  }
  return getFilteredAudienceRows();
}

function syncAudiencePageSelectionToggle(){
  const rows = getAllFilteredAudienceRowsForPrintSelection();
  const selected = (
    rows === lastAudienceRenderedRows
    && getAudienceFilterStateKey() === lastAudienceRenderedStateKey
  )
    ? lastAudienceRenderedSelectedCount
    : countSelectedAudienceRows(rows);
  syncPageSelectionToggleControl('audiencePageSelectionToggle', 'audienceCheckedCount', rows.length, selected);
}

function setAllFilteredAudienceRowsForPrint(checked){
  const rows = getAllFilteredAudienceRowsForPrintSelection();
  if(!rows.length){
    alert('Aucune ligne filtrée.');
    return;
  }
  let changed = false;
  rows.forEach(row=>{
    const key = makeAudiencePrintKey(row.ci, row.di, row.procKey);
    if(checked){
      const sizeBefore = audiencePrintSelection.size;
      audiencePrintSelection.add(key);
      if(audiencePrintSelection.size !== sizeBefore) changed = true;
    }else{
      if(audiencePrintSelection.delete(key)) changed = true;
    }
  });
  if(changed) audiencePrintSelectionVersion += 1;
  if(changed && rows === lastAudienceRenderedRows){
    lastAudienceRenderedSelectedCount = checked ? rows.length : 0;
  }
  queueAudienceCheckedCountRender();
  if(filterAudienceCheckedFirst) paginationState.audience = 1;
  renderAudience();
}

function getAudienceDateDepotDisplayValue(row){
  const depotLeRaw = String(row?.p?.depotLe || '').trim();
  if(depotLeRaw){
    return normalizeDateDDMMYYYY(depotLeRaw) || depotLeRaw;
  }

  const dateDepotRaw = String(row?.p?.dateDepot || '').trim();
  if(!dateDepotRaw) return '-';
  const normalizedDepot = normalizeDateDDMMYYYY(dateDepotRaw) || dateDepotRaw;

  const dateAffectationRaw = String(row?.d?.dateAffectation || '').trim();
  const normalizedAffectation = normalizeDateDDMMYYYY(dateAffectationRaw) || dateAffectationRaw;

  // Ignore dateDepot when it is only a copy of date d'affectation.
  if(normalizedAffectation && normalizedDepot === normalizedAffectation){
    return '-';
  }
  return normalizedDepot;
}

function compareAudienceRowsForExport(a, b) {
  // Use the reference-based sorting logic which handles the YYYY/8104/XXXX format.
  // Requirement: YYYY Descending, XXXX Descending.
  return compareAudienceRowsByReferenceProximity(a, b, { direction: -1 });
}

function getSelectedAudienceRowsForExport(){
  const rows = getAudienceRows({ ignoreSearch: true, ignoreColor: true });
  if(
    rows === audienceSelectedExportRowsCacheInput
    && audienceSelectedExportRowsCacheVersion === audiencePrintSelectionVersion
  ){
    return audienceSelectedExportRowsCacheOutput;
  }
  const out = rows
    .filter(row=>isAudienceSelectedForPrint(row.ci, row.di, row.procKey))
    .sort(compareAudienceRowsForExport);
  audienceSelectedExportRowsCacheInput = rows;
  audienceSelectedExportRowsCacheVersion = audiencePrintSelectionVersion;
  audienceSelectedExportRowsCacheOutput = out;
  return out;
}

function buildAudienceSelectedExportDatasetBase(rowsOverride = null, options = {}){
  const omitSort = options?.omitSort === true;
  const audienceRows = Array.isArray(rowsOverride)
    ? rowsOverride.slice()
    : getSelectedAudienceRowsForExport();
  const closedStatusLookup = audienceRows.length ? getAudienceClosedStatusLookupCached() : null;
  const headers = omitSort ? [
    'Client',
    'Adversaire',
    'N° Dossier',
    'Juge',
    'Instruction',
    'Tribunal'
  ] : [
    'Client',
    'Adversaire',
    'N° Dossier',
    'Juge',
    'Instruction',
    'Sort',
    'Tribunal'
  ];
  const dateAudienceTop = audienceRows
    .map(r=>normalizeDateDDMMYYYY(r?.draft?.dateAudience || r?.p?.audience || '') || String(r?.draft?.dateAudience || r?.p?.audience || '').trim())
    .find(v=>String(v || '').trim()) || '-';
  return {
    rows: audienceRows,
    closedStatusLookup,
    headers,
    subtitle: `Date d'audience : ${dateAudienceTop}`,
    colWidths: omitSort
      ? [{ wch: 22 }, { wch: 28 }, { wch: 34 }, { wch: 22 }, { wch: 34 }, { wch: 46 }]
      : [
        { wch: 14.77734375 },
        { wch: 20.6640625 },
        { wch: 16.33203125 },
        { wch: 13.77734375 },
        { wch: 16.77734375 },
        { wch: 23.21875 },
        { wch: 26.88671875 }
      ]
  };
}

function getAudienceExportStatusValue(row, closedStatusLookup = null){
  if(closedStatusLookup instanceof Map){
    return String(resolveAudienceRowStatusSnapshot(row, closedStatusLookup)?.statut || 'En cours').trim() || 'En cours';
  }
  return String(row?.__resolvedStatus || row?.d?.statut || 'En cours').trim() || 'En cours';
}

function getAudienceExportOrdonnanceValue(row){
  const normalizedStatus = normalizeDiligenceOrdonnance(
    String(row?.p?.attOrdOrOrdOk || row?.p?._audienceSortOrd || '').trim()
  );
  return normalizedStatus ? (getDiligenceOrdonnanceLabel(normalizedStatus) || '') : '';
}

function formatAudienceExportWrappedName(value){
  const text = normalizeLooseText(value);
  if(!text || /\r?\n/.test(text)) return text;
  const tokens = text.split(/\s+/).filter(Boolean);
  if(tokens.length <= 1) return text;
  const maxLineLength = 14;
  const maxWordsPerLine = 2;
  const lines = [];
  let currentLineTokens = [];
  let currentLineLength = 0;
  tokens.forEach((token)=>{
    const nextLineLength = currentLineTokens.length
      ? currentLineLength + 1 + token.length
      : token.length;
    const shouldWrap = currentLineTokens.length > 0 && (
      currentLineTokens.length >= maxWordsPerLine
      || nextLineLength > maxLineLength
    );
    if(shouldWrap){
      lines.push(currentLineTokens.join(' '));
      currentLineTokens = [token];
      currentLineLength = token.length;
      return;
    }
    currentLineTokens.push(token);
    currentLineLength = nextLineLength;
  });
  if(currentLineTokens.length){
    lines.push(currentLineTokens.join(' '));
  }
  return lines.join('\n');
}

function buildAudienceSelectedExportTableRow(row, options = {}){
  const omitSort = options?.omitSort === true;
  const blankSort = options?.blankSort === true;
  const p = row?.p || {};
  const d = row?.d || {};
  const draft = row?.draft || {};
  const dossierRef = getAudienceRowDraftReferenceValue(row);
  const rawSortValue = draft.sort || p.sort || '';
  const instructionValue = formatMixedDirectionExportText(
    draft.instruction || p.instruction || rawSortValue
  );
  const jugeValue = draft.juge || p.juge || '';
  const sortValue = blankSort ? '' : formatMixedDirectionExportText(rawSortValue);
  const clientValue = formatAudienceExportWrappedName(row?.c?.name || '');
  const adversaireValue = formatAudienceExportWrappedName(d.debiteur || '');
  const out = [
    clientValue,
    adversaireValue,
    dossierRef || '-',
    jugeValue,
    instructionValue,
    p.tribunal || ''
  ];
  if(!omitSort){
    out.splice(5, 0, sortValue);
  }
  return out;
}

function blankAudienceExportSortColumn(headers, rows, options = {}){
  if(options?.blankSort !== true) return Array.isArray(rows) ? rows : [];
  const sortIndex = (Array.isArray(headers) ? headers : []).findIndex((header)=>{
    return normalizeLooseText(String(header || '')).toLowerCase() === 'sort';
  });
  if(sortIndex === -1) return Array.isArray(rows) ? rows : [];
  return (Array.isArray(rows) ? rows : []).map((row)=>{
    if(!Array.isArray(row)) return row;
    const nextRow = row.slice();
    if(sortIndex < nextRow.length) nextRow[sortIndex] = '';
    return nextRow;
  });
}

function getAudienceExportCellDisplayWidth(value){
  const text = String(value ?? '')
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .trim();
  if(!text) return 0;
  return text
    .split(/\r?\n/)
    .reduce((maxWidth, segment)=>Math.max(maxWidth, String(segment || '').trim().length), 0);
}

function buildAudienceExportColumnWidths(headers, rows, baseColWidths = []){
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  const normalizedHeaders = safeHeaders.map((header)=>normalizeLooseText(String(header || '')).toLowerCase());
  const nextWidths = (Array.isArray(baseColWidths) && baseColWidths.length
    ? baseColWidths
    : safeHeaders.map(()=>({ wch: 22 }))
  ).map((item)=>({ wch: Math.max(8, Number(item?.wch || item || 22)) }));

  if(safeRows.length >= 2000){
    return nextWidths;
  }

  const applyDynamicWidth = (index, { min = 12, max = 60, factor = 1.15, padding = 2 } = {})=>{
    if(index < 0 || index >= nextWidths.length) return;
    const headerWidth = getAudienceExportCellDisplayWidth(safeHeaders[index]) + padding;
    const contentWidth = safeRows.reduce((largestWidth, row)=>{
      if(!Array.isArray(row) || index >= row.length) return largestWidth;
      return Math.max(largestWidth, getAudienceExportCellDisplayWidth(row[index]));
    }, 0);
    const dynamicWidth = Math.ceil((contentWidth * factor) + padding);
    nextWidths[index] = {
      wch: Math.max(
        min,
        Number(nextWidths[index]?.wch || min),
        headerWidth,
        Math.min(max, dynamicWidth)
      )
    };
  };

  const dossierIndex = normalizedHeaders.findIndex((header)=>header.includes('dossier'));
  const tribunalIndex = normalizedHeaders.findIndex((header)=>header === 'tribunal');

  applyDynamicWidth(dossierIndex, { min: 18, max: 30, factor: 1.35, padding: 3 });
  applyDynamicWidth(tribunalIndex, { min: 32, max: 58, factor: 1.15, padding: 4 });

  return nextWidths;
}

function getAudienceRowsForDetailedExportFallback(){
  return getSelectedAudienceRowsForExport();
}

function buildAudienceSelectedExportDataset(rowsOverride = null, options = {}){
  const dataset = buildAudienceSelectedExportDatasetBase(rowsOverride, options);
  const tableRows = blankAudienceExportSortColumn(
    dataset.headers,
    dataset.rows.map((row)=>buildAudienceSelectedExportTableRow(row, {
      ...options,
      closedStatusLookup: dataset.closedStatusLookup
    })),
    options
  );
  return {
    ...dataset,
    colWidths: buildAudienceExportColumnWidths(dataset.headers, tableRows, dataset.colWidths),
    tableRows
  };
}

function openAudienceExcelFilePreviewWindow(){
  const exportRows = getAudienceRowsForDetailedExportFallback();
  const dataset = buildAudienceSelectedExportDataset(exportRows, { blankSort: true });
  if(!dataset.rows.length){
    alert("Cochez les dossiers à afficher dans le fichier.");
    return;
  }
  const browserDownloadTarget = primeBrowserDownloadTarget('Ouverture du fichier Excel...');
  exportAudienceXLS({
    blankSort: true,
    openAfterExport: true,
    browserDownloadTarget,
    browserOpenInline: true
  }).catch(err=>{
    console.error(err);
    alert("Ouverture du fichier Excel impossible.");
  });
}

async function buildAudienceSelectedExportDatasetAsync(rowsOverride = null, options = {}){
  const dataset = buildAudienceSelectedExportDatasetBase(rowsOverride, options);
  const rawTableRows = await mapChunked(
    dataset.rows,
    async (row)=>buildAudienceSelectedExportTableRow(row, {
      ...options,
      closedStatusLookup: dataset.closedStatusLookup
    }),
    { chunkSize: 80, onProgress: makeProgressReporter('Export audience') }
  );
  return {
    ...dataset,
    colWidths: buildAudienceExportColumnWidths(
      dataset.headers,
      blankAudienceExportSortColumn(dataset.headers, rawTableRows, options),
      dataset.colWidths
    ),
    tableRows: blankAudienceExportSortColumn(dataset.headers, rawTableRows, options)
  };
}

function previewAudienceSelectedRows(){
  const dataset = buildAudienceSelectedExportDataset(getAudienceRowsForDetailedExportFallback(), { blankSort: true });
  if(!dataset.rows.length){
    alert("Cochez au moins une ligne pour afficher le fichier.");
    return;
  }
  showAudienceExportPreviewModal({
    title: "Aperçu Excel - Export d'audience",
    subtitle: dataset.subtitle,
    headers: dataset.headers,
    rows: dataset.tableRows,
    exportLabel: 'Aperçu Excel',
    onExport: openAudienceExcelFilePreviewWindow
  });
}

function getAudienceRowReferenceValue(row){
  if(typeof row?.__rowReference === 'string') return row.__rowReference;
  const value = normalizeReferenceForAudienceLookup(getAudienceRowDraftReferenceValue(row));
  if(row && typeof row === 'object') row.__rowReference = value;
  return value;
}

function parseAudienceReferenceParts(value){
  const ref = normalizeReferenceForAudienceLookup(value);
  const m = ref.match(/^(\d+)\/(\d+)\/(\d{2,4})$/);
  if(!m) return null;
  const first = Number(m[1]);
  const middle = Number(m[2]);
  const rawYear = Number(m[3]);
  if(!Number.isFinite(first) || !Number.isFinite(middle) || !Number.isFinite(rawYear)){
    return null;
  }
  const year = m[3].length === 2
    ? (rawYear >= 70 ? 1900 + rawYear : 2000 + rawYear)
    : rawYear;
  return { first, middle, year };
}

function compareAudienceRowsByReferenceProximity(a, b, options = {}){
  const direction = options.direction === 1 ? 1 : -1; // Default to DESC (-1) as requested first
  const metaA = buildAudienceSortMeta(a);
  const metaB = buildAudienceSortMeta(b);
  const refA = metaA.ref;
  const refB = metaB.ref;
  const pa = metaA.parts;
  const pb = metaB.parts;

  if(pa && pb){
    // Priority 1: YYYY
    if(pa.year !== pb.year) return (pa.year - pb.year) * direction;
    // Priority 2: XXXX (First part)
    if(pa.first !== pb.first) return (pa.first - pb.first) * direction;
  }else if(pa){
    return -1;
  }else if(pb){
    return 1;
  }

  const byRef = refA.localeCompare(refB, 'fr', { numeric: true, sensitivity: 'base' });
  if(byRef !== 0) return byRef;

  const byClient = String(metaA.client || '').localeCompare(String(metaB.client || ''), 'fr', { sensitivity: 'base' });
  if(byClient !== 0) return byClient;

  const byRefClient = String(metaA.refClient || '').localeCompare(String(metaB.refClient || ''), 'fr', { sensitivity: 'base' });
  if(byRefClient !== 0) return byRefClient;

  return String(metaA.debiteur || '').localeCompare(String(metaB.debiteur || ''), 'fr', { sensitivity: 'base' });
}

function buildAudienceSortMeta(row){
  if(row?.__sortMeta && typeof row.__sortMeta === 'object'){
    if(!Object.prototype.hasOwnProperty.call(row.__sortMeta, 'colorPriority')){
      row.__sortMeta.colorPriority = getAudienceSortColorPriority(row);
    }
    return row.__sortMeta;
  }
  const ref = getAudienceRowReferenceValue(row);
  const parts = parseAudienceReferenceParts(ref);
  const out = {
    ref,
    parts,
    client: String(row?.c?.name || ''),
    refClient: String(row?.d?.referenceClient || ''),
    debiteur: String(row?.d?.debiteur || ''),
    colorPriority: getAudienceSortColorPriority(row)
  };
  if(row && typeof row === 'object') row.__sortMeta = out;
  return out;
}

function getAudienceSortColorPriority(row){
  const color = String(row?.__effectiveColor || getAudienceRowEffectiveColor(row) || '').trim();
  if(!color) return 0;
  if(color === 'blue') return 1;
  if(color === 'green') return 2;
  if(color === 'yellow') return 3;
  if(color === 'document-ok') return 4;
  if(color === 'purple-dark' || color === 'purple-light') return 5;
  return 6;
}

function getAudienceDisplayOrderBucket(row, duplicateKeySet, mismatchRefClientSet){
  const errorBucket = getAudiencePriorityBucket(row, duplicateKeySet, mismatchRefClientSet);
  if(errorBucket === 0) return 9;
  if(errorBucket === 1) return 10;
  if(errorBucket === 2) return 11;
  return 3 + getAudienceSortColorPriority(row);
}

function orderAudienceRowsByCheckedSelection(rows){
  if(!filterAudienceCheckedFirst || !Array.isArray(rows) || rows.length < 2){
    return Array.isArray(rows) ? rows : [];
  }
  if(
    rows === audienceCheckedOrderedRowsCacheInput
    && audienceCheckedOrderedRowsCacheVersion === audiencePrintSelectionVersion
  ){
    return audienceCheckedOrderedRowsCacheOutput;
  }
  const checkedRows = [];
  const otherRows = [];
  rows.forEach((row)=>{
    if(isAudienceSelectedForPrint(row.ci, row.di, row.procKey)){
      checkedRows.push(row);
    }else{
      otherRows.push(row);
    }
  });
  const out = checkedRows.concat(otherRows);
  audienceCheckedOrderedRowsCacheInput = rows;
  audienceCheckedOrderedRowsCacheVersion = audiencePrintSelectionVersion;
  audienceCheckedOrderedRowsCacheOutput = out;
  return out;
}

function compareAudienceSortMeta(aMeta, bMeta){
  const colorPriorityA = Number(aMeta?.colorPriority || 0);
  const colorPriorityB = Number(bMeta?.colorPriority || 0);
  if(colorPriorityA !== colorPriorityB){
    return colorPriorityA - colorPriorityB;
  }
  const pa = aMeta?.parts;
  const pb = bMeta?.parts;
  if(pa && pb){
    // Board view sorting: Always ASC (Oldest first) as per user request for consistency
    if(pa.year !== pb.year) return pa.year - pb.year;
    if(pa.middle !== pb.middle) return pa.middle - pb.middle;
    if(pa.first !== pb.first) return pa.first - pb.first;
  }else if(pa){
    return -1;
  }else if(pb){
    return 1;
  }
  const byRef = String(aMeta?.ref || '').localeCompare(String(bMeta?.ref || ''), 'fr', { numeric: true, sensitivity: 'base' });
  if(byRef !== 0) return byRef;
  const byClient = String(aMeta?.client || '').localeCompare(String(bMeta?.client || ''), 'fr', { sensitivity: 'base' });
  if(byClient !== 0) return byClient;
  const byRefClient = String(aMeta?.refClient || '').localeCompare(String(bMeta?.refClient || ''), 'fr', { sensitivity: 'base' });
  if(byRefClient !== 0) return byRefClient;
  return String(aMeta?.debiteur || '').localeCompare(String(bMeta?.debiteur || ''), 'fr', { sensitivity: 'base' });
}

function orderAudienceRowsByWhiteFirst(rows){
  const list = Array.isArray(rows) ? rows : [];
  if(list.length < 2) return list;
  const whiteRows = [];
  const coloredRows = [];
  list.forEach((row)=>{
    if(getAudienceSortColorPriority(row) === 0){
      whiteRows.push(row);
    }else{
      coloredRows.push(row);
    }
  });
  if(!whiteRows.length || !coloredRows.length) return list;
  return whiteRows.concat(coloredRows);
}

function buildAudienceDuplicateKey(row){
  if(typeof row?.__dupKey === 'string') return row.__dupKey;
  if(row?.p?._missingGlobal || row?.p?._audienceImportErrorMessage) return '';
  const refDossier = normalizeReferenceForAudienceLookup(getAudienceRowDraftReferenceValue(row));
  const procedure = String(row?.procKey || '').trim().toLowerCase();
  const debiteur = String(row?.d?.debiteur || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if(isLetterOnlyClientReference(refDossier)) return '';
  if(!refDossier || !debiteur || !procedure) return '';
  // Audience rows are unique per procedure for the same dossier/debiteur.
  return `${procedure}__${debiteur}__${refDossier}`;
}

function getAudienceDuplicateKeySet(rows){
  if(rows === audienceDuplicateKeySetCacheInput){
    return audienceDuplicateKeySetCacheOutput;
  }
  const counts = new Map();
  (rows || []).forEach(row=>{
    const key = buildAudienceDuplicateKey(row);
    if(!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const duplicates = new Set();
  counts.forEach((count, key)=>{
    if(count >= 2) duplicates.add(key);
  });
  audienceDuplicateKeySetCacheInput = rows;
  audienceDuplicateKeySetCacheOutput = duplicates;
  return duplicates;
}

function queueSidebarSalleSessionsRender(delayMs = 80){
  sidebarSalleRenderSeq += 1;
  const renderToken = sidebarSalleRenderSeq;
  if(sidebarSalleRenderTimer){
    clearTimeout(sidebarSalleRenderTimer);
    sidebarSalleRenderTimer = null;
  }
  const nextDelayMs = getAdaptiveUiBatchDelay(delayMs, {
    ultraLargeDatasetExtraMs: 380,
    largeDatasetExtraMs: 160,
    busyExtraMs: 260,
    importExtraMs: 340
  });
  sidebarSalleRenderTimer = setTimeout(()=>{
    sidebarSalleRenderTimer = null;
    if(typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'){
      window.requestIdleCallback(()=>{
        if(renderToken !== sidebarSalleRenderSeq) return;
        renderSidebarSalleSessions();
      }, { timeout: 1800 });
      return;
    }
    if(renderToken !== sidebarSalleRenderSeq) return;
    renderSidebarSalleSessions();
  }, nextDelayMs);
}

function getAudienceRowContentScore(row){
  if(Number.isFinite(row?.__contentScore)) return row.__contentScore;
  return computeAudienceRowContentScore(row);
}

function getDiligenceRowReferenceValue(row){
  const ref = normalizeReferenceValue(String(row?.details?.referenceClient ?? '').trim());
  if(isLetterOnlyClientReference(ref)) return '';
  return ref;
}

function buildDiligenceDuplicateKey(row){
  const refDossier = getDiligenceRowReferenceValue(row);
  const procedure = String(row?.procedure || '').trim().toLowerCase();
  const debiteur = String(row?.dossier?.debiteur || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if(!procedure || !refDossier || !debiteur) return '';
  // Keep one row per procedure for the same dossier/debiteur pair.
  return `${procedure}__${debiteur}__${refDossier}`;
}

function getDiligenceRowContentScore(row){
  const details = row?.details || {};
  const scoreFields = [
    details.referenceClient,
    details.depotLe,
    details.dateDepot,
    details.attOrdOrOrdOk,
    details.executionNo,
    row?.dossier?.ville,
    details.attDelegationOuDelegat,
    details.huissier,
    details.sort,
    details.tribunal
  ];
  return scoreFields.reduce((score, value)=>score + (String(value || '').trim() ? 1 : 0), 0);
}

function dedupeDiligenceRowsByReferenceAndDebiteur(rows){
  const map = new Map();
  (rows || []).forEach(row=>{
    const key = buildDiligenceDuplicateKey(row);
    // Keep rows with missing key untouched.
    if(!key){
      map.set(`__row__${map.size}`, row);
      return;
    }
    const existing = map.get(key);
    if(!existing){
      map.set(key, row);
      return;
    }
    const existingScore = getDiligenceRowContentScore(existing);
    const nextScore = getDiligenceRowContentScore(row);
    if(nextScore > existingScore){
      map.set(key, row);
    }
  });
  return [...map.values()];
}

function dedupeAudienceRowsByReferenceAndDebiteur(rows){
  const map = new Map();
  (rows || []).forEach(row=>{
    const key = buildAudienceDuplicateKey(row);
    // Keep rows with missing key untouched.
    if(!key){
      map.set(`__row__${map.size}`, row);
      return;
    }
    const existing = map.get(key);
    if(!existing){
      map.set(key, row);
      return;
    }
    if(compareAudienceRowsForDedupe(existing, row) > 0){
      map.set(key, row);
    }
  });
  return [...map.values()];
}

function isAudienceRowInvalid(row, duplicateKeySet = null){
  const refDossier = getAudienceRowDraftReferenceValue(row);
  const dateAudience = String(row?.draft?.dateAudience ?? row?.p?.audience ?? '').trim();
  const juge = String(row?.draft?.juge ?? row?.p?.juge ?? '').trim();
  const sort = String(row?.draft?.sort ?? row?.p?.sort ?? '').trim();
  const hasAttNum = /att\s*(num|numero|num[eé]ro|n°|nº)/i.test(refDossier);
  const missingGlobal = !!row?.p?._missingGlobal;
  const refClientMismatch = !!row?.p?._refClientMismatch;
  const duplicateKey = buildAudienceDuplicateKey(row);
  const isDuplicate = !!(duplicateKeySet && duplicateKey && duplicateKeySet.has(duplicateKey));
  return isDuplicate || hasAttNum || missingGlobal || refClientMismatch || (!dateAudience && !juge && !sort);
}

function getAudienceErrorRows(){
  const rows = getAudienceRows();
  if(rows === audienceErrorRowsCacheInput){
    return audienceErrorRowsCacheOutput;
  }
  const duplicateKeySet = getAudienceDuplicateKeySet(rows);
  const out = rows.filter(row => isAudienceRowInvalid(row, duplicateKeySet));
  audienceErrorRowsCacheInput = rows;
  audienceErrorRowsCacheOutput = out;
  return out;
}

function getAudienceErrorDossierCount(){
  if(audienceErrorCountCacheVersion === audienceRowsRawDataVersion){
    return audienceErrorCountCacheValue;
  }
  audienceErrorCountCacheValue = getAudienceErrorRows().length;
  audienceErrorCountCacheVersion = audienceRowsRawDataVersion;
  return audienceErrorCountCacheValue;
}

function syncAudienceFilterOptions(rows){
  const procedureSelect = $('filterAudienceProcedure');
  const tribunalInput = $('filterAudienceTribunal');
  const tribunalOptions = $('filterAudienceTribunalOptions');
  if(!procedureSelect || !tribunalInput || !tribunalOptions) return;
  if(rows === audienceFilterOptionsRowsRef){
    procedureSelect.value = filterAudienceProcedure;
    tribunalInput.value = filterAudienceTribunal === 'all' ? '' : getAudienceTribunalFilterLabel(filterAudienceTribunal);
    return;
  }

  let meta = audienceFilterOptionsMetaCache.get(rows);
  if(!meta){
    const procedureSet = new Set();
    rows.forEach(row=>{
      const key = getAudienceProcedureFilterKey(row.procKey);
      if(key) procedureSet.add(key);
    });
    const tribunalState = buildAudienceTribunalClusterState(rows);
    meta = { procedureSet, tribunalState };
    audienceFilterOptionsMetaCache.set(rows, meta);
  }
  const procedureSet = meta.procedureSet;
  const tribunalState = meta.tribunalState;
  audienceTribunalAliasMap = tribunalState.aliasMap;
  audienceTribunalLabelMap = new Map(tribunalState.options.map(({ key, label })=>[key, label]));

  const procedures = [...procedureSet].sort((a, b)=>a.localeCompare(b, 'fr'));
  const tribunaux = tribunalState.options;

  procedureSelect.innerHTML = `<option value="all">Toutes</option>${procedures.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}`;
  tribunalOptions.innerHTML = `<option value="Tous"></option>${tribunaux.map(({ label })=>`<option value="${escapeHtml(label)}"></option>`).join('')}`;

  if(filterAudienceProcedure !== 'all' && !procedureSet.has(filterAudienceProcedure)){
    setAudienceProcedureFilter('all', { syncUi: false });
  }
  if(filterAudienceTribunal !== 'all'){
    filterAudienceTribunal = resolveAudienceTribunalFilterKey(filterAudienceTribunal);
  }
  if(filterAudienceTribunal !== 'all' && !tribunalState.keySet.has(filterAudienceTribunal)){
    filterAudienceTribunal = 'all';
  }

  procedureSelect.value = filterAudienceProcedure;
  tribunalInput.value = filterAudienceTribunal === 'all' ? '' : getAudienceTribunalFilterLabel(filterAudienceTribunal);
  audienceFilterOptionsRowsRef = rows;
}

function hasAudienceProcedureData(procData, draftData, dossier){
  const p = procData || {};
  const d = draftData || {};
  if(isProtectedManualDossier(dossier)) return true;
  if(getAudiencePurpleStatusSnapshot(dossier)) return true;
  const fields = [
    d.dateAudience,
    p.audience,
    d.juge,
    p.juge,
    d.sort,
    p.sort,
    d.instruction,
    p.instruction,
    p.tribunal
  ];
  return fields.some(value=>String(value || '').trim().length > 0);
}

function buildAudienceRowsForClient(client, clientIndex, closedStatusLookup){
  if(!client || !canViewClient(client)) return [];
  const rows = [];
  (Array.isArray(client?.dossiers) ? client.dossiers : []).forEach((dossier, dossierIndex)=>{
    let procKeys = Object.keys(dossier.procedureDetails || {});
    if(!procKeys.length){
      procKeys = normalizeProcedures(dossier);
    }
    if(!procKeys.length) return;
    procKeys.forEach((procKey)=>{
      if(!isAudienceProcedure(procKey)) return;
      const p = getAudienceProcedure(clientIndex, dossierIndex, procKey);
      const key = makeAudienceDraftKey(clientIndex, dossierIndex, procKey);
      const draft = audienceDraft[key] || {};
      if(!hasAudienceProcedureData(p, draft, dossier)) return;
      const draftReferenceValue = String(draft?.refDossier || p?.referenceClient || dossier?.referenceClient || '').trim();
      const refDossier = normalizeReferenceForAudienceLookup(draftReferenceValue);
      const procedureNorm = String(procKey || '').trim().toLowerCase();
      const debiteurNorm = String(dossier?.debiteur || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const duplicateKey = (refDossier && procedureNorm && debiteurNorm)
        ? `${procedureNorm}__${debiteurNorm}__${refDossier}`
        : '';
      const audienceDateDisplay = formatAudienceDateDisplayValue(draft?.dateAudience || p?.audience || '');
      const sortMeta = {
        ref: refDossier,
        parts: parseAudienceReferenceParts(refDossier),
        client: String(client?.name || ''),
        refClient: String(dossier?.referenceClient || ''),
        debiteur: String(dossier?.debiteur || '')
      };
      const row = {
        c: client,
        d: dossier,
        procKey,
        p,
        key,
        draft,
        ci: clientIndex,
        di: dossierIndex,
        __dupKey: duplicateKey,
        __procFilterKey: getAudienceProcedureFilterKey(procKey),
        __tribunalFilterKey: resolveAudienceTribunalFilterKey(p?.tribunal || ''),
        __rowReference: refDossier,
        __sortMeta: sortMeta,
        __audienceDateDisplay: audienceDateDisplay
      };
      const resolvedStatus = resolveAudienceRowStatusSnapshot(row, closedStatusLookup);
      row.__resolvedStatus = resolvedStatus.statut;
      row.__resolvedStatusDetail = resolvedStatus.detail;
      row.__effectiveColor = getAudienceRowEffectiveColor(row);
      if(row.__sortMeta && typeof row.__sortMeta === 'object'){
        row.__sortMeta.colorPriority = getAudienceSortColorPriority(row);
      }
      rows.push(row);
    });
  });
  return rows;
}

function getAudienceRowsRawCached(){
  const viewerKey = getAudienceViewerCacheKey();
  if(
    audienceRowsRawCache
    && audienceRowsRawCacheVersion === audienceRowsRawDataVersion
    && audienceRowsRawCacheViewerKey === viewerKey
  ){
    return audienceRowsRawCache;
  }
  const closedStatusLookup = getAudienceClosedStatusLookupCached();
  const rows = AppState.clients.flatMap((client, clientIndex)=>{
    return buildAudienceRowsForClient(client, clientIndex, closedStatusLookup);
  });
  audienceRowsRawCache = rows;
  audienceRowsRawCacheVersion = audienceRowsRawDataVersion;
  audienceRowsRawCacheViewerKey = viewerKey;
  return rows;
}

function getAudienceRowsDedupedCached(){
  const viewerKey = getAudienceViewerCacheKey();
  if(
    audienceRowsDedupeCache
    && audienceRowsDedupeCacheVersion === audienceRowsRawDataVersion
    && audienceRowsDedupeCacheViewerKey === viewerKey
  ){
    return audienceRowsDedupeCache;
  }
  const rows = getAudienceRowsRawCached();
  audienceRowsDedupeCache = rows;
  audienceRowsDedupeCacheVersion = audienceRowsRawDataVersion;
  audienceRowsDedupeCacheViewerKey = viewerKey;
  return rows;
}

function getAudienceRows(options = {}){
  const opts = options && typeof options === 'object' ? options : {};
  const ignoreSearch = !!opts.ignoreSearch;
  const ignoreColor = !!opts.ignoreColor;
  const q = ignoreSearch ? '' : normalizeCaseInsensitiveSearchText($('filterAudience')?.value || '');
  const baseRows = getAudienceRowsDedupedCached();
  const noColorFilter = ignoreColor || filterAudienceColor === 'all';
  const noSearchFilter = ignoreSearch || !q;
  const viewKey = [
    ignoreSearch ? '1' : '0',
    ignoreColor ? '1' : '0',
    ignoreSearch ? '' : q,
    ignoreColor ? '' : filterAudienceColor
  ].join('||');
  if(baseRows === audienceRowsViewCacheSource && viewKey === audienceRowsViewCacheKey){
    return audienceRowsViewCacheOutput;
  }
  if(noColorFilter && noSearchFilter){
    audienceRowsViewCacheSource = baseRows;
    audienceRowsViewCacheKey = viewKey;
    audienceRowsViewCacheOutput = baseRows;
    return baseRows;
  }
  const exactMatchedRows = (!ignoreSearch && q)
    ? getAudienceRowsByExactQuery(baseRows, q)
    : null;
  if(exactMatchedRows){
    const out = exactMatchedRows.filter(row=>{
      if(!ignoreColor && filterAudienceColor !== 'all' && !audienceRowMatchesColorFilter(row, filterAudienceColor)) return false;
      return true;
    });
    audienceRowsViewCacheSource = baseRows;
    audienceRowsViewCacheKey = viewKey;
    audienceRowsViewCacheOutput = out;
    return out;
  }
  const out = baseRows.filter(row=>{
    if(!ignoreColor && filterAudienceColor !== 'all' && !audienceRowMatchesColorFilter(row, filterAudienceColor)) return false;
    if(!ignoreSearch && q){
      const haystack = row.__haystack || (row.__haystack = buildAudienceSearchHaystack(row.c?.name, row.d, row.procKey, row.p, row.draft, row));
      if(!haystack.includes(q)) return false;
    }
    return true;
  });
  audienceRowsViewCacheSource = baseRows;
  audienceRowsViewCacheKey = viewKey;
  audienceRowsViewCacheOutput = out;
  return out;
}

function hideAudienceAutocompleteSuggestions(){
  const container = $('filterAudienceSuggestions');
  audienceAutocompleteItems = [];
  audienceAutocompleteActiveIndex = -1;
  if(!container) return;
  container.innerHTML = '';
  container.setAttribute('hidden', 'hidden');
}

function setAudienceAutocompleteActiveIndex(index){
  if(!audienceAutocompleteItems.length){
    audienceAutocompleteActiveIndex = -1;
    return;
  }
  const maxIndex = audienceAutocompleteItems.length - 1;
  let nextIndex = Number(index);
  if(!Number.isFinite(nextIndex)) nextIndex = 0;
  if(nextIndex < 0) nextIndex = maxIndex;
  if(nextIndex > maxIndex) nextIndex = 0;
  audienceAutocompleteActiveIndex = nextIndex;
  const container = $('filterAudienceSuggestions');
  if(!container) return;
  container.querySelectorAll('.audience-search-suggestion').forEach((node, idx)=>{
    node.classList.toggle('active', idx === nextIndex);
    node.setAttribute('aria-selected', idx === nextIndex ? 'true' : 'false');
    if(idx === nextIndex){
      node.scrollIntoView({ block: 'nearest' });
    }
  });
}

function getAudienceAutocompleteSuggestions(query){
  const rawQuery = String(query || '').trim();
  const normalizedQuery = normalizeCaseInsensitiveSearchText(rawQuery);
  if(!normalizedQuery) return [];
  const baseRows = getAudienceRowsDedupedCached();
  const colorFilteredRows = filterAudienceColor === 'all'
    ? baseRows
    : baseRows.filter(row=>audienceRowMatchesColorFilter(row, filterAudienceColor));
  const scopedRows = getFilteredAudienceRows(colorFilteredRows);
  const suggestions = [];
  for(const row of scopedRows){
    const dateValue = getAudienceRowDateValue(row);
    const clientName = String(row?.c?.name || '').trim();
    const refClient = String(
      row?.p?._refClientMismatch
        ? (row?.p?._refClientProvided || '')
        : (row?.d?.referenceClient || '')
    ).trim();
    const refDossier = getAudienceRowDraftReferenceValue(row);
    const debiteur = String(row?.d?.debiteur || '').trim();
    const dateKey = normalizeCaseInsensitiveSearchText(dateValue);
    const clientKey = normalizeCaseInsensitiveSearchText(clientName);
    const refClientKey = normalizeCaseInsensitiveSearchText(refClient);
    const refDossierKey = normalizeCaseInsensitiveSearchText(refDossier);
    const debiteurKey = normalizeCaseInsensitiveSearchText(debiteur);
    const dateMatch = !!dateKey && dateKey.includes(normalizedQuery);
    const clientMatch = !!clientKey && clientKey.includes(normalizedQuery);
    const refClientMatch = !!refClientKey && refClientKey.includes(normalizedQuery);
    const refDossierMatch = !!refDossierKey && refDossierKey.includes(normalizedQuery);
    const debiteurMatch = !!debiteurKey && debiteurKey.includes(normalizedQuery);
    if(!dateMatch && !clientMatch && !refClientMatch && !refDossierMatch && !debiteurMatch){
      continue;
    }
    let score = computeAudienceRowContentScore(row);
    if(dateMatch) score += 110;
    if(refDossierMatch) score += 90;
    if(refClientMatch) score += 75;
    if(clientMatch) score += 60;
    if(debiteurMatch) score += 35;
    if(dateKey.startsWith(normalizedQuery)) score += 18;
    if(refDossierKey.startsWith(normalizedQuery)) score += 14;
    if(refClientKey.startsWith(normalizedQuery)) score += 10;
    if(clientKey.startsWith(normalizedQuery)) score += 8;
    suggestions.push({
      row,
      score,
      applyValue: dateMatch
        ? dateValue
        : (refDossierMatch
          ? refDossier
          : (refClientMatch
            ? refClient
            : (clientName || debiteur || dateValue))),
      dateValue,
      clientName,
      refClient,
      refDossier,
      debiteur
    });
  }
  suggestions.sort((a, b)=>{
    if(b.score !== a.score) return b.score - a.score;
    return compareAudienceSortMeta(
      a.row?.__sortMeta || buildAudienceSortMeta(a.row),
      b.row?.__sortMeta || buildAudienceSortMeta(b.row)
    );
  });
  return suggestions.slice(0, AUDIENCE_AUTOCOMPLETE_MAX_ITEMS);
}

function renderAudienceAutocompleteSuggestions(){
  const input = $('filterAudience');
  const container = $('filterAudienceSuggestions');
  if(!input || !container) return;
  if(audienceAutocompleteHideTimer){
    clearTimeout(audienceAutocompleteHideTimer);
    audienceAutocompleteHideTimer = null;
  }
  const query = String(input.value || '').trim();
  if(!query){
    hideAudienceAutocompleteSuggestions();
    return;
  }
  const suggestions = getAudienceAutocompleteSuggestions(query);
  audienceAutocompleteItems = suggestions;
  audienceAutocompleteActiveIndex = -1;
  if(!suggestions.length){
    hideAudienceAutocompleteSuggestions();
    return;
  }
  container.innerHTML = suggestions.map((item, index)=>`
    <button
      type="button"
      class="audience-search-suggestion"
      data-index="${index}"
      role="option"
      aria-selected="false"
    >
      <span class="audience-search-suggestion-title">
        <i class="fa-regular fa-calendar-days"></i>
        <span>${highlightSearchMatchHtml(item.dateValue || '-', query)}</span>
      </span>
      <span class="audience-search-suggestion-meta">
        <span>Client: ${highlightSearchMatchHtml(item.clientName || '-', query)}</span>
        <span>Réf client: ${highlightSearchMatchHtml(item.refClient || '-', query)}</span>
        <span>Réf dossier: ${highlightSearchMatchHtml(item.refDossier || '-', query)}</span>
      </span>
    </button>
  `).join('');
  container.removeAttribute('hidden');
}

function applyAudienceAutocompleteSuggestion(index){
  const item = audienceAutocompleteItems[index];
  const input = $('filterAudience');
  if(!item || !input) return;
  input.value = String(item.applyValue || item.dateValue || item.refDossier || item.refClient || item.clientName || '').trim();
  hideAudienceAutocompleteSuggestions();
  renderAudience();
  input.focus();
  if(typeof input.setSelectionRange === 'function'){
    const length = input.value.length;
    input.setSelectionRange(length, length);
  }
}

function getAudienceRowsForSidebar(){
  return getAudienceRowsDedupedCached();
}

function getAudienceRowsForSidebarProjectedCached(){
  const userKey = getCurrentClientAccessCacheKey();
  if(
    audienceSidebarProjectionCache
    && audienceSidebarProjectionCacheVersion === audienceRowsRawDataVersion
    && audienceSidebarProjectionCacheUserKey === userKey
  ){
    return audienceSidebarProjectionCache;
  }
  const closedStatusLookup = getAudienceClosedStatusLookupCached();
  const projectedRows = getAudienceRowsDedupedCached().map((row)=>{
    const audienceDateRaw = row?.draft?.dateAudience || row?.p?.audience || '';
    const parsedAudienceDate = parseDateForAge(audienceDateRaw);
    const calendarDateKey = parsedAudienceDate ? formatDateYYYYMMDD(parsedAudienceDate) : '';
    const sortTime = parsedAudienceDate instanceof Date && !Number.isNaN(parsedAudienceDate.getTime())
      ? parsedAudienceDate.getTime()
      : 0;
    const tribunalValue = String(row?.p?.tribunal || '').trim();
    const judgeValue = normalizeJudgeName(row?.draft?.juge || row?.p?.juge || '');
    const judgeKeys = judgeValue
      ? [...new Set(splitJudgeCandidates(judgeValue).map(v=>makeJudgeMatchKey(v)).filter(Boolean))]
      : [];
    const sortValue = String(row?.draft?.sort || row?.p?.sort || '').trim();
    const instructionValue = String(
      row?.draft?.instruction
      || row?.p?.instruction
      || sortValue
    ).trim();
    const statutValue = getAudienceExportStatusValue(row, closedStatusLookup);
    const ordonnanceValue = getAudienceExportOrdonnanceValue(row);
    return {
      judgeKeys,
      calendarDateKey,
      calendarEvent: {
        client: String(row?.c?.name || '').trim() || '-',
        procedure: String(row?.draft?.procedure || row?.p?.nature || row?.d?.natureProcedure || '').trim() || '-',
        debiteur: String(row?.d?.debiteur || '').trim() || '-',
        ref: String(row?.draft?.refDossier || row?.p?.referenceClient || row?.d?.referenceClient || '').trim() || '-',
        juge: judgeValue || '-',
        tribunal: tribunalValue || '-',
        sort: sortValue || '-',
        statut: statutValue || 'En cours'
      },
      session: judgeKeys.length ? {
        date: normalizeDateDDMMYYYY(audienceDateRaw) || String(audienceDateRaw || '').trim() || '-',
        dateKey: calendarDateKey,
        sortTime,
        ref: String(row?.draft?.refDossier || row?.p?.referenceClient || row?.d?.referenceClient || '').trim() || '-',
        debiteur: String(row?.d?.debiteur || '').trim() || '-',
        tribunal: tribunalValue || '-',
        tribunalCategory: getSalleTribunalCategory(tribunalValue),
        client: String(row?.c?.name || '').trim() || '-',
        dateDepot: getAudienceDateDepotDisplayValue(row),
        instruction: instructionValue || '-',
        statut: statutValue || 'En cours',
        ordonnance: ordonnanceValue || '',
        sort: sortValue || '-'
      } : null
    };
  });
  audienceSidebarProjectionCache = projectedRows;
  audienceSidebarProjectionCacheVersion = audienceRowsRawDataVersion;
  audienceSidebarProjectionCacheUserKey = userKey;
  return projectedRows;
}

function getAudienceRowsForRegularExport(){
  const rows = getAudienceRows();
  const selectedRows = rows.filter(row => isAudienceSelectedForPrint(row.ci, row.di, row.procKey));
  
  if(
    selectedRows.length >= AUDIENCE_DEFAULT_SORT_MAX_ROWS
    || isVeryLargeLiveSyncMode()
    || shouldPreferAudienceRegularExportCsvPath(selectedRows.length)
  ){
    return selectedRows;
  }
  return selectedRows.slice().sort(compareAudienceRowsForExport);
}

async function exportAudienceRegularXLS(options = {}){
  if(!canExportData()) return alert('Accès refusé');
  return runWithHeavyUiOperation(async ()=>{
    const exportRows = getAudienceRowsForRegularExport();
    if(!exportRows.length){
      alert("Aucune ligne d'audience à exporter.");
      return;
    }
    if(shouldPreferAudienceRegularExportCsvPath(exportRows.length)){
      const dataset = buildAudienceSelectedExportDatasetBase(exportRows, { omitSort: true });
      const csvBlob = await createMappedCsvBlobChunked({
        headers: dataset.headers,
        items: dataset.rows,
        mapRow: (row)=>buildAudienceSelectedExportTableRow(row, {
          omitSort: true,
          closedStatusLookup: dataset.closedStatusLookup
        }),
        progressLabel: 'Export audience CSV',
        chunkSize: isVeryLargeLiveSyncMode() ? 20 : 60
      });
      await saveBlobDirectOrDownload(csvBlob, 'audience_export.csv');
      return;
    }
    const dataset = await buildAudienceSelectedExportDatasetAsync(exportRows, { omitSort: true });
    await exportAudienceWorkbookXlsxStyled({
      headers: dataset.headers,
      rows: dataset.tableRows,
      subtitle: dataset.subtitle,
      sheetName: 'Audience',
      filename: "Export d'audience Excel.xlsx",
      layoutPreset: 'audience-reference',
      openAfterExport: options?.openAfterExport === true,
      browserOpenInline: options?.browserOpenInline === true
    });
  });
}

async function exportAudienceXLS(options = {}){
  if(!canExportData()) return alert('Accès refusé');
  return runWithHeavyUiOperation(async ()=>{
    let dataset = await buildAudienceSelectedExportDatasetAsync(null, options);
    if(!dataset.rows.length){
      alert("Cochez les dossiers à exporter dans \"Export d'audience\".");
      return;
    }
    await exportAudienceWorkbookXlsxStyled({
      headers: dataset.headers,
      rows: dataset.tableRows,
      subtitle: dataset.subtitle,
      sheetName: 'Audience',
      colWidths: dataset.colWidths,
      filename: "Export d'audience Excel.xlsx",
      layoutPreset: 'audience-reference',
      openAfterExport: options?.openAfterExport === true,
      browserDownloadTarget: options?.browserDownloadTarget || null,
      browserOpenInline: options?.browserOpenInline === true,
      preferredFileHandle: options?.preferredFileHandle || null
    });
  });
}

function escapeHtml(str){
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setAudienceColor(ci, di, procKey, checked){
  const client = AppState.clients?.[ci];
  if(!canEditData() || !canEditClient(client)) return;
  const dossier = AppState.clients?.[ci]?.dossiers?.[di];
  if(!dossier) return;
  const p = getAudienceProcedure(ci, di, procKey);
  const undoEntry = buildAudienceColorUndoEntry(ci, di, procKey);
  const allowed = new Set(['white', 'blue', 'green', 'red', 'yellow', 'document-ok', 'purple-dark', 'purple-light', 'closed']);
  if(!checked){
    detachAudienceImportBatchOwnership(p);
    applyAudienceWhiteColorState(p, dossier, '');
    rememberAudienceColorUndoState([undoEntry], {
      filterAudienceColor,
      selectedAudienceColor,
      filterAudienceCheckedFirst
    });
    markAudienceColorCachesDirty();
    queueAudienceColorBatchUpdate({ persist: true, persistClientId: client.id, persistDossier: dossier, dashboard: true, suivi: false });
    return;
  }
  if(selectedAudienceColor === 'all' || !allowed.has(selectedAudienceColor)){
    queueAudienceColorBatchUpdate({ persist: false, dashboard: true, suivi: false });
    return;
  }
  const appliedColor = selectedAudienceColor === 'closed' ? 'purple-dark' : selectedAudienceColor;
  detachAudienceImportBatchOwnership(p);
  if(appliedColor === 'white'){
    applyAudienceWhiteColorState(p, dossier, getAudienceRowEffectiveColor({
      c: client,
      d: dossier,
      procKey,
      p,
      draft: {},
      ci,
      di
    }));
    rememberAudienceColorUndoState([undoEntry], {
      filterAudienceColor,
      selectedAudienceColor,
      filterAudienceCheckedFirst
    });
    markAudienceColorCachesDirty();
    queueAudienceColorBatchUpdate({ persist: true, persistClientId: client.id, persistDossier: dossier, dashboard: true, suivi: true });
    return;
  }
  delete p._disableAudienceRowColor;
  delete p._suppressAudienceOrdonnanceColor;
  if(appliedColor === 'green' || appliedColor === 'yellow'){
    if(!applyAudienceOrdonnanceColorState(p, appliedColor)){
      return;
    }
    rememberAudienceColorUndoState([undoEntry], {
      filterAudienceColor,
      selectedAudienceColor,
      filterAudienceCheckedFirst
    });
    markAudienceColorCachesDirty();
    queueAudienceColorBatchUpdate({ persist: true, persistClientId: client.id, persistDossier: dossier, dashboard: true, suivi: true });
    return;
  }
  p.color = appliedColor;
  if(appliedColor === 'purple-dark') dossier.statut = 'Soldé';
  if(appliedColor === 'purple-light') dossier.statut = 'Arrêt définitif';
  rememberAudienceColorUndoState([undoEntry], {
    filterAudienceColor,
    selectedAudienceColor,
    filterAudienceCheckedFirst
  });
  markAudienceColorCachesDirty();
  queueAudienceColorBatchUpdate({ persist: true, persistClientId: client.id, persistDossier: dossier, dashboard: true, suivi: true });
}

function setAudienceColorEncoded(ci, di, procKeyEncoded, checked){
  setAudienceColor(ci, di, decodeURIComponent(String(procKeyEncoded)), checked);
}

function getAudienceProcedure(ci, di, procKey){
  const dossier = AppState.clients?.[ci]?.dossiers?.[di];
  if(!dossier) return {};
  if(!dossier.procedureDetails) dossier.procedureDetails = {};
  if(!dossier.procedureDetails[procKey]) dossier.procedureDetails[procKey] = {};
  return dossier.procedureDetails[procKey];
}

function detachAudienceImportBatchOwnership(procData){
  if(!procData || typeof procData !== 'object') return false;
  if(!String(procData._audienceImportBatchId || '').trim()) return false;
  delete procData._audienceImportBatchId;
  return true;
}

function hasManualAudienceChangesAfterImport(dossier, procKey, importCreatedAt){
  const targetProcKey = String(procKey || '').trim();
  if(!dossier || !targetProcKey) return false;
  const importTime = Date.parse(String(importCreatedAt || '').trim() || '');
  if(!Number.isFinite(importTime)) return false;
  const historyEntries = Array.isArray(dossier.history) ? dossier.history : [];
  return historyEntries.some((entry)=>{
    if(String(entry?.procedure || '').trim() !== targetProcKey) return false;
    const source = String(entry?.source || '').trim();
    if(source !== 'audience' && source !== 'form') return false;
    const entryTime = Date.parse(String(entry?.at || '').trim() || '');
    if(!Number.isFinite(entryTime) || entryTime < importTime) return false;
    const field = String(entry?.field || '').trim();
    return field.startsWith('procedureDetails.');
  });
}

function queueAudienceColorBatchUpdate(options = {}){
  const opts = options && typeof options === 'object' ? options : {};
  if(opts.persist) audienceColorBatchNeedsPersist = true;
  if(opts.dashboard) audienceColorBatchNeedsDashboard = true;
  if(opts.suivi) audienceColorBatchNeedsSuivi = true;
  if(opts.persistDossier) queueAudienceColorBatchUpdate.lastDossier = opts.persistDossier;
  if(opts.persistClientId !== undefined) queueAudienceColorBatchUpdate.lastClientId = Number(opts.persistClientId);
  if(audienceColorBatchTimer) return;
  audienceColorBatchTimer = setTimeout(()=>{
    audienceColorBatchTimer = null;
    const doPersist = audienceColorBatchNeedsPersist;
    const doDashboard = audienceColorBatchNeedsDashboard;
    const doSuivi = audienceColorBatchNeedsSuivi;
    const patchDossier = queueAudienceColorBatchUpdate.lastDossier;
    const patchClientId = queueAudienceColorBatchUpdate.lastClientId;
    audienceColorBatchNeedsPersist = false;
    audienceColorBatchNeedsDashboard = false;
    audienceColorBatchNeedsSuivi = false;
    queueAudienceColorBatchUpdate.lastDossier = null;
    queueAudienceColorBatchUpdate.lastClientId = undefined;
    if(doPersist){
      if(patchDossier && Number.isFinite(patchClientId)){
        persistDossierReferenceNow(patchClientId, patchDossier, { source: 'audience-color' }).catch(()=>{});
      }else{
        queuePersistAppState();
      }
    }
    const linkedSections = ['audience'];
    if(doDashboard) linkedSections.push('dashboard');
    if(doSuivi) linkedSections.push('suivi');
    queueLinkedSectionRender(linkedSections, {
      keepAudiencePosition: true,
      delayMs: 0
    });
  }, getAdaptiveUiBatchDelay(AUDIENCE_COLOR_BATCH_MS, {
    largeDatasetExtraMs: 100,
    busyExtraMs: 180,
    importExtraMs: 260
  }));
}

function queueAudienceLinkedRenders(){
  queueLinkedSectionRender(['dashboard', 'suivi', 'diligence', 'salleSidebar']);
}

function queueDossierLinkedRenders(){
  queueLinkedSectionRender(['dashboard', 'audience', 'suivi', 'diligence', 'salleSidebar'], {
    keepAudiencePosition: true
  });
}

function applyAudienceFieldToProcedure(p, field, value){
  if(!p || !field) return;
  if(field === 'refDossier'){
    p.referenceClient = value;
    return;
  }
  if(field === 'dateAudience'){
    const normalizedAudience = normalizeDateDDMMYYYY(value);
    p.audience = normalizedAudience || value;
    return;
  }
  if(field === 'juge'){
    p.juge = value;
    return;
  }
  if(field === 'sort'){
    p.sort = value;
  }
}

function updateAudienceDraft(key, field, value){
  if(!canEditData()) return;
  markAudienceRowsCacheDirty();
  if(!audienceDraft[key]) audienceDraft[key] = {};
  audienceDraft[key][field] = value;
  const { ci, di, procKey } = parseAudienceDraftKey(key);
  const dossier = AppState.clients?.[ci]?.dossiers?.[di];
  const p = getAudienceProcedure(ci, di, procKey);
  const before = field === 'refClient'
    ? String(dossier?.referenceClient || '')
    : getAudienceProcedureFieldValue(p, field);
  if(field === 'refClient'){
    const nextRefClient = String(value || '').trim();
    if(dossier){
      dossier.referenceClient = nextRefClient;
      const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
        ? dossier.procedureDetails
        : {};
      Object.values(details).forEach((procDetails)=>{
        if(!procDetails || typeof procDetails !== 'object' || !procDetails._refClientMismatch) return;
        procDetails._refClientProvided = nextRefClient;
      });
    }
    refreshAudienceRefClientMismatchFlags(dossier);
  }else{
    applyAudienceFieldToProcedure(p, field, value);
  }
  const after = field === 'refClient'
    ? String(dossier?.referenceClient || '')
    : getAudienceProcedureFieldValue(p, field);
  const hasMeaningfulChange = field === 'refClient'
    ? !areEquivalentClientReferences(before, after)
    : before !== after;
  if(hasMeaningfulChange){
    detachAudienceImportBatchOwnership(p);
  }
  const fieldMap = {
    refClient: 'referenceClient',
    refDossier: 'procedureDetails.referenceClient',
    dateAudience: 'procedureDetails.audience',
    juge: 'procedureDetails.juge',
    sort: 'procedureDetails.sort'
  };
  if(fieldMap[field] && hasMeaningfulChange){
    queueDossierHistoryEntry(dossier, {
      source: 'audience',
      field: fieldMap[field],
      procedure: procKey,
      before,
      after
    });
  }
  // Avoid full-state persist and linked heavy renders on every keystroke.
  // We keep in-memory update immediate and persist through debounced autosave.
  queueAudienceAutoSave();
}

function updateAudienceDraftFromEncoded(keyEncoded, field, value){
  updateAudienceDraft(decodeURIComponent(String(keyEncoded)), field, value);
}

function normalizeAudienceDateDraftInputFromEncoded(keyEncoded, inputEl){
  if(!inputEl) return false;
  const key = decodeURIComponent(String(keyEncoded));
  const raw = String(inputEl.value || '').trim();
  if(!raw){
    updateAudienceDraft(key, 'dateAudience', '');
    inputEl.value = '';
    return true;
  }
  const normalized = normalizeDateDDMMYYYY(raw);
  if(!normalized){
    alert('Date d’audience invalide. Utilisez le format jj/mm/aaaa.');
    inputEl.focus();
    return false;
  }
  inputEl.value = normalized;
  updateAudienceDraft(key, 'dateAudience', normalized);
  return true;
}

function saveAudienceDraftEntry(key, options = {}){
  if(!canEditData()) return false;
  const safeKey = String(key || '');
  if(!safeKey) return false;
  const rerender = options.rerender !== false;
  const clearDraft = options.clearDraft !== false;
  const data = audienceDraft[safeKey];
  const { ci, di, procKey } = parseAudienceDraftKey(safeKey);
  const client = AppState.clients?.[ci];
  const dossier = AppState.clients?.[ci]?.dossiers?.[di];
  const p = getAudienceProcedure(ci, di, procKey);
  if(!client || !dossier){
    if(clearDraft && Object.prototype.hasOwnProperty.call(audienceDraft, safeKey)){
      delete audienceDraft[safeKey];
    }
    persistStateSliceNow('audienceDraft', audienceDraft, { source: 'audience-draft' }).catch(()=>{});
    return false;
  }

  if(data && typeof data === 'object'){
    if(data.refDossier !== undefined){
      const before = getAudienceProcedureFieldValue(p, 'refDossier');
      applyAudienceFieldToProcedure(p, 'refDossier', data.refDossier);
      const after = getAudienceProcedureFieldValue(p, 'refDossier');
      queueDossierHistoryEntry(dossier, {
        source: 'audience',
        field: 'procedureDetails.referenceClient',
        procedure: procKey,
        before,
        after
      });
    }
    if(data.dateAudience !== undefined){
      const before = getAudienceProcedureFieldValue(p, 'dateAudience');
      applyAudienceFieldToProcedure(p, 'dateAudience', data.dateAudience);
      const after = getAudienceProcedureFieldValue(p, 'dateAudience');
      queueDossierHistoryEntry(dossier, {
        source: 'audience',
        field: 'procedureDetails.audience',
        procedure: procKey,
        before,
        after
      });
    }
    if(data.juge !== undefined){
      const before = getAudienceProcedureFieldValue(p, 'juge');
      applyAudienceFieldToProcedure(p, 'juge', data.juge);
      const after = getAudienceProcedureFieldValue(p, 'juge');
      queueDossierHistoryEntry(dossier, {
        source: 'audience',
        field: 'procedureDetails.juge',
        procedure: procKey,
        before,
        after
      });
    }
    if(data.sort !== undefined){
      const before = getAudienceProcedureFieldValue(p, 'sort');
      applyAudienceFieldToProcedure(p, 'sort', data.sort);
      const after = getAudienceProcedureFieldValue(p, 'sort');
      queueDossierHistoryEntry(dossier, {
        source: 'audience',
        field: 'procedureDetails.sort',
        procedure: procKey,
        before,
        after
      });
    }
  }

  const shouldReconcileAudienceRefs = !!(
    dossier?.isAudienceOrphanImport
    && data
    && typeof data === 'object'
    && (data.refClient !== undefined || data.refDossier !== undefined)
  );
  const reconciliation = shouldReconcileAudienceRefs
    ? reconcileAudienceOrphanDossiers()
    : { matchedDossiers: 0, mergedProcedures: 0 };
  if(reconciliation.matchedDossiers > 0){
    handleDossierDataChange({ audience: true });
  }

  if(clearDraft && Object.prototype.hasOwnProperty.call(audienceDraft, safeKey)){
    delete audienceDraft[safeKey];
  }
  if(audienceAutoSaveTimer){
    clearTimeout(audienceAutoSaveTimer);
    audienceAutoSaveTimer = null;
  }
  if(reconciliation.matchedDossiers > 0){
    queuePersistAppState();
  }else{
    persistDossierReferenceNow(client.id, dossier, { source: 'audience-inline-save' }).catch(()=>{});
  }
  persistStateSliceNow('audienceDraft', audienceDraft, { source: 'audience-draft' }).catch(()=>{});
  if(rerender){
    if(isDeferredRenderSectionVisible('audience')){
      renderAudienceKeepingPosition();
    }else{
      markDeferredRenderDirty('audience');
    }
    queueAudienceLinkedRenders();
  }
  return true;
}

function confirmAudienceInlineEditFromEncoded(keyEncoded, field, inputEl, event){
  if(!event || event.key !== 'Enter') return;
  event.preventDefault();
  if(!inputEl) return;
  const key = decodeURIComponent(String(keyEncoded));
  const targetField = String(field || '').trim();
  if(targetField === 'dateAudience'){
    if(!normalizeAudienceDateDraftInputFromEncoded(keyEncoded, inputEl)) return;
  }else{
    updateAudienceDraft(key, targetField, inputEl.value);
  }
  saveAudienceDraftEntry(key, { clearDraft: true, rerender: true });
  if(typeof inputEl.blur === 'function'){
    inputEl.blur();
  }
}

function saveAllAudience(options = {}){
  if(!canEditData()){
    alert('Accès refusé');
    return false;
  }
  const clearDraft = options.clearDraft !== false;
  const rerender = options.rerender !== false;
  const feedback = options.feedback === true;
  const draftEntries = Object.entries(audienceDraft);
  if(!draftEntries.length){
    if(feedback) showAudienceSaveFeedback('Aucune modification a enregistrer.', 'muted');
    return false;
  }
  const changedDossiers = new Map();
  let shouldReconcileAudienceRefs = false;
  draftEntries.forEach(([key, data])=>{
    const { ci, di, procKey } = parseAudienceDraftKey(key);
    const client = AppState.clients?.[ci];
    const dossier = AppState.clients?.[ci]?.dossiers?.[di];
    const p = getAudienceProcedure(ci, di, procKey);
    if(client && dossier){
      const changeKey = `${Number(client.id) || 0}::${String(dossier.referenceClient || di || '').trim()}`;
      changedDossiers.set(changeKey, {
        clientId: client.id,
        dossier
      });
      if(
        dossier?.isAudienceOrphanImport
        && data
        && typeof data === 'object'
        && (data.refClient !== undefined || data.refDossier !== undefined)
      ){
        shouldReconcileAudienceRefs = true;
      }
    }
    if(data.refDossier!==undefined){
      const before = getAudienceProcedureFieldValue(p, 'refDossier');
      applyAudienceFieldToProcedure(p, 'refDossier', data.refDossier);
      const after = getAudienceProcedureFieldValue(p, 'refDossier');
      queueDossierHistoryEntry(dossier, {
        source: 'audience',
        field: 'procedureDetails.referenceClient',
        procedure: procKey,
        before,
        after
      });
    }
    if(data.dateAudience!==undefined){
      const before = getAudienceProcedureFieldValue(p, 'dateAudience');
      applyAudienceFieldToProcedure(p, 'dateAudience', data.dateAudience);
      const after = getAudienceProcedureFieldValue(p, 'dateAudience');
      queueDossierHistoryEntry(dossier, {
        source: 'audience',
        field: 'procedureDetails.audience',
        procedure: procKey,
        before,
        after
      });
    }
    if(data.juge!==undefined){
      const before = getAudienceProcedureFieldValue(p, 'juge');
      applyAudienceFieldToProcedure(p, 'juge', data.juge);
      const after = getAudienceProcedureFieldValue(p, 'juge');
      queueDossierHistoryEntry(dossier, {
        source: 'audience',
        field: 'procedureDetails.juge',
        procedure: procKey,
        before,
        after
      });
    }
    if(data.sort!==undefined){
      const before = getAudienceProcedureFieldValue(p, 'sort');
      applyAudienceFieldToProcedure(p, 'sort', data.sort);
      const after = getAudienceProcedureFieldValue(p, 'sort');
      queueDossierHistoryEntry(dossier, {
        source: 'audience',
        field: 'procedureDetails.sort',
        procedure: procKey,
        before,
        after
      });
    }
  });

  const reconciliation = shouldReconcileAudienceRefs
    ? reconcileAudienceOrphanDossiers()
    : { matchedDossiers: 0, mergedProcedures: 0 };
  if(reconciliation.matchedDossiers > 0){
    handleDossierDataChange({ audience: true });
  }

  if(clearDraft){
    audienceDraft = {};
  }
  if(audienceAutoSaveTimer){
    clearTimeout(audienceAutoSaveTimer);
    audienceAutoSaveTimer = null;
  }
  if(reconciliation.matchedDossiers > 0){
    queuePersistAppState();
  }else{
    [...changedDossiers.values()].forEach((entry)=>{
      persistDossierReferenceNow(entry.clientId, entry.dossier, { source: 'audience-save' }).catch(()=>{});
    });
  }
  persistStateSliceNow('audienceDraft', audienceDraft, { source: 'audience-draft' }).catch(()=>{});
  if(rerender){
    if(isDeferredRenderSectionVisible('audience')){
      renderAudienceKeepingPosition();
    }else{
      markDeferredRenderDirty('audience');
    }
    queueAudienceLinkedRenders();
  }
  if(feedback) showAudienceSaveFeedback('Audience enregistree.', 'success');
  return true;
}

function queueAudienceAutoSave(){
  if(audienceAutoSaveTimer) clearTimeout(audienceAutoSaveTimer);
  audienceAutoSaveTimer = setTimeout(()=>{
    audienceAutoSaveTimer = null;
    persistStateSliceNow('audienceDraft', audienceDraft, { source: 'audience-draft' }).catch(()=>{});
  }, 1200);
}

// ================== PROCEDURE DETAILS ==================
const PROCEDURE_CARD_SELECTOR = '#procedureDetails .proc-card';

function getProcedureCardElements(root = document){
  return [...root.querySelectorAll(PROCEDURE_CARD_SELECTOR)];
}

function getProcedureCardName(card){
  return String(card?.querySelector('h4')?.innerText || '').trim();
}

function getProcedureCardNames(root = document){
  return getProcedureCardElements(root)
    .map(card=>getProcedureCardName(card))
    .filter(Boolean);
}

function collectProcedureDraftFromCards({ root = document, trimValues = false } = {}){
  const draft = {};
  getProcedureCardElements(root).forEach(card=>{
    const name = getProcedureCardName(card);
    if(!name) return;
    draft[name] = {};
    card.querySelectorAll('input, select').forEach(fieldEl=>{
      draft[name][fieldEl.dataset.field] = trimValues ? fieldEl.value.trim() : fieldEl.value;
    });
  });
  return draft;
}

function applyProcedureFieldValues(container, values){
  if(!container || !values || typeof values !== 'object') return;
  container.querySelectorAll('input, select').forEach(fieldEl=>{
    const key = fieldEl.dataset.field;
    if(key && values[key] !== undefined) fieldEl.value = values[key];
  });
}

function applyProcedureDraftToCards(details, root = document){
  const source = details && typeof details === 'object' ? details : {};
  const normalizedMap = {};
  Object.entries(source).forEach(([key, value])=>{
    const normalizedKey = String(key || '').trim().toLowerCase();
    if(normalizedKey) normalizedMap[normalizedKey] = value;
  });
  getProcedureCardElements(root).forEach(card=>{
    const name = getProcedureCardName(card);
    if(!name) return;
    const fields = source[name] || normalizedMap[name.toLowerCase()] || {};
    applyProcedureFieldValues(card, fields);
  });
}

function activateProcedureCheckboxes(procList){
  const values = new Set((procList || []).map(v=>String(v || '').trim()).filter(Boolean));
  if(!values.size) return;
  document.querySelectorAll('.proc-check').forEach(cb=>{
    const rawValue = String(cb.value || '').trim();
    if(!values.has(rawValue)) return;
    cb.checked = true;
    const label = cb.closest('label');
    if(label) label.classList.add('active');
  });
}

function buildProcedureCardFieldsHtml(baseProc, tribunalFieldHtml, addOnlyButtonHtml){
  if(baseProc === 'Commandement'){
    return `
      <input type="text" data-field="dateDepot" placeholder="Date dépôt">
      <input type="text" data-field="executionNo" placeholder="Execution N°">
      <input type="text" data-field="notifConservateur" placeholder="Not conservateur">
      <input type="text" data-field="notifDebiteur" placeholder="Not débiteur">
      <input type="text" data-field="refExpertise" placeholder="Ref expertise">
      <select data-field="ord">
        <option value="att ord">att ord</option>
        <option value="ord ok">ord ok</option>
        <option value="att paiement">att paiement</option>
      </select>
      <input type="text" data-field="expert" placeholder="Expert">
      <input type="text" data-field="sort" list="commandementSortOptions" placeholder="Sort">
      <input type="text" data-field="dateVente" placeholder="Date vente">
      ${addOnlyButtonHtml}
    `;
  }
  if(baseProc === 'SFDC' || baseProc === 'S/bien'){
    return `
      <input type="text" data-field="dateDepot" placeholder="Date dépôt">
      <input type="text" data-field="depotLe" placeholder="Dépôt le">
      <input type="text" data-field="referenceClient" placeholder="Référence dossier">
      <input type="text" data-field="attOrdOrOrdOk" placeholder="att ord / ord ok">
      <input type="text" data-field="executionNo" placeholder="Execution N°">
      <input type="text" data-field="attDelegationOuDelegat" placeholder="att delegation ou delegat">
      <input type="text" data-field="huissier" placeholder="Huissier">
      <input type="text" data-field="sort" placeholder="Sort">
      ${tribunalFieldHtml}
    `;
  }
  if(baseProc === 'Injonction'){
    return `
      <input type="text" data-field="dateDepot" placeholder="Date d’affectation">
      <input type="text" data-field="depotLe" placeholder="Dépôt le">
      <input type="text" data-field="referenceClient" placeholder="Référence dossier">
      <input type="text" data-field="attOrdOrOrdOk" placeholder="att ord / ord ok">
      <input type="text" data-field="notificationSort" placeholder="Sort notification">
      <input type="text" data-field="notificationNo" placeholder="Notification N°">
      <select data-field="notificationStatus">
        <option value="att plie avec tr">att plie avec tr</option>
        <option value="att notif">att notif</option>
        <option value="notifier">notifier</option>
        <option value="NB">NB</option>
      </select>
      <div class="notif-date-wrap">
        <input type="date" data-field="dateNotification" placeholder="Date notification">
      </div>
      <select data-field="certificatNonAppelStatus">
        <option value="att certificat non appel">att certificat non appel</option>
        <option value="certificat non appel ok">certificat non appel ok</option>
      </select>
      <input type="text" data-field="executionNo" placeholder="Execution N°">
      <input type="text" data-field="huissier" placeholder="Huissier">
      <input type="text" data-field="sort" placeholder="Sort">
      ${tribunalFieldHtml}
    `;
  }
  if(baseProc === 'Redressement' || baseProc === 'Liquidation judiciaire'){
    const fixedLabel = 'Declaration';
    return `
      <input type="text" data-field="declarationCreance" class="proc-fixed-input" value="${escapeAttr(fixedLabel)}" readonly>
      <input type="text" data-field="syndicName" placeholder="Nom du syndic">
      <input type="text" data-field="notificationStatus" placeholder="En cours ou notifié">
      <input type="text" data-field="dateNotification" placeholder="Date notification">
      <input type="text" data-field="villeProcedure" placeholder="Ville">
      ${addOnlyButtonHtml}
    `;
  }
  return `
    <input type="text" data-field="dateDepot" placeholder="Date d’affectation">
    <input type="text" data-field="depotLe" placeholder="Dépôt le">
    <input type="text" data-field="referenceClient" placeholder="Référence dossier">
    <input type="text" data-field="audience" placeholder="Audience">
    <input type="text" data-field="juge" placeholder="Juge">
    <input type="text" data-field="sort" placeholder="Sort">
    ${tribunalFieldHtml}
  `;
}

function bindProcedureTribunalAutocomplete(input){
  if(!input) return;
  const syncAutocomplete = ()=>{
    syncProcedureTribunalAutocompleteOptions(collectProcedureDraft());
  };
  ['focus', 'input', 'change'].forEach(eventName=>{
    input.addEventListener(eventName, syncAutocomplete);
  });
}

function collectProcedureDraft(){
  return collectProcedureDraftFromCards();
}

function normalizeProcedureName(value){
  return normalizeLooseText(value).toLowerCase();
}

function getProcedureBaseName(procName){
  const raw = String(procName || '').trim();
  if(!raw) return '';
  return raw.replace(/\d+$/, '').trim() || raw;
}

function isProcedureVariantName(procName){
  return /\d+$/.test(String(procName || '').trim());
}

function canAddProcedureVariant(existingNames, sourceProc){
  const base = getProcedureBaseName(sourceProc);
  if(!base) return false;
  return true;
}

function getNextProcedureVariantName(existingNames, sourceProc){
  const base = getProcedureBaseName(sourceProc);
  let maxIndex = 1;
  (existingNames || []).forEach(name=>{
    const raw = String(name || '').trim();
    if(!raw || getProcedureBaseName(raw) !== base) return;
    const m = raw.match(/(\d+)$/);
    if(!m) return;
    const n = Number(m[1]);
    if(Number.isFinite(n) && n > maxIndex) maxIndex = n;
  });
  return `${base}${maxIndex + 1}`;
}

function getProcedureInsertIndexForVariant(existingNames, sourceProc){
  const base = getProcedureBaseName(sourceProc);
  let lastIdx = -1;
  (existingNames || []).forEach((name, idx)=>{
    if(getProcedureBaseName(name) === base) lastIdx = idx;
  });
  return lastIdx;
}

function getProcedureColorClass(procName){
  const base = getProcedureBaseName(procName);
  if(base === 'ASS') return 'proc-ass';
  if(base === 'Restitution') return 'proc-restitution';
  if(base === 'Commandement') return 'proc-commandement';
  if(base === 'Nantissement') return 'proc-nantissement';
  if(base === 'Redressement') return 'proc-redressement';
  if(base === 'Vérification de créance') return 'proc-verification-creance';
  if(base === 'Liquidation judiciaire') return 'proc-declaration-creance';
  if(base === 'SFDC') return 'proc-sfdc';
  if(base === 'S/bien') return 'proc-sbien';
  if(base === 'Injonction') return 'proc-injonction';
  if(customProcedures.includes(base)) return 'proc-autre';
  return '';
}

function addProcedureVariant(sourceProc){
  const currentOrder = getProcedureCardNames();
  if(!currentOrder.length) return;
  const sourceIndex = currentOrder.indexOf(sourceProc);
  if(sourceIndex === -1) return;
  if(!canAddProcedureVariant(currentOrder, sourceProc)) return;
  const currentDraft = collectProcedureDraft();
  const variantName = getNextProcedureVariantName(currentOrder, sourceProc);
  const insertAfter = getProcedureInsertIndexForVariant(currentOrder, sourceProc);
  const insertAt = insertAfter >= 0 ? insertAfter + 1 : sourceIndex + 1;
  currentOrder.splice(insertAt, 0, variantName);
  currentDraft[variantName] = {};
  renderProcedureDetails(currentOrder, currentDraft);
}

function removeProcedureVariant(procName){
  const currentOrder = getProcedureCardNames();
  if(!currentOrder.length) return;
  if(!isProcedureVariantName(procName)) return;
  const idx = currentOrder.indexOf(procName);
  if(idx === -1) return;
  const currentDraft = collectProcedureDraft();
  currentOrder.splice(idx, 1);
  delete currentDraft[procName];
  renderProcedureDetails(currentOrder, currentDraft);
}

function isProcedureCardFieldEmpty(fieldEl){
  if(!fieldEl) return true;
  if(fieldEl.disabled || fieldEl.type === 'hidden') return true;
  if(fieldEl.readOnly || fieldEl.classList.contains('proc-fixed-input')) return true;
  const hiddenParent = fieldEl.closest('.notif-date-wrap');
  if(hiddenParent && hiddenParent.style.display === 'none'){
    return true;
  }
  return !String(fieldEl.value || '').trim();
}

function isProcedureCardEmpty(card){
  if(!card) return false;
  const fields = [...card.querySelectorAll('input, select')];
  if(!fields.length) return false;
  return fields.every(isProcedureCardFieldEmpty);
}

function updateProcedureCardRemoveButtonVisibility(card){
  const removeBtn = card?.querySelector('.proc-remove-empty-btn');
  if(!removeBtn) return;
  const procName = getProcedureCardName(card);
  removeBtn.hidden = !editingDossier || isProcedureVariantName(procName) || !isProcedureCardEmpty(card);
}

function removeProcedureCard(procName){
  const currentOrder = getProcedureCardNames();
  if(!currentOrder.length) return;
  const idx = currentOrder.indexOf(procName);
  if(idx === -1) return;
  const confirmed = window.confirm(`Supprimer la procédure "${procName}" ?`);
  if(!confirmed) return;
  const currentDraft = collectProcedureDraft();
  currentOrder.splice(idx, 1);
  delete currentDraft[procName];
  customProcedures = customProcedures.filter(proc=>String(proc || '').trim() !== String(procName || '').trim());
  renderCustomProcedures();
  renderProcedureDetails(currentOrder, currentDraft);
  resyncProcedureSelectionFromUI(currentOrder);
}

function getFormDateAffectationValue(){
  const raw = String($('dateAffectation')?.value || '').trim();
  if(!raw) return '';
  return normalizeDateDDMMYYYY(raw) || '';
}

function syncProcedureDateAffectationToCards(force = false){
  const dateAffectation = getFormDateAffectationValue();
  if(!dateAffectation) return;
  document.querySelectorAll('#procedureDetails .proc-card input[data-field="dateDepot"]').forEach(input=>{
    const current = String(input.value || '').trim();
    if(force || !current) input.value = dateAffectation;
  });
}

function updateInjonctionNotificationDateVisibility(card){
  if(!card) return;
  const notifSelect = card.querySelector('select[data-field="notificationStatus"]');
  const dateWrap = card.querySelector('.notif-date-wrap');
  if(!notifSelect || !dateWrap) return;
  const value = String(notifSelect.value || '').trim().toLowerCase();
  const show = value === 'notifier' || value === 'nb';
  dateWrap.style.display = show ? '' : 'none';
}

function collectKnownProcedureTribunalLabels(draft = null){
  const labels = [];
  AppState.clients.forEach(client=>{
    (client?.dossiers || []).forEach(dossier=>{
      const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
        ? dossier.procedureDetails
        : {};
      Object.values(details).forEach(procDetails=>{
        const tribunal = normalizeLooseText(procDetails?.tribunal || '');
        if(tribunal) labels.push(tribunal);
      });
    });
  });
  const draftSource = draft && typeof draft === 'object'
    ? draft
    : collectProcedureDraft();
  Object.values(draftSource || {}).forEach(procDetails=>{
    const tribunal = normalizeLooseText(procDetails?.tribunal || '');
    if(tribunal) labels.push(tribunal);
  });
  const clustered = buildTribunalClusterStateFromLabels(labels);
  return clustered.options.map(option=>String(option?.label || '').trim()).filter(Boolean);
}

function syncProcedureTribunalAutocompleteOptions(draft = null){
  const datalist = $(PROCEDURE_TRIBUNAL_DATALIST_ID);
  if(!datalist) return;
  const labels = collectKnownProcedureTribunalLabels(draft);
  datalist.innerHTML = labels.map(label=>`<option value="${escapeHtml(label)}"></option>`).join('');
}

function syncConditionalCreationFieldsVisibility(forceList){
  const selectedProcedures = Array.isArray(forceList)
    ? forceList.slice()
    : [...document.querySelectorAll('.proc-check:checked')].map(cb=>cb.value);
  const normalizedProcedures = new Set(
    selectedProcedures
      .map(value=>normalizeProcedureName(getProcedureBaseName(String(value || '').trim())))
      .filter(Boolean)
  );
  document.querySelectorAll('#creationSection [data-procedure-visibility]').forEach(fieldContainer=>{
    const requiredProcedure = normalizeProcedureName(String(fieldContainer.dataset.procedureVisibility || '').trim());
    const shouldShow = !requiredProcedure || normalizedProcedures.has(requiredProcedure);
    fieldContainer.classList.toggle('creation-procedure-only-hidden', !shouldShow);
  });
}

function renderProcedureDetails(forceList, forceDraft){
  const container = $('procedureDetails');
  const draft = forceDraft && typeof forceDraft === 'object'
    ? forceDraft
    : collectProcedureDraft();
  container.innerHTML='';
  syncProcedureTribunalAutocompleteOptions(draft);
  const selected = Array.isArray(forceList) && forceList.length
    ? forceList.slice()
    : [...document.querySelectorAll('.proc-check:checked')].map(cb=>cb.value);
  if(!forceList || !forceList.length) selected.push(...customProcedures);
  const activeLabels = [...document.querySelectorAll('.checkbox-group label.active')]
    .map(l=>l.dataset.proc)
    .filter(Boolean);
  activeLabels.forEach(p=>{
    if(!selected.includes(p)) selected.push(p);
  });
  for(let i=selected.length-1;i>=0;i--){
    if(selected[i] === 'Autre') selected.splice(i,1);
  }

  const finalList = [...new Set(selected.map(v=>String(v).trim()).filter(Boolean))];
  syncConditionalCreationFieldsVisibility(finalList);

  finalList.forEach(proc=>{
    if(!proc || !String(proc).trim()) return;
    const procClass = getProcedureColorClass(proc);
    const baseProc = getProcedureBaseName(proc);

    const div = document.createElement('div');
    div.className = `proc-card ${procClass}`;
    const canAddVariant = canAddProcedureVariant(finalList, proc);
    const isVariant = isProcedureVariantName(proc);
    const addBtnToneClass = procClass ? `proc-add-variant-btn--${procClass}` : '';
    const addOnlyButtonHtml = canAddVariant
      ? `
        <button type="button" class="proc-add-variant-btn ${addBtnToneClass}" title="Ajouter une duplication">
          <i class="fa-solid fa-plus"></i><span>Ajouter</span>
        </button>
      `
      : '';
    const tribunalFieldHtml = canAddVariant
      ? `
        <div class="tribunal-add-wrap">
          <input type="text" data-field="tribunal" list="${PROCEDURE_TRIBUNAL_DATALIST_ID}" placeholder="Tribunal" autocomplete="off">
          <button type="button" class="proc-add-variant-btn ${addBtnToneClass}" title="Ajouter une duplication">
            <i class="fa-solid fa-plus"></i><span>Ajouter</span>
          </button>
        </div>
      `
      : `<input type="text" data-field="tribunal" list="${PROCEDURE_TRIBUNAL_DATALIST_ID}" placeholder="Tribunal" autocomplete="off">`;
    const fieldsHtml = buildProcedureCardFieldsHtml(baseProc, tribunalFieldHtml, addOnlyButtonHtml);
    const title = document.createElement('h4');
    title.textContent = proc;
    const head = document.createElement('div');
    head.className = 'proc-card-head';
    head.appendChild(title);
    if(isVariant){
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'proc-remove-variant-btn';
      removeBtn.title = 'Supprimer cette duplication';
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      removeBtn.addEventListener('click', ()=>removeProcedureVariant(proc));
      head.appendChild(removeBtn);
    }else{
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'proc-remove-variant-btn proc-remove-empty-btn';
      removeBtn.title = 'Supprimer cette procédure';
      removeBtn.hidden = true;
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      removeBtn.addEventListener('click', ()=>removeProcedureCard(proc));
      head.appendChild(removeBtn);
    }
    const grid = document.createElement('div');
    grid.className = 'proc-grid';
    grid.innerHTML = fieldsHtml;
    div.appendChild(head);
    div.appendChild(grid);
    container.appendChild(div);
    applyProcedureFieldValues(div, draft[proc]);
    const dateAffectationField = div.querySelector('input[data-field="dateDepot"]');
    if(dateAffectationField && !String(dateAffectationField.value || '').trim()){
      const formDateAffectation = getFormDateAffectationValue();
      if(formDateAffectation) dateAffectationField.value = formDateAffectation;
    }
    if(baseProc === 'Injonction'){
      const notifSelect = div.querySelector('select[data-field="notificationStatus"]');
      if(notifSelect){
        notifSelect.addEventListener('change', ()=>updateInjonctionNotificationDateVisibility(div));
      }
      updateInjonctionNotificationDateVisibility(div);
    }
    const addVariantBtn = div.querySelector('.proc-add-variant-btn');
    if(addVariantBtn){
      addVariantBtn.addEventListener('click', ()=>addProcedureVariant(proc));
    }
    div.querySelectorAll('input, select').forEach(fieldEl=>{
      ['input', 'change'].forEach(eventName=>{
        fieldEl.addEventListener(eventName, ()=>updateProcedureCardRemoveButtonVisibility(div));
      });
    });
    div.querySelectorAll('input[data-field="tribunal"]').forEach(bindProcedureTribunalAutocomplete);
    updateProcedureCardRemoveButtonVisibility(div);
  });

  syncProcedureMontantGroups(finalList);

  if(!forceList || !forceList.length){
    suppressProcedureChange = true;
    activateProcedureCheckboxes(finalList);
    suppressProcedureChange = false;
  }
}

function addCustomProcedure(){
  const input = $('procedureCustom');
  if(!input) return;
  const value = input.value.trim();
  if(!value) return;
  if(customProcedures.includes(value)) return;
  customProcedures.push(value);
  input.value = '';
  renderCustomProcedures();
  renderProcedureDetails();
}

function removeCustomProcedure(value){
  customProcedures = customProcedures.filter(v=>v !== value);
  renderCustomProcedures();
  renderProcedureDetails();
}

function renderCustomProcedures(){
  const container = $('customProcedures');
  if(!container) return;
  container.innerHTML = '';
  customProcedures.forEach(v=>{
    const chip = document.createElement('span');
    chip.className = 'custom-proc custom-red';
    chip.appendChild(document.createTextNode(`${v} `));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'x';
    btn.addEventListener('click', ()=>removeCustomProcedure(v));
    chip.appendChild(btn);
    container.appendChild(chip);
  });
}


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApplication);
} else {
  bootstrapApplication();
}
function getApiAuthLoginTimeoutMs(){
  let timeoutMs = API_AUTH_LOGIN_TIMEOUT_MS;
  try{
    if(typeof hasLoadedState !== 'undefined' && hasLoadedState && isLargeDatasetMode()){
      timeoutMs += isUltraLargeDatasetMode() ? 10000 : 5000;
    }
  }catch(_){}
  return timeoutMs;
}
