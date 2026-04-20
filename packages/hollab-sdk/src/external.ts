// Types
export type {
    EncryptedPayload,
    KeyShare,
    StreamId,
    LogEntry,
    StorageConfig,
    OrgMeta,
    CircleMeta,
    Tension,
    Proposal,
    RoleConfig,
    OkrObjective,
    OkrKeyResult,
    OrgClientConfig,
    ContentRefEvent,
    IndexedEvent,
    ProposalEvent,
    RoleChange,
    CircleChange,
    EventIndexerConfig,
} from "./internal.js";

// Interfaces
export type { IKeyManager, IStorageClient, IOrgClient, IEventIndexer } from "./internal.js";

// 0G client interfaces (for DI)
export type { ZeroGKvClient, ZeroGLogClient } from "./internal.js";

// Exceptions
export { HollabSdkError, EncryptionError, StorageError, KeyDerivationError } from "./internal.js";

// Implementations
export { KeyManager, StorageClient, OrgClient, EventIndexer } from "./internal.js";

// Schema helpers
export {
    buildStreamId,
    buildOrgMetaKey,
    buildCircleMetaKey,
    buildTensionKey,
    buildProposalKey,
    buildTreasuryLogKey,
    buildRoleConfigKey,
    buildRoleMemoryKey,
    buildAgentStateKey,
    buildCircleKeyShareKey,
    buildRoleKeyShareKey,
    buildOkrKey,
} from "./internal.js";

// Constants
export { KEY_INFO, MASTER_KEY_MESSAGE_PREFIX, SHARED_SECRET_MESSAGE_PREFIX } from "./internal.js";
