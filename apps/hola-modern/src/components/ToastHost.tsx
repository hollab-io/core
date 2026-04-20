import { useEffect, useState } from "react";

type Toast = {
    id: number;
    message: string;
};

type Listener = (toast: Toast) => void;

const listeners = new Set<Listener>();
let nextId = 1;

export function showToast(message: string): void {
    const toast: Toast = { id: nextId++, message };
    for (const listener of listeners) {
        listener(toast);
    }
}

const TOAST_DURATION_MS = 2600;

export default function ToastHost() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        const listener: Listener = (toast) => {
            setToasts((current) => [...current, toast]);
            window.setTimeout(() => {
                setToasts((current) => current.filter((entry) => entry.id !== toast.id));
            }, TOAST_DURATION_MS);
        };
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);

    if (toasts.length === 0) {
        return null;
    }

    return (
        <div
            aria-live="polite"
            className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4"
        >
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className="pointer-events-auto rounded-2xl border border-slate-200 bg-white/95 px-4 py-2.5 text-sm font-medium text-slate-800 shadow-lg backdrop-blur"
                >
                    {toast.message}
                </div>
            ))}
        </div>
    );
}
