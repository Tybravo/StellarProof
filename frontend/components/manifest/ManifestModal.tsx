"use client";

import React, { useState } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "../ui/Modal";
import { Copy, Download, Trash2, Plus, Check } from "lucide-react";
import { Template } from "../UseCases";

interface ManifestModalProps {
  open: boolean;
  onClose: () => void;
  template: Template | null;
  data: Record<string, string>;
  onUpdate: (data: Record<string, string>) => void;
}

export default function ManifestModal({ 
  open, 
  onClose, 
  template,
  data,
  onUpdate
}: ManifestModalProps) {
  const [copied, setCopied] = useState(false);

  const handleUpdateField = (key: string, value: string) => {
    onUpdate({ ...data, [key]: value });
  };

  const handleAddRow = () => {
    const newKey = `custom_${Object.keys(data).length + 1}`;
    onUpdate({ ...data, [newKey]: "" });
  };

  const handleDeleteRow = (key: string) => {
    const newData = { ...data };
    delete newData[key];
    onUpdate(newData);
  };


  const handleCopy = () => {
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template?.id || "manifest"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!template) return null;

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${template.bgColor} border ${template.borderColor}`}>
            <template.icon className={`w-5 h-5 ${template.color}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {template.title}
            </h3>
            <p className="text-xs text-white/50">Manifest Generator</p>
          </div>
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <p className="text-sm text-white/70">
            Customize the manifest data for this use case. These key-value pairs will be cryptographically linked to your content.
          </p>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="flex gap-3 items-center">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={key}
                    readOnly
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white/60 outline-none"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleUpdateField(key, e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:border-primary/50 outline-none transition-colors"
                    placeholder="Enter value..."
                  />
                </div>
                <button
                  onClick={() => handleDeleteRow(key)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddRow}
            className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary-light transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Attribute
          </button>
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy JSON"}
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-light transition-colors shadow-button-glow"
        >
          <Download className="w-3.5 h-3.5" />
          Download .json
        </button>
      </ModalFooter>
    </Modal>
  );
}
