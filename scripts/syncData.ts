import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import liveData from '../data/liveData.json';

// Firebase configuration (same as your current config)
const firebaseConfig = {
    apiKey: "AIzaSyD_ot0rEnYcP0l4fseVinRPFuUFuHYFn3A",
    authDomain: "ridersbud-10806.firebaseapp.com",
    projectId: "ridersbud-10806",
    storageBucket: "ridersbud-10806.firebasestorage.app",
    messagingSenderId: "492813766406",
    appId: "1:492813766406:web:c35e8974032a01fb8f9887"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function syncDataToLocal() {
    console.log('Starting to sync data to local Firebase...\n');

    const collections = [
        'services',
        'mechanics',
        'bookings',
        'parts',
        'customers',
        'orders',
        'banners',
        'adminUsers',
        'roles',
        'rentalCars'
    ];

    let totalSynced = 0;

    for (const collectionName of collections) {
        const data = liveData[collectionName];

        if (!data || data.length === 0) {
            console.log(`⊘ Skipping ${collectionName} - no data`);
            continue;
        }

        console.log(`\nSyncing ${collectionName}...`);

        for (const item of data) {
            try {
                const docRef = doc(db, collectionName, item.id);
                await setDoc(docRef, item);
                console.log(`  ✓ Synced ${collectionName}/${item.id}`);
                totalSynced++;
            } catch (error) {
                console.error(`  ✗ Error syncing ${collectionName}/${item.id}:`, error);
            }
        }

        console.log(`✓ Completed ${collectionName} - ${data.length} documents`);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`SYNC COMPLETE - ${totalSynced} documents synced`);
    console.log('='.repeat(60));
}

// Run the sync
syncDataToLocal()
    .then(() => {
        console.log('\n✓ Data sync completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n✗ Error during sync:', error);
        process.exit(1);
    });
