import type { TacticalMeetingRecord, WorkspaceSnapshot } from "@hollab/viem-extension";
import type { PropsWithChildren } from "react";
import {
    createCircleMap,
    createPartnerMap,
    createRoleMap,
    getMockWorkspaceSnapshot,
} from "@hollab/viem-extension";
import { createContext, createElement, useCallback, useContext, useMemo, useState } from "react";

type WorkspaceContextValue = {
    activeMeeting: TacticalMeetingRecord | null;
    activeMeetingId: string | null;
    circleMap: ReturnType<typeof createCircleMap>;
    closeMeeting: () => void;
    meetingMap: Record<string, TacticalMeetingRecord>;
    openMeeting: (meetingId: string) => void;
    partnerMap: ReturnType<typeof createPartnerMap>;
    roleMap: ReturnType<typeof createRoleMap>;
    snapshot: WorkspaceSnapshot;
    toggleActionCompletion: (actionId: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: PropsWithChildren) {
    const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(() => getMockWorkspaceSnapshot());
    const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);

    const partnerMap = useMemo(() => createPartnerMap(snapshot), [snapshot]);
    const circleMap = useMemo(() => createCircleMap(snapshot), [snapshot]);
    const roleMap = useMemo(() => createRoleMap(snapshot), [snapshot]);
    const meetingMap = useMemo(
        () => Object.fromEntries(snapshot.meetings.map((meeting) => [meeting.id, meeting])),
        [snapshot.meetings],
    );
    const activeMeeting = activeMeetingId ? (meetingMap[activeMeetingId] ?? null) : null;

    const openMeeting = useCallback((meetingId: string) => {
        setActiveMeetingId(meetingId);
    }, []);

    const closeMeeting = useCallback(() => {
        setActiveMeetingId(null);
    }, []);

    const toggleActionCompletion = useCallback((actionId: string) => {
        setSnapshot((currentSnapshot) => ({
            ...currentSnapshot,
            actions: currentSnapshot.actions.map((action) => {
                if (action.id !== actionId) {
                    return action;
                }

                const completed = !action.completed;

                return {
                    ...action,
                    completed,
                    completedAt: completed ? new Date().toISOString() : undefined,
                };
            }),
        }));
    }, []);

    const contextValue = useMemo<WorkspaceContextValue>(
        () => ({
            activeMeeting,
            activeMeetingId,
            circleMap,
            closeMeeting,
            meetingMap,
            openMeeting,
            partnerMap,
            roleMap,
            snapshot,
            toggleActionCompletion,
        }),
        [
            activeMeeting,
            activeMeetingId,
            circleMap,
            closeMeeting,
            meetingMap,
            openMeeting,
            partnerMap,
            roleMap,
            snapshot,
            toggleActionCompletion,
        ],
    );

    return createElement(WorkspaceContext.Provider, { value: contextValue }, children);
}

export function useWorkspaceSnapshot() {
    const context = useContext(WorkspaceContext);

    if (!context) {
        throw new Error("useWorkspaceSnapshot must be used within a WorkspaceProvider");
    }

    return context;
}
