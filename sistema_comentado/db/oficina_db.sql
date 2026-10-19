-- =========================================================================================
-- BANCO DE DADOS: oficina_db (Oficina Mecânica AutoCerta)
-- SGBD: SQLite 3 (Executado via node:sqlite DatabaseSync)
--
-- Papel no sistema:
-- Define o esquema relacional completo (tabelas, tipos primitivos, chaves primárias e
-- chaves estrangeiras) bem como a carga de dados mínima para testes e homologação.
-- =========================================================================================

-- Garante que o SQLite rejeite inserções ou atualizações que violem integridade referencial.
PRAGMA foreign_keys = ON;

-- =========================================================================================
-- TABELA: usuarios
-- Armazena os operadores do sistema (administradores, recepcionistas, mecânicos).
-- =========================================================================================
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- Identificador único sequencial do usuário
    nome TEXT NOT NULL,                  -- Nome completo de exibição do funcionário
    login TEXT NOT NULL UNIQUE,          -- Nome de usuário único para autenticação (sem duplicatas)
    senha TEXT NOT NULL                  -- Hash criptográfico unidirecional gerado com bcrypt (custo 8)
);

-- =========================================================================================
-- TABELA: clientes
-- Armazena os clientes proprietários dos veículos atendidos na oficina mecânica.
-- =========================================================================================
CREATE TABLE clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- Identificador único do cliente (PK)
    nome TEXT NOT NULL,                  -- Nome completo do cliente
    cpf TEXT NOT NULL,                   -- CPF criptografado reversivelmente via AES-256-GCM (formato iv:tag:dados em Base64)
    telefone TEXT,                       -- Telefone de contato (DDD + número)
    email TEXT                           -- E-mail para contato e notificações de serviço
);

-- =========================================================================================
-- TABELA: veiculos
-- Armazena os veículos cadastrados e vinculados obrigatoriamente a um cliente proprietário.
-- Cardinalidade: Um cliente pode ter 0 ou N veículos (1:N); um veículo pertence a 1 cliente (1:1).
-- =========================================================================================
CREATE TABLE veiculos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- Identificador único do veículo
    placa TEXT NOT NULL UNIQUE,          -- Placa única do veículo (padrão antigo ABC1234 ou Mercosul ABC1D23)
    modelo TEXT NOT NULL,                -- Modelo do veículo (ex.: Onix, Civic, CG 160)
    tipo TEXT NOT NULL,                  -- Tipo/Categoria (Carro, Moto, Utilitário)
    marca TEXT,                          -- Fabricante/Montadora (Chevrolet, Honda, Toyota, etc.)
    cliente_id INTEGER NOT NULL,         -- Chave estrangeira obrigatória referenciando clientes(id)
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- =========================================================================================
-- TABELA: agendamentos
-- Armazena as ordens de agendamento de serviços mecânicos/manutenção vinculados a um veículo.
-- Cardinalidade: Um veículo pode possuir 0 ou N agendamentos (1:N); um agendamento refere-se a 1 veículo.
-- =========================================================================================
CREATE TABLE agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,      -- Identificador único do agendamento
    veiculo_id INTEGER NOT NULL,               -- Chave estrangeira obrigatória referenciando veiculos(id)
    data_agendamento TEXT NOT NULL,            -- Data prevista no padrão ISO 8601 textual (AAAA-MM-DD) para facilitar ordenação cronológica
    servico TEXT NOT NULL,                     -- Descrição sucinta do serviço a ser realizado (ex: Troca de óleo)
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)
);

-- -----------------------------------------------------------------------------------------
-- DADOS INICIAIS (SEED)
-- Credenciais de teste:
-- 1. admin / admin123 (Perfil Administrador)
-- 2. ana.mecanica / ana123 (Perfil Mecânica Chefe)
-- 3. carlos.recepcao / carlos123 (Perfil Recepção)
-- -----------------------------------------------------------------------------------------

INSERT INTO usuarios (nome, login, senha) VALUES
('Administrador', 'admin', '$2b$08$aw0Z2SrxQs/8gNFsAejEHuP4j8l.9JhGCkUPYOUq6Gn2627TJEiyO'),
('Ana Beatriz (Mecânica Chefe)', 'ana.mecanica', '$2b$08$7qZzSauYX95enfj7..DVSegpCpvn7THWUhxDGbhxb/udzomsWbAq.'),
('Carlos Lima (Recepção)', 'carlos.recepcao', '$2b$08$G3DPpXJa4IYLPC.5CfovOuhe8OZTB.YaPqUheRxcvzg436ZWgkzZm');

-- Clientes com CPF já armazenados criptografados em AES-256-GCM
-- Valores originais dos CPFs:
-- Maria Silva: 52998224725
-- João Pereira: 11144477735
-- Fernanda Costa: 39053344705
INSERT INTO clientes (nome, cpf, telefone, email) VALUES
('Maria Silva', 'bk2tHfj0CRytD8W5:ELwmLLyRcZGrKO7theAkZA==:AfsLozK3ozHtL/0=', '(11) 98888-1111', 'maria.silva@email.com'),
('João Pereira', 'V3OHCWhSBKinKeHS:7E8vWVR2Uk43/1jmy7ws3w==:ZlNsi1IHvYKbEmA=', '(11) 97777-2222', 'joao.pereira@email.com'),
('Fernanda Costa', 'Kj3b+MNlcEx+Pl0l:OU1gCpLscRdxLk2OWjr0ag==:/tbYapADPTz550k=', '(11) 96666-3333', 'fernanda.costa@email.com');

-- Veículos associados aos clientes criados acima
INSERT INTO veiculos (placa, modelo, tipo, marca, cliente_id) VALUES
('ABC1D23', 'Onix', 'Carro', 'Chevrolet', 1),
('DEF4G56', 'CG 160', 'Moto', 'Honda', 2),
('GHI7J89', 'Hilux', 'Utilitário', 'Toyota', 3),
('JKL0M12', 'HB20', 'Carro', 'Hyundai', 1);

-- Agendamentos inseridos fora de ordem cronológica propositalmente para demonstrar
-- que a API e o front-end são responsáveis por ordenar e agrupar visualmente por mês/ano.
INSERT INTO agendamentos (veiculo_id, data_agendamento, servico) VALUES
(3, '2026-12-10', 'Revisão completa'),
(2, '2026-10-25', 'Troca de óleo'),
(1, '2026-11-05', 'Alinhamento e balanceamento'),
(4, '2026-11-20', 'Troca de pastilhas de freio');
