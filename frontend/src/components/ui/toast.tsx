"use client";

import React from "react";
import { X, Check, AlertCircle } from "lucide-react";

interface ToastProps {
    type: "success" | "error";
    title: string;
    message?: string;
    onClose?: () => void;
}

export function Toast({ type, title, message, onClose }: ToastProps) {
    if (type === "success") {
        return (
            <div className="bg-neutral-900 border border-green-500/30 inline-flex space-x-3 p-3 text-sm rounded-lg shadow-lg">
                <div className="flex-shrink-0 w-5 h-5 text-green-500">
                    <Check className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <h3 className="text-white font-medium">{title}</h3>
                    {message && <p className="text-neutral-400 text-xs mt-0.5">{message}</p>}
                </div>
                {onClose && (
                    <button
                        type="button"
                        aria-label="close"
                        onClick={onClose}
                        className="text-neutral-500 hover:text-white transition active:scale-95"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg shadow-lg overflow-hidden">
            <div className="h-full w-1.5 bg-red-500 self-stretch" />
            <div className="flex items-center p-3 gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-sm font-medium">{title}</p>
                    {message && <p className="text-xs text-red-300/70 mt-0.5">{message}</p>}
                </div>
                {onClose && (
                    <button
                        type="button"
                        aria-label="close"
                        onClick={onClose}
                        className="text-red-400 hover:text-white transition active:scale-95 ml-2"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

// Container for positioning toasts
export function ToastContainer({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {children}
        </div>
    );
}
