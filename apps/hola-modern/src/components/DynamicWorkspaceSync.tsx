import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useEffect } from "react";

import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

export default function DynamicWorkspaceSync() {
    const { primaryWallet, user } = useDynamicContext();
    const { syncAuthenticatedIdentity } = useWorkspaceSnapshot();

    useEffect(() => {
        syncAuthenticatedIdentity({
            email: user?.email,
            walletAddress: primaryWallet?.address,
        });
    }, [primaryWallet?.address, syncAuthenticatedIdentity, user?.email]);

    return null;
}
