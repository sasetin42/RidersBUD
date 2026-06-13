import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import * as fs from 'fs';
import * as path from 'path';

// Firebase configuration for the live app
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
const storage = getStorage(app);

// Collections to fetch
const COLLECTIONS = [
    'services',
    'mechanics',
    'bookings',
    'parts',
    'customers',
    'vehicles',
    'orders',
    'banners',
    'faqCategories',
    'adminUsers',
    'roles',
    'tasks',
    'payoutRequests',
    'rentalCars',
    'subscriptions',
    'promoCodes',
    'settings'
];

interface CollectionData {
    [key: string]: any[];
}

async function fetchCollectionData(collectionName: string): Promise<any[]> {
    try {
        console.log(`Fetching ${collectionName}...`);
        const querySnapshot = await getDocs(collection(db, collectionName));
        const data: any[] = [];
        
        querySnapshot.forEach((doc) => {
            data.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✓ Fetched ${data.length} documents from ${collectionName}`);
        return data;
    } catch (error) {
        console.error(`✗ Error fetching ${collectionName}:`, error);
        return [];
    }
}

async function fetchAllData(): Promise<CollectionData> {
    const allData: CollectionData = {};
    
    console.log('Starting to fetch data from live Firebase...\n');
    
    for (const collectionName of COLLECTIONS) {
        allData[collectionName] = await fetchCollectionData(collectionName);
    }
    
    return allData;
}

async function saveDataToFile(data: CollectionData) {
    const outputDir = path.join(process.cwd(), 'data');
    const outputFile = path.join(outputDir, 'liveData.json');
    
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save to JSON file
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
    console.log(`\n✓ Data saved to ${outputFile}`);
    
    // Generate TypeScript file
    const tsOutputFile = path.join(outputDir, 'liveData.ts');
    let tsContent = '// Auto-generated from live Firebase data\n';
    tsContent += '// Generated on: ' + new Date().toISOString() + '\n\n';
    
    for (const [collectionName, collectionData] of Object.entries(data)) {
        const varName = `live${collectionName.charAt(0).toUpperCase() + collectionName.slice(1)}`;
        tsContent += `export const ${varName} = ${JSON.stringify(collectionData, null, 2)};\n\n`;
    }
    
    fs.writeFileSync(tsOutputFile, tsContent);
    console.log(`✓ TypeScript file saved to ${tsOutputFile}`);
}

async function generateReport(data: CollectionData) {
    console.log('\n' + '='.repeat(60));
    console.log('DATA FETCH SUMMARY');
    console.log('='.repeat(60));
    
    let totalDocuments = 0;
    
    for (const [collectionName, collectionData] of Object.entries(data)) {
        console.log(`${collectionName.padEnd(20)} : ${collectionData.length} documents`);
        totalDocuments += collectionData.length;
    }
    
    console.log('='.repeat(60));
    console.log(`TOTAL DOCUMENTS      : ${totalDocuments}`);
    console.log('='.repeat(60));
}

// Main execution
async function main() {
    try {
        const data = await fetchAllData();
        await saveDataToFile(data);
        await generateReport(data);
        
        console.log('\n✓ Data fetch completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Review the data in data/liveData.json');
        console.log('2. Import the data in your application using data/liveData.ts');
        console.log('3. Update your local storage or state management with this data');
        
        process.exit(0);
    } catch (error) {
        console.error('Error in main execution:', error);
        process.exit(1);
    }
}

main();
