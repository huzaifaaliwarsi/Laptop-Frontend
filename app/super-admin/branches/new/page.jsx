'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../components/common/Toast';
import api from '../../../../services/api';
import {
  Building2,
  PlusCircle,
  ArrowLeft,
  AlertTriangle,
  UserCheck,
  Wallet,
  MapPin,
  Phone,
  Mail,
  Lock
} from 'lucide-react';

export default function NewBranchPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [isMaxReached, setIsMaxReached] = useState(false);

  // Form State
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('BR-02');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Admin Credentials
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('admin2');
  const [adminPassword, setAdminPassword] = useState('');

  // Opening Balances
  const [openingCash, setOpeningCash] = useState('0');
  const [openingOnline, setOpeningOnline] = useState('0');

  // Verify Role
  useEffect(() => {
    if (role && role !== 'super_admin') {
      toast('Access restricted to Platform Super Admin.', 'error');
      router.push('/');
    }
  }, [role, router, toast]);

  // Load Existing Branch Count
  useEffect(() => {
    if (role === 'super_admin') {
      setLoading(true);
      api.get('/super-admin/reports/consolidated')
        .then(res => {
          if (res.success && res.data) {
            const count = (res.data.branches || []).length;
            setIsMaxReached(count >= 2);
          }
        })
        .catch(err => {
          toast(err.message || 'Error checking branch capacity', 'error');
        })
        .finally(() => setLoading(false));
    }
  }, [role, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!branchName.trim()) {
      toast('Branch Name is required.', 'error');
      return;
    }
    if (!adminUsername.trim()) {
      toast('Branch Admin Username is required.', 'error');
      return;
    }
    if (!adminPassword || adminPassword.length < 6) {
      toast('Branch Admin Password must be at least 6 characters.', 'error');
      return;
    }

    setProvisioning(true);
    try {
      const payload = {
        branchName: branchName.trim(),
        branchCode: branchCode.trim().toUpperCase() || 'BR-02',
        city: city.trim() || 'Karachi',
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        adminName: adminName.trim() || 'Branch Manager',
        adminUsername: adminUsername.trim().toLowerCase(),
        adminPassword: adminPassword.trim(),
        adminContact: phone.trim() || '',
        openingCash: parseFloat(openingCash || 0),
        openingOnline: parseFloat(openingOnline || 0)
      };

      const res = await api.post('/super-admin/branches/provision', payload);
      if (res.success) {
        toast('Branch 2 created and provisioned successfully!', 'success');
        router.push('/super-admin?tab=branches');
      }
    } catch (err) {
      toast(err.message || 'Branch provisioning failed.', 'error');
    } finally {
      setProvisioning(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500">
        <div className="loader loader-lg mx-auto mb-3"></div>
        <p className="text-xs font-semibold m-0">Checking branch limit...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Top Header */}
      <div className="flex justify-between items-center">
        <Link
          href="/super-admin?tab=branches"
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
        >
          <ArrowLeft size={13} />
          <span>Back to Branch List</span>
        </Link>
        <span className="badge primary text-2xs">Branch 2 Setup</span>
      </div>

      {/* When Max Branches Limit Reached */}
      {isMaxReached ? (
        <div className="panel p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 grid place-items-center mx-auto">
            <AlertTriangle size={24} />
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900 m-0">
              Maximum Branch Limit Reached
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Maximum branch limit reached. Only 2 branches are allowed on this system. Both branch databases are already active.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/super-admin?tab=branches"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 inline-flex items-center gap-1.5"
            >
              Return to Branch List
            </Link>
          </div>
        </div>
      ) : (
        /* SIMPLE, CLEAN & BEAUTIFUL SINGLE FORM */
        <form onSubmit={handleSubmit} className="panel p-6 space-y-5">

          <div>
            <h2 className="text-lg font-bold text-slate-900 m-0">Open New Branch</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter branch and manager information to create and provision Branch 2.
            </p>
          </div>

          {/* Business Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Building2 size={14} className="text-blue-600" />
              <span>1. Branch Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Branch Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Saddar Branch"
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Branch Code *</label>
                <input
                  className="input font-bold tracking-wider"
                  value={branchCode}
                  onChange={e => setBranchCode(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">City</label>
                <input
                  className="input"
                  placeholder="e.g. Karachi"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Contact Phone</label>
                <input
                  className="input"
                  placeholder="e.g. 0300-1234567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                <input
                  className="input"
                  type="email"
                  placeholder="branch2@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Physical Address</label>
                <input
                  className="input"
                  placeholder="Shop #, Plaza address..."
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Admin Credentials */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <UserCheck size={14} className="text-indigo-600" />
              <span>2. Branch Admin Account</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Manager Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Asim Khan"
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Admin Username *</label>
                <input
                  className="input"
                  placeholder="admin2"
                  value={adminUsername}
                  onChange={e => setAdminUsername(e.target.value.toLowerCase())}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Password * (Min 6 chars)</label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>
          </div>

          {/* Opening Balances */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Wallet size={14} className="text-emerald-600" />
              <span>3. Opening Balances (Optional)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Opening Cash (PKR)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={openingCash}
                  onChange={e => setOpeningCash(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Opening Bank Balance (PKR)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={openingOnline}
                  onChange={e => setOpeningOnline(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-100">
            <Link
              href="/super-admin?tab=branches"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 inline-flex items-center gap-1.5 cursor-pointer transition-all"
              disabled={provisioning}
            >
              {provisioning ? (
                <>
                  <div className="loader loader-xs"></div>
                  <span>Creating Branch...</span>
                </>
              ) : (
                <>
                  <PlusCircle size={14} />
                  <span>Create & Provision Branch 2</span>
                </>
              )}
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
