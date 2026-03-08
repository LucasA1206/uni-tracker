import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface Question {
    type: "MCQ" | "SA";
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation?: string;
}

interface QuizActiveProps {
    quizId?: number;
    initialIndex?: number;
    initialScore?: number;
    initialWrongAnswers?: { question: string, correctAnswer: string, userAnswer: string, feedback?: string }[];
    questions: Question[];
    onComplete: (score: number, wrongAnswers: { question: string, correctAnswer: string, userAnswer: string, feedback?: string }[]) => void;
    onCancel: () => void;
}

export default function QuizActive({
    quizId,
    initialIndex = 0,
    initialScore = 0,
    initialWrongAnswers = [],
    questions,
    onComplete,
    onCancel
}: QuizActiveProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [score, setScore] = useState(initialScore);
    const [wrongAnswers, setWrongAnswers] = useState<{ question: string, correctAnswer: string, userAnswer: string, feedback?: string }[]>(initialWrongAnswers);

    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [saUserAnswer, setSaUserAnswer] = useState("");
    const [isAnswered, setIsAnswered] = useState(false);

    // SA Specific
    const [isMarking, setIsMarking] = useState(false);
    const [saFeedback, setSaFeedback] = useState<string | null>(null);
    const [saCorrect, setSaCorrect] = useState<boolean | null>(null);

    const currentQuestion = questions[currentIndex];

    // Added bounds check at beginning to guarantee safety
    if (!currentQuestion) {
        return null;
    }

    const saveProgress = async (newIndex: number, newScore: number, newWrongAnswers: any[], isCompleted: boolean = false) => {
        if (!quizId) return;
        try {
            await fetch("/api/quiz", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    quizId,
                    score: newScore,
                    currentIndex: newIndex,
                    wrongAnswers: newWrongAnswers,
                    isCompleted
                })
            });
        } catch (error) {
            console.error("Failed to save progress", error);
        }
    };

    const checkIsCorrect = (opt: string, correctAns: string) => {
        if (!opt || !correctAns) return false;
        const o = String(opt).trim();
        const c = String(correctAns).trim();
        if (o === c) return true;
        if (o.toLowerCase() === c.toLowerCase()) return true;

        if (c.length === 1 && /^[a-zA-Z]$/.test(c)) {
            if (o.toLowerCase().startsWith(c.toLowerCase() + ".") ||
                o.toLowerCase().startsWith(c.toLowerCase() + ")") ||
                o.toLowerCase().startsWith(c.toLowerCase() + " ")) {
                return true;
            }
        }

        const strippedO = o.replace(/^[a-zA-Z][\.\)]\s*/, "").trim();
        if (strippedO.toLowerCase() === c.toLowerCase()) return true;

        return false;
    };

    const handleMcqSelect = (option: string) => {
        if (isAnswered) return;
        setSelectedOption(option);
        setIsAnswered(true);

        const isCorrect = checkIsCorrect(option, currentQuestion.correctAnswer);
        const newScore = isCorrect ? score + 1 : score;
        const newWrongAnswers = isCorrect ? wrongAnswers : [...wrongAnswers, {
            question: currentQuestion.question,
            correctAnswer: currentQuestion.correctAnswer,
            userAnswer: option
        }];

        if (isCorrect) setScore(newScore);
        else setWrongAnswers(newWrongAnswers);

        saveProgress(currentIndex, newScore, newWrongAnswers, false);
    };

    const handleSaMark = async () => {
        if (!saUserAnswer.trim() || isAnswered || isMarking) return;

        setIsMarking(true);
        try {
            const res = await fetch("/api/ai/mark-answer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: currentQuestion.question,
                    correctAnswer: currentQuestion.correctAnswer,
                    userAnswer: saUserAnswer
                })
            });

            if (!res.ok) throw new Error("Marking failed");

            const data = await res.json();

            setIsAnswered(true);
            setSaCorrect(data.isCorrect);
            setSaFeedback(data.feedback);

            const newScore = data.isCorrect ? score + 1 : score;
            const newWrongAnswers = data.isCorrect ? wrongAnswers : [...wrongAnswers, {
                question: currentQuestion.question,
                correctAnswer: currentQuestion.correctAnswer,
                userAnswer: saUserAnswer,
                feedback: data.feedback
            }];

            if (data.isCorrect) setScore(newScore);
            else setWrongAnswers(newWrongAnswers);

            saveProgress(currentIndex, newScore, newWrongAnswers, false);

        } catch (error) {
            console.error(error);
            alert("Failed to mark answer, please try again.");
        } finally {
            setIsMarking(false);
        }
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            setSelectedOption(null);
            setSaUserAnswer("");
            setIsAnswered(false);
            setSaFeedback(null);
            setSaCorrect(null);
            saveProgress(nextIdx, score, wrongAnswers, false);
        } else {
            saveProgress(currentIndex, score, wrongAnswers, true);
            onComplete(score, wrongAnswers);
        }
    };

    return (
        <div className="flex flex-col h-full max-h-[80vh]">
            <div className="flex justify-between items-center mb-6 border-b pb-4 dark:border-gray-800">
                <div>
                    <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Question {currentIndex + 1} of {questions.length}</span>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-1 w-32">
                        <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
                    </div>
                </div>
                <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">Exit Quiz</button>
            </div>

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

                        {currentQuestion.type === "MCQ" && currentQuestion.options && (
                            <div className="space-y-3">
                                {currentQuestion.options.map((option, idx) => {
                                    let optionStyle = "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800";

                                    if (isAnswered) {
                                        const isThisOptionCorrect = checkIsCorrect(option, currentQuestion.correctAnswer);
                                        const isThisOptionSelected = option === selectedOption;

                                        if (isThisOptionCorrect) {
                                            optionStyle = "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400";
                                        } else if (isThisOptionSelected && !isThisOptionCorrect) {
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
                                            {isAnswered && checkIsCorrect(option, currentQuestion.correctAnswer) && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                            {isAnswered && option === selectedOption && !checkIsCorrect(option, currentQuestion.correctAnswer) && <XCircle className="w-5 h-5 text-red-500" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {currentQuestion.type === "SA" && (
                            <div className="space-y-6">
                                {!isAnswered ? (
                                    <div className="space-y-4">
                                        <textarea
                                            value={saUserAnswer}
                                            onChange={(e) => setSaUserAnswer(e.target.value)}
                                            placeholder="Type your answer here..."
                                            className="w-full p-4 min-h-[120px] rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                        />
                                        <button
                                            onClick={handleSaMark}
                                            disabled={!saUserAnswer.trim() || isMarking}
                                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            {isMarking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                            {isMarking ? "Marking with AI..." : "Mark Answer"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                        <div className={`p-5 rounded-xl border ${saCorrect ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50'}`}>
                                            <div className="flex items-center gap-2 mb-3">
                                                {saCorrect ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                                                <h4 className={`font-bold ${saCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                                    {saCorrect ? "Correct!" : "Incorrect"}
                                                </h4>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg">
                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Your Answer</p>
                                                    <p className="text-gray-800 dark:text-gray-200">{saUserAnswer}</p>
                                                </div>

                                                <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                                                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">AI Feedback</p>
                                                    <p className="text-gray-800 dark:text-gray-200">{saFeedback}</p>
                                                </div>

                                                {!saCorrect && (
                                                    <div className="mt-4">
                                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ideal Answer</p>
                                                        <p className="text-gray-700 dark:text-gray-300 italic">{currentQuestion.correctAnswer}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {isAnswered && (
                            <div className="pt-4 border-t dark:border-gray-800 animate-in fade-in">
                                {currentQuestion.explanation && currentQuestion.type === "MCQ" && (
                                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-sm text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
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
