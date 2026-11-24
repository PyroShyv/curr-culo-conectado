CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TABLE public.user_roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 role public.app_role NOT NULL,
 UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
CREATE POLICY "Read own roles or admin list" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Administradores veem todos os curriculos" ON public.curriculos FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
GRANT DELETE ON public.curriculos TO authenticated;
CREATE POLICY "Administradores excluem curriculos" ON public.curriculos FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE FUNCTION public.set_admin_role(_target uuid, _enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(738491);
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _enabled THEN
  INSERT INTO public.user_roles(user_id, role) VALUES (_target, 'admin') ON CONFLICT DO NOTHING;
 ELSE
  IF public.has_role(_target, 'admin') AND (SELECT count(*) FROM public.user_roles WHERE role='admin') <= 1 THEN
   RAISE EXCEPTION 'LAST_ADMIN';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _target AND role = 'admin';
 END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_admin_role(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_admin_role(uuid, boolean) TO authenticated;
INSERT INTO public.user_roles(user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE lower(email)='wendellalvesdz@gmail.com'
ON CONFLICT DO NOTHING;