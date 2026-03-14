'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { FileDown, FileText, BarChart3 } from 'lucide-react';

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(false);

  const downloadReport = async (type: 'alumni' | 'milestones' | 'certifications') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?type=${type}`);
      if (!res.ok) throw new Error('Failed to generate report');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `silumni_${type}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${type} report downloaded!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reports = [
    {
      type: 'alumni' as const,
      title: 'Alumni Master Data',
      description: 'Full list of alumni with profile details, study program, and graduation year.',
      icon: <FileText className="w-6 h-6 text-primary-600" />,
    },
    {
      type: 'milestones' as const,
      title: 'Career Milestones Report',
      description: 'All career milestones with verification status, company, and position details.',
      icon: <BarChart3 className="w-6 h-6 text-green-600" />,
    },
    {
      type: 'certifications' as const,
      title: 'Certifications Report',
      description: 'All alumni certifications and skills for professional development tracking.',
      icon: <FileDown className="w-6 h-6 text-purple-600" />,
    },
  ];

  return (
    <>
      <Header title="Reports & Export" userName="Administrator" />
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <Card className="bg-primary-50 border-primary-200">
          <h3 className="font-semibold text-primary-900">Accreditation Report Export</h3>
          <p className="text-sm text-primary-700 mt-1">
            Generate CSV reports for university accreditation purposes. All data is exported in a
            structured format ready for submission.
          </p>
        </Card>

        <div className="space-y-4">
          {reports.map(report => (
            <Card key={report.type} className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  {report.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{report.title}</h4>
                  <p className="text-sm text-gray-500 mt-0.5">{report.description}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => downloadReport(report.type)}
                loading={loading}
                className="flex-shrink-0"
              >
                <FileDown className="w-4 h-4 mr-1.5" /> Export CSV
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
