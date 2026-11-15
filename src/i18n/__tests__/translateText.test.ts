import { describe, expect, it } from 'vitest';
import { createTranslator, translateDates } from '@/i18n/translateText';
import dictionary from '@/i18n/dictionary.en.json';

const t = createTranslator({
  exact: { Salvar: 'Save', Carregando: 'Loading', 'Pomodoro Clássico': 'Classic Pomodoro', Cursos: 'Courses' },
  patterns: { 'em {0} dias': 'in {0} days', '{0} cursos ativos': '{0} active courses' },
});

describe('createTranslator', () => {
  it('troca a frase exata e mantém os espaços das pontas', () => {
    expect(t('  Salvar ')).toBe('  Save ');
  });
  it('aceita ":" e "..." no fim', () => {
    expect(t('Carregando...')).toBe('Loading...');
    expect(t('Cursos:')).toBe('Courses:');
  });
  it('preenche modelos com valores', () => {
    expect(t('em 3 dias')).toBe('in 3 days');
    expect(t('12 cursos ativos')).toBe('12 active courses');
  });
  it('traduz partes separadas por " · "', () => {
    expect(t('Pomodoro Clássico · 25/5 min')).toBe('Classic Pomodoro · 25/5 min');
  });
  it('deixa textos sem tradução como estão (null)', () => {
    expect(t('Meu livro favorito')).toBeNull();
    expect(t('1.234')).toBeNull();
  });
});

describe('translateDates', () => {
  it('converte datas e dias da semana por extenso', () => {
    expect(translateDates('domingo, 15 de novembro de 2026')).toBe('Sunday, November 15, 2026');
    expect(translateDates('SEGUNDA-FEIRA, 3 de mar.')).toBe('MONDAY, Mar 3');
  });
});

describe('dicionário do app', () => {
  it('tem os itens do menu em inglês', () => {
    const tr = createTranslator(dictionary);
    expect(tr('Planejamentos')).toBe('Planning');
    expect(tr('Biblioteca')).toBe('Library');
  });
});
