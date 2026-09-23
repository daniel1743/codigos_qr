import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { EditorProvider } from './contexts/EditorContext';
import { EditorPage } from './pages/Editor';
import { SystemOverview } from './pages/SystemOverview';

interface AppProps {
  defaultTemplate?: 'bio' | 'business' | 'portfolio';
  defaultDevice?: 'desktop' | 'mobile';
}

export function App({ defaultTemplate = 'bio', defaultDevice = 'desktop' }: AppProps) {
  return (
    <BrowserRouter>
      <EditorProvider initialTemplate={defaultTemplate} initialDevice={defaultDevice}>
        <Routes>
          <Route path="/sistema" element={<SystemOverview />} />
          <Route path="*" element={<EditorPage />} />
        </Routes>
        <Toaster position="bottom-center" toastOptions={{ style: { fontFamily: 'Inter, sans-serif' } }} />
      </EditorProvider>
    </BrowserRouter>);

}