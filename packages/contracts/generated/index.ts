//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CircleRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const circleRegistryAbi = [
    { type: "constructor", inputs: [], stateMutability: "nonpayable" },
    {
        type: "function",
        inputs: [],
        name: "acceptDeployerTransfer",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_lead", internalType: "address", type: "address" },
        ],
        name: "addCircleLead",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_body", internalType: "string", type: "string" },
        ],
        name: "addPolicy",
        outputs: [{ name: "_policyId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_body", internalType: "string", type: "string" },
            { name: "_fieldNames", internalType: "bytes32[]", type: "bytes32[]" },
            {
                name: "_refs",
                internalType: "struct HolacracyTypes.ContentRef[]",
                type: "tuple[]",
                components: [
                    { name: "contentHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "visibility",
                        internalType: "enum HolacracyTypes.DataVisibility",
                        type: "uint8",
                    },
                ],
            },
        ],
        name: "addPolicyWithRefs",
        outputs: [{ name: "_policyId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "anchorCircleId",
        outputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_lead", internalType: "address", type: "address" },
        ],
        name: "assignRoleLeadInCircle",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_name", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
        ],
        name: "createAnchorCircle",
        outputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
            { name: "_domains", internalType: "string[]", type: "string[]" },
            { name: "_accountabilities", internalType: "string[]", type: "string[]" },
        ],
        name: "createRoleInCircle",
        outputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
            { name: "_domains", internalType: "string[]", type: "string[]" },
            { name: "_accountabilities", internalType: "string[]", type: "string[]" },
            { name: "_fieldNames", internalType: "bytes32[]", type: "bytes32[]" },
            {
                name: "_refs",
                internalType: "struct HolacracyTypes.ContentRef[]",
                type: "tuple[]",
                components: [
                    { name: "contentHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "visibility",
                        internalType: "enum HolacracyTypes.DataVisibility",
                        type: "uint8",
                    },
                ],
            },
        ],
        name: "createRoleInCircleWithRefs",
        outputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "createSubCircle",
        outputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "deployer",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "getCircle",
        outputs: [
            {
                name: "_circle",
                internalType: "struct HolacracyTypes.Circle",
                type: "tuple",
                components: [
                    { name: "id", internalType: "uint256", type: "uint256" },
                    { name: "parentCircleId", internalType: "uint256", type: "uint256" },
                    { name: "roleId", internalType: "uint256", type: "uint256" },
                    { name: "name", internalType: "string", type: "string" },
                    { name: "purpose", internalType: "string", type: "string" },
                    { name: "isAnchor", internalType: "bool", type: "bool" },
                    { name: "exists", internalType: "bool", type: "bool" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_fieldName", internalType: "bytes32", type: "bytes32" },
        ],
        name: "getCircleContentRef",
        outputs: [
            {
                name: "_ref",
                internalType: "struct HolacracyTypes.ContentRef",
                type: "tuple",
                components: [
                    { name: "contentHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "visibility",
                        internalType: "enum HolacracyTypes.DataVisibility",
                        type: "uint8",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "getCircleLeads",
        outputs: [{ name: "_leads", internalType: "address[]", type: "address[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "getCirclePolicies",
        outputs: [{ name: "_policyIds", internalType: "uint256[]", type: "uint256[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            {
                name: "_electedRole",
                internalType: "enum HolacracyTypes.ElectedRole",
                type: "uint8",
            },
        ],
        name: "getElectedRole",
        outputs: [{ name: "_account", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_policyId", internalType: "uint256", type: "uint256" }],
        name: "getPolicy",
        outputs: [
            {
                name: "_policy",
                internalType: "struct HolacracyTypes.Policy",
                type: "tuple",
                components: [
                    { name: "id", internalType: "uint256", type: "uint256" },
                    { name: "circleId", internalType: "uint256", type: "uint256" },
                    { name: "name", internalType: "string", type: "string" },
                    { name: "body", internalType: "string", type: "string" },
                    { name: "exists", internalType: "bool", type: "bool" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_policyId", internalType: "uint256", type: "uint256" },
            { name: "_fieldName", internalType: "bytes32", type: "bytes32" },
        ],
        name: "getPolicyContentRef",
        outputs: [
            {
                name: "_ref",
                internalType: "struct HolacracyTypes.ContentRef",
                type: "tuple",
                components: [
                    { name: "contentHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "visibility",
                        internalType: "enum HolacracyTypes.DataVisibility",
                        type: "uint8",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "getSubCircles",
        outputs: [{ name: "_childIds", internalType: "uint256[]", type: "uint256[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "governanceProcess",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_roleRegistry", internalType: "contract RoleRegistry", type: "address" },
            { name: "_deployer", internalType: "address", type: "address" },
            { name: "_governanceProcess", internalType: "address", type: "address" },
        ],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_account", internalType: "address", type: "address" },
        ],
        name: "isCircleLead",
        outputs: [{ name: "_isLead", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_account", internalType: "address", type: "address" },
        ],
        name: "isCircleMember",
        outputs: [{ name: "_isMember", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "pendingDeployer",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_newDeployer", internalType: "address", type: "address" }],
        name: "proposeDeployerTransfer",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_lead", internalType: "address", type: "address" },
        ],
        name: "removeCircleLead",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_policyId", internalType: "uint256", type: "uint256" },
        ],
        name: "removePolicy",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_roleId", internalType: "uint256", type: "uint256" },
        ],
        name: "removeRoleFromCircle",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "roleRegistry",
        outputs: [{ name: "", internalType: "contract RoleRegistry", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "roleToCircle",
        outputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            {
                name: "_electedRole",
                internalType: "enum HolacracyTypes.ElectedRole",
                type: "uint8",
            },
            { name: "_account", internalType: "address", type: "address" },
        ],
        name: "setElectedRole",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_governanceProcess", internalType: "address", type: "address" }],
        name: "setGovernanceProcess",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_lead", internalType: "address", type: "address" },
        ],
        name: "unassignRoleLeadInCircle",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
        ],
        name: "updateCircle",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
            { name: "_domains", internalType: "string[]", type: "string[]" },
            { name: "_accountabilities", internalType: "string[]", type: "string[]" },
        ],
        name: "updateRoleInCircle",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
            { name: "_domains", internalType: "string[]", type: "string[]" },
            { name: "_accountabilities", internalType: "string[]", type: "string[]" },
            { name: "_fieldNames", internalType: "bytes32[]", type: "bytes32[]" },
            {
                name: "_refs",
                internalType: "struct HolacracyTypes.ContentRef[]",
                type: "tuple[]",
                components: [
                    { name: "contentHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "visibility",
                        internalType: "enum HolacracyTypes.DataVisibility",
                        type: "uint8",
                    },
                ],
            },
        ],
        name: "updateRoleInCircleWithRefs",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_name", internalType: "string", type: "string", indexed: false },
        ],
        name: "AnchorCircleCreated",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_lead", internalType: "address", type: "address", indexed: true },
        ],
        name: "CircleLeadAdded",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_lead", internalType: "address", type: "address", indexed: true },
        ],
        name: "CircleLeadRemoved",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
        ],
        name: "CircleRoleCreated",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_name", internalType: "string", type: "string", indexed: false },
            { name: "_purpose", internalType: "string", type: "string", indexed: false },
        ],
        name: "CircleUpdated",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_entityType", internalType: "bytes32", type: "bytes32", indexed: true },
            { name: "_entityId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_fieldName", internalType: "bytes32", type: "bytes32", indexed: true },
            { name: "_contentHash", internalType: "bytes32", type: "bytes32", indexed: false },
            {
                name: "_visibility",
                internalType: "enum HolacracyTypes.DataVisibility",
                type: "uint8",
                indexed: false,
            },
        ],
        name: "ContentRefSet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_pendingDeployer", internalType: "address", type: "address", indexed: true },
        ],
        name: "DeployerTransferProposed",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_oldDeployer", internalType: "address", type: "address", indexed: true },
            { name: "_newDeployer", internalType: "address", type: "address", indexed: true },
        ],
        name: "DeployerTransferred",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            {
                name: "_electedRole",
                internalType: "enum HolacracyTypes.ElectedRole",
                type: "uint8",
                indexed: true,
            },
            { name: "_account", internalType: "address", type: "address", indexed: false },
        ],
        name: "ElectedRoleSet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_policyId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_name", internalType: "string", type: "string", indexed: false },
        ],
        name: "PolicyAdded",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_policyId", internalType: "uint256", type: "uint256", indexed: true },
        ],
        name: "PolicyRemoved",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_lead", internalType: "address", type: "address", indexed: true },
        ],
        name: "RoleLeadAssignedViaCircle",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_parentCircleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
        ],
        name: "SubCircleCreated",
    },
    {
        type: "error",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_lead", internalType: "address", type: "address" },
        ],
        name: "CircleRegistry_AlreadyCircleLead",
    },
    { type: "error", inputs: [], name: "CircleRegistry_AlreadyInitialized" },
    { type: "error", inputs: [], name: "CircleRegistry_AnchorAlreadyExists" },
    { type: "error", inputs: [], name: "CircleRegistry_ArrayLengthMismatch" },
    {
        type: "error",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "CircleRegistry_CircleNotFound",
    },
    { type: "error", inputs: [], name: "CircleRegistry_InvalidAddress" },
    {
        type: "error",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_lead", internalType: "address", type: "address" },
        ],
        name: "CircleRegistry_NotACircleLead",
    },
    {
        type: "error",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "CircleRegistry_NotCircleLead",
    },
    { type: "error", inputs: [], name: "CircleRegistry_NotPendingDeployer" },
    {
        type: "error",
        inputs: [{ name: "_policyId", internalType: "uint256", type: "uint256" }],
        name: "CircleRegistry_PolicyNotFound",
    },
    {
        type: "error",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "CircleRegistry_RoleAlreadyCircle",
    },
    {
        type: "error",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_circleId", internalType: "uint256", type: "uint256" },
        ],
        name: "CircleRegistry_RoleNotInCircle",
    },
    { type: "error", inputs: [], name: "CircleRegistry_Unauthorized" },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CircleTreasury
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const circleTreasuryAbi = [
    {
        type: "constructor",
        inputs: [
            { name: "_circleRegistry", internalType: "contract CircleRegistry", type: "address" },
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_minDelay", internalType: "uint256", type: "uint256" },
        ],
        stateMutability: "nonpayable",
    },
    { type: "receive", stateMutability: "payable" },
    {
        type: "function",
        inputs: [],
        name: "CIRCLE_ID",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "CIRCLE_REGISTRY",
        outputs: [{ name: "", internalType: "contract CircleRegistry", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "TIMELOCK",
        outputs: [{ name: "", internalType: "contract TimelockController", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_token", internalType: "contract IERC20", type: "address" },
            { name: "_amount", internalType: "uint256", type: "uint256" },
        ],
        name: "depositToken",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_account", internalType: "address", type: "address" }],
        name: "grantProposer",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_account", internalType: "address", type: "address" }],
        name: "revokeCanceller",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_account", internalType: "address", type: "address" }],
        name: "revokeProposer",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "syncFacilitator",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "syncedFacilitator",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_sender", internalType: "address", type: "address", indexed: true },
            { name: "_amount", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "Deposited",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_sender", internalType: "address", type: "address", indexed: true },
            { name: "_token", internalType: "address", type: "address", indexed: true },
            { name: "_amount", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "TokenDeposited",
    },
    { type: "error", inputs: [], name: "CircleTreasury_ETHTransferFailed" },
    { type: "error", inputs: [], name: "CircleTreasury_NotCircleLead" },
    { type: "error", inputs: [], name: "CircleTreasury_NotFacilitator" },
    {
        type: "error",
        inputs: [{ name: "token", internalType: "address", type: "address" }],
        name: "SafeERC20FailedOperation",
    },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GovComponentDeployer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const govComponentDeployerAbi = [
    {
        type: "function",
        inputs: [
            { name: "_minDelay", internalType: "uint256", type: "uint256" },
            { name: "_proposers", internalType: "address[]", type: "address[]" },
            { name: "_executors", internalType: "address[]", type: "address[]" },
            { name: "_admin", internalType: "address", type: "address" },
        ],
        name: "deployTimelock",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_name", internalType: "string", type: "string" },
            { name: "_symbol", internalType: "string", type: "string" },
            { name: "_minter", internalType: "address", type: "address" },
        ],
        name: "deployToken",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "nonpayable",
    },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GovToken
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const govTokenAbi = [
    {
        type: "constructor",
        inputs: [
            { name: "_name", internalType: "string", type: "string" },
            { name: "_symbol", internalType: "string", type: "string" },
            { name: "_minter", internalType: "address", type: "address" },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "CLOCK_MODE",
        outputs: [{ name: "", internalType: "string", type: "string" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "DOMAIN_SEPARATOR",
        outputs: [{ name: "", internalType: "bytes32", type: "bytes32" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "owner", internalType: "address", type: "address" },
            { name: "spender", internalType: "address", type: "address" },
        ],
        name: "allowance",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "spender", internalType: "address", type: "address" },
            { name: "value", internalType: "uint256", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "account", internalType: "address", type: "address" },
            { name: "pos", internalType: "uint32", type: "uint32" },
        ],
        name: "checkpoints",
        outputs: [
            {
                name: "",
                internalType: "struct Checkpoints.Checkpoint208",
                type: "tuple",
                components: [
                    { name: "_key", internalType: "uint48", type: "uint48" },
                    { name: "_value", internalType: "uint208", type: "uint208" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "clock",
        outputs: [{ name: "", internalType: "uint48", type: "uint48" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "decimals",
        outputs: [{ name: "", internalType: "uint8", type: "uint8" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "delegatee", internalType: "address", type: "address" }],
        name: "delegate",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "delegatee", internalType: "address", type: "address" },
            { name: "nonce", internalType: "uint256", type: "uint256" },
            { name: "expiry", internalType: "uint256", type: "uint256" },
            { name: "v", internalType: "uint8", type: "uint8" },
            { name: "r", internalType: "bytes32", type: "bytes32" },
            { name: "s", internalType: "bytes32", type: "bytes32" },
        ],
        name: "delegateBySig",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "delegates",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "eip712Domain",
        outputs: [
            { name: "fields", internalType: "bytes1", type: "bytes1" },
            { name: "name", internalType: "string", type: "string" },
            { name: "version", internalType: "string", type: "string" },
            { name: "chainId", internalType: "uint256", type: "uint256" },
            { name: "verifyingContract", internalType: "address", type: "address" },
            { name: "salt", internalType: "bytes32", type: "bytes32" },
            { name: "extensions", internalType: "uint256[]", type: "uint256[]" },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "timepoint", internalType: "uint256", type: "uint256" }],
        name: "getPastTotalSupply",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "account", internalType: "address", type: "address" },
            { name: "timepoint", internalType: "uint256", type: "uint256" },
        ],
        name: "getPastVotes",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "getVotes",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "to", internalType: "address", type: "address" },
            { name: "amount", internalType: "uint256", type: "uint256" },
        ],
        name: "mint",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "minter",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "name",
        outputs: [{ name: "", internalType: "string", type: "string" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "owner", internalType: "address", type: "address" }],
        name: "nonces",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "numCheckpoints",
        outputs: [{ name: "", internalType: "uint32", type: "uint32" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "owner", internalType: "address", type: "address" },
            { name: "spender", internalType: "address", type: "address" },
            { name: "value", internalType: "uint256", type: "uint256" },
            { name: "deadline", internalType: "uint256", type: "uint256" },
            { name: "v", internalType: "uint8", type: "uint8" },
            { name: "r", internalType: "bytes32", type: "bytes32" },
            { name: "s", internalType: "bytes32", type: "bytes32" },
        ],
        name: "permit",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_newMinter", internalType: "address", type: "address" }],
        name: "setMinter",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "symbol",
        outputs: [{ name: "", internalType: "string", type: "string" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "totalSupply",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "to", internalType: "address", type: "address" },
            { name: "value", internalType: "uint256", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "from", internalType: "address", type: "address" },
            { name: "to", internalType: "address", type: "address" },
            { name: "value", internalType: "uint256", type: "uint256" },
        ],
        name: "transferFrom",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "owner", internalType: "address", type: "address", indexed: true },
            { name: "spender", internalType: "address", type: "address", indexed: true },
            { name: "value", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "Approval",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "delegator", internalType: "address", type: "address", indexed: true },
            { name: "fromDelegate", internalType: "address", type: "address", indexed: true },
            { name: "toDelegate", internalType: "address", type: "address", indexed: true },
        ],
        name: "DelegateChanged",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "delegate", internalType: "address", type: "address", indexed: true },
            { name: "previousVotes", internalType: "uint256", type: "uint256", indexed: false },
            { name: "newVotes", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "DelegateVotesChanged",
    },
    { type: "event", anonymous: false, inputs: [], name: "EIP712DomainChanged" },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "from", internalType: "address", type: "address", indexed: true },
            { name: "to", internalType: "address", type: "address", indexed: true },
            { name: "value", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "Transfer",
    },
    { type: "error", inputs: [], name: "CheckpointUnorderedInsertion" },
    { type: "error", inputs: [], name: "ECDSAInvalidSignature" },
    {
        type: "error",
        inputs: [{ name: "length", internalType: "uint256", type: "uint256" }],
        name: "ECDSAInvalidSignatureLength",
    },
    {
        type: "error",
        inputs: [{ name: "s", internalType: "bytes32", type: "bytes32" }],
        name: "ECDSAInvalidSignatureS",
    },
    {
        type: "error",
        inputs: [
            { name: "increasedSupply", internalType: "uint256", type: "uint256" },
            { name: "cap", internalType: "uint256", type: "uint256" },
        ],
        name: "ERC20ExceededSafeSupply",
    },
    {
        type: "error",
        inputs: [
            { name: "spender", internalType: "address", type: "address" },
            { name: "allowance", internalType: "uint256", type: "uint256" },
            { name: "needed", internalType: "uint256", type: "uint256" },
        ],
        name: "ERC20InsufficientAllowance",
    },
    {
        type: "error",
        inputs: [
            { name: "sender", internalType: "address", type: "address" },
            { name: "balance", internalType: "uint256", type: "uint256" },
            { name: "needed", internalType: "uint256", type: "uint256" },
        ],
        name: "ERC20InsufficientBalance",
    },
    {
        type: "error",
        inputs: [{ name: "approver", internalType: "address", type: "address" }],
        name: "ERC20InvalidApprover",
    },
    {
        type: "error",
        inputs: [{ name: "receiver", internalType: "address", type: "address" }],
        name: "ERC20InvalidReceiver",
    },
    {
        type: "error",
        inputs: [{ name: "sender", internalType: "address", type: "address" }],
        name: "ERC20InvalidSender",
    },
    {
        type: "error",
        inputs: [{ name: "spender", internalType: "address", type: "address" }],
        name: "ERC20InvalidSpender",
    },
    {
        type: "error",
        inputs: [{ name: "deadline", internalType: "uint256", type: "uint256" }],
        name: "ERC2612ExpiredSignature",
    },
    {
        type: "error",
        inputs: [
            { name: "signer", internalType: "address", type: "address" },
            { name: "owner", internalType: "address", type: "address" },
        ],
        name: "ERC2612InvalidSigner",
    },
    {
        type: "error",
        inputs: [
            { name: "timepoint", internalType: "uint256", type: "uint256" },
            { name: "clock", internalType: "uint48", type: "uint48" },
        ],
        name: "ERC5805FutureLookup",
    },
    { type: "error", inputs: [], name: "ERC6372InconsistentClock" },
    {
        type: "error",
        inputs: [
            { name: "account", internalType: "address", type: "address" },
            { name: "currentNonce", internalType: "uint256", type: "uint256" },
        ],
        name: "InvalidAccountNonce",
    },
    { type: "error", inputs: [], name: "InvalidShortString" },
    { type: "error", inputs: [], name: "NotMinter" },
    {
        type: "error",
        inputs: [
            { name: "bits", internalType: "uint8", type: "uint8" },
            { name: "value", internalType: "uint256", type: "uint256" },
        ],
        name: "SafeCastOverflowedUintDowncast",
    },
    {
        type: "error",
        inputs: [{ name: "str", internalType: "string", type: "string" }],
        name: "StringTooLong",
    },
    {
        type: "error",
        inputs: [{ name: "expiry", internalType: "uint256", type: "uint256" }],
        name: "VotesExpiredSignature",
    },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GovernanceProcess
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const governanceProcessAbi = [
    { type: "constructor", inputs: [], stateMutability: "nonpayable" },
    {
        type: "function",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "activateProposal",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "adoptProposal",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "circleRegistry",
        outputs: [{ name: "", internalType: "contract CircleRegistry", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "daoGovernor",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "discardProposal",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256" },
            { name: "_description", internalType: "string", type: "string" },
        ],
        name: "escalateToDAO",
        outputs: [{ name: "_daoProposalId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "executeEscalatedProposal",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "getCircleProposals",
        outputs: [{ name: "_proposalIds", internalType: "uint256[]", type: "uint256[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_objectionId", internalType: "uint256", type: "uint256" }],
        name: "getObjection",
        outputs: [
            {
                name: "_objection",
                internalType: "struct HolacracyTypes.Objection",
                type: "tuple",
                components: [
                    { name: "id", internalType: "uint256", type: "uint256" },
                    { name: "proposalId", internalType: "uint256", type: "uint256" },
                    { name: "objectorRoleId", internalType: "uint256", type: "uint256" },
                    { name: "createdAt", internalType: "uint256", type: "uint256" },
                    { name: "isConstitutionalViolation", internalType: "bool", type: "bool" },
                    {
                        name: "status",
                        internalType: "enum HolacracyTypes.ObjectionStatus",
                        type: "uint8",
                    },
                    { name: "objector", internalType: "address", type: "address" },
                    { name: "concern", internalType: "string", type: "string" },
                    { name: "resolution", internalType: "string", type: "string" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_objectionId", internalType: "uint256", type: "uint256" },
            { name: "_fieldName", internalType: "bytes32", type: "bytes32" },
        ],
        name: "getObjectionContentRef",
        outputs: [
            {
                name: "_ref",
                internalType: "struct HolacracyTypes.ContentRef",
                type: "tuple",
                components: [
                    { name: "contentHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "visibility",
                        internalType: "enum HolacracyTypes.DataVisibility",
                        type: "uint8",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "getProposal",
        outputs: [
            {
                name: "_proposal",
                internalType: "struct HolacracyTypes.Proposal",
                type: "tuple",
                components: [
                    { name: "id", internalType: "uint256", type: "uint256" },
                    { name: "circleId", internalType: "uint256", type: "uint256" },
                    { name: "proposer", internalType: "address", type: "address" },
                    { name: "proposerRoleId", internalType: "uint256", type: "uint256" },
                    { name: "tension", internalType: "string", type: "string" },
                    { name: "example", internalType: "string", type: "string" },
                    { name: "explanation", internalType: "string", type: "string" },
                    {
                        name: "change",
                        internalType: "struct HolacracyTypes.GovernanceChange",
                        type: "tuple",
                        components: [
                            {
                                name: "changeType",
                                internalType: "enum HolacracyTypes.ChangeType",
                                type: "uint8",
                            },
                            { name: "targetId", internalType: "uint256", type: "uint256" },
                            { name: "encodedData", internalType: "bytes", type: "bytes" },
                        ],
                    },
                    {
                        name: "status",
                        internalType: "enum HolacracyTypes.ProposalStatus",
                        type: "uint8",
                    },
                    { name: "createdAt", internalType: "uint256", type: "uint256" },
                    { name: "resolvedAt", internalType: "uint256", type: "uint256" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256" },
            { name: "_fieldName", internalType: "bytes32", type: "bytes32" },
        ],
        name: "getProposalContentRef",
        outputs: [
            {
                name: "_ref",
                internalType: "struct HolacracyTypes.ContentRef",
                type: "tuple",
                components: [
                    { name: "contentHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "visibility",
                        internalType: "enum HolacracyTypes.DataVisibility",
                        type: "uint8",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "getProposalObjections",
        outputs: [{ name: "_objectionIds", internalType: "uint256[]", type: "uint256[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleRegistry", internalType: "contract CircleRegistry", type: "address" },
            { name: "_roleRegistry", internalType: "contract RoleRegistry", type: "address" },
        ],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_objectionId", internalType: "uint256", type: "uint256" }],
        name: "invalidateObjection",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "proposalCount",
        outputs: [{ name: "_count", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256" },
            { name: "_objectorRoleId", internalType: "uint256", type: "uint256" },
            { name: "_concern", internalType: "string", type: "string" },
            { name: "_isConstitutionalViolation", internalType: "bool", type: "bool" },
        ],
        name: "raiseObjection",
        outputs: [{ name: "_objectionId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256" },
            { name: "_objectorRoleId", internalType: "uint256", type: "uint256" },
            { name: "_concern", internalType: "string", type: "string" },
            { name: "_isConstitutionalViolation", internalType: "bool", type: "bool" },
            { name: "_fieldNames", internalType: "bytes32[]", type: "bytes32[]" },
            {
                name: "_refs",
                internalType: "struct HolacracyTypes.ContentRef[]",
                type: "tuple[]",
                components: [
                    { name: "contentHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "visibility",
                        internalType: "enum HolacracyTypes.DataVisibility",
                        type: "uint8",
                    },
                ],
            },
        ],
        name: "raiseObjectionWithRefs",
        outputs: [{ name: "_objectionId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_objectionId", internalType: "uint256", type: "uint256" },
            { name: "_resolution", internalType: "string", type: "string" },
        ],
        name: "resolveObjection",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_objectionId", internalType: "uint256", type: "uint256" },
            { name: "_resolution", internalType: "string", type: "string" },
            { name: "_fieldNames", internalType: "bytes32[]", type: "bytes32[]" },
            {
                name: "_refs",
                internalType: "struct HolacracyTypes.ContentRef[]",
                type: "tuple[]",
                components: [
                    { name: "contentHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "visibility",
                        internalType: "enum HolacracyTypes.DataVisibility",
                        type: "uint8",
                    },
                ],
            },
        ],
        name: "resolveObjectionWithRefs",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "roleRegistry",
        outputs: [{ name: "", internalType: "contract RoleRegistry", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_governor", internalType: "address", type: "address" },
            { name: "_timelock", internalType: "address", type: "address" },
        ],
        name: "setDAOGovernor",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_proposerRoleId", internalType: "uint256", type: "uint256" },
            { name: "_tension", internalType: "string", type: "string" },
            { name: "_example", internalType: "string", type: "string" },
            { name: "_explanation", internalType: "string", type: "string" },
            {
                name: "_change",
                internalType: "struct HolacracyTypes.GovernanceChange",
                type: "tuple",
                components: [
                    {
                        name: "changeType",
                        internalType: "enum HolacracyTypes.ChangeType",
                        type: "uint8",
                    },
                    { name: "targetId", internalType: "uint256", type: "uint256" },
                    { name: "encodedData", internalType: "bytes", type: "bytes" },
                ],
            },
        ],
        name: "submitProposal",
        outputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_proposerRoleId", internalType: "uint256", type: "uint256" },
            { name: "_tension", internalType: "string", type: "string" },
            { name: "_example", internalType: "string", type: "string" },
            { name: "_explanation", internalType: "string", type: "string" },
            {
                name: "_change",
                internalType: "struct HolacracyTypes.GovernanceChange",
                type: "tuple",
                components: [
                    {
                        name: "changeType",
                        internalType: "enum HolacracyTypes.ChangeType",
                        type: "uint8",
                    },
                    { name: "targetId", internalType: "uint256", type: "uint256" },
                    { name: "encodedData", internalType: "bytes", type: "bytes" },
                ],
            },
            { name: "_fieldNames", internalType: "bytes32[]", type: "bytes32[]" },
            {
                name: "_refs",
                internalType: "struct HolacracyTypes.ContentRef[]",
                type: "tuple[]",
                components: [
                    { name: "contentHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "visibility",
                        internalType: "enum HolacracyTypes.DataVisibility",
                        type: "uint8",
                    },
                ],
            },
        ],
        name: "submitProposalWithRefs",
        outputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "timelockController",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "withdrawProposal",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_entityType", internalType: "bytes32", type: "bytes32", indexed: true },
            { name: "_entityId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_fieldName", internalType: "bytes32", type: "bytes32", indexed: true },
            { name: "_contentHash", internalType: "bytes32", type: "bytes32", indexed: false },
            {
                name: "_visibility",
                internalType: "enum HolacracyTypes.DataVisibility",
                type: "uint8",
                indexed: false,
            },
        ],
        name: "ContentRefSet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_governor", internalType: "address", type: "address", indexed: true },
            { name: "_timelock", internalType: "address", type: "address", indexed: true },
        ],
        name: "DAOGovernorSet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_objectionId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
        ],
        name: "ObjectionInvalidated",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_objectionId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_objector", internalType: "address", type: "address", indexed: true },
        ],
        name: "ObjectionRaised",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_objectionId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
        ],
        name: "ObjectionResolved",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true }],
        name: "ProposalActivated",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true }],
        name: "ProposalAdopted",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true }],
        name: "ProposalDiscarded",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_daoProposalId", internalType: "uint256", type: "uint256", indexed: true },
        ],
        name: "ProposalEscalated",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_proposer", internalType: "address", type: "address", indexed: true },
        ],
        name: "ProposalSubmitted",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true }],
        name: "ProposalWithdrawn",
    },
    { type: "error", inputs: [], name: "GovernanceProcess_AlreadyInitialized" },
    { type: "error", inputs: [], name: "GovernanceProcess_ArrayLengthMismatch" },
    { type: "error", inputs: [], name: "GovernanceProcess_DAOAlreadySet" },
    { type: "error", inputs: [], name: "GovernanceProcess_DAONotSet" },
    { type: "error", inputs: [], name: "GovernanceProcess_EmptyTension" },
    {
        type: "error",
        inputs: [
            { name: "_objectionId", internalType: "uint256", type: "uint256" },
            {
                name: "_expected",
                internalType: "enum HolacracyTypes.ObjectionStatus",
                type: "uint8",
            },
        ],
        name: "GovernanceProcess_InvalidObjectionStatus",
    },
    {
        type: "error",
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256" },
            {
                name: "_expected",
                internalType: "enum HolacracyTypes.ProposalStatus",
                type: "uint8",
            },
        ],
        name: "GovernanceProcess_InvalidProposalStatus",
    },
    {
        type: "error",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_caller", internalType: "address", type: "address" },
        ],
        name: "GovernanceProcess_NotCircleMember",
    },
    {
        type: "error",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "GovernanceProcess_NotFacilitator",
    },
    {
        type: "error",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "GovernanceProcess_NotProposer",
    },
    { type: "error", inputs: [], name: "GovernanceProcess_NotTimelock" },
    {
        type: "error",
        inputs: [{ name: "_objectionId", internalType: "uint256", type: "uint256" }],
        name: "GovernanceProcess_ObjectionNotFound",
    },
    {
        type: "error",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "GovernanceProcess_ProposalNotFound",
    },
    {
        type: "error",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "GovernanceProcess_UnresolvedObjections",
    },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// HolGovernor
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const holGovernorAbi = [
    {
        type: "constructor",
        inputs: [
            { name: "_name", internalType: "string", type: "string" },
            { name: "_token", internalType: "contract IVotes", type: "address" },
            { name: "_timelock", internalType: "contract TimelockController", type: "address" },
            { name: "_votingDelay", internalType: "uint48", type: "uint48" },
            { name: "_votingPeriod", internalType: "uint32", type: "uint32" },
            { name: "_proposalThreshold", internalType: "uint256", type: "uint256" },
            { name: "_quorumNumerator", internalType: "uint256", type: "uint256" },
        ],
        stateMutability: "nonpayable",
    },
    { type: "receive", stateMutability: "payable" },
    {
        type: "function",
        inputs: [],
        name: "BALLOT_TYPEHASH",
        outputs: [{ name: "", internalType: "bytes32", type: "bytes32" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "CLOCK_MODE",
        outputs: [{ name: "", internalType: "string", type: "string" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "COUNTING_MODE",
        outputs: [{ name: "", internalType: "string", type: "string" }],
        stateMutability: "pure",
    },
    {
        type: "function",
        inputs: [],
        name: "EXTENDED_BALLOT_TYPEHASH",
        outputs: [{ name: "", internalType: "bytes32", type: "bytes32" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "targets", internalType: "address[]", type: "address[]" },
            { name: "values", internalType: "uint256[]", type: "uint256[]" },
            { name: "calldatas", internalType: "bytes[]", type: "bytes[]" },
            { name: "descriptionHash", internalType: "bytes32", type: "bytes32" },
        ],
        name: "cancel",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "proposalId", internalType: "uint256", type: "uint256" },
            { name: "support", internalType: "uint8", type: "uint8" },
        ],
        name: "castVote",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "proposalId", internalType: "uint256", type: "uint256" },
            { name: "support", internalType: "uint8", type: "uint8" },
            { name: "voter", internalType: "address", type: "address" },
            { name: "signature", internalType: "bytes", type: "bytes" },
        ],
        name: "castVoteBySig",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "proposalId", internalType: "uint256", type: "uint256" },
            { name: "support", internalType: "uint8", type: "uint8" },
            { name: "reason", internalType: "string", type: "string" },
        ],
        name: "castVoteWithReason",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "proposalId", internalType: "uint256", type: "uint256" },
            { name: "support", internalType: "uint8", type: "uint8" },
            { name: "reason", internalType: "string", type: "string" },
            { name: "params", internalType: "bytes", type: "bytes" },
        ],
        name: "castVoteWithReasonAndParams",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "proposalId", internalType: "uint256", type: "uint256" },
            { name: "support", internalType: "uint8", type: "uint8" },
            { name: "voter", internalType: "address", type: "address" },
            { name: "reason", internalType: "string", type: "string" },
            { name: "params", internalType: "bytes", type: "bytes" },
            { name: "signature", internalType: "bytes", type: "bytes" },
        ],
        name: "castVoteWithReasonAndParamsBySig",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "clock",
        outputs: [{ name: "", internalType: "uint48", type: "uint48" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "eip712Domain",
        outputs: [
            { name: "fields", internalType: "bytes1", type: "bytes1" },
            { name: "name", internalType: "string", type: "string" },
            { name: "version", internalType: "string", type: "string" },
            { name: "chainId", internalType: "uint256", type: "uint256" },
            { name: "verifyingContract", internalType: "address", type: "address" },
            { name: "salt", internalType: "bytes32", type: "bytes32" },
            { name: "extensions", internalType: "uint256[]", type: "uint256[]" },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "targets", internalType: "address[]", type: "address[]" },
            { name: "values", internalType: "uint256[]", type: "uint256[]" },
            { name: "calldatas", internalType: "bytes[]", type: "bytes[]" },
            { name: "descriptionHash", internalType: "bytes32", type: "bytes32" },
        ],
        name: "execute",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "payable",
    },
    {
        type: "function",
        inputs: [
            { name: "targets", internalType: "address[]", type: "address[]" },
            { name: "values", internalType: "uint256[]", type: "uint256[]" },
            { name: "calldatas", internalType: "bytes[]", type: "bytes[]" },
            { name: "descriptionHash", internalType: "bytes32", type: "bytes32" },
        ],
        name: "getProposalId",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "account", internalType: "address", type: "address" },
            { name: "timepoint", internalType: "uint256", type: "uint256" },
        ],
        name: "getVotes",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "account", internalType: "address", type: "address" },
            { name: "timepoint", internalType: "uint256", type: "uint256" },
            { name: "params", internalType: "bytes", type: "bytes" },
        ],
        name: "getVotesWithParams",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "proposalId", internalType: "uint256", type: "uint256" },
            { name: "account", internalType: "address", type: "address" },
        ],
        name: "hasVoted",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "targets", internalType: "address[]", type: "address[]" },
            { name: "values", internalType: "uint256[]", type: "uint256[]" },
            { name: "calldatas", internalType: "bytes[]", type: "bytes[]" },
            { name: "descriptionHash", internalType: "bytes32", type: "bytes32" },
        ],
        name: "hashProposal",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "pure",
    },
    {
        type: "function",
        inputs: [],
        name: "name",
        outputs: [{ name: "", internalType: "string", type: "string" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "owner", internalType: "address", type: "address" }],
        name: "nonces",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "", internalType: "address", type: "address" },
            { name: "", internalType: "address", type: "address" },
            { name: "", internalType: "uint256[]", type: "uint256[]" },
            { name: "", internalType: "uint256[]", type: "uint256[]" },
            { name: "", internalType: "bytes", type: "bytes" },
        ],
        name: "onERC1155BatchReceived",
        outputs: [{ name: "", internalType: "bytes4", type: "bytes4" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "", internalType: "address", type: "address" },
            { name: "", internalType: "address", type: "address" },
            { name: "", internalType: "uint256", type: "uint256" },
            { name: "", internalType: "uint256", type: "uint256" },
            { name: "", internalType: "bytes", type: "bytes" },
        ],
        name: "onERC1155Received",
        outputs: [{ name: "", internalType: "bytes4", type: "bytes4" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "", internalType: "address", type: "address" },
            { name: "", internalType: "address", type: "address" },
            { name: "", internalType: "uint256", type: "uint256" },
            { name: "", internalType: "bytes", type: "bytes" },
        ],
        name: "onERC721Received",
        outputs: [{ name: "", internalType: "bytes4", type: "bytes4" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "proposalId", internalType: "uint256", type: "uint256" }],
        name: "proposalDeadline",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "proposalId", internalType: "uint256", type: "uint256" }],
        name: "proposalEta",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "proposalId", internalType: "uint256", type: "uint256" }],
        name: "proposalNeedsQueuing",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "proposalId", internalType: "uint256", type: "uint256" }],
        name: "proposalProposer",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "proposalId", internalType: "uint256", type: "uint256" }],
        name: "proposalSnapshot",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "proposalThreshold",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "proposalId", internalType: "uint256", type: "uint256" }],
        name: "proposalVotes",
        outputs: [
            { name: "againstVotes", internalType: "uint256", type: "uint256" },
            { name: "forVotes", internalType: "uint256", type: "uint256" },
            { name: "abstainVotes", internalType: "uint256", type: "uint256" },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "targets", internalType: "address[]", type: "address[]" },
            { name: "values", internalType: "uint256[]", type: "uint256[]" },
            { name: "calldatas", internalType: "bytes[]", type: "bytes[]" },
            { name: "description", internalType: "string", type: "string" },
        ],
        name: "propose",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "targets", internalType: "address[]", type: "address[]" },
            { name: "values", internalType: "uint256[]", type: "uint256[]" },
            { name: "calldatas", internalType: "bytes[]", type: "bytes[]" },
            { name: "descriptionHash", internalType: "bytes32", type: "bytes32" },
        ],
        name: "queue",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "blockNumber", internalType: "uint256", type: "uint256" }],
        name: "quorum",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "quorumDenominator",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "timepoint", internalType: "uint256", type: "uint256" }],
        name: "quorumNumerator",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "quorumNumerator",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "target", internalType: "address", type: "address" },
            { name: "value", internalType: "uint256", type: "uint256" },
            { name: "data", internalType: "bytes", type: "bytes" },
        ],
        name: "relay",
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        inputs: [{ name: "newProposalThreshold", internalType: "uint256", type: "uint256" }],
        name: "setProposalThreshold",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "newVotingDelay", internalType: "uint48", type: "uint48" }],
        name: "setVotingDelay",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "newVotingPeriod", internalType: "uint32", type: "uint32" }],
        name: "setVotingPeriod",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "proposalId", internalType: "uint256", type: "uint256" }],
        name: "state",
        outputs: [{ name: "", internalType: "enum IGovernor.ProposalState", type: "uint8" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "interfaceId", internalType: "bytes4", type: "bytes4" }],
        name: "supportsInterface",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "timelock",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "token",
        outputs: [{ name: "", internalType: "contract IERC5805", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "newQuorumNumerator", internalType: "uint256", type: "uint256" }],
        name: "updateQuorumNumerator",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "newTimelock", internalType: "contract TimelockController", type: "address" },
        ],
        name: "updateTimelock",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "version",
        outputs: [{ name: "", internalType: "string", type: "string" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "votingDelay",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "votingPeriod",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    { type: "event", anonymous: false, inputs: [], name: "EIP712DomainChanged" },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "proposalId", internalType: "uint256", type: "uint256", indexed: false }],
        name: "ProposalCanceled",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "proposalId", internalType: "uint256", type: "uint256", indexed: false },
            { name: "proposer", internalType: "address", type: "address", indexed: false },
            { name: "targets", internalType: "address[]", type: "address[]", indexed: false },
            { name: "values", internalType: "uint256[]", type: "uint256[]", indexed: false },
            { name: "signatures", internalType: "string[]", type: "string[]", indexed: false },
            { name: "calldatas", internalType: "bytes[]", type: "bytes[]", indexed: false },
            { name: "voteStart", internalType: "uint256", type: "uint256", indexed: false },
            { name: "voteEnd", internalType: "uint256", type: "uint256", indexed: false },
            { name: "description", internalType: "string", type: "string", indexed: false },
        ],
        name: "ProposalCreated",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "proposalId", internalType: "uint256", type: "uint256", indexed: false }],
        name: "ProposalExecuted",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "proposalId", internalType: "uint256", type: "uint256", indexed: false },
            { name: "etaSeconds", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "ProposalQueued",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            {
                name: "oldProposalThreshold",
                internalType: "uint256",
                type: "uint256",
                indexed: false,
            },
            {
                name: "newProposalThreshold",
                internalType: "uint256",
                type: "uint256",
                indexed: false,
            },
        ],
        name: "ProposalThresholdSet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            {
                name: "oldQuorumNumerator",
                internalType: "uint256",
                type: "uint256",
                indexed: false,
            },
            {
                name: "newQuorumNumerator",
                internalType: "uint256",
                type: "uint256",
                indexed: false,
            },
        ],
        name: "QuorumNumeratorUpdated",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "oldTimelock", internalType: "address", type: "address", indexed: false },
            { name: "newTimelock", internalType: "address", type: "address", indexed: false },
        ],
        name: "TimelockChange",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "voter", internalType: "address", type: "address", indexed: true },
            { name: "proposalId", internalType: "uint256", type: "uint256", indexed: false },
            { name: "support", internalType: "uint8", type: "uint8", indexed: false },
            { name: "weight", internalType: "uint256", type: "uint256", indexed: false },
            { name: "reason", internalType: "string", type: "string", indexed: false },
        ],
        name: "VoteCast",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "voter", internalType: "address", type: "address", indexed: true },
            { name: "proposalId", internalType: "uint256", type: "uint256", indexed: false },
            { name: "support", internalType: "uint8", type: "uint8", indexed: false },
            { name: "weight", internalType: "uint256", type: "uint256", indexed: false },
            { name: "reason", internalType: "string", type: "string", indexed: false },
            { name: "params", internalType: "bytes", type: "bytes", indexed: false },
        ],
        name: "VoteCastWithParams",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "oldVotingDelay", internalType: "uint256", type: "uint256", indexed: false },
            { name: "newVotingDelay", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "VotingDelaySet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "oldVotingPeriod", internalType: "uint256", type: "uint256", indexed: false },
            { name: "newVotingPeriod", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "VotingPeriodSet",
    },
    { type: "error", inputs: [], name: "CheckpointUnorderedInsertion" },
    { type: "error", inputs: [], name: "FailedCall" },
    {
        type: "error",
        inputs: [{ name: "voter", internalType: "address", type: "address" }],
        name: "GovernorAlreadyCastVote",
    },
    {
        type: "error",
        inputs: [{ name: "proposalId", internalType: "uint256", type: "uint256" }],
        name: "GovernorAlreadyQueuedProposal",
    },
    { type: "error", inputs: [], name: "GovernorDisabledDeposit" },
    {
        type: "error",
        inputs: [
            { name: "proposer", internalType: "address", type: "address" },
            { name: "votes", internalType: "uint256", type: "uint256" },
            { name: "threshold", internalType: "uint256", type: "uint256" },
        ],
        name: "GovernorInsufficientProposerVotes",
    },
    {
        type: "error",
        inputs: [
            { name: "targets", internalType: "uint256", type: "uint256" },
            { name: "calldatas", internalType: "uint256", type: "uint256" },
            { name: "values", internalType: "uint256", type: "uint256" },
        ],
        name: "GovernorInvalidProposalLength",
    },
    {
        type: "error",
        inputs: [
            { name: "quorumNumerator", internalType: "uint256", type: "uint256" },
            { name: "quorumDenominator", internalType: "uint256", type: "uint256" },
        ],
        name: "GovernorInvalidQuorumFraction",
    },
    {
        type: "error",
        inputs: [{ name: "voter", internalType: "address", type: "address" }],
        name: "GovernorInvalidSignature",
    },
    { type: "error", inputs: [], name: "GovernorInvalidVoteParams" },
    { type: "error", inputs: [], name: "GovernorInvalidVoteType" },
    {
        type: "error",
        inputs: [{ name: "votingPeriod", internalType: "uint256", type: "uint256" }],
        name: "GovernorInvalidVotingPeriod",
    },
    {
        type: "error",
        inputs: [{ name: "proposalId", internalType: "uint256", type: "uint256" }],
        name: "GovernorNonexistentProposal",
    },
    {
        type: "error",
        inputs: [{ name: "proposalId", internalType: "uint256", type: "uint256" }],
        name: "GovernorNotQueuedProposal",
    },
    {
        type: "error",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "GovernorOnlyExecutor",
    },
    { type: "error", inputs: [], name: "GovernorQueueNotImplemented" },
    {
        type: "error",
        inputs: [{ name: "proposer", internalType: "address", type: "address" }],
        name: "GovernorRestrictedProposer",
    },
    {
        type: "error",
        inputs: [
            { name: "proposalId", internalType: "uint256", type: "uint256" },
            { name: "account", internalType: "address", type: "address" },
        ],
        name: "GovernorUnableToCancel",
    },
    {
        type: "error",
        inputs: [
            { name: "proposalId", internalType: "uint256", type: "uint256" },
            { name: "current", internalType: "enum IGovernor.ProposalState", type: "uint8" },
            { name: "expectedStates", internalType: "bytes32", type: "bytes32" },
        ],
        name: "GovernorUnexpectedProposalState",
    },
    {
        type: "error",
        inputs: [
            { name: "account", internalType: "address", type: "address" },
            { name: "currentNonce", internalType: "uint256", type: "uint256" },
        ],
        name: "InvalidAccountNonce",
    },
    { type: "error", inputs: [], name: "InvalidShortString" },
    {
        type: "error",
        inputs: [
            { name: "bits", internalType: "uint8", type: "uint8" },
            { name: "value", internalType: "uint256", type: "uint256" },
        ],
        name: "SafeCastOverflowedUintDowncast",
    },
    {
        type: "error",
        inputs: [{ name: "str", internalType: "string", type: "string" }],
        name: "StringTooLong",
    },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// HolGovernorFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const holGovernorFactoryAbi = [
    { type: "constructor", inputs: [], stateMutability: "nonpayable" },
    {
        type: "function",
        inputs: [],
        name: "COMPONENT_DEPLOYER",
        outputs: [{ name: "", internalType: "contract GovComponentDeployer", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            {
                name: "config",
                internalType: "struct HolGovernorFactory.DeploymentConfig",
                type: "tuple",
                components: [
                    { name: "tokenName", internalType: "string", type: "string" },
                    { name: "tokenSymbol", internalType: "string", type: "string" },
                    { name: "initialHolders", internalType: "address[]", type: "address[]" },
                    { name: "initialAmounts", internalType: "uint256[]", type: "uint256[]" },
                    { name: "timelockDelay", internalType: "uint256", type: "uint256" },
                    { name: "governorName", internalType: "string", type: "string" },
                    { name: "votingDelay", internalType: "uint48", type: "uint48" },
                    { name: "votingPeriod", internalType: "uint32", type: "uint32" },
                    { name: "proposalThreshold", internalType: "uint256", type: "uint256" },
                    { name: "quorumNumerator", internalType: "uint256", type: "uint256" },
                    { name: "subdomain", internalType: "string", type: "string" },
                    { name: "subdomainRegistrar", internalType: "address", type: "address" },
                ],
            },
        ],
        name: "deploy",
        outputs: [
            {
                name: "deployment",
                internalType: "struct HolGovernorFactory.Deployment",
                type: "tuple",
                components: [
                    { name: "token", internalType: "address", type: "address" },
                    { name: "timelock", internalType: "address", type: "address" },
                    { name: "governor", internalType: "address", type: "address" },
                ],
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "governor", internalType: "address", type: "address", indexed: true },
            { name: "token", internalType: "address", type: "address", indexed: true },
            { name: "timelock", internalType: "address", type: "address", indexed: true },
            { name: "governorName", internalType: "string", type: "string", indexed: false },
        ],
        name: "GovernorDeployed",
    },
    { type: "error", inputs: [], name: "ArrayLengthMismatch" },
    {
        type: "error",
        inputs: [{ name: "subdomain", internalType: "string", type: "string" }],
        name: "InvalidSubdomain",
    },
    { type: "error", inputs: [], name: "MissingENSRegistrar" },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IDAOGovernor
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const idaoGovernorAbi = [
    {
        type: "function",
        inputs: [
            { name: "targets", internalType: "address[]", type: "address[]" },
            { name: "values", internalType: "uint256[]", type: "uint256[]" },
            { name: "calldatas", internalType: "bytes[]", type: "bytes[]" },
            { name: "description", internalType: "string", type: "string" },
        ],
        name: "propose",
        outputs: [{ name: "proposalId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// OrganizationFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const organizationFactoryAbi = [
    {
        type: "constructor",
        inputs: [
            { name: "_roleRegistryImpl", internalType: "address", type: "address" },
            { name: "_circleRegistryImpl", internalType: "address", type: "address" },
            { name: "_governanceProcessImpl", internalType: "address", type: "address" },
            { name: "_govFactory", internalType: "address", type: "address" },
            { name: "_ensRegistrar", internalType: "address", type: "address" },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "ENS_REGISTRAR",
        outputs: [{ name: "", internalType: "contract IENSSubdomainRegistrar", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "GOV_FACTORY",
        outputs: [{ name: "", internalType: "contract HolGovernorFactory", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "TREASURY_DEPLOYER",
        outputs: [{ name: "", internalType: "contract TreasuryDeployer", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "circleRegistryImplementation",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_subname", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
            {
                name: "_govConfig",
                internalType: "struct IOrganizationFactory.GovernanceConfig",
                type: "tuple",
                components: [
                    { name: "tokenName", internalType: "string", type: "string" },
                    { name: "tokenSymbol", internalType: "string", type: "string" },
                    { name: "initialHolders", internalType: "address[]", type: "address[]" },
                    { name: "initialAmounts", internalType: "uint256[]", type: "uint256[]" },
                    { name: "timelockDelay", internalType: "uint256", type: "uint256" },
                    { name: "votingDelay", internalType: "uint48", type: "uint48" },
                    { name: "votingPeriod", internalType: "uint32", type: "uint32" },
                    { name: "proposalThreshold", internalType: "uint256", type: "uint256" },
                    { name: "quorumNumerator", internalType: "uint256", type: "uint256" },
                    { name: "treasuryTimelockDelay", internalType: "uint256", type: "uint256" },
                ],
            },
        ],
        name: "createOrganization",
        outputs: [{ name: "_orgId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_orgId", internalType: "uint256", type: "uint256" }],
        name: "getOrganization",
        outputs: [
            {
                name: "_org",
                internalType: "struct HolacracyTypes.Organization",
                type: "tuple",
                components: [
                    { name: "id", internalType: "uint256", type: "uint256" },
                    { name: "name", internalType: "string", type: "string" },
                    { name: "subname", internalType: "string", type: "string" },
                    { name: "creator", internalType: "address", type: "address" },
                    { name: "roleRegistry", internalType: "address", type: "address" },
                    { name: "circleRegistry", internalType: "address", type: "address" },
                    { name: "governanceProcess", internalType: "address", type: "address" },
                    { name: "accessManager", internalType: "address", type: "address" },
                    { name: "anchorCircleId", internalType: "uint256", type: "uint256" },
                    { name: "createdAt", internalType: "uint256", type: "uint256" },
                    { name: "governor", internalType: "address", type: "address" },
                    { name: "token", internalType: "address", type: "address" },
                    { name: "timelock", internalType: "address", type: "address" },
                    { name: "treasury", internalType: "address", type: "address" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_subname", internalType: "string", type: "string" }],
        name: "getOrganizationBySubname",
        outputs: [
            {
                name: "_org",
                internalType: "struct HolacracyTypes.Organization",
                type: "tuple",
                components: [
                    { name: "id", internalType: "uint256", type: "uint256" },
                    { name: "name", internalType: "string", type: "string" },
                    { name: "subname", internalType: "string", type: "string" },
                    { name: "creator", internalType: "address", type: "address" },
                    { name: "roleRegistry", internalType: "address", type: "address" },
                    { name: "circleRegistry", internalType: "address", type: "address" },
                    { name: "governanceProcess", internalType: "address", type: "address" },
                    { name: "accessManager", internalType: "address", type: "address" },
                    { name: "anchorCircleId", internalType: "uint256", type: "uint256" },
                    { name: "createdAt", internalType: "uint256", type: "uint256" },
                    { name: "governor", internalType: "address", type: "address" },
                    { name: "token", internalType: "address", type: "address" },
                    { name: "timelock", internalType: "address", type: "address" },
                    { name: "treasury", internalType: "address", type: "address" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "governanceProcessImplementation",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "organizationCount",
        outputs: [{ name: "_count", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "roleRegistryImplementation",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_circleRegistry", internalType: "address", type: "address", indexed: true },
            { name: "_roleRegistry", internalType: "address", type: "address", indexed: true },
            {
                name: "_governanceProcess",
                internalType: "address",
                type: "address",
                indexed: false,
            },
            { name: "_treasury", internalType: "address", type: "address", indexed: false },
        ],
        name: "OrgComponentsDeployed",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_subname", internalType: "string", type: "string", indexed: false },
            { name: "_creator", internalType: "address", type: "address", indexed: true },
        ],
        name: "OrganizationCreated",
    },
    { type: "error", inputs: [], name: "FailedDeployment" },
    {
        type: "error",
        inputs: [
            { name: "balance", internalType: "uint256", type: "uint256" },
            { name: "needed", internalType: "uint256", type: "uint256" },
        ],
        name: "InsufficientBalance",
    },
    {
        type: "error",
        inputs: [{ name: "_subname", internalType: "string", type: "string" }],
        name: "OrganizationFactory_InvalidSubname",
    },
    {
        type: "error",
        inputs: [{ name: "_subname", internalType: "string", type: "string" }],
        name: "OrganizationFactory_SubnameAlreadyTaken",
    },
    {
        type: "error",
        inputs: [{ name: "_subname", internalType: "string", type: "string" }],
        name: "OrganizationFactory_SubnameTooShort",
    },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// RoleRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const roleRegistryAbi = [
    { type: "constructor", inputs: [], stateMutability: "nonpayable" },
    {
        type: "function",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_lead", internalType: "address", type: "address" },
        ],
        name: "assignRoleLead",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "circleRegistry",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
            { name: "_domains", internalType: "string[]", type: "string[]" },
            { name: "_accountabilities", internalType: "string[]", type: "string[]" },
        ],
        name: "createRole",
        outputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
            { name: "_domains", internalType: "string[]", type: "string[]" },
            { name: "_accountabilities", internalType: "string[]", type: "string[]" },
            { name: "_fieldNames", internalType: "bytes32[]", type: "bytes32[]" },
            {
                name: "_refs",
                internalType: "struct HolacracyTypes.ContentRef[]",
                type: "tuple[]",
                components: [
                    { name: "contentHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "visibility",
                        internalType: "enum HolacracyTypes.DataVisibility",
                        type: "uint8",
                    },
                ],
            },
        ],
        name: "createRoleWithRefs",
        outputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "getCircleRoleIds",
        outputs: [{ name: "_roleIds", internalType: "uint256[]", type: "uint256[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "getRole",
        outputs: [
            {
                name: "_role",
                internalType: "struct HolacracyTypes.Role",
                type: "tuple",
                components: [
                    { name: "id", internalType: "uint256", type: "uint256" },
                    { name: "circleId", internalType: "uint256", type: "uint256" },
                    { name: "name", internalType: "string", type: "string" },
                    { name: "purpose", internalType: "string", type: "string" },
                    { name: "domains", internalType: "string[]", type: "string[]" },
                    { name: "accountabilities", internalType: "string[]", type: "string[]" },
                    { name: "exists", internalType: "bool", type: "bool" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "getRoleAccountabilities",
        outputs: [{ name: "_accountabilities", internalType: "string[]", type: "string[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_fieldName", internalType: "bytes32", type: "bytes32" },
        ],
        name: "getRoleContentRef",
        outputs: [
            {
                name: "_ref",
                internalType: "struct HolacracyTypes.ContentRef",
                type: "tuple",
                components: [
                    { name: "contentHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "visibility",
                        internalType: "enum HolacracyTypes.DataVisibility",
                        type: "uint8",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "getRoleDomains",
        outputs: [{ name: "_domains", internalType: "string[]", type: "string[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "getRoleLeads",
        outputs: [{ name: "_leads", internalType: "address[]", type: "address[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_account", internalType: "address", type: "address" },
        ],
        name: "isRoleLead",
        outputs: [{ name: "_isLead", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "removeRole",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "roleCount",
        outputs: [{ name: "_count", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_circleRegistry", internalType: "address", type: "address" }],
        name: "setCircleRegistry",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_lead", internalType: "address", type: "address" },
        ],
        name: "unassignRoleLead",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
            { name: "_domains", internalType: "string[]", type: "string[]" },
            { name: "_accountabilities", internalType: "string[]", type: "string[]" },
        ],
        name: "updateRole",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
            { name: "_domains", internalType: "string[]", type: "string[]" },
            { name: "_accountabilities", internalType: "string[]", type: "string[]" },
            { name: "_fieldNames", internalType: "bytes32[]", type: "bytes32[]" },
            {
                name: "_refs",
                internalType: "struct HolacracyTypes.ContentRef[]",
                type: "tuple[]",
                components: [
                    { name: "contentHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "visibility",
                        internalType: "enum HolacracyTypes.DataVisibility",
                        type: "uint8",
                    },
                ],
            },
        ],
        name: "updateRoleWithRefs",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_entityType", internalType: "bytes32", type: "bytes32", indexed: true },
            { name: "_entityId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_fieldName", internalType: "bytes32", type: "bytes32", indexed: true },
            { name: "_contentHash", internalType: "bytes32", type: "bytes32", indexed: false },
            {
                name: "_visibility",
                internalType: "enum HolacracyTypes.DataVisibility",
                type: "uint8",
                indexed: false,
            },
        ],
        name: "ContentRefSet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_name", internalType: "string", type: "string", indexed: false },
        ],
        name: "RoleCreated",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_lead", internalType: "address", type: "address", indexed: true },
        ],
        name: "RoleLeadAssigned",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_lead", internalType: "address", type: "address", indexed: true },
        ],
        name: "RoleLeadUnassigned",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
        ],
        name: "RoleRemoved",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256", indexed: true }],
        name: "RoleUpdated",
    },
    { type: "error", inputs: [], name: "RoleRegistry_AlreadyInitialized" },
    {
        type: "error",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_lead", internalType: "address", type: "address" },
        ],
        name: "RoleRegistry_AlreadyRoleLead",
    },
    { type: "error", inputs: [], name: "RoleRegistry_ArrayLengthMismatch" },
    { type: "error", inputs: [], name: "RoleRegistry_EmptyName" },
    { type: "error", inputs: [], name: "RoleRegistry_InvalidRole" },
    {
        type: "error",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_lead", internalType: "address", type: "address" },
        ],
        name: "RoleRegistry_NotRoleLead",
    },
    {
        type: "error",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "RoleRegistry_RoleNotFound",
    },
    { type: "error", inputs: [], name: "RoleRegistry_Unauthorized" },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TreasuryDeployer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const treasuryDeployerAbi = [
    {
        type: "function",
        inputs: [
            { name: "_circleRegistry", internalType: "contract CircleRegistry", type: "address" },
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_minDelay", internalType: "uint256", type: "uint256" },
        ],
        name: "deployTreasury",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "nonpayable",
    },
] as const;
