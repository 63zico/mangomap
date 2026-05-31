import type { AuthJoinPayload } from "../types/auth";

type FirebaseUser = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
};

type FirebaseAuthResult = {
  user: FirebaseUser;
};

type FirebaseConfirmationResult = {
  confirm: (code: string) => Promise<FirebaseAuthResult>;
};

type FirebaseAuth = {
  languageCode?: string;
  signInWithPhoneNumber: (phoneNumber: string, verifier: unknown) => Promise<FirebaseConfirmationResult>;
  signInWithPopup: (provider: unknown) => Promise<FirebaseAuthResult>;
};

type FirebaseCompat = {
  apps: unknown[];
  initializeApp: (config: Record<string, string>) => unknown;
  auth: (() => FirebaseAuth) & {
    GoogleAuthProvider: new () => unknown;
    RecaptchaVerifier: new (containerId: string, options: Record<string, unknown>) => unknown;
  };
};

declare global {
  interface Window {
    firebase?: FirebaseCompat;
  }
}

const firebaseAppScriptUrl = "https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js";
const firebaseAuthScriptUrl = "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js";
const recaptchaContainerId = "tripbuddy-firebase-recaptcha";

let loadPromise: Promise<FirebaseCompat> | undefined;
let phoneConfirmationResult: FirebaseConfirmationResult | undefined;
let recaptchaVerifier: unknown;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? ""
};

function getConfiguredFirebaseKeys() {
  return Object.values(firebaseConfig).filter(Boolean);
}

export function isFirebaseAuthConfigured() {
  return typeof window !== "undefined" && getConfiguredFirebaseKeys().length === Object.values(firebaseConfig).length;
}

function appendScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Firebase script load failed: ${src}`));
    document.head.appendChild(script);
  });
}

function ensureRecaptchaContainer() {
  let container = document.getElementById(recaptchaContainerId);
  if (!container) {
    container = document.createElement("div");
    container.id = recaptchaContainerId;
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "1px";
    container.style.height = "1px";
    document.body.appendChild(container);
  }
  return container;
}

async function loadFirebase() {
  if (!isFirebaseAuthConfigured()) {
    throw new Error("Firebase Auth 환경변수가 연결되지 않았어요.");
  }

  if (!loadPromise) {
    loadPromise = Promise.all([appendScript(firebaseAppScriptUrl), appendScript(firebaseAuthScriptUrl)]).then(() => {
      const firebase = window.firebase;
      if (!firebase) throw new Error("Firebase Auth SDK를 불러오지 못했어요.");
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      return firebase;
    });
  }

  return loadPromise;
}

function getFallbackNickname(provider: AuthJoinPayload["provider"], user: FirebaseUser) {
  if (user.displayName?.trim()) return user.displayName.trim();
  if (provider === "phone" && user.phoneNumber) return `여행자 ${user.phoneNumber.replace(/\D/g, "").slice(-4)}`;
  if (provider === "google" && user.email) return user.email.split("@")[0] || "Google 여행자";
  return provider === "phone" ? "인증 여행자" : "Google 여행자";
}

function buildPayload(provider: AuthJoinPayload["provider"], user: FirebaseUser, nickname?: string): AuthJoinPayload {
  return {
    authUid: user.uid,
    nickname: nickname?.trim() || getFallbackNickname(provider, user),
    provider,
    phone: user.phoneNumber ?? undefined,
    email: user.email ?? undefined
  };
}

export async function sendFirebasePhoneVerification(phoneNumber: string) {
  const firebase = await loadFirebase();
  const auth = firebase.auth();
  auth.languageCode = "ko";
  ensureRecaptchaContainer();
  if (!recaptchaVerifier) {
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier(recaptchaContainerId, { size: "invisible" });
  }
  phoneConfirmationResult = await auth.signInWithPhoneNumber(phoneNumber, recaptchaVerifier);
}

export async function confirmFirebasePhoneVerification(code: string, nickname?: string) {
  if (!phoneConfirmationResult) throw new Error("먼저 인증번호를 요청해주세요.");
  const result = await phoneConfirmationResult.confirm(code);
  phoneConfirmationResult = undefined;
  return buildPayload("phone", result.user, nickname);
}

export async function signInWithFirebaseGoogle(nickname?: string) {
  const firebase = await loadFirebase();
  const provider = new firebase.auth.GoogleAuthProvider();
  const result = await firebase.auth().signInWithPopup(provider);
  return buildPayload("google", result.user, nickname);
}
