/**
 * PublicRoleView — wallet-less permalink for a single role inside an org.
 *
 * Every role is a concrete, agent-readable governance object: name, purpose,
 * domains, accountabilities, leads. Sharing a role link pulls a cold viewer
 * straight into the smallest meaningful unit of org structure.
 *
 * Zero wagmi, zero useAccount. All data via indexing-client.
 */
import { isAgentAddress } from "../config/agents";
import { usePublicOrgFromIndexer } from "../hooks/usePublicOrgFromIndexer";
import { usePublicRoleFromIndexer } from "../hooks/usePublicRoleFromIndexer";

type Props = {
    orgId: string;
    roleId: string;
    onBackToOrg: () => void;
};

export default function PublicRoleView({ orgId, roleId, onBackToOrg }: Props) {
    const { data: role, isLoading, error } = usePublicRoleFromIndexer(roleId);
    const { data: org } = usePublicOrgFromIndexer(orgId);

    if (isLoading) {
        return (
            <main className="mx-auto max-w-3xl px-6 py-16 text-slate-500 dark:text-slate-400">
                Loading role…
            </main>
        );
    }

    if (!role) {
        return (
            <main className="mx-auto max-w-3xl px-6 py-16">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {error ? "Failed to load role" : "Role not found"}
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {error
                        ? `Indexer error for role ${roleId}: ${error instanceof Error ? error.message : String(error)}`
                        : `No role with id ${roleId} on this chain.`}
                </p>
                <button
                    type="button"
                    onClick={onBackToOrg}
                    className="mt-6 rounded-full border border-slate-200 px-4 py-1.5 text-[12px] font-medium text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-300"
                >
                    ← Back to org
                </button>
            </main>
        );
    }

    const leads = (role.leads ?? []) as string[];

    return (
        <main className="relative mx-auto min-h-screen w-full max-w-3xl px-6 py-12 text-slate-900 dark:text-white">
            <button
                type="button"
                onClick={onBackToOrg}
                className="mb-8 rounded-full border border-slate-200 px-4 py-1.5 text-[12px] font-medium text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-300"
            >
                ← {org ? org.name : "Back to org"}
            </button>

            <header className="mb-10">
                <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    {org ? `${org.subname}.hollab.eth · role` : "role"}
                </p>
                <h1 className="mt-2 text-4xl font-semibold tracking-[-0.02em]">{role.name}</h1>
                {role.purpose && (
                    <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {role.purpose}
                    </p>
                )}
            </header>

            {leads.length > 0 && (
                <section className="mb-10">
                    <h2 className="mb-3 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        Leads
                    </h2>
                    <ul className="flex flex-wrap gap-2">
                        {leads.map((lead) => {
                            const isAgent = isAgentAddress(lead);
                            return (
                                <li
                                    key={lead}
                                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] ${
                                        isAgent
                                            ? "border-[#3481FF]/30 bg-[#3481FF]/[0.08] text-[#3481FF]"
                                            : "border-slate-200/70 text-slate-600 dark:border-white/[0.06] dark:text-slate-300"
                                    }`}
                                >
                                    {isAgent && <span aria-label="agent">🤖</span>}
                                    {lead.slice(0, 6)}…{lead.slice(-4)}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {role.domains.length > 0 && (
                <section className="mb-10">
                    <h2 className="mb-3 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        Domains
                    </h2>
                    <ul className="space-y-2">
                        {role.domains.map((d, i) => (
                            <li
                                key={`${d}-${i}`}
                                className="rounded-xl border border-slate-200/70 p-3 text-[13px] text-slate-600 dark:border-white/[0.06] dark:text-slate-300"
                            >
                                {d}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {role.accountabilities.length > 0 && (
                <section className="mb-10">
                    <h2 className="mb-3 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        Accountabilities
                    </h2>
                    <ul className="space-y-2">
                        {role.accountabilities.map((a, i) => (
                            <li
                                key={`${a}-${i}`}
                                className="rounded-xl border border-slate-200/70 p-3 text-[13px] text-slate-600 dark:border-white/[0.06] dark:text-slate-300"
                            >
                                {a}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </main>
    );
}
