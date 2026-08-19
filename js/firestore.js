import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
	collection,
	deleteDoc,
	doc,
	documentId,
	getDoc,
	getDocs,
	getFirestore,
	orderBy,
	query,
	setDoc,
	where
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

function getDayReference(uid, dateString) {
	return doc(db, "users", uid, "days", dateString);
}

function getSettingsReference(uid) {
	return doc(db, "users", uid, "meta", "settings");
}

export async function getDay(uid, dateString) {
	const snapshot = await getDoc(getDayReference(uid, dateString));
	return snapshot.exists() ? snapshot.data() : { meals: [] };
}

export async function saveDay(uid, dateString, dayData) {
	const meals = dayData.meals ?? [];
	const hasWeight = Number.isFinite(dayData.weight);
	const dayReference = getDayReference(uid, dateString);

	if (!hasWeight && !meals.length) {
		await deleteDoc(dayReference);
		return;
	}

	const data = { meals };
	if (hasWeight) {
		data.weight = dayData.weight;
	}

	await setDoc(dayReference, data);
}

export async function getWeightsForDateRange(uid, startDateString, endDateString) {
	const daysReference = collection(db, "users", uid, "days");
	const daysQuery = query(
		daysReference,
		where(documentId(), ">=", startDateString),
		where(documentId(), "<=", endDateString),
		orderBy(documentId())
	);
	const snapshot = await getDocs(daysQuery);
	const weights = {};

	snapshot.forEach((day) => {
		const weight = day.data().weight;
		if (Number.isFinite(weight)) {
			weights[day.id] = weight;
		}
	});

	return weights;
}

export async function getDaysForDateRange(uid, startDateString, endDateString) {
	const daysReference = collection(db, "users", uid, "days");
	const daysQuery = query(
		daysReference,
		where(documentId(), ">=", startDateString),
		where(documentId(), "<=", endDateString),
		orderBy(documentId())
	);
	const snapshot = await getDocs(daysQuery);

	return snapshot.docs.map((day) => ({
		date: day.id,
		...day.data()
	}));
}

export async function getSettings(uid) {
	const snapshot = await getDoc(getSettingsReference(uid));
	return snapshot.exists() ? snapshot.data() : {};
}

export async function saveSettings(uid, settings) {
	await setDoc(getSettingsReference(uid), settings, { merge: true });
}