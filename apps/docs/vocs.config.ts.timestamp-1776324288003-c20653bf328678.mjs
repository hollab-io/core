// vocs.config.ts
import { defineConfig } from "file:///Users/skas/Documents/GitHub/hollab-cannes-26/node_modules/.pnpm/vocs@1.0.0-alpha.62_@types+node@24.12.2_@types+react-dom@19.2.3_@types+react@19.2.14__@types+_fsx26vbbj3odmcmqybrctfi7g4/node_modules/vocs/_lib/index.js";

var vocs_config_default = defineConfig({
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
export { vocs_config_default as default };
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidm9jcy5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvc2thcy9Eb2N1bWVudHMvR2l0SHViL2hvbGxhYi1jYW5uZXMtMjYvYXBwcy9kb2NzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvc2thcy9Eb2N1bWVudHMvR2l0SHViL2hvbGxhYi1jYW5uZXMtMjYvYXBwcy9kb2NzL3ZvY3MuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9za2FzL0RvY3VtZW50cy9HaXRIdWIvaG9sbGFiLWNhbm5lcy0yNi9hcHBzL2RvY3Mvdm9jcy5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidm9jc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICAgIHRpdGxlOiBcImhvbGxhYi5ldGhcIixcbiAgICBkZXNjcmlwdGlvbjogXCJUaGUgb25jaGFpbiBvcGVyYXRpbmcgc3lzdGVtIGZvciBhdXRvbm9tb3VzIG9yZ2FuaXphdGlvbnNcIixcbiAgICB2aXRlOiB7XG4gICAgICAgIHNlcnZlcjoge1xuICAgICAgICAgICAgcG9ydDogMTI0MyxcbiAgICAgICAgfSxcbiAgICB9LFxuICAgIHNpZGViYXI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdGV4dDogXCJJbnRyb2R1Y3Rpb25cIixcbiAgICAgICAgICAgIGl0ZW1zOiBbXG4gICAgICAgICAgICAgICAgeyB0ZXh0OiBcIldoYXQgaXMgaG9sbGFiLmV0aFwiLCBsaW5rOiBcIi9pbnRyb2R1Y3Rpb25cIiB9LFxuICAgICAgICAgICAgICAgIHsgdGV4dDogXCJBcmNoaXRlY3R1cmVcIiwgbGluazogXCIvYXJjaGl0ZWN0dXJlXCIgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6IFwiR2V0dGluZyBTdGFydGVkXCIsXG4gICAgICAgICAgICBpdGVtczogW1xuICAgICAgICAgICAgICAgIHsgdGV4dDogXCJJbnN0YWxsYXRpb25cIiwgbGluazogXCIvZ2V0dGluZy1zdGFydGVkL2luc3RhbGxhdGlvblwiIH0sXG4gICAgICAgICAgICAgICAgeyB0ZXh0OiBcIkxvY2FsIERldmVsb3BtZW50XCIsIGxpbms6IFwiL2dldHRpbmctc3RhcnRlZC9sb2NhbC1kZXZcIiB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdGV4dDogXCJDb250cmFjdHNcIixcbiAgICAgICAgICAgIGl0ZW1zOiBbXG4gICAgICAgICAgICAgICAgeyB0ZXh0OiBcIk92ZXJ2aWV3XCIsIGxpbms6IFwiL2NvbnRyYWN0cy9vdmVydmlld1wiIH0sXG4gICAgICAgICAgICAgICAgeyB0ZXh0OiBcIk9yZ2FuaXphdGlvbkZhY3RvcnlcIiwgbGluazogXCIvY29udHJhY3RzL29yZ2FuaXphdGlvbi1mYWN0b3J5XCIgfSxcbiAgICAgICAgICAgICAgICB7IHRleHQ6IFwiUm9sZVJlZ2lzdHJ5XCIsIGxpbms6IFwiL2NvbnRyYWN0cy9yb2xlLXJlZ2lzdHJ5XCIgfSxcbiAgICAgICAgICAgICAgICB7IHRleHQ6IFwiTWVldGluZ0ZhY3RvcnlcIiwgbGluazogXCIvY29udHJhY3RzL21lZXRpbmctZmFjdG9yeVwiIH0sXG4gICAgICAgICAgICAgICAgeyB0ZXh0OiBcIkFjdGlvblZvdGluZ1wiLCBsaW5rOiBcIi9jb250cmFjdHMvYWN0aW9uLXZvdGluZ1wiIH0sXG4gICAgICAgICAgICAgICAgeyB0ZXh0OiBcIkdvdlRva2VuXCIsIGxpbms6IFwiL2NvbnRyYWN0cy9nb3YtdG9rZW5cIiB9LFxuICAgICAgICAgICAgICAgIHsgdGV4dDogXCJFTlMgSW50ZWdyYXRpb25cIiwgbGluazogXCIvY29udHJhY3RzL2Vuc1wiIH0sXG4gICAgICAgICAgICAgICAgeyB0ZXh0OiBcIkRlcGxveW1lbnRcIiwgbGluazogXCIvY29udHJhY3RzL2RlcGxveW1lbnRcIiB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdGV4dDogXCJJbmRleGVyXCIsXG4gICAgICAgICAgICBpdGVtczogW1xuICAgICAgICAgICAgICAgIHsgdGV4dDogXCJQb25kZXIgSW5kZXhlclwiLCBsaW5rOiBcIi9pbmRleGVyL3BvbmRlclwiIH0sXG4gICAgICAgICAgICAgICAgeyB0ZXh0OiBcIkluZGV4aW5nIENsaWVudFwiLCBsaW5rOiBcIi9pbmRleGVyL2NsaWVudFwiIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0ZXh0OiBcIlNES1wiLFxuICAgICAgICAgICAgaXRlbXM6IFtcbiAgICAgICAgICAgICAgICB7IHRleHQ6IFwiT3ZlcnZpZXdcIiwgbGluazogXCIvc2RrL292ZXJ2aWV3XCIgfSxcbiAgICAgICAgICAgICAgICB7IHRleHQ6IFwiS2V5IE1hbmFnZW1lbnRcIiwgbGluazogXCIvc2RrL2tleS1tYW5hZ2VtZW50XCIgfSxcbiAgICAgICAgICAgICAgICB7IHRleHQ6IFwiVmllbSBFeHRlbnNpb25cIiwgbGluazogXCIvc2RrL3ZpZW0tZXh0ZW5zaW9uXCIgfSxcbiAgICAgICAgICAgICAgICB7IHRleHQ6IFwiQWdlbnQgU0RLXCIsIGxpbms6IFwiL3Nkay9hZ2VudC1zZGtcIiB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdGV4dDogXCJGcm9udGVuZFwiLFxuICAgICAgICAgICAgaXRlbXM6IFtcbiAgICAgICAgICAgICAgICB7IHRleHQ6IFwiQXBwIFN0cnVjdHVyZVwiLCBsaW5rOiBcIi9mcm9udGVuZC9zdHJ1Y3R1cmVcIiB9LFxuICAgICAgICAgICAgICAgIHsgdGV4dDogXCJVc2VyIEpvdXJuZXlcIiwgbGluazogXCIvZnJvbnRlbmQvdXNlci1qb3VybmV5XCIgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6IFwiT3BlcmF0aW9uc1wiLFxuICAgICAgICAgICAgaXRlbXM6IFtcbiAgICAgICAgICAgICAgICB7IHRleHQ6IFwiRG9ja2VyICYgQ0kvQ0RcIiwgbGluazogXCIvb3BlcmF0aW9ucy9kb2NrZXJcIiB9LFxuICAgICAgICAgICAgICAgIHsgdGV4dDogXCJJUEZTIERlcGxveW1lbnRcIiwgbGluazogXCIvb3BlcmF0aW9ucy9pcGZzXCIgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgXSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1VixTQUFTLG9CQUFvQjtBQUVwWCxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUN4QixPQUFPO0FBQUEsRUFDUCxhQUFhO0FBQUEsRUFDYixNQUFNO0FBQUEsSUFDRixRQUFRO0FBQUEsTUFDSixNQUFNO0FBQUEsSUFDVjtBQUFBLEVBQ0o7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNMO0FBQUEsTUFDSSxNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsUUFDSCxFQUFFLE1BQU0sc0JBQXNCLE1BQU0sZ0JBQWdCO0FBQUEsUUFDcEQsRUFBRSxNQUFNLGdCQUFnQixNQUFNLGdCQUFnQjtBQUFBLE1BQ2xEO0FBQUEsSUFDSjtBQUFBLElBQ0E7QUFBQSxNQUNJLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxRQUNILEVBQUUsTUFBTSxnQkFBZ0IsTUFBTSxnQ0FBZ0M7QUFBQSxRQUM5RCxFQUFFLE1BQU0scUJBQXFCLE1BQU0sNkJBQTZCO0FBQUEsTUFDcEU7QUFBQSxJQUNKO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLFFBQ0gsRUFBRSxNQUFNLFlBQVksTUFBTSxzQkFBc0I7QUFBQSxRQUNoRCxFQUFFLE1BQU0sdUJBQXVCLE1BQU0sa0NBQWtDO0FBQUEsUUFDdkUsRUFBRSxNQUFNLGdCQUFnQixNQUFNLDJCQUEyQjtBQUFBLFFBQ3pELEVBQUUsTUFBTSxrQkFBa0IsTUFBTSw2QkFBNkI7QUFBQSxRQUM3RCxFQUFFLE1BQU0sZ0JBQWdCLE1BQU0sMkJBQTJCO0FBQUEsUUFDekQsRUFBRSxNQUFNLFlBQVksTUFBTSx1QkFBdUI7QUFBQSxRQUNqRCxFQUFFLE1BQU0sbUJBQW1CLE1BQU0saUJBQWlCO0FBQUEsUUFDbEQsRUFBRSxNQUFNLGNBQWMsTUFBTSx3QkFBd0I7QUFBQSxNQUN4RDtBQUFBLElBQ0o7QUFBQSxJQUNBO0FBQUEsTUFDSSxNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsUUFDSCxFQUFFLE1BQU0sa0JBQWtCLE1BQU0sa0JBQWtCO0FBQUEsUUFDbEQsRUFBRSxNQUFNLG1CQUFtQixNQUFNLGtCQUFrQjtBQUFBLE1BQ3ZEO0FBQUEsSUFDSjtBQUFBLElBQ0E7QUFBQSxNQUNJLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxRQUNILEVBQUUsTUFBTSxZQUFZLE1BQU0sZ0JBQWdCO0FBQUEsUUFDMUMsRUFBRSxNQUFNLGtCQUFrQixNQUFNLHNCQUFzQjtBQUFBLFFBQ3RELEVBQUUsTUFBTSxrQkFBa0IsTUFBTSxzQkFBc0I7QUFBQSxRQUN0RCxFQUFFLE1BQU0sYUFBYSxNQUFNLGlCQUFpQjtBQUFBLE1BQ2hEO0FBQUEsSUFDSjtBQUFBLElBQ0E7QUFBQSxNQUNJLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxRQUNILEVBQUUsTUFBTSxpQkFBaUIsTUFBTSxzQkFBc0I7QUFBQSxRQUNyRCxFQUFFLE1BQU0sZ0JBQWdCLE1BQU0seUJBQXlCO0FBQUEsTUFDM0Q7QUFBQSxJQUNKO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLFFBQ0gsRUFBRSxNQUFNLGtCQUFrQixNQUFNLHFCQUFxQjtBQUFBLFFBQ3JELEVBQUUsTUFBTSxtQkFBbUIsTUFBTSxtQkFBbUI7QUFBQSxNQUN4RDtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
