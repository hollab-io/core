import { Minus } from 'lucide-react';

type OkrCardProps = {
  title: string;
  subtitle: string;
  krs: number;
  progress: number;
};

function OKRCard({ title, subtitle, krs, progress }: OkrCardProps) {
  return (
    <div className="relative z-10 flex h-[120px] w-72 flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:w-80">
      <div>
        <h4 className="text-sm font-semibold leading-snug text-slate-800">{title}</h4>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
          <span className="text-xs font-medium text-slate-600">{krs} KRs</span>
        </div>
        <div className="flex w-24 items-center gap-2">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label={`${title} progress`}
          >
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-bold text-blue-600">{progress}%</span>
        </div>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="relative flex h-[2px] w-8 items-center justify-center bg-blue-200" aria-hidden="true">
      <div className="absolute z-20 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-500 text-white shadow-sm">
        <Minus size={12} strokeWidth={3} aria-hidden="true" />
      </div>
    </div>
  );
}

export default function OKRsTree() {
  return (
    <section className="flex h-full w-full select-none overflow-auto p-4 sm:p-10">
      <div className="mx-auto flex h-full min-w-max items-center gap-0">
        <div className="relative flex flex-col gap-24">
          <div className="relative flex items-center">
            <OKRCard
              title="Build a great corporate culture (delight our employees)"
              subtitle="in Employee Experience"
              krs={2}
              progress={57}
            />
            <Connector />
          </div>

          <div className="relative flex items-center">
            <OKRCard title="Make a great product" subtitle="in Product" krs={1} progress={29} />
            <Connector />
          </div>

          <div className="relative flex items-center">
            <OKRCard
              title="Provide the best Customer Service"
              subtitle="in Customer Services"
              krs={3}
              progress={57}
            />
            <Connector />
          </div>

          <div className="absolute right-0 top-[60px] bottom-[60px] -z-10 w-[2px] translate-x-[32px] bg-blue-200" />
        </div>

        <div className="relative flex flex-col gap-8 pl-10 sm:pl-16">
          <OKRCard
            title="Define and promote company culture and values"
            subtitle="Human Resources in Employee Exp..."
            krs={3}
            progress={83}
          />
          <div className="h-10" />
          <OKRCard
            title="Improve internal employee engagement and job..."
            subtitle="Happiness Officer in Employee Exp..."
            krs={3}
            progress={60}
          />

          <div className="h-20" />

          <div className="relative flex items-center">
            <OKRCard
              title="Implement new 360-degree product planning process"
              subtitle="in Product"
              krs={4}
              progress={47}
            />
            <Connector />
          </div>
          <OKRCard
            title="Successfully launch version 3 of our main product"
            subtitle="in Product"
            krs={4}
            progress={59}
          />

          <div className="h-20" />

          <OKRCard
            title="Research and improve customer satisfaction"
            subtitle="Customer Happiness Officer in Cus..."
            krs={3}
            progress={57}
          />

          <div className="absolute left-[32px] top-[40px] bottom-[140px] -z-10 w-[2px] border-l-2 border-dashed border-blue-200 bg-transparent" />
        </div>

        <div className="flex flex-col pl-10 pt-[18rem] sm:pl-16">
          <OKRCard
            title="Activate user testing of our product"
            subtitle="in Product"
            krs={2}
            progress={35}
          />
        </div>
      </div>
    </section>
  );
}
