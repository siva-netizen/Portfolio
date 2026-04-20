// API Module - Firestore CRUD Operations (TypeScript)
import { db, storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    setDoc,
} from "firebase/firestore";

// ==================== TYPES ====================
export interface Profile {
    id?: string;
    name: string;
    headline?: string;
    about?: string;
    summary?: string;
    email?: string;
    github?: string;
    linkedin?: string;
    resume_url?: string;
    hero_image_url?: string;
    available_for_work?: boolean;
}

export interface Experience {
    id?: string;
    company: string;
    role: string;
    start_date?: string;
    end_date?: string | null;
    description?: string;
    company_logo_url?: string;
}

export interface Project {
    id?: string;
    title: string;
    description?: string;
    tech_stack?: string;
    github_url?: string;
    demo_url?: string;
    featured?: boolean;
    order_index?: number;
}

export interface Skill {
    id?: string;
    category: string;
    name: string;
    icon_url?: string;

}

export interface Achievement {
    id?: string;
    title: string;
    description?: string;
    image_url?: string;
    link_url?: string;
    order_index?: number;
}

// ==================== PROFILE ====================
export async function getProfile(): Promise<Profile | null> {
    const docSnap = await getDoc(doc(db, "profile", "main"));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Profile : null;
}

export async function updateProfile(data: Partial<Profile>): Promise<void> {
    await setDoc(doc(db, "profile", "main"), data, { merge: true });
}

// ==================== EXPERIENCE ====================
export async function getExperiences(): Promise<Experience[]> {
    const q = query(collection(db, "experience"), orderBy("start_date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Experience));
}

export async function addExperience(data: Omit<Experience, "id">): Promise<string> {
    const docRef = await addDoc(collection(db, "experience"), data);
    return docRef.id;
}

export async function updateExperience(id: string, data: Partial<Experience>): Promise<void> {
    await updateDoc(doc(db, "experience", id), data);
}

export async function deleteExperience(id: string): Promise<void> {
    await deleteDoc(doc(db, "experience", id));
}

// ==================== PROJECTS ====================
export async function getProjects(): Promise<Project[]> {
    const q = query(collection(db, "projects"), orderBy("order_index", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
}

export async function addProject(data: Omit<Project, "id">): Promise<string> {
    const docRef = await addDoc(collection(db, "projects"), data);
    return docRef.id;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<void> {
    await updateDoc(doc(db, "projects", id), data);
}

export async function deleteProject(id: string): Promise<void> {
    await deleteDoc(doc(db, "projects", id));
}

// ==================== SKILLS ====================
export async function getSkills(): Promise<Skill[]> {
    const q = query(collection(db, "skills"), orderBy("category", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Skill));
}

export async function addSkill(data: Omit<Skill, "id">): Promise<string> {
    const docRef = await addDoc(collection(db, "skills"), data);
    return docRef.id;
}

export async function updateSkill(id: string, data: Partial<Skill>): Promise<void> {
    await updateDoc(doc(db, "skills", id), data);
}

export async function deleteSkill(id: string): Promise<void> {
    await deleteDoc(doc(db, "skills", id));
}

// ==================== ACHIEVEMENTS ====================
export async function getAchievements(): Promise<Achievement[]> {
    const q = query(collection(db, "achievements"), orderBy("order_index", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Achievement));
}

export async function addAchievement(data: Omit<Achievement, "id">): Promise<string> {
    const docRef = await addDoc(collection(db, "achievements"), data);
    return docRef.id;
}

export async function updateAchievement(id: string, data: Partial<Achievement>): Promise<void> {
    await updateDoc(doc(db, "achievements", id), data);
}

export async function deleteAchievement(id: string): Promise<void> {
    await deleteDoc(doc(db, "achievements", id));
}

// ==================== STORAGE ====================
export async function uploadImage(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
}
