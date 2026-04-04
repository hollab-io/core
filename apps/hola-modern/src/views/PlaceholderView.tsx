import { Clock3 } from "lucide-react";

type PlaceholderViewProps = {
    title: string;
    description: string;
};

export default function PlaceholderView({ title, description }: PlaceholderViewProps) {
    return (
        <section className="flex h-full items-center justify-center py-8">
            <div className="w-full max-w-md rounded-[1.75rem]
                border border-slate-200/70 dark:border-white/[0.07]
                bg-white dark:bg-[#0e0e12]
                p-10 shadow-sm">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl
                    bg-[#3481FF]/[0.1] dark:bg-[#3481FF]/[0.15] text-[#3481FF]">
                    <Clock3 size={20} strokeWidth={1.75} aria-hidden="true" />
                </div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3481FF]">
                    Coming soon
                </p>
                <h2 className="text-[20px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white">
                    {title}
                </h2>
                <p className="mt-2.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-500">
                    {description}
                </p>
            </div>
        </section>
    );
}
