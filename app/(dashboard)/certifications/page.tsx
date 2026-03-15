'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SkillCertification } from '@/types';
import { getAlumniProfile, getCertifications, addCertification, deleteCertification } from '@/services/alumniService';
import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import CertificationForm from '@/components/forms/CertificationForm';
import toast from 'react-hot-toast';
import { Plus, Trash2, Award, Building } from 'lucide-react';

export default function CertificationsPage() {
  const [certs, setCerts] = useState<SkillCertification[]>([]);
  const [alumniId, setAlumniId] = useState('');
  const [userName, setUserName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const profile = await getAlumniProfile(user.id);
      if (!profile) return;
      setAlumniId(profile.id);
      setUserName(profile.full_name);
      setCerts(await getCertifications(profile.id));
    };
    load();
  }, []);

  const handleAdd = async (data: Partial<SkillCertification>) => {
    setLoading(true);
    try {
      const newCert = await addCertification(alumniId, data);
      setCerts(prev => [newCert, ...prev]);
      setShowModal(false);
      toast.success('Certification added!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this certification?')) return;
    try {
      await deleteCertification(id);
      setCerts(prev => prev.filter(c => c.id !== id));
      toast.success('Certification deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <>
      <Header title="Certifications" userName={userName} />
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-500 text-sm">{certs.length} certification(s)</p>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-1" />Add Certification
          </Button>
        </div>

        {certs.length === 0 ? (
          <Card>
            <p className="text-center text-gray-400 py-8">No certifications added yet.</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {certs.map(cert => (
              <Card key={cert.id} className="flex items-start justify-between gap-4">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{cert.certificate_name}</h3>
                    <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                      <Building className="w-3.5 h-3.5" /> {cert.issuer}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Year: {cert.year}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(cert.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Certification">
        <CertificationForm onSubmit={handleAdd} loading={loading} />
      </Modal>
    </>
  );
}
