DO $$
DECLARE ids uuid[]; paths text[];
BEGIN
  SELECT array_agg(id), array_agg(file_path) || array_agg(cover_path) INTO ids, paths FROM public.books WHERE file_size > 30*1024*1024;
  IF ids IS NULL THEN RETURN; END IF;
  DELETE FROM public.annotations WHERE book_id = ANY(ids);
  DELETE FROM public.bookmarks WHERE book_id = ANY(ids);
  DELETE FROM public.reading_sessions WHERE book_id = ANY(ids);
  DELETE FROM public.book_collections WHERE book_id = ANY(ids);
  DELETE FROM public.books WHERE id = ANY(ids);
  BEGIN
    DELETE FROM storage.objects WHERE bucket_id = 'books' AND name = ANY(paths);
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'storage delete skipped: %', SQLERRM;
  END;
END $$;