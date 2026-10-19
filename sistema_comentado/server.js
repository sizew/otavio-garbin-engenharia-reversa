/**
 * =========================================================================================
 * SERVIDOR PRINCIPAL - BACK-END REST API (EXPRESS.JS + SQLITE)
 * =========================================================================================
 * 
 * Papel no sistema:
 * Ponto de entrada do sistema Oficina Mecânica AutoCerta.
 * Responsável por:
 * 1. Inicializar o servidor HTTP na porta 3000.
 * 2. Gerenciar sessões de usuários autenticados via cookies criptografados/assinados.
 * 3. Prover middleware de controle de acesso (exigirLogin).
 * 4. Disponibilizar endpoints REST para Login, Clientes, Veículos e Agendamentos.
 * 5. Aplicar regras de negócio, validação defensiva de entrada e integridade referencial.
 * 6. Servir arquivos estáticos do front-end (HTML, CSS e JS cliente).
 * =========================================================================================
 */

const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./db/conexao');
const { criptografar, descriptografar } = require('./seguranca');

const app = express();

/**
 * Tempo de inatividade máximo antes de invalidar a sessão do usuário.
 * 30 minutos em milissegundos = 30 * 60 * 1000 = 1.800.000 ms.
 */
const MINUTOS_SESSAO = 30;

// Parser para requisições com corpo formatado em JSON
app.use(express.json());

/**
 * Configuração do middleware de sessão (express-session):
 * - secret: Chave usada para assinar o ID da sessão no cookie e evitar adulterações (tampering).
 * - resave: false evita salvar sessões no storage caso não tenham sido modificadas na requisição.
 * - saveUninitialized: false só cria o cookie de sessão após o login bem-sucedido.
 * - cookie.httpOnly: true impede que scripts cliente (via JavaScript document.cookie) acessem
 *   o cookie de sessão, mitigando roubo de sessão via ataques de XSS (Cross-Site Scripting).
 * - cookie.maxAge: Expira o cookie após 30 minutos.
 */
app.use(session({
    secret: 'oficina-autocerta-sessao',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: MINUTOS_SESSAO * 60 * 1000, httpOnly: true }
}));

// Servidor de arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rota raiz redireciona diretamente para o fluxo de autenticação
app.get('/', (req, res) => res.redirect('/login.html'));

/**
 * Middleware: exigirLogin
 * 
 * Papel:
 * Intercepta requisições às rotas protegidas da API.
 * Verifica se o objeto `req.session.usuario` existe na sessão ativa.
 * Caso não exista (usuário não logado ou sessão expirada após 30 min):
 * Responde imediatamente com HTTP 401 Unauthorized e JSON informando o erro.
 * O front-end (comum.js) intercepta o 401 e redireciona o usuário para /login.html?expirou=1.
 */
function exigirLogin(req, res, next) {
    if (!req.session.usuario) {
        return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
    }
    next();
}

// =========================================================================================
// ROTAS DE AUTENTICAÇÃO E PERFIL DO USUÁRIO
// =========================================================================================

/**
 * POST /api/login
 * Papel: Autenticar operador da oficina (Administrador, Mecânico ou Recepcionista).
 * Recebe: { login: string, senha: string }
 * Valida: Presença de login e senha; existência do usuário; correspondência do hash bcrypt da senha.
 * Responde:
 * - 200 OK com { ok: true } em caso de sucesso (grava usuário na sessão).
 * - 400 Bad Request se faltarem credenciais.
 * - 401 Unauthorized se usuário não for encontrado ou senha for inválida (mensagem genérica para não vazar se o usuário existe).
 */
app.post('/api/login', (req, res) => {
    const { login, senha } = req.body;
    if (!login || !senha) {
        return res.status(400).json({ erro: 'Informe usuário e senha.' });
    }
    // Previne SQL Injection utilizando prepared statements com parâmetros '?'
    const usuario = db.prepare('SELECT * FROM usuarios WHERE login = ?').get(login.trim());
    
    // Validação da senha utilizando bcrypt com hash salgado
    if (!usuario || !bcrypt.compareSync(senha, usuario.senha)) {
        return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
    }
    
    // Armazena identificação básica na sessão do servidor (a senha nunca é mantida na sessão)
    req.session.usuario = { id: usuario.id, nome: usuario.nome };
    res.json({ ok: true });
});

/**
 * POST /api/logout
 * Papel: Encerrar a sessão de trabalho atual e invalidar o identificador de sessão.
 * Recebe: Nada
 * Responde: 200 OK com { ok: true }
 */
app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

/**
 * GET /api/me
 * Papel: Retornar os dados do usuário atualmente autenticado na sessão.
 * Recebe: Cookie de sessão
 * Proteção: exigirLogin
 * Responde: 200 OK com { id: number, nome: string }
 */
app.get('/api/me', exigirLogin, (req, res) => res.json(req.session.usuario));

// =========================================================================================
// ROTAS E VALIDAÇÕES DE CLIENTES
// =========================================================================================

/**
 * Helper de transformação:
 * Recebe o registro do cliente vindo do banco e substitui a cifra AES-256-GCM
 * pelo CPF legível em texto claro antes de entregar para o chamador.
 */
const clienteJson = c => ({ ...c, cpf: descriptografar(c.cpf) });

/**
 * Função de Validação de Cliente
 * 
 * Regras de Negócio aplicadas:
 * 1. Nome é campo obrigatório e não pode ser em branco.
 * 2. CPF deve possuir exatamente 11 dígitos numéricos (após remoção de pontuação).
 * 3. E-mail, quando fornecido, deve respeitar a estrutura de endereço de e-mail válida.
 * 4. Unicidade de CPF: Não é permitido cadastrar dois clientes com o mesmo CPF.
 *    No caso de atualização (PUT), ignora o registro do próprio cliente que está sendo editado (idAtual).
 * 
 * Por que a unicidade do CPF é checada em JavaScript e não com restrição UNIQUE no SQL?
 * Porque o algoritmo AES-256-GCM gera um IV (Initialization Vector) aleatório a cada cifra!
 * O mesmo CPF "123.456.789-00" cifrado duas vezes resulta em duas strings cifradas completamente distintas.
 * Por isso, o SQL não consegue indexar por igualdade de cifra, exigindo que o código descriptografe
 * os clientes da base para checar colisão.
 */
function validarCliente(corpo, idAtual) {
    const nome = (corpo.nome || '').trim();
    const cpf = String(corpo.cpf || '').replace(/\D/g, '');
    if (!nome) return 'Informe o nome do cliente.';
    if (cpf.length !== 11) return 'O CPF deve ter 11 dígitos.';
    if (corpo.email && !/^\S+@\S+\.\S+$/.test(corpo.email)) return 'E-mail inválido.';
    
    // Itera sobre todos os clientes descriptografando para verificar se o CPF já pertence a outro ID
    const repetido = db.prepare('SELECT * FROM clientes').all()
        .some(c => c.id !== idAtual && descriptografar(c.cpf) === cpf);
    if (repetido) return 'Já existe um cliente com este CPF.';
    return null;
}

/**
 * GET /api/clientes
 * Papel: Listar clientes com suporte a filtro de busca multicampos (nome, CPF, telefone ou e-mail).
 * Query params opcionais: ?busca=termo
 * Proteção: exigirLogin
 * 
 * Por que a busca por CPF ocorre no código e não via WHERE no SQLite?
 * Devido à criptografia AES-256-GCM com IV aleatório: o banco de dados armazena valores opacos
 * ("bk2tHfj0..."). Comandos como `WHERE cpf LIKE '%123%'` falhariam categoricamente no banco.
 * Portanto, a aplicação carrega a lista ordenada por nome, descriptografa os CPFs na memória
 * e executa a filtragem em JavaScript.
 */
app.get('/api/clientes', exigirLogin, (req, res) => {
    const termo = (req.query.busca || '').trim().toLowerCase();
    const digitos = termo.replace(/\D/g, '');
    
    // Consulta SQL com ordenação alfabética por nome
    const lista = db.prepare('SELECT * FROM clientes ORDER BY nome').all().map(clienteJson);
    
    // Filtro multicampo em memória
    res.json(lista.filter(c => !termo
        || c.nome.toLowerCase().includes(termo)
        || (c.email || '').toLowerCase().includes(termo)
        || (c.telefone || '').includes(termo)
        || (digitos && c.cpf.includes(digitos))));
});

/**
 * POST /api/clientes
 * Papel: Cadastrar um novo cliente na oficina.
 * Recebe: { nome, cpf, telefone, email }
 * Valida: validarCliente() -> nome preenchido, 11 dígitos de CPF, email válido, CPF único.
 * Responde:
 * - 201 Created com { ok: true }
 * - 400 Bad Request com { erro: string } se falhar nas validações.
 */
app.post('/api/clientes', exigirLogin, (req, res) => {
    const erro = validarCliente(req.body, null);
    if (erro) return res.status(400).json({ erro });
    const { nome, cpf, telefone, email } = req.body;
    
    // Grava no SQLite com CPF previamente criptografado
    db.prepare('INSERT INTO clientes (nome, cpf, telefone, email) VALUES (?,?,?,?)')
        .run(nome.trim(), criptografar(String(cpf).replace(/\D/g, '')), telefone || '', email || '');
    res.status(201).json({ ok: true });
});

/**
 * PUT /api/clientes/:id
 * Papel: Atualizar os dados de um cliente existente.
 * Recebe: URL param :id, corpo com { nome, cpf, telefone, email }
 * Valida: Existência do cliente por ID; validação de campos via validarCliente(req.body, id).
 * Responde:
 * - 200 OK com { ok: true }
 * - 404 Not Found se o cliente não existir.
 * - 400 Bad Request se houver falha de validação ou CPF duplicado em outro cliente.
 */
app.put('/api/clientes/:id', exigirLogin, (req, res) => {
    const id = Number(req.params.id);
    if (!db.prepare('SELECT id FROM clientes WHERE id = ?').get(id)) {
        return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }
    const erro = validarCliente(req.body, id);
    if (erro) return res.status(400).json({ erro });
    const { nome, cpf, telefone, email } = req.body;
    db.prepare('UPDATE clientes SET nome=?, cpf=?, telefone=?, email=? WHERE id=?')
        .run(nome.trim(), criptografar(String(cpf).replace(/\D/g, '')), telefone || '', email || '', id);
    res.json({ ok: true });
});

// =========================================================================================
// ROTAS E VALIDAÇÕES DE VEÍCULOS
// =========================================================================================

/**
 * Expressão Regular para Placas Brasileiras:
 * ^[A-Z]{3}\d[A-Z0-9]\d{2}$
 * Atende simultaneamente:
 * - Padrão antigo: 3 letras, 4 números (ex: ABC1234 -> \d no 5º caractere)
 * - Padrão Mercosul: 3 letras, 1 número, 1 letra, 2 números (ex: ABC1D23 -> [A-Z] no 5º caractere)
 */
const PLACA_VALIDA = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

/**
 * GET /api/veiculos
 * Papel: Listar todos os veículos cadastrados na oficina com o nome do cliente proprietário.
 * Consulta SQL: Realiza INNER JOIN entre veiculos (v) e clientes (c) através da chave estrangeira
 * v.cliente_id = c.id, ordenando alfabeticamente por modelo do veículo.
 * Proteção: exigirLogin
 * Responde: 200 OK com array de veículos enriquecidos com `cliente_nome`.
 */
app.get('/api/veiculos', exigirLogin, (req, res) => {
    res.json(db.prepare(`
        SELECT v.*, c.nome AS cliente_nome
        FROM veiculos v JOIN clientes c ON c.id = v.cliente_id
        ORDER BY v.modelo`).all());
});

/**
 * POST /api/veiculos
 * Papel: Cadastrar um novo veículo associado a um cliente.
 * Recebe: { placa, modelo, tipo, marca, cliente_id }
 * Regras de Negócio e Validações:
 * 1. Placa: Formato válido (antigo ou Mercosul) e não pode ser duplicada (unicidade).
 * 2. Modelo: Obrigatório (não vazio).
 * 3. Tipo: Obrigatório (Carro, Moto, Utilitário).
 * 4. Cliente: cliente_id obrigatório e deve existir previamente na tabela clientes.
 * 
 * Proteção em camadas:
 * - Camada 1: Front-end (select obrigatório com lista de clientes ativos).
 * - Camada 2: Back-end API (SELECT id FROM clientes WHERE id = ?) que retorna 400 se não existir.
 * - Camada 3: Banco de Dados SQLite (FOREIGN KEY (cliente_id) REFERENCES clientes(id) com PRAGMA foreign_keys = ON).
 */
app.post('/api/veiculos', exigirLogin, (req, res) => {
    const { modelo, tipo, marca, cliente_id } = req.body;
    // Normaliza placa: remove traços, espaços e converte para maiúsculo
    const placa = String(req.body.placa || '').replace(/[\s-]/g, '').toUpperCase();
    
    if (!PLACA_VALIDA.test(placa)) return res.status(400).json({ erro: 'Informe uma placa válida.' });
    if (!modelo || !modelo.trim()) return res.status(400).json({ erro: 'Informe o modelo do veículo.' });
    if (!tipo || !tipo.trim()) return res.status(400).json({ erro: 'Informe o tipo do veículo.' });
    if (!cliente_id) return res.status(400).json({ erro: 'Selecione o cliente do veículo.' });
    
    // Valida existência do cliente no banco
    if (!db.prepare('SELECT id FROM clientes WHERE id = ?').get(cliente_id)) {
        return res.status(400).json({ erro: 'Cliente não encontrado.' });
    }
    
    // Valida se a placa já está cadastrada
    if (db.prepare('SELECT id FROM veiculos WHERE placa = ?').get(placa)) {
        return res.status(400).json({ erro: 'Já existe um veículo com esta placa.' });
    }
    
    db.prepare('INSERT INTO veiculos (placa, modelo, tipo, marca, cliente_id) VALUES (?,?,?,?,?)')
        .run(placa, modelo.trim(), tipo.trim(), (marca || '').trim(), cliente_id);
    res.status(201).json({ ok: true });
});

// =========================================================================================
// ROTAS E VALIDAÇÕES DE AGENDAMENTOS
// =========================================================================================

/**
 * Validação de Data Calendárica:
 * 
 * Por que testar além da regex AAAA-MM-DD?
 * A regex /^\d{4}-\d{2}-\d{2}$/ valida apenas o padrão sintático. Ela aceitaria datas impossíveis,
 * como 2026-02-31 ou 2026-11-99.
 * Esta função utiliza o construtor Date do JavaScript e verifica se a data normalizada em ISO
 * coincide exatamente com a string enviada (evitando conversões indesejadas de estouro de mês).
 */
function dataValida(texto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto || '')) return false;
    const d = new Date(texto + 'T00:00:00');
    return !isNaN(d) && d.toISOString().slice(0, 10) === texto;
}

/**
 * GET /api/agendamentos
 * Papel: Listar todos os agendamentos cadastrados na oficina com dados de veículo e proprietário.
 * 
 * Consulta SQL com Joins Duplos:
 * agendamentos (a) -> JOIN veiculos (v) ON v.id = a.veiculo_id
 *                  -> JOIN clientes (c) ON c.id = v.cliente_id
 * 
 * Ordenação SQL:
 * ORDER BY strftime('%Y-%m', a.data_agendamento), a.data_agendamento
 * Isso garante que o banco entregue os agendamentos rigorosamente ordenados por ano/mês e por dia.
 * O front-end (agendamentos.js) consome essa ordenação para inserir as linhas de cabeçalho do mês.
 * 
 * Descriptografia:
 * Como a query busca `c.cpf`, a lista é mapeada com descriptografar(a.cliente_cpf) antes do envio.
 */
app.get('/api/agendamentos', exigirLogin, (req, res) => {
    const lista = db.prepare(`
        SELECT a.id, a.data_agendamento, a.servico,
               v.placa, v.modelo AS veiculo_modelo, v.tipo, v.marca,
               c.nome AS cliente_nome, c.cpf AS cliente_cpf, c.telefone, c.email
        FROM agendamentos a
        JOIN veiculos v ON v.id = a.veiculo_id
        JOIN clientes c ON c.id = v.cliente_id
        ORDER BY strftime('%Y-%m', a.data_agendamento), a.data_agendamento`).all();
    res.json(lista.map(a => ({ ...a, cliente_cpf: descriptografar(a.cliente_cpf) })));
});

/**
 * POST /api/agendamentos
 * Papel: Cadastrar uma nova ordem de agendamento na oficina.
 * Recebe: { veiculo_id, data_agendamento, servico }
 * Regras de Negócio e Validações:
 * 1. Veículo: veiculo_id deve ser informado e existir no banco de dados.
 * 2. Data: Deve ser uma data válida no formato YYYY-MM-DD.
 * 3. Serviço: Descrição obrigatória e não vazia.
 * Responde:
 * - 201 Created com { ok: true }
 * - 400 Bad Request se falhar na integridade ou validação.
 */
app.post('/api/agendamentos', exigirLogin, (req, res) => {
    const { veiculo_id, data_agendamento, servico } = req.body;
    if (!veiculo_id || !db.prepare('SELECT id FROM veiculos WHERE id = ?').get(veiculo_id)) {
        return res.status(400).json({ erro: 'Selecione um veículo.' });
    }
    if (!dataValida(data_agendamento)) return res.status(400).json({ erro: 'Informe uma data válida.' });
    if (!servico || !servico.trim()) return res.status(400).json({ erro: 'Informe o serviço.' });
    
    db.prepare('INSERT INTO agendamentos (veiculo_id, data_agendamento, servico) VALUES (?,?,?)')
        .run(veiculo_id, data_agendamento, servico.trim());
    res.status(201).json({ ok: true });
});

/**
 * PUT /api/agendamentos/:id
 * Papel: Atualizar especificamente a data de um agendamento existente.
 * Nota de design: No sistema atual, apenas a data pode ser reagendada (serviço e veículo permanecem).
 * Recebe: URL param :id, corpo com { data_agendamento }
 * Valida: Existência do agendamento por ID; formato e coerência da data via dataValida().
 * Responde:
 * - 200 OK com { ok: true }
 * - 404 Not Found se o agendamento não for localizado.
 * - 400 Bad Request se a data for inválida.
 */
app.put('/api/agendamentos/:id', exigirLogin, (req, res) => {
    const id = Number(req.params.id);
    if (!db.prepare('SELECT id FROM agendamentos WHERE id = ?').get(id)) {
        return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    }
    if (!dataValida(req.body.data_agendamento)) {
        return res.status(400).json({ erro: 'Informe uma data válida.' });
    }
    db.prepare('UPDATE agendamentos SET data_agendamento = ? WHERE id = ?')
        .run(req.body.data_agendamento, id);
    res.json({ ok: true });
});

// =========================================================================================
// INICIALIZAÇÃO DO SERVIDOR HTTP
// =========================================================================================
app.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'));
