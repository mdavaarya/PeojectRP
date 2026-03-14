'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AlumniProfile } from '@/types';
import { getAlumniProfile, upsertAlumniProfile } from '@/services/alumniService';
import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import ProfileForm from '@/components/forms/ProfileForm';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { avatarUrl } from '@/lib/utils';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Partial<AlumniProfile>>({});
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const p = await getAlumniProfile(user.id);
      if (p) {
        setProfile(p);
        setUserName(p.full_name);
      }
    };
    load();
  }, []);

  const handleSubmit = async (data: Partial<AlumniProfile>) => {
    setLoading(true);
    try {
      const updated = await upsertAlumniProfile(userId, data);
      setProfile(updated);
      setUserName(updated.full_name);
      toast.success('Profile saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="My Profile" userName={userName || 'Alumni'} userPhoto={profile.photo_url} />
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <Card>
          <div className="flex items-center gap-5">
            <Image
              src={avatarUrl(userName || 'Alumni', profile.photo_url)}
              alt="Profile"
              width={80}
              height={80}
              className="rounded-2xl"
            />
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {profile.full_name || 'Set up your profile'}
              </h2>
              {profile.study_program && (
                <p className="text-gray-500 text-sm">
                  {profile.study_program} · Class of {profile.graduation_year}
                </p>
              )}
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 text-sm hover:underline"
                >
                  LinkedIn Profile →
                </a>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-800 mb-5">Profile Information</h3>
          <ProfileForm profile={profile} onSubmit={handleSubmit} loading={loading} />
        </Card>
      </div>
    </>
  );
}
