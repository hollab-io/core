import { useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";

import { useChain } from "../context/ChainContext";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

export default function WalletWorkspaceSync() {
    const { address, chainId } = useAccount();
    const { switchChain } = useSwitchChain();
    const { activeChainId } = useChain();
    const { syncAuthenticatedIdentity } = useWorkspaceSnapshot();

    // Auto-switch chain when wallet is on wrong network.
    useEffect(() => {
        if (chainId && chainId !== activeChainId) {
            switchChain?.({ chainId: activeChainId });
        }
    }, [chainId, activeChainId, switchChain]);

    useEffect(() => {
        syncAuthenticatedIdentity({
            email: undefined,
            walletAddress: address,
        });
    }, [address, syncAuthenticatedIdentity]);

    return null;
}
