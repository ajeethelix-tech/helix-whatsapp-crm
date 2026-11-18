const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./crm_database.sqlite');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) { console.error(err); return; }
  console.log('Tables:', tables.map(t => t.name));
  tables.forEach(t => {
    db.all(`SELECT * FROM ${t.name}`, (err, rows) => {
      if (err) return;
      const matches = rows.filter(r => {
        const str = JSON.stringify(r).toLowerCase();
        return str.includes('ajeet') || str.includes('919717117289') || str.includes('biogenesis') || str.includes('profacer');
      });
      if (matches.length > 0) {
        console.log(`=== Matches in ${t.name} ===`);
        console.log(matches);
      }
    });
  });
});
