import { defineConfig } from "@wagmi/cli";
import { foundry } from "@wagmi/cli/plugins";

export default defineConfig({
  out: "generated/index.ts",
  contracts: [],
  plugins: [
    foundry({
      project: ".",
      include: [
        "OrganizationFactory.sol/**",
        "RoleRegistry.sol/**",
        "GovComponentDeployer.sol/**",
        "GovToken.sol/**",
        "HolGovernor.sol/**",
        "HolGovernorFactory.sol/**",
        "MeetingFactory.sol/**",
        "ActionVoting.sol/**",
        "MeetingComponentsFactory.sol/**",
      ],
      // Read local (31337) addresses from broadcast/run-latest.json
      includeBroadcasts: true,
      // Mainnet & Sepolia addresses (no broadcast files for these)
      deployments: {
        OrganizationFactory: {
          1: "0xC0252342923238CF5509cfBd2fa46A45ADeDc921",
          11155111: "0xda7029ef38fDCF3bFb79f113801b5b77Be55f0b3",
        },
        MeetingComponentsFactory: {
          1: "0x876C1eDF90e1BcdFC3488a53Ce3EFf1759D27D25",
          11155111: "0x18a1Dc3b2ad282E7376AFC2Ff9214d2544aDf27F",
        },
      },
    }),
  ],
});
