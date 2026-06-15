const Database = require('better-sqlite3');
try {
    const db = new Database('C:/ProgramData/JewelrySuite/gold_system.db', { readonly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log("Tables:", tables.map(t => t.name));
    
    for (const t of tables) {
        if (t.name === 'sqlite_sequence') continue;
        const schema = db.prepare(`PRAGMA table_info('${t.name}')`).all();
        console.log(`\nSchema for ${t.name}:`);
        console.log(schema.map(c => `${c.name} (${c.type})`).join(', '));
        
        const count = db.prepare(`SELECT COUNT(*) as c FROM ${t.name}`).get();
        console.log(`Row count: ${count.c}`);
        
        if (count.c > 0) {
            const sample = db.prepare(`SELECT * FROM ${t.name} LIMIT 1`).get();
            console.log(`Sample data:`, sample);
        }
    }
} catch (e) {
    console.error("Error opening DB:", e);
}
