import React, { useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Calendar as CalendarIcon,
  Filter,
  CheckCircle2,
  Clock,
  Lock,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ExternalLink,
  Users,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import type {
  ProjectScheduleDto,
  ProjectMemberDto,
  ProjectTaskDto
} from '@cloudlab/shared-types';

interface ProjectCalendarProps {
  schedule: ProjectScheduleDto;
  projectTasks: ProjectTaskDto[];
  members: ProjectMemberDto[];
  onTaskClick?: (task: ProjectTaskDto) => void;
}

export const ProjectCalendar: React.FC<ProjectCalendarProps> = ({
  schedule,
  projectTasks,
  members,
  onTaskClick,
}) => {
  // Filters
  const [selectedMember, setSelectedMember] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPhase, setSelectedPhase] = useState<string>('ALL');
  const [selectedEventModal, setSelectedEventModal] = useState<ProjectTaskDto | null>(null);

  // Extract unique phases
  const phases = useMemo(() => {
    const pSet = new Set<string>();
    schedule.tasks.forEach((t) => {
      if (t.phase) pSet.add(t.phase);
    });
    return Array.from(pSet);
  }, [schedule]);

  // Map member names
  const memberNameMap = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => {
      const name = m.user ? `${m.user.firstName} ${m.user.lastName}`.trim() : `Student ${m.userId.substring(0, 4)}`;
      map.set(m.userId, name);
    });
    return map;
  }, [members]);

  // Map tasks by id
  const taskMap = useMemo(() => {
    const map = new Map<string, ProjectTaskDto>();
    projectTasks.forEach((t) => map.set(t.id, t));
    return map;
  }, [projectTasks]);

  // Compute status color styles
  const getStatusColor = (status: string, isOverdue: boolean) => {
    if (isOverdue) {
      return {
        bg: 'rgba(239, 68, 68, 0.25)',
        border: '#ef4444',
        text: '#fca5a5',
        label: 'Overdue',
        badgeClass: 'status-overdue',
      };
    }

    switch (status) {
      case 'LOCKED':
        return {
          bg: 'rgba(100, 116, 139, 0.2)',
          border: '#64748b',
          text: '#94a3b8',
          label: 'Locked',
          badgeClass: 'status-locked',
        };
      case 'IN_PROGRESS':
        return {
          bg: 'rgba(0, 212, 255, 0.22)',
          border: '#00d4ff',
          text: '#70e6ff',
          label: 'In Progress',
          badgeClass: 'status-in-progress',
        };
      case 'IN_REVIEW':
        return {
          bg: 'rgba(245, 158, 11, 0.25)',
          border: '#f59e0b',
          text: '#fcd34d',
          label: 'Submitted (Review)',
          badgeClass: 'status-in-review',
        };
      case 'VALIDATE':
      case 'VALIDATED':
        return {
          bg: 'rgba(16, 185, 129, 0.22)',
          border: '#10b981',
          text: '#6ee7b7',
          label: 'Validated',
          badgeClass: 'status-validated',
        };
      case 'REJECTED':
        return {
          bg: 'rgba(244, 63, 94, 0.25)',
          border: '#f43f5e',
          text: '#fda4af',
          label: 'Rejected (Revisions)',
          badgeClass: 'status-rejected',
        };
      case 'TODO':
      default:
        return {
          bg: 'rgba(59, 130, 246, 0.2)',
          border: '#3b82f6',
          text: '#93c5fd',
          label: 'To Do',
          badgeClass: 'status-todo',
        };
    }
  };

  // Convert scheduled tasks to FullCalendar event objects
  const calendarEvents = useMemo(() => {
    const today = new Date();
    return schedule.tasks
      .filter((st) => {
        if (!st || typeof st.taskId !== 'string') return false;
        if (selectedMember !== 'ALL' && st.assignedTo !== selectedMember) return false;
        if (selectedStatus !== 'ALL') {
          if (selectedStatus === 'OVERDUE' && !st.isOverdue) return false;
          if (selectedStatus !== 'OVERDUE' && st.status !== selectedStatus) return false;
        }
        if (selectedPhase !== 'ALL' && st.phase !== selectedPhase) return false;
        return true;
      })
      .map((st) => {
        const fullTask = taskMap.get(st.taskId);
        const assignedName = st.assignedTo ? memberNameMap.get(st.assignedTo) || 'Assigned' : 'Unassigned';
        const colorConfig = getStatusColor(st.status, !!st.isOverdue);

        // Defensive: ensure start/end always resolve to valid dates
        // so FullCalendar never sees undefined `start`/`end`
        const durationDays = typeof st.durationDays === 'number' && st.durationDays > 0 ? st.durationDays : 2;
        let startObj: Date;
        try {
          startObj = st.startDate && !isNaN(new Date(st.startDate).getTime())
            ? new Date(st.startDate)
            : (st.deadline && !isNaN(new Date(st.deadline).getTime())
              ? new Date(new Date(st.deadline).getTime() - durationDays * 86400000)
              : new Date(today.getTime()));
        } catch {
          startObj = new Date(today.getTime());
        }
        let endObj: Date;
        try {
          endObj = st.endDate && !isNaN(new Date(st.endDate).getTime())
            ? new Date(st.endDate)
            : new Date(startObj.getTime() + durationDays * 86400000);
        } catch {
          endObj = new Date(startObj.getTime() + durationDays * 86400000);
        }
        // Add 1 day for inclusive end display in FullCalendar dayGrid
        endObj.setDate(endObj.getDate() + 1);

        return {
          id: st.taskId,
          title: st.title || `Task ${st.taskId.substring(0, 6)}`,
          start: startObj.toISOString(),
          end: endObj.toISOString(),
          allDay: true,
          backgroundColor: colorConfig.bg,
          borderColor: colorConfig.border,
          textColor: colorConfig.text,
          extendedProps: {
            task: fullTask || {
              id: st.taskId,
              title: st.title,
              phase: st.phase,
              assignedTo: st.assignedTo,
              status: st.status,
              durationDays: durationDays,
              deadline: st.deadline,
            },
            assignedName,
            statusLabel: colorConfig.label,
            badgeClass: colorConfig.badgeClass,
            isOverdue: !!st.isOverdue,
            phase: st.phase,
            deadline: st.deadline,
            durationDays: durationDays,
            dependencies: st.dependencies || [],
          },
        };
      });
  }, [schedule, selectedMember, selectedStatus, selectedPhase, taskMap, memberNameMap]);

  const handleEventClick = (info: any) => {
    const rawTask = info.event.extendedProps.task;
    setSelectedEventModal(rawTask);
  };

  const handleOpenTaskWorkspace = (task: ProjectTaskDto) => {
    setSelectedEventModal(null);
    if (onTaskClick) {
      onTaskClick(task);
    }
  };

  return (
    <div className="project-calendar-container">
      {/* Calendar Header & Statistics Bar */}
      <div className="calendar-top-bar">
        <div className="calendar-title-group">
          <div className="cal-icon-glow">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h3>Schedule Timeline &amp; Work Breakdown</h3>
            <p>
              Interactive Gantt-style FullCalendar powered by deterministic CloudLab Scheduler Engine.
              Reflects prerequisites, assignments, and critical path gates.
            </p>
          </div>
        </div>

        <div className="calendar-summary-chips">
          <div className="summary-chip total">
            <span className="chip-label">Duration:</span>
            <span className="chip-value">{schedule.totalDurationDays} Days</span>
          </div>
          <div className="summary-chip tasks">
            <span className="chip-label">Total Tasks:</span>
            <span className="chip-value">{schedule.tasks.length}</span>
          </div>
          <div className="summary-chip critical">
            <span className="chip-label">Critical Path:</span>
            <span className="chip-value">{schedule.criticalPathTaskIds.length}</span>
          </div>
        </div>
      </div>

      {/* Legend & Filter Controls */}
      <div className="calendar-controls-bar">
        {/* Filters */}
        <div className="filters-group">
          <div className="filter-item">
            <label>
              <Users size={13} /> Squad Member:
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
            >
              <option value="ALL">All Squad Members</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user ? `${m.user.firstName} ${m.user.lastName}` : `Student ${m.userId.substring(0, 4)}`}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>
              <Clock size={13} /> Status:
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="LOCKED">🔒 Locked</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">⚡ In Progress</option>
              <option value="IN_REVIEW">📋 Submitted / Review</option>
              <option value="VALIDATED">✅ Validated</option>
              <option value="REJECTED">❌ Request Revisions</option>
              <option value="OVERDUE">⚠️ Overdue Only</option>
            </select>
          </div>

          {phases.length > 0 && (
            <div className="filter-item">
              <label>
                <Layers size={13} /> Phase:
              </label>
              <select
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value)}
              >
                <option value="ALL">All Phases</option>
                {phases.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="calendar-legend">
          <div className="legend-item">
            <span className="dot dot-locked" /> Locked
          </div>
          <div className="legend-item">
            <span className="dot dot-todo" /> To Do
          </div>
          <div className="legend-item">
            <span className="dot dot-inprogress" /> In Progress
          </div>
          <div className="legend-item">
            <span className="dot dot-review" /> Submitted
          </div>
          <div className="legend-item">
            <span className="dot dot-validated" /> Validated
          </div>
          <div className="legend-item">
            <span className="dot dot-rejected" /> Revisions
          </div>
          <div className="legend-item">
            <span className="dot dot-overdue" /> Overdue
          </div>
        </div>
      </div>

      {/* Main FullCalendar Component */}
      <div className="fullcalendar-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={calendarEvents}
          eventClick={handleEventClick}
          eventDisplay="block"
          height="auto"
          dayMaxEvents={3}
          editable={false}
          selectable={false}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
          }}
          eventContent={(eventInfo) => {
            const ext = eventInfo.event.extendedProps;
            return (
              <div className={`fc-custom-event ${ext.badgeClass} ${ext.isOverdue ? 'fc-overdue-event' : ''}`}>
                <div className="fc-event-top">
                  <span className="fc-event-phase">{ext.phase}</span>
                  {ext.isOverdue && <span className="fc-overdue-tag">OVERDUE</span>}
                </div>
                <div className="fc-event-title-line">
                  {ext.statusLabel === 'Locked' && <Lock size={11} className="fc-lock-icon" />}
                  {ext.statusLabel === 'Validated' && <CheckCircle2 size={11} className="fc-valid-icon" />}
                  <strong>{eventInfo.event.title}</strong>
                </div>
                <div className="fc-event-meta">
                  <span className="fc-assigned">👤 {ext.assignedName}</span>
                  <span className="fc-duration">⏱️ {ext.durationDays}d</span>
                </div>
              </div>
            );
          }}
        />
      </div>

      {/* MODAL: Task Details from Calendar Click */}
      {selectedEventModal && (
        <div className="modal-overlay" onClick={() => setSelectedEventModal(null)}>
          <div className="modal-card calendar-task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-task-header">
              <div>
                <span className="modal-task-phase">{selectedEventModal.phase}</span>
                <h3>{selectedEventModal.title}</h3>
              </div>
              <span className={`status-pill ${selectedEventModal.status.toLowerCase()}`}>
                {selectedEventModal.status}
              </span>
            </div>

            <p className="modal-task-desc">
              {selectedEventModal.description || 'No detailed instructions provided.'}
            </p>

            <div className="modal-info-grid">
              <div className="info-card">
                <span className="info-label">Assigned Student</span>
                <span className="info-value">
                  {selectedEventModal.assignedTo
                    ? memberNameMap.get(selectedEventModal.assignedTo) || 'Assigned'
                    : 'Unassigned'}
                </span>
              </div>

              <div className="info-card">
                <span className="info-label">Duration &amp; Timeline</span>
                <span className="info-value">
                  {selectedEventModal.durationDays || 2} Days
                </span>
              </div>

              {selectedEventModal.deadline && (
                <div className="info-card">
                  <span className="info-label">Deadline</span>
                  <span className="info-value">
                    {new Date(selectedEventModal.deadline).toLocaleDateString()}
                  </span>
                </div>
              )}

              {selectedEventModal.requiredSkills && selectedEventModal.requiredSkills.length > 0 && (
                <div className="info-card">
                  <span className="info-label">Target Skills</span>
                  <span className="info-value">
                    {selectedEventModal.requiredSkills.join(', ')}
                  </span>
                </div>
              )}
            </div>

            {selectedEventModal.validationCriteria && selectedEventModal.validationCriteria.length > 0 && (
              <div className="modal-criteria-box">
                <h4>Validation Criteria:</h4>
                <ul>
                  {selectedEventModal.validationCriteria.map((c: string, idx: number) => (
                    <li key={idx}>
                      <CheckCircle2 size={13} color="#10b981" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedEventModal(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-primary-gradient"
                onClick={() => handleOpenTaskWorkspace(selectedEventModal)}
              >
                <ExternalLink size={14} /> Open in Task Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .project-calendar-container {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 24px;
          margin-top: 20px;
          box-shadow: var(--shadow-card);
        }

        .calendar-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 18px;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .calendar-title-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .cal-icon-glow {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(0, 145, 255, 0.1));
          border: 1px solid rgba(0, 212, 255, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-cyan);
          box-shadow: 0 0 15px rgba(0, 212, 255, 0.2);
        }

        .calendar-title-group h3 {
          font-size: 19px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .calendar-title-group p {
          font-size: 13px;
          color: var(--text-secondary);
          max-width: 650px;
        }

        .calendar-summary-chips {
          display: flex;
          gap: 12px;
        }

        .summary-chip {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 8px 14px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .chip-label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.04em;
        }

        .chip-value {
          font-size: 16px;
          font-weight: 700;
          color: var(--accent-cyan);
          margin-top: 2px;
        }

        /* Controls & Legends */
        .calendar-controls-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 22px;
          background: rgba(13, 18, 29, 0.6);
          padding: 14px 18px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
        }

        .filters-group {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .filter-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-item label {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .filter-item select {
          background: rgba(7, 10, 15, 0.8);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 6px 12px;
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }

        .filter-item select:focus {
          border-color: var(--accent-cyan);
        }

        .calendar-legend {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }

        .dot-locked { background: #64748b; }
        .dot-todo { background: #3b82f6; }
        .dot-inprogress { background: #00d4ff; }
        .dot-review { background: #f59e0b; }
        .dot-validated { background: #10b981; }
        .dot-rejected { background: #f43f5e; }
        .dot-overdue { background: #ef4444; }

        /* FullCalendar Custom Theming */
        .fullcalendar-wrapper {
          color: var(--text-primary);
          font-family: inherit;
        }

        .fc {
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: rgba(255, 255, 255, 0.02);
          --fc-neutral-text-color: var(--text-secondary);
          --fc-border-color: rgba(255, 255, 255, 0.08);
          --fc-button-text-color: #f8fafc;
          --fc-button-bg-color: rgba(255, 255, 255, 0.06);
          --fc-button-border-color: rgba(255, 255, 255, 0.12);
          --fc-button-hover-bg-color: rgba(0, 212, 255, 0.15);
          --fc-button-hover-border-color: var(--accent-cyan);
          --fc-button-active-bg-color: var(--accent-cyan);
          --fc-button-active-border-color: var(--accent-cyan);
          --fc-today-bg-color: rgba(0, 212, 255, 0.04);
        }

        .fc .fc-toolbar-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .fc .fc-button {
          font-size: 12.5px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 6px;
          text-transform: capitalize;
        }

        .fc .fc-button-primary:not(:disabled).fc-button-active {
          color: #040812;
          background: var(--accent-cyan);
          border-color: var(--accent-cyan);
        }

        .fc .fc-col-header-cell-cushion {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 10px 4px;
        }

        .fc .fc-daygrid-day-number {
          color: var(--text-secondary);
          font-size: 12px;
          padding: 6px 8px;
        }

        .fc-day-today .fc-daygrid-day-number {
          color: var(--accent-cyan);
          font-weight: 700;
        }

        /* Custom Event Card Styling inside FullCalendar */
        .fc-h-event {
          border-radius: 6px;
          border: 1px solid;
          margin-bottom: 4px;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .fc-h-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          filter: brightness(1.1);
        }

        .fc-custom-event {
          padding: 5px 8px;
          font-size: 11.5px;
          line-height: 1.3;
          width: 100%;
        }

        .fc-event-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2px;
        }

        .fc-event-phase {
          font-size: 9.5px;
          text-transform: uppercase;
          opacity: 0.8;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .fc-overdue-tag {
          background: #ef4444;
          color: #fff;
          font-size: 8.5px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 3px;
        }

        .fc-event-title-line {
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .fc-lock-icon {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .fc-valid-icon {
          color: #10b981;
          flex-shrink: 0;
        }

        .fc-event-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          opacity: 0.85;
          margin-top: 3px;
        }

        /* Modal Dialog from Event Click */
        .calendar-task-modal {
          max-width: 600px;
        }

        .modal-task-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .modal-task-phase {
          font-size: 11px;
          color: var(--accent-cyan);
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .modal-task-header h3 {
          font-size: 18px;
          color: var(--text-primary);
          margin-top: 2px;
        }

        .modal-task-desc {
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 18px;
        }

        .modal-info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 18px;
        }

        .info-card {
          background: rgba(13, 18, 29, 0.7);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 10px 14px;
        }

        .info-label {
          display: block;
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }

        .info-value {
          display: block;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
          margin-top: 2px;
        }

        .modal-criteria-box {
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
        }

        .modal-criteria-box h4 {
          font-size: 12.5px;
          color: #10b981;
          margin-bottom: 8px;
        }

        .modal-criteria-box ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .modal-criteria-box li {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};
