/**
 * useZgStorage — browser-side 0G Storage uploads.
 *
 * Uses the 0G SDK's MemData (for text) and ZgBlob (for File objects)
 * which work in the browser without filesystem access.
 *
 * Requires ethers BrowserProvider to bridge the wallet signer to the
 * 0G SDK's ethers-based upload API.
 */
import { Indexer, MemData } from "@0gfoundation/0g-ts-sdk";
import { useMutation } from "@tanstack/react-query";
import { BrowserProvider } from "ethers";

import { zgConfig } from "../config/zeroG";

async function getEthersSigner() {
    if (!window.ethereum) {
        throw new Error("No wallet provider found — connect a wallet first");
    }
    const provider = new BrowserProvider(window.ethereum);
    return provider.getSigner();
}

export type UploadResult = {
    /** 0G Merkle root hash — needed for retrieval */
    rootHash: string;
};

/**
 * Upload raw bytes to 0G Storage from the browser.
 * Handles Indexer init, signer bridging, merkle tree generation, and upload.
 */
async function uploadBytes(data: Uint8Array): Promise<UploadResult> {
    const signer = await getEthersSigner();
    const indexer = new Indexer(zgConfig.indexerRpc);

    const memData = new MemData(data);
    const [tree, treeErr] = await memData.merkleTree();
    if (treeErr !== null) {
        throw new Error(`Merkle tree generation failed: ${treeErr}`);
    }

    const rootHash = tree!.rootHash();

    const [, uploadErr] = await indexer.upload(memData, zgConfig.rpcUrl, signer);
    if (uploadErr) {
        throw new Error(`0G upload failed: ${(uploadErr as Error).message}`);
    }

    return { rootHash: rootHash! };
}

export function useZgStorage() {
    /** Upload a text string to 0G Storage */
    const uploadText = useMutation({
        mutationFn: async (text: string): Promise<UploadResult> => {
            const bytes = new TextEncoder().encode(text);
            return uploadBytes(bytes);
        },
    });

    /** Upload a File object to 0G Storage */
    const uploadFile = useMutation({
        mutationFn: async (file: File): Promise<UploadResult> => {
            const buffer = await file.arrayBuffer();
            return uploadBytes(new Uint8Array(buffer));
        },
    });

    return { uploadText, uploadFile };
}
