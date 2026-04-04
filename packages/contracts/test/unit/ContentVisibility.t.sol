// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {GovernanceProcess, IGovernanceProcess} from 'contracts/GovernanceProcess.sol';
import {CircleRegistry, ICircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry, IRoleRegistry} from 'contracts/RoleRegistry.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {Test} from 'forge-std/Test.sol';

contract UnitContentVisibility is Test {
  RoleRegistry internal _roleRegistry;
  CircleRegistry internal _circleRegistry;
  GovernanceProcess internal _governance;

  address internal _deployer = makeAddr('deployer');
  address internal _member1 = makeAddr('member1');
  address internal _facilitator = makeAddr('facilitator');

  uint256 internal _anchorCircleId;
  uint256 internal _role1Id;

  string[] internal _domains;
  string[] internal _accountabilities;

  event ContentRefSet(
    bytes32 indexed _entityType,
    uint256 indexed _entityId,
    bytes32 indexed _fieldName,
    bytes32 _contentHash,
    HolacracyTypes.DataVisibility _visibility
  );

  function setUp() external {
    _domains.push('TestDomain');
    _accountabilities.push('TestAccountability');

    RoleRegistry _rrImpl = new RoleRegistry();
    CircleRegistry _crImpl = new CircleRegistry();
    GovernanceProcess _govImpl = new GovernanceProcess();

    _roleRegistry = RoleRegistry(Clones.clone(address(_rrImpl)));
    _circleRegistry = CircleRegistry(Clones.clone(address(_crImpl)));
    _governance = GovernanceProcess(Clones.clone(address(_govImpl)));

    _roleRegistry.initialize();
    _governance.initialize(_circleRegistry, _roleRegistry);
    vm.startPrank(_deployer);
    _circleRegistry.initialize(_roleRegistry, _deployer, address(_governance));

    _anchorCircleId = _circleRegistry.createAnchorCircle('Build tools');
    _role1Id =
      _circleRegistry.createRoleInCircle(_anchorCircleId, 'Dev', 'Develop', _domains, _accountabilities);
    _circleRegistry.assignRoleLeadInCircle(_anchorCircleId, _role1Id, _member1);
    _circleRegistry.setElectedRole(
      _anchorCircleId, HolacracyTypes.ElectedRole.Facilitator, _facilitator
    );
    vm.stopPrank();
  }

  /*///////////////////////////////////////////////////////////////
                    HELPER FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function _singleRef(bytes32 _hash, HolacracyTypes.DataVisibility _vis)
    internal
    pure
    returns (bytes32[] memory _fieldNames, HolacracyTypes.ContentRef[] memory _refs)
  {
    _fieldNames = new bytes32[](1);
    _fieldNames[0] = keccak256('purpose');
    _refs = new HolacracyTypes.ContentRef[](1);
    _refs[0] = HolacracyTypes.ContentRef({contentHash: _hash, visibility: _vis});
  }

  /*///////////////////////////////////////////////////////////////
              ROLE REGISTRY — createRoleWithRefs
  //////////////////////////////////////////////////////////////*/

  function test_CreateRoleWithRefsStoresContentRef() external {
    bytes32 _hash = keccak256('secret purpose');
    (bytes32[] memory _fn, HolacracyTypes.ContentRef[] memory _refs) =
      _singleRef(_hash, HolacracyTypes.DataVisibility.OrgEncrypted);

    vm.prank(_deployer);
    uint256 _roleId = _circleRegistry.createRoleInCircleWithRefs(
      _anchorCircleId, 'SecretRole', '0g:abc123', _domains, _accountabilities, _fn, _refs
    );

    // Verify role was created
    HolacracyTypes.Role memory _role = _roleRegistry.getRole(_roleId);
    assertEq(_role.name, 'SecretRole');
    assertEq(_role.purpose, '0g:abc123');

    // Verify content ref stored
    HolacracyTypes.ContentRef memory _ref = _roleRegistry.getRoleContentRef(_roleId, keccak256('purpose'));
    assertEq(_ref.contentHash, _hash);
    assertEq(uint256(_ref.visibility), uint256(HolacracyTypes.DataVisibility.OrgEncrypted));
  }

  function test_CreateRoleWithRefsEmitsEvent() external {
    bytes32 _hash = keccak256('secret purpose');
    (bytes32[] memory _fn, HolacracyTypes.ContentRef[] memory _refs) =
      _singleRef(_hash, HolacracyTypes.DataVisibility.OrgEncrypted);

    uint256 _expectedRoleId = _roleRegistry.roleCount() + 1;

    vm.expectEmit(true, true, true, true, address(_roleRegistry));
    emit ContentRefSet(
      keccak256('role'), _expectedRoleId, keccak256('purpose'), _hash, HolacracyTypes.DataVisibility.OrgEncrypted
    );

    vm.prank(_deployer);
    _circleRegistry.createRoleInCircleWithRefs(
      _anchorCircleId, 'SecretRole', '0g:abc123', _domains, _accountabilities, _fn, _refs
    );
  }

  function test_CreateRoleWithRefsRevertsOnArrayMismatch() external {
    bytes32[] memory _fn = new bytes32[](2);
    _fn[0] = keccak256('purpose');
    _fn[1] = keccak256('domain');
    HolacracyTypes.ContentRef[] memory _refs = new HolacracyTypes.ContentRef[](1);
    _refs[0] = HolacracyTypes.ContentRef({
      contentHash: keccak256('x'),
      visibility: HolacracyTypes.DataVisibility.OrgEncrypted
    });

    vm.prank(_deployer);
    vm.expectRevert(IRoleRegistry.RoleRegistry_ArrayLengthMismatch.selector);
    _circleRegistry.createRoleInCircleWithRefs(
      _anchorCircleId, 'Role', '0g:x', _domains, _accountabilities, _fn, _refs
    );
  }

  /*///////////////////////////////////////////////////////////////
              ROLE REGISTRY — updateRoleWithRefs
  //////////////////////////////////////////////////////////////*/

  function test_UpdateRoleWithRefsStoresContentRef() external {
    bytes32 _hash = keccak256('updated purpose');
    (bytes32[] memory _fn, HolacracyTypes.ContentRef[] memory _refs) =
      _singleRef(_hash, HolacracyTypes.DataVisibility.RoleEncrypted);

    vm.prank(_deployer);
    _circleRegistry.updateRoleInCircleWithRefs(
      _anchorCircleId, _role1Id, 'Dev', '0g:updated', _domains, _accountabilities, _fn, _refs
    );

    HolacracyTypes.ContentRef memory _ref = _roleRegistry.getRoleContentRef(_role1Id, keccak256('purpose'));
    assertEq(_ref.contentHash, _hash);
    assertEq(uint256(_ref.visibility), uint256(HolacracyTypes.DataVisibility.RoleEncrypted));
  }

  /*///////////////////////////////////////////////////////////////
            CIRCLE REGISTRY — addPolicyWithRefs
  //////////////////////////////////////////////////////////////*/

  function test_AddPolicyWithRefsStoresContentRef() external {
    bytes32 _hash = keccak256('sensitive policy body');
    bytes32[] memory _fn = new bytes32[](1);
    _fn[0] = keccak256('body');
    HolacracyTypes.ContentRef[] memory _refs = new HolacracyTypes.ContentRef[](1);
    _refs[0] = HolacracyTypes.ContentRef({
      contentHash: _hash,
      visibility: HolacracyTypes.DataVisibility.OrgEncrypted
    });

    vm.prank(_deployer);
    uint256 _policyId =
      _circleRegistry.addPolicyWithRefs(_anchorCircleId, 'Access Policy', '0g:body', _fn, _refs);

    // Verify policy created
    HolacracyTypes.Policy memory _policy = _circleRegistry.getPolicy(_policyId);
    assertEq(_policy.name, 'Access Policy');
    assertEq(_policy.body, '0g:body');

    // Verify content ref
    HolacracyTypes.ContentRef memory _ref = _circleRegistry.getPolicyContentRef(_policyId, keccak256('body'));
    assertEq(_ref.contentHash, _hash);
    assertEq(uint256(_ref.visibility), uint256(HolacracyTypes.DataVisibility.OrgEncrypted));
  }

  function test_AddPolicyWithRefsEmitsEvent() external {
    bytes32 _hash = keccak256('policy body');
    bytes32[] memory _fn = new bytes32[](1);
    _fn[0] = keccak256('body');
    HolacracyTypes.ContentRef[] memory _refs = new HolacracyTypes.ContentRef[](1);
    _refs[0] = HolacracyTypes.ContentRef({
      contentHash: _hash,
      visibility: HolacracyTypes.DataVisibility.OrgEncrypted
    });

    vm.expectEmit(true, true, true, true, address(_circleRegistry));
    emit ContentRefSet(keccak256('policy'), 1, keccak256('body'), _hash, HolacracyTypes.DataVisibility.OrgEncrypted);

    vm.prank(_deployer);
    _circleRegistry.addPolicyWithRefs(_anchorCircleId, 'Policy', '0g:body', _fn, _refs);
  }

  /*///////////////////////////////////////////////////////////////
          GOVERNANCE — submitProposalWithRefs
  //////////////////////////////////////////////////////////////*/

  function test_SubmitProposalWithRefsStoresContentRef() external {
    bytes32 _hash = keccak256('private tension');
    (bytes32[] memory _fn, HolacracyTypes.ContentRef[] memory _refs) =
      _singleRef(_hash, HolacracyTypes.DataVisibility.OrgEncrypted);
    _fn[0] = keccak256('tension');

    string[] memory _emptyArr = new string[](0);
    HolacracyTypes.GovernanceChange memory _change = HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.CreateRole,
      targetId: 0,
      encodedData: abi.encode('NewRole', 'Purpose', _emptyArr, _emptyArr)
    });

    vm.prank(_member1);
    uint256 _proposalId = _governance.submitProposalWithRefs(
      _anchorCircleId, _role1Id, '0g:tension', 'Example', 'Explanation', _change, _fn, _refs
    );

    HolacracyTypes.ContentRef memory _ref =
      _governance.getProposalContentRef(_proposalId, keccak256('tension'));
    assertEq(_ref.contentHash, _hash);
    assertEq(uint256(_ref.visibility), uint256(HolacracyTypes.DataVisibility.OrgEncrypted));
  }

  /*///////////////////////////////////////////////////////////////
        GOVERNANCE — raiseObjectionWithRefs
  //////////////////////////////////////////////////////////////*/

  function test_RaiseObjectionWithRefsStoresContentRef() external {
    // Submit and activate a proposal
    string[] memory _emptyArr = new string[](0);
    HolacracyTypes.GovernanceChange memory _change = HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.CreateRole,
      targetId: 0,
      encodedData: abi.encode('NewRole', 'Purpose', _emptyArr, _emptyArr)
    });
    vm.prank(_member1);
    uint256 _proposalId =
      _governance.submitProposal(_anchorCircleId, _role1Id, 'Tension', 'Ex', 'Expl', _change);
    vm.prank(_member1);
    _governance.activateProposal(_proposalId);

    bytes32 _hash = keccak256('private concern');
    bytes32[] memory _fn = new bytes32[](1);
    _fn[0] = keccak256('concern');
    HolacracyTypes.ContentRef[] memory _refs = new HolacracyTypes.ContentRef[](1);
    _refs[0] = HolacracyTypes.ContentRef({
      contentHash: _hash,
      visibility: HolacracyTypes.DataVisibility.OrgEncrypted
    });

    vm.prank(_member1);
    uint256 _objectionId =
      _governance.raiseObjectionWithRefs(_proposalId, _role1Id, '0g:concern', false, _fn, _refs);

    HolacracyTypes.ContentRef memory _ref =
      _governance.getObjectionContentRef(_objectionId, keccak256('concern'));
    assertEq(_ref.contentHash, _hash);
  }

  /*///////////////////////////////////////////////////////////////
        GOVERNANCE — resolveObjectionWithRefs
  //////////////////////////////////////////////////////////////*/

  function test_ResolveObjectionWithRefsStoresContentRef() external {
    // Setup: submit, activate, raise objection
    string[] memory _emptyArr = new string[](0);
    HolacracyTypes.GovernanceChange memory _change = HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.CreateRole,
      targetId: 0,
      encodedData: abi.encode('NewRole', 'Purpose', _emptyArr, _emptyArr)
    });
    vm.prank(_member1);
    uint256 _proposalId =
      _governance.submitProposal(_anchorCircleId, _role1Id, 'Tension', 'Ex', 'Expl', _change);
    vm.prank(_member1);
    _governance.activateProposal(_proposalId);
    vm.prank(_member1);
    uint256 _objectionId = _governance.raiseObjection(_proposalId, _role1Id, 'Concern', false);

    bytes32 _hash = keccak256('private resolution');
    bytes32[] memory _fn = new bytes32[](1);
    _fn[0] = keccak256('resolution');
    HolacracyTypes.ContentRef[] memory _refs = new HolacracyTypes.ContentRef[](1);
    _refs[0] = HolacracyTypes.ContentRef({
      contentHash: _hash,
      visibility: HolacracyTypes.DataVisibility.OrgEncrypted
    });

    vm.prank(_facilitator);
    _governance.resolveObjectionWithRefs(_objectionId, '0g:resolution', _fn, _refs);

    HolacracyTypes.ContentRef memory _ref =
      _governance.getObjectionContentRef(_objectionId, keccak256('resolution'));
    assertEq(_ref.contentHash, _hash);
  }

  /*///////////////////////////////////////////////////////////////
          GOVERNANCE — _executeChange with WithRefs
  //////////////////////////////////////////////////////////////*/

  function test_AdoptProposalExecutesCreateRoleWithRefs() external {
    bytes32 _hash = keccak256('secret purpose');
    bytes32[] memory _fieldNames = new bytes32[](1);
    _fieldNames[0] = keccak256('purpose');
    HolacracyTypes.ContentRef[] memory _refs = new HolacracyTypes.ContentRef[](1);
    _refs[0] = HolacracyTypes.ContentRef({
      contentHash: _hash,
      visibility: HolacracyTypes.DataVisibility.OrgEncrypted
    });

    string[] memory _newDomains = new string[](1);
    _newDomains[0] = 'Testing';
    string[] memory _newAccs = new string[](1);
    _newAccs[0] = 'Write tests';

    HolacracyTypes.GovernanceChange memory _change = HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.CreateRoleWithRefs,
      targetId: 0,
      encodedData: abi.encode('QA', '0g:purpose', _newDomains, _newAccs, _fieldNames, _refs)
    });

    vm.prank(_member1);
    uint256 _proposalId = _governance.submitProposal(
      _anchorCircleId, _role1Id, 'Need QA', 'Bugs', 'Add role', _change
    );
    vm.prank(_member1);
    _governance.activateProposal(_proposalId);

    uint256 _roleCountBefore = _roleRegistry.roleCount();

    vm.prank(_facilitator);
    _governance.adoptProposal(_proposalId);

    uint256 _newRoleId = _roleCountBefore + 1;
    HolacracyTypes.Role memory _newRole = _roleRegistry.getRole(_newRoleId);
    assertEq(_newRole.name, 'QA');
    assertEq(_newRole.purpose, '0g:purpose');

    HolacracyTypes.ContentRef memory _ref = _roleRegistry.getRoleContentRef(_newRoleId, keccak256('purpose'));
    assertEq(_ref.contentHash, _hash);
    assertEq(uint256(_ref.visibility), uint256(HolacracyTypes.DataVisibility.OrgEncrypted));
  }

  /*///////////////////////////////////////////////////////////////
              BACKWARD COMPATIBILITY
  //////////////////////////////////////////////////////////////*/

  function test_ExistingCreateRoleStillWorks() external {
    vm.prank(_deployer);
    uint256 _roleId = _circleRegistry.createRoleInCircle(
      _anchorCircleId, 'PlainRole', 'Plain purpose', _domains, _accountabilities
    );

    HolacracyTypes.Role memory _role = _roleRegistry.getRole(_roleId);
    assertEq(_role.name, 'PlainRole');
    assertEq(_role.purpose, 'Plain purpose');

    // Content ref should be empty (default)
    HolacracyTypes.ContentRef memory _ref = _roleRegistry.getRoleContentRef(_roleId, keccak256('purpose'));
    assertEq(_ref.contentHash, bytes32(0));
    assertEq(uint256(_ref.visibility), uint256(HolacracyTypes.DataVisibility.Public));
  }

  function test_ExistingAddPolicyStillWorks() external {
    vm.prank(_deployer);
    uint256 _policyId = _circleRegistry.addPolicy(_anchorCircleId, 'OldPolicy', 'Old body');

    HolacracyTypes.Policy memory _policy = _circleRegistry.getPolicy(_policyId);
    assertEq(_policy.name, 'OldPolicy');
    assertEq(_policy.body, 'Old body');

    // Content ref should be empty
    HolacracyTypes.ContentRef memory _ref = _circleRegistry.getPolicyContentRef(_policyId, keccak256('body'));
    assertEq(_ref.contentHash, bytes32(0));
  }

  function test_EmptyRefsArrayAllowed() external {
    bytes32[] memory _fn = new bytes32[](0);
    HolacracyTypes.ContentRef[] memory _refs = new HolacracyTypes.ContentRef[](0);

    vm.prank(_deployer);
    uint256 _roleId = _circleRegistry.createRoleInCircleWithRefs(
      _anchorCircleId, 'NoRefs', 'Purpose', _domains, _accountabilities, _fn, _refs
    );

    HolacracyTypes.Role memory _role = _roleRegistry.getRole(_roleId);
    assertEq(_role.name, 'NoRefs');
    assertEq(_role.purpose, 'Purpose');
  }

  function test_MultipleContentRefs() external {
    bytes32[] memory _fn = new bytes32[](2);
    _fn[0] = keccak256('purpose');
    _fn[1] = keccak256('domain:0');
    HolacracyTypes.ContentRef[] memory _refs = new HolacracyTypes.ContentRef[](2);
    _refs[0] = HolacracyTypes.ContentRef({
      contentHash: keccak256('secret purpose'),
      visibility: HolacracyTypes.DataVisibility.OrgEncrypted
    });
    _refs[1] = HolacracyTypes.ContentRef({
      contentHash: keccak256('secret domain'),
      visibility: HolacracyTypes.DataVisibility.RoleEncrypted
    });

    vm.prank(_deployer);
    uint256 _roleId = _circleRegistry.createRoleInCircleWithRefs(
      _anchorCircleId, 'MultiRef', '0g:purpose', _domains, _accountabilities, _fn, _refs
    );

    HolacracyTypes.ContentRef memory _ref0 = _roleRegistry.getRoleContentRef(_roleId, keccak256('purpose'));
    assertEq(_ref0.contentHash, keccak256('secret purpose'));
    assertEq(uint256(_ref0.visibility), uint256(HolacracyTypes.DataVisibility.OrgEncrypted));

    HolacracyTypes.ContentRef memory _ref1 = _roleRegistry.getRoleContentRef(_roleId, keccak256('domain:0'));
    assertEq(_ref1.contentHash, keccak256('secret domain'));
    assertEq(uint256(_ref1.visibility), uint256(HolacracyTypes.DataVisibility.RoleEncrypted));
  }
}
