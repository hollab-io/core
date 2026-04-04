import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { ShieldAlert } from "lucide-react";

const dynamicEnvironmentId = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID;

export default function DynamicAuthControl() {
    if (!dynamicEnvironmentId) {
        return (
            <div className="hidden items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 lg:flex dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
                <ShieldAlert size={16} aria-hidden="true" />
                <div className="text-left">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em]">
                        Dynamic not configured
                    </div>
                    <div className="text-xs opacity-80">
                        Add `VITE_DYNAMIC_ENVIRONMENT_ID` to enable wallet auth.
                    </div>
                </div>
            </div>
        );
    }

    return <DynamicWidget />;
}
