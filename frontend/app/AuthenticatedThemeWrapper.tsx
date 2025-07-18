// frontend/app/AuthenticatedThemeWrapper.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ThemeProvider } from "@/context/ThemeContext";

export default function AuthenticatedThemeWrapper({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      setChecking(false);
    };

    check();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  if (checking) return null; // Or return a loading spinner if you want

  return isLoggedIn ? (
    <ThemeProvider>{children}</ThemeProvider>
  ) : (
    <>{children}</>
  );
}
