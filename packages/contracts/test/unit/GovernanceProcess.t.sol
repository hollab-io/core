// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {GovernanceProcess, IGovernanceProcess} from 'contracts/GovernanceProcess.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {Test} from 'forge-std/Test.sol';

/// @notice Mock DAO governor that records the most recent propose() call
contract MockDAOGovernor {
  uint256 internal _nextId = 42;
  address public lastTarget;
  bytes public lastCalldata;
  string public lastDescription;

  function nextProposalId() external view returns (uint256) {
    return _nextId;
  }

  function propose(
    address[] memory targets,
    uint256[] memory,
    bytes[] memory calldatas,
    string memory description
  ) external returns (uint256) {
    lastTarget = targets[0];
    lastCalldata = calldatas[0];
    lastDescription = description;
    return _nextId;
  }
}

contract UnitGovernanceProcess is Test {
  RoleRegistry internal _roleRegistry;
  CircleRegistry internal _circleRegistry;
  GovernanceProcess internal _governance;

  address internal _deployer = makeAddr('deployer');
  address internal _member1 = makeAddr('member1');
  address internal _member2 = makeAddr('member2');
  address internal _facilitator = makeAddr('facilitator');
  address internal _stranger = makeAddr('stranger');

  uint256 internal _anchorCircleId;
  uint256 internal _role1Id;
  uint256 internal _role2Id;

  string[] internal _domains;
  string[] internal _accountabilities;

  event ProposalSubmitted(uint256 indexed _proposalId, uint256 indexed _circleId, address indexed _proposer);
  event ProposalActivated(uint256 indexed _proposalId);
  event ObjectionRaised(uint256 indexed _objectionId, uint256 indexed _proposalId, address indexed _objector);
  event ObjectionResolved(uint256 indexed _objectionId, uint256 indexed _proposalId);
  event ObjectionInvalidated(uint256 indexed _objectionId, uint256 indexed _proposalId);
  event ProposalAdopted(uint256 indexed _proposalId);
  event ProposalWithdrawn(uint256 indexed _proposalId);
  event ProposalDiscarded(uint256 indexed _proposalId);

  function setUp() external {
    _domains.push('TestDomain');
    _accountabilities.push('TestAccountability');

    // Deploy implementations
    RoleRegistry _rrImpl = new RoleRegistry();
    CircleRegistry _crImpl = new CircleRegistry();
    GovernanceProcess _govImpl = new GovernanceProcess();

    // Clone and initialize
    _roleRegistry = RoleRegistry(Clones.clone(address(_rrImpl)));
    _circleRegistry = CircleRegistry(Clones.clone(address(_crImpl)));
    _governance = GovernanceProcess(Clones.clone(address(_govImpl)));

    _roleRegistry.initialize();
    _governance.initialize(_circleRegistry, _roleRegistry);
    vm.startPrank(_deployer);
    _circleRegistry.initialize(_roleRegistry, _deployer, address(_governance));

    // Create anchor circle
    _anchorCircleId = _circleRegistry.createAnchorCircle('HolLab', 'Build tools');

    // Create roles and assign members
    _role1Id = _circleRegistry.createRoleInCircle(_anchorCircleId, 'Dev', 'Develop', _domains, _accountabilities);
    _role2Id = _circleRegistry.createRoleInCircle(_anchorCircleId, 'Design', 'Design', _domains, _accountabilities);
    _circleRegistry.assignRoleLeadInCircle(_anchorCircleId, _role1Id, _member1);
    _circleRegistry.assignRoleLeadInCircle(_anchorCircleId, _role2Id, _member2);

    // Set facilitator
    _circleRegistry.setElectedRole(_anchorCircleId, HolacracyTypes.ElectedRole.Facilitator, _facilitator);

    vm.stopPrank();
  }

  /*///////////////////////////////////////////////////////////////
                      HELPER FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function _defaultChange() internal pure returns (HolacracyTypes.GovernanceChange memory) {
    string[] memory _emptyArr = new string[](0);
    return HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.CreateRole,
      targetId: 0,
      encodedData: abi.encode('NewRole', 'NewPurpose', _emptyArr, _emptyArr)
    });
  }

  function _submitAndActivateProposal(address _proposer, uint256 _proposerRoleId) internal returns (uint256) {
    vm.prank(_proposer);
    uint256 _proposalId = _governance.submitProposal(
      _anchorCircleId, _proposerRoleId, 'Tension', 'Example', 'Explanation', _defaultChange()
    );
    vm.prank(_proposer);
    _governance.activateProposal(_proposalId);
    return _proposalId;
  }

  /*///////////////////////////////////////////////////////////////
                      SUBMIT PROPOSAL
  //////////////////////////////////////////////////////////////*/

  function test_SubmitProposalWhenValid() external {
    HolacracyTypes.GovernanceChange memory _change = _defaultChange();

    vm.prank(_member1);

    // it emits ProposalSubmitted
    vm.expectEmit(true, true, true, true, address(_governance));
    emit ProposalSubmitted(1, _anchorCircleId, _member1);

    uint256 _proposalId =
      _governance.submitProposal(_anchorCircleId, _role1Id, 'Need new role', 'Workload is high', 'Add a role', _change);

    // it increments proposal count
    assertEq(_governance.proposalCount(), 1);

    // it stores proposal data
    HolacracyTypes.Proposal memory _proposal = _governance.getProposal(_proposalId);
    assertEq(_proposal.id, _proposalId);
    assertEq(_proposal.circleId, _anchorCircleId);
    assertEq(_proposal.proposer, _member1);
    assertEq(_proposal.proposerRoleId, _role1Id);
    assertEq(_proposal.tension, 'Need new role');
    assertEq(_proposal.example, 'Workload is high');
    assertEq(_proposal.explanation, 'Add a role');
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Draft));

    // it adds to circle proposals
    uint256[] memory _circleProposals = _governance.getCircleProposals(_anchorCircleId);
    assertEq(_circleProposals.length, 1);
    assertEq(_circleProposals[0], _proposalId);
  }

  function test_SubmitProposalWhenNotCircleMember() external {
    vm.prank(_stranger);
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceProcess.GovernanceProcess_NotCircleMember.selector, _anchorCircleId, _stranger
      )
    );
    _governance.submitProposal(_anchorCircleId, 0, 'Tension', 'Example', 'Explanation', _defaultChange());
  }

  function test_SubmitProposalWhenEmptyTension() external {
    vm.prank(_member1);
    // it reverts
    vm.expectRevert(IGovernanceProcess.GovernanceProcess_EmptyTension.selector);
    _governance.submitProposal(_anchorCircleId, _role1Id, '', 'Example', 'Explanation', _defaultChange());
  }

  /*///////////////////////////////////////////////////////////////
                      ACTIVATE PROPOSAL
  //////////////////////////////////////////////////////////////*/

  function test_ActivateProposalWhenValid() external {
    vm.prank(_member1);
    uint256 _proposalId =
      _governance.submitProposal(_anchorCircleId, _role1Id, 'Tension', 'Example', 'Explanation', _defaultChange());

    vm.prank(_member1);

    // it emits ProposalActivated
    vm.expectEmit(true, true, true, true, address(_governance));
    emit ProposalActivated(_proposalId);

    _governance.activateProposal(_proposalId);

    // it sets status to Active
    HolacracyTypes.Proposal memory _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Active));
  }

  function test_ActivateProposalWhenNotProposer() external {
    vm.prank(_member1);
    uint256 _proposalId =
      _governance.submitProposal(_anchorCircleId, _role1Id, 'Tension', 'Example', 'Explanation', _defaultChange());

    vm.prank(_member2);
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceProcess.GovernanceProcess_NotProposer.selector, _proposalId)
    );
    _governance.activateProposal(_proposalId);
  }

  function test_ActivateProposalWhenAlreadyActive() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_member1);
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceProcess.GovernanceProcess_InvalidProposalStatus.selector,
        _proposalId,
        HolacracyTypes.ProposalStatus.Draft
      )
    );
    _governance.activateProposal(_proposalId);
  }

  function test_ActivateProposalWhenDoesNotExist() external {
    vm.prank(_member1);
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceProcess.GovernanceProcess_ProposalNotFound.selector, 999)
    );
    _governance.activateProposal(999);
  }

  /*///////////////////////////////////////////////////////////////
                      RAISE OBJECTION
  //////////////////////////////////////////////////////////////*/

  function test_RaiseObjectionWhenValid() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_member2);

    // it emits ObjectionRaised
    vm.expectEmit(true, true, true, true, address(_governance));
    emit ObjectionRaised(1, _proposalId, _member2);

    uint256 _objectionId =
      _governance.raiseObjection(_proposalId, _role2Id, 'This would harm my role', false);

    // it stores objection data
    HolacracyTypes.Objection memory _objection = _governance.getObjection(_objectionId);
    assertEq(_objection.id, _objectionId);
    assertEq(_objection.proposalId, _proposalId);
    assertEq(_objection.objector, _member2);
    assertEq(_objection.objectorRoleId, _role2Id);
    assertEq(_objection.concern, 'This would harm my role');
    assertFalse(_objection.isConstitutionalViolation);
    assertEq(uint256(_objection.status), uint256(HolacracyTypes.ObjectionStatus.Raised));

    // it moves proposal to Integrating
    HolacracyTypes.Proposal memory _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Integrating));

    // it adds to proposal objections
    uint256[] memory _objIds = _governance.getProposalObjections(_proposalId);
    assertEq(_objIds.length, 1);
    assertEq(_objIds[0], _objectionId);
  }

  function test_RaiseObjectionWhenNotActive() external {
    vm.prank(_member1);
    uint256 _proposalId =
      _governance.submitProposal(_anchorCircleId, _role1Id, 'Tension', 'Example', 'Explanation', _defaultChange());

    vm.prank(_member2);
    // it reverts (still Draft)
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceProcess.GovernanceProcess_InvalidProposalStatus.selector,
        _proposalId,
        HolacracyTypes.ProposalStatus.Active
      )
    );
    _governance.raiseObjection(_proposalId, _role2Id, 'Concern', false);
  }

  function test_RaiseObjectionWhenNotCircleMember() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_stranger);
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceProcess.GovernanceProcess_NotCircleMember.selector, _anchorCircleId, _stranger
      )
    );
    _governance.raiseObjection(_proposalId, 0, 'Concern', false);
  }

  function test_RaiseConstitutionalViolationObjection() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_member2);
    uint256 _objectionId = _governance.raiseObjection(_proposalId, _role2Id, 'Violates constitution', true);

    // it marks as constitutional violation
    HolacracyTypes.Objection memory _objection = _governance.getObjection(_objectionId);
    assertTrue(_objection.isConstitutionalViolation);
  }

  /*///////////////////////////////////////////////////////////////
                    RESOLVE OBJECTION
  //////////////////////////////////////////////////////////////*/

  function test_ResolveObjectionWhenFacilitator() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_member2);
    uint256 _objectionId = _governance.raiseObjection(_proposalId, _role2Id, 'Concern', false);

    vm.prank(_facilitator);

    // it emits ObjectionResolved
    vm.expectEmit(true, true, true, true, address(_governance));
    emit ObjectionResolved(_objectionId, _proposalId);

    _governance.resolveObjection(_objectionId, 'Added safeguard');

    // it marks objection as resolved
    HolacracyTypes.Objection memory _objection = _governance.getObjection(_objectionId);
    assertEq(uint256(_objection.status), uint256(HolacracyTypes.ObjectionStatus.Resolved));
    assertEq(_objection.resolution, 'Added safeguard');

    // it moves proposal back to Active (all objections resolved)
    HolacracyTypes.Proposal memory _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Active));
  }

  function test_ResolveObjectionWhenNotFacilitator() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_member2);
    uint256 _objectionId = _governance.raiseObjection(_proposalId, _role2Id, 'Concern', false);

    vm.prank(_stranger);
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceProcess.GovernanceProcess_NotFacilitator.selector, _anchorCircleId)
    );
    _governance.resolveObjection(_objectionId, 'Resolution');
  }

  function test_ResolveObjectionWhenMultipleObjections() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    // Raise two objections
    vm.prank(_member2);
    uint256 _obj1 = _governance.raiseObjection(_proposalId, _role2Id, 'Concern 1', false);

    // Need to set proposal back to Active to raise second objection
    // Actually the proposal is in Integrating after first objection
    // The contract allows raising objections only when Active, so we can't raise a second one
    // while in Integrating. Let's resolve the first and then raise another.

    vm.prank(_facilitator);
    _governance.resolveObjection(_obj1, 'Fixed');

    // Now proposal is Active again, raise another objection
    vm.prank(_deployer); // deployer is also a circle member (circle lead)
    uint256 _obj2 = _governance.raiseObjection(_proposalId, 0, 'Concern 2', false);

    // Proposal should be Integrating again
    HolacracyTypes.Proposal memory _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Integrating));

    // Resolve second objection
    vm.prank(_facilitator);
    _governance.resolveObjection(_obj2, 'Also fixed');

    // Now proposal should be Active (all resolved)
    _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Active));
  }

  /*///////////////////////////////////////////////////////////////
                    INVALIDATE OBJECTION
  //////////////////////////////////////////////////////////////*/

  function test_InvalidateObjectionWhenFacilitator() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_member2);
    uint256 _objectionId = _governance.raiseObjection(_proposalId, _role2Id, 'Weak concern', false);

    vm.prank(_facilitator);

    // it emits ObjectionInvalidated
    vm.expectEmit(true, true, true, true, address(_governance));
    emit ObjectionInvalidated(_objectionId, _proposalId);

    _governance.invalidateObjection(_objectionId);

    // it marks objection as invalid
    HolacracyTypes.Objection memory _objection = _governance.getObjection(_objectionId);
    assertEq(uint256(_objection.status), uint256(HolacracyTypes.ObjectionStatus.Invalid));

    // it moves proposal back to Active
    HolacracyTypes.Proposal memory _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Active));
  }

  function test_InvalidateObjectionWhenNotFacilitator() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_member2);
    uint256 _objectionId = _governance.raiseObjection(_proposalId, _role2Id, 'Concern', false);

    vm.prank(_member1);
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceProcess.GovernanceProcess_NotFacilitator.selector, _anchorCircleId)
    );
    _governance.invalidateObjection(_objectionId);
  }

  /*///////////////////////////////////////////////////////////////
                      ADOPT PROPOSAL
  //////////////////////////////////////////////////////////////*/

  function test_AdoptProposalWhenNoObjections() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_facilitator);
    _governance.adoptProposal(_proposalId);

    // it sets status to Adopted
    HolacracyTypes.Proposal memory _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Adopted));
    assertGt(_proposal.resolvedAt, 0);
  }

  function test_AdoptProposalWhenObjectionsResolved() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    // Raise and resolve objection
    vm.prank(_member2);
    uint256 _objectionId = _governance.raiseObjection(_proposalId, _role2Id, 'Concern', false);

    vm.prank(_facilitator);
    _governance.resolveObjection(_objectionId, 'Fixed');

    vm.prank(_facilitator);
    _governance.adoptProposal(_proposalId);

    // it adopts the proposal
    HolacracyTypes.Proposal memory _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Adopted));
  }

  function test_AdoptProposalWhenUnresolvedObjections() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_member2);
    _governance.raiseObjection(_proposalId, _role2Id, 'Concern', false);

    // Resolve the objection first so proposal goes back to Active, then raise another
    // Actually the proposal is in Integrating state, so adoptProposal will fail on status check
    vm.prank(_facilitator);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceProcess.GovernanceProcess_InvalidProposalStatus.selector,
        _proposalId,
        HolacracyTypes.ProposalStatus.Active
      )
    );
    _governance.adoptProposal(_proposalId);
  }

  function test_AdoptProposalWhenNotFacilitator() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_member1);
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceProcess.GovernanceProcess_NotFacilitator.selector, _anchorCircleId)
    );
    _governance.adoptProposal(_proposalId);
  }

  function test_AdoptProposalWhenNotActive() external {
    vm.prank(_member1);
    uint256 _proposalId =
      _governance.submitProposal(_anchorCircleId, _role1Id, 'Tension', 'Example', 'Explanation', _defaultChange());

    vm.prank(_facilitator);
    // it reverts (still Draft)
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceProcess.GovernanceProcess_InvalidProposalStatus.selector,
        _proposalId,
        HolacracyTypes.ProposalStatus.Active
      )
    );
    _governance.adoptProposal(_proposalId);
  }

  /*///////////////////////////////////////////////////////////////
                FACILITATOR FALLBACK TO CIRCLE LEAD
  //////////////////////////////////////////////////////////////*/

  function test_AdoptProposalWhenNoFacilitatorCircleLeadActs() external {
    // Create a fresh setup without a facilitator
    RoleRegistry _rr2 = RoleRegistry(Clones.clone(address(_roleRegistry)));
    CircleRegistry _cr2 = CircleRegistry(Clones.clone(address(_circleRegistry)));
    GovernanceProcess _gov2 = GovernanceProcess(Clones.clone(address(_governance)));

    _rr2.initialize();
    _gov2.initialize(_cr2, _rr2);
    vm.startPrank(_deployer);
    _cr2.initialize(_rr2, _deployer, address(_gov2));

    uint256 _circleId = _cr2.createAnchorCircle('Org', 'Purpose');
    uint256 _rId = _cr2.createRoleInCircle(_circleId, 'Role', 'Purpose', _domains, _accountabilities);
    _cr2.assignRoleLeadInCircle(_circleId, _rId, _member1);
    vm.stopPrank();

    // Member submits and activates proposal
    vm.prank(_member1);
    uint256 _pid = _gov2.submitProposal(_circleId, _rId, 'Tension', 'Ex', 'Expl', _defaultChange());
    vm.prank(_member1);
    _gov2.activateProposal(_pid);

    // Deployer (circle lead) can adopt since no facilitator is set
    vm.prank(_deployer);
    _gov2.adoptProposal(_pid);

    HolacracyTypes.Proposal memory _p = _gov2.getProposal(_pid);
    assertEq(uint256(_p.status), uint256(HolacracyTypes.ProposalStatus.Adopted));
  }

  /*///////////////////////////////////////////////////////////////
                    WITHDRAW PROPOSAL
  //////////////////////////////////////////////////////////////*/

  function test_WithdrawProposalWhenDraft() external {
    vm.prank(_member1);
    uint256 _proposalId =
      _governance.submitProposal(_anchorCircleId, _role1Id, 'Tension', 'Example', 'Explanation', _defaultChange());

    vm.prank(_member1);

    // it emits ProposalWithdrawn
    vm.expectEmit(true, true, true, true, address(_governance));
    emit ProposalWithdrawn(_proposalId);

    _governance.withdrawProposal(_proposalId);

    // it sets status to Withdrawn
    HolacracyTypes.Proposal memory _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Withdrawn));
    assertGt(_proposal.resolvedAt, 0);
  }

  function test_WithdrawProposalWhenActive() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_member1);
    _governance.withdrawProposal(_proposalId);

    // it sets status to Withdrawn
    HolacracyTypes.Proposal memory _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Withdrawn));
  }

  function test_WithdrawProposalWhenIntegrating() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_member2);
    _governance.raiseObjection(_proposalId, _role2Id, 'Concern', false);

    vm.prank(_member1);
    _governance.withdrawProposal(_proposalId);

    // it allows withdrawal during integration
    HolacracyTypes.Proposal memory _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Withdrawn));
  }

  function test_WithdrawProposalWhenNotProposer() external {
    vm.prank(_member1);
    uint256 _proposalId =
      _governance.submitProposal(_anchorCircleId, _role1Id, 'Tension', 'Example', 'Explanation', _defaultChange());

    vm.prank(_member2);
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceProcess.GovernanceProcess_NotProposer.selector, _proposalId)
    );
    _governance.withdrawProposal(_proposalId);
  }

  function test_WithdrawProposalWhenAlreadyAdopted() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_facilitator);
    _governance.adoptProposal(_proposalId);

    vm.prank(_member1);
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceProcess.GovernanceProcess_InvalidProposalStatus.selector,
        _proposalId,
        HolacracyTypes.ProposalStatus.Draft
      )
    );
    _governance.withdrawProposal(_proposalId);
  }

  /*///////////////////////////////////////////////////////////////
                    DISCARD PROPOSAL
  //////////////////////////////////////////////////////////////*/

  function test_DiscardProposalWhenFacilitator() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_facilitator);

    // it emits ProposalDiscarded
    vm.expectEmit(true, true, true, true, address(_governance));
    emit ProposalDiscarded(_proposalId);

    _governance.discardProposal(_proposalId);

    // it sets status to Discarded
    HolacracyTypes.Proposal memory _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Discarded));
    assertGt(_proposal.resolvedAt, 0);
  }

  function test_DiscardProposalWhenNotFacilitator() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_member1);
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceProcess.GovernanceProcess_NotFacilitator.selector, _anchorCircleId)
    );
    _governance.discardProposal(_proposalId);
  }

  /*///////////////////////////////////////////////////////////////
                    GOVERNANCE CHANGE EXECUTION
  //////////////////////////////////////////////////////////////*/

  function test_AdoptProposalExecutesCreateRole() external {
    // Submit proposal to create a new role
    string[] memory _newDomains = new string[](1);
    _newDomains[0] = 'Testing';
    string[] memory _newAccs = new string[](1);
    _newAccs[0] = 'Write tests';

    HolacracyTypes.GovernanceChange memory _change = HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.CreateRole,
      targetId: 0,
      encodedData: abi.encode('QA Engineer', 'Ensure quality', _newDomains, _newAccs)
    });

    vm.prank(_member1);
    uint256 _proposalId =
      _governance.submitProposal(_anchorCircleId, _role1Id, 'Need QA', 'Bugs in prod', 'Add QA role', _change);
    vm.prank(_member1);
    _governance.activateProposal(_proposalId);

    uint256 _roleCountBefore = _roleRegistry.roleCount();

    vm.prank(_facilitator);
    _governance.adoptProposal(_proposalId);

    // it creates the new role
    uint256 _roleCountAfter = _roleRegistry.roleCount();
    assertEq(_roleCountAfter, _roleCountBefore + 1);

    // it stores the role with correct data
    HolacracyTypes.Role memory _newRole = _roleRegistry.getRole(_roleCountAfter);
    assertEq(_newRole.name, 'QA Engineer');
    assertEq(_newRole.purpose, 'Ensure quality');
    assertEq(_newRole.circleId, _anchorCircleId);
  }

  /*///////////////////////////////////////////////////////////////
                      VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function test_GetProposalWhenDoesNotExist() external {
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceProcess.GovernanceProcess_ProposalNotFound.selector, 999)
    );
    _governance.getProposal(999);
  }

  function test_GetObjectionWhenDoesNotExist() external {
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceProcess.GovernanceProcess_ObjectionNotFound.selector, 999)
    );
    _governance.getObjection(999);
  }

  function test_GetProposalObjectionsWhenNone() external view {
    // it returns empty array
    uint256[] memory _objIds = _governance.getProposalObjections(999);
    assertEq(_objIds.length, 0);
  }

  function test_GetCircleProposalsWhenNone() external view {
    // it returns empty array
    uint256[] memory _pIds = _governance.getCircleProposals(999);
    assertEq(_pIds.length, 0);
  }

  /*///////////////////////////////////////////////////////////////
                    SET DAO GOVERNOR
  //////////////////////////////////////////////////////////////*/

  event DAOGovernorSet(address indexed _governor, address indexed _timelock);

  function test_SetDAOGovernorWhenValid() external {
    address _gov = makeAddr('governor');
    address _tl = makeAddr('timelock');

    // it emits DAOGovernorSet
    vm.expectEmit(true, true, false, false, address(_governance));
    emit DAOGovernorSet(_gov, _tl);

    _governance.setDAOGovernor(_gov, _tl);

    // it stores governor and timelock
    assertEq(_governance.daoGovernor(), _gov);
    assertEq(_governance.timelockController(), _tl);
  }

  function test_SetDAOGovernorWhenAlreadySet() external {
    address _gov = makeAddr('governor');
    address _tl = makeAddr('timelock');
    _governance.setDAOGovernor(_gov, _tl);

    // it reverts on second call
    vm.expectRevert(IGovernanceProcess.GovernanceProcess_DAOAlreadySet.selector);
    _governance.setDAOGovernor(makeAddr('other'), makeAddr('other2'));
  }

  /*///////////////////////////////////////////////////////////////
                    ESCALATE TO DAO
  //////////////////////////////////////////////////////////////*/

  event ProposalEscalated(uint256 indexed _proposalId, uint256 indexed _daoProposalId);

  function _setupDAO() internal returns (address _gov, address _tl) {
    _gov = address(new MockDAOGovernor());
    _tl = makeAddr('timelock');
    _governance.setDAOGovernor(_gov, _tl);
  }

  function test_EscalateToDAOWhenActive() external {
    (address _gov,) = _setupDAO();
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    // it emits ProposalEscalated
    vm.expectEmit(true, true, false, false, address(_governance));
    emit ProposalEscalated(_proposalId, MockDAOGovernor(_gov).nextProposalId());

    vm.prank(_member1);
    uint256 _daoId = _governance.escalateToDAO(_proposalId, 'Needs broader vote');

    // it returns the DAO proposal ID
    assertEq(_daoId, MockDAOGovernor(_gov).nextProposalId());

    // it marks proposal as Escalated
    HolacracyTypes.Proposal memory _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Escalated));
  }

  function test_EscalateToDAOWhenIntegrating() external {
    _setupDAO();
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    // Raise an objection to move to Integrating
    vm.prank(_member2);
    _governance.raiseObjection(_proposalId, _role2Id, 'Hard objection', false);

    HolacracyTypes.Proposal memory _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Integrating));

    // it allows escalation from Integrating
    vm.prank(_member1);
    _governance.escalateToDAO(_proposalId, 'Cannot resolve internally');

    _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Escalated));
  }

  function test_EscalateToDAOWhenDAONotSet() external {
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_member1);
    // it reverts
    vm.expectRevert(IGovernanceProcess.GovernanceProcess_DAONotSet.selector);
    _governance.escalateToDAO(_proposalId, 'No DAO configured');
  }

  function test_EscalateToDAOWhenNotCircleMember() external {
    _setupDAO();
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_stranger);
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceProcess.GovernanceProcess_NotCircleMember.selector, _anchorCircleId, _stranger
      )
    );
    _governance.escalateToDAO(_proposalId, 'Sneaky escalation');
  }

  function test_EscalateToDAOWhenDraft() external {
    _setupDAO();

    vm.prank(_member1);
    uint256 _proposalId = _governance.submitProposal(
      _anchorCircleId, _role1Id, 'Tension', 'Example', 'Explanation', _defaultChange()
    );

    vm.prank(_member1);
    // it reverts — Draft is not escalatable
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceProcess.GovernanceProcess_InvalidProposalStatus.selector,
        _proposalId,
        HolacracyTypes.ProposalStatus.Active
      )
    );
    _governance.escalateToDAO(_proposalId, 'Too early');
  }

  function test_EscalateToDAOEncodesCorrectCalldata() external {
    (address _gov,) = _setupDAO();
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_member1);
    _governance.escalateToDAO(_proposalId, 'Check calldata');

    // it encodes executeEscalatedProposal(proposalId) as the calldata
    bytes memory _expected = abi.encodeCall(_governance.executeEscalatedProposal, (_proposalId));
    assertEq(MockDAOGovernor(_gov).lastCalldata(), _expected);

    // it targets this governance process contract
    assertEq(MockDAOGovernor(_gov).lastTarget(), address(_governance));
  }

  /*///////////////////////////////////////////////////////////////
                    EXECUTE ESCALATED PROPOSAL
  //////////////////////////////////////////////////////////////*/

  function test_ExecuteEscalatedProposalWhenTimelock() external {
    (, address _tl) = _setupDAO();
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);

    vm.prank(_member1);
    _governance.escalateToDAO(_proposalId, 'Escalate');

    uint256 _rolesBefore = _roleRegistry.getCircleRoleIds(_anchorCircleId).length;

    vm.prank(_tl);
    _governance.executeEscalatedProposal(_proposalId);

    // it marks proposal as Adopted
    HolacracyTypes.Proposal memory _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Adopted));
    assertGt(_proposal.resolvedAt, 0);

    // it executes the governance change (CreateRole adds a role)
    assertEq(_roleRegistry.getCircleRoleIds(_anchorCircleId).length, _rolesBefore + 1);
  }

  function test_ExecuteEscalatedProposalEmitsAdopted() external {
    (, address _tl) = _setupDAO();
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);
    vm.prank(_member1);
    _governance.escalateToDAO(_proposalId, 'Escalate');

    vm.prank(_tl);
    vm.expectEmit(true, false, false, false, address(_governance));
    emit ProposalAdopted(_proposalId);
    _governance.executeEscalatedProposal(_proposalId);
  }

  function test_ExecuteEscalatedProposalWhenNotTimelock() external {
    (, address _tl) = _setupDAO();
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);
    vm.prank(_member1);
    _governance.escalateToDAO(_proposalId, 'Escalate');

    vm.prank(_stranger);
    // it reverts
    vm.expectRevert(IGovernanceProcess.GovernanceProcess_NotTimelock.selector);
    _governance.executeEscalatedProposal(_proposalId);
  }

  function test_ExecuteEscalatedProposalWhenNotEscalated() external {
    (, address _tl) = _setupDAO();
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);
    // Proposal is Active, not Escalated

    vm.prank(_tl);
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceProcess.GovernanceProcess_InvalidProposalStatus.selector,
        _proposalId,
        HolacracyTypes.ProposalStatus.Escalated
      )
    );
    _governance.executeEscalatedProposal(_proposalId);
  }

  function test_WithdrawProposalWhenEscalated() external {
    _setupDAO();
    uint256 _proposalId = _submitAndActivateProposal(_member1, _role1Id);
    vm.prank(_member1);
    _governance.escalateToDAO(_proposalId, 'Escalate');

    vm.prank(_member1);
    // it emits ProposalWithdrawn
    vm.expectEmit(true, false, false, false, address(_governance));
    emit ProposalWithdrawn(_proposalId);
    _governance.withdrawProposal(_proposalId);

    HolacracyTypes.Proposal memory _proposal = _governance.getProposal(_proposalId);
    assertEq(uint256(_proposal.status), uint256(HolacracyTypes.ProposalStatus.Withdrawn));
  }
}
