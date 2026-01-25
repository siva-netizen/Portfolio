import * as React from "react";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

/**
 * Props for the AwardCard component.
 */
export interface AwardCardProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * The icon to be displayed. Can be an SVG, <img>, or any ReactNode.
     */
    icon: React.ReactNode;
    /**
     * The small heading or category (e.g., "1st Place").
     */
    title: string;
    /**
     * The main description or name of the awarding entity.
     */
    description: string;
    /**
     * Whether to use dark mode styling.
     */
    isDark?: boolean;
    /**
     * Optional link to certificate or repository.
     */
    linkUrl?: string;
}

const AwardCard = React.forwardRef<HTMLDivElement, AwardCardProps>(
    ({ className, icon, title, description, isDark = true, linkUrl, ...props }, ref) => {
        const accentColor = isDark ? "#C3E41D" : "#4d7c0f";

        return (
            <div
                ref={ref}
                className={cn(
                    "flex min-w-[240px] items-start gap-4 rounded-xl border p-4 shadow-sm",
                    isDark ? "bg-neutral-900 border-neutral-800" : "bg-neutral-100 border-neutral-200",
                    "transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-1 hover:border-[#C3E41D]/50",
                    isDark ? "" : "hover:border-[#4d7c0f]/50",
                    className
                )}
                {...props}
            >
                {/* Icon Slot */}
                <div className={cn(
                    "flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg p-2 border",
                    isDark ? "bg-neutral-800 border-neutral-700 text-[#C3E41D]" : "bg-neutral-200 border-neutral-300 text-[#4d7c0f]"
                )}>
                    {icon}
                </div>

                {/* Text Content */}
                <div className="flex flex-col text-left space-y-1 pt-1 flex-1">
                    <h3 className={cn("font-bold leading-tight", isDark ? "text-white" : "text-black")}>{title}</h3>
                    <p className={cn("text-sm leading-snug", isDark ? "text-neutral-400" : "text-neutral-600")}>{description}</p>
                </div>

                {/* Link Icon */}
                {linkUrl && (
                    <a
                        href={linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            "flex-shrink-0 p-2 rounded-full transition-colors",
                            isDark ? "text-neutral-400 hover:text-[#C3E41D] hover:bg-neutral-800" : "text-neutral-500 hover:text-[#4d7c0f] hover:bg-neutral-200"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                )}
            </div>
        );
    }
);
AwardCard.displayName = "AwardCard";

export { AwardCard };
