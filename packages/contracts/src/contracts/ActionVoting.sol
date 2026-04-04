// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {IActionVoting} from 'interfaces/IActionVoting.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {TacticalMeeting} from 'contracts/TacticalMeeting.sol';
import {IVotes} from 'lib/openzeppelin-contracts/contracts/governance/utils/IVotes.sol';

/**
 * @title ActionVoting
 * @notice Lightweight voting on tactical meeting outputs by GovToken holders and collaborators
 * @dev Vote weight = IVotes.getPastVotes(voter, snapshotBlock) + collaboratorWeights[circleId][voter].
 *      Status is computed on-read (no finalize tx required).
 */
contract ActionVoting is IActionVoting {
  /*///////////////////////////////////////////////////////////////
                            STATE
  //////////////////////////////////////////////////////////////*/

  /// @notice Reference to the circle registry
  CircleRegistry public circleRegistry;

  /// @notice Reference to the tactical meeting contract
  TacticalMeeting public tacticalMeeting;

  /// @notice Reference to the governance token (IVotes)
  IVotes public govToken;

  /// @notice Auto-incrementing vote ID counter
  uint256 internal _voteCounter;

  /// @notice Whether the contract has been initialized
  bool internal _initialized;

  /// @notice Vote ID => ActionVote data
  mapping(uint256 => HolacracyTypes.ActionVote) internal _votes;

  /// @notice Circle ID => vote IDs
  mapping(uint256 => uint256[]) internal _circleVotes;

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
  function initialize(address _circleRegistry, address _tacticalMeeting, address _govToken) external initializer {
    circleRegistry = CircleRegistry(_circleRegistry);
    tacticalMeeting = TacticalMeeting(_tacticalMeeting);
    govToken = IVotes(_govToken);
  }

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IActionVoting
  function getVote(uint256 _voteId) external view returns (HolacracyTypes.ActionVote memory _vote) {
    _vote = _votes[_voteId];
    if (!_vote.exists) revert ActionVoting_VoteNotFound(_voteId);
  }

  /// @inheritdoc IActionVoting
  function getVoteStatus(uint256 _voteId) external view returns (HolacracyTypes.VoteStatus _status) {
    HolacracyTypes.ActionVote storage _vote = _votes[_voteId];
    if (!_vote.exists) revert ActionVoting_VoteNotFound(_voteId);
    _status = _computeStatus(_vote);
  }

  /// @inheritdoc IActionVoting
  function getVoteWeight(uint256 _voteId, address _voter) external view returns (uint256 _weight) {
    HolacracyTypes.ActionVote storage _vote = _votes[_voteId];
    if (!_vote.exists) revert ActionVoting_VoteNotFound(_voteId);
    _weight = _computeWeight(_vote.circleId, _vote.snapshotBlock, _voter);
  }

  /// @inheritdoc IActionVoting
  function getCircleVotes(uint256 _circleId) external view returns (uint256[] memory _voteIds) {
    _voteIds = _circleVotes[_circleId];
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
    uint256 _outputId,
    string calldata _reason,
    uint256 _duration
  ) external returns (uint256 _voteId) {
    if (bytes(_reason).length == 0) revert ActionVoting_EmptyReason();
    if (_duration == 0) revert ActionVoting_InvalidDuration();

    // Verify output exists and get its circle
    HolacracyTypes.MeetingOutput memory _output = tacticalMeeting.getOutput(_outputId);
    if (_output.id == 0) revert ActionVoting_OutputNotFound(_outputId);

    uint256 _circleId = _getOutputCircleId(_output.meetingId);
    _assertCircleLeadOrFacilitator(_circleId);

    if (_circleQuorum[_circleId] == 0) revert ActionVoting_QuorumNotSet(_circleId);

    _voteId = ++_voteCounter;

    HolacracyTypes.ActionVote storage _vote = _votes[_voteId];
    _vote.id = _voteId;
    _vote.circleId = _circleId;
    _vote.outputId = _outputId;
    _vote.proposer = msg.sender;
    _vote.reason = _reason;
    _vote.snapshotBlock = block.number - 1;
    _vote.deadline = block.timestamp + _duration;
    _vote.exists = true;

    _circleVotes[_circleId].push(_voteId);

    emit VoteCreated(_voteId, _circleId, _outputId, msg.sender, _vote.deadline);
  }

  /// @inheritdoc IActionVoting
  function castVote(uint256 _voteId, HolacracyTypes.VoteSupport _support) external {
    HolacracyTypes.ActionVote storage _vote = _votes[_voteId];
    if (!_vote.exists) revert ActionVoting_VoteNotFound(_voteId);
    if (block.timestamp > _vote.deadline) revert ActionVoting_VoteNotActive(_voteId);
    if (_hasVoted[_voteId][msg.sender]) revert ActionVoting_AlreadyVoted(_voteId, msg.sender);

    uint256 _weight = _computeWeight(_vote.circleId, _vote.snapshotBlock, msg.sender);
    if (_weight == 0) revert ActionVoting_NoVotingPower(_voteId, msg.sender);

    _hasVoted[_voteId][msg.sender] = true;

    if (_support == HolacracyTypes.VoteSupport.For) {
      _vote.forVotes += _weight;
    } else if (_support == HolacracyTypes.VoteSupport.Against) {
      _vote.againstVotes += _weight;
    } else {
      _vote.abstainVotes += _weight;
    }

    emit VoteCast(_voteId, msg.sender, _support, _weight);
  }

  /// @inheritdoc IActionVoting
  function grantCollaboratorWeight(uint256 _circleId, address _collaborator, uint256 _weight) external {
    _assertCircleLead(_circleId);
    if (_collaborator == address(0)) revert ActionVoting_ZeroAddress();
    if (_weight == 0) revert ActionVoting_ZeroAmount();

    uint256 _existing = _collaboratorWeights[_circleId][_collaborator];
    uint256 _cap = _circleMintCap[_circleId];
    uint256 _minted = _circleMintedTotal[_circleId];

    // Calculate net change: new weight minus any existing weight being replaced
    uint256 _netIncrease = _weight > _existing ? _weight - _existing : 0;
    if (_cap > 0 && _minted + _netIncrease > _cap) {
      revert ActionVoting_MintCapExceeded(_circleId, _netIncrease, _cap - _minted);
    }

    // Update minted total
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
    _assertCircleLead(_circleId);

    uint256 _existing = _collaboratorWeights[_circleId][_collaborator];
    if (_existing > 0) {
      _circleMintedTotal[_circleId] -= _existing;
    }

    delete _collaboratorWeights[_circleId][_collaborator];

    emit CollaboratorWeightRevoked(_circleId, _collaborator);
  }

  /// @inheritdoc IActionVoting
  function setCircleQuorum(uint256 _circleId, uint256 _quorum) external {
    _assertCircleLead(_circleId);
    if (_quorum == 0) revert ActionVoting_ZeroAmount();

    _circleQuorum[_circleId] = _quorum;

    emit CircleQuorumSet(_circleId, _quorum);
  }

  /// @inheritdoc IActionVoting
  function setCircleMintCap(uint256 _circleId, uint256 _cap) external {
    _assertCircleLead(_circleId);

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

  /// @notice Computes the status of a vote on-read
  function _computeStatus(HolacracyTypes.ActionVote storage _vote) internal view returns (HolacracyTypes.VoteStatus) {
    if (block.timestamp <= _vote.deadline) {
      return HolacracyTypes.VoteStatus.Active;
    }

    uint256 _totalVotes = _vote.forVotes + _vote.againstVotes + _vote.abstainVotes;
    if (_totalVotes == 0) {
      return HolacracyTypes.VoteStatus.Expired;
    }

    uint256 _quorum = _circleQuorum[_vote.circleId];
    if (_vote.forVotes >= _quorum && _vote.forVotes > _vote.againstVotes) {
      return HolacracyTypes.VoteStatus.Passed;
    }

    return HolacracyTypes.VoteStatus.Defeated;
  }

  /// @notice Gets the circle ID for a meeting output
  function _getOutputCircleId(uint256 _meetingId) internal view returns (uint256) {
    HolacracyTypes.TacticalMeeting memory _meeting = tacticalMeeting.getMeeting(_meetingId);
    return _meeting.circleId;
  }

  /// @notice Asserts caller is circle lead or facilitator
  function _assertCircleLeadOrFacilitator(uint256 _circleId) internal view {
    if (circleRegistry.isCircleLead(_circleId, msg.sender)) return;

    address _facilitator = circleRegistry.getElectedRole(_circleId, HolacracyTypes.ElectedRole.Facilitator);
    if (_facilitator != address(0) && msg.sender == _facilitator) return;

    revert ActionVoting_NotCircleLeadOrFacilitator(_circleId);
  }

  /// @notice Asserts caller is circle lead
  function _assertCircleLead(uint256 _circleId) internal view {
    if (!circleRegistry.isCircleLead(_circleId, msg.sender)) {
      revert ActionVoting_NotCircleLeadOrFacilitator(_circleId);
    }
  }
}
