/**
 * =========================================================================================
 * FRONT-END: GERENCIAMENTO DE VEÍCULOS (VEICULOS.JS)
 * =========================================================================================
 * 
 * Papel no sistema:
 * Controla as operações de interface na tela de veículos (veiculos.html):
 * 1. Inicializa o cabeçalho de usuário e logout.
 * 2. Carrega a listagem geral de veículos da oficina com o nome do cliente proprietário.
 * 3. Gerencia o modal de cadastro de veículos, incluindo a carga dinâmica da lista de
 *    clientes no elemento `<select id="cliente">`.
 * 4. Valida e submete a inclusão de novos veículos para POST /api/veiculos.
 * =========================================================================================
 */

const tbody = document.getElementById('tbody');

// Inicializa a sessão na interface e carrega a listagem de veículos
iniciarPagina();
carregar();

/**
 * Consulta a lista de veículos na API e atualiza as linhas da tabela HTML.
 * Os dados retornados já incluem o campo `cliente_nome` oriundo do INNER JOIN SQL no back-end.
 * Todos os campos exibidos passam por sanitização contra XSS através de `esc()`.
 */
async function carregar() {
    const veiculos = await api('/api/veiculos');
    tbody.innerHTML = veiculos.map(v => `
        <tr>
            <td>${esc(v.placa)}</td>
            <td>${esc(v.modelo)}</td>
            <td>${esc(v.tipo)}</td>
            <td>${esc(v.marca)}</td>
            <td>${esc(v.cliente_nome)}</td>
        </tr>`).join('') || '<tr><td colspan="5" class="vazio">Nenhum veículo cadastrado.</td></tr>';
}

/**
 * Abertura do Modal de Novo Veículo:
 * Regra de Negócio: Todo veículo precisa pertencer obrigatoriamente a um cliente.
 * Por isso, antes de exibir o formulário, este evento busca a lista atualizada
 * de clientes cadastrados (GET /api/clientes) e popula as opções do `<select>`.
 */
document.getElementById('btn-novo').addEventListener('click', async () => {
    const clientes = await api('/api/clientes');
    document.getElementById('cliente').innerHTML =
        '<option value="">Selecione...</option>' +
        clientes.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
    document.getElementById('form').reset();
    abrirModal('modal');
});

// Fecha o modal ao cancelar
document.getElementById('btn-cancelar').addEventListener('click', () => fecharModal('modal'));

/**
 * Envio do formulário de veículo:
 * Monta o payload JSON e envia via POST /api/veiculos.
 * Em caso de sucesso: fecha o modal, notifica o usuário e atualiza a listagem.
 * Em caso de erro (ex: placa duplicada ou formato inválido): exibe a mensagem de erro retornada.
 */
document.getElementById('form').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        await api('/api/veiculos', {
            method: 'POST',
            body: {
                placa: document.getElementById('placa').value,
                modelo: document.getElementById('modelo').value,
                tipo: document.getElementById('tipo').value,
                marca: document.getElementById('marca').value,
                cliente_id: Number(document.getElementById('cliente').value)
            }
        });
        fecharModal('modal');
        avisar('Veículo cadastrado.');
        carregar();
    } catch (err) {
        avisar(err.message, 'erro');
    }
});
