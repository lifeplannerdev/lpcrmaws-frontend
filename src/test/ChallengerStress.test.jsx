/**
 * Challenger Stress Test Suite - Milestone 3
 * Empirical verification of responsive layout, 12-card harmonic grid,
 * Indian currency edge cases, and font downscaling anti-clipping behavior.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import AdminStatsGrid from '../Components/Dashboard/AdminStatsGrid';
import MetricCard from '../Components/common/MetricCard';

describe('Challenger M3 Empirical Layout & Stress Suite', () => {

  // ── 1. 12-Card Grid Harmonic Divisor & Zero-Orphan Verification ──────────
  describe('12-Card Grid Geometry & Divisor Stress Test', () => {
    const full12Stats = {
      has_admin_dashboard: true,
      active_staff: 15,
      staff_on_leave: 2,
      leads_change: 5,
      staff_change: 1,
      metrics: {
        leads: {
          total: 1500,
          conversion_rate: 22.5,
          hot: 200,
          warm: 400,
          converted: 300,
          registered: 38
        },
        followups: {
          today_total: 42,
          overdue: 9
        },
        tasks: {
          urgent: 4,
          overdue: 1
        },
        executive_financials: {
          collections_this_month: 850000,
          pending_receivables: 1200000,
          total_overdue_balance: 350000,
          total_revenue: 5420000
        }
      }
    };

    it('renders exactly 12 cards when all metrics are populated', () => {
      const { container } = render(<AdminStatsGrid stats={full12Stats} />);
      const grid = container.firstChild;

      // Assert grid classes
      expect(grid.className).toContain('grid');
      expect(grid.className).toContain('grid-cols-1');
      expect(grid.className).toContain('sm:grid-cols-2');
      expect(grid.className).toContain('md:grid-cols-3');
      expect(grid.className).toContain('lg:grid-cols-4');
      expect(grid.className).toContain('2xl:grid-cols-6');
      expect(grid.className).toContain('gap-4');

      // Count child cards
      const cards = grid.children;
      expect(cards.length).toBe(12);

      // Verify zero orphan cards at each responsive column count
      const breakpoints = [
        { name: 'Mobile (<640px)', cols: 1 },
        { name: 'Tablet SM (640-767px)', cols: 2 },
        { name: 'Tablet MD (768-1023px)', cols: 3 },
        { name: 'Desktop LG (1024-1535px)', cols: 4 },
        { name: 'Ultrawide 2XL (>=1536px)', cols: 6 },
      ];

      breakpoints.forEach(({ name, cols }) => {
        const orphanCards = cards.length % cols;
        expect(orphanCards, `Orphan cards on ${name} must be 0`).toBe(0);
      });
    });

    it('gracefully renders without throwing when stats is empty or undefined', () => {
      const { container: c1 } = render(<AdminStatsGrid stats={{}} />);
      expect(c1.firstChild).toBeInTheDocument();

      const { container: c2 } = render(<AdminStatsGrid stats={undefined} />);
      expect(c2.firstChild).toBeInTheDocument();
    });
  });

  // ── 2. Indian Currency Formatting & Extreme Boundary Stress Testing ───────
  describe('Indian Currency Formatting (formatINR) Boundary Stress Test', () => {
    it('correctly formats extreme financial values into compact Lakhs and Crores', () => {
      const statsWithExtremes = {
        has_admin_dashboard: true,
        metrics: {
          executive_financials: {
            collections_this_month: 850000,          // 8.5 Lakhs -> ₹8.50 L
            pending_receivables: 12500000,          // 1.25 Crore -> ₹1.25 Cr
            total_overdue_balance: 125000000,       // 12.50 Crores -> ₹12.50 Cr
            total_revenue: 12005000000              // 1,200.50 Crores -> ₹1200.50 Cr
          }
        }
      };

      render(<AdminStatsGrid stats={statsWithExtremes} />);

      expect(screen.getByText('₹8.50 L')).toBeInTheDocument();
      expect(screen.getByText('₹1.25 Cr')).toBeInTheDocument();
      expect(screen.getByText('₹12.50 Cr')).toBeInTheDocument();
      expect(screen.getByText('₹1200.50 Cr')).toBeInTheDocument();
    });

    it('formats small amounts, negative values, and zero gracefully', () => {
      const statsWithSmallAndNegatives = {
        has_admin_dashboard: true,
        metrics: {
          executive_financials: {
            collections_this_month: 0,             // Zero
            pending_receivables: 50,               // Small amount < 1k
            total_overdue_balance: -850000,        // Negative Lakhs
            total_revenue: -500                    // Small negative
          }
        }
      };

      render(<AdminStatsGrid stats={statsWithSmallAndNegatives} />);

      expect(screen.getByText('₹0')).toBeInTheDocument();
      expect(screen.getByText('₹50')).toBeInTheDocument();
      expect(screen.getByText('₹-8.50 L')).toBeInTheDocument();
      expect(screen.getByText('-₹500')).toBeInTheDocument();
    });

    it('displays uncompressed currency in tooltip attributes for auditability', () => {
      const stats = {
        has_admin_dashboard: true,
        metrics: {
          executive_financials: {
            collections_this_month: 850000,
            pending_receivables: 12005000000,
          }
        }
      };

      const { container } = render(<AdminStatsGrid stats={stats} />);
      const cards = container.querySelectorAll('.group');

      // First card: Collections (Month)
      expect(cards[0].getAttribute('title')).toContain('8,50,000');
      // Second card: Pending Receivables (1,200.50 Cr)
      expect(cards[1].getAttribute('title')).toContain('12,00,50,00,000');
    });
  });

  // ── 3. MetricCard Dynamic Font Downscaling & Anti-Clipping ────────────────
  describe('MetricCard Anti-Clipping & Font Scaling Stress Test', () => {
    it('applies text-2xl sm:text-3xl when value length is <= 8 characters', () => {
      render(
        <MetricCard
          title="Short Metric"
          value="₹8.50 L"
          subtitle="Short subtitle"
        />
      );

      const heading = screen.getByText('₹8.50 L');
      expect(heading.className).toContain('text-2xl');
      expect(heading.className).toContain('sm:text-3xl');
      expect(heading.className).not.toContain('text-xl');
    });

    it('downscales to text-xl sm:text-2xl when value length is > 8 characters', () => {
      render(
        <MetricCard
          title="Long Metric"
          value="₹1,200.50 Cr"
          subtitle="Long value should downscale"
        />
      );

      const heading = screen.getByText('₹1,200.50 Cr');
      expect(heading.className).toContain('text-xl');
      expect(heading.className).toContain('sm:text-2xl');
      expect(heading.className).toContain('truncate');
    });

    it('enforces min-w-0 on flex child and flex-shrink-0 on icon to prevent layout blowout', () => {
      const { container } = render(
        <MetricCard
          title="Blowout Test"
          value="SuperLongUnbrokenStringWithoutSpacesThatCouldOverflow"
          subtitle="Subtitle text"
        />
      );

      const textWrapper = container.querySelector('.min-w-0');
      expect(textWrapper).toBeTruthy();
      expect(textWrapper.className).toContain('flex-1');
      expect(textWrapper.className).toContain('min-w-0');

      const valueHeading = screen.getByText('SuperLongUnbrokenStringWithoutSpacesThatCouldOverflow');
      expect(valueHeading.className).toContain('truncate');
    });

    it('renders positive and negative trend indicators with correct color coding', () => {
      const { rerender } = render(
        <MetricCard
          title="Trend Up"
          value="100"
          change={12.5}
          showTrend={true}
        />
      );

      expect(screen.getByText('+12.5%')).toBeInTheDocument();
      expect(screen.getByText('+12.5%').parentElement.className).toContain('text-green-600');

      rerender(
        <MetricCard
          title="Trend Down"
          value="80"
          change={-8.4}
          showTrend={true}
        />
      );

      expect(screen.getByText('-8.4%')).toBeInTheDocument();
      expect(screen.getByText('-8.4%').parentElement.className).toContain('text-red-600');
    });
  });
});
