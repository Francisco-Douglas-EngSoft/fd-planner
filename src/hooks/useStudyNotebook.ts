import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { studyNotebookService, type StudyNote, type NoteKind } from "@/services/studyNotebookService";

export function useStudyNotebook(bookId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["study-notebook", user?.id, bookId ?? "all"];

  const query = useQuery({
    queryKey: key,
    queryFn: () => (user ? studyNotebookService.list(user.id, bookId) : []),
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const create = useMutation({
    mutationFn: (payload: Omit<StudyNote, "id" | "created_at" | "updated_at">) =>
      studyNotebookService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-notebook", user?.id] });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<StudyNote, "title" | "content" | "tags" | "kind">> }) =>
      studyNotebookService.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-notebook", user?.id] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => studyNotebookService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-notebook", user?.id] });
    },
  });

  function exportMarkdown(bookTitle: string) {
    const notes = query.data ?? [];
    return studyNotebookService.exportToMarkdown(notes, bookTitle);
  }

  return { ...query, create, update, remove, exportMarkdown };
}
