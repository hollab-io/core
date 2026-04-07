import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { organizationFactoryAbi } from "@hollab-io/viem-extension";

import { useChain } from "../context/ChainContext";
import { useSendTransaction } from "./useSendTransaction";

function deriveSubname(orgName: string): string {
    return orgName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
}

function deriveTokenSymbol(orgName: string): string {
    const symbol = orgName
        .trim()
        .split(/\s+/)
        .map((w) => w[0] ?? "")
        .join("")
        .toUpperCase()
        .slice(0, 5);
    return symbol || "ORG";
}

export function useOrganizationFactory() {
    const { primaryWallet } = useDynamicContext();
    const { send } = useSendTransaction();
    const { chainConfig } = useChain();

    const deployOrganization = async (params: {
        name: string;
        purpose: string;
        walletAddress: `0x${string}`;
    }): Promise<`0x${string}`> => {
        const subname = deriveSubname(params.name);
        if (subname.length < 3) {
            throw new Error(
                "Organization name too short — needs at least 3 alphanumeric characters.",
            );
        }

        const account = (primaryWallet?.address ?? params.walletAddress) as `0x${string}`;

        return send(
            [
                {
                    to: chainConfig.orgFactoryAddress,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    abi: organizationFactoryAbi as any,
                    functionName: "createOrganization",
                    args: [
                        subname,
                        params.purpose,
                        {
                            tokenName: `${params.name} Token`,
                            tokenSymbol: deriveTokenSymbol(params.name),
                            initialHolders: [params.walletAddress],
                            initialAmounts: [1_000_000n * 10n ** 18n],
                            timelockDelay: 0n,
                            votingDelay: 1,
                            votingPeriod: 50400,
                            proposalThreshold: 0n,
                            quorumNumerator: 4n,
                            treasuryTimelockDelay: 0n,
                        },
                    ],
                },
            ],
            account,
        );
    };

    return { deployOrganization };
}
