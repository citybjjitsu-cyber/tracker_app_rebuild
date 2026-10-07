import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StudentQuickActions } from '@/components/portal/StudentQuickActions';

describe('StudentQuickActions', () => {
  it('prioritizes pre-class check-in and links to the feedback area', () => {
    render(<StudentQuickActions pendingFeedbackCount={2} />);

    expect(screen.getByRole('link', { name: /check in now/i })).toHaveAttribute('href', '/check-in');
    expect(screen.getByRole('link', { name: /give feedback/i })).toHaveAttribute('href', '/portal#feedback');
    expect(screen.getByText('2 classes waiting')).toBeInTheDocument();
  });

  it('uses a neutral feedback prompt when nothing is waiting', () => {
    render(<StudentQuickActions pendingFeedbackCount={0} />);

    expect(screen.getByText('Share your experience')).toBeInTheDocument();
  });
});
