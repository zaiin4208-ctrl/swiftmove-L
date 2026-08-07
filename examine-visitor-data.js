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

async function examineVisitorData() {
  try {
    const querySnapshot = await getDocs(collection(db, "pays"));
    
    console.log("\n=== Full Visitor Data Examination ===\n");
    
    // Get first visitor with most data
    let selectedVisitor = null;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.ownerName && !selectedVisitor) {
        selectedVisitor = { id: doc.id, ...data };
      }
    });
    
    if (selectedVisitor) {
      console.log(`Examining visitor: ${selectedVisitor.ownerName}`);
      console.log(`ID: ${selectedVisitor.id}\n`);
      console.log("All fields:");
      console.log(JSON.stringify(selectedVisitor, null, 2));
    } else {
      console.log("No visitors found");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

examineVisitorData();
