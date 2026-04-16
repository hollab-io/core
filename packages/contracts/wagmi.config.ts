import { existsSync, readFileSync } from "fs";
import { defineConfig } from "@wagmi/cli";
import { foundry } from "@wagmi/cli/plugins";

// Read deployment addresses from artifact (changes on every `forge script --broadcast`)
function readDeployment(chainId: number): { orgFactory?: string; meetingFactory?: string } {
  const suffix = chainId === 31337 ? "local" : "infrastructure";
  const path = `./deployments/${chainId}-${suffix}.json`;
  if (!existsSync(path)) return {};
  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    return { orgFactory: data.orgFactory, meetingFactory: data.meetingFactory };
  } catch {
    return {};
  }
}

const local = readDeployment(31337);
const sepolia = readDeployment(11155111);

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
          ...(sepolia.orgFactory ? { 11155111: sepolia.orgFactory } : {}),
          1: "0xC0252342923238CF5509cfBd2fa46A45ADeDc921",
        },
        MeetingComponentsFactory: {
          ...(local.meetingFactory ? { 31337: local.meetingFactory } : {}),
          ...(sepolia.meetingFactory ? { 11155111: sepolia.meetingFactory } : {}),
          1: "0x876C1eDF90e1BcdFC3488a53Ce3EFf1759D27D25",
        },
      },
    }),
  ],
});
