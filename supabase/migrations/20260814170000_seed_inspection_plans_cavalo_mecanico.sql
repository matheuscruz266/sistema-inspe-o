-- Seed the 3 inspection plans for Cavalo Mecânico (Diário, Semanal, Mensal)
-- and their respective inspection items, extracted from the user's docx forms.
-- Idempotent: uses fixed UUIDs for plans; clears & re-inserts items on re-run.

-- Fixed plan ids (stable so the migration is re-runnable)
-- PLANO-D: 'c0ffee00-0000-0000-0000-000000000001'
-- PLANO-S: 'c0ffee00-0000-0000-0000-000000000002'
-- PLANO-M: 'c0ffee00-0000-0000-0000-000000000003'

INSERT INTO public.inspection_plans
  (id, code, plate, vehicle_type, periodicity, responsible, criticidade, status, is_deleted)
VALUES
  ('c0ffee00-0000-0000-0000-000000000001'::uuid, 'PLANO-D', 'TEMPLATE-CM-D', 'Cavalo Mecânico', 'Diária',  'Motorista',      'Alta',    'Em Dia', false),
  ('c0ffee00-0000-0000-0000-000000000002'::uuid, 'PLANO-S', 'TEMPLATE-CM-S', 'Cavalo Mecânico', 'Semanal', 'Motorista',      'Alta',    'Em Dia', false),
  ('c0ffee00-0000-0000-0000-000000000003'::uuid, 'PLANO-M', 'TEMPLATE-CM-M', 'Cavalo Mecânico', 'Mensal',  'Oficina Interna','Crítica', 'Em Dia', false)
ON CONFLICT (id) DO UPDATE SET
  code          = EXCLUDED.code,
  plate         = EXCLUDED.plate,
  vehicle_type  = EXCLUDED.vehicle_type,
  periodicity   = EXCLUDED.periodicity,
  responsible   = EXCLUDED.responsible,
  criticidade   = EXCLUDED.criticidade,
  status        = EXCLUDED.status;

-- Clear any previously seeded items for these template plans (idempotent re-run)
DELETE FROM public.inspection_plan_items
WHERE plan_id IN (
  'c0ffee00-0000-0000-0000-000000000001'::uuid,
  'c0ffee00-0000-0000-0000-000000000002'::uuid,
  'c0ffee00-0000-0000-0000-000000000003'::uuid
);

-- =============================================================
-- PLANO D — Diário (Motorista) — 14 itens
-- =============================================================
INSERT INTO public.inspection_plan_items (plan_id, sequence, item, verification, response_type) VALUES
('c0ffee00-0000-0000-0000-000000000001'::uuid, 1,  'Sistema de arrefecimento — nível e aspecto', 'Olhar se o líquido está entre as marcas MÍN. e MÁX. Ver se a cor está normal e se não há sujeira, ferrugem ou óleo. Apertar as mangueiras com cuidado para sentir se estão muito moles, rachadas ou vazando. Olhar se o radiador está muito amassado ou sujo.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000001'::uuid, 2,  'Compressor de ar (alimenta os freios)', 'Com o motor ligado, ouvir se o compressor faz barulho forte, batidas ou ruído estranho. Ao drenar o reservatório de ar, observar se sai óleo junto com a água. Olhar se há vazamento nas mangueiras próximas ao compressor.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000001'::uuid, 3,  'Vidros e espelhos — visibilidade', 'Olhar se o para-brisa tem trinca, principalmente na frente do motorista. Conferir se os espelhos estão inteiros, firmes, limpos e bem regulados.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000001'::uuid, 4,  'Assento e cinto de segurança', 'Mexer no banco e confirmar se ele trava nas posições. Puxar o cinto de uma vez para ver se trava. Olhar se o cinto está rasgado, desfiado ou com a fivela ruim.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000001'::uuid, 5,  'Pedais — freio, embreagem e acelerador', 'Pisar nos pedais e verificar se voltam sozinhos ao soltar. Sentir se algum pedal está duro, frouxo, agarrando ou fazendo barulho diferente.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000001'::uuid, 6,  'Painel de instrumentos — advertências', 'Virar a chave e conferir se as luzes do painel acendem no teste. Depois de ligar o motor, observar se alguma luz de alerta fica acesa. Conferir temperatura do motor e pressão de ar no painel.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000001'::uuid, 7,  'Freio motor / retarder (se equipado)', 'Em local seguro, acionar o freio motor ou retarder e sentir se o caminhão reduz a velocidade. Ouvir se aparece barulho metálico, pancada ou ruído estranho.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000001'::uuid, 8,  'PTO (tomada de força) — se equipado', 'Se o veículo tiver tomada de força, ligar e desligar conforme orientação. Ver se entra e sai sem dificuldade. Ouvir ruídos estranhos e olhar se há vazamento de óleo na região.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000001'::uuid, 9,  'Freio de estacionamento — eficiência em rampa', 'Acionar o freio de estacionamento e confirmar se o veículo fica parado em local inclinado. Olhar se as câmaras e hastes estão firmes e sem danos visíveis.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000001'::uuid, 10, 'Bolsas de ar — suspensão pneumática traseira', 'Olhar as bolsas de ar da suspensão. Ver se há bolhas, rachaduras, partes ressecadas ou vazamento de ar. Ouvir se sai ar com o veículo ligado. Comparar se os dois lados estão na mesma altura.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000001'::uuid, 11, 'Faróis — alto, baixo e neblina', 'Ligar farol baixo, farol alto e farol de neblina, se tiver. Ver se todos acendem. Olhar se as lentes estão quebradas, sujas ou muito amareladas.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000001'::uuid, 12, 'Luz de freio — sincronismo das 3 posições', 'Com ajuda de outra pessoa, pisar no freio e conferir se todas as luzes de freio acendem ao mesmo tempo, inclusive a luz central, quando existir.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000001'::uuid, 13, 'Setas, pisca-alerta e luz de posição', 'Ligar seta direita, seta esquerda, pisca-alerta e luzes de posição. Conferir se todas as lâmpadas acendem e piscam normalmente.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000001'::uuid, 14, 'Luz e sirene de ré', 'Engatar a ré com segurança e conferir se a luz branca acende e se a sirene de ré toca. Depois, tirar da ré e verificar se a luz e a sirene desligam.', 'OK / NOK');

-- =============================================================
-- PLANO S — Semanal (Motorista) — 10 itens
-- =============================================================
INSERT INTO public.inspection_plan_items (plan_id, sequence, item, verification, response_type) VALUES
('c0ffee00-0000-0000-0000-000000000002'::uuid, 1,  'Bloco / cárter — vedação externa', 'Olhar se há manchas de óleo ou vazamentos no motor, na tampa de válvulas e na parte de baixo do motor. Cheirar se há cheiro de queimado. Se tiver gotejamento, precisa consertar. Se for só uma mancha seca, observar.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000002'::uuid, 2,  'Nível e aspecto do óleo do motor', 'Com o motor frio, verificar o nível do óleo pela vareta. Se estiver abaixo do mínimo, completar e procurar o motivo. Observar a cor do óleo: se estiver muito preto, cinza ou com espuma, pode ser problema sério.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000002'::uuid, 3,  'Filtro de ar — restrição', 'Verificar o indicador do filtro de ar. Se estiver na área vermelha, trocar o filtro imediatamente. Se não tiver indicador, olhar o filtro para ver se está muito sujo ou entupido.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000002'::uuid, 4,  'Sistema de escapamento — vazamento e fixação', 'Com o motor frio, ligar e ouvir se há barulho de vazamento de ar ou fumaça nas juntas do escapamento. Olhar se o silencioso e os suportes estão firmes e sem folga.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000002'::uuid, 5,  'Vazamento de combustível — zero tolerância', 'Cheirar e olhar se há qualquer vazamento de diesel nos filtros, mangueiras ou no tanque. Qualquer gota de diesel perto de algo quente é perigoso.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000002'::uuid, 6,  'Retentores dos diferenciais (todas as flanges)', 'Com o motor quente, usar uma lanterna para olhar se há manchas de óleo nas pontas dos diferenciais. Vazamento de óleo aqui pode estragar o freio.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000002'::uuid, 7,  'Borracha de desgaste da quinta roda', 'Olhar a borracha que amortece a quinta roda. Se estiver quebrada, faltando pedaços ou muito gasta, precisa trocar. Isso evita que metal bata em metal.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000002'::uuid, 8,  'Lubrificação — intervalo e qualidade', 'Aplicar graxa nova nos pontos de articulação da quinta roda. Tirar o excesso de graxa perto do pino rei.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000002'::uuid, 9,  'Reservatório de ar — drenagem e análise', 'Drenar a água de cada reservatório de ar. Observar o que sai: se for só água, está normal. Se sair óleo, o compressor de ar pode estar com problema.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000002'::uuid, 10, 'Chicote elétrico — pontos críticos', 'Olhar os fios elétricos (chicote) embaixo da cabine, no motor e no chassi. Ver se não estão roçando em partes de metal, o que pode causar curto-circuito. Conferir se as proteções e conectores estão bons.', 'OK / NOK');

-- =============================================================
-- PLANO M — Mensal (Oficina Interna) — 39 itens
-- =============================================================
INSERT INTO public.inspection_plan_items (plan_id, sequence, item, verification, response_type) VALUES
-- 1.1 Motor
('c0ffee00-0000-0000-0000-000000000003'::uuid, 1,  'Correia(s) do motor — tensão e desgaste', 'Desgaste, fios expostos ou trincas.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 2,  'Turbocompressor — folga, ruído e vedação', 'Folga no eixo ou ruído estranho.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 3,  'Coxins do motor e do câmbio', 'Borracha rasgada ou motor balançando.', 'OK / NOK'),
-- 2.1 Câmbio, cardans, diferenciais
('c0ffee00-0000-0000-0000-000000000003'::uuid, 4,  'Caixa de câmbio — nível e aspecto', 'Nível de óleo. Cor com reflexo metálico = desgaste interno.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 5,  'Cardan dianteiro (motor → câmbio)', 'Folga angular: girar tubo sem mover a flange. Folga axial da luva deslizante. Verificar selos de proteção da luva.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 6,  'Cardan intermediário (câmbio → dif. central)', 'Cruzeta, luva deslizante (folga ou parafuso solto).', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 7,  'Cardan traseiro (dif. central → dif. traseiro)', 'Folga cruzetas. Verificar proteção de lona sobre o tubo.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 8,  'Diferencial central — nível, bujão', 'Verificar nível. Bujão magnético — análise de óleo. Vazamentos.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 9,  'Diferencial traseiro — nível, bujão e ruído', 'Zumbido progressivo com velocidade. O traseiro é o mais carregado.', 'OK / NOK'),
-- 4.1 Sistema de freios
('c0ffee00-0000-0000-0000-000000000003'::uuid, 10, 'Lonas de freio — espessura, vitrificação e desgaste diferencial', 'Verificar vitrificação: superfície brilhante e lisa = sem atrito.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 11, 'Tambores — diâmetro, sulcos e azulamento', 'Trincas, sulcos ou cor azulada.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 12, 'Catracas automáticas — atuação e desgaste', 'Verificar trinco de catraca: deve clicar ao frear e avançar ao liberar. Catraca imóvel indica falha.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 13, 'Mangueiras flexíveis — 4 unidades', 'Verificar flexível, trincas, ressecamento.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 14, 'ABS — sensores, gap e módulo', 'Sensor longe da roda ou fios cortados.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 15, 'EBS — módulo, válvulas e parâmetros', 'Ler parâmetros de desgaste das lonas reportados pelo EBS.', 'OK / NOK'),
-- 5.1 Direção
('c0ffee00-0000-0000-0000-000000000003'::uuid, 16, 'Folga do volante — medição angular', 'Folga excessiva ao girar e vibração.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 17, 'Bomba de direção hidráulica — nível e vedação', 'Óleo baixo ou vazamento na bomba.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 18, 'Caixa de direção — fixação e vedação do setor', 'Caixa solta ou vazamento de óleo.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 19, 'Barra pitman e direção longitudinal', 'Barra torta ou folga ao balançar.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 20, 'Terminais de direção (esféricos) — todos', 'Borracha rasgada ou folga no pino.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 21, 'Pivôs de direção (kingpin) — folga horizontal', 'Elevar eixo e verificar folga no pivô = movimento perceptível no cubo. Verificar trava da porca do pivô.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 22, 'Barra estabilizadora e buchas', 'Verificar vibração e instabilidade. Verificar grampos de fixação ao chassis. Barra estabilizadora empenada.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 23, 'Mangueiras de alta e baixa pressão da direção', 'Volante em fim de curso: verificar mangueiras de alta pressão. Mangueiras ressecadas e trincas.', 'OK / NOK'),
-- 5.2 Suspensão
('c0ffee00-0000-0000-0000-000000000003'::uuid, 24, 'Molas / feixes de mola — eixo dianteiro', 'Mola quebrada ou grampo solto. Bater nas folhas: som diferente = folha solta ou trincada.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 25, 'Amortecedores — vazamento e eficiência', 'Mancha de óleo no cilindro ou batendo seco.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 26, 'Balancins e mancais — suspensão traseira', 'Folga nas buchas traseiras.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 27, 'Batentes de borracha', 'Verificar trinca progressiva no longarina. Verificar se o batente está comprimido permanentemente.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 28, 'Altura do veículo — nivelamento por eixo', 'Verificar desnível nos 4 cantos do chassi.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 29, 'Suportes e mancais da suspensão traseira', 'Verificar suportes soldados ao chassis: trinca nas soldas.', 'OK / NOK'),
-- 6.1 Cubos
('c0ffee00-0000-0000-0000-000000000003'::uuid, 30, 'Cubos de roda — folga axial (rolamento)', 'Roda dançando ou cubo muito quente.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 31, 'Cubos de roda — folga radial (rolamento)', 'Movimentar lateralmente.', 'OK / NOK'),
-- 7.1 Sistema elétrico e iluminação
('c0ffee00-0000-0000-0000-000000000003'::uuid, 32, 'Tomada elétrica do semirreboque (7 pinos)', 'Verificar: posição, freio, ré, seta LD, seta LE, ABS carreta. Verificar pinos oxidados.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 33, 'Bateria — tensão, nível, sulfatação e fixação', 'Tensão em repouso (30min desligado): > 12,6V = carregada; < 12,4V = descarregada. Com motor a 1500rpm: 13,8-14,5V = alternador ok. Verificar sulfatação branca nos terminais. Fixação firme.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 34, 'Alternador — tensão de carga e diodo', 'Tensão nos terminais com motor a 1500rpm.', 'OK / NOK'),
-- 8.1 Lubrificação geral e reapertos
('c0ffee00-0000-0000-0000-000000000003'::uuid, 35, 'Niples dos cardans — todas as cruzetas', 'Aplicar em cada niple até a graxa antiga extrudar pela cruzeta.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 36, 'Pivôs de direção e terminais', 'Lubrificar todos os niples dos pivôs e terminais.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 37, 'Quinta roda — garra, rampas e mesa', 'Limpar excesso anterior. Aplicar graxa nas rampas e garra. Remover excesso na área do pino rei.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 38, 'Reapertos estruturais — parafusos críticos', 'Verificar: suportes de mola, mancais de balancim, câmaras de freio, amortecedores, coxins. Registrar parafuso que afrouxou.', 'OK / NOK'),
('c0ffee00-0000-0000-0000-000000000003'::uuid, 39, 'Lubrificação geral — demais pontos', 'Lubrificar demais pontos indicados no manual do fabricante: suportes de amortecedor, articulações de câmaras, balanças de suspensão. Registrar total de pontos.', 'OK / NOK');
