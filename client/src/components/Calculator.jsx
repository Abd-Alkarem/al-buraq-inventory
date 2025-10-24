import React, { useState } from "react";

export default function Calculator({ isOpen, onClose }) {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  if (!isOpen) return null;

  const inputDigit = (digit) => {
    if (waitingForOperand) {
      setDisplay(String(digit));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? String(digit) : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperation) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);
      
      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue, secondValue, operation) => {
    switch (operation) {
      case "+":
        return firstValue + secondValue;
      case "-":
        return firstValue - secondValue;
      case "*":
        return firstValue * secondValue;
      case "/":
        return firstValue / secondValue;
      case "%":
        return firstValue % secondValue;
      default:
        return secondValue;
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(value * -1));
  };

  const Button = ({ children, onClick, className = "", span = false }) => (
    <button
      onClick={onClick}
      className={`
        rounded-lg p-4 text-lg font-semibold transition-all
        hover:scale-105 active:scale-95
        ${span ? 'col-span-2' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="rounded-2xl border border-white/20 bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl p-6 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Calculator</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Display */}
        <div className="mb-4 rounded-xl bg-gray-950 p-4 text-right">
          <div className="text-3xl font-bold text-white break-all">{display}</div>
          {operation && (
            <div className="text-sm text-gray-400 mt-1">
              {previousValue} {operation}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {/* Row 1 */}
          <Button onClick={clear} className="bg-red-600 hover:bg-red-700 text-white">
            C
          </Button>
          <Button onClick={toggleSign} className="bg-gray-700 hover:bg-gray-600 text-white">
            +/-
          </Button>
          <Button onClick={() => performOperation("%")} className="bg-gray-700 hover:bg-gray-600 text-white">
            %
          </Button>
          <Button onClick={() => performOperation("/")} className="bg-orange-600 hover:bg-orange-700 text-white">
            ÷
          </Button>

          {/* Row 2 */}
          <Button onClick={() => inputDigit(7)} className="bg-gray-700 hover:bg-gray-600 text-white">
            7
          </Button>
          <Button onClick={() => inputDigit(8)} className="bg-gray-700 hover:bg-gray-600 text-white">
            8
          </Button>
          <Button onClick={() => inputDigit(9)} className="bg-gray-700 hover:bg-gray-600 text-white">
            9
          </Button>
          <Button onClick={() => performOperation("*")} className="bg-orange-600 hover:bg-orange-700 text-white">
            ×
          </Button>

          {/* Row 3 */}
          <Button onClick={() => inputDigit(4)} className="bg-gray-700 hover:bg-gray-600 text-white">
            4
          </Button>
          <Button onClick={() => inputDigit(5)} className="bg-gray-700 hover:bg-gray-600 text-white">
            5
          </Button>
          <Button onClick={() => inputDigit(6)} className="bg-gray-700 hover:bg-gray-600 text-white">
            6
          </Button>
          <Button onClick={() => performOperation("-")} className="bg-orange-600 hover:bg-orange-700 text-white">
            −
          </Button>

          {/* Row 4 */}
          <Button onClick={() => inputDigit(1)} className="bg-gray-700 hover:bg-gray-600 text-white">
            1
          </Button>
          <Button onClick={() => inputDigit(2)} className="bg-gray-700 hover:bg-gray-600 text-white">
            2
          </Button>
          <Button onClick={() => inputDigit(3)} className="bg-gray-700 hover:bg-gray-600 text-white">
            3
          </Button>
          <Button onClick={() => performOperation("+")} className="bg-orange-600 hover:bg-orange-700 text-white">
            +
          </Button>

          {/* Row 5 */}
          <Button onClick={() => inputDigit(0)} span className="bg-gray-700 hover:bg-gray-600 text-white">
            0
          </Button>
          <Button onClick={inputDecimal} className="bg-gray-700 hover:bg-gray-600 text-white">
            .
          </Button>
          <Button onClick={handleEquals} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            =
          </Button>
        </div>
      </div>
    </div>
  );
}
