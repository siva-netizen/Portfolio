"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Menu, X, ChevronDown, Github, Linkedin, Mail, ExternalLink, Trophy, Briefcase, Layers, MapPin, User, Calendar, ChevronUp } from "lucide-react";
import * as api from "@/lib/api";
import OrbitingSkills from "@/components/ui/orbiting-skills";
import { AwardCard } from "@/components/ui/achievement-cards";

// BlurText animation component
interface BlurTextProps {
    text: string;
    delay?: number;
    animateBy?: "words" | "letters";
    direction?: "top" | "bottom";
    className?: string;
    style?: React.CSSProperties;
}

const BlurText: React.FC<BlurTextProps> = ({
    text,
    delay = 50,
    animateBy = "words",
    direction = "top",
    className = "",
    style,
}) => {
    const [inView, setInView] = useState(false);
    const ref = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setInView(true);
            },
            { threshold: 0.1 }
        );
        const current = ref.current;
        if (current) observer.observe(current);
        return () => {
            if (current) observer.unobserve(current);
        };
    }, []);

    const segments = useMemo(
        () => (animateBy === "words" ? text.split(" ") : text.split("")),
        [text, animateBy]
    );

    return (
        <p ref={ref} className={`inline-flex flex-wrap ${className}`} style={style}>
            {segments.map((segment, i) => (
                <span
                    key={i}
                    style={{
                        display: "inline-block",
                        filter: inView ? "blur(0px)" : "blur(10px)",
                        opacity: inView ? 1 : 0,
                        transform: inView
                            ? "translateY(0)"
                            : `translateY(${direction === "top" ? "-20px" : "20px"})`,
                        transition: `all 0.5s ease-out ${i * delay}ms`,
                    }}
                >
                    {segment}
                    {animateBy === "words" && i < segments.length - 1 ? "\u00A0" : ""}
                </span>
            ))}
        </p>
    );
};

export default function PortfolioHero() {
    const [isDark, setIsDark] = useState(true);
    // Derived colors for theming
    const accentColor = isDark ? "#8d4beb" : "#000000";
    const accentText = isDark ? "text-[#8d4beb]" : "text-black";
    const accentBorder = isDark ? "border-[#8d4beb]" : "border-black";
    const accentBg = isDark ? "bg-[#8d4beb]" : "bg-black";
    const hoverAccentBg = isDark ? "hover:bg-[#8d4beb]" : "hover:bg-black";
    const hoverAccentText = isDark ? "hover:text-black" : "hover:text-[#f0e6ff]";
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Data from Firebase
    const [profile, setProfile] = useState<api.Profile | null>(null);
    const [experiences, setExperiences] = useState<api.Experience[]>([]);
    const [projects, setProjects] = useState<api.Project[]>([]);
    const [skills, setSkills] = useState<api.Skill[]>([]);
    const [achievements, setAchievements] = useState<api.Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [showAllProjects, setShowAllProjects] = useState(false);
    const [showAllAchievements, setShowAllAchievements] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.documentElement.classList.add("dark");
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [p, e, pr, s, a] = await Promise.all([
                api.getProfile(),
                api.getExperiences(),
                api.getProjects(),
                api.getSkills(),
                api.getAchievements(),
            ]);
            setProfile(p);
            setExperiences(e);
            setProjects(pr);
            setSkills(s);
            setAchievements(a);
        } catch (err) {
            console.error("Error loading data:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isMenuOpen &&
                menuRef.current &&
                buttonRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isMenuOpen]);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        document.documentElement.classList.toggle("dark", newTheme);
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    const menuItems = [
        { label: "HOME", href: "hero", highlight: true },
        { label: "EXPERIENCE", href: "experience" },
        { label: "PROJECTS", href: "projects" },
        { label: "SKILLS", href: "skills" },
        { label: "ACHIEVEMENTS", href: "achievements" },
        { label: "CONTACT", href: "contact" },
    ];

    // Group skills by category
    const groupedSkills = skills.reduce((acc, s) => {
        if (!acc[s.category]) acc[s.category] = [];
        acc[s.category].push(s.name);
        return acc;
    }, {} as Record<string, string[]>);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${accentColor} transparent transparent transparent` }} />
            </div>
        );
    }

    const firstName = profile?.name?.split(" ")[0] || "SIVA";
    const lastName = profile?.name?.split(" ").slice(1).join(" ") || "SABARIVEL";

    return (
        <div className={`min-h-screen ${isDark ? "bg-black text-white" : "bg-white text-black"}`}>
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Glow orbs */}
                <div
                    className="absolute w-[500px] h-[500px] rounded-full opacity-20"
                    style={{
                        background: "radial-gradient(circle, #C3E41D 0%, transparent 70%)",
                        top: "-10%",
                        left: "-10%",
                        animation: "float1 15s ease-in-out infinite",
                    }}
                />
                <div
                    className="absolute w-[400px] h-[400px] rounded-full opacity-15"
                    style={{
                        background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)",
                        bottom: "10%",
                        right: "-5%",
                        animation: "float2 20s ease-in-out infinite",
                    }}
                />
                <div
                    className="absolute w-[300px] h-[300px] rounded-full opacity-10"
                    style={{
                        background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)",
                        top: "40%",
                        left: "60%",
                        animation: "float3 18s ease-in-out infinite",
                    }}
                />
                {/* Dots */}
                <div className="absolute w-2 h-2 bg-[#C3E41D] rounded-full top-[20%] left-[10%] animate-pulse" />
                <div className="absolute w-1.5 h-1.5 bg-white rounded-full top-[60%] left-[80%] animate-pulse" style={{ animationDelay: "0.5s" }} />
                <div className="absolute w-1 h-1 bg-[#C3E41D] rounded-full top-[80%] left-[30%] animate-pulse" style={{ animationDelay: "1s" }} />
                <div className="absolute w-2 h-2 bg-purple-500 rounded-full top-[30%] right-[20%] animate-pulse" style={{ animationDelay: "1.5s" }} />
            </div>

            {/* Keyframe animations */}
            <style jsx global>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, 30px) scale(1.1); }
          66% { transform: translate(-30px, 50px) scale(0.9); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-60px, -40px) scale(1.15); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(40px, -30px); }
          75% { transform: translate(-20px, 40px); }
        }
      `}</style>

            {/* Header */}
            <header className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-md ${isDark ? "bg-black/50" : "bg-white/50"}`}>
                <nav className="flex items-center justify-between max-w-7xl mx-auto">

                    {/* Desktop Navigation - Inline */}
                    <div className="hidden md:flex items-center gap-1">
                        {menuItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => scrollToSection(item.href)}
                                className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${item.highlight
                                        ? `${accentBg} ${isDark ? "text-[#f0e6ff]" : "text-[#f0e6ff]"}`
                                        : `${isDark ? "text-[#bc8fe7] hover:text-[#f0e6ff] hover:bg-[#5c3c78]" : "text-neutral-600 hover:text-black hover:bg-neutral-100"}`
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="relative md:hidden">
                        <button
                            ref={buttonRef}
                            type="button"
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border font-medium transition-all ${isMenuOpen
                                ? `${accentBg} ${isDark ? "text-[#f0e6ff]" : "text-[#f0e6ff]"} border-transparent`
                                : `${isDark ? "border-[#5c3c78] text-[#bc8fe7] hover:text-[#f0e6ff] hover:border-[#8d4beb]" : "border-neutral-300 text-neutral-700 hover:text-black hover:border-neutral-500"}`
                                }`}
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            <span className="text-sm font-semibold">Menu</span>
                        </button>
                        {isMenuOpen && (
                            <div
                                ref={menuRef}
                                className={`absolute top-full left-0 w-52 mt-2 p-4 rounded-xl shadow-2xl border ${isDark ? "bg-black/90 border-[#5c3c78]" : "bg-white/90 border-neutral-200"}`}
                            >
                                {menuItems.map((item) => (
                                    <button
                                        key={item.label}
                                        onClick={() => {
                                            scrollToSection(item.href);
                                            setIsMenuOpen(false);
                                        }}
                                        className={`block w-full text-left text-lg font-bold py-2 px-3 rounded-lg transition-colors ${item.highlight ? accentText : isDark ? `text-[#f0e6ff] hover:${accentText}` : `text-black hover:${accentText}`}`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Side - Theme Toggle + Resume */}
                    <div className="flex items-center gap-3">
                        <a
                            href={profile?.resume_url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-4 py-2 ${accentBg} ${isDark ? "text-[#f0e6ff]" : "text-[#f0e6ff]"} font-semibold rounded-full text-sm hover:opacity-90 transition-colors`}
                        >
                            Resume
                        </a>
                        <button
                            onClick={toggleTheme}
                            className={`w-14 h-7 rounded-full relative transition-colors ${isDark ? "bg-[#5c3c78]" : "bg-neutral-200"}`}
                        >
                            <div
                                className={`absolute top-1 w-5 h-5 rounded-full transition-all duration-300 ${isDark ? "left-8 bg-[#bc8fe7]" : "left-1 bg-black"}`}
                            />
                        </button>
                    </div>
                </nav>
            </header>

            {/* Hero Section - Split Layout */}
            <section id="hero" className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden pt-20">
                <div className="max-w-7xl w-full flex flex-col md:flex-row items-center justify-between gap-12 sm:gap-16 relative z-10">

                    {/* LEFT: Text Content */}
                    <div className="flex-1 flex flex-col items-start justify-start text-left space-y-6">
                        {/* Availability Status Badge - Only show when enabled */}
                        {profile?.available_for_work && (
                            <div className="flex items-center gap-3">
                                <div className={`relative flex items-center gap-2 px-4 py-2 rounded-full border ${isDark ? "bg-black/80 border-[#5c3c78]" : "bg-white/80 border-neutral-200"} backdrop-blur-sm shadow-lg`}>
                                    {/* Animated pulse dot */}
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8d4beb] opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#8d4beb]"></span>
                                    </span>
                                    <span className={`text-sm font-medium ${isDark ? "text-[#bc8fe7]" : "text-neutral-700"}`}>
                                        Available for Work
                                    </span>
                                    {/* Decorative sparkle */}
                                    <svg className="w-4 h-4 text-yellow-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2L13.09 8.26L18 6L15.74 10.91L22 12L15.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L8.26 13.09L2 12L8.26 10.91L6 6L10.91 8.26L12 2Z" />
                                    </svg>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <BlurText
                                text={firstName.toUpperCase()}
                                delay={50}
                                animateBy="letters"
                                direction="top"
                                className="font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.9] tracking-tighter"
                                style={{ color: isDark ? "white" : "black" }}
                            />
                            <BlurText
                                text={lastName.toUpperCase()}
                                delay={50}
                                animateBy="letters"
                                direction="bottom"
                                className="font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.9] tracking-tighter"
                                style={{ color: isDark ? "white" : "black" }}
                            />
                        </div>

                        <p
                            className={`text-xl md:text-2xl italic max-w-lg ${isDark ? "text-[#bc8fe7]/70" : "text-black"}`}
                        >
                            {profile?.headline || "AI Engineer / student"}
                        </p>

                        {/* About Me Section */}
                        {profile?.about && (
                            <div className="pt-6 max-w-xl w-full">
                                <h3 className={`text-xl md:text-2xl font-light mb-3 ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>About Me</h3>
                                <div className={`h-[2px] w-full mb-6 ${accentBg}`}></div>
                                <div className="flex gap-4 items-start">
                                    <span className={`text-3xl font-bold leading-none mt-[-4px] ${accentText}`}>≈</span>
                                    <p className={`text-base md:text-lg leading-relaxed text-justify ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>
                                        {profile.about}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Social Links */}
                        <div className="flex gap-4 pt-4">
                            <a
                                href={profile?.github || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-3 rounded-full border ${isDark ? "border-neutral-700 text-[#bc8fe7]/70 hover:text-[#8d4beb] hover:border-[#8d4beb]" : "border-neutral-300 text-black hover:text-[#8d4beb] hover:border-[#8d4beb]"} transition-all`}
                            >
                                <Github className="w-6 h-6" />
                            </a>
                            <a
                                href={profile?.linkedin || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-3 rounded-full border ${isDark ? "border-neutral-700 text-[#bc8fe7]/70 hover:text-[#8d4beb] hover:border-[#8d4beb]" : "border-neutral-300 text-black hover:text-[#8d4beb] hover:border-[#8d4beb]"} transition-all`}
                            >
                                <Linkedin className="w-6 h-6" />
                            </a>
                        </div>
                    </div>

                    {/* RIGHT: Profile Photo with Hover Card */}
                    <div className="relative group">
                        {/* Decorative background blob */}
                        <div className={`absolute -inset-4 ${accentBg}/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

                        <div className={`relative w-72 h-96 sm:w-80 sm:h-[26rem] md:w-96 md:h-[30rem] rounded-[2.5rem] border-4 ${accentBorder} overflow-hidden shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]`}>
                            {profile?.hero_image_url ? (
                                <img
                                    src={profile.hero_image_url}
                                    alt={profile.name || "Profile"}
                                    className="w-full h-full object-cover object-top transition-all duration-500 group-hover:blur-[2px] group-hover:scale-110"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="w-full h-full bg-[#5c3c78] flex items-center justify-center text-[#8d4beb] text-center p-6">
                                    <div className="space-y-2">
                                        <p>Add Profile Photo</p>
                                        <p className="text-xs opacity-50">Admin Panel</p>
                                    </div>
                                </div>
                            )}

                            {/* Instagram-style Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-[#f0e6ff] backdrop-blur-[2px]">
                                <div className="flex gap-12 text-center">
                                    <div className="flex flex-col items-center gap-1 group/stat cursor-default">
                                        <div className={`w-12 h-12 rounded-full ${accentBg}/20 flex items-center justify-center mb-2 group-hover/stat:${accentBg} transition-colors duration-300`}>
                                            <Layers className={`w-6 h-6 ${accentText} group-hover/stat:text-[#f0e6ff] transition-colors`} />
                                        </div>
                                        <span className="text-3xl font-bold">{projects.length}</span>
                                        <span className="text-sm text-neutral-300 font-medium tracking-wide">Projects</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1 group/stat cursor-default">
                                        <div className={`w-12 h-12 rounded-full ${accentBg}/20 flex items-center justify-center mb-2 group-hover/stat:${accentBg} transition-colors duration-300`}>
                                            <Briefcase className={`w-6 h-6 ${accentText} group-hover/stat:text-[#f0e6ff] transition-colors`} />
                                        </div>
                                        <span className="text-3xl font-bold">
                                            {(() => {
                                                if (!mounted || experiences.length === 0) return "0";
                                                const totalMs = experiences.reduce((total, exp) => {
                                                    const start = new Date(exp.start_date || "").getTime();
                                                    const end = exp.end_date ? new Date(exp.end_date).getTime() : new Date().getTime();
                                                    return total + (isNaN(start) ? 0 : (end - start));
                                                }, 0);
                                                const years = totalMs / (1000 * 60 * 60 * 24 * 365.25);
                                                if (years < 1) {
                                                    return Math.max(1, Math.round(years * 12)) + " Mos";
                                                }
                                                return Math.floor(years) + "+";
                                            })()}
                                        </span>
                                        <span className="text-sm text-neutral-300 font-medium tracking-wide">
                                            {mounted && experiences.length > 0 && (experiences.reduce((total, exp) => {
                                                const start = new Date(exp.start_date || "").getTime();
                                                const end = exp.end_date ? new Date(exp.end_date).getTime() : new Date().getTime();
                                                return total + (isNaN(start) ? 0 : (end - start));
                                            }, 0) / (1000 * 60 * 60 * 24 * 365.25)) < 1 ? "Experience" : "Years Exp"}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-8 px-6 py-2 rounded-full border border-white/30 text-sm font-medium hover:bg-white hover:text-black transition-all cursor-crosshair">
                                    @{profile?.name?.replace(/\s+/g, '').toLowerCase() || "user"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <button
                    onClick={() => scrollToSection("experience")}
                    className={`absolute bottom-8 left-1/2 -translate-x-1/2 text-[#8d4beb] hover:${accentText} transition-colors z-20 animate-bounce`}
                >
                    <ChevronDown className="w-8 h-8" />
                </button>
            </section>

            {/* Experience Section */}
            <section id="experience" className="py-24 px-6 relative z-10">
                <div className="max-w-4xl mx-auto">
                    <h2
                        className="text-4xl md:text-5xl font-bold mb-16 text-center"
                        style={{ color: accentColor, fontFamily: "'Fira Code', monospace" }}
                    >
                        EXPERIENCE
                    </h2>
                    {experiences.length === 0 ? (
                        <p className="text-[#8d4beb] text-center">No experiences yet. Add some in the admin panel!</p>
                    ) : (
                        <div className={`rounded-2xl border ${isDark ? "bg-black/40 border-[#5c3c78]" : "bg-neutral-100 border-neutral-200"}`}>
                            {experiences.map((exp, index) => {
                                // Calculate Duration
                                let duration = "";
                                try {
                                    const start = new Date(exp.start_date || "");
                                    const end = exp.end_date ? new Date(exp.end_date) : new Date();
                                    if (!isNaN(start.getTime())) {
                                        let months = (end.getFullYear() - start.getFullYear()) * 12;
                                        months -= start.getMonth();
                                        months += end.getMonth();
                                        months = Math.max(0, months); // Ensure non-negative

                                        const years = Math.floor(months / 12);
                                        const remMonths = months % 12;

                                        if (years > 0) duration += `${years} yr${years > 1 ? "s" : ""} `;
                                        if (remMonths > 0) duration += `${remMonths} mo${remMonths > 1 ? "s" : ""}`;
                                    }
                                } catch (e) { /* ignore */ }

                                return (
                                    <div key={exp.id} className={index > 0 ? "border-t border-neutral-800" : ""}>
                                        <div className="p-6">
                                            <div className="flex items-center gap-4 mb-4">
                                                {/* Logo or Icon */}
                                                <div className="shrink-0">
                                                    {exp.company_logo_url ? (
                                                        <img
                                                            src={exp.company_logo_url}
                                                            alt={exp.company}
                                                            className="w-12 h-12 rounded-lg object-contain bg-white p-1"
                                                            referrerPolicy="no-referrer"
                                                        />
                                                    ) : (
                                                        <div className={`w-12 h-12 rounded-lg ${accentBg}/10 flex items-center justify-center border ${accentBorder}/20`}>
                                                            <Briefcase className={`w-6 h-6 ${accentText}`} />
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <h3 className={`text-xl font-bold ${accentText}`}>{exp.company}</h3>
                                                    {!exp.end_date && (
                                                        <span className={`flex items-center gap-2 text-xs ${accentText} mt-1`}>
                                                            <span className="relative flex h-2 w-2">
                                                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${accentBg} opacity-75`}></span>
                                                                <span className={`relative inline-flex rounded-full h-2 w-2 ${accentBg}`}></span>
                                                            </span>
                                                            Current
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="ml-16 space-y-4">
                                                {/* Role & Date */}
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                    <div className={`flex items-center gap-2 text-lg font-medium ${isDark ? "text-[#f0e6ff]" : "text-black"}`}>
                                                        <User className="w-4 h-4 text-[#bc8fe7]/70" />
                                                        {exp.role}
                                                    </div>
                                                    <div className={`flex items-center gap-3 text-sm ${isDark ? "text-[#8d4beb]" : "text-black"}`}>
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            <span>{exp.start_date} — {exp.end_date || "Present"}</span>
                                                        </div>
                                                        {mounted && duration && (
                                                            <span className={`px-2 py-0.5 rounded-full ${accentBg}/10 border ${accentBorder}/20 text-xs font-bold ${accentText}`}>
                                                                {duration}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Description - Bullet Points */}
                                                {exp.description && (
                                                    <ul className={`text-sm space-y-2 list-disc pl-4 ${isDark ? "text-[#bc8fe7]/70" : "text-neutral-600"}`}>
                                                        {exp.description.split(/[\n•]/).map(s => s.trim()).filter(Boolean).map((point, i) => (
                                                            <li key={i} className="leading-relaxed">{point}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Projects Section */}
            <section id="projects" className="py-24 px-6 relative z-10">
                <div className="max-w-6xl mx-auto">
                    <h2
                        className="text-4xl md:text-5xl font-bold mb-16 text-center"
                        style={{ color: accentColor, fontFamily: "'Fira Code', monospace" }}
                    >
                        PROJECTS
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.length === 0 && (
                            <p className="text-[#8d4beb] text-center col-span-full">No projects yet. Add some in the admin panel!</p>
                        )}
                        {(showAllProjects ? projects : projects.slice(0, 3)).map((proj) => (
                            <div
                                key={proj.id}
                                className={`p-6 rounded-2xl border transition-all hover:${accentBorder}/50 hover:-translate-y-2 ${isDark ? "bg-black/40 border-[#5c3c78]" : "bg-neutral-100 border-neutral-200"
                                    }`}
                            >
                                <h3 className="text-xl font-bold mb-3">{proj.title}</h3>
                                <p className={`text-sm mb-4 ${isDark ? "text-[#bc8fe7]/70" : "text-neutral-600"}`}>
                                    {proj.description}
                                </p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {proj.tech_stack?.split(",").map((tech, i) => (
                                        <span
                                            key={i}
                                            className={`px-2 py-1 text-xs font-medium ${accentBg}/10 ${accentText} rounded-md`}
                                        >
                                            {tech.trim()}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-4">
                                    {proj.github_url && (
                                        <a
                                            href={proj.github_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`text-[#bc8fe7]/70 hover:${accentText} transition-colors`}
                                        >
                                            <Github className="w-5 h-5" />
                                        </a>
                                    )}
                                    {proj.demo_url && (
                                        <a
                                            href={proj.demo_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`text-[#bc8fe7]/70 hover:${accentText} transition-colors`}
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {projects.length > 3 && (
                        <div className="flex justify-center mt-12">
                            <button
                                onClick={() => setShowAllProjects(!showAllProjects)}
                                className={`px-8 py-3 rounded-full font-medium transition-all duration-300 border ${accentBorder} ${accentText} ${hoverAccentBg} ${hoverAccentText} flex items-center gap-2`}
                            >
                                {showAllProjects ? "Show Less" : "See More Projects"}
                                {showAllProjects ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Skills Section */}
            <section id="skills" className="py-24 px-6 relative z-10">
                <div className="max-w-4xl mx-auto">
                    <h2
                        className="text-4xl md:text-5xl font-bold mb-8 text-center"
                        style={{ color: accentColor, fontFamily: "'Fira Code', monospace" }}
                    >
                        SKILLS
                    </h2>

                    {/* Desktop View: Orbiting Skills */}
                    <div className="hidden md:block">
                        <OrbitingSkills skills={skills} isDark={isDark} />
                    </div>

                    {/* Mobile View: Categorized List */}
                    <div className="md:hidden grid grid-cols-1 gap-6">
                        {Object.keys(skills.reduce((acc, skill) => {
                            const cat = skill.category || "Uncategorized";
                            if (!acc[cat]) acc[cat] = [];
                            acc[cat].push(skill);
                            return acc;
                        }, {} as Record<string, api.Skill[]>)).sort().map((category) => {
                            const groupedSkills = skills.reduce((acc, skill) => {
                                const cat = skill.category || "Uncategorized";
                                if (!acc[cat]) acc[cat] = [];
                                acc[cat].push(skill);
                                return acc;
                            }, {} as Record<string, api.Skill[]>);

                            return (
                                <div key={category} className={`border rounded-xl p-4 ${isDark ? "bg-black/40 border-[#5c3c78]" : "bg-neutral-100 border-neutral-200"}`}>
                                    <h3 className={`text-sm font-semibold ${accentText} mb-4 uppercase tracking-wider`}>{category}</h3>
                                    <div className="flex flex-col gap-2">
                                        {groupedSkills[category].map((skill) => (
                                            <div key={skill.id} className={`rounded-lg p-3 flex items-center gap-3 ${isDark ? "bg-[#5c3c78]" : "bg-neutral-200"}`}>
                                                {skill.icon_url ? (
                                                    <img src={skill.icon_url} alt={skill.name} className="w-6 h-6 object-contain rounded" referrerPolicy="no-referrer" />
                                                ) : (
                                                    <div className={`w-6 h-6 rounded ${isDark ? "bg-[#5c3c78]" : "bg-neutral-300"} flex items-center justify-center text-xs ${accentText} font-bold`}>
                                                        {skill.name.charAt(0)}
                                                    </div>
                                                )}
                                                <span className={`text-sm font-medium ${isDark ? "text-[#bc8fe7]" : "text-neutral-800"}`}>{skill.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Achievements Section */}
            <section id="achievements" className="py-24 px-6 relative z-10">
                <div className="max-w-6xl mx-auto">
                    <h2
                        className="text-4xl md:text-5xl font-bold mb-16 text-center"
                        style={{ color: accentColor, fontFamily: "'Fira Code', monospace" }}
                    >
                        ACHIEVEMENTS
                    </h2>
                    <div className="flex flex-wrap justify-center gap-6">
                        {(showAllAchievements ? achievements : achievements.slice(0, 3)).map((ach) => (
                            <AwardCard
                                key={ach.id}
                                title={ach.title}
                                description={ach.description || ""}
                                isDark={isDark}
                                linkUrl={ach.link_url}
                                icon={
                                    ach.image_url ? (
                                        <img src={ach.image_url} alt={ach.title} className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
                                    ) : (
                                        <Trophy className={`w-8 h-8 ${accentText}`} />
                                    )
                                }
                                className={`w-full max-w-[320px] ${isDark ? "bg-black/40 border-[#5c3c78]" : "bg-neutral-100 border-neutral-200"}`}
                            />
                        ))}
                    </div>
                    {achievements.length > 3 && (
                        <div className="flex justify-center mt-12">
                            <button
                                onClick={() => setShowAllAchievements(!showAllAchievements)}
                                className={`px-8 py-3 rounded-full font-medium transition-all duration-300 border ${accentBorder} ${accentText} ${hoverAccentBg} ${hoverAccentText} flex items-center gap-2`}
                            >
                                {showAllAchievements ? "Show Less" : "See More Achievements"}
                                {showAllAchievements ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-24 px-6 relative z-10">
                <div className="max-w-4xl mx-auto text-center">
                    <h2
                        className="text-4xl md:text-5xl font-bold mb-8"
                        style={{ color: accentColor, fontFamily: "'Fira Code', monospace" }}
                    >
                        GET IN TOUCH
                    </h2>
                    <p className={`mb-12 max-w-xl mx-auto ${isDark ? "text-[#bc8fe7]/70" : "text-neutral-600"}`}>
                        {profile?.summary || "Let's connect and build something amazing together."}
                    </p>
                    <div className="flex justify-center gap-8">
                        {profile?.github && (
                            <a
                                href={profile.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`group flex flex-col items-center gap-3 transition-colors ${isDark ? "text-[#bc8fe7]/70 hover:text-[#8d4beb]" : "text-black hover:text-[#8d4beb]"}`}
                            >
                                <div
                                    className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-colors group-hover:${accentBorder} ${isDark ? "border-[#5c3c78]" : "border-neutral-300"
                                        }`}
                                >
                                    <Github className="w-7 h-7" />
                                </div>
                                <span className="text-sm font-medium">GitHub</span>
                            </a>
                        )}
                        {profile?.email && (
                            <a
                                href={`mailto:${profile.email}`}
                                className={`group flex flex-col items-center gap-3 transition-colors ${isDark ? "text-[#bc8fe7]/70 hover:text-[#8d4beb]" : "text-black hover:text-[#8d4beb]"}`}
                            >
                                <div
                                    className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-colors group-hover:${accentBorder} ${isDark ? "border-[#5c3c78]" : "border-neutral-300"
                                        }`}
                                >
                                    <Mail className="w-7 h-7" />
                                </div>
                                <span className="text-sm font-medium">Email</span>
                            </a>
                        )}
                        {profile?.linkedin && (
                            <a
                                href={profile.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`group flex flex-col items-center gap-3 transition-colors ${isDark ? "text-[#bc8fe7]/70 hover:text-[#8d4beb]" : "text-black hover:text-[#8d4beb]"}`}
                            >
                                <div
                                    className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-colors group-hover:${accentBorder} ${isDark ? "border-[#5c3c78]" : "border-neutral-300"
                                        }`}
                                >
                                    <Linkedin className="w-7 h-7" />
                                </div>
                                <span className="text-sm font-medium">LinkedIn</span>
                            </a>
                        )}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer
                className={`py-8 px-6 text-center text-sm border-t ${isDark ? "border-[#5c3c78] text-[#bc8fe7]/60" : "border-neutral-200 text-black"}`}
            >
                © 2026 Siva Sabarivel. Built with bugs, fixed with caffeine.
            </footer>
        </div>
    );
}
