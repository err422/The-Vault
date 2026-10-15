/**
 * One-time migration: set users/{uid}/admin=false when the field is absent or invalid.
 *
 * Run from a trusted local environment, never from the browser:
 *   npm install firebase-admin
 *   GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json" node scripts/migrate-admin-flags.mjs
 *
 * Create/download the service-account key in Firebase Console > Project settings >
 * Service accounts. Never commit that key to this repository.
 * This script never changes an explicit admin:true value.
 */
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const databaseURL = 'https://the-vault-server-default-rtdb.firebaseio.com';

if (!getApps().length) {
  initializeApp({ credential: applicationDefault(), databaseURL });
}

const database = getDatabase();
const usersRef = database.ref('users');
const snapshot = await usersRef.get();
const users = snapshot.val() || {};
const updates = {};
let migrated = 0;
let alreadyValid = 0;

for (const [uid, profile] of Object.entries(users)) {
  if (!profile || typeof profile !== 'object') continue;
  if (typeof profile.admin === 'boolean') {
    alreadyValid++;
    continue;
  }
  updates[`${uid}/admin`] = false;
  migrated++;
}

if (migrated > 0) {
  await usersRef.update(updates);
}

console.log(`Migration complete. Added admin=false to ${migrated} existing profiles; left ${alreadyValid} profiles with boolean admin flags unchanged.`);
process.exit(0);
