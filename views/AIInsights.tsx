
import React, { useState, useEffect } from 'react';
import { getAIInsights } from '../geminiService';
import { Card, Button } from '../components/Shared';

export const AIInsights: React.FC = () => {
  const [insights, setInsights] = useState<{ title: string; description: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    const data = await getAIInsights();
    setInsights(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Business Consultant</h2>
          <p className="text-sm text-gray-500">Actionable intelligence powered by Gemini AI</p>
        </div>
        <Button onClick={fetchInsights} disabled={loading}>
          {loading ? 'Analyzing...' : 'Refresh Insights'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          [1,2,3,4].map(i => (
            <Card key={i} className="p-8 animate-pulse">
              <div className="h-6 w-1/3 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 w-full bg-gray-100 rounded mb-2"></div>
              <div className="h-4 w-5/6 bg-gray-100 rounded"></div>
            </Card>
          ))
        ) : (
          insights.map((insight, i) => (
            <Card key={i} className="p-8 hover:border-indigo-300 transition-colors border-l-4 border-l-[#24C002]">
              <h4 className="text-lg font-bold text-gray-900 mb-2">{insight.title}</h4>
              <p className="text-gray-600 leading-relaxed text-sm">{insight.description}</p>
            </Card>
          ))
        )}
      </div>

      <Card className="p-6 bg-indigo-900 text-white mt-8">
        <div className="flex items-center gap-6">
          <div className="text-4xl">💡</div>
          <div>
            <h4 className="text-lg font-bold mb-1">Pro Tip</h4>
            <p className="text-indigo-200 text-sm">
              AI analysis is most effective when you have at least 30 days of booking history. 
              The more data you record, the more accurate the seasonal predictions will be.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
