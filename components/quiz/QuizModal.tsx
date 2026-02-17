import { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Sparkles, Loader2, BrainCircuit } from "lucide-react";
import QuizActive, { Question } from "./QuizActive";
import QuizResults from "./QuizResults";

interface QuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteId?: number;
    courseId?: number;
    title: string;
}

export default function QuizModal({ isOpen, onClose, noteId, courseId, title }: QuizModalProps) {
    const [step, setStep] = useState<"config" | "loading" | "active" | "results">("config");
    const [questionCount, setQuestionCount] = useState<number>(noteId ? 10 : 25);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [results, setResults] = useState<{ score: number, wrongAnswers: any[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const availableCounts = noteId ? [10, 20, 30] : [25, 50, 75];

    const generateQuiz = async () => {
        setStep("loading");
        setError(null);
        try {
            const res = await fetch("/api/ai/generate-quiz", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    noteId,
                    courseId,
                    questionCount
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to generate quiz");
            }

            const data = await res.json();
            if (!data.quiz || !Array.isArray(data.quiz)) throw new Error("Invalid format received");

            setQuestions(data.quiz);
            setStep("active");
        } catch (err: any) {
            console.error(err);
            setError(err.message);
            setStep("config");
        }
    };

    const handleComplete = (score: number, wrongAnswers: any[]) => {
        setResults({ score, wrongAnswers });
        setStep("results");
    };

    const handleClose = () => {
        setStep("config");
        setQuestions([]);
        setResults(null);
        setError(null);
        onClose();
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-[#1A1A1A] text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-[#2A2A2E]">

                                <div className="p-6 md:p-8">
                                    {step === "config" && (
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-start">
                                                <Dialog.Title className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">
                                                    <BrainCircuit className="w-6 h-6 text-indigo-500" />
                                                    Quiz Me!
                                                </Dialog.Title>
                                                <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                                    <p className="text-sm text-indigo-900 dark:text-indigo-200 font-medium">
                                                        Generate a quiz for: <span className="font-bold">{title}</span>
                                                    </p>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Number of Questions</label>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {availableCounts.map(count => (
                                                            <button
                                                                key={count}
                                                                onClick={() => setQuestionCount(count)}
                                                                className={`py-3 rounded-xl border text-sm font-semibold transition-all ${questionCount === count
                                                                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                                                                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                                                                    }`}
                                                            >
                                                                {count} Questions
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {error && (
                                                    <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                                                        Error: {error}
                                                    </p>
                                                )}

                                                <button
                                                    onClick={generateQuiz}
                                                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                                                >
                                                    <Sparkles className="w-5 h-5" />
                                                    Start Quiz
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {step === "loading" && (
                                        <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
                                                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin relative z-10" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Generating your quiz...</h3>
                                                <p className="text-gray-500 dark:text-gray-400">AI is analyzing your notes to create questions.</p>
                                            </div>
                                        </div>
                                    )}

                                    {step === "active" && (
                                        <QuizActive
                                            questions={questions}
                                            onComplete={handleComplete}
                                            onCancel={handleClose}
                                        />
                                    )}

                                    {step === "results" && results && (
                                        <QuizResults
                                            score={results.score}
                                            totalQuestions={questions.length}
                                            wrongAnswers={results.wrongAnswers}
                                            onClose={handleClose}
                                            onRetry={() => { }}
                                        />
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
