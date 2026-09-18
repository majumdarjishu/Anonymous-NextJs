fetch('https://indexer.preprod.midnight.network/api/v4/graphql', { 
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' }, 
  body: JSON.stringify({ query: '{ __type(name: "Query") { fields { name args { name type { kind name ofType { name } } } } } }' }) 
}).then(r => r.json()).then(res => console.dir(res.data.__type.fields.find(f => f.name === 'transactions'), {depth: null})).catch(console.error);
