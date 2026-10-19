/**
 * =========================================================================================
 * FRONT-END: MÓDULO DE FUNÇÕES COMPARTILHADAS (COMUM.JS)
 * =========================================================================================
 * 
 * Papel no sistema:
 * Biblioteca utilitária client-side carregada em todas as páginas HTML do sistema.
 * Concentra:
 * 1. Cliente HTTP centralizado (`api()`) com tratamento unificado de erros e expiração de sessão (401).
 * 2. Prevenção contra ataques de Cross-Site Scripting (XSS) via sanitização de caracteres (`esc()`).
 * 3. Máscaras e formatações de interface (CPF e datas no padrão brasileiro DD/MM/AAAA).
 * 4. Controle visual de componentes modais e toasts/notificações de feedback.
 * 5. Gerenciamento do cabeçalho de usuário logado e ação de logout.
 * =========================================================================================
 */

/**
 * Função utilitária centralizada para chamadas HTTP assíncronas à API REST.
 * 
 * @param {string} url - Rota da API (ex: '/api/clientes').
 * @param {object} opcoes - Configurações opcionais (method, body, headers).
 * @returns {Promise<any>} Resposta JSON resolvida.
 * 
 * Tratamento de Segurança e Sessão:
 * Quando qualquer requisição protegida recebe HTTP 401 Unauthorized do back-end
 * (exceto o próprio endpoint de autenticação /api/login):
 * - Redireciona imediatamente para '/login.html?expirou=1'.
 * - Retorna uma Promise pendente `new Promise(() => {})` para congelar o fluxo de execução
 *   da página atual enquanto o browser processa a navegação, prevenindo erros no console.
 */
async function api(url, opcoes = {}) {
    const resp = await fetch(url, {
        method: opcoes.method || 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: opcoes.body ? JSON.stringify(opcoes.body) : undefined
    });

    // Interceptação de sessão expirada ou não autenticada
    if (resp.status === 401 && !url.includes('/api/login')) {
        window.location.href = '/login.html?expirou=1';
        return new Promise(() => {}); // Bloqueia resolução para evitar execuções paralelas na tela
    }

    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(dados.erro || 'Erro inesperado.');
    return dados;
}

/**
 * Função de Escape HTML (Sanitização contra XSS)
 * 
 * Por que ela existe? Que ataque ela evita?
 * Evita ataques de Cross-Site Scripting (XSS) do tipo Stored/Persistent ou Reflected.
 * Quando o sistema renderiza dados vindos do banco de dados (como nomes de clientes,
 * modelos de veículos ou descrições de serviços) diretamente em strings HTML via `innerHTML`:
 * se um usuário mal-intencionado cadastrar `<script>alert('xss')</script>` ou `<img src=x onerror=...>`,
 * o navegador interpretaria essas tags como código executável.
 * A função `esc()` substitui caracteres sensíveis de marcação por suas respectivas entidades HTML:
 * - & -> &amp;
 * - < -> &lt;
 * - > -> &gt;
 * - " -> &quot;
 * - ' -> &#39;
 * Transformando qualquer tentativa de injeção em texto plano puramente inofensivo.
 */
function esc(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Formata uma sequência de 11 dígitos no padrão usual de CPF brasileiro (000.000.000-00).
 * Se o valor não possuir 11 dígitos, retorna o texto original sem alteração.
 */
function formatarCpf(cpf) {
    const d = String(cpf).replace(/\D/g, '');
    return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf;
}

// Array constante de nomes de meses em português para o agrupamento visual dos agendamentos
const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Converte data do padrão ISO 8601 (AAAA-MM-DD) para formato legível no Brasil (DD/MM/AAAA).
 * Exemplo: '2026-10-25' -> '25/10/2026'
 */
function formatarData(iso) {
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
}

/**
 * Extrai o mês e ano para exibição em cabeçalho agrupador.
 * Exemplo: '2026-10-25' -> 'Outubro/2026'
 */
function nomeMes(iso) {
    const [a, m] = iso.split('-');
    return `${MESES[Number(m) - 1]}/${a}`;
}

/**
 * Exibe mensagens temporárias de feedback na interface (toast bar).
 * @param {string} mensagem - Texto informativo a ser exibido.
 * @param {'ok'|'erro'} tipo - Classe visual do feedback ('ok' para verde, 'erro' para vermelho).
 */
function avisar(mensagem, tipo = 'ok') {
    const el = document.getElementById('aviso');
    el.textContent = mensagem;
    el.className = 'aviso ' + tipo;
    el.style.display = 'block';
    setTimeout(() => (el.style.display = 'none'), 3500);
}

/**
 * Utilitários para controle de modais na interface.
 */
function abrirModal(id) { document.getElementById(id).style.display = 'flex'; }
function fecharModal(id) { document.getElementById(id).style.display = 'none'; }

/**
 * Função de inicialização padrão de páginas internas protegidas:
 * 1. Chama GET /api/me para verificar se o operador está logado.
 * 2. Preenche o nome do usuário no topo da barra de navegação.
 * 3. Registra o evento de clique no botão 'Sair' para chamar POST /api/logout
 *    e redirecionar para a tela de login.
 */
async function iniciarPagina() {
    const usuario = await api('/api/me');
    document.getElementById('nome-usuario').textContent = usuario.nome;
    document.getElementById('btn-sair').addEventListener('click', async () => {
        await api('/api/logout', { method: 'POST' });
        window.location.href = '/login.html';
    });
}
