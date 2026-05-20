/**
 * Gerador Automático de Planos de Estudo para Faculdades
 * 
 * Distribui uniformemente os módulos de múltiplas disciplinas ao longo do período letivo,
 * alternando entre disciplinas para garantir estudo equilibrado.
 */

import { addDays, differenceInDays, format } from 'date-fns';

export interface DisciplineModule {
  id: string;
  name: string;
  hours: number;
  disciplineId: string;
  disciplineName: string;
  orderIndex: number;
}

export interface Discipline {
  id: string;
  name: string;
  modules: DisciplineModule[];
  totalHours: number;
}

export interface Faculty {
  id: string;
  name: string;
  disciplines: Discipline[];
}

export interface StudyBlock {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // monday, tuesday, etc
  moduleId: string;
  moduleName: string;
  disciplineId: string;
  disciplineName: string;
  facultyId: string;
  facultyName: string;
  hours: number;
  startTime: string; // HH:mm:ss
  endTime: string; // HH:mm:ss
  sequenceInDay: number; // 1, 2, 3... (ordem no dia)
}

export interface GeneratedPlan {
  studyBlocks: StudyBlock[];
  totalDays: number;
  totalHours: number;
  disciplinesCount: number;
  modulesCount: number;
  averageHoursPerDay: number;
}

const DAY_MAP: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

/**
 * Gera um plano de estudos automático para faculdades
 * 
 * Algoritmo:
 * 1. Coleta todos os módulos de todas as disciplinas
 * 2. Calcula quantos dias de estudo estão disponíveis
 * 3. Distribui os módulos uniformemente, alternando entre disciplinas
 * 4. Garante que módulos da mesma disciplina sejam estudados em sequência
 * 
 * @param faculties - Lista de faculdades com suas disciplinas e módulos
 * @param startDate - Data de início do período letivo (YYYY-MM-DD)
 * @param endDate - Data de fim do período letivo (YYYY-MM-DD)
 * @param studyDays - Dias da semana disponíveis para estudo (ex: ['monday', 'wednesday', 'friday'])
 * @param dailyHours - Horas de estudo por dia
 * @param defaultStartTime - Horário padrão de início (HH:mm:ss)
 * @returns Plano de estudos gerado
 */
export function generateFacultyStudyPlan(
  faculties: Faculty[],
  startDate: string,
  endDate: string,
  studyDays: string[],
  dailyHours: number = 2,
  defaultStartTime: string = '08:00:00'
): GeneratedPlan {
  // 1. Coletar todos os módulos de todas as disciplinas
  const allModules: Array<DisciplineModule & { facultyId: string; facultyName: string }> = [];
  
  faculties.forEach(faculty => {
    faculty.disciplines.forEach(discipline => {
      discipline.modules.forEach(module => {
        allModules.push({
          ...module,
          facultyId: faculty.id,
          facultyName: faculty.name,
        });
      });
    });
  });

  if (allModules.length === 0) {
    return {
      studyBlocks: [],
      totalDays: 0,
      totalHours: 0,
      disciplinesCount: 0,
      modulesCount: 0,
      averageHoursPerDay: 0,
    };
  }

  // 2. Calcular dias disponíveis para estudo
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDaysInPeriod = differenceInDays(end, start) + 1;
  
  const availableDates: string[] = [];
  for (let i = 0; i < totalDaysInPeriod; i++) {
    const currentDate = addDays(start, i);
    const dayOfWeek = DAY_MAP[currentDate.getDay()];
    
    if (studyDays.includes(dayOfWeek)) {
      availableDates.push(format(currentDate, 'yyyy-MM-dd'));
    }
  }

  if (availableDates.length === 0) {
    throw new Error('Nenhum dia de estudo disponível no período selecionado');
  }

  // 3. Organizar módulos por disciplina para distribuição alternada
  const modulesByDiscipline: Record<string, Array<DisciplineModule & { facultyId: string; facultyName: string }>> = {};
  
  allModules.forEach(module => {
    if (!modulesByDiscipline[module.disciplineId]) {
      modulesByDiscipline[module.disciplineId] = [];
    }
    modulesByDiscipline[module.disciplineId].push(module);
  });

  // Ordenar módulos dentro de cada disciplina por order_index
  Object.values(modulesByDiscipline).forEach(modules => {
    modules.sort((a, b) => a.orderIndex - b.orderIndex);
  });

  // 4. Distribuir módulos alternando entre disciplinas (Round-Robin)
  const studyBlocks: StudyBlock[] = [];
  const disciplineIds = Object.keys(modulesByDiscipline);
  const disciplinePointers: Record<string, number> = {};
  
  // Inicializar ponteiros para cada disciplina
  disciplineIds.forEach(id => {
    disciplinePointers[id] = 0;
  });

  let currentDateIndex = 0;
  let currentDisciplineIndex = 0;
  let totalModulesPlaced = 0;
  const totalModules = allModules.length;

  // Distribuir módulos
  while (totalModulesPlaced < totalModules && currentDateIndex < availableDates.length) {
    const currentDate = availableDates[currentDateIndex];
    const currentDateObj = new Date(currentDate);
    const dayOfWeek = DAY_MAP[currentDateObj.getDay()];
    
    let modulesPlacedToday = 0;
    let hoursUsedToday = 0;
    let sequenceInDay = 1;

    // Tentar colocar módulos até atingir o limite de horas diárias
    while (hoursUsedToday < dailyHours && totalModulesPlaced < totalModules) {
      // Encontrar próxima disciplina com módulos disponíveis
      let attempts = 0;
      let foundModule = false;

      while (attempts < disciplineIds.length && !foundModule) {
        const disciplineId = disciplineIds[currentDisciplineIndex];
        const modules = modulesByDiscipline[disciplineId];
        const pointer = disciplinePointers[disciplineId];

        if (pointer < modules.length) {
          const module = modules[pointer];
          
          // Verificar se o módulo cabe nas horas restantes do dia
          if (hoursUsedToday + module.hours <= dailyHours) {
            // Calcular horários
            const startHour = parseInt(defaultStartTime.split(':')[0]);
            const startMinute = parseInt(defaultStartTime.split(':')[1]);
            const totalMinutesStart = startHour * 60 + startMinute + (hoursUsedToday * 60);
            const totalMinutesEnd = totalMinutesStart + (module.hours * 60);
            
            const startTime = `${Math.floor(totalMinutesStart / 60).toString().padStart(2, '0')}:${(totalMinutesStart % 60).toString().padStart(2, '0')}:00`;
            const endTime = `${Math.floor(totalMinutesEnd / 60).toString().padStart(2, '0')}:${(totalMinutesEnd % 60).toString().padStart(2, '0')}:00`;

            studyBlocks.push({
              date: currentDate,
              dayOfWeek,
              moduleId: module.id,
              moduleName: module.name,
              disciplineId: module.disciplineId,
              disciplineName: module.disciplineName,
              facultyId: module.facultyId,
              facultyName: module.facultyName,
              hours: module.hours,
              startTime,
              endTime,
              sequenceInDay,
            });

            hoursUsedToday += module.hours;
            modulesPlacedToday++;
            sequenceInDay++;
            totalModulesPlaced++;
            disciplinePointers[disciplineId]++;
            foundModule = true;
          }
        }

        // Avançar para próxima disciplina
        currentDisciplineIndex = (currentDisciplineIndex + 1) % disciplineIds.length;
        attempts++;
      }

      // Se não encontrou nenhum módulo que caiba, avançar para o próximo dia
      if (!foundModule) {
        break;
      }
    }

    // Avançar para o próximo dia
    currentDateIndex++;
  }

  // 5. Calcular estatísticas
  const totalHours = studyBlocks.reduce((sum, block) => sum + block.hours, 0);
  const uniqueDisciplines = new Set(studyBlocks.map(b => b.disciplineId)).size;
  const daysUsed = new Set(studyBlocks.map(b => b.date)).size;

  return {
    studyBlocks,
    totalDays: daysUsed,
    totalHours,
    disciplinesCount: uniqueDisciplines,
    modulesCount: studyBlocks.length,
    averageHoursPerDay: daysUsed > 0 ? totalHours / daysUsed : 0,
  };
}

/**
 * Valida se um plano gerado é viável
 */
export function validateGeneratedPlan(plan: GeneratedPlan, expectedModulesCount: number): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (plan.modulesCount === 0) {
    errors.push('Nenhum módulo foi incluído no plano');
  }

  if (plan.modulesCount < expectedModulesCount) {
    warnings.push(`Apenas ${plan.modulesCount} de ${expectedModulesCount} módulos foram incluídos. Considere aumentar o período ou reduzir as horas por módulo.`);
  }

  if (plan.averageHoursPerDay > 8) {
    warnings.push(`Média de ${plan.averageHoursPerDay.toFixed(1)}h por dia pode ser muito alta. Considere aumentar o período.`);
  }

  if (plan.averageHoursPerDay < 1) {
    warnings.push(`Média de ${plan.averageHoursPerDay.toFixed(1)}h por dia pode ser muito baixa. Considere reduzir o período ou aumentar as horas diárias.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
