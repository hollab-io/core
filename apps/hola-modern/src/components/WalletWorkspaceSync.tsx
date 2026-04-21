import { useEffect } from "react";
import { useAccount } from "wagmi";

import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

export default function WalletWorkspaceSync() {
    const { address } = useAccount();
    const { syncAuthenticatedIdentity } = useWorkspaceSnapshot();

    useEffect(() => {
        syncAuthenticatedIdentity({
            email: undefined,
            walletAddress: address,
        });
    }, [address, syncAuthenticatedIdentity]);

    return null;
}
