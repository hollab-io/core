---
name: Contracts testing infrastructure
description: Foundry test conventions, import remappings, naming patterns, and helper patterns in packages/contracts
type: project
---

Test framework: Foundry (forge test). No Vitest/Jest in this package.

**Remappings** (remappings.txt):
- `forge-std/` → `node_modules/forge-std/src`
- `@openzeppelin/contracts/` → `node_modules/@openzeppelin/contracts/`
- `contracts/` → `src/contracts`
- `libraries/` → `src/libraries`
- `interfaces/` → `src/interfaces`

**Test conventions** (from RoleRegistry.t.sol):
- Contract name: `Unit<ContractName>` (e.g. `UnitGovToken`)
- Inherits `Test` from `forge-std/Test.sol`
- Named addresses via `makeAddr('label')`
- `modifier whenCalledBy...` for repeated prank blocks using `vm.startPrank`/`vm.stopPrank`
- `vm.expectEmit(true, true, true, true, address(contract))` before `vm.prank` + call
- Custom errors referenced directly from contract type (e.g. `GovToken.NotMinter.selector`)
- `vm.expectRevert(ContractName.ErrorName.selector)` for no-arg errors
- `vm.expectRevert(abi.encodeWithSelector(...))` for errors with args
- Test names: `test_<MethodName>When<Scenario>()`

**Run single unit test file:**
```
forge test --match-path test/unit/GovToken.t.sol -vvv
```

**Why:** These conventions are established across existing test files and must be matched exactly for consistency.
**How to apply:** Any new Foundry test file in packages/contracts should follow these patterns precisely.
