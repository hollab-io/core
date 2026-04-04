export class HollabSdkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "HollabSdkError";
    }
}
