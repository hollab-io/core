import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { useDynamicContext, useSwitchNetwork } from "@dynamic-labs/sdk-react-core";
import { useEffect } from "react";
import { sepolia } from "viem/chains";

import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

const TARGET_CHAIN_ID = sepolia.id;

export default function DynamicWorkspaceSync() {
    const { primaryWallet, user } = useDynamicContext();
    const { syncAuthenticatedIdentity } = useWorkspaceSnapshot();
    const switchNetwork = useSwitchNetwork();

    // Auto-switch to Sepolia when wallet connects on the wrong network.
    useEffect(() => {
        if (!primaryWallet || !isEthereumWallet(primaryWallet)) return;

        const connector = primaryWallet.connector as any;
        if (typeof connector.getNetwork !== "function") return;

        connector.getNetwork().then((chainId: number | undefined) => {
            if (chainId && chainId !== TARGET_CHAIN_ID) {
                switchNetwork({ wallet: primaryWallet, network: TARGET_CHAIN_ID }).catch(() => {
                    // User rejected the switch — nothing to do.
                });
            }
        });
    }, [primaryWallet, switchNetwork]);

    useEffect(() => {
        syncAuthenticatedIdentity({
            email: user?.email,
            walletAddress: primaryWallet?.address,
        });
    }, [primaryWallet?.address, syncAuthenticatedIdentity, user?.email]);

    return null;
}
