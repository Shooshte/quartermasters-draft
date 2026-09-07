SELECT jsonb_build_object(
  'columns', (SELECT jsonb_agg(jsonb_build_array(table_name,column_name,udt_name,is_nullable,column_default) ORDER BY table_name,column_name)
              FROM information_schema.columns WHERE table_schema='public' AND table_name NOT IN ('_sqlx_migrations')),
  'constraints', (SELECT jsonb_agg(jsonb_build_array(c.relname,k.contype,pg_get_constraintdef(k.oid)) ORDER BY c.relname,k.contype,pg_get_constraintdef(k.oid))
                  FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
                  WHERE n.nspname='public' AND c.relname <> '_sqlx_migrations'),
  'indexes', (SELECT jsonb_agg(jsonb_build_array(tablename,indexdef) ORDER BY tablename,indexname)
              FROM pg_indexes WHERE schemaname='public' AND tablename <> '_sqlx_migrations'),
  'enums', (SELECT jsonb_agg(jsonb_build_array(t.typname,e.enumlabel,e.enumsortorder) ORDER BY t.typname,e.enumsortorder)
            FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public')
)
