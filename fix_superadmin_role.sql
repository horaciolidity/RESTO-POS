-- ================================================================
-- FIX: Promover usuario a super_admin
-- Ejecutar en: Supabase → SQL Editor
-- ================================================================

-- 1. Cambiar el rol del perfil a super_admin
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'horaciowalterortiz@gmail.com';

-- 2. Verificar que se aplicó correctamente
SELECT id, name, email, role, tenant_id
FROM public.profiles
WHERE email = 'horaciowalterortiz@gmail.com';

-- ================================================================
-- NOTAS:
-- Después de ejecutar esto, cerrá sesión y volvé a iniciar
-- con horaciowalterortiz@gmail.com para que se aplique el cambio.
-- El super_admin tiene acceso a TODAS las funciones y al panel
-- de administración de empresas (/super-admin).
-- ================================================================
