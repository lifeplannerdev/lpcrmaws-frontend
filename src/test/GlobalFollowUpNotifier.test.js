import { describe, it, expect } from 'vitest';
import { hasFollowUpsDueWithinTwoDays } from '../Components/followups/GlobalFollowUpNotifier';

describe('hasFollowUpsDueWithinTwoDays', () => {
  const now = new Date(2026, 10, 18, 9, 48, 0); // 2026-11-18

  it('returns false when data is null or all counts are 0', () => {
    expect(hasFollowUpsDueWithinTwoDays(null, now)).toBe(false);
    expect(
      hasFollowUpsDueWithinTwoDays(
        {
          counts: { total_active: 0, overdue: 0, today: 0, tomorrow: 0, upcoming: 0 },
          overdue: [],
          today: [],
          tomorrow: [],
          upcoming: [],
        },
        now
      )
    ).toBe(false);
  });

  it('returns true when overdue, today, or tomorrow follow-ups exist', () => {
    expect(
      hasFollowUpsDueWithinTwoDays(
        { counts: { overdue: 1, today: 0, tomorrow: 0, upcoming: 0 } },
        now
      )
    ).toBe(true);
    expect(
      hasFollowUpsDueWithinTwoDays(
        { counts: { overdue: 0, today: 1, tomorrow: 0, upcoming: 0 } },
        now
      )
    ).toBe(true);
    expect(
      hasFollowUpsDueWithinTwoDays(
        { counts: { overdue: 0, today: 0, tomorrow: 1, upcoming: 0 } },
        now
      )
    ).toBe(true);
  });

  it('returns true when an upcoming follow-up is within 2 days from today', () => {
    expect(
      hasFollowUpsDueWithinTwoDays(
        {
          counts: { total_active: 1, overdue: 0, today: 0, tomorrow: 0, upcoming: 1 },
          upcoming: [{ id: 1, follow_up_date: '2026-11-20' }],
        },
        now
      )
    ).toBe(true);
  });

  it('returns false when upcoming follow-ups are more than 2 days away', () => {
    expect(
      hasFollowUpsDueWithinTwoDays(
        {
          counts: { total_active: 1, overdue: 0, today: 0, tomorrow: 0, upcoming: 1 },
          upcoming: [{ id: 1, follow_up_date: '2026-11-21' }],
        },
        now
      )
    ).toBe(false);

    expect(
      hasFollowUpsDueWithinTwoDays(
        {
          counts: { total_active: 1, overdue: 0, today: 0, tomorrow: 0, upcoming: 1 },
          upcoming: [{ id: 2, follow_up_date: '2027-01-11' }],
        },
        now
      )
    ).toBe(false);
  });
});
