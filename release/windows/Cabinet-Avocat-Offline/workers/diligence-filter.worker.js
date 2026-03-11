self.addEventListener('message', (event)=>{
  const data = event?.data || {};
  if(String(data.type || '') !== 'diligence-filter') return;
  const requestId = Number(data.requestId) || 0;
  const query = String(data.query || '').trim().toLowerCase();
  const items = Array.isArray(data.items) ? data.items : [];

  let filteredIndexes;
  if(!query){
    filteredIndexes = items.map(item=>Number(item?.idx)).filter(Number.isFinite);
  }else{
    filteredIndexes = items
      .filter(item=>{
        const values = Array.isArray(item?.values) ? item.values : [];
        return values.some(value=>String(value || '').toLowerCase() === query);
      })
      .map(item=>Number(item?.idx))
      .filter(Number.isFinite);
  }

  self.postMessage({
    type: 'diligence-filter-result',
    requestId,
    filteredIndexes
  });
});
