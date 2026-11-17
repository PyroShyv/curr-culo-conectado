CREATE TABLE public.curriculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  exemplo boolean NOT NULL DEFAULT false,
  nome text NOT NULL DEFAULT '',
  idade text NOT NULL DEFAULT '',
  cidade text NOT NULL DEFAULT '',
  bairro text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  foto text,
  tempo text NOT NULL DEFAULT '',
  exp text NOT NULL DEFAULT '',
  formacao_opc text[] NOT NULL DEFAULT '{}',
  cursos text NOT NULL DEFAULT '',
  certs text NOT NULL DEFAULT '',
  form_extra text NOT NULL DEFAULT '',
  habil text NOT NULL DEFAULT '',
  disp_opc text[] NOT NULL DEFAULT '{}',
  disp text NOT NULL DEFAULT '',
  sobre text NOT NULL DEFAULT '',
  passo int NOT NULL DEFAULT 1,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.curriculos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curriculos TO authenticated;
GRANT ALL ON public.curriculos TO service_role;
ALTER TABLE public.curriculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Curriculos concluidos sao publicos" ON public.curriculos FOR SELECT TO anon, authenticated USING (done = true);
CREATE POLICY "Dono ve o seu" ON public.curriculos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Dono cria o seu" ON public.curriculos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND exemplo = false);
CREATE POLICY "Dono edita o seu" ON public.curriculos FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND exemplo = false);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER curriculos_touch BEFORE UPDATE ON public.curriculos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.curriculos (exemplo, done, nome, idade, cidade, bairro, email, telefone, tempo, formacao_opc, disp_opc, sobre, exp, cursos, certs, form_extra, habil, disp, created_at) VALUES
(true, true, 'Maria das Dores Ferreira', '54', 'Palmas', 'Plano Diretor Sul', 'maria.exemplo@email.com', '(63) 99111-2233', 'Mais de 10 anos', ARRAY['Ensino médio completo'], ARRAY['Diurno','Noturno','Finais de semana'],
 'Sou calma, paciente e gosto de conversar. Trato cada idoso como trataria minha própria mãe. Chego no horário e mantenho a família informada sobre como foi o dia.',
 'Há 12 anos cuido de idosos em casa. Cuidei por 6 anos de uma senhora com Alzheimer, ajudando no banho, na alimentação, nos remédios e nas caminhadas. Trabalhei também em uma casa de repouso, no turno da noite.',
 'Curso de Cuidador de Idosos (160 horas). Primeiros socorros.', 'Certificado de cuidador de idosos.', '',
 'Higiene e banho, alimentação, controle de medicação, mobilização e transferência, estímulo da memória, acompanhamento em consultas.',
 'Segunda a sábado, das 7h às 19h. Também faço plantão noturno.', now() - interval '3 days'),
(true, true, 'Joaquim Batista Neto', '47', 'Gurupi', 'Centro', 'joaquim.exemplo@email.com', '(63) 98222-3344', 'De 6 a 10 anos', ARRAY['Ensino técnico'], ARRAY['Noturno','Plantões 12x36','Finais de semana'],
 'Sou técnico de enfermagem e gosto de cuidar com respeito e atenção. Tenho experiência com idosos acamados e com mobilidade reduzida.',
 'Trabalhei 8 anos como técnico de enfermagem em hospital e, nos últimos 4 anos, atendo idosos em domicílio. Faço curativos, aferição de pressão e glicemia, e cuidados com sonda e cadeira de rodas.',
 'Cuidados com feridas. Atendimento a pessoas com Parkinson.', 'Registro profissional ativo no conselho de enfermagem.', 'Técnico em Enfermagem.',
 'Curativos, aferição de pressão e glicemia, cuidados com acamados, cadeira de rodas, medicação, fisioterapia leve.',
 'Fins de semana e noites durante a semana.', now() - interval '2 days'),
(true, true, 'Aparecida Souza Lima', '39', 'Araguaína', 'São João', 'aparecida.exemplo@email.com', '(63) 99333-4455', 'De 3 a 5 anos', ARRAY['Ensino médio completo'], ARRAY['Diurno'],
 'Gosto de manter a rotina do idoso alegre, com música, leitura e passeios curtos. Sou organizada e muito responsável.',
 'Trabalho com idosos há 5 anos. Preparo refeições leves, acompanho em consultas, organizo a medicação e faço companhia nas atividades do dia.',
 'Nutrição para a terceira idade. Atendimento humanizado.', '', '',
 'Preparo de refeições, companhia, acompanhamento em consultas, organização da casa, estímulo com atividades.',
 'Segunda a sexta, das 8h às 17h.', now() - interval '1 day');