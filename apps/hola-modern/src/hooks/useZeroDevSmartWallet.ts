import type { Address, Hex } from "viem";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { isZeroDevConnector } from "@dynamic-labs/ethereum-aa";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

export type SponsoredCall = {
    data?: Hex;
    to: Address;
    value?: bigint;
};

class GasSponsorshipUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "GasSponsorshipUnavailableError";
    }
}

const ZERO_DATA = "0x";

export function useZeroDevSmartWallet() {
    const { primaryWallet } = useDynamicContext();

    const isEvmWallet = Boolean(primaryWallet && isEthereumWallet(primaryWallet));
    const zeroDevConnector =
        primaryWallet?.connector && isZeroDevConnector(primaryWallet.connector)
            ? primaryWallet.connector
            : null;

    const getSponsoredKernelClient = async () => {
        if (!primaryWallet || !isEvmWallet || !zeroDevConnector) {
            throw new GasSponsorshipUnavailableError(
                "Connect a ZeroDev-backed EVM wallet before sending sponsored transactions.",
            );
        }

        await zeroDevConnector.getNetwork();

        const kernelClient = zeroDevConnector.getAccountAbstractionProvider({
            withSponsorship: true,
        });

        if (!kernelClient?.account) {
            throw new GasSponsorshipUnavailableError(
                "ZeroDev kernel client is not ready yet. Reconnect the wallet and try again.",
            );
        }

        return kernelClient;
    };

    const canSponsorCall = async (call: SponsoredCall) => {
        if (!primaryWallet || !zeroDevConnector) {
            return false;
        }

        await zeroDevConnector.getNetwork();

        return zeroDevConnector.canSponsorTransactionGas({
            data: call.data ?? ZERO_DATA,
            from: primaryWallet.address,
            to: call.to,
            value: call.value ?? 0n,
        });
    };

    const sendSponsoredCalls = async (calls: SponsoredCall[]) => {
        if (!calls.length) {
            throw new GasSponsorshipUnavailableError(
                "At least one call is required to create a sponsored user operation.",
            );
        }

        const kernelClient = await getSponsoredKernelClient();

        const callData = await kernelClient.account.encodeCalls(
            calls.map((call) => ({
                data: call.data ?? ZERO_DATA,
                to: call.to,
                value: call.value ?? 0n,
            })),
        );

        const userOpHash = await kernelClient.sendUserOperation({ callData });

        return {
            kernelClient,
            userOpHash,
        };
    };

    return {
        canSponsorCall,
        getSponsoredKernelClient,
        isEvmWallet,
        isZeroDevSmartWallet: Boolean(zeroDevConnector),
        primaryWallet,
        sendSponsoredCalls,
        zeroDevConnector,
    };
}

export { GasSponsorshipUnavailableError };
