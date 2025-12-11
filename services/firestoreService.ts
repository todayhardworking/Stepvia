import {
    collection,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    getDoc
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Goal, UserPreferences, AIPersona } from "../types";

// User Preferences Collection
const USERS_COLLECTION = "users";
const GOALS_COLLECTION = "goals";

// --- Preferences ---

export const getUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
    try {
        const docRef = doc(db, USERS_COLLECTION, userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as UserPreferences;
        } else {
            return null;
        }
    } catch (e) {
        console.error("Error fetching preferences:", e);
        return null;
    }
};

export const updateUserPreferences = async (userId: string, prefs: Partial<UserPreferences>) => {
    try {
        const docRef = doc(db, USERS_COLLECTION, userId);
        // We use setDoc with merge: true to creating the document if it doesn't exist
        await setDoc(docRef, prefs, { merge: true });
    } catch (e) {
        console.error("Error updating preferences:", e);
        throw e;
    }
};

// --- Goals ---

export const subscribeToGoals = (userId: string, callback: (goals: Goal[]) => void) => {
    const q = query(
        collection(db, USERS_COLLECTION, userId, GOALS_COLLECTION)
    );

    return onSnapshot(q, (querySnapshot) => {
        const goals: Goal[] = [];
        querySnapshot.forEach((doc) => {
            // We store the ID inside the document data for easier usage, 
            // but also ensure we capture the firestore ID if it differs (usually we set them to be same or auto-generated)
            goals.push({ ...doc.data(), id: doc.id } as Goal);
        });
        // Sort by creation date descending (newest first)
        goals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(goals);
    });
};

export const addGoal = async (userId: string, goal: Goal) => {
    try {
        // We can use the goal.id as the document ID if we generated one, or let Firestore generate it
        // Since our app generates IDs for steps/goals already, let's use setDoc with the existing ID 
        // to keep IDs consistent across the object and the document path.
        const docRef = doc(db, USERS_COLLECTION, userId, GOALS_COLLECTION, goal.id);
        await setDoc(docRef, goal);
    } catch (e) {
        console.error("Error adding goal:", e);
        throw e;
    }
};

export const updateGoal = async (userId: string, goal: Goal) => {
    try {
        const docRef = doc(db, USERS_COLLECTION, userId, GOALS_COLLECTION, goal.id);
        await setDoc(docRef, goal); // Overwrite the goal data
    } catch (e) {
        console.error("Error updating goal:", e);
        throw e;
    }
};

export const deleteGoal = async (userId: string, goalId: string) => {
    try {
        const docRef = doc(db, USERS_COLLECTION, userId, GOALS_COLLECTION, goalId);
        await deleteDoc(docRef);
    } catch (e) {
        console.error("Error deleting goal:", e);
        throw e;
    }
};
