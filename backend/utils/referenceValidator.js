/**
 * referenceValidator.js
 * Utilitário para validar resultados de amostras contra as normas de referência
 */

/**
 * Extrai valor numérico de uma string que pode conter operadores ou vírgulas
 * Exemplo: "< 0,05" -> 0.05
 *          "1.23" -> 1.23
 *          "N.D." -> null
 */
function parseNumericValue(valueStr) {
    if (valueStr === null || valueStr === undefined) return null;

    const str = String(valueStr).trim();

    // Troca vírgula por ponto para o parse do JS
    const normalizedStr = str.replace(',', '.');

    // Extrai o número da string usando regex
    const match = normalizedStr.match(/-?\d+(\.\d+)?/);

    if (match) {
        return parseFloat(match[0]);
    }

    return null;
}

/**
 * Analisa se a string possui operadores antes do número
 */
function getOperator(valueStr) {
    const str = String(valueStr).trim();
    if (str.startsWith('<=')) return '<=';
    if (str.startsWith('>=')) return '>=';
    if (str.startsWith('<')) return '<';
    if (str.startsWith('>')) return '>';
    return null;
}

/**
 * Compara um resultado inserido contra uma regra
 * 
 * @param {string|number} result - Valor fornecido pelo analista
 * @param {object} rule - Regra do banco de dados (reference_standard_rules)
 * @returns {boolean|null} - true se aprovado, false se reprovado, null se vazio ou erro
 */
function evaluateRule(result, rule) {
    if (result === null || result === undefined || result === '') {
        return null;
    }

    const resultStr = String(result).trim();
    const resultNum = parseNumericValue(resultStr);
    const operator = getOperator(resultStr);

    switch (rule.condition_type) {
        case 'MAX':
            if (resultNum === null) return null;

            // Se a regra é "MAX 5.0" e o analista digita "> 5.0", automaticamente falha.
            if (operator === '>') {
                if (resultNum >= rule.max_value) return false;
            }
            return resultNum <= rule.max_value;

        case 'MIN':
            if (resultNum === null) return null;

            if (operator === '<') {
                if (resultNum <= rule.min_value) return false;
            }
            return resultNum >= rule.min_value;

        case 'RANGE':
            if (resultNum === null) return null;

            // Se o analista inseriu < (ex: < 0.1) e o mínimo for (ex: 6.0), falha.
            if (operator === '<' && resultNum <= rule.min_value) return false;
            if (operator === '>' && resultNum >= rule.max_value) return false;

            return resultNum >= rule.min_value && resultNum <= rule.max_value;

        case 'EXACT_TEXT':
            return resultStr.toLowerCase() === (rule.expected_text || '').trim().toLowerCase();

        case 'ABSENCE':
            // Palavras chaves comuns para Ausência
            const absenceWords = ['ausência', 'ausente', 'ausencia', 'nd', 'n.d.', 'n.d', 'não detectado', 'nao detectado'];
            const targetText = resultStr.toLowerCase();

            // Se a regra tem um texto esperado, usa ele primeiro
            if (rule.expected_text && targetText.includes(rule.expected_text.toLowerCase())) {
                return true;
            }

            // Senão verifica contra as combinações clássicas
            return absenceWords.some(word => targetText.includes(word));

        default:
            return null;
    }
}

/**
 * Valida múltiplos parâmetros de uma amostra
 * 
 * @param {object} sample - Amostra (com colunas como ph, turbidez, ou dentro do JSON params)
 * @param {Array} rules - Array vindo da tabela reference_standard_rules
 * @returns {object} - { isConformant: boolean, failedParameters: Array }
 */
function validateSample(sample, rules) {
    const failedParameters = [];
    let isConformant = true;

    let dynamicParams = {};
    if (sample.params) {
        try {
            dynamicParams = typeof sample.params === 'string' ? JSON.parse(sample.params) : sample.params;
        } catch (e) {
            dynamicParams = {};
        }
    }

    // Permite suportar quando sample enviada é apenas os resultados
    const mergedData = { ...sample, ...dynamicParams };
    if (sample.resultados) {
        Object.assign(mergedData, sample.resultados);
    }

    for (const rule of rules) {
        const result = mergedData[rule.parameter_key];

        if (result !== undefined && result !== null && result !== '') {
            const passed = evaluateRule(result, rule);

            if (passed === false) {
                isConformant = false;
                failedParameters.push({
                    parameter_key: rule.parameter_key,
                    result: result,
                    rule: rule
                });
            }
        }
    }

    return { isConformant, failedParameters };
}

module.exports = {
    parseNumericValue,
    getOperator,
    evaluateRule,
    validateSample
};
