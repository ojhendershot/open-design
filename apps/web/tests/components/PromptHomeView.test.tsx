// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptHomeView } from '../../src/components/PromptHomeView';

const urlApi = URL as typeof URL & {
  createObjectURL?: (obj: Blob | MediaSource) => string;
  revokeObjectURL?: (url: string) => void;
};

function renderPromptHome(onCreateProject = vi.fn()) {
  return render(
    <PromptHomeView
      skills={[]}
      designSystems={[]}
      projects={[]}
      promptTemplates={[]}
      defaultDesignSystemId={null}
      onCreateProject={onCreateProject}
      onChangeDefaultDesignSystem={() => { }}
      onOpenProject={() => { }}
      onOpenLiveArtifact={() => { }}
      onDeleteProject={() => { }}
      onOpenSettings={() => { }}
      chromeTabs={[]}
      activeTabId={null}
      onSelectTab={() => { }}
      onCloseTab={() => { }}
    />,
  );
}

function dropFile(file: File) {
  const input = screen.getByTestId('prompt-home-input') as HTMLDivElement;
  const composer = input.closest('.od-prompt-home-composer');
  if (!composer) throw new Error('composer missing');
  fireEvent.drop(composer, { dataTransfer: { files: [file] } });
  return input;
}

function bottomMaterialChip(name: string): HTMLElement {
  const chips = screen.getAllByTitle(name);
  const chip = chips[chips.length - 1];
  if (!chip) throw new Error(`missing chip ${name}`);
  return chip;
}

describe('PromptHomeView attachment chips', () => {
  let originalCreateObjectURL: typeof urlApi.createObjectURL;
  let originalRevokeObjectURL: typeof urlApi.revokeObjectURL;

  beforeEach(() => {
    originalCreateObjectURL = urlApi.createObjectURL;
    originalRevokeObjectURL = urlApi.revokeObjectURL;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', () => { });
    urlApi.createObjectURL = vi.fn(() => 'blob:preview');
    urlApi.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    if (originalCreateObjectURL) {
      urlApi.createObjectURL = originalCreateObjectURL;
    } else {
      Reflect.deleteProperty(urlApi, 'createObjectURL');
    }
    if (originalRevokeObjectURL) {
      urlApi.revokeObjectURL = originalRevokeObjectURL;
    } else {
      Reflect.deleteProperty(urlApi, 'revokeObjectURL');
    }
  });

  it('inserts the dropped material into the prompt while the input is focused', () => {
    renderPromptHome();
    const input = dropFile(new File(['img'], 'hero.png', { type: 'image/png' }));

    fireEvent.focus(input);
    fireEvent.click(bottomMaterialChip('hero.png'));

    expect(screen.getByTestId('prompt-home-input-capsule').textContent).toContain('hero.png');
    expect(input.textContent).toContain('hero.png');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('inserts the material once for each focused click', () => {
    renderPromptHome();
    const input = dropFile(new File(['img'], 'hero.png', { type: 'image/png' }));

    fireEvent.focus(input);
    fireEvent.click(bottomMaterialChip('hero.png'));
    fireEvent.click(bottomMaterialChip('hero.png'));

    expect(screen.getAllByTestId('prompt-home-input-capsule')).toHaveLength(2);
  });

  it('sends referenced material capsules as prompt mentions', () => {
    const onCreateProject = vi.fn();
    renderPromptHome(onCreateProject);
    const input = dropFile(new File(['img'], 'hero.png', { type: 'image/png' }));

    fireEvent.focus(input);
    fireEvent.click(bottomMaterialChip('hero.png'));
    fireEvent.click(bottomMaterialChip('hero.png'));
    fireEvent.click(screen.getByTestId('prompt-home-send'));

    expect(onCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ pendingPrompt: '@hero.png @hero.png' }),
    );
  });

  it('previews the dropped material when the input is not focused', () => {
    renderPromptHome();
    const input = dropFile(new File(['img'], 'hero.png', { type: 'image/png' }));

    fireEvent.blur(input);
    fireEvent.click(bottomMaterialChip('hero.png'));

    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('removes the material from the hover affordance without inserting it', () => {
    renderPromptHome();
    const input = dropFile(new File(['img'], 'hero.png', { type: 'image/png' }));

    fireEvent.focus(input);
    fireEvent.click(screen.getByLabelText('Remove hero.png'));

    expect(input.textContent).toBe('');
    expect(screen.queryByTitle('hero.png')).toBeNull();
  });

  it('removes an inline material capsule without removing the staged material', () => {
    renderPromptHome();
    const input = dropFile(new File(['img'], 'hero.png', { type: 'image/png' }));

    fireEvent.focus(input);
    fireEvent.click(bottomMaterialChip('hero.png'));
    fireEvent.click(screen.getByLabelText('Remove reference hero.png'));

    expect(screen.queryByTestId('prompt-home-input-capsule')).toBeNull();
    expect(screen.getByTitle('hero.png')).toBeTruthy();
  });
});
