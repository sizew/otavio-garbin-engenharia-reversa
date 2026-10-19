const fs = require('fs');
const path = require('path');
// SQLite embutido no Node.js (versão 22.13 ou superior): não precisa instalar nem compilar nada
const { DatabaseSync } = require('node:sqlite');

const arquivo = path.join(__dirname, 'oficina_db.sqlite');
const primeiraVez = !fs.existsSync(arquivo);

const db = new DatabaseSync(arquivo);
db.exec('PRAGMA foreign_keys = ON');

// Na primeira execução, cria e popula o banco usando o próprio script oficina_db.sql
if (primeiraVez) {
    db.exec(fs.readFileSync(path.join(__dirname, 'oficina_db.sql'), 'utf8'));
}

module.exports = db;
