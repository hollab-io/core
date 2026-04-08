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
    govComponentDeployerAbi,
    govTokenAbi,
    holGovernorAbi,
    holGovernorFactoryAbi,
    meetingComponentsFactoryAbi,
    meetingFactoryAbi,
    organizationFactoryAbi,
    roleRegistryAbi,
} from "@hollab-io/contracts/actions";
import { simulateContract, writeContract } from "viem/actions";

// Re-export ABIs so consumers of viem-extension don't need to depend on
// @hollab-io/contracts directly.
export {
    govComponentDeployerAbi,
    govTokenAbi,
    holGovernorAbi,
    holGovernorFactoryAbi,
    meetingComponentsFactoryAbi,
    meetingFactoryAbi,
    organizationFactoryAbi,
    roleRegistryAbi,
};

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
 * await client.organizationFactory.write({
 *   address: '0x...',
 *   functionName: 'addOrgMember',
 *   args: [orgId, member],
 * })
 */
export function holLabContractActions() {
    return (client: Client) => ({
        govComponentDeployer: makeContractActions(govComponentDeployerAbi)(client),
        govToken: makeContractActions(govTokenAbi)(client),
        holGovernor: makeContractActions(holGovernorAbi)(client),
        holGovernorFactory: makeContractActions(holGovernorFactoryAbi)(client),
        meetingFactory: makeContractActions(meetingFactoryAbi)(client),
        organizationFactory: makeContractActions(organizationFactoryAbi)(client),
        roleRegistry: makeContractActions(roleRegistryAbi)(client),
    });
}
