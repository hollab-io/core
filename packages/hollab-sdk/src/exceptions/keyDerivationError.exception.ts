import { HollabSdkError } from "./hollabSdkError.exception.js";

export class KeyDerivationError extends HollabSdkError {
    constructor(message: string) {
        super(message);
        this.name = "KeyDerivationError";
    }
}
