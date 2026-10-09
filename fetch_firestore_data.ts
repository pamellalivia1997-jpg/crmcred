import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

const config = {
  apiKey: 'AIzaSyCbmsentbF3Wz9CMXHFbd7t3c0AnUAQx14',
  authDomain: 'liviacred-ead6d.firebaseapp.com',
  projectId: 'liviacred-ead6d',
  storageBucket: 'liviacred-ead6d.firebasestorage.app',
  messagingSenderId: '1096057962459',
  appId: '1:1096057962459:web:3558837e2cbbf6bc101374'
};

async function main() {
  const app = initializeApp(config);
  const db = getFirestore(app);

  console.log('Fetching propostas from Firestore...');
  const snap = await getDocs(collection(db, 'propostas'));
  const propostas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Fetched ${propostas.length} propostas`);

  fs.writeFileSync('all_propostas.json', JSON.stringify(propostas, null, 2));

  const usersSnap = await getDocs(collection(db, 'users'));
  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  fs.writeFileSync('all_users.json', JSON.stringify(users, null, 2));

  console.log('Saved to all_propostas.json and all_users.json');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
