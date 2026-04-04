export const HolGovernorFactoryAbi = [
    {
        type: "function",
        name: "deploy",
        inputs: [
            {
                name: "config",
                type: "tuple",
                internalType: "struct HolGovernorFactory.DeploymentConfig",
                components: [
                    { name: "tokenName", type: "string", internalType: "string" },
                    { name: "tokenSymbol", type: "string", internalType: "string" },
                    { name: "initialHolders", type: "address[]", internalType: "address[]" },
                    { name: "initialAmounts", type: "uint256[]", internalType: "uint256[]" },
                    { name: "timelockDelay", type: "uint256", internalType: "uint256" },
                    { name: "governorName", type: "string", internalType: "string" },
                    { name: "votingDelay", type: "uint48", internalType: "uint48" },
                    { name: "votingPeriod", type: "uint32", internalType: "uint32" },
                    { name: "proposalThreshold", type: "uint256", internalType: "uint256" },
                    { name: "quorumNumerator", type: "uint256", internalType: "uint256" },
                    { name: "subdomain", type: "string", internalType: "string" },
                    { name: "subdomainRegistrar", type: "address", internalType: "address" },
                ],
            },
        ],
        outputs: [
            {
                name: "deployment",
                type: "tuple",
                internalType: "struct HolGovernorFactory.Deployment",
                components: [
                    { name: "token", type: "address", internalType: "address" },
                    { name: "timelock", type: "address", internalType: "address" },
                    { name: "governor", type: "address", internalType: "address" },
                ],
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        name: "GovernorDeployed",
        inputs: [
            { name: "governor", type: "address", indexed: true, internalType: "address" },
            { name: "token", type: "address", indexed: true, internalType: "address" },
            { name: "timelock", type: "address", indexed: true, internalType: "address" },
            { name: "governorName", type: "string", indexed: false, internalType: "string" },
        ],
        anonymous: false,
    },
    { type: "error", name: "ArrayLengthMismatch", inputs: [] },
    {
        type: "error",
        name: "InvalidSubdomain",
        inputs: [{ name: "subdomain", type: "string", internalType: "string" }],
    },
    { type: "error", name: "MissingENSRegistrar", inputs: [] },
] as const;
