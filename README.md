# Sistema de Finanças Pessoais

Um completo sistema de controle de finanças pessoais construído com TypeScript, Express.js, SQLite e frontend moderno.

## 🚀 Funcionalidades

### Dashboard
- Visão geral das finanças com saldo total, receitas e despesas mensais
- Gráficos interativos de gastos por categoria e fluxo de caixa
- Resumo de metas de economia

### Gerenciamento de Transações
- Adicionar, editar e excluir transações (receitas e despesas)
- Categorias personalizadas e pré-definidas
- Filtros por tipo, categoria, data e valor
- Exportação de dados em CSV

### Lista de Compras
- Gerenciar lista de compras com categorias
- Marcar itens como comprados
- Cálculo de totais estimados

### Cartões de Crédito
- Cadastro múltiplos cartões
- Controle de limites e saldos
- Faturas próximas de vencer
- Gráfico de utilização

### Orçamentos
- Criar orçamentos por categoria
- Alertas quando orçamentos estão próximos de serem estourados
- Gráficos de progresso

### Parcelamentos
- Controle de parcelamentos
- Visualização de próximas parcelas
- Marcar parcelas como pagas

### Metas Financeiras
- Definir e acompanhar metas financeiras
- Progresso visual
- Prazos estimados

### Relatórios e Análises
- Relatórios mensais e anuais
- Gráficos comparativos
- Exportação de dados

## 🛠️ Tecnologias

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **TypeScript** - Tipagem estática
- **SQLite** - Banco de dados
- **Chart.js** - Gráficos (via frontend)

### Frontend
- **HTML5** - Estrutura
- **CSS3** - Estilização
- **Vanilla JavaScript** - Lógica do cliente
- **Chart.js** - Visualizações

## 📦 Instalação

1. Clone o repositório:
```bash
git clone <repositorio>
cd finance-system
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o desenvolvimento:
```bash
npm run dev
```

O servidor backend será iniciado na porta 3000 e o frontend na porta 8080.

## 🖥️ Ambiente de Produção

1. Build do projeto:
```bash
npm run build
```

2. Inicie o servidor:
```bash
npm start
```

## 🗄️ Estrutura do Banco de Dados

O sistema usa SQLite com as seguintes tabelas:

- **transactions** - Transações financeiras
- **shopping_items** - Lista de compras
- **credit_cards** - Cartões de crédito
- **budgets** - Orçamentos
- **installments** - Parcelamentos
- **financial_goals** - Metas financeiras
- **categories** - Categorias personalizadas

## 📱 Interface

A interface é responsiva e se adapta a diferentes tamanhos de tela:

- **Desktop** - Layout completo com sidebar
- **Mobile** - Layout otimizado para touch

## 🎨 Design

- Design moderno com gradientes e sombras
- Coaches consistentes para tipos de transações
- Indicadores visuais para status de orçamentos
- Gráficos interativos e animados

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=3000
FRONTEND_URL=http://localhost:8080
```

### Personalização

- Cores: Modifique o arquivo `public/css/style.css`
- Categorias: Adicione novas categorias no banco de dados
- Configurações: Ajuste variáveis no `src/server.ts`

## 🚀 Como Usar

1. **Dashboard** - Visão geral das suas finanças
2. **Transações** - Adicione suas receitas e despesas
3. **Lista de Compras** - Gerencie suas compras
4. **Cartões** - Controle seus cartões de crédito
5. **Orçamentos** - Defina metas de gastos
6. **Relatórios** - Analise seu padrão de gastos

## 📊 Dados de Exemplo

O sistema vem com dados de exemplo para você começar:

- Transações de exemplo
- Categorias pré-definidas
- Cartões de crédito padrão
- Orçamentos mensais

## 🔒 Segurança

- Validação de dados em todas as operações
- Sanitização de inputs
- CORS configurado
- Helmet para segurança básica

## 🚧 Desenvolvimento

### Estrutura do Projeto

```
finance-system/
├── src/
│   ├── controllers/     # Lógica de negócio
│   ├── models/         # Modelos de dados
│   ├── routes/         # Rotas da API
│   ├── services/       # Serviços
│   ├── utils/          # Utilitários
│   └── server.ts       # Servidor principal
├── public/
│   ├── css/           # Estilos
│   ├── js/            # JavaScript frontend
│   └── index.html     # HTML principal
└── database.sqlite    # Banco de dados
```

### Adicionar Novas Funcionalidades

1. Crie novas rotas em `src/routes/`
2. Adicione controladores em `src/controllers/`
3. Atualize o modelo de dados em `src/models/`
4. Atualize o frontend em `public/`

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Crie um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 🆘 Suporte

Para suporte e dúvidas:
- Crie uma issue no GitHub
- Verifique a documentação
- Entre em contato via issues

## 🎯 Próximos Passos

- [ ] Autenticação de usuário
- [ ] Importação de extratos bancários
- [ ] Relatórios avançados
- [ ] Notificações
- [ ] Análise preditiva
- [ ] Suporte a múltiplos usuários
- [ ] Mobile app

---

**Desenvolvido com ❤️ para controle financeiro pessoal**