# Dicas para o aluno

Este sistema tem dois usos: primeiro você o **entende** (engenharia reversa), depois o **usa como base** para o seu projeto. Siga as dicas na ordem.

---

## Parte 1 - Como fazer a engenharia reversa

### 1. Comece pelo que você vê, não pelo código
1. Rode o sistema e use todas as telas como um usuário.
2. Anote cada tela, cada botão e cada mensagem de erro que aparecer.
3. Só depois abra o código. Você vai reconhecer o que cada trecho faz.

### 2. Siga o caminho de uma ação, de ponta a ponta
Pegue uma ação simples (ex.: cadastrar um veículo) e siga o caminho inteiro:

```
clique no botão  ->  veiculos.js (fetch)  ->  comum.js (api())
   ->  server.js (rota POST /api/veiculos)  ->  validações
   ->  SQL (INSERT)  ->  banco  ->  resposta JSON  ->  tela atualizada
```

Repita com uma ação de edição e uma de listagem. Com três caminhos entendidos, você entende o sistema todo, porque o padrão se repete.

### 3. Use o navegador como ferramenta de investigação
- **F12 > Network:** veja cada requisição (método, URL, corpo enviado, resposta, status).
- **F12 > Application > Cookies:** veja o cookie de sessão e quando ele expira.
- **F12 > Console:** teste `fetch('/api/clientes').then(r => r.json()).then(console.log)`.
- **cURL ou Postman:** chame as rotas sem usar a tela e veja o que o back-end valida sozinho.

### 4. Olhe o banco de verdade
- Abra `db/oficina_db.sqlite` (DB Browser for SQLite ou extensão do VS Code) depois de rodar o sistema uma vez.
- Confira a coluna `cpf`: por que ela está ilegível? E a coluna `senha`?
- Rode consultas à mão (`SELECT ... JOIN ...`) e compare com o que a tela mostra.

### 5. Mapa mental dos arquivos

| Arquivo | Papel |
|---|---|
| `server.js` | Rotas da API, validações e regras de negócio |
| `seguranca.js` | Criptografia reversível do CPF |
| `db/conexao.js` | Conexão e criação do banco na primeira execução |
| `db/oficina_db.sql` | Estrutura e dados iniciais |
| `public/js/comum.js` | Funções compartilhadas (chamada à API, tratamento de sessão, `esc()`) |
| `public/js/*.js` | Um script por página |
| `public/*.html` | Estrutura das telas |

### 6. Prove cada afirmação
Ao documentar, nunca escreva "acho que". Escreva "no `server.js`, linha X, a rota Y valida Z" ou "testei A e aconteceu B". Cole o trecho ou o print como evidência.

### 7. Teste o que NÃO deveria funcionar
Os melhores casos de teste são os de erro: campo vazio, CPF com 3 dígitos, data 31/02, acessar página sem login, cadastrar duas vezes o mesmo CPF ou a mesma placa. Teste também o que o back-end faz quando o front-end é burlado (chame a API direto).

### 8. Comente o código enquanto descobre
Comentar é a melhor forma de provar que você entendeu. **É obrigatório entregar o código comentado.** Faça uma cópia da pasta `sistema` e vá comentando à medida que investiga.

**O que comentar**
- No topo de cada arquivo: qual é o papel dele no sistema.
- Cada função e cada rota: o que recebe, o que devolve e quando é usada.
- Cada consulta SQL: o que ela busca, o que o `JOIN` liga e por que a ordenação é essa.
- Cada validação: qual regra de negócio ela protege.
- Trechos que parecem estranhos: por que foram escritos assim.

**Comente o porquê, não o óbvio**

```js
// RUIM: repete o que o código já diz
// soma 1 ao contador
contador++;

// BOM: explica a intenção e a regra
// o CPF fica criptografado no banco; por isso a busca precisa
// descriptografar antes de comparar (LIKE no SQL não funcionaria)
const lista = db.prepare('SELECT * FROM clientes').all().map(clienteJson);
```

**Padrão sugerido para rotas**

```js
// POST /api/veiculos
// Recebe: placa, modelo, tipo, marca, cliente_id
// Valida: placa no formato correto e única; cliente existente
// Responde: 201 em caso de sucesso, 400 com { erro } em caso de falha
app.post('/api/veiculos', exigirLogin, (req, res) => { ... });
```

**Dicas**
- Se você não consegue explicar um trecho em uma frase, ainda não o entendeu. Volte ao passo 2 e siga o caminho da ação.
- Comentários errados são piores que a falta de comentário. Teste antes de afirmar.
- Use o mesmo idioma e o mesmo estilo em todos os arquivos.
- Não comente tudo linha a linha; priorize o que ajuda outra pessoa a entender o sistema.
- No seu projeto final, mantenha o hábito: código comentado também mostra autoria.

---

## Parte 2 - Como usar como base no seu projeto

### 1. Entenda o padrão antes de copiar
Todo cadastro do sistema segue a mesma receita. Se você dominar uma, domina todas:

1. **Tabela** no `oficina_db.sql`
2. **Rotas** `GET`, `POST` e `PUT` no `server.js`, com validação
3. **Página HTML** com tabela, botão "novo" e modal
4. **Script JS** que carrega a lista, abre o modal e envia o formulário

### 2. Para criar uma nova entidade (checklist)
- [ ] Criar a tabela no `.sql` (com PK, FK e `NOT NULL` onde fizer sentido)
- [ ] Atualizar o `gerar_sql.js` se quiser dados iniciais
- [ ] Criar as rotas no `server.js` usando `exigirLogin`
- [ ] Validar tudo no back-end (nunca confie só no front)
- [ ] Criar `entidade.html` e `js/entidade.js` copiando uma página parecida
- [ ] Adicionar o cartão no `principal.html`
- [ ] Testar o caminho feliz e pelo menos 3 casos de erro
- [ ] Apagar `db/oficina_db.sqlite` para o banco ser recriado

### 3. Ao mudar o banco, lembre
O arquivo `.sqlite` só é criado se **não existir**. Se você alterou o `.sql` e nada mudou, apague o `.sqlite` e rode de novo (isso zera os dados).

### 4. Adapte o contexto sem quebrar
Ao trocar o segmento do seu projeto, renomeie na ordem: **banco -> API -> front-end -> textos da tela**. Depois busque o termo antigo no projeto inteiro (`Ctrl+Shift+F`) para não sobrar nada. Teste tudo de novo.

### 5. Melhorias que valorizam o seu projeto
Escolha algumas e explique no seu relatório:

**Segurança**
- Mover o segredo da sessão e a chave de criptografia para variáveis de ambiente (arquivo `.env`)
- Limitar tentativas de login
- Cookie com `sameSite` e, em produção, `secure`
- Perfis de usuário (ex.: só o admin cadastra usuários)

**Funcionalidades**
- Excluir e inativar registros (com confirmação)
- Editar o agendamento inteiro, não só a data
- Impedir dois agendamentos no mesmo dia e horário
- Filtros e paginação nas listagens
- Máscara e validação real do CPF (dígitos verificadores)

**Qualidade**
- Separar as rotas em arquivos (`routes/clientes.js` etc.)
- Escrever testes automatizados da API
- Tratar erros do servidor com uma resposta padrão
- README explicando como instalar e usar

### 6. Cuidados importantes
- **Não entregue o projeto igual ao original.** Entender e adaptar é o objetivo; copiar sem entender será percebido na hora de explicar.
- **Esteja pronto para explicar qualquer linha** que está no seu projeto.
- **Nunca coloque senhas reais ou CPFs reais** nos dados de teste.
- **Faça commits pequenos** no Git, com mensagens claras. Isso mostra o seu processo.

---

## Parte 3 - Entrega pelo GitHub

A entrega é um repositório no GitHub. O histórico de commits mostra o seu processo, então **commite aos poucos, não só no último dia**.

**Primeiros passos**
```
git init
git add .
git commit -m "Adiciona sistema base"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

**Rotina a cada etapa concluída**
```
git add .
git commit -m "Documenta rotas de clientes na API"
git push
```

**Boas mensagens de commit:** curtas e no imperativo, dizendo o que mudou ("Comenta server.js", "Adiciona DER", "Escreve casos de teste de login"). Evite "mudanças", "teste", "final2".

**Cuidados**
- O `.gitignore` já impede o envio de `node_modules` e do `oficina_db.sqlite`. Não retire.
- Nunca envie senhas ou chaves reais.
- Confira no site do GitHub se os arquivos subiram antes de entregar.
- Abra o link do repositório em uma aba anônima para testar se o professor consegue acessar.

---

## Perguntas para você se fazer antes de entregar

1. Meu código está comentado, e os comentários explicam o porquê?
2. Consigo desenhar o DER de memória?
3. Consigo explicar o que acontece do clique até o banco e de volta?
4. Sei dizer por que o CPF é criptografado e a senha usa hash (e a diferença entre os dois)?
5. Sei o que acontece quando a sessão expira?
6. Meus testes cobrem erros, e não só o caminho feliz?
7. Consigo explicar o que eu mudei em relação à base e por quê?
8. Meu repositório tem README, histórico de commits e abre sem erro para o professor?
