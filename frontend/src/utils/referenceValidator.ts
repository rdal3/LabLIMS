/**
 * Utilitário para validar resultados de amostras contra as normas de referência no Frontend
 */

export interface ReferenceStandardRule {
    id?: number;
    standard_id?: number;
    parameter_key: string;
    condition_type: 'MAX' | 'MIN' | 'RANGE' | 'EXACT_TEXT' | 'ABSENCE' | 'CONDITIONAL';
    min_value?: number | null;
    max_value?: number | null;
    expected_text?: string | null;
    display_reference?: string | null;
}

export interface ReferenceStandard {
    id: number;
    name: string;
    description?: string;
    category?: string;
    is_active: number;
    rules?: ReferenceStandardRule[];
}

/**
 * Extrai valor numérico de uma string que pode conter operadores ou vírgulas
 */
export function parseNumericValue(valueStr: string | number | null | undefined): number | null {
    if (valueStr === null || valueStr === undefined || valueStr === '') return null;

    const str = String(valueStr).trim();
    const normalizedStr = str.replace(',', '.');
    const match = normalizedStr.match(/-?\d+(\.\d+)?/);

    if (match) {
        return parseFloat(match[0]);
    }
    return null;
}

/**
 * Analisa se a string possui operadores antes do número
 */
export function getOperator(valueStr: string | number | null | undefined): string | null {
    if (valueStr === null || valueStr === undefined) return null;
    const str = String(valueStr).trim();
    if (str.startsWith('<=')) return '<=';
    if (str.startsWith('>=')) return '>=';
    if (str.startsWith('<')) return '<';
    if (str.startsWith('>')) return '>';
    return null;
}

/**
 * Compara um resultado inserido contra uma regra
 */
export function evaluateRule(result: string | number | null | undefined, rule: ReferenceStandardRule, sampleData?: Record<string, any>): boolean | null {
    if (result === null || result === undefined || result === '') {
        return null;
    }

    const resultStr = String(result).trim();
    const resultNum = parseNumericValue(resultStr);
    const operator = getOperator(resultStr);

    switch (rule.condition_type) {
        case 'MAX':
            if (resultNum === null) return null;
            if (operator === '>') {
                if (rule.max_value !== null && rule.max_value !== undefined && resultNum >= rule.max_value) return false;
            }
            return rule.max_value !== null && rule.max_value !== undefined ? (resultNum <= rule.max_value) : null;

        case 'MIN':
            if (resultNum === null) return null;
            if (operator === '<') {
                if (rule.min_value !== null && rule.min_value !== undefined && resultNum <= rule.min_value) return false;
            }
            return rule.min_value !== null && rule.min_value !== undefined ? (resultNum >= rule.min_value) : null;

        case 'RANGE':
            if (resultNum === null) return null;
            if (rule.min_value === null || rule.min_value === undefined || rule.max_value === null || rule.max_value === undefined) return null;

            if (operator === '<' && resultNum <= rule.min_value) return false;
            if (operator === '>' && resultNum >= rule.max_value) return false;

            return resultNum >= rule.min_value && resultNum <= rule.max_value;

        case 'EXACT_TEXT':
            return resultStr.toLowerCase() === (rule.expected_text || '').trim().toLowerCase();

        case 'ABSENCE':
            const absenceWords = ['ausência', 'ausente', 'ausencia', 'nd', 'n.d.', 'n.d', 'não detectado', 'nao detectado'];
            const targetText = resultStr.toLowerCase();

            if (rule.expected_text && targetText.includes(rule.expected_text.toLowerCase())) {
                return true;
            }
            return absenceWords.some(word => targetText.includes(word));

        case 'CONDITIONAL':
            if (!sampleData || !rule.expected_text) return null;
            return evaluateConditional(resultStr, rule.expected_text, sampleData);

        default:
            return null;
    }
}

/**
 * Avalia regras condicionais no formato:
 * IF ph <= 7.5 THEN MAX 3.7 VREF ≤ 3,7 mg/L
 */
export function evaluateConditional(resultStr: string, formulasRaw: string, sampleData: Record<string, any>): boolean | null {
    const lines = formulasRaw.split('\n').filter(line => line.trim().toUpperCase().startsWith('IF '));

    for (const line of lines) {
        // Encontra o bloco THEN e (opcionalmente) VREF
        const thenMatch = line.match(/THEN (MAX|MIN|RANGE|EXACT_TEXT|ABSENCE) (.*?)($| VREF)/i);
        if (!thenMatch) continue;

        // Extrai a condição
        const conditionBlock = line.substring(3, line.toUpperCase().indexOf(' THEN')).trim();

        // Avalia se o sampleData satisfaz a condição (suporta múltiplos AND)
        const conditionParts = conditionBlock.split(/ AND /i);
        let conditionMet = true;

        for (const part of conditionParts) {
            const [param, op, val] = part.trim().split(/\s+/);
            const paramVal = parseNumericValue(sampleData[param]);
            const targetVal = parseFloat(val);

            if (paramVal === null || isNaN(targetVal)) {
                conditionMet = false;
                break;
            }

            if (op === '<=' && !(paramVal <= targetVal)) conditionMet = false;
            else if (op === '>=' && !(paramVal >= targetVal)) conditionMet = false;
            else if (op === '<' && !(paramVal < targetVal)) conditionMet = false;
            else if (op === '>' && !(paramVal > targetVal)) conditionMet = false;
            else if (op === '==' && !(paramVal === targetVal)) conditionMet = false;
            else if (op === '!=' && !(paramVal !== targetVal)) conditionMet = false;

            if (!conditionMet) break;
        }

        // Se a condição inteira dessa linha for verdadeira, aplica a regra dessa linha
        if (conditionMet) {
            const ruleType = thenMatch[1].toUpperCase() as ReferenceStandardRule['condition_type'];
            const ruleValueRaw = thenMatch[2].trim();

            const mockRule: ReferenceStandardRule = {
                parameter_key: 'mock',
                condition_type: ruleType,
            };

            if (ruleType === 'MAX') mockRule.max_value = parseFloat(ruleValueRaw);
            else if (ruleType === 'MIN') mockRule.min_value = parseFloat(ruleValueRaw);
            else if (ruleType === 'RANGE') {
                const parts = ruleValueRaw.split(/ a | - /);
                if (parts.length === 2) {
                    mockRule.min_value = parseFloat(parts[0]);
                    mockRule.max_value = parseFloat(parts[1]);
                }
            } else {
                mockRule.expected_text = ruleValueRaw;
            }

            return evaluateRule(resultStr, mockRule, sampleData);
        }
    }

    return null; // Nenhuma condição satisfeita
}

/**
 * Obtém a referência de exibição (V.Ref) correta se for uma regra CONDITIONAL
 */
export function getDynamicDisplayReference(rule: ReferenceStandardRule, sampleData: Record<string, any>): string {
    if (rule.condition_type !== 'CONDITIONAL' || !rule.expected_text || !sampleData) {
        if (rule.display_reference) return rule.display_reference;
        if (rule.expected_text) return rule.expected_text;
        if (rule.condition_type === 'MAX' && rule.max_value !== null && rule.max_value !== undefined) return `≤ ${rule.max_value}`;
        if (rule.condition_type === 'MIN' && rule.min_value !== null && rule.min_value !== undefined) return `≥ ${rule.min_value}`;
        if (rule.condition_type === 'RANGE' && rule.min_value !== null && rule.max_value !== null) return `${rule.min_value} a ${rule.max_value}`;
        return '-';
    }

    const lines = rule.expected_text.split('\n').filter(line => line.trim().toUpperCase().startsWith('IF '));
    for (const line of lines) {
        const conditionBlock = line.substring(3, line.toUpperCase().indexOf(' THEN')).trim();
        const conditionParts = conditionBlock.split(/ AND /i);
        let conditionMet = true;

        for (const part of conditionParts) {
            const [param, op, val] = part.trim().split(/\s+/);
            const paramVal = parseNumericValue(sampleData[param]);
            const targetVal = parseFloat(val);

            if (paramVal === null || isNaN(targetVal)) {
                conditionMet = false;
                break;
            }

            if (op === '<=' && !(paramVal <= targetVal)) conditionMet = false;
            else if (op === '>=' && !(paramVal >= targetVal)) conditionMet = false;
            else if (op === '<' && !(paramVal < targetVal)) conditionMet = false;
            else if (op === '>' && !(paramVal > targetVal)) conditionMet = false;
            else if (op === '==' && !(paramVal === targetVal)) conditionMet = false;
            else if (op === '!=' && !(paramVal !== targetVal)) conditionMet = false;

            if (!conditionMet) break;
        }

        if (conditionMet) {
            const vrefMatch = line.match(/VREF (.*)$/i);
            if (vrefMatch) {
                return vrefMatch[1].trim();
            } else {
                // Return dynamic fallback based on THEN part
                const thenMatch = line.match(/THEN (MAX|MIN|RANGE|EXACT_TEXT|ABSENCE) (.*?)$/i);
                if (thenMatch) {
                    return `${thenMatch[1]} ${thenMatch[2]}`;
                }
            }
        }
    }

    return rule.display_reference || 'Fora das faixas condicionais';
}
