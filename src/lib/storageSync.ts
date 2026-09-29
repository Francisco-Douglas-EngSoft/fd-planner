import { supabase } from "@/integrations/supabase/client";

/** Lista todos os caminhos de arquivos de uma pasta do Storage. Retorna null se falhar. */
export async function listStoragePaths(bucket: string, folder: string): Promise<Set<string> | null> {
  const paths = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000, offset });
    if (error) return null;
    (data ?? []).forEach((f) => {
      if (f.id) paths.add(`${folder}/${f.name}`);
    });
    if (!data || data.length < 1000) break;
  }
  return paths;
}

/** Extrai o caminho interno do bucket a partir da URL pública. */
export function publicUrlToPath(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  const marker = `/${bucket}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}
