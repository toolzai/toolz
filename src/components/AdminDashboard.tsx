'use client';

import { useState, useEffect, useMemo } from 'react';
import { LogOut, Search, Filter, Calendar, Mail, User, ChevronLeft, ChevronRight } from 'lucide-react';

interface Suggestion {
  _id: string;
  feedback: string;
  name: string;
  email: string | null;
  tools: string[];
  createdAt: string;
}

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [data, setData] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState('All');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Inactivity Timeout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // Set to 180 seconds (3 minutes) as requested
      timeoutId = setTimeout(() => {
        handleLogout();
      }, 180 * 1000); 
    };

    // Listen for common activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer, true));

    // Initialize timer
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer, true));
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/forabook/data');
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch data');

      const json = await res.json();
      setData(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      onLogout();
    } catch (err) {
      console.error(err);
    }
  };

  // Get unique tools for filter dropdown
  const allTools = useMemo(() => {
    const tools = new Set<string>();
    data.forEach(item => {
      item.tools?.forEach(t => tools.add(t));
    });
    return ['All', ...Array.from(tools).sort()];
  }, [data]);

  // Apply filters
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.email && item.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.feedback.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTool = selectedTool === 'All' || (item.tools && item.tools.includes(selectedTool));

      return matchesSearch && matchesTool;
    });
  }, [data, searchQuery, selectedTool]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTool]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="animate-pulse flex items-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          <div className="w-2 h-2 bg-white rounded-full"></div>
          <div className="w-2 h-2 bg-white rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-zinc-800 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">System Logs</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Showing {filteredData.length} records
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors text-sm w-full md:w-auto"
          >
            <LogOut size={16} />
            Exit
          </button>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Filters Section */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search by name, email, or feedback..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
            />
          </div>
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <select
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all cursor-pointer"
            >
              {allTools.map(tool => (
                <option key={tool} value={tool}>{tool === 'All' ? 'Filter by Tool' : tool}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cards Grid */}
        {filteredData.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800">
            No entries match your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedData.map((item) => (
              <div key={item._id} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 flex flex-col hover:border-zinc-700 transition-colors group shadow-lg shadow-black/20">
                
                {/* Header: User Info & Date */}
                <div className="flex justify-between items-start mb-4 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-zinc-200 font-medium truncate">
                      <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.email && (
                      <div className="flex items-center gap-2 text-zinc-500 text-xs mt-1 truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{item.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body: Feedback Text */}
                <div className="flex-1 mb-4">
                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap line-clamp-6 group-hover:line-clamp-none transition-all duration-300">
                    {item.feedback}
                  </p>
                </div>

                {/* Footer: Tools & Timestamp */}
                <div className="mt-auto pt-4 border-t border-zinc-800/50">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.tools?.length > 0 ? (
                      item.tools.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-green-500/10 text-green-400/90 rounded border border-green-500/20 text-[10px] font-medium whitespace-nowrap"
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-600 text-xs italic">No tools selected</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-zinc-800">
            <span className="text-zinc-500 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-300" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-zinc-300" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
