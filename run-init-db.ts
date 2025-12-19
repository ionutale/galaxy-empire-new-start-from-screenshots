import { initDb } from './src/lib/server/init-db.js';

initDb().then(() => {
    console.log('Done');
    process.exit(0);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
