import React from 'react';
import { CripqerExperience } from './components/CripqerExperience';
import type { ConversionAdvisorClient } from './assistant/advisors/contract';

interface AppProps {
  /** Jump straight into a state of the experience for review. */
  startAt?: 'discover' | 'converse' | 'editor';
  /** CONV-03 · scripted Advisor transport for tests/hosts; production omits it. */
  advisorTransport?: ConversionAdvisorClient | undefined;
}

export function App({ startAt = 'discover', advisorTransport }: AppProps) {
  return <CripqerExperience key={startAt} startAt={startAt} advisorTransport={advisorTransport} />;
}