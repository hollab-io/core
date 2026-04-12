/**
 * useSendTransaction — unified transaction sender.
 *
 * Uses wagmi's walletClient to send transactions sequentially.
 *
 * Usage:
 *   const { send } = useSendTransaction();
 *   const hash = await send([{ to, abi, functionName, args }], walletAddress);
 */
import type { Abi, Address } from "viem";
import { encodeFunctionData } from "viem";
import { useWalletClient } from "wagmi";

import { useChain } from "../context/ChainContext";

export type ContractCall = {
    to: Address;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
};

export function useSendTransaction() {
    const { data: walletClient } = useWalletClient();
    const { chainConfig } = useChain();

    const send = async (calls: ContractCall[], account: Address): Promise<`0x${string}`> => {
        if (!walletClient) {
            throw new Error("No wallet connected");
        }

        const encoded = calls.map(({ to, abi, functionName, args, value }) => ({
            to,
            data: encodeFunctionData({ abi, functionName, args: args ?? [] }),
            value,
        }));

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

    return { send };
}
