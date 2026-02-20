/**
 * Utilitário para validar resultados de amostras contra as normas de referência no Frontend
 */

export interface ReferenceStandardRule {
    id?: number;
    standard_id?: number;
    parameter_key: string;
    condition_type: 'MAX' | 'MIN' | 'RANGE' | 'EXACT_TEXT' | 'ABSENCE';
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
export function evaluateRule(result: string | number | null | undefined, rule: ReferenceStandardRule): boolean | null {
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

        default:
            return null;
    }
}
