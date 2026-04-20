"use client"
import React, { useEffect, useState, memo } from 'react';
import type { Skill } from '@/lib/api';

// --- Type Definitions ---
type GlowColor = 'cyan' | 'purple' | 'green' | 'blue';

interface SkillConfig {
    id: string;
    orbitRadius: number;
    size: number;
    speed: number;
    iconUrl?: string;
    phaseShift: number;
    glowColor: GlowColor;
    label: string;
}

interface OrbitingSkillProps {
    config: SkillConfig;
    angle: number;
}

interface GlowingOrbitPathProps {
    radius: number;
    glowColor?: GlowColor;
    animationDelay?: number;
}

interface OrbitingSkillsProps {
    skills: Skill[];
}

// --- Memoized Orbiting Skill Component ---
const OrbitingSkill = memo(({ config, angle, isDark }: OrbitingSkillProps & { isDark: boolean }) => {
    const [isHovered, setIsHovered] = useState(false);
    const { orbitRadius, size, iconUrl, label } = config;

    const x = Math.cos(angle) * orbitRadius;
    const y = Math.sin(angle) * orbitRadius;

    // Derived theme colors
    const bgColor = isDark ? "bg-neutral-700/90" : "bg-white/90";
    const borderColor = isDark ? "border-neutral-600" : "border-neutral-300";
    const accentColor = isDark ? "#8d4beb" : "#000000";
    const labelBg = isDark ? "bg-neutral-900/95" : "bg-white/95";
    const labelText = isDark ? "text-white" : "text-black";

    return (
        <div
            className="absolute top-1/2 left-1/2 transition-all duration-300 ease-out"
            style={{
                width: `${size}px`,
                height: `${size}px`,
                transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))`,
                zIndex: isHovered ? 20 : 10,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className={`
          relative w-full h-full p-2 ${bgColor} backdrop-blur-sm
          rounded-full flex items-center justify-center
          transition-all duration-300 cursor-pointer border ${borderColor}
          ${isHovered ? 'scale-125 shadow-2xl' : 'shadow-lg hover:shadow-xl'}
        `}
                style={{
                    borderColor: isHovered ? accentColor : undefined,
                    boxShadow: isHovered
                        ? `0 0 30px ${accentColor}40, 0 0 60px ${accentColor}20`
                        : undefined
                }}
            >
                {iconUrl ? (
                    <img src={iconUrl} alt={label} className="w-full h-full object-contain rounded-full" referrerPolicy="no-referrer" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ color: accentColor }}>
                        {label.charAt(0)}
                    </div>
                )}
                {isHovered && (
                    <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${labelBg} backdrop-blur-sm rounded text-xs ${labelText} whitespace-nowrap pointer-events-none border ${borderColor}`}>
                        {label}
                    </div>
                )}
            </div>
        </div>
    );
});
OrbitingSkill.displayName = 'OrbitingSkill';

// --- Optimized Orbit Path Component ---
const GlowingOrbitPath = memo(({ radius, glowColor = 'cyan', animationDelay = 0, isDark }: GlowingOrbitPathProps & { isDark: boolean }) => {
    const getGlowColors = (color: GlowColor) => {
        const opacity = isDark ? { p: 0.4, s: 0.2, b: 0.3 } : { p: 0.6, s: 0.3, b: 0.5 };

        const baseColors = {
            cyan: '195, 228, 29', // Using our neon green/dark green equivalent
            purple: '147, 51, 234',
            green: '34, 197, 94',
            blue: '59, 130, 246'
        };

        // Override cyan with our accent color dynamically
        const accentBase = isDark ? '141, 75, 235' : '0, 0, 0'; // #8d4beb vs #000000

        const rgb = color === 'cyan' ? accentBase : baseColors[color];

        return {
            primary: `rgba(${rgb}, ${opacity.p})`,
            secondary: `rgba(${rgb}, ${opacity.s})`,
            border: `rgba(${rgb}, ${opacity.b})`
        };
    };

    const colors = getGlowColors(glowColor);

    return (
        <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
                width: `${radius * 2}px`,
                height: `${radius * 2}px`,
                animationDelay: `${animationDelay}s`,
            }}
        >
            {/* Glowing background */}
            <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{
                    background: `radial-gradient(circle, transparent 30%, ${colors.secondary} 70%, ${colors.primary} 100%)`,
                    boxShadow: `0 0 60px ${colors.primary}, inset 0 0 60px ${colors.secondary}`,
                    animation: 'pulse 4s ease-in-out infinite',
                    animationDelay: `${animationDelay}s`,
                }}
            />

            {/* Static ring for depth */}
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    border: `1px solid ${colors.border}`,
                    boxShadow: `inset 0 0 20px ${colors.secondary}`,
                }}
            />
        </div>
    );
});
GlowingOrbitPath.displayName = 'GlowingOrbitPath';

// --- Main Orbiting Skills Component ---
export default function OrbitingSkills({ skills, isDark = true }: OrbitingSkillsProps & { isDark?: boolean }) {
    const [time, setTime] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (isPaused) return;

        let animationFrameId: number;
        let lastTime = performance.now();

        const animate = (currentTime: number) => {
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            setTime(prevTime => prevTime + deltaTime);
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPaused]);

    // Group skills by category
    const groupedSkills = skills.reduce((acc, skill) => {
        if (!acc[skill.category]) {
            acc[skill.category] = [];
        }
        acc[skill.category].push(skill);
        return acc;
    }, {} as Record<string, Skill[]>);

    const categories = Object.keys(groupedSkills).sort();

    // Define orbit configurations
    const baseRadius = 100;
    const radiusIncrement = 70;
    const orbitSpeedMultiplier = 1;
    const colors: GlowColor[] = ['cyan', 'purple', 'green', 'blue'];

    const orbitConfigs = categories.map((category, index) => {
        const radius = baseRadius + (index * radiusIncrement);
        const direction = index % 2 === 0 ? 1 : -1;
        const speed = (orbitSpeedMultiplier - (index * 0.15)) * direction;

        return {
            category,
            radius,
            speed,
            glowColor: colors[index % colors.length],
            delay: index * 0.5,
            skills: groupedSkills[category]
        };
    });

    const skillsConfig: SkillConfig[] = orbitConfigs.flatMap((config, orbitIndex) => {
        return config.skills.map((skill, skillIndex) => ({
            id: skill.id || `${config.category}-${skillIndex}`,
            orbitRadius: config.radius,
            size: orbitIndex === 0 ? 42 : 48,
            speed: config.speed,
            iconUrl: skill.icon_url,
            phaseShift: (2 * Math.PI * skillIndex) / Math.max(config.skills.length, 1),
            glowColor: config.glowColor,
            label: skill.name,
        }));
    });

    const maxRadius = orbitConfigs.length > 0 ? orbitConfigs[orbitConfigs.length - 1].radius : 0;
    const containerSize = Math.max(450, (maxRadius * 2) + 120); // 120px padding (60px each side)

    return (
        <div className="w-full flex items-center justify-center overflow-hidden relative py-10">
            <div
                className="relative flex items-center justify-center transition-all duration-500 ease-in-out"
                style={{
                    width: `${containerSize}px`,
                    height: `${containerSize}px`
                }}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >

                {/* Central "Code" Icon with enhanced glow */}
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center z-10 relative shadow-2xl border ${isDark ? "bg-gradient-to-br from-neutral-700 to-neutral-900 border-neutral-600" : "bg-gradient-to-br from-white to-neutral-100 border-neutral-300"}`}>
                    <div className={`absolute inset-0 rounded-full blur-xl animate-pulse ${isDark ? "bg-[#8d4beb]/30" : "bg-black/10"}`}></div>
                    <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="relative z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor={isDark ? "#8d4beb" : "#000000"} />
                                    <stop offset="100%" stopColor="#9333EA" />
                                </linearGradient>
                            </defs>
                            <polyline points="16 18 22 12 16 6"></polyline>
                            <polyline points="8 6 2 12 8 18"></polyline>
                        </svg>
                    </div>
                </div>

                {/* Render glowing orbit paths */}
                {orbitConfigs.map((config) => (
                    <GlowingOrbitPath
                        key={`path-${config.category}`}
                        radius={config.radius}
                        glowColor={config.glowColor}
                        animationDelay={config.delay}
                        isDark={isDark}
                    />
                ))}

                {/* Render orbiting skill icons */}
                {skillsConfig.map((config) => {
                    const angle = time * config.speed + (config.phaseShift || 0);
                    return (
                        <OrbitingSkill
                            key={config.id}
                            config={config}
                            angle={angle}
                            isDark={isDark}
                        />
                    );
                })}
            </div>
        </div>
    );
}
