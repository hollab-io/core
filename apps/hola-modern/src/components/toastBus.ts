export type Toast = {
    id: number;
    message: string;
};

export type ToastListener = (toast: Toast) => void;

const listeners = new Set<ToastListener>();
let nextId = 1;

export function subscribeToast(listener: ToastListener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function showToast(message: string): void {
    const toast: Toast = { id: nextId++, message };
    for (const listener of listeners) {
        listener(toast);
    }
}
