import React, { createContext, useContext, useState, useCallback } from 'react';
import ContextualMailDrawer from '../Components/Mail/ContextualMailDrawer';

const MailComposeContext = createContext(null);

export const MailComposeProvider = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [composeConfig, setComposeConfig] = useState(null);

  const openMailComposer = useCallback((config = {}) => {
    setComposeConfig({
      ...config,
      _openedAt: Date.now(),
    });
    setDrawerOpen(true);
  }, []);

  const closeMailComposer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  return (
    <MailComposeContext.Provider value={{ openMailComposer, closeMailComposer, isOpen: drawerOpen }}>
      {children}
      <ContextualMailDrawer
        open={drawerOpen}
        onClose={closeMailComposer}
        config={composeConfig}
      />
    </MailComposeContext.Provider>
  );
};

export const useMailCompose = () => {
  const ctx = useContext(MailComposeContext);
  if (!ctx) {
    return {
      openMailComposer: () => {},
      closeMailComposer: () => {},
      isOpen: false,
    };
  }
  return ctx;
};

// ── Smart Pre-Fill Builders for CRM Modules ──────────────────────────────────

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const buildTaskMailConfig = (task, recipientOverride = null) => {
  const assigneeName = task.assigned_to_full_name || task.assigned_to_name || 'Team Member';
  const assigneeEmail = recipientOverride?.email || task.assigned_to_email || '';
  const priorityColor =
    task.priority === 'URGENT' ? '#dc2626' :
    task.priority === 'HIGH' ? '#ea580c' :
    task.priority === 'MEDIUM' ? '#4f46e5' : '#475569';

  const overdueHtml = task.is_overdue
    ? `<span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;">OVERDUE (${task.overdue_days || 1}d)</span>`
    : '';

  const contextCardHtml = `
    <div style="font-family:Inter,Arial,sans-serif;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:14px 0;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#312e81,#4f46e5);color:#ffffff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.85;">Executive Task Follow-Up</div>
          <div style="font-size:16px;font-weight:700;margin-top:2px;">${escapeHtml(task.title)}</div>
        </div>
      </div>
      <div style="padding:16px 18px;font-size:13px;color:#334155;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#64748b;width:130px;">Assigned To:</td>
            <td style="padding:6px 0;font-weight:600;color:#0f172a;">${escapeHtml(assigneeName)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;">Priority & Status:</td>
            <td style="padding:6px 0;">
              <span style="color:${priorityColor};font-weight:700;">${escapeHtml(task.priority)}</span>
              &nbsp;•&nbsp;
              <span style="font-weight:600;">${escapeHtml((task.status || '').replace('_', ' '))}</span>
              &nbsp;${overdueHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;">Deadline:</td>
            <td style="padding:6px 0;font-weight:600;">${escapeHtml(task.deadline || 'Not set')}</td>
          </tr>
        </table>
        ${task.description ? `<div style="margin-top:10px;padding:10px 12px;background:#f8fafc;border-left:3px solid #4f46e5;border-radius:6px;color:#475569;font-size:12.5px;">${escapeHtml(task.description)}</div>` : ''}
      </div>
    </div>
  `;

  return {
    to: assigneeEmail ? [assigneeEmail] : [],
    recipient_staff: task.assigned_to || null,
    recipient_staff_name: assigneeName,
    context_module: 'TASKS',
    context_id: String(task.id),
    context_label: `Task #${task.id}: ${task.title}`,
    subject: task.is_overdue
      ? `[Action Required] Overdue Task: ${task.title}`
      : `Regarding Task: ${task.title}`,
    body_html: `<p>Hi <strong>${escapeHtml(assigneeName)}</strong>,</p><p>Please provide an immediate update regarding the following assigned task:</p>${contextCardHtml}<p>Kindly update the status in the CRM or reply to this thread with your progress.</p>`,
    contextCardHtml,
    custom_variables: {
      employee_name: assigneeName,
      employee_email: assigneeEmail,
      task_title: task.title || '',
      task_deadline: task.deadline || '',
      task_status: task.status || '',
      task_priority: task.priority || '',
    },
  };
};

export const buildPenaltyMailConfig = (penalty, employeeObj = null) => {
  const empName =
    penalty.user_details?.name ||
    penalty.user_name ||
    employeeObj?.name ||
    'Employee';
  const empEmail =
    penalty.user_email ||
    penalty.user_details?.email ||
    employeeObj?.email ||
    '';
  const amountStr = Number(penalty.amount || 0).toLocaleString('en-IN');

  const contextCardHtml = `
    <div style="font-family:Inter,Arial,sans-serif;border:1px solid #fecaca;border-radius:12px;overflow:hidden;margin:14px 0;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#991b1b,#dc2626);color:#ffffff;padding:14px 18px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.85;">Official Disciplinary & Penalty Notice</div>
        <div style="font-size:16px;font-weight:700;margin-top:2px;">${escapeHtml(penalty.act || 'Disciplinary Penalty')}</div>
      </div>
      <div style="padding:16px 18px;font-size:13px;color:#334155;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#64748b;width:130px;">Employee:</td>
            <td style="padding:6px 0;font-weight:600;color:#0f172a;">${escapeHtml(empName)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;">Reason / Act:</td>
            <td style="padding:6px 0;font-weight:600;color:#b91c1c;">${escapeHtml(penalty.act || '-')}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;">Penalty Amount:</td>
            <td style="padding:6px 0;font-weight:700;color:#dc2626;font-size:15px;">₹${escapeHtml(amountStr)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;">Date & Month:</td>
            <td style="padding:6px 0;">${escapeHtml(penalty.date || '-')} (${escapeHtml(penalty.month || '-')})</td>
          </tr>
        </table>
      </div>
    </div>
  `;

  return {
    to: empEmail ? [empEmail] : [],
    recipient_staff: penalty.user || employeeObj?.id || null,
    recipient_staff_name: empName,
    context_module: 'PENALTIES',
    context_id: String(penalty.id || 'new'),
    context_label: `Penalty • ${empName} (₹${amountStr})`,
    subject: `Disciplinary Penalty Notice: ${penalty.act || 'Policy Violation'} (${penalty.month || ''})`,
    body_html: `<p>Dear <strong>${escapeHtml(empName)}</strong>,</p><p>This is an official notification regarding a disciplinary penalty recorded on your profile:</p>${contextCardHtml}<p>If you have any clarification regarding this record, please reply directly to this email thread.</p>`,
    contextCardHtml,
    custom_variables: {
      employee_name: empName,
      employee_email: empEmail,
      penalty_act: penalty.act || '',
      penalty_amount: String(penalty.amount || ''),
      penalty_date: penalty.date || '',
      penalty_month: penalty.month || '',
    },
  };
};

export const buildReportMailConfig = (report, employeeObj = null, isMissingReminder = false, dateStr = '') => {
  if (isMissingReminder) {
    const empName = report.name || employeeObj?.name || 'Team Member';
    const empEmail = report.email || employeeObj?.email || '';
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    const contextCardHtml = `
      <div style="font-family:Inter,Arial,sans-serif;border:1px solid #fde68a;border-radius:12px;overflow:hidden;margin:14px 0;background:#fffbeb;">
        <div style="background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;padding:12px 18px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.9;">Daily Report Compliance Reminder</div>
          <div style="font-size:15px;font-weight:700;margin-top:2px;">Missing Daily Report — ${escapeHtml(targetDate)}</div>
        </div>
        <div style="padding:14px 18px;font-size:13px;color:#78350f;">
          Our records indicate that your Daily Work Report / Next Day Agenda for <strong>${escapeHtml(targetDate)}</strong> has not been submitted yet.
        </div>
      </div>
    `;

    return {
      to: empEmail ? [empEmail] : [],
      recipient_staff: report.id || employeeObj?.id || null,
      recipient_staff_name: empName,
      context_module: 'REPORTS',
      context_id: `missing_${report.id}_${targetDate}`,
      context_label: `Missing Report • ${empName} (${targetDate})`,
      subject: `[Reminder] Pending Daily Report Submission for ${targetDate}`,
      body_html: `<p>Dear <strong>${escapeHtml(empName)}</strong>,</p>${contextCardHtml}<p>Please submit your daily report immediately on the CRM portal or reply with the reason for delay.</p>`,
      contextCardHtml,
      custom_variables: {
        employee_name: empName,
        employee_email: empEmail,
        report_date: targetDate,
        report_status: 'Missing / Not Submitted',
      },
    };
  }

  const empName = report.user_name || report.name || employeeObj?.name || 'Team Member';
  const empEmail = report.user_email || employeeObj?.email || '';
  const rDate = report.report_date || dateStr || '';

  const contextCardHtml = `
    <div style="font-family:Inter,Arial,sans-serif;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:14px 0;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#ffffff;padding:14px 18px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.85;">Daily Work Report Review</div>
        <div style="font-size:16px;font-weight:700;margin-top:2px;">${escapeHtml(report.report_heading || report.agenda_heading || `Report for ${rDate}`)}</div>
      </div>
      <div style="padding:16px 18px;font-size:13px;color:#334155;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:5px 0;color:#64748b;width:140px;">Submitted By:</td>
            <td style="padding:5px 0;font-weight:600;color:#0f172a;">${escapeHtml(empName)}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#64748b;">Report Date:</td>
            <td style="padding:5px 0;font-weight:600;">${escapeHtml(rDate)}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#64748b;">Agenda / Report Status:</td>
            <td style="padding:5px 0;font-weight:600;">Agenda: ${escapeHtml(report.agenda_status || 'Pending')} • Report: ${escapeHtml(report.report_status || 'Pending')}</td>
          </tr>
          ${report.report_late_by || report.agenda_late_by ? `
          <tr>
            <td style="padding:5px 0;color:#64748b;">Punctuality:</td>
            <td style="padding:5px 0;color:#dc2626;font-weight:600;">
              ${report.agenda_late_by ? `Agenda late by ${escapeHtml(report.agenda_late_by)} ` : ''}
              ${report.report_late_by ? `Report late by ${escapeHtml(report.report_late_by)}` : ''}
            </td>
          </tr>` : ''}
        </table>
        ${report.review_comment || report.report_review_comment || report.agenda_review_comment ? `
        <div style="margin-top:10px;padding:10px 12px;background:#f8fafc;border-left:3px solid #3b82f6;border-radius:6px;font-size:12.5px;">
          <strong>Reviewer Remarks:</strong> ${escapeHtml(report.report_review_comment || report.agenda_review_comment || report.review_comment)}
        </div>` : ''}
      </div>
    </div>
  `;

  return {
    to: empEmail ? [empEmail] : [],
    recipient_staff: report.user || employeeObj?.id || null,
    recipient_staff_name: empName,
    context_module: 'REPORTS',
    context_id: String(report.id),
    context_label: `Report #${report.id} • ${empName} (${rDate})`,
    subject: `Feedback on Daily Report (${rDate}) — ${empName}`,
    body_html: `<p>Hi <strong>${escapeHtml(empName)}</strong>,</p><p>Regarding your daily work report submission for <strong>${escapeHtml(rDate)}</strong>:</p>${contextCardHtml}<p>Please review the remarks above and reply to this thread with any updates.</p>`,
    contextCardHtml,
    custom_variables: {
      employee_name: empName,
      employee_email: empEmail,
      report_date: rDate,
      report_status: report.report_status || report.status || '',
    },
  };
};

export const buildLeadAdvisorMailConfig = (lead, focusedAdvisor = null, initialMode = 'advisor') => {
  const advisorName =
    lead.assigned_to_name ||
    focusedAdvisor?.full_name ||
    focusedAdvisor?.username ||
    'Advisor';
  const advisorEmail =
    lead.assigned_to_email ||
    focusedAdvisor?.email ||
    '';
  const advisorId =
    lead.assigned_to_id ||
    focusedAdvisor?.id ||
    null;

  const leadName = lead.name || 'Prospective Student';
  const leadPhone = lead.phone || '-';
  const leadEmail = lead.email || '';
  const leadStatus = (lead.status || 'Enquiry').toUpperCase();
  const leadProgram = lead.program || 'Not specified';
  const leadSource = lead.source || 'Direct';
  const latestFu = lead.latest_followup;

  const dossierCardHtml = `
    <div style="font-family:Inter,Arial,sans-serif;border:1px solid #c7d2fe;border-radius:12px;overflow:hidden;margin:14px 0;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#312e81,#4338ca);color:#ffffff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.85;">Executive Lead Dossier • Staff Analysis</div>
          <div style="font-size:16px;font-weight:700;margin-top:2px;">${escapeHtml(leadName)} (${escapeHtml(leadPhone)})</div>
        </div>
      </div>
      <div style="padding:16px 18px;font-size:13px;color:#334155;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:5px 0;color:#64748b;width:140px;">Lead Name & Phone:</td>
            <td style="padding:5px 0;font-weight:700;color:#0f172a;">${escapeHtml(leadName)} • ${escapeHtml(leadPhone)}</td>
          </tr>
          ${leadEmail ? `
          <tr>
            <td style="padding:5px 0;color:#64748b;">Lead Email:</td>
            <td style="padding:5px 0;color:#4f46e5;">${escapeHtml(leadEmail)}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:5px 0;color:#64748b;">Pipeline Status:</td>
            <td style="padding:5px 0;"><span style="background:#eef2ff;color:#4338ca;padding:2px 8px;border-radius:6px;font-weight:700;font-size:11.5px;">${escapeHtml(leadStatus)}</span></td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#64748b;">Program & Source:</td>
            <td style="padding:5px 0;font-weight:600;">${escapeHtml(leadProgram)} <span style="color:#94a3b8;">(${escapeHtml(leadSource)})</span></td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#64748b;">Assigned Advisor:</td>
            <td style="padding:5px 0;font-weight:600;">${escapeHtml(advisorName)}</td>
          </tr>
          ${latestFu ? `
          <tr>
            <td style="padding:5px 0;color:#64748b;">Latest Follow-Up:</td>
            <td style="padding:5px 0;font-weight:600;color:${latestFu.is_overdue ? '#dc2626' : '#059669'};">
              ${escapeHtml((latestFu.status || '').toUpperCase())} ${latestFu.follow_up_date ? `(${escapeHtml(latestFu.follow_up_date.slice(0, 10))})` : ''}
              ${latestFu.is_overdue ? ' — OVERDUE' : ''}
            </td>
          </tr>` : ''}
        </table>
        ${lead.remarks ? `
        <div style="margin-top:10px;padding:10px 12px;background:#f8fafc;border-left:3px solid #4f46e5;border-radius:6px;font-size:12.5px;color:#475569;">
          <strong>Advisor Remarks:</strong> ${escapeHtml(lead.remarks)}
        </div>` : ''}
      </div>
    </div>
  `;

  const advisorBodyHtml = `<p>Hi <strong>${escapeHtml(advisorName)}</strong>,</p><p>I reviewed this lead in the Staff Analysis portal and would like an immediate status update / action plan:</p>${dossierCardHtml}<p>Please share the latest conversation outcome and next steps by replying to this thread.</p>`;

  const leadDirectBodyHtml = `<p>Dear <strong>${escapeHtml(leadName)}</strong>,</p><p>Greetings from Life Planner Universal! Thank you for your interest in our <strong>${escapeHtml(leadProgram)}</strong> program.</p><p>Our senior advisor <strong>${escapeHtml(advisorName)}</strong> and management team are available to assist you with any questions regarding admissions, batches, or documentation. Feel free to reply directly to this email.</p>`;

  const alternateTargets = [
    {
      id: 'advisor',
      label: `Mail Advisor (${advisorName})`,
      to: advisorEmail ? [advisorEmail] : [],
      cc: [],
      subject: `Lead Review & Follow-Up Inquiry: ${leadName} (${leadPhone})`,
      body_html: advisorBodyHtml,
      recipient_staff: advisorId,
      recipient_staff_name: advisorName,
    },
    {
      id: 'lead',
      label: `Mail Lead (${leadName})`,
      to: leadEmail ? [leadEmail] : [],
      cc: advisorEmail ? [advisorEmail] : [],
      subject: `Regarding Your Enquiry for ${leadProgram} — Life Planner Universal`,
      body_html: leadDirectBodyHtml,
      recipient_staff: advisorId,
      recipient_staff_name: advisorName,
    },
  ];

  const chosen = initialMode === 'lead' ? alternateTargets[1] : alternateTargets[0];

  return {
    to: chosen.to,
    cc: chosen.cc,
    recipient_staff: advisorId,
    recipient_staff_name: advisorName,
    lead: lead.id || null,
    context_module: 'STAFF_ANALYSIS',
    context_id: String(lead.id || ''),
    context_label: `Lead: ${leadName} (${leadPhone}) • Advisor: ${advisorName}`,
    subject: chosen.subject,
    body_html: chosen.body_html,
    contextCardHtml: dossierCardHtml,
    alternateTargets,
    activeTargetId: chosen.id,
    custom_variables: {
      employee_name: advisorName,
      advisor_name: advisorName,
      employee_email: advisorEmail,
      lead_name: leadName,
      lead_phone: leadPhone,
      lead_email: leadEmail,
      lead_status: leadStatus,
      lead_program: leadProgram,
      lead_source: leadSource,
    },
  };
};

export const buildAdvisorPerformanceMailConfig = (employeeData, dateRangeLabel = '') => {
  const emp = employeeData?.employee || employeeData || {};
  const summary = employeeData?.summary || {};
  const empName = emp.full_name || emp.username || emp.name || 'Advisor';
  const empEmail = emp.email || '';

  const totalLeads = summary.total_leads ?? 0;
  const converted = summary.converted_leads ?? 0;
  const convRate = summary.conversion_rate ?? 0;
  const fuCompletion = summary.followup_completion_rate ?? 0;
  const overdueFu = summary.overdue_followups ?? 0;
  const perfScore = employeeData?.performance?.total ?? summary.performance_score ?? '-';

  const scorecardHtml = `
    <div style="font-family:Inter,Arial,sans-serif;border:1px solid #c7d2fe;border-radius:12px;overflow:hidden;margin:14px 0;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#1e1b4b,#4338ca);color:#ffffff;padding:14px 18px;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.85;">Executive 360° Performance Review ${dateRangeLabel ? `• ${escapeHtml(dateRangeLabel)}` : ''}</div>
        <div style="font-size:16px;font-weight:700;margin-top:2px;">${escapeHtml(empName)} — Performance Scorecard (${escapeHtml(perfScore)}/100)</div>
      </div>
      <div style="padding:16px 18px;font-size:13px;color:#334155;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#64748b;width:160px;">Total Leads Handled:</td>
            <td style="padding:6px 0;font-weight:700;color:#0f172a;">${escapeHtml(totalLeads)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;">Converted / Won:</td>
            <td style="padding:6px 0;font-weight:700;color:#059669;">${escapeHtml(converted)} (${escapeHtml(convRate)}%)</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;">Follow-Up Completion:</td>
            <td style="padding:6px 0;font-weight:600;">${escapeHtml(fuCompletion)}%</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;">Overdue Follow-Ups:</td>
            <td style="padding:6px 0;font-weight:700;color:${overdueFu > 0 ? '#dc2626' : '#059669'};">${escapeHtml(overdueFu)}</td>
          </tr>
        </table>
      </div>
    </div>
  `;

  return {
    to: empEmail ? [empEmail] : [],
    recipient_staff: emp.id || null,
    recipient_staff_name: empName,
    context_module: 'STAFF_ANALYSIS',
    context_id: `advisor_${emp.id || ''}`,
    context_label: `Performance Review • ${empName}`,
    subject: `Executive Performance Review & Pipeline Feedback — ${empName}`,
    body_html: `<p>Dear <strong>${escapeHtml(empName)}</strong>,</p><p>Here is a summary of your current sales & follow-up performance metrics:</p>${scorecardHtml}<p>Please review your overdue follow-ups and share your conversion plan for this week by replying to this thread.</p>`,
    contextCardHtml: scorecardHtml,
    custom_variables: {
      employee_name: empName,
      advisor_name: empName,
      employee_email: empEmail,
    },
  };
};
