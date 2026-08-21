import React, { createContext, useContext, useState, useEffect } from "react";

// -----------------------------------------------------------------
// Mock auth — persists to localStorage so a refresh keeps you logged in.
// Swap the three functions below for real calls once the backend exists:
//   signup() -> POST /api/auth/signup  { name, email, password }
//   login()  -> POST /api/auth/login   { email, password } -> { token, user }
//   logout() -> just clears the token client-side (no API call needed)
//
// Once real, store the JWT (not the whole user object) and attach it as
// `Authorization: Bearer <token>` on every request to the IoT/ML APIs so
// each user only sees their own fields/readings.
// -----------------------------------------------------------------

const AuthContext = createContext(null);
const STORAGE_KEY = "rootwise_session";
const USERS_KEY = "rootwise_mock_users"; // mock "database" of signed-up users

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  function signup({ name, email, password }) {
    const users = readUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with that email already exists.");
    }
    // NOTE: storing plaintext password client-side is only OK because this
    // is a local mock. Never do this against a real backend — passwords
    // should never leave the browser except over HTTPS straight into a
    // proper hashing flow server-side.
    const newUser = { id: crypto.randomUUID(), name, email, password };
    writeUsers([...users, newUser]);
    const session = { id: newUser.id, name, email };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(session);
    return session;
  }

  function login({ email, password }) {
    const users = readUsers();
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) {
      throw new Error("Invalid email or password.");
    }
    const session = { id: found.id, name: found.name, email: found.email };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(session);
    return session;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
