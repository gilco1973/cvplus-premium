// Firebase Configuration for CVPlus Analytics
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
const app = initializeApp();

// Export Firestore database instance
export const db = getFirestore(app);

export { app };