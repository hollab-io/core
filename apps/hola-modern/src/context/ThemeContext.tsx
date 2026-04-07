import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "hollab:theme";

function readPersistedTheme(): Theme {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === "light" || raw === "dark") return raw;
    } catch {
        // SSR or storage unavailable
    }
    return "light";
}

type ThemeContextValue = {
    theme: Theme;
    isDark: boolean;
    toggle: () => void;
};

const ThemeCtx = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
    const [theme, setTheme] = useState<Theme>(readPersistedTheme);

    const toggle = useCallback(() => {
        setTheme((prev) => {
            const next = prev === "dark" ? "light" : "dark";
            try {
                localStorage.setItem(STORAGE_KEY, next);
            } catch {
                // ignore
            }
            return next;
        });
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        if (theme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
    }, [theme]);

    return (
        <ThemeCtx.Provider value={{ theme, isDark: theme === "dark", toggle }}>
            {children}
        </ThemeCtx.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
    const ctx = useContext(ThemeCtx);
    if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
    return ctx;
}
