import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryHoursPanel } from '../CategoryHoursPanel';

const tab = [
  { category: 'React', total_hours: 10, completed_hours: 4 },
  { category: 'React', total_hours: 5.5, completed_hours: 5.5 },
  { category: 'Python', total_hours: 20, completed_hours: 0 },
];
const all = [...tab, { category: 'Inglês', total_hours: 4, completed_hours: 4 }];

describe('CategoryHoursPanel', () => {
  it('shows each category total and the sum of all courses', () => {
    render(<CategoryHoursPanel tabCourses={tab} allCourses={all} tabLabel="Em andamento" selectedCategory={null} onSelectCategory={() => {}} onClose={() => {}} />);
    expect(screen.getByText('35:30:00')).toBeInTheDocument(); // soma de todos os cursos da aba
    expect(screen.getByText('15:30:00')).toBeInTheDocument(); // React
    expect(screen.getByText('20:00:00')).toBeInTheDocument(); // Python
  });

  it('switches to every course regardless of tab', () => {
    render(<CategoryHoursPanel tabCourses={tab} allCourses={all} tabLabel="Em andamento" selectedCategory={null} onSelectCategory={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByText('Todos os cursos'));
    expect(screen.getByText('39:30:00')).toBeInTheDocument();
  });

  it('filters by category when a row is clicked', () => {
    const onSelect = vi.fn();
    render(<CategoryHoursPanel tabCourses={tab} allCourses={all} tabLabel="Em andamento" selectedCategory={null} onSelectCategory={onSelect} onClose={() => {}} />);
    fireEvent.click(screen.getByText('Python'));
    expect(onSelect).toHaveBeenCalledWith('Python');
  });
});
