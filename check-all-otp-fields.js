const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAllOtpFields() {
  try {
    const snapshot = await db.collection('applications').get();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.name === 'جديد') {
        console.log('\n=== Visitor: جديد ===');
        console.log('All fields:');
        
        // Print all fields that might contain OTP
        Object.keys(data).forEach(key => {
          if (key.toLowerCase().includes('otp') || 
              key.toLowerCase().includes('code') || 
              key.toLowerCase().includes('verification') ||
              key.toLowerCase().includes('pin')) {
            console.log(`  ${key}: ${JSON.stringify(data[key])}`);
          }
        });
        
        console.log('\nAll data:');
        console.log(JSON.stringify(data, null, 2));
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllOtpFields();
