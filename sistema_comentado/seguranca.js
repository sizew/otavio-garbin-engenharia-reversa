/**
 * =========================================================================================
 * MÓDULO DE SEGURANÇA E CRIPTOGRAFIA (AES-256-GCM)
 * =========================================================================================
 * 
 * Papel no sistema:
 * Este módulo provê funções de cifra e decifra simétrica autenticada exclusivamente para
 * dados sensíveis em repouso no banco de dados (especificamente o CPF dos clientes).
 * 
 * Por que AES-256-GCM e não Hash (como bcrypt)?
 * - Senhas utilizam funções de Hash criptográfico unidirecionais com Salt (bcrypt),
 *   pois nunca precisam ser recuperadas em texto claro — apenas comparadas no login.
 * - O CPF, no entanto, é um dado cadastral que precisa ser exibido na tela para os
 *   mecânicos e recepcionistas, impresso ou editado. Portanto, exige criptografia REVERSÍVEL.
 * - O modo GCM (Galois/Counter Mode) oferece confidencialidade e integridade autenticada
 *   (via Auth Tag), impedindo que dados cifrados sejam alterados de forma não detectada.
 * =========================================================================================
 */

const crypto = require('crypto');

/**
 * Derivação de Chave Criptográfica (KDF - Key Derivation Function)
 * Utiliza o algoritmo scrypt para transformar uma senha e salt em uma chave de 256 bits (32 bytes).
 * 
 * NOTA DE ARQUITETURA:
 * Atualmente a chave e o sal estão hardcoded no código ('oficina-autocerta-chave-secreta').
 * Em um ambiente produtivo, devem ser extraídos para variáveis de ambiente protegidas (.env).
 */
const CHAVE = crypto.scryptSync('oficina-autocerta-chave-secreta', 'sal-da-oficina', 32);

/**
 * Criptografa uma string em texto claro usando AES-256-GCM.
 * 
 * @param {string} texto - Texto em claro a ser protegido (ex.: apenas os 11 dígitos do CPF).
 * @returns {string} String codificada contendo [IV:Tag:DadosCifrados] em Base64.
 * 
 * Funcionamento:
 * 1. Gera um vetor de inicialização (IV / Nonce) aleatório de 12 bytes (96 bits),
 *    recomendado para o modo GCM. O IV NUNCA deve ser reutilizado com a mesma chave.
 * 2. Cifra o conteúdo e obtém a Authentication Tag (16 bytes), que valida a integridade.
 * 3. Concatena IV, Tag e Dados cifrados separados por dois-pontos ':' para armazenamento
 *    em coluna única de texto no SQLite.
 */
function criptografar(texto) {
    // 12 bytes é o tamanho padrão e ótimo para IV no AES-GCM
    const iv = crypto.randomBytes(12);
    const cifra = crypto.createCipheriv('aes-256-gcm', CHAVE, iv);
    
    // Cifra o buffer UTF-8
    const dados = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()]);
    
    // Obtém a tag de autenticação gerada pelo modo GCM
    const tag = cifra.getAuthTag();
    
    // Serializa os 3 componentes em Base64
    return [iv, tag, dados].map(b => b.toString('base64')).join(':');
}

/**
 * Descriptografa uma string serializada no formato [IV:Tag:DadosCifrados].
 * 
 * @param {string} valor - String Base64 serializada salva no banco de dados.
 * @returns {string} Texto original recuperado em UTF-8.
 * 
 * Funcionamento:
 * 1. Separa a string pelos delimitadores ':' e converte cada parte de Base64 para Buffer.
 * 2. Inicializa o decifrador com a mesma chave e o IV original daquele registro.
 * 3. Define a Auth Tag esperada; se o texto cifrado tiver sido adulterado no banco,
 *    o método decifra.final() lançará uma exceção imediatamente, garantindo autenticidade.
 */
function descriptografar(valor) {
    const [iv, tag, dados] = valor.split(':').map(p => Buffer.from(p, 'base64'));
    const decifra = crypto.createDecipheriv('aes-256-gcm', CHAVE, iv);
    
    // Configura a tag de verificação antes de concluir a decifragem
    decifra.setAuthTag(tag);
    
    // Executa a decifra e valida a integridade
    return Buffer.concat([decifra.update(dados), decifra.final()]).toString('utf8');
}

module.exports = { criptografar, descriptografar };
