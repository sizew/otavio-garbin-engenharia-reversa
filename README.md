# Oficina Mecânica AutoCerta - Atividade de Engenharia Reversa

Este repositório contém o estudo completo de Engenharia Reversa, documentação técnica, casos de teste executados e código-fonte comentado do sistema web da **Oficina Mecânica AutoCerta**.

---

## 📋 Visão Geral do Projeto

O sistema é uma aplicação web full stack construída com arquitetura MVC/REST enxuta, utilizando **Node.js** com a biblioteca nativa `node:sqlite` para persistência, **Express.js** para a API REST e autenticação por sessões, e front-end com **HTML5, CSS3 e JavaScript Vanilla**.

### Principais Funcionalidades
- **Autenticação de Usuários:** Controle de sessão com timeout de 30 minutos e cookies seguros (`httpOnly`).
- **Gestão de Clientes:** Cadastro e edição de clientes com proteção e criptografia de CPF em repouso (AES-256-GCM).
- **Gestão de Veículos:** Cadastro de veículos vinculado obrigatoriamente a um proprietário, com validação de placas (padrão antigo e Mercosul).
- **Agendamentos de Serviços:** Listagem cronológica com agrupamento visual mensal e controle de reagendamento de datas.

---

## 📂 Estrutura de Arquivos

```text
├── DICAS_PARA_O_ALUNO.md               # Orientações originais da atividade acadêmica
├── ENUNCIADO_engenharia_reversa.pdf    # Enunciado oficial com critérios de avaliação
├── RELATORIO_ENGENHARIA_REVERSA.md     # Documento técnico completo (Entregáveis 1 a 7 e Perguntas)
├── README.md                           # Este arquivo de apresentação e guia rápido
├── .gitignore                          # Ignora dependências (node_modules), banco e arquivos de ambiente
├── sistema/                            # Código-fonte original da aplicação
│   ├── db/
│   │   ├── conexao.js                  # Conexão síncrona com SQLite e bootstrap automático
│   │   ├── oficina_db.sql              # Script DDL/DML de criação de tabelas e carga inicial
│   │   └── gerar_sql.js                # Gerador do script SQL com hashes e cifras
│   ├── public/                         # Arquivos estáticos do front-end
│   │   ├── css/style.css               # Estilos da interface
│   │   ├── js/
│   │   │   ├── comum.js                # Cliente HTTP (api), sanitização XSS (esc), formatações
│   │   │   ├── login.js                # Controle da tela de login
│   │   │   ├── clientes.js             # Listagem, busca e modais de clientes
│   │   │   ├── veiculos.js             # Listagem e cadastro de veículos
│   │   │   └── agendamentos.js         # Listagem mensal agrupada e reagendamento
│   │   ├── login.html
│   │   ├── principal.html
│   │   ├── clientes.html
│   │   ├── veiculos.html
│   │   └── agendamentos.html
│   ├── seguranca.js                    # Funções de cifra e decifra AES-256-GCM para o CPF
│   ├── server.js                       # Servidor Express, rotas da API e regras de negócio
│   ├── package.json                    # Dependências do projeto
│   └── LEIA-ME.txt                     # Instruções básicas de execução e credenciais
└── sistema_comentado/                  # Cópia completa do código-fonte comentada (Entregável 8)
    ├── db/
    ├── public/
    ├── seguranca.js
    └── server.js
```

---

## 🚀 Como Executar o Sistema

### Pré-requisitos
- **Node.js:** Versão 22.13.0 ou superior (versão testada: `v24.22.0`).  
  Verifique com o comando:
  ```bash
  node -v
  ```

### Passo a Passo
1. Entre na pasta da aplicação:
   ```bash
   cd sistema
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor:
   ```bash
   npm start
   ```
4. Acesse no navegador:
   ```text
   http://localhost:3000
   ```

### 🔑 Credenciais para Testes (Seed Inicial)

| Usuário | Senha | Perfil |
| :--- | :--- | :--- |
| `admin` | `admin123` | Administrador Geral |
| `ana.mecanica` | `ana123` | Mecânica Chefe |
| `carlos.recepcao` | `carlos123` | Recepção |

> **Dica:** O banco de dados SQLite (`db/oficina_db.sqlite`) é gerado automaticamente na primeira execução a partir de `db/oficina_db.sql`. Se desejar resetar os dados para o estado original, basta apagar o arquivo `db/oficina_db.sqlite` e reiniciar a aplicação.

---

## 📑 Resumo dos Entregáveis

| # | Entregável | Localização no Repositório |
| :-: | :--- | :--- |
| **1** | Levantamento de Requisitos (RFs e Regras de Negócio) | [RELATORIO_ENGENHARIA_REVERSA.md - Seção 1](file:///home/h3/%C3%81rea%20de%20trabalho/h3/sistema/RELATORIO_ENGENHARIA_REVERSA.md#1-levantamento-de-requisitos-e-regras-de-negocio) |
| **2** | Modelo de Dados (DER Mermaid + Dicionário de Dados) | [RELATORIO_ENGENHARIA_REVERSA.md - Seção 2](file:///home/h3/%C3%81rea%20de%20trabalho/h3/sistema/RELATORIO_ENGENHARIA_REVERSA.md#2-modelo-de-dados-der) |
| **3** | Mapa Completo da API REST | [RELATORIO_ENGENHARIA_REVERSA.md - Seção 3](file:///home/h3/%C3%81rea%20de%20trabalho/h3/sistema/RELATORIO_ENGENHARIA_REVERSA.md#3-mapa-completo-da-api-rest-back-end) |
| **4** | Mapa do Front-end (Páginas, Scripts e Ações) | [RELATORIO_ENGENHARIA_REVERSA.md - Seção 4](file:///home/h3/%C3%81rea%20de%20trabalho/h3/sistema/RELATORIO_ENGENHARIA_REVERSA.md#4-mapa-do-front-end-interface-com-o-usuario) |
| **5** | Análise de Segurança e 3 Propostas de Melhoria | [RELATORIO_ENGENHARIA_REVERSA.md - Seção 5](file:///home/h3/%C3%81rea%20de%20trabalho/h3/sistema/RELATORIO_ENGENHARIA_REVERSA.md#5-analise-de-seguranca) |
| **6** | Casos de Teste (21 casos executados com resultados reais) | [RELATORIO_ENGENHARIA_REVERSA.md - Seção 6](file:///home/h3/%C3%81rea%20de%20trabalho/h3/sistema/RELATORIO_ENGENHARIA_REVERSA.md#6-casos-de-teste-executados-e-evidencias) |
| **7** | Diagrama de Fluxo de Execução (Mermaid Sequence) | [RELATORIO_ENGENHARIA_REVERSA.md - Seção 7](file:///home/h3/%C3%81rea%20de%20trabalho/h3/sistema/RELATORIO_ENGENHARIA_REVERSA.md#7-diagrama-de-fluxo-de-execucao) |
| **8** | Código-fonte Comentado com Racional ("Porquê") | Pasta [`sistema_comentado/`](file:///home/h3/%C3%81rea%20de%20trabalho/h3/sistema/sistema_comentado/) |
| **?** | Respostas Fundamentadas às Perguntas de Investigação | [RELATORIO_ENGENHARIA_REVERSA.md - Seção 8](file:///home/h3/%C3%81rea%20de%20trabalho/h3/sistema/RELATORIO_ENGENHARIA_REVERSA.md#8-respostas-fundamentadas-as-perguntas-de-investigacao) |
