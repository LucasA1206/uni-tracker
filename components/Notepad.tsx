"use client";

import React, {
    useState,
    useRef,
    useCallback,
    useEffect,
    KeyboardEvent,
} from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
    Plus,
    Trash2,
    X,
    Calculator,
    Columns,
    FileText,
    Copy,
    Check,
    Grid3X3,
    AlignLeft,
    Sparkles,
} from "lucide-react";

// ─────────────────────────────────────────────
// KaTeX symbol library for the /math picker
// ─────────────────────────────────────────────

export const MATH_CATEGORIES: { label: string; symbols: { latex: string; display: string }[] }[] = [
    {
        label: "Common",
        symbols: [
            { latex: "\\frac{a}{b}", display: "a/b" },
            { latex: "\\sqrt{x}", display: "√x" },
            { latex: "x^{2}", display: "x²" },
            { latex: "x_{n}", display: "xₙ" },
            { latex: "\\int_{a}^{b} f(x)\\,dx", display: "∫" },
            { latex: "\\sum_{i=1}^{n} x_i", display: "∑" },
            { latex: "\\lim_{x \\to \\infty}", display: "lim" },
            { latex: "\\pm", display: "±" },
            { latex: "\\infty", display: "∞" },
            { latex: "\\approx", display: "≈" },
            { latex: "\\neq", display: "≠" },
            { latex: "\\le", display: "≤" },
            { latex: "\\ge", display: "≥" },
        ],
    },
    {
        label: "Greek Letters",
        symbols: [
            { latex: "\\alpha", display: "α" },
            { latex: "\\beta", display: "β" },
            { latex: "\\gamma", display: "γ" },
            { latex: "\\delta", display: "δ" },
            { latex: "\\epsilon", display: "ε" },
            { latex: "\\zeta", display: "ζ" },
            { latex: "\\eta", display: "η" },
            { latex: "\\theta", display: "θ" },
            { latex: "\\iota", display: "ι" },
            { latex: "\\kappa", display: "κ" },
            { latex: "\\lambda", display: "λ" },
            { latex: "\\mu", display: "μ" },
            { latex: "\\nu", display: "ν" },
            { latex: "\\xi", display: "ξ" },
            { latex: "\\pi", display: "π" },
            { latex: "\\rho", display: "ρ" },
            { latex: "\\sigma", display: "σ" },
            { latex: "\\tau", display: "τ" },
            { latex: "\\phi", display: "φ" },
            { latex: "\\chi", display: "χ" },
            { latex: "\\psi", display: "ψ" },
            { latex: "\\omega", display: "ω" },
            { latex: "\\Delta", display: "Δ" },
            { latex: "\\Theta", display: "Θ" },
            { latex: "\\Lambda", display: "Λ" },
            { latex: "\\Sigma", display: "Σ" },
            { latex: "\\Phi", display: "Φ" },
            { latex: "\\Psi", display: "Ψ" },
            { latex: "\\Omega", display: "Ω" },
        ],
    },
    {
        label: "Operators & Calculus",
        symbols: [
            { latex: "\\times", display: "×" },
            { latex: "\\div", display: "÷" },
            { latex: "\\cdot", display: "·" },
            { latex: "\\circ", display: "∘" },
            { latex: "\\partial", display: "∂" },
            { latex: "\\nabla", display: "∇" },
            { latex: "\\iint", display: "∬" },
            { latex: "\\oint", display: "∮" },
            { latex: "\\prod_{i=1}^{n}", display: "∏" },
            { latex: "\\frac{df}{dx}", display: "df/dx" },
            { latex: "\\frac{\\partial f}{\\partial x}", display: "∂f/∂x" },
            { latex: "\\sqrt[n]{x}", display: "ⁿ√x" },
            { latex: "\\binom{n}{k}", display: "C(n,k)" },
        ],
    },
    {
        label: "Relations & Logic",
        symbols: [
            { latex: "\\leq", display: "≤" },
            { latex: "\\geq", display: "≥" },
            { latex: "\\neq", display: "≠" },
            { latex: "\\equiv", display: "≡" },
            { latex: "\\propto", display: "∝" },
            { latex: "\\in", display: "∈" },
            { latex: "\\notin", display: "∉" },
            { latex: "\\subset", display: "⊂" },
            { latex: "\\subseteq", display: "⊆" },
            { latex: "\\cup", display: "∪" },
            { latex: "\\cap", display: "∩" },
            { latex: "\\forall", display: "∀" },
            { latex: "\\exists", display: "∃" },
            { latex: "\\implies", display: "⟹" },
            { latex: "\\iff", display: "⟺" },
        ],
    },
    {
        label: "Arrows & Sets",
        symbols: [
            { latex: "\\to", display: "→" },
            { latex: "\\gets", display: "←" },
            { latex: "\\leftrightarrow", display: "↔" },
            { latex: "\\Rightarrow", display: "⇒" },
            { latex: "\\Leftarrow", display: "⇐" },
            { latex: "\\Leftrightarrow", display: "⇔" },
            { latex: "\\mathbb{R}", display: "ℝ" },
            { latex: "\\mathbb{N}", display: "ℕ" },
            { latex: "\\mathbb{Z}", display: "ℤ" },
            { latex: "\\mathbb{Q}", display: "ℚ" },
            { latex: "\\mathbb{C}", display: "ℂ" },
            { latex: "\\emptyset", display: "∅" },
        ],
    },
    {
        label: "Matrices & Brackets",
        symbols: [
            { latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", display: "Matrix ()" },
            { latex: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}", display: "Matrix []" },
            { latex: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}", display: "Det | |" },
            { latex: "\\left( \\frac{a}{b} \\right)", display: "(a/b)" },
            { latex: "\\left[ x \\right]", display: "[x]" },
            { latex: "\\left\\{ x \\right\\}", display: "{x}" },
            { latex: "\\vec{v}", display: "v⃗" },
            { latex: "\\hat{u}", display: "û" },
        ],
    },
];

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface RowBlock {
    id: string;
    type: "text" | "equation-row";
    text?: string;
    // For equation-row: array of separate equations written across the page
    equations?: string[];
}

// ─────────────────────────────────────────────
// Inline math renderer
// ─────────────────────────────────────────────

function renderInlineMath(text: string): React.ReactNode[] {
    const parts = text.split(/(\$[^$\n]+\$)/g);
    return parts.map((part, i) => {
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
            const latex = part.slice(1, -1);
            try {
                const html = katex.renderToString(latex, { throwOnError: false, displayMode: false });
                return (
                    <span
                        key={i}
                        className="inline-math px-1 py-0.5 rounded bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 border border-indigo-200/40 dark:border-indigo-800/40 mx-0.5"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                );
            } catch {
                return <span key={i} className="text-red-400 font-mono text-xs">{part}</span>;
            }
        }
        return <span key={i}>{part}</span>;
    });
}

// ─────────────────────────────────────────────
// Math Picker Modal / Popover
// ─────────────────────────────────────────────

interface MathPickerProps {
    onSelect: (latex: string) => void;
    onClose: () => void;
}

function MathPicker({ onSelect, onClose }: MathPickerProps) {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState(0);

    const filteredSymbols = search
        ? MATH_CATEGORIES.flatMap((c) =>
            c.symbols.filter(
                (s) =>
                    s.latex.toLowerCase().includes(search.toLowerCase()) ||
                    s.display.toLowerCase().includes(search.toLowerCase())
            )
        )
        : MATH_CATEGORIES[category]?.symbols ?? [];

    return (
        <div
            className="absolute left-0 top-full mt-2 z-50 w-[490px] max-w-[95vw] bg-white dark:bg-[#18181B] border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 dark:bg-zinc-900/80 border-b border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Calculator className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        LaTeX / KaTeX Symbol Library
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#18181B]">
                <input
                    autoFocus
                    className="w-full text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Search math symbols (e.g., integral, theta, matrix, frac)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") onClose();
                        if (e.key === "Enter" && filteredSymbols.length > 0) {
                            onSelect(filteredSymbols[0].latex);
                        }
                    }}
                />
            </div>

            {/* Category tabs */}
            {!search && (
                <div className="flex overflow-x-auto gap-1 px-3 py-2 bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-100 dark:border-zinc-800 scrollbar-none">
                    {MATH_CATEGORIES.map((cat, idx) => (
                        <button
                            key={cat.label}
                            onClick={() => setCategory(idx)}
                            className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${category === idx
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800"
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Symbol Grid */}
            <div className="p-3 max-h-56 overflow-y-auto">
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
                    {filteredSymbols.map((sym, idx) => (
                        <button
                            key={idx}
                            title={sym.latex}
                            onClick={() => onSelect(sym.latex)}
                            className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 dark:bg-zinc-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-gray-200/50 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group"
                        >
                            <span
                                className="text-sm font-medium text-gray-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                                dangerouslySetInnerHTML={{
                                    __html: (() => {
                                        try {
                                            return katex.renderToString(sym.latex, {
                                                throwOnError: false,
                                                displayMode: false,
                                            });
                                        } catch {
                                            return sym.display;
                                        }
                                    })(),
                                }}
                            />
                            <span className="text-[9px] text-gray-400 font-mono truncate max-w-full mt-0.5 opacity-60 group-hover:opacity-100">
                                {sym.display}
                            </span>
                        </button>
                    ))}
                </div>
                {filteredSymbols.length === 0 && (
                    <div className="py-6 text-center text-xs text-gray-400">
                        No math symbols found for "{search}"
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-zinc-900/80 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-gray-400">
                <span>Click a symbol to insert</span>
                <span className="font-mono text-[10px] text-gray-500">Esc to close</span>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Equation Row: Displays 1 to 4 equations ACROSS the page
// ─────────────────────────────────────────────

interface EquationRowProps {
    block: RowBlock;
    onUpdateEquations: (id: string, eqs: string[]) => void;
    onDelete: (id: string) => void;
}

function EquationRowComponent({ block, onUpdateEquations, onDelete }: EquationRowProps) {
    const equations = block.equations || [""];
    const [activeIdx, setActiveIdx] = useState<number | null>(null);
    const [showPickerForIdx, setShowPickerForIdx] = useState<number | null>(null);

    const updateSingleEquation = (idx: number, val: string) => {
        const next = [...equations];
        next[idx] = val;
        onUpdateEquations(block.id, next);

        // Check if /math was typed
        if (val.endsWith("/math")) {
            next[idx] = val.slice(0, -5);
            onUpdateEquations(block.id, next);
            setShowPickerForIdx(idx);
        }
    };

    const addEquationBeside = () => {
        if (equations.length >= 4) return;
        const next = [...equations, ""];
        onUpdateEquations(block.id, next);
        setActiveIdx(next.length - 1);
    };

    const removeEquationAt = (idx: number) => {
        if (equations.length === 1) {
            onDelete(block.id);
            return;
        }
        const next = equations.filter((_, i) => i !== idx);
        onUpdateEquations(block.id, next);
    };

    const insertSymbolAt = (idx: number, latex: string) => {
        const current = equations[idx] || "";
        const nextVal = current ? `${current} ${latex}` : latex;
        updateSingleEquation(idx, nextVal);
        setShowPickerForIdx(null);
    };

    return (
        <div className="group relative my-3 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/10 p-3 transition-all hover:border-indigo-300 dark:hover:border-indigo-800">
            {/* Header bar of Equation Row */}
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-indigo-100/60 dark:border-indigo-900/30">
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                        <Columns className="w-3 h-3" />
                        {equations.length === 1 ? "Equation (Full Width)" : `${equations.length} Equations Across Page`}
                    </span>
                    <span className="text-[11px] text-gray-400">
                        Type <code className="text-[10px] font-mono bg-white dark:bg-zinc-800 px-1 py-0.5 rounded">/math</code> for symbol picker
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    {equations.length < 4 && (
                        <button
                            onClick={addEquationBeside}
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all active:scale-95"
                            title="Add another equation beside this on the same row across the page"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Equation Beside
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(block.id)}
                        className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete this entire equation row"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Separate equations arranged across the page */}
            <div
                className={`grid gap-3 ${equations.length === 1
                    ? "grid-cols-1"
                    : equations.length === 2
                        ? "grid-cols-1 md:grid-cols-2"
                        : equations.length === 3
                            ? "grid-cols-1 md:grid-cols-3"
                            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
                    }`}
            >
                {equations.map((eq, idx) => {
                    let renderedHtml = "";
                    let error = false;
                    try {
                        renderedHtml = katex.renderToString(eq.trim() || "\\square", {
                            throwOnError: false,
                            displayMode: true,
                        });
                    } catch {
                        error = true;
                    }

                    const isEditing = activeIdx === idx;

                    return (
                        <div
                            key={idx}
                            className="relative flex flex-col rounded-xl border border-white/60 dark:border-zinc-800 bg-white/80 dark:bg-[#141417]/80 backdrop-blur-sm p-3 shadow-xs hover:shadow-md transition-all"
                            onClick={() => setActiveIdx(idx)}
                        >
                            {/* Card toolbar */}
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-mono text-gray-400 uppercase">
                                    Eq {idx + 1}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowPickerForIdx(showPickerForIdx === idx ? null : idx);
                                        }}
                                        className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-zinc-700 transition-colors font-medium"
                                        title="Open Math Symbol Picker"
                                    >
                                        <Calculator className="w-2.5 h-2.5" />
                                        /math
                                    </button>
                                    {equations.length > 1 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeEquationAt(idx);
                                            }}
                                            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-zinc-800 transition-colors"
                                            title="Remove this equation column"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Math Symbol Picker dropdown */}
                            {showPickerForIdx === idx && (
                                <MathPicker
                                    onSelect={(sym) => insertSymbolAt(idx, sym)}
                                    onClose={() => setShowPickerForIdx(null)}
                                />
                            )}

                            {/* Equation Editor & Live Preview */}
                            <div className="flex flex-col gap-2">
                                <input
                                    className="w-full text-xs font-mono bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Enter LaTeX (e.g. E = mc^2 or /math)..."
                                    value={eq}
                                    onChange={(e) => updateSingleEquation(idx, e.target.value)}
                                    onFocus={() => setActiveIdx(idx)}
                                />

                                {/* Rendered math display */}
                                <div
                                    className={`py-3 px-2 min-h-[50px] flex items-center justify-center overflow-x-auto text-center rounded-lg bg-gray-50/50 dark:bg-zinc-900/30 ${error ? "text-red-400 text-xs font-mono" : ""
                                        }`}
                                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Text / Note Row: Freeform text with inline $...$ math
// ─────────────────────────────────────────────

interface TextRowProps {
    block: RowBlock;
    onUpdateText: (id: string, text: string) => void;
    onDelete: (id: string) => void;
    onAddEquationBeside: (afterId: string) => void;
}

function TextRowComponent({ block, onUpdateText, onDelete, onAddEquationBeside }: TextRowProps) {
    const text = block.text ?? "";
    const [editing, setEditing] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const val = ta.value;
        const cursor = ta.selectionStart;
        const before = val.slice(0, cursor);

        if (e.key === " " || e.key === "Enter") {
            if (before.endsWith("/math")) {
                e.preventDefault();
                const newVal = val.slice(0, cursor - 5) + val.slice(cursor);
                onUpdateText(block.id, newVal);
                setShowPicker(true);
            }
        }
        if (e.key === "Escape") {
            setShowPicker(false);
        }
    };

    const insertSymbol = (latex: string) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const cursor = ta.selectionStart;
        const val = ta.value;
        const insert = `$${latex}$`;
        const newVal = val.slice(0, cursor) + insert + val.slice(cursor);
        onUpdateText(block.id, newVal);
        setShowPicker(false);
        setTimeout(() => {
            ta.focus();
            const pos = cursor + insert.length;
            ta.setSelectionRange(pos, pos);
        }, 0);
    };

    return (
        <div
            className="group relative my-1 rounded-xl transition-all duration-150"
            onClick={() => setEditing(true)}
        >
            {editing ? (
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        autoFocus
                        className="w-full resize-none bg-transparent text-base text-gray-900 dark:text-gray-100 focus:outline-none placeholder-gray-400 dark:placeholder-gray-600 leading-relaxed py-1 min-h-[2rem]"
                        value={text}
                        placeholder="Write notes here... type /math for symbols, or wrap formulas in $...$"
                        onChange={(e) => {
                            const val = e.target.value;
                            onUpdateText(block.id, val);
                            const cursor = e.target.selectionStart;
                            const before = val.slice(0, cursor);
                            if (before.endsWith("/math")) {
                                const newVal = val.slice(0, cursor - 5) + val.slice(cursor);
                                onUpdateText(block.id, newVal);
                                setShowPicker(true);
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        onBlur={() => {
                            setTimeout(() => {
                                if (!showPicker) setEditing(false);
                            }, 150);
                        }}
                        rows={Math.max(1, text.split("\n").length)}
                    />

                    {showPicker && (
                        <MathPicker
                            onSelect={insertSymbol}
                            onClose={() => setShowPicker(false)}
                        />
                    )}
                </div>
            ) : (
                <div
                    className="min-h-[1.85rem] py-1 leading-relaxed text-base text-gray-800 dark:text-gray-100 cursor-text whitespace-pre-wrap break-words"
                    onClick={() => setEditing(true)}
                >
                    {text ? (
                        renderInlineMath(text)
                    ) : (
                        <span className="text-gray-400 dark:text-gray-600 select-none text-sm italic">
                            Click to write notes... use <code className="text-xs bg-gray-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">$LaTeX$</code> or type <code className="text-xs bg-gray-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">/math</code>
                        </span>
                    )}
                </div>
            )}

            {/* Quick action buttons on hover */}
            <div className="absolute right-0 top-1 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddEquationBeside(block.id);
                    }}
                    className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1 hover:bg-indigo-100 transition-colors shadow-xs"
                    title="Insert separate equation row below"
                >
                    <Plus className="w-3 h-3" /> Eq
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(block.id);
                    }}
                    className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete line"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Paper Style Settings
// ─────────────────────────────────────────────

type PaperPattern = "lined" | "grid" | "dots" | "blank";

const STORAGE_KEY = "uni_tracker_notepad_data_v2";
const PATTERN_KEY = "uni_tracker_notepad_pattern";

function genId() {
    return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_BLOCKS: RowBlock[] = [
    {
        id: "intro-1",
        type: "text",
        text: "## Physics & Math Derivations",
    },
    {
        id: "intro-2",
        type: "equation-row",
        equations: [
            "E = mc^2",
            "F = G \\frac{m_1 m_2}{r^2}",
            "\\nabla \\times \\vec{B} = \\mu_0 \\vec{J} + \\mu_0 \\epsilon_0 \\frac{\\partial \\vec{E}}{\\partial t}",
        ],
    },
    {
        id: "intro-3",
        type: "text",
        text: "We can write equations side-by-side across the page, or write inline math like $\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$ directly in our notes.",
    },
];

// ─────────────────────────────────────────────
// Main Notepad Component
// ─────────────────────────────────────────────

export default function Notepad() {
    const [blocks, setBlocks] = useState<RowBlock[]>(DEFAULT_BLOCKS);
    const [pattern, setPattern] = useState<PaperPattern>("lined");
    const [copied, setCopied] = useState(false);

    // Load persisted state
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setBlocks(parsed);
                }
            }
            const savedPattern = localStorage.getItem(PATTERN_KEY) as PaperPattern | null;
            if (savedPattern) {
                setPattern(savedPattern);
            }
        } catch { }
    }, []);

    // Save persisted state
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
        } catch { }
    }, [blocks]);

    const changePattern = (newPattern: PaperPattern) => {
        setPattern(newPattern);
        try {
            localStorage.setItem(PATTERN_KEY, newPattern);
        } catch { }
    };

    const updateText = useCallback((id: string, text: string) => {
        setBlocks((prev) =>
            prev.map((b) => (b.id === id ? { ...b, text } : b))
        );
    }, []);

    const updateEquations = useCallback((id: string, equations: string[]) => {
        setBlocks((prev) =>
            prev.map((b) => (b.id === id ? { ...b, equations } : b))
        );
    }, []);

    const deleteBlock = useCallback((id: string) => {
        setBlocks((prev) => {
            const next = prev.filter((b) => b.id !== id);
            return next.length === 0
                ? [{ id: genId(), type: "text", text: "" }]
                : next;
        });
    }, []);

    const addTextBlock = useCallback((afterId?: string) => {
        const newBlock: RowBlock = { id: genId(), type: "text", text: "" };
        setBlocks((prev) => {
            if (!afterId) return [...prev, newBlock];
            const idx = prev.findIndex((b) => b.id === afterId);
            const next = [...prev];
            next.splice(idx + 1, 0, newBlock);
            return next;
        });
    }, []);

    const addEquationRow = useCallback((afterId?: string, count: number = 2) => {
        const initialEqs = Array.from({ length: count }, () => "");
        const newBlock: RowBlock = {
            id: genId(),
            type: "equation-row",
            equations: initialEqs,
        };
        setBlocks((prev) => {
            if (!afterId) return [...prev, newBlock];
            const idx = prev.findIndex((b) => b.id === afterId);
            const next = [...prev];
            next.splice(idx + 1, 0, newBlock);
            return next;
        });
    }, []);

    const clearAll = useCallback(() => {
        if (confirm("Clear the entire notepad? This will reset all text and equations.")) {
            setBlocks([{ id: genId(), type: "text", text: "" }]);
        }
    }, []);

    const copyMarkdown = useCallback(() => {
        let md = "";
        blocks.forEach((b) => {
            if (b.type === "text") {
                md += (b.text || "") + "\n\n";
            } else if (b.type === "equation-row" && b.equations) {
                b.equations.forEach((eq) => {
                    if (eq.trim()) {
                        md += `$$ ${eq.trim()} $$\n\n`;
                    }
                });
            }
        });
        navigator.clipboard.writeText(md);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [blocks]);

    // Background style generator based on paper pattern
    const getPaperStyle = () => {
        switch (pattern) {
            case "lined":
                return {
                    backgroundImage:
                        "repeating-linear-gradient(transparent, transparent 31px, rgba(148, 163, 184, 0.25) 31px, rgba(148, 163, 184, 0.25) 32px)",
                    backgroundSize: "100% 32px",
                    backgroundPositionY: "12px",
                };
            case "grid":
                return {
                    backgroundImage:
                        "linear-gradient(rgba(148, 163, 184, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.2) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                };
            case "dots":
                return {
                    backgroundImage:
                        "radial-gradient(rgba(148, 163, 184, 0.4) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                };
            case "blank":
            default:
                return {};
        }
    };

    return (
        <div className="flex flex-col gap-4 max-w-5xl mx-auto">
            {/* Header with Title and Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-zinc-800 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                        Math & Lecture Notepad
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        Write freeform notes across the page · Type <code className="text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-50 dark:bg-indigo-950/40 px-1 py-0.5 rounded">/math</code> for symbols · Add multiple equations across the row
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Paper Pattern Picker */}
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-200/50 dark:border-zinc-800 text-xs">
                        <button
                            onClick={() => changePattern("lined")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${pattern === "lined"
                                ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                                }`}
                            title="Lined Notepad Paper"
                        >
                            <AlignLeft className="w-3.5 h-3.5" />
                            Lined
                        </button>
                        <button
                            onClick={() => changePattern("grid")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${pattern === "grid"
                                ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                                }`}
                            title="Math Graph Paper"
                        >
                            <Grid3X3 className="w-3.5 h-3.5" />
                            Grid
                        </button>
                        <button
                            onClick={() => changePattern("blank")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${pattern === "blank"
                                ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                                }`}
                            title="Plain Blank Paper"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Blank
                        </button>
                    </div>

                    {/* Copy Markdown / LaTeX */}
                    <button
                        onClick={copyMarkdown}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs font-medium text-gray-700 dark:text-zinc-300 transition-colors shadow-xs"
                        title="Copy all notes and LaTeX formulas to clipboard"
                    >
                        {copied ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-500">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy LaTeX
                            </>
                        )}
                    </button>

                    {/* Clear */}
                    <button
                        onClick={clearAll}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-red-200/50 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-medium text-red-500 transition-colors"
                        title="Clear all notepad contents"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear
                    </button>
                </div>
            </div>

            {/* Notepad Paper Canvas */}
            <div
                className="relative min-h-[650px] rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#0B0B0E] shadow-lg px-8 py-8 transition-all"
                style={getPaperStyle()}
            >
                {/* Traditional red margin line for lined paper */}
                {pattern === "lined" && (
                    <div className="absolute left-16 top-0 bottom-0 w-px bg-red-300/60 dark:bg-red-900/40 pointer-events-none" />
                )}

                {/* Content Rows */}
                <div className="relative z-10 space-y-1">
                    {blocks.map((block) => (
                        <div key={block.id}>
                            {block.type === "equation-row" ? (
                                <EquationRowComponent
                                    block={block}
                                    onUpdateEquations={updateEquations}
                                    onDelete={deleteBlock}
                                />
                            ) : (
                                <TextRowComponent
                                    block={block}
                                    onUpdateText={updateText}
                                    onDelete={deleteBlock}
                                    onAddEquationBeside={addEquationRow}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Bottom Add Bar: Add Line or Add Equations across the page */}
                <div className="relative z-10 mt-8 pt-4 border-t border-gray-200/60 dark:border-zinc-800/80 flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => addTextBlock()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-gray-700 dark:text-zinc-200 transition-all active:scale-95"
                    >
                        <Plus className="w-3.5 h-3.5 text-indigo-500" />
                        Add Text Line
                    </button>

                    <button
                        onClick={() => addEquationRow(undefined, 2)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all active:scale-95"
                        title="Add 2 separate equations side-by-side across the page"
                    >
                        <Columns className="w-3.5 h-3.5" />
                        + 2 Equations Across Page
                    </button>

                    <button
                        onClick={() => addEquationRow(undefined, 3)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm shadow-violet-500/20 transition-all active:scale-95"
                        title="Add 3 separate equations side-by-side across the page"
                    >
                        <Columns className="w-3.5 h-3.5" />
                        + 3 Equations Across Page
                    </button>

                    <button
                        onClick={() => addEquationRow(undefined, 1)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs font-medium text-gray-700 dark:text-zinc-300 transition-colors"
                        title="Add a single full-width equation"
                    >
                        <Calculator className="w-3.5 h-3.5 text-indigo-500" />
                        + Single Equation
                    </button>
                </div>
            </div>

            {/* Tips footer */}
            <div className="flex flex-wrap items-center justify-between text-xs text-gray-400 dark:text-zinc-500 px-2">
                <div className="flex flex-wrap items-center gap-4">
                    <span>💡 Type <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 font-mono">/math</kbd> to open KaTeX library</span>
                    <span>Use <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 font-mono">$...$</kbd> for inline math</span>
                    <span>Use <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 font-mono">+ Equation Beside</kbd> to align equations across the page</span>
                </div>
                <span>Auto-saved to your browser</span>
            </div>
        </div>
    );
}
