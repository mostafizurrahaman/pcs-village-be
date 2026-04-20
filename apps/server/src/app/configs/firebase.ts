import admin from 'firebase-admin'
import configs from '.'

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: configs.firebase.projectId,
    clientEmail: configs.firebase.clientEmail,
    privateKey: configs.firebase.privateKey?.replace(/\\n/g, '\n'),
  }),
})

export const firebaseAdmin = admin
