import type { PeriodForecast, ScheduledBook } from "@/lib/readingForecast";
import { formatMinutes } from "@/lib/readingForecast";

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR") : "-");

const STATUS: Record<ScheduledBook["status"], string> = {
  reading: "Em leitura",
  queued: "Na fila",
  completed: "Concluído",
  no_pages: "Sem páginas",
};

/** Gera o PDF do relatório de metas de leitura (carrega o jsPDF só quando usado). */
export async function exportReadingReportPdf(data: {
  userName: string;
  dailyPages: number;
  dailyMinutes: number;
  planStart: string;
  planEnd: string;
  periods: PeriodForecast[];
  schedule: ScheduledBook[];
}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.width;

  doc.setFillColor(24, 24, 27);
  doc.rect(0, 0, w, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Relatório de Metas de Leitura", 14, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`FD-Planner · Biblioteca`, 14, 23);
  doc.text(`${data.userName}`, w - 14, 15, { align: "right" });
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, w - 14, 23, { align: "right" });

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  const ps = new Date(`${data.planStart}T12:00:00`).toLocaleDateString("pt-BR");
  const pe = new Date(`${data.planEnd}T12:00:00`).toLocaleDateString("pt-BR");
  doc.text(
    `Meta diária: ${data.dailyPages} páginas · ${data.dailyMinutes} minutos    Plano: ${ps} a ${pe}`,
    14,
    40,
  );

  autoTable(doc, {
    startY: 46,
    head: [["Período", "Janela", "Livros previstos", "Capacidade (livros)", "Páginas", "Tempo"]],
    body: data.periods.map((p) => [
      p.label,
      `${fmt(p.from)} a ${fmt(p.to)}`,
      String(p.booksFinished),
      p.capacityBooks.toLocaleString("pt-BR"),
      p.pages.toLocaleString("pt-BR"),
      formatMinutes(p.minutes),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [39, 39, 42] },
  });

  const y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 90;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Cronograma de leitura", 14, y + 10);

  autoTable(doc, {
    startY: y + 14,
    head: [["#", "Livro", "Autor", "Situação", "Progresso", "Início", "Prazo p/ concluir", "Dias", "Tempo estimado", "No prazo"]],
    body: data.schedule
      .filter((b) => b.status !== "no_pages")
      .map((b) => [
        b.order ? String(b.order) : "-",
        b.title,
        b.author ?? "-",
        STATUS[b.status],
        `${b.readPages}/${b.totalPages} (${b.progressPct}%)`,
        `${fmt(b.start)}${b.start && b.startIsProjected ? " (prev.)" : ""}`,
        `${fmt(b.end)}${b.end && b.endIsProjected ? " (prev.)" : ""}`,
        b.days ? String(b.days) : "-",
        formatMinutes(b.estimatedMinutes),
        b.withinDeadline === null ? "-" : b.withinDeadline ? "Sim" : "Não",
      ]),
    styles: { fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: [39, 39, 42] },
    columnStyles: { 1: { cellWidth: 60 } },
  });

  doc.save(`metas-de-leitura-${new Date().toISOString().slice(0, 10)}.pdf`);
}
