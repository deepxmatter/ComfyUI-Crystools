export declare enum EStatus {
    executing = "Executing",
    executed = "Executed",
    execution_error = "Execution error"
}
export declare enum NewMenuOptions {
    'Disabled' = "Disabled",
    'Top' = "Top",
    'Bottom' = "Bottom"
}
export declare abstract class ProgressBarUIBase {
    parentId: string;
    rootId: string;
    htmlRoot: HTMLElement | null;
    htmlContainer: HTMLDivElement;
    protected htmlClassMonitor: string;
    protected constructor(parentId: string, rootId: string);
    private createRoot;
    abstract createDOM(): void;
}
