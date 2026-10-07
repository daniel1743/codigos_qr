import React from 'react';
import { CripqerExperience } from './components/CripqerExperience';

interface AppProps {
  /** Jump straight into a state of the experience for review. */
  startAt?: 'discover' | 'converse' | 'editor';
}

export function App({ startAt = 'discover' }: AppProps) {
  return <CripqerExperience key={startAt} startAt={startAt} />;
}