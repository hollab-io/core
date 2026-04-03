import { MoreHorizontal } from 'lucide-react';

type ProjectCard = {
  id: number;
  title: string;
  color: string;
  subtitle?: string;
  user?: string;
};

type ProjectColumn = {
  id: string;
  title: string;
  projects: ProjectCard[];
};

const COLUMNS: ProjectColumn[] = [
  { id: 'future', title: 'Future', projects: [] },
  {
    id: 'waiting',
    title: 'Waiting',
    projects: [
      {
        id: 1,
        title: 'Presentation Marketing Board',
        user: 'Felix',
        color: 'bg-yellow-400',
      },
    ],
  },
  {
    id: 'current',
    title: 'Current',
    projects: [
      {
        id: 2,
        title: 'Marketing Strategy',
        subtitle: 'OKR Champion',
        color: 'bg-orange-500',
      },
    ],
  },
  { id: 'top', title: '🔥 Top Priority Projects', projects: [] },
  {
    id: 'done',
    title: 'Done',
    projects: [
      {
        id: 3,
        title: 'OKR Team Workshop',
        user: 'Alice',
        color: 'bg-orange-500',
      },
    ],
  },
];

export default function ProjectsBoard() {
  return (
    <div className="flex h-full flex-col pt-4">
      <div className="mb-6 flex gap-4 px-2">
        <button
          type="button"
          className="rounded-lg border border-primary bg-primary/5 px-4 py-1.5 font-medium text-primary"
        >
          Employee Experience
        </button>
      </div>

      <div className="custom-scrollbar flex-1 overflow-x-auto pb-4">
        <div className="flex h-full min-w-max gap-6 px-2">
          {COLUMNS.map((column) => (
            <section
              key={column.id}
              aria-labelledby={`project-column-${column.id}`}
              className="flex h-full w-[280px] flex-col rounded-2xl border border-slate-200 bg-slate-100/50 p-4 shadow-sm md:w-[300px]"
            >
              <div className="mb-4 flex items-center justify-between px-2">
                <h3
                  id={`project-column-${column.id}`}
                  className="font-semibold text-slate-700"
                >
                  {column.title}
                </h3>
                <button
                  type="button"
                  aria-label={`Open actions for ${column.title}`}
                  className="text-slate-400 transition-colors hover:text-slate-600"
                >
                  <MoreHorizontal size={20} aria-hidden="true" />
                </button>
              </div>

              <div className="custom-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto">
                {column.projects.map((project) => (
                  <article
                    key={project.id}
                    className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className={`mb-3 h-1.5 w-12 rounded-full ${project.color}`} />
                    <h4 className="mb-1 font-medium leading-snug text-slate-800 transition-colors group-hover:text-primary">
                      {project.title}
                    </h4>
                    {project.subtitle && (
                      <p className="text-sm text-slate-500">{project.subtitle}</p>
                    )}
                    {project.user && (
                      <div className="mt-4 flex items-center justify-between">
                        <div className="h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${project.user}`}
                            alt={`Avatar for ${project.user}`}
                            loading="lazy"
                          />
                        </div>
                      </div>
                    )}
                  </article>
                ))}

                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-center rounded-xl border border-dashed border-transparent py-3 text-slate-400 transition-all hover:border-slate-200 hover:bg-white hover:text-primary"
                >
                  + Add Project
                </button>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
