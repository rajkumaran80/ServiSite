'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import facebookService from '../../services/facebook.service';
import type { MenuItem } from '../../types/menu.types';

interface FacebookPostModalProps {
  item: MenuItem;
  businessName: string;
  currency: string;
  hashtags?: string;
  siteUrl?: string;
  onClose: () => void;
}

export const FacebookPostModal: React.FC<FacebookPostModalProps> = ({
  item,
  businessName,
  currency,
  hashtags = '',
  siteUrl = '',
  onClose,
}) => {
  const [customNote, setCustomNote] = useState('');
  const [postText, setPostText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postedUrl, setPostedUrl] = useState<string | null>(null);

  const formatPrice = (price: number | string) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
    return `${symbol}${num.toFixed(2)}`;
  };

  const NOTE_EMOJIS = ['🔔', '⭐', '🎉', '✨', '🔥', '💫', '🎊', '🌟'];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const text = await facebookService.generatePostText({
        businessName,
        itemName: item.name,
        itemDescription: item.description ?? undefined,
        itemPrice: formatPrice(item.price),
        customNote: customNote.trim() || undefined,
      });

      // Prepend each comma-separated note as its own highlighted line
      const notes = customNote.trim()
        ? customNote.split(',').map((n) => n.trim()).filter(Boolean)
        : [];
      const noteLines = notes
        .map((note, i) => `${NOTE_EMOJIS[i % NOTE_EMOJIS.length]} ${note}`)
        .join('\n');

      // Append hashtags from settings
      const hashtagLine = hashtags.trim()
        ? hashtags.split(',').map((h) => {
            const clean = h.trim().replace(/^#*/, '');
            return clean ? `#${clean}` : '';
          }).filter(Boolean).join(' ')
        : '';

      const body = notes.length > 0 ? `${noteLines}\n\n${text}` : text;
      const tail = [hashtagLine, siteUrl.trim()].filter(Boolean).join('\n');
      setPostText(tail ? `${body}\n\n${tail}` : body);
    } catch {
      toast.error('Failed to generate post text');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePost = async () => {
    if (!postText.trim()) {
      toast.error('Add some post text first');
      return;
    }
    setIsPosting(true);
    try {
      const result = await facebookService.post(postText.trim(), item.imageUrl ?? undefined);
      setPostedUrl(result.postUrl);
      toast.success('Posted to Facebook!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to post to Facebook');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#1877F2' }}>
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 flex-1">Post to Facebook</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Item preview card */}
          <div className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">{item.name}</p>
              {item.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
              )}
              <p className="text-sm font-bold text-blue-600 mt-1">{formatPrice(item.price)}</p>
            </div>
          </div>

          {/* Custom note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Special note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Offer ends 20th June, New addition, Limited time only"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
              <span>💡</span> Separate multiple notes with commas — each will appear on its own line in the post
            </p>
          </div>

          {/* Generate + post text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">Post text</label>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <span className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>✨ Generate with AI</>
                )}
              </button>
            </div>
            <textarea
              rows={5}
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="Write your post here, or click 'Generate with AI' above…"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{postText.length} characters</p>
          </div>

          {/* Preview */}
          {postText && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Preview</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Mock FB post header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-white">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                    {businessName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{businessName}</p>
                    <p className="text-xs text-gray-400">Just now · 🌐</p>
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{postText}</p>
                </div>
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.name} className="w-full object-cover max-h-64" />
                )}
              </div>
            </div>
          )}

          {/* Success state — show post link */}
          {postedUrl && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
              <span className="text-xl">✅</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-800">Posted successfully!</p>
                <a
                  href={postedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-700 underline truncate block"
                >
                  {postedUrl}
                </a>
              </div>
              <a
                href={postedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 text-xs font-semibold text-white px-3 py-1.5 rounded-lg"
                style={{ background: '#1877F2' }}
              >
                View Post
              </a>
            </div>
          )}

          {/* Actions */}
          {!postedUrl && (
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePost}
                disabled={isPosting || !postText.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                style={{ background: '#1877F2' }}
              >
                {isPosting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Posting…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Post to Facebook
                  </>
                )}
              </button>
            </div>
          )}
          {postedUrl && (
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacebookPostModal;
