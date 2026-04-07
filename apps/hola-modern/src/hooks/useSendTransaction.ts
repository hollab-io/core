/**
 * useSendTransaction — unified transaction sender.
 *
 * Tries ZeroDev smart-account (gas-sponsored, batchable) first.
 * Falls back to a standard EOA walletClient when ZeroDev is not connected.
 *
 * Usage:
 *   const { send } = useSendTransaction();
 *   const hash = await send([{ to, abi, functionName, args }], walletAddress);
 */
import type { Abi, Address } from "viem";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { encodeFunctionData } from "viem";

import { useChain } from "../context/ChainContext";

export type ContractCall = {
    to: Address;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
};

export function useSendTransaction() {
    const { primaryWallet } = useDynamicContext();
    const { chainConfig } = useChain();

    const send = async (calls: ContractCall[], account: Address): Promise<`0x${string}`> => {
        const encoded = calls.map(({ to, abi, functionName, args, value }) => ({
            to,
            data: encodeFunctionData({ abi, functionName, args: args ?? [] }),
            value,
        }));

        // ZeroDev / gas sponsorship is disabled until AA is properly configured.
        if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
            throw new Error("No Ethereum wallet connected");
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const walletClient = await (primaryWallet as any).getWalletClient();
        if (!walletClient) throw new Error("Could not get wallet client");

        let hash: `0x${string}` = "0x";
        for (const call of encoded) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            hash = await (walletClient as any).sendTransaction({
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
