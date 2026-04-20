"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import * as api from "@/lib/api";
import {
    Loader2,
    LogOut,
    User as UserIcon,
    Briefcase,
    FolderOpen,
    Star,
    Award,
    ExternalLink,
    Plus,
    Pencil,
    Trash2,
    X,
    Save,
    Check,
    Wifi,
    WifiOff,
} from "lucide-react";
import Link from "next/link";
import { Toast, ToastContainer } from "@/components/ui/toast";
import { DraggableList } from "@/components/ui/draggable-list";
import { SkillsKanban } from "@/components/admin/skills-kanban";

type TabType = "profile" | "experience" | "projects" | "skills" | "achievements";

export default function AdminDashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>("profile");
    const router = useRouter();

    // Data states
    const [profile, setProfile] = useState<api.Profile | null>(null);
    const [experiences, setExperiences] = useState<api.Experience[]>([]);
    const [projects, setProjects] = useState<api.Project[]>([]);
    const [skills, setSkills] = useState<api.Skill[]>([]);
    const [achievements, setAchievements] = useState<api.Achievement[]>([]);

    // Profile form state (controlled)
    const [profileForm, setProfileForm] = useState({
        name: "",
        headline: "",
        about: "",
        summary: "",
        email: "",
        github: "",
        linkedin: "",
        resume_url: "",
        hero_image_url: "",
        available_for_work: false,
    });
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState<TabType>("profile");
    const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
    const [saving, setSaving] = useState(false);

    // Delete confirmation
    const [deleteModal, setDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);

    // Firebase connection status
    const [firebaseConnected, setFirebaseConnected] = useState<boolean | null>(null);

    // Toast state
    const [toast, setToast] = useState<{ type: "success" | "error"; title: string; message?: string } | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            if (!u) {
                router.push("/admin");
            } else {
                setUser(u);
                loadAllData();
                checkFirebaseConnection();
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [router]);

    // Check Firebase connection
    const checkFirebaseConnection = async () => {
        try {
            await getDoc(doc(db, "profile", "main"));
            setFirebaseConnected(true);
        } catch {
            setFirebaseConnected(false);
        }
    };

    // Auto-hide toast after 4 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const loadAllData = async () => {
        const [p, e, pr, s, a] = await Promise.all([
            api.getProfile(),
            api.getExperiences(),
            api.getProjects(),
            api.getSkills(),
            api.getAchievements(),
        ]);
        setProfile(p);
        if (p) {
            setProfileForm({
                name: p.name || "",
                headline: p.headline || "",
                about: p.about || "",
                summary: p.summary || "",
                email: p.email || "",
                github: p.github || "",
                linkedin: p.linkedin || "",
                resume_url: p.resume_url || "",
                hero_image_url: p.hero_image_url || "",
                available_for_work: p.available_for_work ?? false,
            });
        }
        setExperiences(e);
        setProjects(pr);
        setSkills(s);
        setAchievements(a);
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/admin");
    };

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
        setProfileSaved(false);
    };

    const handleProfileSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileSaving(true);
        try {
            await api.updateProfile(profileForm);
            setProfileSaved(true);
            setToast({ type: "success", title: "Profile saved!", message: "Your changes have been saved successfully." });
            setTimeout(() => setProfileSaved(false), 3000);
        } catch (err) {
            console.error("Save error:", err);
            setToast({ type: "error", title: "Failed to save", message: "Check your connection and try again." });
        }
        setProfileSaving(false);
    };

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: "profile", label: "Profile", icon: <UserIcon className="w-4 h-4" /> },
        { id: "experience", label: "Experience", icon: <Briefcase className="w-4 h-4" /> },
        { id: "projects", label: "Projects", icon: <FolderOpen className="w-4 h-4" /> },
        { id: "skills", label: "Skills", icon: <Star className="w-4 h-4" /> },
        { id: "achievements", label: "Achievements", icon: <Award className="w-4 h-4" /> },
    ];

    const openAddModal = (type: TabType) => {
        setModalType(type);
        setEditingItem(null);
        setModalOpen(true);
    };

    const openEditModal = (type: TabType, item: Record<string, unknown>) => {
        setModalType(type);
        setEditingItem(item);
        setModalOpen(true);
    };

    const confirmDelete = (type: string, id: string) => {
        setDeleteTarget({ type, id });
        setDeleteModal(true);
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;
        const { type, id } = deleteTarget;
        if (type === "experience") await api.deleteExperience(id);
        else if (type === "projects") await api.deleteProject(id);
        else if (type === "skills") await api.deleteSkill(id);
        else if (type === "achievements") await api.deleteAchievement(id);
        await loadAllData();
        setDeleteModal(false);
        setDeleteTarget(null);
    };

    const handleSave = async (formData: FormData) => {
        setSaving(true);
        const data = Object.fromEntries(formData.entries());

        try {
            if (modalType === "experience") {
                if (editingItem?.id) await api.updateExperience(editingItem.id as string, data as unknown as api.Experience);
                else await api.addExperience(data as unknown as api.Experience);
            } else if (modalType === "projects") {
                const projectData = { ...data, order_index: parseInt(data.order_index as string) || 0 };
                if (editingItem?.id) await api.updateProject(editingItem.id as string, projectData as unknown as api.Project);
                else await api.addProject(projectData as unknown as api.Project);
            } else if (modalType === "skills") {
                if (editingItem?.id) await api.updateSkill(editingItem.id as string, data as unknown as api.Skill);
                else await api.addSkill(data as unknown as api.Skill);
            } else if (modalType === "achievements") {
                const achievementData = { ...data, order_index: editingItem && 'order_index' in editingItem ? (editingItem.order_index as number) : achievements.length };
                if (editingItem?.id) await api.updateAchievement(editingItem.id as string, achievementData as unknown as api.Achievement);
                else await api.addAchievement(achievementData as unknown as api.Achievement);
            }
            await loadAllData();
            setModalOpen(false);
        } catch (err) {
            console.error("Save error:", err);
            alert("Error saving. Check console.");
        }
        setSaving(false);
    };

    const handleProjectReorder = async (newOrder: api.Project[]) => {
        setProjects(newOrder);
        try {
            await Promise.all(
                newOrder.map((project, index) => {
                    if (project.id) {
                        return api.updateProject(project.id, { order_index: index });
                    }
                    return Promise.resolve();
                })
            );
        } catch (error) {
            console.error("Failed to update project order", error);
            setToast({ type: "error", title: "Reorder Failed", message: "Could not save new order." });
            // Revert changes by reloading
            loadAllData();
        }
    };

    const handleAchievementReorder = async (newOrder: api.Achievement[]) => {
        setAchievements(newOrder); // Optimistic update
        try {
            await Promise.all(
                newOrder.map((ach, index) => {
                    if (ach.id) {
                        return api.updateAchievement(ach.id, { order_index: index });
                    }
                    return Promise.resolve();
                })
            );
        } catch (error) {
            console.error("Failed to update achievement order", error);
            setToast({ type: "error", title: "Reorder Failed", message: "Could not save new order." });
            loadAllData(); // Revert
        }
    };

    const handleSkillUpdate = async (skillId: string, updates: Partial<api.Skill>) => {
        // Optimistic update
        setSkills(prev => prev.map(s => s.id === skillId ? { ...s, ...updates } : s));
        try {
            await api.updateSkill(skillId, updates);
        } catch (error) {
            console.error("Failed to update skill", error);
            setToast({ type: "error", title: "Failed to update skill", message: "Changes reverted." });
            loadAllData(); // Revert
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#C3E41D]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <header className="border-b border-neutral-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold" style={{ color: "#C3E41D", fontFamily: "'Fira Code', monospace" }}>
                            Portfolio CMS
                        </h1>
                        {/* Firebase Status */}
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${firebaseConnected === null
                            ? "bg-neutral-800 text-neutral-400"
                            : firebaseConnected
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}>
                            {firebaseConnected === null ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : firebaseConnected ? (
                                <Wifi className="w-3 h-3" />
                            ) : (
                                <WifiOff className="w-3 h-3" />
                            )}
                            {firebaseConnected === null ? "Checking..." : firebaseConnected ? "Firebase Connected" : "Connection Error"}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-neutral-400 text-sm">{user?.email}</span>
                        <Link href="/" target="_blank" className="text-neutral-400 hover:text-white transition-colors">
                            <ExternalLink className="w-5 h-5" />
                        </Link>
                        <button onClick={handleLogout} className="text-neutral-400 hover:text-white transition-colors">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Tabs */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === tab.id ? "bg-[#C3E41D] text-black" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                    {/* Profile Tab - with controlled inputs */}
                    {activeTab === "profile" && (
                        <form onSubmit={handleProfileSave} className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">Profile & Contact</h2>
                                {profileSaved && (
                                    <span className="text-green-400 flex items-center gap-1 text-sm">
                                        <Check className="w-4 h-4" /> Saved!
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-1">Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={profileForm.name}
                                        onChange={handleProfileChange}
                                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-[#C3E41D] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-1">Headline</label>
                                    <input
                                        type="text"
                                        name="headline"
                                        value={profileForm.headline}
                                        onChange={handleProfileChange}
                                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-[#C3E41D] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-1">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={profileForm.email}
                                        onChange={handleProfileChange}
                                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-[#C3E41D] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-1">GitHub URL</label>
                                    <input
                                        type="url"
                                        name="github"
                                        value={profileForm.github}
                                        onChange={handleProfileChange}
                                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-[#C3E41D] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-1">LinkedIn URL</label>
                                    <input
                                        type="url"
                                        name="linkedin"
                                        value={profileForm.linkedin}
                                        onChange={handleProfileChange}
                                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-[#C3E41D] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-1">Resume URL</label>
                                    <input
                                        type="url"
                                        name="resume_url"
                                        value={profileForm.resume_url}
                                        onChange={handleProfileChange}
                                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-[#C3E41D] transition-colors"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-neutral-300 mb-1">Profile Image URL</label>
                                    <input
                                        type="url"
                                        name="hero_image_url"
                                        value={profileForm.hero_image_url}
                                        onChange={handleProfileChange}
                                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-[#C3E41D] transition-colors"
                                        placeholder="https://imgur.com/..."
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-1">About Me</label>
                                <textarea
                                    name="about"
                                    value={profileForm.about}
                                    onChange={handleProfileChange}
                                    rows={4}
                                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-[#C3E41D] transition-colors resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-1">Summary / Bio</label>
                                <textarea
                                    name="summary"
                                    value={profileForm.summary}
                                    onChange={handleProfileChange}
                                    rows={4}
                                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-[#C3E41D] transition-colors resize-none"
                                />
                            </div>
                            {/* Available for Work Toggle */}
                            <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
                                <div className="flex items-center gap-3">
                                    <span className="relative flex h-3 w-3">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${profileForm.available_for_work ? "bg-green-400" : "bg-neutral-600"} opacity-75`}></span>
                                        <span className={`relative inline-flex rounded-full h-3 w-3 ${profileForm.available_for_work ? "bg-green-500" : "bg-neutral-500"}`}></span>
                                    </span>
                                    <div>
                                        <div className="font-medium text-white">Available for Work</div>
                                        <div className="text-xs text-neutral-400">Show availability badge on portfolio</div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setProfileForm(prev => ({ ...prev, available_for_work: !prev.available_for_work }))}
                                    className={`w-14 h-7 rounded-full relative transition-colors ${profileForm.available_for_work ? "bg-green-500" : "bg-neutral-700"}`}
                                >
                                    <div
                                        className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 ${profileForm.available_for_work ? "left-8" : "left-1"}`}
                                    />
                                </button>
                            </div>
                            <button
                                type="submit"
                                disabled={profileSaving}
                                className="px-6 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                                style={{ backgroundColor: "#C3E41D", color: "black" }}
                            >
                                {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Profile
                            </button>
                        </form>
                    )}

                    {/* Experience Tab */}
                    {activeTab === "experience" && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-semibold">Experience</h2>
                                <button onClick={() => openAddModal("experience")} className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: "#C3E41D", color: "black" }}>
                                    <Plus className="w-4 h-4" /> Add
                                </button>
                            </div>
                            <div className="space-y-3">
                                {experiences.length === 0 && <p className="text-neutral-500">No experience added yet.</p>}
                                {experiences.map((exp) => (
                                    <ItemCard key={exp.id} title={exp.role} subtitle={`${exp.company} • ${exp.start_date || "N/A"} - ${exp.end_date || "Present"}`} onEdit={() => openEditModal("experience", exp as unknown as Record<string, unknown>)} onDelete={() => confirmDelete("experience", exp.id!)} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Projects Tab */}
                    {activeTab === "projects" && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-semibold">Projects</h2>
                                <button onClick={() => openAddModal("projects")} className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: "#C3E41D", color: "black" }}>
                                    <Plus className="w-4 h-4" /> Add
                                </button>
                            </div>
                            <div className="space-y-3">
                                {projects.length === 0 && <p className="text-neutral-500">No projects added yet.</p>}
                                <DraggableList
                                    items={projects}
                                    onReorder={handleProjectReorder}
                                    keyExtractor={(item) => item.id || Math.random().toString()}
                                    onEdit={(item) => openEditModal("projects", item as unknown as Record<string, unknown>)}
                                    onDelete={(item) => confirmDelete("projects", item.id!)}
                                    renderItem={(proj) => (
                                        <div>
                                            <div className="font-medium text-white">{proj.title}</div>
                                            <div className="text-sm text-neutral-400">{proj.tech_stack || "No tech stack"}</div>
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    {/* Skills Tab */}
                    {activeTab === "skills" && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-semibold">Skills</h2>
                                <button onClick={() => openAddModal("skills")} className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: "#C3E41D", color: "black" }}>
                                    <Plus className="w-4 h-4" /> Add
                                </button>
                            </div>
                            <div className="space-y-3">
                                {skills.length === 0 && <p className="text-neutral-500">No skills added yet.</p>}
                                <SkillsKanban
                                    skills={skills}
                                    onSkillUpdate={handleSkillUpdate}
                                    onEdit={(skill) => openEditModal("skills", skill as unknown as Record<string, unknown>)}
                                    onDelete={(skill) => confirmDelete("skills", skill.id!)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Achievements Tab */}
                    {activeTab === "achievements" && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-semibold">Achievements</h2>
                                <button onClick={() => openAddModal("achievements")} className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: "#C3E41D", color: "black" }}>
                                    <Plus className="w-4 h-4" /> Add
                                </button>
                            </div>
                            <div className="space-y-3">
                                {achievements.length === 0 && <p className="text-neutral-500">No achievements added yet.</p>}
                                <DraggableList
                                    items={achievements}
                                    onReorder={handleAchievementReorder}
                                    keyExtractor={(item) => item.id || Math.random().toString()}
                                    onEdit={(item) => openEditModal("achievements", item as unknown as Record<string, unknown>)}
                                    onDelete={(item) => confirmDelete("achievements", item.id!)}
                                    renderItem={(ach) => (
                                        <div>
                                            <div className="font-medium text-white">{ach.title}</div>
                                            <div className="text-sm text-neutral-400 truncate max-w-sm">{ach.description || "No description"}</div>
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {modalOpen && (
                <Modal title={editingItem ? `Edit ${modalType}` : `Add ${modalType}`} onClose={() => setModalOpen(false)} onSubmit={handleSave} saving={saving}>
                    {modalType === "experience" && (
                        <>
                            <InputField label="Company" name="company" defaultValue={(editingItem?.company as string) || ""} required />
                            <InputField label="Company Logo URL" name="company_logo_url" defaultValue={(editingItem?.company_logo_url as string) || ""} placeholder="https://..." />
                            <InputField label="Role" name="role" defaultValue={(editingItem?.role as string) || ""} required />
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Start Date" name="start_date" type="text" defaultValue={(editingItem?.start_date as string) || ""} placeholder="e.g. Jan 2023" />
                                <InputField label="End Date" name="end_date" type="text" defaultValue={(editingItem?.end_date as string) || ""} placeholder="Present" />
                            </div>
                            <TextareaField label="Description (Use '•' or new lines for bullets)" name="description" defaultValue={(editingItem?.description as string) || ""} />
                        </>
                    )}
                    {modalType === "projects" && (
                        <>
                            <InputField label="Title" name="title" defaultValue={(editingItem?.title as string) || ""} required />
                            <TextareaField label="Description" name="description" defaultValue={(editingItem?.description as string) || ""} />
                            <InputField label="Tech Stack (comma-separated)" name="tech_stack" defaultValue={(editingItem?.tech_stack as string) || ""} />
                            <InputField label="GitHub URL" name="github_url" defaultValue={(editingItem?.github_url as string) || ""} />
                            <InputField label="Demo URL" name="demo_url" defaultValue={(editingItem?.demo_url as string) || ""} />

                        </>
                    )}
                    {modalType === "skills" && (
                        <>
                            <InputField label="Category" name="category" defaultValue={(editingItem?.category as string) || ""} required />
                            <InputField label="Skill Name" name="name" defaultValue={(editingItem?.name as string) || ""} required />
                            <InputField label="Icon URL" name="icon_url" defaultValue={(editingItem?.icon_url as string) || ""} placeholder="https://simpleicons.org/icons/..." />

                            {editingItem?.id && (
                                <button type="button" onClick={() => { confirmDelete("skills", editingItem.id as string); setModalOpen(false); }} className="mt-2 text-red-400 text-sm hover:text-red-300">
                                    Delete this skill
                                </button>
                            )}
                        </>
                    )}
                    {modalType === "achievements" && (
                        <>
                            <InputField label="Title" name="title" defaultValue={(editingItem?.title as string) || ""} required />
                            <TextareaField label="Description" name="description" defaultValue={(editingItem?.description as string) || ""} />
                            <InputField label="Image URL (Icon/Logo)" name="image_url" defaultValue={(editingItem?.image_url as string) || ""} placeholder="https://..." />
                            <InputField label="Link URL (Certificate/Repo)" name="link_url" defaultValue={(editingItem?.link_url as string) || ""} placeholder="https://..." />
                            {editingItem?.id && (
                                <button type="button" onClick={() => { confirmDelete("achievements", editingItem.id as string); setModalOpen(false); }} className="mt-2 text-red-400 text-sm hover:text-red-300">
                                    Delete this achievement
                                </button>
                            )}
                        </>
                    )}
                </Modal>
            )}

            {/* Toast Notifications */}
            <ToastContainer>
                {toast && (
                    <Toast
                        type={toast.type}
                        title={toast.title}
                        message={toast.message}
                        onClose={() => setToast(null)}
                    />
                )}
            </ToastContainer>

            {/* Delete Confirmation */}
            {deleteModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
                        <p className="text-neutral-400 mb-6">Are you sure? This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteModal(false)} className="flex-1 px-4 py-2 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors">Cancel</button>
                            <button onClick={executeDelete} className="flex-1 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-500 transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper Components
function InputField({ label, name, type = "text", defaultValue, required, className = "", placeholder }: { label: string; name: string; type?: string; defaultValue?: string; required?: boolean; className?: string; placeholder?: string }) {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-neutral-300 mb-1">{label}</label>
            <input type={type} name={name} defaultValue={defaultValue} required={required} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-[#C3E41D] transition-colors" placeholder={placeholder} />
        </div>
    );
}



function TextareaField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
    return (
        <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">{label}</label>
            <textarea name={name} defaultValue={defaultValue} rows={3} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-[#C3E41D] transition-colors resize-none" />
        </div>
    );
}

function ItemCard({ title, subtitle, onEdit, onDelete }: { title: string; subtitle: string; onEdit: () => void; onDelete: () => void }) {
    return (
        <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-lg hover:bg-neutral-800 transition-colors">
            <div>
                <div className="font-medium">{title}</div>
                <div className="text-sm text-neutral-400">{subtitle}</div>
            </div>
            <div className="flex gap-2">
                <button onClick={onEdit} className="p-2 text-neutral-400 hover:text-white transition-colors"><Pencil className="w-4 h-4" /></button>
                <button onClick={onDelete} className="p-2 text-neutral-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
        </div>
    );
}

function Modal({ title, onClose, onSubmit, saving, children }: { title: string; onClose: () => void; onSubmit: (data: FormData) => void; saving: boolean; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }} className="space-y-4">
                    {children}
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: "#C3E41D", color: "black" }}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
