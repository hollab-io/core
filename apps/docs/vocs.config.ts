import { defineConfig } from "vocs";

export default defineConfig({
    title: "hollab.eth",
    description: "The onchain operating system for autonomous organizations",
    vite: {
        server: {
            port: 1243,
        },
    },
    sidebar: [
        {
            text: "Introduction",
            items: [
                { text: "What is hollab.eth", link: "/introduction" },
                { text: "Architecture", link: "/architecture" },
            ],
        },
        {
            text: "Getting Started",
            items: [
                { text: "Installation", link: "/getting-started/installation" },
                { text: "Local Development", link: "/getting-started/local-dev" },
            ],
        },
        {
            text: "Contracts",
            items: [
                { text: "Overview", link: "/contracts/overview" },
                { text: "OrganizationFactory", link: "/contracts/organization-factory" },
                { text: "RoleRegistry", link: "/contracts/role-registry" },
                { text: "MeetingFactory", link: "/contracts/meeting-factory" },
                { text: "ActionVoting", link: "/contracts/action-voting" },
                { text: "GovToken", link: "/contracts/gov-token" },
                { text: "ENS Integration", link: "/contracts/ens" },
                { text: "Deployment", link: "/contracts/deployment" },
            ],
        },
        {
            text: "Indexer",
            items: [
                { text: "Ponder Indexer", link: "/indexer/ponder" },
                { text: "Indexing Client", link: "/indexer/client" },
            ],
        },
        {
            text: "SDK",
            items: [
                { text: "Overview", link: "/sdk/overview" },
                { text: "Key Management", link: "/sdk/key-management" },
                { text: "Viem Extension", link: "/sdk/viem-extension" },
                { text: "Agent SDK", link: "/sdk/agent-sdk" },
            ],
        },
        {
            text: "Frontend",
            items: [
                { text: "App Structure", link: "/frontend/structure" },
                { text: "User Journey", link: "/frontend/user-journey" },
            ],
        },
        {
            text: "Operations",
            items: [
                { text: "Docker & CI/CD", link: "/operations/docker" },
                { text: "IPFS Deployment", link: "/operations/ipfs" },
            ],
        },
    ],
});
