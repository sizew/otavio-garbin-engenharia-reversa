/**
 * =========================================================================================
 * FRONT-END: GERENCIAMENTO DE AGENDAMENTOS (AGENDAMENTOS.JS)
 * =========================================================================================
 * 
 * Papel no sistema:
 * Controla as operações de interface na tela de agendamentos (agendamentos.html):
 * 1. Inicializa cabeçalho com usuário ativo e logout (`iniciarPagina()`).
 * 2. Carrega a listagem de serviços agendados, agrupando-os visualmente por mês/ano.
 * 3. Gerencia o modal de cadastro de novo agendamento (POST /api/agendamentos),
 *    carregando os veículos disponíveis para seleção.
 * 4. Gerencia o modal de alteração de data de agendamento existente (PUT /api/agendamentos/:id).
 * =========================================================================================
 */

const tbody = document.getElementById('tbody');
let agendamentos = [];  // Cache local dos agendamentos retornados pelo servidor
let editandoId = null;  // Identificador do agendamento cuja data está sendo alterada

// Inicializa a sessão e carrega a grade de agendamentos
iniciarPagina();
carregar();

/**
 * Carrega e renderiza a listagem de agendamentos com agrupamento visual mensal.
 * 
 * Como funciona o agrupamento e ordenação?
 * - O back-end (server.js) entrega os agendamentos já ordenados cronologicamente:
 *   ORDER BY strftime('%Y-%m', a.data_agendamento), a.data_agendamento.
 * - Este script itera sobre a lista mantendo a variável `mesAtual`. Sempre que a data
 *   pertencer a um mês diferente do anterior, insere uma linha divisória de cabeçalho
 *   `<tr class="linha-mes">` com o nome formatado do mês (ex: "Outubro/2026").
 * - Assim, a ordenação é feita pelo SQL, e a divisão visual em grupos é feita pelo JavaScript do front-end.
 */
async function carregar() {
    agendamentos = await api('/api/agendamentos');
    let mesAtual = '';
    let html = '';
    
    for (const a of agendamentos) {
        const mes = nomeMes(a.data_agendamento);
        // Detecta mudança de mês para injetar o separador visual
        if (mes !== mesAtual) {
            mesAtual = mes;
            html += `<tr class="linha-mes"><td colspan="11">${esc(mes)}</td></tr>`;
        }
        html += `
        <tr>
            <td>${esc(formatarData(a.data_agendamento))}</td>
            <td>${esc(a.servico)}</td>
            <td>${esc(a.placa)}</td>
            <td>${esc(a.veiculo_modelo)}</td>
            <td>${esc(a.tipo)}</td>
            <td>${esc(a.marca)}</td>
            <td>${esc(a.cliente_nome)}</td>
            <td>${esc(formatarCpf(a.cliente_cpf))}</td>
            <td>${esc(a.telefone)}</td>
            <td>${esc(a.email)}</td>
            <td><button class="secundario" data-id="${a.id}">Alterar data</button></td>
        </tr>`;
    }
    tbody.innerHTML = html || '<tr><td colspan="11" class="vazio">Nenhum agendamento.</td></tr>';
}

// =========================================================================================
// FLUXO DE ALTERAÇÃO DE DATA DE AGENDAMENTO
// =========================================================================================

/**
 * Delegação de clique no tbody para capturar o botão "Alterar data":
 * Localiza o agendamento pelo data-id, preenche o campo do modal com a data atual e exibe o modal.
 */
tbody.addEventListener('click', e => {
    const botao = e.target.closest('button[data-id]');
    if (!botao) return;
    editandoId = Number(botao.dataset.id);
    document.getElementById('data-edit').value =
        agendamentos.find(a => a.id === editandoId).data_agendamento;
    abrirModal('modal-data');
});

// Fecha o modal de alteração de data
document.getElementById('cancelar-data').addEventListener('click', () => fecharModal('modal-data'));

/**
 * Envio do formulário de reprogramação de data:
 * Dispara PUT /api/agendamentos/:id com { data_agendamento }.
 */
document.getElementById('form-data').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        await api('/api/agendamentos/' + editandoId, {
            method: 'PUT',
            body: { data_agendamento: document.getElementById('data-edit').value }
        });
        fecharModal('modal-data');
        avisar('Data atualizada.');
        carregar();
    } catch (err) {
        avisar(err.message, 'erro');
    }
});

// =========================================================================================
// FLUXO DE CADASTRO DE NOVO AGENDAMENTO
// =========================================================================================

/**
 * Abertura do Modal de Novo Agendamento:
 * Para cadastrar um agendamento, é mandatório escolher um veículo existente.
 * Busca a listagem atualizada de veículos (GET /api/veiculos) e monta o `<select>`
 * exibindo placa, modelo e o nome do proprietário para facilitar a identificação.
 */
document.getElementById('btn-novo').addEventListener('click', async () => {
    const veiculos = await api('/api/veiculos');
    document.getElementById('veiculo').innerHTML =
        '<option value="">Selecione...</option>' +
        veiculos.map(v => `<option value="${v.id}">${esc(v.placa)} - ${esc(v.modelo)} (${esc(v.cliente_nome)})</option>`).join('');
    document.getElementById('form-novo').reset();
    abrirModal('modal-novo');
});

// Fecha o modal de novo agendamento
document.getElementById('cancelar-novo').addEventListener('click', () => fecharModal('modal-novo'));

/**
 * Envio do formulário de inclusão de agendamento:
 * Valida e envia { veiculo_id, data_agendamento, servico } via POST /api/agendamentos.
 */
document.getElementById('form-novo').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        await api('/api/agendamentos', {
            method: 'POST',
            body: {
                veiculo_id: Number(document.getElementById('veiculo').value),
                data_agendamento: document.getElementById('data-novo').value,
                servico: document.getElementById('servico').value
            }
        });
        fecharModal('modal-novo');
        avisar('Agendamento cadastrado.');
        carregar();
    } catch (err) {
        avisar(err.message, 'erro');
    }
});
