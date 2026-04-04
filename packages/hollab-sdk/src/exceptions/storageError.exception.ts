import { HollabSdkError } from "./hollabSdkError.exception.js";

export class StorageError extends HollabSdkError {
    constructor(message: string) {
        super(message);
        this.name = "StorageError";
    }
}
