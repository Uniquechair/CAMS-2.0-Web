import React, { useState, useRef } from 'react';
import { submitSupportQuestion } from '../../../../../Api/api';

export default function AskQuestionForm({ role, categories, theme = 'customer' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || '');
  const [question, setQuestion] = useState('');
  const [file, setFile] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef(null);

  const isCustomer = theme === 'customer';

  const themeStyles = {
    containerBg: isCustomer ? 'bg-white border-[#E8E1D9]' : 'bg-white border-gray-200',
    titleText: isCustomer ? 'text-[#493829] font-serif' : 'text-gray-800 font-serif',
    mutedText: isCustomer ? 'text-[#7A6555]' : 'text-gray-500',
    inputBorder: isCustomer
      ? 'border-[#E8E1D9] focus:border-[#C4956A] focus:ring-[#C4956A]/20'
      : 'border-gray-300 focus:border-[#8DC63F] focus:ring-[#8DC63F]/20',
    buttonBg: isCustomer
      ? 'bg-[#C4956A] hover:bg-[#b3844d] text-white'
      : 'bg-[#8DC63F] hover:bg-[#7ab036] text-white',
    filePill: isCustomer
      ? 'bg-[#F5F0EA] text-[#493829] border-[#E8E1D9]'
      : 'bg-gray-100 text-gray-700 border-gray-200',
    successBg: isCustomer ? 'bg-[#FBF6F0] border-[#C4956A]' : 'bg-[#8DC63F]/10 border-[#8DC63F]',
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

    if (!allowedTypes.includes(selectedFile.type)) {
      setErrorMessage('Only JPG, PNG, or PDF files are allowed.');
      setFile(null);
      return;
    }

    if (selectedFile.size > maxSize) {
      setErrorMessage('File size must not be more than 5MB.');
      setFile(null);
      return;
    }

    setErrorMessage('');
    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!question.trim() || !name.trim() || !email.trim()) {
      setErrorMessage('Please fill in name, email, and question.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const formData = new FormData();

      formData.append('role', role);
      formData.append('name', name.trim());
      formData.append('email', email.trim());
      formData.append('category', selectedCategory || 'others');
      formData.append('question', question.trim());

      const userid = localStorage.getItem('userid');
      if (userid) {
        formData.append('userid', userid);
      }

      if (file) {
        formData.append('file', file);
      }

      await submitSupportQuestion(formData);

      setIsSubmitted(true);
      setName('');
      setEmail('');
      setSelectedCategory(categories[0]?.id || 'others');
      setQuestion('');
      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Submit FAQ question error:', error);
      setErrorMessage(error.message || 'Failed to submit question. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className={`mt-16 max-w-3xl mx-auto rounded-2xl p-8 text-center border ${themeStyles.successBg} animate-fade-in-up`}>
        <div className="text-4xl mb-4">✅</div>

        <h3 className={`text-2xl font-semibold mb-2 ${themeStyles.titleText}`}>
          Question Submitted!
        </h3>

        <p className={`${themeStyles.mutedText}`}>
          Thanks. Your question has been sent to the admin team for review.
        </p>

        <button
          type="button"
          onClick={() => setIsSubmitted(false)}
          className={`mt-6 px-6 py-2 rounded-xl font-semibold ${themeStyles.buttonBg}`}
        >
          Submit Another Question
        </button>
      </div>
    );
  }

  return (
    <div className={`mt-16 max-w-3xl mx-auto rounded-2xl p-8 border shadow-sm ${themeStyles.containerBg} animate-fade-in-up`}>
      <div className="mb-8">
        <h3 className={`text-2xl font-semibold mb-2 ${themeStyles.titleText}`}>
          Can't find what you're looking for?
        </h3>

        <p className={`${themeStyles.mutedText} text-sm`}>
          Ask our support team directly. We usually respond within 24 hours.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${themeStyles.mutedText}`}>
              Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
              className={`w-full rounded-xl py-3 px-4 text-[15px] outline-none focus:ring-2 transition-all border ${themeStyles.inputBorder}`}
            />
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${themeStyles.mutedText}`}>
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className={`w-full rounded-xl py-3 px-4 text-[15px] outline-none focus:ring-2 transition-all border ${themeStyles.inputBorder}`}
            />
          </div>
        </div>

        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${themeStyles.mutedText}`}>
            Topic
          </label>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`w-full rounded-xl py-3 px-4 text-[15px] outline-none focus:ring-2 transition-all border ${themeStyles.inputBorder}`}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}

            <option value="others">Others</option>
          </select>
        </div>

        <div>
          <div className="flex justify-between items-end mb-2">
            <label className={`block text-xs font-bold uppercase tracking-wider ${themeStyles.mutedText}`}>
              Your Question
            </label>

            <span className={`text-xs ${question.length > 450 ? 'text-red-500' : themeStyles.mutedText}`}>
              {question.length} / 500
            </span>
          </div>

          <textarea
            required
            maxLength={500}
            rows={5}
            placeholder="Please provide as much detail as possible..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className={`w-full rounded-xl py-3 px-4 text-[15px] outline-none focus:ring-2 transition-all resize-none border ${themeStyles.inputBorder}`}
          />
        </div>

        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${themeStyles.mutedText}`}>
            Attachment Optional
          </label>

          <div className="flex items-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`px-4 py-2 rounded-lg text-sm font-medium border border-dashed transition-colors ${
                isCustomer
                  ? 'border-[#C4956A] text-[#C4956A] hover:bg-[#FBF6F0]'
                  : 'border-[#8DC63F] text-[#659923] hover:bg-[#8DC63F]/10'
              }`}
            >
              + Upload File
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,image/png,image/jpeg,image/jpg"
            />

            {file && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${themeStyles.filePill}`}>
                <span className="truncate max-w-[150px]">{file.name}</span>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="hover:text-red-500 ml-1"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <p className="text-[11px] text-gray-400 mt-2">
            Accepted formats: JPG, PNG, PDF. Max 5MB.
          </p>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !question.trim() || !name.trim() || !email.trim()}
            className={`px-8 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${themeStyles.buttonBg}`}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin text-lg leading-none">↻</span>
                Sending...
              </>
            ) : (
              'Submit Question'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}