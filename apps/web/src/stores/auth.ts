import { create } from "zustand";

interface AuthState {
  token: string | null;
  admin: { id: string; email: string; name: string; role: string } | null;
  setAuth: (token: string, admin: AuthState["admin"]) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem("token"),
  admin: null,
  setAuth: (token, admin) => {
    localStorage.setItem("token", token);
    set({ token, admin });
  },
  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, admin: null });
  },
  isAuthenticated: () => !!get().token,
}));
