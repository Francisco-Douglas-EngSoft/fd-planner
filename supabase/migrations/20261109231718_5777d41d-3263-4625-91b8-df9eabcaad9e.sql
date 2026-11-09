-- ===== Módulo Rotina Diária =====
CREATE TABLE public.rotina_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 1 AND 60),
  cor text NOT NULL DEFAULT '#8A94AD' CHECK (cor ~ '^#[0-9A-Fa-f]{6}$'),
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotina_categorias TO authenticated;
GRANT ALL ON public.rotina_categorias TO service_role;
ALTER TABLE public.rotina_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rotina_categorias_select_own" ON public.rotina_categorias FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rotina_categorias_insert_own" ON public.rotina_categorias FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rotina_categorias_update_own" ON public.rotina_categorias FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rotina_categorias_delete_own" ON public.rotina_categorias FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_rotina_categorias_user ON public.rotina_categorias(user_id);

CREATE TABLE public.rotina_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  categoria_id uuid REFERENCES public.rotina_categorias(id) ON DELETE SET NULL,
  nome text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 1 AND 200),
  hora time NOT NULL,
  duracao_min integer CHECK (duracao_min IS NULL OR (duracao_min > 0 AND duracao_min <= 1440)),
  dias_semana smallint[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}' CHECK (dias_semana <@ '{0,1,2,3,4,5,6}'::smallint[]),
  ativa boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotina_tarefas TO authenticated;
GRANT ALL ON public.rotina_tarefas TO service_role;
ALTER TABLE public.rotina_tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rotina_tarefas_select_own" ON public.rotina_tarefas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rotina_tarefas_insert_own" ON public.rotina_tarefas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (categoria_id IS NULL OR EXISTS (SELECT 1 FROM public.rotina_categorias c WHERE c.id = categoria_id AND c.user_id = auth.uid())));
CREATE POLICY "rotina_tarefas_update_own" ON public.rotina_tarefas FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND (categoria_id IS NULL OR EXISTS (SELECT 1 FROM public.rotina_categorias c WHERE c.id = categoria_id AND c.user_id = auth.uid())));
CREATE POLICY "rotina_tarefas_delete_own" ON public.rotina_tarefas FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_rotina_tarefas_user ON public.rotina_tarefas(user_id, hora);

CREATE TABLE public.rotina_conclusoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tarefa_id uuid NOT NULL REFERENCES public.rotina_tarefas(id) ON DELETE CASCADE,
  data date NOT NULL,
  concluida_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rotina_conclusoes_tarefa_data_key UNIQUE (tarefa_id, data)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotina_conclusoes TO authenticated;
GRANT ALL ON public.rotina_conclusoes TO service_role;
ALTER TABLE public.rotina_conclusoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rotina_conclusoes_select_own" ON public.rotina_conclusoes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rotina_conclusoes_insert_own" ON public.rotina_conclusoes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.rotina_tarefas t WHERE t.id = tarefa_id AND t.user_id = auth.uid()));
CREATE POLICY "rotina_conclusoes_update_own" ON public.rotina_conclusoes FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.rotina_tarefas t WHERE t.id = tarefa_id AND t.user_id = auth.uid()));
CREATE POLICY "rotina_conclusoes_delete_own" ON public.rotina_conclusoes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_rotina_conclusoes_user_data ON public.rotina_conclusoes(user_id, data);

CREATE TABLE public.rotina_config (
  user_id uuid PRIMARY KEY,
  inicializado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotina_config TO authenticated;
GRANT ALL ON public.rotina_config TO service_role;
ALTER TABLE public.rotina_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rotina_config_select_own" ON public.rotina_config FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rotina_config_insert_own" ON public.rotina_config FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rotina_config_update_own" ON public.rotina_config FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rotina_config_delete_own" ON public.rotina_config FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_rotina_categorias_updated_at BEFORE UPDATE ON public.rotina_categorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rotina_tarefas_updated_at BEFORE UPDATE ON public.rotina_tarefas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rotina_config_updated_at BEFORE UPDATE ON public.rotina_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cria a rotina padrão para o usuário logado (apenas uma vez). Roda com as permissões do próprio usuário.
CREATE OR REPLACE FUNCTION public.rotina_inicializar()
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _mente uuid; _estudo uuid; _trabalho uuid; _corpo uuid; _descanso uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('rotina_inicializar:' || _uid::text));
  IF EXISTS (SELECT 1 FROM public.rotina_config WHERE user_id = _uid) THEN
    RETURN false;
  END IF;

  INSERT INTO public.rotina_config(user_id) VALUES (_uid);

  INSERT INTO public.rotina_categorias(user_id, nome, cor, ordem) VALUES (_uid, 'Mente e espírito', '#7B61FF', 0) RETURNING id INTO _mente;
  INSERT INTO public.rotina_categorias(user_id, nome, cor, ordem) VALUES (_uid, 'Estudo', '#2D7FF9', 1) RETURNING id INTO _estudo;
  INSERT INTO public.rotina_categorias(user_id, nome, cor, ordem) VALUES (_uid, 'Trabalho', '#E39A1B', 2) RETURNING id INTO _trabalho;
  INSERT INTO public.rotina_categorias(user_id, nome, cor, ordem) VALUES (_uid, 'Corpo', '#17A673', 3) RETURNING id INTO _corpo;
  INSERT INTO public.rotina_categorias(user_id, nome, cor, ordem) VALUES (_uid, 'Descanso', '#8A94AD', 4) RETURNING id INTO _descanso;
  INSERT INTO public.rotina_categorias(user_id, nome, cor, ordem) VALUES (_uid, 'Outro', '#E0568B', 5);

  INSERT INTO public.rotina_tarefas(user_id, categoria_id, nome, hora, duracao_min, ordem) VALUES
    (_uid, _mente,    'Preparação: escovar os dentes, beber água e ligar os equipamentos', '04:00', 10, 0),
    (_uid, _mente,    'Oração a Deus', '04:10', 5, 1),
    (_uid, _mente,    'Visualização de sucesso', '04:15', 5, 2),
    (_uid, _mente,    'Afirmação positiva', '04:20', 5, 3),
    (_uid, _mente,    'Reflexão sobre tudo', '04:25', 5, 4),
    (_uid, _estudo,   'Curso de Inglês', '04:30', 35, 5),
    (_uid, _estudo,   'Curso Full Stack', '05:05', 100, 6),
    (_uid, _trabalho, 'Ir para o trabalho (escola)', '07:00', NULL, 7),
    (_uid, _descanso, 'Casa, almoço e descanso', '11:30', NULL, 8),
    (_uid, _trabalho, 'Voltar ao trabalho', '13:00', NULL, 9),
    (_uid, _trabalho, 'Sair do trabalho', '17:20', NULL, 10),
    (_uid, _corpo,    'Caminhada', '17:30', 35, 11),
    (_uid, _estudo,   'Faculdade', '18:30', 90, 12),
    (_uid, _estudo,   'Curso Back-end Java', '20:00', NULL, 13),
    (_uid, _estudo,   'Revisão de todo o conteúdo estudado', '21:00', NULL, 14);

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.rotina_inicializar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotina_inicializar() TO authenticated;