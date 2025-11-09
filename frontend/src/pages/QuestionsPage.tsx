// src/pages/QuestionsPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import Header from "../components/Header";
import { api } from "../lib/api";
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { theme } from "../theme";
import QuestionFormModal, { Question } from  "../components/QuestionFormModal";

type Style = React.CSSProperties;

const ITEMS_PER_PAGE = 25;

const QuestionsPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const currentPageName = "Questions";

  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api('/questions/');
        setQuestions((response?.data as Question[]) || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch questions');
        console.error("Fetch questions error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  useEffect(() => {
    console.log("Questions state has been updated:", questions);
  }, [questions]);

  const totalPages = Math.ceil(questions.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentQuestions = useMemo(() => questions.slice(startIndex, endIndex), [questions, startIndex, endIndex]);

  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  const handleEdit = (questionId: string) => {
    const q = questions.find((qq) => qq.id === questionId) || null;
    setEditingQuestion(q);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingQuestion(null);
    setShowForm(true);
  };

  const handleDelete = (questionId: string) => {
    setQuestionToDelete(questionId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!questionToDelete) return;
    setShowDeleteConfirm(false);
    setError(null);

    try {
      await api(`/questions/id/${questionToDelete}`, { method: 'DELETE' });
      setQuestions(prev => prev.filter(q => q.id !== questionToDelete));
      setQuestionToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete question');
      console.error("Delete question error:", err);
      setQuestionToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setQuestionToDelete(null);
  };

  const upsertQuestion = (saved: Question) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
  };

  return (
    <div style={styles.appContainer}>
      <Header
        variant="beta"
        isSidebarOpen={isSidebarOpen}
        currentPage={currentPageName}
        onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
        onNavigate={(p) => console.log("Navigate to:", p)}
      />

      <main
        className={`p-8 pt-[calc(60px+2rem)] transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "ml-60" : "ml-[72px]"
        }`}
      >
        <section className="rounded-xl p-5 shadow-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 dark:text-slate-100">Questions</h1>
            </div>
            <button
              onClick={handleAddNew}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              <PlusIcon className="h-5 w-5"/> Add New Question
            </button>
          </div>

          {isLoading && <p className="text-gray-500 dark:text-slate-400 text-center py-4">Loading questions...</p>}
          {error && <p className="text-red-500 dark:text-red-400 text-center py-4">Error: {error}</p>}

          {!isLoading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto text-left">
                  <thead className="border-b border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60">
                    <tr>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-300 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-300 uppercase tracking-wider">Difficulty</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-300 uppercase tracking-wider">Topics</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-300 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {currentQuestions.map((q) => (
                      <tr key={q.id} className="transition hover:bg-gray-50 dark:hover:bg-slate-800/80">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-slate-100">{q.title}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            q.difficulty === 'Easy'
                              ? 'bg-green-100 text-green-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                              : q.difficulty === 'Medium'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-amber-900/50 dark:text-amber-200'
                                : 'bg-red-100 text-red-800 dark:bg-rose-900/50 dark:text-rose-200'
                          }`}>
                            {q.difficulty}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">{q.topics.join(', ')}</td>
                        <td className="px-4 py-3 text-sm text-right space-x-3">
                          <button onClick={() => handleEdit(q.id)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium" title="Edit">
                            <PencilIcon className="h-5 w-5 inline-block"/>
                          </button>
                          <button onClick={() => handleDelete(q.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium" title="Delete">
                            <TrashIcon className="h-5 w-5 inline-block"/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center mt-6">
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, questions.length)} of {questions.length} questions
                </span>
                <div className="space-x-2">
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-slate-200 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-slate-200 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {showDeleteConfirm && (
        <div style={styles.modalOverlay}>
          <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-slate-100">Delete Question</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-slate-400">Are you sure you want to delete this question? This action cannot be undone.</p>
              </div>
              <div className="items-center px-4 py-3 space-x-4">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded hover:bg-gray-300 dark:hover:bg-slate-700 text-base font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-base font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <QuestionFormModal
          initial={editingQuestion || undefined}
          onClose={() => setShowForm(false)}
          onSaved={(saved) => { upsertQuestion(saved); setShowForm(false); }}
        />
      )}
    </div>
  );
};

const styles: { [key: string]: Style } = {
  appContainer: {
    backgroundColor: theme.backgroundDark,
    color: theme.textPrimary,
    fontFamily: "'Inter','Segoe UI', Roboto, sans-serif",
    minHeight: "100vh",
  },
  mainContent: { transition: "margin-left 0.3s ease-in-out" },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
};

export default QuestionsPage;
