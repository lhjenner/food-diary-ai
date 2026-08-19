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
const entryDialog = document.querySelector("#entry-dialog");
const entryForm = document.querySelector("#entry-form");
const entryDialogTitle = document.querySelector("#entry-dialog-title");
const entryRows = document.querySelector("#entry-rows");
const addRowButton = document.querySelector("#add-row-button");
const closeEntryDialogButton = document.querySelector("#close-entry-dialog");
const cancelEntryButton = document.querySelector("#cancel-entry-button");
const entryFormError = document.querySelector("#entry-form-error");

const state = {
  currentDate: getTodayDate(),
  days: {},
  editingMealIndex: null
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
    const actions = document.createElement("div");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");

    card.className = "meal-card";
    heading.textContent = `Meal ${index + 1}`;
    time.className = "meal-time";
    time.textContent = meal.time || "Time not set";
    rows.className = "meal-rows";

    meal.rows.forEach((row) => {
      const item = document.createElement("li");
      const calories = row.calories !== undefined ? ` ${row.calories} cal` : "";
      item.textContent = `${row.item}${calories}`;
      rows.append(item);
    });

    actions.className = "meal-actions";
    editButton.className = "text-button";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => openEntryDialog(index));
    deleteButton.className = "text-button text-button-danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteMeal(index));
    actions.append(editButton, deleteButton);

    card.append(heading, time, rows, actions);
    mealList.append(card);
  });
}

function addEntryRow(row = {}, isFirstRow = false) {
  const rowElement = document.createElement("div");
  const itemLabel = document.createElement("label");
  const itemInput = document.createElement("input");
  const caloriesLabel = document.createElement("label");
  const caloriesInput = document.createElement("input");
  let removeRowButton;

  rowElement.className = "entry-row";
  itemLabel.className = "entry-field";
  itemLabel.textContent = "Item";
  itemInput.name = "item";
  itemInput.type = "text";
  itemInput.autocomplete = "off";
  itemInput.placeholder = "e.g. Oatmeal";
  itemInput.value = row.item ?? "";
  itemLabel.append(itemInput);

  caloriesLabel.className = "entry-field";
  caloriesLabel.textContent = "Calories";
  caloriesInput.name = "calories";
  caloriesInput.type = "number";
  caloriesInput.inputMode = "numeric";
  caloriesInput.min = "0";
  caloriesInput.step = "1";
  caloriesInput.placeholder = "Optional";
  caloriesInput.value = row.calories ?? "";
  caloriesLabel.append(caloriesInput);

  if (isFirstRow) {
    const timeLabel = document.createElement("label");
    const timeInput = document.createElement("input");

    rowElement.classList.add("entry-row-first");
    timeLabel.className = "entry-field";
    timeLabel.textContent = "Time";
    timeInput.name = "time";
    timeInput.type = "time";
    timeInput.value = row.time ?? "";
    timeLabel.append(timeInput);
    rowElement.append(timeLabel);
  } else {
    removeRowButton = document.createElement("button");
    removeRowButton.className = "icon-button remove-row-button";
    removeRowButton.type = "button";
    removeRowButton.setAttribute("aria-label", "Remove item");
    removeRowButton.title = "Remove item";
    removeRowButton.textContent = "-";
    removeRowButton.addEventListener("click", () => rowElement.remove());
  }

  rowElement.append(itemLabel, caloriesLabel);
  if (removeRowButton) {
    rowElement.append(removeRowButton);
  }
  entryRows.append(rowElement);
  return itemInput;
}

function setEntryFormError(message = "") {
  entryFormError.textContent = message;
  entryFormError.hidden = !message;
}

function openEntryDialog(mealIndex = null) {
  const meal = mealIndex === null ? null : getDay(state.currentDate).meals[mealIndex];

  state.editingMealIndex = mealIndex;
  entryDialogTitle.textContent = meal ? "Edit entry" : "Add entry";
  entryRows.replaceChildren();
  setEntryFormError();
  addEntryRow({ time: meal?.time, ...meal?.rows[0] }, true);

  meal?.rows.slice(1).forEach((row) => addEntryRow(row));
  entryDialog.showModal();
  entryRows.querySelector("input[name='item']").focus();
}

function closeEntryDialog() {
  entryDialog.close();
  state.editingMealIndex = null;
}

function getMealFromForm() {
  const firstRow = entryRows.firstElementChild;
  const time = firstRow.querySelector("input[name='time']").value;
  const rows = [...entryRows.querySelectorAll(".entry-row")]
    .map((row) => {
      const item = row.querySelector("input[name='item']").value.trim();
      const calorieInput = row.querySelector("input[name='calories']").value;
      const calories = calorieInput === "" ? undefined : Number(calorieInput);

      return { item, calories };
    })
    .filter((row) => row.item);

  if (!rows.length) {
    return null;
  }

  if (rows.some((row) => !Number.isFinite(row.calories) && row.calories !== undefined)) {
    return "Calories must be a valid number.";
  }

  if (rows.some((row) => row.calories !== undefined && row.calories < 0)) {
    return "Calories cannot be negative.";
  }

  return {
    time,
    rows
  };
}

function deleteMeal(mealIndex) {
  if (!window.confirm("Delete this entry?")) {
    return;
  }

  getDay(state.currentDate).meals.splice(mealIndex, 1);
  renderDay();
  setStatus("Entry deleted.");
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
  setStatus("Copying entries is available in the next phase.");
});

includeCaloriesToggle.addEventListener("change", () => {
  setStatus("Your calorie preference will sync when saved settings are added.");
});

addEntryButton.addEventListener("click", () => {
  openEntryDialog();
});

addRowButton.addEventListener("click", () => {
  addEntryRow();
  entryRows.lastElementChild.querySelector("input[name='item']").focus();
});

closeEntryDialogButton.addEventListener("click", closeEntryDialog);
cancelEntryButton.addEventListener("click", closeEntryDialog);

entryDialog.addEventListener("close", () => {
  state.editingMealIndex = null;
});

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const meal = getMealFromForm();

  if (meal === null) {
    setEntryFormError("Add at least one item before saving.");
    return;
  }

  if (typeof meal === "string") {
    setEntryFormError(meal);
    return;
  }

  const meals = getDay(state.currentDate).meals;
  if (state.editingMealIndex === null) {
    meals.push(meal);
    setStatus("Entry added.");
  } else {
    meals[state.editingMealIndex] = meal;
    setStatus("Entry updated.");
  }

  closeEntryDialog();
  renderDay();
});