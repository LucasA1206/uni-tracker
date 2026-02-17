import { useState } from "react";
import { CheckCircle2, XCircle, ArrowRight, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface Question {
    type: "MCQ" | "SA";
    question: string;
    options?: string[]; // Only for MCQ
    correctAnswer: string;
    explanation?: string;
}

interface QuizActiveProps {
    questions: Question[];
    onComplete: (score: number, wrongAnswers: { question: string, correctAnswer: string, userAnswer: string }[]) => void;
    onCancel: () => void;
}

export default function QuizActive({ questions, onComplete, onCancel }: QuizActiveProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [wrongAnswers, setWrongAnswers] = useState<{ question: string, correctAnswer: string, userAnswer: string }[]>([]);

    // State for current question interaction
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [saRevealed, setSaRevealed] = useState(false);
    const [saUserRating, setSaUserRating] = useState<"correct" | "incorrect" | null>(null);

    const currentQuestion = questions[currentIndex];

    const handleMcqSelect = (option: string) => {
        if (isAnswered) return;
        setSelectedOption(option);
        setIsAnswered(true);

        const isCorrect = option === currentQuestion.correctAnswer;
        if (isCorrect) {
            setScore(prev => prev + 1);
        } else {
            setWrongAnswers(prev => [...prev, {
                question: currentQuestion.question,
                correctAnswer: currentQuestion.correctAnswer,
                userAnswer: option
            }]);
        }
    };

    const handleSaReveal = () => {
        setSaRevealed(true);
    };

    const handleSaRate = (rating: "correct" | "incorrect") => {
        setSaUserRating(rating);
        setIsAnswered(true);

        if (rating === "correct") {
            setScore(prev => prev + 1);
        } else {
            setWrongAnswers(prev => [...prev, {
                question: currentQuestion.question,
                correctAnswer: currentQuestion.correctAnswer,
                userAnswer: "Self-rated incorrect"
            }]);
        }
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            // Reset state
            setSelectedOption(null);
            setIsAnswered(false);
            setSaRevealed(false);
            setSaUserRating(null);
        } else {
            onComplete(score, wrongAnswers);
        }
    };

    return (
        <div className="flex flex-col h-full max-h-[80vh]">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b pb-4 dark:border-gray-800">
                <div>
                    <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Question {currentIndex + 1} of {questions.length}</span>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-1 w-32">
                        <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
                    </div>
                </div>
                <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">Exit Quiz</button>
            </div>

            {/* Question Area */}
            <div className="flex-1 overflow-y-auto pr-2">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                            {currentQuestion.question}
                        </h3>

                        {/* MCQ Options */}
                        {currentQuestion.type === "MCQ" && currentQuestion.options && (
                            <div className="space-y-3">
                                {currentQuestion.options.map((option, idx) => {
                                    let optionStyle = "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800";

                                    if (isAnswered) {
                                        if (option === currentQuestion.correctAnswer) {
                                            optionStyle = "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400";
                                        } else if (option === selectedOption && option !== currentQuestion.correctAnswer) {
                                            optionStyle = "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400";
                                        } else {
                                            optionStyle = "opacity-50 border-gray-200 dark:border-gray-800";
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleMcqSelect(option)}
                                            disabled={isAnswered}
                                            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${optionStyle}`}
                                        >
                                            <span className="flex-1">{option}</span>
                                            {isAnswered && option === currentQuestion.correctAnswer && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                            {isAnswered && option === selectedOption && option !== currentQuestion.correctAnswer && <XCircle className="w-5 h-5 text-red-500" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Short Answer Logic */}
                        {currentQuestion.type === "SA" && (
                            <div className="space-y-6">
                                {!saRevealed ? (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-center text-gray-500 text-sm">
                                            Think of your answer, then click reveal to compare.
                                        </div>
                                        <button
                                            onClick={handleSaReveal}
                                            className="w-full py-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                                        >
                                            Reveal Answer
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                        <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                                            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">Correct Answer</p>
                                            <p className="text-gray-800 dark:text-gray-200">{currentQuestion.correctAnswer}</p>
                                        </div>

                                        {!isAnswered && (
                                            <div className="space-y-2">
                                                <p className="text-center text-sm text-gray-500">How did you do?</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button
                                                        onClick={() => handleSaRate("incorrect")}
                                                        className="flex items-center justify-center gap-2 py-3 border-2 border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-xl transition-colors"
                                                    >
                                                        <XCircle className="w-4 h-4" /> Got it wrong
                                                    </button>
                                                    <button
                                                        onClick={() => handleSaRate("correct")}
                                                        className="flex items-center justify-center gap-2 py-3 border-2 border-green-100 dark:border-green-900/30 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 rounded-xl transition-colors"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" /> Got it right
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Explanation / Next Button */}
                        {isAnswered && (
                            <div className="pt-4 border-t dark:border-gray-800 animate-in fade-in">
                                {currentQuestion.explanation && (
                                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                                        <span className="font-semibold mr-2">Explanation:</span> {currentQuestion.explanation}
                                    </div>
                                )}
                                <button
                                    onClick={nextQuestion}
                                    className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                >
                                    {currentIndex < questions.length - 1 ? "Next Question" : "Finish Quiz"}
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
