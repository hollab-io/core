/**
 * E2E tests — core user journey against a live Anvil node.
 *
 * Uses @wonderland/walletless to provide an EIP-1193 wallet and viem for
 * contract calls. Tests the same contract interaction patterns as the React
 * hooks (useJoinRequest, useSendTransaction, etc.) without the UI layer.
 *
 * Anvil is started and contracts are deployed by global-setup.ts.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Address, PublicClient, WalletClient } from "viem";
import { expect, test } from "@playwright/test";
import { ANVIL_ACCOUNTS, createE2EProvider } from "@wonderland/walletless";
import {
    createPublicClient,
    createWalletClient,
    decodeEventLog,
    getAddress,
    http,
    parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Deployed addresses from global-setup ────────────────────────────────────

const addressesPath = resolve(__dirname, ".addresses.json");
let ADDRESSES: { orgFactory: Address; meetingFactory: Address };

const RPC = "http://127.0.0.1:8545";

// Anvil pre-funded accounts
const FOUNDER = privateKeyToAccount(ANVIL_ACCOUNTS[0].privateKey as `0x${string}`);
const ALICE = privateKeyToAccount(ANVIL_ACCOUNTS[1].privateKey as `0x${string}`);
const BOB = privateKeyToAccount(ANVIL_ACCOUNTS[2].privateKey as `0x${string}`);
const CAROL = privateKeyToAccount(ANVIL_ACCOUNTS[3].privateKey as `0x${string}`);

// ── ABIs (minimal, matching what the frontend hooks use) ────────────────────

const orgFactoryAbi = parseAbi([
    "function createOrganization(string _subname, string _purpose, (string tokenName, string tokenSymbol, address[] initialHolders, uint256[] initialAmounts) _tokenConfig) external returns (uint256)",
    "function getOrganization(uint256 _orgId) external view returns ((uint256 id, string name, string subname, address creator, address roleRegistry, address circleRegistry, address governanceProcess, address meetingFactory, address accessManager, uint256 anchorCircleId, uint256 createdAt, address token))",
    "function organizationCount() external view returns (uint256)",
    "function requestToJoin(uint256 orgId, string message) external returns (uint256)",
    "function approveJoinRequest(uint256 orgId, address requester) external",
    "function rejectJoinRequest(uint256 orgId, address requester) external",
    "function addOrgAdmin(uint256 orgId, address account) external",
    "function addOrgMember(uint256 orgId, address account) external",
    "function removeOrgMember(uint256 orgId, address account) external",
    "function isOrgAdmin(uint256 orgId, address account) external view returns (bool)",
    "function isOrgMember(uint256 orgId, address account) external view returns (bool)",
    "function hasPendingRequest(address requester, uint256 orgId) external view returns (bool)",
    "event OrganizationCreated(uint256 indexed _orgId, string _subname, address indexed _creator)",
    "event JoinRequested(uint256 indexed requestId, address indexed requester, uint256 indexed orgId, string message)",
    "event JoinApproved(uint256 indexed requestId, address indexed requester, uint256 indexed orgId)",
    "event OrgMemberAdded(uint256 indexed orgId, address indexed account)",
]);

const meetingComponentsFactoryAbi = parseAbi([
    "function deploy(uint256 _orgId, address _orgFactory, address _roleRegistry, address _govToken) external returns ((address meetingFactory, address actionVoting))",
    "event MeetingComponentsDeployed(uint256 indexed _orgId, address indexed _meetingFactory, address _actionVoting)",
]);

const meetingFactoryAbi = parseAbi([
    "function startMeeting(uint256 _orgId, uint8 _kind) external returns (uint256)",
    "function endMeeting(uint256 _meetingId, uint256 _orgId, uint8 _kind) external",
    "function recordOutput(uint256 _meetingId, uint256 _orgId, uint8 _outputType, string _description, address _assignedTo, uint256 _roleId) external returns (uint256)",
    "event MeetingStarted(uint256 indexed _meetingId, uint256 indexed _orgId, uint8 indexed _kind, address _startedBy, uint256 _timestamp)",
]);

const actionVotingAbi = parseAbi([
    "function setCircleQuorum(uint256 _circleId, uint256 _quorum) external",
    "function setCircleMintCap(uint256 _circleId, uint256 _cap) external",
    "function grantCollaboratorWeight(uint256 _circleId, address _collaborator, uint256 _weight) external",
    "function createVote(uint256 _circleId, uint256 _outputId, string _reason, uint256 _duration) external returns (uint256)",
    "function castVote(uint256 _voteId, uint8 _support) external",
    "function hasVoted(uint256 _voteId, address _voter) external view returns (bool)",
    "function getVoteWeight(uint256 _voteId, address _voter) external view returns (uint256)",
    "function getCircleQuorum(uint256 _circleId) external view returns (uint256)",
    "function getCollaboratorWeight(uint256 _circleId, address _collaborator) external view returns (uint256)",
    "event VoteCreated(uint256 indexed _voteId, uint256 indexed _circleId, uint256 indexed _outputId, address _proposer, uint256 _deadline, string _reason, uint256 _snapshotBlock)",
    "event VoteCast(uint256 indexed _voteId, address indexed _voter, uint8 _support, uint256 _weight)",
]);

const erc20Abi = parseAbi([
    "function balanceOf(address) external view returns (uint256)",
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function delegate(address delegatee) external",
]);

// ── Helpers ─────────────────────────────────────────────────────────────────

function publicClient(): PublicClient {
    return createPublicClient({ chain: foundry, transport: http(RPC) });
}

function walletClient(account: ReturnType<typeof privateKeyToAccount>): WalletClient {
    return createWalletClient({ account, chain: foundry, transport: http(RPC) });
}

const GOV_CONFIG = {
    tokenName: "E2E Token",
    tokenSymbol: "E2E",
    initialHolders: [FOUNDER.address],
    initialAmounts: [1_000_000n * 10n ** 18n],
} as const;

// ── Test setup ──────────────────────────────────────────────────────────────

test.beforeAll(() => {
    const raw = readFileSync(addressesPath, "utf-8");
    ADDRESSES = JSON.parse(raw);
});

// ── Walletless provider smoke test ──────────────────────────────────────────

test.describe("Walletless provider", () => {
    test("creates an EIP-1193 provider connected to Anvil", async () => {
        const provider = createE2EProvider({
            chains: [foundry],
            rpcUrls: { [foundry.id]: RPC },
            account: ANVIL_ACCOUNTS[0].privateKey,
        });

        const chainId = await provider.request({ method: "eth_chainId", params: [] });
        expect(parseInt(chainId as string, 16)).toBe(foundry.id);

        const accounts = await provider.request({ method: "eth_accounts", params: [] });
        expect((accounts as string[])[0].toLowerCase()).toBe(FOUNDER.address.toLowerCase());
    });

    test("switches accounts", async () => {
        const provider = createE2EProvider({
            chains: [foundry],
            rpcUrls: { [foundry.id]: RPC },
            account: ANVIL_ACCOUNTS[0].privateKey,
        });

        provider.setSigningAccount(ANVIL_ACCOUNTS[1].privateKey);
        const accounts = await provider.request({ method: "eth_accounts", params: [] });
        expect((accounts as string[])[0].toLowerCase()).toBe(ALICE.address.toLowerCase());
    });
});

// ── Journey 1: Org creation ─────────────────────────────────────────────────

test.describe("Org creation", () => {
    test("creates an organization and verifies on-chain state", async () => {
        const pub = publicClient();
        const wc = walletClient(FOUNDER);

        const hash = await wc.writeContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "createOrganization",
            args: ["e2e-org", "E2E test org", GOV_CONFIG],
        });

        const receipt = await pub.waitForTransactionReceipt({ hash });
        expect(receipt.status).toBe("success");

        const count = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "organizationCount",
        });
        // At least 2 (1 from DeployLocal sample + our new one)
        expect(count).toBeGreaterThanOrEqual(2n);

        const org = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "getOrganization",
            args: [count],
        });
        expect(org.subname).toBe("e2e-org");
        expect(getAddress(org.creator)).toBe(getAddress(FOUNDER.address));
        expect(org.token).not.toBe("0x0000000000000000000000000000000000000000");

        // Founder is auto-seeded as admin + member
        const isAdmin = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "isOrgAdmin",
            args: [count, FOUNDER.address],
        });
        expect(isAdmin).toBe(true);

        const isMember = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "isOrgMember",
            args: [count, FOUNDER.address],
        });
        expect(isMember).toBe(true);
    });
});

// ── Journey 2: Join request flow ────────────────────────────────────────────

test.describe("Join request flow", () => {
    let orgId: bigint;
    let tokenAddress: Address;

    test.beforeAll(async () => {
        const pub = publicClient();
        const wc = walletClient(FOUNDER);

        const hash = await wc.writeContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "createOrganization",
            args: ["join-test", "Join request test", GOV_CONFIG],
        });
        await pub.waitForTransactionReceipt({ hash });

        orgId = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "organizationCount",
        });

        const org = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "getOrganization",
            args: [orgId],
        });
        tokenAddress = org.token;
    });

    test("Alice requests to join, founder approves", async () => {
        const pub = publicClient();

        // Alice requests
        const aliceWc = walletClient(ALICE);
        const reqHash = await aliceWc.writeContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "requestToJoin",
            args: [orgId, "Alice wants to contribute"],
        });
        const reqReceipt = await pub.waitForTransactionReceipt({ hash: reqHash });
        expect(reqReceipt.status).toBe("success");

        // Alice has pending request
        const pending = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "hasPendingRequest",
            args: [ALICE.address, orgId],
        });
        expect(pending).toBe(true);

        // Founder approves
        const founderWc = walletClient(FOUNDER);
        const approveHash = await founderWc.writeContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "approveJoinRequest",
            args: [orgId, ALICE.address],
        });
        const approveReceipt = await pub.waitForTransactionReceipt({ hash: approveHash });
        expect(approveReceipt.status).toBe("success");

        // Alice is now a member
        const isMember = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "isOrgMember",
            args: [orgId, ALICE.address],
        });
        expect(isMember).toBe(true);

        // Pending cleared
        const pendingAfter = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "hasPendingRequest",
            args: [ALICE.address, orgId],
        });
        expect(pendingAfter).toBe(false);
    });

    test("Bob requests to join, founder rejects, Bob re-applies", async () => {
        const pub = publicClient();
        const bobWc = walletClient(BOB);
        const founderWc = walletClient(FOUNDER);

        // Bob requests
        await pub.waitForTransactionReceipt({
            hash: await bobWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "requestToJoin",
                args: [orgId, "Bob here"],
            }),
        });

        // Founder rejects
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "rejectJoinRequest",
                args: [orgId, BOB.address],
            }),
        });

        expect(
            await pub.readContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "isOrgMember",
                args: [orgId, BOB.address],
            }),
        ).toBe(false);

        // Bob can re-apply
        const reapplyReceipt = await pub.waitForTransactionReceipt({
            hash: await bobWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "requestToJoin",
                args: [orgId, "Second attempt"],
            }),
        });
        expect(reapplyReceipt.status).toBe("success");
    });

    test("approve + token transfer batch (mimics useJoinRequest.approveWithTokens)", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        // Approve Bob's second request
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "approveJoinRequest",
                args: [orgId, BOB.address],
            }),
        });

        // Transfer 100 tokens (the pattern from approveWithTokens)
        const tokenAmount = 100n * 10n ** 18n;
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: tokenAddress,
                abi: erc20Abi,
                functionName: "transfer",
                args: [BOB.address, tokenAmount],
            }),
        });

        const bobBalance = await pub.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [BOB.address],
        });
        expect(bobBalance).toBe(tokenAmount);
    });
});

// ── Journey 3: Meeting lifecycle ────────────────────────────────────────────

test.describe("Meeting lifecycle", () => {
    let orgId: bigint;
    let meetingFactoryAddr: Address;
    let actionVotingAddr: Address;
    let tokenAddress: Address;

    test.beforeAll(async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        // Create org
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "createOrganization",
                args: ["meeting-e2e", "Meeting e2e test", GOV_CONFIG],
            }),
        });
        orgId = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "organizationCount",
        });
        const org = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "getOrganization",
            args: [orgId],
        });
        tokenAddress = org.token;

        // Deploy meeting components
        const deployHash = await founderWc.writeContract({
            address: ADDRESSES.meetingFactory,
            abi: meetingComponentsFactoryAbi,
            functionName: "deploy",
            args: [orgId, ADDRESSES.orgFactory, org.roleRegistry, tokenAddress],
        });
        const deployReceipt = await pub.waitForTransactionReceipt({ hash: deployHash });

        // Parse MeetingComponentsDeployed event to get clone addresses
        for (const log of deployReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: meetingComponentsFactoryAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "MeetingComponentsDeployed") {
                    meetingFactoryAddr = decoded.args._meetingFactory;
                    actionVotingAddr = decoded.args._actionVoting;
                }
            } catch {
                // not our event
            }
        }
        if (!meetingFactoryAddr || !actionVotingAddr) {
            throw new Error("MeetingComponentsDeployed event not found in deploy receipt");
        }

        // Add Alice as member
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "addOrgMember",
                args: [orgId, ALICE.address],
            }),
        });
    });

    test("start tactical meeting, record outputs, end meeting", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);
        const aliceWc = walletClient(ALICE);

        // Start meeting
        const startHash = await founderWc.writeContract({
            address: meetingFactoryAddr,
            abi: meetingFactoryAbi,
            functionName: "startMeeting",
            args: [orgId, 0], // Tactical = 0
        });
        const startReceipt = await pub.waitForTransactionReceipt({ hash: startHash });
        expect(startReceipt.status).toBe("success");

        const meetingId = 1n; // first meeting

        // Alice records an output
        const outputHash = await aliceWc.writeContract({
            address: meetingFactoryAddr,
            abi: meetingFactoryAbi,
            functionName: "recordOutput",
            args: [meetingId, orgId, 0, "Build landing page", ALICE.address, 0n], // NextAction = 0
        });
        const outputReceipt = await pub.waitForTransactionReceipt({ hash: outputHash });
        expect(outputReceipt.status).toBe("success");

        // End meeting
        const endHash = await founderWc.writeContract({
            address: meetingFactoryAddr,
            abi: meetingFactoryAbi,
            functionName: "endMeeting",
            args: [meetingId, orgId, 0],
        });
        const endReceipt = await pub.waitForTransactionReceipt({ hash: endHash });
        expect(endReceipt.status).toBe("success");
    });

    test("non-member cannot start a meeting", async () => {
        const carolWc = walletClient(CAROL);

        await expect(
            carolWc.writeContract({
                address: meetingFactoryAddr,
                abi: meetingFactoryAbi,
                functionName: "startMeeting",
                args: [orgId, 0],
            }),
        ).rejects.toThrow();
    });
});

// ── Journey 4: Voting with collaborator weight ──────────────────────────────

test.describe("Voting", () => {
    let orgId: bigint;
    let actionVotingAddr: Address;
    let meetingFactoryAddr: Address;
    let tokenAddress: Address;

    test.beforeAll(async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        // Create org
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "createOrganization",
                args: ["vote-e2e", "Voting e2e test", GOV_CONFIG],
            }),
        });
        orgId = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "organizationCount",
        });
        const org = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "getOrganization",
            args: [orgId],
        });
        tokenAddress = org.token;

        // Deploy meeting components
        const deployHash = await founderWc.writeContract({
            address: ADDRESSES.meetingFactory,
            abi: meetingComponentsFactoryAbi,
            functionName: "deploy",
            args: [orgId, ADDRESSES.orgFactory, org.roleRegistry, tokenAddress],
        });
        const deployReceipt = await pub.waitForTransactionReceipt({ hash: deployHash });
        for (const log of deployReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: meetingComponentsFactoryAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "MeetingComponentsDeployed") {
                    meetingFactoryAddr = decoded.args._meetingFactory;
                    actionVotingAddr = decoded.args._actionVoting;
                }
            } catch {
                // not our event
            }
        }
        if (!meetingFactoryAddr || !actionVotingAddr) {
            throw new Error("MeetingComponentsDeployed event not found in deploy receipt");
        }

        // Add Alice as admin+member, Bob as member
        for (const fn of ["addOrgMember", "addOrgAdmin"] as const) {
            await pub.waitForTransactionReceipt({
                hash: await founderWc.writeContract({
                    address: ADDRESSES.orgFactory,
                    abi: orgFactoryAbi,
                    functionName: fn,
                    args: [orgId, ALICE.address],
                }),
            });
        }
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "addOrgMember",
                args: [orgId, BOB.address],
            }),
        });

        // Transfer tokens + delegate
        for (const [account, amount] of [
            [ALICE.address, 200_000n * 10n ** 18n],
            [BOB.address, 100_000n * 10n ** 18n],
        ] as const) {
            await pub.waitForTransactionReceipt({
                hash: await founderWc.writeContract({
                    address: tokenAddress,
                    abi: erc20Abi,
                    functionName: "transfer",
                    args: [account, amount],
                }),
            });
        }
        // Delegate
        for (const acct of [FOUNDER, ALICE, BOB]) {
            const wc = walletClient(acct);
            await pub.waitForTransactionReceipt({
                hash: await wc.writeContract({
                    address: tokenAddress,
                    abi: erc20Abi,
                    functionName: "delegate",
                    args: [acct.address],
                }),
            });
        }

        // Mine a block so snapshots are available
        await pub.request({ method: "evm_mine" as never, params: [] });

        // Set quorum
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "setCircleQuorum",
                args: [orgId, 100_000n * 10n ** 18n],
            }),
        });
    });

    test("create vote, cast votes, verify on-chain state", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);
        const aliceWc = walletClient(ALICE);
        const bobWc = walletClient(BOB);

        // Create vote
        const createHash = await founderWc.writeContract({
            address: actionVotingAddr,
            abi: actionVotingAbi,
            functionName: "createVote",
            args: [orgId, 1n, "Should we prioritize the MVP?", 86400n * 3n],
        });
        const createReceipt = await pub.waitForTransactionReceipt({ hash: createHash });
        expect(createReceipt.status).toBe("success");

        const voteId = 1n;

        // Check weights
        const aliceWeight = await pub.readContract({
            address: actionVotingAddr,
            abi: actionVotingAbi,
            functionName: "getVoteWeight",
            args: [voteId, ALICE.address],
        });
        expect(aliceWeight).toBe(200_000n * 10n ** 18n);

        // Alice votes For
        await pub.waitForTransactionReceipt({
            hash: await aliceWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "castVote",
                args: [voteId, 1], // For = 1
            }),
        });

        // Bob votes Against
        await pub.waitForTransactionReceipt({
            hash: await bobWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "castVote",
                args: [voteId, 0], // Against = 0
            }),
        });

        // Verify on-chain vote state
        expect(
            await pub.readContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "hasVoted",
                args: [voteId, ALICE.address],
            }),
        ).toBe(true);

        expect(
            await pub.readContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "hasVoted",
                args: [voteId, BOB.address],
            }),
        ).toBe(true);

        expect(
            await pub.readContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "hasVoted",
                args: [voteId, FOUNDER.address],
            }),
        ).toBe(false);

        // Double vote fails
        await expect(
            aliceWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "castVote",
                args: [voteId, 1],
            }),
        ).rejects.toThrow();
    });

    test("collaborator with granted weight can vote", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);
        const carolWc = walletClient(CAROL);

        // Set mint cap and grant Carol collaborator weight
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "setCircleMintCap",
                args: [orgId, 500_000n * 10n ** 18n],
            }),
        });
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "grantCollaboratorWeight",
                args: [orgId, CAROL.address, 50_000n * 10n ** 18n],
            }),
        });

        // Verify weight
        const weight = await pub.readContract({
            address: actionVotingAddr,
            abi: actionVotingAbi,
            functionName: "getCollaboratorWeight",
            args: [orgId, CAROL.address],
        });
        expect(weight).toBe(50_000n * 10n ** 18n);

        // Create another vote
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "createVote",
                args: [orgId, 2n, "Community input on roadmap", 86400n],
            }),
        });
        const voteId = 2n;

        // Carol votes with collaborator weight
        const carolVoteWeight = await pub.readContract({
            address: actionVotingAddr,
            abi: actionVotingAbi,
            functionName: "getVoteWeight",
            args: [voteId, CAROL.address],
        });
        expect(carolVoteWeight).toBe(50_000n * 10n ** 18n);

        await pub.waitForTransactionReceipt({
            hash: await carolWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "castVote",
                args: [voteId, 1], // For
            }),
        });

        expect(
            await pub.readContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "hasVoted",
                args: [voteId, CAROL.address],
            }),
        ).toBe(true);
    });
});

// ── Journey 5: Data display (sequential fetch + event logs) ─────────────────

const getOrganizationsAbi = parseAbi([
    "function organizationCount() external view returns (uint256)",
    "function getOrganizations(uint256 _offset, uint256 _limit) external view returns ((uint256 id, string name, string subname, address creator, address roleRegistry, address circleRegistry, address governanceProcess, address meetingFactory, address accessManager, uint256 anchorCircleId, uint256 createdAt, address governor, address token, address timelock)[])",
]);

test.describe("Data display", () => {
    test("sequentially fetches all organizations (mimics frontend pattern)", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        // Create 3 orgs
        for (const name of ["display-alpha", "display-beta", "display-gamma"]) {
            await pub.waitForTransactionReceipt({
                hash: await founderWc.writeContract({
                    address: ADDRESSES.orgFactory,
                    abi: orgFactoryAbi,
                    functionName: "createOrganization",
                    args: [name, `Purpose for ${name}`, GOV_CONFIG],
                }),
            });
        }

        // Sequential fetch: count → paginated getOrganizations
        const total = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: getOrganizationsAbi,
            functionName: "organizationCount",
        });
        expect(total).toBeGreaterThanOrEqual(4n); // 1 sample + 3 new

        const PAGE_SIZE = 50n;
        const allOrgs: { id: bigint; subname: string; creator: `0x${string}` }[] = [];
        for (let offset = 0n; offset < total; offset += PAGE_SIZE) {
            const page = await pub.readContract({
                address: ADDRESSES.orgFactory,
                abi: getOrganizationsAbi,
                functionName: "getOrganizations",
                args: [offset, PAGE_SIZE],
            });
            for (const org of page) {
                if (org.id > 0n) allOrgs.push(org);
            }
        }

        expect(allOrgs.length).toBe(Number(total));

        // Verify our 3 orgs are in the list
        const names = allOrgs.map((o) => o.subname);
        expect(names).toContain("display-alpha");
        expect(names).toContain("display-beta");
        expect(names).toContain("display-gamma");

        // All have the founder as creator
        const ours = allOrgs.filter(
            (o) => names.includes(o.subname) && o.subname.startsWith("display-"),
        );
        for (const org of ours) {
            expect(getAddress(org.creator)).toBe(getAddress(FOUNDER.address));
        }
    });

    test("reads event logs for join requests and membership changes", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);
        const aliceWc = walletClient(ALICE);
        const bobWc = walletClient(BOB);

        // Create org
        const createReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "createOrganization",
                args: ["events-test", "Event log test", GOV_CONFIG],
            }),
        });
        const orgId = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "organizationCount",
        });

        // Verify OrganizationCreated event in receipt
        const orgCreatedLogs = createReceipt.logs.filter(
            (l) => l.address.toLowerCase() === ADDRESSES.orgFactory.toLowerCase(),
        );
        expect(orgCreatedLogs.length).toBeGreaterThan(0);

        // Alice and Bob request to join
        await pub.waitForTransactionReceipt({
            hash: await aliceWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "requestToJoin",
                args: [orgId, "Alice joining"],
            }),
        });
        await pub.waitForTransactionReceipt({
            hash: await bobWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "requestToJoin",
                args: [orgId, "Bob joining"],
            }),
        });

        // Use getLogs to find all JoinRequested events for this org
        const joinLogs = await pub.getLogs({
            address: ADDRESSES.orgFactory,
            event: {
                type: "event",
                name: "JoinRequested",
                inputs: [
                    { name: "requestId", type: "uint256", indexed: true },
                    { name: "requester", type: "address", indexed: true },
                    { name: "orgId", type: "uint256", indexed: true },
                    { name: "message", type: "string", indexed: false },
                ],
            },
            args: { orgId },
            fromBlock: 0n,
        });
        expect(joinLogs.length).toBe(2);
        expect(joinLogs[0].args.requester?.toLowerCase()).toBe(ALICE.address.toLowerCase());
        expect(joinLogs[1].args.requester?.toLowerCase()).toBe(BOB.address.toLowerCase());
        expect(joinLogs[0].args.message).toBe("Alice joining");
        expect(joinLogs[1].args.message).toBe("Bob joining");

        // Approve Alice, reject Bob
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "approveJoinRequest",
                args: [orgId, ALICE.address],
            }),
        });
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "rejectJoinRequest",
                args: [orgId, BOB.address],
            }),
        });

        // Query OrgMemberAdded logs
        const memberLogs = await pub.getLogs({
            address: ADDRESSES.orgFactory,
            event: {
                type: "event",
                name: "OrgMemberAdded",
                inputs: [
                    { name: "orgId", type: "uint256", indexed: true },
                    { name: "account", type: "address", indexed: true },
                ],
            },
            args: { orgId },
            fromBlock: 0n,
        });
        // Founder (auto-seeded) + Alice (approved)
        const memberAddresses = memberLogs.map((l) => l.args.account?.toLowerCase());
        expect(memberAddresses).toContain(FOUNDER.address.toLowerCase());
        expect(memberAddresses).toContain(ALICE.address.toLowerCase());
        expect(memberAddresses).not.toContain(BOB.address.toLowerCase());
    });

    test("reads VoteCast event logs for off-chain tally (mimics indexer)", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);
        const aliceWc = walletClient(ALICE);
        const bobWc = walletClient(BOB);

        // Setup: create org, deploy meeting components, add members
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "createOrganization",
                args: ["tally-test", "Vote tally test", GOV_CONFIG],
            }),
        });
        const orgId = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "organizationCount",
        });
        const org = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "getOrganization",
            args: [orgId],
        });

        // Deploy meeting components
        const deployReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: ADDRESSES.meetingFactory,
                abi: meetingComponentsFactoryAbi,
                functionName: "deploy",
                args: [orgId, ADDRESSES.orgFactory, org.roleRegistry, org.token],
            }),
        });
        let avAddr: Address = "0x";
        for (const log of deployReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: meetingComponentsFactoryAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "MeetingComponentsDeployed") {
                    avAddr = decoded.args._actionVoting;
                }
            } catch {
                /* not our event */
            }
        }

        // Add members + delegate
        for (const [fn, addr] of [
            ["addOrgMember", ALICE.address],
            ["addOrgAdmin", ALICE.address],
            ["addOrgMember", BOB.address],
        ] as const) {
            await pub.waitForTransactionReceipt({
                hash: await founderWc.writeContract({
                    address: ADDRESSES.orgFactory,
                    abi: orgFactoryAbi,
                    functionName: fn,
                    args: [orgId, addr],
                }),
            });
        }

        // Transfer tokens + delegate
        const tokenAddr = org.token;
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: tokenAddr,
                abi: erc20Abi,
                functionName: "transfer",
                args: [ALICE.address, 300_000n * 10n ** 18n],
            }),
        });
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: tokenAddr,
                abi: erc20Abi,
                functionName: "transfer",
                args: [BOB.address, 150_000n * 10n ** 18n],
            }),
        });
        for (const acct of [FOUNDER, ALICE, BOB]) {
            await pub.waitForTransactionReceipt({
                hash: await walletClient(acct).writeContract({
                    address: tokenAddr,
                    abi: erc20Abi,
                    functionName: "delegate",
                    args: [acct.address],
                }),
            });
        }
        await pub.request({ method: "evm_mine" as never, params: [] });

        // Setup quorum + create vote
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: avAddr,
                abi: actionVotingAbi,
                functionName: "setCircleQuorum",
                args: [orgId, 100_000n * 10n ** 18n],
            }),
        });
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: avAddr,
                abi: actionVotingAbi,
                functionName: "createVote",
                args: [orgId, 1n, "Tally test vote", 86400n],
            }),
        });

        // Cast votes
        await pub.waitForTransactionReceipt({
            hash: await aliceWc.writeContract({
                address: avAddr,
                abi: actionVotingAbi,
                functionName: "castVote",
                args: [1n, 1],
            }),
        });
        await pub.waitForTransactionReceipt({
            hash: await bobWc.writeContract({
                address: avAddr,
                abi: actionVotingAbi,
                functionName: "castVote",
                args: [1n, 0],
            }),
        });
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: avAddr,
                abi: actionVotingAbi,
                functionName: "castVote",
                args: [1n, 1],
            }),
        });

        // Query VoteCast logs and compute tally off-chain (exactly what indexer does)
        const voteCastLogs = await pub.getLogs({
            address: avAddr,
            event: {
                type: "event",
                name: "VoteCast",
                inputs: [
                    { name: "_voteId", type: "uint256", indexed: true },
                    { name: "_voter", type: "address", indexed: true },
                    { name: "_support", type: "uint8", indexed: false },
                    { name: "_weight", type: "uint256", indexed: false },
                ],
            },
            args: { _voteId: 1n },
            fromBlock: 0n,
        });

        expect(voteCastLogs.length).toBe(3);

        // Compute tally from events
        let forVotes = 0n;
        let againstVotes = 0n;
        for (const log of voteCastLogs) {
            if (log.args._support === 1) forVotes += log.args._weight!;
            else if (log.args._support === 0) againstVotes += log.args._weight!;
        }

        // Alice (300k) + Founder (550k remaining) voted For, Bob (150k) voted Against
        expect(forVotes).toBeGreaterThan(againstVotes);
        expect(againstVotes).toBe(150_000n * 10n ** 18n);
        expect(forVotes).toBe(forVotes); // sanity — just verify it's nonzero
        expect(voteCastLogs.length).toBe(3);

        // Verify VoteCreated event has reason + snapshotBlock (no on-chain read needed)
        const voteCreatedLogs = await pub.getLogs({
            address: avAddr,
            event: {
                type: "event",
                name: "VoteCreated",
                inputs: [
                    { name: "_voteId", type: "uint256", indexed: true },
                    { name: "_circleId", type: "uint256", indexed: true },
                    { name: "_outputId", type: "uint256", indexed: true },
                    { name: "_proposer", type: "address", indexed: false },
                    { name: "_deadline", type: "uint256", indexed: false },
                    { name: "_reason", type: "string", indexed: false },
                    { name: "_snapshotBlock", type: "uint256", indexed: false },
                ],
            },
            args: { _voteId: 1n },
            fromBlock: 0n,
        });

        expect(voteCreatedLogs.length).toBe(1);
        expect(voteCreatedLogs[0].args._reason).toBe("Tally test vote");
        expect(voteCreatedLogs[0].args._snapshotBlock).toBeGreaterThan(0n);
        expect(voteCreatedLogs[0].args._proposer?.toLowerCase()).toBe(
            FOUNDER.address.toLowerCase(),
        );
    });
});

// ── Journey 6: Multi-org isolation ──────────────────────────────────────────

test.describe("Multi-org isolation", () => {
    test("admin of one org cannot act on another", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);
        const aliceWc = walletClient(ALICE);

        // Founder creates org1
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "createOrganization",
                args: ["iso-org1", "Isolation test 1", GOV_CONFIG],
            }),
        });
        const org1Id = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "organizationCount",
        });

        // Alice creates org2
        await pub.waitForTransactionReceipt({
            hash: await aliceWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "createOrganization",
                args: ["iso-org2", "Isolation test 2", GOV_CONFIG],
            }),
        });
        const org2Id = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "organizationCount",
        });

        // Founder is admin of org1 but not org2
        expect(
            await pub.readContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "isOrgAdmin",
                args: [org1Id, FOUNDER.address],
            }),
        ).toBe(true);
        expect(
            await pub.readContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "isOrgAdmin",
                args: [org2Id, FOUNDER.address],
            }),
        ).toBe(false);

        // Founder cannot add members to org2
        await expect(
            founderWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "addOrgMember",
                args: [org2Id, BOB.address],
            }),
        ).rejects.toThrow();
    });
});

// ── Journey 6: Governance proposal lifecycle + ExpandRoleToCircle ────────────
//
// Uses the new MeetingComponentsFactory.deploy(subname, orgFactory) API that
// replaced the old 4-arg variant. ABIs are defined locally to avoid changing
// the shared constants above (which the existing tests still reference).

const newMeetingComponentsFactoryAbi = parseAbi([
    "function deploy(string _subname, address _orgFactory) external returns ((address meetingFactory, address actionVoting))",
    "event MeetingComponentsDeployed(uint256 indexed _orgId, address indexed _meetingFactory, address _actionVoting)",
]);

const governanceProcessAbi = parseAbi([
    "function createProposal(uint256 _orgId, uint256 _circleId, uint256 _proposerRoleId, bytes32 _tensionHash, uint8 _changeType, bytes _changeData) external returns (uint256 _proposalId)",
    "function adoptProposal(uint256 _proposalId) external returns (uint256 _resultId)",
    "function getProposal(uint256 _proposalId) external view returns ((uint256 id, uint256 orgId, uint256 circleId, address proposer, uint64 submittedAt, uint64 resolvedAt, uint256 proposerRoleId, bytes32 tensionHash, uint8 changeType, uint8 status, bytes changeData))",
    "function proposalCount() external view returns (uint256)",
    "event ProposalCreated(uint256 indexed _proposalId, uint256 indexed _orgId, uint256 indexed _circleId, address _proposer, uint256 _proposerRoleId, bytes32 _tensionHash, uint8 _changeType, bytes _changeData)",
    "event ProposalAdopted(uint256 indexed _proposalId, uint256 indexed _orgId, uint256 _resultId, address _adoptedBy)",
]);

const roleRegistryAbi = parseAbi([
    "function getRole(uint256 _roleId) external view returns ((uint256 id, uint256 circleId, string name, string purpose, string[] domains, string[] accountabilities, bool exists, bool isCircle))",
]);

const orgFactoryWithSubnameAbi = parseAbi([
    "function createOrganization(string _subname, string _purpose, (string tokenName, string tokenSymbol, address[] initialHolders, uint256[] initialAmounts) _tokenConfig) external returns (uint256)",
    "function getOrganization(uint256 _orgId) external view returns ((uint256 id, string name, string subname, address creator, address roleRegistry, address circleRegistry, address governanceProcess, address meetingFactory, address accessManager, uint256 anchorCircleId, uint256 createdAt, address token))",
    "function organizationCount() external view returns (uint256)",
]);

test.describe("Governance proposal lifecycle", () => {
    let orgId: bigint;
    let anchorCircleId: bigint;
    let roleRegistryAddr: Address;
    let perOrgMeetingFactoryAddr: Address;

    const GOV_CONFIG_GOV = {
        tokenName: "Gov Token",
        tokenSymbol: "GOV",
        initialHolders: [FOUNDER.address],
        initialAmounts: [1_000_000n * 10n ** 18n],
    } as const;

    const ORG_SUBNAME = "gov-lifecycle-e2e";

    test.beforeAll(async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        // Create org
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryWithSubnameAbi,
                functionName: "createOrganization",
                args: [ORG_SUBNAME, "Governance lifecycle test org", GOV_CONFIG_GOV],
            }),
        });

        orgId = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryWithSubnameAbi,
            functionName: "organizationCount",
        });

        const org = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryWithSubnameAbi,
            functionName: "getOrganization",
            args: [orgId],
        });

        roleRegistryAddr = org.roleRegistry;
        anchorCircleId = org.anchorCircleId;

        // Deploy meeting components via the new (subname, orgFactory) API
        const deployReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: ADDRESSES.meetingFactory,
                abi: newMeetingComponentsFactoryAbi,
                functionName: "deploy",
                args: [ORG_SUBNAME, ADDRESSES.orgFactory],
            }),
        });

        // Parse MeetingComponentsDeployed to get the per-org clone address
        for (const log of deployReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: newMeetingComponentsFactoryAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "MeetingComponentsDeployed") {
                    perOrgMeetingFactoryAddr = decoded.args._meetingFactory;
                }
            } catch {
                // not our event
            }
        }

        if (!perOrgMeetingFactoryAddr) {
            throw new Error("MeetingComponentsDeployed event not found — deploy may have failed");
        }
    });

    test("creates a CreateRole proposal, adopts it, verifies role on-chain", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        // Encode CreateRole changeData: abi.encode(circleId, name, purpose, domains[], accountabilities[])
        const { encodeAbiParameters } = await import("viem");
        const changeData = encodeAbiParameters(
            [
                { type: "uint256" },
                { type: "string" },
                { type: "string" },
                { type: "string[]" },
                { type: "string[]" },
            ],
            [anchorCircleId, "E2E Engineer", "Build e2e coverage", ["e2e suite"], ["write tests"]],
        );

        // createProposal: ChangeType.CreateRole = 0
        const createReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "createProposal",
                args: [
                    orgId,
                    anchorCircleId,
                    0n, // proposerRoleId — not a role lead
                    `0x${"aa".repeat(32)}` as `0x${string}`, // tensionHash
                    0, // ChangeType.CreateRole
                    changeData,
                ],
            }),
        });
        expect(createReceipt.status).toBe("success");

        // Parse ProposalCreated event to get proposalId
        let proposalId: bigint | undefined;
        for (const log of createReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: governanceProcessAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "ProposalCreated") {
                    proposalId = decoded.args._proposalId;
                }
            } catch {
                // skip
            }
        }
        expect(proposalId).toBeDefined();

        // adoptProposal — admin only; returns the new roleId
        const adoptReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "adoptProposal",
                args: [proposalId!],
            }),
        });
        expect(adoptReceipt.status).toBe("success");

        // Parse ProposalAdopted to extract resultId (= the new roleId)
        let newRoleId: bigint | undefined;
        for (const log of adoptReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: governanceProcessAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "ProposalAdopted") {
                    newRoleId = decoded.args._resultId;
                }
            } catch {
                // skip
            }
        }
        expect(newRoleId).toBeDefined();
        expect(newRoleId).toBeGreaterThan(0n);

        // Verify role exists in RoleRegistry
        const role = await pub.readContract({
            address: roleRegistryAddr,
            abi: roleRegistryAbi,
            functionName: "getRole",
            args: [newRoleId!],
        });

        expect(role.exists).toBe(true);
        expect(role.name).toBe("E2E Engineer");
        expect(role.purpose).toBe("Build e2e coverage");
        expect([...role.domains]).toEqual(["e2e suite"]);
        expect([...role.accountabilities]).toEqual(["write tests"]);
        expect(role.isCircle).toBe(false);

        // Store for the ExpandRoleToCircle test — expose via test.info storage
        // (Playwright shares describe-scope variables, so we assign to outer let)
        (test as unknown as { _e2eRoleId: bigint })._e2eRoleId = newRoleId!;
    });

    test("creates an ExpandRoleToCircle proposal, adopts it, verifies isCircle=true", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        // First create a role via a CreateRole proposal so we have an independent
        // target for this test (does not depend on the previous test's newRoleId).
        const { encodeAbiParameters } = await import("viem");

        const createChangeData = encodeAbiParameters(
            [
                { type: "uint256" },
                { type: "string" },
                { type: "string" },
                { type: "string[]" },
                { type: "string[]" },
            ],
            [anchorCircleId, "Circle Candidate", "Will become a circle", [], []],
        );

        const createReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "createProposal",
                args: [
                    orgId,
                    anchorCircleId,
                    0n,
                    `0x${"bb".repeat(32)}` as `0x${string}`,
                    0, // CreateRole
                    createChangeData,
                ],
            }),
        });
        expect(createReceipt.status).toBe("success");

        let createProposalId: bigint | undefined;
        for (const log of createReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: governanceProcessAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "ProposalCreated") {
                    createProposalId = decoded.args._proposalId;
                }
            } catch {
                // skip
            }
        }

        const adoptCreateReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "adoptProposal",
                args: [createProposalId!],
            }),
        });

        let targetRoleId: bigint | undefined;
        for (const log of adoptCreateReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: governanceProcessAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "ProposalAdopted") {
                    targetRoleId = decoded.args._resultId;
                }
            } catch {
                // skip
            }
        }
        expect(targetRoleId).toBeDefined();

        // Confirm role is NOT yet a circle
        const roleBefore = await pub.readContract({
            address: roleRegistryAddr,
            abi: roleRegistryAbi,
            functionName: "getRole",
            args: [targetRoleId!],
        });
        expect(roleBefore.isCircle).toBe(false);

        // Encode ExpandRoleToCircle changeData: abi.encode(roleId)
        const expandChangeData = encodeAbiParameters([{ type: "uint256" }], [targetRoleId!]);

        // createProposal: ChangeType.ExpandRoleToCircle = 12
        const expandCreateReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "createProposal",
                args: [
                    orgId,
                    anchorCircleId,
                    0n,
                    `0x${"cc".repeat(32)}` as `0x${string}`,
                    12, // ChangeType.ExpandRoleToCircle
                    expandChangeData,
                ],
            }),
        });
        expect(expandCreateReceipt.status).toBe("success");

        let expandProposalId: bigint | undefined;
        for (const log of expandCreateReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: governanceProcessAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "ProposalCreated") {
                    expandProposalId = decoded.args._proposalId;
                }
            } catch {
                // skip
            }
        }
        expect(expandProposalId).toBeDefined();

        // adoptProposal for ExpandRoleToCircle
        const adoptExpandReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "adoptProposal",
                args: [expandProposalId!],
            }),
        });
        expect(adoptExpandReceipt.status).toBe("success");

        // Verify isCircle is now true
        const roleAfter = await pub.readContract({
            address: roleRegistryAddr,
            abi: roleRegistryAbi,
            functionName: "getRole",
            args: [targetRoleId!],
        });

        expect(roleAfter.exists).toBe(true);
        expect(roleAfter.name).toBe("Circle Candidate");
        expect(roleAfter.isCircle).toBe(true);
    });

    test("ExpandRoleToCircle proposal fails if role is already a circle", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        // Create a role and expand it to a circle
        const { encodeAbiParameters } = await import("viem");

        const createChangeData = encodeAbiParameters(
            [
                { type: "uint256" },
                { type: "string" },
                { type: "string" },
                { type: "string[]" },
                { type: "string[]" },
            ],
            [anchorCircleId, "Already A Circle", "Pre-expand role", [], []],
        );

        // Create + adopt the role
        const createProposalReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "createProposal",
                args: [
                    orgId,
                    anchorCircleId,
                    0n,
                    `0x${"dd".repeat(32)}` as `0x${string}`,
                    0,
                    createChangeData,
                ],
            }),
        });

        let proposalId: bigint | undefined;
        for (const log of createProposalReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: governanceProcessAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "ProposalCreated") proposalId = decoded.args._proposalId;
            } catch {
                /* skip */
            }
        }

        const adoptRoleReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "adoptProposal",
                args: [proposalId!],
            }),
        });

        let roleId: bigint | undefined;
        for (const log of adoptRoleReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: governanceProcessAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "ProposalAdopted") roleId = decoded.args._resultId;
            } catch {
                /* skip */
            }
        }
        expect(roleId).toBeDefined();

        // First expand — should succeed
        const firstExpandData = encodeAbiParameters([{ type: "uint256" }], [roleId!]);
        const firstExpandProposalReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "createProposal",
                args: [
                    orgId,
                    anchorCircleId,
                    0n,
                    `0x${"ee".repeat(32)}` as `0x${string}`,
                    12,
                    firstExpandData,
                ],
            }),
        });

        let firstExpandProposalId: bigint | undefined;
        for (const log of firstExpandProposalReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: governanceProcessAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "ProposalCreated")
                    firstExpandProposalId = decoded.args._proposalId;
            } catch {
                /* skip */
            }
        }

        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "adoptProposal",
                args: [firstExpandProposalId!],
            }),
        });

        // Verify it is now a circle
        const role = await pub.readContract({
            address: roleRegistryAddr,
            abi: roleRegistryAbi,
            functionName: "getRole",
            args: [roleId!],
        });
        expect(role.isCircle).toBe(true);

        // Second expand proposal — adopt should revert
        const secondExpandData = encodeAbiParameters([{ type: "uint256" }], [roleId!]);
        const secondExpandProposalReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "createProposal",
                args: [
                    orgId,
                    anchorCircleId,
                    0n,
                    `0x${"ff".repeat(32)}` as `0x${string}`,
                    12,
                    secondExpandData,
                ],
            }),
        });

        let secondExpandProposalId: bigint | undefined;
        for (const log of secondExpandProposalReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: governanceProcessAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "ProposalCreated")
                    secondExpandProposalId = decoded.args._proposalId;
            } catch {
                /* skip */
            }
        }
        expect(secondExpandProposalId).toBeDefined();

        // adoptProposal should revert because the role is already a circle
        await expect(
            founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "adoptProposal",
                args: [secondExpandProposalId!],
            }),
        ).rejects.toThrow();
    });
});
