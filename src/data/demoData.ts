// Demo data for guest mode exploration
// This provides realistic sample data for visitors to see how the platform works

import { format, subDays, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const today = new Date();
const weekStart = startOfWeek(today, { weekStartsOn: 1 });
const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
const monthStart = startOfMonth(today);
const monthEnd = endOfMonth(today);

// Demo Profile
export const demoProfile = {
  id: 'demo-user-id',
  full_name: 'Visitante',
  avatar_url: null,
  streak_days: 15,
  level: 5,
  experience_points: 1250,
  total_study_hours: 87.5,
  study_hours_goal: 3,
  last_study_date: format(subDays(today, 1), 'yyyy-MM-dd'),
  created_at: format(subDays(today, 60), 'yyyy-MM-dd'),
  updated_at: format(today, 'yyyy-MM-dd'),
};

// Demo Courses
export const demoCourses = [
  {
    id: 'demo-course-1',
    user_id: 'demo-user-id',
    name: 'React Avançado',
    description: 'Aprenda conceitos avançados de React como hooks customizados, performance e padrões',
    category: 'Programação',
    status: 'in_progress',
    total_hours: 40,
    completed_hours: 28,
    start_date: format(subDays(today, 30), 'yyyy-MM-dd'),
    end_date: format(addDays(today, 30), 'yyyy-MM-dd'),
    is_favorite: true,
    cover_image_url: null,
    created_at: format(subDays(today, 30), 'yyyy-MM-dd'),
    updated_at: format(today, 'yyyy-MM-dd'),
  },
  {
    id: 'demo-course-2',
    user_id: 'demo-user-id',
    name: 'TypeScript Fundamentals',
    description: 'Domine TypeScript do básico ao avançado',
    category: 'Programação',
    status: 'in_progress',
    total_hours: 25,
    completed_hours: 15,
    start_date: format(subDays(today, 20), 'yyyy-MM-dd'),
    end_date: format(addDays(today, 40), 'yyyy-MM-dd'),
    is_favorite: false,
    cover_image_url: null,
    created_at: format(subDays(today, 20), 'yyyy-MM-dd'),
    updated_at: format(today, 'yyyy-MM-dd'),
  },
  {
    id: 'demo-course-3',
    user_id: 'demo-user-id',
    name: 'Node.js Backend',
    description: 'Construa APIs robustas com Node.js e Express',
    category: 'Backend',
    status: 'pending',
    total_hours: 35,
    completed_hours: 0,
    start_date: format(addDays(today, 5), 'yyyy-MM-dd'),
    end_date: format(addDays(today, 60), 'yyyy-MM-dd'),
    is_favorite: false,
    cover_image_url: null,
    created_at: format(subDays(today, 5), 'yyyy-MM-dd'),
    updated_at: format(today, 'yyyy-MM-dd'),
  },
  {
    id: 'demo-course-4',
    user_id: 'demo-user-id',
    name: 'UI/UX Design',
    description: 'Princípios de design para desenvolvedores',
    category: 'Design',
    status: 'completed',
    total_hours: 20,
    completed_hours: 20,
    start_date: format(subDays(today, 60), 'yyyy-MM-dd'),
    end_date: format(subDays(today, 10), 'yyyy-MM-dd'),
    is_favorite: true,
    cover_image_url: null,
    created_at: format(subDays(today, 60), 'yyyy-MM-dd'),
    updated_at: format(subDays(today, 10), 'yyyy-MM-dd'),
  },
  {
    id: 'demo-course-5',
    user_id: 'demo-user-id',
    name: 'SQL Avançado',
    description: 'Consultas complexas e otimização de banco de dados',
    category: 'Banco de Dados',
    status: 'completed',
    total_hours: 15,
    completed_hours: 15,
    start_date: format(subDays(today, 90), 'yyyy-MM-dd'),
    end_date: format(subDays(today, 45), 'yyyy-MM-dd'),
    is_favorite: false,
    cover_image_url: null,
    created_at: format(subDays(today, 90), 'yyyy-MM-dd'),
    updated_at: format(subDays(today, 45), 'yyyy-MM-dd'),
  },
];

// Demo Course Modules
export const demoCourseModules = [
  // React Avançado modules
  { id: 'demo-module-1', course_id: 'demo-course-1', name: 'Hooks Avançados', hours: 8, order_index: 0, is_completed: true, completed_at: format(subDays(today, 20), 'yyyy-MM-dd') },
  { id: 'demo-module-2', course_id: 'demo-course-1', name: 'Context API', hours: 6, order_index: 1, is_completed: true, completed_at: format(subDays(today, 15), 'yyyy-MM-dd') },
  { id: 'demo-module-3', course_id: 'demo-course-1', name: 'Performance', hours: 8, order_index: 2, is_completed: true, completed_at: format(subDays(today, 8), 'yyyy-MM-dd') },
  { id: 'demo-module-4', course_id: 'demo-course-1', name: 'Testing', hours: 6, order_index: 3, is_completed: true, completed_at: format(subDays(today, 3), 'yyyy-MM-dd') },
  { id: 'demo-module-5', course_id: 'demo-course-1', name: 'Server Components', hours: 6, order_index: 4, is_completed: false, completed_at: null },
  { id: 'demo-module-6', course_id: 'demo-course-1', name: 'Projeto Final', hours: 6, order_index: 5, is_completed: false, completed_at: null },
  // TypeScript modules
  { id: 'demo-module-7', course_id: 'demo-course-2', name: 'Tipos Básicos', hours: 5, order_index: 0, is_completed: true, completed_at: format(subDays(today, 12), 'yyyy-MM-dd') },
  { id: 'demo-module-8', course_id: 'demo-course-2', name: 'Interfaces', hours: 5, order_index: 1, is_completed: true, completed_at: format(subDays(today, 7), 'yyyy-MM-dd') },
  { id: 'demo-module-9', course_id: 'demo-course-2', name: 'Generics', hours: 5, order_index: 2, is_completed: true, completed_at: format(subDays(today, 2), 'yyyy-MM-dd') },
  { id: 'demo-module-10', course_id: 'demo-course-2', name: 'Tipos Avançados', hours: 5, order_index: 3, is_completed: false, completed_at: null },
  { id: 'demo-module-11', course_id: 'demo-course-2', name: 'Decorators', hours: 5, order_index: 4, is_completed: false, completed_at: null },
];

// Demo Tasks
export const demoTasks = [
  {
    id: 'demo-task-1',
    user_id: 'demo-user-id',
    title: 'Estudar React Hooks',
    description: 'Revisar useCallback e useMemo',
    status: 'completed',
    priority: 'high',
    due_date: format(subDays(today, 2), 'yyyy-MM-dd'),
    course_id: 'demo-course-1',
    completed_at: format(subDays(today, 2), 'yyyy-MM-dd'),
    created_at: format(subDays(today, 5), 'yyyy-MM-dd'),
    updated_at: format(subDays(today, 2), 'yyyy-MM-dd'),
  },
  {
    id: 'demo-task-2',
    user_id: 'demo-user-id',
    title: 'Praticar TypeScript Generics',
    description: 'Fazer exercícios do módulo 3',
    status: 'in_progress',
    priority: 'high',
    due_date: format(today, 'yyyy-MM-dd'),
    course_id: 'demo-course-2',
    completed_at: null,
    created_at: format(subDays(today, 3), 'yyyy-MM-dd'),
    updated_at: format(today, 'yyyy-MM-dd'),
  },
  {
    id: 'demo-task-3',
    user_id: 'demo-user-id',
    title: 'Assistir aula de Context API',
    description: 'Aula 5 do módulo avançado',
    status: 'pending',
    priority: 'normal',
    due_date: format(addDays(today, 2), 'yyyy-MM-dd'),
    course_id: 'demo-course-1',
    completed_at: null,
    created_at: format(subDays(today, 1), 'yyyy-MM-dd'),
    updated_at: format(subDays(today, 1), 'yyyy-MM-dd'),
  },
  {
    id: 'demo-task-4',
    user_id: 'demo-user-id',
    title: 'Revisar anotações de Performance',
    description: 'Preparar resumo do módulo',
    status: 'pending',
    priority: 'low',
    due_date: format(addDays(today, 5), 'yyyy-MM-dd'),
    course_id: 'demo-course-1',
    completed_at: null,
    created_at: format(today, 'yyyy-MM-dd'),
    updated_at: format(today, 'yyyy-MM-dd'),
  },
  {
    id: 'demo-task-5',
    user_id: 'demo-user-id',
    title: 'Configurar ambiente Node.js',
    description: 'Preparar projeto para o novo curso',
    status: 'pending',
    priority: 'normal',
    due_date: format(addDays(today, 7), 'yyyy-MM-dd'),
    course_id: 'demo-course-3',
    completed_at: null,
    created_at: format(today, 'yyyy-MM-dd'),
    updated_at: format(today, 'yyyy-MM-dd'),
  },
];

// Demo Focus Sessions (last 7 days)
export const demoFocusSessions = [
  { id: 'demo-focus-1', user_id: 'demo-user-id', duration_minutes: 25, session_type: 'work', completed_at: format(subDays(today, 6), 'yyyy-MM-dd HH:mm:ss'), course_id: 'demo-course-1' },
  { id: 'demo-focus-2', user_id: 'demo-user-id', duration_minutes: 25, session_type: 'work', completed_at: format(subDays(today, 6), 'yyyy-MM-dd HH:mm:ss'), course_id: 'demo-course-1' },
  { id: 'demo-focus-3', user_id: 'demo-user-id', duration_minutes: 25, session_type: 'work', completed_at: format(subDays(today, 5), 'yyyy-MM-dd HH:mm:ss'), course_id: 'demo-course-2' },
  { id: 'demo-focus-4', user_id: 'demo-user-id', duration_minutes: 50, session_type: 'work', completed_at: format(subDays(today, 5), 'yyyy-MM-dd HH:mm:ss'), course_id: 'demo-course-1' },
  { id: 'demo-focus-5', user_id: 'demo-user-id', duration_minutes: 25, session_type: 'work', completed_at: format(subDays(today, 4), 'yyyy-MM-dd HH:mm:ss'), course_id: 'demo-course-2' },
  { id: 'demo-focus-6', user_id: 'demo-user-id', duration_minutes: 25, session_type: 'work', completed_at: format(subDays(today, 4), 'yyyy-MM-dd HH:mm:ss'), course_id: 'demo-course-1' },
  { id: 'demo-focus-7', user_id: 'demo-user-id', duration_minutes: 50, session_type: 'work', completed_at: format(subDays(today, 3), 'yyyy-MM-dd HH:mm:ss'), course_id: 'demo-course-1' },
  { id: 'demo-focus-8', user_id: 'demo-user-id', duration_minutes: 25, session_type: 'work', completed_at: format(subDays(today, 3), 'yyyy-MM-dd HH:mm:ss'), course_id: 'demo-course-2' },
  { id: 'demo-focus-9', user_id: 'demo-user-id', duration_minutes: 25, session_type: 'work', completed_at: format(subDays(today, 2), 'yyyy-MM-dd HH:mm:ss'), course_id: 'demo-course-1' },
  { id: 'demo-focus-10', user_id: 'demo-user-id', duration_minutes: 50, session_type: 'work', completed_at: format(subDays(today, 2), 'yyyy-MM-dd HH:mm:ss'), course_id: 'demo-course-2' },
  { id: 'demo-focus-11', user_id: 'demo-user-id', duration_minutes: 25, session_type: 'work', completed_at: format(subDays(today, 1), 'yyyy-MM-dd HH:mm:ss'), course_id: 'demo-course-1' },
  { id: 'demo-focus-12', user_id: 'demo-user-id', duration_minutes: 25, session_type: 'work', completed_at: format(subDays(today, 1), 'yyyy-MM-dd HH:mm:ss'), course_id: 'demo-course-1' },
  { id: 'demo-focus-13', user_id: 'demo-user-id', duration_minutes: 25, session_type: 'work', completed_at: format(today, 'yyyy-MM-dd HH:mm:ss'), course_id: 'demo-course-2' },
];

// Demo Weekly Goals
export const demoWeeklyGoals = [
  {
    id: 'demo-weekly-1',
    user_id: 'demo-user-id',
    title: 'Estudar 15 horas',
    goal_type: 'hours',
    target_value: 15,
    current_value: 10.5,
    week_start: format(weekStart, 'yyyy-MM-dd'),
    week_end: format(weekEnd, 'yyyy-MM-dd'),
    is_completed: false,
    created_at: format(weekStart, 'yyyy-MM-dd'),
    updated_at: format(today, 'yyyy-MM-dd'),
  },
  {
    id: 'demo-weekly-2',
    user_id: 'demo-user-id',
    title: 'Completar 5 tarefas',
    goal_type: 'tasks',
    target_value: 5,
    current_value: 3,
    week_start: format(weekStart, 'yyyy-MM-dd'),
    week_end: format(weekEnd, 'yyyy-MM-dd'),
    is_completed: false,
    created_at: format(weekStart, 'yyyy-MM-dd'),
    updated_at: format(today, 'yyyy-MM-dd'),
  },
];

// Demo Monthly Goals
export const demoMonthlyGoals = [
  {
    id: 'demo-monthly-1',
    user_id: 'demo-user-id',
    title: 'Estudar 60 horas',
    goal_type: 'hours',
    target_value: 60,
    current_value: 43,
    month_start: format(monthStart, 'yyyy-MM-dd'),
    month_end: format(monthEnd, 'yyyy-MM-dd'),
    is_completed: false,
    created_at: format(monthStart, 'yyyy-MM-dd'),
    updated_at: format(today, 'yyyy-MM-dd'),
  },
  {
    id: 'demo-monthly-2',
    user_id: 'demo-user-id',
    title: 'Completar 1 curso',
    goal_type: 'courses',
    target_value: 1,
    current_value: 0,
    month_start: format(monthStart, 'yyyy-MM-dd'),
    month_end: format(monthEnd, 'yyyy-MM-dd'),
    is_completed: false,
    created_at: format(monthStart, 'yyyy-MM-dd'),
    updated_at: format(today, 'yyyy-MM-dd'),
  },
];

// Demo Study Plans
export const demoStudyPlans = [
  {
    id: 'demo-plan-1',
    user_id: 'demo-user-id',
    name: 'Plano Frontend Avançado',
    description: 'Dominar React e TypeScript para se tornar um desenvolvedor frontend sênior',
    start_date: format(subDays(today, 30), 'yyyy-MM-dd'),
    end_date: format(addDays(today, 60), 'yyyy-MM-dd'),
    planning_type: 'course',
    daily_hours: 2,
    total_hours: 65,
    study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    created_at: format(subDays(today, 30), 'yyyy-MM-dd'),
    updated_at: format(today, 'yyyy-MM-dd'),
  },
];

// Demo Study Notes
export const demoStudyNotes = [
  {
    id: 'demo-note-1',
    user_id: 'demo-user-id',
    title: 'Resumo: React Hooks',
    content: '<p>Os hooks são uma forma de usar estado e outras funcionalidades do React sem escrever classes.</p><ul><li><strong>useState</strong>: Gerencia estado local</li><li><strong>useEffect</strong>: Efeitos colaterais</li><li><strong>useContext</strong>: Acessa contexto</li><li><strong>useCallback</strong>: Memoriza funções</li><li><strong>useMemo</strong>: Memoriza valores</li></ul>',
    course_id: 'demo-course-1',
    tags: ['react', 'hooks', 'frontend'],
    mood: 'focused',
    created_at: format(subDays(today, 10), 'yyyy-MM-dd'),
    updated_at: format(subDays(today, 5), 'yyyy-MM-dd'),
  },
  {
    id: 'demo-note-2',
    user_id: 'demo-user-id',
    title: 'TypeScript Generics',
    content: '<p>Generics permitem criar componentes reutilizáveis que funcionam com diferentes tipos.</p><pre><code>function identity<T>(arg: T): T {\n  return arg;\n}</code></pre>',
    course_id: 'demo-course-2',
    tags: ['typescript', 'generics'],
    mood: 'curious',
    created_at: format(subDays(today, 5), 'yyyy-MM-dd'),
    updated_at: format(subDays(today, 2), 'yyyy-MM-dd'),
  },
];

// Demo Achievements
export const demoAchievements = [
  { id: 'demo-ach-1', name: 'Primeiro Passo', description: 'Complete sua primeira tarefa', icon: '🎯', category: 'tasks', requirement_type: 'tasks_completed', requirement_value: 1, experience_reward: 50 },
  { id: 'demo-ach-2', name: 'Estudante Dedicado', description: 'Estude por 10 horas', icon: '📚', category: 'study', requirement_type: 'study_hours', requirement_value: 10, experience_reward: 100 },
  { id: 'demo-ach-3', name: 'Foco Total', description: 'Complete 10 sessões de foco', icon: '🧘', category: 'focus', requirement_type: 'focus_sessions', requirement_value: 10, experience_reward: 75 },
  { id: 'demo-ach-4', name: 'Streak de 7 dias', description: 'Estude por 7 dias seguidos', icon: '🔥', category: 'streak', requirement_type: 'streak_days', requirement_value: 7, experience_reward: 150 },
  { id: 'demo-ach-5', name: 'Primeiro Curso', description: 'Complete seu primeiro curso', icon: '🎓', category: 'courses', requirement_type: 'courses_completed', requirement_value: 1, experience_reward: 200 },
];

export const demoUserAchievements = [
  { id: 'demo-user-ach-1', user_id: 'demo-user-id', achievement_id: 'demo-ach-1', unlocked_at: format(subDays(today, 55), 'yyyy-MM-dd') },
  { id: 'demo-user-ach-2', user_id: 'demo-user-id', achievement_id: 'demo-ach-2', unlocked_at: format(subDays(today, 40), 'yyyy-MM-dd') },
  { id: 'demo-user-ach-3', user_id: 'demo-user-id', achievement_id: 'demo-ach-3', unlocked_at: format(subDays(today, 30), 'yyyy-MM-dd') },
  { id: 'demo-user-ach-4', user_id: 'demo-user-id', achievement_id: 'demo-ach-4', unlocked_at: format(subDays(today, 20), 'yyyy-MM-dd') },
  { id: 'demo-user-ach-5', user_id: 'demo-user-id', achievement_id: 'demo-ach-5', unlocked_at: format(subDays(today, 10), 'yyyy-MM-dd') },
];

// Demo Addiction Profile (AntiVicio)
export const demoAddictionProfile = {
  id: 'demo-addiction-profile-1',
  user_id: 'demo-user-id',
  addiction_types: ['redes_sociais', 'jogos'],
  dependency_level: 4,
  study_impact_level: 3,
  critical_hours: ['22:00', '23:00', '14:00'],
  associated_emotions: ['tédio', 'ansiedade', 'procrastinação'],
  onboarding_completed: true,
  created_at: format(subDays(today, 45), 'yyyy-MM-dd'),
  updated_at: format(today, 'yyyy-MM-dd'),
};

// Demo Clean Streaks
export const demoCleanStreaks = [
  {
    id: 'demo-streak-1',
    user_id: 'demo-user-id',
    addiction_type: 'redes_sociais',
    current_streak: 8,
    longest_streak: 15,
    last_clean_date: format(today, 'yyyy-MM-dd'),
    created_at: format(subDays(today, 45), 'yyyy-MM-dd'),
    updated_at: format(today, 'yyyy-MM-dd'),
  },
  {
    id: 'demo-streak-2',
    user_id: 'demo-user-id',
    addiction_type: 'jogos',
    current_streak: 12,
    longest_streak: 12,
    last_clean_date: format(today, 'yyyy-MM-dd'),
    created_at: format(subDays(today, 45), 'yyyy-MM-dd'),
    updated_at: format(today, 'yyyy-MM-dd'),
  },
];

// Demo Impulse Logs
export const demoImpulseLogs = [
  { id: 'demo-impulse-1', user_id: 'demo-user-id', trigger_type: 'tédio', intensity: 7, resisted: true, occurred_during_study: false, created_at: format(subDays(today, 3), 'yyyy-MM-dd HH:mm:ss') },
  { id: 'demo-impulse-2', user_id: 'demo-user-id', trigger_type: 'ansiedade', intensity: 5, resisted: true, occurred_during_study: true, created_at: format(subDays(today, 2), 'yyyy-MM-dd HH:mm:ss') },
  { id: 'demo-impulse-3', user_id: 'demo-user-id', trigger_type: 'procrastinação', intensity: 8, resisted: false, occurred_during_study: true, created_at: format(subDays(today, 1), 'yyyy-MM-dd HH:mm:ss') },
];

// Demo Projects (Portfolio)
export const demoProjects = [
  {
    id: 'demo-project-1',
    user_id: 'demo-user-id',
    title: 'E-commerce React',
    description: 'Loja virtual completa com carrinho, pagamentos e dashboard admin',
    image_url: null,
    project_url: 'https://github.com/demo/ecommerce',
    technologies: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    is_featured: true,
    order_index: 0,
    created_at: format(subDays(today, 90), 'yyyy-MM-dd'),
    updated_at: format(subDays(today, 30), 'yyyy-MM-dd'),
  },
  {
    id: 'demo-project-2',
    user_id: 'demo-user-id',
    title: 'Task Manager API',
    description: 'API RESTful para gerenciamento de tarefas com autenticação JWT',
    image_url: null,
    project_url: 'https://github.com/demo/task-api',
    technologies: ['Node.js', 'Express', 'MongoDB', 'JWT'],
    is_featured: true,
    order_index: 1,
    created_at: format(subDays(today, 60), 'yyyy-MM-dd'),
    updated_at: format(subDays(today, 15), 'yyyy-MM-dd'),
  },
];

// Demo Certificates
export const demoCertificates = [
  {
    id: 'demo-cert-1',
    user_id: 'demo-user-id',
    title: 'React Developer Certification',
    issuer: 'Meta',
    issue_date: format(subDays(today, 30), 'yyyy-MM-dd'),
    credential_id: 'REACT-2024-001',
    credential_url: 'https://example.com/cert/react',
    course_id: null,
    created_at: format(subDays(today, 30), 'yyyy-MM-dd'),
  },
  {
    id: 'demo-cert-2',
    user_id: 'demo-user-id',
    title: 'JavaScript Algorithms',
    issuer: 'freeCodeCamp',
    issue_date: format(subDays(today, 60), 'yyyy-MM-dd'),
    credential_id: 'FCC-JS-2024',
    credential_url: 'https://example.com/cert/js',
    course_id: null,
    created_at: format(subDays(today, 60), 'yyyy-MM-dd'),
  },
];

// Demo Social Links
export const demoSocialLinks = {
  id: 'demo-social-1',
  user_id: 'demo-user-id',
  github: 'https://github.com/demo-user',
  linkedin: 'https://linkedin.com/in/demo-user',
  twitter: 'https://twitter.com/demo_user',
  portfolio: 'https://demo-portfolio.dev',
  instagram: null,
  website: null,
  created_at: format(subDays(today, 45), 'yyyy-MM-dd'),
  updated_at: format(today, 'yyyy-MM-dd'),
};

// Calculated demo stats
export const getDemoStats = () => {
  const activeCourses = demoCourses.filter(c => c.status !== 'completed');
  const completedCourses = demoCourses.filter(c => c.status === 'completed');
  const courseCompletedHours = demoCourses.reduce((sum, c) => sum + (c.completed_hours || 0), 0);
  const totalCourseHours = activeCourses.reduce((sum, c) => sum + (c.total_hours || 0), 0);
  const totalFocusMinutes = demoFocusSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const completedTasks = demoTasks.filter(t => t.status === 'completed');

  return {
    courseCompletedHours,
    totalFocusMinutes,
    activeCourses: activeCourses.length,
    inProgressCourses: activeCourses.filter(c => c.status === 'in_progress').length,
    completedCourses: completedCourses.length,
    completedTasks: completedTasks.length,
    totalTasks: demoTasks.length,
    streakDays: demoProfile.streak_days,
    level: demoProfile.level,
    achievements: demoUserAchievements.length,
    totalCourseHours,
  };
};
