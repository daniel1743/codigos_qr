/**
 * CONV-03 · the integration CONTRACT, read from the source.
 *
 * A mounted capability is easy to fake: a second answer path, a duplicated
 * composer, a direct provider call from a component. This file asserts the shape
 * that makes the wiring real rather than a lookalike, on comment-stripped source
 * (a regex over raw text matches prose — this project has recorded that false
 * edge before).
 *
 * The contract CONV-03 actually ships is:
 *
 *  1. the session builds ONE AssistantService around the Conversion Advisor and
 *     reaches it through the canonical browser transport;
 *  2. the transport calls the canonical server functions and nothing else — no
 *     fetch, no credential, no provider;
 *  3. the local rule agent (`runAgent`) is reachable only as a rollback and as a
 *     fixture, never from a normal conversational turn;
 *  4. "Créamela" is a deterministic landing command that owns no transport;
 *  5. presentation components receive a CLIENT seam, never a provider object.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const LANDING = resolve(HERE, '..', '..');
const REPO = resolve(LANDING, '..', '..', '..');

function read(relativePath: string): string {
  return readFileSync(join(REPO, relativePath), 'utf8');
}

/** Removes block and line comments so prose cannot satisfy a source assertion. */
function stripComments(source: string): string {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return withoutBlocks
    .split('\n')
    .map((line) => {
      const index = line.indexOf('//');
      return index === -1 ? line : line.slice(0, index);
    })
    .join('\n');
}

const hook = stripComments(read('src/features/approved-chat-landing/hooks/useCripqerSession.ts'));
const transport = stripComments(read('src/features/approved-chat-landing/assistant/advisors/transport.ts'));
const provider = stripComments(read('src/features/approved-chat-landing/assistant/advisors/provider.ts'));
const commands = stripComments(read('src/features/approved-chat-landing/utils/landingCommands.ts'));
const selection = stripComments(read('src/features/approved-chat-landing/assistant/providerSelection.ts'));
const server = stripComments(read('src/lib/conversion-advisor/integration/assistant.server.ts'));
const entry = stripComments(read('src/features/approved-chat-landing/index.tsx'));
const experience = stripComments(read('src/features/approved-chat-landing/components/CripqerExperience.tsx'));
const publicRoute = stripComments(read('src/routes/index.tsx'));

function count(source: string, needle: string): number {
  return source.split(needle).length - 1;
}

describe('CONV-03 · one canonical Advisor path', () => {
  it('the session builds one service around the Advisor, resolved once', () => {
    expect(hook).toContain('createConversionAdvisorProvider');
    expect(hook).toContain('createConversionAdvisorClient');
    expect(hook).toContain('resolveLandingAssistantProvider');
    expect(hook).toContain('if (!assistantRef.current)');
    expect(count(hook, 'resolveLandingAssistantProvider(')).toBe(1);
    expect(count(hook, 'createAssistantService(')).toBe(2);
  });

  it('the session never runs the rule-based agent on a normal turn', () => {
    expect(hook).not.toContain('runAgent');
    expect(hook).not.toContain('RemoteAssistantProvider');
    expect(hook).not.toContain('useAdvisorConversation');
    expect(hook).not.toContain('advisorEntryId');
    expect(hook).not.toContain('textHidden');
    expect(hook).not.toContain('fetch(');
  });

  it('the local prototype is reachable only through the rollback branch', () => {
    expect(count(hook, 'createLocalAssistantProvider()')).toBe(1);
    expect(hook).toContain("kind === 'local'");
    // The rollback is decided BEFORE either provider is built, so both cannot
    // be constructed in one session.
    expect(hook.indexOf('resolveLandingAssistantProvider(')).toBeLessThan(
      hook.indexOf('createLocalAssistantProvider()')
    );
  });

  it('the browser transport calls the canonical server functions', () => {
    expect(transport).toContain('startAdvisorSessionFn');
    expect(transport).toContain('askAdvisorAssistantFn');
    expect(transport).toContain('lib/conversion-advisor/integration/assistant.server');
    expect(transport).not.toContain('fetch(');
    expect(transport).not.toContain('process.env');
    expect(transport).not.toContain('deepseek');
    expect(transport).not.toContain('Authorization');
  });

  it('the server entry runs the real orchestrator and projects it', () => {
    expect(server).toContain('askAdvisorAssistantFn');
    expect(server).toContain('runConversationalTurn(');
    expect(server).toContain('toPublicTurnResult(');
    expect(server).not.toContain('fetch(');
    expect(server).not.toContain('process.env');
  });

  it('a creation instruction owns no transport and no provider', () => {
    expect(commands).toContain('planDeterministicTurn');
    expect(commands).not.toContain('Client');
    expect(commands).not.toContain('createConversionAdvisor');
    expect(commands).not.toContain('fetch(');
    expect(commands).not.toContain('runAgent');
  });

  it('the provider bridge never adds a second call or a retry policy', () => {
    expect(count(provider, 'client.ask(')).toBe(1);
    expect(provider).not.toContain('fetch(');
    expect(provider).not.toContain('setTimeout');
    expect(provider).not.toContain('runAgent');
    // A card click is answered before the client is ever touched.
    expect(provider).toContain("request.intent.kind === 'template-selection'");
  });

  it('the rollback flag is a single exact word', () => {
    expect(selection).toContain("value === 'local' ? 'local' : 'advisor'");
    expect(count(selection, 'VITE_LANDING_ASSISTANT_PROVIDER')).toBeGreaterThanOrEqual(1);
  });
});

describe('CONV-03 · the seam stays a client, never a provider object', () => {
  it('the landing entry accepts an injected client and forwards it', () => {
    expect(entry).toContain('advisorTransport');
    expect(entry).toContain('ConversionAdvisorClient');
    expect(entry).not.toContain('createConversionAdvisorProvider');
    expect(entry).not.toContain('createLocalAssistantProvider');
  });

  it('the experience forwards the client and never constructs a brain', () => {
    expect(experience).toContain('advisorTransport');
    expect(experience).not.toContain('createConversionAdvisorProvider');
    expect(experience).not.toContain('createAssistantService');
    expect(experience).not.toContain('runAgent');
  });

  it('the public route relies on the canonical default (no injected transport)', () => {
    expect(publicRoute).toContain('<ApprovedChatLanding />');
    expect(publicRoute).not.toContain('advisorTransport');
  });

  it('no presentation component imports the provider or the transport', () => {
    const presentation = [
      'src/features/approved-chat-landing/components/CripqerExperience.tsx',
      'src/features/approved-chat-landing/components/converse/ConverseStage.tsx',
      'src/features/approved-chat-landing/components/converse/MessageItem.tsx',
      'src/features/approved-chat-landing/components/composer/Composer.tsx'
    ];
    for (const file of presentation) {
      const source = stripComments(read(file));
      expect(source, file).not.toContain('assistant/advisors/provider');
      expect(source, file).not.toContain('assistant/advisors/transport');
      expect(source, file).not.toContain('createConversionAdvisorProvider');
    }
  });
});

describe('CONV-03 · navigation and browser storage belong elsewhere', () => {
  it('no integration file navigates or stores the conversation by itself', () => {
    for (const [name, source] of [
      ['hook', hook],
      ['transport', transport],
      ['provider', provider],
      ['commands', commands]
    ] as const) {
      expect(source, name).not.toContain('window.location');
      expect(source, name).not.toContain('location.href');
      expect(source, name).not.toContain('history.push');
      expect(source, name).not.toContain('window.open');
    }
  });

  it('no integration file persists the opaque advisor session id', () => {
    for (const [name, source] of [
      ['hook', hook],
      ['transport', transport],
      ['provider', provider]
    ] as const) {
      expect(source, name).not.toContain('localStorage');
      expect(source, name).not.toContain('sessionStorage');
    }
  });
});
