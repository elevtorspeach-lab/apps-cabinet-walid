function collectFiniteIndexes(items){
  return items.map(item=>Number(item?.idx)).filter(Number.isFinite);
}

function matchesWorkerQuery(value, query){
  return String(value || '').toLowerCase().includes(query);
}

self.addEventListener('message', (event)=>{
  const data = event?.data || {};
  if(String(data.type || '') !== 'client-filter') return;
  const requestId = Number(data.requestId) || 0;
  const query = String(data.query || '').trim().toLowerCase();
  const items = Array.isArray(data.items) ? data.items : [];

  let filteredIndexes;
  if(!query){
    filteredIndexes = collectFiniteIndexes(items);
  }else{
    filteredIndexes = collectFiniteIndexes(
      items.filter(item=>matchesWorkerQuery(item?.name, query))
    );
  }

  self.postMessage({
    type: 'client-filter-result',
    requestId,
    filteredIndexes
  });
});
