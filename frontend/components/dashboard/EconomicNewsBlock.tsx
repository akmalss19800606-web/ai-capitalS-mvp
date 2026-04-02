'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateRu } from '@/lib/formatters';

interface NewsArticle {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  source_url: string;
  published_at: string | null;
  category: string;
}

const SOURCE_ICONS: Record<string, string> = {
  'cbu.uz': '🏦',
  'stat.uz': '📊',
  'mf.uz': '💰',
  'worldbank': '🌍',
  'imf': '🌐',
  'gazeta.uz': '📰',
};

const SOURCE_COLORS: Record<string, string> = {
  'cbu.uz': 'bg-blue-100 text-blue-800',
  'stat.uz': 'bg-purple-100 text-purple-800',
  'mf.uz': 'bg-green-100 text-green-800',
  'worldbank': 'bg-amber-100 text-amber-800',
  'imf': 'bg-cyan-100 text-cyan-800',
  'gazeta.uz': 'bg-rose-100 text-rose-800',
};

const CATEGORY_LABELS: Record<string, string> = {
  monetary_policy: 'Монетарная политика',
  statistics: 'Статистика',
  fiscal: 'Бюджет и налоги',
  development: 'Развитие',
  global: 'Мировая экономика',
  local: 'Местные новости',
  finance: 'Финансы',
};

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface EconomicNewsBlockProps {
  className?: string;
}

export default function EconomicNewsBlock({ className = '' }: EconomicNewsBlockProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/v1/dashboard/news?limit=8`, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setArticles(data.articles || []);
      setError(null);
    } catch {
      setError('Ошибка загрузки новостей');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetch(`${API}/api/v1/dashboard/news/refresh`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      });
      setTimeout(() => {
        fetchNews();
        setRefreshing(false);
      }, 3000);
    } catch {
      setRefreshing(false);
    }
  }, [fetchNews]);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 1800000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  return (
    <div className={`bg-white rounded-2xl shadow p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 flex items-center gap-2">
          <span className="text-lg">📰</span>
          Экономические новости
        </h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          <span className={refreshing ? 'animate-spin inline-block' : ''}>↻</span>
          {refreshing ? 'Обновление...' : 'Обновить'}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2].map(i => (
            <LoadingCard key={i} rows={4} />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <EmptyState
          icon="⚠️"
          title={error}
          description="Попробуйте обновить позже"
          action={{ label: 'Повторить', onClick: fetchNews }}
        />
      )}

      {/* Empty */}
      {!loading && !error && articles.length === 0 && (
        <EmptyState
          icon="📰"
          title="Новости временно недоступны"
          description="Новости появятся после обновления RSS"
          action={{ label: 'Обновить', onClick: handleRefresh }}
        />
      )}

      {/* News cards */}
      {!loading && !error && articles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {articles.map(article => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewsCard({ article }: { article: NewsArticle }) {
  const icon = SOURCE_ICONS[article.source] || '📄';
  const badgeColor = SOURCE_COLORS[article.source] || 'bg-gray-100 text-gray-800';
  const categoryLabel = CATEGORY_LABELS[article.category] || article.category;

  return (
    <div className="group flex flex-col bg-gray-50 rounded-xl p-4 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-200">
      {/* Source & Category */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
          {article.source}
        </span>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {categoryLabel}
        </span>
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 leading-snug">
        {article.title}
      </h4>

      {/* Summary */}
      {article.summary && (
        <p className="text-xs text-gray-500 line-clamp-3 mb-3 leading-relaxed flex-1">
          {article.summary}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {formatDateRu(article.published_at, { format: 'short' })}
        </span>
        {article.source_url && (
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Читать →
          </a>
        )}
      </div>
    </div>
  );
}
