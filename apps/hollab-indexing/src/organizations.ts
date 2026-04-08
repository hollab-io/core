import { organizationFactoryAbi } from "@hollab-io/contracts/actions";
import { ponder } from "ponder:registry";
import schema from "ponder:schema";

import { upsertOrgSnapshot } from "./utils";

ponder.on("OrganizationFactory:OrganizationCreated", async ({ event, context }) => {
    const { _orgId } = event.args;
    const factoryAddress = event.log.address;

    // Read component addresses to populate registryIndex before the snapshot call
    const org = await context.client.readContract({
        abi: organizationFactoryAbi,
        address: factoryAddress,
        functionName: "getOrganization",
        args: [_orgId],
    });

    const zero = "0x0000000000000000000000000000000000000000" as `0x${string}`;
    // Register per-org clone addresses so RoleRegistry handlers can resolve orgId + factory.
    for (const addr of [org.circleRegistry, org.roleRegistry, org.governanceProcess] as const) {
        if (addr === zero) continue;
        await context.db
            .insert(schema.registryIndex)
            .values({ registryAddress: addr, orgId: _orgId, factoryAddress })
            .onConflictDoNothing();
    }

    // Full snapshot via DataProvider
    await upsertOrgSnapshot(context, factoryAddress, _orgId, event.block.timestamp);
});
