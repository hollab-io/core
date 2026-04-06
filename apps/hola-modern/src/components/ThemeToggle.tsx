import { Moon, Sun } from "lucide-react";

import { useTheme } from "../context/ThemeContext";

const SPRING = "cubic-bezier(0.32,0.72,0,1)";

export default function ThemeToggle() {
    const { isDark, toggle } = useTheme();

    return (
        <button
            type="button"
            onClick={toggle}
            className="group flex h-8 w-8 items-center justify-center rounded-full
                bg-slate-100/80 dark:bg-white/[0.05]
                ring-1 ring-slate-200/70 dark:ring-white/[0.06]
                text-slate-500 dark:text-slate-500
                transition-all duration-500
                hover:text-slate-800 dark:hover:text-slate-200
                hover:ring-slate-300 dark:hover:ring-white/[0.12]
                active:scale-[0.92]"
            style={{ transitionTimingFunction: SPRING }}
            aria-label="Toggle dark mode"
        >
            {isDark ? (
                <Sun
                    size={14}
                    strokeWidth={1.75}
                    className="transition-transform duration-300 group-hover:rotate-[20deg]"
                />
            ) : (
                <Moon
                    size={14}
                    strokeWidth={1.75}
                    className="transition-transform duration-300 group-hover:-rotate-[12deg]"
                />
            )}
        </button>
    );
}
