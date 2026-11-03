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
	limit,
	orderBy,
	query,
	setDoc,
	startAfter,
	where
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const firebaseConfigResponse = await fetch("/__/firebase/init.json");
if (!firebaseConfigResponse.ok) {
	throw new Error("Firebase Hosting configuration could not be loaded.");
}

const app = initializeApp(await firebaseConfigResponse.json());

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
	const meals = (dayData.meals ?? []).map((meal) => ({
		time: meal.time ?? "",
		rows: (meal.rows ?? []).map((row) => {
			const savedRow = { item: row.item };
			if (Number.isFinite(row.calories)) {
				savedRow.calories = row.calories;
			}
			return savedRow;
		})
	}));
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

export async function getLatestWeights(uid, endDateString, count) {
	const daysReference = collection(db, "users", uid, "days");
	const weights = {};
	const pageSize = 25;
	let cursor;
	let weightCount = 0;

	while (weightCount < count) {
		const constraints = [
			where(documentId(), "<=", endDateString),
			orderBy(documentId(), "desc"),
			limit(pageSize)
		];
		if (cursor) {
			constraints.push(startAfter(cursor));
		}

		const snapshot = await getDocs(query(daysReference, ...constraints));
		snapshot.forEach((day) => {
			const weight = day.data().weight;
			if (Number.isFinite(weight) && weightCount < count) {
				weights[day.id] = weight;
				weightCount += 1;
			}
		});

		if (snapshot.empty || snapshot.size < pageSize || weightCount >= count) {
			break;
		}
		cursor = snapshot.docs[snapshot.docs.length - 1];
	}

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