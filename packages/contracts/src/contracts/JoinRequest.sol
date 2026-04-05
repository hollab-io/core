// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';

/**
 * @title JoinRequest
 * @notice Lets anyone register intent to join a HolLab organisation.
 *         The org creator (admin) can then approve or reject each request.
 *         Approving grants the user membership in the CircleRegistry;
 *         the admin separately transfers governance tokens from the UI.
 *
 *         One pending request per (requester, orgId) pair is enforced on-chain.
 */
contract JoinRequest {
  /*///////////////////////////////////////////////////////////////
                          TYPES
  //////////////////////////////////////////////////////////////*/

  enum Status {
    Pending,
    Approved,
    Rejected
  }

  struct Request {
    uint256 id;
    address requester;
    uint256 orgId;
    string message;
    Status status;
    uint256 submittedAt;
    uint256 resolvedAt;
  }

  /*///////////////////////////////////////////////////////////////
                          STATE
  //////////////////////////////////////////////////////////////*/

  IOrganizationFactory public immutable FACTORY;

  uint256 private _requestCounter;

  /// @notice requestId => Request
  mapping(uint256 => Request) private _requests;

  /// @notice orgId => requestIds (all, including resolved)
  mapping(uint256 => uint256[]) private _orgRequests;

  /// @notice requester => orgId => true while a pending request exists
  mapping(address => mapping(uint256 => bool)) private _hasPending;

  /*///////////////////////////////////////////////////////////////
                          EVENTS
  //////////////////////////////////////////////////////////////*/

  event JoinRequested(uint256 indexed requestId, address indexed requester, uint256 indexed orgId, string message);
  event JoinApproved(uint256 indexed requestId, address indexed requester, uint256 indexed orgId);
  event JoinRejected(uint256 indexed requestId, address indexed requester, uint256 indexed orgId);

  /*///////////////////////////////////////////////////////////////
                          ERRORS
  //////////////////////////////////////////////////////////////*/

  error JoinRequest_AlreadyPending(address requester, uint256 orgId);
  error JoinRequest_NotFound(uint256 requestId);
  error JoinRequest_NotPending(uint256 requestId);
  error JoinRequest_Unauthorized(address caller, uint256 orgId);
  error JoinRequest_OrgNotFound(uint256 orgId);

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
   * @notice Submit a request to join `orgId` with an optional `message`.
   * @return requestId The ID of the newly created request.
   */
  function requestToJoin(uint256 orgId, string calldata message) external returns (uint256 requestId) {
    HolacracyTypes.Organization memory org = FACTORY.getOrganization(orgId);
    if (org.id == 0) revert JoinRequest_OrgNotFound(orgId);
    if (_hasPending[msg.sender][orgId]) revert JoinRequest_AlreadyPending(msg.sender, orgId);

    requestId = ++_requestCounter;
    _requests[requestId] = Request({
      id: requestId,
      requester: msg.sender,
      orgId: orgId,
      message: message,
      status: Status.Pending,
      submittedAt: block.timestamp,
      resolvedAt: 0
    });
    _orgRequests[orgId].push(requestId);
    _hasPending[msg.sender][orgId] = true;

    emit JoinRequested(requestId, msg.sender, orgId, message);
  }

  /**
   * @notice Approve a pending request. Only the org creator may call this.
   *         The caller is responsible for separately transferring governance tokens
   *         and adding the requester to the CircleRegistry.
   */
  function approve(uint256 requestId) external {
    Request storage req = _requests[requestId];
    if (req.id == 0) revert JoinRequest_NotFound(requestId);
    if (req.status != Status.Pending) revert JoinRequest_NotPending(requestId);

    _assertOrgAdmin(req.orgId);

    req.status = Status.Approved;
    req.resolvedAt = block.timestamp;
    _hasPending[req.requester][req.orgId] = false;

    emit JoinApproved(requestId, req.requester, req.orgId);
  }

  /**
   * @notice Reject a pending request. Only the org creator may call this.
   */
  function reject(uint256 requestId) external {
    Request storage req = _requests[requestId];
    if (req.id == 0) revert JoinRequest_NotFound(requestId);
    if (req.status != Status.Pending) revert JoinRequest_NotPending(requestId);

    _assertOrgAdmin(req.orgId);

    req.status = Status.Rejected;
    req.resolvedAt = block.timestamp;
    _hasPending[req.requester][req.orgId] = false;

    emit JoinRejected(requestId, req.requester, req.orgId);
  }

  /*///////////////////////////////////////////////////////////////
                          VIEW
  //////////////////////////////////////////////////////////////*/

  function getRequest(uint256 requestId) external view returns (Request memory) {
    return _requests[requestId];
  }

  /// @notice Returns all requests (any status) for an org, newest last.
  function getOrgRequests(uint256 orgId) external view returns (Request[] memory result) {
    uint256[] storage ids = _orgRequests[orgId];
    result = new Request[](ids.length);
    for (uint256 i; i < ids.length; ++i) {
      result[i] = _requests[ids[i]];
    }
  }

  /// @notice Returns only pending requests for an org.
  function getPendingOrgRequests(uint256 orgId) external view returns (Request[] memory result) {
    uint256[] storage ids = _orgRequests[orgId];
    uint256 count;
    for (uint256 i; i < ids.length; ++i) {
      if (_requests[ids[i]].status == Status.Pending) ++count;
    }
    result = new Request[](count);
    uint256 j;
    for (uint256 i; i < ids.length; ++i) {
      if (_requests[ids[i]].status == Status.Pending) {
        result[j++] = _requests[ids[i]];
      }
    }
  }

  /// @notice Returns true if `requester` has a pending request for `orgId`.
  function hasPendingRequest(address requester, uint256 orgId) external view returns (bool) {
    return _hasPending[requester][orgId];
  }

  /*///////////////////////////////////////////////////////////////
                          INTERNAL
  //////////////////////////////////////////////////////////////*/

  function _assertOrgAdmin(uint256 orgId) internal view {
    HolacracyTypes.Organization memory org = FACTORY.getOrganization(orgId);
    if (msg.sender != org.creator) revert JoinRequest_Unauthorized(msg.sender, orgId);
  }
}
