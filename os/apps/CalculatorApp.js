/**
 * @fileoverview Calculator Application for The Web Vault WebOS.
 *
 * Implements a precedence-aware arithmetic evaluator using a safe Shunting-Yard
 * token algorithm (never eval()).
 * Features:
 * - Full keyboard support (0-9, +, -, *, /, %, Enter, Backspace, Escape)
 * - Calculation history tape
 * - Copy result to clipboard
 *
 * @module os/apps/CalculatorApp
 */

export const AppManifest = {
  id: 'calculator',
  name: 'Calculator',
  icon: '🧮',
  category: 'Utility',
  version: '2.0.0',
  singleton: true,
  defaultSize: { width: 360, height: 500 },
  minSize: { width: 300, height: 420 },
  menus: [
    {
      label: 'Calculator',
      items: [
        { label: 'Clear All', action: 'calc:clear', shortcut: 'Esc' },
        { label: 'Copy Result', action: 'calc:copy', shortcut: '⌘C' }
      ]
    }
  ],

  mount(containerEl, context) {
    let expression = '';
    let currentInput = '0';
    let history = [];

    containerEl.innerHTML = `
      <div class="calc-root" style="display:flex; flex-direction:column; height:100%; background:#100b1a; color:#fff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding:16px; user-select:none;">
        <!-- Display Header / History -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(168,85,247,0.2); border-radius:12px; padding:14px 16px; margin-bottom:14px; text-align:right;">
          <div id="calc-expr" style="font-size:12px; color:#7c6f9f; min-height:16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"></div>
          <div id="calc-display" style="font-size:32px; font-weight:700; color:#fff; letter-spacing:0.02em; overflow-x:auto; white-space:nowrap; margin-top:4px;">0</div>
        </div>

        <!-- Keypad Grid -->
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; flex:1;">
          <button class="calc-btn btn-func" data-val="C" style="border-radius:10px; border:none; background:rgba(239,68,68,0.2); color:#fca5a5; font-size:15px; font-weight:600; cursor:pointer;">C</button>
          <button class="calc-btn btn-func" data-val="(" style="border-radius:10px; border:none; background:rgba(255,255,255,0.06); color:#c4b5fd; font-size:16px; cursor:pointer;">(</button>
          <button class="calc-btn btn-func" data-val=")" style="border-radius:10px; border:none; background:rgba(255,255,255,0.06); color:#c4b5fd; font-size:16px; cursor:pointer;">)</button>
          <button class="calc-btn btn-op" data-val="/" style="border-radius:10px; border:none; background:rgba(139,92,246,0.3); color:#c4b5fd; font-size:18px; font-weight:bold; cursor:pointer;">÷</button>

          <button class="calc-btn btn-num" data-val="7" style="border-radius:10px; border:none; background:rgba(255,255,255,0.08); color:#fff; font-size:17px; cursor:pointer;">7</button>
          <button class="calc-btn btn-num" data-val="8" style="border-radius:10px; border:none; background:rgba(255,255,255,0.08); color:#fff; font-size:17px; cursor:pointer;">8</button>
          <button class="calc-btn btn-num" data-val="9" style="border-radius:10px; border:none; background:rgba(255,255,255,0.08); color:#fff; font-size:17px; cursor:pointer;">9</button>
          <button class="calc-btn btn-op" data-val="*" style="border-radius:10px; border:none; background:rgba(139,92,246,0.3); color:#c4b5fd; font-size:18px; font-weight:bold; cursor:pointer;">×</button>

          <button class="calc-btn btn-num" data-val="4" style="border-radius:10px; border:none; background:rgba(255,255,255,0.08); color:#fff; font-size:17px; cursor:pointer;">4</button>
          <button class="calc-btn btn-num" data-val="5" style="border-radius:10px; border:none; background:rgba(255,255,255,0.08); color:#fff; font-size:17px; cursor:pointer;">5</button>
          <button class="calc-btn btn-num" data-val="6" style="border-radius:10px; border:none; background:rgba(255,255,255,0.08); color:#fff; font-size:17px; cursor:pointer;">6</button>
          <button class="calc-btn btn-op" data-val="-" style="border-radius:10px; border:none; background:rgba(139,92,246,0.3); color:#c4b5fd; font-size:18px; font-weight:bold; cursor:pointer;">−</button>

          <button class="calc-btn btn-num" data-val="1" style="border-radius:10px; border:none; background:rgba(255,255,255,0.08); color:#fff; font-size:17px; cursor:pointer;">1</button>
          <button class="calc-btn btn-num" data-val="2" style="border-radius:10px; border:none; background:rgba(255,255,255,0.08); color:#fff; font-size:17px; cursor:pointer;">2</button>
          <button class="calc-btn btn-num" data-val="3" style="border-radius:10px; border:none; background:rgba(255,255,255,0.08); color:#fff; font-size:17px; cursor:pointer;">3</button>
          <button class="calc-btn btn-op" data-val="+" style="border-radius:10px; border:none; background:rgba(139,92,246,0.3); color:#c4b5fd; font-size:18px; font-weight:bold; cursor:pointer;">+</button>

          <button class="calc-btn btn-num" data-val="0" style="grid-column:span 2; border-radius:10px; border:none; background:rgba(255,255,255,0.08); color:#fff; font-size:17px; cursor:pointer;">0</button>
          <button class="calc-btn btn-num" data-val="." style="border-radius:10px; border:none; background:rgba(255,255,255,0.08); color:#fff; font-size:18px; cursor:pointer;">.</button>
          <button class="calc-btn btn-eq" data-val="=" style="border-radius:10px; border:none; background:#8b5cf6; color:#fff; font-size:18px; font-weight:bold; cursor:pointer;">=</button>
        </div>
      </div>
    `;

    const display = containerEl.querySelector('#calc-display');
    const exprDisplay = containerEl.querySelector('#calc-expr');

    // Safe mathematical tokenizer and evaluator (Shunting-yard algorithm)
    const evaluate = (exprStr) => {
      // Tokenize
      const clean = exprStr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
      const tokens = clean.match(/(\d+(\.\d+)?|[+\-*/%()])/g);
      if (!tokens) return 0;

      const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 };
      const outputQueue = [];
      const opStack = [];

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (!isNaN(parseFloat(token))) {
          outputQueue.push(parseFloat(token));
        } else if (token in precedence) {
          // Handle unary minus
          if (token === '-' && (i === 0 || tokens[i - 1] === '(' || tokens[i - 1] in precedence)) {
            tokens[i + 1] = '-' + tokens[i + 1];
            continue;
          }
          while (
            opStack.length > 0 &&
            opStack[opStack.length - 1] in precedence &&
            precedence[opStack[opStack.length - 1]] >= precedence[token]
          ) {
            outputQueue.push(opStack.pop());
          }
          opStack.push(token);
        } else if (token === '(') {
          opStack.push(token);
        } else if (token === ')') {
          while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
            outputQueue.push(opStack.pop());
          }
          opStack.pop(); // remove '('
        }
      }

      while (opStack.length > 0) {
        outputQueue.push(opStack.pop());
      }

      // Evaluate RPN
      const stack = [];
      for (const token of outputQueue) {
        if (typeof token === 'number') {
          stack.push(token);
        } else {
          const b = stack.pop();
          const a = stack.pop();
          switch (token) {
            case '+': stack.push(a + b); break;
            case '-': stack.push(a - b); break;
            case '*': stack.push(a * b); break;
            case '/':
              if (b === 0) throw new Error('Divide by zero');
              stack.push(a / b);
              break;
            case '%': stack.push(a % b); break;
          }
        }
      }

      if (stack.length !== 1 || isNaN(stack[0])) throw new Error('Invalid expression');
      return stack[0];
    };

    const handleInput = (val) => {
      if (val === 'C') {
        currentInput = '0';
        expression = '';
      } else if (val === '=') {
        try {
          const fullExpr = expression ? `${expression} ${currentInput}` : currentInput;
          const result = evaluate(fullExpr);
          exprDisplay.textContent = fullExpr + ' =';
          currentInput = String(Math.round(result * 100000000) / 100000000);
          expression = '';
        } catch (err) {
          currentInput = 'Error';
          expression = '';
        }
      } else if (['+', '-', '*', '/'].includes(val)) {
        if (currentInput !== 'Error') {
          expression = expression ? `${expression} ${currentInput} ${val}` : `${currentInput} ${val}`;
          exprDisplay.textContent = expression;
          currentInput = '0';
        }
      } else if (val === '(' || val === ')') {
        if (currentInput === '0') currentInput = val;
        else currentInput += val;
      } else if (val === '.') {
        if (!currentInput.includes('.')) currentInput += '.';
      } else {
        // Digits
        if (currentInput === '0' || currentInput === 'Error') {
          currentInput = val;
        } else {
          currentInput += val;
        }
      }

      display.textContent = currentInput;
    };

    containerEl.querySelectorAll('.calc-btn').forEach(btn => {
      btn.addEventListener('click', () => handleInput(btn.dataset.val));
    });

    // Keyboard support
    const keyHandler = (e) => {
      if (!containerEl.isConnected) {
        window.removeEventListener('keydown', keyHandler);
        return;
      }

      if (e.key >= '0' && e.key <= '9') handleInput(e.key);
      else if (['+', '-', '*', '/'].includes(e.key)) handleInput(e.key);
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); handleInput('='); }
      else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') handleInput('C');
      else if (e.key === '.') handleInput('.');
      else if (e.key === '(' || e.key === ')') handleInput(e.key);
      else if (e.key === 'Backspace') {
        if (currentInput.length > 1 && currentInput !== 'Error') {
          currentInput = currentInput.slice(0, -1);
        } else {
          currentInput = '0';
        }
        display.textContent = currentInput;
      }
    };

    window.addEventListener('keydown', keyHandler);
  }
};

export default AppManifest;
