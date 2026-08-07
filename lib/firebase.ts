import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyCerXqJkAvH4JkXkD0Ut09TZyrHCe2kJHs",
  authDomain: "swiftmove-l.firebaseapp.com",
  databaseURL: "https://swiftmove-l-default-rtdb.firebaseio.com",
  projectId: "swiftmove-l",
  storageBucket: "swiftmove-l.firebasestorage.app",
  messagingSenderId: "742722534350",
  appId: "1:742722534350:web:b0c756c2d8a62d592dc99f",
  measurementId: "G-SLYG76EH08"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app);

export { auth, db, database };
