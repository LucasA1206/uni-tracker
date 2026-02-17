
import React from 'react';
import AINoteTaker from '@/components/AINoteTaker';

export default function NotesPage() {
    return (
        <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold mb-4">AI Notes</h1>
            <AINoteTaker />
        </div>
    );
}
