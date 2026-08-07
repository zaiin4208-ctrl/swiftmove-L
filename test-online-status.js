const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAYAW8RdVEskTzozA6Jp9GDR0T4v3JhzDU",
  authDomain: "bcare-v2-app.firebaseapp.com",
  projectId: "bcare-v2-app",
  storageBucket: "bcare-v2-app.firebasestorage.app",
  messagingSenderId: "610570825864",
  appId: "1:610570825864:web:ffe63cc2f2b95ad690ef3d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkOnlineStatus() {
  try {
    const querySnapshot = await getDocs(collection(db, "pays"));
    
    console.log("\n=== Firebase Data Check ===\n");
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.ownerName) {
        console.log(`Visitor: ${data.ownerName}`);
        console.log(`  ID: ${doc.id}`);
        console.log(`  online field: ${data.online}`);
        console.log(`  online type: ${typeof data.online}`);
        console.log(`  lastSeen: ${data.lastSeen}`);
        console.log(`  currentStep: ${data.currentStep}`);
        console.log("---");
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkOnlineStatus();
