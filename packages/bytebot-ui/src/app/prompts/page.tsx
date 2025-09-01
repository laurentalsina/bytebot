'use client';

import React, { useState, useEffect } from 'react';

interface Prompt {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    const response = await fetch('/prompts');
    const data = await response.json();
    setPrompts(data);
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt({ ...prompt });
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/prompts/${id}`, { method: 'DELETE' });
    fetchPrompts();
  };

  const handleActivate = async (id: string) => {
    await fetch(`/prompts/${id}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'AGENT_SYSTEM_PROMPT' }),
    });
    fetchPrompts();
  };

  const handleSave = async () => {
    if (!editingPrompt) return;

    if (isCreating) {
      await fetch('/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingPrompt, type: 'AGENT_SYSTEM_PROMPT' }),
      });
    } else {
      await fetch(`/prompts/${editingPrompt.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingPrompt),
        }
      );
    }
    setEditingPrompt(null);
    setIsCreating(false);
    fetchPrompts();
  };

  const handleCreate = () => {
    setEditingPrompt({ id: '', name: '', content: '', isActive: false });
    setIsCreating(true);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Agent System Prompts</h1>
      <div className="mb-4">
        <button onClick={handleCreate} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Create New Prompt
        </button>
      </div>
      <div>
        {prompts.map((prompt) => (
          <div key={prompt.id} className="border p-4 mb-4 rounded">
            <h2 className="text-xl font-bold">{prompt.name}</h2>
            <p className="text-gray-500">{prompt.content}</p>
            <div className="mt-4">
              <button onClick={() => handleEdit(prompt)} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2">
                Edit
              </button>
              <button onClick={() => handleDelete(prompt.id)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mr-2">
                Delete
              </button>
              {!prompt.isActive && (
                <button onClick={() => handleActivate(prompt.id)} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                  Activate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {editingPrompt && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg w-4/5">
            <h2 className="text-2xl font-bold mb-4">{isCreating ? 'Create' : 'Edit'} Prompt</h2>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Name</label>
              <input
                type="text"
                value={editingPrompt.name}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Content</label>
              <textarea
                value={editingPrompt.content}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-48"
              />
            </div>
            <div className="flex justify-end">
              <button onClick={() => { setEditingPrompt(null); setIsCreating(false); }} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2">
                Cancel
              </button>
              <button onClick={handleSave} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}