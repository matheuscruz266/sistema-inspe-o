-- Limpa usuários órfãos: auth.users sem registro correspondente em public.app_users.
-- Para cada órfão, TENTA criar o registro em app_users (com name do user_metadata
-- ou email, is_active = true, access_level_id = NULL). Se não for possível criar
-- (ex: constraint violation), DELETA o usuário de auth.users para evitar órfãos.
DO $$
DECLARE
  orphan RECORD;
  v_name TEXT;
  insert_failed BOOLEAN;
BEGIN
  FOR orphan IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.app_users a ON a.id = u.id
    WHERE a.id IS NULL
  LOOP
    -- Define o nome: user_metadata->>'name' ou fallback para o email
    v_name := COALESCE(orphan.raw_user_meta_data->>'name', orphan.email);

    insert_failed := FALSE;

    BEGIN
      INSERT INTO public.app_users (id, name, email, access_level_id, is_active, is_deleted)
      VALUES (orphan.id, v_name, orphan.email, NULL, TRUE, FALSE)
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        insert_failed := TRUE;
    END;

    -- Se a inserção falhou (ou ainda não existe o registro por outro motivo),
    -- remove o usuário órfão de auth.users para manter consistência.
    IF insert_failed OR NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = orphan.id) THEN
      DELETE FROM auth.users WHERE id = orphan.id;
      RAISE NOTICE 'Usuário órfão removido de auth.users: % (%)', orphan.email, orphan.id;
    ELSE
      RAISE NOTICE 'Registro app_users criado para órfão: % (%)', orphan.email, orphan.id;
    END IF;
  END LOOP;
END $$;
