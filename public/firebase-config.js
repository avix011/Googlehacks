// ============================================================
// Firebase Realtime Database Configuration
// Firebase Modular SDK (v9+)
// ============================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
    getDatabase, 
    ref, 
    push, 
    onValue, 
    remove, 
    update 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js';

/**
 * IMPORTANT: Replace these values with your Firebase project credentials
 * Get these from: Firebase Console > Project Settings > General
 * 
 * DO NOT commit this file with real credentials to public repositories!
 * For production, use environment variables or Firebase emulator
 */
const firebaseConfig = {
    apiKey: 'AIzaSyBU_u7Fh_6nGxCos0R4Zzzi1nQyhfPBkzw',
    authDomain: 'project02-c2b17.firebaseapp.com',
    projectId: 'project02-c2b17',
    storageBucket: 'project02-c2b17.firebasestorage.app',
    messagingSenderId: '5980425089',
   databaseURL: 'https://project02-c2b17-default-rtdb.asia-southeast1.firebasedatabase.app',
    appId: '1:5980425089:web:2ca6d233105091a0f3b680'
};

/**
 * Initialize Firebase Application
 */
let app;
let database;
let isFirebaseEnabled = false;

try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    isFirebaseEnabled = true;
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.warn('⚠️ Firebase initialization failed. Using localStorage only.', error.message);
    isFirebaseEnabled = false;
}

/**
 * Export Firebase utilities for use in app.js
 */
export {
    database,
    ref,
    push,
    onValue,
    remove,
    update,
    isFirebaseEnabled
};

/**
 * Helper function to write data to Firebase
 * Falls back to localStorage if Firebase is unavailable
 * 
 * @param {string} path - Firebase database path (e.g., 'surveys', 'volunteers')
 * @param {object} data - Data object to write
 * @returns {Promise<string|null>} - Returns the pushed key or null
 */
export async function writeToFirebase(path, data) {
    if (!isFirebaseEnabled || !database) {
        console.warn('Firebase not available, using localStorage fallback');
        return null;
    }

    try {
        const dbRef = ref(database, path);
        const result = await push(dbRef, {
            ...data,
            timestamp: new Date().toISOString()
        });
        console.log('✅ Data written to Firebase:', result.key);
        return result.key;
    } catch (error) {
        console.error('❌ Error writing to Firebase:', error);
        throw error;
    }
}

/**
 * Helper function to read real-time data from Firebase
 * 
 * @param {string} path - Firebase database path
 * @param {function} callback - Callback function to handle data updates
 * @returns {function} - Unsubscribe function to stop listening
 */
export function readFromFirebase(path, callback) {
    if (!isFirebaseEnabled || !database) {
        console.warn('Firebase not available');
        return () => {};
    }

    try {
        const dbRef = ref(database, path);
        const unsubscribe = onValue(dbRef, (snapshot) => {
            const data = snapshot.val();
            callback(data);
        }, (error) => {
            console.error('❌ Error reading from Firebase:', error);
        });

        return unsubscribe;
    } catch (error) {
        console.error('❌ Error setting up Firebase listener:', error);
        return () => {};
    }
}

/**
 * Helper function to delete data from Firebase
 * 
 * @param {string} path - Firebase database path to delete
 * @returns {Promise<void>}
 */
export async function deleteFromFirebase(path) {
    if (!isFirebaseEnabled || !database) {
        console.warn('Firebase not available');
        return;
    }

    try {
        const dbRef = ref(database, path);
        await remove(dbRef);
        console.log('✅ Data deleted from Firebase');
    } catch (error) {
        console.error('❌ Error deleting from Firebase:', error);
        throw error;
    }
}

/**
 * Helper function to update data in Firebase
 * 
 * @param {string} path - Firebase database path
 * @param {object} updates - Object with fields to update
 * @returns {Promise<void>}
 */
export async function updateFirebase(path, updates) {
    if (!isFirebaseEnabled || !database) {
        console.warn('Firebase not available');
        return;
    }

    try {
        const dbRef = ref(database, path);
        await update(dbRef, updates);
        console.log('✅ Data updated in Firebase');
    } catch (error) {
        console.error('❌ Error updating Firebase:', error);
        throw error;
    }
}

/**
 * Check if Firebase is properly configured
 * Returns false if credentials still have placeholder YOUR_* format
 */
export function isFirebaseConfigured() {
    if (!isFirebaseEnabled) return false;
    
    // Check for actual placeholder patterns (YOUR_*)
    const hasRealPlaceholder = 
        firebaseConfig.apiKey.includes('YOUR_') ||
        firebaseConfig.projectId.includes('YOUR_') ||
        firebaseConfig.apiKey === '' ||
        firebaseConfig.projectId === '';
    
    if (hasRealPlaceholder) {
        console.warn('⚠️ Firebase credentials not configured. Please update firebase-config.js with real credentials');
        return false;
    }
    
    console.log('✅ Firebase is properly configured and ready to sync data');
    return true;
}

export default {
    database,
    ref,
    push,
    onValue,
    remove,
    update,
    isFirebaseEnabled,
    writeToFirebase,
    readFromFirebase,
    deleteFromFirebase,
    updateFirebase,
    isFirebaseConfigured
};
