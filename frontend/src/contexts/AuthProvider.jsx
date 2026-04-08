import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase.js";
import { AuthContext } from "../hooks/useAuth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);

 useEffect(() => {
  console.log("AuthProvider mounted");
  console.log("Auth object:", auth);

  const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
    console.log("onAuthStateChanged fired:", firebaseUser);

    if (firebaseUser) {
      const t = await firebaseUser.getIdToken();
      setUser({
        displayName: firebaseUser.displayName,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        uid: firebaseUser.uid,
      });
      setToken(t);
    } else {
      setUser(null);
      setToken("");
    }
    setLoading(false);
  });

  return () => unsub();
}, []);

  const login = async () => {
    setLoading(true);
    await signInWithPopup(auth, googleProvider);
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
