import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { useDynamicContext, useSwitchNetwork } from "@dynamic-labs/sdk-react-core";
import { useEffect } from "react";

import { useChain } from "../context/ChainContext";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

export default function DynamicWorkspaceSync() {
    const { primaryWallet, user } = useDynamicContext();
    const { syncAuthenticatedIdentity } = useWorkspaceSnapshot();
    const switchNetwork = useSwitchNetwork();
    const { activeChainId } = useChain();

    // Auto-switch to the active chain when wallet connects on the wrong network.
    useEffect(() => {
        if (!primaryWallet || !isEthereumWallet(primaryWallet)) return;

        const connector = primaryWallet.connector as any;
        if (typeof connector.getNetwork !== "function") return;

        connector.getNetwork().then((chainId: number | undefined) => {
            if (chainId && chainId !== activeChainId) {
                switchNetwork({ wallet: primaryWallet, network: activeChainId }).catch(() => {
                    // User rejected the switch — nothing to do.
                });
            }
        });
    }, [primaryWallet, switchNetwork, activeChainId]);

    useEffect(() => {
        syncAuthenticatedIdentity({
            email: user?.email,
            walletAddress: primaryWallet?.address,
        });
    }, [primaryWallet?.address, syncAuthenticatedIdentity, user?.email]);

    return null;
}
