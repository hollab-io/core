// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {IActionVoting} from 'interfaces/IActionVoting.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';
import {IVotes} from 'lib/openzeppelin-contracts/contracts/governance/utils/IVotes.sol';

/**
 * @title ActionVoting
 * @notice Event-driven voting on meeting outputs by GovToken holders and collaborators.
 * @dev Stores only what is needed for on-chain verification (double-vote prevention,
 *      weight computation, deadline enforcement). Vote tallies are computed off-chain
 *      by the indexer from VoteCast events.
 */
contract ActionVoting is IActionVoting {
  /*///////////////////////////////////////////////////////////////
                            TYPES
  //////////////////////////////////////////////////////////////*/

  /// @notice Minimal on-chain data per vote — just enough for verification
  struct VoteCore {
    uint256 circleId;
    uint256 snapshotBlock;
    uint256 deadline;
  }

  /*///////////////////////////////////////////////////////////////
                            STATE
  //////////////////////////////////////////////////////////////*/

  /// @notice Reference to the organization factory
  IOrganizationFactory public orgFactory;

  /// @notice Reference to the governance token (IVotes)
  IVotes public govToken;

  /// @notice Auto-incrementing vote ID counter
  uint256 internal _voteCounter;

  /// @notice Whether the contract has been initialized
  bool internal _initialized;

  /// @notice Vote ID => minimal verification data
  mapping(uint256 => VoteCore) internal _voteCores;

  /// @notice Vote ID => voter => has voted
  mapping(uint256 => mapping(address => bool)) internal _hasVoted;

  /// @notice Circle ID => collaborator => weight
  mapping(uint256 => mapping(address => uint256)) internal _collaboratorWeights;

  /// @notice Circle ID => quorum
  mapping(uint256 => uint256) internal _circleQuorum;

  /// @notice Circle ID => collaborator mint cap
  mapping(uint256 => uint256) internal _circleMintCap;

  /// @notice Circle ID => total collaborator weight minted
  mapping(uint256 => uint256) internal _circleMintedTotal;

  /*///////////////////////////////////////////////////////////////
                            MODIFIERS
  //////////////////////////////////////////////////////////////*/

  /// @notice Prevents re-initialization
  modifier initializer() {
    if (_initialized) revert ActionVoting_AlreadyInitialized();
    _initialized = true;
    _;
  }

  /*///////////////////////////////////////////////////////////////
                            CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  /// @notice Disables initialization on the implementation contract
  constructor() {
    _initialized = true;
  }

  /// @inheritdoc IActionVoting
  function initialize(address _orgFactory, address, address _govToken) external initializer {
    orgFactory = IOrganizationFactory(_orgFactory);
    govToken = IVotes(_govToken);
  }

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IActionVoting
  function getVoteWeight(uint256 _voteId, address _voter) external view returns (uint256 _weight) {
    VoteCore storage _core = _voteCores[_voteId];
    if (_core.deadline == 0) revert ActionVoting_VoteNotFound(_voteId);
    _weight = _computeWeight(_core.circleId, _core.snapshotBlock, _voter);
  }

  /// @inheritdoc IActionVoting
  function getCollaboratorWeight(uint256 _circleId, address _collaborator) external view returns (uint256 _weight) {
    _weight = _collaboratorWeights[_circleId][_collaborator];
  }

  /// @inheritdoc IActionVoting
  function hasVoted(uint256 _voteId, address _voter) external view returns (bool _voted) {
    _voted = _hasVoted[_voteId][_voter];
  }

  /// @inheritdoc IActionVoting
  function getCircleQuorum(uint256 _circleId) external view returns (uint256 _quorum) {
    _quorum = _circleQuorum[_circleId];
  }

  /// @inheritdoc IActionVoting
  function getCircleMintCap(uint256 _circleId) external view returns (uint256 _cap) {
    _cap = _circleMintCap[_circleId];
  }

  /// @inheritdoc IActionVoting
  function getCircleMintedTotal(uint256 _circleId) external view returns (uint256 _total) {
    _total = _circleMintedTotal[_circleId];
  }

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IActionVoting
  function createVote(
    uint256 _circleId,
    uint256 _outputId,
    string calldata _reason,
    uint256 _duration
  ) external returns (uint256 _voteId) {
    if (bytes(_reason).length == 0) revert ActionVoting_EmptyReason();
    if (_duration == 0) revert ActionVoting_InvalidDuration();

    _assertOrgAdmin(_circleId);

    if (_circleQuorum[_circleId] == 0) revert ActionVoting_QuorumNotSet(_circleId);

    _voteId = ++_voteCounter;
    uint256 _snapshotBlock = block.number - 1;
    uint256 _deadline = block.timestamp + _duration;

    _voteCores[_voteId] = VoteCore({circleId: _circleId, snapshotBlock: _snapshotBlock, deadline: _deadline});

    emit VoteCreated(_voteId, _circleId, _outputId, msg.sender, _deadline, _reason, _snapshotBlock);
  }

  /// @inheritdoc IActionVoting
  function castVote(uint256 _voteId, HolacracyTypes.VoteSupport _support) external {
    VoteCore storage _core = _voteCores[_voteId];
    if (_core.deadline == 0) revert ActionVoting_VoteNotFound(_voteId);
    if (block.timestamp > _core.deadline) revert ActionVoting_VoteNotActive(_voteId);
    if (_hasVoted[_voteId][msg.sender]) revert ActionVoting_AlreadyVoted(_voteId, msg.sender);

    uint256 _weight = _computeWeight(_core.circleId, _core.snapshotBlock, msg.sender);
    if (_weight == 0) revert ActionVoting_NoVotingPower(_voteId, msg.sender);

    _hasVoted[_voteId][msg.sender] = true;

    emit VoteCast(_voteId, msg.sender, _support, _weight);
  }

  /// @inheritdoc IActionVoting
  function grantCollaboratorWeight(uint256 _circleId, address _collaborator, uint256 _weight) external {
    _assertOrgAdmin(_circleId);
    if (_collaborator == address(0)) revert ActionVoting_ZeroAddress();
    if (_weight == 0) revert ActionVoting_ZeroAmount();

    uint256 _existing = _collaboratorWeights[_circleId][_collaborator];
    uint256 _cap = _circleMintCap[_circleId];
    uint256 _minted = _circleMintedTotal[_circleId];

    uint256 _netIncrease = _weight > _existing ? _weight - _existing : 0;
    if (_cap > 0 && _minted + _netIncrease > _cap) {
      revert ActionVoting_MintCapExceeded(_circleId, _netIncrease, _cap - _minted);
    }

    if (_weight > _existing) {
      _circleMintedTotal[_circleId] = _minted + _netIncrease;
    } else if (_weight < _existing) {
      _circleMintedTotal[_circleId] = _minted - (_existing - _weight);
    }

    _collaboratorWeights[_circleId][_collaborator] = _weight;

    emit CollaboratorWeightGranted(_circleId, _collaborator, _weight);
  }

  /// @inheritdoc IActionVoting
  function revokeCollaboratorWeight(uint256 _circleId, address _collaborator) external {
    _assertOrgAdmin(_circleId);

    uint256 _existing = _collaboratorWeights[_circleId][_collaborator];
    if (_existing > 0) {
      _circleMintedTotal[_circleId] -= _existing;
    }

    delete _collaboratorWeights[_circleId][_collaborator];

    emit CollaboratorWeightRevoked(_circleId, _collaborator);
  }

  /// @inheritdoc IActionVoting
  function setCircleQuorum(uint256 _circleId, uint256 _quorum) external {
    _assertOrgAdmin(_circleId);
    if (_quorum == 0) revert ActionVoting_ZeroAmount();

    _circleQuorum[_circleId] = _quorum;

    emit CircleQuorumSet(_circleId, _quorum);
  }

  /// @inheritdoc IActionVoting
  function setCircleMintCap(uint256 _circleId, uint256 _cap) external {
    _assertOrgAdmin(_circleId);

    _circleMintCap[_circleId] = _cap;

    emit CircleMintCapSet(_circleId, _cap);
  }

  /*///////////////////////////////////////////////////////////////
                            INTERNAL
  //////////////////////////////////////////////////////////////*/

  /// @notice Computes the vote weight for a voter
  function _computeWeight(uint256 _circleId, uint256 _snapshotBlock, address _voter) internal view returns (uint256) {
    uint256 _tokenWeight = govToken.getPastVotes(_voter, _snapshotBlock);
    uint256 _collabWeight = _collaboratorWeights[_circleId][_voter];
    return _tokenWeight + _collabWeight;
  }

  /// @notice Asserts caller is org admin
  function _assertOrgAdmin(uint256 _circleId) internal view {
    if (!orgFactory.isOrgAdmin(_circleId, msg.sender)) {
      revert ActionVoting_NotCircleLeadOrFacilitator(_circleId);
    }
  }
}
