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
import { useDeferredValue, useRef, useState } from "react";

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
    searchQuery: string;
    setSearchQuery: (query: string) => void;
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

const CALENDAR_GROUPS = [
    {
        title: "My calendars",
        categories: ["Leadership", "Product", "Operations", "Company"],
    },
    {
        title: "Other calendars",
        categories: ["Research", "Growth", "Hiring", "People", "Holidays"],
    },
] as const;

const VIEW_OPTIONS: Array<{ id: CalendarViewType; label: string }> = [
    { id: "dayGridMonth", label: "Month" },
    { id: "timeGridWeek", label: "Week" },
    { id: "listWeek", label: "Schedule" },
];

function formatDateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate(),
    ).padStart(2, "0")}`;
}

function buildMeetingDate(
    dayOffset: number,
    hour: number,
    minute: number,
    durationMinutes: number,
) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(hour, minute, 0, 0);

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + durationMinutes);

    return {
        start: start.toISOString(),
        end: end.toISOString(),
    };
}

function buildAllDayDate(dayOffset: number, durationDays = 1) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + dayOffset);

    const end = new Date(start);
    end.setDate(end.getDate() + durationDays);

    return {
        start: formatDateKey(start),
        end: formatDateKey(end),
        allDay: true as const,
    };
}

const MEETINGS: MeetingRecord[] = [
    {
        id: "weekly-leadership-sync",
        title: "Leadership Weekly Sync",
        ...buildMeetingDate(0, 9, 30, 60),
        location: "Prague HQ",
        room: "Blue Room",
        host: "Elena",
        attendees: ["Elena", "Marcus", "Nina", "Paul"],
        category: "Leadership",
        accent: "#8AB4F8",
    },
    {
        id: "product-roadmap-review",
        title: "Product Roadmap Review",
        ...buildMeetingDate(0, 13, 0, 90),
        location: "Google Meet",
        room: "meet.google.com/roadmap",
        host: "Ava",
        attendees: ["Ava", "Felix", "Jon", "Marta", "Tom"],
        category: "Product",
        accent: "#7BAAF7",
    },
    {
        id: "customer-research-debrief",
        title: "Customer Research Debrief",
        ...buildMeetingDate(1, 11, 0, 45),
        location: "Google Meet",
        room: "meet.google.com/customer-lab",
        host: "Sarah",
        attendees: ["Sarah", "Bob", "Mila"],
        category: "Research",
        accent: "#5E97F6",
    },
    {
        id: "easter-monday",
        title: "Easter Monday",
        ...buildAllDayDate(2),
        location: "Czech Republic",
        room: "Public holiday",
        host: "Workspace",
        attendees: ["All employees"],
        category: "Holidays",
        accent: "#81C995",
    },
    {
        id: "okr-check-in",
        title: "OKR Check-in",
        ...buildMeetingDate(2, 10, 0, 60),
        location: "Prague HQ",
        room: "Strategy Lab",
        host: "John",
        attendees: ["John", "Paul", "Maria", "Anna"],
        category: "Operations",
        accent: "#669DF6",
    },
    {
        id: "hiring-panel",
        title: "Design Hiring Panel",
        ...buildMeetingDate(2, 15, 30, 75),
        location: "Zoom",
        room: "zoom.us/j/design-panel",
        host: "Clara",
        attendees: ["Clara", "Nina", "Felix"],
        category: "Hiring",
        accent: "#AECBFA",
    },
    {
        id: "all-hands",
        title: "Company All-hands",
        ...buildMeetingDate(3, 16, 0, 60),
        location: "Town Hall",
        room: "Main Stage",
        host: "CEO",
        attendees: ["All employees"],
        category: "Company",
        accent: "#4285F4",
    },
    {
        id: "growth-retro",
        title: "Growth Retro",
        ...buildMeetingDate(4, 14, 0, 45),
        location: "Google Meet",
        room: "meet.google.com/growth-retro",
        host: "Paul",
        attendees: ["Paul", "Sarah", "Alice"],
        category: "Growth",
        accent: "#669DF6",
    },
    {
        id: "one-on-one",
        title: "1:1 with Felix",
        ...buildMeetingDate(5, 12, 30, 30),
        location: "Prague HQ",
        room: "Focus Room 2",
        host: "Elena",
        attendees: ["Elena", "Felix"],
        category: "People",
        accent: "#8AB4F8",
    },
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

export default function CalendarView({ searchQuery, setSearchQuery }: CalendarViewProps) {
    const calendarReference = useRef<FullCalendar | null>(null);
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
    const [calendarMeta, setCalendarMeta] = useState<CalendarMeta>({
        focusedDate: new Date(),
        title: miniMonthTitleFormatter.format(new Date()),
        viewType: "timeGridWeek",
    });
    const [enabledCategories, setEnabledCategories] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(
            Array.from(new Set(MEETINGS.map((meeting) => meeting.category))).map((category) => [
                category,
                true,
            ]),
        ),
    );

    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
    const visibleMeetings = MEETINGS.filter(
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

    const activeMeetingId =
        upcomingMeetings.find((meeting) => meeting.id === selectedMeetingId)?.id ??
        upcomingMeetings[0]?.id ??
        null;

    const calendarEvents: EventInput[] = visibleMeetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        start: meeting.start,
        end: meeting.end,
        allDay: meeting.allDay,
        backgroundColor: meeting.accent,
        borderColor: meeting.accent,
        textColor: meeting.allDay ? "#1f1f1f" : "#e8eaed",
    }));

    const miniMonthDays = buildMiniMonthDays(calendarMeta.focusedDate, calendarMeta.focusedDate);
    const miniMonthTitle = miniMonthTitleFormatter.format(calendarMeta.focusedDate);
    const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
        const baseDate = new Date(2024, 0, 7 + index);
        return miniMonthWeekdayFormatter.format(baseDate).toUpperCase();
    });

    const categoryAccents = Object.fromEntries(
        MEETINGS.map((meeting) => [meeting.category, meeting.accent]),
    );

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
        setSelectedMeetingId(meeting.id);
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
        <section className="calendar-google-shell h-full min-h-0 bg-[#202124] text-[#e8eaed]">
            <div className="flex h-full min-h-0">
                <aside className="calendar-google-sidebar custom-scrollbar hidden w-[320px] shrink-0 overflow-y-auto border-r border-[#3c4043] bg-[#1f1f1f] px-3 py-4 lg:block">
                    <button
                        type="button"
                        className="inline-flex h-12 items-center gap-3 rounded-2xl bg-[#3c4043] px-5 text-[15px] font-medium text-[#e8eaed] transition-colors hover:bg-[#4a4d52]"
                        aria-label="Create event"
                    >
                        <Plus size={20} aria-hidden="true" />
                        <span>Create</span>
                        <ChevronDown size={16} aria-hidden="true" />
                    </button>

                    <div className="mt-6 px-2">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-[22px] font-medium text-[#e8eaed]">
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
                                    className="text-[11px] font-medium uppercase text-[#9aa0a6]"
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
                                            ? "bg-[#8ab4f8] font-semibold text-[#202124]"
                                            : day.isToday
                                              ? "border border-[#8ab4f8] text-[#8ab4f8]"
                                              : day.isCurrentMonth
                                                ? "text-[#e8eaed] hover:bg-[#2b2c2f]"
                                                : "text-[#5f6368] hover:bg-[#2b2c2f]"
                                    }`}
                                    aria-label={`Go to ${shortDateFormatter.format(day.date)}`}
                                >
                                    {day.dayNumber}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-7 space-y-6 px-2">
                        {CALENDAR_GROUPS.map((group) => (
                            <section key={group.title}>
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-[#e8eaed]">
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
                                                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm text-[#e8eaed] transition-colors hover:bg-[#2b2c2f]"
                                            >
                                                <span
                                                    className={`flex h-4 w-4 items-center justify-center rounded-[4px] border ${
                                                        isEnabled
                                                            ? "border-transparent"
                                                            : "border-[#5f6368]"
                                                    }`}
                                                    style={{
                                                        backgroundColor: isEnabled
                                                            ? (categoryAccents[category] ??
                                                              "#8AB4F8")
                                                            : "transparent",
                                                    }}
                                                >
                                                    {isEnabled && (
                                                        <span className="text-[10px] font-bold text-[#202124]">
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
                                <h3 className="text-sm font-medium text-[#e8eaed]">Upcoming</h3>
                                <span className="text-xs text-[#9aa0a6]">
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
                                                meeting.id === activeMeetingId
                                                    ? "border-[#8ab4f8] bg-[#2b3646]"
                                                    : "border-[#3c4043] bg-[#282a2d] hover:bg-[#2f3135]"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span
                                                    className="mt-1 h-2.5 w-2.5 rounded-full"
                                                    style={{ backgroundColor: meeting.accent }}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-medium text-[#e8eaed]">
                                                        {meeting.title}
                                                    </div>
                                                    <div className="mt-1 text-xs text-[#9aa0a6]">
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
                                    <div className="rounded-2xl border border-dashed border-[#3c4043] px-3 py-4 text-sm text-[#9aa0a6]">
                                        No meetings match the current filters.
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col bg-[#202124]">
                    <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-[#3c4043] px-4 py-3 lg:px-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2b2c2f] text-[#8ab4f8]">
                                <CalendarDays size={20} aria-hidden="true" />
                            </div>
                            <h1 className="text-[1.7rem] font-normal tracking-[-0.02em] text-[#e8eaed]">
                                Calendar
                            </h1>
                        </div>

                        <button
                            type="button"
                            onClick={handleToday}
                            className="rounded-full border border-[#5f6368] px-4 py-2 text-sm font-medium text-[#e8eaed] transition-colors hover:bg-[#2b2c2f]"
                        >
                            Today
                        </button>

                        <div className="flex overflow-hidden rounded-full border border-[#5f6368]">
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

                        <div className="min-w-0 text-[1.85rem] font-normal tracking-[-0.03em] text-[#e8eaed]">
                            {calendarMeta.title}
                        </div>

                        <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-3 xl:w-auto">
                            <label className="relative min-w-[220px] flex-1 xl:w-[280px] xl:flex-none">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#9aa0a6]">
                                    <Search size={16} aria-hidden="true" />
                                </span>
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Search meetings"
                                    className="h-11 w-full rounded-full border border-[#3c4043] bg-[#2b2c2f] pl-10 pr-4 text-sm text-[#e8eaed] outline-none transition-colors placeholder:text-[#9aa0a6] focus:border-[#8ab4f8]"
                                />
                            </label>

                            <button
                                type="button"
                                className="calendar-google-icon-button"
                                aria-label="Open help"
                            >
                                <HelpCircle size={18} aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                className="calendar-google-icon-button"
                                aria-label="Open calendar settings"
                            >
                                <Settings size={18} aria-hidden="true" />
                            </button>

                            <div className="inline-flex overflow-hidden rounded-full border border-[#5f6368] bg-[#2b2c2f]">
                                {VIEW_OPTIONS.map((viewOption) => {
                                    const isActive = calendarMeta.viewType === viewOption.id;

                                    return (
                                        <button
                                            key={viewOption.id}
                                            type="button"
                                            onClick={() => handleViewChange(viewOption.id)}
                                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                                                isActive
                                                    ? "bg-[#8ab4f8] text-[#202124]"
                                                    : "text-[#e8eaed] hover:bg-[#35363a]"
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
                            eventClick={(clickInfo) => setSelectedMeetingId(clickInfo.event.id)}
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
