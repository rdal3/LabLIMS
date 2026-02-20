const { evaluateRule } = require('./referenceValidator');

const rules = [
    { condition_type: 'MAX', max_value: 5 },
    { condition_type: 'RANGE', min_value: 6.0, max_value: 9.5 },
    { condition_type: 'ABSENCE', expected_text: 'Ausência' },
    { condition_type: 'EXACT_TEXT', expected_text: 'Sim' }
];

let failed = false;

function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
        console.error(`FAIL: ${msg} | Expected ${expected}, got ${actual}`);
        failed = true;
    } else {
        // console.log(`PASS: ${msg}`);
    }
}

// Tests for MAX (e.g. Turbidez <= 5)
assertEqual(evaluateRule(4, rules[0]), true, '4 <= 5');
assertEqual(evaluateRule(5, rules[0]), true, '5 <= 5');
assertEqual(evaluateRule(6, rules[0]), false, '6 <= 5');
assertEqual(evaluateRule('< 0,01', rules[0]), true, '< 0,01 is fine for MAX 5');
assertEqual(evaluateRule('> 6', rules[0]), false, '> 6 should fail MAX 5');

// Tests for RANGE (e.g. pH 6.0 - 9.5)
assertEqual(evaluateRule(7, rules[1]), true, '7 in 6-9.5');
assertEqual(evaluateRule('7,5', rules[1]), true, '7,5 in 6-9.5');
assertEqual(evaluateRule(5, rules[1]), false, '5 in 6-9.5');
assertEqual(evaluateRule('10', rules[1]), false, '10 in 6-9.5');
assertEqual(evaluateRule('< 5.0', rules[1]), false, '< 5.0 fails min 6.0');

// Tests for ABSENCE
assertEqual(evaluateRule('Ausência', rules[2]), true, 'Ausência');
assertEqual(evaluateRule('Ausencia', rules[2]), true, 'Ausencia (no accent)');
assertEqual(evaluateRule('Ausência em 100 ml', rules[2]), true, 'Ausência em 100 ml');
assertEqual(evaluateRule('N.D.', rules[2]), true, 'N.D.');
assertEqual(evaluateRule('Presença', rules[2]), false, 'Presença');
assertEqual(evaluateRule('1000 UFC', rules[2]), false, '1000 UFC');

// EXACT TEXT
assertEqual(evaluateRule('sim', rules[3]), true, 'sim == Sim');
assertEqual(evaluateRule('não', rules[3]), false, 'não != Sim');

if (failed) {
    console.log('Some tests failed.');
    process.exit(1);
} else {
    console.log('All reference validation tests passed!');
}
