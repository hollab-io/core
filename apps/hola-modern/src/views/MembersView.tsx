import { BadgeCheck, Building2, Mail, Plus, UserRoundPlus, Users, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { isAddress } from "viem";

import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

function shortenWallet(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function MembersView({ searchQuery }: { searchQuery: string }) {
    const { authenticatedWalletAddress, circleMap, inviteMember, organization, snapshot } =
        useWorkspaceSnapshot();
    const [inviteName, setInviteName] = useState("");
    const [inviteWallet, setInviteWallet] = useState("");
    const [inviteEmail, setInviteEmail] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const members = useMemo(() => {
        const rolesByPartnerId = new Map<string, string[]>();

        snapshot.roles.forEach((role) => {
            role.memberIds.forEach((memberId) => {
                const currentRoles = rolesByPartnerId.get(memberId) ?? [];
                currentRoles.push(role.title);
                rolesByPartnerId.set(memberId, currentRoles);
            });
        });

        const normalizedQuery = searchQuery.trim().toLowerCase();

        return snapshot.partners
            .map((partner) => ({
                ...partner,
                roles: rolesByPartnerId.get(partner.id) ?? [],
            }))
            .filter((partner) => {
                if (!normalizedQuery) {
                    return true;
                }

                return (
                    partner.name.toLowerCase().includes(normalizedQuery) ||
                    partner.email?.toLowerCase().includes(normalizedQuery) ||
                    partner.walletAddress?.toLowerCase().includes(normalizedQuery) ||
                    partner.roles.some((role) => role.toLowerCase().includes(normalizedQuery))
                );
            })
            .sort((left, right) => {
                const leftStatus = left.status === "invited" ? 1 : 0;
                const rightStatus = right.status === "invited" ? 1 : 0;

                if (leftStatus !== rightStatus) {
                    return leftStatus - rightStatus;
                }

                return left.name.localeCompare(right.name);
            });
    }, [searchQuery, snapshot.partners, snapshot.roles]);

    const activeMembers = members.filter((member) => member.status !== "invited");
    const invitedMembers = members.filter((member) => member.status === "invited");

    if (!organization) {
        return (
            <section className="mx-auto flex h-full max-w-4xl items-center justify-center py-8">
                <div className="w-full rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Users size={22} aria-hidden="true" />
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-slate-900">
                        Create an organization first
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-500">
                        Member invitations become available as soon as the workspace organization
                        has been created.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="mx-auto flex h-full w-full max-w-[1560px] flex-col gap-6 py-4">
            <div className="rounded-[32px] border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#3481FF]">
                            Members
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
                            Invite wallet-based members into {organization.name}
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                            This organization already has a starter structure. Invite real members
                            by wallet address, track pending invitations, and see which circles and
                            roles each member currently touches.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        {[
                            { label: "Active members", value: activeMembers.length },
                            { label: "Pending invites", value: invitedMembers.length },
                            { label: "Circles", value: Object.keys(circleMap).length },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                className="rounded-[24px] border border-slate-200 bg-slate-50/70 px-5 py-4"
                            >
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    {stat.label}
                                </div>
                                <div className="mt-2 text-2xl font-semibold text-slate-900">
                                    {stat.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3481FF]/10 text-[#3481FF]">
                            <UserRoundPlus size={22} aria-hidden="true" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Invite flow
                            </div>
                            <div className="mt-1 text-xl font-semibold text-slate-900">
                                Add a member by wallet
                            </div>
                        </div>
                    </div>

                    <form
                        className="mt-6 grid gap-4"
                        onSubmit={(event) => {
                            event.preventDefault();

                            const normalizedWallet = inviteWallet.trim();

                            if (!isAddress(normalizedWallet)) {
                                setErrorMessage("Enter a valid EVM wallet address.");
                                return;
                            }

                            const createdMember = inviteMember({
                                email: inviteEmail || undefined,
                                name: inviteName,
                                walletAddress: normalizedWallet,
                            });

                            if (!createdMember) {
                                setErrorMessage("The member could not be invited.");
                                return;
                            }

                            setErrorMessage(null);
                            setInviteEmail("");
                            setInviteName("");
                            setInviteWallet("");
                        }}
                    >
                        <label className="grid gap-2 text-sm">
                            <span className="font-medium text-slate-700">Member name</span>
                            <input
                                type="text"
                                value={inviteName}
                                onChange={(event) => setInviteName(event.target.value)}
                                placeholder="Mila Ross"
                                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-[#3481FF] focus:bg-white focus:ring-4 focus:ring-[#3481FF]/10"
                            />
                        </label>

                        <label className="grid gap-2 text-sm">
                            <span className="font-medium text-slate-700">Wallet address</span>
                            <input
                                type="text"
                                value={inviteWallet}
                                onChange={(event) => setInviteWallet(event.target.value)}
                                placeholder="0x..."
                                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-[#3481FF] focus:bg-white focus:ring-4 focus:ring-[#3481FF]/10"
                            />
                        </label>

                        <label className="grid gap-2 text-sm">
                            <span className="font-medium text-slate-700">Email (optional)</span>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(event) => setInviteEmail(event.target.value)}
                                placeholder="person@hollab.io"
                                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-[#3481FF] focus:bg-white focus:ring-4 focus:ring-[#3481FF]/10"
                            />
                        </label>

                        {errorMessage && (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {errorMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3481FF] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_-24px_rgba(52,129,255,0.75)] transition-colors hover:bg-blue-600"
                        >
                            <Plus size={17} aria-hidden="true" />
                            Invite member
                        </button>
                    </form>

                    <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
                        <div className="flex items-center gap-3">
                            <Wallet size={18} className="text-[#3481FF]" aria-hidden="true" />
                            <div className="text-sm font-semibold text-slate-900">
                                Connected inviter wallet
                            </div>
                        </div>
                        <div className="mt-2 text-sm text-slate-500">
                            {authenticatedWalletAddress ? (
                                <span className="font-medium text-slate-700">
                                    {authenticatedWalletAddress}
                                </span>
                            ) : (
                                "Connect a wallet to make the invitation owner explicit."
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                            <Building2 size={22} aria-hidden="true" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Organization owner
                            </div>
                            <div className="mt-1 text-xl font-semibold text-slate-900">
                                {organization.name}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
                        <div className="text-sm font-semibold text-slate-900">Owner wallet</div>
                        <div className="mt-2 text-sm text-slate-500">
                            {organization.ownerWalletAddress}
                        </div>
                    </div>

                    <div className="mt-4 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
                        <div className="text-sm font-semibold text-slate-900">Circles in scope</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {Object.values(circleMap).map((circle) => (
                                <span
                                    key={circle.id}
                                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600"
                                >
                                    {circle.title}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3481FF]">
                                Active members
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                                Current organization members
                            </h2>
                        </div>
                        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-500">
                            {activeMembers.length} active
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                        {activeMembers.map((member) => {
                            const isOwner = member.id === organization.ownerPartnerId;
                            const isWalletHolder =
                                authenticatedWalletAddress &&
                                member.walletAddress?.toLowerCase() ===
                                    authenticatedWalletAddress.toLowerCase();

                            return (
                                <article
                                    key={member.id}
                                    className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-lg font-semibold text-slate-900">
                                                {member.name}
                                            </div>
                                            <div className="mt-1 text-sm text-slate-500">
                                                {member.email ??
                                                    member.walletAddress ??
                                                    "Starter team member"}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap justify-end gap-2">
                                            {isOwner && (
                                                <span className="rounded-full bg-[#3481FF]/10 px-3 py-1 text-xs font-semibold text-[#3481FF]">
                                                    Owner
                                                </span>
                                            )}
                                            {isWalletHolder && (
                                                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {(member.roles.length ? member.roles : ["Unassigned"]).map(
                                            (role) => (
                                                <span
                                                    key={`${member.id}-${role}`}
                                                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600"
                                                >
                                                    {role}
                                                </span>
                                            ),
                                        )}
                                    </div>

                                    {member.walletAddress && (
                                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                                            <Wallet size={15} aria-hidden="true" />
                                            <span className="font-medium text-slate-700">
                                                {shortenWallet(member.walletAddress)}
                                            </span>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3481FF]">
                                Pending
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                                Wallet invitations
                            </h2>
                        </div>
                        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-500">
                            {invitedMembers.length} pending
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        {invitedMembers.length ? (
                            invitedMembers.map((member) => (
                                <article
                                    key={member.id}
                                    className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">
                                                {member.name}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                {member.walletAddress
                                                    ? shortenWallet(member.walletAddress)
                                                    : "Wallet pending"}
                                            </div>
                                        </div>
                                        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
                                            Invited
                                        </span>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                        {member.email && (
                                            <span className="inline-flex items-center gap-1.5">
                                                <Mail size={13} aria-hidden="true" />
                                                {member.email}
                                            </span>
                                        )}
                                        {member.invitedAt && (
                                            <span className="inline-flex items-center gap-1.5">
                                                <BadgeCheck size={13} aria-hidden="true" />
                                                Invited{" "}
                                                {new Date(member.invitedAt).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </article>
                            ))
                        ) : (
                            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
                                No pending invitations yet. Invite the first member by wallet above.
                            </div>
                        )}
                    </div>

                    <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
                        <div className="text-sm font-semibold text-slate-900">
                            How this works right now
                        </div>
                        <p className="mt-2 text-sm leading-7 text-slate-500">
                            The invite is stored in the workspace and attached to a wallet address.
                            If that wallet later authenticates in this app, the member can be
                            recognized and promoted from invited to active automatically.
                        </p>
                    </div>
                </section>
            </div>
        </section>
    );
}
