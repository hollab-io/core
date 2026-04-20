import type {
    DatesSetArg,
    DayCellContentArg,
    DayHeaderContentArg,
    EventContentArg,
    EventInput,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import {
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    HelpCircle,
    Plus,
    Search,
    Settings,
} from "lucide-react";
import { useDeferredValue, useMemo, useRef, useState } from "react";

import { showToast } from "../components/ToastHost";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

type MeetingRecord = {
    id: string;
    title: string;
    start: string;
    end: string;
    location: string;
    room: string;
    host: string;
    attendees: string[];
    category: string;
    accent: string;
    allDay?: boolean;
};

type CalendarViewType = "dayGridMonth" | "timeGridWeek" | "listWeek";

type CalendarViewProps = {
    isDarkMode: boolean;
};

type CalendarMeta = {
    focusedDate: Date;
    title: string;
    viewType: CalendarViewType;
};

type MiniMonthDay = {
    key: string;
    date: Date;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
};

const VIEW_OPTIONS: Array<{ id: CalendarViewType; label: string }> = [
    { id: "dayGridMonth", label: "Month" },
    { id: "timeGridWeek", label: "Week" },
    { id: "listWeek", label: "Schedule" },
];

const miniMonthWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "narrow",
});

const miniMonthTitleFormatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
});

const monthHeaderFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
});

const weekHeaderFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
});

function buildCalendarGroups(categories: string[]) {
    const primaryCategories = new Set(["Leadership", "Product", "Operations", "Company"]);
    const primary = categories.filter((category) => primaryCategories.has(category));
    const secondary = categories.filter((category) => !primaryCategories.has(category));

    return [
        { title: "My calendars", categories: primary },
        { title: "Other calendars", categories: secondary },
    ].filter((group) => group.categories.length > 0);
}

function isSameDay(leftDate: Date, rightDate: Date) {
    return (
        leftDate.getFullYear() === rightDate.getFullYear() &&
        leftDate.getMonth() === rightDate.getMonth() &&
        leftDate.getDate() === rightDate.getDate()
    );
}

function parseMeetingDate(value: string, isAllDay?: boolean) {
    if (isAllDay) {
        return new Date(`${value}T12:00:00`);
    }

    return new Date(value);
}

function buildMiniMonthDays(anchorDate: Date, selectedDate: Date): MiniMonthDay[] {
    const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthStart.getDay());

    return Array.from({ length: 42 }, (_, index) => {
        const currentDate = new Date(gridStart);
        currentDate.setDate(gridStart.getDate() + index);

        return {
            key: currentDate.toISOString(),
            date: currentDate,
            dayNumber: currentDate.getDate(),
            isCurrentMonth: currentDate.getMonth() === monthStart.getMonth(),
            isToday: isSameDay(currentDate, new Date()),
            isSelected: isSameDay(currentDate, selectedDate),
        };
    });
}

function formatMeetingTime(meeting: MeetingRecord) {
    if (meeting.allDay) {
        return "All day";
    }

    return `${timeFormatter.format(parseMeetingDate(meeting.start))} - ${timeFormatter.format(
        parseMeetingDate(meeting.end),
    )}`;
}

function matchesSearch(meeting: MeetingRecord, query: string) {
    if (!query) {
        return true;
    }

    const haystack = [
        meeting.title,
        meeting.location,
        meeting.room,
        meeting.host,
        meeting.category,
        ...meeting.attendees,
    ]
        .join(" ")
        .toLowerCase();

    return haystack.includes(query);
}

function renderCalendarEventContent(eventInfo: EventContentArg) {
    if (eventInfo.view.type === "dayGridMonth") {
        return (
            <div className="fc-event-chip fc-event-chip--month">
                <span
                    className="fc-event-chip__dot"
                    style={{ backgroundColor: eventInfo.backgroundColor ?? "#8AB4F8" }}
                />
                <span className="fc-event-chip__title">{eventInfo.event.title}</span>
            </div>
        );
    }

    return (
        <div className="fc-event-chip">
            {!eventInfo.event.allDay && (
                <span className="fc-event-chip__time">{eventInfo.timeText}</span>
            )}
            <span className="fc-event-chip__title">{eventInfo.event.title}</span>
        </div>
    );
}

function renderDayCellContent(dayCellInfo: DayCellContentArg) {
    if (dayCellInfo.view.type !== "dayGridMonth") {
        return <span>{dayCellInfo.dayNumberText}</span>;
    }

    return (
        <div className="calendar-month-cell">
            <span
                className={`calendar-month-cell__number ${
                    dayCellInfo.isToday
                        ? "calendar-month-cell__number--today"
                        : dayCellInfo.isOther
                          ? "calendar-month-cell__number--other"
                          : ""
                }`}
            >
                {dayCellInfo.date.getDate()}
            </span>
        </div>
    );
}

function renderDayHeaderContent(dayHeaderInfo: DayHeaderContentArg) {
    if (dayHeaderInfo.view.type === "timeGridWeek") {
        return (
            <div className="calendar-week-header">
                <span className="calendar-week-header__label">
                    {weekHeaderFormatter.format(dayHeaderInfo.date).toUpperCase()}
                </span>
                <span
                    className={`calendar-week-header__number ${
                        dayHeaderInfo.isToday ? "calendar-week-header__number--today" : ""
                    }`}
                >
                    {dayHeaderInfo.date.getDate()}
                </span>
            </div>
        );
    }

    return (
        <span className="calendar-month-header">
            {monthHeaderFormatter.format(dayHeaderInfo.date).toUpperCase()}
        </span>
    );
}

export default function CalendarView({ isDarkMode }: CalendarViewProps) {
    const { snapshot, partnerMap, activeMeetingId, openMeeting } = useWorkspaceSnapshot();
    const calendarReference = useRef<FullCalendar | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const meetings = useMemo<MeetingRecord[]>(
        () =>
            snapshot.meetings.map((meeting) => ({
                id: meeting.id,
                title: meeting.title,
                start: meeting.start,
                end: meeting.end,
                location: meeting.location,
                room: meeting.room,
                host: partnerMap[meeting.hostId]?.name ?? "Workspace",
                attendees: meeting.participantIds.map(
                    (participantId) => partnerMap[participantId]?.name ?? participantId,
                ),
                category: meeting.category,
                accent: meeting.accent,
                allDay: meeting.allDay,
            })),
        [partnerMap, snapshot.meetings],
    );
    const [calendarMeta, setCalendarMeta] = useState<CalendarMeta>({
        focusedDate: new Date(),
        title: miniMonthTitleFormatter.format(new Date()),
        viewType: "timeGridWeek",
    });
    const categories = useMemo(
        () => Array.from(new Set(meetings.map((meeting) => meeting.category))),
        [meetings],
    );
    const [enabledCategories, setEnabledCategories] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(
            Array.from(new Set(snapshot.meetings.map((meeting) => meeting.category))).map(
                (category) => [category, true],
            ),
        ),
    );

    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
    const visibleMeetings = meetings.filter(
        (meeting) =>
            enabledCategories[meeting.category] !== false &&
            matchesSearch(meeting, normalizedQuery),
    );

    const upcomingMeetings = visibleMeetings
        .filter((meeting) => parseMeetingDate(meeting.end, meeting.allDay) >= new Date())
        .sort(
            (leftMeeting, rightMeeting) =>
                parseMeetingDate(leftMeeting.start, leftMeeting.allDay).getTime() -
                parseMeetingDate(rightMeeting.start, rightMeeting.allDay).getTime(),
        );

    const highlightedMeetingId = activeMeetingId ?? upcomingMeetings[0]?.id ?? null;

    const calendarEvents: EventInput[] = visibleMeetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        start: meeting.start,
        end: meeting.end,
        allDay: meeting.allDay,
        backgroundColor: meeting.accent,
        borderColor: meeting.accent,
        textColor: meeting.allDay ? "#1f1f1f" : isDarkMode ? "#e8eaed" : "#0f172a",
    }));

    const miniMonthDays = buildMiniMonthDays(calendarMeta.focusedDate, calendarMeta.focusedDate);
    const miniMonthTitle = miniMonthTitleFormatter.format(calendarMeta.focusedDate);
    const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
        const baseDate = new Date(2024, 0, 7 + index);
        return miniMonthWeekdayFormatter.format(baseDate).toUpperCase();
    });

    const categoryAccents = Object.fromEntries(
        meetings.map((meeting) => [meeting.category, meeting.accent]),
    );
    const calendarGroups = useMemo(() => buildCalendarGroups(categories), [categories]);
    const calendarTheme = isDarkMode
        ? {
              shell: "bg-[#202124] text-[#e8eaed]",
              sidebar: "border-[#3c4043] bg-[#1f1f1f]",
              createButton: "bg-[#3c4043] text-[#e8eaed] transition-colors hover:bg-[#4a4d52]",
              title: "text-[#e8eaed]",
              muted: "text-[#9aa0a6]",
              miniMonthSelected: "bg-[#8ab4f8] font-semibold text-[#202124]",
              miniMonthToday: "border border-[#8ab4f8] text-[#8ab4f8]",
              miniMonthCurrent: "text-[#e8eaed] hover:bg-[#2b2c2f]",
              miniMonthOther: "text-[#5f6368] hover:bg-[#2b2c2f]",
              categoryButton: "text-[#e8eaed] hover:bg-[#2b2c2f]",
              checkboxBorder: "border-[#5f6368]",
              checkboxMark: "text-[#202124]",
              upcomingActive: "border-[#8ab4f8] bg-[#2b3646]",
              upcomingCard: "border-[#3c4043] bg-[#282a2d] hover:bg-[#2f3135]",
              emptyCard: "border-[#3c4043] text-[#9aa0a6]",
              tacticalCard:
                  "border-blue-400/20 bg-[linear-gradient(180deg,rgba(66,133,244,0.18),rgba(22,29,42,0.96))]",
              tacticalEyebrow: "text-blue-100",
              tacticalTitle: "text-white",
              tacticalText: "text-blue-50/80",
              tacticalButton: "bg-white text-[#1f1f1f] hover:bg-blue-50",
              mainPanel: "bg-[#202124]",
              headerBorder: "border-[#3c4043]",
              iconBox: "bg-[#2b2c2f] text-[#8ab4f8]",
              todayButton: "border-[#5f6368] text-[#e8eaed] hover:bg-[#2b2c2f]",
              navBorder: "border-[#5f6368]",
              searchIcon: "text-[#9aa0a6]",
              searchInput:
                  "border-[#3c4043] bg-[#2b2c2f] text-[#e8eaed] placeholder:text-[#9aa0a6] focus:border-[#8ab4f8]",
              viewSwitch: "border-[#5f6368] bg-[#2b2c2f]",
              viewActive: "bg-[#8ab4f8] text-[#202124]",
              viewInactive: "text-[#e8eaed] hover:bg-[#35363a]",
          }
        : {
              shell: "bg-white text-slate-900",
              sidebar: "border-slate-200 bg-[#F8FAFD]",
              createButton:
                  "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50",
              title: "text-slate-900",
              muted: "text-slate-500",
              miniMonthSelected: "bg-[#3481FF] font-semibold text-white",
              miniMonthToday: "border border-[#3481FF] text-[#3481FF]",
              miniMonthCurrent: "text-slate-700 hover:bg-[#EDF4FF]",
              miniMonthOther: "text-slate-400 hover:bg-slate-100",
              categoryButton: "text-slate-700 hover:bg-[#EDF4FF]",
              checkboxBorder: "border-slate-300",
              checkboxMark: "text-white",
              upcomingActive: "border-[#93BBFF] bg-[#EDF4FF]",
              upcomingCard: "border-slate-200 bg-white hover:bg-slate-50",
              emptyCard: "border-slate-300 text-slate-500",
              tacticalCard: "border-[#DCE7FF] bg-[linear-gradient(180deg,#F6FAFF,#EEF5FF)]",
              tacticalEyebrow: "text-[#3481FF]",
              tacticalTitle: "text-slate-900",
              tacticalText: "text-slate-600",
              tacticalButton: "bg-[#3481FF] text-white hover:bg-blue-600",
              mainPanel: "bg-white",
              headerBorder: "border-slate-200",
              iconBox: "bg-[#EDF4FF] text-[#3481FF]",
              todayButton: "border-slate-300 text-slate-700 hover:bg-slate-50",
              navBorder: "border-slate-300",
              searchIcon: "text-slate-400",
              searchInput:
                  "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#3481FF]",
              viewSwitch: "border-slate-200 bg-white",
              viewActive: "bg-[#3481FF] text-white",
              viewInactive: "text-slate-600 hover:bg-slate-50",
          };

    const handleDatesSet = (datesInfo: DatesSetArg) => {
        const calendarApi = calendarReference.current?.getApi();
        const focusedDate = calendarApi?.getDate() ?? new Date(datesInfo.start);

        setCalendarMeta({
            focusedDate,
            title: datesInfo.view.title,
            viewType: datesInfo.view.type as CalendarViewType,
        });
    };

    const handleNavigate = (direction: "prev" | "next") => {
        const calendarApi = calendarReference.current?.getApi();

        if (!calendarApi) {
            return;
        }

        if (direction === "prev") {
            calendarApi.prev();
            return;
        }

        calendarApi.next();
    };

    const handleToday = () => {
        calendarReference.current?.getApi().today();
    };

    const handleViewChange = (viewType: CalendarViewType) => {
        calendarReference.current?.getApi().changeView(viewType);
    };

    const handleMiniMonthNavigation = (direction: "prev" | "next") => {
        const nextAnchorDate = new Date(calendarMeta.focusedDate);
        nextAnchorDate.setMonth(nextAnchorDate.getMonth() + (direction === "prev" ? -1 : 1));
        calendarReference.current?.getApi().gotoDate(nextAnchorDate);
    };

    const handleMiniMonthSelect = (date: Date) => {
        calendarReference.current?.getApi().gotoDate(date);
    };

    const handleMeetingFocus = (meeting: MeetingRecord) => {
        openMeeting(meeting.id);
        calendarReference.current
            ?.getApi()
            .gotoDate(parseMeetingDate(meeting.start, meeting.allDay));
    };

    const toggleCategory = (category: string) => {
        setEnabledCategories((currentCategories) => ({
            ...currentCategories,
            [category]: !currentCategories[category],
        }));
    };

    return (
        <section
            className={`calendar-google-shell calendar-theme--${
                isDarkMode ? "dark" : "light"
            } h-full min-h-0 ${calendarTheme.shell}`}
        >
            <div className="flex h-full min-h-0">
                <aside
                    className={`calendar-google-sidebar custom-scrollbar hidden w-[320px] shrink-0 overflow-y-auto border-r px-3 py-4 lg:block ${calendarTheme.sidebar}`}
                >
                    <button
                        type="button"
                        onClick={() => showToast("Event scheduling coming soon")}
                        className={`inline-flex h-12 items-center gap-3 rounded-2xl px-5 text-[15px] font-medium ${calendarTheme.createButton}`}
                        aria-label="Create event"
                    >
                        <Plus size={20} aria-hidden="true" />
                        <span>Create</span>
                        <ChevronDown size={16} aria-hidden="true" />
                    </button>

                    <div className="mt-6 px-2">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className={`text-[22px] font-medium ${calendarTheme.title}`}>
                                {miniMonthTitle}
                            </h2>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => handleMiniMonthNavigation("prev")}
                                    className="calendar-google-icon-button"
                                    aria-label="Show previous month"
                                >
                                    <ChevronLeft size={16} aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleMiniMonthNavigation("next")}
                                    className="calendar-google-icon-button"
                                    aria-label="Show next month"
                                >
                                    <ChevronRight size={16} aria-hidden="true" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-y-2 text-center">
                            {weekdayLabels.map((label) => (
                                <span
                                    key={label}
                                    className={`text-[11px] font-medium uppercase ${calendarTheme.muted}`}
                                >
                                    {label}
                                </span>
                            ))}
                            {miniMonthDays.map((day) => (
                                <button
                                    key={day.key}
                                    type="button"
                                    onClick={() => handleMiniMonthSelect(day.date)}
                                    className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors ${
                                        day.isSelected
                                            ? calendarTheme.miniMonthSelected
                                            : day.isToday
                                              ? calendarTheme.miniMonthToday
                                              : day.isCurrentMonth
                                                ? calendarTheme.miniMonthCurrent
                                                : calendarTheme.miniMonthOther
                                    }`}
                                    aria-label={`Go to ${shortDateFormatter.format(day.date)}`}
                                >
                                    {day.dayNumber}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-7 space-y-6 px-2">
                        {calendarGroups.map((group) => (
                            <section key={group.title}>
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className={`text-sm font-medium ${calendarTheme.title}`}>
                                        {group.title}
                                    </h3>
                                    <button
                                        type="button"
                                        className="calendar-google-icon-button h-7 w-7"
                                        aria-label={`Add ${group.title.toLowerCase()}`}
                                    >
                                        <Plus size={14} aria-hidden="true" />
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    {group.categories.map((category) => {
                                        const isEnabled = enabledCategories[category] !== false;

                                        return (
                                            <button
                                                key={category}
                                                type="button"
                                                onClick={() => toggleCategory(category)}
                                                className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors ${calendarTheme.categoryButton}`}
                                            >
                                                <span
                                                    className={`flex h-4 w-4 items-center justify-center rounded-[4px] border ${
                                                        isEnabled
                                                            ? "border-transparent"
                                                            : calendarTheme.checkboxBorder
                                                    }`}
                                                    style={{
                                                        backgroundColor: isEnabled
                                                            ? (categoryAccents[category] ??
                                                              "#8AB4F8")
                                                            : "transparent",
                                                    }}
                                                >
                                                    {isEnabled && (
                                                        <span
                                                            className={`text-[10px] font-bold ${calendarTheme.checkboxMark}`}
                                                        >
                                                            ✓
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="truncate">{category}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}

                        <section>
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className={`text-sm font-medium ${calendarTheme.title}`}>
                                    Upcoming
                                </h3>
                                <span className={`text-xs ${calendarTheme.muted}`}>
                                    {upcomingMeetings.length}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {upcomingMeetings.length > 0 ? (
                                    upcomingMeetings.slice(0, 5).map((meeting) => (
                                        <button
                                            key={meeting.id}
                                            type="button"
                                            onClick={() => handleMeetingFocus(meeting)}
                                            className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                                                meeting.id === highlightedMeetingId
                                                    ? calendarTheme.upcomingActive
                                                    : calendarTheme.upcomingCard
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span
                                                    className="mt-1 h-2.5 w-2.5 rounded-full"
                                                    style={{ backgroundColor: meeting.accent }}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div
                                                        className={`truncate text-sm font-medium ${calendarTheme.title}`}
                                                    >
                                                        {meeting.title}
                                                    </div>
                                                    <div
                                                        className={`mt-1 text-xs ${calendarTheme.muted}`}
                                                    >
                                                        {shortDateFormatter.format(
                                                            parseMeetingDate(
                                                                meeting.start,
                                                                meeting.allDay,
                                                            ),
                                                        )}{" "}
                                                        · {formatMeetingTime(meeting)}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div
                                        className={`rounded-2xl border border-dashed px-3 py-4 text-sm ${calendarTheme.emptyCard}`}
                                    >
                                        No meetings match the current filters.
                                    </div>
                                )}
                            </div>

                            <div
                                className={`mt-4 rounded-[26px] border p-4 ${calendarTheme.tacticalCard}`}
                            >
                                <div
                                    className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${calendarTheme.tacticalEyebrow}`}
                                >
                                    Tactical workflow
                                </div>
                                <h4
                                    className={`mt-2 text-lg font-semibold ${calendarTheme.tacticalTitle}`}
                                >
                                    Open the live meeting room
                                </h4>
                                <p
                                    className={`mt-2 text-sm leading-6 ${calendarTheme.tacticalText}`}
                                >
                                    Run the full facilitation flow, review agenda, and push outputs
                                    straight into actions and projects.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const tacticalMeeting = upcomingMeetings.find(
                                            (meeting) => meeting.category === "Operations",
                                        );

                                        if (tacticalMeeting) {
                                            handleMeetingFocus(tacticalMeeting);
                                        }
                                    }}
                                    className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${calendarTheme.tacticalButton}`}
                                >
                                    Open tactical room
                                </button>
                            </div>
                        </section>
                    </div>
                </aside>

                <div className={`flex min-w-0 flex-1 flex-col ${calendarTheme.mainPanel}`}>
                    <header
                        className={`flex min-h-16 flex-wrap items-center gap-3 border-b px-4 py-3 lg:px-6 ${calendarTheme.headerBorder}`}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={`flex h-10 w-10 items-center justify-center rounded-xl ${calendarTheme.iconBox}`}
                            >
                                <CalendarDays size={20} aria-hidden="true" />
                            </div>
                            <h1
                                className={`text-[1.7rem] font-normal tracking-[-0.02em] ${calendarTheme.title}`}
                            >
                                Calendar
                            </h1>
                        </div>

                        <button
                            type="button"
                            onClick={handleToday}
                            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${calendarTheme.todayButton}`}
                        >
                            Today
                        </button>

                        <div
                            className={`flex overflow-hidden rounded-full border ${calendarTheme.navBorder}`}
                        >
                            <button
                                type="button"
                                onClick={() => handleNavigate("prev")}
                                className="calendar-google-nav-button"
                                aria-label="Previous period"
                            >
                                <ChevronLeft size={18} aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleNavigate("next")}
                                className="calendar-google-nav-button"
                                aria-label="Next period"
                            >
                                <ChevronRight size={18} aria-hidden="true" />
                            </button>
                        </div>

                        <div
                            className={`min-w-0 text-[1.85rem] font-normal tracking-[-0.03em] ${calendarTheme.title}`}
                        >
                            {calendarMeta.title}
                        </div>

                        <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-3 xl:w-auto">
                            <label className="relative min-w-[220px] flex-1 xl:w-[280px] xl:flex-none">
                                <span
                                    className={`pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 ${calendarTheme.searchIcon}`}
                                >
                                    <Search size={16} aria-hidden="true" />
                                </span>
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Search meetings"
                                    className={`h-11 w-full rounded-full border pl-10 pr-4 text-sm outline-none transition-colors ${calendarTheme.searchInput}`}
                                />
                            </label>

                            <button
                                type="button"
                                onClick={() => showToast("Help center coming soon")}
                                className="calendar-google-icon-button"
                                aria-label="Open help"
                            >
                                <HelpCircle size={18} aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={() => showToast("Calendar settings coming soon")}
                                className="calendar-google-icon-button"
                                aria-label="Open calendar settings"
                            >
                                <Settings size={18} aria-hidden="true" />
                            </button>

                            <div
                                className={`inline-flex overflow-hidden rounded-full border ${calendarTheme.viewSwitch}`}
                            >
                                {VIEW_OPTIONS.map((viewOption) => {
                                    const isActive = calendarMeta.viewType === viewOption.id;

                                    return (
                                        <button
                                            key={viewOption.id}
                                            type="button"
                                            onClick={() => handleViewChange(viewOption.id)}
                                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                                                isActive
                                                    ? calendarTheme.viewActive
                                                    : calendarTheme.viewInactive
                                            }`}
                                            aria-pressed={isActive}
                                        >
                                            {viewOption.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </header>

                    <div className="calendar-shell calendar-shell--google min-h-0 flex-1 px-3 pb-3 pt-2 lg:px-4 lg:pb-4">
                        <FullCalendar
                            ref={calendarReference}
                            plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                            initialView="timeGridWeek"
                            headerToolbar={false}
                            titleFormat={{ month: "long", year: "numeric" }}
                            dayHeaderContent={renderDayHeaderContent}
                            dayCellContent={renderDayCellContent}
                            datesSet={handleDatesSet}
                            events={calendarEvents}
                            eventClick={(clickInfo) => openMeeting(clickInfo.event.id)}
                            eventContent={renderCalendarEventContent}
                            dayMaxEvents={3}
                            nowIndicator
                            height="100%"
                            firstDay={0}
                            allDaySlot
                            slotMinTime="00:00:00"
                            slotMaxTime="24:00:00"
                            slotDuration="01:00:00"
                            scrollTime="07:00:00"
                            slotLabelFormat={{
                                hour: "numeric",
                                meridiem: "short",
                            }}
                            listDayFormat={{
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                            }}
                            listDaySideFormat={false}
                            expandRows
                            fixedWeekCount={false}
                            stickyHeaderDates
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
