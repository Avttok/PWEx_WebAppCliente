/**
 * Central de ajuda: o mesmo texto para o site do cliente, o painel do gestor e o app.
 * Cada artigo tem um id estável (o app e o painel abrem direto em /ajuda?p=…&a=…).
 */
export type Publico = "cliente" | "motoboy" | "gestor";

export interface Artigo {
  id: string;
  titulo: string;
  /** Parágrafos; linhas que começam com "1. ", "2. "… viram passos numerados. */
  texto: string[];
}
export interface Secao { titulo: string; artigos: Artigo[] }

export const PUBLICOS: { k: Publico; nome: string; resumo: string }[] = [
  { k: "cliente", nome: "Clientes", resumo: "Empresas e pessoas que pedem coletas e entregas pelo site." },
  { k: "motoboy", nome: "Motoboys", resumo: "Quem entrega pela PW Express, usando o app no celular." },
  { k: "gestor", nome: "Gestores", resumo: "Quem administra pedidos, rotas, equipe e finanças pelo painel ou pelo app." },
];

export const AJUDA: Record<Publico, Secao[]> = {
  cliente: [
    {
      titulo: "Primeiros passos",
      artigos: [
        { id: "criar-conta", titulo: "Criar a conta da empresa", texto: [
          "1. Toque em Criar conta da empresa, no início do site.",
          "2. Escolha empresa (CNPJ) ou pessoa (CPF) e preencha os dados de contato.",
          "3. Se quiser, informe o endereço de coleta padrão e confira o ponto no mapa.",
          "4. Crie a senha e envie.",
          "Dependendo da configuração da PW Express, a conta é liberada na hora ou fica em análise. Enquanto estiver em análise, o site mostra o aviso ao entrar.",
        ] },
        { id: "entrar", titulo: "Entrar e trocar a senha", texto: [
          "Entre com o e-mail e a senha da conta. Marque Permanecer conectado para não precisar entrar de novo neste navegador.",
          "Para trocar a senha, abra Minha conta e use Trocar senha.",
        ] },
      ],
    },
    {
      titulo: "Pedidos",
      artigos: [
        { id: "novo-pedido", titulo: "Fazer um pedido", texto: [
          "1. Abra Novo pedido.",
          "2. Em Quando, escolha Agora ou Agendar (com dia e hora). Ligue Urgente só quando precisar de prioridade.",
          "3. Escolha o tipo de pedido (por exemplo, entrega padrão, documentos ou alimentos).",
          "4. Em Endereços, preencha a coleta e as entregas. Escolha o endereço da lista ou use Marcar no mapa. Contato e referências ajudam o motoboy a achar o lugar.",
          "5. Diga o que vai em cada entrega. Cada tipo de item pede só os campos que importam (peso, medidas, valor declarado).",
          "6. Confira a distância, o tempo e o valor e toque em Fazer pedido.",
          "Use as setas ou arraste pelos pontinhos para mudar a ordem dos endereços. O mapa mostra o caminho entre eles.",
        ] },
        { id: "modelos", titulo: "Modelos de pedido", texto: [
          "Pedido que se repete? Depois de preencher, toque em Salvar como modelo.",
          "Nas próximas vezes, toque no modelo em Meus modelos: tudo é preenchido e você pode mudar o que quiser antes de enviar.",
        ] },
        { id: "valor", titulo: "Como o valor é calculado", texto: [
          "O valor segue as regras combinadas com a PW Express: distância, pontos de entrega, volumes, peso, horário e urgência, entre outras.",
          "Em algumas contas o valor aparece depois que a PW Express confere o pedido. Enquanto isso, o pedido mostra Revisando no lugar do valor.",
        ] },
        { id: "acompanhar", titulo: "Acompanhar um pedido", texto: [
          "Em Pedidos, toque no pedido para ver o mapa, os pontos e a situação de cada entrega.",
          "Toque numa coleta ou entrega da lista para o mapa centralizar nela.",
          "Quando a rota está em andamento, o mapa mostra onde o motoboy está (se a sua conta tiver o acompanhamento ao vivo).",
          "Se o pedido usar código de entrega, ele aparece no pedido: passe só para quem vai receber.",
        ] },
        { id: "cancelar", titulo: "Cancelar um pedido", texto: [
          "Enquanto nenhum motoboy pegou a rota, abra o pedido e use Cancelar. Depois disso, fale com a PW Express.",
        ] },
      ],
    },
    {
      titulo: "Pagamento e faturas",
      artigos: [
        { id: "credito-prepago", titulo: "Crédito ou pagamento antecipado", texto: [
          "No crédito, os pedidos concluídos entram na fatura do seu ciclo (por exemplo, semanal ou mensal). Em Faturas você vê cada fatura e os pedidos dela.",
          "No pagamento antecipado, o pedido só sai depois que o pagamento for confirmado. Escolha PIX ou cartão ao fazer o pedido.",
        ] },
      ],
    },
  ],

  motoboy: [
    {
      titulo: "Começando",
      artigos: [
        { id: "instalar", titulo: "Instalar o app", texto: [
          "O passo a passo completo, com as permissões, está na página App do motoboy (/app).",
        ] },
        { id: "online", titulo: "Ficar online e offline", texto: [
          "No Início, segure o botão redondo até o anel encher: o modo troca sozinho, sem precisar soltar.",
          "Online, você recebe ofertas de rota. Offline, nada chega e o GPS não é enviado.",
          "Se o app ficar muito tempo sem mandar a posição, a central pode deixar você offline automaticamente.",
        ] },
        { id: "raio", titulo: "Raio de distância", texto: [
          "Toque no raio, no Início, para escolher até onde você aceita ir buscar uma coleta.",
          "De onde eu estiver: o raio acompanha você. Ponto fixo: o raio conta a partir de um lugar que você escolhe no mapa.",
          "Sem raio definido, chegam corridas de qualquer distância. Urgentes podem chegar mesmo fora do raio.",
        ] },
      ],
    },
    {
      titulo: "Rotas",
      artigos: [
        { id: "oferta", titulo: "Aceitar ou recusar uma oferta", texto: [
          "A oferta chega como uma chamada, com o mapa da rota, o valor (se a central mostrar), a distância até a coleta e o tempo para responder.",
          "Toque numa coleta ou entrega para ver o ponto no mapa.",
          "Se a corrida for agendada, aparece AGENDADA · NÃO É AGORA com o dia e a hora, e o botão vira Reservar: ela fica nas suas reservas e começa no horário.",
          "Se o tempo acabar, a oferta passa para outro motoboy.",
        ] },
        { id: "quadro", titulo: "Quadro de rotas e reservas", texto: [
          "Em Rotas ficam as rotas abertas que qualquer um pode pegar e as planejadas para reservar.",
          "Toque numa rota para ver o mapa e as paradas antes de pegar.",
          "Reservas têm limite por pessoa e não podem bater no mesmo horário. Você pode iniciar a partir de 1 hora antes.",
        ] },
        { id: "etapas", titulo: "Fazer a rota", texto: [
          "1. Vá até a coleta. Com a regra Etapas no local, o app só deixa avançar perto do endereço.",
          "2. Toque em Cheguei no local e, com o pacote em mãos, em Coletado.",
          "3. Siga para cada entrega, toque em Cheguei no local e em Entregue, e finalize com o comprovante pedido: nome de quem recebeu e, se exigido, foto, assinatura ou código.",
          "Os botões Maps e Waze, sobre o mapa, abrem o caminho até a parada atual no aplicativo de navegação.",
        ] },
        { id: "cancelada", titulo: "Corrida cancelada", texto: [
          "Se a central cancelar ou passar a corrida para outra pessoa, o app avisa com uma notificação e volta ao Início. Pode parar: nenhuma etapa a mais é necessária.",
        ] },
      ],
    },
    {
      titulo: "Ganhos e perfil",
      artigos: [
        { id: "holerite", titulo: "Holerite", texto: [
          "Em Holerite você vê as rotas e os valores de cada período (dia, semana, quinzena ou mês, conforme a central).",
          "Dependendo da configuração, o valor aparece durante o período ou só depois que o holerite é fechado. Bônus e descontos já vêm somados nas rotas.",
          "Cadastre a sua chave PIX no Holerite: a chave marcada como principal é a que recebe o pagamento.",
        ] },
        { id: "medalhas", titulo: "Medalhas", texto: [
          "Você ganha medalhas por corridas, entregas, quilômetros, horas online, tempo de casa e outros marcos.",
          "Toque numa medalha, no seu perfil, para ver o que ela significa e quanto falta.",
        ] },
        { id: "cores", titulo: "Cores do app e tema", texto: [
          "No menu da foto, escolha Dourado, Azul, Verde, Preto no branco ou Branco no preto, e o tema claro ou noturno.",
        ] },
      ],
    },
  ],

  gestor: [
    {
      titulo: "Pedidos e rotas",
      artigos: [
        { id: "revisar", titulo: "Revisar e aprovar pedidos", texto: [
          "Pedidos de clientes chegam em Para revisar. Abra o pedido para ver o mapa, os pontos, os itens e como chegou no valor.",
          "Ajuste o valor (com o motivo), recalcule com as regras de agora, mude as regras só deste pedido ou aprove.",
          "Aprovado, o pedido entra no roteirizador. Se ele não virar rota, o aviso no pedido diz o motivo (pagamento antecipado, horário, espera para juntar…). Montar rota agora monta na hora.",
          "Voltar à revisão desfaz a rota enquanto nenhuma coleta ou entrega foi feita.",
        ] },
        { id: "despacho", titulo: "Modos de despacho", texto: [
          "Quadro: a rota aparece para todos os motoboys e o primeiro que pegar leva.",
          "Melhor primeiro: só o motoboy mais indicado recebe a oferta. Se ele não aceitar, a rota vai para o quadro.",
          "Cascata: a oferta passa de motoboy em motoboy, do mais perto ao mais longe, até alguém aceitar.",
          "Direto: você escolhe o motoboy e ele recebe a oferta.",
          "Corridas agendadas também podem ir por oferta: quem aceitar fica com a reserva e começa no horário.",
        ] },
        { id: "pre-pago", titulo: "Pagamento antecipado", texto: [
          "Pedido de cliente pré-pago só vira rota depois do pagamento. Confirme em PIX recebido ou Cartão, no pedido.",
          "Para montar a rota sem esperar, ligue Montar rota sem esperar o pagamento (geral, por tipo, por cliente ou no pedido).",
        ] },
      ],
    },
    {
      titulo: "Regras e configurações",
      artigos: [
        { id: "pecas-lego", titulo: "Peças do lego: regras por nível", texto: [
          "Toda configuração tem um valor geral, em Ajustes (Configurações).",
          "Você pode criar exceções por tipo de pedido, por cliente e por motoboy, e ainda mudar as regras de um pedido só.",
          "Vale a mais específica: pedido, depois motoboy, depois cliente, depois tipo, depois a geral.",
        ] },
        { id: "modo-teste", titulo: "Modo teste", texto: [
          "Ligado, o painel inteiro fica violeta e só mostra pedidos, rotas e ganhos de teste. Nada do teste entra nas finanças reais.",
          "Use para treinar a equipe e testar regras sem mexer no que é de verdade.",
        ] },
      ],
    },
    {
      titulo: "Equipe e clientes",
      artigos: [
        { id: "equipe", titulo: "Contas da equipe", texto: [
          "Em Equipe, crie contas de motoboys e gestores, troque senhas, bloqueie ou exclua.",
          "No perfil de cada motoboy: registro, percursos, veículo, medalhas, regras próprias (como o repasse) e edição.",
        ] },
        { id: "clientes", titulo: "Clientes e cadastros", texto: [
          "Em Clientes, cadastre empresas e pessoas, preço, cobrança, coleta padrão, zonas e regras próprias.",
          "Cadastros feitos pelo site aparecem em Cadastros esperando você, com o mapa do endereço, para aprovar ou recusar.",
          "Use o site do cliente como ele para ver exatamente o que o cliente vê.",
        ] },
      ],
    },
    {
      titulo: "Finanças",
      artigos: [
        { id: "carteira", titulo: "Carteira, faturas e folha", texto: [
          "Resumo: quanto entrou e a divisão entre motoboys, gestão e Dev no período.",
          "Faturas: gere, edite, emita e marque como pagas as faturas dos clientes no crédito.",
          "Folha: o holerite de cada motoboy, com ajustes de bônus ou desconto. Para o motoboy, os ajustes aparecem distribuídos nas rotas.",
          "Clientes, Extrato e PIX: o que cada cliente rendeu, cada rota com a divisão e as chaves PIX da equipe.",
        ] },
      ],
    },
  ],
};
