import { Clock3 } from 'lucide-react';

type PlaceholderViewProps = {
  title: string;
  description: string;
};

export default function PlaceholderView({
  title,
  description,
}: PlaceholderViewProps) {
  return (
    <section className="mx-auto flex h-full max-w-3xl items-center justify-center py-8">
      <div className="glass-panel w-full border-slate-200/80 p-8 sm:p-10">
        <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-primary">
          <Clock3 size={22} aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-textMain">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-textMuted sm:text-base">
          {description}
        </p>
        <p className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          This section is now explicitly marked as coming soon instead of falling
          back to the organization chart.
        </p>
      </div>
    </section>
  );
}
