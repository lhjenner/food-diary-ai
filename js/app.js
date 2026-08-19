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