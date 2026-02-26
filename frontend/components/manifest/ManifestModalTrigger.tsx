"use client";

import React, { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import UseCases, { TEMPLATES, Template } from "../UseCases";
import ManifestModal from "./ManifestModal";

export default function ManifestModalTrigger() {
  const searchParams = useSearchParams();
  
  const initialTemplateId = searchParams.get("template");
  const initialTemplate = initialTemplateId ? (TEMPLATES.find((t) => t.id === initialTemplateId) ?? null) : null;

  const [isOpen, setIsOpen] = useState(!!initialTemplate);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(initialTemplate);
  
  // Store manifest data for each template to preserve state
  const [manifestStates, setManifestStates] = useState<Record<string, Record<string, string>>>({});

  const handleUpdate = useCallback((templateId: string, data: Record<string, string>) => {
    setManifestStates((prev: Record<string, Record<string, string>>) => ({ ...prev, [templateId]: data }));
  }, []);

  // Handle template selection and modal opening
  const handleSelect = useCallback((template: Template) => {
    setSelectedTemplate(template);
    setIsOpen(true);
    
    // Update URL without reloading to support deep-linking/sharing
    const params = new URLSearchParams(window.location.search);
    params.set("template", template.id);
    window.history.pushState(null, "", `?${params.toString()}`);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    
    // Clear URL parameter when modal closes
    const params = new URLSearchParams(window.location.search);
    params.delete("template");
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.pushState(null, "", newUrl);
  }, []);

  return (
    <>
      <UseCases onSelect={handleSelect} />
      <ManifestModal 
        open={isOpen} 
        onClose={handleClose} 
        template={selectedTemplate}
        data={selectedTemplate ? (manifestStates[selectedTemplate.id] || selectedTemplate.defaultData) : {}}
        onUpdate={(newData) => selectedTemplate && handleUpdate(selectedTemplate.id, newData)}
      />
    </>
  );
}

