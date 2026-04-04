import { ponder } from "ponder:registry";
import schema from "ponder:schema";

import { OrganizationFactoryAbi } from "../abis/OrganizationFactoryAbi";
import { upsertOrgSnapshot } from "./utils";

ponder.on("OrganizationFactory:OrganizationCreated", async ({ event, context }) => {
    const { _orgId } = event.args;
    const factoryAddress = event.log.address;

    // Read component addresses to populate registryIndex before the snapshot call
    const org = await context.client.readContract({
        abi: OrganizationFactoryAbi,
        address: factoryAddress,
        functionName: "getOrganization",
        args: [_orgId],
    });

    // Register all three clone addresses so structural event handlers can resolve
    // orgId + factoryAddress from just the contract address they receive.
    for (const addr of [org.circleRegistry, org.roleRegistry, org.governanceProcess] as const) {
        await context.db
            .insert(schema.registryIndex)
            .values({ registryAddress: addr, orgId: _orgId, factoryAddress })
            .onConflictDoNothing();
    }

    // Full snapshot via DataProvider
    await upsertOrgSnapshot(context, factoryAddress, _orgId, event.block.timestamp);
});
