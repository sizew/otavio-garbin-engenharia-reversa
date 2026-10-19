/**
 * =========================================================================================
 * MÓDULO DE CONEXÃO E INICIALIZAÇÃO DO BANCO DE DADOS
 * =========================================================================================
 * 
 * Papel no sistema:
 * Estabelece a conexão com o banco de dados relacional SQLite utilizando a biblioteca
 * nativa e síncrona do Node.js (node:sqlite - disponível nativamente a partir do Node.js 22.13).
 * Além disso, automatiza o "bootstrap" do banco na primeira execução: se o arquivo
 * 'oficina_db.sqlite' ainda não existir, cria a estrutura e popula os dados iniciais
 * a partir do script DDL/DML 'oficina_db.sql'.
 * =========================================================================================
 */

const fs = require('fs');
const path = require('path');

// SQLite embutido no Node.js (versão 22.13 ou superior):
// A classe DatabaseSync dispensa drivers binários externos como better-sqlite3 ou sqlite3.
const { DatabaseSync } = require('node:sqlite');

// Define o caminho absoluto para o arquivo de banco de dados
const arquivo = path.join(__dirname, 'oficina_db.sqlite');

// Verifica se é a primeira inicialização do sistema verificando a existência do arquivo físico
const primeiraVez = !fs.existsSync(arquivo);

// Instancia a conexão síncrona com o arquivo SQLite
const db = new DatabaseSync(arquivo);

/**
 * Ativação explícita de integridade referencial:
 * Por padrão histórico no SQLite, a checagem de chaves estrangeiras (FOREIGN KEY) vem desativada.
 * A execução deste PRAGMA garante que restrições como REFERENCES clientes(id) e
 * REFERENCES veiculos(id) sejam estritamente verificadas em tempo de inserção/deleção.
 */
db.exec('PRAGMA foreign_keys = ON');

/**
 * Automação de Carga Inicial (Seed):
 * Se o arquivo .sqlite não existia antes desta execução, lê o conteúdo de 'oficina_db.sql'
 * e executa todas as instruções DDL (criação de tabelas) e DML (carga de seed) de forma síncrona.
 */
if (primeiraVez) {
    db.exec(fs.readFileSync(path.join(__dirname, 'oficina_db.sql'), 'utf8'));
}

// Exporta o objeto singleton 'db' para ser consumido pelas rotas da API em server.js
module.exports = db;
