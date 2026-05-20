// Course Export/Import utilities
import { supabase } from '@/integrations/supabase/client';

export interface ExportedSubModule {
  name: string;
  hours: number;
  is_completed: boolean;
  order_index: number;
}

export interface ExportedCourse {
  name: string;
  description: string | null;
  category: string | null;
  total_hours: number;
  completed_hours: number;
  status: string;
  is_favorite: boolean;
  modules?: ExportedModule[];
}

export interface ExportedModule {
  name: string;
  hours: number;
  is_completed: boolean;
  order_index: number;
  is_parent?: boolean;
  subModules?: ExportedSubModule[];
}

export interface ExportData {
  version: string;
  exportedAt: string;
  appName: string;
  courses: ExportedCourse[];
}

export async function exportCourses(userId: string, courseIds?: string[]): Promise<ExportData> {
  // Fetch courses for the user (all or specific ones)
  let query = supabase
    .from('courses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (courseIds && courseIds.length > 0) {
    query = query.in('id', courseIds);
  }

  const { data: courses, error: coursesError } = await query;

  if (coursesError) {
    throw new Error(`Erro ao buscar cursos: ${coursesError.message}`);
  }

  // Fetch all modules for all courses
  const allCourseIds = (courses || []).map(c => c.id);
  const { data: modules, error: modulesError } = await supabase
    .from('course_modules')
    .select('*')
    .in('course_id', allCourseIds)
    .order('order_index', { ascending: true });

  if (modulesError) {
    throw new Error(`Erro ao buscar módulos: ${modulesError.message}`);
  }

  // Fetch all submodules
  const allModuleIds = (modules || []).map(m => m.id);
  let subModulesData: any[] = [];
  if (allModuleIds.length > 0) {
    const { data, error: subError } = await supabase
      .from('course_submodules')
      .select('*')
      .in('module_id', allModuleIds)
      .order('order_index', { ascending: true });
    
    if (!subError) {
      subModulesData = data || [];
    }
  }

  // Group submodules by module_id
  const subModulesByModule: Record<string, ExportedSubModule[]> = {};
  subModulesData.forEach(sub => {
    if (!subModulesByModule[sub.module_id]) {
      subModulesByModule[sub.module_id] = [];
    }
    subModulesByModule[sub.module_id].push({
      name: sub.name,
      hours: sub.hours || 0.5,
      is_completed: sub.is_completed || false,
      order_index: sub.order_index || 0,
    });
  });

  // Map modules to their courses
  const modulesByCourse = (modules || []).reduce((acc, module) => {
    if (!acc[module.course_id]) {
      acc[module.course_id] = [];
    }
    acc[module.course_id].push({
      name: module.name,
      hours: module.hours,
      is_completed: module.is_completed || false,
      order_index: module.order_index,
      is_parent: module.is_parent || false,
      subModules: subModulesByModule[module.id] || [],
    });
    return acc;
  }, {} as Record<string, ExportedModule[]>);

  // Build export data — recalculate total_hours from modules for accuracy
  const exportedCourses: ExportedCourse[] = (courses || []).map(course => {
    const courseModules = modulesByCourse[course.id] || [];
    
    // Recalculate total from modules
    const calculatedTotal = courseModules.reduce((sum, m) => {
      if (m.subModules && m.subModules.length > 0) {
        return sum + m.subModules.reduce((subSum, s) => subSum + s.hours, 0);
      }
      return sum + m.hours;
    }, 0);
    
    // Recalculate completed from modules
    const calculatedCompleted = courseModules.reduce((sum, m) => {
      if (m.subModules && m.subModules.length > 0) {
        return sum + m.subModules.filter(s => s.is_completed).reduce((subSum, s) => subSum + s.hours, 0);
      }
      return sum + (m.is_completed ? m.hours : 0);
    }, 0);

    return {
      name: course.name,
      description: course.description,
      category: course.category,
      total_hours: calculatedTotal > 0 ? calculatedTotal : (course.total_hours || 0),
      completed_hours: calculatedCompleted,
      status: course.status || 'pending',
      is_favorite: course.is_favorite || false,
      modules: courseModules,
    };
  });

  return {
    version: '1.1',
    exportedAt: new Date().toISOString(),
    appName: 'StudyFlow',
    courses: exportedCourses,
  };
}

export function downloadExportFile(data: ExportData, filename?: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const date = new Date().toISOString().split('T')[0];
  const defaultFilename = `studyflow-backup-${date}.json`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importCourses(
  userId: string, 
  data: ExportData,
  options: { skipExisting?: boolean; selectedCourses?: string[] } = {}
): Promise<{ imported: number; skipped: number }> {
  const { skipExisting = true, selectedCourses } = options;
  
  // Validate export data
  if (!data.courses || !Array.isArray(data.courses)) {
    throw new Error('Arquivo de backup inválido');
  }

  // Get existing course names to check for duplicates
  const { data: existingCourses } = await supabase
    .from('courses')
    .select('name')
    .eq('user_id', userId);

  const existingNames = new Set((existingCourses || []).map(c => c.name.toLowerCase()));
  
  let imported = 0;
  let skipped = 0;

  // Filter courses if selectedCourses is provided
  const coursesToImport = selectedCourses 
    ? data.courses.filter(c => selectedCourses.includes(c.name))
    : data.courses;

  for (const course of coursesToImport) {
    // Check for duplicate
    if (skipExisting && existingNames.has(course.name.toLowerCase())) {
      skipped++;
      continue;
    }

    // Calculate total_hours from modules for accuracy
    let calculatedTotal = 0;
    let calculatedCompleted = 0;
    
    if (course.modules && course.modules.length > 0) {
      for (const m of course.modules) {
        if (m.subModules && m.subModules.length > 0) {
          const subTotal = m.subModules.reduce((sum, s) => sum + s.hours, 0);
          calculatedTotal += subTotal;
          calculatedCompleted += m.subModules.filter(s => s.is_completed).reduce((sum, s) => sum + s.hours, 0);
        } else {
          calculatedTotal += m.hours;
          if (m.is_completed) calculatedCompleted += m.hours;
        }
      }
    } else {
      calculatedTotal = course.total_hours || 0;
      calculatedCompleted = course.completed_hours || 0;
    }

    // Insert course
    const { data: newCourse, error: courseError } = await supabase
      .from('courses')
      .insert({
        user_id: userId,
        name: course.name,
        description: course.description,
        category: course.category,
        total_hours: calculatedTotal,
        completed_hours: calculatedCompleted,
        status: course.status || 'pending',
        is_favorite: course.is_favorite || false,
      })
      .select()
      .single();

    if (courseError) {
      console.error(`Erro ao importar curso ${course.name}:`, courseError);
      continue;
    }

    // Insert modules if any
    if (course.modules && course.modules.length > 0 && newCourse) {
      const modulesToInsert = course.modules.map(m => ({
        course_id: newCourse.id,
        name: m.name,
        hours: m.hours,
        is_completed: m.is_completed,
        order_index: m.order_index,
        is_parent: (m.subModules && m.subModules.length > 0) || m.is_parent || false,
      }));

      const { data: insertedModules, error: modulesError } = await supabase
        .from('course_modules')
        .insert(modulesToInsert)
        .select();

      if (modulesError) {
        console.error(`Erro ao importar módulos do curso ${course.name}:`, modulesError);
      } else if (insertedModules) {
        // Insert submodules
        const subModulesToInsert: { module_id: string; name: string; hours: number; order_index: number; is_completed: boolean; completed_at: string | null }[] = [];
        
        course.modules.forEach((m, mIndex) => {
          const insertedModule = insertedModules[mIndex];
          if (insertedModule && m.subModules && m.subModules.length > 0) {
            m.subModules.forEach(sub => {
              subModulesToInsert.push({
                module_id: insertedModule.id,
                name: sub.name,
                hours: sub.hours,
                order_index: sub.order_index,
                is_completed: sub.is_completed || false,
                completed_at: sub.is_completed ? new Date().toISOString() : null,
              });
            });
          }
        });

        if (subModulesToInsert.length > 0) {
          const { error: subError } = await supabase
            .from('course_submodules')
            .insert(subModulesToInsert);

          if (subError) {
            console.error(`Erro ao importar submódulos do curso ${course.name}:`, subError);
          }
        }
      }
    }

    imported++;
  }

  return { imported, skipped };
}

export function parseImportFile(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as ExportData;
        
        // Basic validation - accept both StudyFlow and FD-Planner exports
        if (!data.appName || (data.appName !== 'StudyFlow' && data.appName !== 'FD-Planner')) {
          reject(new Error('Este arquivo não é um backup válido do StudyFlow'));
          return;
        }
        
        if (!data.courses || !Array.isArray(data.courses)) {
          reject(new Error('Arquivo de backup corrompido ou inválido'));
          return;
        }
        
        resolve(data);
      } catch (error) {
        reject(new Error('Não foi possível ler o arquivo. Verifique se é um arquivo JSON válido.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo'));
    };
    
    reader.readAsText(file);
  });
}
