import {
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { auth, googleProvider } from "./firestore.js";

const signedOutView = document.querySelector("#signed-out-view");
const signedInView = document.querySelector("#signed-in-view");
const signInButton = document.querySelector("#sign-in-button");
const signOutButton = document.querySelector("#sign-out-button");
const signedInAs = document.querySelector("#signed-in-as");
const statusMessage = document.querySelector("#status-message");
const appTitle = document.querySelector("#app-title");
const datePicker = document.querySelector("#date-picker");
const weightInput = document.querySelector("#weight-input");
const clearWeightButton = document.querySelector("#clear-weight-button");
const currentAverage = document.querySelector("#current-average");
const previousAverage = document.querySelector("#previous-average");
const calorieTotal = document.querySelector("#calorie-total");
const mealList = document.querySelector("#meal-list");
const emptyState = document.querySelector("#empty-state");
const copyButton = document.querySelector("#copy-button");
const includeCaloriesToggle = document.querySelector("#include-calories-toggle");
const addEntryButton = document.querySelector("#add-entry-button");

const state = {
  currentDate: getTodayDate(),
  days: {}
};

function getTodayDate() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getDateOffset(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDay(dateString) {
  if (!state.days[dateString]) {
    state.days[dateString] = { meals: [] };
  }

  return state.days[dateString];
}

function getRollingAverage(endDateString) {
  const weights = [];

  for (let offset = 0; offset > -7; offset -= 1) {
    const weight = state.days[getDateOffset(endDateString, offset)]?.weight;
    if (Number.isFinite(weight)) {
      weights.push(weight);
    }
  }

  if (!weights.length) {
    return null;
  }

  return weights.reduce((sum, weight) => sum + weight, 0) / weights.length;
}

function formatAverage(value) {
  return value === null ? "--" : `${value.toFixed(1)} lb`;
}

function formatDateHeading(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(date);
}

function getCalories(meals) {
  return meals.reduce((total, meal) => (
    total + meal.rows.reduce((mealTotal, row) => mealTotal + (Number(row.calories) || 0), 0)
  ), 0);
}

function renderMeals(meals) {
  mealList.replaceChildren();
  emptyState.hidden = meals.length > 0;

  meals.forEach((meal, index) => {
    const card = document.createElement("article");
    const heading = document.createElement("h3");
    const time = document.createElement("p");
    const rows = document.createElement("ul");

    card.className = "meal-card";
    heading.textContent = `Meal ${index + 1}`;
    time.className = "meal-time";
    time.textContent = meal.time || "Time not set";
    rows.className = "meal-rows";

    meal.rows.forEach((row) => {
      const item = document.createElement("li");
      const calories = Number.isFinite(Number(row.calories)) ? ` ${row.calories} cal` : "";
      item.textContent = `${row.item}${calories}`;
      rows.append(item);
    });

    card.append(heading, time, rows);
    mealList.append(card);
  });
}

function renderDay() {
  const day = getDay(state.currentDate);
  const currentWeight = Number.isFinite(day.weight) ? day.weight : "";
  const meals = day.meals;

  datePicker.value = state.currentDate;
  appTitle.textContent = state.currentDate === getTodayDate() ? "Today" : formatDateHeading(state.currentDate);
  weightInput.value = currentWeight;
  clearWeightButton.hidden = currentWeight === "";
  currentAverage.textContent = formatAverage(getRollingAverage(state.currentDate));
  previousAverage.textContent = formatAverage(getRollingAverage(getDateOffset(state.currentDate, -1)));
  calorieTotal.textContent = getCalories(meals).toLocaleString();
  copyButton.disabled = meals.length === 0;
  renderMeals(meals);
}

function setStatus(message = "") {
  statusMessage.textContent = message;
  statusMessage.hidden = !message;
}

function setSigningIn(isSigningIn) {
  signInButton.disabled = isSigningIn;
  signInButton.textContent = isSigningIn ? "Signing in..." : "Continue with Google";
}

onAuthStateChanged(auth, (user) => {
  const isSignedIn = Boolean(user);
  signedOutView.hidden = isSignedIn;
  signedInView.hidden = !isSignedIn;
  signedInAs.textContent = user?.email ?? "";
  setSigningIn(false);
  setStatus();

  if (user) {
    renderDay();
  }
});

signInButton.addEventListener("click", async () => {
  setStatus();
  setSigningIn(true);

  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Google sign-in failed.", error);
    setStatus("Google sign-in could not be completed. Please try again.");
    setSigningIn(false);
  }
});

signOutButton.addEventListener("click", async () => {
  setStatus();

  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-out failed.", error);
    setStatus("Sign-out could not be completed. Please try again.");
  }
});

datePicker.addEventListener("change", () => {
  state.currentDate = datePicker.value || getTodayDate();
  renderDay();
});

weightInput.addEventListener("change", () => {
  const value = Number(weightInput.value);
  const day = getDay(state.currentDate);

  if (weightInput.value === "" || !Number.isFinite(value) || value <= 0) {
    delete day.weight;
  } else {
    day.weight = value;
  }

  renderDay();
});

clearWeightButton.addEventListener("click", () => {
  delete getDay(state.currentDate).weight;
  renderDay();
  weightInput.focus();
});

copyButton.addEventListener("click", () => {
  setStatus("Copying entries is available once entry creation is added.");
});

includeCaloriesToggle.addEventListener("change", () => {
  setStatus("Your calorie preference will sync when saved settings are added.");
});

addEntryButton.addEventListener("click", () => {
  setStatus("Entry creation is the next step in the diary.");
});