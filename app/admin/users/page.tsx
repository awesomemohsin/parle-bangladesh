"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
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
    role: "admin" | "moderator";
  }>({
    email: "",
    password: "",
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
    const user = localStorage.getItem("user");
    if (user) {
      const parsedUser = JSON.parse(user);
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
          setNewUser({ email: "", password: "", role: "admin" });
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
    if (!otpCode && !confirm("Are you sure you want to permanently delete this administrative account?")) return;
    
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
        <div className="text-gray-600">Loading users...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">User Management</h1>

      {/* Add User Form */}
      {(currentUserRole === "super_admin" || currentUserRole === "owner") && (
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Add New User
          </h2>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      role: e.target.value as "admin" | "moderator",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>
            </div>

            {showOtpInput && (
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3 italic">
                  {message || "Security Verification Required"}
                </p>
                <div className="flex gap-4">
                  <Input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="ENTER 6-DIGIT CODE"
                    className="max-w-[200px] font-black tracking-[0.3em] uppercase"
                    maxLength={6}
                    required
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => { setShowOtpInput(false); setOtpCode(""); }}
                    className="text-[10px] font-black uppercase tracking-widest"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <Button type="submit" disabled={isAdding}>
              {isAdding ? "Adding..." : "Add User"}
            </Button>
          </form>
        </Card>
      )}

      {/* Users List */}
      <Card className="overflow-hidden">
        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 capitalize">
                        {user.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(currentUserRole === "super_admin" || currentUserRole === "owner") && (
                        <div className="flex flex-col items-end gap-2">
                          {deletingUserId === user.id ? (
                            <div className="flex flex-col items-end gap-2 bg-red-50 p-3 rounded-2xl border border-red-100 animate-in fade-in zoom-in duration-300">
                              <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1 italic">Verification Required</p>
                              <div className="flex gap-2">
                                <Input
                                  type="text"
                                  placeholder="CODE"
                                  value={deleteOtp}
                                  onChange={(e) => setDeleteOtp(e.target.value)}
                                  className="w-24 h-9 text-center font-black tracking-widest text-xs"
                                  maxLength={6}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleDelete(user.id, deleteOtp)}
                                  className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase h-9 px-4"
                                >
                                  Verify
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setDeletingUserId(null); setDeleteOtp(""); }}
                                  className="text-gray-400 hover:text-gray-600 text-[10px] font-black uppercase h-9"
                                >
                                  ×
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(user.id)}
                              className="text-red-600 border-red-200 hover:bg-red-50 text-[10px] font-black uppercase tracking-widest"
                            >
                              Delete
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
          <div className="p-6 text-center text-gray-600">
            <p>No users found</p>
          </div>
        )}
      </Card>
    </div>
  );
}
