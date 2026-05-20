/**
 * Custom Hook: useCourses
 * Gerencia estado e operações de cursos
 */

import { useState, useEffect, useCallback } from 'react';
import { CourseService, Course } from '@/services/courseService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useCourses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCourses = useCallback(async () => {
    if (!user) {
      setCourses([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await CourseService.getCourses();
      setCourses(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao carregar cursos');
      setError(error);
      toast({
        title: 'Erro ao carregar cursos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const createCourse = useCallback(async (courseData: Partial<Course>) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const newCourse = await CourseService.createCourse(courseData);
      setCourses(prev => [...prev, newCourse]);
      toast({
        title: 'Curso criado!',
        description: 'O curso foi adicionado com sucesso.',
      });
      return newCourse;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao criar curso');
      toast({
        title: 'Erro ao criar curso',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  }, [user, toast]);

  const updateCourse = useCallback(async (courseId: string, updates: Partial<Course>) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const updatedCourse = await CourseService.updateCourse(courseId, updates);
      setCourses(prev => prev.map(c => c.id === courseId ? updatedCourse : c));
      toast({
        title: 'Curso atualizado!',
        description: 'As alterações foram salvas.',
      });
      return updatedCourse;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao atualizar curso');
      toast({
        title: 'Erro ao atualizar curso',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  }, [user, toast]);

  const deleteCourse = useCallback(async (courseId: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      await CourseService.deleteCourse(courseId);
      setCourses(prev => prev.filter(c => c.id !== courseId));
      toast({
        title: 'Curso excluído',
        description: 'O curso foi removido com sucesso.',
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao excluir curso');
      toast({
        title: 'Erro ao excluir curso',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  }, [user, toast]);

  const refetch = useCallback(() => {
    if (user) {
      CourseService.invalidateCache(user.id);
      fetchCourses();
    }
  }, [user, fetchCourses]);

  return {
    courses,
    isLoading,
    error,
    createCourse,
    updateCourse,
    deleteCourse,
    refetch,
  };
}
