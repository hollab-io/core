/**
 * useSendTransaction — unified transaction sender.
 *
 * `send`      — sequential sends via walletClient.sendTransaction. Returns the LAST tx hash.
 * `sendBatch` — EIP-5792 batch via walletClient.sendCalls when the wallet supports it,
 *               falling back to sequential sends otherwise. Waits for the bundle to land
 *               and returns the receipts (from the batch) so callers can parse events.
 *
 * Usage:
 *   const { send, sendBatch } = useSendTransaction();
 *   const hash = await send([{ to, abi, functionName, args }], walletAddress);
 *   const { receipts } = await sendBatch([call1, call2], walletAddress);
 */
import type { Abi, Address, TransactionReceipt } from "viem";
import { createPublicClient, encodeFunctionData, http } from "viem";
import { useWalletClient } from "wagmi";

import { useChain } from "../context/ChainContext";

export type ContractCall = {
    to: Address;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
};

export type SendBatchResult = {
    receipts: TransactionReceipt[];
    // True when the wallet honored wallet_sendCalls; false when we fell back to sequential.
    batched: boolean;
};

export function useSendTransaction() {
    const { data: walletClient } = useWalletClient();
    const { chainConfig } = useChain();

    const encode = (calls: ContractCall[]) =>
        calls.map(({ to, abi, functionName, args, value }) => ({
            to,
            data: encodeFunctionData({ abi, functionName, args: args ?? [] }),
            value,
        }));

    const send = async (calls: ContractCall[], account: Address): Promise<`0x${string}`> => {
        if (!walletClient) {
            throw new Error("No wallet connected");
        }

        const encoded = encode(calls);

        let hash: `0x${string}` = "0x";
        for (const call of encoded) {
            hash = await walletClient.sendTransaction({
                to: call.to,
                data: call.data,
                value: call.value,
                account,
                chain: chainConfig.chain,
            });
        }
        return hash;
    };

    const sendBatch = async (calls: ContractCall[], account: Address): Promise<SendBatchResult> => {
        if (!walletClient) {
            throw new Error("No wallet connected");
        }

        const encoded = encode(calls);

        const publicClient = createPublicClient({
            chain: chainConfig.chain,
            transport: http(chainConfig.chain.rpcUrls.default.http[0]),
        });

        // Try EIP-5792 first. Wagmi/viem will throw with method-not-supported when
        // the connected wallet lacks wallet_sendCalls — we catch and fall back.
        try {
            // viem exposes sendCalls via walletClient actions when the connector supports it.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const anyClient = walletClient as any;
            if (typeof anyClient.sendCalls === "function") {
                const bundle = await anyClient.sendCalls({
                    account,
                    chain: chainConfig.chain,
                    calls: encoded.map((c) => ({ to: c.to, data: c.data, value: c.value })),
                });

                // bundle.id is the 5792 batch identifier.
                const bundleId: string = bundle?.id ?? bundle;

                // Poll getCallsStatus until confirmed (status === "CONFIRMED" / 200).
                const deadline = Date.now() + 120_000;
                while (Date.now() < deadline) {
                    const status = await anyClient.getCallsStatus({ id: bundleId });
                    const code = status?.statusCode ?? status?.status;
                    const done = code === 200 || code === "CONFIRMED" || code === "success";
                    if (done) {
                        const txHashes: `0x${string}`[] = (status.receipts ?? [])
                            .map((r: { transactionHash?: `0x${string}` }) => r.transactionHash)
                            .filter(Boolean);
                        const receipts = await Promise.all(
                            txHashes.map((hash) =>
                                publicClient.waitForTransactionReceipt({ hash }),
                            ),
                        );
                        return { receipts, batched: true };
                    }
                    if (code === 500 || code === "FAILED") {
                        throw new Error("wallet_sendCalls bundle failed on-chain");
                    }
                    await new Promise((r) => setTimeout(r, 1500));
                }
                throw new Error("wallet_sendCalls bundle timed out waiting for confirmation");
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            // Method-not-supported / user-rejected-capabilities → fall back to sequential.
            const unsupported = /unsupported|not support|method|capabilit/i.test(message);
            if (!unsupported) throw err;
        }

        // ── Fallback: sequential sends ──────────────────────────────────────────
        const receipts: TransactionReceipt[] = [];
        for (const call of encoded) {
            const hash = await walletClient.sendTransaction({
                to: call.to,
                data: call.data,
                value: call.value,
                account,
                chain: chainConfig.chain,
            });
            receipts.push(await publicClient.waitForTransactionReceipt({ hash }));
        }
        return { receipts, batched: false };
    };

    return { send, sendBatch };
}
