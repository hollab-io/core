import { defineConfig } from "@wagmi/cli";
import { foundry } from "@wagmi/cli/plugins";

export default defineConfig({
  out: "generated/index.ts",
  contracts: [],
  plugins: [
    foundry({
      project: ".",
      include: [
        "CircleRegistry.sol/**",
        "CircleTreasury.sol/**",
        "GovernanceProcess.sol/**",
        "OrganizationFactory.sol/**",
        "RoleRegistry.sol/**",
        "TreasuryDeployer.sol/**",
        "GovComponentDeployer.sol/**",
        "GovToken.sol/**",
        "HolGovernor.sol/**",
        "HolGovernorFactory.sol/**",
        "GovernanceMeeting.sol/**",
        "TacticalMeeting.sol/**",
      ],
    }),
  ],
});
