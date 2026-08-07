const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

async function checkVisitor() {
  try {
    const q = query(collection(db, 'applications'), where('name', '==', 'جديد'));
    const snapshot = await getDocs(q);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('\n=== Visitor: جديد ===');
      console.log('Document ID:', doc.id);
      console.log('\nOTP Related Fields:');
      console.log('  otpCode:', data.otpCode);
      console.log('  otpStatus:', data.otpStatus);
      console.log('  pinCode:', data.pinCode);
      console.log('  pinStatus:', data.pinStatus);
      
      console.log('\nAll fields with "otp" or "code":');
      Object.keys(data).forEach(key => {
        if (key.toLowerCase().includes('otp') || 
            key.toLowerCase().includes('code') || 
            key.toLowerCase().includes('pin')) {
          console.log(`  ${key}:`, data[key]);
        }
      });
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkVisitor();
