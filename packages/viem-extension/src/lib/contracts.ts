import type {
    Abi,
    Client,
    ContractFunctionName,
    SimulateContractParameters,
    SimulateContractReturnType,
    WriteContractParameters,
    WriteContractReturnType,
} from "viem";
import {
    circleRegistryAbi,
    circleTreasuryAbi,
    govComponentDeployerAbi,
    governanceProcessAbi,
    govTokenAbi,
    holGovernorAbi,
    holGovernorFactoryAbi,
    organizationFactoryAbi,
    roleRegistryAbi,
    treasuryDeployerAbi,
} from "@hollab-io/contracts/actions";
import { simulateContract, writeContract } from "viem/actions";

type WriteMutability = "nonpayable" | "payable";

function makeContractActions<const TAbi extends Abi>(abi: TAbi) {
    return (client: Client) => ({
        write<TFunctionName extends ContractFunctionName<TAbi, WriteMutability>>(
            params: Omit<WriteContractParameters<TAbi, TFunctionName>, "abi">,
        ): Promise<WriteContractReturnType> {
            return writeContract(client as any, { ...params, abi } as WriteContractParameters);
        },

        simulate<TFunctionName extends ContractFunctionName<TAbi, WriteMutability>>(
            params: Omit<SimulateContractParameters<TAbi, TFunctionName>, "abi">,
        ): Promise<SimulateContractReturnType<TAbi, TFunctionName>> {
            return simulateContract(
                client as any,
                { ...params, abi } as SimulateContractParameters,
            ) as unknown as Promise<SimulateContractReturnType<TAbi, TFunctionName>>;
        },
    });
}

/**
 * Viem client extension that adds typed write + simulate actions for all
 * HolLab contracts. The ABI is pre-bound; pass `address` and `functionName`
 * per call.
 *
 * @example
 * const client = createWalletClient({ ... }).extend(holLabContractActions())
 *
 * await client.circleRegistry.write({
 *   address: '0x...',
 *   functionName: 'addCircleLead',
 *   args: [circleId, leadAddress],
 * })
 *
 * const { result } = await client.circleRegistry.simulate({
 *   address: '0x...',
 *   functionName: 'createAnchorCircle',
 *   args: ['purpose'],
 * })
 */
export function holLabContractActions() {
    return (client: Client) => ({
        circleRegistry: makeContractActions(circleRegistryAbi)(client),
        circleTreasury: makeContractActions(circleTreasuryAbi)(client),
        govComponentDeployer: makeContractActions(govComponentDeployerAbi)(client),
        govToken: makeContractActions(govTokenAbi)(client),
        governanceProcess: makeContractActions(governanceProcessAbi)(client),
        holGovernor: makeContractActions(holGovernorAbi)(client),
        holGovernorFactory: makeContractActions(holGovernorFactoryAbi)(client),
        organizationFactory: makeContractActions(organizationFactoryAbi)(client),
        roleRegistry: makeContractActions(roleRegistryAbi)(client),
        treasuryDeployer: makeContractActions(treasuryDeployerAbi)(client),
    });
}
