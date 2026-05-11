"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Mail, Shield, Phone, Calendar, Trash2, UserPlus, ShieldAlert, Loader2, X } from "lucide-react";

interface User {
  id: string;
  email: string;
  mobile: string;
  role: "super_admin" | "admin" | "moderator";
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newUser, setNewUser] = useState<{
    email: string;
    password: string;
    mobile: string;
    role: "admin" | "moderator";
  }>({
    email: "",
    password: "",
    mobile: "",
    role: "admin",
  });
  const [isAdding, setIsAdding] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteOtp, setDeleteOtp] = useState("");

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      setCurrentUserRole(parsedUser.role);
      if (parsedUser.role !== "super_admin" && parsedUser.role !== "owner") {
        router.push("/admin");
        return;
      }
    }

    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password) return;

    setIsAdding(true);
    setMessage(null);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ ...newUser, otpCode }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requireOtp) {
          setShowOtpInput(true);
          setMessage(data.message);
        } else {
          setUsers([...users, data.user]);
          setNewUser({ email: "", password: "", mobile: "", role: "admin" });
          setShowOtpInput(false);
          setOtpCode("");
          alert("User created successfully!");
        }
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to add user:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, otpCode?: string) => {
    if (!otpCode && !confirm("Are you sure you want to permanently delete this admin account?")) return;
    
    try {
      const url = `/api/users/${id}${otpCode ? `?otp=${otpCode}` : ''}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requireOtp) {
          setDeletingUserId(id);
          setMessage(data.message);
        } else {
          setUsers(users.filter((u) => u.id !== id));
          setDeletingUserId(null);
          setDeleteOtp("");
          alert("Account deleted successfully.");
        }
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("An unexpected error occurred during deletion.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Manage <span className="text-red-600">Admins</span></h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin access control and role management</p>
      </div>

      {/* Add User Form */}
      {(currentUserRole === "super_admin" || currentUserRole === "owner") && (
        <Card className="rounded-[2rem] border-none shadow-xl bg-white p-8 overflow-hidden relative group">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-red-50 rounded-2xl text-red-600">
               <UserPlus className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-gray-900 uppercase italic tracking-tight">
              Provision New Admin
            </h2>
          </div>

          <form onSubmit={handleAddUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Identity</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="admin@parle.com"
                    className="bg-gray-50 border-none rounded-2xl h-12 pl-12 text-[12px] font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <Input
                    type="text"
                    value={newUser.mobile}
                    onChange={(e) => setNewUser({ ...newUser, mobile: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    className="bg-gray-50 border-none rounded-2xl h-12 pl-12 text-[12px] font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Security Key</label>
                <div className="relative">
                  <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••"
                    className="bg-gray-50 border-none rounded-2xl h-12 pl-12 text-[12px] font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Authorization Level</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "admin" | "moderator" })}
                    className="w-full h-12 pl-12 pr-4 bg-gray-50 border-none rounded-2xl text-[12px] font-black uppercase appearance-none focus:ring-2 focus:ring-red-600/10"
                  >
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                  </select>
                </div>
              </div>
            </div>

            {showOtpInput && (
              <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 animate-in fade-in slide-in-from-top-4">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4 italic flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  {message || "Security Verification Required"}
                </p>
                <div className="flex gap-4">
                  <Input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="ENTER CODE"
                    className="max-w-[200px] h-14 font-black tracking-[0.5em] text-center text-xl bg-white border-none rounded-2xl shadow-sm"
                    maxLength={6}
                    required
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => { setShowOtpInput(false); setOtpCode(""); }}
                    className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button 
                type="submit" 
                disabled={isAdding}
                className="bg-red-600 hover:bg-gray-900 text-white rounded-2xl px-10 h-14 font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-red-100 transition-all"
              >
                {isAdding ? "Synchronizing..." : "Create Identity"}
              </Button>
            </div>
          </form>
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-[60px] pointer-events-none" />
        </Card>
      )}

      {/* Users List */}
      <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Admin Identity</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Info</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Auth Level</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Registered</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                         <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                            <Mail className="w-4 h-4" />
                         </div>
                         <span className="text-sm font-black text-gray-900 lowercase tracking-tight">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3 text-gray-600">
                         <Phone className="w-3.5 h-3.5 text-gray-300" />
                         <span className="text-[12px] font-bold tabular-nums tracking-tighter">{user.mobile || "N/A"}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        user.role === 'super_admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {user.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-gray-400">
                         <Calendar className="w-3.5 h-3.5" />
                         <span className="text-[10px] font-black uppercase tracking-widest">{new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      {(currentUserRole === "super_admin" || currentUserRole === "owner") && (
                        <div className="flex justify-end">
                          {deletingUserId === user.id ? (
                            <div className="flex items-center gap-2 bg-red-50 p-2 rounded-2xl border border-red-100 animate-in zoom-in">
                              <Input
                                type="text"
                                placeholder="OTP"
                                value={deleteOtp}
                                onChange={(e) => setDeleteOtp(e.target.value)}
                                className="w-20 h-9 text-center font-black tracking-widest text-xs border-none"
                                maxLength={6}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleDelete(user.id, deleteOtp)}
                                className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase h-9 px-4 rounded-xl"
                              >
                                Verify
                              </Button>
                              <button onClick={() => { setDeletingUserId(null); setDeleteOtp(""); }} className="p-2 text-gray-300 hover:text-gray-900"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(user.id)}
                              className="text-gray-300 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Shield className="w-12 h-12 text-gray-100 mx-auto mb-4" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Secure database empty. Provision identities above.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
