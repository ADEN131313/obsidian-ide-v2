import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: number;
  email: string;
  name: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: true,
      setUser: (user, token) => set({ user, token, isLoading: false }),
      logout: () => set({ user: null, token: null }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "obsidian-auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
