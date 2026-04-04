/** Event ABI fragments extracted from on-chain contracts */

export const circleRegistryEvents = [
    {
        type: "event",
        name: "AnchorCircleCreated",
        inputs: [
            { name: "_circleId", type: "uint256", indexed: true },
            { name: "_name", type: "string", indexed: false },
        ],
    },
    {
        type: "event",
        name: "SubCircleCreated",
        inputs: [
            { name: "_circleId", type: "uint256", indexed: true },
            { name: "_parentCircleId", type: "uint256", indexed: true },
            { name: "_roleId", type: "uint256", indexed: true },
        ],
    },
    {
        type: "event",
        name: "CircleRoleCreated",
        inputs: [
            { name: "_circleId", type: "uint256", indexed: true },
            { name: "_roleId", type: "uint256", indexed: true },
        ],
    },
    {
        type: "event",
        name: "ElectedRoleSet",
        inputs: [
            { name: "_circleId", type: "uint256", indexed: true },
            { name: "_electedRole", type: "uint8", indexed: true },
            { name: "_account", type: "address", indexed: false },
        ],
    },
    {
        type: "event",
        name: "CircleLeadAdded",
        inputs: [
            { name: "_circleId", type: "uint256", indexed: true },
            { name: "_lead", type: "address", indexed: true },
        ],
    },
    {
        type: "event",
        name: "CircleLeadRemoved",
        inputs: [
            { name: "_circleId", type: "uint256", indexed: true },
            { name: "_lead", type: "address", indexed: true },
        ],
    },
    {
        type: "event",
        name: "PolicyAdded",
        inputs: [
            { name: "_circleId", type: "uint256", indexed: true },
            { name: "_policyId", type: "uint256", indexed: true },
            { name: "_name", type: "string", indexed: false },
        ],
    },
    {
        type: "event",
        name: "PolicyRemoved",
        inputs: [
            { name: "_circleId", type: "uint256", indexed: true },
            { name: "_policyId", type: "uint256", indexed: true },
        ],
    },
    {
        type: "event",
        name: "RoleLeadAssignedViaCircle",
        inputs: [
            { name: "_circleId", type: "uint256", indexed: true },
            { name: "_roleId", type: "uint256", indexed: true },
            { name: "_lead", type: "address", indexed: true },
        ],
    },
] as const;

export const roleRegistryEvents = [
    {
        type: "event",
        name: "RoleCreated",
        inputs: [
            { name: "_roleId", type: "uint256", indexed: true },
            { name: "_circleId", type: "uint256", indexed: true },
            { name: "_name", type: "string", indexed: false },
        ],
    },
    {
        type: "event",
        name: "RoleUpdated",
        inputs: [{ name: "_roleId", type: "uint256", indexed: true }],
    },
    {
        type: "event",
        name: "RoleRemoved",
        inputs: [
            { name: "_roleId", type: "uint256", indexed: true },
            { name: "_circleId", type: "uint256", indexed: true },
        ],
    },
    {
        type: "event",
        name: "RoleLeadAssigned",
        inputs: [
            { name: "_roleId", type: "uint256", indexed: true },
            { name: "_lead", type: "address", indexed: true },
        ],
    },
    {
        type: "event",
        name: "RoleLeadUnassigned",
        inputs: [
            { name: "_roleId", type: "uint256", indexed: true },
            { name: "_lead", type: "address", indexed: true },
        ],
    },
] as const;

export const governanceProcessEvents = [
    {
        type: "event",
        name: "ProposalSubmitted",
        inputs: [
            { name: "_proposalId", type: "uint256", indexed: true },
            { name: "_circleId", type: "uint256", indexed: true },
            { name: "_proposer", type: "address", indexed: true },
        ],
    },
    {
        type: "event",
        name: "ProposalActivated",
        inputs: [{ name: "_proposalId", type: "uint256", indexed: true }],
    },
    {
        type: "event",
        name: "ObjectionRaised",
        inputs: [
            { name: "_objectionId", type: "uint256", indexed: true },
            { name: "_proposalId", type: "uint256", indexed: true },
            { name: "_objector", type: "address", indexed: true },
        ],
    },
    {
        type: "event",
        name: "ObjectionResolved",
        inputs: [
            { name: "_objectionId", type: "uint256", indexed: true },
            { name: "_proposalId", type: "uint256", indexed: true },
        ],
    },
    {
        type: "event",
        name: "ObjectionInvalidated",
        inputs: [
            { name: "_objectionId", type: "uint256", indexed: true },
            { name: "_proposalId", type: "uint256", indexed: true },
        ],
    },
    {
        type: "event",
        name: "ProposalAdopted",
        inputs: [{ name: "_proposalId", type: "uint256", indexed: true }],
    },
    {
        type: "event",
        name: "ProposalWithdrawn",
        inputs: [{ name: "_proposalId", type: "uint256", indexed: true }],
    },
    {
        type: "event",
        name: "ProposalDiscarded",
        inputs: [{ name: "_proposalId", type: "uint256", indexed: true }],
    },
] as const;

export const circleTreasuryEvents = [
    {
        type: "event",
        name: "Deposited",
        inputs: [
            { name: "_sender", type: "address", indexed: true },
            { name: "_amount", type: "uint256", indexed: false },
        ],
    },
    {
        type: "event",
        name: "TokenDeposited",
        inputs: [
            { name: "_sender", type: "address", indexed: true },
            { name: "_token", type: "address", indexed: true },
            { name: "_amount", type: "uint256", indexed: false },
        ],
    },
] as const;

export const contentRefEvents = [
    {
        type: "event",
        name: "ContentRefSet",
        inputs: [
            { name: "_entityType", type: "bytes32", indexed: true },
            { name: "_entityId", type: "uint256", indexed: true },
            { name: "_fieldName", type: "bytes32", indexed: true },
            { name: "_contentHash", type: "bytes32", indexed: false },
            { name: "_visibility", type: "uint8", indexed: false },
        ],
    },
] as const;

export const timelockControllerEvents = [
    {
        type: "event",
        name: "CallScheduled",
        inputs: [
            { name: "id", type: "bytes32", indexed: true },
            { name: "index", type: "uint256", indexed: true },
            { name: "target", type: "address", indexed: false },
            { name: "value", type: "uint256", indexed: false },
            { name: "data", type: "bytes", indexed: false },
            { name: "predecessor", type: "bytes32", indexed: false },
            { name: "delay", type: "uint256", indexed: false },
        ],
    },
    {
        type: "event",
        name: "CallExecuted",
        inputs: [
            { name: "id", type: "bytes32", indexed: true },
            { name: "index", type: "uint256", indexed: true },
            { name: "target", type: "address", indexed: false },
            { name: "value", type: "uint256", indexed: false },
            { name: "data", type: "bytes", indexed: false },
        ],
    },
    {
        type: "event",
        name: "Cancelled",
        inputs: [{ name: "id", type: "bytes32", indexed: true }],
    },
] as const;
