// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IHolacracyDataProvider} from 'interfaces/IHolacracyDataProvider.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {GovernanceProcess} from 'contracts/GovernanceProcess.sol';

/// @dev Minimal token interface — ERC20Metadata + ERC20Votes subset
interface IToken {
  function name() external view returns (string memory);
  function symbol() external view returns (string memory);
  function totalSupply() external view returns (uint256);
  function balanceOf(address account) external view returns (uint256);
  function getVotes(address account) external view returns (uint256);
  function delegates(address account) external view returns (address);
}

/// @dev Minimal governor interface for reading parameters
interface IGovernorParams {
  function name() external view returns (string memory);
  function votingDelay() external view returns (uint256);
  function votingPeriod() external view returns (uint256);
  function proposalThreshold() external view returns (uint256);
  function quorumNumerator() external view returns (uint256);
}

/**
 * @title HolacracyDataProvider
 * @notice Stateless view helper that aggregates holacracy + DAO governance data in batch
 *         calls, reducing frontend RPC round-trips. Inspired by Aave's UiPoolDataProvider.
 *
 * @dev All functions are pure `view` — the contract holds no state and requires no
 *      constructor arguments. Deploy once and point any frontend at it.
 *
 *      Circle traversal is bounded at 256 circles per organization. In practice,
 *      holacracy organizations rarely exceed a few dozen circles.
 */
contract HolacracyDataProvider is IHolacracyDataProvider {
  /// @notice Maximum circles iterated during BFS traversal
  uint256 internal constant MAX_CIRCLES = 256;

  /*///////////////////////////////////////////////////////////////
                      PUBLIC ENTRY POINTS
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IHolacracyDataProvider
  function getOrganizationOverview(
    address _factory,
    uint256 _orgId
  ) external view returns (OrganizationOverview memory _overview) {
    HolacracyTypes.Organization memory _org = IOrganizationFactory(_factory).getOrganization(_orgId);
    _overview = _buildOverview(_org);
  }

  /// @inheritdoc IHolacracyDataProvider
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
    )
  {
    HolacracyTypes.Organization memory _org = IOrganizationFactory(_factory).getOrganization(_orgId);
    _overview = _buildOverview(_org);

    CircleRegistry _cr = CircleRegistry(_org.circleRegistry);
    RoleRegistry _rr = RoleRegistry(_org.roleRegistry);
    GovernanceProcess _gp = GovernanceProcess(_org.governanceProcess);

    uint256[] memory _circleIds = _collectCircleIds(_cr, _cr.anchorCircleId());

    _circles = _buildCircleSnapshots(_cr, _gp, _circleIds);
    (_roles, _policies) = _buildRolesAndPolicies(_cr, _rr, _circleIds);
  }

  /// @inheritdoc IHolacracyDataProvider
  function getUserOrgData(
    address _factory,
    uint256 _orgId,
    address _user
  ) external view returns (UserOrgData memory _data) {
    HolacracyTypes.Organization memory _org = IOrganizationFactory(_factory).getOrganization(_orgId);

    CircleRegistry _cr = CircleRegistry(_org.circleRegistry);
    RoleRegistry _rr = RoleRegistry(_org.roleRegistry);
    IToken _token = IToken(_org.token);

    _data.user = _user;
    _data.tokenBalance = _token.balanceOf(_user);
    _data.votingPower = _token.getVotes(_user);
    _data.delegate = _token.delegates(_user);

    uint256[] memory _circleIds = _collectCircleIds(_cr, _cr.anchorCircleId());

    _data.ledRoleIds = _collectLedRoleIds(_cr, _rr, _circleIds, _user);
    _data.leadCircleIds = _collectLeadCircleIds(_cr, _circleIds, _user);
    _data.memberCircleIds = _collectMemberCircleIds(_cr, _circleIds, _user);
    _data.facilitatorOfCircleIds = _collectElectedCircleIds(_cr, _circleIds, _user, HolacracyTypes.ElectedRole.Facilitator);
    _data.secretaryOfCircleIds = _collectElectedCircleIds(_cr, _circleIds, _user, HolacracyTypes.ElectedRole.Secretary);
    _data.circleRepOfCircleIds = _collectElectedCircleIds(_cr, _circleIds, _user, HolacracyTypes.ElectedRole.CircleRep);
  }

  /// @inheritdoc IHolacracyDataProvider
  function getCircleProposals(
    address _governanceProcess,
    uint256 _circleId
  ) external view returns (ProposalSnapshot[] memory _proposals) {
    GovernanceProcess _gp = GovernanceProcess(_governanceProcess);
    uint256[] memory _ids = _gp.getCircleProposals(_circleId);
    _proposals = new ProposalSnapshot[](_ids.length);
    for (uint256 _i; _i < _ids.length; ++_i) {
      _proposals[_i] = _buildProposalSnapshot(_gp, _ids[_i]);
    }
  }

  /*///////////////////////////////////////////////////////////////
                      INTERNAL — BUILDERS
  //////////////////////////////////////////////////////////////*/

  function _buildOverview(HolacracyTypes.Organization memory _org)
    internal
    view
    returns (OrganizationOverview memory _ov)
  {
    _ov.id = _org.id;
    _ov.name = _org.name;
    _ov.subname = _org.subname;
    _ov.creator = _org.creator;
    _ov.createdAt = _org.createdAt;
    _ov.roleRegistry = _org.roleRegistry;
    _ov.circleRegistry = _org.circleRegistry;
    _ov.governanceProcess = _org.governanceProcess;
    _ov.governor = _org.governor;
    _ov.token = _org.token;
    _ov.timelock = _org.timelock;

    if (_org.token != address(0)) {
      IToken _t = IToken(_org.token);
      _ov.tokenName = _t.name();
      _ov.tokenSymbol = _t.symbol();
      _ov.tokenTotalSupply = _t.totalSupply();
    }

    if (_org.governor != address(0)) {
      IGovernorParams _g = IGovernorParams(_org.governor);
      _ov.governorName = _g.name();
      _ov.votingDelay = _g.votingDelay();
      _ov.votingPeriod = _g.votingPeriod();
      _ov.proposalThreshold = _g.proposalThreshold();
      _ov.quorumNumerator = _g.quorumNumerator();
    }

    if (_org.circleRegistry != address(0)) {
      CircleRegistry _cr = CircleRegistry(_org.circleRegistry);
      uint256[] memory _circleIds = _collectCircleIds(_cr, _cr.anchorCircleId());
      _ov.circleCount = _circleIds.length;
    }

    if (_org.roleRegistry != address(0)) {
      _ov.roleCount = RoleRegistry(_org.roleRegistry).roleCount();
    }

    if (_org.governanceProcess != address(0)) {
      _ov.proposalCount = GovernanceProcess(_org.governanceProcess).proposalCount();
    }
  }

  function _buildCircleSnapshots(
    CircleRegistry _cr,
    GovernanceProcess _gp,
    uint256[] memory _circleIds
  ) internal view returns (CircleSnapshot[] memory _snaps) {
    _snaps = new CircleSnapshot[](_circleIds.length);
    for (uint256 _i; _i < _circleIds.length; ++_i) {
      _snaps[_i] = _buildCircleSnapshot(_cr, _gp, _circleIds[_i]);
    }
  }

  function _buildCircleSnapshot(
    CircleRegistry _cr,
    GovernanceProcess _gp,
    uint256 _circleId
  ) internal view returns (CircleSnapshot memory _snap) {
    HolacracyTypes.Circle memory _circle = _cr.getCircle(_circleId);

    _snap.id = _circle.id;
    _snap.parentCircleId = _circle.parentCircleId;
    _snap.roleId = _circle.roleId;
    _snap.name = _circle.name;
    _snap.purpose = _circle.purpose;
    _snap.isAnchor = _circle.isAnchor;

    _snap.circleLeads = _cr.getCircleLeads(_circleId);
    _snap.facilitator = _cr.getElectedRole(_circleId, HolacracyTypes.ElectedRole.Facilitator);
    _snap.secretary = _cr.getElectedRole(_circleId, HolacracyTypes.ElectedRole.Secretary);
    _snap.circleRep = _cr.getElectedRole(_circleId, HolacracyTypes.ElectedRole.CircleRep);

    _snap.roleIds = _cr.roleRegistry().getCircleRoleIds(_circleId);
    _snap.subCircleIds = _cr.getSubCircles(_circleId);
    _snap.policyIds = _cr.getCirclePolicies(_circleId);

    uint256[] memory _proposalIds = _gp.getCircleProposals(_circleId);
    _snap.totalProposalCount = _proposalIds.length;
    _snap.openProposalCount = _countOpenProposals(_gp, _proposalIds);
  }

  function _buildRolesAndPolicies(
    CircleRegistry _cr,
    RoleRegistry _rr,
    uint256[] memory _circleIds
  ) internal view returns (RoleSnapshot[] memory _roles, PolicySnapshot[] memory _policies) {
    // Collect all role IDs and policy IDs across circles
    uint256 _totalRoles;
    uint256 _totalPolicies;

    for (uint256 _i; _i < _circleIds.length; ++_i) {
      _totalRoles += _rr.getCircleRoleIds(_circleIds[_i]).length;
      _totalPolicies += _cr.getCirclePolicies(_circleIds[_i]).length;
    }

    _roles = new RoleSnapshot[](_totalRoles);
    _policies = new PolicySnapshot[](_totalPolicies);

    uint256 _roleIdx;
    uint256 _policyIdx;

    for (uint256 _i; _i < _circleIds.length; ++_i) {
      uint256 _cId = _circleIds[_i];

      uint256[] memory _roleIds = _rr.getCircleRoleIds(_cId);
      for (uint256 _j; _j < _roleIds.length; ++_j) {
        _roles[_roleIdx++] = _buildRoleSnapshot(_rr, _cr, _roleIds[_j]);
      }

      uint256[] memory _policyIds = _cr.getCirclePolicies(_cId);
      for (uint256 _k; _k < _policyIds.length; ++_k) {
        _policies[_policyIdx++] = _buildPolicySnapshot(_cr, _policyIds[_k]);
      }
    }
  }

  function _buildRoleSnapshot(
    RoleRegistry _rr,
    CircleRegistry _cr,
    uint256 _roleId
  ) internal view returns (RoleSnapshot memory _snap) {
    HolacracyTypes.Role memory _role = _rr.getRole(_roleId);

    _snap.id = _role.id;
    _snap.circleId = _role.circleId;
    _snap.name = _role.name;
    _snap.purpose = _role.purpose;
    _snap.domains = _rr.getRoleDomains(_roleId);
    _snap.accountabilities = _rr.getRoleAccountabilities(_roleId);
    _snap.leads = _rr.getRoleLeads(_roleId);

    uint256 _expandedCircleId = _cr.roleToCircle(_roleId);
    _snap.isExpandedToCircle = _expandedCircleId != 0;
    _snap.expandedCircleId = _expandedCircleId;
  }

  function _buildPolicySnapshot(
    CircleRegistry _cr,
    uint256 _policyId
  ) internal view returns (PolicySnapshot memory _snap) {
    HolacracyTypes.Policy memory _policy = _cr.getPolicy(_policyId);
    _snap.id = _policy.id;
    _snap.circleId = _policy.circleId;
    _snap.name = _policy.name;
    _snap.body = _policy.body;
  }

  function _buildProposalSnapshot(
    GovernanceProcess _gp,
    uint256 _proposalId
  ) internal view returns (ProposalSnapshot memory _snap) {
    HolacracyTypes.Proposal memory _p = _gp.getProposal(_proposalId);

    _snap.id = _p.id;
    _snap.circleId = _p.circleId;
    _snap.proposer = _p.proposer;
    _snap.proposerRoleId = _p.proposerRoleId;
    _snap.tension = _p.tension;
    _snap.status = _p.status;
    _snap.createdAt = _p.createdAt;
    _snap.resolvedAt = _p.resolvedAt;

    uint256[] memory _objIds = _gp.getProposalObjections(_proposalId);
    _snap.objectionCount = _objIds.length;
    _snap.unresolvedObjectionCount = _countUnresolvedObjections(_gp, _objIds);
  }

  /*///////////////////////////////////////////////////////////////
                      INTERNAL — TRAVERSAL
  //////////////////////////////////////////////////////////////*/

  /// @notice BFS traversal of the circle hierarchy starting from the anchor circle.
  ///         Returns all circle IDs in breadth-first order.
  function _collectCircleIds(
    CircleRegistry _cr,
    uint256 _anchorId
  ) internal view returns (uint256[] memory _ids) {
    uint256[256] memory _queue;
    uint256 _head;
    uint256 _tail;
    uint256[256] memory _result;
    uint256 _count;

    _queue[_tail++] = _anchorId;

    while (_head < _tail) {
      uint256 _cId = _queue[_head++];
      _result[_count++] = _cId;

      uint256[] memory _children = _cr.getSubCircles(_cId);
      for (uint256 _i; _i < _children.length; ++_i) {
        if (_tail < MAX_CIRCLES) {
          _queue[_tail++] = _children[_i];
        }
      }
    }

    _ids = new uint256[](_count);
    for (uint256 _i; _i < _count; ++_i) {
      _ids[_i] = _result[_i];
    }
  }

  function _collectLedRoleIds(
    CircleRegistry _cr,
    RoleRegistry _rr,
    uint256[] memory _circleIds,
    address _user
  ) internal view returns (uint256[] memory) {
    // Count first
    uint256 _count;
    for (uint256 _i; _i < _circleIds.length; ++_i) {
      uint256[] memory _roleIds = _rr.getCircleRoleIds(_circleIds[_i]);
      for (uint256 _j; _j < _roleIds.length; ++_j) {
        if (_rr.isRoleLead(_roleIds[_j], _user)) ++_count;
      }
    }

    uint256[] memory _result = new uint256[](_count);
    uint256 _idx;
    for (uint256 _i; _i < _circleIds.length; ++_i) {
      uint256[] memory _roleIds = _rr.getCircleRoleIds(_circleIds[_i]);
      for (uint256 _j; _j < _roleIds.length; ++_j) {
        if (_rr.isRoleLead(_roleIds[_j], _user)) {
          _result[_idx++] = _roleIds[_j];
        }
      }
    }
    return _result;
  }

  function _collectLeadCircleIds(
    CircleRegistry _cr,
    uint256[] memory _circleIds,
    address _user
  ) internal view returns (uint256[] memory) {
    uint256 _count;
    for (uint256 _i; _i < _circleIds.length; ++_i) {
      if (_cr.isCircleLead(_circleIds[_i], _user)) ++_count;
    }

    uint256[] memory _result = new uint256[](_count);
    uint256 _idx;
    for (uint256 _i; _i < _circleIds.length; ++_i) {
      if (_cr.isCircleLead(_circleIds[_i], _user)) {
        _result[_idx++] = _circleIds[_i];
      }
    }
    return _result;
  }

  function _collectMemberCircleIds(
    CircleRegistry _cr,
    uint256[] memory _circleIds,
    address _user
  ) internal view returns (uint256[] memory) {
    uint256 _count;
    for (uint256 _i; _i < _circleIds.length; ++_i) {
      if (_cr.isCircleMember(_circleIds[_i], _user)) ++_count;
    }

    uint256[] memory _result = new uint256[](_count);
    uint256 _idx;
    for (uint256 _i; _i < _circleIds.length; ++_i) {
      if (_cr.isCircleMember(_circleIds[_i], _user)) {
        _result[_idx++] = _circleIds[_i];
      }
    }
    return _result;
  }

  function _collectElectedCircleIds(
    CircleRegistry _cr,
    uint256[] memory _circleIds,
    address _user,
    HolacracyTypes.ElectedRole _role
  ) internal view returns (uint256[] memory) {
    uint256 _count;
    for (uint256 _i; _i < _circleIds.length; ++_i) {
      if (_cr.getElectedRole(_circleIds[_i], _role) == _user) ++_count;
    }

    uint256[] memory _result = new uint256[](_count);
    uint256 _idx;
    for (uint256 _i; _i < _circleIds.length; ++_i) {
      if (_cr.getElectedRole(_circleIds[_i], _role) == _user) {
        _result[_idx++] = _circleIds[_i];
      }
    }
    return _result;
  }

  /*///////////////////////////////////////////////////////////////
                      INTERNAL — COUNTERS
  //////////////////////////////////////////////////////////////*/

  function _countOpenProposals(
    GovernanceProcess _gp,
    uint256[] memory _proposalIds
  ) internal view returns (uint256 _count) {
    for (uint256 _i; _i < _proposalIds.length; ++_i) {
      HolacracyTypes.Proposal memory _p = _gp.getProposal(_proposalIds[_i]);
      HolacracyTypes.ProposalStatus _s = _p.status;
      if (
        _s == HolacracyTypes.ProposalStatus.Draft || _s == HolacracyTypes.ProposalStatus.Active
          || _s == HolacracyTypes.ProposalStatus.Integrating || _s == HolacracyTypes.ProposalStatus.Escalated
      ) {
        ++_count;
      }
    }
  }

  function _countUnresolvedObjections(
    GovernanceProcess _gp,
    uint256[] memory _objectionIds
  ) internal view returns (uint256 _count) {
    for (uint256 _i; _i < _objectionIds.length; ++_i) {
      HolacracyTypes.Objection memory _obj = _gp.getObjection(_objectionIds[_i]);
      HolacracyTypes.ObjectionStatus _s = _obj.status;
      if (
        _s == HolacracyTypes.ObjectionStatus.Raised || _s == HolacracyTypes.ObjectionStatus.Testing
          || _s == HolacracyTypes.ObjectionStatus.Valid
      ) {
        ++_count;
      }
    }
  }
}
