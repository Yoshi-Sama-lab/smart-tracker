import { createContext, useContext } from "react";

export const AuthContext = createContext({
  user: null,
  token: "",
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}