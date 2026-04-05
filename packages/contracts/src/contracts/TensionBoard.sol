// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';

/**
 * @title TensionBoard
 * @notice Lets anyone — including non-members — submit a tension (topic)
 *         for a circle's tactical or governance meeting.
 *
 *         Circle members can then champion a tension into a formal agenda item,
 *         or dismiss it. This follows the Holacracy principle that anyone in the
 *         broader organization (or even outside) can surface tensions to any circle.
 *
 *         One open tension per (author, orgId, circleId) pair is enforced on-chain.
 */
contract TensionBoard {
  /*///////////////////////////////////////////////////////////////
                          TYPES
  //////////////////////////////////////////////////////////////*/

  enum TensionStatus {
    Open,        // 0 — submitted, awaiting review
    Championed,  // 1 — a circle member has picked it up
    Dismissed,   // 2 — not relevant / out of scope
    Processed    // 3 — addressed in a meeting
  }

  enum TensionTarget {
    Tactical,    // 0 — for a tactical huddle
    Governance   // 1 — for a governance meeting
  }

  struct Tension {
    uint256 id;
    address author;
    uint256 orgId;
    uint256 circleId;
    TensionTarget target;
    string title;
    string description;
    TensionStatus status;
    address champion;      // circle member who picked it up (zero if none)
    uint256 submittedAt;
    uint256 resolvedAt;
  }

  /*///////////////////////////////////////////////////////////////
                          STATE
  //////////////////////////////////////////////////////////////*/

  IOrganizationFactory public immutable FACTORY;

  uint256 private _tensionCounter;

  /// @notice tensionId => Tension
  mapping(uint256 => Tension) private _tensions;

  /// @notice orgId => tensionIds (all, including resolved)
  mapping(uint256 => uint256[]) private _orgTensions;

  /// @notice author => orgId => circleId => true while an open tension exists
  mapping(address => mapping(uint256 => mapping(uint256 => bool))) private _hasOpen;

  /*///////////////////////////////////////////////////////////////
                          EVENTS
  //////////////////////////////////////////////////////////////*/

  event TensionSubmitted(
    uint256 indexed tensionId,
    address indexed author,
    uint256 indexed orgId,
    uint256 circleId,
    uint8 target,
    string title,
    string description
  );

  event TensionChampioned(uint256 indexed tensionId, address indexed champion);
  event TensionDismissed(uint256 indexed tensionId, address indexed dismissedBy);
  event TensionProcessed(uint256 indexed tensionId);

  /*///////////////////////////////////////////////////////////////
                          ERRORS
  //////////////////////////////////////////////////////////////*/

  error TensionBoard_AlreadyOpen(address author, uint256 orgId, uint256 circleId);
  error TensionBoard_NotFound(uint256 tensionId);
  error TensionBoard_NotOpen(uint256 tensionId);
  error TensionBoard_OrgNotFound(uint256 orgId);
  error TensionBoard_Unauthorized(address caller, uint256 orgId);

  /*///////////////////////////////////////////////////////////////
                          CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  constructor(address _factory) {
    FACTORY = IOrganizationFactory(_factory);
  }

  /*///////////////////////////////////////////////////////////////
                          EXTERNAL
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Submit a tension for a circle. Anyone can call this.
   * @param orgId    The organization ID.
   * @param circleId The target circle within the org.
   * @param target   Whether this is for a Tactical (0) or Governance (1) meeting.
   * @param title    Short label for the tension.
   * @param description Fuller context — the situation, its impact, and what might help.
   * @return tensionId The ID of the newly created tension.
   */
  function submitTension(
    uint256 orgId,
    uint256 circleId,
    TensionTarget target,
    string calldata title,
    string calldata description
  ) external returns (uint256 tensionId) {
    HolacracyTypes.Organization memory org = FACTORY.getOrganization(orgId);
    if (org.id == 0) revert TensionBoard_OrgNotFound(orgId);
    if (_hasOpen[msg.sender][orgId][circleId]) revert TensionBoard_AlreadyOpen(msg.sender, orgId, circleId);

    tensionId = ++_tensionCounter;
    _tensions[tensionId] = Tension({
      id: tensionId,
      author: msg.sender,
      orgId: orgId,
      circleId: circleId,
      target: target,
      title: title,
      description: description,
      status: TensionStatus.Open,
      champion: address(0),
      submittedAt: block.timestamp,
      resolvedAt: 0
    });
    _orgTensions[orgId].push(tensionId);
    _hasOpen[msg.sender][orgId][circleId] = true;

    emit TensionSubmitted(tensionId, msg.sender, orgId, circleId, uint8(target), title, description);
  }

  /**
   * @notice A circle member champions a tension, signaling intent to bring it
   *         into an upcoming meeting. Only the org creator can call for now.
   */
  function champion(uint256 tensionId) external {
    Tension storage t = _tensions[tensionId];
    if (t.id == 0) revert TensionBoard_NotFound(tensionId);
    if (t.status != TensionStatus.Open) revert TensionBoard_NotOpen(tensionId);
    _assertOrgAdmin(t.orgId);

    t.status = TensionStatus.Championed;
    t.champion = msg.sender;

    emit TensionChampioned(tensionId, msg.sender);
  }

  /**
   * @notice Dismiss a tension as not relevant. Only the org creator can call.
   */
  function dismiss(uint256 tensionId) external {
    Tension storage t = _tensions[tensionId];
    if (t.id == 0) revert TensionBoard_NotFound(tensionId);
    if (t.status != TensionStatus.Open) revert TensionBoard_NotOpen(tensionId);
    _assertOrgAdmin(t.orgId);

    t.status = TensionStatus.Dismissed;
    t.resolvedAt = block.timestamp;
    _hasOpen[t.author][t.orgId][t.circleId] = false;

    emit TensionDismissed(tensionId, msg.sender);
  }

  /**
   * @notice Mark a tension as processed (addressed in a meeting).
   *         Only the org creator can call.
   */
  function markProcessed(uint256 tensionId) external {
    Tension storage t = _tensions[tensionId];
    if (t.id == 0) revert TensionBoard_NotFound(tensionId);
    if (t.status != TensionStatus.Open && t.status != TensionStatus.Championed) {
      revert TensionBoard_NotOpen(tensionId);
    }
    _assertOrgAdmin(t.orgId);

    t.status = TensionStatus.Processed;
    t.resolvedAt = block.timestamp;
    _hasOpen[t.author][t.orgId][t.circleId] = false;

    emit TensionProcessed(tensionId);
  }

  /*///////////////////////////////////////////////////////////////
                          VIEW
  //////////////////////////////////////////////////////////////*/

  function getTension(uint256 tensionId) external view returns (Tension memory) {
    return _tensions[tensionId];
  }

  /// @notice Returns all tensions for an org, newest last.
  function getOrgTensions(uint256 orgId) external view returns (Tension[] memory result) {
    uint256[] storage ids = _orgTensions[orgId];
    result = new Tension[](ids.length);
    for (uint256 i; i < ids.length; ++i) {
      result[i] = _tensions[ids[i]];
    }
  }

  /// @notice Returns only open tensions for an org.
  function getOpenOrgTensions(uint256 orgId) external view returns (Tension[] memory result) {
    uint256[] storage ids = _orgTensions[orgId];
    uint256 count;
    for (uint256 i; i < ids.length; ++i) {
      if (_tensions[ids[i]].status == TensionStatus.Open) ++count;
    }
    result = new Tension[](count);
    uint256 j;
    for (uint256 i; i < ids.length; ++i) {
      if (_tensions[ids[i]].status == TensionStatus.Open) {
        result[j++] = _tensions[ids[i]];
      }
    }
  }

  /// @notice Returns true if `author` has an open tension for this circle.
  function hasOpenTension(address author, uint256 orgId, uint256 circleId) external view returns (bool) {
    return _hasOpen[author][orgId][circleId];
  }

  /*///////////////////////////////////////////////////////////////
                          INTERNAL
  //////////////////////////////////////////////////////////////*/

  function _assertOrgAdmin(uint256 orgId) internal view {
    HolacracyTypes.Organization memory org = FACTORY.getOrganization(orgId);
    if (msg.sender != org.creator) revert TensionBoard_Unauthorized(msg.sender, orgId);
  }
}
