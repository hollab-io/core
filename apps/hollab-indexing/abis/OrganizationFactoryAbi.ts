export const OrganizationFactoryAbi = [
    {
        type: "constructor",
        inputs: [
            {
                name: "_roleRegistryImpl",
                type: "address",
                internalType: "address",
            },
            {
                name: "_circleRegistryImpl",
                type: "address",
                internalType: "address",
            },
            {
                name: "_governanceProcessImpl",
                type: "address",
                internalType: "address",
            },
            {
                name: "_govFactory",
                type: "address",
                internalType: "address",
            },
            {
                name: "_ensRegistrar",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "ENS_REGISTRAR",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract IENSSubdomainRegistrar",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "GOV_FACTORY",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract HolGovernorFactory",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "circleRegistryImplementation",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "createOrganization",
        inputs: [
            {
                name: "_subname",
                type: "string",
                internalType: "string",
            },
            {
                name: "_purpose",
                type: "string",
                internalType: "string",
            },
            {
                name: "_govConfig",
                type: "tuple",
                internalType: "struct IOrganizationFactory.GovernanceConfig",
                components: [
                    {
                        name: "tokenName",
                        type: "string",
                        internalType: "string",
                    },
                    {
                        name: "tokenSymbol",
                        type: "string",
                        internalType: "string",
                    },
                    {
                        name: "initialHolders",
                        type: "address[]",
                        internalType: "address[]",
                    },
                    {
                        name: "initialAmounts",
                        type: "uint256[]",
                        internalType: "uint256[]",
                    },
                    {
                        name: "timelockDelay",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "votingDelay",
                        type: "uint48",
                        internalType: "uint48",
                    },
                    {
                        name: "votingPeriod",
                        type: "uint32",
                        internalType: "uint32",
                    },
                    {
                        name: "proposalThreshold",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "quorumNumerator",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "treasuryTimelockDelay",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
        ],
        outputs: [
            {
                name: "_orgId",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "getOrganization",
        inputs: [
            {
                name: "_orgId",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "_org",
                type: "tuple",
                internalType: "struct HolacracyTypes.Organization",
                components: [
                    {
                        name: "id",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "name",
                        type: "string",
                        internalType: "string",
                    },
                    {
                        name: "subname",
                        type: "string",
                        internalType: "string",
                    },
                    {
                        name: "creator",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "roleRegistry",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "circleRegistry",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "governanceProcess",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "accessManager",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "anchorCircleId",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "createdAt",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "governor",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "token",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "timelock",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "treasury",
                        type: "address",
                        internalType: "address",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getOrganizationBySubname",
        inputs: [
            {
                name: "_subname",
                type: "string",
                internalType: "string",
            },
        ],
        outputs: [
            {
                name: "_org",
                type: "tuple",
                internalType: "struct HolacracyTypes.Organization",
                components: [
                    {
                        name: "id",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "name",
                        type: "string",
                        internalType: "string",
                    },
                    {
                        name: "subname",
                        type: "string",
                        internalType: "string",
                    },
                    {
                        name: "creator",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "roleRegistry",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "circleRegistry",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "governanceProcess",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "accessManager",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "anchorCircleId",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "createdAt",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "governor",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "token",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "timelock",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "treasury",
                        type: "address",
                        internalType: "address",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "governanceProcessImplementation",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "organizationCount",
        inputs: [],
        outputs: [
            {
                name: "_count",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "roleRegistryImplementation",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "event",
        name: "OrgComponentsDeployed",
        inputs: [
            {
                name: "_orgId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "_circleRegistry",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "_roleRegistry",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "_governanceProcess",
                type: "address",
                indexed: false,
                internalType: "address",
            },
            {
                name: "_treasury",
                type: "address",
                indexed: false,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "OrganizationCreated",
        inputs: [
            {
                name: "_orgId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "_subname",
                type: "string",
                indexed: false,
                internalType: "string",
            },
            {
                name: "_creator",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "error",
        name: "FailedDeployment",
        inputs: [],
    },
    {
        type: "error",
        name: "InsufficientBalance",
        inputs: [
            {
                name: "balance",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "needed",
                type: "uint256",
                internalType: "uint256",
            },
        ],
    },
    {
        type: "error",
        name: "OrganizationFactory_InvalidSubname",
        inputs: [
            {
                name: "_subname",
                type: "string",
                internalType: "string",
            },
        ],
    },
    {
        type: "error",
        name: "OrganizationFactory_SubnameAlreadyTaken",
        inputs: [
            {
                name: "_subname",
                type: "string",
                internalType: "string",
            },
        ],
    },
    {
        type: "error",
        name: "OrganizationFactory_SubnameTooShort",
        inputs: [
            {
                name: "_subname",
                type: "string",
                internalType: "string",
            },
        ],
    },
] as const;
