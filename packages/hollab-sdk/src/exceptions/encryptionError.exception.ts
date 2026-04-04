import { HollabSdkError } from "./hollabSdkError.exception.js";

export class EncryptionError extends HollabSdkError {
    constructor(message: string) {
        super(message);
        this.name = "EncryptionError";
    }
}
