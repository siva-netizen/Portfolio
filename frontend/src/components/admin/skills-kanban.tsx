"use client";

import React, { useState, useEffect } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    DropAnimation,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";
import { Skill } from "@/lib/api";
import { Pencil, Trash2 } from "lucide-react";

interface SkillsKanbanProps {
    skills: Skill[];
    onSkillUpdate: (skillId: string, updates: Partial<Skill>) => void;
    onEdit: (skill: Skill) => void;
    onDelete?: (skill: Skill) => void;
}

export function SkillsKanban({ skills, onSkillUpdate, onEdit, onDelete }: SkillsKanbanProps) {
    const [items, setItems] = useState<Record<string, Skill[]>>({});
    const [activeId, setActiveId] = useState<string | null>(null);

    // Group skills by category on load/update
    useEffect(() => {
        const grouped = skills.reduce((acc, skill) => {
            const cat = skill.category || "Uncategorized";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(skill);
            return acc;
        }, {} as Record<string, Skill[]>);
        setItems(grouped);
    }, [skills]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const findContainer = (id: string) => {
        if (id in items) return id;
        return Object.keys(items).find((key) =>
            items[key].find((item) => item.id === id)
        );
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        const overId = over?.id;

        if (!overId || active.id === overId) return;

        const activeContainer = findContainer(active.id as string);
        const overContainer = findContainer(overId as string);

        if (
            !activeContainer ||
            !overContainer ||
            activeContainer === overContainer
        ) {
            return;
        }

        // Moving between containers
        setItems((prev) => {
            const activeItems = prev[activeContainer];
            const overItems = prev[overContainer];
            const activeIndex = activeItems.findIndex((i) => i.id === active.id);
            const overIndex = overItems.findIndex((i) => i.id === overId);

            let newIndex;
            if (overId in prev) {
                // We're hovering over a container (column)
                newIndex = overItems.length + 1;
            } else {
                // We're hovering over an item
                const isBelowOverItem =
                    over &&
                    active.rect.current.translated &&
                    active.rect.current.translated.top >
                    over.rect.top + over.rect.height;

                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            // Optimistic update for UI only (actual logic in onDragEnd)
            // We don't perform deep state mutations here to avoid API thrashing
            // But required for visual feedback

            return {
                ...prev,
                [activeContainer]: [
                    ...prev[activeContainer].filter((item) => item.id !== active.id),
                ],
                [overContainer]: [
                    ...prev[overContainer].slice(0, newIndex),
                    activeItems[activeIndex],
                    ...prev[overContainer].slice(newIndex, prev[overContainer].length),
                ],
            };
        });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        const activeContainer = findContainer(active.id as string);
        const overContainer = over ? findContainer(over.id as string) : null;

        if (
            activeContainer &&
            overContainer &&
            activeContainer !== overContainer
        ) {
            // Moved to different category
            console.log("Moved to:", overContainer);
            onSkillUpdate(active.id as string, { category: overContainer });
        }

        setActiveId(null);
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: "0.5",
                },
            },
        }),
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 overflow-x-auto pb-4">
                {Object.keys(items).map((category) => (
                    <div key={category} className="min-w-[250px] bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 flex flex-col gap-2">
                        <h3 className="text-sm font-semibold text-[#C3E41D] mb-2 uppercase tracking-wider">{category}</h3>
                        <SortableContext
                            id={category}
                            items={items[category].map((i) => i.id!)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div ref={null} className="flex flex-col gap-2 min-h-[50px]">
                                {items[category].map((skill) => (
                                    <SortableItem key={skill.id} skill={skill} onEdit={onEdit} onDelete={onDelete} />
                                ))}
                            </div>
                        </SortableContext>
                    </div>
                ))}
            </div>
            {createPortal(
                <DragOverlay dropAnimation={dropAnimation}>
                    {activeId
                        ? (() => {
                            const flatItems = Object.values(items).flat();
                            const activeItem = flatItems.find((i) => i.id === activeId);
                            return activeItem ? <Item skill={activeItem} dragOverlay /> : null;
                        })()
                        : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}

function SortableItem({ skill, onEdit, onDelete }: { skill: Skill; onEdit: (s: Skill) => void; onDelete?: (s: Skill) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: skill.id!,
        data: {
            type: "Skill",
            skill,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <Item skill={skill} onEdit={() => onEdit(skill)} onDelete={onDelete ? () => onDelete(skill) : undefined} />
        </div>
    );
}

function Item({
    skill,
    dragOverlay,
    onEdit,
    onDelete,
}: {
    skill: Skill;
    dragOverlay?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}) {
    return (
        <div
            className={`
        bg-neutral-800 rounded-lg p-3 flex items-center gap-3 hover:bg-neutral-700 transition-colors border border-transparent group
        ${dragOverlay ? "border-[#C3E41D] shadow-2xl cursor-grabbing" : "cursor-grab"}
      `}
        >
            {skill.icon_url ? (
                <img
                    src={skill.icon_url}
                    alt={skill.name}
                    className="w-6 h-6 object-contain rounded"
                    referrerPolicy="no-referrer"
                />
            ) : (
                <div className="w-6 h-6 rounded bg-neutral-700 flex items-center justify-center text-xs text-[#C3E41D] font-bold">
                    {skill.name.charAt(0)}
                </div>
            )}
            <span className="text-sm font-medium text-neutral-200 flex-1">{skill.name}</span>
            {/* Edit and Delete Buttons */}
            {!dragOverlay && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="p-1.5 text-neutral-300 hover:text-[#C3E41D] transition-colors rounded bg-neutral-700/50 hover:bg-neutral-600"
                            title="Edit"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="p-1.5 text-neutral-300 hover:text-red-400 transition-colors rounded bg-neutral-700/50 hover:bg-neutral-600"
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

