// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title IHolacracyDataProvider
 * @notice View helper that aggregates holacracy + DAO governance data in batch calls,
 *         reducing the number of RPC round-trips needed by frontend clients.
 *
 * Inspired by Aave's UiPoolDataProvider pattern:
 *   - getOrganizationOverview  → light metadata, counts, and DAO params
 *   - getOrganizationFullData  → full org snapshot (all circles, roles, policies)
 *   - getUserOrgData           → user-specific roles, memberships, voting power
 *   - getCircleProposals       → proposals for a single circle
 */
interface IHolacracyDataProvider {
  /*///////////////////////////////////////////////////////////////
                            STRUCTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Light organization summary — metadata, contract addresses, DAO parameters, counts
  struct OrganizationOverview {
    // Identity
    uint256 id;
    string name;
    string subname;
    address creator;
    uint256 createdAt;
    // Contracts
    address roleRegistry;
    address circleRegistry;
    address governanceProcess;
    address governor;
    address token;
    address timelock;
    // DAO governance token
    string tokenName;
    string tokenSymbol;
    uint256 tokenTotalSupply;
    // DAO governor parameters
    string governorName;
    uint256 votingDelay;
    uint256 votingPeriod;
    uint256 proposalThreshold;
    uint256 quorumNumerator;
    // Counts
    uint256 circleCount;
    uint256 roleCount;
    uint256 proposalCount;
  }

  /// @notice Snapshot of a single circle with leadership, roles, sub-circles, policies, and proposal activity
  struct CircleSnapshot {
    // Identity
    uint256 id;
    uint256 parentCircleId;
    uint256 roleId; // 0 for anchor circle
    string name;
    string purpose;
    bool isAnchor;
    // Leadership
    address[] circleLeads;
    address facilitator; // address(0) if not elected
    address secretary; // address(0) if not elected
    address circleRep; // address(0) if not elected
    // Structure (IDs only — full data in the parallel arrays)
    uint256[] roleIds;
    uint256[] subCircleIds;
    uint256[] policyIds;
    // Activity
    uint256 openProposalCount; // Draft + Active + Integrating + Escalated
    uint256 totalProposalCount;
  }

  /// @notice Full role data including leads and whether it has been expanded to a sub-circle
  struct RoleSnapshot {
    uint256 id;
    uint256 circleId;
    string name;
    string purpose;
    string[] domains;
    string[] accountabilities;
    address[] leads;
    bool isExpandedToCircle;
    uint256 expandedCircleId; // 0 if isExpandedToCircle is false
  }

  /// @notice Policy data
  struct PolicySnapshot {
    uint256 id;
    uint256 circleId;
    string name;
    string body;
  }

  /// @notice Minimal proposal summary for display
  struct ProposalSnapshot {
    uint256 id;
    uint256 circleId;
    address proposer;
    uint256 proposerRoleId;
    string tension;
    HolacracyTypes.ProposalStatus status;
    uint256 createdAt;
    uint256 resolvedAt;
    uint256 objectionCount;
    uint256 unresolvedObjectionCount;
  }

  /// @notice User's position within a specific organization
  struct UserOrgData {
    address user;
    // DAO governance
    uint256 tokenBalance;
    uint256 votingPower; // delegated votes at latest block
    address delegate;
    // Holacracy structure
    uint256[] ledRoleIds; // roles where user is a role lead
    uint256[] leadCircleIds; // circles where user is a circle lead
    uint256[] memberCircleIds; // circles where user is a member (lead or role lead)
    // Elected positions
    uint256[] facilitatorOfCircleIds;
    uint256[] secretaryOfCircleIds;
    uint256[] circleRepOfCircleIds;
  }

  /*///////////////////////////////////////////////////////////////
                            FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  /// @notice Returns light organization metadata, DAO parameters, and derived counts.
  /// @param _factory Address of the OrganizationFactory
  /// @param _orgId The organization ID
  /// @return _overview Aggregated organization overview
  function getOrganizationOverview(
    address _factory,
    uint256 _orgId
  ) external view returns (OrganizationOverview memory _overview);

  /// @notice Returns a full organization snapshot — all circles, roles, and policies in one call.
  /// @dev Performs a BFS traversal of the circle hierarchy starting from the anchor circle.
  ///      Intended for initial page load; subsequent interactions can use narrower queries.
  /// @param _factory Address of the OrganizationFactory
  /// @param _orgId The organization ID
  /// @return _overview Aggregated organization overview
  /// @return _circles All circles in the organization
  /// @return _roles All roles across all circles
  /// @return _policies All policies across all circles
  function getOrganizationFullData(
    address _factory,
    uint256 _orgId
  )
    external
    view
    returns (
      OrganizationOverview memory _overview,
      CircleSnapshot[] memory _circles,
      RoleSnapshot[] memory _roles,
      PolicySnapshot[] memory _policies
    );

  /// @notice Returns a user's complete position within an organization.
  /// @param _factory Address of the OrganizationFactory
  /// @param _orgId The organization ID
  /// @param _user The user address to query
  /// @return _data The user's organizational data
  function getUserOrgData(
    address _factory,
    uint256 _orgId,
    address _user
  ) external view returns (UserOrgData memory _data);

  /// @notice Returns all proposals for a single circle.
  /// @param _governanceProcess Address of the GovernanceProcess contract
  /// @param _circleId The circle ID
  /// @return _proposals Array of proposal snapshots
  function getCircleProposals(
    address _governanceProcess,
    uint256 _circleId
  ) external view returns (ProposalSnapshot[] memory _proposals);
}
