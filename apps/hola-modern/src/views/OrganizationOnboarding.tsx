import { Building2, ChevronRight, Network, ShieldCheck, Wallet2 } from "lucide-react";
import { useMemo, useState } from "react";

import DynamicAuthControl from "../components/DynamicAuthControl";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

function shortenWallet(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function OrganizationOnboarding() {
    const {
        authenticatedUserEmail,
        authenticatedWalletAddress,
        circleMap,
        createOrganization,
        roleMap,
        snapshot,
    } = useWorkspaceSnapshot();
    const [organizationName, setOrganizationName] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [purpose, setPurpose] = useState(
        "Create a transparent Holacracy workspace where circles, governance, tactical meetings, and execution all live together.",
    );
    const defaultOwnerName = useMemo(() => {
        if (authenticatedUserEmail) {
            return authenticatedUserEmail.split("@")[0] ?? "";
        }

        if (authenticatedWalletAddress) {
            return `Owner ${authenticatedWalletAddress.slice(2, 6).toUpperCase()}`;
        }

        return "";
    }, [authenticatedUserEmail, authenticatedWalletAddress]);

    const stats = useMemo(
        () => [
            { label: "Starter circles", value: Object.keys(circleMap).length },
            { label: "Starter roles", value: Object.keys(roleMap).length },
            { label: "Starter members", value: snapshot.partners.length },
        ],
        [circleMap, roleMap, snapshot.partners.length],
    );

    const canCreate =
        Boolean(authenticatedWalletAddress) &&
        organizationName.trim().length > 2 &&
        (ownerName.trim().length > 1 || defaultOwnerName.length > 1);

    return (
        <section className="mx-auto flex min-h-full w-full max-w-[1520px] items-center justify-center py-6 sm:py-10">
            <div className="grid w-full gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(52,129,255,0.12),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-7 py-8 sm:px-10">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#3481FF]">
                            Organization setup
                        </p>
                        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
                            Create your workspace before you enter the operating system
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
                            Connect a wallet, create the organization once, and the full starter
                            structure becomes available immediately across chart, OKRs, governance,
                            meetings, and members.
                        </p>

                        <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                            {stats.map((stat) => (
                                <div
                                    key={stat.label}
                                    className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 shadow-sm"
                                >
                                    <span className="font-semibold text-slate-900">
                                        {stat.value}
                                    </span>{" "}
                                    {stat.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-6 px-7 py-8 sm:px-10 lg:grid-cols-[0.95fr_1.05fr]">
                        <div className="space-y-4">
                            <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#3481FF]/10 text-[#3481FF]">
                                        <Wallet2 size={20} aria-hidden="true" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900">
                                            Wallet access
                                        </div>
                                        <div className="text-sm text-slate-500">
                                            Use Dynamic auth to connect the owner wallet first.
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <DynamicAuthControl />
                                </div>
                                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                                    {authenticatedWalletAddress ? (
                                        <>
                                            Connected wallet:{" "}
                                            <span className="font-semibold text-slate-900">
                                                {shortenWallet(authenticatedWalletAddress)}
                                            </span>
                                        </>
                                    ) : (
                                        "Connect a wallet to unlock organization creation."
                                    )}
                                </div>
                            </div>

                            <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                                        <ShieldCheck size={20} aria-hidden="true" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900">
                                            What gets created
                                        </div>
                                        <div className="text-sm text-slate-500">
                                            A starter Holacracy structure with circles, OKRs,
                                            governance, and tactical work already linked together.
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-3">
                                    {[
                                        "Leadership, Product, Employee Experience, and Growth circles",
                                        "Governance proposals, elections, and tactical meetings",
                                        "Projects, actions, OKRs, and member invitations tied into one workspace",
                                    ].map((item) => (
                                        <div
                                            key={item}
                                            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
                                        >
                                            <ChevronRight
                                                size={16}
                                                className="mt-0.5 shrink-0 text-[#3481FF]"
                                                aria-hidden="true"
                                            />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <form
                            className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm"
                            onSubmit={(event) => {
                                event.preventDefault();

                                if (!authenticatedWalletAddress || !canCreate) {
                                    return;
                                }

                                createOrganization({
                                    name: organizationName,
                                    ownerName: ownerName.trim() || defaultOwnerName,
                                    ownerWalletAddress: authenticatedWalletAddress,
                                    purpose,
                                });
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3481FF]/10 text-[#3481FF]">
                                    <Building2 size={22} aria-hidden="true" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Founder profile
                                    </div>
                                    <div className="mt-1 text-xl font-semibold text-slate-900">
                                        Create the first organization
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 grid gap-4">
                                <label className="grid gap-2 text-sm">
                                    <span className="font-medium text-slate-700">
                                        Organization name
                                    </span>
                                    <input
                                        type="text"
                                        value={organizationName}
                                        onChange={(event) =>
                                            setOrganizationName(event.target.value)
                                        }
                                        placeholder="Hollab Protocol"
                                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-[#3481FF] focus:bg-white focus:ring-4 focus:ring-[#3481FF]/10"
                                    />
                                </label>

                                <label className="grid gap-2 text-sm">
                                    <span className="font-medium text-slate-700">Your name</span>
                                    <input
                                        type="text"
                                        value={ownerName}
                                        onChange={(event) => setOwnerName(event.target.value)}
                                        placeholder={defaultOwnerName || "Elena Moroz"}
                                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-[#3481FF] focus:bg-white focus:ring-4 focus:ring-[#3481FF]/10"
                                    />
                                </label>

                                <label className="grid gap-2 text-sm">
                                    <span className="font-medium text-slate-700">
                                        Workspace purpose
                                    </span>
                                    <textarea
                                        rows={4}
                                        value={purpose}
                                        onChange={(event) => setPurpose(event.target.value)}
                                        className="resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-[#3481FF] focus:bg-white focus:ring-4 focus:ring-[#3481FF]/10"
                                    />
                                </label>
                            </div>

                            <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Organization owner wallet
                                </div>
                                <div className="mt-2 text-sm text-slate-700">
                                    {authenticatedWalletAddress ? (
                                        <span className="font-semibold">
                                            {authenticatedWalletAddress}
                                        </span>
                                    ) : (
                                        "No wallet connected yet"
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!canCreate}
                                className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all ${
                                    canCreate
                                        ? "bg-[#3481FF] text-white shadow-[0_16px_34px_-24px_rgba(52,129,255,0.75)] hover:bg-blue-600"
                                        : "cursor-not-allowed bg-slate-200 text-slate-400"
                                }`}
                            >
                                <Network size={18} aria-hidden="true" />
                                Create organization and enter workspace
                            </button>
                        </form>
                    </div>
                </div>

                <div className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-7 py-6 sm:px-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#3481FF]">
                            Starter structure
                        </p>
                        <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                            What opens right after organization creation
                        </h2>
                    </div>

                    <div className="space-y-4 px-7 py-7 sm:px-8">
                        {[
                            {
                                body: "See circles, roles, and structural relationships immediately after onboarding.",
                                title: "Organization chart",
                            },
                            {
                                body: "Use the Members tab to invite people by wallet address and manage active or pending members.",
                                title: "Wallet-based members",
                            },
                            {
                                body: "Calendar, tactical meetings, governance, actions, and OKRs remain linked to the same workspace model.",
                                title: "Connected operating flows",
                            },
                        ].map((feature) => (
                            <article
                                key={feature.title}
                                className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5"
                            >
                                <div className="text-lg font-semibold text-slate-900">
                                    {feature.title}
                                </div>
                                <p className="mt-2 text-sm leading-7 text-slate-500">
                                    {feature.body}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
