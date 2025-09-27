import React from 'react';
import type { NewsItem } from '../types/news';

interface TranslationModalProps {
  isOpen: boolean;
  newsItem: NewsItem | null;
  onClose: () => void;
  onOpenOriginal: () => void;
  onOpenTranslated: () => void;
}

const TranslationModal: React.FC<TranslationModalProps> = ({
  isOpen,
  newsItem,
  onClose,
  onOpenOriginal,
  onOpenTranslated
}) => {
  if (!isOpen || !newsItem) return null;

  const hasTranslation = newsItem.originalTitle || newsItem.originalDescription;

  const handleOriginalClick = () => {
    onOpenOriginal();
    onClose();
  };

  const handleTranslatedClick = () => {
    onOpenTranslated();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="translation-modal-backdrop" onClick={handleBackdropClick}>
      <div className="translation-modal">
        <div className="translation-modal-header">
          <h3>記事の表示方法を選択</h3>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="translation-modal-content">
          <div className="article-preview">
            <h4 className="article-title-preview">
              {newsItem.title}
            </h4>
            <p className="article-source-preview">
              {newsItem.source} - {newsItem.category}
            </p>
          </div>

          <div className="translation-options">
            <button
              className="translation-option-btn original"
              onClick={handleOriginalClick}
            >
              <div className="option-icon">🌐</div>
              <div className="option-content">
                <div className="option-title">原文で読む</div>
                <div className="option-description">
                  元の言語（英語）で記事を表示
                </div>
              </div>
            </button>

            {hasTranslation && (
              <button
                className="translation-option-btn translated"
                onClick={handleTranslatedClick}
              >
                <div className="option-icon">🇯🇵</div>
                <div className="option-content">
                  <div className="option-title">翻訳ツールで読む</div>
                  <div className="option-description">
                    外部翻訳サービスで記事を開く
                    <br />
                    <small>※ ブラウザの翻訳機能もご利用いただけます</small>
                  </div>
                </div>
              </button>
            )}

            {!hasTranslation && (
              <div className="no-translation-notice">
                <span className="notice-icon">ℹ️</span>
                <span>この記事は既に日本語です</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <p className="translation-note">
              ※ 翻訳は自動生成のため、内容の正確性は原文をご確認ください
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationModal;