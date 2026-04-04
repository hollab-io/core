import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { holLabContractActions } from "@hollab-io/viem-extension";

const ORGANIZATION_FACTORY_ADDRESS =
    "0x9c065888Bf9dA328dBc521FccdEeCD8bF7A57C63" as const;



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

    const deployOrganization = async (params: {
        name: string;
        purpose: string;
        walletAddress: `0x${string}`;
    }): Promise<`0x${string}`> => {
        if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
            throw new Error("No Ethereum wallet connected");
        }

        const walletClient = await primaryWallet.getWalletClient();
        if (!walletClient) throw new Error("Could not get wallet client");

        // viem-extension was built against an older viem version; cast at the boundary
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contractActions = holLabContractActions()(walletClient as any);

        const subname = deriveSubname(params.name);
        if (subname.length < 3) {
            throw new Error(
                "Organization name too short — needs at least 3 alphanumeric characters.",
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const txHash = await (contractActions.organizationFactory.write as any)({
            address: ORGANIZATION_FACTORY_ADDRESS,
            functionName: "createOrganization",
            account: params.walletAddress,
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
        });

        return txHash;
    };

    return { deployOrganization };
}
