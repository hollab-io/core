export const CircleTreasuryAbi = [
    {
        type: "constructor",
        inputs: [
            {
                name: "_circleRegistry",
                type: "address",
                internalType: "contract CircleRegistry",
            },
            {
                name: "_circleId",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_minDelay",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "receive",
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "CIRCLE_ID",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "CIRCLE_REGISTRY",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract CircleRegistry",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "TIMELOCK",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract TimelockController",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "depositToken",
        inputs: [
            {
                name: "_token",
                type: "address",
                internalType: "contract IERC20",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "grantProposer",
        inputs: [
            {
                name: "_account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "revokeCanceller",
        inputs: [
            {
                name: "_account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "revokeProposer",
        inputs: [
            {
                name: "_account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "syncFacilitator",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "syncedFacilitator",
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
        name: "Deposited",
        inputs: [
            {
                name: "_sender",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "TokenDeposited",
        inputs: [
            {
                name: "_sender",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "_token",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "error",
        name: "CircleTreasury_ETHTransferFailed",
        inputs: [],
    },
    {
        type: "error",
        name: "CircleTreasury_NotCircleLead",
        inputs: [],
    },
    {
        type: "error",
        name: "CircleTreasury_NotFacilitator",
        inputs: [],
    },
    {
        type: "error",
        name: "SafeERC20FailedOperation",
        inputs: [
            {
                name: "token",
                type: "address",
                internalType: "address",
            },
        ],
    },
] as const;
