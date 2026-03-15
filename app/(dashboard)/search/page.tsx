'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { AlumniProfile } from '@/types';
import { searchAlumni } from '@/services/alumniService';
import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Search, GraduationCap, Linkedin } from 'lucide-react';
import Image from 'next/image';
import { avatarUrl } from '@/lib/utils';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AlumniProfile[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const data = await searchAlumni(query.trim());
    setResults(data);
    setSearched(true);
    setLoading(false);
  };

  return (
    <>
      <Header title="Search Alumni" userName="Alumni" />
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-base pl-10"
              placeholder="Search by name, NIM, or study program..."
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800 transition"
          >
            {loading ? '...' : 'Search'}
          </button>
        </form>

        {searched && (
          <p className="text-sm text-gray-500">{results.length} result(s) for "{query}"</p>
        )}

        <div className="grid gap-4">
          {results.map(alumni => (
            <Card key={alumni.id} className="flex items-center gap-4">
              <Image
                src={avatarUrl(alumni.full_name, alumni.photo_url)}
                alt={alumni.full_name}
                width={56}
                height={56}
                className="rounded-xl flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{alumni.full_name}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {alumni.study_program} · Class of {alumni.graduation_year}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">NIM: {alumni.nim}</p>
              </div>
              {alumni.linkedin_url && (
                <a
                  href={alumni.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
            </Card>
          ))}
          {searched && results.length === 0 && (
            <Card>
              <p className="text-center text-gray-400 py-6">No alumni found matching "{query}"</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
