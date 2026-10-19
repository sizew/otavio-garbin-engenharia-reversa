/**
 * =========================================================================================
 * FRONT-END: GERENCIAMENTO DE CLIENTES (CLIENTES.JS)
 * =========================================================================================
 * 
 * Papel no sistema:
 * Controla todas as operações de interface na tela de clientes (clientes.html):
 * 1. Inicializa cabeçalho com usuário ativo e botão de logout (`iniciarPagina()`).
 * 2. Carrega e renderiza a tabela de clientes com suporte a filtro de busca dinâmica.
 * 3. Abre o modal para cadastro de novo cliente (POST) ou edição de cliente existente (PUT).
 * 4. Trata a submissão do formulário enviando dados à API e exibindo mensagens de feedback.
 * =========================================================================================
 */

const tbody = document.getElementById('tbody');
let clientes = [];      // Armazena em memória o cache local dos clientes retornados pela API
let editandoId = null;  // Controla o estado do modal: null = Novo Cliente (POST), number = Edição (PUT)

// Inicializa a página e efetua a primeira carga de clientes cadastrados
iniciarPagina();
carregar();

/**
 * Consulta a lista de clientes no back-end e atualiza o DOM da tabela.
 * 
 * Fluxo:
 * 1. Lê o termo de busca do input.
 * 2. Faz GET /api/clientes?busca=<termo>.
 * 3. Mapeia o array recebido gerando linhas <tr> devidamente sanitizadas com `esc()`
 *    e formatadas com `formatarCpf()`.
 * 4. Se a lista estiver vazia, exibe mensagem informativa amigável.
 */
async function carregar() {
    const termo = document.getElementById('busca').value.trim();
    clientes = await api('/api/clientes?busca=' + encodeURIComponent(termo));
    tbody.innerHTML = clientes.map(t => `
        <tr>
            <td>${esc(t.nome)}</td>
            <td>${esc(formatarCpf(t.cpf))}</td>
            <td>${esc(t.telefone)}</td>
            <td>${esc(t.email)}</td>
            <td><button class="secundario" data-id="${t.id}">Editar</button></td>
        </tr>`).join('') || '<tr><td colspan="5" class="vazio">Nenhum cliente encontrado.</td></tr>';
}

// Dispara busca ao clicar no botão 'Buscar' ou pressionar a tecla Enter no campo
document.getElementById('btn-buscar').addEventListener('click', carregar);
document.getElementById('busca').addEventListener('keydown', e => { if (e.key === 'Enter') carregar(); });

/**
 * Abre o modal de formulário configurando-o para Inclusão ou Alteração.
 * 
 * @param {object|null} cliente - Objeto do cliente selecionado para edição ou null para novo.
 */
function abrirFormulario(cliente) {
    editandoId = cliente ? cliente.id : null;
    document.getElementById('modal-titulo').textContent = cliente ? 'Editar cliente' : 'Novo cliente';
    document.getElementById('nome').value = cliente ? cliente.nome : '';
    document.getElementById('cpf').value = cliente ? formatarCpf(cliente.cpf) : '';
    document.getElementById('telefone').value = cliente ? cliente.telefone : '';
    document.getElementById('email').value = cliente ? cliente.email : '';
    abrirModal('modal');
}

// Abertura do modal para novo cadastro
document.getElementById('btn-novo').addEventListener('click', () => abrirFormulario(null));

// Fechamento do modal ao clicar em 'Cancelar'
document.getElementById('btn-cancelar').addEventListener('click', () => fecharModal('modal'));

/**
 * Delegação de eventos no tbody da tabela:
 * Captura o clique em qualquer botão "Editar" utilizando o atributo data-id,
 * localiza o registro no array em memória e preenche o modal.
 */
tbody.addEventListener('click', e => {
    const botao = e.target.closest('button[data-id]');
    if (botao) abrirFormulario(clientes.find(t => t.id === Number(botao.dataset.id)));
});

/**
 * Envio do formulário do cliente:
 * - Se editandoId for nulo -> Executa POST /api/clientes (Inclusão)
 * - Se editandoId existir -> Executa PUT /api/clientes/:id (Atualização)
 * Em caso de sucesso: fecha o modal, notifica o usuário via toast e recarrega a tabela.
 * Em caso de erro (ex: CPF já cadastrado, 400 Bad Request): exibe toast com o erro retornado pela API.
 */
document.getElementById('form').addEventListener('submit', async e => {
    e.preventDefault();
    const corpo = {
        nome: document.getElementById('nome').value,
        cpf: document.getElementById('cpf').value,
        telefone: document.getElementById('telefone').value,
        email: document.getElementById('email').value
    };
    try {
        await api(editandoId ? '/api/clientes/' + editandoId : '/api/clientes',
                  { method: editandoId ? 'PUT' : 'POST', body: corpo });
        fecharModal('modal');
        avisar(editandoId ? 'Cliente atualizado.' : 'Cliente cadastrado.');
        carregar();
    } catch (err) {
        avisar(err.message, 'erro');
    }
});
