import { ponder } from "ponder:registry";
import schema from "ponder:schema";

ponder.on("CircleTreasury:Deposited", async ({ event, context }) => {
    const { _sender, _amount } = event.args;

    await context.db.insert(schema.treasuryDeposit).values({
        id: `${event.transaction.hash}-${event.log.logIndex}`,
        treasuryAddress: event.log.address,
        sender: _sender,
        token: null,
        amount: _amount,
        depositedAt: event.block.timestamp,
        txHash: event.transaction.hash,
    });
});

ponder.on("CircleTreasury:TokenDeposited", async ({ event, context }) => {
    const { _sender, _token, _amount } = event.args;

    await context.db.insert(schema.treasuryDeposit).values({
        id: `${event.transaction.hash}-${event.log.logIndex}`,
        treasuryAddress: event.log.address,
        sender: _sender,
        token: _token,
        amount: _amount,
        depositedAt: event.block.timestamp,
        txHash: event.transaction.hash,
    });
});
