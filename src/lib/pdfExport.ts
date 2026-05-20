import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  userName: string;
  period: string;
  stats: {
    totalHours: number;
    avgDaily: number;
    tasksCompleted: number;
    coursesProgress: number;
    focusSessions: number;
    streakDays: number;
  };
  weeklyData: Array<{
    day: string;
    hours: number;
    tasks: number;
  }>;
  courses: Array<{
    name: string;
    progress: number;
    hours: number;
  }>;
}

export function generateStudyReport(data: ReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header with gradient effect (simulated with rectangle)
  doc.setFillColor(37, 99, 235); // Primary blue
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('FD-Planner', 20, 25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório de Estudos', 20, 35);

  // User info
  doc.setFontSize(10);
  doc.text(`${data.userName} • ${data.period}`, pageWidth - 20, 25, { align: 'right' });
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 20, 35, { align: 'right' });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Stats Section
  let yPos = 70;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo do Período', 20, yPos);

  yPos += 15;

  // Stats boxes
  const statsData = [
    ['Total de Horas', `${data.stats.totalHours}h`],
    ['Média Diária', `${data.stats.avgDaily}h`],
    ['Tarefas Concluídas', `${data.stats.tasksCompleted}`],
    ['Sessões de Foco', `${data.stats.focusSessions}`],
    ['Sequência', `${data.stats.streakDays} dias`],
    ['Progresso Geral', `${data.stats.coursesProgress}%`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'Valor']],
    body: statsData,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      cellPadding: 8,
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
    },
  });

  // Weekly Data Table
  yPos = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Desempenho Semanal', 20, yPos);

  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Dia', 'Horas Estudadas', 'Tarefas Concluídas']],
    body: data.weeklyData.map(d => [d.day, `${d.hours}h`, d.tasks.toString()]),
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      cellPadding: 6,
    },
  });

  // Courses Progress
  yPos = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 20;

  // Check if we need a new page
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Progresso dos Cursos', 20, yPos);

  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Curso', 'Progresso', 'Horas Restantes']],
    body: data.courses.map(c => [c.name, `${c.progress}%`, `${c.hours}h`]),
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      cellPadding: 6,
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${pageCount} • FD-Planner`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `fdplanner-relatorio-${data.period.toLowerCase().replace(/\s/g, '-')}.pdf`;
  doc.save(fileName);
}
