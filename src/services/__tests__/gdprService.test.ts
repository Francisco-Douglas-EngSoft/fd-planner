import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GDPRService } from '@/services/gdprService';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  deleteUser: vi.fn(),
  auditLog: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mocks.from,
    auth: {
      getUser: mocks.getUser,
      admin: { deleteUser: mocks.deleteUser },
    },
  },
}));

vi.mock('@/services/auditService', () => ({
  AuditService: { log: mocks.auditLog },
}));

describe('GDPRService.deleteUserData', () => {
  const queries: Array<{ table: string; query: any }> = [];

  beforeEach(() => {
    vi.clearAllMocks();
    queries.length = 0;
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mocks.deleteUser.mockResolvedValue({ error: null });
    mocks.auditLog.mockResolvedValue(undefined);

    mocks.from.mockImplementation((table: string) => {
      let selectedColumns: string | null = null;
      const query: any = {
        select: vi.fn((columns: string) => {
          selectedColumns = columns;
          return query;
        }),
        delete: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        then: (onFulfilled?: (value: any) => unknown, onRejected?: (reason: any) => unknown) => {
          const data = selectedColumns === 'id'
            ? table === 'study_plans'
              ? [{ id: 'plan-1' }, { id: 'plan-2' }]
              : table === 'courses'
                ? [{ id: 'course-1' }]
                : null
            : null;
          return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected);
        },
      };
      queries.push({ table, query });
      return query;
    });
  });

  it('exclui vínculos pelos IDs dos pais, sem filtrar por user_id inexistente', async () => {
    await GDPRService.deleteUserData();

    const planCourses = queries.find(({ table, query }) =>
      table === 'study_plan_courses' && query.delete.mock.calls.length > 0
    )?.query;
    const planModules = queries.find(({ table, query }) =>
      table === 'study_plan_modules' && query.delete.mock.calls.length > 0
    )?.query;
    const courseModules = queries.find(({ table, query }) =>
      table === 'course_modules' && query.delete.mock.calls.length > 0
    )?.query;

    expect(planCourses.in).toHaveBeenCalledWith('study_plan_id', ['plan-1', 'plan-2']);
    expect(planModules.in).toHaveBeenCalledWith('study_plan_id', ['plan-1', 'plan-2']);
    expect(courseModules.in).toHaveBeenCalledWith('course_id', ['course-1']);

    for (const query of [planCourses, planModules, courseModules]) {
      expect(query.eq).not.toHaveBeenCalledWith('user_id', 'user-1');
    }
  });
});
