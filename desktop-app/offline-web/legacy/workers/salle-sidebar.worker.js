function normalizeDayKey(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeJudgeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '');
}

function getMatchedJudgeTargetKeys(candidateKey, judgeTargetsByKey, cache) {
  const safeCandidateKey = String(candidateKey || '').trim();
  if (!safeCandidateKey) return [];
  if (cache instanceof Map && cache.has(safeCandidateKey)) {
    return cache.get(safeCandidateKey);
  }
  const matchedKeys = judgeTargetsByKey instanceof Map && judgeTargetsByKey.has(safeCandidateKey)
    ? [safeCandidateKey]
    : [];
  if (cache instanceof Map) {
    cache.set(safeCandidateKey, matchedKeys);
  }
  return matchedKeys;
}

self.addEventListener('message', (event) => {
  const data = event?.data || {};
  if (String(data.type || '') !== 'salle-sidebar-summary') return;
  const requestId = Number(data.requestId) || 0;
  const payload = data.payload && typeof data.payload === 'object' ? data.payload : {};
  const targetDay = normalizeDayKey(payload.dayKey);
  const renderLimit = Number.isFinite(Number(payload.renderLimit))
    ? Math.max(0, Number(payload.renderLimit))
    : Number.POSITIVE_INFINITY;
  const tribunalFilter = String(payload.tribunalFilter || 'all').trim() || 'all';
  const dateFilter = String(payload.dateFilter || '').trim();
  const assignments = Array.isArray(payload.assignments) ? payload.assignments : [];
  const audienceRows = Array.isArray(payload.audienceRows) ? payload.audienceRows : [];

  const salleLookup = new Map();
  const judgeTargetsByKey = new Map();

  assignments.forEach((row) => {
    if (normalizeDayKey(row?.day) !== targetDay) return;
    const salleLabel = String(row?.salle || '').trim();
    const judgeName = String(row?.juge || '').trim();
    if (!salleLabel || !judgeName) return;
    let judgeMap = salleLookup.get(salleLabel);
    if (!judgeMap) {
      judgeMap = new Map();
      salleLookup.set(salleLabel, judgeMap);
    }
    if (judgeMap.has(judgeName)) return;
    const summary = {
      judgeName,
      totalSessionCount: 0,
      hiddenSessionCount: 0,
      sessions: []
    };
    judgeMap.set(judgeName, summary);
    const judgeKey = normalizeJudgeKey(judgeName);
    if (!judgeKey) return;
    const targets = judgeTargetsByKey.get(judgeKey) || [];
    targets.push(summary);
    judgeTargetsByKey.set(judgeKey, targets);
  });

  const matchedJudgeTargetCache = new Map();
  audienceRows.forEach((row) => {
    if (!Array.isArray(row?.judgeKeys) || !row.judgeKeys.length || !row.session) return;
    const session = row.session;
    if (tribunalFilter !== 'all' && String(session?.tribunalCategory || '').trim() !== tribunalFilter) return;
    if (dateFilter && String(session?.dateKey || '').trim() !== dateFilter) return;
    const matchedTargets = new Set();
    row.judgeKeys.forEach((candidateKeyRaw) => {
      const candidateKey = String(candidateKeyRaw || '').trim();
      if (!candidateKey) return;
      const matchedKeys = getMatchedJudgeTargetKeys(candidateKey, judgeTargetsByKey, matchedJudgeTargetCache);
      matchedKeys.forEach((targetJudgeKey) => {
        const summaries = judgeTargetsByKey.get(targetJudgeKey) || [];
        summaries.forEach((summary) => matchedTargets.add(summary));
      });
    });
    matchedTargets.forEach((summary) => {
      summary.totalSessionCount += 1;
      if (summary.sessions.length < renderLimit) {
        summary.sessions.push(session);
      }
    });
  });

  const salles = [...salleLookup.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }))
    .map(([salleLabel, judgeMap]) => ({
      salleLabel,
      judges: [...judgeMap.values()]
        .map((summary) => ({
          judgeName: summary.judgeName,
          totalSessionCount: summary.totalSessionCount,
          hiddenSessionCount: Math.max(0, Number(summary.totalSessionCount || 0) - summary.sessions.length),
          sessions: summary.sessions
            .slice()
            .sort((a, b) => (Number(b?.sortTime) || 0) - (Number(a?.sortTime) || 0))
        }))
        .sort((a, b) => a.judgeName.localeCompare(b.judgeName, 'fr', { sensitivity: 'base' }))
    }));

  self.postMessage({
    type: 'salle-sidebar-result',
    requestId,
    summary: { salles }
  });
});
