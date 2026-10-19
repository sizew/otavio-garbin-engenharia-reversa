/**
 * =========================================================================================
 * FRONT-END: CONTROLE DA TELA DE LOGIN (LOGIN.JS)
 * =========================================================================================
 * 
 * Papel no sistema:
 * Gerencia a interação do usuário na página de autenticação (login.html).
 * - Detecta se o acesso veio de um redirecionamento forçado por expiração de sessão (?expirou=1).
 * - Envia credenciais para o endpoint POST /api/login.
 * - Redireciona para o painel principal (principal.html) em caso de sucesso ou
 *   renderiza a mensagem de erro retornada pelo servidor em caso de falha.
 * =========================================================================================
 */

// Elemento DOM responsável por exibir caixas de alerta de erro de autenticação
const erro = document.getElementById('erro');

/**
 * Exibe visualmente uma mensagem de erro na caixa vermelha da tela de login.
 * @param {string} msg - Texto descritivo do erro.
 */
function mostrarErro(msg) {
    erro.textContent = msg;
    erro.style.display = 'block';
}

/**
 * Verificação de Expiração de Sessão:
 * Quando o usuário tenta acessar uma página interna com sessão expirada ou cookie ausente,
 * a função `api()` em comum.js executa `window.location.href = '/login.html?expirou=1'`.
 * Este trecho checa os parâmetros da query string da URL e exibe feedback amigável.
 */
if (new URLSearchParams(location.search).get('expirou')) {
    mostrarErro('Sua sessão expirou. Faça login novamente.');
}

/**
 * Submissão do Formulário de Login:
 * Intercepta o evento nativo de envio do formulário, previne o reload da página
 * e dispara a requisição JSON assíncrona ao servidor.
 */
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    erro.style.display = 'none'; // Limpa erros residuais anteriores
    
    try {
        await api('/api/login', {
            method: 'POST',
            body: {
                login: document.getElementById('login').value,
                senha: document.getElementById('senha').value
            }
        });
        
        // Em caso de HTTP 200 { ok: true }, navega para o dashboard do sistema
        window.location.href = '/principal.html';
    } catch (err) {
        // Falha de autenticação (ex: 400 ou 401): exibe a mensagem de erro na interface
        mostrarErro(err.message);
    }
});
