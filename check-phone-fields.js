const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

async function checkPhoneFields() {
  try {
    // Get visitor "جديد" (ID: 2129565921)
    const snapshot = await db.collection('applications')
      .where('identityNumber', '==', '2129565921')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      console.log('Visitor not found');
      return;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    console.log('\n=== Visitor Data ===');
    console.log('ID:', doc.id);
    console.log('Name:', data.ownerName);
    console.log('\n=== Phone Fields ===');
    console.log('phoneNumber:', data.phoneNumber);
    console.log('phoneCarrier:', data.phoneCarrier);
    console.log('phoneVerificationCode:', data.phoneVerificationCode);
    console.log('phoneOtpStatus:', data.phoneOtpStatus);
    
    console.log('\n=== All Fields ===');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkPhoneFields();
