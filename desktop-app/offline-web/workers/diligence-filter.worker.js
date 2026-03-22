function collectFiniteIndexes(items){
  return items.map(item=>Number(item?.idx)).filter(Number.isFinite);
}

function matchesWorkerQuery(value, query){
  return String(value || '').toLowerCase().includes(query);
}

self.addEventListener('message', (event)=>{
  const data = event?.data || {};
  if(String(data.type || '') !== 'diligence-filter') return;
  const requestId = Number(data.requestId) || 0;
  const query = String(data.query || '').trim().toLowerCase();
  const executionOnlyQuery = data.executionOnlyQuery === true;
  const items = Array.isArray(data.items) ? data.items : [];

  let filteredIndexes;
  if(!query){
    filteredIndexes = collectFiniteIndexes(items);
  }else if(executionOnlyQuery){
    filteredIndexes = collectFiniteIndexes(
      items.filter(item=>String(item?.executionNo || '').trim().length > 0)
    );
  }else{
    filteredIndexes = collectFiniteIndexes(
      items.filter(item=>{
        const values = Array.isArray(item?.values) ? item.values : [];
        return values.some(value=>matchesWorkerQuery(value, query));
      })
    );
  }

  self.postMessage({
    type: 'diligence-filter-result',
    requestId,
    filteredIndexes
  });
});
