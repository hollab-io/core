//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ActionVoting
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const actionVotingAbi = [
    { type: "constructor", inputs: [], stateMutability: "nonpayable" },
    {
        type: "function",
        inputs: [
            { name: "_voteId", internalType: "uint256", type: "uint256" },
            { name: "_support", internalType: "enum HolacracyTypes.VoteSupport", type: "uint8" },
        ],
        name: "castVote",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_outputId", internalType: "uint256", type: "uint256" },
            { name: "_reason", internalType: "string", type: "string" },
            { name: "_duration", internalType: "uint256", type: "uint256" },
        ],
        name: "createVote",
        outputs: [{ name: "_voteId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "getCircleMintCap",
        outputs: [{ name: "_cap", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "getCircleMintedTotal",
        outputs: [{ name: "_total", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "getCircleQuorum",
        outputs: [{ name: "_quorum", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_collaborator", internalType: "address", type: "address" },
        ],
        name: "getCollaboratorWeight",
        outputs: [{ name: "_weight", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_voteId", internalType: "uint256", type: "uint256" },
            { name: "_voter", internalType: "address", type: "address" },
        ],
        name: "getVoteWeight",
        outputs: [{ name: "_weight", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "govToken",
        outputs: [{ name: "", internalType: "contract IVotes", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_collaborator", internalType: "address", type: "address" },
            { name: "_weight", internalType: "uint256", type: "uint256" },
        ],
        name: "grantCollaboratorWeight",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_voteId", internalType: "uint256", type: "uint256" },
            { name: "_voter", internalType: "address", type: "address" },
        ],
        name: "hasVoted",
        outputs: [{ name: "_voted", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_orgInstance", internalType: "address", type: "address" },
            { name: "", internalType: "address", type: "address" },
            { name: "_govToken", internalType: "address", type: "address" },
        ],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "org",
        outputs: [{ name: "", internalType: "contract IOrganizationInstance", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "orgId",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_collaborator", internalType: "address", type: "address" },
        ],
        name: "revokeCollaboratorWeight",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_cap", internalType: "uint256", type: "uint256" },
        ],
        name: "setCircleMintCap",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_quorum", internalType: "uint256", type: "uint256" },
        ],
        name: "setCircleQuorum",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_cap", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "CircleMintCapSet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_quorum", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "CircleQuorumSet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_collaborator", internalType: "address", type: "address", indexed: true },
            { name: "_weight", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "CollaboratorWeightGranted",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_collaborator", internalType: "address", type: "address", indexed: true },
        ],
        name: "CollaboratorWeightRevoked",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "version", internalType: "uint64", type: "uint64", indexed: false }],
        name: "Initialized",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_voteId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_voter", internalType: "address", type: "address", indexed: true },
            {
                name: "_support",
                internalType: "enum HolacracyTypes.VoteSupport",
                type: "uint8",
                indexed: false,
            },
            { name: "_weight", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "VoteCast",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_voteId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_outputId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_proposer", internalType: "address", type: "address", indexed: false },
            { name: "_deadline", internalType: "uint256", type: "uint256", indexed: false },
            { name: "_reason", internalType: "string", type: "string", indexed: false },
            { name: "_snapshotBlock", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "VoteCreated",
    },
    { type: "error", inputs: [], name: "ActionVoting_AlreadyInitialized" },
    {
        type: "error",
        inputs: [
            { name: "_voteId", internalType: "uint256", type: "uint256" },
            { name: "_voter", internalType: "address", type: "address" },
        ],
        name: "ActionVoting_AlreadyVoted",
    },
    { type: "error", inputs: [], name: "ActionVoting_EmptyReason" },
    { type: "error", inputs: [], name: "ActionVoting_InvalidDuration" },
    {
        type: "error",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_requested", internalType: "uint256", type: "uint256" },
            { name: "_remaining", internalType: "uint256", type: "uint256" },
        ],
        name: "ActionVoting_MintCapExceeded",
    },
    {
        type: "error",
        inputs: [
            { name: "_voteId", internalType: "uint256", type: "uint256" },
            { name: "_voter", internalType: "address", type: "address" },
        ],
        name: "ActionVoting_NoVotingPower",
    },
    {
        type: "error",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "ActionVoting_NotCircleLeadOrFacilitator",
    },
    {
        type: "error",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "ActionVoting_QuorumNotSet",
    },
    {
        type: "error",
        inputs: [{ name: "_voteId", internalType: "uint256", type: "uint256" }],
        name: "ActionVoting_VoteNotActive",
    },
    {
        type: "error",
        inputs: [{ name: "_voteId", internalType: "uint256", type: "uint256" }],
        name: "ActionVoting_VoteNotFound",
    },
    { type: "error", inputs: [], name: "ActionVoting_ZeroAddress" },
    { type: "error", inputs: [], name: "ActionVoting_ZeroAmount" },
    { type: "error", inputs: [], name: "InvalidInitialization" },
    { type: "error", inputs: [], name: "NotInitializing" },
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
            { name: "_owner", internalType: "address", type: "address" },
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
        inputs: [],
        name: "owner",
        outputs: [{ name: "", internalType: "address", type: "address" }],
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
        inputs: [],
        name: "renounceOwnership",
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
        type: "function",
        inputs: [{ name: "newOwner", internalType: "address", type: "address" }],
        name: "transferOwnership",
        outputs: [],
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
            { name: "previousOwner", internalType: "address", type: "address", indexed: true },
            { name: "newOwner", internalType: "address", type: "address", indexed: true },
        ],
        name: "OwnershipTransferred",
    },
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
        inputs: [{ name: "owner", internalType: "address", type: "address" }],
        name: "OwnableInvalidOwner",
    },
    {
        type: "error",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "OwnableUnauthorizedAccount",
    },
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
    { type: "error", inputs: [], name: "ZeroAddress" },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GovTokenDeployer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const govTokenDeployerAbi = [
    {
        type: "function",
        inputs: [
            { name: "_name", internalType: "string", type: "string" },
            { name: "_symbol", internalType: "string", type: "string" },
            { name: "_minter", internalType: "address", type: "address" },
        ],
        name: "deploy",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "nonpayable",
    },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MeetingComponentsFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x876C1eDF90e1BcdFC3488a53Ce3EFf1759D27D25)
 * - [__View Contract on 0 G Galileo Testnet 0 G Block Chain Explorer__](https://chainscan-galileo.0g.ai/address/0xc7808AE1Bd393cc1d193eB48332Ab46bD01Ecf6C)
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAd8223B6e9da5Cf0b4aE03d325CC385Fd1f6a825)
 */
export const meetingComponentsFactoryAbi = [
    {
        type: "constructor",
        inputs: [
            { name: "_meetingFactoryImpl", internalType: "address", type: "address" },
            { name: "_actionVotingImpl", internalType: "address", type: "address" },
            { name: "_roleDataRegistryImpl", internalType: "address", type: "address" },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "actionVotingImplementation",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_subname", internalType: "string", type: "string" },
            { name: "_orgFactory", internalType: "address", type: "address" },
        ],
        name: "deploy",
        outputs: [
            {
                name: "deployment",
                internalType: "struct IMeetingComponentsFactory.Deployment",
                type: "tuple",
                components: [
                    { name: "meetingFactory", internalType: "address", type: "address" },
                    { name: "actionVoting", internalType: "address", type: "address" },
                    { name: "roleDataRegistry", internalType: "address", type: "address" },
                ],
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "meetingFactoryImplementation",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "roleDataRegistryImplementation",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_meetingFactory", internalType: "address", type: "address", indexed: true },
            { name: "_actionVoting", internalType: "address", type: "address", indexed: false },
            { name: "_roleDataRegistry", internalType: "address", type: "address", indexed: false },
        ],
        name: "MeetingComponentsDeployed",
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
        name: "MeetingComponentsFactory_OrgNotFound",
    },
    { type: "error", inputs: [], name: "MeetingComponentsFactory_Unauthorized" },
    { type: "error", inputs: [], name: "MeetingComponentsFactory_ZeroAddress" },
] as const;

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x876C1eDF90e1BcdFC3488a53Ce3EFf1759D27D25)
 * - [__View Contract on 0 G Galileo Testnet 0 G Block Chain Explorer__](https://chainscan-galileo.0g.ai/address/0xc7808AE1Bd393cc1d193eB48332Ab46bD01Ecf6C)
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAd8223B6e9da5Cf0b4aE03d325CC385Fd1f6a825)
 */
export const meetingComponentsFactoryAddress = {
    1: "0x876C1eDF90e1BcdFC3488a53Ce3EFf1759D27D25",
    16602: "0xc7808AE1Bd393cc1d193eB48332Ab46bD01Ecf6C",
    31337: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
    11155111: "0xAd8223B6e9da5Cf0b4aE03d325CC385Fd1f6a825",
} as const;

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x876C1eDF90e1BcdFC3488a53Ce3EFf1759D27D25)
 * - [__View Contract on 0 G Galileo Testnet 0 G Block Chain Explorer__](https://chainscan-galileo.0g.ai/address/0xc7808AE1Bd393cc1d193eB48332Ab46bD01Ecf6C)
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAd8223B6e9da5Cf0b4aE03d325CC385Fd1f6a825)
 */
export const meetingComponentsFactoryConfig = {
    address: meetingComponentsFactoryAddress,
    abi: meetingComponentsFactoryAbi,
} as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MeetingFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const meetingFactoryAbi = [
    { type: "constructor", inputs: [], stateMutability: "nonpayable" },
    {
        type: "function",
        inputs: [],
        name: "DEFAULT_PROPOSAL_MAX_AGE",
        outputs: [{ name: "", internalType: "uint64", type: "uint64" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "MAX_CONTENT_REFS",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "MAX_PROPOSAL_MAX_AGE",
        outputs: [{ name: "", internalType: "uint64", type: "uint64" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "MIN_PROPOSAL_MAX_AGE",
        outputs: [{ name: "", internalType: "uint64", type: "uint64" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "adoptProposal",
        outputs: [{ name: "_resultId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_proposerRoleId", internalType: "uint256", type: "uint256" },
            { name: "_tensionHash", internalType: "bytes32", type: "bytes32" },
            { name: "_changeType", internalType: "enum HolacracyTypes.ChangeType", type: "uint8" },
            { name: "_changeData", internalType: "bytes", type: "bytes" },
        ],
        name: "createProposal",
        outputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_proposerRoleId", internalType: "uint256", type: "uint256" },
            { name: "_tensionText", internalType: "string", type: "string" },
            { name: "_changeType", internalType: "enum HolacracyTypes.ChangeType", type: "uint8" },
            { name: "_changeData", internalType: "bytes", type: "bytes" },
        ],
        name: "createProposalWithTension",
        outputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "discardExpiredProposal",
        outputs: [],
        stateMutability: "nonpayable",
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
            { name: "_meetingId", internalType: "uint256", type: "uint256" },
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_kind", internalType: "enum IMeetingFactory.MeetingKind", type: "uint8" },
        ],
        name: "endMeeting",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_objectionId", internalType: "uint256", type: "uint256" }],
        name: "getObjection",
        outputs: [
            {
                name: "_objection",
                internalType: "struct IMeetingFactory.ObjectionRecord",
                type: "tuple",
                components: [
                    { name: "id", internalType: "uint256", type: "uint256" },
                    { name: "proposalId", internalType: "uint256", type: "uint256" },
                    { name: "objectorRoleId", internalType: "uint256", type: "uint256" },
                    { name: "objector", internalType: "address", type: "address" },
                    { name: "raisedAt", internalType: "uint64", type: "uint64" },
                    { name: "resolvedAt", internalType: "uint64", type: "uint64" },
                    { name: "concernHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "status",
                        internalType: "enum HolacracyTypes.ObjectionStatus",
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
                internalType: "struct IMeetingFactory.ProposalRecord",
                type: "tuple",
                components: [
                    { name: "id", internalType: "uint256", type: "uint256" },
                    { name: "orgId", internalType: "uint256", type: "uint256" },
                    { name: "circleId", internalType: "uint256", type: "uint256" },
                    { name: "proposer", internalType: "address", type: "address" },
                    { name: "submittedAt", internalType: "uint64", type: "uint64" },
                    { name: "resolvedAt", internalType: "uint64", type: "uint64" },
                    { name: "proposerRoleId", internalType: "uint256", type: "uint256" },
                    { name: "tensionHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "changeType",
                        internalType: "enum HolacracyTypes.ChangeType",
                        type: "uint8",
                    },
                    {
                        name: "status",
                        internalType: "enum HolacracyTypes.ProposalStatus",
                        type: "uint8",
                    },
                    { name: "changeData", internalType: "bytes", type: "bytes" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_orgInstance", internalType: "address", type: "address" },
            { name: "_roleRegistry", internalType: "address", type: "address" },
        ],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "isFacilitatorElected",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "isSecretaryElected",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_meetingId", internalType: "uint256", type: "uint256" },
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_proposalId", internalType: "uint256", type: "uint256" },
        ],
        name: "linkProposal",
        outputs: [{ name: "_itemId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "objectionCount",
        outputs: [{ name: "_count", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "org",
        outputs: [{ name: "", internalType: "contract IOrganizationInstance", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "orgId",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
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
        inputs: [],
        name: "proposalMaxAge",
        outputs: [{ name: "", internalType: "uint64", type: "uint64" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256" },
            { name: "_objectorRoleId", internalType: "uint256", type: "uint256" },
            { name: "_concernHash", internalType: "bytes32", type: "bytes32" },
        ],
        name: "raiseObjection",
        outputs: [{ name: "_objectionId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_meetingId", internalType: "uint256", type: "uint256" },
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_outputType", internalType: "enum HolacracyTypes.OutputType", type: "uint8" },
            { name: "_description", internalType: "string", type: "string" },
            { name: "_assignedTo", internalType: "address", type: "address" },
            { name: "_roleId", internalType: "uint256", type: "uint256" },
        ],
        name: "recordOutput",
        outputs: [{ name: "_itemId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_objectionId", internalType: "uint256", type: "uint256" }],
        name: "resolveObjection",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "roleRegistry",
        outputs: [{ name: "", internalType: "contract IRoleRegistry", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_facilitator", internalType: "address", type: "address" },
        ],
        name: "setCircleFacilitator",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_secretary", internalType: "address", type: "address" },
        ],
        name: "setCircleSecretary",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_newAge", internalType: "uint64", type: "uint64" }],
        name: "setProposalMaxAge",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_kind", internalType: "enum IMeetingFactory.MeetingKind", type: "uint8" },
        ],
        name: "startMeeting",
        outputs: [{ name: "_meetingId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "strikeProposal",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_facilitator", internalType: "address", type: "address", indexed: true },
        ],
        name: "CircleFacilitatorSet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_secretary", internalType: "address", type: "address", indexed: true },
        ],
        name: "CircleSecretarySet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_facilitator", internalType: "address", type: "address", indexed: true },
            {
                name: "_previousFacilitator",
                internalType: "address",
                type: "address",
                indexed: false,
            },
        ],
        name: "FacilitatorElected",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "version", internalType: "uint64", type: "uint64", indexed: false }],
        name: "Initialized",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_meetingId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            {
                name: "_kind",
                internalType: "enum IMeetingFactory.MeetingKind",
                type: "uint8",
                indexed: true,
            },
            { name: "_endedBy", internalType: "address", type: "address", indexed: false },
            { name: "_timestamp", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "MeetingEnded",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_meetingId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_itemId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            {
                name: "_outputType",
                internalType: "enum HolacracyTypes.OutputType",
                type: "uint8",
                indexed: false,
            },
            { name: "_assignedTo", internalType: "address", type: "address", indexed: false },
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: false },
            { name: "_description", internalType: "string", type: "string", indexed: false },
        ],
        name: "MeetingOutputRecorded",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_meetingId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_itemId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "MeetingProposalLinked",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_meetingId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            {
                name: "_kind",
                internalType: "enum IMeetingFactory.MeetingKind",
                type: "uint8",
                indexed: true,
            },
            { name: "_startedBy", internalType: "address", type: "address", indexed: false },
            { name: "_timestamp", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "MeetingStarted",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_objectionId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_objector", internalType: "address", type: "address", indexed: true },
            { name: "_objectorRoleId", internalType: "uint256", type: "uint256", indexed: false },
            { name: "_concernHash", internalType: "bytes32", type: "bytes32", indexed: false },
        ],
        name: "ObjectionRaised",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_objectionId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_resolvedBy", internalType: "address", type: "address", indexed: false },
        ],
        name: "ObjectionResolved",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_resultId", internalType: "uint256", type: "uint256", indexed: false },
            { name: "_adoptedBy", internalType: "address", type: "address", indexed: false },
        ],
        name: "ProposalAdopted",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_proposer", internalType: "address", type: "address", indexed: false },
            { name: "_proposerRoleId", internalType: "uint256", type: "uint256", indexed: false },
            { name: "_tensionHash", internalType: "bytes32", type: "bytes32", indexed: false },
            { name: "_changeType", internalType: "uint8", type: "uint8", indexed: false },
            { name: "_changeData", internalType: "bytes", type: "bytes", indexed: false },
        ],
        name: "ProposalCreated",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_discardedBy", internalType: "address", type: "address", indexed: false },
        ],
        name: "ProposalDiscarded",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_oldAge", internalType: "uint64", type: "uint64", indexed: false },
            { name: "_newAge", internalType: "uint64", type: "uint64", indexed: false },
            { name: "_by", internalType: "address", type: "address", indexed: true },
        ],
        name: "ProposalMaxAgeUpdated",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_secretary", internalType: "address", type: "address", indexed: true },
        ],
        name: "ProposalStruck",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_text", internalType: "string", type: "string", indexed: false },
        ],
        name: "ProposalTensionPublished",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_secretary", internalType: "address", type: "address", indexed: true },
            {
                name: "_previousSecretary",
                internalType: "address",
                type: "address",
                indexed: false,
            },
        ],
        name: "SecretaryElected",
    },
    { type: "error", inputs: [], name: "InvalidInitialization" },
    { type: "error", inputs: [], name: "MeetingFactory_AlreadyInitialized" },
    {
        type: "error",
        inputs: [
            { name: "_proposalCircleId", internalType: "uint256", type: "uint256" },
            { name: "_targetCircleId", internalType: "uint256", type: "uint256" },
        ],
        name: "MeetingFactory_ChangeCircleMismatch",
    },
    {
        type: "error",
        inputs: [
            { name: "proposalCircle", internalType: "uint256", type: "uint256" },
            { name: "targetCircle", internalType: "uint256", type: "uint256" },
        ],
        name: "MeetingFactory_ChangeCircleMismatch",
    },
    { type: "error", inputs: [], name: "MeetingFactory_EmptyString" },
    {
        type: "error",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "MeetingFactory_FacilitatorAlreadyElected",
    },
    {
        type: "error",
        inputs: [
            { name: "_objectionId", internalType: "uint256", type: "uint256" },
            { name: "_status", internalType: "enum HolacracyTypes.ObjectionStatus", type: "uint8" },
        ],
        name: "MeetingFactory_InvalidObjectionStatus",
    },
    {
        type: "error",
        inputs: [
            { name: "_provided", internalType: "uint64", type: "uint64" },
            { name: "_min", internalType: "uint64", type: "uint64" },
            { name: "_max", internalType: "uint64", type: "uint64" },
        ],
        name: "MeetingFactory_InvalidProposalMaxAge",
    },
    {
        type: "error",
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256" },
            { name: "_status", internalType: "enum HolacracyTypes.ProposalStatus", type: "uint8" },
        ],
        name: "MeetingFactory_InvalidProposalStatus",
    },
    {
        type: "error",
        inputs: [
            { name: "_objectionId", internalType: "uint256", type: "uint256" },
            { name: "_caller", internalType: "address", type: "address" },
        ],
        name: "MeetingFactory_NotObjectorOrFacilitator",
    },
    {
        type: "error",
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_caller", internalType: "address", type: "address" },
        ],
        name: "MeetingFactory_NotOrgAdmin",
    },
    {
        type: "error",
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_caller", internalType: "address", type: "address" },
        ],
        name: "MeetingFactory_NotOrgMember",
    },
    {
        type: "error",
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256" },
            { name: "_caller", internalType: "address", type: "address" },
        ],
        name: "MeetingFactory_NotProposerOrFacilitator",
    },
    {
        type: "error",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_caller", internalType: "address", type: "address" },
        ],
        name: "MeetingFactory_NotRoleLead",
    },
    {
        type: "error",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_caller", internalType: "address", type: "address" },
        ],
        name: "MeetingFactory_NotSecretary",
    },
    {
        type: "error",
        inputs: [{ name: "_objectionId", internalType: "uint256", type: "uint256" }],
        name: "MeetingFactory_ObjectionNotFound",
    },
    {
        type: "error",
        inputs: [
            { name: "_objectorRoleId", internalType: "uint256", type: "uint256" },
            { name: "_circleId", internalType: "uint256", type: "uint256" },
        ],
        name: "MeetingFactory_ObjectorRoleNotInCircle",
    },
    {
        type: "error",
        inputs: [
            { name: "_expected", internalType: "uint256", type: "uint256" },
            { name: "_provided", internalType: "uint256", type: "uint256" },
        ],
        name: "MeetingFactory_OrgIdMismatch",
    },
    {
        type: "error",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "MeetingFactory_ProposalExpired",
    },
    {
        type: "error",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "MeetingFactory_ProposalNotExpired",
    },
    {
        type: "error",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "MeetingFactory_ProposalNotFound",
    },
    {
        type: "error",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "MeetingFactory_SecretaryAlreadyElected",
    },
    {
        type: "error",
        inputs: [
            { name: "_length", internalType: "uint256", type: "uint256" },
            { name: "_max", internalType: "uint256", type: "uint256" },
        ],
        name: "MeetingFactory_TooManyContentRefs",
    },
    {
        type: "error",
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256" },
            { name: "_count", internalType: "uint256", type: "uint256" },
        ],
        name: "MeetingFactory_UnresolvedObjections",
    },
    { type: "error", inputs: [], name: "MeetingFactory_UnsupportedChangeType" },
    { type: "error", inputs: [], name: "NotInitializing" },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// OrganizationFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC0252342923238CF5509cfBd2fa46A45ADeDc921)
 * - [__View Contract on 0 G Galileo Testnet 0 G Block Chain Explorer__](https://chainscan-galileo.0g.ai/address/0x27127651B812604eff832cD726B241D4E2D20EE0)
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEdB4Da78b5C759a651a72F8E4cEF07E606FfF051)
 */
export const organizationFactoryAbi = [
    {
        type: "constructor",
        inputs: [
            { name: "_roleRegistryImpl", internalType: "address", type: "address" },
            { name: "_orgInstanceImpl", internalType: "address", type: "address" },
            { name: "_ensRegistrar", internalType: "address", type: "address" },
            { name: "_meetingComponentsFactory", internalType: "address", type: "address" },
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
        name: "TOKEN_DEPLOYER",
        outputs: [{ name: "", internalType: "contract GovTokenDeployer", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_subname", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
            {
                name: "_tokenConfig",
                internalType: "struct IOrganizationFactory.TokenConfig",
                type: "tuple",
                components: [
                    { name: "tokenName", internalType: "string", type: "string" },
                    { name: "tokenSymbol", internalType: "string", type: "string" },
                    { name: "initialHolders", internalType: "address[]", type: "address[]" },
                    { name: "initialAmounts", internalType: "uint256[]", type: "uint256[]" },
                ],
            },
        ],
        name: "createOrganization",
        outputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_instance", internalType: "address", type: "address" },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_orgId", internalType: "uint256", type: "uint256" }],
        name: "getOrganization",
        outputs: [{ name: "_instance", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_subname", internalType: "string", type: "string" }],
        name: "getOrganizationBySubname",
        outputs: [{ name: "_instance", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "meetingComponentsFactory",
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
        name: "organizationInstanceImplementation",
        outputs: [{ name: "", internalType: "address", type: "address" }],
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
            { name: "_subname", internalType: "string", type: "string", indexed: false },
            { name: "_creator", internalType: "address", type: "address", indexed: true },
            { name: "_instance", internalType: "address", type: "address", indexed: true },
            { name: "_roleRegistry", internalType: "address", type: "address", indexed: false },
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
    { type: "error", inputs: [], name: "OrganizationFactory_ArrayLengthMismatch" },
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

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC0252342923238CF5509cfBd2fa46A45ADeDc921)
 * - [__View Contract on 0 G Galileo Testnet 0 G Block Chain Explorer__](https://chainscan-galileo.0g.ai/address/0x27127651B812604eff832cD726B241D4E2D20EE0)
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEdB4Da78b5C759a651a72F8E4cEF07E606FfF051)
 */
export const organizationFactoryAddress = {
    1: "0xC0252342923238CF5509cfBd2fa46A45ADeDc921",
    16602: "0x27127651B812604eff832cD726B241D4E2D20EE0",
    31337: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    11155111: "0xEdB4Da78b5C759a651a72F8E4cEF07E606FfF051",
} as const;

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC0252342923238CF5509cfBd2fa46A45ADeDc921)
 * - [__View Contract on 0 G Galileo Testnet 0 G Block Chain Explorer__](https://chainscan-galileo.0g.ai/address/0x27127651B812604eff832cD726B241D4E2D20EE0)
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEdB4Da78b5C759a651a72F8E4cEF07E606FfF051)
 */
export const organizationFactoryConfig = {
    address: organizationFactoryAddress,
    abi: organizationFactoryAbi,
} as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// OrganizationInstance
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const organizationInstanceAbi = [
    { type: "constructor", inputs: [], stateMutability: "nonpayable" },
    {
        type: "function",
        inputs: [],
        name: "accessManager",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "addAdmin",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "addMember",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "adminCount",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "anchorCircleId",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "requester", internalType: "address", type: "address" }],
        name: "approveJoinRequest",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "createdAt",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "creator",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "creator_",
        outputs: [{ name: "", internalType: "string", type: "string" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "getAgentIdentity",
        outputs: [
            { name: "agentRegistry", internalType: "address", type: "address" },
            { name: "agentId", internalType: "uint256", type: "uint256" },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "requester", internalType: "address", type: "address" }],
        name: "hasPendingRequest",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "id",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            {
                name: "params",
                internalType: "struct IOrganizationInstance.InitParams",
                type: "tuple",
                components: [
                    { name: "id", internalType: "uint256", type: "uint256" },
                    { name: "subname", internalType: "string", type: "string" },
                    { name: "purpose", internalType: "string", type: "string" },
                    { name: "creator", internalType: "address", type: "address" },
                    { name: "roleRegistry", internalType: "address", type: "address" },
                    { name: "accessManager", internalType: "address", type: "address" },
                    { name: "token", internalType: "address", type: "address" },
                    { name: "anchorCircleId", internalType: "uint256", type: "uint256" },
                    { name: "meetingComponentsFactory", internalType: "address", type: "address" },
                ],
            },
        ],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "isAdmin",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "isMember",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "agentRegistry", internalType: "address", type: "address" },
            { name: "agentId", internalType: "uint256", type: "uint256" },
        ],
        name: "linkAgentIdentity",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "meetingComponentsFactory",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "meetingFactory",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "requester", internalType: "address", type: "address" }],
        name: "rejectJoinRequest",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "removeAdmin",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "removeMember",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "message", internalType: "string", type: "string" }],
        name: "requestToJoin",
        outputs: [{ name: "requestId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "roleRegistry",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_meetingFactory", internalType: "address", type: "address" }],
        name: "setMeetingFactory",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "governanceProcess", internalType: "address", type: "address" }],
        name: "setRoleRegistryGovernanceProcess",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "subname",
        outputs: [{ name: "", internalType: "string", type: "string" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "summary",
        outputs: [
            {
                name: "",
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
                    { name: "meetingFactory", internalType: "address", type: "address" },
                    { name: "accessManager", internalType: "address", type: "address" },
                    { name: "anchorCircleId", internalType: "uint256", type: "uint256" },
                    { name: "createdAt", internalType: "uint256", type: "uint256" },
                    { name: "token", internalType: "address", type: "address" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "token",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "account", internalType: "address", type: "address", indexed: true }],
        name: "AdminAdded",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "account", internalType: "address", type: "address", indexed: true }],
        name: "AdminRemoved",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "account", internalType: "address", type: "address", indexed: true },
            { name: "agentRegistry", internalType: "address", type: "address", indexed: true },
            { name: "agentId", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "AgentIdentityLinked",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "version", internalType: "uint64", type: "uint64", indexed: false }],
        name: "Initialized",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "requestId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "requester", internalType: "address", type: "address", indexed: true },
        ],
        name: "JoinApproved",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "requestId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "requester", internalType: "address", type: "address", indexed: true },
        ],
        name: "JoinRejected",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "requestId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "requester", internalType: "address", type: "address", indexed: true },
            { name: "message", internalType: "string", type: "string", indexed: false },
        ],
        name: "JoinRequested",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "meetingFactory", internalType: "address", type: "address", indexed: true },
        ],
        name: "MeetingFactorySet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "account", internalType: "address", type: "address", indexed: true }],
        name: "MemberAdded",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "account", internalType: "address", type: "address", indexed: true }],
        name: "MemberRemoved",
    },
    { type: "error", inputs: [], name: "InvalidInitialization" },
    { type: "error", inputs: [], name: "NotInitializing" },
    {
        type: "error",
        inputs: [
            { name: "agentId", internalType: "uint256", type: "uint256" },
            { name: "caller", internalType: "address", type: "address" },
        ],
        name: "OrganizationInstance_AgentNotOwner",
    },
    { type: "error", inputs: [], name: "OrganizationInstance_AlreadyInitialized" },
    {
        type: "error",
        inputs: [{ name: "requester", internalType: "address", type: "address" }],
        name: "OrganizationInstance_JoinRequestAlreadyPending",
    },
    {
        type: "error",
        inputs: [{ name: "requester", internalType: "address", type: "address" }],
        name: "OrganizationInstance_JoinRequestNotFound",
    },
    { type: "error", inputs: [], name: "OrganizationInstance_LastAdmin" },
    { type: "error", inputs: [], name: "OrganizationInstance_MeetingFactoryAlreadySet" },
    { type: "error", inputs: [], name: "OrganizationInstance_Unauthorized" },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// RoleDataRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const roleDataRegistryAbi = [
    { type: "constructor", inputs: [], stateMutability: "nonpayable" },
    {
        type: "function",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_label", internalType: "string", type: "string" },
        ],
        name: "addChecklistItem",
        outputs: [{ name: "_itemId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_label", internalType: "string", type: "string" },
        ],
        name: "addMetric",
        outputs: [{ name: "_metricId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "checklistItemCount",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_itemId", internalType: "uint256", type: "uint256" }],
        name: "getChecklistItem",
        outputs: [
            {
                name: "_item",
                internalType: "struct HolacracyTypes.ChecklistItem",
                type: "tuple",
                components: [
                    { name: "id", internalType: "uint256", type: "uint256" },
                    { name: "roleId", internalType: "uint256", type: "uint256" },
                    { name: "label", internalType: "string", type: "string" },
                    { name: "exists", internalType: "bool", type: "bool" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "getChecklistItemsByRole",
        outputs: [{ name: "_itemIds", internalType: "uint256[]", type: "uint256[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_metricId", internalType: "uint256", type: "uint256" }],
        name: "getMetric",
        outputs: [
            {
                name: "_metric",
                internalType: "struct HolacracyTypes.Metric",
                type: "tuple",
                components: [
                    { name: "id", internalType: "uint256", type: "uint256" },
                    { name: "roleId", internalType: "uint256", type: "uint256" },
                    { name: "label", internalType: "string", type: "string" },
                    { name: "exists", internalType: "bool", type: "bool" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "getMetricsByRole",
        outputs: [{ name: "_metricIds", internalType: "uint256[]", type: "uint256[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_orgInstance", internalType: "address", type: "address" },
            { name: "_roleRegistry", internalType: "address", type: "address" },
        ],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "metricCount",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "org",
        outputs: [{ name: "", internalType: "contract IOrganizationInstance", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "orgId",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_itemId", internalType: "uint256", type: "uint256" }],
        name: "removeChecklistItem",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_metricId", internalType: "uint256", type: "uint256" }],
        name: "removeMetric",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "roleRegistry",
        outputs: [{ name: "", internalType: "contract IRoleRegistry", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_itemId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_label", internalType: "string", type: "string", indexed: false },
        ],
        name: "ChecklistItemAdded",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_itemId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
        ],
        name: "ChecklistItemRemoved",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "version", internalType: "uint64", type: "uint64", indexed: false }],
        name: "Initialized",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_metricId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_label", internalType: "string", type: "string", indexed: false },
        ],
        name: "MetricAdded",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_metricId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
        ],
        name: "MetricRemoved",
    },
    { type: "error", inputs: [], name: "InvalidInitialization" },
    { type: "error", inputs: [], name: "NotInitializing" },
    { type: "error", inputs: [], name: "RoleDataRegistry_AlreadyInitialized" },
    {
        type: "error",
        inputs: [{ name: "_itemId", internalType: "uint256", type: "uint256" }],
        name: "RoleDataRegistry_ChecklistItemNotFound",
    },
    { type: "error", inputs: [], name: "RoleDataRegistry_EmptyLabel" },
    {
        type: "error",
        inputs: [{ name: "_metricId", internalType: "uint256", type: "uint256" }],
        name: "RoleDataRegistry_MetricNotFound",
    },
    {
        type: "error",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "RoleDataRegistry_RoleNotFound",
    },
    { type: "error", inputs: [], name: "RoleDataRegistry_Unauthorized" },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// RoleRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const roleRegistryAbi = [
    { type: "constructor", inputs: [], stateMutability: "nonpayable" },
    {
        type: "function",
        inputs: [],
        name: "anchorCircleId",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
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
        name: "circleCount",
        outputs: [{ name: "_count", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_body", internalType: "string", type: "string" },
        ],
        name: "createPolicy",
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
        name: "createPolicyWithRefs",
        outputs: [{ name: "_policyId", internalType: "uint256", type: "uint256" }],
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
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "expandToCircle",
        outputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "factory",
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
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "getCirclePolicyIds",
        outputs: [{ name: "_policyIds", internalType: "uint256[]", type: "uint256[]" }],
        stateMutability: "view",
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
        inputs: [{ name: "_policyId", internalType: "uint256", type: "uint256" }],
        name: "getPolicyCircleId",
        outputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
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
                    { name: "isCircle", internalType: "bool", type: "bool" },
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
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "getRoleCircleId",
        outputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
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
        name: "governanceProcess",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_creator", internalType: "address", type: "address" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
        ],
        name: "initAnchorCircle",
        outputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_roleId", internalType: "uint256", type: "uint256" },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_factory", internalType: "address", type: "address" }],
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
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_toCircleId", internalType: "uint256", type: "uint256" },
        ],
        name: "moveRole",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "policyCount",
        outputs: [{ name: "_count", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_policyId", internalType: "uint256", type: "uint256" }],
        name: "removePolicy",
        outputs: [],
        stateMutability: "nonpayable",
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
        inputs: [{ name: "_governanceProcess", internalType: "address", type: "address" }],
        name: "setGovernanceProcess",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_newFactory", internalType: "address", type: "address" }],
        name: "transferFactory",
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
            { name: "_policyId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_body", internalType: "string", type: "string" },
        ],
        name: "updatePolicy",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_policyId", internalType: "uint256", type: "uint256" },
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
        name: "updatePolicyWithRefs",
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
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_creator", internalType: "address", type: "address", indexed: true },
        ],
        name: "AnchorCircleInitialized",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_parentCircleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
        ],
        name: "CircleCreated",
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
            { name: "_governanceProcess", internalType: "address", type: "address", indexed: true },
        ],
        name: "GovernanceProcessSet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "version", internalType: "uint64", type: "uint64", indexed: false }],
        name: "Initialized",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_policyId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_name", internalType: "string", type: "string", indexed: false },
        ],
        name: "PolicyCreated",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_policyId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
        ],
        name: "PolicyRemoved",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "_policyId", internalType: "uint256", type: "uint256", indexed: true }],
        name: "PolicyUpdated",
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
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256", indexed: true }],
        name: "RoleExpandedToCircle",
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
            { name: "_fromCircleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_toCircleId", internalType: "uint256", type: "uint256", indexed: true },
        ],
        name: "RoleMoved",
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
    { type: "error", inputs: [], name: "InvalidInitialization" },
    { type: "error", inputs: [], name: "NotInitializing" },
    {
        type: "error",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "RoleRegistry_AlreadyCircle",
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
    { type: "error", inputs: [], name: "RoleRegistry_AnchorAlreadyInitialized" },
    { type: "error", inputs: [], name: "RoleRegistry_ArrayLengthMismatch" },
    {
        type: "error",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "RoleRegistry_CannotMoveCircleRole",
    },
    {
        type: "error",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "RoleRegistry_CircleNotFound",
    },
    { type: "error", inputs: [], name: "RoleRegistry_EmptyName" },
    { type: "error", inputs: [], name: "RoleRegistry_EmptyPolicyName" },
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
        inputs: [{ name: "_policyId", internalType: "uint256", type: "uint256" }],
        name: "RoleRegistry_PolicyNotFound",
    },
    {
        type: "error",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "RoleRegistry_RoleNotFound",
    },
    {
        type: "error",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_circleId", internalType: "uint256", type: "uint256" },
        ],
        name: "RoleRegistry_SameCircle",
    },
    { type: "error", inputs: [], name: "RoleRegistry_Unauthorized" },
] as const;
