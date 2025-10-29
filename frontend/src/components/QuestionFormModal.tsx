// src/components/QuestionFormModal.tsx
import React, { useState } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { api } from "../lib/api";

/** Cloudinary metadata */
export interface ImageMeta {
  url: string;
  provider?: string;
  key?: string;
  width?: number;
  height?: number;
  mime?: string;
  size?: number;
}

export interface Example { input: string; output: string; explanation?: string; image?: ImageMeta | undefined; }
export interface CodeSnippet { language: string; code: string; }
export interface TestCase { input: string; expected: string; }
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Topic = 'Strings' | 'Arrays' | 'Linked List' | 'Heaps' | 'Hashmap' | 'Trees' | 'Graphs' | 'Dynamic Programming';

export interface Question {
  id: string;
  title: string;
  difficulty: Difficulty;
  topics: Topic[];
  problemStatement: string;
  constraints: string[];
  examples: Example[];
  codeSnippets?: CodeSnippet[];
  testCases: TestCase[];
}

export type QuestionFormModalProps = {
  open: boolean;
  initial?: Question;
  onClose: () => void;
  onSaved: (q: Question) => void;
};

const TOPIC_OPTIONS: Topic[] = [
  'Strings','Arrays','Linked List','Heaps','Hashmap','Trees','Graphs','Dynamic Programming'
];

const emptyExample: Example = { input: '', output: '', explanation: '', image: undefined };
const emptySnippet: CodeSnippet = { language: 'javascript', code: '' };
const emptyTestCase: TestCase = { input: '', expected: '' };

const normalizeSaved = (raw: any): Question => {
  const data = raw?.data ?? raw ?? {};
  const id = data?.id || data?._id || '';
  return {
    id,
    title: data.title,
    difficulty: data.difficulty,
    topics: data.topics,
    problemStatement: data.problemStatement,
    constraints: data.constraints || [],
    examples: data.examples || [],
    codeSnippets: data.codeSnippets || [],
    testCases: data.testCases || [],
  } as Question;
};

const QuestionFormModal: React.FC<QuestionFormModalProps> = ({ open, initial, onClose, onSaved }) => {
  const mode: 'create' | 'edit' = initial ? 'edit' : 'create';

  // form state
  const [title, setTitle] = useState(initial?.title || '');
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty || 'Easy');
  const [topics, setTopics] = useState<Topic[]>(initial?.topics || []);
  const [problemStatement, setProblemStatement] = useState(initial?.problemStatement || '');
  const [constraints, setConstraints] = useState<string[]>(initial?.constraints?.length ? initial.constraints : ['']);
  const [examples, setExamples] = useState<Example[]>(initial?.examples?.length ? initial.examples : [{...emptyExample}]);
  const [codeSnippets, setCodeSnippets] = useState<CodeSnippet[]>(initial?.codeSnippets?.length ? initial.codeSnippets : []);
  const [testCases, setTestCases] = useState<TestCase[]>(initial?.testCases?.length ? initial.testCases : [{...emptyTestCase}]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState<Record<number, boolean>>({});
  const anyUploading = Object.values(uploading).some(Boolean);

  const toggleTopic = (t: Topic) => setTopics((prev) => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const validate = (): boolean => {
    const e: string[] = [];
    if (!title.trim()) e.push('Title is required.');
    if (!problemStatement.trim()) e.push('Problem statement is required.');
    if (!difficulty) e.push('Difficulty is required.');
    if (!topics.length) e.push('Select at least one topic.');

    const filteredConstraints = constraints.map(c => c.trim()).filter(Boolean);
    if (!filteredConstraints.length) e.push('Provide at least one constraint.');

    const validExamples = examples.filter(ex => ex.input?.trim() && ex.output?.trim());
    if (!validExamples.length) e.push('Provide at least one example with input and output.');

    const validTests = testCases.filter(tc => tc.input?.trim() && tc.expected?.trim());
    if (!validTests.length) e.push('Provide at least one test case with input and expected.');

    setErrors(e);
    return e.length === 0;
  };

  const uploadExampleImage = async (idx: number, file: File) => {
    setUploading((u) => ({ ...u, [idx]: true }));
    try {
      const form = new FormData();
      form.append('image', file);

      const base = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/questions/uploads/image`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: form
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      const meta: ImageMeta = data?.data ?? data;
      setExamples(prev => prev.map((ex, i) => i === idx ? { ...ex, image: meta } : ex));
    } catch (err: any) {
      const msg = err?.message || 'Image upload failed.';
      setErrors([msg]);
      console.error('Image upload error:', err);
    } finally {
      setUploading((u) => ({ ...u, [idx]: false }));
    }
  };

  const onSubmit = async () => {
    if (saving) return;

    if (anyUploading) {
      setErrors(['Please wait for image upload(s) to finish before saving.']);
      return;
    }

    if (!validate()) return;
    setSaving(true);
    setErrors([]);

    const payload = {
      title: title.trim(),
      difficulty,
      topics,
      problemStatement: problemStatement.trim(),
      constraints: constraints.map(c => c.trim()).filter(Boolean),
      examples: examples
        .map(e => ({
          input: e.input?.trim() || '',
          output: e.output?.trim() || '',
          explanation: e.explanation?.trim() || undefined,
          image: e.image && typeof (e.image as any).url === 'string' ? (e.image as ImageMeta) : undefined
        }))
        .filter(e => e.input && e.output),
      codeSnippets: (codeSnippets || [])
        .map(s => ({ language: s.language?.trim(), code: s.code }))
        .filter(s => s.language && s.code?.trim()),
      testCases: testCases
        .map(t => ({ input: t.input?.trim() || '', expected: t.expected?.trim() || '' }))
        .filter(t => t.input && t.expected),
    };

    try {
      const res = mode === 'create'
        ? await api('/questions/', { method: 'POST', body: payload })
        : await api(`/questions/id/${initial!.id}`, { method: 'PATCH', body: payload });

      const saved = normalizeSaved(res);
      onSaved(saved);
    } catch (err: any) {
      const msg = err?.message || 'Failed to save question.';
      setErrors([msg]);
      console.error('Save question failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const closeIfNotSaving = () => { if (!saving) onClose(); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-black/60 p-4 sm:p-6 md:p-8">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-gray-200 mt-8 sm:mt-12 max-h-[calc(100vh-6rem)] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{initial ? 'Edit Question' : 'Add New Question'}</h2>
            <p className="text-sm text-gray-500">Fill in the details below. Fields marked with * are required.</p>
          </div>
          <button
            type="button"
            onClick={closeIfNotSaving}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            title="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* Basics */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title *</label>
              <input
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Sum of Two Numbers"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Difficulty *</label>
              <select
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Topics * (choose at least one)</label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {TOPIC_OPTIONS.map((t) => (
                  <label
                    key={t}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer ${
                      topics.includes(t) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="rounded text-blue-600 focus:ring-blue-500"
                      checked={topics.includes(t)}
                      onChange={() => toggleTopic(t)}
                    />
                    <span className="text-sm text-gray-700">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Problem Statement *</label>
              <textarea
                className="mt-1 w-full min-h-[120px] border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="Describe the task clearly..."
              />
            </div>
          </section>

          {/* Constraints */}
          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">Constraints *</h3>
              <button
                type="button"
                onClick={() => setConstraints((prev) => [...prev, ''])}
                className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900"
              >
                <PlusIcon className="h-4 w-4" /> Add constraint
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {constraints.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                    value={c}
                    onChange={(e) => setConstraints((prev) => prev.map((x, i) => i === idx ? e.target.value : x))}
                    placeholder="e.g., All numbers are integers."
                  />
                  <button
                    type="button"
                    onClick={() => setConstraints(prev => prev.filter((_, i) => i !== idx))}
                    className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50"
                    title="Remove"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Examples */}
          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">Examples * (min 1)</h3>
              <button
                type="button"
                onClick={() => setExamples(prev => [...prev, { ...emptyExample }])}
                className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900"
              >
                <PlusIcon className="h-4 w-4" /> Add example
              </button>
            </div>

            <div className="mt-3 space-y-4">
              {examples.map((ex, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Example #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setExamples(prev => prev.filter((_, i) => i !== idx))}
                      className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50"
                      title="Remove example"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Input *</label>
                      <input
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                        value={ex.input}
                        onChange={(e) => setExamples(prev => prev.map((x, i) => i === idx ? { ...x, input: e.target.value } : x))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Output *</label>
                      <input
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                        value={ex.output}
                        onChange={(e) => setExamples(prev => prev.map((x, i) => i === idx ? { ...x, output: e.target.value } : x))}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600">Explanation</label>
                      <textarea
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                        value={ex.explanation || ''}
                        onChange={(e) => setExamples(prev => prev.map((x, i) => i === idx ? { ...x, explanation: e.target.value } : x))}
                      />
                    </div>

                    {/* Image upload */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600">Image (optional)</label>

                      {ex.image?.url ? (
                        <div className="mt-2 flex items-start gap-4">
                          <img
                            src={ex.image.url}
                            alt="Example"
                            className="h-24 w-24 object-contain rounded border border-gray-200 bg-white"
                          />
                          <div className="flex flex-col gap-2">
                            <div className="text-xs text-gray-500">
                              {ex.image.width ?? '—'}×{ex.image.height ?? '—'} · {ex.image.mime ?? 'image'}
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 text-sm cursor-pointer hover:bg-gray-50">
                                Replace…
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) uploadExampleImage(idx, f);
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => setExamples(prev => prev.map((x, i) => i === idx ? { ...x, image: undefined } : x))}
                                className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600"
                              >
                                Remove image
                              </button>
                            </div>
                            {uploading[idx] && (
                              <div className="text-xs text-blue-600">Uploading…</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <label className="mt-1 inline-flex items-center px-3 py-2 rounded-lg border border-dashed border-gray-300 text-sm cursor-pointer hover:bg-gray-50">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadExampleImage(idx, f);
                            }}
                          />
                          {uploading[idx] ? 'Uploading…' : 'Choose image file'}
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Code Snippets */}
          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">Code Snippets (optional)</h3>
              <button
                type="button"
                onClick={() => setCodeSnippets(prev => [...prev, { ...emptySnippet }])}
                className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900"
              >
                <PlusIcon className="h-4 w-4" /> Add snippet
              </button>
            </div>

            {codeSnippets.length > 0 && (
              <div className="mt-3 space-y-4">
                {codeSnippets.map((sn, idx) => (
                  <div key={idx} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Snippet #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setCodeSnippets(prev => prev.filter((_, i) => i !== idx))}
                        className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50"
                        title="Remove snippet"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Language *</label>
                        <select
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                          value={sn.language}
                          onChange={(e) => setCodeSnippets(prev => prev.map((x, i) => i === idx ? { ...x, language: e.target.value } : x))}
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="typescript">TypeScript</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="cpp">C++</option>
                          <option value="go">Go</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600">Code *</label>
                        <textarea
                          className="mt-1 w-full min-h-[100px] border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-blue-500"
                          value={sn.code}
                          onChange={(e) => setCodeSnippets(prev => prev.map((x, i) => i === idx ? { ...x, code: e.target.value } : x))}
                          placeholder="function sum(a, b) { return a + b; }"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Test Cases */}
          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">Test Cases * (min 1)</h3>
              <button
                type="button"
                onClick={() => setTestCases(prev => [...prev, { ...emptyTestCase }])}
                className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900"
              >
                <PlusIcon className="h-4 w-4" /> Add test case
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {testCases.map((tc, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-start">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Input *</label>
                    <input
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                      value={tc.input}
                      onChange={(e) => setTestCases(prev => prev.map((x, i) => i === idx ? { ...x, input: e.target.value } : x))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Expected *</label>
                    <input
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                      value={tc.expected}
                      onChange={(e) => setTestCases(prev => prev.map((x, i) => i === idx ? { ...x, expected: e.target.value } : x))}
                    />
                  </div>
                  <div className="justify-self-start md:justify-self-end md:flex md:flex-col">
                    <label className="block text-xs font-medium opacity-0 select-none">Remove</label>
                    <button
                      type="button"
                      onClick={() => setTestCases(prev => prev.filter((_, i) => i !== idx))}
                      className="mt-1 inline-flex items-center px-3 py-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-300 w-auto"
                      title="Remove test case"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={closeIfNotSaving}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            title={anyUploading ? 'Please wait for image upload(s) to finish' : undefined}
          >
            {saving && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            )}
            {initial ? 'Save Changes' : 'Create Question'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionFormModal;
