import { existsSync, readFileSync } from "fs";
import { defineConfig } from "@wagmi/cli";
import { foundry } from "@wagmi/cli/plugins";

// Read local deployment addresses from artifact (changes on every `forge script --broadcast`)
function readLocalDeployment(): { orgFactory?: string; meetingFactory?: string } {
  const path = "./deployments/31337-local.json";
  if (!existsSync(path)) return {};
  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    return { orgFactory: data.orgFactory, meetingFactory: data.meetingFactory };
  } catch {
    return {};
  }
}

const local = readLocalDeployment();

export default defineConfig({
  out: "generated/index.ts",
  contracts: [],
  plugins: [
    foundry({
      project: ".",
      include: [
        "OrganizationFactory.sol/**",
        "RoleRegistry.sol/**",
        "GovToken.sol/**",
        "GovTokenDeployer.sol/**",
        "MeetingFactory.sol/**",
        "ActionVoting.sol/**",
        "MeetingComponentsFactory.sol/**",
      ],
      deployments: {
        OrganizationFactory: {
          ...(local.orgFactory ? { 31337: local.orgFactory } : {}),
          1: "0xC0252342923238CF5509cfBd2fa46A45ADeDc921",
          11155111: "0xda7029ef38fDCF3bFb79f113801b5b77Be55f0b3",
        },
        MeetingComponentsFactory: {
          ...(local.meetingFactory ? { 31337: local.meetingFactory } : {}),
          1: "0x876C1eDF90e1BcdFC3488a53Ce3EFf1759D27D25",
          11155111: "0x18a1Dc3b2ad282E7376AFC2Ff9214d2544aDf27F",
        },
      },
    }),
  ],
});
