export const DEFAULT_PROJECT_BOARD_CIRCLE_ID = "people";

export const CIRCLE_PROJECT_ACCENT_TOKENS: Record<string, string> = {
    growth: "bg-cyan-500",
    leadership: "bg-blue-500",
    people: "bg-sky-500",
    product: "bg-indigo-500",
};

export function getProjectAccentToken(circleId: string) {
    return CIRCLE_PROJECT_ACCENT_TOKENS[circleId] ?? "bg-blue-500";
}
