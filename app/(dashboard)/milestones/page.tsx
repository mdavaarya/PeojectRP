'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CareerMilestone } from '@/types';
import { getAlumniProfile, getCareerMilestones, addCareerMilestone, updateMilestoneStatus } from '@/services/alumniService';
import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import MilestoneValidationCard from '@/components/MilestoneValidationCard';
import MilestoneForm from '@/components/forms/MilestoneForm';
import toast from 'react-hot-toast';
import { Plus, AlertCircle } from 'lucide-react';

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<CareerMilestone[]>([]);
  const [alumniId, setAlumniId] = useState('');
  const [userName, setUserName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const profile = await getAlumniProfile(user.id);
      if (!profile) return;
      setAlumniId(profile.id);
      setUserName(profile.full_name);
      const data = await getCareerMilestones(profile.id);
      setMilestones(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleAdd = async (data: Partial<CareerMilestone>) => {
    setSubmitting(true);
    try {
      const newMs = await addCareerMilestone(alumniId, data);
      setMilestones(prev => [newMs, ...prev]);
      setShowModal(false);
      toast.success('Milestone submitted for validation!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await updateMilestoneStatus(id, 'verified');
      setMilestones(prev => prev.map(m => m.id === id ? { ...m, verification_status: 'verified' } : m));
      toast.success('Milestone confirmed and verified!');
    } catch {
      toast.error('Failed to confirm milestone');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateMilestoneStatus(id, 'rejected');
      setMilestones(prev => prev.map(m => m.id === id ? { ...m, verification_status: 'rejected' } : m));
      toast.success('Milestone rejected');
    } catch {
      toast.error('Failed to reject milestone');
    }
  };

  const pending = milestones.filter(m => m.verification_status === 'pending');
  const others = milestones.filter(m => m.verification_status !== 'pending');

  return (
    <>
      <Header title="Career Milestones" userName={userName} pendingCount={pending.length} />
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <div className="flex justify-between items-center">
          <p className="text-gray-500 text-sm">{milestones.length} total milestone(s)</p>
          <Button onClick={() => setShowModal(true)} size="md">
            <Plus className="w-4 h-4 mr-1" /> Add Milestone
          </Button>
        </div>

        {pending.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-800">Awaiting Your Confirmation ({pending.length})</h3>
            </div>
            <div className="space-y-3">
              {pending.map(m => (
                <MilestoneValidationCard
                  key={m.id}
                  milestone={m}
                  onConfirm={handleConfirm}
                  onReject={handleReject}
                  isAlumniView
                />
              ))}
            </div>
          </Card>
        )}

        {loading ? (
          <Card><p className="text-center text-gray-400 py-6">Loading milestones...</p></Card>
        ) : others.length === 0 && pending.length === 0 ? (
          <Card>
            <p className="text-center text-gray-400 py-8">No milestones yet. Add your first career milestone!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {others.map(m => (
              <MilestoneValidationCard key={m.id} milestone={m} isAlumniView />
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Career Milestone">
        <MilestoneForm onSubmit={handleAdd} loading={submitting} />
      </Modal>
    </>
  );
}
