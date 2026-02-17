import { CheckCircle2, XCircle, RefreshCw, X } from "lucide-react";
import { motion } from "framer-motion";

interface QuizResultsProps {
    score: number;
    totalQuestions: number;
    wrongAnswers: { question: string, correctAnswer: string, userAnswer: string }[];
    onClose: () => void;
    onRetry: () => void;
}

export default function QuizResults({ score, totalQuestions, wrongAnswers, onClose, onRetry }: QuizResultsProps) {
    const percentage = Math.round((score / totalQuestions) * 100);

    let message = "Good effort!";
    if (percentage >= 90) message = "Outstanding!";
    else if (percentage >= 70) message = "Great job!";
    else if (percentage < 50) message = "Keep practicing!";

    return (
        <div className="flex flex-col h-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quiz Results</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 pb-6">
                <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 mb-4 relative">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path
                                className="text-gray-200 dark:text-gray-700"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                            <path
                                className={`${percentage >= 70 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                                strokeDasharray={`${percentage}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-2xl font-bold dark:text-white">{percentage}%</span>
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{message}</h3>
                    <p className="text-gray-500 dark:text-gray-400">You scored {score} out of {totalQuestions}</p>
                </div>

                {wrongAnswers.length > 0 && (
                    <div className="space-y-4 mt-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white px-2">Review Incorrect Answers</h4>
                        {wrongAnswers.map((item, idx) => (
                            <div key={idx} className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-4 space-y-3">
                                <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                                    <span className="text-red-500 font-bold mr-2">Q{idx + 1}.</span>
                                    {item.question}
                                </p>
                                <div className="grid gap-2 text-xs sm:text-sm">
                                    <div className="flex gap-2">
                                        <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                        <span className="text-gray-600 dark:text-gray-400 line-through decoration-red-400">{item.userAnswer}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                        <span className="text-gray-900 dark:text-white font-medium">{item.correctAnswer}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="pt-4 border-t dark:border-gray-800 flex gap-3">
                <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                    Close
                </button>
                {/* Optional: Implement Retry if we want to regenerate or re-take same quiz. For now, close is safer. */}
            </div>
        </div>
    );
}
