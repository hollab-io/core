// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {IGovernanceProcess} from 'interfaces/IGovernanceProcess.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';

/**
 * @title GovernanceProcess
 * @notice Implements the asynchronous governance proposal flow
 * @dev Proposals go through: Draft → Active → (Objections?) → Integrating → Adopted/Discarded
 *      The Facilitator of each circle manages objection testing and proposal adoption.
 */
contract GovernanceProcess is IGovernanceProcess {
  /*///////////////////////////////////////////////////////////////
                            STATE
  //////////////////////////////////////////////////////////////*/

  /// @notice Reference to the circle registry
  CircleRegistry public circleRegistry;

  /// @notice Reference to the role registry
  RoleRegistry public roleRegistry;

  /// @notice Auto-incrementing proposal ID counter
  uint256 internal _proposalCounter;

  /// @notice Auto-incrementing objection ID counter
  uint256 internal _objectionCounter;

  /// @notice Proposal ID => Proposal data
  mapping(uint256 => HolacracyTypes.Proposal) internal _proposals;

  /// @notice Objection ID => Objection data
  mapping(uint256 => HolacracyTypes.Objection) internal _objections;

  /// @notice Proposal ID => objection IDs
  mapping(uint256 => uint256[]) internal _proposalObjections;

  /// @notice Circle ID => proposal IDs
  mapping(uint256 => uint256[]) internal _circleProposals;

  /// @notice Whether the contract has been initialized
  bool internal _initialized;

  /*///////////////////////////////////////////////////////////////
                            MODIFIERS
  //////////////////////////////////////////////////////////////*/

  /// @notice Prevents re-initialization
  modifier initializer() {
    if (_initialized) revert GovernanceProcess_AlreadyInitialized();
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

  /// @notice Initializes a clone of GovernanceProcess
  /// @param _circleRegistry The CircleRegistry contract
  /// @param _roleRegistry The RoleRegistry contract
  function initialize(CircleRegistry _circleRegistry, RoleRegistry _roleRegistry) external initializer {
    circleRegistry = _circleRegistry;
    roleRegistry = _roleRegistry;
  }

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IGovernanceProcess
  function proposalCount() external view returns (uint256 _count) {
    _count = _proposalCounter;
  }

  /// @inheritdoc IGovernanceProcess
  function getProposal(uint256 _proposalId) external view returns (HolacracyTypes.Proposal memory _proposal) {
    _proposal = _proposals[_proposalId];
    if (_proposal.id == 0) revert GovernanceProcess_ProposalNotFound(_proposalId);
  }

  /// @inheritdoc IGovernanceProcess
  function getObjection(uint256 _objectionId) external view returns (HolacracyTypes.Objection memory _objection) {
    _objection = _objections[_objectionId];
    if (_objection.id == 0) revert GovernanceProcess_ObjectionNotFound(_objectionId);
  }

  /// @inheritdoc IGovernanceProcess
  function getProposalObjections(uint256 _proposalId) external view returns (uint256[] memory _objectionIds) {
    _objectionIds = _proposalObjections[_proposalId];
  }

  /// @inheritdoc IGovernanceProcess
  function getCircleProposals(uint256 _circleId) external view returns (uint256[] memory _proposalIds) {
    _proposalIds = _circleProposals[_circleId];
  }

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IGovernanceProcess
  function submitProposal(
    uint256 _circleId,
    uint256 _proposerRoleId,
    string calldata _tension,
    string calldata _example,
    string calldata _explanation,
    HolacracyTypes.GovernanceChange calldata _change
  ) external returns (uint256 _proposalId) {
    if (!circleRegistry.isCircleMember(_circleId, msg.sender)) {
      revert GovernanceProcess_NotCircleMember(_circleId, msg.sender);
    }
    if (bytes(_tension).length == 0) revert GovernanceProcess_EmptyTension();

    _proposalId = ++_proposalCounter;

    HolacracyTypes.Proposal storage _proposal = _proposals[_proposalId];
    _proposal.id = _proposalId;
    _proposal.circleId = _circleId;
    _proposal.proposer = msg.sender;
    _proposal.proposerRoleId = _proposerRoleId;
    _proposal.tension = _tension;
    _proposal.example = _example;
    _proposal.explanation = _explanation;
    _proposal.change = _change;
    _proposal.status = HolacracyTypes.ProposalStatus.Draft;
    _proposal.createdAt = block.timestamp;

    _circleProposals[_circleId].push(_proposalId);

    emit ProposalSubmitted(_proposalId, _circleId, msg.sender);
  }

  /// @inheritdoc IGovernanceProcess
  function activateProposal(uint256 _proposalId) external {
    HolacracyTypes.Proposal storage _proposal = _proposals[_proposalId];
    if (_proposal.id == 0) revert GovernanceProcess_ProposalNotFound(_proposalId);
    if (_proposal.proposer != msg.sender) revert GovernanceProcess_NotProposer(_proposalId);
    if (_proposal.status != HolacracyTypes.ProposalStatus.Draft) {
      revert GovernanceProcess_InvalidProposalStatus(_proposalId, HolacracyTypes.ProposalStatus.Draft);
    }

    _proposal.status = HolacracyTypes.ProposalStatus.Active;

    emit ProposalActivated(_proposalId);
  }

  /// @inheritdoc IGovernanceProcess
  function raiseObjection(
    uint256 _proposalId,
    uint256 _objectorRoleId,
    string calldata _concern,
    bool _isConstitutionalViolation
  ) external returns (uint256 _objectionId) {
    HolacracyTypes.Proposal storage _proposal = _proposals[_proposalId];
    if (_proposal.id == 0) revert GovernanceProcess_ProposalNotFound(_proposalId);
    if (_proposal.status != HolacracyTypes.ProposalStatus.Active) {
      revert GovernanceProcess_InvalidProposalStatus(_proposalId, HolacracyTypes.ProposalStatus.Active);
    }
    if (!circleRegistry.isCircleMember(_proposal.circleId, msg.sender)) {
      revert GovernanceProcess_NotCircleMember(_proposal.circleId, msg.sender);
    }

    _objectionId = ++_objectionCounter;

    HolacracyTypes.Objection storage _objection = _objections[_objectionId];
    _objection.id = _objectionId;
    _objection.proposalId = _proposalId;
    _objection.objector = msg.sender;
    _objection.objectorRoleId = _objectorRoleId;
    _objection.concern = _concern;
    _objection.isConstitutionalViolation = _isConstitutionalViolation;
    _objection.status = HolacracyTypes.ObjectionStatus.Raised;
    _objection.createdAt = block.timestamp;

    _proposalObjections[_proposalId].push(_objectionId);

    // Move proposal to Integrating status
    _proposal.status = HolacracyTypes.ProposalStatus.Integrating;

    emit ObjectionRaised(_objectionId, _proposalId, msg.sender);
  }

  /// @inheritdoc IGovernanceProcess
  function resolveObjection(uint256 _objectionId, string calldata _resolution) external {
    HolacracyTypes.Objection storage _objection = _objections[_objectionId];
    if (_objection.id == 0) revert GovernanceProcess_ObjectionNotFound(_objectionId);

    HolacracyTypes.Proposal storage _proposal = _proposals[_objection.proposalId];
    _assertFacilitator(_proposal.circleId);

    if (
      _objection.status != HolacracyTypes.ObjectionStatus.Raised
        && _objection.status != HolacracyTypes.ObjectionStatus.Testing
    ) {
      revert GovernanceProcess_InvalidObjectionStatus(_objectionId, HolacracyTypes.ObjectionStatus.Raised);
    }

    _objection.status = HolacracyTypes.ObjectionStatus.Resolved;
    _objection.resolution = _resolution;

    // If all objections resolved, move proposal back to Active for re-check
    if (_allObjectionsResolved(_objection.proposalId)) {
      _proposal.status = HolacracyTypes.ProposalStatus.Active;
    }

    emit ObjectionResolved(_objectionId, _objection.proposalId);
  }

  /// @inheritdoc IGovernanceProcess
  function invalidateObjection(uint256 _objectionId) external {
    HolacracyTypes.Objection storage _objection = _objections[_objectionId];
    if (_objection.id == 0) revert GovernanceProcess_ObjectionNotFound(_objectionId);

    HolacracyTypes.Proposal storage _proposal = _proposals[_objection.proposalId];
    _assertFacilitator(_proposal.circleId);

    if (
      _objection.status != HolacracyTypes.ObjectionStatus.Raised
        && _objection.status != HolacracyTypes.ObjectionStatus.Testing
    ) {
      revert GovernanceProcess_InvalidObjectionStatus(_objectionId, HolacracyTypes.ObjectionStatus.Raised);
    }

    _objection.status = HolacracyTypes.ObjectionStatus.Invalid;

    // If all objections resolved/invalid, move proposal back to Active
    if (_allObjectionsResolved(_objection.proposalId)) {
      _proposal.status = HolacracyTypes.ProposalStatus.Active;
    }

    emit ObjectionInvalidated(_objectionId, _objection.proposalId);
  }

  /// @inheritdoc IGovernanceProcess
  function adoptProposal(uint256 _proposalId) external {
    HolacracyTypes.Proposal storage _proposal = _proposals[_proposalId];
    if (_proposal.id == 0) revert GovernanceProcess_ProposalNotFound(_proposalId);
    _assertFacilitator(_proposal.circleId);

    if (_proposal.status != HolacracyTypes.ProposalStatus.Active) {
      revert GovernanceProcess_InvalidProposalStatus(_proposalId, HolacracyTypes.ProposalStatus.Active);
    }

    // Ensure no unresolved objections
    if (!_allObjectionsResolved(_proposalId)) {
      revert GovernanceProcess_UnresolvedObjections(_proposalId);
    }

    _proposal.status = HolacracyTypes.ProposalStatus.Adopted;
    _proposal.resolvedAt = block.timestamp;

    // Execute the governance change
    _executeChange(_proposal.circleId, _proposal.change);

    emit ProposalAdopted(_proposalId);
  }

  /// @inheritdoc IGovernanceProcess
  function withdrawProposal(uint256 _proposalId) external {
    HolacracyTypes.Proposal storage _proposal = _proposals[_proposalId];
    if (_proposal.id == 0) revert GovernanceProcess_ProposalNotFound(_proposalId);
    if (_proposal.proposer != msg.sender) revert GovernanceProcess_NotProposer(_proposalId);

    if (
      _proposal.status != HolacracyTypes.ProposalStatus.Draft
        && _proposal.status != HolacracyTypes.ProposalStatus.Active
        && _proposal.status != HolacracyTypes.ProposalStatus.Integrating
    ) {
      revert GovernanceProcess_InvalidProposalStatus(_proposalId, HolacracyTypes.ProposalStatus.Draft);
    }

    _proposal.status = HolacracyTypes.ProposalStatus.Withdrawn;
    _proposal.resolvedAt = block.timestamp;

    emit ProposalWithdrawn(_proposalId);
  }

  /// @inheritdoc IGovernanceProcess
  function discardProposal(uint256 _proposalId) external {
    HolacracyTypes.Proposal storage _proposal = _proposals[_proposalId];
    if (_proposal.id == 0) revert GovernanceProcess_ProposalNotFound(_proposalId);
    _assertFacilitator(_proposal.circleId);

    _proposal.status = HolacracyTypes.ProposalStatus.Discarded;
    _proposal.resolvedAt = block.timestamp;

    emit ProposalDiscarded(_proposalId);
  }

  /*///////////////////////////////////////////////////////////////
                            INTERNAL
  //////////////////////////////////////////////////////////////*/

  /// @notice Asserts the caller is the facilitator of the circle
  function _assertFacilitator(uint256 _circleId) internal view {
    address _facilitator =
      circleRegistry.getElectedRole(_circleId, HolacracyTypes.ElectedRole.Facilitator);

    // If no facilitator is elected, circle leads can act as facilitator
    if (_facilitator == address(0)) {
      if (!circleRegistry.isCircleLead(_circleId, msg.sender)) {
        revert GovernanceProcess_NotFacilitator(_circleId);
      }
    } else {
      if (msg.sender != _facilitator) {
        revert GovernanceProcess_NotFacilitator(_circleId);
      }
    }
  }

  /// @notice Checks if all objections for a proposal are resolved or invalid
  function _allObjectionsResolved(uint256 _proposalId) internal view returns (bool) {
    uint256[] storage _objIds = _proposalObjections[_proposalId];
    for (uint256 _i; _i < _objIds.length; ++_i) {
      HolacracyTypes.ObjectionStatus _status = _objections[_objIds[_i]].status;
      if (
        _status == HolacracyTypes.ObjectionStatus.Raised || _status == HolacracyTypes.ObjectionStatus.Testing
          || _status == HolacracyTypes.ObjectionStatus.Valid
      ) {
        return false;
      }
    }
    return true;
  }

  /// @notice Executes a governance change after proposal adoption
  /// @dev Decodes the change data and calls the appropriate registry function.
  ///      All role mutations go through CircleRegistry (which is the authorized caller on RoleRegistry).
  function _executeChange(uint256 _circleId, HolacracyTypes.GovernanceChange memory _change) internal {
    if (_change.changeType == HolacracyTypes.ChangeType.CreateRole) {
      (string memory _name, string memory _purpose, string[] memory _domains, string[] memory _accountabilities) =
        abi.decode(_change.encodedData, (string, string, string[], string[]));
      circleRegistry.createRoleInCircle(_circleId, _name, _purpose, _domains, _accountabilities);
    } else if (_change.changeType == HolacracyTypes.ChangeType.AmendRole) {
      (string memory _name, string memory _purpose, string[] memory _domains, string[] memory _accountabilities) =
        abi.decode(_change.encodedData, (string, string, string[], string[]));
      circleRegistry.updateRoleInCircle(_circleId, _change.targetId, _name, _purpose, _domains, _accountabilities);
    } else if (_change.changeType == HolacracyTypes.ChangeType.RemoveRole) {
      circleRegistry.removeRoleFromCircle(_circleId, _change.targetId);
    } else if (_change.changeType == HolacracyTypes.ChangeType.CreatePolicy) {
      (string memory _name, string memory _body) = abi.decode(_change.encodedData, (string, string));
      circleRegistry.addPolicy(_circleId, _name, _body);
    } else if (_change.changeType == HolacracyTypes.ChangeType.AmendPolicy) {
      // Remove old and create new — policies are immutable records
      circleRegistry.removePolicy(_circleId, _change.targetId);
      (string memory _name, string memory _body) = abi.decode(_change.encodedData, (string, string));
      circleRegistry.addPolicy(_circleId, _name, _body);
    } else if (_change.changeType == HolacracyTypes.ChangeType.RemovePolicy) {
      circleRegistry.removePolicy(_circleId, _change.targetId);
    }
    // MoveRole and Election are handled separately (not auto-executed)
  }
}
