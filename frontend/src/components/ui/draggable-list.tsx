"use client";

import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import React from "react";

interface DraggableListProps<T> {
    items: T[];
    onReorder: (newOrder: T[]) => void;
    onEdit: (item: T) => void;
    onDelete: (item: T) => void;
    renderItem: (item: T) => React.ReactNode;
    keyExtractor: (item: T) => string;
}

export function DraggableList<T>({
    items,
    onReorder,
    onEdit,
    onDelete,
    renderItem,
    keyExtractor,
}: DraggableListProps<T>) {
    return (
        <Reorder.Group
            axis="y"
            values={items}
            onReorder={onReorder}
            className="space-y-3"
        >
            {items.map((item) => (
                <DraggableItem
                    key={keyExtractor(item)}
                    item={item}
                    renderItem={renderItem}
                    onEdit={() => onEdit(item)}
                    onDelete={() => onDelete(item)}
                />
            ))}
        </Reorder.Group>
    );
}

function DraggableItem<T>({
    item,
    renderItem,
    onEdit,
    onDelete,
}: {
    item: T;
    renderItem: (item: T) => React.ReactNode;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={item}
            dragListener={false}
            dragControls={controls}
            className="relative"
        >
            <div className="flex items-center gap-2 group bg-neutral-800/50 rounded-lg pr-2 hover:bg-neutral-800 transition-colors">
                <div
                    className="p-4 cursor-grab touch-none flex flex-col justify-center text-neutral-500 hover:text-white"
                    onPointerDown={(e) => controls.start(e)}
                >
                    <GripVertical className="w-5 h-5" />
                </div>
                <div className="flex-1 py-2">{renderItem(item)}</div>
                {/* Edit and Delete Buttons */}
                <div className="flex gap-1">
                    <button
                        onClick={onEdit}
                        className="p-2 text-neutral-300 hover:text-[#C3E41D] transition-colors rounded bg-neutral-700/50 hover:bg-neutral-600"
                        title="Edit"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 text-neutral-300 hover:text-red-400 transition-colors rounded bg-neutral-700/50 hover:bg-neutral-600"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </Reorder.Item>
    );
}
