import React from 'react';
import { CustomPieceConfig, CostBreakdown, METAL_LABELS } from '../types/jewelry';
import { Bookmark, ArrowRight, Trash2, X, Calendar, User } from 'lucide-react';

export interface SavedQuoteRecord {
  id: string;
  quoteNumber: string;
  savedAt: string;
  config: CustomPieceConfig;
  retailPrice: number;
}

interface Props {
  savedQuotes: SavedQuoteRecord[];
  onLoadQuote: (quote: SavedQuoteRecord) => void;
  onDeleteQuote: (id: string) => void;
  onClose: () => void;
}

export const SavedQuotesModal: React.FC<Props> = ({
  savedQuotes,
  onLoadQuote,
  onDeleteQuote,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white font-display">Saved Counter Quotes</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quotes List */}
        <div className="overflow-y-auto py-4 flex-1 space-y-3">
          {savedQuotes.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No saved quotes yet.</p>
              <p className="text-xs mt-1">
                Click &quot;Save Customer Quote&quot; on any quote to store it for when the customer returns.
              </p>
            </div>
          ) : (
            savedQuotes.map((q) => (
              <div
                key={q.id}
                className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {q.quoteNumber}
                    </span>
                    <span className="text-neutral-600">·</span>
                    <span className="text-xs text-neutral-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {q.savedAt}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white mt-1">
                    {q.config.title || "Custom Pendant"}
                  </h4>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mt-1">
                    {q.config.customerName && (
                      <span className="flex items-center gap-1 text-neutral-300">
                        <User className="w-3 h-3 text-neutral-500" />
                        {q.config.customerName}
                      </span>
                    )}
                    <span>·</span>
                    <span>{METAL_LABELS[q.config.metal]}</span>
                    <span>·</span>
                    <span>{q.config.heightInches}&quot; × {q.config.widthInches}&quot;</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800">
                  <span className="text-base font-bold font-mono text-white">
                    ${q.retailPrice.toLocaleString()}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onLoadQuote(q)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-neutral-950 font-semibold text-xs transition-colors flex items-center gap-1"
                    >
                      <span>Load</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteQuote(q.id)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-900 transition-colors"
                      title="Delete Quote"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
