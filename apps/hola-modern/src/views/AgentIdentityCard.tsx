/**
 * AgentIdentityCard — self-service ERC-8004 identity link.
 *
 * A member can bind an agent NFT (ERC-8004 registry address + tokenId) to
 * their org identity. The contract verifies ownership on-chain; we just
 * collect the inputs and surface the linked state. See specs/99 §4.
 */
import { Bot, Check, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";

import { useAgentIdentity, useLinkAgentIdentity } from "../hooks/useAgentIdentity";

export default function AgentIdentityCard({
    instanceAddress,
}: {
    instanceAddress: `0x${string}` | undefined;
}) {
    const { address } = useAccount();
    const { identity, isLoading } = useAgentIdentity(instanceAddress, address);
    const link = useLinkAgentIdentity();

    const [open, setOpen] = useState(false);
    const [registry, setRegistry] = useState("");
    const [tokenId, setTokenId] = useState("");

    const canSubmit = useMemo(() => {
        if (!isAddress(registry.trim())) return false;
        try {
            BigInt(tokenId.trim());
            return tokenId.trim().length > 0;
        } catch {
            return false;
        }
    }, [registry, tokenId]);

    if (!instanceAddress) return null;
    if (!address) return null;

    const linked = Boolean(identity?.linked);

    const handleSubmit = () => {
        if (!canSubmit || !instanceAddress) return;
        link.mutate(
            {
                instanceAddress,
                agentRegistry: registry.trim() as `0x${string}`,
                agentId: BigInt(tokenId.trim()),
            },
            {
                onSuccess: () => {
                    setOpen(false);
                    setRegistry("");
                    setTokenId("");
                },
            },
        );
    };

    return (
        <section
            className={`mb-5 rounded-2xl border p-4 transition-colors ${
                linked
                    ? "border-[#3481FF]/25 bg-[#3481FF]/[0.04] dark:bg-[#3481FF]/[0.05]"
                    : "border-slate-200/80 bg-white/60 dark:border-white/[0.06] dark:bg-white/[0.02]"
            }`}
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full ${
                            linked
                                ? "bg-[#3481FF]/[0.12] text-[#3481FF]"
                                : "bg-slate-100 text-slate-500 dark:bg-white/[0.05]"
                        }`}
                    >
                        <Bot size={15} strokeWidth={1.9} />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            Agent identity · ERC-8004
                        </p>
                        {isLoading ? (
                            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">
                                <Loader2 size={10} className="animate-spin" strokeWidth={2} />
                                Reading…
                            </p>
                        ) : linked ? (
                            <p className="mt-1 font-mono text-[12px] text-slate-700 dark:text-slate-200">
                                #{identity!.agentId.toString()}
                                <span className="ml-2 text-slate-500 dark:text-slate-400">
                                    {identity!.agentRegistry.slice(0, 6)}…
                                    {identity!.agentRegistry.slice(-4)}
                                </span>
                            </p>
                        ) : (
                            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                                Bind an agent NFT you own to this org identity.
                            </p>
                        )}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setOpen((v) => !v);
                        link.reset();
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition ${
                        linked
                            ? "border border-slate-200 text-slate-600 hover:border-slate-300 dark:border-white/[0.1] dark:text-slate-300"
                            : "bg-[#3481FF] text-white shadow-[0_8px_24px_-10px_rgba(52,129,255,0.6)] hover:bg-[#2f75e8]"
                    }`}
                >
                    {linked ? (
                        <>
                            <Sparkles size={11} strokeWidth={2} />
                            Relink
                        </>
                    ) : (
                        <>
                            <Sparkles size={11} strokeWidth={2} />
                            Link agent
                        </>
                    )}
                </button>
            </div>

            {open && (
                <div className="mt-4 grid gap-2.5 border-t border-slate-200/70 pt-4 dark:border-white/[0.06] sm:grid-cols-[1.4fr_1fr_auto]">
                    <label className="block">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Registry address
                        </span>
                        <input
                            value={registry}
                            onChange={(e) => setRegistry(e.target.value)}
                            placeholder="0x… ERC-8004 contract"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[11.5px] text-slate-900 outline-none focus:border-[#3481FF]/40 focus:ring-1 focus:ring-[#3481FF]/20 dark:border-white/[0.08] dark:bg-[#0c0c12] dark:text-white"
                        />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Token id
                        </span>
                        <input
                            value={tokenId}
                            onChange={(e) => setTokenId(e.target.value)}
                            inputMode="numeric"
                            placeholder="0"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[11.5px] text-slate-900 outline-none focus:border-[#3481FF]/40 focus:ring-1 focus:ring-[#3481FF]/20 dark:border-white/[0.08] dark:bg-[#0c0c12] dark:text-white"
                        />
                    </label>
                    <div className="flex items-end gap-2">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canSubmit || link.isPending}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#3481FF] px-4 py-2 text-[11px] font-semibold text-white transition hover:bg-[#2f75e8] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {link.isPending ? (
                                <Loader2 size={11} className="animate-spin" strokeWidth={2} />
                            ) : (
                                <Check size={11} strokeWidth={2.2} />
                            )}
                            Link
                        </button>
                    </div>
                    {link.isError && (
                        <p className="flex items-start gap-1.5 text-[11px] text-rose-500 dark:text-rose-400 sm:col-span-3">
                            <ShieldAlert size={11} strokeWidth={2} className="mt-[1px] shrink-0" />
                            {formatLinkError(link.error)}
                        </p>
                    )}
                    <p className="text-[10.5px] leading-relaxed text-slate-400 dark:text-slate-500 sm:col-span-3">
                        Caller must own the token and be an org member. The contract verifies both
                        via <span className="font-mono">ownerOf</span>.
                    </p>
                </div>
            )}
        </section>
    );
}

function formatLinkError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AgentNotOwner")) {
        return "Caller does not own this token on the given registry.";
    }
    if (msg.includes("Unauthorized")) {
        return "Caller is not a member of this org.";
    }
    return msg;
}
