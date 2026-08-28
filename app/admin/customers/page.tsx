'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, Plus, Trash2, Edit2, CheckSquare, X, Search, Loader2, AlertCircle, RefreshCw,
  Phone, UserCheck
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  created_at: string;
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [usingMock, setUsingMock] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempPhone, setTempPhone] = useState('');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const isUrlConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      
      if (!isUrlConfigured) {
        throw new Error('Supabase environment variables not configured');
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
      setUsingMock(false);
    } catch (err) {
      console.warn('Could not fetch customers from database. Loading localStorage database.', err);
      const localData = JSON.parse(localStorage.getItem('tayba_customers') || '[]');
      if (localData.length === 0) {
        const seed = [
          { id: 'c1', name: 'أبو أحمد الشامي', phone: '05350000001', created_at: new Date().toISOString() },
          { id: 'c2', name: 'عائلة الكردي', phone: '05350000002', created_at: new Date().toISOString() },
          { id: 'c3', name: 'محمود الحلبي', phone: '05350000003', created_at: new Date().toISOString() }
        ];
        localStorage.setItem('tayba_customers', JSON.stringify(seed));
        setCustomers(seed);
      } else {
        setCustomers(localData);
      }
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    if (!cleanName) return;

    if (customers.some(c => c.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      alert('اسم الزبون هذا موجود بالفعل في القائمة.');
      return;
    }

    setIsUpdating(true);
    try {
      if (!usingMock) {
        const { data, error } = await supabase
          .from('customers')
          .insert({ 
            name: cleanName,
            phone: newPhone.trim() || null
          })
          .select();

        if (error) throw error;
        if (data && data[0]) {
          setCustomers(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name, 'ar')));
        }
      } else {
        const newCust: Customer = {
          id: 'local-' + Date.now(),
          name: cleanName,
          phone: newPhone.trim() || null,
          created_at: new Date().toISOString()
        };
        const updated = [...customers, newCust].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        localStorage.setItem('tayba_customers', JSON.stringify(updated));
        setCustomers(updated);
      }
      setNewName('');
      setNewPhone('');
      alert('تم إضافة الزبون بنجاح!');
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء إضافة الزبون.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditCustomer = async (id: string) => {
    const cleanName = tempName.trim();
    if (!cleanName) return;

    setIsUpdating(true);
    try {
      if (!usingMock) {
        const { error } = await supabase
          .from('customers')
          .update({ name: cleanName, phone: tempPhone.trim() || null })
          .eq('id', id);

        if (error) throw error;
      } else {
        const updated = customers.map(c => c.id === id ? { ...c, name: cleanName, phone: tempPhone.trim() || null } : c);
        localStorage.setItem('tayba_customers', JSON.stringify(updated));
      }

      setCustomers(prev => prev.map(c => c.id === id ? { ...c, name: cleanName, phone: tempPhone.trim() || null } : c));
      setEditingId(null);
    } catch (err: any) {
      alert('حدث خطأ أثناء تعديل بيانات الزبون.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    const confirmAction = window.confirm(`هل أنت متأكد من حذف الزبون "${name}" نهائياً من الدليل؟`);
    if (!confirmAction) return;

    setIsUpdating(true);
    try {
      if (!usingMock) {
        const { error } = await supabase
          .from('customers')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } else {
        const updated = customers.filter(c => c.id !== id);
        localStorage.setItem('tayba_customers', JSON.stringify(updated));
      }

      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert('حدث خطأ أثناء حذف الزبون.');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery))
  );

  return (
    <div className="space-y-6 font-sans text-right" dir="rtl">
      {/* Offline Banner */}
      {usingMock && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
          <span>وضع العرض التجريبي لدليل الزبائن نشط. يتم الحفظ محلياً.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">دليل الزبائن</h1>
          <p className="text-xs text-slate-500 mt-1">سجل بأسماء زبائن الماركت وأرقام هواتفهم لتسهيل المتابعة وإكمال الفواتير</p>
        </div>
        <button
          onClick={fetchCustomers}
          disabled={loading}
          className="p-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Add Customer */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Users className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-800">إضافة زبون جديد</h2>
          </div>
          
          <form onSubmit={handleAddCustomer} className="space-y-3.5">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600">اسم الزبون / العائلة</label>
              <input
                type="text"
                placeholder="مثال: أبو أحمد، أم النور..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-250 outline-none rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E] transition-all font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600">رقم الهاتف (اختياري)</label>
              <input
                type="tel"
                placeholder="05xxxxxxxx"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-250 outline-none rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E] transition-all ltr"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdating || !newName.trim()}
              className="w-full bg-[#075E54] hover:bg-[#128C7E] disabled:bg-slate-250 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isUpdating ? 'جاري الحفظ...' : 'حفظ في الدليل'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Manage Customers List */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-800">قائمة الزبائن المسجلين ({customers.length})</h2>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو الرقم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-250 outline-none rounded-xl pr-9 pl-4 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E] transition-all"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-xs font-bold">جاري تحميل دليل الزبائن...</p>
            </div>
          ) : filteredCustomers.length > 0 ? (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {filteredCustomers.map((cust) => {
                return (
                  <div key={cust.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {editingId === cust.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          placeholder="الاسم"
                          className="flex-1 bg-white border border-slate-300 outline-none rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={tempPhone}
                          onChange={(e) => setTempPhone(e.target.value)}
                          placeholder="الهاتف"
                          className="w-32 bg-white border border-slate-300 outline-none rounded-xl px-3 py-1.5 text-xs text-slate-800 ltr"
                        />
                        <button
                          onClick={() => handleEditCustomer(cust.id)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl"
                          title="حفظ"
                        >
                          <CheckSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"
                          title="إلغاء"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800">{cust.name}</span>
                          </div>
                          {cust.phone && (
                            <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1 ltr justify-end">
                              <span>{cust.phone}</span>
                              <Phone className="w-3 h-3 text-slate-400 inline" />
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {/* Edit */}
                          <button
                            onClick={() => {
                              setEditingId(cust.id);
                              setTempName(cust.name);
                              setTempPhone(cust.phone || '');
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="تعديل البيانات"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف من الدليل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-xs font-bold text-slate-700">لا يوجد زبائن مطابقين</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
