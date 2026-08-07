const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findOtpCode() {
  try {
    const snapshot = await getDocs(collection(db, 'applications'));
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.name === 'جديد') {
        console.log('\n=== Found Visitor: جديد ===');
        console.log('Document ID:', doc.id);
        
        // Search for "343333" in all fields
        console.log('\nSearching for code "343333" in all fields:');
        Object.keys(data).forEach(key => {
          const value = data[key];
          if (value && value.toString().includes('343333')) {
            console.log(`  FOUND in field "${key}":`, value);
          }
        });
        
        // Print all fields
        console.log('\n=== ALL FIELDS ===');
        console.log(JSON.stringify(data, null, 2));
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findOtpCode();
