## Sobre o projeto

O Comanda é um projeto desenvolvido com o objetivo de aprender, experimentar novas tecnologias e entender melhor como ferramentas de Inteligência Artificial podem ser utilizadas no desenvolvimento de software.

Durante o desenvolvimento, utilizei o Claude Code em sua versão gratuita e o ChatGPT como ferramentas de apoio para pesquisar soluções, entender conceitos, testar ideias, analisar problemas e desenvolver novas funcionalidades.

A proposta não é apenas criar o sistema, mas aprender durante o processo. Cada nova funcionalidade representa uma oportunidade para estudar algo diferente, testar uma abordagem e entender melhor como as partes de uma aplicação se conectam.

O projeto continua em desenvolvimento e faz parte do meu processo pessoal de aprendizado, exploração de Inteligência Artificial e desenvolvimento de novos conhecimentos em tecnologia.

## Objetivo

O principal objetivo do Comanda é aprender através da prática.

Durante o desenvolvimento, busco utilizar ferramentas de Inteligência Artificial como apoio para:

* Aprender novas tecnologias
* Entender conceitos de desenvolvimento de software
* Pesquisar diferentes soluções
* Resolver problemas encontrados durante o desenvolvimento
* Testar novas ideias
* Experimentar arquiteturas e ferramentas
* Melhorar a organização do código
* Desenvolver novas funcionalidades
* Entender melhor o funcionamento de aplicações reais
* Explorar as possibilidades da Inteligência Artificial no desenvolvimento

O projeto não está finalizado e continuará evoluindo conforme novos conhecimentos forem adquiridos.

Mais do que chegar a uma versão final, a proposta é documentar uma evolução contínua: aprender, construir, testar, corrigir e melhorar.  

Hoje a IA escreve código, cria tela, conecta API, encontra erro e até sugere arquitetura.

Isso faz um bom programador ficar absurdamente mais rápido.

Mas também faz alguém sem fundamento conseguir ir longe o suficiente para criar um problema que não sabe resolver.

Enquanto tudo funciona, parece mágica.

Quando quebra em produção, não existe prompt bonito que substitua saber o que está acontecendo por baixo.

A tendência não é o programador desaparecer.

É o programador que entende o que está fazendo + sabe usar IA abrir cada vez mais distância de quem só copia a resposta e torce para funcionar.

No final, a IA pode até escrever o código.

Mas ainda é você que precisa saber se aquilo faz sentido


O Comanda é um sistema desenvolvido para ser utilizado diretamente nos tablets disponibilizados nas mesas do restaurante.

O cliente pode acessar o cardápio pelo tablet, escolher os produtos, personalizar o pedido e acompanhar seu andamento sem precisar chamar um garçom para realizar o pedido.

Enquanto isso, os pedidos são encaminhados para a cozinha e acompanhados pela equipe através de painéis específicos. O sistema também conta com áreas para garçons, administração e acompanhamento financeiro.

O projeto está sendo desenvolvido como parte do meu processo de aprendizado em Engenharia de Software, buscando transformar os conhecimentos adquiridos durante a graduação em uma aplicação prática e cada vez mais próxima de um sistema real.

Como funciona

O fluxo principal do sistema é:

Tablet na mesa
      |
      v
Cardápio digital
      |
      v
Cliente realiza o pedido
      |
      v
Cozinha recebe o pedido
      |
      v
Pedido preparado
      |
      v
Garçom realiza a entrega
      |
      v
Cliente solicita a conta
      |
      v
Pagamento e registro

Cada mesa possui um tablet dedicado ao sistema, permitindo que o cliente faça todo o processo diretamente pelo dispositivo.

Além da experiência do cliente, o restaurante possui painéis independentes para cada área da operação:

                    COMANDA
                       |
       +---------------+---------------+
       |               |               |
    Cliente          Cozinha         Garçom
       |               |               |
    Tablet          Pedidos         Entregas
    da mesa         em preparo       Chamados
    Cardápio        Pedidos prontos  Contas
       |
       +---------------+
                       |
                  Administração
                       |
                  Financeiro

Estrutura
comanda/
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── m/
│   │   ├── cozinha/
│   │   ├── garcom/
│   │   └── financeiro/
│   │
│   ├── components/
│   │   ├── brand/
│   │   ├── kitchen/
│   │   ├── waiter/
│   │   ├── financial/
│   │   ├── menu/
│   │   ├── cart/
│   │   └── ui/
│   │
│   ├── lib/
│   │   ├── db/
│   │   ├── i18n/
│   │   ├── password.ts
│   │   ├── api-client.ts
│   │   ├── api-handler.ts
│   │   └── validation.ts
│   │
│   ├── store/
│   └── types/
│
├── scripts/
├── docker-compose.yml
├── next.config.ts
├── package.json
└── README.md


Tecnologias
Front-end
Tecnologia	Utilização
Next.js 16	Framework principal
React 19	Interfaces
TypeScript	Tipagem
Tailwind CSS	Estilização
Framer Motion	Animações
Recharts	Gráficos
Zustand	Gerenciamento de estado
Back-end
Tecnologia	Utilização
Next.js App Router	Backend e API
Node.js	Runtime
PostgreSQL	Banco de dados
pg	Driver PostgreSQL
Zod	Validação
PBKDF2-SHA512	Hash de senhas e PINs
SHA-256	Hash de tokens de sessão
Infraestrutura
Docker
Docker Compose
PWA
Turbopack
Segurança

Segurança também faz parte do processo de aprendizado e desenvolvimento do projeto.

Atualmente são utilizados alguns mecanismos para reduzir riscos comuns em aplicações web:

Senhas e PINs armazenados através de hash
Sessões protegidas por cookies
Hash dos tokens de sessão no banco
Bloqueio temporário após tentativas inválidas
Rate limiting em operações públicas
Validação de entradas utilizando Zod
Revalidação de produtos e preços no servidor
Transações PostgreSQL para criação de pedidos

Na criação de um pedido, por exemplo, os valores enviados pelo cliente não são considerados confiáveis. O servidor consulta novamente os produtos, preços, adicionais e disponibilidade antes de registrar a operação.

Multi-tenant

O Comanda foi estruturado para trabalhar com múltiplos restaurantes dentro da mesma aplicação.

Cada restaurante possui seus próprios:

Cardápios
Produtos
Mesas
Pedidos
Usuários
Configurações
Dados financeiros

Exemplo:

/comanda

├── restaurante-a
│   ├── cardápio
│   ├── cozinha
│   ├── garçom
│   └── financeiro
│
└── restaurante-b
    ├── cardápio
    ├── cozinha
    ├── garçom
    └── financeiro

Usuário	Senha	Papel	Restaurante
admin	comanda2025	superadmin	(plataforma toda)
gerente.brasa	brasa123	manager	Sabor & Brasa
gerente.verde	verde123	manager	Verde Vida
garcom.ana	senha123	waiter	Sabor & Brasa
garcom.carlos	senha123	waiter	Sabor & Brasa
garcom.julia	senha123	waiter	Verde Vida

E os PINs operacionais (cozinha/financeiro/admin, tela de PIN) são 1234 por padrão pra todo restaurante criado, também vindo do seed.

Licença

Projeto para fins de estudo e portfólio.

Todos os direitos reservados.

Joao Victor Kziozek estudande de Eng De Softaware - Ugv - Centro Universitário

